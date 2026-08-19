# GOAL REACHED: how the app knows to fire the grand finale

Build spec for whoever wires this (Fable or Codex). Written 2026-08-16 against
the live app in `memento-app/`. Nothing here is built yet. The ART is done and
parked in `big-ass.html`; this document is the MISSING HALF: the trigger.

Read `MILESTONE-CELEBRATIONS-MERGE-CHECKLIST.md` first, it owns how the
ceremony renders. This one only answers "when does it fire, and how do we know
we are not lying".

---

## 0. The one thing to understand first

**Reaching the goal is the end of ONE goal, not the end of Memento.** (Malik,
2026-08-16.) The person finishes, they see the finale, and then they start
another goal. So this is not an exit screen, it is a hinge. Two consequences
that bind everything below:

1. All of this is **per goal**, never global. The ledger, the "fires once"
   rule, the counts on the wall: all keyed to the goal that just finished.
2. The finale must **hand off**. It ends on their record, then the app's next
   move is the next goal (see §7). Do not build a trigger that leaves the app
   with nothing to say the next morning.

---

## 1. What already exists (verified 2026-08-16, do not rebuild)

| Piece | Where | State |
|---|---|---|
| Parsed goal target from the star | `js/03-ai-integration.js` `ensureGoalTarget()` | LIVE. Parses the neutron-star sentence, keyed by `starHash`, resets when the star changes. |
| Progress pulses | `js/03` `goalProgressUpdate(value)` | LIVE. Writes `state.goalProgress` `{target, unit, baseline, current, updatedAt, history[]}` (`js/01` line ~99). |
| The distance line for the AI | `js/03` `goalDistanceLine()` | LIVE. |
| Action completion | `js/07-sheet-templates.js` `_creditAction()` + `celebrateDone()` in `js/04` | LIVE. This is the hold-to-confirm green flash the DAILY reward replaces. |
| Streaks | `consistencyStats()` (`current`, `longest`, `totalActiveDays`) + `state.streak.bestEver` | LIVE. |
| Milestone firing ladders | `mockups/celebrate/chooser.js` (39 tests) | BUILT, in the mockups only. Port it, do not redesign it. |

## 2. What does NOT exist (this is the work)

- **No goal-completion event of any kind.** Grep confirms: no `goalReached`,
  no `goalComplete`, nothing. Nothing anywhere in the app knows a goal ended.
- **No referee.** Nothing decides daily vs milestone vs finale.
- **No per-goal identity for the ledger.** `starHash` is the closest thing.
- **No hours.** The app records that an action was done, never how long it
  took. Every "hours logged" number was fiction and has been deleted from the
  BIG ASS screens. **Do not print hours unless someone first builds time
  capture**, and that is a product decision, not a wiring one.

---

## 3. Knowing it is done, per goal shape

Four shapes can finish. Each knows differently, and the confidence is
different, so the trigger is different.

### A. TARGET HIT (lose 30 lbs, pay off $8,000, get to 100 users)

Detection: `state.goalProgress`. The trap: `target`, `baseline` and `current`
do not carry a DIRECTION. "Lose 30 lbs" with a target of 200 counts DOWN;
"100 paying users" counts UP. `goalDistanceLine()` currently assumes rising
(`gained > 0`). Fix that first:

```
direction = (baseline === null) ? 'up' : (target < baseline ? 'down' : 'up')
reached   = direction === 'down' ? (current <= target) : (current >= target)
```

Confidence: HIGH on the number, MEDIUM on the meaning (the number is
self-reported and can be a typo, a bad scale day, or a one-off).
**Therefore: detection ARMS the finale, it does not fire it.** See §4.

### B. COUNT DONE (100 sessions, 50 runs, ship 12 essays)

Detection: the per-goal completion count from the action ledger, the same
number the daily reward shows. `reached = count >= target`.
Confidence: HIGH. This one is genuinely earned by the app's own records, so
it may fire directly with no confirmation.

### C. DURATION HELD (a no-buy year, 100 days sober, 90 days of writing)

Detection: days elapsed since the goal started, per the same day-key logic
the streak uses. `reached = daysSinceStart >= target`.
Confidence: HIGH for elapsed time, but **maintenance goals have a second
question the app cannot answer: did they actually hold it?** A no-buy year
where they logged nothing for six months is not a finished year. Require the
goal's own daily check-in to exist (this is already open question #5 in the
merge checklist) and require the run to be honest before firing.

### D. EVENT DONE (pass the bar, get the job, ship it)

Detection: **impossible.** There is no signal. Only the person knows.
This one is always user-declared. See §4.

---

## 4. The confirm step (the law that keeps it honest)

Never congratulate someone for something the app guessed. The finale is the
single most emotionally loaded screen in the product, and firing it wrongly
(a mistyped weight, a scale fluke) burns the whole thing.

So: for shapes **A** and **D**, detection opens a QUIET question, not the
ceremony. One line, one tap, the app's normal voice:

> **You said 200 lbs. Are you there?**
> `[ I'm there ]  [ Not yet ]`

- Asked at most **once a day** (reuse the `askedDay` field already sitting in
  `state.goalProgress`, that is what it is for).
