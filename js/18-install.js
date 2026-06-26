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
      '<rect width="512" height="512" rx="118" fill="#0c0c12"/>' +
      '<rect x="6" y="6" width="500" height="500" rx="114" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="3"/>' +
      '<path d="M150 152 L256 258 L362 152 L362 360 L150 360 Z" fill="none" stroke="#f5f5f7" stroke-width="26" stroke-linejoin="round"/></svg>';
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
      '<div class="pwa-install__scrim"></div>' +
      '<div class="pwa-install__sheet" role="dialog" aria-label="Add Memento to your home screen">' +
        '<span class="pwa-install__mark">' + markSvg() + '</span>' +
        '<div class="pwa-install__title">Add Memento to your Home Screen</div>' +
        '<div class="pwa-install__sub">Memento is built to live on your home screen. I <b>highly recommend</b> adding it for a significantly better experience. Follow the instructions below to turn it into a real app.</div>' +
        body +
        '<button class="pwa-install__skip" data-close="1" type="button">Continue in browser for now</button>' +
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

  window.MementoInstall = { show: show, hide: hide, shouldShow: shouldShow, maybeShowNow: maybeShowNow, promptOnEntry: promptOnEntry, _isStandalone: isStandalone, _isIOS: isIOS };
})();
