/* PORTED VERBATIM from mockups/celebrate/referee.js (THE MERGE, foundation
   phase, 2026-08-19). Zero logic edits; referee-tests.html is the reference.
   Depends on js/25's MilestoneChooser global. */
/* The referee: which TIER gets the moment when a completion happens.
   ------------------------------------------------------------------
   finale > milestone > daily. Exactly one, every completion. Pure logic,
   no DOM, no timers, no persistence of its own; written to be ported into
   memento-app/js verbatim at merge (same contract as chooser.js, which it
   CALLS: the chooser stays the single source of milestone truth).

   Where the chooser answers "which milestone fires", the referee answers
   the question above it: "of finale / milestone / daily, which ONE shows
   right now". It is the piece GOAL-REACHED-SPEC.md calls 'the referee';
   spec sections 3-5 are implemented here, with Malik's 2026-08-16 answers:
   the finale fires at FULL intensity for goal #2, #3, every goal (a new
   starHash is a new climb), and a maintenance day counts when they check
   in and say they held it (the caller credits daysHeld from check-ins).

   Inputs (all the app's real shapes, nothing invented):
     shape       'target' | 'count' | 'duration' | 'event'
     star        the Neutron Star sentence (keys the goal, via starHash)
     gp          state.goalProgress (target shapes)
     count       moves logged toward a count goal;  countTarget its goal
     daysHeld    check-in-credited days (duration);  daysTarget its goal
     userSaysDone  true only when THEY tapped "I'm there" / "I did it"
     goalDone    persisted receipts { "<hash>": { day, ... } } = state.goalDone
     ledger      the chooser's once-only ledger (shared object)
     today       'YYYY-MM-DD'
     askedDay    when the confirm question last showed (gp.askedDay)
     chooserOpts extra fields passed through to chooser.evaluate

   THE RULES (each has a test in referee-tests.html):
   R1  decide() returns exactly ONE of: {tier:'finale'} {tier:'milestone'}
       {tier:'daily'} {tier:'none'}. Never two. The caller renders that and
       nothing else.
   R2  finale > milestone > daily. A finale day shows nothing else (the day
       the receipt is written, later completions that same day get 'none').
   R3  The finale fires ONCE per goal, ever: guarded by the goalDone
       receipt EXISTING, never by the numbers still being true. Un-editing
       yesterday's log cannot re-arm it; a relaunch cannot re-fire it.
   R4  A finale still PAYS the milestone ledger for every mark crossed in
       the same pulse (via the chooser), so nothing resurrects later; the
       milestone event itself is discarded, the finale outranks it.
   R5  Detection honesty, per shape: 'count' and 'duration' may fire the
       finale straight from the app's own ledger; 'target' and 'event' NEVER
       self-fire, they need userSaysDone (the quiet confirm, spec section 4).
       shouldAsk() throttles that question to once a day via askedDay.
   R6  A new star (new starHash) is a new goal: its finale fires again at
       full intensity. Rarity across goals was Malik's explicit call.
   R7  Duration reached means daysHeld >= daysTarget where daysHeld counts
       only check-in-credited days: showing up and saying "held it".
   R8  Target reached respects DIRECTION: down means current <= target, up
       means current >= target (fixes the up-only assumption in js/03).
   R9  With no finale and no milestone, the completion still earns the
       DAILY page: the referee never returns nothing for a real completion
       (only 'none' on a spent finale day, R2).
   R10 reachedNow() never writes; decide() writes the receipt BEFORE
       returning 'finale' (render must follow persistence, v1149 law). */
(function (root) {
  'use strict';

  var C = (typeof module !== 'undefined' && module.exports)
    ? require('./chooser.js')
    : root.MilestoneChooser;

  /* R7 + R8 + R5: is the goal's own finish line crossed right now, and may
     the app say so without asking? Never writes anything. */
  function reachedNow(o) {
    var shape = o.shape || 'target';
    if (shape === 'count')    return { reached: (+o.count || 0) >= (+o.countTarget || Infinity), needsConfirm: false };
    if (shape === 'duration') return { reached: (+o.daysHeld || 0) >= (+o.daysTarget || Infinity), needsConfirm: false };
    if (shape === 'event')    return { reached: !!o.userSaysDone, needsConfirm: true };
    var gp = o.gp;
    if (!gp || gp.target === null || gp.current === null) return { reached: false, needsConfirm: true };
    var dir = C.direction(gp, o.star);
    var hit = dir === 'down' ? gp.current <= gp.target : gp.current >= gp.target;   /* R8 */
    return { reached: hit, needsConfirm: true };                                     /* R5 */
  }

  /* R5: surface the one-line confirm ("You said 200 lbs. Are you there?")?
     Only for shapes that cannot self-fire, only when the line is crossed,
     at most once a day, and never after the finale already fired. */
  function shouldAsk(o) {
    var r = reachedNow(o);
    if (!r.reached || !r.needsConfirm) return false;
    if (o.userSaysDone) return false;                  // already answered
    var hash = C.starHash(o.star || '');
    if (o.goalDone && o.goalDone[hash]) return false;  // finale already fired
    if (o.askedDay && o.askedDay === o.today) return false;
    return true;
  }

  /* The single entry point: ONE tier per completion. */
  function decide(o) {
    var today = o.today || new Date().toISOString().slice(0, 10);
    var hash = C.starHash(o.star || '');
    var goalDone = o.goalDone || {};
    var receipt = goalDone[hash];

    /* R2: the finale's own day is spent; show nothing more that day.
       Any other day after it, normal life (dailies) resumes. */
    if (receipt) {
      if (receipt.day === today) return { tier: 'none', reason: 'finale-day' };
    } else {
      var r = reachedNow(o);
      var mayFire = r.reached && (!r.needsConfirm || o.userSaysDone);
      if (mayFire) {
        /* R10: receipt BEFORE render. R3: existence is the only guard. */
        goalDone[hash] = {
          day: today, shape: o.shape || 'target',
          declaredBy: r.needsConfirm ? 'user' : 'ledger'
        };
        /* R4: pay the milestone ledger for anything crossed in this same
           pulse, then throw the event away; the finale outranks it. */
        try {
          if ((o.shape || 'target') === 'target' && o.gp) {
            C.evaluate({ gp: o.gp, star: o.star, ledger: o.ledger || {},
                         today: today, prevValue: o.prevValue });
          }
        } catch (e) {}
        return { tier: 'finale', goalKey: hash, receipt: goalDone[hash] };
      }
    }

    /* milestone: the chooser is the single source of truth (L1-L11).
       Count and duration shapes hand it their own totals, so their mid-goal
       rungs fire through the same ladder that the rig proves. */
    var ev = null;
    try {
      var co = { gp: o.gp, star: o.star, ledger: o.ledger || {}, today: today,
                 prevValue: o.prevValue };
      if ((o.shape || '') === 'count' && o.count != null) co.count = o.count;
      if ((o.shape || '') === 'duration' && o.daysHeld != null) co.days = o.daysHeld;
      if (o.chooserOpts) for (var k in o.chooserOpts) co[k] = o.chooserOpts[k];
      ev = C.evaluate(co);
    } catch (e) { ev = null; }
    if (ev) return { tier: 'milestone', event: ev };

    return { tier: 'daily' };                          /* R9 */
  }

  var api = { decide: decide, reachedNow: reachedNow, shouldAsk: shouldAsk };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RewardReferee = api;
})(this);

