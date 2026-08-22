/* ===========================================================================
   16-doors.js

   The one traffic controller for Memento's root surfaces. Phase 1 owns order
   and correctness only. Gesture physics lands after this foundation is proven.
   =========================================================================== */
(function () {
  'use strict';

  var registry = Object.create(null);
  var frames = [];
  var queue = [];
  var busy = false;
  var internalDepth = 0;
  var suppressPop = 0;
  var ready = false;
  var raw = {};
  var KEY_TO_SLUG = { reflection: 'notes', streak: 'consistency' };
  var SLUG_TO_KEY = { notes: 'reflection', consistency: 'streak' };
  var TAB_SLUGS = { home: 1, path: 1, reflect: 1, profile: 1 };

  function moduleSlug(key) { return 'm/' + (KEY_TO_SLUG[key] || key); }
  function slugToKey(rest) { return SLUG_TO_KEY[rest] || rest; }
  function hashFor(slug) {
    var h = (!slug || slug === 'home') ? '' : '#' + slug;
    return location.pathname + location.search + h;
  }
  function hashSlug() {
    try { return decodeURIComponent((location.hash || '').replace(/^#/, '')) || 'home'; }
    catch (e) { return (location.hash || '').replace(/^#/, '') || 'home'; }
  }
  function appBlocked() {
    try {
      var splash = document.getElementById('splash');
      if (splash && !splash.classList.contains('dismissed')) return true;
      var login = document.getElementById('loginScreen');
      if (login && !login.classList.contains('hidden')) return true;
      return !!document.querySelector('.welcome-intro.open');
    } catch (e) { return false; }
  }
  function routingEnabled() {
    try {
      var hasLived = typeof state !== 'undefined' && state && (
        (state.meta && state.meta.welcomeSeen === true) ||
        (state.profile && state.profile.onboarded === true) ||
        (state.clarity && state.clarity.completed === true)
      );
      return ready && !!hasLived && !appBlocked();
    } catch (e) { return false; }
  }

  function internal(fn, ctx, args) {
    internalDepth++;
    try { return fn && fn.apply(ctx || null, args || []); }
    finally { internalDepth--; }
  }

  function cssMs(value) {
    value = String(value || '').trim();
    if (!value) return 0;
    if (value.slice(-2) === 'ms') return parseFloat(value) || 0;
    if (value.slice(-1) === 's') return (parseFloat(value) || 0) * 1000;
    return parseFloat(value) || 0;
  }
  function exitCap() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--t-door-exit');
      return Math.max(150, cssMs(v) || 340) + 150;
    } catch (e) { return 490; }
  }
  function waitForEnd(el, action) {
    return new Promise(function (resolve) {
      var done = false;
      var cap = null;
      function finish() {
        if (done) return;
        done = true;
        if (cap) clearTimeout(cap);
        if (el) {
          el.removeEventListener('transitionend', onEnd);
          el.removeEventListener('animationend', onEnd);
          el.removeEventListener('transitioncancel', onEnd);
          el.removeEventListener('animationcancel', onEnd);
        }
        resolve();
      }
      function onEnd(e) { if (!el || e.target === el) finish(); }
      if (el) {
        el.addEventListener('transitionend', onEnd);
        el.addEventListener('animationend', onEnd);
        el.addEventListener('transitioncancel', onEnd);
        el.addEventListener('animationcancel', onEnd);
      }
      cap = setTimeout(finish, exitCap());
      try { action(); } catch (e) { finish(); return; }
      if (!el || !el.isConnected) queueMicrotask(finish);
    });
  }

  function active(entry) {
    if (!entry) return false;
    try {
      if (typeof entry.active === 'function') return !!entry.active();
      var el = entry.el && entry.el();
      return !!(el && (el.classList.contains('open') || el.classList.contains('is-shown')));
    } catch (e) { return false; }
  }
  function activeSlugs() {
    return Object.keys(registry).filter(function (slug) { return slug !== 'home' && active(registry[slug]); });
  }
  function detect() {
    var on = activeSlugs();
    if (on.length) return on[on.length - 1];
    try {
      if (typeof Sheet !== 'undefined' && Sheet.isOpen && Sheet.currentWidget) {
        return moduleSlug(Sheet.currentWidget);
      }
    } catch (e) {}
    try {
      if (typeof TabBar !== 'undefined' && TabBar.activeTab && TabBar.activeTab !== 'home') return TabBar.activeTab;
    } catch (e) {}
    return 'home';
  }

  function ensureModule(slug) {
    if (registry[slug] || slug.indexOf('m/') !== 0) return registry[slug] || null;
    var key = slugToKey(slug.slice(2));
    register(slug, {
      gesture: 'sheet',
      el: function () { return (typeof Sheet !== 'undefined' && Sheet.el) || document.getElementById('sheet'); },
      active: function () { return typeof Sheet !== 'undefined' && Sheet.isOpen && Sheet.currentWidget === key; },
      open: function () { return internal(raw.sheetOpen, Sheet, [key]); },
      close: function () {
        var el = (typeof Sheet !== 'undefined' && Sheet.el) || document.getElementById('sheet');
        return waitForEnd(el, function () { internal(raw.sheetClose, Sheet); });
      },
      forceClose: function () { internal(raw.sheetClose, Sheet); }
    });
    return registry[slug];
  }
  function resolve(slug) { return registry[slug] || ensureModule(slug); }
  function register(slug, adapter) {
    if (!slug || !adapter || typeof adapter.open !== 'function' || typeof adapter.close !== 'function') {
      throw new Error('Doors.register requires a slug, open(), and close()');
    }
    registry[slug] = adapter;
    return adapter;
  }

  function writeHistory(slug, mode) {
    if (!routingEnabled() || mode === 'none') return;
    var stateObj = { slug: slug, door: true, depth: frames.length };
    try {
      if (mode === 'replace') history.replaceState(stateObj, '', hashFor(slug));
      else history.pushState(stateObj, '', hashFor(slug));
    } catch (e) {}
  }
  function ensureOwnedBackEntry() {
    if (!routingEnabled()) return;
    var now = detect();
    if (now === 'home') return;
    try {
      if (history.state && history.state.door === true) return;
      history.replaceState({ slug: 'home', door: true, depth: 1 }, '', hashFor('home'));
      history.pushState({ slug: now, door: true, depth: frames.length || 2 }, '', hashFor(now));
    } catch (e) {}
  }
  function seed() {
    if (frames.length) return;
    var now = detect();
    if (now.indexOf('m/') === 0) ensureModule(now);
    frames = now === 'home' ? ['home'] : ['home', now];
  }

  function healExtras(keep) {
    var extras = activeSlugs().filter(function (slug) { return slug !== keep; });
    if (!extras.length) return Promise.resolve();
    return extras.reduce(function (p, slug) {
      return p.then(function () {
        var entry = resolve(slug);
        if (!entry) return;
        try {
          if (typeof entry.forceClose === 'function') return internal(entry.forceClose, entry);
          return entry.close();
        } catch (e) {}
      });
    }, Promise.resolve());
  }
  function assertOneRoot(expected) {
    var on = activeSlugs();
    var ok = expected === 'home'
      ? on.length === 0
      : on.length === 1 && on[0] === expected;
    try { console.assert(ok, 'Doors: exactly one root surface must be active', { expected: expected, active: on }); } catch (e) {}
    if (!ok) return healExtras(expected);
    return Promise.resolve();
  }

  function finishTransition(slug, before, target, opts) {
    return Promise.resolve(target.open(opts)).then(function () {
      return assertOneRoot(slug).then(function () {
        if (slug !== 'home' && !active(target)) {
          throw new Error('Doors: target surface did not become active: ' + slug);
        }

        if (!opts.keepFrames) {
          var mode = opts.history || 'push';
          if (TAB_SLUGS[slug] && TAB_SLUGS[before]) mode = 'replace';
          if (mode === 'replace') {
            if (frames.length) frames[frames.length - 1] = slug; else frames = [slug];
          } else if (mode !== 'none' && frames[frames.length - 1] !== slug) {
            frames.push(slug);
          }
          writeHistory(slug, mode);
        }
        return slug;
      });
    });
  }

  function transition(slug, opts) {
    opts = opts || {};
    slug = slug || 'home';
    // The retired Path destination already resolves to Home in TabBar. Keep
    // the controller's target explicit so an unrelated open surface can never
    // masquerade as a successful Path transition.
    if (slug === 'path') slug = 'home';
    seed();
    var target = resolve(slug);
    if (!target) throw new Error('Doors: unknown root surface "' + slug + '"');
    var before = detect();
    if (before === slug && active(target)) {
      return assertOneRoot(slug).then(function () { return slug; });
    }
    var currentEntry = resolve(before);
    function openAfterHealing() {
      var extras = activeSlugs().filter(function (openSlug) { return openSlug !== slug; });
      if (extras.length) {
        return healExtras(slug).then(function () { return finishTransition(slug, before, target, opts); });
      }
      // With nothing to close, call open synchronously. Existing entry points
      // that inspect isOpen immediately after open() keep that behavior.
      return finishTransition(slug, before, target, opts);
    }
    if (before !== 'home' && currentEntry && active(currentEntry)) {
      return Promise.resolve(currentEntry.close()).then(openAfterHealing);
    }
    return openAfterHealing();
  }

  function drain() {
    if (busy || !queue.length) return;
    busy = true;
    var job = queue.shift();
    var result;
    try { result = job.run(); } catch (e) { job.reject(e); busy = false; drain(); return; }
    Promise.resolve(result).then(job.resolve, job.reject).then(function () {
      busy = false;
      drain();
    });
  }
  function enqueue(run) {
    return new Promise(function (resolve, reject) {
      queue.push({ run: run, resolve: resolve, reject: reject });
      drain();
    });
  }
  function go(slug, opts) {
    return enqueue(function () { return transition(slug, opts); });
  }

  function back(opts) {
    opts = opts || {};
    return enqueue(function () {
      seed();
      // A restored/deep-linked surface can be the browser's first app entry.
      // Give its Close button a real in-app Home entry to return to instead of
      // sending the person to whichever website happened to precede Memento.
      ensureOwnedBackEntry();
      var now = detect();
      if (TAB_SLUGS[now]) return transition('home', { history: 'replace' });
      var target = frames.length > 1 ? frames[frames.length - 2] : 'home';
      if (frames.length > 1) frames.pop();
      return transition(target, { history: 'none', keepFrames: true }).then(function (slug) {
        if (!opts.fromPop && routingEnabled()) {
          suppressPop++;
          try { history.back(); } catch (e) { suppressPop--; writeHistory(slug, 'replace'); }
        } else if (opts.replace) writeHistory(slug, 'replace');
        return slug;
      });
    });
  }

  function current() { return detect(); }
  function sync() {
    if (internalDepth) return;
    seed();
    var now = detect();
    var top = frames[frames.length - 1] || 'home';
    if (now === top) return;
    var below = frames.length > 1 ? frames[frames.length - 2] : 'home';
    if (now === below || (now === 'home' && top !== 'home')) {
      if (frames.length > 1) frames.pop();
      if (routingEnabled()) {
        suppressPop++;
        try { history.back(); } catch (e) { suppressPop--; writeHistory(now, 'replace'); }
      }
      return;
    }
    if (TAB_SLUGS[now] && TAB_SLUGS[top]) {
      frames[frames.length - 1] = now;
      writeHistory(now, 'replace');
    } else {
      frames.push(now);
      writeHistory(now, 'push');
    }
  }

  function onPopState(e) {
    if (!routingEnabled()) return;
    if (suppressPop > 0) { suppressPop--; return; }
    var target = (e && e.state && e.state.slug) || hashSlug();
    var idx = frames.lastIndexOf(target);
    if (idx >= 0) frames.length = idx + 1;
    else frames.push(target);
    go(target, { history: 'none', keepFrames: true, fromPop: true });
  }

  function installMigratedShims() {
    if (raw.installed) return;
    if (typeof Sheet === 'undefined' || typeof MoreSpace === 'undefined' || typeof TabBar === 'undefined') return;
    raw.installed = true;
    raw.sheetOpen = Sheet.open;
    raw.sheetClose = Sheet.close;
    raw.moreOpen = MoreSpace.open;
    raw.moreClose = MoreSpace.close;
    raw.moreOpenModule = MoreSpace._openModule;
    raw.tabSwitch = TabBar.switchTo;

    register('home', {
      gesture: 'none',
      el: function () { return document.getElementById('app'); },
      active: function () { return detect() === 'home'; },
      open: function () { return internal(raw.tabSwitch, TabBar, ['home']); },
      close: function () { return Promise.resolve(); }
    });
    register('profile', {
      gesture: 'back',
      el: function () { return document.getElementById('panelProfile'); },
      active: function () { return typeof TabBar !== 'undefined' && TabBar.activeTab === 'profile'; },
      open: function () { return internal(raw.tabSwitch, TabBar, ['profile']); },
      close: function () {
        var el = document.getElementById('panelProfile');
        return waitForEnd(el, function () { internal(raw.tabSwitch, TabBar, ['home']); });
      },
      forceClose: function () { internal(raw.tabSwitch, TabBar, ['home']); }
    });
    ['path', 'reflect'].forEach(function (tabId) {
      register(tabId, {
        gesture: 'back',
        el: function () { return document.getElementById('panel' + tabId.charAt(0).toUpperCase() + tabId.slice(1)); },
        active: function () { return typeof TabBar !== 'undefined' && TabBar.activeTab === tabId; },
        open: function () { return internal(raw.tabSwitch, TabBar, [tabId]); },
        close: function () {
          var el = document.getElementById('panel' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
          return waitForEnd(el, function () { internal(raw.tabSwitch, TabBar, ['home']); });
        },
        forceClose: function () { internal(raw.tabSwitch, TabBar, ['home']); }
      });
    });
    register('modules', {
      gesture: 'sheet',
      el: function () { var w = document.getElementById('moreSpace'); return w && w.querySelector('.more-space__sheet'); },
      active: function () { var w = document.getElementById('moreSpace'); return !!(w && w.classList.contains('open')); },
      open: function (opts) { return internal(raw.moreOpen, MoreSpace, [opts || { mode: 'switcher' }]); },
      close: function () {
        return Promise.resolve(internal(raw.moreClose, MoreSpace));
      },
      forceClose: function () { internal(raw.moreClose, MoreSpace, [true]); }
    });

    Sheet.open = function (key) {
      if (internalDepth || !routingEnabled()) return raw.sheetOpen.apply(Sheet, arguments);
      return go(moduleSlug(key));
    };
    Sheet.close = function () {
      if (internalDepth || !routingEnabled()) return raw.sheetClose.apply(Sheet, arguments);
      return back();
    };
    MoreSpace.open = function (opts) {
      if (internalDepth || !routingEnabled()) return raw.moreOpen.apply(MoreSpace, arguments);
      return go('modules', opts || { mode: 'switcher' });
    };
    MoreSpace.close = function (instant) {
      if (internalDepth || !routingEnabled() || instant === true) return raw.moreClose.apply(MoreSpace, arguments);
      return back();
    };
    MoreSpace._openModule = function (key) {
      if (!routingEnabled()) return raw.moreOpenModule.apply(MoreSpace, arguments);
      if (key === 'clarity' || key === 'action') return go(key);
      return go(moduleSlug(key));
    };
    TabBar.switchTo = function (tabId) {
      if (internalDepth || !routingEnabled()) return raw.tabSwitch.apply(TabBar, arguments);
      if (tabId === 'profile' || tabId === 'path' || tabId === 'reflect') return go(tabId);
      if (tabId === 'home' && current() !== 'home') return go('home', { history: 'replace' });
      return raw.tabSwitch.apply(TabBar, arguments);
    };
  }

  function init() {
    installMigratedShims();
    if (!ready) window.addEventListener('popstate', onPopState);
    ready = true;
    seed();
  }

  window.Doors = {
    register: register,
    go: go,
    back: back,
    current: current,
    sync: sync,
    init: init,
    enabled: routingEnabled,
    moduleSlug: moduleSlug,
    slugToKey: slugToKey,
    internal: internal,
    _isInternal: function () { return internalDepth > 0; },
    waitForEnd: waitForEnd,
    _registry: registry,
    _frames: function () { return frames.slice(); },
    _active: activeSlugs,
    _raw: raw
  };

  init();
})();
