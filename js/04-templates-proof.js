/* Memento module: domain templates, module intros, streak, proof trail
   Extracted from app.js lines 11686-12068. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   DOMAIN TEMPLATES (7-day sprints)
   ============================================ */
const DOMAIN_TEMPLATES = {
  'Career & Work': [
    'Write down your top 3 career priorities for the next 90 days',
    'Block 1 deep work session on your calendar today',
    'Identify and eliminate 1 time-wasting commitment',
    'Complete 1 focused deep work block on your most important project',
    'Reach out to 1 person who can accelerate your career goal',
    'Review the week\'s progress and adjust tomorrow\'s focus',
    'Document what worked, what didn\'t  - plan next week'
  ],
  'Fitness & Health': [
    'Set your fitness baseline (weight, reps, or times for key exercises)',
    'Complete a 20-minute workout  - any type, just move',
    'Meal prep or plan your nutrition for the next 3 days',
    'Active recovery  - 15 min walk or stretch session',
    'Push harder  - increase weight, reps, or distance from Day 2',
    'Track sleep and energy levels, identify 1 improvement',
    'Review the week, celebrate progress, plan next week\'s training'
  ],
  'Creative & Passion': [
    'Define your creative project and the single next step to start',
    'Spend your committed time creating  - no editing, just output',
    'Study 1 creator you admire  - note what makes their work great',
    'Create again  - focus on quantity over quality',
    'Share something you\'ve made with 1 person for feedback',
    'Refine or iterate on your best piece from this week',
    'Reflect on creative growth and set next week\'s creative target'
  ],
  'Money & Business': [
    'Define your revenue goal for the next 90 days (be specific)',
    'Identify your most profitable activity and do it today',
    'Cut 1 expense or time-waster that doesn\'t serve your goal',
    'Reach out to 1 potential client, customer, or partner',
    'Create or improve 1 asset that generates income',
    'Track your numbers  - revenue, leads, conversion, time spent',
    'Review what moved the needle most, double down next week'
  ],
  'Relationships': [
    'Identify the 3 most important relationships to invest in',
    'Have 1 meaningful conversation (not small talk) today',
    'Do something kind for someone without being asked',
    'Set a boundary that protects your energy and focus',
    'Reconnect with someone you\'ve been meaning to reach out to',
    'Practice active listening in every conversation today',
    'Reflect on relationship growth and set next week\'s intention'
  ],
  'Spiritual & Mindfulness': [
    'Commit to 10 minutes of meditation or quiet reflection',
    'Journal about what gives your life meaning right now',
    'Practice gratitude  - write 3 specific things you\'re thankful for',
    'Spend 20 minutes in nature with no phone',
    'Read or listen to something that expands your perspective',
    'Do a digital detox for 2 hours and notice how you feel',
    'Reflect on your inner growth and set next week\'s practice'
  ],
  'Education & Learning': [
    'Define the #1 skill that would accelerate your growth most',
    'Spend 30 focused minutes learning (course, book, tutorial)',
    'Take notes and summarize what you learned yesterday',
    'Apply what you\'ve learned  - practice, not just theory',
    'Teach someone else 1 thing you recently learned',
    'Find a community or mentor in your learning domain',
    'Review the week\'s learning and set next week\'s study plan'
  ],
  'Mental Health': [
    'Check in with yourself  - rate your mental state 1-10 honestly',
    'Do 1 thing purely for enjoyment, not productivity',
    'Identify 1 thought pattern that\'s been draining your energy',
    'Move your body for 20 minutes  - walk, stretch, exercise',
    'Reduce 1 source of stress  - delegate, decline, or simplify',
    'Connect with someone you trust and share how you\'re doing',
    'Reflect on what helped most this week and continue it'
  ]
};

function generateSprint() {
  // Map domain value to DOMAIN_TEMPLATES label
  const domains = state.clarity.answers.domains || [];
  const domainVal = domains[0] || '';
  const domainObj = DISCOVERY_DOMAINS.find(d => d.value === domainVal);
  const domainLabel = domainObj ? domainObj.label : '';
  const template = DOMAIN_TEMPLATES[domainLabel] || DOMAIN_TEMPLATES['Career & Work'];
  state.action.sprint = template.map((task, i) => ({
    day: i + 1, task: task, done: false
  }));
  state.action.sprintStartDate = getTodayISO();
}

/* ============================================
   MODULE INTROS
   ============================================ */
