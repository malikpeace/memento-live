/* ============================================================
   35-perfect-week.js - THE PERFECT WEEK (lean v1, Malik greenlit
   2026-08-30 after the grill).

   The week is Memento's activation bridge: after the plan lands and
   they do move #1, seven named days with the move as the ONE thing
   that lights a day. Lean v1 = the frame only: setup (when + baseline
   + hold-to-start), the home week face, held days, the day close, and
   the day-7 milestone. AI conditions are v1.1 (identity layer, pool
   uniformly ~7/10 hard, never gating completion).

   THIS FILE (piece 1) ships the SETUP SCREEN + state. QA entry only
   (Cheat Code Bar / PerfectWeek.openSetup()); the live post-move
   wiring lands after Malik approves each piece on screenshots.

   state.perfectWeek when live:
   { startedAt, startDay:'YYYY-MM-DD', whenSlot:'morning'|'midday'|'evening',
     baselineDays: 0-7, days:{ 'YYYY-MM-DD': { move:true } },
     completedAt:null, endedAs:null, rerunOffered:false, v:1 }
   ============================================================ */

const PerfectWeek = (() => {
  let root = null;

  function data() { return (state && state.perfectWeek) || null; }

  function todayKey() {
    try { return (typeof getTodayISO === 'function') ? getTodayISO() : ''; } catch (e) { return ''; }
  }

  // Day 1..7 while a week is live; 0 before start; >7 after it ends.
  function dayNumber() {
    const d = data();
    if (!d || !d.startDay) return 0;
    try {
      const day = (iso) => Math.floor(new Date(iso + 'T00:00:00').getTime() / 86400000);
      return day(todayKey()) - day(d.startDay) + 1;
    } catch (e) { return 0; }
  }

  function active() {
    const d = data();
    if (!d || !d.startDay || d.completedAt) return false;
    const n = dayNumber();
    return n >= 1 && n <= 7;
  }

  function esc2(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function markSvg(sz) {
    return '<svg viewBox="140 136 232 240" width="' + sz + '" height="' + Math.round(sz * 240 / 232) + '" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z" fill="currentColor"/></svg>';
  }

  function close() {
    const el = root;
    if (!el) return;
    root = null;
    el.classList.remove('pwk--in');
    document.body.style.overflow = '';
    try { if (typeof FullscreenClose !== 'undefined' && FullscreenClose.hide) FullscreenClose.hide(); } catch (e) {}
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 340);
  }

  function startWeek(baselineDays, conditions) {
    try {
      const start = todayKey();
      const days = {};
      // Endowed progress: setup fires after move #1, so day 1 is usually
      // already earned. Light it from the real ledger, never assume.
      try {
        if (typeof actionCompletionForDay === 'function' && actionCompletionForDay(start)) days[start] = { move: true };
      } catch (e) {}
      state.perfectWeek = {
        startedAt: Date.now(),
        startDay: start,
        baselineDays: baselineDays,
        conditions: (conditions || []).map((c, i) => ({ id: 'c' + i, text: c.text, why: c.why || '' })),
        days: days,
        completedAt: null,
        endedAs: null,
        rerunOffered: false,
        v: 1
      };
      persistNow();
    } catch (e) {}
    close();
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  }



  // Piece 3: held days. Yesterday inside the week with no move = held.
  function heldYesterday() {
    if (!active() || dayNumber() < 2) return false;
    try {
      const d = new Date(todayKey() + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (key < data().startDay) return false;
      return !(typeof actionCompletionForDay === 'function' && actionCompletionForDay(key));
    } catch (e) { return false; }
  }

  // ---------- the Protocol FACE (v1341, its own box in the deck) ----------
  // Day squares derive LIVE from the completion ledger (no event hooks to
  // miss): green check = the move happened, white = today, dimmed solid =
  // held, quiet number = waiting.
  function dayStates() {
    const d = data();
    const n = dayNumber();
    const out = [];
    for (let i = 0; i < 7; i++) {
      let st = 'wait';
      try {
        const dt = new Date(d.startDay + 'T00:00:00');
        dt.setDate(dt.getDate() + i);
        const key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        const done = (typeof actionCompletionForDay === 'function') && !!actionCompletionForDay(key);
        if (done) st = 'done';
        else if (i === n - 1) st = 'today';
        else if (i < n - 1) st = 'held';
      } catch (e) {}
      out.push(st);
    }
    return out;
  }

  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 6"/></svg>';

  function todayConds() {
    const d = data();
    if (!d) return {};
    const day = (d.days && d.days[todayKey()]) || {};
    return day.conds || {};
  }

  function toggleCondition(id) {
    try {
      const d = data();
      if (!d || !active()) return;
      const k = todayKey();
      d.days[k] = d.days[k] || {};
      d.days[k].conds = d.days[k].conds || {};
      d.days[k].conds[id] = !d.days[k].conds[id];
      persistNow();
      if (typeof renderAll === 'function') renderAll();
    } catch (e) {}
  }

  // Delegated wiring for the face's condition rows; called by js/08 after
  // every command-center render.
  function bindFace(cc) {
    try {
      if (!cc) return;
      cc.querySelectorAll('[data-pwc]').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleCondition(b.getAttribute('data-pwc'));
        });
      });
    } catch (e) {}
  }

  function faceHtml() {
    if (!active()) return null;
    const n = dayNumber();
    const d = data();
    const squares = dayStates().map((st, i) =>
      '<span class="pwf__sq pwf__sq--' + st + '">' + (st === 'done' ? CHECK : (i + 1)) + '</span>'
    ).join('');
    let held = '';
    try {
      if (heldYesterday() && !(typeof actionDoneToday === 'function' && actionDoneToday())) {
        held = '<p class="pwf__line">Yesterday got away from you. One held day doesn&rsquo;t end a week, and the smallest honest version counts today.</p>';
      }
    } catch (e) {}
    // The conditions, checkable in place, today's state from the day record.
    let condRows = '';
    const conds = (d.conditions || []);
    if (conds.length) {
      const on = todayConds();
      condRows = '<div class="pwf__clabel">Today&rsquo;s conditions</div><div class="pwf__conds">' +
        conds.map((c) =>
          '<button type="button" class="pwf__cond' + (on[c.id] ? ' is-done' : '') + '" data-pwc="' + c.id + '" aria-pressed="' + (on[c.id] ? 'true' : 'false') + '">' +
            '<span class="pwf__ck">' + (on[c.id] ? CHECK : '') + '</span>' +
            '<span class="pwf__ct">' + esc2(c.text) + '</span>' +
          '</button>').join('') + '</div>';
    }
    return '<div class="v v-nf v-weekface" aria-label="The Perfect Week Protocol, day ' + n + ' of 7">' +
      '<div class="pwf__head"><span>Perfect Week Protocol</span><span>Day ' + n + ' of 7</span></div>' +
      '<div class="pwf__sqs">' + squares + '</div>' +
      held + condRows +
      '</div>';
  }

  /* ---------- the intro (the module explainer, like Action/Clarity) ---------- */

  function open() {
    if (root) return;
    const el = document.createElement('div');
    el.className = 'pwk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'The Perfect Week Protocol');
    // The module explainer, wearing the app's INTRO recipe verbatim (the
    // action-intro component in css/clarity.css): title fades at 0.3s, lines
    // land at reading pace, the button arrives only after the last line with
    // the orbiting comet border, tap anywhere skips.
    el.innerHTML =
      '<div class="action-intro" id="pwkIntro">' +
        '<h1 class="action-intro__title">The Perfect<br>Week Protocol.</h1>' +
        '<div class="action-intro__lines">' +
          '<p class="action-intro__line action-intro__line--1">You know your goal. You have your move. This is where it becomes real.</p>' +
          '<p class="action-intro__line action-intro__line--2">For the next 7 days, you live like the person who gets there: your move, done, every single day. Five of the seven and the protocol is yours.</p>' +
          '<p class="action-intro__line action-intro__line--3">Almost everyone who quits, quits in the first week. Finish it and you&rsquo;re past where most people die.</p>' +
        '</div>' +
        '<div class="action-intro__btn-pill"><button type="button" class="action-intro__btn" id="pwkGo">Continue</button></div>' +
      '</div>';
    document.body.appendChild(el);
    root = el;
    document.body.style.overflow = 'hidden';
    void el.offsetWidth;
    el.classList.add('pwk--in');
    try { if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show(''); } catch (e) {}
    // Tap anywhere before the lines finish: snap everything visible (the
    // intro recipe's own skip class).
    const intro = el.querySelector('#pwkIntro');
    el.addEventListener('click', (e) => {
      if (e.target.closest('#pwkGo')) return;
      intro.classList.add('action-intro--skipped');
    });
    el.querySelector('#pwkGo').addEventListener('click', () => {
      const held = root; root = null;
      held.classList.remove('pwk--in');
      setTimeout(() => { try { held.remove(); } catch (e) {} openSetup(); }, 300);
    });
  }

  /* ---------- the setup screen: conditions + baseline + the sign ---------- */

  const FALLBACK = [
    { text: 'Train 45 minutes', why: 'A working body shows up with you' },
    { text: 'No phone until the move is done', why: 'The day starts with the goal, not the feed' },
    { text: 'Sleep by 10', why: 'Tired days are the days you skip it' },
    { text: '30 min outside, no earbuds', why: 'Daylight and quiet reset the head' }
  ];

  function openSetup() {
    if (root) return;
    let baselineDays = null;
    const picked = {};
    let conds = [];

    const el = document.createElement('div');
    el.className = 'pwk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'The Perfect Week Protocol');
    el.innerHTML =
      '<div class="pwk__col">' +
        '<div class="pwk__mark">' + markSvg(16) + '</div>' +
        '<h1 class="pwk__title">Your conditions.</h1>' +
        '<p class="pwk__creed">The move is the goal. These are the terms you live it on. None of them are easy. That&rsquo;s the point.</p>' +
        '<div id="pwkConds"><p class="pwk__wait">Building your conditions&hellip;</p></div>' +
        '<div class="pwk__q" style="margin-top:22px">Last week, how many days did you actually work on this?</div>' +
        '<div class="pwk__slider">' +
          '<div class="pwk__sval" id="pwkSval" aria-hidden="true">&ndash;</div>' +
          '<input type="range" class="pwk__range" id="pwkRange" min="0" max="7" step="1" value="0" aria-label="Days worked last week, 0 to 7">' +
          '<div class="pwk__smarks" aria-hidden="true"><span>0</span><span>7</span></div>' +
        '</div>' +
        '<div class="pwk__nav">' +
          '<button type="button" class="pwk__skip" id="pwkSkip">Not this week</button>' +
          '<button type="button" class="pwk__hold" id="pwkHold" disabled aria-label="Hold for three seconds to start your week">' +
            '<span class="pwk__hold-fill" aria-hidden="true"></span>' +
            '<span class="pwk__hold-label">Hold to start the week</span>' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    root = el;
    document.body.style.overflow = 'hidden';
    void el.offsetWidth;
    el.classList.add('pwk--in');
    try { if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show(''); } catch (e) {}

    const holdBtn = el.querySelector('#pwkHold');
    const countOn = () => Object.keys(picked).filter((k) => picked[k]).length;
    const syncHold = () => { holdBtn.disabled = !(baselineDays !== null && countOn() >= 2); };

    function renderConds(list) {
      conds = list;
      list.forEach((c, i) => { if (picked[i] === undefined) picked[i] = i < 3; });
      const host = el.querySelector('#pwkConds');
      if (!host) return;
      host.innerHTML = '<div class="pwk__chips">' + list.map((c, i) =>
        '<button type="button" class="pwk__chip' + (picked[i] ? ' is-on' : '') + '" data-i="' + i + '" aria-pressed="' + (picked[i] ? 'true' : 'false') + '">' +
          '<span class="pwk__chip-t">' + esc2(c.text) + '</span>' +
          (c.why ? '<span class="pwk__chip-w">' + esc2(c.why) + '</span>' : '') +
        '</button>').join('') + '</div>';
      host.querySelectorAll('[data-i]').forEach((b) => {
        b.addEventListener('click', () => {
          const i = b.getAttribute('data-i');
          if (picked[i] && countOn() <= 2) return;
          picked[i] = !picked[i];
          b.classList.toggle('is-on', picked[i]);
          b.setAttribute('aria-pressed', picked[i] ? 'true' : 'false');
          syncHold();
        });
      });
      syncHold();
    }
    try {
      if (typeof perfectWeekConditionsGenerate === 'function') {
        perfectWeekConditionsGenerate().then(
          (list) => { if (root === el) renderConds(list); },
          () => { if (root === el) renderConds(FALLBACK.slice()); }
        );
      } else renderConds(FALLBACK.slice());
    } catch (e) { renderConds(FALLBACK.slice()); }

    const range = el.querySelector('#pwkRange');
    const sval = el.querySelector('#pwkSval');
    const syncSlider = () => {
      const v = parseInt(range.value, 10);
      baselineDays = v;
      sval.textContent = v === 7 ? '7, every day' : (v === 0 ? '0 days' : v + (v === 1 ? ' day' : ' days'));
      const pct = v / 7;
      sval.style.left = 'calc(' + (pct * 100) + '% + ' + ((0.5 - pct) * 28) + 'px)';
      range.style.setProperty('--pw-fill', (pct * 100) + '%');
      syncHold();
    };
    range.addEventListener('input', syncSlider);
    range.addEventListener('pointerdown', () => { if (baselineDays === null) syncSlider(); });
    el.querySelector('#pwkSkip').addEventListener('click', close);

    let holdTimer = null;
    const HOLD_MS = 3000;
    const startHold = (e) => {
      if (holdBtn.disabled || holdTimer) return;
      if (e && e.cancelable) { try { e.preventDefault(); } catch (x) {} }
      holdBtn.classList.add('is-holding');
      holdTimer = setTimeout(() => {
        holdTimer = null;
        holdBtn.classList.remove('is-holding');
        holdBtn.classList.add('is-done');
        startWeek(baselineDays, conds.filter((c, i) => picked[i]));
      }, HOLD_MS);
    };
    const cancelHold = () => {
      if (!holdTimer) return;
      clearTimeout(holdTimer);
      holdTimer = null;
      holdBtn.classList.remove('is-holding');
    };
    holdBtn.addEventListener('pointerdown', startHold);
    holdBtn.addEventListener('pointerup', cancelHold);
    holdBtn.addEventListener('pointerleave', cancelHold);
    holdBtn.addEventListener('pointercancel', cancelHold);
    holdBtn.addEventListener('touchstart', startHold, { passive: false });
    holdBtn.addEventListener('touchend', cancelHold);
    holdBtn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') startHold(e); });
    holdBtn.addEventListener('keyup', cancelHold);
  }

  return { open, openSetup, active, dayNumber, data, faceHtml, heldYesterday, bindFace, toggleCondition };
})();
try { window.PerfectWeek = PerfectWeek; } catch (e) {}
