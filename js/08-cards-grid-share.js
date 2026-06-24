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
    // Unified activity set so the widget dots match Month/Heatmap/Chain and the count.
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
        const isDone = (counts[dateStr] || 0) > 0;
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
        const active = ((counts[dateStr] || 0) > 0) ? 'widget__streak-dot--active' : '';
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
    const yearsEl = c.querySelector('.widget__big-num');
    const daysEl = c.querySelector('#moriDays');
    const weeksEl = c.querySelector('#moriWeeks');
    const reminderEl = c.querySelector('#moriReminder');
    if (state.mori.birthYear) {
      const left = moriYearsRemaining(state.mori.birthYear, state.mori.lifeExpectancy);
      const daysLeft = Math.round(left * 365.25);
      yearsEl.textContent = Math.floor(left);
      if (daysEl) daysEl.textContent = daysLeft.toLocaleString() + ' days';
      if (weeksEl) weeksEl.textContent = 'Week ' + moriWeeksLived(state.mori.birthYear).toLocaleString() + ' of ' + moriTotalWeeks(state.mori.lifeExpectancy).toLocaleString();
    } else {
      yearsEl.textContent = '--';
      if (daysEl) daysEl.textContent = 'Set your birth year';
      if (weeksEl) weeksEl.textContent = '';
    }
    if (reminderEl) reminderEl.textContent = state.mori.reminderText || 'Make it count.';
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
  const hasNeutronStar = !!(state.clarity && state.clarity.answers && state.clarity.answers.neutronStar);
  document.body.classList.toggle('ns-bloom', hasNeutronStar);

  // Paywall lock: once Clarity is done but they have not paid, every module but
  // Clarity reads as locked on the dashboard (tapping one rises the paywall).
  let _cpwLocked = false;
  try { _cpwLocked = (typeof ClarityPaywall !== 'undefined') && ClarityPaywall.isLockedByPaywall('action'); } catch (e) {}
  document.body.classList.toggle('cpw-locked', _cpwLocked);

  // v27 bento opt-out flag (kept current above the early returns so a stale
  // has-custom-layout can never linger on brand-new / pre-clarity renders).
  const _customized = !!(state.ui && state.ui.layoutCustomized);
  document.body.classList.toggle('has-custom-layout', _customized);

  // Brand-new user: the welcome hero (command center) is the whole dashboard.
  // No module cards, no More strip; everything appears as it unlocks.
  if (isBrandNewUser()) return;

  // Pre-Clarity (Malik): the dashboard is ONLY the welcome + Start-here hero.
  // No module cards at all, no More strip, no capture button (CSS keys off
  // body.pre-clarity); the journey starts when the goal exists.
  const _preClarity = !(state.clarity && state.clarity.completed);
  document.body.classList.toggle('pre-clarity', _preClarity);
  if (_preClarity) return;

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

    // Standard top-row for every widget. (The only picture-frame widget,
    // Personality, was removed, so there is no longer a skip case.)
    inner += `<div class="widget__top-row"><div class="widget__label-group"><div class="widget__icon" style="color:var(--color-${def.color})">${def.icon}</div><div class="widget__label">${def.label}</div></div><div class="widget__arrow">›</div></div>`;

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
        inner += `<div class="widget__big-num" style="font-size:2rem">--</div>`;
        inner += `<div class="widget__big-unit">years left</div>`;
        inner += `<div class="widget__secondary" id="moriDays"></div>`;
        inner += `<div class="widget__secondary" id="moriWeeks"></div>`;
        inner += `<div class="widget__secondary" id="moriReminder" style="margin-top:2px;font-style:italic"></div>`;
        break;
      case 'vivere':
        // Today's life practice at a glance. Filled by RENDERERS.vivere.
        inner += `<div class="widget__title" id="vivWidgetCat" style="font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-vivere);font-weight:700;">Today's practice</div>`;
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
        inner += `<div class="widget__big-num" style="color:var(--color-deepwork);text-shadow:0 0 15px rgba(255,159,10,0.3)" id="dwWidgetCount">0</div>`;
        inner += `<div class="widget__big-unit">sessions</div>`;
        inner += `<div class="widget__secondary" id="dwWidgetTimer"></div>`;
        break;
      case 'reflection':
        inner += `<div class="widget__title" id="refWidgetTitle">Write a reflection</div>`;
        inner += `<div class="widget__subtitle" id="refWidgetSub">Tap to journal your thoughts</div>`;
        break;
      case 'distraction':
        inner += `<div class="widget__big-num" style="color:var(--color-distraction)">0</div>`;
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

    this._renderInto();
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
  close(instant) {
    if (this._esc) { document.removeEventListener('keydown', this._esc); this._esc = null; }
    const w = document.getElementById('moreSpace');
    if (!w) return;
    if (instant) { try { w.remove(); } catch (e) {} return; }
    w.classList.remove('open');
    setTimeout(() => { try { w.remove(); } catch (e) {} }, 300);
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
    const anyLocked = !!nextLockedModule();
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
  const h = now.getHours();
  const greet = h < 5 ? 'Up late,' : h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('greetingTime', greet);
  const name = state.profile.name || 'Builder';
  setText('greetingName', name);
  // Mobile slot: same greeting, rendered below the Memento card (the header
  // shows the brand lockup there instead; CSS swaps the two at <860px).
  // Search rides along: the dashboard page gets its own search button on
  // the greeting row (the header one is hidden on mobile); it just proxies
  // the real #hubSearch so all Spotlight wiring stays in one place.
  // Whisper bar (replaces the greeting): date left, "~X weeks left" right, both
  // ambient + low-weight. The card is the first real thing the eye lands on.
  // Tapping the weeks reveals one quiet gold line (Memento Mori, woven in).
  // Memento Mori, woven into BOTH the mobile whisper bar and the desktop header.
  let weeksLeft = null;
  try {
    const by = state.mori && state.mori.birthYear;
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
    // Whisper bar: just the date, aligned right. (Mori "weeks left" lives in the
    // Memento Mori tile now; the home stays calm.)
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    mg.innerHTML = '<span class="wbar__date">' + esc(dateStr) + '</span>';
  }
  // Desktop header: date, plus the same quiet "~X weeks left" Mori line the
  // mobile whisper bar carries, so mortality is woven in on both layouts.
  const _hdDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  setText('headerDate', weeksLeft != null ? (_hdDate + '  ·  ~' + weeksLeft.toLocaleString() + ' weeks left') : _hdDate);

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

  // Live clock (time of day) in the top hub.
  updateHubClock();
  if (!renderGreeting._clockTimer) {
    renderGreeting._clockTimer = setInterval(updateHubClock, 1000);
  }

  // v25 prune (Malik): the greeting is not a hit target anymore; Settings is
  // reachable from the sidebar profile and the tab bar.
}

