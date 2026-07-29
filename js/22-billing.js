/* Polar billing bridge.
   Paid access is authorized by the server. A bounded local receipt keeps the UI
   available during short outages, but it never authorizes paid server work.
   Production checkout remains controlled by POLAR_PRODUCTION_MODE. */
const PolarBilling = (function () {
  'use strict';

  const PENDING_KEY = 'memento_polar_pending_plan';
  const ACCESS_CACHE_KEY = 'memento_polar_access_receipt_v1';
  const VALID_PLANS = ['founder', 'monthly', 'yearly'];
  const ACCESS_TTL_MS = 5 * 60 * 1000;
  const OFFLINE_GRACE_MS = 72 * 60 * 60 * 1000;
  const REFRESH_LEAD_MS = 60 * 1000;
  const RETRY_DELAY_MS = 60 * 1000;
  const FUNCTIONS = {
    sandbox: {
      checkout: 'polar-checkout',
      access: 'polar-access',
      portal: 'polar-portal'
    },
    production: {
      checkout: 'polar-production-checkout',
      access: 'polar-production-access',
      portal: 'polar-production-portal'
    }
  };
  let busy = false;
  let accountTimer = null;
  let verifiedAccess = null;
  let verifiedUntil = 0;
  let verifiedGraceUntil = 0;
  let verifiedSubject = '';
  let refreshTimer = null;
  let refreshInFlight = null;

  function sandboxMode() {
    try { return new URLSearchParams(location.search).get('billing') === 'sandbox'; }
    catch (e) { return false; }
  }

  function billingEnvironment() {
    return sandboxMode() ? 'sandbox' : 'production';
  }

  function validPlan(plan) {
    return VALID_PLANS.indexOf(String(plan || '')) !== -1
      ? String(plan)
      : 'founder';
  }

  function button() {
    return document.getElementById('cpwBuy');
  }

  function setButton(main, sub, disabled) {
    const el = button();
    if (!el) return;
    const mainEl = el.querySelector('.cpw__buy-main');
    const subEl = el.querySelector('.cpw__buy-sub');
    if (mainEl) mainEl.textContent = main;
    if (subEl && typeof sub === 'string') subEl.textContent = sub;
    el.disabled = !!disabled;
    el.setAttribute('aria-busy', disabled ? 'true' : 'false');
  }

  function accessToken() {
    try {
      return window.CloudSync && CloudSync.accessToken
        ? String(CloudSync.accessToken() || '')
        : '';
    } catch (e) { return ''; }
  }

  function loggedIn() {
    try {
      return !!(window.CloudSync && CloudSync.isLoggedIn && CloudSync.isLoggedIn());
    } catch (e) { return false; }
  }

  function tokenSubject() {
    const token = accessToken();
    if (!token) return '';
    try {
      const raw = token.split('.')[1] || '';
      const normalized = raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      const subject = String(payload && payload.sub || '').toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(subject)
        ? subject
        : '';
    } catch (e) { return ''; }
  }

  function deviceId() {
    try {
      return typeof Analytics !== 'undefined' && Analytics.deviceId
        ? Analytics.deviceId()
        : 'unknown';
    } catch (e) { return 'unknown'; }
  }

  async function invoke(name, body) {
    const base = String(window.MEMENTO_SUPABASE_URL || '');
    const anon = String(window.MEMENTO_SUPABASE_ANON || '');
    const token = accessToken();
    if (!base || !anon || !token) throw new Error('account_required');

    const response = await fetch(base + '/functions/v1/' + name, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anon,
        'Authorization': 'Bearer ' + token,
        'x-memento-device': deviceId()
      },
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(15000)
    });
    let data = null;
    try { data = await response.json(); } catch (e) {}
    if (!response.ok) {
      const error = new Error(String((data && data.error) || 'billing_unavailable'));
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data || {};
  }

  function clearPending() {
    try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
  }

  function savePending(plan) {
    try { sessionStorage.setItem(PENDING_KEY, validPlan(plan)); } catch (e) {}
  }

  function pendingPlan() {
    try { return validPlan(sessionStorage.getItem(PENDING_KEY) || ''); }
    catch (e) { return 'founder'; }
  }

  function clearRefreshTimer() {
    if (!refreshTimer) return;
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  function clearStoredAccess() {
    try { localStorage.removeItem(ACCESS_CACHE_KEY); } catch (e) {}
  }

  function clearAccess(clearStored) {
    verifiedAccess = null;
    verifiedUntil = 0;
    verifiedGraceUntil = 0;
    verifiedSubject = '';
    clearRefreshTimer();
    if (clearStored) clearStoredAccess();
  }

  function clearLegacyBillingCache() {
    try {
      if (!state.entitlements) return;
      const source = String(state.entitlements.source || '');
      if (source.indexOf('polar_') !== 0) return;
      state.entitlements.isPaid = false;
      state.entitlements.plan = '';
      state.entitlements.paidAt = null;
      state.entitlements.source = '';
      state.entitlements.verifiedAt = null;
      if (typeof persistNow === 'function') persistNow();
    } catch (e) {}
  }

  function parseTime(value) {
    if (!value) return 0;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function accessDeadline(verifiedAt, validUntil) {
    const graceDeadline = verifiedAt + OFFLINE_GRACE_MS;
    const serviceDeadline = parseTime(validUntil);
    return serviceDeadline > 0 ? Math.min(graceDeadline, serviceDeadline) : graceDeadline;
  }

  function saveAccessReceipt() {
    if (!verifiedAccess || !verifiedSubject) return;
    try {
      localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({
        version: 1,
        subject: verifiedSubject,
        environment: verifiedAccess.environment,
        plan: verifiedAccess.plan,
        verifiedAt: verifiedAccess.verifiedAt,
        freshUntil: verifiedUntil,
        graceUntil: verifiedGraceUntil,
        validUntil: verifiedAccess.validUntil || null
      }));
    } catch (e) {}
  }

  function scheduleRefresh(delay) {
    clearRefreshTimer();
    if (!loggedIn()) return;
    const remainingGrace = verifiedGraceUntil - Date.now();
    if (verifiedGraceUntil > 0 && remainingGrace <= 0) {
      clearAccess(true);
      return;
    }
    const wait = Math.max(1000, Math.min(
      Number(delay) || RETRY_DELAY_MS,
      remainingGrace > 0 ? remainingGrace : RETRY_DELAY_MS
    ));
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      refreshAccess('');
    }, wait);
  }

  function applyAccess(access, environment) {
    const subject = tokenSubject();
    if (!subject || !access || access.active !== true) {
      clearAccess(true);
      return false;
    }
    const plan = String(access.plan || '');
    if (VALID_PLANS.indexOf(plan) === -1
        || String(access.environment || environment) !== environment) {
      clearAccess(true);
      return false;
    }
    const now = Date.now();
    const validUntil = access.validUntil || access.valid_until || null;
    const graceUntil = accessDeadline(now, validUntil);
    if (graceUntil <= now) {
      clearAccess(true);
      return false;
    }
    verifiedAccess = {
      active: true,
      plan,
      environment,
      verifiedAt: now,
      validUntil
    };
    verifiedUntil = now + ACCESS_TTL_MS;
    verifiedGraceUntil = graceUntil;
    verifiedSubject = subject;
    saveAccessReceipt();
    scheduleRefresh(ACCESS_TTL_MS - REFRESH_LEAD_MS);
    return true;
  }

  function restoreAccessReceipt() {
    if (!loggedIn()) return false;
    const subject = tokenSubject();
    if (!subject) return false;
    let stored = '';
    let receipt = null;
    try {
      stored = localStorage.getItem(ACCESS_CACHE_KEY) || '';
      receipt = stored ? JSON.parse(stored) : null;
    }
    catch (e) { receipt = null; }
    if (!stored) return false;
    const environment = billingEnvironment();
    const now = Date.now();
    if (!receipt
        || receipt.version !== 1
        || receipt.subject !== subject
        || receipt.environment !== environment
        || VALID_PLANS.indexOf(String(receipt.plan || '')) === -1
        || !Number.isFinite(receipt.verifiedAt)
        || !Number.isFinite(receipt.freshUntil)
        || !Number.isFinite(receipt.graceUntil)
        || receipt.graceUntil <= now
        || (parseTime(receipt.validUntil) > 0 && parseTime(receipt.validUntil) <= now)) {
      clearAccess(true);
      return false;
    }
    verifiedAccess = {
      active: true,
      plan: receipt.plan,
      environment,
      verifiedAt: receipt.verifiedAt,
      validUntil: receipt.validUntil || null
    };
    verifiedUntil = receipt.freshUntil;
    verifiedGraceUntil = receipt.graceUntil;
    verifiedSubject = subject;
    scheduleRefresh(verifiedUntil > now
      ? Math.max(1000, verifiedUntil - now - REFRESH_LEAD_MS)
      : 1000);
    return true;
  }

  function hasVerifiedAccess() {
    if (!verifiedAccess || verifiedAccess.active !== true) return false;
    const now = Date.now();
    if (verifiedGraceUntil <= now) {
      clearAccess(true);
      return false;
    }
    const subject = tokenSubject();
    if (!subject || subject !== verifiedSubject) {
      clearAccess(true);
      return false;
    }
    if (verifiedUntil <= now && !refreshInFlight && !refreshTimer) scheduleRefresh(1000);
    return true;
  }

  function currentAccess() {
    return hasVerifiedAccess() ? Object.assign({}, verifiedAccess) : null;
  }

  function finishVerifiedUnlock(access) {
    const environment = billingEnvironment();
    if (!applyAccess(access, environment)) return;
    clearPending();
    try {
      if (typeof ClarityPaywall !== 'undefined'
          && ClarityPaywall._applyVerifiedUnlock) {
        ClarityPaywall._applyVerifiedUnlock(access);
      }
    } catch (e) {}
  }

  function explainError(error, plan) {
    const code = String((error && error.message) || '');
    if (code === 'sandbox_access_denied') {
      setButton('Sandbox tester only', 'This account is not on the tester list.', false);
    } else if (code === 'payments_not_open') {
      setButton('Payments are not open yet', 'Your Memento is safe. Sales open at launch.', false);
    } else if (code === 'founder_sold_out') {
      setButton('Founder spots are full', 'Choose yearly or monthly instead.', false);
    } else if (code === 'already_unlocked' && error.data && error.data.access) {
      finishVerifiedUnlock(error.data.access);
    } else if (code === 'account_required' || (error && error.status === 401)) {
      savePending(plan);
      setButton('Create your account', 'Your progress and purchase stay together.', false);
      try { if (window.CloudSync && CloudSync.openDialog) CloudSync.openDialog(); } catch (e) {}
      waitForAccount();
    } else {
      setButton('Try again', 'No charge was made.', false);
    }
  }

  async function createCheckout(plan) {
    if (busy) return;
    const environment = billingEnvironment();
    busy = true;
    setButton(
      'Opening secure checkout...',
      environment === 'sandbox' ? 'Sandbox only. No real charge.' : 'Secure payment by Polar.',
      true
    );
    try {
      const result = await invoke(FUNCTIONS[environment].checkout, { plan: validPlan(plan) });
      if (!result.checkout_url || result.environment !== environment) {
        throw new Error('checkout_unavailable');
      }
      clearPending();
      location.assign(result.checkout_url);
    } catch (error) {
      busy = false;
      explainError(error, plan);
    }
  }

  function waitForAccount() {
    clearInterval(accountTimer);
    let checks = 0;
    accountTimer = setInterval(function () {
      checks += 1;
      if (loggedIn()) {
        clearInterval(accountTimer);
        accountTimer = null;
        createCheckout(pendingPlan());
      } else if (checks >= 600) {
        clearInterval(accountTimer);
        accountTimer = null;
        setButton('Unlock Memento', 'Sign in when you are ready.', false);
      }
    }, 500);
  }

  function startCheckout(plan) {
    plan = validPlan(plan);
    if (!loggedIn()) {
      savePending(plan);
      setButton('Create your account', 'Your progress and purchase stay together.', false);
      try { if (window.CloudSync && CloudSync.openDialog) CloudSync.openDialog(); } catch (e) {}
      waitForAccount();
      return;
    }
    createCheckout(plan);
  }

  function transientRefreshFailure(error) {
    const status = Number(error && error.status) || 0;
    return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
  }

  async function refreshAccess(checkoutId) {
    if (!loggedIn()) {
      clearAccess(true);
      return null;
    }
    if (refreshInFlight) return refreshInFlight;
    const environment = billingEnvironment();
    refreshInFlight = (async function () {
      try {
        const access = await invoke(FUNCTIONS[environment].access, checkoutId
          ? { checkout_id: checkoutId }
          : {});
        if (access.active) finishVerifiedUnlock(access);
        else clearAccess(true);
        return access;
      } catch (e) {
        if (!transientRefreshFailure(e)) clearAccess(true);
        else if (hasVerifiedAccess()) scheduleRefresh(RETRY_DELAY_MS);
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  async function openPortal() {
    if (!loggedIn() || busy) return false;
    const environment = billingEnvironment();
    busy = true;
    try {
      const result = await invoke(FUNCTIONS[environment].portal, {});
      if (!result.portal_url || result.environment !== environment) return false;
      location.assign(result.portal_url);
      return true;
    } catch (e) {
      return false;
    } finally {
      busy = false;
    }
  }

  function init() {
    clearLegacyBillingCache();
    restoreAccessReceipt();
    const params = new URLSearchParams(location.search);
    const checkoutId = params.get('checkout_id') || '';
    const returned = params.get('polar') === 'success';
    const environment = billingEnvironment();

    if (returned) {
      setTimeout(async function () {
        setButton('Confirming your purchase...', 'This usually takes a few seconds.', true);
        let access = null;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          access = await refreshAccess(checkoutId);
          if (access && access.active) break;
          await new Promise(function (resolve) { setTimeout(resolve, 1500); });
        }
        busy = false;
        if (!access || !access.active) {
          setButton('Purchase is still confirming', 'Tap again in a moment. You will not be charged twice.', false);
        }
        try {
          const query = environment === 'sandbox' ? '?billing=sandbox' : '';
          history.replaceState(null, '', location.pathname + query + location.hash);
        } catch (e) {}
      }, 600);
      return;
    }

    setTimeout(function () {
      if (loggedIn()) {
        restoreAccessReceipt();
        refreshAccess('');
      }
      if (sessionStorage.getItem(PENDING_KEY)) waitForAccount();
    }, 900);

    window.addEventListener('focus', function () {
      if (!loggedIn()) {
        clearAccess(true);
        return;
      }
      restoreAccessReceipt();
      refreshAccess('');
    });
    window.addEventListener('online', function () {
      if (loggedIn()) refreshAccess('');
    });
  }

  return {
    init,
    sandboxMode,
    billingEnvironment,
    hasVerifiedAccess,
    currentAccess,
    startCheckout,
    refreshAccess,
    openPortal
  };
})();

try { window.PolarBilling = PolarBilling; } catch (e) {}
try { PolarBilling.init(); } catch (e) {}
