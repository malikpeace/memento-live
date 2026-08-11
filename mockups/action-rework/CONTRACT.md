# ACTION REWORK — the build contract (every agent reads this FIRST)

Malik tore up the Action module (2026-08-11): "the only thing I like is the
graph background... the rest of it, tear up and rebuild from the very
beginning." You are building ONE fragment set for a 43-design gallery. Your
designs must be GENUINELY different from each other and from the old module.
If your five could be described by one sentence, you failed.

## Hard DNA (never break these)
- Dark-first: page #0a0b0d, near-black surfaces. Sharp: radii 8-16px
  (999px only for true pills). Font: Geist ONLY (already @font-face'd by the
  kit as 'Geist'; weights 400/500/700). Tabular numerals for every number:
  font-variant-numeric:tabular-nums.
- BANNED, zero exceptions: serifs, gold/warm-cream, purple, emoji as icons,
  eyebrow labels (tiny uppercase tracked kickers), em dashes in copy,
  dimmed body text below ~0.9 opacity, borders on boxes (use fill + inset
  highlight instead), decorative looping animation.
- Glass surfaces when a box sits on the grid: near-opaque dark fill
  rgba(22,25,31,.92-.96) + backdrop-filter blur + inset 0 1px 0 highlight.
  The grid must NEVER read through a content box (Malik's direct note).
- THE GRID is the one survivor: neutral graph-paper lines, rgba ink at low
  alpha, NEVER a colour hue. Heat/energy may only be expressed as line
  brightness or concentration. The kit provides .grid; use it.
- Voice: plain, direct, second person, sentence case. No hype, no
  "you're ahead of X% of people", no streak-shaming. Units singularize
  (1 message / 2 messages).

## Fragment format (strict, the build script depends on it)
One file per design at mockups/action-rework/frag/<key>.html:

<section class="cell" data-k="<key>">
<style>
/* EVERY selector scoped under [data-k=<key>] . No exceptions. */
</style>
<h3><Name></h3><p class="cap"><one sentence: the concept and why it is different></p>
<div class="ph"> ...phone screen content... </div>
</section>

- The kit gives you: .ph (300x650 phone, dark, rounded, position:relative),
  .desk (720x420 desktop frame), .grid (absolute inset neutral grid layer,
  put it first inside .ph/.desk), tokens --ink/--text-hi/--text-mid/--text-lo.
- Put content in absolutely/flex positioned children of .ph. No external
  assets, no libraries, no images. Inline SVG allowed. Tiny inline JS
  allowed only for a demo interaction (a slider that moves a number).
- Mechanics (mx-*) fragments contain BOTH a .ph and a .desk frame showing
  the same mechanic translated to touch and cursor.

## Category briefs
- ob-1..ob-5 ONBOARDING: one screen that shows the person their Neutron
  Star (their goal sentence + what they want to achieve) and nothing else.
  Example star: "I will get to $3,000 a month so I can quit the warehouse."
  Five totally different presentations (scale, typography-first, spatial,
  object-like, progressive). No forms, no questions here.
- q-1..q-3 QUESTIONNAIRE: a short refine step: what have you already done +
  what do you think it takes. Tappable choices preferred over bare text
  boxes (app law), free field underneath. Three different structures
  (e.g. chips, conversational one-at-a-time, split board).
- ld-1..ld-5 LOADING: producing their action plan (takes ~30-90s). Five
  different ideas that make the wait feel like WORK BEING DONE on their
  goal (not a spinner). May use the grid as the medium. Quiet motion OK
  (no loops that read decorative; motion must convey progress/meaning).
- lp-1..lp-20 DAILY LOOP: the main screen. UNIVERSAL templates: number
  slots that any goal can fill. Spread: lp-1..5 numbered-up goals (revenue,
  reps), lp-6..10 numbered-down (weight, screen time) + milestone arcs,
  lp-11..15 open/practice + frequency (3x week, rest days designed),
  lp-16..20 maintenance + quitting (binary). Each shows: the ONE thing to
  do now, any context number the shape needs (streak/day/week/total ONLY if
  it serves that goal type), a completion gesture, and a way to see or
  change intensity. Twenty different LAYOUT ARCHITECTURES: not one layout
  re-skinned. Think: full-bleed typography, split screen, stacked cards,
  timeline rail, canvas-center, bottom-sheet-first, radial, ledger row...
- mx-1..mx-10 INTENSITY MECHANICS: 10 different ways to scale today's
  action up or down (message 1 client ... 20 clients). Each is its own
  fragment with a phone version (touch) and desktop version (cursor).
  Ideas space: notched slider, stepper cards, pinch/stretch the number,
  stacked chips, pressure hold, ladder, dial ring, keyboard +/- with
  preview, drag the task card itself, choose-a-sentence. The mechanic must
  make the CONSEQUENCE legible (what changes when you go up or down).

## Difference law
Before writing, list (in a comment at the top of your file) the layout
archetype of each of your fragments in 3 words. If two share an archetype,
change one. The judge will kill lookalikes.
