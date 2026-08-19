/* v09. THE RHYTHM.
   Patterns lead. The page answers "who am I on a given day" before it answers
   "how much". A compact bloom sits at the top with the goal line beside it, then
   the weekday rhythm runs large, then the splits, the breaks, the runs, the
   comebacks and the trend. Totals are real and complete, and they wait.

   Every number on this page is read off ctx.s or ctx.log. Where the record is
   too short to support a comparison (an empty half-month, a 30 day window that
   has no earlier 30 behind it, a weekday that has come around twice), the page
   says what it has instead of filling the gap with a zero. */
window.CVAR = window.CVAR || {};
window.CVAR['v09'] = {
  name: 'The rhythm',
  note: 'Patterns lead: the weekday rhythm runs large at the top, then the splits, the breaks, the runs, the comebacks and the trend, with the totals held back to the end for the person who wants to understand their own behaviour before counting it. Comparisons the record is too short to support are withheld rather than filled in with a zero.',

  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;
    var H = [];

    /* ---------- helpers ---------- */
    function pc(a, b) { return b ? Math.round(100 * a / b) : 0; }
    function md(d) { return K.MONF[d.getMonth()] + ' ' + d.getDate(); }
    function ms(d) { return K.MON[d.getMonth()] + ' ' + d.getDate(); }
    function plur(n, one, many) { return n === 1 ? one : many; }

    /* ---------- weekday rhythm, by rate ---------- */
    var ORDER = [1, 2, 3, 4, 5, 6, 0];
    var rate = [], bi = -1, wi = -1, maxR = 0;
    for (var i = 0; i < 7; i++) {
      rate[i] = s.dowSeen[i] ? s.byDow[i] / s.dowSeen[i] : -1;
      if (rate[i] < 0) continue;
      if (rate[i] > maxR) maxR = rate[i];
      if (bi < 0 || rate[i] > rate[bi]) bi = i;
      if (wi < 0 || rate[i] < rate[wi]) wi = i;
    }
    var bestPct = bi >= 0 ? pc(s.byDow[bi], s.dowSeen[bi]) : 0;
    var worstPct = wi >= 0 ? pc(s.byDow[wi], s.dowSeen[wi]) : 0;
    var spread = bestPct - worstPct;
    /* how many times the thinnest weekday has come around. Under four of each,
       a weekday "pattern" is noise, so the page says so instead of claiming one. */
    var minSeen = Math.min.apply(null, s.dowSeen);
    var dowSolid = minSeen >= 4;

    /* ---------- splits ---------- */
    var wdOn = 0, wdAll = 0, weOn = 0, weAll = 0, eOn = 0, eAll = 0, lOn = 0, lAll = 0;
    for (i = 0; i < 7; i++) {
      if (i === 0 || i === 6) { weOn += s.byDow[i]; weAll += s.dowSeen[i]; }
      else { wdOn += s.byDow[i]; wdAll += s.dowSeen[i]; }
      if (i >= 1 && i <= 3) { eOn += s.byDow[i]; eAll += s.dowSeen[i]; }
      else { lOn += s.byDow[i]; lAll += s.dowSeen[i]; }
    }
    var wdPct = pc(wdOn, wdAll), wePct = pc(weOn, weAll), drop = wdPct - wePct;
    var ePct = pc(eOn, eAll), lPct = pc(lOn, lAll);

    var h1On = 0, h1All = 0, h2On = 0, h2All = 0;
    log.forEach(function (d) {
      if (d.date.getDate() <= 15) { h1All++; if (d.on) h1On++; }
      else { h2All++; if (d.on) h2On++; }
    });
    var h1Pct = pc(h1On, h1All), h2Pct = pc(h2On, h2All);

    /* ---------- runs on and runs off, read straight off the log ---------- */
    var off = [], on = [], k = 0;
    while (k < log.length) {
      var j = k;
      if (log[k].on) { while (j < log.length && log[j].on) j++; on.push({ len: j - k, s: k, e: j - 1, start: log[k].date }); }
      else { while (j < log.length && !log[j].on) j++; off.push({ len: j - k, s: k, e: j - 1, start: log[k].date, end: log[j - 1].date, dow: log[k].date.getDay() }); }
      k = j;
    }
    var singles = off.filter(function (g) { return g.len === 1; }).length;
    var real = off.length - singles;
    var avgGap = off.length ? (s.missed / off.length) : 0;
    var ranked = off.slice().sort(function (a, b) { return b.len - a.len || b.start - a.start; });
    var longest = ranked[0] || null;
    var afterRun = 0;
    if (longest && longest.e + 1 < log.length) { for (var q = longest.e + 1; q < log.length && log[q].on; q++) afterRun++; }
    var resumed = off.filter(function (g) { return g.e + 1 < log.length; }).length;
    var gapDow = [0, 0, 0, 0, 0, 0, 0]; off.forEach(function (g) { gapDow[g.dow]++; });
    var gi = 0; for (i = 1; i < 7; i++) if (gapDow[i] > gapDow[gi]) gi = i;
    /* if several weekdays tie at the top, no weekday leads, and the page must not say one does */
    var gTies = gapDow.filter(function (v) { return v === gapDow[gi]; }).length;
    var weekRuns = on.filter(function (r) { return r.len >= 7; }).length;
    var bestRun = null; on.forEach(function (r) { if (!bestRun || r.len > bestRun.len) bestRun = r; });
    var topGaps = ranked.slice(0, 5);
    var topRuns = on.slice().sort(function (a, b) { return b.len - a.len || b.start - a.start; }).slice(0, 5);

    /* ---------- weeks ---------- */
    var wks = s.weeks.slice(-13);
    if (wks.length > 1 && wks[0].all < 7) wks = wks.slice(1);
    wks = wks.slice(-12);

    /* ---------- session length by weekday ---------- */
    var mSum = [0, 0, 0, 0, 0, 0, 0], mCnt = [0, 0, 0, 0, 0, 0, 0], long45 = 0;
    log.forEach(function (d) {
      if (!d.on) return;
      mSum[d.date.getDay()] += d.minutes; mCnt[d.date.getDay()]++;
      if (d.minutes >= 45) long45++;
    });
    var li = -1, si = -1;
    for (i = 0; i < 7; i++) {
      if (!mCnt[i]) continue;
      var av = mSum[i] / mCnt[i];
      if (li < 0 || av > mSum[li] / mCnt[li]) li = i;
      if (si < 0 || av < mSum[si] / mCnt[si]) si = i;
    }

    /* ---------- month trend ---------- */
    var tmPct = pc(s.thisMonth.on, s.thisMonth.all), lmPct = pc(s.lastMonth.on, s.lastMonth.all);
    var mDelta = tmPct - lmPct, hasLast = s.months.length > 1;
    var first = s.firstOn || log[0].date;
    var win = Math.min(60, s.N);

    /* ================= STYLE ================= */
    H.push('<style>' +
      '.v09-hero{display:flex;align-items:center;gap:14px;margin:2px 0 0}' +
      '.v09-hero__b{flex:0 0 156px;margin-left:-6px;display:flex;align-items:center;justify-content:center}' +
      '.v09-hero__t{flex:1;min-width:0}' +
      '.v09-lead{font-size:30px;font-weight:800;letter-spacing:-.045em;line-height:.96;color:var(--text-hi);font-variant-numeric:tabular-nums;overflow-wrap:break-word}' +
      '.v09-lead.long{font-size:23px;line-height:1.05}' +
      '.v09-subl{margin-top:8px;font-size:13px;line-height:1.35;color:var(--text-mid)}' +
      '.v09-since{margin-top:11px;font-size:12px;line-height:1.5;color:var(--text-mid)}' +
      '.v09-say{margin:20px 0 2px;font-size:16px;font-weight:500;line-height:1.5;letter-spacing:-.01em;color:var(--text-hi);font-variant-numeric:tabular-nums}' +
      '.v09-say b{font-weight:700}' +
      '.v09-note{font-size:12.5px;line-height:1.55;color:var(--text-mid);margin-top:11px;font-variant-numeric:tabular-nums}' +
      '.v09-note b{color:var(--text-hi);font-weight:650}' +
      /* the large weekday chart */
      '.v09-wk{display:flex;flex-direction:column;gap:10px;margin-top:2px}' +
      '.v09-wk__r{display:flex;align-items:center;gap:10px}' +
      '.v09-wk__d{flex:0 0 30px;font-size:12.5px;color:var(--text-mid)}' +
      '.v09-wk__t{flex:1;height:9px;border-radius:3px;background:rgba(var(--ink),.07);position:relative;overflow:hidden}' +
      '.v09-wk__t u{position:absolute;left:0;top:0;bottom:0;border-radius:3px;text-decoration:none;display:block}' +
      '.v09-wk__p{flex:0 0 41px;text-align:right;font-size:14.5px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--text-hi)}' +
      '.v09-wk__p i{font-style:normal;font-size:10px;font-weight:600;color:var(--text-mid);margin-left:1px}' +
      '.v09-wk__c{flex:0 0 44px;text-align:right;font-style:normal;font-size:11px;color:var(--text-mid);font-variant-numeric:tabular-nums}' +
      /* week by week columns */
      '.v09-wks{display:flex;gap:5px;align-items:flex-end}' +
      '.v09-wks__c{flex:1;text-align:center;min-width:0}' +
      '.v09-wks__t{height:60px;display:flex;align-items:flex-end}' +
      '.v09-wks__t i{display:block;width:100%;border-radius:3px;background:rgba(var(--accent-rgb),.32)}' +
      '.v09-wks__c.now .v09-wks__t i{background:rgba(var(--accent-rgb),.72)}' +
      '.v09-wks__c b{display:block;font-size:10.5px;font-weight:700;margin-top:6px;color:var(--text-mid);font-variant-numeric:tabular-nums}' +
      '.v09-wks__c span{display:block;font-size:10px;color:var(--text-mid);margin-top:2px;font-variant-numeric:tabular-nums}' +
      /* the gap bars */
      '.v09-gap{display:flex;flex-direction:column;gap:9px;margin-top:2px}' +
      '.v09-gap__r{display:flex;align-items:center;gap:10px}' +
      '.v09-gap__d{flex:0 0 74px;font-size:12px;color:var(--text-mid);font-variant-numeric:tabular-nums}' +
      '.v09-gap__t{flex:1;height:8px;border-radius:3px;background:rgba(var(--ink),.05);position:relative;overflow:hidden}' +
      '.v09-gap__t u{position:absolute;left:0;top:0;bottom:0;border-radius:3px;display:block;text-decoration:none;background:rgba(var(--ink),.30)}' +
      '.v09-gap__n{flex:0 0 54px;text-align:right;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text-hi)}' +
      '.v09-gap__n i{font-style:normal;font-size:10.5px;font-weight:600;color:var(--text-mid);margin-left:4px}' +
      /* runs are days you showed up, so they carry the accent; breaks stay neutral ink */
      '.v09-gap--on .v09-gap__t{background:rgba(var(--accent-rgb),.09)}' +
      '.v09-gap--on .v09-gap__t u{background:rgba(var(--accent-rgb),.55)}' +
      /* spark + legend */
      '.v09-spark .ck-spark{height:58px}' +
      '.v09-lg{display:flex;gap:15px;flex-wrap:wrap;margin-top:12px;font-size:11.5px;color:var(--text-mid)}' +
      '.v09-lg i{width:9px;height:9px;border-radius:2.5px;display:inline-block;margin-right:6px;vertical-align:-1px}' +
      '.v09-lg .a{background:rgba(var(--accent-rgb),.62)}' +
      '.v09-lg .b{background:rgba(var(--accent-rgb),.22)}' +
      '.v09-lg .c{background:rgba(var(--ink),.055)}' +
      '.v09-hr{height:1px;background:var(--hairline);margin:26px 0 0}' +
      '</style>');

    /* ================= HEADER ================= */
    H.push('<div class="cx__top"><div class="cx__title">Consistency</div>' +
      '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>');

    /* ================= HERO: compact bloom, the goal line beside it ================= */
    H.push('<div class="v09-hero">' +
      '<div class="v09-hero__b">' + K.bloomSVG(s.total, { size: 156, animate: true }) + '</div>' +
      '<div class="v09-hero__t">' +
        '<div class="v09-lead' + (String(sh.lead).length > 6 ? ' long' : '') + '">' + sh.lead + '</div>' +
        '<div class="v09-subl">' + sh.sub + '</div>' +
        '<div class="v09-since">One dot for every day you showed up, since ' + md(first) + '.</div>' +
      '</div></div>');

    /* ================= THE LEAD STATEMENT: who you are, by weekday =================
       A weekday pattern needs enough of each weekday to be real. Under four of the
       thinnest one, the page states the sample instead of naming a strongest day. */
    if (!dowSolid) {
      H.push('<div class="v09-say">Your record is <b>' + s.N + ' ' + plur(s.N, 'day', 'days') + '</b> old, and the thinnest weekday has come around ' +
        minSeen + ' ' + plur(minSeen, 'time', 'times') + '. That is too little to name a strongest or weakest day yet.</div>');
    } else if (bi >= 0 && wi >= 0 && spread > 0) {
      H.push('<div class="v09-say"><b>' + K.WDF[bi] + 's</b> are your strongest day at ' + bestPct + '%. ' +
        '<b>' + K.WDF[wi] + 's</b> are your weakest at ' + worstPct + '%. ' + spread + ' points between them.</div>');
    } else {
      H.push('<div class="v09-say">Every weekday lands at ' + bestPct + '%. Nothing separates them.</div>');
    }

    /* ================= 1. YOUR WEEK ================= */
    H.push('<h2>Your week</h2>');
    H.push('<div class="v09-wk">' + ORDER.map(function (d) {
      var p = pc(s.byDow[d], s.dowSeen[d]);
      var a = maxR > 0 && rate[d] >= 0 ? (0.20 + 0.52 * (rate[d] / maxR)) : 0.20;
      return '<div class="v09-wk__r">' +
        '<span class="v09-wk__d">' + K.WDF[d].slice(0, 3) + '</span>' +
        '<span class="v09-wk__t"><u style="width:' + p + '%;background:rgba(var(--accent-rgb),' + a.toFixed(2) + ')"></u></span>' +
        '<b class="v09-wk__p">' + p + '<i>%</i></b>' +
        '<i class="v09-wk__c">' + s.byDow[d] + '/' + s.dowSeen[d] + '</i></div>';
    }).join('') + '</div>');
    H.push('<div class="v09-note">The share of every ' + K.WDF[1] + ', every ' + K.WDF[2] + ' and so on that you showed up. ' +
      'The count on the right is days done out of days that came around.' +
      (minSeen < 6 ? ' Some weekdays have only come around ' + minSeen + ' ' + plur(minSeen, 'time', 'times') + ' so far, so read the shape lightly.' : '') + '</div>');

    /* ================= 2. WEEKDAY AND WEEKEND ================= */
    H.push('<h2>Weekday and weekend</h2>');
    H.push('<div class="ck-tiles ck-tiles--2">' +
      K.tile(wdPct + '%', 'Monday to Friday', wdOn + ' of ' + wdAll + ' days') +
      K.tile(wePct + '%', 'Saturday and Sunday', weOn + ' of ' + weAll + ' days') + '</div>');
    H.push('<div class="ck-rows" style="margin-top:6px">' +
      '<div class="ck-row"><span>Monday to Wednesday</span><b>' + ePct + '%<em>' + eOn + ' of ' + eAll + '</em></b></div>' +
      '<div class="ck-row"><span>Thursday to Sunday</span><b>' + lPct + '%<em>' + lOn + ' of ' + lAll + '</em></b></div>' +
      '</div>');
    /* no superlatives: the weekend split is stated, then measured against the
       single-weekday spread, which is often the wider of the two. */
    H.push('<div class="v09-note">' + (
      drop >= 5 ? 'Your rate falls <b>' + drop + ' ' + plur(drop, 'point', 'points') + '</b> at the weekend.'
      : drop <= -5 ? 'Your rate climbs <b>' + (-drop) + ' ' + plur(-drop, 'point', 'points') + '</b> at the weekend, so the working week is where more of the days go missing.'
      : 'Weekdays and weekends land within ' + Math.abs(drop) + ' ' + plur(Math.abs(drop), 'point', 'points') + ' of each other.'
    ) + (dowSolid && spread > Math.abs(drop)
      ? ' The gap between your best and worst single weekday is wider, at ' + spread + ' points.' : '') + '</div>');

    /* ================= 3. EARLY MONTH, LATE MONTH =================
       A half with no tracked days has no rate. Showing it as 0% invented a
       number and produced a 100 point gap out of nothing, so both halves must
       carry real days before either is drawn. */
    H.push('<h2>Early month, late month</h2>');
    if (h1All < 5 || h2All < 5) {
      H.push('<div class="v09-note">Your record holds <b>' + h1All + '</b> ' + plur(h1All, 'day', 'days') + ' in the first half of a month and <b>' +
        h2All + '</b> in the second. One side is too thin to set against the other yet.</div>');
    } else {
      H.push('<div class="ck-tiles ck-tiles--2">' +
        K.tile(h1Pct + '%', 'Days 1 to 15', h1On + ' of ' + h1All + ' days') +
        K.tile(h2Pct + '%', 'Day 16 onward', h2On + ' of ' + h2All + ' days') + '</div>');
      H.push('<div class="v09-note">' + (
        h1Pct === h2Pct ? 'Both halves of the month come out at ' + h1Pct + '%.'
        : Math.abs(h1Pct - h2Pct) < 6 ? 'Both halves of the month land within ' + Math.abs(h1Pct - h2Pct) + ' ' + plur(Math.abs(h1Pct - h2Pct), 'point', 'points') + ' of each other.'
        : h1Pct > h2Pct ? 'You start months better than you finish them, by <b>' + (h1Pct - h2Pct) + ' points</b>.'
        : 'You finish months better than you start them, by <b>' + (h2Pct - h1Pct) + ' points</b>.'
      ) + '</div>');
    }

    /* ================= 4. WEEK BY WEEK =================
       one column is not a chart, so this waits for a second full week */
    if (wks.length >= 2) {
      H.push('<h2>Week by week</h2>');
      H.push('<div class="v09-wks">' + wks.map(function (w, idx) {
        var hgt = Math.max(4, Math.round(100 * w.on / 7));
        return '<div class="v09-wks__c' + (idx === wks.length - 1 ? ' now' : '') + '">' +
          '<div class="v09-wks__t"><i style="height:' + hgt + '%"></i></div>' +
          '<b>' + w.on + '</b><span>' + w.start.getDate() + '</span></div>';
      }).join('') + '</div>');
      H.push('<div class="v09-note">One column per week from ' + ms(wks[0].start) + ' onward. Top number is days shown up, ' +
        'bottom is the date the week began, and the bright column is the week you are in now, still open. ' +
        'You average <b>' + s.perWeek.toFixed(1) + ' days a week</b> across the whole record.</div>');
    }

    /* ================= 5. WHEN YOU STOP ================= */
    H.push('<h2>When you stop</h2>');
    if (!off.length) {
      H.push('<div class="v09-note">You have not missed a day yet. There is no gap to read.</div>');
    } else {
      H.push('<div class="v09-say" style="margin-top:0;font-size:15px">You have stopped <b>' + off.length + '</b> ' +
        plur(off.length, 'time', 'times') + '. ' + singles + ' of those lasted a single day. ' +
        (longest ? 'The longest ran <b>' + longest.len + ' days</b>, starting ' + md(longest.start) + '.' : '') + '</div>');
      H.push('<div class="ck-tiles" style="margin-top:12px">' +
        K.tile(s.missed, 'days missed', 'of ' + s.N + ' tracked') +
        K.tile(real, plur(real, 'longer break', 'longer breaks'), singles + ' lasted one day') +
        K.tile(avgGap.toFixed(1), 'days per break', 'on average') + '</div>');
      var gmax = longest ? longest.len : 1;
      H.push('<div class="v09-gap" style="margin-top:14px">' + topGaps.map(function (g) {
        return '<div class="v09-gap__r">' +
          '<span class="v09-gap__d">' + ms(g.start) + '</span>' +
          '<span class="v09-gap__t"><u style="width:' + Math.max(6, Math.round(100 * g.len / gmax)) + '%"></u></span>' +
          '<b class="v09-gap__n">' + g.len + '<i>' + plur(g.len, 'day', 'days') + '</i></b></div>';
      }).join('') + '</div>');
      H.push('<div class="v09-note">' +
        (off.length > 5 ? 'Your five longest breaks, longest first.' : 'Every break you have taken, longest first.') +
        (gTies === 1 && gapDow[gi] > 1
          ? ' More of them begin on a <b>' + K.WDF[gi] + '</b> than any other day, ' + gapDow[gi] + ' of ' + off.length + '.'
          : ' No single weekday starts more of them than the rest.') + '</div>');
    }

    /* ================= 6. HOW LONG YOU KEEP GOING =================
       the mirror of the breaks list, read off the same runs in the log */
    H.push('<h2>How long you keep going</h2>');
    var rmax = bestRun ? bestRun.len : 1;
    H.push('<div class="v09-gap v09-gap--on">' + topRuns.map(function (r) {
      return '<div class="v09-gap__r">' +
        '<span class="v09-gap__d">' + ms(r.start) + '</span>' +
        '<span class="v09-gap__t"><u style="width:' + Math.max(6, Math.round(100 * r.len / rmax)) + '%"></u></span>' +
        '<b class="v09-gap__n">' + r.len + '<i>' + plur(r.len, 'day', 'days') + '</i></b></div>';
    }).join('') + '</div>');
    H.push('<div class="v09-note">' +
      (on.length > 5 ? 'Your five longest runs, longest first.'
        : on.length === 1 ? 'Your only run so far.' : 'Every run you have put together, longest first.') +
      ' You have strung together <b>' + on.length + '</b> ' + plur(on.length, 'run', 'runs') + ' in all' +
      (weekRuns ? ', and <b>' + weekRuns + '</b> ' + (weekRuns === 1 ? 'reached' : 'of them reached') + ' a week.'
                : ', none of them a week long yet.') + '</div>');

    /* ================= 7. HOW YOU COME BACK ================= */
    H.push('<h2>How you come back</h2>');
    if (!off.length) {
      H.push('<div class="v09-note">You have not missed a day, so there is nothing here to come back from yet.</div>');
    } else {
      H.push('<div class="ck-rows">' +
        '<div class="ck-row"><span>Times you started again</span><b>' + s.comebacks +
          '<em>' + (resumed === off.length ? 'every break so far' : 'of ' + resumed + ' breaks that ended') + '</em></b></div>' +
        '<div class="ck-row"><span>Back the very next day</span><b>' + singles + '<em>' + pc(singles, off.length) + '% of breaks</em></b></div>' +
        (longest ? '<div class="ck-row"><span>Run straight after your longest break</span><b>' + afterRun + '<em>' + plur(afterRun, 'day', 'days') + '</em></b></div>' : '') +
        (bestRun ? '<div class="ck-row"><span>Longest run began</span><b>' + ms(bestRun.start) + '<em>' + bestRun.len + ' days</em></b></div>' : '') +
        '</div>');
      H.push('<div class="v09-note">' + (
        singles >= Math.ceil(off.length * 0.6)
          ? 'Most of your breaks are one day long. You lose a day and take the next one back.'
          : 'When you stop, it usually takes you more than a night to start again. ' + real + ' of your ' + off.length + ' breaks ran past a single day.'
      ) + '</div>');
    }

    /* ================= 8. MONTH BY MONTH ================= */
    H.push('<h2>Month by month</h2>');
    H.push(K.monthChart(s));
    /* the first month on the record is almost always a stub, and a stub month
       draws a full-height column. Say how few days it stands on. */
    var mFirst = s.months[0];
    if (s.months.length > 1 && mFirst.all < 20) {
      H.push('<div class="v09-note" style="margin-top:9px">' + K.MONF[mFirst.date.getMonth()] + ' holds only <b>' + mFirst.all + '</b> tracked ' +
        plur(mFirst.all, 'day', 'days') + ', so its column stands on less than the rest.</div>');
    }
    H.push('<div class="ck-tiles ck-tiles--2" style="margin-top:14px">' +
      K.tile(tmPct + '%', K.MONF[s.thisMonth.date ? s.thisMonth.date.getMonth() : new Date().getMonth()] + ' so far', s.thisMonth.on + ' of ' + s.thisMonth.all + ' days') +
      (hasLast ? K.tile(lmPct + '%', K.MONF[s.lastMonth.date.getMonth()], s.lastMonth.on + ' of ' + s.lastMonth.all + ' days')
               : K.tile(s.months.length, plur(s.months.length, 'month tracked', 'months tracked'), 'the whole record')) + '</div>');
    if (hasLast) {
      H.push('<div class="v09-note">' + (
        mDelta > 0 ? 'This month is running <b>' + mDelta + ' points</b> above last month, and it is not finished.'
        : mDelta < 0 ? 'This month is running <b>' + (-mDelta) + ' points</b> below last month, and it is not finished.'
        : 'This month is level with last month so far.'
      ) + '</div>');
    }

    /* ================= 9. THE LAST 60 DAYS =================
       s.rPrev30 is 0 when the record is under 60 days old, because there is no
       earlier window, not because nothing happened. Comparing against it read as
       a rise out of nothing, so the comparison only appears once it exists. */
    H.push('<h2>The last ' + win + ' days</h2>');
    H.push('<div class="v09-spark">' + K.sparkline(log, 60, 330, 58) + '</div>');
    var l7 = log.slice(-7).filter(function (d) { return d.on; }).length;
    var p7 = log.length >= 14 ? log.slice(-14, -7).filter(function (d) { return d.on; }).length : null;
    var win7 = Math.min(7, s.N);
    if (s.N <= 7) {
      /* at a week old the record IS the last seven days. Two tiles would print
         the same number twice, so it stays one honest tile. */
      H.push('<div class="ck-tiles" style="grid-template-columns:1fr;margin-top:14px">' +
        K.tile(l7, 'days in the last ' + win7, 'the whole record so far') + '</div>');
    } else {
      var tileA = s.N >= 60
        ? K.tile(s.r30, 'days in the last 30', 'against ' + s.rPrev30 + ' before that ' + K.delta(s.delta30))
        : s.N >= 30
          ? K.tile(s.r30, 'days in the last 30', 'no earlier 30 to set it against yet')
          : K.tile(s.total, 'days on the record', 'across all ' + s.N + ' tracked ' + plur(s.N, 'day', 'days'));
      H.push('<div class="ck-tiles ck-tiles--2" style="margin-top:14px">' + tileA +
        K.tile(l7, 'days in the last 7', p7 === null ? 'the week just gone' : 'against ' + p7 + ' the week before ' + K.delta(l7 - p7)) + '</div>');
    }
    H.push('<div class="v09-note">The line is a rolling seven day average, so a dip is a soft week rather than one bad day.' +
      (s.N < 14 ? ' The record is ' + s.N + ' ' + plur(s.N, 'day', 'days') + ' long, so the line is still finding its level.' : '') + '</div>');

    /* ================= 10. HOW LONG YOU STAY ================= */
    var hiMin = li >= 0 ? Math.round(mSum[li] / mCnt[li]) : 0;
    var loMin = si >= 0 ? Math.round(mSum[si] / mCnt[si]) : 0;
    var mSpread = (li >= 0 && si >= 0) ? hiMin - loMin : 0;
    /* naming a longest and shortest weekday needs the same sample depth the
       weekday rates need, or one session becomes a "pattern" */
    var lenPattern = mSpread >= 6 && dowSolid;
    H.push('<h2>How long you stay</h2>');
    H.push('<div class="ck-rows">' +
      '<div class="ck-row"><span>Average session</span><b>' + s.avgSession + '<em>minutes</em></b></div>' +
      (lenPattern
        ? '<div class="ck-row"><span>Longest sessions land on</span><b>' + K.WDF[li] + '<em>' + hiMin + ' min</em></b></div>' +
          '<div class="ck-row"><span>Shortest land on</span><b>' + K.WDF[si] + '<em>' + loMin + ' min</em></b></div>'
        : (li >= 0 ? '<div class="ck-row"><span>Spread across the weekdays</span><b>' + loMin + ' to ' + hiMin + '<em>minutes</em></b></div>' : '')) +
      '<div class="ck-row"><span>Days of 45 minutes or more</span><b>' + long45 + '<em>of ' + s.total + '</em></b></div>' +
      '<div class="ck-row"><span>Time on the record</span><b>' + K.n(s.hours) + '<em>hours</em></b></div>' +
      '</div>');
    if (!lenPattern && li >= 0) {
      H.push('<div class="v09-note">' + (dowSolid
        ? 'Which day it is barely changes how long you stay, ' + loMin + ' to ' + hiMin + ' minutes across the week.' +
          (spread > 0 ? ' The ' + spread + ' point weekday gap above comes from whether you start at all, not from how long you last.' : '')
        : 'Your sessions run ' + loMin + ' to ' + hiMin + ' minutes. Too few of each weekday so far to say which day runs longest.'
      ) + '</div>');
    }

    /* ================= 11. EVERY DAY SINCE DAY ONE ================= */
    H.push('<h2>Every day since day one</h2>');
    H.push(K.calendarHTML(log));
    H.push('<div class="v09-lg"><span><i class="a"></i>you showed up</span>' +
      '<span><i class="b"></i>support only</span><span><i class="c"></i>nothing</span></div>');

    /* ================= 12. THIS MONTH ================= */
    H.push('<h2>This month</h2>');
    H.push(K.monthGrid(log));

    /* ================= 13. AROUND THE WORK ================= */
    H.push('<h2>Around the work</h2>');
    H.push(K.supportRows(s));
    H.push('<div class="v09-note">' + (s.supDays
      ? 'On <b>' + s.supDays + '</b> ' + plur(s.supDays, 'day', 'days') +
        ' you did not make the main move but still opened Memento and did something. Those are the pale cells in the calendar.'
      : 'There is no day yet where you opened Memento, did something around the edges, and still missed the main move. Every day on the record is done or empty.'
    ) + '</div>');

    /* ================= 14. THE TOTALS (last, on purpose) ================= */
    H.push('<div class="v09-hr"></div>');
    H.push('<h2>The totals</h2>');
    H.push('<div class="ck-tiles">' +
      K.tile(s.total, 'days shown up', 'of ' + K.n(s.N) + ' tracked') +
      K.tile(s.missed, 'days missed', s.missed ? s.gaps + ' separate ' + plur(s.gaps, 'break', 'breaks') : 'no break so far') +
      K.tile(sh.ctx.v, sh.ctx.l) + '</div>');
    H.push('<div class="ck-rows" style="margin-top:6px">' +
      (ctx.shape === 'open' ? '' : '<div class="ck-row"><span>Share of every day since the start</span><b>' + s.rate + '%</b></div>') +
      '<div class="ck-row"><span>Current run</span><b>' + s.current + '<em>' + plur(s.current, 'day', 'days') + '</em></b></div>' +
      '<div class="ck-row"><span>Best run</span><b>' + s.best + '<em>' + plur(s.best, 'day', 'days') + '</em></b></div>' +
      '<div class="ck-row"><span>Days a week, all time</span><b>' + s.perWeek.toFixed(1) + '</b></div>' +
      '<div class="ck-row"><span>First day on the record</span><b>' + ms(first) + '<em>' + first.getFullYear() + '</em></b></div>' +
      '</div>');

    H.push('<div class="cx__foot">Every day here is a day that happened.<br>A missed day stays a missed day.</div>');

    return '<div class="cx">' + H.join('') + '</div>';
  }
};
