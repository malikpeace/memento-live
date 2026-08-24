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
// The app's OWN star hash (js/30 liveStarHash, FNV-1a). The persona's plan,
// goal progress and day records must all key to the same value or the new
// Action flow treats the plan as belonging to a retired goal and hides it.
function _demoStarHash(star) {
  var h = 2166136261, t = String(star || '');
  for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
function _demoHuman(daysAgo, opts) { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' }); }
const DEMO_PERSONAS = {
  creator: {
    name: 'Jordan', birthYear: 2002, pattern: 'streaky',
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
    name: 'Sam', pattern: 'machine', birthYear: 1998,
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
    name: 'Alex', birthYear: 2005, pattern: 'comeback',
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
    name: 'Maya', birthYear: 1996, pattern: 'training',
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
    vivere: {
      memories: [
        { text: 'Ran through the park at 6am and the fog was sitting on the water. Nobody else out there.', category: 'beauty', mood: 'calm', age: 3 },
        { text: 'Dad texted a photo of his old race bib. Said he kept it for thirty years.', category: 'connection', mood: 'warm', person: 'Dad', age: 9 },
        { text: 'Finished the long run and sat on the curb laughing at nothing.', category: 'body', mood: 'joy', age: 16 }
      ],
      alive: [['Run a race in a city I have never been to', 'season'], ['Swim in open water once', 'year'], ['Watch a sunrise from the top of something', 'life']]
    },
    reflections: ['Legs said no, calendar said yes. Calendar won.', 'Slow run today but I was out there. That is the whole game.', 'Skipped Friday, felt it all weekend. The streak protects me.'],
    distractions: [['Snooze', 'Reset the alarm twice and lost the morning window'], ['Weather app', 'Spent ten minutes deciding if it was too cold instead of running']]
  },
  writer: {
    name: 'June', birthYear: 1988, pattern: 'comeback',
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
    vivere: {
      memories: [
        { text: 'Wrote in the cafe until they turned the chairs up. Forgot to check my phone once.', category: 'meaning', mood: 'absorbed', age: 4 },
        { text: 'Read a paragraph out loud to Nadia and she went quiet. That quiet was the whole afternoon.', category: 'connection', mood: 'moved', person: 'Nadia', age: 11 },
        { text: 'Walked home in the rain with no umbrella and did not mind at all.', category: 'beauty', mood: 'calm', age: 22 }
      ],
      alive: [['Finish a draft and print it, just to hold it', 'season'], ['Write a week somewhere with no wifi', 'year'], ['See my name on a spine', 'life']]
    },
    reflections: ['Wrote garbage today. Wrote, though.', 'Two weeks off and the book felt like a stranger. Never again.', 'The scene finally cracked open at word 400. It always cracks after 400.'],
    distractions: [['Research hole', 'Ninety minutes on 1920s train schedules for one sentence'], ['Rereading', 'Polished chapter two again instead of drafting chapter nine']]
  },
  barber: {
    name: 'Marcus', birthYear: 1991, pattern: 'weekend',
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
    vivere: {
      memories: [
        { text: 'Kid sat in my chair terrified and left grinning at himself in the mirror.', category: 'meaning', mood: 'proud', age: 2 },
        { text: 'Closed early, drove out with Elena, ate on the hood of the car.', category: 'connection', mood: 'warm', person: 'Elena', age: 13 },
        { text: 'Shop was full and the music was right and nobody was in a hurry.', category: 'peace', mood: 'content', age: 20 }
      ],
      alive: [['Take a Sunday off with no guilt', 'week'], ['Teach someone the fade properly', 'season'], ['Own the building one day', 'life']]
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
    vivere: {
      memories: [
        { text: 'Fixed the bug at 1am and actually said yes out loud to an empty room.', category: 'play', mood: 'triumphant', age: 5 },
        { text: 'Amma told her whole prayer group I build apps. I did not correct her.', category: 'connection', mood: 'warm', person: 'Amma', age: 12 },
        { text: 'Walked to the store just to move and the air was cold and good.', category: 'body', mood: 'calm', age: 25 }
      ],
      alive: [['Send one application without rewriting it five times', 'week'], ['Build something a stranger uses', 'season'], ['Move my parents somewhere quieter', 'life']]
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
    vivere: {
      memories: [
        { text: 'Played the riff back and it sounded like a real song for the first time.', category: 'meaning', mood: 'stunned', age: 1 },
        { text: 'Marco came over and we played badly for three hours and it was perfect.', category: 'play', mood: 'joy', person: 'Marco', age: 8 },
        { text: 'Sat on the fire escape with the guitar and did not record any of it.', category: 'peace', mood: 'calm', age: 18 }
      ],
      alive: [['Play one song in front of strangers', 'season'], ['Record with someone better than me', 'year'], ['Hear my music somewhere I did not put it', 'life']]
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
    vivere: {
      memories: [
        { text: 'Walked the whole lunch hour and came back to class actually awake.', category: 'body', mood: 'clear', age: 2 },
        { text: 'Maya sent the dress photo and I cried in the supply closet.', category: 'connection', mood: 'moved', person: 'Maya', age: 10 },
        { text: 'A student came back years later to say I mattered. Sat in my car after.', category: 'meaning', mood: 'humbled', age: 34 }
      ],
      alive: [['Dance at the wedding without sitting down', 'year'], ['Hike with Maya somewhere steep', 'season'], ['Grow old loud, not quiet', 'life']]
    },
    reflections: ['Faculty potluck and I logged it anyway. Honesty is the diet.', 'Walked the track while the kids ran drills. Steps are everywhere when you look.', 'Down a size. Bought nothing. The graduation dress is the prize.'],
    distractions: [['Grading spiral', 'Graded until ten and skipped the walk'], ['Snack drawer', 'The break room donuts won round one, not round two']]
  },
  screentime: {
    name: 'Nia', birthYear: 1997, pattern: 'streaky',
    neutronStar: 'Cut my screen time under 2 hours a day and get my evenings back',
    coreWhy: 'I am losing hours I will never see again to a machine I am not even enjoying, and I want my own attention back.',
    antiVision: 'Another year where every evening dissolves and I could not tell you into what.',
    futureVision: 'Evenings that feel long again. Finishing books. Being somewhere without checking anything.',
    identityLine: 'I decide what has my attention.',
    tensionLine: 'This was never about the phone. It is about being present for your own life.',
    action: {
      title: 'Put the phone on the kitchen charger for the night',
      why: 'The bedroom hour is the biggest single block, and it is the easiest one to end.',
      howToStart: 'Plug it in now, in the kitchen, before you sit down for the evening.',
      recommendedWhy: 'One protected hour is enough to feel the evening get longer, without white-knuckling the whole day.',
      tiers: { tiny: 'Phone face down for fifteen minutes', light: 'Thirty minutes in another room', moderate: 'Put the phone on the kitchen charger for the night', heavy: 'A phone-free evening from dinner onward', extreme: 'A full phone-free evening and morning' },
      path: [{ horizon: 'This week', milestone: 'The phone sleeps in the kitchen' }, { horizon: 'Month 1', milestone: 'Under three hours a day' }, { horizon: 'Month 3', milestone: 'Under two hours, most days' }, { horizon: 'Month 6', milestone: 'Evenings that feel long again' }],
      linkedProjectId: 'pj_st1', linkedMilestoneId: 'ms_st1b',
      projects: [
        { id: 'pj_st1', title: 'Take the evenings back', why: 'The evening is where the hours actually go.', goalLinked: true, milestones: [
          { id: 'ms_st1a', title: 'The phone charges outside the bedroom', horizon: 'This week', done: true },
          { id: 'ms_st1b', title: 'One phone-free hour every evening', horizon: 'Month 1', done: false },
          { id: 'ms_st1c', title: 'A whole weekend under two hours', horizon: 'Month 3', done: false },
          { id: 'ms_st1d', title: 'Under two hours as the normal day', horizon: 'Month 6', done: false } ] },
        { id: 'pj_st2', title: 'Fill the space with something real', why: '', goalLinked: true, milestones: [
          { id: 'ms_st2a', title: 'Finish one book', horizon: 'Month 1', done: true },
          { id: 'ms_st2b', title: 'One evening a week out of the house', horizon: 'Month 1', done: false },
          { id: 'ms_st2c', title: 'A hobby that needs both hands', horizon: 'Month 3', done: false },
          { id: 'ms_st2d', title: 'A weekend away with the phone in a drawer', horizon: 'Month 6', done: false } ] } ]
    },
    reflections: ['Left it in the kitchen and read for an hour. The evening was so much longer than I remembered.', 'Picked it up out of habit, put it down without unlocking. That is new.', 'Four hours today. Wrote it down anyway. Hiding the number is how the last attempt died.'],
    distractions: [['Instagram', 'Opened it in the middle of a conversation'], ['Bed scroll', 'Forty minutes I had already decided not to spend']],
    vivere: {
      memories: [
        { text: 'Read on the balcony until it got too dark to see the page. Did not check anything once.', category: 'peace', mood: 'calm', age: 3 },
        { text: 'Dinner with Rachel where neither of us touched a phone. Talked for three hours.', category: 'connection', mood: 'warm', person: 'Rachel', age: 9 },
        { text: 'Walked home the long way with no headphones. The city sounded different.', category: 'novelty', mood: 'awake', age: 17 },
        { text: 'Noticed I had not thought about my phone all afternoon. That used to be normal.', category: 'meaning', mood: 'moved', age: 24 }
      ],
      alive: [['Read twelve books this year', 'year'], ['One evening a week with no screen at all', 'week'], ['Learn to develop film', 'season'], ['A week somewhere with no signal', 'life']],
      categories: { connection: 4, beauty: 3, play: 2, awe: 1, peace: 5, body: 2, meaning: 3, novelty: 2 }
    }
  },
  weight: {
    name: 'Marcus', birthYear: 1988, pattern: 'steady',
    neutronStar: 'Lose 60 pounds and keep it off this time',
    coreWhy: 'I have three kids and I want to be the dad who plays, not the one who watches from the bench and says maybe later.',
    antiVision: 'Losing it again, gaining it again, and being fifty before I stop starting over.',
    futureVision: 'Keeping up with my kids without thinking about it, and clothes I do not have to plan around.',
    identityLine: 'I keep what I earn.',
    tensionLine: 'This was never about the weight. It is about being there for the parts you cannot get back.',
    action: {
      title: 'Walk for forty minutes after dinner',
      why: 'Evening is where every previous attempt fell apart, so that is where the plan lives.',
      howToStart: 'Shoes on and out the door before you sit down. The first two minutes are the whole fight.',
      recommendedWhy: 'Forty minutes clears the daily gap without needing a gym or a single free hour you do not have.',
      tiers: { tiny: 'Walk to the corner and back', light: 'A fifteen minute walk', moderate: 'Walk for forty minutes after dinner', heavy: 'Forty minutes plus the meal log done before eating', extreme: 'A full hour, logged, plus tomorrow’s lunch packed' },
      path: [{ horizon: 'This week', milestone: 'Five walks and every meal logged' }, { horizon: 'Month 1', milestone: 'Down 5 more, no diet started' }, { horizon: 'Month 3', milestone: 'Under 260 and still walking' }, { horizon: 'Month 12', milestone: '236 and it holds' }],
      linkedProjectId: 'pj_w1', linkedMilestoneId: 'ms_w1b',
      projects: [
        { id: 'pj_w1', title: 'A gap I can keep', why: 'The losing was never the problem. The keeping was.', goalLinked: true, milestones: [
          { id: 'ms_w1a', title: 'Thirty days of the walk, no exceptions', horizon: 'This week', done: true },
          { id: 'ms_w1b', title: 'Guess a day within 200 calories', horizon: 'Month 1', done: false },
          { id: 'ms_w1c', title: 'Under 260 pounds', horizon: 'Month 3', done: false },
          { id: 'ms_w1d', title: 'A full year without regaining', horizon: 'Month 12', done: false } ] },
        { id: 'pj_w2', title: 'Be in it with the kids', why: '', goalLinked: true, milestones: [
          { id: 'ms_w2a', title: 'Play a full game without sitting down', horizon: 'This week', done: true },
          { id: 'ms_w2b', title: 'Bike ride with all three, no stops', horizon: 'Month 1', done: true },
          { id: 'ms_w2c', title: 'Coach one season', horizon: 'Month 3', done: false },
          { id: 'ms_w2d', title: 'Hike the state park trail together', horizon: 'Month 12', done: false } ] } ]
    },
    reflections: ['Birthday party, ate the cake, logged the cake. Nothing to make up for tomorrow.', 'Twenty-five down and it has stayed down ten months. That has never happened before.', 'Skipped the walk twice this week. Not a spiral, just a fact. Back out tomorrow.'],
    distractions: [['Late night kitchen', 'Ate standing up without deciding to'], ['Drive-thru', 'Kids had practice, I had a burger I did not want']],
    vivere: {
      memories: [
        { text: 'Ran the whole soccer field with Eli and did not have to stop. He did not even notice. I did.', category: 'body', mood: 'proud', person: 'Eli', age: 5 },
        { text: 'Sat on the porch after the walk and watched it get dark. Nobody needed anything.', category: 'peace', mood: 'calm', age: 11 },
        { text: 'My daughter asked if I wanted to bike to the park instead of drive. I said yes without doing the math first.', category: 'connection', mood: 'warm', person: 'Ava', age: 19 },
        { text: 'Old jacket fit. Stood in the closet like an idiot for a minute.', category: 'meaning', mood: 'moved', age: 30 }
      ],
      alive: [['Coach one of their teams', 'year'], ['Bike to the park every Saturday', 'week'], ['Hike the state park trail with all three', 'season'], ['Dance at their weddings', 'life']],
      categories: { connection: 5, beauty: 2, play: 4, awe: 1, peace: 3, body: 5, meaning: 3, novelty: 1 }
    }
  },
};


/* ── v1280: PERSONA DEPTH (Malik: "make sure they have their own fake clarity
   session the AI can pull from, progress toward a goal, and different levels
   of consistency"). Three things per person, kept in one table so the persona
   objects above stay readable:
     voice     the diagnostic answers in THEIR words. buildProfileContext
               (js/03) reads exactly these fields, so the AI writes for this
               person instead of a generic user.
     progress  where they actually stand: baseline -> current -> target, in
               their own unit. Feeds goalProgress, the distance chip, the
               pace line and the finale.
     target    the Consistency bar they set for themselves, matched to how
               they really live (a 3x-a-week runner aims at ~45%, not 90%).
   Every value is fiction, written to be believable, never scraped. */
/* ── PER-PERSON LOGIC (v1286, Malik: "their own custom very in depth logic
   page inside of action as well as different weights of actions").
   This is what the Action logic page renders: the commitment, the arrow, the
   acts with their reasons, the refusals, the math, and the questions. Every
   number here is arithmetic on that persona's own progress numbers, so the
   page holds up when you read it. `sizes` is the weight ladder: a runner
   measures miles, a writer words, a barber cuts. Fiction, written to be
   believable, never scraped. */
const DEMO_LOGIC = {
  creator: {
    commitment: 'You said the week dies at the script, not the camera. So the plan aims there and nowhere else. One script gets written before anything else is touched.',
    arrow: { from: '8,400 subscribers', to: '100,000' },
    acts: [
      { role: 'star', text: 'Write the first draft of this week’s video script', reason: 'you said the script is the bottleneck and everything downstream waits on it', doneWhen: 'a full rough draft exists, bad is fine', starter: 'open a blank doc and write the worst opening line you can.' },
      { role: 'support', text: 'Draft the thumbnail while the script is still warm', reason: 'you said thumbnails get skipped when you are tired at the end' },
      { role: 'support', text: 'Analytics stay closed until the video is up', reason: 'you named opening analytics before noon as the thing that eats the morning' }
    ],
    noList: ['analytics before the work', 'buying gear you do not need yet', 'a new format every week'],
    nonNegotiables: { candidates: ['The script gets written before anything else', 'One video goes up every week, ready or not', 'Analytics stay closed until it is posted', 'Twenty minutes minimum on the worst days', 'No new gear until fifty videos are live', 'The upload day never moves'], chosen: [] },
    eq: {
      rows: [
        { label: 'Subscribers today', value: '8,400', source: 'said' },
        { label: 'Videos you shipped in 90 days', value: '11', source: 'said' },
        { label: 'Weeks in the year ahead', value: '52', source: 'fact' }
      ],
      compute: [{ expr: '(100000 - 8400) / 52', label: '91,600 more, spread over 52 videos', approx: 1761, shown: '≈ 1,760 each' }],
      result: { label: 'What one video has to earn', value: '≈ 1,760 subscribers' }
    },
    reasoning: [
      'That number is the honest one, and it is bigger than your average video today. It is not a verdict. It is the reason the plan is one video a week instead of one when it feels ready: you cannot find the format that earns 1,760 without shipping enough tries to learn what works.',
      'So the week has one job. The script exists by Wednesday, the thumbnail rides on its back while you still care, and the analytics tab stays shut until the thing is public. Do that fifty-two times and the format finds you. Skip the script and the whole week quietly disappears, which is exactly what the last three years looked like.'
    ],
    qas: [
      { q: 'Why the script and not the editing?', a: 'Editing is work you can always do. A script is the only part that cannot be borrowed, faked, or rushed at midnight. When it exists, the rest of the week is labour instead of a decision.' },
      { q: 'What if the video flops?', a: 'Then you learn something for 1,760 next time. A flop with a published link teaches more than a perfect draft in a private folder.' },
      { q: 'What does a normal day look like?', a: 'One move on the screen and a hold when it is done. Script days are heavier than thumbnail days, which is why the size ladder exists.' }
    ],
    sizes: { unit: 'min', ladder: [15, 30, 45, 60, 90], named: [30, 45, 60], estMinPerUnit: null, fmt: 'min' },
    close: { cadence: 'weekly', kind: 'num', prompt: 'Subscribers', unit: '', prefix: '', decimals: false, source: 'Asked once a week, after the upload.', choices: null, tail: 'today.' },
    checkpoint: 'four videos',
    sendWindow: 'morning',
    restLine: 'The script can wait until tomorrow. The week cannot.'
  },

  founder: {
    commitment: 'You said the product is fine and nobody knows it exists. So the plan is attention and conversations, not code. The scary half is the half that moves the number.',
    arrow: { from: '62 paying users', to: '100' },
    acts: [
      { role: 'star', text: 'Talk to three users about why they signed up', reason: 'you said you guess at what people want instead of asking', doneWhen: 'three real replies exist, not three sent messages', starter: 'send one message to the last person who signed up.' },
      { role: 'support', text: 'Rewrite one line of the pricing page like a human', reason: 'you said the churned user blamed onboarding, not price' },
      { role: 'support', text: 'No refactoring until the selling is done', reason: 'you named refactoring the admin panel as the avoidance' }
    ],
    noList: ['refactoring before selling', 'building for a user who has not asked', 'checking Stripe instead of talking to people'],
    nonNegotiables: { candidates: ['Three user conversations every week', 'Selling happens before building, every day', 'No new feature without a person who asked for it', 'One message minimum on the worst days', 'No refactoring the admin panel this quarter', 'The churn reason gets written down every time'], chosen: [] },
    eq: {
      rows: [
        { label: 'Paying users today', value: '62', source: 'said' },
        { label: 'Trials starting each week', value: '18', source: 'said' },
        { label: 'Trials that convert', value: '22%', source: 'estimate' }
      ],
      compute: [{ expr: '(100 - 62) / (18 * 0.22)', label: '38 more, at about 4 conversions a week', approx: 9.6, shown: '≈ 10 weeks' }],
      result: { label: 'Weeks to 100 at today’s rate', value: '≈ 10' }
    },
    reasoning: [
      'Ten weeks assumes nothing improves. It is the floor, not the forecast. Every conversation you have moves the 22% because you stop guessing what the onboarding breaks and start knowing it.',
      'That is why the daily move is talking to people and not shipping. Shipping feels like progress and produces a changelog. Conversations feel uncomfortable and produce the sentence that fixes the funnel. You already know which one you avoid.'
    ],
    qas: [
      { q: 'Why conversations instead of features?', a: 'Sixty-two people already paid you. They know exactly why they stayed and what nearly stopped them. That is the most valuable data you will ever get, and it costs a message.' },
      { q: 'What if nobody replies?', a: 'Then the message is the problem and you have learned something on day one. Rewrite it and send it to the next three.' },
      { q: 'When do I get to build again?', a: 'After the selling. Not instead of it. The plan does not ban building, it just refuses to let it go first.' }
    ],
    sizes: { unit: 'conversations', ladder: [1, 2, 3, 5], named: [1, 3, 5], estMinPerUnit: 20, fmt: 'plain' },
    close: { cadence: 'daily', kind: 'num', prompt: 'Paying users', unit: '', prefix: '', decimals: false, source: 'Asked once a day, whenever you check.', choices: null, tail: 'today.' },
    checkpoint: 'two weeks',
    sendWindow: 'morning',
    restLine: 'Nothing is on fire. See you tomorrow.'
  },

  student: {
    commitment: 'You said you know what to do and do none of it. So the plan does not teach you studying. It moves the work one day earlier, which is the only change that kills the panic.',
    arrow: { from: '3.55 GPA', to: '3.8 by finals' },
    acts: [
      { role: 'star', text: 'Do tomorrow’s reading before tonight', reason: 'you said the panic comes from being one day behind, every day', doneWhen: 'tomorrow’s pages are read, notes optional', starter: 'put the textbook on the desk and read one page.' },
      { role: 'support', text: 'Phone in the other room while you read', reason: 'you said you lose the hour without noticing' },
      { role: 'support', text: 'Same sleep and wake time, weekends included', reason: 'you said the all-nighters are what break the following week' }
    ],
    noList: ['all-nighters', 'starting an assignment the night it is due', 'studying with the phone on the desk'],
    nonNegotiables: { candidates: ['Tomorrow’s reading happens tonight', 'The phone is in another room while studying', 'Lights out at the same time, weekends included', 'Ten minutes minimum on dead days', 'No assignment started the night before', 'Sunday plans the week'], chosen: [] },
    eq: {
      rows: [
        { label: 'Your GPA right now', value: '3.55', source: 'said' },
        { label: 'Credits already banked', value: '48', source: 'said' },
        { label: 'Credits left this year', value: '30', source: 'said' }
      ],
      compute: [{ expr: '(3.8 * 78 - 3.55 * 48) / 30', label: 'What the remaining 30 credits must average', approx: 4.2, shown: '≈ 4.2' }],
      result: { label: 'The honest read', value: '3.8 needs a perfect year' }
    },
    reasoning: [
      'The math says something you did not want to hear: from 3.55 with 48 credits banked, a 3.8 overall needs better than a 4.0 on everything left. It is not reachable this year. It is reachable the year after, and the number that gets you there is the same number that gets you through this one.',
      'So Memento holds the real target and the real path at once. Be one day ahead in every class, sleep on a schedule, and let the grade be the result instead of the plan. The goal moves to a date the arithmetic allows, and nothing about today changes.'
    ],
    qas: [
      { q: 'So the goal is impossible?', a: 'This year, at 3.8 overall, yes. Memento will not pretend otherwise. The work is identical either way, which is why the daily move did not change.' },
      { q: 'Why reading and not practice problems?', a: 'Because reading is what you skip, and skipping it is what makes the problems take three hours instead of one.' },
      { q: 'What about the body half of the goal?', a: 'It is on the same clock. The sleep rule is doing double duty: it is the study plan and the training plan at the same time.' }
    ],
    sizes: { unit: 'min', ladder: [10, 25, 50, 75], named: [25, 50], estMinPerUnit: null, fmt: 'min' },
    close: { cadence: 'weekly', kind: 'num', prompt: 'GPA', unit: '', prefix: '', decimals: true, source: 'Asked when grades post.', choices: null, tail: 'right now.' },
    checkpoint: 'midterms',
    sendWindow: 'evening',
    restLine: 'Sleep is the assignment tonight.'
  },

  runner: {
    commitment: 'You said you run hard on good days and nothing on bad ones. A marathon does not care about good days. The plan trades intensity for a rhythm that survives a bad week.',
    arrow: { from: '5:00 marathon', to: 'under 4:00 in October' },
    acts: [
      { role: 'star', text: 'Run today’s prescribed miles at conversation pace', reason: 'you said every run turns into a race and then you need three days off', doneWhen: 'the distance happened, slow counts', starter: 'shoes on, out the door, first half mile easy.' },
      { role: 'support', text: 'Lay tomorrow’s kit out tonight', reason: 'you said the morning decision is where the run dies' },
      { role: 'support', text: 'Long run gets its own day, protected', reason: 'you said weekends disappear and the long run goes first' }
    ],
    noList: ['racing your easy runs', 'adding miles because you feel good', 'skipping the long run to catch up on sleep'],
    nonNegotiables: { candidates: ['Easy runs stay easy, no exceptions', 'The long run owns Sunday', 'Kit is out the night before', 'One mile minimum on a dead day', 'No new mileage jumps over 10% a week', 'Every run gets logged the same day'], chosen: [] },
    eq: {
      rows: [
        { label: 'Marathon distance', value: '26.2 mi', source: 'fact' },
        { label: 'Your goal time', value: '4:00:00', source: 'said' },
        { label: 'Your easy pace now', value: '10:30 / mi', source: 'said' }
      ],
      compute: [{ expr: '240 / 26.2', label: '240 minutes over 26.2 miles', approx: 9.16, shown: '≈ 9:09 / mi' }],
      result: { label: 'Race pace you are training toward', value: '9:09 per mile' }
    },
    reasoning: [
      'Nine minutes nine seconds, for twenty-six straight miles. You get there by running most of your weeks slower than that, not faster. The easy pace builds the engine; the race pace only shows up on race day and in a handful of workouts.',
      'That is why the plan puts four days on the calendar instead of six, and why the star act says conversation pace. Your pattern is a hard run, three days sore, one missed week. Four honest days beats six ambitious ones every single time in October.'
    ],
    qas: [
      { q: 'Four days is not enough, is it?', a: 'It is, at your history. Six days is enough for someone who has never had to take three days off. Memento plans for the runner you are, and moves the number when the evidence moves.' },
      { q: 'What if I miss the long run?', a: 'The week still counts. One missed long run is a data point, four in a row is a different plan. Memento is watching for the second one, not the first.' },
      { q: 'When does the pace work start?', a: 'After eight weeks of the boring version. That is the checkpoint on this plan.' }
    ],
    sizes: { unit: 'mi', ladder: [2, 4, 6, 10, 16], named: [4, 6, 10], estMinPerUnit: 10, fmt: 'plain' },
    close: { cadence: 'daily', kind: 'num', prompt: 'Miles', unit: 'mi', prefix: '', decimals: true, source: 'Asked after every run.', choices: null, tail: 'today.' },
    checkpoint: 'eight weeks',
    sendWindow: 'morning',
    restLine: 'Rest is the training today.'
  },

  writer: {
    commitment: 'You said you rewrite chapter one instead of writing chapter twelve. So the plan measures words added, never words polished. The draft gets finished ugly.',
    arrow: { from: '41,200 words', to: '80,000 by New Year’s Eve' },
    acts: [
      { role: 'star', text: 'Add new words to the draft, forward only', reason: 'you said editing the opening is how you avoid the middle', doneWhen: 'the word count is higher than it was this morning', starter: 'open the file, go to the very end, write one sentence.' },
      { role: 'support', text: 'Leave a note for tomorrow before you close the file', reason: 'you said starting cold is the hardest part of the day' },
      { role: 'support', text: 'No reading back further than yesterday', reason: 'you said one reread turns into a week of rewriting' }
    ],
    noList: ['rewriting chapter one', 'reading it back from the start', 'researching instead of drafting'],
    nonNegotiables: { candidates: ['New words before edited words', 'The file opens at the end, never the start', 'A note for tomorrow before closing', 'Fifty words minimum on the worst day', 'No rereading past yesterday', 'The count gets logged the same night'], chosen: [] },
    eq: {
      rows: [
        { label: 'Words written', value: '41,200', source: 'said' },
        { label: 'The draft you promised', value: '80,000', source: 'said' },
        { label: 'Days until New Year’s Eve', value: '129', source: 'fact' }
      ],
      compute: [{ expr: '(80000 - 41200) / 129', label: '38,800 words over 129 days', approx: 300.8, shown: '≈ 300 a day' }],
      result: { label: 'Words a day from here', value: '≈ 300' }
    },
    reasoning: [
      'Three hundred words is a page. It is twenty minutes on a good day and forty on a bad one, and it is the whole plan. The number is small on purpose: a target you can hit while tired is the only kind that survives December.',
      'The rest of the plan exists to protect those three hundred. The note for tomorrow removes the cold start. The no-rereading rule removes the trapdoor. If you write 300 ugly words a day from here, the draft is done before the year is.'
    ],
    qas: [
      { q: 'What if the words are bad?', a: 'They will be. A finished bad draft can be fixed in February. An unfinished good one cannot be fixed at all.' },
      { q: 'Can I edit at all?', a: 'After the draft is done, freely. Before then, only the paragraph you are standing in.' },
      { q: 'What if I miss a day?', a: 'The number recalculates and Memento tells you the truth. Nothing gets hidden and nothing gets punished.' }
    ],
    sizes: { unit: 'words', ladder: [100, 300, 600, 1000, 2000], named: [300, 600, 1000], estMinPerUnit: null, fmt: 'plain' },
    close: { cadence: 'daily', kind: 'num', prompt: 'Total words', unit: '', prefix: '', decimals: false, source: 'Asked every night.', choices: null, tail: 'in the draft.' },
    checkpoint: 'two weeks',
    sendWindow: 'evening',
    restLine: 'The draft keeps. See you tomorrow.'
  }
};

DEMO_LOGIC.barber = {
  commitment: 'You said the chair is full some weeks and empty others. The plan does not chase more customers. It makes the ones you already cut come back on a date instead of whenever they remember.',
  arrow: { from: '$7,350 a month', to: '$10,000' },
  acts: [
    { role: 'star', text: 'Book the next appointment before the client leaves the chair', reason: 'you said the empty weeks are people who meant to come back and did not', doneWhen: 'every client today left with a date', starter: 'ask the person in the chair right now: same time in three weeks?' },
    { role: 'support', text: 'Post one finished cut before you close', reason: 'you said new faces come from the page and the page goes quiet' },
    { role: 'support', text: 'Write down every no-show', reason: 'you said you cannot tell a bad week from a bad month' }
  ],
  noList: ['discounting to fill a slot', 'staying open late for a walk-in that may not come', 'a new price list every month'],
  nonNegotiables: { candidates: ['Nobody leaves the chair without a next date', 'One post before closing, every day open', 'No discounting to fill a gap', 'The books get closed out the same night', 'One protected day off a week', 'Every no-show gets written down'], chosen: [] },
  eq: {
    rows: [
      { label: 'Last month', value: '$7,350', source: 'said' },
      { label: 'Your average cut', value: '$45', source: 'said' },
      { label: 'Days you open', value: '24 a month', source: 'said' }
    ],
    compute: [{ expr: '(10000 - 7350) / 45 / 24', label: '$2,650 more, at $45 a cut, over 24 days', approx: 2.45, shown: '≈ 2.5 a day' }],
    result: { label: 'Extra cuts a day to clear $10k', value: 'about 3' }
  },
  reasoning: [
    'Three cuts a day. Not a rebrand, not a new location, not a price rise. Three. That is what stands between the shop today and the second chair you want to hire for.',
    'Rebooking in the chair is where those three come from, because a booked client is worth more than a new follower and costs you one sentence. The post keeps new faces arriving; the no-show log tells you in a month whether the problem is demand or the calendar.'
  ],
  qas: [
    { q: 'Why not just raise prices?', a: 'You can, and it is faster. But a price rise on an unsteady book makes the empty weeks emptier. Steady the book first, then the number is yours to set.' },
    { q: 'What if they say no to rebooking?', a: 'Some will. Asking every single person is still the highest-paid sentence in the shop.' },
    { q: 'When do I hire?', a: 'When $10k holds for three straight months, not the first time it happens. Memento is counting.' }
  ],
  sizes: { unit: 'cuts', ladder: [2, 4, 6, 8, 12], named: [4, 6, 8], estMinPerUnit: 40, fmt: 'plain' },
  close: { cadence: 'daily', kind: 'num', prompt: 'Cuts today', unit: '', prefix: '', decimals: false, source: 'Asked at close.', choices: null, tail: '' },
  checkpoint: 'one month',
  sendWindow: 'evening',
  restLine: 'Shop is closed. Nothing is owed today.'
};

DEMO_LOGIC.coder = {
  commitment: 'You said you bounce between tutorials. Tutorials are not the job hunt. The plan is applications and one project deep enough to talk about for thirty minutes.',
  arrow: { from: '11 applications', to: 'an offer by March' },
  acts: [
    { role: 'star', text: 'Send one real application, tailored', reason: 'you said you rewrite the résumé instead of sending it', doneWhen: 'submitted, with a cover line written for that company', starter: 'open the last job you bookmarked and write the first sentence.' },
    { role: 'support', text: 'Thirty minutes on the portfolio project, not a new one', reason: 'you said every new tutorial restarts the clock' },
    { role: 'support', text: 'One message to a human who works there', reason: 'you said the callbacks came from people, not portals' }
  ],
  noList: ['starting a new tutorial', 'rewriting the résumé instead of sending it', 'a fourth side project'],
  nonNegotiables: { candidates: ['One application sent every weekday', 'No new project until this one ships', 'A human gets messaged with every application', 'Fifteen minutes minimum on a dead day', 'No tutorials before the application goes out', 'Every rejection gets logged, not deleted'], chosen: [] },
  eq: {
    rows: [
      { label: 'Applications sent', value: '11', source: 'said' },
      { label: 'Callbacks so far', value: '1', source: 'said' },
      { label: 'Interviews an offer usually takes', value: '8', source: 'estimate' }
    ],
    compute: [{ expr: '8 / (1 / 11)', label: '8 interviews at a 1-in-11 callback rate', approx: 88, shown: '≈ 88' }],
    result: { label: 'Applications the math needs', value: 'about 90' }
  },
  reasoning: [
    'Ninety applications sounds brutal until you divide it: one a weekday is ninety by March. The number is not a punishment, it is the reason a daily move exists instead of a weekly sprint that never happens.',
    'The callback rate is the other half. One in eleven improves the moment a human sees your name before the portal does, which is what the message act is for. Send ninety cold and you are guessing. Send ninety with a person attached and the rate moves.'
  ],
  qas: [
    { q: 'Should I not be studying more?', a: 'You have studied for a year. The gap between you and an offer is not knowledge, it is the number of times a company has considered you.' },
    { q: 'What about the project?', a: 'One project, finished, that you can explain end to end. Thirty minutes a day, no restarts. A finished small thing beats three impressive folders.' },
    { q: 'What if I get rejected ninety times?', a: 'Then Memento has ninety logged rejections and the pattern in them, which is the most useful thing you could own in March.' }
  ],
  sizes: { unit: 'applications', ladder: [1, 2, 3, 5], named: [1, 2, 3], estMinPerUnit: 25, fmt: 'plain' },
  close: { cadence: 'daily', kind: 'num', prompt: 'Applications sent', unit: '', prefix: '', decimals: false, source: 'Asked every evening.', choices: null, tail: 'in total.' },
  checkpoint: 'three weeks',
  sendWindow: 'morning',
  restLine: 'Nothing is owed tonight.'
};

DEMO_LOGIC.musician = {
  commitment: 'You said you have forty unfinished ideas. The plan does not ask for a better idea. It finishes five of the ones you already have, because finished is the skill you are missing.',
  arrow: { from: '0 tracks finished', to: '5 and a live show' },
  acts: [
    { role: 'star', text: 'Work the current track toward finished, no new projects', reason: 'you said a new idea is how you escape a hard mix', doneWhen: 'the session moved this track closer to done', starter: 'open the project you touched last, not a new one.' },
    { role: 'support', text: 'Bounce whatever exists and listen once in the car', reason: 'you said you cannot hear it in the headphones any more' },
    { role: 'support', text: 'Write down the one thing stopping this track', reason: 'you said you stall without knowing why' }
  ],
  noList: ['starting a new project', 'buying another plugin', 'remixing something already finished'],
  nonNegotiables: { candidates: ['No new project until this one is finished', 'Twenty minutes minimum on a dead day', 'Every session ends with a bounce', 'The blocker gets written down before you close', 'No new plugins until the EP is out', 'One track finished per month'], chosen: [] },
  eq: {
    rows: [
      { label: 'Tracks finished', value: '0', source: 'said' },
      { label: 'Tracks the EP needs', value: '5', source: 'said' },
      { label: 'Weeks until summer', value: '22', source: 'fact' }
    ],
    compute: [{ expr: '5 * 34 / 22', label: '5 tracks at roughly 34 studio hours each, over 22 weeks', approx: 7.7, shown: '≈ 8 hours' }],
    result: { label: 'Studio hours a week', value: 'about 8' }
  },
  reasoning: [
    'Eight hours a week is an hour a night with Sunday off. That is the entire EP, and it only works if the hours land on the same five tracks instead of a rolling cast of new ones.',
    'The bounce rule is doing quiet work here. A track you have never heard outside the headphones is a track you cannot finish, because every judgment you make about it is wrong. Bounce it, hear it in the car, fix the one thing, repeat.'
  ],
  qas: [
    { q: 'What if the track is not good enough?', a: 'Finish it anyway. Track five will be better than track one specifically because you finished track one.' },
    { q: 'When do I book the show?', a: 'When three are finished. Booking it earlier is a deadline you will move; booking it then is a deadline that pulls.' },
    { q: 'Can I write new ideas down?', a: 'Write them down, do not open them. The notebook is free. The session is not.' }
  ],
  sizes: { unit: 'min', ladder: [20, 45, 60, 90, 120], named: [45, 60, 90], estMinPerUnit: null, fmt: 'min' },
  close: { cadence: 'weekly', kind: 'num', prompt: 'Tracks finished', unit: '', prefix: '', decimals: false, source: 'Asked on Sundays.', choices: null, tail: '' },
  checkpoint: 'first finished track',
  sendWindow: 'evening',
  restLine: 'The session can wait a night.'
};

DEMO_LOGIC.teacher = {
  commitment: 'You said you have lost this weight before and found it again. So the plan is built to survive a hard week at school, not to be impressive in an easy one.',
  arrow: { from: '194 pounds', to: '177 by graduation' },
  acts: [
    { role: 'star', text: 'A thirty minute walk after dinner', reason: 'you said the evening is when the day falls apart', doneWhen: 'the walk happened, pace does not matter', starter: 'shoes on, to the end of the street and back.' },
    { role: 'support', text: 'Pack tomorrow’s lunch tonight', reason: 'you said the school day is where the plan gets eaten' },
    { role: 'support', text: 'Water on the desk, refilled at every break', reason: 'you said the afternoon crash is when the snacks win' }
  ],
  noList: ['a new diet on Monday', 'weighing yourself twice a day', 'skipping meals to make up for one'],
  nonNegotiables: { candidates: ['The walk happens after dinner', 'Tomorrow’s lunch is packed tonight', 'One weigh-in a week, same morning', 'Ten minutes minimum on the worst days', 'No new diet before graduation', 'Nothing gets skipped to punish a bad day'], chosen: [] },
  eq: {
    rows: [
      { label: 'Where you are', value: '194 lb', source: 'said' },
      { label: 'Where you are going', value: '177 lb', source: 'said' },
      { label: 'A pound is roughly', value: '3,500 cal', source: 'fact' },
      { label: 'Weeks to graduation', value: '34', source: 'fact' }
    ],
    compute: [{ expr: '17 * 3500 / 238', label: '17 lb, at 3,500 each, over 238 days', approx: 250, shown: '≈ 250 a day' }],
    result: { label: 'The daily gap to hold', value: '≈ 250 cal' }
  },
  reasoning: [
    'Two hundred and fifty calories a day. That is the walk and the packed lunch, and nothing else has to change. It is deliberately the smallest number that still arrives in May, because you already proved you can lose it fast and you already proved fast does not stay.',
    'You have lost eighteen pounds and kept them. That is the part worth protecting. The plan holds a gap you can keep on a week of parent conferences, which is exactly the week the last three attempts died in.'
  ],
  qas: [
    { q: 'Only 250? That feels slow.', a: 'It is slow. Slow is the feature. You are not trying to lose 35 pounds, you are trying to still have lost them next year.' },
    { q: 'What about the gym?', a: 'Add it if you want it. The plan does not need it, and a plan that needs the gym dies the first week the gym does not happen.' },
    { q: 'What if the scale stalls?', a: 'It will, for a week or two. The daily record is what tells the difference between a stall and a slide, and Memento will say which one it is.' }
  ],
  sizes: { unit: 'min', ladder: [10, 20, 30, 45, 60], named: [20, 30, 45], estMinPerUnit: null, fmt: 'min' },
  close: { cadence: 'weekly', kind: 'num', prompt: 'The scale said', unit: 'lb', prefix: '', decimals: true, source: 'Asked once a week, the same morning.', choices: null, tail: 'this morning.' },
  checkpoint: 'four weeks',
  sendWindow: 'evening',
  restLine: 'Rest counts. See you tomorrow.'
};

DEMO_LOGIC.screentime = {
  commitment: 'You said you do not choose the four hours, they just happen. So the plan does not ask for willpower at 11pm. It changes where the phone sleeps and what the first hour of the day is allowed to contain.',
  arrow: { from: '4 hours 4 minutes a day', to: 'under 2 hours' },
  acts: [
    { role: 'star', text: 'The phone charges outside the bedroom tonight', reason: 'you said the worst hour is the one in bed before sleep', doneWhen: 'the phone is on the kitchen charger and you are not', starter: 'plug it in now, before you sit down.' },
    { role: 'support', text: 'One evening hour with the phone in another room', reason: 'you said the evening disappears and you cannot say into what' },
    { role: 'support', text: 'No feed apps before the first real thing is done', reason: 'you said the morning scroll sets the tone for the whole day' }
  ],
  noList: ['the phone in the bedroom', 'opening a feed before the first task', '"just checking" during a conversation'],
  nonNegotiables: { candidates: ['The phone sleeps outside the bedroom', 'No feeds before the first real thing', 'One phone-free hour every evening', 'Five minutes of the plan on the worst days', 'No scrolling in front of another person', 'The daily number gets logged, honestly'], chosen: [] },
  eq: {
    rows: [
      { label: 'Your daily average now', value: '4h 04m', source: 'said' },
      { label: 'Where you want it', value: '2h 00m', source: 'said' },
      { label: 'The gap', value: '124 min a day', source: 'fact' }
    ],
    compute: [{ expr: '124 * 365 / 60', label: '124 minutes a day, across a year', approx: 754.3, shown: '≈ 754 hours' }],
    result: { label: 'What a year of this is worth', value: '≈ 754 hours back' }
  },
  reasoning: [
    'Seven hundred and fifty hours is nineteen working weeks. That is the whole argument, and it is why the plan is worth doing even on the days it feels petty. You are not fighting a habit, you are buying back a season.',
    'The two acts that matter are both about geography, not discipline. A phone on the kitchen counter cannot be picked up at midnight, and a feed that is not opened before the first task never gets to set the tone. Willpower is the thing that fails at 11pm. Distance does not.'
  ],
  qas: [
    { q: 'What if I need it for the alarm?', a: 'Buy a clock. It is nine dollars and it removes the single strongest reason the phone stays in the room.' },
    { q: 'Is two hours realistic?', a: 'For you, from four, over a season, yes. Cutting to thirty minutes this week is the version that fails on Thursday.' },
    { q: 'What counts as a slip?', a: 'Nothing counts as a slip. The number gets recorded, high or low, and the week is read as a whole. A bad day inside a good week is just a day.' }
  ],
  scale: true,
  sizes: { unit: 'min', ladder: [15, 30, 60, 90, 120], named: [30, 60, 90], estMinPerUnit: null, fmt: 'min' },
  close: { cadence: 'daily', kind: 'num', prompt: 'Screen time', unit: 'min', prefix: '', decimals: false, source: 'Asked every night, from your own screen time report.', choices: null, tail: 'today.' },
  checkpoint: 'two weeks',
  sendWindow: 'evening',
  restLine: 'Put it down. That is the whole task tonight.'
};

DEMO_LOGIC.weight = {
  commitment: 'You said you have done this three times and gained it back three times. So the plan is not a diet. It is a gap small enough to keep after the weight is gone, because keeping it is the part you have never done.',
  arrow: { from: '271 pounds', to: '236' },
  acts: [
    { role: 'star', text: 'A forty minute walk after dinner', reason: 'you said the evening is when the day breaks and the snacking starts', doneWhen: 'the walk happened, pace does not matter', starter: 'shoes on, out the door, to the corner and back.' },
    { role: 'support', text: 'Log every meal, before you eat it', reason: 'you said you have no idea what a normal day actually adds up to' },
    { role: 'support', text: 'Water instead of soda, all day', reason: 'you named sugar drinks as the biggest single thing' }
  ],
  noList: ['a new diet every January', 'fast food on weekdays', 'weighing in more than once a week'],
  nonNegotiables: { candidates: ['The walk happens after dinner', 'The meal gets logged before it is eaten', 'No sugar drinks in the house', 'Fifteen minutes minimum on the worst days', 'No fast food on weekdays', 'One weigh-in a week, same morning'], chosen: [] },
  eq: {
    rows: [
      { label: 'Where you are', value: '271 lb', source: 'said' },
      { label: 'Where you started', value: '296 lb', source: 'said' },
      { label: 'A pound is roughly', value: '3,500 cal', source: 'fact' },
      { label: 'Days you have given it', value: '300', source: 'fact' }
    ],
    compute: [{ expr: '35 * 3500 / 300', label: '35 lb left, at 3,500 each, over 300 days', approx: 408.3, shown: '≈ 410 a day' }],
    result: { label: 'The daily gap to hold', value: '≈ 410 cal' }
  },
  reasoning: [
    'Four hundred and ten calories a day is the walk and the soda. That is it. It is not the fastest way to lose 35 pounds and it is deliberately not trying to be, because you have already proven you can lose it fast. What you have never proven is keeping a gap you can live inside.',
    'Twenty-five pounds are already gone and have stayed gone for ten months. That is new, and it is the actual achievement here. The plan protects the thing that made it work, which was never a diet: it was a walk you did not negotiate with and a log that made the day visible.'
  ],
  qas: [
    { q: 'Why not cut harder and finish sooner?', a: 'Because that is what the last three attempts did. The number Memento holds is the one you can still hold in month nine, which is where every previous try ended.' },
    { q: 'Do I have to log forever?', a: 'No. Log until you can guess a day within a couple hundred calories, then stop. Most people get there in about six weeks.' },
    { q: 'What if I gain a pound this week?', a: 'Then you gained a pound this week. One weigh-in is noise, four in a row is a signal, and Memento will tell you which one it is looking at.' }
  ],
  sizes: { unit: 'min', ladder: [15, 25, 40, 55, 75], named: [25, 40, 55], estMinPerUnit: null, fmt: 'min' },
  close: { cadence: 'weekly', kind: 'num', prompt: 'The scale said', unit: 'lb', prefix: '', decimals: true, source: 'Asked once a week, the same morning.', choices: null, tail: 'this morning.' },
  checkpoint: 'four weeks',
  sendWindow: 'evening',
  restLine: 'Rest is part of it. See you tomorrow.'
};

const DEMO_DEPTH = {
  screentime: {
    inbox: ['Buy an actual alarm clock', 'Ask Rachel what she reads on the train', 'Delete the app off the phone, keep it on the laptop'],
    people: [['Rachel', 5, 12, 'The phone-free dinner rule was her idea.'], ['Mom', 11, 8, 'Calls on Sundays, deserves my attention.'], ['Book club', 21, 3, 'Stopped going when I stopped finishing books.']],
    voice: {
      runningToward: 'Evenings that feel long again and attention that belongs to me',
      clarityLevel: 'Very clear on the problem, foggy on the fix', actionKnow: 'I know what to do at 9pm and not at 11pm',
      runningFrom: 'Losing hours I cannot account for',
      distraction: 'Instagram and the bed scroll', commitLevel: 'Serious, if it does not require willpower I do not have',
      timeBudget: 'The whole evening, in theory',
      costOfInaction: 'Turning thirty having read four books in three years',
      momentumWin: 'A weekend where I genuinely did not think about my phone',
      letterToFutureSelf: 'I keep telling myself the scrolling is harmless because it is only an hour. It is four. If nothing changes, that is a full working month of my year, every year, spent on nothing I would choose.',
      weakestPillar: 'action'
    },
    progress: { unit: 'minutes a day', baseline: 372, current: 244, target: 120, shape: 'quantity_down' },
    target: 0.65
  },
  weight: {
    inbox: ['Pack lunch tonight, not at 6am', 'Ask Dr. Alvarez about the knee before adding running', 'Sign Eli up for the spring league'],
    people: [['Ava (daughter)', 2, 41, 'Asks me to bike to the park now.'], ['Eli (son)', 2, 38, ''], ['Dad', 30, 6, 'Same body, same story. That is the warning.']],
    voice: {
      runningToward: 'Being the dad who plays instead of the one who watches',
      clarityLevel: 'Clear', actionKnow: 'Yes. I have known for years, I just never kept it',
      runningFrom: 'Losing it and gaining it back a fourth time',
      distraction: 'Late night kitchen and the drive-thru', commitLevel: 'This is the one that has to hold',
      timeBudget: 'Forty minutes after dinner',
      costOfInaction: 'My dad at fifty, and my kids remembering me on the bench',
      momentumWin: 'Twenty-five pounds gone and still gone ten months later',
      letterToFutureSelf: 'I have lost this weight three times. Every time I lost it fast and told myself the hard part was over. The hard part was never the losing. If I am back at 296 next year, it will be because I got impatient again.',
      weakestPillar: 'consistency'
    },
    progress: { unit: 'pounds', baseline: 296, current: 271, target: 236, shape: 'quantity_down' },
    target: 0.7
  },
  creator: {
    inbox: ['Thumbnail idea: just my face and three words', 'Ask Dev how he batches four videos in a weekend', 'Stop opening analytics before noon'],
    people: [['Mom', 7, 9, 'Loves the channel updates. Call Sundays.'], ['Dev (creator friend)', 14, 5, 'Owes me a collab date.'], ['Chris (old roommate)', 60, 26, '']],
    voice: {
      runningToward: 'Making videos people actually watch, and making it my job',
      clarityLevel: 'I know the goal, not the path', actionKnow: 'Roughly, but I second-guess it',
      runningFrom: 'Being invisible after three years of trying',
      distraction: 'YouTube analytics', commitLevel: 'All in, if I stop stalling',
      timeBudget: '2 hours a night after work',
      costOfInaction: 'Turning 26 with a folder of drafts nobody has seen',
      momentumWin: 'Fifty videos published and a real audience that expects me',
      letterToFutureSelf: 'I am scared that I am not talented, so I keep polishing instead of posting. If a year passes and the folder is still private, that is the answer I was avoiding.',
      weakestPillar: 'consistency'
    },
    progress: { unit: 'subscribers', baseline: 1200, current: 8400, target: 100000, shape: 'quantity_up' },
    target: 0.55
  },
  founder: {
    inbox: ['That churned user said onboarding, not price', 'Write the pricing page like a human', 'Stop refactoring the admin panel'],
    people: [['Sam, my mentor', 30, 41, 'Owes him an update on the 100 users.'], ['Dad', 14, 11, 'Asks how it is going every time.'], ['Priya (first customer)', 21, 4, 'The one who would be upset if it vanished.']],
    voice: {
      runningToward: 'A product people pay for and would miss if it vanished',
      clarityLevel: 'Very clear', actionKnow: 'Yes, I just avoid the scary half',
      runningFrom: 'Building things nobody asked for',
      distraction: 'Refactoring instead of selling', commitLevel: 'This is the year',
      timeBudget: '4 hours of real focus',
      costOfInaction: 'Another beautiful product with zero customers',
      momentumWin: 'Revenue that replaces my salary and proof I can do this',
      letterToFutureSelf: 'I hide in code because code cannot reject me. The work that matters is the work where someone can say no.',
      weakestPillar: 'action'
    },
    progress: { unit: 'paying users', baseline: 0, current: 62, target: 100, shape: 'quantity_up' },
    target: 0.7
  },
  student: {
    inbox: ['Office hours Thursday, actually go this time', 'Meal prep Sunday or Wednesday falls apart', 'Stop studying in bed'],
    people: [['Mom', 7, 4, 'Worries when I go quiet.'], ['Jess (study partner)', 7, 2, 'Library at 6, keeps me honest.'], ['Coach Ramos', 30, 22, '']],
    voice: {
      runningToward: 'Finishing strong without falling apart',
      clarityLevel: 'Clear on grades, foggy on the body part', actionKnow: 'I know what to do, I just run out of day',
      runningFrom: 'Repeating last semester, where I panicked in April',
      distraction: 'Group chats', commitLevel: 'Serious, but I am tired',
      timeBudget: '90 minutes on a normal day',
      costOfInaction: 'Another semester of surviving instead of learning',
      momentumWin: 'A 3.8, a body I trust, and proof I can hold two things at once',
      letterToFutureSelf: 'I do everything last minute and call it my personality. I want one semester where I am not afraid to open my email.',
      weakestPillar: 'consistency'
    },
    progress: { unit: 'GPA', baseline: 3.1, current: 3.55, target: 3.8, shape: 'quantity_up' },
    target: 0.6
  },
  runner: {
    inbox: ['New shoes at 400 miles, not before', 'Long run Saturday, not Sunday, this week', 'Foam roll before bed, not never'],
    people: [['Dad', 7, 3, 'He is flying in for the marathon.'], ['Lena (running club)', 7, 1, 'Tuesday intervals.'], ['Dr. Okafor (PT)', 45, 30, 'Check the knee before the volume jumps.']],
    voice: {
      runningToward: 'Becoming someone who finishes what she starts',
      clarityLevel: 'Very clear', actionKnow: 'The plan is written, I follow it',
      runningFrom: 'A decade of saying I am not a runner',
      distraction: 'The snooze button', commitLevel: 'Locked in',
      timeBudget: '60 to 90 minutes, mornings',
      costOfInaction: 'Turning 30 with the same story about myself',
      momentumWin: 'A finish line photo and a body that trusts me',
      letterToFutureSelf: 'I quit things right before they get good. This time the training plan decides, not my mood at 5am.',
      weakestPillar: 'clarity'
    },
    progress: { unit: 'minutes', baseline: 300, current: 252, target: 240, shape: 'quantity_down' },
    target: 0.4
  },
  writer: {
    inbox: ['Chapter 11 is the one that scares me. Start there', 'Cut the flashback, it is procrastination in prose', 'Read it aloud before deciding it is bad'],
    people: [['Nadia (writing group)', 14, 6, 'Sends pages every other Sunday.'], ['Mom', 21, 12, ''], ['Tom (agent, someday)', 90, 74, 'Not until the draft exists.']],
    voice: {
      runningToward: 'Finishing the book instead of describing it at parties',
      clarityLevel: 'Clear', actionKnow: 'Yes, when I am not avoiding it',
      runningFrom: 'Being someone who talks about writing',
      distraction: 'Research that looks like work', commitLevel: 'Fully, in bursts',
      timeBudget: 'An hour before the house wakes up',
      costOfInaction: 'Another draft that dies at 30,000 words',
      momentumWin: 'A finished manuscript, however rough, that actually exists',
      letterToFutureSelf: 'I write beautifully for two weeks and then vanish for a month. I do not need more talent. I need to come back sooner.',
      weakestPillar: 'consistency'
    },
    progress: { unit: 'words', baseline: 0, current: 41200, target: 80000, shape: 'quantity_up' },
    target: 0.35
  },
  barber: {
    inbox: ['Raise the fade to $35, nobody will leave', 'Post the before-and-after from Friday', 'Second chair costs less than the lost walk-ins'],
    people: [['Elena (wife)', 3, 1, 'The one keeping the books.'], ['Ray (barber, mentor)', 30, 24, 'Ask how he priced the second chair.'], ['Mike (regular, every 2 weeks)', 14, 9, '']],
    voice: {
      runningToward: 'A shop that runs without me bleeding for it',
      clarityLevel: 'Clear on the number', actionKnow: 'Mostly, the marketing part is guesswork',
      runningFrom: 'Good months followed by scary months',
      distraction: 'Walk-ins and admin', commitLevel: 'My family depends on it',
      timeBudget: 'An hour between clients',
      costOfInaction: 'Cutting hair alone at 45 with no chair to hand off',
      momentumWin: 'A second chair, a waitlist, and a Sunday off',
      letterToFutureSelf: 'I am good with the clippers and bad at asking for money. The shop grows the day I stop being shy about that.',
      weakestPillar: 'action'
    },
    progress: { unit: 'dollars a month', baseline: 4200, current: 7350, target: 10000, shape: 'quantity_up' },
    target: 0.25
  },
  coder: {
    inbox: ['Apply to five, even the scary ones', 'Finish the project instead of starting the tutorial', 'Ask Arjun for a referral, worst case he says no'],
    people: [['Amma', 7, 6, 'Tells everyone I am a programmer already.'], ['Arjun (works at the company)', 30, 38, 'The referral I keep not asking for.'], ['Sara (bootcamp friend)', 21, 15, 'She got hers in March.']],
    voice: {
      runningToward: 'A job offer that changes my family life',
      clarityLevel: 'Clear on the goal, lost on the path', actionKnow: 'Not really, I bounce between tutorials',
      runningFrom: 'Two years of almost applying',
      distraction: 'New frameworks', commitLevel: 'I want it badly, I am inconsistent',
      timeBudget: '45 minutes, some nights',
      costOfInaction: 'Another year of preparing to be ready',
      momentumWin: 'An offer, a first paycheck, and a family that stops worrying',
      letterToFutureSelf: 'I keep learning instead of applying because a tutorial cannot reject me. The rejection is the price of the door.',
      weakestPillar: 'action'
    },
    progress: { unit: 'applications sent', baseline: 0, current: 11, target: 60, shape: 'quantity_up' },
    target: 0.35
  },
  musician: {
    inbox: ['Track one is done enough. Move on', 'Book the open mic before the songs are ready', 'Stop buying pedals'],
    people: [['Marco (drummer)', 14, 3, 'Ready whenever I am.'], ['Mom', 21, 17, ''], ['Kai (runs the open mic)', 30, 44, 'Said just show up.']],
    voice: {
      runningToward: 'Finally putting my own music into the world',
      clarityLevel: 'Getting clearer', actionKnow: 'I am learning as I go',
      runningFrom: 'Playing other people\'s songs forever',
      distraction: 'Buying gear', commitLevel: 'Starting today, honestly',
      timeBudget: 'An hour most evenings',
      costOfInaction: 'Being the guy who could have',
      momentumWin: 'Five songs finished and one night where people came to hear them',
      letterToFutureSelf: 'I have started this EP three times. Day one again, but this time I am counting the days.',
      weakestPillar: 'consistency'
    },
    progress: { unit: 'tracks finished', baseline: 0, current: 0, target: 5, shape: 'quantity_up' },
    target: 0.55
  },
  teacher: {
    inbox: ['Walk at lunch, the staff room is a trap', 'Buy the dress a size down, hang it up', 'Weigh once a week, not every morning'],
    people: [['Maya (my daughter)', 3, 0, 'The wedding is the whole why.'], ['Dee (walking partner)', 7, 2, 'Tuesdays and Thursdays.'], ['Dr. Bell', 90, 61, 'Bloodwork in the spring.']],
    voice: {
      runningToward: 'Being healthy enough to keep up with my life',
      clarityLevel: 'Clear', actionKnow: 'Yes, I have done it before',
      runningFrom: 'Losing and regaining the same 30 pounds',
      distraction: 'The staff room snacks', commitLevel: 'For real this time, quietly',
      timeBudget: '40 minutes after school',
      costOfInaction: 'Watching my daughter\'s wedding photos and not recognising myself',
      momentumWin: 'Thirty-five pounds down and the energy I had at 30',
      letterToFutureSelf: 'I have lost this weight twice already. The losing is not my problem. Staying is.',
      weakestPillar: 'consistency'
    },
    progress: { unit: 'pounds', baseline: 212, current: 194, target: 177, shape: 'quantity_down' },
    target: 0.55
  }
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
  // A demo opens before today's Action has been confirmed. Historical proof is
  // still rich, but the current day is deliberately blank so Malik can test the
  // same hold-to-complete interaction a real user receives.
  const completedDays = activeDays.filter((daysAgo) => daysAgo > 0);
  let streakHistory = completedDays.map(_demoISO).sort();
  // Seed the personal-record fields from the longest run already in the demo
  // history, so opening the demo does not fire a spurious "new record" moment
  // (a genuine record still fires when the user backfills a gap to beat it).
  let _demoBest = (function () {
    const nums = completedDays.map(d => Math.floor(Date.parse(_demoISO(d) + 'T00:00:00Z') / 86400000)).sort((a, b) => a - b);
    let lo = 0, run = 0, prev = null;
    nums.forEach(n => { if (prev !== null && n - prev === 1) run += 1; else run = 1; if (run > lo) lo = run; prev = n; });
    return lo;
  })();
  const tierCycle = ['moderate', 'light', 'moderate', 'heavy', 'tiny', 'moderate', 'light', 'moderate', 'heavy', 'moderate', 'light', 'moderate'];
  let completionHistory = completedDays.slice(0, 12).map((d, i) => {
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
  // ── v1280 (Malik): EVERY persona gets a real life, not a month of dots.
  // Each carries a SHAPE that says how their year actually went, so tapping a
  // persona shows what Memento looks like for that kind of person: the machine,
  // the honest 3-days-a-week, the one who fell off and came back, the one who
  // is barely holding on, and day one. Deterministic (seeded), so the same
  // persona always reads the same. The founder keeps its own hand-tuned year
  // below; every other persona is built here.
  const LIFE = {
    // base = odds on a day the plan ASKS for; dowOnly names those days.
    // slump = a multiplier for the hard weeks; recent = the last three weeks,
    // which is what the score actually reads.
    machine:  { days: 210, base: 0.94, sundayOff: 0.12, slumps: [], recent: 0.95 },
    steady:   { days: 180, base: 0.78, sundayOff: 0.3, slumps: [[120, 132]], recent: 0.76 },
    training: { days: 150, base: 0.94, sundayOff: 0, slumps: [[88, 96]], recent: 0.95, dowOnly: [1, 3, 5] },
    streaky:  { days: 165, base: 0.66, sundayOff: 0.25, slumps: [[70, 92], [130, 140]], recent: 0.7 },
    comeback: { days: 185, base: 0.52, sundayOff: 0.25, slumps: [[45, 125]], recent: 0.9 },
    sparse:   { days: 120, base: 0.3, sundayOff: 0.35, slumps: [[30, 60]], recent: 0.22 },
    weekend:  { days: 140, base: 0.92, sundayOff: 0, slumps: [], recent: 0.95, dowOnly: [0, 6] },
    fresh:    { days: 3, base: 1, sundayOff: 0, slumps: [], recent: 1 }
  };
  if (personaKey !== 'founder' && LIFE[p.pattern]) {
    const L = LIFE[p.pattern];
    const rnd2 = (seed) => { const x = Math.sin(seed * 91.7 + 47.3) * 21358.5453; return x - Math.floor(x); };
    const tierPool = ['moderate', 'light', 'moderate', 'heavy', 'tiny', 'moderate', 'light', 'moderate'];
    const refl = (p.reflections && p.reflections.length) ? p.reflections : ['Showed up. That is the whole game.'];
    const gStreak = [], gComp = [], gDeep = [], gRefl = [];
    for (let d = L.days - 1; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 86400000);
      const iso = localISO(dt);
      const dow = dt.getDay();
      // A day the plan never asked for is simply not a day they show up: it is
      // rest, not a miss (the Consistency law). So it is skipped outright.
      if (L.dowOnly && L.dowOnly.indexOf(dow) === -1) continue;
      let prob = (d < 21) ? L.recent : L.base;
      if (!L.dowOnly && dow === 0) prob -= L.sundayOff;
      if (d >= 21) L.slumps.forEach((r) => { if (d >= r[0] && d <= r[1]) prob *= 0.18; });
      if (rnd2(d + 11) > prob) continue;
      if (d === 0) continue;                    // today waits for a real hold
      gStreak.push(iso);
      const r2 = rnd2(d * 13 + 5);
      const lvl = r2 < 0.2 ? 1 : r2 < 0.6 ? 2 : r2 < 0.86 ? 3 : 4;
      if (lvl >= 2) {
        const tier = tierPool[d % tierPool.length];
        gComp.push({ date: dt.toISOString(), tier, actionText: p.action.tiers[tier] || p.action.title, planTitle: p.action.title });
      }
      if (lvl >= 3) gDeep.push({ date: _demoHuman(d), iso, minutes: 25 + ((d * 7) % 70) });
      if (lvl >= 4) gRefl.push({ date: _demoHuman(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), iso, text: refl[d % refl.length] });
    }
    streakHistory = gStreak.slice().sort();
    completionHistory = gComp;
    deepwork = gDeep;
    reflections = gRefl.slice().reverse();
    _demoBest = (function () {
      const nums = gStreak.map(x => Math.floor(Date.parse(x + 'T00:00:00Z') / 86400000)).sort((a, b) => a - b);
      let lo = 0, run = 0, prev = null;
      nums.forEach(n => { if (prev !== null && n - prev === 1) run += 1; else run = 1; if (run > lo) lo = run; prev = n; });
      return lo;
    })();
  }
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
      if (d === 0) continue;                 // today's Action awaits the real hold
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
    profile: Object.assign(
      { name: p.name, onboarded: true, onboardedAt: new Date().toISOString() },
      // v1280: the diagnostic answers in this person's own words. js/03's
      // buildProfileContext reads exactly these keys, so every AI surface in a
      // demo writes for THEM, not for a blank user.
      (DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].voice) || {}
    ),
    dev: { previewAll: true }, // unlock every module so the demo dashboard looks full
    prefs: { unlockAll: true }, // demos always bypass the unlock ladder
    // Demos simulate someone who already bought: mark them paid so the post-Clarity
    // paywall never appears (a persona is supposed to be a full, owned account).
    entitlements: { isPaid: true, paidAt: new Date().toISOString(), plan: 'demo' },
    checkins: demoCheckins,
    clarity: { completed: true, completedAt: new Date().toISOString(), tutorialSeen: true, ignitedAt: Date.now() - 86400000, seenSummary: true, answers: { goalShape: { type: ((DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].progress || {}).shape || 'quantity_up'), source: 'demo' }, neutronStar: p.neutronStar, coreWhy: p.coreWhy, whyItMatters: p.coreWhy, antiVision: p.antiVision, futureVision: p.futureVision, identityLine: p.identityLine, tensionLine: p.tensionLine || '', timeHorizon: '12 months', dailyTime: 90, intensity: 'heavy' } },
    // v1285 (Malik: "for the personas it should be as if I've already had
    // Memento for a while"). The NEW Action flow (js/30) reads state.actionPlan,
    // not the legacy primaryAction, so without a landed plan every persona
    // opened Action on the intake confirm screen instead of their day. This is
    // that plan, built from the persona's own action + progress, agreed and
    // dated back to the goal's start so the day view opens directly.
    actionPlan: (function () {
      const g = (DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].progress) || {};
      const L = DEMO_LOGIC[personaKey] || {};
      const tiers = p.action.tiers || {};
      const started = Date.now() - 86400000 * 45;
      return {
        v: 1,
        bucket: p.action.bucket || personaKey,
        star: p.neutronStar,
        starHash: _demoStarHash(p.neutronStar),
        // The logic page renders straight off these: this person's own
        // commitment, arrow, acts with reasons, refusals, math and questions.
        commitment: L.commitment || '',
        arrow: L.arrow || null,
        acts: L.acts || [
          { role: 'star', text: tiers.moderate || p.action.title, doneWhen: 'the move actually happened' },
          { role: 'support', text: tiers.light || p.action.howToStart, doneWhen: 'a smaller version happened' }
        ],
        noList: L.noList || [],
        nonNegotiables: L.nonNegotiables || null,
        eq: L.eq || null,
        reasoning: L.reasoning || [],
        qas: L.qas || [],
        scale: L.scale === true,
        checkpoint: L.checkpoint || '',
        restLine: L.restLine || '',
        close: L.close || { cadence: 'daily', kind: 'num', prompt: '', unit: g.unit || '', prefix: '', decimals: false, source: '', choices: null },
        targets: { target: g.target != null ? g.target : null, unit: g.unit || '', baseline: g.baseline != null ? g.baseline : null, countTarget: null, daysTarget: null },
        // the WEIGHT of a day's work, in this person's own unit: miles for the
        // runner, words for the writer, cuts for the barber, minutes for the
        // rest. The day view's ladder reads this.
        sizes: L.sizes || { unit: 'min', ladder: [15, 30, 60], named: [], estMinPerUnit: null, fmt: 'min' },
        parts: null, verb: 'do',
        sendWindow: L.sendWindow || 'morning',
        deadline: null, offDays: null,
        sessionsPerWeek: Math.max(1, Math.round(((DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].target) || 0.6) * 7)),
        createdAt: _demoISO(45),
        landedAt: started,
        agreedAt: started + 60000
      };
    })(),
    action: { viewMode: 'vine', introSeen: true, intake: { completed: true }, planGenerated: true, planSourceNeutronStar: p.neutronStar, selectedTier: 'moderate', lastGeneratedAt: new Date().toISOString(), primaryAction: { title: p.action.title, why: p.action.why, howToStart: p.action.howToStart, recommendedTier: 'moderate', recommendedWhy: p.action.recommendedWhy, tiers: p.action.tiers, path: p.action.path, linkedProjectId: p.action.linkedProjectId || '', linkedMilestoneId: p.action.linkedMilestoneId || '' }, projects: p.action.projects || [], completionHistory: completionHistory },
    streak: { history: streakHistory, bestEver: _demoBest, bestEverShown: _demoBest },
    // v1280: where this person actually stands, so the distance chip, the pace
    // line, milestones and the finale all have something true to read.
    goalProgress: (function () {
      const g = (DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].progress) || null;
      if (!g) return { starHash: '', target: null, unit: '', baseline: null, current: null, updatedAt: '', askedDay: '', history: [], shape: '', customMarks: [] };
      const hist = [];
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const v = g.baseline + ((g.current - g.baseline) * (i / steps));
        hist.push({ v: Math.round(v * 100) / 100, iso: _demoISO((steps - i) * 12 + 4) });
      }
      return {
        starHash: _demoStarHash(p.neutronStar), target: g.target, unit: g.unit, baseline: g.baseline,
        current: g.current, updatedAt: new Date(Date.now() - 86400000).toISOString(),
        askedDay: '', history: hist, shape: g.shape, customMarks: []
      };
    })(),
    // v1280: the Consistency bar this person set for themselves, matched to how
    // they really live. setAt is stamped so a demo never opens the onboarding.
    consistency: {
      target: (DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].target) || 0.6,
      selfReported: null,
      setAt: Date.now() - 86400000 * 30
    },
    deepwork: { sessions: deepwork },
    reflection: { entries: reflections, trash: [], folders: [], activeFolder: null, disp: { font: 'system', surface: 'glass' } },
    distraction: { logs: distractions },
    inbox: (DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].inbox
      ? DEMO_DEPTH[personaKey].inbox.map(function (t, i) {
          return { id: 'ib_' + personaKey + i, text: t, ts: Date.now() - (i + 1) * 2400000, iso: getTodayISO() };
        })
      : [
      { id: 'ib_demo1', text: 'Realized I think best on long walks, protect that time', ts: Date.now() - 9000000, iso: getTodayISO() },
      { id: 'ib_demo2', text: 'Call an old friend this weekend', ts: Date.now() - 5400000, iso: getTodayISO() },
      { id: 'ib_demo3', text: 'Got distracted by the group chat for 40 minutes again', ts: Date.now() - 3600000, iso: getTodayISO() },
      { id: 'ib_demo4', text: 'Shipped the first rough draft today', ts: Date.now() - 1200000, iso: getTodayISO() }
    ]),
    people: (DEMO_DEPTH[personaKey] && DEMO_DEPTH[personaKey].people
      ? DEMO_DEPTH[personaKey].people.map(function (x, i) {
          return { id: 'pp_' + personaKey + i, name: x[0], cadenceDays: x[1],
            lastContactISO: localISO(new Date(Date.now() - x[2] * 86400000)), notes: x[3] || '' };
        })
      : [
      { id: 'pp_demo1', name: 'Mom', cadenceDays: 7, lastContactISO: localISO(new Date(Date.now() - 9 * 86400000)), notes: 'Call on Sundays. She loves the channel updates.' },
      { id: 'pp_demo2', name: 'Sam, my mentor', cadenceDays: 30, lastContactISO: localISO(new Date(Date.now() - 41 * 86400000)), notes: 'Owe him an update on the 100k goal.' },
      { id: 'pp_demo3', name: 'Chris (old roommate)', cadenceDays: 60, lastContactISO: localISO(new Date(Date.now() - 18 * 86400000)), notes: '' }
    ]),
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
    // v1285 (Malik: "it should be as if i've already had Memento for a while").
    // Every once-ever first-run beat is already spent for a persona: the
    // First 7 Days future-pace, the card + action evolution reveals, the
    // unlock ceremony, the plan reveal. A persona opens into the everyday
    // app, never into a welcome.
    meta: { onboarded: true, welcomeSeen: true, firstActionDone: completionHistory.length > 0, lastVisit: _demoISO(0),
      next7DaysSeen: true, cardEvolutionSeen: true, actionEvolutionSeen: true, planRevealSeen: true,
      unlockBeatSeen: true, unlockCeremonySeen: true, clarityMsgBeatSeen: true, firstWhiteShown: true,
      cardSeenISO: _demoISO(0) },
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
      mk('screentime', 'Screen time') + mk('weight', 'Weight loss') +
      '<button id="demoExit" class="creator-box__btn creator-box__btn--danger" style="flex:0 0 auto;">Exit demo</button>';
    actions.appendChild(row);
    // Re-tapping the persona you are ALREADY in must still do something visible:
    // assigning an identical location.search can read as a silent no-op (Malik
    // v684, stuck re-tapping Founder), so force a clean reload in that case.
    row.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
      enterDemoMode(b.getAttribute('data-demo'));
    }));
    const ex = document.getElementById('demoExit');
    if (ex) ex.addEventListener('click', () => { exitDemoMode(); });
    return true;
  };
  if (mount()) return;
  let tries = 0;
  const iv = setInterval(() => { if (mount() || ++tries > 20) clearInterval(iv); }, 100);
}

