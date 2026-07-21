/* Memento module: demo mode + backend
   Extracted from app.js lines 22931-23523. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   DEMO MODE (sales / screenshots / testing)
   ------------------------------------------------------------------
   Open with ?demo=1 (or ?demo=creator | founder | student) to populate a
   realistic, screenshot-worthy state WITHOUT touching real data. DEMO_MODE
   blocks all persistence while it is on, so localStorage is never written.
   Exit by reloading without the query (the Exit pill does this).
   TO REMOVE BEFORE PRODUCTION: delete this block, the two `if (DEMO_MODE)
   return;` lines in persistState/persistNow, the `let DEMO_MODE` declaration,
   and the applyDemoModeIfRequested() call in INIT.
   ============================================ */
function _demoISO(daysAgo) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return localISO(d); }
function _demoHuman(daysAgo, opts) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' }); }
const DEMO_PERSONAS = {
  creator: {
    name: 'Jordan', birthYear: 2002,
    neutronStar: 'Grow my channel to 100k subscribers by shipping one video a week I am proud of',
    coreWhy: 'I want to build something that is mine and reach the people who needed to hear it, the way other creators did for me.',
    antiVision: 'Another year of half finished drafts while everyone else posts and I keep overthinking.',
    futureVision: 'A channel that pays my rent and a body of work I can point to.',
    identityLine: 'I am someone who ships, every single week.',
    tensionLine: 'This was never about going viral. It is about no longer feeling invisible.',
    action: {
      title: 'Write the first draft of this week\'s video script',
      why: 'The script is the bottleneck. Everything downstream gets easier the moment it exists.',
      howToStart: 'Open a blank doc and write the worst possible opening line. Momentum beats quality on the first pass.',
      recommendedWhy: 'Enough to break the bottleneck without burning out.',
      tiers: { tiny: 'Write the first three sentences of the script', light: 'Outline the video in five bullets', moderate: 'Write the first draft of this week\'s video script', heavy: 'Draft the script and record a rough voiceover', extreme: 'Draft, record, and rough cut the full video' },
      path: [{ horizon: 'This week', milestone: 'Ship video one' }, { horizon: 'Month 1', milestone: 'Four videos live, find your format' }, { horizon: 'Month 3', milestone: 'First video past 10k views' }, { horizon: 'Month 12', milestone: '100k subscribers' }],
      linkedProjectId: 'pj_c1', linkedMilestoneId: 'ms_c1b',
      projects: [
        { id: 'pj_c1', title: 'Build a repeatable video engine', why: 'Consistency beats intensity. A system I can run every single week.', goalLinked: true, milestones: [
          { id: 'ms_c1a', title: 'Lock a format I can repeat weekly', horizon: 'This week', done: true },
          { id: 'ms_c1b', title: 'Batch-script four videos ahead', horizon: 'Month 1', done: false },
          { id: 'ms_c1c', title: 'Hold a fixed upload day for a month', horizon: 'Month 1', done: false },
          { id: 'ms_c1d', title: 'First video past 10k views', horizon: 'Month 3', done: false } ] },
        { id: 'pj_c2', title: 'Grow the audience', why: '', goalLinked: true, milestones: [
          { id: 'ms_c2a', title: 'Write hooks that earn the first 30 seconds', horizon: 'This week', done: true },
          { id: 'ms_c2b', title: 'Crack a thumbnail formula that gets clicks', horizon: 'Month 1', done: true },
          { id: 'ms_c2c', title: 'Land one collaboration', horizon: 'Month 3', done: false },
          { id: 'ms_c2d', title: 'Cross 100k subscribers', horizon: 'Month 12', done: false } ] } ]
    },
    reflections: ['Posted late but I posted. That is the streak that matters.', 'I keep editing to avoid scripting. Scripting is the work.', 'Best video yet came from the roughest first draft. Trust the process.'],
    distractions: [['Phone', 'Opened analytics instead of writing'], ['Rabbit hole', 'Forty minutes researching cameras I will not buy']],
    vivere: {
      memories: [
        { text: 'Walked to the corner store at golden hour and the whole street was orange. Stood there a second.', category: 'beauty', mood: 'calm', age: 2 },
        { text: 'Called my mom for no reason. We laughed about nothing for twenty minutes.', category: 'connection', mood: 'warm', person: 'Mom', age: 6 },
        { text: 'Closed the laptop and just played guitar badly for an hour. Felt like a kid again.', category: 'play', mood: 'joy', age: 12 },
        { text: 'A stranger told me one of my videos got them through a rough week. I sat with that.', category: 'meaning', mood: 'moved', age: 26 }
      ],
      alive: [
        ['Film one video outside, somewhere I have never been', 'month'],
        ['Have a real dinner with friends, no phones', 'week'],
        ['Learn to actually cook one dish well', 'season'],
        ['See the northern lights once', 'life']
      ],
      categories: { connection: 4, beauty: 5, play: 3, awe: 1, peace: 2, body: 3, meaning: 2, novelty: 2 }
    }
  },
  founder: {
    name: 'Sam', birthYear: 1998,
    neutronStar: 'Get my product to 100 paying users who would be genuinely upset if it disappeared',
    coreWhy: 'I want to build something people need and own my time instead of renting it out to someone else\'s dream.',
    antiVision: 'Another year of building in the dark, polishing features nobody asked for, calling it progress.',
    futureVision: 'A product that grows while I sleep and a small team I trust.',
    identityLine: 'I talk to users every day and ship every week.',
    tensionLine: 'The real fear: building for a year and finding no one would miss it.',
    action: {
      title: 'Talk to three users about why they signed up',
      why: 'You are guessing until you hear it in their words. Three conversations beat a week of building.',
      howToStart: 'Send one message right now to the last person who signed up. Just ask what made them try it.',
      recommendedWhy: 'Three is enough to see the pattern without stalling the build.',
      tiers: { tiny: 'Message one user a single question', light: 'Message three users to set up calls', moderate: 'Talk to three users about why they signed up', heavy: 'Run three user calls and write up the patterns', extreme: 'Run three calls and ship one fix the same day' },
      path: [{ horizon: 'This week', milestone: 'Ten honest conversations' }, { horizon: 'Month 1', milestone: 'First 10 paying users' }, { horizon: 'Month 3', milestone: 'Ramen profitable' }, { horizon: 'Month 9', milestone: '100 users who would miss it' }],
      linkedProjectId: 'pj_f1', linkedMilestoneId: 'ms_f1b',
      projects: [
        { id: 'pj_f1', title: 'Find product-market fit', why: 'Nothing else matters until people would genuinely miss it.', goalLinked: true, milestones: [
          { id: 'ms_f1a', title: 'Ten honest customer conversations', horizon: 'This week', done: true },
          { id: 'ms_f1b', title: 'Ship the smallest useful version', horizon: 'Month 1', done: false },
          { id: 'ms_f1c', title: 'First 10 paying users', horizon: 'Month 3', done: false },
          { id: 'ms_f1d', title: '100 users who would be upset if it vanished', horizon: 'Month 12', done: false } ] },
        { id: 'pj_f2', title: 'Reach ramen profitability', why: '', goalLinked: true, milestones: [
          { id: 'ms_f2a', title: 'Price the product and publish it', horizon: 'This week', done: false },
          { id: 'ms_f2b', title: 'First $1k revenue month', horizon: 'Month 3', done: false },
          { id: 'ms_f2c', title: 'Cut burn so revenue covers costs', horizon: 'Month 6', done: false } ] } ]
    },
    reflections: ['Shipped the thing I was scared to ship. Nobody died.', 'Every user call kills a feature I was about to waste a week on.', 'Stopped building for a day to sell. Best day of the month.'],
    distractions: [['Rabbit hole', 'Redesigned the logo instead of emailing users'], ['Phone', 'Twitter for an hour calling it research']],
    vivere: {
      memories: [
        { text: 'Took the long way home along the water. Did not check Slack once.', category: 'peace', mood: 'calm', age: 3 },
        { text: 'A user emailed just to say thank you. Printed it and put it on the wall.', category: 'meaning', mood: 'moved', person: 'a user', age: 9 },
        { text: 'Pickup basketball with people half my skill. Lost badly, laughed the whole time.', category: 'play', mood: 'joy', age: 16 },
        { text: 'Lay on the roof and watched the stars come out. The product can wait one night.', category: 'awe', mood: 'alive', age: 31 }
      ],
      alive: [
        ['Take a full weekend off, completely', 'week'],
        ['Visit a city I have never been to', 'season'],
        ['Have people over for dinner I actually cook', 'month'],
        ['Learn to surf', 'life']
      ],
      categories: { connection: 3, beauty: 2, play: 3, awe: 2, peace: 4, body: 2, meaning: 3, novelty: 1 }
    }
  },
  student: {
    name: 'Alex', birthYear: 2005,
    neutronStar: 'Finish this semester with a 3.8 and a body I am proud of',
    coreWhy: 'I am tired of being the person who knows what to do and does none of it. I want to prove I can keep a promise to myself.',
    antiVision: 'Another semester of cramming, all nighters, and swearing next time will be different.',
    futureVision: 'Calm mornings, grades that open doors, and actually feeling in control of my days.',
    identityLine: 'I do the work before it is due.',
    tensionLine: 'This was never about the grades. It is about trusting yourself to keep a promise.',
    action: {
      title: 'Do tomorrow\'s reading before tonight',
      why: 'Getting ahead by one day removes the panic that wrecks everything else.',
      howToStart: 'Put the textbook on your desk and read one page. One page usually turns into ten.',
      recommendedWhy: 'A full chapter is the sweet spot of ahead without overwhelm.',
      tiers: { tiny: 'Read one page', light: 'Read for ten focused minutes', moderate: 'Do tomorrow\'s reading before tonight', heavy: 'Do the reading and the practice problems', extreme: 'Reading, problems, and a summary sheet for the exam' },
      path: [{ horizon: 'This week', milestone: 'One day ahead in every class' }, { horizon: 'Month 1', milestone: 'No all nighters' }, { horizon: 'Midterms', milestone: 'Walk in calm and ready' }, { horizon: 'Semester', milestone: '3.8 and a routine that holds' }],
      linkedProjectId: 'pj_s1', linkedMilestoneId: 'ms_s1b',
      projects: [
        { id: 'pj_s1', title: 'Get ahead and stay ahead', why: 'Calm comes from being prepared, not from cramming.', goalLinked: true, milestones: [
          { id: 'ms_s1a', title: 'One day ahead in every class', horizon: 'This week', done: true },
          { id: 'ms_s1b', title: 'A full month with no all-nighters', horizon: 'Month 1', done: false },
          { id: 'ms_s1c', title: 'Walk into midterms calm and ready', horizon: 'Month 3', done: false },
          { id: 'ms_s1d', title: 'Finish at 3.8 with a routine that holds', horizon: 'Month 12', done: false } ] },
        { id: 'pj_s2', title: 'Protect my energy', why: '', goalLinked: true, milestones: [
          { id: 'ms_s2a', title: 'A fixed sleep and wake time', horizon: 'This week', done: true },
          { id: 'ms_s2b', title: 'Phone out of the room while studying', horizon: 'Month 1', done: false },
          { id: 'ms_s2c', title: 'Workout three times a week', horizon: 'Month 3', done: false } ] } ]
    },
    reflections: ['Did the reading early and the lecture finally made sense.', 'Phone in another room equals double the focus. Every time.', 'One day ahead changes my whole mood. Protect that.'],
    distractions: [['Phone', 'TikTok in bed instead of the reading'], ['Other', 'Cleaned my whole room to avoid studying']],
    vivere: {
      memories: [
        { text: 'Ate lunch on the quad in the sun with no phone. Just watched people for a while.', category: 'peace', mood: 'calm', age: 2 },
        { text: 'Texted an old friend I had been meaning to. We are getting coffee Friday.', category: 'connection', mood: 'warm', person: 'an old friend', age: 7 },
        { text: 'Ran until the city lights came on. Felt strong for the first time in a while.', category: 'body', mood: 'alive', age: 14 },
        { text: 'Looked up and the moon was huge and orange. Stopped walking to look.', category: 'awe', mood: 'moved', age: 29 }
      ],
      alive: [
        ['Go to one event on campus that scares me a little', 'week'],
        ['Cook a real meal instead of ordering', 'week'],
        ['Take a weekend trip with friends', 'season'],
        ['Study abroad somewhere', 'life']
      ],
      categories: { connection: 3, beauty: 2, play: 2, awe: 2, peace: 4, body: 4, meaning: 1, novelty: 2 }
    }
  },

  // ── v774 (Malik): six more personas, broad to niche, machine-consistent to
  //    barely-started, so the app can be seen through very different lives.
  //    `pattern` drives the activity shape in buildDemoState. No vivere:
  //    the vision board is deprioritized; the builder defaults it empty.
  runner: {
    name: 'Maya', birthYear: 1996, pattern: 'machine',
    neutronStar: 'Run the Chicago Marathon in under 4 hours this October',
    coreWhy: 'I spent my twenties saying I was not a runner. I want to find out who I am when I stop saying that.',
    antiVision: 'Another year of January gym memberships that die by March.',
    futureVision: 'Crossing the line with my dad screaming my name, knowing I earned every mile.',
    identityLine: 'I train when it rains.',
    tensionLine: 'This was never about the medal. It is about becoming someone who follows through.',
    action: {
      title: 'Run today\'s scheduled miles before work',
      why: 'The plan only works if the miles happen. Morning miles cannot be stolen by the day.',
      howToStart: 'Put on the shoes and stand outside. The first minute decides the run.',
      recommendedWhy: 'Enough volume to build the base without inviting injury.',
      tiers: { tiny: 'Walk one mile', light: 'Run an easy 2 miles', moderate: 'Run today\'s scheduled miles before work', heavy: 'Scheduled miles plus strides', extreme: 'Scheduled miles plus strength work' },
      path: [{ horizon: 'This week', milestone: 'Hit every scheduled run' }, { horizon: 'Month 1', milestone: 'First 30-mile week' }, { horizon: 'Month 3', milestone: 'Half marathon under 1:55' }, { horizon: 'October', milestone: 'Chicago under 4:00' }],
      linkedProjectId: 'pj_r1', linkedMilestoneId: 'ms_r1b',
      projects: [
        { id: 'pj_r1', title: 'Build the aerobic base', why: 'The race is won in the boring weeks.', goalLinked: true, milestones: [
          { id: 'ms_r1a', title: 'Four runs a week, four weeks straight', horizon: 'Month 1', done: true },
          { id: 'ms_r1b', title: 'First 30-mile week', horizon: 'Month 1', done: false },
          { id: 'ms_r1c', title: 'Half marathon under 1:55', horizon: 'Month 3', done: false } ] } ]
    },
    reflections: ['Legs said no, calendar said yes. Calendar won.', 'Slow run today but I was out there. That is the whole game.', 'Skipped Friday, felt it all weekend. The streak protects me.'],
    distractions: [['Snooze', 'Reset the alarm twice and lost the morning window'], ['Weather app', 'Spent ten minutes deciding if it was too cold instead of running']]
  },
  writer: {
    name: 'June', birthYear: 1988, pattern: 'streaky',
    neutronStar: 'Finish the 80,000 word first draft of my novel by New Year\'s Eve',
    coreWhy: 'I have told people I am writing a book for six years. I want it to stop being a lie.',
    antiVision: 'Being seventy with the same three chapters in a drawer.',
    futureVision: 'Typing THE END, printing the stack, and handing it to my sister to read first.',
    identityLine: 'I write before I judge.',
    tensionLine: 'This was never about publishing. It is about keeping the oldest promise I ever made myself.',
    action: {
      title: 'Write 500 words on the draft',
      why: '500 words a day finishes the book with weeks to spare. Zero words a day never does.',
      howToStart: 'Reread only the last paragraph, then keep the cursor moving for ten minutes.',
      recommendedWhy: 'Small enough to do tired, big enough to matter.',
      tiers: { tiny: 'Write one sentence', light: 'Write 200 words', moderate: 'Write 500 words on the draft', heavy: 'Write 1,000 words', extreme: 'Write a full scene, however long it runs' },
      path: [{ horizon: 'This week', milestone: '3,500 new words' }, { horizon: 'Month 1', milestone: 'Act one complete' }, { horizon: 'Month 3', milestone: '50,000 words' }, { horizon: 'Dec 31', milestone: '80,000 words, THE END' }],
      linkedProjectId: 'pj_w1', linkedMilestoneId: 'ms_w1a',
      projects: [
        { id: 'pj_w1', title: 'Draft the novel', why: 'A finished bad draft beats a perfect idea.', goalLinked: true, milestones: [
          { id: 'ms_w1a', title: 'Act one complete', horizon: 'Month 1', done: false },
          { id: 'ms_w1b', title: '50,000 words', horizon: 'Month 3', done: false },
          { id: 'ms_w1c', title: 'Full draft, 80,000 words', horizon: 'Dec 31', done: false } ] } ]
    },
    reflections: ['Wrote garbage today. Wrote, though.', 'Two weeks off and the book felt like a stranger. Never again.', 'The scene finally cracked open at word 400. It always cracks after 400.'],
    distractions: [['Research hole', 'Ninety minutes on 1920s train schedules for one sentence'], ['Rereading', 'Polished chapter two again instead of drafting chapter nine']]
  },
  barber: {
    name: 'Marcus', birthYear: 1991, pattern: 'steady',
    neutronStar: 'Get the shop to $10k a month so I can hire a second chair',
    coreWhy: 'My name is on the window. I want the business to feed my family, not just my pride.',
    antiVision: 'Grinding alone in the chair for ten more years with nothing that runs without me.',
    futureVision: 'Walking in on my day off and the shop is full, running, and mine.',
    identityLine: 'I work on the shop, not just in it.',
    tensionLine: 'This was never about haircuts. It is about building something my kids can point to.',
    action: {
      title: 'Book five rebookings before close',
      why: 'Rebooked clients are the difference between a busy week and a predictable month.',
      howToStart: 'Ask the next client in the chair, "Same time in three weeks?" That is it.',
      recommendedWhy: 'Five a day fills next month without feeling like selling.',
      tiers: { tiny: 'Ask one client to rebook', light: 'Ask three clients', moderate: 'Book five rebookings before close', heavy: 'Five rebookings plus post one cut to the page', extreme: 'Rebookings, content, and message five cold leads' },
      path: [{ horizon: 'This week', milestone: '25 rebookings on the books' }, { horizon: 'Month 1', milestone: '70% rebook rate' }, { horizon: 'Month 3', milestone: 'First $10k month' }, { horizon: 'Month 6', milestone: 'Second chair hired' }],
      linkedProjectId: 'pj_b1', linkedMilestoneId: 'ms_b1b',
      projects: [
        { id: 'pj_b1', title: 'Make revenue predictable', why: 'A hire needs a floor, not a hot streak.', goalLinked: true, milestones: [
          { id: 'ms_b1a', title: '70% of clients rebook before leaving', horizon: 'Month 1', done: true },
          { id: 'ms_b1b', title: 'First $10k month', horizon: 'Month 3', done: false },
          { id: 'ms_b1c', title: 'Second chair hired and booked', horizon: 'Month 6', done: false } ] } ]
    },
    reflections: ['Slow Tuesday but every client left with a next appointment. That is the system working.', 'Raised prices $5 and nobody blinked. I waited two years for nothing.', 'The page brought in three new heads this week. Content is a chair that never sleeps.'],
    distractions: [['Shop talk', 'Forty-five minutes debating the game instead of posting the cut'], ['Supplier rabbit hole', 'Comparing clipper brands I am not buying this month']]
  },
  coder: {
    name: 'Priya', birthYear: 1999, pattern: 'sparse',
    neutronStar: 'Land my first software engineering job by March',
    coreWhy: 'I taught myself to code at night for two years. I want the badge that says it counted.',
    antiVision: 'Still explaining the gap in my resume at thirty, still "almost ready" to apply.',
    futureVision: 'Slacking my mom a photo of my first-day desk badge.',
    identityLine: 'I ship small things daily.',
    tensionLine: 'This was never about the salary. It is about proving the night hours were real.',
    action: {
      title: 'Send two tailored applications',
      why: 'Interviews are a numbers game played with quality bullets. Two a day compounds fast.',
      howToStart: 'Open the tracker, pick the top two roles, rewrite the first resume line for each.',
      recommendedWhy: 'Two tailored beats ten sprayed.',
      tiers: { tiny: 'Save three roles to the tracker', light: 'Send one tailored application', moderate: 'Send two tailored applications', heavy: 'Two applications plus one LeetCode medium', extreme: 'Applications, LeetCode, and one cold DM to an engineer' },
      path: [{ horizon: 'This week', milestone: '10 applications out' }, { horizon: 'Month 1', milestone: 'First phone screen' }, { horizon: 'Month 2', milestone: 'Three onsites' }, { horizon: 'March', milestone: 'Signed offer' }],
      linkedProjectId: 'pj_p1', linkedMilestoneId: 'ms_p1a',
      projects: [
        { id: 'pj_p1', title: 'Run the job search like a pipeline', why: 'Panic-applying is not a strategy. A pipeline is.', goalLinked: true, milestones: [
          { id: 'ms_p1a', title: 'First phone screen', horizon: 'Month 1', done: false },
          { id: 'ms_p1b', title: 'Three onsites in one month', horizon: 'Month 2', done: false },
          { id: 'ms_p1c', title: 'Signed offer', horizon: 'March', done: false } ] } ]
    },
    reflections: ['Skipped four days and the fear got loud again. Doing the thing is the only thing that quiets it.', 'Recruiter replied to the tailored one. Never the sprayed ones. Noted.', 'One rejection stung all afternoon. Sent two more anyway.'],
    distractions: [['Doomscroll', 'An hour of layoff threads that helped nobody'], ['Tutorial trap', 'Started a new course instead of applying with what I know']]
  },
  musician: {
    name: 'Theo', birthYear: 2003, pattern: 'fresh',
    neutronStar: 'Release my first 5-track EP and play it live by summer',
    coreWhy: 'I have 40 unfinished loops and zero released songs. Finishing is the whole mountain.',
    antiVision: 'Being the guy who "makes beats" forever and never has a single thing to show.',
    futureVision: 'Five songs with my name on them, played loud in a room of people who came on purpose.',
    identityLine: 'I finish tracks, not loops.',
    tensionLine: 'This was never about streams. It is about hearing something through to done.',
    action: {
      title: 'One hour on the current track, arrangement first',
      why: 'Loops die in the first eight bars. Arrangement is where songs are born.',
      howToStart: 'Open the session, mute nothing, and extend the timeline past two minutes.',
      recommendedWhy: 'An hour of arrangement moves a track more than a day of sound design.',
      tiers: { tiny: 'Open the session and listen through once', light: '25 minutes on arrangement', moderate: 'One hour on the current track, arrangement first', heavy: 'Two hours, arrangement then mix notes', extreme: 'Finish the arrangement end to end tonight' },
      path: [{ horizon: 'This week', milestone: 'Track one arranged' }, { horizon: 'Month 1', milestone: 'Two tracks fully mixed' }, { horizon: 'Month 3', milestone: 'EP mastered' }, { horizon: 'Summer', milestone: 'Release + first live set' }],
      linkedProjectId: 'pj_t1', linkedMilestoneId: 'ms_t1a',
      projects: [
        { id: 'pj_t1', title: 'Finish the EP', why: 'Done songs teach more than perfect loops.', goalLinked: true, milestones: [
          { id: 'ms_t1a', title: 'Track one arranged end to end', horizon: 'This week', done: false },
          { id: 'ms_t1b', title: 'Two tracks fully mixed', horizon: 'Month 1', done: false },
          { id: 'ms_t1c', title: 'EP mastered and scheduled', horizon: 'Month 3', done: false } ] } ]
    },
    reflections: ['Day two. The loop finally became a first verse.', 'Almost started a new idea tonight. Closed the tab. The EP is the idea.'],
    distractions: [['Plugin store', 'Browsed synths for an hour instead of arranging'], ['New loop', 'Made a fresh 8 bars instead of finishing track one']]
  },
  teacher: {
    name: 'Rosa', birthYear: 1979, pattern: 'steady',
    neutronStar: 'Lose 35 pounds by my daughter\'s graduation in May',
    coreWhy: 'I want to be in the photos that day, not hiding from them, and I want the energy to enjoy what comes after.',
    antiVision: 'Another year of starting Monday and quitting Thursday, watching my health drift.',
    futureVision: 'Walking into that graduation light, strong, and proud in the front row.',
    identityLine: 'I keep promises to my body.',
    tensionLine: 'This was never about a number. It is about being there, fully, for the years ahead.',
    action: {
      title: 'Log every meal and walk 8,000 steps',
      why: 'Awareness plus movement is the whole engine. Everything else is noise.',
      howToStart: 'Log breakfast the moment it is on the plate. The first log makes the rest honest.',
      recommendedWhy: 'Sustainable beats dramatic. This works on tired days.',
      tiers: { tiny: 'Log one meal', light: 'Log meals only', moderate: 'Log every meal and walk 8,000 steps', heavy: 'Logs, steps, and a strength session', extreme: 'Full day on plan plus meal prep for tomorrow' },
      path: [{ horizon: 'This week', milestone: 'Seven honest days of logs' }, { horizon: 'Month 1', milestone: 'First 8 pounds' }, { horizon: 'Month 3', milestone: 'Halfway, 18 pounds' }, { horizon: 'May', milestone: '35 down at graduation' }],
      linkedProjectId: 'pj_ro1', linkedMilestoneId: 'ms_ro1a',
      projects: [
        { id: 'pj_ro1', title: 'Rebuild the daily defaults', why: 'Willpower runs out. Defaults do not.', goalLinked: true, milestones: [
          { id: 'ms_ro1a', title: 'First 8 pounds', horizon: 'Month 1', done: true },
          { id: 'ms_ro1b', title: 'Halfway point, 18 pounds', horizon: 'Month 3', done: false },
          { id: 'ms_ro1c', title: '35 pounds by graduation', horizon: 'May', done: false } ] } ]
    },
    reflections: ['Faculty potluck and I logged it anyway. Honesty is the diet.', 'Walked the track while the kids ran drills. Steps are everywhere when you look.', 'Down a size. Bought nothing. The graduation dress is the prize.'],
    distractions: [['Grading spiral', 'Graded until ten and skipped the walk'], ['Snack drawer', 'The break room donuts won round one, not round two']]
  },
};

