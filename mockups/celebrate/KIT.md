# THE CELEBRATION KIT — the contract every screen obeys

You are building ONE surface in a set of ~45. If your screen does not look
like it was cut from the same cloth as every other screen in this set, it is
wrong, no matter how good it looks alone. Read this whole file. Follow it
literally. Invent nothing that is not listed here.

Malik's exact fear about this build: "make sure the subagents don't make
random shit and follow a design flow that matches memento." This file is the
answer to that. Deviating from it is the only way to fail this task.

---

## 0. WHAT THIS IS

A celebration is what plays full-screen the instant someone crosses a real
marker on a goal. It is not a badge, not a point, not a level. Memento
**remembers what they did**; it never scores them.

It fires immediately on the act that earned it. A typical user should see
something small most weeks and a big one rarely.

---

## 1. THE THREE BEATS (every screen, no exceptions)

Every ceremony is exactly three beats. Never four. Sometimes the third is the
only one that persists on screen.

| beat | job | rule |
|---|---|---|
| **LAND** | the fact, alone | the number/event, nothing else on screen. This is the hit. |
| **WEIGH** | what it cost | the days, the reps, the distance still open. This is the meaning. |
| **KEEP** | the evidence | the one plain line that goes into their Memento, plus dismiss. |

Beats arrive on a timer AND advance on tap. See §4.

---

## 2. COLOUR

### The accent is the user's, not yours
Every screen reads its accent from CSS vars that the gallery sets. **Never
hardcode an accent colour.** Use exactly these:

```css
var(--accent)        /* the bright line/glow shade */
rgba(var(--accent-rgb), 0.42)   /* any glow, ring, wash */
var(--accent-strong) /* deeper fill, pressed states */
```

The gallery switches these live across cyan / green / amber / rose / blue /
teal. **Your screen must look correct in all six.** If it only works in green,
you have hardcoded something. Test by imagining it amber and rose.

### The one-accent rule
**Exactly ONE accent moment per screen.** One thing glows, one thing is
coloured, everything else is white/grey on near-black. Two accent moments is
the single most common way this set will start looking like AI slop. Pick the
one element that carries the meaning and let it be the only colour.

### The rest of the palette
```css
--text-hi   rgba(235,238,248,.96)   headline, the number
--text-mid  rgba(235,238,248,.78)   supporting sentence
--text-lo   rgba(235,238,248,.42)   tiny captions ONLY
--hairline  rgba(235,238,248,.09)
background: #000 inside the phone frame
```
Body copy stays BRIGHT (.78 and up). Malik has flagged dim body text many
times. Low alpha is for 11px captions only.

### BANNED, zero exceptions
Gold, brass, cream, warm-tan (`#ecd9a8` and family). Serif or display fonts of
any kind. Emoji. Confetti, particles, sparkle bursts, starfields. Badges,
medals, ribbons, trophies-as-icons, laurels. Progress rings that read as Apple
Watch. Purple-on-white gradients. Gradient text. Anything that looks like a
certificate, seal, stamp, or registry. Drop shadows with random values.

---

## 3. THE MARK

The Memento M, bare and notched. Exact path, never redrawn:

```html
<svg viewBox="0 0 512 512" aria-hidden="true">
  <path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/>
</svg>
```

**Never** put it in a box, circle, outline, or badge. It reads as an envelope
icon that way, which Malik killed app-wide.

Use it exactly ONE of these three ways, at most once per screen:
1. **Debossed on the card** — when the card is on screen, the mark is on it,
   `fill: rgba(255,255,255,.22)`, no filter.
2. **The survivor** — during a whiteout, the mark is the one dark shape left.
   `fill: #0e1218`.
3. **The foot** — a small quiet mark, 18px, `fill: rgba(255,255,255,.14)`,
   sitting near the bottom edge as a maker's mark. Never captioned.

A screen with no mark at all is fine and often better. A screen with two is
wrong.

---

## 4. INTERACTION (locked by Malik, do not change)

- **Tap advances.** Tapping anywhere jumps to the next beat immediately.
- **Beats also auto-advance** on their own timer if untouched.
- **It NEVER auto-dismisses.** The final beat sits until they close it.
- **No hold gesture.** Hold is Memento's commit verb and is used elsewhere; a
  second hold right after they held to complete an action is annoying. Tap only.
- The dismiss control is quiet: a plain text control, bottom, `--text-mid`.
  Never a big coloured button competing with the accent moment.

---

## 5. THE DEPOSIT (beat 3)

The ceremony ends by putting ONE plain line into their Memento. Show that line
on the final beat so they see what is being kept. Format:

> On this day, you lost 4 lbs.
> On this day at 4:12pm, you passed the bar.
> Day 100. The line held.

Rules: plain sentence, their real numbers, no adjectives, no exclamation
marks, no second person praise ("amazing!", "crushing it"). It reads like a
log entry because that is what it is.

Do NOT navigate to the card page. The deposit is silent and automatic; beat 3
only *shows* the line, it does not send them anywhere.

---

## 6. MOTION

