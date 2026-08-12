/* v11, PROGRESSIVE. The page is only as big as the record behind it.
   Every section states its own condition. Nothing appears before it can say
   something true, and what is not open yet says so plainly, with the real
   distance to it. Day 5 is short and calm. Day 365 is the whole thing. */
window.CVAR = window.CVAR || {};
window.CVAR['v11'] = {
  name: 'Earned',
  note: 'The page grows with the record. Each section names the condition that opens it and how far off it is, so a five day record reads short and calm instead of padded with empty charts.',
  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;
    var N = s.N, last = log[log.length - 1].date;
    var yr = last.getFullYear(), yStart = new Date(yr, 0, 1);

    /* ---------- small helpers ---------- */
    function left(d) { d = Math.max(1, Math.round(d)); return d === 1 ? 'One day from now.' : d + ' days from now.'; }
    /* dates carry a year only when they fall outside the year the record ends in */
    function dshort(d) { return K.MON[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== yr ? ', ' + d.getFullYear() : ''); }
    function dlong(d) { return K.MONF[d.getMonth()] + ' ' + d.getDate() + (d.getFullYear() !== yr ? ', ' + d.getFullYear() : ''); }
    function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
    function one(v) { return v.toFixed(1).replace(/\.0$/, ''); }
    function dayspan(a, b) { return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
    function key(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function note(t) { return '<p class="v11-note">' + t + '</p>'; }
    var LOCKI = '<i class="v11-lock__i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.1 2.1"/></svg></i>';
    function lock(t) { return '<div class="ck-locked v11-lock">' + LOCKI + '<span>' + t + '</span></div>'; }

    /* ---------- derived facts (nothing invented) ---------- */
    var wks = s.weeks, wkNow = wks[wks.length - 1] || { on: 0, all: 0 }, wkPrev = wks[wks.length - 2] || null;
    var doneWeeks = Math.max(0, wks.length - 1);
    /* a full week is one that both started and ended inside the record, so the
       part week at each end never drags an average down or props one up */
    var fullWeeks = wks.slice(1, -1);
    var last4Full = fullWeeks.slice(-4);
    var last4FullRate = last4Full.length ? last4Full.reduce(function (a, w) { return a + w.on; }, 0) / last4Full.length : 0;
    var metFull = fullWeeks.filter(function (w) { return w.on >= s.cadence; }).length;
    var win7 = log.slice(-7);
    var last7 = win7.filter(function (d) { return d.on; }).length;
    var min7 = win7.reduce(function (a, d) { return a + d.minutes; }, 0);
    var supTotal = s.sup.deepwork + s.sup.reflection + s.sup.checkin + s.sup.vivere;
    var bestDay = log.reduce(function (a, d) { return d.minutes > a ? d.minutes : a; }, 0);
    var min30 = log.slice(-30).reduce(function (a, d) { return a + d.minutes; }, 0);
    var minPrev30 = log.slice(-60, -30).reduce(function (a, d) { return a + d.minutes; }, 0);
    var lastMiss = null;
    for (var mi = log.length - 1; mi >= 0; mi--) { if (!log[mi].on) { lastMiss = log[mi].date; break; } }
    var sinceMiss = lastMiss ? dayspan(lastMiss, last) : 0;
    var avgGap = s.gaps ? s.missed / s.gaps : 0;
    /* runs: every stretch of days in a row, read straight off the log */
    var runs = [], rl = 0;
    log.forEach(function (d) { if (d.on) { rl++; } else if (rl) { runs.push(rl); rl = 0; } });
    if (rl) runs.push(rl);
    var avgRun = runs.length ? s.total / runs.length : 0;
    var singles = runs.filter(function (r) { return r === 1; }).length;
    var minDow = Math.min.apply(null, s.dowSeen);
    /* strongest / weakest weekday by RATE, which is what the chart draws and prints */
    var dowRate = s.byDow.map(function (v, i) { return s.dowSeen[i] ? v / s.dowSeen[i] : -1; });
    var bestR = 0, worstR = 0;
    dowRate.forEach(function (r, i) {
      if (r < 0) return;
      if (dowRate[bestR] < 0 || r > dowRate[bestR]) bestR = i;
      if (dowRate[worstR] < 0 || r < dowRate[worstR]) worstR = i;
    });
    var toNextMonth = dayspan(last, new Date(last.getFullYear(), last.getMonth() + 1, 1));
    var nextMonthName = K.MONF[(last.getMonth() + 1) % 12];
    var yElapsed = dayspan(yStart, last) + 1;
    var yLog = log.filter(function (d) { return d.date.getFullYear() === yr; });
    var yOn = yLog.filter(function (d) { return d.on; }).length;
    var mNow = s.months[s.months.length - 1], mPrev = s.months[s.months.length - 2];

    /* ---------- the bloom, sized to the record ---------- */
    var bsize = s.total < 3 ? 128 : s.total < 10 ? 168 : s.total < 30 ? 212 : s.total < 90 ? 274 : s.total < 200 ? 306 : 330;
    /* under a dozen seeds the spiral is opened up so a young record still fills its
       frame instead of floating as a speck. From day twelve on it is the house bloom. */
    var bspace = s.total < 12 ? 10 + (12 - s.total) * 1.5 : 10;
    var overlay = s.total >= 24;                       // the number only moves onto the bloom once there is a bloom
    var bloom = K.bloomSVG(s.total, { size: bsize, animate: true, spacing: bspace });
    var heroN = '<div class="ck-n ' + (overlay ? 'ck-n--hero' : 'ck-n--big') + '">' + s.total + '</div>' +
      '<div class="ck-u">' + (s.total === 1 ? 'day you showed up' : 'days you showed up') + '</div>';
    var hero = '<div class="ck-bloomwrap v11-hero">' + bloom +
      (overlay ? '<div class="v11-scrim" aria-hidden="true"></div><div class="ck-over v11-over">' + heroN + '</div>' : '') +
      '</div>' + (overlay ? '' : '<div class="v11-under">' + heroN + '</div>');

    /* ---------- the goal line (the only shape-tuned copy on the page) ---------- */
    var goal = '<div class="ck-panel v11-goal">' +
      '<div class="v11-goal__l"><b class="v11-goal__n' + (String(sh.lead).length > 7 ? ' sm' : '') + '">' + sh.lead + '</b><i>' + sh.sub + '</i></div>' +
      '<div class="v11-goal__r"><b>' + sh.ctx.v + '</b><i>' + sh.ctx.l + '</i></div>' +
      '</div>';

    /* ---------- the last seven days (this variant only) ---------- */
    function sevenStrip() {
      var map = {}; log.forEach(function (d) { map[d.key] = d; });
      var out = '';
      for (var i = 6; i >= 0; i--) {
        var dt = new Date(last.getFullYear(), last.getMonth(), last.getDate() - i);
        var e = map[key(dt)];
        var cls = !e ? 'pad' : e.on ? 'on' : (Object.keys(e.sup).length ? 'sup' : 'off');
        out += '<div class="v11-7__c"><b class="' + cls + '">' + dt.getDate() + '</b><span>' + K.WD[dt.getDay()] + '</span></div>';
      }
      return '<div class="v11-7">' + out + '</div>';
    }

    /* ---------- weekday chart, drawn by rate so the bars match the numbers ---------- */
    function dowBars() {
      return '<div class="v11-dow">' + s.byDow.map(function (v, i) {
        var seen = s.dowSeen[i], p = pct(v, seen);
        return '<div class="v11-dow__c"><div class="v11-dow__t">' +
          '<i class="v11-dow__b' + (i === bestR ? ' top' : '') + '" style="height:' + (seen && p ? Math.max(3, p) : 0) + '%"></i></div>' +
          '<b>' + (seen ? p + '%' : '') + '</b><span>' + K.WDF[i].slice(0, 3) + '</span></div>';
      }).join('') + '</div>';
    }

    /* ---------- year strip (this variant only) ---------- */
    function yearGrid() {
      var map = {}; log.forEach(function (d) { map[d.key] = d; });
      var pad = yStart.getDay(), cells = '', dim = ((yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0) ? 366 : 365;
      for (var p = 0; p < pad; p++) cells += '<b class="none"></b>';
      for (var i = 0; i < dim; i++) {
        var d = new Date(yr, 0, 1 + i);
        var e = map[key(d)];
        var cls = !e ? 'none' : e.on ? 'on' : (Object.keys(e.sup).length ? 'sup' : 'off');
        cells += '<b class="' + cls + '"></b>';
      }
      var mdays = [31, ((yr % 4 === 0 && yr % 100 !== 0) || yr % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      var ruler = '<div class="v11-ymo">' + mdays.map(function (n, i) {
        return '<i style="flex:' + n + '">' + K.MON[i] + '</i>';
      }).join('') + '</div>';
      return '<div class="v11-year">' + cells + '</div>' + ruler;
    }

    /* ---------- week bars (this variant only) ---------- */
    function weekBars() {
      var ws = wks.slice(-12);
      return '<div class="v11-wk">' + ws.map(function (w, i) {
        var h = w.on ? Math.max(9, Math.round(100 * w.on / 7)) : 0;   // an empty week draws nothing
        return '<div class="v11-wk__c' + (i === ws.length - 1 ? ' now' : '') + '">' +
          '<div class="v11-wk__t"><i class="v11-wk__b' + (w.on >= s.cadence ? ' met' : '') + '" style="height:' + h + '%"></i></div>' +
          '<span>' + w.on + '</span></div>';
      }).join('') + '</div>';
    }

    /* ---------- the sections, each with the condition that opens it ---------- */
    var secs = [];
    function sec(title, open, bodyFn, lockTxt, away, at) {
      secs.push({ t: title, open: !!open, body: open ? bodyFn() : '', lock: lockTxt, away: away, at: at });
    }

    sec('The record', true, function () {
      var upL = s.total === 1 ? 'day you showed up' : 'days you showed up';
      var msL = s.missed === 1 ? 'day missed' : 'days missed';
      var h;
      if (N >= 7) {
        h = '<div class="ck-tiles">' + K.tile(s.total, upL) + K.tile(s.missed, msL) +
          K.tile(s.rate + '%', 'of all days') + '</div>';
      } else {
        h = '<div class="ck-tiles ck-tiles--2">' + K.tile(s.total, upL) + K.tile(s.missed, msL) + '</div>' +
          '<div style="margin-top:9px">' + lock('A percentage of ' + N + (N === 1 ? ' day' : ' days') +
            ' would be noise. It opens on day 7. ' + left(7 - N)) + '</div>';
      }
      if (N >= 14) {
        h += '<div class="ck-tiles ck-tiles--2" style="margin-top:8px">' +
          K.tile(s.current, s.current === 1 ? 'day in a row right now' : 'days in a row right now') +
          K.tile(s.best, 'longest run so far') + '</div>';
      }
      h += note(N === 1 || !s.firstOn ? 'One day on the record. It starts here.'
        : N + ' days on the record, counted from ' + dlong(s.firstOn) + ' to today. Every one of them is in here, kept or missed.');
      return h;
    });

    sec('The last seven days', N >= 3, function () {
      var covered = Math.min(7, N);
      return sevenStrip() + note((covered < 7
        ? 'The record covers ' + covered + ' of the last seven days, and you showed up on ' + last7 + ' of them.'
        : 'You showed up on ' + last7 + ' of the last seven days.') +
        ' ' + K.n(min7) + ' minutes logged across them.');
    }, 'The last seven days opens on day 3. ' + left(3 - N), 3 - N, 'day 3');

    sec('This week', N >= 7, function () {
      return '<div class="ck-rows">' +
        '<div class="ck-row"><span>This week so far</span><b>' + wkNow.on + '<em>of ' + wkNow.all + ' days</em></b></div>' +
        (wkPrev ? '<div class="ck-row"><span>Last week</span><b>' + wkPrev.on + '<em>of ' + wkPrev.all + ' days</em></b></div>' : '') +
        (last4Full.length === 4 ? '<div class="ck-row"><span>Average, last four full weeks</span><b>' + one(last4FullRate) + '<em>days a week</em></b></div>' : '') +
        '<div class="ck-row"><span>Across the whole record</span><b>' + s.perWeek.toFixed(1) + '<em>days a week</em></b></div>' +
        '</div>' + note('A week here starts on Monday, so the first and last rows are usually part weeks.');
    }, 'The week view fills in on day 7. ' + left(7 - N), 7 - N, 'day 7');

    sec('Lately', N >= 14, function () {
      var span = Math.min(60, N);
      return K.sparkline(log, span, 330, 46) +
        note('Your seven day rate across the last ' + span + ' days. Right now you are on ' + last7 + ' of the last 7 days.');
    }, 'A rolling rate needs 14 days behind it. ' + left(14 - N), 14 - N, 'day 14');

    sec('The last 30 against the 30 before', N >= 60, function () {
      var dir = s.delta30 > 0 ? 'You are showing up more than you were a month ago.'
        : s.delta30 < 0 ? 'You are showing up less than you were a month ago.'
        : 'Exactly the same as the month before it.';
      return '<div class="ck-tiles ck-tiles--2">' +
        K.tile(s.r30 + K.delta(s.delta30), 'days in the last 30', pct(s.r30, 30) + '% of those days') +
        K.tile(s.rPrev30, 'in the 30 before that', pct(s.rPrev30, 30) + '% of those days') +
        '</div>' + note(dir);
    }, 'Comparing two full 30 day stretches needs 60 days of record. ' + left(60 - N), 60 - N, 'day 60');

    sec('This month', N >= 3, function () {
      var mMiss = mNow.all - mNow.on;
      return K.monthGrid(log) + note(K.MONF[mNow.date.getMonth()] + ': ' + mNow.on + ' of ' + mNow.all + ' days so far' +
        (mMiss > 0 ? ', ' + mMiss + ' missed' : '') + '. The rest of the month is still empty.');
    }, 'The month grid opens once three days sit on it. ' + left(3 - N), 3 - N, 'day 3');

    sec('Every day since day one', N >= 21, function () {
      /* two weeks a row while the record is young, three once it needs the space */
      return K.calendarHTML(log, { cols: N <= 56 ? 14 : 21 }) +
        '<div class="v11-legend"><span><i class="on"></i>showed up</span><span><i class="sup"></i>something logged</span><span><i class="off"></i>nothing</span></div>' +
        note(N + ' cells, one per day. ' + s.total + ' filled, ' + s.missed + ' left empty. The empty ones stay empty.');
    }, 'The full grid opens at 21 days. Until then the month above holds everything there is. ' + left(21 - N), 21 - N, 'day 21');

    sec('Your rhythm by weekday', minDow >= 2, function () {
      var bp = pct(s.byDow[bestR], s.dowSeen[bestR]), wp = pct(s.byDow[worstR], s.dowSeen[worstR]);
      var line = bp === wp
        ? 'Every weekday sits at ' + bp + '% so far. No day of the week is carrying the record.'
        : 'Strongest on ' + K.WDF[bestR] + ' at ' + bp + '%. Weakest on ' + K.WDF[worstR] + ' at ' + wp + '%.';
      return dowBars() + note(line + ' Each bar is that weekday out of the times it has come around.');
    }, 'Weekday patterns need every day of the week to come around at least twice. ' + left(14 - N), 14 - N, 'day 14');

    sec('Week by week', wks.length >= 5, function () {
      return weekBars() + note('Days a week, last ' + Math.min(12, wks.length) + ' weeks. Of the ' + fullWeeks.length +
        ' weeks that ran start to finish, you reached ' + s.cadence + ' days or more in ' + metFull +
        '. The last bar is this week, still running.');
    }, 'Week by week needs four finished weeks. You have ' + doneWeeks + ' so far.', (4 - doneWeeks) * 7, '4 full weeks');

    sec('Month by month', s.months.length >= 2, function () {
      var a = pct(mNow.on, mNow.all), b = pct(mPrev.on, mPrev.all);
      return K.monthChart(s) + note(K.MONF[mNow.date.getMonth()] + ' is at ' + a + '% so far. ' +
        K.MONF[mPrev.date.getMonth()] + ' finished at ' + b + '%.');
    }, 'A second month is needed before months can be compared. ' + nextMonthName + ' starts in ' +
       toNextMonth + ' days.', toNextMonth, K.MON[(last.getMonth() + 1) % 12] + ' 1');

    sec('The year', N >= 30, function () {
      return yearGrid() + note(yr + ': ' + yElapsed + ' days gone, ' + yLog.length + ' of them on your record, ' +
        yOn + ' of those you showed up. The pale cells are days the record does not cover.');
    }, 'The year opens at 30 days on the record. ' + left(30 - N), 30 - N, 'day 30');

    sec('Runs of days', N >= 14 && runs.length >= 2, function () {
      return '<div class="ck-rows">' +
        '<div class="ck-row"><span>Days in a row right now</span><b>' + s.current + '</b></div>' +
        '<div class="ck-row"><span>Longest run</span><b>' + s.best + '<em>' + (s.best === 1 ? 'day' : 'days') + '</em></b></div>' +
        '<div class="ck-row"><span>Separate runs</span><b>' + runs.length + '</b></div>' +
        '<div class="ck-row"><span>Typical run</span><b>' + one(avgRun) + '<em>days</em></b></div>' +
        '<div class="ck-row"><span>Runs that lasted one day</span><b>' + singles + '</b></div>' +
        '</div>' + note('A run is a stretch of days in a row. Yours average ' + one(avgRun) +
          ' days, and ' + (singles === 0 ? 'none of them ended after a single day.'
            : singles === 1 ? 'one of them ended after a single day.'
            : singles + ' of them ended after a single day.'));
    }, N < 14 ? 'Runs open at 14 days on the record. ' + left(14 - N)
      : 'One unbroken run so far, so there is nothing to break down yet.',
      N < 14 ? 14 - N : null, 'day 14');

    sec('Gaps and comebacks', s.missed > 0, function () {
      return '<div class="ck-rows">' +
        '<div class="ck-row"><span>Days missed</span><b>' + s.missed + '</b></div>' +
        '<div class="ck-row"><span>Separate gaps</span><b>' + s.gaps + '</b></div>' +
        '<div class="ck-row"><span>Longest gap</span><b>' + s.longestGap + '<em>' + (s.longestGap === 1 ? 'day' : 'days') + '</em></b></div>' +
        '<div class="ck-row"><span>Typical gap</span><b>' + one(avgGap) + '<em>' + (avgGap === 1 ? 'day' : 'days') + '</em></b></div>' +
        (lastMiss ? '<div class="ck-row"><span>Last day missed</span><b>' + dshort(lastMiss) + '</b></div>' : '') +
        (lastMiss ? '<div class="ck-row"><span>Days since then</span><b>' + sinceMiss + '</b></div>' : '') +
        '</div>' + note('A gap is a run of days with nothing on them. It closes the day you show up again, and it stays on the record either way.');
    }, 'No missed days on the record yet. This opens the first time there is one.', null, 'first miss');

    sec('Time on the work', s.total >= 5, function () {
      return '<div class="ck-tiles">' + K.tile(s.hours + 'h', 'logged in total') +
        K.tile(s.avgSession + 'm', 'on a typical day') + K.tile(bestDay + 'm', 'longest day') + '</div>' +
        note('Counted only from the days you showed up. ' + K.n(s.minutes) + ' minutes across ' + s.total + ' of them.');
    }, 'Session time opens after five logged days. You have ' + s.total + '.', 5 - s.total, '5 logged days');

    sec('Time, the last 30 against the 30 before', N >= 60, function () {
      var dm = min30 - minPrev30;
      return '<div class="ck-tiles ck-tiles--2">' +
        K.tile(Math.round(min30 / 60) + 'h', 'in the last 30 days', K.n(min30) + ' minutes') +
        K.tile(Math.round(minPrev30 / 60) + 'h', 'in the 30 before that', K.n(minPrev30) + ' minutes') +
        '</div>' + note(dm > 0 ? K.n(dm) + ' minutes more than the 30 days before it.'
          : dm < 0 ? K.n(-dm) + ' minutes less than the 30 days before it.'
          : 'The same number of minutes as the 30 days before it.');
    }, 'Time needs two full 30 day stretches to compare. ' + left(60 - N), 60 - N, 'day 60');

    sec('Life around the work', N >= 7 && supTotal > 0, function () {
      return K.supportRows(s) + note(s.supDays > 1
        ? s.supDays + ' of the missed days still had something logged on them. Those are the pale cells in the grids above.'
        : s.supDays === 1
        ? 'One missed day still had something logged on it. That is the pale cell in the grids above.'
        : 'Everything logged here landed on a day you also made the main move.');
    }, N < 7 ? 'The support count opens on day 7. ' + left(7 - N)
      : 'Nothing logged around the work yet. Deep work, reflections, check-ins and Vivere land here.',
      N < 7 ? 7 - N : null, 'day 7');

    sec('The whole ledger', N >= 7, function () {
      return '<div class="ck-rows">' +
        '<div class="ck-row"><span>First day recorded</span><b>' + (s.firstOn ? dshort(s.firstOn) : '') + '</b></div>' +
        '<div class="ck-row"><span>Last day you showed up</span><b>' + (s.lastOn ? dshort(s.lastOn) : '') + '</b></div>' +
        '<div class="ck-row"><span>Days on the record</span><b>' + s.N + '</b></div>' +
        '<div class="ck-row"><span>Days you showed up</span><b>' + s.total + '</b></div>' +
        '<div class="ck-row"><span>Days missed</span><b>' + s.missed + '</b></div>' +
        '<div class="ck-row"><span>Show up rate</span><b>' + s.rate + '%</b></div>' +
        '<div class="ck-row"><span>Longest run</span><b>' + s.best + '<em>' + (s.best === 1 ? 'day' : 'days') + '</em></b></div>' +
        '<div class="ck-row"><span>Weeks recorded</span><b>' + wks.length + '</b></div>' +
        '<div class="ck-row"><span>Months recorded</span><b>' + s.months.length + '</b></div>' +
        '<div class="ck-row"><span>Minutes logged</span><b>' + K.n(s.minutes) + '</b></div>' +
        '<div class="ck-row"><span>Extras logged</span><b>' + supTotal + '</b></div>' +
        '</div>';
    }, 'The full ledger opens on day 7. ' + left(7 - N), 7 - N, 'day 7');

    /* ---------- render: open, next up, or held back ----------
       A closed section only takes a heading and a line of its own if it is close.
       At most five of those, nearest first, so a young page stays calm instead of
       becoming a wall of things you do not have yet. The rest are listed once. */
    var soon = {};
    secs.filter(function (x) { return !x.open && (x.away === null || x.away <= 14); })
      .sort(function (a, b) { return (a.away === null ? 99 : a.away) - (b.away === null ? 99 : b.away); })
      .slice(0, 5).forEach(function (x) { soon[x.t] = 1; });

    var open = 0, body = '', far = [];
    secs.forEach(function (x) {
      if (x.open) { open++; body += '<h2>' + x.t + '</h2>' + x.body; }
      else if (soon[x.t]) { body += '<h2>' + x.t + '</h2>' + lock(x.lock); }
      else { far.push(x); }
    });
    if (far.length) {
      body += '<h2>Not open yet</h2>' +
        '<div class="ck-rows v11-far">' + far.map(function (x) {
          return '<div class="ck-row"><span>' + x.t + '</span><b>' + x.at + '</b></div>';
        }).join('') + '</div>' +
        note(far.length === 1
          ? 'That one needs more record before it can say anything true. It opens on its own.'
          : 'Each of these needs more record before it can say anything true. They open on their own.');
    }

    var state = open === secs.length
      ? 'All ' + secs.length + ' sections below are open. This is the whole page.'
      : '<b>' + open + ' of ' + secs.length + '</b> sections below are open. The rest stay closed until there is enough record behind them.';

    return '<div class="cx">' +
      '<style>' +
      '.v11-hero{margin-top:4px}' +
      '.v11-over{top:50%;transform:translateY(-50%)}' +
      '.v11-scrim{position:absolute;left:50%;top:50%;width:240px;height:240px;transform:translate(-50%,-50%);pointer-events:none;' +
        'background:radial-gradient(closest-side,rgba(4,4,5,.95),rgba(4,4,5,.80) 40%,rgba(4,4,5,0) 76%)}' +
      '.v11-under{text-align:center;margin-top:-10px}' +
      '.v11-goal{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-top:20px}' +
      '.v11-goal__l{min-width:0}' +
      '.v11-goal__n{display:block;font-size:30px;font-weight:800;letter-spacing:-.045em;line-height:.96;font-variant-numeric:tabular-nums}' +
      '.v11-goal__n.sm{font-size:22px}' +
      '.v11-goal__l i{display:block;font-style:normal;font-size:12.5px;color:var(--text-mid);margin-top:8px;line-height:1.4}' +
      '.v11-goal__r{flex:0 0 auto;max-width:45%;text-align:right}' +
      '.v11-goal__r b{display:block;font-size:17px;font-weight:750;letter-spacing:-.02em;font-variant-numeric:tabular-nums}' +
      '.v11-goal__r i{display:block;font-style:normal;font-size:11.5px;color:var(--text-mid);margin-top:5px;line-height:1.35}' +
      '.v11-state{margin:16px 2px 0;font-size:13px;color:var(--text-mid);line-height:1.55}' +
      '.v11-state b{color:var(--text-hi);font-weight:700;font-variant-numeric:tabular-nums}' +
      '.v11-note{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin:11px 2px 0}' +
      '.v11-lock{align-items:flex-start}' +
      '.v11-lock__i{flex:0 0 auto;width:14px;height:14px;margin-top:1px;color:rgba(var(--ink),.42)}' +
      '.v11-lock__i svg{width:14px;height:14px;display:block}' +
      '.v11-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:11px;font-size:11.5px;color:var(--text-mid)}' +
      '.v11-legend i{display:inline-block;width:9px;height:9px;border-radius:2.5px;margin-right:6px;vertical-align:-1px}' +
      '.v11-legend i.on{background:rgba(var(--accent-rgb),.62)}' +
      '.v11-legend i.sup{background:rgba(var(--accent-rgb),.22)}' +
      '.v11-legend i.off{background:rgba(var(--ink),.055)}' +
      '.v11-7{display:flex;gap:6px}' +
      '.v11-7__c{flex:0 0 calc((100% - 36px) / 7);min-width:0;text-align:center}' +
      '.v11-7__c b{display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:9px;' +
        'font-size:12px;font-weight:650;font-variant-numeric:tabular-nums;background:rgba(var(--ink),.05);color:rgba(var(--ink),.34)}' +
      '.v11-7__c b.on{background:rgba(var(--accent-rgb),.60);color:#06140a}' +
      '.v11-7__c b.sup{background:rgba(var(--accent-rgb),.16);color:var(--text-mid)}' +
      '.v11-7__c b.pad{background:rgba(var(--ink),.022);color:rgba(var(--ink),.16)}' +
      '.v11-7__c span{display:block;font-size:10.5px;color:var(--text-lo);margin-top:5px}' +
      '.v11-dow{display:flex;gap:5px;align-items:flex-end}' +
      '.v11-dow__c{flex:1;min-width:0;text-align:center}' +
      '.v11-dow__t{height:70px;display:flex;align-items:flex-end}' +
      '.v11-dow__b{width:100%;border-radius:4px 4px 2px 2px;background:rgba(var(--accent-rgb),.26);display:block}' +
      '.v11-dow__b.top{background:rgba(var(--accent-rgb),.62)}' +
      '.v11-dow__c b{display:block;font-size:10.5px;font-weight:700;color:var(--text-mid);margin-top:6px;font-variant-numeric:tabular-nums}' +
      '.v11-dow__c span{display:block;font-size:10px;color:var(--text-lo);margin-top:1px}' +
      '.v11-year{display:grid;grid-template-rows:repeat(7,1fr);grid-auto-flow:column;grid-auto-columns:1fr;gap:2px}' +
      '.v11-year b{aspect-ratio:1;border-radius:1.5px;background:rgba(var(--ink),.07);display:block}' +
      '.v11-year b.none{background:rgba(var(--ink),.022)}' +
      '.v11-year b.sup{background:rgba(var(--accent-rgb),.22)}' +
      '.v11-year b.on{background:rgba(var(--accent-rgb),.62)}' +
      '.v11-ymo{display:flex;margin-top:6px}' +
      '.v11-ymo i{font-style:normal;font-size:9px;color:var(--text-lo);overflow:hidden;white-space:nowrap}' +
      '.v11-wk{display:flex;gap:5px;align-items:flex-end}' +
      '.v11-wk__c{flex:1;text-align:center;min-width:0}' +
      '.v11-wk__t{height:64px;display:flex;align-items:flex-end}' +
      '.v11-wk__b{width:100%;border-radius:4px 4px 2px 2px;background:rgba(var(--accent-rgb),.26);display:block}' +
      '.v11-wk__b.met{background:rgba(var(--accent-rgb),.58)}' +
      '.v11-wk__c span{display:block;font-size:10.5px;font-weight:650;color:var(--text-mid);margin-top:6px;font-variant-numeric:tabular-nums}' +
      '.v11-wk__c.now span{color:var(--text-hi);font-weight:750}' +
      '.v11-far .ck-row b{font-weight:650;color:var(--text-mid);font-size:13px}' +
      '</style>' +
      '<div class="cx__top"><div class="cx__title">Consistency</div>' +
      '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>' +
      hero +
      '<div class="ck-micro">' + (s.total === 1 || !s.firstOn ? 'One dot. That is the whole record so far.'
        : 'One dot for every day you showed up, since ' + dlong(s.firstOn) + '.') + '</div>' +
      goal +
      '<p class="v11-state">' + state + '</p>' +
      body +
      '<div class="cx__foot">A missed day stays a missed day.<br>Nothing here rounds up, and nothing shows before it is true.</div>' +
      '</div>';
  }
};
