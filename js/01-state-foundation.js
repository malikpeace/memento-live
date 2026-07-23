/* Memento module: state, comeback, migration, icons, widgets, sheet+drag controllers
   Extracted from app.js lines 2-2125. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* v949: the JS build stamp. The release sed bump rewrites the version in BOTH
   index.html AND this line; js/11 compares them at boot and force-refreshes
   ONCE on mismatch. Kills the "phone silently runs old cached js under a new
   index" class (the SW's offline fallback can serve stale files on a bad
   connection; Malik hit this three times in one day). */
window.MEMENTO_JS_BUILD = 'v949';
/* ============================================
   STATE MANAGEMENT
   ============================================ */
const APP_KEY = 'memento_v5';
const SCHEMA_VERSION = 1;
// When a hard reset is in progress we wipe localStorage and reload. The
// pagehide/visibilitychange flush (persistOnHide) would otherwise re-persist the
// still-in-memory state right after the wipe and undo the reset, dropping the
// user back into the app instead of onboarding. This flag makes every write a
// no-op from the moment reset begins.
let IS_RESETTING = false;
// Demo Mode flag. When true (set by applyDemoModeIfRequested on ?demo=...),
// all persistence is blocked so demo data never overwrites the user's real
// localStorage. Declared up here so the persist gates below always see it.
let DEMO_MODE = false;

const DEFAULT_FLOW_ITEMS = [
  { id: 'f1', text: 'Notifications off for social apps', done: false },
  { id: 'f2', text: 'Phone out of room during deep work', done: false },
  { id: 'f3', text: 'No phone first 30 minutes of morning', done: false },
  { id: 'f4', text: 'Grayscale mode enabled', done: false },
  { id: 'f5', text: 'Screen time limit set (< 2 hrs)', done: false }
];

const DEFAULT_STATE = {
  profile: { name: '', lastName: '', fullName: '', birthday: '', email: '', story: '', runningToward: '', runningFrom: '', values: '', clarityLevel: '', actionKnow: '', actionProgress: '', distraction: '', costOfInaction: '', weakestPillar: '', letterToFutureSelf: '', returnCue: '', heroHeadline: { mode: 'auto', value: '' }, onboarded: false, onboardedAt: null },
  dev: { previewAll: false, savedClarity: null },
  // Entitlement: Clarity is the free first win; Action + Consistency + the rest
  // are paid. Flipped by the post-Clarity paywall (no billing backend yet).
  entitlements: { isPaid: false, paidAt: null, plan: '' },
  clarity: {
    completed: false,
    tutorialSeen: false,
    theme: 'stellar',
    answers: {
      domains: [], keystone: '', support: '', stage: '',
      prideOutcome: '', fearPain: '', rewardDesire: '',
      dailyTime: 0, energyBaseline: '',
      biggestBlocker: '', doomscrollWhen: '', triggerApps: [],
      identitySentence: '', progressMeasurement: '',
      whatSpecifically: '', whyMatters: '', whyMoreThanAnything: '',
      oneYearScrolling: '', whatsOnMind: '',
      neutronStar: '', coreWhy: '', antiVision: '', futureVision: '', identityLine: '',
      timeHorizon: '', anchor: '', intensity: ''
    },
    completedAt: null,
    history: [],
    // Ignition ending + life-after loop (additive, deep-merge safe):
    // ignitedAt: when the user performed the one-time hold-to-ignite ceremony.
    // letter: { text, sealedAt, opensAt } - one sealed sentence to the future
    // self, opened at the first quarterly Perihelion (~90 days).
    // driftChecks: [{ ts, verdict: 'on'|'drifting'|'notmine', win }] weekly pulses.
    ignitedAt: null,
    letter: null,
    driftChecks: []
  },
  action: {
    introSeen: false,
    tutorialSeen: false,
    wizStep: 0,
    viewMode: 'vine',
    wizAnswers: { goalConfirmation: '', alreadyTried: '', scaleFeeling: '', biggestBlocker: '' },
    primaryAction: { title: '', why: '', path: [], tiers: { tiny: '', light: '', moderate: '', heavy: '', extreme: '' }, recommendedTier: 'moderate', recommendedWhy: '', howToStart: '', linkedProjectId: '', linkedMilestoneId: '' },
    supportingActions: [],
    projects: [],
    focusPlan: { frame: '', frictionRemove: [], frictionAdd: [] },
    aiConversation: [],
    planGenerated: false,
    planSourceNeutronStar: '',
    lastGeneratedAt: null,
    completionHistory: []
  },
  streak: { count: 0, lastCheckDate: null, history: [], minutesReclaimed: 0, bestEver: 0, bestEverShown: 0, milestonesShown: [], grace: { bank: 0, lastEarnMilestone: 0, used: {} } },
  flow: { items: JSON.parse(JSON.stringify(DEFAULT_FLOW_ITEMS)) },
  // Day Card look. 'platinum' = the classic glass hero; 'living' = the
  // color-morph + ground-reflection theme whose hue tracks the three pillars.
  dayCard: { theme: 'living' },
  mori: { birthYear: null, lifeExpectancy: 80, reminderText: 'Make it count.', screenTimeHours: 4, futureSelfNote: '', lifestyle: { sleepHrs: 8, workHrs: 8, humanHrs: 2.5, screenHrs: 4, booksPerYear: 5 }, auditDone: false, people: [] },
  lifestats: { sleep: 0, diet: 0, exercise: 0, mood: 0, stress: 0, focus: 0, history: [] },
  // v23 Check-in: one light daily pulse (replaces Energy + Friction on the
  // default dashboard). Entries: { iso, ts, mood 1-5, energy 1-5, blocker, note }.
  checkins: [],
  reflection: { entries: [], trash: [], folders: [], activeFolder: null, disp: { font: 'system', surface: 'glass', theme: 'auto' } },
  support: { contacts: { discord: 'https://discord.gg/UNbPAUc3y4', email: 'mpeac3@gmail.com' }, feedbackQueue: [] },
  spotify: { clientId: '', tokens: null },
  deepwork: { sessions: [] },
  distraction: { logs: [] },
  inbox: [],
  // v19 daily bookends: track the last day the morning/evening ritual was done.
  bookends: { lastMorningISO: '', lastEveningISO: '' },
  // v19 light time-blocking: { id, day(iso), start 'HH:MM', durMin, label, type }.
  timeblocks: [],
  // v19 personal CRM: people you care about. { id, name, cadenceDays, lastContactISO, notes }.
  people: [],
  // Memento Vivere: the counterweight to Mori. A daily aliveness system, not a
  // productivity log. today = the day's "live this" invitation; memories = the
  // private Memory Jar; aliveList = a small, immediate bucket list; categories =
  // running counts per life-texture category for the Aliveness Map.
  vivere: {
    today: { date: '', prompt: '', category: '', done: false, note: '', media: [] },
    memories: [],
    aliveList: [],
    categories: { connection: 0, beauty: 0, play: 0, awe: 0, peace: 0, body: 0, meaning: 0, novelty: 0 },
    weeklyReviews: [],
    resurfacedMemoryIds: [],
    // Freeform "vision board" canvas: a dotted-grid space where you place note,
    // image, and link cards and draw connections between them. cards: [{ id, type,
    // x, y, w, h, z, text, title, url, dataURL }]; links: [{ id, from, to }].
    canvas: { cards: [], links: [], view: { panX: 0, panY: 0, zoom: 1 }, nextZ: 1 },
    boards: [],          // v22: multiple named boards; canvas migrates into boards[0]
    activeBoardId: null,
    viewTab: 'canvas',
    lastOnThisDayISO: '',  // daily guard for the On This Day resurfacing overlay
    lastNudgeISO: ''       // daily guard for the One Small Thing prompt
  },
  // v23: Energy (lifestats), Deep Work, and Friction (distraction) retired from
  // the default dashboard. Their data + sheets live on, reachable via the More
  // space; Check-in replaces the daily-pulse slot.
  widgetOrder: [
    { key: 'clarity', size: 'full' },
    { key: 'action', size: 'full' },
    { key: 'streak', size: 'half' },
    { key: 'photo', size: 'half' },
    { key: 'mori', size: 'half' },
    { key: 'checkin', size: 'half' },
    { key: 'vivere', size: 'half' },
    { key: 'reflection', size: 'full' }
  ],
  // v19 Custom Layouts: keys the user has hidden, and saved named presets
  // ({ name, order:[{key,size}], hidden:[key] }). Empty = the designed default.
  hiddenWidgets: [],
  layoutPresets: [],
  introsSeen: { clarity: false, action: false, streak: false, flow: false, mori: false, vivere: false, lifestats: false, deepwork: false, reflection: false, distraction: false, checkin: false },
  meta: { onboarded: false, welcomeSeen: false, lastVisit: null },
  // ui.homeHero: which centerpiece the Home command-center leads with ('oneThing' |
  // 'consistency' | 'neutron'). v27 default is 'oneThing' (today's action / focus) so
  // the left card doesn't duplicate the dedicated Consistency tile in the bento Home.
  // ui.variants: which visual treatment each taste-heavy screen uses ('a' = today's default look).
  // ui.unlocked / unlockQueue / lastUnlockISO / pendingReveal: the unlock ladder
  // (one earned unlock per day; queue overflow fires on the next session open).
  // ui.moduleOpens counts per-module opens (powers "Pin to dashboard" in More).
  ui: { lastView: null, homeHero: 'oneThing', heatmapMode: 'rolling', heatmapShape: 'square', heatmapSpacing: 'snug', heatmapPalette: 'classic', consistencyView: 'heatmap', consistencyScale: 'week', ccHeatmapScale: 'year', layoutCustomized: false, bentoOrder: null, variants: { home: 'a', streak: 'a', mori: 'a' }, moduleOpens: {}, unlocked: {}, unlockQueue: [], lastUnlockISO: '', pendingReveal: '' },
  // Optional, additive user preferences. Absent/empty => today's exact look.
  // accent: 'default' | 'cyan' | 'green' | 'amber' | 'rose'
  // reduceMotion: bool, density: 'comfortable' | 'compact'
  // unlockAll: the unlock-ladder escape hatch. True bypasses module gating
  // entirely (set by the user in Settings/More, or by migration for users who
  // already completed Clarity).
  prefs: { accent: 'default', accentCustom: '#3ad9f5', theme: 'auto', flatBg: false, background: { type: 'default', value: '' }, bgDim: 0.2, reduceMotion: false, density: 'comfortable', uiRadius: 1, uiGlass: 0, uiBlur: 1, anchorQuote: '', trashWindowDays: 30, guaranteeVariant: 'a', unlockAll: false, appearanceChosen: false, look: '', motionTilt: true, motionGranted: false, cardTilt: true, reminder: { enabled: false, time: '09:00', quietStart: '22:00', quietEnd: '07:00' } },
  // Optional, additive per-day memo of AI insight/accountability output so the
  // "Surface a pattern" button does not re-bill the API every press on the same
  // day. day is an ISO date; a mismatch (or any error) falls through to a live
  // call. Only non-empty results are cached so a stale empty state cannot get
  // trapped after the user logs more. All reads/writes are wrapped in try/catch.
  aiCache: { insights: { day: '', value: null }, accountability: { day: '', text: '' } },
  // Unified event log (additive). Each entry:
  // { id, type, iso, ts, title, text, module, tags:[], metadata:{} }.
  // Derived once from the legacy history arrays in migrateState (guarded by
  // meta.proofEventsDerivedV1). Never the sole source of truth for streaks; it
  // is an additional, deduped source alongside the existing per-module arrays.
  proofEvents: [],
  // Activation analytics (local-only): day-bucketed event log so we can compute
  // the Activation Point (Clarity done + N active action-days in week one).
  // Written by Analytics.track(); never networked. See Analytics in this file.
  analytics: { events: [], onceFlags: {}, firstOpenDay: null }
};

let state = {};
let saveTimer = null;

function deepMerge(target, source) {
  // Deep clone the target first. A shallow { ...target } aliases default nested
  // objects by reference for any key missing from source, so later state
  // mutations would corrupt DEFAULT_STATE itself and poison future clones.
  const out = JSON.parse(JSON.stringify(target));
  if (!source || typeof source !== 'object') return out;
  for (const key of Object.keys(source)) {
    const sv = source[key];
    // A corrupted or hand-edited backup can carry null/undefined for a key that
    // the defaults define as a structured object (e.g. {clarity:null}). Letting
    // that through would overwrite the default and crash code that assumes the
    // shape. Keep the cloned default for those keys instead.
    if (sv === null || sv === undefined) continue;
    if (Array.isArray(sv) && out[key] && !Array.isArray(out[key])) continue;
    if (typeof sv === 'object' && !Array.isArray(sv) &&
        out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = deepMerge(target[key], sv);
    } else if (Array.isArray(sv)) {
      // Deep-clone arrays so the merged state can never alias the source blob.
      out[key] = JSON.parse(JSON.stringify(sv));
    } else {
      out[key] = sv;
    }
  }
  return out;
}

// v24 state safety: a parse failure or mangled blob must never silently reset
// the user. The previous good save lives in APP_KEY + '_backup' (written by
// the persist path); a corrupt main key is preserved for forensics, then the
// backup is tried before falling back to defaults. Flags on state.meta let
// init surface a visible notice instead of a quiet wipe.
function looksLikeState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  let hits = 0;
  ['profile', 'clarity', 'action', 'streak', 'meta', 'prefs'].forEach((k) => {
    if (s[k] && typeof s[k] === 'object') hits++;
  });
  return hits >= 2;
}
function loadState() {
  let loaded = null;
  let recovered = false;
  let hadCorrupt = false;
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!looksLikeState(parsed)) throw new Error('state schema mismatch');
      loaded = parsed;
    } else {
      // v867 (Malik's relaunch-to-onboarding glitch): a MISSING primary key
      // must fall to the backup exactly like a corrupt one. iOS can relaunch
      // a killed PWA with the primary write torn or evicted; before this,
      // that booted a real user straight into onboarding without ever
      // looking at the backup sitting next to it.
      const braw = localStorage.getItem(APP_KEY + '_backup');
      if (braw) {
        const b = JSON.parse(braw);
        if (looksLikeState(b)) { loaded = b; recovered = true; }
      }
    }
  } catch (e) {
    hadCorrupt = true;
    try {
      // One fixed forensics key: if a bad blob somehow survives several
      // boots, it must not mint a new copy each time and eat the quota.
      const raw = localStorage.getItem(APP_KEY);
      if (raw && localStorage.getItem(APP_KEY + '_corrupt') !== raw) {
        localStorage.setItem(APP_KEY + '_corrupt', raw);
      }
    } catch (_) {}
    try {
      const braw = localStorage.getItem(APP_KEY + '_backup');
      if (braw) {
        const b = JSON.parse(braw);
        if (looksLikeState(b)) { loaded = b; recovered = true; }
      }
    } catch (_) {}
  }
  if (loaded) { state = deepMerge(DEFAULT_STATE, loaded); }
  else { state = JSON.parse(JSON.stringify(DEFAULT_STATE)); }
  try {
    if (recovered) state.meta.recoveredFromBackup = Date.now();
    else if (hadCorrupt) state.meta.stateCorrupted = Date.now();
  } catch (_) {}
  try { migrateClarityHistory(); } catch (e) {}
  // Baseline for the per-module edit stamps: what is on disk right now is by
  // definition unedited, so the first diff only sees changes made after boot.
  try { _captureModuleSnaps(state); } catch (e) {}
}

// One-time, idempotent: if a user completed Clarity before versioning existed,
// their single overwritten run lives in state.clarity.answers with a
// completedAt but no history entry. Seed history with that run so their
// original Neutron Star is preserved and drift has a starting point.
function migrateClarityHistory() {
  if (!state.clarity) return;
  if (!Array.isArray(state.clarity.history)) state.clarity.history = [];
  const ans = state.clarity.answers || {};
  if (state.clarity.history.length === 0 && ans.neutronStar && state.clarity.completed) {
    state.clarity.history.push({
      completedAt: state.clarity.completedAt || Date.now(),
      neutronStar: ans.neutronStar || '',
      coreWhy: ans.coreWhy || '',
      antiVision: ans.antiVision || '',
      futureVision: ans.futureVision || '',
      identityLine: ans.identityLine || '',
      timeHorizon: ans.timeHorizon || '',
      answers: JSON.parse(JSON.stringify(ans))
    });
    persistNow();
  }
}

// Push the just-completed Clarity run into history with its own timestamp so
// each re-run is preserved (the "here is March, here is now" record). Light
// dedup: skip if the most recent entry has the same Neutron Star within a
// short window (guards against an accidental double finalize).
function snapshotClarityRun() {
  try {
    if (!state.clarity) return;
    if (!Array.isArray(state.clarity.history)) state.clarity.history = [];
    const ans = state.clarity.answers || {};
    if (!ans.neutronStar) return;
    const now = Date.now();
    const hist = state.clarity.history;
    const last = hist[hist.length - 1];
    if (last && last.neutronStar === ans.neutronStar && last.coreWhy === ans.coreWhy && (now - (last.completedAt || 0)) < 60000) return;
    hist.push({
      completedAt: now,
      neutronStar: ans.neutronStar || '',
      coreWhy: ans.coreWhy || '',
      antiVision: ans.antiVision || '',
      futureVision: ans.futureVision || '',
      identityLine: ans.identityLine || '',
      timeHorizon: ans.timeHorizon || '',
      answers: JSON.parse(JSON.stringify(ans))
    });
    if (hist.length > 50) state.clarity.history = hist.slice(-50);
  } catch (e) {}
}

// Renders the "how you've changed" drift timeline. Invisible until earned:
// returns '' unless there are at least 2 completed runs to compare.
function renderClarityDrift(variant) {
  try {
    const hist = (state.clarity && Array.isArray(state.clarity.history)) ? state.clarity.history : [];
    if (hist.length < 2) return '';
    const fmt = (ts) => { try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } };
    const ordered = hist.slice().sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    const first = ordered[ordered.length - 1];
    const shifts = hist.length - 1;
    let h = '<div class="clarity-drift' + (variant === 'panel' ? ' clarity-drift--panel' : '') + '">';
    h += '<div class="clarity-drift__head">How you\'ve changed</div>';
    h += '<div class="clarity-drift__sub">Your Neutron Star has shifted ' + shifts + (shifts === 1 ? ' time' : ' times') + ' since ' + esc(fmt(first.completedAt)) + '.</div>';
    h += '<div class="clarity-drift__timeline">';
    ordered.forEach((e, i) => {
      const isNow = i === 0;
      h += '<div class="clarity-drift__entry' + (isNow ? ' clarity-drift__entry--now' : '') + '">';
      h += '<div class="clarity-drift__date">' + esc(fmt(e.completedAt)) + (isNow ? ' · now' : '') + '</div>';
      h += '<div class="clarity-drift__star">' + esc(e.neutronStar || '') + '</div>';
      if (e.coreWhy) h += '<div class="clarity-drift__why">' + esc(e.coreWhy) + '</div>';
      h += '</div>';
    });
    h += '</div></div>';
    return h;
  } catch (e) { return ''; }
}

// Shared storage write: rolls the previous good save into the backup key
// (throttled to once per 30s) before overwriting, and surfaces quota errors
// instead of swallowing them.
let _lastBackupAt = 0;
let _quotaWarned = false;
// Per-module edit stamps for cloud sync's per-module merge. A snapshot diff
// at save time avoids touching hundreds of mutation sites: any top-level
// state key whose serialized form changed since the last save is stamped in
// state.meta.moduleEditAt. The baseline is captured at load, so booting and
// migrations never count as editing.
let _moduleSnaps = null;
function _captureModuleSnaps(s) {
  const snaps = {};
  try {
    Object.keys(s || {}).forEach((k) => {
      if (k === 'meta') return;
      try { snaps[k] = JSON.stringify(s[k]); } catch (e) { snaps[k] = ''; }
    });
  } catch (e) {}
  _moduleSnaps = snaps;
}
function _stampModuleEdits() {
  if (!state || !state.meta) return;
  if (!_moduleSnaps) { _captureModuleSnaps(state); return; }
  if (!state.meta.moduleEditAt) state.meta.moduleEditAt = {};
  const now = Date.now();
  Object.keys(state).forEach((k) => {
    if (k === 'meta') return;
    let s = '';
    try { s = JSON.stringify(state[k]); } catch (e) { return; }
    if (_moduleSnaps[k] !== s) {
      state.meta.moduleEditAt[k] = now;
      _moduleSnaps[k] = s;
    }
  });
}

