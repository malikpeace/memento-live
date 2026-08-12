/* v04, THE ALMANAC
   Calendar-forward. The bloom opens the page small, then TIME takes over: this
   month large and legible, then every month before it as a smaller grid, newest
   first, all sharing seven columns so the weeks line up straight down the page.
   Statistics are woven between the months as short blocks. Scrolling down is
   walking backwards through the record. */
(function () {
  'use strict';
  window.CVAR = window.CVAR || {};

  window.CVAR['v04'] = {
    name: 'The Almanac',
    note: 'A calendar page. This month big at the top, every earlier month stacked below it in the same seven columns, statistics woven in between. Built for someone who remembers by date.',

    render: function (ctx) {
      var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;
      var MONF = K.MONF, WD = K.WD, WDF = K.WDF, n = K.n;

      /* ---------------- date plumbing ---------------- */
      var pad2 = function (v) { v = String(v); return v.length < 2 ? '0' + v : v; };
      var mk = function (y, m, dd) { return y + '-' + pad2(m + 1) + '-' + pad2(dd); };
      var dim = function (y, m) { return new Date(y, m + 1, 0).getDate(); };
      var longDate = function (d) { return MONF[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };

      var map = {};
      log.forEach(function (d) { map[d.key] = d; });
      var firstD = log[0].date, lastD = log[log.length - 1].date;
      var lastKey = log[log.length - 1].key;
      var todayOn = log[log.length - 1].on;

      /* every month the record touches, oldest to newest */
      var months = [], cy = firstD.getFullYear(), cm = firstD.getMonth();
      var ey = lastD.getFullYear(), em = lastD.getMonth();
      while (cy < ey || (cy === ey && cm <= em)) {
        months.push({ y: cy, m: cm });
        cm++; if (cm > 11) { cm = 0; cy++; }
      }

      function info(mo) {
        var D = dim(mo.y, mo.m), on = 0, all = 0, off = 0, sup = 0,
            run = 0, best = 0, gap = 0, lgap = 0, mins = 0, start = 0;
        for (var dd = 1; dd <= D; dd++) {
          var e = map[mk(mo.y, mo.m, dd)];
          if (!e) continue;
          if (!start) start = dd;
          all++;
          if (e.on) { on++; run++; if (run > best) best = run; gap = 0; mins += e.minutes; }
          else {
            run = 0; gap++; if (gap > lgap) lgap = gap; off++;
            if (Object.keys(e.sup).length) sup++;
          }
        }
        return {
          y: mo.y, m: mo.m, D: D, on: on, all: all, off: off, sup: sup,
          best: best, lgap: lgap, mins: mins, start: start,
          pct: all ? Math.round(100 * on / all) : 0, partial: all < D
        };
      }

      function grid(mo, big) {
        var D = dim(mo.y, mo.m), lead = new Date(mo.y, mo.m, 1).getDay(), out = '';
        for (var i = 0; i < lead; i++) out += '<b class="pad"></b>';
        for (var dd = 1; dd <= D; dd++) {
          var k = mk(mo.y, mo.m, dd), e = map[k], cls;
          if (!e) cls = (k > lastKey) ? 'fut' : 'pre';
          else if (e.on) cls = 'on';
          else if (Object.keys(e.sup).length) cls = 'sup';
          else cls = 'off';
          if (k === lastKey) cls += ' today';
          var t = WDF[new Date(mo.y, mo.m, dd).getDay()] + ', ' + MONF[mo.m] + ' ' + dd;
          out += '<b class="' + cls + '" title="' + t + '">' + (big ? dd : '') + '</b>';
        }
        return '<div class="' + (big ? 'v04-gbig' : 'v04-g') + '">' + out + '</div>';
      }

      var cur = info(months[months.length - 1]);
      var prev = months.length > 1 ? info(months[months.length - 2]) : null;

      function dowPct(i) { return s.dowSeen[i] ? Math.round(100 * s.byDow[i] / s.dowSeen[i]) : 0; }
      var bd = s.bestDow >= 0 ? s.bestDow : 0;
      var wd = s.worstDow >= 0 ? s.worstDow : 0;

      /* ---------------- page ---------------- */
      var H = '';

      H += '<style>' + CSS + '</style>';

      H += '<div class="cx__top"><div class="cx__title">Consistency</div>' +
           '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></div></div>';

      /* the dateline: an almanac opens by telling you what day it is */
      H += '<div class="v04-date">' +
             '<div class="v04-date__l"><b>' + WDF[lastD.getDay()] + '</b>' +
               '<span>' + longDate(lastD) + '</span></div>' +
             '<div class="v04-date__r"><b>Day ' + n(s.N) + '</b><span>of the record</span></div>' +
           '</div>';

      /* the bloom, compact, with the shape line beside it */
      H += '<div class="v04-hero">' +
             '<div class="v04-hero__b">' + K.bloomSVG(s.total, { size: 130, animate: true }) + '</div>' +
             '<div class="v04-hero__t">' +
               '<div class="ck-n ck-n--mid">' + sh.lead + '</div>' +
               '<div class="ck-u">' + sh.sub + '</div>' +
               '<div class="v04-hero__c"><b>' + n(sh.ctx.v) + '</b> ' + sh.ctx.l + '</div>' +
             '</div>' +
           '</div>';

      H += '<p class="v04-say">' + (s.total === 1
             ? 'One seed, for the one day you have shown up so far. '
             : 'One seed for every day you showed up, ' + n(s.total) + ' of them, newest one lit. ') +
           (todayOn ? 'Today is already on the board.' : 'Today is not on the board yet.') + '</p>';

      H += '<div class="v04-rule"></div>';

      /* ---------------- this month, large ---------------- */
      H += '<div class="v04-mhead"><b>' + MONF[cur.m] + ' ' + cur.y + '</b>' +
           '<span>' + cur.on + ' of ' + cur.all + ' days so far</span></div>';
      H += '<div class="v04-wkbig">' + WD.map(function (w) { return '<i>' + w + '</i>'; }).join('') + '</div>';
      H += grid(months[months.length - 1], true);

      H += '<div class="v04-key">' +
             '<span><i class="on"></i>Showed up</span>' +
             '<span><i class="sup"></i>Check-in only</span>' +
             '<span><i class="off"></i>Missed</span>' +
           '</div>';

      H += '<p class="v04-say">' + missedLine() + outsideLine() + '</p>';

      /* a partial previous month never "closed at" a rate, it only ran a few days */
      var prevSub = null;
      if (prev) {
        prevSub = prev.partial
          ? K.MON[prev.m] + ': ' + prev.pct + '% of its ' + prev.all + ' tracked days'
          : K.MON[prev.m] + ' closed at ' + prev.pct + '%';
      }

      H += '<div class="ck-tiles" style="margin-top:12px">' +
             K.tile(cur.pct + '%', 'of the month so far', prevSub) +
             K.tile(cur.best, 'best run this month', 'days in a row') +
             K.tile(s.current, 'in the current run', s.current ? 'still going' : 'nothing going right now') +
           '</div>';

      /* an almanac names the dates it lost */
      function missedLine() {
        var out = [];
        for (var dd = 1; dd <= cur.D; dd++) {
          var e = map[mk(cur.y, cur.m, dd)];
          if (e && !e.on) out.push(dd);
        }
        if (!out.length) return 'Nothing missed in ' + MONF[cur.m] + ' yet.';
        var list = out.length === 1 ? String(out[0]) :
          out.slice(0, -1).join(', ') + ' and ' + out[out.length - 1];
        return 'Missed so far: ' + MONF[cur.m] + ' ' + list + '.';
      }

      /* the blank cells are not misses, so say exactly what they are */
      function outsideLine() {
        if (!cur.start) return '';
        var before = cur.start - 1, after = cur.D - before - cur.all, parts = [];
        if (before > 0) parts.push(before + (before === 1 ? ' day' : ' days') + ' before the record started');
        if (after > 0) parts.push(after + (after === 1 ? ' day' : ' days') + ' the month has not reached yet');
        if (!parts.length) return '';
        return ' The blank cells are ' + parts.join(' and ') + '.';
      }

      /* ---------------- the weaves ---------------- */
      var W = {};

      /* the record is only s.N days long: never compare against days that do not exist */
      var win30 = Math.min(30, s.N);
      var prevWin = Math.min(30, Math.max(0, s.N - 30));
      var fullPrev = s.N >= 60;
      var line30 = 'The line is a rolling seven day average across the last ' + Math.min(60, s.N) + ' days. ';
      if (fullPrev) {
        line30 += s.delta30 === 0
          ? 'Against the 30 days before this window, the count is ' + K.delta(0) + '.'
          : 'Against the 30 days before this window, that is ' + K.delta(s.delta30) + ' days.';
      } else if (prevWin) {
        line30 += 'Only ' + prevWin + (prevWin === 1 ? ' day sits' : ' days sit') +
                  ' before this window, too few to hold it against.';
      } else {
        line30 += 'There is no earlier window to hold it against yet.';
      }

      W[1] = '<div class="v04-weave"><h3>The last ' + win30 + ' days</h3>' +
             K.sparkline(log, 60, 320, 46) +
             '<div class="ck-tiles ck-tiles--2" style="margin-top:12px">' +
               K.tile(s.r30, 'of the last ' + win30 + ' days',
                      fullPrev ? 'the 30 before: ' + s.rPrev30 : 'days you showed up') +
               K.tile(s.longestGap, 'longest gap ever', s.longestGap ? 'days in a row missed' : 'you have not missed one') +
             '</div>' +
             '<p>' + line30 + '</p></div>';

      /* one sample per weekday is not a weekday pattern, so do not claim one */
      var seenMax = Math.max.apply(null, s.dowSeen);
      var dowLine;
      if (seenMax < 3) {
        dowLine = 'Every weekday has come around at most <b>' + seenMax + '</b> ' +
                  (seenMax === 1 ? 'time' : 'times') + ' so far. That is too few to call a weekday pattern.';
      } else if (dowPct(bd) === dowPct(wd)) {
        dowLine = 'Every weekday you have seen sits at <b>' + dowPct(bd) + '%</b>. No weekday stands out yet.';
      } else {
        dowLine = WDF[bd] + ' is your strongest day, you show up on <b>' + dowPct(bd) + '%</b> of them. ' +
                  WDF[wd] + ' is the one that slips, <b>' + dowPct(wd) + '%</b>.';
      }

      W[2] = '<div class="v04-weave"><h3>Which days you actually keep</h3>' +
             K.dowChart(s) + '<p>' + dowLine + '</p></div>';

      /* few months means the kit's columns stretch into slabs, so cap the width */
      var mchart = K.monthChart(s);
      if (s.months.length < 6) mchart = '<div style="max-width:' + (s.months.length * 46) + 'px">' + mchart + '</div>';

      W[3] = '<div class="v04-weave"><h3>Month against month</h3>' + mchart +
             '<p>' + monthCompare() + '</p></div>';

      var breakLine = s.gaps === 0
        ? 'The run has not broken once. Every day in the record is a day you showed up.'
        : n(s.missed) + ' missed days fall into <b>' + s.gaps + '</b> separate ' +
          (s.gaps === 1 ? 'stretch' : 'stretches') + ', the longest <b>' + s.longestGap +
          '</b> days long. You started again after <b>' + s.comebacks + '</b> of them.';

      W[4] = '<div class="v04-weave"><h3>Breaks and returns</h3>' +
             '<div class="ck-tiles">' +
               K.tile(s.gaps, s.gaps === 1 ? 'time the run broke' : 'times the run broke') +
               K.tile(s.longestGap, 'longest gap', 'days in a row') +
               K.tile(s.comebacks, s.comebacks === 1 ? 'time you came back' : 'times you came back') +
             '</div>' +
             '<p>' + breakLine + '</p></div>';

      /* weeks come straight off the kit's Monday split, last twelve so the bars stay wide enough to read */
      var wks = s.weeks.slice(-12);
      var curWk = s.weeks[s.weeks.length - 1];
      var bestWk = s.weeks.reduce(function (a, w) { return w.on > a.on ? w : a; }, s.weeks[0]);
      var wbars = '<div class="ck-mo">' + wks.map(function (w) {
        return '<div class="ck-mo__c"><div class="ck-mo__t"><i style="height:' +
               Math.max(3, Math.round(100 * w.on / 7)) + '%"></i></div>' +
               '<b>' + w.on + '</b><span>' + w.start.getDate() + '</span></div>';
      }).join('') + '</div>';
      /* a full twelve weeks gives ~27px columns, so hold that width when there are
         fewer rather than letting two weeks stretch into slabs */
      if (wks.length < 12) wbars = '<div style="max-width:' + (wks.length * 30) + 'px">' + wbars + '</div>';

      W[6] = '<div class="v04-weave"><h3>Week by week</h3>' + wbars +
             '<div class="ck-tiles ck-tiles--2" style="margin-top:13px">' +
               K.tile(bestWk.on, 'best week', 'days in one week') +
               K.tile(curWk.on, 'this week so far', curWk.all + (curWk.all === 1 ? ' day in' : ' days in')) +
             '</div>' +
             '<p>One bar a week, counting from Monday, for the last ' + wks.length +
             (wks.length === 1 ? ' week' : ' weeks') + '. The bold number is the days you showed up that week, ' +
             'the one under it is the date the week began. This week is still open.</p></div>';

      var supLine = s.supDays === 0
        ? 'No day in the record is a day you missed the main move and still checked in.'
        : s.supDays === 1
          ? 'On <b>1</b> day you missed the main move and still checked in. That is a faint square in the grids above.'
          : 'On <b>' + s.supDays + '</b> days you missed the main move and still checked in. Those are the faint squares in the grids above.';

      W[5] = '<div class="v04-weave"><h3>Around the main move</h3>' +
             K.supportRows(s) + '<p>' + supLine + '</p></div>';

      W[8] = '<div class="v04-weave"><h3>Time on the board</h3>' +
             '<div class="ck-tiles">' +
               K.tile(s.hours, 'hours recorded') +
               K.tile(s.avgSession, 'minutes a session', 'on average') +
               K.tile(s.perWeek.toFixed(1), 'days a week', 'the whole record') +
             '</div>' +
             '<p>Counted only from the days you marked. ' +
             (s.missed === 0 ? 'There is nothing missing to estimate.'
                             : 'Nothing is estimated for the ' + n(s.missed) + ' days you missed.') + '</p></div>';

      function monthCompare() {
        var pc = function (m) { return Math.round(100 * m.on / m.all); };
        var ms = s.months.slice(0, -1);                        // closed months only
        if (!ms.length) return MONF[cur.m] + ' is the first month of the record. The comparison starts once it closes.';
        var full = ms.filter(function (m) { return m.all >= 14; });
        var pool = full.length >= 2 ? full : ms;
        if (pool.length < 2) {
          return MONF[pool[0].date.getMonth()] + ' closed at <b>' + pc(pool[0]) + '%</b>. ' +
                 MONF[cur.m] + ' is still open.';
        }
        var byRate = pool.slice().sort(function (a, b) { return (b.on / b.all) - (a.on / a.all); });
        var hi = byRate[0], lo = byRate[byRate.length - 1];
        var thin = [hi, lo].filter(function (m) { return m.all < 14; });
        var out = full.length >= 2 ? ms.filter(function (m) { return m.all < 14; }) : [];
        var note = '';
        if (thin.length) {
          note = ' ' + MONF[thin[0].date.getMonth()] + ' only holds ' + thin[0].all +
                 ' tracked days, so that side of it is thin.';
        } else if (out.length) {
          note = ' ' + MONF[out[0].date.getMonth()] + ' holds only ' + out[0].all +
                 ' days, so it stays out of the comparison.';
        }
        return 'Your strongest ' + (full.length >= 2 ? 'full month' : 'month') + ' is <b>' +
               MONF[hi.date.getMonth()] + '</b> at <b>' + pc(hi) + '%</b>. The thinnest is <b>' +
               MONF[lo.date.getMonth()] + '</b> at <b>' + pc(lo) + '%</b>.' +
               note + ' ' + MONF[cur.m] + ' is still open.';
      }

      /* ---------------- the run of months, newest first ---------------- */
      H += '<h2>The months behind you</h2>';
      H += '<p class="v04-say v04-say--tight">Newest first. Every grid keeps the same seven columns, so the weekdays run straight down the page.</p>';

      H += '<div class="v04-run">';
      H += '<div class="v04-wk"><span class="v04-wk__l">Month</span>' +
           '<div class="v04-wk__g">' + WD.map(function (w) { return '<i>' + w + '</i>'; }).join('') + '</div></div>';

      var past = months.slice(0, -1).reverse();
      var used = {};

      if (!past.length) {
        H += '<p class="v04-say">This is the first month of the record. Every month that closes stacks up here underneath it.</p>';
      }

      past.forEach(function (mo, i) {
        var im = info(mo);
        var oldest = (i === past.length - 1);
        var facts = '';
        facts += '<span><i>Best run</i><b>' + im.best + '</b></span>';
        facts += '<span><i>Longest gap</i><b>' + im.lgap + '</b></span>';
        facts += '<span><i>Missed</i><b>' + im.off + '</b></span>';
        if (im.sup) facts += '<span><i>Check-in only</i><b>' + im.sup + '</b></span>';
        if (oldest && im.partial) facts += '<span class="wide">Began ' + K.MON[im.m] + ' ' + im.start + '</span>';

        H += '<div class="v04-mo' + (i === 0 ? ' v04-mo--first' : '') + '">' +
               '<div class="v04-mo__l">' +
                 '<b>' + MONF[im.m] + '</b><span class="v04-mo__y">' + im.y + '</span>' +
                 '<div class="v04-mo__n">' + im.on + '<i>of ' + im.all + '</i></div>' +
                 '<div class="v04-mo__p">' + im.pct + '% of its days</div>' +
                 '<div class="v04-mo__f">' + facts + '</div>' +
               '</div>' +
               '<div class="v04-mo__g">' + grid(mo, false) + '</div>' +
             '</div>';

        if (W[i + 1]) { H += W[i + 1]; used[i + 1] = 1; }
      });

      Object.keys(W).forEach(function (k) { if (!used[k]) H += W[k]; });
      H += '</div>';

      /* ---------------- where it begins ---------------- */
      H += '<h2>Where the record begins</h2>';
      H += '<div class="ck-rows">' +
             row('First day marked', s.firstOn ? longDate(s.firstOn) : 'Not yet') +
             row('Most recent day marked', s.lastOn ? longDate(s.lastOn) : 'Not yet') +
             row('Months the record touches', months.length) +
             row('Days between then and now', n(s.N)) +
           '</div>';

      H += '<h2>Every day since day one</h2>';
      H += K.calendarHTML(log);
      H += '<p class="v04-say">' + n(s.N) + ' squares, one per day, in order. ' +
           (s.missed === 0 ? 'Not one empty square in it yet.'
                           : 'The empty ones are the ' + n(s.missed) + ' days you missed.') + '</p>';

      /* ---------------- the ledger ---------------- */
      H += '<h2>The whole ledger</h2>';
      H += '<div class="ck-rows">' +
             row('Days tracked', n(s.N), 'days') +
             row('Days you showed up', n(s.total), 'days') +
             row('Days missed', n(s.missed), 'days') +
             row('Show-up rate', s.rate + '%') +
             row('Current run', s.current, s.current === 1 ? 'day' : 'days') +
             row('Longest run', s.best, 'days') +
             row('Times the run broke', s.gaps) +
             row('Longest gap', s.longestGap, 'days') +
             row('Times you came back', s.comebacks) +
             row('Check-in only days', s.supDays, 'days') +
             row('Days a week, average', s.perWeek.toFixed(1)) +
             row('Time recorded', n(s.hours), 'hours') +
             row('Average session', s.avgSession, 'min') +
             row('Strongest weekday', WDF[bd], dowPct(bd) + '%') +
             row('Quietest weekday', WDF[wd], dowPct(wd) + '%') +
           '</div>';

      H += '<div class="cx__foot">Every square is a real day. Nothing here is rounded up.</div>';

      function row(label, value, unit) {
        return '<div class="ck-row"><span>' + label + '</span><b>' + value +
               (unit ? '<em>' + unit + '</em>' : '') + '</b></div>';
      }

      return '<div class="cx">' + H + '</div>';
    }
  };

  /* ---------------- scoped styles ---------------- */
  var CSS = [
    /* dateline */
    '.v04-date{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:2px 0 18px}',
    '.v04-date__l b{display:block;font-size:23px;font-weight:750;letter-spacing:-.03em;line-height:1.02}',
    '.v04-date__l span{display:block;font-size:13px;color:var(--text-mid);margin-top:4px;font-variant-numeric:tabular-nums}',
    '.v04-date__r{text-align:right;flex:0 0 auto}',
    '.v04-date__r b{display:block;font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em}',
    '.v04-date__r span{display:block;font-size:11.5px;color:var(--text-mid);margin-top:3px}',

    /* hero */
    '.v04-hero{display:flex;align-items:center;gap:12px}',
    /* fixed slot: the kit shrinks a young bloom, the masthead must not move */
    '.v04-hero__b{flex:0 0 130px;display:flex;align-items:center;justify-content:center;margin-left:-8px}',
    '.v04-hero__t{min-width:0;flex:1}',
    '.v04-hero__c{font-size:12.5px;color:var(--text-mid);margin-top:11px;line-height:1.45}',
    '.v04-hero__c b{color:var(--text-hi);font-weight:700;font-variant-numeric:tabular-nums}',

    /* shared copy line */
    '.v04-say{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin:12px 0 0;font-variant-numeric:tabular-nums}',
    '.v04-say--tight{margin:-4px 0 12px}',
    '.v04-say b{color:var(--text-hi);font-weight:650}',
    /* a delta sits INSIDE body copy, so a down or even reading stays fully legible:
       it is carried by weight, never by fading the word out */
    '.v04-say em,.v04-weave em{font-style:normal;font-weight:700}',
    '.v04-say em.up,.v04-weave em.up{color:var(--accent)}',
    '.v04-say em.down,.v04-weave em.down{color:var(--text-hi)}',
    '.v04-say em.flat,.v04-weave em.flat{color:var(--text-mid)}',
    '.v04-rule{height:1px;background:var(--hairline);margin:20px 0 18px}',

    /* this month, large */
    '.v04-mhead{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 12px}',
    '.v04-mhead b{font-size:19px;font-weight:750;letter-spacing:-.025em}',
    '.v04-mhead span{font-size:12.5px;color:var(--text-mid);font-variant-numeric:tabular-nums;text-align:right}',
    '.v04-wkbig{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:7px}',
    '.v04-wkbig i{font-style:normal;font-size:10.5px;color:var(--text-mid);text-align:center}',
    '.v04-gbig{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}',
    /* a missed day is a tracked day: its number reads as clearly as a kept one,
       the fill is what differs. Only untracked days (pre/fut) are allowed to recede. */
    '.v04-gbig b{aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;' +
      'font-size:12.5px;font-weight:600;font-variant-numeric:tabular-nums;background:rgba(var(--ink),.055);color:var(--text-mid)}',
    '.v04-gbig b.on{background:rgba(var(--accent-rgb),.60);color:#06140a;font-weight:700}',
    '.v04-gbig b.sup{background:rgba(var(--accent-rgb),.17);color:var(--text-mid)}',
    '.v04-gbig b.pad{background:transparent}',
    '.v04-gbig b.pre,.v04-gbig b.fut{background:transparent;color:rgba(var(--ink),.26)}',
    '.v04-gbig b.today{background:var(--accent);color:#06140a;font-weight:750;box-shadow:0 0 0 3px rgba(var(--accent-rgb),.16)}',

    /* legend */
    '.v04-key{display:flex;gap:15px;flex-wrap:wrap;margin:13px 0 0}',
    '.v04-key span{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-mid)}',
    '.v04-key i{width:11px;height:11px;border-radius:3.5px;display:block;flex:0 0 auto}',
    '.v04-key i.on{background:rgba(var(--accent-rgb),.60)}',
    '.v04-key i.sup{background:rgba(var(--accent-rgb),.17)}',
    '.v04-key i.off{background:rgba(var(--ink),.055)}',

    /* the run */
    '.v04-run{margin-top:2px}',
    '.v04-wk{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:1fr 198px;gap:14px;align-items:center;' +
      'margin:0 -20px;padding:9px 20px;background:rgba(4,4,5,.88);' +
      '-webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4)}',
    '.v04-wk__l{font-size:11.5px;color:var(--text-mid)}',
    '.v04-wk__g{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}',
    '.v04-wk__g i{font-style:normal;font-size:10px;color:var(--text-mid);text-align:center}',

    '.v04-mo{display:grid;grid-template-columns:1fr 198px;gap:14px;padding:17px 0 19px;border-top:1px solid var(--hairline)}',
    '.v04-mo--first{border-top:0;padding-top:14px}',
    '.v04-mo__l b{display:block;font-size:16px;font-weight:750;letter-spacing:-.025em;line-height:1.05}',
    '.v04-mo__y{display:block;font-size:11.5px;color:var(--text-mid);margin-top:3px;font-variant-numeric:tabular-nums}',
    '.v04-mo__n{margin-top:12px;font-size:21px;font-weight:750;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}',
    '.v04-mo__n i{font-style:normal;font-size:11.5px;font-weight:600;color:var(--text-mid);margin-left:4px;letter-spacing:0}',
    '.v04-mo__p{font-size:11.5px;color:var(--text-mid);margin-top:5px;font-variant-numeric:tabular-nums}',
    '.v04-mo__f{margin-top:12px;display:flex;flex-direction:column;gap:6px}',
    '.v04-mo__f span{display:flex;align-items:baseline;justify-content:space-between;gap:8px;' +
      'font-size:11.5px;color:var(--text-mid);line-height:1.25;font-variant-numeric:tabular-nums}',
    '.v04-mo__f span i{font-style:normal;white-space:nowrap}',
    '.v04-mo__f span b{color:var(--text-hi);font-weight:700}',
    '.v04-mo__f span.wide{display:block;color:var(--text-mid);padding-top:2px}',
    '.v04-mo__g{min-width:0}',
    '.v04-g{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;align-content:start}',
    '.v04-g b{aspect-ratio:1;border-radius:5px;background:rgba(var(--ink),.055);display:block}',
    '.v04-g b.on{background:rgba(var(--accent-rgb),.58)}',
    '.v04-g b.sup{background:rgba(var(--accent-rgb),.17)}',
    '.v04-g b.pad,.v04-g b.pre,.v04-g b.fut{background:transparent}',

    /* woven statistics */
    '.v04-weave{background:var(--fill-1);box-shadow:var(--inset);border-radius:15px;padding:15px 15px 16px;margin:6px 0 8px}',
    '.v04-weave h3{font-size:13.5px;font-weight:700;letter-spacing:-.01em;margin:0 0 13px}',
    '.v04-weave p{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin:13px 0 0;font-variant-numeric:tabular-nums}',
    '.v04-weave p b{color:var(--text-hi);font-weight:650}',
    /* scoped only: a short weekday bar cannot hold its own percentage, so the
       number sits above every bar. The tallest bar is 100% of the content box AND
       carries its weekday caption below it, so the column runs ~19px past the box
       top and the number another ~15px above that. The padding must cover all 34px
       or the top percentage lands on the heading. */
    '.v04-weave .ck-dow{height:134px;padding-top:40px}',
    '.v04-weave .ck-dow__bar u{position:absolute;left:0;right:0;bottom:100%;margin:0 0 4px;text-align:center}'
  ].join('');
})();
