# PHASE 1 — THE DAILY REWARD (the green page)

Replaces the bare green flash with the full green confirmation page. The
biggest daily-felt win in the whole saga: 100% of users see this, every
completion. Detailed per-screen decisions live in
`../DAILY-REWARD-MERGE-CHECKLIST.md` (still canonical); this doc is the
order of operations against the phase-0 plumbing.

## Locked decisions (Malik, do not reopen)
- It IS the hold-to-confirm moment: tier 'daily' from the referee renders
  the full FLAT green page (#12833a, both themes, no gradient) instead of
  `celebrateDone()`'s flash. Tap to dismiss, never a timer. Silent.
- ALL 8 styles ship, behind an iOS-Photos-simple left/right swipe; the app
  remembers the last style (state.rewards.dailyStyle). "Path of days" is
  the default.
- The count is PER-GOAL and never falls. "banked" is dead as a word.
- Consistency is NOT this layer's job (no streak anxiety here).

## Build
- [ ] New files only: `css/rewards-daily.css` + `js/24-rewards-daily.js`,
      ported VERBATIM from `daily-build.py` LIVE_CSS + `_daily-live.js`
      renderers. Register in index.html, bump versions.
- [ ] Flip the phase-0 shadow switch for tier 'daily' only: decide() writes
      real ledger state now; 'milestone'/'finale' tiers still fall through
      to nothing new (shadow) until their phases.
- [ ] Real dates law: the stamp/calendar styles read actual log dates from
      the action history, not fabricated backwards.
- [ ] Maintenance goals surface the page off their daily check-in action.
- [ ] The swipe picker uses the finale's proven pager pattern (follow the
      finger, snap to nearest, never between; pointer capture; touch-action
      pan-y).

## Verify (before phase 2)
- [ ] 4-cell matrix on the REAL surface (hold-to-confirm through to the
      page), both themes (page stays green in both, text contrast checked).
- [ ] Day 1 / day 45 / day 200 counts; 365-element renders at 60fps
      ON-DEVICE (the perf item the checklist flagged).
- [ ] Relaunch mid-page: resume law (same spot or behind).
- [ ] The referee's 'none' day (post-finale) shows NO daily. Simulate.
- [ ] Safe areas: bottom edge on-device, no scrim bands.
