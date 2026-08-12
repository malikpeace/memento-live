/* v10, THE DASHBOARD.
   A compact bloom, then a gridded wall of every real number the log can give,
   punctuated by small charts. Nothing here branches on goal shape except the
   one goal strip under the hero. Every value is counted off the log, and any
   window too short to say something true says nothing instead. */
window.CVAR = window.CVAR || {};
window.CVAR['v10'] = {
  name: 'The dashboard',
  note: 'A compact bloom up top, then a tight grid of every real number the log can produce, punctuated by small charts. For the person who wants the whole record at once.',
  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;

    /* ---------- helpers: nothing invented, everything counted ---------- */
    function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
    function d1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, ''); }
    var nowYear = log.length ? log[log.length - 1].date.getFullYear() : new Date().getFullYear();
    function dstr(d) {
      if (!d) return 'no day yet';
      return K.MONF[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== nowYear ? ' ' + d.getFullYear() : '');
    }
    function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
    function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
    function pl(v, one, many) { return v === 1 ? one : many; }

    /* runs and breaks, walked straight off the log. A gap before the first day
       you ever showed up is not a break, you had not started yet. */
    var runs = [], breaks = [], r = 0, g = 0, seenOn = false;
    log.forEach(function (d) {
      if (d.on) { if (g && seenOn) breaks.push(g); g = 0; r++; seenOn = true; }
      else { if (r) { runs.push(r); r = 0; } g++; }
    });
    if (r) runs.push(r);
    if (g && seenOn) breaks.push(g);
    var avgRun = runs.length ? d1(sum(runs) / runs.length) : '0';
    var avgBreak = breaks.length ? d1(sum(breaks) / breaks.length) : '0';
    var longRuns = runs.filter(function (v) { return v >= 7; }).length;
    var oneDayRuns = runs.filter(function (v) { return v === 1; }).length;
    var longestBreak = breaks.length ? Math.max.apply(null, breaks) : 0;
    var medRun = '0';
    if (runs.length) {
      var sortedRuns = runs.slice().sort(function (a, b) { return a - b; });
      var mid = Math.floor(sortedRuns.length / 2);
      medRun = sortedRuns.length % 2 ? String(sortedRuns[mid]) : d1((sortedRuns[mid - 1] + sortedRuns[mid]) / 2);
    }

    /* the record cut in half, so a trend reads in either direction */
    function onIn(a) { return a.filter(function (d) { return d.on; }).length; }
    var halfN = Math.floor(log.length / 2), restN = log.length - halfN;
    var pH1 = pct(onIn(log.slice(0, halfN)), halfN);
    var pH2 = pct(onIn(log.slice(halfN)), restN);
    var hasHalves = log.length >= 20;
    var halfLine = pH2 > pH1
      ? 'The second half of the record is ' + (pH2 - pH1) + ' points stronger than the first.'
      : pH2 < pH1
      ? 'The second half of the record is ' + (pH1 - pH2) + ' points weaker than the first.'
      : 'Both halves of the record read the same.';

    function tail(n) { return log.slice(-n).filter(function (d) { return d.on; }).length; }
    var win7 = Math.min(7, log.length), last7 = tail(win7);
    /* a days-a-week rate is only read off WHOLE weeks. A two-day first week
       drags the average down and says something the record never said. */
    var last4Full = s.weeks.filter(function (w) { return w.all === 7; }).slice(-4);
    var wkRate = last4Full.length
      ? d1(sum(last4Full.map(function (w) { return w.on; })) / last4Full.length)
      : null;
    /* the 30-before-that window only exists once the record is 60 days old.
       Before that there is nothing to compare against, so nothing is claimed. */
    var has60 = log.length >= 60;
    var sparkDays = Math.min(60, log.length);

    var maxSession = log.reduce(function (m, d) { return Math.max(m, d.minutes || 0); }, 0);
    var supKeys = ['deepwork', 'reflection', 'checkin', 'vivere'];
    var supTotal = supKeys.reduce(function (a, k) { return a + (s.sup[k] || 0); }, 0);

    var bestWeek = s.weeks.length ? s.weeks.reduce(function (m, w) { return Math.max(m, w.on); }, 0) : 0;
    var wkMax = Math.max(1, bestWeek);

    /* best and weakest month, only counting months with real length behind them */
    var solid = s.months.filter(function (m) { return m.all >= 10; });
    if (!solid.length) solid = s.months.slice();
    var bestM = null, worstM = null;
    solid.forEach(function (m) {
      if (!bestM || pct(m.on, m.all) > pct(bestM.on, bestM.all)) bestM = m;
      if (!worstM || pct(m.on, m.all) < pct(worstM.on, worstM.all)) worstM = m;
    });

    var pThis = pct(s.thisMonth.on, s.thisMonth.all);
    var pLast = pct(s.lastMonth.on, s.lastMonth.all);
    var hasLast = s.months.length >= 2;
    var mMissed = s.thisMonth.all - s.thisMonth.on;
    var mDiff = pThis - pLast;
    /* a three-day-old month is not a trend, so it is not read as one */
    var youngMonth = s.thisMonth.all < 7;
    var mLine = !hasLast
      ? 'This is the first month on the record.'
      : 'Last month you showed up on ' + s.lastMonth.on + ' of ' + s.lastMonth.all + ' days, ' + pLast + '%. ' + (
          youngMonth
            ? 'This month is only ' + s.thisMonth.all + (s.thisMonth.all === 1 ? ' day' : ' days') + ' old, too short to compare against yet.'
            : mDiff > 0 ? 'This month is running ' + mDiff + ' points ahead of it.'
            : mDiff < 0 ? 'This month is running ' + Math.abs(mDiff) + ' points behind it.'
            : 'This month is running level with it.');
    var startDay = log.length ? log[0].date : null;
    var runStart = s.current > 0 ? log[log.length - s.current].date : null;
    var bestDowPct = pct(s.byDow[s.bestDow], s.dowSeen[s.bestDow]);
    var worstDowPct = pct(s.byDow[s.worstDow], s.dowSeen[s.worstDow]);

    /* every window label states the window that actually exists, and a pattern is
       only named once there is enough record to see one */
    var showR30 = log.length > 10;
    var hasMonths = s.months.length >= 2;
    /* one qualifying month cannot be a strongest month, and two bars are not a chart */
    var hasMonthSpread = solid.length >= 2 && bestM && worstM && bestM !== worstM;
    var showWkBars = s.weeks.length >= 3;
    var hasDowSpread = s.bestDow !== s.worstDow && bestDowPct !== worstDowPct;
    var calCols = Math.min(21, Math.max(14, Math.round(Math.sqrt(log.length * 1.6))));
    if (log.length < calCols) calCols = Math.max(1, log.length);

    /* The goal strip never repeats a number the hero already shows. If the shape
       line carries nothing new at all, the strip does not appear. */
    var leadDup = String(sh.lead) === String(s.total) || String(sh.lead) === String(s.current);
    var ctxDup = String(sh.ctx.v) === s.rate + '%' || String(sh.ctx.v) === String(s.total);
    var goalHTML = (leadDup && ctxDup) ? ''
      : '<div class="v10-goal">' + (leadDup ? cap(sh.sub) : '<b>' + sh.lead + '</b> ' + sh.sub) + '</div>' +
        (ctxDup ? '' : '<div class="v10-goalrow"><span>' + cap(sh.ctx.l) + '</span><b>' + sh.ctx.v + '</b></div>');

    /* ---------- scoped styling, .v10 only ---------- */
    var css = '<style>' +
      '.v10 h2{margin:22px 0 10px}' +
      '.v10 h2:first-of-type{margin-top:18px}' +
      '.v10-sub{font-size:12.5px;color:var(--text-mid);margin:-8px 0 14px;line-height:1.5}' +
      '.v10-hero{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:center}' +
      '.v10-hero__b{width:150px;height:150px;display:flex;align-items:center;justify-content:center}' +
      '.v10-read .ck-n{font-size:44px}' +
      '.v10-lab{font-size:12.5px;color:var(--text-mid);margin-top:8px;line-height:1.35}' +
      '.v10-mini{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--hairline)}' +
      '.v10-mini b{display:block;font-size:17px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1}' +
      '.v10-mini span{display:block;font-size:11px;color:var(--text-mid);margin-top:5px;line-height:1.3}' +
      '.v10-goal{margin-top:14px;padding-top:13px;border-top:1px solid var(--hairline);font-size:13px;color:var(--text-mid);line-height:1.45}' +
      '.v10-goal b{font-size:15.5px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--text-hi)}' +
      '.v10-goalrow{display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-top:11px;padding-top:11px;border-top:1px solid var(--hairline)}' +
      '.v10-goalrow span{font-size:12.5px;color:var(--text-mid);line-height:1.35}' +
      '.v10-goalrow b{font-size:17px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums;flex:0 0 auto}' +
      '.v10 .ck-tiles{gap:8px}' +
      '.v10 .ck-tiles--1{grid-template-columns:1fr}' +
      '.v10 .ck-tiles+.ck-tiles{margin-top:8px}' +
      '.v10 .ck-tiles--4 .ck-tile{padding:11px 9px 10px}' +
      '.v10 .ck-tiles--4 .ck-tile b{font-size:19px}' +
      '.v10 .ck-tiles--4 .ck-tile span{font-size:10.5px;margin-top:4px}' +
      '.v10-note{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin-top:10px}' +
      '.v10-calwrap .ck-cal{max-width:var(--calmax,100%)}' +
      '.v10-leg{display:flex;gap:15px;margin-top:10px;flex-wrap:wrap}' +
      '.v10-leg i{display:inline-flex;align-items:center;gap:6px;font-style:normal;font-size:11px;color:var(--text-mid)}' +
      '.v10-leg u{text-decoration:none;width:9px;height:9px;border-radius:2.5px;display:block;flex:0 0 auto}' +
      '.v10-mrow{display:grid;grid-template-columns:1fr 104px;gap:13px;align-items:stretch}' +
      '.v10-mcol{display:flex;flex-direction:column;gap:9px}' +
      '.v10-mcol div{flex:1;background:var(--fill-1);box-shadow:var(--inset);border-radius:11px;padding:10px 11px;display:flex;flex-direction:column;justify-content:center}' +
      '.v10-mcol b{font-size:17px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1}' +
      '.v10-mcol span{font-size:10.5px;color:var(--text-mid);margin-top:5px;line-height:1.3}' +
      '.v10-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}' +
      '.v10-card{background:var(--fill-1);box-shadow:var(--inset);border-radius:12px;padding:11px 12px}' +
      '.v10-card b{display:block;font-size:15px;font-weight:700;letter-spacing:-.02em}' +
      '.v10-card span{display:block;font-size:11.5px;color:var(--text-mid);margin-top:4px;line-height:1.4}' +
      '.v10-wk{display:flex;align-items:flex-end;gap:3px;height:46px}' +
      '.v10-wk i{flex:1;min-width:2px;max-width:24px;border-radius:3px 3px 2px 2px;background:rgba(var(--ink),.11);min-height:3px}' +
      '.v10 .ck-mo__c{max-width:52px}' +
      '.v10-wk i.met{background:rgba(var(--accent-rgb),.55)}' +
      '.v10-wkx{display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-lo);margin-top:7px}' +
      '.v10-sparkwrap{background:var(--fill-1);box-shadow:var(--inset);border-radius:12px;padding:12px 12px 8px}' +
      '.v10-sparkx{display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-lo);margin-top:6px}' +
      '.v10-ledger{background:var(--fill-1);box-shadow:var(--inset);border-radius:12px;padding:3px 13px}' +
      '@media (prefers-reduced-motion:reduce){.v10 .ck-bloom circle{animation:none}}' +
      '</style>';

    var H = [];
    H.push(css);

    /* ---------- header ---------- */
    H.push('<div class="cx__top"><div class="cx__title">Consistency</div>' +
      '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>');
    H.push('<div class="v10-sub">' + K.n(s.N) + ' days on the record, since ' + dstr(startDay) + '.</div>');

    /* ---------- hero: the bloom, the headline reading, the goal strip ---------- */
    H.push('<div class="ck-panel">' +
      '<div class="v10-hero">' +
        '<div class="v10-hero__b">' + K.bloomSVG(s.total, { size: 150, animate: true }) + '</div>' +
        '<div class="v10-read">' +
          '<div class="ck-n ck-n--big">' + K.n(s.total) + '</div>' +
          '<div class="v10-lab">days you showed up</div>' +
          '<div class="v10-mini">' +
            '<div><b>' + s.rate + '%</b><span>of every day tracked</span></div>' +
            '<div><b>' + s.current + '</b><span>in the current run</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      goalHTML +
    '</div>');

    /* ---------- the record ---------- */
    H.push('<h2>The record</h2>');
    H.push('<div class="ck-tiles ck-tiles--4">' +
      K.tile(runs.length, pl(runs.length, 'separate run', 'separate runs')) +
      K.tile(s.missed, pl(s.missed, 'day missed', 'days missed')) +
      K.tile(s.best, pl(s.best, 'day, best run', 'days, best run')) +
      K.tile(s.comebacks, pl(s.comebacks, 'comeback', 'comebacks')) +
    '</div>');
    H.push('<div class="ck-tiles ck-tiles--2">' +
      K.tile(d1(s.perWeek), 'days a week on average', 'across the whole record') +
      K.tile(medRun, 'days in the typical run', runs.length === 1 ? 'your only run so far' : 'the middle of all ' + runs.length + ' runs') +
    '</div>');
    if (hasHalves) {
      H.push('<div class="ck-tiles ck-tiles--2">' +
        K.tile(pH1 + '%', 'the first ' + halfN + ' days') +
        K.tile(pH2 + '%', 'the ' + restN + ' days since') +
      '</div>');
      H.push('<div class="v10-note">' + halfLine + '</div>');
    }

    /* ---------- lately ---------- */
    H.push('<h2>Lately</h2>');
    H.push('<div class="v10-sparkwrap">' + K.sparkline(log, sparkDays, 320, 44) +
      '<div class="v10-sparkx"><span>' + sparkDays + ' days ago</span><span>today</span></div></div>');
    var lately = [K.tile(last7, 'of the last ' + win7 + ' days')];
    if (showR30) lately.push(K.tile(has60 ? s.r30 + K.delta(s.delta30) : s.r30, 'of the last ' + Math.min(30, log.length) + ' days'));
    /* on a frequency goal the strip under the hero already carries a weekly rate,
       and two rates on one screen only look like a contradiction */
    if (wkRate !== null && ctx.shape !== 'frequency') {
      lately.push(K.tile(wkRate, 'days a week, last ' + last4Full.length + pl(last4Full.length, ' full week', ' full weeks')));
    }
    H.push('<div class="ck-tiles' + (lately.length === 1 ? ' ck-tiles--1' : lately.length === 2 ? ' ck-tiles--2' : '') +
      '" style="margin-top:8px">' + lately.join('') + '</div>');
    H.push('<div class="v10-note">' + ((win7 - last7)
        ? 'You missed ' + (win7 - last7) + ' of the last ' + win7 + ' days. '
        : 'No misses in the last ' + win7 + ' days. ') +
      'The line is your show-up rate over a rolling seven days. ' + (has60
      ? 'The last 30 days: ' + s.r30 + ' of 30. The 30 before that: ' + s.rPrev30 + ' of 30.'
      : 'The record is ' + s.N + ' days old, so there is no earlier month to compare against yet.') + '</div>');

    /* ---------- every day since day one ---------- */
    H.push('<h2>Every day since day one</h2>');
    /* a short record must not render as a row of giant blocks: capping the grid
       width keeps a cell the same size at day 7 as it is at day 365 */
    H.push('<div class="v10-calwrap" style="--calmax:' + (calCols * 24) + 'px">' + K.calendarHTML(log, { cols: calCols }) + '</div>');
    H.push('<div class="v10-leg">' +
      '<i><u style="background:rgba(var(--accent-rgb),.62)"></u>showed up</i>' +
      '<i><u style="background:rgba(var(--accent-rgb),.22)"></u>logged something else</i>' +
      '<i><u style="background:rgba(var(--ink),.055)"></u>missed</i>' +
    '</div>');
    H.push('<div class="v10-note">One cell per day since day one, ' + K.n(s.N) + ' of them. ' + (
      !s.missed
        ? 'None of them are days you missed, yet.'
        : K.n(s.missed) + pl(s.missed, ' is a day you missed', ' are days you missed') +
          (s.supDays ? ', and ' + s.supDays + ' of those still carry something you logged.' : '.')
    ) + '</div>');

    /* ---------- this month ---------- */
    H.push('<h2>' + K.MONF[(log[log.length - 1] || { date: new Date() }).date.getMonth()] + '</h2>');
    H.push('<div class="v10-mrow">' +
      '<div>' + K.monthGrid(log) + '</div>' +
      '<div class="v10-mcol">' +
        '<div><b>' + s.thisMonth.on + ' of ' + s.thisMonth.all + '</b><span>days so far this month</span></div>' +
        '<div><b>' + pThis + '%</b><span>of the month so far</span></div>' +
        '<div><b>' + mMissed + '</b><span>' + (mMissed === 1 ? 'day missed this month' : 'days missed this month') + '</span></div>' +
      '</div>' +
    '</div>');
    H.push('<div class="v10-note">' + mLine + '</div>');

    /* ---------- weekday rhythm ---------- */
    H.push('<h2>Your week</h2>');
    H.push(K.dowChart(s));
    H.push(hasDowSpread
      ? '<div class="v10-two">' +
          '<div class="v10-card"><b>' + K.WDF[s.bestDow] + '</b><span>strongest day, you show up on ' + bestDowPct + '% of them</span></div>' +
          '<div class="v10-card"><b>' + K.WDF[s.worstDow] + '</b><span>weakest day, you show up on ' + worstDowPct + '% of them</span></div>' +
        '</div>'
      : '<div class="v10-note">Every weekday reads the same so far. A pattern needs more weeks than this.</div>');

    /* ---------- month by month (a single month is not a chart) ---------- */
    if (hasMonths) {
      H.push('<h2>Month by month</h2>');
      H.push(K.monthChart(s));
    }

    /* ---------- weeks ---------- */
    H.push('<h2>Week by week</h2>');
    if (showWkBars) {
      H.push('<div class="v10-wk" style="gap:' + (s.weeks.length > 30 ? 2 : 3) + 'px">' + s.weeks.map(function (w) {
        return '<i class="' + (w.on >= s.cadence ? 'met' : '') + '" style="height:' + Math.max(3, Math.round(46 * w.on / wkMax)) + 'px"></i>';
      }).join('') + '</div>');
      if (s.weeks.length >= 6) H.push('<div class="v10-wkx"><span>week 1</span><span>week ' + s.weeks.length + '</span></div>');
    }
    H.push('<div class="ck-tiles"' + (showWkBars ? ' style="margin-top:10px"' : '') + '>' +
      K.tile(s.weeks.length, pl(s.weeks.length, 'week tracked', 'weeks tracked')) +
      K.tile(s.metWeeks, pl(s.metWeeks, 'week at ', 'weeks at ') + s.cadence + ' days or more') +
      K.tile(bestWeek, pl(bestWeek, 'day, best week', 'days, best week')) +
    '</div>');
    H.push('<div class="v10-note">' + (showWkBars
      ? 'One bar per week. The tallest is your best week at ' + bestWeek + (bestWeek === 1 ? ' day' : ' days') +
        ', and the filled bars are the weeks you reached ' + s.cadence + '. The last bar is the week you are in now.'
      : 'The record covers ' + s.weeks.length + (s.weeks.length === 1 ? ' week' : ' weeks') + ' so far, too few to draw a shape.') + '</div>');

    /* ---------- runs and breaks ---------- */
    H.push('<h2>Runs and breaks</h2>');
    H.push('<div class="v10-ledger"><div class="ck-rows">' +
      '<div class="ck-row"><span>Average run</span><b>' + avgRun + '<em>days</em></b></div>' +
      '<div class="ck-row"><span>Runs of a week or longer</span><b>' + longRuns + '</b></div>' +
      '<div class="ck-row"><span>Runs that lasted one day</span><b>' + oneDayRuns + '</b></div>' +
      '<div class="ck-row"><span>Times you stopped</span><b>' + breaks.length + '</b></div>' +
      (breaks.length
        ? '<div class="ck-row"><span>Average break</span><b>' + avgBreak + '<em>days</em></b></div>' +
          '<div class="ck-row"><span>Longest break</span><b>' + longestBreak + '<em>days</em></b></div>'
        : '') +
    '</div></div>');

    /* ---------- time ---------- */
    H.push('<h2>Time on it</h2>');
    H.push('<div class="ck-tiles">' +
      K.tile(s.hours, 'hours logged') +
      K.tile(s.avgSession, 'minutes, average') +
      K.tile(maxSession, 'minutes, longest') +
    '</div>');

    /* ---------- support activity ---------- */
    H.push('<h2>Around the work</h2>');
    H.push(K.supportRows(s));
    H.push('<div class="v10-note">' + (
      !s.missed ? 'You have not missed a day yet, so every one of these sits on a day you showed up.'
      : s.supDays ? 'On ' + s.supDays + ' of your ' + s.missed + ' missed days you still logged something. Those days are still misses.'
      : 'None of your ' + s.missed + ' missed days carry anything else you logged.'
    ) + '</div>');

    /* ---------- the rest of the record ---------- */
    var rows = [];
    rows.push(['First day tracked', dstr(startDay)]);
    if (s.firstOn && startDay && s.firstOn.getTime() !== startDay.getTime()) rows.push(['First day you showed up', dstr(s.firstOn)]);
    rows.push(['Latest day you showed up', dstr(s.lastOn)]);
    rows.push(['Current run started', runStart ? dstr(runStart) : 'not running']);
    if (hasMonthSpread) {
      rows.push(['Strongest month', K.MONF[bestM.date.getMonth()] + ', ' + pct(bestM.on, bestM.all) + '%']);
      rows.push(['Weakest month', K.MONF[worstM.date.getMonth()] + ', ' + pct(worstM.on, worstM.all) + '%']);
    }
    rows.push(['Support actions logged', K.n(supTotal)]);
    H.push('<h2>The rest of the record</h2>');
    H.push('<div class="v10-ledger"><div class="ck-rows">' + rows.map(function (r2) {
      return '<div class="ck-row"><span>' + r2[0] + '</span><b>' + r2[1] + '</b></div>';
    }).join('') + '</div></div>');

    H.push('<div class="cx__foot">Counted from your own log. Misses included, nothing rounded up.</div>');

    return '<div class="cx v10">' + H.join('') + '</div>';
  }
};