const MODULE_INTROS = {
  clarity: { icon: ICONS.clarity, color: 'var(--color-clarity)', quote: "Most people don't even know what they want. Clarity is about discovering exactly what you want and WHY  - your Neutron Star.", cta: "Let's Go" },
  action: { icon: ICONS.action, color: 'var(--color-action)', quote: "Now that your Neutron Star is clear, Action finds the highest-leverage moves to actually move toward it.", cta: "Let's Go" },
  streak: { icon: ICONS.streak, color: 'var(--color-consistency)', quote: "Clarity and action mean nothing if you only show up once. Consistency is the whole game. This is where you prove it to yourself, one day at a time.", cta: "Let's Go" },
  flow: { icon: ICONS.flow, color: 'var(--color-flow)', quote: "Life will throw roadblocks. These tools help pave the way.", cta: "Let's Go" },
  mori: { icon: ICONS.mori, color: 'var(--color-mori)', quote: "Time is the only resource you can't earn back. Seeing what's left changes how you spend it.", cta: "Let's Go" },
  vivere: { icon: ICONS.vivere, color: 'var(--color-vivere)', quote: "Mori reminds you the time is finite. Vivere reminds you what it is for. Even on a hard day, notice one moment worth keeping.", cta: "Let's Go" },
  lifestats: { icon: ICONS.lifestats, color: 'var(--color-lifestats)', quote: "Your energy is the fuel behind every streak. Notice it, and your consistency starts to make sense.", cta: "Let's Go" },
  deepwork: { icon: ICONS.deepwork, color: 'var(--color-deepwork)', quote: "Put your phone down. Eliminate distractions. Do the work that matters.", cta: "Let's Go" },
  reflection: { icon: ICONS.reflection, color: 'var(--color-reflection)', quote: "The unexamined life is not worth living. Write to understand yourself.", cta: "Let's Go" },
  distraction: { icon: ICONS.distraction, color: 'var(--color-distraction)', quote: "Protect your attention before you lose it. Catch what pulls you away, then build guardrails so it cannot.", cta: "Let's Go" }
};

/* ============================================
   STREAK RECALCULATION
   ============================================ */
