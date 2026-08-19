# PHASE 0 — FOUNDATION (solo, shared files, ships dark)

The plumbing every later phase stands on. Nothing visible changes for users
in this phase; that is the point. Run it when no other agent is working.

## 1. Port the logic, verbatim
- [ ] `mockups/celebrate/chooser.js` -> `memento-app/js/22-reward-chooser.js`
      (new number; 21 is taken, the gap at 16 stays a gap). Change ONLY the
      IIFE export name if needed; zero logic edits.
- [ ] `mockups/celebrate/referee.js` -> `memento-app/js/23-reward-referee.js`.
- [ ] Add both to index.html's script list + bump ?v= / MEMENTO_VERSION.
- [ ] Run the test pages against the PORTED files once (point
      chooser-tests.html + referee-tests.html at ../memento-app/js copies in
      a scratch checkout, or diff the files byte-for-byte against the
      mockups). 42 + 26 must pass. Do not ship if they do not.

## 2. State (js/01, SHARED — smallest possible diff)
- [ ] `state.goalDone = {}` — finale receipts, keyed by starHash. Never
      cleared except by explicit full reset; NOT keyed to entitlement.
- [ ] `state.rewards = { ledger: {}, dailyStyle: 'path' }` — the chooser's
      once-only ledger + the daily style the user last swiped to.
- [ ] Normalizers in the same place the other state fields get theirs
      (~js/01:1937 pattern). Persist + cloud-sync ride for free.
- [ ] Migration: absent fields initialize empty; nothing backfills. An
      existing user's first mark can fire late rather than wrongly.

## 3. Direction fix (js/03, SHARED, pre-existing bug)
- [ ] `goalDistanceLine()` assumes rising (`gained > 0`). Fix per spec:
      direction from baseline vs target; pace/ETA math respects down-goals.
      (The chooser port carries `direction()`; reuse it, do not re-derive.)

## 4. The ONE entry point (js/07 + js/03 call sites)
- [ ] `rewardMoment(ctx)` helper (lives in js/23 file, not inline): builds
      the referee context (shape, star, gp, count, daysHeld, prevValue,
      ledger, goalDone, today via actionDayKey) and calls
      `RewardReferee.decide()`.
- [ ] Call it from `_creditAction()` (js/07) and the js/08 bookend mirror,
      capturing prevValue BEFORE goalProgressUpdate writes.
- [ ] Call it from `goalProgressUpdate()` (js/03) for pulse-crossed marks.
- [ ] SHADOW MODE: in phase 0 the result is only logged (analytics event
      `reward_shadow` with tier + key) and the ledger/receipt writes are
      made on CLONES, not state. The old green flash keeps running. This
      proves the referee against real usage with zero user-facing risk.
- [ ] Shape detection: target when goalProgress.target exists; duration when
      the star reads as maintain/held (Clarity's open shape) AND a daily
      check-in action exists; count when the star names a countable total;
      event when Clarity's dated shape. Store the resolved shape on
      goalProgress so it is computed once, not re-guessed per completion.

## 5. Verify before phase 1
- [ ] 42 + 26 tests green against ported files.
- [ ] Shadow logs over a few real days (or simulated day-walks with the
      dev date tools): tiers look right, no double-fires, no fire on
      relaunch, finale-day suppression correct.
- [ ] Zero console errors; app behaviour visibly unchanged.
- [ ] Commit ONLY the named files; push promptly (shared-file law).
