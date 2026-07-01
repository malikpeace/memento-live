/* DEV-ONLY live preview for the post-first-win chapter pages.
   Visit the app with ?dev=beats to live-edit the onboarding answers from a panel
   and watch the summary / problem / solution / philosophy / fuel / close pages
   re-render instantly (real beams, fonts, copy logic). Fully gated: with no
   ?dev=beats this returns immediately and ships completely inert. Not linked from
   anywhere in the product, so a real user never reaches it. */
(function () {
  function qp(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  if (qp('dev') !== 'beats') return;

  var DEFAULTS = {
    name: 'Malik',
    birthday: '2000-01-01',
    runningToward: 'Self mastery · A skill or craft',
    clarityLevel: 'I have a rough idea',
    actionKnow: "Sort of, not sure it's right",
    actionProgress: "Haven't really started",
    runningFrom: 'I procrastinate and put it off',
    costOfInaction: 'Running out of time',
    momentumWin: 'Closer to my goals (eg. money, abs, relationships, etc)'
  };
  // runningToward presets up top (typing the · separator on a phone is painful).
  var TOWARD_PRESETS = [
    'Self mastery',
    'Self mastery · A skill or craft',
    'Mindset & Mental · A skill or craft · Self mastery · Work & money'
  ];

  function ready() {
    return typeof WelcomeIntro !== 'undefined' && WelcomeIntro._showSolution &&
      WelcomeIntro.identitySteps && typeof state !== 'undefined' && state;
  }
  function optionsFor(key) {
    try {
      var step = WelcomeIntro.identitySteps.filter(function (s) { return s.key === key; })[0];
      return (step && Array.isArray(step.options)) ? step.options.slice() : [];
    } catch (e) { return []; }
  }
  function currentBeat() {
    var el = document.querySelector('.welcome-intro__page-inner[data-beat]');
    var b = el ? parseInt(el.getAttribute('data-beat'), 10) : 0;
    return isNaN(b) ? 0 : b;
  }
  function hideClutter() {
    var sp = document.querySelector('.splash'); if (sp) { sp.classList.add('dismissed'); sp.style.display = 'none'; }
    document.querySelectorAll('.sheet, .sheet-overlay').forEach(function (el) { try { el.style.display = 'none'; } catch (e) {} });
  }
  function render(beat) {
    try {
      // Reset the one-shot flags so the pillar reveal (and beam fade) play EVERY time you
      // jump to a beat, instead of only the first time (that is what makes this a replay tool).
      try { WelcomeIntro._phiSeen = false; } catch (e) {}
      try { var _r = document.getElementById('welcomeRays'); if (_r) _r.remove(); } catch (e) {}
      WelcomeIntro._showSolution(0, beat);
      var wi = document.querySelector('.welcome-intro');
      // Use the welcome-intro's natural z-index (210) so the dev preview layers exactly like
      // production. Forcing a huge z-index (9000) buried the appearance picker (z 340) that
      // opens on Enter Memento, making the finish look broken in the dev tool only.
      if (wi) { wi.style.display = 'flex'; wi.style.zIndex = ''; wi.classList.remove('hidden'); }
      hideClutter();
    } catch (e) {}
  }
  function persistSafe() { try { if (typeof persistNow === 'function') persistNow(); } catch (e) {} }

  function injectCss() {
    var s = document.createElement('style');
    s.textContent =
      '#devBeats{position:fixed;top:0;left:0;right:0;z-index:9500;background:rgba(8,7,13,0.95);' +
      'color:#e8eaf8;font:12px/1.3 -apple-system,system-ui,sans-serif;max-height:58vh;overflow:auto;' +
      'box-shadow:0 10px 34px rgba(0,0,0,0.55);padding:max(8px,env(safe-area-inset-top)) 10px 10px;}' +
      '#devBeats .db-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}' +
      '#devBeats .db-head b{font-size:12px;letter-spacing:0.04em;color:#bcb3f0;}' +
      '#devBeats .db-toggle{background:#2a2740;color:#fff;border:0;border-radius:7px;padding:5px 12px;font-size:12px;}' +
      '#devBeats .db-nav{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;}' +
      '#devBeats .db-nav button{background:#1a1830;color:#cfc8f5;border:0;border-radius:7px;padding:6px 8px;font-size:11px;}' +
      '#devBeats .db-nav button.on{background:#5b4ad8;color:#fff;}' +
      '#devBeats .db-nav button.db-replay{background:#1f7a4d;color:#fff;font-weight:600;}' +
      '#devBeats .db-row{display:flex;align-items:center;gap:8px;margin:5px 0;}' +
      '#devBeats .db-row span{flex:0 0 92px;color:#9a93c8;font-size:11px;}' +
      '#devBeats .db-row select,#devBeats .db-row input{flex:1;min-width:0;background:#15131f;color:#fff;' +
      'border:0;border-radius:7px;padding:6px 8px;font-size:12px;}' +
      '#devBeats .db-row--multi{align-items:flex-start;}' +
      '#devBeats .db-chips{flex:1;display:flex;flex-wrap:wrap;gap:5px;min-width:0;}' +
      '#devBeats .db-chip{background:#15131f;color:#cfc8f5;border:0;border-radius:999px;padding:5px 10px;font-size:11px;}' +
      '#devBeats .db-chip.on{background:#5b4ad8;color:#fff;}';
    document.head.appendChild(s);
  }

  function buildPanel(P) {
    var panel = document.createElement('div');
    panel.id = 'devBeats';

    var head = document.createElement('div'); head.className = 'db-head';
    var title = document.createElement('b'); title.textContent = 'DEV · chapter preview';
    var toggle = document.createElement('button'); toggle.className = 'db-toggle'; toggle.textContent = 'hide';
    head.appendChild(title); head.appendChild(toggle);

    var nav = document.createElement('div'); nav.className = 'db-nav';
    // Match the live beat order in _solBeats: recap -> enter -> help -> preview.
    var labels = ['recap', 'enter', 'help', 'preview'];
    var navBtns = [];
    labels.forEach(function (label, i) {
      var btn = document.createElement('button'); btn.textContent = (i + 1) + ' ' + label;
      btn.addEventListener('click', function () { render(i); markNav(i); });
      nav.appendChild(btn); navBtns.push(btn);
    });
    // Replay: re-run the CURRENT beat's animation (pillar reveal, beam fade, etc.) from the top.
    var replayBtn = document.createElement('button'); replayBtn.textContent = '↻ replay'; replayBtn.className = 'db-replay';
    replayBtn.addEventListener('click', function () { render(currentBeat()); });
    nav.appendChild(replayBtn);
    function markNav(i) { navBtns.forEach(function (b, j) { b.className = (j === i) ? 'on' : ''; }); }

    var body = document.createElement('div'); body.className = 'db-body';

    function stepFor(key) { try { return WelcomeIntro.identitySteps.filter(function (s) { return s.key === key; })[0]; } catch (e) { return null; } }
    function isMulti(key) { var st = stepFor(key); return !!(st && st.multi); }
    // Mirror the real flow: a question is only offered if its own skipIf says it
    // would actually be asked for the current profile. So you can never build an
    // impossible persona (e.g. 'completely lost' AND a goal), the goal control just
    // disappears, exactly like the real onboarding skips that question.
    function isAsked(key) { var st = stepFor(key); if (!st) return true; if (typeof st.skipIf === 'function') { try { return !st.skipIf(P); } catch (e) { return true; } } return true; }

    // Gated onboarding questions, in flow order (upstream gating keys first).
    var GATED = ['clarityLevel', 'clarityBlock', 'clarityHistory', 'runningToward', 'actionKnow', 'actionProgress', 'runningFrom', 'costOfInaction', 'momentumWin'];

    function addRow(key, kind) {
      var row = document.createElement('label'); row.className = 'db-row';
      var nm = document.createElement('span'); nm.textContent = key; row.appendChild(nm);
      var input;
      if (kind === 'text' || kind === 'date') {
        input = document.createElement('input'); input.type = (kind === 'date') ? 'date' : 'text';
        input.value = P[key] || DEFAULTS[key] || '';
      } else {
        input = document.createElement('select');
        var opts = optionsFor(key);
        opts.forEach(function (o) { var op = document.createElement('option'); op.value = o; op.textContent = o; input.appendChild(op); });
        var cur = P[key] || '';
        if (cur && opts.indexOf(cur) === -1) { var op = document.createElement('option'); op.value = cur; op.textContent = cur + ' (current)'; input.appendChild(op); }
        input.value = cur || (opts[0] || '');
      }
      function apply() { P[key] = input.value; persistSafe(); refresh(); }
      input.addEventListener('change', apply); input.addEventListener('input', apply);
      row.appendChild(input); body.appendChild(row);
    }

    // A multi-select toggle-chip row (questions that allow more than one answer,
    // stored ' · '-joined exactly like the real flow).
    function addMultiRow(key) {
      var row = document.createElement('div'); row.className = 'db-row db-row--multi';
      var nm = document.createElement('span'); nm.textContent = key; row.appendChild(nm);
      var chips = document.createElement('div'); chips.className = 'db-chips';
      var sel = String(P[key] || '').split(' · ').map(function (s) { return s.trim(); }).filter(Boolean);
      optionsFor(key).forEach(function (o) {
        var chip = document.createElement('button'); chip.type = 'button'; chip.textContent = o;
        chip.className = 'db-chip' + (sel.indexOf(o) !== -1 ? ' on' : '');
        chip.addEventListener('click', function () {
          var i = sel.indexOf(o); if (i === -1) sel.push(o); else sel.splice(i, 1);
          chip.className = 'db-chip' + (sel.indexOf(o) !== -1 ? ' on' : '');
          P[key] = sel.join(' · '); persistSafe(); refresh();
        });
        chips.appendChild(chip);
      });
      row.appendChild(chips); body.appendChild(row);
    }

    function buildRows() {
      body.innerHTML = '';
      addRow('name', 'text');
      addRow('birthday', 'date');
      GATED.forEach(function (key) { if (!isAsked(key)) return; if (isMulti(key)) addMultiRow(key); else addRow(key, 'select'); });
    }
    function askedSig() { return GATED.filter(isAsked).join('|'); }
    var lastSig = null;
    // On any change: drop answers to questions the profile would no longer reach,
    // rebuild the control list only when the asked set changed, re-render the chapter.
    function refresh() {
      GATED.forEach(function (key) { if (!isAsked(key)) P[key] = ''; });
      var sig = askedSig();
      if (sig !== lastSig) { lastSig = sig; buildRows(); }
      render(currentBeat());
    }
    GATED.forEach(function (key) { if (!isAsked(key)) P[key] = ''; });
    lastSig = askedSig();
    buildRows();

    var collapsed = false;
    toggle.addEventListener('click', function () {
      collapsed = !collapsed;
      body.style.display = collapsed ? 'none' : '';
      nav.style.display = collapsed ? 'none' : '';
      toggle.textContent = collapsed ? 'show' : 'hide';
    });

    panel.appendChild(head); panel.appendChild(nav); panel.appendChild(body);
    document.body.appendChild(panel);
    markNav(0);
  }

  function start() {
    if (!ready()) { setTimeout(start, 150); return; }
    state.profile = state.profile || {};
    var P = state.profile;
    Object.keys(DEFAULTS).forEach(function (k) { if (P[k] == null || P[k] === '') P[k] = DEFAULTS[k]; });
    try { WelcomeIntro.init && WelcomeIntro.init(); } catch (e) {}
    try { WelcomeIntro.open && WelcomeIntro.open(); } catch (e) {}
    injectCss();
    buildPanel(P);
    setTimeout(function () { render(0); }, 480);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(start, 350);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 350); });
})();
