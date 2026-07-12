/* Memento module: consistency heatmap/module, flip anims, mori math
   Extracted from app.js lines 13256-13942. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   CONSISTENCY: unified activity heatmap
   ============================================ */
// Normalize any stored date (ISO yyyy-mm-dd, full ISO timestamp, or a parseable
// string like "Mon, Jan 1, 2025") to a yyyy-mm-dd key. Returns null if unparseable.
function _isoDayKey(d) {
  // Full timestamps convert through the LOCAL clock (an 11pm completion
  // belongs to today's cell, not tomorrow's UTC date). Bare day keys pass
  // through. _dayNum/_keyFromDayNum below stay UTC string math on purpose:
  // they only shuttle day keys to grid columns and back, no wall clock.
  try {
    if (!d) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return localISO(dt);
  } catch (e) { return null; }
}
function _dayNum(isoKey) { return Math.floor(Date.parse(isoKey + 'T00:00:00Z') / 86400000); }
// 0 = weeks start Sunday (default), 1 = Monday (state.prefs.weekStart).
function _weekStartOffset() { try { return (state.prefs && state.prefs.weekStart === 'mon') ? 1 : 0; } catch (e) { return 0; } }
function _keyFromDayNum(n) { return new Date(n * 86400000).toISOString().split('T')[0]; }

// Aggregates activity across modules into a { isoDate: score } map. This is the
// single source of truth for "how consistent have you been". Each event adds to
// that day's score; the heatmap buckets the score into intensity levels.
function buildConsistencyData() {
  const counts = {};
  const add = (d, w) => { const k = _isoDayKey(d); if (k) counts[k] = (counts[k] || 0) + (w || 1); };
  try {
    const s = state || {};
    (s.streak && Array.isArray(s.streak.history) ? s.streak.history : []).forEach(d => add(d, 1));
    (s.action && Array.isArray(s.action.completionHistory) ? s.action.completionHistory : []).forEach(h => add(h && h.date, 1));
    // A daily check-in is showing up too (its proof event is written as type
    // 'proof' for the memory feed, so it falls outside PROOF_ACTIVE below; read
    // the check-in array directly here so a check-in-only day still counts toward
    // the streak / heatmap and never triggers a false "comeback" nudge). iso is a
    // local getTodayISO() day key, timezone-stable like every other source.
    (s.checkins && Array.isArray(s.checkins) ? s.checkins : []).forEach(c => { if (c && c.iso) add(c.iso, 1); });
    // Key off iso (timezone-stable, matches every other source) and only count
    // entries with real text so an empty new note never inflates the streak.
    (s.reflection && Array.isArray(s.reflection.entries) ? s.reflection.entries : []).forEach(e => { if (e && (e.text || '').trim()) add(e.iso || e.date, 1); });
    // Deep work: prefer an ISO field if present (added in the P4 deepwork upgrade),
    // fall back to the legacy short-date string.
    (s.deepwork && Array.isArray(s.deepwork.sessions) ? s.deepwork.sessions : []).forEach(x => add(x && (x.iso || x.dateISO || x.date), 1));
    // proofEvents as an ADDITIONAL source, gap-fill only: it can mark a day
    // active that the legacy arrays miss (future proofEvents-only activity),
    // but it never adds weight to a day already counted above, so the streak
    // and heatmap intensity stay byte-identical for all existing data. Only the
    // event types that already count toward consistency are eligible.
    const PROOF_ACTIVE = { 'action-complete': 1, 'deepwork-commit': 1, 'reflection-save': 1, 'checkin': 1, 'vivere': 1 };
    (s.proofEvents && Array.isArray(s.proofEvents) ? s.proofEvents : []).forEach(ev => {
      if (!ev || !PROOF_ACTIVE[ev.type]) return;
      const k = _isoDayKey(ev.iso);
      if (k && counts[k] === undefined) counts[k] = 1;
    });
  } catch (e) {}
  return counts;
}

// Current streak = consecutive active days walking back from today over the
// unified activity set. Today not-yet-active does not break it (it counts back
// from yesterday), so opening the app before doing the thing never shows 0.
function _currentStreakFrom(counts, strict) {
  // Never miss twice: a single quiet day no longer collapses the run. Walking
  // back from today, we bridge exactly ONE missing day, but only after at least
  // one counted day (so missing today AND yesterday still breaks the run) and
  // only when the day before the gap is active (a 2+ day gap never bridges).
  // Pass strict=true for the raw chain (used where a true break must be detected).
  const active = new Set(Object.keys(counts).map(_dayNum));
  // Grace days already spent are covered days forever: they keep the chain
  // intact in both modes (a covered day is not a break, even for the raw chain).
  try {
    const used = (state.streak && state.streak.grace && state.streak.grace.used) || {};
    Object.keys(used).forEach(k => active.add(_dayNum(k)));
  } catch (e) {}
  const today = _dayNum(getTodayISO());
  let walk = active.has(today) ? today : today - 1;
  let n = 0, bridged = false;
  while (true) {
    if (active.has(walk)) { n += 1; walk -= 1; continue; }
    if (!strict && n >= 1 && !bridged && active.has(walk - 1)) { bridged = true; walk -= 1; continue; }
    break;
  }
  return n;
}
function consistencyStats() {
  const counts = buildConsistencyData();
  const keys = Object.keys(counts).sort();
  const totalActiveDays = keys.length;
  let longest = 0, cur = 0, prev = null;
  keys.forEach(k => {
    const n = _dayNum(k);
    if (prev !== null && n - prev === 1) cur += 1; else cur = 1;
    if (cur > longest) longest = cur;
    prev = n;
  });
  const todayNum = _dayNum(getTodayISO());
  let thisWeek = 0, lastWeek = 0, last30 = 0;
  keys.forEach(k => {
    const diff = todayNum - _dayNum(k);
    if (diff >= 0 && diff <= 6) thisWeek += 1;
    else if (diff >= 7 && diff <= 13) lastWeek += 1;
    if (diff >= 0 && diff <= 29) last30 += 1;
  });
  const pct30 = Math.round((last30 / 30) * 100);
  // Compounding consistency: a "100% day" is 5 logged actions, so each meaningful
  // action is 20%. dayFill(iso) returns 0..1. yearConsistency is the average fill
  // over the trailing 365 days x100; it climbs slowly and is never 100, which is
  // the point: a long-range number you watch rise.
  let yearFillSum = 0;
  for (let d = 0; d < 365; d++) {
    const v = counts[_keyFromDayNum(todayNum - d)] || 0;
    yearFillSum += Math.min(5, v) / 5;
  }
  const yearConsistency = Math.round((yearFillSum / 365) * 100);
  // current uses the never-miss-twice bridge; longest is computed strictly above.
  // Clamp longest so it can never display below current (a bridged current beating
  // a strict longest would otherwise read as logically impossible, and would also
  // let a backfill mint a false "new record" via the bestEverShown seed).
  const current = _currentStreakFrom(counts);
  longest = Math.max(longest, current);
  return { counts, totalActiveDays, longest, current, thisWeek, lastWeek, last30, pct30, yearConsistency };
}

