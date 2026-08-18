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

    /* milestone: the chooser is the single source of truth (L1-L11) */
    var ev = null;
    try {
      var co = { gp: o.gp, star: o.star, ledger: o.ledger || {}, today: today,
                 prevValue: o.prevValue };
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
