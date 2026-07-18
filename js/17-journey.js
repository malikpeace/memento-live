/* ===========================================================================
   17-journey.js  -  Two views that make the goal feel real over time:

   THE PATH (MementoPath): the climb from today's action up to your goal. Reads
   state.action.primaryAction.path (the AI-built horizon/milestone ladder) + the
   Neutron Star. Shows today as where you stand and the goal as the summit, so
   the daily move stops being a floating checkbox.

   YOUR STORY (MementoStory): every proof you have stacked, a scrollable timeline
   of state.proofEvents (actions, records, reflections, deep work, vivere). The
   receipts you can look back on when you doubt yourself.

   Both are self-contained overlays, client-side, zero AI cost. Additive.
   =========================================================================== */
(function () {
  'use strict';

  function esc2(s) {
    try { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
    catch (e) { return String(s == null ? '' : s); }
  }

  // ---- shared full-screen overlay ------------------------------------------
  function buildOverlay(id, titleText, sub) {
    var el = document.getElementById(id);
    if (el) { var h = el.querySelector('.jrny-head__title'); if (h) h.textContent = titleText; return el; }
    el = document.createElement('div');
    el.id = id; el.className = 'jrny-overlay'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="jrny-sheet" role="dialog" aria-label="' + esc2(titleText) + '">' +
        '<header class="jrny-head">' +
          '<span class="jrny-head__title">' + esc2(titleText) + '</span>' +
          '<button class="jrny-close" aria-label="Close">&#10005;</button>' +
        '</header>' +
        '<div class="jrny-body" id="' + id + 'Body"></div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.jrny-close').addEventListener('click', function () { closeOverlay(el); });
    el.addEventListener('click', function (e) { if (e.target === el) closeOverlay(el); });
    return el;
  }
  function openOverlay(el) { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; var b = el.querySelector('.jrny-body'); if (b) b.scrollTop = 0; }
  function closeOverlay(el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  // rank a horizon by how far out it is, so the spine always runs furthest
  // (near the summit) down to "this week" (near today), whatever order the data
  // came in.
  function horizonRank(h) {
    h = String(h || '').toLowerCase();
    var mm = h.match(/\d+/); var n = mm ? parseInt(mm[0], 10) : 1;
    if (h.indexOf('today') !== -1 || h.indexOf('now') !== -1) return 0;
    if (h.indexOf('lifelong') !== -1 || h.indexOf('forever') !== -1 || h.indexOf('someday') !== -1 || h.indexOf('eventually') !== -1 || h.indexOf('life') !== -1) return 1000;
    if (h.indexOf('week') !== -1) return 1 + n * 0.1;
    if (h.indexOf('month') !== -1) return 10 + n;
    if (h.indexOf('quarter') !== -1) return 30 + n;
    if (h.indexOf('year') !== -1) return 100 + n;
    return 90;
  }

  function goalText() {
    try {
      var ns = state.clarity && state.clarity.answers && state.clarity.answers.neutronStar;
      if (!ns) return '';
      return typeof ns === 'string' ? ns : (ns.title || ns.statement || ns.goal || ns.oneThing || '');
    } catch (e) { return ''; }
  }

  // =========================================================================
  // THE PATH
  // =========================================================================
  var MementoPath = {
    open: function () {
      var el = buildOverlay('pathOverlay', 'Your path');
      var body = document.getElementById('pathOverlayBody');
      var pa = (state.action && state.action.primaryAction) || {};
      var path = Array.isArray(pa.path) ? pa.path : [];
      var goal = goalText();
      var cs = (typeof consistencyStats === 'function') ? consistencyStats() : { current: 0, totalActiveDays: 0 };

      var html = '<div class="path-intro">The climb from today, up to the one thing you are actually after. Every day you show up is one step.</div>';
      html += '<div class="path-summit"><div class="path-summit__eyebrow">The summit</div><div class="path-summit__goal">' + esc2(goal || 'Your one goal') + '</div></div>';
      html += '<div class="path-spine">';
      if (!path.length) {
        html += '<div class="path-node"><span class="path-node__dot"></span><div class="path-node__c"><div class="path-node__title">Your milestones appear here once your plan is built.</div></div></div>';
      } else {
        // sort furthest-first so the top sits under the summit and "this week"
        // lands just above today, regardless of how the data was ordered
        path.slice().sort(function (a, b) { return horizonRank(b.horizon) - horizonRank(a.horizon); }).forEach(function (m) {
          html += '<div class="path-node"><span class="path-node__dot"></span><div class="path-node__c">' +
            '<div class="path-node__horizon">' + esc2(m.horizon || '') + '</div>' +
            '<div class="path-node__title">' + esc2(m.milestone || '') + '</div>' +
            (m.bridge ? '<div class="path-node__bridge">' + esc2(m.bridge) + '</div>' : '') +
            '</div></div>';
        });
      }
      // today = where you stand right now (the glowing current step)
      html += '<div class="path-node path-node--now"><span class="path-node__dot"></span><div class="path-node__c">' +
        '<div class="path-node__horizon">You are here, today</div>' +
        '<div class="path-node__title">' + esc2(pa.title || 'Your daily move') + '</div>' +
        '<div class="path-node__bridge">' + (cs.totalActiveDays || 0) + ' day' + ((cs.totalActiveDays || 0) === 1 ? '' : 's') + ' in. This is where the climb actually happens, one move at a time.</div>' +
        '</div></div>';
      html += '</div>';
      body.innerHTML = html;
      openOverlay(el);
    }
  };

  // =========================================================================
  // YOUR STORY
  // =========================================================================
  var MOD_META = {
    action: { c: 'rgba(232,194,74,1)', label: 'Action' },
    streak: { c: 'rgba(52, 211, 65,1)', label: 'Consistency' },
    consistency: { c: 'rgba(52, 211, 65,1)', label: 'Consistency' },
    reflection: { c: 'rgba(125,200,255,1)', label: 'Reflection' },
    deepwork: { c: 'rgba(116, 234, 255,1)', label: 'Deep work' },
    vivere: { c: 'rgba(244,138,120,1)', label: 'Vivere' },
    mori: { c: 'rgba(192, 246, 255,1)', label: 'Mori' },
    clarity: { c: 'rgba(116, 234, 255,1)', label: 'Clarity' },
    '': { c: 'rgba(116, 234, 255,1)', label: 'Memento' }
  };
  function modMeta(m) { return MOD_META[m] || MOD_META['']; }
  function fmtDate(iso) {
    try { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return String(iso || ''); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch (e) { return String(iso || ''); }
  }
  function fmtMonth(iso) {
    try { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return ''; return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  var MementoStory = {
    open: function () {
      var el = buildOverlay('storyOverlay', 'Your story');
      var body = document.getElementById('storyOverlayBody');
      var evs = (Array.isArray(state.proofEvents) ? state.proofEvents.slice() : []);
      // skip internal record writes + distraction logs (this is a wins reel, not a ledger)
      evs = evs.filter(function (e) { return e && e.type !== 'new-record' && e.type !== 'distraction-log' && e.module !== 'distraction'; });
      evs.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      var cs = (typeof consistencyStats === 'function') ? consistencyStats() : { current: 0, totalActiveDays: 0, longest: 0 };

      var html = '<div class="story-stats">' +
        '<div class="story-stat"><div class="story-stat__n">' + (cs.totalActiveDays || 0) + '</div><div class="story-stat__l">days shown up</div></div>' +
        '<div class="story-stat"><div class="story-stat__n">' + evs.length + '</div><div class="story-stat__l">moments logged</div></div>' +
        '<div class="story-stat"><div class="story-stat__n">' + (cs.longest || cs.current || 0) + '</div><div class="story-stat__l">best streak</div></div>' +
        '</div>';

      if (!evs.length) {
        html += '<div class="story-empty">Your story starts the first day you show up. Do today\'s move and the receipts begin stacking, right here.</div>';
      } else {
        html += '<div class="story-timeline">';
        var lastMonth = '';
        evs.forEach(function (e) {
          var mo = fmtMonth(e.iso);
          if (mo && mo !== lastMonth) { html += '<div class="story-month">' + esc2(mo) + '</div>'; lastMonth = mo; }
          var m = modMeta(e.module);
          var title = e.title || m.label || 'A moment';
          html += '<div class="story-item"><div class="story-item__rail"><span class="story-item__dot" style="background:' + m.c + '"></span></div>' +
            '<div class="story-item__c">' +
              '<div class="story-item__top"><span class="story-item__date">' + esc2(fmtDate(e.iso)) + '</span><span class="story-item__mod" style="color:' + m.c + '">' + esc2(m.label) + '</span></div>' +
              '<div class="story-item__title">' + esc2(title) + '</div>' +
              (e.text ? '<div class="story-item__text">' + esc2(e.text) + '</div>' : '') +
            '</div></div>';
        });
        html += '</div>';
      }
      body.innerHTML = html;
      openOverlay(el);
    }
  };

  window.MementoPath = MementoPath;
  window.MementoStory = MementoStory;
})();

/* ============================================================
   TAB SURFACES (BOTTOM-BAR-PLAN.md, phase 1 stubs).
   renderPathTab / renderReflectTab are the bottom bar's Path and Reflect
   panels. Phase 1 ships quiet placeholders so the bar's routing is complete;
   phases 2 and 3 replace the bodies with the real road and the evening close.
   ============================================================ */
function renderPathTab() {
  try {
    const body = document.getElementById('pathBody');
    if (!body) return;
    const E = (s) => { try { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); } catch (e) { return ''; } };

    // --- data ---
    const ans = (state.clarity && state.clarity.answers) || {};
    const goalRaw = String(ans.neutronStar || '').trim();
    const goal = goalRaw && !/[.!?]$/.test(goalRaw) ? goalRaw + '.' : goalRaw;
    const horizon = String(ans.timeHorizon || ans.timeframe || '').trim();
    const ignited = (state.clarity && (state.clarity.ignitedAt || state.clarity.completedAt)) || Date.now();
    const DAY = 86400000;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const ignStart = new Date(ignited); ignStart.setHours(0, 0, 0, 0);
    const dayN = Math.max(1, Math.round((todayStart - ignStart) / DAY) + 1);
    let cs = { totalActiveDays: 0, counts: {} };
    try { cs = consistencyStats() || cs; } catch (e) {}
    const counts = cs.counts || {};
    const movesDone = (state.proofEvents || []).filter(ev => ev && ev.type === 'action-complete').length;
    const pa = (state.action && state.action.primaryAction) || {};
    const move = String(pa.title || '').trim();

    // milestones, farthest first so the road descends toward today
    const rank = (h2) => {
      h2 = String(h2 || '').toLowerCase();
      const mm = h2.match(/\d+/); const n = mm ? parseInt(mm[0], 10) : 1;
      if (h2.indexOf('today') !== -1 || h2.indexOf('now') !== -1) return 0;
      if (h2.indexOf('life') !== -1 || h2.indexOf('forever') !== -1 || h2.indexOf('someday') !== -1 || h2.indexOf('eventually') !== -1) return 1000;
      if (h2.indexOf('week') !== -1) return 1 + n * 0.1;
      if (h2.indexOf('month') !== -1) return 10 + n;
      if (h2.indexOf('quarter') !== -1) return 30 + n;
      if (h2.indexOf('year') !== -1) return 100 + n;
      return 90;
    };
    const miles = (Array.isArray(pa.path) ? pa.path.slice() : [])
      .filter(m => m && String(m.milestone || '').trim())
      .sort((a, b) => rank(b.horizon) - rank(a.horizon));

    // the walked trail: last 7 calendar days before today that were shown up,
    // best title per day (action-complete wins, else the latest proof event)
    const titleByDay = {};
    (state.proofEvents || []).forEach(ev => {
      if (!ev || !ev.iso) return;
      const cur = titleByDay[ev.iso];
      if (!cur || (ev.type === 'action-complete' && cur.type !== 'action-complete') ||
          (ev.type === cur.type && (ev.ts || 0) > (cur.ts || 0))) titleByDay[ev.iso] = ev;
    });
    const dayIso = (d) => { const x = new Date(d); x.setHours(12, 0, 0, 0); return x.toISOString().split('T')[0]; };
    const recent = [];
    for (let i = 1; i <= 7; i++) {
      const t = new Date(todayStart.getTime() - i * DAY);
      if (t < ignStart) break;
      const iso = dayIso(t);
      if (counts[iso] === undefined) continue;
      const ev = titleByDay[iso];
      recent.push({
        lab: i === 1 ? 'Yesterday' : ('Day ' + (dayN - i)),
        ttl: (ev && String(ev.title || '').trim()) || 'Showed up'
      });
    }
    // older weeks (since ignition, before the 7-day window) condense to chips
    const weeks = [];
    const windowStart = new Date(todayStart.getTime() - 7 * DAY);
    let wStart = new Date(ignStart);
    let wIdx = 1;
    while (wStart < windowStart && wIdx < 60) {
      const wEnd = new Date(Math.min(wStart.getTime() + 7 * DAY, windowStart.getTime()));
      let on = 0, total = 0;
      for (let t = new Date(wStart); t < wEnd; t = new Date(t.getTime() + DAY)) {
        total++;
        if (counts[dayIso(t)] !== undefined) on++;
      }
      if (total > 0) weeks.push({ idx: wIdx, on, total });
      wStart = new Date(wStart.getTime() + 7 * DAY);
      wIdx++;
    }
    weeks.reverse(); // most recent condensed week sits closest to the days
    const originDate = (() => { try { return ignStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return ''; } })();

    // --- html ---
    let h = '<div class="pt">';
    h += '<div class="pt-eyebrow">The Path</div>';
    h += '<div class="pt-starwrap"><div class="pt-star" aria-hidden="true"></div>';
    if (goal) h += '<div class="pt-goal">' + E(goal) + '</div>';
    if (horizon) h += '<div class="pt-horizon"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/></svg><span>' + E(horizon) + '</span></div>';
    h += '<div class="pt-stats"><span>Day <b>' + dayN + '</b></span>';
    if (cs.totalActiveDays) h += '<span><b>' + cs.totalActiveDays + '</b> days shown up</span>';
    if (movesDone) h += '<span><b>' + movesDone + '</b> moves done</span>';
    h += '</div></div>';

    h += '<div class="pt-road">';
    if (miles.length) {
      miles.forEach((m, i) => {
        const next = i === miles.length - 1;
        h += '<div class="pt-seg' + (next ? ' pt-seg--next' : '') + '"><span class="pt-link"></span><span class="pt-dot"></span>' +
          '<div class="pt-lab">' + (next ? 'Next &middot; ' : '') + E(m.horizon || '') + '</div>' +
          '<div class="pt-ttl">' + E(m.milestone) + '</div></div>';
      });
    } else {
      h += '<div class="pt-seg"><span class="pt-link"></span><span class="pt-dot"></span>' +
        '<div class="pt-lab">Ahead</div><div class="pt-ttl">Your milestones appear once your plan is built.</div></div>';
    }

    h += '<div class="pt-today" id="ptToday"><span class="pt-link"></span><span class="pt-here"></span>' +
      '<div class="pt-lab">Today &middot; Day ' + dayN + '</div>' +
      '<div class="pt-big">' + (dayN === 1 ? 'The road starts here.' : 'You are here.') + '</div>' +
      (move ? '<div class="pt-move">' + (dayN === 1 ? 'First move' : "Today's move") + ': <b>' + E(move) + '</b></div>' : '') +
      '</div>';

    recent.forEach(d => {
      h += '<div class="pt-seg pt-past"><span class="pt-link"></span><span class="pt-dot"></span>' +
        '<div class="pt-lab">' + d.lab + '</div><div class="pt-ttl">' + E(d.ttl) + '</div></div>';
    });
    weeks.forEach(w => {
      h += '<div class="pt-seg pt-past pt-week"><span class="pt-link"></span>' +
        '<span class="pt-weekchip"><i></i>Week ' + w.idx + ' &middot; showed up ' + w.on + ' of ' + w.total + ' days</span></div>';
    });
    if (dayN > 1) {
      h += '<div class="pt-seg pt-past pt-origin"><span class="pt-link"></span><span class="pt-dot"></span>' +
        '<div class="pt-lab">Day 1' + (originDate ? ' &middot; ' + originDate : '') + '</div>' +
        '<div class="pt-ttl">You ignited your star.</div></div>';
    }
    h += '</div></div>';
    body.innerHTML = h;

    // Land centered on today (the panel is the scroll container). setTimeout,
    // not rAF: rAF is throttled in background tabs and the scroll silently
    // never runs there.
    setTimeout(() => {
      try {
        const panel = document.getElementById('panelPath');
        const today = document.getElementById('ptToday');
        if (panel && today) panel.scrollTop = Math.max(0, today.offsetTop - panel.clientHeight * 0.40);
      } catch (e) {}
    }, 50);
  } catch (e) {}
}
function renderReflectTab() {
  try {
    const body = document.getElementById('reflectBody');
    if (!body) return;
    const E = (s) => { try { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); } catch (e) { return ''; } };

    const todayISO = getTodayISO();
    const entries = (state.reflection && Array.isArray(state.reflection.entries)) ? state.reflection.entries : [];
    const todayEntry = entries.slice().reverse().find(en => en && en.iso === todayISO && en.closedDay);
    const done = (typeof actionDoneToday === 'function') ? actionDoneToday() : false;
    const dateLabel = (() => { try { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }); } catch (e) { return ''; } })();

    // Templated prompt (zero AI, decision 4): names their actual day. Variant
    // rotates by date so it never feels like a stuck sign.
    const seed = parseInt(todayISO.replace(/-/g, ''), 10) || 0;
    const DONE_PROMPTS = [
      "What's worth remembering from today?",
      'What did today prove?',
      'What worked today that you should repeat?'
    ];
    const MISS_PROMPTS = [
      'What got in the way today?',
      'What made today heavy?',
      'What would make tomorrow easier?'
    ];
    const prompt = (done ? DONE_PROMPTS : MISS_PROMPTS)[seed % 3];

    // The story: every written day, newest first. Tonight (if sealed) leads.
    const past = entries.slice()
      .filter(en => en && String(en.text || '').trim() && !(en.iso === todayISO && en.closedDay))
      .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')));
    const dayCount = past.length + (todayEntry ? 1 : 0);
    const sealed = !!todayEntry;

    // Two faces, one natural scroll: the writing face fills the viewport, the
    // rail-timeline story lives one swipe below it (Malik: the timeline must be
    // BEHIND a swipe, not already on screen). Native scrolling IS the gesture.
    let h = '<div class="rf2' + (sealed ? ' rf2--sealed' : '') + '" id="rf2">';

    // ---- face 1: tonight (whisper writing) --------------------------------
    h += '<section class="rf2-write" id="rf2Write">';
    h += '<div class="rf2-date">' + E(dateLabel) + '</div>';
    if (sealed) {
      h += '<div class="rf2-q">' + E(prompt) + '</div>';
      h += '<div class="rf2-bigread">&ldquo;' + E(todayEntry.text || '') + '&rdquo;</div>';
      h += '<div class="rf2-floor"><span class="rf2-count">day closed</span><span class="rf2-sealedmark" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div>';
    } else {
      h += '<div class="rf2-q">' + E(prompt) + '</div>';
      h += '<textarea id="rfInput" class="rf2-input" rows="1" maxlength="500" placeholder="Write it here." aria-label="' + E(prompt) + '"></textarea>';
      h += '<div class="rf2-floor"><span class="rf2-count tabnum" id="rfCount">0 words</span><button type="button" id="rfSave" class="rf2-cta" disabled>Close the day</button></div>';
    }
    h += '<button type="button" class="rf2-hint" id="rfStoryOpen" aria-label="See your story">';
    h += '<span class="rf2-hint__bar" aria-hidden="true"></span>';
    h += '<span class="rf2-hint__label tabnum">your story' + (dayCount ? ' &middot; ' + dayCount + (dayCount === 1 ? ' day' : ' days') : '') + '</span>';
    h += '</button>';
    h += '</section>';

    // ---- face 2: the story (rail timeline) --------------------------------
    h += '<section class="rf2-story" id="rf2Story">';
    h += '<div class="rf2-story__head"><span class="rf2-story__title">Your story</span><span class="rf2-story__n tabnum">' + dayCount + (dayCount === 1 ? ' day' : ' days') + '</span></div>';
    if (dayCount) {
      h += '<div class="rf2-rail">';
      h += '<div class="rf2-rail__line" aria-hidden="true"></div>';
      h += '<div class="rf2-rail__col">';
      if (todayEntry) {
        h += '<div class="rf2-en rf2-en--tonight"><div class="rf2-en__date tabnum">Tonight</div><div class="rf2-en__text">' + E(String(todayEntry.text || '').slice(0, 220)) + '</div></div>';
      }
      past.slice(0, 30).forEach(en => {
        h += '<div class="rf2-en"><div class="rf2-en__date tabnum">' + E(en.date || en.iso || '') + '</div><div class="rf2-en__text">' + E(String(en.text).slice(0, 220)) + '</div></div>';
      });
      h += '</div></div>';
    } else {
      h += '<div class="rf2-empty">Your first line tonight starts it.</div>';
    }
    h += '<button type="button" id="rfWriteBack" class="rf2-back">' + (sealed ? 'tonight is sealed' : 'swipe down to write') + '</button>';
    h += '<button type="button" id="rfAllNotes" class="rf2-notes-link">All notes</button>';
    h += '</section>';
    h += '</div>';
    body.innerHTML = h;

    const panel = body.closest('.tab-panel');

    // --- bind: writing ---
    const input = document.getElementById('rfInput');
    const save = document.getElementById('rfSave');
    const count = document.getElementById('rfCount');
    if (input && save) {
      const grow = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
      input.addEventListener('input', () => {
        save.disabled = !input.value.trim();
        if (count) {
          const n = input.value.trim() ? input.value.trim().split(/\s+/).length : 0;
          count.textContent = n + (n === 1 ? ' word' : ' words');
        }
        grow();
      });
      grow();
      save.addEventListener('click', () => {
        const v = input.value.trim();
        if (!v) return;
        try {
          if (!state.reflection) state.reflection = {};
          if (!Array.isArray(state.reflection.entries)) state.reflection.entries = [];
          state.reflection.entries.push({
            date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            iso: todayISO,
            text: v,
            closedDay: true
          });
          try { writeProofEvent('reflection-save', { title: 'Closed the day', text: v.slice(0, 140), module: 'reflection', dedupeKey: 'close-' + todayISO }); } catch (e) {}
          persistNow();
        } catch (e) {}
        renderReflectTab();
      });
    }

    // --- bind: faces (tap complements the natural swipe/scroll) ---
    const story = document.getElementById('rf2Story');
    const hint = document.getElementById('rfStoryOpen');
    if (hint && story && panel) hint.addEventListener('click', () => {
      const top = story.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
      panel.scrollTo({ top: top, behavior: 'smooth' });
    });
    const back = document.getElementById('rfWriteBack');
    if (back && panel) back.addEventListener('click', () => { panel.scrollTo({ top: 0, behavior: 'smooth' }); });
    const allNotes = document.getElementById('rfAllNotes');
    if (allNotes) allNotes.addEventListener('click', () => {
      try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection'); } catch (e) {}
    });
  } catch (e) {}
}