function buildDemoState(personaKey) {
  const p = DEMO_PERSONAS[personaKey] || DEMO_PERSONAS.creator;
  // v774 (Malik): each persona carries its own activity SHAPE, so the previews
  // show very different lives: machine-consistent, steady, streaky bursts,
  // sparse and drifting, or a brand-new three-day start.
  const PATTERNS = {
    steady: [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 24, 25],
    machine: Array.from({ length: 34 }, (_, d) => d).filter(d => d % 11 !== 7),
    streaky: [0, 1, 2, 3, 4, 5, 11, 12, 13, 14, 22, 23, 24, 25, 26, 33, 34, 35],
    sparse: [0, 3, 9, 15, 16, 24, 31, 40],
    fresh: [0, 1, 2]
  };
  const activeDays = PATTERNS[p.pattern] || PATTERNS.steady;
  let streakHistory = activeDays.map(_demoISO).sort();
  // Seed the personal-record fields from the longest run already in the demo
  // history, so opening the demo does not fire a spurious "new record" moment
  // (a genuine record still fires when the user backfills a gap to beat it).
  let _demoBest = (function () {
    const nums = activeDays.map(d => Math.floor(Date.parse(_demoISO(d) + 'T00:00:00Z') / 86400000)).sort((a, b) => a - b);
    let lo = 0, run = 0, prev = null;
    nums.forEach(n => { if (prev !== null && n - prev === 1) run += 1; else run = 1; if (run > lo) lo = run; prev = n; });
    return lo;
  })();
  const tierCycle = ['moderate', 'light', 'moderate', 'heavy', 'tiny', 'moderate', 'light', 'moderate', 'heavy', 'moderate', 'light', 'moderate'];
  let completionHistory = activeDays.slice(0, 12).map((d, i) => {
    const tier = tierCycle[i % tierCycle.length];
    return { date: new Date(Date.now() - d * 86400000).toISOString(), tier, actionText: p.action.tiers[tier] || p.action.title, planTitle: p.action.title };
  }).reverse();
  const dwMins = [45, 60, 30, 90, 50, 40, 75, 55, 60, 35];
  let deepwork = [1, 2, 3, 5, 6, 8, 9, 11, 13, 15].map((d, i) => ({ date: _demoHuman(d), iso: _demoISO(d), minutes: dwMins[i] }));
  let reflections = p.reflections.map((t, i) => ({ date: _demoHuman(i * 3, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), iso: _demoISO(i * 3), text: t }));
  const distractions = p.distractions.map((c, i) => ({ category: c[0], note: c[1], date: _demoISO(i * 2), time: _demoHuman(i * 2, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · 2:14 PM' }));

  // FOUNDER DEMO: a full year of believable, mostly-consistent use so the
  // heatmap (and every module) reads like the app has been lived in for ~12
  // months. Not perfect: natural rest days, two lighter stretches, and varied
  // daily intensity built from real sources, so heatmap cells span level 1-4.
  // (Daily heat = how many sources land on a day: streak=1, action=2, deep
  // work=3, reflection=4. See buildConsistencyData.)
  if (personaKey === 'founder') {
    const yStreak = [], yComp = [], yDeep = [], yRefl = [];
    const reflPool = [
      'Shipped the thing I was scared to ship. Nobody died.',
      'Every user call kills a feature I was about to waste a week on.',
      'Stopped building for a day to sell. Best day of the month.',
      'Said no to a shiny idea and stayed on the one that matters.',
      'Talked to a user and it reframed the whole roadmap.',
      'Small release, but it went out. Momentum over perfection.',
      'Cut a feature today. The product got lighter and so did I.',
      'Wrote the hard email first. The day got easier after that.',
      'Closed the laptop on time and the work was still there, fine.',
      'Fixed the thing one user kept hitting. Better than any launch.',
      'Protected the morning for deep work. Everything fit around it.',
      'Reminded myself: 100 users who would miss it, nothing else.'
    ];
    const fTiers = ['tiny', 'light', 'moderate', 'moderate', 'heavy', 'moderate', 'light', 'heavy', 'moderate'];
    // Deterministic pseudo-random so the demo looks the same every load.
    const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let d = 364; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 86400000);
      const iso = localISO(dt);
      const dow = dt.getUTCDay();
      let activeProb = 0.82;
      if (d < 50) activeProb = 0.9;        // denser in the last ~7 weeks
      if (dow === 0) activeProb -= 0.35;   // most Sundays off
      if (d >= 198 && d <= 212) activeProb -= 0.55; // a lighter stretch (recovery)
      if (d >= 96 && d <= 104) activeProb -= 0.5;   // a short trip
      if (d <= 5) activeProb = 1.5;        // guarantee a strong current streak
      if (rnd(d + 1) > activeProb) continue; // rest day
      yStreak.push(iso);
      const r2 = rnd(d * 7 + 3);
      let lvl = r2 < 0.18 ? 1 : r2 < 0.55 ? 2 : r2 < 0.85 ? 3 : 4;
      if (d < 50 && lvl < 2) lvl = 2;      // recent weeks rarely a bare check-in
      if (lvl >= 2) {
        const tier = fTiers[d % fTiers.length];
        yComp.push({ date: dt.toISOString(), tier, actionText: p.action.tiers[tier] || p.action.title, planTitle: p.action.title });
      }
      if (lvl >= 3) yDeep.push({ date: _demoHuman(d), iso, minutes: 30 + ((d * 5) % 75) });
      if (lvl >= 4) yRefl.push({ date: _demoHuman(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), iso, text: reflPool[d % reflPool.length] });
    }
    streakHistory = yStreak.slice().sort();   // ascending (oldest first)
    completionHistory = yComp;                 // already oldest -> newest
    deepwork = yDeep;
    reflections = yRefl.slice().reverse();     // newest first, like the base demo
    _demoBest = (function () {
      const nums = yStreak.map(s => Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000)).sort((a, b) => a - b);
      let lo = 0, run = 0, prev = null;
      nums.forEach(n => { if (prev !== null && n - prev === 1) run += 1; else run = 1; if (run > lo) lo = run; prev = n; });
      return lo;
    })();
  }

  // ---- Memento Vivere demo state (believable, derived from the persona) ----
  const _pv = p.vivere || { memories: [], alive: [], categories: {} };
  // Same month+day, one year back: feeds the On This Day anniversary demo.
  const _vivDemoYearAgo = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.getTime(); })();
  const vivMemories = (_pv.memories || []).map((m, i) => ({
    id: 'demoviv_m' + i,
    iso: _demoISO(m.age != null ? m.age : (i * 5)),
    text: m.text,
    category: m.category || '',
    mood: m.mood || '',
    person: m.person || '',
    place: m.place || '',
    media: []
  }));
  const vivAlive = (_pv.alive || []).map((a, i) => ({
    id: 'demoviv_a' + i,
    text: a[0],
    horizon: a[1] || 'month',
    done: i === 1 // one already crossed off so the list reads as lived-in
  }));
  // Today's practice: shown as already lived today, with a saved moment, so the
  // demo dashboard + home anchor read as populated and warm.
  const vivPick = vivPickForDay(_demoISO(0));
  const vivToday = { date: _demoISO(0), prompt: vivPick.prompt, category: vivPick.category, done: true, note: '', media: [] };
  // Vivere proofEvents on the demo active days so the Proof Trail + Momentum show
  // lived moments alongside actions/deep work. iso-only is enough for the trail.
  const vivProofDays = [0, 2, 5, 9, 14];
  const vivProof = vivProofDays.map((d, i) => {
    const cat = VIVERE_CATEGORIES[i % VIVERE_CATEGORIES.length];
    const pool = VIVERE_PROMPTS[cat] || [];
    return {
      id: 'demoviv_pe' + i,
      type: 'vivere',
      iso: _demoISO(d),
      ts: Date.now() - d * 86400000,
      title: 'Lived moment',
      text: pool.length ? pool[i % pool.length] : 'a moment worth keeping',
      module: 'vivere',
      tags: [cat],
      metadata: { category: cat, mood: '', people: '', mediaCount: 0 }
    };
  });
  // v23 Check-in demo seed: a believable last few days (today included) so the
  // dashboard widget and sheet read lived-in.
  const demoBlockers = ['', 'Too many meetings before noon', '', 'Kept checking the phone', ''];
  const demoCheckins = [4, 3, 2, 1, 0].map((d, i) => ({
    iso: _demoISO(d),
    ts: Date.now() - d * 86400000,
    mood: [3, 4, 3, 4, 4][i],
    energy: [3, 4, 2, 4, 4][i],
    blocker: demoBlockers[i],
    note: ''
  }));
  const overrides = {
    profile: { name: p.name, onboarded: true, onboardedAt: new Date().toISOString() },
    dev: { previewAll: true }, // unlock every module so the demo dashboard looks full
    prefs: { unlockAll: true }, // demos always bypass the unlock ladder
    // Demos simulate someone who already bought: mark them paid so the post-Clarity
    // paywall never appears (a persona is supposed to be a full, owned account).
    entitlements: { isPaid: true, paidAt: new Date().toISOString(), plan: 'demo' },
    checkins: demoCheckins,
    clarity: { completed: true, completedAt: new Date().toISOString(), answers: { neutronStar: p.neutronStar, coreWhy: p.coreWhy, whyItMatters: p.coreWhy, antiVision: p.antiVision, futureVision: p.futureVision, identityLine: p.identityLine, tensionLine: p.tensionLine || '', timeHorizon: '12 months', dailyTime: 90, intensity: 'heavy' } },
    action: { viewMode: 'vine', introSeen: true, intake: { completed: true }, planGenerated: true, planSourceNeutronStar: p.neutronStar, selectedTier: 'moderate', lastGeneratedAt: new Date().toISOString(), primaryAction: { title: p.action.title, why: p.action.why, howToStart: p.action.howToStart, recommendedTier: 'moderate', recommendedWhy: p.action.recommendedWhy, tiers: p.action.tiers, path: p.action.path, linkedProjectId: p.action.linkedProjectId || '', linkedMilestoneId: p.action.linkedMilestoneId || '' }, projects: p.action.projects || [], completionHistory: completionHistory },
    streak: { history: streakHistory, bestEver: _demoBest, bestEverShown: _demoBest },
    deepwork: { sessions: deepwork },
    reflection: { entries: reflections, trash: [], folders: [], activeFolder: null, disp: { font: 'system', surface: 'glass' } },
    distraction: { logs: distractions },
    inbox: [
      { id: 'ib_demo1', text: 'Realized I think best on long walks, protect that time', ts: Date.now() - 9000000, iso: getTodayISO() },
      { id: 'ib_demo2', text: 'Call an old friend this weekend', ts: Date.now() - 5400000, iso: getTodayISO() },
      { id: 'ib_demo3', text: 'Got distracted by the group chat for 40 minutes again', ts: Date.now() - 3600000, iso: getTodayISO() },
      { id: 'ib_demo4', text: 'Shipped the first rough draft today', ts: Date.now() - 1200000, iso: getTodayISO() }
    ],
    people: [
      { id: 'pp_demo1', name: 'Mom', cadenceDays: 7, lastContactISO: localISO(new Date(Date.now() - 9 * 86400000)), notes: 'Call on Sundays. She loves the channel updates.' },
      { id: 'pp_demo2', name: 'Sam, my mentor', cadenceDays: 30, lastContactISO: localISO(new Date(Date.now() - 41 * 86400000)), notes: 'Owe him an update on the 100k goal.' },
      { id: 'pp_demo3', name: 'Chris (old roommate)', cadenceDays: 60, lastContactISO: localISO(new Date(Date.now() - 18 * 86400000)), notes: '' }
    ],
    mori: { birthYear: p.birthYear, lifeExpectancy: 80, screenTimeHours: 3, reminderText: 'Make it count.' },
    vivere: {
      today: vivToday,
      memories: vivMemories,
      aliveList: vivAlive,
      categories: Object.assign({ connection: 0, beauty: 0, play: 0, awe: 0, peace: 0, body: 0, meaning: 0, novelty: 0 }, _pv.categories || {}),
      weeklyReviews: [],
      resurfacedMemoryIds: [],
      viewTab: 'canvas',
      canvas: {
        nextZ: 8,
        view: { panX: 0, panY: 0, zoom: 1 },
        cards: [
          // dc1 carries a Lived stamp from exactly one year ago today, so the
          // On This Day overlay has a real anniversary to resurface in demos.
          { id: 'dc1', type: 'note', x: 980, y: 560, w: 240, h: 130, z: 1, text: (_pv.memories && _pv.memories[0] ? _pv.memories[0].text : 'A moment worth keeping.'), title: '', url: '', dataURL: '', createdAt: Date.now() - 420 * 86400000, lived: true, livedAt: _vivDemoYearAgo },
          { id: 'dc2', type: 'note', x: 1300, y: 480, w: 220, h: 120, z: 2, text: (p.futureVision || 'The life I am building toward.'), title: '', url: '', dataURL: '', createdAt: Date.now() - 300 * 86400000 },
          { id: 'dc3', type: 'note', x: 1280, y: 720, w: 220, h: 120, z: 3, text: (_pv.alive && _pv.alive[0] ? _pv.alive[0][0] : 'One thing I want to do while alive.'), title: '', url: '', dataURL: '', createdAt: Date.now() - 200 * 86400000, lived: true, livedAt: Date.now() - 19 * 86400000 },
          { id: 'dc4', type: 'note', x: 700, y: 760, w: 220, h: 120, z: 4, text: (p.identityLine || 'Who I am becoming.'), title: '', url: '', dataURL: '', createdAt: Date.now() - 150 * 86400000 },
          { id: 'dc5', type: 'quote', x: 640, y: 450, w: 270, h: 180, z: 5, text: 'The days are long, but the years are short.', attribution: 'Gretchen Rubin', qstyle: 'light', title: '', url: '', dataURL: '', createdAt: Date.now() - 90 * 86400000 },
          { id: 'dc6', type: 'video', x: 1600, y: 620, w: 300, h: 215, z: 6, videoId: 'jfKfPfyJRdk', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', title: 'lofi hip hop radio, beats to relax to', text: '', dataURL: '', createdAt: Date.now() - 30 * 86400000 },
          { id: 'dc7', type: 'link', x: 1610, y: 480, w: 260, h: 84, z: 7, url: 'https://www.nationalgeographic.com/travel', title: 'Places worth seeing', text: '', dataURL: '', createdAt: Date.now() - 60 * 86400000 }
        ],
        links: [ { id: 'dl1', from: 'dc1', to: 'dc2' }, { id: 'dl2', from: 'dc2', to: 'dc3' }, { id: 'dl3', from: 'dc1', to: 'dc4' } ]
      }
    },
    lifestats: { sleep: 4, diet: 3, exercise: 4, mood: 4, stress: 3, focus: 4, history: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((d, i) => { const dt = new Date(Date.now() - d * 86400000); const w = [3, 4, 2, 4, 5, 3, 4, 5, 4, 3, 4]; return { date: localISO(dt), sleep: w[i], exercise: ((i * 3) % 5) + 1, diet: ((i * 2) % 4) + 1, mood: ((i + 2) % 5) + 1, stress: ((i * 2 + 1) % 5) + 1, focus: ((i + 1) % 5) + 1 }; }) },
    meta: { onboarded: true, welcomeSeen: true, lastVisit: _demoISO(0) },
    ui: { lastView: null },
    // Seed Vivere proof events so the Proof Trail and Momentum reflect lived
    // moments (the demo path does not run the derive migration, so set directly).
    proofEvents: vivProof
  };
  return deepMerge(DEFAULT_STATE, overrides);
}
function _injectDemoBar(persona) {
  // The demo persona switcher lives INSIDE the Cheat Code Bar (a dev-only panel)
  // so it is hidden from real users and disappears entirely when the cheat bar
  // is removed for shipping. No more floating bar.
  const oldFloat = document.getElementById('demoBar');
  if (oldFloat) oldFloat.remove();
  const mount = () => {
    const actions = document.getElementById('creatorBoxActions');
    if (!actions) return false;
    if (document.getElementById('demoPersonaRow')) return true;
    const row = document.createElement('div');
    row.id = 'demoPersonaRow';
    row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;width:100%;margin-top:8px;padding-top:8px;border-top:1px solid rgba(var(--ink),0.10);';
    const mk = (k, label) => '<button data-demo="' + k + '" class="creator-box__btn' + (k === persona ? ' creator-box__btn--primary' : '') + '" style="flex:0 0 auto;">' + label + '</button>';
    row.innerHTML = '<span style="display:inline-flex;align-items:center;gap:5px;font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-right:2px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--success-soft);box-shadow:0 0 8px var(--success-soft);"></span>Demo</span>' +
      mk('creator', 'Creator') + mk('founder', 'Founder') + mk('student', 'Student') +
      mk('runner', 'Runner') + mk('writer', 'Writer') + mk('barber', 'Barber') +
      mk('coder', 'Job hunt') + mk('musician', 'Musician') + mk('teacher', 'Teacher') +
      '<button id="demoExit" class="creator-box__btn creator-box__btn--danger" style="flex:0 0 auto;">Exit demo</button>';
    actions.appendChild(row);
    // Re-tapping the persona you are ALREADY in must still do something visible:
    // assigning an identical location.search can read as a silent no-op (Malik
    // v684, stuck re-tapping Founder), so force a clean reload in that case.
    row.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
      const k = b.getAttribute('data-demo');
      if (new RegExp('[?&]demo=' + k + '(&|$)').test(location.search)) location.reload();
      else location.search = '?demo=' + k;
    }));
    const ex = document.getElementById('demoExit');
    if (ex) ex.addEventListener('click', () => { location.href = location.pathname; });
    return true;
  };
  if (mount()) return;
  let tries = 0;
  const iv = setInterval(() => { if (mount() || ++tries > 20) clearInterval(iv); }, 100);
}
function applyDemoModeIfRequested() {
  const m = /[?&]demo=([a-z0-9]+)/i.exec(location.search);
  if (!m) return;
  DEMO_MODE = true;
  const raw = (m[1] || '').toLowerCase();
  const persona = DEMO_PERSONAS[raw] ? raw : 'creator';
  try { state = buildDemoState(persona); } catch (e) { DEMO_MODE = false; return; }
  // A demo boot is a FRESH look at the persona, always land on the Today home.
  // recallView() prefers localStorage('memento_view'), which SURVIVES the reload
  // into ?demo=, so a remembered 'tab:profile' (Malik had just been in Settings)
  // was force-switching every demo boot onto the You panel 50ms after landing
  // (v684, his recording). Clear the remembered view before init restores it.
  try { localStorage.setItem('memento_view', ''); } catch (e) {}
  try { if (state.ui) state.ui.lastView = null; } catch (e) {}
  try { if (typeof recalculateStreak === 'function') recalculateStreak(); } catch (e) {}
  // Demo opens at a settled state: align the record baseline to the seeded best
  // and drop any one-shot record flag, so the calm "new record" moment only ever
  // appears when the user actively backfills a gap to beat it during the demo.
  try { if (state.streak) { state.streak.bestEverShown = Math.max(state.streak.bestEverShown || 0, state.streak.count || 0, state.streak.bestEver || 0); state.streak._recordJustHit = null; } } catch (e) {}
  _injectDemoBar(persona);
  // Demo-only debug bridge (gated behind ?demo=, never present for real users).
  // Lets the preview harness simulate a fall-off gap so Comeback Mode can be
  // screenshotted. Mutates only the demo in-memory state; DEMO_MODE blocks all
  // persistence so real data is never touched. Remove with the demo block.
  try {
    window.__comebackDebug = {
      simulateGap: function (days) {
        const d = (days == null ? 3 : days) * 86400000;
        const shift = (iso) => { if (!iso || typeof iso !== 'string') return iso; const t = new Date(iso).getTime(); return isNaN(t) ? iso : new Date(t - d).toISOString(); };
        const ch = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
        ch.forEach(e => { if (e && e.date) e.date = shift(e.date); });
        if (state.streak) {
          if (state.streak.lastCheckDate) state.streak.lastCheckDate = (shift(state.streak.lastCheckDate) || '').slice(0, 10);
          if (Array.isArray(state.streak.history)) state.streak.history = state.streak.history.map(h => (shift(h + 'T00:00:00Z') || '').slice(0, 10));
        }
        if (state.meta) state.meta.lastVisit = (shift(state.meta.lastVisit + 'T00:00:00Z') || '').slice(0, 10);
        renderAll();
        return { gapDays: comebackGapDays(), isGap: isComebackGap(), historyLen: (state.streak && state.streak.history || []).length };
      },
      read: function () {
        return {
          gapDays: comebackGapDays(),
          isGap: isComebackGap(),
          lastComp: (state.action.completionHistory || []).slice(-1)[0] && (state.action.completionHistory || []).slice(-1)[0].date,
          lastCheck: state.streak.lastCheckDate,
          historyLen: (state.streak && state.streak.history || []).length,
          selectedTier: state.action && state.action.selectedTier,
          comeback: state.comeback || null
        };
      },
      // Read-only QA helper: serialized copies of the two protected arrays so a
      // harness can prove Comeback Mode never mutates them. Demo-gated only.
      snapshotArrays: function () {
        return {
          completionHistory: JSON.stringify((state.action && state.action.completionHistory) || []),
          streakHistory: JSON.stringify((state.streak && state.streak.history) || [])
        };
      },
      // Demo-gated verification helpers for the Consistency module work.
      stats: function () {
        var s = (typeof consistencyStats === 'function') ? consistencyStats() : {};
        return { current: s.current, longest: s.longest, totalActiveDays: s.totalActiveDays, thisWeek: s.thisWeek, lastWeek: s.lastWeek, bestEver: (state.streak && state.streak.bestEver), recordShown: (state.streak && state.streak.bestEverShown), recordPending: (state.streak && state.streak._recordJustHit) || null };
      },
      openStreak: function () {
        try { if (state.introsSeen) state.introsSeen.streak = true; } catch (e) {}
        try { Sheet.open('streak'); } catch (e) { return 'err:' + e.message; }
        return { open: Sheet.isOpen, widget: Sheet.currentWidget };
      },
      // Mirrors the calendar/heatmap day toggle (same write path) for QA, then
      // re-renders the open streak sheet so a record moment can be screenshotted.
      toggleDay: function (date) {
        var today = (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10);
        if (!date || date > today) return 'future/invalid';
        if (state.streak.history.includes(date)) state.streak.history = state.streak.history.filter(function (d) { return d !== date; });
        else { state.streak.history.push(date); state.streak.history.sort(); }
        if (state.streak.history.length > 400) state.streak.history = state.streak.history.slice(-400);
        recalculateStreak();
        renderAll();
        try { if (Sheet.isOpen && Sheet.currentWidget === 'streak') { Sheet.body.innerHTML = SHEET_TEMPLATES.streak.render(); SHEET_TEMPLATES.streak.bind(Sheet.body); } } catch (e) {}
        return this.stats();
      }
    };
  } catch (e) {}
}

