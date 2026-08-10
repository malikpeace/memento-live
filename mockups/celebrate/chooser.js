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
   L1  Milestones are fifths of |target - baseline|, but never finer than one
       whole unit; a target too small for fifths celebrates per unit.
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
   L9  Day-count goals (maintenance) use the ladder 7/30/50/100/200/365,
       then every 100 after; once-only via the same ledger.
   L10 evaluate() returns at most ONE event; the caller shows at most one
       ceremony per app-open and the comeback moment outranks it.
   L11 First move: the first real movement off the baseline (>= 1% of the
       span) fires ONE quiet 'first' event before any fifth is reached, so
       the hardest stretch, the beginning, is witnessed. Once ever. */
(function (root) {
  'use strict';

  var DOWN_VERBS = /\b(lose|losing|lost|pay(?:ing)?\s+off|debt|quit|stop|under|below|reduce|cut|drop|sober|clean|fewer|less\s+than)\b/i;
  var DAY_LADDER = [7, 30, 50, 100, 200, 365];

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

  /* L1: the milestone values for a goal, in crossing order, target last. */
  function milestones(gp, dir) {
    if (!gp || gp.target === null) return [];
    var base = gp.baseline !== null ? gp.baseline : (dir === 'down' ? null : 0);
    if (base === null) return [gp.target];             // down with no baseline: only the end is knowable
    var span = Math.abs(gp.target - base);
    if (span <= 0) return [gp.target];
    var step = span / 5;
    if (step < 1) step = 1;                            // never finer than a unit
    step = Math.round(step);
    var out = [], sign = dir === 'down' ? -1 : 1;
    for (var v = base + sign * step;
         sign > 0 ? v < gp.target : v > gp.target;
         v += sign * step) {
      out.push(Math.round(v));
    }
    /* rounding can leave a stray mark almost on top of the target (187->11
       gave ...47, 12, 11). A step that lands within 60% of a step of the
       final is noise: drop it, the final IS that celebration. */
    while (out.length && Math.abs(gp.target - out[out.length - 1]) < step * 0.6) out.pop();
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

    /* ---- day-count goals (maintenance): L9 ---- */
    if (opts.days != null) {
      var d = opts.days, hit = null;
      for (var i = 0; i < DAY_LADDER.length; i++) if (d >= DAY_LADDER[i]) hit = DAY_LADDER[i];
      if (d >= 365) hit = 365 + Math.floor((d - 365) / 100) * 100;
      if (hit !== null) {
        fam = 'mt';
        return fire('days', 'days-' + hit, { milestone: hit, days: d });
      }
      return null;
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
      if (gp.baseline !== null) {
        var movedBy = dir === 'down' ? gp.baseline - to : to - gp.baseline;
        var spanAll = Math.abs(gp.target - gp.baseline);
        if (movedBy >= Math.max(spanAll * 0.01, 0) && movedBy > 0) {
          return fire('first', 'first-move', { milestone: null, prev: from, remaining: Math.abs(gp.target - to) });
        }
      }
      return null;
    }
    var isFinal = hitMark === gp.target;                             /* L4 */
    return fire(isFinal ? 'final' : 'step', 'mark-' + hitMark, {
      milestone: hitMark, prev: from,
      remaining: Math.abs(gp.target - to)
    });
  }

  var api = { evaluate: evaluate, milestones: milestones, direction: direction, starHash: starHash, DAY_LADDER: DAY_LADDER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MilestoneChooser = api;
})(this);