// Shift every source the real Comeback detector reads. This is demo-only and
// runs after buildDemoState(), so testing an absence never touches saved data.
function _shiftDemoActivity(days) {
  const gap = Math.max(0, Number(days) || 0);
  if (!gap) return;
  const ms = gap * 86400000;
  const shiftISO = (value) => {
    if (!value || typeof value !== 'string') return value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return _keyFromDayNum(_dayNum(value) - gap);
    const time = new Date(value).getTime();
    return isNaN(time) ? value : new Date(time - ms).toISOString();
  };
  const shiftTimestamp = (value) => Number.isFinite(Number(value)) ? Number(value) - ms : value;

  const history = state.action && Array.isArray(state.action.completionHistory) ? state.action.completionHistory : [];
  history.forEach((entry) => { if (entry && entry.date) entry.date = shiftISO(entry.date); });
  if (state.streak) {
    if (state.streak.lastCheckDate) state.streak.lastCheckDate = shiftISO(state.streak.lastCheckDate).slice(0, 10);
    if (Array.isArray(state.streak.history)) state.streak.history = state.streak.history.map(shiftISO);
  }
  (Array.isArray(state.checkins) ? state.checkins : []).forEach((entry) => {
    if (!entry) return;
    if (entry.iso) entry.iso = shiftISO(entry.iso).slice(0, 10);
    if (entry.ts) entry.ts = shiftTimestamp(entry.ts);
  });
  const reflections = state.reflection && Array.isArray(state.reflection.entries) ? state.reflection.entries : [];
  reflections.forEach((entry) => { if (entry && entry.iso) entry.iso = shiftISO(entry.iso).slice(0, 10); });
  const sessions = state.deepwork && Array.isArray(state.deepwork.sessions) ? state.deepwork.sessions : [];
  sessions.forEach((entry) => {
    if (!entry) return;
    if (entry.iso) entry.iso = shiftISO(entry.iso).slice(0, 10);
    if (entry.dateISO) entry.dateISO = shiftISO(entry.dateISO).slice(0, 10);
  });
  (Array.isArray(state.proofEvents) ? state.proofEvents : []).forEach((entry) => {
    if (!entry) return;
    if (entry.iso) entry.iso = shiftISO(entry.iso);
    if (entry.ts) entry.ts = shiftTimestamp(entry.ts);
  });
  if (state.meta && state.meta.lastVisit) state.meta.lastVisit = shiftISO(state.meta.lastVisit).slice(0, 10);
}

