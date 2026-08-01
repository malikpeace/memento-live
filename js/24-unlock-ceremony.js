/* The unlock ceremony: what plays the instant a payment verifies.
   The ceremony itself is unlock.html, a standalone page that IS the picked
   mockup (mockups/unlock.html) with the lab chrome stripped: same stylesheet,
   same markup, same hold-driven driver, byte for byte. It runs inside a
   full-screen iframe so none of the app's own CSS can reach it; the earlier
   in-page port had the app's card stylesheet squeezing the card skinny and
   letterboxing the whiteout, which is exactly the class of bug an iframe
   makes impossible. The page reports its CTA tap back via postMessage and
   this file routes: Clarity done goes straight into Action, a pre-Clarity
   buyer lands home to find their star. Plays once per account; the seen flag
   persists only on the CTA tap, so a relaunch mid-ceremony replays it. */
(function () {
  'use strict';

  var openNow = false;

  function show(opts) {
    opts = opts || {};
    if (openNow) return;
    openNow = true;

    var name = '';
    try { name = (state.profile && (state.profile.name || state.profile.firstName)) || ''; } catch (e) {}

    var v = '';
    try { v = typeof MEMENTO_VERSION !== 'undefined' ? MEMENTO_VERSION : ''; } catch (e) {}

    var overlay = document.createElement('div');
    overlay.className = 'unlockcer';
    var iframe = document.createElement('iframe');
    iframe.className = 'unlockcer__page';
    iframe.setAttribute('title', 'Welcome to Memento');
    iframe.src = 'unlock.html?embed=1'
      + '&mode=' + (opts.clarityDone ? 'post' : 'pre')
      + '&name=' + encodeURIComponent(name)
      + (v ? '&v=' + encodeURIComponent(v) : '');
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // If the ceremony page never reports in, it did not render: tear the
    // overlay down and route onward rather than leaving a black wall over a
    // working app (the iPad incident, 2026-08-01). The seen flag stays unset
    // so a healthy launch can still play it.
    var ready = false;
    var failsafe = setTimeout(function () {
      if (ready) return;
      try { console.warn('UnlockCeremony: page never reported ready; skipping the ceremony.'); } catch (e) {}
      window.removeEventListener('message', onMsg);
      overlay.remove();
      openNow = false;
      try {
        if (opts.clarityDone && typeof ActionExperience !== 'undefined') ActionExperience.open();
        else if (typeof renderAll === 'function') renderAll();
      } catch (e) {}
    }, 7000);

    function onMsg(ev) {
      if (!ev || !ev.data || ev.source !== iframe.contentWindow) return;
      if (ev.data.memento === 'unlock-ready') { ready = true; clearTimeout(failsafe); return; }
      if (ev.data.memento !== 'unlock-cta') return;
      clearTimeout(failsafe);
      window.removeEventListener('message', onMsg);
      try {
        if (!opts.dev) {
          state.meta = state.meta || {};
          state.meta.unlockCeremonySeen = true;
          if (typeof persistNow === 'function') persistNow();
        }
      } catch (e) {}
      overlay.classList.add('unlockcer--out');
      setTimeout(function () {
        overlay.remove();
        openNow = false;
        try {
          if (opts.clarityDone && typeof ActionExperience !== 'undefined') ActionExperience.open();
          else if (!opts.clarityDone && typeof renderAll === 'function') renderAll();
        } catch (e) {}
      }, 520);
    }
    window.addEventListener('message', onMsg);
  }

  window.UnlockCeremony = {
    show: show,
    isOpen: function () { return openNow; }
  };

  // dev replay, URL-gated like every dev tool: inert on a plain URL.
  try {
    if (new URLSearchParams(location.search).get('dev') === 'unlock') {
      var tries = 0;
      (function waitBoot() {
        if (typeof state !== 'undefined' && document.body) { show({ clarityDone: true, dev: true }); return; }
        if (tries++ < 100) setTimeout(waitBoot, 200);
      })();
    }
  } catch (e) {}
})();