/* ======================================================================
   APP-SIDE GLUE (NOT part of the verbatim port above). THE MERGE
   foundation, 2026-08-19. rewardMoment builds the referee context from
   real state; rewardShadow is PHASE-0 SHADOW MODE: it runs the referee
   against persisted twin stores (state.rewards.shadow.*) so once-only
   and no-refire-on-relaunch are actually provable, while the user-facing
   stores and screens stay completely untouched.
   6 -> 4 shape mapping (per the audit: reuse the AI taxonomy, never
   re-derive from star text): quantity_up / quantity_down / open ->
   'target'; frequency -> 'count'; maintenance -> 'duration';
   milestone -> 'event'. Cached on goalProgress.shape, star-scoped. */
(function () {
  'use strict';

  function resolveRewardShape() {
    try {
      var gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : (state.goalProgress || null);
      if (!gp) return 'target';
      if (gp.shape) return gp.shape;
      var six = null;
      try { six = (typeof ccGoalShape === 'function') ? ccGoalShape() : null; } catch (e) {}
      var t = six && six.type ? String(six.type) : '';
      var four = (t === 'frequency') ? 'count'
        : (t === 'maintenance') ? 'duration'
        : (t === 'milestone') ? 'event'
        : 'target';
      gp.shape = four;
      return four;
    } catch (e) { return 'target'; }
  }

  function buildRewardCtx(opts) {
    opts = opts || {};
    var gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : (state.goalProgress || null);
    var star = (state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) || '';
    var shape = resolveRewardShape();
    var today = (typeof actionDayKey === 'function') ? actionDayKey(new Date()) : new Date().toISOString().slice(0, 10);
    var ctx = {
      shape: shape, star: star, gp: gp, today: today,
      prevValue: (opts.prevValue !== undefined) ? opts.prevValue : (gp ? gp.current : null),
      userSaysDone: !!opts.userSaysDone,
      askedDay: gp ? gp.askedDay : '',
      goalDone: opts.goalDone || state.goalDone,
      ledger: opts.ledger || (state.rewards && state.rewards.ledger) || {}
    };
    if (shape === 'count') {
      /* total completed actions is the honest count until the new day
         records carry per-goal totals (foundation writes those next) */
      ctx.count = (state.action && Array.isArray(state.action.completionHistory))
        ? state.action.completionHistory.length : 0;
      ctx.countTarget = opts.countTarget; /* undefined -> Infinity: shadow never false-finales */
    }
    if (shape === 'duration') {
      ctx.daysHeld = (state.streak && state.streak.count) || 0;
      ctx.daysTarget = opts.daysTarget;
    }
    return ctx;
  }

  /* The real call (Rewards phase 1+ renders what this returns). */
  function rewardMoment(opts) {
    var ctx = buildRewardCtx(opts);
    return RewardReferee.decide(ctx);
  }

  /* Phase-0 shadow: same decision, twin persisted stores, log only. */
  function rewardShadow(source, opts) {
    try {
      if (!state.rewards || !state.rewards.shadow) return null;
      opts = opts || {};
      opts.goalDone = state.rewards.shadow.goalDone;
      opts.ledger = state.rewards.shadow.ledger;
      var res = rewardMoment(opts);
      var entry = {
        t: Date.now(), source: source, tier: res.tier,
        key: (res.event && res.event.key) || (res.receipt && res.goalKey) || '',
        reason: res.reason || ''
      };
      if (!Array.isArray(state.rewards.shadowLog)) state.rewards.shadowLog = [];
      state.rewards.shadowLog.push(entry);
      if (state.rewards.shadowLog.length > 60) state.rewards.shadowLog.splice(0, state.rewards.shadowLog.length - 60);
      try { console.info('[reward_shadow]', source, res.tier, entry.key); } catch (e) {}
      try { persistNow(); } catch (e) {}
      return res;
    } catch (e) { return null; }
  }

  window.resolveRewardShape = resolveRewardShape;
  window.buildRewardCtx = buildRewardCtx;
  window.rewardMoment = rewardMoment;
  window.rewardShadow = rewardShadow;
})();