function writeStateToStorage() {
  // Stamp every real save. Cloud sync's newer-copy decision reads this, so
  // edits that produce no proof event (Clarity answers, notes, settings) still
  // count as activity and can never be silently overwritten by an older
  // device that merely has a fresher proof event.
  try { if (state && state.meta) state.meta.lastEditAt = Date.now(); } catch (e) {}
  try { _stampModuleEdits(); } catch (e) {}
  try {
    const now = Date.now();
    if (now - _lastBackupAt > 30000) {
      const prev = localStorage.getItem(APP_KEY);
      if (prev) { localStorage.setItem(APP_KEY + '_backup', prev); _lastBackupAt = now; }
    }
  } catch (e) {}
  try {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
  } catch (e) {
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22);
    if (quota && !_quotaWarned) {
      _quotaWarned = true;
      try {
        if (typeof showComingSoonToast === 'function') showComingSoonToast('Storage is full, changes are not saving. Download a backup in Settings.');
      } catch (_) {}
    }
  }
}

function persistState() {
  if (DEMO_MODE || IS_RESETTING) return; // never write demo data, or re-write after a reset wipe
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { writeStateToStorage(); }, 150);
  try { Backend.pushState(); } catch (_) {} // debounced cloud-sync when logged in
  try { if (window.CloudSync) CloudSync.schedulePush(); } catch (_) {} // optional Supabase mirror
}

// Matches an em dash or en dash (with surrounding whitespace) for stripping
// from AI output. Built via char codes so the source file itself never
// contains a literal em/en dash (keeps the no-dash audit clean).
const EMDASH_RE = new RegExp('\\s*[' + String.fromCharCode(0x2014, 0x2013) + ']\\s*', 'g');

// Strips cadence words, time durations, and dangling connector words from
// any plan text (title, howToStart, fallbacks). Used so the title doesn't
// pollute tier fallbacks when the AI puts cadence in the title itself.
// Example: "Ship a working piece of Memento this week" -> "Ship a working
// piece of Memento" (clean, grammatical, no dangling "this").
function stripCadenceAndTime(text) {
  if (!text) return '';
  let s = String(text);
  // "this/next/every <unit>"
  s = s.replace(/\s*\b(this|next|every|each)\s+(week|month|year|day|morning|evening|night)\b/gi, '');
  // "today/tonight/tomorrow"
  s = s.replace(/\s*\b(today|tonight|tomorrow)\b/gi, '');
  // "daily/weekly/monthly/nightly"
  s = s.replace(/\s*\b(daily|weekly|monthly|nightly)\b/gi, '');
  // "X days/weeks/months a week" patterns, digits AND word numbers
  // (v909: "three times a week" in a title left a garbled 7-word fallback
  // "Go to the gym three times a" because only \d+ was matched).
  s = s.replace(/\s*\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twice)\s+(days?|nights?|mornings?|evenings?|weeks?|months?|times?|sessions?)\s+(a|per)\s+(day|week|month|year)\b/gi, '');
  s = s.replace(/\s*\b(once|twice)\s+(a|per)\s+(day|week|month|year)\b/gi, '');
  // "full-day", "all-day", "half-day", "whole-day" blocks/sessions
  s = s.replace(/\s*\b(full[\s\-]day|all[\s\-]day|half[\s\-]day|whole[\s\-]day)\s*(blocks?|sessions?|sprints?|stints?)?\b/gi, '');
  // "by Friday/Monday/etc." or "by tomorrow"
  s = s.replace(/\s*\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|noon|midnight)\b/gi, '');
  // Time durations: "20 minutes", "two hours"
  s = s.replace(/\s*\b\d+\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi, '');
  s = s.replace(/\s*\b(one|two|three|four|five|six|seven|eight|nine|ten|fifteen|twenty|thirty|forty-five|sixty)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi, '');
  s = s.replace(/\s*\bfor\s+an?\s+(hour|minute|second)\b/gi, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  // Strip trailing dangling words left after the above edits
  for (let i = 0; i < 5; i++) {
    s = s.replace(/\s+(and|or|with|for|at|of|to|the|a|an|by|via|from|but|on|in|this|that|these|those)$/i, '').trim();
  }
  s = s.replace(/[,;:.\-\s]+$/g, '').trim();
  return s;
}

// Module-level tracking of the most recent plan sanitization. Read by
// generateActionDraft so it can decide whether to retry the AI when too
// many tiers had to be replaced by the sanitizer.
let _lastPlanSanitizationStats = { rejections: 0, reasons: {} };

function persistNow() {
  if (DEMO_MODE || IS_RESETTING) return; // never write demo data, or re-write after a reset wipe
  clearTimeout(saveTimer);
  writeStateToStorage();
  try { Backend.pushState(); } catch (_) {} // debounced cloud-sync when logged in
  try { if (window.CloudSync) CloudSync.schedulePush(); } catch (_) {} // optional Supabase mirror
}

/* ── Activation analytics (local-only, no network, no PII) ───────────────────
   The Retention Playbook's highest-leverage move: find the Activation Point,
   the behavior in week one that predicts whether someone stays. Hypothesis:
   finished Clarity (ceremony_done) + the daily action on 3+ days = they stick.
   We log just enough, day-bucketed, to compute that later. Read it any time in
   the console with Analytics.activation(). Costs nothing, ships invisibly. */
const Analytics = {
  _day() {
    try { if (typeof isoToLocalDay === 'function') return isoToLocalDay(new Date().toISOString()); } catch (e) {}
    try { return new Date().toISOString().slice(0, 10); } catch (e) { return ''; }
  },
  // Anonymous device id: a random UUID minted once per device, kept OUTSIDE
  // the main state blob so resets/restores never change it. Never tied to an
  // account, email, or any content. Also sent to the ai-proxy for rate limits.
  deviceId() {
    try {
      let id = localStorage.getItem('memento_device_id');
      if (!id) {
        id = (crypto && crypto.randomUUID) ? crypto.randomUUID()
          : ('d-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
        localStorage.setItem('memento_device_id', id);
      }
      return id;
    } catch (e) { return 'unknown'; }
  },
  track(event, meta) {
    try {
      if (DEMO_MODE) return; // never pollute the activation log with demo personas
      if (!state.analytics || typeof state.analytics !== 'object') state.analytics = { events: [], onceFlags: {}, firstOpenDay: null };
      if (!Array.isArray(state.analytics.events)) state.analytics.events = [];
      if (!state.analytics.onceFlags || typeof state.analytics.onceFlags !== 'object') state.analytics.onceFlags = {};
      const day = this._day();
      // ceremony_done fires once in a lifetime; app_open / action_done at most
      // once per day (we count distinct active days, not raw taps).
      let key = null;
      if (event === 'ceremony_done') key = 'ceremony_done';
      else if (event === 'app_open' || event === 'action_done') key = event + ':' + day;
      if (key) { if (state.analytics.onceFlags[key]) return; state.analytics.onceFlags[key] = true; }
      if (!state.analytics.firstOpenDay) state.analytics.firstOpenDay = day;
      state.analytics.events.push({ e: event, day: day, ts: Date.now(), m: meta || null });
      if (state.analytics.events.length > 1000) state.analytics.events = state.analytics.events.slice(-1000);
      try { persistState(); } catch (e) {}
      try { this._ship(event, meta || null); } catch (e) {}
    } catch (e) {}
  },
  /* Funnel shipping (FIRST-WIN-PLAN #10): the same events, mirrored to the
     Supabase `events` table so the funnel is measurable across users. Insert-
     only via the public anon key (RLS blocks all reads), random device id, no
     PII, tiny payloads. Fully silent: offline or failed sends sit in a local
     queue and retry on the next event or tab focus; nothing here can ever
     surface an error or block the app. */
  _evqKey: 'memento_evq',
  _flushing: false,
  _ship(event, meta) {
    try {
      let q = [];
      try { q = JSON.parse(localStorage.getItem(this._evqKey) || '[]'); } catch (e) { q = []; }
      if (!Array.isArray(q)) q = [];
      q.push({ n: String(event).slice(0, 64), p: meta || null, v: (window.MEMENTO_VERSION || '') });
      if (q.length > 200) q = q.slice(-200);
      try { localStorage.setItem(this._evqKey, JSON.stringify(q)); } catch (e) {}
      this._flush();
    } catch (e) {}
  },
  _flush() {
    try {
      if (this._flushing) return;
      const url = (typeof window !== 'undefined' && window.MEMENTO_SUPABASE_URL) || '';
      const anon = (typeof window !== 'undefined' && window.MEMENTO_SUPABASE_ANON) || '';
      if (!url || !anon) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      // Dev/preview sessions never pollute the real funnel (local log still works).
      try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return; } catch (e) {}
      let q = [];
      try { q = JSON.parse(localStorage.getItem(this._evqKey) || '[]'); } catch (e) { q = []; }
      if (!Array.isArray(q) || q.length === 0) return;
      this._flushing = true;
      const batch = q.slice(0, 25);
      const device = this.deviceId();
      const rows = batch.map(x => ({ device_id: device, name: x.n, props: x.p, app_version: x.v || null }));
      fetch(url + '/rest/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anon, 'Authorization': 'Bearer ' + anon, 'Prefer': 'return=minimal' },
        body: JSON.stringify(rows)
      }).then((r) => {
        this._flushing = false;
        if (!r.ok) return; // leave queued; retried on next event/focus
        let cur = [];
        try { cur = JSON.parse(localStorage.getItem(this._evqKey) || '[]'); } catch (e) { cur = []; }
        if (!Array.isArray(cur)) cur = [];
        try { localStorage.setItem(this._evqKey, JSON.stringify(cur.slice(batch.length))); } catch (e) {}
        if (cur.length > batch.length) this._flush();
      }).catch(() => { this._flushing = false; });
    } catch (e) { this._flushing = false; }
  },
  // Console readout: did this user hit the Activation Point?
  activation() {
    try {
      const a = state.analytics || {};
      const ev = Array.isArray(a.events) ? a.events : [];
      const actionDays = new Set(ev.filter(x => x && x.e === 'action_done').map(x => x.day));
      const openDays = new Set(ev.filter(x => x && x.e === 'app_open').map(x => x.day));
      const ceremony = !!(a.onceFlags && a.onceFlags.ceremony_done);
      return {
        firstOpenDay: a.firstOpenDay || null,
        ceremonyDone: ceremony,
        activeActionDays: actionDays.size,
        openDays: openDays.size,
        activated: ceremony && actionDays.size >= 3
      };
    } catch (e) { return null; }
  }
};
try { window.Analytics = Analytics; } catch (e) {}
// Retry any queued funnel events when the tab regains focus (js/12 has set the
// Supabase globals by then; failures just stay queued).
try { window.addEventListener('focus', () => { try { Analytics._flush(); } catch (e) {} }); } catch (e) {}

// The exact default command-center accent literal (kept verbatim so users with
// no custom accent render byte-identically to today). When a custom accent is
// active, command-center inline-styled text reads the live --accent variable.
const ACCENT_DEFAULT_CC = 'rgba(58, 217, 245,0.92)';
const ACCENT_CHOICES = ['default', 'cyan', 'green', 'amber', 'rose', 'blue', 'teal', 'lime', 'orange', 'crimson', 'magenta', 'mono', 'custom'];
// Hexes for the named accents (must stay in sync with body[data-accent] vars in
// css/base.css). Used to compute the Memento hue-match rotation in JS.
const ACCENT_HEX = {
  cyan: '#2bd4d4', green: '#3fd94e', amber: '#ffb73d', rose: '#ff6b9d',
  blue: '#4f8cff', teal: '#19c3a6', lime: '#a3e635', orange: '#ff8a3d',
  crimson: '#ff4d6d', magenta: '#e84de8'
};
// Hue (0-360) of a hex color. Used for the Memento accent-match rotation.
function hexToHue(hex) {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    let hue;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    return (hue + 360) % 360;
  } catch (e) { return 0; }
}
// Curated one-tap "Looks": each bundles accent + theme + minimal background +
// density into a named aesthetic so the app feels like the user's own. Applying
// one only sets state.prefs (additive, never touches their data) then re-applies
// via the existing applyPrefs pipeline. Shareable as a short code (encodeLook).
const MEMENTO_LOOKS = [
  { id: 'signature', name: 'Signature', accent: 'default', theme: 'dark',  flatBg: false, density: 'comfortable' },
  { id: 'frost',     name: 'Frost',     accent: 'cyan',    theme: 'light', flatBg: true,  density: 'comfortable' },
  { id: 'ember',     name: 'Ember',     accent: 'crimson', theme: 'dark',  flatBg: false, density: 'comfortable' },
  { id: 'forest',    name: 'Forest',    accent: 'green',   theme: 'dark',  flatBg: true,  density: 'comfortable' },
  { id: 'gold',      name: 'Gold',      accent: 'amber',   theme: 'dark',  flatBg: false, density: 'comfortable' },
  { id: 'paper',     name: 'Paper',     accent: 'default', theme: 'light', flatBg: true,  density: 'comfortable' },
  { id: 'mono',      name: 'Mono',      accent: 'mono',    theme: 'dark',  flatBg: true,  density: 'compact' }
];
// Curated custom-background colors (Settings > Preferences > Background).
// Dark-first, each a subtle gradient rather than a flat fill so the glass UI
// has something to sample. Keys are stored in prefs.background.value.
const BG_COLOR_CHOICES = [
  { key: 'black',    name: 'Pure black',  css: 'radial-gradient(ellipse 85% 65% at 50% 38%, #0a0a0c 0%, #000000 100%)' },
  { key: 'ink',      name: 'Deep ink',    css: 'radial-gradient(ellipse 95% 75% at 50% 28%, #0b1426 0%, #050810 58%, #02030a 100%)' },
  { key: 'forest',   name: 'Dark forest', css: 'radial-gradient(ellipse 95% 75% at 50% 30%, #081b0a 0%, #041105 55%, #020702 100%)' },
  { key: 'ember',    name: 'Ember',       css: 'radial-gradient(ellipse 95% 75% at 50% 74%, #220b06 0%, #130605 55%, #060203 100%)' },
  { key: 'plum',     name: 'Plum',        css: 'radial-gradient(ellipse 95% 75% at 50% 28%, #180a22 0%, #0d0514 55%, #050208 100%)' },
  { key: 'graphite', name: 'Graphite',    css: 'linear-gradient(180deg, #141417 0%, #0c0c0e 55%, #050506 100%)' }
];

// Pack a look into a short shareable code. Low 3 bits carry theme/flat/density,
// the rest is the accent index. A custom accent appends its hex. decodeLook
// validates strictly and returns null on anything malformed (safe to paste).
function encodeLook(p) {
  try {
    const ai = Math.max(0, ACCENT_CHOICES.indexOf(p.accent || 'default'));
    const n = ai * 8 + ((p.theme === 'light') ? 4 : 0) + (p.flatBg ? 2 : 0) + ((p.density === 'compact') ? 1 : 0);
    let code = 'M' + n.toString(36).toUpperCase();
    if (p.accent === 'custom' && p.accentCustom) code += '-' + String(p.accentCustom).replace('#', '').toLowerCase();
    return code;
  } catch (e) { return ''; }
}
function decodeLook(code) {
  try {
    const m = /^M([0-9A-Za-z]+)(?:-([0-9a-fA-F]{3,6}))?$/.exec(String(code || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 36);
    if (isNaN(n)) return null;
    const ai = Math.floor(n / 8);
    if (ai < 0 || ai >= ACCENT_CHOICES.length) return null;
    const out = { accent: ACCENT_CHOICES[ai], theme: (n & 4) ? 'light' : 'dark', flatBg: !!(n & 2), density: (n & 1) ? 'compact' : 'comfortable' };
    if (out.accent === 'custom' && m[2]) out.accentCustom = '#' + m[2].toLowerCase();
    return out;
  } catch (e) { return null; }
}
// Custom-accent helpers: turn a hex into the rgb triplet our rgba() glows need,
// and a darker "strong" fill for solid surfaces.
function hexToRgbTriplet(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '58, 217, 245';
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return r + ', ' + g + ', ' + b;
}
function darkenHex(hex, amount) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '#50b9cc';
  const f = Math.max(0, 1 - (amount == null ? 0.28 : amount));
  const ch = i => { const v = Math.round(parseInt(h.slice(i, i + 2), 16) * f); return ('0' + v.toString(16)).slice(-2); };
  return '#' + ch(0) + ch(2) + ch(4);
}

// Returns the color string for command-center inline-styled accent text.
// Default => exact original literal. Custom => the CSS variable so it tracks
// the active accent theme.
function ccAccentColor() {
  // v690 (Malik): colored micro-text is gone app-wide. Every command-center
  // "accent" text paints neutral now; colour lives only in real data and
  // visuals (heatmap cells, the card, the star, beams).
  return 'var(--text-2)';
}

// === Feel sliders (Settings > Preferences > Feel) ===
// Surface-opacity bucket list. MUST stay in sync with the --wfill-* / --kfill-*
// token definitions in css/base.css (one entry per alpha actually used by a
// background fill). The CSS defaults carry the original literal values, so
// applyPrefs only writes inline overrides when the slider is off-default.
const FILL_BUCKETS = {
  w: [0.028, 0.04, 0.045, 0.05, 0.06, 0.08, 0.1, 0.12, 0.16, 0.82, 0.86, 0.96],
  k: [0.02, 0.025, 0.03, 0.032, 0.035, 0.038, 0.04, 0.045, 0.05, 0.058, 0.06,
      0.064, 0.07, 0.08, 0.09, 0.1, 0.12, 0.14, 0.15, 0.16, 0.18, 0.2, 0.3,
      0.32, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.72, 0.75, 0.85, 0.9,
      0.92, 0.95, 0.96]
};
// Token suffix for an alpha: 0.04 -> '04', 0.045 -> '045', 0.1 -> '10'.
function fillKey(a) {
  let k = String(a).split('.')[1] || '0';
  if (k.length === 1) k += '0';
  return k;
}
// Slider position t (-0.25..1) maps each bucket alpha toward opaque (t > 0)
// or slightly more transparent (t < 0). t = 0 is exactly today's glass.
function fillAlpha(a, t) {
  const v = t >= 0 ? a + (1 - a) * t : a * (1 + t);
  return Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
}

// Applies persisted preferences to the document. Guarded by existence checks
// so missing/partial prefs are a no-op (= today's exact look). Idempotent;
// safe to call on boot and again after a pref change.
let _accentDriftTimer = null;
const _ACCENT_DRIFT_STOPS = [[58, 217, 245], [96, 132, 255], [240, 100, 200]];
let _accentDriftStart = 0;
function _accentDriftTick() {
  const b = document.body; if (!b) return;
  const PERIOD = 30000; // one full loop through the M palette
  const t = ((Date.now() - _accentDriftStart) % PERIOD) / PERIOD * _ACCENT_DRIFT_STOPS.length;
  const i = Math.floor(t) % _ACCENT_DRIFT_STOPS.length;
  const j = (i + 1) % _ACCENT_DRIFT_STOPS.length;
  const f = t - Math.floor(t);
  const mix = (a, c) => Math.round(a + (c - a) * f);
  const A = _ACCENT_DRIFT_STOPS[i], B = _ACCENT_DRIFT_STOPS[j];
  const rgb = [mix(A[0], B[0]), mix(A[1], B[1]), mix(A[2], B[2])];
  b.style.setProperty('--accent', 'rgb(' + rgb.join(',') + ')');
  b.style.setProperty('--accent-rgb', rgb.join(', '));
  b.style.setProperty('--accent-strong', 'rgb(' + rgb.map(v => Math.round(v * 0.72)).join(',') + ')');
}
function applyAccentDrift(p) {
  const active = (!p.accent || p.accent === 'default') && !p.reduceMotion;
  if (!active) {
    if (_accentDriftTimer) { clearInterval(_accentDriftTimer); _accentDriftTimer = null; }
    return; // applyPrefs already stripped the inline vars for non-custom accents
  }
  if (!_accentDriftTimer) {
    _accentDriftStart = Date.now();
    _accentDriftTimer = setInterval(_accentDriftTick, 400);
  }
  _accentDriftTick(); // repaint now (applyPrefs just cleared the inline vars)
}

