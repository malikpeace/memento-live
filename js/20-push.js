/* ===========================================================================
   20-push.js  -  Web Push reminders (FIRST-WIN-PLAN P5 + notifications C).

   THE ASK IS PAID-ONLY AND POST-PAYMENT (audit amendment, 2026-08-19).
   A free user never sees a permission prompt of any kind. The sequence is:
   payment -> install walk -> first open of the INSTALLED app -> Memento's own
   pre-prompt card -> the real OS prompt ONLY when they tap "Turn on". The OS
   prompt is single-use per install; it is never spent cold.

   Asked once ever (ASK_KEY). Declining never re-asks, and push-deniers are
   not abandoned: the in-app progress ask below surfaces the same prefilled
   update screen the weekly push would have deep-linked to, so their star
   stays fresh without notifications.

   Deep links: the service worker turns a notification tap into
   #push/<link> (cold start) or a 'push-open' postMessage (app already open).
   openDeepLink() below is the ONE place those land. Link vocabulary comes
   from the engine (supabase/functions/_shared/notif-engine.ts deepLink()).

   What the sender needs (today's move by name, whether the day is done,
   paid/clarity flags, CURRENT tz offset) is synced into push_subscriptions
   on every app open, after each logged move, and after unlock. tz travels
   with every sync, so travel and DST cannot produce a 3am ping. The VAPID
   public key is fetched from push-tick at subscribe time, so no key material
   lives in this repo and keys can rotate.

   iOS reality: web push only works from the installed (standalone) PWA on
   iOS 16.4+. In a Safari tab, supported() is false and nothing shows; the
   Add-to-Home-Screen prompt (js/18) is the path there.
   =========================================================================== */