function updateHubClock() {
  const el = document.getElementById('hubClockTime');
  if (!el) return;
  const s = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const parts = s.split(' ');
  el.innerHTML = esc(parts[0]) + (parts[1] ? ' <span class="hub-clock__mer">' + esc(parts[1]) + '</span>' : '');
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
  return done ? 'Today’s mission, done.' : 'What’s the mission today?';
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
      '<span class="hub-hl-pop__label">Auto <span class="hub-hl-pop__hint">mission status</span></span></button>';
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
    if (c && typeof initStarBlob === 'function') initStarBlob(c, 120);
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
        } else {
          showComingSoonToast();
        }
      });
    });
  } else if (key === 'resources') {
    el.querySelectorAll('[data-resource]').forEach(row => {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        showComingSoonToast();
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

// One-time backup nudge. Shown once the streak first reaches 7 (data is now
// worth not losing). Points at the existing export. Dismiss OR save sets
// state.meta.backupNudged so it never shows again. Never appears or persists
// in DEMO_MODE (persistNow already no-ops, but we also skip the UI so demo
// sessions stay clean). Additive: reuses exportMementoData() unchanged.
let _backupNudgeEl = null;
function maybeShowBackupNudge() {
  try {
    if (DEMO_MODE) return;
    if (!state.meta || state.meta.backupNudged) return;
    const count = (state.streak && state.streak.count) || 0;
    if (count < 7) return;
    if (_backupNudgeEl || document.querySelector('.backup-nudge')) return;
    const el = document.createElement('div');
    _backupNudgeEl = el;
    el.className = 'backup-nudge';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="backup-nudge__text">Save a backup of your progress.' +
        '<span>One week in. Download a copy so you never lose it.</span>' +
      '</div>' +
      '<button class="backup-nudge__save" type="button">Download</button>' +
      '<button class="backup-nudge__close" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(el);
    // Mark as shown immediately so a re-render mid-session can't double-fire.
    state.meta.backupNudged = true;
    try { persistNow(); } catch (_) {}
    const dismiss = () => {
      el.classList.remove('is-visible');
      setTimeout(() => { try { el.remove(); } catch (_) {} if (_backupNudgeEl === el) _backupNudgeEl = null; }, 300);
    };
    el.querySelector('.backup-nudge__save').addEventListener('click', () => {
      try { exportMementoData(); } catch (_) {}
      dismiss();
    });
    el.querySelector('.backup-nudge__close').addEventListener('click', dismiss);
    void el.offsetWidth; // reflow so the transition runs
    el.classList.add('is-visible');
  } catch (_) { /* never let the nudge break the dashboard */ }
}

// One-time "save your work" nudge after the Neutron Star is born. Points at the
// existing CloudSync account dialog so a user can sync before they risk losing the
// thing they just made. Shown once ever (state.meta.saveWorkNudged), never in demo,
// skipped when sync is unavailable or the user is already signed in. Reuses the
// .backup-nudge glass toast skin unchanged.
let _saveWorkNudgeEl = null;
function maybeShowSaveWorkNudge() {
  try {
    if (DEMO_MODE) return;
    if (!state.meta || state.meta.saveWorkNudged) return;
    if (typeof CloudSync === 'undefined' || !CloudSync.available || !CloudSync.available()) return;
    if (CloudSync.isLoggedIn && CloudSync.isLoggedIn()) return;
    if (_saveWorkNudgeEl || document.querySelector('.backup-nudge')) return;
    const el = document.createElement('div');
    _saveWorkNudgeEl = el;
    el.className = 'backup-nudge';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="backup-nudge__text">Save your work so you never lose it.' +
        '<span>Make a free account and your Memento syncs across devices. No password.</span>' +
      '</div>' +
      '<button class="backup-nudge__save" type="button">Make one</button>' +
      '<button class="backup-nudge__close" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(el);
    // Mark shown immediately so a re-render mid-session can't double-fire.
    state.meta.saveWorkNudged = true;
    try { persistNow(); } catch (_) {}
    const dismiss = () => {
      el.classList.remove('is-visible');
      setTimeout(() => { try { el.remove(); } catch (_) {} if (_saveWorkNudgeEl === el) _saveWorkNudgeEl = null; }, 300);
    };
    el.querySelector('.backup-nudge__save').addEventListener('click', () => {
      try { if (CloudSync.openDialog) CloudSync.openDialog(); } catch (_) {}
      dismiss();
    });
    el.querySelector('.backup-nudge__close').addEventListener('click', dismiss);
    void el.offsetWidth;
    el.classList.add('is-visible');
  } catch (_) {}
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
        try { showComingSoonToast('Saved. It will be waiting in the morning.'); } catch (_) {}
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

const CreatorTools = {
  init() {
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };
    bind('creatorUnlockAll', () => this.setPreviewAll(true));
    bind('creatorNormal', () => this.lockAll());
    bind('creatorOpenSummary', () => this.openSummary());
    bind('creatorRestoreClarity', () => this.restoreClarity());
    bind('creatorRestartClarity', () => this.restartClarity());
    bind('creatorRestartAction', () => this.restartAction());
    bind('creatorRestartEverything', () => this.restartEverything());
    bind('creatorSkipAction', () => this.skipActionIntake());
    // Fast navigation (non-destructive): replay the first-run moments without
    // wiping any data, so jumping between parts of the app is quick during dev.
    bind('creatorJumpSplash', () => this.jumpSplash());
    bind('creatorJumpOnboarding', () => this.jumpOnboarding());
    bind('creatorJumpStyle', () => this.jumpStyle());
    bind('creatorJumpDashboard', () => this.jumpDashboard());

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
    stateEl.textContent = bits.join(' · ');
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
  }
};

const MementoVisual = {
  blob: null,
  destroy() {
    if (this.blob && this.blob.stop) this.blob.stop();
    this.blob = null;
  },
  init() {
    this.destroy();
    this.blob = initMiniBlob('mementoGlyph', 84);
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
      light: { label: 'Light', color: 'rgba(94,206,160,0.95)', bg: 'rgba(94,206,160,0.12)', bd: 'rgba(94,206,160,0.32)' },
      moderate: { label: 'Moderate', color: 'rgba(123,160,255,0.95)', bg: 'rgba(123,160,255,0.12)', bd: 'rgba(123,160,255,0.32)' },
      heavy: { label: 'Heavy', color: 'rgba(123,97,255,0.95)', bg: 'rgba(123,97,255,0.14)', bd: 'rgba(123,97,255,0.34)' },
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
      reflection: { label: 'Notes', color: 'rgba(191,90,242,0.95)', bg: 'rgba(191,90,242,0.12)', bd: 'rgba(191,90,242,0.32)' },
      vivere: { label: 'Lived', color: 'rgba(201,162,75,0.95)', bg: 'rgba(201,162,75,0.12)', bd: 'rgba(201,162,75,0.34)' },
      proof: { label: 'Proof', color: 'rgba(48,209,88,0.95)', bg: 'rgba(48,209,88,0.12)', bd: 'rgba(48,209,88,0.32)' }
    };
    return m[type] || { label: 'Event', color: 'rgba(var(--ink),0.7)', bg: 'rgba(var(--ink),0.08)', bd: 'rgba(var(--ink),0.2)' };
  },
  render() {
    const ch = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory.slice() : [];
    const allEv = this._allEvents();
    const PUR = 'rgba(123,97,255,0.92)';

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
      if (Sheet.titleEl) { Sheet.titleEl.textContent = 'Proof Trail'; Sheet.titleEl.style.color = 'rgba(123,97,255,0.95)'; }
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
    const PUR = 'rgba(123,97,255,0.92)';
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
      if (Sheet.titleEl) { Sheet.titleEl.textContent = 'Weekly review'; Sheet.titleEl.style.color = 'rgba(123,97,255,0.95)'; }
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
  PURPLE: 'rgba(123,97,255,0.92)',

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
    bg.addColorStop(0, '#15131f');
    bg.addColorStop(0.55, '#0d0c14');
    bg.addColorStop(1, '#08070d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const bloom = ctx.createRadialGradient(W * 0.78, H * 0.16, 0, W * 0.78, H * 0.16, W * 0.95);
    bloom.addColorStop(0, 'rgba(123,97,255,0.30)');
    bloom.addColorStop(0.4, 'rgba(123,97,255,0.10)');
    bloom.addColorStop(1, 'rgba(123,97,255,0)');
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
    ctx.fillStyle = 'rgba(123,97,255,0.55)';
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
      ctx.fillStyle = 'rgba(123,97,255,0.85)';
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
      ctx.fillStyle = '#7b61ff';
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
            ? 'background:rgba(123,97,255,0.18);color:var(--text-hi);border:1px solid rgba(123,97,255,0.45);'
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
      + 'background:' + (this.privateMode ? 'rgba(123,97,255,0.85)' : 'rgba(var(--ink),0.16)') + ';">'
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
      const flash = (t, ok) => { if (!msg) return; msg.textContent = t; msg.style.color = ok ? 'rgba(120,230,170,0.95)' : 'var(--text-3)'; };

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
  let h = sc('Consistency score', cs.pct30, 'Your consistency over the last 30 days, out of 100.');
  if (typeof cs.yearConsistency === 'number') h += sc('Year score', cs.yearConsistency, 'Your consistency across the last 365 days, out of 100. A full day is 5 logged actions.');
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
    let coi = (state.profile && state.profile.costOfInaction) || '';
    if (Array.isArray(coi)) coi = coi.filter(Boolean).join(', ');
    coi = String(coi || '').trim();
    if (coi) return 'So a year from now is not just ' + coi.toLowerCase().replace(/\.+$/, '') + '.';
    return 'This moves you toward your goal.';
  } catch (e) { return ''; }
}

// Inline "I did it": mark today's action done from the Home without opening the
// Action module. Mirrors the bookend's _creditAction exactly (same completion
// record, proof event, streak recalc, persist) so it can never double-count or
// diverge. Returns true if it credited, false if already done today / no-op.
function creditTodayAction() {
  try {
    const today = getTodayISO();
    const h = state.action && state.action.completionHistory;
    const doneNow = Array.isArray(h) && h.length && h[h.length - 1].date && isoToLocalDay(h[h.length - 1].date) === today;
    if (doneNow) return false;
    const pa = (state.action && state.action.primaryAction) || {};
    const tier = pa.recommendedTier || 'moderate';
    const actionText = (pa.tiers && pa.tiers[tier]) || pa.howToStart || pa.title || '';
    if (!state.action) state.action = {};
    if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
    // Stamp a stable id so the inline undo can remove THIS exact entry, never a
    // later completion logged in the undo window (which a blind pop would delete).
    const id = 'act_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.action.completionHistory.push({ id: id, date: new Date().toISOString(), tier, actionText, planTitle: pa.title || '' });
    try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier } }); } catch (_) {}
    try { Analytics.track('action_done', { tier }); } catch (_) {} // Activation Point
    if (typeof recalculateStreak === 'function') { try { recalculateStreak(); } catch (_) {} }
    try { persistNow(); } catch (_) {}
    return id;
  } catch (e) { return false; }
}