function recalculateStreak() {
  // Streak = consecutive active days over the unified activity set (check-ins,
  // action completions, reflections, deep work), so the dashboard count matches
  // the heatmap and the longest-streak stat. minutesReclaimed is cumulative so it
  // only ever grows, instead of collapsing to zero the moment a streak breaks.
  const counts = buildConsistencyData();
  // === Grace days ===================================================
  // Every 7 consecutive active days banks one grace day (max 2 held). When a
  // single missed day would break the run beyond the free never-miss-twice
  // bridge, a banked day is spent automatically and permanently: the day
  // renders as a muted heatmap cell, never red, and the chain holds.
  const g = state.streak.grace = state.streak.grace || { bank: 0, lastEarnMilestone: 0, used: {} };
  if (!g.used) g.used = {};
  try {
    const activeSet = new Set(Object.keys(counts).map(_dayNum));
    Object.keys(g.used).forEach(k => activeSet.add(_dayNum(k)));
    const today = _dayNum(getTodayISO());
    let walk = activeSet.has(today) ? today : today - 1;
    let bridged = false, started = false;
    while (true) {
      if (activeSet.has(walk)) { started = true; walk -= 1; continue; }
      if (!started) break;                 // run has not begun yet
      if (!activeSet.has(walk - 1)) break; // 2+ day gap is a real break
      if (!bridged) { bridged = true; walk -= 1; continue; } // free bridge
      if ((g.bank || 0) > 0) {
        g.bank -= 1;
        const iso = _keyFromDayNum(walk);
        g.used[iso] = true;
        activeSet.add(walk);
        if (!DEMO_MODE) {
          try {
            let dayName = iso;
            try { dayName = new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' }); } catch (_) {}
            if (typeof showComingSoonToast === 'function') showComingSoonToast('A banked grace day covered ' + dayName + '. Streak intact.');
            if (typeof pushUpdate === 'function') pushUpdate('grace', 'A grace day covered ' + dayName, 'Life happened. The chain holds.');
          } catch (_) {}
        }
        walk -= 1; continue;
      }
      break;
    }
  } catch (_) {}
  const cur = _currentStreakFrom(counts);
  state.streak.count = cur;
  // Earn: each new multiple of 7 in the current run banks one (cap 2). The
  // milestone tracker resets when the run does, so every fresh 7-day climb
  // earns again.
  try {
    const m = Math.floor(cur / 7);
    if (m > (g.lastEarnMilestone || 0)) {
      const before = g.bank || 0;
      g.bank = Math.min(2, before + (m - (g.lastEarnMilestone || 0)));
      if (g.bank > before && !DEMO_MODE) {
        try { if (typeof showComingSoonToast === 'function') showComingSoonToast('Grace day banked. One missed day will be covered for you.'); } catch (_) {}
        try { if (typeof pushUpdate === 'function') pushUpdate('grace', 'Grace day banked', 'Seven days kept. One missed day will be covered for you, automatically.'); } catch (_) {}
      }
    }
    g.lastEarnMilestone = m;
  } catch (_) {}
  // Any activity in the unified set counts (action completions, notes, deep
  // work), not just a manual streak tap. lastCheckDate feeds comeback-gap
  // detection; reading only streak.history left it stale for users who log
  // actions without ever tapping the heatmap, falsely triggering comeback UI.
  state.streak.lastCheckDate = (counts[getTodayISO()] !== undefined || state.streak.history.includes(getTodayISO())) ? getTodayISO() : state.streak.lastCheckDate;
  state.streak.minutesReclaimed = Object.keys(counts).length * (state.clarity.answers.dailyTime || 30);
  // Personal record: bestEver only ever grows. A calm "new record" moment fires
  // once per genuinely new high, the moment the CURRENT run first beats the prior
  // best (>= 2 days, and at least as long as any past run so old history catching
  // up never counts as a record). _recordJustHit is a transient one-shot the
  // streak sheet reads and clears on its next render; bestEverShown re-arms it as
  // the streak keeps climbing. Demo never persists, so this stays preview-safe.
  const prevBest = state.streak.bestEver || 0;
  state.streak.bestEver = Math.max(prevBest, cur);
  if (cur >= 2 && cur > (state.streak.bestEverShown || 0)) {
    state.streak._recordJustHit = cur;
    state.streak.bestEverShown = cur;
    try { writeProofEvent('new-record', { title: cur + ' day record', module: 'streak', dedupeKey: 'record-' + cur, metadata: { count: cur } }); } catch (_) {}
  }
  // Once the count just crossed into "worth not losing" territory (>= 7),
  // surface the one-time backup nudge. Self-guards demo / already-shown, and
  // defers to a microtask so it never reenters a render in progress.
  try {
    if (!DEMO_MODE && state.meta && !state.meta.backupNudged && state.streak.count >= 7) {
      if (typeof maybeShowBackupNudge === 'function') {
        if (typeof queueMicrotask === 'function') queueMicrotask(maybeShowBackupNudge);
        else setTimeout(maybeShowBackupNudge, 0);
      }
    }
  } catch (_) {}
}

/* ============================================
   PROOF TRAIL: unified event log
   ============================================ */
// Every meaningful action also appends a proof event. This is an ADDITIONAL,
// deduped record the Home reads for the proof trail, progress, and weekly
// review. It is never the sole source of truth for streaks. Demo-safe
// (persistNow no-ops under DEMO_MODE). Capped so the blob cannot grow forever.
const PROOF_EVENTS_CAP = 1000;
// v19 premium feel: one shared helper for the calm haptic + optional sound layer.
// Haptics fire on mobile unless turned off; sound is OFF by default (opt-in via
// state.prefs.sound). Everything is wrapped so it can never throw or block.
let _mementoAudioCtx = null;
function feel(type) {
  try {
    const reduce = (typeof document !== 'undefined' && document.body && (document.body.classList.contains('lite'))) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const hapticsOff = (typeof state !== 'undefined' && state.prefs && state.prefs.haptics === false);
    if (!hapticsOff && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'complete' ? [14, 36, 22] : 12);
    }
    const soundOn = (typeof state !== 'undefined' && state.prefs && state.prefs.sound);
    if (soundOn && !reduce && type === 'complete') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        _mementoAudioCtx = _mementoAudioCtx || new AC();
        const ctx = _mementoAudioCtx, t = ctx.currentTime;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(523.25, t);
        o.frequency.exponentialRampToValueAtTime(783.99, t + 0.12);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.11, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.3);
      }
    }
  } catch (_) {}
}
// v19 premium: the signature completion celebration. Spawns two soft accent rings
// from the given element's center and pops its check glyph. Calm, singular, gated.
function celebrateDone(el) {
  try {
    const reduce = (document.body && (document.body.classList.contains('calm-motion') || document.body.classList.contains('lite'))) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduce || !el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < 2; i++) {
      const ring = document.createElement('div');
      ring.className = 'done-ring' + (i ? ' done-ring--2' : '');
      ring.style.left = cx + 'px';
      ring.style.top = cy + 'px';
      document.body.appendChild(ring);
      setTimeout(() => { try { ring.remove(); } catch (_) {} }, 820);
    }
    const ic = el.querySelector('svg');
    if (ic) { ic.style.animation = 'checkPop 0.5s cubic-bezier(0.16,1,0.3,1)'; setTimeout(() => { try { ic.style.animation = ''; } catch (_) {} }, 540); }
    // The sacred sweep: one gold pass over the control, and today's heatmap
    // cell ignites wherever it is on screen. The day was witnessed.
    el.classList.add('sacred-sweep');
    setTimeout(() => { try { el.classList.remove('sacred-sweep'); } catch (_) {} }, 700);
    document.querySelectorAll('.cgraph__cell--today').forEach((c) => {
      c.classList.remove('cgraph__cell--ignite');
      void c.offsetWidth;
      c.classList.add('cgraph__cell--ignite');
      setTimeout(() => { try { c.classList.remove('cgraph__cell--ignite'); } catch (_) {} }, 950);
    });
  } catch (_) {}
}

