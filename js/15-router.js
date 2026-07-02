/* ===========================================================================
   15-router.js  —  Back / forward + hash-URL routing for Memento (Phase 1).

   GOAL (per Malik): the browser/mouse back & forward buttons walk the trail of
   screens you visit (modules, experiences, tabs); refresh reopens where you
   were; a link to a screen opens that screen; locked/invalid links route to a
   safe place. Onboarding is left ALONE.

   SAFETY DESIGN (why this can't break the app):
   - Additive + revertable: this file WRAPS the existing public open/close fns;
     it never rewrites any teardown. Remove the <script> tag = fully reverted.
   - Inert until onboarding is done: every entry point checks routerEnabled().
     Nothing the splash / onboarding / appearance picker does can touch history.
   - Touches ONLY location.hash (never location.search), so ?demo= and OAuth
     ?code= survive untouched.
   - The "current screen" is always re-derived from the real DOM/flags, never a
     possibly-stale mirror.
   - Heavily try/caught: any error no-ops rather than wedging navigation.

   This is Phase 1 (top-level screens). Phase 2 (sub-views inside modules) is
   layered on later via the same machinery.
   =========================================================================== */
(function () {
  'use strict';

  var R = {
    ready: false,        // wrapped + initialised
    frames: [],          // logical screen trail; frames[0] === 'home' once live
    navLock: false,      // true while WE drive a transition (suppress observation)
    suppressPop: 0,      // >0 while a history.back() WE issued is in flight
    pendingClose: null,  // {timer} window to detect a close+open handoff
    lastSlug: 'home'
  };

  // --- the onboarding boundary (mirror of js/09 _appBlocked) -----------------
  function appBlocked() {
    try {
      var sp = document.getElementById('splash');
      if (sp && !sp.classList.contains('dismissed')) return true;
      var lg = document.getElementById('loginScreen');
      if (lg && !lg.classList.contains('hidden')) return true;
      if (document.querySelector('.welcome-intro.open')) return true;
    } catch (e) {}
    return false;
  }
  function routerEnabled() {
    try {
      return R.ready &&
        typeof state !== 'undefined' && state && state.meta &&
        state.meta.welcomeSeen === true && !appBlocked();
    } catch (e) { return false; }
  }

  // --- slug <-> module-key remap (friendly URLs) -----------------------------
  var KEY_TO_SLUG = { reflection: 'notes', streak: 'consistency' };
  var SLUG_TO_KEY = { notes: 'reflection', consistency: 'streak' };
  function moduleSlug(key) { return 'm/' + (KEY_TO_SLUG[key] || key); }
  function slugToKey(rest) { return SLUG_TO_KEY[rest] || rest; }

  // --- derive the CURRENT top screen straight from the DOM/flags -------------
  //     (single source of truth; never trust a mirror)
  function currentTopSlug() {
    try {
      if (typeof ClarityPaywall !== 'undefined' && ClarityPaywall._open) return 'paywall';
      if (document.getElementById('mementoFull')) return 'memento-full';
      var ms = document.getElementById('moreSpace');
      if (ms && ms.classList.contains('open')) return 'modules';
      if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return 'clarity';
      if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return 'action';
      if (typeof Sheet !== 'undefined' && Sheet.isOpen && Sheet.currentWidget) return moduleSlug(Sheet.currentWidget);
      if (typeof TabBar !== 'undefined' && TabBar.activeTab && TabBar.activeTab !== 'home') return TabBar.activeTab;
      return 'home';
    } catch (e) { return 'home'; }
  }

  // --- hash helpers (hash ONLY; preserve query verbatim) ---------------------
  function hashFor(slug) {
    var h = (slug === 'home' || !slug) ? '' : '#' + slug;
    // keep the path + search exactly; only swap the fragment
    return location.pathname + location.search + h;
  }
  function parseHash() {
    try { return decodeURIComponent((location.hash || '').replace(/^#/, '')); }
    catch (e) { return (location.hash || '').replace(/^#/, ''); }
  }

  function topFrame() { return R.frames.length ? R.frames[R.frames.length - 1] : 'home'; }

  function pushSlug(slug) {
    R.frames.push(slug);
    try { history.pushState({ slug: slug, i: R.frames.length }, '', hashFor(slug)); } catch (e) {}
    R.lastSlug = slug;
  }
  function replaceSlug(slug) {
    if (R.frames.length) R.frames[R.frames.length - 1] = slug; else R.frames.push(slug);
    try { history.replaceState({ slug: slug, i: R.frames.length }, '', hashFor(slug)); } catch (e) {}
    R.lastSlug = slug;
  }
  // a deliberate back step that WE issue (closing via X / handoff collapse) so
  // the URL mirrors the screen without the popstate re-running a close.
  function silentBack() {
    if (R.frames.length > 1) {
      R.frames.pop();
      R.suppressPop++;
      try { history.back(); } catch (e) { R.suppressPop--; }
    } else {
      // nothing beneath: just rewrite the fragment to the base
      replaceSlug('home');
    }
  }

  // --- reconcile the URL to whatever screen is actually on top ----------------
  //     Called (debounced through the handoff window) after any wrapped action.
  function reconcile() {
    if (!routerEnabled() || R.navLock) return;
    ensureSeeded();
    var now = currentTopSlug();
    var top = topFrame();
    if (now === top) return;                       // no change / collapse-repeat
    var below = R.frames.length >= 2 ? R.frames[R.frames.length - 2] : 'home';
    if (now === below) {
      // screen got shallower and matches the frame beneath -> it's a BACK step
      silentBack();
    } else if (now === 'home' && top !== 'home') {
      // closed back to the base
      silentBack();
    } else {
      // a NEW (deeper / sideways) screen -> forward push
      pushSlug(now);
    }
  }

  // Handoff-aware scheduler: a close immediately followed by an open (the app
  // chains them, 100-1100ms apart) must net to ONE step. We wait a short beat
  // after a wrapped action before reconciling, and any further wrapped action
  // inside the window resets it, so only the SETTLED top screen is recorded.
  function scheduleReconcile() {
    if (R.pendingClose) { clearTimeout(R.pendingClose); }
    R.pendingClose = setTimeout(function () {
      R.pendingClose = null;
      reconcile();
    }, 140);
  }

  // ----------------------------------------------------------------- wrapping
  // Wrap a method so the original runs untouched, then we schedule a reconcile.
  function wrapAround(obj, name) {
    try {
      if (!obj || typeof obj[name] !== 'function') return false;
      if (obj['__navwrap_' + name]) return true;
      var orig = obj[name];
      obj[name] = function () {
        var r = orig.apply(obj, arguments);
        if (routerEnabled() && !R.navLock) scheduleReconcile();
        return r;
      };
      obj['__navwrap_' + name] = true;
      return true;
    } catch (e) { return false; }
  }
  // Wrap a GLOBAL function (openMementoFull, exitToModules) the same way.
  function wrapGlobal(name) {
    try {
      if (typeof window[name] !== 'function') return false;
      if (window['__navwrap_' + name]) return true;
      var orig = window[name];
      window[name] = function () {
        var r = orig.apply(this, arguments);
        if (routerEnabled() && !R.navLock) scheduleReconcile();
        return r;
      };
      window['__navwrap_' + name] = true;
      return true;
    } catch (e) { return false; }
  }

  // --- close the current top screen via its OWN existing close path ----------
  //     (used by popstate when the user presses browser back)
  function closeTopScreen() {
    var slug = currentTopSlug();
    R.navLock = true;
    try {
      if (slug === 'paywall') { if (typeof ClarityPaywall !== 'undefined') ClarityPaywall.hide(); }
      else if (slug === 'memento-full') {
        var x = document.querySelector('#mementoFull .mf__close');
        if (x) x.click();
      }
      else if (slug === 'modules') { if (typeof MoreSpace !== 'undefined') MoreSpace.close(); }
      else if (slug === 'clarity') { if (typeof exitToModules === 'function') exitToModules('clarity'); }
      else if (slug === 'action') { if (typeof exitToModules === 'function') exitToModules('action'); }
      else if (slug.indexOf('m/') === 0) { if (typeof Sheet !== 'undefined') Sheet.close(); }
      else if (slug === 'profile' || slug === 'memento') { if (typeof TabBar !== 'undefined') TabBar.switchTo('home'); }
    } catch (e) {}
    // release the lock after the close animation settles
    setTimeout(function () { R.navLock = false; }, 360);
  }

  // --- open a target screen from a slug (used by forward + deep-link) ---------
  //     Returns the slug actually resolved (may differ: locked -> paywall, etc.)
  function openSlug(slug, opts) {
    opts = opts || {};
    var key, rest;
    R.navLock = true;
    var resolved = slug;
    try {
      if (!slug || slug === 'home') {
        if (typeof TabBar !== 'undefined') TabBar.switchTo('home');
        resolved = 'home';
      } else if (slug === 'profile') {
        if (typeof TabBar !== 'undefined') TabBar.switchTo('profile'); resolved = 'profile';
      } else if (slug === 'memento') {
        // desktop: trinity panel. mobile: resolves to modules switcher.
        if (typeof TabBar !== 'undefined') TabBar.switchTo('memento');
        resolved = currentTopSlug();
      } else if (slug === 'modules') {
        if (typeof MoreSpace !== 'undefined') MoreSpace.open({ mode: 'switcher' });
        resolved = currentTopSlug();
      } else if (slug.indexOf('m/') === 0) {
        key = slugToKey(slug.slice(2));
        if (typeof Sheet !== 'undefined' && typeof WIDGET_DEFS !== 'undefined' &&
            WIDGET_DEFS[key] && typeof SHEET_TEMPLATES !== 'undefined' && SHEET_TEMPLATES[key] && key !== 'search') {
          Sheet.open(key);
          resolved = currentTopSlug();   // paywall gate may have fired
        } else { resolved = 'home'; if (typeof TabBar !== 'undefined') TabBar.switchTo('home'); }
      } else if (slug === 'clarity') {
        if (typeof ClarityExperience !== 'undefined') {
          if (state.clarity && state.clarity.completed && ClarityExperience.openSummary) ClarityExperience.openSummary();
          else ClarityExperience.open();
        }
        resolved = currentTopSlug();
      } else if (slug === 'action') {
        if (typeof ActionExperience !== 'undefined') ActionExperience.open();
        resolved = currentTopSlug();
      } else if (slug === 'memento-full') {
        if (typeof openMementoFull === 'function') openMementoFull();
        resolved = currentTopSlug();
      } else if (slug === 'paywall') {
        // only meaningful if something is actually locked; otherwise home
        if (typeof ClarityPaywall !== 'undefined' && ClarityPaywall.show) ClarityPaywall.show();
        resolved = currentTopSlug();
      } else {
        resolved = 'home';
        if (typeof TabBar !== 'undefined') TabBar.switchTo('home');
      }
    } catch (e) { resolved = currentTopSlug(); }
    setTimeout(function () { R.navLock = false; }, 360);
    return resolved;
  }

  // seed the base trail lazily the first time we are live (covers the
  // onboarding -> app transition without needing a hook into the reveal)
  function ensureSeeded() {
    if (routerEnabled() && R.frames.length === 0) {
      var now = currentTopSlug();
      R.frames = (now !== 'home') ? ['home', now] : ['home'];
    }
  }

  // ----------------------------------------------------------------- popstate
  function onPopState(ev) {
    if (R.suppressPop > 0) { R.suppressPop--; return; }   // our own silentBack
    if (!routerEnabled()) return;                          // inert in onboarding
    ensureSeeded();
    var target = (ev && ev.state && ev.state.slug) || parseHash() || 'home';
    var now = currentTopSlug();
    if (target === now) return;                            // already there

    // Did we go BACK (the target is somewhere beneath us in our trail)?
    var idx = R.frames.lastIndexOf(target);
    if (idx !== -1 && idx < R.frames.length - 1) {
      // close one screen at a time until we reach the target (usually one)
      var guard = 0;
      while (currentTopSlug() !== target && R.frames.length > idx + 1 && guard < 8) {
        R.frames.pop();
        closeTopScreen();
        guard++;
      }
      // align the mirror
      R.frames.length = idx + 1;
    } else {
      // FORWARD (or a deep-link target not in our trail): open it
      var resolved = openSlug(target);
      if (resolved === target) { R.frames.push(target); }
      else { replaceSlug(resolved); }   // e.g. locked -> paywall
    }
  }

  // ----------------------------------------------------------------- wrap all
  function wrapAll() {
    if (typeof Sheet !== 'undefined') { wrapAround(Sheet, 'open'); wrapAround(Sheet, 'close'); }
    if (typeof TabBar !== 'undefined') { wrapAround(TabBar, 'switchTo'); }
    if (typeof ClarityExperience !== 'undefined') { wrapAround(ClarityExperience, 'open'); wrapAround(ClarityExperience, 'openSummary'); }
    if (typeof ActionExperience !== 'undefined') { wrapAround(ActionExperience, 'open'); }
    if (typeof MoreSpace !== 'undefined') { wrapAround(MoreSpace, 'open'); wrapAround(MoreSpace, 'close'); }
    if (typeof ClarityPaywall !== 'undefined') { wrapAround(ClarityPaywall, 'show'); wrapAround(ClarityPaywall, 'hide'); }
    wrapGlobal('openMementoFull');
    wrapGlobal('exitToModules');
    // NOTE: ClarityExperience.close is intentionally NOT wrapped (it is already
    // self-wrapped/reassigned elsewhere). exitToModules covers the close path.
  }

  // ----------------------------------------------------------------- boot
  // Self-booting: the existing boot IIFE (js/11) already restored the last view
  // (or a deep-linked hash points somewhere). We reconcile ONCE: seed the trail
  // to match whatever ended up open, and if an explicit hash points elsewhere,
  // navigate there. No edit to the sacred boot file required.
  function bootReconcile() {
    try {
      if (R.booted || !routerEnabled()) return;
      R.booted = true;
      var hash = parseHash();
      var now = currentTopSlug();
      if (hash && hash !== 'home' && hash !== now) {
        // explicit deep-link wins over the plain restore
        var resolved = openSlug(hash);
        setTimeout(function () {
          var top = currentTopSlug();
          R.frames = (top !== 'home') ? ['home', top] : ['home'];
          replaceSlug(top);
          var app = document.getElementById('app'); if (app) app.style.opacity = '1';
        }, 80);
      } else {
        // normal reload: mirror whatever is open into the trail + URL
        R.frames = (now !== 'home') ? ['home', now] : ['home'];
        replaceSlug(now);
      }
    } catch (e) {}
  }

  // Keep trying to boot until the app is past onboarding/splash (returning users
  // are ready almost immediately; brand-new users finish onboarding much later,
  // at which point the first navigation seeds the trail via ensureSeeded()).
  function scheduleBoot() {
    var tries = 0;
    (function attempt() {
      if (R.booted) return;
      if (routerEnabled()) { bootReconcile(); return; }
      if (tries++ < 10) setTimeout(attempt, 250);
    })();
  }

  function init() {
    if (R.ready) return;
    wrapAll();
    window.addEventListener('popstate', onPopState);
    R.ready = true;
    // run AFTER the existing boot restore (its view open fires on a ~50ms timer)
    setTimeout(scheduleBoot, 220);
  }

  // Tiny debug/inspection surface.
  window.Router = { init: init, enabled: routerEnabled, _state: R, _top: currentTopSlug };

  function tryInit() {
    if (typeof state === 'undefined') { setTimeout(tryInit, 60); return; }
    init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