- 150–400ms for elements. A full ceremony beat may run to ~900ms.
- ease-out entering, ease-in exiting. Never linear, never bounce-heavy.
- **Nothing loops.** No infinite animations, no breathing, no pulsing rings.
  A single settle is the entire vocabulary.
- Numbers count with `requestAnimationFrame`, ease-out cubic, 900–1400ms.
- `@media (prefers-reduced-motion: reduce) { * { animation:none !important; } }`
  and the screen must still read correctly at its end state.
- Never animate `filter`, `box-shadow` radius, or `backdrop-filter` params.
  Animate `opacity` and `transform` only. (This crashed iOS once already.)

---

## 7. TYPE

```css
.n        font-variant-numeric: tabular-nums; font-weight:800;
          letter-spacing:-.045em; line-height:.9;
.n--hero  font-size: 104px;      /* the LAND number */
.n--big   font-size: 68px;
.sub      font-size: 15px; color: var(--text-mid); font-weight: 500;
.cap      font-size: 12.5px; color: var(--text-lo);
```
Sentence case everywhere. **No uppercase tracked eyebrow labels**
("YOUR PROGRESS", "MILESTONE") — Malik reads those as AI slop. Build hierarchy
with size and weight.

---

## 8. VOICE

Second person, plain, no hype. Never congratulate with adjectives. State the
fact and let the fact be the reward.

- YES: "20 of 50." / "47 days made this." / "The line held 100 days."
- NO: "Amazing work!" / "You're crushing it!" / "Incredible milestone!"
- **NEVER** the construction "It's not X, it's Y." Malik's top banned phrase.
- **NEVER** em dashes or en dashes. Use commas, periods, or rewrite.

---

## 9. FRAME + MARKUP CONTRACT

Every screen you write is one fragment, in this exact shape:

```html
<div class="ph" data-c="UNIQUE_KEY">
  <div class="st">
    <!-- beat 1 -->
    <div class="b b1"> ... </div>
    <!-- beat 2 -->
    <div class="b b2"> ... </div>
    <!-- beat 3 -->
    <div class="b b3"> ... </div>
  </div>
</div>
```

- The kit's JS drives beats: it adds `.on` to the active `.b`, on a timer and
  on tap. You do not write beat sequencing JS.
- Phone frame is 390 wide, 760 tall, supplied by the kit. You style INSIDE it.
- Scope every rule you write to your `data-c` key:
  `[data-c="quantup-gap"] .thing { ... }`. Never write a bare `.thing` rule.
  Two agents will collide otherwise.
- Number counting: put `data-count="from|to"` on the element. The kit animates it.
- `.st` is already a centred flex column with 34px 30px padding.

---

## 10. THE SIX GOAL TYPES (from GOAL-TAXONOMY.md, locked, do not re-litigate)

| type | counts what | example | what triggers a celebration |
|---|---|---|---|
| **Quantity up** | a number rising | 100 paying users, $10k/mo | each fifth of target; or, with no target, each order of magnitude and each personal record |
| **Quantity down** | a number falling | lose 20 lbs, screen time under 1h | each fifth of target; or each unit crossed and each new low |
| **Frequency** | a rate of behaviour | run 4x a week, write daily | a week completed at rate; a run of such weeks; the 10th/50th/100th rep |
| **Maintenance** | a line held | stay sober, keep under 180 | time held: 7, 30, 100, 365 days; and hold-until-deadline completion |
| **Milestone** | a binary event | pass the bar, get the job | the event itself; plus the hidden engine underneath at intervals |
| **Open** | no measure they'd endorse | be a better father | time plus THEIR OWN WORDS reflected back at 30/90/180 days |

**A deadline flag can attach to any type.** Its variants: beat it early, land
it on the day, or (maintenance only) reach the date with the line unbroken,
which completes the goal.

Targets are OPTIONAL on quantity types. "Lose weight" with no number is a
valid goal and MUST still celebrate. Never invent a target the user did not
give.

---

## 11. THE HARDEST CONSTRAINT

Malik's brief: make someone feel rewarded **even if they have no number, even
if they are still far away, even when the goal has no end.** A celebration
that only works when a bar fills up has failed half the users.

So: the reward is never "you are X% done." The reward is evidence of what they
did. Days. Reps. Their own words. The distance closed, stated honestly
alongside the distance still open.

---

## 12. SELF-CHECK BEFORE YOU RETURN

Answer each honestly. Any "no" means fix it.

1. Exactly one accent moment?
2. Does it work in amber and rose, not just green?
3. Zero hardcoded accent colours?
4. Three beats, no more?
5. Tap advances, never auto-dismisses?
6. Beat 3 shows the plain deposit line?
7. Zero emoji, zero confetti, zero badges, zero serif, zero gold?
8. Zero uppercase eyebrow labels?
9. Zero em dashes anywhere in the copy?
10. Nothing loops; nothing animates filter or box-shadow radius?
11. Every CSS rule scoped to your `data-c` key?
12. At most one M, used one of the three sanctioned ways?
13. Would this read as a shipped Apple-grade screen on a real iPhone, or as a
    generic "achievement unlocked" popup? If the second, throw it out.
