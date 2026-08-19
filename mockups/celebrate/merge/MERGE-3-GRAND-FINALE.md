# PHASE 3 — THE GRAND FINALE (ba-0 + the trigger + the hand-off)

The top of the pyramid. Fires once per goal, outranks everything, and the
day it fires nothing else shows. The trigger logic already exists (referee,
tested); this phase gives it its screen and its two missing pieces of UI.
Spec: `../GOAL-REACHED-SPEC.md` (sections 3-7 are law here).

## 1. The ceremony (port verbatim)
- [ ] ba-0 fragment + applier -> `js/26-rewards-finale.js` +
      `css/rewards-finale.css`. Includes: the mote spiral (Clarity's
      nsv2FieldSpiral values), the ~9s fireworks show, confetti behind at
      data-cfscale 0.55, the 3-slide pager (finger-follow, snap-to-nearest),
      the 3D sphere canvas, wallData, fitLine. Nothing re-derived by hand.
- [ ] Fullscreen surface mounted like the other ceremonies (dark-cinema
      root); beat 1 follows the theme, beats 2-3 are accent-flood
      (theme-proof). Desktop per Malik: everything centred, colour fills.
- [ ] Data handed in per the spec's section 6 table (line verbatim from the
      star; count; days; streak; active days for the consistency %; start /
      value / unit; money flag). NO hours anywhere.

## 2. The confirm question (new UI, small)
For target and event shapes only (count/duration fire straight from the
ledger):
- [ ] One quiet line in the app's own voice + two TAPPABLE choices (the
      choices law): "You said 200 lbs. Are you there?" -> [I'm there]
      [Not yet]. Event/dated goals use the star's words ("Did you pass the
      bar?"); the dated shape asks on/after its date.
- [ ] Where: a small sheet off the completion moment / Distance pulse, NOT
      a push notification, NOT a modal ambush on open.
- [ ] shouldAsk() gates it (once a day via gp.askedDay; never after the
      receipt; "Not yet" waits for the number to move again).
- [ ] Copy passes MALIK_VOICE.md; write 2-3 variants, Malik picks.

## 3. Receipt + suppression (already in the referee, wire it)
- [ ] decide() writes state.goalDone BEFORE the ceremony mounts (v1149 law:
      persist, then render).
- [ ] Finale day: daily + milestone suppressed ('none' tier) — verify the
      whole day, not just the moment.
- [ ] Goal #2, #3...: full finale again per goal (new starHash). Verified
      by test R6; verify once live anyway.

## 4. The hand-off (the hinge, minimum viable)
Finishing a goal starts the next one; the app must not go quiet at its
biggest moment:
- [ ] The last swipe slide keeps the note; DISMISS lands on a surface whose
      ONE primary action is "Name the next goal" (opens Clarity's star
      flow), with a quiet secondary "Not yet".
- [ ] The finished goal's record persists in state.goalDone (numbers +
      line); it does NOT vanish. (Displaying history inside the Memento
      view is the parked memento-view work, not this phase; do not build
      it here, just never delete the data.)
- [ ] The home card the day after: no dead "finished goal" state; if no new
      star yet, the card offers the same one action.

## Verify
- [ ] All four shapes end to end on-device (target confirm, event declare,
      count auto, duration auto).
- [ ] Relaunch right after firing: no re-fire; same-day completions: 'none'.
- [ ] Un-complete (edit yesterday's log): receipt stands.
- [ ] 0-move goal, 6-day goal (thin record), 2,000-move goal (sphere perf
      ON-DEVICE), money goal, 30-char goal line.
- [ ] 4-cell + tall window; bottom-edge/safe-area pass.
- [ ] The confirm sheet: both themes, choices tappable, wording approved.