// v607 (Malik, overnight item 3): the FIRST action ever completed gets one
// quiet full-screen beat: black, "Day 1." blooming in, gone. Motion and
// darkness only, no new visual language, once in a lifetime per account.
function _maybeFirstWinMoment() {
  state.meta = state.meta || {};
  if (state.meta.firstActionDone) { return; }
  state.meta.firstActionDone = true;
  try { persistNow(); } catch (e) {}
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  try { if (typeof MementoSound !== 'undefined') MementoSound.play('day1'); } catch (e) {}
  const el = document.createElement('div');
  el.className = 'first-win';
  el.innerHTML = '<div class="first-win__label">Day 1.</div>';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-on'));
  setTimeout(() => { el.classList.remove('is-on'); }, 2200);
  setTimeout(() => { try { el.remove(); } catch (e) {} }, 2900);
}

function writeProofEvent(type, fields) {
  try {
    if (!type) return null;
    if (type === 'action-complete') {
      try { feel('complete'); } catch (_) {}
      try { if (typeof MementoSound !== 'undefined') MementoSound.play('done'); } catch (_) {}
      try { _maybeFirstWinMoment(); } catch (_) {}
    }
    if (!Array.isArray(state.proofEvents)) state.proofEvents = [];
    fields = fields || {};
    // Callers that may re-fire on re-render pass a dedupeKey to stay idempotent.
    const dedupeKey = fields.dedupeKey || null;
    if (dedupeKey && state.proofEvents.some(e => e && e.metadata && e.metadata.dedupeKey === dedupeKey)) {
      return null;
    }
    const ev = {
      id: 'pe_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      type: type,
      iso: fields.iso || getTodayISO(),
      ts: (fields.ts != null ? fields.ts : Date.now()),
      title: fields.title || '',
      text: fields.text || '',
      module: fields.module || '',
      tags: Array.isArray(fields.tags) ? fields.tags : [],
      metadata: (fields.metadata && typeof fields.metadata === 'object') ? fields.metadata : {}
    };
    if (dedupeKey) ev.metadata.dedupeKey = dedupeKey;
    state.proofEvents.push(ev);
    if (state.proofEvents.length > PROOF_EVENTS_CAP) {
      state.proofEvents = state.proofEvents.slice(-PROOF_EVENTS_CAP);
    }
    persistNow();
    // Calm feedback, fired ONLY when an event actually persisted (above
    // dedupe returns null and never reaches here). This is the shared
    // chokepoint for action, deep work, reflection, and vivere, so the
    // settlement is universal without hooking each completion site. `silent`
    // skips the "Kept." pill for events that have their own big moment (the
    // star ignition, which owns the whole ceremony screen).
    if (!fields.silent) { try { playEarnedStillness(); } catch (_) {} }
    // v23 unlock ladder: every real proof event is a potential trigger, so this
    // chokepoint also re-evaluates the ladder (queues at most one unlock/day).
    try { if (typeof evaluateUnlockLadder === 'function') evaluateUnlockLadder(); } catch (_) {}
    // A completed action also gives the Neutron Star a one-shot pulse and may
    // trip a streak milestone banner. Internal proof types (the streak's own
    // 'new-record' write) never count as a fresh completion.
    if (type === 'action-complete') {
      try { pulseNeutronStar(); } catch (_) {}
      try { maybeShowMilestoneBanner(); } catch (_) {}
      try { Backend.complete(ev.iso); } catch (_) {} // count toward today's public total
      // First-ever action completion: a one-time win moment (fires once, ever).
      try { if (typeof maybeShowFirstWin === 'function') maybeShowFirstWin(); } catch (_) {}
    }
    return ev;
  } catch (e) { return null; }
}

