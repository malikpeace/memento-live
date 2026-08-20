/* PORTED VERBATIM from mockups/celebrate/chooser.js (THE MERGE, foundation
   phase, 2026-08-19). Zero logic edits; the mockup file + chooser-tests.html
   remain the reference. Renumbered per MERGE-AUDIT (22-24 were taken). */
/* The chooser: which celebration fires, when, and with what data.
   ------------------------------------------------------------------
   Pure logic, no DOM, no timers, no persistence of its own. Written to be
   ported into memento-app/js verbatim once Malik picks the screens; until
   then it lives here with its test harness (chooser-tests.html).

   Inputs are the app's real shapes:
     gp      = state.goalProgress  { target, unit, baseline, current,
                                     updatedAt, history:[{day,value}] }
     star    = the Neutron Star sentence (direction inference only)
     ledger  = persisted once-only record of fired celebrations
               { "<starHash>:<key>": "2026-08-09", ... }
     stats   = optional consistency stats { totalActiveDays }

   Output of evaluate(): null, or ONE event:
     { family:   'qu' | 'qd' | 'mt',
       kind:     'step' | 'final' | 'record' | 'days',
       intensity:'step' | 'final',
       cold:     true when there is not enough history to draw receipts,
       hasBaseline: false when the goal changed and the past is gone,
       milestone, target, unit, current, prev, remaining, daysSpan, key }

   THE LAWS (each has a test):
   L1  Milestones are Malik's percent ladder over |target - baseline|
       (1/5/10/20/25/30/40/50/60/75/80/90/95, then the target), never finer
       than one whole unit; a tiny target celebrates per unit.
   L2  A milestone fires ONCE, ever. Recrossing after a bounce is silent.
       (Same law as resume: a moment witnessed is never re-earned.)
   L3  Crossing several milestones in one pulse coalesces to the FURTHEST.
   L4  Reaching the target itself is 'final' intensity; it also swallows any
       step crossed in the same pulse.
   L5  Cold start: fewer than 2 history points or a span under 7 days sets
       cold:true, so the UI picks a screen that needs no receipts.
   L6  A changed goal (new starHash) keeps the old ledger entries harmlessly
       and reports hasBaseline:false until a new baseline exists.
   L7  Direction comes from baseline vs target; with no baseline yet, from
       the star's verbs (lose/pay off/quit/under/below = down), else up.
   L8  No-target goals celebrate personal records: a new best beyond the old
       best by >= 2% of it (or >= 1 unit), at most once per 7 days.
   L9  Day-count goals (maintenance) fire every 7 days, PLUS every month
       mark (30, 60, 90 ...) on its exact day, once-only via the ledger.
       Weekly rungs are QUIET steps; month marks step up; the big round
       marks 100 / 200 / 300 / 365, then every 100, fire BOLD on their
       exact day. A month/bold fire spends its week's rung so nothing
       stacks. Unit-count totals (total runs, sessions) fire on Malik's
       COUNT_LADDER (1,5,7,10,15,20,25,30,40,50 ... every 50 past 300).
   L10 evaluate() returns at most ONE event; the caller shows at most one
       ceremony per app-open and the comeback moment outranks it.
   L11 First move: the 1% mark IS the first-move moment now (the ladder
       starts at 1%), so the beginning is witnessed by a real mark; the
       'first' event remains only for movement too small to cross it. */