function applyPrefs() {
  try {
    const p = (state && state.prefs) || {};
    const b = document.body;
    if (!b) return;
    // Accent: only stamp a non-default, known value. Default removes the attr
    // so absolutely no override rule can match. "custom" carries a user-picked
    // hex which we paint as inline body variables.
    const accent = p.accent;
    b.style.removeProperty('--accent');
    b.style.removeProperty('--accent-rgb');
    b.style.removeProperty('--accent-strong');
    if (accent === 'custom') {
      const hex = (p.accentCustom && /^#?[0-9a-fA-F]{3,6}$/.test(p.accentCustom)) ? p.accentCustom : '#3ad9f5';
      const norm = hex[0] === '#' ? hex : '#' + hex;
      b.setAttribute('data-accent', 'custom');
      b.style.setProperty('--accent', norm);
      b.style.setProperty('--accent-rgb', hexToRgbTriplet(norm));
      b.style.setProperty('--accent-strong', darkenHex(norm, 0.28));
    } else if (accent && accent !== 'default' && ACCENT_CHOICES.indexOf(accent) !== -1) {
      b.setAttribute('data-accent', accent);
    } else {
      b.removeAttribute('data-accent');
    }
    // Match Memento to color theme (Malik v683): when ON (the default), the card's
    // colour layers hue-rotate toward the chosen accent (pure CSS via --mm-hue, the
    // filters already on the liquid/bloom/floor pick it up). Dynamic (drifting) and
    // Mono keep the stock card; the toggle lets accent-only users opt out.
    try {
      const mmOn = p.matchMemento !== false;
      let mmHex = null;
      if (accent === 'custom') {
        mmHex = (p.accentCustom && /^#?[0-9a-fA-F]{3,6}$/.test(p.accentCustom))
          ? (p.accentCustom[0] === '#' ? p.accentCustom : '#' + p.accentCustom) : '#3ad9f5';
      } else if (accent && accent !== 'default' && accent !== 'mono' && ACCENT_HEX[accent]) {
        mmHex = ACCENT_HEX[accent];
      }
      if (mmOn && mmHex) {
        // The card's native clarity cyan sits at hue ~189deg (v711); rotate to the accent.
        const rot = Math.round(hexToHue(mmHex) - 189);
        b.classList.add('mm-match');
        b.style.setProperty('--mm-hue', rot + 'deg');
      } else {
        b.classList.remove('mm-match');
        b.style.removeProperty('--mm-hue');
      }
    } catch (eMM) {}
    // Dynamic accent (Malik, v576): the default accent slowly drifts through the
    // colored-M palette (purple -> blue -> pink). Inline body vars only, no
    // data-accent attr, so module colors and the beams stay stock. Static purple
    // under reduce-motion.
    try { applyAccentDrift(p); } catch (eDrift) {}
    // Monochrome: desaturate the whole app (filter lives on <html>).
    if (document.documentElement) document.documentElement.classList.toggle('mono-theme', accent === 'mono');
    // Light theme: the class lives on <html> so the :root ink-derived tokens
    // re-resolve. v863: 'auto' (the default) follows the device via
    // prefers-color-scheme; 'light'/'dark' are manual overrides.
    const _isLight = themeIsLight(p);
    if (document.documentElement) document.documentElement.classList.toggle('theme-light', _isLight);
    // Keep the iOS chrome (status bar / PWA title bar) matching the surface.
    try {
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', _isLight ? '#eef0f3' : '#000000');
    } catch (eTc) {}
    // Chosen starting look (AppearancePicker): a durable body.look-<id> hook so
    // each pick is a first-class visible state, even on the lowfx mobile path
    // where blur/glass deltas flatten. Re-applied here on every boot from prefs.
    try {
      const _looks = ['light-flat', 'light-glass', 'dark-flat', 'dark-glass'];
      const _lk = (p && typeof p.look === 'string') ? p.look : '';
      _looks.forEach(function (id) { b.classList.toggle('look-' + id, _lk === id); });
    } catch (eLook) {}
    // Minimal background: strip the ambient orbs/glow for a flat, paper-like
    // surface (works in both themes). Also driven by the Background picker's
    // Minimal swatch (prefs.background.type === 'minimal').
    const bgMin = !!(p.background && typeof p.background === 'object' && p.background.type === 'minimal');
    if (document.documentElement) document.documentElement.classList.toggle('bg-flat', !!p.flatBg || bgMin);
    // Flat surfaces: strip ALL glass/blur app-wide (cards, sheets, bars) for a true
    // flat, matte look in either theme. Distinct from bg-flat (which only drops the
    // ambient orbs). Driven by prefs.flatUi; paired with uiBlur:0 by the flat looks.
    if (document.documentElement) document.documentElement.classList.toggle('flat-ui', !!p.flatUi);
    // Custom background layer (color / gradient / image behind the app).
    try { applyCustomBackground(p); } catch (eBg) {}
    // Reduce motion (calm): add a class the CSS gate keys off of.
    b.classList.toggle('calm-motion', !!p.reduceMotion);
    // Density: compact tightens dashboard gap + card padding via :root vars.
    b.classList.toggle('density-compact', p.density === 'compact');
    // v807 (Malik): the Memento card's shape. 'tall' (default, the locked
    // 320x440 card) or 'square'. Pure CSS via body.card-square.
    b.classList.toggle('card-square', p.cardShape === 'square');
    // Feel sliders: corner radius multiplier (--rx) + surface-opacity buckets.
    // At the exact defaults (radius 1, glass 0) the inline overrides are
    // REMOVED so the look comes purely from the CSS token defaults.
    const root = document.documentElement;
    if (root) {
      // Floor 0.35 (Malik, v576): fully square corners never looked good, so
      // "Sharp" still keeps a hint of radius. Also rescues older saved 0s.
      const rx = (typeof p.uiRadius === 'number' && isFinite(p.uiRadius))
        ? Math.min(1.4, Math.max(0.35, p.uiRadius)) : 1;
      if (rx === 1) root.style.removeProperty('--rx');
      else root.style.setProperty('--rx', String(rx));
      // Backdrop-blur multiplier (--bx). Every backdrop-filter blur in the app
      // is written as blur(calc(Npx * var(--bx, 1))), so removing the override
      // at the default (1) restores the exact stock blur. lowfx strips
      // backdrop-filter wholesale and wins regardless of this value.
      const bx = (typeof p.uiBlur === 'number' && isFinite(p.uiBlur))
        ? Math.min(1.5, Math.max(0, p.uiBlur)) : 1;
      if (bx === 1) root.style.removeProperty('--bx');
      else root.style.setProperty('--bx', String(bx));
      const t = (typeof p.uiGlass === 'number' && isFinite(p.uiGlass))
        ? Math.min(1, Math.max(-0.25, p.uiGlass)) : 0;
      // Toward Solid (t > 0) a fill must become the tint COMPOSITED over the
      // app's surface color (an opaque panel in the theme's own darkness),
      // never the raw tint at alpha 1 (which would white-out dark mode).
      const cs = getComputedStyle(root);
      const inkTrip = (cs.getPropertyValue('--ink') || '236,238,243').split(',').map(n => parseFloat(n) || 0);
      let surf = [11, 11, 14];
      try {
        const s0 = (cs.getPropertyValue('--surface-0') || '').trim();
        const hx = /^#([0-9a-f]{6})$/i.exec(s0);
        const rg = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(s0);
        if (hx) surf = [parseInt(hx[1].slice(0, 2), 16), parseInt(hx[1].slice(2, 4), 16), parseInt(hx[1].slice(4, 6), 16)];
        else if (rg) surf = [parseFloat(rg[1]), parseFloat(rg[2]), parseFloat(rg[3])];
      } catch (e2) {}
      const setFill = (name, a, tint) => {
        if (t === 0) { root.style.removeProperty(name); return; }
        if (t < 0) {
          const triplet = tint === 'w' ? '255,255,255' : 'var(--ink)';
          root.style.setProperty(name, 'rgba(' + triplet + ',' + fillAlpha(a, t) + ')');
          return;
        }
        const tr = tint === 'w' ? [255, 255, 255] : inkTrip;
        const R = Math.round(surf[0] + (tr[0] - surf[0]) * a);
        const G = Math.round(surf[1] + (tr[1] - surf[1]) * a);
        const B = Math.round(surf[2] + (tr[2] - surf[2]) * a);
        root.style.setProperty(name, 'rgba(' + R + ',' + G + ',' + B + ',' + fillAlpha(a, t) + ')');
      };
      FILL_BUCKETS.w.forEach(a => setFill('--wfill-' + fillKey(a), a, 'w'));
      FILL_BUCKETS.k.forEach(a => setFill('--kfill-' + fillKey(a), a, 'k'));
    }
  } catch (e) {}
}

// === Custom background (Settings > Preferences > Background) ===
// Paints the #customBg layer from prefs.background and prefs.bgDim. Idempotent:
// at type 'default' (or 'minimal') every override is removed and the ambient
// background behaves exactly as today. A token guards the async image loads so
// a stale resolve never overwrites a newer selection.
let _bgApplyToken = 0;
function applyCustomBackground(p) {
  const layer = document.getElementById('customBg');
  const b = document.body;
  if (!layer || !b) return;
  const media = layer.querySelector('.custom-bg__media');
  const scrim = layer.querySelector('.custom-bg__scrim');
  const bg = (p && p.background && typeof p.background === 'object') ? p.background : { type: 'default', value: '' };
  const type = (bg.type === 'color' || bg.type === 'image') ? bg.type : 'default';
  const token = ++_bgApplyToken;
  const active = type === 'color' || type === 'image';
  b.classList.toggle('custom-bg', active);
  layer.classList.toggle('custom-bg--image', type === 'image');
  if (!active) {
    if (media) { media.style.removeProperty('background'); media.style.removeProperty('background-image'); }
    if (scrim) scrim.style.removeProperty('opacity');
    return;
  }
  // Scrim: mandatory dark gradient over any color/image so the glass UI stays
  // readable. Opacity = 0.35 + user dim (0..0.6).
  const dim = (typeof p.bgDim === 'number' && isFinite(p.bgDim)) ? Math.min(0.6, Math.max(0, p.bgDim)) : 0.2;
  if (scrim) scrim.style.opacity = String(Math.round((0.35 + dim) * 100) / 100);
  if (!media) return;
  if (type === 'color') {
    media.style.removeProperty('background-image');
    const found = (typeof BG_COLOR_CHOICES !== 'undefined')
      ? BG_COLOR_CHOICES.filter(function (c) { return c.key === bg.value; })[0] : null;
    if (found) media.style.background = found.css;
    else if (/^#[0-9a-fA-F]{3,8}$/.test(String(bg.value || ''))) media.style.background = bg.value;
    else media.style.background = '#050507';
    return;
  }
  // Image: dark placeholder immediately, then resolve the real source.
  media.style.background = '#050507';
  const v = String(bg.value || '');
  const setImg = function (url) {
    if (token !== _bgApplyToken || !media.isConnected) return;
    media.style.backgroundImage = 'url("' + String(url).replace(/"/g, '%22') + '")';
  };
  const fallbackToDefault = function (why) {
    if (token !== _bgApplyToken) return;
    console.warn('Memento background: ' + why + ' Reverting to the default background.');
    try { p.background = { type: 'default', value: '' }; persistNow(); } catch (e) {}
    try { applyPrefs(); } catch (e) {}
  };
  if (/^idb:/.test(v)) {
    if (typeof idbGetBlobURL !== 'function') return;
    idbGetBlobURL(v.slice(4)).then(function (url) {
      if (url) setImg(url);
      else fallbackToDefault('the stored image is missing.');
    });
    return;
  }
  // Bundled relative path ('bg/mountain.jpg') or a pasted https URL: probe via
  // an Image so a dead link quietly falls back instead of leaving black.
  if (/^https:\/\//i.test(v) || /^bg\//.test(v)) {
    const probe = new Image();
    probe.onload = function () { setImg(v); };
    probe.onerror = function () { fallbackToDefault('the image address failed to load.'); };
    probe.src = v;
    return;
  }
  fallbackToDefault('the saved value was not recognized.');
}

// Buttery theme switch: enable a one-shot global color transition on <html>,
// run the mutation (which flips the theme class), then drop the transition so
// it never affects normal interactions. Respects reduced motion (instant).
let _themeAnimTimer = null;
// ============================================================
// v877: KeyboardPin, the iOS keyboard pan-preventer (research in
// overnight/KEYBOARD_RESEARCH.md). iOS pans the whole page when a focused
// field would sit under the keyboard, dragging even fixed overlays with it
// (Malik's "screen jumps and I see the background"). Prevention: LEARN the
// device's keyboard height once, then on pointerup (which fires BEFORE
// focus) shrink the surface so the field is already visible above the
// keyboard; iOS skips the pan and the keyboard slides over a stable layout.
// A visualViewport resize listener truth-corrects the few-px prediction
// error; the first-ever open (nothing learned yet) falls back to reactive
// correction and learns for every open after.
// ============================================================
const KeyboardPin = {
  _KEY: 'memento_kb_h',
  kbH() {
    try {
      const v = parseInt(localStorage.getItem(this._KEY) || '', 10);
      return (v > 150 && v < window.innerHeight * 0.7) ? v : 0;
    } catch (e) { return 0; }
  },
  _isEditable(t) {
    return !!(t && (t.tagName === 'TEXTAREA' || t.isContentEditable ||
      (t.tagName === 'INPUT' && !/^(button|checkbox|radio|range|color|submit|file)$/.test(t.type || 'text'))));
  },
  // Touch devices only: a desktop window resized mid-typing would otherwise
  // false-learn a "keyboard height" and shrink overlays on click.
  _touch() {
    try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
  },
  _learn() {
    try {
      if (!this._touch()) return;
      const vv = window.visualViewport; if (!vv) return;
      if (!this._isEditable(document.activeElement)) return;
      const d = Math.round(window.innerHeight - vv.height);
      if (d > 150 && d < window.innerHeight * 0.7) localStorage.setItem(this._KEY, String(d));
    } catch (e) {}
  },
  init() {
    try {
      const vv = window.visualViewport;
      if (vv) vv.addEventListener('resize', () => this._learn());
    } catch (e) {}
  },
  // Shrink a fixed full-screen panel to the (predicted or real) space above
  // the keyboard. Returns true when a pin was applied.
  _apply(panel, allowPredicted) {
    try {
      if (!panel || !this._touch()) return false;
      const vv = window.visualViewport;
      const real = vv ? Math.round(window.innerHeight - vv.height) : 0;
      const kb = (real > 150) ? real : (allowPredicted ? this.kbH() : 0);
      if (!kb) return false;
      const top = (real > 150 && vv) ? Math.round(vv.offsetTop) : 0;
      panel.style.top = top + 'px';
      panel.style.bottom = 'auto';
      panel.style.height = (window.innerHeight - kb) + 'px';
      panel.style.maxHeight = (window.innerHeight - kb) + 'px';
      panel.dataset.kbPinned = '1';
      return true;
    } catch (e) { return false; }
  },
  release(panel) {
    try {
      if (!panel || !panel.dataset.kbPinned) return;
      delete panel.dataset.kbPinned;
      panel.style.top = ''; panel.style.bottom = '';
      panel.style.height = ''; panel.style.maxHeight = '';
    } catch (e) {}
  },
  // Delegated wiring: any editable inside the panel pins it. Idempotent.
  auto(panel, opts) {
    if (!panel || panel._kbAuto) return;
    panel._kbAuto = true;
    opts = opts || {};
    const after = () => { if (opts.afterPin) { try { opts.afterPin(); } catch (e) {} } };
    let unhook = null;
    const correct = () => {
      const ae = document.activeElement;
      if (this._isEditable(ae) && panel.contains(ae)) {
        this._learn();
        if (this._apply(panel)) after();
      } else {
        this.release(panel);
      }
    };
    // Pre-pin on pointerup (before focus) using the LEARNED height. v878:
    // OFF by default, Malik's device showed the prediction losing to iOS's
    // varying keyboard heights (dead gap above the keyboard). The real fix
    // is anchoring fields HIGH so iOS has no reason to pan; the reactive
    // correction below then uses only REAL measured values.
    if (opts.predict) {
      panel.addEventListener('pointerup', (e) => {
        const t = e.target && e.target.closest ? e.target.closest('textarea, input, [contenteditable]') : null;
        if (!this._isEditable(t)) return;
        if (this._apply(panel, true)) after();
      }, true);
    }
    panel.addEventListener('focusin', (e) => {
      if (!this._isEditable(e.target)) return;
      if (this._apply(panel, !!opts.predict)) after();
      if (!unhook) {
        const vv = window.visualViewport;
        if (vv) { vv.addEventListener('resize', correct); unhook = () => vv.removeEventListener('resize', correct); }
      }
    });
    panel.addEventListener('focusout', () => {
      setTimeout(() => {
        const ae = document.activeElement;
        if (!(this._isEditable(ae) && panel.contains(ae))) {
          this.release(panel);
          if (unhook) { unhook(); unhook = null; }
        }
      }, 60);
    });
  }
};
try { KeyboardPin.init(); } catch (e) {}

// v863: resolve the effective theme. 'auto' (default) follows the device's
// prefers-color-scheme, live; 'light'/'dark' are manual picks.
function themeIsLight(p) {
  const t = (p && p.theme) || 'auto';
  if (t === 'light') return true;
  if (t === 'dark') return false;
  try { return !window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
}

// While in Auto, re-apply (with the cross-fade) the moment the device flips
// its appearance, even mid-session. addListener fallback covers older iOS.
try {
  const _sysThemeMq = window.matchMedia('(prefers-color-scheme: dark)');
  const _onSysTheme = () => {
    try {
      if (((state && state.prefs && state.prefs.theme) || 'auto') === 'auto') applyThemeChange(function () {});
    } catch (e) {}
  };
  if (_sysThemeMq.addEventListener) _sysThemeMq.addEventListener('change', _onSysTheme);
  else if (_sysThemeMq.addListener) _sysThemeMq.addListener(_onSysTheme);
} catch (e) {}

function applyThemeChange(mutate) {
  try {
    const el = document.documentElement;
    const reduce = (state && state.prefs && state.prefs.reduceMotion) ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduce || !el) { if (typeof mutate === 'function') mutate(); applyPrefs(); return; }
    el.classList.add('theme-anim');
    if (typeof mutate === 'function') mutate();
    applyPrefs();
    if (_themeAnimTimer) clearTimeout(_themeAnimTimer);
    _themeAnimTimer = setTimeout(() => { try { el.classList.remove('theme-anim'); } catch (e) {} }, 460);
  } catch (e) { try { if (typeof mutate === 'function') mutate(); applyPrefs(); } catch (e2) {} }
}

// Daily reminder: a best-effort browser notification at the chosen time. Honest
// limitation (stated in Settings): with no service worker, it only fires while a
// Memento tab is open. Reschedules itself each day; respects quiet hours.
let _reminderTimer = null;
function _inQuietHours(r) {
  try {
    const toMin = s => { const parts = String(s || '').split(':'); return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0); };
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const qs = toMin(r.quietStart || '22:00'), qe = toMin(r.quietEnd || '07:00');
    if (qs === qe) return false;
    if (qs < qe) return cur >= qs && cur < qe;
    return cur >= qs || cur < qe;
  } catch (e) { return false; }
}
function scheduleReminder() {
  try {
    if (_reminderTimer) { clearTimeout(_reminderTimer); _reminderTimer = null; }
    const r = (state.prefs && state.prefs.reminder) || {};
    if (!r.enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const parts = String(r.time || '09:00').split(':');
    const hh = parseInt(parts[0], 10), mm = parseInt(parts[1], 10);
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), isNaN(hh) ? 9 : hh, isNaN(mm) ? 0 : mm, 0, 0);
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    _reminderTimer = setTimeout(() => {
      try {
        const rr = (state.prefs && state.prefs.reminder) || {};
        if (rr.enabled && ('Notification' in window) && Notification.permission === 'granted' && !_inQuietHours(rr)) {
          new Notification('Memento', { body: 'A quiet nudge: show up for today.' });
        }
      } catch (e) {}
      scheduleReminder();
    }, next.getTime() - now.getTime());
  } catch (e) {}
}

function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
// Allowlist-sanitize stored rich-text (reflection notes) before it is ever
// reinjected via innerHTML. The editor itself produces safe markup, but the
// same html field can be set from an UNTRUSTED source (Restore/import backup,
// or cloud-login server state), so we sanitize on the READ side. DOMParser
// builds an inert document (scripts never run, img onerror never fires), then
// we drop disallowed tags, all on* handlers, and dangerous href/src/style.
function sanitizeReflectionHtml(html) {
  if (!html) return '';
  const ALLOWED = { P:1, BR:1, STRONG:1, B:1, EM:1, I:1, U:1, S:1, H1:1, H2:1, H3:1, UL:1, OL:1, LI:1, A:1, IMG:1, DIV:1, SPAN:1, FONT:1, BLOCKQUOTE:1, CODE:1, PRE:1, HR:1, MARK:1 };
  let doc;
  try { doc = new DOMParser().parseFromString(String(html), 'text/html'); }
  catch (e) { return esc(String(html)); }
  if (!doc || !doc.body) return '';
  const clean = (node) => {
    Array.prototype.slice.call(node.childNodes).forEach((child) => {
      if (child.nodeType === 1) {
        if (!ALLOWED[child.tagName]) {
          clean(child);
          while (child.firstChild) node.insertBefore(child.firstChild, child);
          node.removeChild(child);
          return;
        }
        Array.prototype.slice.call(child.attributes).forEach((a) => {
          const name = a.name.toLowerCase(), val = a.value || '';
          if (name.indexOf('on') === 0) { child.removeAttribute(a.name); return; }
          if (name === 'href') { if (!/^(https?:\/\/|mailto:)/i.test(val)) child.removeAttribute(a.name); return; }
          if (name === 'src') { if (!/^(data:image\/|https?:\/\/)/i.test(val)) child.removeAttribute(a.name); return; }
          if (name === 'style') { if (/javascript:|expression\(|url\(\s*['"]?\s*javascript:/i.test(val)) child.removeAttribute(a.name); return; }
          if (name === 'data-img-id') { if (!/^img_[a-z0-9_]+$/i.test(val)) child.removeAttribute(a.name); return; }
          if (name === 'data-done') { if (val !== '0' && val !== '1') child.removeAttribute(a.name); return; }
          if (name === 'data-hl') { if (!/^(green|red|blue|yellow|purple)$/.test(val)) child.removeAttribute(a.name); return; }
          if (name === 'data-rnote-link') { if (!/^[a-zA-Z0-9_-]+$/.test(val)) child.removeAttribute(a.name); return; }
          if (name !== 'class') child.removeAttribute(a.name);
        });
        clean(child);
      } else if (child.nodeType === 8) {
        node.removeChild(child);
      }
    });
  };
  clean(doc.body);
  return doc.body.innerHTML;
}
// HTML-escape AND convert **bold** to <strong>. Used for AI message bubbles
// so the prompt can use a light markdown convention for emphasis. The escape
// runs FIRST so user/AI content can never inject markup, then the regex
// only matches the literal ** markers in the AI output.
function escWithBold(str) {
  return esc(str).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function stripMd(str) {
  if (!str) return '';
  return str
    .replace(/#{1,6}\s*/g, '')       // remove # headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')     // *italic* → italic
    .replace(/__([^_]+)__/g, '$1')     // __bold__ → bold
    .replace(/_([^_]+)_/g, '$1')       // _italic_ → italic
    .replace(/^[-*]\s+/gm, '')         // bullet points
    .replace(/^---+$/gm, '')           // horizontal rules
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\n{3,}/g, '\n\n')        // excessive newlines
    .trim();
}
function collapseWhitespace(str) {
  return String(str || '').replace(/\s+/g, ' ').trim();
}
function trimText(str, maxLen) {
  const clean = collapseWhitespace(stripMd(str || ''));
  if (!clean) return '';
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const lastBreak = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '), cut.lastIndexOf(' '));
  return (lastBreak > 40 ? cut.slice(0, lastBreak) : cut).trim() + '…';
}
// Hard sanitizer for today-action tier text. The AI keeps drifting into long,
// cadence-laden phrases ("four days this week", "two hour deep work block")
// despite the prompt telling it otherwise. This trims that off so the user
// always sees a minimal verb+object phrase. Anything specific belongs in the
// "Make it more specific" refine flow, not here.
function sanitizeTierText(str, titleFallback, opts) {
  opts = opts || {};
  // Helper: when a tier fails validation, fall back to the CLEANED title
  // (cadence/time/connectors stripped) so the fallback is always grammatical.
  // Records the rejection reason on the opts object for the caller to read.
  const fallback = (reason) => {
    opts.rejected = true;
    opts.reason = reason;
    const cleanTitle = stripCadenceAndTime(collapseWhitespace(stripMd(titleFallback || '')));
    return cleanTitle.split(/\s+/).slice(0, 7).join(' ').trim();
  };
  const original = collapseWhitespace(stripMd(str || ''));
  if (!original) return fallback('empty');
  // Reject "cadence-only" outputs: "Three days a week", "Five sessions a week".
  const cadenceOnly = /^(once|twice|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(days?|sessions?|times?|workouts?|hours?|minutes?)\s+(a|per)\s+(day|week|month|year)\b/i.test(original)
    || /^(daily|weekly|monthly|every\s+(day|morning|evening|week))\b/i.test(original);
  if (cadenceOnly) return fallback('cadence-only');
  // Reject bare-pronoun outputs: "Open it.", "Ship this.", "Do that."
  const barePronoun = /^[a-z]+\s+(it|this|that|them|those|these)[.!?]?\s*$/i.test(original);
  if (barePronoun) return fallback('bare-pronoun');
  // Reject single-verb fragments: "Stretch.", "Run.", "Lift."
  if (original.split(/\s+/).length === 1) return fallback('single-word');
  // Reject setup / non-output phrasings.
  const setupPhrase = /^(sit\s+down|get\s+started|set\s+up|gear\s+up|prep|prepare)\b/i.test(original)
    || /\b(work\s+on|focus\s+on|spend\s+time\s+on|look\s+at|check\s+on|think\s+about|plan\s+to)\b/i.test(original);
  if (setupPhrase) return fallback('setup-verb');
  // v909: durations are ALLOWED in tier text. They are the one honest scaling
  // axis for time/presence moves (be with her, meditate, phone-free time,
  // deep work), and stripping them was collapsing those ladders into five
  // identical rungs (the confirmed behavioral-ladder blocker). Output moves
  // still scale by unit ("write 500 words"), steered by the prompt, not by a
  // blanket strip here. Cadence/frequency ("3x a week") stays banned below.
  // Reject cadence/timeframe words ANYWHERE in the string.
  const cadenceAnywhere = /\b(this\s+(week|month|year)|next\s+(week|month|year)|today|tonight|tomorrow|every\s+(day|morning|evening|night|week|month)|daily|weekly|monthly|nightly|each\s+(day|morning|week)|per\s+(day|week|month))\b/i.test(original)
    || /\b\d+\s+(days?|weeks?|months?|times?)\s+(a|per)\s+(day|week|month|year)\b/i.test(original)
    || /\b(full[\s\-]day|all[\s\-]day|half[\s\-]day|whole[\s\-]day)\b/i.test(original);
  if (cadenceAnywhere) return fallback('cadence-anywhere');
  // Reject hard-coded deadlines like "by Friday", "by tomorrow".
  const hardDeadline = /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|noon|midnight)\b/i.test(original);
  if (hardDeadline) return fallback('hard-deadline');
  let s = original;
  // First clause only (cut at period/semicolon/em-dash separator/comma+space).
  const cutAt = s.search(/[.!?;]|\s-\s|,\s/);
  if (cutAt > 2) s = s.slice(0, cutAt);
  // 9-word ceiling (up from 7, v909). Durations and scope qualifiers are
  // allowed in tiers now ("Delay every craving to the end of the day",
  // "10 phone-free minutes with her in the evening"), and a 7-word cap was
  // chopping the top rung's qualifier off, leaving it reading smaller than
  // the rung below it. Still short enough to reject a dumped sentence.
  const words = collapseWhitespace(s).split(/\s+/).filter(w => w.length);
  s = (words.length > 9 ? words.slice(0, 9) : words).join(' ');
  // Trailing connector cleanup (extended list, also catches dangling
  // demonstratives like "this" / "that" left over after cadence-strip).
  for (let i = 0; i < 5; i++) {
    s = s.replace(/\s+(and|or|with|for|at|of|to|the|a|an|by|via|from|but|on|in|this|that|these|those)$/i, '').trim();
  }
  s = s.replace(/[\s,;:.\-]+$/g, '').trim();
  // Final guard: if the cleaned text gutted itself or ends mid-sentence
  // (last word is a connector), fall through to the cleaned title.
  if (!s || s.split(/\s+/).length < 2) return fallback('gutted');
  return s;
}

function firstSentence(str) {
  const clean = collapseWhitespace(stripMd(str || ''));
  if (!clean) return '';
  const match = clean.match(/.+?[.!?](?=\s|$)/);
  return match ? match[0].trim() : clean;
}
function normalizeClaritySummary(source = {}) {
  const neutronStar = trimText(source.neutronStar || source.keystone || '', 180);
  const whatDetail = trimText(source.whatSpecifically || source.keystone || source.neutronStar || '', 240);
  const coreWhy = trimText(source.coreWhy || source.whyItMatters || source.rewardDesire || '', 220);
  const antiVision = trimText(source.antiVision || source.emotionalAnchor || source.fearPain || '', 220);
  const futureVision = trimText(source.futureVision || source.ninetyDayGoal || source.prideOutcome || '', 220);
  const identityLine = trimText(source.identityLine || source.identitySentence || '', 140);
  // Optional synthesized line naming the contradiction the user felt but did not
  // say out loud. Renders only if the synthesis produced it; degrades to nothing.
  const tensionLine = trimText(source.tensionLine || '', 160);
  const whatShort = trimText(firstSentence(whatDetail) || whatDetail, 88);
  const whyShort = trimText(firstSentence(coreWhy) || coreWhy, 88);
  const antiVisionShort = trimText(firstSentence(antiVision) || antiVision, 88);
  const visionShort = trimText(firstSentence(futureVision) || futureVision, 88);
  const heroWhy = trimText(firstSentence(coreWhy) || coreWhy, 120);
  const heroAnchor = trimText(firstSentence(antiVision) || antiVision || identityLine, 120);
  // New meta fields for the "Spotify Wrapped" detail view
  const timeHorizon = trimText(source.timeHorizon || source.when || source.deadline || '', 48);
  const anchor = trimText(source.anchor || source.anchorWord || '', 28);
  const intensity = trimText(source.intensity || '', 20);
  const hasRealResult = !!neutronStar && !/didn.?t get deep enough/i.test(neutronStar);
  return {
    hasRealResult,
    neutronStar,
    whatDetail,
    whatShort,
    coreWhy,
    whyShort,
    antiVision,
    antiVisionShort,
    futureVision,
    visionShort,
    identityLine,
    heroWhy,
    heroAnchor,
    tensionLine,
    timeHorizon,
    anchor,
    intensity
  };
}
// LEGACY: original card-based summary view (kept for reference, not currently used)
function renderNeutronStarSummaryLegacy(summary, { allowContinue = false, showRestart = false } = {}) {
  if (!summary.hasRealResult) {
    return `
      <div class="ns-summary--fallback">
        <div class="ns-summary__fallback-head">We are close, but the core is still blurry.</div>
        <div class="ns-summary__fallback-copy">There is something real here. It just is not sharp enough yet to deserve a final Neutron Star card.</div>
        ${allowContinue ? `<button id="summaryContinue" class="ns-card__cta">Continue Building</button>` : ``}
        ${showRestart ? `<button id="summaryRedo" class="ns-card__ghost">${allowContinue ? `Start over instead` : `Start over`}</button>` : ``}
      </div>
    `;
  }

  const whyLine  = summary.coreWhy    || '';
  const antiLine = summary.antiVision || '';

  return `
    <div class="ns-scene" id="nsScene">

      <div class="ns-card-wrap" id="nsCardWrap">
        <div class="ns-scene__shadow"></div>
        <div class="ns-card__face ns-card__face--front" id="nsCardFront">
          <div class="ns-card__glass"></div>
          <div class="ns-card__hot-spot"></div>
          <div class="ns-card__hero">
            <div class="ns-card__hero-pre">your</div>
            <div class="ns-card__hero-title">NEUTRON</div>
            <div class="ns-card__hero-title">STAR</div>
          </div>
          <div class="ns-card__bottom">
            <div class="ns-card__flip-tag">flip<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg></div>
          </div>
        </div>
        <div class="ns-card__face ns-card__face--back" id="nsCardBack">
          <div class="ns-card__glass"></div>
          <div class="ns-card__back-inner">
            <div class="ns-card__eyebrow">Your Neutron Star</div>
            <div class="ns-card__statement">${esc(summary.neutronStar)}</div>
            <div class="ns-card__card-divider"></div>
            <div class="ns-card__context">
              ${whyLine  ? `<p class="ns-card__context-line">${esc(whyLine)}</p>`  : ``}
              ${antiLine ? `<p class="ns-card__context-line">${esc(antiLine)}</p>` : ``}
            </div>
            <div class="ns-card__actions">
              <button id="summaryAction" class="ns-card__cta">Keep this</button>
              <button id="summaryContinue" class="ns-card__ghost">Refine</button>
              <button id="summaryRedo" class="ns-card__ghost">Back to Questions</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderNeutronStarSummary(summary, { allowContinue = false, showRestart = false } = {}) {
  if (!summary.hasRealResult) {
    return `
      <div class="ns-summary--fallback">
        <div class="ns-summary__fallback-head">We are close, but the core is still blurry.</div>
        <div class="ns-summary__fallback-copy">There is something real here. It just is not sharp enough yet to deserve a final Neutron Star card.</div>
        ${allowContinue ? `<button id="summaryContinue" class="ns-card__cta">Continue Building</button>` : ``}
        ${showRestart ? `<button id="summaryRedo" class="ns-card__ghost">${allowContinue ? `Start over instead` : `Start over`}</button>` : ``}
      </div>
    `;
  }

  // v600 (Malik): the summary is ONE glance, not a manifesto. Giant star owning
  // most of the screen, the sentence (numbers popped in violet), the timeframe,
  // one CTA. The deeper material (why/future/avoiding) stays in state and feeds
  // the AI; it no longer renders here. Utilities live in a quiet dots menu.
  const arrowRight = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>`;
  const calIcon = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
  // Numbers in the goal glow violet (like the render): escape first, then wrap.
  const _nsRaw = String(summary.neutronStar || '').trim();
  const _nsDot = _nsRaw && !/[.!?]$/.test(_nsRaw) ? _nsRaw + '.' : _nsRaw;
  const goalHtml = esc(_nsDot).replace(/(\d[\d,.]*)/g, '<span class="ns-min__num">$1</span>');
  const timeframe = (summary.timeHorizon || '').trim();

  return `
    <div class="ns-star-scene ns-star-scene--manifesto ns-star-scene--min" id="nsScene">
      <div class="ns-star-scene__starfield" id="nsStarfield" aria-hidden="true"></div>
      <button type="button" class="ns-min__menu-btn" id="nsMenuBtn" aria-label="More options" aria-haspopup="true">&middot;&middot;&middot;</button>
      <div class="ns-star-stage" id="nsStarStage">
        <div class="ns-star-glow"></div>
        <canvas class="ns-star-blob" id="nsStarBlob" width="360" height="360" aria-hidden="true"></canvas>
      </div>
      <div class="ns-min__content">
        <div class="ns-min__eyebrow">Your Neutron Star</div>
        <h1 class="ns-min__goal">${goalHtml}</h1>
        <div class="ns-min__divider" aria-hidden="true"></div>
        ${timeframe ? `<div class="ns-min__time">${calIcon}<span>${esc(timeframe)}</span></div>` : ''}
        ${(function () {
          // v815 (Malik): once the star has already been added (the card
          // evolution has played), the CTA turns into a quiet ghost receipt,
          // "Added to Memento", instead of re-selling the add. Same tap
          // (closes back to the home), it just stops shouting.
          const added = !!(state && state.meta && state.meta.cardEvolutionSeen);
          if (added) {
            return `<button type="button" id="summaryAction" class="ns-min__cta ns-min__cta--added">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 12.5 10 18.5 20 6.5"/></svg>
              <span>Added to Memento</span>
            </button>`;
          }
          return `<button type="button" id="summaryAction" class="ns-min__cta">
            <span>Add to your Memento</span>${arrowRight}
          </button>`;
        })()}
      </div>
      <div class="ns-min__sheet" id="nsMenuSheet" aria-hidden="true" role="menu">
        <button type="button" id="summaryContinue" class="ns-min__sheet-item" role="menuitem">Refine answers</button>
        <button type="button" id="nsExplainBtn" class="ns-min__sheet-item" role="menuitem">What's a Neutron Star?</button>
      </div>

      <!-- Explanation sheet: opens from the "What's this?" quiet link.
           Recaps what a Neutron Star is as a metaphor + why clarity matters.
           Lives at the SCENE level (not inside the scrolling detail) so it
           covers the whole viewport regardless of scroll position. -->
      <div class="ns-explain-sheet" id="nsExplainSheet" aria-hidden="true" role="dialog" aria-label="What is a Neutron Star">
            <button type="button" id="nsExplainClose" class="ns-explain-sheet__close" aria-label="Close">&times;</button>
            <div class="ns-explain-sheet__inner">
              <div class="ns-explain-sheet__eyebrow">REMINDER</div>
              <h2 class="ns-explain-sheet__title">What is a Neutron Star?</h2>
              <p class="ns-explain-sheet__lede">A neutron star is the heaviest object in the universe. So dense that its gravity pulls everything nearby toward it. Nothing escapes.</p>
              <p class="ns-explain-sheet__copy">Your Neutron Star is that, but for your life. A goal so heavy, so clearly worth chasing, that no distraction can outweigh it. When you're locked onto it, the doomscrolling, the late nights, the noise, none of it can pull you off course.</p>
              <div class="ns-explain-sheet__section">
                <div class="ns-explain-sheet__section-label">WHY CLARITY MATTERS</div>
                <p class="ns-explain-sheet__copy">Most people drift through life because they never get clear on what they actually want or why. They settle for whatever life moves them toward. The Clarity module exists to make sure that's not you.</p>
              </div>
              <div class="ns-explain-sheet__section">
                <div class="ns-explain-sheet__section-label">THE FIVE FIELDS</div>
                <ul class="ns-explain-sheet__list">
                  <li><strong>Goal</strong>. The concrete action or outcome you're chasing. The WHAT.</li>
                  <li><strong>Why</strong>. The real reason it matters. The thing you keep circling back to.</li>
                  <li><strong>Future</strong>. The picture if it works. Specific.</li>
                  <li><strong>Anti-vision</strong>. The picture if it fails. The default future if you do nothing.</li>
                  <li><strong>Identity</strong>. The kind of person this turns you into.</li>
                </ul>
              </div>
              <p class="ns-explain-sheet__copy ns-explain-sheet__copy--quiet">Your Neutron Star is set. Everything else in Memento orbits around it.</p>
        </div>
      </div>
    </div>
  `;
}

const FullscreenClose = {
  el: null,
  source: '',

  init() {
    this.el = document.getElementById('fullscreenCloseGlobal');
    if (!this.el) return;
    const handle = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      exitToModules(this.source || '');
    };
    this.el.addEventListener('click', handle);
    this.el.addEventListener('pointerdown', handle);
    this.el.addEventListener('touchend', handle, { passive: false });
  },

  show(source) {
    this.source = source || '';
    if (this.el) this.el.classList.add('visible');
  },

  hide() {
    this.source = '';
    if (this.el) this.el.classList.remove('visible');
  }
};

// Local calendar date, NOT UTC. toISOString() flips "today" at the UTC
// boundary (5-8pm for US users), which put evening logs on tomorrow's
// heatmap cell and skewed streaks. Day keys must follow the user's clock.
function localISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function getTodayISO() { return localISO(new Date()); }
// === Updates center (the new Inbox) ================================
// Quiet, append-only app notifications: grace days banked or spent, records,
// the weekly card, comebacks. Capped at 120; entries older than 30 days are
// pruned when the Updates sheet renders. Never a red badge, only a quiet dot.
function pushUpdate(type, title, text) {
  try {
    if (!Array.isArray(state.updates)) state.updates = [];
    state.updates.push({
      id: 'up_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: type || 'info', title: String(title || ''), text: String(text || ''),
      ts: Date.now(), read: false
    });
    if (state.updates.length > 120) state.updates = state.updates.slice(-120);
    persistState();
  } catch (e) {}
}
function unreadUpdatesCount() {
  try { return (state.updates || []).filter(u => u && !u.read).length; } catch (e) { return 0; }
}

// Day key (LOCAL) for any stored date value. Full ISO timestamps (how
// completionHistory records entries) convert through the local clock; bare
// YYYY-MM-DD strings pass through untouched. Comparing a UTC-sliced day
// against a local todayStr made "done today" read false after ~5pm US time.
function isoToLocalDay(v) {
  try {
    if (!v) return null;
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dt = new Date(s);
    if (isNaN(dt.getTime())) return null;
    return localISO(dt);
  } catch (_) { return null; }
}

/* ============================================
   COMEBACK MODE  (retention loop)
   ----------------------------------------------
   Read-only detection of a fall-off gap. Returns the number of whole days
   since the user's most recent activity (a completed action or a streak
   check-in), or 0 when they are active today. NOTE: checkDayChange() runs at
   boot and overwrites state.meta.lastVisit to today, so lastVisit is NOT a
   reliable gap signal at render time; we derive recency from completionHistory
   and streak.lastCheckDate instead (both read-only here).
   ============================================ */
function comebackGapDays() {
  try {
    const today = getTodayISO();
    const todayNum = Math.floor(new Date(today + 'T00:00:00Z').getTime() / 86400000);
    let mostRecent = null; // most recent activity day number
    const consider = (iso) => {
      if (!iso || typeof iso !== 'string') return;
      // Local day (completionHistory.date is a full ISO timestamp; a raw slice
      // would be the UTC day and under-report the gap for evening US users).
      const key = isoToLocalDay(iso);
      if (!key) return;
      const n = Math.floor(new Date(key + 'T00:00:00Z').getTime() / 86400000);
      if (isNaN(n)) return;
      if (mostRecent === null || n > mostRecent) mostRecent = n;
    };
    const ch = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
    if (ch.length) consider(ch[ch.length - 1].date);
    if (state.streak && state.streak.lastCheckDate) consider(state.streak.lastCheckDate);
    // Use the SAME unified activity set the streak uses (actions, reflections,
    // deep work, check-ins, streak history), so a user who keeps the streak alive
    // via reflections or deep work is never falsely told they "fell off".
    try { Object.keys(buildConsistencyData()).forEach(k => consider(k)); } catch (e) {}
    if (mostRecent === null) return 0; // never acted: not a "comeback", let the normal next-step path handle it
    const gap = todayNum - mostRecent;
    return gap > 0 ? gap : 0;
  } catch (e) { return 0; }
}
function isComebackGap() {
  try {
    const pa = (state.action && state.action.primaryAction) || {};
    const hasPlan = !!(state.action && state.action.planGenerated && pa.title);
    if (!hasPlan) return false;            // nothing to come back to yet
    return comebackGapDays() >= 2;         // false when active today (gap 0 or 1)
  } catch (e) { return false; }
}
function recordComebackReason(reason) {
  try {
    if (!reason) return;
    state.comeback = state.comeback || { reasons: [] };
    if (!Array.isArray(state.comeback.reasons)) state.comeback.reasons = [];
    state.comeback.reasons.push({ date: getTodayISO(), reason: String(reason).slice(0, 40) });
    if (state.comeback.reasons.length > 60) state.comeback.reasons = state.comeback.reasons.slice(-60);
    persistNow();
  } catch (e) {}
}

// Transient (never persisted): true for the first render after the day rolls
// over, so renderGreeting can surface the user's return cue once per new day.
let _returnCueDue = false;
function checkDayChange() {
  const today = getTodayISO();
  if (state.meta.lastVisit !== today) {
    // A real new visit (lastVisit was a prior day, not null/first-run). Arm the
    // once-a-day return-cue line. Skip the very first run so a brand-new user is
    // not shown a cue they have not set yet.
    if (state.meta.lastVisit) _returnCueDue = true;
    if (!state.action.todayPlan) state.action.todayPlan = { deepWork: '', proofTask: '', tinyUpgrade: '', proofDone: false, tinyDone: false, deepWorkDone: false };
    state.action.todayPlan.proofDone = false;
    state.action.todayPlan.tinyDone = false;
    state.action.todayPlan.deepWorkDone = false;
    state.action.date = today;
    // Reset Energy's in-progress dimension values at rollover so a new day does
    // not pre-fill (or save) yesterday's ratings. Saved days live in history.
    if (state.lifestats) { ['sleep', 'diet', 'exercise', 'mood', 'stress', 'focus'].forEach(k => { state.lifestats[k] = 0; }); }
    if (state.streak.lastCheckDate) {
      const diff = Math.floor((new Date(today) - new Date(state.streak.lastCheckDate)) / 86400000);
      if (diff > 1) { state.streak.count = 0; } // reset count only; history is append-only and recalculateStreak re-derives the count
    }
    state.meta.lastVisit = today;
    persistNow();
  }
}

/* ============================================
   STATE MIGRATION (V2 → V3)
   ============================================ */
function migrateState() {
  // ---- Defensive normalize (runs first) -----------------------------------
  // A corrupted, hand-edited, or very old backup can carry wrong-typed top-level
  // fields (clarity as an array, entries as null, widgetOrder missing). Restore
  // the shapes the rest of migrateState and the renderers assume, cloned from
  // DEFAULT_STATE so nothing here can mutate the defaults. This makes load and
  // import crash-proof: bad data degrades to a clean default instead of bricking
  // the app.
  try {
    const _clone = (v) => JSON.parse(JSON.stringify(v));
    const _isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (!_isObj(state)) state = _clone(DEFAULT_STATE);
    const objKeys = ['profile', 'dev', 'entitlements', 'clarity', 'action', 'streak', 'flow', 'mori', 'lifestats', 'reflection', 'deepwork', 'distraction', 'vivere', 'support', 'meta', 'ui', 'prefs', 'aiCache'];
    objKeys.forEach(k => { if (!_isObj(state[k])) state[k] = _clone(DEFAULT_STATE[k] || {}); });
    if (!_isObj(state.clarity.answers)) state.clarity.answers = _clone(DEFAULT_STATE.clarity.answers);
    if (!Array.isArray(state.widgetOrder)) state.widgetOrder = _clone(DEFAULT_STATE.widgetOrder);
    // Arrays the modules read/push to.
    if (!Array.isArray(state.reflection.entries)) state.reflection.entries = [];
    if (!Array.isArray(state.reflection.trash)) state.reflection.trash = [];
    if (!Array.isArray(state.reflection.folders)) state.reflection.folders = [];
    if (!state.support.contacts || typeof state.support.contacts !== 'object') state.support.contacts = _clone(DEFAULT_STATE.support.contacts);
    if (!Array.isArray(state.support.feedbackQueue)) state.support.feedbackQueue = [];
    if (!Array.isArray(state.deepwork.sessions)) state.deepwork.sessions = [];
    if (!Array.isArray(state.distraction.logs)) state.distraction.logs = [];
    if (!Array.isArray(state.checkins)) state.checkins = [];
    if (!Array.isArray(state.streak.history)) state.streak.history = [];
    if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
    if (!Array.isArray(state.action.projects)) state.action.projects = [];
    if (!Array.isArray(state.inbox)) state.inbox = [];
    if (!Array.isArray(state.updates)) state.updates = [];
    // One-time: the Memento card is now LIVING (color evolves with the pillars)
    // by default. Flip anyone still on the old 'platinum' default once. After
    // this runs, an explicit platinum pick in Settings/emblem sticks (the guard
    // never re-flips). New users default to living via DEFAULT_STATE.
    try {
      if (!state.meta.livingDefaultV1) {
        if (state.dayCard && state.dayCard.theme === 'platinum') state.dayCard.theme = 'living';
        state.meta.livingDefaultV1 = true;
      }
    } catch (e) {}
    // One-time: the old Inbox captures move into a "Captures" folder in Notes.
    // The Inbox module itself becomes the quiet Updates center, so nothing a
    // user wrote is ever stranded in a module that no longer captures.
    try {
      if (!state.meta.inboxMigratedToNotes && Array.isArray(state.inbox) && state.inbox.length) {
        if (!Array.isArray(state.reflection.folders)) state.reflection.folders = [];
        if (!Array.isArray(state.reflection.entries)) state.reflection.entries = [];
        let capFolder = state.reflection.folders.find(x => x && x.name === 'Captures');
        if (!capFolder) {
          capFolder = { id: 'fold_captures_' + Date.now().toString(36), name: 'Captures' };
          state.reflection.folders.push(capFolder);
        }
        state.inbox.forEach((it) => {
          if (!it || !it.text) return;
          const when = it.ts ? new Date(it.ts) : new Date();
          state.reflection.entries.push({
            id: 'rn_cap_' + (it.id || Math.random().toString(36).slice(2, 9)),
            iso: it.iso || localISO(when),
            date: when.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            text: it.text, html: '', title: '', folder: capFolder.id, updated: it.ts || Date.now()
          });
        });
        state.inbox = [];
        state.meta.inboxMigratedToNotes = true;
      }
    } catch (e) {}
    if (!state.bookends || typeof state.bookends !== 'object') state.bookends = { lastMorningISO: '', lastEveningISO: '' };
    if (!Array.isArray(state.timeblocks)) state.timeblocks = [];
    if (!Array.isArray(state.people)) state.people = [];
    if (!Array.isArray(state.lifestats.history)) state.lifestats.history = [];
    if (!Array.isArray(state.clarity.history)) state.clarity.history = [];
    if (!Array.isArray(state.clarity.driftChecks)) state.clarity.driftChecks = [];
    // Ignition migration: users who completed Clarity BEFORE the ignition
    // ceremony existed should not get the one-time ceremony retroactively
    // (it would feel hollow without the journey). Mark them as already ignited.
    if (state.clarity.completed && !state.clarity.ignitedAt) {
      state.clarity.ignitedAt = state.clarity.completedAt || Date.now();
    }
    // todayPlan is normally created by checkDayChange, but an imported same-day
    // backup (lastVisit === today) skips that, and renderMemento / the action
    // check read it unguarded. Guarantee the shape.
    if (!state.action.todayPlan || typeof state.action.todayPlan !== 'object') state.action.todayPlan = { deepWork: '', proofTask: '', tinyUpgrade: '', proofDone: false, tinyDone: false, deepWorkDone: false };
    if (!Array.isArray(state.flow.items)) state.flow.items = _clone(DEFAULT_STATE.flow.items);
    if (!Array.isArray(state.hiddenWidgets)) state.hiddenWidgets = [];
    if (!Array.isArray(state.layoutPresets)) state.layoutPresets = [];
    if (state.ui && typeof state.ui.layoutCustomized !== 'boolean') state.ui.layoutCustomized = false;
    if (!Array.isArray(state.proofEvents)) state.proofEvents = [];
  } catch (e) {}

  // Migrate flat widgetOrder strings to objects
  if (state.widgetOrder.length && typeof state.widgetOrder[0] === 'string') {
    state.widgetOrder = state.widgetOrder.map(key => ({
      key,
      size: (key === 'clarity' || key === 'action' || key === 'mori') ? 'full' : 'half'
    }));
  }
  if (!state.introsSeen) {
    state.introsSeen = { clarity: false, action: false, streak: false, flow: false, mori: false, lifestats: false, deepwork: false, reflection: false };
  }
  if (state.clarity && state.clarity.tutorialSeen === undefined) {
    state.clarity.tutorialSeen = false;
  }
  if (!state.lifestats) {
    state.lifestats = { sleep: 0, diet: 0, exercise: 0, history: [] };
  }
  // v23: lifestats is retired from the default grid, so it is no longer
  // auto-seeded into widgetOrder here (kept if the user pinned it).
  // V2.1 - Remove standalone Clarity sphere (merged into Primary Mission hero).
  const sphereIdx = state.widgetOrder.findIndex(w => w.key === 'claritySphere');
  if (sphereIdx !== -1) state.widgetOrder.splice(sphereIdx, 1);
  // V2.3 - Remove Quick Actions and Resources (didn't earn their space).
  ['quickActions', 'resources'].forEach(key => {
    const idx = state.widgetOrder.findIndex(w => w.key === key);
    if (idx !== -1) state.widgetOrder.splice(idx, 1);
  });
  // V2.2 - Enforce canonical widget order so the mobile grid (6-col subgrid)
  // packs cards correctly. Preserves user-customized sizes where possible.
  // v16: Flow merged into Friction (the distraction module), so it no longer
  // gets its own grid card. Its data (state.flow.items) lives on inside Friction.
  // v23: lifestats/deepwork/distraction are retired from the default grid but
  // remain ALLOWED (a user can pin them back from the More space); they are
  // simply never auto-appended for users who do not have them.
  const CANONICAL_ORDER = ['clarity','action','streak','mori','checkin','vivere','reflection'];
  const RETIRED_WIDGETS = ['lifestats','deepwork','distraction'];
  const _CANON = {}; CANONICAL_ORDER.concat(RETIRED_WIDGETS).forEach(k => { _CANON[k] = true; });
  const _defSize = (key) => (key === 'clarity' || key === 'action' || key === 'reflection') ? 'full' : 'half';
  // v19 Custom Layouts: PRESERVE the user's saved order (so drag-reorder sticks
  // across reloads) while still self-healing. Dedupe, drop non-canonical/legacy
  // keys (claritySphere/quickActions/resources/personality), then append any
  // canonical widget the user is missing (e.g. a newly added module).
  const _seen = {};
  const _kept = [];
  (Array.isArray(state.widgetOrder) ? state.widgetOrder : []).forEach(w => {
    if (!w || !w.key || !_CANON[w.key] || _seen[w.key]) return;
    _seen[w.key] = true;
    _kept.push({ key: w.key, size: (w.size === 'full' || w.size === 'half') ? w.size : _defSize(w.key) });
  });
  CANONICAL_ORDER.forEach(key => { if (!_seen[key]) { _kept.push({ key, size: _defSize(key) }); _seen[key] = true; } });
  state.widgetOrder = _kept;

  // ---- v23 one-time Check-in consolidation (meta.checkinV1) -----------------
  // Existing users: Check-in takes the Energy slot; Energy/Friction/Deep Work
  // come off the dashboard (data stays, sheets stay reachable via More). Users
  // who already completed Clarity are grandfathered with prefs.unlockAll so
  // the new unlock ladder never hides anything they had.
  if (state.meta && !state.meta.checkinV1) {
    try {
      const ord = state.widgetOrder;
      ['lifestats', 'deepwork', 'distraction'].forEach(k => {
        const i = ord.findIndex(w => w.key === k);
        if (i !== -1) ord.splice(i, 1);
      });
      let ciIdx = ord.findIndex(w => w.key === 'checkin');
      if (ciIdx === -1) { ord.push({ key: 'checkin', size: 'half' }); ciIdx = ord.length - 1; }
      // Check-in sits right after Mori (pairs with it on the mobile subgrid).
      const ci = ord.splice(ciIdx, 1)[0];
      const mIdx = ord.findIndex(w => w.key === 'mori');
      ord.splice(mIdx === -1 ? ord.length : mIdx + 1, 0, ci);
      if (state.clarity && state.clarity.completed) {
        if (!state.prefs || typeof state.prefs !== 'object') state.prefs = {};
        state.prefs.unlockAll = true;
      }
    } catch (e) {}
    state.meta.checkinV1 = true;
  }
  // V4 → V5 migrations
  if (!state.profile.email) state.profile.email = '';
  if (!state.dev) state.dev = { previewAll: false, savedClarity: null };
  if (state.dev.previewAll === undefined) state.dev.previewAll = false;
  if (state.dev.savedClarity === undefined) state.dev.savedClarity = null;
  if (state.meta.welcomeSeen === undefined) state.meta.welcomeSeen = false;
  if (state.meta.backupNudged === undefined) state.meta.backupNudged = false;
  if (state.meta.saveWorkNudged === undefined) state.meta.saveWorkNudged = false;
  // Consistency: personal-record tracking. Seed from the historical longest run so
  // existing users start with an accurate "best ever" and never see a retroactive
  // record celebration; bestEverShown gates the calm "new record" moment to fire
  // once per genuinely new high (set forward only as the current streak beats it).
  if (state.streak.bestEver === undefined) {
    var _seedBest = 0;
    try { _seedBest = (typeof consistencyStats === 'function') ? (consistencyStats().longest || 0) : 0; } catch (e) { _seedBest = 0; }
    state.streak.bestEver = Math.max(_seedBest, state.streak.count || 0);
  }
  if (state.streak.bestEverShown === undefined) state.streak.bestEverShown = state.streak.bestEver;
  if (!Array.isArray(state.streak.milestonesShown)) {
    // Backfill so existing users past a milestone do not get a surprise banner
    // retroactively: mark every threshold at/below the current count as shown.
    state.streak.milestonesShown = [7, 14, 30, 60, 100, 180, 365].filter(t => (state.streak.count || 0) >= t);
  }
  if (!state.reflection) state.reflection = { entries: [] };
  if (!state.deepwork) state.deepwork = { sessions: [] };
  if (!state.clarity.answers.whatSpecifically) state.clarity.answers.whatSpecifically = '';
  if (!state.clarity.answers.whyMatters) state.clarity.answers.whyMatters = '';
  if (!state.clarity.answers.whyMoreThanAnything) state.clarity.answers.whyMoreThanAnything = '';
  if (!state.clarity.answers.oneYearScrolling) state.clarity.answers.oneYearScrolling = '';
  if (!state.clarity.answers.whatsOnMind) state.clarity.answers.whatsOnMind = '';
  // V7 → V8: Distraction module (v23: no longer auto-seeded into widgetOrder)
  if (!state.distraction) state.distraction = { logs: [] };
  // V11 - Personality (Myth of Sisyphus) widget removed; no longer seeded.
  if (state.introsSeen && state.introsSeen.distraction === undefined) {
    state.introsSeen.distraction = false;
  }
  // V5 → V6 AI migrations
  if (!state.clarity.answers.neutronStar) state.clarity.answers.neutronStar = '';
  if (!state.clarity.answers.emotionalAnchor) state.clarity.answers.emotionalAnchor = '';
  if (!state.clarity.answers.whyItMatters) state.clarity.answers.whyItMatters = '';
  if (!state.clarity.answers.aiActions) state.clarity.answers.aiActions = [];
  if (!state.clarity.answers.ninetyDayGoal) state.clarity.answers.ninetyDayGoal = '';
  if (!state.clarity.answers.aiConversation) state.clarity.answers.aiConversation = [];
  if (!state.clarity.answers.coreWhy) state.clarity.answers.coreWhy = '';
  if (!state.clarity.answers.antiVision) state.clarity.answers.antiVision = '';
  if (!state.clarity.answers.futureVision) state.clarity.answers.futureVision = '';
  if (!state.clarity.answers.identityLine) state.clarity.answers.identityLine = '';
  if (state.action.tutorialSeen === undefined) state.action.tutorialSeen = false;
  if (state.action.introSeen === undefined) state.action.introSeen = false;
  if (state.action.wizStep === undefined) state.action.wizStep = 0;
  if (!state.action.wizAnswers) state.action.wizAnswers = { goalConfirmation: '', alreadyTried: '', scaleFeeling: '', biggestBlocker: '' };
  if (state.action.viewMode !== 'mountain' && state.action.viewMode !== 'vine') state.action.viewMode = 'vine';
  if (!state.action.primaryAction || state.action.primaryAction.whyNow !== undefined) state.action.primaryAction = { title: '', why: '', tiers: { tiny: '', light: '', moderate: '', heavy: '', extreme: '' }, recommendedTier: 'moderate', recommendedWhy: '', howToStart: '' };
  if (!state.action.primaryAction.tiers) state.action.primaryAction.tiers = { tiny: '', light: '', moderate: '', heavy: '', extreme: '' };
  // Migrate legacy 3-tier shape (minimum/moderate/ambitious) to 5-tier.
  {
    const t = state.action.primaryAction.tiers;
    if (t && (t.minimum !== undefined || t.ambitious !== undefined)) {
      state.action.primaryAction.tiers = {
        tiny: t.tiny || '',
        light: t.light || t.minimum || '',
        moderate: t.moderate || '',
        heavy: t.heavy || t.ambitious || '',
        extreme: t.extreme || ''
      };
    }
    // Ensure all 5 keys exist.
    ['tiny','light','moderate','heavy','extreme'].forEach(k => {
      if (state.action.primaryAction.tiers[k] === undefined) state.action.primaryAction.tiers[k] = '';
    });
  }
  // Migrate legacy recommendedTier values.
  if (state.action.primaryAction.recommendedTier === 'minimum') state.action.primaryAction.recommendedTier = 'light';
  if (state.action.primaryAction.recommendedTier === 'ambitious') state.action.primaryAction.recommendedTier = 'heavy';
  if (!['tiny','light','moderate','heavy','extreme'].includes(state.action.primaryAction.recommendedTier)) state.action.primaryAction.recommendedTier = 'moderate';
  if (state.action.primaryAction.recommendedWhy === undefined) state.action.primaryAction.recommendedWhy = '';
  if (!Array.isArray(state.action.primaryAction.path)) state.action.primaryAction.path = [];
  if (!Array.isArray(state.action.supportingActions)) state.action.supportingActions = [];
  if (state.action.planGenerated === undefined) state.action.planGenerated = false;
  // Completion history. Every "Mark complete" tap appends here so the AI
  // can generate the NEXT logical step when the user asks for a refresh.
  if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
  if (!state.action.refine || typeof state.action.refine !== 'object') state.action.refine = { messages: [], refinedText: '', refinedForTier: '' };
  // ONE-TIME MIGRATION: run the current sanitizer over any existing plan
  // text on load so users with pre-fix cached plans don't keep staring at
  // "Three full-day blocks this week" forever. Scrubs cadence/time/deadline
  // words from title + howToStart, and re-validates each tier against the
  // current sanitizer rules. Safe to re-run on every init, idempotent for
  // already-clean text.
  if (state.action.primaryAction && typeof stripCadenceAndTime === 'function') {
    const pa = state.action.primaryAction;
    // v909: title and howToStart are NO LONGER stripped. The strip garbled
    // durations mid-sentence ("for [60 seconds] before" -> "for before") and
    // erased the cadence the doctrine now wants visible in lever titles.
    // Tiers still get re-validated below with a cadence-free fallback.
    if (pa.tiers && typeof pa.tiers === 'object') {
      const titleFb = stripCadenceAndTime(pa.title || '');
      const tierKeys = ['tiny','light','moderate','heavy','extreme'];
      tierKeys.forEach(k => {
        if (pa.tiers[k]) {
          pa.tiers[k] = sanitizeTierText(pa.tiers[k], titleFb);
        }
      });
      // Dedup after migration: if cached state had identical tiers (the
      // common case for old bad plans), keep the first occurrence and
      // replace later duplicates with the cleaned title.
      const seenMig = {};
      tierKeys.forEach(k => {
        const t = (pa.tiers[k] || '').toLowerCase();
        if (t && seenMig[t]) {
          pa.tiers[k] = titleFb.split(/\s+/).slice(0, 7).join(' ');
        }
        seenMig[(pa.tiers[k] || '').toLowerCase()] = true;
      });
    }
    pa.recommendedTier = 'moderate';
  }
  if (!Array.isArray(state.action.refine.messages)) state.action.refine.messages = [];
  if (typeof state.action.refine.refinedText !== 'string') state.action.refine.refinedText = '';
  if (typeof state.action.refine.refinedForTier !== 'string') state.action.refine.refinedForTier = '';
  if (!state.action.quote || typeof state.action.quote !== 'object') state.action.quote = { dismissed: false, index: 0 };
  if (typeof state.action.quote.dismissed !== 'boolean') state.action.quote.dismissed = false;
  if (typeof state.action.quote.index !== 'number') state.action.quote.index = 0;
  if (!state.action.planSourceNeutronStar) state.action.planSourceNeutronStar = '';
  if (!state.action.lastGeneratedAt) state.action.lastGeneratedAt = null;
  // Round 8 - Action V2 fields (adaptive chat + Focus Plan)
  if (!Array.isArray(state.action.aiConversation)) state.action.aiConversation = [];
  if (!state.action.focusPlan || typeof state.action.focusPlan !== 'object') {
    state.action.focusPlan = { frame: '', frictionRemove: [], frictionAdd: [] };
  }
  if (!Array.isArray(state.action.focusPlan.frictionRemove)) state.action.focusPlan.frictionRemove = [];
  if (!Array.isArray(state.action.focusPlan.frictionAdd)) state.action.focusPlan.frictionAdd = [];
  if (typeof state.action.focusPlan.frame !== 'string') state.action.focusPlan.frame = '';
  // Cap unbounded history arrays so a heavy long-term user never grows the
  // saved blob past what localStorage can hold (which would silently fail the
  // setItem and lose writes). Trims the OLDEST entries, keeps the most recent
  // window. streak.history keeps its own existing 400 cap elsewhere. Purely
  // additive and idempotent: only slices when over the cap, never erases all.
  const HISTORY_CAP = 400;
  const _capHistory = (obj, key) => {
    if (obj && Array.isArray(obj[key]) && obj[key].length > HISTORY_CAP) {
      obj[key] = obj[key].slice(-HISTORY_CAP);
    }
  };
  _capHistory(state.action, 'completionHistory');
  _capHistory(state.action, 'aiConversation');
  if (state.reflection) _capHistory(state.reflection, 'entries');
  if (state.deepwork) _capHistory(state.deepwork, 'sessions');
  if (state.distraction) _capHistory(state.distraction, 'logs');
  _capHistory(state, 'checkins');
  if (state.clarity && state.clarity.answers) _capHistory(state.clarity.answers, 'aiConversation');
  if (state.clarity) _capHistory(state.clarity, 'history');
  if (state.commandCenter) _capHistory(state.commandCenter, 'checkins');
  if (state.vivere) { _capHistory(state.vivere, 'memories'); _capHistory(state.vivere, 'weeklyReviews'); }

  // ---- v16 additive state (idempotent; safe for pre-v16 stored blobs) ----
  if (!Array.isArray(state.proofEvents)) state.proofEvents = [];
  if (!state.ui || typeof state.ui !== 'object') state.ui = {};
  if (state.ui.homeHero === undefined) state.ui.homeHero = 'oneThing';
  // v27: the Home hero toggle is retired on the desktop bento; the mission focus
  // (Today / oneThing) is the centerpiece, and Consistency has its own tile. Reset
  // users still on the old 'consistency'/'neutron' default ONCE so the left card is
  // the clean mission, not the tall heatmap hero. The flag means a deliberate later
  // switch (still available on mobile) sticks.
  if (!state.ui._v27HeroReset) { state.ui.homeHero = 'oneThing'; state.ui._v27HeroReset = true; }
  if (!state.ui.variants || typeof state.ui.variants !== 'object') state.ui.variants = { home: 'a', streak: 'a', mori: 'a' };
  if (state.ui.variants.home === undefined) state.ui.variants.home = 'a';
  if (state.ui.variants.streak === undefined) state.ui.variants.streak = 'a';
  if (state.ui.variants.mori === undefined) state.ui.variants.mori = 'a';
  // ---- v23 unlock ladder + More space (additive, idempotent) ----------------
  if (!state.ui.moduleOpens || typeof state.ui.moduleOpens !== 'object' || Array.isArray(state.ui.moduleOpens)) state.ui.moduleOpens = {};
  if (!state.ui.unlocked || typeof state.ui.unlocked !== 'object' || Array.isArray(state.ui.unlocked)) state.ui.unlocked = {};
  if (!Array.isArray(state.ui.unlockQueue)) state.ui.unlockQueue = [];
  if (typeof state.ui.lastUnlockISO !== 'string') state.ui.lastUnlockISO = '';
  if (typeof state.ui.pendingReveal !== 'string') state.ui.pendingReveal = '';
  if (state.prefs && state.prefs.unlockAll === undefined) state.prefs.unlockAll = false;
  // v800 sweep: unlockAll is the module-noise ladder hatch, never a payment.
  // A stale flag (old grandfather migration, imported backup, hand-edited
  // storage) must not ride into a free account looking paid-adjacent. Demo
  // personas keep it (their state is rebuilt each load with ?demo=).
  try {
    if (state.prefs && state.prefs.unlockAll &&
        !(state.entitlements && state.entitlements.isPaid) &&
        !/[?&]demo=/.test(location.search)) {
      state.prefs.unlockAll = false;
    }
  } catch (e) {}
  if (state.introsSeen && state.introsSeen.checkin === undefined) state.introsSeen.checkin = false;
  if (state.lifestats) {
    if (state.lifestats.mood === undefined) state.lifestats.mood = 0;
    if (state.lifestats.stress === undefined) state.lifestats.stress = 0;
    if (state.lifestats.focus === undefined) state.lifestats.focus = 0;
  }
  if (state.mori && state.mori.futureSelfNote === undefined) state.mori.futureSelfNote = '';
  if (state.mori && !Array.isArray(state.mori.people)) state.mori.people = [];
  if (state.mori && state.mori.lifestyle && state.mori.lifestyle.booksPerYear === undefined) state.mori.lifestyle.booksPerYear = 5;
  if (state.prefs && state.prefs.anchorQuote === undefined) state.prefs.anchorQuote = '';
  if (state.prefs && typeof state.prefs.uiRadius !== 'number') state.prefs.uiRadius = 1;
  if (state.prefs && typeof state.prefs.uiGlass !== 'number') state.prefs.uiGlass = 0;
  if (state.prefs && typeof state.prefs.uiBlur !== 'number') state.prefs.uiBlur = 1;
  // Custom background (additive, idempotent). type: default|minimal|color|image.
  if (state.prefs) {
    const bgp = state.prefs.background;
    if (!bgp || typeof bgp !== 'object' || Array.isArray(bgp) ||
        ['default', 'minimal', 'color', 'image'].indexOf(bgp.type) === -1) {
      state.prefs.background = { type: 'default', value: '' };
    } else if (typeof bgp.value !== 'string') {
      bgp.value = '';
    }
    if (typeof state.prefs.bgDim !== 'number' || !isFinite(state.prefs.bgDim)) state.prefs.bgDim = 0.2;
    state.prefs.bgDim = Math.min(0.6, Math.max(0, state.prefs.bgDim));
  }
  if (state.profile && state.profile.returnCue === undefined) state.profile.returnCue = '';
  // Customizable mission headline (additive, idempotent). mode: auto|preset|custom.
  if (state.profile) {
    const hh = state.profile.heroHeadline;
    if (!hh || typeof hh !== 'object' || Array.isArray(hh)) state.profile.heroHeadline = { mode: 'auto', value: '' };
    else {
      if (hh.mode !== 'preset' && hh.mode !== 'custom') hh.mode = 'auto';
      if (typeof hh.value !== 'string') hh.value = '';
    }
  }
  // Dashboard heatmap span scale (week|month|year), separate from the module
  // breakdown's consistencyScale so the two pickers never collide.
  if (state.ui && (state.ui.ccHeatmapScale !== 'week' && state.ui.ccHeatmapScale !== 'month' && state.ui.ccHeatmapScale !== 'year')) state.ui.ccHeatmapScale = 'year';

  // ---- Memento Vivere (additive; never wipes an existing vivere blob) -------
  if (!state.vivere || typeof state.vivere !== 'object' || Array.isArray(state.vivere)) {
    state.vivere = {
      today: { date: '', prompt: '', category: '', done: false, note: '', media: [] },
      memories: [], aliveList: [],
      categories: { connection: 0, beauty: 0, play: 0, awe: 0, peace: 0, body: 0, meaning: 0, novelty: 0 },
      weeklyReviews: [], resurfacedMemoryIds: []
    };
  } else {
    const v = state.vivere;
    if (!v.today || typeof v.today !== 'object') v.today = { date: '', prompt: '', category: '', done: false, note: '', media: [] };
    if (!Array.isArray(v.today.media)) v.today.media = [];
    if (!Array.isArray(v.memories)) v.memories = [];
    if (!Array.isArray(v.aliveList)) v.aliveList = [];
    if (!Array.isArray(v.weeklyReviews)) v.weeklyReviews = [];
    if (!Array.isArray(v.resurfacedMemoryIds)) v.resurfacedMemoryIds = [];
    if (!v.categories || typeof v.categories !== 'object') v.categories = {};
    ['connection','beauty','play','awe','peace','body','meaning','novelty'].forEach(k => {
      if (typeof v.categories[k] !== 'number') v.categories[k] = 0;
    });
  }
  // Make sure the Vivere widget is in the order for users whose stored order
  // predates it (CANONICAL_ORDER re-derive above already covers most, this is a
  // belt-and-suspenders guard kept idempotent).
  if (Array.isArray(state.widgetOrder) && !state.widgetOrder.find(w => w.key === 'vivere')) {
    const mIdx = state.widgetOrder.findIndex(w => w.key === 'mori');
    state.widgetOrder.splice(mIdx === -1 ? state.widgetOrder.length : mIdx + 1, 0, { key: 'vivere', size: 'half' });
  }
  // v690 (Malik): the photo tile, one personal image on the dashboard. Sits
  // beside Memento Mori (where the retired check-in tile used to be).
  if (Array.isArray(state.widgetOrder) && !state.widgetOrder.find(w => w.key === 'photo')) {
    const mIdx2 = state.widgetOrder.findIndex(w => w.key === 'mori');
    state.widgetOrder.splice(mIdx2 === -1 ? state.widgetOrder.length : mIdx2, 0, { key: 'photo', size: 'half' });
  }
  if (state.introsSeen && state.introsSeen.vivere === undefined) state.introsSeen.vivere = false;
  if (state.meta && state.meta.proofEventsDerivedV1 === undefined) state.meta.proofEventsDerivedV1 = false;

  // One-shot: derive proof events from the legacy history arrays so the Proof
  // Trail has historical depth on the first v16 load. Never deletes legacy data;
  // dedupes by (type + day + title). Runs exactly once (meta flag).
  if (state.meta && !state.meta.proofEventsDerivedV1) {
    try {
      if (!Array.isArray(state.proofEvents)) state.proofEvents = [];
      const seen = new Set(state.proofEvents.map(e => e && (e.type + '|' + e.iso + '|' + (e.title || ''))));
      const derive = (type, rawDate, title, text, mod, ts, metadata) => {
        const k = _isoDayKey(rawDate); if (!k) return;
        const dkey = type + '|' + k + '|' + (title || '');
        if (seen.has(dkey)) return; seen.add(dkey);
        state.proofEvents.push({
          id: 'ped_' + state.proofEvents.length + '_' + k,
          type: type, iso: k, ts: ts || (Date.parse(k + 'T12:00:00') || 0),
          title: title || '', text: text || '', module: mod || '',
          tags: [], metadata: Object.assign({ derived: true }, metadata || {})
        });
      };
      (state.action && state.action.completionHistory || []).forEach(h => {
        if (h) derive('action-complete', h.date, h.actionText || h.planTitle || 'Action completed', '', 'action', Date.parse(h.date) || 0, { tier: h.tier });
      });
      (state.deepwork && state.deepwork.sessions || []).forEach(x => {
        if (x) derive('deepwork-commit', x.iso || x.dateISO || x.date, (x.minutes || 0) + ' min deep work', '', 'deepwork', Date.parse(x.iso || x.dateISO || '') || 0, { minutes: x.minutes });
      });
      (state.reflection && state.reflection.entries || []).forEach(e => {
        if (e) derive('reflection-save', e.iso || e.date, 'Notes', (e.text || '').slice(0, 140), 'reflection', Date.parse(e.iso || e.date) || 0, {});
      });
      (state.distraction && state.distraction.logs || []).forEach(l => {
        if (l) derive('distraction-log', l.date, l.category || 'Distraction', l.note || '', 'distraction', Date.parse(l.date) || 0, { category: l.category });
      });
      (state.clarity && state.clarity.history || []).forEach(c => {
        if (c && c.completedAt) derive('clarity-update', new Date(c.completedAt).toISOString(), c.neutronStar || 'Clarity', '', 'clarity', c.completedAt, {});
      });
      state.proofEvents.sort((a, b) => (a.ts || 0) - (b.ts || 0));
      if (state.proofEvents.length > 1000) state.proofEvents = state.proofEvents.slice(-1000);
      state.meta.proofEventsDerivedV1 = true;
    } catch (e) { if (state.meta) state.meta.proofEventsDerivedV1 = true; }
  }

  // v22: move any inline image dataURLs (Vivere cards + reflection notes) out of
  // localStorage and into IndexedDB. Async + idempotent; flag set only on full
  // success so a partial failure retries next boot. Real data only (not demo).
  if (state.meta) {
    if (state.meta.idbMediaV1 === undefined) state.meta.idbMediaV1 = false;
    if (IDB_OK && !DEMO_MODE && !state.meta.idbMediaV1) {
      try {
        migrateInlineMediaToIdb().then(function (ok) {
          if (ok) { state.meta.idbMediaV1 = true; try { persistNow(); } catch (e) {} }
        });
      } catch (e) {}
    }
  }

  // v22: auto-purge expired Recently Deleted notes, then sweep orphaned IDB
  // images a few seconds after boot (lets migration + render settle first).
  try { purgeReflectionTrash(); } catch (e) {}
  try { if (IDB_OK) setTimeout(function () { try { idbGarbageCollect(); } catch (e) {} }, 5000); } catch (e) {}

  persistNow();
}

// Move inline image dataURLs (Vivere image cards + reflection note <img>) into
// IndexedDB, replacing them with a durable imageId / data-img-id. Per-item
// idempotent (skips anything already migrated). Returns a Promise<bool>.
function migrateInlineMediaToIdb() {
  if (!IDB_OK) return Promise.resolve(false);
  var ops = [];
  try {
    var boards = [];
    if (state.vivere) {
      if (state.vivere.canvas) boards.push(state.vivere.canvas);
      if (Array.isArray(state.vivere.boards)) boards = boards.concat(state.vivere.boards);
    }
    boards.forEach(function (bd) {
      if (!bd || !Array.isArray(bd.cards)) return;
      bd.cards.forEach(function (card) {
        if (card && card.type === 'image' && !card.imageId && card.dataURL && /^data:/.test(card.dataURL)) {
          var du = card.dataURL;
          ops.push(idbStore(du).then(function (id) { if (id) { card.imageId = id; card.dataURL = ''; } }));
        }
      });
    });
  } catch (e) {}
  try {
    var ents = state.reflection && state.reflection.entries;
    if (Array.isArray(ents)) {
      ents.forEach(function (note) {
        if (!note || !note.html || note.html.indexOf('data:image') === -1) return;
        var d; try { d = new DOMParser().parseFromString(note.html, 'text/html'); } catch (e) { return; }
        var imgs = d.querySelectorAll('img[src^="data:"]');
        if (!imgs.length) return;
        var noteOps = [];
        Array.prototype.slice.call(imgs).forEach(function (im) {
          var du = im.getAttribute('src');
          noteOps.push(idbStore(du).then(function (id) { if (id) { im.setAttribute('data-img-id', id); im.removeAttribute('src'); } }));
        });
        ops.push(Promise.all(noteOps).then(function () { note.html = d.body.innerHTML; }));
      });
    }
  } catch (e) {}
  if (!ops.length) return Promise.resolve(true);
  return Promise.all(ops).then(function () { return true; }).catch(function () { return false; });
}

// Defensive: never ship inline image dataURLs to the backend (privacy + payload).
// Post-migration state carries only imageIds, so this is a belt for legacy / no-IDB
// devices. Returns a deep clone with inline media stripped; live state untouched.
function stripInlineMediaForSync(s) {
  var clone;
  try { clone = JSON.parse(JSON.stringify(s)); } catch (e) { return s; }
  try {
    var boards = [];
    if (clone.vivere) {
      if (clone.vivere.canvas) boards.push(clone.vivere.canvas);
      if (Array.isArray(clone.vivere.boards)) boards = boards.concat(clone.vivere.boards);
    }
    boards.forEach(function (bd) {
      if (bd && Array.isArray(bd.cards)) bd.cards.forEach(function (c) {
        if (c && c.dataURL && /^data:/.test(c.dataURL)) c.dataURL = '';
      });
    });
  } catch (e) {}
  try {
    var ents = clone.reflection && clone.reflection.entries;
    if (Array.isArray(ents)) ents.forEach(function (n) {
      if (n && n.html && n.html.indexOf('data:image') !== -1) {
        n.html = n.html.replace(/<img\b[^>]*\bsrc\s*=\s*["']data:image\/[^"']*["'][^>]*>/gi, '');
      }
    });
  } catch (e) {}
  return clone;
}

// Collect every imageId still referenced anywhere (Vivere boards + reflection
// notes + trash). Used by the GC sweep to free orphaned IDB blobs.
function idbCollectReferencedIds() {
  var ids = {};
  try {
    var boards = [];
    if (state.vivere) { if (state.vivere.canvas) boards.push(state.vivere.canvas); if (Array.isArray(state.vivere.boards)) boards = boards.concat(state.vivere.boards); }
    boards.forEach(function (bd) { if (bd && Array.isArray(bd.cards)) bd.cards.forEach(function (c) { if (c && c.imageId) ids[c.imageId] = 1; }); });
  } catch (e) {}
  try {
    var scan = function (note) {
      if (note && note.html && note.html.indexOf('data-img-id') !== -1) {
        try { var d = new DOMParser().parseFromString(note.html, 'text/html'); d.querySelectorAll('img[data-img-id]').forEach(function (im) { var id = im.getAttribute('data-img-id'); if (id) ids[id] = 1; }); } catch (e) {}
      }
    };
    if (state.reflection) { (state.reflection.entries || []).forEach(scan); (state.reflection.trash || []).forEach(scan); }
  } catch (e) {}
  return ids;
}

// Free IndexedDB image blobs that nothing references anymore (note/card/board
// deletions, mid-edit image removals). Cheap, idempotent, safe to call anytime
// after state + migration have settled.
function idbGarbageCollect() {
  if (!IDB_OK) return;
  // Never sweep while the first-boot inline->IDB migration is still in flight:
  // a just-stored blob may not have its owning card/note imageId assigned yet,
  // and would look orphaned. idbMediaV1 flips true only after migration resolves.
  if (state.meta && state.meta.idbMediaV1 === false) return;
  try {
    idbListIds().then(function (allIds) {
      if (!allIds || !allIds.length) return;
      var refs = idbCollectReferencedIds();
      allIds.forEach(function (id) { if (!refs[id]) { try { idbDeleteImage(id); } catch (e) {} } });
    });
  } catch (e) {}
}

// Auto-purge Recently Deleted notes older than the chosen window (7/30/90 days;
// null = never). Frees their IDB images. Runs on boot; idempotent.
function purgeReflectionTrash() {
  try {
    var r = state.reflection; if (!r || !Array.isArray(r.trash) || !r.trash.length) return;
    var win = (state.prefs && state.prefs.trashWindowDays);
    if (win === null || typeof win !== 'number') return; // 'never'
    var cutoff = Date.now() - win * 86400000;
    var kept = [];
    r.trash.forEach(function (n) {
      if (n && n.deletedAt && n.deletedAt < cutoff) {
        try { if (IDB_OK && n.html && n.html.indexOf('data-img-id') !== -1) { var d = new DOMParser().parseFromString(n.html, 'text/html'); d.querySelectorAll('img[data-img-id]').forEach(function (im) { var id = im.getAttribute('data-img-id'); if (id) { try { idbDeleteImage(id); } catch (e) {} } }); } } catch (e) {}
      } else { kept.push(n); }
    });
    if (kept.length !== r.trash.length) r.trash = kept;
  } catch (e) {}
}

// Queue user feedback locally, then try to POST it to the backend. The queue
// drains on boot so nothing is lost offline. Email is the manual fallback.
function submitFeedback(kind, text) {
  try {
    if (!state.support) state.support = { contacts: {}, feedbackQueue: [] };
    if (!Array.isArray(state.support.feedbackQueue)) state.support.feedbackQueue = [];
    // v734: triage context rides along (version, device, screen, ua), so a
    // launch-week bug report is actionable without a back-and-forth.
    let ctx = '';
    try {
      ctx = ' [v:' + (window.MEMENTO_VERSION || '?') + ' d:' + Analytics.deviceId().slice(0, 8) +
        ' s:' + window.innerWidth + 'x' + window.innerHeight +
        ' t:' + (document.documentElement.classList.contains('theme-light') ? 'light' : 'dark') +
        ' ua:' + navigator.userAgent.slice(0, 80) + ']';
    } catch (e) {}
    state.support.feedbackQueue.push({ id: 'fb_' + Date.now() + '_' + Math.floor(Math.random() * 1e4), ts: Date.now(), kind: kind || 'idea', text: (String(text || '') + ctx).slice(0, 4000), status: 'queued' });
    try { persistNow(); } catch (e) {}
    try { if (typeof Backend !== 'undefined' && Backend.sendFeedbackQueue) Backend.sendFeedbackQueue(); } catch (e) {}
  } catch (e) {}
}

/* ============================================
   SVG ICONS
   ============================================ */
const SISYPHUS_IMG = 'data:image/jpeg;base64,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';
const ICONS = {
  clarity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="10" opacity="0.3"/><circle cx="12" cy="12" r="7" opacity="0.5"/><circle cx="12" cy="12" r="4" stroke-width="1.5" opacity="0.85"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
  action: '<svg viewBox="0 0 24 24" fill="currentColor"><g transform="translate(5 21) rotate(40)"><ellipse cx="0" cy="-0.6" rx="0.95" ry="1.6"/><ellipse cx="-0.3" cy="1.7" rx="0.7" ry="0.85"/></g><g transform="translate(7 16) rotate(40)"><ellipse cx="0" cy="-0.6" rx="0.95" ry="1.6"/><ellipse cx="0.3" cy="1.7" rx="0.7" ry="0.85"/></g><g transform="translate(13 14) rotate(40)"><ellipse cx="0" cy="-0.6" rx="0.95" ry="1.6"/><ellipse cx="-0.3" cy="1.7" rx="0.7" ry="0.85"/></g><g transform="translate(15 9) rotate(40)"><ellipse cx="0" cy="-0.6" rx="0.95" ry="1.6"/><ellipse cx="0.3" cy="1.7" rx="0.7" ry="0.85"/></g><g transform="translate(20 7) rotate(40)"><ellipse cx="0" cy="-0.6" rx="0.95" ry="1.6"/><ellipse cx="-0.3" cy="1.7" rx="0.7" ry="0.85"/></g><g transform="translate(22 2) rotate(40)"><ellipse cx="0" cy="-0.6" rx="0.95" ry="1.6"/><ellipse cx="0.3" cy="1.7" rx="0.7" ry="0.85"/></g></svg>',
  streak: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c0 0-8 8.5-8 14a8 8 0 0016 0c0-5.5-8-14-8-14zm0 19a5 5 0 01-5-5c0-3.5 5-9.5 5-9.5s5 6 5 9.5a5 5 0 01-5 5z"/></svg>',
  flow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M2 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/></svg>',
  mori: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="10"/></svg>',
  vivere: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>',
  lifestats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 15l4-8 4 4 4-6 4 4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>',
  deepwork: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  reflection: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  distraction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  checkin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2.5-6 5 12 2.5-6h4"/></svg>'
};

// Memento memorial icon - used on splash, welcome intro, and dashboard glyph.
// Returns SVG markup. Each call uses a unique suffix on gradient IDs to avoid
// collisions when multiple instances live in the DOM at once.
let __memIconSeed = 0;
function mementoMemorialSVG(opts) {
  opts = opts || {};
  const id = opts.id ? ` id="${opts.id}"` : '';
  const cls = opts.className ? ` class="${opts.className}"` : '';
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : '';
  const s = '_' + (++__memIconSeed);
  return `<svg${id}${cls}${size} viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="memLit${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c4f6ff"/><stop offset="45%" stop-color="#a3f1ff"/><stop offset="100%" stop-color="#7d92ff"/>
      </linearGradient>
      <linearGradient id="memShadow${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7ac8d6"/><stop offset="45%" stop-color="#6bb7c4"/><stop offset="100%" stop-color="#3a5aa8"/>
      </linearGradient>
      <linearGradient id="memPedTop${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d4f9ff"/><stop offset="100%" stop-color="#a4f1ff"/>
      </linearGradient>
      <linearGradient id="memPedFront${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8aedff"/><stop offset="100%" stop-color="#5a78e0"/>
      </linearGradient>
      <linearGradient id="memPedSide${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#59a7b5"/><stop offset="100%" stop-color="#3a4ea0"/>
      </linearGradient>
      <linearGradient id="memRingGrad${s}" x1="0" y1="0" x2="1" y2="0.6">
        <stop offset="0%" stop-color="#84edff"/><stop offset="55%" stop-color="#7debff"/><stop offset="100%" stop-color="#5dc7ff"/>
      </linearGradient>
      <filter id="memRingGlow${s}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b2"/>
        <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="memObeliskGlow${s}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path class="memento-icon__energy" d="M 160 78 L 147 112 L 143 232 L 132 232 L 132 246 L 120 246 L 120 258 L 200 258 L 200 246 L 188 246 L 188 232 L 177 232 L 173 112 Z" fill="none" stroke="url(#memRingGrad${s})" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#memRingGlow${s})" opacity="0.7"/>
    <g filter="url(#memObeliskGlow${s})">
      <path d="M160 78 L147 112 L143 232 L160 232 Z" fill="url(#memLit${s})"/>
      <path d="M160 78 L173 112 L177 232 L160 232 Z" fill="url(#memShadow${s})"/>
      <path d="M132 232 L188 232 L185 228 L135 228 Z" fill="url(#memPedTop${s})"/>
      <path d="M132 232 L188 232 L188 246 L132 246 Z" fill="url(#memPedFront${s})"/>
      <path d="M188 232 L185 228 L185 242 L188 246 Z" fill="url(#memPedSide${s})"/>
      <path d="M120 246 L200 246 L197 242 L123 242 Z" fill="url(#memPedTop${s})"/>
      <path d="M120 246 L200 246 L200 258 L120 258 Z" fill="url(#memPedFront${s})"/>
      <path d="M200 246 L197 242 L197 254 L200 258 Z" fill="url(#memPedSide${s})"/>
    </g>
  </svg>`;
}

// Colored variant of the memorial icon - pillar pages use this tinted to their hue.
function coloredMemorialSVG(hexColor, opts) {
  opts = opts || {};
  const size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : '';
  const vb = opts.viewBox || '0 0 320 320';
  const s = '_p' + (++__memIconSeed);
  return `<svg${size} viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="memLit${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${hexColor}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${hexColor}" stop-opacity="0.7"/>
      </linearGradient>
      <linearGradient id="memShadow${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${hexColor}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${hexColor}" stop-opacity="0.32"/>
      </linearGradient>
      <linearGradient id="memPedTop${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${hexColor}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${hexColor}" stop-opacity="0.8"/>
      </linearGradient>
      <linearGradient id="memPedFront${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${hexColor}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${hexColor}" stop-opacity="0.55"/>
      </linearGradient>
      <linearGradient id="memPedSide${s}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${hexColor}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${hexColor}" stop-opacity="0.28"/>
      </linearGradient>
      <filter id="memRingGlow${s}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b1"/>
        <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="b2"/>
        <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="memObeliskGlow${s}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M 160 78 L 147 112 L 143 232 L 132 232 L 132 246 L 120 246 L 120 258 L 200 258 L 200 246 L 188 246 L 188 232 L 177 232 L 173 112 Z" fill="none" stroke="${hexColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#memRingGlow${s})" opacity="0.7"/>
    <g filter="url(#memObeliskGlow${s})">
      <path d="M160 78 L147 112 L143 232 L160 232 Z" fill="url(#memLit${s})"/>
      <path d="M160 78 L173 112 L177 232 L160 232 Z" fill="url(#memShadow${s})"/>
      <path d="M132 232 L188 232 L185 228 L135 228 Z" fill="url(#memPedTop${s})"/>
      <path d="M132 232 L188 232 L188 246 L132 246 Z" fill="url(#memPedFront${s})"/>
      <path d="M188 232 L185 228 L185 242 L188 246 Z" fill="url(#memPedSide${s})"/>
      <path d="M120 246 L200 246 L197 242 L123 242 Z" fill="url(#memPedTop${s})"/>
      <path d="M120 246 L200 246 L200 258 L120 258 Z" fill="url(#memPedFront${s})"/>
      <path d="M200 246 L197 242 L197 254 L200 258 Z" fill="url(#memPedSide${s})"/>
    </g>
  </svg>`;
}

const ACTION_ICON_SOURCE = 'data:image/png;base64,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';
let _actionIconImagePromise = null;
let _actionIconBitmap = null;

function loadActionIconImage() {
  if (_actionIconBitmap) return Promise.resolve(_actionIconBitmap);
  if (_actionIconImagePromise) return _actionIconImagePromise;
  _actionIconImagePromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      _actionIconBitmap = img;
      resolve(img);
    };
    img.onerror = reject;
    img.src = ACTION_ICON_SOURCE;
  });
  return _actionIconImagePromise;
}

function processActionIconSource(img) {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = img.naturalWidth || img.width;
  srcCanvas.height = img.naturalHeight || img.height;
  const sctx = srcCanvas.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);
  const image = sctx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const d = image.data;

  const threshold = 132;

  let minX = srcCanvas.width, minY = srcCanvas.height, maxX = 0, maxY = 0;
  const out = new Uint8ClampedArray(d.length);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const strength = Math.min(1, Math.max(0, (lum - threshold) / (255 - threshold)));
    const alpha = Math.round(Math.min(255, a * Math.pow(strength, 0.55) * 1.9));

    out[i] = 255;
    out[i + 1] = Math.round(20 + 48 * strength);
    out[i + 2] = Math.round(16 + 22 * strength);
    out[i + 3] = alpha;

    if (alpha > 12) {
      const p = i / 4;
      const x = p % srcCanvas.width;
      const y = Math.floor(p / srcCanvas.width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (minX > maxX || minY > maxY) {
    minX = 0; minY = 0; maxX = srcCanvas.width - 1; maxY = srcCanvas.height - 1;
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = srcCanvas.width;
  outCanvas.height = srcCanvas.height;
  const octx = outCanvas.getContext('2d');
  octx.putImageData(new ImageData(out, srcCanvas.width, srcCanvas.height), 0, 0);
  return {
    canvas: outCanvas,
    bounds: {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX + 1),
      height: Math.max(1, maxY - minY + 1)
    }
  };
}

let _processedActionIcon = null;
async function ensureProcessedActionIcon() {
  if (_processedActionIcon) return _processedActionIcon;
  const img = await loadActionIconImage();
  _processedActionIcon = processActionIconSource(img);
  return _processedActionIcon;
}

async function renderActionIconCanvases(root = document) {
  const canvases = [...root.querySelectorAll('canvas.action-sisyphus-icon')].filter(c => !c.dataset.rendered);
  if (!canvases.length) return;
  try {
    const processed = await ensureProcessedActionIcon();
    canvases.forEach((canvas) => {
      const ctx = canvas.getContext('2d');
      const { x, y, width, height } = processed.bounds;
      const pad = 0.06;
      const targetW = canvas.width * (1 - pad * 2);
      const targetH = canvas.height * (1 - pad * 2);
      const scale = Math.min(targetW / width, targetH / height);
      const drawW = width * scale;
      const drawH = height * scale;
      const dx = (canvas.width - drawW) / 2;
      const dy = (canvas.height - drawH) / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(processed.canvas, x, y, width, height, dx, dy, drawW, drawH);
      canvas.dataset.rendered = '1';
    });
  } catch (e) {}
}

/* ============================================
   WIDGET DEFINITIONS
   ============================================ */
const WIDGET_DEFS = {
  clarity:   { label: 'Clarity', color: 'clarity', defaultSize: 'full', icon: ICONS.clarity },
  action:    { label: 'Action', color: 'action', defaultSize: 'full', icon: ICONS.action },
  streak:    { label: 'Consistency', color: 'consistency', defaultSize: 'half', icon: ICONS.streak },
  flow:      { label: 'Flow', color: 'flow', defaultSize: 'half', icon: ICONS.flow },
  mori:      { label: 'Memento Mori', color: 'mori', defaultSize: 'full', icon: ICONS.mori },
  vivere:    { label: 'Memento Vivere', color: 'vivere', defaultSize: 'half', icon: ICONS.vivere },
  lifestats: { label: 'Energy', color: 'lifestats', defaultSize: 'half', icon: ICONS.lifestats },
  checkin:   { label: 'Check-in', color: 'lifestats', defaultSize: 'half', icon: ICONS.checkin },
  photo:     { label: '', color: 'action', defaultSize: 'half', icon: '' },
  deepwork:  { label: 'Deep Work', color: 'deepwork', defaultSize: 'half', icon: ICONS.deepwork },
  reflection:{ label: 'Notes', color: 'reflection', defaultSize: 'half', icon: ICONS.reflection },
  distraction:{ label: 'Friction', color: 'distraction', defaultSize: 'half', icon: ICONS.distraction },
  claritySphere: { label: 'Clarity', color: 'clarity', defaultSize: 'half', icon: ICONS.clarity, synthetic: true },
  quickActions:  { label: 'Quick Actions', color: 'clarity', defaultSize: 'full', icon: ICONS.clarity, synthetic: true },
  resources:     { label: 'Resources', color: 'clarity', defaultSize: 'full', icon: ICONS.clarity, synthetic: true },
  projects:      { label: 'Projects', color: 'action', defaultSize: 'full', icon: ICONS.action, synthetic: true },
  inbox:         { label: 'Updates', color: 'action', defaultSize: 'half', icon: ICONS.action, synthetic: true },
  layout:        { label: 'Customize dashboard', color: 'action', defaultSize: 'full', icon: ICONS.action, synthetic: true },
  search:        { label: 'Search', color: 'action', defaultSize: 'full', icon: ICONS.action, synthetic: true },
  bookend:       { label: 'Daily ritual', color: 'action', defaultSize: 'full', icon: ICONS.action, synthetic: true },
  timeblocks:    { label: 'Plan your day', color: 'action', defaultSize: 'full', icon: ICONS.action, synthetic: true },
  yearbook:      { label: 'The Year I Lived', color: 'vivere', defaultSize: 'full', icon: ICONS.vivere, synthetic: true },
  people:        { label: 'People I care about', color: 'vivere', defaultSize: 'full', icon: ICONS.vivere, synthetic: true },
  weeklyreview:  { label: 'Weekly review', color: 'vivere', defaultSize: 'full', icon: ICONS.vivere, synthetic: true }
};

/* ============================================
   SHEET CONTROLLER
   ============================================ */
// Refresh-survival, demo-proof: the current "place" (open module sheet, tab,
// action/clarity experience) is remembered in its OWN localStorage key,
// written directly. state persistence is gated off in demo mode, but where
// you ARE is not user data; it should survive a refresh even there.
function rememberView(v) {
  try { if (state.ui) state.ui.lastView = v; } catch (e) {}
  try { localStorage.setItem('memento_view', v || ''); } catch (e) {}
  try { persistNow(); } catch (e) {}
}
function recallView() {
  try { const v = localStorage.getItem('memento_view'); if (v) return v; } catch (e) {}
  try { return state.ui && state.ui.lastView; } catch (e) { return null; }
}

const Sheet = {
  el: null, backdrop: null, body: null, titleEl: null,
  isOpen: false, startY: 0, currentY: 0, isDragging: false,
  currentWidget: null,

  init() {
    this.el = document.getElementById('sheet');
    this.backdrop = document.getElementById('sheetBackdrop');
    this.body = document.getElementById('sheetBody');
    this.titleEl = document.getElementById('sheetTitle');
    const handle = document.getElementById('sheetHandle');
    const close = document.getElementById('sheetClose');

    close.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());

    handle.addEventListener('pointerdown', (e) => this.onDragStart(e));
    document.addEventListener('pointermove', (e) => this.onDragMove(e));
    document.addEventListener('pointerup', () => this.onDragEnd());
  },

  // Shared timer teardown so a running Deep Work / Mori timer is committed and
  // cleared no matter how the sheet is swapped or dismissed (close, drag, OR
  // opening a different sheet over it). Without this, navigating between sheets
  // while a timer ran leaked the interval and could lose or mis-log a session.
  _teardownTimers() {
    try {
      if (SHEET_TEMPLATES.mori && SHEET_TEMPLATES.mori.secondsInterval) {
        clearInterval(SHEET_TEMPLATES.mori.secondsInterval);
        SHEET_TEMPLATES.mori.secondsInterval = null;
      }
      if (SHEET_TEMPLATES.mori && SHEET_TEMPLATES.mori.dayBurnInterval) {
        clearInterval(SHEET_TEMPLATES.mori.dayBurnInterval);
        SHEET_TEMPLATES.mori.dayBurnInterval = null;
      }
      if (SHEET_TEMPLATES.deepwork && (SHEET_TEMPLATES.deepwork._running || SHEET_TEMPLATES.deepwork._intervalId)) {
        const logged = SHEET_TEMPLATES.deepwork._commit();
        if (logged) { persistNow(); renderAll(); }
      }
      const dwo = document.getElementById('dwFocusOverlay');
      if (dwo && dwo.parentNode) dwo.parentNode.removeChild(dwo);
    } catch (e) {}
  },

  open(widgetKey) {
    // Paywall gate: Clarity is the free first win; the rest is paid. If this
    // module is locked, rise the paywall moment instead of opening it.
    try {
      if (typeof ClarityPaywall !== 'undefined' && ClarityPaywall.isLockedByPaywall(widgetKey)) {
        ClarityPaywall.show();
        return;
      }
    } catch (e) {}
    // Tear down any running timer from a previously-open sheet first.
    this._teardownTimers();
    this.currentWidget = widgetKey;
    const def = WIDGET_DEFS[widgetKey];
    const tmpl = SHEET_TEMPLATES[widgetKey];
    if (!def || !tmpl) return;

    // v23 More space: count opens per module (3+ opens earns "Pin to dashboard").
    try {
      if (state.ui) {
        if (!state.ui.moduleOpens || typeof state.ui.moduleOpens !== 'object') state.ui.moduleOpens = {};
        state.ui.moduleOpens[widgetKey] = (state.ui.moduleOpens[widgetKey] || 0) + 1;
        persistState();
      }
    } catch (e) {}

    const colorMap = { clarity: 'var(--color-clarity)', action: 'var(--color-action)', consistency: 'var(--color-consistency)', flow: 'var(--color-flow)', mori: 'var(--color-mori)', vivere: 'var(--color-vivere)', lifestats: 'var(--color-lifestats)', checkin: 'var(--color-lifestats)', deepwork: 'var(--color-deepwork)', reflection: 'var(--color-reflection)', distraction: 'var(--color-distraction)' };
    // 'projects'/'inbox' borrow the Action identity, but --color-action is pure
    // white (invisible on the light-mode off-white). Use the theme-aware high-
    // contrast text token so the title reads in dark, light, and mono.
    this.titleEl.style.color = (widgetKey === 'projects' || widgetKey === 'inbox' || widgetKey === 'layout' || widgetKey === 'search' || widgetKey === 'bookend' || widgetKey === 'timeblocks') ? 'var(--text-hi)' : (colorMap[def.color] || '');
    // Reset the projects add-form flags on each open so a composer left expanded
    // when the sheet was dismissed does not reappear stale on the next open.
    if (widgetKey === 'projects' && SHEET_TEMPLATES.projects) { SHEET_TEMPLATES.projects._addingProject = false; SHEET_TEMPLATES.projects._addingMsFor = null; }

    // Full-screen "experience" modules (Streak, Memento Mori, Deep Work) fade in
    // over an ambient color-blurred background instead of sliding up as a drawer.
    const EXP_MODULES = { streak: true, mori: true, deepwork: true, vivere: true, yearbook: true, reflection: true, lifestats: true, distraction: true, flow: true, inbox: true, projects: true, timeblocks: true, search: true, people: true, checkin: true };
    if (EXP_MODULES[widgetKey]) {
      this.el.classList.add('sheet--exp');
      this.el.setAttribute('data-module', widgetKey);
    } else {
      this.el.classList.remove('sheet--exp');
      this.el.removeAttribute('data-module');
    }

    // Check if intro needs to be shown
    try { this.body.classList.remove('viv-body-fs'); } catch (e) {}
    if (state.introsSeen && !state.introsSeen[widgetKey] && MODULE_INTROS[widgetKey]) {
      this.titleEl.textContent = '';
      this.body.innerHTML = this.renderIntro(widgetKey);
      this.bindIntro(widgetKey);
    } else {
      this.titleEl.textContent = def.label;
      // Clear the Vivere full-bleed body class so it never leaks to another module.
      try { this.body.classList.remove('viv-body-fs'); } catch (e) {}
      // One-shot: enable the staggered .exp-reveal cascade for this fresh open
      // only, so internal re-renders (day toggles, view swaps) do not re-animate.
      this._expReveal = true;
      // Guard render/bind so one module throwing can never strand the whole UI
      // half-open (no open class, isOpen false, body overflow left locked).
      try {
        this.body.innerHTML = tmpl.render();
        this._expReveal = false;
        tmpl.bind(this.body);
        if (typeof tmpl.afterOpen === 'function') { try { tmpl.afterOpen(this.body); } catch (_) {} }
      } catch (e) {
        this._expReveal = false;
        this.body.innerHTML = '<div style="padding:48px 24px;text-align:center;color:var(--text-mid)">Could not open this module. Try again, or reset from Settings.</div>';
        try { console.error('Sheet.open render failed for ' + widgetKey, e); } catch (_) {}
      }
    }

    this.el.classList.add('open');
    this.backdrop.classList.add('active');
    this.el.setAttribute('aria-hidden', 'false');
    // Refresh-survival: remember the open module so a reload lands back here.
    // 'search' is a transient overlay, not a place.
    try { if (widgetKey !== 'search') rememberView('sheet:' + widgetKey); } catch (e) {}
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
  },

  renderIntro(key) {
    const intro = MODULE_INTROS[key];
    // Minimal: just the module icon, briefly, then auto-enter (see bindIntro).
    // No label, quote, or button: a clean flash, not an onboarding screen.
    return `<div class="module-intro module-intro--flash">
      <div class="module-intro__icon" style="color:${intro.color}">${intro.icon}</div>
    </div>`;
  },

  bindIntro(key) {
    const self = this;
    let done = false;
    const advance = () => {
      if (done) return; done = true;
      try { state.introsSeen[key] = true; persistNow(); } catch (e) {}
      const def = WIDGET_DEFS[key];
      const tmpl = SHEET_TEMPLATES[key];
      self.titleEl.textContent = def.label;
      // Play the staggered reveal for the first real view after the intro, and
      // guard so a render error cannot strand the sheet on a blank intro.
      self._expReveal = true;
      try {
        self.body.innerHTML = tmpl.render();
        self._expReveal = false;
        tmpl.bind(self.body);
        if (typeof tmpl.afterOpen === 'function') { try { tmpl.afterOpen(self.body); } catch (_) {} }
      } catch (e) {
        self._expReveal = false;
        self.body.innerHTML = '<div style="padding:48px 24px;text-align:center;color:var(--text-mid)">Could not open this module.</div>';
        try { console.error('Sheet intro render failed for ' + key, e); } catch (_) {}
      }
    };
    // Brief icon flash, then auto-enter. A tap skips ahead instantly.
    const t = setTimeout(advance, 820);
    try { if (self.body) self.body.addEventListener('click', () => { clearTimeout(t); advance(); }, { once: true }); } catch (e) {}
  },

  close() {
    const _wasWidget = this.currentWidget;
    // Commit/clear any running Deep Work or Mori timer (shared with open()).
    this._teardownTimers();
    // Never leak the Notes full-screen or focus-mode body state across closes.
    try { document.body.classList.remove('notes-fs', 'notes-zen'); if (SHEET_TEMPLATES.reflection) { SHEET_TEMPLATES.reflection._fs = false; SHEET_TEMPLATES.reflection._zen = false; } } catch (e) {}
    this.el.classList.remove('open');
    this.backdrop.classList.remove('active');
    this.el.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
    this.currentWidget = null;
    document.body.style.overflow = '';
    // The open crossfade fades #app to opacity 0 and only restores it on a fixed
    // 1100ms timer; closing the sheet sooner would otherwise leave the dashboard
    // black until that timer fires. Restore it immediately on close.
    try { const _app = document.getElementById('app'); if (_app) _app.classList.remove('app--fading-out'); } catch (e) {}
    // Refresh-survival: leaving the module hands lastView back to the active
    // tab (Settings etc.) or clears it on Home. Action/clarity manage their own.
    try {
      const lv = recallView();
      if (typeof lv === 'string' && lv.indexOf('sheet:') === 0) {
        const tab = (typeof TabBar !== 'undefined' && TabBar.activeTab) || 'home';
        rememberView((tab && tab !== 'home') ? ('tab:' + tab) : null);
      }
    } catch (e) {}
    // Guard the deferred wipe: if another sheet opened within 500ms (e.g. search
    // or a bookend navigating straight into a module), do not blank its content.
    setTimeout(() => { if (!this.isOpen) this.body.innerHTML = ''; }, 500);
    // v19: editing Projects can change the Goal-tab summary + today's focus, so
    // refresh the live command center when leaving the projects surface.
    if (_wasWidget === 'projects') {
      try { const ccEl = document.getElementById('commandCenter'); if (ccEl) { ccEl.innerHTML = renderCommandCenter(); bindCommandCenter(ccEl); } } catch (e) {}
    }
    // v19: triaging from the Inbox can write into many modules (reflection,
    // friction, memory, projects, proof), so refresh the whole dashboard.
    if (_wasWidget === 'inbox') {
      try { renderAll(); } catch (e) {}
      try { updateCaptureFab(); } catch (e) {}
    }
    // v19: Customize Dashboard changes the grid structure; rebuild it on close.
    if (_wasWidget === 'layout') {
      try { renderGrid(); } catch (e) {}
      try { renderAll(); } catch (e) {}
    }
  },

  onDragStart(e) {
    if (!this.isOpen) return;
    // No swipe-to-dismiss in full-screen experience mode; it is a fade, not a
    // drawer. Escape or the close button dismisses it.
    if (this.el.classList.contains('sheet--exp')) return;
    this.isDragging = true;
    this.startY = e.clientY;
    this.currentY = 0;
    this._dragT0 = (typeof e.timeStamp === 'number') ? e.timeStamp : 0;
    this._dragTLast = this._dragT0;
    this.el.classList.add('dragging');
    e.preventDefault();
  },

  onDragMove(e) {
    if (!this.isDragging) return;
    this.currentY = Math.max(0, e.clientY - this.startY);
    this._dragTLast = (typeof e.timeStamp === 'number') ? e.timeStamp : this._dragTLast;
    this.el.style.transform = `translateY(${this.currentY}px)`;
    this.backdrop.style.opacity = Math.max(0, 1 - this.currentY / 400);
  },

  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.el.classList.remove('dragging');
    this.el.style.transform = '';
    this.backdrop.style.opacity = '';
    // iOS feel: dismiss on a far drag OR a quick downward flick (so a short,
    // fast swipe closes too, not only a long slow drag past the threshold).
    const dt = (this._dragTLast || 0) - (this._dragT0 || 0);
    const vel = dt > 0 ? this.currentY / dt : 0; // downward px per ms
    if (this.currentY > 120 || (this.currentY > 32 && vel > 0.5)) { this.close(); }
    else { this.el.classList.add('open'); }
  }
};

/* ============================================
   DRAG & DROP CONTROLLER
   ============================================ */
const DragDrop = {
  longPressTimer: null,
  isDragging: false,
  ghost: null,
  sourceKey: null,
  sourceEl: null,
  startX: 0, startY: 0,
  offsetX: 0, offsetY: 0,
  cardPositions: [],

  init() {
    const grid = document.getElementById('widgetGrid');
    grid.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    // Keyboard activation: the tiles are role="button" tabindex="0", so Enter or
    // Space must open the module just like a tap does (WCAG 2.1.1). v27 makes the
    // bento tiles the primary Home, so this is now the main keyboard entry point.
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      // Only the tile ITSELF (the role=button article) activates on Enter/Space.
      // If focus is on an inner control (a CTA, the reveal Open/Later buttons),
      // let that button handle its own key, do not hijack it or open the module.
      const w = e.target;
      if (!w || !w.classList || !w.classList.contains('widget') || !grid.contains(w)) return;
      e.preventDefault();
      this.activateWidget(w);
    });
    document.addEventListener('pointermove', (e) => this.onPointerMove(e));
    document.addEventListener('pointerup', (e) => this.onPointerUp(e));
    document.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    // The context menu (right-click mid-drag) and window blur both swallow the
    // pointerup, which used to strand the ghost clone and the dragging classes
    // as overlapping duplicate cards. Abort the gesture cleanly instead.
    document.addEventListener('contextmenu', () => this.cancelDrag());
    window.addEventListener('blur', () => this.cancelDrag());
    // Re-slot (or clear) the mobile bento tiles when the viewport crosses the
    // mobile/desktop breakpoint or the device rotates, so inline slot styles are
    // applied on mobile and stripped on larger layouts.
    let _rsT = null;
    window.addEventListener('resize', () => {
      clearTimeout(_rsT);
      _rsT = setTimeout(() => { try { if (typeof applyBentoMobileOrder === 'function') applyBentoMobileOrder(); } catch (e) {} }, 150);
    });
  },

  // Abort any pending or active drag WITHOUT dropping: full cleanup of ghosts,
  // classes, and scroll locks. Safe to call when nothing is in flight.
  cancelDrag() {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
    const hadDrag = this.isDragging || this.ghost;
    this.isDragging = false;
    this.sourceEl = null;
    if (!hadDrag) return;
    document.querySelectorAll('.widget').forEach(w => w.classList.remove('dragging-source', 'drag-over'));
    document.querySelectorAll('.drag-ghost').forEach(g => { try { g.remove(); } catch (_) {} });
    this.ghost = null;
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  },

  onPointerDown(e) {
    // Primary button only: a right or middle press must never arm a drag.
    if (typeof e.button === 'number' && e.button > 0) return;
    const widget = e.target.closest('.widget');
    if (!widget || Sheet.isOpen) return;

    // Don't start drag on interactive elements
    if (e.target.closest('button, input, textarea, .widget__check, .widget__corner-drag')) return;

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTime = Date.now();
    this.sourceEl = widget;
    this.sourceKey = widget.dataset.widget;

    // Arm the long-press drag when reordering can actually take effect:
    //  - custom-layout mode (the flow grid reorders by saved DOM order), or
    //  - the mobile bento, where applyBentoMobileOrder() slots tiles by their
    //    widgetOrder index so a drag reorders which module sits in which slot.
    // The desktop bento pins tiles by data-area, so a drag there would snap back;
    // we deliberately do NOT arm it. Tap-to-open (onPointerUp) works either way.
    const canReorder = (state.ui && state.ui.layoutCustomized) ||
      (typeof isMobileBento === 'function' && isMobileBento());
    if (canReorder) {
      this.longPressTimer = setTimeout(() => {
        this.startDrag(e);
      }, 400);
    }
  },

  startDrag(e) {
    // Defensive: any stray ghost from an interrupted gesture dies first.
    document.querySelectorAll('.drag-ghost').forEach(g => { try { g.remove(); } catch (_) {} });
    this.isDragging = true;
    // Prevent page scrolling while dragging a widget
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    const rect = this.sourceEl.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;

    // Snapshot positions
    this.cardPositions = [];
    document.querySelectorAll('.widget').forEach(w => {
      const r = w.getBoundingClientRect();
      this.cardPositions.push({ key: w.dataset.widget, rect: r, el: w });
    });

    // Create ghost
    this.ghost = this.sourceEl.cloneNode(true);
    this.ghost.classList.add('drag-ghost');
    this.ghost.style.width = rect.width + 'px';
    this.ghost.style.height = rect.height + 'px';
    this.ghost.style.left = rect.left + 'px';
    this.ghost.style.top = rect.top + 'px';
    this.ghost.style.borderRadius = 'var(--card-r)';
    document.body.appendChild(this.ghost);

    this.sourceEl.classList.add('dragging-source');

    // Haptic feedback (routed through the shared feel() helper).
    try { feel('select'); } catch (_) {}
  },

  onPointerMove(e) {
    // Cancel long-press if finger moves too much (user is scrolling, not trying to drag)
    if (!this.isDragging && this.longPressTimer) {
      const dx = Math.abs(e.clientX - this.startX);
      const dy = Math.abs(e.clientY - this.startY);
      if (dx > 10 || dy > 10) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        return;
      }
    }
    if (this.longPressTimer) {
      const dx = Math.abs(e.clientX - this.startX);
      const dy = Math.abs(e.clientY - this.startY);
      if (dx > 8 || dy > 8) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    if (!this.isDragging) return;
    e.preventDefault();

    const x = e.clientX - this.offsetX;
    const y = e.clientY - this.offsetY;
    this.ghost.style.left = x + 'px';
    this.ghost.style.top = y + 'px';

    // Find drop target
    const ghostCenter = { x: e.clientX, y: e.clientY };
    let closest = null;
    let closestDist = Infinity;

    this.cardPositions.forEach(cp => {
      if (cp.key === this.sourceKey) return;
      const cx = cp.rect.left + cp.rect.width / 2;
      const cy = cp.rect.top + cp.rect.height / 2;
      const dist = Math.hypot(ghostCenter.x - cx, ghostCenter.y - cy);
      if (dist < closestDist) { closestDist = dist; closest = cp; }
    });

    // Clear all drag-over
    document.querySelectorAll('.widget').forEach(w => w.classList.remove('drag-over'));
    if (closest && closestDist < 200) {
      closest.el.classList.add('drag-over');
    }
  },

  // Open the module a tile represents (shared by tap and keyboard activation).
  // Honors the same gates as a tap: nothing while a sheet/experience is open, a
  // gate card routes into Clarity, a locked card flashes + pulses Clarity.
  activateWidget(el) {
    if (!el || Sheet.isOpen || ClarityExperience.isOpen || ActionExperience.isOpen) return;
    // v23 gate card (Action before Clarity is done): the card itself is the
    // teacher ("Define your goal first"), so it routes straight into Clarity.
    if (el.classList.contains('widget--gate')) {
      try { if (typeof ClarityExperience !== 'undefined') ClarityExperience.open(); } catch (e) {}
      return;
    }
    // Locked modules: flash red + pulse Clarity, do not open.
    if (el.classList.contains('widget--locked')) {
      el.classList.remove('locked-flash');
      void el.offsetWidth;
      el.classList.add('locked-flash');
      el.addEventListener('animationend', () => el.classList.remove('locked-flash'), { once: true });
      const clarityWidget = document.querySelector('.widget--clarity');
      if (clarityWidget) {
        clarityWidget.classList.remove('clarity-pulse');
        void clarityWidget.offsetWidth;
        clarityWidget.classList.add('clarity-pulse');
        clarityWidget.addEventListener('animationend', () => clarityWidget.classList.remove('clarity-pulse'), { once: true });
      }
      return;
    }
    const key = el.dataset.widget;
    if (!key) return;
    // The photo tile is not a module: tapping it opens the image picker (v690).
    if (key === 'photo') {
      try { const inp = el.querySelector('#photoTileInput'); if (inp) inp.click(); } catch (e) {}
      return;
    }
    // Consistent crossfade for every module open: fade the dashboard out while
    // the destination experience/sheet fades in simultaneously.
    const app = document.getElementById('app');
    if (app) app.classList.add('app--fading-out');
    if (key === 'clarity' && !state.clarity.completed) {
      ClarityExperience.open();
    } else if (key === 'clarity' && state.clarity.completed) {
      ClarityExperience.openSummary();
    } else if (key === 'action') {
      ActionExperience.open();
    } else {
      Sheet.open(key);
    }
    setTimeout(() => { if (app) app.classList.remove('app--fading-out'); }, 1100);
  },

  onPointerUp(e) {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;

    if (!this.isDragging) {
      // Treat as a tap if the finger barely moved and it was released before
      // the long-press drag kicks in (400ms). The window must reach up to the
      // long-press threshold or taps held 300-400ms fall into a dead zone and
      // do nothing. Movement tolerance is generous for imprecise touch.
      const dx = e ? Math.abs(e.clientX - this.startX) : 0;
      const dy = e ? Math.abs(e.clientY - this.startY) : 0;
      const elapsed = Date.now() - (this.startTime || 0);
      const wasTap = dx < 16 && dy < 16 && elapsed < 400;

      if (wasTap && this.sourceEl) {
        const el = this.sourceEl;
        this.sourceEl = null;
        this.activateWidget(el);
        return;
      }
      this.sourceEl = null;
      return;
    }

    // Find drop target
    const dragOver = document.querySelector('.widget.drag-over');
    if (dragOver) {
      const targetKey = dragOver.dataset.widget;
      // Mobile bento reorders a personal slot order (state.ui.bentoOrder) so the
      // desktop bento + custom layouts (which key off state.widgetOrder) are
      // untouched. Everywhere else, reorder state.widgetOrder as before.
      if (typeof isMobileBento === 'function' && isMobileBento()) {
        if (typeof bentoMobileReorder === 'function' && bentoMobileReorder(this.sourceKey, targetKey)) {
          reorderWithFLIP();
        }
      } else {
        const order = state.widgetOrder;
        const fromIdx = order.findIndex(w => w.key === this.sourceKey);
        const toIdx = order.findIndex(w => w.key === targetKey);
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const item = order.splice(fromIdx, 1)[0];
          order.splice(toIdx, 0, item);
          persistNow();
          reorderWithFLIP();
        }
      }
    }

    // Cleanup
    document.querySelectorAll('.widget').forEach(w => {
      w.classList.remove('dragging-source', 'drag-over');
    });
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    this.isDragging = false;
    this.sourceEl = null;
    // Re-enable page scrolling
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
};