/* Calm settlement on a real proof event: dim + pause the ambient orbs/rays for
   ~2.5s and fade in a quiet status line. An in-flight guard collapses a burst
   of events into a single settlement (no strobe). Motion is skipped entirely
   under calm-motion / lite / reduced-motion; the quiet status still shows. */
function playEarnedStillness() {
  try {
    if (typeof document === 'undefined' || !document.body) return;
    if (playEarnedStillness._busy) return;
    playEarnedStillness._busy = true;
    const body = document.body;
    const reduce = body.classList.contains('calm-motion') || body.classList.contains('lite') ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!reduce) body.classList.add('earned-stillness');
    // Quiet status line. Reused element so a burst never stacks nodes.
    let el = document.getElementById('earnedStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'earnedStatus';
      el.className = 'earned-status record-moment';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      // record-moment is added only for the role/status family naming; strip its
      // box styling so this stays the minimal pill defined by .earned-status.
      el.classList.remove('record-moment');
      body.appendChild(el);
    }
    el.textContent = 'Kept.';
    // Fade in shortly after paint so the opacity transition runs. A short timer
    // (not rAF alone) so the reveal still fires reliably if the tab was hidden
    // when the event landed (rAF is throttled in background tabs).
    setTimeout(() => { try { el.classList.add('is-on'); } catch (e) {} }, 30);
    clearTimeout(playEarnedStillness._t1);
    clearTimeout(playEarnedStillness._t2);
    playEarnedStillness._t1 = setTimeout(() => {
      // Always remove the class so ambient motion can never get stuck paused.
      body.classList.remove('earned-stillness');
      if (el) el.classList.remove('is-on');
    }, 2500);
    playEarnedStillness._t2 = setTimeout(() => {
      playEarnedStillness._busy = false;
    }, 2700);
  } catch (_) {
    try { document.body.classList.remove('earned-stillness'); } catch (e) {}
    playEarnedStillness._busy = false;
  }
}

/* One-shot ease-out scale + faint glow pulse on the dashboard Neutron Star.
   Motion-gated via CSS (calm-motion / lite / reduced-motion no-op the
   keyframes); the class is still toggled but renders static there. */
function pulseNeutronStar() {
  try {
    const wrap = document.querySelector('.dash-mission__neutron');
    if (!wrap) return;
    wrap.classList.remove('ns-pulse');
    // force reflow so re-adding the class restarts the animation
    void wrap.offsetWidth;
    wrap.classList.add('ns-pulse');
    clearTimeout(pulseNeutronStar._t);
    pulseNeutronStar._t = setTimeout(() => { try { wrap.classList.remove('ns-pulse'); } catch (e) {} }, 800);
  } catch (_) {}
}

/* Calm milestone banner at streak 7 / 30 / 100. Persists until dismissed (no
   auto-dismiss). Fires once per threshold using the same one-shot idea as the
   record moment: a shown-set on state.streak that export/import already covers.
   No schema change beyond an additive array; demo never persists. */
