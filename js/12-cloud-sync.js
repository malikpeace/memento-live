/* ============================================
   12 CLOUD SYNC (Supabase). Optional accounts + cross-device sync.
   Loaded LAST, after 11-init. Everything cloud lives in this one file.
   The app must work 100% unchanged when logged out, offline, or if the
   supabase CDN script fails to load: localStorage stays the source of
   truth and the cloud is only ever a mirror of it. Every entry point is
   guarded; every network failure is silent (queued, retried on the next
   change or tab focus). Auth is magic-link email only, no passwords.
   The anon key below is public by design; Row Level Security on the
   user_state table (tools/supabase-setup.sql) is what protects rows.
   ============================================ */
// Google sign-in toggle. Flip to true after the Google OAuth client is
// configured in Supabase (Authentication > Providers > Google). Until then
// the "Continue with Google" button does not render at all.
const MEMENTO_GOOGLE_AUTH = true;
try { window.MEMENTO_GOOGLE_AUTH = MEMENTO_GOOGLE_AUTH; } catch (e) {}

const CloudSync = (function () {
  'use strict';
  const SUPABASE_URL = 'https://lipuxymlsowdrbummqxw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcHV4eW1sc293ZHJidW1tcXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjI1MDIsImV4cCI6MjA5NjY5ODUwMn0.mbTRo2CFz9q9dtQTzgI3655f6KIY09fUyCqI1F0RkyU';
  // Exposed for the AI proxy path in js/03 (callClaude). The anon key is
  // public by design; the SECRET Anthropic key lives only in the ai-proxy
  // Edge Function's environment, never in this codebase.
  try { window.MEMENTO_SUPABASE_URL = SUPABASE_URL; window.MEMENTO_SUPABASE_ANON = SUPABASE_ANON_KEY; } catch (e) {}
  const BACKUP_KEY = 'memento_pre_sync_backup';
  const PUSH_DEBOUNCE_MS = 4000;
  // Number of digit boxes in the sign-in code input. MUST match the Supabase
  // "Email OTP Length" setting (Authentication > Sign In/Providers > Email).
  const CODE_LEN = 6;

  let client = null;        // supabase client, or null when the CDN never loaded
  let session = null;       // current auth session (null = logged out)
  let pushTimer = null;
  let pushing = false;
  let pushQueued = false;   // a push failed or arrived mid-flight; retry on next change/focus
  let sessionRetryNeeded = false; // boot-time getSession failed (offline); retry on focus
  let adopting = false;     // a cloud copy is being adopted (reload imminent); freeze all sync
  const FIRST_SYNC_WAITING = 'waiting';
  const FIRST_SYNC_RESTORING = 'restoring';
  const FIRST_SYNC_READY = 'ready';
  const FIRST_SYNC_FAILED = 'failed';
  let firstSyncState = FIRST_SYNC_WAITING;
  let firstSyncPromise = null;
  let lastCloudRevision = 0;
  let lastCloudStamp = '';  // updated_at of the cloud row this device last wrote or adopted
  let lastSyncMs = 0;       // Date.now() of the last successful push or pull (for the UI)
  let _communityDays = null; // cached "days shown up across Memento" (null = unknown/RPC absent)

  // Reload-loop circuit breaker. Every adopt path ends in location.reload(),
  // so a non-idempotent merge could blink the UI forever. We count adopt-reloads
  // in sessionStorage (survives reload, dies with the tab): allow a couple of
  // legitimate adopts, then refuse to reload again and fall back to pushing the
  // local copy up. A clean load with no adopt clears the counter.
  const ADOPT_GUARD_KEY = 'memento_sync_adopt_guard';
  const RESTORE_MARKER_KEY = 'memento_sync_restoring';
  let restoreEl = null;

  function showRestoreScreen() {
    try {
      if (!restoreEl) {
        restoreEl = document.createElement('div');
        restoreEl.id = 'cloudRestoreScreen';
        restoreEl.setAttribute('role', 'status');
        restoreEl.setAttribute('aria-live', 'polite');
        restoreEl.setAttribute('data-cloud-keep', '');
        restoreEl.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:#050608;color:#f5f5f7;font-family:inherit;opacity:0;transition:opacity .2s ease;';
        restoreEl.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;padding:28px"><svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0a0a0e"/><path d="M14 14L32 32 50 14v37H14z" fill="#f5f5f7"/></svg><div style="font-size:17px;font-weight:650">Restoring your Memento...</div><div style="width:120px;height:2px;overflow:hidden;background:rgba(255,255,255,.12)"><span style="display:block;width:45%;height:100%;background:#5bdaf3;animation:mementoRestoreSlide 1.1s ease-in-out infinite alternate"></span></div></div>';
        if (!document.getElementById('cloudRestoreStyle')) {
          const style = document.createElement('style');
          style.id = 'cloudRestoreStyle';
          style.textContent = '@keyframes mementoRestoreSlide{from{transform:translateX(-15%)}to{transform:translateX(135%)}}@media(prefers-reduced-motion:reduce){#cloudRestoreScreen span{animation:none!important;transform:none!important;width:100%!important}}';
          document.body.appendChild(style);
        }
        document.body.appendChild(restoreEl);
      }
      restoreEl.style.display = 'flex';
      const raf = (window && window.requestAnimationFrame) ? window.requestAnimationFrame.bind(window) : function (fn) { setTimeout(fn, 0); };
      raf(function () { if (restoreEl) restoreEl.style.opacity = '1'; });
    } catch (e) {}
  }

  function hideRestoreScreen() {
    try {
      if (!restoreEl) return;
      restoreEl.style.opacity = '0';
      setTimeout(function () { if (restoreEl && restoreEl.style.opacity === '0') restoreEl.style.display = 'none'; }, 220);
    } catch (e) {}
  }

  function markRestoreReload() { try { sessionStorage.setItem(RESTORE_MARKER_KEY, '1'); } catch (e) {} }
  function clearRestoreReload() { try { sessionStorage.removeItem(RESTORE_MARKER_KEY); } catch (e) {} }
  function restoreReloadPending() { try { return sessionStorage.getItem(RESTORE_MARKER_KEY) === '1'; } catch (e) { return false; } }
  function adoptWouldLoop() {
    try {
      const now = Date.now();
      let r = null;
      try { r = JSON.parse(sessionStorage.getItem(ADOPT_GUARD_KEY) || 'null'); } catch (e) { r = null; }
      if (!r || typeof r.first !== 'number' || (now - r.first) > 12000) r = { first: now, n: 0 };
      r.n += 1;
      try { sessionStorage.setItem(ADOPT_GUARD_KEY, JSON.stringify(r)); } catch (e) {}
      return r.n > 2; // 3rd adopt-reload inside 12s = a loop; stop reloading
    } catch (e) { return false; }
  }
  function clearAdoptGuard() { try { sessionStorage.removeItem(ADOPT_GUARD_KEY); } catch (e) {} }

  // Order-insensitive JSON: recursively sort object keys before stringifying.
  // The merge rebuilds objects in a different key order than the stored copy
  // (e.g. it moves meta to the end), so a raw JSON.stringify compare reports
  // "different" even when the content is identical, which would make the
  // loop-breaker miss and adoptMerged reload on every boot. Stable stringify
  // compares by content only.
  function stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
    const keys = Object.keys(v).sort();
    return '{' + keys.map(function (k) {
      const sv = stableStringify(v[k]);
      return sv === undefined ? '' : JSON.stringify(k) + ':' + sv;
    }).filter(Boolean).join(',') + '}';
  }

  function demo() { try { return typeof DEMO_MODE !== 'undefined' && !!DEMO_MODE; } catch (e) { return false; } }
  function available() { return !!client; }
  function isLoggedIn() { return !!(session && session.user); }
  function email() { return (session && session.user && session.user.email) || ''; }
  function accessToken() { return (session && session.access_token) || ''; }

  // Short human label stored next to each push so "which device wrote this"
  // is answerable from the table. Never anything identifying beyond OS+browser.
  function deviceLabel() {
    try {
      const ua = navigator.userAgent || '';
      const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Win/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Device';
      const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
      return os + ' ' + br;
    } catch (e) { return 'Device'; }
  }

  /* ---------- merge logic (pure, testable) ---------- */

  // Latest meaningful edit in a state snapshot, as epoch ms. lastVisit is
  // deliberately excluded: opening a fresh device must never make its blank
  // state look newer than real work already stored in the cloud.
  function activityStamp(s) {
    let max = 0;
    const seen = (v) => {
      try {
        if (v == null) return;
        if (typeof v === 'number' && isFinite(v)) { if (v > max) max = v; return; }
        if (typeof v === 'string') { const t = Date.parse(v); if (isFinite(t) && t > max) max = t; }
      } catch (e) {}
    };
    try {
      const evs = (s && Array.isArray(s.proofEvents)) ? s.proofEvents : [];
      for (let i = 0; i < evs.length; i++) { const ev = evs[i]; if (ev) { seen(ev.ts); seen(ev.iso); } }
      if (s && s.meta) seen(s.meta.lastEditAt);
    } catch (e) {}
    return max;
  }

  // "Real" = the user has created durable content. Merely opening onboarding
  // or visiting today is not real work and may never beat a cloud copy.
  function isRealState(s) {
    try {
      if (!s || typeof s !== 'object') return false;
      if (Array.isArray(s.proofEvents) && s.proofEvents.length) return true;
      if (s.profile && (s.profile.onboarded || String(s.profile.name || '').trim())) return true;
      if (s.clarity && (s.clarity.completed || String((((s.clarity || {}).answers || {}).neutronStar) || '').trim())) return true;
      if (s.action && (s.action.planGenerated || String((((s.action || {}).primaryAction || {}).title) || '').trim())) return true;
      if (s.reflection && Array.isArray(s.reflection.entries) && s.reflection.entries.length) return true;
      if (Array.isArray(s.checkins) && s.checkins.length) return true;
      if (s.deepwork && Array.isArray(s.deepwork.sessions) && s.deepwork.sessions.length) return true;
      if (s.vivere && (Array.isArray(s.vivere.memories) && s.vivere.memories.length)) return true;
      return false;
    } catch (e) { return false; }
  }

  // Pure decision: given the local state and the cloud row (or null), which
  // side wins? Returns { action: 'pushLocal' | 'adoptCloud' | 'adoptMerged' }.
  // When BOTH sides carry per-module edit stamps (meta.moduleEditAt, written
  // by js/01 on every save), the decision is per module instead of whole-state:
  // two devices that edited different modules offline both keep their edits.
  // Legacy copies without stamps fall back to whole-state newest-wins.
  function mergeDecision(localState, cloudRow) {
    const cloud = cloudRow && cloudRow.state;
    if (!cloud) return { action: 'pushLocal', reason: 'no cloud copy yet' };
    const localReal = isRealState(localState);
    const cloudReal = isRealState(cloud);
    if (!cloudReal) return { action: 'pushLocal', reason: 'cloud copy is empty' };
    if (!localReal) return { action: 'adoptCloud', reason: 'this device is fresh' };
    const lm = localState.meta && localState.meta.moduleEditAt;
    const cm = cloud.meta && cloud.meta.moduleEditAt;
    if (lm && cm) {
      try {
        const merged = buildMergedState(localState, cloud);
        // If the merge changes nothing locally, this device already holds
        // everything; just push. (Also the loop-breaker: after a merge
        // reload, the re-run lands here instead of merging forever.)
        // Compare with inline media STRIPPED on both sides: the cloud copy is
        // always media-stripped (stripInlineMediaForSync), while local carries
        // full media, so a raw JSON compare would never match and adoptMerged
        // would reload on every boot forever. Media-only differences mean the
        // states are already in sync content-wise; keep local's full media and
        // just push.
        const sm = (typeof stripInlineMediaForSync === 'function') ? stripInlineMediaForSync : function (x) { return x; };
        if (stableStringify(sm(merged)) === stableStringify(sm(localState))) {
          return { action: 'pushLocal', reason: 'local already contains everything' };
        }
        return { action: 'adoptMerged', merged: merged, reason: 'combined per module' };
      } catch (e) { /* fall through to whole-state compare */ }
    }
    const l = activityStamp(localState);
    const c = activityStamp(cloud);
    if (c > l) return { action: 'adoptCloud', reason: 'cloud copy has newer activity' };
    return { action: 'pushLocal', reason: 'local copy has newer activity' };
  }

  /* ---------- per-module merge ---------- */

  // Union two arrays by a key, keeping the base side's order and appending
  // the other side's unseen items (sorted by key for determinism). cap trims
  // oldest when both sides together exceed it.
  function unionByKey(baseArr, otherArr, keyFn, cap) {
    const base = Array.isArray(baseArr) ? baseArr.slice() : [];
    const other = Array.isArray(otherArr) ? otherArr : [];
    const seen = new Set(base.map(keyFn).filter(Boolean));
    const extra = other.filter((x) => { const k = keyFn(x); return k && !seen.has(k); });
    extra.sort((a, b) => String(keyFn(a)).localeCompare(String(keyFn(b))));
    let out = base.concat(extra);
    if (cap && out.length > cap) out = out.slice(-cap);
    return out;
  }

  // Notes: union by id with per-note newest-edit wins, so neither device's
  // writing is ever dropped. Folders/settings come from the newer side.
  function mergeReflection(l, c, lNewer) {
    if (!l) return c;
    if (!c) return l;
    const base = lNewer ? l : c;
    const out = JSON.parse(JSON.stringify(base));
    const key = (e) => (e && (e.id || ((e.iso || '') + '|' + String(e.text || '').slice(0, 60)))) || null;
    const stamp = (e) => (e && (e.updated || 0)) || 0;
    const mergePool = (a, b) => {
      const map = new Map();
      (Array.isArray(a) ? a : []).forEach((e) => { const k = key(e); if (k) map.set(k, e); });
      (Array.isArray(b) ? b : []).forEach((e) => {
        const k = key(e);
        if (!k) return;
        const have = map.get(k);
        if (!have || stamp(e) > stamp(have)) map.set(k, e);
      });
      return map;
    };
    const entries = mergePool(base.entries, (lNewer ? c : l).entries);
    const trash = mergePool(base.trash, (lNewer ? c : l).trash);
    // A note deleted on one device (in trash) must not resurrect from the
    // other side's entries unless it was edited again after the deletion.
    trash.forEach((t, k) => {
      const live = entries.get(k);
      if (live && stamp(live) <= stamp(t)) entries.delete(k);
      else if (live) trash.delete(k);
    });
    out.entries = Array.from(entries.values());
    out.trash = Array.from(trash.values());
    return out;
  }

  function mergeStreak(l, c, lNewer) {
    if (!l) return c;
    if (!c) return l;
    const out = JSON.parse(JSON.stringify(lNewer ? l : c));
    out.history = Array.from(new Set([].concat(l.history || [], c.history || []))).sort();
    const gl = l.grace || {}, gc = c.grace || {};
    out.grace = out.grace || { bank: 0, lastEarnMilestone: 0, used: {} };
    out.grace.used = Object.assign({}, gl.used || {}, gc.used || {});
    out.grace.bank = Math.max(gl.bank || 0, gc.bank || 0);
    out.grace.lastEarnMilestone = Math.max(gl.lastEarnMilestone || 0, gc.lastEarnMilestone || 0);
    out.bestEver = Math.max(l.bestEver || 0, c.bestEver || 0);
    out.minutesReclaimed = Math.max(l.minutesReclaimed || 0, c.minutesReclaimed || 0);
    return out;
  }

  function buildMergedState(local, cloud) {
    const lm = (local.meta && local.meta.moduleEditAt) || {};
    const cm = (cloud.meta && cloud.meta.moduleEditAt) || {};
    const lGlobal = (local.meta && local.meta.lastEditAt) || activityStamp(local) || 0;
    const cGlobal = (cloud.meta && cloud.meta.lastEditAt) || activityStamp(cloud) || 0;
    const merged = {};
    const keys = new Set(Object.keys(local).concat(Object.keys(cloud)));
    keys.forEach((k) => {
      if (k === 'meta') return;
      const inL = Object.prototype.hasOwnProperty.call(local, k);
      const inC = Object.prototype.hasOwnProperty.call(cloud, k);
      if (!inL) { merged[k] = cloud[k]; return; }
      if (!inC) { merged[k] = local[k]; return; }
      const lt = lm[k] || lGlobal;
      const ct = cm[k] || cGlobal;
      merged[k] = (ct > lt) ? cloud[k] : local[k]; // ties prefer local
    });
    // meta: the newer side wholesale, then per-key stamp maxima so the next
    // device to merge sees the combined history.
    const newerMeta = (cGlobal > lGlobal ? cloud.meta : local.meta) || {};
    merged.meta = JSON.parse(JSON.stringify(newerMeta));
    merged.meta.moduleEditAt = {};
    new Set(Object.keys(lm).concat(Object.keys(cm))).forEach((k) => {
      merged.meta.moduleEditAt[k] = Math.max(lm[k] || 0, cm[k] || 0);
    });
    merged.meta.lastEditAt = Math.max(lGlobal, cGlobal);
    // Append-only data unions, so newest-module-wins can never drop the other
    // device's notes, proof, check-ins, or streak history.
    try { merged.reflection = mergeReflection(local.reflection, cloud.reflection, (lm.reflection || lGlobal) >= (cm.reflection || cGlobal)); } catch (e) {}
    try {
      const lNewer = (lm.proofEvents || lGlobal) >= (cm.proofEvents || cGlobal);
      merged.proofEvents = unionByKey(lNewer ? local.proofEvents : cloud.proofEvents, lNewer ? cloud.proofEvents : local.proofEvents, (ev) => ev && (ev.id || (String(ev.ts) + '|' + (ev.type || ''))), 1000);
    } catch (e) {}
    try {
      const lNewer = (lm.checkins || lGlobal) >= (cm.checkins || cGlobal);
      merged.checkins = unionByKey(lNewer ? local.checkins : cloud.checkins, lNewer ? cloud.checkins : local.checkins, (x) => x && x.iso, 800);
    } catch (e) {}
    try { merged.streak = mergeStreak(local.streak, cloud.streak, (lm.streak || lGlobal) >= (cm.streak || cGlobal)); } catch (e) {}
    return merged;
  }

  // Adopt a per-module merged state: back up the local copy, write the merge,
  // reload. The post-reload boot pull sees "local already contains everything"
  // and pushes the merged copy up, completing the cycle.
  function adoptMerged(merged, why) {
    if (adopting) return true;
    if (adoptWouldLoop()) {
      try { console.warn('CloudSync: merge reload loop detected. Sync is paused so neither copy can be overwritten.'); } catch (e) {}
      return false;
    }
    try {
      adopting = true;
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), reason: why || 'merged with cloud', state: state }));
      } catch (e) {}
      console.info('CloudSync: merged with the cloud copy per module (' + (why || '') + '). The previous local copy was backed up to localStorage "' + BACKUP_KEY + '".');
      localStorage.setItem(APP_KEY, JSON.stringify(merged));
      markRestoreReload();
      showRestoreScreen();
      location.reload();
      return true;
    } catch (e) { adopting = false; return false; }
  }

  /* ---------- sync engine ---------- */

  // Debounced full-state push. Hooked from persistNow/persistState in js/01
  // via one guarded line, so every local save mirrors to the cloud ~4s later.
  function schedulePush() {
    if (!client || !isLoggedIn() || demo() || adopting) return;
    if (firstSyncState !== FIRST_SYNC_READY) { pushQueued = true; return; }
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushNow(); }, PUSH_DEBOUNCE_MS);
  }

  async function pushNow(retryOnConflict) {
    if (!client || !isLoggedIn() || demo() || adopting) return false;
    if (firstSyncState !== FIRST_SYNC_READY) { pushQueued = true; return false; }
    if (pushing) { pushQueued = true; return false; }
    pushing = true;
    clearTimeout(pushTimer);
    try {
      const snap = (typeof stripInlineMediaForSync === 'function') ? stripInlineMediaForSync(state) : state;
      const r = await client.rpc('sync_user_state', {
        p_state: snap,
        p_device: deviceLabel(),
        p_expected_revision: lastCloudRevision || 0
      });
      pushing = false;
      const result = r && !r.error ? (Array.isArray(r.data) ? r.data[0] : r.data) : null;
      if (result && result.accepted) {
        pushQueued = false;
        lastCloudRevision = Number(result.revision) || lastCloudRevision || 0;
        lastCloudStamp = result.updated_at || new Date().toISOString();
        lastSyncMs = Date.now();
        refreshAccountCard();
        return true;
      }
      if (result && result.conflict && result.state) {
        const remoteRow = {
          state: result.state,
          updated_at: result.updated_at || '',
          revision: Number(result.revision) || 0
        };
        lastCloudRevision = remoteRow.revision;
        if (remoteRow.updated_at) lastCloudStamp = remoteRow.updated_at;
        const d = mergeDecision(state, remoteRow);
        if (d.action === 'adoptCloud') return !!adoptCloud(remoteRow, result.reason || d.reason);
        if (d.action === 'adoptMerged') return !!adoptMerged(d.merged, result.reason || d.reason);
        pushQueued = true;
        // One revision-aware retry is safe when local already contains every
        // remote module. A second conflict waits for focus/manual sync.
        if (retryOnConflict !== false) return pushNow(false);
      }
      pushQueued = true;
      return false;
    } catch (e) { pushing = false; pushQueued = true; return false; }
  }

  // Adopt the cloud copy: back the losing local copy up first, then write the
  // cloud state to localStorage and reload (the simplest correct path; every
  // module re-reads state on boot). Never logs state contents.
  function adoptCloud(row, why) {
    if (adopting) return true;
    if (adoptWouldLoop()) {
      try { console.warn('CloudSync: adopt reload loop detected. Sync is paused so neither copy can be overwritten.'); } catch (e) {}
      return false;
    }
    try {
      adopting = true;
      try {
        localStorage.setItem(BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), reason: why || 'cloud adopted', state: state }));
      } catch (e) {}
      console.info('CloudSync: adopting the cloud copy (' + (why || 'newer') + '). The previous local copy was backed up to localStorage "' + BACKUP_KEY + '".');
      localStorage.setItem(APP_KEY, JSON.stringify(row.state));
      markRestoreReload();
      showRestoreScreen();
      location.reload();
      return true;
    } catch (e) { adopting = false; return false; }
  }

  async function fetchRow(columns) {
    try {
      const r = await client.from('user_state').select(columns || 'state, updated_at, device, revision').eq('user_id', session.user.id).maybeSingle();
      if (!r || r.error) return { ok: false, row: null };
      return { ok: true, row: r.data || null };
    } catch (e) { return { ok: false, row: null }; }
  }

  // Login/boot pull: fetch the row and decide. It never pushes by itself;
  // beginFirstSync marks the pull complete before allowing any write.
  async function pullAndMerge() {
    if (!client || !isLoggedIn() || demo() || adopting) return { ok: false };
    try {
      const f = await fetchRow();
      if (!f.ok) return { ok: false };
      const d = mergeDecision(state, f.row);
      if (d.action === 'adoptCloud') {
        const didAdopt = adoptCloud(f.row, d.reason);
        return { ok: didAdopt, adopting: didAdopt };
      }
      if (d.action === 'adoptMerged') {
        const didAdopt = adoptMerged(d.merged, d.reason);
        return { ok: didAdopt, adopting: didAdopt };
      }
      lastCloudRevision = (f.row && Number(f.row.revision)) || 0;
      if (f.row && f.row.updated_at) lastCloudStamp = f.row.updated_at;
      return { ok: true, shouldPush: true };
    } catch (e) { return { ok: false }; }
  }

  async function beginFirstSync() {
    if (!client || !isLoggedIn() || demo() || adopting) return false;
    if (firstSyncState === FIRST_SYNC_READY) return true;
    if (firstSyncState === FIRST_SYNC_RESTORING && firstSyncPromise) return firstSyncPromise;
    firstSyncState = FIRST_SYNC_RESTORING;
    showRestoreScreen();
    firstSyncPromise = (async function () {
      const result = await pullAndMerge();
      if (result && result.adopting) return !!result.ok;
      if (!result || !result.ok) {
        firstSyncState = FIRST_SYNC_FAILED;
        pushQueued = true;
        hideRestoreScreen();
        refreshAccountCard();
        return false;
      }
      firstSyncState = FIRST_SYNC_READY;
      clearAdoptGuard();
      clearRestoreReload();
      hideRestoreScreen();
      const shouldPush = !!result.shouldPush || pushQueued;
      if (shouldPush) await pushNow();
      refreshAccountCard();
      return true;
    })();
    try { return await firstSyncPromise; }
    finally { if (firstSyncState !== FIRST_SYNC_RESTORING) firstSyncPromise = null; }
  }

  // Focus pull: cheap updated_at probe; if another device wrote a newer row,
  // adopt it (with the same backup guard). 1.5s slack absorbs clock jitter.
  async function checkRemote() {
    if (!client || !isLoggedIn() || demo() || adopting || firstSyncState !== FIRST_SYNC_READY || !lastCloudStamp) return;
    try {
      const p = await fetchRow('updated_at, revision');
      if (!p.ok || !p.row || !p.row.updated_at) return;
      if ((Number(p.row.revision) || 0) > lastCloudRevision || Date.parse(p.row.updated_at) > Date.parse(lastCloudStamp) + 1500) {
        const f = await fetchRow();
        if (f.ok && f.row && isRealState(f.row.state)) {
          lastCloudRevision = Number(f.row.revision) || 0;
          const d = mergeDecision(state, f.row);
          if (d.action === 'adoptMerged') adoptMerged(d.merged, 'another device synced more recently');
          else if (d.action === 'adoptCloud') adoptCloud(f.row, 'another device synced more recently');
          else { lastCloudStamp = p.row.updated_at; pushNow(); }
        }
      }
    } catch (e) {}
  }

  // Public share links: send one rendered card through the authenticated,
  // rate-limited share boundary under an unguessable id. Explicit pull-only
  // export; nothing is public unless the person presses the share button.
  async function createShare(rec) {
    try {
      if (!client || !session || !session.access_token) return { ok: false, reason: 'unavailable' };
      if (!isLoggedIn()) return { ok: false, reason: 'auth' };
      const r = await fetch(SUPABASE_URL + '/functions/v1/share-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + session.access_token,
          'x-memento-device': deletionDeviceId(),
        },
        body: JSON.stringify({
          id: rec.id,
          kind: rec.kind,
          payload: rec.payload || {},
        }),
      });
      if (r.status === 401) return { ok: false, reason: 'auth' };
      if (!r.ok) return { ok: false, reason: 'error' };
      return { ok: true };
    } catch (e) { return { ok: false, reason: 'error' }; }
  }

  function onFocus() {
    if (!client || demo() || adopting) return;
    if (!isLoggedIn()) {
      // If the boot-time session restore failed (offline boot), this focus is
      // the retry: a stored session may exist that we simply could not read.
      if (sessionRetryNeeded) {
        sessionRetryNeeded = false;
        client.auth.getSession().then((r) => {
          session = (r && r.data && r.data.session) || null;
          if (session) {
            hideSplashLink();
            beginFirstSync();
            refreshAccountCard();
          }
        }).catch(() => { sessionRetryNeeded = true; });
      }
      return;
    }
    if (firstSyncState !== FIRST_SYNC_READY) { beginFirstSync(); return; }
    if (pushQueued) { pushNow(); return; }
    checkRemote();
  }

  // Manual "Sync now" from Settings: see if another device is ahead first
  // (may adopt + reload), otherwise push this device up.
  async function syncNow() {
    if (!client || !isLoggedIn() || demo()) return false;
    if (!(await beginFirstSync())) return false;
    await checkRemote();
    if (adopting) return true;
    return pushNow();
  }

  /* ---------- auth ---------- */

  // Email a 6-digit code (NOT a magic link). No emailRedirectTo, so Supabase
  // sends the {{ .Token }} code from the email template and we verify it in-app
  // with verifyCode below. This is the right flow for a phone/PWA: the user
  // never leaves the app, so it works in the installed Home Screen app too.
  // (Requires the Supabase "Magic Link" email template to include {{ .Token }}.)
  async function sendCode(addr) {
    if (!client) return { ok: false, error: 'Sync is offline right now. Your data is safe on this device.' };
    try {
      const r = await client.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: true } });
      if (r && r.error) return { ok: false, error: r.error.message || 'Could not send the code. Try again.' };
      return { ok: true };
    } catch (e) { return { ok: false, error: 'Could not send the code. Try again.' }; }
  }

  // Verify the 6-digit code the user typed in. On success Supabase establishes
  // the session and onAuthStateChange fires (which closes the screen + syncs).
  async function verifyCode(addr, code) {
    if (!client) return { ok: false, error: 'Sync is offline right now.' };
    const token = String(code || '').replace(/\D/g, '');
    if (token.length < CODE_LEN) return { ok: false, error: 'Enter the ' + CODE_LEN + '-digit code from your email.' };
    try {
      const r = await client.auth.verifyOtp({ email: addr, token: token, type: 'email' });
      if (r && r.error) return { ok: false, error: r.error.message || 'That code did not work. Double-check it.' };
      return { ok: true };
    } catch (e) { return { ok: false, error: 'That code did not work. Try again.' }; }
  }

  // Sign out of the cloud only. Local data stays exactly as it is.
  async function signOut() {
    if (!client) return;
    // Flush any debounced changes to the cloud BEFORE the session dies, so
    // "edit, sign out, close tab" never strands the last edit locally.
    const hadPending = !!pushTimer;
    clearTimeout(pushTimer);
    pushQueued = false;
    if (hadPending) { try { await pushNow(); } catch (e) {} }
    try {
      if (window.MementoPush && MementoPush.disableForSignOut) {
        await settleWithin(MementoPush.disableForSignOut(), 3500);
      }
    } catch (e) {}
    try { await client.auth.signOut(); } catch (e) {}
    session = null;
    firstSyncState = FIRST_SYNC_WAITING;
    firstSyncPromise = null;
    lastCloudStamp = '';
    lastCloudRevision = 0;
    clearRestoreReload();
    hideRestoreScreen();
    refreshAccountCard();
  }

  /* ---------- account deletion ---------- */

  let deleteEl = null;
  let deleteWorking = false;
  let deleteOperationId = '';

  function newDeletionOperationId() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    const bytes = new Uint8Array(16);
    try { crypto.getRandomValues(bytes); } catch (e) {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [].map.call(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function deletionDeviceId() {
    try {
      if (typeof Analytics !== 'undefined' && Analytics.deviceId) return Analytics.deviceId();
    } catch (e) {}
    try { return localStorage.getItem('memento_device_id') || ''; } catch (e) { return ''; }
  }

  function setDeletionStatus(text, isError) {
    if (!deleteEl) return;
    ['#accountDeleteStatus', '#accountDeleteIntroStatus'].forEach((selector) => {
      const el = deleteEl.querySelector(selector);
      if (!el) return;
      el.textContent = text || '';
      el.style.color = isError ? '#ff8d8d' : 'var(--text-2)';
    });
  }

  function buildDeletionDialog() {
    if (deleteEl) return deleteEl;
    deleteEl = document.createElement('div');
    deleteEl.id = 'accountDeleteDialog';
    deleteEl.setAttribute('role', 'dialog');
    deleteEl.setAttribute('aria-modal', 'true');
    deleteEl.setAttribute('aria-hidden', 'true');
    deleteEl.setAttribute('aria-labelledby', 'accountDeleteTitle');
    deleteEl.setAttribute('data-cloud-keep', '');
    deleteEl.style.cssText = 'position:fixed;inset:0;z-index:2147483100;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.78);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);';
    deleteEl.innerHTML =
      '<div style="width:min(100%,430px);box-sizing:border-box;padding:28px 24px;border:1px solid rgba(255,255,255,.1);background:#0c0d10;color:#f5f5f7;border-radius:8px;box-shadow:0 24px 80px rgba(0,0,0,.55);">' +
        '<div id="accountDeleteIntro">' +
          '<h2 id="accountDeleteTitle" style="margin:0 0 10px;font-size:1.45rem;letter-spacing:0;">Delete your account</h2>' +
          '<p style="margin:0 0 18px;color:#a7a7af;line-height:1.55;font-size:.92rem;">This permanently deletes your cloud account, synced Memento data, reminders, and the Memento data on this device.</p>' +
          '<button type="button" id="accountDeleteBackup" class="sheet-btn" style="width:100%;margin-bottom:10px;background:#f5f5f7;color:#090a0c;border:0;">Download a backup first</button>' +
          '<button type="button" id="accountDeleteSend" class="sheet-btn" style="width:100%;margin-bottom:10px;background:rgba(255,76,76,.12);color:#ff9a9a;border:1px solid rgba(255,76,76,.3);">Continue to deletion</button>' +
          '<button type="button" data-delete-close class="sheet-btn" style="width:100%;background:transparent;color:#a7a7af;border:0;">Cancel</button>' +
          '<div id="accountDeleteIntroStatus" role="status" aria-live="polite" style="min-height:20px;margin-top:8px;color:#a7a7af;font-size:.78rem;text-align:center;"></div>' +
        '</div>' +
        '<div id="accountDeleteCodeStep" hidden>' +
          '<h2 style="margin:0 0 10px;font-size:1.45rem;letter-spacing:0;">Check your email</h2>' +
          '<p style="margin:0 0 18px;color:#a7a7af;line-height:1.55;font-size:.92rem;">Enter the fresh six-digit code sent to <b id="accountDeleteEmail" style="color:#f5f5f7;"></b>. This proves it is really you.</p>' +
          '<input id="accountDeleteCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="Six-digit deletion code" placeholder="000000" style="width:100%;box-sizing:border-box;margin-bottom:12px;padding:14px 16px;border:1px solid rgba(255,255,255,.12);border-radius:6px;background:rgba(255,255,255,.06);color:#f5f5f7;font:inherit;font-size:1.2rem;text-align:center;letter-spacing:.35em;outline:none;">' +
          '<button type="button" id="accountDeleteConfirm" class="sheet-btn" style="width:100%;margin-bottom:10px;background:#d92d35;color:white;border:0;">Delete account permanently</button>' +
          '<button type="button" id="accountDeleteResend" class="sheet-btn" style="width:100%;margin-bottom:4px;background:transparent;color:#a7a7af;border:0;">Send a new code</button>' +
          '<button type="button" data-delete-close class="sheet-btn" style="width:100%;background:transparent;color:#a7a7af;border:0;">Cancel</button>' +
          '<div id="accountDeleteStatus" role="status" aria-live="polite" style="min-height:20px;margin-top:8px;color:#a7a7af;font-size:.78rem;text-align:center;"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(deleteEl);

    deleteEl.querySelectorAll('[data-delete-close]').forEach((button) => {
      button.addEventListener('click', closeDeletionDialog);
    });
    const backup = deleteEl.querySelector('#accountDeleteBackup');
    if (backup) backup.addEventListener('click', async () => {
      let ok = false;
      setDeletionStatus('Preparing your backup...', false);
      try { if (typeof exportMementoData === 'function') ok = await exportMementoData(); } catch (e) {}
      if (ok) setDeletionStatus('Backup downloaded. Keep it somewhere safe.', false);
      if (!ok) setDeletionStatus('The backup could not be downloaded. Your account has not been changed.', true);
    });
    const send = deleteEl.querySelector('#accountDeleteSend');
    if (send) send.addEventListener('click', () => sendDeletionCode(false));
    const resend = deleteEl.querySelector('#accountDeleteResend');
    if (resend) resend.addEventListener('click', () => sendDeletionCode(true));
    const confirm = deleteEl.querySelector('#accountDeleteConfirm');
    if (confirm) confirm.addEventListener('click', confirmAccountDeletion);
    const code = deleteEl.querySelector('#accountDeleteCode');
    if (code) {
      code.addEventListener('input', () => { code.value = String(code.value || '').replace(/\D/g, '').slice(0, CODE_LEN); });
      code.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); confirmAccountDeletion(); }
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && deleteEl.style.display === 'flex' && !deleteWorking) {
        event.preventDefault();
        event.stopPropagation();
        closeDeletionDialog();
      }
    }, true);
    return deleteEl;
  }

  function openDeletionDialog() {
    if (!isLoggedIn() || deleteWorking) return;
    const dialog = buildDeletionDialog();
    const intro = dialog.querySelector('#accountDeleteIntro');
    const codeStep = dialog.querySelector('#accountDeleteCodeStep');
    const code = dialog.querySelector('#accountDeleteCode');
    if (intro) intro.hidden = false;
    if (codeStep) codeStep.hidden = true;
    if (code) code.value = '';
    deleteOperationId = '';
    setDeletionStatus('', false);
    dialog.style.display = 'flex';
    dialog.setAttribute('aria-hidden', 'false');
    try { const first = dialog.querySelector('#accountDeleteBackup'); if (first) first.focus(); } catch (e) {}
  }

  function closeDeletionDialog() {
    if (!deleteEl || deleteWorking) return;
    deleteEl.style.display = 'none';
    deleteEl.setAttribute('aria-hidden', 'true');
    deleteOperationId = '';
  }

  async function sendDeletionCode(isResend) {
    if (!client || !isLoggedIn() || deleteWorking) return;
    const address = email();
    const send = deleteEl && deleteEl.querySelector(isResend ? '#accountDeleteResend' : '#accountDeleteSend');
    if (send) { send.disabled = true; send.textContent = 'Sending...'; }
    try {
      const result = await client.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false },
      });
      if (result && result.error) throw result.error;
      deleteOperationId = newDeletionOperationId();
      const intro = deleteEl.querySelector('#accountDeleteIntro');
      const codeStep = deleteEl.querySelector('#accountDeleteCodeStep');
      const addressEl = deleteEl.querySelector('#accountDeleteEmail');
      if (addressEl) addressEl.textContent = address;
      if (intro) intro.hidden = true;
      if (codeStep) codeStep.hidden = false;
      setDeletionStatus(isResend ? 'A new code was sent.' : '', false);
      try { const code = deleteEl.querySelector('#accountDeleteCode'); if (code) { code.value = ''; code.focus(); } } catch (e) {}
    } catch (e) {
      setDeletionStatus('The code could not be sent. Nothing was deleted. Try again.', true);
      try { if (window.MementoErrors) MementoErrors.reportBackend({ endpoint: 'auth', status: 0, phase: 'reauth' }); } catch (_) {}
    } finally {
      if (send) {
        send.disabled = false;
        send.textContent = isResend ? 'Send a new code' : 'Continue to deletion';
      }
    }
  }

  async function invokeAccountDeletion(accessToken) {
    const response = await fetch(SUPABASE_URL + '/functions/v1/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + accessToken,
        'x-memento-device': deletionDeviceId(),
      },
      body: JSON.stringify({ operation_id: deleteOperationId }),
      signal: AbortSignal.timeout(20000),
    });
    let result = null;
    try { result = await response.json(); } catch (e) {}
    return { ok: response.ok && result && result.deleted === true, status: response.status };
  }

  function settleWithin(promise, timeoutMs) {
    return Promise.race([
      Promise.resolve(promise).catch(() => null),
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  }

  async function eraseCurrentDeviceAfterDeletion() {
    try { if (typeof IS_RESETTING !== 'undefined') IS_RESETTING = true; } catch (e) {}
    try {
      if ('serviceWorker' in navigator) {
        await settleWithin(
          navigator.serviceWorker.ready.then((registration) => (
            registration.pushManager
              ? registration.pushManager.getSubscription()
              : null
          )).then((subscription) => subscription ? subscription.unsubscribe() : null),
          2500,
        );
      }
    } catch (e) {}
    try { if (client) await settleWithin(client.auth.signOut({ scope: 'local' }), 2000); } catch (e) {}
    try {
      if (typeof _idbUrlCache !== 'undefined' && _idbUrlCache && _idbUrlCache.forEach) {
        _idbUrlCache.forEach((value) => { try { URL.revokeObjectURL(value); } catch (e) {} });
        _idbUrlCache.clear();
      }
      if (typeof _idbDB !== 'undefined' && _idbDB) { try { _idbDB.close(); } catch (e) {} _idbDB = null; }
      if (window.indexedDB) {
        await settleWithin(new Promise((resolve) => {
          try {
            const request = indexedDB.deleteDatabase('memento_media');
            request.onsuccess = request.onerror = request.onblocked = () => resolve(null);
          } catch (e) { resolve(null); }
        }), 2500);
      }
    } catch (e) {}
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
      keys.forEach((key) => {
        if (key && (key.indexOf('memento_') === 0 || key.indexOf('sb-lipuxymlsowdrbummqxw-') === 0)) {
          try { localStorage.removeItem(key); } catch (e) {}
        }
      });
    } catch (e) {}
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i));
      keys.forEach((key) => {
        if (key && (key.indexOf('memento_') === 0 || key.indexOf('sb-lipuxymlsowdrbummqxw-') === 0)) {
          try { sessionStorage.removeItem(key); } catch (e) {}
        }
      });
    } catch (e) {}
    session = null;
    try { location.replace(location.origin + location.pathname); } catch (e) { location.reload(); }
  }

  async function confirmAccountDeletion() {
    if (!client || !isLoggedIn() || deleteWorking) return;
    const codeInput = deleteEl && deleteEl.querySelector('#accountDeleteCode');
    const code = String(codeInput && codeInput.value || '').replace(/\D/g, '');
    if (code.length !== CODE_LEN) {
      setDeletionStatus('Enter the six-digit code from your email.', true);
      return;
    }
    if (!deleteOperationId) deleteOperationId = newDeletionOperationId();

    const button = deleteEl.querySelector('#accountDeleteConfirm');
    const originalUserId = session && session.user && session.user.id;
    deleteWorking = true;
    if (button) { button.disabled = true; button.textContent = 'Deleting...'; }
    setDeletionStatus('Verifying your identity...', false);
    try {
      const verified = await client.auth.verifyOtp({
        email: email(),
        token: code,
        type: 'email',
      });
      if (verified && verified.error) throw new Error('verification_failed');
      const freshSession = verified && verified.data && verified.data.session;
      const freshUserId = freshSession && freshSession.user && freshSession.user.id;
      if (!freshSession || !freshSession.access_token || !freshUserId || freshUserId !== originalUserId) {
        throw new Error('verification_failed');
      }

      session = freshSession;
      setDeletionStatus('Deleting your account and synced data...', false);
      const result = await invokeAccountDeletion(freshSession.access_token);
      if (!result.ok) {
        try { if (window.MementoErrors) MementoErrors.reportBackend({ endpoint: 'account_delete', status: result.status, phase: 'delete' }); } catch (_) {}
        throw new Error('deletion_failed');
      }

      setDeletionStatus('Account deleted. Clearing this device...', false);
      await eraseCurrentDeviceAfterDeletion();
    } catch (e) {
      const verificationFailed = String(e && e.message || '') === 'verification_failed';
      setDeletionStatus(
        verificationFailed
          ? 'That code did not work. Nothing was deleted. Request a new code and try again.'
          : 'Deletion could not finish. Your device has not been erased. Try again.',
        true,
      );
      try {
        if (window.MementoErrors) MementoErrors.reportBackend({
          endpoint: verificationFailed ? 'auth' : 'account_delete',
          status: 0,
          phase: verificationFailed ? 'reauth' : 'delete',
        });
      } catch (_) {}
      deleteWorking = false;
      if (button) { button.disabled = false; button.textContent = 'Delete account permanently'; }
    }
  }

  function installAccountDeletionUi() {
    try {
      if (typeof TabBar === 'undefined' || TabBar._mementoDeletionWired) return;
      const render = TabBar.renderAccountSection;
      const bind = TabBar.bindAccountSection;
      TabBar.renderAccountSection = function () {
        const base = render.call(this);
        if (!isLoggedIn()) return base;
        return base +
          '<div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(var(--ink),0.08);">' +
            '<button class="sheet-btn" id="acctDeleteAccount" style="width:100%;background:transparent;color:#d95b61;border:1px solid rgba(217,91,97,.22);">Delete account</button>' +
            '<div style="font-size:0.6875rem;color:var(--text-3);margin-top:8px;">Requires a fresh code sent to your email.</div>' +
          '</div>';
      };
      TabBar.bindAccountSection = function () {
        bind.call(this);
        const button = document.getElementById('acctDeleteAccount');
        if (button) button.addEventListener('click', openDeletionDialog);
      };
      TabBar._mementoDeletionWired = true;
    } catch (e) {}
  }

  // Community counter: fetch the public aggregate "days shown up across Memento"
  // once, cache it, and re-render the Home line. Reads the community_days RPC
  // (tools/community-counter.sql). If the RPC is not deployed, _communityDays
  // stays null and the Home line stays hidden, the app is unaffected.
  async function fetchCommunityDays() {
    if (!client) return;
    try {
      const r = await client.rpc('community_days');
      if (r && !r.error && r.data != null) {
        const n = (typeof r.data === 'number') ? r.data : parseInt(r.data, 10);
        if (isFinite(n) && n >= 0) {
          _communityDays = n;
          try { if (typeof renderHubConsistency === 'function') renderHubConsistency(); } catch (e) {}
        }
      }
    } catch (e) {}
  }
  function communityDays() { return _communityDays; }

  function lastSyncedText() {
    if (!lastSyncMs) return '';
    const mins = Math.floor((Date.now() - lastSyncMs) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    try { return new Date(lastSyncMs).toLocaleDateString(); } catch (e) { return ''; }
  }

  // Re-render just the settings Account card when sync state changes.
  function refreshAccountCard() {
    try {
      const sec = document.getElementById('acctSection');
      if (sec && typeof TabBar !== 'undefined' && TabBar.renderAccountSection) {
        sec.innerHTML = TabBar.renderAccountSection();
        TabBar.bindAccountSection();
      }
    } catch (e) {}
  }

  /* ---------- full-page auth screen ---------- */
  // Craft/Resend-style full-viewport sign-in: glyph half-overlapping a quiet
  // card on a near-black ambient backdrop. Replaces the old cloud-dialog
  // modal; openDialog/closeDialog keep their names so all callers still work.

  let authEl = null;
  let resendTimer = null;
  let sentTo = '';

  const GOOGLE_G_SVG =
    '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
      '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
      '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
      '<path fill="#34a83e" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
    '</svg>';

  function buildAuth() {
    if (authEl) return authEl;
    authEl = document.createElement('div');
    authEl.className = 'auth-screen';
    authEl.id = 'authScreen';
    authEl.setAttribute('role', 'dialog');
    authEl.setAttribute('aria-modal', 'true');
    authEl.setAttribute('aria-hidden', 'true');
    authEl.setAttribute('aria-label', 'Sign in to Memento');
    authEl.setAttribute('data-cloud-keep', '');
    const googleBtn = (window.MEMENTO_GOOGLE_AUTH === true)
      ? '<div class="auth-screen__divider" aria-hidden="true"><span>or</span></div>' +
        '<button type="button" class="auth-screen__google" id="authGoogle">' + GOOGLE_G_SVG + '<span>Continue with Google</span></button>'
      : '';
    authEl.innerHTML =
      '<div class="auth-screen__bg" aria-hidden="true"></div>' +
      // Same top-left god rays as the splash, so splash -> auth feels like one
      // continuous scene (wordmark fades, glass card appears, light stays).
      '<div class="auth-screen__rays" aria-hidden="true">' +
        '<div class="ambient__rays-source"></div>' +
        '<div class="ambient__rays-beam" style="--a:9deg;  --h:90px;  --d:11.6s; --del:-1.8s; --omin:0.07; --omax:0.50; --smin:0.55; --smax:1.35; --c:130 170 255;"><div class="ambient__rays-beam-shaft"></div></div>' +
        '<div class="ambient__rays-beam" style="--a:22deg; --h:75px;  --d:13.2s; --del:-2.1s; --omin:0.09; --omax:0.65; --smin:0.6;  --smax:1.3;  --c:140 238 255;"><div class="ambient__rays-beam-shaft"></div></div>' +
        '<div class="ambient__rays-beam" style="--a:29deg; --h:40px;  --d:10.5s; --del:-5.6s; --omin:0.05; --omax:0.34; --smin:0.5;  --smax:1.4;  --c:255 255 255;"><div class="ambient__rays-beam-shaft"></div></div>' +
        '<div class="ambient__rays-beam" style="--a:36deg; --h:110px; --d:8.3s;  --del:-0.7s; --omin:0.11; --omax:0.72; --smin:0.65; --smax:1.25; --c:120 235 255;"><div class="ambient__rays-beam-shaft"></div></div>' +
        '<div class="ambient__rays-beam" style="--a:50deg; --h:95px;  --d:9.0s;  --del:-3.0s; --omin:0.10; --omax:0.68; --smin:0.55; --smax:1.4;  --c:145 238 255;"><div class="ambient__rays-beam-shaft"></div></div>' +
        '<div class="ambient__rays-beam" style="--a:64deg; --h:65px;  --d:10.9s; --del:-1.2s; --omin:0.08; --omax:0.54; --smin:0.6;  --smax:1.3;  --c:120 165 255;"><div class="ambient__rays-beam-shaft"></div></div>' +
      '</div>' +
      '<button type="button" class="auth-screen__back" data-close aria-label="Back">' +
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</button>' +
      '<div class="auth-screen__col">' +
        '<div class="auth-screen__glyph" aria-hidden="true"><svg viewBox="0 0 512 512" width="100%" height="100%"><rect width="512" height="512" rx="115" fill="#0a0a0e"/><path d="M113 108 L256 251 L399 108 L399 405 L113 405 Z" fill="#f5f5f7"/></svg></div>' +
        '<div class="auth-screen__card">' +
          '<div id="authStepEmail">' +
            '<div class="auth-screen__title">Welcome to Memento</div>' +
            '<div class="auth-screen__sub">Enter your email to sign in or create your account.</div>' +
            '<input type="email" class="auth-screen__input" id="authEmail" maxlength="100" placeholder="you@email.com" autocomplete="email" autocapitalize="none" spellcheck="false" aria-label="Your email">' +
            '<button type="button" class="auth-screen__primary" id="authContinue">Continue</button>' +
            googleBtn +
            '<div class="auth-screen__note" id="authNote">No password. We email you a 6-digit code.</div>' +
          '</div>' +
          '<div id="authStepSent" hidden>' +
            '<div class="auth-screen__title">Enter your code</div>' +
            '<div class="auth-screen__sub">We sent a 6-digit code to<br><b class="auth-screen__addr" id="authSentTo"></b></div>' +
            '<div class="auth-screen__code-row" id="authCodeRow" role="group" aria-label="Verification code"></div>' +
            '<button type="button" class="auth-screen__primary" id="authVerify">Sign in</button>' +
            '<div class="auth-screen__note" id="authSentNote">Enter the code to finish signing in.</div>' +
            '<button type="button" class="auth-screen__resend" id="authResend">Resend code</button>' +
          '</div>' +
        '</div>' +
        '<div class="auth-screen__terms">By continuing you agree to keep showing up.</div>' +
      '</div>';
    document.body.appendChild(authEl);
    authEl.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', closeDialog));
    const input = authEl.querySelector('#authEmail');
    const cont = authEl.querySelector('#authContinue');
    if (cont) cont.addEventListener('click', submitAuth);
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitAuth(); } });
    const verify = authEl.querySelector('#authVerify');
    if (verify) verify.addEventListener('click', submitCode);
    buildCodeBoxes();
    const g = authEl.querySelector('#authGoogle');
    if (g) g.addEventListener('click', async () => {
      if (!client) return;
      try {
        await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
      } catch (e) {}
    });
    const resend = authEl.querySelector('#authResend');
    if (resend) resend.addEventListener('click', async () => {
      if (resend.disabled || !sentTo) return;
      resend.disabled = true; resend.textContent = 'Sending...';
      const r = await sendCode(sentTo);
      const note = document.getElementById('authSentNote');
      if (r.ok) {
        if (note) note.textContent = 'New code sent. Enter it to finish signing in.';
        startResendCooldown();
      } else {
        resend.disabled = false; resend.textContent = 'Resend code';
        if (note) note.textContent = r.error || 'Could not send the code. Try again.';
      }
    });
    // Esc closes. Capture phase so it wins over the app's global key handlers.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && authEl.classList.contains('open')) {
        e.preventDefault(); e.stopPropagation(); closeDialog();
      }
    }, true);
    return authEl;
  }

  function startResendCooldown() {
    const btn = document.getElementById('authResend');
    if (!btn) return;
    let left = 30;
    btn.disabled = true;
    btn.textContent = 'Resend in ' + left + 's';
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(resendTimer);
        btn.disabled = false;
        btn.textContent = 'Resend code';
      } else {
        btn.textContent = 'Resend in ' + left + 's';
      }
    }, 1000);
  }

  // Read the full code by concatenating the digit boxes.
  function readCode() {
    const row = document.getElementById('authCodeRow');
    if (!row) return '';
    return [].slice.call(row.querySelectorAll('.auth-screen__code-box')).map((b) => b.value || '').join('');
  }

  // Build CODE_LEN single-digit boxes with auto-advance, backspace-to-previous,
  // paste-to-fill, and auto-submit once the last box is filled.
  let _verifying = false;
  function buildCodeBoxes() {
    const row = document.getElementById('authCodeRow');
    if (!row) return;
    row.innerHTML = '';
    const boxes = [];
    for (let i = 0; i < CODE_LEN; i++) {
      const b = document.createElement('input');
      b.type = 'text'; b.inputMode = 'numeric'; b.autocomplete = 'one-time-code';
      b.maxLength = 1; b.className = 'auth-screen__code-box'; b.setAttribute('aria-label', 'Digit ' + (i + 1));
      row.appendChild(b); boxes.push(b);
    }
    const focusBox = (i) => { if (i >= 0 && i < boxes.length) { try { boxes[i].focus(); boxes[i].select(); } catch (e) {} } };
    const maybeSubmit = () => { if (readCode().replace(/\D/g, '').length === CODE_LEN) submitCode(); };
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        b.value = (b.value || '').replace(/\D/g, '').slice(-1);
        if (b.value && i < boxes.length - 1) focusBox(i + 1);
        maybeSubmit();
      });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') { if (!b.value && i > 0) { e.preventDefault(); boxes[i - 1].value = ''; focusBox(i - 1); } }
        else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); focusBox(i - 1); }
        else if (e.key === 'ArrowRight' && i < boxes.length - 1) { e.preventDefault(); focusBox(i + 1); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); submitCode(); }
      });
      b.addEventListener('paste', (e) => {
        e.preventDefault();
        const digits = String(((e.clipboardData || window.clipboardData) || {}).getData('text') || '').replace(/\D/g, '').slice(0, CODE_LEN);
        if (!digits) return;
        for (let j = 0; j < boxes.length; j++) boxes[j].value = digits[j] || '';
        focusBox(Math.min(digits.length, boxes.length - 1));
        maybeSubmit();
      });
    });
  }

  function showSentStep(addr) {
    sentTo = addr;
    const stepEmail = document.getElementById('authStepEmail');
    const stepSent = document.getElementById('authStepSent');
    const to = document.getElementById('authSentTo');
    if (to) to.textContent = addr;
    buildCodeBoxes();
    if (stepEmail) stepEmail.hidden = true;
    if (stepSent) stepSent.hidden = false;
    try { setTimeout(() => { const f = document.querySelector('#authCodeRow .auth-screen__code-box'); if (f) f.focus(); }, 80); } catch (e) {}
    startResendCooldown();
  }

  async function submitAuth() {
    const input = document.getElementById('authEmail');
    const cont = document.getElementById('authContinue');
    const note = document.getElementById('authNote');
    const addr = String((input && input.value) || '').trim();
    if (!addr || addr.indexOf('@') < 1) { if (note) note.textContent = 'Enter your email address.'; return; }
    if (cont) { cont.disabled = true; cont.textContent = 'Sending...'; }
    const r = await sendCode(addr);
    if (cont) { cont.disabled = false; cont.textContent = 'Continue'; }
    if (r.ok) {
      showSentStep(addr);
    } else {
      if (note) note.textContent = r.error || 'Could not send the code. Try again.';
    }
  }

  async function submitCode() {
    if (_verifying) return;
    const btn = document.getElementById('authVerify');
    const note = document.getElementById('authSentNote');
    const code = readCode();
    if (code.replace(/\D/g, '').length < CODE_LEN) { if (note) note.textContent = 'Enter the ' + CODE_LEN + '-digit code from your email.'; return; }
    _verifying = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
    const r = await verifyCode(sentTo, code);
    _verifying = false;
    if (!r.ok) {
      if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; }
      if (note) note.textContent = r.error || 'That code did not work. Try again.';
      buildCodeBoxes();
      try { const f = document.querySelector('#authCodeRow .auth-screen__code-box'); if (f) f.focus(); } catch (e) {}
      return;
    }
    // Success: onAuthStateChange closes the screen + pulls the cloud copy.
    if (btn) btn.textContent = 'Signed in';
  }

  function openDialog() {
    const d = buildAuth();
    // Always reopen on the email step with a clean slate.
    const stepEmail = d.querySelector('#authStepEmail');
    const stepSent = d.querySelector('#authStepSent');
    const note = d.querySelector('#authNote');
    if (stepEmail) stepEmail.hidden = false;
    if (stepSent) stepSent.hidden = true;
    if (note) note.textContent = 'No password. We email you a 6-digit code.';
    clearInterval(resendTimer);
    // Seamless splash handoff: if the splash is still up, it stays as the
    // constant background (its beams keep animating). The auth screen drops
    // its own bg + rays, the wordmark fades, and only the card animates in.
    try {
      const sp = document.getElementById('splash');
      if (sp && !sp.classList.contains('dismissed') && !sp.classList.contains('splash--exiting')) {
        sp.classList.add('splash--auth');
        d.classList.add('auth-screen--over-splash');
      } else {
        d.classList.remove('auth-screen--over-splash');
      }
    } catch (e) {}
    d.setAttribute('aria-hidden', 'false');
    d.classList.add('open');
    try { const input = d.querySelector('#authEmail'); if (input) setTimeout(() => input.focus(), 80); } catch (e) {}
  }

  function closeDialog() {
    if (!authEl) return;
    authEl.classList.remove('open');
    authEl.setAttribute('aria-hidden', 'true');
    clearInterval(resendTimer);
    // Bring the splash wordmark back if we were layered over it.
    try { const sp = document.getElementById('splash'); if (sp) sp.classList.remove('splash--auth'); } catch (e) {}
  }

  function hideSplashLink() {
    try { const link = document.getElementById('splashSignin'); if (link) link.style.display = 'none'; } catch (e) {}
  }

  function bindSplashSignin() {
    const link = document.getElementById('splashSignin');
    if (!link) return;
    // Stop every tap event here so the splash's own tap-to-continue and the
    // document-level dismiss safety net never fire from this link (the safety
    // net also checks data-cloud-keep, since it listens in capture phase).
    const open = (e) => { e.preventDefault(); e.stopPropagation(); openDialog(); };
    link.addEventListener('click', open);
    link.addEventListener('touchend', open, { passive: false });
    link.addEventListener('pointerup', (e) => { e.stopPropagation(); });
  }

  /* ---------- boot ---------- */

  function init() {
    try { installAccountDeletionUi(); } catch (e) {}
    try {
      if (window.supabase && window.supabase.createClient) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
    } catch (e) { client = null; }
    try { bindSplashSignin(); } catch (e) {}
    if (!client) return; // CDN never loaded: stay fully local, all entry points no-op
    if (restoreReloadPending()) showRestoreScreen();
    try { fetchCommunityDays(); } catch (e) {} // public counter, runs logged in or out
    try {
      client.auth.getSession().then((r) => {
        session = (r && r.data && r.data.session) || null;
        if (session) {
          hideSplashLink();
          beginFirstSync();
        } else {
          firstSyncState = FIRST_SYNC_WAITING;
          clearRestoreReload();
          hideRestoreScreen();
        }
        refreshAccountCard();
      }).catch((e) => {
        // A failed boot-time session check (offline, slow network) must not be
        // invisible: log it, and let the next focus retry the restore instead
        // of leaving the user silently signed out until a manual reload.
        try { console.warn('CloudSync: session restore failed, will retry on focus.', e); } catch (_) {}
        sessionRetryNeeded = true;
      });
      client.auth.onAuthStateChange((ev, s) => {
        const had = isLoggedIn();
        session = s || null;
        if (session) {
          hideSplashLink();
          closeDialog();
          beginFirstSync();
        } else {
          firstSyncState = FIRST_SYNC_WAITING;
          firstSyncPromise = null;
          lastCloudStamp = '';
          lastCloudRevision = 0;
          clearRestoreReload();
          hideRestoreScreen();
        }
        if (had !== isLoggedIn()) refreshAccountCard();
      });
    } catch (e) {}
    try {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) onFocus(); });
    } catch (e) {}
  }

  return {
    init, available, isLoggedIn, email, accessToken,
    schedulePush, pushNow, syncNow,
    sendCode, verifyCode, signOut, mergeDecision, buildMergedState, createShare, lastSyncedText,
    communityDays, openDialog, closeDialog, openDeletionDialog
  };
})();

// const does not create a window property; the guarded hooks elsewhere
// (js/01 persist, js/09 account card) all check window.CloudSync.
try { window.CloudSync = CloudSync; } catch (e) {}
try { CloudSync.init(); } catch (e) {}