(function (root) {
  'use strict';

  var DOWN_VERBS = /\b(lose|losing|lost|pay(?:ing)?\s+off|debt|quit|stop|under|below|reduce|cut|drop|sober|clean|fewer|less\s+than)\b/i;
  var DAY_STEP = 7;      // day-count goals: a rung every week
  var MONTH_STEP = 30;   // ...and every month mark (30, 60, 90 ...), Malik 2026-08-14
  var BOLD_DAYS = [100, 200, 300, 365];   // the big round marks fire BOLD, on the exact day
  /* Unit-count totals (total runs, sessions): Malik's exact ladder
     (2026-08-14), dense at the start, widening as the count grows,
     then every 50 past 300. */
  var COUNT_LADDER = [1, 5, 7, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200, 250, 300];
  function countHit(n) {
    if (n >= 300) return 300 + Math.floor((n - 300) / 50) * 50;
    var hit = null;
    for (var i = 0; i < COUNT_LADDER.length; i++) if (n >= COUNT_LADDER[i]) hit = COUNT_LADDER[i];
    return hit;
  }
  function countNext(n) {
    if (n >= 300) return 300 + (Math.floor((n - 300) / 50) + 1) * 50;
    for (var i = 0; i < COUNT_LADDER.length; i++) if (COUNT_LADDER[i] > n) return COUNT_LADDER[i];
    return 350;
  }

  function starHash(star) {
    var s = String(star || ''), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  }

  function daysBetween(a, b) {
    var ms = new Date(b) - new Date(a);
    return isFinite(ms) ? Math.round(ms / 86400000) : 0;
  }

  /* L7 */
  function direction(gp, star) {
    if (gp && gp.baseline !== null && gp.target !== null && gp.baseline !== gp.target) {
      return gp.target < gp.baseline ? 'down' : 'up';
    }
    return DOWN_VERBS.test(String(star || '')) ? 'down' : 'up';
  }

  /* L1: the milestone values for a goal, in crossing order, target last.
     Malik 2026-08-14: fifths are DEAD. The road fires on his ladder of
     percentages, tuned so the feedback loop starts immediately (1%, 5%,
     10%), hits the quarters and half, and builds up near the end (90%,
     95%): for a 0->100 goal that is exactly 1, 5, 10, 20, 25, 30, 40, 50,
     60, 75, 80, 90, 95, 100. Marks stay whole units and never stack, so
     small spans (write 3 books) still celebrate per unit. */
  var ROAD_PCTS = [1, 5, 10, 20, 25, 30, 40, 50, 60, 75, 80, 90, 95];
  /* L12 CUSTOM SUB-GOALS (Malik 2026-08-16, MERGE-2). When they name their own
     middles ("run a 5K, then 10, then 20, then the marathon"), those marks
     REPLACE the percent ladder: gp.customMarks holds whole numbers (or
     { value, name } objects) strictly between the baseline and the target.
     Sorted into crossing order, deduped, capped at 12 (denser is noise), and
     the target is still appended last, so every once-only law above applies
     to them unchanged: same 'mark-<value>' ledger keys, same coalescing, same
     swallow by the finale. */
  var CUSTOM_CAP = 12;
  function customLadder(gp, base, dir) {
    var raw = gp.customMarks;
    if (!Array.isArray(raw) || !raw.length) return null;
    var sign = dir === 'down' ? -1 : 1, out = [];
    for (var i = 0; i < raw.length; i++) {
      var m = raw[i];
      var v = Math.round(+((m && typeof m === 'object') ? m.value : m));
      if (!isFinite(v)) continue;
      if (sign > 0 ? (v <= base || v >= gp.target) : (v >= base || v <= gp.target)) continue;
      if (out.indexOf(v) < 0) out.push(v);
    }
    if (!out.length) return null;
    out.sort(function (a, b) { return sign > 0 ? a - b : b - a; });
    if (out.length > CUSTOM_CAP) out = out.slice(0, CUSTOM_CAP);
    out.push(gp.target);
    return out;
  }
  function milestones(gp, dir) {
    if (!gp || gp.target === null) return [];
    var base = gp.baseline !== null ? gp.baseline : (dir === 'down' ? null : 0);
    if (base === null) return [gp.target];             // down with no baseline: only the end is knowable
    var span = Math.abs(gp.target - base);
    if (span <= 0) return [gp.target];
    var custom = customLadder(gp, base, dir);          /* L12 */
    if (custom) return custom;
    var out = [], sign = dir === 'down' ? -1 : 1;
    ROAD_PCTS.forEach(function (p) {
      var v = Math.round(base + sign * span * p / 100);
      if (Math.abs(v - base) < 1) return;              // never finer than a unit off the start
      if (out.length && Math.abs(v - out[out.length - 1]) < 1) return;   // no stacked marks
      if (sign > 0 ? v >= gp.target : v <= gp.target) return;            // the target is the final
      out.push(v);
    });
    out.push(gp.target);
    return out;
  }

  function crossed(dir, from, to, mark) {
    return dir === 'down' ? (from > mark && to <= mark) : (from < mark && to >= mark);
  }

  /* The single entry point. prevValue is where the number stood before this
     pulse (the caller reads it BEFORE goalProgressUpdate writes the new one). */
  function evaluate(opts) {
    var gp = opts.gp, star = opts.star || '', ledger = opts.ledger || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var hash = starHash(star);
    var dir = direction(gp, star);
    var fam = dir === 'down' ? 'qd' : 'qu';
    var hist = (gp && gp.history) || [];
    var span = hist.length >= 2 ? daysBetween(hist[0].day, hist[hist.length - 1].day) : 0;
    var cold = hist.length < 2 || span < 7;            /* L5 */
    var hasBaseline = !!(gp && gp.baseline !== null);  /* L6 */

    function fire(kind, key, extra) {
      var full = hash + ':' + key;
      if (ledger[full]) return null;                   /* L2 */
      ledger[full] = today;
      var ev = {
        family: fam, kind: kind,
        intensity: kind === 'final' ? 'final' : 'step',
        cold: cold, hasBaseline: hasBaseline,
        target: gp ? gp.target : null, unit: (gp && gp.unit) || '',
        current: gp ? gp.current : null, daysSpan: span, key: full
      };
      for (var k in extra) ev[k] = extra[k];
      return ev;
    }

    /* ---- unit-count goals (100 sessions, 50 runs): L9's count ladder.
       Fires when the TOTAL crosses a rung of COUNT_LADDER, once ever per
       rung; the ladder was always defined here, this branch makes
       evaluate() actually fire it (found in the 2026-08-16 review: the rig
       used countHit directly, so the gap only showed on the wiring path). */
    if (opts.count != null) {
      var cTot = opts.count;
      var cHit = countHit(cTot);
      if (cHit === null) return null;
      fam = 'fr';
      return fire('count', 'count-' + cHit, { milestone: cHit, count: cTot });
    }

    /* ---- day-count goals (maintenance): L9, weeks + months + bold ---- */
    if (opts.days != null) {
      var d = opts.days;
      if (d < DAY_STEP) return null;
      fam = 'mt';
      /* the big round marks hit BOLD, on their exact day */
      var bold = null;
      for (var bi = 0; bi < BOLD_DAYS.length; bi++) if (d >= BOLD_DAYS[bi]) bold = BOLD_DAYS[bi];
      if (d >= 465) bold = 365 + Math.floor((d - 365) / 100) * 100;
      if (bold !== null && !ledger[hash + ':days-' + bold]) {
        /* a bold fire spends its week's quiet rung so they never stack */
        ledger[hash + ':days-' + (bold - bold % DAY_STEP)] = today;
        return fire('days', 'days-' + bold, { milestone: bold, days: d, intensity: 'bold' });
      }
      /* month marks (30, 60, 90 ...) fire on their exact day, a step up
         from the weekly rhythm (Malik 2026-08-14: months fire too) */
      if (d % MONTH_STEP === 0 && !ledger[hash + ':days-' + d]) {
        ledger[hash + ':days-' + (d - d % DAY_STEP)] = today;
        return fire('days', 'days-' + d, { milestone: d, days: d, month: true });
      }
      var hit = d - (d % DAY_STEP);
      return fire('days', 'days-' + hit, { milestone: hit, days: d });
    }

    if (!gp || gp.current === null || opts.prevValue == null) return null;
    var from = opts.prevValue, to = gp.current;

    /* ---- no target: personal records, L8 ---- */
    if (gp.target === null) {
      var best = null;
      for (var j = 0; j < hist.length; j++) {
        var v = hist[j].value;
        if (hist[j].day === today) continue;           // today's pulse is the candidate, not the record
        if (best === null || (dir === 'down' ? v < best : v > best)) best = v;
      }
      if (best === null) return null;                  // first pulse ever: nothing to beat
      /* the whole-unit floor is for integer goals (users, runs). A decimal
         goal (1.5h screen time) must not need a full unit: 1.5 -> 1.0 IS a
         record. Malik caught this in the field-test rig. */
      var integral = true;
      for (var hz = 0; hz < hist.length; hz++) if (hist[hz].value !== Math.round(hist[hz].value)) { integral = false; break; }
      var margin = Math.abs(best) * 0.02;
      if (integral) margin = Math.max(1, margin);
      var beaten = dir === 'down' ? (to <= best - margin) : (to >= best + margin);
      if (!beaten) return null;
      var lastRec = null;
      for (var k2 in ledger) if (k2.indexOf(hash + ':record-') === 0) {
        if (lastRec === null || ledger[k2] > lastRec) lastRec = ledger[k2];
      }
      if (lastRec && daysBetween(lastRec, today) < 7) return null;   // cooldown
      return fire('record', 'record-' + today, { milestone: to, prev: best });
    }

    /* ---- target goals: L1..L4 ---- */
    var marks = milestones(gp, dir);
    var hitMark = null;
    for (var m = 0; m < marks.length; m++) {
      if (crossed(dir, from, to, marks[m])) hitMark = marks[m];      /* L3: keep the furthest */
    }
    if (hitMark === null) {
      /* L11 first move: the hardest stretch is the first inch, and the first
         fifth can be a month away. The FIRST real movement off the baseline
         gets one quiet ceremony, once ever, so early progress is witnessed
         without lying about the scale (the road stays linear). */
      if (gp.baseline !== null && marks.length) {
        var movedBy = dir === 'down' ? gp.baseline - to : to - gp.baseline;
        var beforeFirstMark = dir === 'down' ? to > marks[0] : to < marks[0];
        if (movedBy > 0 && beforeFirstMark) {
          return fire('first', 'first-move', { milestone: null, prev: from, remaining: Math.abs(gp.target - to) });
        }
      }
      return null;
    }
    var isFinal = hitMark === gp.target;                             /* L4 */
    /* the furthest mark SWALLOWS every mark crossed in the same pulse: pay
       them all, so a later bounce-and-recross never resurrects one */
    for (var m2 = 0; m2 < marks.length; m2++) {
      if (marks[m2] !== hitMark && crossed(dir, from, to, marks[m2])) {
        ledger[hash + ':mark-' + marks[m2]] = today;
      }
    }
    return fire(isFinal ? 'final' : 'step', 'mark-' + hitMark, {
      milestone: hitMark, prev: from,
      remaining: Math.abs(gp.target - to)
    });
  }

  var api = { evaluate: evaluate, milestones: milestones, direction: direction, starHash: starHash, DAY_STEP: DAY_STEP, MONTH_STEP: MONTH_STEP, BOLD_DAYS: BOLD_DAYS, COUNT_LADDER: COUNT_LADDER, countHit: countHit, countNext: countNext };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MilestoneChooser = api;
})(this);
