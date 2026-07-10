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
  }
};
// Malik's real Apple Notes (20), seeded into the founder demo so Notes loads lived-in.
const APPLE_NOTES_SEED = [{"id": "rn_apple_00_2026-06-08", "iso": "2026-06-08", "date": "June 8, 2026", "html": "<div><h1>Add support tab to memento!</h1></div>\n<div>So they can contact me, discord, kinda like JDS labs having great support </div>\n<div><br></div>\n<div>Win across different fronts! You can’t compete in all areas so dominate in others!</div>\n<div><br></div>\n<div>Add apple notes to memento folder so Claude can show me what it looks like if everything is ported in</div>\n<div><br></div>\n<div>Send a bunch of photos as well</div>", "text": "Add support tab to memento! So they can contact me, discord, kinda like JDS labs having great support Win across different fronts! You can’t compete in all areas so dominate in others! Add apple notes to memento folder so Claude can show me what it looks like if everything is ported in Send a bunch of photos as well", "title": "Add support tab to memento!", "folder": null, "updated": 1780000000000}, {"id": "rn_apple_01_2026-06-06", "iso": "2026-06-06", "date": "June 6, 2026", "html": "<div><h1>BIG BUSNIESS NOTES:</h1></div>\n<div><br></div>\n<div>Money = Value</div>\n<div>Riches = Value x Scale</div>\n<div><br></div>\n<div>Unique, expensive, sticky, air</div>\n<div><br></div>\n<div>Take action, then motivation follows</div>\n<div><br></div>\n<div>Software with accumulating personal data. This is the one that matters for you. Apps that get more valuable the longer you use them justify ongoing payment because leaving means losing your history. This is the only &quotapp&quot answer that escapes the free-information problem, because the value isn't information, it's your own accumulated data.</div>\n<div>Identity/status products. Premium memberships where the buyer gets a badge, a tier, recognition. People pay for who it makes them, not what it does.</div>\n<div><br></div>\n<div>Memento means memorial, which is something that you always come back to. So what if I had it so almost like Cove with Lenalifts where they add in their own personal information to make it a lot stickier and a lot more personal? So it makes them not want to sell it. So like what if I had them add something that was like much more personal and much deeper towards the very beginning? So that way it feels like Memento is actually theirs, not just like a random ass system they have to go through!!!</div>\n<div><br></div>\n<div>You can’t either help a very small number of people a lot or a very large number of people a little</div>\n<div>info business x sass digital</div>\n<div><br></div>\n<div><b>Now the hard truth about Memento and stupid money</b><br></div>\n<div>You're circling the right insight and I want to be direct about it: Memento, as currently conceived, is structurally one of the hardest possible vehicles to make stupid money with. Not because it's a bad idea. Because of three stacked problems:</div>\n<ol>\n<li>It's B2C (individual discretionary money, the lowest-willingness-to-pay buyer)</li>\n<li>It's wellness (the most churn-prone, most &quotnice to have&quot category in B2C)</li>\n<li>It's ambient/identity-level (no transactional trigger, the value is diffuse)</li>\n</ol>\n<div><br></div>\n<div><br></div>\n<div>Memento solves that as the way you make progress is by connecting to a goal emotionally and making it the most important thing to your brain and make progress towards it consistency by focusing on the right actions to actualize that goal </div>\n<div><br></div>\n<div>Version B, which I think is the actual claim hiding underneath: the brain doesn't move toward wants, it moves toward needs and the closest available pleasures. Your goals are far away, abstract, and optional. Your phone is close, concrete, and rewarding. So your brain, doing its job correctly, picks the phone. You're not lazy. You're not even uncommitted. You're a normal human nervous system running its default program, which was never designed for abstract long-term goals in a high-comfort environment.</div>\n<div><br></div>\n<div><br></div>\n<div><br></div>\n<div><br></div>\n<div>Add this nice little grain to background for memento ^^^</div>\n<div>Don’t work open to time</div>\n<div>Work open to goal. As in work until the goal/task is accomplished </div>\n<div><br></div>\n<div>Right now I have a big audience, I just now need to offer something in exchange for dollars but it needs to be valuable.</div>\n<div><br></div>\n<div>Not scamy like a course or skool community but something actually useful and valueable. I want it to be high priced and extremely useful and valueable. A $1000 product that can be sliced and broken down for smaller offers. </div>\n<div><br></div>\n<div>But also, you are NOT going to reinvent the wheel. Create something that already exists but make it better with your own spin on it. You have all the best tools in history and nothing but leverage. Use them. You can also focus on perceived value as well as that alone can make a product 10x more expensive. </div>\n<div><br></div>\n<div>You can boil anything down to it’s fundemental parts and lower its value. <b>Don’t let that stop you. </b><br></div>\n<div><br></div>\n<div>Oversimplfying anything:</div>\n<div><br></div>\n<div>Headphones - just play music?</div>\n<div>Computer - Let’s you do something a little faster?</div>\n<div>Keyboard - You just type?</div>\n<div>Ferrari - A car?</div>\n<div>Lebron - You just put a ball into a net?</div>\n<div>Chatgpt - A good auto-correct</div>\n<div><br></div>\n<div>You’re not claiming to be a therapist or a life guru. You’re a 20-something guy who went through the same directionlessness your audience is feeling and figured some things out. That’s the frame. You’re not selling “I will give your life meaning”  -  you’re selling “I’ll help you get clear on what YOU already want but can’t articulate yet.” That’s a much more honest and defensible position. Memento’s whole Clarity Protocol is built on this exact premise and it works.</div>\n<div>The people who’d book a session aren’t looking for a enlightened master. They’re looking for someone who gets it and will ask them the right questions. You can do that.</div>\n<div><br></div>\n<div>I need to explain and sell the pain and have them pay for a solution. Give away secrets, sell the implementation</div>\n<div><br></div>\n<div>What is value? Problem solving. Fixing pain. </div>\n<div><br></div>\n<div>For the value question, lowering the bottom side is more important. DO NOT FORGET TO LOOK AT VALUE ENHANCERS IN THE OTHER PART OF THE BOOK</div>\n<div><br></div>\n<div>Avatar: Younger 16-30 year old ambitious person who wants to actually get more out of life but can’t escape the traps of the modern world. Mostly men.</div>\n<div><br></div>\n<div>Pain: Don’t know what they want. Can’t focus. No motivation. Huge screen time. Doomscrolling. Brain rot</div>\n<div><br></div>\n<div>Dream outcome: To feel locked in. To have a purpose, mission, goal, something worth suffering for. A better philosophy of life moving forward. To know what they're building, waking up with purpose, not being pulled by their phone because they have something real t<div>...</div>", "text": "BIG BUSNIESS NOTES: Money = Value Riches = Value x Scale Unique, expensive, sticky, air Take action, then motivation follows Software with accumulating personal data. This is the one that matters for you. Apps that get more valuable the longer you use them justify ongoing payment because leaving means losing your history. This is the only \"app\" answer that escapes the free-information problem, because the value isn't information, it's your own accumulated data. Identity/status products. Premium memberships where the buyer gets a badge, a tier, recognition. People pay for who it makes them, not what it does. Memento means memorial, which is something that you always come back to. So what if I had it so almost like Cove with Lenalifts where they add in their own personal information to make it a lot stickier and a lot more personal? So it makes them not want to sell it. So like what if I had them add something that was like much more personal and much deeper towards the very beginning? So that way it feels like Memento is actually theirs, not just like a random ass system they have to go through!!! You can’t either help a very small number of people a lot or a very large number of people a little info business x sass digital Now the hard truth about Memento and stupid money You're circling the right insight and I want to be direct about it: Memento, as currently conceived, is structurally one of the hardest possible vehicles to make stupid money with. Not because it's a bad idea. Because of three stacked problems: It's B2C (individual discretionary money, the lowest-willingness-to-pay buyer) It's wellness (the most churn-prone, most \"nice to have\" category in B2C) It's ambient/identity-level (no transactional trigger, the value is diffuse) Memento solves that as the way you make progress is by connecting to a goal emotionally and making it the most important thing to your brain and make progress towards it consistency by focusing on the right actions to actualize that goal Version B, which I think is the actual claim hiding underneath: the brain doesn't move toward wants, it moves toward needs and the closest available pleasures. Your goals are far away, abstract, and optional. Your phone is close, concrete, and rewarding. So your brain, doing its job correctly, picks the phone. You're not lazy. You're not even uncommitted. You're a normal human nervous system running its default program, which was never designed for abstract long-term goals in a high-comfort environment. Add this nice little grain to background for memento ^^^ Don’t work open to time Work open to goal. As in work until the goal/task is accomplished Right now I have a big audience, I just now need to offer something in exchange for dollars but it needs to be valuable. Not scamy like a course or skool community but something actually useful and valueable. I want it to be high priced and extremely useful and valueable. A $1000 product that can be sliced and broken down for smaller offers. But also, you are NOT going to reinvent the wheel. Create something that already exists but make it better with your own spin on it. You have all the best tools in history and nothing but leverage. Use them. You can also focus on perceived value as well as that alone can make a product 10x more expensive. You can boil anything down to it’s fundemental parts and lower its value. Don’t let that stop you. Oversimplfying anything: Headphones - just play music? Computer - Let’s you do something a little faster? Keyboard - You just type? Ferrari - A car? Lebron - You just put a ball into a net? Chatgpt - A good auto-correct You’re not claiming to be a therapist or a life guru. You’re a 20-something guy who went through the same directionlessness your audience is feeling and figured some things out. That’s the frame. You’re not selling “I will give your life meaning”  -  you’re selling “I’ll help you get clear on what YOU already want but can’t articulate yet.” That’s a much more honest and defensible position. Memento’s whole Clarity Protocol is built on this exact premise and it works. The people who’d book a session aren’t looking for a enlightened master. They’re looking for someone who gets it and will ask them the right questions. You can do that. I need to explain and sell the pain and have them pay for a solution. Give away secrets, sell the implementation What is value? Problem solving. Fixing pain. For the value question, lowering the bottom side is more important. DO NOT FORGET TO LOOK AT VALUE ENHANCERS IN THE OTHER PART OF THE BOOK Avatar: Younger 16-30 year old ambitious person who wants to actually get more out of life but can’t escape the traps of the modern world. Mostly men. Pain: Don’t know what they want. Can’t focus. No motivation. Huge screen time. Doomscrolling. Brain rot Dream outcome: To feel locked in. To have a purpose, mission, goal, something worth suffering for. A better philosophy of life moving forward. To know what they're building, waking up with purpose, not being pulled by their phone because they have something real t ...", "title": "BIG BUSNIESS NOTES:", "folder": null, "updated": 1780000001000}, {"id": "rn_apple_02_2026-06-06", "iso": "2026-06-06", "date": "June 6, 2026", "html": "<div><h1>Jackie Meal Plan</h1></div>\n<div>Breakfast: </div>\n<div>Overnight oats</div>\n<div>Keifer </div>\n<div>Protein powder</div>\n<div><br></div>\n<div>Lunch/Mid day:</div>\n<div>Rice and chicken with queso, lettuce, chicken, shredded cheese, rice, and beans with siete chips. like Salsaritas</div>\n<div><br></div>\n<div>Snacks:</div>\n<div>then throughout the day probably protein shakes, protein snacks, maybe a plate of eggs (but not as consistently) smoothies, etc</div>\n<div><br></div>\n<div>Dinner:</div>", "text": "Jackie Meal Plan Breakfast: Overnight oats Keifer Protein powder Lunch/Mid day: Rice and chicken with queso, lettuce, chicken, shredded cheese, rice, and beans with siete chips. like Salsaritas Snacks: then throughout the day probably protein shakes, protein snacks, maybe a plate of eggs (but not as consistently) smoothies, etc Dinner:", "title": "Jackie Meal Plan", "folder": null, "updated": 1780000002000}, {"id": "rn_apple_03_2026-06-06", "iso": "2026-06-06", "date": "June 6, 2026", "html": "<div><h1>command center 2.0 look at render!!</h1></div>\n<div>. A $50+/mo product has to feel solid: no data loss, no auth bugs, no jank, no breaking on weird edge cases.</div>", "text": "command center 2.0 look at render!! . A $50+/mo product has to feel solid: no data loss, no auth bugs, no jank, no breaking on weird edge cases.", "title": "command center 2.0 look at render!!", "folder": null, "updated": 1780000003000}, {"id": "rn_apple_04_2026-06-06", "iso": "2026-06-06", "date": "June 6, 2026", "html": "<div><h1>People who use their channel for product </h1></div>\n<div>Vsauce</div>\n<div>Oliur</div>\n<div>Monke</div>\n<div>Alex h</div>\n<div>Alex otos</div>\n<div>Amy wang</div>\n<div>Exurbia</div>\n<div>AI guys. Nick I think</div>\n<div>Dan koe. Eden</div>\n<div>Ed Lawerence </div>\n<div>Kurzesgat</div>\n<div>Milktooth</div>", "text": "People who use their channel for product Vsauce Oliur Monke Alex h Alex otos Amy wang Exurbia AI guys. Nick I think Dan koe. Eden Ed Lawerence Kurzesgat Milktooth", "title": "People who use their channel for product", "folder": null, "updated": 1780000004000}, {"id": "rn_apple_05_2026-06-05", "iso": "2026-06-05", "date": "June 5, 2026", "html": "<div># Memento v19: Daily Cockpit + Focus &amp Time + Life &amp Memory + local backend + instant-load</div>\n<div><br></div>\n<div>## Context</div>\n<div>v18 is strong but mostly self-contained. Malik wants v19 to push Memento toward a &quot$200 prosumer operating system&quot where goals, capture, focus, time, proof, and memory meet, plus real accounts and social proof. This is an overnight build worked entirely in a NEW `memento-v19.html` (copied from v18 as the safe save). Build in priority order, &quotas far as I can,&quot each piece ADDITIVE, offline-safe, and non-breaking (never regress v18 behavior). Most features are cheap because they ride the existing `proofEvents` data spine + AI pipeline + module/Sheet patterns, they're new views/prompts over data already collected.</div>\n<div><br></div>\n<div>Selected scope (from Malik): **Daily Cockpit**, **Focus &amp Time**, **Life &amp Memory** clusters + **local backend** (accounts + cloud-sync + live completion counter) + **loading fix**. Deferred (NOT tonight): AI Intelligence cluster (#4/#8/#10), Integration Hub / external calendar sync (#7, needs Malik's OAuth accounts), full PWA background push (#6), social feed/leaderboards (#20), collaboration (#18), freeform layouts (#19).</div>\n<div><br></div>\n<div>Non-negotiable principle: **the app must keep working exactly as v18 when the backend is unreachable** (Mac asleep/offline). Backend, sync, and counter are enhancements that fail silently. Every new state field is added via `deepMerge`/`migrateState` (additive, never wipes existing data).</div>\n<div><br></div>\n<div>File: NEW `/Users/malikpeace/Downloads/MEMENTO/memento-v19.html` (copy of v18) + new `memento-backend.py`. Rules: never read the HTML in full (grep first), no em dashes, keep console clean, back up to `overnight/` before big changes, verify each piece on the preview before moving on.</div>\n<div><br></div>\n<div>## Build order (most value first; stop a feature after ~2-3 failed attempts and move on)</div>\n<div>0. v19 safe copy + backup. 1. Loading fix (quick win). 2. Daily Cockpit. 3. Focus &amp Time. 4. Life &amp Memory. 5. Local backend (accounts + sync + counter). Re-verify dark + light mode and console after each.</div>\n<div><br></div>\n<div>## Part 0 - v19 setup</div>\n<div>`cp memento-v18.html memento-v19.html`; back up both to `overnight/`. Point the preview + backend at v19. (Update the local preview copy path to serve v19.)</div>\n<div><br></div>\n<div>## Part 1 - Daily Cockpit cluster</div>\n<div>- **Projects -&gt Milestones under the Neutron Star (#3):** add `state.projects = [{id,title,goalLinked,milestones:[{id,title,horizon,done}]}]` (additive). Hierarchy Goal(Neutron Star) -&gt Project -&gt Milestone -&gt This Week -&gt Today; today's action can link to a project/milestone. Reuse the existing apl-ladder visual (`renderActionPlan`/`.apl-stepper` ~L18430) and `primaryAction.path[]`.</div>\n<div>- **Universal Capture Inbox (#2):** `state.inbox = [{id,text,ts,bucket}]`. A frictionless quick-add (a persistent &quot+&quot affordance, e.g. in the command center / a global shortcut) that drops anything into the inbox; a triage UI that sorts each item into Action / Reflection / Vivere / Friction / Proof / Project (optional AI suggestion via the existing AI call ~L22784). Reuse the Sheet pattern.</div>\n<div>- **Command Center 2.0 (#5):** evolve `renderCommandCenter` (~L28520) into the cockpit: today's One Thing + next focus block + energy + latest proof + a resurfaced Vivere memory + inbox count + one light AI recommendation. Keep cohesive, accent-aware, offline-safe.</div>\n<div><br></div>\n<div>## Part 2 - Focus &amp Time cluster</div>\n<div>- **Deep Work Studio (#9):** extend the deep-work timer/overlay (`#dwFocusOverlay`, `state.deepwork.sessions`): pre-session intention (link to today's action), distraction parking lot (captures route to the inbox/friction), produced-proof prompt, post-session review, and focus analytics (sessions, total time, best time-of-day) from existing sessions + `proofEvents`.</div>\n<div>- **Light in-app time-blocking (#1, no external sync):** `state.timeblocks = [{id,day,start,end,label,type,linkedId}]`. A day/week planner to schedule the One Thing / deep work / Vivere / reviews into blocks; optional AI &quotsuggest a schedule.&quot External calendar sync is explicitly deferred (Integration Hub).</div>\n<div><br></div>\n<div>## Part 3 - Life &amp Memory cluster</div>\n<div>- **Vivere Yearbook (#12):** &quotThe Year I Lived&quot view aggregating Vivere memories/people/places/gratitude/alive-days/lessons by month + a share card. Build on existing `state.vivere` (memories, aliveList, categories).</div>\n<div>- **Readwise-style resurfacing (#13):** resurface old reflections/memories/lessons/commitments on a spaced cadence (reuse `vivere.resurfacedMemoryIds`); surface in the cockpit / a daily &quotOn this day&quot card.</div>\n<div>- **Energy correlation (#14):** correlate `state.lifestats` (sleep/diet/exercise/mood) with action completion + deep work; a small insights panel (&quotyou complete more after good sleep&quot). Compute from existing history.</div>\n<div>- **Personal CRM (#17):** `state.people = [{id,name,lastContact,notes,memories[]}]`; a &quotpeople I care about&quot list with last-talked + gentle reach-out nudges. Fits the Vivere side.</div>\n<div><br></div>\n<div>## Part 4 - Local backend + loading (infra)</div>\n<div>(unchanged from the design below: Python stdlib + sqlite3, single-origin server, offline-safe frontend hooks, loading fix). Now targets `memento-v19.html`.</div>\n<div><br></div>\n<div>## Architecture decision</div>\n<div>- **Backend = Python 3 standard library only** (`http.server` + `sqlite3`, both built-in, no `pip install`, no node). Confirmed: python3 available, node/npx not. New file `memento-backend.py` in the project; data in `memento.db` (sqlite).</div>\n<div>- **Single origin:** the backend serves BOTH the app HTML (`/` -&gt `memento-v18.html` from disk) and the JSON API (`/api/*`) on <div>...</div>", "text": "# Memento v19: Daily Cockpit + Focus & Time + Life & Memory + local backend + instant-load ## Context v18 is strong but mostly self-contained. Malik wants v19 to push Memento toward a \"$200 prosumer operating system\" where goals, capture, focus, time, proof, and memory meet, plus real accounts and social proof. This is an overnight build worked entirely in a NEW `memento-v19.html` (copied from v18 as the safe save). Build in priority order, \"as far as I can,\" each piece ADDITIVE, offline-safe, and non-breaking (never regress v18 behavior). Most features are cheap because they ride the existing `proofEvents` data spine + AI pipeline + module/Sheet patterns, they're new views/prompts over data already collected. Selected scope (from Malik): **Daily Cockpit**, **Focus & Time**, **Life & Memory** clusters + **local backend** (accounts + cloud-sync + live completion counter) + **loading fix**. Deferred (NOT tonight): AI Intelligence cluster (#4/#8/#10), Integration Hub / external calendar sync (#7, needs Malik's OAuth accounts), full PWA background push (#6), social feed/leaderboards (#20), collaboration (#18), freeform layouts (#19). Non-negotiable principle: **the app must keep working exactly as v18 when the backend is unreachable** (Mac asleep/offline). Backend, sync, and counter are enhancements that fail silently. Every new state field is added via `deepMerge`/`migrateState` (additive, never wipes existing data). File: NEW `/Users/malikpeace/Downloads/MEMENTO/memento-v19.html` (copy of v18) + new `memento-backend.py`. Rules: never read the HTML in full (grep first), no em dashes, keep console clean, back up to `overnight/` before big changes, verify each piece on the preview before moving on. ## Build order (most value first; stop a feature after ~2-3 failed attempts and move on) 0. v19 safe copy + backup. 1. Loading fix (quick win). 2. Daily Cockpit. 3. Focus & Time. 4. Life & Memory. 5. Local backend (accounts + sync + counter). Re-verify dark + light mode and console after each. ## Part 0 - v19 setup `cp memento-v18.html memento-v19.html`; back up both to `overnight/`. Point the preview + backend at v19. (Update the local preview copy path to serve v19.) ## Part 1 - Daily Cockpit cluster - **Projects -> Milestones under the Neutron Star (#3):** add `state.projects = [{id,title,goalLinked,milestones:[{id,title,horizon,done}]}]` (additive). Hierarchy Goal(Neutron Star) -> Project -> Milestone -> This Week -> Today; today's action can link to a project/milestone. Reuse the existing apl-ladder visual (`renderActionPlan`/`.apl-stepper` ~L18430) and `primaryAction.path[]`. - **Universal Capture Inbox (#2):** `state.inbox = [{id,text,ts,bucket}]`. A frictionless quick-add (a persistent \"+\" affordance, e.g. in the command center / a global shortcut) that drops anything into the inbox; a triage UI that sorts each item into Action / Reflection / Vivere / Friction / Proof / Project (optional AI suggestion via the existing AI call ~L22784). Reuse the Sheet pattern. - **Command Center 2.0 (#5):** evolve `renderCommandCenter` (~L28520) into the cockpit: today's One Thing + next focus block + energy + latest proof + a resurfaced Vivere memory + inbox count + one light AI recommendation. Keep cohesive, accent-aware, offline-safe. ## Part 2 - Focus & Time cluster - **Deep Work Studio (#9):** extend the deep-work timer/overlay (`#dwFocusOverlay`, `state.deepwork.sessions`): pre-session intention (link to today's action), distraction parking lot (captures route to the inbox/friction), produced-proof prompt, post-session review, and focus analytics (sessions, total time, best time-of-day) from existing sessions + `proofEvents`. - **Light in-app time-blocking (#1, no external sync):** `state.timeblocks = [{id,day,start,end,label,type,linkedId}]`. A day/week planner to schedule the One Thing / deep work / Vivere / reviews into blocks; optional AI \"suggest a schedule.\" External calendar sync is explicitly deferred (Integration Hub). ## Part 3 - Life & Memory cluster - **Vivere Yearbook (#12):** \"The Year I Lived\" view aggregating Vivere memories/people/places/gratitude/alive-days/lessons by month + a share card. Build on existing `state.vivere` (memories, aliveList, categories). - **Readwise-style resurfacing (#13):** resurface old reflections/memories/lessons/commitments on a spaced cadence (reuse `vivere.resurfacedMemoryIds`); surface in the cockpit / a daily \"On this day\" card. - **Energy correlation (#14):** correlate `state.lifestats` (sleep/diet/exercise/mood) with action completion + deep work; a small insights panel (\"you complete more after good sleep\"). Compute from existing history. - **Personal CRM (#17):** `state.people = [{id,name,lastContact,notes,memories[]}]`; a \"people I care about\" list with last-talked + gentle reach-out nudges. Fits the Vivere side. ## Part 4 - Local backend + loading (infra) (unchanged from the design below: Python stdlib + sqlite3, single-origin server, offline-safe frontend hooks, loading fix). Now targets `memento-v19.html`. ## Architecture decision - **Backend = Python 3 standard library only** (`http.server` + `sqlite3`, both built-in, no `pip install`, no node). Confirmed: python3 available, node/npx not. New file `memento-backend.py` in the project; data in `memento.db` (sqlite). - **Single origin:** the backend serves BOTH the app HTML (`/` -> `memento-v18.html` from disk) and the JSON API (`/api/*`) on ...", "title": "# Memento v19: Daily Cockpit + Focus & Time + Life & Memory + lo", "folder": null, "updated": 1780000005000}, {"id": "rn_apple_06_2026-06-05", "iso": "2026-06-05", "date": "June 5, 2026", "html": "<div>So I'm about to go to bed soon and I want you to go back into Max Mode and give you another long bone to chew on. What I'm trying to figure out is, first question is, can you build up a social network in the background for me and then manage it for me? I know that sounds extremely complex because I don't really know too much about it at all. But I do want to have some sort of social aspect to Memento so there's at least some form of social aspect. Like, for example, if somebody does complete their task for today, I want to have like a real database of people who use the app to show that like X amount of people have also completed their task as well. I think that would be extremely useful and good and something that would make it significantly more valuable.  Same with a backend so that somebody can actually log in and put in their email and actually like sign into their own account on Memento. I know that right now it's not shipped, but is it something that is potentially possible even without fully shipping the product? And if we can, is it something that you can do for yourself or is there something that I personally need to do to make it work?  Also, is there any way so that all of Memento will load the second somebody opens the app? Because I noticed that sometimes for the module page, for example, if you scroll down, it's a bit blank and then all the modules loaded. And I was thinking about that. So again, I don't know anything about coding. Is there a way that as soon as they open it, everything just kind of just loads? Because I know that for some things, there's like a loading screen. Is that something that is possible just so that there is no lag? so even like potentially for my phone like if it loads it up would it be easier if it just took a like maybe two seconds to load every single thing up before it actually presented it and not like a fake loading script like an actual genuine loading screen if something needs to load again i don't know anything about it everything could be instantaneous so that could just be a useless feature i don't know </div>\n<div><br></div>\n<div># Memento: Local backend (accounts + cloud-sync + live &quotcompleted today&quot counter) + instant-load polish</div>\n<div><br></div>\n<div>## Context</div>\n<div>Memento is currently a single offline HTML file (`memento-v18.html`) storing everything in `localStorage` (key `memento_v5`). Malik wants (1) a **social proof counter** (&quotX people also completed their action today&quot), (2) **email accounts with cloud-sync** so a user's data saves to their account and follows them across devices, and (3) the dashboard to **load fully before it's shown** (no modules popping in on scroll). Decisions: build a **local backend on the Mac first** (no signups, I build + run it); start with the **completion counter + accounts/sync** (not friends/feed); **optimize the load first**, and if lag remains, ship a real loading gate (and keep it ready to toggle). Build **both** overnight, as far as possible.</div>\n<div><br></div>\n<div>Non-negotiable principle: **the app must keep working exactly as today when the backend is unreachable** (Mac asleep/offline). Accounts, sync, and the counter are enhancements layered on top of the existing localStorage app and must fail silently.</div>\n<div><br></div>\n<div>File: `/Users/malikpeace/Downloads/MEMENTO/memento-v18.html` + a NEW backend script. Rules: never read the HTML in full (grep first), no em dashes, keep console clean, back up before big changes (`overnight/`).</div>\n<div><br></div>\n<div>## Architecture decision</div>\n<div>- **Backend = Python 3 standard library only** (`http.server` + `sqlite3`, both built-in, no `pip install`, no node). Confirmed: python3 available, node/npx not. New file `memento-backend.py` in the project; data in `memento.db` (sqlite).</div>\n<div>- **Single origin:** the backend serves BOTH the app HTML (`/` -&gt `memento-v18.html` from disk) and the JSON API (`/api/*`) on one port (e.g. **8091**). This avoids all CORS/mixed-origin pain: the frontend calls relative `/api/...`. The MCP preview is pointed at `http://localhost:8091/`, and the phone uses one cloudflared tunnel to 8091, so app + API are always same-origin.</div>\n<div>- Auth: email + password, `hashlib.pbkdf2_hmac` salted hashes, random bearer tokens (`secrets`), tokens in a `sessions` table. Local/demo-grade but real. (Honest caveat: real public launch needs HTTPS [tunnel gives it], rate-limiting, and moving to a hosted DB on Malik's own account.)</div>\n<div><br></div>\n<div>## Part A - Backend (`memento-backend.py`)</div>\n<div>SQLite tables: `users(id, email UNIQUE, pw_hash, pw_salt, name, created_at)`, `sessions(token PRIMARY KEY, user_id, created_at)`, `user_state(user_id PRIMARY KEY, state_json, updated_at)`, `completions(user_id, day, UNIQUE(user_id, day))`.</div>\n<div>JSON endpoints (bearer token in `Authorization` header where noted):</div>\n<div>- `POST /api/signup` {email,password,name} -&gt {token, name}</div>\n<div>- `POST /api/login` {email,password} -&gt {token, name, state} (state = their saved blob or null)</div>\n<div>- `POST /api/logout` (token) -&gt ok</div>\n<div>- `GET /api/state` (token) -&gt {state}</div>\n<div>- `PUT /api/state` (token) {state} -&gt ok  (cloud-sync write)</div>\n<div>- `POST /api/complete` (token) {day} -&gt {count}  (idempotent per user/day; returns today's distinct-user count)</div>\n<div>- `GET /api/today-count` -&gt {count}  (no auth; powers the social counter for everyone)</div>\n<div>- `GET /api/health` -&gt ok</div>\n<div>Serve `/` and other paths as the static HTML from `/Users/malikpeace/Downloads/MEMENTO/memento-v18.html`. CORS headers permissive (so it also works if hit cross-origin). Run in background via Bash; log to `/tmp/memento-backend.log`.</div>\n<div><br></div>\n<div>## Part B - Frontend integration (additive, demo-guarded, offline-safe)</div>\n<div>Add a small `Backend` module in `memento-v18.html` (near other top-level objects). Config: `const<div>...</div>", "text": "So I'm about to go to bed soon and I want you to go back into Max Mode and give you another long bone to chew on. What I'm trying to figure out is, first question is, can you build up a social network in the background for me and then manage it for me? I know that sounds extremely complex because I don't really know too much about it at all. But I do want to have some sort of social aspect to Memento so there's at least some form of social aspect. Like, for example, if somebody does complete their task for today, I want to have like a real database of people who use the app to show that like X amount of people have also completed their task as well. I think that would be extremely useful and good and something that would make it significantly more valuable. Same with a backend so that somebody can actually log in and put in their email and actually like sign into their own account on Memento. I know that right now it's not shipped, but is it something that is potentially possible even without fully shipping the product? And if we can, is it something that you can do for yourself or is there something that I personally need to do to make it work? Also, is there any way so that all of Memento will load the second somebody opens the app? Because I noticed that sometimes for the module page, for example, if you scroll down, it's a bit blank and then all the modules loaded. And I was thinking about that. So again, I don't know anything about coding. Is there a way that as soon as they open it, everything just kind of just loads? Because I know that for some things, there's like a loading screen. Is that something that is possible just so that there is no lag? so even like potentially for my phone like if it loads it up would it be easier if it just took a like maybe two seconds to load every single thing up before it actually presented it and not like a fake loading script like an actual genuine loading screen if something needs to load again i don't know anything about it everything could be instantaneous so that could just be a useless feature i don't know # Memento: Local backend (accounts + cloud-sync + live \"completed today\" counter) + instant-load polish ## Context Memento is currently a single offline HTML file (`memento-v18.html`) storing everything in `localStorage` (key `memento_v5`). Malik wants (1) a **social proof counter** (\"X people also completed their action today\"), (2) **email accounts with cloud-sync** so a user's data saves to their account and follows them across devices, and (3) the dashboard to **load fully before it's shown** (no modules popping in on scroll). Decisions: build a **local backend on the Mac first** (no signups, I build + run it); start with the **completion counter + accounts/sync** (not friends/feed); **optimize the load first**, and if lag remains, ship a real loading gate (and keep it ready to toggle). Build **both** overnight, as far as possible. Non-negotiable principle: **the app must keep working exactly as today when the backend is unreachable** (Mac asleep/offline). Accounts, sync, and the counter are enhancements layered on top of the existing localStorage app and must fail silently. File: `/Users/malikpeace/Downloads/MEMENTO/memento-v18.html` + a NEW backend script. Rules: never read the HTML in full (grep first), no em dashes, keep console clean, back up before big changes (`overnight/`). ## Architecture decision - **Backend = Python 3 standard library only** (`http.server` + `sqlite3`, both built-in, no `pip install`, no node). Confirmed: python3 available, node/npx not. New file `memento-backend.py` in the project; data in `memento.db` (sqlite). - **Single origin:** the backend serves BOTH the app HTML (`/` -> `memento-v18.html` from disk) and the JSON API (`/api/*`) on one port (e.g. **8091**). This avoids all CORS/mixed-origin pain: the frontend calls relative `/api/...`. The MCP preview is pointed at `http://localhost:8091/`, and the phone uses one cloudflared tunnel to 8091, so app + API are always same-origin. - Auth: email + password, `hashlib.pbkdf2_hmac` salted hashes, random bearer tokens (`secrets`), tokens in a `sessions` table. Local/demo-grade but real. (Honest caveat: real public launch needs HTTPS [tunnel gives it], rate-limiting, and moving to a hosted DB on Malik's own account.) ## Part A - Backend (`memento-backend.py`) SQLite tables: `users(id, email UNIQUE, pw_hash, pw_salt, name, created_at)`, `sessions(token PRIMARY KEY, user_id, created_at)`, `user_state(user_id PRIMARY KEY, state_json, updated_at)`, `completions(user_id, day, UNIQUE(user_id, day))`. JSON endpoints (bearer token in `Authorization` header where noted): - `POST /api/signup` {email,password,name} -> {token, name} - `POST /api/login` {email,password} -> {token, name, state} (state = their saved blob or null) - `POST /api/logout` (token) -> ok - `GET /api/state` (token) -> {state} - `PUT /api/state` (token) {state} -> ok (cloud-sync write) - `POST /api/complete` (token) {day} -> {count} (idempotent per user/day; returns today's distinct-user count) - `GET /api/today-count` -> {count} (no auth; powers the social counter for everyone) - `GET /api/health` -> ok Serve `/` and other paths as the static HTML from `/Users/malikpeace/Downloads/MEMENTO/memento-v18.html`. CORS headers permissive (so it also works if hit cross-origin). Run in background via Bash; log to `/tmp/memento-backend.log`. ## Part B - Frontend integration (additive, demo-guarded, offline-safe) Add a small `Backend` module in `memento-v18.html` (near other top-level objects). Config: `const ...", "title": "So I'm about to go to bed soon and I want you to go back into Ma", "folder": null, "updated": 1780000006000}, {"id": "rn_apple_07_2026-06-05", "iso": "2026-06-05", "date": "June 5, 2026", "html": "<div><h1>Amazon </h1></div>\n<div>Window tint</div>\n<div>AirPods Pro</div>\n<div>Atlas headrest</div>\n<div>Zmf earpads</div>", "text": "Amazon Window tint AirPods Pro Atlas headrest Zmf earpads", "title": "Amazon", "folder": null, "updated": 1780000007000}, {"id": "rn_apple_08_2026-05-28", "iso": "2026-05-28", "date": "May 28, 2026", "html": "<div><b>Clarity drift, made visible.</b> Don't treat the Clarity Protocol as one-and-done. Re-run it on a cadence (quarterly, or triggered by a big life event) and show people how their WHAT and WHY have moved. &quotHere's the Neutron Star you wrote in March. Here's now.&quot A year in, that longitudinal record of who you've been becoming is something they literally cannot get anywhere else, because it only exists because they were there the whole time. That's the difference between storing data and the data being an asset.</div>\n<div><b>Pattern surfacing they can't self-observe.</b> After months of entries, the system can reflect back things a person can't see about themselves: you've named the same lead domino six times and never moved it; the goals you abandon all share a trait; your clarity tanks every time you do X. No human sees their own year-long patterns. The data can. That's a genuine month-14 reason to open it that month-1 can't provide.</div>\n<div><b>Accountability against your own past self.</b> This is the sharpest one. The daily check-in (&quotdid today move me toward the life I want&quot) only has teeth if it's measured against a real standard <i>you</i> set when you were clear. Day-1 you sets the bar. Month-14 you gets held to it, by your own words, which you can't argue with. That confrontation is the recurring emotional trigger that makes it a tool you rely on instead of a thing you log into.</div>\n<div><b>The becoming-record as something you'd mourn.</b> A year of reflections and decisions is the switching cost, but only if it's surfaced, not just stored in localStorage where nobody ever sees it again. &quotThis time last year&quot resurfacing. An end-of-year screenshottable artifact like the Neutron Star but for your whole year. Make the accumulation tangible and leaving feels like deleting yourself. Invisible data is not a moat.</div>\n<div>The underlying principle that decides all of it: the tools people pay for over years are where their <i>decisions get made</i>, not where outcomes get logged. Notion has low churn because it's where your thinking lives. A habit tracker churns because it's where you report after the fact. If someone opens Memento to <i>decide what to do today</i> and to <i>check themselves against who they want to be</i>, that's reliance. If they open it to tick boxes, that's a tracker, and $40/month won't hold.</div>\n<div>So the bar at $40/month, stated plainly: this month, did Memento help me make a real decision or stay aligned in a way I'd pay $40 for? That has to be true in month 14, not just month 1. &quotYou discovered your why&quot is a one-time value. &quotThis keeps confronting me and keeps me aligned, using everything it knows about me&quot is a recurring one. Build for the second and the price holds. Build for the first and you've got premium onboarding bolted to a commodity.</div>\n<div><br></div>\n<div><br></div>\n<div>Read it. Here's the honest verdict, grounded in what you actually built, not your description.</div>\n<div><b>Memento stores data. It doesn't compound it.</b> That's the gap between where it is and the $40/month tool you want. One exception, which I'll give you credit for. Everything else is pointing at tracking, not reliance.</div>\n<div>What I found in the code:</div>\n<div><b>The clarity answers get overwritten, not versioned.</b> <font face=\".AppleSystemUIFontMonospaced-Regular\"><span style=\"font-size: 12px\">state.clarity.answers.neutronStar = value</span></font>, single field, no history array. When someone re-runs the Clarity Protocol, the old Neutron Star is gone. There's no <font face=\".AppleSystemUIFontMonospaced-Regular\"><span style=\"font-size: 12px\">clarity.history</span></font>, no past snapshots, nothing. (The only &quotdrift&quot in your file is CSS star animations.) This kills the single strongest moat mechanic we talked about. &quotHere's who you said you were in March, here's now&quot is impossible in the current build, because March no longer exists the moment they re-run it. This is the most important thing to fix and it's a small change: push each completed clarity run into an array with a timestamp instead of overwriting.</div>\n<div><b>Reflection is a flat journal.</b> Each entry stores <font face=\".AppleSystemUIFontMonospaced-Regular\"><span style=\"font-size: 12px\">{date, text}</span></font> and renders newest-first. That's it. No tagging, no link to clarity, and critically, it's never resurfaced. Nothing ever says &quotyou wrote this 3 months ago&quot or surfaces a pattern across entries. A year in, it's a longer scroll, not an asset. Month 14 looks like month 1 with more history below the fold.</div>\n<div><b>Your one real compounding thread is </b><b><font face=\".AppleSystemUIFontMonospaced-Semibold\"><span style=\"font-size: 12px\">completionHistory</span></font></b><b>.</b> It stores <font face=\".AppleSystemUIFontMonospaced-Regular\"><span style=\"font-size: 12px\">{date, tier, actionText, planTitle}</span></font> and you actually feed it back into the AI to generate the next step instead of repeating. That's the right instinct, that's the thing pointing at reliance, and it's the model for everything else. The action module learns from your past. Nothing else does.</div>\n<div><b>Streak, deepwork, distraction, lifestats all log and never analyze.</b> Dates, minutes, counts. Pure tracking. No pass over them ever reflects anything back. That's habit-tracker DNA, and habit trackers churn.</div>\n<div><b>The moat is physically fragile.</b> Everything is in localStorage with no account or sync. So the &quotyear of who you've been becoming&quot that's supposed to be the switching cost can be wiped by clearing a browser, and is gone if they switch devices. A data moat that a cache-clear destroys isn't a moat. This is the same thing as your pre-launch backend/proxy gap, and it's not just a security item, it's load-bearing for retention. If the data is the reason they can't leave, the data has to actually persist and <div>...</div>", "text": "Clarity drift, made visible. Don't treat the Clarity Protocol as one-and-done. Re-run it on a cadence (quarterly, or triggered by a big life event) and show people how their WHAT and WHY have moved. \"Here's the Neutron Star you wrote in March. Here's now.\" A year in, that longitudinal record of who you've been becoming is something they literally cannot get anywhere else, because it only exists because they were there the whole time. That's the difference between storing data and the data being an asset. Pattern surfacing they can't self-observe. After months of entries, the system can reflect back things a person can't see about themselves: you've named the same lead domino six times and never moved it; the goals you abandon all share a trait; your clarity tanks every time you do X. No human sees their own year-long patterns. The data can. That's a genuine month-14 reason to open it that month-1 can't provide. Accountability against your own past self. This is the sharpest one. The daily check-in (\"did today move me toward the life I want\") only has teeth if it's measured against a real standard you set when you were clear. Day-1 you sets the bar. Month-14 you gets held to it, by your own words, which you can't argue with. That confrontation is the recurring emotional trigger that makes it a tool you rely on instead of a thing you log into. The becoming-record as something you'd mourn. A year of reflections and decisions is the switching cost, but only if it's surfaced, not just stored in localStorage where nobody ever sees it again. \"This time last year\" resurfacing. An end-of-year screenshottable artifact like the Neutron Star but for your whole year. Make the accumulation tangible and leaving feels like deleting yourself. Invisible data is not a moat. The underlying principle that decides all of it: the tools people pay for over years are where their decisions get made , not where outcomes get logged. Notion has low churn because it's where your thinking lives. A habit tracker churns because it's where you report after the fact. If someone opens Memento to decide what to do today and to check themselves against who they want to be , that's reliance. If they open it to tick boxes, that's a tracker, and $40/month won't hold. So the bar at $40/month, stated plainly: this month, did Memento help me make a real decision or stay aligned in a way I'd pay $40 for? That has to be true in month 14, not just month 1. \"You discovered your why\" is a one-time value. \"This keeps confronting me and keeps me aligned, using everything it knows about me\" is a recurring one. Build for the second and the price holds. Build for the first and you've got premium onboarding bolted to a commodity. Read it. Here's the honest verdict, grounded in what you actually built, not your description. Memento stores data. It doesn't compound it. That's the gap between where it is and the $40/month tool you want. One exception, which I'll give you credit for. Everything else is pointing at tracking, not reliance. What I found in the code: The clarity answers get overwritten, not versioned. state.clarity.answers.neutronStar = value , single field, no history array. When someone re-runs the Clarity Protocol, the old Neutron Star is gone. There's no clarity.history , no past snapshots, nothing. (The only \"drift\" in your file is CSS star animations.) This kills the single strongest moat mechanic we talked about. \"Here's who you said you were in March, here's now\" is impossible in the current build, because March no longer exists the moment they re-run it. This is the most important thing to fix and it's a small change: push each completed clarity run into an array with a timestamp instead of overwriting. Reflection is a flat journal. Each entry stores {date, text} and renders newest-first. That's it. No tagging, no link to clarity, and critically, it's never resurfaced. Nothing ever says \"you wrote this 3 months ago\" or surfaces a pattern across entries. A year in, it's a longer scroll, not an asset. Month 14 looks like month 1 with more history below the fold. Your one real compounding thread is completionHistory . It stores {date, tier, actionText, planTitle} and you actually feed it back into the AI to generate the next step instead of repeating. That's the right instinct, that's the thing pointing at reliance, and it's the model for everything else. The action module learns from your past. Nothing else does. Streak, deepwork, distraction, lifestats all log and never analyze. Dates, minutes, counts. Pure tracking. No pass over them ever reflects anything back. That's habit-tracker DNA, and habit trackers churn. The moat is physically fragile. Everything is in localStorage with no account or sync. So the \"year of who you've been becoming\" that's supposed to be the switching cost can be wiped by clearing a browser, and is gone if they switch devices. A data moat that a cache-clear destroys isn't a moat. This is the same thing as your pre-launch backend/proxy gap, and it's not just a security item, it's load-bearing for retention. If the data is the reason they can't leave, the data has to actually persist and ...", "title": "Clarity drift, made visible. Don't treat the Clarity Protocol as", "folder": null, "updated": 1780000008000}, {"id": "rn_apple_09_2026-05-27", "iso": "2026-05-27", "date": "May 27, 2026", "html": "<div>why is everyone trying to &quotescape the matrix&quot??</div>\n<div>Why Does Everyone Want to be an &quotEntrepreneur&quot?</div>\n<div>Why 1.9 billion people want to be entrepreneurs</div>\n<div>1.9 billion people want to be entrepreneurs</div>\n<div>nobody ACTUALLY wants to be an enterpreneur</div>\n<div><br></div>\n<div>Gen-Z's Obsession with Money</div>\n<div>Gen-Z's Obsession with “Getting Rich Quick”</div>\n<div>Gen-Z's Obsession to “Getting Rich Quick”</div>\n<div>Gen-Z's Addiction to &quotGetting Rich Quick&quot</div>\n<div>Gen-Z's Addiction with &quotGetting Rich Quick&quot</div>", "text": "why is everyone trying to \"escape the matrix\"?? Why Does Everyone Want to be an \"Entrepreneur\"? Why 1.9 billion people want to be entrepreneurs 1.9 billion people want to be entrepreneurs nobody ACTUALLY wants to be an enterpreneur Gen-Z's Obsession with Money Gen-Z's Obsession with “Getting Rich Quick” Gen-Z's Obsession to “Getting Rich Quick” Gen-Z's Addiction to \"Getting Rich Quick\" Gen-Z's Addiction with \"Getting Rich Quick\"", "title": "why is everyone trying to \"escape the matrix\"??", "folder": null, "updated": 1780000009000}, {"id": "rn_apple_10_2026-05-27", "iso": "2026-05-27", "date": "May 27, 2026", "html": "<div><h1>Memento </h1><b><h1>vivere</h1></b></div>\n<div><b>viveremaxxing</b></div>\n<div><h1>Maxxing</h1></div>\n<div>Dopamine</div>\n<div>Paradox of being ambitious </div>\n<div>How to focus in the modern world</div>\n<div>FLOW STATE</div>\n<div><br></div>\n<div>AMBITIOUS, but lazy</div>\n<div><br></div>\n<div>Comfort kills you slowly. Comfort isn’t the problem, it’s meaning. </div>\n<div>You’re not lazy, you just don’t care. </div>", "text": "Memento vivere viveremaxxing Maxxing Dopamine Paradox of being ambitious How to focus in the modern world FLOW STATE AMBITIOUS, but lazy Comfort kills you slowly. Comfort isn’t the problem, it’s meaning. You’re not lazy, you just don’t care.", "title": "Memento vivere", "folder": null, "updated": 1780000010000}, {"id": "rn_apple_11_2026-05-27", "iso": "2026-05-27", "date": "May 27, 2026", "html": "<div>I've put together the most valuable lessons that have helped me achieve more out of my life. Hopefully, they're useful for you, too. Enjoy. This is brutally honest advice for poor people.</div>\n<div>0:08</div>\n<div>8 seconds</div>\n<div>I've been there. I had to pay rent.</div>\n<div>0:10</div>\n<div>10 seconds</div>\n<div>Every night, I would think if I didn't wake up tomorrow, I would be okay with it. And I don't want that for anybody. [music] I get it.</div>\n<div>0:20</div>\n<div>20 seconds</div>\n<div>I was just going through all these old files yesterday and I saw a goal that I had written, which was to make $10,000 a month income. And so it was 13 years</div>\n<div>0:29</div>\n<div>29 seconds</div>\n<div>ago. And so like I viscerally remember what that was like. Um and I know I</div>\n<div>0:36</div>\n<div>36 seconds</div>\n<div>never I was in so much pain during that during that time that I get it. And so like the reason we make this stuff is</div>\n<div>0:44</div>\n<div>44 seconds</div>\n<div>cuz I I've been there and I don't want that for anybody, you know? Like I missed I missed my 20s. Like I just I</div>\n<div>0:52</div>\n<div>52 seconds</div>\n<div>didn't have them as people traditionally say it, you know? Like it's it's weird because in today's like internet culture like I started my I I started my first brickandmortar business like storefront.</div>\n<div>1:04</div>\n<div>1 minute, 4 seconds</div>\n<div>I was 23. Like I didn't know [ __ ] about [ __ ] Like I knew nothing. And like I didn't know you could hire employees.</div>\n<div>1:11</div>\n<div>1 minute, 11 seconds</div>\n<div>Like it wasn't a thought. Like I didn't know anything. Um, and so like I</div>\n<div>1:18</div>\n<div>1 minute, 18 seconds</div>\n<div>cleaned, I did the billing, I did the sales, I taught the sessions, like I fixed the equipment, like I did everything because I didn't know you</div>\n<div>1:26</div>\n<div>1 minute, 26 seconds</div>\n<div>could and I also I did I didn't know and I didn't have the money, frankly, to afford anything else. And so, um, I get</div>\n<div>1:35</div>\n<div>1 minute, 35 seconds</div>\n<div>it. Like I get I get I get it. Um, but to get out of that, you have to take</div>\n<div>1:44</div>\n<div>1 minute, 44 seconds</div>\n<div>steps. And the first step is saying that it's my fault. The second step is that you have to use what you have.</div>\n<div>1:52</div>\n<div>1 minute, 52 seconds</div>\n<div>And so in the beginning I would I would you know I I was reading the self-help books and all this stuff. And um none of</div>\n<div>2:00</div>\n<div>2 minutes</div>\n<div>them really hit for me because a lot of it was like power of positive thinking and like affirmations and like all this stuff. And the reason I make the content</div>\n<div>2:08</div>\n<div>2 minutes, 8 seconds</div>\n<div>I do now, which has now almost become like a shtick, um, countering that is be is because it didn't work for me. And I'm trying like I'm not trying to speak</div>\n<div>2:16</div>\n<div>2 minutes, 16 seconds</div>\n<div>to everybody. If you if that works for you, then like awesome. Like awesome.</div>\n<div>2:22</div>\n<div>2 minutes, 22 seconds</div>\n<div>Like I people mistake me saying this is what worked for me with this is what I think everyone should do. And it it couldn't be further from the truth. I'm</div>\n<div>2:29</div>\n<div>2 minutes, 29 seconds</div>\n<div>saying if what h what you have been doing hasn't been working, then consider this. which is that like I remember because I just read this yesterday. The</div>\n<div>2:37</div>\n<div>2 minutes, 37 seconds</div>\n<div>intro in the book I say um I wish I could tell you that the reason I was able to make it out of the gym</div>\n<div>2:46</div>\n<div>2 minutes, 46 seconds</div>\n<div>was because I was like really passionate about changing people's lives and I loved fitness and I loved you know my clients faces when they would light up and they'd step on the scale and they'd</div>\n<div>2:54</div>\n<div>2 minutes, 54 seconds</div>\n<div>lose weight. They'd be able to fit in their high school clothes again. It was none of that. It was just the sheer anger that I had, but the idea of being</div>\n<div>3:01</div>\n<div>3 minutes, 1 second</div>\n<div>wrong and having the people back home be right about everything. And I just</div>\n<div>3:08</div>\n<div>3 minutes, 8 seconds</div>\n<div>couldn't I couldn't I mean I still can barely tolerate it. And so I mean I took in some ways and this isn't a I don't if</div>\n<div>3:17</div>\n<div>3 minutes, 17 seconds</div>\n<div>woe is me is the right is the right term but like I had an otherwise very successful career. like I was in a white</div>\n<div>3:24</div>\n<div>3 minutes, 24 seconds</div>\n<div>collar job and sometimes it's hard like I mean hey I don't know I haven't been the other situation but taking a step down and humbling yourself to minimum</div>\n<div>3:33</div>\n<div>3 minutes, 33 seconds</div>\n<div>wage after you've been in a white collar situation not easy and I remember I had clients who walk in and be like oh did you did you uh did you go to college and</div>\n<div>3:41</div>\n<div>3 minutes, 41 seconds</div>\n<div>they were saying that um patronizingly um and mind you everyone here at least this channel knows that I don't I don't</div>\n<div>3:49</div>\n<div>3 minutes, 49 seconds</div>\n<div>give a [ __ ] um but they were saying it to basically like when I was going to like write something down, like am I literate?</div>\n<div>3:57</div>\n<div>3 minutes, 57 seconds</div>\n<div>And in those moments again, it was like I could be right or be rich. Like I could try and humiliate them back because the pain of what they just said made me feel. They probably didn't even intend that.</div>\n<div>4:07</div>\n<div>4 minutes, 7 seconds</div>\n<div>Or I can be like, &quotYeah, yeah, I went to I went to school. I'm very grateful for it.&quot You know, like so what are your goals? I could just move right past it.</div>\n<div>4:14</div>\n<div>4 minutes, 14 seconds</div>\n<div>A<div>...</div>", "text": "I've put together the most valuable lessons that have helped me achieve more out of my life. Hopefully, they're useful for you, too. Enjoy. This is brutally honest advice for poor people. 0:08 8 seconds I've been there. I had to pay rent. 0:10 10 seconds Every night, I would think if I didn't wake up tomorrow, I would be okay with it. And I don't want that for anybody. [music] I get it. 0:20 20 seconds I was just going through all these old files yesterday and I saw a goal that I had written, which was to make $10,000 a month income. And so it was 13 years 0:29 29 seconds ago. And so like I viscerally remember what that was like. Um and I know I 0:36 36 seconds never I was in so much pain during that during that time that I get it. And so like the reason we make this stuff is 0:44 44 seconds cuz I I've been there and I don't want that for anybody, you know? Like I missed I missed my 20s. Like I just I 0:52 52 seconds didn't have them as people traditionally say it, you know? Like it's it's weird because in today's like internet culture like I started my I I started my first brickandmortar business like storefront. 1:04 1 minute, 4 seconds I was 23. Like I didn't know [ __ ] about [ __ ] Like I knew nothing. And like I didn't know you could hire employees. 1:11 1 minute, 11 seconds Like it wasn't a thought. Like I didn't know anything. Um, and so like I 1:18 1 minute, 18 seconds cleaned, I did the billing, I did the sales, I taught the sessions, like I fixed the equipment, like I did everything because I didn't know you 1:26 1 minute, 26 seconds could and I also I did I didn't know and I didn't have the money, frankly, to afford anything else. And so, um, I get 1:35 1 minute, 35 seconds it. Like I get I get I get it. Um, but to get out of that, you have to take 1:44 1 minute, 44 seconds steps. And the first step is saying that it's my fault. The second step is that you have to use what you have. 1:52 1 minute, 52 seconds And so in the beginning I would I would you know I I was reading the self-help books and all this stuff. And um none of 2:00 2 minutes them really hit for me because a lot of it was like power of positive thinking and like affirmations and like all this stuff. And the reason I make the content 2:08 2 minutes, 8 seconds I do now, which has now almost become like a shtick, um, countering that is be is because it didn't work for me. And I'm trying like I'm not trying to speak 2:16 2 minutes, 16 seconds to everybody. If you if that works for you, then like awesome. Like awesome. 2:22 2 minutes, 22 seconds Like I people mistake me saying this is what worked for me with this is what I think everyone should do. And it it couldn't be further from the truth. I'm 2:29 2 minutes, 29 seconds saying if what h what you have been doing hasn't been working, then consider this. which is that like I remember because I just read this yesterday. The 2:37 2 minutes, 37 seconds intro in the book I say um I wish I could tell you that the reason I was able to make it out of the gym 2:46 2 minutes, 46 seconds was because I was like really passionate about changing people's lives and I loved fitness and I loved you know my clients faces when they would light up and they'd step on the scale and they'd 2:54 2 minutes, 54 seconds lose weight. They'd be able to fit in their high school clothes again. It was none of that. It was just the sheer anger that I had, but the idea of being 3:01 3 minutes, 1 second wrong and having the people back home be right about everything. And I just 3:08 3 minutes, 8 seconds couldn't I couldn't I mean I still can barely tolerate it. And so I mean I took in some ways and this isn't a I don't if 3:17 3 minutes, 17 seconds woe is me is the right is the right term but like I had an otherwise very successful career. like I was in a white 3:24 3 minutes, 24 seconds collar job and sometimes it's hard like I mean hey I don't know I haven't been the other situation but taking a step down and humbling yourself to minimum 3:33 3 minutes, 33 seconds wage after you've been in a white collar situation not easy and I remember I had clients who walk in and be like oh did you did you uh did you go to college and 3:41 3 minutes, 41 seconds they were saying that um patronizingly um and mind you everyone here at least this channel knows that I don't I don't 3:49 3 minutes, 49 seconds give a [ __ ] um but they were saying it to basically like when I was going to like write something down, like am I literate? 3:57 3 minutes, 57 seconds And in those moments again, it was like I could be right or be rich. Like I could try and humiliate them back because the pain of what they just said made me feel. They probably didn't even intend that. 4:07 4 minutes, 7 seconds Or I can be like, \"Yeah, yeah, I went to I went to school. I'm very grateful for it.\" You know, like so what are your goals? I could just move right past it. 4:14 4 minutes, 14 seconds A ...", "title": "I've put together the most valuable lessons that have helped me ", "folder": null, "updated": 1780000011000}, {"id": "rn_apple_12_2026-05-26", "iso": "2026-05-26", "date": "May 26, 2026", "html": "<div><h1>FINISH THIS SCRIPT SO YOU CAN FINISH THE VIDEO SO YOU CAN FINISH MEMENTO AND MAKE LOTS OF MONEY, GET SEXY AND JACKIE CAN STOP WORKING NIGGA!</h1></div>\n<div><br></div>\n<div>You’re trying to stay comfortable but also make progress, which is why you’re doing neither. </div>\n<div><br></div>\n<div>LARP</div>", "text": "FINISH THIS SCRIPT SO YOU CAN FINISH THE VIDEO SO YOU CAN FINISH MEMENTO AND MAKE LOTS OF MONEY, GET SEXY AND JACKIE CAN STOP WORKING NIGGA! You’re trying to stay comfortable but also make progress, which is why you’re doing neither. LARP", "title": "FINISH THIS SCRIPT SO YOU CAN FINISH THE VIDEO SO YOU CAN FINISH", "folder": null, "updated": 1780000012000}, {"id": "rn_apple_13_2026-05-26", "iso": "2026-05-26", "date": "May 26, 2026", "html": "<div><h1>discord accountabilty</h1></div>\n<div>Maybe skool?</div>\n<div>Figure out out to set it up. See if i can possible charge for it idk</div>", "text": "discord accountabilty Maybe skool? Figure out out to set it up. See if i can possible charge for it idk", "title": "discord accountabilty", "folder": null, "updated": 1780000013000}, {"id": "rn_apple_14_2026-05-24", "iso": "2026-05-24", "date": "May 24, 2026", "html": "<div><h1>if you don’t feel like it.. do it anyways. energy follows when you start evn when you don’t want to. </h1></div>\n<div>When I’m on the treadmill I hate it. I actively despise it. I don’t see a point. my feet hurts. my knees hurt. my lungs heart. i hear my heart in my ears almost like it’s coming from speakers around the room. but if i keep going dispite it, for some htis snice as wel lik ethis snice </div>", "text": "if you don’t feel like it.. do it anyways. energy follows when you start evn when you don’t want to. When I’m on the treadmill I hate it. I actively despise it. I don’t see a point. my feet hurts. my knees hurt. my lungs heart. i hear my heart in my ears almost like it’s coming from speakers around the room. but if i keep going dispite it, for some htis snice as wel lik ethis snice", "title": "if you don’t feel like it.. do it anyways. energy follows when y", "folder": null, "updated": 1780000014000}, {"id": "rn_apple_15_2026-05-23", "iso": "2026-05-23", "date": "May 23, 2026", "html": "<div><h1>what if for memento I remove the modules and instaed just had the massive mountain be the main thing?</h1></div>", "text": "what if for memento I remove the modules and instaed just had the massive mountain be the main thing?", "title": "what if for memento I remove the modules and instaed just had th", "folder": null, "updated": 1780000015000}, {"id": "rn_apple_16_2026-05-20", "iso": "2026-05-20", "date": "May 20, 2026", "html": "<div><h1>Ambition </h1></div>\n<div>Ambitious </div>\n<div><br></div>\n<div>Cost of ambition </div>\n<div><br></div>\n<div>Growth</div>\n<div>Pain </div>\n<div>Suffering </div>\n<div>feeling like you’ve never done enough</div>\n<div>Confused</div>\n<div>Self doubt </div>\n<div><br></div>\n<div>Addicitions</div>\n<div><br></div>\n<div>what if i priced Memento at 200 one time or 20 a month.</div>\n<div><br></div>\n<div>it doesn’t matter where you’re trying to go if you’re blind</div>\n<div>Being blind will forever have you lost</div>\n<div>dark side</div>\n<div><br></div>\n<div>monke habit app</div>\n<div><br></div>\n<div>The paradox of a lazy ambitous person</div>\n<div>ambitous but lazy</div>\n<div><br></div>\n<div>you’re not lazy, you just don’t care</div>\n<div><br></div>\n<div>Wants Needs</div>\n<div><br></div>\n<div>Small Big</div>\n<div><br><br></div>\n<div>to your brain</div>\n<div><br></div>\n<div>Comfort will be the killer of the next generation</div>\n<div>Comfort kills you slowly</div>\n<div><br></div>\n<div>use action as a copying mechanism for impatience</div>\n<div><br></div>\n<div>Your niche is probably not:</div>\n<div>“business education”</div>\n<div>It’s closer to:</div>\n<div>“high-agency self-awareness for ambitious people.”</div>\n<div><br></div>\n<div>retard maxing</div>\n<div>something maxxing</div>\n<div>create. produce.</div>", "text": "Ambition Ambitious Cost of ambition Growth Pain Suffering feeling like you’ve never done enough Confused Self doubt Addicitions what if i priced Memento at 200 one time or 20 a month. it doesn’t matter where you’re trying to go if you’re blind Being blind will forever have you lost dark side monke habit app The paradox of a lazy ambitous person ambitous but lazy you’re not lazy, you just don’t care Wants Needs Small Big to your brain Comfort will be the killer of the next generation Comfort kills you slowly use action as a copying mechanism for impatience Your niche is probably not: “business education” It’s closer to: “high-agency self-awareness for ambitious people.” retard maxing something maxxing create. produce.", "title": "Ambition", "folder": null, "updated": 1780000016000}, {"id": "rn_apple_17_2026-05-17", "iso": "2026-05-17", "date": "May 17, 2026", "html": "<div>Add a thing in there for the Clarity Module to ask somebody about their 1, 5, 10, 20 and long term goals. So that way we can work backwards from there and then have the AI specifically figure out what goal it is for the person depending on their timeline. So they have like a 20 unit to your timeline fit accordingly.</div>", "text": "Add a thing in there for the Clarity Module to ask somebody about their 1, 5, 10, 20 and long term goals. So that way we can work backwards from there and then have the AI specifically figure out what goal it is for the person depending on their timeline. So they have like a 20 unit to your timeline fit accordingly.", "title": "Add a thing in there for the Clarity Module to ask somebody abou", "folder": null, "updated": 1780000017000}, {"id": "rn_apple_18_2026-05-15", "iso": "2026-05-15", "date": "May 15, 2026", "html": "<div>Landsford Canal State Park</div>\n<div>Crowders Mountain  -  Pinnacle Trail</div>\n<div>South Mountains State Park  -  High Shoals Falls</div>", "text": "Landsford Canal State Park Crowders Mountain  -  Pinnacle Trail South Mountains State Park  -  High Shoals Falls", "title": "Landsford Canal State Park", "folder": null, "updated": 1780000018000}, {"id": "rn_apple_19_2026-05-15", "iso": "2026-05-15", "date": "May 15, 2026", "html": "<div>Memento solves that as the way you make progress is by connecting to a goal emotionally and making it the most important thing to your brain and make progress towards it consistency by focusing on the right actions to actualize that goal </div>\n<div><br></div>\n<div>Version B, which I think is the actual claim hiding underneath: the brain doesn't move toward wants, it moves toward needs and the closest available pleasures. Your goals are far away, abstract, and optional. Your phone is close, concrete, and rewarding. So your brain, doing its job correctly, picks the phone. You're not lazy. You're not even uncommitted. You're a normal human nervous system running its default program, which was never designed for abstract long-term goals in a high-comfort environment.</div>", "text": "Memento solves that as the way you make progress is by connecting to a goal emotionally and making it the most important thing to your brain and make progress towards it consistency by focusing on the right actions to actualize that goal Version B, which I think is the actual claim hiding underneath: the brain doesn't move toward wants, it moves toward needs and the closest available pleasures. Your goals are far away, abstract, and optional. Your phone is close, concrete, and rewarding. So your brain, doing its job correctly, picks the phone. You're not lazy. You're not even uncommitted. You're a normal human nervous system running its default program, which was never designed for abstract long-term goals in a high-comfort environment.", "title": "Memento solves that as the way you make progress is by connectin", "folder": null, "updated": 1780000019000}];

function buildDemoState(personaKey) {
  const p = DEMO_PERSONAS[personaKey] || DEMO_PERSONAS.creator;
  const activeDays = [0, 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 18, 19, 20, 21, 22, 24, 25];
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
  let completionHistory = [0, 1, 2, 3, 4, 6, 7, 8, 11, 12, 14, 16].map((d, i) => {
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
    reflection: { entries: (personaKey === 'founder' && typeof APPLE_NOTES_SEED !== 'undefined') ? APPLE_NOTES_SEED.map(n => Object.assign({}, n)) : reflections, trash: [], folders: [], activeFolder: null, disp: { font: 'system', surface: 'glass' } },
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

