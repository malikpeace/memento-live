/* ===========================================================================
   15-router.js

   Late adapters for root surfaces loaded after 16-doors.js. The controller
   owns ordering and browser history; each surface keeps its own renderer.
   =========================================================================== */
(function () {
  'use strict';

  var installed = false;
  var booted = false;

  function internal() {
    return !!(window.Doors && Doors._isInternal && Doors._isInternal());
  }

  function routeClose(slug, rawFn, ctx, args) {
    if (internal() || !window.Doors || !Doors.enabled() || Doors.current() !== slug) {
      return rawFn && rawFn.apply(ctx, args || []);
    }
    return Doors.back();
  }

  function waitUntil(test, capMs) {
    return new Promise(function (resolve) {
      var done = false;
      var cap = setTimeout(finish, capMs || 900);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(cap);
        resolve();
      }
      function check() {
        var stillOpen = false;
        try { stillOpen = !!test(); } catch (e) {}
        if (!stillOpen) { finish(); return; }
        requestAnimationFrame(check);
      }
      check();
    });
  }

  function registerLateRoots() {
    var raw = Doors._raw;

    if (typeof ClarityExperience !== 'undefined') {
      raw.clarityOpen = ClarityExperience.open;
      raw.clarityOpenSummary = ClarityExperience.openSummary;
      raw.clarityClose = ClarityExperience.close;
      Doors.register('clarity', {
        gesture: 'back',
        el: function () { return document.getElementById('clarityExp'); },
        active: function () { return !!ClarityExperience.isOpen; },
        open: function (opts) {
          if (opts && Object.prototype.hasOwnProperty.call(opts, 'summary')) {
            if (opts.summary && raw.clarityOpenSummary) {
              return Doors.internal(raw.clarityOpenSummary, ClarityExperience);
            }
            return Doors.internal(raw.clarityOpen, ClarityExperience);
          }
          if (state.clarity && state.clarity.completed && raw.clarityOpenSummary) {
            return Doors.internal(raw.clarityOpenSummary, ClarityExperience);
          }
          return Doors.internal(raw.clarityOpen, ClarityExperience);
        },
        close: function () { return Doors.internal(raw.clarityClose, ClarityExperience); },
        forceClose: function () { return Doors.internal(raw.clarityClose, ClarityExperience); }
      });

      ClarityExperience.open = function () {
        if (internal() || !Doors.enabled()) return raw.clarityOpen.apply(ClarityExperience, arguments);
        return Doors.go('clarity', { summary: false });
      };
      ClarityExperience.openSummary = function () {
        if (internal() || !Doors.enabled()) return raw.clarityOpenSummary.apply(ClarityExperience, arguments);
        return Doors.go('clarity', { summary: true });
      };
      ClarityExperience.close = function () {
        return routeClose('clarity', raw.clarityClose, ClarityExperience, arguments);
      };
    }

    if (typeof ActionFlow !== 'undefined') {
      raw.actionStart = ActionFlow.start;
      raw.actionClose = ActionFlow.close;
      if (typeof ActionExperience !== 'undefined') {
        raw.actionLegacyOpen = ActionExperience.open;
        raw.actionLegacyClose = ActionExperience.close;
      }
      Doors.register('action', {
        gesture: 'back',
        el: function () { return document.querySelector('.afl') || document.getElementById('actionExp'); },
        active: function () {
          return !!ActionFlow.isOpen ||
            (typeof ActionExperience !== 'undefined' && !!ActionExperience.isOpen);
        },
        open: function (opts) { return Doors.internal(raw.actionStart, ActionFlow, [opts || {}]); },
        close: function () {
          if (ActionFlow.isOpen) return Doors.internal(raw.actionClose, ActionFlow);
          if (raw.actionLegacyClose && typeof ActionExperience !== 'undefined') {
            return Doors.waitForEnd(document.getElementById('actionExp'), function () {
              Doors.internal(raw.actionLegacyClose, ActionExperience);
            });
          }
        },
        forceClose: function () {
          if (ActionFlow.isOpen) return Doors.internal(raw.actionClose, ActionFlow);
          if (raw.actionLegacyClose && typeof ActionExperience !== 'undefined') {
            return Doors.internal(raw.actionLegacyClose, ActionExperience);
          }
        }
      });

      ActionFlow.start = function (opts) {
        if (internal() || !Doors.enabled()) return raw.actionStart.apply(ActionFlow, arguments);
        return Doors.go('action', opts || {});
      };
      ActionFlow.close = function () {
        return routeClose('action', raw.actionClose, ActionFlow, arguments);
      };

      if (typeof ActionExperience !== 'undefined') {
        ActionExperience.open = function () {
          var devStates = false;
          try { devStates = /[?&]dev=action-states\b/.test(location.search); } catch (e) {}
          if (internal() || !Doors.enabled() || devStates || ActionFlow.legacyRedirect === false) {
            return raw.actionLegacyOpen.apply(ActionExperience, arguments);
          }
          return Doors.go('action');
        };
        ActionExperience.close = function () {
          return routeClose('action', raw.actionLegacyClose, ActionExperience, arguments);
        };
      }
    }

    if (typeof ClarityPaywall !== 'undefined') {
      raw.paywallShow = ClarityPaywall.show;
      raw.paywallHide = ClarityPaywall.hide;
      Doors.register('paywall', {
        gesture: 'none',
        el: function () { return document.getElementById('clarityPaywall'); },
        active: function () { return !!ClarityPaywall._open; },
        open: function (opts) { return Doors.internal(raw.paywallShow, ClarityPaywall, [opts || {}]); },
        close: function () {
          return Doors.waitForEnd(document.getElementById('clarityPaywall'), function () {
            Doors.internal(raw.paywallHide, ClarityPaywall);
          });
        },
        forceClose: function () { return Doors.internal(raw.paywallHide, ClarityPaywall); }
      });

      ClarityPaywall.show = function (opts) {
        if (internal() || !Doors.enabled()) return raw.paywallShow.apply(ClarityPaywall, arguments);
        return Doors.go('paywall', opts || {});
      };
      ClarityPaywall.hide = function () {
        return routeClose('paywall', raw.paywallHide, ClarityPaywall, arguments);
      };
    }

    if (typeof MementoView !== 'undefined') {
      raw.mementoOpen = MementoView.open;
      raw.mementoClose = MementoView.close;
      raw.mementoToggle = MementoView.toggle;
      Doors.register('memento-full', {
        gesture: 'back',
        el: function () { return document.getElementById('mementoFull'); },
        active: function () { return !!MementoView.isActive(); },
        open: function () { return Doors.internal(raw.mementoOpen, MementoView); },
        close: function () {
          Doors.internal(raw.mementoClose, MementoView);
          return waitUntil(function () { return MementoView.isActive(); }, 900);
        },
        forceClose: function () { return Doors.internal(raw.mementoClose, MementoView); }
      });

      MementoView.open = function () {
        if (internal() || !Doors.enabled()) return raw.mementoOpen.apply(MementoView, arguments);
        return Doors.go('memento-full');
      };
      MementoView.close = function () {
        return routeClose('memento-full', raw.mementoClose, MementoView, arguments);
      };
      MementoView.toggle = function () {
        if (internal() || !Doors.enabled()) return raw.mementoToggle.apply(MementoView, arguments);
        return Doors.current() === 'memento-full' ? Doors.back() : Doors.go('memento-full');
      };
    }

    raw.openMementoFull = window.openMementoFull;
    if (typeof raw.openMementoFull === 'function') {
      window.openMementoFull = function () {
        if (internal() || !Doors.enabled()) return raw.openMementoFull.apply(window, arguments);
        return Doors.go('memento-full');
      };
    }

    raw.exitToModules = window.exitToModules;
    if (typeof raw.exitToModules === 'function') {
      window.exitToModules = function () {
        if (!Doors.enabled()) return raw.exitToModules.apply(window, arguments);
        var now = Doors.current();
        if (!internal() && (now === 'clarity' || now === 'action' || now.indexOf('m/') === 0)) {
          return Doors.back();
        }
        return raw.exitToModules.apply(window, arguments);
      };
    }
  }

  function bootReconcile() {
    if (booted || !Doors.enabled()) return;
    booted = true;
    var hash = '';
    try { hash = decodeURIComponent((location.hash || '').replace(/^#/, '')); } catch (e) {}
    var now = Doors.current();
    if (hash && hash !== 'home' && hash !== now) {
      Doors.go(hash, { history: 'replace' }).catch(function () {
        Doors.go('home', { history: 'replace' });
      });
    } else {
      Doors.sync();
    }
  }

  function scheduleBoot() {
    var tries = 0;
    (function attempt() {
      if (booted) return;
      if (Doors.enabled()) { bootReconcile(); return; }
      if (tries++ < 40) setTimeout(attempt, 250);
    })();
  }

  function install() {
    if (installed || !window.Doors) return false;
    installed = true;
    registerLateRoots();
    window.Router = {
      init: install,
      enabled: Doors.enabled,
      go: Doors.go,
      back: Doors.back,
      sync: Doors.sync,
      _top: Doors.current,
      _state: { frames: Doors._frames }
    };
    setTimeout(scheduleBoot, 220);
    return true;
  }

  function tryInstall() {
    if (!install()) setTimeout(tryInstall, 60);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInstall);
  else tryInstall();
})();
