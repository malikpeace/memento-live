# PHASE 2 — THE MILESTONE CEREMONIES (along the way)

The referee's 'milestone' tier gets its renderers: the graded screens from
the qu / qd / fr / mt / records galleries, ported verbatim (gallery look +
rig dynamics). Per-screen history lives in
`../MILESTONE-CELEBRATIONS-MERGE-CHECKLIST.md`; this doc is the wiring.

## The event -> screen map (from the rig's own fire lines)
One chooser event, one screen. This table IS the router; put it in code as
a plain object, not scattered ifs.

| Chooser event | Screen | Note |
|---|---|---|
| family qu, kind step / first | qu-1 The marker posts (now The Gap style) | |
| family qu, kind record | qu-5 The record board | no-target rising goals |
| digit rollover (qu-2's own rule) | qu-2 Four figures | fires via its rig rule |
| family qd, kind step / first | qd-1 The slider down (Gap, reversed) | |
| family qd, kind record | qd-2 The record book | no-target falling goals |
| under-named-line first time (qd-3 rule) | qd-3 The number you carry | once ever |
| family fr, weekly rate held | fr-1 / fr-2 (fr-2 for the streak of weeks) | |
| kind count (the count ladder) | fr-3 The fiftieth | totals: 1,5,7,...,300,+50 |
| family mt, kind days (weekly rung) | mt-4 first seven, then mt-1 ledger | |
| family mt, month mark / BOLD day | mt-2 held to the date | bold = 100/200/300/365 |
| mt hard-days | mt-3 The hard ones | ONLY if hard days are truly logged |
| rf-fall / rf-rec | their own fires (debt fall, record grid) | rf-gap CUT (qu-1 absorbed it) |

Ambiguity rule: if two rows ever match one event, the more specific screen
wins once, the general one stays for next time. No screen renders twice for
one event (referee guarantees one event per completion).

## Locked laws for this phase
- Intensity: weekly day-rungs are QUIET steps; month marks step up; BOLD
  days and finals flood. Confetti only on day-ladder hits + finals.
- The flood beat = accent + dark M (kit's .b--flood recipe, one root rule).
- REAL dates on receipts: the ledger's stored fire-dates are the dates the
  screens print. Pace lines ("26 days closed the last 20") come from ledger
  date arithmetic, never linear interpolation.
- Beat composition law: the three-beat skeleton is shared; screenshot
  sibling beats side by side before done.

## CUSTOM SUB-GOALS (Malik 2026-08-16, new in this phase)
User-named middles ("run a 5K, then 10, then 20, then the marathon"):
- [ ] Chooser extension: `milestones()` accepts an optional
      `gp.customMarks` array (whole numbers between baseline and target,
      sorted in crossing order, target still appended last). When present
      it REPLACES the percent ladder. Same ledger keys ('mark-<value>'),
      same once-ever machinery, ~4 new tests (custom up, custom down,
      coalescing across several custom marks, custom + finale swallow).
- [ ] Where they get set: the goal setup / Tweak surface in Clarity (the
      Tweak sheet already exists); stored on state.goalProgress.customMarks
      keyed by starHash so a new star clears them.
- [ ] The Gap screens render custom marks with THEIR names when given
      ("the 10K") in the was/next copy; numbers otherwise.
- [ ] Cap: 12 custom marks (matches the ladder's density; more is noise).

## Build order
- [ ] `js/25-rewards-milestones.js` + `css/rewards-milestones.css`, ported
      fragment-by-fragment with its applier logic; router table on top.
- [ ] Flip the shadow switch for tier 'milestone'.
- [ ] THEME: apply Malik's dark-cinema vs theme-faithful call (pending; the
      gallery now shows both). Either way it is ONE root rule.

## Verify
- [ ] Each row of the map fired once via ?dev=rewards with real-shaped data.
- [ ] 4-cell matrix per screen family; tall-window for flood beats.
- [ ] A completion that crosses 3 marks at once: ONE ceremony (the
      furthest), the swallowed marks paid (check ledger).
- [ ] Relaunch during a ceremony: same spot or behind, never re-fires.
- [ ] Custom-marks goal end to end: set 4 marks, cross 2, finale swallows.