// dayFill: 0..1 share of a "full" day (5 logged actions = 100%). Shared by the
// heatmap shading and the trajectory graph so both read the same compounding model.
function consistencyDayFill(count) { return Math.min(5, count || 0) / 5; }

// Counts proof events in the trailing 7 days by type, for the "Week of Proof"
// summary on Home and in Momentum. Reads the proofEvents spine.
function weekProofSummary() {
  const out = { actions: 0, deepwork: 0, reflections: 0, distractions: 0, days: 0 };
  try {
    const todayNum = _dayNum(getTodayISO());
    const inWeek = (d) => { const k = _isoDayKey(d); if (!k) return false; const n = _dayNum(k); return !isNaN(n) && todayNum - n >= 0 && todayNum - n <= 6; };
    const days = new Set();
    const mark = (d) => { const k = _isoDayKey(d); if (k) days.add(k); };
    // Read the source arrays directly so this works whether or not proofEvents
    // has been derived yet (e.g. demo personas skip the derive migration).
    (state.action && state.action.completionHistory || []).forEach(h => { if (h && inWeek(h.date)) { out.actions++; mark(h.date); } });
    (state.deepwork && state.deepwork.sessions || []).forEach(s => { const d = s && (s.iso || s.dateISO || s.date); if (inWeek(d)) { out.deepwork++; mark(d); } });
    (state.reflection && state.reflection.entries || []).forEach(e => { const d = e && (e.iso || e.date); if (inWeek(d)) { out.reflections++; mark(d); } });
    (state.distraction && state.distraction.logs || []).forEach(l => { if (l && inWeek(l.date)) { out.distractions++; mark(l.date); } });
    out.days = days.size;
  } catch (e) {}
  return out;
}

// Renders a GitHub-style contribution grid for the trailing `weeks` weeks.
// Columns = weeks (oldest left), rows = days (Sun..Sat). Future cells render
// faint and empty. Horizontally scrollable so it never overflows the sheet.
// Thermal/jet color for a 0..1 position (0 = cold/old, 1 = hot/recent).
// Interpolates blue -> teal -> green -> yellow -> orange -> red.
function _thermalColor(t) {
  t = Math.max(0, Math.min(1, t));
  const stops = [
    [0.00, 47, 124, 232],   // blue (coldest / oldest)
    [0.28, 56, 196, 196],   // teal
    [0.50, 63, 200, 92],    // green
    [0.68, 255, 212, 40],   // yellow
    [0.84, 255, 150, 30],   // orange
    [1.00, 255, 47, 29]     // red (hottest / now)
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i];
      const f = (t - a[0]) / (b[0] - a[0]);
      return [
        Math.round(a[1] + (b[1] - a[1]) * f),
        Math.round(a[2] + (b[2] - a[2]) * f),
        Math.round(a[3] + (b[3] - a[3]) * f)
      ];
    }
  }
  const l = stops[stops.length - 1];
  return [l[1], l[2], l[3]];
}

