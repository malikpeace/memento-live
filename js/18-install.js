/* ===========================================================================
   18-install.js  -  "Add to Home Screen" prompt.

   Detects whether Memento is running as an INSTALLED PWA (standalone) or just a
   browser tab, and on mobile nudges browser-tab users to install it for the full
   app experience (full screen, instant, able to send reminders). Two platforms:
     - iOS Safari blocks programmatic install, so we show the manual
       Share -> Add to Home Screen instructions.
     - Android / Chrome fire beforeinstallprompt, so we offer a one-tap Install.
   Dismissible, shows once, remembers the dismissal. Skips demo + onboarding +
   any open overlay. Self-contained.
   =========================================================================== */
(function () {
  'use strict';
  var DISMISS_KEY = 'memento_install_dismissed_v1';
  var deferredPrompt = null;
  var el = null, shown = false, timer = null;

  // Capture the Android/Chrome install opportunity as early as possible.
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener('appinstalled', function () { hide(); });

  function isStandalone() {
    try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; }
  }
  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isMobile() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
    try { return !!(window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches); } catch (e) { return false; }
  }
  function dismissed() { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; } }
  function blockedByOverlay() {
    try {
      // body overflow is locked to 'hidden' whenever a full-screen overlay (coach,
      // journey, a sheet, an experience, onboarding) is open. The safest generic gate.
      if (document.body && document.body.style.overflow === 'hidden') return true;
      if (document.querySelector('.welcome-intro.open')) return true;
      if (document.getElementById('welcomeOverlay')) return true;   // the post-Enter "Welcome to Memento" cinematic
      var sp = document.getElementById('splash'); if (sp && !sp.classList.contains('dismissed')) return true;
      var lg = document.getElementById('loginScreen'); if (lg && !lg.classList.contains('hidden')) return true;
    } catch (e) {}
    return false;
  }
  function shouldShow() {
    if (shown) return false;
    if (isStandalone()) return false;            // already installed
    if (!isMobile()) return false;               // mobile only
    if (dismissed()) return false;
    try { if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return false; } catch (e) {}
    try { if (typeof state === 'undefined' || !state.meta || state.meta.welcomeSeen !== true) return false; } catch (e) { return false; }
    if (blockedByOverlay()) return false;
    return true;
  }

  function markSvg() {
    return '<svg viewBox="0 0 512 512" width="42" height="42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect width="512" height="512" rx="118" fill="#0c1112"/>' +
      '<path d="M113 108 L256 251 L399 108 L399 405 L113 405 Z" fill="#f5f5f7"/></svg>';
  }
  function shareGlyph() {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 15V3"/><path d="M8.5 6.5 12 3l3.5 3.5"/>' +
      '<path d="M7 10H5.6A1.6 1.6 0 0 0 4 11.6v6.8A1.6 1.6 0 0 0 5.6 20h12.8a1.6 1.6 0 0 0 1.6-1.6v-6.8A1.6 1.6 0 0 0 18.4 10H17"/></svg>';
  }
  function plusGlyph() {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>';
  }

  function build() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'pwaInstall'; el.className = 'pwa-install'; el.setAttribute('aria-hidden', 'true');
    var ios = isIOS();
    var body = ios
      ? '<div class="pwa-install__steps">' +
          '<div class="pwa-install__step"><span class="pwa-install__num">1</span>Tap Share<span class="pwa-install__glyph">' + shareGlyph() + '</span></div>' +
          '<div class="pwa-install__step"><span class="pwa-install__num">2</span><b>Add to Home Screen</b><span class="pwa-install__glyph">' + plusGlyph() + '</span></div>' +
        '</div>'
      : '<button class="pwa-install__btn" id="pwaInstallBtn">Install Memento</button>';
    el.innerHTML =
      '<div class="pwa-install__scrim" data-close="1"></div>' +
      '<div class="pwa-install__sheet" role="dialog" aria-label="Add Memento to your home screen">' +
        '<button class="pwa-install__close" data-close="1" type="button" aria-label="Close">\u2715</button>' +
        '<span class="pwa-install__mark"><img src="icons/icon-180.png" alt="" width="42" height="42" style="display:block;border-radius:13px;"></span>' +
        '<div class="pwa-install__title">Add Memento to your Home Screen</div>' +
        '<div class="pwa-install__sub">Memento is built to live on your home screen. I <b>highly recommend</b> adding it for a significantly better experience. Follow the instructions below to turn it into a real app.</div>' +
        body +
        '<button class="pwa-install__skip" data-close="1" type="button">Nah, I want a worse experience for now</button>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== el) { if (t.getAttribute && t.getAttribute('data-close')) { hide(); return; } t = t.parentNode; }
    });
    var ib = el.querySelector('#pwaInstallBtn');
    if (ib) ib.addEventListener('click', androidInstall);
  }

  function androidInstall() {
    if (!deferredPrompt) { hide(); return; }
    try {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; hide(); }).catch(function () { hide(); });
    } catch (e) { hide(); }
  }

  function show() {
    build(); shown = true;
    requestAnimationFrame(function () { el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); });
  }
  var _onClose = null;
  function hide() {
    // intentionally does NOT remember: the prompt returns on every refresh until
    // they actually install (then isStandalone() gates it off for good).
    if (el) { el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); }
    // fire the deferred callback (e.g. start onboarding) once they continue/install
    var cb = _onClose; _onClose = null;
    if (cb) { try { cb(); } catch (e) {} }
  }

  // Show the wall: every load / refresh, until installed. Skips overlay + welcomeSeen
  // on purpose (the splash is up, they may not have onboarded), and does NOT respect a
  // prior dismissal (it is a requirement, not a one-time suggestion). Still off for the
  // installed app, desktop, and demo. z-index 1300 sits above splash (250) + onboarding (210).
  // Shown on the splash "Get started" tap (the front-page entry). Optional onDone
  // is fired when the user continues or installs (used to HOLD onboarding until the
  // wall is resolved). Returns true if the wall was shown (so the caller can defer).
  function promptOnEntry(onDone) {
    try {
      if (shown) return false;
      if (isStandalone()) return false;
      if (!isMobile()) return false;
      if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return false;
      _onClose = (typeof onDone === 'function') ? onDone : null;
      show();
      return true;
    } catch (e) { return false; }
  }
  function maybeShowNow() { try { if (shouldShow()) show(); } catch (e) {} }

  /* ---- The onboarding HOW-TO page (v754, Malik) --------------------------------
     "Show me how" during onboarding opens THIS: a full floating page with the
     REAL step-by-step. The old 2-step sheet undersold the actual iOS flow
     (three dots -> Share -> scroll -> Add to Home Screen -> Add), and the
     conversation kept autoplaying underneath it, which read as cheap. This one
     returns a Promise so the caller can HOLD until the user dismisses it. The
     sheet above stays for deeper in the app. */
  var guideEl = null, guideResolve = null;

  function dotsGlyph() {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">' +
      '<circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>';
  }
  function addGlyph() {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M5 12.5 10 17.5 19 7"/></svg>';
  }

  function mGlyph() {
    return '<svg viewBox="113 108 286 297" width="15" height="15" fill="currentColor" aria-hidden="true">' +
      '<path d="M113 108 L256 251 L399 108 L399 405 L113 405 Z"/></svg>';
  }

  function guideStepsHtml() {
    // Each step carries its slot index so the CSS can spotlight them one after
    // another on a loop (the --n on the wrapper sets the cycle length).
    var rows = [];
    var mk = function (html, glyph) {
      var i = rows.length;
      rows.push('<div class="pwa-guide__step" style="--i:' + i + '"><span class="pwa-guide__num">' + (i + 1) + '</span><span class="pwa-guide__txt">' + html + '</span>' +
        (glyph ? '<span class="pwa-guide__glyph">' + glyph + '</span>' : '') + '</div>');
    };
    if (isIOS()) {
      var ipad = Math.min(screen.width || 0, screen.height || 0) >= 744;
      mk('Tap the <b>three dots</b> ' + (ipad ? 'at the top right of Safari.' : 'at the bottom of Safari.'), dotsGlyph());
      mk('Tap <b>Share</b>.', shareGlyph());
      mk('Scroll down and tap <b>Add to Home Screen</b>.', plusGlyph());
      mk('Tap <b>Add</b> at the top, keeping <b>Open as Web App</b> on.', addGlyph());
    } else {
      mk('Tap the <b>three dots</b> at the top of your browser.', dotsGlyph());
      mk('Tap <b>Add to Home screen</b>.', plusGlyph());
      mk('Tap <b>Install</b>.', addGlyph());
    }
    mk('Open it and <b>build your Memento</b>.', mGlyph());
    return '<div class="pwa-guide__steps" style="--n:' + rows.length + '">' + rows.join('') + '</div>';
  }

  function buildGuide() {
    if (guideEl) { guideEl.remove(); }
    guideEl = document.createElement('div');
    guideEl.id = 'pwaGuide'; guideEl.className = 'pwa-guide'; guideEl.setAttribute('aria-hidden', 'true');
    // Android with a captured install prompt gets the one-tap button on top of
    // the manual steps; everyone else gets the steps alone.
    var installBtn = (!isIOS() && deferredPrompt)
      ? '<button class="pwa-guide__install" id="pwaGuideInstall" type="button">Install Memento</button>' +
        '<div class="pwa-guide__or">or do it manually</div>'
      : '';
    guideEl.innerHTML =
      '<div class="pwa-guide__inner" role="dialog" aria-label="How to add Memento to your Home Screen">' +
        '<span class="pwa-guide__mark">' + markSvg() + '</span>' +
        '<div class="pwa-guide__title">How to add Memento to your Home&nbsp;Screen</div>' +
        installBtn +
        guideStepsHtml() +
        '<div class="pwa-guide__actions">' +
          '<button class="pwa-guide__back" data-close="1" type="button" aria-label="Back">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
          '<button class="pwa-guide__done" data-close="1" type="button">See you there</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(guideEl);
    guideEl.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== guideEl) { if (t.getAttribute && t.getAttribute('data-close')) { hideGuide(); return; } t = t.parentNode; }
    });
    var ib = guideEl.querySelector('#pwaGuideInstall');
    if (ib) ib.addEventListener('click', function () {
      if (!deferredPrompt) return;
      try {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () { deferredPrompt = null; hideGuide(); }).catch(function () {});
      } catch (e) {}
    });
  }

  function showGuide() {
    buildGuide();
    requestAnimationFrame(function () { guideEl.classList.add('is-open'); guideEl.setAttribute('aria-hidden', 'false'); });
    return new Promise(function (res) { guideResolve = res; });
  }
  function hideGuide() {
    if (guideEl) { guideEl.classList.remove('is-open'); guideEl.setAttribute('aria-hidden', 'true'); }
    var r = guideResolve; guideResolve = null;
    if (r) { try { r(); } catch (e) {} }
  }

  window.MementoInstall = { show: show, hide: hide, showGuide: showGuide, shouldShow: shouldShow, maybeShowNow: maybeShowNow, promptOnEntry: promptOnEntry, _isStandalone: isStandalone, _isIOS: isIOS };
})();
