# THE DAILY REWARD — MERGE CHECKLIST

Status: PARKED, approved by Malik 2026-08-13. Do not merge until he says merge.
This file is the complete instruction set for wiring the daily reward into
memento-app/ cleanly. Written so any agent (Claude or Codex) can execute it
cold, without this chat's context.

---

## 1. WHAT IT IS

A full-screen, flat-green confirmation page that appears the moment someone
completes an action toward their goal. It shows ONE thing: their lifetime
count of completed actions, drawn as a quiet visual (ticks, an odometer, a
staircase...). No confetti, no coaching, no percentage. It is the everyday
"you showed up" beat, the layer BELOW milestones. Duolingo-simple on purpose:
the whole app exists for people who want to go deeper; this page is 2 seconds.

Mockup (source of truth): `mockups/celebrate/daily.html`
- Renderers: `mockups/celebrate/_daily-live.js` (the `R = {}` registry, one
  function per concept, each takes `(dst, {total, cad})` and writes innerHTML).
- Styles: the `LIVE_CSS` string in `mockups/celebrate/daily-build.py`,
  specifically the `.ph.live` block (the green page) + per-concept classes.
- Port VERBATIM (ship-picked-mockups-verbatim law). Do not remix, restyle,
  or "improve" values during the port.

The 8 concepts, in gallery order:
1. `t-path`  — Path of days (THE DEFAULT). One tick per action, rows.
2. `n-odo`   — The odometer. Digit wheels in recessed slots.
3. `n-ghost` — Yesterday behind you. Past numbers climbing above today's.
4. `t-month` — The rolling window. One tile per action, count below the grid.
5. `o-thread`— The thread. One serpentine line, one dash per action.
6. `t-steps` — The staircase. One step per action, switchback flights,
               milestone lines at 10/50/100/200/300.
7. `a-field` — The field. Phyllotaxis bloom, slowly rotating.
8. `t-stamp` — The stamp. A logbook: today's date big, recent dates listed.

## 2. WHAT IT DOES / DATA CONTRACT

- Input 1: `total` = lifetime count of completed actions for the ACTIVE goal.
  Integer, starts at 1 (it renders on the first-ever completion), NEVER
  decreases, no cap in state (renderers clamp drawing at 365 and say
  "plus N more").
- Input 2: `cad` = the goal's cadence, one of `daily | freq | maint`, which
  drives the unit word via `unitWord(n, cad)`: moves / sessions / days held
  (singular handled). "banked" is a DEAD word, never reintroduce it.
- A "move" is action-agnostic: whatever action the user defined for their
  goal (a weigh-in logged, a $100 payment, a check-in for maintenance). The
  page never interprets the goal, it only counts completions. This is what
  makes it universal; do not add per-goal-type logic.
- PROVENANCE LAW: nothing fabricated. The stamp's date list is faked in the
  mockup (walks backward from today); in the app it MUST come from the real
  action log. If real dates aren't available at merge time, ship without the
  stamp concept rather than fake dates.

## 3. WHEN IT SHOWS UP (the referee — BUILD THIS FIRST)

Exactly ONE reward fires per completion. Highest tier wins:

```
onActionCompleted(goal):
    total = goal.completedCount            // already incremented
    if goalReached(goal):        show BIG GOAL ceremony     // the huge one
    else if milestoneFires(...): show MILESTONE ceremony    // chooser.js logic
    else:                        show DAILY REWARD          // this page
```

- The daily reward REPLACES the current green flash: today, completing an
  action calls `celebrateDone(el)` (defined in
  `memento-app/js/04-templates-proof.js:210`, called from
  `js/07-sheet-templates.js` and `js/02-clarity-experience.js`). At those
  call sites, route through the referee instead. The old flash can remain
  for sub-action ticks if something still needs it, but a completed action
  gets the page, not the flash.
- Milestone logic lives in `mockups/celebrate/chooser.js` (27 passing tests
  in chooser-tests.html): day-ladder 7/30/50/100/200/365, fifths, records
  with margin + cooldown, coalesce-to-furthest, once-only ledger. Port it
  with its tests.
- Dismiss: TAP anywhere, no auto-dismiss, no timer (Malik's call: watch it
  0.4s or 40s). Also dismiss on hardware back / route change.

## 4. HOW TO MERGE IT CLEANLY (step by step)

Phase 0 — prep
- [ ] `git pull --rebase origin main` first; work in the module files below,
      never `git add -A`.
- [ ] Read CLAUDE.md fully (visual contract, safe areas, no-blur-cheap laws).