function renderConsistencyHeatmap(weeks, mode, fit, scale) {
  weeks = weeks || 26;
  mode = mode === 'year' ? 'year' : 'rolling';
  const { counts } = consistencyStats();
  // Compounding model: 5 logged actions = a full (100%) day, each action = 20%.
  // So a day grades across 5 green steps (l1 faintest at 1 action, l5 full at 5+).
  const level = (v) => v <= 0 ? 0 : Math.min(5, v);
  // Days covered by a spent grace day render muted (never red, never empty).
  const _graceUsed = (state.streak && state.streak.grace && state.streak.grace.used) || {};
  // Week scale: a single row of the last 7 days with weekday letters, larger
  // cells. Keeps the graded 5-level green fill and the tap-to-fill behaviour.
  if (scale === 'week') {
    const todayNum = _dayNum(getTodayISO());
    const DOWL = ['S','M','T','W','T','F','S'];
    let row7 = '';
    for (let i = 6; i >= 0; i--) {
      const dn = todayNum - i;
      const key = _keyFromDayNum(dn);
      const v = counts[key] || 0;
      const lvl = level(v);
      const isToday = dn === todayNum;
      const isGrace = v === 0 && _graceUsed[key];
      const dow = new Date(dn * 86400000).getUTCDay();
      const base = isGrace ? `${key}: covered by a grace day` : (v === 0 ? `${key}: nothing logged` : `${key}: ${v} ${v === 1 ? 'action logged' : 'actions logged'}`);
      const label = (isToday ? 'Today, ' : '') + (v === 0 && !isGrace ? `${base}. Tap to mark this day done.` : isGrace ? `${base}.` : `${base}. Tap to undo.`);
      row7 += `<div class="cgweek__day">` +
        `<div class="cgraph__cell cgraph__cell--l${lvl}${isGrace ? ' cgraph__cell--grace' : ''} cgraph__cell--tap${isToday ? ' cgraph__cell--today' : ''}" data-date="${key}" role="button" tabindex="0" aria-label="${label}" title="${label}"></div>` +
        `<span class="cgweek__dow${isToday ? ' cgweek__dow--today' : ''}">${DOWL[dow]}</span>` +
      `</div>`;
    }
    return `<div class="cgraph cgraph--week${fit ? ' cgraph--fit' : ''}" role="group" aria-label="The last seven days. Each square is a day; greener squares mean more done. Tap a day to mark it done or undo it.">` +
      `<div class="cgweek">${row7}</div>` +
      (Object.keys(counts).length === 0 ? '<div class="empty-state"><div class="empty-state__label">No proof yet</div><div class="empty-state__hint">Every square here becomes a win the moment you act, starting today.</div><hr class="empty-state__rule" aria-hidden="true"></div>' : '') +
    `</div>`;
  }
  // Heatmap appearance settings (shape / spacing / palette) live in state.ui and
  // are toggled from the "Customize heatmap" panel in the Consistency sheet.
  const _ui = (state && state.ui) || {};
  const hmShape = _ui.heatmapShape === 'dot' ? 'dot' : 'square';
  const hmSpacing = (_ui.heatmapSpacing === 'roomy' || _ui.heatmapSpacing === 'months') ? _ui.heatmapSpacing : 'snug';
  const hmPalette = _ui.heatmapPalette === 'thermal' ? 'thermal' : 'classic';
  const hmMod = ` cgraph--shape-${hmShape} cgraph--gap-${hmSpacing} cgraph--pal-${hmPalette}` + (scale === 'month' ? ' cgraph--month-span' : '');
  const todayNum = _dayNum(getTodayISO());
  const todayDOW = (new Date(getTodayISO() + 'T00:00:00Z').getUTCDay() - _weekStartOffset() + 7) % 7;
  // Column count + first cell depend on the alignment mode:
  //  - rolling: the rightmost column is THIS week (today on the far right).
  //  - year:    the leftmost column is the first week of the current year
  //             (Jan 1), so the calendar year reads left->right with the
  //             un-lived days ahead shown as faint "future" cells.
  let startSunday, colCount;
  if (mode === 'year') {
    const y = new Date(getTodayISO() + 'T00:00:00Z').getUTCFullYear();
    const jan1 = _dayNum(y + '-01-01');
    const jan1DOW = (new Date(y + '-01-01T00:00:00Z').getUTCDay() - _weekStartOffset() + 7) % 7;
    startSunday = jan1 - jan1DOW;
    colCount = Math.min(weeks, 53); // one calendar year, never more than fits
  } else {
    colCount = weeks;
    startSunday = todayNum - todayDOW - (colCount - 1) * 7;
  }
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Thermal palette colors each day by recency: the leftmost (oldest) day is
  // cold blue, today is hot red, gradient flowing across the whole grid.
  const spanStart = startSunday;
  const spanEnd = Math.max(startSunday + 1, todayNum);

  let monthRow = '<div class="cgraph__months">';
  let cols = '<div class="cgraph__cols">';
  let lastMonth = -1;
  let lastYear = -1;
  for (let c = 0; c < colCount; c++) {
    const colStartNum = startSunday + c * 7;
    const colDate = new Date(colStartNum * 86400000);
    const mo = colDate.getUTCMonth();
    const yr = colDate.getUTCFullYear();
    // Year boundary: when the year rolls over (Dec -> Jan), mark the column and
    // print the year in the label row so the user watches the years pass by.
    const newYear = lastYear !== -1 && yr !== lastYear;
    const newMonth = mo !== lastMonth;
    const monthGap = c > 0 && newMonth; // skip the first column so the grid never shifts
    monthRow += `<div class="cgraph__month${newYear ? ' cgraph__month--year' : ''}${monthGap ? ' cgraph__month--mgap' : ''}">${newYear ? yr : (newMonth ? MONTHS[mo] : '')}</div>`;
    lastMonth = mo;
    lastYear = yr;
    cols += `<div class="cgraph__col${newYear ? ' cgraph__col--yearstart' : ''}${monthGap ? ' cgraph__col--mgap' : ''}">`;
    for (let r = 0; r < 7; r++) {
      const dn = colStartNum + r;
      if (dn > todayNum) { cols += '<div class="cgraph__cell cgraph__cell--future" title="Not here yet"></div>'; continue; }
      const key = _keyFromDayNum(dn);
      const v = counts[key] || 0;
      const lvl = level(v);
      const isToday = dn === todayNum;
      const isGrace = v === 0 && _graceUsed[key];
      const base = isGrace ? `${key}: covered by a grace day` : (v === 0 ? `${key}: nothing logged` : `${key}: ${v} ${v === 1 ? 'action logged' : 'actions logged'}`);
      // Non-future cells are tappable: same backfill toggle the calendar uses.
      const label = (isToday ? 'Today, ' : '') + (v === 0 && !isGrace ? `${base}. Tap to mark this day done.` : isGrace ? `${base}.` : `${base}. Tap to undo.`);
      // Thermal: hue by recency (old=red -> now=blue); intensity sets vividness.
      let styleAttr = '';
      if (hmPalette === 'thermal' && lvl > 0) {
        const t = 1 - (dn - spanStart) / (spanEnd - spanStart);
        const col = _thermalColor(t);
        const a = lvl >= 5 ? 1 : lvl === 4 ? 0.86 : lvl === 3 ? 0.72 : lvl === 2 ? 0.58 : 0.46;
        const glow = (lvl >= 5 && !isToday) ? `;box-shadow:0 0 5px rgba(${col[0]},${col[1]},${col[2]},0.55)` : '';
        styleAttr = ` style="background:rgba(${col[0]},${col[1]},${col[2]},${a})${glow}"`;
      }
      cols += `<div class="cgraph__cell cgraph__cell--l${lvl}${isGrace ? ' cgraph__cell--grace' : ''} cgraph__cell--tap${isToday ? ' cgraph__cell--today' : ''}"${styleAttr} data-date="${key}" role="button" tabindex="0" aria-label="${label}" title="${label}"></div>`;
    }
    cols += '</div>';
  }
  monthRow += '</div>';
  cols += '</div>';

  const legend = hmPalette === 'thermal'
    ? `<div class="cgraph__legend"><span style="flex:1"></span><span>Past</span>
    <div class="cgraph__heatbar cgraph__heatbar--flip" aria-hidden="true"></div>
    <span>Now</span></div>`
    : `<div class="cgraph__legend"><span style="flex:1"></span><span>Less</span>
    <div class="cgraph__cell cgraph__cell--l0"></div>
    <div class="cgraph__cell cgraph__cell--l1"></div>
    <div class="cgraph__cell cgraph__cell--l2"></div>
    <div class="cgraph__cell cgraph__cell--l3"></div>
    <div class="cgraph__cell cgraph__cell--l4"></div>
    <div class="cgraph__cell cgraph__cell--l5"></div>
    <span>More</span></div>`;

  return `<div class="cgraph${fit ? ' cgraph--fit' : ''}${hmMod}" role="group" aria-label="Daily consistency, oldest days on the left. Each square is a day; greener squares mean more done, and empty squares are days with nothing logged. Tap a day to mark it done or undo it.">
    <div class="cgraph__scroll">
      <div class="cgraph__inner">${monthRow}${cols}</div>
    </div>
    ${legend}
    ${Object.keys(counts).length === 0 ? '<div class="empty-state"><div class="empty-state__label">No proof yet</div><div class="empty-state__hint">Every square here becomes a win the moment you act, starting today.</div><hr class="empty-state__rule" aria-hidden="true"></div>' : ''}
  </div>`;
}

