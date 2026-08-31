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

  function startWeek(whenSlot, baselineDays) {
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
        whenSlot: whenSlot,
        baselineDays: baselineDays,
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

  /* ---------- the setup screen (piece 1) ---------- */

  function openSetup() {
    if (root) return;
    let whenSlot = '';
    let baselineDays = null;

    const el = document.createElement('div');
    el.className = 'pwk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'The Perfect Week');
    el.innerHTML =
      '<div class="pwk__col">' +
        '<div class="pwk__mark">' + markSvg(16) + '</div>' +
        '<h1 class="pwk__title">The Perfect Week.</h1>' +
        '<p class="pwk__creed">Almost everyone who quits, quits in the first week. Finish it and you&rsquo;re past where most people die.</p>' +
        '<div class="pwk__q">When is your move happening each day?</div>' +
        '<div class="pwk__row" data-pw-when>' +
          ['morning', 'midday', 'evening'].map((w) =>
            '<button type="button" class="pwk__opt" data-w="' + w + '">' + w.charAt(0).toUpperCase() + w.slice(1) + '</button>').join('') +
        '</div>' +
        '<div class="pwk__q">Last week, how many days did you actually work on this?</div>' +
        '<div class="pwk__row pwk__row--nums" data-pw-base>' +
          [0, 1, 2, 3, 4, 5, 6, 7].map((n) =>
            '<button type="button" class="pwk__opt pwk__opt--num" data-n="' + n + '">' + n + '</button>').join('') +
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
    const syncHold = () => { holdBtn.disabled = !(whenSlot && baselineDays !== null); };

    el.querySelectorAll('[data-pw-when] .pwk__opt').forEach((b) => {
      b.addEventListener('click', () => {
        whenSlot = b.getAttribute('data-w');
        el.querySelectorAll('[data-pw-when] .pwk__opt').forEach((x) => x.classList.toggle('is-on', x === b));
        syncHold();
      });
    });
    el.querySelectorAll('[data-pw-base] .pwk__opt').forEach((b) => {
      b.addEventListener('click', () => {
        baselineDays = parseInt(b.getAttribute('data-n'), 10);
        el.querySelectorAll('[data-pw-base] .pwk__opt').forEach((x) => x.classList.toggle('is-on', x === b));
        syncHold();
      });
    });
    el.querySelector('#pwkSkip').addEventListener('click', close);

    // The sign: the app's one deliberate gesture, the same 3s hold that
    // completes a day. Fill sweeps; release early and nothing happens.
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
        startWeek(whenSlot, baselineDays);
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

  return { openSetup, active, dayNumber, data };
})();
try { window.PerfectWeek = PerfectWeek; } catch (e) {}
