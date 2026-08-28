/* Developer tools are large and irrelevant to a customer launch. Keep the
   normal boot lean while preserving every existing dev entry point:
   ?dev=beats, ?dev=action, ?plab=a|b|off, and the owner's Stress run button.
   Classic scripts are injected (rather than imported as modules) so they keep
   the same global scope contract as the rest of Memento. */
(function () {
  'use strict';

  var started = false;

  function authorized() {
    try {
      return !!(window.CreatorTools
        && typeof CreatorTools._devCondition === 'function'
        && CreatorTools._devCondition());
    } catch (e) { return false; }
  }

  function start() {
    if (started || !authorized()) return;
    started = true;
    window.__MEMENTO_DEV_AUTHORIZED__ = true;

    var pending = Object.create(null);
    var sources = {
      beats: 'js/19-dev-beats.js?v=v1020',
      promptLab: 'js/22-prompt-lab.js?v=v1020',
      stress: 'js/31-stress-runner.js?v=v1221'
    };

    function load(name) {
      if (pending[name]) return pending[name];
      pending[name] = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = sources[name];
        script.async = true;
        script.onload = function () { resolve(); };
        script.onerror = function () {
          delete pending[name];
          reject(new Error('dev-tool-load-failed:' + name));
        };
        document.head.appendChild(script);
      });
      return pending[name];
    }

    function query(name) {
      try { return new URLSearchParams(location.search).get(name); }
      catch (e) { return null; }
    }

    if (query('dev') === 'beats') load('beats').catch(function () {});

    var promptArm = query('plab');
    try { promptArm = promptArm || sessionStorage.getItem('plab'); } catch (e) {}
    if (promptArm === 'a' || promptArm === 'b' || promptArm === 'off') {
      load('promptLab').catch(function () {});
    }

    // The creator panel checks for window.StressRun before calling open(). A
    // lightweight compatible facade lets that exact click keep working; the
    // real object replaces this facade as soon as its script loads.
    function stressCall(method, args) {
      return load('stress').then(function () {
        var api = window.StressRun;
        if (!api || api === stressFacade || typeof api[method] !== 'function') {
          throw new Error('stress-runner-unavailable:' + method);
        }
        return api[method].apply(api, args || []);
      });
    }
    var stressFacade = {
      open: function () { return stressCall('open', arguments); },
      start: function () { return stressCall('start', arguments); },
      resume: function () { return stressCall('resume', arguments); },
      abort: function () { return stressCall('abort', arguments); },
      reset: function () { return stressCall('reset', arguments); },
      state: function () { return null; },
      summary: function () { return []; },
      personas: [],
      isRunning: function () { return false; }
    };
    window.StressRun = stressFacade;

    window.MementoDevTools = {
      load: load
    };
  }

  // CloudSync restores the signed-in session asynchronously. Use the same
  // bounded probes as the creator bar instead of trusting a discoverable URL
  // parameter. Normal customers never receive any dev globals or scripts.
  [0, 250, 1200, 3000, 7000, 12000].forEach(function (delay) {
    setTimeout(start, delay);
  });
})();