// === The Monday assessment ==========================================
// A small generated letter about last week, landing in Updates on the first
// open of each new week: days kept, grace days that held, one excerpt from
// the week's notes, one question. Pure local computation, no AI, no email.
// The artifact that makes a week feel witnessed.
function maybeGenerateWeeklyCard() {
  try {
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return;
    if (!state.clarity || !state.clarity.completed) return;
    if (!state.meta) return;
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(today); monday.setDate(today.getDate() - dow);
    const mondayISO = localISO(monday);
    if (state.meta.lastWeeklyCardFor === mondayISO) return;
    // The week under review: the 7 days before this Monday.
    const start = new Date(monday); start.setDate(monday.getDate() - 7);
    const days = [];
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(localISO(d)); }
    let counts = {}; try { counts = buildConsistencyData(); } catch (e) {}
    // No letter before there is any history at all; the first one should
    // describe a week that was actually lived with Memento.
    if (!Object.keys(counts).length) { state.meta.lastWeeklyCardFor = mondayISO; persistState(); return; }
    const kept = days.filter(k => counts[k] !== undefined).length;
    const used = (state.streak && state.streak.grace && state.streak.grace.used) || {};
    const graceUsed = days.filter(k => used[k]).length;
    let excerpt = '';
    try {
      const inWeek = ((state.reflection && state.reflection.entries) || []).filter(e => e && e.iso && days.indexOf(e.iso) !== -1 && (e.text || '').trim());
      inWeek.sort((a, b) => (b.text || '').length - (a.text || '').length);
      if (inWeek[0]) excerpt = (inWeek[0].text || '').trim().slice(0, 140);
    } catch (e) {}
    const QUESTIONS = [
      'What would make this week count?',
      'What did you avoid last week that still matters?',
      'Which day felt most alive, and why?',
      'What deserves less of you this week?',
      'If this week repeated 52 times, where would you land?'
    ];
    const weekNum = Math.floor(Date.parse(mondayISO + 'T00:00:00Z') / (7 * 86400000));
    const q = QUESTIONS[((weekNum % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
    const title = 'Your week, counted: ' + kept + ' of 7 days';
    let text = '';
    if (graceUsed) text += (graceUsed === 1 ? 'One grace day held the chain. ' : (graceUsed + ' grace days held the chain. '));
    if (excerpt) text += 'You wrote: "' + excerpt + '" ';
    text += q;
    if (typeof pushUpdate === 'function') pushUpdate('weekly', title, text);
    state.meta.lastWeeklyCardFor = mondayISO;
    persistState();
  } catch (e) {}
}

function maybeShowMilestoneBanner() {
  try {
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return;
    if (!state.streak) return;
    const count = state.streak.count || 0;
    const THRESHOLDS = CONSISTENCY_MILESTONES.map(m => m.t);
    if (!Array.isArray(state.streak.milestonesShown)) state.streak.milestonesShown = [];
    // highest threshold reached and not yet celebrated
    let hit = 0;
    for (const t of THRESHOLDS) {
      if (count >= t && state.streak.milestonesShown.indexOf(t) === -1) hit = t;
    }
    if (!hit) return;
    state.streak.milestonesShown.push(hit);
    try { persistNow(); } catch (_) {}
    try { if (typeof pushUpdate === 'function') pushUpdate('milestone', hit + ' days kept', 'The record of it lives on your heatmap.'); } catch (_) {}
    showMilestoneBanner(hit);
  } catch (_) {}
}

function showMilestoneBanner(days) {
  try {
    if (typeof document === 'undefined' || !document.body) return;
    const existing = document.getElementById('milestoneBanner');
    if (existing) existing.remove();
    const name = (state.profile && state.profile.name || '').trim();
    const subById = {};
    CONSISTENCY_MILESTONES.forEach(m => { subById[m.t] = m.earned; });
    const banner = document.createElement('div');
    banner.id = 'milestoneBanner';
    banner.className = 'milestone-banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML =
      '<div class="milestone-banner__title">' + days + '-day streak' + (name ? ', ' + esc(name) : '') + '.</div>' +
      '<div class="milestone-banner__sub">' + (subById[days] || 'You kept showing up.') + '</div>' +
      '<div class="milestone-banner__row">' +
        '<button type="button" class="milestone-banner__btn milestone-banner__btn--primary" id="milestoneShare">Copy to share</button>' +
        '<button type="button" class="milestone-banner__btn" id="milestoneDismiss">Dismiss</button>' +
      '</div>';
    document.body.appendChild(banner);
    // Reveal after paint (short timer, not rAF alone, so it still fires if the
    // tab was hidden when the milestone hit).
    setTimeout(() => { try { banner.classList.add('is-on'); } catch (e) {} }, 30);
    const close = () => { try { banner.classList.remove('is-on'); setTimeout(() => banner.remove(), 500); } catch (e) {} };
    const dismissBtn = banner.querySelector('#milestoneDismiss');
    if (dismissBtn) dismissBtn.addEventListener('click', close);
    const shareBtn = banner.querySelector('#milestoneShare');
    if (shareBtn) shareBtn.addEventListener('click', () => {
      const text = days + ' days in a row on Memento. Still showing up.';
      const done = () => { try { shareBtn.textContent = 'Copied'; } catch (e) {} };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (e) {}
          ta.remove(); done();
        }
      } catch (e) { done(); }
    });
  } catch (_) {}
}