// Trajectory graph: a small, premium line chart of CUMULATIVE consistency over
// time. For each week in the window (oldest left), we plot the running average of
// dayFill from the start of the window through that week x100, so the line tends
// to climb as the user gets more consistent. Pure inline SVG, no animation loop
// (one-shot CSS draw only, disabled under reduced-motion / lite). Stroke uses the
// same green as the heatmap (--success-rgb).
function renderConsistencyTrajectory(weeks) {
  weeks = weeks || 40;
  const { counts } = consistencyStats();
  const todayNum = _dayNum(getTodayISO());
  const todayDOW = (new Date(getTodayISO() + 'T00:00:00Z').getUTCDay() - _weekStartOffset() + 7) % 7;
  const startSunday = todayNum - todayDOW - (weeks - 1) * 7;
  // Trailing 14-day ROLLING average sampled at each week end. A shorter window
  // gives the line more texture (sharper, more jagged) while still trending up as
  // recent weeks get more consistent.
  const ROLL = 14;
  const pts = [], dayAt = [];
  for (let w = 0; w < weeks; w++) {
    if (startSunday + w * 7 > todayNum) break;
    const end = Math.min(startSunday + w * 7 + 6, todayNum);
    let sum = 0, n = 0;
    for (let d = 0; d < ROLL; d++) { sum += consistencyDayFill(counts[_keyFromDayNum(end - d)] || 0); n += 1; }
    pts.push(Math.round((sum / n) * 100));
    dayAt.push(end);
  }
  if (pts.length < 2) return '';
  const cur = pts[pts.length - 1];
  const peak = Math.max.apply(null, pts);
  // Uniform scaling (no preserveAspectRatio=none, which stretched the stroke).
  // Left gutter for % labels, bottom gutter for month labels.
  const W = 620, H = 190, padL = 34, padR = 16, padT = 16, padB = 30;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(20, Math.ceil((peak + 8) / 10) * 10);
  const x = (i) => padL + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * innerW);
  const y = (v) => padT + innerH - (v / maxVal) * innerH;
  // Straight segments between points: sharper and more jagged, matching Memento's
  // angular feel (and the stroke stays even all the way to the final point).
  const P = pts.map((v, i) => [x(i), y(v)]);
  let line = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1) + ' ';
  for (let i = 1; i < P.length; i++) line += 'L' + P[i][0].toFixed(1) + ' ' + P[i][1].toFixed(1) + ' ';
  const baseY = (padT + innerH).toFixed(1);
  const area = line + 'L' + P[P.length - 1][0].toFixed(1) + ' ' + baseY + ' L' + P[0][0].toFixed(1) + ' ' + baseY + ' Z';
  // Y gridlines + % labels at 0, half, max.
  let grid = '', ylabels = '';
  [0, Math.round(maxVal / 2), maxVal].forEach(v => {
    const gy = y(v).toFixed(1);
    grid += '<line class="ctraj__grid" x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '"/>';
    ylabels += '<text class="ctraj__ylab" x="' + (padL - 7) + '" y="' + (y(v) + 3).toFixed(1) + '" text-anchor="end">' + v + '%</text>';
  });
  // X labels: month abbreviations at up to 4 evenly spaced points.
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let xlabels = '';
  const nlab = Math.min(4, pts.length);
  for (let k = 0; k < nlab; k++) {
    const i = nlab === 1 ? 0 : Math.round(k * (pts.length - 1) / (nlab - 1));
    const dt = new Date(dayAt[i] * 86400000);
    const anchor = k === 0 ? 'start' : (k === nlab - 1 ? 'end' : 'middle');
    xlabels += '<text class="ctraj__xlab" x="' + x(i).toFixed(1) + '" y="' + (H - 9) + '" text-anchor="' + anchor + '">' + MON[dt.getUTCMonth()] + '</text>';
  }
  const lastX = x(pts.length - 1), lastY = y(cur);
  const uid = 'ctraj' + Math.random().toString(36).slice(2, 7);
  return `<div class="ctraj">
    <div class="ctraj__head"><span class="ctraj__cap">Your consistency over time</span><span class="ctraj__val">${cur}%<span class="ctraj__now"> now</span></span></div>
    <svg class="ctraj__svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Your consistency trend, currently ${cur} percent on a 0 to ${maxVal} percent scale">
      <defs>
        <linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(var(--success-rgb),0.24)"/>
          <stop offset="100%" stop-color="rgba(var(--success-rgb),0)"/>
        </linearGradient>
      </defs>
      ${grid}
      <path class="ctraj__area" d="${area}" fill="url(#${uid})"/>
      <path class="ctraj__line" d="${line.trim()}"/>
      <circle class="ctraj__dot" cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.4"/>
      ${ylabels}
      ${xlabels}
    </svg>
  </div>`;
}

// Compact "Customize heatmap" panel: shape / spacing / palette segmented
// toggles. Collapsed by default so it stays a quiet, optional affordance.
function renderHeatmapControls() {
  const ui = (state && state.ui) || {};
  const shape = ui.heatmapShape === 'dot' ? 'dot' : 'square';
  const spacing = (ui.heatmapSpacing === 'roomy' || ui.heatmapSpacing === 'months') ? ui.heatmapSpacing : 'snug';
  const palette = ui.heatmapPalette === 'thermal' ? 'thermal' : 'classic';
  const seg = (group, opts, cur) => '<div class="hmseg" role="group">' + opts.map(o =>
    `<button type="button" class="hmseg__btn${o[0] === cur ? ' hmseg__btn--on' : ''}" data-hm="${group}" data-val="${o[0]}" aria-pressed="${o[0] === cur}">${o[1]}</button>`).join('') + '</div>';
  return '<details class="hmcustom">' +
    '<summary class="hmcustom__sum">Customize heatmap</summary>' +
    '<div class="hmctl">' +
      '<div class="hmctl__row"><span class="hmctl__label">Shape</span>' + seg('shape', [['square', 'Squares'], ['dot', 'Dots']], shape) + '</div>' +
      '<div class="hmctl__row"><span class="hmctl__label">Spacing</span>' + seg('spacing', [['snug', 'Snug'], ['roomy', 'Weeks'], ['months', 'Months']], spacing) + '</div>' +
      '<div class="hmctl__row"><span class="hmctl__label">Color</span>' + seg('palette', [['classic', 'Classic'], ['thermal', 'Thermal']], palette) + '</div>' +
    '</div>' +
  '</details>';
}