// Single source of truth: was today's daily ACTION completed (compared on the
// LOCAL day)? completionHistory stores full ISO timestamps, so a raw UTC slice
// would mis-read after the UTC rollover in negative-UTC zones; always go through
// isoToLocalDay. Used by the hub headline, the command center, and the hub
// consistency line so they never contradict each other on the same screen.
function actionDoneToday() {
  try {
    const today = getTodayISO();
    const h = state.action && state.action.completionHistory;
    return Array.isArray(h) && h.some(e => e && e.date && isoToLocalDay(e.date) === today);
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

function renderCommandCenter() {
  try {
    const hasClarity = !!(state.clarity && state.clarity.completed && state.clarity.answers && state.clarity.answers.neutronStar);
    const pa = (state.action && state.action.primaryAction) || {};
    const tiers = pa.tiers || {};
    const hasPlan = !!(state.action && state.action.planGenerated && pa.title);
    const C = ccAccentColor();
    const wrap = (inner) => '<section class="cc-card" style="margin:0 0 14px;padding:22px 22px 20px;border-radius:var(--card-r);background:var(--surface-1);box-shadow:var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.06);">' + inner + '</section>';
    const eyebrow = (t) => '<div style="font-size:0.66rem;letter-spacing:0.14em;text-transform:uppercase;color:' + C + ';font-weight:700;margin-bottom:8px;">' + t + '</div>';
    const primaryBtn = (label, action) => '<button class="cc-primary" data-cc-action="' + action + '" style="flex:0 1 auto;min-width:180px;font:inherit;font-weight:700;font-size:0.92rem;cursor:pointer;border:none;border-radius:calc(8px * var(--rx, 1));padding:12px 40px;background:var(--solid-bg);color:var(--solid-fg);">' + esc(label) + '</button>';

    if (!hasClarity) {
      return wrap(eyebrow('Start here') +
        '<div style="font-size:1.15rem;font-weight:700;color:var(--text-hi);margin-bottom:6px;">Find your Neutron Star</div>' +
        '<div style="font-size:0.9rem;line-height:1.5;color:var(--text-2);margin-bottom:14px;">Get clear on the one goal that actually matters. This will be the foundation of Memento.</div>' +
        '<div style="display:flex;">' + primaryBtn('Start', 'clarity') + '</div>');
    }
    if (!hasPlan) {
      return wrap(eyebrow('Next step') +
        '<div style="font-size:1.15rem;font-weight:700;color:var(--text-hi);margin-bottom:6px;">Turn your goal into today\'s action</div>' +
        '<div style="font-size:0.64rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-3);margin-bottom:4px;">Your goal</div>' +
        '<div style="font-size:0.9rem;line-height:1.5;color:var(--text-2);margin-bottom:14px;">' + esc(state.clarity.answers.neutronStar) + '</div>' +
        '<div style="display:flex;">' + primaryBtn('Build my plan', 'action') + '</div>');
    }

    // COMEBACK MODE: when the user has fallen off (no activity for 2+ days),
    // show a calm, shame-free way back in instead of the normal "today's one
    // thing". Normal path below is unchanged when there is no gap.
    if (typeof isComebackGap === 'function' && isComebackGap()) {
      const recTierKey = (['tiny','light','moderate','heavy','extreme'].indexOf(pa.recommendedTier) >= 0) ? pa.recommendedTier : 'moderate';
      const recText = tiers[recTierKey] || pa.title || 'Your one thing';
      const tinyText = tiers.tiny || recText;
      const lightText = tiers.light || tiers.tiny || recText;
      // Three ways back, easiest first. Each carries the tier to pre-select.
      const wayBtn = (minutes, label, text, tierKey, recommended) => {
        const base = 'text-align:left;width:100%;font:inherit;cursor:pointer;border-radius:calc(14px * var(--rx, 1));padding:13px 15px;display:block;margin-bottom:8px;';
        const skin = recommended
          ? 'background:var(--solid-bg);color:var(--solid-fg);border:none;'
          : 'background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-hi);';
        const sub = recommended ? 'color:rgba(11,11,18,0.62);' : 'color:var(--text-2);';
        const tag = 'color:' + (recommended ? 'rgba(11,11,18,0.55)' : 'var(--text-3)') + ';font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;';
        return '<button class="cc-comeback-way" data-cc-comeback="' + tierKey + '" style="' + base + skin + '">' +
          '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:3px;">' +
            '<span style="font-weight:700;font-size:0.95rem;">' + esc(label) + '</span>' +
            '<span style="' + tag + 'white-space:nowrap;">' + esc(minutes) + (recommended ? ' &middot; recommended' : '') + '</span>' +
          '</div>' +
          '<div style="font-size:0.83rem;line-height:1.4;' + sub + '">' + esc(text) + '</div>' +
        '</button>';
      };
      const chips = ['Too big','Unclear','Tired','Distracted','Scared','Forgot','Other']
        .map(r => '<button class="cc-comeback-reason" data-cc-reason="' + esc(r) + '" style="font:inherit;font-weight:650;font-size:0.82rem;cursor:pointer;border:1px solid var(--glass-border);border-radius:999px;padding:7px 13px;background:var(--glass-bg);color:var(--text-hi);">' + esc(r) + '</button>')
        .join('');
      let cb = eyebrow('Welcome back');
      cb += '<div style="font-size:1.2rem;font-weight:700;line-height:1.3;color:var(--text-hi);margin-bottom:6px;">Pick the smallest way back in.</div>';
      cb += '<div style="font-size:0.88rem;line-height:1.5;color:var(--text-2);margin-bottom:14px;">No catching up, no making up for lost days. You just start again, as small as you want.</div>';
      cb += wayBtn('2 min', 'Just open it', tinyText, 'tiny', false);
      cb += wayBtn('10 min', 'A small block', lightText, 'light', false);
      cb += wayBtn('Full', 'Your normal action', recText, recTierKey, true);
      cb += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--glass-border);">' +
        '<div style="font-size:0.88rem;font-weight:650;color:var(--text-hi);margin-bottom:10px;">What knocked you off? <span style="color:var(--text-3);font-weight:500;">(optional)</span></div>' +
        '<div id="ccComebackChips" style="display:flex;gap:8px;flex-wrap:wrap;">' + chips + '</div>' +
        '<div id="ccComebackThanks" style="display:none;font-size:0.83rem;line-height:1.45;color:var(--text-2);margin-top:10px;">Got it. That is useful, not a verdict. Now pick a way back in above.</div>' +
      '</div>';
      return wrap(cb);
    }

    const oneThing = (tiers[pa.recommendedTier] || pa.title || '').trim() || 'Take one step toward your goal today';
    const tiny = tiers.tiny || '';
    const how = pa.howToStart || pa.recommendedWhy || '';
    const todayStr = getTodayISO();
    const doneToday = actionDoneToday();
    const ch = (state.action && state.action.completionHistory) || [];
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
    // A fresh weekly review gets ONE quiet affordance above the hero (this code is
    // past the brand-new and comeback returns, so it only shows on the normal path).
    // Opening Updates marks it read, so it self-clears on the next render.
    try {
      if (typeof hasFreshWeeklyCard === 'function' && hasFreshWeeklyCard()) {
        const _wk = (state.updates || []).filter(u => u && u.type === 'weekly' && !u.read).pop();
        const _wkTitle = (_wk && _wk.title) ? _wk.title : 'Your week is ready';
        _beBanner = '<button type="button" data-weekly-open aria-label="Open your weekly review" style="display:block;width:100%;text-align:left;font:inherit;cursor:pointer;border:none;border-radius:calc(12px * var(--rx, 1));padding:11px 14px;margin-bottom:16px;background:var(--kfill-04);box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);">' +
          '<div style="font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:var(--text-3);margin-bottom:3px;">Your week, counted</div>' +
          '<div style="font-size:0.9rem;font-weight:600;color:var(--text-hi);line-height:1.35;">' + esc(_wkTitle) + '</div>' +
        '</button>';
      }
    } catch (e) {}
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
          row += '<button class="cc-proj-open" data-cc-proj style="font:inherit;font-weight:650;font-size:0.8rem;cursor:pointer;border:1px solid ' + C + ';background:transparent;color:' + C + ';border-radius:calc(6px * var(--rx, 1));padding:9px 15px;">Add projects &rarr;</button>';
        }
        row += '</div>';
      }
    } else if (hero === 'oneThing') {
      // Today: one clean layout. The one thing, then the daily loop (act / check
      // in / review) and the Vivere "one thing to live". This is the only tab the
      // daily loop lives in, so the Consistency and Goal tabs stay focused.
      row += '<div class="cc-od-eyebrow" style="font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-lo);margin-bottom:6px;">Today</div>';
      row += '<div class="cc-od-title" style="font-size:1.5rem;font-weight:700;line-height:1.25;letter-spacing:-0.01em;color:var(--text-hi);margin-bottom:12px;">' + esc(oneThing) + '</div>';
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
      if (tiny) row += '<div class="cc-od-sub" style="font-size:0.85rem;line-height:1.45;color:var(--text-mid);margin-bottom:6px;"><span style="color:var(--text-lo);">Minimum: </span>' + esc(tiny) + '</div>';
      if (how) row += '<div class="cc-od-sub" style="font-size:0.85rem;line-height:1.45;color:var(--text-mid);"><span style="color:var(--text-lo);">If resistance hits: </span>' + esc(how) + '</div>';
      // ---- the daily loop (lives only in Today) --------------------------------
      row += '<div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--hairline);">';
      row += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
      if (doneToday) {
        row += '<div style="flex:1;min-width:150px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem;color:var(--color-consistency);background:color-mix(in srgb, var(--color-consistency) 12%, transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);border-radius:calc(8px * var(--rx, 1));padding:12px;">&#10003; Done today</div>';
      } else {
        // Inline confirm: close the day right here. "Open" still routes into the
        // Action module for the focus timer / full detail (secondary, quiet).
        row += '<button class="cc-primary" data-cc-action="didit" style="flex:1;min-width:150px;font:inherit;font-weight:700;font-size:0.92rem;cursor:pointer;border:none;border-radius:calc(8px * var(--rx, 1));padding:12px 16px;background:var(--solid-bg);color:var(--solid-fg);">I did it</button>';
        row += '<button class="cc-open-action" data-cc-action="action" style="flex:0 0 auto;font:inherit;font-weight:600;font-size:0.85rem;cursor:pointer;border:none;background:none;color:var(--text-lo);border-radius:calc(8px * var(--rx, 1));padding:12px 10px;">Open</button>';
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
      {
        // v25 prune (Malik): share cards and the weekly review module are gone
        // (the Monday letter in Updates is the weekly look-back now), so Review
        // is one quiet link straight to the Proof trail.
        const chArr = Array.isArray(ch) ? ch : [];
        const doneCount = chArr.length;
        row += '<div style="margin-top:12px;">';
        row += '<button id="ccReview" style="display:inline-flex;align-items:center;gap:7px;font:inherit;font-weight:600;font-size:0.82rem;cursor:pointer;border:none;background:transparent;color:' + C + ';padding:0;">' +
          '<span>Proof trail</span>' + (doneCount > 0 ? '<b style="font-weight:700;">' + doneCount + ' done</b>' : '') + '</button>';
        row += '</div>';
      }
      // ---- "One thing to live" (Vivere). The calm counterweight to the build
      // loop above: today's life practice, one quiet line, tap to open Vivere.
      try {
        const vToday = (typeof vivEnsureToday === 'function') ? vivEnsureToday() : null;
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
          const on = counts[iso] !== undefined;
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
      // Consistency expressed as 0-100 SCORES (not percentages): a 30-day score
      // and a long-range year score (a "100% day" is 5 logged actions). Updated
      // in place on a square tap (id ccScoreLine).
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
function bindCommandCenter(cc) {
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
            const lvl = Math.min(5, counts[date] || 0);
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
    cc.querySelectorAll('[data-cc-action]').forEach(b => b.addEventListener('click', () => {
      const a = b.getAttribute('data-cc-action');
      if (a === 'clarity' && typeof ClarityExperience !== 'undefined') ClarityExperience.open();
      else if (a === 'didit') {
        // Mark today's action done in place, then re-render so the card tint
        // evolves greener and the consistency line flips to "Today is closed".
        const creditedId = creditTodayAction();
        try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
        if (creditedId && typeof showUndoToast === 'function') {
          try { showUndoToast('Today is closed. You showed up.', function () {
            // Remove THIS exact entry by id, never a later completion logged in
            // the undo window (a blind pop would delete the wrong one).
            try { var h = state.action && state.action.completionHistory; if (Array.isArray(h)) { var idx = h.findIndex(function (x) { return x && x.id === creditedId; }); if (idx !== -1) { h.splice(idx, 1); if (typeof recalculateStreak === 'function') recalculateStreak(); persistNow(); if (typeof renderAll === 'function') renderAll(); } } } catch (e) {}
          }); } catch (e) {}
        }
      }
      else if (typeof ActionExperience !== 'undefined') ActionExperience.open();
    }));
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
    { min: 0,   c: '#A78BFA', s: 20, g: 6 },   // ember purple
    { min: 7,   c: '#5EA2F7', s: 21, g: 6 },   // blue
    { min: 14,  c: '#34D399', s: 22, g: 7 },   // green
    { min: 30,  c: '#E8C24A', s: 23, g: 7 },   // yellow
    { min: 60,  c: '#F59E0B', s: 24, g: 8 },   // orange
    { min: 100, c: '#EF6A5A', s: 25, g: 9 },   // red
    { min: 180, c: '#F5F5F7', s: 26, g: 10 }   // white-hot
  ];
  let t = T[0];
  for (let i = 0; i < T.length; i++) { if (count >= T[i].min) t = T[i]; }
  return t;
}

function renderDailyMemento() {
  try {
    const el = document.getElementById('dailyMemento');
    if (!el) return;
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
        const on = counts[iso] !== undefined;
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
      const ok = captureToNotes(input.value);
      if (ok) { try { showComingSoonToast('Captured to Notes.'); } catch (_) {} }
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
function renderDayCard() {
  try {
    const el = document.getElementById('dayCard');
    if (!el) return;
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
        (living ? '<span class="daycard-ns__burn" aria-hidden="true"></span>' : '') +
        '<div class="daycard-ns__body">' + emblemSvg + '</div>' +
        '<div class="daycard-ns__foot">' + goalSpan + nameSpan + '</div>' +
      '</div>';

    // Living wraps the card + its bloom + ground reflection in a stage sized to
    // the card so the reflection aligns; platinum renders the card directly.
    const inner = living
      ? '<div class="daycard-living-stage">' +
          '<span class="daycard-bloom" aria-hidden="true">' + blobs + '</span>' +
          '<span class="daycard-floor" aria-hidden="true">' + blobs + '</span>' +
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

    const nsEl = el.querySelector('#dayCardNs');
    bindDayCardTilt(nsEl);
    bindDayCardMotion(el.querySelector('.daycard-wrap'), nsEl);
    // Tap the card (emblem included) -> the fullscreen Memento with your Clarity /
    // Action / Consistency stats. The emblem no longer toggles the theme.
    if (nsEl && !nsEl._mfBound) {
      nsEl._mfBound = true;
      // No pointer cursor: the card is the Memento (a hero object), not a button.
      // It still opens the full view on click, just without the click-hand spanning
      // the whole large card (which read as "everything is a button" on desktop).
      nsEl.addEventListener('click', () => { try { openMementoFull(); } catch (e) {} });
    }
    if (living) {
      const wrap = el.querySelector('.daycard-wrap');
      setLivingCardVars(wrap);
      startLivingWander(wrap);
    } else {
      stopLivingWander();
    }
  } catch (e) {}
}

// Fullscreen Memento: tap the card to expand it and read where you stand across
// the three pillars - Clarity (your goal), Action (your daily follow-through),
// Consistency (your streak). The card is the hero; the stats sit under it. A
// snapshot clone of the live card carries its current theme + colour.
function openMementoFull() {
  try {
    if (document.getElementById('mementoFull')) return;
    // Refresh the :root --aura-* vars so the full view's background reflects the
    // user's latest state the instant it opens (the home no longer shows them).
    try { setAtmosphereVars(); } catch (e) {}
    const L = (typeof livingCardLevels === 'function') ? livingCardLevels() : { clar: 0, act: 0, cons: 0 };
    let cs = { current: 0, longest: 0, totalActiveDays: 0 };
    try { cs = consistencyStats(); } catch (e) {}
    const streak = (state.streak && state.streak.count) || cs.current || 0;
    const ans = (state.clarity && state.clarity.answers) || {};
    const goal = ans.neutronStar || '';
    const clarityDone = !!(state.clarity && state.clarity.completed);
    const pa = (state.action && state.action.primaryAction) || {};
    const tiers = pa.tiers || {};
    const todayAction = tiers[pa.recommendedTier] || pa.title || '';
    let act7 = 0;
    try { act7 = actionLocalDaysInWindow(7); } catch (e) {}

    const bar = (pct, color) => '<div class="mf-stat__track"><div class="mf-stat__fill" style="width:' + Math.max(2, Math.min(100, pct)) + '%;background:' + color + '"></div></div>';

    const clarityBlock =
      '<div class="mf-stat mf-stat--clarity" data-mf-open="clarity" role="button" tabindex="0">' +
        '<div class="mf-stat__head"><span class="mf-stat__label">Clarity</span><span class="mf-stat__val">' + (clarityDone ? 'Locked in' : 'Not set') + '</span></div>' +
        (goal ? '<div class="mf-stat__goal">' + esc(goal) + '</div>' : '<div class="mf-stat__sub">Find your Neutron Star, the one goal that actually matters.</div>') +
        bar(clarityDone ? 100 : 0, 'var(--color-clarity)') +
      '</div>';
    const actionBlock =
      '<div class="mf-stat mf-stat--action" data-mf-open="action" role="button" tabindex="0">' +
        '<div class="mf-stat__head"><span class="mf-stat__label">Action</span><span class="mf-stat__val">' + act7 + '<span class="mf-stat__unit">/ 7 days</span></span></div>' +
        (todayAction ? '<div class="mf-stat__sub"><span class="mf-stat__sub-key">Today</span> ' + esc(todayAction) + '</div>' : '<div class="mf-stat__sub">Turn your goal into one daily action.</div>') +
        bar(L.act, 'rgba(236,239,255,0.9)') +
      '</div>';
    const consBlock =
      '<div class="mf-stat mf-stat--cons" data-mf-open="streak" role="button" tabindex="0">' +
        '<div class="mf-stat__head"><span class="mf-stat__label">Consistency</span><span class="mf-stat__val">' + streak + '<span class="mf-stat__unit">day streak</span></span></div>' +
        '<div class="mf-stat__sub">' + (cs.totalActiveDays || 0) + ' active days &middot; ' + Math.round(L.cons) + '% of the last 30</div>' +
        bar(L.cons, 'var(--color-consistency)') +
      '</div>';

    const ov = document.createElement('div');
    ov.id = 'mementoFull';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Your Memento');
    ov.innerHTML =
      '<div class="mf__bg" aria-hidden="true"></div>' +
      '<button class="mf__close" aria-label="Close">&times;</button>' +
      '<div class="mf__scroll">' +
        '<div class="mf__card"></div>' +
        '<div class="mf__stats">' + clarityBlock + actionBlock + consBlock + '</div>' +
        // Re-share the evolving card any day (the win-moment share is one-time; this
        // is the durable path as the pillars fill in). Only when there is a goal to
        // engrave; the delegated [data-share-star] listener opens the share moment.
        (goal ? '<button type="button" class="mf__share" data-share-star>Share this card</button>' : '') +
        '<div class="mf__hint">Tap a pillar to dive in</div>' +
      '</div>';
    document.body.appendChild(ov);

    // LITERALLY do not touch the Memento. Instead of cloning it, MOVE the real
    // living card element into this view and animate only the background + stats
    // around it. It is the same DOM node, still running its own light loop, so it
    // never cross-fades, jumps, or freezes. We hold the home card's grid cell open
    // (min-height) so the page behind does not reflow while the card is borrowed,
    // pin its size inline (the home's size CSS does not reach it out here), and land
    // it on its exact on-home position so it does not move a pixel. close() puts it
    // back. All wrapped so the card is always restorable.
    const dayCardEl = document.getElementById('dayCard');
    const liveWrap = dayCardEl ? dayCardEl.querySelector('.daycard-wrap') : null;
    const cardHost = ov.querySelector('.mf__card');
    let homeParent = null, homeNext = null;
    const sizedEls = [];
    if (liveWrap && cardHost) {
      const liveNs0 = liveWrap.querySelector('.daycard-ns');
      // LAYOUT size (offsetW/H ignore any transient entrance scale) for the pin;
      // RECT (H) for the on-screen position to land on.
      const sw = liveNs0 ? liveNs0.offsetWidth : 0;
      const sh = liveNs0 ? liveNs0.offsetHeight : 0;
      const H = liveNs0 ? liveNs0.getBoundingClientRect() : null;
      if (dayCardEl) dayCardEl.style.minHeight = dayCardEl.offsetHeight + 'px';
      homeParent = liveWrap.parentNode; homeNext = liveWrap.nextSibling;
      cardHost.appendChild(liveWrap);            // borrow the REAL card (no clone)
      const stage = liveWrap.querySelector('.daycard-living-stage');
      const ns = liveWrap.querySelector('.daycard-ns');
      // Drop the one-time entrance classes (the daily materialize animates a 0.9
      // scale we don't want a snapshot of), and FREEZE the card's transform: snap
      // any tilt flat with the 0.18s transform transition turned OFF, so the card
      // cannot rotate or animate a hair as the view opens. The tilt vars live on
      // the .daycard-ns itself (where bindDayCardTilt sets them), not the wrap, so
      // setting them on the wrap (as before) did nothing.
      liveWrap.classList.remove('daycard-materialize', 'daycard-reveal');
      if (ns) {
        ns.style.transition = 'none';
        ns.style.setProperty('--dc-rx', '0deg');
        ns.style.setProperty('--dc-ry', '0deg');
        void ns.offsetWidth;        // commit the flat state with no animation
        ns.style.transition = '';   // restore (in-view tilt, if any, still works)
      }
      if (H) {
        if (stage) { stage.style.width = sw + 'px'; stage.style.margin = '0 auto'; if (ns) ns.style.width = '100%'; sizedEls.push(stage); }
        else if (ns) { ns.style.width = sw + 'px'; }
        if (ns) { ns.style.minHeight = sh + 'px'; sizedEls.push(ns); }
        // Land it on its exact home spot -> zero visible movement. Vertical via
        // padding (keeps the view scrollable, no transform to fight the swipe);
        // horizontal only if the home card is off-centre. Force the flex layout to
        // SETTLE after the size-pin before measuring, so C is the card's true
        // resting position (not a half-resolved first pass) and the padding-top
        // lands it exactly once, with no second-pass correction the eye can catch.
        void ov.offsetWidth;
        const C = ns ? ns.getBoundingClientRect() : null;
        if (C) {
          const dy = Math.round(H.top - C.top);
          const dx = Math.round(H.left - C.left);
          if (dy) ov.style.paddingTop = 'calc(36px + var(--safe-t, 0px) + ' + dy + 'px)';
          if (Math.abs(dx) > 1) {
            const scroll = ov.querySelector('.mf__scroll');
            if (scroll) scroll.style.marginLeft = ((parseFloat(getComputedStyle(scroll).marginLeft) || 0) + dx) + 'px';
          }
        }
      }
    }

    document.body.style.overflow = 'hidden';
    // Commit the initial state with a forced reflow, then flip to open so the bg +
    // stats transitions play. rAF gets throttled when the tab is backgrounded, which
    // can leave the overlay stuck; a sync reflow never stalls.
    void ov.offsetWidth;
    ov.classList.add('mf--open');

    let mfClosed = false;
    const close = () => {
      if (mfClosed) return;   // idempotent: a 2nd trigger (a swipe + a stray tap, a
      mfClosed = true;        // double-tap, Escape while tapping) must NOT run the
                              // restore twice, or the second pass removes the card it
                              // just put back (the else branch below) and the home
                              // ends up with no Memento at all.
      ov.classList.remove('mf--open');   // bg + stats fade out; the card stays put at H
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      // Restore the REAL Memento to the home AFTER the background has faded out, then
      // remove the overlay in the same tick so there's no gap. Putting it back early
      // would drop it behind the still-opaque bg and make it flash. Let the home size
      // CSS take over again. Guard against a re-render having rebuilt the card.
      setTimeout(() => {
        try {
          if (liveWrap) {
            sizedEls.forEach((el) => { el.style.width = ''; el.style.minHeight = ''; el.style.margin = ''; });
            liveWrap.style.removeProperty('--dc-rx');
            liveWrap.style.removeProperty('--dc-ry');
            const existing = dayCardEl ? dayCardEl.querySelector('.daycard-wrap') : null;
            if (dayCardEl && (!existing || existing === liveWrap)) {
              if (homeNext && homeNext.parentNode === homeParent) homeParent.insertBefore(liveWrap, homeNext);
              else (homeParent || dayCardEl).appendChild(liveWrap);
            } else {
              liveWrap.remove();   // a DIFFERENT fresh card was rebuilt; drop the borrowed one
            }
          }
          if (dayCardEl) dayCardEl.style.minHeight = '';
        } catch (e) {}
        try { ov.remove(); } catch (e) {}
      }, 430);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    ov.querySelector('.mf__close').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    // iOS-like swipe-down-to-close: pull the card view down (when scrolled to the
    // top) and it follows the finger, then flicks away or springs back.
    (function bindMfSwipe() {
      const scroll = ov.querySelector('.mf__scroll');
      if (!scroll) return;
      let startY = 0, dy = 0, t0 = 0, active = false, decided = false, engaged = false;
      scroll.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        startY = e.touches[0].clientY; dy = 0; t0 = e.timeStamp || 0;
        active = true; decided = false; engaged = false;
      }, { passive: true });
      scroll.addEventListener('touchmove', (e) => {
        if (!active) return;
        const y = e.touches[0].clientY - startY;
        if (!decided) {
          if (Math.abs(y) < 6) return;
          engaged = y > 0 && scroll.scrollTop <= 0;
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
    document.addEventListener('keydown', onKey);
  } catch (e) {}
}

// ── Living Day Card: data -> color, motion, theme toggle ──────────────────
// Map real user data into the three pillar levels (0-100). "Reflects where you
// are now": consistency = last 30 days, action = last 7 days (both can fade);
// clarity is the one permanent foundation (locks in once Clarity is completed).
function livingCardLevels() {
  let clar = (state.clarity && state.clarity.completed) ? 100 : 0;
  let act = 0;
  try { act = Math.min(100, Math.round(actionLocalDaysInWindow(7) / 7 * 100)); } catch (e) {}
  let cons = 0;
  try { const cs = consistencyStats(); if (cs && typeof cs.pct30 === 'number') cons = cs.pct30; } catch (e) {}
  return { clar, act, cons };
}

function setLivingCardVars(wrap) {
  if (!wrap) return;
  const L = livingCardLevels();
  wrap.style.setProperty('--clar', (L.clar / 100).toFixed(3));
  wrap.style.setProperty('--act', (L.act / 100).toFixed(3));
  wrap.style.setProperty('--cons', (L.cons / 100).toFixed(3));
  // blend blob appears only when clarity AND consistency are both present
  wrap.style.setProperty('--mix', (Math.min(L.clar, L.cons) / 100 * 0.75).toFixed(3));
  // lit gates everything outside the card (aura, bloom, reflection) by fill
  wrap.style.setProperty('--lit', (Math.max(L.clar, L.act, L.cons) / 100).toFixed(3));
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
    function frame() {
      for (let i = 0; i < inside.length; i++) {
        const b = st[i];
        if (b.base <= 0) continue;   // disabled pillar (e.g. the red test) stays dark
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
    // Off by default; opt-in via Settings > Preferences ("Memento tilt"). The card
    // leaning toward the cursor read as movement some people don't want.
    if (!(state.prefs && state.prefs.cardTilt)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.documentElement.classList.contains('lowfx')) return;
    // Tilt only. The surface itself stays still: updating --dc-mx/--dc-my
    // here made the iridescent wash chase the pointer, which read as a
    // cheap hover effect (Malik). The wash now sits at its resting point.
    const set = (c, nx, ny, amp) => {
      c.style.setProperty('--dc-rx', (ny * -3.2 * amp).toFixed(2) + 'deg');
      c.style.setProperty('--dc-ry', (nx * 4 * amp).toFixed(2) + 'deg');
    };
    const reset = () => { card.style.setProperty('--dc-rx', '0deg'); card.style.setProperty('--dc-ry', '0deg'); };
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
      card.style.setProperty('--dc-rx', curRx.toFixed(2) + 'deg');
      card.style.setProperty('--dc-ry', curRy.toFixed(2) + 'deg');
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
    el.innerHTML =
      '<div class="dash-cgram__head">' +
        '<div class="dash-cgram__label">Consistency</div>' +
        '<div class="dash-cgram__meta"><b>' + streak + '</b> day streak' +
          (cs.totalActiveDays ? ' <span>&middot; ' + cs.totalActiveDays + ' active days</span>' : '') + '</div>' +
        '<span class="dash-cgram__open" aria-hidden="true">Open &rsaquo;</span>' +
      '</div>' +
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

function renderAll() {
  renderGreeting();
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
}

/* ============================================================
   MEMENTO SHARE CARD  (the win-moment viral lever)
   A premium, designed PNG of the user's *living* Memento card,
   offered right after the Neutron Star is born. Renders the same
   pillar palette as the in-app living card (clarity purple, action
   white, consistency green) so the shared image IS their card, with
   their goal engraved and mortality woven in. Strictly READ-ONLY.
   Canvas (no glass) so the export is verifiable + reliable.
   ============================================================ */
// First-win celebration: the very first time a user completes an action (post
// onboarding), reuse the share overlay to mark the moment. Fires once, ever,
// gated by state.meta.firstWinShown; never in demo; needs a Neutron Star so the
// card has something to render, otherwise the flag is left unset to try again.
function maybeShowFirstWin() {
  try {
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return;
    if (!state.meta || state.meta.firstWinShown) return;
    const a = (state.clarity && state.clarity.answers) || {};
    const goal = (a.neutronStar || a.keystone || '').trim();
    if (!goal) return; // the card needs a star; do not burn the flag yet
    state.meta.firstWinShown = true;
    if (typeof persistNow === 'function') persistNow();
    setTimeout(function () {
      try {
        if (typeof MementoShareCard !== 'undefined' && MementoShareCard.open) {
          MementoShareCard.open({ title: 'Day one. You actually did the thing.', sub: 'Most people never start. Save this or share it.' });
        }
      } catch (e) {}
    }, 420);
  } catch (e) {}
}

const MementoShareCard = {
  _overlay: null,

  // ---- read-only gatherers ----
  _goal() {
    const a = (state.clarity && state.clarity.answers) || {};
    return (a.neutronStar || a.keystone || '').trim();
  },
  _starName() {
    const a = (state.clarity && state.clarity.answers) || {};
    return (a.starName || '').trim();
  },
  _weeksLeft() {
    try {
      const by = state.mori && state.mori.birthYear;
      if (by && typeof moriWeeksLived === 'function' && typeof moriTotalWeeks === 'function') {
        const lived = moriWeeksLived(by);
        // A future / typo birthYear yields negative weeks-lived, which would print
        // an absurd inflated count. Omit the Mori line entirely in that case.
        if (lived < 0) return null;
        const le = (state.mori && state.mori.lifeExpectancy) || 80;
        return Math.max(0, moriTotalWeeks(le) - lived);
      }
    } catch (e) {}
    return null;
  },
  _levels() {
    try { if (typeof livingCardLevels === 'function') return livingCardLevels(); } catch (e) {}
    return { clar: 100, act: 0, cons: 0 };
  },

  // ---- canvas helpers ----
  _font(weight, px) {
    return weight + ' ' + px + 'px Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  },
  // Centered text with manual letter-spacing (canvas letterSpacing is spotty).
  _tracked(ctx, text, cx, y, track) {
    const chars = String(text).split('');
    let total = 0;
    for (let i = 0; i < chars.length; i++) total += ctx.measureText(chars[i]).width + (i < chars.length - 1 ? track : 0);
    let x = cx - total / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], x, y);
      x += ctx.measureText(chars[i]).width + track;
    }
    ctx.textAlign = prevAlign;
  },
  _wrap(ctx, text, maxWidth, maxLines) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
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
          let rest = words.slice(i).join(' ');
          while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 1) rest = rest.slice(0, -1);
          if (words.slice(i).join(' ') !== rest) rest = rest.replace(/\s+\S*$/, '') + '…';
          lines.push(rest);
          return lines;
        }
      } else { line = test; }
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  },
  _bloom(ctx, x, y, r, color, alpha) {
    if (alpha <= 0.001) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('ALPHA', alpha.toFixed(3)));
    g.addColorStop(0.45, color.replace('ALPHA', (alpha * 0.45).toFixed(3)));
    g.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1350);
  },

  // ---- draw the card (1080x1350, 4:5 portrait for social) ----
  _draw(canvas) {
    const W = 1080, H = 1350;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const L = this._levels();
    const clar = Math.max(0, Math.min(1, (L.clar || 0) / 100));
    const act = Math.max(0, Math.min(1, (L.act || 0) / 100));
    const cons = Math.max(0, Math.min(1, (L.cons || 0) / 100));
    // clarity is the anchor of this moment; never let the scene go fully dark.
    const clarLit = Math.max(0.7, clar);

    ctx.clearRect(0, 0, W, H);

    // base near-black gradient (matches the app's dark soul)
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0c0b13');
    bg.addColorStop(0.52, '#09080f');
    bg.addColorStop(1, '#060509');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Pillar blooms, additive so they read as light through glass. Colors mirror
    // the in-app living card's blob values EXACTLY (css/daycard-living.css: clarity
    // 150,116,255 / action 236,239,255 / consistency 56,236,150) so the exported
    // image is literally the user's living card, not a near-miss. Clarity is the
    // anchor and stays dominant; action/consistency are kept subordinate so a
    // fully-lit re-share never crowds the engraved goal with opposed color masses.
    ctx.globalCompositeOperation = 'lighter';
    this._bloom(ctx, W * 0.66, H * 0.27, W * 0.92, 'rgba(150,116,255,ALPHA)', 0.40 * clarLit);
    this._bloom(ctx, W * 0.70, H * 0.24, W * 0.42, 'rgba(176,150,255,ALPHA)', 0.30 * clarLit);
    this._bloom(ctx, W * 0.30, H * 0.49, W * 0.50, 'rgba(236,239,255,ALPHA)', 0.17 * act);
    this._bloom(ctx, W * 0.30, H * 0.74, W * 0.62, 'rgba(56,236,150,ALPHA)', 0.20 * cons);
    // a cool reflected pool low on the card, like the living card's mirror
    this._bloom(ctx, W * 0.52, H * 1.02, W * 0.85, 'rgba(120,140,220,ALPHA)', 0.14 * clarLit);
    ctx.globalCompositeOperation = 'source-over';

    // Star motif: a single soft luminous core at the bloom peak. No diffraction
    // spikes (a hard cross-of-light reads as a Canva sparkle); the glow is the star.
    const sx = W * 0.66, sy = H * 0.27;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(sx, sy, 0, sx, sy, 104);
    core.addColorStop(0, 'rgba(249,247,255,' + (0.62 * clarLit).toFixed(3) + ')');
    core.addColorStop(0.38, 'rgba(198,182,255,' + (0.22 * clarLit).toFixed(3) + ')');
    core.addColorStop(1, 'rgba(198,182,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // vignette: pull the edges down so the eye sits center
    const vig = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.2, W / 2, H * 0.5, H * 0.78);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // ---- type ----
    ctx.textBaseline = 'alphabetic';

    // eyebrow
    ctx.fillStyle = 'rgba(198,186,255,0.82)';
    ctx.font = this._font('600', 27);
    this._tracked(ctx, 'MY NEUTRON STAR', W / 2, 196, 5);

    // goal: the engraved hero, auto-sized to fit
    const goal = this._goal() || 'Set your Neutron Star';
    const maxW = W - 200;
    // Auto-size so the goal is engraved in full: pick the largest font where the
    // wrapped goal fits within 6 lines + the height budget. Only pathological
    // input (a single unbroken token wider than the card) is ever ellipsized.
    let size = 78, lines = [];
    for (; size >= 38; size -= 2) {
      ctx.font = this._font('700', size);
      lines = this._wrap(ctx, goal, maxW, 6);
      const lineH = size * 1.16;
      if (lines.length * lineH <= 600) break;
    }
    ctx.font = this._font('700', size);
    ctx.fillStyle = 'rgba(247,247,252,0.98)';
    ctx.textAlign = 'center';
    const lineH = size * 1.16;
    const blockH = lines.length * lineH;
    let ty = H * 0.5 - blockH / 2 + size * 0.82;
    lines.forEach(function (ln) { ctx.fillText(ln, W / 2, ty); ty += lineH; });
    ctx.textAlign = 'left';

    // hairline rule under the goal
    const ruleY = H * 0.5 + blockH / 2 + 46;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 34, ruleY);
    ctx.lineTo(W / 2 + 34, ruleY);
    ctx.stroke();

    // star designation (if named)
    const name = this._starName();
    if (name) {
      ctx.fillStyle = 'rgba(176,170,206,0.72)';
      ctx.font = this._font('600', 24);
      this._tracked(ctx, name.toUpperCase(), W / 2, ruleY + 52, 3);
    }

    // Mori line: mortality woven in, the reason the goal matters. Plain register,
    // matching the in-app whisper bar ("~X weeks left"), not a motivational tail.
    const wl = this._weeksLeft();
    if (wl != null) {
      ctx.fillStyle = 'rgba(174,168,200,0.62)';
      ctx.font = this._font('500', 29);
      ctx.textAlign = 'center';
      ctx.fillText('~' + wl.toLocaleString() + ' weeks left.', W / 2, H - 174);
      ctx.textAlign = 'left';
    }

    // wordmark
    ctx.fillStyle = 'rgba(158,152,186,0.78)';
    ctx.font = this._font('700', 28);
    this._tracked(ctx, 'MEMENTO', W / 2, H - 92, 7);
  },

  // ---- open the share moment (dedicated premium overlay) ----
  open(opts) {
    if (!this._goal()) return; // nothing to share without a star
    // Optional {title, sub} override so the same overlay can frame a different
    // moment (e.g. the first-win celebration) without a second renderer.
    opts = opts || {};
    const _title = (opts.title || 'Your star, sealed.');
    const _sub = (opts.sub || 'Yours to keep, or to share.');
    // Capture the underlying overflow BEFORE removing any stale overlay, and only
    // when none is currently open, so a re-open does not capture our own 'hidden'.
    // The card can open OVER the Clarity ceremony, which holds its own scroll-lock;
    // close() must restore exactly this, not blindly clear it.
    if (!this._overlay) {
      this._prevOverflow = document.body.style.overflow;
      // Remember the trigger so focus returns to it on close (a11y).
      this._prevFocus = (document.activeElement && typeof document.activeElement.focus === 'function') ? document.activeElement : null;
    }
    this._removeOverlay(); // remove a stale overlay's DOM only (does not touch overflow)
    const ov = document.createElement('div');
    ov.className = 'msc-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', 'Share your Neutron Star');
    ov.innerHTML =
      '<div class="msc-scrim"></div>' +
      '<div class="msc-panel">' +
        '<div class="msc-frame"><canvas class="msc-canvas" id="mscCanvas" width="1080" height="1350"></canvas></div>' +
        '<div class="msc-title">' + esc(_title) + '</div>' +
        '<div class="msc-sub">' + esc(_sub) + '</div>' +
        '<button type="button" class="msc-btn msc-btn--primary" id="mscShare">Share</button>' +
        '<div class="msc-subactions">' +
          '<button type="button" class="msc-link" id="mscCopy">Copy text</button>' +
          '<button type="button" class="msc-link" id="mscLater">Not now</button>' +
        '</div>' +
        '<div class="msc-msg" id="mscMsg" aria-live="polite"></div>' +
      '</div>';
    document.body.appendChild(ov);
    this._overlay = ov;
    document.body.style.overflow = 'hidden';

    const canvas = ov.querySelector('#mscCanvas');
    const self = this;
    const drawNow = function () { try { self._draw(canvas); } catch (e) {} };
    drawNow();
    // redraw once the Geist webfont is ready so the export uses the brand face
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawNow); } catch (e) {}

    requestAnimationFrame(function () { ov.classList.add('is-in'); });

    const msg = ov.querySelector('#mscMsg');
    const flash = function (t, ok) { if (!msg) return; msg.textContent = t; msg.style.color = ok ? 'rgba(120,230,170,0.95)' : 'rgba(180,176,200,0.8)'; };

    ov.querySelector('#mscShare').addEventListener('click', function () { self._shareOrSave(canvas, flash); });
    ov.querySelector('#mscCopy').addEventListener('click', function () { self._copyText(flash); });
    ov.querySelector('#mscLater').addEventListener('click', function () { self.close(); });
    ov.querySelector('.msc-scrim').addEventListener('click', function () { self.close(); });

    // a11y: Escape closes (matching the fullscreen Memento view), and focus moves
    // to the primary action on open. Capturing + stopImmediatePropagation so one
    // Escape closes ONLY this top overlay, never the ceremony / fullscreen beneath.
    if (self._escHandler) { try { document.removeEventListener('keydown', self._escHandler, true); } catch (e) {} }
    self._escHandler = function (e) { if (e.key !== 'Escape') return; e.preventDefault(); e.stopImmediatePropagation(); self.close(); };
    document.addEventListener('keydown', self._escHandler, true);
    try { const sb = ov.querySelector('#mscShare'); if (sb) requestAnimationFrame(function () { try { sb.focus(); } catch (e) {} }); } catch (e) {}
  },

  // Remove the overlay DOM only. Does NOT restore overflow (open() reuses this).
  _removeOverlay() {
    const ov = this._overlay || document.querySelector('.msc-overlay');
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    this._overlay = null;
  },

  close() {
    this._removeOverlay();
    try { if (this._escHandler) { document.removeEventListener('keydown', this._escHandler, true); this._escHandler = null; } } catch (e) {}
    // Restore the captured value (keeps the ceremony's scroll-lock if it set one).
    try { document.body.style.overflow = this._prevOverflow || ''; } catch (e) {}
    this._prevOverflow = undefined;
    // Return focus to whatever opened the card (a11y).
    try { if (this._prevFocus && typeof this._prevFocus.focus === 'function') this._prevFocus.focus(); } catch (e) {}
    this._prevFocus = undefined;
  },

  _text() {
    const goal = this._goal();
    let t = 'My Neutron Star\n\n' + goal;
    const wl = this._weeksLeft();
    if (wl != null) t += '\n\n~' + wl.toLocaleString() + ' weeks left.';
    return t + '\n\nMade in Memento';
  },

  _copyText(flash) {
    const text = this._text();
    try {
      navigator.clipboard.writeText(text).then(
        function () { flash('Copied.', true); },
        function () { flash('Could not copy here.'); }
      );
    } catch (e) { flash('Could not copy here.'); }
  },

  // Native share sheet with the image (the real path on a phone); falls back
  // to a PNG download on desktop / unsupported browsers.
  _shareOrSave(canvas, flash) {
    const self = this;
    const fail = function () {
      try {
        let url = '';
        try { url = canvas.toDataURL('image/png'); } catch (e) { url = ''; }
        if (!(typeof url === 'string' && url.indexOf('data:image/png') === 0 && url.length > 1000)) {
          flash("Can't make the image here. Copy the text instead.");
          return;
        }
        const a = document.createElement('a');
        a.href = url; a.download = 'my-neutron-star.png';
        document.body.appendChild(a); a.click();
        setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 100);
        flash('Saved to your downloads.', true);
      } catch (e) { flash("Can't make the image here. Copy the text instead."); }
    };
    try {
      if (!canvas.toBlob) { fail(); return; }
      canvas.toBlob(function (blob) {
        if (!blob) { fail(); return; }
        try {
          const file = new File([blob], 'my-neutron-star.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
            navigator.share({ files: [file], text: self._text() }).then(
              function () { flash('Shared.', true); },
              function (err) { if (err && err.name === 'AbortError') { flash(''); } else { fail(); } }
            );
          } else { fail(); }
        } catch (e) { fail(); }
      }, 'image/png');
    } catch (e) { fail(); }
  }
};
try { window.MementoShareCard = MementoShareCard; } catch (e) {}
// One delegated listener so any [data-share-star] control (the Neutron Star
// summary link, the hub) opens the share moment, surviving innerHTML re-renders.
try {
  document.addEventListener('click', function (e) {
    const t = e.target && e.target.closest && e.target.closest('[data-share-star]');
    if (!t) return;
    e.preventDefault();
    try { MementoShareCard.open(); } catch (err) {}
  });
} catch (e) {}
