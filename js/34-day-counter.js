/* ============================================================
   34-day-counter.js - THE DAY COUNTER (v1324, Malik's pick: the count-up).

   The first thing a paying member sees on each new day: the M, then
   "Day N" counting up from 0, then the greeting. N = total days since
   the star ignited; a missed day never resets it, so after a gap the
   counter quietly proves the record survived.

   Rules (Malik, 2026-08-29, from the Day Counter lab):
   - Once per NEW local day, first open only. Never twice in a day.
   - Paid members only (ClarityPaywall.isPaid), star ignited.
   - Weight scales with the number: dur = 0.6s + 0.09s * sqrt(N),
     capped at 1.6s. Day 2 is quick; day 100 lands heavy.
   - Milestones (7 / 30 / 100 / 365) land the number GREEN and the
     greeting names them ("A full month, Mark.").
   - Day 1: no count-up ("It starts today.").
   - After a real gap (2+ days) the greeting says "Welcome back".
   - Tap anywhere skips. Reduced motion gets a plain fade, final number.
   - Dark always, like the splash: this is a ceremony surface, one root
     rule, no per-page theme opt-outs (the visual contract).
   - DEMO boots never auto-show (demo lands on the clean home, v684 law);
     QA drives it with DayCounter.show(n) instead.
   ============================================================ */

const DayCounter = {
  _KEY: 'memento_day_counter_last',
  _el: null,

  // Total days since ignition, day of ignition = Day 1. Local midnights,
  // so an 11pm ignition still rolls to Day 2 the next morning.
  dayNumber() {
    try {
      const ig = state.clarity && state.clarity.ignitedAt;
      if (!ig) return 0;
      const day = (t) => Math.floor((t - new Date(t).getTimezoneOffset() * 60000) / 86400000);
      const n = day(Date.now()) - day(Number(ig)) + 1;
      return n > 0 ? n : 0;
    } catch (e) { return 0; }
  },

  _shouldShow() {
    try {
      if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return false;
      if (!(typeof ClarityPaywall !== 'undefined' && ClarityPaywall.isPaid())) return false;
      const n = this.dayNumber();
      if (n < 1) return false;
      const today = (typeof getTodayISO === 'function') ? getTodayISO() : '';
      if (!today) return false;
      let last = '';
      try { last = localStorage.getItem(this._KEY) || ''; } catch (e) {}
      return last !== today;
    } catch (e) { return false; }
  },

  // The line under the number. Milestones outrank everything, then the
  // comeback hello, then the shared home words (ccGreetingLine).
  _line(n) {
    const first = ((state.profile && state.profile.name || '').trim().split(/\s+/)[0]) || '';
    const withName = (t) => first ? (t + ', ' + first + '.') : (t + '.');
    // v1327 (Malik): milestones celebrate, they don't announce. "Month 1!"
    // over "A full month, Mark." (his words: that read cold).
    if (n === 7) return 'Week 1!';
    if (n === 30) return 'Month 1!';
    if (n === 100) return '100 days!';
    if (n === 365) return 'Year 1!';
    if (n === 1) return 'It starts today.';
    try {
      if (typeof comebackGapDays === 'function' && comebackGapDays() >= 2) return withName('Welcome back');
    } catch (e) {}
    try { return ccGreetingLine(first); } catch (e) { return withName('Welcome back'); }
  },

  show(forceN) {
    if (this._el) return;
    const n = (typeof forceN === 'number' && forceN > 0) ? forceN : this.dayNumber();
    if (n < 1) return;
    const milestone = [7, 30, 100, 365].indexOf(n) >= 0;
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = document.createElement('div');
    el.className = 'dayc';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="dayc__inner">' +
        '<svg class="dayc__m dayc__fx" viewBox="42 40 428 432" aria-hidden="true"><path d="M62 55 L256 249 L450 55 L450 457 L62 457 Z"/></svg>' +
        '<div class="dayc__num dayc__fx dayc__fx--d1' + (milestone ? ' dayc__num--ms' : '') + '">Day <span class="dayc__n">' + (reduce || n === 1 ? n : 0) + '</span></div>' +
        '<div class="dayc__line dayc__fx dayc__fx--d2">' + esc(this._line(n)) + '</div>' +
      '</div>';
    document.body.appendChild(el);
    this._el = el;
    // seen = shown, even if they skip instantly; a crash-refresh must not
    // replay it. A FORCED show (the Cheat Code Bar QA button) does not spend
    // the day's real showing.
    if (typeof forceN !== 'number') {
      try { localStorage.setItem(this._KEY, (typeof getTodayISO === 'function') ? getTodayISO() : '') } catch (e) {}
    }
    void el.offsetWidth;
    el.classList.add('dayc--in');

    // the climb: fixed easing, duration grows with what's been earned
    let holdAfter = 900;
    if (!reduce && n > 1) {
      const numEl = el.querySelector('.dayc__n');
      const dur = Math.min(1600, 600 + 90 * Math.sqrt(n));
      holdAfter = 900 + dur;
      let t0 = null;
      const tick = (ts) => {
        if (!this._el) return; // skipped mid-climb
        if (t0 === null) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        numEl.textContent = Math.round(n * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      setTimeout(() => requestAnimationFrame(tick), 620);
    }
    // v1327 (Malik): let it linger, about 5 seconds on screen, so the moment
    // breathes. A tap still continues immediately.
    const total = reduce ? 3200 : Math.max(5000, holdAfter + 700);
    this._timer = setTimeout(() => this.dismiss(), total);
    el.addEventListener('click', () => this.dismiss(), { once: true });
  },

  dismiss() {
    const el = this._el;
    if (!el) return;
    this._el = null;
    clearTimeout(this._timer);
    el.classList.remove('dayc--in');
    el.classList.add('dayc--out');
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 340);
  },

  boot() {
    if (!this._shouldShow()) return;
    this.show();
  }
};

// Wait for the boot mask to lift (js/11 adds boot-revealed at the end of
// init), then decide once. A short poll, self-clearing; no observers to leak.
(function () {
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    const ready = document.body && document.body.classList.contains('boot-revealed');
    if (ready || tries > 100) {
      clearInterval(t);
      if (ready) { try { DayCounter.boot(); } catch (e) {} }
    }
  }, 100);
})();