function renderConsistencyStats() {
  const st = consistencyStats();
  const cell = (num, label, tip) => `<div class="cstat"${tip ? ` title="${tip}"` : ''}><div class="cstat__num">${num}</div><div class="cstat__label">${label}</div></div>`;
  const best = Math.max((state.streak && state.streak.bestEver) || 0, st.longest || 0);
  const tw = Math.min(7, st.thisWeek || 0);
  // Three clean tiles. Current streak lives in the hero above, so it is not
  // repeated here (best ever and longest streak were also near-duplicates).
  return `<div class="cstats">
    ${cell(best, 'best ever', 'Your longest streak ever. The number to beat.')}
    ${cell(st.totalActiveDays, 'active days', 'Total days you have shown up.')}
    ${cell(tw + '/7', 'this week', 'Active days in the last 7 days.')}
  </div>`;
}

// Calm personal-record moment. Returns the banner HTML exactly once, when
// recalculateStreak has flagged a genuinely new high (state.streak._recordJustHit),
// then clears the flag so it never repeats on re-render. No confetti; the CSS
// itself goes still under calm-motion / reduced-motion / lite.
function renderRecordMoment() {
  try {
    const n = state.streak && state.streak._recordJustHit;
    if (!n || n < 2) return '';
    state.streak._recordJustHit = null;
    return `<div class="record-moment" role="status" aria-live="polite">
      <div class="record-moment__icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
      </div>
      <div>
        <div class="record-moment__title">New record, ${n} days</div>
        <div class="record-moment__sub">Your longest streak yet. Keep it going.</div>
      </div>
    </div>`;
  } catch (e) { return ''; }
}

// Weekly consistency rate: "X of 7 days this week", with a gentle delta vs last
// week. Framing stays encouraging, never punishing: a drop reads as "room to
// build on", an even week as "steady", a rise as a quiet win. Read-only.
function renderWeeklyRate() {
  try {
    const st = consistencyStats();
    const tw = Math.min(7, st.thisWeek || 0);
    const lw = st.lastWeek || 0;
    const pct = Math.round((tw / 7) * 100);
    const diff = tw - lw;
    let dir, chipCls, chipText;
    if (diff > 0) { dir = 'up'; chipCls = 'wkrate__delta--up'; chipText = `+${diff} vs last week`; }
    else if (diff < 0) { dir = 'down'; chipCls = 'wkrate__delta--down'; chipText = `${Math.abs(diff)} to build on`; }
    else { dir = 'even'; chipCls = 'wkrate__delta--even'; chipText = lw > 0 ? 'steady with last week' : 'fresh week'; }
    const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
    return `<div class="wkrate" title="Active days in the last 7 days, compared with the 7 days before.">
      <div class="wkrate__head">
        <span class="wkrate__count">${tw}<span class="wkrate__of"> of 7 days this week</span></span>
        <span class="wkrate__delta ${chipCls}"><span aria-hidden="true">${arrow}</span> ${chipText}</span>
      </div>
      <div class="wkrate__track"><div class="wkrate__fill" style="width:${pct}%"></div></div>
    </div>`;
  } catch (e) { return ''; }
}

// Deep-work consistency bars: minutes per day over the trailing `days` days.
// Returns '' when there is nothing logged yet (invisible until earned).
function renderDeepworkBars(days) {
  days = days || 14;
  const map = {};
  (state.deepwork && Array.isArray(state.deepwork.sessions) ? state.deepwork.sessions : []).forEach(s => {
    const k = _isoDayKey(s && (s.iso || s.date));
    if (k) map[k] = (map[k] || 0) + (s.minutes || 0);
  });
  const todayNum = _dayNum(getTodayISO());
  let max = 0; const vals = [];
  for (let i = days - 1; i >= 0; i--) { const k = _keyFromDayNum(todayNum - i); const v = map[k] || 0; vals.push({ k, v }); if (v > max) max = v; }
  if (max <= 0) return '';
  let html = '<div class="dwbars">';
  vals.forEach(({ k, v }) => {
    const h = v > 0 ? Math.max(8, Math.round((v / max) * 100)) : 0;
    html += `<div class="dwbar" title="${k}: ${v} min"><div class="dwbar__fill" style="height:${h}%"></div></div>`;
  });
  html += '</div>';
  return html;
}

/* ============================================
   CONSISTENCY MODULE: hero, views (heatmap/chain/month), week/month/year
   breakdowns, and the milestone ladder. All read-only derivations off the
   unified counts from consistencyStats(); taps route through toggleStreakDay.
   ============================================ */
const CONSISTENCY_MILESTONES = [
  { t: 7,   short: "1 wk",  name: "One Week",   earned: "Seven straight. The habit is forming." },
  { t: 14,  short: "2 wk",  name: "Two Weeks",  earned: "Two weeks in. This is becoming who you are." },
  { t: 30,  short: "1 mo",  name: "One Month",  earned: "Thirty days. You proved it was not a fluke." },
  { t: 60,  short: "2 mo",  name: "Two Months", earned: "Sixty days. Most people never get here." },
  { t: 100, short: "100",   name: "The Hundred",earned: "One hundred days. This is rare air." },
  { t: 180, short: "6 mo",  name: "Half Year",  earned: "Half a year, unbroken. Quietly relentless." },
  { t: 365, short: "1 yr",  name: "The Year",   earned: "One full year. You are a different person now." }
];

function consistencyMicroState(st, done) {
  const cur = (st && st.current) || 0;
  const best = Math.max((state.streak && state.streak.bestEver) || 0, (st && st.longest) || 0);
  if (cur > 1 && cur >= best) return "New personal best. Right now.";
  if (done) return "Logged today. Keep it moving.";
  if (cur > 0) return "You are on day " + cur + ". Don't lose it.";
  return "Start the chain today.";
}

