# MILESTONE / CELEBRATIONS MERGE CHECKLIST

Status: PARKED. Companion to DAILY-REWARD-MERGE-CHECKLIST.md. Do not
merge until Malik says merge. Written so any agent can execute it cold.
Gallery: mockups/celebrate/index.html →
https://malikpeace.github.io/memento-live/mockups/celebrate/

---

## 1. WHAT IT IS

The LOUD layer of the reward system: full-screen, multi-beat ceremonies that
fire on rare, earned moments (a fifth of the goal crossed, day 30 held, a
record broken, the thing actually achieved). Memento sorts every goal into
families and each family answers "what did you just do" differently:

- `quantity-up`   (qu) — a number rising (users, revenue, subscribers)
- `quantity-down` (qd) — a number falling (weight, debt, screen time)
- `frequency`     (fr) — a rate held (run 4x/week, write daily)
- `maintenance`   (mt) — a line held (sober, under 180, no-buy)
- `milestone`     (ms) — a binary event (passed the bar, shipped it)
- `refinements`   (rf) — the four cross-family screens Malik picked
  (The Gap, The Fall, The Record, The Card Takes It)
- `open`          (op) — PARKED, DO NOT WIRE (no honest trigger exists;
  they'd need AI-detected shifts in reflections, which isn't built).
  op-3 was REJECTED outright 2026-08-13; op-1/op-2/op-5 he likes.
- `evolution`     (ev) — DELETED at Malik's ask 2026-08-13 ("they're bad,
  can't see myself using them"). Page removed from the gallery. Nothing to
  merge, ever, unless he restarts that track himself.

Source of truth:
- Screens: `mockups/celebrate/frag/*.html` assembled by `build.py` from
  `manifest.json`. Port VERBATIM (ship-picked-mockups-verbatim law).
- WHICH screens to port: the VERDICTS map in `build.py`, rendered as badges
  on every gallery screen. GREEN = Malik approved, port it. YELLOW =
  changed since his review / ungraded, get his grade before porting.
  RED = rejected, never port. Re-read the badges at merge time; they are
  the acceptance record.
- Firing logic: `mockups/celebrate/chooser.js`, with 27 passing tests in
  `chooser-tests.html`. Port together with its tests.
- `field-test.html` is a dev rig (sliders driving the real chooser). Never
  ship it; optionally keep as a dev-only page for QA.

## 2. THE CONTRACT EVERY SCREEN OBEYS (do not break in the port)

- THREE BEATS: (1) the fact, (2) what it cost / where it came from,
  (3) the plain line that goes into their Memento. TAP to advance beats.
  NEVER auto-dismisses.
- ONE moment of colour per screen, driven by the user's chosen Memento
  accent (CSS var, not hardcoded). These ceremonies are THEMED, unlike the
  daily reward which is always green. Verify on all 6 accents.
- Milestone (ms) family: the LAND beat floods the full accent colour with
  the dark M (`#0b0e12` ink), already verified readable on all six accents;
  receipts return to dark.
- Confetti fires ONLY on day-ladder hits + FINAL milestones (+ ms-2 by his
  explicit call). Accent shades + white, the ported onboarding mechanic.
  Flat accents everywhere else, NO glows/halos on data screens.
- The M appears once per screen, auto-injected by the kit, NEVER doubled
  (screens whose art already contains an M get nothing).
- PROVENANCE LAW (supreme): every number on screen must be derivable from
  (1) their Clarity words, (2) actions they logged, (3) numbers they typed,
  plus arithmetic. Real numbers over derived math ("Run number 50", scale
  weights), no fabricated miles/dates/projections, percentages only where
  a real target exists.
- Voice: matter-of-fact, never coaches, no "It's not X, it's Y", no
  eyebrow labels, no gold/serif ever.

## 3. WHEN THEY FIRE (chooser.js is the referee's milestone arm)

One reward per completion, highest tier wins (shared with the daily):

```
if goalReached(goal):          BIG GOAL ceremony (the huge one)
else if chooser fires:         the goal-type ceremony for that event
else:                          the daily reward (see DAILY-REWARD-MERGE-CHECKLIST.md)
```

chooser.js decides "fires" from real state:
- fifths of a numeric target crossed (never percent-of-nothing)
- day-count goals: a rung EVERY 7 DAYS, forever (Malik 2026-08-13; replaced
  the old sparse 7/30/50/100/200/365 ladder; DAY_STEP in chooser.js).
  TWO INTENSITIES (his call, same day): weekly rungs are QUIET steps, full
  quality but calmer (intensity 'step'); the big round marks 100 / 200 /
  300 / 365, then every 100, fire ON their exact day as intensity 'bold'
  (bolder, clearer, confetti-tier) so a year never feels like week 14. A
  bold fire spends that week's quiet rung; they never stack. BOLD_DAYS in
  chooser.js, tested.