Phase 1 — the referee
- [ ] Implement the one-reward-per-completion switch (Section 3) where
      `celebrateDone` is currently triggered for completed actions.
- [ ] Port `chooser.js` + its tests. Verify 27/27 still pass.

Phase 2 — the page
- [ ] New file `memento-app/js/22-daily-reward.js`: port `unitWord`, the
      `R` registry (all 8 renderers), and a tiny controller:
      `DailyReward.show({total, cad})` builds the overlay, renders the active
      concept, plays the entrance stagger; tap destroys it.
- [ ] Styles into `memento-app/css/action.css` (completion UX lives with
      Action) or a new `daily-reward.css` loaded from index.html: copy the
      `.ph.live` green-page block + concept classes from LIVE_CSS. The page
      bg is flat `#12833a`, marks white, NO blur, NO gradients, NO borders.
- [ ] BUILD-ON-OPEN / DESTROY-ON-CLOSE (the record-must-not-outlive-its-view
      law + hidden-animations law): create the DOM when it fires, remove it
      on dismiss. No persistent hidden overlay, no `fill: forwards` holds,
      the field's infinite spin must die with the element.
- [ ] Full-screen sizing: `height: 100lvh` (NOT inset:0/100dvh, proven short
      on-device). Content clears `var(--safe-t)` and `var(--safe-b)`.
- [ ] ALL 8 CONCEPTS SHIP AT MERGE, swipeable (Malik, 2026-08-13). The page
      is a horizontal pager, iOS-Photos simple: one full-screen concept per
      pane, swipe left/right with scroll-snap (`scroll-snap-type: x
      mandatory`), every pane rendered from the SAME `{total, cad}` so the
      view is identical data in 8 skins. No visible chrome needed beyond the
      swipe itself; keep it dead simple.
- [ ] The app REMEMBERS the last style: persist `state.dailyRewardStyle`
      (default `'t-path'`) whenever a swipe settles; next completion opens
      directly on that style, still swipeable. Tap still dismisses from any
      pane (a tap, not a swipe-end, so the two gestures can't collide).
- [ ] Entrance: the existing stagger (translateY + fade, ~0.5s, ease-out).
      Respect `prefers-reduced-motion` (mockup already does; keep it).
- [ ] The count increments BEFORE the page renders, so the number shown
      includes today's action (day 1 shows "1 move").

Phase 3 — verification (mandatory, the hook enforces it)
- [ ] Screenshot the real page (drive a real completion, not a reconstruction)
      at 390x844 AND 1440x900, dark AND light. Decision recorded below: the
      page is identity-green in BOTH themes (it is a reward flood, like the
      milestone accent flood, not an everyday surface). If Malik overrules,
      re-read the theme rules before changing anything.
- [ ] Tall-window pass (~1160x1500): the visual must stay centered, no
      margin:auto overflow traps.
- [ ] iOS device pass: safe areas, the tap-to-dismiss, and PERF at total=365
      (path, staircase, field are 300+ element renders; if they jank on an
      old phone, cap drawn elements harder, the "plus N more" line already
      handles overflow honestly).
- [ ] All three cadences render correct words; total=1 shows singular.
- [ ] Zero console errors. Bump `?v=` + MEMENTO_VERSION.
- [ ] Sim check: fire 90 days x the 4 demo personas (`?demo=`), confirm the
      referee never double-fires and the daily shows on plain days only.

Phase 4 — after merge
- [ ] Instrument silently (existing analytics): daily_reward_shown,
      style_key, ms_until_dismiss. The open question this layer must answer
      with data: does it move day-2 return?

## 5. KNOWN ACCEPTED NITS (do not "fix" silently)

- Staircase at ~40-60 total (exactly 2 flights) reads chevron-ish. Accepted.
- Stamp maintenance copy "N days held recorded" is slightly clunky. Accepted.
- Renderers clamp drawing at 365 and add "plus N more". Intentional.

## 6. DECISIONS, ANSWERED BY MALIK 2026-08-13 (no longer open)

1. Count is PER-GOAL. Each goal has its own total and its own reward. A
   global all-goals count is a memento-area idea, NOT this page.
2. All 8 styles ship at merge, full-screen, swipe left/right between them
   (iOS-Photos simple), all showing the same view; the app remembers the one
   they were on and opens there next completion. (Wired into Phase 2 above.)
3. SILENT. No sound cue, ever ("noise would be annoying after a while").
4. The daily reward stays GREEN in light AND dark mode, always. The
   milestone/celebration ceremonies are the themed ones; this page is not.
