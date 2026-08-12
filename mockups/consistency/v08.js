/* v08. THE TIMELINE
   The record read chronologically. The bloom on top is the whole journey
   accumulated; below it the page walks backward through time, one chapter per
   month with its own real numbers and a compact visual, down to day one at the
   bottom. The length of the scroll IS the evidence. */
window.CVAR = window.CVAR || {};
window.CVAR['v08'] = {
  name: 'The timeline',
  note: 'The record as a chronological scroll: today at the top, one chapter per month with its own numbers and day strip, ending at the day you started.',
  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;
    var DAY = 86400000;
    var N = log.length;
    var today = log[N - 1].date;
    var startDate = log[0].date;

    /* ---------------- helpers ---------------- */
    function long(d) { return K.MONF[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
    function short(d) { return K.MON[d.getMonth()] + ' ' + d.getDate(); }
    function num(v) { return K.n(v); }
    function plural(n_, one, many) { return n_ === 1 ? one : many; }
    function hoursOf(min) { return min >= 60 ? Math.round(min / 60) + 'h' : Math.round(min) + 'm'; }
    function pctOf(a, b) { return b ? Math.round(100 * a / b) : 0; }
    function isSup(d) { for (var k in d.sup) { if (d.sup[k]) return true; } return false; }

    /* ---------------- month chapters, computed from the log ---------------- */
    var months = [], cur = null;
    log.forEach(function (d) {
      var key = d.date.getFullYear() + '-' + d.date.getMonth();
      if (!cur || cur.key !== key) {
        cur = { key: key, y: d.date.getFullYear(), m: d.date.getMonth(), days: [],
                on: 0, all: 0, min: 0, best: 0, gap: 0, _run: 0, _gap: 0,
                first: d.date, last: d.date };
        months.push(cur);
      }
      cur.days.push(d); cur.all++; cur.last = d.date;
      if (d.on) {
        cur.on++; cur.min += d.minutes; cur._run++;
        if (cur._run > cur.best) cur.best = cur._run;
        if (cur._gap > cur.gap) cur.gap = cur._gap;
        cur._gap = 0;
      } else {
        cur._run = 0; cur._gap++;
        if (cur._gap > cur.gap) cur.gap = cur._gap;
      }
    });
    months.forEach(function (m, i) {
      m.pct = pctOf(m.on, m.all);
      m.dpp = i > 0 ? m.pct - months[i - 1].pct : null;
      m.prevLabel = i > 0 ? K.MON[months[i - 1].m] : '';
    });

    /* one honest note per month, and only where a note is actually true.
       The break note only fires on the month that actually holds the record
       gap, so it can never contradict the ledger further down. */
    var pool = months.filter(function (m) { return m.all >= 10; });
    if (pool.length < 2) pool = months;
    var hi = null, lo = null, wide = null;
    if (months.length >= 3) {
      pool.forEach(function (m) {
        if (!hi || m.pct > hi.pct) hi = m;
        if (!lo || m.pct < lo.pct) lo = m;
      });
      if (s.longestGap >= 3) {
        for (var wi = 0; wi < months.length; wi++) {
          if (months[wi].gap === s.longestGap) { wide = months[wi]; break; }
        }
      }
      /* a "highest" or "lowest" claim only stands when it is not a tie */
      if (hi && pool.filter(function (m) { return m.pct === hi.pct; }).length > 1) hi = null;
      if (lo && pool.filter(function (m) { return m.pct === lo.pct; }).length > 1) lo = null;
      if (hi && lo && hi.key === lo.key) lo = null;
    }
    function noteFor(m) {
      if (wide && m.key === wide.key) return 'The longest break in the record sits in this month: ' + wide.gap + ' days with nothing logged.';
      if (hi && m.key === hi.key) return 'Highest rate of any month you have tracked.';
      if (lo && m.key === lo.key) return 'Lowest rate of any month you have tracked.';
      if (m === months[0]) return 'The record begins inside this month.';
      return '';
    }

    /* the compact per-month day strip: one tick per day, weeks visibly split */
    function strip(m) {
      var cells = m.days.map(function (d) {
        var c = d.on ? 'on' : (isSup(d) ? 'sup' : 'off');
        if (d.date.getDay() === 1) c += ' w';
        return '<b class="' + c + '" title="' + d.key + '"></b>';
      }).join('');
      return '<div class="v08-strip">' + cells + '</div>';
    }

    /* ---------------- extra real numbers, all derived from the log ---------------- */
    var onLog = function (d) { return d.on; };
    var f30 = log.slice(0, 30).filter(onLog).length;
    var f30a = log[0].date, f30b = log[Math.min(29, N - 1)].date;
    var l30a = log[Math.max(0, N - 30)].date, l30b = today;
    var swing = s.r30 - f30;
    var swingLine = swing > 0
      ? swing + ' more ' + plural(swing, 'day', 'days') + ' than in the same length of window at the start.'
      : swing < 0
        ? Math.abs(swing) + ' fewer ' + plural(Math.abs(swing), 'day', 'days') + ' than in the same length of window at the start.'
        : 'Exactly the same count as the window you started with.';

    var weekAvg = s.perWeek.toFixed(1).replace(/\.0$/, '');
    var last4 = s.last4Rate.toFixed(1).replace(/\.0$/, '');

    /* ---------------- the page ---------------- */
    var h = [];

    h.push('<style>' +
      '.v08-lead{font-size:13px;line-height:1.55;color:var(--text-mid);margin:-2px 0 12px}' +
      '.v08-cap{font-size:12.5px;line-height:1.5;color:var(--text-mid);margin:10px 2px 0}' +

      /* the spine */
      '.v08-tl{position:relative;padding-left:26px;margin-top:2px}' +
      '.v08-tl::before{content:"";position:absolute;left:7px;top:4px;bottom:8px;width:1px;' +
        'background:linear-gradient(180deg,rgba(var(--ink),0) 0,var(--hairline) 20px,var(--hairline) calc(100% - 24px),rgba(var(--ink),0) 100%)}' +
      '.v08-node{position:relative;padding-bottom:16px}' +
      '.v08-node:last-child{padding-bottom:0}' +
      '.v08-dot{position:absolute;left:-23px;top:16px;width:9px;height:9px;border-radius:50%;background:rgba(var(--ink),.28)}' +
      '.v08-node--now .v08-dot{top:15px;background:var(--accent);box-shadow:0 0 0 4px rgba(var(--accent-rgb),.13)}' +
      '.v08-node--one .v08-dot{top:15px;background:transparent;box-shadow:inset 0 0 0 2px rgba(var(--ink),.36)}' +

      /* a chapter card */
      '.v08-card{background:var(--fill-1);box-shadow:var(--inset);border-radius:14px;padding:13px 13px 12px}' +
      '.v08-h{display:flex;align-items:baseline;gap:7px}' +
      '.v08-h b{font-size:15.5px;font-weight:700;letter-spacing:-.02em}' +
      '.v08-h i{font-style:normal;font-size:12px;color:var(--text-mid);font-variant-numeric:tabular-nums}' +
      '.v08-h span{margin-left:auto;font-size:11.5px;color:var(--text-mid);font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '.v08-h em{font-style:normal;font-weight:700}' +
      '.v08-h em.up{color:var(--accent)}' +
      '.v08-h em.down{color:rgba(var(--ink),.58)}' +
      '.v08-h em.flat{color:var(--text-mid)}' +
      '.v08-l{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:2px 0 11px}' +
      '.v08-l span{font-size:12.5px;color:var(--text-mid);font-variant-numeric:tabular-nums}' +
      '.v08-l b{font-size:17px;font-weight:750;letter-spacing:-.025em;font-variant-numeric:tabular-nums}' +

      /* the day strip */
      '.v08-strip{display:flex;gap:3px;height:26px}' +
      /* a tick keeps the same scale in every chapter, so a part month (the one
         the record starts in) reads as a short strip instead of a few fat bars */
      '.v08-strip b{flex:1 1 0;min-width:0;max-width:9px;border-radius:2.5px;background:rgba(var(--ink),.055)}' +
      '.v08-strip b.sup{background:rgba(var(--accent-rgb),.22)}' +
      '.v08-strip b.on{background:rgba(var(--accent-rgb),.62)}' +
      '.v08-strip b.w{margin-left:3px}' +
      '.v08-strip b:first-child.w{margin-left:0}' +

      /* the facts line under each chapter */
      '.v08-facts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:11px;' +
        'font-size:11.5px;color:var(--text-mid);font-variant-numeric:tabular-nums}' +
      '.v08-facts u{text-decoration:none;flex:0 0 auto;width:2px;height:2px;border-radius:50%;background:rgba(var(--ink),.3)}' +
      '.v08-note{margin-top:10px;padding-top:10px;border-top:1px solid var(--hairline);' +
        'font-size:12px;line-height:1.45;color:var(--text-mid)}' +

      /* today + day one */
      '.v08-now__r{display:flex;align-items:baseline;gap:8px;margin-top:8px}' +
      '.v08-now__r b{font-size:26px;font-weight:750;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums;color:var(--accent)}' +
      '.v08-now__r span{font-size:12.5px;color:var(--text-mid)}' +
      '.v08-now p,.v08-one p{margin:7px 0 0;font-size:12.5px;line-height:1.5;color:var(--text-mid)}' +
      '.v08-one{padding-bottom:2px}' +

      /* first window vs last window */
      '.v08-cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.v08-cmp__c{background:var(--fill-1);box-shadow:var(--inset);border-radius:12px;padding:12px 12px 11px}' +
      '.v08-cmp__c b{display:block;font-size:26px;font-weight:750;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}' +
      '.v08-cmp__c span{display:block;font-size:11.5px;color:var(--text-mid);margin-top:6px;line-height:1.35}' +
      '.v08-cmp__c i{display:block;font-style:normal;font-size:10.5px;color:var(--text-lo);margin-top:4px;font-variant-numeric:tabular-nums}' +
      '.v08-cmp__c.now b{color:var(--accent)}' +
    '</style>');

    /* 1. header + the accumulated bloom */
    h.push('<div class="cx__top"><div class="cx__title">Consistency</div>' +
      '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>');

    h.push('<div class="ck-bloomwrap">' + K.bloomSVG(s.total, { size: s.total >= 24 ? 306 : 234, animate: true }) + '</div>');
    h.push('<div style="text-align:center;margin-top:8px">' +
      '<div class="ck-n ck-n--hero">' + sh.lead + '</div>' +
      '<div class="ck-u">' + sh.sub + '</div></div>');
    h.push('<div class="ck-micro">' + num(s.total) + ' seeds, one for every day you showed up, since ' +
      long(s.firstOn || startDate) + '.</div>');

    /* 2. the record at a glance. Whatever number the goal shape already
       contributes drops out of this row, so the same figure is never printed
       twice under two different labels (the maintenance shape carries the best
       run, the open shape carries the rate). */
    var ctxV = String(sh.ctx.v);
    var row1 = [K.tile(s.total, 'days shown up')];
    if (ctxV !== String(s.best)) row1.push(K.tile(s.best, 'best run', plural(s.best, 'day in a row', 'days in a row')));
    if (ctxV !== s.rate + '%') row1.push(K.tile(s.rate + '%', 'of all days'));
    h.push('<h2>The record</h2>');
    h.push('<div class="ck-tiles' + (row1.length === 2 ? ' ck-tiles--2' : '') + '">' + row1.join('') + '</div>');
    h.push('<div class="ck-tiles ck-tiles--2" style="margin-top:8px">' +
      K.tile(sh.ctx.v, sh.ctx.l) +
      K.tile(s.missed, 'days missed', s.missed ? 'drawn at full size below' : 'none yet') +
    '</div>');

    /* 3. lately. Everything here states the window it is actually built on,
       so a short record never borrows length it does not have. */
    var hasPrev30 = N >= 60;
    var sparkDays = Math.min(60, N);
    var win30 = Math.min(30, N);
    var wkCount = s.weeks.length;
    h.push('<h2>Lately</h2>');
    if (N >= 21) {
      h.push(K.sparkline(log, sparkDays, 330, 46));
      h.push('<div class="ck-tiles ck-tiles--2" style="margin-top:10px">' +
        '<div class="ck-tile"><b>' + s.r30 + (hasPrev30 ? K.delta(s.delta30) : '') + '</b><span>in the last ' + win30 + ' days</span><i>' +
          (hasPrev30 ? s.rPrev30 + ' the 30 before that' : 'no earlier window to compare with yet') + '</i></div>' +
        K.tile(last4, 'days a week', wkCount >= 4 ? 'average of the last four weeks'
          : 'average of the ' + wkCount + ' ' + plural(wkCount, 'week', 'weeks') + ' so far') +
      '</div>');
      h.push('<div class="v08-cap">The line is a rolling seven day average across the last ' + sparkDays +
        ' days. It moves the way your weeks actually moved.</div>');
    } else {
      h.push('<div class="ck-tiles ck-tiles--2">' +
        K.tile(s.total, 'days so far', 'out of ' + N + ' in the record') +
        K.tile(last4, 'days a week', 'average of the ' + wkCount + ' ' + plural(wkCount, 'week', 'weeks') + ' so far') +
      '</div>');
      h.push('<div class="ck-locked" style="margin-top:8px">A rolling rate line needs about three weeks of record before it means anything. The record is ' + N + ' ' + plural(N, 'day', 'days') + ' old.</div>');
    }

    /* 4. the whole span, compressed. Only worth drawing once there are
       several months to compare. */
    if (s.months.length >= 3) {
      h.push('<h2>Every month at a glance</h2>');
      h.push(K.monthChart(s));
      h.push('<div class="v08-cap">' + (s.months.length > 12 ? 'The last 12 months' : 'Every month in the record') +
        ', oldest on the left. The number is the share of that month you showed up.</div>');
    }

    /* 5. THE TIMELINE */
    h.push('<h2>The timeline</h2>');
    h.push('<div class="v08-lead">Newest first. One chapter per month, all the way down to the day you started.</div>');

    var tl = [];

    /* today */
    var todayOn = log[N - 1].on;
    tl.push('<div class="v08-node v08-node--now"><div class="v08-dot"></div>' +
      '<div class="v08-card v08-now">' +
        '<div class="v08-h"><b>Today</b><i>' + K.WDF[today.getDay()] + ', ' + short(today) + '</i></div>' +
        (todayOn
          ? '<div class="v08-now__r"><b>' + s.current + '</b><span>' + plural(s.current, 'day', 'days') + ' unbroken, counting today</span></div>' +
            '<p>You moved today, so this chapter is still open.</p>'
          : '<p>Nothing logged yet today. The day is still in front of you.</p>') +
      '</div></div>');

    /* month chapters, newest first */
    for (var i = months.length - 1; i >= 0; i--) {
      var m = months[i];
      var newest = (i === months.length - 1);
      var vis = newest ? K.monthGrid(log) : strip(m);
      var note = noteFor(m);
      var facts = [];
      facts.push('best run ' + m.best + ' ' + plural(m.best, 'day', 'days'));
      facts.push((m.all - m.on) + ' missed');
      facts.push(hoursOf(m.min) + ' logged');
      var factHTML = facts.map(function (f, k) { return (k ? '<u></u>' : '') + '<span>' + f + '</span>'; }).join('');
      var swingTag = m.dpp === null ? ''
        : m.dpp === 0 ? '<span><em class="flat">even</em> with ' + m.prevLabel + '</span>'
        : '<span>' + K.delta(m.dpp) + ' pts vs ' + m.prevLabel + '</span>';

      tl.push('<div class="v08-node"><div class="v08-dot"></div>' +
        '<div class="v08-card">' +
          '<div class="v08-h"><b>' + K.MONF[m.m] + '</b><i>' + m.y + '</i>' + swingTag + '</div>' +
          '<div class="v08-l"><span>' + m.on + ' of ' + m.all + ' ' + plural(m.all, 'day', 'days') +
            (newest || i === 0 ? ', ' + short(m.first) + ' to ' + short(m.last) : '') + '</span><b>' + m.pct + '%</b></div>' +
          vis +
          '<div class="v08-facts">' + factHTML + '</div>' +
          (note ? '<div class="v08-note">' + note + '</div>' : '') +
        '</div></div>');
    }

    /* day one */
    var daysAgo = Math.round((today - startDate) / DAY);
    tl.push('<div class="v08-node v08-node--one"><div class="v08-dot"></div>' +
      '<div class="v08-card v08-one">' +
        '<div class="v08-h"><b>Day one</b><i>' + long(startDate) + '</i></div>' +
        (daysAgo === 0
          ? '<p>The record starts today. Everything above this line gets built one day at a time.</p>'
          : '<p>The first day in the record, ' + num(daysAgo) + ' ' + plural(daysAgo, 'day', 'days') + ' back. ' +
            'Everything above it was built one day at a time.</p>') +
      '</div></div>');

    h.push('<div class="v08-tl">' + tl.join('') + '</div>');

    /* 6. the two ends of the timeline, compared */
    h.push('<h2>The start against now</h2>');
    if (N >= 60) {
      h.push('<div class="v08-cmp">' +
        '<div class="v08-cmp__c"><b>' + f30 + '</b><span>of your first 30 days</span><i>' + short(f30a) + ' to ' + short(f30b) + '</i></div>' +
        '<div class="v08-cmp__c now"><b>' + s.r30 + '</b><span>of your last 30 days</span><i>' + short(l30a) + ' to ' + short(l30b) + '</i></div>' +
      '</div>');
      h.push('<div class="v08-cap">' + swingLine + '</div>');
    } else {
      h.push('<div class="ck-locked">The record needs 60 days before your first 30 can be compared with your last 30. You are at ' + N + ' ' + plural(N, 'day', 'days') + '.</div>');
    }

    /* 7. weekday rhythm. Held back until every weekday has been seen enough
       times to say anything true. */
    h.push('<h2>Your rhythm</h2>');
    if (N >= 28) {
      h.push(K.dowChart(s));
      h.push('<div class="v08-cap">' +
        (s.bestDow !== s.worstDow
          ? K.WDF[s.bestDow] + ' is the weekday you have shown up on most often, ' + K.WDF[s.worstDow] + ' the least. The number on each bar is the share of that weekday you moved.'
          : 'The number on each bar is the share of that weekday you moved.') +
      '</div>');
    } else {
      h.push('<div class="ck-locked">Four weeks is the shortest window that can tell a weekday habit from a coincidence. You have logged ' + N + ' ' + plural(N, 'day', 'days') + '.</div>');
    }

    /* 8. the breaks */
    h.push('<h2>The breaks</h2>');
    if (s.missed > 0) {
      var avgBreak = (s.missed / s.gaps).toFixed(1).replace(/\.0$/, '');
      h.push('<div class="ck-rows">' +
        '<div class="ck-row"><span>Days missed</span><b>' + num(s.missed) + '</b></div>' +
        '<div class="ck-row"><span>Separate breaks</span><b>' + num(s.gaps) + '</b></div>' +
        '<div class="ck-row"><span>Average break</span><b>' + avgBreak + '<em>' + plural(Number(avgBreak), 'day', 'days') + '</em></b></div>' +
        '<div class="ck-row"><span>Longest break</span><b>' + s.longestGap + '<em>' + plural(s.longestGap, 'day', 'days') + '</em></b></div>' +
        '<div class="ck-row"><span>Missed in the last ' + win30 + ' days</span><b>' + (win30 - s.r30) + '</b></div>' +
        '<div class="ck-row"><span>Running right now</span><b>' + s.current + '<em>' + plural(s.current, 'day', 'days') + '</em></b></div>' +
      '</div>');
      h.push('<div class="v08-cap">Every one of those breaks is drawn in the timeline at full length, the same width as the days you showed up.</div>');
    } else {
      h.push('<div class="ck-locked">No missed days in the record yet. When one lands it gets drawn in the timeline at full size, the same as any other day.</div>');
    }

    /* 9. time on the work */
    h.push('<h2>Time on the work</h2>');
    h.push('<div class="ck-tiles">' +
      K.tile(s.hours, 'hours logged', 'across ' + num(s.total) + ' days') +
      K.tile(s.avgSession, 'minutes', 'in an average session') +
      K.tile(weekAvg, 'days a week', 'over the whole record') +
    '</div>');

    /* 10. support activities */
    h.push('<h2>Life around the work</h2>');
    h.push(K.supportRows(s));
    if (s.supDays > 0) {
      h.push('<div class="v08-cap">' +
        (s.missed === 1
          ? 'The one day you missed still had something logged.'
          : s.supDays + ' of the ' + num(s.missed) + ' days you missed still had something logged.') +
        ' Those are the faint ticks in the strips above. They do not count as showing up.</div>');
    }

    /* 11. the closing ledger */
    h.push('<h2>The whole record in numbers</h2>');
    h.push('<div class="ck-rows">' +
      '<div class="ck-row"><span>First day in the record</span><b>' + short(startDate) + '<em>' + startDate.getFullYear() + '</em></b></div>' +
      '<div class="ck-row"><span>Days in the record</span><b>' + num(N) + '</b></div>' +
      '<div class="ck-row"><span>Months with a chapter</span><b>' + months.length + '</b></div>' +
      '<div class="ck-row"><span>Weeks tracked</span><b>' + s.weeks.length + '</b></div>' +
      '<div class="ck-row"><span>Weeks with ' + s.cadence + ' or more days</span><b>' + s.metWeeks + '<em>of ' + s.weeks.length + '</em></b></div>' +
      '<div class="ck-row"><span>Last day you moved</span><b>' + short(s.lastOn || today) + '</b></div>' +
      '<div class="ck-row"><span>Share of all days</span><b>' + s.rate + '%</b></div>' +
    '</div>');

    h.push('<div class="cx__foot">Every chapter above is drawn from the same log as the bloom.<br>Nothing on this page is rounded in your favour.</div>');

    return '<div class="cx">' + h.join('') + '</div>';
  }
};