function renderConsistencyHero(st, done) {
  const cur = (st && st.current) || 0;
  return '<div class="streak-hero">' +
    '<div class="streak-hero__num">' + cur + '</div>' +
    '<div class="streak-hero__label">day streak</div>' +
    '<div class="streak-hero__sub">' + consistencyMicroState(st, done) + '</div>' +
  '</div>';
}

// Three-way segmented control (Heatmap / Chain / Month) over a swappable visual.
function renderConsistencyViews() {
  const view = (state.ui && state.ui.consistencyView) || 'heatmap';
  const seg = (v, label) => '<button type="button" class="hmseg__btn' + (v === view ? ' hmseg__btn--on' : '') + '" data-cview="' + v + '" aria-pressed="' + (v === view) + '">' + label + '</button>';
  const control = '<div class="hmseg cview__seg">' + seg('heatmap', 'Heatmap') + seg('chain', 'Chain') + seg('month', 'Month') + '</div>';
  let body = '';
  if (view === 'chain') body = renderChainCalendar();
  else if (view === 'month') { const now = new Date(); const y = (typeof calYear === 'number') ? calYear : now.getFullYear(); const m = (typeof calMonth === 'number') ? calMonth : now.getMonth(); body = renderCalendar(y, m); }
  else body = renderConsistencyHeatmap() + renderHeatmapControls();
  return '<div class="cview">' + control + '<div class="cview__body">' + body + '</div></div>';
}

// "Don't break the chain": a continuous run of green X marks, most recent at the
// right. A missed day is a clean gap (loss aversion does the work, no red).
function renderChainCalendar() {
  const { counts } = consistencyStats();
  const todayNum = _dayNum(getTodayISO());
  const todayDOW = (new Date(getTodayISO() + 'T00:00:00Z').getUTCDay() - _weekStartOffset() + 7) % 7;
  const weeks = 13;
  const startSunday = todayNum - todayDOW - (weeks - 1) * 7;
  let cols = '';
  for (let c = 0; c < weeks; c++) {
    cols += '<div class="chain__col">';
    for (let r = 0; r < 7; r++) {
      const dn = startSunday + c * 7 + r;
      if (dn > todayNum) { cols += '<div class="chain__cell chain__cell--future"></div>'; continue; }
      const key = _keyFromDayNum(dn);
      const on = (counts[key] || 0) > 0;
      const isToday = dn === todayNum;
      const x = on ? '<svg viewBox="0 0 24 24" class="chain__x" aria-hidden="true"><path d="M5 5 L19 19"/><path d="M19 5 L5 19"/></svg>' : '';
      cols += '<div class="chain__cell chain__cell--tap' + (on ? ' chain__cell--x' : '') + (isToday ? ' chain__cell--today' : '') + '" data-date="' + key + '" role="button" tabindex="0" aria-label="' + key + (on ? ', done. Tap to undo.' : ', empty. Tap to mark done.') + '">' + x + '</div>';
    }
    cols += '</div>';
  }
  const st = consistencyStats();
  const cur = st.current || 0;
  const done = (counts[getTodayISO()] || 0) > 0;
  let line;
  if (cur >= 2 && !done) line = cur + " X's in a row. One mark keeps it alive.";
  else if (cur >= 2) line = cur + " X's in a row. Each one harder to give up.";
  else if (!done) line = "One X today. Then don't stop.";
  else line = "Chains restart. Draw today's X.";
  return '<div class="chain">' +
    '<div class="chain__head">Don\'t break the chain.</div>' +
    '<div class="chain__scroll"><div class="chain__cols">' + cols + '</div></div>' +
    '<div class="chain__line">' + line + '</div>' +
  '</div>';
}

// Week / Month / Year breakdowns with a small scale toggle.
function renderConsistencyBreakdowns() {
  const scale = (state.ui && state.ui.consistencyScale) || 'week';
  const { counts } = consistencyStats();
  const todayNum = _dayNum(getTodayISO());
  const on = (key) => (counts[key] || 0) > 0;
  const seg = (s, label) => '<button type="button" class="cscale__btn' + (s === scale ? ' cscale__btn--on' : '') + '" data-cscale="' + s + '">' + label + '</button>';
  const control = '<div class="cscale">' + seg('week', 'Week') + seg('month', 'Month') + seg('year', 'Year') + '</div>';
  const FULLM = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  let body = '';
  if (scale === 'week') {
    const dow = new Date(getTodayISO() + 'T00:00:00Z').getUTCDay();
    const monNum = todayNum - ((dow + 6) % 7);
    const names = ['M','T','W','T','F','S','S'];
    let dots = '', active = 0;
    for (let i = 0; i < 7; i++) {
      const dn = monNum + i; const fut = dn > todayNum; const isOn = !fut && on(_keyFromDayNum(dn)); if (isOn) active++;
      dots += '<div class="cbk-dot' + (isOn ? ' cbk-dot--on' : '') + (fut ? ' cbk-dot--future' : '') + (dn === todayNum ? ' cbk-dot--today' : '') + '"><span>' + names[i] + '</span></div>';
    }
    const pct = Math.round(active / 7 * 100);
    body = '<div class="cbk"><div class="cbk__stat"><div class="cbk__num">' + active + '<span>/7</span></div><div class="cbk__label">days this week</div></div><div class="cbk__chart cbk-week">' + dots + '</div><div class="cbk__ctx">' + pct + '% of this week.</div></div>';
  } else if (scale === 'month') {
    const d = new Date(getTodayISO() + 'T00:00:00Z'); const y = d.getUTCFullYear(), m = d.getUTCMonth();
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    let cells = '', active = 0;
    for (let day = 1; day <= dim; day++) {
      const key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      const dn = _dayNum(key); const fut = dn > todayNum; const isOn = !fut && on(key); if (isOn) active++;
      cells += '<div class="cbk-cell' + (isOn ? ' cbk-cell--on' : '') + (fut ? ' cbk-cell--future' : '') + (dn === todayNum ? ' cbk-cell--today' : '') + '"></div>';
    }
    const pct = Math.round(active / dim * 100);
    body = '<div class="cbk"><div class="cbk__stat"><div class="cbk__num">' + pct + '<span>%</span></div><div class="cbk__label">of ' + FULLM[m] + ' logged</div></div><div class="cbk__chart cbk-month">' + cells + '</div><div class="cbk__ctx">' + active + ' of ' + dim + ' days.</div></div>';
  } else {
    const d = new Date(getTodayISO() + 'T00:00:00Z'); const y = d.getUTCFullYear(); const curM = d.getUTCMonth();
    const per = new Array(12).fill(0); let total = 0;
    Object.keys(counts).forEach(k => { if (k.slice(0, 4) === String(y)) { const mi = parseInt(k.slice(5, 7), 10) - 1; if (mi >= 0 && mi < 12) { per[mi]++; total++; } } });
    const max = Math.max(1, ...per);
    const MN = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    let bars = '', best = 0, bestM = 0;
    per.forEach((v, i) => { if (v > best) { best = v; bestM = i; } const h = v > 0 ? Math.max(8, Math.round(v / max * 100)) : 0; bars += '<div class="cbk-bar' + (i === curM ? ' cbk-bar--cur' : '') + '" title="' + v + ' days"><div class="cbk-bar__fill" style="height:' + h + '%"></div><span>' + MN[i] + '</span></div>'; });
    const ctx = best > 0 ? 'Strongest month: ' + FULLM[bestM] + ', ' + best + ' days.' : 'Your year fills in as you go.';
    body = '<div class="cbk"><div class="cbk__stat"><div class="cbk__num">' + total + '</div><div class="cbk__label">days in ' + y + '</div></div><div class="cbk__chart cbk-year">' + bars + '</div><div class="cbk__ctx">' + ctx + '</div></div>';
  }
  return '<div class="cbreak"><div class="cbreak__title">Breakdown</div>' + control + '<div class="cbreak__body">' + body + '</div></div>';
}

