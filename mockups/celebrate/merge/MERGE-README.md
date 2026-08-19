# THE REWARDS MERGE — the spine

Written 2026-08-18, after the full pre-merge review (68 tests green, every
screen graded by Malik). Five plans, run IN ORDER. Each phase is
independently shippable and verifiable; nothing later starts until the
phase before it is verified on-device.

| Phase | Doc | What ships | Runs |
|---|---|---|---|
| 0 | MERGE-0-FOUNDATION.md | chooser + referee ported, state fields, ONE entry point (shadow mode) | SOLO |
| 1 | MERGE-1-DAILY-REWARD.md | the green page replaces the flash, 8 styles, swipe picker | module work |
| 2 | MERGE-2-MILESTONES.md | the along-the-way ceremonies (qu/qd/fr/mt/records) + custom sub-goals | module work |
| 3 | MERGE-3-GRAND-FINALE.md | ba-0, the confirm question, the receipt, the hand-off | module work |
| 4 | MERGE-4-OPEN.md | nothing (parked until AI-detected wins exist) | n/a |

## Why phased, not one big merge
- Phase 0 touches SHARED files (js/01, js/07, js/03). By the multi-agent law
  that work runs solo and small. Everything after is render modules that
  touch only their own new files plus one call site.
- Each phase has its own kill switch: if phase N misbehaves on-device, roll
  it back without touching the phases before it.
- The referee makes the phases safe to ship out of lockstep: a tier with no
  renderer yet falls through to the old behaviour (see Phase 0 shadow mode).

## The laws that bind every phase (do not re-litigate)
1. ONE reward per completion: finale > milestone > daily. The referee is the
   only decider; no screen self-triggers. (referee.js R1/R2)
2. Fired = witnessed = never re-earned. Ledger and receipts persist; resume
   lands same-spot-or-behind, never ahead. Receipt/ledger writes BEFORE
   render (the v1149 law).
3. NOTHING FICTIONAL: every number and date on a ceremony comes from real
   logs. The galleries back-calculate dates and pace from sliders; the app
   must read real dates (the chooser LEDGER stamps the real fire date per
   mark, use it). No invented hours, no interpolated dates.
4. Silent, always. Tap to dismiss, never a timer. (js/20-sound stays out.)
5. Confetti fires only where the chooser marks it (day-ladder hits + finals
   + the finale). Rarity is the point.
6. Copy in ceremonies obeys MALIK_VOICE.md. No em dashes, no "It's not X,
   it's Y", no eyebrow labels, questions arrive as tappable choices.
7. Port VERBATIM from the graded mockups (fragments + _tweaks appliers +
   chooser.js + referee.js). When a value must change, it is a decision,
   not a tidy-up.
8. Every visual surface passes the 4-cell matrix (390x844 + 1440x900, dark
   + light) plus a tall window for full-screen ceremonies, ON THE REAL
   SURFACE, before "done". Preview cannot show safe areas; reason + verify
   on-device for bottom/top edges.
9. Versioning: bump ?v=vNN + MEMENTO_VERSION together per release (the
   gallery just relearned WHY: three tags on one line sat pinned at tw18
   for a week because sed without /g bumps only the first).

## The connections map (how this fits the rest of Memento)
- ENTRY POINTS (both route through the referee, nothing else decides):
  1. Action completion: `_creditAction()` in js/07 (+ the js/08 mirror).
  2. Progress pulse: `goalProgressUpdate(value)` in js/03 (the Distance
     page / pulse sheet update), which can cross marks without an action.
- STATE: `state.goalProgress` (exists), `state.goalDone` (new, receipts),
  `state.rewards` (new: chooser ledger + daily style pick). All persist via
  js/01 and sync via js/12 automatically once registered in js/01.
- CLARITY'S DISTANCE PAGE is the always-on VIEW of the same numbers; the
  ceremonies are the MOMENTS. Same state, no duplication: after a ceremony
  dismisses, the Distance page already reflects the new standing.
- THE ACTION CHIP (62/100, v1113) reads the same goalProgress. No change.
- GOAL SHAPES map from Clarity's own three page-shapes: number goal ->
  target; maintain/open -> duration (with check-ins) or records (no
  number); dated milestone -> event (the date arms the confirm ask).
- DEMO PERSONAS (js/10): seed a mid-goal ledger + one goalDone receipt so
  ?demo=founder shows the system without firing ceremonies at first open.
- DEV PREVIEW: keep a `?dev=rewards` param that mounts any ceremony with
  fake data (URL-gated like ?dev=beats, inert for customers).
- ANALYTICS: log tier + key per fire through the existing silent activation
  analytics, so drop-off around ceremonies is measurable.

## Open decisions — ALL RESOLVED
- THEME, decided by Malik 2026-08-18: the milestone ceremonies are
  THEME-FAITHFUL. They follow the app's light/dark setting (the appearance
  picker that already exists), via ONE root rule exactly like the gallery's
  token block, never per-screen opt-outs. The daily is green in both
  (locked); the finale is accent-flood (theme-proof) with only beat 1
  following the theme.
- ms/rf leftovers: rf-gap is CUT at merge (qu-1 absorbed it); rf-fall and
  rf-rec ship in phase 2.
