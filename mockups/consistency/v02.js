/* v02: THE LEDGER
   Numbers first, almost no art. A small bloom sits quietly at the top, then the
   whole record is written out as a statement: line after line of real figures,
   values right-aligned in tabular numerals, grouped under quiet headings.
   Every number here is derived from the log. Nothing is invented, nothing is
   rounded in the person's favour, and there is not a single badge on the page. */
window.CVAR = window.CVAR || {};
window.CVAR['v02'] = {
  name: 'The ledger',
  note: 'A small bloom, then the record written out as a statement. Twelve sections of real figures in right-aligned tabular columns under quiet headings. A fall is printed at exactly the same weight as a rise. No charts, no badges, no encouragement.',
  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh, shape = ctx.shape;
    var N = log.length;

    /* ---------------- small helpers ---------------- */
    function md(d) { return d ? K.MON[d.getMonth()] + ' ' + d.getDate() : 'none yet'; }
    function mdf(d) { return d ? K.MONF[d.getMonth()] + ' ' + d.getDate() : 'none yet'; }
    function pc(a, b) { return b ? Math.round(100 * a / b) : 0; }
    function one(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, ''); }
    function row(l, v, u) {
      return '<div class="ck-row"><span>' + l + '</span><b>' + v + (u ? '<em>' + u + '</em>' : '') + '</b></div>';
    }
    function rows(inner) { return '<div class="ck-rows">' + inner + '</div>'; }
    function dayU(v) { return String(v) === '1' ? 'day' : 'days'; }
    function span(a, b) { return a.getTime() === b.getTime() ? md(a) : md(a) + ' to ' + md(b); }
    function dv(n, suf) {
      var c = n > 0 ? 'v02-up' : (n < 0 ? 'v02-dn' : 'v02-fl');
      var t = n === 0 ? 'even' : (n > 0 ? '+' + n : String(n));
      return '<u class="' + c + '">' + t + '</u>' + (suf && n !== 0 ? '<em>' + suf + '</em>' : '');
    }
    function tr(l, a, b, c, cls) {
      return '<div class="v02-tr' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span>' +
        '<b>' + a + '</b><b>' + b + '</b><b>' + c + '</b></div>';
    }
    function table(inner) { return '<div class="v02-t">' + inner + '</div>'; }
    function note(t) { return '<p class="v02-note">' + t + '</p>'; }
    function bestIn(slice) {
      var r = 0, m = 0;
      slice.forEach(function (d) { r = d.on ? r + 1 : 0; if (r > m) m = r; });
      return m;
    }
    function onIn(slice) { return slice.filter(function (d) { return d.on; }).length; }

    /* ---------------- derived record: runs and breaks ---------------- */
    var runs = [], brk = [], cr = null, cg = null;
    log.forEach(function (d) {
      if (d.on) {
        cg = null;
        if (!cr) { cr = { n: 0, a: d.date, b: d.date }; runs.push(cr); }
        cr.n++; cr.b = d.date;
      } else {
        cr = null;
        if (!cg) { cg = { n: 0, a: d.date, b: d.date }; brk.push(cg); }
        cg.n++; cg.b = d.date;
      }
    });
    var longRun = runs.length ? runs.slice().sort(function (x, y) { return y.n - x.n; })[0] : null;
    var longBrk = brk.length ? brk.slice().sort(function (x, y) { return y.n - x.n; })[0] : null;
    var weekRuns = runs.filter(function (r) { return r.n >= 7; }).length;
    var weekBrks = brk.filter(function (g) { return g.n >= 7; }).length;
    var avgRun = runs.length ? s.total / runs.length : 0;
    var avgBrk = brk.length ? s.missed / brk.length : 0;
    var g90 = 0, r90 = 0;
    log.slice(-90).forEach(function (d) { if (d.on) { r90 = 0; } else { r90++; if (r90 > g90) g90 = r90; } });

    /* ---------------- derived record: weeks ----------------
       Every week figure is counted over FULL weeks only, so they all share one
       denominator. Mixing part weeks into these counts would quietly inflate
       them, because the week currently running has not finished missing yet. */
    var fullW = s.weeks.filter(function (w) { return w.all === 7; });
    var perfectW = fullW.filter(function (w) { return w.on === 7; }).length;
    var metFullW = fullW.filter(function (w) { return w.on >= s.cadence; }).length;
    var thinW = fullW.filter(function (w) { return w.on < s.cadence; }).length;
    var zeroW = fullW.filter(function (w) { return w.on === 0; }).length;
    var bestW = fullW.reduce(function (m, w) { return Math.max(m, w.on); }, 0);
    var worstW = fullW.length ? fullW.reduce(function (m, w) { return Math.min(m, w.on); }, 7) : 0;

    /* the week being lived in right now, and the same point in the week before it.
       Buckets after the first always open on a Monday, so from index 1 onward
       "days left" and the like are true. */
    var curW = s.weeks[s.weeks.length - 1] || { on: 0, all: 0 };
    var prevW = s.weeks[s.weeks.length - 2] || null;
    var wkLeft = Math.max(0, 7 - curW.all);
    var prevSame = (prevW && prevW.all === 7 && N >= curW.all + 7)
      ? onIn(log.slice(-(curW.all + 7), -7)) : null;

    /* ---------------- derived record: time ---------------- */
    var onDays = log.filter(function (d) { return d.on; });
    var mins = onDays.map(function (d) { return d.minutes; }).sort(function (a, b) { return a - b; });
    var medMin = mins.length ? mins[Math.floor(mins.length / 2)] : 0;
    var maxMin = mins.length ? mins[mins.length - 1] : 0;
    var minMin = mins.length ? mins[0] : 0;
    var over60 = mins.filter(function (m) { return m >= 60; }).length;
    var min30 = log.slice(-30).reduce(function (a, d) { return a + d.minutes; }, 0);
    var longDay = onDays.length ? onDays.reduce(function (m, d) { return d.minutes > m.minutes ? d : m; }, onDays[0]) : null;
    var hrsWeek = N ? (s.minutes / (N / 7)) / 60 : 0;

    /* ---------------- derived record: support ---------------- */
    var supKeys = ['deepwork', 'reflection', 'checkin', 'vivere'];
    var supTotal = supKeys.reduce(function (a, k) { return a + (s.sup[k] || 0); }, 0);
    var supDayBy = {};
    supKeys.forEach(function (k) { supDayBy[k] = log.filter(function (d) { return d.sup[k]; }).length; });
    var withSup = log.filter(function (d) { return d.on && Object.keys(d.sup).length; }).length;
    var bare = s.total - withSup;

    /* ---------------- derived record: weekdays, months, halves ---------------- */
    var weOn = s.byDow[0] + s.byDow[6], weSeen = s.dowSeen[0] + s.dowSeen[6];
    var wdOn = s.total - weOn, wdSeen = N - weSeen;

    var lastYr = s.months.length ? s.months[s.months.length - 1].date.getFullYear() : 0;
    function mlab(m) {
      return K.MONF[m.date.getMonth()] + (m.date.getFullYear() !== lastYr ? ' &rsquo;' + String(m.date.getFullYear()).slice(2) : '');
    }
    var closed = s.months.slice(0, -1).filter(function (m) { return m.all >= 20; });
    var bestM = closed.length ? closed.slice().sort(function (a, b) { return (b.on / b.all) - (a.on / a.all); })[0] : null;
    var worstM = closed.length ? closed.slice().sort(function (a, b) { return (a.on / a.all) - (b.on / b.all); })[0] : null;
    var mDelta = pc(s.thisMonth.on, s.thisMonth.all) - pc(s.lastMonth.on, s.lastMonth.all);

    var half = Math.floor(N / 2);
    var h1 = log.slice(0, half).filter(function (d) { return d.on; }).length;
    var h2 = log.slice(half).filter(function (d) { return d.on; }).length;
    var f30 = log.slice(0, 30).filter(function (d) { return d.on; }).length;
    var missEvery = s.missed ? Math.round(N / s.missed) : 0;
    var lastIsToday = s.lastOn && log[N - 1] && s.lastOn.getTime() === log[N - 1].date.getTime();

    /* ================= the page ================= */
    var h = '';

    h += '<style>' +
      '.v02-head{display:flex;align-items:center;gap:15px;margin:2px 0 0}' +
      '.v02-bloom{flex:0 0 150px;width:150px;line-height:0;margin-left:-6px}' +
      '.v02-bloom svg{display:block;max-width:100%;height:auto;overflow:visible}' +
      '.v02-headr{flex:1;min-width:0}' +
      '.v02-headu{font-size:13.5px;color:var(--text-mid);font-weight:500;margin-top:8px;letter-spacing:-.01em}' +
      '.v02-heads{font-size:12.5px;color:var(--text-mid);margin-top:5px;line-height:1.45}' +
      '.v02-note{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin:11px 2px 0}' +
      '.v02-rule{height:1px;background:var(--hairline);margin-top:18px}' +
      '.v02-t{display:block}' +
      '.v02-tr{display:grid;grid-template-columns:1fr 44px 44px 52px;column-gap:8px;align-items:baseline;' +
        'padding:9px 2px;border-bottom:1px solid var(--hairline)}' +
      '.v02-tr:last-child{border-bottom:0}' +
      '.v02-tr>span{font-size:13px;color:var(--text-mid);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.v02-tr>b{font-size:13px;font-weight:600;color:var(--text-mid);text-align:right;' +
        'font-variant-numeric:tabular-nums;letter-spacing:-.01em}' +
      '.v02-tr>b:last-child{font-size:13.5px;font-weight:700;color:var(--text-hi)}' +
      '.v02-th{padding:0 2px 8px}' +
      '.v02-th>span,.v02-th>b,.v02-th>b:last-child{font-size:11.5px;font-weight:500;color:var(--text-mid)}' +
      /* a fall reads exactly as loud as a rise: same size, same weight, full
         opacity. Dimming the bad direction would be flattering the record. */
      '.v02-up,.v02-dn,.v02-fl{text-decoration:none;font-variant-numeric:tabular-nums}' +
      '.v02-up{color:var(--accent)}' +
      '.v02-dn{color:var(--text-hi)}' +
      '.v02-fl{color:var(--text-mid)}' +
      '.v02-pos{margin-top:2px}' +
      '.v02-sum{margin-top:12px}' +
      '.v02-p{display:flex;align-items:baseline;gap:12px;padding:11px 2px;border-bottom:1px solid var(--hairline)}' +
      '.v02-p:last-child{border-bottom:0}' +
      '.v02-p>b{font-size:21px;font-weight:750;letter-spacing:-.03em;font-variant-numeric:tabular-nums;' +
        'line-height:1;flex:0 0 auto;min-width:84px}' +
      '.v02-p>span{font-size:13px;color:var(--text-mid);line-height:1.4}' +
      '</style>';

    h += '<div class="cx__top"><div class="cx__title">Consistency</div>' +
      '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg></div></div>';

    /* ---- the one piece of art on the page ---- */
    h += '<div class="v02-head">' +
      '<div class="v02-bloom">' + K.bloomSVG(s.total, { size: 150, animate: true }) + '</div>' +
      '<div class="v02-headr">' +
        '<div class="ck-n ck-n--big">' + K.n(s.total) + '</div>' +
        '<div class="v02-headu">days you showed up</div>' +
        '<div class="v02-heads">of ' + K.n(N) + ' days on the record, starting ' + mdf(log[0].date) + '.</div>' +
      '</div></div>';
    h += note('One dot for every day you showed up. Everything under it is the same record, written out.');
    h += '<div class="v02-rule"></div>';

    /* ---- 1. the goal, tuned by shape and nothing else ---- */
    h += '<h2>The goal, where it stands</h2>';
    h += '<div class="v02-pos">' +
      '<div class="v02-p"><b>' + sh.lead + '</b><span>' + sh.sub + '</span></div>' +
      '<div class="v02-p"><b>' + sh.ctx.v + '</b><span>' + sh.ctx.l + '</span></div>' +
      '</div>';

    /* ---- 2. the whole span ---- */
    h += '<h2>Since day one</h2>';
    h += rows(
      row('First day on the record', md(log[0].date)) +
      row('Days since then', K.n(N)) +
      row('Days you showed up', K.n(s.total)) +
      row('Days you missed', K.n(s.missed)) +
      row('Show-up rate', s.rate + '%') +
      row('One miss every', s.missed ? missEvery : 'no misses', s.missed ? (missEvery === 1 ? 'day' : 'days') : '') +
      row('Days a week, on average', one(s.perWeek)) +
      row('Last day you showed up', lastIsToday ? 'today' : md(s.lastOn))
    );

    /* ---- 3. the near window ---- */
    var w30 = Math.min(30, N);
    h += '<h2>' + (w30 === 30 ? 'The last thirty days' : 'The last ' + w30 + ' days') + '</h2>';
    var miss30 = w30 - s.r30, run30 = bestIn(log.slice(-w30));
    h += rows(
      row('Days shown up', s.r30, 'of ' + w30) +
      row('Days missed', miss30, miss30 === 1 ? 'day' : 'days') +
      (N >= 60 ? row('The thirty days before that', s.rPrev30, 'of 30') : '') +
      (N >= 60 ? row('Change', dv(s.delta30, s.delta30 === 1 || s.delta30 === -1 ? 'day' : 'days')) : '') +
      row('Rate over that window', pc(s.r30, w30) + '%') +
      row('Rate since day one', s.rate + '%') +
      /* counted off the last 28 days exactly. Averaging the kit's week buckets
         would fold in the part week at each end and quietly flatter a short record. */
      (N >= 28 ? row('Days a week, last four weeks', one(onIn(log.slice(-28)) / 4)) : '') +
      row('Longest run inside that window', run30, dayU(run30)) +
      (N >= 90 ? row('Longest break inside the last ninety', g90, g90 === 1 ? 'day' : 'days') : '') +
      row('Time logged in that window', Math.floor(min30 / 60) + 'h ' + (min30 % 60) + 'm')
    );

    /* ---- 4. the week currently running (only once a Monday-anchored week exists) ---- */
    if (s.weeks.length >= 2) {
      h += '<h2>The week you are in</h2>';
      var wkDelta = prevSame === null ? 0 : curW.on - prevSame;
      h += rows(
        row('Days of this week so far', curW.all) +
        row('Days you showed up', curW.on) +
        row('Days you missed', curW.all - curW.on) +
        row('Days left in the week', wkLeft) +
        (prevSame !== null ? row('By this day last week', prevSame) : '') +
        (prevSame !== null ? row('Change', dv(wkDelta, Math.abs(wkDelta) === 1 ? 'day' : 'days')) : '') +
        (prevW ? row(prevW.all === 7 ? 'All of last week' : 'The part week before this one', prevW.on, 'of ' + prevW.all) : '')
      );
      h += note('This week is still running, so nothing here is final. The comparison is against the same number of days last week, not against a week that already finished.');
    }

    /* ---- 5. runs ---- */
    h += '<h2>Every run you have put together</h2>';
    h += rows(
      row('Runs you have started', runs.length) +
      row('Longest run', s.best, s.best === 1 ? 'day' : 'days') +
      (longRun ? row('Dates of that run', span(longRun.a, longRun.b)) : '') +
      row('Average run', one(avgRun), dayU(one(avgRun))) +
      row('Runs of a week or more', weekRuns) +
      row('Runs that lasted a single day', runs.filter(function (r) { return r.n === 1; }).length) +
      row('The run you are on now', s.current, s.current === 1 ? 'day' : 'days') +
      row('Times you came back after a miss', s.comebacks)
    );
    h += note('A run ends on the first day you skip. Nothing here is rounded up to keep one alive.');

    /* ---- 6. breaks ---- */
    h += '<h2>Every break you have taken</h2>';
    h += rows(
      row('Separate breaks in the record', brk.length) +
      row('Days missed in total', K.n(s.missed)) +
      row('Longest break', s.longestGap, s.longestGap === 1 ? 'day' : 'days') +
      (longBrk ? row('Dates of that break', span(longBrk.a, longBrk.b)) : '') +
      row('Average break', one(avgBrk), dayU(one(avgBrk))) +
      row('Breaks of a week or more', weekBrks) +
      row('Breaks of a single day', brk.filter(function (g) { return g.n === 1; }).length) +
      row('Share of days missed', pc(s.missed, N) + '%')
    );

    /* ---- 7. weeks (needs at least two full weeks to say anything true) ---- */
    if (fullW.length >= 2) {
      h += '<h2>Week by week</h2>';
      h += rows(
        row('Full weeks on the record', fullW.length) +
        row('Best full week', bestW, 'of 7') +
        row('Weakest full week', worstW, 'of 7') +
        row('Full weeks you showed up every day', perfectW) +
        row('Full weeks at ' + s.cadence + ' days or more', metFullW) +
        row('Full weeks under ' + s.cadence + ' days', thinW) +
        row('Full weeks with nothing at all', zeroW) +
        row('Share of full weeks at ' + s.cadence + ' or more', pc(metFullW, fullW.length) + '%')
      );
      h += note('A full week is one the record covers Monday to Sunday. The part weeks at either end are left out, so every count above is measured against the same ' + fullW.length + ' weeks.');
    }

    /* ---- 8. weekdays ---- */
    h += '<h2>Every weekday</h2>';
    var wdRows = tr('Weekday', 'Seen', 'Shown', 'Rate', 'v02-th');
    for (var i = 0; i < 7; i++) {
      wdRows += tr(K.WDF[i], s.dowSeen[i], s.byDow[i], pc(s.byDow[i], s.dowSeen[i]) + '%');
    }
    h += table(wdRows);
    h += note('Rates are out of the number of times that weekday has come around since you started.');
    /* Rank weekdays by RATE, not by raw count: a record that starts mid-week has
       seen some weekdays more often than others, and counting alone would crown
       the wrong day. And a strongest/weakest pair is only worth naming when the
       rates actually differ, otherwise the same day would be printed as both. */
    var dowRate = function (i) { return s.dowSeen[i] ? s.byDow[i] / s.dowSeen[i] : -1; };
    var dBest = -1, dWorst = -1;
    for (var w = 0; w < 7; w++) {
      if (!s.dowSeen[w]) continue;
      if (dBest < 0 || dowRate(w) > dowRate(dBest)) dBest = w;
      if (dWorst < 0 || dowRate(w) < dowRate(dWorst)) dWorst = w;
    }
    var dowSplit = dBest >= 0 && dWorst >= 0 && dowRate(dBest) > dowRate(dWorst);
    h += '<div class="ck-rows v02-sum">' +
      (dowSplit ? row('Strongest weekday, ' + K.WDF[dBest], pc(s.byDow[dBest], s.dowSeen[dBest]) + '%') : '') +
      (dowSplit ? row('Weakest weekday, ' + K.WDF[dWorst], pc(s.byDow[dWorst], s.dowSeen[dWorst]) + '%') : '') +
      (dowSplit ? row('Days missed on that weakest weekday', s.dowSeen[dWorst] - s.byDow[dWorst]) : '') +
      (dowSplit ? row('Spread, strongest to weakest', pc(s.byDow[dBest], s.dowSeen[dBest]) - pc(s.byDow[dWorst], s.dowSeen[dWorst]), 'points') : '') +
      row('Monday to Friday', pc(wdOn, wdSeen) + '%') +
      row('Saturday and Sunday', pc(weOn, weSeen) + '%') +
      row('Days missed on weekends', weSeen - weOn) +
      '</div>';
    if (!dowSplit) h += note('Every weekday you have seen carries the same rate so far, so there is no strongest or weakest one to name yet.');

    /* ---- 9. months (needs a second month before a comparison means anything) ---- */
    if (s.months.length >= 2) {
      h += '<h2>Month by month</h2>';
      var moRows = tr('Month', 'Days', 'Shown', 'Rate', 'v02-th');
      s.months.slice(-12).forEach(function (m) {
        moRows += tr(mlab(m), m.all, m.on, pc(m.on, m.all) + '%');
      });
      h += table(moRows);
      h += note('The month you are in is still open, so its rate can still move in either direction. The first month counts only the days after you started.');
      h += '<div class="ck-rows v02-sum">' +
        row('This month so far', s.thisMonth.on, 'of ' + s.thisMonth.all) +
        row('Last month', s.lastMonth.on, 'of ' + s.lastMonth.all) +
        row('Rate against last month', dv(mDelta, 'points')) +
        /* the month name belongs in the label so the rate itself stays the value.
           A real figure never gets parked in the small dim unit slot. */
        (bestM ? row('Strongest full month, ' + mlab(bestM), pc(bestM.on, bestM.all) + '%') : '') +
        (worstM ? row('Weakest full month, ' + mlab(worstM), pc(worstM.on, worstM.all) + '%') : '') +
        row('Months on the record', s.months.length) +
        '</div>';
    }

    /* ---- 9. time ---- */
    h += '<h2>Time on the work</h2>';
    h += rows(
      row('Total time logged', K.n(s.hours), 'hours') +
      row('Hours a week, on average', one(hrsWeek)) +
      row('Average session', s.avgSession, 'min') +
      row('Median session', medMin, 'min') +
      row('Longest session', maxMin, 'min') +
      (longDay ? row('The day of that session', md(longDay.date)) : '') +
      row('Shortest session', minMin, 'min') +
      row('Sessions of an hour or more', over60) +
      row('Share of sessions over an hour', pc(over60, s.total) + '%')
    );
    h += note('Minutes come from the sessions you logged. None of it is estimated or filled in for you.');

    /* ---- 10. support ---- */
    h += '<h2>Around the work</h2>';
    var supRows = tr('Activity', 'Total', 'Days', 'Share', 'v02-th');
    supKeys.forEach(function (k) {
      supRows += tr(K.SUPNAME[k], s.sup[k] || 0, supDayBy[k], pc(supDayBy[k], N) + '%');
    });
    h += table(supRows);
    h += '<div class="ck-rows v02-sum">' +
      row('Support actions in total', K.n(supTotal)) +
      row('Days with a move and something beside it', withSup) +
      row('Days with the move and nothing else', bare) +
      row('Days you opened Memento but made no move', s.supDays) +
      '</div>';
    h += note('Share is measured against all ' + K.n(N) + ' days on the record. Support activities are counted on their own, and none of them ever stand in for a day you showed up.');

    /* ---- 12. then and now (needs enough record to have a then) ---- */
    if (N >= 21) {
      var runH1 = bestIn(log.slice(0, half)), runH2 = bestIn(log.slice(half));
      h += '<h2>Then and now</h2>';
      h += rows(
        (N >= 90 ? row('Your first thirty days', f30, 'of 30') : '') +
        (N >= 90 ? row('Your most recent thirty', s.r30, 'of 30') : '') +
        (N >= 90 ? row('Difference', dv(s.r30 - f30, Math.abs(s.r30 - f30) === 1 ? 'day' : 'days')) : '') +
        row('First half of the record', pc(h1, half) + '%') +
        row('Second half of the record', pc(h2, N - half) + '%') +
        row('Change across the two halves', dv(pc(h2, N - half) - pc(h1, half), 'points')) +
        row('Best run in the first half', runH1, dayU(runH1)) +
        row('Best run in the second half', runH2, dayU(runH2)) +
        row('Days missed in the first half', half - h1) +
        row('Days missed in the second half', (N - half) - h2)
      );
      h += note('The two halves are the record cut down the middle, ' + half + ' days against ' + (N - half) + '. Neither side is adjusted to make the later one look better.');
    }

    h += '<div class="cx__foot">Every figure above is read straight off the log.<br>A missed day stays a missed day, and it stays on the page.</div>';

    return '<div class="cx">' + h + '</div>';
  }
};
