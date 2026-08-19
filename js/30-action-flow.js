// ============================================================================
// 30-action-flow.js, THE ACTION FLOW (THE MERGE, phase 2: the five surfaces)
//
// Verbatim ports of the five picked mockups in mockups/action-rework/frag/:
//   ob-1  the wall of intent      -> ActionFlow.openIntent()
//   q-2   the refine conversation -> ActionFlow.openRefine()
//   ld-4  the working list        -> ActionFlow.openLoading()
//   lg-5  THE LOGIC               -> ActionFlow.openLogic()
//   u-1   THE DAY                 -> ActionFlow.openDay()
//
// PORT LAW (THE-MERGE resolution D): mockup geometry wins, app primitives win.
// The mocks are authored at 77% inside a 300x650 frame, so every size here is
// the mock's number x1.3 for the 390 device. Colours port BY ROLE onto app
// tokens (rgba(var(--ink),a) flips for light mode on its own); bottom CTAs use
// the app's standing button recipe (Clarity's nav geometry: 18px padding,
// --r-ctrl, --fs-lg/600, 28px + safe-b off the bottom = 62px on a real phone).
//
// THEME (resolution C): the day screen, the logic page, refine and loading are
// THEME-FAITHFUL (they follow light/dark through tokens). The onboarding wall
// is DARK CINEMA and keeps its dark room in light mode through ONE root rule
// on .afl--cine in css/action.css. No :has() theme opt-outs anywhere.
//
// SCOPE. This file renders FIXTURE plans (ACTION-PLAN-SCHEMA.md v1) so the
// surfaces can be graded before the brain exists. It owns no persistence, no
// entry wiring, no referee call and no ceremony:
//   - the completion hold runs to the green crest and shows the signed row;
//     the undo window -> pulse -> ONE rewardMoment -> ceremony -> rest line
//     sequence (resolution B) attaches at THE CLOSE SEAM, marked below.
//   - the deep work door renders but is INERT (phase 3.2 binds it to the
//     existing timer surface; there is never a second timer).
//   - entry wiring (post-ignition trigger, [Do] remap, router, resume) is
//     phase 3.1.
// Nothing here runs on its own: the module is inert until something calls it.
//
// Everything builds on open and is DESTROYED on close (the record-must-not-
// outlive-its-view law), which is also what stops every animation in here
// from holding a GPU layer forever (the hidden-animations law).
// ============================================================================
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // THE FIXTURES
  // Two personas. `plan` is ACTION-PLAN-SCHEMA v1 exactly (the logic page and
  // the day screen render it). `intake` is what Memento knows BEFORE the plan
  // exists: the star from Clarity and the refine answers. The wall, the refine
  // step and the loading screen render THAT, because at those three moments no
  // plan has been written yet.
  //
  // Every string obeys the writing laws: 5th grade, short sentences, no em
  // dashes, no aphorisms, "estimate" never "guess", nothing that cannot trace
  // to their own words (the provenance law).
  // ---------------------------------------------------------------------------
  var FIXTURES = {

    // ---- persona 1: weight. Real, honest arithmetic. --------------------------
    // 6'1, 300 lb, male, rarely moves. Mifflin-St Jeor gives a resting burn near
    // 2,375; a sedentary day multiplier (1.2) puts total burn near 2,850. Fifty
    // pounds at 3,500 calories each, spread over 180 days, is about 970 a day.
    // 2,850 - 970 = about 1,900, which clears the male intake floor (1,500).
    weight: {
      intake: {
        star: 'Lose 50lbs in 6 months so I look good for summer.',
        why: 'So I look good for summer.',
        deadline: '2027-02-15',
        // What Clarity already heard about their available time. THE SEAM: read
        // only through getClarityTimeAnswer(), which the wiring phase repoints
        // at the real transcript. Null here on purpose, so one fixture proves
        // the absent case (no line, no preselect) and business proves the other.
        clarityTime: null,
        // ob-1 presses the star apart into lines. Clarity does not store this
        // decomposition yet (see the report): the wall is fed it explicitly.
        wall: [
          { sm: 'I will lose', num: '50 lbs', mid: 'in 6 months' },
          { sm: 'so I', big: 'look good for summer' }
        ],
        bucket: 'weight',
        // ld-4 shows only what Memento already knows: their words, their
        // numbers, and arithmetic on the date they typed.
        facts: [
          { s: 'Your star, in your words.', t: 'Lose 50lbs in 6 months so I look good for summer.', q: true },
          { s: 'Why you said it matters.', t: 'So I look good for summer.', q: true },
          { s: 'The date you set.', t: '', date: '2027-02-15' },
          { s: 'The numbers you typed in the refine step.', t: '300 lbs this morning. 6 foot 1.' },
          { s: 'What you said you have already done.', t: 'You have tried diets before. You said you lose it, then gain it back.' }
        ]
      },
      plan: {
        v: 1,
        createdAt: '2026-08-19',
        starHash: 'fixw0001',
        bucket: 'weight',
        star: 'Lose 50lbs in 6 months so I look good for summer.',
        commitment: 'This is the goal you picked. You said food is the hard part, so that is where the plan aims. The number to hold is about 1,900 calories a day.',
        arrow: { from: '300 lbs', to: '250 by summer' },
        acts: [
          {
            role: 'star',
            text: 'A 40 minute walk after dinner.',
            reason: 'you said evenings are where the day breaks',
            doneWhen: 'the walk happened',
            anchor: { kind: 'event', value: 'after dinner' },
            starter: null,
            session: false
          },
          {
            role: 'support',
            text: 'Log every meal in MyFitnessPal',
            reason: 'you will see progress here before the scale',
            doneWhen: 'every meal today is in the app',
            anchor: null,
            starter: 'open MyFitnessPal and log one meal.'
          },
          {
            role: 'support',
            text: 'Water instead of soda, all day',
            reason: 'you said sugar drinks are the biggest problem',
            doneWhen: 'no sugar drinks today',
            anchor: null,
            starter: null
          }
        ],
        noList: ['sugar drinks', 'fast food', 'a new diet every week'],
        sizes: { unit: 'min', ladder: [20, 25, 30, 40, 50, 60], named: [20, 25, 40], estMinPerUnit: null, fmt: 'min' },
        eq: {
          rows: [
            { label: 'Your current stats', value: '6’1, 300 lbs', source: 'said' },
            { label: 'You work out, you said', value: 'rarely', source: 'said' },
            { label: 'Estimated calories burned daily', value: '≈ 2,850 cal', source: 'estimate' },
            { label: 'A pound is roughly', value: '3,500 cal', source: 'fact' }
          ],
          compute: [
            { expr: '50 * 3500 / 180', label: '50 × 3,500, over 180 days', approx: 970, shown: '≈ 970 a day' }
          ],
          result: { label: 'Ideal total calories, per day', value: '≈ 1,900 cal' }
        },
        reasoning: [
          'The burn line is an estimate. It leans on your height, your weight, and how often you move. You said you rarely work out, so the estimate stays low on purpose. The number you type each morning corrects it over time.',
          'Now walk it through. Eat about 1,900 a day and your body has to pull about 970 a day from what it stored. The log makes 1,900 something you can see instead of something you hope. Water instead of soda takes out the sugar drinks you named as the biggest problem. The walk adds burn right where you said the day breaks. Do those three every day and the math runs by itself. Missing 50 lbs in 180 days becomes the unreasonable ending.'
        ],
        scale: false,
        qas: [
          { q: 'Why a log and not a diet?', a: 'A diet is someone else’s plan. The log is yours. It shows what you actually eat, so you can fix the one meal that costs you, not all of them.' },
          { q: 'What does a normal day look like?', a: 'One screen: the walk, the log, the water, a hold. Each morning you type what the scale says. First look at the math: two weeks.' },
          { q: 'What if it stops working?', a: 'The plan changes, the goal does not. Your job is the acts. Memento’s job is to hold the math, ask the questions, and never let a day quietly disappear.' }
        ],
        close: {
          cadence: 'daily',
          kind: 'num',
          prompt: 'The scale said',
          unit: 'lb',
          prefix: '',
          decimals: true,
          source: 'Asked once a day, whenever you weigh.',
          choices: null,
          tail: 'this morning.'
        },
        checkpoint: 'two weeks',
        offDays: null,
        sessionsPerWeek: null,
        verb: 'do',
        sendWindow: 'evening',
        restLine: 'See you tomorrow.',
        deadline: '2027-02-15',
        parts: null,
        targets: { target: 250, unit: 'lb', baseline: 300, countTarget: null, daysTarget: null }
      }
    },

    // ---- persona 2: business. The gap math, and a plan with rest days. --------
    business: {
      intake: {
        star: 'Get the studio to $10k a month so I can hire my brother.',
        why: 'So I can hire my brother.',
        deadline: null,
        // their own words from the Clarity conversation, not a normalised value:
        // the line quotes them, and the chip match is done on top of it.
        clarityTime: '2-3 hours',
        wall: [
          { sm: 'I will get the studio to', num: '$10k', mid: 'a month' },
          { sm: 'so I can', big: 'hire my brother' }
        ],
        bucket: 'business',
        facts: [
          { s: 'Your star, in your words.', t: 'Get the studio to $10k a month so I can hire my brother.', q: true },
          { s: 'Why you said it matters.', t: 'So I can hire my brother.', q: true },
          { s: 'What you said the bottleneck is.', t: 'Not enough people see it.', q: true },
          { s: 'The numbers you typed in the refine step.', t: '$3,200 last month. One project is worth about $1,700.' },
          { s: 'What you said you have already done.', t: 'Some sales, not steady. You give it most of the day.' }
        ]
      },
      plan: {
        v: 1,
        createdAt: '2026-08-19',
        starHash: 'fixb0001',
        bucket: 'business',
        star: 'Get the studio to $10k a month so I can hire my brother.',
        commitment: 'This is the goal you picked. You said the product is good but nobody sees it. So attention is the problem to solve.',
        arrow: { from: '$3,200 a month', to: '$10k' },
        acts: [
          {
            role: 'star',
            text: '3 hours of deep work on the product.',
            reason: 'the product only gets better while you are in it',
            doneWhen: 'the session happened',
            anchor: null,
            starter: 'open the file where you stopped yesterday.',
            session: { defaultMin: 180 }
          },
          {
            role: 'support',
            text: 'Post on 3 platforms',
            reason: 'new people can only find work that is posted',
            doneWhen: 'the post is up on all three',
            anchor: null,
            starter: null
          },
          {
            role: 'support',
            text: 'Write one script',
            reason: 'so tomorrow’s post is already started',
            doneWhen: 'the script is written down',
            anchor: null,
            starter: null
          }
        ],
        noList: ['more polish before posting', 'new niches', 'tool shopping'],
        sizes: { unit: 'min', ladder: [60, 120, 180, 240, 300, 360], named: [60, 120, 180], estMinPerUnit: null, fmt: 'min' },
        eq: {
          rows: [
            { label: 'What the studio makes now', value: '$3,200 a month', source: 'said' },
            { label: 'Where you want it', value: '$10,000 a month', source: 'said' },
            { label: 'One project is worth about', value: '$1,700', source: 'said' }
          ],
          compute: [
            { expr: '10000 - 3200', label: 'The gap', approx: 6800, shown: '$6,800 a month' }
          ],
          result: { label: 'Projects to land each month', value: '4' }
        },
        reasoning: [
          'From what you told Clarity, the product is good. The problem is that nobody sees it. Every project so far came from someone who saw your work.',
          'Now walk it through. Three hours of deep work a day keeps the product getting better. One post on 3 platforms is about 90 chances a month for the right person to find the work. The gap is 4 projects. With that much work being made and being seen, staying at $3,200 becomes the unreasonable ending.'
        ],
        scale: false,
        qas: [
          { q: 'Why posting and not more polish?', a: 'More polish cannot move a number nobody can see. The product gets the deep work. The posts get it seen.' },
          { q: 'What does a normal day look like?', a: 'One screen: the deep work, the posts, a hold. On Sundays you type what the business made.' },
          { q: 'What if it stops working?', a: 'The plan changes, the goal does not. Your job is the acts. Memento’s job is to hold the math, ask the questions, and never let a day quietly disappear.' }
        ],
        close: {
          cadence: 'weekly:sunday',
          kind: 'num',
          prompt: 'The business made',
          unit: '',
          prefix: '$',
          decimals: false,
          source: 'Asked once a week, Sundays.',
          choices: null,
          tail: 'this week.'
        },
        checkpoint: 'two weeks',
        // The studio takes the weekend. A rest day renders "Rest day. / Enjoy :)"
        // and the day screen keeps its shape (the supports are still the day).
        offDays: { trainingDays: ['mon', 'tue', 'wed', 'thu', 'fri'], restLine: 'Rest day.\nEnjoy :)' },
        sessionsPerWeek: 5,
        verb: 'do',
        sendWindow: 'morning',
        restLine: 'See you tomorrow.',
        deadline: null,
        parts: null,
        targets: { target: 10000, unit: '$', baseline: 3200, countTarget: null, daysTarget: null }
      }
    }
  };

  // ---------------------------------------------------------------------------
  // THE REFINE QUESTIONS (REFINE-QUESTIONS.md v2, graded by Malik 2026-08-19).
  // Rendered from this constant, fed by bucket key. 3 to 5 per bucket, capped
  // at 5. The last question is the pulse baseline where a number exists.
  // EVERY question carries a free field (his global rule): the chips are the
  // fast path, never the only path. The brain agent wires the real router
  // (bucket selection + the Clarity dedupe) later; this is the shape it fills.
  // ---------------------------------------------------------------------------
  var OPENER = 'So, what have you actually done to make progress toward this?';

  // v3 (Malik, on-device 2026-08-19), three rules that live in the data:
  //
  //  multi: true       the answers COEXIST, so the chips are multi tap. The
  //                    opener is multi in every bucket (a person has tried
  //                    several things), and so is the business bottleneck.
  //                    Stored comma joined in the order they were tapped.
  //  free: false       THE FREE FIELD DIET. The field is no longer on every
  //                    question (that was the v2 rule). It appears only where
  //                    their own words ADD something, so anything with a
  //                    structured control loses it: the rulers keep "Type it
  //                    instead" as their only escape, and the number steps have
  //                    the number. See wantsFree() for the standing rule; this
  //                    flag is only for the exceptions to it.
  //  clarityTime: true this question is about how much TIME they have, which
  //                    Clarity usually already asked. If the transcript has an
  //                    answer, the question says so and preselects the chip.
  var QUESTIONS = {
    weight: [
      { q: OPENER, multi: true, chips: ['Nothing yet, this is day one', 'Tried diets before', 'I work out sometimes', 'I lose it, then gain it back'] },
      { q: 'Your height and sex? The math needs both.', kind: 'ruler', ruler: 'height', unit: 'Drag to set it.', chips: ['Male', 'Female'] },
      { q: 'How often do you move in a normal week?', chips: ['Rarely', '1-2 workouts', '3-4 workouts', '5+ or active job'] },
      { q: 'What do you think is the biggest problem?', chips: ['Late night eating', 'Fast food days', 'Sugar drinks', 'Weekends'] },
      { q: 'What does the scale say this morning?', kind: 'ruler', ruler: 'weight', unit: 'Drag to set it.' }
    ],
    screen: [
      { q: OPENER, multi: true, chips: ['Nothing yet', 'Deleted apps before, they came back', 'Tried screen limits', 'I go cold turkey, then relapse'] },
      { q: 'Which apps take most of it?', chips: ['TikTok', 'Instagram', 'YouTube', 'Games'], multi: true },
      { q: 'If those hours came back, what would you want them for?', chips: ['A project I keep putting off', 'Reading or learning', 'Training'] },
      { q: 'What does your Screen Time report say per day right now?', kind: 'num', unit: 'Hours a day', prefix: '', decimals: true }
    ],
    fitness: [
      { q: OPENER, multi: true, chips: ['Day one', 'On and off for years', 'Consistent until life hits', 'Coming back from a break'] },
      { q: 'How many days a week can you actually train?', chips: ['2', '3', '4', '5+'] },
      { q: 'Which days fit your life best?', chips: ['Mon/Wed/Fri', 'Tue/Thu/Sat', 'Weekends included'] },
      { q: 'What kind of training?', chips: ['Gym lifting', 'Running or cardio', 'Home workouts', 'A sport'] }
    ],
    money: [
      { q: OPENER, multi: true, chips: ['Nothing yet', 'I have an offer or service', 'I have had clients before', 'I get leads but do not close'] },
      { q: 'Where has money actually come from before?', chips: ['People I reached out to', 'Referrals', 'Posting content', 'Nowhere yet'] },
      { q: 'What is one client or sale worth, roughly?', kind: 'num', unit: 'Dollars, one sale', prefix: '$', decimals: false },
      { q: 'What did you bring in last month?', kind: 'num', unit: 'Dollars last month', prefix: '$', decimals: false }
    ],
    'money-job': [
      { q: OPENER, multi: true, chips: ['Nothing yet', 'Updated my resume', 'Applied to some places', 'Interviews, no offers'] },
      { q: 'What is the target: more pay where you are, or a new job?', chips: ['A raise or promotion', 'A new job, same field', 'A new field'] },
      { q: 'How many applications or asks have you made this month?', kind: 'num', unit: 'Applications this month', prefix: '', decimals: false },
      { q: 'What do you earn now, roughly?', kind: 'num', unit: 'Dollars a month', prefix: '$', decimals: false, skippable: true }
    ],
    business: [
      { q: OPENER, multi: true, chips: ['Just an idea', 'It is built, nobody sees it', 'Some sales, not steady', 'Steady but stuck'] },
      { q: 'What is the bottleneck, honestly?', multi: true, chips: ['Not enough people see it', 'Not enough of it is finished', 'Price or offer feels off'] },
      { q: 'What is one sale or project worth, roughly?', kind: 'num', unit: 'Dollars, one project', prefix: '$', decimals: false },
      { q: 'How many hours a day can you give it?', clarityTime: true, chips: ['1', '2-3', '4-5', 'Most of the day'] },
      { q: 'What did the business make last month?', kind: 'num', unit: 'Dollars last month', prefix: '$', decimals: false }
    ],
    school: [
      { q: OPENER, multi: true, chips: ['Nothing yet, just stress', 'Made study plans, did not stick', 'I study, but last minute', 'I go to class, that is about it'] },
      { q: 'Which classes are pulling the average down?', chips: ['All about equal'], free: 'The classes' },
      { q: 'When can study hours actually happen?', chips: ['Mornings', 'Between classes', 'Evenings', 'Nights'] },
      { q: 'What is your GPA right now, if you know it?', kind: 'num', unit: 'Your GPA', prefix: '', decimals: true, skippable: true }
    ],
    projects: [
      { q: OPENER, multi: true, chips: ['Blank page', 'Started, then stalled', 'Half built', 'Nearly done, will not finish'] },
      { q: 'List the pieces still standing between here and done.', chips: [], free: 'One piece per line' },
      { q: 'Which piece unlocks the most others?', chips: [], free: 'The one that unlocks the rest' },
      { q: 'How many hours a day can you give it?', clarityTime: true, chips: ['1', '2-3', '4-5', 'Most of the day'] }
    ],
    focus: [
      { q: OPENER, multi: true, chips: ['I plan, then the day eats it', 'I start late and drift', 'I work but shallow', 'Day one of trying'] },
      { q: 'What is the deep work FOR right now?', chips: [], free: 'What the block is for' },
      { q: 'When is your best uninterrupted stretch?', chips: ['First thing', 'Mid morning', 'Afternoon', 'Night'] },
      { q: 'How long can a protected block realistically be?', clarityTime: true, chips: ['30 min', '60 min', '90 min', '2 hours+'] }
    ]
  };

  // ---------------------------------------------------------------------------
  // THE DRAG RULER (v1190). Height and a body weight are hard-format answers, so
  // the input IS the control: a flat tick strip in the day rail's own language,
  // dragged under one bright centre mark. No box, no border, no colour.
  //   step = pixels per unit (how far the strip travels for one inch / one pound)
  //   maj  = a longer tick every N units (a foot on height, ten pounds on weight)
  //   start= where the strip rests before the first drag, so it feels anchored
  // Both of these questions are REQUIRED (Malik, on-device 2026-08-19): nothing
  // is answered until the person actually sets a value, by drag or by typing.
  // ---------------------------------------------------------------------------
  var RULERS = {
    height: { min: 48, max: 84, start: 68, step: 13, maj: 12, page: 12, unit: '', label: 'Your height' },
    weight: { min: 80, max: 500, start: 200, step: 7, maj: 10, page: 10, unit: 'lb', label: 'Your weight' }
  };
  // plain, the way a person writes it: 5'10" and 218.
  function rulerText(kind, v) {
    if (kind === 'height') return Math.floor(v / 12) + "'" + (v % 12) + '"';
    return String(v);
  }

  // ---------------------------------------------------------------------------
  // THE FREE FIELD DIET (v3, Malik on-device 2026-08-19). The v2 rule was "every
  // question carries a free field". He replaced it: the field appears only where
  // their own words ADD something. A question that already has a structured
  // control does not qualify, because the control IS the answer.
  //   ruler steps  -> no field. "Type it instead" is the escape hatch, and the
  //                   sex chips ride the height ruler, so they lose it too.
  //   number steps -> no field, the number is the answer. UNLESS the step is
  //                   skippable, where words ("not sure", "I never checked")
  //                   are the only way to move on.
  //   chip steps   -> keep it. These are the story-flavoured ones (what have you
  //                   done, the biggest problem, the bottleneck) and a person's
  //                   own sentence is worth more than any chip.
  // A question can still opt out explicitly with free: false.
  // ---------------------------------------------------------------------------
  function wantsFree(d) {
    if (!d) return false;
    if (d.free === false) return false;
    if (d.kind === 'ruler') return false;
    if (d.kind === 'num') return !!d.skippable;
    return true;
  }

  // ---------------------------------------------------------------------------
  // THE CLARITY TIME SEAM (v3, Malik). Some refine questions ask how much time a
  // person has, which Clarity has usually already asked. Where an answer exists,
  // the question says so in their own words and preselects the chip, still
  // changeable. Where it does not, the line simply is not there.
  //
  // ONE seam. The wiring phase replaces the body of this function with the real
  // transcript read; nothing else in the module knows where the value came from.
  // ---------------------------------------------------------------------------
  function getClarityTimeAnswer(intake) {
    try {
      var v = intake && intake.clarityTime;
      return (typeof v === 'string' && v.trim()) ? v.trim() : null;
    } catch (e) { return null; }
  }
  // "2-3 hours" has to find the [2-3] chip without matching [1]. Compare on
  // letters and digits only, and let the LONGEST matching chip win, so a short
  // chip can never steal a match from a more specific one.
  function normKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function matchChip(answer, chips) {
    var a = normKey(answer);
    if (!a || !chips || !chips.length) return -1;
    var best = -1, bestLen = 0;
    chips.forEach(function (c, k) {
      var n = normKey(c);
      if (!n) return;
      if (a.indexOf(n) > -1 || n.indexOf(a) > -1) {
        if (n.length > bestLen) { bestLen = n.length; best = k; }
      }
    });
    return best;
  }

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function btn(cls, text) {
    var b = el('button', cls, text);
    b.type = 'button';
    return b;
  }
  function reduced() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  // durations read the way a person says them: 45 min, 1 hour, 2 hours.
  function mins(v) {
    if (v % 60 === 0) return (v / 60) + (v === 60 ? ' hour' : ' hours');
    if (v < 120) return v + ' min';
    return Math.floor(v / 60) + ' hr ' + (v % 60) + ' min';
  }
  function sizeText(plan, v) {
    var s = plan.sizes || {};
    if (s.fmt === 'min') return mins(v);
    if (s.fmt === 'clock') {
      var h = Math.floor(v / 60), m = v % 60;
      return (h % 12 || 12) + ':' + ('0' + m).slice(-2) + (h >= 12 ? 'pm' : 'am');
    }
    return String(v);
  }
  function daysUntil(iso) {
    try {
      var d = new Date(iso + 'T00:00:00');
      var n = new Date();
      var a = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      return Math.max(0, Math.round((d - a) / 86400000));
    } catch (e) { return 0; }
  }
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  function dateLabel(iso) {
    try {
      var d = new Date(iso + 'T00:00:00');
      return MON[d.getMonth()] + ' ' + d.getDate();
    } catch (e) { return iso; }
  }
  function stamp() {
    var d = new Date(), h = d.getHours();
    return (h % 12 || 12) + ':' + ('0' + d.getMinutes()).slice(-2) + (h >= 12 ? 'pm' : 'am');
  }
  function dayKey(d) {
    try { if (typeof actionDayKey === 'function') return actionDayKey(d || new Date()); } catch (e) {}
    return (d || new Date()).toISOString().slice(0, 10);
  }
  // THE MARK: the bare notched M (the boxed M is dead, v739).
  function markM(cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '42 40 428 432');
    svg.setAttribute('aria-hidden', 'true');
    if (cls) svg.setAttribute('class', cls);
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M62 55 L256 249 L450 55 L450 457 L62 457 Z');
    svg.appendChild(p);
    return svg;
  }
  // The client re-checks every number the AI wrote (schema: "the client
  // re-checks the arithmetic"). Only arithmetic characters are ever evaluated.
  function safeEval(expr) {
    if (typeof expr !== 'string' || !/^[0-9+\-*/(). ]+$/.test(expr)) return null;
    try {
      /* eslint-disable no-new-func */
      var v = (new Function('return (' + expr + ');'))();
      return (typeof v === 'number' && isFinite(v)) ? v : null;
    } catch (e) { return null; }
  }
  function checkCompute(row) {
    var got = safeEval(row.expr);
    if (got == null || typeof row.approx !== 'number' || !row.approx) return { ok: true, value: null };
    var off = Math.abs(got - row.approx) / Math.abs(got);
    return { ok: off <= 0.02, value: got, off: off };
  }

  // ---------------------------------------------------------------------------
  // THE SHELL. One overlay, one column. Built on open, destroyed on close, so
  // nothing in here can outlive its view or keep animating offscreen.
  //
  // v1187 (Malik, on-device): the room's dot grid is GONE. The background is
  // the flat near-black the surfaces already carry, both themes.
  //
  // THE CROSS FADE. The flow used to hard cut between screens ("instantly cuts
  // and pops"). Now the outgoing shell fades out under the incoming one: 180ms
  // ease-in out, 240ms ease-out in, the motion law's numbers. Reduced motion
  // cuts straight, which is the correct answer there.
  // ---------------------------------------------------------------------------
  var root = null;      // the live overlay element
  var current = null;   // { name, teardown }
  var escBound = null;
  var closeBound = null;
  var FADE_OUT = 180, FADE_IN = 240;

  // THE WAY OUT (Malik, on-device: "there is no way out on the phone").
  // The app's own fullscreen close chip, the same primitive Clarity shows. An
  // empty source is the existing "just go home" branch of exitToModules: it
  // closes whatever module is actually open and lands on the home tab. The
  // chip's own handler does that part; this listener tears the flow down with
  // it, so one tap on the phone leaves nothing behind.
  function exitChip() {
    try { return document.getElementById('fullscreenCloseGlobal'); } catch (e) { return null; }
  }
  function showExit() {
    try {
      if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show('');
    } catch (e) {}
    if (closeBound) return;
    var x = exitChip();
    if (!x) return;
    closeBound = function () { destroy(); };
    x.addEventListener('pointerdown', closeBound);
    x.addEventListener('click', closeBound);
    x.addEventListener('touchend', closeBound);
  }
  function hideExit() {
    var x = exitChip();
    if (x && closeBound) {
      x.removeEventListener('pointerdown', closeBound);
      x.removeEventListener('click', closeBound);
      x.removeEventListener('touchend', closeBound);
    }
    closeBound = null;
    try {
      if (typeof FullscreenClose !== 'undefined' && FullscreenClose.hide) FullscreenClose.hide();
    } catch (e) {}
  }

  // THE ENTRANCE (v1192, Malik on-device: "EVERYTIME a page changes or a next
  // body of text appears, I would love if it came in with a fade").
  // The shell cross fade moves the ROOM. This moves the CONTENT into it, so a
  // screen's first paint arrives instead of being already there. `group` is 0
  // or 1: 1 is the second beat of a two part entrance (the logic page's body
  // after its title), and that is the only stagger in the module. Never a per
  // element cascade, that would be decorative animation.
  function enterFade(node, group) {
    if (!node || reduced()) return;
    var cls = group ? 'afl-enter afl-enter--2' : 'afl-enter';
    node.classList.remove('afl-enter', 'afl-enter--2');
    void node.offsetWidth;
    cls.split(' ').forEach(function (c) { node.classList.add(c); });
    var off = function (e) {
      if (e && e.target !== node) return;          // child animations bubble
      node.classList.remove('afl-enter', 'afl-enter--2');
      node.removeEventListener('animationend', off);
    };
    node.addEventListener('animationend', off);
    setTimeout(off, 700);                          // iOS drops animationend
  }

  function fadeIn(node) {
    if (reduced()) return;
    node.classList.add('is-in');
    var off = function (e) {
      if (e && e.target !== node) return;          // child animations bubble
      node.classList.remove('is-in');
      node.removeEventListener('animationend', off);
    };
    node.addEventListener('animationend', off);
    // iOS drops animationend under load; the class must never outlive the
    // animation (a held `both` fill keeps a GPU layer alive forever).
    setTimeout(off, FADE_IN + 160);
  }
  function fadeOut(node) {
    node.setAttribute('aria-hidden', 'true');
    if (reduced()) { if (node.parentNode) node.parentNode.removeChild(node); return; }
    node.classList.add('is-exiting');
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, FADE_OUT + 60);
  }

  function shell(name, opts) {
    opts = opts || {};
    // The outgoing screen's LOGIC dies now; only its pixels linger for the
    // fade, on a timer they cannot outlive.
    var prev = root;
    if (escBound) { document.removeEventListener('keydown', escBound); escBound = null; }
    if (current && typeof current.teardown === 'function') {
      try { current.teardown(); } catch (e) {}
    }
    current = null;
    root = null;
    if (prev) fadeOut(prev);

    root = el('div', 'afl' + (opts.cine ? ' afl--cine' : ''));
    root.setAttribute('data-screen', name);
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    if (opts.label) root.setAttribute('aria-label', opts.label);
    var col = el('div', 'afl__col');
    // THE TOP FADE: on a surface that scrolls, the text must keep going and
    // dissolve, never hit a straight cut under the island. The scrim is the
    // flow's OWN (the app's #topFade stays hidden here, it painted a light band
    // over the dark room), it is the surface's own background colour in both
    // themes, and it runs from y=0 through the safe area and is gone by ~90px.
    // It lives inside the column so the day screen's M can sit above it.
    if (opts.top) {
      var tf = el('div', 'afl__top');
      tf.setAttribute('aria-hidden', 'true');
      col.appendChild(tf);
    }
    root.appendChild(col);
    document.body.appendChild(root);
    fadeIn(root);
    escBound = function (e) { if (e.key === 'Escape') destroy(); };
    document.addEventListener('keydown', escBound);
    showExit();
    current = { name: name, teardown: null };
    return col;
  }

  function destroy() {
    if (escBound) { document.removeEventListener('keydown', escBound); escBound = null; }
    if (current && typeof current.teardown === 'function') {
      try { current.teardown(); } catch (e) {}
    }
    current = null;
    hideExit();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    // anything still fading out goes with it: nothing outlives the view
    try {
      [].forEach.call(document.querySelectorAll('.afl.is-exiting'), function (n) {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
    } catch (e) {}
  }

  // The app's standing bottom-button recipe (Clarity's nav geometry). Every
  // screen's primary control comes from here so Action never drifts again.
  function navRow() { return el('div', 'afl-nav'); }
  function cta(label) {
    var b = btn('afl-cta');
    b.appendChild(el('span', 'afl-cta__fill'));
    b.appendChild(el('span', 'afl-cta__lab', label));
    var inv = el('span', 'afl-cta__inv');
    inv.setAttribute('aria-hidden', 'true');
    inv.appendChild(el('span', null, label));
    b.appendChild(inv);
    return b;
  }
  // the label and its inverted twin change together, and they FADE (v1191):
  // "Continue" becoming "Create action plan" was a hard swap on the last step.
  function ctaLabel(b, text) {
    swapText(b.querySelector('.afl-cta__lab'), text, 1);
    b.querySelector('.afl-cta__inv span').textContent = text;
  }

  // ---------------------------------------------------------------------------
  // THE HOLD (v1187). Rebuilt on the pattern that is PROVEN on Malik's phone:
  // _cpBindHold in js/02 (the Clarity fulfilled ring) and the card hold in
  // js/08. The previous version worked in desktop probes and did nothing at all
  // on a real iPhone. Every line below is one of the reasons why:
  //
  //   1. THE CLOCK IS A CLOCK. Completion used to be gated on the CSS width
  //      transition's `transitionend`. If iOS drops, defers or recomposites
  //      that transition (which it does under load, and on any surface it
  //      decides to hand to a gesture), the event never arrives and the hold
  //      can NEVER finish. The ring measures Date.now() on a 30ms interval,
  //      exactly as js/02 does, and the CSS fill is only the picture of it.
  //   2. pointerdown preventDefault()s, always, once the guard has passed.
  //      Without it WebKit keeps its own claim on the press (selection, the
  //      callout, a drag), and the way WebKit takes a claim is pointercancel,
  //      which is bound to the abort. This was missing on the day hold.
  //   3. contextmenu is cancelled. Same reason, the other half of the callout.
  //   4. NO setPointerCapture. Capture retargets the pointer mid gesture and
  //      shifts which element the boundary events fire on. js/02 and js/08 both
  //      do without it; the day hold was the only place in the app using it.
  //   5. NO movement threshold. Neither proven hold cancels on drift, so a real
  //      finger's tremor cannot unwind the ring.
  //   6. The mouse guard (secondary buttons never start a hold) comes from
  //      js/02 verbatim.
  // The CSS half of the same fix (touch-action: none, -webkit-touch-callout:
  // none, tap highlight) is on .afl-cta and .afl-day__hold in css/action.css.
  // ---------------------------------------------------------------------------
  function aflBindHold(node, ms, onDone, opts) {
    opts = opts || {};
    var timer = 0, t0 = 0, running = false, done = false;
    function tick() {
      if (!running) return;
      var p = Math.min((Date.now() - t0) / ms, 1);
      if (opts.onTick) { try { opts.onTick(p); } catch (e) {} }
      if (p < 1) return;
      clearInterval(timer); timer = 0;
      running = false;
      done = true;
      try { onDone(); } catch (e) {}
    }
    function start(e) {
      if (done || running) return;
      if (e && e.pointerType === 'mouse' && e.button !== 0) return;
      if (opts.guard && !opts.guard()) return;
      if (e && e.preventDefault) e.preventDefault();
      running = true;
      t0 = Date.now();
      if (opts.onStart) { try { opts.onStart(); } catch (e2) {} }
      if (timer) clearInterval(timer);
      timer = setInterval(tick, 30);
    }
    function end() {
      if (!running) return;
      running = false;
      if (timer) { clearInterval(timer); timer = 0; }
      if (opts.onAbort) { try { opts.onAbort(); } catch (e) {} }
    }
    node.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    node.addEventListener('pointerdown', start);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      node.addEventListener(ev, end);
    });
    node.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); }
    });
    node.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') end(); });
    node.addEventListener('blur', end);
    return {
      abort: end,
      reset: function () { end(); done = false; },
      isRunning: function () { return running; }
    };
  }

  // THE CTA HOLD. The light fills the button, the label inverts exactly where
  // the light has reached, and letting go early takes the light straight back.
  // Nothing important in this module is committed by a bare tap.
  function bindCtaHold(b, ms, go, guard) {
    var inv = b.querySelector('.afl-cta__inv span');
    var fill = b.querySelector('.afl-cta__fill');
    var h = aflBindHold(b, ms, function () {
      b.classList.remove('is-holding');
      go();
    }, {
      // the guard runs BEFORE preventDefault, so the steps where this button is
      // an ordinary tap keep their click.
      guard: function () { return !b.disabled && (!guard || guard()); },
      onStart: function () {
        inv.style.width = b.offsetWidth + 'px';
        void fill.offsetWidth;
        b.classList.add('is-holding');
      },
      onAbort: function () { b.classList.remove('is-holding'); }
    });
    b.style.setProperty('--afl-hold', (ms / 1000) + 's');
    return h.abort;
  }

  // A NUMBER THAT CHANGES MUST NOT HARD SWAP (Malik, on-device). The new value
  // arrives from the direction the change came from, 200ms, once. The class
  // comes back off on animationend so nothing holds a layer.
  // Fade out a node that may be MID ANIMATION (the breathing M). Pin the value
  // the animation is showing, drop the animation, then transition from there:
  // removing a running animation any other way snaps the element back to its
  // base opacity for a frame, which reads as a flash.
  function fadeOutNode(node, ms) {
    ms = ms || 400;
    var now = '1';
    try { now = getComputedStyle(node).opacity; } catch (e) {}
    node.style.animation = 'none';
    if (reduced()) { node.style.opacity = '0'; return; }
    node.style.opacity = now;
    void node.offsetWidth;
    node.style.transition = 'opacity ' + ms + 'ms ease-in';
    node.style.opacity = '0';
  }

  // NO HARD SWAPS ANYWHERE IN THIS MODULE (v1191, his second flag: "I don't
  // like it when things just snap and pop in. It makes it feel cheap"). Any
  // text this module rewrites goes through here. The new value arrives from the
  // direction the change came from, 200ms, once, and the class comes back off
  // on animationend so nothing holds a layer.
  function swapText(node, text, dir) {
    var t = String(text == null ? '' : text);
    if (node.textContent === t) return;
    node.textContent = t;
    if (reduced()) return;
    node.classList.remove('afl-swap--up', 'afl-swap--dn');
    void node.offsetWidth;
    node.classList.add(dir < 0 ? 'afl-swap--dn' : 'afl-swap--up');
    if (node.dataset.swapBound) return;
    node.dataset.swapBound = '1';
    node.addEventListener('animationend', function () {
      node.classList.remove('afl-swap--up', 'afl-swap--dn');
    });
  }

  // ===========================================================================
  // 2.1  ob-1, THE WALL OF INTENT
  // No card, no container: the star is the screen. Each line rests dim until
  // you press it into the wall, the wall lights a step brighter each time, and
  // the confirm is a hold. DARK CINEMA in both themes.
  // ===========================================================================
  function openIntent(key, opts) {
    opts = opts || {};
    var fx = FIXTURES[key] || FIXTURES.weight;
    var ink = fx.intake;
    var col = shell('intent', { cine: true, label: 'Your star' });

    var type = el('div', 'afl-int__type');
    var zones = [];

    (ink.wall || []).forEach(function (w, i) {
      var z = btn('afl-int__z' + (i ? ' afl-int__z--so' : ''));
      z.setAttribute('aria-pressed', 'false');
      if (w.sm) z.appendChild(el('span', 'afl-int__sm', w.sm));
      if (w.num) z.appendChild(el('span', 'afl-int__num', w.num));
      if (w.mid) z.appendChild(el('span', 'afl-int__mid', w.mid));
      if (w.big) z.appendChild(el('span', 'afl-int__big', w.big));
      type.appendChild(z);
      zones.push(z);
    });

    // the deadline row renders ONLY when Clarity returned a date. Nothing else
    // on the screen moves when it is absent.
    if (ink.deadline) {
      type.appendChild(el('span', 'afl-int__rule'));
      var zw = btn('afl-int__z afl-int__z--when');
      zw.setAttribute('aria-pressed', 'false');
      var when = el('span', 'afl-int__when');
      when.appendChild(el('i', null, 'by'));
      when.appendChild(el('b', null, dateLabel(ink.deadline)));
      when.appendChild(el('s', null, daysUntil(ink.deadline) + ' days'));
      zw.appendChild(when);
      type.appendChild(zw);
      zones.push(zw);
    }

    var note = el('p', 'afl-int__note');
    var lock = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lock.setAttribute('viewBox', '0 0 12 14');
    lock.setAttribute('aria-hidden', 'true');
    lock.innerHTML = '<path d="M2.7 6.2V4.3a3.3 3.3 0 0 1 6.6 0v1.9" stroke="currentColor" stroke-width="1.3" fill="none"/>'
      + '<rect x="1.2" y="6.2" width="9.6" height="7" rx="1.8" fill="currentColor" opacity=".7"/>';
    note.appendChild(lock);
    note.appendChild(document.createTextNode('From Clarity'));
    type.appendChild(note);
    col.appendChild(type);

    var nav = navRow();
    var go = cta('Confirm');
    go.setAttribute('aria-disabled', 'true');
    var sub = el('p', 'afl-nav__sub', 'Tap each line to confirm');
    nav.appendChild(go);
    nav.appendChild(sub);
    col.appendChild(nav);

    var done = false;
    function litCount() {
      return zones.filter(function (z) { return z.classList.contains('is-set'); }).length;
    }
    function sync() {
      var n = litCount(), ready = (n === zones.length);
      root.setAttribute('data-lit', String(Math.min(3, n)));
      go.classList.toggle('is-live', ready && !done);
      go.setAttribute('aria-disabled', ready ? 'false' : 'true');
      // the sub line changes three times on this screen. It fades (v1191).
      swapText(sub, done ? 'Change it later in Clarity'
        : (ready ? 'Press and hold' : 'Tap each line to confirm'), 1);
    }
    var stopHold = bindCtaHold(go, 780, function () {
      done = true;
      go.classList.remove('is-live');
      go.classList.add('is-done');
      zones.forEach(function (z) { z.style.pointerEvents = 'none'; });
      sync();
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    }, function () { return !done && go.classList.contains('is-live'); });

    zones.forEach(function (z) {
      z.addEventListener('click', function () {
        if (done) return;
        var on = !z.classList.contains('is-set');
        z.classList.toggle('is-set', on);
        z.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (!on) stopHold();
        sync();
      });
    });
    sync();
    enterFade(type);
    enterFade(nav);
    return root;
  }

  // ===========================================================================
  // 2.1b  THE INTERSTITIAL (Malik, on-device 2026-08-19)
  // One line between confirming the star and being asked five more things, so
  // the questions do not arrive out of nowhere. His copy, exactly. It fades in
  // with the shell, holds long enough to read, and leaves on its own: there is
  // no button, because nothing here is a decision. Reduced motion cuts in and
  // keeps the same hold.
  // ===========================================================================
  var NOTE_LINE = 'A few more questions. I promise.';
  var NOTE_MS = 2200;

  function openNote(text, opts) {
    opts = opts || {};
    var col = shell('note', { label: 'One moment' });
    var wrap = el('div', 'afl-note');
    wrap.appendChild(el('p', null, text || NOTE_LINE));
    col.appendChild(wrap);
    var t = setTimeout(function () {
      t = null;
      if (typeof opts.onDone === 'function') opts.onDone();
    }, opts.ms || NOTE_MS);
    current.teardown = function () { if (t) clearTimeout(t); };
    enterFade(wrap);
    return root;
  }

  // ===========================================================================
  // 2.2  q-2, THE REFINE CONVERSATION
  // One question owns the screen, the answers are flat ruled rows, the progress
  // bar renders ONE SEGMENT PER QUESTION (3 to 5, capped at 5) and fills as
  // each is answered. The free field appears where their own words add
  // something (wantsFree, v3), not on every question. The last question, where
  // a number exists, is the baseline itself, so the flow ends on their number.
  // ===========================================================================
  function openRefine(key, opts) {
    opts = opts || {};
    var fx = FIXTURES[key] || FIXTURES.weight;
    var bucket = opts.bucket || fx.intake.bucket;
    var D = (QUESTIONS[bucket] || QUESTIONS.weight).slice(0, 5);
    var clarityTime = getClarityTimeAnswer(fx.intake);
    var col = shell('refine', { label: 'A few questions' });

    var wrap = el('div', 'afl-q');
    col.appendChild(wrap);

    // header: back chevron, the bar, and a spacer that mirrors the chevron so
    // the bar sits truly centered.
    var top = el('div', 'afl-q__top');
    var back = btn('afl-q__back');
    back.setAttribute('aria-label', 'Back');
    back.innerHTML = '<svg width="9" height="16" viewBox="0 0 7 12" fill="none" aria-hidden="true">'
      + '<path d="M6 1 1.2 6 6 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var bar = el('div', 'afl-q__bar');
    var segs = D.map(function () {
      var s = el('div', 'afl-q__seg');
      s.appendChild(el('i'));
      bar.appendChild(s);
      return s;
    });
    top.appendChild(back);
    top.appendChild(bar);
    top.appendChild(el('span', 'afl-q__sp'));
    wrap.appendChild(top);

    var qEl = el('div', 'afl-q__q');
    var unit = el('p', 'afl-q__unit');
    var body = el('div', 'afl-q__as');
    wrap.appendChild(qEl);
    wrap.appendChild(unit);
    wrap.appendChild(body);

    var nav = navRow();
    nav.classList.add('afl-nav--q');
    var own = el('div', 'afl-q__own');
    own.appendChild(el('i'));
    var free = document.createElement('input');
    free.type = 'text';
    free.setAttribute('placeholder', 'In your own words');
    free.setAttribute('aria-label', 'Answer in your own words');
    own.appendChild(free);
    var hint = el('p', 'afl-q__hint', 'Press and hold');
    var go = cta('Continue');
    go.disabled = true;
    nav.appendChild(own);
    nav.appendChild(hint);
    nav.appendChild(go);
    col.appendChild(nav);

    var i = 0;
    var picked = D.map(function () { return null; });
    var multi = D.map(function () { return []; });
    var typed = D.map(function () { return ''; });
    var nums = D.map(function () { return ''; });
    // the ruler steps carry their own value and their own "actually set" flag:
    // the resting position is a starting point, never an answer.
    var rulerVal = D.map(function (d) { return (RULERS[d.ruler] || RULERS.height).start; });
    var rulerSet = D.map(function () { return false; });
    // THE CLARITY PRESELECT (v3). Applied ONCE per question, the first time it
    // is painted: after that the person owns the answer, and deselecting must
    // not be undone by walking back and forth.
    var presetDone = D.map(function () { return false; });
    var mirror = el('span', 'afl-q__mirror');
    wrap.appendChild(mirror);
    var numInput = null;

    function isNum(k) { return D[k].kind === 'num'; }
    function isRuler(k) { return D[k].kind === 'ruler'; }
    function answeredAt(k) {
      // REQUIRED (v1190). Height and weight cannot be skipped, and words in the
      // free field do not stand in for the number: the math needs the number.
      // Where the same question also asks for sex, both halves must be there.
      if (isRuler(k)) {
        if (!rulerSet[k]) return false;
        if ((D[k].chips || []).length) return D[k].multi ? multi[k].length > 0 : picked[k] !== null;
        return true;
      }
      if (isNum(k)) return nums[k].length > 0 || (D[k].skippable && typed[k].trim().length > 0);
      if (D[k].multi) return multi[k].length > 0 || typed[k].trim().length > 1;
      return picked[k] !== null || typed[k].trim().length > 1;
    }
    function segSync() {
      segs.forEach(function (s, k) {
        s.classList.toggle('is-done', k < i);
        s.classList.toggle('is-now', k === i);
        s.classList.toggle('is-ans', answeredAt(k));
      });
    }
    function syncCta() {
      var last = (i === D.length - 1);
      go.disabled = !answeredAt(i);
      ctaLabel(go, last ? 'Create action plan' : 'Continue');
      var holdStep = last && !go.disabled;
      // the button has to WAKE UP. Height and weight cannot be skipped now, so a
      // person who has not set one is looking at a dead button and needs to see
      // it come alive the moment they have answered. Same lit step the wall and
      // the final hold already use, nothing new.
      go.classList.toggle('is-live', !go.disabled && !holdStep);
      go.classList.toggle('afl-cta--hold', holdStep);
      if (!holdStep) stopHold();
      hint.classList.toggle('is-on', holdStep);
      segSync();
    }
    function marks() {
      // by the chips' OWN order, not their position in the body: a ruler step
      // puts the ruler in front of them and every index would be off by one.
      [].forEach.call(body.querySelectorAll('.afl-q__a'), function (b, k) {
        var on = D[i].multi ? multi[i].indexOf(k) > -1 : picked[i] === k;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function clean(raw, dec) {
      var t = raw.replace(dec ? /[^0-9.]/g : /[^0-9]/g, '');
      if (!dec) return t.replace(/^0+(?=\d)/, '');
      var s = t.split('.');
      return s.length > 1 ? s[0] + '.' + s.slice(1).join('').slice(0, 1) : t;
    }
    function shownNum(v, dec) {
      if (dec) return v;
      return v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    }
    function fitNum() {
      if (!numInput) return;
      var t = numInput.value || numInput.placeholder, L = t.length;
      var px = L <= 3 ? 130 : L === 4 ? 114 : L === 5 ? 99 : L === 6 ? 83 : 70;
      numInput.style.fontSize = px + 'px';
      mirror.style.fontSize = px + 'px';
      mirror.textContent = t;
      numInput.style.width = Math.max(83, Math.ceil(mirror.getBoundingClientRect().width) + 13) + 'px';
    }
    function buildChips() {
      // Clarity already asked about their time on some questions. Where it has
      // an answer, the matching chip arrives lit, once, and stays changeable.
      if (D[i].clarityTime && clarityTime && !presetDone[i]) {
        presetDone[i] = true;
        var pre = matchChip(clarityTime, D[i].chips || []);
        if (pre > -1) {
          if (D[i].multi) { if (multi[i].indexOf(pre) < 0) multi[i].push(pre); }
          else if (picked[i] === null) picked[i] = pre;
        }
      }
      (D[i].chips || []).forEach(function (t, k) {
        var b = btn('afl-q__a', t);
        b.setAttribute('aria-pressed', 'false');
        if (D[i].multi) b.setAttribute('role', 'checkbox');
        b.addEventListener('click', function () {
          if (D[i].multi) {
            // MULTI TAP (v3): these answers coexist, so tapping lights another
            // one instead of moving the light. Order of tapping is the order
            // they are stored in.
            var at = multi[i].indexOf(k);
            if (at > -1) multi[i].splice(at, 1); else multi[i].push(k);
          } else {
            picked[i] = (picked[i] === k ? null : k);
            if (picked[i] !== null) { typed[i] = ''; free.value = ''; own.classList.remove('is-lit'); }
          }
          marks();
          syncCta();
        });
        body.appendChild(b);
      });
      marks();
    }
    function buildNum() {
      body.classList.add('afl-q__as--num');
      var f = el('div', 'afl-q__field');
      var set = el('div', 'afl-q__set');
      if (D[i].prefix) set.appendChild(el('span', 'afl-q__pre', D[i].prefix));
      numInput = document.createElement('input');
      numInput.className = 'afl-q__num';
      numInput.type = 'text';
      numInput.setAttribute('inputmode', D[i].decimals ? 'decimal' : 'numeric');
      numInput.autocomplete = 'off';
      numInput.placeholder = '0';
      numInput.setAttribute('aria-label', 'Your number');
      numInput.value = shownNum(nums[i], D[i].decimals);
      numInput.addEventListener('input', function () {
        nums[i] = clean(numInput.value, D[i].decimals);
        numInput.value = shownNum(nums[i], D[i].decimals);
        fitNum();
        syncCta();
      });
      set.appendChild(numInput);
      f.appendChild(set);
      f.appendChild(el('div', 'afl-q__rule'));
      body.appendChild(f);
      fitNum();
    }
    // THE RULER STEP. A big readout, the tick strip under it, and a quiet "type
    // it instead" door for keyboards and screen readers. The strip is two
    // repeating hairline layers whose origin is one CSS length, so dragging is a
    // single style write per move and the ticks stay pixel aligned to the centre
    // mark at any value.
    function buildRuler() {
      var d = D[i], k = i;
      var cfg = RULERS[d.ruler] || RULERS.height;
      body.classList.add('afl-q__as--rl');

      var wrapR = el('div', 'afl-rl');
      if (rulerSet[k]) wrapR.classList.add('is-set');
      var val = el('p', 'afl-rl__val');
      var nEl = el('span', 'afl-rl__n', rulerText(d.ruler, rulerVal[k]));
      val.appendChild(nEl);
      if (cfg.unit) val.appendChild(el('span', 'afl-rl__u', cfg.unit));
      wrapR.appendChild(val);

      var tr = el('div', 'afl-rl__tr');
      tr.setAttribute('role', 'slider');
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('aria-label', cfg.label);
      var tk = el('span', 'afl-rl__tk');
      tk.setAttribute('aria-hidden', 'true');
      tk.style.setProperty('--step', cfg.step + 'px');
      tk.style.setProperty('--maj', String(cfg.maj));
      var ix = el('span', 'afl-rl__ix');
      ix.setAttribute('aria-hidden', 'true');
      tr.appendChild(tk);
      tr.appendChild(ix);
      wrapR.appendChild(tr);

      var alt = btn('afl-rl__alt', 'Type it instead');
      var row = el('div', 'afl-rl__type');
      var fields = [];
      function field(ph, lab, aria) {
        var inp = document.createElement('input');
        inp.className = 'afl-rl__in';
        inp.type = 'text';
        inp.setAttribute('inputmode', 'numeric');
        inp.setAttribute('aria-label', aria);
        inp.autocomplete = 'off';
        inp.placeholder = ph;
        row.appendChild(inp);
        row.appendChild(el('span', 'afl-rl__lb', lab));
        fields.push(inp);
        return inp;
      }
      var ft = null, inch = null, lbs = null;
      if (d.ruler === 'height') {
        ft = field(String(Math.floor(cfg.start / 12)), 'ft', 'Feet');
        inch = field(String(cfg.start % 12), 'in', 'Inches');
      } else {
        lbs = field(String(cfg.start), 'lb', 'Pounds');
      }
      wrapR.appendChild(alt);
      wrapR.appendChild(row);
      body.appendChild(wrapR);

      var lastAnim = 0;
      function fillFields() {
        var v = rulerVal[k];
        if (!rulerSet[k]) return;
        if (ft) {
          if (document.activeElement !== ft) ft.value = String(Math.floor(v / 12));
          if (document.activeElement !== inch) inch.value = String(v % 12);
        } else if (document.activeElement !== lbs) {
          lbs.value = String(v);
        }
      }
      function paint(dir) {
        var v = rulerVal[k];
        var w = tr.clientWidth || 330;
        tk.style.setProperty('--x', (w / 2 - (v - cfg.min) * cfg.step) + 'px');
        var t = rulerText(d.ruler, v);
        if (nEl.textContent !== t) {
          // the number arrives, it never hard swaps. On a fast drag the steps
          // come faster than the 200ms animation, so those land plainly and the
          // animation runs as the drag settles.
          var now = Date.now();
          if (dir && now - lastAnim > 130) { lastAnim = now; swapText(nEl, t, dir); }
          else nEl.textContent = t;
        }
        tr.setAttribute('aria-valuemin', String(cfg.min));
        tr.setAttribute('aria-valuemax', String(cfg.max));
        tr.setAttribute('aria-valuenow', String(v));
        tr.setAttribute('aria-valuetext', t + (cfg.unit ? ' ' + cfg.unit : ''));
        fillFields();
      }
      function setV(raw, mark) {
        var nv = Math.max(cfg.min, Math.min(cfg.max, Math.round(raw)));
        var dir = nv > rulerVal[k] ? 1 : (nv < rulerVal[k] ? -1 : 0);
        rulerVal[k] = nv;
        if (mark && !rulerSet[k]) { rulerSet[k] = true; wrapR.classList.add('is-set'); }
        paint(dir);
        if (mark) syncCta();
      }
      function unset() {
        if (!rulerSet[k]) return;
        rulerSet[k] = false;
        wrapR.classList.remove('is-set');
        syncCta();
      }

      // the drag. setPointerCapture keeps the strip under the finger once it has
      // left the ticks, touch-action: none (css) stops iOS claiming it as a pan.
      var sx = 0, sv = 0, dragging = false;
      tr.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        sx = e.clientX;
        sv = rulerVal[k];
        try { tr.setPointerCapture(e.pointerId); } catch (z) {}
        wrapR.classList.add('is-drag');
        setV(rulerVal[k], true);
      });
      tr.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        // the strip travels with the finger: pulling it left brings the bigger
        // numbers in from the right, the way a real tape reads.
        setV(sv - (e.clientX - sx) / cfg.step, true);
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) {
        tr.addEventListener(ev, function (e) {
          if (!dragging) return;
          dragging = false;
          wrapR.classList.remove('is-drag');
          try { tr.releasePointerCapture(e.pointerId); } catch (z) {}
        });
      });
      tr.addEventListener('keydown', function (e) {
        var s = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') s = 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') s = -1;
        else if (e.key === 'PageUp') s = cfg.page;
        else if (e.key === 'PageDown') s = -cfg.page;
        else return;
        e.preventDefault();
        setV(rulerVal[k] + s, true);
      });

      alt.addEventListener('click', function () {
        wrapR.classList.add('is-typing');
        fillFields();
        fields[0].focus();
      });
      function readFields() {
        if (ft) {
          var f = ft.value.replace(/[^0-9]/g, '').slice(0, 1);
          var n = inch.value.replace(/[^0-9]/g, '').slice(0, 2);
          if (ft.value !== f) ft.value = f;
          if (inch.value !== n) inch.value = n;
          if (!f) return unset();
          setV(parseInt(f, 10) * 12 + (parseInt(n, 10) || 0), true);
        } else {
          var p = lbs.value.replace(/[^0-9]/g, '').slice(0, 3);
          if (lbs.value !== p) lbs.value = p;
          if (!p) return unset();
          setV(parseInt(p, 10), true);
        }
      }
      fields.forEach(function (inp) {
        inp.addEventListener('input', readFields);
        inp.addEventListener('blur', function () { if (rulerSet[k]) fillFields(); });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
        });
      });

      paint(0);
      // the strip's origin is measured from the track, which has no width until
      // it is laid out. One more paint after layout puts the first tick exactly
      // under the centre mark.
      requestAnimationFrame(function () { if (tr.isConnected) paint(0); });
      if ((d.chips || []).length) buildChips();
    }

    // THE STEP CHANGE (v1191). It used to write the new question straight over
    // the old one and only animate the arrival, which is the "snap and pop" he
    // flagged: the outgoing step vanished on a frame. Now the whole block
    // (question, unit, answers, the free field) fades OUT on 150ms ease-in,
    // the content is swapped while it is invisible, and it comes back on the
    // screen's own entrance. Reduced motion writes straight through.
    var STEP_OUT = 150;
    var swapT = null;
    var FADERS = [qEl, unit, body, own];
    function paintStep() {
      var d = D[i];
      qEl.textContent = d.q;
      // THE SLOT UNDER THE QUESTION carries the unit on a number or ruler step,
      // and on a time question it carries what Clarity already heard. It is
      // reserved on every step (css min-height), so using it costs no layout.
      // "You said", never "You typed": they said it to Clarity, in a conversation.
      var said = (d.clarityTime && clarityTime) ? ('You said ' + clarityTime + ' in Clarity.') : '';
      unit.textContent = said || ((d.kind === 'num' || d.kind === 'ruler') ? (d.unit || '') : '');
      unit.classList.toggle('is-said', !!said);
      numInput = null;
      body.className = 'afl-q__as';
      body.innerHTML = '';
      if (d.kind === 'num') buildNum();
      else if (d.kind === 'ruler') buildRuler();
      else buildChips();
      // THE FREE FIELD DIET (v3): the field is only on the questions where their
      // own words add something. See wantsFree() for the standing rule.
      var showFree = wantsFree(d);
      own.classList.toggle('is-off', !showFree);
      own.setAttribute('aria-hidden', showFree ? 'false' : 'true');
      free.disabled = !showFree;
      free.value = typed[i];
      free.setAttribute('placeholder', (typeof d.free === 'string' ? d.free : '') || 'In your own words');
      own.classList.toggle('is-lit', showFree && typed[i].trim().length > 0);
      back.classList.toggle('is-ghost', i === 0);
      syncCta();
    }
    function enterStep() {
      if (reduced()) return;
      qEl.classList.remove('is-fade');
      body.classList.remove('is-enter');
      unit.classList.remove('is-enter');
      own.classList.remove('is-enter');
      void qEl.offsetWidth;
      qEl.classList.add('is-fade');
      body.classList.add('is-enter');
      unit.classList.add('is-enter');
      own.classList.add('is-enter');
    }
    function render(anim) {
      if (swapT) { clearTimeout(swapT); swapT = null; }
      FADERS.forEach(function (n) { n.classList.remove('afl-step-out'); });
      if (!anim || reduced()) { paintStep(); return; }
      void qEl.offsetWidth;
      FADERS.forEach(function (n) { n.classList.add('afl-step-out'); });
      swapT = setTimeout(function () {
        swapT = null;
        FADERS.forEach(function (n) { n.classList.remove('afl-step-out'); });
        paintStep();
        enterStep();
      }, STEP_OUT);
    }
    current.teardown = function () { if (swapT) clearTimeout(swapT); };
    var stopHold = bindCtaHold(go, 780, function () {
      go.classList.add('is-done');
      if (typeof opts.onDone === 'function') opts.onDone(collect());
    }, function () { return go.classList.contains('afl-cta--hold') && !go.disabled; });

    function collect() {
      return D.map(function (d, k) {
        // MULTI (v3): every lit chip is part of the answer, comma joined in the
        // order they were tapped, because that order is their own ranking.
        // chipList keeps them separated for the brain; chip is the readable one.
        var list = d.multi
          ? multi[k].map(function (x) { return d.chips[x]; })
          : (picked[k] === null ? [] : [d.chips[picked[k]]]);
        return {
          q: d.q,
          multi: !!d.multi,
          chip: list.length ? list.join(', ') : null,
          chipList: list,
          // the ruler lands where every other number lands, written plainly:
          // 6'1" for a height, 218 for a weight.
          num: d.kind === 'ruler'
            ? (rulerSet[k] ? rulerText(d.ruler, rulerVal[k]) : null)
            : (nums[k] || null),
          free: typed[k] || null,
          // provenance: a preselected chip came from Clarity, not from a tap
          fromClarity: !!(d.clarityTime && clarityTime) || undefined
        };
      });
    }

    go.addEventListener('click', function () {
      // a tap landing inside the 150ms swap would advance a step whose answer
      // state has not been painted yet
      if (swapT || go.disabled || go.classList.contains('afl-cta--hold')) return;
      i++;
      render(true);
    });
    back.addEventListener('click', function () {
      if (swapT || i === 0) return;
      i--;
      render(true);
    });
    free.addEventListener('input', function () {
      typed[i] = free.value;
      own.classList.toggle('is-lit', free.value.trim().length > 0);
      // on a ruler step the chips are a second dimension (sex), not another way
      // to answer the same thing, so typing a note must not clear the pick.
      if (free.value.trim().length > 0 && picked[i] !== null && !D[i].multi && !isRuler(i)) { picked[i] = null; marks(); }
      syncCta();
    });
    free.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); free.blur(); if (!go.disabled && !go.classList.contains('afl-cta--hold')) go.click(); }
    });
    render(false);
    enterFade(wrap);
    enterFade(nav);
    return root;
  }

  // ===========================================================================
  // 2.3  ld-4, THE WORKING LIST
  // The wait shows only what Memento already knows, one line at a time, with a
  // real elapsed clock and the bare M breathing at the foot. Nothing here is
  // produced by the model and nothing is a stage name.
  // NOTE (phase 5): generation moves server side. This screen already accepts a
  // promise, so the swap is one argument.
  // ===========================================================================
  var HOLD_MS = 6000;
  function openLoading(key, opts) {
    opts = opts || {};
    var fx = FIXTURES[key] || FIXTURES.weight;
    var FACTS = fx.intake.facts || [];
    var col = shell('loading', { label: 'Writing your plan' });
    var hold = ActionFlow._holdMs || HOLD_MS;

    var c = el('div', 'afl-ld');
    col.appendChild(c);

    // THE CLOSE CHIP OWNS ITS CORNER (law 3a2, v1190). The elapsed clock used to
    // sit at the row's right end, which is under the X on a real phone (his
    // screenshot). It now reads inline after the title, and the row's box stops
    // well short of the corner, so nothing of this screen is ever in the zone.
    var head = el('div', 'afl-ld__head');
    var title = el('h4', null, 'Writing your plan.');
    var clk = el('p', 'afl-ld__clk', '0:00');
    head.appendChild(title);
    head.appendChild(clk);
    c.appendChild(head);

    var STATES = ['This usually takes about 30 seconds.',
      'Still creating. This one is taking longer. You have big plans lol',
      'Still creating.'];
    var state = el('p', 'afl-ld__state', STATES[0]);
    c.appendChild(state);

    var stage = el('div', 'afl-ld__stage');
    var layer = el('div', 'afl-ld__layer');
    var fact = el('div', 'afl-ld__fact');
    var src = el('p', 'afl-ld__src');
    var say = el('p', 'afl-ld__say');
    fact.appendChild(src);
    fact.appendChild(say);
    var arr = el('div', 'afl-ld__arr');
    arr.appendChild(el('p', null, 'Your plan is ready.'));
    layer.appendChild(fact);
    layer.appendChild(arr);
    stage.appendChild(layer);
    var tickRow = el('div', 'afl-ld__ticks');
    var ticks = FACTS.map(function () { var t = el('i'); tickRow.appendChild(t); return t; });
    stage.appendChild(tickRow);
    c.appendChild(stage);

    // the M, breathing: quiet brand while the plan writes. Reduced motion holds
    // it static, and the whole node dies with the screen, so nothing keeps a
    // layer alive offscreen.
    var m = markM('afl-ld__m');
    col.appendChild(m);

    var nav = navRow();
    var go = cta('Open your plan');
    go.classList.add('is-waiting');
    nav.appendChild(go);
    col.appendChild(nav);

    var timers = [], t0 = Date.now(), tickT = null, pass = 0, idx = 0, landed = false;
    var longer = !!(opts.longWait || ActionFlow._longWait);
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function fmt(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
    function setState(k) {
      var txt = STATES[Math.min(k, STATES.length - 1)];
      if (state.textContent === txt) return;
      state.classList.add('is-swap');
      at(450, function () { state.textContent = txt; state.classList.remove('is-swap'); });
    }
    function marks(n) { ticks.forEach(function (t, k) { t.classList.toggle('is-on', k <= n); }); }

    function show() {
      var order = FACTS.slice(pass % FACTS.length).concat(FACTS.slice(0, pass % FACTS.length));
      var f = order[idx];
      fact.classList.toggle('is-calm', pass > 0);
      src.textContent = f.s;
      say.textContent = '';
      var line = f.date ? (dateLabel(f.date) + '. That is ' + daysUntil(f.date) + ' days from today.') : f.t;
      if (f.q) {
        var o = el('span', 'afl-ld__mk', '“');
        var cq = el('span', 'afl-ld__mk', '”');
        say.appendChild(o);
        say.appendChild(document.createTextNode(line));
        say.appendChild(cq);
      } else {
        say.textContent = line;
      }
      marks(idx);
      at(20, function () { fact.classList.add('is-on'); });
      at(hold - 600, function () { fact.classList.remove('is-on'); });
      at(hold, function () {
        idx++;
        if (idx < order.length) return show();
        idx = 0;
        pass++;
        if (opts.promise || longer) {
          if (longer && pass < 3) { setState(pass); return show(); }
          if (opts.promise && !landed) { setState(pass); return show(); }
        }
        land();
      });
    }
    function land() {
      if (landed) return;
      landed = true;
      timers.forEach(clearTimeout);
      timers = [];
      if (tickT) { clearInterval(tickT); tickT = null; }
      // THE FINISH STATE (v1191, Malik on-device): what is left is "Your plan is
      // ready.", the CTA and the X. Nothing else. The elapsed clock leaves with
      // the title (it used to survive the landing), and every one of these
      // leaves on a fade, never a display flip.
      head.classList.add('is-gone');
      state.classList.remove('is-swap');
      state.classList.add('is-gone');
      tickRow.classList.add('is-gone');
      fact.classList.remove('is-on');
      m.classList.add('is-gone');
      fadeOutNode(m, 400);
      at(120, function () { arr.classList.add('is-on'); });
      at(280, function () { go.classList.remove('is-waiting'); });
    }
    if (opts.promise && typeof opts.promise.then === 'function') {
      opts.promise.then(function () { at(0, land); }, function () { at(0, land); });
    }
    go.addEventListener('click', function () {
      if (go.classList.contains('is-waiting')) return;
      if (typeof opts.onOpen === 'function') opts.onOpen();
    });
    tickT = setInterval(function () { if (!landed) clk.textContent = fmt(Date.now() - t0); }, 250);
    at(650, show);
    enterFade(c);
    current.teardown = function () {
      timers.forEach(clearTimeout);
      if (tickT) clearInterval(tickT);
    };
    return root;
  }

  // ===========================================================================
  // 2.4  lg-5, THE LOGIC
  // Three parts, each of which skims alone. Part one is concise: the star, one
  // line of context, the arrow, "How to make it unreasonable you don't get
  // there:" as an arrowed act list, the starter, "Say NO to:". Part two is the
  // math: the equation block (every number re-checked here on the client) and
  // the reasoning, with the refresher drawer on the screen and focus buckets.
  // Part three is the three questions. Then the trust line, "Ready?" and the
  // hold. STANDING DOOR: the M on the day screen opens this page.
  // ===========================================================================
  function openLogic(key, opts) {
    opts = opts || {};
    var fx = FIXTURES[key] || FIXTURES.weight;
    var plan = opts.plan || fx.plan;
    // top: the only scrolling surface in the flow, so the only one that needs
    // the flow's own top scrim (his "the goal title gets sliced" note).
    var col = shell('logic', { label: 'Why this plan', top: true });
    var lgTimers = [];
    current.teardown = function () { lgTimers.forEach(clearTimeout); lgTimers = []; };

    var c = el('div', 'afl-lg');
    var sc = el('div', 'afl-lg__sc');
    var box = el('div', 'afl-lg__in');
    sc.appendChild(box);
    c.appendChild(sc);
    col.appendChild(c);

    // ---- part one -----------------------------------------------------------
    // THE TWO BEAT ENTRANCE (v1192, his words: "if the title faded in first,
    // then the [body] would be nice"). The star is its own beat; everything
    // else lives in one wrapper and arrives a moment later. Reassigning `box`
    // here means every append below lands in the second beat without touching
    // any of them. TWO groups, never a per element cascade.
    var starEl = el('p', 'afl-lg__star', plan.star);
    box.appendChild(starEl);
    var rest = el('div', 'afl-lg__rest');
    box.appendChild(rest);
    box = rest;
    if (plan.commitment) box.appendChild(el('p', 'afl-lg__b', plan.commitment));
    if (plan.arrow) {
      var ar = el('div', 'afl-lg__ar');
      ar.appendChild(el('b', 'is-from', plan.arrow.from));
      ar.appendChild(el('i', null, '→'));
      ar.appendChild(el('b', null, plan.arrow.to));
      box.appendChild(ar);
    }
    box.appendChild(el('p', 'afl-lg__lead', 'How to make it unreasonable you don’t get there:'));
    var actsWrap = el('div', 'afl-lg__acts');
    (plan.acts || []).forEach(function (a, k) {
      var row = el('div', 'afl-lg__row' + (k === 0 ? ' is-star' : ''));
      row.appendChild(el('i', null, '→'));
      var d = el('div');
      d.appendChild(el('b', null, a.text));
      if (a.reason) d.appendChild(el('span', null, a.reason));
      row.appendChild(d);
      actsWrap.appendChild(row);
    });
    box.appendChild(actsWrap);
    var starterAct = (plan.acts || []).filter(function (a) { return a.starter; })[0];
    if (starterAct) {
      var st = el('p', 'afl-lg__st');
      st.appendChild(el('b', null, 'The first 2 minutes:'));
      st.appendChild(document.createTextNode(' ' + starterAct.starter));
      box.appendChild(st);
    }
    if (plan.noList && plan.noList.length) {
      var no = el('p', 'afl-lg__no');
      no.appendChild(el('b', null, 'Say NO to:'));
      no.appendChild(document.createTextNode(' ' + plan.noList.join(', ') + '.'));
      box.appendChild(no);
    }

    // ---- part two: the math -------------------------------------------------
    box.appendChild(el('p', 'afl-lg__h', 'The math behind this'));
    var eqOk = true;
    if (plan.eq) {
      var eq = el('div', 'afl-lg__eq');
      function eqRow(label, value, cls) {
        var d = el('div', cls || null);
        d.appendChild(el('s', null, label));
        d.appendChild(el('b', null, String(value)));
        eq.appendChild(d);
        return d;
      }
      (plan.eq.rows || []).forEach(function (r) { eqRow(r.label, r.value); });
      (plan.eq.compute || []).forEach(function (r) {
        var chk = checkCompute(r);
        // The client is the last word on arithmetic: if the written value and
        // the expression disagree by more than 2%, the computed number is what
        // the person reads, and the plan is flagged for the judge.
        var fixed = null;
        if (!chk.ok && chk.value != null) {
          eqOk = false;
          fixed = '≈ ' + Math.round(chk.value).toLocaleString();
        }
        var rowEl = eqRow(r.label, r.shown);
        // THE SUBSTITUTION READS. The written number lands first, then corrects
        // itself once the page has settled, with the same quiet 200ms the rail
        // uses. A silent hard swap on paint would just look like a typo.
        if (fixed) {
          var vb = rowEl.querySelector('b');
          lgTimers.push(setTimeout(function () { swapText(vb, fixed, 1); }, 520));
        }
      });
      if (plan.eq.result) eqRow(plan.eq.result.label, plan.eq.result.value, 'is-result');
      box.appendChild(eq);
    }
    ActionFlow._lastEqCheck = eqOk;

    (plan.reasoning || []).forEach(function (p, k) {
      box.appendChild(el('p', 'afl-lg__b afl-lg__b--ind', p));
      // THE REFRESHER: the Clarity scale, closed by default. Nobody is forced
      // through it. Screen time and focus only.
      if (k === 0 && plan.scale) box.appendChild(refresher());
    });

    // ---- part three: the questions -----------------------------------------
    box.appendChild(el('p', 'afl-lg__h', 'Questions you might have'));
    (plan.qas || []).forEach(function (x) {
      box.appendChild(el('p', 'afl-lg__q', x.q));
      box.appendChild(el('p', 'afl-lg__qa', x.a));
    });
    box.appendChild(el('p', 'afl-lg__src', 'Every line above came from what you told Memento.'));
    box.appendChild(el('p', 'afl-lg__fair', 'Ready?'));

    var nav = navRow();
    var go = cta(opts.standing ? 'Close' : 'Hold to agree. Start today.');
    go.classList.add('afl-cta--hold');
    var keep = el('p', 'afl-nav__sub', 'You can always return to this page.');
    nav.appendChild(go);
    nav.appendChild(keep);
    col.appendChild(nav);

    if (opts.standing) {
      // Standing-door mode: the page is a reference, not a commitment. One tap
      // closes it (the agreement was given once, it is not re-asked).
      go.classList.remove('afl-cta--hold');
      go.classList.add('is-live');
      go.addEventListener('click', function () {
        if (typeof opts.onClose === 'function') opts.onClose(); else destroy();
      });
    } else {
      // ---- THE SCROLL GATE (v1191, Malik) --------------------------------
      // You cannot agree to a page you have not read. The hold wakes up once
      // 80% of the page has passed, and once awake it STAYS awake (scrolling
      // back up is reading, not undoing).
      //
      // It can never be unreachable: progress is measured from the BOTTOM of
      // the viewport, (scrollTop + clientHeight) / scrollHeight, so a page that
      // does not scroll at all is already 100% and the hold is live on the
      // first frame. A tall desktop window, a short plan and a phone all land
      // on the same rule. Recomputed on scroll, on resize, and once after the
      // fonts settle, because scrollHeight before webfont layout is a lie.
      var GATE = 0.8;
      var eligible = false;
      go.disabled = true;
      go.setAttribute('aria-disabled', 'true');

      function gateProgress() {
        var h = sc.scrollHeight, v = sc.clientHeight;
        if (!h) return 1;
        if (h <= v + 2) return 1;                 // nothing to scroll: fully read
        return Math.min(1, (sc.scrollTop + v) / h);
      }
      function gateSync() {
        if (eligible) return;
        if (gateProgress() < GATE) return;
        eligible = true;
        go.disabled = false;
        go.removeAttribute('aria-disabled');
        // the live look arrives on .afl-cta's own 200ms background/colour
        // transition, so the wake up is a fade, never a snap.
      }
      sc.addEventListener('scroll', gateSync, { passive: true });
      var onResize = function () { eligible ? null : gateSync(); };
      window.addEventListener('resize', onResize);
      lgTimers.push(setTimeout(gateSync, 0));
      lgTimers.push(setTimeout(gateSync, 400));   // after webfonts relayout
      try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(gateSync); } catch (e) {}
      gateSync();
      var prevTeardown = current.teardown;
      current.teardown = function () {
        window.removeEventListener('resize', onResize);
        if (typeof prevTeardown === 'function') prevTeardown();
      };

      bindCtaHold(go, 900, function () {
        go.classList.add('is-done');
        if (typeof opts.onAgree === 'function') opts.onAgree();
      }, function () { return eligible; });
    }
    // the page arrives in two beats: the title, then everything under it.
    enterFade(starEl, 0);
    enterFade(rest, 1);
    enterFade(nav, 1);
    return root;
  }

  // The scale from Clarity, four staged frames with one caption each. The
  // animations are killed outright while the drawer is shut (a closed drawer
  // that keeps animating is exactly the hidden-animation bug), and reduced
  // motion pins every stage to its end state.
  function refresher() {
    var wrap = el('div', 'afl-ref');
    var head = btn('afl-ref__t');
    head.setAttribute('aria-expanded', 'false');
    head.appendChild(el('span', null, 'A refresher on focus'));
    head.innerHTML += '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5L6 8.5l4-4"/></svg>';
    var bd = el('div', 'afl-ref__bd');
    function scale(beam, red, cyan, hand, cap) {
      var s = el('div', 'afl-sc');
      s.setAttribute('aria-hidden', 'true');
      s.appendChild(el('div', 'afl-sc__f'));
      var b = el('div', 'afl-sc__beam' + (beam ? ' ' + beam : ''));
      b.appendChild(el('b', 'afl-sc__red' + (red ? ' ' + red : '')));
      b.appendChild(el('b', 'afl-sc__cyan' + (cyan ? ' ' + cyan : '')));
      if (hand) b.appendChild(el('u', 'afl-sc__hand'));
      s.appendChild(b);
      bd.appendChild(s);
      bd.appendChild(el('p', 'afl-ref__cap', cap));
    }
    scale('is-tilt', '', '', false, 'Your attention is a scale. It tips toward the heaviest thing on it, and distractions are heavy and easy to reach.');
    scale('is-push', '', '', true, 'Willpower is a push on the beam. It works for a burst, then it burns out.');
    scale('is-shrinkb', 'is-shrink', '', false, 'Removing distractions shrinks the left side. It helps, but while it still outweighs the right, the scale stays tipped.');
    scale('is-flip', 'is-dim', 'is-grow', false, 'The real fix is a heavier right side: a goal that matters, with progress you can see. The scale flips, and focus becomes automatic.');
    head.addEventListener('click', function () {
      var open = !wrap.classList.contains('is-open');
      wrap.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    wrap.appendChild(head);
    wrap.appendChild(bd);
    return wrap;
  }

  // ===========================================================================
  // 2.5  u-1, THE DAY
  // The bare M at the top is the door back to the logic page. The star act owns
  // the screen. The graduation rail on the right edge is the ONLY sizing
  // control, and crossing a named size folds or grows the supports, so the size
  // and the shape of the day are one state. Supports are plain taps (the hold
  // belongs to the day itself). The NO list is one quiet line. The day is held
  // for 3 seconds, and the BACKGROUND itself goes green from the bottom up,
  // flat, under every element.
  // ===========================================================================
  var DAY_HOLD = 3000;
  var WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function openDay(key, opts) {
    opts = opts || {};
    var fx = FIXTURES[key] || FIXTURES.weight;
    var plan = opts.plan || fx.plan;
    var col = shell('day', { label: 'Today' });

    var acts = plan.acts || [];
    var starAct = acts[0] || { text: '' };
    var sups = acts.slice(1, 3);
    var ladder = (plan.sizes && plan.sizes.ladder) ? plan.sizes.ladder.slice() : [];
    var named = (plan.sizes && plan.sizes.named) ? plan.sizes.named.slice() : [];
    var hasSize = ladder.length > 0;
    var ascending = named.length > 1 ? named[named.length - 1] > named[0] : true;

    // THE OFF DAY. offDays.trainingDays names the days the plan runs; anything
    // else is a rest day and the star switches off. The supports are still the
    // day, so the layout never changes shape for a rest day.
    var off = false;
    if (plan.offDays && plan.offDays.trainingDays) {
      var today = WEEK[new Date().getDay()];
      off = plan.offDays.trainingDays.indexOf(today) === -1;
    }
    if (opts.off != null) off = !!opts.off;

    var day = el('div', 'afl-day');
    col.appendChild(day);

    // THE GREEN RISE lives on the SHELL, not inside the day column: the whole
    // background goes green, under every element, full bleed on desktop too.
    var rise = el('div', 'afl__rise');
    rise.setAttribute('aria-hidden', 'true');
    var wash = el('div', 'afl__wash');
    wash.setAttribute('aria-hidden', 'true');
    root.insertBefore(wash, col);
    root.insertBefore(rise, col);

    // the M: the standing door back to the logic page, below the island.
    var mBtn = btn('afl-day__m');
    mBtn.setAttribute('aria-label', 'Why this plan');
    mBtn.appendChild(markM());
    day.appendChild(mBtn);

    var rail = btn('afl-day__rail');
    rail.setAttribute('role', 'slider');
    rail.setAttribute('aria-label', 'today’s size');
    rail.setAttribute('aria-orientation', 'vertical');
    day.appendChild(rail);

    day.appendChild(el('div', 'afl-day__sp is-a'));

    var starEl = el('p', 'afl-day__star');
    var pre = el('span', 'afl-day__pre');
    var tok = el('span', 'afl-day__tok');
    var post = el('span', 'afl-day__post');
    starEl.appendChild(pre);
    starEl.appendChild(tok);
    starEl.appendChild(post);
    day.appendChild(starEl);

    // the deep work door. Rendered when the star act is session shaped, and
    // INERT until phase 3.2 binds it to the existing timer surface.
    var dw = btn('afl-day__dw');
    dw.appendChild(el('b', null, 'Deep work'));
    dw.disabled = true;
    dw.setAttribute('aria-disabled', 'true');
    day.appendChild(dw);

    day.appendChild(el('div', 'afl-day__sp is-b'));

    var plate = el('div', 'afl-day__plate');
    var ruleEl = el('div', 'afl-day__rule');
    plate.appendChild(ruleEl);
    var supEls = sups.map(function (s, k) {
      var b = btn('afl-day__sup');
      b.dataset.s = String(k);
      var inr = el('span', 'afl-day__in');
      var boxE = el('span', 'afl-day__box');
      boxE.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.4 6.3l2.4 2.4 4.8-5"/></svg>';
      inr.appendChild(boxE);
      inr.appendChild(el('span', 'afl-day__tx', s.text));
      b.appendChild(inr);
      plate.appendChild(b);
      return b;
    });
    var noLine = el('p', 'afl-day__no');
    plate.appendChild(noLine);
    day.appendChild(plate);

    var nav = navRow();
    nav.classList.add('afl-nav--day');
    var hold = btn('afl-day__hold');
    hold.appendChild(el('span', null, 'Hold to complete'));
    var doneRow = el('div', 'afl-day__done');
    doneRow.appendChild(el('b'));
    doneRow.appendChild(el('span', 'afl-day__dt'));
    var undo = btn('afl-day__undo', 'Undo');
    doneRow.appendChild(undo);
    nav.appendChild(hold);
    nav.appendChild(doneRow);
    col.appendChild(nav);

    // ---- state --------------------------------------------------------------
    var actCount = 3;                        // star + both supports (arrives full)
    var val = hasSize ? named[named.length - 1] : 0;
    var lastVal = val;
    var ticks = sups.map(function () { return false; });
    var signed = false;
    var railTicks = [];

    function ladderAsc() {
      var L = hasSize ? ladder.slice() : [0, 1, 2];
      L.sort(function (a, b) { return ascending ? a - b : b - a; });
      return L;
    }
    function actsForValue(v) {
      var hv = function (x) { return ascending ? x : -x; };
      if (!named.length) return 3;
      if (hv(v) <= hv(named[0])) return 1;
      if (hv(v) <= hv(named[1])) return 2;
      return 3;
    }
    var starShape = null;                     // 'off' | 'act', only rebuilt on a change
    function drawStar() {
      // v1191: this used to blow the sentence away and rebuild it on EVERY
      // paint, which cancels any animation running on the size token and is a
      // hard swap by construction. The nodes are now only re-hung when the
      // shape of the line actually changes (rest day <-> the act).
      if (off) {
        if (starShape !== 'off') {
          starShape = 'off';
          starEl.innerHTML = '';
          starEl.classList.add('is-off');
          var lines = (plan.offDays && plan.offDays.restLine ? plan.offDays.restLine : 'Rest day.\nEnjoy :)').split('\n');
          lines.forEach(function (ln, k) {
            if (k) starEl.appendChild(document.createElement('br'));
            starEl.appendChild(document.createTextNode(ln));
          });
        }
        return;
      }
      if (starShape !== 'act') {
        starShape = 'act';
        starEl.innerHTML = '';
        starEl.classList.remove('is-off');
        starEl.appendChild(pre);
        starEl.appendChild(tok);
        starEl.appendChild(post);
      }
      if (!hasSize) {
        pre.textContent = starAct.text;
        tok.textContent = '';
        post.textContent = '';
        return;
      }
      // the size is part of the sentence: the rail owns it, nothing else does.
      var label = sizeText(plan, val);
      // the size token inside the sentence. Longest unit spelling first, or
      // "3 hours" matches on "3 hour" and leaves an orphan "s" behind.
      var m = starAct.text.match(/^(.*?)(\d+\s*(?:minutes|minute|mins|min|hours|hour|hrs|hr))(.*)$/i);
      if (m) {
        pre.textContent = m[1];
        // the number the rail is moving: it arrives from the direction the rail
        // went, never a hard swap (his on-device note).
        swapText(tok, label, (val === lastVal) ? 1 : (ascending ? (val > lastVal ? 1 : -1) : (val < lastVal ? 1 : -1)));
        post.textContent = m[3];
      } else {
        pre.textContent = starAct.text;
        tok.textContent = '';
        post.textContent = '';
      }
      lastVal = val;
    }
    function drawPlate() {
      supEls.forEach(function (b, k) {
        var show = k < actCount - 1;
        b.classList.toggle('is-gone', !show);
        b.classList.toggle('is-on', show && ticks[k]);
        b.classList.toggle('is-lapse', signed && show && !ticks[k]);
        b.tabIndex = (show && !signed) ? 0 : -1;
        b.setAttribute('aria-pressed', ticks[k] ? 'true' : 'false');
      });
      ruleEl.classList.toggle('is-gone', actCount === 1);
    }
    // THE RAIL (Malik, on-device: "animate it nicely"). It used to rebuild every
    // tick node on every change, so a brand new element started at its final
    // size and NO transition ever ran: that is the whole reason it felt
    // stepped. The ticks are built once and only ever change class from here,
    // and the two neighbours either side answer the active one, so the rail
    // reads as one liquid thing instead of six separate states.
    function railIndex() {
      var L = ladderAsc(), i = L.indexOf(val);
      if (i < 0) {
        var best = 0, bd = Infinity;
        L.forEach(function (v, j) { var d = Math.abs(v - val); if (d < bd) { bd = d; best = j; } });
        i = best;
      }
      return i;
    }
    function buildRail() {
      var L = ladderAsc();
      rail.innerHTML = '';
      railTicks = [];
      for (var j = L.length - 1; j >= 0; j--) {
        var t = el('i');
        rail.appendChild(t);
        railTicks.push(t);       // painted top down: largest value first
      }
    }
    function drawRail() {
      rail.classList.toggle('is-hide', signed || off || !hasSize);
      if (signed || off || !hasSize) return;
      var L = ladderAsc();
      if (railTicks.length !== L.length) buildRail();
      var i = railIndex();
      railTicks.forEach(function (t, rowIdx) {
        var j = L.length - 1 - rowIdx;
        var d = Math.abs(j - i);
        var cls = (named.indexOf(L[j]) > -1) ? 'is-mk' : '';
        if (d === 0) cls += ' is-on';
        else if (d === 1) cls += ' is-n1';
        else if (d === 2) cls += ' is-n2';
        t.className = cls.trim();
      });
      rail.setAttribute('aria-valuemin', '0');
      rail.setAttribute('aria-valuemax', String(L.length - 1));
      rail.setAttribute('aria-valuenow', String(i));
      rail.setAttribute('aria-valuetext', sizeText(plan, val));
    }
    function paint() {
      day.classList.toggle('is-signed', signed);
      day.classList.toggle('is-off', off);
      if (root) root.classList.toggle('is-signed', signed);
      drawStar();
      drawPlate();
      drawRail();
      dw.classList.toggle('is-gone', !(starAct.session && !off));
      // both of these change on a rest day and on a size change. They fade.
      swapText(noLine, (off || !plan.noList || !plan.noList.length) ? ''
        : 'NO list: ' + plan.noList.join(' · '), 1);
      swapText(hold.querySelector('span'), off ? 'Hold to close the day' : 'Hold to complete', 1);
    }
    function railSet(y) {
      var L = ladderAsc();
      var rect = rail.getBoundingClientRect();
      var t = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
      var i = Math.round((1 - t) * (L.length - 1));
      val = L[i];
      actCount = actsForValue(val);
      for (var k = actCount - 1; k < ticks.length; k++) ticks[k] = false;
      paint();
    }
    rail.addEventListener('pointerdown', function (e) {
      if (signed || off || !hasSize) return;
      try { rail.setPointerCapture(e.pointerId); } catch (z) {}
      railSet(e.clientY);
      var mv = function (ev) { railSet(ev.clientY); };
      var up = function () {
        rail.removeEventListener('pointermove', mv);
        rail.removeEventListener('pointerup', up);
        rail.removeEventListener('pointercancel', up);
      };
      rail.addEventListener('pointermove', mv);
      rail.addEventListener('pointerup', up);
      rail.addEventListener('pointercancel', up);
    });
    rail.addEventListener('keydown', function (e) {
      if (signed || off || !hasSize) return;
      var L = ladderAsc(), i = +rail.getAttribute('aria-valuenow') || 0, d = 0;
      if (e.key === 'ArrowUp') d = 1; else if (e.key === 'ArrowDown') d = -1; else return;
      e.preventDefault();
      i = Math.min(L.length - 1, Math.max(0, i + d));
      val = L[i];
      actCount = actsForValue(val);
      for (var k = actCount - 1; k < ticks.length; k++) ticks[k] = false;
      paint();
    });

    // supports are PLAIN TAPS (Malik's amendment): done is a tick plus a
    // strikethrough. The hold stays reserved for the day itself.
    supEls.forEach(function (b, k) {
      b.addEventListener('click', function () {
        if (signed || b.classList.contains('is-gone')) return;
        ticks[k] = !ticks[k];
        paint();
      });
    });

    // ---- the hold: 3 seconds, and the background itself goes green ----------
    function riseStart() {
      if (reduced()) return;
      rise.style.transition = 'height ' + (DAY_HOLD / 1000) + 's linear';
      rise.style.height = '100%';
    }
    function riseAbort() {
      if (reduced()) return;
      rise.style.transition = 'height .2s ease-out';
      rise.style.height = '0';
    }
    function riseCrest() {
      if (reduced()) return;
      rise.style.transition = 'none';
      rise.style.height = '100%';
      setTimeout(function () {
        rise.style.transition = 'opacity .45s ease-out';
        rise.style.opacity = '0';
        setTimeout(function () {
          if (!rise.isConnected) return;
          rise.style.transition = 'none';
          rise.style.height = '0';
          rise.style.opacity = '1';
        }, 480);
      }, 520);
    }
    // The gesture itself is aflBindHold, the pattern that is proven on his
    // phone. What used to be here (a bare setTimeout, no preventDefault, and a
    // setPointerCapture) is exactly what a real iPhone refused to run.
    var dayHold = aflBindHold(hold, DAY_HOLD, complete, {
      guard: function () { return !signed; },
      onStart: riseStart,
      onAbort: function () { if (!signed) riseAbort(); }
    });

    function complete() {
      signed = true;
      riseCrest();
      doneRow.querySelector('.afl-day__dt').textContent = 'Done at ' + stamp() + '.';
      paint();
      writeDayRecordStub();
      // ======================= THE CLOSE SEAM ============================
      // NOT THIS PHASE. From here, per THE-MERGE resolution B, the sequence is:
      //   1. this signed row holds its ~1.5s undo window (NOTHING persists yet)
      //   2. the pulse asks its one number, at plan.close.cadence, if due
      //   3. ONE rewardMoment() call with the full context
      //   4. exactly ONE ceremony (finale > milestone > daily green page)
      //   5. the rest line ("That's the day." / plan.restLine)
      // The receipts and the ledger write at referee time, after the undo
      // window. This port stops at the crest and the signed row on purpose:
      // wiring any of it here would give the referee a second caller.
      // ===================================================================
    }
    undo.addEventListener('click', function () {
      signed = false;
      dayHold.reset();          // the day can be held again
      rise.style.transition = 'none';
      rise.style.height = '0';
      rise.style.opacity = '1';
      paint();
    });

    // dayRecords WRITE STUB. The real close owns this record (starHash, star,
    // supports, size, off, plus the completionHistory-compatible record and the
    // typed proof event). Until then it writes nothing: a half-written record
    // would feed Consistency counts that the close has to write again.
    function writeDayRecordStub() {
      ActionFlow._lastDayRecord = {
        day: dayKey(),
        starHash: plan.starHash,
        star: true,
        supports: ticks.slice(0, Math.max(0, actCount - 1)),
        size: hasSize ? val : null,
        off: off
      };
    }

    mBtn.addEventListener('click', function () {
      openLogic(key, { plan: plan, standing: true, onClose: function () { openDay(key, opts); } });
    });

    paint();
    enterFade(day);
    enterFade(nav);
    return root;
  }

  // ===========================================================================
  // DEV: walk all five screens against a fixture. URL-gated affordances only;
  // nothing here runs unless it is called.
  // ===========================================================================
  function demo(key, from) {
    key = FIXTURES[key] ? key : 'weight';
    var order = ['intent', 'note', 'refine', 'loading', 'logic', 'day'];
    var at = Math.max(0, order.indexOf(from || 'intent'));
    function step(n) {
      var name = order[n];
      if (name === 'intent') return openIntent(key, { onConfirm: function () { setTimeout(function () { step(1); }, 420); } });
      if (name === 'note') return openNote(NOTE_LINE, { onDone: function () { step(2); } });
      if (name === 'refine') return openRefine(key, { onDone: function () { step(3); } });
      if (name === 'loading') return openLoading(key, { onOpen: function () { step(4); } });
      if (name === 'logic') return openLogic(key, { onAgree: function () { setTimeout(function () { step(5); }, 320); } });
      return openDay(key, {});
    }
    return step(at);
  }

  var ActionFlow = {
    openIntent: openIntent,
    openNote: openNote,
    openRefine: openRefine,
    openLoading: openLoading,
    openLogic: openLogic,
    openDay: openDay,
    close: destroy,
    demo: demo,
    fixtures: FIXTURES,
    questions: QUESTIONS,
    _holdMs: 0,
    _longWait: false,
    _lastEqCheck: true,
    _lastDayRecord: null,
    get isOpen() { return !!root; }
  };
  window.ActionFlow = ActionFlow;
})();
