/* ============================================================================
   32-consistency-page.js — CONSISTENCY, the full page (v1273).
   Ported from mockups/consistency/one.html + one.js (the design source of
   truth). THE MODEL (Malik, 2026-08-22): consistency is a FILL RATE measured
   against a personal target, not a streak. kept = 1.0, something smaller =
   0.5, an empty day is REST (in the denominator, never a "miss"). The score
   is fill / target x 100: at your own bar you read 100; above it, 100+.
   No shame anywhere. The count never shrinks within a goal; a new goal
   starts a new count (a graduation), while the calendar keeps the full
   lifetime with past-goal days as ghosts.
   Data comes from the real stores via js/06's buildConsistencyModel union.
   ========================================================================== */
(function () {
  'use strict';

  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var WDM = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var REVEAL_SUPPORT = 7;

  /* ---------------- small date helpers (local, getTodayISO-keyed) -------- */
  function dkey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function isoOf(d) {
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }
  function dateOfIso(iso) {
    var p = String(iso || '').split('-');
    return new Date(+p[0], +p[1] - 1, +p[2] || 1);
  }
  function sameDay(a, b) { return dkey(a) === dkey(b); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) { return addDays(d, -d.getDay()); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function todayDate() {
    try { return dateOfIso(getTodayISO()); } catch (e) { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  }

  /* ---------------- the target ------------------------------------------- */
  function curTarget() {
    try {
      var t = state.consistency && state.consistency.target;
      if (typeof t === 'number' && t > 0 && t <= 1) return t;
    } catch (e) {}
    return 0.6;
  }
  function targetSet() {
    try { return !!(state.consistency && state.consistency.setAt); } catch (e) { return false; }
  }
  function saveTarget(target, selfReported) {
    try {
      if (!state.consistency) state.consistency = {};
      state.consistency.target = Math.max(0.05, Math.min(1, target));
      if (selfReported != null) state.consistency.selfReported = Math.max(0, Math.min(1, selfReported));
      state.consistency.setAt = Date.now();
      persistNow();
    } catch (e) {}
  }

  /* ---------------- the goal's shape -> the hero wording ------------------ */
  function shapeInfo() {
    var type = '';
    try { type = (typeof ccGoalShape === 'function' && (ccGoalShape() || {}).type) || ''; } catch (e) {}
    var T = {
      frequency: { sub: 'sessions toward the rate you keep' },
      maintenance: { sub: 'days the line has held' },
      quantity_down: { sub: 'days you moved the number' },
      quantity_up: { sub: 'actions completed toward your goal' },
      milestone: { sub: 'actions completed toward your goal' },
      binary: { sub: 'actions completed toward your goal' }
    };
    return { type: type || 'quantity_up', sub: (T[type] || T.quantity_up).sub };
  }

  /* ---------------- the real day log ------------------------------------- */
  // Full lifetime log; days before the CURRENT goal carry past:true (ghosts:
  // calendar only, never counted). Reading dayRecords alone would blank out
  // existing users; the union in js/06 is the history source (the port doc).
  function goalStartIso(model) {
    try {
      var c = state.actionPlan && state.actionPlan.createdAt;
      if (c && /^\d{4}-\d{2}-\d{2}/.test(String(c))) return String(c).slice(0, 10);
    } catch (e) {}
    var keys = Object.keys(model.mainDays).sort();
    if (keys.length) return keys[0];
    try { return getTodayISO(); } catch (e) { return isoOf(todayDate()); }
  }
  function buildLog() {
    var model = (typeof buildConsistencyModel === 'function') ? buildConsistencyModel() : { mainDays: {}, supportByDay: {} };
    var minutesByDay = {};
    try {
      (state.deepwork && Array.isArray(state.deepwork.sessions) ? state.deepwork.sessions : []).forEach(function (x) {
        if (!x) return;
        var k = String(x.iso || x.dateISO || x.date || '').slice(0, 10);
        if (!k) return;
        minutesByDay[k] = (minutesByDay[k] || 0) + (Number(x.minutes || x.min || 0) || 0);
      });
    } catch (e) {}
    var start = goalStartIso(model);
    var allKeys = Object.keys(model.mainDays).concat(Object.keys(model.supportByDay)).sort();
    var earliest = allKeys.length ? (allKeys[0] < start ? allKeys[0] : start) : start;
    var today = todayDate();
    var log = [];
    var cursor = dateOfIso(earliest);
    var startDate = dateOfIso(start);
    while (cursor <= today) {
      var iso = isoOf(cursor);
      var on = !!model.mainDays[iso];
      var sup = {};
      var sb = model.supportByDay[iso];
      if (sb) Object.keys(sb).forEach(function (k) { sup[k] = 1; });
      log.push({
        date: cursor, iso: iso, on: on, sup: sup,
        minutes: on ? (minutesByDay[iso] || 0) : 0,
        past: cursor < startDate
      });
      cursor = addDays(cursor, 1);
    }
    if (!log.length) log.push({ date: today, iso: isoOf(today), on: false, sup: {}, minutes: 0, past: false });
    return log;
  }
  function currentLog(log) { return log.filter(function (d) { return !d.past; }); }

  /* ---------------- the statistics engine (ported from _kit.stats) ------- */
  function stats(log) {
    var N = log.length, total = 0, cur = 0, best = 0, run = 0, comebacks = 0, prevOn = true,
        minutes = 0, supTot = { deepwork: 0, reflection: 0, checkin: 0, vivere: 0 };
    var supMinutes = 0;
    try {
      (state.deepwork && Array.isArray(state.deepwork.sessions) ? state.deepwork.sessions : []).forEach(function (x) {
        supMinutes += (Number(x && (x.minutes || x.min) || 0) || 0);
      });
    } catch (e) {}
    log.forEach(function (d, i) {
      Object.keys(d.sup).forEach(function (k) { if (supTot[k] != null) supTot[k] += 1; });
      if (d.on) {
        total++; run++; if (run > best) best = run;
        minutes += d.minutes;
        if (!prevOn && i > 0) comebacks++;
      } else { run = 0; }
      prevOn = d.on;
    });
    for (var i = N - 1; i >= 0 && log[i].on; i--) cur++;
    // deep-work hours are MEASURED time across all sessions (the port doc)
    var hours = Math.round(supMinutes / 60);
    return { N: N, total: total, current: cur, best: best, comebacks: comebacks, hours: hours, sup: supTot };
  }

  /* ---------------- the model: label every day --------------------------- */
  function annotate(log) {
    var map = {};
    log.forEach(function (d) {
      var st = d.on ? 'kept' : (Object.keys(d.sup).length ? 'sup' : 'rest');
      map[dkey(d.date)] = { d: d, st: st };
    });
    return { map: map };
  }
  function stateOf(A, date) { var e = A.map[dkey(date)]; return e ? e.st : null; }
  function entryOf(A, date) { return A.map[dkey(date)] || null; }

  /* ---------------- the score ------------------------------------------- */
  function fillOf(A, days) {
    var shown = 0, total = 0;
    days.forEach(function (x) {
      var st = stateOf(A, x.date);
      if (st === 'kept') shown += 1;
      else if (st === 'sup') shown += 0.5;
      total++;
    });
    return total ? shown / total : 0;
  }
  function targetScore(A, days, tgt) { return Math.round((fillOf(A, days) / Math.max(0.05, tgt)) * 100); }
  function gradedDays(log, A) {
    var slice = log.slice(-Math.min(90, log.length));
    var last = slice[slice.length - 1];
    if (last) {
      var st = stateOf(A, last.date);
      if (st !== 'kept' && st !== 'sup') slice = slice.slice(0, -1);
    }
    return slice;
  }

  /* ---------------- shared bits ------------------------------------------ */
  function mMark(cls, size) {
    return '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="140 136 232 240" fill="currentColor" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>';
  }
  function arrows(id, canBack, canFwd, offToday) {
    return (offToday ? '<button type="button" class="nav__today" data-today>Today</button>' : '') +
      '<span class="nav" id="' + id + '">' +
      '<button type="button" data-step="-1"' + (canBack ? '' : ' disabled') + ' aria-label="Back">' +
      '<svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 1L1.5 5.5 6 10"/></svg></button>' +
      '<button type="button" data-step="1"' + (canFwd ? '' : ' disabled') + ' aria-label="Forward">' +
      '<svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 1l4.5 4.5L1 10"/></svg></button></span>';
  }
  function legend(A, log, hasPast) {
    var seen = {};
    log.forEach(function (d) { var s = stateOf(A, d.date); if (s) seen[s] = 1; });
    var chips = [];
    if (seen.kept) chips.push('<span><u class="a"></u>Shown up</span>');
    if (seen.sup) chips.push('<span><u class="b"></u>Something smaller</span>');
    if (hasPast) chips.push('<span><u class="p"></u>A past goal</span>');
    return chips.length >= 2 ? '<div class="key">' + chips.join('') + '</div>' : '';
  }

  /* ---------------- page one --------------------------------------------- */
  function pageOne(s, log) {
    var n = s.total;
    var size = n < 100 ? 132 : n < 1000 ? 112 : 92;
    var word = shapeInfo().sub;
    if (n === 1) word = word.replace(/^actions\b/, 'action').replace(/^sessions\b/, 'session').replace(/^days\b/, 'day');
    var counted = log.length && log[log.length - 1].on;
    var begin = s.N === 1 ? '<div class="one__begin">Day one. This is where the count starts.</div>' : '';
    return '<div><div class="one__crown' + (counted ? ' lit' : '') + '">' + mMark('', 22) + '</div>' +
      '<div class="one__num" style="font-size:' + size + 'px">' + n.toLocaleString() + '</div>' +
      '<div class="one__sub">' + word + '.</div>' +
      '<div class="one__today' + (counted ? '' : ' off') + '"><u></u>' +
      (counted ? 'Today is counted.' : 'Today is not counted yet.') + '</div>' +
      begin + '</div>' +
      '<div class="one__hint"><svg width="16" height="9" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 1l6 6 6-6"/></svg></div>';
  }

  /* ---------------- the score card --------------------------------------- */
  function scoreViz(A, log) {
    var slice = gradedDays(log, A);
    var rate = fillOf(A, slice), tgt = curTarget();
    var pct = Math.round(rate * 100), tpct = Math.round(tgt * 100), over = rate >= tgt;
    return '<div class="score__viz viz-fill">' +
      '<div class="fillbar' + (over ? ' over' : '') + '">' +
        '<span class="fillbar__fill" style="width:' + Math.min(100, pct) + '%"></span>' +
        '<i class="fillbar__tgt" style="left:' + Math.min(100, tpct) + '%"></i>' +
      '</div>' +
      '<div class="fillbar__key"><span><b>' + pct + '%</b> of days shown up</span>' +
        '<span class="fillbar__t">goal ' + tpct + '%</span></div>' +
      '</div>';
  }
  function scoreBlock(s, log, A) {
    var slice = gradedDays(log, A), win = Math.min(90, log.length), tgt = curTarget();
    var score = targetScore(A, slice, tgt);
    var delta = null;
    if (log.length >= win + 7) delta = score - targetScore(A, log.slice(-(win + 7), -7), tgt);
    var deltaHTML = '';
    if (delta) {
      var up = delta > 0;
      deltaHTML = '<sup class="score__delta ' + (up ? 'up' : 'down') + '">' +
        (up ? '<svg viewBox="0 0 10 10"><path d="M5 1 L9 8 L1 8 Z"/></svg>'
            : '<svg viewBox="0 0 10 10"><path d="M5 9 L1 2 L9 2 Z"/></svg>') +
        Math.abs(delta) + '</sup>';
    }
    return '<div class="sec sec--score">' +
      '<div class="glance glance--score">' +
      '<div class="score__head"><div class="score__lbl">Score</div>' +
      '<div class="score__n">' + score + deltaHTML + '</div></div>' +
      '<div class="score__basis">based on your ' + Math.round(tgt * 100) + '% goal</div>' +
      scoreViz(A, log) +
      '<div class="score__note">Remember: the goal is to be better, not perfect.</div>' +
      '</div></div>';
  }

  /* ---------------- the calendar ----------------------------------------- */
  var SCALE = 'month', MOFF = 0, WOFF = 0, YOFF = 0, YRMODE = 'cal';

  function weekView(fullLog, s, A) {
    var log = fullLog;
    var today = log[log.length - 1].date, start0 = log[0].date;
    var ws = addDays(startOfWeek(today), WOFF * 7);
    var canBack = ws > startOfWeek(start0), canFwd = WOFF < 0;
    var days = [], kept = 0, deep = 0, notes = 0, checks = 0;
    for (var i = 0; i < 7; i++) {
      var d = addDays(ws, i), e = entryOf(A, d);
      var st = e ? e.st : (d > today ? 'ahead' : 'out');
      if (e) {
        if (e.st === 'kept') kept++;
        if (e.d.sup.deepwork) deep++;
        if (e.d.sup.reflection) notes++;
        if (e.d.sup.checkin) checks++;
      }
      days.push({ d: d, st: st });
    }
    var strip = days.map(function (x) {
      var isToday = sameDay(x.d, today);
      var cls = (x.st === 'ahead' || x.st === 'out') ? 'out' : x.st;
      if (isToday && cls !== 'kept' && cls !== 'sup') cls = 'pending';
      return '<div class="wk7c ' + cls + (isToday ? ' today' : '') + '">' +
        '<span>' + WDM[(x.d.getDay() + 6) % 7] + '</span><b>' + x.d.getDate() + '</b></div>';
    }).join('');
    var extra = [];
    if (deep) extra.push(plural(deep, 'deep work session'));
    if (notes) extra.push(plural(notes, 'reflection'));
    if (checks) extra.push(plural(checks, 'check-in'));
    var foot = extra.length ? '<div class="wkfoot">' + extra.join('. ') + '.</div>' : '';
    var label = MON[ws.getMonth()] + ' ' + ws.getDate();
    return '<div class="mh"><b style="font-size:20px">Week of ' + label + '</b>' + arrows('cspNavWeek', canBack, canFwd, WOFF !== 0) + '</div>' +
      '<div class="wk7">' + strip + '</div>' +
      '<div class="wkhero"><b>' + kept + ' of 7</b><span>days kept this week</span></div>' +
      legend(A, log, false) + foot;
  }

  function monthGridBig(A, y, m, today, startDate) {
    var last = new Date(y, m + 1, 0), cursor = startOfWeek(new Date(y, m, 1));
    var rows = '', monthKept = 0, monthDays = 0;
    while (cursor <= last) {
      var wk = '', weekKept = 0, anyIn = false;
      for (var i = 0; i < 7; i++) {
        var d = addDays(cursor, i), e = A.map[dkey(d)];
        var isPast = e && e.d.past;
        if (e && e.st === 'kept' && !isPast) weekKept++;
        var inMonth = d.getMonth() === m && d.getFullYear() === y;
        if (!inMonth) { wk += '<div class="d pad"></div>'; continue; }
        anyIn = true;
        if (e && !isPast) { monthDays++; if (e.st === 'kept') monthKept++; }
        var st = e ? (isPast ? (e.st === 'kept' ? 'past' : 'rest') : e.st) : 'ahead';
        var isToday = e && sameDay(d, today);
        wk += '<div class="d ' + st + (isToday ? ' today ' + (st === 'kept' ? 'done' : 'pending') : '') + '"' +
          (e ? ' data-k="' + dkey(d) + '"' : '') + '>' + d.getDate() + '</div>';
      }
      var wc = !anyIn ? '' : String(weekKept);
      rows += wk + '<div class="wc">' + wc + '</div>';
      cursor = addDays(cursor, 7);
    }
    return { rows: rows, kept: monthKept, days: monthDays };
  }

  function monthView(fullLog, s, A, startDate, hasPast) {
    var log = fullLog;
    var today = log[log.length - 1].date, start0 = log[0].date;
    var base = new Date(today.getFullYear(), today.getMonth() + MOFF, 1);
    var canBack = base > new Date(start0.getFullYear(), start0.getMonth(), 1), canFwd = MOFF < 0;
    var g = monthGridBig(A, base.getFullYear(), base.getMonth(), today, startDate);
    var head = WD.map(function (w) { return '<div class="wd">' + w + '</div>'; }).join('') +
      '<div class="wd g">days</div>';
    var run = '<div class="runline">Your current run is <b>' + plural(s.current, 'day') + '</b>' +
      (s.best > s.current ? '. Your longest is <b>' + plural(s.best, 'day') + '</b>.' : (s.total > 1 ? ', the longest you have had.' : '.')) + '</div>';
    return '<div class="mh"><b>' + MONF[base.getMonth()] + '</b>' +
      '<span style="display:flex;align-items:center;gap:12px"><i><em>' + g.kept + '</em> of ' + plural(g.days, 'day') + '</i>' +
      arrows('cspNavMonth', canBack, canFwd, MOFF !== 0) + '</span></div>' +
      '<div class="cal">' + head + g.rows + '</div>' + legend(A, log, hasPast) + run;
  }

  function miniGrid(A, y, m, today) {
    var first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate(), sd = first.getDay();
    var cells = '', monthKept = 0, monthDays = 0;
    for (var i = 0; i < sd; i++) cells += '<b class="pad"></b>';
    for (var dd = 1; dd <= dim; dd++) {
      var date = new Date(y, m, dd), e = entryOf(A, date);
      var isPast = e && e.d.past;
      if (e && !isPast) { monthDays++; if (e.st === 'kept') monthKept++; }
      var st = e ? (isPast ? (e.st === 'kept' ? 'past' : 'rest') : e.st) : 'ahead';
      cells += '<b class="' + st + (sameDay(date, today) ? ' today' : '') + '"></b>';
    }
    return { html: cells, kept: monthKept, days: monthDays };
  }

  function yearView(fullLog, A, hasPast) {
    var log = fullLog;
    var today = log[log.length - 1].date, start0 = log[0].date;
    var months = [], titleTxt, canBack, canFwd;
    var spansYear = (today - start0) > 360 * 86400000;
    if (YRMODE === 'cal') {
      var y = today.getFullYear() + YOFF;
      for (var m = 0; m < 12; m++) months.push({ y: y, m: m });
      titleTxt = String(y);
      canBack = new Date(y, 0, 1) > new Date(start0.getFullYear(), 0, 1);
      canFwd = YOFF < 0;
    } else {
      var end = new Date(today.getFullYear(), today.getMonth() + YOFF * 12, 1);
      var sm = new Date(start0.getFullYear(), start0.getMonth(), 1);
      var sinceStart = (end.getFullYear() - sm.getFullYear()) * 12 + (end.getMonth() - sm.getMonth());
      var span = Math.min(11, Math.max(0, sinceStart));
      for (var i = span; i >= 0; i--) { var dd = new Date(end.getFullYear(), end.getMonth() - i, 1); months.push({ y: dd.getFullYear(), m: dd.getMonth() }); }
      titleTxt = MON[months[0].m] + ' ' + String(months[0].y).slice(2) + ' to ' + MON[end.getMonth()] + ' ' + String(end.getFullYear()).slice(2);
      canBack = new Date(months[0].y, months[0].m, 1) > sm;
      canFwd = YOFF < 0;
    }
    var cells = months.map(function (M) {
      var g = miniGrid(A, M.y, M.m, today);
      return '<div class="mlog__m"><span>' + MON[M.m] + '<b>' + (g.days ? g.kept : '') + '</b></span>' +
        '<div class="mlog__g">' + g.html + '</div></div>';
    }).join('');
    return '<div class="mh mh--year"><b class="yrtitle">' + titleTxt + '</b>' +
      '<span class="yrctrl">' +
      '<span class="yrsw" id="cspYrsw"><button type="button" data-y="cal"' + (YRMODE === 'cal' ? ' class="on"' : '') + '>Year</button>' +
      '<button type="button" data-y="roll"' + (YRMODE === 'roll' ? ' class="on"' : '') + '>Rolling</button></span>' +
      ((spansYear && (canBack || canFwd)) ? arrows('cspNavYear', canBack, canFwd, YOFF !== 0) : '') + '</span></div>' +
      '<div class="yrgrid">' + cells + '</div>' + legend(A, log, hasPast);
  }

  /* ---------------- the record talking back ------------------------------ */
  function support(s) {
    var rows = [], dw = s.sup.deepwork || 0, rf = s.sup.reflection || 0, ci = s.sup.checkin || 0;
    if (dw > 0) rows.push(['Deep work', plural(dw, 'session') + (s.hours > 0 ? ' · ' + s.hours + 'h' : '')]);
    if (rf > 0) rows.push(['Reflections', plural(rf, 'entry').replace('entrys', 'entries')]);
    if (ci > 0) rows.push(['Check-ins', plural(ci, 'morning')]);
    if (!rows.length) return '';
    return '<div class="sec"><div class="sec__h"><b>Also showing up</b></div><div class="led">' +
      rows.map(function (r) { return '<div class="led__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div></div>';
  }
  function hardDays(s) {
    var lines = [];
    if (s.N >= 14) {
      if (s.comebacks > 0) lines.push('You have come back <b>' + plural(s.comebacks, 'time') +
        '</b>. Every gap in this record ended the same way: you returned.');
      if (s.best >= 3) lines.push('Your longest run is <b>' + plural(s.best, 'day') +
        '</b>. Nobody did that for you. That capacity does not expire.');
      if (s.hours > 0) lines.push('<b>' + plural(s.hours, 'hour') + '</b> of your life are already inside this goal. ' +
        'Every day you show up, that number grows. It never shrinks.');
    }
    if (!lines.length) lines.push('The record is young. Everything you add now is the ' +
      'foundation you will stand on during a harder week.');
    return '<div class="sec"><div class="sec__h"><b>For the hard days</b></div>' +
      '<div class="hard">' + lines.map(function (t) { return '<p>' + t + '</p>'; }).join('') +
      '<p class="hard__end">Keep going until you remember why you started.</p></div></div>';
  }

  /* ---------------- page two --------------------------------------------- */
  function pageTwo(s, fullLog, curLog, A, hasPast) {
    var first = curLog[0];
    var pill = '<div class="sec sec--pill"><div class="heropill">You’ve shown up <b>' +
      s.total.toLocaleString() + '</b> ' + (s.total === 1 ? 'day' : 'days') + ' since ' +
      MON[first.date.getMonth()] + '&nbsp;' + first.date.getDate() + '</div></div>';
    var startDate = first.date;
    var body = SCALE === 'week' ? weekView(fullLog, s, A)
      : SCALE === 'year' ? yearView(fullLog, A, hasPast)
      : monthView(fullLog, s, A, startDate, hasPast);
    var cal = '<div class="sec"><div class="sec__h"><b>History</b><span class="scale" id="cspScale">' +
      ['week', 'month', 'year'].map(function (sc) {
        return '<button type="button" data-sc="' + sc + '"' + (sc === SCALE ? ' class="on"' : '') + '>' + sc.charAt(0).toUpperCase() + sc.slice(1) + '</button>';
      }).join('') + '</span></div>' + body + '</div>';
    var scorePart = (s.total >= 1) ? scoreBlock(s, curLog, A) : '';
    var side = pill + ((s.N >= REVEAL_SUPPORT) ? support(s) : '') + hardDays(s);
    return scorePart +
      '<div class="evwrap">' +
        '<div class="evcol evcol--main">' + cal + '</div>' +
        '<div class="evcol evcol--side">' + side + '</div>' +
      '</div>';
  }

  /* ---------------- the completion moment -------------------------------- */
  function countUp(node, from, to, ms) {
    if (!node || from >= to) { if (node) node.textContent = to.toLocaleString(); return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / ms);
      var v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      node.textContent = v.toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function playCompletion() {
    var root = document.getElementById('consistencyPage');
    if (!root) return;
    var node = root.querySelector('.one__num');
    if (node) { var to = +String(node.textContent).replace(/[^0-9]/g, ''); countUp(node, Math.max(0, to - 1), to, 550); }
    var m = root.querySelector('.one__crown');
    if (m) { m.classList.add('lit'); m.classList.remove('litpop'); void m.offsetWidth; m.classList.add('litpop'); }
    var ring = root.querySelector('.cal .d.today');
    if (ring) { ring.classList.remove('justfilled'); void ring.offsetWidth; ring.classList.add('justfilled'); }
  }

  /* ---------------- tap a day: the receipt ------------------------------- */
  var LASTA = null;
  function closeDaypop() { var p = document.querySelector('#consistencyPage .daypop'); if (p) p.remove(); }
  function openDaypop(cell) {
    closeDaypop();
    if (!LASTA) return;
    var e = LASTA.map[cell.getAttribute('data-k')];
    if (!e) return;
    var d = e.d.date;
    var word = e.d.past ? 'A past goal. Still yours.'
      : e.st === 'kept' ? 'Action completed'
      : e.st === 'sup' ? 'Something smaller'
      : 'A rest day';
    var items = [];
    if (e.st === 'kept' && e.d.minutes) items.push(Math.round(e.d.minutes) + 'm of deep work');
    if (e.d.sup.deepwork && !(e.st === 'kept' && e.d.minutes)) items.push('Deep work');
    if (e.d.sup.reflection) items.push('Reflection');
    if (e.d.sup.checkin) items.push('Check-in');
    if (e.d.sup.vivere) items.push('Vivere');
    var pop = document.createElement('div');
    pop.className = 'daypop';
    pop.innerHTML = '<div class="daypop__d">' + MONF[d.getMonth()] + ' ' + d.getDate() + '</div>' +
      '<div class="daypop__s ' + (e.d.past ? 'past' : e.st) + '">' + word + '</div>' +
      (items.length ? '<ul>' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : '');
    document.getElementById('consistencyPage').appendChild(pop);
    var r = cell.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    var left = Math.max(10, Math.min(window.innerWidth - pr.width - 10, r.left + r.width / 2 - pr.width / 2));
    var top = r.top - pr.height - 10;
    if (top < 60) top = r.bottom + 10;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }

  /* ---------------- the onboarding (first open sets the target) ---------- */
  var ONBT = 0.6, HONEST = 0.4, ONB_PG = 0, ONB_MAX = 3;
  function shuffle(seed) {
    var a = []; for (var i = 0; i < 91; i++) a.push(i);
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (var j = a.length - 1; j > 0; j--) { var jx = Math.floor(rnd() * (j + 1)); var t = a[j]; a[j] = a[jx]; a[jx] = t; }
    return a;
  }
  var ONB_ORDER = shuffle(1734021), HON_ORDER = shuffle(90210);
  function onbWarn(t) {
    if (t <= 0.05) return 'At 0 to 5%, you will never reach your goal. This is the same as never starting.';
    if (t >= 0.95) return '95% and up is a fantasy unless you are a Navy SEAL. Real life has sick days, travel, and chaos. Pick a bar you can actually hold.';
    return '';
  }
  function fillHeat(heat, order, frac) {
    if (!heat) return;
    if (heat.children.length !== 91) { var s = ''; for (var i = 0; i < 91; i++) s += '<b></b>'; heat.innerHTML = s; }
    var n = Math.round(frac * 91), onSet = {}; for (var k = 0; k < n; k++) onSet[order[k]] = 1;
    [].forEach.call(heat.children, function (b, i) { b.classList.toggle('on', !!onSet[i]); });
  }
  function onbHtml() {
    return '<div class="onb" id="cspOnb">' +
      '<div class="onb__stage"><div class="onb__track" id="cspOnbTrack">' +
        '<div class="onb__page"><div class="onb__m">' + mMark('', 28) + '</div>' +
          '<h1 class="onb__h">The Consistency Law</h1>' +
          '<p class="onb__p">To achieve anything useful in this life takes consistency. You can mess up almost every other step, but stay consistent and you still have a very good chance of making it.</p>' +
          '<p class="onb__p onb__p--lead">Consistency does not guarantee you make it. But being inconsistent guarantees you will not.</p></div>' +
        '<div class="onb__page"><h1 class="onb__h">You do not need to be perfect</h1>' +
          '<p class="onb__p">Perfection is a fantasy, and chasing it is how people quit. The goal is to show up more often than not, over a long stretch. Set a bar you can hold, then beat it.</p></div>' +
        '<div class="onb__page onb__page--heat"><h1 class="onb__h">Be honest</h1>' +
          '<p class="onb__p">How consistent have you actually been so far? No judgment, this is just your starting point.</p>' +
          '<div class="onb__heat" id="cspHonHeat"></div>' +
          '<div class="onb__read"><b id="cspHonPct">40</b><span>% of days</span></div>' +
          '<p class="onb__hint">Drag to set where you are.</p></div>' +
        '<div class="onb__page onb__page--heat"><h1 class="onb__h">Now set your bar</h1>' +
          '<p class="onb__p">Pick the level you are aiming for. Ambitious, but real.</p>' +
          '<div class="onb__heat" id="cspOnbHeat"></div>' +
          '<div class="onb__read"><b id="cspOnbPct">60</b><span>% of days</span></div>' +
          '<p class="onb__warn" id="cspOnbWarn"></p>' +
          '<p class="onb__hint">Drag to set your goal.</p></div>' +
      '</div></div>' +
      '<div class="onb__foot"><div class="onb__dots" id="cspOnbDots"></div>' +
      '<button class="onb__go" id="cspOnbGo" type="button">Continue</button></div></div>';
  }
  function renderOnb() {
    var el = function (id) { return document.getElementById(id); };
    fillHeat(el('cspHonHeat'), HON_ORDER, HONEST);
    fillHeat(el('cspOnbHeat'), ONB_ORDER, ONBT);
    if (el('cspHonPct')) el('cspHonPct').textContent = Math.round(HONEST * 100);
    if (el('cspOnbPct')) el('cspOnbPct').textContent = Math.round(ONBT * 100);
    if (el('cspOnbWarn')) el('cspOnbWarn').textContent = onbWarn(ONBT);
    var dots = el('cspOnbDots');
    if (dots) { var s = ''; for (var i = 0; i <= ONB_MAX; i++) s += '<i class="' + (i === ONB_PG ? 'on' : '') + '"></i>'; dots.innerHTML = s; }
    if (el('cspOnbGo')) el('cspOnbGo').textContent = ONB_PG === ONB_MAX ? 'Enter Consistency' : 'Continue';
    var tr = el('cspOnbTrack'); if (tr) tr.style.transform = 'translateX(-' + (ONB_PG * 100) + '%)';
  }
  function bindOnb(root) {
    function bindHeat(heat, set) {
      if (!heat) return; var dragging = false;
      function fromX(x) { var r = heat.getBoundingClientRect(); if (!r.width) return; set(Math.max(0.05, Math.min(1, (x - r.left) / r.width))); renderOnb(); }
      heat.addEventListener('pointerdown', function (e) { e.stopPropagation(); dragging = true; try { heat.setPointerCapture(e.pointerId); } catch (x) {} fromX(e.clientX); });
      heat.addEventListener('pointermove', function (e) { if (dragging) fromX(e.clientX); });
      heat.addEventListener('pointerup', function () { dragging = false; });
    }
    bindHeat(root.querySelector('#cspHonHeat'), function (v) { HONEST = v; });
    bindHeat(root.querySelector('#cspOnbHeat'), function (v) { ONBT = v; });
    // v1275 (Malik: "i want the pages to move with my fingers... it doesn't
    // feel apple like"): the track follows the finger 1:1, rubber-bands at
    // the ends, and settles on release by distance OR a flick, per the
    // Momentum gesture law (MOTION-SYSTEM.md: threshold 0.30, velocity
    // 0.30 px/ms, rubber band c=0.85).
    var tr = root.querySelector('#cspOnbTrack');
    if (tr) {
      var drag = null;
      var band = function (over, w) { var c = 0.85; return (over * w * c) / (w + c * Math.abs(over)); };
      tr.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.onb__heat')) return;   // the heatmaps own their drag
        drag = { x0: e.clientX, x: e.clientX, t: performance.now(), v: 0, w: tr.getBoundingClientRect().width || 1 };
        tr.style.transition = 'none';
        try { tr.setPointerCapture(e.pointerId); } catch (err) {}
      });
      tr.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var now = performance.now(), dt = now - drag.t;
        if (dt > 0) drag.v = drag.v * 0.6 + ((e.clientX - drag.x) / dt) * 0.4;
        drag.x = e.clientX; drag.t = now;
        var dx = e.clientX - drag.x0;
        // at the ends there is nothing to reveal, so the pull resists
        if ((ONB_PG === 0 && dx > 0) || (ONB_PG === ONB_MAX && dx < 0)) dx = band(dx, drag.w);
        tr.style.transform = 'translateX(calc(-' + (ONB_PG * 100) + '% + ' + dx.toFixed(1) + 'px))';
        e.preventDefault();
      });
      var release = function (e) {
        if (!drag) return;
        var dx = (e && e.clientX != null ? e.clientX : drag.x) - drag.x0;
        var v = drag.v, w = drag.w;
        drag = null;
        tr.style.transition = '';
        var flungLeft = v < -0.30, flungRight = v > 0.30;
        if ((dx < -w * 0.30 || flungLeft) && ONB_PG < ONB_MAX) ONB_PG++;
        else if ((dx > w * 0.30 || flungRight) && ONB_PG > 0) ONB_PG--;
        renderOnb();
      };
      tr.addEventListener('pointerup', release);
      tr.addEventListener('pointercancel', release);
    }
    var go = root.querySelector('#cspOnbGo');
    if (go) go.addEventListener('click', function () {
      if (ONB_PG < ONB_MAX) { ONB_PG++; renderOnb(); return; }
      saveTarget(ONBT, HONEST);
      var onb = root.querySelector('#cspOnb');
      if (onb) { onb.style.opacity = '0'; onb.style.transition = 'opacity 0.3s ease'; setTimeout(function () { try { onb.remove(); } catch (e) {} }, 320); }
      render();
    });
  }

  /* ---------------- the page controller ---------------------------------- */
  var root = null, isOpen = false;

  function render() {
    if (!root) return;
    var fullLog = buildLog();
    var curLog = currentLog(fullLog);
    var hasPast = fullLog.length !== curLog.length;
    var s = stats(curLog);
    var A = annotate(fullLog);
    LASTA = A; closeDaypop();
    root.querySelector('#cspOne').innerHTML = pageOne(s, curLog);
    root.querySelector('#cspEv').innerHTML = pageTwo(s, fullLog, curLog, A, hasPast);

    var sc = root.querySelector('#cspScale');
    if (sc) sc.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      SCALE = b.getAttribute('data-sc'); MOFF = 0; WOFF = 0; YOFF = 0; render();
    });
    [['cspNavMonth', function (v) { MOFF += v; }], ['cspNavWeek', function (v) { WOFF += v; }], ['cspNavYear', function (v) { YOFF += v; }]]
      .forEach(function (pair) {
        var n = root.querySelector('#' + pair[0]);
        if (n) n.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          pair[1](+b.getAttribute('data-step')); render();
        });
      });
    var ys = root.querySelector('#cspYrsw');
    if (ys) ys.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      YRMODE = b.getAttribute('data-y'); YOFF = 0; render();
    });
  }

  function build() {
    root = document.createElement('div');
    root.id = 'consistencyPage';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Consistency');
    root.innerHTML =
      '<div class="csp-fx" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<div class="csp-snap">' +
        '<section class="csp-pg csp-one" id="cspOne"></section>' +
        '<section class="csp-pg csp-two"><div class="ev" id="cspEv"></div></section>' +
      '</div>';
    document.body.appendChild(root);

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-today]')) { MOFF = 0; WOFF = 0; YOFF = 0; render(); return; }
      var cell = e.target.closest('.cal .d[data-k]');
      if (cell) { e.stopPropagation(); openDaypop(cell); return; }
      if (!e.target.closest('.daypop')) closeDaypop();
    });
    root.querySelector('.csp-snap').addEventListener('scroll', closeDaypop, { passive: true });

    if (!targetSet()) {
      ONB_PG = 0;
      try { ONBT = curTarget(); } catch (e) {}
      root.insertAdjacentHTML('beforeend', onbHtml());
      renderOnb();
      bindOnb(root);
    }
  }

  var escBound = null;
  function open() {
    if (isOpen) return;
    isOpen = true;
    SCALE = 'month'; MOFF = 0; WOFF = 0; YOFF = 0;
    build();
    render();
    try { if (typeof rememberView === 'function') rememberView('consistency'); } catch (e) {}
    // the chip routes through exitToModules('consistency') -> close() (js/01)
    try { if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show('consistency'); } catch (e) {}
    try { if (typeof TabBar !== 'undefined' && TabBar.hide) TabBar.hide(); } catch (e) {}
    document.body.style.overflow = 'hidden';
    var esc = function (e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    requestAnimationFrame(function () { if (root) root.classList.add('is-open'); });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    try { if (typeof rememberView === 'function') rememberView(null); } catch (e) {}
    try { if (typeof FullscreenClose !== 'undefined' && FullscreenClose.hide) FullscreenClose.hide(); } catch (e) {}
    document.body.style.overflow = '';
    var r = root; root = null;
    if (r) {
      r.classList.remove('is-open');
      setTimeout(function () { try { r.remove(); } catch (e) {} }, 320);
    }
    try { if (window.Router && Router.sync) Router.sync(); } catch (e) {}
  }

  // The completion hook (wired from js/30's one reward call): if the page is
  // open, the M pops and the number counts up live; if it is closed, the lit
  // state simply shows on next open (state-driven either way).
  function notifyCompletion() {
    if (!isOpen || !root) return;
    render();
    playCompletion();
  }

  // The shown-up count for small surfaces (the streak sweep's replacement
  // language: a pure count, no denominator, never shrinks within a goal).
  function shownUpCount() {
    try { return stats(currentLog(buildLog())).total; } catch (e) { return 0; }
  }

  window.ConsistencyPage = {
    open: open,
    close: close,
    isActive: function () { return isOpen; },
    notifyCompletion: notifyCompletion,
    shownUpCount: shownUpCount,
    _render: render
  };

  /* ---------------- routing: every old door leads here ------------------- */
  // The 'streak' module key stays (it is woven through the grid/sync); what
  // OPENING it does changes: the sheet is retired, the full page is the room.
  function installRoutes() {
    try {
      if (typeof Sheet !== 'undefined' && Sheet.open && !Sheet.open.__cspWrapped) {
        var rawOpen = Sheet.open;
        Sheet.open = function (key) {
          if (key === 'streak') { open(); return; }
          return rawOpen.apply(Sheet, arguments);
        };
        Sheet.open.__cspWrapped = true;
      }
    } catch (e) {}
    try {
      if (window.Doors && Doors.register) {
        Doors.register('consistency', {
          gesture: 'back',
          el: function () { return document.getElementById('consistencyPage'); },
          active: function () { return isOpen; },
          open: function () { return (Doors.internal ? Doors.internal(open) : open()); },
          close: function () {
            return new Promise(function (resolve) {
              (Doors.internal ? Doors.internal(close) : close());
              setTimeout(resolve, 340);
            });
          },
          forceClose: function () { (Doors.internal ? Doors.internal(close) : close()); }
        });
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installRoutes);
  else installRoutes();
  // Sheet is defined by js/07 which loads before this file, but wrap again
  // late in case boot order shifts.
  setTimeout(installRoutes, 1500);
})();