// Every avatar must open before today's main Action has been confirmed, even if
// another demo path or a previous in-memory persona introduced a same-day
// receipt. Keep all older history and supporting activity intact.
function _resetDemoTodayAction() {
  try {
    const today = (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10);
    const dayOf = (value) => {
      try { return (typeof isoToLocalDay === 'function') ? isoToLocalDay(value) : String(value || '').slice(0, 10); }
      catch (e) { return String(value || '').slice(0, 10); }
    };
    if (state.action && Array.isArray(state.action.completionHistory)) {
      state.action.completionHistory = state.action.completionHistory.filter((entry) => !entry || dayOf(entry.date) !== today);
    }
    if (state.streak && Array.isArray(state.streak.history)) {
      state.streak.history = state.streak.history.filter((day) => dayOf(day) !== today);
      if (dayOf(state.streak.lastCheckDate) === today) state.streak.lastCheckDate = '';
    }
    if (Array.isArray(state.proofEvents)) {
      state.proofEvents = state.proofEvents.filter((entry) => !entry || entry.type !== 'action-complete' || dayOf(entry.iso || entry.ts) !== today);
    }
  } catch (e) {}
}

// Leaving a demo, from anywhere (v1096). Strips ?demo= AND records the choice,
// because on an installed app the launch URL is not something the user can
// edit: if it still carries ?demo=, every relaunch would drop them back into
// someone else's Memento with no way out. The flag is cleared the moment a
// demo is opened deliberately again, so it never blocks a real demo link.
function exitDemoMode() {
  try { localStorage.setItem('memento_demo_off', '1'); } catch (e) {}
  try { localStorage.setItem('memento_view', ''); } catch (e) {}
  location.href = location.pathname;
}
function enterDemoMode(persona) {
  try { localStorage.removeItem('memento_demo_off'); } catch (e) {}
  if (new RegExp('[?&]demo=' + persona + '(&|$)').test(location.search)) location.reload();
  else location.search = '?demo=' + persona;
}
function applyDemoModeIfRequested() {
  const m = /[?&]demo=([a-z0-9]+)/i.exec(location.search);
  if (!m) return;
  // The user asked to leave a demo. Honour that over the URL, but ONLY in the
  // installed app, where the launch URL is fixed and they cannot edit it. In a
  // browser a ?demo= address is always something they just chose, so it wins.
  try {
    const installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
      || window.navigator.standalone === true;
    if (installed && localStorage.getItem('memento_demo_off') === '1') {
      if (history && history.replaceState) history.replaceState(null, '', location.pathname);
      return;
    }
  } catch (e) {}
  DEMO_MODE = true;
  const raw = (m[1] || '').toLowerCase();
  const persona = DEMO_PERSONAS[raw] ? raw : 'creator';
  try { state = buildDemoState(persona); } catch (e) { DEMO_MODE = false; return; }
  const comebackRaw = new URLSearchParams(location.search).get('comeback');
  const comebackDays = comebackRaw === null ? null : Number(comebackRaw);
  if ([0, 1, 3, 7, 14].indexOf(comebackDays) >= 0) {
    // "Missed 1 day" means yesterday was fully blank, so the most recent
    // activity belongs two date cells back. Active today remains an exact 0.
    _shiftDemoActivity(comebackDays === 0 ? 0 : comebackDays + 1);
    state.dev.comebackMissedDays = comebackDays;
  }
  _resetDemoTodayAction();
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
        _shiftDemoActivity(days == null ? 3 : days);
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
        // THE MERGE foundation (2026-08-19): the old '/api/feedback' target
        // never existed, so "Sent." was a lie. Feedback now lands in the
        // submit-feedback edge function -> public.feedback table.
        const _fbUrl = (window.MEMENTO_SUPABASE_URL || 'https://lipuxymlsowdrbummqxw.supabase.co') + '/functions/v1/submit-feedback';
        fetch(_fbUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': window.MEMENTO_SUPABASE_ANON || '',
            'Authorization': 'Bearer ' + (window.MEMENTO_SUPABASE_ANON || ''),
            'x-memento-device': (typeof Analytics !== 'undefined' && Analytics.deviceId) ? Analytics.deviceId() : 'unknown'
          },
          body: JSON.stringify({ kind: item.kind, text: item.text, email: (state.support.contacts && state.support.contacts.email) || '', appVersion: String(window.MEMENTO_VERSION || '') })
        })
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