/* ============================================
   BACKEND (optional, offline-safe, demo-guarded)
   Wires memento-v19 to memento-backend.py for accounts, cloud sync, and the
   live "people showed up today" counter. Every call is DEMO_MODE-guarded,
   short-timeout, try/catch wrapped, and never blocks or breaks the UI: if the
   backend is unreachable (Mac asleep / offline), the app behaves exactly as a
   pure-local build. BASE is relative, so it works when the python server
   serves the app and the API from one origin. To point at a hosted backend
   later, set Backend.BASE to that origin.
   ============================================ */
const Backend = {
  BASE: '',
  TIMEOUT: 4000,
  _pushTimer: null,
  token() { try { return localStorage.getItem('memento_token') || ''; } catch (_) { return ''; } },
  email() { try { return localStorage.getItem('memento_email') || ''; } catch (_) { return ''; } },
  isLoggedIn() { return !!this.token(); },
  _setSession(token, name, email) {
    try {
      if (token) localStorage.setItem('memento_token', token);
      if (name != null) localStorage.setItem('memento_name', name);
      if (email != null) localStorage.setItem('memento_email', email);
    } catch (_) {}
  },
  _clearSession() {
    try {
      localStorage.removeItem('memento_token');
      localStorage.removeItem('memento_name');
      localStorage.removeItem('memento_email');
    } catch (_) {}
  },
  // Core fetch: aborts on timeout, returns parsed JSON or null on any failure.
  async _req(path, opts) {
    if (DEMO_MODE) return null;
    opts = opts || {};
    const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, this.TIMEOUT) : null;
    try {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      const tok = this.token();
      if (tok && opts.auth !== false) headers['Authorization'] = 'Bearer ' + tok;
      const res = await fetch(this.BASE + path, {
        method: opts.method || 'GET',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ctrl ? ctrl.signal : undefined
      });
      let data = null;
      try { data = await res.json(); } catch (_) {}
      return { ok: res.ok, status: res.status, data: data };
    } catch (_) {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  },
  // Sign up a brand-new account, seed it with this device's current state.
  async signup(email, password, name) {
    const r = await this._req('/api/signup', { method: 'POST', auth: false, body: { email, password, name } });
    if (!r) return { ok: false, error: 'Could not reach the backend. Is it running?' };
    if (!r.ok) return { ok: false, error: (r.data && r.data.error) || 'Sign up failed.' };
    this._setSession(r.data.token, r.data.name || name || '', email);
    this.pushState(true); // seed the server with what is already on this device
    return { ok: true };
  },
  // Log in. If the account already holds onboarded data, adopt it (you are
  // restoring an account); otherwise seed the empty account with local data.
  async login(email, password) {
    const r = await this._req('/api/login', { method: 'POST', auth: false, body: { email, password } });
    if (!r) return { ok: false, error: 'Could not reach the backend. Is it running?' };
    if (!r.ok) return { ok: false, error: (r.data && r.data.error) || 'Wrong email or password.' };
    this._setSession(r.data.token, r.data.name || '', email);
    const srv = r.data.state;
    try {
      const localFresh = !(state.profile && state.profile.onboarded);
      if (localFresh && srv && srv.profile && srv.profile.onboarded) {
        state = deepMerge(state, srv); // fresh device: restore the account onto it
        try { migrateState(); } catch (e) {} // normalize an older-schema server payload, like file-import does
        persistNow();
      } else {
        this.pushState(true); // this device already has data (or the account is empty): local wins, back it up
      }
    } catch (_) {}
    return { ok: true };
  },
  async logout() {
    await this._req('/api/logout', { method: 'POST' });
    this._clearSession();
    return { ok: true };
  },
  // Debounced cloud-sync write. immediate=true flushes now (used right after
  // signup/login so the first sync is not lost if the tab closes).
  pushState(immediate) {
    if (DEMO_MODE || !this.isLoggedIn()) return;
    const doPush = () => { this._req('/api/state', { method: 'PUT', body: { state: stripInlineMediaForSync(state) } }); };
    clearTimeout(this._pushTimer);
    if (immediate) { doPush(); return; }
    this._pushTimer = setTimeout(doPush, 1500);
  },
  // Drain the local feedback queue to the backend (anon allowed). Anything that
  // fails stays queued and retries next boot; email is the manual fallback.
  sendFeedbackQueue() {
    if (DEMO_MODE) return;
    try {
      if (!state.support || !Array.isArray(state.support.feedbackQueue)) return;
      // Only 'queued' items drain; mark 'sending' first so an overlapping drain
      // (submit during boot, double-click) never POSTs the same item twice.
      const pending = state.support.feedbackQueue.filter(x => x && x.status === 'queued');
      if (!pending.length) return;
      pending.forEach(item => {
        item.status = 'sending';
        this._req('/api/feedback', { method: 'POST', auth: false, body: { kind: item.kind, text: item.text, ts: item.ts, email: (state.support.contacts && state.support.contacts.email) || '' } })
          .then(r => {
            if (r && r.ok) { item.status = 'sent'; state.support.feedbackQueue = state.support.feedbackQueue.filter(x => x.status !== 'sent'); }
            else { item.status = 'queued'; }
            try { persistNow(); } catch (e) {}
          })
          .catch(() => { item.status = 'queued'; });
      });
    } catch (e) {}
  },
  // Count today's completion across all users; cache + refresh the home line.
  async complete(day) {
    if (DEMO_MODE || !this.isLoggedIn()) return;
    const r = await this._req('/api/complete', { method: 'POST', body: { day: day || getTodayISO() } });
    if (r && r.ok && r.data && typeof r.data.count === 'number') {
      try { if (!state.meta) state.meta = {}; state.meta.todayCount = r.data.count; } catch (_) {}
      this._refreshCount();
    }
  },
  // No-auth public counter, fetched on boot so the home line is warm.
  async todayCount() {
    if (DEMO_MODE) return;
    const r = await this._req('/api/today-count', { auth: false });
    if (r && r.ok && r.data && typeof r.data.count === 'number') {
      try { if (!state.meta) state.meta = {}; state.meta.todayCount = r.data.count; } catch (_) {}
      this._refreshCount();
    }
  },
  _refreshCount() {
    try {
      const cc = document.getElementById('commandCenter');
      if (cc && typeof renderCommandCenter === 'function') {
        cc.innerHTML = renderCommandCenter();
        if (typeof bindCommandCenter === 'function') bindCommandCenter(cc);
      }
    } catch (_) {}
  },
  // Boot hook. Deliberately NEVER overwrites local state: it only warms the
  // public counter and, if logged in, backs this device's data up to the
  // server. Restoring an account onto a device is an explicit action (login),
  // never something boot does silently, so local data can never be clobbered
  // by a stale server copy on a reload.
  async boot() {
    if (DEMO_MODE) return;
    try { this.todayCount(); } catch (_) {}
    try { this.sendFeedbackQueue(); } catch (_) {}
    if (!this.isLoggedIn()) return;
    try { this.pushState(true); } catch (_) {}
  }
};
