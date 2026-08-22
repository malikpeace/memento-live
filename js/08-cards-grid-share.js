/* Memento module: card renderers, unlock, dynamic grid, command center, proof UI, share card
   Extracted from app.js lines 17311-19701. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   CARD RENDERERS
   ============================================ */
const RENDERERS = {
  clarity(el) {
    const c = el.querySelector('.widget__content');
    const a = state.clarity.answers;
    if (state.clarity.completed) {
      const summary = normalizeClaritySummary(a);
      const fullText = summary.neutronStar || '';
      // Rebuild content as a text-forward hero card (matches Dashboard V2 mockup).
      const topRow = c.querySelector('.widget__top-row');
      c.innerHTML = '';
      if (topRow) c.appendChild(topRow);
      c.insertAdjacentHTML('beforeend', `
        <div class="dash-mission__body">${esc(fullText)}</div>
        <button class="dash-mission__cta" type="button">View full mission <span aria-hidden="true">→</span></button>
        <span class="dash-mission__sparkle" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z"/></svg></span>
      `);
      const ctaBtn = c.querySelector('.dash-mission__cta');
      if (ctaBtn) ctaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof ClarityExperience !== 'undefined') ClarityExperience.openSummary();
      });
      // (no inline tint: the .widget glass rule is !important, so the modules stay
      // flat per the design; the old purple inline gradient never showed.)
    } else {
      // Not yet completed - keep the existing prompt
      const titleEl = c.querySelector('.widget__title');
      const subEl   = c.querySelector('.widget__subtitle');
      if (titleEl) titleEl.textContent = 'Get clear on the goal';
      if (subEl)   subEl.textContent   = 'Find your Neutron Star';
    }
  },

  action(el) {
    const c = el.querySelector('.widget__content');
    const textEl = c.querySelector('#actionWidgetText');
    if (!textEl) return;
    if (hasActionPlan() && state.clarity && state.clarity.completed) {
      // Show the recommended tier (constrained to 2-6 words by the AI prompt
      // + sanitizeTierText guard). Falls back to the action title if the tier
      // somehow isn't set yet, and finally to the pre-plan descriptor.
      // (Pre-Clarity a leftover plan never leaks here; the gate text wins.)
      const pa = state.action.primaryAction || {};
      const recTier = pa.recommendedTier && pa.tiers ? pa.tiers[pa.recommendedTier] : '';
      textEl.textContent = recTier || pa.title || 'Turn your goal into one daily action';
      textEl.classList.add('widget__action-set');
    } else {
      // v23 ladder gate card: while Action is locked the slot carries the earn
      // condition in plain words instead of the descriptor.
      const gated = (typeof isModuleUnlocked === 'function') && !isModuleUnlocked('action');
      textEl.textContent = gated ? 'Define your goal first' : 'Turn your goal into one daily action';
      textEl.classList.remove('widget__action-set');
    }
  },

  streak(el) {
    const c = el.querySelector('.widget__content');
    const isFullWidth = el.classList.contains('widget--full');
    // The streak tracks completed main Actions; support activity remains a faint
    // heatmap signal but cannot light a streak dot.
    const counts = (typeof buildConsistencyData === 'function') ? buildConsistencyData() : {};
    if (isFullWidth) {
      const today = new Date();
      const dayNamesAll = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      let html = `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-consistency)">${ICONS.streak}</div><div class="widget__label" style="color:var(--color-consistency)">Consistency</div></div><div class="widget__arrow">›</div></div>`;
      html += `<div class="widget__big-num" style="font-size:2rem;color:var(--color-consistency);text-shadow:0 0 15px rgba(var(--success-rgb),0.3)">${state.streak.count}</div>`;
      html += '<div class="widget__big-unit">day streak</div>';
      html += '<div class="widget__week-strip">';
      // Center today (index 3), show 3 days before and 3 days after
      for (let offset = -3; offset <= 3; offset++) {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        const dateStr = localISO(d);
        const isToday = offset === 0;
        const isDone = (typeof consistencyDayHasMainAction === 'function') && consistencyDayHasMainAction(counts[dateStr]);
        html += `<div class="week-day ${isToday ? 'week-day--today' : ''} ${isDone ? 'week-day--done' : ''}">
          <div class="week-day__name">${dayNamesAll[d.getDay()]}</div>
          <div class="week-day__dot"></div>
        </div>`;
      }
      html += '</div>';
      c.innerHTML = html;
    } else {
      // Always rebuild half view (dots) since full view replaces innerHTML
      let html = `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-consistency)">${ICONS.streak}</div><div class="widget__label" style="color:var(--color-consistency)">Consistency</div></div></div>`;
      html += `<div class="widget__big-num" style="color:var(--color-consistency)">${state.streak.count}</div>`;
      html += '<div class="widget__big-unit">days</div>';
      html += '<div class="widget__streak-dots">';
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = localISO(d);
        const active = consistencyDayHasMainAction(counts[dateStr]) ? 'widget__streak-dot--active' : '';
        html += `<div class="widget__streak-dot ${active}"></div>`;
      }
      html += '</div>';
      c.innerHTML = html;
    }
  },

  flow(el) {
    const c = el.querySelector('.widget__content');
    const items = state.flow.items || [];
    const done = items.filter(i => i.done).length;
    c.querySelector('.widget__progress-text').textContent = `${done} / ${items.length}`;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    c.querySelector('.widget__progress-fill').style.width = pct + '%';
    // Mini day-strip: today's planned blocks, 8:00 to 22:00, read-only.
    try {
      const today = getTodayISO();
      const blocks = (Array.isArray(state.timeblocks) ? state.timeblocks : []).filter(b => b && b.day === today);
      let strip = c.querySelector('.flow-ministrip');
      if (!blocks.length) { if (strip) strip.remove(); return; }
      const COLORS = { onething: 'var(--accent)', focus: 'var(--color-deepwork)', vivere: 'var(--color-vivere)', review: 'var(--color-clarity)', break: 'rgba(var(--ink),0.4)' };
      const lo = 8 * 60, hi = 22 * 60, span = hi - lo;
      const mins = (t) => { const pp = String(t || '0:0').split(':'); return (parseInt(pp[0], 10) || 0) * 60 + (parseInt(pp[1], 10) || 0); };
      let segs = '';
      blocks.forEach(b => {
        const a = Math.max(lo, mins(b.start)), z = Math.min(hi, mins(b.start) + (b.durMin || 60));
        if (z <= a) return;
        segs += '<span style="position:absolute;top:0;bottom:0;left:' + (((a - lo) / span) * 100).toFixed(2) + '%;width:' + (((z - a) / span) * 100).toFixed(2) + '%;border-radius:2px;background:' + (COLORS[b.type] || 'rgba(var(--ink),0.4)') + ';opacity:0.85;"></span>';
      });
      const now = new Date(); const nm = now.getHours() * 60 + now.getMinutes();
      const nowMark = (nm >= lo && nm <= hi) ? '<span style="position:absolute;top:-2px;bottom:-2px;width:1.5px;background:rgba(255,107,107,0.9);left:' + (((nm - lo) / span) * 100).toFixed(2) + '%;"></span>' : '';
      if (!strip) {
        strip = document.createElement('div');
        strip.className = 'flow-ministrip';
        strip.style.cssText = 'position:relative;height:8px;margin-top:10px;border-radius:3px;background:var(--kfill-05);overflow:visible;';
        c.appendChild(strip);
      }
      strip.innerHTML = segs + nowMark;
    } catch (e) {}
  },

  mori(el) {
    const c = el.querySelector('.widget__content');
    const numEl = c.querySelector('.widget__big-num');
    const unitEl = c.querySelector('.widget__big-unit');
    if (state.mori.birthYear) {
      const left = moriYearsRemaining(state.mori.birthYear, state.mori.lifeExpectancy);
      numEl.textContent = Math.round(left * 365.25).toLocaleString();
      if (unitEl) unitEl.textContent = 'days left';
    } else {
      numEl.textContent = '--';
      if (unitEl) unitEl.textContent = 'Set your birth year';
    }
  },

  photo(el) {
    try {
      const face = el.querySelector('#photoTileFace');
      const inp = el.querySelector('#photoTileInput');
      if (!face) return;
      const id = state.prefs && state.prefs.photoTile;
      if (id && /^idb:/.test(id) && typeof idbGetBlobURL === 'function') {
        idbGetBlobURL(id.slice(4)).then((url) => {
          if (url) { face.classList.add('widget__photo--set'); face.style.backgroundImage = 'url(' + url + ')'; face.innerHTML = ''; }
        }).catch(() => {});
      }
      if (inp && !inp._photoBound) {
        inp._photoBound = true;
        inp.addEventListener('click', (e) => e.stopPropagation());
        inp.addEventListener('change', () => {
          const file = inp.files && inp.files[0];
          if (!file || typeof vivDownscaleImage !== 'function' || typeof idbStore !== 'function') return;
          // vivDownscaleImage is CALLBACK-based (v695 fix: treating it as a
          // promise made the upload a silent no-op, Malik saw nothing).
          vivDownscaleImage(file, 900, (dataURL, w, h) => {
            if (!dataURL) return;
            idbStore(dataURL, w, h).then((newId) => {
              if (!newId) return;
              state.prefs = state.prefs || {};
              state.prefs.photoTile = 'idb:' + newId;
              persistNow();
              const live = document.querySelector('.widget[data-widget="photo"]') || el;
              RENDERERS.photo(live);
            });
          });
        });
      }
    } catch (e) {}
  },

  vivere(el) {
    try {
      const today = vivEnsureToday();
      const catEl = el.querySelector('#vivWidgetCat');
      const promptEl = el.querySelector('#vivWidgetPrompt');
      const statusEl = el.querySelector('#vivWidgetStatus');
      if (!today) return;
      const catLabel = VIVERE_CAT_LABELS[today.category] || 'Today';
      if (catEl) catEl.textContent = today.done ? 'Lived today' : (catLabel + ' · today');
      if (promptEl) promptEl.textContent = today.prompt || 'Remember what makes life worth it';
      if (statusEl) {
        const memCount = (state.vivere && state.vivere.memories || []).length;
        statusEl.textContent = today.done
          ? 'Kept. ' + (memCount ? (memCount + ' moment' + (memCount === 1 ? '' : 's') + ' in the jar') : 'One moment worth keeping')
          : 'Tap to live it';
      }
    } catch (e) {}
  },

  lifestats(el) {
    const c = el.querySelector('.widget__content');
    const ls = state.lifestats;
    const sleepFill = c.querySelector('.stat-bar__fill--sleep');
    const dietFill = c.querySelector('.stat-bar__fill--diet');
    const exerciseFill = c.querySelector('.stat-bar__fill--exercise');
    if (sleepFill) sleepFill.style.width = (ls.sleep / 5 * 100) + '%';
    if (dietFill) dietFill.style.width = (ls.diet / 5 * 100) + '%';
    if (exerciseFill) exerciseFill.style.width = (ls.exercise / 5 * 100) + '%';
  },

  deepwork(el) {
    const c = el.querySelector('.widget__content');
    const sessions = state.deepwork.sessions || [];
    const isFullWidth = el.classList.contains('widget--full');
    if (isFullWidth) {
      const minutes = Math.max(state.clarity.answers.dailyTime || 60, 15);
      let html = `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-deepwork)">${ICONS.deepwork}</div><div class="widget__label" style="color:var(--color-deepwork)">Deep Work</div></div><div class="widget__arrow">›</div></div>`;
      html += `<div class="widget__big-num" style="font-size:2rem;color:var(--color-deepwork);text-shadow:0 0 15px rgba(255,159,10,0.3)">${sessions.length}</div>`;
      html += `<div class="widget__big-unit">${sessions.length === 1 ? 'session' : 'sessions'} completed</div>`;
      html += `<div class="widget__secondary" style="margin-top:6px">Timer: ${minutes} min · Tap to start</div>`;
      c.innerHTML = html;
    } else {
      const countEl = c.querySelector('#dwWidgetCount');
      if (countEl) countEl.textContent = sessions.length;
      const timerEl = c.querySelector('#dwWidgetTimer');
      if (timerEl) timerEl.textContent = sessions.length ? 'Tap to start' : 'Tap to start your first block';
    }
  },

  reflection(el) {
    const c = el.querySelector('.widget__content');
    const entries = state.reflection.entries || [];
    // Newest by iso/updated (push order diverges after edits or capping), with a
    // guarded text accessor so an image-only or text-less note never throws.
    const latest = entries.slice().sort((a, b) => (((b && b.iso) || '') + '').localeCompare(((a && a.iso) || '') + '') || (((b && b.updated) || 0) - ((a && a.updated) || 0)))[0] || {};
    const latestText = (latest && latest.text) || '';
    // Two render paths:
    // - Desktop/tablet: tall document style with notepad lines
    // - Mobile: compact title/subtitle (the doc is hidden via CSS)
    const topRow = `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-reflection)">${ICONS.reflection}</div><div class="widget__label" style="color:var(--color-reflection)">Notes</div></div><div class="widget__arrow">›</div></div>`;
    let body = '';
    const compact = entries.length
      ? `<div class="dash-reflection__compact"><div class="dash-reflection__compact-title">${esc((latestText || 'Untitled note').slice(0, 40))}${latestText.length > 40 ? '…' : ''}</div><div class="dash-reflection__compact-sub">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</div></div>`
      : `<div class="dash-reflection__compact"><div class="dash-reflection__compact-title">Write a reflection</div><div class="dash-reflection__compact-sub">Tap to journal your thoughts</div></div>`;
    if (entries.length) {
      const last = latest;
      const preview = latestText.slice(0, 280);
      body = compact + `
        <div class="dash-reflection__doc">
          <div class="dash-reflection__date">${esc(last.date || '')} · entry ${entries.length}</div>
          <div class="dash-reflection__excerpt">${esc(preview)}${latestText.length > 280 ? '…' : ''}</div>
        </div>
        <div class="dash-reflection__footer">
          <div class="dash-reflection__count">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} total</div>
          <button class="dash-reflection__cta" type="button">New entry <span aria-hidden="true">→</span></button>
        </div>
      `;
    } else {
      body = compact + `
        <div class="dash-reflection__doc dash-reflection__doc--empty">
          <div class="dash-reflection__empty-line">Today I am ...</div>
          <div class="dash-reflection__empty-line"></div>
          <div class="dash-reflection__empty-line">What is actually on your mind?</div>
          <div class="dash-reflection__empty-line"></div>
          <div class="dash-reflection__empty-hint">No filter. Just the truth, for you.</div>
        </div>
        <div class="dash-reflection__footer">
          <button class="dash-reflection__cta" type="button">Start writing <span aria-hidden="true">→</span></button>
        </div>
      `;
    }
    c.innerHTML = topRow + body;
    const ctaBtn = c.querySelector('.dash-reflection__cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection');
      });
    }
  },

  distraction(el) {
    const c = el.querySelector('.widget__content');
    const logs = state.distraction.logs || [];
    const todayLogs = logs.filter(l => l.date === getTodayISO());
    const isFullWidth = el.classList.contains('widget--full');

    if (isFullWidth) {
      let html = `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-distraction)">${ICONS.distraction}</div><div class="widget__label" style="color:var(--color-distraction)">Friction</div></div><div class="widget__arrow">›</div></div>`;
      if (todayLogs.length) {
        html += `<div class="widget__big-num" style="color:var(--color-distraction)">${todayLogs.length}</div>`;
        html += `<div class="widget__subtitle">distractions today · ${logs.length} total</div>`;
        // Top category
        const cats = {};
        logs.forEach(l => { cats[l.category] = (cats[l.category] || 0) + 1; });
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
        if (top) html += `<div class="widget__subtitle" style="color:var(--color-distraction); opacity:0.7; margin-top:4px;">Top: ${esc(top[0])} (${top[1]}×)</div>`;
      } else {
        html += `<div class="widget__title">Nothing logged yet</div>`;
        html += `<div class="widget__subtitle">When something pulls you away, tap here and name it. Awareness is the first win.</div>`;
      }
      c.innerHTML = html;
    } else {
      let html = `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-distraction)">${ICONS.distraction}</div><div class="widget__label" style="color:var(--color-distraction)">Friction</div></div></div>`;
      html += `<div class="widget__big-num" style="color:var(--color-distraction)">${todayLogs.length}</div>`;
      html += `<div class="widget__big-unit">today</div>`;
      if (logs.length) {
        const cats = {};
        logs.forEach(l => { cats[l.category] = (cats[l.category] || 0) + 1; });
        const top = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
        if (top) html += `<div class="widget__subtitle" style="font-size:0.6875rem;color:var(--text-3);margin-top:4px;">Top: ${esc(top[0])}</div>`;
      }
      c.innerHTML = html;
    }
  },

  checkin(el) {
    const c = el.querySelector('.widget__content');
    const today = getTodayISO();
    const list = Array.isArray(state.checkins) ? state.checkins : [];
    const entry = list.find(x => x && x.iso === today);
    const MOOD_LABELS = { 1: 'Rough', 2: 'Low', 3: 'Okay', 4: 'Good', 5: 'Strong' };
    const topRow = `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-lifestats)">${ICONS.checkin}</div><div class="widget__label" style="color:var(--color-lifestats)">Check-in</div></div><div class="widget__arrow">›</div></div>`;
    let body = '';
    if (entry) {
      body += `<div class="widget__title">${MOOD_LABELS[entry.mood] || 'Checked in'}</div>`;
      body += `<div class="widget__subtitle">${entry.blocker ? esc(entry.blocker) : `Energy ${entry.energy || 0} of 5 · checked in today`}</div>`;
    } else {
      body += `<div class="widget__title">How are you today?</div>`;
      body += `<div class="widget__subtitle">Not yet today</div>`;
    }
    // Streak-light week strip: which of the last 7 days have a check-in.
    const days = new Set(list.map(x => x && x.iso));
    let dots = '', n = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = localISO(d);
      const on = days.has(iso);
      if (on) n++;
      dots += `<div class="widget__streak-dot ${on ? 'widget__streak-dot--active' : ''}"></div>`;
    }
    body += `<div class="widget__streak-dots" style="margin-top:auto;">${dots}</div>`;
    body += `<div class="widget__secondary" style="margin-top:6px;">${n} check-in${n === 1 ? '' : 's'} this week</div>`;
    c.innerHTML = topRow + body;
  }
};

/* ============================================
   UNLOCK LADDER (v23 progressive disclosure)
   ============================================ */
// Single source of truth for module gating. The ladder is data: an ordered
// list of earnable modules, each with a behavioral trigger, an earn-condition
// line (shown instead of a padlock), and the two lines of the unlock moment.
// Rules: Mori + Clarity are day-1; Action is visible day 1 but inert until the
// goal is saved (and then unlocks in the same session, no queue); everything
// else fires at most ONE unlock per day, overflow queued for the next session.
// Escape hatches: prefs.unlockAll (Settings + More-sheet footer), dev.previewAll
// (demo / cheat bar), and grandfathering (any module with real data is open).
const LADDER_ORDER = ['action', 'streak', 'reflection', 'checkin', 'vivere'];
const LADDER_INFO = {
  action:       { condition: 'Define your goal first', why: 'Goal locked in. A goal needs a move.', what: 'Action: one high-leverage move a day.' },
  streak:       { condition: 'Unlocks after your first completed action', why: 'Day 1 is on the board.', what: 'Consistency: your days, kept visible.' },
  reflection:   { condition: 'Unlocks after 3 completed actions', why: 'Three moves in.', what: 'Notes: a place to think.' },
  checkin:      { condition: 'Unlocks after 5 actions within a week', why: 'You showed up 5 times this week.', what: 'Check-in: a daily pulse on mood and energy.' },
  vivere:       { condition: 'Unlocks after your first check-in', why: 'You checked in. Time to zoom out.', what: 'Memento Vivere: the life side of the ledger.' }
};
// Grandfathering: a module with real user data is never hidden behind the
// ladder (existing users keep everything they have touched).
function moduleHasData(key) {
  try {
    switch (key) {
      case 'action': return !!((state.action && Array.isArray(state.action.completionHistory) && state.action.completionHistory.length) || (state.action && state.action.planGenerated));
      case 'streak': return !!((state.streak && Array.isArray(state.streak.history) && state.streak.history.length) || (state.streak && state.streak.count > 0));
      case 'reflection': return !!(state.reflection && Array.isArray(state.reflection.entries) && state.reflection.entries.length);
      case 'checkin': return !!(Array.isArray(state.checkins) && state.checkins.length);
      case 'vivere': {
        const v = state.vivere || {};
        const boards = [].concat(v.canvas ? [v.canvas] : [], Array.isArray(v.boards) ? v.boards : []);
        return !!((Array.isArray(v.memories) && v.memories.length) || (Array.isArray(v.aliveList) && v.aliveList.length) || boards.some(b => b && Array.isArray(b.cards) && b.cards.length));
      }
      case 'weeklyreview': return !!(state.vivere && Array.isArray(state.vivere.weeklyReviews) && state.vivere.weeklyReviews.length);
      case 'lifestats': return !!(state.lifestats && Array.isArray(state.lifestats.history) && state.lifestats.history.length);
      case 'deepwork': return !!(state.deepwork && Array.isArray(state.deepwork.sessions) && state.deepwork.sessions.length);
      case 'distraction': return !!(state.distraction && Array.isArray(state.distraction.logs) && state.distraction.logs.length);
      default: return false;
    }
  } catch (e) { return false; }
}
// The behavioral trigger for each earnable module.
function _ladderEligible(key) {
  try {
    const comps = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
    const compDays = (() => {
      const set = {};
      // Bucket by LOCAL day (completionHistory stores full ISO timestamps; a raw
      // .slice(0,10) is the UTC day and mis-times this unlock for evening US users).
      comps.forEach(c => { const d = c && c.date && ((typeof isoToLocalDay === 'function') ? isoToLocalDay(c.date) : String(c.date).slice(0, 10)); if (d) set[d] = true; });
      return Object.keys(set).map(d => Math.floor(Date.parse(d + 'T00:00:00Z') / 86400000)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    })();
    switch (key) {
      case 'action': return !!(state.clarity && state.clarity.completed);
      case 'streak': return comps.length >= 1;
      case 'reflection': return comps.length >= 3;
      case 'checkin': {
        // 5 completion days within any rolling 7-day window (grace for streaks).
        for (let i = 0; i < compDays.length; i++) {
          let count = 0;
          for (let j = i; j < compDays.length && compDays[j] <= compDays[i] + 6; j++) count++;
          if (count >= 5) return true;
        }
        return false;
      }
      case 'vivere': return !!((Array.isArray(state.checkins) && state.checkins.length >= 1) || (state.mori && state.mori.auditDone));
      case 'weeklyreview': return !!(Array.isArray(state.checkins) && state.checkins.length >= 2);
      default: return false;
    }
  } catch (e) { return false; }
}
// Brand-new user: no goal yet, no module data anywhere, no dev overrides.
// The dashboard stays a single welcome hero until Clarity completes; the
// unlock ladder takes over from there.
function isBrandNewUser() {
  try {
    // v816 (overnight flow walk): anyone who FINISHED onboarding is not brand
    // new, full stop. The old birth-year key meant a user who skipped the
    // birthday question landed on an empty home with NO card, seconds after
    // "Meet Your Memento" literally introduced the card. Onboarded = the
    // blank card + Start box, always.
    if (state.profile && state.profile.onboarded) return false;
    if (state.meta && state.meta.onboarded) return false;
    if ((state.prefs && state.prefs.unlockAll) || (state.dev && state.dev.previewAll)) return false;
    if (state.clarity && state.clarity.completed) return false;
    if (state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) return false;
    // Mori is a day-1 anchor outside the ladder: a user who set their birth
    // year (or finished the life audit) has data and must see their card.
    if (state.mori && (state.mori.birthYear || state.mori.auditDone)) return false;
    return !LADDER_ORDER.some(k => { try { return moduleHasData(k); } catch (e) { return false; } });
  } catch (e) { return false; }
}
function isModuleUnlocked(key) {
  try {
    if (state.prefs && state.prefs.unlockAll) return true;
    if (state.dev && state.dev.previewAll) return true;
    // Day-1 anchors, plus 'energy' (legacy alias used by old callers).
    if (key === 'clarity' || key === 'mori' || key === 'energy') return true;
    // Anything outside the ladder (retired modules, utility surfaces) is never
    // gated; it just lives in the More space instead of the dashboard.
    if (LADDER_ORDER.indexOf(key) === -1) return true;
    if (state.ui && state.ui.unlocked && state.ui.unlocked[key]) return true;
    // The has-data shortcut is suspended after a fresh-start relock, so a
    // reverted Clarity shows a genuine day-one dashboard even with old data.
    if (moduleHasData(key) && !(state.dev && state.dev.relocked)) return true;
    // Action unlocks the moment the goal is saved (same session, no queue).
    if (key === 'action') return !!(state.clarity && state.clarity.completed);
    return false;
  } catch (e) { return true; }
}
// The single locked module the UI may tease (one step ahead, never two).
function nextLockedModule() {
  try {
    if ((state.prefs && state.prefs.unlockAll) || (state.dev && state.dev.previewAll)) return null;
    for (let i = 0; i < LADDER_ORDER.length; i++) {
      if (!isModuleUnlocked(LADDER_ORDER[i])) return LADDER_ORDER[i];
    }
    return null;
  } catch (e) { return null; }
}
// Re-evaluate triggers (called from the writeProofEvent chokepoint and on
// boot). Eligible-but-locked modules join the queue; at most one fires per day.
function evaluateUnlockLadder() {
  try {
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return;
    if ((state.prefs && state.prefs.unlockAll) || (state.dev && state.dev.previewAll)) return;
    if (!state.ui || typeof state.ui !== 'object') state.ui = {};
    if (!state.ui.unlocked || typeof state.ui.unlocked !== 'object') state.ui.unlocked = {};
    if (!Array.isArray(state.ui.unlockQueue)) state.ui.unlockQueue = [];
    const un = state.ui.unlocked;
    // Action: same-session unlock, bypasses the one-per-day queue entirely.
    if (!un.action && state.clarity && state.clarity.completed) un.action = Date.now();
    LADDER_ORDER.forEach(key => {
      if (key === 'action') return;
      if (un[key] || moduleHasData(key)) return;
      if (state.ui.unlockQueue.indexOf(key) !== -1) return;
      if (_ladderEligible(key)) state.ui.unlockQueue.push(key);
    });
    maybeFireQueuedUnlock();
  } catch (e) {}
}
// Fire the next queued unlock: stamp unlockedAt, place the widget, and mark it
// for the inline materialization moment (shimmer pass, why + what, Open/Later).
function maybeFireQueuedUnlock() {
  try {
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return;
    if ((state.prefs && state.prefs.unlockAll) || (state.dev && state.dev.previewAll)) return;
    if (!state.ui || !Array.isArray(state.ui.unlockQueue) || !state.ui.unlockQueue.length) return;
    const today = getTodayISO();
    if (state.ui.lastUnlockISO === today) return; // ONE unlock per day
    // A reveal left from a previous day has had its moment; clear it so the
    // queue can advance on this fresh session.
    if (state.ui.pendingReveal && state.ui.lastUnlockISO !== today) state.ui.pendingReveal = '';
    if (state.ui.pendingReveal) return;
    const key = state.ui.unlockQueue.shift();
    if (!key) return;
    if (!state.ui.unlocked || typeof state.ui.unlocked !== 'object') state.ui.unlocked = {};
    state.ui.unlocked[key] = Date.now();
    state.ui.lastUnlockISO = today;
    const def = WIDGET_DEFS[key];
    if (def && !def.synthetic) {
      if (Array.isArray(state.widgetOrder) && !state.widgetOrder.find(w => w.key === key)) {
        state.widgetOrder.push({ key, size: def.defaultSize || 'half' });
      }
      state.ui.pendingReveal = key;
    }
    persistNow();
    try { if (typeof renderGrid === 'function') renderGrid(); if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  } catch (e) {}
}

function unlockModules() {
  // Remove start-here badge and comet from Clarity
  const clarityWidget = document.querySelector('.widget--start-here');
  if (clarityWidget) clarityWidget.classList.remove('widget--start-here');
  const clarityCard = document.querySelector('.widget--clarity');
  if (clarityCard) clarityCard.classList.add('clarity-done');

  // Only unlock the action module for now
  const actionWidget = document.querySelector('.widget--action');
  if (actionWidget && actionWidget.classList.contains('widget--locked')) {
    actionWidget.classList.remove('widget--locked');
    actionWidget.classList.add('action-pop', 'action-unlocked');
    actionWidget.style.pointerEvents = '';
    actionWidget.addEventListener('animationend', () => {
      actionWidget.classList.remove('action-pop');
    }, { once: true });
  }

  // Other modules stay locked for now - they unlock as user progresses
  const locked = [...document.querySelectorAll('.widget--locked')];
  locked.forEach((el, i) => {
    // Keep them locked but don't do anything
  });
}

/* ============================================
   DYNAMIC GRID RENDERING
   ============================================ */
function renderGrid() {
  const grid = document.getElementById('widgetGrid');
  grid.innerHTML = '';

  // Neutron Star bloom: dashboard lights up once the user has locked in their star.
  // BUT the unlock cinema owns this flag while it runs, and while the once-ever
  // evolution is still PENDING (just ignited, not yet played) the card must land
  // BLANK, otherwise the home flashes a colored card for the beat before the
  // cinema snaps it dark (v679). The cinema itself lights ns-bloom at the fill.
  const hasNeutronStar = !!(state.clarity && state.clarity.answers && state.clarity.answers.neutronStar);
  let _evoOwnsBloom = false;
  try {
    const _reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const _pending = !_reduced && !!(state.clarity && state.clarity.completed && state.clarity.ignitedAt) &&
      !(state.meta && state.meta.cardEvolutionSeen);
    _evoOwnsBloom = (typeof _cardEvolutionRunning !== 'undefined' && _cardEvolutionRunning) || _pending;
    if (_pending && !(typeof _cardEvolutionRunning !== 'undefined' && _cardEvolutionRunning)) {
      document.body.classList.remove('ns-bloom');
      // v818 (Malik: "the cinematic doesn't move to the 100% same spot" on
      // desktop, confirmed by measurement): stripping ns-bloom here dropped
      // the whole DESKTOP EDITORIAL layout (gated on ns-bloom), so the card
      // popped to the pre-clarity 320x440 geometry mid-flow, then snapped
      // back at the fill. evo-pending keeps the editorial grid + card tokens
      // holding through the blank beat; color still stays off (ns-bloom).
      document.body.classList.add('evo-pending');
    }
  } catch (e) {}
  if (!_evoOwnsBloom) {
    document.body.classList.toggle('ns-bloom', hasNeutronStar);
    document.body.classList.remove('evo-pending');
  }

  // Paywall lock: once Clarity is done but they have not paid, every module but
  // Clarity reads as locked on the dashboard (tapping one rises the paywall).
  let _cpwLocked = false;
  try { _cpwLocked = (typeof ClarityPaywall !== 'undefined') && ClarityPaywall.isLockedByPaywall('action'); } catch (e) {}
  document.body.classList.toggle('cpw-locked', _cpwLocked);
  let _hasPaidAccess = false;
  try { _hasPaidAccess = (typeof ClarityPaywall !== 'undefined') && ClarityPaywall.isPaid(); } catch (e) {}
  document.body.classList.toggle('memento-paid', _hasPaidAccess);

  // v27 bento opt-out flag (kept current above the early returns so a stale
  // has-custom-layout can never linger on brand-new / pre-clarity renders).
  // v1106b: the custom-layout opt-out is DESKTOP ONLY. On a phone or tablet
  // the page-1 law has no exceptions (Malik: the Memento big, the box at the
  // bottom, on ALL mobile views). A saved layoutCustomized flag from the old
  // v19 feature was silently exempting the whole home from every layout rule
  // on any device whose state carried it, across relaunches, immune to fixes.
  const _customized = !!(state.ui && state.ui.layoutCustomized) && window.innerWidth >= 1024;
  document.body.classList.toggle('has-custom-layout', _customized);

  // Pre-star home is LOCKED SOLID (Malik): no scroll, no rubber-band, and the
  // bar cannot linger from a stale state (a cheat-bar reset flips
  // clarity.completed without a reload; the bar must vanish on the very next
  // render, not the next boot). body.home-locked drives the CSS scroll lock.
  const _hasRealStar = !!(state.clarity && state.clarity.completed &&
    state.clarity.answers && String(state.clarity.answers.neutronStar || '').trim());
  const _lockedHome = isBrandNewUser() || !_hasRealStar;
  document.body.classList.toggle('home-locked', _lockedHome);
  // v703: the locked pre-star home keeps the bar too (Today + You only, the
  // prestar mode inside TabBar.show), so Settings is reachable from day one.
  try { if (typeof TabBar !== 'undefined' && TabBar.show) TabBar.show(); } catch (e) {}

  // Brand-new user: the welcome hero (command center) is the whole dashboard.
  // No module cards, no More strip; everything appears as it unlocks.
  if (isBrandNewUser()) return;

  // Pre-Clarity (Malik): the dashboard is ONLY the welcome + Start-here hero.
  // No module cards at all, no More strip, no capture button (CSS keys off
  // body.pre-clarity); the journey starts when the goal exists.
  const _preClarity = !(state.clarity && state.clarity.completed);
  document.body.classList.toggle('pre-clarity', _preClarity);
  if (_preClarity) return;

  // v605 (Malik): the EVOLUTION. The first time the home is actually seen
  // after ignition, the user witnesses the card come alive: a still, drained
  // beat, then color floods the card, then the beams bloom on. Once, ever.
  try { _maybeRunCardEvolution(); } catch (e) {}
  // v973: and, once the colour reveal is behind them, a PAID user who has just
  // discovered their first move earns the platinum reward reveal. Self-gates on
  // paid + planGenerated + not-yet-seen, and stands down while the Clarity cinema
  // (or an overlay) is up, so the two never collide.
  try { _maybeRunActionEvolution(); } catch (e) {}

  // v19 Custom Layouts: when the user has customized, the grid auto-flows by
  // saved order with per-size spans (.is-custom overrides the designed data-area
  // placement) and hidden widgets are skipped. Otherwise the hand-tuned default
  // layout renders exactly as before.
  const _hidden = Array.isArray(state.hiddenWidgets) ? state.hiddenWidgets : [];
  // .is-custom on the grid pairs with body.has-custom-layout (set above): a
  // customized layout opts OUT of the card-centered bento and renders its own
  // saved grid (the bento gates itself off via :not(.has-custom-layout)).
  grid.classList.toggle('is-custom', _customized);

  state.widgetOrder.forEach(({ key, size }) => {
    if (typeof VIVERE_PARKED !== 'undefined' && VIVERE_PARKED && key === 'vivere') return; // v1119: parked
    const def = WIDGET_DEFS[key];
    if (!def) return;
    if (_hidden.indexOf(key) !== -1) return; // hidden by the user's custom layout
    // The command center at the top of the dashboard already IS the action
    // (today's one thing). Suppress the duplicate action tile in the grid so the
    // action is not shown twice. Data + module stay intact; only the second
    // render is skipped.
    // Custom-layout users who deliberately placed the Action tile keep it.
    if (key === 'action' && !(document.body && document.body.classList.contains('has-custom-layout'))) return;

    const sizeClass = size === 'full' ? 'widget--full' : 'widget--half';
    const el = document.createElement('article');
    el.className = `widget widget--${def.color} ${sizeClass} entering`;
    el.dataset.widget = key;
    el.dataset.area = key; // for CSS grid placement in Dashboard V2 layout
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    // Synthetic widgets render entirely different markup - handle them up front.
    if (def.synthetic) {
      el.classList.remove(`widget--${def.color}`);
      el.classList.add(`widget--synthetic`, `widget--${key}`);
      if (key === 'claritySphere') {
        el.innerHTML = renderClaritySphereCard();
      } else if (key === 'quickActions') {
        el.innerHTML = renderQuickActionsCard();
      } else if (key === 'resources') {
        el.innerHTML = renderResourcesCard();
      }
      // Bind handlers AFTER the element is in the DOM (handled below at the
      // grid.appendChild call). For now, attach listeners directly.
      setTimeout(() => bindSyntheticWidget(key, el), 0);
      grid.appendChild(el);
      return;
    }

    // v690 (Malik): retired tiles. The heatmap card IS consistency, and logging
    // the daily move IS the check-in; their little tiles just repeated that.
    // History still counts; only the tiles are gone.
    if (key === 'streak' || key === 'checkin') return;
    // Gate (v23 unlock ladder): locked modules do not render on the dashboard
    // at all; the single next teaser lives in the More space instead. Action is
    // the one exception: visible from day 1 as an inert gate card whose text
    // ("Define your goal first") teaches the unlock.
    const unlocked = isModuleUnlocked(key);
    if (!unlocked && key !== 'action') return;
    if (!state.clarity.completed) {
      if (key === 'clarity') {
        el.classList.add('widget--start-here');
      } else if (key === 'action' && !unlocked) {
        el.classList.add('widget--gate');
      }
    } else {
      if (key === 'clarity') {
        el.classList.add('clarity-done');
      } else if (key === 'action') {
        el.classList.add('action-unlocked');
        // The Start here pill is for users who have not engaged Action yet;
        // once a plan exists or anything was completed, the guidance retires.
        const a = state.action || {};
        if (a.planGenerated || (Array.isArray(a.completionHistory) && a.completionHistory.length)) el.classList.add('action-started');
      }
    }

    // Resize handle (.widget__corner-drag) was removed in v13. The CSS rule
    // and pointer-resize JS below are left in place but no-op without this
    // element, so we can re-enable resizing later by reinserting the div.
    let inner = `<div class="widget__glow"></div><div class="widget__content">`;

    // Standard top-row for every widget. The photo tile is the one exception:
    // pure image, zero words (v690, Malik).
    if (key !== 'photo') inner += `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-${def.color})">${def.icon}</div><div class="widget__label">${def.label}</div></div><div class="widget__arrow">›</div></div>`;

    if (key === 'photo') {
      inner += `<div class="widget__photo" id="photoTileFace"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle cx="9" cy="9.2" r="1.7"/><path d="M4.5 17.5l4.6-4.6a1.4 1.4 0 0 1 2 0l6.4 6.4M14.5 15.5l1.9-1.9a1.4 1.4 0 0 1 2 0l2.1 2.1"/></svg></div>`;
      inner += `<input type="file" id="photoTileInput" accept="image/*" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" aria-label="Choose a photo" />`;
    }

    switch (key) {
      case 'clarity':
        inner += `<div class="widget__title">Get clear on the goal</div>`;
        inner += `<div class="widget__subtitle">Find your Neutron Star</div>`;
        break;
      case 'action':
        // Stripped-down v13 layout: just one text slot. Pre-plan it shows the
        // descriptor "Find highest leveraged actions"; once the user finishes
        // the action flow it swaps in the short (2-6 word) recommended tier
        // text. While gated (ladder), the slot carries the earn condition.
        inner += `<div class="widget__subtitle" id="actionWidgetText">${unlocked ? 'Find highest leveraged actions' : 'Define your goal first'}</div>`;
        break;
      case 'streak':
        inner += `<div class="widget__big-num" style="color:var(--color-consistency);text-shadow:0 0 15px rgba(var(--success-rgb),0.3)">0</div>`;
        inner += `<div class="widget__big-unit">days</div>`;
        inner += `<div class="widget__streak-dots"></div>`;
        break;
      case 'flow':
        inner += `<div class="widget__progress-text">0 / 0</div>`;
        inner += `<div class="widget__progress-sub">steps active</div>`;
        inner += `<div class="widget__progress-bar"><div class="widget__progress-fill" style="width:0%"></div></div>`;
        break;
      case 'mori':
        // v690 (Malik): ONE number. The weeks line + reminder were word salad.
        inner += `<div class="widget__big-num" style="font-size:2rem;font-variant-numeric:tabular-nums">--</div>`;
        inner += `<div class="widget__big-unit">days left</div>`;
        break;
      case 'vivere':
        // Today's life practice at a glance. Filled by RENDERERS.vivere.
        inner += `<div class="widget__title" id="vivWidgetCat" style="font-size:0.72rem;color:var(--text-3);font-weight:600;">Today's practice</div>`;
        inner += `<div class="widget__subtitle" id="vivWidgetPrompt" style="color:var(--text-hi);font-weight:600;font-size:0.98rem;line-height:1.3;margin-top:6px;">Remember what makes life worth it</div>`;
        inner += `<div class="widget__secondary" id="vivWidgetStatus" style="margin-top:8px;color:var(--text-lo);"></div>`;
        break;
      case 'lifestats':
        inner += `<div class="widget__stats-bars">
          <div class="stat-bar"><span class="stat-bar__label">Sleep</span><div class="stat-bar__track"><div class="stat-bar__fill stat-bar__fill--sleep"></div></div></div>
          <div class="stat-bar"><span class="stat-bar__label">Movement</span><div class="stat-bar__track"><div class="stat-bar__fill stat-bar__fill--exercise"></div></div></div>
          <div class="stat-bar"><span class="stat-bar__label">Food</span><div class="stat-bar__track"><div class="stat-bar__fill stat-bar__fill--diet"></div></div></div>
        </div>`;
        break;
      case 'deepwork':
        inner += `<div class="widget__big-num" id="dwWidgetCount">0</div>`;
        inner += `<div class="widget__big-unit">sessions</div>`;
        inner += `<div class="widget__secondary" id="dwWidgetTimer"></div>`;
        break;
      case 'reflection':
        inner += `<div class="widget__title" id="refWidgetTitle">Write a reflection</div>`;
        inner += `<div class="widget__subtitle" id="refWidgetSub">Tap to journal your thoughts</div>`;
        break;
      case 'distraction':
        inner += `<div class="widget__big-num">0</div>`;
        inner += `<div class="widget__big-unit">today</div>`;
        break;
      case 'checkin':
        // Skeleton only; RENDERERS.checkin rebuilds the content.
        inner += `<div class="widget__title">How are you today?</div>`;
        inner += `<div class="widget__subtitle">Not yet today</div>`;
        break;
    }

    inner += '</div>';
    el.innerHTML = inner;

    // v23 unlock moment: inline materialization for a freshly earned module.
    // One fade/scale-in with a single shimmer pass, one line of why + what,
    // Open / Later. No confetti, no sound.
    if (state.ui && state.ui.pendingReveal === key) {
      el.classList.add('widget--materialize');
      const info = LADDER_INFO[key] || {};
      const rv = document.createElement('div');
      rv.className = 'widget__reveal';
      rv.innerHTML = '<div class="widget__reveal-why">' + esc(info.why || 'Earned.') + '</div>' +
        '<div class="widget__reveal-what">' + esc(info.what || '') + '</div>' +
        '<div class="widget__reveal-actions"><button type="button" class="widget__reveal-open">Open</button><button type="button" class="widget__reveal-later">Later</button></div>';
      el.appendChild(rv);
      const clearReveal = () => { try { state.ui.pendingReveal = ''; persistNow(); } catch (e) {} };
      const rvOpen = rv.querySelector('.widget__reveal-open');
      const rvLater = rv.querySelector('.widget__reveal-later');
      if (rvOpen) rvOpen.addEventListener('click', (e) => {
        e.stopPropagation();
        clearReveal();
        try { rv.remove(); el.classList.remove('widget--materialize'); } catch (err) {}
        try {
          if (key === 'action' && typeof ActionExperience !== 'undefined') ActionExperience.open();
          else if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open(key);
        } catch (err) {}
      });
      if (rvLater) rvLater.addEventListener('click', (e) => {
        e.stopPropagation();
        clearReveal();
        try { rv.remove(); el.classList.remove('widget--materialize'); } catch (err) {}
      });
    }

    // Action check button event
    if (key === 'action') {
      setTimeout(() => {
        const chk = el.querySelector('.widget__check');
        if (chk) chk.addEventListener('click', (e) => {
          e.stopPropagation();
          state.action.todayPlan.proofDone = !state.action.todayPlan.proofDone;
          persistState();
          renderAll();
        });
      }, 0);
    }

    // Corner drag resize
    setTimeout(() => {
      const handle = el.querySelector('.widget__corner-drag');
      if (!handle) return;
      let startX = 0, startSize = '', resized = false, widgetKey = key;
      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        startX = e.clientX;
        const idx = state.widgetOrder.findIndex(w => w.key === widgetKey);
        startSize = idx !== -1 ? state.widgetOrder[idx].size : 'half';
        resized = false;
        el.classList.add('widget--resizing');
      });
      handle.addEventListener('pointermove', (e) => {
        if (!el.classList.contains('widget--resizing')) return;
        const dx = e.clientX - startX;
        const idx = state.widgetOrder.findIndex(w => w.key === widgetKey);
        if (idx === -1) return;
        const currentSize = state.widgetOrder[idx].size;
        // Drag right → expand, drag left → shrink
        // Reset startX after each toggle so user can keep going back and forth
        if (dx > 60 && currentSize !== 'full') {
          state.widgetOrder[idx].size = 'full';
          resized = true;
          startX = e.clientX;
          resizeWithFLIP(widgetKey);
        } else if (dx < -60 && currentSize !== 'half') {
          state.widgetOrder[idx].size = 'half';
          resized = true;
          startX = e.clientX;
          resizeWithFLIP(widgetKey);
        }
      });
      handle.addEventListener('pointerup', () => {
        el.classList.remove('widget--resizing');
        if (resized) { persistNow(); renderAll(); }
      });
      handle.addEventListener('pointercancel', () => {
        el.classList.remove('widget--resizing');
        if (resized) persistNow();
      });
    }, 0);

    grid.appendChild(el);
  });

  // v23 More space: a quiet glass row at the end of the grid. The back room
  // for everything not on the dashboard (retired Energy / Deep Work / Friction
  // plus the single locked-next teaser).
  try {
    if (typeof MoreSpace !== 'undefined' && MoreSpace.entries().length) {
      const moreBtn = document.createElement('button');
      moreBtn.type = 'button';
      moreBtn.className = 'dash-more';
      moreBtn.id = 'dashMore';
      moreBtn.innerHTML = '<span class="dash-more__label">More</span><span class="dash-more__chev" aria-hidden="true">›</span>';
      moreBtn.addEventListener('click', () => { try { MoreSpace.open(); } catch (e) {} });
      grid.appendChild(moreBtn);
    }
  } catch (e) {}

  // v19 Custom Layouts: if the user hid every module, show a friendly recovery
  // affordance instead of a blank dashboard.
  if (_customized && !grid.querySelector('.widget')) {
    const ph = document.createElement('div');
    ph.className = 'grid-empty';
    ph.innerHTML = '<div class="grid-empty__t">Every module is hidden</div><div class="grid-empty__s">Open Customize dashboard to bring some back.</div><button class="grid-empty__btn" type="button">Customize dashboard</button>';
    const _b = ph.querySelector('.grid-empty__btn');
    if (_b) _b.addEventListener('click', () => { try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('layout'); } catch (_) {} });
    grid.appendChild(ph);
  }

  // Remove entering class after staggered animations complete
  setTimeout(() => {
    grid.querySelectorAll('.widget.entering').forEach(w => w.classList.remove('entering'));
  }, 1000);

  // Mobile bento: place the module tiles into fixed slots so press-and-drag can
  // reorder them (Apple-widget style) without disturbing the card/quote.
  try { applyBentoMobileOrder(); } catch (e) {}
}

/* ============================================
   MOBILE BENTO: drag-reorderable module slots
   The mobile Home bento pins the card, command center, heatmap and quote to
   fixed rows, with the module tiles slotted in between. To let the user press,
   hold and drag a module to a new spot (like Apple home-screen widgets) WITHOUT
   breaking that curated arrangement, we keep the slot positions fixed and just
   reassign which module sits in which slot, by the module's index in
   state.widgetOrder. Dragging reorders widgetOrder; modules then swap slots.
   Inline grid styles here out-specify the per-data-area CSS rules. On desktop /
   tablet / custom-layout this clears the inline styles so nothing changes there.
   ============================================ */
const BENTO_MOBILE_SLOTS = [
  { col: '1 / 7',  row: '6' }, { col: '7 / 13', row: '6' },
  { col: '1 / 7',  row: '7' }, { col: '7 / 13', row: '7' },
  { col: '1 / -1', row: '9' }, { col: '1 / -1', row: '10' }, { col: '1 / -1', row: '11' }
];
// The curated default slot order Malik arranged: Mori | Clarity, Streak | Check-in,
// then Action, Reflection, Vivere as full-width bars. A fresh user starts here;
// dragging stores a personal order in state.ui.bentoOrder (mobile only) so the
// desktop bento + custom layouts, which key off state.widgetOrder, are untouched.
const BENTO_MOBILE_DEFAULT = ['mori', 'clarity', 'streak', 'checkin', 'action', 'reflection', 'vivere'];
function isMobileBento() {
  try {
    const mobile = window.matchMedia && window.matchMedia('(max-width: 767.98px)').matches;
    return !!mobile && document.body.classList.contains('ns-bloom') && !document.body.classList.contains('has-custom-layout');
  } catch (e) { return false; }
}
// Resolve the mobile slot order: the user's saved bentoOrder if any, seeded from
// the curated default, with any present-but-unlisted tiles appended so nothing
// ever vanishes when modules unlock later.
function bentoMobileOrder() {
  const grid = document.getElementById('widgetGrid');
  const present = grid ? [...grid.querySelectorAll('.widget')].map(t => t.dataset.widget).filter(Boolean) : [];
  let saved = [];
  try { if (state.ui && Array.isArray(state.ui.bentoOrder)) saved = state.ui.bentoOrder.slice(); } catch (e) {}
  const base = saved.length ? saved : BENTO_MOBILE_DEFAULT.slice();
  const ordered = base.filter(k => present.indexOf(k) !== -1);
  present.forEach(k => { if (ordered.indexOf(k) === -1) ordered.push(k); });
  return ordered;
}
function applyBentoMobileOrder() {
  const grid = document.getElementById('widgetGrid');
  if (!grid) return;
  const tiles = [...grid.querySelectorAll('.widget')];
  if (!isMobileBento()) {
    // Off the mobile bento: strip any inline slot styles so the desktop bento,
    // tablet, and custom layouts render from their own CSS untouched.
    tiles.forEach(t => { t.style.gridColumn = ''; t.style.gridRow = ''; t.style.aspectRatio = ''; });
    return;
  }
  bentoMobileOrder().forEach((key, i) => {
    const el = grid.querySelector('[data-widget="' + key + '"]');
    if (!el) return;
    const slot = BENTO_MOBILE_SLOTS[Math.min(i, BENTO_MOBILE_SLOTS.length - 1)];
    el.style.gridColumn = slot.col;
    el.style.gridRow = slot.row;
    el.style.aspectRatio = 'auto';
  });
}
// Move a dragged module to where another sits, within the mobile slot order, and
// persist. Returns true if the order changed (so the caller can animate).
function bentoMobileReorder(sourceKey, targetKey) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return false;
  const order = bentoMobileOrder();
  const from = order.indexOf(sourceKey);
  const to = order.indexOf(targetKey);
  if (from === -1 || to === -1) return false;
  const item = order.splice(from, 1)[0];
  order.splice(to, 0, item);
  try { if (!state.ui) state.ui = {}; state.ui.bentoOrder = order; persistNow(); } catch (e) {}
  return true;
}

/* ============================================
   MORE SPACE (v23): the back room
   ============================================ */
// A heavier-frosted bottom glass sheet listing every module that is not on the
// dashboard: retired modules (Energy, Deep Work, Friction), anything the user
// hid, plus exactly ONE locked teaser (40% opacity, earn condition as caption,
// no padlock). Modules 2+ steps away in the ladder are not rendered at all.
// Unlocked cards open the module; after 3+ opens they offer "Pin to dashboard".
// The footer carries the unlock-everything escape hatch while anything is locked.
const MoreSpace = {
  MODULES: ['streak', 'mori', 'vivere', 'checkin', 'reflection', 'lifestats', 'deepwork', 'distraction'],
  DESC: {
    clarity: 'Your north star. Revisit or recalibrate.',
    action: 'The one thing that moves you today.',
    streak: 'Your days, kept visible.',
    mori: 'The clock that makes today matter.',
    vivere: 'A board for the life worth building.',
    checkin: 'A daily pulse on mood and energy.',
    reflection: 'A place to think.',
    lifestats: 'Sleep, movement, food. The fuel ledger.',
    deepwork: 'Timed focus blocks, logged.',
    distraction: 'Name what pulls you away.'
  },
  entries() {
    try {
      const teaser = nextLockedModule();
      const out = [];
      // Switcher mode (the mobile bottom-bar middle tab): a navigation surface,
      // so it lists EVERY unlocked module, including ones already on the
      // dashboard, plus the usual single locked teaser.
      if (this._mode === 'switcher') {
        // The swipe-to-modules hub. Lead with the spine: Clarity (your north
        // star) -> Action (today's one thing) -> Consistency/Mori -> then the
        // add-ons (Vivere, Check-in, Notes) below. Clarity is always open;
        // Action shows so the path is always visible (a gate rises if locked).
        ['clarity', 'action'].forEach(key => out.push({ key, locked: false }));
        this.MODULES.forEach(key => {
          if (typeof VIVERE_PARKED !== 'undefined' && VIVERE_PARKED && key === 'vivere') return;
          if (isModuleUnlocked(key)) { out.push({ key, locked: false }); return; }
          if (key === teaser && key !== 'action') out.push({ key, locked: true });
        });
        return out;
      }
      // "On the dashboard" means the card actually renders there: in the saved
      // order AND unlocked (renderGrid skips locked keys), and not user-hidden.
      const onDash = {};
      (Array.isArray(state.widgetOrder) ? state.widgetOrder : []).forEach(w => { if (w && w.key && (w.key === 'action' || isModuleUnlocked(w.key))) onDash[w.key] = true; });
      (Array.isArray(state.hiddenWidgets) ? state.hiddenWidgets : []).forEach(k => { delete onDash[k]; });
      this.MODULES.forEach(key => {
        if (typeof VIVERE_PARKED !== 'undefined' && VIVERE_PARKED && key === 'vivere') return;
        if (onDash[key]) return;
        if (isModuleUnlocked(key)) { out.push({ key, locked: false }); return; }
        if (key === teaser && key !== 'action') out.push({ key, locked: true });
      });
      return out;
    } catch (e) { return []; }
  },
  open(opts) {
    this.close(true);
    this._mode = (opts && opts.mode === 'switcher') ? 'switcher' : 'more';
    const isFull = (this._mode === 'switcher');
    const wrap = document.createElement('div');
    wrap.id = 'moreSpace';
    // Switcher mode is a full-screen Modules PAGE on mobile (more-space--full), not
    // a half-height drawer: a real screen title + close, the modules filling it.
    wrap.className = 'more-space' + (isFull ? ' more-space--full' : '');
    const header = isFull
      ? '<div class="more-space__topbar">' +
          '<span class="more-space__screentitle">Modules</span>' +
          '<button class="more-space__close" id="moreClose" type="button" aria-label="Close modules">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</div>'
      : '<div class="more-space__handle" aria-hidden="true"></div>' +
        '<div class="more-space__title">More</div>';
    wrap.innerHTML = '<div class="more-space__backdrop"></div>' +
      '<div class="more-space__sheet" role="dialog" aria-modal="true" aria-label="' + (isFull ? 'Modules' : 'More modules') + '">' +
        header +
        '<div class="more-space__grid"></div>' +
        '<div class="more-space__foot"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    wrap.querySelector('.more-space__backdrop').addEventListener('click', () => this.close());
    const _mClose = wrap.querySelector('#moreClose');
    if (_mClose) _mClose.addEventListener('click', () => this.close());
    this._esc = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._esc);

    // iOS-like swipe-down-to-dismiss. Drag down from the header (handle / title)
    // any time, or pull down once the list is already scrolled to the top; let
    // go past ~28% of the sheet height or with a downward flick to close, else
    // it springs back. Otherwise the content scrolls as normal.
    (function bindMoreSwipe() {
      const sheet = wrap.querySelector('.more-space__sheet');
      const backdrop = wrap.querySelector('.more-space__backdrop');
      if (!sheet) return;
      let startY = 0, dy = 0, t0 = 0, h = 1;
      let active = false, decided = false, engaged = false, fromHeader = false;
      const inHeader = (t) => !!(t && t.closest && t.closest('.more-space__handle, .more-space__title, .more-space__topbar'));
      sheet.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        startY = e.touches[0].clientY; dy = 0; t0 = e.timeStamp || 0;
        h = sheet.getBoundingClientRect().height || 1;
        active = true; decided = false; engaged = false; fromHeader = inHeader(e.target);
      }, { passive: true });
      sheet.addEventListener('touchmove', (e) => {
        if (!active) return;
        const y = e.touches[0].clientY - startY;
        if (!decided) {
          if (Math.abs(y) < 6) return;
          // Engage dismiss only on a downward pull from the header, or a downward
          // pull while already at the top of the scroll. Anything else scrolls.
          engaged = y > 0 && (fromHeader || sheet.scrollTop <= 0);
          decided = true;
          if (engaged) sheet.classList.add('dragging'); else { active = false; return; }
        }
        dy = Math.max(0, y);
        sheet.style.transform = 'translateY(' + dy + 'px)';
        if (backdrop) backdrop.style.opacity = String(Math.max(0, 1 - dy / (h * 0.9)));
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      const end = (e) => {
        if (!active) return;
        active = false;
        if (!engaged) return;
        const dt = ((e && e.timeStamp) || 0) - t0;
        const vel = dt > 0 ? dy / dt : 0; // downward px per ms
        const shouldClose = dy > h * 0.28 || vel > 0.55;
        sheet.classList.remove('dragging'); // re-enable the transition
        sheet.style.transform = '';
        if (backdrop) backdrop.style.opacity = '';
        if (shouldClose) MoreSpace.close(); // synchronous: animates dy -> off-screen
      };
      sheet.addEventListener('touchend', end, { passive: true });
      sheet.addEventListener('touchcancel', end, { passive: true });
    })();

    if (isFull) this._hostWidgetGrid(wrap); else this._renderInto();
    if (opts && opts.startDragged) {
      // Opened by an upward finger-drag from the home: keep the sheet hidden at the
      // bottom with NO transition and let the home drag handler drive its transform
      // 1:1 (dragMove / dragEnd below). The thumb pulls the modules up.
      var dsheet = wrap.querySelector('.more-space__sheet');
      this._dragSheet = dsheet;
      this._dragBackdrop = wrap.querySelector('.more-space__backdrop');
      this._dragH = (dsheet && dsheet.getBoundingClientRect().height) || Math.round(window.innerHeight * 0.6);
      if (dsheet) { dsheet.classList.add('dragging'); dsheet.style.transform = 'translateY(' + this._dragH + 'px)'; }
    } else {
      requestAnimationFrame(() => wrap.classList.add('open'));
    }
  },
  // ── Finger-tracked open from the home (the swipe-up-for-modules gesture) ──────
  // pull = px the thumb has travelled UP since it engaged (>= 0). The sheet rides
  // up from fully hidden so it tracks the finger 1:1.
  dragMove(pull) {
    var s = this._dragSheet; if (!s) return;
    var h = this._dragH || 1;
    var p = Math.max(0, Math.min(pull, h));
    s.style.transform = 'translateY(' + (h - p) + 'px)';
    if (this._dragBackdrop) this._dragBackdrop.style.opacity = String(Math.max(0, Math.min(1, p / h)) * 0.92);
  },
  // Commit past ~22% of the sheet height or a clear upward flick; else spring back
  // down and dismiss. velUp = upward px/ms.
  dragEnd(pull, velUp) {
    var s = this._dragSheet, b = this._dragBackdrop, h = this._dragH || 1;
    this._dragSheet = null; this._dragBackdrop = null;
    if (!s) return;
    var commit = pull > h * 0.22 || velUp > 0.5;
    s.classList.remove('dragging');   // re-enable the CSS transition for the snap
    if (commit) {
      var w = document.getElementById('moreSpace');
      if (w) w.classList.add('open'); // settle fully open (transform -> 0)
      s.style.transform = '';
      if (b) b.style.opacity = '';
    } else {
      s.style.transform = '';         // -> resting translateY(100%): animate back down
      if (b) b.style.opacity = '';
      this.close();
    }
  },
  // Full-screen Modules page: host the LIVE module widgets (the rich bento cards
  // with real data, the v25 "Apple-like" feel) instead of generic launcher tiles.
  // The widget grid is hidden on the minimal home, so borrowing it costs the home
  // nothing; _restoreWidgetGrid() puts it back on close.
  _hostWidgetGrid(wrap) {
    try {
      var grid = document.getElementById('widgetGrid');
      var sheet = wrap.querySelector('.more-space__sheet');
      var slot = wrap.querySelector('.more-space__grid');
      if (!grid || !sheet) { this._renderInto(); return; }
      this._wgHome = grid.parentNode;
      this._wgNext = grid.nextSibling;
      if (slot && slot.parentNode === sheet) sheet.insertBefore(grid, slot);
      else sheet.appendChild(grid);
      if (slot) slot.style.display = 'none';
      var foot = wrap.querySelector('.more-space__foot');
      if (foot) foot.style.display = 'none';
      wrap.classList.add('more-space--widgets');
    } catch (e) { try { this._renderInto(); } catch (x) {} }
  },
  _restoreWidgetGrid() {
    try {
      var grid = document.getElementById('widgetGrid');
      if (grid && this._wgHome) {
        if (this._wgNext && this._wgNext.parentNode === this._wgHome) this._wgHome.insertBefore(grid, this._wgNext);
        else this._wgHome.appendChild(grid);
      }
    } catch (e) {}
    this._wgHome = null; this._wgNext = null;
  },
  close(instant) {
    if (this._esc) { document.removeEventListener('keydown', this._esc); this._esc = null; }
    const w = document.getElementById('moreSpace');
    if (!w) { this._restoreWidgetGrid(); return; }
    if (instant) { this._restoreWidgetGrid(); try { w.remove(); } catch (e) {} return; }
    w.classList.remove('open');
    setTimeout(() => { this._restoreWidgetGrid(); try { w.remove(); } catch (e) {} }, 300);
  },
  _openModule(key) {
    this.close();
    try {
      if (key === 'clarity' && typeof ClarityExperience !== 'undefined') {
        (state.clarity && state.clarity.completed && ClarityExperience.openSummary) ? ClarityExperience.openSummary() : ClarityExperience.open();
      } else if (key === 'action' && typeof ActionExperience !== 'undefined') {
        ActionExperience.open();
      } else if (typeof Sheet !== 'undefined' && Sheet.open) {
        Sheet.open(key);
      }
    } catch (e) {}
  },
  _pin(key) {
    try {
      const def = WIDGET_DEFS[key];
      if (!def || def.synthetic) return;
      if (!Array.isArray(state.widgetOrder)) state.widgetOrder = [];
      if (!state.widgetOrder.find(w => w.key === key)) {
        state.widgetOrder.push({ key, size: def.defaultSize || 'half' });
      }
      if (Array.isArray(state.hiddenWidgets)) {
        const hi = state.hiddenWidgets.indexOf(key);
        if (hi >= 0) state.hiddenWidgets.splice(hi, 1);
      }
      persistNow();
      try { renderGrid(); renderAll(); } catch (e) {}
    } catch (e) {}
    this._renderInto();
  },
  _renderInto() {
    const wrap = document.getElementById('moreSpace');
    if (!wrap) return;
    const gridEl = wrap.querySelector('.more-space__grid');
    const foot = wrap.querySelector('.more-space__foot');
    const entries = this.entries();
    let html = '';
    entries.forEach(en => {
      const def = WIDGET_DEFS[en.key] || {};
      const info = LADDER_INFO[en.key] || {};
      const opens = (state.ui && state.ui.moduleOpens && state.ui.moduleOpens[en.key]) || 0;
      // v27: these four are deliberately not placed on the bento Home, so pinning
      // them would do nothing visible. Don't offer the pin for them.
      const _bentoHidden = (en.key === 'lifestats' || en.key === 'deepwork' || en.key === 'flow' || en.key === 'distraction');
      const canPin = this._mode !== 'switcher' && !en.locked && def && !def.synthetic && opens >= 3 && !_bentoHidden;
      html += '<div class="more-card' + (en.locked ? ' more-card--locked' : '') + '" data-more-key="' + en.key + '" role="button" tabindex="0">' +
        '<div class="more-card__icon">' + (def.icon || '') + '</div>' +
        '<div class="more-card__name">' + esc(def.label || en.key) + '</div>' +
        '<div class="more-card__desc">' + esc(en.locked ? (info.condition || '') : (this.DESC[en.key] || '')) + '</div>' +
        (canPin ? '<button type="button" class="more-card__pin" data-more-pin="' + en.key + '">Pin to dashboard</button>' : '') +
        '</div>';
    });
    if (!entries.length) html = '<div class="more-space__empty">Everything lives on your dashboard right now.</div>';
    gridEl.innerHTML = html;
    // v800 sweep: the ladder's "Unlock everything" is a PAID-user affordance
    // (it skips the module-noise reveal pacing). Free users never see it; the
    // flag it flips must never stand in for payment.
    let _paidHere = false;
    try { _paidHere = (typeof ClarityPaywall !== 'undefined') && ClarityPaywall.isPaid(); } catch (e) {}
    const anyLocked = !!nextLockedModule() && _paidHere;
    foot.innerHTML = anyLocked ? '<button type="button" class="more-space__unlock" id="moreUnlockAll">I know what I&rsquo;m doing. Unlock everything.</button>' : '';
    const self = this;
    gridEl.querySelectorAll('[data-more-key]').forEach(card => {
      const fire = (e) => {
        if (e && e.target && e.target.closest('[data-more-pin]')) return;
        const key = card.getAttribute('data-more-key');
        const en = entries.find(x => x.key === key);
        if (en && en.locked) {
          // Locked-next tap: expand in place, restate what it is + the
          // condition. No nag, no upsell.
          if (!card.querySelector('.more-card__expand')) {
            const info2 = LADDER_INFO[key] || {};
            const ex = document.createElement('div');
            ex.className = 'more-card__expand';
            ex.textContent = (info2.what || '') + (info2.condition ? (' ' + info2.condition + '.') : '');
            card.appendChild(ex);
          }
          return;
        }
        self._openModule(key);
      };
      card.addEventListener('click', fire);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(e); } });
    });
    gridEl.querySelectorAll('[data-more-pin]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      self._pin(b.getAttribute('data-more-pin'));
    }));
    const ua = foot.querySelector('#moreUnlockAll');
    if (ua) ua.addEventListener('click', () => {
      foot.innerHTML = '<div class="more-space__confirm"><span>All of it at once can be noise. Unlock anyway?</span>' +
        '<button type="button" id="moreUnlockYes">Unlock all</button>' +
        '<button type="button" id="moreUnlockNo">Keep the path</button></div>';
      const yes = foot.querySelector('#moreUnlockYes');
      const no = foot.querySelector('#moreUnlockNo');
      if (yes) yes.addEventListener('click', () => {
        try {
          if (!state.prefs) state.prefs = {};
          state.prefs.unlockAll = true;
          if (state.ui) { state.ui.unlockQueue = []; state.ui.pendingReveal = ''; }
          persistNow();
          renderGrid(); renderAll();
        } catch (e) {}
        self._renderInto();
      });
      if (no) no.addEventListener('click', () => self._renderInto());
    });
  }
};

function renderGreeting() {
  const now = new Date();
  // v1042 (Malik): no time-of-day greeting anywhere. This function now only
  // renders the date lines (mobile whisper bar, desktop header) and the
  // headline; the name and the "Good evening," half are gone.
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  // Mobile slot: same greeting, rendered below the Memento card (the header
  // shows the brand lockup there instead; CSS swaps the two at <860px).
  // Search rides along: the dashboard page gets its own search button on
  // the greeting row (the header one is hidden on mobile); it just proxies
  // the real #hubSearch so all Spotlight wiring stays in one place.
  // Memento Mori belongs to the paid experience. Before payment, both headers
  // show the date only and expose no hidden weeks-left interaction.
  let weeksLeft = null;
  try {
    const paid = (typeof ClarityPaywall !== 'undefined') && ClarityPaywall.isPaid();
    const by = paid && state.mori && state.mori.birthYear;
    if (by && typeof moriWeeksLived === 'function' && typeof moriTotalWeeks === 'function') {
      const lived = moriWeeksLived(by);
      // A future/typo birthYear yields negative weeks-lived and would print an
      // absurd inflated count; omit the line then (matches the share card guard).
      if (lived >= 0) {
        const le = (state.mori && state.mori.lifeExpectancy) || 80;
        weeksLeft = Math.max(0, moriTotalWeeks(le) - lived);
      }
    }
  } catch (e) {}
  const mg = document.getElementById('dashGreetingMobile');
  if (mg) {
    // Whisper bar (v709, Malik): "July 12, 2026", pinned top-right. Tapping it
    // swaps the date for the weeks you have left to live for a few seconds,
    // the home's quiet mortality tap.
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    // v976: the mobile Settings/You corner icon sits beside the date (the retired
    // bottom bar's You tab). Opens the profile panel via the TabBar machinery.
    // v1119 (Malik): a GEAR, not a person. Settings and profile are one
    // surface (the You panel already opens on the account card), and a gear
    // is what people expect to find in that corner.
    const gearHTML = '<button class="wbar__settings" id="wbarSettings" type="button" aria-label="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01A1.7 1.7 0 0 0 10.05 3V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56h.01a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z"/></svg></button>';
    // v1060 (Malik): date first, the profile button on the far right.
    mg.innerHTML = (weeksLeft != null
      ? '<span class="wbar__date" id="wbarDate" role="button" tabindex="0" aria-label="Show weeks left to live">' + esc(dateStr) + '</span>'
      : '<span class="wbar__date" id="wbarDate">' + esc(dateStr) + '</span>') + gearHTML;
    const _ws = document.getElementById('wbarSettings');
    if (_ws) _ws.addEventListener('click', function () { try { if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo('profile'); } catch (e) {} });
    const wd = document.getElementById('wbarDate');
    if (wd && weeksLeft != null) {
      const revert = () => { wd.textContent = dateStr; wd._wbOn = false; };
      wd.addEventListener('click', () => {
        clearTimeout(wd._wbT);
        if (wd._wbOn) { revert(); return; }
        wd._wbOn = true;
        wd.textContent = '~' + weeksLeft.toLocaleString() + ' weeks left';
        wd._wbT = setTimeout(revert, 4000);
      });
    }
  }
  // v1043: the desktop header date is gone with the clock block, so nothing
  // is written there. Weeks-left still lives on the mobile whisper bar above.

  // Hub headline: a calm welcoming prompt, matching the render. Shifts to a
  // quiet acknowledgement once today's action is already done.
  const headlineEl = document.getElementById('hubHeadline');
  const headlineTextEl = document.getElementById('hubHeadlineText');
  if (headlineTextEl) {
    headlineTextEl.textContent = computeHeroHeadline();
  }
  // The headline picker stays inert for brand-new users; it binds on the
  // first render after Clarity completes (dataset.bound guards a re-bind).
  if (headlineEl && !headlineEl.dataset.bound && !isBrandNewUser()) {
    headlineEl.dataset.bound = '1';
    bindHeroHeadlinePicker(headlineEl);
  }

  // Return cue: a quiet once-a-day line that gives the user back the habit they
  // hooked Memento to. Shows only on the first render after the day rolled over
  // (_returnCueDue) and only if they actually set a cue. Renders nothing
  // otherwise. Reuses the existing _returnCueDue / lastVisit signal, no new
  // date math here.
  const cueEl = document.getElementById('hubReturnCue');
  if (cueEl) {
    const cue = (state.profile && state.profile.returnCue || '').trim();
    // Keep the cue up until they actually act today, then let it go. It already
    // persists across the session; this just stops nagging someone who showed up.
    const _actedToday = (typeof actionDoneToday === 'function') ? actionDoneToday() : false;
    if (_returnCueDue && cue && !_actedToday) {
      cueEl.textContent = 'When ' + cue + ', it is here.';
      cueEl.style.display = '';
    } else {
      cueEl.textContent = '';
      cueEl.style.display = 'none';
    }
  }

  // Streak block in the top hub. Hidden until there is a run going.
  const streakWrap = document.getElementById('hubStreak');
  const streakNum = document.getElementById('hubStreakCount');
  if (streakWrap && streakNum) {
    // Same source as the heatmap so the hub streak appears the moment day-1 is logged.
    let count = 0;
    try { count = (typeof consistencyStats === 'function') ? (consistencyStats().current || 0) : ((state.streak && state.streak.count) || 0); }
    catch (e) { count = (state.streak && state.streak.count) || 0; }
    if (count > 0) { streakNum.textContent = count; streakWrap.style.display = ''; }
    else { streakWrap.style.display = 'none'; }
  }

  // v1042 (Malik): the live clock is gone, and so is its every-second timer.
  // The device's own status bar already shows the time; a ticking readout was
  // looping decoration burning a wakeup per second for nothing.

  // v25 prune (Malik): the greeting is not a hit target anymore; Settings is
  // reachable from the sidebar profile and the tab bar.
}

// Customizable mission headline. 'auto' keeps the original dynamic line (mission
// status); 'preset' / 'custom' show the stored value verbatim.
const HERO_HEADLINE_PRESETS = [
  'Lock in.',
  'Remember why you started.',
  "What's today's objective?",
  'Keep going.',
  'Why did you start?',
  'What matters most today?'
];
function computeHeroHeadline() {
  // The very beginning of Memento reads like a welcome, not a mission brief.
  if (isBrandNewUser()) return 'Welcome to Memento.';
  const hh = (state.profile && state.profile.heroHeadline) || { mode: 'auto', value: '' };
  if ((hh.mode === 'preset' || hh.mode === 'custom') && (hh.value || '').trim()) {
    return hh.value.trim();
  }
  // Pre-Clarity there is no mission yet; mission language would contradict
  // the Start-here card sitting right under it.
  if (!(state.clarity && state.clarity.completed)) return 'Welcome to Memento.';
  // Local-day comparison (not a raw UTC slice) so the headline agrees with the
  // command center and consistency line after the UTC rollover in US zones.
  const done = (typeof actionDoneToday === 'function') ? actionDoneToday() : false;
  return done ? 'Today’s Action, done.' : 'What’s today’s Action?';
}
function bindHeroHeadlinePicker(headlineEl) {
  const hub = headlineEl.closest('.dash-header__hub') || headlineEl.parentElement;
  if (!hub) return;
  let pop = null;
  let onDocDown = null;
  let onKey = null;
  const close = () => {
    if (!pop) return;
    if (onDocDown) document.removeEventListener('pointerdown', onDocDown, true);
    if (onKey) document.removeEventListener('keydown', onKey, true);
    onDocDown = null; onKey = null;
    headlineEl.setAttribute('aria-expanded', 'false');
    const node = pop; pop = null;
    node.classList.remove('is-open');
    setTimeout(() => { try { node.remove(); } catch (e) {} }, 200);
  };
  const choose = (mode, value) => {
    try {
      if (!state.profile) state.profile = {};
      state.profile.heroHeadline = { mode: mode, value: value || '' };
      persistNow();
    } catch (e) {}
    try { renderGreeting(); } catch (e) {}
  };
  const open = () => {
    if (pop) { close(); return; }
    const hh = (state.profile && state.profile.heroHeadline) || { mode: 'auto', value: '' };
    pop = document.createElement('div');
    pop.className = 'hub-hl-pop';
    pop.setAttribute('role', 'menu');
    const opt = (label, active) => '<button type="button" class="hub-hl-pop__opt' + (active ? ' is-on' : '') + '" role="menuitemradio" aria-checked="' + (active ? 'true' : 'false') + '">' +
      '<span class="hub-hl-pop__check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
      '<span class="hub-hl-pop__label">' + esc(label) + '</span></button>';
    const autoOn = hh.mode === 'auto' || !(hh.value || '').trim();
    let html = '<div class="hub-hl-pop__group">';
    html += '<button type="button" class="hub-hl-pop__opt' + (autoOn ? ' is-on' : '') + '" role="menuitemradio" aria-checked="' + (autoOn ? 'true' : 'false') + '" data-hl-auto>' +
      '<span class="hub-hl-pop__check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' +
      '<span class="hub-hl-pop__label">Auto <span class="hub-hl-pop__hint">Action status</span></span></button>';
    html += '</div><div class="hub-hl-pop__sep" aria-hidden="true"></div><div class="hub-hl-pop__group">';
    HERO_HEADLINE_PRESETS.forEach(p => {
      const on = hh.mode === 'preset' && (hh.value || '').trim() === p;
      html += opt(p, on);
    });
    html += '</div><div class="hub-hl-pop__sep" aria-hidden="true"></div>';
    const customVal = hh.mode === 'custom' ? (hh.value || '') : '';
    html += '<div class="hub-hl-pop__custom"><input type="text" class="hub-hl-pop__input" maxlength="60" placeholder="Write your own…" aria-label="Write your own headline" value="' + esc(customVal) + '"></div>';
    pop.innerHTML = html;
    hub.appendChild(pop);
    // Preset buttons (the ones rendered by opt(), excluding the auto button).
    const presetBtns = pop.querySelectorAll('.hub-hl-pop__group .hub-hl-pop__opt:not([data-hl-auto])');
    presetBtns.forEach((b) => {
      b.addEventListener('click', () => { choose('preset', b.querySelector('.hub-hl-pop__label').textContent); close(); });
    });
    const autoBtn = pop.querySelector('[data-hl-auto]');
    if (autoBtn) autoBtn.addEventListener('click', () => { choose('auto', ''); close(); });
    const input = pop.querySelector('.hub-hl-pop__input');
    if (input) {
      const commit = () => {
        const v = (input.value || '').trim();
        if (v) choose('custom', v); else choose('auto', '');
      };
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); commit(); close(); }
      });
      input.addEventListener('click', (e) => e.stopPropagation());
    }
    headlineEl.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { if (pop) pop.classList.add('is-open'); });
    onDocDown = (e) => { if (pop && !pop.contains(e.target) && !headlineEl.contains(e.target)) close(); };
    onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    setTimeout(() => {
      document.addEventListener('pointerdown', onDocDown, true);
      document.addEventListener('keydown', onKey, true);
    }, 0);
  };
  headlineEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); });
  headlineEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); e.stopPropagation(); open(); }
  });
}

// === Dashboard V2 - synthetic widget renderers ===
function renderClaritySphereCard() {
  const a = state.clarity.answers || {};
  const raw = a.neutronStar || '';
  const cleaned = raw.replace(/^\s*I\s+(want to|need to|hope to|will|am going to|plan to|aim to)\s+/i, '');
  const firstChunk = cleaned.split(/[.,;]/)[0].trim();
  const words = firstChunk.split(/\s+/).slice(0, 5).join(' ');
  const anchor = state.clarity.completed && words ? words : 'Open Clarity';
  const startedAt = state.clarity.completedAt || Date.now();
  const days = state.clarity.completed ? Math.max(1, Math.floor((Date.now() - startedAt) / 86400000) + 1) : null;
  return `
    <div class="widget__content dash-card__inner">
      <div class="dash-card__eyebrow"><span class="dash-card__eyebrow-icon" style="color:var(--color-clarity)"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg></span>Clarity</div>
      <div class="dash-sphere">
        <canvas class="dash-sphere__canvas" id="dashClaritySphere" width="120" height="120" aria-hidden="true"></canvas>
      </div>
      <div class="dash-sphere__text">
        <div class="dash-sphere__anchor">${esc(anchor)}</div>
        ${days ? `<div class="dash-sphere__meta">Anchored · Day ${days}</div>` : `<div class="dash-sphere__meta">Tap to discover what drives you</div>`}
      </div>
      <div class="dash-card__cta">Open <span aria-hidden="true">→</span></div>
    </div>
  `;
}

function renderQuickActionsCard() {
  const ic = {
    plan:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    journal: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>`,
    deep:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>`,
    chart:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    more:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`
  };
  return `
    <div class="widget__content dash-card--quick-actions">
      <div class="dash-card__eyebrow"><span class="dash-card__eyebrow-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 10-12h-6l1-8z"/></svg></span>Quick Actions</div>
      <div class="dash-quick-actions__row" id="dashQuickActionsRow">
        <button class="dash-quick-actions__btn" data-action="plan"    type="button"><span class="dash-quick-actions__btn-icon">${ic.plan}</span>Plan my day</button>
        <button class="dash-quick-actions__btn" data-action="journal" type="button"><span class="dash-quick-actions__btn-icon">${ic.journal}</span>Journal</button>
        <button class="dash-quick-actions__btn" data-action="deep"    type="button"><span class="dash-quick-actions__btn-icon">${ic.deep}</span>Start deep work</button>
        <button class="dash-quick-actions__btn" data-action="chart"   type="button"><span class="dash-quick-actions__btn-icon">${ic.chart}</span>View analytics</button>
        <button class="dash-quick-actions__btn" data-action="more"    type="button" aria-label="More"><span class="dash-quick-actions__btn-icon">${ic.more}</span></button>
      </div>
    </div>
  `;
}

function renderResourcesCard() {
  const ic = {
    templates: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    guides:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    support:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };
  return `
    <div class="widget__content dash-card--resources">
      <div class="dash-card__eyebrow"><span class="dash-card__eyebrow-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h12v16H4zM6 6v12h8V6z" opacity=".7"/><path d="M18 8h2v12H8v-2h10z"/></svg></span>Resources</div>
      <div class="dash-resources__list">
        <div class="dash-resources__row" data-resource="templates" tabindex="0" role="button"><span class="dash-resources__row-left"><span class="dash-resources__row-icon">${ic.templates}</span>Templates</span><span class="dash-resources__row-chev">›</span></div>
        <div class="dash-resources__row" data-resource="guides" tabindex="0" role="button"><span class="dash-resources__row-left"><span class="dash-resources__row-icon">${ic.guides}</span>Guides</span><span class="dash-resources__row-chev">›</span></div>
        <div class="dash-resources__row" data-resource="support" tabindex="0" role="button"><span class="dash-resources__row-left"><span class="dash-resources__row-icon">${ic.support}</span>Support</span><span class="dash-resources__row-chev">›</span></div>
      </div>
    </div>
  `;
}

function bindSyntheticWidget(key, el) {
  if (key === 'claritySphere') {
    const c = el.querySelector('#dashClaritySphere');
    if (c && typeof initStarBlob === 'function') initStarBlob(c, 120, 'pulsar');
    el.addEventListener('click', () => {
      if (state.clarity.completed) ClarityExperience.openSummary();
      else ClarityExperience.open();
    });
  } else if (key === 'quickActions') {
    el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.getAttribute('data-action');
        if (action === 'journal') {
          if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection');
        } else if (action === 'deep') {
          if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('deepwork');
        }
      });
    });
  } else if (key === 'resources') {
    el.querySelectorAll('[data-resource]').forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  }
}

// === Toast helper ===
let _dashToastEl = null;
let _dashToastTimer = null;
function showComingSoonToast(message) {
  if (!_dashToastEl) {
    _dashToastEl = document.createElement('div');
    _dashToastEl.className = 'dash-toast';
    document.body.appendChild(_dashToastEl);
  }
  _dashToastEl.textContent = message || 'Coming soon';
  // Force reflow then add class
  void _dashToastEl.offsetWidth;
  _dashToastEl.classList.add('is-visible');
  clearTimeout(_dashToastTimer);
  _dashToastTimer = setTimeout(() => {
    _dashToastEl.classList.remove('is-visible');
  }, 1800);
}

// (The one-time day-7 backup-download nudge was removed in v775, Malik:
// obsolete now that accounts + cloud sync exist; Settings keeps the manual
// Download backup.)

// The "Hold onto your Memento" moment, shown ONCE right after the Neutron Star is born
// (the value moment). Now that they have built something, this is where we ask for
// the free account (so nothing is ever lost + it follows them to any device, the
// fix for the Safari -> installed-app storage gap) and offer Add to Home Screen.
// Account-primary. Once only (state.meta.saveWorkNudged), never in demo, skipped if
// already signed in or the account system is unavailable.
let _saveWorkNudgeEl = null;
// Returns true if the sheet was shown (so the caller can defer what comes next,
// e.g. Action + the paywall, until it resolves); false if skipped. onDone fires
// once when the sheet closes (any path: account, install, or maybe later).
function maybeShowSaveWorkNudge(onDone) {
  try {
    if (DEMO_MODE) return false;
    if (!state.meta || state.meta.saveWorkNudged) return false;
    if (typeof CloudSync === 'undefined' || !CloudSync.available || !CloudSync.available()) return false;
    if (CloudSync.isLoggedIn && CloudSync.isLoggedIn()) return false;
    if (_saveWorkNudgeEl || document.getElementById('saveMemento')) return false;

    let installed = false; try { installed = !!(window.MementoInstall && window.MementoInstall._isStandalone()); } catch (_) {}
    const mark = '<svg viewBox="0 0 512 512" width="42" height="42" aria-hidden="true"><rect width="512" height="512" rx="118" fill="#0c1112"/><path d="M113 108 L256 251 L399 108 L399 405 L113 405 Z" fill="#f5f5f7"/></svg>';
    const el = document.createElement('div');
    _saveWorkNudgeEl = el;
    el.id = 'saveMemento'; el.className = 'save-memento'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="save-memento__scrim" data-smclose="1"></div>' +
      '<div class="save-memento__card" role="dialog" aria-label="Hold onto your Memento">' +
        '<span class="save-memento__mark">' + mark + '</span>' +
        '<div class="save-memento__title">Hold onto your Memento</div>' +
        '<div class="save-memento__sub">You just laid the foundation for your Memento. I highly recommend making a free account so that it\'s saved and synced across any devices forever. It takes 30 seconds and doesn\'t require a password.</div>' +
        '<button class="save-memento__account" type="button">Create your free account</button>' +
        (installed ? '' : '<button class="save-memento__install" type="button">Add to Home Screen</button>') +
        '<button class="save-memento__later" data-smclose="1" type="button">Maybe later</button>' +
      '</div>';
    document.body.appendChild(el);
    // Mark shown immediately so a re-render mid-session can't double-fire.
    state.meta.saveWorkNudged = true;
    try { persistNow(); } catch (_) {}
    const close = () => {
      el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true');
      setTimeout(() => { try { el.remove(); } catch (_) {} if (_saveWorkNudgeEl === el) _saveWorkNudgeEl = null; }, 320);
      if (typeof onDone === 'function') { const cb = onDone; onDone = null; setTimeout(cb, 140); }
    };
    el.addEventListener('click', (e) => {
      let t = e.target;
      while (t && t !== el) { if (t.getAttribute && t.getAttribute('data-smclose')) { close(); return; } t = t.parentNode; }
    });
    const acc = el.querySelector('.save-memento__account');
    if (acc) acc.addEventListener('click', () => { close(); setTimeout(() => { try { if (CloudSync.openDialog) CloudSync.openDialog(); } catch (_) {} }, 280); });
    const inst = el.querySelector('.save-memento__install');
    if (inst) inst.addEventListener('click', () => { close(); setTimeout(() => { try { if (window.MementoInstall) window.MementoInstall.show(); } catch (_) {} }, 280); });
    requestAnimationFrame(() => { el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); });
    return true;
  } catch (_) { return false; }
}

// === Plan tomorrow tonight =========================================
// The moment today's action is completed is the one moment the user is
// winning, so ask ONE optional question: "Tomorrow's one action?" Saved to
// state.action.tomorrowPlan and surfaced on the dashboard hero the next
// morning. Skippable in one tap, asked at most once per day, never in demo.
let _tmrwPlanEl = null;
function promptTomorrowPlan() {
  try {
    if (DEMO_MODE) return;
    if (!state.action) return;
    // The FIRST move ever is sacred: the first-white ceremony (and, later, the
    // notification permission ask) own that moment, so nothing may stack on it
    // (FIRST-WIN-PLAN P3). firstWhiteShown is set when the ceremony plays; until
    // then, hold the question. It returns naturally on the second win. Scoped to
    // clarity.completed so a pre-star logger keeps the old behavior.
    if (state.clarity && state.clarity.completed && state.meta && !state.meta.firstWhiteShown) return;
    const today = getTodayISO();
    if (state.action.tomorrowPromptDay === today) return; // once per day
    if (_tmrwPlanEl || document.querySelector('.tmrw-plan')) return;
    // Mark as shown immediately so a re-render mid-session can't double-fire.
    state.action.tomorrowPromptDay = today;
    try { persistNow(); } catch (_) {}
    const el = document.createElement('div');
    _tmrwPlanEl = el;
    el.className = 'tmrw-plan';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Plan tomorrow');
    el.innerHTML =
      '<div class="tmrw-plan__text">Done for today.' +
        '<span>Want to name tomorrow’s one action while it’s fresh?</span>' +
      '</div>' +
      '<input class="tmrw-plan__input" type="text" maxlength="140" placeholder="One concrete move" aria-label="Tomorrow’s one action">' +
      '<div class="tmrw-plan__row">' +
        '<button class="tmrw-plan__save" type="button">Save for tomorrow</button>' +
        '<button class="tmrw-plan__skip" type="button">Skip</button>' +
      '</div>';
    document.body.appendChild(el);
    const input = el.querySelector('.tmrw-plan__input');
    const dismiss = () => {
      el.classList.remove('is-visible');
      setTimeout(() => { try { el.remove(); } catch (_) {} if (_tmrwPlanEl === el) _tmrwPlanEl = null; }, 300);
    };
    const save = () => {
      const text = (input.value || '').trim();
      if (text) {
        const d = new Date(); d.setDate(d.getDate() + 1);
        state.action.tomorrowPlan = { date: localISO(d), text };
        persistState();
      }
      dismiss();
    };
    el.querySelector('.tmrw-plan__save').addEventListener('click', save);
    el.querySelector('.tmrw-plan__skip').addEventListener('click', dismiss);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') dismiss();
    });
    void el.offsetWidth;
    el.classList.add('is-visible');
    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (_) {} }, 250);
  } catch (_) { /* never let the prompt break a completion */ }
}

const DEMO_CLARITY_PAYOFF = {
  completed: true,
  tutorialSeen: true,
  answers: {
    domains: ['creative'],
    neutronStar: 'Build Memento into something real that helps people stop wasting their lives and lock in on what actually matters.',
    keystone: 'Build Memento into something real',
    coreWhy: 'Watching the people who matter most scroll their lives away while pretending they will figure it out later.',
    antiVision: 'Another half-built idea that fades into noise within a month.',
    futureVision: 'A real product the right people are actually using because it changes their day.',
    identityLine: 'Builder of things that pull people back toward what matters.',
    whyItMatters: 'Watching the people who matter most scroll their lives away while pretending they will figure it out later.',
    emotionalAnchor: 'Another half-built idea that fades into noise within a month.',
    ninetyDayGoal: 'A real product the right people are actually using because it changes their day.',
    identitySentence: 'Builder of things that pull people back toward what matters.',
    whatSpecifically: 'Build Memento into a real app that helps people find what they actually care about and act on it.',
    aiConversation: []
  }
};

/* THE COMEBACK PICKER (v1048, Malik's call).
   The three ways back used to sit inline in the today box, which made a bad
   day's home screen the busiest screen in the app. The box now says the quiet
   thing ("4 days missed. No worries, let's get back to it.") behind one
   button, and the choosing happens here, on its own page, easiest first.
   Picking a way does exactly what the old inline buttons did: pre-select that
   tier and open Action. */
const ComebackPicker = {
  _el: null,

  open() {
    if (this._el) return;
    const pa = (state.action && state.action.primaryAction) || {};
    const tiers = pa.tiers || {};
    const full = (tiers[pa.recommendedTier] || pa.title || 'Your one thing').trim();
    const ways = [
      { tier: 'tiny',  text: (tiers.tiny || full), mins: '2 min',  sub: 'The smallest honest version' },
      { tier: 'light', text: (tiers.light || tiers.tiny || full), mins: '10 min', sub: 'A real but gentle start' },
      { tier: (['tiny','light','moderate','heavy','extreme'].indexOf(pa.recommendedTier) >= 0 ? pa.recommendedTier : 'moderate'),
        text: full, mins: '', sub: 'The full move' }
    ];
    const el = document.createElement('div');
    el.className = 'cbp';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Pick a way back in');
    el.innerHTML =
      '<button class="cbp__close" type="button" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' +
      '</button>' +
      '<div class="cbp__body">' +
        '<h2 class="cbp__head">Pick the action you can do now.</h2>' +
        '<p class="cbp__sub">It&rsquo;s better to start small than not at all.</p>' +
        '<div class="cbp__ways">' +
          ways.map((w, i) =>
            '<button class="cbp__way' + (i === 0 ? ' cbp__way--first' : '') + '" type="button" data-cbp-tier="' + esc(w.tier) + '" aria-pressed="false">' +
              '<span class="cbp__way-top">' +
                '<span class="cbp__way-title">' + esc(w.text) + '</span>' +
                (w.mins ? '<span class="cbp__way-mins">' + esc(w.mins) + '</span>' : '') +
              '</span>' +
              '<span class="cbp__way-sub">' + esc(w.sub) + '</span>' +
            '</button>'
          ).join('') +
        '</div>' +
        // v1154 (Malik): picking is a two-step. Tap to choose, then a
        // deliberate confirm at the bottom, so nobody commits by accident.
        '<button class="cbp__confirm" type="button" disabled>Choose one above</button>' +
      '</div>';
    document.body.appendChild(el);
    this._el = el;
    void el.offsetWidth;
    el.classList.add('cbp--open');

    el.querySelector('.cbp__close').addEventListener('click', () => this.close());
    let picked = '';
    const confirm = el.querySelector('.cbp__confirm');
    el.querySelectorAll('[data-cbp-tier]').forEach((b) => {
      b.addEventListener('click', () => {
        picked = b.getAttribute('data-cbp-tier');
        el.querySelectorAll('[data-cbp-tier]').forEach(x => {
          const on = x === b;
          x.classList.toggle('is-picked', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        confirm.disabled = false;
        confirm.textContent = 'Start this one';
      });
    });
    confirm.addEventListener('click', () => {
      if (!picked) return;
      try {
        if (['tiny','light','moderate','heavy','extreme'].indexOf(picked) >= 0) {
          state.action.selectedTier = picked;
          persistNow();
        }
      } catch (e) {}
      this.close();
      setTimeout(() => { try { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); } catch (e) {} }, 240);
    });
    this._esc = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._esc);
  },

  close() {
    const el = this._el;
    if (!el) return;
    this._el = null;
    try { document.removeEventListener('keydown', this._esc); } catch (e) {}
    el.classList.remove('cbp--open');
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 280);
  }
};

const CreatorTools = {
  _gateCheck: null,

  // The only visibility decision for the Cheat Code Bar. Local development is
  // always allowed. On the live app, the immutable auth user id inside the
  // current Supabase session must be Malik's documented owner account. This is
  // a client-local QA surface only; every paid server action stays protected by
  // the normal backend checks.
  _devCondition() {
    try {
      const host = String(location.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
      const token = window.CloudSync && CloudSync.accessToken ? CloudSync.accessToken() : '';
      const part = String(token || '').split('.')[1] || '';
      if (!part) return false;
      const padded = part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - part.length % 4) % 4);
      const payload = JSON.parse(atob(padded));
      return payload && payload.sub === '9f5216bc-cc93-4a79-b2c4-2bfaec097648';
    } catch (e) { return false; }
  },

  _markup() {
    return `<section class="creator-box" id="creatorBox">
      <div class="creator-box__top" id="creatorBoxToggle">
        <div class="creator-box__label">&#127918; Cheat Code Bar</div>
        <div class="creator-box__right">
          <div class="creator-box__state" id="creatorState">Normal flow</div>
          <div class="creator-box__arrow" id="creatorArrow">&#8964;</div>
        </div>
      </div>
      <div class="creator-box__actions" id="creatorBoxActions">
        <div class="creator-box__divider">Live run (destructive)</div>
        <button class="creator-box__btn" id="creatorFreshStart">Start as a new user</button>
        <div class="creator-box__divider">Jump to (non-destructive)</div>
        <button class="creator-box__btn" id="creatorJumpSplash">Splash screen</button>
        <button class="creator-box__btn" id="creatorJumpOnboarding">Onboarding</button>
        <button class="creator-box__btn" id="creatorJumpStyle">Choose style</button>
        <button class="creator-box__btn" id="creatorJumpCelebration">Celebration</button>
        <button class="creator-box__btn" id="creatorGiveNeutronStar">Give Neutron Star</button>
        <div class="creator-box__divider">Stages &amp; animations</div>
        <button class="creator-box__btn" id="creatorJumpBlankCard">Blank card</button>
        <button class="creator-box__btn" id="creatorJumpUnlock">Evolution 1 · cyan (Clarity)</button>
        <button class="creator-box__btn" id="creatorJumpEvoPlat">Evolution 2 · platinum (Action)</button>
        <button class="creator-box__btn" id="creatorJumpEvoGreen">Evolution 3 · green (Consistency)</button>
        <button class="creator-box__btn" id="creatorJumpAfterCinema">After cinematic</button>
        <button class="creator-box__btn" id="creatorJumpFinalQ">Final question</button>
        <button class="creator-box__btn" id="creatorJumpSynth">Synthesis</button>
        <button class="creator-box__btn" id="creatorJumpClarityEnd">End of Clarity</button>
        <button class="creator-box__btn" id="creatorActionFlowWeight">New Action flow (weight)</button>
        <button class="creator-box__btn" id="creatorActionFlowBiz">New Action flow (business)</button>
        <button class="creator-box__btn" id="creatorActionBrainTest">Action: real plan test (paid AI)</button>
        <button class="creator-box__btn" id="creatorPushStatus">Push: status + force ask</button>
        <button class="creator-box__btn" id="creatorStressRun">Stress run: 30 personas (paid AI, ~60-90 min)</button>
        <button class="creator-box__btn" id="creatorJump7Days">First 7 days</button>
        <button class="creator-box__btn" id="creatorJumpPaywall">Paywall</button>
        <button class="creator-box__btn" id="creatorJumpPayCeremony">Unlock ceremony (after paying)</button>
        <button class="creator-box__btn" id="creatorJumpDay1">Day 1 moment</button>
        <button class="creator-box__btn" id="creatorJumpAction">Action module</button>
        <button class="creator-box__btn" id="creatorRestartAction">Restart Action</button>
        <button class="creator-box__btn" id="creatorJumpMori">Mori moment</button>
        <button class="creator-box__btn" id="creatorJumpVivere">Vivere moment</button>
        <button class="creator-box__btn" id="creatorJumpWoven">Woven card</button>
        <button class="creator-box__btn" id="creatorExitStyle">Exit: ✕</button>
        <div class="creator-box__divider">Comeback stress test (safe demo)</div>
        <button class="creator-box__btn" data-comeback-gap="0">Active today</button>
        <button class="creator-box__btn" data-comeback-gap="1">Missed 1 day</button>
        <button class="creator-box__btn" data-comeback-gap="3">Missed 3 days</button>
        <button class="creator-box__btn" data-comeback-gap="7">Missed 1 week</button>
        <button class="creator-box__btn" data-comeback-gap="14">Missed 2 weeks</button>
        <div class="creator-box__divider">Entitlements</div>
        <button class="creator-box__btn" id="creatorTogglePaid">Paid / Free</button>
      </div>
    </section>`;
  },

  _placeBox(box) {
    if (!box) return;
    try {
      const mobile = window.matchMedia && window.matchMedia('(max-width: 859.98px)').matches;
      const profile = mobile ? document.getElementById('profileBody') : null;
      if (profile && profile.childElementCount) {
        profile.appendChild(box);
        return;
      }
      if (typeof Sidebar !== 'undefined' && Sidebar._relocateCreatorBox) {
        Sidebar._relocateCreatorBox();
        if (box.parentNode && box.parentNode.id === 'sidebarCreatorSlot') return;
      }
    } catch (e) {}
    const anchor = document.getElementById('dashGreetingMobile');
    if (anchor && anchor.parentNode) anchor.insertAdjacentElement('afterend', box);
  },

  _mount() {
    if (document.getElementById('creatorBox')) return;
    const template = document.createElement('template');
    template.innerHTML = this._markup().trim();
    const box = template.content.firstElementChild;
    if (!box) return;
    const anchor = document.getElementById('dashGreetingMobile');
    if (!anchor || !anchor.parentNode) return;
    anchor.insertAdjacentElement('afterend', box);
    this._bindMountedBox();
    this._placeBox(box);
    try {
      if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE && typeof _injectDemoBar === 'function') {
        const persona = new URLSearchParams(location.search).get('demo') || 'creator';
        _injectDemoBar(persona);
      }
    } catch (e) {}
  },

  _unmount() {
    const box = document.getElementById('creatorBox');
    if (box) box.remove();
  },

  _syncGate() {
    if (this._devCondition()) this._mount();
    else this._unmount();
  },

  init() {
    if (this._gateCheck) return;
    this._gateCheck = () => {
      this._syncGate();
      setTimeout(() => this._syncGate(), 250);
      setTimeout(() => this._syncGate(), 1200);
    };
    this._syncGate();
    // CloudSync loads after this file. These bounded probes catch its restored
    // session without leaving a permanent polling loop alive in the app.
    [0, 100, 500, 2000, 5000, 12000].forEach((ms) => setTimeout(this._gateCheck, ms));
    window.addEventListener('focus', this._gateCheck);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this._gateCheck();
    });
    // Every deliberate sign-in and sign-out goes through these public methods.
    // Wrap them once after CloudSync appears so the DOM follows the real auth
    // result immediately, including removal on sign-out.
    setTimeout(() => {
      try {
        const sync = window.CloudSync;
        if (!sync || sync.__creatorGateWrapped) return;
        sync.__creatorGateWrapped = true;
        ['verifyCode', 'signOut'].forEach((name) => {
          const original = sync[name];
          if (typeof original !== 'function') return;
          sync[name] = async (...args) => {
            try { return await original.apply(sync, args); }
            finally { this._gateCheck(); }
          };
        });
      } catch (e) {}
    }, 0);
  },

  _bindMountedBox() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    // (v774: Unlock/Lock All, Open Neutron Star, Skip to Action Plan and the
    // Restore/Restart rows are gone from the bar; their methods remain for
    // console use until the pre-ship dead-code sweep.)
    bind('creatorFreshStart', () => this.freshStart());
    bind('creatorJumpSplash', () => this.jumpSplash());
    bind('creatorJumpOnboarding', () => this.jumpOnboarding());
    bind('creatorJumpStyle', () => this.jumpStyle());
    bind('creatorGiveNeutronStar', () => this.giveNeutronStar());
    // Stage & animation jumps (Malik: fly around Memento from the cheat bar)
    bind('creatorJumpBlankCard', () => this.jumpBlankCard());
    bind('creatorJumpUnlock', () => this.jumpUnlockCinema());
    bind('creatorJumpEvoPlat', () => this.jumpEvoColour('evo2-plat', 'action'));
    bind('creatorJumpEvoGreen', () => this.jumpEvoColour('evo2-green', 'consistency'));
    bind('creatorJumpAfterCinema', () => this.jumpAfterCinema());
    bind('creatorJumpCelebration', () => this.jumpCelebration());
    bind('creatorJumpFinalQ', () => this.jumpFinalQuestion());
    bind('creatorJumpSynth', () => this.jumpSynth());
    // Straight to the finished summary (star + summary + notes pages), no
    // ceremony beats. DevCeremony plants the filler star when none exists.
    bind('creatorJumpClarityEnd', () => {
      try { this._closeAll(); } catch (e) {}
      try { if (window.DevCeremony) DevCeremony.summary(); } catch (e) {}
    });
    // The new Action flow (merge phase 3): walk all five surfaces on a fixture.
    const aflDemo = (key) => {
      try { this._closeAll(); } catch (e) {}
      try { if (window.ActionFlow) ActionFlow.demo(key); } catch (e) {}
    };
    bind('creatorActionFlowWeight', () => aflDemo('weight'));
    bind('creatorActionFlowBiz', () => aflDemo('business'));
    // The real generation pipeline against the live proxy (needs a signed-in
    // paid session). Renders the raw result into a scrollable dev sheet so
    // Malik can run it from the phone with no console.
    // Push diagnostics: show every eligibility gate + force the ask card.
    bind('creatorPushStatus', async () => {
      const out = { build: String(window.MEMENTO_JS_BUILD || '?') };
      try {
        out.permission = ('Notification' in window) ? Notification.permission : 'unsupported';
        out.standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
        out.askedV2 = localStorage.getItem('memento_push_asked_v2');
        out.pushOn = localStorage.getItem('memento_push_on');
        out.armed = localStorage.getItem('memento_push_armed');
        out.paid = (typeof ClarityPaywall !== 'undefined') ? ClarityPaywall.isPaid() : 'n/a';
        out.signedIn = !!(window.CloudSync && CloudSync.accessToken && CloudSync.accessToken());
        out.clarityDone = !!(state.clarity && state.clarity.completed);
        out.swReady = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
        try { const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); out.subscribed = !!sub; } catch (e) { out.subscribed = 'err:' + e.message; }
        out.eligible = (window.MementoPush && MementoPush._eligible) ? MementoPush._eligible() : 'no-probe';
        out.lastSync = (window.MementoPush && MementoPush._lastSync) || 'never-attempted';
        try { if (window.MementoPush && MementoPush.sync) { await MementoPush.sync(); out.syncNow = (MementoPush._lastSync) || 'no-trace'; } } catch (e2) { out.syncNow = 'err:' + e2.message; }
      } catch (e) { out.err = e.message; }
      const old = document.getElementById('devBrainSheet');
      if (old) old.remove();
      const sheet = document.createElement('div');
      sheet.id = 'devBrainSheet';
      sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(5,6,8,.97);color:#e8eaef;overflow:auto;padding:calc(20px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom));font:13px/1.6 ui-monospace,Menlo,monospace;white-space:pre-wrap;';
      const x = document.createElement('button');
      x.textContent = 'Close';
      x.style.cssText = 'position:sticky;top:0;float:right;background:#fff;color:#000;font:600 13px Geist,sans-serif;border:0;border-radius:999px;padding:8px 16px;';
      x.addEventListener('click', () => sheet.remove());
      const force = document.createElement('button');
      force.textContent = 'Force the ask card';
      force.style.cssText = 'display:block;margin:14px 0;background:#3fd94e;color:#0b1112;font:600 13px Geist,sans-serif;border:0;border-radius:999px;padding:10px 18px;';
      force.addEventListener('click', () => {
        try { localStorage.removeItem('memento_push_asked_v2'); } catch (e) {}
        try { if (window.MementoPush && MementoPush._offerAsk) MementoPush._offerAsk(true); else if (window.MementoPush && MementoPush.armPostPayment) { localStorage.setItem('memento_push_armed', '1'); MementoPush.armPostPayment(); } } catch (e) {}
        sheet.remove();
        this._devToast('Ask re-armed. Watch for the card.');
      });
      sheet.appendChild(x);
      sheet.appendChild(force);
      const pre = document.createElement('div');
      pre.textContent = JSON.stringify(out, null, 2);
      sheet.appendChild(pre);
      document.body.appendChild(sheet);
    });
    bind('creatorActionBrainTest', async () => {
      if (typeof actionBrainLiveRun !== 'function') { this._devToast('brain not loaded'); return; }
      this._devToast('Running 2 real plans, ~1-3 min...');
      let out;
      try { out = await actionBrainLiveRun(); } catch (e) { out = { error: String(e && e.message || e) }; }
      // Ship the full result home: compact it (transcripts stripped), chunk it
      // under the feedback row cap, and post it to the feedback inbox so Fable
      // can read the failure details without phone screenshots. Dev-only pipe.
      try {
        const diag = JSON.parse(JSON.stringify(out, (k, v) => (k === 'transcript' || k === 'aiConversation') ? '[stripped]' : v));
        const s = JSON.stringify(diag);
        const runId = 'brt-' + Date.now().toString(36);
        const CH = 3500;
        const total = Math.min(8, Math.ceil(s.length / CH));
        const url = (window.MEMENTO_SUPABASE_URL || 'https://lipuxymlsowdrbummqxw.supabase.co') + '/functions/v1/submit-feedback';
        for (let i = 0; i < total; i++) {
          fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': window.MEMENTO_SUPABASE_ANON || '',
              'Authorization': 'Bearer ' + (window.MEMENTO_SUPABASE_ANON || ''),
              'x-memento-device': (typeof Analytics !== 'undefined' && Analytics.deviceId) ? Analytics.deviceId() : 'unknown'
            },
            body: JSON.stringify({
              kind: 'dev-brain-test',
              text: runId + ' [' + (i + 1) + '/' + total + (s.length > CH * 8 ? ' TRUNC' : '') + '] ' + s.slice(i * CH, (i + 1) * CH),
              appVersion: String(window.MEMENTO_VERSION || '')
            })
          }).catch(() => {});
        }
        this._devToast('Results sent to the inbox (' + runId + ')');
      } catch (e) {}
      const old = document.getElementById('devBrainSheet');
      if (old) old.remove();
      const sheet = document.createElement('div');
      sheet.id = 'devBrainSheet';
      sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(5,6,8,.97);color:#e8eaef;overflow:auto;padding:calc(20px + env(safe-area-inset-top)) 16px calc(30px + env(safe-area-inset-bottom));font:12px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word;-webkit-overflow-scrolling:touch;';
      const x = document.createElement('button');
      x.textContent = 'Close';
      x.style.cssText = 'position:sticky;top:0;float:right;background:#fff;color:#000;font:600 13px Geist,sans-serif;border:0;border-radius:999px;padding:8px 16px;';
      x.addEventListener('click', () => sheet.remove());
      sheet.appendChild(x);
      const pre = document.createElement('div');
      pre.textContent = (typeof out === 'string') ? out : JSON.stringify(out, null, 2);
      sheet.appendChild(pre);
      document.body.appendChild(sheet);
    });
    // The 30-persona stress run (js/31). Opens its own sheet with the cost
    // gate; nothing starts until Malik taps start in there.
    bind('creatorStressRun', () => {
      if (!window.StressRun) { this._devToast('stress runner not loaded'); return; }
      try { this._closeAll(); } catch (e) {}
      window.StressRun.open();
    });
    bind('creatorJump7Days', () => this.jump7Days());
    bind('creatorJumpPaywall', () => this.jumpPaywall());
    // The post-payment unlock ceremony (unlock.html in an iframe). dev:true =
    // replay only: the play-once seen flag is never written from here.
    bind('creatorJumpPayCeremony', () => {
      try { this._closeAll(); } catch (e) {}
      if (typeof UnlockCeremony !== 'undefined') UnlockCeremony.show({ clarityDone: true, dev: true });
    });
    bind('creatorTogglePaid', () => this.togglePaid());
    try { this._paidLabel(); } catch (e) {}
    bind('creatorJumpDay1', () => this.jumpDay1());
    bind('creatorJumpAction', () => this.jumpAction());
    bind('creatorRestartAction', () => this.restartAction());
    bind('creatorJumpMori', () => this.jumpMori());
    bind('creatorJumpVivere', () => this.jumpVivere());
    bind('creatorJumpWoven', () => this.jumpWoven());
    document.querySelectorAll('[data-comeback-gap]').forEach((button) => {
      button.addEventListener('click', () => this.jumpComebackScenario(Number(button.dataset.comebackGap)));
    });

    // Every cheat button press toasts its own label (v735): universal
    // feedback, delegated so future buttons get it for free.
    try {
      const box = document.getElementById('creatorBox');
      if (box && !box.dataset.toastBound) {
        box.dataset.toastBound = '1';
        box.addEventListener('click', (e) => {
          const b = e.target && e.target.closest && e.target.closest('.creator-box__btn');
          if (b && b.textContent) this._devToast('\u2192 ' + b.textContent.trim());
        });
      }
    } catch (e) {}

    // Dropdown toggle
    const toggle = document.getElementById('creatorBoxToggle');
    if (toggle) toggle.addEventListener('click', () => this.toggleDropdown());

    this.render();
  },

  toggleDropdown() {
    const box = document.getElementById('creatorBox');
    if (box) box.classList.toggle('creator-box--open');
  },

  render() {
    const stateEl = document.getElementById('creatorState');
    if (!stateEl) return;
    const bits = [];
    bits.push(state.dev.previewAll ? 'All unlocked' : (state.clarity.completed ? 'Clarity done' : 'Locked'));
    if (state.dev.savedClarity) bits.push('Restore available');
    const comebackDays = Number(state.dev && state.dev.comebackMissedDays);
    if (Number.isInteger(comebackDays) && comebackDays >= 0) {
      bits.push(comebackDays === 0 ? 'Active today' : 'Missed ' + comebackDays + (comebackDays === 1 ? ' day' : ' days'));
    }
    stateEl.textContent = bits.join(' · ');
    const activeGap = Number.isInteger(comebackDays) && comebackDays >= 0 ? String(comebackDays) : '';
    document.querySelectorAll('[data-comeback-gap]').forEach((button) => {
      const active = !!activeGap && button.dataset.comebackGap === activeGap;
      button.classList.toggle('creator-box__btn--primary', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  },

  jumpComebackScenario(days) {
    const allowed = [0, 1, 3, 7, 14];
    const gap = allowed.indexOf(days) >= 0 ? days : 3;
    const params = new URLSearchParams(location.search);
    const persona = /^[a-z0-9]+$/i.test(params.get('demo') || '') ? params.get('demo') : 'creator';
    params.set('demo', persona);
    params.set('comeback', String(gap));
    location.search = '?' + params.toString();
  },

  setPreviewAll(on) {
    state.dev.previewAll = !!on;
    persistNow();
    renderGrid();
    renderAll();
    this.render();
  },

  lockAll() {
    // Show new-user state: only Clarity accessible, everything else locked
    state.dev.previewAll = false;
    if (!state.dev.savedClarity) {
      state.dev.savedClarity = JSON.parse(JSON.stringify(state.clarity));
    }
    state.clarity.completed = false;
    state.clarity.tutorialSeen = false;
    delete state.clarity.draft;
    persistNow();
    renderGrid();
    renderAll();
    this.render();
  },

  // Fresh-start lock-down (Malik): when Clarity is reverted to not-done, the
  // dashboard must look like day one. Re-lock the ladder and suppress the
  // has-data unlock shortcut until Clarity is completed again.
  _relockLadder() {
    try {
      if (state.ui) { state.ui.unlocked = {}; state.ui.unlockQueue = []; state.ui.pendingReveal = ''; }
      if (state.prefs) state.prefs.unlockAll = false;
      if (state.dev) { state.dev.previewAll = false; state.dev.relocked = true; }
    } catch (e) {}
  },

  restoreClarity() {
    if (state.dev.savedClarity) {
      state.clarity = JSON.parse(JSON.stringify(state.dev.savedClarity));
      state.dev.savedClarity = null;
    } else {
      state.clarity.completed = false;
      state.clarity.tutorialSeen = false;
      state.clarity.answers = JSON.parse(JSON.stringify(DEFAULT_STATE.clarity.answers));
      delete state.clarity.draft;
    }
    if (!state.clarity.completed) this._relockLadder();
    persistNow();
    renderGrid();
    renderAll();
    this.render();
  },

  openSummary() {
    if (!state.clarity.completed || !normalizeClaritySummary(state.clarity.answers).hasRealResult) {
      if (!state.dev.savedClarity) {
        state.dev.savedClarity = JSON.parse(JSON.stringify(state.clarity));
      }
      state.clarity = JSON.parse(JSON.stringify(DEMO_CLARITY_PAYOFF));
      persistNow();
      renderGrid();
      renderAll();
      this.render();
    }
    if (Sheet.isOpen) Sheet.close();
    ClarityExperience.openSummary();
  },

  restartClarity() {
    if (ClarityExperience.isOpen) ClarityExperience.close();
    // Preserve the run that is about to be wiped, matching the other reset
    // paths (snapshotClarityRun is a no-op unless a real run exists). Capture
    // the resulting history BEFORE replacing state.clarity with the default,
    // then carry it onto the fresh state so a restart no longer silently
    // drops the prior Clarity run from history.
    let _carryHistory = [];
    try {
      snapshotClarityRun();
      if (state.clarity && Array.isArray(state.clarity.history)) _carryHistory = state.clarity.history.slice();
    } catch (_) {}
    state.clarity = JSON.parse(JSON.stringify(DEFAULT_STATE.clarity));
    if (_carryHistory.length) state.clarity.history = _carryHistory;
    state.dev.savedClarity = null;
    this._relockLadder();
    persistNow();
    renderGrid();
    renderAll();
    this.render();
    ClarityExperience.open();
  },

  restartAction() {
    if (ActionExperience.isOpen) ActionExperience.close();
    state.action = JSON.parse(JSON.stringify(DEFAULT_STATE.action));
    persistNow();
    renderGrid();
    renderAll();
    this.render();
    ActionExperience.open();
  },

  // Dev shortcut: wipe ALL saved state and reload to a brand-new first run
  // (splash + full onboarding). Keeps the saved Anthropic API key so you don't
  // have to re-enter it every time.
  restartEverything() {
    if (!window.confirm('Wipe everything and start over from the very beginning? This clears all your data.')) return;
    // CRITICAL: block the pagehide/visibilitychange flush from re-persisting the
    // still-in-memory state during the reload below. Without this the wipe is
    // immediately undone and you land back on the dashboard instead of onboarding.
    IS_RESETTING = true;
    try {
      const apiKey = localStorage.getItem(ANTHROPIC_KEY_STORAGE);
      Object.keys(localStorage).filter(k => /^memento/i.test(k)).forEach(k => localStorage.removeItem(k));
      if (apiKey) localStorage.setItem(ANTHROPIC_KEY_STORAGE, apiKey);
    } catch (e) {}
    // Reload to a CLEAN url (strip ?demo and any query/hash) so reset always
    // exits demo mode and lands on a fresh app at the very beginning, even when
    // opened from a demo or deep link.
    location.href = location.href.replace(/[?#].*$/, '');
  },

  // ── Fast navigation (non-destructive) ─────────────────────────────────────
  // Jump straight to the first-run moments to preview them, WITHOUT wiping any
  // saved data. Each just re-opens the relevant overlay; nothing is persisted,
  // so closing it leaves the real state exactly as it was.
  _closeCheat() { try { document.getElementById('creatorBox')?.classList.remove('creator-box--open'); } catch (e) {} },

  // v938 (Malik: "I want to see what it would ACTUALLY be like for a real
  // user"). Every jump below is a teleport: it fabricates a state and opens a
  // real screen, so the SURFACE is real but the history behind it is invented.
  // That is why a jump can show behaviour a real user could never hit (the
  // Action evolution playing over a state with no discovered plan). This is the
  // opposite: a true clean slate, then the actual journey from the splash.
  // Same wipe the Settings > Reset everything path uses, minus the exit survey:
  // IS_RESETTING blocks the pagehide flush from re-persisting the in-memory
  // state after the wipe, and landing on pathname (not a plain reload) drops
  // ?demo=... so a persona cannot silently re-seed and undo the reset.
  freshStart() {
    if (!confirm('Start as a new user?\n\nThis wipes everything on this device and begins the real journey from the splash. Cannot be undone.')) return;
    try { this._closeAll(); } catch (e) {}
    try { if (typeof IS_RESETTING !== 'undefined') IS_RESETTING = true; } catch (e) {}
    try { localStorage.clear(); } catch (_) {
      try { localStorage.removeItem(APP_KEY); } catch (_) {}
    }
    try { sessionStorage.clear(); } catch (e) {}
    location.href = location.pathname;
  },
  jumpSplash() {
    this._closeCheat();
    // Splash has no open(); init() re-shows it (clears the 'dismissed' class and
    // rebinds Get started, whose dismiss() is guarded so a rebind is harmless).
    try {
      if (typeof Splash !== 'undefined') {
        if (Splash.init) Splash.init();
        const sp = document.getElementById('splash');
        if (sp) { sp.classList.remove('dismissed', 'splash--exiting'); Splash._dismissing = false; }
      }
    } catch (e) {}
  },

  jumpOnboarding() {
    this._closeCheat();
    // WelcomeIntro.open() early-returns once welcomeSeen is set, so flip it off
    // in memory (not persisted) to force a replay. The flow re-sets it on finish.
    try {
      if (state.meta) state.meta.welcomeSeen = false;
      if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) ClarityExperience.close();
      if (typeof Sheet !== 'undefined' && Sheet.isOpen) Sheet.close();
      if (typeof WelcomeIntro !== 'undefined' && WelcomeIntro.open) WelcomeIntro.open();
    } catch (e) {}
  },

  jumpStyle() {
    this._closeCheat();
    try { if (typeof AppearancePicker !== 'undefined' && AppearancePicker.open) AppearancePicker.open(); } catch (e) {}
  },

  jumpDashboard() {
    this._closeCheat();
    try {
      if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) ClarityExperience.close();
      if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) ActionExperience.close();
      if (typeof Sheet !== 'undefined' && Sheet.isOpen) Sheet.close();
      if (typeof WelcomeIntro !== 'undefined' && WelcomeIntro.el) WelcomeIntro.el.classList.remove('open');
      const sp = document.getElementById('splash'); if (sp) sp.classList.add('dismissed');
      if (typeof TabBar !== 'undefined' && TabBar.show) TabBar.show();
      renderAll();
    } catch (e) {}
  },

  // Malik's clean handoff into the real post-Clarity flow. This gives the
  // tester a finished Neutron Star, removes any old Action plan or receipts,
  // and lands on Home. Everything after that remains production behavior:
  // Build my plan -> First 7 Days -> paywall -> fresh Action intake.
  giveNeutronStar() {
    this._closeAll();
    this._devToHome();
    this._seedStep('star');
    try {
      state.clarity.answers = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE.clarity.answers)), {
        neutronStar: 'Grow Memento into a tool that can be used by several people.',
        coreWhy: 'I want Memento to become a real tool that helps people find what matters and act on it.',
        whyMatters: 'I want Memento to become a real tool that helps people find what matters and act on it.',
        whyMoreThanAnything: 'I want to prove Memento can improve someone else\'s real day, not stay an idea I use alone.',
        antiVision: 'Memento stays a promising idea that never becomes useful to people beyond me.',
        futureVision: 'Several people use Memento to find the one thing that matters and act on it every day.',
        identityLine: 'The builder who turned Memento into a tool people genuinely use.',
        whatSpecifically: 'Grow Memento into a tool that can be used by several people.',
        timeHorizon: '12 months',
        timeframe: '12 months',
        anchor: 'Build',
        intensity: 'High'
      });
      state.clarity.history = [];
      state.clarity.letter = null;
      state.clarity.driftChecks = [];
      delete state.clarity.draft;
      state.clarity.completed = true;
      state.clarity.completedAt = new Date().toISOString();
      state.clarity.ignitedAt = Date.now();
      state.action = JSON.parse(JSON.stringify(DEFAULT_STATE.action));
      state.meta = state.meta || {};
      state.meta.cardEvolutionSeen = true;
      state.meta.next7DaysSeen = false;
      state.meta.planRevealSeen = false;
      if (typeof persistNow === 'function') persistNow();
      if (typeof renderGrid === 'function') renderGrid();
      if (typeof renderAll === 'function') renderAll();
      if (typeof TabBar !== 'undefined' && TabBar.show) {
        TabBar.show();
        TabBar.updateHomeDot();
      }
      this.render();
    } catch (e) {}
  },

  // Dev shortcut: jump straight to the generated Action plan, skipping the
  // intro tutorial AND the whole intake chat. Marks both as done and lets
  // renderContent() auto-generate the plan from the Neutron Star.
  skipActionIntake() {
    if (!(state.clarity && state.clarity.completed)) {
      if (typeof showComingSoonToast === 'function') showComingSoonToast('Set your Neutron Star (Clarity) first');
      return;
    }
    state.action = state.action || {};
    state.action.introSeen = true;
    if (!state.action.intake) state.action.intake = { answers: {}, completed: false };
    state.action.intake.devMode = false;
    state.action.intake.completed = true;
    // Drop in a default timeframe if Clarity never captured one, so the plan
    // generates with zero further prompts (it's a dev shortcut, override later).
    if (state.clarity.answers && String(state.clarity.answers.timeframe || '').trim().length < 3) {
      state.clarity.answers.timeframe = '3 months';
    }
    if (typeof actionNeedsTimeframe !== 'undefined') actionNeedsTimeframe = false;
    // Complete the WHOLE plan synchronously so reopening the Action module lands
    // straight on the final plan view instead of re-running the questions. Keep a
    // real plan if one was already generated; only drop in a populated default
    // when there is none, so this never clobbers good AI output.
    const _ns = (state.clarity.answers && state.clarity.answers.neutronStar) || '';
    const _pa = state.action.primaryAction;
    const _hasPlan = !!(_pa && _pa.title && String(_pa.title).trim());
    if (!_hasPlan) {
      state.action.primaryAction = {
        title: 'Take the next real step toward ' + (_ns ? 'your Neutron Star' : 'your goal'),
        why: 'Momentum comes from doing the next concrete thing, today.',
        howToStart: 'Open what you are working on and do the smallest version for a few minutes.',
        recommendedTier: 'moderate',
        recommendedWhy: 'A steady, repeatable pace you can actually keep.',
        tiers: {
          tiny: 'Two minutes on the smallest piece.',
          light: 'Fifteen focused minutes.',
          moderate: 'One solid block of focused work.',
          heavy: 'A long, deliberate deep-work session.',
          extreme: 'A full day aimed at one outcome.'
        },
        path: []
      };
      state.action.supportingActions = Array.isArray(state.action.supportingActions) ? state.action.supportingActions : [];
      state.action.focusPlan = state.action.focusPlan || { frame: '', frictionRemove: [], frictionAdd: [] };
    }
    state.action.planGenerated = true;
    state.action.planSourceNeutronStar = _ns;
    state.action.lastGeneratedAt = new Date().toISOString();
    if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
    persistNow();
    document.getElementById('creatorBox')?.classList.remove('creator-box--open');
    if (ActionExperience.isOpen) ActionExperience.renderContent();
    else ActionExperience.open();
    this.render();
  },

  // Close the cheat dropdown AND the sidebar drawer so a card animation is
  // actually visible on the home behind them.
  _closeAll() {
    try {
      document.getElementById('creatorBox')?.classList.remove('creator-box--open');
      document.body.classList.remove('mobile-menu-open', 'menu-peek');
    } catch (e) {}
  },

  // v735 (Malik): every cheat press answers back. A small pill names what
  // fired, so a jump that lands on a similar-looking screen (or seeds state
  // with no visible change) never reads as a dead tap. Dev-only surface.
  _devToast(label) {
    try {
      const old = document.getElementById('devJumpToast');
      if (old) old.remove();
      const t = document.createElement('div');
      t.id = 'devJumpToast';
      t.textContent = label;
      t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 96px);z-index:2147483200;padding:8px 14px;border-radius:999px;background:rgba(10,10,14,0.92);color:#fff;font:600 12px -apple-system,system-ui,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);pointer-events:none;opacity:0;transition:opacity 0.18s ease;';
      document.body.appendChild(t);
      requestAnimationFrame(() => { t.style.opacity = '1'; });
      setTimeout(() => { try { t.style.opacity = '0'; setTimeout(() => t.remove(), 220); } catch (e) {} }, 1500);
    } catch (e) {}
  },

  // --- Stage & animation jumps (Malik: fly around from the cheat bar) ---
  // STATE-ACCURATE: each jump commits a REAL, coherent state for that checkpoint
  // so you land at a genuine step you can continue organically (real paywall,
  // real action generation, real days), NOT a throwaway preview. Your own star/
  // plan are kept if you have them; otherwise the founder demo's content is
  // borrowed so there is always something real to work with. Dev-only, URL-gated.
  _seedStep(step) {
    try {
      const nowISO = new Date().toISOString();
      const now = Date.now();
      const clone = (o) => JSON.parse(JSON.stringify(o));
      const demo = (typeof buildDemoState === 'function') ? buildDemoState('founder') : null;
      const DS = (typeof DEFAULT_STATE !== 'undefined') ? DEFAULT_STATE : {};
      const keepProfile = clone(state.profile || DS.profile || {});
      const keepPrefs = clone(state.prefs || DS.prefs || {});
      // Mori birth data survives every checkpoint: a REAL post-onboarding user
      // always has a birth year, and isBrandNewUser() keys on it. Wiping it made
      // the 'blank' checkpoint read as brand-new -> NO card on the home (Malik
      // v681: "Blank card" showed the Start hero with no card). Fall back to the
      // founder demo's birth data when the session has none.
      const keepMori = clone(state.mori || {});
      const demoMori = demo ? clone(demo.mori || {}) : {};
      // Deterministic + coherent: every checkpoint is seeded from the founder
      // demo's content (a realistic real user). Base is a fully CLEAN default for
      // the early steps (no leftover activity/history leaking through), or the
      // full lived-in founder demo for 'ongoing'. Copied onto the live state
      // object IN PLACE so every existing reference stays valid.
      const base = clone((step === 'ongoing' && demo) ? demo : DS);
      Object.keys(base).forEach(k => { state[k] = base[k]; });
      state.profile = keepProfile; state.prefs = keepPrefs;
      state.mori = state.mori || {};
      if (keepMori.birthYear || demoMori.birthYear) state.mori.birthYear = keepMori.birthYear || demoMori.birthYear;
      if (keepMori.lifeExpectancy || demoMori.lifeExpectancy) state.mori.lifeExpectancy = keepMori.lifeExpectancy || demoMori.lifeExpectancy;
      state.profile.onboarded = true;
      state.meta = state.meta || {}; state.meta.onboarded = true; state.meta.welcomeSeen = true;
      state.entitlements = state.entitlements || {}; state.dev = state.dev || {};
      state.clarity = state.clarity || {}; state.action = state.action || {};
      const starC = () => demo ? clone(demo.clarity) : clone(DS.clarity || {});
      const planC = () => demo ? clone(demo.action) : clone(DS.action || {});
      const free = () => { state.entitlements = { isPaid: false, paidAt: null, plan: '' }; state.prefs.unlockAll = false; state.dev.previewAll = false; };
      const paid = () => { state.entitlements = { isPaid: true, paidAt: nowISO, plan: 'lifetime' }; state.prefs.unlockAll = true; };
      const setStar = (ignAt) => { state.clarity = starC(); state.clarity.completed = true; if (!state.clarity.completedAt) state.clarity.completedAt = nowISO; state.clarity.ignitedAt = ignAt; };
      const setPlan = () => { state.action = planC(); state.action.planGenerated = true; state.action.introSeen = true; state.action.intake = { completed: true }; };

      switch (step) {
        case 'blank':                 // brand-new, pre-Clarity: nothing lit
          free(); state.meta.cardEvolutionSeen = true;
          break;
        case 'star':                  // star found + ignited, FREE, no plan (real post-Clarity beat -> paywall)
          setStar(now); free(); state.meta.cardEvolutionSeen = true;
          break;
        case 'unlock':                // just ignited, card-evolution NOT seen -> the real cinema plays on render
          setStar(now); free(); state.meta.cardEvolutionSeen = false;
          break;
        case 'discovered':            // v937: star + a DISCOVERED plan, paid, cinema not seen.
          // The Action evolution's real precondition. setPlan() gives exactly
          // the shape that lights Action (planGenerated + primaryAction), so
          // the cinema has an earned state to settle ONTO instead of draining
          // back to cyan. It also puts the real move in the Today box.
          setStar(now); setPlan(); paid(); state.meta.cardEvolutionSeen = false;
          break;
        case 'consistent': {          // v938: star + plan + paid + REAL logged history.
          // Evolution 3's precondition. Consistency is computed from logged
          // days, so seeding 'unlock' (no history) gave the green cinema
          // nothing to settle onto and it drained exactly like the platinum
          // did. Five of the last seven days is enough to read as green.
          setStar(now); setPlan(); paid(); state.meta.cardEvolutionSeen = false;
          const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
          const day = (d) => iso(d).slice(0, 10);
          const pa2 = state.action.primaryAction || {};
          const hist = [];
          const streakDays = [];
          for (let d = 0; d < 7; d++) {
            if (d === 2 || d === 5) continue;          // two honest misses
            const rec = createActionCompletionRecord(pa2, 'moderate', pa2.title || 'Today’s action');
            rec.date = iso(d);
            hist.push(rec);
            streakDays.push(day(d));
          }
          state.action.completionHistory = hist;
          state.streak = { history: streakDays, count: 2, bestEver: 3, bestEverShown: 3 };
          break;
        }
        case 'day1': {                // paid, plan generated, the FIRST action just completed today
          setStar(now); setPlan(); paid(); state.meta.cardEvolutionSeen = true;
          delete state.meta.firstActionDone;   // let the first-win moment re-fire
          const todayISO = (typeof getTodayISO === 'function') ? getTodayISO() : nowISO.slice(0, 10);
          const pa = state.action.primaryAction || {};
          const seededCompletion = createActionCompletionRecord(pa, 'moderate', pa.title || 'Today’s action');
          seededCompletion.date = nowISO;
          state.action.completionHistory = [seededCompletion];
          state.streak = { history: [todayISO], count: 1, bestEver: 1, bestEverShown: 1 };
          break;
        }
        case 'ongoing':               // full lived-in user (a year of history from the founder demo)
        default:
          state.clarity.completed = true; state.clarity.ignitedAt = now - 12 * 86400000; if (!state.clarity.completedAt) state.clarity.completedAt = nowISO;
          state.action.planGenerated = true;
          paid(); state.meta.cardEvolutionSeen = true;
          break;
      }
      try { if (typeof persistNow === 'function') persistNow(); } catch (e) {}
      try { if (typeof renderGrid === 'function') renderGrid(); } catch (e) {}
      try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
      // Reflect the seeded step in the bar: show()/updateHomeDot self-gate on the
      // real state (bar hidden pre-star, shown + Do status light once ignited).
      try { if (typeof TabBar !== 'undefined' && TabBar.show) { TabBar.show(); TabBar.updateHomeDot(); } } catch (e) {}
    } catch (e) {}
  },
  // Close any open experience/overlay and land on the real home, so a seeded
  // step plays on the actual app surface (not under a leftover overlay).
  _devToHome() {
    try {
      const r = document.getElementById('nsv2Root'); if (r) r.remove();
      if (typeof ClarityExperience !== 'undefined' && ClarityExperience.close && ClarityExperience.isOpen) ClarityExperience.close();
      if (typeof ActionExperience !== 'undefined' && ActionExperience.close) ActionExperience.close();
      document.getElementById('clarityPaywall')?.remove();
      if (typeof ClarityPaywall !== 'undefined') ClarityPaywall._open = false;
      if (typeof Sheet !== 'undefined' && Sheet.isOpen) Sheet.close();
      document.body.style.overflow = '';
      if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo('home');
    } catch (e) {}
  },

  jumpBlankCard() { this._closeAll(); this._devToHome(); this._seedStep('blank'); },
  // Right AFTER the cinema + clarity (Malik v799): the freshly colored card on
  // the home, star ignited, FREE, First 7 Days unseen. From here the real flow
  // walks: Build my plan -> First 7 Days -> paywall.
  jumpAfterCinema() { this._closeAll(); this._devToHome(); this._seedStep('star'); },

  // The onboarding CELEBRATION (confetti) page (Malik v810), from which the
  // real flow continues: Continue -> the mirror recap -> the rest. Opens the
  // welcome intro straight at the first-win beat.
  jumpCelebration() {
    this._closeAll(); this._devToHome();
    try {
      const wi = (typeof WelcomeIntro !== 'undefined') ? WelcomeIntro : null;
      if (!wi) return;
      if (!wi.el) wi.el = document.getElementById('welcomeIntro');
      if (!wi.el) return;
      if (!wi.pageWrap) wi.pageWrap = wi.el.querySelector('.welcome-intro__page-wrap');
      if (!wi.navEl) wi.navEl = wi.el.querySelector('.welcome-intro__nav');
      wi.el.classList.add('open');
      document.body.style.overflow = 'hidden';
      wi._showFirstWin(0);
    } catch (e) {}
  },
  jumpUnlockCinema() {
    this._closeAll(); this._devToHome();
    // Seed a real just-ignited state with the cinema unseen; renderGrid inside
    // _seedStep runs the REAL _maybeRunCardEvolution, so the actual cinema plays.
    this._seedStep('unlock');
  },
  // v916 (Malik): watch the other two evolutions on demand. The card earns its
  // layers one moment at a time (cyan at Clarity, platinum when the Action plan
  // is revealed, green on the first completed action) and it is the SAME cinema
  // every time, only the wash colour changes. So this replays the real unlock
  // cinema with the colour class applied, rather than faking a second animation.
  // The class is cleared after the run so it can never leak into the next one.
  jumpEvoColour(cls, stage) {
    // v937: set the stage BEFORE anything that can render. _devToHome() paints
    // the home, and painting home is what kicks off the cinema, so setting this
    // afterwards meant the cinema had already read a null stage and run
    // Clarity's blank-to-cyan script. That ordering is why the first attempt at
    // this silently did nothing.
    window._evoStageKind = stage || null;
    this._closeAll(); this._devToHome();
    try {
      document.body.classList.remove('evo2-plat', 'evo2-green');
      if (cls) document.body.classList.add(cls);
    } catch (e) {}
    // Seed what the evolution is actually celebrating. The platinum's
    // precondition is a DISCOVERED plan (planGenerated + primaryAction), which
    // is what lights Action since v936; without it the reward correctly drains
    // the moment the wash fades, which is the bug Malik filmed.
    this._seedStep(stage === 'action' ? 'discovered'
                 : stage === 'consistency' ? 'consistent'
                 : 'unlock');
    // The cinema is ~10.5s end to end (grow -> surge -> orb -> settle -> beams).
    // Clear a little past that; _evoFinish does not know about the colour class.
    clearTimeout(this._evoColourTimer);
    this._evoColourTimer = setTimeout(() => {
      try { document.body.classList.remove('evo2-plat', 'evo2-green'); } catch (e) {}
    }, 13000);
  },
  // The CEREMONY jumps open the real Clarity ceremony, which is already state-
  // accurate: the hold ignites for real, then Add-to-Memento plays the real card
  // cinema -> First 7 Days -> paywall. Seeding state here PRE-SET ignitedAt +
  // cardEvolutionSeen, which skipped the cinema and fired the paywall early
  // (Malik v674). So these enter the natural flow untouched, no seeding.
  // v721 (Malik): land on the FINAL clarity question. Writes a crafted
  // near-complete discovery draft, then opens Clarity so the REAL resume
  // restore (tap Continue) mounts the last question through production code.
  jumpFinalQuestion() {
    this._closeAll(); this._devToHome();
    try {
      // FULL clarity reset (v735): star residue from a prior jump (ignitedAt,
      // summary, answers) routed the resume straight to the summary card.
      // This must look like a genuine mid-questionnaire run.
      state.clarity = { completed: false, tutorialSeen: true, answers: {} };
      try { aiSynthesisResult = null; aiSynthesisLoading = false; } catch (e) {}
      const Q = (t) => ({ role: 'assistant', _act: 3, content: t });
      const A = (t) => ({ role: 'user', content: t });
      state.clarity.draft = {
        wizardAnswers: { knowDomain: 'yes', whatSpecifically: 'Get my product to 100 paying users' },
        wizardStep: 1 + 1,   // knowDomain -> whatSpecifically -> aiChat
        aiChatMessages: [
          { role: 'assistant', _act: 1, content: "Okay, let's start here. What's the one goal that matters above everything else right now?" }, A('Get my product to 100 paying users.'),
          { role: 'assistant', _act: 2, content: 'Locked: 100 paying users who would genuinely miss it. Why that, above everything else?' }, A('It would prove I can build something people actually need.'),
          Q('And why does proving that matter to you?'), A('Because I refuse to stay average. I want a life I chose.'),
          Q('What has stopped you before when you chased something like this?'), A('I scatter. I start five things and finish none.'),
          Q('What would it cost you if this never happened?'), A('Years. And always wondering if I could have.'),
          Q('Who benefits when you pull this off, besides you?'), A('My family. And every person the product actually helps.'),
          Q('What are you willing to give up for it?'), A('Comfort. Most of my scrolling. Some weekends.')
        ],
        // ready:false (v774, Malik): the jump must STOP on the final question
        // and let him actually answer it in the composer; his answer goes to
        // the real AI, which wraps the conversation (the transcript above is
        // complete enough that act 3 closes after one answer) and only then
        // moves to synthesis. ready:true skipped the answering beat entirely.
        aiChatReady: false,
        aiChatProgress: 96,
        aiCurrentQuestion: 'Last one. A year from now this either happened or it did not. What will have made the difference?',
        aiCurrentHint: 'Say it plainly. This is the spine of your star.',
        aiCurrentType: 'text',
        aiCurrentOptions: [],
        aiCurrentRange: null
      };
      persistNow();
      ClarityExperience.open();
      // Auto-tap Continue on the resume prompt (v735): the dev jump should
      // land ON the final question in one press, not two.
      let tries = 0;
      const auto = setInterval(() => {
        tries++;
        const b = document.getElementById('resumeContinue');
        if (b) { clearInterval(auto); b.click(); }
        else if (tries > 30) clearInterval(auto);
      }, 120);
    } catch (e) {}
  },
  jumpSynth() { this._closeAll(); try { if (window.DevCeremony) window.DevCeremony.synth(); } catch (e) {} },
  jump7Days() { this._closeAll(); try { state.meta = state.meta || {}; state.meta.next7DaysSeen = true; } catch (e) {} try { if (typeof showNext7Days === 'function') showNext7Days(function () { try { if (typeof ClarityPaywall !== 'undefined') { if (ClarityPaywall.isPaid()) { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); } else if (ClarityPaywall.show) ClarityPaywall.show(); } } catch (e) {} }); } catch (e) {} },

  // Straight to the paywall itself (force so it opens even on a paid dev state).
  jumpPaywall() { this._closeAll(); try { if (typeof ClarityPaywall !== 'undefined' && ClarityPaywall.show) ClarityPaywall.show({ force: true }); } catch (e) {} },
  // Fresh-buyer Action: wipes the module's flags + plan (NOT the completion
  // history, that feeds the home's streak/proofs) so opening Do replays the
  // exact first-open-after-paying flow: intro cinema -> the one question ->
  // plan generation -> reveal -> A5.
  restartAction() {
    this._closeAll();
    try {
      // v869 (Malik): the 7-days page has its own cheat (jump7Days); restart
      // goes straight into the module's first-time flow, no detour.
      state.meta.next7DaysSeen = true;
      state.action.introSeen = false;
      state.action.tutorialSeen = false;
      state.action.intake = { answers: {}, completed: false };
      state.action.planGenerated = false;
      state.action.primaryAction = null;
      state.action.supportingActions = [];
      state.action.focusPlan = null;
      state.action.aiConversation = [];
      state.meta.planRevealSeen = false;
      persistNow();
    } catch (e) {}
    try { ActionExperience.open(); } catch (e) {}
  },

  // The Deeper Room moments, straight in (gates bypassed for preview).
  jumpMori() { this._closeAll(); try { DeeperRoom.openMori({ force: true }); } catch (e) {} },
  jumpVivere() { this._closeAll(); try { DeeperRoom.openVivere({ force: true }); } catch (e) {} },
  // The end-state card with BOTH weaves already in it, no cinema: stamps the
  // flags, rebuilds the card, lands on home. Toggles OFF on second press.
  jumpWoven() {
    this._closeAll();
    try {
      state.meta = state.meta || {};
      const on = !(state.meta.moriMomentAt && state.meta.vivereMomentAt);
      state.meta.moriMomentAt = on ? Date.now() : null;
      state.meta.vivereMomentAt = on ? Date.now() : null;
      persistNow();
      if (typeof renderDayCard === 'function') renderDayCard();
      if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo('home');
    } catch (e) {}
  },
  // Straight to the Action module screen (A5/A9): clears the gates so the
  // intro/tutorial/intake never intercept, then opens the experience.
  jumpAction() {
    this._closeAll();
    try {
      state.meta.next7DaysSeen = true;
      state.action.introSeen = true;
      state.action.tutorialSeen = true;
      if (!state.action.intake) state.action.intake = { answers: {}, completed: true };
      else state.action.intake.completed = true;
      persistNow();
    } catch (e) {}
    try { ActionExperience.open(); } catch (e) {}
  },

  // Paid/Free switch (Malik v801): flips entitlements app-wide so both sides
  // of the paywall can be walked without buying. The label states the CURRENT
  // mode so the bar always tells the truth.
  _paidLabel() {
    const b = document.getElementById('creatorTogglePaid');
    if (!b) return;
    let paid = false;
    try { paid = !!(state.entitlements && state.entitlements.isPaid); } catch (e) {}
    b.textContent = paid ? 'Paid mode (tap for free)' : 'Free mode (tap for paid)';
  },
  togglePaid() {
    try {
      const paid = !(state.entitlements && state.entitlements.isPaid);
      if (paid) {
        state.entitlements = { isPaid: true, paidAt: new Date().toISOString(), plan: 'founder' };
        if (!state.prefs) state.prefs = {};
        state.prefs.unlockAll = true;
      } else {
        state.entitlements = { isPaid: false, paidAt: null, plan: '' };
        if (state.prefs) state.prefs.unlockAll = false;
        if (state.dev) state.dev.previewAll = false;
      }
      try { const pw = document.getElementById('clarityPaywall'); if (pw) pw.remove(); if (typeof ClarityPaywall !== 'undefined') ClarityPaywall._open = false; document.body.style.overflow = ''; } catch (e) {}
      try { persistNow(); } catch (e) {}
      try { renderGrid(); renderAll(); } catch (e) {}
      try {
        if (typeof TabBar !== 'undefined') {
          TabBar.show(); TabBar.updateHomeDot();
          const pp = document.getElementById('panelProfile');
          if (pp && !pp.classList.contains('hidden')) TabBar.renderPanel('profile');
        }
      } catch (e) {}
      this._paidLabel();
    } catch (e) {}
  },
  jumpReveal() { this._closeAll(); try { if (window.DevCeremony) window.DevCeremony.reveal(); } catch (e) {} },
  jumpStar() { this._closeAll(); try { if (window.DevCeremony) window.DevCeremony.star(); } catch (e) {} },
  jumpStarSummary() { this._closeAll(); try { if (window.DevCeremony) window.DevCeremony.summary(); } catch (e) {} },
  jumpDay1() {
    this._closeAll(); this._devToHome();
    this._seedStep('day1');
    try { if (typeof _maybeFirstWinMoment === 'function') _maybeFirstWinMoment(); } catch (e) {}
  },
  jumpNewDay() {
    this._closeAll(); this._devToHome();
    this._seedStep('ongoing');
    try {
      state.meta = state.meta || {};
      delete state.meta.lastNewDayPulse;
      const cc = document.getElementById('commandCenter');
      if (cc && typeof renderCommandCenter === 'function') { cc.innerHTML = renderCommandCenter(); if (typeof bindCommandCenter === 'function') bindCommandCenter(cc); }
    } catch (e) {}
  }
};

/* ============================================
   DAILY COMMAND CENTER
   The "what do I do right now" front door: one premium card above the dashboard
   grid, built from existing state (Neutron Star, primary action, tiers, streak).
   Shows the one thing, the minimum version, an if-resistance nudge, a start
   button, and a lightweight evening check-in. Routes into Clarity or Action when
   those are not set up. Additive: reads existing state, writes only the new
   optional state.commandCenter.checkins. Renders '' on any error so it can never
   break the dashboard.
   ============================================ */

/* ============================================
   PROOF TRAIL  (read-only)
   Makes every completed action visible evidence of change. Reuses the
   existing Sheet DOM (#sheet / #sheetBody / #sheetTitle / #sheetBackdrop)
   and the shared glass language. Strictly NON-DESTRUCTIVE: it only READS
   state.action.completionHistory plus streak / deepwork / distraction for
   the weekly summary. It never mutates, migrates, or writes state.
   ============================================ */
const ProofTrail = {
  _tierMeta(tier) {
    // Calm, glass-friendly tier badges. Falls back gracefully for unknown tiers.
    const map = {
      tiny: { label: 'Tiny', color: 'rgba(var(--success-rgb),0.95)', bg: 'rgba(var(--success-rgb),0.12)', bd: 'rgba(var(--success-rgb),0.32)' },
      light: { label: 'Light', color: 'rgba(94, 206, 103,0.95)', bg: 'rgba(94, 206, 103,0.12)', bd: 'rgba(94, 206, 103,0.32)' },
      moderate: { label: 'Moderate', color: 'rgba(123,160,255,0.95)', bg: 'rgba(123,160,255,0.12)', bd: 'rgba(123,160,255,0.32)' },
      heavy: { label: 'Heavy', color: 'rgba(58, 217, 245,0.95)', bg: 'rgba(58, 217, 245,0.14)', bd: 'rgba(58, 217, 245,0.34)' },
      extreme: { label: 'Extreme', color: 'rgba(255,107,107,0.95)', bg: 'rgba(255,107,107,0.12)', bd: 'rgba(255,107,107,0.34)' }
    };
    if (map[tier]) return map[tier];
    const t = tier ? String(tier) : '';
    return { label: t ? (t.charAt(0).toUpperCase() + t.slice(1)) : 'Done', color: 'var(--text-2)', bg: 'rgba(var(--ink),0.06)', bd: 'rgba(var(--ink),0.14)' };
  },

  _relativeDay(iso) {
    try {
      const k = _isoDayKey(iso);
      if (!k) return '';
      const diff = _dayNum(getTodayISO()) - _dayNum(k);
      if (diff <= 0) return 'Today';
      if (diff === 1) return 'Yesterday';
      if (diff < 7) return diff + ' days ago';
      const dt = new Date(k + 'T00:00:00');
      return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  },

  // "This week" summary computed live from existing state (last 7 days).
  _weekSummary() {
    const todayNum = _dayNum(getTodayISO());
    const within7 = (d) => { const k = _isoDayKey(d); if (!k) return false; const diff = todayNum - _dayNum(k); return diff >= 0 && diff < 7; };

    const ch = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
    const actionsThisWeek = ch.filter(h => h && within7(h.date)).length;

    let streak = 0;
    try { streak = (typeof consistencyStats === 'function') ? (consistencyStats().current || 0) : ((state.streak && state.streak.count) || 0); }
    catch (e) { streak = (state.streak && state.streak.count) || 0; }

    let deepMin = 0;
    (state.deepwork && Array.isArray(state.deepwork.sessions) ? state.deepwork.sessions : []).forEach(s => {
      if (s && within7(s.iso || s.date)) deepMin += (s.minutes || 0);
    });

    const catCounts = {};
    (state.distraction && Array.isArray(state.distraction.logs) ? state.distraction.logs : []).forEach(l => {
      if (l && within7(l.date) && l.category) catCounts[l.category] = (catCounts[l.category] || 0) + 1;
    });
    let topDistraction = null;
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 1).forEach(([c]) => { topDistraction = c; });

    return { actionsThisWeek, streak, deepMin, topDistraction };
  },

  // Unified event list across every kind of proof, newest first. Built from the
  // source arrays (so it works whether or not proofEvents has been derived, e.g.
  // demo). Each: { iso, ts, type, text }.
  _allEvents() {
    const out = [];
    const push = (rawDate, ts, type, text) => { const k = _isoDayKey(rawDate); if (!k) return; out.push({ iso: k, ts: ts || (Date.parse(k + 'T12:00:00') || 0), type: type, text: text }); };
    try {
      (state.action && state.action.completionHistory || []).forEach(h => { if (h) push(h.date, Date.parse(h.date) || 0, 'action', (h.actionText || h.planTitle || 'Completed an action')); });
      (state.deepwork && state.deepwork.sessions || []).forEach(s => { if (s) { const extra = s.note ? (': ' + s.note) : (s.intention ? (': ' + s.intention) : ''); push(s.iso || s.dateISO || s.date, Date.parse(s.iso || s.dateISO || '') || 0, 'deepwork', ((s.minutes || 0) + ' min deep work' + extra)); } });
      (state.reflection && state.reflection.entries || []).forEach(e => { if (e) push(e.iso || e.date, Date.parse(e.iso || e.date) || 0, 'reflection', ('Reflection: ' + String(e.text || '').slice(0, 90))); });
      // Memento Vivere: lived moments. Comes from proofEvents (the canonical log
      // for vivere) so daily practice, saved memories, and alive-list wins all
      // appear in the unified trail like every other kind of proof.
      (state.proofEvents || []).forEach(ev => {
        if (ev && ev.type === 'vivere') push(ev.iso, ev.ts || 0, 'vivere', ('Lived: ' + String(ev.text || 'a moment worth keeping').slice(0, 90)));
        // v19: generic proof captured from the Universal Inbox.
        else if (ev && ev.type === 'proof') push(ev.iso, ev.ts || 0, 'proof', ('Proof: ' + String(ev.text || 'evidence of work').slice(0, 90)));
      });
    } catch (err) {}
    out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return out;
  },
  _typeMeta(type) {
    const m = {
      action: { label: 'Action', color: 'rgba(123,160,255,0.95)', bg: 'rgba(123,160,255,0.12)', bd: 'rgba(123,160,255,0.32)' },
      deepwork: { label: 'Deep work', color: 'rgba(255,159,10,0.95)', bg: 'rgba(255,159,10,0.12)', bd: 'rgba(255,159,10,0.32)' },
      reflection: { label: 'Notes', color: 'rgba(90, 219, 242,0.95)', bg: 'rgba(90, 219, 242,0.12)', bd: 'rgba(90, 219, 242,0.32)' },
      vivere: { label: 'Lived', color: 'rgba(201,162,75,0.95)', bg: 'rgba(201,162,75,0.12)', bd: 'rgba(201,162,75,0.34)' },
      proof: { label: 'Proof', color: 'rgba(48,209,88,0.95)', bg: 'rgba(48,209,88,0.12)', bd: 'rgba(48,209,88,0.32)' }
    };
    return m[type] || { label: 'Event', color: 'rgba(var(--ink),0.7)', bg: 'rgba(var(--ink),0.08)', bd: 'rgba(var(--ink),0.2)' };
  },
  render() {
    const ch = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory.slice() : [];
    const allEv = this._allEvents();
    const PUR = 'rgba(58, 217, 245,0.92)';

    // Empty state: motivating, not guilt-trippy.
    if (!allEv.length) {
      return `<div style="padding:18px 4px 8px;text-align:center;">
        <div style="width:56px;height:56px;margin:6px auto 18px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--glass-bg);border:1px solid var(--glass-border);box-shadow:var(--glass-highlight);">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${PUR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--text-1);margin-bottom:8px;">Your proof starts with one.</div>
        <div style="font-size:0.92rem;line-height:1.6;color:var(--text-2);max-width:30ch;margin:0 auto;">Every action you finish lands here as evidence you are becoming someone different. Do today's one thing and watch the trail begin.</div>
      </div>`;
    }

    // This week summary (glass stat tiles).
    const w = this._weekSummary();
    const stat = (num, label) => `<div style="flex:1;min-width:0;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:calc(14px * var(--rx, 1));padding:12px 10px;text-align:center;box-shadow:var(--glass-highlight);">
        <div style="font-size:1.5rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-1);font-variant-numeric:tabular-nums;line-height:1;">${num}</div>
        <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-top:6px;">${label}</div>
      </div>`;
    const deepLabel = w.deepMin >= 60 ? (Math.round(w.deepMin / 6) / 10) + 'h' : w.deepMin + 'm';

    let html = '';
    html += `<div style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:${PUR};font-weight:700;margin-bottom:12px;">This week</div>`;
    html += `<div style="display:flex;gap:8px;margin-bottom:8px;">${stat(w.actionsThisWeek, 'actions done')}${stat(w.streak, 'day streak')}${stat(deepLabel, 'deep work')}</div>`;
    if (w.topDistraction) {
      html += `<div style="font-size:0.8rem;color:var(--text-2);margin:2px 0 4px;"><span style="color:var(--text-3);">Most common pull: </span>${esc(w.topDistraction)}</div>`;
    }

    html += '<div class="sheet-divider"></div>';

    // Unified timeline: actions, deep work, and reflections, most recent first.
    const items = allEv.slice(0, 80);
    html += `<div style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-3);font-weight:700;margin-bottom:14px;">${allEv.length} proof point${allEv.length === 1 ? '' : 's'}</div>`;
    html += '<div style="position:relative;padding-left:22px;">';
    html += '<div style="position:absolute;left:5px;top:6px;bottom:6px;width:1px;background:linear-gradient(180deg,rgba(var(--ink),0.18),rgba(var(--ink),0.04));"></div>';
    items.forEach((ev) => {
      const meta = this._typeMeta(ev.type);
      const when = this._relativeDay(ev.iso);
      html += `<div style="position:relative;padding:0 0 18px;">
        <div style="position:absolute;left:-22px;top:3px;width:11px;height:11px;border-radius:50%;background:var(--glass-bg-strong);border:2px solid ${meta.color};box-shadow:0 0 8px ${meta.bg};"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:0.7rem;color:var(--text-3);letter-spacing:0.02em;">${esc(when)}</span>
          <span style="font-size:0.62rem;font-weight:700;letter-spacing:0.04em;color:${meta.color};background:${meta.bg};border:1px solid ${meta.bd};border-radius:var(--pill-r);padding:2px 9px;">${esc(meta.label)}</span>
        </div>
        <div style="font-size:0.95rem;line-height:1.45;color:var(--text-1);">${esc(ev.text)}</div>
      </div>`;
    });
    html += '</div>';
    return html;
  },

  open() {
    try {
      if (typeof Sheet === 'undefined' || !Sheet.body) return;
      // If a regular widget sheet is open, fully reset its widget state first.
      Sheet.currentWidget = null;
      if (Sheet.titleEl) { Sheet.titleEl.textContent = 'Proof Trail'; Sheet.titleEl.style.color = 'rgba(58, 217, 245,0.95)'; }
      Sheet.body.innerHTML = this.render();
      if (Sheet.el) { Sheet.el.classList.add('open'); Sheet.el.setAttribute('aria-hidden', 'false'); }
      if (Sheet.backdrop) Sheet.backdrop.classList.add('active');
      Sheet.isOpen = true;
      document.body.style.overflow = 'hidden';
      if (Sheet.body.scrollTo) Sheet.body.scrollTo(0, 0); else Sheet.body.scrollTop = 0;
    } catch (e) {}
  },

  // A calm, premium confirmation moment when an action is marked done.
  // Purely visual + self-removing: it touches NOTHING in the completion
  // logic or state. Safe to call (or not) after a completion is recorded.
  flash() {
    try {
      if (typeof document === 'undefined' || !document.body) return;
      const el = document.createElement('div');
      el.className = 'proof-flash';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<span class="proof-flash__ring">'
        + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        + '</span><span class="proof-flash__text">Added to your proof trail</span>';
      document.body.appendChild(el);
      // Force reflow so the entrance transition runs, then schedule exit + cleanup.
      void el.offsetWidth;
      el.classList.add('proof-flash--in');
      setTimeout(() => { el.classList.remove('proof-flash--in'); el.classList.add('proof-flash--out'); }, 1500);
      setTimeout(() => { if (el && el.parentNode) el.parentNode.removeChild(el); }, 2050);
    } catch (e) {}
  }
};

// Weekly Review: a calm recap of the week's proof. Reads the same source data as
// the rest of the app (no AI required) and offers a share. Opens in the shared
// Sheet, mirroring ProofTrail.
const WeeklyReview = {
  _data() {
    const wp = (typeof weekProofSummary === 'function') ? weekProofSummary() : { actions: 0, deepwork: 0, reflections: 0, distractions: 0, days: 0 };
    let cs = { thisWeek: 0, lastWeek: 0, current: 0, longest: 0 };
    try { cs = consistencyStats(); } catch (e) {}
    let deepMin = 0;
    try {
      const todayNum = _dayNum(getTodayISO());
      (state.deepwork && state.deepwork.sessions || []).forEach(s => { const k = _isoDayKey(s && (s.iso || s.dateISO || s.date)); if (k) { const diff = todayNum - _dayNum(k); if (diff >= 0 && diff <= 6) deepMin += (s.minutes || 0); } });
    } catch (e) {}
    return { wp, cs, deepMin };
  },
  render() {
    const d = this._data();
    const PUR = 'rgba(58, 217, 245,0.92)';
    const goal = (state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) || '';
    const deepLabel = d.deepMin >= 60 ? (Math.round(d.deepMin / 6) / 10) + 'h' : d.deepMin + 'm';
    const stat = (num, label) => `<div style="flex:1;min-width:0;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:calc(14px * var(--rx, 1));padding:12px 8px;text-align:center;box-shadow:var(--glass-highlight);">
        <div style="font-size:1.4rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-1);font-variant-numeric:tabular-nums;line-height:1;">${num}</div>
        <div style="font-size:0.58rem;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-3);margin-top:6px;">${label}</div>
      </div>`;
    let html = '';
    html += `<div style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:${PUR};font-weight:700;margin-bottom:6px;">Your week</div>`;
    if (goal) html += `<div style="font-size:0.85rem;color:var(--text-2);margin-bottom:16px;line-height:1.4;"><span style="color:var(--text-3);">Toward: </span>${esc(goal)}</div>`;
    if (!d.wp.days && !d.wp.actions && !d.wp.deepwork && !d.wp.reflections) {
      html += `<div class="empty-state"><div class="empty-state__label">No proof yet this week</div><div class="empty-state__hint">One action, one reflection, or one deep work block and your week starts taking shape. Come back and watch it add up.</div><hr class="empty-state__rule" aria-hidden="true"></div>`;
      return html;
    }
    html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">${stat(d.cs.thisWeek + '/7', 'days lived')}${stat(d.wp.actions, 'actions')}${stat(deepLabel, 'deep work')}${stat(d.wp.reflections, 'reflections')}</div>`;
    const delta = d.cs.thisWeek - d.cs.lastWeek;
    const deltaTxt = delta > 0 ? ('up ' + delta + ' from last week') : (delta < 0 ? (Math.abs(delta) + ' fewer than last week') : 'same as last week');
    html += `<div style="font-size:0.85rem;color:var(--text-2);margin:14px 0;">You showed up ${d.cs.thisWeek} of 7 days, ${esc(deltaTxt)}.</div>`;
    let line = '';
    if (d.wp.actions >= 5) line = 'Strong week of doing. Five or more actions is a real cadence, not a fluke.';
    else if (d.cs.thisWeek >= 5) line = 'You kept showing up. Consistency like this is how the goal slowly becomes inevitable.';
    else if (d.wp.deepwork >= 2) line = 'Real focused work landed this week. Protect the conditions that made it happen.';
    else if (d.wp.days >= 1) line = 'You touched it this week. Next week, aim for one more day than this one.';
    if (line) html += `<div style="padding:14px 16px;border-radius:var(--card-r);background:var(--surface-1);border:1px solid var(--hairline);font-size:0.9rem;line-height:1.5;color:var(--text-1);margin-bottom:14px;">${esc(line)}</div>`;
    html += `<button id="wrShare" class="sheet-btn" style="background:var(--surface-2);color:var(--text-hi);border:1px solid var(--hairline);">Share this week</button>`;
    return html;
  },
  bind() {
    try {
      const s = Sheet.body && Sheet.body.querySelector('#wrShare');
      if (s) s.addEventListener('click', () => { try { ShareStudio.type = 'weekly'; ShareStudio.open(); } catch (e) {} });
    } catch (e) {}
  },
  open() {
    try {
      if (typeof Sheet === 'undefined' || !Sheet.body) return;
      Sheet.currentWidget = null;
      if (Sheet.titleEl) { Sheet.titleEl.textContent = 'Weekly review'; Sheet.titleEl.style.color = 'rgba(58, 217, 245,0.95)'; }
      Sheet.body.innerHTML = this.render();
      this.bind();
      if (Sheet.el) { Sheet.el.classList.add('open'); Sheet.el.setAttribute('aria-hidden', 'false'); }
      if (Sheet.backdrop) Sheet.backdrop.classList.add('active');
      Sheet.isOpen = true;
      document.body.style.overflow = 'hidden';
      if (Sheet.body.scrollTo) Sheet.body.scrollTo(0, 0); else Sheet.body.scrollTop = 0;
    } catch (e) {}
  }
};

/* ============================================
   SHARE CARD STUDIO  (additive, read-only)
   Lets the user export a premium dark Memento-branded card from their
   own data (Neutron Star / Today's One Thing / Weekly Proof). Reuses the
   existing Sheet DOM (#sheet / #sheetBody / #sheetTitle / #sheetBackdrop)
   exactly like ProofTrail. Strictly NON-DESTRUCTIVE: it only READS state
   (clarity answers, primaryAction, completionHistory, streak, deepwork).
   The on-screen UI uses the shared glass language. The exported PNG is a
   designed dark gradient card drawn on a <canvas> (a canvas cannot do
   backdrop-blur, so we render a premium dark gradient instead of glass).
   ============================================ */
// v25 prune (Malik): the Share Card Studio is intentionally UNREACHABLE. All
// entry points (Review link, palette verb, action-plan footer, weekly review
// button) were removed; the cards looked tacky and public surfaces represent
// the brand. The implementation stays for a future redesign; share.html and
// CloudSync.createShare are likewise dormant.
const ShareStudio = {
  type: 'neutron',          // 'neutron' | 'today' | 'weekly'
  privateMode: false,       // hide name when true
  _lastDataUrl: '',
  _canvasOk: null,          // null=untested, true/false after first probe

  // ---- Accent + brand constants (match clarity purple tokens) ----
  PURPLE: 'rgba(58, 217, 245,0.92)',

  // ---- Read-only data gatherers (never mutate) ----
  _ns() {
    const a = (state.clarity && state.clarity.answers) || {};
    return {
      goal: (a.neutronStar || '').trim(),
      why: (a.coreWhy || a.whyItMatters || '').trim(),
      identity: (a.identityLine || '').trim()
    };
  },
  _today() {
    const pa = (state.action && state.action.primaryAction) || {};
    const tiers = pa.tiers || {};
    const rec = (['tiny','light','moderate','heavy','extreme'].indexOf(pa.recommendedTier) >= 0) ? pa.recommendedTier : 'moderate';
    const action = (tiers[rec] || pa.title || '').trim();
    return {
      action: action,
      why: (pa.why || '').trim(),
      tier: rec
    };
  },
  _weekly() {
    // Mirror ProofTrail._weekSummary logic (read-only) so numbers match.
    let actions = 0, streak = 0, deepMin = 0;
    try {
      const todayNum = _dayNum(getTodayISO());
      const within7 = (d) => { const k = _isoDayKey(d); if (!k) return false; const diff = todayNum - _dayNum(k); return diff >= 0 && diff < 7; };
      const ch = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
      actions = ch.filter(h => h && within7(h.date)).length;
      (state.deepwork && Array.isArray(state.deepwork.sessions) ? state.deepwork.sessions : []).forEach(s => {
        if (s && within7(s.iso || s.date)) deepMin += (s.minutes || 0);
      });
    } catch (e) {}
    try { streak = (typeof consistencyStats === 'function') ? (consistencyStats().current || 0) : ((state.streak && state.streak.count) || 0); }
    catch (e) { streak = (state.streak && state.streak.count) || 0; }
    return { actions, streak, deepMin };
  },
  _name() {
    if (this.privateMode) return '';
    return ((state.profile && state.profile.name) || '').trim();
  },
  _availableTypes() {
    // Only offer cards the user actually has data for.
    const out = [];
    const ns = this._ns();
    if (ns.goal) out.push('neutron');
    if (this._today().action) out.push('today');
    const w = this._weekly();
    if (w.actions || w.streak || w.deepMin) out.push('weekly');
    if (state.mori && state.mori.birthYear) out.push('mori');
    return out;
  },

  // ---- Plain-text version for the Copy button ----
  _textFor(type) {
    const tag = '\n\nMy Memento';
    if (type === 'neutron') {
      const d = this._ns();
      let t = 'My Neutron Star\n\n' + d.goal;
      if (d.why) t += '\n\nWhy: ' + d.why;
      if (d.identity) t += '\n\n' + d.identity;
      return t + tag;
    }
    if (type === 'today') {
      const d = this._today();
      let t = "Today's one thing\n\n" + d.action;
      if (d.why) t += '\n\n' + d.why;
      return t + tag;
    }
    if (type === 'mori') {
      const le = (state.mori && state.mori.lifeExpectancy) || 80;
      const yl = (typeof moriYearsRemaining === 'function') ? moriYearsRemaining(state.mori.birthYear, le) : null;
      const wl = yl != null ? Math.max(0, Math.round(yl * 52)) : 0;
      const note = (state.prefs && state.prefs.anchorQuote) || (state.mori && state.mori.reminderText) || 'Make it count.';
      return 'My life in weeks\n\n~' + wl.toLocaleString() + ' weeks left.\n\n' + note + tag;
    }
    const w = this._weekly();
    const deep = w.deepMin >= 60 ? (Math.round(w.deepMin / 6) / 10) + 'h' : w.deepMin + 'm';
    return 'My week of proof\n\n' + w.actions + ' actions done\n' + w.streak + ' day streak\n' + deep + ' of deep work' + tag;
  },

  // ---- Canvas text helper: wrap into <=maxLines lines within maxWidth ----
  _wrap(ctx, text, maxWidth, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      // Hard-truncate a single token longer than the line (a pasted URL or a very
      // long hashtag) so it can never run off the card edge.
      if (ctx.measureText(words[i]).width > maxWidth) {
        let wtr = words[i];
        while (wtr.length > 1 && ctx.measureText(wtr + '…').width > maxWidth) wtr = wtr.slice(0, -1);
        words[i] = wtr + '…';
      }
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
        if (lines.length === maxLines - 1) {
          // Last allowed line: dump the rest, ellipsize if needed.
          let rest = words.slice(i).join(' ');
          while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 1) {
            rest = rest.slice(0, -1);
          }
          if (words.slice(i).join(' ') !== rest) rest = rest.replace(/\s+\S*$/, '') + '…';
          lines.push(rest);
          return lines;
        }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  },

  // ---- Draw the selected card onto a canvas (designed dark, no glass) ----
  // Returns the canvas. Uses only system fonts so toDataURL is reliable.
  _draw(canvas, type) {
    const W = 1080, H = 1350;            // 4:5 portrait, great for social
    const dpr = 1;                        // export resolution is fixed at W/H
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, W, H);
    const FF = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    // --- Background: rich dark vertical gradient + purple radial bloom ---
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#131d1f');
    bg.addColorStop(0.55, '#0c1314');
    bg.addColorStop(1, '#070c0d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const bloom = ctx.createRadialGradient(W * 0.78, H * 0.16, 0, W * 0.78, H * 0.16, W * 0.95);
    bloom.addColorStop(0, 'rgba(58, 217, 245,0.30)');
    bloom.addColorStop(0.4, 'rgba(58, 217, 245,0.10)');
    bloom.addColorStop(1, 'rgba(58, 217, 245,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, W, H);

    // Subtle bottom-left cool wash for depth.
    const wash = ctx.createRadialGradient(W * 0.12, H * 0.92, 0, W * 0.12, H * 0.92, W * 0.8);
    wash.addColorStop(0, 'rgba(60,80,160,0.12)');
    wash.addColorStop(1, 'rgba(60,80,160,0)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    // Inner hairline border (premium framing).
    const M = 84;                          // safe margin
    ctx.strokeStyle = 'rgba(var(--ink),0.10)';
    ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(40, 40, W - 80, H - 80, 36); ctx.stroke(); }

    // --- Top eyebrow (card kind) + Memento mark on top row ---
    const eyebrowMap = { neutron: 'NEUTRON STAR', today: "TODAY'S ONE THING", weekly: 'A WEEK OF PROOF', mori: 'YOUR LIFE IN WEEKS' };
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = this.PURPLE;
    ctx.font = '700 26px ' + FF;
    // letter-spacing emulation
    this._spacedText(ctx, eyebrowMap[type] || 'MEMENTO', M, M + 30, 5);

    // Accent dot + small underline beneath eyebrow.
    ctx.fillStyle = 'rgba(58, 217, 245,0.55)';
    ctx.fillRect(M, M + 50, 64, 4);

    // --- Body per card type ---
    if (type === 'neutron') this._drawNeutron(ctx, W, H, M, FF);
    else if (type === 'today') this._drawToday(ctx, W, H, M, FF);
    else if (type === 'mori') this._drawMori(ctx, W, H, M, FF);
    else this._drawWeekly(ctx, W, H, M, FF);

    // --- Footer: Memento wordmark + optional name ---
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(var(--ink),0.92)';
    ctx.font = '800 30px ' + FF;
    this._spacedText(ctx, 'MEMENTO', M, H - M + 4, 3);
    // diamond glyph before/era accent
    ctx.fillStyle = this.PURPLE;
    ctx.save();
    ctx.translate(M - 30, H - M - 7);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-7, -7, 14, 14);
    ctx.restore();

    const nm = this._name();
    if (nm) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(var(--ink),0.42)';
      ctx.font = '500 26px ' + FF;
      const nmText = this._wrap(ctx, nm, W * 0.45, 1)[0] || '';
      ctx.fillText(nmText, W - M, H - M + 2);
    }

    return canvas;
  },

  // Draw text with crude letter-spacing (canvas has no native letterSpacing
  // across all engines). Renders char-by-char from a left baseline.
  _spacedText(ctx, str, x, y, gap) {
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    let cx = x;
    for (const ch of String(str)) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + gap;
    }
    ctx.textAlign = prevAlign;
  },

  _drawNeutron(ctx, W, H, M, FF) {
    const d = this._ns();
    ctx.textAlign = 'left';
    let y = M + 150;

    // Big goal statement (the hero).
    ctx.fillStyle = 'rgba(var(--ink),0.97)';
    const goalSize = d.goal.length > 90 ? 56 : (d.goal.length > 55 ? 64 : 74);
    ctx.font = '800 ' + goalSize + 'px ' + FF;
    const goalLines = this._wrap(ctx, d.goal, W - M * 2, 5);
    const lh = goalSize * 1.18;
    goalLines.forEach(l => { ctx.fillText(l, M, y); y += lh; });

    y += 24;
    // Why block.
    if (d.why) {
      ctx.fillStyle = this.PURPLE;
      ctx.font = '700 24px ' + FF;
      this._spacedText(ctx, 'WHY IT MATTERS', M, y, 4);
      y += 44;
      ctx.fillStyle = 'rgba(var(--ink),0.62)';
      ctx.font = '400 34px ' + FF;
      const whyLines = this._wrap(ctx, d.why, W - M * 2, 4);
      whyLines.forEach(l => { ctx.fillText(l, M, y); y += 46; });
    }

    // Identity line, sits near the bottom as a quiet anchor.
    if (d.identity) {
      ctx.fillStyle = 'rgba(58, 217, 245,0.85)';
      ctx.font = 'italic 600 36px ' + FF;
      const idLines = this._wrap(ctx, '“' + d.identity + '”', W - M * 2, 3);
      let iy = H - M - 120 - (idLines.length - 1) * 48;
      idLines.forEach(l => { ctx.fillText(l, M, iy); iy += 48; });
    }
  },

  _drawToday(ctx, W, H, M, FF) {
    const d = this._today();
    ctx.textAlign = 'left';

    // The action, vertically centered-ish hero.
    ctx.fillStyle = 'rgba(var(--ink),0.97)';
    const aSize = d.action.length > 70 ? 62 : (d.action.length > 40 ? 72 : 86);
    ctx.font = '800 ' + aSize + 'px ' + FF;
    const lines = this._wrap(ctx, d.action, W - M * 2, 5);
    const lh = aSize * 1.16;
    const blockH = lines.length * lh;
    let y = (H - blockH) / 2 + aSize * 0.4;
    lines.forEach(l => { ctx.fillText(l, M, y); y += lh; });

    // Why, beneath.
    if (d.why) {
      y += 18;
      ctx.fillStyle = 'rgba(var(--ink),0.58)';
      ctx.font = '400 32px ' + FF;
      const whyLines = this._wrap(ctx, d.why, W - M * 2, 3);
      whyLines.forEach(l => { ctx.fillText(l, M, y); y += 44; });
    }
  },

  _drawWeekly(ctx, W, H, M, FF) {
    const w = this._weekly();
    const deep = w.deepMin >= 60 ? (Math.round(w.deepMin / 6) / 10) + 'h' : w.deepMin + 'm';
    const stats = [
      [String(w.actions), 'ACTIONS DONE'],
      [String(w.streak), 'DAY STREAK'],
      [deep, 'DEEP WORK']
    ];

    let y = M + 200;
    ctx.textAlign = 'left';
    stats.forEach((s, i) => {
      // Big number.
      ctx.fillStyle = 'rgba(var(--ink),0.97)';
      ctx.font = '800 130px ' + FF;
      ctx.fillText(s[0], M, y);
      const numW = ctx.measureText(s[0]).width;
      // Label to the right, baseline-aligned low.
      ctx.fillStyle = this.PURPLE;
      ctx.font = '700 30px ' + FF;
      this._spacedText(ctx, s[1], M + numW + 36, y - 6, 4);
      // Divider line.
      if (i < stats.length - 1) {
        ctx.strokeStyle = 'rgba(var(--ink),0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(M, y + 56); ctx.lineTo(W - M, y + 56); ctx.stroke();
      }
      y += 250;
    });
  },

  _drawMori(ctx, W, H, M, FF) {
    const by = state.mori && state.mori.birthYear;
    const le = (state.mori && state.mori.lifeExpectancy) || 80;
    const yearsLeft = (typeof moriYearsRemaining === 'function') ? moriYearsRemaining(by, le) : null;
    const totalWeeks = le * 52;
    const weeksLeft = (yearsLeft != null) ? Math.max(0, Math.round(yearsLeft * 52)) : 0;
    const weeksLived = Math.max(0, totalWeeks - weeksLeft);
    // Big weeks-left number.
    const y = M + 150;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(var(--ink),0.97)';
    ctx.font = '800 150px ' + FF;
    ctx.fillText(weeksLeft.toLocaleString(), M, y);
    ctx.fillStyle = this.PURPLE;
    ctx.font = '700 34px ' + FF;
    this._spacedText(ctx, 'WEEKS LEFT', M + 6, y + 46, 4);
    // Life-in-weeks dot grid: lived (light), current (accent), remaining (faint).
    const cols = 52;
    const rows = le;
    const gridTop = y + 110;
    const gridBottom = H - M - 130;
    const availH = Math.max(40, gridBottom - gridTop);
    const availW = W - 2 * M;
    const cellW = availW / cols;
    const cellH = availH / rows;
    const r = Math.max(1.4, Math.min(cellW, cellH) * 0.34);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const idx = i * cols + j;
        const cx = M + j * cellW + cellW / 2;
        const cy = gridTop + i * cellH + cellH / 2;
        const isCurrent = (idx === weeksLived);
        ctx.beginPath();
        ctx.arc(cx, cy, isCurrent ? r * 1.6 : r, 0, Math.PI * 2);
        if (idx < weeksLived) ctx.fillStyle = 'rgba(var(--ink),0.50)';
        else if (isCurrent) ctx.fillStyle = this.PURPLE;
        else ctx.fillStyle = 'rgba(var(--ink),0.11)';
        ctx.fill();
      }
    }
    // Anchor quote / reminder beneath the grid.
    const note = (state.prefs && state.prefs.anchorQuote) || (state.mori && state.mori.reminderText) || 'Make it count.';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(var(--ink),0.72)';
    ctx.font = '500 30px ' + FF;
    const lines = this._wrap(ctx, note, W - 2 * M, 2);
    let qy = gridBottom + 50;
    lines.forEach(ln => { ctx.fillText(ln, M, qy); qy += 38; });
  },

  // ---- Probe: does this canvas produce a non-blank PNG? (safety gate) ----
  _probeCanvas() {
    try {
      const c = document.createElement('canvas');
      c.width = 40; c.height = 40;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      ctx.fillStyle = '#3ad9f5';
      ctx.fillRect(0, 0, 40, 40);
      const url = c.toDataURL('image/png');
      // A 40x40 solid PNG data URL is comfortably > 200 chars; blank/tainted fails.
      return typeof url === 'string' && url.indexOf('data:image/png') === 0 && url.length > 200;
    } catch (e) { return false; }
  },

  // ---- Render the current selection into the on-screen preview canvas ----
  _refreshPreview() {
    try {
      const canvas = document.getElementById('shareCanvas');
      if (!canvas) return;
      this._draw(canvas, this.type);
      // Cache a data URL for download + keep a safety check fresh.
      try {
        const url = canvas.toDataURL('image/png');
        this._lastDataUrl = (typeof url === 'string' && url.indexOf('data:image/png') === 0 && url.length > 1000) ? url : '';
      } catch (e) { this._lastDataUrl = ''; }
    } catch (e) {}
  },

  // ---- Build the studio HTML (glass language) ----
  render() {
    const types = this._availableTypes();
    if (!types.length) {
      return '<div style="padding:18px 4px 8px;text-align:center;">'
        + '<div style="font-size:1.15rem;font-weight:700;color:var(--text-1);margin-bottom:8px;">Nothing to share just yet.</div>'
        + '<div style="font-size:0.92rem;line-height:1.6;color:var(--text-2);max-width:32ch;margin:0 auto;">Find your Neutron Star and finish a few actions, then come back to export a card you can be proud of.</div>'
        + '</div>';
    }
    if (types.indexOf(this.type) < 0) this.type = types[0];

    const label = { neutron: 'Neutron Star', today: "Today's One Thing", weekly: 'Weekly Proof', mori: 'Life in Weeks' };
    const P = this.PURPLE;

    let h = '';
    h += '<div style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:' + P + ';font-weight:700;margin-bottom:6px;">Share a card</div>';
    h += '<div style="font-size:0.9rem;line-height:1.5;color:var(--text-2);margin-bottom:16px;">Turn your progress into a card worth posting.</div>';

    // Type switcher (glass pills).
    h += '<div role="tablist" style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;">';
    types.forEach(t => {
      const active = t === this.type;
      h += '<button class="share-type" data-share-type="' + t + '" role="tab" aria-selected="' + active + '" style="'
        + 'font:inherit;font-weight:650;font-size:0.82rem;cursor:pointer;border-radius:var(--pill-r);padding:8px 15px;'
        + (active
            ? 'background:rgba(58, 217, 245,0.18);color:var(--text-hi);border:1px solid rgba(58, 217, 245,0.45);'
            : 'background:var(--glass-bg);color:var(--text-2);border:1px solid var(--glass-border);')
        + '">' + esc(label[t]) + '</button>';
    });
    h += '</div>';

    // Card preview (canvas in a glass frame). Canvas is 4:5; display width fluid.
    h += '<div style="background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:var(--card-r);padding:12px;box-shadow:var(--glass-highlight);margin-bottom:16px;">';
    h += '<canvas id="shareCanvas" width="1080" height="1350" style="display:block;width:100%;height:auto;border-radius:calc(14px * var(--rx, 1));"></canvas>';
    h += '</div>';

    // Private toggle.
    h += '<button id="sharePrivate" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;font:inherit;cursor:pointer;'
      + 'background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:calc(14px * var(--rx, 1));padding:12px 14px;margin-bottom:14px;color:var(--text-1);box-shadow:var(--glass-highlight);">'
      + '<span class="share-toggle" aria-hidden="true" style="flex:none;width:42px;height:25px;border-radius:999px;position:relative;transition:background .18s;'
      + 'background:' + (this.privateMode ? 'rgba(58, 217, 245,0.85)' : 'rgba(var(--ink),0.16)') + ';">'
      + '<span style="position:absolute;top:3px;left:' + (this.privateMode ? '20px' : '3px') + ';width:19px;height:19px;border-radius:50%;background:var(--solid-bg);transition:left .18s;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span></span>'
      + '<span style="display:flex;flex-direction:column;gap:1px;"><span style="font-size:0.9rem;font-weight:650;">Private</span>'
      + '<span style="font-size:0.74rem;color:var(--text-3);">Hide my name on the card</span></span></button>';

    // Action buttons.
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    h += '<button id="shareDownload" class="sheet-btn" style="flex:1;min-width:150px;background:var(--solid-bg);color:var(--solid-fg);border:none;font-weight:700;">Download PNG</button>';
    h += '<button id="shareCopy" class="sheet-btn" style="flex:1;min-width:130px;background:rgba(var(--accent-rgb),0.15);color:' + P + ';border:1px solid rgba(var(--accent-rgb),0.3);font-weight:700;">Copy text</button>';
    h += '<button id="shareLink" class="sheet-btn" style="flex:1;min-width:130px;background:var(--glass-bg);color:var(--text-1);border:1px solid var(--glass-border);font-weight:700;">Copy public link</button>';
    h += '</div>';
    h += '<div id="shareMsg" aria-live="polite" style="min-height:18px;font-size:0.8rem;color:var(--text-3);margin-top:10px;text-align:center;"></div>';

    return h;
  },

  _bind() {
    try {
      const body = (typeof Sheet !== 'undefined' && Sheet.body) ? Sheet.body : document;
      const self = this;
      const msg = body.querySelector('#shareMsg');
      const flash = (t, ok) => { if (!msg) return; msg.textContent = t; msg.style.color = ok ? 'rgba(120, 230, 129,0.95)' : 'var(--text-3)'; };

      // Render the initial preview.
      this._refreshPreview();

      body.querySelectorAll('.share-type').forEach(b => b.addEventListener('click', () => {
        const t = b.getAttribute('data-share-type');
        if (!t || t === self.type) return;
        self.type = t;
        self.open(true);     // re-render studio keeping scroll + state
      }));

      const pv = body.querySelector('#sharePrivate');
      if (pv) pv.addEventListener('click', () => { self.privateMode = !self.privateMode; self.open(true); });

      // Public link: upload the rendered card under an unguessable id and put
      // the share.html URL on the clipboard. Explicit, pull-only; nothing is
      // ever public unless this button is pressed.
      const lk = body.querySelector('#shareLink');
      if (lk) lk.addEventListener('click', async () => {
        try {
          if (!(window.CloudSync && CloudSync.isLoggedIn && CloudSync.isLoggedIn())) {
            flash('Sign in first; the link needs your account to live somewhere.', false);
            return;
          }
          flash('Creating the link...', false);
          const canvas = body.querySelector('#shareCanvas');
          if (!canvas) { flash('Nothing to share yet.', false); return; }
          const img = canvas.toDataURL('image/jpeg', 0.9);
          const a = new Uint8Array(16);
          crypto.getRandomValues(a);
          const id = Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
          const r = await CloudSync.createShare({ id, kind: self.type, payload: { kind: self.type, img } });
          if (!r || !r.ok) {
            flash(r && r.reason === 'no-table'
              ? 'Public links need a one-time backend setup. It is waiting in SHARE_LINKS_SETUP.md.'
              : (r && r.reason === 'auth' ? 'Sign in first to create a public link.' : 'Could not create the link. Try again in a moment.'), false);
            return;
          }
          const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'share.html?id=' + id;
          try { await navigator.clipboard.writeText(url); } catch (e) {}
          flash('Public link copied. Anyone with it can see this one card, nothing else.', true);
        } catch (e) { flash('Could not create the link. Try again in a moment.', false); }
      });

      const dl = body.querySelector('#shareDownload');
      if (dl) dl.addEventListener('click', () => {
        try {
          const canvas = body.querySelector('#shareCanvas') || document.getElementById('shareCanvas');
          if (!canvas) { flash('Could not build the image.'); return; }
          let url = '';
          try { url = canvas.toDataURL('image/png'); } catch (e) { url = ''; }
          if (!(typeof url === 'string' && url.indexOf('data:image/png') === 0 && url.length > 1000)) {
            flash('Image export is unavailable here. Use Copy text and screenshot the card.');
            return;
          }
          const a = document.createElement('a');
          a.href = url;
          a.download = 'memento-' + self.type + '.png';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 100);
          flash('Saved to your downloads.', true);
        } catch (e) { flash('Image export is unavailable here. Use Copy text and screenshot the card.'); }
      });

      const cp = body.querySelector('#shareCopy');
      if (cp) cp.addEventListener('click', () => {
        const text = self._textFor(self.type);
        const done = () => flash('Copied.', true);
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => self._fallbackCopy(text, flash));
          } else { self._fallbackCopy(text, flash); }
        } catch (e) { self._fallbackCopy(text, flash); }
      });
    } catch (e) {}
  },

  _fallbackCopy(text, flash) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      document.body.removeChild(ta);
      flash(ok ? 'Copied.' : 'Copy not available. Select the card text manually.', !!ok);
    } catch (e) { flash('Copy not available.'); }
  },

  // ---- Open the studio in the existing Sheet (ProofTrail pattern) ----
  open(keepScroll) {
    try {
      if (typeof Sheet === 'undefined' || !Sheet.body) return;
      Sheet.currentWidget = null;
      if (Sheet.titleEl) { Sheet.titleEl.textContent = 'Share Card Studio'; Sheet.titleEl.style.color = this.PURPLE; }
      const prevTop = keepScroll && Sheet.body ? Sheet.body.scrollTop : 0;
      Sheet.body.innerHTML = this.render();
      if (Sheet.el) { Sheet.el.classList.add('open'); Sheet.el.setAttribute('aria-hidden', 'false'); }
      if (Sheet.backdrop) Sheet.backdrop.classList.add('active');
      Sheet.isOpen = true;
      document.body.style.overflow = 'hidden';
      this._bind();
      if (!keepScroll) { if (Sheet.body.scrollTo) Sheet.body.scrollTo(0, 0); else Sheet.body.scrollTop = 0; }
      else { Sheet.body.scrollTop = prevTop; }
    } catch (e) {}
  }
};

// On This Day: surface a past reflection, kept moment, or win from ~1/3/6/12
// months ago today. Only fires on a real anniversary (within a small window) so
// it stays special, and can be dismissed for the day. Reuses .viv-resurface.
function renderOnThisDay() {
  return '';
}

// The two consistency SCORES (0-100): 30-day + long-range year. Shared by the
// hero render and the in-place update after a heatmap square is tapped.
function ccScoreLineInner(cs) {
  const sc = (label, val, title) => '<span title="' + title + '">' + label + ' <b style="color:var(--text-hi);font-weight:800;font-variant-numeric:tabular-nums;">' + val + '</b><span style="color:var(--text-faint);font-weight:600;">/100</span></span>';
  let h = sc('Consistency score', cs.pct30, 'Days with the main Action completed in the last 30 days, out of 100.');
  if (typeof cs.yearConsistency === 'number') h += sc('Year score', cs.yearConsistency, 'Your trailing 365-day consistency. The main Action fills a day; supporting activity can add only a faint partial signal.');
  return h;
}
// One short, derived "why" under today's action. Ties the action back to the
// goal so the daily mission never reads as busywork. Prefers the cost-of-inaction
// framing (the mortality weight) when the user named one; otherwise a plain line
// pointing at the Neutron Star. Returns '' when there is no goal to point at.
function ccActionWhyLine() {
  try {
    const hasNs = !!(state.clarity && state.clarity.answers && state.clarity.answers.neutronStar);
    if (!hasNs) return '';
    // v776 (Malik): the old line glued raw onboarding fragments into a fake
    // sentence ("So a year from now is not just becoming someone i don't want
    // to be, letting people down, regret.") and read as AI slop. No derived
    // voice line here; the action stands on its own.
    return '';
  } catch (e) { return ''; }
}

// Inline "I did it": mark today's action done from the Home without opening the
// Action module. Mirrors the bookend's _creditAction exactly (same completion
// record, proof event, streak recalc, persist) so it can never double-count or
// diverge. Returns true if it credited, false if already done today / no-op.
function creditTodayAction() {
  try {
    const pa = (state.action && state.action.primaryAction) || {};
    if (actionCompletionForDay(getTodayISO(), pa)) return false;
    // log the tier the user actually committed to (a coach shrink or the Action
    // picker sets selectedTier), not always the original recommendation
    const _TK = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    const _sel = state.action && state.action.selectedTier;
    const tier = _TK.indexOf(_sel) >= 0 ? _sel : (pa.recommendedTier || 'moderate');
    // v1002: log what the card SHOWED. When the loop chained a next action
    // into today, the home displays it (the _loopNext read in
    // renderCommandCenter) but this receipt used to record the tier text
    // instead, so the ledger held words the user never saw, and `chained` was
    // never cleared on this path (the Action module's own _loopComplete does
    // both correctly, js/02:5570-5575). The completion record is the context
    // every future decision reads; it has to be the truth.
    const _chained = String((state.action && state.action.loop &&
      (state.action.loop.chained || state.action.loop.nextAction)) || '').trim();
    const actionText = _chained || (pa.tiers && pa.tiers[tier]) || pa.howToStart || pa.title || '';
    if (!state.action) state.action = {};
    if (_chained && state.action.loop) { state.action.loop.chained = ''; state.action.loop.nextAction = ''; }
    if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
    // The receipt owns both a stable record id (for undo) and the mission id
    // (for truth). A later same-day Door cannot inherit this completion.
    const completion = createActionCompletionRecord(pa, tier, actionText);
    state.action.completionHistory.push(completion);
    // THE MERGE phase 0: shadow-mode referee observation.
    try { if (typeof rewardShadow === 'function') rewardShadow('js08-home'); } catch (_) {}
    try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier, missionId: completion.missionId } }); } catch (_) {}
    try { Analytics.track('action_done', { tier }); } catch (_) {} // Activation Point
    try { window.MementoPush && MementoPush.sync(); } catch (_) {} // reminder context: day is done
    if (typeof recalculateStreak === 'function') { try { recalculateStreak(); } catch (_) {} }
    try { persistNow(); } catch (_) {}
    return completion.id;
  } catch (e) { return false; }
}

// Complete the Home mission through one shared path after the deliberate hold.
// Keeping the receipt + undo logic here prevents mobile and desktop from
// drifting into different completion behavior.
function showHomeCompletionWash() {
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.cc-completion-wash').forEach((element) => element.remove());
    const wash = document.createElement('div');
    wash.className = 'cc-completion-wash';
    wash.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wash);
    setTimeout(() => { try { wash.remove(); } catch (e) {} }, 1050);
  } catch (e) {}
}

function completeTodayActionFromHome() {
  showHomeCompletionWash();
  const creditedId = creditTodayAction();
  try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  if (creditedId && typeof showUndoToast === 'function') {
    try { showUndoToast('Today is closed. You showed up.', function () {
      try {
        const history = state.action && state.action.completionHistory;
        if (!Array.isArray(history)) return;
        const index = history.findIndex((entry) => entry && entry.id === creditedId);
        if (index === -1) return;
        history.splice(index, 1);
        if (typeof recalculateStreak === 'function') recalculateStreak();
        persistNow();
        if (typeof renderAll === 'function') renderAll();
      } catch (e) {}
    }); } catch (e) {}
  }
  return creditedId;
}

function bindHomeActionHold(button) {
  if (!button || button.dataset.holdBound) return;
  button.dataset.holdBound = '1';
  const HOLD_MS = 3000;
  const label = button.querySelector('.cc-hold-complete__label');
  let timer = null;
  let holding = false;
  let finished = false;

  const reset = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!holding || finished) return;
    holding = false;
    button.classList.remove('is-holding');
    if (label) label.textContent = 'Mark Complete';
  };
  const finish = () => {
    if (!holding || finished) return;
    finished = true;
    holding = false;
    timer = null;
    button.classList.remove('is-holding');
    button.classList.add('is-finishing');
    completeTodayActionFromHome();
  };
  const begin = (event) => {
    if (finished || holding || actionDoneToday()) return;
    if (event && event.type === 'pointerdown' && event.button != null && event.button !== 0) return;
    if (event) event.preventDefault();
    holding = true;
    button.classList.add('is-holding');
    try {
      if (event && event.pointerId != null && button.setPointerCapture) button.setPointerCapture(event.pointerId);
    } catch (e) {}
    timer = setTimeout(finish, HOLD_MS);
  };

  button.addEventListener('pointerdown', begin);
  button.addEventListener('pointerup', reset);
  button.addEventListener('pointercancel', reset);
  button.addEventListener('lostpointercapture', reset);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
  button.addEventListener('keydown', (event) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) begin(event);
  });
  button.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') reset();
  });
  button.addEventListener('blur', reset);
}

// Single source of truth: was the CURRENT mission completed today? A user may
// finish a Door and receive a second mission on the same local day, so date-only
// completion would put the first receipt's checkmark on the second mission.
function actionDoneToday() {
  try {
    return !!actionCompletionForDay(getTodayISO(), state.action && state.action.primaryAction);
  } catch (e) { return false; }
}

// Count of DISTINCT local days, within the last `win` days (including today), on
// which the daily action was completed. Buckets by local day via isoToLocalDay
// (never new Date(date + 'T00:00:00'): the stored value is a full ISO timestamp,
// so that concat parses to Invalid Date and silently zeroed the action pillar).
function actionLocalDaysInWindow(win) {
  try {
    const h = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
    const todayNum = Math.floor(Date.parse(getTodayISO() + 'T00:00:00Z') / 86400000);
    const days = {};
    h.forEach((e) => {
      if (!e || !e.date) return;
      const day = (typeof isoToLocalDay === 'function') ? isoToLocalDay(e.date) : String(e.date).slice(0, 10);
      if (!day) return;
      const dNum = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
      const diff = todayNum - dNum;
      if (diff >= 0 && diff < win) days[day] = 1;
    });
    return Object.keys(days).length;
  } catch (e) { return 0; }
}

// Comeback coaching: turns the captured "what knocked you off" reason into a
// deterministic, voice-matched re-entry. Each reason suggests the gentlest honest
// tier and one line of reframe. No AI, no new state beyond what already exists.
const COMEBACK_COACHING = {
  'Too big':    { tier: 'tiny',  line: 'Then today is not the big version. Just open it and do the smallest piece. That counts.' },
  'Unclear':    { tier: 'tiny',  line: 'Fuzzy is normal. Pick the one obvious next move and do only that. Clarity comes from moving.' },
  'Tired':      { tier: 'tiny',  line: 'Low energy is allowed. Do the two minute version and stop. Showing up beats catching up.' },
  'Distracted': { tier: 'light', line: 'Happens to everyone. One small block, phone in the other room. Ten minutes is plenty.' },
  'Scared':     { tier: 'tiny',  line: 'Scared usually means it matters. You do not have to feel ready. Start small and let the fear shrink.' },
  'Forgot':     { tier: 'tiny',  line: 'No guilt. You are here now. Do the smallest version so today is not a zero.' },
  'Other':      { tier: 'tiny',  line: 'Whatever it was, it is behind you. Pick the smallest way back in and go.' }
};

// A fresh, unread weekly review (the Monday letter from maybeGenerateWeeklyCard)
// exists. Used to surface it on Home instead of leaving it buried in Updates.
function hasFreshWeeklyCard() {
  try { return (state.updates || []).some(u => u && u.type === 'weekly' && !u.read); } catch (e) { return false; }
}

// v1051: which pillar the PHONE card is showing. Same rule as the desktop
// fan: never persisted, so every launch lands on today's action.
let _ccPillar = 'action';
const CC_PILLARS = ['action', 'clarity', 'consistency'];
// v1104 (Malik: "when someone has already completed their neutron star, they
// should be able to swipe between their neutron star and action cards"). The
// deck goes live the moment the star exists: two faces before a plan, three
// after. One list, derived from state, used by the renderer, the swipe
// machinery and the dots, so they can never disagree about what is swipeable.
// v1154 (Malik): is the box in lockdown? A gap that matters owns the deck:
// the comeback face plus the GOAL face (so they can remember why), nothing
// else, until Build momentum is tapped.
function ccLockdownActive() {
  try {
    const hasStar = !!(state.clarity && state.clarity.completed && state.clarity.answers && state.clarity.answers.neutronStar);
    const pa = (state.action && state.action.primaryAction) || {};
    const hasPlan = !!(state.action && state.action.planGenerated && pa.title);
    return hasStar && hasPlan &&
      typeof isComebackGap === 'function' && isComebackGap() &&
      ccComebackMatters(ccGoalShape());
  } catch (e) { return false; }
}

function ccPillarList() {
  try {
    const hasStar = !!(state.clarity && state.clarity.completed && state.clarity.answers && state.clarity.answers.neutronStar);
    if (!hasStar) return ['action'];
    const pa = (state.action && state.action.primaryAction) || {};
    const hasPlan = !!(state.action && state.action.planGenerated && pa.title);
    if (hasPlan && ccLockdownActive()) return ['action', 'clarity'];
    return hasPlan ? CC_PILLARS : ['action', 'clarity'];
  } catch (e) { return CC_PILLARS; }
}
// ── The consistency FACE VIEWS (v1058, Malik's spec) ─────────────────
// Four ways to see the same record: week / month / year / curve. The
// person picks inside the Consistency module (or the desktop hover fan);
// the face remembers. Until they ever pick, the default follows tenure:
// week in the early days (day 5 = five honest squares, not a wasteland),
// month once there IS a month, year once there is a year.
// The star statement, outcome bright and qualifier quiet, inside ONE
// sentence (his pick "two tone statement", with his condition: "only if it's
// actually done right and works perfectly no matter what"). Deterministic:
// split at the first clear connector; no connector, no split, plain render.
function ccStarTwoTone(star) {
  try {
    const s = String(star || '');
    const m = s.match(/\s(by|so that|so I|so my|while|without|before|through)\s/i);
    if (m && m.index >= 12 && s.length - m.index >= 10) {
      return esc(s.slice(0, m.index)) +
        ' <span style="color:var(--text-2);font-weight:650;">' + esc(s.slice(m.index + 1)) + '</span>';
    }
    return esc(s);
  } catch (e) { return esc(String(star || '')); }
}
// "Day 62 with this star": the quiet line that gives the statement a history.
function ccStarTenureLine() {
  try {
    // ignitedAt is a millisecond number; completedAt is an ISO string.
    // Date.parse normalizes both, and anything unparseable renders nothing
    // rather than "Day NaN".
    const raw = (state.clarity && (state.clarity.ignitedAt || state.clarity.completedAt)) || 0;
    const t0 = typeof raw === 'number' ? raw : Date.parse(raw);
    if (!t0 || isNaN(t0)) return '';
    const d = Math.max(1, Math.floor((Date.now() - t0) / 86400000) + 1);
    return '<div class="cc-startenure">Day ' + d.toLocaleString() + ' with this star</div>';
  } catch (e) { return ''; }
}

const CC_FACE_VIEWS = ['week', 'month', 'year', 'curve'];
function ccFaceViewDefault() {
  try {
    const c = consistencyStats().counts || {};
    const keys = Object.keys(c).filter((k) => consistencyDayHasMainAction(c[k])).sort();
    if (!keys.length) return 'week';
    const span = (Date.now() - new Date(keys[0] + 'T00:00:00')) / 86400000;
    if (span >= 350) return 'year';
    if (span >= 28) return 'month';
  } catch (e) {}
  return 'week';
}
function ccFaceView() {
  const v = state.ui && state.ui.consistencyFaceView;
  return CC_FACE_VIEWS.indexOf(v) >= 0 ? v : ccFaceViewDefault();
}
function ccFaceGraph(view, wide) {
  try {
    const st = consistencyStats();
    const c = st.counts || {};
    const tn = _dayNum(getTodayISO());
    const on = (dn) => consistencyDayHasMainAction(c[_keyFromDayNum(dn)]);
    const cell = (dn) => '<i class="ccvg__c' + (dn === tn ? ' now' : (on(dn) ? ' on' : '')) + '"></i>';
    if (view === 'week') {
      let h = '';
      for (let d = 6; d >= 0; d--) h += cell(tn - d);
      return '<div class="cc-vg cc-vg--week" aria-hidden="true">' + h + '</div>';
    }
    if (view === 'month') {
      let h = '';
      for (let d = 27; d >= 0; d--) h += cell(tn - d);
      return '<div class="cc-vg cc-vg--month" aria-hidden="true">' + h + '</div>';
    }
    if (view === 'curve') {
      // Active days per week, last 10 weeks, one line. Momentum, not a
      // record: the shape is the message, so no axes and no labels.
      const pts = [];
      for (let w = 9; w >= 0; w--) {
        let n = 0;
        for (let d = 0; d < 7; d++) if (on(tn - (w * 7 + d))) n++;
        pts.push(n);
      }
      const W = 300, H = 52, max = Math.max(1, Math.max.apply(null, pts));
      const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, H - 5 - (v / max) * (H - 10)]);
      const path = xy.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
      const last = xy[xy.length - 1];
      return '<div class="cc-vg cc-vg--curve" aria-hidden="true">' +
        '<svg width="100%" height="52" viewBox="0 0 300 52" preserveAspectRatio="none">' +
        '<path d="' + path + '" fill="none" stroke="var(--color-consistency, #3fd94e)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>' +
        '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.4" fill="var(--color-consistency, #3fd94e)"/>' +
        '</svg></div>';
    }
    let hm = '';
    try { hm = renderConsistencyHeatmap(wide ? 53 : 40, 'rolling', true); } catch (e) {}
    return hm ? '<div class="cc-heat">' + hm + '</div>' : '';
  } catch (e) { return ''; }
}

/* ============================================================================
   THE SYNC BOX (v1150). SYNC-BOX-SPEC.md + GOAL-TAXONOMY.md are the contract;
   mockups/sync-box.html is the face spec of record, ported verbatim with
   sample data swapped for state. The goal's TYPE selects which three faces
   render; faces unlock as data accrues. Laws: pillar purity, holds confirm in
   the evening, rest days are never misses, up-only history, one accent per
   face, no eyebrows, no em dashes.
   Every builder returns HTML or null; null falls back to the legacy face so a
   classification gap can never brick the home. */

// The goal's shape: the AI field first (clarity.answers.goalShape, written by
// synthesis from v1150 on), else a modest client fallback so accounts that
// signed before the field existed still get situation faces. The fallback
// NEVER invents a deadline; deadline faces need the AI's word.
function ccGoalShape() {
  try {
    const ans = (state.clarity && state.clarity.answers) || {};
    const star = String(ans.neutronStar || '').trim();
    if (!star) return null;
    const gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : (state.goalProgress || null);
    const ai = (ans.goalShape && typeof ans.goalShape === 'object') ? ans.goalShape : null;
    const s = star.toLowerCase();
    let type = ai && ai.type ? String(ai.type) : '';
    const T = ['quantity_up', 'quantity_down', 'frequency', 'maintenance', 'milestone', 'open'];
    if (T.indexOf(type) === -1) type = '';
    if (!type) {
      // the vow test can't run client-side; these words approximate it
      if (/\b(stay|remain|never|quit|stop|sober|clean|no more|don'?t\s|do not\s|keep (it |myself |them )?(under|below|off))\b/.test(s)) type = 'maintenance';
      else if (/\b\d+\s*(?:x|times?)\s*(?:a|per)\s*(?:day|week|month)\b|\b(daily|every (day|morning|night|week))\b/.test(s)) type = 'frequency';
      else if (gp && gp.target !== null) type = /\b(lose|drop|cut|reduce|under|below|down to|pay off|debt)\b/.test(s) ? 'quantity_down' : 'quantity_up';
      else if (/\b(pass|graduate|launch|publish|finish|complete|marathon|buy a (house|home)|get (the|a) (job|degree|offer))\b/.test(s)) type = 'milestone';
      else type = 'open';
    }
    // deadline: ISO date string from the AI only
    let deadline = null, deadlineText = '';
    if (ai && ai.deadline && /^\d{4}-\d{2}-\d{2}$/.test(String(ai.deadline))) {
      const d = new Date(ai.deadline + 'T00:00:00');
      if (isFinite(d) && d > new Date()) { deadline = d; deadlineText = String(ai.deadlineText || ''); }
    }
    // cadence: sessions per week. The PLAN is the best witness (v1153): its
    // commitment contract (targetCompletions over windowDays) IS the rate.
    const pa0 = (state.action && state.action.primaryAction) || {};
    let cadence = 0;
    if (pa0.shape === 'lever' && Number(pa0.windowDays) >= 7 && Number(pa0.targetCompletions) >= 1) {
      cadence = Math.max(1, Math.min(7, Math.round(Number(pa0.targetCompletions) / Number(pa0.windowDays) * 7)));
    }
    if (!cadence && ai && isFinite(Number(ai.cadence))) cadence = Math.max(0, Math.min(7, Number(ai.cadence)));
    if (!cadence && type === 'frequency') {
      const m = s.match(/(\d+)\s*(?:x|times?)\s*(?:a|per)\s*week/);
      if (m) cadence = Math.max(1, Math.min(7, parseInt(m[1], 10)));
      else if (/\b(daily|every (day|morning|night))\b/.test(s)) cadence = 7;
      else cadence = 3;
    }
    // verb decides the done control; holds confirm in the evening. The plan's
    // own verb (v1153, AI-written) outranks the classifier's guess.
    let verb = (pa0.verb && ['ship', 'attempt', 'rep', 'hold', 'check'].indexOf(pa0.verb) >= 0) ? pa0.verb
      : (ai && ai.verb ? String(ai.verb) : '');
    if (['ship', 'attempt', 'rep', 'hold', 'check'].indexOf(verb) === -1) verb = (type === 'maintenance') ? 'hold' : 'ship';
    return {
      type: type, dir: type === 'quantity_down' ? 'down' : 'up',
      target: gp && gp.target !== null ? gp.target : (ai && isFinite(Number(ai.target)) ? Number(ai.target) : null),
      unit: (gp && gp.unit) || (ai && ai.unit) || '',
      deadline: deadline, deadlineText: deadlineText,
      cadence: cadence, verb: verb, star: star
    };
  } catch (e) { return null; }
}

function ccSituation(shape) {
  if (!shape) return '';
  if (shape.type === 'quantity_up' || shape.type === 'quantity_down') return shape.deadline ? 'ndl' : 'n';
  if (shape.type === 'maintenance') return 'rule';
  if (shape.type === 'frequency') return 'rate';
  if (shape.type === 'milestone') return 'event';
  return 'open';
}

// day one: the day-one face set renders until a real mark exists
function ccSyncDayOne() {
  try { return (consistencyStats().totalActiveDays || 0) === 0; } catch (e) { return false; }
}

function ccSyncFmtDate(d) {
  try { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return ''; }
}

// days since the star was signed (day 1 = the signing day). Accounts from
// before completedAt existed fall back to their first recorded proof.
function ccSyncDayN() {
  try {
    let t0 = Number(state.clarity && state.clarity.completedAt) || 0;
    if (!t0) {
      // earliest day in the consistency record
      const counts = consistencyStats().counts || {};
      const days = Object.keys(counts).sort();
      if (days.length) t0 = Date.parse(days[0] + 'T00:00:00');
    }
    if (!t0 || !isFinite(t0)) return 1;
    return Math.max(1, Math.floor((Date.now() - t0) / 86400000) + 1);
  } catch (e) { return 1; }
}

// pace and projected arrival from the goalProgress pulses.
// Returns null until two pulses exist on different days.
function ccSyncPace(shape) {
  try {
    const gp = state.goalProgress;
    if (!gp || gp.target === null || !Array.isArray(gp.history) || gp.history.length < 2) return null;
    const h = gp.history;
    const first = h[0], last = h[h.length - 1];
    const span = Math.max(1, Math.round((new Date(last.day) - new Date(first.day)) / 86400000));
    const moved = (last.value - first.value) * (shape.dir === 'down' ? -1 : 1);
    if (moved <= 0) return { perDay: 0, arrival: null, shiftDays: 0, weekDelta: 0, moved: moved, span: span };
    const perDay = moved / span;
    const remaining = Math.max(0, Math.abs(shape.target - last.value));
    const days = Math.ceil(remaining / perDay);
    const arrival = new Date(Date.now() + days * 86400000);
    // the same projection computed a week ago, for "sooner than a week ago"
    let shiftDays = 0;
    const wk = new Date(Date.now() - 7 * 86400000);
    const hOld = h.filter(p => new Date(p.day) <= wk);
    if (hOld.length >= 2) {
      const lo = hOld[hOld.length - 1];
      const spanO = Math.max(1, Math.round((new Date(lo.day) - new Date(hOld[0].day)) / 86400000));
      const movedO = (lo.value - hOld[0].value) * (shape.dir === 'down' ? -1 : 1);
      if (movedO > 0) {
        const perDayO = movedO / spanO;
        const remO = Math.max(0, Math.abs(shape.target - lo.value));
        const arrO = new Date(new Date(lo.day).getTime() + Math.ceil(remO / perDayO) * 86400000);
        shiftDays = Math.round((arrO - arrival) / 86400000);
      }
    }
    // this week's movement
    let weekDelta = 0;
    const recent = h.filter(p => new Date(p.day) > wk);
    if (recent.length) weekDelta = (last.value - (hOld.length ? hOld[hOld.length - 1].value : first.value)) * (shape.dir === 'down' ? -1 : 1);
    return { perDay: perDay, arrival: arrival, shiftDays: shiftDays, weekDelta: weekDelta, moved: moved, span: span };
  } catch (e) { return null; }
}

// weekly kept-day counts, most recent first: [{kept, days:[bool x7 Mon..Sun], partial}]
function ccSyncWeeks(maxWeeks) {
  try {
    const counts = consistencyStats().counts || {};
    const out = [];
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // Mon=0
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    for (let w = 0; w < maxWeeks; w++) {
      const days = []; let kept = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday.getTime() - w * 7 * 86400000 + i * 86400000);
        const iso = d.toISOString().slice(0, 10);
        const on = !!(counts[iso] && consistencyDayHasMainAction(counts[iso]));
        days.push(on); if (on) kept++;
      }
      out.push({ kept: kept, days: days, partial: w === 0 });
    }
    return out;
  } catch (e) { return []; }
}

// the shared done control: the app's one deliberate gesture (3s hold) wearing
// the mockup button. bindHomeActionHold finds it by class.
function ccSyncDoneBtn(label) {
  return '<button class="a-btn cc-hold-complete" data-cc-action="didit" type="button" aria-label="Hold for three seconds to mark complete">' +
    '<span class="cc-hold-complete__fill" aria-hidden="true"></span>' +
    '<span class="cc-hold-complete__label">' + esc(label || 'Mark it done') + '</span></button>';
}
function ccSyncDoneState() {
  return '<div class="cc-completed-action" role="status" style="margin-top:14px;">Completed</div>';
}

// holds confirm in the EVENING. Before 5pm the button is a promise, not a control.
function ccSyncHoldControl(doneToday) {
  if (doneToday) return '<div class="cc-completed-action" role="status" style="margin-top:14px;">Held</div>';
  const hr = new Date().getHours();
  if (hr < 17) {
    return '<button class="a-btn a-btn--wait" type="button" disabled>Confirm tonight</button>' +
      '<p class="a-note">Opens at 5pm. A rule cannot be finished at lunch.</p>';
  }
  return ccSyncDoneBtn('Confirm the day held');
}

/* ---- the faces --------------------------------------------------------- */

// ACTION. "What do I do right now, and how?" One backward line max.
function ccSyncFaceAction(shape, sit, d1) {
  const pa = (state.action && state.action.primaryAction) || {};
  const tiers = pa.tiers || {};
  const TK = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
  const selT = state.action && state.action.selectedTier;
  const tier = TK.indexOf(selT) >= 0 ? selT : pa.recommendedTier;
  const loopNext = (!actionDoneToday() && state.action.loop && String(state.action.loop.chained || state.action.loop.nextAction || '').trim()) || '';
  const move = loopNext || (tiers[tier] || tiers[pa.recommendedTier] || pa.title || '').trim();
  if (!move) return null;
  const how = String(pa.howToStart || pa.recommendedWhy || '').trim();
  const done = actionDoneToday();

  if (sit === 'rule' || (sit === 'ndl' && shape.verb === 'hold')) {
    // The rule, tonight / The rule for today (hold form)
    return '<div class="v v-nf"><p class="a-move">' + esc(move) + '</p>' +
      (how ? '<p class="a-sup">' + esc(how) + '</p>' : '') +
      ccSyncHoldControl(done) + '</div>';
  }
  if (sit === 'rate') {
    // The scheduled move: the session named plainly, and where the week stands
    const wk = ccSyncWeeks(1)[0];
    const kept = wk ? wk.kept : 0;
    const cad = shape.cadence || 3;
    const sup = d1 ? ('0/' + cad + ' this week. First one today.')
      : (Math.min(kept, cad) + '/' + cad + ' this week.');
    return '<div class="v v-nf"><p class="a-move">' + esc(move) + '</p>' +
      '<p class="a-sup">' + esc(sup) + '</p>' +
      (done ? ccSyncDoneState() : ccSyncDoneBtn('Mark it done')) + '</div>';
  }
  if (sit === 'event') {
    // The part: which act they are in, and today's move inside it.
    // Parts come from the first project's milestones; no parts = the plain move.
    const pj = (state.action && Array.isArray(state.action.projects) && state.action.projects[0]) || null;
    const ms = (pj && Array.isArray(pj.milestones) && pj.milestones.length >= 2) ? pj.milestones : null;
    if (ms) {
      const idx = Math.max(0, ms.findIndex(m => !m.done));
      const cur = idx === -1 ? ms.length - 1 : idx;
      const segs = ms.slice(0, 5).map((m, i) => {
        const cls = i < cur ? ' v-today-n-act__seg--done' : (i === cur ? ' v-today-n-act__seg--now' : '');
        return '<div class="v-today-n-act__seg' + cls + '"><i></i><b>' + esc(String(m.title || '').split(' ').slice(0, 2).join(' ')) + '</b></div>';
      }).join('');
      return '<div class="v v-today-n-act">' +
        '<div class="v-today-n-act__top"><span class="v-today-n-act__goal">' + esc(shape.star) + '</span>' +
        '<span class="v-today-n-act__count">part ' + (cur + 1) + ' of ' + ms.length + '</span></div>' +
        '<div class="v-today-n-act__rail">' + segs + '</div>' +
        '<div class="v-today-n-act__lab">Today</div>' +
        '<div class="v-today-n-act__move">' + esc(move) + '</div>' +
        (done ? ccSyncDoneState() : ccSyncDoneBtn('Mark it done')) + '</div>';
    }
    // fall through to the plain move face
  }
  // The move, ready / First thirty seconds / event-without-parts / ndl ship
  return '<div class="v v-nf"><p class="a-move">' + esc(move) + '</p>' +
    (how ? '<div class="a-how">' + esc(how) + '</div>' : '') +
    (done ? ccSyncDoneState() : ccSyncDoneBtn('Mark it done')) + '</div>';
}

// CLARITY. "What am I chasing, why, and where do I stand?"
function ccSyncFaceClarity(shape, sit, d1) {
  const ans = (state.clarity && state.clarity.answers) || {};
  const why = String(ans.coreWhy || ans.whyItMatters || '').trim();
  const star = shape.star;
  const gp = state.goalProgress || {};

  if (sit === 'ndl') {
    // The arithmetic: remaining / weeks = rate a week, then today's rule
    if (shape.target === null || !shape.deadline) return null;
    const cur = gp.current !== null && gp.current !== undefined ? gp.current : (gp.baseline !== null ? gp.baseline : null);
    const remaining = cur === null ? shape.target : Math.max(0, Math.abs(shape.target - cur));
    const weeks = Math.max(1, Math.round((shape.deadline - new Date()) / (7 * 86400000)));
    const rate = remaining / weeks;
    const rateTxt = (rate >= 10 ? Math.round(rate) : Math.round(rate * 10) / 10);
    const unit = esc(shape.unit || '');
    // climbing from zero reads as the target itself; only a real distance
    // gets the Down/Up prefix
    const goalLine = (shape.dir === 'down'
      ? 'Down ' + remaining.toLocaleString() + (unit ? ' ' + unit : '')
      : (cur === null || cur === 0
        ? shape.target.toLocaleString() + (unit ? ' ' + unit : '')
        : 'Up ' + remaining.toLocaleString() + (unit ? ' ' + unit : ''))) +
      ' by ' + ccSyncFmtDate(shape.deadline);
    const pace = ccSyncPace(shape);
    let foot = 'If the number stalls for three weeks, this gets re-derived.';
    if (pace && pace.moved > 0 && gp.history.length) {
      foot = pace.moved.toLocaleString() + (unit ? ' ' + unit : '') + (shape.dir === 'down' ? ' down' : ' gained') + ' since ' + ccSyncFmtDate(new Date(gp.history[0].day)) + '. If it stalls for three weeks, this number gets re-derived.';
    }
    if (d1) {
      return '<div class="v v-nf"><p class="a-sup" style="margin:0">' + esc(goalLine) + '</p>' +
        '<p class="c-star" style="margin-top:8px">' + remaining.toLocaleString() + (unit ? ' ' + unit : '') + ' &divide; ' + weeks + ' weeks = ' + rateTxt + ' a week</p>' +
        (why ? '<p class="c-why">' + esc(why) + '</p>' : '') +
        '<p class="c-meta">Day 1. The plan exists before any history does.</p></div>';
    }
    return '<div class="v v-math">' +
      '<div class="v-math__goal">' + esc(goalLine) + '</div>' +
      '<div class="v-math__eq">' +
      '<span class="v-math__n">' + remaining.toLocaleString() + (unit ? ' ' + unit : '') + '</span>' +
      '<span class="v-math__o">/</span>' +
      '<span class="v-math__n">' + weeks + ' weeks</span>' +
      '<span class="v-math__o">=</span>' +
      '<span class="v-math__n v-math__n--lit">' + rateTxt + ' a week</span></div>' +
      '<div class="v-math__foot">' + esc(foot) + '</div></div>';
  }
  if (sit === 'n') {
    // Distance to the number
    if (shape.target === null) return null;
    const cur = (gp.current !== null && gp.current !== undefined) ? gp.current : 0;
    if (d1 || gp.current === null) {
      return '<div class="v v-nf"><p class="c-star">' + esc(star) + '</p>' +
        (why ? '<p class="c-why">' + esc(why) + '</p>' : '') +
        '<p class="d-foot">Day ' + ccSyncDayN() + '. The counter moves when the number does.</p></div>';
    }
    const pct = Math.max(0, Math.min(100, Math.round((shape.dir === 'down'
      ? (gp.baseline !== null && gp.baseline !== shape.target ? (gp.baseline - cur) / (gp.baseline - shape.target) : 0)
      : cur / shape.target) * 100)));
    const pace = ccSyncPace(shape);
    const delta = pace && pace.weekDelta > 0 ? '+' + pace.weekDelta.toLocaleString() + ' this week' : '';
    let foot = 'Day ' + ccSyncDayN() + '.';
    if (pace && pace.arrival) foot = 'Day ' + ccSyncDayN() + '. At this pace you arrive <b>' + ccSyncFmtDate(pace.arrival) + '</b>.';
    return '<div class="v v-star-star-distance">' +
      '<p class="sd-star">' + esc(star) + '</p>' +
      '<div class="sd-row"><span class="sd-big">' + cur.toLocaleString() + '</span>' +
      '<span class="sd-of">of ' + shape.target.toLocaleString() + (shape.unit ? ' ' + esc(shape.unit) : '') + '</span>' +
      (delta ? '<span class="sd-delta">' + esc(delta) + '</span>' : '') + '</div>' +
      '<div class="sd-rail" aria-hidden="true"><span class="sd-fill" style="width:' + pct + '%"></span></div>' +
      '<p class="sd-foot">' + foot + '</p></div>';
  }
  if (sit === 'rule') {
    // The rule, signed: the rule, their why, and what breaking it costs
    let daysHeld = 0;
    try { daysHeld = consistencyStats().current || 0; } catch (e) {}
    const cost = d1 || daysHeld === 0
      ? 'Day ' + ccSyncDayN() + '. The cost of breaking it grows from here.'
      : 'Breaking it costs ' + daysHeld.toLocaleString() + ' day' + (daysHeld === 1 ? '' : 's') + ' and the person who held them.';
    return '<div class="v v-nf"><p class="c-star">' + esc(star) + '</p>' +
      (why ? '<p class="c-why">' + esc(why) + '</p>' : '') +
      '<p class="c-cost">' + esc(cost) + '</p></div>';
  }
  if (sit === 'rate') {
    // The rate, signed
    const since = state.clarity && state.clarity.completedAt ? ccSyncFmtDate(new Date(state.clarity.completedAt)) : '';
    const meta = d1 ? 'Your word, as of today' : (since ? 'Your word, since ' + since : 'Your word.');
    return '<div class="v v-nf"><p class="c-star">' + esc(star) + '</p>' +
      (why ? '<p class="c-why">' + esc(why) + '</p>' : '') +
      '<p class="c-meta">' + esc(meta) + '</p></div>';
  }
  if (sit === 'event') {
    // The parts, when they exist; else the goal and the why
    const pj = (state.action && Array.isArray(state.action.projects) && state.action.projects[0]) || null;
    const ms = (pj && Array.isArray(pj.milestones) && pj.milestones.length >= 2) ? pj.milestones : null;
    if (ms && !d1) {
      const idx0 = ms.findIndex(m => !m.done);
      const cur = idx0 === -1 ? ms.length - 1 : idx0;
      const rows = ms.slice(0, 5).map((m, i) => {
        const cls = m.done ? ' v-star-n-acts__act--done' : (i === cur ? ' v-star-n-acts__act--now' : ' v-star-n-acts__act--next');
        return '<li class="v-star-n-acts__act' + cls + '">' +
          '<span class="v-star-n-acts__mark"></span>' +
          '<span class="v-star-n-acts__name">' + esc(m.title || '') + '</span>' +
          '<span class="v-star-n-acts__when">' + (m.done && m.doneAt ? esc(ccSyncFmtDate(new Date(m.doneAt))) : (i === cur ? 'now' : '')) + '</span></li>';
      }).join('');
      return '<div class="v v-star-n-acts">' +
        '<div class="v-star-n-acts__goal"><b style="font-size:16.5px;font-weight:700;color:var(--text-hi)">' + esc(star) + '</b></div>' +
        '<ol class="v-star-n-acts__list">' + rows + '</ol></div>';
    }
    if (ms && d1) {
      return '<div class="v v-nf"><p class="c-star" style="font-size:18px">' + esc(star) + '</p>' +
        '<div style="margin-top:12px;font-size:15.5px;font-weight:680;color:var(--text-hi);letter-spacing:-.012em">' + ms.slice(0, 5).map(m => esc(String(m.title || '').split(' ').slice(0, 2).join(' '))).join(' &rarr; ') + '</div>' +
        '<p class="d-foot">Part one began today. The whole path is known before any of it is walked.</p></div>';
    }
    // no parts: the goal and the why carry the face
  }
  // Evidence, no meter (open goals; also the event fallback)
  let n = 0;
  try { n = (state.proofEvents || []).filter(e => e && e.type !== 'distraction-log').length; } catch (e) {}
  const since = state.clarity && state.clarity.completedAt ? ccSyncFmtDate(new Date(state.clarity.completedAt)) : '';
  const meta = d1 ? 'Signed today. The evidence starts tonight.'
    : (n > 0 ? n.toLocaleString() + ' thing' + (n === 1 ? '' : 's') + ' done in its name' + (since ? ' since ' + since : '') + '.' : (since ? 'Signed ' + since + '.' : ''));
  return '<div class="v v-nf"><p class="c-star">' + esc(star) + '</p>' +
    (why ? '<p class="c-why">' + esc(why) + '</p>' : '') +
    (meta ? '<p class="c-meta">' + esc(meta) + '</p>' : '') + '</div>';
}

// CONSISTENCY. The only home of the past; always a number or a visual.
function ccSyncFaceCons(shape, sit, d1) {
  let cs = null;
  try { cs = consistencyStats(); } catch (e) { cs = { current: 0, longest: 0, totalActiveDays: 0, counts: {} }; }
  const gp = state.goalProgress || {};

  // the stall override, numbered goals only: kept days meeting a flat number
  if ((sit === 'n' || sit === 'ndl') && shape.target !== null && !d1) {
    const stall = ccSyncStall(shape, cs);
    if (stall) {
      return '<div class="v v-consistency-not-moving">' +
        '<p class="nm-hd">You kept every day. The number did not move.</p>' +
        '<div class="nm-two">' +
        '<span><b>' + stall.kept + '</b>of ' + stall.window + ' days kept</span>' +
        '<span><b>' + stall.moved + '</b>' + esc((shape.unit || '') + ' in ' + stall.weeks + ' weeks') + '</span></div>' +
        '<p class="nm-say">Something in the plan is wrong, not you.</p>' +
        '<button class="nm-btn" data-cc-action="action" type="button">Redo the plan</button></div>';
    }
  }

  if (sit === 'ndl') {
    // Arrival, moving: the arrival date against the deadline they set
    if (!shape.deadline) return null;
    if (d1) {
      const total = Math.max(1, Math.round((shape.deadline - new Date()) / 86400000));
      return '<div class="v v-nf">' +
        '<span class="d-big" style="font-size:48px">Day 1</span>' +
        '<div class="pb" style="margin-top:14px"><i style="width:2%"></i></div>' +
        '<p class="pb-l"><span>today</span><span>' + esc(ccSyncFmtDate(shape.deadline)) + '</span></p>' +
        '<p class="d-foot" style="font-size:14px">Everything after this is record. ' + total.toLocaleString() + ' days on the clock.</p></div>';
    }
    const pace = ccSyncPace(shape);
    if (!pace || !pace.arrival) {
      // no pace yet: show the deadline holding still
      const till = Math.max(0, Math.round((shape.deadline - new Date()) / 86400000));
      return '<div class="v v-nf v-cdt"><span class="d-big">' + till.toLocaleString() + '</span><span class="d-lbl">days till your deadline</span>' +
        '<p class="d-foot">' + (cs.totalActiveDays || 0).toLocaleString() + ' days shown up since you signed.' + (cs.longest ? ' Best run ' + cs.longest + '.' : '') + '</p></div>';
    }
    const diff = Math.round((shape.deadline - pace.arrival) / 86400000);
    const line = diff >= 0 ? 'on pace to be ' + diff + ' day' + (diff === 1 ? '' : 's') + ' early'
      : 'at this pace, ' + Math.abs(diff) + ' day' + (diff === -1 ? '' : 's') + ' past your date';
    const pull = pace.shiftDays > 0 ? 'Last week&rsquo;s kept days pulled the arrival ' + pace.shiftDays + ' day' + (pace.shiftDays === 1 ? '' : 's') + ' earlier. ' : '';
    return '<div class="v v-nf">' +
      '<p class="a-sup" style="margin:0">Your deadline: ' + esc(ccSyncFmtDate(shape.deadline)) + '</p>' +
      '<span class="d-big" style="font-size:38px;margin-top:8px">' + esc(ccSyncFmtDate(pace.arrival)) + '</span>' +
      '<span style="margin-top:5px;font-size:13.5px;font-weight:650;color:' + (diff >= 0 ? '#3fd94e' : 'var(--text-mid)') + '">' + esc(line) + '</span>' +
      '<p class="d-foot">' + pull + 'Miss days and this date walks back toward ' + esc(ccSyncFmtDate(shape.deadline)) + '.</p></div>';
  }
  if (sit === 'n') {
    // Arrival date, projected; the pace made visible
    if (shape.target === null) return null;
    if (d1) {
      return '<div class="v v-nf">' +
        '<span class="d-big" style="font-size:40px">Day 1</span>' +
        '<p class="a-move" style="font-size:15.5px;margin-top:8px">Tonight&rsquo;s move is the first mark.</p>' +
        '<div style="margin:auto 0"><div class="pb"><i style="width:2%"></i></div>' +
        '<p class="pb-l"><span>0</span><span>' + shape.target.toLocaleString() + (shape.unit ? ' ' + esc(shape.unit) : '') + '</span></p></div></div>';
    }
    const pace = ccSyncPace(shape);
    if (!pace || !pace.arrival) {
      // pace not talking yet: the record so far
      return '<div class="v v-nf v-cdt"><span class="d-big">' + (cs.totalActiveDays || 0).toLocaleString() + '</span><span class="d-lbl">days shown up</span>' +
        '<p class="d-foot">The arrival date appears when the number has moved twice.' + (cs.longest ? ' Best run ' + cs.longest + '.' : '') + '</p></div>';
    }
    const sooner = pace.shiftDays > 0 ? pace.shiftDays + ' days sooner than a week ago'
      : (pace.shiftDays < 0 ? Math.abs(pace.shiftDays) + ' days later than a week ago' : 'holding steady');
    return '<div class="v v-nf">' +
      '<p class="a-sup" style="margin:0">Projected arrival</p>' +
      '<span class="d-big" style="font-size:40px;margin-top:6px">' + esc(ccSyncFmtDate(pace.arrival)) + '</span>' +
      '<span style="margin-top:5px;font-size:13.5px;font-weight:650;color:' + (pace.shiftDays >= 0 ? '#3fd94e' : 'var(--text-mid)') + '">' + esc(sooner) + '</span>' +
      '<p class="d-foot">Projected from the pace you have kept. You set no deadline; this date is your pace talking.</p></div>';
  }
  if (sit === 'rule') {
    // The hold record: the unbroken line, and nothing else
    if (d1) {
      return '<div class="v v-nf">' +
        '<span class="d-big" style="font-size:48px">Day 1</span>' +
        '<span style="margin-top:5px;font-size:14px;font-weight:600;color:rgba(var(--ink),.7)">more to come</span>' +
        '<p class="d-foot" style="font-size:14px">Confirm this evening and the line exists.</p></div>';
    }
    const cur = cs.current || 0;
    const best = Math.max(cs.longest || 0, cur);
    const foot = cur > 0 && cur >= best ? 'Your longest ever. The line has never been this long.'
      : 'Best ever: ' + best.toLocaleString() + '.';
    return '<div class="v v-nf" style="align-items:center;text-align:center;justify-content:center">' +
      '<span class="d-big" style="font-size:74px;letter-spacing:-.05em">' + cur.toLocaleString() + '</span>' +
      '<span style="margin-top:2px;font-size:15px;font-weight:650;color:rgba(var(--ink),.8)">day' + (cur === 1 ? '' : 's') + ' unbroken</span>' +
      '<p class="d-foot" style="margin-top:14px">' + esc(foot) + '</p></div>';
  }
  if (sit === 'rate') {
    const cad = shape.cadence || 3;
    if (d1) {
      return '<div class="v v-nf">' +
        '<span style="font-size:15px;font-weight:650;color:rgba(var(--ink),.9)"><b style="font-size:44px;font-weight:700;letter-spacing:-.04em;color:#3fd94e">0</b> of ' + cad + ', week one</span>' +
        '<p class="d-foot" style="font-size:14px;margin-top:14px">' + (cad === 7 ? 'Seven' : ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][cad - 1]) + ' session' + (cad === 1 ? ' makes' : 's make') + ' a perfect first week. Rest days will not count against you.</p></div>';
    }
    const weeks = ccSyncWeeks(27);
    const done = weeks.length ? weeks.slice(1) : [];
    // eight weeks of record unlock the long adherence view
    if (done.length >= 8) {
      const shown = done.slice(0, 26).reverse();
      const hit = shown.filter(w => w.kept >= cad).length;
      const pct = Math.round(hit / shown.length * 100);
      // longest run of weeks at plan
      let run = 0, best = 0, bestEnd = -1;
      shown.forEach((w, i) => { if (w.kept >= cad) { run++; if (run > best) { best = run; bestEnd = i; } } else run = 0; });
      const bars = shown.map(w => {
        const h = Math.max(0.12, Math.min(0.98, w.kept / Math.max(cad, 1) * 0.74));
        return '<i' + (w.kept < cad ? ' class="lo"' : '') + ' style="--h:' + h.toFixed(2) + '"></i>';
      }).join('');
      return '<div class="v v-consistency-n-adhere">' +
        '<div class="v-consistency-n-adhere__head">' +
        '<div class="v-consistency-n-adhere__num">' + pct + '<span>%</span></div>' +
        '<div class="v-consistency-n-adhere__lab">of weeks hit the schedule you set' +
        '<span>' + hit + ' of ' + shown.length + ' weeks</span></div></div>' +
        '<div class="v-consistency-n-adhere__chart"><div class="v-consistency-n-adhere__plan"></div>' + bars + '</div>' +
        '<div class="v-consistency-n-adhere__foot">Longest run at plan: <b>' + best + ' week' + (best === 1 ? '' : 's') + '</b>.</div></div>';
    }
    // Your schedule, kept: this week against the plan
    const wk = weeks[0] || { kept: 0, days: [false, false, false, false, false, false, false] };
    const met = wk.kept >= cad;
    const perfect = done.filter(w => w.kept >= cad).length;
    const dots = wk.days.map(on => '<i class="' + (on ? 'on' : 'rest') + '"></i>').join('');
    return '<div class="v v-consistency-cadence-week">' +
      '<div class="cw-head"><span class="cw-n">' + Math.min(wk.kept, cad) + '</span><span class="cw-of">of ' + cad + ' this week</span>' +
      (met ? '<span class="cw-tag">Done</span>' : '') + '</div>' +
      '<div class="cw-days" aria-hidden="true">' + dots + '</div>' +
      '<p class="cw-lbl"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></p>' +
      '<p class="cw-foot">' + (perfect > 0 ? '<b>' + perfect + ' perfect week' + (perfect === 1 ? '' : 's') + '.</b> ' : '') + 'Rest days are not misses.</p></div>';
  }
  if (sit === 'event') {
    // Days till, when a deadline exists
    if (shape.deadline) {
      const till = Math.max(0, Math.round((shape.deadline - new Date()) / 86400000));
      const lbl = 'days till ' + (shape.deadlineText ? shape.deadlineText : ccSyncFmtDate(shape.deadline));
      const foot = d1 ? 'Counting down to ' + ccSyncFmtDate(shape.deadline) + ', the date you set.'
        : (cs.totalActiveDays || 0).toLocaleString() + ' days shown up since you signed.' + (cs.longest ? ' Best run ' + cs.longest + '.' : '');
      return '<div class="v v-nf v-cdt"><span class="d-big">' + till.toLocaleString() + '</span><span class="d-lbl">' + esc(lbl) + '</span>' +
        '<p class="d-foot">' + esc(foot) + '</p></div>';
    }
    // no date: what it is made of carries the past
  }
  // What it is made of (open goals; also the event-without-date fallback)
  if (d1) {
    return '<div class="v v-nf">' +
      '<span style="font-size:15.5px;font-weight:650;color:rgba(var(--ink),.9)"><b style="font-size:46px;font-weight:700;letter-spacing:-.04em">1</b> good day, starting tonight</span>' +
      '<p class="d-foot" style="font-size:14px;margin-top:14px">Open goals are built from evidence. Tonight is the first piece.</p></div>';
  }
  const mo = ccSyncMadeOf();
  if (!mo || mo.total === 0 || mo.kinds < 2) {
    // one action type so far: the first-thing framing holds until variety exists
    const n = cs.totalActiveDays || 0;
    return '<div class="v v-nf">' +
      '<span style="font-size:15.5px;font-weight:650;color:rgba(var(--ink),.9)"><b style="font-size:46px;font-weight:700;letter-spacing:-.04em">' + n.toLocaleString() + '</b> good day' + (n === 1 ? '' : 's') + ' on record</span>' +
      '<p class="d-foot" style="font-size:14px;margin-top:14px">Open goals are built from evidence. Every mark here is a piece.</p></div>';
  }
  const seg = (w, cls) => w > 0 ? '<i class="' + cls + '" style="width:' + w + '%"></i>' : '';
  return '<div class="v v-consistency-made-of">' +
    '<div class="mo-head">' +
    '<span class="mo-num">' + (cs.current || 0).toLocaleString() + '</span>' +
    '<span class="mo-unit">day' + ((cs.current || 0) === 1 ? '' : 's') + '<br>in a row</span>' +
    '<span class="mo-win">last 30 days</span></div>' +
    '<div class="mo-bar" role="img" aria-label="' + mo.moves + ' moves, ' + mo.notes + ' reflections, ' + mo.deep + ' deep work sessions in the last 30 days.">' +
    seg(mo.movesPct, 'mo-a') + seg(mo.notesPct, 'mo-b') + seg(mo.deepPct, 'mo-c') + '</div>' +
    '<div class="mo-key">' +
    '<span><i class="mo-a"></i><b>' + mo.moves + '</b> moves</span>' +
    '<span><i class="mo-b"></i><b>' + mo.notes + '</b> reflections</span>' +
    '<span><i class="mo-c"></i><b>' + mo.deep + '</b> deep work</span></div></div>';
}

// typed proof in the last 30 days, for What it is made of
function ccSyncMadeOf() {
  try {
    const ev = state.proofEvents || [];
    const cut = Date.now() - 30 * 86400000;
    let moves = 0, notes = 0, deep = 0;
    ev.forEach(e => {
      const t = e.ts || (e.iso ? Date.parse(e.iso) : 0);
      if (!t || t < cut) return;
      const k = String(e.type || '');
      if (k === 'deepwork-commit') deep++;
      else if (k === 'reflection-save') notes++;
      else if (k === 'action-complete' || k === 'proof' || k === 'vivere') moves++;
    });
    const total = moves + notes + deep;
    const kinds = (moves ? 1 : 0) + (notes ? 1 : 0) + (deep ? 1 : 0);
    if (!total) return { total: 0, kinds: 0 };
    return {
      total: total, kinds: kinds, moves: moves, notes: notes, deep: deep,
      movesPct: Math.round(moves / total * 100),
      notesPct: Math.round(notes / total * 100),
      deepPct: Math.round(deep / total * 100)
    };
  } catch (e) { return null; }
}

// stall: three weeks of mostly-kept days against a number that has not moved.
// AUTO only where a number exists (the taxonomy's rule); never guesses.
function ccSyncStall(shape, cs) {
  try {
    const gp = state.goalProgress;
    if (!gp || gp.target === null || !Array.isArray(gp.history) || gp.history.length < 3) return null;
    const cut = new Date(Date.now() - 21 * 86400000);
    const recent = gp.history.filter(p => new Date(p.day) >= cut);
    if (recent.length < 2) return null;
    const span = Math.round((new Date(recent[recent.length - 1].day) - new Date(recent[0].day)) / 86400000);
    if (span < 14) return null;
    const moved = (recent[recent.length - 1].value - recent[0].value) * (shape.dir === 'down' ? -1 : 1);
    const expected = Math.abs(shape.target - (gp.baseline !== null ? gp.baseline : 0)) * (span / 180);
    if (moved > Math.max(expected * 0.15, Math.abs(shape.target) * 0.02)) return null;
    // and the days were kept
    const counts = cs.counts || {};
    let kept = 0, window = 0;
    for (let i = 1; i <= 21; i++) {
      const iso = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      window++;
      if (counts[iso] && consistencyDayHasMainAction(counts[iso])) kept++;
    }
    if (kept / window < 0.6) return null;
    return { kept: kept, window: window, weeks: 3, moved: Math.round(moved * 10) / 10 };
  } catch (e) { return null; }
}

// One deck height for the whole face set: the tallest of the three faces,
// measured offscreen at the card's real width, clamped to [212, 320]. Set as
// --cc-deck-h on #commandCenter; the CSS falls back to the old 212 when the
// legacy faces are showing.
function ccSyncDeckHeight(cc) {
  try {
    if (!cc || cc.id !== 'commandCenter') return;
    const card = cc.querySelector('.cc-card--pillars');
    if (!card) { cc.style.removeProperty('--cc-deck-h'); return; }
    const faces = ['action', 'clarity', 'consistency'].map(p => ccSyncFace(p)).filter(Boolean);
    // v1156: during a lockdown the comeback sentence is the tallest face on
    // the deck, so it has to be measured too or a long variant overruns it.
    try { if (ccLockdownActive()) faces.push('<div class="v v-nf">' + ccComebackSentence() + '<button class="a-btn" type="button">Build momentum</button></div>'); } catch (e) {}
    if (!faces.length) { cc.style.removeProperty('--cc-deck-h'); return; }
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + card.clientWidth + 'px;visibility:hidden;pointer-events:none;';
    faces.forEach(h => {
      // the probe wears .cc-card so every face-scoped rule applies; without
      // it the measured heights were of UNSTYLED text (v1156: that is why a
      // long comeback sentence overran a deck measured at its floor).
      const sec = document.createElement('section');
      sec.className = 'cc-card';
      sec.style.cssText = 'position:static;height:auto;min-height:0;margin:0;padding:22px 22px 20px;box-sizing:border-box;';
      sec.innerHTML = h;
      probe.appendChild(sec);
    });
    // inside #commandCenter, so #commandCenter-scoped face CSS resolves
    cc.appendChild(probe);
    let maxH = 0;
    probe.querySelectorAll(':scope > section').forEach(s => { maxH = Math.max(maxH, s.offsetHeight); });
    probe.remove();
    // v1153: dots left the card, and Malik wants the deck a touch taller so
    // the sparser faces never read as empty.
    const H = Math.max(240, Math.min(340, maxH + 18));
    cc.style.setProperty('--cc-deck-h', H + 'px');
  } catch (e) {}
}

/* v1155 THE COMEBACK SENTENCE (Malik). One big line that fills the box, in
   three parts: the count, a shrug, and a way back in. The shrug and the way
   back rotate (and the ending punctuation flips between . and !) so a person
   who falls off twice in a month never reads the same sentence, but it is
   SEEDED by the day + the gap, not random per render, so it cannot reshuffle
   under their eyes mid-session. Voice law: no em dashes, no "it's not X it's
   Y", plain words. */
const CC_CB_SHRUG = [
  'no worries', 'it happens', 'it be like that sometimes',
  'life got loud', 'that is allowed', 'no guilt here',
  'the record kept waiting', 'you are still here'
];
const CC_CB_BACK = [
  'let&rsquo;s get back into it',
  'pick a small one to get back in',
  'knock the cobwebs off and keep going',
  'start with the easiest version',
  'let&rsquo;s make today count',
  'one small move and the line is alive again',
  'grab the smallest win on the board'
];
function ccComebackSentence() {
  let gap = 0;
  try { gap = (typeof comebackGapDays === 'function') ? comebackGapDays() : 0; } catch (e) {}
  const dayWord = gap === 1 ? 'day' : 'days';
  // the seed: today + the gap. Same sentence all day, a new one next time.
  let seed = 0;
  try {
    const k = (typeof getTodayISO === 'function' ? getTodayISO() : '') + ':' + gap;
    for (let i = 0; i < k.length; i++) { seed = (seed * 31 + k.charCodeAt(i)) >>> 0; }
  } catch (e) { seed = gap * 7; }
  // mix before slicing: consecutive days differ by one character, so the raw
  // hash's high bits move in lockstep and every pick would correlate.
  const mix = (n) => { n = Math.imul(n ^ (n >>> 16), 2246822507); n = Math.imul(n ^ (n >>> 13), 3266489909); return (n ^ (n >>> 16)) >>> 0; };
  const shrug = CC_CB_SHRUG[mix(seed) % CC_CB_SHRUG.length];
  const back = CC_CB_BACK[mix(seed + 101) % CC_CB_BACK.length];
  const end = (mix(seed + 977) % 3 === 0) ? '!' : '.';
  // the greeting opens it (Malik) and the sentence carries the rest, one
  // block so the whole thing reads as a single held breath.
  const firstName = String((state.profile && state.profile.name) || '').trim().split(/\s+/)[0] || '';
  const hello = 'Welcome back' + (firstName ? ', ' + esc(firstName) : '') + '.';
  // the wrapper does the centring; the <p> must stay a normal block, a flex
  // <p> turns its own text runs into flex items and shreds the sentence.
  const body = 'You missed ' + gap + ' ' + dayWord + ', ' + shrug + ', ' + back + end;
  // one type step down past ~95 visible characters (a long name plus a long
  // variant), a second past ~120, so the sentence always fits the locked deck
  const len = hello.length + body.length;
  const size = len > 120 ? ' cb-wrap--xs' : (len > 95 ? ' cb-wrap--sm' : '');
  // the wrapper centres the pair; greeting and sentence are their OWN blocks
  // (Malik) so the hello lands as a greeting, not as the sentence's first
  // clause. A <p> must never be a flex box: it would shred its own text runs.
  return '<div class="cb-wrap' + size + '">' +
    '<p class="cb-hi">' + hello + '</p>' +
    '<p class="cb-line">You missed <b>' + gap + ' ' + dayWord + '</b>, ' + shrug + ', ' + back + end + '</p>' +
    '</div>';
}

// v1153 (Malik): does a quiet stretch actually MATTER for this goal? Rest
// days on a cadence plan are never misses, and a check-cadence plan is
// SUPPOSED to be quiet. Punishing those with a "days missed" box failed his
// review. Everyone else (rules, daily plans, quantity climbs, milestones,
// open goals) missed real days.
function ccComebackMatters(shape) {
  try {
    if (!shape) return true;
    if (shape.verb === 'check') return false;
    if (shape.type === 'frequency' && (shape.cadence || 7) < 7) return false;
    return true;
  } catch (e) { return true; }
}

// the entry point: the situation face for a pillar, or null for the legacy card
function ccSyncFace(pillar) {
  try {
    const shape = ccGoalShape();
    if (!shape) return null;
    const sit = ccSituation(shape);
    if (!sit) return null;
    const d1 = ccSyncDayOne();
    if (pillar === 'action') return ccSyncFaceAction(shape, sit, d1);
    if (pillar === 'clarity') return ccSyncFaceClarity(shape, sit, d1);
    if (pillar === 'consistency') return ccSyncFaceCons(shape, sit, d1);
    return null;
  } catch (e) { return null; }
}

// Back on rhythm: a frequency plan returning after a quiet stretch. The plan
// asked for N a week, not seven, so the gap is named without shame.
function ccSyncBackOnRhythm(shape) {
  try {
    if (!shape || shape.type !== 'frequency' || (shape.cadence || 7) >= 7) return null;
    const cad = shape.cadence || 3;
    const gap = (typeof comebackGapDays === 'function') ? comebackGapDays() : 0;
    if (gap < 2) return null;
    const weeks = ccSyncWeeks(2);
    const rows = weeks.slice(0, 2).reverse().map((w, ri) => {
      const label = ri === 0 ? 'Last week' : 'This week';
      const todayIdx = (new Date().getDay() + 6) % 7;
      const dots = w.days.map((on, i) => {
        let cls = 'v-cad__d';
        if (on) cls += ' v-cad__d--kept';
        else if (ri === 1 && i === todayIdx) cls += ' v-cad__d--today';
        else if (ri === 1 && i > todayIdx) cls += ' v-cad__d--open';
        return '<i class="' + cls + '"></i>';
      }).join('');
      const ok = w.kept >= cad;
      return '<div class="v-cad__wk"><span class="v-cad__wl">' + label + '</span>' +
        '<span class="v-cad__dots">' + dots + '</span>' +
        '<span class="v-cad__wc' + (ok ? ' v-cad__wc--ok' : '') + '">' + Math.min(w.kept, cad) + ' of ' + cad + '</span></div>';
    }).join('');
    const thisWk = weeks[0] || { kept: 0 };
    const daysLeft = 7 - ((new Date().getDay() + 6) % 7) - 1;
    const reachable = (cad - thisWk.kept) <= daysLeft;
    return '<div class="v v-cad">' +
      '<div class="v-cad__head">' + (gap === 2 ? 'Two' : gap === 3 ? 'Three' : gap === 4 ? 'Four' : gap === 5 ? 'Five' : gap === 6 ? 'Six' : gap) + ' quiet days.</div>' +
      '<div class="v-cad__sub">Your plan asks for ' + cad + ' a week, not seven.</div>' +
      '<div class="v-cad__weeks">' + rows + '</div>' +
      '<div class="v-cad__foot">' + (reachable
        ? daysLeft + ' day' + (daysLeft === 1 ? '' : 's') + ' left. ' + cad + ' is still reachable.'
        : 'This week is short. Next week starts even.') + '</div></div>';
  } catch (e) { return null; }
}

function renderCommandCenter() {
  try {
    // Seal closed days into the offering ledger (defined in js/02, loaded
    // first). Idempotent and cheap after the first call of the day.
    try { if (typeof actionLedgerBackfill === 'function') actionLedgerBackfill(); } catch (_) {}
    const hasClarity = !!(state.clarity && state.clarity.completed && state.clarity.answers && state.clarity.answers.neutronStar);
    const pa = (state.action && state.action.primaryAction) || {};
    const tiers = pa.tiers || {};
    const hasPlan = !!(state.action && state.action.planGenerated && pa.title);
    const C = ccAccentColor();
    // v1051: --pillars is the class that locks ONE height across the
    // swipeable pillars, so the box never resizes under the swipe. It is only
    // added where swiping is offered; every other card state keeps its own
    // natural height. v1104: swiping is offered from the moment the star
    // exists (two faces pre-plan), not only once there is a plan.
    const _pillars = ccPillarList();
    // v1153/v1154 THE LOCKDOWN (Malik): a real gap owns the box. The deck
    // shrinks to the comeback face + the goal face (ccPillarList), the
    // Memento dims dormant, and Build momentum is the way forward. Rate
    // plans get the calm Back on rhythm face instead and keep the full deck.
    let _lockdown = false;
    try { _lockdown = ccLockdownActive(); } catch (e) { _lockdown = false; }
    try { document.body.classList.toggle('is-dormant', _lockdown); } catch (e) {}
    const _pillared = _pillars.length > 1;
    // A face that no longer exists (the plan was reset while consistency was
    // showing) falls back to the action face instead of rendering nothing.
    if (_pillars.indexOf(_ccPillar) === -1) _ccPillar = 'action';
    const dots = (pillar) => {
      if (!_pillared) return '';
      const li = _pillars.indexOf(pillar);
      return '<div class="cc-dots" aria-hidden="true">' +
        _pillars.map((p, n) => '<i' + (n === li ? ' class="on"' : '') + '></i>').join('') + '</div>';
    };
    const wrap = (inner) => '<section class="cc-card' + (_pillared ? ' cc-card--pillars' : '') + '" style="margin:0 0 14px;padding:22px 22px 20px;border-radius:var(--card-r);background:var(--surface-1);box-shadow:var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06);">' + inner + '</section>';
    // v1049 (Malik): the label is NEUTRAL, never the accent. Colour on a tiny
    // uppercase kicker is the fastest way for a surface to read cheap, and the
    // today box is the one people see every day.
    const eyebrow = (t) => '<div style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:8px;">' + t + '</div>';
    const primaryBtn = (label, action) => '<button class="cc-primary" data-cc-action="' + action + '" style="flex:0 1 auto;min-width:180px;font:inherit;font-weight:700;font-size:0.92rem;cursor:pointer;border:none;border-radius:calc(8px * var(--rx, 1));padding:12px 40px;background:var(--solid-bg);color:var(--solid-fg);">' + esc(label) + '</button>';

    if (_lockdown && _ccPillar !== 'clarity') {
      // the comeback face, in the deck's own language. The goal face stays a
      // swipe away (Malik: "so they can remember"); consistency waits.
      return wrap('<div class="v v-nf">' + ccComebackSentence() +
        '<div style="margin-top:auto"></div>' +
        '<button class="a-btn" data-cc-action="comeback" type="button">Build momentum</button>' +
        '</div>' + dots('action'));
    }

    if (!hasClarity) {
      return wrap(eyebrow('First step') +
        '<div style="font-size:1.15rem;font-weight:700;color:var(--text-hi);margin-bottom:6px;">Find your Neutron Star</div>' +
        '<div style="font-size:0.9rem;line-height:1.5;color:var(--text-2);margin-bottom:14px;">Get clear on the one goal that actually matters to you above all else. This will be the foundation of your Memento.</div>' +
        '<div style="display:flex;">' + primaryBtn('Start', 'clarity') + '</div>');
    }
    if (!hasPlan && _ccPillar === 'action') {
      // v777 (Malik): ONE eyebrow, one line, one button. The goal text is gone,
      // they literally just forged it; repeating it here read as AI over-explaining.
      // v1104: now a deck face (it swipes to the star), so it carries the dots.
      return wrap(eyebrow('Next step') +
        '<div style="font-size:1.15rem;font-weight:700;color:var(--text-hi);margin-bottom:14px;">Turn your Neutron Star into a tangible daily action</div>' +
        '<div style="display:flex;">' + primaryBtn('Build my plan', 'action') + '</div>' +
        dots('action'));
    }

    // v1051 (Malik): swipe the phone card between the pillars. The ACTION
    // pillar is untouched, it falls through to the exact card that shipped
    // before, so the everyday screen carries zero risk. The other faces are
    // their own small cards. v1104: offered from the star onward, not only
    // once there is a plan.
    if (_pillared && _ccPillar !== 'action') {
      // v1150: the sync box. The goal's type picks the face; null falls back
      // to the legacy card so a classification gap can never brick the home.
      const _sf = ccSyncFace(_ccPillar);
      if (_sf) return wrap(_sf + dots(_ccPillar));
      if (_ccPillar === 'clarity') {
        const a = (state.clarity && state.clarity.answers) || {};
        const star = String(a.neutronStar || '').trim();
        const why = String(a.coreWhy || a.whyItMatters || '').trim();
        // v1057 (Malik, twice): the why is NOT on the glance face; it lives
        // inside the module. v1061 (Malik: "it feels kinda bland... very
        // empty"): the statement gets the two-tone treatment (outcome
        // bright, qualifier quiet) and a tenure line underneath, so the face
        // reads as a commitment with a history, not a floating sentence.
        // Two-tone is heuristic and FAIL-SAFE: it only splits on a clear
        // connector, and any star without one renders plain, so it can never
        // mangle anyone's words.
        return wrap(eyebrow('Your Neutron Star') +
          '<div class="cc-face-hd" style="font-size:1.15rem;font-weight:700;line-height:1.3;color:var(--text-hi);">' + ccStarTwoTone(star || 'Your Neutron Star') + '</div>' +
          ccStarTenureLine() +
          dots('clarity'));
      }
      let _s = 0, _b = 0, _act = 0;
      try {
        const cs = (typeof consistencyStats === 'function') ? consistencyStats() : null;
        _s = (cs && cs.current) || 0; _b = (cs && cs.longest) || 0; _act = (cs && cs.totalActiveDays) || 0;
      } catch (e) {}
      // v1058 (Malik: "I kinda want the 8 to be bigger", his variants 1+2):
      // the number IS the headline, its meaning beside it in small type, the
      // picked view underneath. The graph carries the history, so no
      // sentence restates it.
      // v1060: score joins the meta (pct of the last 30 days active), and the
      // view picker rides the face as a native select, top-right.
      let _score = 0;
      try { _score = consistencyStats().pct30 || 0; } catch (e) {}
      const _vsel = '<select class="cc-vsel" aria-label="Consistency view">' +
        CC_FACE_VIEWS.map((v) => '<option value="' + v + '"' + (v === ccFaceView() ? ' selected' : '') + '>' +
          v.charAt(0).toUpperCase() + v.slice(1) + '</option>').join('') + '</select>';
      let _flame = '';
      try {
        if (_s > 0 && typeof streakFlameTier === 'function') {
          const fl = streakFlameTier(_s);
          _flame = '<svg class="cc-flame" width="' + fl.s + '" height="' + fl.s + '" viewBox="0 0 24 24" fill="' + fl.c +
            '" style="filter:drop-shadow(0 0 ' + fl.g + 'px ' + fl.c + ') brightness(1.15) saturate(1.2);flex:0 0 auto;" aria-hidden="true">' +
            '<path fill-rule="evenodd" clip-rule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.989 5.989 0 0 1 1.925-3.547 3.75 3.75 0 0 1 3.255 3.719Z"/></svg>';
        }
      } catch (e) {}
      return wrap(eyebrow('Consistency') +
        '<div class="cc-bigrow">' +
          '<span class="cc-bignum">' + _s.toLocaleString() + '</span>' + _flame +
          '<span class="cc-bigmeta">' + (_s === 1 ? 'day in a row' : 'days in a row') +
            '<br>' + (_score ? 'score ' + _score + '%' : '') +
              (_score && _b ? ' \u00b7 ' : '') + (_b ? 'best ' + _b.toLocaleString() : '') +
          '</span>' +
          _vsel +
        '</div>' +
        ccFaceGraph(ccFaceView(), false) +
        dots('consistency'));
    }

    // COMEBACK, the calm kind (v1153): the lockdown above owns the gaps that
    // matter. Down here only the goals whose quiet days are legitimate reach
    // us: a rate plan gets Back on rhythm (the gap against THEIR cadence),
    // and everyone else is simply not punished, the normal faces render.
    if (typeof isComebackGap === 'function' && isComebackGap()) {
      const _bor = ccSyncBackOnRhythm(ccGoalShape());
      if (_bor) return wrap(_bor + dots('action'));
    }

    // v1150: the sync box Action face. Null falls back to the shipped hero.
    {
      const _sfA = ccSyncFace('action');
      if (_sfA) return wrap(_sfA + dots('action'));
    }
    // honor the user's chosen intensity (Action picker or a coach shrink), the
    // same way the Action module does, so the home never contradicts it
    const _TK = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    const _selT = state.action && state.action.selectedTier;
    const _activeTier = _TK.indexOf(_selT) >= 0 ? _selT : pa.recommendedTier;
    // Night 3: the daily loop can chain a next action into today ("Do it
    // now") or lock one overnight; either outranks the cadence tier text so
    // the home never contradicts the Action page. Never after today is done:
    // a locked-for-TOMORROW action under a green Completed reads as a lie.
    const _loopNext = (!actionDoneToday() && state.action.loop && String(state.action.loop.chained || state.action.loop.nextAction || '').trim()) || '';
    const oneThing = _loopNext || (tiers[_activeTier] || tiers[pa.recommendedTier] || pa.title || '').trim() || 'Take one step toward your goal today';
    const tiny = tiers.tiny || '';
    const how = pa.howToStart || pa.recommendedWhy || '';
    const todayStr = getTodayISO();
    const doneToday = actionDoneToday();
    // Read the streak from the SAME source as the heatmap (consistencyStats counts
    // today the moment an action is logged) so day-1 reads "1" the instant they
    // finish, instead of the legacy state.streak.count which can lag behind a render.
    let streak = 0;
    try { streak = (typeof consistencyStats === 'function') ? (consistencyStats().current || 0) : ((state.streak && state.streak.count) || 0); }
    catch (e) { streak = (state.streak && state.streak.count) || 0; }

    // ---- Home hero. v27 retires the old swappable centerpiece: the card-centered
    // Home gives Consistency its own tile and the goal lives in Clarity, so the
    // command center ALWAYS leads with Today's one thing (the daily mission/focus).
    // Forcing it here (rather than reading state.ui.homeHero) means the retired
    // Settings selector can't re-introduce the tall consistency/goal hero that
    // overflowed the narrow bento column. The toggle is hidden in the bento CSS.
    const hero = 'oneThing';
    const seg = (k, label) => '<button class="cc-hero-seg' + (hero === k ? ' is-active' : '') + '" data-cc-hero="' + k + '" aria-label="Show ' + esc(label) + '" aria-pressed="' + (hero === k ? 'true' : 'false') + '" style="font:inherit;font-weight:650;font-size:0.76rem;cursor:pointer;border:none;border-radius:calc(6px * var(--rx, 1));padding:7px 14px;background:transparent;color:' + (hero === k ? 'var(--text-hi)' : 'var(--text-lo)') + ';position:relative;z-index:1;transition:color .22s ease;">' + esc(label) + '</button>';
    // v19 daily bookend / weekly-review banner removed (Malik: felt like clutter
    // above the hero, and overlapped the Check-in widget). The weekly review is
    // still reachable from the dashboard "Review" link. Reversible in git history.
    let _beBanner = '';
    // (v776, Malik: the "Your week, counted" banner is OFF the home, it read as
    // clutter. The weekly recap card still lands in Updates; if it ever returns
    // to the home it will be as a proper full-screen moment, not a strip.)
    let row = _beBanner + '<div class="cc-hero-toggle" style="position:relative;display:inline-flex;gap:2px;padding:3px;border-radius:calc(8px * var(--rx, 1));background:var(--kfill-04);border:1px solid var(--hairline);margin-bottom:18px;"><span class="cc-hero-pill" aria-hidden="true"></span>' +
      seg('consistency', 'Consistency') + seg('oneThing', 'Today') + seg('neutron', 'Goal') + '</div>';
    row += '<div class="cc-hero-body">';

    if (hero === 'neutron') {
      const ns = state.clarity.answers.neutronStar || '';
      const why = state.clarity.answers.coreWhy || state.clarity.answers.whyMatters || '';
      const th = state.clarity.answers.timeHorizon || '';
      row += '<div style="font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;color:' + C + ';font-weight:700;margin-bottom:10px;">Your Neutron Star</div>';
      row += '<div style="font-size:1.5rem;font-weight:700;line-height:1.25;letter-spacing:-0.01em;color:var(--text-hi);margin-bottom:12px;">' + esc(ns) + '</div>';
      if (why) row += '<div style="font-size:0.9rem;line-height:1.5;color:var(--text-mid);margin-bottom:6px;"><span style="color:var(--text-lo);">Why it matters: </span>' + esc(why) + '</div>';
      if (th) row += '<div style="font-size:0.85rem;color:var(--text-lo);">Horizon: ' + esc(th) + '</div>';
      // v19 Daily Cockpit: Projects -> Milestones, anchored under the Neutron Star.
      {
        const _pjs = (state.action && Array.isArray(state.action.projects)) ? state.action.projects : [];
        const _tot = _pjs.reduce((n, p) => n + ((p.milestones && p.milestones.length) || 0), 0);
        const _don = _pjs.reduce((n, p) => n + ((p.milestones || []).filter(m => m.done).length), 0);
        const _pa = (state.action && state.action.primaryAction) || {};
        let _link = '';
        if (_pa.linkedMilestoneId) {
          const _lp = _pjs.find(p => p.id === _pa.linkedProjectId);
          const _lm = _lp && (_lp.milestones || []).find(m => m.id === _pa.linkedMilestoneId);
          if (_lm) _link = '<div style="font-size:0.8rem;color:var(--text-mid);margin-top:11px;line-height:1.45;"><span style="color:' + C + ';font-weight:650;">Today&rsquo;s focus: </span>' + esc(_lm.title) + (_lp ? ' <span style="color:var(--text-lo);">&middot; ' + esc(_lp.title) + '</span>' : '') + '</div>';
        }
        row += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--hairline);">';
        if (_pjs.length) {
          row += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">';
          row += '<div style="font-size:0.82rem;color:var(--text-mid);"><span style="color:var(--text-hi);font-weight:700;">' + _pjs.length + '</span> project' + (_pjs.length === 1 ? '' : 's') + ' &middot; <span style="color:var(--text-hi);font-weight:700;">' + _don + '</span>/' + _tot + ' milestones</div>';
          row += '<button class="cc-proj-open" data-cc-proj style="font:inherit;font-weight:650;font-size:0.78rem;cursor:pointer;border:1px solid var(--hairline);background:transparent;color:var(--text-hi);border-radius:calc(6px * var(--rx, 1));padding:7px 13px;transition:border-color .15s ease;">Open projects &rarr;</button>';
          row += '</div>' + _link;
        } else {
          row += '<div style="font-size:0.84rem;color:var(--text-mid);line-height:1.5;margin-bottom:12px;">Break this goal into projects and milestones you can check off.</div>';
          row += '<button class="cc-proj-open" data-cc-proj style="font:inherit;font-weight:650;font-size:0.8rem;cursor:pointer;border:none;background:var(--kfill-08);color:var(--text-hi);border-radius:calc(6px * var(--rx, 1));padding:9px 15px;">Add projects &rarr;</button>';
        }
        row += '</div>';
      }
    } else if (hero === 'oneThing') {
      // Today: one clean layout. The one thing, then the daily loop (act / check
      // in / review) and the Vivere "one thing to live". This is the only tab the
      // daily loop lives in, so the Consistency and Goal tabs stay focused.
      row += '<div class="cc-od-eyebrow" style="font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-lo);margin-bottom:6px;">Today</div>';
      row += '<div class="cc-od-title cc-face-hd" style="font-size:1.5rem;font-weight:700;line-height:1.25;letter-spacing:-0.01em;color:var(--text-hi);margin-bottom:12px;">' + esc(oneThing) + '</div>';
      // One quiet, derived "why": ties today's action back to the goal so it
      // never reads as busywork. Only in this normal oneThing state.
      {
        const _why = ccActionWhyLine();
        if (_why) row += '<div class="cc-od-why" style="font-size:0.85rem;line-height:1.45;color:var(--text-2);margin-top:6px;">' + esc(_why) + '</div>';
      }
      // Last night's self-named action, if one was planned. Their own words
      // outrank everything else on the surface, shown first and quietly.
      {
        const tp = state.action.tomorrowPlan;
        if (tp && tp.date === todayStr && tp.text && !doneToday) {
          row += '<div style="font-size:0.85rem;line-height:1.45;color:var(--text-mid);margin-bottom:6px;"><span style="color:' + C + ';font-weight:650;">You planned this last night: </span>' + esc(tp.text) + '</div>';
        }
      }
      // v1060 (Malik): the glance face carries the move, the dayline and the
      // button, nothing else. Minimum and the resistance line are module
      // detail; on the face they read as clutter (his resized-window catch).
      if (!_pillared) {
        if (tiny) row += '<div class="cc-od-sub" style="font-size:0.85rem;line-height:1.45;color:var(--text-mid);margin-bottom:6px;"><span style="color:var(--text-lo);">Minimum: </span>' + esc(tiny) + '</div>';
        if (how) row += '<div class="cc-od-sub" style="font-size:0.85rem;line-height:1.45;color:var(--text-mid);"><span style="color:var(--text-lo);">If resistance hits: </span>' + esc(how) + '</div>';
      }
      // v1057 (Malik's pick from the pillar gallery: "Day remaining"). A
      // hairline that DRAINS as the day does, no clock, no numbers: urgency
      // without a countdown reading as cheap. The day is Action's day, 4am
      // to 4am (the Phase A3 boundary), so it agrees with when a move
      // actually rolls over. Hidden once today's move is done: a drained
      // bar over a completed day would read as a scold.
      if (!doneToday) {
        let _rem = 0.5;
        try {
          const _n = new Date();
          const _st = new Date(_n.getFullYear(), _n.getMonth(), _n.getDate(), 4, 0, 0);
          if (_n < _st) _st.setDate(_st.getDate() - 1);
          _rem = Math.max(0, Math.min(1, 1 - (_n - _st) / 86400000));
        } catch (e) {}
        row += '<div class="cc-dayline" aria-hidden="true"><b style="width:' + (_rem * 100).toFixed(1) + '%"></b></div>';
      }
      // ---- the daily loop (lives only in Today) --------------------------------
      // The dayline IS a hairline, so on days it renders, the divider that
      // used to sit here would read as a doubled line 8px away. One or the
      // other, never both.
      row += '<div style="margin-top:8px;padding-top:6px;' + (doneToday ? 'border-top:1px solid var(--hairline);' : '') + '">';
      row += '<div style="display:flex;">';
      if (doneToday) {
        row += '<div class="cc-completed-action" role="status">Completed</div>';
      } else {
        // One deliberate confirmation. The button fills for the entire hold;
        // the Action module remains available from the primary Do navigation.
        row += '<button class="cc-primary cc-hold-complete" data-cc-action="didit" aria-label="Hold for three seconds to mark complete"><span class="cc-hold-complete__fill" aria-hidden="true"></span><span class="cc-hold-complete__label">Mark Complete</span></button>';
      }
      row += '</div>';
      // Live social proof from the optional backend (real data; hidden at 0 / offline).
      {
        const _tc = (state.meta && state.meta.todayCount) || 0;
        if (_tc > 0) {
          row += '<div style="margin-top:12px;display:flex;align-items:center;gap:7px;font-size:0.8rem;color:var(--text-2);">' +
            '<span style="width:6px;height:6px;border-radius:50%;background:' + C + ';box-shadow:0 0 8px ' + C + ';flex:none;"></span>' +
            '<span><b style="color:var(--text-hi);font-weight:700;">' + _tc + '</b> ' + (_tc === 1 ? 'person' : 'people') + ' showed up today</span></div>';
        }
      }
      // ---- "One thing to live" (Vivere). The calm counterweight to the build
      // loop above: today's life practice, one quiet line, tap to open Vivere.
      try {
        const vToday = (typeof VIVERE_PARKED !== 'undefined' && VIVERE_PARKED) ? null
          : ((typeof vivEnsureToday === 'function') ? vivEnsureToday() : null);
        if (vToday && vToday.prompt) {
          const livedTxt = vToday.done ? 'Kept today. ' + esc(vToday.prompt) : esc(vToday.prompt);
          row += '<div class="cc-live">'
            + '<div class="cc-live__label"><span class="cc-live__dot"></span>One thing to live</div>'
            + '<div class="cc-live__text">' + livedTxt + '</div>'
            + '<button class="cc-live__open" id="ccVivereOpen" type="button">' + (vToday.done ? 'Open Vivere' : 'Live it') + ' &rarr;</button>'
            + '</div>';
        }
      } catch (e) {}
      row += '</div>'; // close the daily-loop block (Today)
    } else {
      let cs = { current: streak, longest: 0, thisWeek: 0, totalActiveDays: 0, counts: {} };
      try { cs = consistencyStats(); } catch (e) {}
      const best = (state.streak && state.streak.bestEver) || cs.longest || cs.current || 0;
      let dots = '';
      try {
        const counts = cs.counts || {};
        const todayNum = Math.floor(Date.parse(getTodayISO() + 'T00:00:00Z') / 86400000);
        const dl = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        for (let i = 6; i >= 0; i--) {
          const dnum = todayNum - i;
          const iso = new Date(dnum * 86400000).toISOString().split('T')[0];
          const dow = new Date(dnum * 86400000).getUTCDay();
          const on = consistencyDayHasMainAction(counts[iso]);
          dots += '<div style="display:flex;flex-direction:column;align-items:center;gap:7px;">' +
            '<div style="width:11px;height:11px;border-radius:50%;background:' + (on ? C : 'rgba(var(--ink),0.10)') + ';box-shadow:' + (on ? '0 0 8px ' + C : 'none') + ';"></div>' +
            '<span style="font-size:0.58rem;color:var(--text-faint);font-weight:600;">' + dl[dow] + '</span></div>';
        }
      } catch (e) {}
      row += '<div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:16px;">' +
        '<div id="ccStreakNum" style="font-size:4rem;font-weight:800;line-height:0.85;letter-spacing:-0.03em;color:var(--text-hi);font-variant-numeric:tabular-nums;">' + streak + '</div>' +
        '<div style="padding-bottom:6px;"><div style="font-size:1.05rem;font-weight:650;color:var(--text-hi);line-height:1.1;display:flex;align-items:center;gap:6px;">' + (streak > 0 ? (function () { const fl = streakFlameTier(streak); return '<svg width="' + fl.s + '" height="' + fl.s + '" viewBox="0 0 24 24" fill="' + fl.c + '" style="flex:none;filter:drop-shadow(0 0 ' + fl.g + 'px ' + fl.c + ') brightness(1.15) saturate(1.2);">'; })() + '<path fill-rule="evenodd" clip-rule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.989 5.989 0 0 1 1.925-3.547 3.75 3.75 0 0 1 3.255 3.719Z"/></svg>' : '') + 'day streak</div>' +
        '<div style="font-size:0.8rem;color:var(--text-lo);margin-top:3px;">Best ' + best + '  &middot;  ' + cs.totalActiveDays + ' active days</div></div>' +
        '</div>';
      // Last night's named action follows the user to the default hero too,
      // so the morning greeting works no matter which tab they keep.
      {
        const tp = state.action && state.action.tomorrowPlan;
        if (tp && tp.date === todayStr && tp.text && !doneToday) {
          row += '<div style="font-size:0.85rem;line-height:1.45;color:var(--text-mid);margin-bottom:14px;"><span style="color:' + C + ';font-weight:650;">You planned this last night: </span>' + esc(tp.text) + '</div>';
        }
      }
      // Anti-fragile primary metric: a rolling 30-day percentage that only ever
      // nudges, so one missed day can never read as catastrophic.
      // Consistency expressed as 0-100 SCORES (not percentages): the 30-day
      // score counts main-Action days; the year score can show a small partial
      // signal for support work. Updated in place on a square tap.
      if (cs.totalActiveDays > 0) {
        row += '<div id="ccScoreLine" style="display:flex;gap:18px;margin-bottom:14px;font-size:0.85rem;color:var(--text-lo);">' + ccScoreLineInner(cs) + '</div>';
      }
      // Heatmap / Trend toggle: show one at a time (state.ui.consistencyView).
      const _cv = (state.ui && state.ui.consistencyView === 'trend') ? 'trend' : 'heatmap';
      const _cvSeg = (k, label) => '<button class="cc-cv-seg' + (_cv === k ? ' is-on' : '') + '" data-cc-cv="' + k + '" style="font:inherit;font-weight:650;font-size:0.72rem;cursor:pointer;border:none;border-radius:calc(6px * var(--rx, 1));padding:6px 13px;background:' + (_cv === k ? 'rgba(var(--ink),0.07)' : 'transparent') + ';color:' + (_cv === k ? 'var(--text-hi)' : 'var(--text-lo)') + ';transition:color .18s ease,background .18s ease;">' + label + '</button>';
      row += '<div style="margin-bottom:13px;">';
      row += '<div class="cc-cv-toggle" style="display:inline-flex;gap:2px;padding:3px;border-radius:calc(8px * var(--rx, 1));background:var(--kfill-04);border:1px solid var(--hairline);">' + _cvSeg('heatmap', 'Heatmap') + _cvSeg('trend', 'Trend') + '</div>';
      row += '</div>';
      if (_cv === 'trend') {
        try { row += renderConsistencyTrajectory(52); } catch (e) {}
      } else {
        // Phones get half the span so each cell is twice the size; a year of
        // 4px squares read as texture, not data.
        try { row += renderConsistencyHeatmap(window.innerWidth < 700 ? 26 : 53, 'rolling', true, 'year'); } catch (e) {}
      }
      // (The week-of-proof breakdown lives in the full Consistency module, not
      // on the dashboard hero, to keep this view clean.)
    }

    row += '</div>'; // close .cc-hero-body (the swappable hero content)
    // v1051: the dots, so the swipe is discoverable. Count and highlight come
    // from the live pillar list, matching where swiping is offered at all.
    row += dots('action');
    return wrap(row);
  } catch (e) { return ''; }
}
// Shared command-center hero motion convention: one easing, one rise duration,
// one fade duration, reused by every hero swap so the dashboard moves as a
// single piece. Mirrors the CSS (--cc-ease / --cc-rise / --cc-fade).
const CC_EASE = 'cubic-bezier(0.22,1,0.36,1)';
const CC_RISE_MS = 280;
const CC_FADE_MS = 220;
function _ccMotionOff() {
  return (document.body.classList.contains('calm-motion') || document.body.classList.contains('lite') ||
    document.documentElement.classList.contains('lowfx') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
}
// Re-render the command center while smoothly tweening the hero body's height
// and crossfading the new content in. mutate() flips the relevant state first.
function _ccHeroSwap(mutate) {
  const ccEl = document.getElementById('commandCenter');
  if (!ccEl) { try { mutate(); } catch (e) {} return; }
  const reduce = _ccMotionOff();
  const oldBody = ccEl.querySelector('.cc-hero-body');
  const oldH = oldBody ? oldBody.offsetHeight : 0;
  try { mutate(); } catch (e) {}
  try { ccEl.innerHTML = renderCommandCenter(); bindCommandCenter(ccEl); } catch (e) { return; }
  if (reduce) return;
  const newBody = ccEl.querySelector('.cc-hero-body');
  if (!newBody) return;
  const newH = newBody.scrollHeight;
  newBody.style.overflow = 'hidden';
  newBody.style.transition = 'none';
  newBody.style.height = oldH + 'px';
  newBody.style.opacity = '0.4';
  void newBody.offsetHeight;
  newBody.style.transition = 'height ' + CC_RISE_MS + 'ms ' + CC_EASE + ', opacity ' + CC_FADE_MS + 'ms ease-out';
  newBody.style.height = newH + 'px';
  newBody.style.opacity = '1';
  setTimeout(() => { try { newBody.style.height = 'auto'; newBody.style.overflow = ''; newBody.style.transition = ''; newBody.style.opacity = ''; } catch (e) {} }, CC_RISE_MS + 40);
}
// v812 Desktop Editorial home (Malik's pick, prototypes/home-desktop-lab-v4,
// Editorial tab, ported verbatim): the mission set as a 42px headline beside
// the card, with the Done button + streak/proofs stats inline beneath it.
// Desktop-only twin of the command center (CSS hides it <1024 and hides the
// command center's box at >=1024 under ns-bloom). The INFORMATION LAW: every
// fact appears exactly once on the desktop home; mission = this headline,
// done = the button, streak + proofs = the stat pair, the year = the heatmap,
// time/death = the clock. Reuses the same data-cc-action wiring.
// v1050: which pillar the desktop box is showing. Deliberately NOT persisted:
// a relaunch always lands on today's action, never on a screen the person did
// not choose this session (resume never lands ahead).
let _deskPillar = 'action';
// v1060: while the mouse is inside the desktop box, the fans keep the order
// they were showing when it arrived, so clicks never shuffle the words under
// the cursor. Cleared on pointerleave; canonical order returns on re-entry.
let _deskFanHold = null;
let _deskVfanHold = null;
function _freezeDeskFans(el) {
  try {
    if (!_deskFanHold) {
      const seen = [...el.querySelectorAll('.dkm__fan .dkm__fan-cur, .dkm__fan .dkm__fan-btn')]
        .filter((n) => !n.closest('.dkm__inv'))
        .map((n) => n.getAttribute('data-dkm-pillar') || _deskPillar);
      if (seen.length === 3) _deskFanHold = seen;
    }
    if (!_deskVfanHold) {
      const seenV = [...el.querySelectorAll('.dkm__vfan .dkm__vfan-cur, .dkm__vfan .dkm__vfan-btn')]
        .filter((n) => !n.closest('.dkm__inv'))
        .map((n) => n.getAttribute('data-dkm-view') || ((typeof ccFaceView === 'function') ? ccFaceView() : 'week'));
      if (seenV.length === 4) _deskVfanHold = seenV;
    }
  } catch (e) {}
}
function renderDeskMission() {
  try {
    const el = document.getElementById('deskMission');
    if (!el) return;
    const hasClarity = !!(state.clarity && state.clarity.completed && state.clarity.answers && state.clarity.answers.neutronStar);
    // v1043 (Malik): the greeting above today's box. Someone who has not found
    // their star yet is still arriving, so they get "Welcome"; everyone after
    // that gets the time of day. Rendered here rather than in renderGreeting
    // so it can never disagree with the panel underneath it.
    try {
      const g = document.getElementById('deskGreeting');
      if (g) {
        const name = (state.profile && state.profile.name || '').trim();
        const h = new Date().getHours();
        const when = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        const word = hasClarity ? when : 'Welcome';
        g.textContent = name ? (word + ', ' + name + '.') : (word + '.');
      }
    } catch (e) {}
    const pa = (state.action && state.action.primaryAction) || {};
    const tiers = pa.tiers || {};
    const hasPlan = !!(state.action && state.action.planGenerated && pa.title);
    const label = (t) => '<div class="dkm__label">' + t + '</div>';
    const head = (t) => '<div class="dkm__headline">' + esc(t) + '</div>';
    const solid = (t, action) => '<button class="dkm__btn dkm__btn--solid" data-cc-action="' + action + '">' + esc(t) + '</button>';
    const sub = (t) => '<div class="dkm__sub">' + esc(t) + '</div>';

    if (!hasClarity) {
      // v1046 (Malik): the explainer that mobile has always shown here was
      // missing on desktop, so the very first screen said less on the bigger
      // display. Same sentence, same state, both places.
      el.innerHTML = label('First step') + head('Find your Neutron Star.') +
        sub('Get clear on the one goal that actually matters to you above all else. This will be the foundation of your Memento.') +
        '<div class="dkm__row">' + solid('Start', 'clarity') + '</div>';
    } else if (!hasPlan) {
      el.innerHTML = label('Next step') + head('Turn your Neutron Star into a tangible daily action.') +
        '<div class="dkm__row">' + solid('Build my plan', 'action') + '</div>';
    } else if (typeof isComebackGap === 'function' && isComebackGap()) {
      // v1048: identical to the phone now, word for word. Name the gap, say
      // the kind thing, one door; the ways back live in ComebackPicker.
      let gap = 0;
      try { gap = (typeof comebackGapDays === 'function') ? comebackGapDays() : 0; } catch (e) {}
      el.innerHTML = label(gap + ' ' + (gap === 1 ? 'day' : 'days') + ' missed') +
        head('No worries, let’s get back to it.') +
        '<div class="dkm__row">' + solid('Keep going', 'comeback') + '</div>';
    } else {
      const _TK = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
      const _selT = state.action && state.action.selectedTier;
      const _activeTier = _TK.indexOf(_selT) >= 0 ? _selT : pa.recommendedTier;
      let mission = (tiers[_activeTier] || tiers[pa.recommendedTier] || pa.title || '').trim() || 'Take one step toward your goal today';
      if (!/[.!?]$/.test(mission)) mission += '.';
      let streak = 0;
      try { streak = (typeof consistencyStats === 'function') ? (consistencyStats().current || 0) : ((state.streak && state.streak.count) || 0); }
      catch (e) { streak = (state.streak && state.streak.count) || 0; }
      const done = actionDoneToday();
      const doneBtn = done
        ? '<div class="dkm__btn dkm__btn--done">Completed</div>'
        : '<button class="dkm__btn dkm__btn--solid cc-hold-complete" data-cc-action="didit" aria-label="Hold for three seconds to mark complete"><span class="cc-hold-complete__fill" aria-hidden="true"></span><span class="cc-hold-complete__label">Mark Complete</span></button>';
      // v940 (Malik): the streak reads as a NUMBER + FLAME, the treatment he
      // liked, not a bare stat column. The flame is the existing tiered one
      // (streakFlameTier: colour, size and glow all escalate with the streak),
      // so a long run visibly burns hotter instead of just counting higher.
      let _cs = null;
      try { _cs = (typeof consistencyStats === 'function') ? consistencyStats() : null; } catch (e) {}
      const _best = _cs ? (_cs.longest || 0) : 0;
      const _active = _cs ? (_cs.totalActiveDays || 0) : 0;
      const _score30 = _cs ? (_cs.pct30 || 0) : 0;
      const flameSvg = (n) => {
        const fl = streakFlameTier(n);
        return '<svg class="dkm__flame" width="' + fl.s + '" height="' + fl.s + '" viewBox="0 0 24 24" fill="' + fl.c +
          '" style="filter:drop-shadow(0 0 ' + fl.g + 'px ' + fl.c + ') brightness(1.15) saturate(1.2);" aria-hidden="true">' +
          '<path fill-rule="evenodd" clip-rule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.177A7.547 7.547 0 0 1 6.648 6.61a.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.989 5.989 0 0 1 1.925-3.547 3.75 3.75 0 0 1 3.255 3.719Z"/></svg>';
      };
      const streakChip =
        '<div class="dkm__streak">' +
          '<div class="dkm__streak-top">' +
            '<span class="dkm__streak-n">' + streak.toLocaleString() + '</span>' +
            (streak > 0 ? flameSvg(streak) : '') +
            '<span class="dkm__streak-l">day streak</span>' +
          '</div>' +
          (_best || _active
            ? '<div class="dkm__streak-sub">Best ' + _best.toLocaleString() +
              ' &middot; ' + _active.toLocaleString() + ' active days</div>'
            : '') +
        '</div>';
      // v1050 (Malik's pick): the fan. At rest the card carries only the word
      // it already had; the other two pillars live in the same row at zero
      // width and widen when the mouse comes near, so the live word never
      // moves. The box is one fixed height for all three (CSS), so switching
      // changes the words and nothing else.
      // v1057 (Malik's pick: "Day remaining"): same drained-by-the-day
      // hairline as the phone card, same 4am Action day, hidden once done.
      const dayline = () => {
        if (done) return '';
        let rem = 0.5;
        try {
          const n = new Date();
          const st = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 4, 0, 0);
          if (n < st) st.setDate(st.getDate() - 1);
          rem = Math.max(0, Math.min(1, 1 - (n - st) / 86400000));
        } catch (e) {}
        return '<div class="cc-dayline" aria-hidden="true"><b style="width:' + (rem * 100).toFixed(1) + '%"></b></div>';
      };
      const PILL = {
        // v1061 (Malik): the streak chip is gone from Action; the streak
        // lives on the consistency face now, where the number already is.
        action: () => label('Today&rsquo;s Action') + head(mission) + dayline() +
          '<div class="dkm__row">' + doneBtn + '</div>',
        clarity: () => {
          const a = (state.clarity && state.clarity.answers) || {};
          const star = String(a.neutronStar || '').trim();
          const why = String(a.coreWhy || a.whyItMatters || '').trim();
          // v1057 (Malik): statement only; the why waits inside the module.
          // v1061: two-tone + tenure, same treatment as the phone face.
          return label('Your Neutron Star') +
            '<div class="dkm__headline">' + ccStarTwoTone(star || 'Your Neutron Star') + '</div>' +
            ccStarTenureLine();
        },
        consistency: () => {
          // v1058 (Malik's variants 1+2 + his view spec): the number IS the
          // headline, meta beside it, the picked view under it, and a small
          // fan of the OTHER views that arrives on hover (desktop has the
          // room; the phone picks inside the module only).
          const view = ccFaceView();
          const VNAMES = { week: 'Week', month: 'Month', year: 'Year', curve: 'Curve' };
          const vOrder = _deskVfanHold || [view].concat(CC_FACE_VIEWS.filter((v) => v !== view));
          const vfan = '<div class="dkm__vfan">' +
            vOrder.map((v) => (v === view
              ? '<span class="dkm__vfan-cur">' + VNAMES[v] + '</span>'
              : '<button class="dkm__vfan-btn" type="button" data-dkm-view="' + v + '">' + VNAMES[v] + '</button>')).join('') +
            '</div>';
          return label('Consistency') +
            '<div class="cc-bigrow cc-bigrow--desk">' +
              '<span class="cc-bignum">' + streak.toLocaleString() + '</span>' +
              (streak > 0 ? flameSvg(streak) : '') +
              '<span class="cc-bigmeta">' + (streak === 1 ? 'day in a row' : 'days in a row') +
                '<br>' + (_score30 ? 'score ' + _score30 + '%' : '') +
                  (_score30 && _best ? ' \u00b7 ' : '') + (_best ? 'best ' + _best.toLocaleString() : '') +
                  ((_score30 || _best) && _active ? ' \u00b7 ' : '') + (_active ? _active.toLocaleString() + ' active' : '') +
              '</span>' +
            '</div>' +
            vfan +
            ccFaceGraph(view, true);
        }
      };
      const NAMES = { action: 'Today&rsquo;s Action', clarity: 'Your Neutron Star', consistency: 'Consistency' };
      const ORDER = ['action', 'clarity', 'consistency'];
      if (ORDER.indexOf(_deskPillar) < 0) _deskPillar = 'action';
      const rest = ORDER.filter((p) => p !== _deskPillar);
      // v1060 (Malik: "when someone clicks a toggle, the rest of the options
      // DON'T move"). While the mouse is inside the box the fan's ORDER is
      // frozen (held), so a click only moves the highlight and swaps the
      // body; the words stay under the cursor. The canonical order (live one
      // first, others tucked) comes back only when the mouse leaves.
      const fanOrder = _deskFanHold || [_deskPillar].concat(rest);
      const fan = '<div class="dkm__fan">' +
        fanOrder.map((p) => (p === _deskPillar
          ? '<span class="dkm__fan-cur">' + NAMES[p] + '</span>'
          : '<button class="dkm__fan-btn" type="button" data-dkm-pillar="' + p + '">' + NAMES[p] + '</button>')).join('') +
        '</div>';
      // The label lives in the fan now, so each pillar's own body drops it.
      const bodyOf = (p) => PILL[p]().replace(/^<div class="dkm__label">.*?<\/div>/, '');
      el.classList.add('dkm--pillars');
      // The three pillars carry very different amounts of text (a one-line
      // mission vs a whole star statement), so the card says which one it is
      // and the CSS sizes the headline to suit.
      el.classList.remove('dkm--p-action', 'dkm--p-clarity', 'dkm--p-consistency');
      el.classList.add('dkm--p-' + _deskPillar);
      // v1058: a long move steps the headline down so the box grows a little
      // instead of a lot (42px * 3 lines was what clipped the button).
      el.classList.toggle('dkm--long', _deskPillar === 'action' && String(mission || '').length > 34);
      // The negative is a PIXEL-IDENTICAL twin, fan row included. Leaving the
      // fan out of it put the two copies on different baselines, so the wipe
      // showed the headline jumping as it crossed.
      const face = fan + '<div class="dkm__body">' + bodyOf(_deskPillar) + '</div>';
      el.innerHTML = face + '<div class="dkm__inv" aria-hidden="true">' + face + '</div>';
      el.querySelectorAll('[data-dkm-pillar]').forEach((b) => {
        if (b.closest('.dkm__inv')) return;   // the twin is decoration, never a control
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          _freezeDeskFans(el);
          _deskPillar = b.getAttribute('data-dkm-pillar');
          renderDeskMission();
        });
      });
      if (!el.dataset.fanLeaveBound) {
        el.dataset.fanLeaveBound = '1';
        el.addEventListener('pointerleave', () => {
          if (!_deskFanHold && !_deskVfanHold) return;
          _deskFanHold = null; _deskVfanHold = null;
          renderDeskMission();
        });
      }
      // v1058: the consistency view fan. Picking here is the same act as
      // picking inside the module: one persisted preference, every surface
      // (this card, the phone card) follows it.
      el.querySelectorAll('[data-dkm-view]').forEach((b) => {
        if (b.closest('.dkm__inv')) return;
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          _freezeDeskFans(el);
          if (!state.ui) state.ui = {};
          state.ui.consistencyFaceView = b.getAttribute('data-dkm-view');
          try { persistNow(); } catch (e) {}
          renderDeskMission();
        });
      });
    }
    if (!el.classList.contains('dkm--pillars')) el.classList.remove('dkm--pillars');
    bindCommandCenter(el);
  } catch (e) {}
}

function bindCommandCenter(cc) {
  // v812: the desktop editorial hero mirrors every command-center re-render
  // through this single chokepoint (guarded against self-recursion).
  try { if (cc && cc.id === 'commandCenter') renderDeskMission(); } catch (e) {}
  // v1150: the sync faces are taller than the old 212px deck. One shared
  // height still rules the swipe (v1083's law); it is measured ONCE per face
  // set here, never per swipe, and clamped so a runaway line can never
  // squeeze the Memento the way the old measured version did.
  try { ccSyncDeckHeight(cc); } catch (e) {}
  // v1153 (Malik): the deck dots live UNDER the box, near the bottom of the
  // screen, not inside the card. Hoisted after every render so each face
  // keeps authoring them in place.
  try {
    if (cc && cc.id === 'commandCenter') {
      const dn = cc.querySelector('.cc-card .cc-dots');
      if (dn) { dn.classList.add('cc-dots--deck'); cc.appendChild(dn); }
    }
  } catch (e) {}

  /* v1051: swipe the phone card between the three pillars.
     Three gestures now live on this card (tap opens Action, hold completes,
     swipe switches), so they are told apart the only way that is reliable:
     by MOVEMENT. Under 12px is not a swipe and nothing happens, so a tap
     stays a tap. Past 12px horizontally the card takes the gesture, marks
     itself swiping (which the tap handler checks) and cancels any hold in
     progress by releasing the button. A mostly-vertical drag is the page
     scrolling and is left alone. */
  /* v1051: the phone card's invert twin. Built by CLONING the rendered card
     rather than rendering the body twice, so no id in the real card is ever
     duplicated (ids are stripped from the clone) and the render path stays
     untouched. Same rule as desktop: it rides the existing hold. */
  try {
    const card0 = cc && cc.querySelector && cc.querySelector('.cc-card');
    if (card0 && cc.id === 'commandCenter') {
      // v1080 (the swipe ghosting): the twin used to be built ONCE and then
      // skipped forever, so after a face change it still held the PREVIOUS
      // pillar's content. That stale copy is what bled through mid-swipe
      // (Malik's screenshot: the Action headline and Mark Complete ghosted
      // behind the star face). Always rebuild it from the card as rendered
      // NOW, so it can never show something that is not on screen.
      const _old = card0.querySelector(':scope > .cc-inv');
      if (_old) _old.remove();
      const twin = document.createElement('div');
      twin.className = 'cc-inv';
      twin.setAttribute('aria-hidden', 'true');
      twin.innerHTML = card0.innerHTML;
      twin.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      twin.querySelectorAll('input, button, a, [tabindex]').forEach((n) => n.setAttribute('tabindex', '-1'));
      card0.appendChild(twin);
    }
  } catch (e) {}

  try {
    const card = cc && cc.querySelector && cc.querySelector('.cc-card');
    if (card && !card.dataset.swipeBound && cc.id === 'commandCenter') {
      card.dataset.swipeBound = '1';
      let x0 = null, y0 = null, axis = null;
      const THRESH = 12, COMMIT = 56;
      card.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        // v1056 (Malik): pre-Clarity there is ONE face ("Find your neutron
        // star") and nothing to swipe to, so the card must not even follow
        // the finger sideways. The class is the same condition the render
        // uses to offer pillars at all, so the two can never disagree.
        if (!card.classList.contains('cc-card--pillars')) return;
        // The view select is a control: touching it must never begin a swipe.
        if (e.target && e.target.closest && e.target.closest('.cc-vsel')) return;
        x0 = e.clientX; y0 = e.clientY; axis = null;
        card.dataset.swiping = '';
        // A new drag always starts from a clean deck. Starting one DURING
        // the previous drag's settle left its cards in the DOM, which is how
        // a third card appeared behind the incoming one.
        disarmDeck();
        prebuildDeck();
      });
      // ── THE DECK (v1060, Malik: "like swiping through a layer of photos
      // on iPhone, smooth clean and simple"). The cards are a physical stack:
      // the next face is ALREADY THERE underneath (scaled down a touch), the
      // finger moves the top card 1:1 out of the way, and committing sends it
      // off while the one beneath rises into place. No fade-and-replace.
      let under = null, underPillar = null;
      const preEls = {};   // pillar -> prebuilt under-card, made at touch-down
      const nextPillar = (dir) => {
        const list = ccPillarList();
        const i = Math.max(0, list.indexOf(_ccPillar));
        return list[(i + (dir < 0 ? 1 : -1) + list.length) % list.length];
      };
      const buildUnder = (pillar) => {
        try {
          const prev = _ccPillar;
          _ccPillar = pillar;
          const html = renderCommandCenter();
          _ccPillar = prev;
          const shell = document.createElement('div');
          shell.innerHTML = html;
          const src = shell.querySelector('.cc-card');
          if (!src) return null;
          src.querySelector(':scope > .cc-inv')?.remove();
          // v1079 (Malik caught it in two screenshots): the card you swipe to
          // must BE the card you land on. This used to be a bare <div> that
          // only borrowed the card's inline style, so every rule scoped to
          // .cc-card / .cc-card--pillars missed it: its dots were hidden and
          // its content sat ~24px high, then snapped when the real render
          // replaced it. It is now the rendered card element itself, classes
          // and all, so the preview and the landing are the same thing.
          const u = src;
          u.classList.add('cc-under');
          u.setAttribute('aria-hidden', 'true');
          // v1227 (Malik: two rows of page dots on the home box). The one
          // indicator is the deck dots hoisted below the box; an under-card
          // authors its own dots inside the card, so leaving them here stacked
          // a second dot row above the real one mid-swipe. Strip them: the
          // under-card is preview only, the deck dots below are the truth.
          u.querySelectorAll('.cc-dots').forEach((n) => n.remove());
          u.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
          u.querySelectorAll('input, button, a, [tabindex]').forEach((n) => n.setAttribute('tabindex', '-1'));
          // Geometry: sit exactly where the card sits, one layer down. Height
          // is NOT forced: each face has its own natural height, and forcing
          // the outgoing card's height was the other half of the jump.
          u.style.position = 'absolute';
          u.style.left = card.offsetLeft + 'px';
          u.style.top = card.offsetTop + 'px';
          u.style.width = card.offsetWidth + 'px';
          u.style.margin = '0';
          // v1095 (Codex's catch, and it is the bug Malik kept reporting):
          // this used to be scale(0.94) growing to 1 during the swipe. My
          // tests measured RESTING rectangles, which were stable, so they
          // said "nothing moved" while his eyes correctly saw the incoming
          // card grow on every single swipe. Depth now comes from the offset
          // and the shadow only. Cards slide at exactly their real size.
          u.style.transform = 'translateY(7px)';
          // v1080: FULLY opaque. At 0.85 the card behind it showed straight
          // through, which is the "see through the cards" Malik reported. A
          // stacked card reads as depth through scale and shadow, never
          // through transparency.
          u.style.opacity = '1';
          u.style.zIndex = '0';
          return u;
        } catch (e) { return null; }
      };
      // v1062 (Malik: "sometimes it's a bit choppy"): both neighbours are
      // prebuilt at TOUCH-DOWN, while the finger is still resting, so the
      // first dragged frame never pays for a render. armDeck just reveals.
      const prebuildDeck = () => {
        try {
          const list = ccPillarList();
          const i = Math.max(0, list.indexOf(_ccPillar));
          // Unique neighbours only, never the current face: with a two-face
          // deck, +1 and +2 are the SAME card and one of them is this one.
          const _nbrs = Array.from(new Set([list[(i + 1) % list.length], list[(i + list.length - 1) % list.length]]))
            .filter((p) => p !== _ccPillar);
          _nbrs.forEach((pl) => {
            // v1081 (Malik: "I can see a card behind the card that's coming"):
            // a REUSED prebuild could still be display:'' from the previous
            // drag, so two preview cards showed at once. Anything reused is
            // re-hidden unconditionally; only armDeck ever reveals one.
            if (preEls[pl]) { preEls[pl].style.display = 'none'; return; }
            const u = buildUnder(pl);
            if (u) { u.style.display = 'none'; preEls[pl] = u; cc.insertBefore(u, card); }
          });
          cc.style.position = 'relative';
        } catch (e) {}
      };
      const armDeck = (dir) => {
        const want = nextPillar(dir);
        if (under && underPillar === want) return;
        if (under) under.style.display = 'none';
        underPillar = want;
        under = preEls[want] || (preEls[want] = buildUnder(want));
        if (under) {
          cc.style.position = 'relative';
          cc.classList.add('cc-deck-live');
          card.style.position = 'relative';
          card.style.zIndex = '1';
          if (!under.parentNode) cc.insertBefore(under, card);
          // Exactly one preview card is ever visible, whatever happened before.
          Object.keys(preEls).forEach((k) => { if (preEls[k] !== under) preEls[k].style.display = 'none'; });
          // rest pose, in case a direction reversal re-reveals it mid-gesture
          under.style.transition = 'none';
          under.style.transform = 'translateY(7px)';
          under.style.opacity = '1';
          under.style.display = '';
          void under.offsetWidth;
          under.style.transition = '';
        }
      };
      const disarmDeck = () => {
        cc.classList.remove('cc-deck-live');
        card.style.zIndex = '';
        Object.keys(preEls).forEach((k) => { try { preEls[k].remove(); } catch (e) {} delete preEls[k]; });
        under = null; underPillar = null;
      };
      card.addEventListener('pointermove', (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (!axis) {
          if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
          axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (axis === 'x') {
            card.dataset.swiping = '1';
            try { card.setPointerCapture(e.pointerId); } catch (e2) {}
            // A hold that turns into a swipe is not a completion.
            const held = card.querySelector('.cc-hold-complete.is-holding');
            if (held) held.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
          }
        }
        if (axis !== 'x') return;
        e.preventDefault();
        if (dx !== 0) armDeck(dx);
        void 0;
        // 1:1 follow with a whisper of rotation; the top card is an object in
        // the hand, not a value being interpolated.
        card.style.transform = 'translateX(' + dx.toFixed(1) + 'px) rotate(' + (dx * 0.02).toFixed(2) + 'deg)';
        if (under) {
          const p = Math.min(1, Math.abs(dx) / (COMMIT * 2.2));
          under.style.transform = 'translateY(' + (7 - p * 7).toFixed(1) + 'px)';
        }
      });
      const finish = (e) => {
        if (x0 === null) return;
        const dx = (e && e.clientX != null) ? e.clientX - x0 : 0;
        const wasX = axis === 'x';
        x0 = null; y0 = null; axis = null;
        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (wasX && Math.abs(dx) >= COMMIT && under) {
          // COMMIT: the top card leaves the way it was moving, the one
          // beneath rises to full size, then the real render takes over.
          _ccPillar = underPillar;
          const off = (dx < 0 ? -1 : 1) * (card.offsetWidth + 60);
          if (reduced) {
            disarmDeck();
            try { cc.innerHTML = renderCommandCenter(); bindCommandCenter(cc); } catch (e2) {}
            return;
          }
          card.style.transition = 'transform .24s cubic-bezier(.4,.0,.9,.6)';
          card.style.transform = 'translateX(' + off + 'px) rotate(' + (off * 0.02) + 'deg)';
          under.style.transition = 'transform .24s cubic-bezier(.2,.8,.3,1)';
          under.style.transform = 'translateY(0)';
          setTimeout(() => {
            disarmDeck();
            card.dataset.swiping = '';
            card.style.transition = ''; card.style.transform = '';
            try { cc.innerHTML = renderCommandCenter(); bindCommandCenter(cc); } catch (e2) {}
          }, 300);
          return;
        }
        // CANCEL: spring home, the stack settles back down.
        card.style.transition = 'transform .3s cubic-bezier(.3,.85,.3,1)';
        card.style.transform = 'translateX(0) rotate(0deg)';
        if (under) {
          under.style.transition = 'transform .3s cubic-bezier(.3,.85,.3,1)';
          under.style.transform = 'translateY(7px)';
        }
        setTimeout(() => {
          card.style.transition = ''; card.dataset.swiping = '';
          disarmDeck();
        }, 320);
      };
      card.addEventListener('pointerup', finish);
      card.addEventListener('pointercancel', finish);
    }
    // v1060: the consistency face's native view select. Change = the same
    // persisted pick the module and the desktop fan write.
    const vsel = card && card.querySelector && card.querySelector('.cc-vsel:not([data-bound])');
    if (vsel && !vsel.closest('.cc-inv')) {
      vsel.dataset.bound = '1';
      vsel.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      vsel.addEventListener('click', (ev) => ev.stopPropagation());
      vsel.addEventListener('change', (ev) => {
        ev.stopPropagation();
        if (!state.ui) state.ui = {};
        state.ui.consistencyFaceView = vsel.value;
        try { persistNow(); } catch (e2) {}
        try { _ccHeroSwap(function () {}); }
        catch (e2) { try { cc.innerHTML = renderCommandCenter(); bindCommandCenter(cc); } catch (e3) {} }
      });
    }
  } catch (e) {}
  // v1063 (the layout law's missing half): the page-1 card height formula
  // needs the box's REAL height, because the box is not a constant (the
  // pre-Clarity first-step copy runs ~260px, a long move grows the Action
  // face). Measured after every render, so the card always absorbs exactly
  // the leftover space and the box always lands 15px above the bottom.
  // v1093: the render path writes NO geometry at all. (--p1-box-h is dead:
  // the box is a fixed height now, and writing it here was another per-render
  // value that could shift the layout mid-swipe.)
  // v608 (Malik, overnight item 5): first open of a NEW day with a move still
  // pending, the Today panel breathes once so the move is the first thing the
  // eye lands on. Once per day, never when today's action is already done.
  try {
    const _dayKey = new Date().toISOString().slice(0, 10);
    state.meta = state.meta || {};
    const _hasPlan = !!(state.action && state.action.primaryAction && state.clarity && state.clarity.completed);
    if (_hasPlan && state.meta.lastNewDayPulse !== _dayKey && !actionDoneToday()
        && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      state.meta.lastNewDayPulse = _dayKey;
      try { persistNow(); } catch (e) {}
      try { if (typeof MementoSound !== 'undefined') MementoSound.play('newday'); } catch (e) {}
      cc.classList.add('cc-newday');
      setTimeout(() => { try { cc.classList.remove('cc-newday'); } catch (e) {} }, 4200);
    }
  } catch (e) {}
  try {
    // Slide the pill behind the active hero segment. Returns true once placed.
    const _placeHeroPill = (scope, animate) => {
      try {
        const toggle = scope.querySelector('.cc-hero-toggle');
        const pill = scope.querySelector('.cc-hero-pill');
        const active = scope.querySelector('.cc-hero-seg.is-active') || scope.querySelector('.cc-hero-seg');
        if (!toggle || !pill || !active) return false;
        const t = toggle.getBoundingClientRect(), a = active.getBoundingClientRect();
        if (!a.width) return false;
        if (!animate) pill.style.transition = 'none';
        pill.style.top = (a.top - t.top) + 'px';
        pill.style.height = a.height + 'px';
        pill.style.width = a.width + 'px';
        pill.style.transform = 'translateX(' + (a.left - t.left) + 'px)';
        if (!animate) { void pill.offsetWidth; pill.style.transition = ''; }
        return true;
      } catch (e) { return false; }
    };
    if (!_placeHeroPill(cc, false)) { try { requestAnimationFrame(() => _placeHeroPill(cc, false)); } catch (e) {} }

    // Consistency heatmap (the long contribution graph in the Consistency hero):
    // tap any past/present day to fill it in or undo, same toggle the streak
    // module uses. renderAll() re-renders this command center, so after a toggle
    // we restore the user's horizontal scroll, then land the grid on the most
    // recent weeks on first paint.
    try {
      const cg = cc.querySelector('.cgraph');
      if (cg) {
        const fireDay = (cell) => {
          const date = cell && cell.dataset ? cell.dataset.date : null;
          const today = getTodayISO();
          if (!date || date > today) return;
          if (state.streak.history.includes(date)) {
            state.streak.history = state.streak.history.filter(d => d !== date);
          } else {
            state.streak.history.push(date);
            state.streak.history.sort();
          }
          if (state.streak.history.length > 400) state.streak.history = state.streak.history.slice(-400);
          recalculateStreak();
          persistNow();
          // In-place update: just re-color the tapped square (with a pop) and
          // refresh the derived numbers, instead of re-rendering the whole grid
          // (which flashed and jumped the scroll).
          try {
            const counts = (typeof buildConsistencyData === 'function') ? buildConsistencyData() : {};
            const lvl = (typeof consistencyHeatmapLevel === 'function') ? consistencyHeatmapLevel(counts[date]) : Math.min(5, counts[date] || 0);
            cell.className = cell.className.replace(/cgraph__cell--l\d/, 'cgraph__cell--l' + lvl);
            cell.style.background = '';
            cell.classList.remove('cgraph__cell--justfilled');
            void cell.offsetWidth; // restart the pop animation
            cell.classList.add('cgraph__cell--justfilled');
            const cs2 = (typeof consistencyStats === 'function') ? consistencyStats() : null;
            if (cs2) {
              const sn = document.getElementById('ccStreakNum'); if (sn) sn.textContent = cs2.current;
              const sl = document.getElementById('ccScoreLine'); if (sl && typeof ccScoreLineInner === 'function') sl.innerHTML = ccScoreLineInner(cs2);
            }
            // Keep the rest of the app (widgets, sidebar) in sync quietly, without
            // touching this grid: refresh non-hero surfaces on the next frame.
            if (typeof renderGrid === 'function') requestAnimationFrame(() => { try { renderGrid(); } catch (e) {} });
          } catch (e) { try { renderAll(); } catch (e2) {} }
        };
        cg.addEventListener('click', (e) => {
          const cell = e.target.closest('.cgraph__cell--tap[data-date]');
          if (cell && cg.contains(cell)) fireDay(cell);
        });
        cg.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          const cell = e.target.closest('.cgraph__cell--tap[data-date]');
          if (cell && cg.contains(cell)) { e.preventDefault(); fireDay(cell); }
        });
        // Land on the most recent weeks (right edge) on first paint.
        requestAnimationFrame(() => {
          const sc = cc.querySelector('.cgraph__scroll');
          if (sc) sc.scrollLeft = sc.scrollWidth;
        });
      }
    } catch (e) {}

    // Swappable hero toggle: smooth pill slide + a content box that animates its
    // height (dynamic expand) and crossfades, instead of an instant jump.
    // v19 Daily Cockpit: open the Projects -> Milestones surface from the Goal tab.
    cc.querySelectorAll('[data-cc-proj]').forEach(b => b.addEventListener('click', () => {
      try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('projects'); } catch (e) {}
    }));
    // v19 daily bookend prompt: Start opens the ritual; the x skips it for today.
    cc.querySelectorAll('[data-bookend-start]').forEach(b => b.addEventListener('click', () => {
      try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('bookend'); } catch (e) {}
    }));

    cc.querySelectorAll('[data-bookend-skip]').forEach(b => b.addEventListener('click', () => {
      try {
        const hr = new Date().getHours();
        if (!state.bookends || typeof state.bookends !== 'object') state.bookends = { lastMorningISO: '', lastEveningISO: '' };
        const today = (typeof getTodayISO === 'function') ? getTodayISO() : new Date().toISOString().slice(0, 10);
        if (hr >= 4 && hr < 12) state.bookends.lastMorningISO = today; else state.bookends.lastEveningISO = today;
        persistNow();
        const ccEl = document.getElementById('commandCenter'); if (ccEl) { ccEl.innerHTML = renderCommandCenter(); bindCommandCenter(ccEl); }
      } catch (e) {}
    }));
    cc.querySelectorAll('[data-cc-cv]').forEach(b => b.addEventListener('click', () => {
      const v = b.getAttribute('data-cc-cv');
      if (state.ui && state.ui.consistencyView === v) return;
      _ccHeroSwap(() => { try { if (!state.ui) state.ui = {}; state.ui.consistencyView = v; persistNow(); } catch (e) {} });
    }));
    cc.querySelectorAll('[data-cc-hmscale]').forEach(b => b.addEventListener('click', () => {
      const v = b.getAttribute('data-cc-hmscale');
      if (state.ui && state.ui.ccHeatmapScale === v) return;
      _ccHeroSwap(() => { try { if (!state.ui) state.ui = {}; state.ui.ccHeatmapScale = v; persistNow(); } catch (e) {} });
    }));
    cc.querySelectorAll('.cc-hero-seg').forEach(b => b.addEventListener('click', () => {
      const h = b.getAttribute('data-cc-hero');
      if (state.ui && state.ui.homeHero === h) return;
      const ccEl = document.getElementById('commandCenter');
      if (!ccEl) return;
      const reduce = _ccMotionOff();
      const oldBody = ccEl.querySelector('.cc-hero-body');
      const oldH = oldBody ? oldBody.offsetHeight : 0;
      const oldPill = ccEl.querySelector('.cc-hero-pill');
      const oldT = oldPill ? oldPill.style.transform : '';
      const oldW = oldPill ? oldPill.style.width : '';
      try { if (!state.ui) state.ui = {}; state.ui.homeHero = h; persistNow(); } catch (e) {}
      try { ccEl.innerHTML = renderCommandCenter(); bindCommandCenter(ccEl); } catch (e) { return; }
      if (reduce) return;
      // Slide the pill from its old position to the freshly-placed new one.
      const newPill = ccEl.querySelector('.cc-hero-pill');
      if (newPill && oldT) {
        const tgtT = newPill.style.transform, tgtW = newPill.style.width;
        newPill.style.transition = 'none';
        newPill.style.transform = oldT; if (oldW) newPill.style.width = oldW;
        void newPill.offsetWidth;
        newPill.style.transition = '';
        newPill.style.transform = tgtT; newPill.style.width = tgtW;
      }
      // Animate the content box height old -> new with a soft crossfade.
      const newBody = ccEl.querySelector('.cc-hero-body');
      if (newBody) {
        const newH = newBody.scrollHeight;
        newBody.style.overflow = 'hidden';
        newBody.style.transition = 'none';
        newBody.style.height = oldH + 'px';
        newBody.style.opacity = '0.4';
        void newBody.offsetHeight;
        newBody.style.transition = 'height ' + CC_RISE_MS + 'ms ' + CC_EASE + ', opacity ' + CC_FADE_MS + 'ms ease-out';
        newBody.style.height = newH + 'px';
        newBody.style.opacity = '1';
        setTimeout(() => { try { newBody.style.height = 'auto'; newBody.style.overflow = ''; newBody.style.transition = ''; newBody.style.opacity = ''; } catch (e) {} }, CC_RISE_MS + 40);
      }
    }));
    cc.querySelectorAll('[data-cc-action="didit"]').forEach(bindHomeActionHold);
    cc.querySelectorAll('[data-cc-action]').forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-cc-action');
      if (a === 'clarity' && typeof ClarityExperience !== 'undefined') ClarityExperience.open();
      else if (a === 'didit') return;
      else if (a === 'comeback') ComebackPicker.open();
      else if (typeof ActionExperience !== 'undefined') ActionExperience.open();
    }));
    // v998 (Malik: "I don't see a place where I can go into the action
    // module"): the WHOLE Today card opens Action, not just the button inside
    // it. The card is the biggest target on the home and it was inert.
    // Clarity's card is excluded, it routes somewhere else entirely.
    (function bindCardTap() {
      const card = cc.querySelector('.cc-card');
      if (!card) return;
      const first = cc.querySelector('[data-cc-action]');
      const a = first && first.getAttribute('data-cc-action');
      if (a === 'clarity') return;
      card.classList.add('cc-card--tappable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      const go = () => {
        if (card.classList.contains('is-launching')) return;
        // v1051: a swipe is not a tap. The swipe handler sets this while a
        // horizontal drag is live, so letting go after a swipe never opens
        // Action underneath it.
        if (card.dataset.swiping === '1') return;
        // The card lifts toward the viewer and fades as the module rises
        // behind it, so it reads as opening OUT OF the card that was tapped.
        card.classList.add('is-launching');
        setTimeout(() => {
          // v1062 (Malik's glitch report): the tap opens the FACE's module.
          // Star face -> Clarity, consistency face -> the Consistency module,
          // action face -> Action. One gesture, one meaning, per pillar.
          try {
            if (_ccPillar === 'clarity' && typeof ClarityExperience !== 'undefined') ClarityExperience.open();
            else if (_ccPillar === 'consistency' && typeof Sheet !== 'undefined') Sheet.open('streak');
            else if (typeof ActionExperience !== 'undefined') ActionExperience.open();
          } catch (e) {}
          setTimeout(() => { try { card.classList.remove('is-launching'); } catch (e) {} }, 500);
        }, 190);
      };
      card.addEventListener('click', (e) => {
        // Never steal a tap meant for a real control inside the card (the
        // hold-to-complete button especially).
        if (e.target.closest && e.target.closest('button, a, input, textarea, select, [data-cc-action], [data-cc-comeback], [data-cc-reason]')) return;
        go();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    })();
    // Comeback Mode: three ways back. Pre-select the chosen tier (the same
    // selectedTier the Action card reads), then route into Action like Start.
    cc.querySelectorAll('.cc-comeback-way').forEach(b => b.addEventListener('click', () => {
      const tier = b.getAttribute('data-cc-comeback');
      try { if (['tiny','light','moderate','heavy','extreme'].indexOf(tier) >= 0) { state.action.selectedTier = tier; persistNow(); } } catch (e) {}
      try { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); } catch (e) {}
    }));
    // Comeback Mode: "what knocked you off" chips. Saves to state.comeback only.
    cc.querySelectorAll('.cc-comeback-reason').forEach(b => b.addEventListener('click', () => {
      const reason = b.getAttribute('data-cc-reason');
      try { if (typeof recordComebackReason === 'function') recordComebackReason(reason); } catch (e) {}
      cc.querySelectorAll('.cc-comeback-reason').forEach(x => { x.style.opacity = (x === b) ? '1' : '0.4'; x.disabled = (x !== b); });
      const coach = (typeof COMEBACK_COACHING !== 'undefined' && COMEBACK_COACHING[reason]) ? COMEBACK_COACHING[reason] : null;
      const thanks = cc.querySelector('#ccComebackThanks');
      if (thanks) { if (coach && coach.line) thanks.textContent = coach.line; thanks.style.display = 'block'; }
      // Suggest the gentlest honest tier for this reason, and lift the matching
      // way-back button with depth (no border) so the path forward is obvious.
      if (coach) {
        try { if (['tiny','light','moderate','heavy','extreme'].indexOf(coach.tier) >= 0) { state.action.selectedTier = coach.tier; persistNow(); } } catch (e) {}
        try {
          cc.querySelectorAll('.cc-comeback-way').forEach(w => {
            const on = w.getAttribute('data-cc-comeback') === coach.tier;
            w.style.transition = 'box-shadow .2s ease, transform .2s ease';
            w.style.boxShadow = on ? '0 10px 28px rgba(0,0,0,0.40)' : '';
            w.style.transform = on ? 'translateY(-1px)' : '';
          });
        } catch (e) {}
      }
    }));
    // v25 prune: Review is a direct Proof trail link.
    const rv = cc.querySelector('#ccReview');
    if (rv) rv.addEventListener('click', () => { try { ProofTrail.open(); } catch (e) {} });
    const vivOpen = cc.querySelector('#ccVivereOpen');
    if (vivOpen) vivOpen.addEventListener('click', () => { try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('vivere'); } catch (e) {} });
    const wkOpen = cc.querySelector('[data-weekly-open]');
    if (wkOpen) wkOpen.addEventListener('click', () => { try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('inbox'); } catch (e) {} });
  } catch (e) {}
}
// Daily Memento: a calm, day-stable line at the foot of the dashboard. Mirrors
// the mockup's bottom quote bar. Picks deterministically by day so it does not
// flicker on re-render.

// Thermal flame: the streak's flame warms and grows with the run. Calm,
// stepped, and capped, a quiet thermometer rather than a game. Purple is the
// starting ember; white is the 180-day star.
function streakFlameTier(count) {
  const T = [
    { min: 0,   c: '#8be9fa', s: 20, g: 6 },   // ember purple
    { min: 7,   c: '#5EA2F7', s: 21, g: 6 },   // blue
    { min: 14,  c: '#34d341', s: 22, g: 7 },   // green
    { min: 30,  c: '#E8C24A', s: 23, g: 7 },   // yellow
    { min: 60,  c: '#F59E0B', s: 24, g: 8 },   // orange
    { min: 100, c: '#EF6A5A', s: 25, g: 9 },   // red
    { min: 180, c: '#F5F5F7', s: 26, g: 10 }   // white-hot
  ];
  let t = T[0];
  for (let i = 0; i < T.length; i++) { if (count >= T[i].min) t = T[i]; }
  return t;
}

// v605: the one-time card evolution after ignition. Runs only when the home
// is actually visible (no fullscreen experience covering it); if something is
// open it re-checks until the user really lands here. Reduced-motion users
// skip the show and just get the finished card.
let _cardEvolutionRunning = false;
let _cardEvolutionThen = null;
let _evoStartedAt = 0;          // ms timestamp the current run began (staleness math)
let _evoFinished = true;        // guards _evoFinish against double-running per run
let _evoVisHandler = null;      // the run's visibilitychange listener, so we can detach it
const EVO_MAX_MS = 12000;       // a run older than this is wedged -> force-finish

// Idempotent teardown for the unlock cinema. This is the ONE place a run can
// end, so an interrupted run (iOS suspends JS timers whenever the app is
// backgrounded / the screen locks mid-cinema) can always be healed back to the
// lit card + visible bar instead of freezing on the blank frame. Safe to call
// from the exit timer, the safety timeout, a visibility change, or the
// render-time watchdog.
function _evoFinish(wrap, onDone, opts) {
  if (_evoFinished) { if (onDone) { try { onDone(); } catch (e) {} } return; }
  _evoFinished = true;
  opts = opts || {};
  // v937: this run's stage is spent. Leaving it set would make the NEXT
  // evolution inherit it and start from the wrong earned state.
  try { window._evoStageKind = null; } catch (e) {}
  try { (window._evoTimers || []).forEach(id => clearTimeout(id)); } catch (e) {}
  window._evoTimers = [];
  if (_evoVisHandler) { try { document.removeEventListener('visibilitychange', _evoVisHandler); } catch (e) {} _evoVisHandler = null; }
  try { (window._evoWashAnims || []).forEach(a => { try { a.cancel(); } catch (e) {} }); window._evoWashAnims = []; } catch (e) {}
  try { document.querySelectorAll('.evo2-shine, .evo2-wash').forEach(s => s.remove()); } catch (e) {}
  document.body.classList.remove('evo2', 'evo2-orb', 'evo2-surge', 'evo2-snap', 'evo2-grow');
  // v771 (Malik): the room returns FIRST, then the top-left beams fade in
  // slowly on their own. evo2-afterglow keeps the beams dark while the chrome
  // fades back (~0.9s); evo2-beamsin then releases them on a 3.2s ease.
  try {
    const reduceFx = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceFx) {
      document.body.classList.add('evo2-afterglow');
      setTimeout(() => {
        document.body.classList.remove('evo2-afterglow');
        document.body.classList.add('evo2-beamsin');
        setTimeout(() => { try { document.body.classList.remove('evo2-beamsin'); } catch (e) {} }, 3600);
      }, 1300);
    }
  } catch (e) {}
  // Always finish on the LIVE card (never a stale detached reference), and clear
  // the grow vars so the card sits exactly at its resting spot.
  wrap = document.querySelector('#dayCard .daycard-wrap') || wrap;
  try { if (wrap) { wrap.style.removeProperty('--evo-sc'); wrap.style.removeProperty('--evo-ty'); } } catch (e) {}
  // v1109: release the cinema's size freeze so the card returns to the live
  // computed geometry. Belt: clear it on every stage in the document, so an
  // interrupted or superseded run can never leave a card pinned.
  try {
    document.querySelectorAll('.daycard-wrap').forEach((el) => el.style.removeProperty('--evo-card-w'));
  } catch (e) {}
  // Land on the lit end state: a dev hold keeps its staged look, a real run
  // returns to live data (and the beams marker ns-bloom for a star user).
  if (opts.holdOverride) { window._evoStageOverride = opts.holdOverride; window._evoHold = true; }
  else {
    window._evoStageOverride = null; window._evoHold = false;
    try { if (state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) document.body.classList.add('ns-bloom'); } catch (e) {}
  }
  wrap = wrap || document.querySelector('.daycard-wrap');
  try { if (wrap) setLivingCardVars(wrap); } catch (e) {}
  try { if (wrap && !opts.holdOverride) startLivingWander(wrap); } catch (e) {}
  // running=false BEFORE show(): TabBar.show() refuses while the cinema runs
  // (the v678 gate), so clearing the flag first is what lets the bar return.
  _cardEvolutionRunning = false;
  try { if (typeof TabBar !== 'undefined' && TabBar.show) TabBar.show(); } catch (e) {}
  if (onDone) { try { onDone(); } catch (e) {} }
}

// Optional `then` continuation (Malik's "Add to your Memento" flow): whoever
// actually plays (or skips) the cinema runs it once at the end, so the save
// nudge + Action ask land AFTER the card comes alive, not before.
function _maybeRunCardEvolution(then) {
  if (then) _cardEvolutionThen = then;
  const flush = () => { const cb = _cardEvolutionThen; _cardEvolutionThen = null; if (cb) { try { cb(); } catch (e) {} } };
  // Watchdog: a run that has overstayed its lifetime got its timers suspended
  // by iOS. Force it to finish so this render recovers (lit card + bar).
  if (_cardEvolutionRunning && _evoStartedAt && (Date.now() - _evoStartedAt) > EVO_MAX_MS) {
    _evoFinish(document.querySelector('.daycard-wrap'), null, {});
  }
  if (_cardEvolutionRunning) return;   // a run is in progress; its onDone will flush
  if (!(state.clarity && state.clarity.completed && state.clarity.ignitedAt)) { flush(); return; }
  state.meta = state.meta || {};
  if (state.meta.cardEvolutionSeen) { flush(); return; }
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { state.meta.cardEvolutionSeen = true; try { persistNow(); } catch (e) {} flush(); return; }
  _cardEvolutionRunning = true;
  // Stamp the ARMED time too (not just the play start): a run stuck WAITING for
  // an overlay that never closes must also age out via the >12s watchdog above,
  // else the running flag wedges renders/bar forever (v681).
  _evoStartedAt = Date.now();
  const overlayOpen = () => {
    try {
      if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return true;
      if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return true;
      if (document.querySelector('.cpw.open, .cpw--open, #nsv2Root')) return true;
      if (document.hidden) return true;
    } catch (e) {}
    return false;
  };
  const attempt = () => {
    if (state.meta.cardEvolutionSeen && !_cardEvolutionRunning) { flush(); return; }
    if (overlayOpen()) { setTimeout(attempt, 1200); return; }
    // Commit SEEN before the cinema plays: if this run is interrupted (the app
    // is backgrounded mid-reveal), it must NEVER replay and re-blank the card
    // on the next load. Worst case the user gets a clean lit card instead of a
    // permanently bricked one. The moment is once-ever either way.
    state.meta.cardEvolutionSeen = true;
    try { persistNow(); } catch (e) {}
    const ok = _runClarityUnlockCinema(() => { flush(); });
    if (!ok) { _cardEvolutionRunning = false; window._evoStageOverride = null; try { if (typeof TabBar !== 'undefined' && TabBar.show) TabBar.show(); } catch (e) {} flush(); }
  };
  attempt();
}

// v973 (Malik): the ACTION evolution. Once a PAID user DISCOVERS their first move
// (planGenerated + a real primaryAction), the home card earns its platinum reward
// with the same cinematic reveal the Clarity colour got, then STAYS platinum, the
// resting look comes from the card's live --act level (not the evo2-plat class),
// so it never drains back. Its own once-ever flag (meta.actionEvolutionSeen), kept
// separate from the Clarity flag so BOTH play, in order (colour first, then rim).
// Mirrors _maybeRunCardEvolution's guards: overlay-wait, aged-out watchdog, and
// commit-SEEN-before-play so an interrupted run can never replay + re-blank.
function _maybeRunActionEvolution() {
  try {
    if (_cardEvolutionRunning) return;                 // a run (Clarity or this) is already playing
    state.meta = state.meta || {};
    if (!state.meta.cardEvolutionSeen) return;          // the Clarity colour reveal must land first
    if (state.meta.actionEvolutionSeen) return;         // once, ever
    // Fires ONLY on a genuine first discovery (armed at plan generation in js/03),
    // so existing paid users never replay it out of context.
    if (!state.meta.actionRevealPending) return;
    let paid = false;
    try { paid = (typeof ClarityPaywall !== 'undefined') && ClarityPaywall.isPaid(); } catch (e) {}
    const pa = state.action && state.action.primaryAction;
    const discovered = !!(state.action && state.action.planGenerated && pa && String(pa.title || '').trim());
    if (!paid || !discovered) return;
    if (!(state.clarity && state.clarity.completed && state.clarity.ignitedAt)) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { state.meta.actionEvolutionSeen = true; state.meta.actionRevealPending = false; try { persistNow(); } catch (e) {} return; }
    _cardEvolutionRunning = true;
    _evoStartedAt = Date.now();
    const cleanupClass = () => { try { document.body.classList.remove('evo2-plat'); } catch (e) {} };
    const overlayOpen = () => {
      try {
        if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return true;
        if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return true;
        if (document.querySelector('.cpw.open, .cpw--open, #nsv2Root, #clarityPaywall')) return true;
        if (document.hidden) return true;
      } catch (e) {}
      return false;
    };
    const attempt = () => {
      // aged-out watchdog: iOS suspended the wait timers; heal to the lit card.
      if (_evoStartedAt && (Date.now() - _evoStartedAt) > EVO_MAX_MS) {
        state.meta.actionEvolutionSeen = true; state.meta.actionRevealPending = false; try { persistNow(); } catch (e) {}
        _cardEvolutionRunning = false; cleanupClass();
        try { const w = document.querySelector('#dayCard .daycard-wrap'); if (w) setLivingCardVars(w); } catch (e) {}
        try { if (typeof TabBar !== 'undefined' && TabBar.show) TabBar.show(); } catch (e) {}
        return;
      }
      if (overlayOpen()) { setTimeout(attempt, 1200); return; }
      // commit SEEN before the reveal: an interrupted run must never replay.
      state.meta.actionEvolutionSeen = true; state.meta.actionRevealPending = false; try { persistNow(); } catch (e) {}
      window._evoStageKind = 'action';
      try { document.body.classList.add('evo2-plat'); } catch (e) {}
      const ok = _runClarityUnlockCinema(() => { cleanupClass(); });
      if (!ok) { _cardEvolutionRunning = false; window._evoStageKind = null; cleanupClass(); try { if (typeof TabBar !== 'undefined' && TabBar.show) TabBar.show(); } catch (e) {} }
    };
    attempt();
  } catch (e) { _cardEvolutionRunning = false; }
}

// v614 (Malik): the clarity unlock CINEMA. The Today panel fades away, the
// blank Memento grows near full screen and sits empty for a beat, then the
// whole card SURGES completely purple with a shimmer sweeping across it,
// then it calms, the purple settling into an orb inside the card, and only
// then do the top-left beams slowly come in. ~9s, once in a lifetime (or on
// demand from ?dev=evo). opts.holdOverride keeps a stage pinned afterward
// (dev use); real runs return to live data at the end. Every exit path funnels
// through _evoFinish so a suspended run can never wedge the card blank.
function _runClarityUnlockCinema(onDone, opts) {
  opts = opts || {};
  const el = document.getElementById('dayCard');
  const wrap = el && el.querySelector('.daycard-wrap');
  const ns = wrap && wrap.querySelector('.daycard-ns');
  if (!wrap || !ns) return false;
  _cardEvolutionRunning = true;
  _evoFinished = false;
  _evoStartedAt = Date.now();
  const finish = () => _evoFinish(wrap, onDone, opts);
  try { stopLivingWander(); } catch (e) {}
  // Clear the room for the ceremony: the bottom bar slides away (built after
  // this cinema, it used to sit on screen through the whole reveal). Driven
  // here in JS, not just CSS, so it clears even if the compositor throttles
  // transitions mid-surge. It returns via _evoFinish when the card settles.
  try { if (typeof TabBar !== 'undefined' && TabBar.hide) TabBar.hide(); } catch (e) {}
  // clear any inline drift so the class choreography owns the blobs
  wrap.querySelectorAll('.daycard-ns__liquid .blob').forEach(b => { b.style.opacity = ''; b.style.transform = ''; });
  // v937: WHICH evolution is this. Every evolution used to run Clarity's script
  // (snap to blank, fill to cyan), which is right only for the first one. Action
  // opened on a blank card even though cyan was already earned, and it ended at
  // act:0, so the platinum flood had nothing under it and drained the moment the
  // wash faded (Malik: "it just kinda fades away"). Each evolution now starts
  // from what is ALREADY earned and ends holding what it just earned.
  const _stage = opts.stage || window._evoStageKind || null;
  const _evoTo = livingCardLevels();          // the settled state being unlocked
  const _isFirst = _stage !== 'action' && _stage !== 'consistency';
  const _evoFrom = _isFirst
    ? { clar: 0, act: 0, cons: 0 }            // Clarity: from truly nothing
    : (_stage === 'action'
        ? { clar: _evoTo.clar, act: 0, cons: _evoTo.cons }
        : { clar: _evoTo.clar, act: _evoTo.act, cons: 0 });

  // snap to the STARTING state instantly (no drain) before the slow transitions arm
  document.body.classList.add('evo2-snap');
  window._evoStageOverride = _evoFrom;
  window._evoHold = false;
  setLivingCardVars(wrap);
  // Only the FIRST evolution strips ns-bloom. The later ones are already lit,
  // and removing it is what blanked the card before the platinum arrived.
  document.body.classList.remove('evo2-surge', 'evo2-orb');
  if (_isFirst) document.body.classList.remove('ns-bloom');
  void wrap.offsetWidth;
  document.body.classList.remove('evo2-snap');
  document.body.classList.add('evo2');
  // Build the flat SURGE WASH: one flat purple gradient that floods the card, its
  // opacity animated in JS (compositor-only = smooth). We NEVER animate the blurred
  // liquid's blobs anymore, that transform-under-blur was the jank Malik saw on the
  // phone (v677, confirmed in the motion lab). It goes below the pressed emblem.
  let wash = ns.querySelector('.evo2-wash');
  if (!wash) {
    wash = document.createElement('span');
    wash.className = 'evo2-wash';
    const bodyEl = ns.querySelector('.daycard-ns__body');
    if (bodyEl) ns.insertBefore(wash, bodyEl); else ns.appendChild(wash);
  }
  wash.style.opacity = '0';
  window._evoWashAnims = [];
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Measure the grow: the card scales up to ALMOST full screen from its own spot
  // (Malik v678). JS computes the exact scale + vertical centering, so the
  // CSS transform is a pure compositor animation with no layout guesswork.
  // v1104 (his two cinema screenshots: blank card near full-bleed and shifted,
  // grown card riding up behind the status bar): this used to measure ONCE,
  // here, at cinema start. On a fresh boot that is before the page-1 geometry
  // has settled (--p1-top, the column height), so the measured rectangle was
  // stale and the card flew to a target computed from a layout that no longer
  // existed. The measurement is now a function, run again at GROW time, 0.9s
  // in, when the room is clear and the layout is final.
  // pin=true FREEZES the card's rendered size for the rest of the cinema.
  // Since v1108 the card's width is computed from its container's height, and
  // this cinema deliberately flips the home layout under it (ns-bloom at fill
  // time). Without the freeze the card kept growing AFTER the scale was set,
  // landing 20px off each edge (Malik: "the action evolution is a bit wacky").
  // Inline styles, so there is no specificity fight, and _evoFinish clears
  // them, so nothing about the resting card can inherit this.
  const _evoMeasure = (pin) => {
    try {
      // v1109: measure the VISIBLE CARD, not the wrap. The transform is applied
      // to the wrap, but the wrap is a full-size flex box and the card sits
      // inside it, so scaling by the wrap's dimensions overshot: at 430x932 the
      // wrap measured 601 tall against a 497 card, the height constraint won,
      // and the grown card ran 20px off each side (Malik's screenshot). Since
      // v1108 the card's size is computed independently of its box, so the two
      // are no longer interchangeable. Scale comes from the card; the offset
      // maps the CARD's centre to the screen's centre THROUGH the wrap's
      // transform origin, so it is correct even if the card is not centred in
      // its wrap.
      const wrapR = wrap.getBoundingClientRect();
      const stage = wrap.querySelector('.daycard-living-stage')
                 || wrap.querySelector('.daycard-ns') || wrap;
      const r = stage.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const sc = Math.min((vw * 0.94) / Math.max(r.width, 1), (vh * 0.86) / Math.max(r.height, 1), 1.6);
      const originY = wrapR.top + wrapR.height / 2;   // scale pivots here
      const cardY = r.top + r.height / 2;
      const ty = (vh / 2) - originY - (cardY - originY) * sc;
      wrap.style.setProperty('--evo-sc', sc.toFixed(4));
      wrap.style.setProperty('--evo-ty', ty.toFixed(1) + 'px');
      // Freeze via an inherited CUSTOM PROPERTY, never inline geometry: writing
      // width/height straight onto the stage mutated layout mid-cinema and the
      // run bailed out ~400ms in. The stage's own width formula reads this var
      // when present, so the size simply stops depending on the container.
      if (pin) wrap.style.setProperty('--evo-card-w', Math.round(r.width) + 'px');
    } catch (e) {}
  };
  _evoMeasure();
  // Cinematic pacing (the feel Malik picked in the motion lab), now with his full
  // v678 choreography: chrome clears -> the card GROWS near full screen -> floods
  // full purple -> recedes to the subtle resting blur -> shrinks home -> the room
  // returns. Nothing instant, every beat animated.
  const CLEAR = 900, GROW = 1150, FILL = 2400, HOLD = 500, SETTLE = 2200, SHRINK = 1150;
  const EASE_UP = 'cubic-bezier(0.28, 0.85, 0.2, 1)';
  const EASE_DOWN = 'cubic-bezier(0.45, 0, 0.3, 1)';
  const T = [];
  window._evoTimers = T;
  const tGrow = CLEAR;                                  // 0.9s
  const tFill = tGrow + GROW + 50;                      // ~2.1s
  const tSettle = tFill + FILL + HOLD;                  // ~5.0s
  const tShrink = tSettle + SETTLE;                     // ~7.2s
  const tFinish = tShrink + SHRINK + 100;               // ~8.45s
  T.push(setTimeout(() => {                     // THE GROW: card rises near full screen
    _evoMeasure(true);            // v1104: from the LIVE rect; v1109: and freeze it
    document.body.classList.add('evo2-grow');
  }, tGrow));
  T.push(setTimeout(() => {                     // THE FILL: rise to the earned state
    // v937: the END state is what was just earned, not a hardcoded cyan. This
    // is the line that made the platinum drain: it ended EVERY evolution at
    // act:0, so the wash faded onto a card that had never been handed the
    // Action light at all.
    window._evoStageOverride = _evoTo;
    setLivingCardVars(wrap);
    try { if (typeof MementoSound !== 'undefined') MementoSound.play('evolution'); } catch (e) {}
    // ns-bloom lights the INTERNAL liquid to its true resting purple so the settle
    // leaves a bright card, not a dark one. The beams + external glow it would also
    // trigger are held off by the body.evo2 suppression until finish drops evo2.
    // v771 (Malik: "the card drops when it gains color"): adding ns-bloom flips
    // the home LAYOUT under the card, moving its flow box, and the grown card
    // rode the shift down-screen. Measure the on-screen top across the flip and
    // fold the delta back into --evo-ty in the same frame (transition off), so
    // the card visually stays pinned at center.
    // v1109: track the CARD across the layout flip, not its wrapper. The wrap
    // is a flex box whose own height changes when ns-bloom lands, so folding
    // the wrap's delta back left the (now size-frozen) card sitting 66px below
    // centre. The card is what the eye is on, so the card is what stays put.
    const _evoTracked = wrap.querySelector('.daycard-living-stage') || wrap;
    const _beforeTop = (() => { try { return _evoTracked.getBoundingClientRect().top; } catch (e) { return null; } })();
    document.body.classList.add('ns-bloom');
    document.body.classList.add('evo2-surge');   // fades the resting liquid in (opacity only)
    try {
      if (_beforeTop !== null) {
        void document.body.offsetWidth;
        const delta = _evoTracked.getBoundingClientRect().top - _beforeTop;
        if (Math.abs(delta) > 1) {
          const prevTrans = wrap.style.transition;
          wrap.style.transition = 'none';
          const curTy = parseFloat(wrap.style.getPropertyValue('--evo-ty')) || 0;
          wrap.style.setProperty('--evo-ty', (curTy - delta).toFixed(1) + 'px');
          void wrap.offsetWidth;
          wrap.style.transition = prevTrans;
        }
      }
    } catch (e) {}
    if (reduce) { wash.style.opacity = '1'; }
    else {
      try {
        const a = wash.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FILL, easing: EASE_UP, fill: 'forwards' });
        window._evoWashAnims.push(a);
      } catch (e) { wash.style.opacity = '1'; }
    }
    // (the shimmer sweep was removed in v771, Malik)
  }, tFill));
  T.push(setTimeout(() => {                     // THE SETTLE: full purple -> subtle
    document.body.classList.remove('evo2-surge');
    document.body.classList.add('evo2-orb');
    if (reduce) { wash.style.opacity = '0'; }
    else {
      try {
        const a = wash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SETTLE, easing: EASE_DOWN, fill: 'forwards' });
        window._evoWashAnims.push(a);
      } catch (e) { wash.style.opacity = '0'; }
    }
  }, tSettle));
  T.push(setTimeout(() => {                     // THE RETURN: card shrinks home
    document.body.classList.remove('evo2-grow');
  }, tShrink));
  T.push(setTimeout(() => {                     // FINISH: first light + room fades in
    try { if (typeof MementoSound !== 'undefined') MementoSound.play('firstlight'); } catch (e) {}
    finish();                                   // _evoFinish drops evo2 (chrome + beams fade back)
  }, tFinish));
  // Safety net: if the tab was suspended and the exit timer fired late (or the
  // chain was throttled), this still lands us on the lit card. Fires late too,
  // but guarantees a finish once the app is foreground again.
  T.push(setTimeout(finish, EVO_MAX_MS + 800));
  // And the instant recovery: if the app is hidden/shown mid-cinema, finish
  // now rather than risk freezing on the blank frame.
  _evoVisHandler = () => { if (document.visibilityState === 'visible' && _cardEvolutionRunning) finish(); };
  try { document.addEventListener('visibilitychange', _evoVisHandler); } catch (e) {}
  return true;
}

function renderDailyMemento() {
  try {
    const el = document.getElementById('dailyMemento');
    if (!el) return;
    // v690 (Malik): the daily quote is OFF the home for now (the Hello header
    // owns the top of page 2). Deliberately paused, not deleted; he may want
    // it back, everything below stays intact.
    el.innerHTML = '';
    if (true) return;
    // Brand-new users get one element on screen: the welcome hero.
    if (isBrandNewUser()) { el.innerHTML = ''; return; }
    // Pre-Clarity the dashboard stays bare: the daily line earns its place
    // later in the journey.
    if (!(state.clarity && state.clarity.completed)) { el.innerHTML = ''; return; }
    const LINES = [
      'Small actions, repeated quietly, compound into a life.',
      'You do not rise to the level of your goals. You fall to the level of your systems.',
      'The work you do today is a letter to the person you are becoming.',
      'Discipline is choosing between what you want now and what you want most.',
      'A year from now you will wish you had started today, so start today.',
      'Motivation gets you started. Returning is what makes you.',
      'You are one honest decision away from a different kind of year.',
      'The days are long but the decades are short. Spend today on purpose.',
      'Consistency is just the trust you keep with yourself.',
      'A streak is proof you can keep a promise to yourself.'
    ];
    const day = Math.floor(Date.parse(getTodayISO() + 'T00:00:00Z') / 86400000);
    // Priority: a memory from exactly 365/90/30 days ago outranks everything
    // (this is a mortality app; your own past words hit harder than any
    // quote), then the user's anchor quote, then the rotating defaults.
    const otd = (typeof findOnThisDay === 'function') ? findOnThisDay() : null;
    const personal = (state.prefs && state.prefs.anchorQuote || '').trim();
    let label, line, italic;
    if (otd) {
      label = 'On this day · ' + otd.n + ' days ago';
      line = (otd.kind === 'note' ? 'You wrote: “' + otd.text + '”' : 'You did: ' + otd.text);
      italic = true;
    } else {
      label = personal ? 'Your words' : 'Quote of the day';
      line = personal || LINES[((day % LINES.length) + LINES.length) % LINES.length];
      italic = !!personal;
    }
    const accent = (typeof ccAccentColor === 'function') ? ccAccentColor() : 'var(--accent)';
    const otdOpen = otd && otd.kind === 'note' && otd.id;
    // Blockquote treatment (Malik): no card, no icon, just a quiet hairline
    // on the left, gold when it is the user's own past words.
    el.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:12px;margin:6px 2px 26px;padding:2px 0 2px 16px;border-left:2px solid ' + (otd ? 'rgba(var(--sacred-rgb),0.55)' : 'rgba(var(--accent-rgb),0.4)') + ';">' +
        '<div style="min-width:0;flex:1;' + (otdOpen ? 'cursor:pointer;' : '') + '"' + (otdOpen ? ' id="otdBody" role="button" tabindex="0" aria-label="Open this note"' : '') + '>' +
          '<div style="font-size:0.6rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--text-lo);font-weight:700;margin-bottom:3px;">' + esc(label) + '</div>' +
          '<div style="font-size:0.92rem;line-height:1.45;color:var(--text-mid);' + (italic ? 'font-style:italic;' : '') + '">' + esc(line) + '</div>' +
        '</div>' +
        (otd ? '<button id="otdDismiss" aria-label="Dismiss for today" style="flex:none;font:inherit;border:none;background:transparent;color:var(--text-3);font-size:1.1rem;line-height:1;cursor:pointer;padding:4px 6px;border-radius:6px;">&times;</button>' : '') +
      '</div>';
    if (otd) {
      const dis = el.querySelector('#otdDismiss');
      if (dis) dis.addEventListener('click', () => {
        if (!state.ui) state.ui = {};
        state.ui.otdDismissed = getTodayISO();
        persistState();
        renderDailyMemento();
      });
      const bodyEl = el.querySelector('#otdBody');
      if (bodyEl) bodyEl.addEventListener('click', () => {
        try {
          state.reflection.activeNoteId = otd.id;
          if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection');
        } catch (e) {}
      });
    }
  } catch (e) {}
}

// A single quiet consistency line under the quote: shown-up-this-week, the
// cumulative day count (green-tinted, tabular), and a slim 7-dot chain. Green
// never turns red. No card, no border. Hidden for brand-new users.
function renderHubConsistency() {
  try {
    const el = document.getElementById('hubConsistency');
    if (!el) return;
    // Removed (Malik, 2026-07-08): the weekly "Shown up X of 7" line + dots +
    // "Revisit your Neutron Star" is gone from the home. Kept the function as a
    // no-op so every caller stays safe; the logic below is dead until revived.
    el.innerHTML = '';
    return;
    /* eslint-disable no-unreachable */
    if (isBrandNewUser()) { el.innerHTML = ''; return; }
    // Pre-Clarity the home stays bare (card + Start CTA only). The consistency
    // line is part of the post-Clarity hub, same gate renderDailyMemento uses.
    if (!(state.clarity && state.clarity.completed)) { el.innerHTML = ''; return; }
    // weakestPillar biasing: when the user's weakest pillar is clarity, surface a
    // quiet way back to the goal (the diagnostic steering the hub). The card tint
    // already biases purple for clarity; this is the brief's secondary nudge.
    let revisitHtml = '';
    try {
      if (String((state.profile && state.profile.weakestPillar) || '').toLowerCase() === 'clarity') {
        revisitHtml = '<button class="hubcc__revisit" type="button">Revisit your Neutron Star</button>';
      }
    } catch (e) {}
    // One-time delegated click; survives the innerHTML re-renders below.
    if (!el._revisitBound) {
      el._revisitBound = true;
      el.addEventListener('click', function (e) {
        const t = e.target && e.target.closest && e.target.closest('.hubcc__revisit');
        if (t) { try { if (typeof ClarityExperience !== 'undefined' && ClarityExperience.openSummary) ClarityExperience.openSummary(); } catch (_) {} }
      });
    }
    let cs = { thisWeek: 0, totalActiveDays: 0, counts: {} };
    try { cs = consistencyStats(); } catch (e) {}
    const thisWeek = Math.min(7, cs.thisWeek || 0);
    const total = cs.totalActiveDays || 0;
    // 7-dot chain, oldest -> today, filled green for days shown up this week.
    let dots = '';
    try {
      const counts = cs.counts || {};
      const todayNum = Math.floor(Date.parse(getTodayISO() + 'T00:00:00Z') / 86400000);
      for (let i = 6; i >= 0; i--) {
        const iso = new Date((todayNum - i) * 86400000).toISOString().split('T')[0];
        const on = consistencyDayHasMainAction(counts[iso]);
        dots += '<span class="hubcc__dot' + (on ? ' is-on' : '') + '"></span>';
      }
    } catch (e) {}
    // Community counter: real number wired by the orchestrator later. Read from
    // a CloudSync counter API if one exists, else hide the line gracefully.
    // TODO(orchestrator): wire the live "days shown up in Memento" counter here.
    let community = '';
    try {
      const n = (window.CloudSync && typeof window.CloudSync.communityDays === 'function')
        ? window.CloudSync.communityDays() : null;
      if (typeof n === 'number' && n > 0) {
        community = '<span class="hubcc__community">' + n.toLocaleString() + ' days shown up in Memento</span>';
      }
    } catch (e) {}
    // Warm states (no guilt, green never turns red, the total is never zeroed):
    // comeback after a gap replaces the line with a welcome; late-in-day and not
    // yet shown up is a gentle nudge, not a warning.
    const todayISO = getTodayISO();
    // showedUp = ANY activity today (note, check-in, action) -> fills the chain dot
    // and means they are not "away". actionDone = the daily ACTION is complete ->
    // the close-your-day reward. They are different: the "Today is closed" banner
    // must track the ACTION so it never contradicts the command center's "I did it"
    // button on the same screen (a note-only day shows up, but the loop isn't closed).
    const showedUpToday = (cs.counts || {})[todayISO] !== undefined;
    const actionDone = actionDoneToday();
    let comeback = false;
    // showing up at all (even just a note) wins over a comeback-gap welcome.
    try { comeback = !showedUpToday && (typeof isComebackGap === 'function') && isComebackGap(); } catch (e) {}
    const lateAndNotDone = !showedUpToday && !comeback && new Date().getHours() >= 14;
    if (comeback) {
      el.innerHTML = '<div class="hubcc hubcc--msg"><span class="hubcc__shown">Welcome back. You have shown up <b>' + total + '</b> day' + (total === 1 ? '' : 's') + '. Today makes <b>' + (total + 1) + '</b>.</span></div>' + community + revisitHtml;
      return;
    }
    if (lateAndNotDone) {
      el.innerHTML = '<div class="hubcc hubcc--msg"><span class="hubcc__shown">Still time to show up today. The next move is right here.</span></div>' + community + revisitHtml;
      return;
    }
    if (actionDone) {
      // Close-your-day: the quiet, earned reward once today's action is done. The
      // chain shows today's dot filled. No confetti; the point is calm, not loud.
      el.innerHTML =
        '<div class="hubcc hubcc--done">' +
          '<span class="hubcc__shown hubcc__closed">Today is closed. You showed up.</span>' +
          '<span class="hubcc__chain">' + dots + '</span>' +
        '</div>' + community + revisitHtml;
      return;
    }
    el.innerHTML =
      '<div class="hubcc">' +
        '<span class="hubcc__shown">Shown up <b>' + thisWeek + '</b> of 7 this week</span>' +
        '<span class="hubcc__chain">' + dots + '</span>' +
        '<span class="hubcc__total"><b>' + total + '</b> day' + (total === 1 ? '' : 's') + '</span>' +
      '</div>' + community + revisitHtml;
  } catch (e) {}
}

// A memory from exactly one year, ninety days, or thirty days ago (in that
// order of weight): the longest note from that day, else a proof event. Null
// when there is nothing or the user dismissed it for today.
function findOnThisDay() {
  try {
    if (state.ui && state.ui.otdDismissed === getTodayISO()) return null;
    for (const n of [365, 90, 30]) {
      const d = new Date(); d.setDate(d.getDate() - n);
      const key = localISO(d);
      const notes = ((state.reflection && state.reflection.entries) || []).filter(e => e && e.iso === key && (e.text || '').trim());
      notes.sort((a, b) => (b.text || '').length - (a.text || '').length);
      if (notes[0]) return { n, kind: 'note', id: notes[0].id || '', text: (notes[0].text || '').trim().slice(0, 160) };
      const ev = (state.proofEvents || []).find(x => x && x.iso === key && (x.title || x.text));
      if (ev) return { n, kind: 'proof', id: '', text: String(ev.title || ev.text || '').slice(0, 160) };
    }
    return null;
  } catch (e) { return null; }
}
// v25: captures live in Notes now, so the FAB carries no triage badge. The
// element stays (and stays hidden) so old markup never shows a stale count.
function updateCaptureFab() {
  try {
    const badge = document.getElementById('captureFabBadge');
    if (!badge) return;
    badge.textContent = '';
    badge.hidden = true;
  } catch (_) {}
}

// Write a quick capture straight into the Notes "Captures" folder (created on
// first use). Shared by the FAB capture card, the C shortcut, the palette,
// and Deep Work's distraction parking. Returns true on success.
function captureToNotes(text) {
  try {
    const t = String(text || '').trim();
    if (!t) return false;
    if (!state.reflection) state.reflection = { entries: [], trash: [], folders: [] };
    if (!Array.isArray(state.reflection.folders)) state.reflection.folders = [];
    if (!Array.isArray(state.reflection.entries)) state.reflection.entries = [];
    let f = state.reflection.folders.find(x => x && x.name === 'Captures');
    if (!f) {
      f = { id: 'fold_captures_' + Date.now().toString(36), name: 'Captures' };
      state.reflection.folders.push(f);
    }
    const now = new Date();
    state.reflection.entries.push({
      id: 'rn_cap_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      iso: getTodayISO(),
      date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      text: t, html: '', title: '', folder: f.id, updated: Date.now()
    });
    persistState();
    return true;
  } catch (e) { return false; }
}

// === Undo toast =====================================================
// Destructive actions run instantly and stay reversible for 6 seconds, the
// Superhuman/Linear pattern: no "Are you sure?" dialogs except for full
// resets. finalizeFn runs when the window closes WITHOUT an undo (or when a
// newer toast replaces this one): irreversible cleanup like IndexedDB image
// purges belongs there, never in the action itself.
let _undoEl = null, _undoTimer = null, _undoFinalize = null;
function showUndoToast(message, undoFn, finalizeFn) {
  try {
    if (_undoFinalize) { try { _undoFinalize(); } catch (e) {} }
    clearTimeout(_undoTimer);
    if (_undoEl) { try { _undoEl.remove(); } catch (e) {} _undoEl = null; }
    _undoFinalize = finalizeFn || null;
    const el = document.createElement('div');
    _undoEl = el;
    el.className = 'undo-toast';
    el.setAttribute('role', 'status');
    el.innerHTML = '<span class="undo-toast__msg"></span><button class="undo-toast__btn" type="button">Undo</button>';
    el.querySelector('.undo-toast__msg').textContent = message || 'Done.';
    document.body.appendChild(el);
    const close = (runFinalize) => {
      clearTimeout(_undoTimer);
      if (runFinalize && _undoFinalize) { try { _undoFinalize(); } catch (e) {} }
      _undoFinalize = null;
      el.classList.remove('is-visible');
      setTimeout(() => { try { el.remove(); } catch (e) {} if (_undoEl === el) _undoEl = null; }, 300);
    };
    el.querySelector('.undo-toast__btn').addEventListener('click', () => {
      _undoFinalize = null;
      try { if (undoFn) undoFn(); } catch (e) {}
      close(false);
    });
    _undoTimer = setTimeout(() => close(true), 6000);
    void el.offsetWidth;
    el.classList.add('is-visible');
  } catch (e) { if (finalizeFn) { try { finalizeFn(); } catch (_) {} } }
}

// === Morning ritual trigger =========================================
// On the first dashboard open of a new morning (4am to noon), users with a
// completed Clarity and a plan get the bookend ritual: first ever time as a
// gentle offer that sets prefs.morningRitual, afterwards automatically.
// Never over the splash, onboarding, or a restored experience; never in demo;
// at most once per day (state.bookends.lastMorningISO is the ritual's own
// per-day guard, the offer uses the same one).
function maybeOfferMorningRitual() {
  try {
    if (DEMO_MODE) return;
    if (!state.clarity || !state.clarity.completed) return;
    if (!state.action || !state.action.planGenerated) return;
    if (typeof isBrandNewUser === 'function' && isBrandNewUser()) return;
    const h = new Date().getHours();
    if (h < 4 || h >= 12) return;
    const today = getTodayISO();
    if (state.bookends && state.bookends.lastMorningISO === today) return;
    const pref = state.prefs && state.prefs.morningRitual;
    if (pref === 'off') return;
    if (document.querySelector('.sheet.open, .clarity-exp.open, .action-exp.open, .tmrw-plan')) return;
    const sp = document.getElementById('splash');
    if (sp && !sp.classList.contains('dismissed')) return;
    if (pref === 'on') {
      try { Sheet.open('bookend'); } catch (e) {}
      return;
    }
    // First encounter: a quiet offer, one decision, remembered either way.
    if (document.querySelector('.tmrw-plan--ritual')) return;
    const el = document.createElement('div');
    el.className = 'tmrw-plan tmrw-plan--ritual';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Morning ritual');
    el.innerHTML =
      '<div class="tmrw-plan__text">Start the day with a 20-second ritual?' +
        '<span>Yesterday, looked in the eye. Today, named. One line to anchor it. You can turn it off any time in Settings.</span>' +
      '</div>' +
      '<div class="tmrw-plan__row">' +
        '<button class="tmrw-plan__save" type="button">Try it</button>' +
        '<button class="tmrw-plan__skip" type="button">Not for me</button>' +
      '</div>';
    document.body.appendChild(el);
    const dismiss = () => {
      el.classList.remove('is-visible');
      setTimeout(() => { try { el.remove(); } catch (_) {} }, 300);
    };
    el.querySelector('.tmrw-plan__save').addEventListener('click', () => {
      if (!state.prefs) state.prefs = {};
      state.prefs.morningRitual = 'on';
      persistState();
      dismiss();
      setTimeout(() => { try { Sheet.open('bookend'); } catch (e) {} }, 320);
    });
    el.querySelector('.tmrw-plan__skip').addEventListener('click', () => {
      if (!state.prefs) state.prefs = {};
      state.prefs.morningRitual = 'off';
      persistState();
      dismiss();
    });
    void el.offsetWidth;
    el.classList.add('is-visible');
  } catch (e) {}
}

// The FAB's capture surface: a small glass card with one input, saving to the
// Notes Captures folder. Replaces the old Inbox sheet as the capture path.
let _qcEl = null;
function showQuickCapture() {
  try {
    if (_qcEl || document.querySelector('.tmrw-plan--capture')) return;
    const el = document.createElement('div');
    _qcEl = el;
    el.className = 'tmrw-plan tmrw-plan--capture';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Quick capture');
    el.innerHTML =
      '<div class="tmrw-plan__text">Catch it before it slips.' +
        '<span>Saved to Notes, in your Captures folder.</span>' +
      '</div>' +
      '<input class="tmrw-plan__input" type="text" maxlength="280" placeholder="Anything on your mind" aria-label="Capture">' +
      '<div class="tmrw-plan__row">' +
        '<button class="tmrw-plan__save" type="button">Save</button>' +
        '<button class="tmrw-plan__skip" type="button">Cancel</button>' +
      '</div>';
    document.body.appendChild(el);
    const input = el.querySelector('.tmrw-plan__input');
    const dismiss = () => {
      el.classList.remove('is-visible');
      setTimeout(() => { try { el.remove(); } catch (_) {} if (_qcEl === el) _qcEl = null; }, 300);
    };
    const save = () => {
      captureToNotes(input.value);
      dismiss();
    };
    el.querySelector('.tmrw-plan__save').addEventListener('click', save);
    el.querySelector('.tmrw-plan__skip').addEventListener('click', dismiss);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') dismiss();
    });
    void el.offsetWidth;
    el.classList.add('is-visible');
    setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (_) {} }, 250);
  } catch (_) {}
}

// v24 granular render: refresh ONE widget (plus the command center hero and
// the sidebar, which mirror most state) instead of repainting every widget.
// Use for high-frequency interactions inside sheets; renderAll stays for
// structural changes (unlocks, resets, demo loads, day rollover).
function renderWidget(key) {
  try {
    const el = document.querySelector(`.widget[data-widget="${key}"]`);
    if (el) {
      if (RENDERERS[key]) RENDERERS[key](el);
      if (key === 'claritySphere') {
        el.innerHTML = renderClaritySphereCard();
        bindSyntheticWidget('claritySphere', el);
      }
    }
    const _cc = document.getElementById('commandCenter');
    if (_cc) { _cc.innerHTML = renderCommandCenter(); bindCommandCenter(_cc); }
    if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh();
  } catch (e) {}
}


// === The Day Card (mobile hero) =====================================
// A compact copy of Clarity's Neutron Star summary card, worn at the top
// of the dashboard the way the Apple Card sits at the top of Wallet: the
// artifact first, information below. The original card inside Clarity is
// untouched; this is a separate, smaller rendering of the same asset.
// Additive: shown on mobile by CSS, desktop opts in via ?daycard=1.
// v1177: the v1175 ray mask is RETIRED. It cut a dark hole in the beams
// around the card, which was itself a dark region (worse than the beams it
// tried to hide). This now only CLEARS any mask a stale build left behind.
function _mfShieldRays() {
  try {
    const rays = document.querySelector('.ambient .ambient__rays');
    if (rays) { rays.style.webkitMaskImage = ''; rays.style.maskImage = ''; }
  } catch (e) {}
}
try { _mfShieldRays(); } catch (e) {}

function renderDayCard() {
  try {
    const el = document.getElementById('dayCard');
    if (!el) return;
    // The record is mounted once and reused, so it has to be told when the
    // data under it moved. This only throws the built record away while it is
    // shut; the next open composes fresh, and an open record is left alone.
    try { if (typeof MementoView !== 'undefined') MementoView.invalidate(); } catch (e) {}
    // The unlock cinema OWNS the card while it runs. Rebuilding innerHTML here
    // detaches the exact nodes the cinema is animating, so the user stares at a
    // fresh blank card while the whole show plays on a dead one (Malik's
    // recording, v678: no purple ever appeared). _evoFinish re-syncs the card.
    if (typeof _cardEvolutionRunning !== 'undefined' && _cardEvolutionRunning) return;
    try { if (/[?&]daycard=1/.test(location.search)) document.body.classList.add('daycard-force'); } catch (e) {}
    // Show the card for anyone who is past the brand-new state. isBrandNewUser()
    // already returns false once they have data (e.g. a birth year from
    // onboarding), and its own rule is that such a user "must see their card",
    // so we no longer also require Clarity to be completed (that left freshly
    // onboarded users staring at an empty home).
    if (typeof isBrandNewUser === 'function' && isBrandNewUser()) { stopLivingWander(); el.innerHTML = ''; return; }

    // The Day Card is always the LIVING (colorful) card now. The tap-the-emblem
    // toggle to the blank platinum card was removed (Malik). Color is still EARNED:
    // the living layers stay blank until the Neutron Star is locked in
    // (body.ns-bloom), then bloom in. Keep any stale saved theme consistent for
    // other readers (the share card) with a one-time flip.
    const theme = 'living';
    const living = true;
    try { if (state.dayCard && state.dayCard.theme !== 'living') { state.dayCard.theme = 'living'; persistState(); } } catch (_) {}
    const blobs = '<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><i class="blob b4"></i><i class="blob b5"></i><i class="blob b6"></i>';
    // The brand mark machined INTO the glass: filled at 5% so it reads as a
    // relief, light catching its lower edge, shadow on the upper (a deboss).
    const emblemSvg = '<svg class="daycard-ns__emblem" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>';
    const nameSpan = '<span class="daycard-ns__name">' + esc(((state.profile && state.profile.name) || '').trim()) + '</span>';
    // The card face stays pure (no engraved goal): the living color IS the card.
    // The goal lives in Clarity and on the share/breakdown surfaces.
    const goalSpan = '';
    // Materialize once per day: the card's signature entrance plays only on the
    // first Home open each day, then stays calm (Malik's pick).
    let materialize = false;
    let reveal = false;
    try {
      const _today = (typeof getTodayISO === 'function') ? getTodayISO() : '';
      // Only "spend" an entrance when the card is actually on screen: the boot mask
      // must be lifted (body.boot-revealed) AND #dayCard must be visible (offsetParent
      // !== null, i.e. the dashboard is the active view, not a restored Action/Clarity
      // view). Otherwise the animation plays under the mask / on a hidden card and is
      // consumed invisibly. js/11 re-renders the card right after revealing.
      const visible = document.body && document.body.classList.contains('boot-revealed') && el.offsetParent !== null;
      // ONE-TIME "comes to life": the first time the card is ever shown COLORED
      // (right after Clarity is set), the colors bloom in from clear instead of
      // popping. Fires once ever (state.meta.cardRevealed), and takes precedence
      // over the daily materialize so the reveal is the moment that lands.
      if (visible && living && state.clarity && state.clarity.completed && state.meta && !state.meta.cardRevealed) {
        reveal = true; state.meta.cardRevealed = true;
        if (_today && state.meta) state.meta.cardSeenISO = _today; // the reveal also counts as today's entrance
        try { if (!DEMO_MODE && typeof persistState === 'function') persistState(); } catch (e) {}
      } else if (_today && visible && state.meta && state.meta.cardSeenISO !== _today) {
        // Materialize once per day: the signature entrance on the first Home open.
        materialize = true; state.meta.cardSeenISO = _today;
        try { if (!DEMO_MODE && typeof persistState === 'function') persistState(); } catch (e) {}
      }
    } catch (e) {}

    const ns =
      '<div class="daycard-ns" id="dayCardNs">' +
        (living ? '<span class="daycard-ns__liquid" aria-hidden="true">' + blobs + '</span>' : '') +
        '<span class="daycard-ns__iri" aria-hidden="true"></span>' +
        '<span class="daycard-ns__sheen" aria-hidden="true"></span>' +
        ((state.meta && state.meta.moriMomentAt) ? '<span class="daycard-ns__mori" aria-hidden="true"></span>' : '') +
        ((state.meta && state.meta.vivereMomentAt) ? '<span class="daycard-ns__vivere" aria-hidden="true"></span>' : '') +
        (living ? '<span class="daycard-ns__burn" aria-hidden="true"></span>' : '') +
        /* v930 (Malik's playground picks): the Action REWARD. __plat is the
           silvery wash, __tint re-states the earned hues on top of it so they
           are not drowned, __rim is the burning perimeter. All three are
           driven by --act alone, so an unearned card never shows them: the
           rim in particular is a reward, never the card's default edge. */
        (living ? '<span class="daycard-ns__plat" aria-hidden="true"></span>' : '') +
        (living ? '<span class="daycard-ns__tint" aria-hidden="true"></span>' : '') +
        (living ? '<span class="daycard-ns__rim" aria-hidden="true"></span>' : '') +
        '<div class="daycard-ns__body">' + emblemSvg + '</div>' +
        '<div class="daycard-ns__foot">' + goalSpan + nameSpan + '</div>' +
      '</div>';

    // Living wraps the card + its bloom + ground reflection in a stage sized to
    // the card so the reflection aligns; platinum renders the card directly.
    const inner = living
      ? '<div class="daycard-living-stage">' +
          '<span class="daycard-bloom" aria-hidden="true">' + blobs + '</span>' +
          /* v930: the floor carries the rim too (Malik: he wants the reward to
             show in the ground reflection). It needs no machinery of its own,
             the floor is already flipped, blurred and masked, so a rim placed
             inside it inherits all of that and reads as the reflected edge. */
          '<span class="daycard-floor" aria-hidden="true">' + blobs +
            '<span class="daycard-ns__rim" aria-hidden="true"></span>' +
          '</span>' +
          ns +
        '</div>'
      : ns;

    // v27: Home is one scrolling page, so the old "Swipe up for more" hint and
    // its scroll page-state watcher are gone (the two-page snap they served was
    // removed). The card is just the wrap.
    el.innerHTML =
      '<div class="daycard-wrap daycard-theme-' + theme + (reveal ? ' daycard-reveal' : (materialize ? ' daycard-materialize' : '')) + '">' +
        '<span class="daycard-wrap__aura" aria-hidden="true"></span>' +
        inner +
      '</div>';

    // v1170: an entrance that never finishes must not leave the card blurred.
    // A backgrounded tab freezes the timeline (fill:both holds the FIRST
    // frame, which is the blurred one), and that stranded frame is what read
    // as a dark box on desktop. The class is stripped on end and on a hard
    // deadline, so the card always lands clean.
    if (reveal || materialize) {
      try {
        const _wrapEl = el.querySelector('.daycard-wrap');
        const _cls = reveal ? 'daycard-reveal' : 'daycard-materialize';
        const _clear = () => { try { if (_wrapEl) _wrapEl.classList.remove(_cls); } catch (e) {} };
        const _face = _wrapEl && _wrapEl.querySelector('.daycard-ns');
        if (_face) _face.addEventListener('animationend', _clear, { once: true });
        setTimeout(_clear, reveal ? 1800 : 1200);
      } catch (e) {}
    }

    const nsEl = el.querySelector('#dayCardNs');
    bindDayCardTilt(nsEl);
    bindDayCardMotion(el.querySelector('.daycard-wrap'), nsEl);
    // The card is a STATIC hero, not a button (memory: home-blank-is-locked-layout,
    // card static + pinned to home size). Tapping it used to open the fullscreen
    // Memento (openMementoFull), which borrows the REAL card DOM node into an
    // overlay and restores it on close, a fragile move that on iOS could leave the
    // card floating over the home in a broken half-state (Malik v668). The progress
    // stats now live in the Path tab, so the card tap is removed: it does nothing.
    if (living) {
      const wrap = el.querySelector('.daycard-wrap');
      setLivingCardVars(wrap);
      try { applyCardSkin(wrap); } catch (e) {}
      startLivingWander(wrap);
      // v1120 (Malik): the tap is BACK. It was removed in v668 because the old
      // borrow could strand the card on iOS; since v1139 the card is never
      // moved at all, so that whole failure mode no longer exists.
      // Slop guard: a tilt-drag or scroll that starts on the card is not a tap.
      // v1145: the tap gesture no longer lives here at all. See _mfBindCardTap
      // below: it is bound ONCE to the document, because #dayCard itself gets
      // replaced during boot and any listener on it went with it.
      try { _mfBindCardTap(); } catch (e) {}
      // FIRST WHITE: the one-time ceremony when the card earns its first action
      // light (FIRST-WIN-PLAN #4/#5: log the first move -> the card gains its
      // first white, 2-3s, not confetti). The white blob blooms in bright, holds
      // a beat, then settles to its true earned level (css/daycard-living.css
      // dcFirstWhite). Fires once ever, only with the card actually on screen,
      // and never on the same render as the full color reveal above (that bloom
      // already carries every channel in from clear).
      try {
        const hasWhite = !!(state.action && Array.isArray(state.action.completionHistory) && state.action.completionHistory.length);
        // "On screen" must mean FRONT-MOST, not just rendered: right after "Mark
        // it done" the card sits behind the Action view + share win overlay, and
        // offsetParent alone let the ceremony burn its once-ever flag invisibly.
        // Probe the card's center; if anything else (an overlay) is on top, skip
        // and let a later render (ActionExperience.close nudges one) play it.
        const cardFront = (() => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || r.bottom < 0 || r.top > window.innerHeight) return false;
          const px = Math.min(window.innerWidth - 2, Math.max(2, r.left + r.width / 2));
          const py = Math.min(window.innerHeight - 2, Math.max(2, r.top + r.height / 2));
          const probe = document.elementFromPoint(px, py);
          return !!(probe && (el.contains(probe) || probe.contains(el)));
        })();
        const visibleNow = document.body && document.body.classList.contains('boot-revealed') && el.offsetParent !== null && cardFront;
        if (visibleNow && !reveal && hasWhite && state.clarity && state.clarity.completed && state.meta && !state.meta.firstWhiteShown) {
          state.meta.firstWhiteShown = true;
          try { if (!DEMO_MODE && typeof persistState === 'function') persistState(); } catch (e) {}
          // let the card settle first, then run the bloom and drop the class so a
          // later re-render can never replay it (adding to a detached wrap is inert)
          setTimeout(() => { try { wrap.classList.add('daycard-firstwhite'); } catch (e) {} }, 520);
          setTimeout(() => { try { wrap.classList.remove('daycard-firstwhite'); } catch (e) {} }, 3600);
          // The one push-permission ask, right after the win lands (js/20-push).
          setTimeout(() => { try { window.MementoPush && MementoPush.maybePromptAfterFirstWin(); } catch (e) {} }, 4300);
        }
      } catch (e) {}
    } else {
      stopLivingWander();
    }
    // The render just replaced .daycard-wrap. If the record is open, the new
    // node has to inherit the scroll offset THIS frame, or the card snaps back
    // to the top for a beat before catching up.
    try { if (typeof MementoView !== 'undefined') MementoView._sync(); } catch (e) {}
  } catch (e) {}
}

// Fullscreen Memento: tap the card to expand it and read where you stand across
// the three pillars - Clarity (your goal), Action (your daily follow-through),
// Consistency (your streak). The card is the hero; the stats sit under it. A
// snapshot clone of the live card carries its current theme + colour.
/* v1140 THE MEMENTO INTERACTION, REBUILT AS A STATE MACHINE.
   Everything below the controller is now only a BUILDER: it composes the
   record once and wires its own controls. It never opens, closes, animates,
   appends on every visit, or destroys anything. MementoView owns all of that. */
/* ═══════════════════════════════════════════════════════════════════════
   v1151 THE MEMENTO PAGE (MEMENTO-PAGE-SPEC.md is the contract; the mockup
   memento-inside.html is the face of record). The trophy room and the rescue
   object in one jar. Three movements: Progress so far, Mori, Vivere. The
   up-only law rules every number here; only the mortality countdown falls.
   Day-zero law: every box exists from day one, holding zeros. Dark only.
   These are BUILDERS: MementoView still owns open/close/destroy (v1140/1149).
   ═══════════════════════════════════════════════════════════════════════ */

// the birth of the record, persisted once so it survives reinstall via sync
function _mfCreationAt() {
  try {
    if (!state.meta) state.meta = {};
    if (state.meta.creationAt && isFinite(state.meta.creationAt)) return state.meta.creationAt;
    // the EARLIEST trace wins: ignition, completion (ms or ISO), first proof,
    // first counted day. Legacy accounts have activity older than ignitedAt,
    // and a creation date after your own first mark is a lie.
    const cands = [];
    const push = (v) => {
      const n = (typeof v === 'string') ? Date.parse(v) : Number(v);
      if (isFinite(n) && n > 0) cands.push(n);
    };
    push(state.clarity && state.clarity.ignitedAt);
    push(state.clarity && state.clarity.completedAt);
    (Array.isArray(state.proofEvents) ? state.proofEvents : []).forEach(e => push(e && e.ts));
    try {
      const days = Object.keys(consistencyStats().counts || {}).sort();
      if (days.length) push(days[0] + 'T12:00:00');
    } catch (e) {}
    const t = cands.length ? Math.min.apply(null, cands) : Date.now();
    state.meta.creationAt = t;
    try { persistNow(); } catch (e) {}
    return t;
  } catch (e) { return Date.now(); }
}

// one pass over the whole record: everything the page states, derived honestly
function _mfDerive() {
  const d = {};
  const evs = Array.isArray(state.proofEvents) ? state.proofEvents.filter(e => e && e.type !== 'new-record') : [];
  d.creationAt = _mfCreationAt();
  d.born = new Date(d.creationAt);
  d.dayN = Math.max(0, Math.floor((Date.now() - d.creationAt) / 86400000));
  let cs = { current: 0, longest: 0, totalActiveDays: 0, counts: {} };
  try { cs = consistencyStats(); } catch (e) {}
  d.cs = cs;
  // typed volume. Actions are the union of proof events and the completion
  // history (one per day): legacy accounts carry months of history from
  // before proof events existed, and 232 kept days must never read as 0.
  const actDays = {};
  evs.forEach(e => { if (e.type === 'action-complete') actDays[e.iso || new Date(e.ts || 0).toISOString().slice(0, 10)] = 1; });
  (Array.isArray(state.action && state.action.completionHistory) ? state.action.completionHistory : []).forEach(hh => {
    const iso = String(hh.date || hh.iso || '').slice(0, 10);
    if (iso) actDays[iso] = 1;
  });
  d.acts = Object.keys(actDays).length;
  d.deepEvs = evs.filter(e => e.type === 'deepwork-commit');
  d.deep = d.deepEvs.length;
  d.deepMin = d.deepEvs.reduce((n, e) => n + (Number(e.metadata && e.metadata.minutes) || 0), 0);
  d.notes = evs.filter(e => e.type === 'reflection-save').length;
  d.marks = d.acts + d.deep + d.notes;
  // the day-by-day wall since creation: marked / blank / comeback-return
  const dayIso = (t) => new Date(t).toISOString().slice(0, 10);
  const isoAt = (i) => dayIso(d.creationAt + i * 86400000);
  const marked = (iso) => { const c = cs.counts && cs.counts[iso]; return !!(c && (typeof consistencyDayHasMainAction !== 'function' || consistencyDayHasMainAction(c) || c > 0)); };
  d.wallDays = [];
  const totalDays = Math.min(d.dayN + 1, 3660);
  let gapLen = 0; d.comebacks = 0; d.openGap = false;
  for (let i = 0; i < totalDays; i++) {
    const iso = isoAt(i);
    const on = marked(iso);
    let k = 'is-off';
    if (on) { k = gapLen >= 2 ? 'is-back' : 'is-on'; if (gapLen >= 2) d.comebacks++; gapLen = 0; }
    else gapLen++;
    d.wallDays.push({ iso: iso, k: k });
  }
  d.openGap = gapLen >= 2;
  d.backDays = d.wallDays.filter(w => w.k === 'is-back').length;
  d.markedDays = d.wallDays.filter(w => w.k !== 'is-off').length;
  d.blankDays = d.wallDays.length - d.markedDays;
  // longest run, with dates
  let run = 0, best = 0, bestEnd = -1;
  d.wallDays.forEach((w, i) => {
    if (w.k !== 'is-off') { run++; if (run > best) { best = run; bestEnd = i; } }
    else run = 0;
  });
  d.longest = Math.max(best, cs.longest || 0, cs.current || 0);
  d.runNow = cs.current || 0;
  d.longestEnd = bestEnd >= 0 ? new Date(d.creationAt + bestEnd * 86400000) : null;
  d.longestStart = bestEnd >= 0 ? new Date(d.creationAt + (bestEnd - best + 1) * 86400000) : null;
  d.longestStanding = d.longestEnd ? Math.max(0, Math.floor((Date.now() - d.longestEnd.getTime()) / 86400000)) : 0;
  // weeks since creation (calendar-free: 7-day slices from creation)
  d.weeks = [];
  for (let w = 0; w * 7 < totalDays; w++) {
    let kept = 0, len = 0;
    for (let i = w * 7; i < Math.min((w + 1) * 7, totalDays); i++) { len++; if (d.wallDays[i].k !== 'is-off') kept++; }
    d.weeks.push({ kept: kept, len: len, start: new Date(d.creationAt + w * 7 * 86400000) });
  }
  let bw = null; d.weeks.forEach((w, i) => { if (w.len === 7 && (!bw || w.kept > bw.kept)) { bw = w; bw.i = i; } });
  d.bestWeek = bw;
  // biggest day: typed events plus history-only action days
  const perDay = {};
  const evActDays = {};
  evs.forEach(e => {
    const iso = e.iso || dayIso(e.ts || Date.now());
    perDay[iso] = (perDay[iso] || 0) + 1;
    if (e.type === 'action-complete') evActDays[iso] = 1;
  });
  Object.keys(actDays).forEach(iso => { if (!evActDays[iso]) perDay[iso] = (perDay[iso] || 0) + 1; });
  let big = null;
  Object.keys(perDay).forEach(iso => { if (!big || perDay[iso] > big.n) big = { iso: iso, n: perDay[iso] }; });
  d.biggestDay = big;
  // first mark: the earliest trace, proof event or history day
  const withTs = evs.filter(e => isFinite(e.ts)).sort((a, b) => a.ts - b.ts);
  d.firstEv = withTs[0] || null;
  const firstActDay = Object.keys(actDays).sort()[0];
  if (firstActDay) {
    const t = Date.parse(firstActDay + 'T12:00:00');
    if (!d.firstEv || t < d.firstEv.ts) d.firstEv = { ts: t, type: 'action-complete', histOnly: true };
  }
  // words: first and latest reflection with text, and the hardest days
  // clarity notes count as marks but never as quoted lines: the glance below
  // already shows the note itself, the record must not read it back twice
  const refl = withTs.filter(e => e.type === 'reflection-save' && String(e.text || '').trim() &&
    String((e.metadata && e.metadata.dedupeKey) || '').indexOf('clarnote-') !== 0);
  d.firstLine = refl[0] || null;
  d.lastLine = refl.length > 1 ? refl[refl.length - 1] : null;
  const backSet = {}; d.wallDays.forEach(w => { if (w.k === 'is-back') backSet[w.iso] = 1; });
  const distSet = {}; withTs.forEach(e => { if (e.type === 'distraction-log') distSet[e.iso || dayIso(e.ts)] = 1; });
  d.hardest = refl.filter(e => { const iso = e.iso || dayIso(e.ts); return backSet[iso] || distSet[iso]; }).slice(-3);
  // mori
  const by = state.mori && Number(state.mori.birthYear);
  const exp = Number((state.mori && state.mori.lifeExpectancy) || 80);
  d.moriEnd = by ? new Date(by + exp, 0, 1).getTime() : 0;
  d.exp = exp;
  if (by) {
    const bornLife = new Date(by, 0, 1).getTime();
    d.weeksLived = Math.max(0, Math.floor((Date.now() - bornLife) / (7 * 86400000)));
    d.weeksTotal = Math.floor(exp * 52.18);
    d.daysLeft = Math.max(0, Math.floor((d.moriEnd - Date.now()) / 86400000));
  }
  d.weeksOnPath = Math.max(d.dayN > 0 ? 1 : 0, Math.floor(d.dayN / 7));
  return d;
}

// the mission as one human sentence; the grammar bends per goal type and it
// is tense-aware: after today's mark the middle clause flips to done.
function _mfMissionHtml(d) {
  try {
    const shape = (typeof ccGoalShape === 'function') ? ccGoalShape() : null;
    if (!shape) return '';
    const gp = state.goalProgress || {};
    const pa = (state.action && state.action.primaryAction) || {};
    const tiers = pa.tiers || {};
    const TK = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    const selT = state.action && state.action.selectedTier;
    const move = (tiers[TK.indexOf(selT) >= 0 ? selT : pa.recommendedTier] || pa.title || '').trim();
    const done = (typeof actionDoneToday === 'function') && actionDoneToday();
    const E = esc;
    let want = '';
    const t = shape.type;
    if ((t === 'quantity_up' || t === 'quantity_down') && shape.target !== null) {
      const cur = (gp.current !== null && gp.current !== undefined) ? gp.current : 0;
      const tgt = shape.target.toLocaleString() + (shape.unit ? ' ' + E(shape.unit) : '');
      want = t === 'quantity_up'
        ? 'You want <b class="msn__c">' + tgt + '</b>, and ' + cur.toLocaleString() + ' are in.'
        : 'You want <b class="msn__c">' + tgt + '</b> gone, and ' + (gp.baseline !== null && gp.current !== null ? Math.max(0, gp.baseline - gp.current).toLocaleString() : '0') + ' of it is.';
    } else if (t === 'maintenance') {
      want = 'You are holding <b class="msn__c">' + E(shape.star) + '</b>.';
    } else if (t === 'frequency') {
      want = 'You keep <b class="msn__c">' + (shape.cadence === 7 ? 'this every day' : shape.cadence + ' a week') + '</b>: ' + E(shape.star) + '.';
    } else if (t === 'milestone') {
      want = 'You are headed for <b class="msn__c">' + E(shape.star) + '</b>.';
    } else {
      want = 'You are becoming <b class="msn__c">' + E(shape.star) + '</b>.';
    }
    let mid;
    if (!move) mid = '';
    else if (done) mid = ' Today you did the one thing: <b>' + E(move) + '</b>. The mark is made.';
    else mid = ' Today asks one thing: <b>' + E(move) + '</b>.';
    const days = d.dayN <= 0
      ? ' Today is day 1. Let&rsquo;s begin.'
      : ' You have shown up <b class="msn__k">' + d.markedDays + ' of the ' + (d.dayN + 1) + ' days</b>.';
    return '<p class="msn">' + want + mid + days + '</p>';
  } catch (e) { return ''; }
}

function _mfFmtD(dt, o) {
  try {
    // a date from another year always says so; "August 12" a year later lies
    if (!o && dt.getFullYear() !== new Date().getFullYear()) o = { month: 'long', day: 'numeric', year: 'numeric' };
    return dt.toLocaleDateString('en-US', o || { month: 'long', day: 'numeric' });
  } catch (e) { return ''; }
}

// the whole inside column, from state. Everything renders from day zero.
function _mfInsideHtml(d, trailHtml) {
  const E = esc;
  const star = String((state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) || '').trim();
  const M_PATH = '<path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/>';
  const bornFull = _mfFmtD(d.born, { month: 'long', day: 'numeric', year: 'numeric' });
  const bornShort = _mfFmtD(d.born);
  const bornTime = (function () { try { return d.born.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } })();

  /* header: the small mark, the name, the countdown, the promise bare */
  let h = '<header class="in-head">' +
    '<svg class="in-mark" viewBox="0 0 512 512" aria-hidden="true">' + M_PATH + '</svg>' +
    '<p class="in-title">Your Memento</p>' +
    (d.moriEnd ? '<p class="in-count apl-num" id="mfMori">&nbsp;</p>' : '') +
    (star ? '<p class="in-vowline">&ldquo;' + E(star) + '&rdquo;<span>promised ' + E(bornShort) + '</span></p>' : '') +
    '</header>';

  h += _mfMissionHtml(d);

  /* ── PROGRESS SO FAR ─────────────────────────────────────────────── */
  h += '<h2 class="in-flowh">Progress so far</h2>';

  h += '<div class="cpick"><div class="tsc">' +
    '<div class="tsc__n apl-num">' + d.dayN + '</div>' +
    '<div class="tsc__c">days since creation</div>' +
    '<div class="tsc__l">and <span id="mfUpLive" class="apl-num"></span></div>' +
    '</div></div>';

  h += '<div class="cpick"><div class="vol-total">' +
    '<div class="vol-total__n apl-num">' + d.marks + '</div>' +
    '<div class="vol-total__cap">total marks on the record</div>' +
    '<div class="vol-total__rows">' +
    '<div class="vol-total__row"><span>Actions completed</span><b>' + d.acts + '</b></div>' +
    '<div class="vol-total__row"><span>Deep work sessions</span><b>' + d.deep + '</b></div>' +
    '<div class="vol-total__row"><span>Notes and reflections</span><b>' + d.notes + '</b></div>' +
    '</div></div></div>';

  const deepH = d.deepMin >= 60 ? (Math.round(d.deepMin / 6) / 10) + ' hours' : d.deepMin + ' min';
  h += '<div class="cpick"><div class="vol-deep">' +
    '<div class="vol-deep__n">' + (d.deep ? deepH : '0 hours') + '</div>' +
    '<div class="vol-deep__cap">of deep work</div>' +
    '<div class="vol-deep__bar" aria-hidden="true"></div>' +
    '<div class="vol-deep__raw">' + (d.deep ? d.deep + ' session' + (d.deep === 1 ? '' : 's') : 'No sessions yet') + '</div>' +
    '</div></div>';

  /* Records. "Not set yet." until a record exists (the day-zero law). */
  const rec = (k, v, b) => '<div class="rec-board__r"><div class="rec-board__a"><span>' + k + '</span><b>' + v + '</b></div><div class="rec-board__b">' + b + '</div></div>';
  h += '<div class="cpick"><div class="rec-board"><div class="rec-board__t">Records</div>' +
    (d.longest > 0
      ? rec('Longest run', d.longest + ' day' + (d.longest === 1 ? '' : 's'),
        (d.longestEnd ? 'Set ' + E(_mfFmtD(d.longestEnd)) + '. ' : '') + (d.runNow >= d.longest ? 'Standing now, still running.' : 'Standing ' + d.longestStanding + ' days.'))
      : rec('Longest run', 'Not set yet', 'The first kept day starts it.')) +
    (d.bestWeek
      ? rec('Best week', d.bestWeek.kept + ' of 7', 'Week of ' + E(_mfFmtD(d.bestWeek.start)) + '.')
      : rec('Best week', 'Not set yet', 'A full week has to pass first.')) +
    (d.biggestDay
      ? rec('Biggest day', d.biggestDay.n + ' mark' + (d.biggestDay.n === 1 ? '' : 's'), E(_mfFmtD(new Date(d.biggestDay.iso + 'T12:00:00'))) + '.')
      : rec('Biggest day', 'Not set yet', 'The first mark takes it.')) +
    (d.firstEv
      ? rec('First mark', 'day 1', E(_mfFmtD(new Date(d.firstEv.ts))) + (d.firstEv.histOnly ? '' : ', ' + E(new Date(d.firstEv.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))) + '. Everything descends from it.')
      : rec('First mark', 'Not made yet', 'Tonight, maybe.')) +
    rec('Comebacks', String(d.comebacks), d.comebacks === 0 ? 'No gaps yet, or none closed.' : d.comebacks + ' gap' + (d.comebacks === 1 ? '' : 's') + ' opened and closed.') +
    '</div></div>';

  h += '<div class="cpick"><div class="rec-hold">' +
    '<svg class="rec-hold__m" viewBox="0 0 512 512" aria-hidden="true">' + M_PATH + '</svg>' +
    '<div class="rec-hold__num apl-num">' + d.longest + '</div>' +
    '<div class="rec-hold__unit">' + (d.longest > 0 ? 'day' + (d.longest === 1 ? '' : 's') + ' in a row. Your longest, ever.' : 'days in a row. The record waits for its first day.') + '</div>' +
    '<div class="rec-hold__rule"></div>' +
    '<div class="rec-hold__meta">' +
    '<span>' + (d.longestStart ? E(_mfFmtD(d.longestStart)) + ' to ' + E(_mfFmtD(d.longestEnd, { month: 'long', day: 'numeric', year: 'numeric' })) : 'not started') + '</span>' +
    '<span>' + (d.longest > 0 ? (d.runNow >= d.longest ? 'still running' : 'standing ' + d.longestStanding + ' days') : '') + '</span>' +
    '</div></div></div>';

  /* the wall: every day one cell, returns lit green */
  h += '<div class="cpick"><div class="cmb-wall">' +
    '<p class="cmb-wall__h">Comebacks</p>' +
    '<div class="cmb-wall__grid">' + d.wallDays.map(w => '<i class="cmb-wall__c ' + w.k + '"></i>').join('') + '</div>' +
    '<div class="cmb-wall__legend">' +
    '<span><i class="is-on"></i>' + d.markedDays + ' marked</span>' +
    '<span><i class="is-back"></i>' + d.backDays + ' back</span>' +
    '<span><i class="is-off"></i>' + d.blankDays + ' blank</span>' +
    '</div>' +
    '<p class="cmb-wall__f">' + (d.longest > 0 && d.longestStart
      ? 'Your longest run, ' + d.longest + ' days in ' + E(_mfFmtD(d.longestStart, { month: 'long' })) + ', lives on this wall.'
      : 'Every day gets a cell. The marked ones are yours.') + '</p>' +
    '</div></div>';

  /* the weeks, as bars */
  const wk = d.weeks.slice(-26);
  const wmax = 7;
  h += '<div class="cpick"><div class="rec-months"><div class="rec-months__t">Every week so far</div>' +
    '<div class="rec-months__chart">' + (wk.length ? wk.map((w, i) => {
      const hpct = Math.max(6, Math.round(w.kept / wmax * 100));
      const cls = (i === wk.length - 1 ? ' class="now"' : (d.bestWeek && w.start.getTime() === d.bestWeek.start.getTime() ? ' class="top"' : (w.kept <= 2 && w.len === 7 ? ' class="low"' : '')));
      return '<span style="height:' + hpct + '%"' + cls + '></span>';
    }).join('') : '<span style="height:6%" class="now"></span>') + '</div>' +
    '<div class="rec-months__ax">' + (wk.length > 1
      ? '<i>' + E(_mfFmtD(wk[0].start)) + '</i><i>' + E(_mfFmtD(wk[wk.length - 1].start)) + '</i>'
      : '<i>' + E(bornShort) + '</i><i>now</i>') + '</div>' +
    '<div class="rec-months__c">' + (d.bestWeek
      ? 'Week of ' + E(_mfFmtD(d.bestWeek.start)) + ' was ' + d.bestWeek.kept + ' of 7, the best so far. This week is still running.'
      : 'Week one is still running.') + '</div></div></div>';

  /* ── MORI ─────────────────────────────────────────────────────────── */
  h += '<h2 class="in-flowh in-flowh--sub" data-sub="Remember, you will die.">Mori</h2>';

  if (d.moriEnd) {
    h += '<div class="cpick"><div class="amb-weeks">' +
      '<canvas class="amb-weeks__cv" width="652" height="' + (Math.ceil(d.weeksTotal / 100) * 7 + 6) + '"></canvas>' +
      '<div class="amb-weeks__rows">' +
      '<div class="amb-weeks__r"><b class="apl-num">' + d.weeksLived.toLocaleString() + '</b><span>weeks behind you</span></div>' +
      '<div class="amb-weeks__r"><b class="amb-weeks__g apl-num">' + d.weeksOnPath + '</b><span>of them went into this</span></div>' +
      '<div class="amb-weeks__r"><b class="apl-num">' + Math.max(0, d.weeksTotal - d.weeksLived).toLocaleString() + '</b><span>left, if the guess of ' + d.exp + ' years holds</span></div>' +
      '</div>' +
      '<p class="amb-weeks__p">Each dot is one week. The white one is this week.</p>' +
      '</div></div>';
    const left = d.daysLeft;
    h += '<div class="cpick"><div class="mor-remaining">' +
      '<p class="mor-remaining__t">What is left, counted six ways.</p>' +
      '<div class="mor-remaining__r"><span>Days</span><b class="apl-num">' + left.toLocaleString() + '</b></div>' +
      '<div class="mor-remaining__r"><span>Weeks</span><b class="apl-num">' + Math.floor(left / 7).toLocaleString() + '</b></div>' +
      '<div class="mor-remaining__r"><span>Months</span><b class="apl-num">' + Math.floor(left / 30.44).toLocaleString() + '</b></div>' +
      '<div class="mor-remaining__r"><span>Saturdays</span><b class="apl-num">' + Math.floor(left / 7).toLocaleString() + '</b></div>' +
      '<div class="mor-remaining__r"><span>Summers</span><b class="apl-num">' + Math.floor(left / 365.25).toLocaleString() + '</b></div>' +
      '<div class="mor-remaining__r"><span>Birthdays</span><b class="apl-num">' + Math.ceil(left / 365.25).toLocaleString() + '</b></div>' +
      '<p class="mor-remaining__f">One assumption, ' + d.exp + ' years. Change it and every row moves.</p>' +
      '</div></div>';
  } else {
    /* the day-zero law: the box exists, asking for the one number it needs */
    h += '<div class="cpick"><div class="mor-remaining">' +
      '<p class="mor-remaining__t">What is left, counted six ways.</p>' +
      ['Days', 'Weeks', 'Months', 'Saturdays', 'Summers', 'Birthdays'].map(k =>
        '<div class="mor-remaining__r"><span>' + k + '</span><b>&middot;&middot;&middot;</b></div>').join('') +
      '<p class="mor-remaining__f">Set your birthday in Mori and every row fills in.</p>' +
      '</div></div>';
  }

  /* the last-time counter renders ONLY with real data, never placeholders */

  h += '<div class="cpick"><div class="mor-oneday">' +
    '<p class="mor-oneday__t">Today, hour by hour.</p>' +
    '<div class="mor-oneday__row" id="mfOnedayRow">' + new Array(24).fill('<i></i>').join('') + '</div>' +
    '<p class="mor-oneday__f"><span id="mfOnedayGone">0</span> hours gone, <span id="mfOnedayLeft">24</span> to go.' + (d.moriEnd ? ' This is one of the ' + d.daysLeft.toLocaleString() + '.' : '') + '</p>' +
    '</div></div>';

  h += '<p class="in-exline">Most of these days you will not remember. The marked ones get to stay.</p>';

  /* ── VIVERE ───────────────────────────────────────────────────────── */
  h += '<h2 class="in-flowh in-flowh--sub" data-sub="Remember, to live.">Vivere</h2>';
  h += '<p class="in-exline">You cannot make a wrong mark on a canvas headed for the void. So make the painting beautiful.</p>';

  const dream = String((state.clarity && state.clarity.answers && state.clarity.answers.futureVision) || '').trim();
  h += '<div class="viv-dream">' +
    (dream ? '<p class="viv-dream__q">&ldquo;' + E(dream) + '&rdquo;</p>' +
      '<p class="viv-dream__d">The dream, written ' + E(bornFull) + '</p>'
      : '<p class="viv-dream__q">The dream is not written yet.</p>' +
      '<p class="viv-dream__d">Clarity writes it with you.</p>') +
    (star ? '<p class="viv-dream__g">' + E(star) + '. Signed the same morning.</p>' : '') +
    '</div>';

  /* the promise thread, at true length */
  const gp = state.goalProgress || {};
  const shape2 = (typeof ccGoalShape === 'function') ? ccGoalShape() : null;
  const thrS = 'open, signed ' + bornShort + ', day ' + Math.max(1, d.dayN + 1) +
    (shape2 && shape2.target !== null && gp.current !== null && gp.current !== undefined ? ', at ' + gp.current.toLocaleString() + ' of ' + shape2.target.toLocaleString() : '');
  if (star) {
    h += '<div class="cpick"><div class="amb-threads"><div class="amb-threads__t">' +
      '<div class="amb-threads__l">' + E(star) + '</div>' +
      '<div class="amb-threads__bar" style="width:100%"><i></i></div>' +
      '<div class="amb-threads__s">' + E(thrS) + '</div>' +
      '</div></div></div>';
  }

  /* first line vs latest line */
  if (d.firstLine) {
    const f = d.firstLine, l = d.lastLine;
    h += '<div class="cpick"><div class="wrd-span">' +
      '<div class="wrd-span__row">' +
      '<div class="wrd-span__meta">' + E(_mfFmtD(new Date(f.ts), { day: 'numeric', month: 'long', year: 'numeric' })) + '. The first thing you wrote.</div>' +
      '<p class="wrd-span__q">' + E(String(f.text).slice(0, 200)) + '</p></div>' +
      (l ? '<div class="wrd-span__gap"><i></i><span>' + Math.max(1, Math.round((l.ts - f.ts) / 86400000)) + ' days</span><i></i></div>' +
        '<div class="wrd-span__row">' +
        '<div class="wrd-span__meta">' + E(_mfFmtD(new Date(l.ts), { day: 'numeric', month: 'long' })) + '. The latest.</div>' +
        '<p class="wrd-span__q">' + E(String(l.text).slice(0, 200)) + '</p></div>' : '') +
      '</div></div>';
  } else {
    h += '<div class="cpick"><div class="wrd-span"><div class="wrd-span__row">' +
      '<div class="wrd-span__meta">Nothing written yet.</div>' +
      '<p class="wrd-span__q">The first line becomes part of the record the night you write it.</p>' +
      '</div></div></div>';
  }

  /* the hardest days, their own words */
  if (d.hardest.length) {
    h += '<div class="cpick"><div class="wrd-hardest">' +
      '<div class="wrd-hardest__head">You have written on ' + (d.hardest.length === 1 ? 'a day you wanted to stop. It is here.' : d.hardest.length + ' days you wanted to stop. They are here.') + '</div>' +
      '<ol class="wrd-hardest__list">' + d.hardest.map(e =>
        '<li class="wrd-hardest__item"><div class="wrd-hardest__date">' + E(_mfFmtD(new Date(e.ts), { day: 'numeric', month: 'long', year: 'numeric' })) + '</div>' +
        '<p class="wrd-hardest__q">' + E(String(e.text).slice(0, 160)) + '</p></li>').join('') +
      '</ol></div></div>';
  }

  /* THE NOTES GLANCE (Malik, 2026-08-19). The card's old editable wall is
     gone: its entries migrated into state.clarityNotes (js/02
     clarityNotesMigrateV1) and writing lives in Clarity page 3 now. What
     stays here is the second window on the same store, read-only: the latest
     note, and a way back to the whole stack. state.wall itself is untouched
     in storage, it is simply no longer rendered or written. */
  const cnLive = (typeof clarityNotesLive === 'function') ? clarityNotesLive() : [];
  const cnLatest = (typeof clarityNotesLatest === 'function') ? clarityNotesLatest() : null;
  if (cnLatest) {
    const cnTag = (typeof clarityNoteTag === 'function') ? clarityNoteTag(cnLatest) : 'A note';
    h += '<div class="cn-glance" id="mfNotesGlance" role="button" tabindex="0">' +
      '<div class="cn-glance__lab">Latest reflection</div>' +
      '<p class="cn-glance__txt">' + E(String(cnLatest.text || '').slice(0, 300)) + '</p>' +
      '<div class="cn-glance__more">' +
        (cnLive.length > 1 ? 'Read all ' + cnLive.length : 'Open your reflections') + ' &rarr;</div>' +
      '</div>';
  } else {
    h += '<div class="cn-glance cn-glance--empty" id="mfNotesGlance" role="button" tabindex="0">' +
      '<div class="cn-glance__lab">Reflections</div>' +
      '<p class="cn-glance__txt">Nothing here yet. Clarity is where you leave one.</p>' +
      '<div class="cn-glance__more">Open your reflections &rarr;</div>' +
      '</div>';
  }

  /* THE SEAL */
  const seal = (state.seal && typeof state.seal === 'object') ? state.seal : null;
  const LOCK = '<svg class="seal-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path class="seal-shackle" d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  if (seal && seal.sealedAt && seal.text) {
    h += '<div class="in-seal is-locked" id="mfSeal">' +
      '<div class="in-seal__hd">' + LOCK + '<span>Sealed ' + E(_mfFmtD(new Date(seal.sealedAt))) + ', after your first action</span></div>' +
      '<div class="seal-shut">' +
      '<p class="seal-shut__l">The note you wrote after your first action.</p>' +
      '<button class="seal-hold" id="mfSealHold" type="button"><span class="seal-hold__fill"></span><span class="seal-hold__t">Hold to open</span></button>' +
      '</div>' +
      '<div class="seal-open">' +
      String(seal.text).split(/\n+/).slice(0, 6).map(p => '<p class="in-seal__b">' + E(p.slice(0, 400)) + '</p>').join('') +
      '<p class="in-seal__sign">you, at the start</p>' +
      '</div></div>';
  } else if (d.marks === 0) {
    h += '<div class="in-seal" id="mfSeal">' +
      '<div class="in-seal__hd">' + LOCK + '<span>Unsealed, until tonight</span></div>' +
      '<p class="in-seal__b">Tonight, after your first action, you write one note to the person you are doing this for. It seals, and it never changes again.</p>' +
      '<p class="in-seal__b">Some day you will need proof that you once wanted this badly. This is where the proof will live.</p>' +
      '</div>';
  } else {
    h += '<div class="in-seal" id="mfSeal">' +
      '<div class="in-seal__hd">' + LOCK + '<span>Unsealed</span></div>' +
      '<p class="in-seal__b">One note to the person you are doing this for, written once, sealed forever. Opened only by a held finger, on the nights it is needed.</p>' +
      '<div class="seal-write" id="mfSealWrite">' +
      '<textarea id="mfSealText" rows="4" maxlength="900" placeholder="To the one reading this on a bad night..."></textarea>' +
      '<button class="seal-hold" id="mfSealCommit" type="button"><span class="seal-hold__t">Seal it, forever</span></button>' +
      '</div></div>';
  }

  /* the plaque (mf-origin class kept: the skins hint anchors to it) */
  h += '<div class="in-org mf-origin">' +
    '<span class="in-org__k">Creation of Your Memento</span>' +
    '<span class="in-org__d">' + E(bornFull) + '</span>' +
    '<span class="in-org__t">' + E(bornTime) + '</span>' +
    '</div>';

  /* THE RECORD DOOR: the full month-by-month trail, one tap below the plaque */
  h += '<button class="in-door" id="mfDoor" type="button" aria-expanded="false">The full record' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>' +
    '<div class="in-doorb" id="mfDoorB" hidden><div class="mf-trail" id="mfTrail">' + trailHtml + '</div></div>';

  /* the foot: a barcode grown from their own numbers */
  h += '<div class="in-foot">' +
    '<div class="in-code" id="mfCode" aria-hidden="true"></div>' +
    '<p class="in-digits apl-num">' + String(Math.max(0, d.dayN)).padStart(4, '0') + ' / ' + String(d.marks).padStart(4, '0') + '</p>' +
    '<p class="in-policy">Get the most out of your existence.</p>' +
    '</div>';

  return '<div class="in-col">' + h + '</div>';
}

// behaviors owned by the record; every listener rides the view's abort signal
function _mfInsideWire(ov, d, sig) {
  const on = (el, ev, fn, opt) => { if (el) el.addEventListener(ev, fn, sig ? Object.assign({}, opt || {}, sig) : opt); };

  // back chevron reverses the dive
  on(ov.querySelector('.in-back'), 'click', () => { try { MementoView.close(); } catch (e) {} });

  // (the rim and its close-at-the-bottom moment were removed in v1154)

  // the up-clock under days-since-creation
  const up = ov.querySelector('#mfUpLive');
  if (up) {
    const t0 = d.creationAt;
    const paint = () => {
      const e = Math.max(0, Math.floor((Date.now() - t0) / 1000)) % 86400;
      up.textContent = Math.floor(e / 3600) + 'h ' + Math.floor(e % 3600 / 60) + 'm ' + (e % 60) + 's';
    };
    paint();
    const iv = setInterval(paint, 1000);
    if (sig && sig.signal) sig.signal.addEventListener('abort', () => clearInterval(iv));
  }

  // today, hour by hour
  (function () {
    const row = ov.querySelector('#mfOnedayRow');
    if (!row) return;
    const gone = ov.querySelector('#mfOnedayGone'), left = ov.querySelector('#mfOnedayLeft');
    const paint = () => {
      const hh = new Date().getHours();
      for (let i = 0; i < row.children.length; i++) {
        row.children[i].className = i < hh ? 'mor-oneday__on' : (i === hh ? 'mor-oneday__now' : '');
      }
      if (gone) gone.textContent = String(hh);
      if (left) left.textContent = String(24 - hh);
    };
    paint();
    const iv = setInterval(paint, 30000);
    if (sig && sig.signal) sig.signal.addEventListener('abort', () => clearInterval(iv));
  })();

  // the life-in-weeks canvas: lived dim, on-the-path green, this week white
  (function () {
    const c = ov.querySelector('.amb-weeks__cv');
    if (!c || !c.getContext || !d.moriEnd) return;
    const g = c.getContext('2d');
    const COLS = 100, TOT = d.weeksTotal, LIV = d.weeksLived, PATH = d.weeksOnPath;
    const P = 6.52, S = 5.2;
    c.height = Math.ceil(TOT / COLS) * P + 4;
    g.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < TOT; i++) {
      const x = (i % COLS) * P, y = ((i / COLS) | 0) * P;
      let f;
      if (i < LIV - PATH) f = 'rgba(238,241,247,.20)';
      else if (i < LIV - 1) f = 'rgba(63,217,78,.72)';
      else if (i === LIV - 1) f = 'rgba(245,246,250,.97)';
      else f = 'rgba(255,255,255,.055)';
      g.fillStyle = f;
      g.fillRect(x, y, S, S);
    }
  })();

  // the barcode: bars grown deterministically from their own numbers
  (function () {
    const code = ov.querySelector('#mfCode');
    if (!code) return;
    let seed = (d.creationAt % 2147483647) ^ (d.marks * 2654435761) ^ (d.dayN * 40503);
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    let bars = '';
    for (let i = 0; i < 26; i++) {
      bars += '<i style="width:' + (rnd() < 0.3 ? 4 : 2) + 'px;opacity:' + (0.5 + rnd() * 0.5).toFixed(2) + '"></i>';
    }
    code.innerHTML = bars;
  })();

  // the notes glance: read-only, and it taps through to the whole stack in
  // Clarity page 3 (the resume carve-out: an intentional tap may deep link).
  // The record closes first so Clarity does not open behind a card in flight.
  (function () {
    const g = ov.querySelector('#mfNotesGlance');
    if (!g) return;
    const go = () => {
      try { MementoView.close(); } catch (e) {}
      setTimeout(() => {
        try { if (typeof clarityOpenNotesPage === 'function') clarityOpenNotesPage(); } catch (e) {}
      }, 480);
    };
    on(g, 'click', go);
    on(g, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  })();

  _mfSealWire(ov, d, sig);

  // the record door
  const door = ov.querySelector('#mfDoor'), doorB = ov.querySelector('#mfDoorB');
  wireDoor(door, doorB, on);
}

function wireDoor(door, doorB, on) {
  if (!door || !doorB || door.dataset.wired) return;
  door.dataset.wired = '1';
  on(door, 'click', () => {
    const open = doorB.hidden;
    doorB.hidden = !open;
    door.setAttribute('aria-expanded', open ? 'true' : 'false');
    door.classList.toggle('is-open', open);
  });
}

// the seal's own wiring, callable alone so sealing can swap the block live
function _mfSealWire(ov, d, sig) {
  const on = (el, ev, fn, opt) => { if (el) el.addEventListener(ev, fn, sig ? Object.assign({}, opt || {}, sig) : opt); };
  const seal = ov.querySelector('#mfSeal');
  if (!seal || seal.dataset.wired) return;
  seal.dataset.wired = '1';
  const hold = ov.querySelector('#mfSealHold');
  if (hold) {
    let t = null;
    const start = (e) => {
      if (e.cancelable) e.preventDefault();
      hold.classList.add('is-holding');
      t = setTimeout(() => { seal.classList.remove('is-locked'); seal.classList.add('is-open'); }, 1150);
    };
    const stop = () => { clearTimeout(t); hold.classList.remove('is-holding'); };
    ['pointerdown', 'touchstart'].forEach(ev => on(hold, ev, start, { passive: false }));
    ['pointerup', 'pointercancel', 'pointerleave', 'touchend', 'touchcancel'].forEach(ev => on(hold, ev, stop));
  }
  const commit = ov.querySelector('#mfSealCommit');
  if (commit) on(commit, 'click', () => {
    try {
      const ta = ov.querySelector('#mfSealText');
      const txt = String((ta && ta.value) || '').trim();
      if (txt.length < 3) return;
      state.seal = { text: txt.slice(0, 900), sealedAt: Date.now() };
      persistNow();
      const tmp = document.createElement('div');
      tmp.innerHTML = _mfInsideHtml(d, '');
      const fresh = tmp.querySelector('#mfSeal');
      if (fresh) { seal.replaceWith(fresh); _mfSealWire(ov, d, sig); }
    } catch (e) {}
  });
}

function _mfBuildOverlay() {
  // v1138 (Malik): no 'arrival' chime on opening the Memento. Tapping your
  // own card is not an event that needs announcing, and it fires every time.
  try {
    // Refresh the :root --aura-* vars so the full view's background reflects the
    // user's latest state the instant it opens (the home no longer shows them).
    try { setAtmosphereVars(); } catch (e) {}
    // v1120 THE MEMENTO VIEW (Malik's mockup, ported): the screen is the
    // person's own evidence and nothing else. Countdown, their note, three
    // counters, the month-collapsed trail, the origin. No explainer copy (two
    // explainer blocks were built and killed in the mockup rounds).
    // v1151: ONE derivation pass feeds the whole page (MEMENTO-PAGE-SPEC.md)
    const d = _mfDerive();
    const moriEnd = d.moriEnd;
    const evs = Array.isArray(state.proofEvents) ? state.proofEvents.slice() : [];
    // (the old private Mori note used to be copied into the card's wall here.
    // The wall is gone: js/02's clarityNotesMigrateV1 now carries both it and
    // the wall's own entries into state.clarityNotes, once, at boot. The
    // source field survives untouched for Mori's sheet.)
    // THE TRAIL: every event the app has written, grouped by month, newest
    // month open. A closed month is one row that still carries its weight (a
    // dot per mark + the count); only the open month renders its list, which
    // is what keeps a two-year record at ~24 rows (do not flatten this back).
    const dotK = (t) => t === 'action-complete' ? 'is-act' : (t === 'new-record' || t === 'proof') ? 'is-mark' : (t === 'mori-moment') ? 'is-clar' : '';
    const evTitle = (e2) => e2.title || ({ 'action-complete': 'The move for the day', 'reflection-save': 'Reflection', 'vivere': 'Lived', 'mori-moment': 'Memento Mori', 'weekly-review': 'Weekly review', 'new-record': 'New record', 'distraction-log': 'Distraction logged', 'deepwork-commit': 'Deep work' }[e2.type] || 'Kept');
    const _wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // v1136: the retired 'N day record' events (one per day past the old best)
    // are hidden here too, so an existing user's trail stops being a wall of
    // applause. The Path view has filtered them since it was built.
    const _evs = evs.filter(e2 => e2 && e2.type !== 'new-record');
    evs.length = 0; Array.prototype.push.apply(evs, _evs);
    evs.sort((a2, b2) => (b2.ts || 0) - (a2.ts || 0));
    const groups = [];
    const nowY = new Date().getFullYear();
    evs.forEach((e2) => {
      const d2 = new Date(e2.ts || Date.parse(e2.iso) || Date.now());
      const key = d2.getFullYear() + '-' + d2.getMonth();
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) {
        g = { key: key, label: d2.toLocaleDateString('en-US', { month: 'long' }) + (d2.getFullYear() !== nowY ? ' ' + d2.getFullYear() : ''), evs: [] };
        groups.push(g);
      }
      g.evs.push({ k: dotK(e2.type), t: evTitle(e2), m: String(e2.text || '').slice(0, 140), d: _wk[d2.getDay()] + ' ' + d2.getDate() });
    });
    const evRow = (e2) =>
      '<div class="mf-ev"><span class="mf-ev__dot ' + e2.k + '"></span>' +
        '<span class="mf-ev__b"><span class="mf-ev__t">' + esc(e2.t) + '</span>' +
        (e2.m ? '<span class="mf-ev__m">' + esc(e2.m) + '</span>' : '') + '</span>' +
        '<span class="mf-ev__d">' + esc(e2.d) + '</span></div>';
    const trailHtml = groups.map((g, i) =>
      '<section class="mf-mo' + (i === 0 ? ' is-open' : '') + '">' +
        '<button class="mf-mo__h" type="button">' +
          '<span class="mf-mo__n">' + esc(g.label) + '</span>' +
          '<span class="mf-mo__dots">' + g.evs.map(e2 => '<i class="mf-mo__dot ' + e2.k + '"></i>').join('') + '</span>' +
          '<span class="mf-mo__c apl-num">' + g.evs.length + '</span>' +
          '<svg class="mf-mo__x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="mf-mo__b">' + g.evs.map(evRow).join('') + '</div>' +
      '</section>').join('');

    const ov = document.createElement('div');
    ov.id = 'mementoFull';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Your Memento');
    // v1151: the inside page (three movements + seal + plaque + door + foot);
    // the trail lives behind the record door now.
    // (v1154, Malik: the rim is GONE. Only the colour-matched room remains.)
    ov.innerHTML =
      '<div class="mf__bg" aria-hidden="true"></div>' +
      '<button class="in-back" type="button" aria-label="Back out of the card">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<div class="mf__scroll">' + _mfInsideHtml(d, trailHtml) + '</div>';
    // v1139: the record lives INSIDE .app, not on the body. #app is a stacking
    // context (position:relative; z-index:1), so a card left in the home can
    // never paint above a body-level overlay no matter its z-index. Same
    // context = the card can sit above the record without being moved.
    // (mounting is the controller's job, once, in MementoView._ensure)

    // LITERALLY do not touch the Memento. Instead of cloning it, MOVE the real
    // living card element into this view and animate only the background + stats
    // around it. It is the same DOM node, still running its own light loop, so it
    // never cross-fades, jumps, or freezes. We hold the home card's grid cell open
    // (min-height) so the page behind does not reflow while the card is borrowed,
    // pin its size inline (the home's size CSS does not reach it out here), and land
    // it on its exact on-home position so it does not move a pixel. close() puts it
    // back. All wrapped so the card is always restorable.
    // v1132 THE ACCUMULATING GLITCH: the tap and hold listeners are bound to
    // the REAL card, which goes back to the home when the view closes. They
    // were never removed, so every open left another set behind: pressing the
    // home card scaled it (is-pressing) with nothing to open, closes fired on
    // a dead overlay, and it compounded with each visit. One abort signal now
    // owns every listener this view creates.
    // (These live HERE, above the morph that assigns morphT: declaring them
    // lower threw 'cannot access before initialization' on every open, which
    // the outer catch swallowed and left the view half-wired.)
    const viewAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const sig = viewAbort ? { signal: viewAbort.signal } : undefined;
    let morphT = null;
    const dayCardEl = document.getElementById('dayCard');
    const liveWrap = dayCardEl ? dayCardEl.querySelector('.daycard-wrap') : null;

    // Commit the initial state with a forced reflow, then flip to open so the bg +
    // stats transitions play. rAF gets throttled when the tab is backgrounded, which
    // can leave the overlay stuck; a sync reflow never stalls.
    // v1133 (Malik): the origin plaque must STICK OUT against whatever room
    // the material makes. A bright material lights the room, so the plaque
    // stays black with white text. A dark material leaves a dark room, so the
    // plaque flips to white with black text. Read from the same tint the room
    // itself is painted with.
    try {
      const sk0 = activeCardSkin();
      const tint = sk0 ? skinTintRgb(sk0)
        : '168,186,212'; // v1153: the house card's room is its own cool steel, not the accent (Malik: the pools looked mismatched)
      // The ROOM is not the tint: it is the tint laid over the near-black
      // chamber at ~22% (the strongest pool in .mf__bg). Judge the blend, not
      // the paint in the tin. Cyan looks bright on its own and still leaves a
      // dark room, which is exactly the case that fooled the first attempt.
      const p3 = String(tint).split(',').map(n => parseFloat(n) || 0);
      const A = 0.22, BASE = [6, 7, 11];
      const mix = [0, 1, 2].map(i => (p3[i] || 0) * A + BASE[i] * (1 - A));
      const lum = 0.299 * mix[0] + 0.587 * mix[1] + 0.114 * mix[2];
      // Judge the ROOM and nothing else. (A 'bright material floods the room'
      // exception was tried and dropped: it fired on a bright ACCENT with the
      // house card, whose room is still dark, and would have put a black
      // plaque on a black room, the exact bug being fixed. With today's
      // materials every room measures 6-62, so the plaque is white; the rule
      // flips itself the day a genuinely light room exists.)
      ov.dataset.room = lum > 128 ? 'light' : 'dark';
      // (the rim's skin tint is applyCardSkin's job, set globally on :root,
      // so a skin change recolours an open record live)
    } catch (e) { ov.dataset.room = 'dark'; }

    // the countdown ticks, because a number that moves is the whole argument
    let mfTick = null;
    let startTick = () => {};
    let stopTick = () => {};
    const moriEl = ov.querySelector('#mfMori');
    if (moriEl && moriEnd) {
      const p2 = (n) => String(n).padStart(2, '0');
      const tick = () => {
        const ms = Math.max(0, moriEnd - Date.now());
        const rest = ms % 86400000;
        moriEl.textContent = Math.floor(ms / 86400000) + ':' + p2(Math.floor(rest / 3600000)) + ':' + p2(Math.floor(rest % 3600000 / 60000)) + ':' + p2(Math.floor(rest % 60000 / 1000));
      };
      tick();
      // v1140: the record is now mounted once and merely shown/hidden, so the
      // timer must follow visibility. A 1s interval left running behind a
      // hidden overlay is pure battery for a number nobody can see.
      startTick = () => { if (mfTick) return; tick(); mfTick = setInterval(tick, 1000); };
      stopTick = () => { if (mfTick) { clearInterval(mfTick); mfTick = null; } };
    }
    // (the old editable private note is gone from this view: it migrated into
    // the Vivere wall above, per the spec's rip list)
    // a month opens and closes in place
    const trailEl = ov.querySelector('#mfTrail');
    if (trailEl) trailEl.addEventListener('click', (e) => {
      const h2 = e.target.closest('.mf-mo__h');
      if (h2) h2.parentElement.classList.toggle('is-open');
    });

    // every close path in here is the controller's single close
    const close = () => { try { MementoView.close(); } catch (e) {} };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    // v1144 (Malik: "a glitch when I can't even open the memento"): the record
    // used to bind its OWN tap-to-close to the live card here. That was safe
    // while the record was built per visit, but it is persistent now, so the
    // listener survived on the home: a quick tap fired the home's toggle AND
    // this close, they cancelled, and the Memento would not open. The home's
    // single toggle handler owns both directions. Nothing to bind here.
    // (The v1120 pagehide RESTORE failsafe is gone with the borrow it guarded:
    // the card never leaves the home now, so a killed page cannot strand it.)
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    // iOS-like swipe-down-to-close: pull the card view down (when scrolled to the
    // top) and it follows the finger, then flicks away or springs back.
    (function bindMfSwipe() {
      const scroll = ov.querySelector('.mf__scroll');
      if (!scroll) return;
      let startY = 0, startX = 0, dy = 0, t0 = 0, active = false, decided = false, engaged = false;
      scroll.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        // a touch that starts on a control belongs to that control
        if (e.target && e.target.closest && e.target.closest('button, [contenteditable], .mfsk-wrap')) { active = false; return; }
        startY = e.touches[0].clientY; startX = e.touches[0].clientX; dy = 0; t0 = e.timeStamp || 0;
        active = true; decided = false; engaged = false;
      }, { passive: true });
      scroll.addEventListener('touchmove', (e) => {
        if (!active) return;
        const y = e.touches[0].clientY - startY;
        const x = e.touches[0].clientX - startX;
        if (!decided) {
          if (Math.abs(y) < 12) return;
          // v1125: read the REAL scroller. #mementoFull carries overflow-y,
          // not .mf__scroll, so scroll.scrollTop was always 0 and every
          // downward drag hijacked the page (Malik: the dates would not tap
          // and the whole thing felt cheap). Also require a clearly vertical
          // pull, so a diagonal never steals the gesture.
          engaged = y > 0 && ov.scrollTop <= 0 && Math.abs(y) > Math.abs(x) * 1.4;
          decided = true;
          if (!engaged) { active = false; return; }
        }
        dy = Math.max(0, y);
        scroll.style.transition = 'none';
        scroll.style.transform = 'translateY(' + dy + 'px)';
        // Keep the page fully opaque while dragging (do NOT reveal the dashboard
        // behind, that read as a choppy doubled card). The content just slides.
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      const onEnd = (e) => {
        if (!active) return;
        active = false;
        if (!engaged) return;
        const dt = ((e && e.timeStamp) || 0) - t0;
        const vel = dt > 0 ? dy / dt : 0;
        scroll.style.transition = '';
        scroll.style.transform = '';
        if (dy > 150 || vel > 0.55) close();
      };
      scroll.addEventListener('touchend', onEnd, { passive: true });
      scroll.addEventListener('touchcancel', onEnd, { passive: true });
    })();
    // Each pillar opens its full module.
    ov.querySelectorAll('[data-mf-open]').forEach((el) => {
      const go = () => {
        const k = el.getAttribute('data-mf-open');
        close();
        setTimeout(() => {
          try {
            if (k === 'clarity') { if (state.clarity && state.clarity.completed) ClarityExperience.openSummary(); else ClarityExperience.open(); }
            else if (k === 'action') { ActionExperience.open(); }
            else { Sheet.open(k); }
          } catch (e) {}
        }, 120);
      };
      el.addEventListener('click', go);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    try { _mfSkinsInit(ov, liveWrap, sig); } catch (e) {}
    try { _mfInsideWire(ov, d, sig); } catch (e) {}
    document.addEventListener('keydown', onKey, sig);
    return { ov: ov, abort: viewAbort, startTick: startTick, stopTick: stopTick };
  } catch (e) { return null; }
}

/* ══════════════════════════════════════════════════════════════════════
   v1140 MementoView, THE ONE OWNER OF THE HOME <-> RECORD TRANSITION.

   Every earlier version was a pair of functions that each did their own
   thing: open built and appended, close removed and rebuilt, and a tap
   during either left the two fighting. That is where every "it feels
   like a brand new memento", "it pops bigger before it settles" and
   "sometimes it just stops" came from.

   The rules, and they are not negotiable:
   1. ONE record AT A TIME, built on open and destroyed on close. It was
      made permanent in v1140 and that one decision caused four separate bugs
      (v1148): its listeners and its state kept living on the home, where they
      were never meant to run, and one of them jammed the card shut for good.
      Nothing that belongs to the record is allowed to outlive it. (The card
      itself is still never moved or rebuilt, which is what actually made it
      feel like "a brand new memento". That fix is untouched.)
   2. ONE animation on the card, created once, reversed in place. A tap
      mid-flight flips playbackRate, so it turns around from exactly
      where it is instead of restarting.
   3. desiredOpen is the ONLY truth. Everything else follows it.
   4. The card is never moved in the DOM, never resized by CSS, never
      re-parented. It gets a transform and nothing else, so the return
      is 0px off by construction (cancel() = the untransformed element).
   ══════════════════════════════════════════════════════════════════════ */
const MementoView = (function () {
  const DUR = 460;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  let view = null;          // the built record { ov, abort, startTick, stopTick }
  let phase = 'closed';     // closed | opening | open | closing
  let desiredOpen = false;
  let anim = null;          // THE animation, reused for both directions
  let openT = '';           // the open transform, recomputed only while idle
  let openScale = 1;        // its scale, needed to keep the scroll link 1:1
  let guard = null;         // the dead-man switch, see jump()

  const cardEl = () => document.getElementById('dayCard');

  /* The open pose, in real numbers.
     translate(dx,dy) scale(s) maps a point p to origin + s*(p-origin) + (dx,dy),
     so the translate has to pay for the origin term too. Leaving it out is why
     the card used to land a few pixels off and read as a "pop". */
  function measure() {
    const el = cardEl();
    if (!el) return false;
    const face = el.querySelector('.daycard-ns') || el.querySelector('.daycard-wrap') || el;
    const C = el.getBoundingClientRect();
    const N = face.getBoundingClientRect();
    if (!N.height || !C.height) return false;
    const cs = getComputedStyle(document.documentElement);
    const safeT = parseFloat(cs.getPropertyValue('--safe-t')) || 0;
    const top = safeT + 22;
    // Malik's call: the memento shrinks to about 30% of the screen.
    const targetH = Math.max(140, Math.min(N.height, window.innerHeight * 0.30));
    const s = targetH / N.height;
    const ox = C.left + C.width / 2, oy = C.top + C.height / 2;
    const dx = (window.innerWidth / 2) - ox - s * ((N.left + N.width / 2) - ox);
    const dy = top - oy - s * (N.top - oy);
    openT = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    openScale = s;
    if (view) { try { view.ov.style.setProperty('--mf-top', Math.round(top + targetH) + 'px'); } catch (e) {} }
    return true;
  }

  function ensure() {
    if (view && view.ov && view.ov.isConnected) return true;
    if (view && view.abort) { try { view.abort.abort(); } catch (e) {} }
    view = null;
    const built = _mfBuildOverlay();
    if (!built || !built.ov) return false;
    view = built;
    view.ov.hidden = true;
    // #app is a stacking context, so the record has to live inside it for the
    // card (z-index 1001, still in the home) to sit above it without moving.
    (document.getElementById('app') || document.body).appendChild(view.ov);
    // v1140b (Malik): scrolling the record UP has to take the Memento with it.
    // It was pinned, so the record slid underneath and the title read straight
    // through the card. It now scrolls away like a header and fades out.
    view.ov.addEventListener('scroll', onScroll,
      view.abort ? { passive: true, signal: view.abort.signal } : { passive: true });
    return true;
  }

  /* The scroll offset lives on .daycard-wrap, NOT on #dayCard. #dayCard is
     owned by the open/close animation, and an inline transform cannot beat a
     running animation; the wrap is free (the living wander writes to the stage
     below it). Two elements, two jobs, no fight. */
  function onScroll() {
    if (!view) return;
    const wrap = document.querySelector('#dayCard .daycard-wrap');
    if (!wrap) return;
    if (!desiredOpen) { wrap.style.transform = ''; wrap.style.opacity = ''; return; }
    const y = Math.max(0, view.ov.scrollTop);
    // Gone by the time it has scrolled its own height away, so the fade tracks
    // the card leaving rather than running on some invented timer.
    const span = Math.max(120, parseFloat(view.ov.style.getPropertyValue('--mf-top')) || 240);
    const o = Math.max(0, 1 - (y / span));
    // Divide by the open scale: this transform sits INSIDE the shrunken card,
    // so a raw -y only moved the card 0.52 * y on screen and it lagged the
    // content it is supposed to travel with.
    wrap.style.transform = 'translate3d(0,' + (-y / (openScale || 1)).toFixed(2) + 'px,0)';
    wrap.style.opacity = String(o);
    wrap.style.pointerEvents = o < 0.12 ? 'none' : '';
  }

  /* One animation, born once, driven both ways. */
  function drive() {
    const el = cardEl();
    if (!el) return;
    if (!anim) {
      el.style.transformOrigin = '50% 50%';
      anim = el.animate(
        [{ transform: 'none' }, { transform: openT }],
        { duration: DUR, easing: EASE, fill: 'both' }
      );
      anim.onfinish = settle;
      anim.oncancel = () => { anim = null; };
    }
    anim.playbackRate = desiredOpen ? 1 : -1;
    try { anim.play(); } catch (e) { jump(); return; }
    // THE DEAD-MAN SWITCH. A backgrounded tab freezes the document timeline:
    // the animation stays 'running' forever, currentTime never advances and
    // onfinish never fires, so the view would be stranded half-open with the
    // scroll still locked. (Proven in the preview, whose pane is hidden:
    // document.timeline.currentTime does not move at all.) If the animation
    // has not finished well after it should have, we stop asking and land it.
    if (guard) clearTimeout(guard);
    guard = setTimeout(jump, DUR + 260);
  }

  /* Land on the desired end state immediately, no animation. Used when the
     timeline is frozen or WAAPI is unavailable. */
  function jump() {
    if (guard) { clearTimeout(guard); guard = null; }
    const el = cardEl();
    if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
    if (el) el.style.transform = desiredOpen ? openT : '';
    settle();
  }

  function settle() {
    if (guard) { clearTimeout(guard); guard = null; }
    if (desiredOpen) {
      phase = 'open';
      // v1147: OPEN is a settled, static pose, not an animation parked at its
      // end. Handing the transform back to an inline style means a resize or a
      // rotate is a one-line update instead of cancelling and re-running the
      // animation (which, mid-view, restarts it from the home pose). Closing
      // still animates: a fresh reverse run starts exactly at this same pose.
      if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
      const elO = cardEl();
      if (elO) { elO.style.transformOrigin = '50% 50%'; elO.style.transform = openT; }
      return;
    }
    phase = 'closed';
    // cancel() puts the card back to its own untransformed self. Not "near"
    // its home pose: literally it, with no rounding to accumulate.
    if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
    const el = cardEl();
    if (el) { el.style.transform = ''; el.style.transformOrigin = ''; el.style.willChange = ''; }
    const wrap0 = el ? el.querySelector('.daycard-wrap') : null;
    if (wrap0) { wrap0.style.transform = ''; wrap0.style.opacity = ''; wrap0.style.pointerEvents = ''; }
    document.body.classList.remove('mf-open');
    document.body.style.overflow = '';
    // v1149: DESTROY IT. Every listener the record bound (including the ones
    // on the card, which stays), its countdown, its customise sheet and its
    // scroll position go with it. Nothing can be left behind to jam the next
    // open, because there is nothing left.
    destroy();
  }

  function destroy() {
    if (!view) return;
    const v = view;
    view = null;
    try { v.stopTick(); } catch (e) {}
    if (v.abort) { try { v.abort.abort(); } catch (e) {} }
    try { v.ov.remove(); } catch (e) {}
  }

  function apply() {
    if (!view) return;
    const ov = view.ov;
    if (desiredOpen) {
      ov.hidden = false;
      ov.classList.remove('mf--closing');
      if (phase === 'opening' && ov.scrollTop) { ov.scrollTop = 0; }
      onScroll();
      void ov.offsetWidth;              // commit the hidden->shown state first
      ov.classList.add('mf--open');
      document.body.classList.add('mf-open');
      document.body.style.overflow = 'hidden';
      try { view.startTick(); } catch (e) {}
    } else {
      ov.classList.remove('mf--open');
      ov.classList.add('mf--closing');
    }
    drive();
    try { if (window.Router && Router.sync) Router.sync(); } catch (e) {}
  }

  return {
    isActive: () => desiredOpen || phase !== 'closed',
    open: function () {
      if (desiredOpen) return;
      if (!ensure()) return;
      // Geometry is only trustworthy when nothing is animating. Mid-close the
      // cached pose is still the right one, because nothing moved the home.
      if (phase === 'closed') { if (!measure()) return; }
      desiredOpen = true;
      phase = 'opening';
      const el0 = cardEl();
      if (el0) el0.style.transform = '';   // the animation owns the transform
      apply();
    },
    close: function () {
      if (!desiredOpen && phase === 'closed') return;
      desiredOpen = false;
      phase = 'closing';
      apply();
    },
    toggle: function () { if (desiredOpen) this.close(); else this.open(); },
    /* Kept as a no-op entry point: js/08's renderDayCard still calls it, and
       there is nothing left to invalidate now that every open composes fresh. */
    invalidate: function () {},
    _sync: onScroll,
    _frozen: function () { if (phase === 'opening' || phase === 'closing') jump(); },
    _reflow: function () {
      // The home pose moved (rotate, resize, keyboard). Re-measure and, if the
      // record is up, retarget without a restart.
      if (phase === 'closed') { anim = null; return; }
      if (phase === 'open') {
        // Settled: just move it. No animation to disturb.
        const elR = cardEl();
        if (elR) elR.style.transform = '';      // measure the true home pose
        if (!measure()) return;
        if (elR) elR.style.transform = openT;
        onScroll();
        return;
      }
      if (!measure()) return;
      const el = cardEl();
      if (!el || !anim) return;
      const t = anim.currentTime;
      const rate = anim.playbackRate;
      try { anim.cancel(); } catch (e) {}
      anim = null;
      drive();
      if (anim) { anim.playbackRate = rate; try { anim.currentTime = t; } catch (e) {} }
    }
  };
})();
try {
  window.MementoView = MementoView;
  // Leaving the app mid-transition must not leave it mid-transition. Hiding the
  // tab freezes the timeline, so we land the pose we were heading for before it
  // can freeze, and land it again on return in case the freeze won the race.
  document.addEventListener('visibilitychange', () => {
    try { if (MementoView._frozen) MementoView._frozen(); } catch (e) {}
  });
  window.addEventListener('pagehide', () => { try { MementoView._frozen(); } catch (e) {} });
  window.addEventListener('resize', () => { try { MementoView._reflow(); } catch (e) {} });
  window.addEventListener('orientationchange', () => { setTimeout(() => { try { MementoView._reflow(); } catch (e) {} }, 220); });
} catch (e) {}

/* v1145, THE TAP THAT SOMETIMES DID NOTHING.
   Malik: "a glitch when I can't even open the memento". The gesture was bound
   to .daycard-wrap, which the renderer replaces on every render, and then to
   #dayCard, which is itself replaced while the home boots. Either way the
   listener could die and the card went dead to the touch, at random, forever.
   It now lives on the DOCUMENT, bound exactly once, and finds the card by
   asking what was touched. No DOM swap can unbind it. */
// v1153 (Malik: "holding down on the memento doesn't open up the editor"):
// the customise sheet lives inside the record, which is destroyed on close,
// so a HOME hold had nothing to open. This opens the record and then the
// sheet the moment the builder has it.
/* ═══════════════════════════════════════════════════════════════════════
   v1164 THE MEMENTO EDITOR (Malik). Holding the card opens a full-screen
   room of its own: the real card lifts to the top at about a third size, and
   the materials live on a plane underneath, so every tap repaints the card
   they are actually holding, live.

   It obeys the record's laws because they were learned the hard way:
   - the card is NEVER moved or re-parented, only transformed (v1139),
   - ONE animation, created once, reversed in place (v1140),
   - nothing outlives the view: the surface and all its listeners are
     destroyed on close (v1149),
   - it never opens while the record is up, and the record's own hold path
     is untouched.
   ═══════════════════════════════════════════════════════════════════════ */
const MementoEditor = (function () {
  const DUR = 460;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  let ov = null, abort = null, anim = null, openT = '', guard = null;
  let phase = 'closed';     // closed | opening | open | closing
  let desiredOpen = false;

  const cardEl = () => document.getElementById('dayCard');

  /* the open pose. Same maths as the record: translate has to pay for the
     origin term too, or the card lands a few pixels off and reads as a pop. */
  function measure() {
    const el = cardEl();
    if (!el) return false;
    const face = el.querySelector('.daycard-ns') || el.querySelector('.daycard-wrap') || el;
    const C = el.getBoundingClientRect();
    const N = face.getBoundingClientRect();
    if (!N.height || !C.height) return false;
    const cs = getComputedStyle(document.documentElement);
    const safeT = parseFloat(cs.getPropertyValue('--safe-t')) || 0;
    const top = safeT + 64;                       // clear of the title row
    const targetH = Math.max(150, Math.min(N.height, window.innerHeight * 0.31));
    const s = targetH / N.height;
    const ox = C.left + C.width / 2, oy = C.top + C.height / 2;
    const dx = (window.innerWidth / 2) - ox - s * ((N.left + N.width / 2) - ox);
    const dy = top - oy - s * (N.top - oy);
    openT = 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    if (ov) ov.style.setProperty('--mfe-top', Math.round(top + targetH) + 'px');
    return true;
  }

  function build() {
    const wrap = document.querySelector('#dayCard .daycard-wrap');
    if (!wrap) return false;
    abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const sig = abort ? { signal: abort.signal } : undefined;
    const on = (el, ev, fn, opt) => { if (el) el.addEventListener(ev, fn, sig ? Object.assign({}, opt || {}, sig) : opt); };

    ov = document.createElement('div');
    ov.id = 'mfEditor';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Edit your Memento');

    const cur = () => (state.cardSkin && state.cardSkin.id) || '';
    const yoursName = (state.profile && state.profile.name) || '';
    const tiles = [_skChipHtml(null, '', 'Default', cur() === '')]
      .concat(yoursName ? [_skChipHtml(skinForName(yoursName), 'name', 'Yours', cur() === 'name')] : [])
      .concat(CARD_SKINS.map(s => _skChipHtml(s, s.n, s.n, cur() === s.n)))
      .join('');

    ov.innerHTML =
      '<div class="mfe__bg" aria-hidden="true"></div>' +
      '<button class="mfe__close" type="button" aria-label="Done">Done</button>' +
      '<p class="mfe__title">Your Memento</p>' +
      '<div class="mfe__plane">' +
        '<p class="mfe__name" id="mfeName">' + esc(cur() || 'Default') + '</p>' +
        '<div class="mfe__grid" id="mfeGrid">' + tiles + '</div>' +
        '<div class="mfe__rows">' +
          '<div class="mfe__row" data-tog="colorapp">' +
            '<span class="mfe__row-k">Colours the app</span>' +
            '<span class="mfe__seg">' +
              '<button type="button" data-v="1"' + (!(state.prefs && state.prefs.skinColorsApp === false) ? ' class="on"' : '') + '>On</button>' +
              '<button type="button" data-v="0"' + ((state.prefs && state.prefs.skinColorsApp === false) ? ' class="on"' : '') + '>Card only</button>' +
            '</span>' +
          '</div>' +
          '<div class="mfe__row" data-tog="ring">' +
            '<span class="mfe__row-k">The ring</span>' +
            '<span class="mfe__seg">' +
              '<button type="button" data-v="0"' + (!(state.cardSkin && state.cardSkin.ring) ? ' class="on"' : '') + '>White</button>' +
              '<button type="button" data-v="1"' + ((state.cardSkin && state.cardSkin.ring) ? ' class="on"' : '') + '>Matched</button>' +
            '</span>' +
          '</div>' +
          '<div class="mfe__row" data-tog="mark">' +
            '<span class="mfe__row-k">The M</span>' +
            '<span class="mfe__seg">' +
              '<button type="button" data-v="0"' + (!(state.cardSkin && state.cardSkin.mark) ? ' class="on"' : '') + '>Plain</button>' +
              '<button type="button" data-v="1"' + ((state.cardSkin && state.cardSkin.mark) ? ' class="on"' : '') + '>Tinted</button>' +
            '</span>' +
          '</div>' +
          '<div class="mfe__row mfe__row--acc">' +
            '<span class="mfe__row-k">Accent</span>' +
            '<span class="mfe__acc" id="mfeAcc">' +
              (typeof ACCENT_CHOICES !== 'undefined' ? ACCENT_CHOICES.filter(a => a !== 'custom').map(a =>
                '<button type="button" class="mfe__sw' + ((state.prefs && state.prefs.accent) === a ? ' is-on' : '') + '" data-acc="' + a + '" aria-label="' + a + ' accent"><i style="background:' + (a === 'default' ? 'linear-gradient(135deg,#3ad9f5,#3fd94e)' : (typeof ACCENT_HEX !== 'undefined' && ACCENT_HEX[a]) || '#888') + '"></i></button>').join('') : '') +
            '</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    // v1166: the accent row is only meaningful when the material is NOT
    // driving the app's colour, so the surface carries that state.
    ov.dataset.cardonly = (state.prefs && state.prefs.skinColorsApp === false) ? '1' : '0';
    // #app is the stacking context the card lives in, same reason as the record
    (document.getElementById('app') || document.body).appendChild(ov);

    const nameEl = ov.querySelector('#mfeName');
    const paint = () => { if (nameEl) nameEl.textContent = cur() || 'Default'; };

    on(ov.querySelector('.mfe__close'), 'click', () => close());
    on(ov.querySelector('#mfeGrid'), 'click', (e) => {
      const b = e.target.closest('.mfsk-chip');
      if (!b) return;
      if (!state.cardSkin) state.cardSkin = { id: '', ring: 0, mark: 0 };
      state.cardSkin.id = b.getAttribute('data-skin-id') || '';
      try { persistNow(); } catch (err) {}
      applyCardSkin(document.querySelector('#dayCard .daycard-wrap'));
      ov.querySelectorAll('.mfsk-chip').forEach(c => c.setAttribute('aria-pressed', c === b ? 'true' : 'false'));
      paint();
    });
    ov.querySelectorAll('.mfe__row[data-tog]').forEach(row => {
      on(row, 'click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        const key = row.getAttribute('data-tog');
        if (key === 'colorapp') {
          if (!state.prefs) state.prefs = {};
          state.prefs.skinColorsApp = b.getAttribute('data-v') === '1';
          ov.dataset.cardonly = state.prefs.skinColorsApp ? '0' : '1';
        } else {
          if (!state.cardSkin) state.cardSkin = { id: '', ring: 0, mark: 0 };
          state.cardSkin[key] = b.getAttribute('data-v') === '1' ? 1 : 0;
        }
        try { persistNow(); } catch (err) {}
        applyCardSkin(document.querySelector('#dayCard .daycard-wrap'));
        row.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      });
    });
    const acc = ov.querySelector('#mfeAcc');
    on(acc, 'click', (e) => {
      const b = e.target.closest('.mfe__sw');
      if (!b) return;
      try {
        state.prefs.accent = b.getAttribute('data-acc');
        // a hand-picked accent is a deliberate override of the material's own
        if (state.cardSkin) state.cardSkin.prevAccent = null;
        _skinAccentApplied = state.cardSkin ? (state.cardSkin.id || '') : '';
        persistNow();
        applyPrefs();
        acc.querySelectorAll('.mfe__sw').forEach(x => x.classList.toggle('is-on', x === b));
      } catch (err) {}
    });
    on(document, 'keydown', (e) => { if (e.key === 'Escape') close(); });
    // the scrim closes it; the plane does not
    on(ov, 'click', (e) => { if (e.target === ov || e.target.classList.contains('mfe__bg')) close(); });
    return true;
  }

  function drive() {
    const el = cardEl();
    if (!el) return;
    if (!anim) {
      el.style.transformOrigin = '50% 50%';
      anim = el.animate([{ transform: 'none' }, { transform: openT }],
        { duration: DUR, easing: EASE, fill: 'both' });
      anim.onfinish = settle;
      anim.oncancel = () => { anim = null; };
    }
    anim.playbackRate = desiredOpen ? 1 : -1;
    try { anim.play(); } catch (e) { jump(); return; }
    // the dead-man switch: a hidden tab freezes the timeline and onfinish
    // never fires, which would strand the card mid-flight (v1140)
    if (guard) clearTimeout(guard);
    guard = setTimeout(jump, DUR + 260);
  }

  function jump() {
    if (guard) { clearTimeout(guard); guard = null; }
    const el = cardEl();
    if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
    if (el) el.style.transform = desiredOpen ? openT : '';
    settle();
  }

  // v1166: the pose can land off AND then move again, because the home's own
  // layout owner re-runs after the scroll lock and the same transform then
  // points somewhere else. So the pose SNAPS itself: measure what actually
  // rendered, correct, re-check a few times. Bounded, and every timer dies
  // with the view.
  function snap(tries) {
    // runs from the moment it opens, not only once it settles: in a throttled
    // tab the animation's finish can never fire, and the pose still has to be
    // right. desiredOpen is the only truth here (the v1140 rule).
    if (!desiredOpen) return;
    const el = cardEl();
    const face = el && (el.querySelector('.daycard-ns') || el.querySelector('.daycard-wrap'));
    if (!el || !face) return;
    try {
      const cs = getComputedStyle(document.documentElement);
      const want = (parseFloat(cs.getPropertyValue('--safe-t')) || 0) + 64;
      const got = face.getBoundingClientRect();
      const dy = Math.round(want - got.top);
      const dx = Math.round(window.innerWidth / 2 - (got.left + got.width / 2));
      if (Math.abs(dy) > 2 || Math.abs(dx) > 2) {
        openT = openT.replace(/^translate\(([-\d.]+)px,\s*([-\d.]+)px\)/,
          (m, x, y) => 'translate(' + (parseFloat(x) + dx).toFixed(2) + 'px,' + (parseFloat(y) + dy).toFixed(2) + 'px)');
        el.style.transform = openT;
      }
      if (ov) ov.style.setProperty('--mfe-top', Math.round(want + face.getBoundingClientRect().height) + 'px');
    } catch (e) {}
    if (tries < 8) {
      const t = setTimeout(() => snap(tries + 1), 110);
      if (abort && abort.signal) abort.signal.addEventListener('abort', () => clearTimeout(t));
    }
  }

  function settle() {
    if (guard) { clearTimeout(guard); guard = null; }
    if (desiredOpen) {
      phase = 'open';
      if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
      const el = cardEl();
      if (el) { el.style.transformOrigin = '50% 50%'; el.style.transform = openT; }
      snap(0);
      return;
    }
    phase = 'closed';
    if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
    const el = cardEl();
    if (el) { el.style.transform = ''; el.style.transformOrigin = ''; el.style.willChange = ''; }
    document.body.classList.remove('mfe-open');
    document.body.style.overflow = '';
    destroy();
  }

  function destroy() {
    if (abort) { try { abort.abort(); } catch (e) {} abort = null; }
    if (ov) { try { ov.remove(); } catch (e) {} ov = null; }
  }

  function open() {
    if (desiredOpen) return;
    // the record owns the card while it is up; its own sheet edits there
    try { if (typeof MementoView !== 'undefined' && MementoView.isActive()) return; } catch (e) {}
    try { if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) return; } catch (e) {}
    if (!build()) return;
    desiredOpen = true;
    phase = 'opening';
    const el0 = cardEl();
    if (el0) el0.style.transform = '';     // the animation owns it
    // v1166: the open state changes the home's layout (the scroll lock alone
    // moves it), so the pose MUST be measured with that state applied.
    document.body.classList.add('mfe-open');
    document.body.style.overflow = 'hidden';
    void document.body.offsetHeight;
    if (!measure()) {
      document.body.classList.remove('mfe-open');
      document.body.style.overflow = '';
      desiredOpen = false; phase = 'closed'; destroy(); return;
    }
    void ov.offsetWidth;
    ov.classList.add('is-open');
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
    drive();
    // the home relayouts a beat after the scroll lock; the pose corrects
    // itself across that window instead of trusting one measurement
    const t0 = setTimeout(() => snap(0), DUR + 40);
    if (abort && abort.signal) abort.signal.addEventListener('abort', () => clearTimeout(t0));
  }

  function close() {
    if (!desiredOpen && phase === 'closed') return;
    desiredOpen = false;
    phase = 'closing';
    if (ov) ov.classList.remove('is-open');
    drive();
  }

  return {
    open: open,
    close: close,
    isActive: () => desiredOpen || phase !== 'closed',
    _reflow: function () {
      if (phase === 'closed') { anim = null; return; }
      const el = cardEl();
      if (el) el.style.transform = '';
      if (!measure()) return;
      if (el) el.style.transform = openT;
    },
    _frozen: function () { if (phase === 'opening' || phase === 'closing') jump(); }
  };
})();
try {
  window.MementoEditor = MementoEditor;
  window.addEventListener('resize', () => { try { MementoEditor._reflow(); } catch (e) {} });
  window.addEventListener('orientationchange', () => { setTimeout(() => { try { MementoEditor._reflow(); } catch (e) {} }, 220); });
  document.addEventListener('visibilitychange', () => { try { MementoEditor._frozen(); } catch (e) {} });
} catch (e) {}

// v1162 (Malik): "whenever somebody edits the Memento it would have no
// connection to going inside." The editor is now its OWN surface on the home:
// the sheet mounts straight onto #app, the record is never opened, never
// built, and cannot be reached by accident. Inside the record the same sheet
// is reached by its own hint, and that path is untouched.
let _mfHomeSkin = null;
function _mfOpenCustomize() {
  try {
    // v1164: the home hold opens the full-screen EDITOR (the card lifts, the
    // materials live on a plane under it and repaint it live). The old
    // bottom sheet stays for the record's own hint path.
    if (typeof MementoEditor !== 'undefined') { MementoEditor.open(); return; }
    // inside the record, the record's own sheet owns this gesture
    if (typeof MementoView !== 'undefined' && MementoView.isActive()) return;
    if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) return;
    if (_mfHomeSkin) { _mfHomeSkin.openSheet(); return; }
    const wrap = document.querySelector('#dayCard .daycard-wrap');
    const host = document.getElementById('app') || document.body;
    if (!wrap) return;
    const abort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const sig = abort ? { signal: abort.signal } : undefined;
    const built = _mfBuildSkinSheet(host, wrap, sig, () => {
      // the editor is torn down with its listeners, so nothing of it can
      // outlive the visit (the v1149 law: nothing outlives its view)
      setTimeout(() => {
        try { if (abort) abort.abort(); } catch (e) {}
        try { built.sheet.remove(); } catch (e) {}
        _mfHomeSkin = null;
      }, 320);
    });
    if (!built) return;
    built.sheet.classList.add('mfsk-wrap--home');
    _mfHomeSkin = built;
    built.openSheet();
  } catch (e) {}
}

// The evolution cinema owns the card while it runs: no tap-to-open, no hold.
function _mfCinemaUp() {
  try {
    return !!_cardEvolutionRunning || document.body.classList.contains('evo2');
  } catch (e) { return false; }
}

function _mfBindCardTap() {
  if (window._mfTapBound) return;
  window._mfTapBound = true;
  let tx = 0, ty = 0, t0 = 0, moved = true, onCard = false, holdT = null, held = false;
  const cancelHold = () => { if (holdT) { clearTimeout(holdT); holdT = null; } };
  document.addEventListener('pointerdown', (e) => {
    onCard = !!(e.target && e.target.closest && e.target.closest('#dayCard'));
    if (!onCard) return;
    tx = e.clientX; ty = e.clientY; t0 = Date.now(); moved = false; held = false;
    // the HOME hold opens the customise sheet (inside the record the sheet's
    // own binding fires first and this one finds it already open and stops)
    cancelHold();
    holdT = setTimeout(() => { holdT = null; if (!moved && !_mfCinemaUp()) { held = true; _mfOpenCustomize(); } }, 480);
  }, true);
  document.addEventListener('pointermove', (e) => {
    if (!onCard || moved) return;
    if (Math.abs(e.clientX - tx) > 8 || Math.abs(e.clientY - ty) > 8) { moved = true; cancelHold(); }
  }, true);
  document.addEventListener('pointerup', () => {
    cancelHold();
    if (held) { held = false; onCard = false; moved = true; return; }
    if (!onCard) return;
    onCard = false;
    // A tap opens or closes. A deliberate long press does not: 700ms, not 400,
    // because a busy main thread stretches an honest tap. And if the customise
    // sheet is up the hold just fired, so the release is not a tap.
    const quick = (Date.now() - t0) < 700;
    // v1147, THE MEMENTO THAT WOULD NOT OPEN AT ALL. This guard used to ask
    // "does an unhidden customise sheet exist anywhere", and the sheet lives
    // inside the record, which is now PERMANENT. Close the record while the
    // sheet is open and the sheet stays hidden=false forever, invisible
    // because the whole record is hidden, and every single tap on the card
    // was swallowed from then on. Only a sheet inside an OPEN record counts.
    let sheetUp = false;
    try {
      sheetUp = MementoView.isActive() &&
        !!document.querySelector('#mementoFull:not([hidden]) .mfsk-wrap:not([hidden])');
    } catch (e) {}
    // v1183 (Malik, on-device): while the evolution cinema is playing, a tap
    // on the card must NOT open the record mid-animation. It does nothing.
    if (!moved && quick && !sheetUp && !_mfCinemaUp()) { try { MementoView.toggle(); } catch (e) {} }
    moved = true;
  }, true);
  document.addEventListener('pointercancel', () => { cancelHold(); onCard = false; moved = true; held = false; }, true);
}
try { document.addEventListener('DOMContentLoaded', () => { try { _mfBindCardTap(); } catch (e) {} }); _mfBindCardTap(); } catch (e) {}

// The old entry point is now a one-liner into the controller, so every caller
// (home tap, router, deep link) goes through the same state machine.
function openMementoFull() { try { MementoView.open(); } catch (e) {} }

// ── Living Day Card: data -> color, motion, theme toggle ──────────────────
// Map real user data into the three pillar levels (0-100). "Reflects where you
// are now": consistency = last 30 days, action = last 7 days (both can fade);
// clarity is the one permanent foundation (locks in once Clarity is completed).
function livingCardLevels() {
  // Stage override: honored ONLY during a live, non-wedged run or a pinned dev
  // hold (?dev=evo). A leftover override from an interrupted cinema (iOS killed
  // its timers) must never blank a real user's card, so a stale one is ignored
  // and real levels win. This is the last-resort safety behind _evoFinish.
  if (window._evoStageOverride) {
    const fresh = _cardEvolutionRunning && _evoStartedAt && (Date.now() - _evoStartedAt) <= EVO_MAX_MS;
    if (window._evoHold || fresh) return window._evoStageOverride;
    window._evoStageOverride = null;   // stale: drop it so the card lights normally
  }
  let clar = (state.clarity && state.clarity.completed) ? 100 : 0;
  // These are LIGHT levels, not gauges: the raw ratios pass through a sqrt curve
  // so earned light is actually visible. Linear, the first logged move is 1/7 =
  // 14% white (invisible at blob opacity ~0.12) and a full first week of showing
  // up is 23% green; the buyer's first win would not read on the card at all.
  // sqrt keeps it honest (0 stays 0, only real behavior fills it, 100 stays 100)
  // but lifts the early ember: 1 action day = 38 white, 7/30 days = 48 green.
  // Numeric displays (the Memento full-view bars/percent) stay linear; this
  // curve is only how data becomes light (card + share card + atmosphere).
  let act = 0;
  try {
    const d7 = actionLocalDaysInWindow(7);
    act = d7 > 0 ? Math.min(100, Math.round(Math.sqrt(d7 / 7) * 100)) : 0;
  } catch (e) {}
  // v934 (Malik): the platinum is earned when the move is DISCOVERED, not when
  // it is logged, and it does not change once earned. Logging is Consistency's
  // job (green): if the platinum also waited for a logged day, both rewards
  // would land on the same day and neither would read as its own thing. So a
  // discovered plan takes Action straight to full and holds it there.
  // "Discovered" is planGenerated + a real primaryAction, verified against the
  // live state shape rather than assumed: state.action.plan exists as a key but
  // is NOT the flag (it reads false on a fully-planned card), which is exactly
  // the trap that made a first attempt at this silently do nothing.
  try {
    const A = state.action;
    if (A && A.planGenerated && A.primaryAction && A.primaryAction.title) act = 100;
  } catch (e) {}
  let cons = 0;
  try {
    const cs = consistencyStats();
    if (cs && typeof cs.pct30 === 'number' && cs.pct30 > 0) cons = Math.min(100, Math.round(Math.sqrt(cs.pct30 / 100) * 100));
  } catch (e) {}
  return { clar, act, cons };
}

function setLivingCardVars(wrap) {
  if (!wrap) return;
  const L = livingCardLevels();
  wrap.style.setProperty('--clar', (L.clar / 100).toFixed(3));
  wrap.style.setProperty('--act', (L.act / 100).toFixed(3));
  wrap.style.setProperty('--cons', (L.cons / 100).toFixed(3));
  // The blend blob (b4, the periwinkle) used to appear ONLY when clarity and
  // consistency were both present. v934 (Malik): Clarity now carries a touch of
  // it alongside the cyan, because the card-playground prototype showed that and
  // he liked it. That purple was an artifact of the prototype's simplified --mix
  // (it lit the blob whenever ANY pillar was on); this makes the real card do it
  // deliberately, at a deliberately small amount. The paired clarity+consistency
  // blend still rises above it, so the blob keeps its original meaning and just
  // no longer starts from nothing.
  const mixPair = Math.min(L.clar, L.cons) / 100 * 0.75;
  const mixSolo = (L.clar / 100) * 0.34;
  wrap.style.setProperty('--mix', Math.max(mixPair, mixSolo).toFixed(3));
  // lit gates everything outside the card (aura, bloom, reflection) by fill
  wrap.style.setProperty('--lit', (Math.max(L.clar, L.act, L.cons) / 100).toFixed(3));
  // v931: the Action reward's platinum wash drives the card's CENTRE bright and
  // it STAYS bright, so the adaptive M has to flip for good, not just during the
  // evolution cinema the way v917 handled. A discrete class, not a computed
  // colour: a var-driven color-mix silently resolved to 0% last time and left
  // the mark white on every card while looking correct in code.
  // The threshold is on --act alone, deliberately theme-independent: 0.41 x the
  // dark wash constant (0.85) is the ~0.35 centre brightness where a white mark
  // stops reading. Light mode already presses the mark dark at every value, so
  // one rule covers both and there is no stale state to re-sync on a theme flip.
  wrap.classList.toggle('daycard--bright', (L.act / 100) > 0.41);
}

// Days since the most recent logged action (local-day resolution). null when
// there's no action history at all -> a brand-new locked-in user has NOT drifted,
// they just haven't started, so the atmosphere stays the gorgeous purple floor
// instead of going cold steel. Mirrors actionLocalDaysInWindow's day math.
function daysSinceLastAction() {
  try {
    const h = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
    if (!h.length) return null;
    const todayNum = Math.floor(Date.parse(getTodayISO() + 'T00:00:00Z') / 86400000);
    let latest = -Infinity;
    h.forEach((e) => {
      if (!e || !e.date) return;
      const day = (typeof isoToLocalDay === 'function') ? isoToLocalDay(e.date) : String(e.date).slice(0, 10);
      if (!day) return;
      const dNum = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
      if (dNum > latest) latest = dNum;
    });
    if (latest === -Infinity) return null;
    return Math.max(0, todayNum - latest);
  } catch (e) { return null; }
}

// THE ATMOSPHERE ENGINE: turn the living card's pillar light into a reactive
// background. The card's three colors (clarity purple, action gold, consistency
// green) reflect on the background INSIDE the Memento full view (#mementoFull),
// keyed off the :root --aura-* vars this sets. The HOME no longer uses them (it's
// just the top-left beam now). Vibrancy tracks how the user is actually showing up:
// richer + warmer with consistency + recent action, cooler + dimmer as they drift.
// CRITICAL: energy is NEVER keyed off --lit (clarity pins that to ~1, so it carries
// no signal); it's built from consistency + action minus drift, and floored so the
// baseline always glows. Called from renderAll for both card themes. Wrapped in
// try/catch so a render never dies on the atmosphere.
function setAtmosphereVars() {
  try {
    const root = document.documentElement;
    const L = livingCardLevels();                 // clar / act / cons, 0..100
    const clarN = Math.max(0, Math.min(1, L.clar / 100));
    const actN  = Math.max(0, Math.min(1, L.act  / 100));
    const consN = Math.max(0, Math.min(1, L.cons / 100));

    // Drift decay: 0 while fresh (acted within a day), ramps to 1 over ~6 days
    // away. Only someone WITH action history can drift (null -> 0, not started).
    const drift = daysSinceLastAction();
    const driftDecay = (drift == null) ? 0 : Math.max(0, Math.min(1, (drift - 1) / 5));

    // Energy = gorgeous floor + consistency vibrancy + recent-action lift, dimmed
    // as you drift. Floored at 0.16 so a blank-but-locked-in card still glows.
    let energy = 0.16 + 0.55 * consN + 0.30 * actN;
    energy = energy * (1 - 0.45 * driftDecay);
    energy = Math.max(0.16, Math.min(1, energy));

    // Warmth = action gold, fades fast as you fall off. Cool = the steel/violet
    // "you've drifted" veil rising in its place.
    const warmth = Math.max(0, Math.min(1, actN * (1 - driftDecay)));
    const cool = driftDecay;

    root.style.setProperty('--aura-clar', clarN.toFixed(3));
    root.style.setProperty('--aura-cons', consN.toFixed(3));
    root.style.setProperty('--aura-act', actN.toFixed(3));
    root.style.setProperty('--aura-energy', energy.toFixed(3));
    root.style.setProperty('--aura-warmth', warmth.toFixed(3));
    root.style.setProperty('--aura-cool', cool.toFixed(3));
  } catch (e) {}
}

// Continuous random wander: each blob eases toward a fresh random target and
// the bloom + reflection mirror blobs ride the same transform, so the color
// drifts calmly and the reflection tracks it. One loop; restarted per render
// with fresh nodes; cancelled when the card isn't living. Honors reduced-motion
// and lowfx (color still shows, motion holds).
let _dcLivingRaf = 0;
function startLivingWander(wrap) {
  stopLivingWander();
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.documentElement.classList.contains('lowfx')) return;
    const inside = [].slice.call(wrap.querySelectorAll('.daycard-ns__liquid .blob'));
    const bloom = [].slice.call(wrap.querySelectorAll('.daycard-bloom .blob'));
    const mirror = [].slice.call(wrap.querySelectorAll('.daycard-floor .blob'));
    if (!inside.length) return;
    const R = (a, b) => a + Math.random() * (b - a);
    // High-variance organic drift (Malik): each glow roams the WHOLE card (wide
    // translate targets), pulses its OWN opacity in and out, and moves at its own
    // random speed, so nothing reads as parked or in lockstep. base = the data
    // opacity from CSS (--clar/--act/... ); the loop scales it by a fading factor.
    const st = inside.map((el) => ({
      x: R(-30, 30), y: R(-30, 30), sc: R(0.85, 1.2), op: R(0.4, 1),
      tx: R(-58, 58), ty: R(-58, 58), tsc: R(0.65, 1.55), top: R(0.25, 1),
      base: parseFloat(getComputedStyle(el).opacity) || 0,
      kPos: R(0.002, 0.0065),  // per-blob drift speed (slowed ~50%, Malik)
      kScl: R(0.0025, 0.007),
      kOp:  R(0.0025, 0.009),  // per-blob fade speed (slowed ~50%)
    }));
    // v613: the data brightness is LIVE, not cached. Each frame the loop reads
    // the wrap's current pillar vars and chases them smoothly (~2.5s), so a
    // stage unlock (real or dev cinema) pours in through the drift instead of
    // being stomped by a stale cached base. Mapping mirrors daycard-living.css.
    const _pv = (n) => parseFloat(wrap.style.getPropertyValue(n)) || 0;
    const BASEF = [
      (v) => v.clar,          // b1 purple
      (v) => v.act * 0.82,    // b2 white
      (v) => v.cons,          // b3 green
      (v) => v.mix,           // b4 blend
      (v) => v.cons * 0.5,    // b5 green echo
      () => 0                 // b6 red test, held off
    ];
    function frame() {
      // Idle cheaply while the app is backgrounded: reschedule without touching
      // styles so no layout/paint work happens off-screen.
      if (document.hidden) { _dcLivingRaf = requestAnimationFrame(frame); return; }
      const v = { clar: _pv('--clar'), act: _pv('--act'), cons: _pv('--cons'), mix: _pv('--mix') };
      for (let i = 0; i < inside.length; i++) {
        const b = st[i];
        const target = BASEF[i] ? BASEF[i](v) : 0;
        b.base += (target - b.base) * 0.018;
        if (b.base <= 0.004 && target <= 0) { b.base = 0; inside[i].style.opacity = '0'; if (bloom[i]) bloom[i].style.opacity = '0'; if (mirror[i]) mirror[i].style.opacity = '0'; continue; }
        b.x += (b.tx - b.x) * b.kPos;
        b.y += (b.ty - b.y) * b.kPos;
        b.sc += (b.tsc - b.sc) * b.kScl;
        b.op += (b.top - b.op) * b.kOp;
        // Each blob retargets independently when it nears its goal -> desynced,
        // never-repeating motion. Wide ranges so the glow crosses the whole card.
        if (Math.abs(b.tx - b.x) < 2.5 && Math.abs(b.ty - b.y) < 2.5) {
          b.tx = R(-62, 62); b.ty = R(-62, 62); b.tsc = R(0.6, 1.6);
        }
        if (Math.abs(b.top - b.op) < 0.05) { b.top = R(0.18, 1); }
        const tf = 'translate(' + b.x.toFixed(2) + '%,' + b.y.toFixed(2) + '%) scale(' + b.sc.toFixed(3) + ')';
        const op = (b.base * b.op).toFixed(3);
        inside[i].style.transform = tf; inside[i].style.opacity = op;
        if (bloom[i]) { bloom[i].style.transform = tf; bloom[i].style.opacity = op; }
        if (mirror[i]) { mirror[i].style.transform = tf; mirror[i].style.opacity = op; }
      }
      _dcLivingRaf = requestAnimationFrame(frame);
    }
    _dcLivingRaf = requestAnimationFrame(frame);
  } catch (e) {}
}
function stopLivingWander() {
  if (_dcLivingRaf) { cancelAnimationFrame(_dcLivingRaf); _dcLivingRaf = 0; }
}

// (The tap-the-emblem theme toggle was removed: the Day Card is always the living
// card now. renderDayCard() forces the living theme; see the note there.)

// Subtle parallax on the Day Card: it tilts a few degrees toward the
// pointer/finger only, so the glass reads as a physical object you can play
// with. The card is otherwise STILL - no gyro/device-orientation drive (that
// rotated it hands-free on laptops/2-in-1s, which read as the card moving on
// its own). Resets flat the moment the pointer leaves. Skipped under
// reduced-motion and lowfx.
function bindDayCardTilt(card) {
  if (!card) return;
  try {
    // On by default for new profiles; Settings still lets anyone turn it off.
    if (!(state.prefs && state.prefs.cardTilt)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.documentElement.classList.contains('lowfx')) return;
    // Tilt only. The surface itself stays still: updating --dc-mx/--dc-my
    // here made the iridescent wash chase the pointer, which read as a
    // cheap hover effect (Malik). The wash now sits at its resting point.
    // v939 (Malik: "the M just floats there stationary when the card moves").
    // The mark sits dead centre, which is the rotation AXIS, so a rotateX/Y
    // moves the card's edges a lot and its centre almost not at all (measured:
    // 1.72px of card travel against 0.27px of emblem). It was never detached,
    // it was just standing on the pivot. Parallax is what sells it: a small
    // offset in the tilt's direction so the mark reads as raised ABOVE the
    // glass rather than printed flat on it.
    // Done with its own px vars, not translateZ + preserve-3d, because the card
    // carries clip-path + contain:paint (the corner-poke law) and both force
    // 3D flattening, so a translateZ child would do nothing.
    // v1056: the vars land on the STAGE when there is one, so the bloom and
    // floor rotate WITH the card instead of staying bolted to the page while
    // the card pulls away from them (the black seam Malik caught on desktop).
    // The pointer is still tracked on the card itself; only where the
    // rotation is applied changes.
    const host = card.closest('.daycard-living-stage') || card;
    const set = (c, nx, ny, amp) => {
      host.style.setProperty('--dc-rx', (ny * -3.2 * amp).toFixed(2) + 'deg');
      host.style.setProperty('--dc-ry', (nx * 4 * amp).toFixed(2) + 'deg');
    };
    const reset = () => {
      host.style.setProperty('--dc-rx', '0deg'); host.style.setProperty('--dc-ry', '0deg');
    };
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      if (!r.width || !r.height) return;
      set(card, ((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1, 1);
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointerup', reset);
  } catch (e) {}
}

// ── Gyroscope tilt: the card leans in real time as you move your phone ────────
// Feeds the phone's tilt (DeviceOrientationEvent beta/gamma, gravity-referenced
// so it never drifts) into the SAME --dc-rx/--dc-ry the pointer tilt uses, with
// a low-pass smoothing loop so it glides. Mobile-only (where orientation exists;
// pointer tilt covers desktop). iOS 13+ needs a one-time tap to grant motion, so
// a small "bring it to life" pill handles that; once granted we remember it and
// re-arm silently on the next visit's first touch. Honors reduced-motion + the
// user pref. The card transform is cheap, so lowfx does NOT disable it.
let _dcMotionRaf = 0, _dcMotionListener = null, _dcMotionPill = null, _dcMotionGranted = false;
function stopDayCardMotion() {
  if (_dcMotionRaf) { try { cancelAnimationFrame(_dcMotionRaf); } catch (e) {} _dcMotionRaf = 0; }
  if (_dcMotionListener) { try { window.removeEventListener('deviceorientation', _dcMotionListener); } catch (e) {} _dcMotionListener = null; }
  if (_dcMotionPill) { try { _dcMotionPill.remove(); } catch (e) {} _dcMotionPill = null; }
}
function bindDayCardMotion(wrap, card) {
  stopDayCardMotion();
  // DISABLED for now (Malik: gyroscope tilt was "going too much"). This kills
  // the phone-motion tilt AND the "Bring it to life" pill everywhere. To bring
  // it back, delete this single early return; the whole implementation below is
  // intact, and the Settings toggle just needs re-adding (search prefMotionTilt).
  return;
  if (!card) return;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (state.prefs && state.prefs.motionTilt === false) return;
    if (typeof window.DeviceOrientationEvent === 'undefined') return;

    let base = null, tgtRx = 0, tgtRy = 0, curRx = 0, curRy = 0, gotData = false;
    const RANGE = 15;     // degrees of phone tilt for full card lean (lower = more sensitive)
    const AMP_X = 9;      // max card lean front/back (deg)
    const AMP_Y = 12;     // max card lean left/right (deg)

    const loop = () => {
      if (!card.isConnected) { stopDayCardMotion(); return; }
      curRx += (tgtRx - curRx) * 0.16;
      curRy += (tgtRy - curRy) * 0.16;
      // v1056: same host rule as the pointer tilt, stage over card, so the
      // glow layers lean with the glass here too (this path is currently
      // disabled, but it must not resurrect the seam if revived).
      const mh = card.closest('.daycard-living-stage') || card;
      mh.style.setProperty('--dc-rx', curRx.toFixed(2) + 'deg');
      mh.style.setProperty('--dc-ry', curRy.toFixed(2) + 'deg');
      _dcMotionRaf = requestAnimationFrame(loop);
    };
    const onOrient = (e) => {
      if (e.beta == null && e.gamma == null) return;
      gotData = true; _dcMotionGranted = true; // motion is flowing; re-renders re-listen directly
      const beta = e.beta || 0, gamma = e.gamma || 0;
      if (!base) base = { beta, gamma }; // neutral = however they hold it now
      const nx = Math.max(-1, Math.min(1, (gamma - base.gamma) / RANGE));
      const ny = Math.max(-1, Math.min(1, (beta - base.beta) / RANGE));
      tgtRx = ny * -AMP_X;
      tgtRy = nx * AMP_Y;
      if (!_dcMotionRaf) loop();
    };
    const startListening = () => {
      _dcMotionListener = onOrient;
      window.addEventListener('deviceorientation', _dcMotionListener);
    };

    const needsPermission = typeof DeviceOrientationEvent.requestPermission === 'function'; // iOS 13+
    if (!needsPermission) { startListening(); return; }

    const grant = () => DeviceOrientationEvent.requestPermission()
      .then((res) => {
        if (res === 'granted') {
          _dcMotionGranted = true; // session: re-renders re-listen directly, no pill/touch-wait
          try { localStorage.setItem('memento_motion', 'on'); } catch (e) {}
          // Also persist on the synced app state, so it survives storage quirks.
          try { if (state.prefs) { state.prefs.motionGranted = true; if (typeof persistNow === 'function') persistNow(); } } catch (e) {}
          startListening();
          return true;
        }
        return false;
      })
      .catch(() => false);

    // The gentle one-tap prompt, shown ONLY when motion is not already flowing.
    // Tapping it is a deliberate gesture, so the native dialog there is expected.
    const showPill = () => {
      if (document.querySelector('.daycard-motion-cta')) return;
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'daycard-motion-cta';
      pill.setAttribute('aria-label', 'Bring the card to life with motion');
      pill.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3 9c.8 1 .8 5 0 6M21 9c-.8 1-.8 5 0 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>Bring it to life</span>';
      pill.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); grant().then((ok) => { if (ok) { try { pill.remove(); } catch (e2) {} _dcMotionPill = null; } }); });
      (wrap || card).appendChild(pill);
      _dcMotionPill = pill;
    };

    // Motion already flowing this session: just listen (no prompt, no jitter).
    if (_dcMotionGranted) { startListening(); return; }

    let savedOn = false;
    try { savedOn = localStorage.getItem('memento_motion') === 'on' || (state.prefs && state.prefs.motionGranted === true); } catch (e) {}
    if (savedOn) {
      // Granted before. CRITICAL: do NOT call requestPermission again on reopen.
      // In a home-screen PWA iOS forgets the grant per launch, and re-requesting
      // fired the native "Allow Motion" dialog on EVERY reopen (the bug Malik
      // hit). Instead we just listen: if iOS kept the grant, motion flows
      // silently with zero prompt. If it did not, after a beat with no data we
      // show the gentle pill so they can re-enable with one deliberate tap.
      startListening();
      setTimeout(() => { if (!gotData && card.isConnected) showPill(); }, 1600);
      return;
    }
    // First time: the gentle pill (no auto-prompt).
    showPill();
  } catch (e) {}
}

// v27: Consistency over time on the Home, a full-width year heatmap band below
// the hero (Malik likes the heatmap; this gives it room to breathe). Read-only:
// the cells are made inert and the whole band opens the Consistency module. Lives
// in #dashBelow so it is hidden until the Neutron Star is set.
function renderDashConsistency() {
  try {
    const el = document.getElementById('dashConsistency');
    if (!el) return;
    let cs = { totalActiveDays: 0 };
    try { cs = consistencyStats(); } catch (e) {}
    const streak = (state.streak && state.streak.count) || 0;
    const weeks = window.innerWidth < 768 ? 27 : 52;
    let graph = '';
    try { graph = renderConsistencyHeatmap(weeks, 'rolling', true); } catch (e) {}
    // v695 (Malik): ONE fact in the header, the streak, top-left. No label
    // ('the green cells say consistency'), no active-days tally, no Open hint.
    // v812 information law: on the DESKTOP editorial home the streak lives in
    // the hero's stat pair, so the head hides there (CSS) and the band carries
    // only a quiet right-aligned date range instead.
    const _rangeLbl = (function () {
      try {
        const end = new Date();
        const start = new Date(end.getTime() - 52 * 7 * 86400000);
        const f = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return f(start) + ' &rarr; ' + f(end);
      } catch (e) { return ''; }
    })();
    el.innerHTML =
      '<div class="dash-cgram__head">' +
        '<div class="dash-cgram__meta"><b>' + streak + '</b> day streak</div>' +
      '</div>' +
      (_rangeLbl ? '<div class="dash-cgram__range">' + _rangeLbl + '</div>' : '') +
      '<div class="dash-cgram__graph">' + graph + '</div>';
    // Read-only on the Home: strip the per-cell tap affordance; the whole band
    // opens the full Consistency module instead.
    el.querySelectorAll('.cgraph__cell').forEach((cc) => {
      cc.removeAttribute('role'); cc.removeAttribute('tabindex'); cc.classList.remove('cgraph__cell--tap');
    });
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    if (!el._dashCgramBound) {
      el._dashCgramBound = true;
      const open = () => { try { if (typeof Sheet !== 'undefined') Sheet.open('streak'); } catch (e) {} };
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    }
  } catch (e) {}
}

// v690 (Malik): page 2 opens like an app, not a feed. Big hello, a search
// button (Spotlight) and a settings button (You tab). Mobile-only via CSS.
function renderDashHello() {
  try {
    const el = document.getElementById('dashHello');
    if (!el) return;
    const name = (state.profile && (state.profile.name || '').trim()) || '';
    el.innerHTML =
      '<div class="dhello">' +
        '<div class="dhello__hi">Hello' + (name ? ', ' + esc(name) : '') + '</div>' +
        '<div class="dhello__btns">' +
          '<button type="button" class="dhello__btn" id="dhSearch" aria-label="Search Memento">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '</button>' +
          '<button type="button" class="dhello__btn" id="dhGear" aria-label="Open settings">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';
    const sb = el.querySelector('#dhSearch');
    if (sb) sb.addEventListener('click', () => { try { if (window.Spotlight && window.Spotlight.open) window.Spotlight.open(); } catch (e) {} });
    const gb = el.querySelector('#dhGear');
    if (gb) gb.addEventListener('click', () => { try { if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo('profile'); } catch (e) {} });
  } catch (e) {}
}

function renderAll() {
  renderGreeting();
  try { renderDashHello(); } catch (e) {}
  try { renderDayCard(); } catch (e) {}
  try { setAtmosphereVars(); } catch (e) {}
  try { renderDashConsistency(); } catch (e) {}
  try { const _cc = document.getElementById('commandCenter'); if (_cc) { _cc.innerHTML = renderCommandCenter(); bindCommandCenter(_cc); } } catch (e) {}
  try { updateCaptureFab(); } catch (e) {}
  try { renderDailyMemento(); } catch (e) {}
  try { renderHubConsistency(); } catch (e) {}
  CreatorTools.render();
  state.widgetOrder.forEach(({ key }) => {
    const el = document.querySelector(`.widget[data-widget="${key}"]`);
    if (!el) return;
    if (RENDERERS[key]) RENDERERS[key](el);
    // Re-render synthetic widgets that depend on changing state
    if (key === 'claritySphere') {
      el.innerHTML = renderClaritySphereCard();
      bindSyntheticWidget('claritySphere', el);
    }
  });
  // Keep the desktop sidebar's live blocks (today's action, streak, greeting)
  // in sync with state. No-op on mobile since Sidebar.el is null there.
  if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh();
  // Renders change page-1's height (next-step vs today's action states), so
  // the below-the-fold gap re-computes with them (v699).
  try { if (typeof HeroShrink !== 'undefined' && HeroShrink.layoutGap) HeroShrink.layoutGap(); } catch (e) {}
  // v703: the v702 floating cheat bar is retired, the bar (Today + You) exists
  // pre-star now, so the You panel and its cheat bar are always reachable.
}


/* ==================================================================== *
 * v1121 — CARD SKINS (Job B of the memento-view port; design law in
 * MEMENTO-SKINS.md). A skin drives the app's OWN layers through four
 * dials (the four lights, the platinum flood, the face, the read) and
 * NOTHING else: no new fonts, no new layout, no new components.
 * Malik's model: everyone ships on the house card (cyan/green/white);
 * paying unlocks coding the card to their NAME (deterministic hash +
 * a small personal drift) plus the full library via holding the card
 * inside the Memento view. The choice lives in state.cardSkin (synced).
 * ==================================================================== */
const CARD_SKINS = [
 /* ── tier one ─────────────────────────────────────────────── */
 {n:'Solar Flare', sk1:'rgba(255,170,0,1)', sk2:'rgba(255,230,120,1)', sk3:'rgba(255,120,0,1)', sk4:'rgba(255,200,60,.95)',
  plat:'.22', face:'linear-gradient(165deg,#3a2003,#1d0f01)', mark:'rgba(255,248,232,.97)', ink:'rgba(255,240,214,.9)'},
 {n:'Voltage',     sk1:'rgba(255,238,0,1)',   sk2:'rgba(190,255,60,.95)', sk3:'rgba(255,196,0,1)',  sk4:'rgba(230,255,120,.85)',
  plat:'.16', face:'linear-gradient(165deg,#1d1e04,#0d0e02)', mark:'rgba(255,253,230,.95)', ink:'rgba(252,255,214,.9)'},
 {n:'Obsidian Violet', sk1:'rgba(120,40,220,.9)', sk2:'rgba(40,10,90,.9)', sk3:'rgba(170,80,255,.75)', sk4:'rgba(20,6,40,.95)',
  plat:'.02', face:'linear-gradient(165deg,#08040e,#030106)', mark:'rgba(240,230,255,.95)', ink:'rgba(226,208,255,.8)'},
 {n:'Gold', sk1:'rgba(255,208,60,1)', sk2:'rgba(255,246,200,1)', sk3:'rgba(220,160,20,1)', sk4:'rgba(255,228,130,.95)',
  plat:'.52', face:'linear-gradient(165deg,#imagined,#000)'.replace('#imagined','#4a3608').replace('#000','#241a03'),
  mark:'rgba(40,28,2,.92)', ink:'rgba(58,42,6,.8)'},
 {n:'Matte Black', sk1:'none',sk2:'none',sk3:'none',sk4:'none',
  plat:'0', face:'linear-gradient(168deg,#1c1d20 0%,#141518 55%,#101113 100%)',
  mark:'rgba(244,246,250,.97)', ink:'rgba(226,231,240,.75)', cls:'flat',
  edge:'rgba(255,255,255,.92)', halo:'rgba(238,244,255,.40)', lift:'rgba(255,255,255,.05)'},
 {n:'Matte White', sk1:'none',sk2:'none',sk3:'none',sk4:'none',
  plat:'0', face:'linear-gradient(168deg,#f0f1f2 0%,#e7e8e9 55%,#dfe0e2 100%)',
  mark:'rgba(62,67,74,.95)', ink:'rgba(52,57,64,.7)', cls:'flat',
  edge:'rgba(255,255,255,.95)', halo:'rgba(240,244,252,.42)', lift:'rgba(255,255,255,.5)'},
 {n:'Pure Glass', sk1:'rgba(255,255,255,.5)', sk2:'rgba(255,255,255,.35)', sk3:'rgba(210,240,255,.45)', sk4:'rgba(255,255,255,.3)',
  plat:'.30', face:'linear-gradient(165deg,rgba(232,244,252,.55),rgba(206,226,242,.42))',
  mark:'rgba(96,120,140,.75)', ink:'rgba(48,72,92,.65)', cls:'glass',
  edge:'rgba(255,255,255,1)', halo:'rgba(210,238,255,.5)'},
 {n:'Void', sk1:'none',sk2:'none',sk3:'none',sk4:'none',
  plat:'0', face:'#000000',
  mark:'rgba(244,246,250,.97)', ink:'rgba(150,155,164,.62)', cls:'flat void',
  edge:'rgba(0,0,0,1)', halo:'rgba(0,0,0,1)', haloR:'70px', lift:'rgba(0,0,0,0)'},
 {n:'Emerald',     sk1:'rgba(0,220,130,1)',   sk2:'rgba(120,255,200,.9)', sk3:'rgba(0,150,90,1)',   sk4:'rgba(40,255,160,.85)',
  plat:'.12', face:'linear-gradient(165deg,#03150e,#010806)', mark:'rgba(232,255,246,.95)', ink:'rgba(214,255,238,.9)'},
 {n:'Crimson',     sk1:'rgba(255,30,70,1)',   sk2:'rgba(255,110,120,.9)', sk3:'rgba(150,0,40,1)',   sk4:'rgba(255,70,90,.9)',
  plat:'.10', face:'linear-gradient(165deg,#1c0308,#0b0103)', mark:'rgba(255,228,232,.95)', ink:'rgba(255,220,226,.85)'},
 {n:'Ice', sk1:'rgba(60,190,255,1)', sk2:'rgba(220,248,255,.9)', sk3:'rgba(0,140,220,.95)', sk4:'rgba(140,225,255,.9)',
  plat:'.46', face:'linear-gradient(165deg,#dff1fb,#c9e5f5)', mark:'rgba(20,58,80,.9)', ink:'rgba(14,48,68,.78)'},
 {n:'Magenta',     sk1:'rgba(255,0,170,1)',   sk2:'rgba(255,120,215,.9)', sk3:'rgba(170,0,140,1)',  sk4:'rgba(255,70,190,.9)',
  plat:'.10', face:'linear-gradient(165deg,#1a0316,#0a010a)', mark:'rgba(255,224,246,.95)', ink:'rgba(255,214,242,.85)'},
 /* ── tier two, behind View more ───────────────────────────── */
 {n:'Cobalt', sk1:'rgba(0,120,255,1)', sk2:'rgba(120,200,255,.95)', sk3:'rgba(0,60,220,1)', sk4:'rgba(60,160,255,.95)',
  plat:'.28', face:'linear-gradient(165deg,#031a4d,#010c26)', mark:'rgba(232,242,255,.96)', ink:'rgba(220,234,255,.88)'},
 {n:'Copper', sk1:'rgba(212,106,58,1)', sk2:'rgba(150,64,30,.95)', sk3:'rgba(240,150,100,.85)', sk4:'rgba(120,50,24,.9)',
  plat:'.34', face:'linear-gradient(165deg,#4a2415,#2a130a)', mark:'rgba(255,236,222,.95)', ink:'rgba(255,226,208,.85)'},
 {n:'Jade Gold',   sk1:'rgba(0,200,160,1)',   sk2:'rgba(255,215,90,.85)', sk3:'rgba(0,140,120,1)',  sk4:'rgba(120,255,210,.8)',
  plat:'.16', face:'linear-gradient(165deg,#04140f,#010706)', mark:'rgba(224,255,244,.95)', ink:'rgba(210,255,238,.85)'},
 {n:'Aurora',      sk1:'rgba(0,255,190,.95)', sk2:'rgba(150,90,255,.85)', sk3:'rgba(40,200,255,.9)', sk4:'rgba(255,90,200,.7)',
  plat:'.08', face:'linear-gradient(165deg,#050b12,#02040a)', mark:'rgba(238,246,255,.95)', ink:'rgba(222,238,255,.85)'},
 {n:'Sunset', sk1:'rgba(255,150,40,1)', sk2:'rgba(255,110,120,.95)', sk3:'rgba(255,200,90,.9)', sk4:'rgba(230,70,90,.9)',
  plat:'.40', face:'linear-gradient(165deg,#40130c,#1d0705)', mark:'rgba(255,244,234,.97)', ink:'rgba(255,232,216,.9)'},
 {n:'Sapphire', sk1:'rgba(20,40,180,1)', sk2:'rgba(60,20,150,.9)', sk3:'rgba(0,20,120,1)', sk4:'rgba(40,60,200,.9)',
  plat:'.05', face:'linear-gradient(165deg,#050726,#020310)', mark:'rgba(226,232,255,.95)', ink:'rgba(210,220,255,.82)'},
 {n:'Bone', sk1:'none',sk2:'none',sk3:'none',sk4:'none',
  plat:'0', face:'linear-gradient(168deg,#f4f0e8 0%,#ece7dc 55%,#e3ddd0 100%)',
  mark:'rgba(78,71,60,.94)', ink:'rgba(66,60,50,.72)', cls:'flat',
  edge:'rgba(255,253,246,.9)', halo:'rgba(246,238,222,.38)', lift:'rgba(255,255,255,.45)'},
 {n:'Toxic',       sk1:'rgba(180,255,0,1)',   sk2:'rgba(0,255,140,.9)', sk3:'rgba(120,200,0,1)',  sk4:'rgba(220,255,80,.85)',
  plat:'.10', face:'linear-gradient(165deg,#0f1603,#050801)', mark:'rgba(246,255,224,.95)', ink:'rgba(238,255,200,.9)'},
 {n:'Titanium', sk1:'rgba(226,232,240,.9)', sk2:'rgba(255,255,255,.95)', sk3:'rgba(150,162,178,.85)', sk4:'rgba(200,210,224,.8)',
  plat:'.80', face:'linear-gradient(165deg,#c9cfd8,#b3bac4)', mark:'rgba(52,58,66,.92)', ink:'rgba(44,50,58,.75)', cls:'glass'},
 {n:'Blush',       sk1:'rgba(255,180,200,.95)', sk2:'rgba(255,225,235,.9)', sk3:'rgba(240,140,175,.9)', sk4:'rgba(255,205,220,.85)',
  plat:'.58', face:'linear-gradient(165deg,#fbeef2,#f4e2e8)', mark:'#6b4a55', ink:'rgba(70,44,52,.75)'},
 {n:'Ultraviolet', sk1:'rgba(160,60,255,1)', sk2:'rgba(220,160,255,1)', sk3:'rgba(120,0,255,1)', sk4:'rgba(190,110,255,.95)',
  plat:'.30', face:'linear-gradient(165deg,#1d0640,#0c0220)', mark:'rgba(248,240,255,.97)', ink:'rgba(240,224,255,.9)'},
 {n:'Matte Clay', sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#6d3a2c,#5c3024 55%,#4c261c)', mark:'rgba(255,238,230,.95)', ink:'rgba(252,230,220,.75)',
  cls:'flat', edge:'rgba(255,226,212,.42)', halo:'rgba(220,140,110,.16)'},
 {n:'Matte Forest', sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#14311f,#0e2617 55%,#091c11)', mark:'rgba(236,250,240,.96)', ink:'rgba(222,242,228,.7)',
  cls:'flat', edge:'rgba(180,232,196,.4)', halo:'rgba(100,200,140,.14)'},
 {n:'Matte Navy', sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#3a5a94,#2f4a7d 55%,#264066)', mark:'rgba(240,246,255,.96)', ink:'rgba(228,238,255,.78)',
  cls:'flat', edge:'rgba(226,238,255,.6)', halo:'rgba(150,190,255,.24)'},
 {n:'Matte Sand', sk1:'none',sk2:'none',sk3:'none',sk4:'none',
  plat:'0', face:'linear-gradient(168deg,#dccBa8 0%,#d2c09a 55%,#c7b48d 100%)',
  mark:'rgba(52,44,30,.92)', ink:'rgba(48,40,26,.72)', cls:'flat',
  edge:'rgba(255,250,238,.7)', halo:'rgba(244,228,196,.3)', lift:'rgba(255,255,255,.28)'},
 {n:'Midnight',    sk1:'rgba(30,60,140,.9)',  sk2:'rgba(70,110,190,.8)', sk3:'rgba(10,25,70,.9)', sk4:'rgba(50,90,170,.8)',
  plat:'.08', face:'linear-gradient(165deg,#060a16,#02030a)', mark:'rgba(226,234,250,.92)', ink:'rgba(212,224,246,.8)'},
 /* ── tier three: 20 more ──────────────────────────────────── */
 {n:'Nebula', sk1:'rgba(80,40,200,1)', sk2:'rgba(30,14,70,.98)', sk3:'rgba(210,60,255,.85)', sk4:'rgba(20,10,50,.98)',
  plat:'.03', face:'linear-gradient(165deg,#07051a,#02010a)', mark:'rgba(238,232,255,.96)', ink:'rgba(220,208,255,.8)'},
 {n:'Oil Slick', sk1:'rgba(0,190,140,.95)', sk2:'rgba(180,140,40,.85)', sk3:'rgba(60,40,140,.8)', sk4:'rgba(0,140,150,.85)',
  plat:'.04', face:'linear-gradient(165deg,#080a09,#020303)', mark:'rgba(236,244,240,.96)', ink:'rgba(214,232,226,.8)'},
 {n:'Blood Orange', sk1:'rgba(255,40,10,1)', sk2:'rgba(190,0,30,.95)', sk3:'rgba(255,90,0,.9)', sk4:'rgba(140,0,20,.95)',
  plat:'.06', face:'linear-gradient(165deg,#160203,#070001)', mark:'rgba(255,232,226,.96)', ink:'rgba(255,214,206,.85)'},
 {n:'Moss', sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#8a9a52,#7a8946 55%,#6c7a3c)', mark:'rgba(30,34,16,.9)', ink:'rgba(34,38,18,.75)',
  cls:'flat', edge:'rgba(244,250,220,.6)', halo:'rgba(200,222,140,.24)'},
 {n:'Porcelain', sk1:'rgba(255,255,255,.95)', sk2:'rgba(255,255,255,1)', sk3:'rgba(250,250,252,.9)', sk4:'rgba(255,255,255,.9)',
  plat:'.99', face:'linear-gradient(165deg,#ffffff,#fafbfc)', mark:'rgba(120,126,134,.85)', ink:'rgba(88,94,104,.7)'},
 {n:'Graphite', sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#8a9098,#787e86 55%,#686e76)', mark:'rgba(28,32,38,.9)', ink:'rgba(30,34,40,.72)',
  cls:'flat', edge:'rgba(255,255,255,.75)', halo:'rgba(226,232,240,.3)', lift:'rgba(255,255,255,.18)'},
 {n:'Neon Noir', sk1:'rgba(255,0,120,1)', sk2:'rgba(0,0,0,0)', sk3:'rgba(0,240,255,1)', sk4:'rgba(0,0,0,0)',
  plat:'0', face:'linear-gradient(165deg,#050506,#010102)', mark:'rgba(255,255,255,.98)', ink:'rgba(255,220,240,.9)',
  edge:'rgba(255,60,160,.5)', halo:'rgba(255,0,120,.2)'},
 {n:'Champagne', sk1:'rgba(226,192,120,.95)', sk2:'rgba(250,234,196,.9)', sk3:'rgba(198,158,86,.9)', sk4:'rgba(238,214,160,.85)',
  plat:'.44', face:'linear-gradient(165deg,#efe2c8,#e2d0ad)', mark:'rgba(84,66,38,.9)', ink:'rgba(70,54,30,.75)'},
 {n:'Storm', sk1:'rgba(40,60,90,.95)', sk2:'rgba(90,120,160,.6)', sk3:'rgba(10,18,32,.95)', sk4:'rgba(60,86,124,.7)',
  plat:'.04', face:'linear-gradient(165deg,#0d1219,#05070b)', mark:'rgba(226,236,250,.95)', ink:'rgba(204,220,242,.75)'},
 {n:'Coral', sk1:'rgba(255,140,120,.95)', sk2:'rgba(255,210,196,.9)', sk3:'rgba(255,110,90,.85)', sk4:'rgba(255,180,164,.85)',
  plat:'.62', face:'linear-gradient(165deg,#ffeae4,#ffd9cf)', mark:'rgba(120,54,42,.9)', ink:'rgba(102,44,34,.75)'},
 {n:'Deep Sea', sk1:'rgba(0,180,170,.95)', sk2:'rgba(0,90,110,.9)', sk3:'rgba(0,230,200,.7)', sk4:'rgba(0,60,80,.95)',
  plat:'.04', face:'linear-gradient(165deg,#01100f,#000606)', mark:'rgba(220,248,244,.95)', ink:'rgba(200,242,236,.8)'},
 {n:'Terracotta', sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#c9764f,#b56541 55%,#a25835)', mark:'rgba(255,246,240,.96)', ink:'rgba(255,238,230,.8)',
  cls:'flat', edge:'rgba(255,242,232,.65)', halo:'rgba(255,196,160,.26)'},
 {n:'Prism', sk1:'rgba(255,0,80,.95)', sk2:'rgba(255,230,0,.9)', sk3:'rgba(0,220,120,.9)', sk4:'rgba(60,90,255,.95)',
  plat:'.30', face:'linear-gradient(165deg,#fbfcff,#eef1f7)', mark:'rgba(50,56,68,.9)', ink:'rgba(36,42,54,.78)', cls:'glass'},
 {n:'Ink', sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#0d1426,#08101e 55%,#050a15)', mark:'rgba(232,240,255,.96)', ink:'rgba(206,222,250,.72)',
  cls:'flat', edge:'rgba(150,190,255,.4)', halo:'rgba(90,140,255,.16)'},
 {n:'Peach',       sk1:'rgba(255,180,140,.95)', sk2:'rgba(255,224,200,.9)', sk3:'rgba(255,140,170,.85)', sk4:'rgba(255,200,170,.85)',
  plat:'.6', face:'linear-gradient(165deg,#fdf0e8,#f8e2d6)', mark:'rgba(110,72,58,.9)', ink:'rgba(90,58,46,.72)'},
 {n:'Volcanic', sk1:'rgba(255,90,0,1)', sk2:'rgba(40,10,6,.95)', sk3:'rgba(255,180,40,.85)', sk4:'rgba(20,6,4,.98)',
  plat:'0', face:'linear-gradient(168deg,#0d0403,#050101 60%,#020101)', mark:'rgba(255,226,200,.95)', ink:'rgba(255,200,164,.8)',
  edge:'rgba(255,140,60,.45)', halo:'rgba(255,110,20,.22)'},
 {n:'Mint', sk1:'rgba(80,255,200,1)', sk2:'rgba(200,255,236,.9)', sk3:'rgba(0,200,150,.95)', sk4:'rgba(140,255,220,.85)',
  plat:'.40', face:'linear-gradient(165deg,#d8f7ec,#c2eddd)', mark:'rgba(16,72,56,.9)', ink:'rgba(12,62,48,.78)'},
 {n:'Oxblood',     sk1:'none',sk2:'none',sk3:'none',sk4:'none', plat:'0',
  face:'linear-gradient(168deg,#5c1a20,#4a1419 55%,#3c0f14)', mark:'rgba(255,238,238,.96)', ink:'rgba(250,224,224,.75)',
  cls:'flat', edge:'rgba(255,224,224,.5)', halo:'rgba(255,150,150,.18)'},
 {n:'Solar Wind', sk1:'rgba(255,236,180,.95)', sk2:'rgba(255,180,90,.9)', sk3:'rgba(255,255,240,.8)', sk4:'rgba(255,210,140,.85)',
  plat:'.50', face:'linear-gradient(165deg,#2a2013,#140f08)', mark:'rgba(255,250,240,.97)', ink:'rgba(255,244,224,.88)'},
 {n:'Pearl', sk1:'rgba(255,170,215,.85)', sk2:'rgba(170,225,255,.85)', sk3:'rgba(255,240,170,.8)', sk4:'rgba(200,180,255,.85)',
  plat:'.52', face:'linear-gradient(165deg,#fbf7ff,#eef4fb)', mark:'rgba(92,84,106,.9)', ink:'rgba(70,62,86,.72)', cls:'glass'},
 {n:'Thermal',     sk1:'rgba(30,60,255,1)', sk2:'rgba(0,220,255,.95)', sk3:'rgba(255,230,0,1)', sk4:'rgba(255,110,0,1)',
  plat:'.06', face:'linear-gradient(165deg,#04061a,#01020a)', mark:'rgba(240,246,255,.97)', ink:'rgba(226,238,255,.88)',
  edge:'rgba(120,180,255,.5)', halo:'rgba(60,120,255,.26)'},
 {n:'Heat Rise',   sk1:'rgba(255,150,0,1)', sk2:'rgba(255,60,0,.9)', sk3:'rgba(255,230,140,.85)', sk4:'rgba(10,6,4,.98)',
  plat:'0', face:'linear-gradient(0deg,#f08a10 -18%,#3a1200 16%,#0a0503 44%,#050303 100%)',
  mark:'rgba(255,248,240,.97)', ink:'rgba(255,232,204,.85)', edge:'rgba(255,180,90,.32)', halo:'rgba(255,140,20,.2)'},
 {n:'Density',     sk1:'rgba(60,40,255,1)', sk2:'rgba(20,10,120,.95)', sk3:'rgba(120,220,255,.95)', sk4:'rgba(10,4,60,.98)',
  plat:'.04', face:'linear-gradient(165deg,#04021a,#010008)', mark:'rgba(232,240,255,.96)', ink:'rgba(190,214,255,.85)',
  edge:'rgba(120,160,255,.45)', halo:'rgba(60,60,255,.22)'},
 {n:'Elevation',   sk1:'rgba(255,190,90,.9)', sk2:'rgba(150,200,235,.85)', sk3:'rgba(120,205,175,.85)', sk4:'rgba(240,120,110,.8)',
  plat:'.46', face:'linear-gradient(165deg,#e9e6dc,#dcd8cc)', mark:'rgba(70,74,86,.9)', ink:'rgba(56,60,72,.78)'},
];

function _skHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// coded to their name: the same material every time for the same person,
// plus a small hue drift inside the family so no two feel identical
function skinForName(name) {
  const h = _skHash(String(name || 'memento').trim().toLowerCase());
  const sk = CARD_SKINS[h % CARD_SKINS.length];
  return Object.assign({}, sk, { rot: ((h >>> 7) % 22) - 11 });
}

// The material's own colour, for the room it sits in and for the app's
// accent. Flat/void materials have no light, so their edge (or a neutral)
// stands in.
function skinTintRgb(sk) {
  const pick = [sk && sk.sk1, sk && sk.edge, sk && sk.sk2].find(v => v && v !== 'none');
  const m = String(pick || '').match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? (m[1] + ',' + m[2] + ',' + m[3]) : '226,232,240';
}
function _rgbToHex(rgb) {
  const p = String(rgb).split(',').map(n => Math.max(0, Math.min(255, parseInt(n, 10) || 0)));
  return '#' + p.map(n => n.toString(16).padStart(2, '0')).join('');
}

// v1126 (Malik: 'make the memento theme the theme of the app'): the chosen
// material drives the app's accent through the EXISTING accent pipeline
// (prefs.accent = custom + accentCustom), so every surface that already
// reads --accent follows with no new plumbing. Only fires when the choice
// actually changes, never on every render. Returning to the house card
// restores whatever accent they had before their first material.
let _skinAccentApplied = null;
function syncAppAccentToSkin(sk) {
  try {
    // v1152 (Malik): the Memento colours the app BY DEFAULT, with an opt-out
    // in the hold-sheet. Off = the accent snaps back to their own; the card,
    // its room and its rim keep the material either way (they ARE the skin).
    if (state.prefs && state.prefs.skinColorsApp === false) sk = null;
    const id = sk ? sk.n : '';
    if (_skinAccentApplied === id) return;
    if (!state.prefs) return;
    if (sk) {
      if (!state.cardSkin.prevAccent) {
        state.cardSkin.prevAccent = { accent: state.prefs.accent || 'default', accentCustom: state.prefs.accentCustom || '' };
      }
      state.prefs.accent = 'custom';
      state.prefs.accentCustom = _rgbToHex(skinTintRgb(sk));
    } else if (state.cardSkin && state.cardSkin.prevAccent) {
      state.prefs.accent = state.cardSkin.prevAccent.accent || 'default';
      if (state.cardSkin.prevAccent.accentCustom) state.prefs.accentCustom = state.cardSkin.prevAccent.accentCustom;
      state.cardSkin.prevAccent = null;
    }
    _skinAccentApplied = id;
    try { persistNow(); } catch (e) {}
    try { applyPrefs(); } catch (e) {}
  } catch (e) {}
}

function activeCardSkin() {
  try {
    if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) return null;
    const pick = state.cardSkin && state.cardSkin.id;
    if (!pick) return null;
    if (pick === 'name') return skinForName((state.profile && state.profile.name) || '');
    return CARD_SKINS.find(s => s.n === pick) || null;
  } catch (e) { return null; }
}

const _SKIN_VARS = ['--sk1', '--sk2', '--sk3', '--sk4', '--plat-op', '--face', '--mark', '--ink', '--edge', '--halo', '--mm-hue', '--lit', '--glow', '--emit', '--ring', '--clar', '--act', '--cons', '--mix'];

// Applies (or clears) the material on a card wrap. Always called AFTER
// setLivingCardVars, so clearing can simply re-run it to restore stock.
function applyCardSkin(wrap) {
  if (!wrap) return;
  const sk = activeCardSkin();
  // the room the card sits in takes the material's colour (js/08 sets it,
  // the view's CSS reads it). No material = the app's own accent.
  try {
    if (sk) {
      const tint = skinTintRgb(sk);
      document.documentElement.style.setProperty('--skin-rgb', tint);
      // v1152: the record's rim wears the material too, lifted toward white
      // so it still reads as light. Set globally so a skin change recolours
      // an open record live.
      const lift = String(tint).split(',').map(n => { const v = parseFloat(n) || 0; return Math.round(v + (255 - v) * 0.45); });
      document.documentElement.style.setProperty('--rim-c', 'rgb(' + lift.join(',') + ')');
      document.documentElement.style.setProperty('--rim-rgb', lift.join(','));
    } else {
      document.documentElement.style.removeProperty('--skin-rgb');
      document.documentElement.style.removeProperty('--rim-c');
      document.documentElement.style.removeProperty('--rim-rgb');
    }
  } catch (e) {}
  syncAppAccentToSkin(sk);
  if (!sk) {
    if (wrap.dataset.skin) {
      delete wrap.dataset.skin;
      delete wrap.dataset.skinMark;
      wrap.classList.remove('sk-flat', 'sk-void', 'sk-glass');
      _SKIN_VARS.forEach(v => wrap.style.removeProperty(v));
      try { setLivingCardVars(wrap); } catch (e) {}
    }
    // v1227 (Malik: the ring is missing on the house Memento). The house card
    // carries the ring choice too, so the Memento view's ring honours White vs
    // Matched even with no material (Matched falls back to the app accent).
    wrap.dataset.skinRing = (state.cardSkin && state.cardSkin.ring) ? '1' : '0';
    return;
  }
  const S = wrap.style;
  S.setProperty('--sk1', sk.sk1 || 'none');
  S.setProperty('--sk2', sk.sk2 || 'none');
  S.setProperty('--sk3', sk.sk3 || 'none');
  S.setProperty('--sk4', sk.sk4 || sk.sk1 || 'none');
  S.setProperty('--plat-op', sk.plat || '0');
  S.setProperty('--face', sk.face || '#0b0d12');
  S.setProperty('--mark', sk.mark || 'rgba(244,246,250,.97)');
  S.setProperty('--ink', sk.ink || 'rgba(226,231,240,.75)');
  S.setProperty('--edge', sk.edge || (sk.sk1 && sk.sk1 !== 'none' ? sk.sk1 : 'rgba(255,255,255,.9)'));
  S.setProperty('--halo', sk.halo || (sk.sk1 && sk.sk1 !== 'none' ? sk.sk1 : 'rgba(238,244,255,.34)'));
  S.setProperty('--mm-hue', (sk.rot || 0) + 'deg');
  // A material owns the hue outright: the app's cyan/platinum/green washes
  // go OFF or they bleed through and muddy the face (the green haze at the
  // foot of Crimson). The material's own lights carry the brightness.
  S.setProperty('--clar', '0');
  S.setProperty('--act', '0');
  S.setProperty('--cons', '0');
  S.setProperty('--mix', '.9');
  // What the earned layers still drive is how much LIGHT there is: the same
  // count the mockup used (pillars earned -> brightness), so a day-1 card in
  // Crimson is dimmer than a day-50 one and the copy stays honest.
  let n = 3;
  try { const L2 = livingCardLevels(); n = (L2.clar > 0 ? 1 : 0) + (L2.act > 0 ? 1 : 0) + (L2.cons > 0 ? 1 : 0); } catch (e) {}
  S.setProperty('--lit', n ? String(0.34 + n * 0.22) : '0');
  S.setProperty('--glow', n ? '.7' : '0');
  S.setProperty('--emit', n ? '.7' : '0');
  S.setProperty('--ring', n ? '.5' : '0');
  wrap.dataset.skin = sk.n;
  wrap.dataset.skinRing = (state.cardSkin && state.cardSkin.ring) ? '1' : '0';
  wrap.dataset.skinMark = (state.cardSkin && state.cardSkin.mark) ? '1' : '0';
  const cls = String(sk.cls || '');
  wrap.classList.toggle('sk-flat', cls.indexOf('flat') !== -1);
  wrap.classList.toggle('sk-void', cls.indexOf('void') !== -1);
  wrap.classList.toggle('sk-glass', cls.indexOf('glass') !== -1);
}

// a chip is the same card, small and static (no aura, no bloom: at 62px the
// halo is bigger than the card and every material reads white)
function _skChipHtml(sk, id, label, pressed) {
  // v1166 (Malik): the three colour blobs used to sit at the SAME spots on
  // every tile, so 54 materials read as one template in 54 paints. Their
  // positions now scatter per material, hashed from its own name, so the
  // field looks alive and a given material always looks like itself.
  let _h = 2166136261;
  const _key = String((sk && sk.n) || id || 'stock');
  for (let _i = 0; _i < _key.length; _i++) { _h ^= _key.charCodeAt(_i); _h = Math.imul(_h, 16777619); }
  const _pick = (n, lo, hi) => {
    let x = Math.imul(_h ^ (n * 2654435761), 2246822507);
    x = (x ^ (x >>> 15)) >>> 0;
    return Math.round(lo + (x % 1000) / 1000 * (hi - lo));
  };
  const _scatter = [
    '--b1x:' + _pick(1, -22, 6) + '%', '--b1y:' + _pick(2, -16, 14) + '%',
    '--b2x:' + _pick(3, -20, 4) + '%', '--b2y:' + _pick(4, 12, 46) + '%',
    '--b3x:' + _pick(5, -8, 22) + '%', '--b3y:' + _pick(6, -20, 6) + '%'
  ].join(';');
  const v = sk ? [
    '--sk1:' + (sk.sk1 || 'none'), '--sk2:' + (sk.sk2 || 'none'),
    '--sk3:' + (sk.sk3 || 'none'), '--sk4:' + (sk.sk4 || sk.sk1 || 'none'),
    '--plat-op:' + (sk.plat || '0'), '--face:' + (sk.face || '#0b0d12'),
    '--mark:' + (sk.mark || 'rgba(244,246,250,.97)'),
    '--halo:' + (sk.sk1 || 'transparent'),   // the tile's own soft glow
    _scatter
  ].join(';') : _scatter;
  const cls = sk ? String(sk.cls || '').split(' ').filter(Boolean).map(c => 'sk-' + c).join(' ') : 'sk-stock';
  return '<button class="mfsk-chip" type="button" data-skin-id="' + esc(id) + '" aria-pressed="' + (pressed ? 'true' : 'false') + '">' +
    '<span class="mfsk-cage ' + cls + '" style="' + esc(v) + '">' +
      '<span class="mfsk-mini">' +
        (sk ? '<i class="mfsk-b mfsk-b1"></i><i class="mfsk-b mfsk-b2"></i><i class="mfsk-b mfsk-b3"></i>' : '<i class="mfsk-b mfsk-stock1"></i><i class="mfsk-b mfsk-stock2"></i>') +
        '<span class="mfsk-plat"></span><span class="mfsk-rim"></span>' +
        '<svg class="mfsk-m" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"></path></svg>' +
      '</span>' +
    '</span>' +
    '<span class="mfsk-chip__n">' + esc(label) + '</span>' +
  '</button>';
}

// The customiser: held open from the card inside the Memento view. Paid only
// (the house card is everyone's default; the material is what they own).
/* v1162 (Malik): the EDITOR and the record are two separate things. The sheet
   markup + wiring live here so it can be mounted anywhere: inside the record
   (the hint by the plaque) or straight onto the HOME, where holding the card
   must never reveal the inside of the Memento. host = where it mounts,
   onClose = what to do after Done/scrim. */
function _mfBuildSkinSheet(host, wrap, sig, onClose) {
  const yoursName = (state.profile && state.profile.name) || '';
  const cur = () => (state.cardSkin && state.cardSkin.id) || '';
  const sheet = document.createElement('div');
  sheet.className = 'mfsk-wrap';
  sheet.hidden = true;
  sheet.innerHTML =
    '<div class="mfsk-scrim"></div>' +
    '<div class="mfsk-sheet" role="dialog" aria-label="Themes">' +
      '<span class="mfsk-grab" aria-hidden="true"></span>' +
      '<div class="mfsk-strip">' +
        _skChipHtml(null, '', 'Default', cur() === '') +
        (yoursName ? _skChipHtml(skinForName(yoursName), 'name', 'Yours', cur() === 'name') : '') +
        CARD_SKINS.map(s => _skChipHtml(s, s.n, s.n, cur() === s.n)).join('') +
      '</div>' +
      // v1127: the app accent lives HERE now (it left Settings). A material
      // sets it automatically; these let them push it somewhere else.
      '<div class="mfsk-acc" id="mfskAcc">' +
        (typeof ACCENT_CHOICES !== 'undefined' ? ACCENT_CHOICES.filter(a => a !== 'custom').map(a =>
          '<button type="button" class="mfsk-acc__sw' + ((state.prefs && state.prefs.accent) === a ? ' is-on' : '') + '" data-acc="' + a + '" aria-label="' + a + ' accent"><i style="background:' + (a === 'default' ? 'linear-gradient(135deg,#3ad9f5,#3fd94e)' : (typeof ACCENT_HEX !== 'undefined' && ACCENT_HEX[a]) || '#888') + '"></i></button>').join('') : '') +
      '</div>' +
      '<div class="mfsk-tog">' +
        '<div class="mfsk-tog__g" data-tog="colorapp">' +
          '<button type="button" data-v="1"' + (!(state.prefs && state.prefs.skinColorsApp === false) ? ' class="on"' : '') + '>Colours the app</button>' +
          '<button type="button" data-v="0"' + ((state.prefs && state.prefs.skinColorsApp === false) ? ' class="on"' : '') + '>Card only</button>' +
        '</div>' +
        '<div class="mfsk-tog__g" data-tog="ring">' +
          '<button type="button" data-v="0"' + (!(state.cardSkin && state.cardSkin.ring) ? ' class="on"' : '') + '>White ring</button>' +
          '<button type="button" data-v="1"' + ((state.cardSkin && state.cardSkin.ring) ? ' class="on"' : '') + '>Colour-matched</button>' +
        '</div>' +
        '<div class="mfsk-tog__g" data-tog="mark">' +
          '<button type="button" data-v="0"' + (!(state.cardSkin && state.cardSkin.mark) ? ' class="on"' : '') + '>Plain M</button>' +
          '<button type="button" data-v="1"' + ((state.cardSkin && state.cardSkin.mark) ? ' class="on"' : '') + '>Tinted M</button>' +
        '</div>' +
      '</div>' +
      '<button class="mfsk-done" type="button">Done</button>' +
    '</div>';
  host.appendChild(sheet);

  const openSheet = () => {
    wrap.classList.remove('is-pressing');
    sheet.hidden = false;
    void sheet.offsetHeight;   // commit the closed transform before the slide
    sheet.classList.add('is-open');
    try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  };
  const closeSheet = () => {
    sheet.classList.remove('is-open');
    // Only hide if it has not been re-opened in the meantime, and never leave
    // it un-hidden if the timer is throttled away: the record's own close
    // hides it too (v1147).
    setTimeout(() => { if (!sheet.classList.contains('is-open')) sheet.hidden = true; }, 280);
    try { if (onClose) onClose(); } catch (e) {}
  };

  sheet.querySelector('.mfsk-scrim').addEventListener('click', closeSheet);
  sheet.querySelector('.mfsk-done').addEventListener('click', closeSheet);

  sheet.querySelector('.mfsk-strip').addEventListener('click', (e) => {
    const b = e.target.closest('.mfsk-chip');
    if (!b) return;
    if (!state.cardSkin) state.cardSkin = { id: '', ring: 0, mark: 0 };
    state.cardSkin.id = b.getAttribute('data-skin-id') || '';
    try { persistNow(); } catch (err) {}
    applyCardSkin(wrap);
    sheet.querySelectorAll('.mfsk-chip').forEach(c =>
      c.setAttribute('aria-pressed', c === b ? 'true' : 'false'));
  });
  const accWrap = sheet.querySelector('#mfskAcc');
  if (accWrap) accWrap.addEventListener('click', (e) => {
    const b = e.target.closest('.mfsk-acc__sw');
    if (!b) return;
    try {
      state.prefs.accent = b.getAttribute('data-acc');
      // a hand-picked accent is a deliberate override of the material's own
      if (state.cardSkin) state.cardSkin.prevAccent = null;
      _skinAccentApplied = state.cardSkin ? (state.cardSkin.id || '') : '';
      persistNow();
      applyPrefs();
      accWrap.querySelectorAll('.mfsk-acc__sw').forEach(x => x.classList.toggle('is-on', x === b));
    } catch (err) {}
  });
  sheet.querySelectorAll('.mfsk-tog__g').forEach(g => {
    g.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const key = g.getAttribute('data-tog');
      if (key === 'colorapp') {
        // v1152: whether the Memento's colour flows into the app (default yes)
        if (!state.prefs) state.prefs = {};
        state.prefs.skinColorsApp = b.getAttribute('data-v') === '1';
      } else {
        if (!state.cardSkin) state.cardSkin = { id: '', ring: 0, mark: 0 };
        state.cardSkin[key] = b.getAttribute('data-v') === '1' ? 1 : 0;
      }
      try { persistNow(); } catch (err) {}
      applyCardSkin(wrap);
      g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
  });

  return { sheet: sheet, openSheet: openSheet, closeSheet: closeSheet };
}

function _mfSkinsInit(ov, wrap, sig) {
  if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) return;
  if (!ov || !wrap) return;
  const scroll = ov.querySelector('.mf__scroll');
  if (!scroll) return;

  // the one line left in the page flow; without it the gesture is undiscoverable
  const hint = document.createElement('button');
  hint.className = 'mfsk-hint';
  hint.type = 'button';
  hint.textContent = 'Hold the card to change its theme.';
  // v1151: the plaque lives inside .in-col now, so the hint is inserted in
  // the plaque's own parent (insertBefore on the scroller threw and silently
  // killed the whole sheet).
  const origin = scroll.querySelector('.mf-origin');
  if (origin) origin.parentElement.insertBefore(hint, origin); else scroll.appendChild(hint);

  const _sk = _mfBuildSkinSheet(ov, wrap, sig, null);
  const sheet = _sk.sheet, openSheet = _sk.openSheet, closeSheet = _sk.closeSheet;
  hint.addEventListener('click', openSheet);

  /* HOLD the card. iOS kills a long press three ways (callout, selection,
     jitter-cancel), so: cancel on 12px of MOVEMENT not on pointerleave,
     touch events are the primary path, contextmenu is a second way in.
     Ported from the mockup verbatim; do not rewrite (PORT-MEMENTO-VIEW.md). */
  const HOLD_MS = 380, SLOP = 12;
  let holdT = null, hx = 0, hy = 0, armed = false;
  const pressStart = (x, y) => {
    if (armed) return;
    // v1144: the record is persistent, so these listeners now outlive the view.
    // Holding the card on the HOME must do nothing; customising belongs to the
    // record. (Same cause as the tap bug above.)
    try { if (typeof MementoView === 'undefined' || !MementoView.isActive()) return; } catch (e) { return; }
    armed = true; hx = x; hy = y;
    const w2 = document.querySelector('#dayCard .daycard-wrap');
    if (w2) w2.classList.add('is-pressing');
    clearTimeout(holdT);
    holdT = setTimeout(() => { armed = false; holdT = null; openSheet(); }, HOLD_MS);
  };
  const pressMove = (x, y) => {
    if (!armed) return;
    if (Math.abs(x - hx) > SLOP || Math.abs(y - hy) > SLOP) pressEnd();
  };
  const pressEnd = () => {
    armed = false;
    document.querySelectorAll('.daycard-wrap.is-pressing').forEach((n) => n.classList.remove('is-pressing'));
    clearTimeout(holdT); holdT = null;
  };
  const P = Object.assign({ passive: true }, sig || {});
  // v1144: bound to #dayCard, not .daycard-wrap. The renderer replaces the wrap,
  // which silently unbound the hold mid-view (same cause as the eaten tap).
  const holdHost = document.getElementById('dayCard') || wrap;
  holdHost.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) pressStart(t.clientX, t.clientY); }, P);
  holdHost.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) pressMove(t.clientX, t.clientY); }, P);
  ['touchend', 'touchcancel'].forEach(ev => holdHost.addEventListener(ev, pressEnd, P));
  holdHost.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; pressStart(e.clientX, e.clientY); }, sig);
  ov.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; pressMove(e.clientX, e.clientY); }, sig);
  ['pointerup', 'pointercancel'].forEach(ev => ov.addEventListener(ev, (e) => { if (e.pointerType !== 'touch') pressEnd(); }, sig));
  holdHost.addEventListener('contextmenu', (e) => {
    try { if (typeof MementoView === 'undefined' || !MementoView.isActive()) return; } catch (e2) { return; }
    e.preventDefault(); if (sheet.hidden) openSheet();
  }, sig);
}
