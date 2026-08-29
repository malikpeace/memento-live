/* ============================================================
   35-perfect-week.js - THE PERFECT WEEK PROTOCOL (v1334, phase 1).

   Malik's frame, locked 2026-08-29: the week SERVES the move. Right
   after the plan exists, Memento proposes the 3-4 daily conditions
   (AI-derived from their goal + their own Clarity words, each with a
   visible why); the person confirms or trims; for 7 days the home
   carries the move lit and the conditions quiet. This file owns the
   state + the SETUP screen. Phase 2 wires the home strip, the day
   close, and the day-7 proof.

   Phase-1 entry points: PerfectWeek.openSetup() (public), plus the
   Cheat Code Bar QA button. The live post-plan flow is NOT wired yet,
   by design: nothing customers reach changes until Malik blesses the
   screen on-device.
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

  // The safety net when the AI call fails (offline, demo, quota): the week
  // still starts, with the honest generic set. FIXER SHIPS, never bounces.
  const FALLBACK = [
    { text: 'Sleep by 11', why: 'A rested brain shows up with you' },
    { text: 'No phone first hour', why: 'The morning belongs to the move' },
    { text: '20 min outside', why: 'Daylight resets the head between efforts' },
    { text: 'One real meal', why: 'Fuel for the work, not around it' }
  ];

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
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 320);
  }

  function startWeek(conds, source) {
    try {
      state.perfectWeek = {
        startedAt: Date.now(),
        startDay: todayKey(),
        source: source || 'ai',
        conditions: conds.map((c, i) => ({ id: 'c' + i, text: c.text, why: c.why || '' })),
        days: {},
        completedAt: null,
        keptRhythm: false
      };
      persistNow();
    } catch (e) {}
    close();
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  }

  function renderConditions(list, source) {
    if (!root) return;
    const col = root.querySelector('.pwk__col');
    if (!col) return;
    const picked = {};
    list.forEach((c, i) => { picked[i] = i < 3; }); // first three on, fourth offered
    col.innerHTML =
      '<div class="pwk__mark">' + markSvg(16) + '</div>' +
      '<h1 class="pwk__line">Your move needs a body and brain that show up with you. For your goal, these matter most this week:</h1>' +
      '<p class="pwk__sub">Keep 3 or 4. Fewer is stronger.</p>' +
      '<div class="pwk__chips">' +
      list.map((c, i) =>
        '<button type="button" class="pwk__chip' + (picked[i] ? ' is-on' : '') + '" data-pw-i="' + i + '" aria-pressed="' + (picked[i] ? 'true' : 'false') + '">' +
          '<span class="pwk__chip-t">' + esc2(c.text) + '</span>' +
          (c.why ? '<span class="pwk__chip-w">' + esc2(c.why) + '</span>' : '') +
        '</button>'
      ).join('') +
      '</div>' +
      '<button type="button" class="pwk__add" id="pwkAddBtn">Add your own&hellip;</button>' +
      '<div class="pwk__addrow" id="pwkAddRow" hidden>' +
        '<input class="pwk__input" id="pwkInput" type="text" maxlength="42" placeholder="Say it your way" autocomplete="off">' +
        '<button type="button" class="pwk__addgo" id="pwkAddGo" aria-label="Add">&#8594;</button>' +
      '</div>' +
      '<div class="pwk__nav">' +
        '<button type="button" class="pwk__skip" id="pwkSkip">Not now</button>' +
        '<button type="button" class="pwk__go" id="pwkGo">Start my week</button>' +
      '</div>';

    const countOn = () => Object.keys(picked).filter((k) => picked[k]).length;
    const goBtn = col.querySelector('#pwkGo');
    const syncGo = () => { goBtn.disabled = countOn() < 2; };

    col.querySelectorAll('[data-pw-i]').forEach((b) => {
      b.addEventListener('click', () => {
        const i = b.getAttribute('data-pw-i');
        if (picked[i] && countOn() <= 2) return;      // never below 2
        if (!picked[i] && countOn() >= 5) return;     // never above 5
        picked[i] = !picked[i];
        b.classList.toggle('is-on', picked[i]);
        b.setAttribute('aria-pressed', picked[i] ? 'true' : 'false');
        syncGo();
      });
    });

    // Add-your-own: the field appears only on request; the Clarity keyboard
    // settle rides along where the recipe exists (device-verified pattern).
    const addBtn = col.querySelector('#pwkAddBtn');
    const addRow = col.querySelector('#pwkAddRow');
    const input = col.querySelector('#pwkInput');
    addBtn.addEventListener('click', () => {
      addBtn.hidden = true;
      addRow.hidden = false;
      try { if (typeof bindKeyboardSettle === 'function') bindKeyboardSettle(root, input); } catch (e) {}
      setTimeout(() => { try { input.focus(); } catch (e) {} }, 60);
    });
    const commitAdd = () => {
      const t = String(input.value || '').trim().slice(0, 42);
      if (!t) return;
      const i = list.length;
      list.push({ text: t, why: '' });
      picked[i] = countOn() < 5;
      input.value = '';
      renderConditions(list, source);               // simple re-render keeps state honest
    };
    col.querySelector('#pwkAddGo').addEventListener('click', commitAdd);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitAdd(); } });

    col.querySelector('#pwkSkip').addEventListener('click', close);
    goBtn.addEventListener('click', () => {
      const keep = list.filter((c, i) => picked[i]);
      if (keep.length < 2) return;
      startWeek(keep, source);
    });
    syncGo();
  }

  function openSetup() {
    if (root) return;
    const el = document.createElement('div');
    el.className = 'pwk';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Set up your Perfect Week');
    el.innerHTML =
      '<div class="pwk__col">' +
        '<div class="pwk__mark">' + markSvg(16) + '</div>' +
        '<h1 class="pwk__line">You saw the week. Let&rsquo;s set yours up.</h1>' +
        '<p class="pwk__sub pwk__sub--wait">Building the conditions around your move&hellip;</p>' +
      '</div>';
    document.body.appendChild(el);
    root = el;
    document.body.style.overflow = 'hidden';
    void el.offsetWidth;
    el.classList.add('pwk--in');
    try { if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show(''); } catch (e) {}

    const useFallback = () => { if (root) renderConditions(FALLBACK.map((c) => ({ text: c.text, why: c.why })), 'fallback'); };
    try {
      if (typeof perfectWeekConditionsGenerate === 'function') {
        perfectWeekConditionsGenerate().then(
          (list) => { if (root) renderConditions(list, 'ai'); },
          () => useFallback()
        );
      } else useFallback();
    } catch (e) { useFallback(); }
  }

  return { openSetup, active, dayNumber, data };
})();
try { window.PerfectWeek = PerfectWeek; } catch (e) {}