- unit-count totals (total runs, sessions): a rung EVERY 10 (COUNT_STEP)
- records broken (2% margin, 7-day cooldown so records can't spam)
- the first-move moment (their first ever logged action)
- multiple qualifying events on one day COALESCE to the furthest one
- a once-only ledger so nothing ever fires twice
Decided model: the daily layer can be toggled quiet in settings someday, but
milestones always fire (they're rare). Confirm this toggle's scope at merge.

## 4. HOW TO MERGE IT CLEANLY

Phase 0 — prep
- [ ] `git pull --rebase origin main`; module files only; never `git add -A`.
- [ ] Read CLAUDE.md + both checklists fully. Build the referee ONCE,
      serving both the daily reward and these ceremonies.

Phase 1 — logic
- [ ] Port chooser.js into memento-app (e.g. `js/23-celebrations.js` or
      alongside the referee) with its 27 tests runnable somewhere
      (dev-gated page or test harness). All 27 must pass after the port.
- [ ] Wire its inputs to real state: goal target/start/today from
      `state.goalProgress` + logged actions (js/01), day counts from
      consistency data (js/06 owns streak/day math; `consistencyStats` has
      `totalActiveDays`, NOT `total`).
- [ ] The once-only ledger persists in state (and survives resume: fires
      gate on their own persisted flag, never on "data exists", per the
      resume-never-lands-ahead law).

Phase 2 — screens
- [ ] Port ONLY green-badged screens, verbatim, as ceremony templates.
      Suggested home: with the other module screens in js/07 or a new
      `js/23-celebrations.js`; styles in `css/action.css` or a new css file
      loaded from index.html.
- [ ] Accent comes from the user's Memento colour var; test every screen on
      all 6 accents, dark + light (these ARE themed surfaces, they follow
      the theme, unlike the daily's fixed green).
- [ ] Build-on-open / destroy-on-close, no fill:forwards holds, confetti
      cleans itself up (hidden-animations law: the v768 crash class).
- [ ] Full-screen: `height:100lvh`, content clears `--safe-t`/`--safe-b`.
- [ ] Beat advance = tap; also handle back/route-change dismissal. The
      ceremony marks its ledger entry only when SHOWN (witnessed), so a
      killed app never silently burns a milestone.
- [ ] Beat dwell pacing: the gallery's 3.6s/4.2s dwell was REVIEW-friendly
      pacing; retune for real use before calling done (recorded decision).

Phase 3 — verification (mandatory)
- [ ] 4-cell matrix per ported screen: 390x844 + 1440x900, dark + light,
      on the REAL surface via a real trigger (seed state with cheat tools),
      plus a tall window (~1160x1500) for these full-screen ceremonies.
- [ ] Sibling beats screenshotted side by side (beat composition law: one
      vertical skeleton, matching content line + CTA baseline).
- [ ] Persona sim: run the 90-day x 4-persona simulation through the
      referee; verify milestones fire on the right days, coalesce, never
      repeat, and suppress the daily on their day.
- [ ] iOS device pass: confetti perf, safe areas, tap-through feel.
- [ ] Zero console errors; bump `?v=` + MEMENTO_VERSION.

Phase 4 — after merge
- [ ] Instrument: ceremony_shown {family, event, ms_to_complete_beats}.
- [ ] Then revisit: the settings toggle scope, and the Open family's future
      trigger (AI-detected shifts) stays parked until that feature exists.

## 5. EXPLICITLY OUT OF SCOPE FOR THIS MERGE

- The `open` family (parked, no honest trigger).
- The `evolution` family (card history: grain/rim laps; separate system that
  composes under skins; its own plan lives in memory + UNLOCK-THEMES notes).
- The daily reward (its own checklist, DAILY-REWARD-MERGE-CHECKLIST.md).
- Any new screen, colour, font, or layout language not already in the
  gallery (no-new-fonts-colors-ever law).

## 6. DECISIONS + REMAINING QUESTIONS

ANSWERED by Malik 2026-08-13:
1. The BIG "goal reached" ceremony gets ITS OWN DEDICATED BUILD: a new
   "BIG ASS CELEBRATIONS" design family inside the celebrations gallery,
   multiple full options for him to pick from for the moment someone
   reaches their MASSIVE goal. He likes the current milestone screens'
   concept + look (the full-colour flood with the M) as the direction, but
   the grand finale must be designed separately and be FUCKING GREAT.
   THIS FAMILY MUST EXIST AND BE PICKED BEFORE THE MERGE SHIPS a
   goal-completion path. (Not built yet; queued.)
2. Day-rung intensity split: weekly = quiet step, round marks = bold.
   In chooser.js, done, tested.

STILL OPEN (answer before or at merge):
1. Yellow-badged screens: grade at merge time, or ship green-only?
   (Only rf-card remains yellow after the 2026-08-13 round.)
2. The quiet toggle: daily-only, or daily + goal-type ceremonies (with
   milestones always on)? Recorded intent says tier 3 always fires; confirm
   where tier 2 sits.
