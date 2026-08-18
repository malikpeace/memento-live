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

## THE PROVENANCE LAW (Malik, round 3, 2026-08-12) — supreme, no exceptions

Memento knows exactly three things and NOTHING else:
1. Their words from Clarity/intake (the star, the why, the deadline).
2. The actions they logged (completions, with accept-or-amend detail).
3. The numbers they typed in themselves (weight, screen time from their
   phone's own report, revenue).
Plus arithmetic on those. EVERY number, name and claim on ANY screen must
trace to one of these sources, and when the source is manual entry, the
screen must make that legible (an open "write today's number" row, "from
your Screen Time report"). No invented client names, no auto-known
results, no sensor data a PWA cannot have. A screen that cannot answer
"how would Memento know this" is wrong, whatever it looks like.

Rulings under the law:
- BARS IN ACTION: output bars only: a bar may exist only as the literal sum
  of logged actions toward a countable target (47 of 100 clients reached
  out). Money/weight/interpreted progress never gets a bar in Action.
- RESULT ENTRY lives per goal shape: daily-measured goals (weight, screen
  time) carry a quiet entry slot IN the daily loop; slow metrics (revenue)
  are entered at the weekly confirm in the sync box.
- LOGGING is accept-or-amend: one tap banks the planned thing; a quiet
  "it went differently" lets them correct the number/duration first.
- TIME ESTIMATES are the plan's own estimate and say so ("about 40 min"),
  never a measured fact.

## THE GLANCE LAW (Malik, grading round, 2026-08-13)

"A lot of them have WAY too much text... it also has the AI thing when it
has too many sentences and little phrases." So: a loop screen must read AT A
GLANCE, in about three seconds: what do I do, where am I. Concretely:
- ONE instruction sentence maximum. The action statement is the screen.
- No explainer sentences for things the layout already shows ("Every mark
  here is a weight you typed" under a field of typed marks is noise).
- Labels are three words or fewer unless they ARE the action.
- Provenance stays legible but moves into the QUIET layer (a source note,
  a lock glyph, an "As of Tuesday" that hides when fresh), never a paragraph.
- Many small sentences scattered around a screen is the AI tell. Cut, merge,
  or let the layout say it.

## PILLAR PURITY IN ACTION (Malik, 2026-08-13, on catching Descent)

"The action module should literally just show the ACTION right? ...i think
we're starting to do the thing when we merge modules together."
Clarity = where you stand. Consistency = the pattern. ACTION = today.

In an Action screen:
- ALLOWED: today's move and this week's plan; the PEN for daily-measured
  goals with only what writing needs (current value, tap to correct, stale
  mark, undo). Raw own-entries context where the ritual is a book. Sums of
  logged ACTIONS against the plan's own countable list (47 of 100 reached
  out, 93 of 120 sessions). The consequence of today's size choice.
  Quit's days-owned (the standing exception). Arrival day (a one-time
  hand-off).
- FORBIDDEN: goal-RELATIVE readings of measured metrics: "X to go",
  target/goal rails and ticks, start/delta stacks, distance to a floor,
  pace-vs-plan verdicts, pattern claims ("held five of the last seven").
  Those live on the Clarity and Consistency faces, one swipe away.

## THE SETTLED FLOW (Malik, 2026-08-14, final: the foundation)

Memento is a WITNESS WITH A CLOCK, never a coach. No encouragement register.
The daily Action screen, complete, is FIVE beats:
1. SEE IT: one sentence, the act. 2. SIZE IT: tap the number, three choices,
what today costs. 3. DO IT (deep work timer optional). 4. HOLD IT DONE.
5. THE DAY CLOSES: green beat -> Clarity's pulse asks its one number (only
when the goal has one, at that goal's cadence) -> rest: "That's the day.
See you tomorrow." (frequency people: "Back Thursday."). Tomorrow it resets.

THE ACTS LAW: moves are ACTS with a yes/no doneWhen, never outcomes.
"No bread with dinner" is a move. "Eat 2,400 calories" is an outcome wearing
a move's clothes and must never be assigned. A collapsed day never
invalidates the move (the boundary tonight survives a 12-hour morning).

Final rulings on screen contents:
- The statement's position bar DIES entirely. Sentence + size + cost + hold.
- THE PEN STAYS (writing today's number is today's act), with NO history:
  ledgers/books/night-charts of past rows leave Action. History is
  Consistency's; position is Clarity's.
- DAYS OWNED (quitting) is the ONE standing exemption: no goal number
  exists there; the count is the identity and the reason to hold tonight.
- This week's PLAN may show (rest-day lanes, which days are training days):
  a plan is not history and not position.

## ONE ASK (Malik, 2026-08-14, overrides "the pen stays")

His catch: the loop asking for today's weight AND the close's pulse asking
"where are you now" is the same question twice. So: THE ONLY ENTRY MOMENT
IN THE ENTIRE MODULE IS THE CLOSE (beat 5), in Clarity's voice, at the
goal's cadence (daily for weight/screen time, weekly for money, on-results
for school, never for quitting). NO in-loop entry fields, pens, write-in
lines or stepper entries exist on any Action screen. Every loop screen is
the same skeleton: sentence, size, hold, close. pu-1 is the one ask.

