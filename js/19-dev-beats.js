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
      WelcomeIntro._showSolution(0, beat);
      var wi = document.querySelector('.welcome-intro');
      if (wi) { wi.style.display = 'flex'; wi.style.zIndex = '9000'; wi.classList.remove('hidden'); }
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
      '#devBeats .db-row{display:flex;align-items:center;gap:8px;margin:5px 0;}' +
      '#devBeats .db-row span{flex:0 0 92px;color:#9a93c8;font-size:11px;}' +
      '#devBeats .db-row select,#devBeats .db-row input{flex:1;min-width:0;background:#15131f;color:#fff;' +
      'border:0;border-radius:7px;padding:6px 8px;font-size:12px;}';
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
    var labels = ['summary', 'problem', 'solution', 'philosophy', 'fuel', 'close'];
    var navBtns = [];
    labels.forEach(function (label, i) {
      var btn = document.createElement('button'); btn.textContent = (i + 1) + ' ' + label;
      btn.addEventListener('click', function () { render(i); markNav(i); });
      nav.appendChild(btn); navBtns.push(btn);
    });
    function markNav(i) { navBtns.forEach(function (b, j) { b.className = (j === i) ? 'on' : ''; }); }

    var body = document.createElement('div'); body.className = 'db-body';

    function addRow(key, kind) {
      var row = document.createElement('label'); row.className = 'db-row';
      var name = document.createElement('span'); name.textContent = key; row.appendChild(name);
      var input;
      if (kind === 'text' || kind === 'date') {
        input = document.createElement('input'); input.type = (kind === 'date') ? 'date' : 'text';
        input.value = P[key] || DEFAULTS[key] || '';
      } else {
        input = document.createElement('select');
        var opts = (kind === 'toward') ? TOWARD_PRESETS.concat(optionsFor('runningToward')) : optionsFor(key);
        opts.forEach(function (o) { var op = document.createElement('option'); op.value = o; op.textContent = o; input.appendChild(op); });
        var cur = P[key] || DEFAULTS[key];
        if (cur && opts.indexOf(cur) === -1) { var op = document.createElement('option'); op.value = cur; op.textContent = cur + ' (current)'; input.appendChild(op); }
        if (cur) input.value = cur;
      }
      function apply() { P[key] = input.value; persistSafe(); render(currentBeat()); }
      input.addEventListener('change', apply);
      input.addEventListener('input', apply);
      row.appendChild(input); body.appendChild(row);
    }

    addRow('name', 'text');
    addRow('birthday', 'date');
    addRow('runningToward', 'toward');
    addRow('clarityLevel', 'select');
    addRow('actionKnow', 'select');
    addRow('actionProgress', 'select');
    addRow('runningFrom', 'select');
    addRow('costOfInaction', 'select');
    addRow('momentumWin', 'select');

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