// Milestone ladder: earned nodes solid, the next one pulses, locked ones faint.
function renderMilestoneLadder() {
  const st = consistencyStats();
  const cur = st.current || 0;
  const best = Math.max((state.streak && state.streak.bestEver) || 0, st.longest || 0, cur);
  // The next target is the first milestone never earned (best below it), so a
  // user rebuilding after a break aims at new ground, not one already passed.
  const next = CONSISTENCY_MILESTONES.find(m => best < m.t);
  let head;
  if (next) {
    const gap = Math.max(1, next.t - cur);
    head = gap === 1 ? 'One day to ' + next.t + '.' : (gap <= 3 ? gap + ' days to ' + next.t + ". Don't stop now." : gap + ' days to ' + next.t + '. Almost there.');
  } else head = 'Every milestone earned. You are in rare company.';
  let nodes = '';
  CONSISTENCY_MILESTONES.forEach(m => {
    const earned = best >= m.t;
    const isNext = next && m.t === next.t;
    const inner = earned ? '<svg viewBox="0 0 24 24" class="mile__check" aria-hidden="true"><path d="M20 6 L9 17 L4 12"/></svg>' : m.t;
    nodes += '<div class="mile' + (earned ? ' mile--earned' : '') + (isNext ? ' mile--next' : '') + '" title="' + m.name + '"><div class="mile__node">' + inner + '</div><div class="mile__label">' + m.short + '</div></div>';
  });
  return '<div class="mlad"><div class="mlad__head">' + head + '</div><div class="mlad__track">' + nodes + '</div></div>';
}

// Surfaces one older reflection so past entries come back into view instead of
// being buried. Priority: "this time last year" if an entry sits within +/- 3
// weeks of 365 days ago. Otherwise it rotates DAILY through the older entries
// (anything but the two most recent, and at least a few days old), picking a
// different one each day via the day-of-epoch, so the memory changes day to day
// rather than always showing the same oldest note. Read-only; returns '' if
// there is nothing old enough yet (invisible until earned).
function renderReflectionResurface() {
  try {
    const entries = (state.reflection && Array.isArray(state.reflection.entries)) ? state.reflection.entries : [];
    if (entries.length < 2) return '';
    const todayNum = _dayNum(getTodayISO());
    const withNum = entries
      .map(e => ({ e, n: _dayNum(_isoDayKey(e.iso || e.date) || getTodayISO()) }))
      .filter(x => !isNaN(x.n));
    if (!withNum.length) return '';
    let pick = null;
    const yearAgo = withNum
      .filter(x => Math.abs((todayNum - x.n) - 365) <= 21)
      .sort((a, b) => Math.abs((todayNum - a.n) - 365) - Math.abs((todayNum - b.n) - 365))[0];
    if (yearAgo) { pick = { x: yearAgo, label: 'This time last year' }; }
    else {
      // Pool of entries old enough to feel like a memory: at least 3 days back,
      // and never the two newest (those are already visible in the list).
      const newest = withNum.slice().sort((a, b) => b.n - a.n).slice(0, 2).map(x => x.e);
      const pool = withNum
        .filter(x => (todayNum - x.n) >= 3 && newest.indexOf(x.e) === -1)
        .sort((a, b) => a.n - b.n);
      if (pool.length) {
        // Deterministic per-day rotation: same entry all of today, a different
        // one tomorrow. No state writes, so it stays stable across re-renders.
        const chosen = pool[((todayNum % pool.length) + pool.length) % pool.length];
        const ago = todayNum - chosen.n;
        const label = ago >= 60 ? `${Math.round(ago / 30)} months ago`
          : (ago >= 14 ? `${Math.round(ago / 7)} weeks ago`
            : `${ago} days ago`);
        pick = { x: chosen, label };
      }
    }
    if (!pick) return '';
    const e = pick.x.e;
    const text = String(e.text || '');
    const clipped = text.length > 240 ? text.slice(0, 240) + '...' : text;
    return `<div class="reflect-resurface"><div class="reflect-resurface__label">${pick.label}</div><div class="reflect-resurface__date">${esc(e.date)}</div><div class="reflect-resurface__text">${esc(clipped)}</div></div>`;
  } catch (e) { return ''; }
}

/* ============================================
   FLIP ANIMATION FOR DRAG REORDER
   ============================================ */