## THE ROOM, round 2 (same date)

All ten round-1 backgrounds killed except Rules ("not terrible"). His
brief: minimal, MONOCHROME, STATIC (he rejected every dynamic one), mature,
purposeful, locks you into the action. The grid worked because it felt like
a serious WORKBENCH; find that family without copying it. No blur, no
space, no abstract art, no motion, no mouse-following, nothing "AI".

## THE CREED (Malik, 2026-08-16: his goal philosophy, harvested for the
## logic page. Source: his grill answers + his video scripts in the repo
## root, "This Video is About Brain Rot" + "The fear of living a mediocre
## life". EVERY brief/plan/AI prompt reasons FROM these, never generic
## self-help.)
- FOCUS IS A SKILL. The brain constantly weighs what deserves attention;
  the phone wins when nothing on the table beats it. Removal alone leaves a
  void and a bored brain claws back to stimulation. The real lever: progress
  on a worthy goal with markers the brain can latch onto. That makes focus
  automatic instead of an uphill battle. (So screen-time plans PAIR removal
  with a named worthy replacement.)
- PAY THE BRAIN EARLY. The beginning is the hardest part because rewards
  have not arrived. People who work for years are not willpower freaks,
  they are being rewarded; if it felt like nothing they would stop. So make
  progress visible before results exist (logs, counts, markers). "2-3 weeks
  of actually trying, then it becomes automatic."
- NOT A ROBOT (fitness): the goal under the goal is being a healthy human,
  and a healthy human moves more. Athlete identity. A non-negotiable floor:
  the bar can drop, the day cannot. Never miss twice.
- GOALS ARE MATH. Decompose honestly once, then live the daily number. The
  logic page shows it as a literal EQUATION BLOCK (stacked terms, tabular
  numerals, result emphasized); derived numbers say "our estimate"/"likely".
- LEVERAGE: a few actions carry most of the result. ENVIRONMENT beats
  willpower. SHOWING UP compounds. REMEMBER WHY YOU STARTED.
- INPUTS, NOT OUTCOMES (Malik, 2026-08-16): you cannot force an outcome,
  you can only supply inputs. Plans and briefs assign inputs, the highest
  leverage acts available, stacked until missing the goal becomes the
  unreasonable result. The logic page states this on every brief.

## THE READING LAW (Malik, 2026-08-18) — every generated word
All AI-generated text a customer reads (the logic page, questions, the
action screens, pulses, closes) must sit at a 5th-grade reading level or
below. Short sentences. Everyday words. One idea per sentence. Terms of
art only when the person used them first (their "GPA", their "maintenance
calories" get explained in the same breath). ENFORCEMENT AT THE PORT: the
judge pass grades readability (Flesch-Kincaid <= 5.9 or equivalent) and a
failing plan regenerates with "say it simpler" notes. Mockup copy models
the law.

## THE APHORISM BAN (Malik, 2026-08-18, caught on lg-5)
Punchy epigram reasons are BANNED: "the fight is won before it starts",
"one tab is the whole discipline", "that's the whole game", "X is half the
Y", any koan-shaped line that sounds wise instead of saying the plain
reason. Every reason must be LITERAL: "so the phone cannot pull at you
mid block", "you will see progress here before the scale". If a line would
fit on a motivational poster, it is banned. Also: labels must be self
explaining. "The block / The rules / The ask" is banned label-speak; say
the thing itself ("90 minutes of deep work, minimum, every day").

## THE NO LIST + ANCHORS + STARTERS (Malik, 2026-08-18, from The ONE
## Thing / Essentialism review. Concepts only, never quote the books.)
- Naming: "the plate" is DEAD as a term. It is THE DAY (star act + up to
  two supports + the fold-away sizing).
- NO LIST (plan schema field noList, 2-3 items): every plan names what the
  person says NO to, pulled from their own conversation plus the bucket's
  standard enemies (weight: sugar, fast food; screen: TikTok, short form,
  scrolling in bed; deep work: anything that is not the goal). Judge pass:
  every NO must trace to the conversation or the bucket set. Lives on the
  logic page ("Say NO to:") AND as one quiet line on the day screen.
  Drift comes from adding, not quitting; the NO list is the wall.
- TIME ANCHORS (per-act optional field anchor): the AI attaches a when (a
  clock time or an event trigger) ONLY when the act is time-shaped AND the
  schedule is known. The judge rejects anchors on flexible count-acts.
  Never applied to literally everything.
- STARTERS (optional field starter): hard-to-start acts get "The first 2
  minutes:" on the logic page only. Sessions already have their starter
  (the Deep work door). No new day-screen UI.
