/* THE CONSISTENCY KIT — shared engine for every layout variant.
   One universal record (the bloom), a deep statistics engine, and a goalShape
   layer that only ever tunes the secondary line + one contextual stat.
   Nothing here invents a number: every stat is derived from the seeded log. */
(function (W) {
  'use strict';

  /* ---------------- seeded, realistic history ---------------- */
  function seeded(s) { return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONF = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WD = ['S','M','T','W','T','F','S'];
  var WDF = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var DAY = 86400000;
  function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* A real person's log: strong start, a dip, a real gap, a comeback, a strong
     present. Support activities cluster around main days the way they actually do. */
  function buildLog(N, shape) {
    var r = seeded(20260811), days = [], today = new Date(); today.setHours(12, 0, 0, 0);
    var cad = shape === 'frequency' ? 4 : 7;                 // sessions per week for frequency goals
    for (var i = N - 1; i >= 0; i--) {
      var d = new Date(today.getTime() - i * DAY);
      var age = (N - 1 - i) / Math.max(1, N - 1);            // 0 = oldest, 1 = today
      var dow = d.getDay();
      // base show rate: honeymoon, dip, recovery, present strength
      var base = 0.92 - 0.34 * Math.exp(-Math.pow((age - 0.42) / 0.16, 2)) + 0.10 * age;
      if (shape === 'frequency') base *= (dow === 0 || dow === 6) ? 0.30 : 0.92;  // weekday-shaped
      if (shape === 'maintenance') base = Math.min(0.985, base + 0.10);           // a vow is held hard
      var on = r() < Math.max(0.12, Math.min(0.98, base));
      // one real gap, honestly recorded
      var gapStart = Math.floor(N * 0.44);
      if (N >= 40 && (N - 1 - i) >= gapStart && (N - 1 - i) < gapStart + (N > 120 ? 5 : 3)) on = false;
      if (i <= 2) on = true;                                  // currently moving
      var sup = {};
      if (on) {
        if (r() < 0.62) sup.deepwork = 1 + Math.floor(r() * 2);
        if (r() < 0.44) sup.reflection = 1;
        if (r() < 0.71) sup.checkin = 1;
        if (r() < 0.13) sup.vivere = 1;
      } else if (r() < 0.18) { sup.checkin = 1; }             // showed up lightly, no main move
      days.push({ date: d, key: dayKey(d), on: on, sup: sup, minutes: on ? 25 + Math.floor(r() * 70) : 0 });
    }
    return days;
  }

  /* ---------------- the deep statistics engine ---------------- */
  function stats(log, shape, cadence) {
    var N = log.length, total = 0, cur = 0, best = 0, run = 0, gaps = [], gap = 0,
        comebacks = 0, prevOn = true, minutes = 0, supTot = { deepwork: 0, reflection: 0, checkin: 0, vivere: 0 },
        byDow = [0,0,0,0,0,0,0], dowSeen = [0,0,0,0,0,0,0], byMonth = {}, firstOn = null, lastOn = null;

    log.forEach(function (d, i) {
      dowSeen[d.date.getDay()]++;
      var mk = d.date.getFullYear() + '-' + d.date.getMonth();
      if (!byMonth[mk]) byMonth[mk] = { on: 0, all: 0, label: MON[d.date.getMonth()], date: d.date };
      byMonth[mk].all++;
      Object.keys(d.sup).forEach(function (k) { supTot[k] += d.sup[k]; });
      if (d.on) {
        total++; run++; if (run > best) best = run;
        byDow[d.date.getDay()]++; byMonth[mk].on++; minutes += d.minutes;
        if (!prevOn && i > 0) comebacks++;
        if (gap > 0) { gaps.push(gap); gap = 0; }
        if (firstOn === null) firstOn = d.date; lastOn = d.date;
      } else { run = 0; gap++; }
      prevOn = d.on;
    });
    if (gap > 0) gaps.push(gap);
    for (var i = N - 1; i >= 0 && log[i].on; i--) cur++;

    // weeks: for frequency goals a WEEK is the unit of truth, not a day
    var weeks = [], wk = null;
    log.forEach(function (d) {
      if (!wk || d.date.getDay() === 1) { wk = { on: 0, all: 0, start: d.date }; weeks.push(wk); }
      wk.all++; if (d.on) wk.on++;
    });
    var metWeeks = weeks.filter(function (w) { return w.on >= (cadence || 4); }).length;
    var last4 = weeks.slice(-4), last4Rate = last4.length ? last4.reduce(function (a, w) { return a + w.on; }, 0) / last4.length : 0;

    // month-over-month
    var mk = Object.keys(byMonth).sort(function (a, b) { return byMonth[a].date - byMonth[b].date; });
    var months = mk.map(function (k) { return byMonth[k]; });
    var thisM = months[months.length - 1] || { on: 0, all: 1 }, lastM = months[months.length - 2] || { on: 0, all: 1 };

    // the rolling 30-day rate, the honest "how am I doing lately"
    var l30 = log.slice(-30), r30 = l30.filter(function (d) { return d.on; }).length;
    var p30 = log.slice(-60, -30), rPrev30 = p30.filter(function (d) { return d.on; }).length;

    var bestDow = byDow.indexOf(Math.max.apply(null, byDow));
    var worstDow = byDow.indexOf(Math.min.apply(null, byDow.map(function (v, i) { return dowSeen[i] ? v : 999; })));

    return {
      N: N, total: total, current: cur, best: best, rate: Math.round(100 * total / N),
      missed: N - total, longestGap: gaps.length ? Math.max.apply(null, gaps) : 0, gaps: gaps.length,
      comebacks: comebacks, minutes: minutes, hours: Math.round(minutes / 60),
      sup: supTot, byDow: byDow, dowSeen: dowSeen, bestDow: bestDow, worstDow: worstDow,
      months: months, thisMonth: thisM, lastMonth: lastM,
      weeks: weeks, metWeeks: metWeeks, last4Rate: last4Rate, cadence: cadence || 4,
      r30: r30, rPrev30: rPrev30, delta30: r30 - rPrev30,
      firstOn: firstOn, lastOn: lastOn,
      avgSession: total ? Math.round(minutes / total) : 0,
      perWeek: (total / (N / 7)),
      supDays: log.filter(function (d) { return !d.on && Object.keys(d.sup).length; }).length
    };
  }

  /* ---------------- goalShape: the ONLY branching in the whole page ----------------
     Universal bloom, universal stats. The shape tunes one sentence and one stat. */
  var SHAPES = {
    quantity_up:   { name: 'Grow a number',  unit: 'paying users', target: 1000, at: 412 },
    quantity_down: { name: 'Bring it down',  unit: 'lbs',          target: 175,  at: 191, from: 214 },
    frequency:     { name: 'A rate you keep', unit: 'sessions',    cadence: 4 },
    maintenance:   { name: 'A line you hold', unit: 'days held' },
    milestone:     { name: 'One event',      unit: 'the bar exam', dueIn: 74 },
    open:          { name: 'No number',      unit: '' }
  };
  function shapeLine(shape, s) {
    var S = SHAPES[shape] || SHAPES.open;
    switch (shape) {
      case 'frequency':   return { lead: s.last4Rate.toFixed(1).replace(/\.0$/, '') + ' of ' + s.cadence, sub: 'sessions a week, last four weeks', ctx: { v: s.metWeeks, l: 'weeks you hit the rate' } };
      case 'maintenance': return { lead: String(s.current), sub: s.current === 1 ? 'day held' : 'days held, unbroken', ctx: { v: s.best, l: 'longest stretch held' } };
      case 'quantity_up': return { lead: S.at.toLocaleString(), sub: 'of ' + S.target.toLocaleString() + ' ' + S.unit, ctx: { v: Math.round(100 * S.at / S.target) + '%', l: 'of the way there' } };
      case 'quantity_down':return { lead: (S.from - S.at) + ' ' + S.unit, sub: 'down, ' + (S.at - S.target) + ' to go', ctx: { v: S.at, l: 'where you are now' } };
      case 'milestone':   return { lead: String(s.total), sub: 'days of work banked for ' + S.unit, ctx: { v: S.dueIn, l: 'days until it happens' } };
      default:            return { lead: String(s.total), sub: s.total === 1 ? 'day recorded' : 'days recorded', ctx: { v: s.rate + '%', l: 'of days since you started' } };
    }
  }

  /* ---------------- THE BLOOM (ported verbatim from the daily reward) ----------------
     phyllotaxis at 2.399963, dots shrink as the count climbs, a minimum frame so
     days 1-6 read as an intentional scatter instead of an overlapping clump.
     Consistency does NOT cap it: the whole life accumulates here. */
  function bloomSVG(count, opts) {
    opts = opts || {};
    var N = Math.max(0, count), dots = '';
    var c = opts.spacing || 10.0;
    var dr = Math.max(1.15, Math.min(4.6, 46 / Math.sqrt(N + 2)));
    for (var i = 0; i < N; i++) {
      var rr = c * Math.sqrt(i), th = i * 2.399963;
      var cx = (rr * Math.cos(th)).toFixed(2), cy = (rr * Math.sin(th)).toFixed(2);
      var last = i === N - 1;
      // A handful of seeds must read as clearly as a full bloom reads as mass, so
      // the alpha ramp starts high and the OLDEST seeds stay legible. A faint
      // scatter looks like a rendering failure, not like week one.
      dots += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (last ? dr + 1.2 : dr) + '" fill="' +
        (last ? 'var(--accent)' : 'rgba(var(--ink),' + (0.40 + 0.38 * (i / Math.max(1, N))).toFixed(2) + ')') + '"' +
        (opts.animate ? ' style="--i:' + i + '"' : '') + '></circle>';
    }
    var span = Math.max(74, c * Math.sqrt(Math.max(1, N - 1)) + dr + 8);
    // The drawn box grows with the record. At day 7 the bloom is a small, dense,
    // deliberate cluster; by day 60+ it fills the space it was given.
    var base = opts.size || 300;
    var grow = Math.max(0.46, Math.min(1, 0.46 + 0.54 * (Math.sqrt(N) / Math.sqrt(60))));
    var px = Math.round(base * (opts.fit === false ? 1 : grow));
    return '<svg class="ck-bloom' + (opts.animate ? ' ck-bloom--in' : '') + '" viewBox="' + (-span) + ' ' + (-span) + ' ' + (span * 2) + ' ' + (span * 2) + '"' +
      ' width="' + px + '" height="' + px + '" aria-hidden="true">' + dots + '</svg>';
  }

  /* The alternate view: the calendar. Every day since day one, misses drawn as
     empty cells so the record never flatters. */
  function calendarHTML(log, opts) {
    opts = opts || {};
    var C = log.length;
    var cols = opts.cols || Math.max(7, Math.min(21, Math.round(Math.sqrt(C * 1.6))));
    var gap = C > 180 ? 3 : C > 90 ? 4 : 6;
    var cells = log.map(function (d, i) {
      var cls = d.on ? 'on' : (Object.keys(d.sup).length ? 'sup' : 'off');
      if (i === C - 1 && d.on) cls += ' today';
      return '<b class="' + cls + '" title="' + d.key + '"></b>';
    }).join('');
    return '<div class="ck-cal" style="grid-template-columns:repeat(' + cols + ',1fr);gap:' + gap + 'px">' + cells + '</div>';
  }

  /* A compact 7-column month grid, for layouts that want a true calendar read. */
  function monthGrid(log) {
    var last = log[log.length - 1].date, y = last.getFullYear(), m = last.getMonth();
    var first = new Date(y, m, 1), start = first.getDay(), dim = new Date(y, m + 1, 0).getDate();
    var map = {}; log.forEach(function (d) { map[d.key] = d; });
    var cells = '';
    for (var i = 0; i < start; i++) cells += '<b class="pad"></b>';
    for (var dd = 1; dd <= dim; dd++) {
      var k = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
      var e = map[k];
      var cls = !e ? 'future' : e.on ? 'on' : (Object.keys(e.sup).length ? 'sup' : 'off');
      cells += '<b class="' + cls + '">' + dd + '</b>';
    }
    return '<div class="ck-mg"><div class="ck-mg__h">' + WD.map(function (w) { return '<i>' + w + '</i>'; }).join('') + '</div>' +
      '<div class="ck-mg__g">' + cells + '</div></div>';
  }

  /* ---------------- shared stat components ---------------- */
  function n(v) { return typeof v === 'number' ? v.toLocaleString() : v; }
  function tile(v, label, sub) {
    return '<div class="ck-tile"><b>' + n(v) + '</b><span>' + label + '</span>' + (sub ? '<i>' + sub + '</i>' : '') + '</div>';
  }
  function delta(v) {
    if (v === 0) return '<em class="flat">even</em>';
    return '<em class="' + (v > 0 ? 'up' : 'down') + '">' + (v > 0 ? '+' : '') + v + '</em>';
  }
  function dowChart(s) {
    var mx = Math.max.apply(null, s.byDow) || 1;
    return '<div class="ck-dow">' + s.byDow.map(function (v, i) {
      var pct = s.dowSeen[i] ? Math.round(100 * v / s.dowSeen[i]) : 0;
      return '<div class="ck-dow__c"><div class="ck-dow__bar' + (i === s.bestDow ? ' top' : '') + '" style="height:' + Math.max(4, 100 * v / mx) + '%"><u>' + pct + '</u></div><span>' + WD[i] + '</span></div>';
    }).join('') + '</div>';
  }
  function monthChart(s) {
    var ms = s.months.slice(-12);
    return '<div class="ck-mo">' + ms.map(function (m) {
      var pct = Math.round(100 * m.on / m.all);
      return '<div class="ck-mo__c"><div class="ck-mo__t"><i style="height:' + Math.max(3, pct) + '%"></i></div><b>' + pct + '</b><span>' + m.label + '</span></div>';
    }).join('') + '</div>';
  }
  var ICON = {
    deepwork:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.4"/></svg>',
    reflection:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 19.2V5.6A1.6 1.6 0 016.6 4H19v16H6.6A1.6 1.6 0 015 19.2z"/><path d="M8.6 8.4h6.8M8.6 12h5"/></svg>',
    checkin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M5 12.4l4.4 4.4L19 7.2"/></svg>',
    vivere:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="2.6"/><circle cx="9" cy="9" r="1.7"/><path d="M20.4 14.6l-4.6-4.6-7 7"/></svg>'
  };
  var SUPNAME = { deepwork:'Deep work', reflection:'Reflections', checkin:'Check-ins', vivere:'Vivere' };
  var SUPUNIT = { deepwork:'sessions', reflection:'entries', checkin:'mornings', vivere:'visions' };
  function supportRows(s, opts) {
    opts = opts || {};
    return '<div class="ck-sup">' + Object.keys(SUPNAME).map(function (k) {
      var v = s.sup[k] || 0;
      var pct = s.total ? Math.round(100 * Math.min(v, s.total) / s.total) : 0;
      return '<div class="ck-sup__r"><span class="ck-sup__i">' + ICON[k] + '</span>' +
        '<span class="ck-sup__t"><b>' + SUPNAME[k] + '</b><i>' + v + ' ' + SUPUNIT[k] + '</i></span>' +
        (opts.bar === false ? '' : '<span class="ck-sup__bar"><u style="width:' + pct + '%"></u></span>') +
        '<span class="ck-sup__n">' + v + '</span></div>';
    }).join('') + '</div>';
  }
  /* the 30-day rolling line: the honest "how am I doing lately" */
  function sparkline(log, days, w, h) {
    days = days || 60; w = w || 300; h = h || 44;
    var win = log.slice(-days), pts = [], acc = 0;
    win.forEach(function (d, i) {
      var lo = Math.max(0, i - 6), sl = win.slice(lo, i + 1);
      var rate = sl.filter(function (x) { return x.on; }).length / sl.length;
      pts.push([i / Math.max(1, win.length - 1) * w, h - rate * (h - 6) - 3]);
    });
    if (pts.length < 2) return '';
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    var area = d + ' L' + w + ' ' + h + ' L0 ' + h + ' Z';
    return '<svg class="ck-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="ck-spark__a" d="' + area + '"/><path class="ck-spark__l" d="' + d + '"/>' +
      '<circle class="ck-spark__d" cx="' + pts[pts.length-1][0].toFixed(1) + '" cy="' + pts[pts.length-1][1].toFixed(1) + '" r="3"/></svg>';
  }

  W.CKit = {
    buildLog: buildLog, stats: stats, shapeLine: shapeLine, SHAPES: SHAPES,
    bloomSVG: bloomSVG, calendarHTML: calendarHTML, monthGrid: monthGrid,
    tile: tile, delta: delta, dowChart: dowChart, monthChart: monthChart,
    supportRows: supportRows, sparkline: sparkline, sparkbars: sparkline,
    MON: MON, MONF: MONF, WD: WD, WDF: WDF, n: n, ICON: ICON,
    SUPNAME: SUPNAME, SUPUNIT: SUPUNIT
  };
})(window);
