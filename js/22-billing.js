/* Polar billing bridge.
   This release is deliberately sandbox-only. Real cards and production Polar
   credentials are never used unless a later production cutover changes both
   the backend environment and this explicit URL gate. */
const PolarBilling = (function () {
  'use strict';

  const PENDING_KEY = 'memento_polar_sandbox_pending_plan';
  const VALID_PLANS = ['founder', 'monthly', 'yearly'];
  let busy = false;
  let accountTimer = null;

  function sandboxMode() {
    try { return new URLSearchParams(location.search).get('billing') === 'sandbox'; }
    catch (e) { return false; }
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

  function applyAccess(access) {
    if (!access || access.active !== true) return false;
    try {
      if (!state.entitlements) state.entitlements = {};
      state.entitlements.isPaid = true;
      state.entitlements.plan = validPlan(access.plan);
      state.entitlements.paidAt = state.entitlements.paidAt || Date.now();
      state.entitlements.source = 'polar_sandbox';
      state.entitlements.verifiedAt = Date.now();
      if (typeof persistNow === 'function') persistNow();
      try { if (window.MementoPush) MementoPush.sync(); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  function clearUnverifiedSandboxAccess() {
    try {
      if (!state.entitlements || state.entitlements.source !== 'polar_sandbox') return;
      state.entitlements.isPaid = false;
      state.entitlements.plan = '';
      state.entitlements.paidAt = null;
      state.entitlements.verifiedAt = Date.now();
      if (typeof persistNow === 'function') persistNow();
    } catch (e) {}
  }

  function finishVerifiedUnlock(access) {
    if (!applyAccess(access)) return;
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
    busy = true;
    setButton('Opening secure checkout...', 'Sandbox only. No real charge.', true);
    try {
      const result = await invoke('polar-checkout', { plan: validPlan(plan) });
      if (!result.checkout_url || result.environment !== 'sandbox') {
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
    if (!sandboxMode()) {
      setButton('Payments are not open yet', 'Sandbox testing stays separate from real sales.', false);
      return;
    }
    if (!loggedIn()) {
      savePending(plan);
      setButton('Create your account', 'Your progress and purchase stay together.', false);
      try { if (window.CloudSync && CloudSync.openDialog) CloudSync.openDialog(); } catch (e) {}
      waitForAccount();
      return;
    }
    createCheckout(plan);
  }

  async function refreshAccess(checkoutId) {
    if (!sandboxMode() || !loggedIn()) return null;
    try {
      const access = await invoke('polar-access', checkoutId
        ? { checkout_id: checkoutId }
        : {});
      if (access.active) finishVerifiedUnlock(access);
      else clearUnverifiedSandboxAccess();
      return access;
    } catch (e) {
      return null;
    }
  }

  async function openPortal() {
    if (!sandboxMode() || !loggedIn() || busy) return false;
    busy = true;
    try {
      const result = await invoke('polar-portal', {});
      if (!result.portal_url || result.environment !== 'sandbox') return false;
      location.assign(result.portal_url);
      return true;
    } catch (e) {
      return false;
    } finally {
      busy = false;
    }
  }

  function init() {
    if (!sandboxMode()) {
      // A sandbox purchase may unlock the UI only while explicitly testing.
      // Never let that temporary state resemble a production entitlement.
      clearUnverifiedSandboxAccess();
      return;
    }
    const params = new URLSearchParams(location.search);
    const checkoutId = params.get('checkout_id') || '';
    const returned = params.get('polar') === 'success';

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
          history.replaceState(null, '', location.pathname + '?billing=sandbox' + location.hash);
        } catch (e) {}
      }, 600);
      return;
    }

    setTimeout(function () {
      if (loggedIn()) refreshAccess('');
      if (sessionStorage.getItem(PENDING_KEY)) waitForAccount();
    }, 900);
  }

  return {
    init,
    sandboxMode,
    startCheckout,
    refreshAccess,
    openPortal
  };
})();

try { window.PolarBilling = PolarBilling; } catch (e) {}
try { PolarBilling.init(); } catch (e) {}
