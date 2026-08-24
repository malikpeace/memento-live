/* Polar billing bridge.
   Paid access is authorized by the server. A bounded local receipt keeps the UI
   available during short outages, but it never authorizes paid server work.
   Production checkout remains controlled by POLAR_PRODUCTION_MODE. */
const PolarBilling = (function () {
  'use strict';

  const PENDING_KEY = 'memento_polar_pending_plan';
  const CHECKOUT_ATTEMPT_KEY = 'memento_polar_checkout_attempt_v1';
  const ACCESS_CACHE_KEY = 'memento_polar_access_receipt_v1';
  const ACTION_QUEUE_KEY = 'memento_action_receipt_queue_v1';
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
      portal: 'polar-production-portal',
      refund: 'locked-in-guarantee',
      receipt: 'record-action-completion'
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
  let receiptTimer = null;

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

  async function invoke(name, body, timeoutMs) {
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
      signal: AbortSignal.timeout(Number(timeoutMs) || 15000)
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
    const had = !!verifiedAccess;
    verifiedAccess = null;
    verifiedUntil = 0;
    verifiedGraceUntil = 0;
    verifiedSubject = '';
    clearRefreshTimer();
    if (clearStored) clearStoredAccess();
    if (had) refreshProfilePanel();
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
        validUntil: verifiedAccess.validUntil || null,
        willRenew: typeof verifiedAccess.willRenew === 'boolean' ? verifiedAccess.willRenew : null
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
    const willRenew = typeof access.willRenew === 'boolean'
      ? access.willRenew
      : (typeof access.will_renew === 'boolean' ? access.will_renew : null);
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
      validUntil,
      willRenew
    };
    verifiedUntil = now + ACCESS_TTL_MS;
    verifiedGraceUntil = graceUntil;
    verifiedSubject = subject;
    saveAccessReceipt();
    scheduleRefresh(ACCESS_TTL_MS - REFRESH_LEAD_MS);
    refreshProfilePanel();
    return true;
  }

  // v1022: access changed while the You panel is open -> repaint the whole
  // panel, or the plan chip / Plan card / Unlock row keep whatever was true at
  // open time. Guarded, because renderProfile itself reads access state and an
  // expired receipt clears access mid-render: without the guard that would
  // repaint forever.
  let repainting = false;
  function refreshProfilePanel() {
    if (repainting) return;
    repainting = true;
    try {
      const body = document.getElementById('profileBody');
      if (body && body.childElementCount && typeof TabBar !== 'undefined' && TabBar.renderProfile) {
        TabBar.renderProfile();
      }
    } catch (e) {}
    repainting = false;
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
      validUntil: receipt.validUntil || null,
      willRenew: typeof receipt.willRenew === 'boolean' ? receipt.willRenew : null
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
    // v1024 (Malik, paid account shown the $500 unlock row): an EMPTY subject
    // means the session is mid-restore or the token is mid-refresh, not that
    // the user signed out. Destroying the stored receipt here was a timing
    // lottery that intermittently unpaid real customers. Only a DIFFERENT
    // account's subject clears; a transient blank just answers false for this
    // instant and leaves the receipt for the next call. Real sign-outs clear
    // via noteSignedOut (wired to the auth event in js/12).
    if (subject && subject !== verifiedSubject) {
      clearAccess(true);
      return false;
    }
    if (!subject) return false;
    if (verifiedUntil <= now && !refreshInFlight && !refreshTimer) scheduleRefresh(1000);
    return true;
  }

  function currentAccess() {
    return hasVerifiedAccess() ? Object.assign({}, verifiedAccess) : null;
  }

  function finishVerifiedUnlock(access) {
    const environment = billingEnvironment();
    // The celebration (paywall dismissal, unlock ceremony, routing into
    // Action) belongs to the MOMENT of becoming paid, not to every routine
    // re-verification. The app re-verifies constantly (boot, focus, auth
    // events); on Malik's iPad each pass replayed the ceremony, which read as
    // endless flashing (2026-08-01). Already-verified means: refresh the
    // receipt quietly, celebrate nothing, unless the paywall is actually on
    // screen (a genuine just-bought moment always has it up).
    const wasActive = !!(verifiedAccess && verifiedAccess.active);
    const paywallOpen = (() => {
      try { return typeof ClarityPaywall !== 'undefined' && !!ClarityPaywall._open; } catch (e) { return false; }
    })();
    if (!applyAccess(access, environment)) return;
    clearPending();
    if (wasActive && !paywallOpen) return;
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
      try { sessionStorage.setItem(CHECKOUT_ATTEMPT_KEY, '1'); } catch (e) {}
      location.assign(result.checkout_url);
    } catch (error) {
      busy = false;
      try { sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY); } catch (e) {}
      try { if (typeof Analytics !== 'undefined' && Analytics.track) Analytics.track('checkout_failure'); } catch (e) {}
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
    try { if (typeof Analytics !== 'undefined' && Analytics.track) Analytics.track('checkout_start'); } catch (e) {}
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

  function errorEndpoint(environment, action) {
    const prefix = environment === 'production' ? 'polar_production_' : 'polar_';
    return prefix + action;
  }

  function markBilling(value) {
    try { if (window.MementoErrors) MementoErrors.mark(value); } catch (e) {}
  }

  function reportBillingFailure(environment, action, error, phase) {
    try {
      if (!window.MementoErrors) return;
      MementoErrors.reportBackend({
        endpoint: errorEndpoint(environment, action),
        status: Number(error && error.status) || 0,
        phase: phase
      });
    } catch (e) {}
  }

  async function refreshAccess(checkoutId) {
    // v1024: a refresh attempted while the session is transiently absent is a
    // no-op, never a receipt wipe. Real sign-outs clear via noteSignedOut.
    if (!loggedIn()) return null;
    if (refreshInFlight) return refreshInFlight;
    const environment = billingEnvironment();
    markBilling('billing_refresh');
    refreshInFlight = (async function () {
      try {
        const access = await invoke(FUNCTIONS[environment].access, checkoutId
          ? { checkout_id: checkoutId }
          : {});
        if (access.active) finishVerifiedUnlock(access);
        else clearAccess(true);
        markBilling(access.active ? 'billing_verified' : 'billing_inactive');
        return access;
      } catch (e) {
        reportBillingFailure(environment, 'access', e, 'verify');
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
      markBilling('billing_portal');
      location.assign(result.portal_url);
      return true;
    } catch (e) {
      reportBillingFailure(environment, 'portal', e, 'fetch');
      return false;
    } finally {
      busy = false;
    }
  }

  function readReceiptQueue() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACTION_QUEUE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-40) : [];
    } catch (e) { return []; }
  }

  function writeReceiptQueue(queue) {
    try {
      if (!queue.length) localStorage.removeItem(ACTION_QUEUE_KEY);
      else localStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(queue.slice(-40)));
    } catch (e) {}
  }

  function receiptStillExists(proofId) {
    try {
      const history = state.action && Array.isArray(state.action.completionHistory)
        ? state.action.completionHistory
        : [];
      return history.some(function (entry) {
        return entry && String(entry.id || '') === proofId;
      });
    } catch (e) { return false; }
  }

  function scheduleReceiptFlush(delay) {
    clearTimeout(receiptTimer);
    receiptTimer = setTimeout(function () {
      receiptTimer = null;
      flushActionReceipts();
    }, Math.max(1000, Number(delay) || 6500));
  }

  function recordActionCompletion(record) {
    if (billingEnvironment() !== 'production' || !hasVerifiedAccess()) return false;
    const proofId = String(record && record.id || '');
    const completedAt = String(record && record.date || '');
    if (!/^act_[a-z0-9]+$/i.test(proofId) || !Number.isFinite(Date.parse(completedAt))) {
      return false;
    }
    const queue = readReceiptQueue().filter(function (item) {
      return item && item.proof_id !== proofId;
    });
    queue.push({
      proof_id: proofId,
      completed_at: completedAt,
      timezone_offset_minutes: new Date(completedAt).getTimezoneOffset()
    });
    writeReceiptQueue(queue);
    scheduleReceiptFlush(6500);
    return true;
  }

  async function flushActionReceipts() {
    if (billingEnvironment() !== 'production' || !loggedIn() || !hasVerifiedAccess()) {
      return false;
    }
    const queued = readReceiptQueue();
    const remaining = [];
    for (const receipt of queued) {
      const proofId = String(receipt && receipt.proof_id || '');
      if (!receiptStillExists(proofId)) continue;
      try {
        await invoke(FUNCTIONS.production.receipt, {
          proof_id: proofId,
          completed_at: String(receipt.completed_at || ''),
          timezone_offset_minutes: Number(receipt.timezone_offset_minutes) || 0
        }, 30000);
      } catch (error) {
        const status = Number(error && error.status) || 0;
        if (status === 0 || status === 408 || status === 425 || status === 429 || status >= 500) {
          remaining.push(receipt);
        }
      }
    }
    writeReceiptQueue(remaining);
    if (remaining.length) scheduleReceiptFlush(RETRY_DELAY_MS);
    return remaining.length === 0;
  }

  async function refundStatus() {
    if (billingEnvironment() !== 'production') throw new Error('refunds_production_only');
    return invoke(FUNCTIONS.production.refund, { action: 'status' }, 30000);
  }

  async function claimRefund() {
    if (billingEnvironment() !== 'production') throw new Error('refunds_production_only');
    const result = await invoke(FUNCTIONS.production.refund, { action: 'claim' }, 120000);
    if (result && result.completed) {
      clearAccess(true);
      clearLegacyBillingCache();
    }
    return result;
  }

  function guaranteeCopy(status) {
    const deadline = status && status.claimDeadline
      ? new Date(status.claimDeadline).toLocaleDateString(undefined, {
        month: 'long', day: 'numeric', year: 'numeric'
      })
      : '';
    if (!status) return 'We could not load your refund status.';
    if (status.completed || status.reason === 'refund_completed') {
      return 'Your refund was submitted and paid access has ended.';
    }
    if (status.eligible && status.claimKind === 'initial') {
      return 'Your full 30-day refund is available through ' + deadline + '.';
    }
    if (status.eligible && status.claimKind === 'locked_in') {
      return 'Your Locked-In Guarantee is available through ' + deadline
        + '. All 30 Action days were verified.';
    }
    if (status.eligible && status.claimKind === 'renewal') {
      return 'Your latest renewal can be refunded through ' + deadline + '.';
    }
    if (status.reason === 'locked_in_action_days_missing') {
      return String(status.verifiedActionDays || 0)
        + ' of 30 Action days were verified. The extended guarantee requires all 30.';
    }
    if (status.reason === 'no_memento_purchase') return 'No Memento purchase was found for this account.';
    if (status.reason === 'refund_in_progress') return 'Your refund is processing. You can safely retry.';
    return 'Your automatic refund window has closed. Your legal refund rights are unchanged.';
  }

  function closeRefundDialog() {
    const existing = document.getElementById('mementoRefundDialog');
    if (existing) existing.remove();
  }

  async function showRefundDialog() {
    closeRefundDialog();
    const overlay = document.createElement('div');
    overlay.id = 'mementoRefundDialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'refundDialogTitle');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.78);'
      + 'display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = '<div style="width:min(460px,100%);max-height:90vh;overflow:auto;'
      + 'background:#111214;color:#f6f6f7;border:1px solid rgba(255,255,255,.14);'
      + 'border-radius:8px;padding:24px;font-family:inherit">'
      + '<button id="refundDialogClose" aria-label="Close" style="float:right;background:none;'
      + 'border:0;color:#aaa;font-size:24px;cursor:pointer">×</button>'
      + '<p style="margin:0 0 8px;color:#8c8f96;font-size:12px;text-transform:uppercase">Billing</p>'
      + '<h2 id="refundDialogTitle" style="margin:0 32px 10px 0;font-size:24px">Refunds</h2>'
      + '<p id="refundDialogStatus" style="color:#b8bbc2;line-height:1.55">Checking your account…</p>'
      + '<div id="refundDialogActions"></div>'
      + '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#refundDialogClose').addEventListener('click', closeRefundDialog);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeRefundDialog();
    });

    const message = overlay.querySelector('#refundDialogStatus');
    const actions = overlay.querySelector('#refundDialogActions');
    let status = null;
    try {
      status = await refundStatus();
      message.textContent = guaranteeCopy(status);
    } catch (error) {
      message.textContent = 'We could not check your refund status. Please try again.';
    }

    const portal = document.createElement('button');
    portal.type = 'button';
    portal.textContent = 'Manage billing';
    portal.style.cssText = 'width:100%;padding:14px 18px;margin-top:10px;border-radius:6px;'
      + 'border:1px solid rgba(255,255,255,.14);background:#202125;color:#fff;font-weight:700;';
    portal.addEventListener('click', openPortal);

    if (!status || !status.eligible) {
      actions.appendChild(portal);
      return;
    }

    const claim = document.createElement('button');
    claim.type = 'button';
    claim.textContent = 'Request refund';
    claim.style.cssText = 'width:100%;padding:14px 18px;margin-top:14px;border-radius:6px;'
      + 'border:0;background:#f5f5f5;color:#111;font-weight:800;';
    claim.addEventListener('click', async function () {
      claim.disabled = true;
      message.textContent = 'Sending a fresh sign-in code to confirm it is you…';
      try {
        const email = window.CloudSync && CloudSync.email ? String(CloudSync.email() || '') : '';
        if (!email || !CloudSync.sendCode || !CloudSync.verifyCode) throw new Error('account_required');
        const sent = await CloudSync.sendCode(email);
        if (!sent || !sent.ok) throw new Error('confirmation_send_failed');
        actions.innerHTML = '';
        const label = document.createElement('label');
        label.textContent = 'Enter the 6-digit code sent to ' + email;
        label.style.cssText = 'display:block;color:#b8bbc2;margin:14px 0 8px;';
        const input = document.createElement('input');
        input.inputMode = 'numeric';
        input.autocomplete = 'one-time-code';
        input.maxLength = 6;
        input.style.cssText = 'box-sizing:border-box;width:100%;padding:14px;border-radius:6px;'
          + 'border:1px solid rgba(255,255,255,.18);background:#090a0c;color:#fff;font-size:18px;';
        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.textContent = 'Confirm refund';
        confirm.style.cssText = claim.style.cssText;
        confirm.addEventListener('click', async function () {
          const code = input.value.replace(/\D/g, '');
          if (code.length !== 6) {
            message.textContent = 'Enter the complete 6-digit code.';
            return;
          }
          confirm.disabled = true;
          message.textContent = 'Canceling access and submitting your refund…';
          try {
            const verified = await CloudSync.verifyCode(email, code);
            if (!verified || !verified.ok) {
              message.textContent = verified && verified.error
                ? verified.error
                : 'That confirmation code did not work. Please try again.';
              confirm.disabled = false;
              return;
            }
            const result = await claimRefund();
            message.textContent = guaranteeCopy(result);
            actions.innerHTML = '';
            let remaining = null;
            if (result && result.completed) {
              try {
                remaining = await refundStatus();
              } catch (_) {}
            }
            if (remaining && remaining.eligible) {
              message.textContent += ' Another refund is still available. ' + guaranteeCopy(remaining);
              claim.disabled = false;
              actions.appendChild(claim);
            }
            actions.appendChild(portal);
          } catch (error) {
            const codeName = String(error && error.message || '');
            message.textContent = codeName === 'refund_access_revocation_pending'
              ? 'Polar is finishing the refund. Tap confirm again in a moment; you will not be refunded twice.'
              : 'The refund could not finish yet. Nothing was duplicated. Please try again.';
            confirm.disabled = false;
          }
        });
        actions.appendChild(label);
        actions.appendChild(input);
        actions.appendChild(confirm);
        input.focus();
      } catch (error) {
        message.textContent = 'We could not send the confirmation code. Please try again.';
        claim.disabled = false;
      }
    });
    actions.appendChild(claim);
    actions.appendChild(portal);
  }

  function installBillingAccountUi() {
    try {
      if (typeof TabBar === 'undefined' || TabBar.__billingRefundUi) return;
      const originalRender = TabBar.renderAccountSection;
      const originalBind = TabBar.bindAccountSection;
      if (typeof originalRender !== 'function' || typeof originalBind !== 'function') return;
      TabBar.__billingRefundUi = true;
      TabBar.renderAccountSection = function () {
        // v1021: billing moved out of the Account drawer into the You panel's
        // own Plan section (TabBar.renderPlanSection). The wrapper itself stays
        // so the patch chain (cloud-sync's delete-account wrapper sits on top
        // of this one) is untouched.
        return originalRender.apply(this, arguments);
      };
      TabBar.bindAccountSection = function () {
        const result = originalBind.apply(this, arguments);
        const refunds = document.getElementById('acctRefunds');
        if (refunds) refunds.addEventListener('click', showRefundDialog);
        return result;
      };
    } catch (e) {}
  }

  function init() {
    clearLegacyBillingCache();
    restoreAccessReceipt();
    installBillingAccountUi();
    const params = new URLSearchParams(location.search);
    const checkoutId = params.get('checkout_id') || '';
    const returned = params.get('polar') === 'success';
    const environment = billingEnvironment();

    function settleCheckoutAttempt(succeeded) {
      let attempted = false;
      try { attempted = sessionStorage.getItem(CHECKOUT_ATTEMPT_KEY) === '1'; } catch (e) {}
      if (!attempted) return;
      try { sessionStorage.removeItem(CHECKOUT_ATTEMPT_KEY); } catch (e) {}
      if (!succeeded) {
        try { if (typeof Analytics !== 'undefined' && Analytics.track) Analytics.track('checkout_cancel'); } catch (e) {}
      }
    }

    settleCheckoutAttempt(returned);
    window.addEventListener('pageshow', function () {
      let succeeded = false;
      try { succeeded = new URLSearchParams(location.search).get('polar') === 'success'; } catch (e) {}
      settleCheckoutAttempt(succeeded);
    });

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
        flushActionReceipts();
      }
      if (sessionStorage.getItem(PENDING_KEY)) waitForAccount();
    }, 900);

    window.addEventListener('focus', function () {
      // v1024: on iOS the app can regain focus BEFORE CloudSync finishes
      // restoring the session; treating that instant as signed-out wiped paid
      // receipts (the intermittent "$500 unlock" on Malik's own account).
      // Not-logged-in on focus is now a no-op; real sign-outs clear via
      // noteSignedOut from the auth event.
      if (!loggedIn()) return;
      restoreAccessReceipt();
      refreshAccess('');
      flushActionReceipts();
    });
    window.addEventListener('online', function () {
      if (loggedIn()) {
        refreshAccess('');
        flushActionReceipts();
      }
    });
  }

  // v1024: the two EXPLICIT auth transitions, driven by the real auth event in
  // js/12 instead of inferred from focus timing. Arrival restores the receipt
  // the moment the session lands and repaints the profile so a visible
  // "Unlock" row disappears without reopening; sign-out is the ONE place a
  // stored receipt is destroyed on purpose.
  function noteAuthArrived() {
    try {
      restoreAccessReceipt();
      refreshAccess('');
      flushActionReceipts();
      refreshProfilePanel();
    } catch (e) {}
  }
  function noteSignedOut() {
    clearAccess(true);
  }

  return {
    init,
    sandboxMode,
    billingEnvironment,
    hasVerifiedAccess,
    currentAccess,
    noteAuthArrived,
    noteSignedOut,
    startCheckout,
    refreshAccess,
    openPortal,
    showRefundDialog,
    refundStatus,
    claimRefund,
    recordActionCompletion,
    flushActionReceipts
  };
})();

try { window.PolarBilling = PolarBilling; } catch (e) {}
try { PolarBilling.init(); } catch (e) {}