- "Not yet" arms nothing and does not re-ask until the number moves again.
- "I'm there" fires the finale on the spot, that same session.
- For shape **D** the question has no number, it is the star's own words:
  "Did you pass the bar?"

Shapes **B** and **C** fire directly, no question, because the app's own
ledger is the evidence.

The instant it fires, write the receipt BEFORE rendering anything:

```js
state.goalDone = state.goalDone || {};          // keyed per goal, never global
state.goalDone[goalKey] = {
  day: dayKey, shape, declaredBy: 'user' | 'ledger',
  count, noun, days, streak, weeks, target, unit, money: bool
};
```

`goalKey` = the `starHash` of the star that was live when it finished. Write
it, persist it, THEN render. A ceremony that renders before it persists can
fire twice (this is exactly the class of bug that killed the card in v1149).

---

## 5. The referee (one reward per completion, highest wins)

Malik's law: at any given completion **exactly one** thing fires.

```
finale  >  milestone  >  daily
```

Build it as ONE function that every completion path calls, not as three
independent celebrations that each decide for themselves:

```js
function rewardFor(completionContext) {
  if (goalJustFinished) return { tier: 'finale',    ... };
  const mark = CHOOSER.markFor(...);      // ported chooser.js, unchanged
  if (mark)                return { tier: 'milestone', mark };
  return { tier: 'daily' };
}
```

Rules that come with it, all already proven in `chooser.js`:
- The finale **fires once per goal, ever**. Re-opening the app, re-logging,
  or editing yesterday's number must not re-fire it. Guard on
  `state.goalDone[goalKey]` existing, not on the numbers still being true.
- A fired mark **pays every mark it swallowed** (already implemented).
- The day the finale fires, **nothing else shows**. No daily, no milestone,
  no streak toast.
- The finale is **silent** (no sound) and **tap to dismiss**, never a timer.
- Resume law: relaunching lands on the same spot or a step behind, never
  ahead. The finale gates on its own `goalDone` receipt, not on the data.

## 6. What the ceremony needs handed to it

The BIG ASS screens read exactly this and nothing else (this is the full list
after hours was deleted):

| Field | Source | Note |
|---|---|---|
| `line` | the star, their own words | printed verbatim, never rewritten |
| `shape` | which of the four | drives copy and the wall's arithmetic |
| `start` / `value` / `unit` | `goalProgress.baseline` / `current` / `unit` | `$` prefixes when the unit is money |
| `days` | first log day to today | never invented |
| `moves` + `moveWord` | per-goal completion count + the action's own noun | 0 is legal; the walls fall back to days |
| `streak` | `consistencyStats().longest` / `state.streak.bestEver` | 0 is legal, the chip disappears |

Everything else on those screens (weeks, per-week average, the heat grid, the
spark count) is derived from these in `_tweaks.js` `wallData()`. Port that
function, do not re-derive it by hand.

## 7. The day after (do not skip this)

The finale ends on their record. Then Memento must hand them the next thing,
because they are starting another goal, not leaving. Minimum viable hinge:

1. The finale's last beat keeps its **Keep** button (currently decorative).
   Keep = the record goes into their Memento and the ceremony closes.
2. The next surface they land on offers **one** move: name the next goal
   (a new star), or park and come back. One primary action, nothing else.
3. The finished goal does not vanish. It becomes history the Memento holds.

Without this, the biggest emotional peak in the product is followed by an app
with nothing to say, which is the worst possible moment for that to happen.

## 8. Verification before this is called done

- Fire each of the four shapes end to end on a real device, not a reconstruction.
- Re-launch the app immediately after a finale: it must NOT fire again.
- Edit a past log so the goal "un-completes": the receipt stands, nothing re-fires.
- A goal finished with 0 logged moves: the walls fall back to days, no "0 moves".
- A goal finished in 6 days with 4 moves: the thin-record case, check the screen
  does not read as sad or empty.
- 2,000 moves: watch for jank, the spark wall animates one element per move.
- The day a finale fires: confirm no daily and no milestone also fired.

## 8b. The referee is BUILT (2026-08-16)

`referee.js` + `referee-tests.html` (23 tests green) now live next to the
chooser. Rules R1-R10 in its header implement sections 3-5 of this spec:
one tier per completion, finale > milestone > daily, receipt-guarded
once-ever, confirm-first for target/event shapes, direct fire for
count/duration, the finale pays swallowed milestone marks. Port BOTH files
verbatim at merge, the same way the chooser ports; the wiring (calling
`RewardReferee.decide()` from the completion path in js/07 and rendering
the returned tier) is the only merge-day work left in this layer.

## 9. Open questions for Malik

1. **ms-5 (the Milestone "cost" screen) is built entirely on hours logged.**
   Hours are not recorded. Either that screen dies, or the app starts capturing
   time per action. Which?
2. ANSWERED (Malik 2026-08-16): yes, goal #2 and every goal after fire the
   full finale again. A new star is a new climb. (referee rule R6)
3. ANSWERED (Malik 2026-08-16): the check-in IS the proof, nothing fancier:
   they log that they held it, that day counts. daysHeld = check-in-credited
   days. (referee rule R7)
4. When someone abandons a goal and starts a new star, the old goal's record:
   kept as history, or gone?