function reorderWithFLIP() {
  const grid = document.getElementById('widgetGrid');
  const widgets = [...grid.querySelectorAll('.widget')];
  const firstRects = {};
  widgets.forEach(w => { firstRects[w.dataset.widget] = w.getBoundingClientRect(); });
  state.widgetOrder.forEach(({ key, size }) => {
    const el = grid.querySelector(`[data-widget="${key}"]`);
    if (el) {
      grid.appendChild(el);
      el.classList.toggle('widget--full', size === 'full');
      el.classList.toggle('widget--half', size !== 'full');
    }
  });
  // Keep the v23 More row pinned to the end of the grid after a reorder.
  try { const more = grid.querySelector('#dashMore'); if (more) grid.appendChild(more); } catch (e) {}
  // Mobile bento positions tiles by fixed slot (inline grid styles), not DOM
  // order, so reassign slots from the new widgetOrder BEFORE measuring the FLIP
  // end positions. No-op on desktop/tablet/custom layouts.
  try { if (typeof applyBentoMobileOrder === 'function') applyBentoMobileOrder(); } catch (e) {}
  widgets.forEach(w => {
    const key = w.dataset.widget;
    const first = firstRects[key];
    const last = w.getBoundingClientRect();
    if (!first) return;
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (dx === 0 && dy === 0) return;
    w.style.transform = `translate(${dx}px, ${dy}px)`;
    w.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        w.style.transition = 'transform 0.35s var(--spring)';
        w.style.transform = '';
        w.addEventListener('transitionend', () => { w.style.transition = ''; }, { once: true });
      });
    });
  });
}

/* ============================================
   FLIP ANIMATION FOR RESIZE
   ============================================ */
function resizeWithFLIP(targetKey) {
  const grid = document.getElementById('widgetGrid');
  const widgets = [...grid.querySelectorAll('.widget')];

  // First: capture current positions
  const firstRects = {};
  widgets.forEach(w => { firstRects[w.dataset.widget] = w.getBoundingClientRect(); });

  // Apply size change to target widget only (no DOM rebuild)
  const targetEl = grid.querySelector(`[data-widget="${targetKey}"]`);
  const entry = state.widgetOrder.find(w => w.key === targetKey);
  if (targetEl && entry) {
    targetEl.classList.toggle('widget--full', entry.size === 'full');
    targetEl.classList.toggle('widget--half', entry.size !== 'full');
    // Re-render widget content so it adapts to new size
    if (RENDERERS[targetKey]) RENDERERS[targetKey](targetEl);
  }

  // Last: get new positions, animate all widgets with FLIP
  widgets.forEach(w => {
    const key = w.dataset.widget;
    const first = firstRects[key];
    const last = w.getBoundingClientRect();
    if (!first) return;
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (dx === 0 && dy === 0) return;

    w.style.transform = `translate(${dx}px, ${dy}px)`;
    w.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        w.style.transition = 'transform 0.35s var(--spring)';
        w.style.transform = '';
        w.addEventListener('transitionend', () => { w.style.transition = ''; }, { once: true });
      });
    });
  });
}

/* ============================================
   MEMENTO MORI - shared life math
   One source of truth so the dashboard widget and the detail sheet
   never disagree. We only know the user's birth YEAR, so we treat
   birth as the start of that year and measure elapsed time from there.
   ============================================ */
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
// Fractional age in years from birth year (Jan 1 of that year).
function moriAgeYears(birthYear) {
  if (!birthYear) return null;
  return (new Date() - new Date(birthYear, 0, 1)) / MS_PER_YEAR;
}
// Years of life remaining (never below 0), using the same age model.
function moriYearsRemaining(birthYear, lifeExpectancy) {
  const age = moriAgeYears(birthYear);
  if (age === null) return null;
  return Math.max(0, lifeExpectancy - age);
}
// Week-of-life counters, shared by the sheet's hero grid caption and the
// dashboard widget so the "Week N of T" framing never disagrees between them.
function moriWeeksLived(birthYear) {
  if (!birthYear) return null;
  return Math.floor((Date.now() - new Date(birthYear, 0, 1).getTime()) / 604800000);
}
function moriTotalWeeks(lifeExpectancy) {
  return Math.round((lifeExpectancy || 80) * 52.18);
}
// Memento Mori color map for the life-spend grid (doomscroll dropped). Free time
// is gold, the precious part. Lived time is faint, future-unallocated is ghosted.
const MORI_COLORS = { gone: 'rgba(var(--ink),0.16)', sleep: '#3b4a63', work: '#2f6fb0', human: '#2f8f37', screen: '#54b7c9', free: '#c9a24b', ghost: 'rgba(var(--ink),0.05)' };
const MORI_LEGEND = [ ['gone', 'Lived'], ['sleep', 'Sleep'], ['work', 'Work'], ['human', 'Upkeep'], ['screen', 'Screens'], ['free', 'Free'] ];
// Build the life-spend units: lived years first, then the REMAINING years grouped
// by how they will be spent (sleep, work, upkeep, screens), then free time, then
// ghosted future beyond the expectancy. mult = 1 (years), 12 (months), 52 (weeks).
function moriBuildUnits(mult) {
  const by = state.mori.birthYear, le = state.mori.lifeExpectancy || 80;
  const age = moriAgeYears(by) || 0;
  const ls = state.mori.lifestyle || { sleepHrs: 8, workHrs: 8, humanHrs: 2.5, screenHrs: 4 };
  const rS = (ls.sleepHrs || 0) / 24, rW = ((ls.workHrs || 0) * 5 / 7) / 24, rH = (ls.humanHrs || 0) / 24, rSc = (ls.screenHrs || 0) / 24;
  const ageU = Math.floor(age * mult);
  const total = Math.round(le * mult);
  const remU = Math.max(0, total - ageU);
  let nS = Math.round(remU * rS), nW = Math.round(remU * rW), nH = Math.round(remU * rH), nSc = Math.round(remU * rSc);
  let used = nS + nW + nH + nSc;
  if (used > remU) { nSc = Math.max(0, nSc - (used - remU)); used = nS + nW + nH + nSc; }
  const nF = Math.max(0, remU - used);
  const u = [];
  for (let i = 0; i < ageU; i++) u.push('gone');
  for (let i = 0; i < nS; i++) u.push('sleep');
  for (let i = 0; i < nW; i++) u.push('work');
  for (let i = 0; i < nH; i++) u.push('human');
  for (let i = 0; i < nSc; i++) u.push('screen');
  for (let i = 0; i < nF; i++) u.push('free');
  while (u.length < total) u.push('ghost');
  return { units: u, ageU: ageU, total: total, freeUnits: nF, remU: remU };
}
// At a given screen-time-per-day, how many of the remaining years are
// spent looking at a screen. Returns clock-time years (literal, defensible)
// and waking-time years (more visceral, assumes ~16 waking hours/day).
function moriScreenYears(yearsLeft, hoursPerDay) {
  if (yearsLeft == null || !hoursPerDay || hoursPerDay <= 0) return null;
  return {
    clock: yearsLeft * (hoursPerDay / 24),
    waking: yearsLeft * (hoursPerDay / 16),
  };
}

