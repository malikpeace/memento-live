/* v06, THE REPORT.
   The consistency page read as an analytics report: bloom hero, then titled
   sections that each pair one chart with one plain sentence stating what that
   chart says about this person. Every sentence is computed from the log.
   Nothing is invented, nothing is softened. */
window.CVAR = window.CVAR || {};
window.CVAR['v06'] = {
  name: 'The report',
  note: 'A report you would actually read: bloom hero, then titled sections that each pair one chart with one computed sentence saying what that chart means. Data plus interpretation, never flattery.',
  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;
    var N = log.length;

    /* ---------------- derived facts (all real, all from the log) ---------------- */
    function pc(a, b) { return b ? Math.round(100 * a / b) : 0; }
    /* a record that crosses a new year has two Augusts in it, so every date it
       prints carries the year or it points at the wrong day */
    function md(d) { return K.MON[d.getMonth()] + ' ' + d.getDate() + (spansYears ? ', ' + d.getFullYear() : ''); }
    function mdf(d) { return K.MONF[d.getMonth()] + ' ' + d.getDate() + (spansYears ? ', ' + d.getFullYear() : ''); }
    function plur(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
    /* the same, for values that arrive already formatted (1, 1.6, 12) */
    function un(v, w) { return v + ' ' + w + (String(v) === '1' ? '' : 's'); }
    function isare(n) { return n === 1 ? ' is ' : ' are '; }
    /* the kit's support units are plural nouns, so one of anything needs the singular */
    function supUn(k, v) {
      var u = K.SUPUNIT[k];
      return v + ' ' + (v === 1 ? (u === 'entries' ? 'entry' : u.replace(/s$/, '')) : u);
    }
    function dir(a, b) { return a > b ? 'above' : a < b ? 'below' : 'level with'; }

    var first = log[0].date, last = log[N - 1].date;
    var spansYears = first.getFullYear() !== last.getFullYear();
    function moName(m) { return K.MONF[m.date.getMonth()] + (spansYears ? ' ' + m.date.getFullYear() : ''); }

    /* longest gap, and when it happened */
    var gRun = 0, gStart = 0, gBest = 0, gBestStart = -1;
    log.forEach(function (d, i) {
      if (!d.on) { if (gRun === 0) gStart = i; gRun++; if (gRun > gBest) { gBest = gRun; gBestStart = gStart; } }
      else gRun = 0;
    });
    var gapWhen = gBestStart >= 0 ? md(log[gBestStart].date) : '';

    /* best run, and whether it is the one running now */
    var rRun = 0, rBest = 0, rBestEnd = -1;
    log.forEach(function (d, i) {
      if (d.on) { rRun++; if (rRun > rBest) { rBest = rRun; rBestEnd = i; } } else rRun = 0;
    });
    var bestIsNow = rBestEnd === N - 1;
    var bestEndTxt = rBest === 0 ? '' : bestIsNow ? 'the one you are on' : 'ended ' + md(log[rBestEnd].date);
    var curStart = s.current > 0 ? log[N - s.current].date : null;

    /* the two halves of the record */
    var half = Math.floor(N / 2);
    var h1 = log.slice(0, half), h2 = log.slice(half);
    var h1on = h1.filter(function (d) { return d.on; }).length;
    var h2on = h2.filter(function (d) { return d.on; }).length;
    var h1r = pc(h1on, h1.length), h2r = pc(h2on, h2.length);
    var swing = h2r - h1r;

    /* strongest and weakest month, judged only on the months the chart draws */
    var moShown = s.months.slice(-12);
    var cand = moShown.filter(function (m) { return m.all >= 10; });
    var mBest = null, mWorst = null;
    cand.forEach(function (m) {
      var p = pc(m.on, m.all);
      if (!mBest || p > pc(mBest.on, mBest.all)) mBest = m;
      if (!mWorst || p < pc(mWorst.on, mWorst.all)) mWorst = m;
    });
    var mBestP = mBest ? pc(mBest.on, mBest.all) : 0;
    var mWorstP = mWorst ? pc(mWorst.on, mWorst.all) : 0;
    var firstMoPartial = moShown.length > 0 && moShown[0] === s.months[0] && first.getDate() > 1;

    /* the month in progress, and the one before it */
    var tmName = K.MONF[s.thisMonth.date ? s.thisMonth.date.getMonth() : last.getMonth()];
    var lmName = s.lastMonth.date ? K.MONF[s.lastMonth.date.getMonth()] : '';
    var tmP = pc(s.thisMonth.on, s.thisMonth.all), lmP = pc(s.lastMonth.on, s.lastMonth.all);
    /* the month before this one is itself a part month when the record began inside it */
    var lmPartial = !!lmName && s.months.length > 1 && s.months[0] === s.lastMonth && first.getDate() > 1;

    /* weekday spread, ranked by RATE so the sentence matches the numbers on the bars */
    var dowRate = s.byDow.map(function (v, i) { return s.dowSeen[i] ? pc(v, s.dowSeen[i]) : null; });
    var bd = -1, wd = -1;
    dowRate.forEach(function (p, i) {
      if (p === null) return;
      if (bd < 0 || p > dowRate[bd]) bd = i;
      if (wd < 0 || p < dowRate[wd]) wd = i;
    });
    var bdP = bd >= 0 ? dowRate[bd] : 0, wdP = wd >= 0 ? dowRate[wd] : 0;
    var dowSplit = bd >= 0 && wd >= 0 && bdP > wdP;
    var minSeen = Math.min.apply(null, s.dowSeen), maxSeen = Math.max.apply(null, s.dowSeen);

    /* weeks. The kit starts a new bucket every Monday, so the record's first and
       last weeks are part weeks unless it happens to begin on one and end on a Sunday. */
    var wks = s.weeks.slice(-12);
    var wksTxt = wks.length === 1 ? 'one week' : 'the last ' + wks.length + ' weeks';
    var partWk = [];
    if (log[0].date.getDay() !== 1) partWk.push('first');
    if (last.getDay() !== 0) partWk.push('last');
    var last4 = s.last4Rate.toFixed(1).replace(/\.0$/, '');
    var nKw = Math.min(4, s.weeks.length);
    var lastKw = nKw === 1 ? 'week' : nKw + ' weeks';

    /* time */
    var l30 = log.slice(-30);
    var m30 = l30.reduce(function (a, d) { return a + d.minutes; }, 0);
    var h30 = Math.round(m30 / 60);
    var minWk = Math.round(s.minutes / (N / 7));
    var perWkTxt = minWk >= 100 ? (minWk / 60).toFixed(1).replace(/\.0$/, '') + ' hours' : minWk + ' minutes';
    var mins = log.filter(function (d) { return d.on && d.minutes > 0; }).map(function (d) { return d.minutes; });
    var longSes = mins.length ? Math.max.apply(null, mins) : 0;
    var shortSes = mins.length ? Math.min.apply(null, mins) : 0;
    var overHour = mins.filter(function (m) { return m >= 60; }).length;

    /* support activities, compared on DAYS so unlike units are never ranked against each other */
    var supDayCount = {};
    Object.keys(K.SUPNAME).forEach(function (k) { supDayCount[k] = 0; });
    log.forEach(function (d) {
      Object.keys(d.sup).forEach(function (k) { if (supDayCount[k] !== undefined) supDayCount[k]++; });
    });
    var sk = Object.keys(K.SUPNAME), sBest = sk[0], sWorst = sk[0];
    sk.forEach(function (k) {
      if (supDayCount[k] > supDayCount[sBest]) sBest = k;
      if (supDayCount[k] < supDayCount[sWorst]) sWorst = k;
    });
    var supSplit = supDayCount[sBest] > supDayCount[sWorst];
    /* days first, and the running total only when it can differ from the days */
    function supPhrase(k) {
      return b(plur(supDayCount[k], 'day')) +
        (s.sup[k] !== supDayCount[k] ? ', ' + b(supUn(k, s.sup[k])) + ' in total' : '');
    }

    var win30 = Math.min(30, N), hasPrev = N >= 60, wholeIs30 = win30 >= N;
    var r30p = pc(s.r30, win30);
    var p30p = pc(s.rPrev30, Math.min(30, Math.max(0, N - 30)));
    var emptyDays = s.missed - s.supDays;

    /* ---------------- page furniture ---------------- */
    function sec(title, body) {
      return '<section class="v06-sec"><h2 class="v06-t">' + title + '</h2>' + body + '</section>';
    }
    function read(html) { return '<p class="v06-read">' + html + '</p>'; }
    function cap(html) { return '<p class="v06-cap">' + html + '</p>'; }
    function b(v) { return '<b>' + v + '</b>'; }
    function cmp(rows) {
      var mx = Math.max.apply(null, rows.map(function (r) { return r[1]; })) || 1;
      return '<div class="v06-cmp">' + rows.map(function (r) {
        return '<div class="v06-cmp__r"><span class="v06-cmp__l">' + r[0] + '</span>' +
          '<span class="v06-cmp__t"><i style="width:' + Math.max(2, Math.round(100 * r[1] / mx)) + '%"' +
          (r[2] ? ' class="now"' : '') + '></i></span>' +
          '<span class="v06-cmp__v">' + r[1] + '%</span></div>';
      }).join('') + '</div>';
    }

    /* ---------------- scoped styles ----------------
       No borders on any box: fill plus the kit inset highlight. The only 1px
       lines on the page are hairline dividers between rows and sections. */
    var css = '<style>' +
      '.v06-sec .ck-spark{overflow:visible}' +
      '.v06-lede{font-size:13px;line-height:1.55;color:var(--text-mid);text-align:center;margin:12px 22px 0}' +
      '.v06-sec{margin-top:24px;padding-top:22px;border-top:1px solid var(--hairline)}' +
      /* specificity has to beat the kit .cx h2:first-of-type, or the FIRST section
         title alone sits 20px lower than every other one */
      '.v06-sec h2.v06-t{margin:0 0 13px;font-size:15px;font-weight:650;letter-spacing:-.02em;color:var(--text-hi)}' +
      '.v06-read{font-size:13px;line-height:1.6;color:var(--text-mid);margin:13px 0 0}' +
      '.v06-read b{color:var(--text-hi);font-weight:650;font-variant-numeric:tabular-nums}' +
      '.v06-cap{font-size:11px;line-height:1.5;color:var(--text-lo);margin:8px 0 0}' +
      '.v06-lg{display:flex;flex-wrap:wrap;gap:14px;margin-top:11px}' +
      '.v06-lg span{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-mid)}' +
      '.v06-lg i{width:9px;height:9px;border-radius:2.5px;display:block;flex:0 0 auto}' +
      '.v06-lg i.on{background:rgba(var(--accent-rgb),.62)}' +
      '.v06-lg i.sup{background:rgba(var(--accent-rgb),.22)}' +
      '.v06-lg i.off{background:rgba(var(--ink),.055)}' +
      '.v06-cmp{display:flex;flex-direction:column;gap:11px}' +
      '.v06-cmp__r{display:flex;align-items:center;gap:11px}' +
      '.v06-cmp__l{font-size:12.5px;color:var(--text-mid);width:104px;flex:0 0 auto}' +
      '.v06-cmp__t{flex:1;min-width:0;height:8px;border-radius:4px;background:rgba(var(--ink),.07);overflow:hidden}' +
      '.v06-cmp__t i{display:block;height:100%;border-radius:4px;background:rgba(var(--accent-rgb),.34)}' +
      '.v06-cmp__t i.now{background:rgba(var(--accent-rgb),.66)}' +
      '.v06-cmp__v{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;width:38px;text-align:right;flex:0 0 auto}' +
      '.v06-wk{display:flex;gap:5px;align-items:flex-end}' +
      '.v06-wk__c{flex:1;min-width:0;text-align:center}' +
      '.v06-wk__t{height:62px;display:flex;align-items:flex-end}' +
      '.v06-wk__t i{width:100%;border-radius:4px 4px 2px 2px;background:rgba(var(--accent-rgb),.30)}' +
      '.v06-wk__t i.now{background:rgba(var(--accent-rgb),.66)}' +
      '.v06-wk__c span{display:block;font-size:9.5px;color:var(--text-lo);margin-top:6px;font-variant-numeric:tabular-nums}' +
      '.v06-sum p{margin:0;font-size:13px;line-height:1.6;color:var(--text-mid)}' +
      '.v06-sum p + p{margin-top:9px;padding-top:9px;border-top:1px solid var(--hairline)}' +
      '.v06-sum b{color:var(--text-hi);font-weight:650;font-variant-numeric:tabular-nums}' +
      '</style>';

    /* ---------------- hero ---------------- */
    var head =
      '<div class="cx__top"><div class="cx__title">Consistency</div>' +
      '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg></div></div>' +
      '<div class="ck-bloomwrap">' + K.bloomSVG(s.total, { size: 300, animate: true }) + '</div>' +
      '<div style="text-align:center;margin-top:10px">' +
        '<div class="ck-n ck-n--hero">' + K.n(s.total) + '</div>' +
        '<div class="ck-u">days shown up, out of <b>' + K.n(N) + '</b></div>' +
      '</div>' +
      '<p class="v06-lede">One dot for every day you showed up, from ' + mdf(first) +
        ' to ' + mdf(last) + '. The days you missed are counted below.</p>' +
      '<div class="ck-tiles ck-tiles--2" style="margin-top:16px">' +
        K.tile(sh.lead, sh.sub) +
        K.tile(sh.ctx.v, sh.ctx.l) +
      '</div>';

    /* ---------------- 01 the headline ---------------- */
    var s1 =
      '<div class="ck-tiles">' +
        K.tile(s.total, s.total === 1 ? 'day shown up' : 'days shown up') +
        K.tile(s.rate + '%', 'of every day on record') +
        K.tile(s.current, 'current run', curStart ? 'since ' + md(curStart) : 'nothing running') +
      '</div>' +
      '<div class="ck-tiles ck-tiles--2" style="margin-top:8px">' +
        K.tile(s.best, 'longest run', bestEndTxt) +
        K.tile(s.missed, s.missed === 1 ? 'day missed' : 'days missed',
          s.gaps ? 'across ' + plur(s.gaps, 'stop') : 'no stops yet') +
      '</div>' +
      read('You have shown up on ' + b(s.total) + ' of ' + b(N) + ' days since ' + b(mdf(first)) +
        ', which is ' + b(s.rate + '%') + '. Your longest run is ' + b(plur(s.best, 'day')) +
        (rBest === 0 ? '.' : bestIsNow ? ', and it is the one you are on now.' :
          ', and it ended on ' + b(md(log[rBestEnd].date)) + '.'));

    /* ---------------- 02 the last 30 days ---------------- */
    var rows2 = wholeIs30 ? [['All ' + N + ' days', s.rate, true]] : [['Last 30 days', r30p, true]];
    if (hasPrev) rows2.push(['The 30 before', p30p, false]);
    if (!wholeIs30) rows2.push(['All ' + N + ' days', s.rate, false]);
    var s2 =
      K.sparkline(log, 60, 350, 48) +
      cap('Your seven day rate, rolling across the last ' + Math.min(60, N) +
        ' days. The earliest points have fewer than seven days behind them.') +
      '<div class="ck-tiles ck-tiles--2" style="margin-top:14px">' +
        K.tile(hasPrev ? s.r30 + K.delta(s.delta30) : s.r30, 'days in the last ' + win30,
          hasPrev ? 'the 30 before: ' + s.rPrev30 : 'the whole record so far') +
        K.tile(r30p + '%', 'rate over those days',
          wholeIs30 ? 'across every day on record' : dir(r30p, s.rate) + ' your all time rate') +
      '</div>' +
      '<div style="margin-top:14px">' + cmp(rows2) + '</div>' +
      read(wholeIs30
        ? 'The record is only ' + b(plur(N, 'day')) + ' old, so this window is all of it, running at ' +
          b(r30p + '%') + '. There is no earlier stretch to hold it against yet.'
        : 'The last ' + b('30 days') + ' ran at ' + b(r30p + '%') + ', ' + b(dir(r30p, s.rate)) +
          ' your all time rate of ' + b(s.rate + '%') + '. ' +
          (hasPrev
            ? 'Against the 30 days before them you are ' +
              b((s.delta30 > 0 ? '+' : '') + s.delta30 + (Math.abs(s.delta30) === 1 ? ' day' : ' days')) +
              (s.delta30 === 0 ? ', exactly level.' : '.')
            : 'There is no full 30 day window behind them to compare against yet.'));

    /* ---------------- 03 every day since day one ---------------- */
    var s3 =
      K.calendarHTML(log) +
      '<div class="v06-lg"><span><i class="on"></i>showed up</span>' +
        '<span><i class="sup"></i>something logged, no main move</span>' +
        '<span><i class="off"></i>missed</span></div>' +
      read('Every square is one day, oldest at the top left. ' + b(s.total) + ' of them' + isare(s.total) +
        'filled' +
        (s.supDays > 0
          ? ', ' + b(s.supDays) + isare(s.supDays) +
            'part filled where you logged something without making the main move'
          : '') +
        (emptyDays > 0 ? ', and ' + b(emptyDays) + isare(emptyDays) + 'empty. ' : ', and none are empty. ') +
        (s.longestGap > 0
          ? 'The biggest hole is ' + b(plur(s.longestGap, 'day')) + ' starting ' + b(gapWhen) + '.'
          : 'There is no hole in it yet.'));

    /* ---------------- 04 this month ---------------- */
    var s4 =
      K.monthGrid(log) +
      cap('Days before you started, and days still ahead, are left blank.') +
      read(b(tmName) + ' stands at ' + b(s.thisMonth.on) + ' of ' + b(s.thisMonth.all) +
        ' days so far, ' + b(tmP + '%') + '. ' +
        (lmName
          ? b(lmName) + (lmPartial ? ' ran at ' : ' finished at ') + b(lmP + '%') +
            (tmP === lmP
              ? ', so this month is running level with it.'
              : ', so this month is running ' +
                b(un(Math.abs(tmP - lmP), 'point') + ' ' + (tmP > lmP ? 'higher' : 'lower')) + '.') +
            (lmPartial ? ' You started partway into ' + lmName + ', so that figure covers ' +
              plur(s.lastMonth.all, 'day') + ' of it, not the whole month.' : '')
          : 'This is your first month on record, so there is nothing to compare it against yet.'));

    /* ---------------- 05 month by month ---------------- */
    var s5 =
      K.monthChart(s) +
      cap('The number under each bar is the share of that month\'s days you showed up.') +
      read(cand.length > 1 && mBestP > mWorstP
        ? b(moName(mBest)) + ' is your strongest month on the chart at ' + b(mBestP + '%') + '. ' +
          b(moName(mWorst)) + ' is your weakest at ' + b(mWorstP + '%') + ', a ' +
          b((mBestP - mWorstP) + ' point') + ' swing across your months.'
        : cand.length > 1
          ? 'Every month here with a real stretch of days sits at the same rate, ' + b(mBestP + '%') + '.'
          : cand.length === 1
            ? 'Only one month here holds a real stretch of days, so there is not enough yet to weigh one month against another.'
            : 'No month on record is complete enough yet to weigh against another one.') +
      (moShown.length > 1
        ? cap(firstMoPartial
          ? 'The first and last columns cover part of a month, not all of it.'
          : 'The last column is this month so far, not a finished month.')
        : '');

    /* ---------------- 06 your week ---------------- */
    var s6 =
      K.dowChart(s) +
      cap('Bar height is how many times you showed up on that weekday. The number on the bar is the share of them.') +
      read(!dowSplit
        ? 'Every weekday on record sits at the same rate, ' + b(bdP + '%') + ', so nothing in the week separates yet.'
        : b(K.WDF[bd]) + ' holds up best: you showed up on ' +
          b(s.byDow[bd] + ' of ' + s.dowSeen[bd]) + ' ' + K.WDF[bd] + 's, ' + b(bdP + '%') + '. ' +
          b(K.WDF[wd]) + ' is where it slips, ' + b(s.byDow[wd] + ' of ' + s.dowSeen[wd]) + ', ' +
          b(wdP + '%') + '. ' + b(un(bdP - wdP, 'point')) + ' separate the two ends of your week.') +
      (minSeen < 4 ? cap('Each weekday has only come around ' +
        (minSeen === maxSeen ? plur(minSeen, 'time') : minSeen + ' to ' + maxSeen + ' times') +
        ' so far, so this one is still thin.') : '');

    /* ---------------- 07 week by week ---------------- */
    var s7 =
      '<div class="v06-wk">' + wks.map(function (w, i) {
        var p = pc(w.on, w.all);
        return '<div class="v06-wk__c"><div class="v06-wk__t"><i' +
          (i === wks.length - 1 ? ' class="now"' : '') +
          ' style="height:' + Math.max(4, p) + '%"></i></div><span>' + w.start.getDate() + '</span></div>';
      }).join('') + '</div>' +
      cap('One bar per week, ' + wksTxt + ', labelled by the date each week starts. Bar height is the share of that week you showed up.') +
      read('You showed up ' + b(s.cadence) + ' days or more in ' + b(s.metWeeks) + ' of your ' +
        b(s.weeks.length) + ' weeks. The last ' + lastKw + ' averaged ' + b(un(last4, 'day')) + ' a week.') +
      (s.weeks.length > 1 && partWk.length
        ? cap('Your ' + partWk.join(' and ') + ' week' + (partWk.length > 1 ? 's hold' : ' holds') +
          ' fewer than seven days, so there was less room in ' + (partWk.length > 1 ? 'them' : 'it') +
          ' to hit the rate.')
        : '');

    /* ---------------- 08 where it broke ---------------- */
    var avgGap = s.gaps ? (s.missed / s.gaps).toFixed(1).replace(/\.0$/, '') : '0';
    var s8 =
      '<div class="ck-rows">' +
        '<div class="ck-row"><span>Times the run ended</span><b>' + s.gaps + '</b></div>' +
        '<div class="ck-row"><span>Times you started again</span><b>' + s.comebacks + '</b></div>' +
        '<div class="ck-row"><span>Longest stop</span><b>' + s.longestGap +
          '<em>' + (s.longestGap === 1 ? 'day' : 'days') + '</em></b></div>' +
        '<div class="ck-row"><span>Average stop</span><b>' + avgGap +
          '<em>' + (avgGap === '1' ? 'day' : 'days') + '</em></b></div>' +
        '<div class="ck-row"><span>Days missed in total</span><b>' + s.missed + '</b></div>' +
      '</div>' +
      read(s.gaps === 0
        ? 'Nothing has broken yet. There is no gap in the record to report.'
        : 'The run has ended ' + b(plur(s.gaps, 'time')) + ' and you have started again ' +
          b(plur(s.comebacks, 'time')) + '. Stops average ' + b(un(avgGap, 'day')) +
          '. The longest one started ' + b(gapWhen) + ' and held for ' + b(plur(s.longestGap, 'day')) + '.');

    /* ---------------- 09 then and now ---------------- */
    var s9 =
      cmp([
        ['First ' + h1.length + ' days', h1r, false],
        ['Last ' + h2.length + ' days', h2r, true]
      ]) +
      read('Split the record down the middle. The first ' + b(plur(h1.length, 'day')) + ' ran at ' +
        b(h1r + '%') + ' and the last ' + b(plur(h2.length, 'day')) + ' ran at ' + b(h2r + '%') + '. ' +
        (swing === 0
          ? 'The two halves are exactly level, so nothing has changed since you started.'
          : swing > 0
            ? 'You are ' + b(un(swing, 'point')) + ' better in the second half than the first.'
            : 'You are ' + b(un(Math.abs(swing), 'point')) + ' worse in the second half than the first.'));

    /* ---------------- 10 time on it ---------------- */
    var s10 =
      '<div class="ck-tiles">' +
        K.tile(s.hours + 'h', 'on the work', 'all ' + N + ' days') +
        K.tile(s.avgSession + 'm', 'average session') +
        K.tile(h30 + 'h', 'in the last ' + win30 + ' days') +
      '</div>' +
      '<div class="ck-rows" style="margin-top:12px">' +
        '<div class="ck-row"><span>Longest session</span><b>' + longSes + '<em>min</em></b></div>' +
        '<div class="ck-row"><span>Shortest session</span><b>' + shortSes + '<em>min</em></b></div>' +
        '<div class="ck-row"><span>Sessions of an hour or more</span><b>' + overHour + '</b></div>' +
      '</div>' +
      read(b(un(K.n(s.hours), 'hour')) + ' across ' + b(plur(s.total, 'day')) + ', an average of ' +
        b(un(s.avgSession, 'minute')) + ' a session. That works out at about ' + b(perWkTxt) +
        ' a week, and ' + b(un(h30, 'hour')) + ' of it landed in the last ' + win30 + ' days.');

    /* ---------------- 11 life around the work ---------------- */
    var s11 =
      K.supportRows(s) +
      read((supSplit
        ? 'The one on the most days is ' + b(K.SUPNAME[sBest]) + ', ' + supPhrase(sBest) +
          '. The rarest is ' + b(K.SUPNAME[sWorst]) + ', ' + supPhrase(sWorst) + '. '
        : 'All four of these turn up on the same number of days so far, ' +
          b(plur(supDayCount[sBest], 'day')) + ' each. ') +
        (s.supDays === 0
          ? 'There is no day yet where you logged one of these and never made the main move.'
          : 'On ' + b(plur(s.supDays, 'day')) + ' you logged something but never made the main move, and ' +
            (s.supDays === 1 ? 'that day still counts' : 'those days still count') + ' as missed.')) +
      cap('Each row counts what you logged, then measures it against the ' + s.total + ' days you showed up.');

    /* ---------------- 12 what the record says ---------------- */
    var s12 =
      '<div class="ck-panel v06-sum">' +
        '<p>Since ' + b(mdf(first)) + ' you have shown up on ' + b(s.total) + ' of ' + b(N) +
          ' days. That is your rate: ' + b(s.rate + '%') + '.</p>' +
        '<p>Lately you are running ' + b(r30p + '%') + ', ' + b(dir(r30p, s.rate)) +
          ' that line, and the last ' + lastKw + ' averaged ' + b(un(last4, 'day')) + ' a week.</p>' +
        '<p>' + (s.missed === 0
          ? 'No day is missing yet. The first one you miss will show up here.'
          : b(s.missed) + (s.missed === 1 ? ' day is' : ' days are') +
            ' missing from this record. They stay in it, and they always will.') +
        '</p>' +
      '</div>';

    return '<div class="cx">' + css + head +
      sec('The headline', s1) +
      sec(wholeIs30 ? 'The record so far' : 'The last 30 days', s2) +
      sec('Every day since day one', s3) +
      sec(tmName + ' so far', s4) +
      /* a chart of one column is not a comparison, so it waits for a second month */
      (s.months.length > 1 ? sec('Month by month', s5) : '') +
      sec('Your week', s6) +
      sec('Week by week', s7) +
      sec('Where it broke', s8) +
      sec('Then and now', s9) +
      sec('Time on it', s10) +
      sec('Life around the work', s11) +
      sec('What the record says', s12) +
      '<div class="cx__foot">Nothing here is rounded up.<br>A missed day is a missed day.</div>' +
      '</div>';
  }
};
