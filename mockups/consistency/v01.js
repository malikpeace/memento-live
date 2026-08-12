/* v01. The record.
   The default candidate. Bloom on top, then one calm honest scroll: where you
   are today, the totals, how it is going lately, every day since day one, this
   month, week by week, your rhythm, month by month, time on it, life around the
   work, and the hard part at the bottom. No branching pages: goalShape only
   tunes the secondary line and one contextual stat.

   Every comparison guards its own window. A 34-day record does not get told how
   it compares to "the 30 days before", a 23-day month is never called finished,
   and a part week never sets the weekly rate. The record does not flatter and it
   does not overclaim. Every number below is read off ctx.s or ctx.log. */
window.CVAR = window.CVAR || {};
window.CVAR['v01'] = {
  name: 'The record',
  note: 'Bloom hero, then a straight top-to-bottom scroll through every statistic the log can prove, ending with what was missed. Every comparison hides itself until there is enough record to make it true.',
  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh, shape = ctx.shape;
    var MON = K.MON, MONF = K.MONF, WD = K.WD, WDF = K.WDF;

    /* ---------- helpers. nothing here invents a number ---------- */
    function pc(a, b) { return b ? Math.round(100 * a / b) : 0; }
    function dShort(d) { return d ? MONF[d.getMonth()] + ' ' + d.getDate() : ''; }
    function dLong(d) { return d ? MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() : 'not yet'; }
    function s1(n, one, many) { return n === 1 ? one : many; }
    function sum(arr, key) { return arr.reduce(function (a, w) { return a + w[key]; }, 0); }
    /* how many days that calendar month actually holds, so a part month is
       never called finished on a 28-day technicality */
    function dim(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

    var last = log[log.length - 1] || { on: false, sup: {} };
    var todayOn = !!last.on;
    var startDate = log.length ? log[0].date : null;
    var leadIsTotal = (shape === 'open' || shape === 'milestone');
    var leadCls = String(sh.lead).length > 6 ? 'ck-n--big' : 'ck-n--hero';
    var thisWeek = s.weeks[s.weeks.length - 1] || { on: 0, all: 0 };

    /* the bloom keeps the kit's spacing so a young record stays visibly young,
       but the frame comes in with it. Rendered at 330 a five day record is five
       dots floating in a void. */
    var bloomSize = s.total <= 8 ? 172 : s.total <= 16 ? 214 : s.total <= 30 ? 260 : s.total <= 60 ? 296 : 330;

    /* the calendar: the kit's column count collapses to 7 on short records,
       which blows the cells up. Hold a sane cell size on every length. */
    var kitCols = Math.max(7, Math.min(21, Math.round(Math.sqrt(s.N * 1.6))));
    var calCols = Math.max(kitCols, Math.min(14, s.N));
    /* cells are 1:1 and stretch to fill the column, so a short record turns into
       a row of slabs. Cap the grid width instead of the cell. */
    var calMax = calCols * 30;
    var emptyDays = s.missed - s.supDays;   // truly blank squares, sup days excluded

    /* lately: a 30-vs-30 comparison is a lie on a record shorter than 60 days */
    var win30 = Math.min(30, s.N);
    var has60 = s.N >= 60;
    var sparkSpan = Math.min(60, s.N);

    /* days a week, lately. The kit averages whole and part week buckets together,
       so a 7 for 7 first week reads as 3.5 days a week. Read it off the days
       instead: the rate over a fixed window, scaled to seven. */
    var recentWin = Math.min(28, s.N);
    var recentOn = log.slice(-recentWin).filter(function (d) { return d.on; }).length;
    var recentPerWeek = recentWin ? recentOn / recentWin * 7 : 0;

    /* weeks. A bucket of 7 is a whole Monday to Sunday week, anything less is a
       part week at one end of the record and is never counted as one. */
    var fullWeeks = s.weeks.filter(function (w) { return w.all === 7; });
    var cleanWeeks = fullWeeks.filter(function (w) { return w.on === 7; }).length;
    var bestWeek = null, worstWeek = null;
    fullWeeks.forEach(function (w) {
      if (!bestWeek || w.on > bestWeek.on) bestWeek = w;
      if (!worstWeek || w.on < worstWeek.on) worstWeek = w;
    });
    var shownWeeks = s.weeks.slice(-26);
    var hiddenWeeks = s.weeks.length - shownWeeks.length;

    /* strongest / weakest weekday by RATE, so the number and the highlight agree */
    var seenDows = [];
    for (var i = 0; i < 7; i++) if (s.dowSeen[i]) seenDows.push(i);
    var dowRate = s.byDow.map(function (v, k) { return s.dowSeen[k] ? v / s.dowSeen[k] : 0; });
    var hiD = seenDows.length ? seenDows[0] : 0, loD = hiD;
    seenDows.forEach(function (k) {
      if (dowRate[k] > dowRate[hiD]) hiD = k;
      if (dowRate[k] < dowRate[loD]) loD = k;
    });
    var hiPct = pc(s.byDow[hiD], s.dowSeen[hiD]), loPct = pc(s.byDow[loD], s.dowSeen[loD]);
    var wkEnd = s.byDow[0] + s.byDow[6];
    var wkDay = s.total - wkEnd;
    var seenLo = 0, seenHi = 0;
    seenDows.forEach(function (k) {
      if (!seenLo || s.dowSeen[k] < seenLo) seenLo = s.dowSeen[k];
      if (s.dowSeen[k] > seenHi) seenHi = s.dowSeen[k];
    });

    /* months. A month is whole only when the record covers every day it holds,
       and the month you are standing in is never whole. */
    var lastMi = s.months.length - 1;
    function isWholeM(m, idx) { return idx !== lastMi && m.all >= dim(m.date); }
    var fullM = s.months.filter(isWholeM);
    var shownM = s.months.slice(-12);
    var hiddenM = s.months.length - shownM.length;
    var bestM = null, worstM = null;
    fullM.forEach(function (m) {
      if (!bestM || pc(m.on, m.all) > pc(bestM.on, bestM.all)) bestM = m;
      if (!worstM || pc(m.on, m.all) < pc(worstM.on, worstM.all)) worstM = m;
    });

    var tm = s.thisMonth, lm = s.lastMonth;
    var tmName = tm && tm.date ? MONF[tm.date.getMonth()] : 'This month';
    var lmName = lm && lm.date ? MONF[lm.date.getMonth()] : '';
    var lmWhole = !!(lm && lm.date && lm.all >= dim(lm.date));

    var perWeekMins = s.N ? Math.round(s.minutes / (s.N / 7)) : 0;
    var perWeekVal = perWeekMins >= 120 ? (perWeekMins / 60).toFixed(1) : perWeekMins;
    var perWeekUnit = perWeekMins >= 120 ? 'hours' : 'minutes';
    var avgGap = s.gaps ? Math.round(10 * s.missed / s.gaps) / 10 : 0;
    var missPct = pc(s.missed, s.N);

    /* ---------- copy, written once so the sections stay clean ---------- */
    var microLine = !s.total
      ? 'One dot lands for every day you show up. The first one is still ahead of you.'
      : (leadIsTotal
          ? 'One dot for every day you showed up, oldest at the center. It starts ' + dShort(s.firstOn) + '.'
          : 'One dot for every day you showed up. ' + s.total + ' of them so far, starting ' + dShort(s.firstOn) + '.')
        + (s.total > 1 ? ' The bright one on the outside is the most recent.' : '');

    var todaySay = todayOn
      ? 'Today is marked. ' + (s.current >= s.best
          ? 'That is ' + s.current + ' ' + s1(s.current, 'day', 'days') + ' in a row, the longest run you have put together.'
          : 'That is ' + s.current + ' ' + s1(s.current, 'day', 'days') + ' in a row. Your longest is ' + s.best + '.')
      : 'Today is not marked yet. ' + (s.lastOn
          ? 'Your last day was ' + dShort(s.lastOn) + ', and your longest run is ' + s.best + ' days.'
          : 'Nothing on the record yet.');

    var latelySay = !has60
      ? 'The record is ' + s.N + ' days long. There is no earlier 30 day window to measure this against yet.'
      : s.delta30 > 0
        ? 'You showed up ' + s.delta30 + ' more ' + s1(s.delta30, 'day', 'days') + ' in the last 30 than in the 30 before it.'
        : s.delta30 < 0
          ? 'You showed up ' + Math.abs(s.delta30) + ' fewer ' + s1(Math.abs(s.delta30), 'day', 'days') + ' in the last 30 than in the 30 before it.'
          : 'The last 30 days match the 30 before them exactly.';

    var calSay = !emptyDays
      ? 'None of these ' + s.N + ' squares are empty.'
      : emptyDays + ' of these ' + s.N + ' squares are empty.'
        + (s.supDays ? ' Another ' + s.supDays + ' ' + s1(s.supDays, 'is', 'are') + ' faint: you did something those days, but not the main move.' : '');

    var thisMonthSay = tmName + ' is running at ' + pc(tm.on, tm.all) + '% so far.'
      + (lmWhole
          ? ' ' + lmName + ' finished at ' + pc(lm.on, lm.all) + '%.'
          : (lm && lm.date)
            ? ' ' + lmName + ' only has ' + lm.all + ' days on the record, so there is nothing whole to hold it against.'
            : ' There is no earlier month to hold it against yet.');

    var weekSay = !fullWeeks.length
      ? 'No whole week has closed yet. Every bar here covers part of a week.'
      : cleanWeeks
        ? 'Of your ' + fullWeeks.length + ' whole ' + s1(fullWeeks.length, 'week', 'weeks') + ', ' + cleanWeeks + ' went 7 for 7.'
        : 'None of your ' + fullWeeks.length + ' whole ' + s1(fullWeeks.length, 'week', 'weeks') + ' came in clean. The best was ' + bestWeek.on + ' of 7 days.';

    var weekCap = 'Each bar is one week, the share of that week you showed up. Weeks run Monday to Sunday, and a part week at either end is drawn fainter.'
      + (hiddenWeeks ? ' The last ' + shownWeeks.length + ' weeks are shown, ' + hiddenWeeks + ' earlier ' + s1(hiddenWeeks, 'week is', 'weeks are') + ' off the left.' : '');

    var rhythmSay = (hiD === loD || hiPct === loPct)
      ? 'Your week is flat. No day carries more of the work than any other.'
      : WDF[hiD] + ' is your strongest day at ' + hiPct + '%. ' + WDF[loD] + ' is your weakest at ' + loPct + '%, a ' + (hiPct - loPct) + ' point spread across the week.';

    var unseenDows = 7 - seenDows.length;
    var rhythmCap = 'The number on each bar is how often you showed up when that weekday came around.'
      + (unseenDows ? ' ' + unseenDows + ' ' + s1(unseenDows, 'weekday has', 'weekdays have') + ' not come around yet, drawn flat.' : '')
      + (s.N < 63 && seenHi
          ? ' Each weekday has only come around ' + (seenLo === seenHi
              ? (seenLo === 1 ? 'once' : seenLo + ' times')
              : seenLo + ' to ' + seenHi + ' times')
            + ' so far, so these numbers still move a lot.'
          : '');

    var monthSay = !fullM.length
      ? 'No whole month has closed yet. Every column here covers part of a month.'
      : (fullM.length === 1)
        ? MONF[bestM.date.getMonth()] + ' is the only whole month on the record. You showed up for ' + pc(bestM.on, bestM.all) + '% of it.'
        : MONF[bestM.date.getMonth()] + ' was your strongest whole month at ' + pc(bestM.on, bestM.all) + '%. ' + MONF[worstM.date.getMonth()] + ' was your weakest at ' + pc(worstM.on, worstM.all) + '%.';

    var monthCap = 'Share of each month you showed up. A month that is only part tracked, and the one you are standing in, are drawn fainter.'
      + (hiddenM ? ' The last ' + shownM.length + ' months are shown, ' + hiddenM + ' earlier ' + s1(hiddenM, 'month is', 'months are') + ' off the left.' : '');

    var supSay = s.supDays
      ? 'On ' + s.supDays + ' ' + s1(s.supDays, 'day', 'days') + ' you did not make the main move but still showed up for something. Those are the faint squares in the calendar above.'
      : 'Every day you opened Memento, you made the main move.';

    var hardSay = s.missed
      ? 'You have missed ' + s.missed + ' of ' + s.N + ' days, ' + missPct + '% of the record. The longest you were gone was ' + s.longestGap + ' ' + s1(s.longestGap, 'day', 'days') + ', and you came back ' + s.comebacks + ' ' + s1(s.comebacks, 'time', 'times') + '.'
      : 'You have not missed a day since you started. ' + s.N + ' for ' + s.N + '.';

    /* ---------- weekday chart, rate driven ----------
       The kit sizes its bars by raw count while printing a percentage, so on a
       short record the highlighted bar can show a lower number than the one
       next to it. This one sizes and highlights on the same figure, and the bar
       height resolves against a fixed track so it can never grow past it. */
    function dowChart() {
      var cells = '';
      for (var k = 0; k < 7; k++) {
        if (!s.dowSeen[k]) {
          /* this weekday has not come around yet. A zero bar would read as a
             failure, so it gets a flat line and no number. */
          cells += '<div class="v01-dow__c"><div class="v01-dow__t"><div class="v01-dow__b v01-dow__b--none"></div></div>'
            + '<span>' + WD[k] + '</span></div>';
          continue;
        }
        var r = dowRate[k], p = pc(s.byDow[k], s.dowSeen[k]);
        cells += '<div class="v01-dow__c"><div class="v01-dow__t">'
          + '<div class="v01-dow__b' + (k === hiD && hiPct > loPct ? ' top' : '') + '" style="height:' + (18 + r * 82).toFixed(1) + '%"><u>' + p + '</u></div>'
          + '</div><span>' + WD[k] + '</span></div>';
      }
      return '<div class="v01-dow">' + cells + '</div>';
    }

    /* ---------- week chart ---------- */
    function weekChart() {
      var bars = shownWeeks.map(function (w) {
        var p = pc(w.on, w.all);
        return '<i class="' + (w.all === 7 ? '' : 'part') + '" style="height:' + Math.max(3, p) + '%"></i>';
      }).join('');
      var cap = shownWeeks.length < 10 ? ' style="max-width:' + (shownWeeks.length * 26) + 'px"' : '';
      return '<div class="v01-wk"' + cap + '>' + bars + '</div>';
    }

    /* ---------- month chart ----------
       The kit prints every column the same weight, so a part month reads as a
       bad month. Here a part month is drawn fainter and says so. */
    function moChart() {
      var cells = shownM.map(function (m) {
        var idx = s.months.indexOf(m);
        var p = pc(m.on, m.all);
        return '<div class="v01-mo__c"><div class="v01-mo__t">'
          + '<i class="' + (isWholeM(m, idx) ? '' : 'part') + '" style="height:' + Math.max(3, p) + '%"></i>'
          + '</div><b>' + p + '</b><span>' + m.label + '</span></div>';
      }).join('');
      var cap = shownM.length < 5 ? ' style="max-width:' + (shownM.length * 58) + 'px"' : '';
      return '<div class="v01-mo"' + cap + '>' + cells + '</div>';
    }

    /* ---------- scoped styles. fill and inset highlight, never a border ---------- */
    var CSS = '<style>'
      + '.v01-hero{text-align:center;margin-top:2px}'
      + '.v01-ctx{display:flex;align-items:baseline;justify-content:center;gap:6px;margin-top:14px}'
      + '.v01-ctx b{font-size:15px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--text-hi)}'
      + '.v01-ctx span{font-size:13px;color:var(--text-mid)}'
      + '.v01-now{display:grid;grid-template-columns:1fr 1fr;border-radius:14px;overflow:hidden;'
      +   'background:var(--fill-1);box-shadow:var(--inset);'
      +   '-webkit-backdrop-filter:blur(26px) saturate(1.4);backdrop-filter:blur(26px) saturate(1.4)}'
      + '.v01-now__c{padding:14px 15px 13px;min-width:0}'
      /* a hairline divider between the two cells, not a border on the box */
      + '.v01-now__c+.v01-now__c{box-shadow:inset 1px 0 0 var(--hairline)}'
      + '.v01-now__c b{display:block;font-size:26px;font-weight:750;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums;color:var(--text-hi)}'
      + '.v01-now__c span{display:block;font-size:11.5px;line-height:1.35;color:var(--text-mid);margin-top:6px}'
      + '.v01-say{font-size:13px;line-height:1.55;color:var(--text-mid);margin-top:12px}'
      + '.v01-say b{color:var(--text-hi);font-weight:650}'
      + '.v01-cap{font-size:11.5px;line-height:1.5;color:var(--text-mid);margin-top:9px}'
      + '.v01-axis{display:flex;justify-content:space-between;margin-top:6px}'
      + '.v01-axis i{font-style:normal;font-size:10.5px;color:var(--text-lo)}'
      + '.v01-leg{display:flex;flex-wrap:wrap;gap:7px 16px;margin-top:12px}'
      + '.v01-leg span{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--text-mid)}'
      + '.v01-leg i{width:10px;height:10px;border-radius:2.5px;display:block;flex:0 0 auto}'
      /* the swatches carry the exact calendar values so the legend teaches the real thing */
      + '.v01-leg i.on{background:rgba(var(--accent-rgb),.62)}'
      + '.v01-leg i.sup{background:rgba(var(--accent-rgb),.22)}'
      + '.v01-leg i.off{background:rgba(var(--ink),.055)}'
      + '.v01-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}'
      + '.v01-dow__c{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}'
      + '.v01-dow__t{width:100%;height:86px;display:flex;align-items:flex-end}'
      + '.v01-dow__b{width:100%;border-radius:5px 5px 3px 3px;background:rgba(var(--accent-rgb),.24);'
      +   'display:flex;align-items:flex-start;justify-content:center}'
      + '.v01-dow__b.top{background:rgba(var(--accent-rgb),.72)}'
      + '.v01-dow__b--none{background:rgba(var(--ink),.09);height:4px}'
      + '.v01-dow__b u{text-decoration:none;font-size:9.5px;font-weight:700;margin-top:4px;'
      +   'color:rgba(var(--ink),.88);font-variant-numeric:tabular-nums}'
      + '.v01-dow__b.top u{color:#06140a}'
      + '.v01-dow__c span{font-size:10.5px;color:var(--text-lo)}'
      + '.v01-wk{display:flex;align-items:flex-end;gap:3px;height:62px}'
      + '.v01-wk i{flex:1;min-width:0;display:block;border-radius:3px 3px 2px 2px;background:rgba(var(--accent-rgb),.40)}'
      + '.v01-wk i.part{background:rgba(var(--accent-rgb),.17)}'
      + '.v01-mo{display:flex;gap:5px;align-items:flex-end}'
      + '.v01-mo__c{flex:1;min-width:0;text-align:center}'
      + '.v01-mo__t{height:58px;display:flex;align-items:flex-end}'
      + '.v01-mo__t i{width:100%;border-radius:4px 4px 2px 2px;background:rgba(var(--accent-rgb),.40)}'
      + '.v01-mo__t i.part{background:rgba(var(--accent-rgb),.17)}'
      + '.v01-mo__c b{display:block;font-size:10.5px;font-weight:700;margin-top:5px;font-variant-numeric:tabular-nums;color:var(--text-mid)}'
      + '.v01-mo__c span{display:block;font-size:10px;color:var(--text-lo);margin-top:1px}'
      + '.v01-rule{height:1px;background:var(--hairline);margin-top:28px}'
      + '</style>';

    /* ---------- the page ---------- */
    var H = [];
    H.push(CSS);

    H.push('<div class="cx__top"><div class="cx__title">Consistency</div>'
      + '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>');

    /* 1. the bloom, the universal record */
    H.push('<div class="ck-bloomwrap">' + K.bloomSVG(s.total, { size: bloomSize, animate: true }) + '</div>');
    H.push('<div class="v01-hero">'
      + '<div class="ck-n ' + leadCls + '">' + sh.lead + '</div>'
      + '<div class="ck-u">' + sh.sub + '</div>'
      + '</div>');
    H.push('<div class="v01-ctx"><b>' + sh.ctx.v + '</b><span>' + sh.ctx.l + '</span></div>');
    H.push('<div class="ck-micro">' + microLine + '</div>');

    /* 2. where you are today */
    H.push('<h2>Where you are today</h2>');
    /* the run itself lives in the sentence below, so these two cells stay new
       information instead of repeating the hero and the tiles underneath */
    H.push('<div class="v01-now">'
      + '<div class="v01-now__c"><b>' + thisWeek.on + '</b><span>of ' + thisWeek.all + ' ' + s1(thisWeek.all, 'day', 'days') + ' so far this week</span></div>'
      + '<div class="v01-now__c"><b>' + tm.on + '</b><span>of ' + tm.all + ' ' + s1(tm.all, 'day', 'days') + ' so far in ' + tmName + '</span></div>'
      + '</div>');
    H.push('<div class="v01-cap">Weeks run Monday to Sunday. Both counts stop at today.</div>');
    H.push('<div class="v01-say">' + todaySay + '</div>');

    /* 3. the record */
    H.push('<h2>The record</h2>');
    H.push('<div class="ck-tiles">'
      + K.tile(s.total, 'days you showed up', 'out of ' + s.N)
      + K.tile(s.best, 'longest run', 'days in a row')
      + K.tile(s.rate + '%', 'of every day', 'since day one')
      + '</div>');
    H.push('<div class="ck-rows" style="margin-top:8px">'
      + '<div class="ck-row"><span>Days on the record</span><b>' + K.n(s.N) + '</b></div>'
      + '<div class="ck-row"><span>Whole weeks closed</span><b>' + fullWeeks.length + '</b></div>'
      + '<div class="ck-row"><span>Whole months closed</span><b>' + fullM.length + '</b></div>'
      + '<div class="ck-row"><span>The record starts</span><b>' + dLong(startDate) + '</b></div>'
      + '<div class="ck-row"><span>First day you showed up</span><b>' + dLong(s.firstOn) + '</b></div>'
      + '<div class="ck-row"><span>Most recent day you showed up</span><b>' + dLong(s.lastOn) + '</b></div>'
      + '</div>');

    /* 4. lately */
    H.push('<h2>Lately</h2>');
    H.push(K.sparkline(log, 60, 330, 44));
    H.push('<div class="v01-axis"><i>' + sparkSpan + ' days ago</i><i>today</i></div>');
    H.push('<div class="v01-cap">The line is your rolling seven day rate: how much of the week ending on each day you showed up. '
      + 'The first few days on the left have less than a week behind them, so that end swings harder.</div>');
    H.push('<div class="ck-tiles ck-tiles--2" style="margin-top:12px">'
      + K.tile(has60 ? s.r30 + K.delta(s.delta30) : s.r30, 'days in the last ' + win30,
               has60 ? 'was ' + s.rPrev30 + ' the 30 before' : 'the whole record is ' + s.N + ' days')
      + K.tile(recentPerWeek.toFixed(1), 'days a week, last ' + recentWin + ' days', 'all time: ' + s.perWeek.toFixed(1))
      + '</div>');
    H.push('<div class="v01-say">' + latelySay + '</div>');

    /* 5. every day since day one */
    H.push('<h2>Every day since day one</h2>');
    H.push('<div style="max-width:' + calMax + 'px">' + K.calendarHTML(log, { cols: calCols }) + '</div>');
    H.push('<div class="v01-leg">'
      + '<span><i class="on"></i>showed up</span>'
      + '<span><i class="sup"></i>something, not the main move</span>'
      + '<span><i class="off"></i>missed</span>'
      + '</div>');
    H.push('<div class="v01-cap">Oldest square at the top left, today at the end. One square is one day and nothing is skipped.</div>');
    H.push('<div class="v01-say">' + calSay + '</div>');

    /* 6. this month */
    H.push('<h2>This month</h2>');
    H.push(K.monthGrid(log));
    H.push('<div class="v01-cap">Only the days on the record are filled in. The blank cells are days before you started and days still ahead.</div>');
    H.push('<div class="ck-rows" style="margin-top:12px">'
      + '<div class="ck-row"><span>' + tmName + ' so far</span><b>' + tm.on + '<em>of ' + tm.all + ' days</em></b></div>'
      + (lm && lm.date ? '<div class="ck-row"><span>' + lmName + (lmWhole ? '' : ', part tracked') + '</span><b>' + lm.on + '<em>of ' + lm.all + ' days</em></b></div>' : '')
      + '</div>');
    H.push('<div class="v01-say">' + thisMonthSay + '</div>');

    /* 7. week by week */
    H.push('<h2>Week by week</h2>');
    H.push(weekChart());
    H.push('<div class="v01-cap">' + weekCap + '</div>');
    H.push('<div class="ck-rows" style="margin-top:10px">'
      + '<div class="ck-row"><span>Whole weeks with no miss</span><b>' + cleanWeeks + '<em>of ' + fullWeeks.length + '</em></b></div>'
      + (bestWeek ? '<div class="ck-row"><span>Best whole week</span><b>' + bestWeek.on + '<em>of 7 days</em></b></div>' : '')
      + (fullWeeks.length > 1 ? '<div class="ck-row"><span>Weakest whole week</span><b>' + worstWeek.on + '<em>of 7 days</em></b></div>' : '')
      + '<div class="ck-row"><span>Days a week, all time</span><b>' + s.perWeek.toFixed(1) + '</b></div>'
      + '</div>');
    H.push('<div class="v01-say">' + weekSay + '</div>');

    /* 8. your rhythm */
    H.push('<h2>Your rhythm</h2>');
    H.push(dowChart());
    H.push('<div class="v01-cap">' + rhythmCap + '</div>');
    H.push('<div class="ck-rows" style="margin-top:10px">'
      + '<div class="ck-row"><span>On weekdays</span><b>' + wkDay + '<em>days</em></b></div>'
      + '<div class="ck-row"><span>On weekends</span><b>' + wkEnd + '<em>days</em></b></div>'
      + '</div>');
    H.push('<div class="v01-say">' + rhythmSay + '</div>');

    /* 9. month by month */
    H.push('<h2>Month by month</h2>');
    H.push(moChart());
    H.push('<div class="v01-cap">' + monthCap + '</div>');
    H.push('<div class="v01-say">' + monthSay + '</div>');

    /* 10. time on it */
    H.push('<h2>Time on it</h2>');
    H.push('<div class="ck-rows">'
      + '<div class="ck-row"><span>Time logged</span><b>' + K.n(s.hours) + '<em>hours</em></b></div>'
      + '<div class="ck-row"><span>An average day you showed up</span><b>' + s.avgSession + '<em>minutes</em></b></div>'
      + '<div class="ck-row"><span>Every week, on average</span><b>' + perWeekVal + '<em>' + perWeekUnit + '</em></b></div>'
      + '<div class="ck-row"><span>Minutes, all in</span><b>' + K.n(s.minutes) + '</b></div>'
      + '</div>');
    H.push('<div class="v01-cap">Time is only counted on days you showed up. A missed day adds nothing here.</div>');

    /* 11. life around the work */
    H.push('<h2>Life around the work</h2>');
    H.push(K.supportRows(s));
    H.push('<div class="v01-cap">These count entries, not days. A day can hold more than one.</div>');
    H.push('<div class="v01-say">' + supSay + '</div>');

    /* 12. the hard part */
    H.push('<div class="v01-rule"></div>');
    H.push('<h2>The hard part</h2>');
    H.push('<div class="ck-tiles ck-tiles--2">'
      + K.tile(s.missed, 'days missed', missPct + '% of ' + s.N)
      + K.tile(s.longestGap, 'longest gap', 'days away')
      + K.tile(avgGap, 'days in an average gap', s.gaps ? 'across ' + s.gaps + ' ' + s1(s.gaps, 'gap', 'gaps') : 'no gaps yet')
      + K.tile(s.comebacks, 'times you came back', 'after a day off')
      + '</div>');
    H.push('<div class="v01-say">' + hardSay + '</div>');

    H.push('<div class="cx__foot">Every number here is counted from your own log.<br>A missed day stays missed.</div>');

    return '<div class="cx">' + H.join('') + '</div>';
  }
};
