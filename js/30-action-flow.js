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
        // a fixture is a closed world: getClarityTimeAnswer must not reach into
        // the real transcript here, or a demo on a real account would start
        // quoting the account back at itself and the absent branch would never
        // be provable again.
        fixture: true,
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
        // v1.1 (round 5): the positive twin of the NO list. Acts and standards,
        // every one traceable to this plan or their own words. `chosen` is
        // CLIENT-written by the logic page's picker; the AI always emits [].
        //
        // ROUND 6: SIX LEVERS, NEVER SIX PHRASINGS (rule 8). One per shape, in
        // order: time boundary, daily act, environment rule, floor, refusal
        // shaped standard, check-in habit. The pair this set used to carry
        // ("Weigh in every morning" and "The scale number gets typed in") was
        // one lever wearing two coats, and "Water with every meal" held the
        // same object as the sugar drink rule.
        nonNegotiables: {
          candidates: [
            'The walk happens after dinner',
            'Log the meal before eating it',
            'No sugar drinks in the house',
            'Twenty minutes minimum on hard days',
            'No fast food on weekdays',
            'Weigh in every morning'
          ],
          chosen: []
        },
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
        fixture: true,
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
        // ROUND 6, same law: one lever per candidate. The old set spent three
        // slots on daily acts (post, script) and refusals (new niches, ship
        // before polishing) and had no environment rule and no floor at all.
        nonNegotiables: {
          candidates: [
            'The 3 hours happen before email',
            'Post on all 3 every day',
            'Notifications off during the 3 hours',
            'One hour minimum on bad days',
            'Ship before polishing',
            'Sunday the number gets typed in'
          ],
          chosen: []
        },
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

  // ===========================================================================
  // THE CHECK-IN FREQUENCY QUESTION (v3.1, Malik 2026-08-20: "it's important to
  // know WHEN to ask for progress as that's going to be different based on
  // different goals and priorities").
  //
  // It is asked SECOND TO LAST, right before the baseline number, and only in
  // the buckets that have a number pulse at all. A bucket whose pulse is 'none'
  // (the logs ARE the record: gym, quitting, deep work, the blocker list) or
  // whose cadence is 'on-results' (asked when results exist, "never between")
  // is not asked, because there would be nothing behind the answer.
  // ACTION-BUCKETS.md is the source of both the cadence and the default.
  //
  // The default arrives PRESELECTED, so the fast answer is one tap on Continue
  // and the question is a correction, not a chore.
  // ===========================================================================
  // v3.2 (Malik 2026-08-20): "why not log how many runs... how many hours
  // someone has stayed focused". FITNESS and FOCUS are asked too now.
  //   fitness  the day close IS the log ("did the session happen"), so the
  //            answer only chooses WHICH DAYS it asks. Default: their own
  //            training days, read from the plan or their refine answer, and
  //            Mon/Wed/Fri when neither says.
  //   focus    the hours are a real number nothing else records, so the pref
  //            MANUFACTURES the ask for this bucket even when the plan's close
  //            block says none (see MANUFACTURED_ASK).
  // School and projects stay out (results cadence, and the blocker list).
  var BUCKET_PULSE = {
    weight:      { cadence: 'daily',         pref: 'daily' },   // the weigh-in
    screen:      { cadence: 'nightly',       pref: 'daily' },   // the nightly report
    money:       { cadence: 'weekly:sunday', pref: 'weekly' },  // "never daily"
    'money-job': { cadence: 'weekly:sunday', pref: 'weekly' },  // weekly interviews landed
    business:    { cadence: 'weekly:sunday', pref: 'weekly' },  // the Sunday confirm
    fitness:     { cadence: 'none',          pref: 'custom' },  // their training days
    focus:       { cadence: 'none',          pref: 'daily' },   // hours, every day
    school:      { cadence: 'on-results',    pref: null },      // grades exist or they do not
    projects:    { cadence: 'none',          pref: null }       // the blocker list is the pulse
  };
  // The ask a bucket carries when its PLAN has no close question of its own.
  // Only where a real number exists that nothing else in the app records.
  // Fitness is deliberately absent: its sessions are already counted from the
  // closes, and asking them to count what Memento counts is how a tracker
  // starts lying.
  var MANUFACTURED_ASK = {
    focus: {
      cadence: 'daily', kind: 'num',
      prompt: 'How many hours of deep work today?',
      unit: 'hours', prefix: '', decimals: true,
      source: 'Asked at the end of the day.',
      choices: null
    }
  };
  var WEEK_DEFAULT_TRAINING = [1, 3, 5];        // Mon, Wed, Fri
  var CADENCE_CHIPS = [
    { key: 'daily',       label: 'Every day' },
    { key: 'every-other', label: 'Every other day' },
    { key: 'twice-week',  label: 'Twice a week' },
    { key: 'weekly',      label: 'Once a week' },
    { key: 'custom',      label: 'Pick my days' }
  ];
  var DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var CADENCE_Q = {
    id: 'cadence-pref',
    kind: 'cadence',
    free: false,                       // structured input, so no free field
    q: 'How often do you want to log your progress?',
    unit: 'The more, the better.'
  };
  function bucketPulse(bucket) {
    return BUCKET_PULSE[bucket] || BUCKET_PULSE[(bucket || '').split('-')[0]] || null;
  }
  function cadenceAskable(bucket) {
    var b = bucketPulse(bucket);
    return !!(b && b.pref);
  }
  // THEIR OWN TRAINING DAYS, never a guess dressed as one: the landed plan's
  // trainingDays first, then a refine answer that named days ("Mon/Wed/Fri",
  // "Tue/Thu/Sat"), then the plain 3x week. Only used to PRESELECT, and every
  // toggle stays theirs to change.
  function trainingDaysPref() {
    var days = [];
    try {
      var p = livePlan();
      var td = p && p.offDays && p.offDays.trainingDays;
      if (Array.isArray(td)) {
        td.forEach(function (d) {
          var i = WEEK.indexOf(String(d).slice(0, 3).toLowerCase());
          if (i > -1 && days.indexOf(i) < 0) days.push(i);
        });
      }
    } catch (e) {}
    if (!days.length) {
      try {
        var ans = ((S() || {}).actionRefine || {}).answers || [];
        ans.forEach(function (a) {
          if (days.length) return;
          var txt = ((a && a.chips) || []).join(' ') + ' ' + ((a && a.text) || '');
          if (!/mon|tue|wed|thu|fri|sat|sun/i.test(txt)) return;
          WEEK.forEach(function (w, i) {
            if (new RegExp(w, 'i').test(txt) && days.indexOf(i) < 0) days.push(i);
          });
        });
      } catch (e) {}
    }
    if (!days.length) days = WEEK_DEFAULT_TRAINING.slice();
    days.sort(function (a, b) { return a - b; });
    return days;
  }
  function defaultCadencePref(bucket) {
    var b = bucketPulse(bucket);
    var kind = (b && b.pref) || 'daily';
    return { kind: kind, days: kind === 'custom' ? trainingDaysPref() : [] };
  }
  // second to last: immediately before the baseline, which is the LAST number
  // step in the set (baselineFrom's own rule, so the two can never disagree).
  // A bucket with no number at all takes it at the end.
  function withCadenceQ(list, bucket) {
    if (!cadenceAskable(bucket)) return list;
    var out = list.slice(), at = out.length;
    for (var k = out.length - 1; k >= 0; k--) {
      var d = out[k];
      if (d.kind === 'num' || (d.kind === 'ruler' && d.ruler === 'weight')) { at = k; break; }
    }
    out.splice(at, 0, CADENCE_Q);
    return out;
  }
  // the readable form of a pref, in their own words, for the answer row
  function cadenceLabel(pref) {
    if (!pref || !pref.kind) return '';
    if (pref.kind === 'custom') {
      var days = (pref.days || []).slice().sort(function (a, b) { return a - b; });
      if (!days.length) return '';
      return days.map(function (d) { return DAY_SHORT[d]; }).join(', ');
    }
    for (var i = 0; i < CADENCE_CHIPS.length; i++) {
      if (CADENCE_CHIPS[i].key === pref.kind) return CADENCE_CHIPS[i].label;
    }
    return '';
  }

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
  // THE APP, reached safely. `state` is a bare top-level `let` in js/01, so it
  // is NOT on window: every read goes through here and the module stays inert
  // (and testable) if it is ever loaded on its own.
  // ---------------------------------------------------------------------------
  function S() {
    try { return (typeof state !== 'undefined' && state) ? state : null; } catch (e) { return null; }
  }
  function G(name) {
    try { return (typeof window[name] === 'function') ? window[name] : null; } catch (e) { return null; }
  }
  function liveStar() {
    var st = S();
    return (st && st.clarity && st.clarity.answers && String(st.clarity.answers.neutronStar || '').trim()) || '';
  }
  function liveShape() {
    var st = S();
    var s = st && st.clarity && st.clarity.answers && st.clarity.answers.goalShape;
    return (s && typeof s === 'object') ? s : null;
  }
  // The app's own hash of the LIVE star. ensureGoalTarget owns it (it re-keys
  // goalProgress whenever the star changes), so asking it is the only way to be
  // sure a stored plan still belongs to the goal on screen.
  function liveStarHash() {
    try {
      var g = G('ensureGoalTarget');
      if (g) { var gp = g(); if (gp && gp.starHash) return gp.starHash; }
    } catch (e) {}
    try {
      var star = liveStar(), h = 2166136261;
      for (var i = 0; i < star.length; i++) { h ^= star.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(16);
    } catch (e) { return ''; }
  }
  // THE PLAN THE SURFACES RENDER. state.actionPlan, but only while it still
  // belongs to the star on screen: a plan written for a retired goal must never
  // paint over the new one. Returns null otherwise and the caller falls back.
  function livePlan() {
    try {
      var cur = G('actionPlanCurrent');
      var p = cur ? cur() : null;
      if (!p) return null;
      var live = liveStarHash();
      if (p.starHash && live && p.starHash !== live) return null;
      return p;
    } catch (e) { return null; }
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
  // ONE seam. WIRED (phase 3.6): an explicit intake.clarityTime still wins, so
  // the fixtures keep proving both branches, and everything else reads the REAL
  // Clarity conversation. Nothing else in the module knows where it came from.
  //
  // THE EXTRACTION RULE, and why it is this narrow. The line it feeds says
  // "You said X in Clarity.", so a wrong X is Memento putting words in their
  // mouth. It only accepts a sentence that carries BOTH a time quantity and a
  // per-day availability context, and it returns null the moment it is unsure.
  // Never invent: no answer, no line, and the question simply asks.
  // ---------------------------------------------------------------------------
  // "2-3 hours", "2 to 3 hours", "about an hour", "90 minutes", "half an hour".
  var CT_QTY = /\b(?:about |around |maybe |roughly |like )?((?:\d{1,2}(?:\.\d)?\s*(?:-|–|to)\s*)?\d{1,2}(?:\.\d)?|an|a|one|two|three|four|five|half an)\s*(hours?|hrs?|h|minutes?|mins?)\b/i;
  var CT_ALLDAY = /\b(all day|most of the day|the whole day|whenever i want|full time)\b/i;
  // the sentence has to be ABOUT how much time they have for this
  var CT_CTX = /\b(a day|per day|each day|daily|every day|a night|an evening|free|spare|to give|give it|give to|i have|i've got|i got|available|realistically|block|blocks|session|sessions|work on|put in|carve out|after work|before work|between)\b/i;
  var CT_WORDNUM = { a: '1', an: '1', one: '1', two: '2', three: '3', four: '4', five: '5', 'half an': 'half an' };

  function ctNormalize(m) {
    var n = String(m[1] || '').trim().toLowerCase();
    var u = String(m[2] || '').trim().toLowerCase();
    if (CT_WORDNUM[n]) n = CT_WORDNUM[n];
    n = n.replace(/\s*(?:-|–|to)\s*/, '-');
    u = /^h/.test(u) ? (n === '1' ? 'hour' : 'hours') : 'minutes';
    if (n === 'half an') return 'half an hour';
    return n + ' ' + u;
  }
  function ctScan(text) {
    var sentences = String(text || '').split(/(?<=[.!?\n])\s+|\n/);
    for (var i = sentences.length - 1; i >= 0; i--) {   // the latest answer wins
      var s = sentences[i];
      if (!s || s.length > 260) continue;
      // THE CONTEXT GATE COMES FIRST, for every branch. It was second, and
      // "I drink soda all day" (an answer about the PROBLEM) came back as their
      // available time. A time phrase only counts inside a sentence that is
      // about how much time they have.
      if (!CT_CTX.test(s)) continue;
      if (CT_ALLDAY.test(s)) return s.match(CT_ALLDAY)[1].toLowerCase();
      var m = s.match(CT_QTY);
      if (!m) continue;
      var out = ctNormalize(m);
      // a number with no unit, or a unit with no number, is not an answer
      if (!/\d|half/.test(out)) continue;
      return out;
    }
    return null;
  }
  function getClarityTimeAnswer(intake) {
    try {
      var v = intake && intake.clarityTime;
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (intake && intake.fixture) return null;   // a fixture is a closed world
      var out = null;
      // 1. the Clarity conversation, THEIR turns only (Memento's own questions
      //    are full of hours and would answer themselves).
      var st = S();
      var conv = (st && st.clarity && st.clarity.answers
        && Array.isArray(st.clarity.answers.aiConversation)) ? st.clarity.answers.aiConversation : [];
      var mine = [];
      conv.forEach(function (m) {
        if (!m || m.role !== 'user') return;
        var body = String((m._rawAnswer != null ? m._rawAnswer : (m.content || m.text || '')) || '').trim();
        if (body) mine.push(body);
      });
      out = ctScan(mine.join('\n'));
      if (out) return out;
      // 2. anything they already wrote in a previous refine pass
      var prev = (st && st.actionRefine && Array.isArray(st.actionRefine.answers))
        ? st.actionRefine.answers : [];
      var words = prev.map(function (a) {
        return [a && a.text, (a && a.chips || []).join(' ')].filter(Boolean).join('. ');
      }).filter(Boolean).join('\n');
      return ctScan(words);
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
  // ONE REFUSAL, ONE LINE (round 7). The AI writes clipped phrases ("sugar
  // drinks"), and the page says them the way a person would: "NO sugar
  // drinks." The item's own words and casing are untouched, the prefix is
  // never doubled on an item that already refuses in its own voice ("No new
  // niches this quarter"), and the period is never doubled either.
  function noLine(t) {
    var s = String(t == null ? '' : t).trim().replace(/\.+$/, '');
    if (!s) return '';
    if (!/^no\b/i.test(s)) {
      // "NO a new diet every week" is not a sentence anyone writes. The prefix
      // takes the determiner's place, so a leading article steps aside for it.
      // Nothing else about their wording is touched. (The prompt's own rule 7
      // example is article-led, so this WILL come up in real plans.)
      s = 'NO ' + s.replace(/^(a|an|the)\s+/i, '');
    }
    return s + '.';
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
  // the clock time a thing happened. No argument = now; a reopened closed day
  // passes the time it was actually held.
  function stamp(at) {
    var d = at ? new Date(at) : new Date(), h = d.getHours();
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
    // THE PREVIEW SHELL (opts.into, the swipe door's second page). A screen
    // built INSIDE a host element instead of taking the room: it never becomes
    // `root`, never owns `current`, never binds Escape or the exit chip, and
    // never fades in. It dies when the host does, so it cannot outlive a view.
    if (opts.into) {
      var proot = el('div', 'afl' + (opts.cine ? ' afl--cine' : ''));
      proot.setAttribute('data-screen', name);
      proot.setAttribute('aria-hidden', 'true');
      var pcol = el('div', 'afl__col');
      if (opts.top) {
        var ptf = el('div', 'afl__top');
        ptf.setAttribute('aria-hidden', 'true');
        pcol.appendChild(ptf);
      }
      proot.appendChild(pcol);
      opts.into.appendChild(proot);
      return pcol;
    }
    // The outgoing screen's LOGIC dies now; only its pixels linger for the
    // fade, on a timer they cannot outlive.
    var prev = root;
    if (escBound) { document.removeEventListener('keydown', escBound); escBound = null; }
    if (current && typeof current.teardown === 'function') {
      try { current.teardown(); } catch (e) {}
    }
    current = null;
    root = null;
    // ROUND 8: SCREEN TO SCREEN IS NOT A CROSS FADE (Malik on-device: the logic
    // page "glitches loading in", "not smooth or native"). Measured: for ~140ms
    // the outgoing room sat at 0.94 opacity under an incoming room at 0.64, so
    // the old screen's text was visibly showing THROUGH the new one's. Every
    // room is opaque and full bleed, and every screen already fades its own
    // CONTENT in (enterFade, the one stagger), so the room itself simply
    // arrives and the one leaving goes at once, behind it, where nothing can
    // see it. Entering the flow from the app still fades, below: there the
    // room really is arriving over something else.
    if (prev) {
      prev.setAttribute('aria-hidden', 'true');
      if (prev.parentNode) prev.parentNode.removeChild(prev);
    }

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
    if (!prev) fadeIn(root);          // only the FIRST room fades into the app
    escBound = function (e) { if (e.key === 'Escape') destroy(); };
    document.addEventListener('keydown', escBound);
    showExit();
    current = { name: name, teardown: null };
    return col;
  }

  function destroy() {
    // leaving the flow clears the saved view, the way the old module's close
    // did (js/02 ~2896), so a refresh after an exit lands on the home.
    try {
      var rc = G('recallView'), rv = G('rememberView');
      if (rv && (!rc || rc() === 'action')) rv(null);
    } catch (e) {}
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
    // merge 3.1: the exit chip and Escape close the flow from INSIDE, so the
    // router is told directly (the same seam MementoView uses) instead of
    // through a wrapped method it never sees.
    try { if (window.Router && Router.sync) Router.sync(); } catch (e) {}
  }

  // The app's standing bottom-button recipe (Clarity's nav geometry). Every
  // screen's primary control comes from here so Action never drifts again.
  function navRow() { return el('div', 'afl-nav'); }

  // THE PAGE DOTS (round 8, Malik: people have to know there are pages and
  // which one they are on). Two dots, the pager's order: logic, then the day.
  // Clarity's pager dot language, scaled down and stripped of its accent and
  // glow, because these screens carry no accent. Furniture, never a control:
  // aria-hidden, no pointer events, and it is only ever built where a pager
  // actually exists (never on the first-visit logic page, which has no second
  // page to go to).
  //
  // ROUND 9: they live at the VERY BOTTOM, under the standing button, and they
  // TRACK THE DRAG. The active one is a short pill, the other a dot, and the
  // two trade shape continuously with --afl-pg (0 on this page, 1 at the other
  // one), which the page snap writes every frame. `data-active` says which of
  // the two is home, so one rule set serves both pages.
  //
  // THEY COST NO LAYOUT. Absolutely positioned inside the nav's own bottom
  // padding, so the button does not move a pixel for them and a page that
  // mounts with them is the same height as a page that does not. That is half
  // of the settle-shift fix (round 9, item 1).
  function pageDots(active) {
    var d = el('div', 'afl-dots');
    d.setAttribute('aria-hidden', 'true');
    d.dataset.active = String(active);
    d.appendChild(el('i'));
    d.appendChild(el('i'));
    return d;
  }
  // THE DOTS DO NOT TRAVEL (v1286, Malik on-device: "make sure they stay there
  // locked but just show their position, like the way the clarity module dots
  // are locked in place"). They used to sit inside the nav, which lives in the
  // column that translates with the finger, so they slid off the screen with
  // the page they belonged to. Mounted on the ROOM instead (the .afl root, the
  // one element the drag never transforms), one pair for both pages: the shape
  // still tracks --afl-pg, the position never moves.
  // Preview builds get none: the page being dragged in must not carry a second,
  // mirrored pair underneath the real one.
  function mountDots(col, into, active) {
    if (into) return;
    var d = pageDots(active);
    var room = col && col.parentNode;
    if (room) room.appendChild(d);
  }
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
    // v1288: rule 5 above still stands, no movement threshold lives here: a
    // real finger trembles through three seconds and must not lose the ring.
    // The page swipe cancels this hold explicitly the moment it RECOGNISES a
    // sideways pull (see bindPageSnap's axis lock), which tremor never is.
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
    // ROUND 9: THE CLASS MUST NEVER OUTLIVE THE ANIMATION. This is the module's
    // own law (enterFade and fadeIn both carry the timer) and this was the one
    // helper missing it. The keyframe carries `both`, so there are two ways to
    // be left holding it: animationend is DROPPED under load on iOS, which
    // pins a GPU layer alive forever, or the animation never gets a frame to
    // start in, which pins the label at the from-state's 0.22 opacity. The
    // second one is visible: a washed out "Completed" on the green button,
    // which is exactly what the screenshot caught. A timer cannot be dropped.
    var off = function () {
      if (node.__aflSwapT) { clearTimeout(node.__aflSwapT); node.__aflSwapT = 0; }
      node.classList.remove('afl-swap--up', 'afl-swap--dn');
    };
    if (node.__aflSwapT) clearTimeout(node.__aflSwapT);
    node.__aflSwapT = setTimeout(off, 360);
    if (node.dataset.swapBound) return;
    node.dataset.swapBound = '1';
    node.addEventListener('animationend', off);
  }

  // ===========================================================================
  // THE PAGE SNAP (round 7, Malik on-device: the vertical door "fought the
  // logic page's own scrolling"). The two surfaces are a PAGER, side by side.
  // ROUND 8 flipped which side is which (his call: "put the logic page when
  // they swipe right instead"), so the order is now LOGIC then DAY: a pull to
  // the right brings the logic page in from the left, and a pull to the left
  // on the logic page brings the day back. A pull moves both 1:1 with the
  // finger, and letting go SNAPS, all the way across past 40% of the width or
  // on a flick, all the way back otherwise. It can never rest between the two
  // (the finger-follow + snap-to-nearest law).
  //
  // WHY ONE BINDER: the door and the way back are the same gesture mirrored,
  // and two copies would drift. cfg:
  //   host     the .afl room that moves (captured, never re-read)
  //   surface  the element a pull may START on
  //   dir      -1 the second page comes from the RIGHT (a pull to the left)
  //            +1 the second page comes from the LEFT  (a pull to the right)
  //   blocked  fn(target) true when that press belongs to a control
  //   build    fn(pagerEl) renders the second page (the REAL screen, into it)
  //   go       fn() the handover, once the snap has landed across
  //
  // VERTICAL BELONGS TO THE PAGE. The axis is decided once, and a pull is only
  // taken when it is clearly sideways (1.6x the vertical component). Anything
  // else is abandoned outright, nothing is prevented, and the logic page keeps
  // scrolling exactly as it did. touch-action: pan-y says the same thing to
  // the compositor, which is what makes the scroll smooth rather than arbitrated.
  // ===========================================================================
  // ROUND 9, THE SETTLE SHIFT (Malik's screen recording: things "settle" into
  // position after a swipe). ROOT CAUSE, measured: the page you drag is the
  // preview, which sits at its SETTLED geometry, and the real page that takes
  // over at the end of the snap plays the module's entrance, which starts it
  // 7px low and glides it up over 240ms. Captured side by side, every element
  // on the incoming page (title, no list, CTA, dots) was exactly 7px below the
  // preview's. So the handover skips the entrance: the page was already there,
  // in place, under the finger. A page that ARRIVES (a tap, a resume, the
  // loading screen handing over) still fades in, because nothing preceded it.
  // The flag is only ever true for the synchronous duration of the handover.
  var pagerHandover = false;
  function handover(go) {
    pagerHandover = true;
    try { go(); } finally { pagerHandover = false; }
  }
  // v1288 (Malik on-device: "the swiping to go from the 1 action to the logic
  // page is very very sticky and tough... make sure it's much easier to swipe").
  // These are the MOMENTUM numbers he picked in the door lab (threshold 0.30,
  // velocity 0.30 px/ms), which is the feel the rest of the app already uses.
  // The old values asked for a 40% drag OR a 0.65px/ms throw with the pull
  // 1.6x more sideways than vertical: a deliberate, ordinary thumb swipe
  // failed all three and snapped back, which is exactly what "sticky" is.
  var SNAP_AT = 0.30;       // of the width: the point of no return
  var FLICK_V = 0.30;       // px per ms, a throw rather than a drag
  var FLICK_MIN = 24;       // ...that still has to have travelled
  var AXIS_LOCK = 8;        // px before the direction is decided
  var AXIS_DOM = 1.15;      // how sideways a pull has to be to be a pull
  var SNAP_MS = 280;

  function bindPageSnap(cfg) {
    var host = cfg.host, dir = (cfg.dir < 0) ? -1 : 1;
    var pager = null, start = null, live = false, settling = false;
    var dx = 0, vx = 0, lastX = 0, lastT = 0, timer = null;

    // THE SECOND PAGE is the real screen, rendered by the real function into a
    // host element (shell's preview branch), never a lookalike. Built once, on
    // the first pull, and it dies with the room it hangs in.
    function buildPager() {
      if (pager || reduced() || !host || typeof cfg.build !== 'function') return;
      pager = el('div', 'afl-pg afl-pg--' + (dir < 0 ? 'r' : 'l'));
      pager.setAttribute('aria-hidden', 'true');
      host.appendChild(pager);
      try { cfg.build(pager); } catch (e) { pager.innerHTML = ''; }
    }
    // --afl-drag moves the pages; --afl-pg is the same travel as a 0..1 number,
    // and the page dots read it every frame (round 9: they track the finger the
    // way a native pager's do, the active pill trading shape with the other
    // dot as you go). One variable, no second animation to keep in step.
    function drag(px) {
      if (!host || reduced()) return;
      var W = host.clientWidth || window.innerWidth;
      host.style.setProperty('--afl-drag', px.toFixed(1) + 'px');
      host.style.setProperty('--afl-pg', Math.min(1, Math.abs(px) / (W || 1)).toFixed(3));
    }
    function clear() {
      if (!host) return;
      host.classList.remove('is-drag', 'is-snap');
      host.style.removeProperty('--afl-drag');
      host.style.removeProperty('--afl-pg');
    }
    function settle(across) {
      start = null; live = false;
      if (timer) { clearTimeout(timer); timer = null; }
      if (reduced() || !host) {
        clear();
        if (across) handover(cfg.go);
        return;
      }
      settling = true;
      var W = host.clientWidth || window.innerWidth;
      host.classList.add('is-snap');
      drag(across ? dir * W : 0);
      timer = setTimeout(function () {
        timer = null; settling = false;
        // the handover replaces this room, so nothing here needs unwinding
        if (across) { handover(cfg.go); return; }
        clear();
      }, SNAP_MS + 20);
    }
    var onDown = function (e) {
      if (settling) return;                              // the snap owns it now
      if (start || live) { settle(false); return; }      // second finger
      if (cfg.blocked && cfg.blocked(e.target)) return;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId, axis: 0, target: e.target };
      dx = 0; vx = 0; lastX = e.clientX; lastT = Date.now();
      buildPager();
    };
    // THE REST OF THE GESTURE IS NOT THE SURFACE'S. Once the pull is under way
    // the finger travels over the nav row, the second page, whatever, and those
    // are siblings, not children. Move is heard on the ROOM, release on the
    // window, so a pull can never be left half way for want of an event.
    var onMove = function (e) {
      if (!start || e.pointerId !== start.id || settling) return;
      var mx = e.clientX - start.x, my = Math.abs(e.clientY - start.y);
      if (!start.axis) {
        if (Math.max(Math.abs(mx), my) < AXIS_LOCK) return;
        // not sideways enough, or sideways the wrong way: this is the page's
        // gesture, not ours, and we let go of it completely.
        // v1288: a thumb arcs. A pull that is not yet sideways ENOUGH keeps
        // waiting instead of being thrown away, and only a decisive move the
        // wrong way (or a real vertical scroll) hands the gesture back. The
        // old rule abandoned the swipe permanently on a single stray pixel,
        // which is why a second attempt from the same finger did nothing.
        if (my >= AXIS_LOCK && Math.abs(mx) < my * AXIS_DOM) { start = null; clear(); return; }
        if (mx * dir <= -AXIS_LOCK) { start = null; clear(); return; }
        if (Math.abs(mx) < my * AXIS_DOM || mx * dir <= 0) return;
        start.x = e.clientX;              // travel is measured from the lock
        start.axis = 1;
        live = true;
        // v1288: the pull is now a fact, so whatever the finger landed on lets
        // go of it. A press-and-hold started on the CTA cancels here instead of
        // quietly filling underneath the drag, and it costs the hold nothing on
        // a still finger: only a recognised sideways pull ever reaches this.
        try {
          if (start.target && start.target.dispatchEvent) {
            start.target.dispatchEvent(new PointerEvent('pointercancel', {
              bubbles: true, cancelable: false, pointerId: start.id
            }));
          }
        } catch (e2) {}
        if (!reduced()) host.classList.add('is-drag');
        return;
      }
      var now = Date.now(), dt = now - lastT;
      if (dt > 0) vx = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = now;
      dx = (dir < 0) ? Math.min(0, mx) : Math.max(0, mx);   // 1:1, one way only
      drag(dx);
    };
    var onUp = function (e) {
      if (settling || !start || e.pointerId !== start.id) return;
      if (!live) { start = null; return; }               // a tap, not a pull
      var W = (host && host.clientWidth) || window.innerWidth;
      // a flick is a throw AT THE MOMENT OF LETTING GO. A finger that moved
      // fast, stopped, held still and then lifted has thrown nothing, so a
      // stale reading is dropped rather than counted.
      if (Date.now() - lastT > 90) vx = 0;
      var travel = Math.abs(dx);
      settle(travel >= W * SNAP_AT || (vx * dir >= FLICK_V && travel >= FLICK_MIN));
    };
    var onCancel = function (e) {
      if (settling || !start || (e && e.pointerId !== start.id)) return;
      if (live) settle(false);
      else { start = null; clear(); }
    };
    cfg.surface.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return {
      destroy: function () {
        if (timer) { clearTimeout(timer); timer = null; }
        try {
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onCancel);
        } catch (e) {}
      }
    };
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
    // opts.intake is the REAL path (built by realIntake from live state); the
    // fixture is the demo's closed world. Nothing else on this screen changes.
    var ink = opts.intake || fx.intake;
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
    // the content questions stay capped at 5 (REFINE-QUESTIONS.md); the check-in
    // question sits OUTSIDE that cap, because it is not a fact the plan math
    // needs, it is how they want to be asked (v3.1).
    var D = withCadenceQ((QUESTIONS[bucket] || QUESTIONS.weight).slice(0, 5), bucket);
    var clarityTime = getClarityTimeAnswer(opts.intake || fx.intake);
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
    // the check-in pref, seeded with the bucket's own default (v3.1)
    var cadPick = D.map(function (d) {
      return d.kind === 'cadence' ? defaultCadencePref(bucket) : null;
    });
    var mirror = el('span', 'afl-q__mirror');
    wrap.appendChild(mirror);
    var numInput = null;

    function isNum(k) { return D[k].kind === 'num'; }
    function isRuler(k) { return D[k].kind === 'ruler'; }
    function isCadence(k) { return D[k].kind === 'cadence'; }
    function answeredAt(k) {
      // THE CHECK-IN QUESTION arrives already answered (the bucket's default is
      // preselected), so Continue is live from the first frame. The one way to
      // un-answer it is picking their own days and naming none.
      if (isCadence(k)) {
        var p = cadPick[k];
        if (!p || !p.kind) return false;
        return p.kind !== 'custom' || (p.days || []).length > 0;
      }
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
    // THE CHECK-IN STEP (v3.1). The bucket's rhythms as flat ruled rows, the
    // same control every other chip question uses, and one of them opens a
    // week: seven day toggles in the multi-select language, on a real animated
    // height (a grid row from 0fr to 1fr, the non-negotiables row's own recipe,
    // never a max-height guess that opens in one frame).
    function buildCadence() {
      var k = i;
      var pref = cadPick[k] || defaultCadencePref(bucket);
      cadPick[k] = pref;
      body.classList.add('afl-q__as--cad');

      var rows = CADENCE_CHIPS.map(function (c) {
        var b = btn('afl-q__a', c.label);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          pref.kind = c.key;
          if (c.key !== 'custom') pref.days = [];
          paintCad();
          syncCta();
        });
        body.appendChild(b);
        return b;
      });

      var wrapD = el('div', 'afl-cd');
      var bodyD = el('div', 'afl-cd__b');
      var rowD = el('div', 'afl-cd__r');
      var dayBtns = DAY_LETTER.map(function (lab, idx) {
        var b = btn('afl-cd__d', lab);
        b.setAttribute('aria-label', DAY_NAME[idx]);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          var at = pref.days.indexOf(idx);
          if (at > -1) pref.days.splice(at, 1); else pref.days.push(idx);
          pref.days.sort(function (x, y) { return x - y; });
          paintCad();
          syncCta();
        });
        rowD.appendChild(b);
        return b;
      });
      bodyD.appendChild(rowD);
      wrapD.appendChild(bodyD);
      body.appendChild(wrapD);

      function paintCad() {
        rows.forEach(function (b, j) {
          var on = CADENCE_CHIPS[j].key === pref.kind;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var open = pref.kind === 'custom';
        wrapD.classList.toggle('is-open', open);
        wrapD.setAttribute('aria-hidden', open ? 'false' : 'true');
        dayBtns.forEach(function (b, idx) {
          var on = pref.days.indexOf(idx) > -1;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.tabIndex = open ? 0 : -1;
        });
      }
      paintCad();
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
      unit.textContent = said || ((d.kind === 'num' || d.kind === 'ruler' || d.kind === 'cadence') ? (d.unit || '') : '');
      unit.classList.toggle('is-said', !!said);
      numInput = null;
      body.className = 'afl-q__as';
      body.innerHTML = '';
      if (d.kind === 'num') buildNum();
      else if (d.kind === 'ruler') buildRuler();
      else if (d.kind === 'cadence') buildCadence();
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
        // THE CHECK-IN ANSWER (v3.1). It is a preference, not a fact about
        // their goal, so it travels as its own field AND as a readable chip,
        // which is what the brain and the receipt both need.
        if (d.kind === 'cadence') {
          var p = cadPick[k] || defaultCadencePref(bucket);
          var lab = cadenceLabel(p);
          return {
            id: d.id, kind: 'cadence', ruler: null, q: d.q, multi: false,
            chip: lab || null, chipList: lab ? [lab] : [],
            num: null, numText: null, free: null,
            cadence: { kind: p.kind, days: (p.days || []).slice() }
          };
        }
        // MULTI (v3): every lit chip is part of the answer, comma joined in the
        // order they were tapped, because that order is their own ranking.
        // chipList keeps them separated for the brain; chip is the readable one.
        var list = d.multi
          ? multi[k].map(function (x) { return d.chips[x]; })
          : (picked[k] === null ? [] : [d.chips[picked[k]]]);
        return {
          // the descriptor travels with the answer so the STORE WRITER can key
          // it, tell a ruler from a number, and find the baseline question
          // without re-deriving anything from the question text.
          id: d.id || (bucket + '-q' + (k + 1)),
          kind: d.kind || 'chip',
          ruler: d.ruler || null,
          q: d.q,
          multi: !!d.multi,
          chip: list.length ? list.join(', ') : null,
          chipList: list,
          // the ruler lands where every other number lands, written plainly:
          // 6'1" for a height, 218 for a weight.
          num: d.kind === 'ruler'
            ? (rulerSet[k] ? rulerText(d.ruler, rulerVal[k]) : null)
            : (nums[k] || null),
          // the same number the way a person writes it, so the brain reads
          // "300 lb" and "$4,500" instead of a bare figure with no unit.
          numText: d.kind === 'ruler'
            ? (rulerSet[k] ? (rulerText(d.ruler, rulerVal[k]) + ((RULERS[d.ruler] || {}).unit ? ' ' + RULERS[d.ruler].unit : '')) : null)
            : (nums[k] ? ((d.prefix || '') + nums[k]) : null),
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
  // 3.1  REFINE -> THE STORE  (merge phase 3, the data half)
  // The refine screen stays a pure surface: it collects and hands back. This is
  // the only place the harvest becomes state, and it writes exactly the shape
  // the brain reads (js/01's contract, js/03's actionRefineAssemble):
  //
  //   state.actionRefine = { bucket, variant, updatedAt,
  //     answers: [ { id, question, chips[], text, num, chipList, fromClarity } ] }
  //
  // chips[] is the contract field the assembler reads. chipList is the same
  // array under the name the multi-select port promised (HANDOFF v1192: "the
  // brain must read answer.chipList, the joined chip string is ambiguous"), so
  // both names are present and neither can drift from the other.
  // `bucket` here is the resolved bucket, NOT the question-set key: the money
  // job variant asks the money-job set but is still bucket 'money', variant
  // 'job', and the brain's own rule is that a stored bucket overrides its
  // router downstream.
  // ===========================================================================
  function writeRefineStore(bucket, variant, answers) {
    var st = S();
    if (!st) return null;
    var store = {
      bucket: String(bucket || ''),
      variant: String(variant || ''),
      updatedAt: new Date().toISOString(),
      answers: (answers || []).map(function (a, k) {
        var chips = (a && Array.isArray(a.chipList)) ? a.chipList.slice() : [];
        var text = String((a && a.free) || '').trim();
        var out = {
          id: (a && a.id) || ('q' + (k + 1)),
          question: (a && a.q) || '',
          chips: chips,
          chipList: chips,
          text: text
        };
        // the number is its own field: it is not a chip they picked and it is
        // not a sentence they wrote, and folding it into either would be a lie
        // about where it came from.
        var nt = (a && a.numText) || (a && a.num) || '';
        if (nt) out.num = String(nt);
        if (a && a.fromClarity) out.fromClarity = true;
        return out;
      })
    };
    // THE CHECK-IN PREF (v3.1) rides at the TOP of the store, not buried in an
    // answer row: it is read on every close, and a consumer should never have
    // to walk the answers to find how often this person wants to be asked.
    // The answer row stays too, so the brain still sees the question they were
    // asked and the words they chose.
    (answers || []).forEach(function (a) {
      if (a && a.cadence && a.cadence.kind) {
        store.cadencePref = { kind: a.cadence.kind, days: (a.cadence.days || []).slice() };
      }
    });
    st.actionRefine = store;
    return store;
  }

  // ===========================================================================
  // THE CADENCE OVERRIDE (v3.1). plan.close.cadence is what the brain thought
  // the rhythm should be; cadencePref is what the PERSON said. The person wins.
  // The AI's own line is never destroyed: the pref lands beside it as
  // plan.close.userCadence, so the plan still reads as it was written and the
  // gate has one field to check first.
  //
  // Called at plan land, and by ActionFlow.setCadencePref (the seam a settings
  // surface calls later, documented in ACTION-PLAN-SCHEMA.md).
  // ===========================================================================
  function normalizeCadencePref(pref) {
    if (!pref || !pref.kind) return null;
    var kinds = CADENCE_CHIPS.map(function (c) { return c.key; });
    if (kinds.indexOf(pref.kind) < 0) return null;
    var days = [];
    (pref.days || []).forEach(function (d) {
      var n = Number(d);
      if (isFinite(n) && n >= 0 && n <= 6 && days.indexOf(n) < 0) days.push(n);
    });
    days.sort(function (a, b) { return a - b; });
    // "my days" with no days is not a rhythm, it is a blank. Nothing is stored.
    if (pref.kind === 'custom' && !days.length) return null;
    return { kind: pref.kind, days: days };
  }
  function applyCadencePref(pref) {
    var st = S();
    if (!st) return null;
    var pick = normalizeCadencePref(pref || (st.actionRefine && st.actionRefine.cadencePref));
    if (!pick) return null;
    if (pref) {
      // an explicit set keeps the refine store and the plan in step, so the
      // two can never answer this question differently.
      if (!st.actionRefine || typeof st.actionRefine !== 'object') st.actionRefine = { answers: [] };
      st.actionRefine.cadencePref = { kind: pick.kind, days: pick.days.slice() };
    }
    var p = st.actionPlan;
    if (p && p.close && typeof p.close === 'object') {
      p.close.userCadence = { kind: pick.kind, days: pick.days.slice(), at: Date.now() };
    }
    try { var pn = G('persistNow'); if (pn) pn(); } catch (e) {}
    return pick;
  }
  // What the app should honour right now: the plan's stamped pref, else the
  // refine answer (a plan that landed before this shipped, or a server-written
  // plan that never passed through the stamp).
  function livePref() {
    var st = S();
    if (!st) return null;
    try {
      var p = st.actionPlan;
      if (p && p.close && p.close.userCadence) {
        var a = normalizeCadencePref(p.close.userCadence);
        if (a) return a;
      }
    } catch (e) {}
    return normalizeCadencePref(st.actionRefine && st.actionRefine.cadencePref);
  }

  // THE BASELINE. REFINE-QUESTIONS.md: "Q-final is always the pulse baseline
  // (their current number) where a number exists." That is the LAST number step
  // in the set; the height ruler is a body fact, never a baseline, so only the
  // weight ruler counts among the rulers. No number step, no baseline, and
  // nothing is invented.
  function baselineFrom(answers) {
    for (var k = (answers || []).length - 1; k >= 0; k--) {
      var a = answers[k];
      if (!a) continue;
      var isNum = (a.kind === 'num') || (a.kind === 'ruler' && a.ruler === 'weight');
      if (!isNum) continue;
      var raw = String(a.num == null ? '' : a.num).replace(/[^0-9.]/g, '');
      if (!raw) return null;                    // they skipped it: nothing to pulse
      var n = Number(raw);
      return isFinite(n) ? { value: n, id: a.id, question: a.q } : null;
    }
    return null;
  }

  // THE SEAM THE BRAIN LEAVES OPEN. actionPlanLand deliberately leaves
  // gp.current null (a reading only exists once a person enters one). This is
  // where their own first number fills it, and goalProgressUpdate is the app's
  // ONE writer for that: it stamps the day, appends the history point, and
  // fires the referee's shadow hook on the way through.
  //
  // ORDER TRAP, handled: at refine time the plan has not landed, so
  // goalProgress may still have target === null and goalProgressUpdate is a
  // no-op by design. The number is therefore also kept on the refine store, and
  // the landing retries the pulse once the AI's target is in. Retrying is safe:
  // goalProgressUpdate overwrites the same day's history point instead of
  // appending a second one.
  function pulseBaseline(value) {
    var st = S();
    var out = { value: value, applied: false, held: false };
    if (!isFinite(value)) return out;
    if (st && st.actionRefine) { st.actionRefine.baseline = value; out.held = true; }
    var up = G('goalProgressUpdate');
    if (up) { try { out.applied = !!up(value); } catch (e) {} }
    try { var p = G('persistNow'); if (p) p(); } catch (e) {}
    return out;
  }

  // ===========================================================================
  // 2.3  ld-4, THE WORKING LIST
  // The wait shows only what Memento already knows, one line at a time, with a
  // real elapsed clock and the bare M breathing at the foot. Nothing here is
  // produced by the model and nothing is a stage name.
  // NOTE (phase 5): generation moves server side. This screen already accepts a
  // promise, so the swap is one argument.
  //
  // REAL MODE (merge phase 3.2). opts.real drives the actual brain: the screen
  // starts actionPlanGenerate(), shows the working list for as long as it takes,
  // lands the plan on success, and has TWO honest terminal states instead of a
  // spinner that never ends:
  //   needsClarity -> the model's own pre-plan refusal (creed rule 14): the
  //                   apologetic ask screen collects its 1 to 3 questions and
  //                   generation runs again. Nothing is half-written.
  //   error        -> one plain line naming what actually happened (signed out,
  //                   not paid yet, the network) and a retry.
  // Both reuse the flow's own type and the standing CTA. No new language.
  // The fixture path (ActionFlow.demo) is untouched: no opts.real, no AI call.
  // ===========================================================================
  var HOLD_MS = 6000;
  function openLoading(key, opts) {
    opts = opts || {};
    var fx = FIXTURES[key] || FIXTURES.weight;
    var intake = opts.intake || fx.intake;
    var FACTS = intake.facts || [];
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

    // v1197 (Malik, after a real generation): 30 seconds was a promise the real
    // model does not keep, and the third line was too flat for a long wait.
    var STATES = ['This usually takes about a minute.',
      'Still creating. This one is taking longer. You have big plans lol',
      'Still creating... almost done I promise.'];
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
      if (!FACTS.length) return;          // nothing known: the state line stands alone
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
        // REAL MODE waits as long as the brain does: the list keeps cycling and
        // only runBrain (or a terminal state) ever ends this screen. Landing on
        // a timer would tell a person the plan is ready before it exists.
        if (opts.promise || opts.real || longer) {
          if (longer && pass < 3) { setState(pass); return show(); }
          if ((opts.promise || opts.real) && !landed) { setState(pass); return show(); }
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

    // ---- THE TERMINAL STATES (real mode) ------------------------------------
    // Same clearing move as land(): the working list leaves on a fade and the
    // screen is left with one sentence, one quiet line, and one control. The
    // type is this screen's own (.afl-ld__say geometry), the button is the
    // app's standing CTA. Nothing new is invented for a bad outcome.
    var endBlock = null;
    function clearWork() {
      timers.forEach(clearTimeout);
      timers = [];
      if (tickT) { clearInterval(tickT); tickT = null; }
      head.classList.add('is-gone');
      state.classList.remove('is-swap');
      state.classList.add('is-gone');
      tickRow.classList.add('is-gone');
      fact.classList.remove('is-on');
      m.classList.add('is-gone');
      fadeOutNode(m, 400);
    }
    function endState(line, sub, ctaText, onTap) {
      if (landed) return;
      landed = true;
      clearWork();
      if (endBlock && endBlock.parentNode) endBlock.parentNode.removeChild(endBlock);
      endBlock = el('div', 'afl-ld__end');
      endBlock.appendChild(el('p', 'afl-ld__say', line));
      if (sub) endBlock.appendChild(el('p', 'afl-ld__endsub', sub));
      layer.appendChild(endBlock);
      ctaLabel(go, ctaText);
      go.dataset.end = '1';
      at(120, function () { endBlock.classList.add('is-on'); });
      at(280, function () { go.classList.remove('is-waiting'); });
      go.__endTap = onTap;
    }

    // The honest line for a failure, in their language, never a code. The
    // reading law applies here as much as anywhere else.
    function errorLine(msg) {
      var m2 = String(msg || '').toLowerCase();
      if (m2.indexOf('sign in') > -1) {
        return { line: 'You are signed out.', sub: 'Sign back in, then try this again. Nothing you answered is lost.' };
      }
      if (m2.indexOf('paid') > -1 || m2.indexOf('403') > -1) {
        return { line: 'Action is not unlocked on this account yet.', sub: 'Your answers are saved. The plan writes as soon as it is.' };
      }
      if (m2.indexOf('timeout') > -1 || m2.indexOf('timed out') > -1 || m2.indexOf('abort') > -1) {
        return { line: 'That took too long.', sub: 'The connection gave out before the plan came back. Your answers are saved.' };
      }
      return { line: 'That did not come back.', sub: 'Something went wrong on the way. Your answers are saved, so this only costs you the tap.' };
    }

    // ---- REAL MODE: run the brain -------------------------------------------
    var running = false;
    function runBrain() {
      if (running) return;
      running = true;
      var gen = G('actionPlanGenerate');
      if (!gen) {
        running = false;
        endState('The plan writer is not loaded.', 'Reload Memento and try again.', 'Try again', function () { location.reload(); });
        return;
      }
      var p;
      try { p = gen(opts.generateOptions || {}); } catch (err) {
        running = false;
        var e0 = errorLine(err && err.message);
        return endState(e0.line, e0.sub, 'Try again', retry);
      }
      p.then(function (report) {
        running = false;
        if (report && report.safetyStop) {
          return openSafetyStop();
        }
        if (report && report.safetyConfirm) {
          var safeOpts = Object.assign({}, opts);
          safeOpts.generateOptions = Object.assign({}, opts.generateOptions, { safetyConfirmedSafe: true });
          return openSafetyConfirm({
            onYes: function () { openSafetyStop(); },
            onNo: function () { openLoading(key, safeOpts); }
          });
        }
        if (!report || (!report.ok && !report.needsClarity)) {
          var e1 = errorLine((report && report.error) || '');
          return endState(e1.line, e1.sub, 'Try again', retry);
        }
        if (report.needsClarity) {
          // Rule 14 of the creed: the model refused BEFORE writing a plan, so
          // the missing context is asked for here and generation runs again.
          if (typeof opts.onNeedsClarity === 'function') return opts.onNeedsClarity(report);
          var qs = (report.questions && report.questions.length)
            ? report.questions
            : [String(report.question || 'What number do you want to hit, and by when?')];
          // ONE ask, ever: the re-run carries forcePlan so the model may not
          // refuse a second time. A second refusal becomes the error retry,
          // never another question screen.
          var reOpts = Object.assign({}, opts);
          reOpts.generateOptions = Object.assign({}, opts.generateOptions, { forcePlan: true });
          return openClarityAsk(qs, { onDone: function () { openLoading(key, reOpts); } });
        }
        // SUCCESS. The plan lands BEFORE the screen says it is ready: the
        // receipt writes before the render, always.
        //
        // A NEW GOAL STARTS A CLEAN SLATE (v1277, audit F2). goalStateReset
        // existed since THE MERGE and nothing ever called it, so a new star
        // inherited the old goal's completions, progress and day records.
        // It runs HERE, awaited, because it flushes queued guarantee receipts
        // first (their proof ids point into completionHistory) and the wipe
        // must not race that flush. Only on a genuine star change: a re-run
        // or refine for the SAME star must never wipe a person's progress.
        var landFn = G('actionPlanLand');
        var _newHash = '';
        try { _newHash = String((report.inputs && report.inputs.starHash) || liveStarHash() || ''); } catch (e) {}
        var _oldHash = '';
        try { _oldHash = String((S() && S().actionPlan && S().actionPlan.starHash) || ''); } catch (e) {}
        var _goalChanged = !!(_oldHash && _newHash && _oldHash !== _newHash);
        var _pre = Promise.resolve();
        if (_goalChanged) {
          try {
            var rs = G('goalStateReset');
            if (rs) _pre = Promise.resolve(rs()).catch(function () {});
          } catch (e) {}
        }
        return _pre.then(function () {
        var res = null;
        try { res = landFn ? landFn(report.plan, report.inputs) : null; } catch (e) {}
        if (landFn && (!res || !res.ok)) {
          return endState('The plan came back but could not be saved.',
            'Try again. Nothing you answered is lost.', 'Try again', retry);
        }
        // THE PERSON'S RHYTHM OVERRIDES THE PLAN'S (v3.1). Stamped right after
        // the land, so it survives actionPlanNormalize (which owns the shape of
        // everything the model wrote and would drop a field it does not know).
        try { applyCadencePref(); } catch (e) {}
        try { if (typeof Analytics !== 'undefined' && Analytics.track) Analytics.track('plan_landed'); } catch (e) {}
        ActionFlow._lastReport = report;
        if (typeof opts.onLanded === 'function') { try { opts.onLanded((res && res.plan) || report.plan, report); } catch (e) {} }
        at(0, land);
        });
      }, function (err) {
        running = false;
        var e2 = errorLine(err && err.message);
        endState(e2.line, e2.sub, 'Try again', retry);
      });
    }
    function retry() {
      // A retry is the same screen from the top, never a second one stacked on
      // it: the shell rebuilds and the old one's timers die with it.
      openLoading(key, opts);
    }
    if (opts.promise && typeof opts.promise.then === 'function') {
      opts.promise.then(function () { at(0, land); }, function () { at(0, land); });
    }
    go.addEventListener('click', function () {
      if (go.classList.contains('is-waiting')) return;
      if (go.dataset.end === '1') { if (typeof go.__endTap === 'function') go.__endTap(); return; }
      if (typeof opts.onOpen === 'function') opts.onOpen();
    });
    tickT = setInterval(function () { if (!landed) clk.textContent = fmt(Date.now() - t0); }, 250);
    at(650, show);
    if (opts.real) runBrain();
    enterFade(c);
    current.teardown = function () {
      timers.forEach(clearTimeout);
      if (tickT) clearInterval(tickT);
    };
    return root;
  }

  // ===========================================================================
  // 2.3b  THE CLARITY ASK
  // The model's own pre-plan refusal (creed rule 14): the goal is not
  // plannable as stated, so the missing context is asked for, 1 to 3 plain
  // questions on one screen, rapid fire. Their answers land in the refine
  // store, one entry each, right where every other refine answer lives, and
  // generation runs again with them. Everything here is the refine screen's
  // own language: the same question type, the same free-field rows, the
  // standing CTA. No new css.
  // ===========================================================================
  var CLARITY_ASK_HEAD = 'Sorry, we want to help as much as possible, but we\'re missing a bit of needed context.';
  function appendClarityAnswers(qs, texts) {
    var st = S();
    if (!st) return;
    if (!st.actionRefine || typeof st.actionRefine !== 'object') {
      st.actionRefine = { bucket: '', variant: '', answers: [] };
    }
    if (!Array.isArray(st.actionRefine.answers)) st.actionRefine.answers = [];
    var base = st.actionRefine.answers.length;
    qs.forEach(function (q, k) {
      st.actionRefine.answers.push({
        id: 'clarity-ask-' + (base + k + 1),
        question: q,
        chips: [],
        chipList: [],
        text: String(texts[k] || '').trim()
      });
    });
    st.actionRefine.updatedAt = new Date().toISOString();
    try { var p = G('persistNow'); if (p) p(); } catch (e) {}
  }
  function openSafetyConfirm(opts) {
    opts = opts || {};
    var col = shell('safety-confirm', { label: 'Safety check' });
    var wrap = el('div', 'afl-safe afl-safe--confirm');
    wrap.appendChild(el('h2', 'afl-safe__question',
      'I want to make sure I read that right. Are you thinking about hurting yourself or someone else?'));

    var choices = el('div', 'afl-safe__choices');
    var yes = el('button', 'afl-safe__choice', 'Yes');
    yes.type = 'button';
    var no = el('button', 'afl-safe__choice', "No, I'm okay");
    no.type = 'button';
    choices.appendChild(yes);
    choices.appendChild(no);
    wrap.appendChild(choices);
    col.appendChild(wrap);

    yes.addEventListener('click', function () {
      if (typeof opts.onYes === 'function') opts.onYes();
    });
    no.addEventListener('click', function () {
      if (typeof opts.onNo === 'function') opts.onNo();
    });
    enterFade(wrap);
    return root;
  }

  function openSafetyStop() {
    var col = shell('safety-stop', { label: 'Immediate support' });
    var wrap = el('div', 'afl-safe afl-safe--stop');
    wrap.appendChild(el('h2', 'afl-safe__title', 'First, right now.'));

    var lines = [
      'What you just said matters more than anything else in this app.',
      'Memento is not emergency help, and I am not a person. Please talk to someone who is, right now.',
      'If you are in immediate danger, call your local emergency number.',
      'United States: call or text 988 (Suicide & Crisis Lifeline), any time.',
      'United Kingdom: 999 for emergencies, or Samaritans 116 123.',
      'Elsewhere: findahelpline.com lists the number for your country.',
      'If you can, tell one person you trust today. Not the perfect person. Any person.',
      'Your goal will still be here. It can wait. You cannot be replaced.'
    ];
    var body = el('div', 'afl-safe__body');
    lines.forEach(function (line) { body.appendChild(el('p', '', line)); });
    wrap.appendChild(body);

    var done = el('button', 'afl-safe__done', "I'm okay");
    done.type = 'button';
    done.addEventListener('click', function () { destroy(); });
    wrap.appendChild(done);
    col.appendChild(wrap);

    // Bare event only: no words, answers, goal, or user details. Confirmed
    // danger quiets reminders for exactly one day, then they resume normally.
    try { if (typeof Analytics !== 'undefined' && Analytics.track) Analytics.track('safety_screen_shown'); } catch (e) {}
    try { if (window.MementoPush && MementoPush.pauseForSafety) MementoPush.pauseForSafety(24); } catch (e) {}

    enterFade(wrap);
    return root;
  }

  function openClarityAsk(questions, opts) {
    opts = opts || {};
    var qs = (questions || []).map(function (q) { return String(q || '').trim(); }).filter(Boolean).slice(0, 3);
    if (!qs.length) qs = ['What number do you want to hit, and by when?'];

    var col = shell('clarity-ask', { label: 'A bit more context' });
    var wrap = el('div', 'afl-q');
    col.appendChild(wrap);

    var head = el('div', 'afl-q__q', CLARITY_ASK_HEAD);
    wrap.appendChild(head);

    // the questions, stacked: each one a label over its own free-field row,
    // centered in the answer zone the refine steps already own.
    var body = el('div', 'afl-q__as');
    wrap.appendChild(body);
    var fields = qs.map(function (q, k) {
      var lab = el('p', 'afl-q__unit', q);
      if (k > 0) lab.style.marginTop = '26px';
      body.appendChild(lab);
      var row = el('div', 'afl-q__own');
      row.appendChild(el('i'));
      var input = document.createElement('input');
      input.type = 'text';
      input.setAttribute('placeholder', 'Your answer');
      input.setAttribute('aria-label', q);
      row.appendChild(input);
      body.appendChild(row);
      return { row: row, input: input };
    });

    var nav = navRow();
    var go = cta('Continue');
    go.disabled = true;
    nav.appendChild(go);
    col.appendChild(nav);

    function sync() {
      var all = fields.every(function (f) { return f.input.value.trim().length > 0; });
      fields.forEach(function (f) { f.row.classList.toggle('is-lit', f.input.value.trim().length > 0); });
      go.disabled = !all;
      go.classList.toggle('is-live', all);
    }
    fields.forEach(function (f, k) {
      f.input.addEventListener('input', sync);
      f.input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var next = fields[k + 1];
        if (next) next.input.focus();
        else { f.input.blur(); if (!go.disabled) go.click(); }
      });
    });

    go.addEventListener('click', function () {
      if (go.disabled) return;
      var texts = fields.map(function (f) { return f.input.value.trim(); });
      appendClarityAnswers(qs, texts);
      if (typeof opts.onDone === 'function') opts.onDone(texts);
    });

    enterFade(wrap);
    enterFade(nav);
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
    // THE REAL PLAN WINS (merge phase 3.3). An explicitly passed plan is the
    // demo (and the standing door, which hands its own object down); otherwise
    // the person's own landed plan renders, and the fixture is only ever the
    // last resort for a surface opened with nothing behind it.
    var plan = opts.plan || livePlan() || fx.plan;
    // top: the only scrolling surface in the flow, so the only one that needs
    // the flow's own top scrim (his "the goal title gets sliced" note).
    // opts.into = THE PREVIEW BUILD (the swipe door's second page). It renders
    // the same page into a host element instead of taking the screen, so it
    // touches none of the live view's bookkeeping: no root, no teardown, no
    // timers, no entrance. It is a picture that happens to be the real page.
    var col = shell('logic', { label: 'Why this plan', top: true, into: opts.into || null });
    var lgTimers = [];
    if (!opts.into) current.teardown = function () { lgTimers.forEach(clearTimeout); lgTimers = []; };

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
    // ROUND 7 (Malik, on-device): the refusals are a LIST, not a sentence. The
    // header stays, and every item is its own line that starts with the word
    // that matters. Same type as the acts above it, no bullets, flat lines.
    if (plan.noList && plan.noList.length) {
      var no = el('div', 'afl-lg__no');
      no.appendChild(el('p', 'afl-lg__no-h', 'NO LIST:'));
      plan.noList.forEach(function (t) {
        var line = noLine(t);
        if (line) no.appendChild(el('p', 'afl-lg__no-i', line));
      });
      box.appendChild(no);
    }

    // ---- part two: the math -------------------------------------------------
    // A heading over nothing is an orphan. Plans without an eq block (focus and
    // fitness rarely have one) skip the whole part, heading included, and part
    // three closes the gap with no divider left hanging.
    var hasMath = !!(plan.eq || (plan.reasoning && plan.reasoning.length));
    if (hasMath) box.appendChild(el('p', 'afl-lg__h', 'The Math'));
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
        // ROUND 8: THE CORRECTION LANDS BEFORE THE FIRST PAINT. This used to
        // print the AI's number and swap it 520ms later, which is a visible
        // jump on a page that is still arriving (part of his "glitches loading
        // in"). The client is the last word on arithmetic either way, so it is
        // simply the only number ever shown. Nothing on this page changes
        // after it is painted.
        eqRow(r.label, fixed || r.shown);
      });
      if (plan.eq.result) eqRow(plan.eq.result.label, plan.eq.result.value, 'is-result');
      box.appendChild(eq);
    }
    if (!opts.into) ActionFlow._lastEqCheck = eqOk;

    (plan.reasoning || []).forEach(function (p, k) {
      box.appendChild(el('p', 'afl-lg__b afl-lg__b--ind', p));
      // THE REFRESHER: the Clarity scale, closed by default. Nobody is forced
      // through it. Screen time and focus only.
      if (k === 0 && plan.scale) box.appendChild(refresher());
    });

    // ---- part three: the questions -----------------------------------------
    if (plan.qas && plan.qas.length) {
      box.appendChild(el('p', 'afl-lg__h afl-lg__h--big', 'Questions You Might Have'));
      plan.qas.forEach(function (x) {
        box.appendChild(el('p', 'afl-lg__q', x.q));
        box.appendChild(el('p', 'afl-lg__qa', x.a));
      });
    }
    box.appendChild(el('p', 'afl-lg__src', 'Every line above came from what you told Memento.'));

    // ---- THE NON-NEGOTIABLES PICKER (round 5, Malik) -----------------------
    // The positive twin of the NO list, and the last thing they touch before
    // agreeing: the unmoving things they hold. Six candidates, they keep 1 or
    // 2. A plan written before schema v1.1 has no field at all, and then this
    // whole section does not exist and the hold gates on scroll alone.
    // THE GATE HOOK. This file is 'use strict', so a function declared inside
    // the else block below is BLOCK scoped and the picker cannot see it. It is
    // declared here, in openLogic's own scope, and assigned there.
    var gateSync = function () {};
    var nnChosen = [];
    var nnCands = (plan.nonNegotiables && Array.isArray(plan.nonNegotiables.candidates))
      ? plan.nonNegotiables.candidates.filter(function (t) { return t && String(t).trim(); }).slice(0, 6)
      : [];
    // ---- ROUND 6: THE PAGE HAS TWO LIVES -----------------------------------
    // FIRST VISIT it asks: the picker is live, the Ready section is there, and
    // the hold waits on both gates. ONCE AGREED it never asks again. Every way
    // back in (the M, the swipe door, a resume) lands on a pure REFERENCE: the
    // non-negotiables they already chose, read only, and one tap out. The
    // agreement was given once; re-asking for it would make it look undone.
    var agreed = planAgreed(plan);
    var refOnly = !!opts.standing || !!opts.into || agreed;
    var nnOn = !refOnly && nnCands.length > 0;
    var nnChips = [];
    // Already chosen? Show it. This is what makes the standing door (the M) a
    // true reference view of the plan instead of a blank picker, and it means
    // re-opening the page before agreeing does not lose the pick.
    try {
      var prevPick = (plan.nonNegotiables && Array.isArray(plan.nonNegotiables.chosen)) ? plan.nonNegotiables.chosen : [];
      prevPick.forEach(function (t) {
        var at = nnCands.indexOf(t);
        if (at > -1 && nnChosen.indexOf(at) < 0 && nnChosen.length < 2) nnChosen.push(at);
      });
    } catch (e) {}
    if (refOnly) {
      // THE REFERENCE VIEW. Only what they actually hold, and nothing to tap.
      // The five they passed over are not their standard, so they are not on
      // the page; a plan with nothing chosen renders no section at all.
      var nnKept = nnChosen.map(function (k) { return nnCands[k]; })
        .filter(function (t) { return t && String(t).trim(); });
      if (nnKept.length) {
        var nnRef = el('div', 'afl-nn');
        nnRef.appendChild(el('p', 'afl-nn__lead', nnKept.length > 1 ? 'Your non-negotiables.' : 'Your non-negotiable.'));
        var nnRl = el('div', 'afl-nn__list');
        nnKept.forEach(function (t) { nnRl.appendChild(el('p', 'afl-nn__held', t)); });
        nnRef.appendChild(nnRl);
        box.appendChild(nnRef);
      }
      // v1210: THE RHYTHM, AND THE WAY TO CHANGE IT. One quiet reference line
      // among the others: how often Memento asks where they are, and a tap to
      // change it. Only on a plan that asks at all; the sheet writes through
      // ActionFlow.setCadencePref, the one door for this.
      try { var rr = rhythmRow(); if (rr) box.appendChild(rr); } catch (e) {}
    } else if (nnCands.length) {
      var nnWrap = el('div', 'afl-nn');
      nnWrap.appendChild(el('p', 'afl-nn__lead', 'Pick 1 or 2 non-negotiables.'));
      // ROUND 6 (Malik, verbatim): the quiet line that says what the word
      // means, so the pick is made against the right bar.
      var nnSub = el('p', 'afl-nn__sub');
      nnSub.appendChild(document.createTextNode('These are the things that '));
      nnSub.appendChild(el('b', null, 'need'));
      nnSub.appendChild(document.createTextNode(' to get done no matter what. Things that even on your worst day, you will still get done.'));
      nnWrap.appendChild(nnSub);
      var nnList = el('div', 'afl-nn__list');
      nnCands.forEach(function (t, k) {
        var b = btn('afl-nn__a', t);
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('role', 'checkbox');
        if (!nnOn) { b.disabled = true; b.tabIndex = -1; }
        b.addEventListener('click', function () {
          if (!nnOn) return;
          var at = nnChosen.indexOf(k);
          if (at > -1) nnChosen.splice(at, 1);
          else {
            // MAX 2, and a third tap BOUNCES THE OLDEST rather than doing
            // nothing. An inert tap on a live-looking chip reads as broken;
            // dropping the oldest keeps the gesture always meaningful and
            // makes the cap visible the moment they hit it.
            nnChosen.push(k);
            if (nnChosen.length > 2) nnChosen.shift();
          }
          nnPaint();
        });
        nnList.appendChild(b);
        nnChips.push(b);
      });
      nnWrap.appendChild(nnList);
      box.appendChild(nnWrap);
      nnChips.forEach(function (b, k) {
        var on = nnChosen.indexOf(k) > -1;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function nnPaint() {
      nnChips.forEach(function (b, k) {
        var on = nnChosen.indexOf(k) > -1;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      gateSync();
    }

    // ---- THE RHYTHM ROW + ITS SHEET (v1210) ---------------------------------
    // What it says has to be true of THIS goal: the pref they chose, else the
    // cadence the plan itself carries, in plain words. A bucket that never
    // asks (school, projects) renders no row, because there is no rhythm to
    // name and a row saying "never" would be noise.
    function rhythmWords() {
      var pref = null;
      try { pref = livePref(); } catch (e) {}
      if (pref) {
        if (pref.kind === 'custom') return cadenceLabel(pref);
        return (cadenceLabel(pref) || '').toLowerCase();
      }
      var cad = String((plan.close && plan.close.cadence) || 'none');
      if (cad === 'daily' || cad === 'nightly') return 'every day';
      if (cad.indexOf('weekly') === 0) {
        var d = (cad.split(':')[1] || 'sunday');
        return d.charAt(0).toUpperCase() + d.slice(1) + 's';
      }
      if (cad === 'per-session') return 'every session';
      return '';
    }
    function rhythmRow() {
      var words = rhythmWords();
      var askable = cadenceAskable(plan.bucket || '');
      if (!words && !askable) return null;
      if (!words) words = (cadenceLabel(defaultCadencePref(plan.bucket || '')) || '').toLowerCase();
      if (!words) return null;
      var row = btn('afl-rhy');
      var lab = el('span', 'afl-rhy__l', 'Logging');
      var val = el('span', 'afl-rhy__v', words);
      row.appendChild(lab);
      row.appendChild(val);
      row.setAttribute('aria-label', 'Logging ' + words + '. Change it.');
      row.addEventListener('click', function () {
        openRhythmSheet(function () { val.textContent = rhythmWords(); });
      });
      return row;
    }
    function openRhythmSheet(onSaved) {
      var start = null;
      try { start = livePref(); } catch (e) {}
      var pref = start
        ? { kind: start.kind, days: (start.days || []).slice() }
        : defaultCadencePref(plan.bucket || '');
      var wrap = el('div', 'cn-dlgwrap afl-dlg');
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      var boxD = el('div', 'cn-dlg cn-dlg--afl cn-dlg--wide');
      boxD.appendChild(el('h4', null, 'How often do you want to log your progress?'));
      var rows = el('div', 'afl-rhy__rows');
      var btns = CADENCE_CHIPS.map(function (c2) {
        var b = btn('afl-q__a', c2.label);
        b.addEventListener('click', function () {
          pref.kind = c2.key;
          if (c2.key !== 'custom') pref.days = [];
          else if (!pref.days.length) pref.days = trainingDaysPref();
          paintR();
        });
        rows.appendChild(b);
        return b;
      });
      boxD.appendChild(rows);
      var wrapD = el('div', 'afl-cd');
      var bodyD = el('div', 'afl-cd__b');
      var rowD = el('div', 'afl-cd__r');
      var dayBtns = DAY_LETTER.map(function (lab2, idx) {
        var b = btn('afl-cd__d', lab2);
        b.setAttribute('aria-label', DAY_NAME[idx]);
        b.addEventListener('click', function () {
          var at = pref.days.indexOf(idx);
          if (at > -1) pref.days.splice(at, 1); else pref.days.push(idx);
          pref.days.sort(function (x, y) { return x - y; });
          paintR();
        });
        rowD.appendChild(b);
        return b;
      });
      bodyD.appendChild(rowD);
      wrapD.appendChild(bodyD);
      boxD.appendChild(wrapD);
      var save = btn('cn-dlgbtn cn-dlgbtn--afl', 'Save');
      var cancel = btn('cn-dlgbtn cn-dlgbtn--quiet', 'Cancel');
      boxD.appendChild(save);
      boxD.appendChild(cancel);
      wrap.appendChild(boxD);
      function paintR() {
        btns.forEach(function (b, j) {
          var on = CADENCE_CHIPS[j].key === pref.kind;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var open = pref.kind === 'custom';
        wrapD.classList.toggle('is-open', open);
        dayBtns.forEach(function (b, idx) {
          var on = pref.days.indexOf(idx) > -1;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.tabIndex = open ? 0 : -1;
        });
        save.disabled = open && !pref.days.length;
      }
      function shut() { try { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } catch (e) {} }
      cancel.addEventListener('click', shut);
      wrap.addEventListener('click', function (e) { if (e.target === wrap) shut(); });
      save.addEventListener('click', function () {
        if (save.disabled) return;
        try { ActionFlow.setCadencePref(pref); } catch (e) {}
        shut();
        try { if (typeof onSaved === 'function') onSaved(); } catch (e) {}
      });
      paintR();
      (col.closest ? (col.closest('.afl') || document.body) : document.body).appendChild(wrap);
      requestAnimationFrame(function () { wrap.classList.add('is-on'); });
    }

    if (!refOnly) box.appendChild(el('p', 'afl-lg__fair', 'Ready to Start?'));

    var nav = navRow();
    var go = cta(refOnly ? 'Close' : 'I’m ready');
    go.classList.add('afl-cta--hold');
    nav.appendChild(go);
    // THE TRUST LINE IS A PROMISE ABOUT THE FUTURE, so it belongs to the visit
    // where the future is still ahead. On a re-open the promise has already
    // been kept (they are standing on the page it promised), and the line
    // under a Close button would be explaining a door they just walked back
    // through. First visit only.
    if (!refOnly) nav.appendChild(el('p', 'afl-nav__sub', 'You can always return to this page.'));
    // THE PAGE DOTS (round 8; round 9 put them under the button). This page is
    // the FIRST of the two, so the first dot is home. They exist only where a
    // pager does: the reference view (from the M, from the swipe, from a
    // resume) and the preview build that is literally being dragged. The
    // first-visit page has no second page and gets no dots.
    if (refOnly) mountDots(col, opts.into, 0);
    col.appendChild(nav);

    if (refOnly) {
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
      // TWO GATES NOW (round 5). Scrolled AND picked. The scroll half still
      // LATCHES (reading is not undone by scrolling back up); the pick half
      // is live, because deselecting really is withdrawing the answer. The
      // button reads the AND of them, so whichever lands last wakes it.
      var GATE = 0.8;
      var eligible = false;          // the scroll latch
      go.disabled = true;
      go.setAttribute('aria-disabled', 'true');

      function gateProgress() {
        var h = sc.scrollHeight, v = sc.clientHeight;
        if (!h) return 1;
        if (h <= v + 2) return 1;                 // nothing to scroll: fully read
        return Math.min(1, (sc.scrollTop + v) / h);
      }
      // a plan with no candidates (anything written before schema v1.1) has no
      // picker on the page, so this half is simply always satisfied.
      function picked() { return !nnOn || nnChosen.length >= 1; }
      function gatesPass() { return eligible && picked(); }
      gateSync = function () {
        if (!eligible && gateProgress() >= GATE) eligible = true;
        var open = gatesPass();
        if (go.disabled !== !open) {
          go.disabled = !open;
          // the live look arrives on .afl-cta's own 200ms background/colour
          // transition, so the wake up is a fade, never a snap.
        }
        if (open) go.removeAttribute('aria-disabled');
        else go.setAttribute('aria-disabled', 'true');
      };
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
        // THE PICK IS WRITTEN AT AGREE TIME, onto the live plan, so it lands
        // in the same object the day screen reads and persistence saves. The
        // AI never writes `chosen`; this is the only writer of it.
        try {
          if (nnOn && nnChosen.length) {
            if (!plan.nonNegotiables || typeof plan.nonNegotiables !== 'object') plan.nonNegotiables = { candidates: nnCands.slice(), chosen: [] };
            plan.nonNegotiables.chosen = nnChosen.map(function (k) { return nnCands[k]; });
            var lp = livePlan();
            if (lp && lp !== plan && lp.nonNegotiables) lp.nonNegotiables.chosen = plan.nonNegotiables.chosen.slice();
            var pn = G('persistNow'); if (pn) pn();
          }
        } catch (e) {}
        if (typeof opts.onAgree === 'function') opts.onAgree();
      }, function () { return gatesPass(); });
    }

    // ---- THE WAY BACK (round 7; ROUND 8: mirrored) --------------------------
    // The day is the page to the RIGHT now, so a pull to the LEFT brings it
    // back, the same gesture mirrored. Horizontal dominance is what keeps this
    // off the page's own vertical scrolling; nothing here prevents a scroll.
    //
    // ONLY WHEN THERE IS A DAY TO GO BACK TO. On the first visit the day does
    // not exist yet (it is what agreeing opens), so there is no left page and
    // the gesture is not bound at all: a page that cannot move is better than
    // one that moves to nowhere, and it can never become a way around the
    // agreement.
    var backToDay = null;
    if (!opts.into) {
      if (typeof opts.onClose === 'function') backToDay = opts.onClose;
      else if (agreed) backToDay = function () { openDay(key, { plan: plan }); };
    }
    if (backToDay) {
      var lgSnap = bindPageSnap({
        host: root,
        surface: c,
        dir: -1,
        blocked: function (t) {
          if (!t || !t.closest) return true;
          return !!t.closest('.afl-cta, .afl-nav, .afl-nn__a, .afl-ref__t');
        },
        build: function (pg) { openDay(key, { plan: plan, into: pg }); },
        go: backToDay
      });
      var beforeSnap = current.teardown;
      current.teardown = function () {
        lgSnap.destroy();
        if (typeof beforeSnap === 'function') beforeSnap();
      };
    }
    // the page arrives in two beats: the title, then everything under it. The
    // preview build is already on the screen the moment it is dragged into
    // view, and a page handed over by the snap was that preview a frame ago,
    // so neither of them arrives at all.
    if (!opts.into && !pagerHandover) {
      enterFade(starEl, 0);
      enterFade(rest, 1);
      enterFade(nav, 1);
    }
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

  // ===========================================================================
  // 3.4  THE CLOSE WRITES  (merge phase 3, the data half)
  // One held day produces THREE records, and this is the only place they are
  // written, so they can never drift apart:
  //
  //  1. state.dayRecords[<actionDayKey>]  the new store. Keyed by the 4am day
  //     key (js/02's actionDayKey, the app's one day boundary), carrying
  //     starHash + star + supports + size, which is what the per-goal
  //     completedCount and the heatmap read.
  //  2. state.action.completionHistory    THE SPINE. Twelve external readers
  //     already bind to it, so the record is built by the app's OWN factory
  //     (createActionCompletionRecord in js/02), not by a hand-rolled copy:
  //     same fields, same id shape, same billing hook, by construction.
  //  3. a typed proof event               'action-complete' with a dedupeKey,
  //     so a second hold on the same day for the same goal is a no-op instead
  //     of a second receipt.
  //
  // The rest of the sequence is the writers the app already runs on a
  // completion, in the same order js/08's creditTodayAction runs them:
  // rewardShadow (the phase-0 referee observation every completion writer
  // fires), the proof event, analytics, the push context, the streak, persist.
  // rewardShadow is the SHADOW twin, never rewardMoment: the one real referee
  // call still has no caller and attaches in the Rewards phase.
  //
  // IDEMPOTENCE. The dedupeKey is checked BEFORE anything is pushed, because
  // writeProofEvent's own dedupe fires after the completion record would
  // already be in the spine. A repeat updates the day record (a bigger size,
  // another support ticked) and writes nothing else.
  // ===========================================================================
  function closeDedupeKey(rec) {
    return 'action-day-' + (rec.starHash || 'nostar') + '-' + rec.day;
  }
  // The 5-tier vocabulary the spine already speaks, from the shape of the day
  // they actually held. A rest day is the smallest kept day there is.
  function closeTier(rec) {
    if (rec.off) return 'tiny';
    var n = 1 + (rec.supports || []).filter(function (x) { return x; }).length;
    return n >= 3 ? 'heavy' : (n === 2 ? 'moderate' : 'light');
  }
  function writeDayClose(rec, plan) {
    var out = { ok: false, deduped: false, dayRecord: null, completion: null, proof: null, shadow: false };
    var st = S();
    if (!st || !rec) return out;
    try {
      var dkey = closeDedupeKey(rec);
      // v1210: A REAL CLOSE LIFTS ITS OWN TOMBSTONES. An undo marks this day
      // and this dedupeKey as deleted so no sync can resurrect them; closing
      // the day again is the person saying it happened after all, so the
      // marks come off before the write. The old completion record's id stays
      // tombstoned forever: that row is gone, and this close writes a new one.
      try {
        var tomb0 = (st.action && st.action.completionTombstones) || null;
        if (tomb0) { delete tomb0['day:' + rec.day]; delete tomb0[dkey]; }
      } catch (e) {}
      var already = Array.isArray(st.proofEvents) && st.proofEvents.some(function (e) {
        return e && e.metadata && e.metadata.dedupeKey === dkey;
      });

      // 1. the day record. Written on a repeat too: the day is one row, and the
      //    latest state of it is the truth.
      if (!st.dayRecords || typeof st.dayRecords !== 'object') st.dayRecords = {};
      var dayRec = {
        starHash: rec.starHash || '',
        star: rec.star !== false,
        supports: (rec.supports || []).slice(),
        size: (rec.size == null) ? null : rec.size,
        off: !!rec.off,
        text: rec.text || '',
        at: rec.at || Date.now()
      };
      st.dayRecords[rec.day] = dayRec;
      out.dayRecord = dayRec;

      if (already) {
        out.deduped = true;
        out.ok = true;
        try { var p0 = G('persistNow'); if (p0) p0(); } catch (e) {}
        return out;
      }

      // 2. the spine. The factory owns the shape; the shim only gives it the
      //    title and a stable mission id keyed to the goal, so every day of one
      //    plan shares one mission the way the old primaryAction did.
      var tier = closeTier(rec);
      var text = rec.text || '';
      var mk = G('createActionCompletionRecord');
      var shim = {
        title: (plan && plan.star) || liveStar() || '',
        missionId: 'plan_' + (rec.starHash || 'nostar'),
        shape: 'plan'
      };
      var completion = mk ? mk(shim, tier, text) : null;
      if (completion) {
        if (!st.action || typeof st.action !== 'object') st.action = {};
        if (!Array.isArray(st.action.completionHistory)) st.action.completionHistory = [];
        st.action.completionHistory.push(completion);
        out.completion = completion;
      }

      // 2b. THE LEGACY "Day 1." MOMENT IS NOT OURS (v1197, Malik on-device: his
      //     first real close fired the old first-win cinematic). js/04's
      //     _maybeFirstWinMoment hangs off every 'action-complete' proof write
      //     and gates on state.meta.firstActionDone, so claiming the flag HERE,
      //     before the write below, makes it a no-op for anything the new flow
      //     closes. js/04 is untouched: the moment still exists for the old
      //     home path, and the Rewards phase owns the real ceremony for this
      //     one. Claiming it is also honest bookkeeping: an action WAS done.
      try {
        if (!st.meta || typeof st.meta !== 'object') st.meta = {};
        st.meta.firstActionDone = true;
      } catch (e) {}

      // 3. the shadow referee, then the receipt, in creditTodayAction's order.
      try {
        var shadow = G('rewardShadow');
        if (shadow) { shadow('js30-day-close'); out.shadow = true; }
      } catch (e) {}
      try {
        var wp = G('writeProofEvent');
        if (wp) {
          out.proof = wp('action-complete', {
            title: text || shim.title || 'Action completed',
            module: 'action',
            metadata: {
              tier: tier,
              missionId: completion ? completion.missionId : shim.missionId,
              starHash: rec.starHash || '',
              day: rec.day,
              size: dayRec.size,
              supports: dayRec.supports.filter(function (x) { return x; }).length,
              off: dayRec.off
            },
            dedupeKey: dkey
          });
        }
      } catch (e) {}
      try { if (typeof Analytics !== 'undefined' && Analytics.track) Analytics.track('action_done', { tier: tier }); } catch (e) {}
      try { if (window.MementoPush && MementoPush.sync) MementoPush.sync(); } catch (e) {}
      try { var rs = G('recalculateStreak'); if (rs) rs(); } catch (e) {}
      try { var p1 = G('persistNow'); if (p1) p1(); } catch (e) {}
      out.ok = true;
      return out;
    } catch (err) {
      out.error = (err && err.message) ? err.message : String(err);
      return out;
    }
  }

  // ===========================================================================
  // THE ONE COMPLETION CEREMONY + THE HOME DOOR (WO-2, wave 1)
  // closeRewardCeremony is the single reward call every completion door runs:
  // the flow's closeReward delegates here, and completeFromHome (below) is the
  // home box's route into the exact same pipeline. The referee stays the only
  // decider; receipts land before render (v1149).
  // ===========================================================================
  function closeRewardCeremony(rec, prevGp) {
    // v1273: Consistency's live moment. If the full page is open, its M pops
    // and the number counts up; closed, the lit state shows on next open.
    try { if (window.ConsistencyPage) ConsistencyPage.notifyCompletion(); } catch (e) {}
    // ======================= THE CLOSE SEAM ============================
    // THE ONE REWARD CALL (THE-MERGE resolution B, Rewards phase 1).
    // The day is written and the pulse has had its ask, so this is the
    // moment the reward is earned. rewardMoment() builds the full context
    // out of real state (js/26's buildRewardCtx: shape, star, gp,
    // count/countTarget, daysHeld/daysTarget, prevValue, ledger, goalDone,
    // userSaysDone, askedDay, today) and the referee returns ONE tier.
    //
    // prevValue is the standing number from BEFORE the close (v1207). The
    // ask can have moved it a moment ago, and the chooser reads the pair to
    // know which marks this pulse crossed; passing today's value as its own
    // previous value would hide every crossing the ask just produced.
    //
    // RENDER FOLLOWS PERSISTENCE (the v1149 law): the referee writes the
    // finale receipt and pays the milestone ledger inside decide(), so the
    // state is flushed BEFORE anything is drawn. The daily page stamps its
    // own witness before it renders too.
    //
    // 'daily', 'milestone' and (phase 3) 'finale' have renderers; 'none' is
    // the spent finale day and shows nothing by design.
    //
    // userSaysDone is READ FROM STATE here (phase 3). Clarity's fulfilled
    // hold persists gp.userSaysDone and never writes a receipt, so the
    // declaration is a standing fact the referee needs at every door, not
    // just the one it was made at. Without it a target goal declared done
    // yesterday would close today as an ordinary day.
    //
    // ONE REWARD PER COMPLETION (R1/R2): the tiers are a chain, not a list.
    // A milestone renders OVER the settled day and the daily does NOT also
    // show; if the milestone declines (nothing honest to draw for that
    // event) the day still earns its green page, which is R9's promise.
    try {
      var moment = G('rewardMoment');
      var said = false;
      try { var gpNow = S().goalProgress; said = !!(gpNow && gpNow.userSaysDone); } catch (e) {}
      var tier = moment ? moment({ userSaysDone: said, prevValue: prevGp }) : null;
      try { var p1 = G('persistNow'); if (p1) p1(); } catch (e) {}
      var shown = false;
      // THE FINALE OUTRANKS EVERYTHING (R2). The receipt is already written
      // inside decide(), so the ceremony renders after persistence.
      if (tier && tier.tier === 'finale' && window.GrandFinale) {
        shown = GrandFinale.show(tier, { source: 'close' });
      }
      // ...and while the goal's own line is crossed but not yet confirmed,
      // that crossing belongs to the finale. The chooser calls the target
      // itself a 'final' MARK, so without this the same number would be
      // celebrated twice: the mark here, the finale when they confirm. Only
      // the final is held back; an ordinary rung on the same day is still
      // theirs, and a held-back day still earns its green page (R9).
      var finaleOwns = false;
      try {
        finaleOwns = !!(window.GrandFinale && GrandFinale.owns()
          && tier && tier.event && tier.event.kind === 'final');
      } catch (e) {}
      if (!shown && !finaleOwns && tier && tier.tier === 'milestone' && tier.event && window.MilestoneReward) {
        shown = MilestoneReward.show(tier.event);
      }
      // A rest day is a kept day, not a move: the count did not rise, so
      // there is nothing for the green page to say. The rest line owns it.
      if (!shown && tier && (tier.tier === 'daily' || tier.tier === 'milestone') && !rec.off && window.DailyReward) {
        DailyReward.show({ day: rec.day, starHash: rec.starHash });
      }
    } catch (e) {}
    // ===================================================================
  }

  // ======================= THE ASK, AT MODULE SCOPE ========================
  // (WO-2 correction, Codex's review + Malik's "identical everywhere" call.)
  // The close question used to live inside openDay's closure, so only the
  // flow's own door could ask it. Both doors now run the SAME due check and
  // the SAME question: `plan` and the mount host are parameters, openDay
  // passes its own, the home door passes the live plan and a borrowed room.
  // The bodies are the closure's, moved verbatim; openDay keeps thin
  // delegates so its call sites never changed.
  var askLive = null;
  function dayDateOf(k) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
  }
  // THE WEEKLY DAY the plan names ('weekly:sunday'), Sunday when it names
  // none. A person's "Once a week" answer inherits it, so their week lands on
  // the day their own bucket was built around.
  function askWeeklyDow(plan) {
    var cad = String((plan.close && plan.close.cadence) || '');
    var want = (cad.indexOf('weekly') === 0) ? (cad.split(':')[1] || 'sunday') : 'sunday';
    var idx = WEEK.indexOf(String(want).slice(0, 3));
    return idx < 0 ? 0 : idx;
  }
  // EVERY OTHER DAY is arithmetic, never a memory: days since the plan landed,
  // even asks, odd stays quiet. Deterministic, so a missed day cannot shift
  // the rhythm and a reinstall cannot restart it.
  // The anchor, in the order of how solid it is: the day this plan landed,
  // then the day the LIVE plan landed (a fixture or a preview build has no
  // landing of its own), then the first day they ever closed for this goal.
  // All three are facts already in the store, so the rhythm is the same on
  // every device and cannot drift with a reinstall.
  function askEveryOtherAnchor(plan) {
    var a = null;
    try { if (plan.landedAt) a = dayKey(new Date(plan.landedAt)); } catch (e) {}
    if (!a) {
      try {
        var lp = (S() || {}).actionPlan;
        if (lp && lp.landedAt) a = dayKey(new Date(lp.landedAt));
      } catch (e) {}
    }
    if (!a) {
      try {
        var recs = (S() || {}).dayRecords || {}, mine = plan.starHash || liveStarHash(), keys = [];
        Object.keys(recs).forEach(function (k) {
          var r = recs[k];
          if (r && (!mine || !r.starHash || r.starHash === mine)) keys.push(k);
        });
        keys.sort();
        if (keys.length) a = keys[0];
      } catch (e) {}
    }
    return a;
  }
  function askEveryOtherDue(plan, d) {
    var anchor = askEveryOtherAnchor(plan);
    if (!anchor) return true;                 // nothing to count from: ask
    var diff = Math.round((d - dayDateOf(anchor)) / 86400000);
    return Math.abs(diff) % 2 === 0;
  }
  function askPrefDue(plan, pref, rec) {
    var d = dayDateOf(rec.day), dow = d.getDay();
    if (pref.kind === 'daily') return true;
    if (pref.kind === 'every-other') return askEveryOtherDue(plan, d);
    if (pref.kind === 'twice-week') return dow === 1 || dow === 4;   // Mon + Thu
    if (pref.kind === 'weekly') return dow === askWeeklyDow(plan);
    if (pref.kind === 'custom') return (pref.days || []).indexOf(dow) > -1;
    return true;
  }
  function closeAskDueFor(plan, rec) {
    var c = plan.close;
    var pref = null;
    try { pref = livePref(); } catch (e) { pref = null; }
    // v3.2: THE MANUFACTURED ASK. Deep work hours are a real number nothing
    // else in the app records, and the plan's close block for that bucket
    // often says none. Where the person has chosen a rhythm and the bucket
    // has an ask of its own, the rhythm brings the ask with it.
    if ((!c || !c.prompt) && pref) {
      var made = MANUFACTURED_ASK[(livePlan() && livePlan().bucket) || plan.bucket || ''];
      if (made) c = made;
    }
    if (!c || !c.prompt) return null;
    var cad = String(c.cadence || 'none');
    // 'none' and 'on-results' on a plan that HAS a question of its own are
    // not rhythms, and a preference cannot turn them into one. A
    // manufactured ask arrives with its own cadence, so it is unaffected.
    if (c !== plan.close) cad = String(c.cadence || 'daily');
    else if (cad === 'none' || cad === 'on-results') return null;
    var due = false;
    // THE PERSON'S ANSWER FIRST (v3.1), the plan's own line second.
    if (pref) {
      due = askPrefDue(plan, pref, rec);
    } else if (cad === 'daily' || cad === 'nightly') due = true;
    else if (cad.indexOf('weekly') === 0) {
      due = dayDateOf(rec.day).getDay() === askWeeklyDow(plan);
    } else if (cad === 'per-session') due = !rec.off;
    if (!due) return null;
    // ONCE A DAY. gp.askedDay is the app's own throttle for asking a person
    // where they are; the same stamp keeps Clarity's ask off the same day.
    try {
      var gp = S().goalProgress;
      if (gp && gp.askedDay === rec.day) return null;
    } catch (e) {}
    return c;
  }

  // The number rules are the refine screen's, to the character (clean +
  // shownNum + fitNum there): same typing behaviour, same big centred
  // readout, so the two number moments in Action are one control.
  function askClean(raw, dec) {
    var t = String(raw).replace(dec ? /[^0-9.]/g : /[^0-9]/g, '');
    if (!dec) return t.replace(/^0+(?=\d)/, '');
    var s = t.split('.');
    return s.length > 1 ? s[0] + '.' + s.slice(1).join('').slice(0, 1) : t;
  }
  function askShown(v, dec) {
    if (dec) return v;
    return v ? v.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
  }

  function openCloseAskOn(host, c, rec, done) {
    if (askLive) return;
    var kind = (c.kind === 'choice' && (c.choices || []).length) ? 'choice' : 'num';
    var raw = '', pick = null;

    var lay = el('div', 'afl-ask');
    lay.setAttribute('role', 'dialog');
    lay.setAttribute('aria-modal', 'true');
    lay.setAttribute('aria-label', c.prompt);
    var wrap = el('div', 'afl-q afl-q--ask');
    // the same reserved top row the refine questions have, so this question
    // lands on their baseline and clears the close chip's corner (law 3a2).
    var top = el('div', 'afl-q__top');
    top.setAttribute('aria-hidden', 'true');
    top.appendChild(el('span', 'afl-q__sp'));
    wrap.appendChild(top);
    wrap.appendChild(el('div', 'afl-q__q', c.prompt));
    // their plan's own line about why this is asked. No source, no line: the
    // slot is reserved either way, so the question never moves.
    wrap.appendChild(el('p', 'afl-q__unit', c.source || ''));
    var body = el('div', 'afl-q__as');
    wrap.appendChild(body);

    var nav = navRow();
    nav.classList.add('afl-nav--ask');
    var skip = btn('afl-ask__skip', 'Not now');
    var go = cta('Save');
    go.disabled = true;
    nav.appendChild(skip);
    nav.appendChild(go);
    wrap.appendChild(nav);
    var askCol = el('div', 'afl-ask__col');
    askCol.appendChild(wrap);
    lay.appendChild(askCol);

    function live(on) {
      go.disabled = !on;
      go.classList.toggle('is-live', !!on);
    }

    // A DURATION IS NOT A NUMBER (v1290, Malik: "if someone has 8 hours screen
    // time, it's hard to know that was 480+ minutes"). When the plan's close
    // is measured in MINUTES, nobody thinks in minutes past about ninety. So
    // the question stops asking for a raw number and asks for a time: two
    // scrolling columns, hours and minutes, and the app does the arithmetic.
    // Everything else (pounds, subscribers, words, cuts) keeps the keypad,
    // because those really are numbers and can be five digits long.
    var isTime = kind === 'num' && /^(min|mins|minute|minutes)\b/i.test(String(c.unit || '').trim());
    if (isTime) {
      body.classList.add('afl-q__as--num');
      var tw = el('div', 'afl-time');
      var hVal = 0, mVal = 0;

      function wheel(count, label, step, onPick) {
        var col = el('div', 'afl-wheel');
        var sc = el('div', 'afl-wheel__sc');
        var pad = el('div', 'afl-wheel__pad');
        sc.appendChild(pad);
        var cells = [];
        for (var i = 0; i < count; i++) {
          var v = i * step;
          var cell = el('div', 'afl-wheel__i', String(v));
          cell.dataset.v = String(v);
          cells.push(cell);
          sc.appendChild(cell);
        }
        sc.appendChild(el('div', 'afl-wheel__pad'));
        col.appendChild(sc);
        col.appendChild(el('span', 'afl-wheel__lab', label));
        var ROW = 46, t = null;
        function mark() {
          var idx = Math.round(sc.scrollTop / ROW);
          idx = Math.max(0, Math.min(cells.length - 1, idx));
          cells.forEach(function (x, k) {
            var d = Math.abs(k - idx);
            x.classList.toggle('is-on', d === 0);
            x.style.opacity = d === 0 ? '1' : (d === 1 ? '0.42' : '0.18');
          });
          onPick(Number(cells[idx].dataset.v));
        }
        sc.addEventListener('scroll', function () {
          if (t) clearTimeout(t);
          // paint every frame, but only commit once the finger has settled
          cells.forEach(function (x, k) {
            var d = Math.abs(k - sc.scrollTop / ROW);
            x.style.opacity = d < 0.5 ? '1' : (d < 1.5 ? '0.42' : '0.18');
            x.classList.toggle('is-on', d < 0.5);
          });
          t = setTimeout(mark, 90);
        }, { passive: true });
        col.__set = function (v) {
          var idx = Math.max(0, Math.min(cells.length - 1, Math.round(v / step)));
          sc.scrollTop = idx * ROW;
          mark();
        };
        return col;
      }

      var hCol = wheel(24, 'hours', 1, function (v) { hVal = v; sync(); });
      var mCol = wheel(12, 'min', 5, function (v) { mVal = v; sync(); });
      function sync() {
        raw = String(hVal * 60 + mVal);
        live(hVal > 0 || mVal > 0);
      }
      tw.appendChild(hCol);
      tw.appendChild(el('span', 'afl-time__sep', ':'));
      tw.appendChild(mCol);
      var band = el('div', 'afl-time__band');
      band.setAttribute('aria-hidden', 'true');
      tw.appendChild(band);
      body.appendChild(tw);
      // open on what they last recorded, so a steady number is one tap away
      var seed = 0;
      try {
        var gp0 = S().goalProgress;
        if (gp0 && isFinite(Number(gp0.current))) seed = Math.max(0, Math.round(Number(gp0.current)));
      } catch (e) {}
      // seeded twice: the first pass can land before the columns have their
      // real height, and a scroll set against a zero-height box is thrown away
      function seedWheels() {
        hCol.__set(Math.min(23, Math.floor(seed / 60)));
        mCol.__set(Math.round((seed % 60) / 5) * 5 % 60);
        sync();
      }
      requestAnimationFrame(seedWheels);
      setTimeout(seedWheels, 220);
    } else if (kind === 'num') {
      body.classList.add('afl-q__as--num');
      var f = el('div', 'afl-q__field');
      var set = el('div', 'afl-q__set');
      if (c.prefix) set.appendChild(el('span', 'afl-q__pre', c.prefix));
      var inp = document.createElement('input');
      inp.className = 'afl-q__num';
      inp.type = 'text';
      inp.setAttribute('inputmode', c.decimals ? 'decimal' : 'numeric');
      inp.autocomplete = 'off';
      inp.placeholder = '0';
      inp.setAttribute('aria-label', c.prompt);
      set.appendChild(inp);
      if (c.unit) set.appendChild(el('span', 'afl-q__suf', c.unit));
      f.appendChild(set);
      f.appendChild(el('div', 'afl-q__rule'));
      body.appendChild(f);
      var mirror = el('span', 'afl-q__mirror');
      f.appendChild(mirror);
      var fit = function () {
        var t = inp.value || inp.placeholder, L = t.length;
        var px = L <= 3 ? 130 : L === 4 ? 114 : L === 5 ? 99 : L === 6 ? 83 : 70;
        inp.style.fontSize = px + 'px';
        mirror.style.fontSize = px + 'px';
        mirror.textContent = t;
        inp.style.width = Math.max(83, Math.ceil(mirror.getBoundingClientRect().width) + 13) + 'px';
      };
      inp.addEventListener('input', function () {
        raw = askClean(inp.value, c.decimals);
        inp.value = askShown(raw, c.decimals);
        fit();
        live(parseFloat(raw) > 0);
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
      });
      fit();
    } else {
      (c.choices || []).forEach(function (t, k) {
        var b = btn('afl-q__a', t);
        b.addEventListener('click', function () {
          pick = (pick === k) ? null : k;
          [].forEach.call(body.querySelectorAll('.afl-q__a'), function (x, j) {
            x.classList.toggle('is-on', pick === j);
            x.setAttribute('aria-pressed', pick === j ? 'true' : 'false');
          });
          live(pick !== null);
        });
        body.appendChild(b);
      });
    }

    function shut() {
      if (!askLive) return;
      askLive = null;
      if (reduced()) { if (lay.parentNode) lay.parentNode.removeChild(lay); return; }
      lay.classList.add('is-out');
      setTimeout(function () { if (lay.parentNode) lay.parentNode.removeChild(lay); }, 200);
    }

    function answer() {
      var val = (kind === 'num') ? parseFloat(raw) : (c.choices[pick] || '');
      if (kind === 'num' && !isFinite(val)) return;
      if (kind === 'choice' && !val) return;
      // 1. THE RECORD HOLDS WHAT THEY SAID. The day row is the receipt, so
      //    the answer lives with the day it belongs to (the v1002 law), even
      //    for a choice, which the standing store has no shape for yet.
      try {
        var r0 = (S().dayRecords || {})[rec.day];
        if (r0) {
          r0.close = {
            kind: kind, value: val, prompt: c.prompt,
            unit: c.unit || '', prefix: c.prefix || '', at: Date.now()
          };
        }
      } catch (e) {}
      // 2. THE STANDING STORE, through the app's one writer. js/03's pulse
      //    path carries its OWN ceremony renderers, for a number typed
      //    anywhere else in the app. Here the close owns the moment
      //    (resolution B: exactly one referee call, right below), so the two
      //    renderers stand down for this one synchronous write and the
      //    decision is made once, by closeReward.
      if (kind === 'num') {
        var mR = window.MilestoneReward, gF = window.GrandFinale;
        try {
          window.MilestoneReward = null;
          window.GrandFinale = null;
          var upd = G('goalProgressUpdate');
          if (upd) upd(val);
        } catch (e) {
        } finally {
          window.MilestoneReward = mR;
          window.GrandFinale = gF;
        }
      }
      // 3. asked today, so nothing asks again today.
      try { var gp = S().goalProgress; if (gp) gp.askedDay = rec.day; } catch (e) {}
      try { var p = G('persistNow'); if (p) p(); } catch (e) {}
      shut();
      try { done(); } catch (e) {}
    }

    go.addEventListener('click', function () { if (!go.disabled) answer(); });
    // "Not now" is a real answer to a question about a number they may not
    // have. It costs nothing and it is never asked about again today.
    skip.addEventListener('click', function () { shut(); try { done(); } catch (e) {} });

    askLive = { close: shut };
    host.appendChild(lay);
    if (!reduced()) { void lay.offsetWidth; lay.classList.add('is-in'); }
  }

  // THE HOME DOOR'S ASK ROOM. The home has no flow room, so the ask borrows
  // one: a real shell(), so the question stands on the exact surface, column
  // and background the flow's own ask stands on, with the standing X in its
  // corner. Every way out (Save, Not now, the X, Escape) settles the SAME
  // way, exactly once: the room closes, then the one reward ceremony runs.
  // The X and Escape count as "Not now": the day is already written, the ask
  // stays merely unanswered, never lost.
  function openHomeAsk(c, rec, prevGp) {
    var fired = false;
    function settle() {
      if (fired) return;
      fired = true;
      if (askLive) { try { askLive.close(); } catch (e) {} askLive = null; }
      closeRewardCeremony(rec, prevGp);
    }
    try {
      shell('close-ask', { label: c.prompt });
      if (current) current.teardown = function () { setTimeout(settle, 0); };
      openCloseAskOn(root, c, rec, function () {
        // the room leaves first, so the ceremony renders over the home the
        // same way the flow's own settled day hands over to it.
        try { destroy(); } catch (e) { settle(); }
      });
    } catch (e) {
      settle();
    }
  }
  // =========================================================================

  var _homeCloseBusy = false;
  function completeFromHome() {
    var st = S();
    if (!st) return { ok: false, reason: 'no-state' };
    if (_homeCloseBusy) return { ok: false, reason: 'busy' };
    var dk = dayKey();
    try {
      var ex = st.dayRecords && st.dayRecords[dk];
      if (ex && !ex.off) return { ok: false, reason: 'already-closed' };
    } catch (e) {}
    _homeCloseBusy = true;
    try {
      var plan = null;
      try { plan = livePlan(); } catch (e) {}
      var prevGp = null;
      try { var g0 = st.goalProgress; prevGp = g0 ? g0.current : null; } catch (e) {}
      var starText = '';
      try {
        starText = (plan && plan.acts && plan.acts[0] && plan.acts[0].text) || liveStar() || '';
      } catch (e) {}
      // The home door closes the STAR act only: the box shows one move and one
      // hold. Supports live in the day view; an empty list is the honest record
      // of what this door showed.
      var rec = {
        day: dk,
        starHash: (plan && plan.starHash) || liveStarHash() || '',
        star: true,
        supports: [],
        size: null,
        off: false,
        text: String(starText).replace(/\n/g, ' '),
        at: Date.now()
      };
      var res = writeDayClose(rec, plan);
      setTimeout(function () { try { var ra = G('renderAll'); if (ra) ra(); } catch (e) {} }, 0);
      // THE ASK IS DUE AT EVERY DOOR (Malik: identical everywhere). The same
      // due check the flow's day view runs; when it says today, the home door
      // asks the same question on the same surface before the ceremony.
      var askC = null;
      if (plan) { try { askC = closeAskDueFor(plan, rec); } catch (e) { askC = null; } }
      if (askC) openHomeAsk(askC, rec, prevGp);
      else closeRewardCeremony(rec, prevGp);
      return { ok: !!(res && res.ok), rec: rec, asked: !!askC };
    } finally {
      _homeCloseBusy = false;
    }
  }

  function undoDayData(starHash) {
    var st = S();
    if (!st) return false;
    var dk = dayKey();
    var hash = (starHash !== undefined && starHash !== null) ? starHash : liveStarHash();
    var key = hash || 'nostar';
    // v1210: THE TOMBSTONES. Deleting a row locally is not enough: every one
    // of these three stores merges by UNION in js/12, so the cloud copy
    // would hand the day straight back on the next sync. Each deletion below
    // writes the key it removed, and js/12 drops tombstoned keys from all
    // three unions (js/01 owns the store and its cap).
    var tomb = null;
    try {
      if (!st.action || typeof st.action !== 'object') st.action = {};
      if (!st.action.completionTombstones || typeof st.action.completionTombstones !== 'object') st.action.completionTombstones = {};
      tomb = st.action.completionTombstones;
    } catch (e) { tomb = null; }
    var now = Date.now();
    function mark(k) { if (tomb && k) tomb[k] = now; }
    try {
      if (st.dayRecords) delete st.dayRecords[dk];
      mark('day:' + dk);
      var hist = (st.action && Array.isArray(st.action.completionHistory)) ? st.action.completionHistory : null;
      if (hist) {
        var mid = 'plan_' + key;
        for (var i = hist.length - 1; i >= 0; i--) {
          var h = hist[i];
          if (!h || h.missionId !== mid) continue;
          var hd = '';
          try {
            hd = (typeof actionDayKey === 'function')
              ? actionDayKey(new Date(h.date))
              : String(h.date || '').slice(0, 10);
          } catch (e) {}
          if (hd === dk) { mark(h.id); hist.splice(i, 1); break; }
        }
      }
      var dedupe = closeDedupeKey({ starHash: hash, day: dk });
      mark(dedupe);
      if (Array.isArray(st.proofEvents)) {
        st.proofEvents = st.proofEvents.filter(function (e) {
          if (e && e.metadata && e.metadata.dedupeKey === dedupe) { mark(e.id); return false; }
          return true;
        });
      }
      if (st.rewards) {
        if (st.rewards.dailySeen) delete st.rewards.dailySeen[key + '|' + dk];
        if (!st.rewards.counts || typeof st.rewards.counts !== 'object') st.rewards.counts = {};
        var n = 0, recs = st.dayRecords || {};
        Object.keys(recs).forEach(function (k) {
          var r = recs[k];
          if (!r || r.off) return;
          if (hash && r.starHash && r.starHash !== hash) return;
          n++;
        });
        st.rewards.counts[key] = n;
      }
      try { var rs = G('recalculateStreak'); if (rs) rs(); } catch (e) {}
      try { var p = G('persistNow'); if (p) p(); } catch (e) {}
      try { if (window.MementoPush && MementoPush.sync) MementoPush.sync(); } catch (e) {}
      try { var ra = G('renderAll'); if (ra) ra(); } catch (e) {}
    } catch (e) {}
    return true;
  }

  function openDay(key, opts) {
    opts = opts || {};
    var fx = FIXTURES[key] || FIXTURES.weight;
    // the same rule the logic page follows: their plan, unless a demo hands one
    var plan = opts.plan || livePlan() || fx.plan;
    // opts.into = THE PREVIEW BUILD (the logic page's second page, round 7).
    // Same screen, rendered into a host element instead of taking the room, so
    // it owns no teardown, no doors, no entrance and no window listeners.
    var col = shell('day', { label: 'Today', into: opts.into || null });
    // the .afl this day is painted in: the live room, or the preview's own.
    var home = opts.into ? col.parentNode : root;
    var daySnap = null;

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
    // ROUND 8: the rise is the HOLD's gesture and nothing else. It crests, it
    // fades, and the green then lives in the button (the settled day carries no
    // background wash at all, which is what made swiping to the logic page read
    // as a hard green cutoff on his phone).
    var rise = el('div', 'afl__rise');
    rise.setAttribute('aria-hidden', 'true');
    home.insertBefore(rise, col);

    // THE M (round 8 took it off the top centre; ROUND 9 puts it in the TOP
    // LEFT CORNER as branding, mirroring the close chip's corner: same vertical
    // centre, the same 16px inset from its own edge, a real 44px hit area, and
    // a 12px mark inside it. Absolutely positioned, so it costs the page no
    // layout at all and a page that has it is exactly as tall as one that does
    // not (the settle-shift law, round 9 item 1). Still the secondary door.
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

    // the deep work door. Rendered when the star act is session shaped; bound
    // to the app's existing timer surface below (phase 3.2).
    var dw = btn('afl-day__dw');
    dw.appendChild(el('b', null, 'Deep work'));
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
    // v1197 (Malik, on-device): THE NO LIST IS OFF THE DAY SCREEN. "Takes way
    // too much space in the main card." The full list still lives on the logic
    // page, which is one swipe or one tap on the M away.
    //
    // Round 5: the row it freed carries the NON-NEGOTIABLES they picked. One
    // quiet line, never loud and never tappable: it is a standard they are
    // holding, not another thing to do. A plan with nothing chosen (or one
    // written before schema v1.1) renders no line at all.
    //
    // ROUND 7 (Malik, on-device): the line becomes an EXPANDABLE ROW under the
    // supports. Its marker is a SOLID filled X, deliberately not the supports'
    // open box: these are already committed, they are not today's work. It
    // never counts as an act, never gates the hold, and it is collapsed until
    // asked. A plan with nothing chosen renders no row at all.
    var nnPick = (plan.nonNegotiables && Array.isArray(plan.nonNegotiables.chosen))
      ? plan.nonNegotiables.chosen.filter(function (t) { return t && String(t).trim(); }) : [];
    var nnWrap = null, nnHead = null;
    if (nnPick.length) {
      nnWrap = el('div', 'afl-day__nn');
      nnHead = btn('afl-day__nnt');
      nnHead.setAttribute('aria-expanded', 'false');
      var nnMk = el('span', 'afl-day__nnx');
      nnMk.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.7 3.7l4.6 4.6M8.3 3.7l-4.6 4.6"/></svg>';
      nnHead.appendChild(nnMk);
      nnHead.appendChild(el('span', 'afl-day__nnl', 'Non-negotiables'));
      // two boxes on purpose: the outer one animates its own height (a grid
      // row from 0fr to 1fr, the only way to move a REAL height rather than a
      // max-height guess that opens in one frame), the inner one clips.
      var nnBody = el('div', 'afl-day__nnb');
      var nnIn = el('div', 'afl-day__nnin');
      nnPick.forEach(function (t) { nnIn.appendChild(el('p', 'afl-day__nni', t)); });
      nnBody.appendChild(nnIn);
      nnHead.addEventListener('click', function () {
        var open = !nnWrap.classList.contains('is-open');
        nnWrap.classList.toggle('is-open', open);
        nnHead.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nnWrap.appendChild(nnHead);
      nnWrap.appendChild(nnBody);
      plate.appendChild(nnWrap);
    }
    day.appendChild(plate);

    var nav = navRow();
    nav.classList.add('afl-nav--day');
    var hold = btn('afl-day__hold');
    hold.appendChild(el('span', null, 'Hold to complete'));
    // ROUND 8: the signed row and the button no longer share one cell. The
    // green ends up IN the button ("Completed"), so the receipt line has to
    // live somewhere of its own: it opens above the button on its own real
    // height, and the button never moves while it does.
    var doneWrap = el('div', 'afl-day__donew');
    var doneIn = el('div', 'afl-day__donein');
    var doneRow = el('div', 'afl-day__done');
    doneRow.appendChild(el('b'));
    doneRow.appendChild(el('span', 'afl-day__dt'));
    var undo = btn('afl-day__undo', 'Undo');
    doneRow.appendChild(undo);
    doneIn.appendChild(doneRow);
    doneWrap.appendChild(doneIn);
    nav.appendChild(doneWrap);
    nav.appendChild(hold);
    // the dots sit UNDER the button, in the nav's own bottom padding, so the
    // standing button geometry is untouched. The day is the SECOND page (logic
    // is to its left), so the second dot is home.
    mountDots(col, opts.into, 1);
    col.appendChild(nav);

    // ---- state --------------------------------------------------------------
    // star + every support the plan actually has. It used to arrive as a flat 3,
    // so a plan with one act or no supports drew the plate's rule above nothing
    // (an orphaned divider). The ceiling is what exists, never what fits.
    var MAX_ACTS = 1 + sups.length;
    var actCount = MAX_ACTS;
    var val = hasSize ? named[named.length - 1] : 0;
    var lastVal = val;
    var ticks = sups.map(function () { return false; });
    var signed = false;
    var restored = false;              // this day was closed before we opened it
    var railTicks = [];

    function ladderAsc() {
      var L = hasSize ? ladder.slice() : [0, 1, 2];
      L.sort(function (a, b) { return ascending ? a - b : b - a; });
      return L;
    }
    function actsForValue(v) {
      var hv = function (x) { return ascending ? x : -x; };
      if (!named.length) return MAX_ACTS;
      if (hv(v) <= hv(named[0])) return Math.min(1, MAX_ACTS);
      if (hv(v) <= hv(named[1])) return Math.min(2, MAX_ACTS);
      return MAX_ACTS;
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
      ruleEl.classList.toggle('is-gone', actCount === 1 || !sups.length);
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
      if (home) home.classList.toggle('is-signed', signed);
      drawStar();
      drawPlate();
      drawRail();
      dw.classList.toggle('is-gone', !(starAct.session && !off));
      // the row is the same standard every day, so the only thing paint has a
      // say in is the rest day, where the old line was hidden too.
      if (nnWrap) nnWrap.classList.toggle('is-gone', off);
      // this changes on a rest day. It fades.
      // ROUND 8: the button IS the completion once the day is held. It goes
      // spring green and says so, and it keeps saying so on a re-open.
      swapText(hold.querySelector('span'),
        signed ? 'Completed' : (off ? 'Hold to close the day' : 'Hold to complete'), 1);
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
    // ROUND 8: THE CREST, THEN THE GREEN GOES HOME. The rise still fills the
    // room (that is the ceremony, and it is untouched), holds a beat, then
    // fades out over 600ms and leaves. What is left of it is the button, which
    // is green from the moment the hold lands. A settled day therefore has a
    // plain room, which is what stops the swipe to the logic page reading as a
    // hard green cutoff.
    function riseCrest() {
      if (reduced()) return;
      rise.style.transition = 'none';
      rise.style.height = '100%';
      setTimeout(function () {
        rise.style.transition = 'opacity .6s ease-out';
        rise.style.opacity = '0';
        setTimeout(function () {
          if (!rise.isConnected) return;
          rise.style.transition = 'none';
          rise.style.height = '0';
          rise.style.opacity = '1';
        }, 640);
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

    // ---- THE CLOSE (merge phase 3.4, the data half) -------------------------
    // THE WAIT IS GONE (v1207, Malik on-device: the green page "arrives a bit
    // delayed and looks weird"). The 1.5s undo window WAS that delay. The day
    // is now written the instant the hold crests, and the moment that follows
    // opens on top while the crest is still green, so the two read as one move
    // instead of a cut and a wait.
    //
    // Taking it back did not disappear, it MOVED: the receipt row carries a
    // standing Undo for as long as today is today, re-opens included (see
    // undoDay). A mis-hold is fixable for hours now instead of for a second
    // and a half, which is the stronger promise of the two.
    var written = false;

    function complete() {
      signed = true;
      riseCrest();
      doneRow.querySelector('.afl-day__dt').textContent = 'Done at ' + stamp() + '.';
      paint();
      commitDay();
    }

    function dayRecordNow() {
      return {
        day: dayKey(),
        starHash: plan.starHash || liveStarHash(),
        star: !off,
        supports: ticks.slice(0, Math.max(0, actCount - 1)),
        // a rest day has no size: the rail is not on the screen, so a number
        // here would be the default pretending to be a choice they made.
        size: (hasSize && !off) ? val : null,
        off: off,
        // what the screen actually SHOWED, which is the only honest text for a
        // receipt (the v1002 law: the ledger must hold the words they read).
        text: off ? offText() : starEl.textContent,
        at: Date.now()
      };
    }
    function offText() {
      return (plan.offDays && plan.offDays.restLine ? plan.offDays.restLine : 'Rest day.\nEnjoy :)').replace(/\n/g, ' ');
    }
    function commitDay() {
      if (written) return null;
      written = true;
      var rec = dayRecordNow();
      ActionFlow._lastDayRecord = rec;
      // the number the standing store held BEFORE this close. The ask below can
      // move it, and the chooser needs the old value to know what was crossed.
      var prevGp = null;
      try { var g0 = S().goalProgress; prevGp = g0 ? g0.current : null; } catch (e) {}
      var res = writeDayClose(rec, plan);
      ActionFlow._lastClose = res;
      // THE HOME HAS TO KNOW (v1197, Malik on-device: he closed the flow after
      // completing and the homepage, sync box included, showed nothing). The
      // old path did this in completeTodayActionFromHome (js/08:3653): credit,
      // then renderAll. This flow wrote the same records and never repainted.
      // Same call, no new machinery: renderAll re-renders the command centre,
      // which is where the sync box lives, plus the day card, the consistency
      // block, the heat and the sidebar.
      //
      // IT WAITS ONE TICK (v1207). The home is behind a full screen overlay at
      // this moment and the ceremony is not: repainting the whole command
      // centre first put a heavy synchronous job between the crest and the
      // page, which is the delay Malik felt. Persistence already happened
      // above; this is only paint, so it goes after.
      setTimeout(function () { try { var ra = G('renderAll'); if (ra) ra(); } catch (e) {} }, 0);
      closeMoment(rec, prevGp);
      return res;
    }

    // THE CLOSE MOMENT (resolution B, in its order): the pulse asks its one
    // number when the plan says today is an ask day, and only then does the
    // referee decide. A number that crosses a mark therefore reaches the
    // referee in the same breath, so the crossing outranks the daily page
    // instead of arriving after it.
    function closeMoment(rec, prevGp) {
      var ask = null;
      try { ask = closeAskDue(rec); } catch (e) { ask = null; }
      if (!ask) { closeReward(rec, prevGp); return; }
      openCloseAsk(ask, rec, function () { closeReward(rec, prevGp); });
    }

    function closeReward(rec, prevGp) {
      // Extracted to module scope (WO-2): every completion door shares ONE
      // ceremony. This flow calls the same function the home door calls.
      closeRewardCeremony(rec, prevGp);
    }

    // =========================================================================
    // THE CLOSE PULSE ASK (v1207, Malik: "when is Memento going to ask how
    // close or far I am?"). The plan already carries the answer in plan.close,
    // and resolution B already says where it goes: after the day is written,
    // before the referee. This is the consumer, nothing more. It never invents
    // a cadence and it never asks twice in one day.
    //
    // THE CADENCE TABLE (ACTION-BUCKETS.md, one line each):
    //   daily / nightly   every close asks (the weigh-in, the screen report)
    //   weekly:<day>      only on that weekday's close (money, audience)
    //   per-session       every close that was not a rest day
    //   on-results        NEVER here. It is event cadence: "asked when grades
    //                     or results exist, never between." A schedule would
    //                     be Memento inventing an occasion.
    //   none              never, for anyone
    // =========================================================================
    // THE ASK LIVES AT MODULE SCOPE NOW (WO-2 correction): the due check,
    // the question and its singleton moved up so the home door can run the
    // identical moment. These delegates keep this room's call sites as they
    // were; `plan` and this room's own element are the only things it adds.
    function closeAskDue(rec) { return closeAskDueFor(plan, rec); }
    function openCloseAsk(c, rec, done) { openCloseAskOn(home, c, rec, done); }

    // =========================================================================
    // THE STANDING UNDO (v1207, Malik). The old 1.5 second window was the only
    // way back, and it was also the delay in front of the reward. So the way
    // back became a standing one: a quiet text control on the receipt row,
    // there for as long as today is today, re-opens included.
    //
    // WHAT IT REVERSES: today, and only today. The day record, the completion
    // in the spine, the receipt, the daily page's witness stamp (so a real
    // re-completion earns its page again), and the per-goal count, which
    // yields to an explicit correction. The count law protects the number from
    // data quirks, never from its owner.
    //
    // WHAT IT NEVER TOUCHES: anything already witnessed. A milestone mark that
    // fired stays paid and a finale receipt stays written (fired = witnessed),
    // and a number they typed into the pulse stays: that is a fact about their
    // body or their business, not a fact about this day being closed.
    // =========================================================================
    function undoDay() {
      // Data reversal extracted to module scope (WO-2): the home door's undo
      // runs the exact same tombstoned reversal. UI reset stays here.
      undoDayData(plan.starHash || liveStarHash());
      // ...and the screen is a live day again: the hold is armed, the content
      // is back at full strength, the green is gone.
      written = false;
      signed = false;
      restored = false;
      day.classList.remove('is-restored');
      try { dayHold.reset(); } catch (e) {}
      rise.style.transition = 'none';
      rise.style.height = '0';
      rise.style.opacity = '1';
      var dt = doneRow.querySelector('.afl-day__dt');
      if (dt) dt.textContent = '';
      paint();
    }

    // THE CONFIRM (v1210, Malik). Undo now costs a second tap. It is the app's
    // own dialog (Clarity's cn-dlg, the same one that guards deleting a note),
    // theme faithful here and without the red: taking today back is a
    // correction, not a disaster. Cancelling changes nothing at all.
    function confirmUndo(onYes) {
      var wrap = el('div', 'cn-dlgwrap afl-dlg');
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      var box = el('div', 'cn-dlg cn-dlg--afl');
      box.appendChild(el('h4', null, 'Undo today?'));
      box.appendChild(el('p', null, 'This removes the day from your record.'));
      var yes = btn('cn-dlgbtn cn-dlgbtn--afl', 'Undo it');
      var no = btn('cn-dlgbtn cn-dlgbtn--quiet', 'Keep it');
      box.appendChild(yes);
      box.appendChild(no);
      wrap.appendChild(box);
      function shut() { try { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } catch (e) {} }
      wrap.addEventListener('click', function (e) { if (e.target === wrap) shut(); });
      no.addEventListener('click', shut);
      yes.addEventListener('click', function () { shut(); try { onYes(); } catch (e) {} });
      // it lives in the flow's own room, so it dies with the view
      home.appendChild(wrap);
      requestAnimationFrame(function () { wrap.classList.add('is-on'); });
      return wrap;
    }

    undo.addEventListener('click', function () {
      if (!signed) return;
      confirmUndo(undoDay);
    });

    // ---- 3.2  THE DEEP WORK DOOR --------------------------------------------
    // Bound to the EXISTING timer (js/07's deepwork sheet, the surface the old
    // module opened through Sheet.open). There is never a second timer here.
    // Session-shaped star acts only, which is what renders the door at all.
    // The sheet sits above this overlay, so on return the day screen is exactly
    // where they left it: the size on the rail, the supports they ticked.
    var sheetWatch = null;
    function openDeepWork() {
      try {
        if (typeof Sheet === 'undefined' || !Sheet.open) return;
        var st = S();
        // they came for the clock, not for an introduction
        if (st && st.introsSeen && !st.introsSeen.deepwork) {
          st.introsSeen.deepwork = true;
          try { var p = G('persistNow'); if (p) p(); } catch (e) {}
        }
        // the length the plan proposes, or the size the rail is holding
        var min = 0;
        if (starAct.session && starAct.session.defaultMin) min = +starAct.session.defaultMin || 0;
        if (!min && hasSize && (plan.sizes || {}).unit === 'min') min = val;
        if (min > 0 && typeof SHEET_TEMPLATES !== 'undefined' && SHEET_TEMPLATES.deepwork) {
          SHEET_TEMPLATES.deepwork._targetSec = Math.max(60, Math.round(min) * 60);
        }
        Sheet.open('deepwork');
        // Sheet.open hides the app's fullscreen close (one X at a time, v1171).
        // The flow's own X has to come back the moment the sheet leaves, or the
        // day screen is left with no way out.
        if (sheetWatch) clearInterval(sheetWatch);
        sheetWatch = setInterval(function () {
          if (typeof Sheet === 'undefined' || Sheet.isOpen) return;
          clearInterval(sheetWatch);
          sheetWatch = null;
          if (root) showExit();
        }, 250);
      } catch (e) {}
    }
    dw.addEventListener('click', openDeepWork);

    // THE VIEW DIES CLEANLY. The day is already written by the time anything
    // here can be torn down (there is no pending window any more), the sheet
    // watcher stops, and nothing here outlives the screen.
    //
    // LEAVING DURING THE ASK is leaving: the ask closes with the view and the
    // ceremony does not chase them onto the home screen. The day stands, the
    // number simply was not given, and gp.askedDay was never stamped, so the
    // app may still ask somewhere else today.
    if (!opts.into) current.teardown = function () {
      if (sheetWatch) { clearInterval(sheetWatch); sheetWatch = null; }
      if (askLive) { try { askLive.close(); } catch (e) {} askLive = null; }
      // the page snap listens on the window, so it stops listening with the
      // view: nothing in this module outlives its screen.
      if (daySnap) { daySnap.destroy(); daySnap = null; }
    };

    function toLogic() {
      openLogic(key, {
        plan: plan, standing: true,
        // coming back is always a LIVE day, never another preview build
        onClose: function () {
          var o = {};
          for (var k in opts) { if (k !== 'into' && Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k]; }
          openDay(key, o);
        }
      });
    }
    mBtn.addEventListener('click', toLogic);

    // ---- THE DOOR TO THE LOGIC PAGE (round 7; ROUND 8: the other way) -------
    // The logic page is the LEFT page now, so a pull to the RIGHT brings it in
    // from the left edge, 1:1 with the finger, and letting go snaps one way or
    // the other, never between. The M is still a tap to the same page, from
    // its new home at the bottom.
    //
    // It only starts on OPEN BACKGROUND: a press on the rail, a support, the
    // CTA, the M, the deep work door, the signed row or the non-negotiables
    // row is that control's gesture and this never sees it.
    function swipeBlocked(t) {
      if (!t || !t.closest) return true;
      // v1288: the blocked list was most of the screen (the supports, the M,
      // the deep-work door, the signed row, the non-negotiables row and the
      // WHOLE nav), so there was barely anywhere left to start a swipe from.
      // Only two controls own a gesture of their own and keep it: the size
      // rail (a vertical slider) and the hold-to-complete button. Everything
      // else is a tap, and a tap is unaffected: this gesture does not take
      // over until the finger has travelled 8px sideways.
      // Only the size rail keeps the gesture now: it is a vertical slider with
      // touch-action:none, so a drag there is unambiguously its own. The hold
      // button releases on movement (see bindHold), so a swipe may start on it.
      return !!t.closest('.afl-day__rail');
    }
    if (!opts.into) {
      daySnap = bindPageSnap({
        host: home,
        surface: day,
        dir: 1,
        blocked: swipeBlocked,
        build: function (pg) { openLogic(key, { plan: plan, standing: true, into: pg }); },
        go: toLogic
      });
    }

    // ---- THE CLOSED DAY (merge 3.1, the re-open) ----------------------------
    // Today's record already exists, so this day was held and written. It has
    // to come back the way it was LEFT, or the screen asks a person to do a day
    // they already did. Same locked state the screen reaches after commitDay
    // (the signed row, no Undo, the rail out of reach, the supports as they
    // were ticked), entered from the render instead of from the hold.
    //
    // QUIETLY. The green rise is the GESTURE, and the gesture is over: it never
    // replays, and nothing here animates. Tomorrow is a new actionDayKey, so
    // this simply does not fire and the day renders fresh.
    function closedToday() {
      try {
        var r = ((S() || {}).dayRecords || {})[dayKey()];
        if (!r) return null;
        // a record belonging to a retired goal is not this plan's day
        var mine = plan.starHash || liveStarHash();
        if (r.starHash && mine && r.starHash !== mine) return null;
        return r;
      } catch (e) { return null; }
    }
    function restoreClosed(r) {
      signed = true;
      written = true;                  // the stores already hold this day
      off = !!r.off;                   // the record decides, not today's calendar
      var sup = Array.isArray(r.supports) ? r.supports : null;
      if (sup) {
        ticks = ticks.map(function (_, k) { return !!sup[k]; });
        // the plate showed star + supports; the array's length is what it was
        actCount = Math.min(MAX_ACTS, Math.max(1, sup.length + 1));
      }
      if (hasSize && !off && r.size != null) { val = r.size; lastVal = r.size; }
      var dt = doneRow.querySelector('.afl-day__dt');
      if (dt) dt.textContent = 'Done at ' + stamp(r.at) + '.';
      // v1207: THE UNDO STANDS. A day they closed this morning is still today,
      // so the way back is still on the screen when they come back to it.
      // Tomorrow this branch does not run at all, and yesterday can never be
      // reopened here, which is what keeps "today only" true by construction.
      // ROUND 8: a re-entered closed day carries NO background wash. The room
      // is the room; the green that is left is the button, and the button is
      // simply already green when the screen paints. Nothing to animate in,
      // nothing to suppress, which is what the wash needed three lines for.
      //
      // ROUND 9: and the settled weight is already ON at the first paint. The
      // day did not just finish, it finished earlier; replaying the calm-down
      // would be the app pretending it just happened.
      //
      // THE ENTRANCE GOES WITH IT. Measured: the entrance animates opacity to
      // 1, and the settled base is 0.62, so a restored day faded in to FULL
      // strength and then dropped to settled the moment the class came off. A
      // pop, on the one screen that is meant to be already at rest. A day that
      // was closed before this screen opened does not arrive at all.
      day.classList.add('is-restored');
      restored = true;
    }
    var closedRec = closedToday();
    if (closedRec) restoreClosed(closedRec);

    paint();
    // the preview build is already on the screen the moment it is dragged
    // into view, a page handed over by the snap was that preview a frame ago,
    // and a day that was already closed is at rest by definition: none of the
    // three arrives.
    if (!opts.into && !pagerHandover && !restored) {
      enterFade(day);
      enterFade(nav);
    }
    return root;
  }

  // ===========================================================================
  // 3.0  THE REAL WALK
  // The five surfaces, driven by the person's own state and the real brain,
  // in one place. This is what phase 3.1 (entry wiring) will call; NOTHING
  // calls it yet, so the module is still inert until something does.
  //
  //   intent  their star from Clarity
  //   note    the interstitial
  //   refine  the bucket's question set -> state.actionRefine + the baseline
  //   loading actionPlanGenerate -> actionPlanLand
  //   logic   the landed plan, and the agreement
  //   day     the landed plan, and the close
  //
  // THE BUCKET. Resolved once here by the brain's own router, from the star and
  // Clarity's goalShape (there is no refine text yet). It picks the question
  // SET, then rides into state.actionRefine, where the brain's rule is that a
  // stored bucket overrides the router downstream: the questions asked and the
  // plan written are always for the same bucket.
  // ===========================================================================
  function resolveBucket() {
    var star = liveStar();
    var shape = liveShape();
    var r = null;
    try { var rt = G('actionBucketRouter'); if (rt) r = rt(star, shape, ''); } catch (e) {}
    var bucket = (r && r.bucket) || 'focus';
    var variant = (r && r.variant) || '';
    // the money job variant asks its own set; the bucket it is stored under is
    // still 'money' (ACTION-PLAN-SCHEMA's eight, never nine).
    var qset = (bucket === 'money' && variant === 'job') ? 'money-job' : bucket;
    return { bucket: bucket, variant: variant, qset: QUESTIONS[qset] ? qset : bucket, routed: r };
  }

  // What Memento already knows, before a plan exists: the wall of intent and
  // the working list both render THIS, and every line of it has to be
  // something the person actually said. Nothing is filled in.
  function realIntake(ctx) {
    var st = S();
    var ans = (st && st.clarity && st.clarity.answers) || {};
    var star = ctx.star;
    var why = String(ans.coreWhy || '').trim();
    var shape = ctx.shape || {};
    var deadline = (typeof shape.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(shape.deadline)) ? shape.deadline : '';
    // ob-1 presses the star apart into lines. Clarity does not store that
    // decomposition (schema v1.1 wish, HANDOFF), so the honest fallback is the
    // sentence itself: one line, their words, nothing invented.
    var wall = [{ big: star }];
    var facts = [];
    if (star) facts.push({ s: 'Your star, in your words.', t: star, q: true });
    if (why) facts.push({ s: 'Why you said it matters.', t: why, q: true });
    if (deadline) facts.push({ s: 'The date you set.', t: '', date: deadline });
    // their refine answers, read back. Numbers first, then what they said they
    // had already tried, because those are the two the plan leans on.
    var refine = (st && st.actionRefine && Array.isArray(st.actionRefine.answers)) ? st.actionRefine.answers : [];
    var numbers = refine.filter(function (a) { return a && a.num; }).map(function (a) { return a.num; });
    if (numbers.length) facts.push({ s: 'The numbers you typed in the refine step.', t: numbers.join('. ') + '.' });
    var said = refine.filter(function (a) { return a && (a.chips || []).length; })
      .map(function (a) { return a.chips.join(', '); });
    if (said.length) facts.push({ s: 'What you told Memento just now.', t: said[0] + '.' });
    var wrote = refine.filter(function (a) { return a && a.text; }).map(function (a) { return a.text; });
    if (wrote.length) facts.push({ s: 'In your own words.', t: wrote[0], q: true });
    return { star: star, why: why, deadline: deadline, wall: wall, facts: facts, bucket: ctx.bucket };
  }

  // ===========================================================================
  // 3.1  THE GATE  (merge phase 3.1, entry wiring)
  // The SAME sequence the old door ran (js/02 ActionExperience.open, ~2781),
  // reused rather than re-decided, so entitlement behaviour is unchanged
  // (ACTION-MERGE-PLAN 6.1: Action is paid):
  //   1. THE WALL. No Clarity, no Action. Above the paywall on purpose: a paid
  //      account with no star has nothing to build a plan from. It also scrubs
  //      the saved view, or a stale one retries this door on every boot.
  //   2. FIRST 7 DAYS, once, for everyone. It is the trust timeline, not the
  //      sell, so it runs before the branch.
  //   3. THE PAYWALL. Locked -> show it and stop. Paid -> straight in.
  // Returns true when it CONSUMED the tap (the flow must not open).
  // ===========================================================================
  function gateBlocks(retry) {
    var st = S();
    if (!(st && st.clarity && st.clarity.completed)) {
      try { var rv = G('rememberView'); if (rv) rv(null); } catch (e) {}
      return true;
    }
    try {
      if (typeof ClarityPaywall !== 'undefined') {
        st.meta = st.meta || {};
        var n7 = G('showNext7Days');
        if (n7 && !st.meta.next7DaysSeen) {
          st.meta.next7DaysSeen = true;
          try { var p = G('persistNow'); if (p) p(); } catch (e) {}
          n7(function () {
            try {
              if (ClarityPaywall.isPaid()) retry();
              else if (ClarityPaywall.show) ClarityPaywall.show();
            } catch (e) {}
          });
          return true;
        }
        if (ClarityPaywall.isLockedByPaywall('action')) { ClarityPaywall.show(); return true; }
      }
    } catch (e) {}
    return false;
  }

  // ---------------------------------------------------------------------------
  // THE AGREEMENT. The logic page's hold is a one-time commitment, so it has to
  // survive a reload, and the plan object is where it belongs: same store, same
  // starHash, dies with the plan it was given for. (js/01 is another builder's
  // file this phase, so nothing new is added to the state shape.)
  // ---------------------------------------------------------------------------
  function markAgreed() {
    try {
      var st = S(), p = st && st.actionPlan;
      if (!p || p.v !== 1) return;
      if (!p.agreedAt) p.agreedAt = Date.now();
      var pn = G('persistNow'); if (pn) pn();
    } catch (e) {}
  }
  function planAgreed(plan) {
    if (!plan) return false;
    if (plan.agreedAt) return true;
    // A day already held for this plan IS the agreement: a day record can only
    // exist past the logic page, so an agreement lost to a crash is recovered
    // from the records instead of being asked for twice.
    try {
      var recs = (S() || {}).dayRecords || {};
      for (var k in recs) {
        if (Object.prototype.hasOwnProperty.call(recs, k) &&
            recs[k] && recs[k].starHash && recs[k].starHash === plan.starHash) return true;
      }
    } catch (e) {}
    return false;
  }

  // ---------------------------------------------------------------------------
  // THE RESUME POINT (the resume law, v764: a relaunch lands on the same spot
  // or a step BEHIND, never ahead).
  //
  //   no plan                  -> intent. This covers three states on purpose:
  //                               nothing started, refine abandoned halfway,
  //                               and a generation killed mid-flight. Nothing
  //                               persists an in-flight marker, so those three
  //                               are indistinguishable from the outside, and
  //                               the only honest answer is the furthest-back
  //                               one. Their refine answers are still stored,
  //                               so nothing they typed is lost.
  //   plan, never agreed to    -> THE LOGIC page. The plan landed while they
  //                               were away from it; the agreement was never
  //                               given, so it is asked for now.
  //   plan, agreed             -> THE DAY. Rest days and a closed day are the
  //                               day screen's own states, it renders them.
  // ---------------------------------------------------------------------------
  function resumePoint() {
    var plan = livePlan();
    if (!plan) return 'intent';
    return planAgreed(plan) ? 'day' : 'logic';
  }

  function start(opts) {
    opts = opts || {};
    // Every real entry point comes through here, so the gate lives here too: no
    // caller can forget it. Probes and the cheat bar pass skipGate.
    // The retry after the First 7 Days beat re-enters through the PUBLIC start,
    // not this closure: the router wraps ActionFlow.start to learn a screen
    // opened, and a private call would open the flow behind its back.
    if (!opts.skipGate && gateBlocks(function () {
      var pub = (window.ActionFlow && window.ActionFlow.start) || start;
      pub(opts);
    })) return null;
    var star = liveStar();
    if (!star) return null;                 // no star, no plan: Clarity comes first
    try { if (typeof Analytics !== 'undefined' && Analytics.track) Analytics.track('action_start'); } catch (e) {}
    // Where they ARE, remembered the way every other module remembers it, so a
    // refresh reopens the flow and resumePoint decides the screen again.
    try { var rv2 = G('rememberView'); if (rv2) rv2('action'); } catch (e) {}
    var routed = resolveBucket();
    var ctx = { star: star, shape: liveShape(), bucket: routed.bucket };

    function toIntent() {
      openIntent(null, { intake: realIntake(ctx), onConfirm: function () { setTimeout(toNote, 420); } });
    }
    function toNote() { openNote(NOTE_LINE, { onDone: toRefine }); }
    function toRefine() {
      openRefine(null, {
        bucket: routed.qset,
        intake: realIntake(ctx),
        onDone: function (answers) {
          // THE HARVEST BECOMES STATE, then the baseline becomes the first
          // pulse. Both before the loading screen opens, so the generator reads
          // a store that is already complete.
          writeRefineStore(routed.bucket, routed.variant, answers);
          var base = baselineFrom(answers);
          if (base) pulseBaseline(base.value);
          setTimeout(toLoading, 320);
        }
      });
    }
    function toLoading() {
      openLoading(null, {
        real: true,
        intake: realIntake(ctx),
        onLanded: function (plan) {
          // the AI's target is in now, so a baseline that had nothing to
          // measure against at refine time finally lands (see pulseBaseline).
          try {
            var st = S();
            var held = st && st.actionRefine && st.actionRefine.baseline;
            var gp = st && st.goalProgress;
            if (held != null && gp && gp.target !== null && gp.current === null) pulseBaseline(held);
          } catch (e) {}
          ActionFlow._plan = plan;
        },
        onOpen: toLogic
      });
    }
    function toLogic() {
      openLogic(null, { onAgree: function () { markAgreed(); setTimeout(toDay, 320); } });
    }
    function toDay() { openDay(null, {}); }

    var from = opts.from || resumePoint();
    if (from === 'refine') return toRefine();
    if (from === 'loading') return toLoading();
    if (from === 'logic') return toLogic();
    if (from === 'day') return toDay();
    return toIntent();
  }

  // ===========================================================================
  // DEV: walk all five screens against a fixture. URL-gated affordances only;
  // nothing here runs unless it is called. The fixture plan is passed
  // EXPLICITLY from here on: the surfaces now prefer the person's real plan,
  // so a demo that did not name its plan would render theirs.
  // ===========================================================================
  function demo(key, from) {
    key = FIXTURES[key] ? key : 'weight';
    var fxPlan = FIXTURES[key].plan;
    var order = ['intent', 'note', 'refine', 'loading', 'logic', 'day'];
    var at = Math.max(0, order.indexOf(from || 'intent'));
    function step(n) {
      var name = order[n];
      if (name === 'intent') return openIntent(key, { onConfirm: function () { setTimeout(function () { step(1); }, 420); } });
      if (name === 'note') return openNote(NOTE_LINE, { onDone: function () { step(2); } });
      if (name === 'refine') return openRefine(key, { onDone: function () { step(3); } });
      if (name === 'loading') return openLoading(key, { onOpen: function () { step(4); } });
      if (name === 'logic') return openLogic(key, { plan: fxPlan, onAgree: function () { setTimeout(function () { step(5); }, 320); } });
      return openDay(key, { plan: fxPlan });
    }
    return step(at);
  }

  var ActionFlow = {
    // WO-2 (wave 1): the home door's route into the ONE completion pipeline,
    // and the shared tombstoned undo it pairs with. js/08 consumes these.
    completeFromHome: completeFromHome,
    undoTodayData: undoDayData,
    openIntent: openIntent,
    openNote: openNote,
    openRefine: openRefine,
    openLoading: openLoading,
    openClarityAsk: openClarityAsk,
    openLogic: openLogic,
    openDay: openDay,
    close: destroy,
    // THE REAL WALK. Every entry point calls this (phase 3.1): the bottom bar's
    // [Do], the sidebar, the router, the boot restore, and every remaining
    // ActionExperience.open() caller via the redirect below.
    start: start,
    demo: demo,
    resumePoint: resumePoint,
    markAgreed: markAgreed,
    planAgreed: planAgreed,
    legacyRedirect: true,
    fixtures: FIXTURES,
    questions: QUESTIONS,
    // the data half, exported so the wiring phase and the probes can reach the
    // writers without going through a screen
    resolveBucket: resolveBucket,
    writeRefineStore: writeRefineStore,
    // THE CHECK-IN RHYTHM SEAM (v3.1). setCadencePref({kind, days}) is what a
    // settings surface calls to change how often Memento asks; it writes the
    // refine store and the live plan together and persists. cadencePref() reads
    // what is honoured right now. Kinds: daily | every-other | twice-week |
    // weekly | custom (custom needs days, 0=Sunday). Documented in
    // ACTION-PLAN-SCHEMA.md.
    setCadencePref: function (pref) { return applyCadencePref(pref); },
    cadencePref: livePref,
    CADENCE_CHIPS: CADENCE_CHIPS,
    baselineFrom: baselineFrom,
    pulseBaseline: pulseBaseline,
    writeDayClose: writeDayClose,
    closeDedupeKey: closeDedupeKey,
    livePlan: livePlan,
    clarityTime: getClarityTimeAnswer,
    _holdMs: 0,
    _longWait: false,
    _lastEqCheck: true,
    _lastDayRecord: null,
    _lastClose: null,
    _lastReport: null,
    _plan: null,
    get isOpen() { return !!root; }
  };
  window.ActionFlow = ActionFlow;

  // ===========================================================================
  // 3.1  THE OLD DOOR  (merge phase 3.1, entry wiring)
  // The named entry points are wired directly (js/09's [Do] slot, the sidebar,
  // the command palette, the boot restore; js/15's #action route). But
  // ActionExperience.open() is still called from a dozen everyday surfaces that
  // belong to other files this phase (the home Today card's "Build my plan",
  // the pillar tap, the module faces, the widget tiles, the sheet nav), and the
  // brief for phase 3.1 is that the old module is reachable from NO primary
  // path. So the door itself is re-pointed, here, in this module's own file:
  // one wrapper, the old code untouched underneath it.
  //
  //   - the old open stays as ActionExperience.openLegacy() (the retirement
  //     brief and the dev state browser need it),
  //   - ?dev=action-states still gets the OLD module, because that browser
  //     exists to render the old module's states (3.3 updates it),
  //   - kill switch: ActionFlow.legacyRedirect = false before the first tap,
  //     or delete this block. Nothing else changes.
  //
  // The gate is NOT re-run here: start() runs it, and it is the same gate the
  // old open ran, so the wall, the First 7 Days beat and the paywall behave
  // exactly as before.
  // ===========================================================================
  (function installOldDoorRedirect() {
    try {
      if (typeof ActionExperience === 'undefined' || !ActionExperience) return;
      if (ActionExperience.openLegacy) return;              // already installed
      var legacy = ActionExperience.open;
      if (typeof legacy !== 'function') return;
      ActionExperience.openLegacy = function () { return legacy.apply(ActionExperience, arguments); };
      ActionExperience.open = function () {
        var devStates = false;
        try { devStates = /[?&]dev=action-states\b/.test(location.search); } catch (e) {}
        if (ActionFlow.legacyRedirect && !devStates) return ActionFlow.start();
        return legacy.apply(ActionExperience, arguments);
      };
    } catch (e) {}
  })();
})();