(function () {
  'use strict';

  // _v2 (audit amendment): the old key burned the ask on people who saw the
  // pre-paid card. Bumping resets that memory exactly once so they get one
  // fresh ask under the new post-payment sequence.
  var ASK_KEY = 'memento_push_asked_v2';   // the card was shown once (any outcome)
  var ASK_KEY_OLD = 'memento_push_asked_v1';
  var ON_KEY = 'memento_push_on';          // a subscription was created
  var ARM_KEY = 'memento_push_armed';      // payment verified: the pre-prompt is due
  var FALLBACK_KEY = 'memento_progress_ask';  // "<updatedAt>|<day>" of the last in-app ask
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var FORCE = /[?&]dev=push/.test(location.search); // preview: force the card
  var cardEl = null;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  // One-time: drop the v1 memory so the bump above actually frees the ask.
  lsDel(ASK_KEY_OLD);

  /* ---- THE ROGUE THIRD PATH, KILLED (audit, 2026-08-19) -------------------
     js/01 still defines scheduleReminder(): a local daily Notification fired
     from an open tab, with its own quiet hours and its own copy. The engine
     owns every send now, and two senders means double pings and banned voice.
     Its settings UI is already gone (no #prefReminder* markup exists) and its
     js/09 handlers are deleted, so nothing can switch it on again. This
     disarms any state that was persisted while the toggle still existed.
     The definition itself (js/01 ~1191-1226) and its js/11 boot call are
     queued for deletion by whoever owns those shared files. This file loads
     BEFORE js/11, so the stub is already in place when js/11 tries to arm it,
     and disarmLegacyReminder() then clears any persisted enabled flag. */
  try { if (typeof window.scheduleReminder === 'function') window.scheduleReminder = function () {}; } catch (e) {}

  function disarmLegacyReminder() {
    try {
      var r = (typeof state !== 'undefined' && state && state.prefs) ? state.prefs.reminder : null;
      if (r && r.enabled) {
        r.enabled = false;
        if (typeof persistNow === 'function') persistNow();
      }
    } catch (e) {}
  }

  /* ---- THE COLD-START DEEP LINK ------------------------------------------
     sw.js turns a notification tap into #push/<link>. This runs at parse
     time, BEFORE js/15-router boots, and strips the marker from the URL, so
     the router does its normal restore and this file stays the single owner
     of where a notification lands. Warm taps arrive as a postMessage instead. */
  var coldLink = '';
  try {
    var h = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    if (h.indexOf('push/') === 0) {
      coldLink = h.slice(5);
      history.replaceState(history.state, '', location.pathname + location.search);
    }
  } catch (e) {}

  function isDemo() {
    try { return typeof DEMO_MODE !== 'undefined' && DEMO_MODE; } catch (e) { return false; }
  }
  // BUG FOUND 2026-08-20: this used to read window.ClarityPaywall, which is
  // ALWAYS undefined. js/13 declares it with const, so it is a lexical global
  // and never a window property (js/12 and js/22 explicitly re-export theirs;
  // js/13 does not). Every paid check here therefore answered "not paid", so
  // the paid copy was dead code and the free branch always won. The bare
  // identifier behind a typeof guard is the read that works.
  function hasVerifiedPaidAccess() {
    try {
      if (typeof ClarityPaywall === 'undefined' || !ClarityPaywall || !ClarityPaywall.isPaid) return false;
      return !!ClarityPaywall.isPaid();
    } catch (e) {
      return false;
    }
  }
  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function fnUrl() {
    return (window.MEMENTO_SUPABASE_URL || '') + '/functions/v1/push-tick';
  }

  // b64url applicationServerKey -> Uint8Array for pushManager.subscribe.
  function urlB64ToU8(s) {
    var pad = '='.repeat((4 - s.length % 4) % 4);
    var raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function fetchPublicKey() {
    return fetch(fnUrl(), { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('pubkey ' + r.status)); })
      .then(function (j) {
        if (!j || !j.publicKey) throw new Error('no publicKey');
        return j.publicKey;
      });
  }

  // Everything the reminder sender needs, computed fresh from state.
  function buildContext() {
    var c = {
      tz: new Date().getTimezoneOffset(),
      move: null, dayDone: null,
      paid: false, clarity: false
    };
    c.paid = hasVerifiedPaidAccess();
    try { c.clarity = !!(state.clarity && state.clarity.completed); } catch (e) {}
    try {
      var pa = (state.action && state.action.primaryAction) || {};
      var tiers = pa.tiers || {};
      c.move = tiers[pa.recommendedTier] || pa.howToStart || pa.title || null;
      if (c.move) c.move = String(c.move).slice(0, 140);
    } catch (e) {}
    try {
      var ch = (state.action && state.action.completionHistory) || [];
      if (ch.length && typeof isoToLocalDay === 'function') {
        c.dayDone = isoToLocalDay(ch[ch.length - 1].date) || null;
      }
    } catch (e) {}
    return c;
  }

  function remoteToken() {
    try {
      if (window.CloudSync && CloudSync.accessToken) {
        var token = CloudSync.accessToken();
        if (token) return token;
      }
    } catch (e) {}
    return window.MEMENTO_SUPABASE_ANON || '';
  }

  function rpcSync(sub) {
    try {
      var url = window.MEMENTO_SUPABASE_URL, anon = window.MEMENTO_SUPABASE_ANON;
      if (!url || !anon || !sub || isDemo()) { MementoPush._lastSync = { skipped: !url ? 'no-url' : !anon ? 'no-anon' : !sub ? 'no-sub' : 'demo' }; return Promise.resolve(); }
      if (LOCAL) { MementoPush._lastSync = { skipped: 'local' }; return Promise.resolve(); }
      var j = sub.toJSON ? sub.toJSON() : sub;
      var keys = j.keys || {};
      var device = (typeof deviceId === 'function') ? deviceId() : '';
      if (!device) { MementoPush._lastSync = { skipped: 'no-device-id' }; return Promise.resolve(); }
      var ctx = buildContext();
      var today = (typeof getTodayISO === 'function') ? getTodayISO() : null;
      return fetch(fnUrl(), {
        method: 'PUT',
        headers: {
          apikey: anon,
          Authorization: 'Bearer ' + remoteToken(),
          'Content-Type': 'application/json',
          'x-memento-device': device
        },
        body: JSON.stringify({
          endpoint: j.endpoint || '',
          p256dh: keys.p256dh || '',
          auth: keys.auth || '',
          tz_offset_min: ctx.tz,
          move_name: ctx.move,
          day_done_date: ctx.dayDone,
          last_open_date: today,
          paid: ctx.paid,
          clarity_done: ctx.clarity,
          enabled: true
        })
      }).then(function (r) {
        // Debug visibility (2026-08-20): the founder's accept produced zero
        // server rows and this catch ate the evidence. Every attempt now
        // leaves a readable trace for the push-status dev sheet.
        try { MementoPush._lastSync = { at: Date.now(), status: r.status, ok: r.ok }; } catch (e2) {}
        if (!r.ok) return r.text().then(function (t) { try { MementoPush._lastSync.body = String(t).slice(0, 200); } catch (e3) {} });
      }).catch(function (err) {
        try { MementoPush._lastSync = { at: Date.now(), error: String(err && err.message || err) }; } catch (e2) {}
      });
    } catch (e) { return Promise.resolve(); }
  }

  function disableForSignOut() {
    var url = window.MEMENTO_SUPABASE_URL, anon = window.MEMENTO_SUPABASE_ANON;
    var token = remoteToken();
    var device = '';
    try { device = (typeof deviceId === 'function') ? deviceId() : ''; } catch (e) {}
    var remove = Promise.resolve();
    if (url && anon && token && token !== anon && device) {
      remove = fetch(fnUrl(), {
        method: 'DELETE',
        headers: {
          apikey: anon,
          Authorization: 'Bearer ' + token,
          'x-memento-device': device
        }
      }).catch(function () {});
    }
    return remove.then(function () {
      if (!supported()) return null;
      return navigator.serviceWorker.ready
        .then(function (registration) { return registration.pushManager.getSubscription(); })
        .then(function (subscription) { return subscription ? subscription.unsubscribe() : null; })
        .catch(function () {});
    }).then(function () {
      try { localStorage.removeItem(ON_KEY); } catch (e) {}
    });
  }

  // Refresh the server's picture of this device (open date, move, day done).
  // No-op unless the user already subscribed.
  function sync() {
    try {
      if (!supported() || localStorage.getItem(ON_KEY) !== '1') { MementoPush._lastSync = { skipped: 'off-or-unsupported' }; return Promise.resolve(); }
      if (Notification.permission !== 'granted') { MementoPush._lastSync = { skipped: 'permission' }; return Promise.resolve(); }
      // Returns the real chain so callers (the dev status sheet) can await it.
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription();
      }).then(function (sub) {
        if (!sub) { try { localStorage.removeItem(ON_KEY); } catch (e) {} MementoPush._lastSync = { skipped: 'no-subscription' }; return; }
        return rpcSync(sub);
      }).catch(function (err) {
        try { MementoPush._lastSync = { error: 'chain: ' + String(err && err.message || err) }; } catch (e2) {}
      });
    } catch (e) { return Promise.resolve(); }
  }

  // Full subscribe flow. Must run from a user gesture (Safari requires it).
  function enable() {
    return Promise.resolve()
      .then(function () { return Notification.requestPermission(); })
      .then(function (perm) {
        if (perm !== 'granted') throw new Error('denied');
        return Promise.all([navigator.serviceWorker.ready, fetchPublicKey()]);
      })
      .then(function (arr) {
        var reg = arr[0], pub = arr[1];
        var opts = { userVisibleOnly: true, applicationServerKey: urlB64ToU8(pub) };
        return reg.pushManager.subscribe(opts).catch(function (err) {
          // A leftover subscription under an older (rotated) key blocks new
          // subscribes; drop it and retry once.
          return reg.pushManager.getSubscription().then(function (old) {
            if (!old) throw err;
            return old.unsubscribe().then(function () { return reg.pushManager.subscribe(opts); });
          });
        });
      })
      .then(function (sub) {
        try { localStorage.setItem(ON_KEY, '1'); } catch (e) {}
        return rpcSync(sub);
      });
  }

  /* ---- The ask card (same glass family as the install prompt) ---- */
  function markSvg() {
    return '<svg viewBox="0 0 512 512" width="42" height="42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect width="512" height="512" rx="118" fill="#0c1112"/>' +
      '<path d="M113 108 L256 251 L399 108 L399 405 L113 405 Z" fill="#f5f5f7"/></svg>';
  }

  // Benefit first, plain, and honest about the ceiling: one a day, never at
  // night. This card IS the pre-prompt; the OS prompt only fires on "Turn on".
  function cardCopy() {
    return {
      title: 'Get the most out of Memento',
      sub: 'We highly, highly recommend turning on notifications so Memento can keep you on track when things inevitably get tough. We’ll never spam. Only what is useful toward your goal.'
    };
  }

  function hideCard() {
    if (!cardEl) return;
    cardEl.classList.remove('is-open');
    var el = cardEl; cardEl = null;
    setTimeout(function () { try { el.remove(); } catch (e) {} }, 380);
  }

  function showCard() {
    if (cardEl || document.querySelector('.push-ask')) return;
    lsSet(ASK_KEY, '1');
    lsDel(ARM_KEY);   // the post-payment debt is paid the moment it is shown
    var copy = cardCopy();
    var el = document.createElement('div');
    el.className = 'push-ask';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Turn on reminders');
    el.innerHTML =
      '<div class="push-ask__scrim" data-close="1"></div>' +
      '<div class="push-ask__sheet">' +
        '<span class="push-ask__mark">' + markSvg() + '</span>' +
        '<div class="push-ask__title">' + copy.title + '</div>' +
        '<div class="push-ask__sub">' + copy.sub + '</div>' +
        '<button class="push-ask__btn" type="button" data-enable="1">Turn on reminders</button>' +
        '<button class="push-ask__skip" type="button" data-close="1">Not now</button>' +
      '</div>';
    document.body.appendChild(el);
    cardEl = el;
    el.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-enable]')) {
        var btn = t.closest('[data-enable]');
        btn.disabled = true;
        btn.textContent = 'Turning on…';
        enable().then(function () {
          btn.textContent = 'Reminders on';
          try { if (typeof Analytics !== 'undefined') Analytics.track('push_enabled', {}); } catch (e2) {}
          setTimeout(hideCard, 650);
        }).catch(function () {
          // Denied or failed: close quietly. The card never returns.
          hideCard();
        });
        return;
      }
      if (t.closest('[data-close]')) hideCard();
    });
    var openIt = function () { try { el.classList.add('is-open'); } catch (e) {} };
    requestAnimationFrame(function () { requestAnimationFrame(openIt); });
    setTimeout(openIt, 90); // rAF stalls in background tabs; idempotent fallback
    try { if (typeof Analytics !== 'undefined') Analytics.track('push_prompt_shown', {}); } catch (e) {}
  }

  function isStandalone() {
    try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; }
  }
  // A subscription row with no user_id is dead weight: push-tick only sends to
  // rows that carry one (the per-user coalescer cannot work device-keyed). No
  // session means no possible push, so the once-ever ask waits for one.
  function signedIn() {
    try {
      return !!(window.CloudSync && CloudSync.accessToken && CloudSync.accessToken());
    } catch (e) { return false; }
  }

  function eligible() {
    if (isDemo()) return false;
    if (!supported()) return false;
    // THE PAID GATE (audit amendment): the ask is post-payment, always. A free
    // user never sees a permission prompt, in the app or from the OS.
    if (!hasVerifiedPaidAccess()) return false;
    if (!signedIn()) return false;
    // v760 (Malik): the ask only ever happens inside the INSTALLED app. Asking
    // in a browser tab makes no sense (on iOS it cannot even deliver), and it
    // would burn the once-ever card in the wrong storage anyway.
    if (!isStandalone()) return false;
    try { if (Notification.permission !== 'default') return false; } catch (e) { return false; }
    try { if (localStorage.getItem(ASK_KEY) === '1') return false; } catch (e) {}
    try { if (!(state.clarity && state.clarity.completed)) return false; } catch (e) { return false; }
    // Never stack on top of another overlay moment. .unlockcer is the unlock
    // ceremony: post-payment the card waits for it to finish playing.
    if (document.querySelector('.pwa-install.is-open, .save-memento.is-open, .cpw--open, .unlockcer, .cp-fs')) return false;
    try { if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return false; } catch (e) {}
    try { if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return false; } catch (e) {}
    try { if (window.ActionFlow && ActionFlow.isOpen) return false; } catch (e) {}
    return true;
  }

  // Preflight the server before ever showing the card: if push is not
  // configured yet (503) the ask would dead-end, so hold it for a later
  // session instead of burning the once-ever card on a failure.
  function offerCard() {
    fetchPublicKey().then(function () {
      if (eligible()) showCard();
    }).catch(function () {});
  }

  // Called by js/08 right after the first-white ceremony finishes.
  function maybePromptAfterFirstWin() {
    if (FORCE) return showCard();
    if (!eligible()) return;
    offerCard();
  }

  /* ---- THE POST-PAYMENT SEQUENCE -----------------------------------------
     js/13 calls this the moment a purchase verifies. It does NOT prompt: it
     records that the pre-prompt is owed. If the buyer is already inside the
     installed app it waits for the unlock ceremony to finish and then offers
     the card; if they bought in a browser tab (the common path: pay, then
     install), the flag is spent on the first open of the installed app. */
  function armPostPayment() {
    lsSet(ARM_KEY, '1');
    if (!isStandalone()) return;
    var tries = 0;
    var tick = function () {
      if (lsGet(ASK_KEY) === '1') return;
      if (eligible()) { offerCard(); return; }
      if (tries++ < 40) setTimeout(tick, 1500);  // ~60s: the ceremony's length
    };
    setTimeout(tick, 2000);
  }

  /* ---- THE IN-APP FALLBACK ASK -------------------------------------------
     Push-deniers must not have a rotting star. If notifications are off and
     the number has not moved for ~2x the goal's own rhythm, the next app open
     surfaces the SAME prefilled update screen the weekly push deep-links to,
     once per staleness period. Not paid-gated: this is an in-app moment, not
     a permission prompt. */
  function todayKey() {
    try {
      if (typeof getTodayISO === 'function') return getTodayISO();
    } catch (e) {}
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function staleDays() {
    // cadence = sessions per week (js/08 ccGoalShape). 2x the gap between
    // sessions, floored at a week: asking more often than the weekly push
    // would have asked is nagging, not freshness.
    var cadence = 3;
    try {
      var shape = (typeof ccGoalShape === 'function') ? ccGoalShape() : null;
      if (shape && isFinite(Number(shape.cadence)) && Number(shape.cadence) > 0) cadence = Number(shape.cadence);
    } catch (e) {}
    return Math.max(7, Math.round(2 * (7 / cadence)));
  }
  function progressAskDue() {
    try {
      if (isDemo()) return false;
      if (!(state.clarity && state.clarity.completed)) return false;
      if (typeof clarityOpenUpdate !== 'function') return false;
      // Only for people push cannot reach. A granted subscription means the
      // weekly ask arrives as a notification and this must stay silent.
      var granted = false;
      try { granted = ('Notification' in window) && Notification.permission === 'granted' && lsGet(ON_KEY) === '1'; } catch (e) {}
      if (granted) return false;
      var gp = state.goalProgress;
      if (!gp || gp.target === null || gp.target === undefined) return false;
      if (gp.fulfilledAt) return false;
      if (!gp.updatedAt) return false;   // never set: the summary's own empty chip asks
      var today = todayKey();
      var age = Math.round((new Date(today) - new Date(gp.updatedAt)) / 86400000);
      var window_ = staleDays();
      if (!isFinite(age) || age < window_) return false;
      var mark = String(lsGet(FALLBACK_KEY) || '').split('|');
      if (mark[0] === String(gp.updatedAt) && mark[1]) {
        var since = Math.round((new Date(today) - new Date(mark[1])) / 86400000);
        if (isFinite(since) && since < window_) return false;  // already asked this period
      }
      return true;
    } catch (e) { return false; }
  }
  function offerProgressAsk() {
    if (!progressAskDue()) return;
    if (document.querySelector('.pwa-install.is-open, .push-ask, .cpw--open, .unlockcer, .cp-fs')) return;
    try { if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return; } catch (e) {}
    try { if (window.ActionFlow && ActionFlow.isOpen) return; } catch (e) {}
    var opened = null;
    try { opened = clarityOpenUpdate({ source: 'stale-ask' }); } catch (e) {}
    if (!opened) return;   // not a number goal: nothing to ask, nothing spent
    try { lsSet(FALLBACK_KEY, String((state.goalProgress && state.goalProgress.updatedAt) || '') + '|' + todayKey()); } catch (e) {}
    try { if (typeof Analytics !== 'undefined') Analytics.track('progress_ask_inapp', {}); } catch (e) {}
  }

  /* ---- DEEP LINKS ---------------------------------------------------------
     The engine's link vocabulary (notif-engine.ts deepLink()) resolved to the
     app's real surfaces. The wrapped open functions report themselves to the
     router, so the back trail stays honest.
       action / reentry -> the day screen (the move, with its log control)
       update           -> the prefilled "Where are you now?" sheet
       reflection       -> the Reflection sheet
       clarity          -> Clarity (summary if it is done)
       card             -> the Memento card
       home / unknown   -> wherever the restore already landed */
  function appReady() {
    try {
      var sp = document.getElementById('splash');
      if (sp && !sp.classList.contains('dismissed')) return false;
      var lg = document.getElementById('loginScreen');
      if (lg && !lg.classList.contains('hidden')) return false;
      if (document.querySelector('.welcome-intro.open')) return false;
      return !!(typeof state !== 'undefined' && state && state.meta && state.meta.welcomeSeen);
    } catch (e) { return false; }
  }

  function routeLink(link) {
    var l = String(link || '');
    try {
      if (l === 'update') {
        // The weekly ask. clarityOpenUpdate returns null when the star has no
        // number to move; Reflection is the honest second best.
        var el = (typeof clarityOpenUpdate === 'function') ? clarityOpenUpdate({ source: 'push-weekly' }) : null;
        if (el) return;
        l = 'reflection';
      }
      if (l === 'reflection') {
        if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection');
        return;
      }
      if (l === 'action' || l === 'reentry') {
        if (window.ActionFlow && ActionFlow.start) ActionFlow.start();
        else if (typeof ActionExperience !== 'undefined') ActionExperience.open();
        return;
      }
      if (l === 'clarity') {
        if (typeof ClarityExperience === 'undefined') return;
        if (state.clarity && state.clarity.completed && ClarityExperience.openSummary) ClarityExperience.openSummary();
        else ClarityExperience.open();
        return;
      }
      if (l === 'card') {
        if (typeof openMementoFull === 'function') openMementoFull();
        return;
      }
    } catch (e) {}
  }

  // Did the tap actually land? appReady() can be true a beat before a module
  // is wired, and a silent miss would drop the user on the home with no idea
  // why (the whole value of the tap is the surface it opens). So the route is
  // verified and retried a few times before giving up.
  function landed(link) {
    try {
      if (link === 'update') return !!document.querySelector('.cp-fs--upd, .cp-fs');
      if (link === 'reflection') return !!document.querySelector('.sheet.open');
      if (link === 'action' || link === 'reentry') {
        if (window.ActionFlow && ActionFlow.isOpen) return true;
        if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return true;
        return !!document.querySelector('.afl, .cpw--open');
      }
      if (link === 'clarity') {
        if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return true;
        return !!document.querySelector('.cpw--open');
      }
      if (link === 'card') {
        if (window.MementoView && MementoView.isActive && MementoView.isActive()) return true;
        return false;
      }
    } catch (e) {}
    return true;   // 'home' and anything unknown: the restore already landed
  }

  function openDeepLink(link, notificationId) {
    if (!link) return;
    try { if (typeof Analytics !== 'undefined') Analytics.track('push_open', { link: String(link), id: String(notificationId || '') }); } catch (e) {}
    var tries = 0, routes = 0, settled = false;
    var go = function () {
      if (appReady()) {
        // appReady means the app is on screen, not that every module has
        // finished wiring. One settle beat, then attempts spaced wide enough
        // for a module to finish opening before we judge it.
        if (!settled) { settled = true; setTimeout(go, 900); return; }
        if (landed(link)) return;
        if (routes++ >= 8) return;             // ~10s of honest attempts
        routeLink(link);
        setTimeout(go, 1200);
        return;
      }
      if (tries++ < 40) setTimeout(go, 500);   // ~20s of boot, then give up
    };
    go();
  }

  // Warm taps: the service worker focuses the open window and posts the link.
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function (ev) {
        var d = ev && ev.data;
        if (!d || d.memento !== 'push-open') return;
        openDeepLink(d.deepLink, d.notificationId);
      });
    }
  } catch (e) {}

  // Boot: disarm the dead local reminder, re-sync context (tz travels with
  // every sync), land any notification tap, then the two quiet asks.
  function boot() {
    disarmLegacyReminder();
    sync();
    if (coldLink) openDeepLink(coldLink, '');
    if (FORCE) { setTimeout(showCard, 900); return; }
    setTimeout(function () {
      if (coldLink) return;   // they came in on a notification: leave them on it
      // Paid + installed + never asked: this is the post-payment pre-prompt,
      // whether they bought a minute ago (ARM_KEY, spent here when the
      // purchase happened in a browser tab) or months ago on another device.
      if (eligible()) { offerCard(); return; }
      offerProgressAsk();
    }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.MementoPush = {
    sync: sync,
    disableForSignOut: disableForSignOut,
    maybePromptAfterFirstWin: maybePromptAfterFirstWin,
    // js/13 calls this the moment a purchase verifies (notifications phase C).
    armPostPayment: armPostPayment,
    supported: supported,
    // probes / dev only
    _openDeepLink: openDeepLink,
    _progressAskDue: progressAskDue,
    _offerProgressAsk: offerProgressAsk,
    _eligible: eligible
  };
})();
