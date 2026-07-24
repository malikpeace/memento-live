/* ===========================================================================
   20-push.js  -  Web Push reminders (FIRST-WIN-PLAN P5).

   The ONE permission ask, at the highest-intent moment:
     - Buyers: right after the first move is logged, once the first-white
       ceremony has finished playing (js/08 calls maybePromptAfterFirstWin).
     - Free users who finished Clarity: a quiet boot-time ask (their only
       session is usually their last; there is no "next open" to wait for).
   Asked once ever. Declining the card never re-asks; the browser permission
   itself is only requested when they tap "Turn on".

   What the server needs to compose a good reminder (today's move by name,
   whether the day is done, paid/clarity flags, timezone) is synced into
   push_subscriptions via the anon-safe RPC on app open, after each logged
   move, and after unlock. The VAPID public key is fetched from push-tick at
   subscribe time, so no key material lives in this repo and keys can rotate.

   iOS reality: web push only works from the installed (standalone) PWA on
   iOS 16.4+. In a Safari tab, supported() is false and nothing shows; the
   Add-to-Home-Screen prompt (js/18) is the path there.
   =========================================================================== */
(function () {
  'use strict';

  var ASK_KEY = 'memento_push_asked_v1';   // the card was shown once (any outcome)
  var ON_KEY = 'memento_push_on';          // a subscription was created
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var FORCE = /[?&]dev=push/.test(location.search); // preview: force the card
  var cardEl = null;

  function isDemo() {
    try { return typeof DEMO_MODE !== 'undefined' && DEMO_MODE; } catch (e) { return false; }
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
    try { c.paid = !!(state.entitlements && state.entitlements.isPaid); } catch (e) {}
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
      if (!url || !anon || !sub || isDemo()) return Promise.resolve();
      if (LOCAL) return Promise.resolve(); // dev preview: never write real rows
      var j = sub.toJSON ? sub.toJSON() : sub;
      var keys = j.keys || {};
      var device = (typeof deviceId === 'function') ? deviceId() : '';
      if (!device) return Promise.resolve();
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
      }).catch(function () {});
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
      if (!supported() || localStorage.getItem(ON_KEY) !== '1') return;
      if (Notification.permission !== 'granted') return;
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription();
      }).then(function (sub) {
        if (!sub) { try { localStorage.removeItem(ON_KEY); } catch (e) {} return; }
        return rpcSync(sub);
      }).catch(function () {});
    } catch (e) {}
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

  function cardCopy() {
    var paid = false;
    try { paid = !!(state.entitlements && state.entitlements.isPaid); } catch (e) {}
    if (paid) {
      return {
        title: 'Get your move each morning',
        sub: 'One reminder at 9am with <b>today’s move</b>, and one at 8pm if the day is still open. Nothing else, ever.'
      };
    }
    return {
      title: 'Keep your star in sight',
      sub: 'A rare, quiet reminder of <b>the goal you just named</b>. A few in total, never daily noise.'
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
    try { localStorage.setItem(ASK_KEY, '1'); } catch (e) {}
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
  function eligible() {
    if (isDemo()) return false;
    if (!supported()) return false;
    // v760 (Malik): the ask only ever happens inside the INSTALLED app. Asking
    // in a browser tab makes no sense (on iOS it cannot even deliver), and it
    // would burn the once-ever card in the wrong storage anyway.
    if (!isStandalone()) return false;
    try { if (Notification.permission !== 'default') return false; } catch (e) { return false; }
    try { if (localStorage.getItem(ASK_KEY) === '1') return false; } catch (e) {}
    try { if (!(state.clarity && state.clarity.completed)) return false; } catch (e) { return false; }
    // Never stack on top of another overlay moment.
    if (document.querySelector('.pwa-install.is-open, .save-memento.is-open, .cpw--open')) return false;
    try { if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return false; } catch (e) {}
    try { if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return false; } catch (e) {}
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

  // Boot: sync context, and give free Clarity-finishers their one quiet ask
  // (buyers get theirs at the ceremony; if that moment was missed, e.g. the
  // ceremony played under an overlay, this catches them on the next open).
  function boot() {
    sync();
    if (FORCE) { setTimeout(showCard, 900); return; }
    setTimeout(function () {
      if (!eligible()) return;
      var paid = false, hasWhite = false;
      try { paid = !!(state.entitlements && state.entitlements.isPaid); } catch (e) {}
      try { hasWhite = !!(state.action && state.action.completionHistory && state.action.completionHistory.length); } catch (e) {}
      if (paid && !hasWhite) return; // buyer mid-first-minute: the ceremony hook owns it
      offerCard();
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
    supported: supported
  };
})();
