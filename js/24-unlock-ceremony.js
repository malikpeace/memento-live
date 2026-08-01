/* THE UNLOCK CEREMONY (v1026): what plays the instant a payment clears.
   Driver ported VERBATIM from mockups/unlock.html (Malik's pick): the card
   arrives dormant, press-and-hold drives the ignition frame by frame, let go
   early and it drains back; a 10s failsafe plays it for anyone who never
   holds. Ends on the welcome, Malik's note, and "Find today's move" into
   Action. Dev replay: ?dev=unlock. The seen-flag persists only when the CTA
   is tapped (resume-never-ahead: a relaunch mid-ceremony replays it). */
(function () {
  'use strict';
  var MARKUP = "<div class=\"cer\" id=\"cer\">\n        <span class=\"cer__glow\" aria-hidden=\"true\"></span>\n        <span class=\"cer__floor\" aria-hidden=\"true\"></span>\n        <span class=\"cer__flare\" aria-hidden=\"true\"></span>\n        <span class=\"cer__impact\" aria-hidden=\"true\"></span>\n        <span class=\"cer__wm\" id=\"wm\" aria-hidden=\"true\"><span>\n          <svg viewBox=\"0 0 512 512\"><path d=\"M150 146 L256 252 L362 146 L362 366 L150 366 Z\"></path></svg>\n        </span></span>\n\n        <div class=\"cer__stage\" id=\"stage\">\n          <div class=\"cer__float\">\n            <!-- the real card markup, lifted verbatim from the running app -->\n            <!-- A day-one payer: Clarity done (cyan), nothing else earned yet. -->\n            <div class=\"daycard-wrap daycard-theme-living daycard-reveal daycard--bright\" id=\"card\"\n                 style=\"--clar:1.000; --act:0.000; --cons:0.000; --mix:0.000; --lit:0.000;\">\n              <span class=\"daycard-wrap__aura\" aria-hidden=\"true\"></span>\n              <div class=\"daycard-living-stage\">\n                <span class=\"cer__edge\" aria-hidden=\"true\"></span>\n                <!-- the prismatic ring: a conic gradient cut to a hairline that\n                     follows the card's radius, plus a blurred twin for its bloom -->\n                <span class=\"cer__ring\" aria-hidden=\"true\"></span>\n                <span class=\"cer__ring cer__ring--glow\" aria-hidden=\"true\"></span>\n                <span class=\"cer__spark\" aria-hidden=\"true\"></span>\n                <span class=\"cer__pulse\" aria-hidden=\"true\"></span>\n                <span class=\"daycard-bloom\" aria-hidden=\"true\">\n                  <i class=\"blob b1\" style=\"transform:translate(7.62%,8%) scale(1.342)\"></i>\n                  <i class=\"blob b2\" style=\"transform:translate(-21.48%,15.95%) scale(1.449)\"></i>\n                  <i class=\"blob b3\" style=\"transform:translate(8.31%,-6.35%) scale(1.5)\"></i>\n                  <i class=\"blob b4\" style=\"transform:translate(42.68%,-59.06%) scale(.966)\"></i>\n                  <i class=\"blob b5\" style=\"transform:translate(-16.79%,-51.67%) scale(1.454)\"></i>\n                  <i class=\"blob b6\" style=\"\"></i>\n                </span>\n                <!-- the app's own mirrored ground reflection, same blobs, plus\n                     the rim so the earned edge shows in the reflection too.\n                     The wrapper only carries the perspective fan. -->\n                <span class=\"cer__mirror\" aria-hidden=\"true\">\n                <span class=\"daycard-floor\" aria-hidden=\"true\">\n                  <i class=\"blob b1\" style=\"transform:translate(7.62%,8%) scale(1.342)\"></i>\n                  <i class=\"blob b2\" style=\"transform:translate(-21.48%,15.95%) scale(1.449)\"></i>\n                  <i class=\"blob b3\" style=\"transform:translate(8.31%,-6.35%) scale(1.5)\"></i>\n                  <i class=\"blob b4\" style=\"transform:translate(42.68%,-59.06%) scale(.966)\"></i>\n                  <i class=\"blob b5\" style=\"transform:translate(-16.79%,-51.67%) scale(1.454)\"></i>\n                  <i class=\"blob b6\"></i>\n                  <span class=\"daycard-ns__rim\" aria-hidden=\"true\"></span>\n                  <!-- the blade again, so the floor throws it back. The floor is\n                       already flipped and blurred, so this inherits both. -->\n                  <span class=\"cer__caustic cer__caustic--glow cer__caustic--rfl\" aria-hidden=\"true\"></span>\n                  <span class=\"cer__caustic cer__caustic--rfl\" aria-hidden=\"true\"></span>\n                </span>\n                </span>\n                <div class=\"daycard-ns\" id=\"dayCardNs\">\n                  <span class=\"daycard-ns__liquid\" aria-hidden=\"true\">\n                    <i class=\"blob b1\" style=\"transform:translate(-15.04%,35.37%) scale(.702)\"></i>\n                    <i class=\"blob b2\" style=\"transform:translate(-21.87%,31.55%) scale(1.07)\"></i>\n                    <i class=\"blob b3\" style=\"transform:translate(46.1%,-54.39%) scale(.938)\"></i>\n                    <i class=\"blob b4\" style=\"transform:translate(-4.37%,41.56%) scale(1.252)\"></i>\n                    <i class=\"blob b5\" style=\"transform:translate(38.8%,50.27%) scale(1.293)\"></i>\n                    <i class=\"blob b6\" style=\"\"></i>\n                  </span>\n                  <span class=\"daycard-ns__iri\" aria-hidden=\"true\"></span>\n                  <span class=\"daycard-ns__sheen\" aria-hidden=\"true\"></span>\n                  <span class=\"daycard-ns__burn\" aria-hidden=\"true\"></span>\n                  <span class=\"daycard-ns__plat\" aria-hidden=\"true\"></span>\n                  <span class=\"daycard-ns__tint\" aria-hidden=\"true\"></span>\n                  <span class=\"daycard-ns__rim\" aria-hidden=\"true\"></span>\n                  <span class=\"cer__sweep\" aria-hidden=\"true\"></span>\n                  <!-- the face treatments live here, under the mark -->\n                  <span class=\"cer__face\" aria-hidden=\"true\"></span>\n                  <!-- the card breathing: three soft lights drifting inside it -->\n                  <span class=\"cer__life\" aria-hidden=\"true\"><i></i><i></i><i></i></span>\n                  <!-- the caustic: a bent blade of light with a dispersed edge -->\n                  <span class=\"cer__caustic cer__caustic--glow\" aria-hidden=\"true\"></span>\n                  <span class=\"cer__caustic\" aria-hidden=\"true\"></span>\n                  <div class=\"daycard-ns__body\">\n                    <svg class=\"daycard-ns__emblem\" viewBox=\"0 0 512 512\" aria-hidden=\"true\">\n                      <path d=\"M150 146 L256 252 L362 146 L362 366 L150 366 Z\"></path>\n                    </svg>\n                  </div>\n                  <div class=\"daycard-ns__foot\"><span class=\"daycard-ns__name\" id=\"ucName\"></span></div>\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <p class=\"cer__hint\" id=\"hint\">Press and hold</p>\n        <p class=\"cer__welcome\">Welcome to Memento.</p>\n        <div class=\"cer__copy\">\n          <p class=\"cer__note\">Thank you for buying Memento. My number one goal is that you get the most out of your existence, and that this serves you well for years to come.</p>\n          <p class=\"cer__sign\">Malik</p>\n          <button class=\"cer__cta\" type=\"button\">Find today's move</button>\n        </div>\n      </div>";
  var openNow = false;

  function buildMarkup(name) {
    return MARKUP.replace('id="ucName"></span>', 'id="ucName">' + escName(name) + '</span>');
  }
  function escName(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function show(opts) {
    opts = opts || {};
    if (openNow) return;
    openNow = true;
    var overlay = document.createElement('div');
    overlay.className = 'unlockcer';
    var frame = document.createElement('div');
    frame.className = 'unlockcer__frame';
    var name = '';
    try { name = (state.profile && (state.profile.name || state.profile.firstName)) || ''; } catch (e) {}
    frame.innerHTML = buildMarkup(name);
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    var root = overlay;

    // desktop fit: the whole 390x844 scene scales as one unit; never up, only
    // down, and only when the window is shorter/narrower than the scene.
    function fit() {
      if (window.innerWidth <= 700) { overlay.style.removeProperty('--ucfit'); return; }
      var s = Math.min(1, window.innerHeight / 844, window.innerWidth / 390);
      overlay.style.setProperty('--ucfit', s.toFixed(3));
    }
    fit();
    window.addEventListener('resize', fit);

    
      var cer  = root.querySelector('#cer');
      var card = root.querySelector('#card');
      var hint = root.querySelector('#hint');
      var wm    = root.querySelector('#wm');
      var stage = root.querySelector('#stage');
    
      var HOLD_MS    = 2600;   // the star's ignition hold is 2500, this matches its weight
      var RELEASE_MS = 760;    // draining back is slower than filling, so letting go stings
      var AUTO_MS    = 2300;   // the failsafe pulls it up itself, a shade faster than a real hold
      var ASK_AT     = 2600;
      var AUTO_AT    = 10000;
    
      var p = 0, holding = false, auto = false, done = false;
      var raf = null, last = 0, timers = [];
    
      // What the card actually is when the payment clears. Everything a payer has
      // not earned yet stays at 0, so the dormant card is never a flattering lie.
      var START = {
        post: { clar: 1, cons: 0, mix: 0 },   // finished Clarity: their cyan, asleep
        pre:  { clar: 0, cons: 0, mix: 0 }    // paid first: blank glass
      };
      var startMode = 'post', look = 'platinum', face = 'plain';
    
      function clear(){ timers.forEach(clearTimeout); timers = []; }
      function at(ms, fn){ timers.push(setTimeout(fn, ms)); }
      function num(v){ return v.toFixed(3); }
    
      // the press reads as pressure: it sinks a little the instant they touch it,
      // then grows past its resting size as the charge builds
      function scaleAt(x){
        if (x < 0.12) return 1 - 0.014 * Math.sin(x / 0.12 * Math.PI);
        return 1 + 0.055 * Math.pow((x - 0.12) / 0.88, 1.25);
      }
    
      // The hold deliberately stops short of full power. The last of it arrives on
      // release, so completing the hold is a break, not just the end of a ramp.
      var HOLD_CAP = 0.84;
    
      // Only --act, --lit and --emit move, and all three land on layer OPACITY.
      // --sat and --glow are deliberately left alone: they are filter parameters
      // (saturate on three blurred layers, brightness on the aura), and ramping
      // them re-ran those blurs on every frame. That is what crashed the phone.
      function paint(actV, litV){
        card.style.setProperty('--act',  num(actV));
        card.style.setProperty('--lit',  num(litV));
        card.style.setProperty('--emit', num(0.30 + 0.28 * litV));
      }
    
      /* THE WHITEOUT. The last third of the hold stops being about the card and
         becomes about the room: the light they are pulling out of it overwhelms
         everything, the screen goes white, and the only thing left standing in it
         is their own mark. It is squared so it arrives late and hard rather than
         as an even wash, and it is driven straight off hold progress, so letting
         go drains the room back out exactly the way it filled. Like the colour, it
         deliberately stops short of full: the last of the white is the release. */
      var WHITE_FROM = 0.56, WHITE_CAP = 0.88;
      function white(x){
        var w = (x - WHITE_FROM) / (1 - WHITE_FROM);
        if (w <= 0) return 0;
        w = Math.min(1, w); w = w * w;
        cer.style.setProperty('--wht', num(w * WHITE_CAP));
        /* the mark comes up slightly ahead of the white, so it is already solid by
           the time there is nothing else on screen */
        cer.style.setProperty('--wmo', num(Math.min(1, w * 1.6)));
        return w;
      }
    
      function render(){
        var e = Math.pow(p, 1.3);           // colour back-loads, so the end erupts
        paint(e * HOLD_CAP, p * HOLD_CAP);
        cer.style.setProperty('--hp', num(p));
        cer.style.setProperty('--hf', num(p * p));
        cer.style.setProperty('--hs', scaleAt(p).toFixed(4));
        if (white(p) === 0) { cer.style.setProperty('--wht', '0'); cer.style.setProperty('--wmo', '0'); }
      }
    
      function loop(t){
        var dt = Math.min(64, t - last) / 1000; last = t;
        var rising = holding || auto;
        p += rising ? dt / ((auto ? AUTO_MS : HOLD_MS) / 1000) : -dt / (RELEASE_MS / 1000);
        if (p >= 1) { p = 1; render(); complete(); return; }
        if (p <= 0) { p = 0; render(); raf = null; return; }
        render();
        raf = requestAnimationFrame(loop);
      }
      function run(){ if (raf) return; last = performance.now(); raf = requestAnimationFrame(loop); }
    
      function begin(e){
        if (done || auto) return;
        e.preventDefault();
        clear();
        holding = true;
        cer.classList.remove('ask');
        run();
      }
      function cancel(){
        if (done || auto || !holding) return;
        holding = false;
        cer.classList.add('ask');
        run();
      }
    
      function complete(){
        done = true; holding = false; auto = false; raf = null;
        cer.classList.remove('ask');
        /* Hand the white over to the keyframes. The base values go to zero now, so
           when the animation ends there is nothing to snap back to; the 0% frame
           picks up at .88 where the hold left it. */
        cer.style.setProperty('--wht', '0');
        cer.style.setProperty('--wmo', '0');
        cer.classList.add('flare');
        cer.classList.add('lit');
        release();
        /* Nothing arrives at once. The card lands, then it raises, and only once it
           has settled does the copy come in, one line at a time. The welcome does
           not travel any more: it sits where it will end up and simply fades, which
           is what stopped it reading as a scale-up. */
        at(2000, function(){ cer.classList.add('sweep'); });   // crosses the face as it comes back out
        /* The whiteout runs 3300ms and the card is only properly legible through
           the last third of it, so the raise waits well past the end: the card is
           left standing alone, in silence, for over a second before anything moves. */
        at(4700, function(){ cer.classList.add('back');  });   // the raise, 1.3s
        at(6250, function(){ cer.classList.add('say');   });   // once it has landed
        at(7300, function(){ cer.classList.add('tell');  });   // the note
        at(8300, function(){ cer.classList.add('go');    });   // the button
      }
    
      // the break: what they were holding back lets go, overshoots, settles
      function release(){
        var t0 = performance.now(), DUR = 1000;
        var ss = function(x){ return x * x * (3 - 2 * x); };
        (function step(now){
          var q = Math.min(1, (now - t0) / DUR);
          var v = q < 0.4
            ? HOLD_CAP + (1.10 - HOLD_CAP) * ss(q / 0.4)
            : 1.10 - 0.10 * ss((q - 0.4) / 0.6);
          paint(v, Math.min(1, v));
          cer.style.setProperty('--hs', (1.055 + 0.03 * Math.sin(Math.min(1, q / 0.55) * Math.PI) - 0.055 * ss(q)).toFixed(4));
          if (q < 1) requestAnimationFrame(step);
        })(t0);
      }
    
      // the card as it stands the second before they touch it
      function applyStart(){
        var s = START[startMode];
        card.style.setProperty('--clar', s.clar.toFixed(3));
        card.style.setProperty('--cons', s.cons.toFixed(3));
        card.style.setProperty('--mix',  s.mix.toFixed(3));
      }
      /* Pin the whiteout's mark to the card's REAL emblem rather than trusting the
         hardcoded rect. If the card's own CSS ever moves its mark, this follows it,
         and the two can never end up a few pixels apart during the handoff. */
      function pinMark(){
        var em = card.querySelector('.daycard-ns__emblem'), svg = wm.querySelector('svg');
        if (!em || !svg) return;
        /* NEVER measure the svg itself. iOS includes a filter's extent in an SVG
           element's getBoundingClientRect, and the app's emblem carries three
           drop-shadows including a 22px bloom, so Safari returned very nearly the
           whole card: the mark got pinned at 320px wide at offset 0 instead of
           124px at 98,152, and the whiteout showed a mark two and a half times too
           big, floating high. Chromium returns the tight CSS box, which is why it
           measured clean in the preview and broke on the phone.
           So: the SIZE comes from computed style (layout, filters excluded) and the
           POSITION from the emblem's parent, a plain div with no filter on it. The
           emblem is the only child of a centring flex column, so its offset inside
           that div is exact rather than assumed. */
        var body = em.parentNode;
        var w = parseFloat(getComputedStyle(em).width), h = parseFloat(getComputedStyle(em).height);
        var cw = parseFloat(getComputedStyle(card).width), ch = parseFloat(getComputedStyle(card).height);
        var cr = card.getBoundingClientRect(), br = body.getBoundingClientRect();
        if (!w || !h || !cw || !cr.width || !br.width) return;
        var k = cw / cr.width;                        // undo whatever scale is live
        var x = (br.left - cr.left) * k + (br.width  * k - w) / 2;
        var y = (br.top  - cr.top)  * k + (br.height * k - h) / 2;
        /* and if any of that comes back outside the card, keep the stylesheet's
           values, which are the app's own numbers and always correct */
        /* The invariant the phone violated: the mark is a mark, never more than a
           fraction of the card. Anything bigger than that is a bad measurement, not
           a bigger emblem. */
        if (w > cw * 0.6 || h > ch * 0.6) return;
        if (!(x >= 0 && y >= 0 && x + w <= cw + 1 && y + h <= ch + 1)) return;
        svg.style.left   = x.toFixed(2) + 'px';
        svg.style.top    = y.toFixed(2) + 'px';
        svg.style.width  = w.toFixed(2) + 'px';
        svg.style.height = h.toFixed(2) + 'px';
      }
    
      var LITE = /[?&]lite=1/.test(location.search);
      function base(extra){
        return 'cer look-' + look + ' face-' + face + (LITE ? ' lite' : '') + (extra || '');
      }
    
      function reset(){
        clear();
        if (raf) cancelAnimationFrame(raf);
        raf = null; p = 0; holding = false; auto = false; done = false;
        cer.className = base();
        applyStart();
        render();
        pinMark();
        at(ASK_AT,  function(){ if (!done && !holding) cer.classList.add('ask'); });
        at(AUTO_AT, function(){ if (!done && !holding) { auto = true; cer.classList.remove('ask'); run(); } });
      }
    
      function autoPlay(){ reset(); clear(); auto = true; cer.classList.remove('ask'); run(); }
    
      // n: 0 dormant, .45 mid hold, .99 peak whiteout, 1 unlocked, 2 drawn back
      

    cer.addEventListener('pointerdown', begin);
    document.addEventListener('pointerup', cancel);
    document.addEventListener('pointercancel', cancel);

    // whose card: a Clarity finisher's colour is in it; a pre-Clarity buyer's
    // card is truly blank. Values are the mockup's own START modes.
    startMode = opts.clarityDone ? 'post' : 'pre';
    cer.classList.add('look-platinum', 'face-plain');
    applyStart();
    reset();

    var cta = root.querySelector('.cer__cta');
    if (cta) {
      if (!opts.clarityDone) cta.textContent = 'Find your Neutron Star';
      cta.addEventListener('click', function () {
        try {
          if (!opts.dev) {
            state.meta = state.meta || {};
            state.meta.unlockCeremonySeen = true;
            if (typeof persistNow === 'function') persistNow();
          }
        } catch (e) {}
        overlay.classList.add('unlockcer--out');
        setTimeout(function () {
          try { clear(); } catch (e) {}
          window.removeEventListener('resize', fit);
          document.removeEventListener('pointerup', cancel);
          document.removeEventListener('pointercancel', cancel);
          overlay.remove();
          openNow = false;
          try {
            if (opts.clarityDone && typeof ActionExperience !== 'undefined') ActionExperience.open();
            else if (!opts.clarityDone && typeof renderAll === 'function') renderAll();
          } catch (e) {}
        }, 520);
      });
    }
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
