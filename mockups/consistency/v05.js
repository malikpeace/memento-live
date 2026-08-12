/* v05. THE BLOOM, IMMERSIVE.
   The flower owns the first screen edge to edge and the count reads through it.
   Everything below is one calm column: fewer sections than a ledger, each one
   bigger, with real air between them. Every number comes from the log. */
(function () {
'use strict';
window.CVAR = window.CVAR || {};
window.CVAR['v05'] = {
  name: 'Immersive bloom',
  note: 'The bloom fills the first screen and the count reads through its centre. Below it, one calm column of large sections with real space between them.',
  render: function (ctx) {
    var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;
    var n = K.n;

    /* ---------- bloom geometry ----------
       The flower is sized so its outermost seeds land just inside the phone
       edge, whatever the count is, with the seeds themselves capped so a young
       record does not blow up into a few enormous circles. Everything below
       (crop, number size, veil, overlay or not) follows from that one measure,
       so the hero holds together from day one to year three. */
    var STAGE = 390, SPACE = 7.8;
    var dr = Math.max(1.15, Math.min(4.6, 46 / Math.sqrt(s.total + 2)));
    var span = Math.max(74, SPACE * Math.sqrt(Math.max(1, s.total - 1)) + dr + 8);
    var size = Math.round(Math.min((STAGE - 2) * span / (span - 8), 22 * span / dr));
    /* rendered radius of the seeds themselves, which is smaller than the canvas
       whenever the kit holds its minimum frame open for a short record */
    var rad = size / 2 * (SPACE * Math.sqrt(Math.max(1, s.total - 1)) + dr) / span;
    /* the count only reads THROUGH the seeds once there are enough of them to
       carry it. before that it sits under a small constellation instead. */
    var overlay = rad >= 148;
    var stageH = Math.min(size, Math.round(rad * 2 + 64));
    var hn = Math.round(Math.max(44, Math.min(78, rad * 0.42 + 12)));
    /* the veil is a closest-side radial that reaches zero alpha INSIDE its own
       box, so it is geometrically incapable of showing a straight edge over the
       seeds. sized so the falloff lands where it needs to for the count to read. */
    var veil = overlay ? Math.round(Math.min(rad * 1.91, hn * 4.95, STAGE - 6)) : 0;

    /* ---------- shared bits ---------- */
    var start = log[0].date;                    /* day one of the record */
    var firstOn = s.firstOn || start;           /* first day actually shown up */
    var lastOn = s.lastOn || start;
    var today = log[log.length - 1].date;
    /* once the record crosses a new year a bare month and day is ambiguous */
    var spanYears = start.getFullYear() !== today.getFullYear();
    function full(d) { return K.MONF[d.getMonth()] + ' ' + d.getDate() + (spanYears ? ', ' + d.getFullYear() : ''); }
    function dim(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
    function whole(m) { return !!m.date && m.all === dim(m.date); }
    function plural(v, one, many) { return n(v) + ' ' + (v === 1 ? one : many); }
    /* a number and its unit should never break across two lines */
    function nb(t) { return '<b class="nb">' + t + '</b>'; }

    function sec(title, copy, body) {
      return '<section class="v05-s"><h3 class="v05-h">' + title + '</h3>' +
        (copy ? '<p class="v05-p">' + copy + '</p>' : '') +
        (body ? '<div class="v05-b">' + body + '</div>' : '') + '</section>';
    }
    function fig(v, label) {
      return '<div class="v05-fig"><b>' + v + '</b><span>' + label + '</span></div>';
    }
    function cell(v, label) {
      return '<div class="v05-cell"><b>' + v + '</b><span>' + label + '</span></div>';
    }
    function rows(arr) {
      return '<div class="ck-rows">' + arr.map(function (r) {
        return '<div class="ck-row"><span>' + r[0] + '</span><b>' + r[1] +
          (r[2] ? '<em>' + r[2] + '</em>' : '') + '</b></div>';
      }).join('') + '</div>';
    }

    /* ---------- 1. the hero ---------- */
    /* the goalShape line only ever tunes this one secondary line. when the
       shape's headline is the same number already reading over the bloom, the
       line stays quiet rather than printing it twice. */
    var dup = String(sh.lead) === String(s.total);

    var read = '<div class="ck-n v05-hn" style="font-size:' + hn + 'px">' + n(s.total) + '</div>' +
      '<div class="v05-hu">' + (s.total === 1 ? 'day you showed up' : 'days you showed up') + '</div>';

    var H = '<div class="cx v05">';
    H += '<div class="cx__top"><div class="cx__title">Consistency</div>' +
      '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></div></div>';

    H += '<div class="v05-stage" style="height:' + stageH + 'px">' +
      K.bloomSVG(s.total, { size: size, animate: true, spacing: SPACE }) +
      (veil ? '<div class="v05-veil" style="width:' + veil + 'px;height:' + veil + 'px"></div>' : '') +
      (overlay ? '<div class="v05-read">' + read + '</div>' : '') +
      '</div>';
    if (!overlay) H += '<div class="v05-read v05-read--under">' + read + '</div>';

    if (!dup) {
      H += '<div class="v05-shape"><b>' + sh.lead + '</b><span>' + sh.sub + '</span></div>';
    }
    H += '<p class="v05-lede' + (dup ? ' v05-lede--alone' : '') + '">One seed for every day you showed up, laid down in the order they happened. ' +
      full(start) + ' to today, ' + plural(s.N, 'day', 'days') + ' on the record.</p>';

    /* ---------- 2. lately ----------
       a record shorter than the window never gets compared to a window that
       does not exist yet: the copy and the rows shrink to what is real. */
    var win = Math.min(30, s.N);
    var winOn = log.slice(-win).filter(function (d) { return d.on; }).length;
    var hasPrev = s.N >= 60;
    var d30 = s.delta30;
    var deltaLine = d30 > 0 ? plural(d30, 'day', 'days') + ' more than the thirty before it'
      : d30 < 0 ? plural(-d30, 'day', 'days') + ' fewer than the thirty before it'
        : 'level with the thirty before it';
    var lateRows = [['Last ' + win + ' days', winOn, 'of ' + win]];
    if (hasPrev) lateRows.push(['The 30 before that', s.rPrev30, 'of 30']);
    /* four weeks means twenty-eight days counted off the log. the kit averages
       calendar weeks, which counts a two-day part-week as a whole one and reads
       far below the truth on a young record. */
    if (s.N >= 28) {
      var last28 = log.slice(-28).filter(function (d) { return d.on; }).length;
      lateRows.push(['Last four weeks', (last28 / 4).toFixed(1), 'days a week']);
    }
    lateRows.push(['Every week since the start', s.perWeek.toFixed(1), 'days a week']);
    H += sec('The last ' + win + ' days',
      'You showed up on <b>' + winOn + ' of the last ' + win + ' days</b>' + (hasPrev ? ', ' + deltaLine : '') +
      '. The line below is your rolling seven-day rate' + (hasPrev ? ' across the last sixty' : ' since you started') + ', and the top edge is seven days out of seven.',
      fig(winOn + '<i>/' + win + '</i>', hasPrev ? 'days, ' + K.delta(d30) + ' against the thirty before it' : 'days you showed up in that stretch') +
      '<div class="v05-spark">' + K.sparkline(log, 60, 350, 66) + '</div>' +
      '<div class="v05-scale"><span>' + (hasPrev ? 'Sixty days ago' : 'Day one') + '</span><span>Today</span></div>' +
      rows(lateRows));

    /* ---------- 3. the last seven days, up close ----------
       held back until the record is longer than the window, otherwise it says
       the same thing the section above just said */
    if (s.N >= 14) {
      var w7 = log.slice(-7);
      var w7on = w7.filter(function (d) { return d.on; }).length;
      var strip = '<div class="v05-w7">' + w7.map(function (d) {
        var st = d.on ? 'on' : (Object.keys(d.sup).length ? 'sup' : 'off');
        return '<div class="v05-w7c"><span>' + K.WD[d.date.getDay()] + '</span>' +
          '<i class="' + st + '"></i><u>' +
          (d.on ? d.minutes + 'm' : (st === 'sup' ? 'opened' : 'missed')) + '</u></div>';
      }).join('') + '</div>';
      H += sec('The last seven days',
        'One block for each of the last seven days, oldest on the left. You showed up on ' + nb(plural(w7on, 'day', 'days')) +
        ' and missed ' + (w7on === 7 ? 'none' : nb(plural(7 - w7on, 'day', 'days'))) +
        '. Under each block is how long you worked that day.',
        strip);
    }

    /* ---------- 4. the whole record ---------- */
    var recRows = [['Day one of the record', full(start)]];
    /* only worth a row of its own when day one was a day you missed */
    if (firstOn.getTime() !== start.getTime()) recRows.push(['First day you showed up', full(firstOn)]);
    recRows.push(['Most recent', lastOn.getTime() === today.getTime() ? 'Today' : full(lastOn)]);
    recRows.push(['Calendar weeks it covers', n(s.weeks.length)]);
    recRows.push(['Calendar months it covers', n(s.months.length)]);
    H += sec('The whole record',
      'You have been on the record for ' + nb(plural(s.N, 'day', 'days')) + '. You showed up for ' + nb(n(s.total)) + ' and missed ' + nb(n(s.missed)) + '. Nothing here is hidden or smoothed over.',
      fig(s.rate + '%', 'of every day since you started') +
      '<div class="v05-bar"><u style="width:' + s.rate + '%"></u></div>' +
      '<div class="v05-barl"><span><b>' + n(s.total) + '</b> shown up</span><span><b>' + n(s.missed) + '</b> missed</span></div>' +
      rows(recRows));

    /* ---------- 5. the goal itself ---------- */
    H += sec('Where the goal stands',
      dup
        ? 'Consistency counts the showing up. The goal it feeds reads straight off the same record, so the number above is the number here.'
        : 'Consistency counts the showing up. The goal it feeds currently reads <b>' + sh.lead + '</b> ' + sh.sub + '.',
      '<div class="v05-card">' + fig(sh.ctx.v, sh.ctx.l) +
      rows([
        ['Days of work behind it', n(s.total)],
        ['Days since you started', n(s.N)],
        ['Started', full(start)]
      ]) + '</div>');

    /* ---------- 6. runs and breaks ---------- */
    var runCopy = s.gaps === 0
      ? 'You have not missed a day yet, so the run is the whole record.'
      : 'The run has broken ' + nb(plural(s.gaps, 'time', 'times')) + ' and you came back ' + nb(plural(s.comebacks, 'time', 'times')) + '. The longest you were away was ' + nb(plural(s.longestGap, 'day', 'days')) + '.';
    if (s.current > 0 && s.current === s.best && s.gaps > 0) runCopy += ' The run you are on now is the longest you have had.';
    H += sec('Runs and breaks', runCopy,
      '<div class="v05-two">' +
      cell(n(s.current), s.current === 1 ? 'day in the current run' : 'days in the current run') +
      cell(n(s.best), 'days in your longest run') +
      '</div>' +
      rows([
        ['Times the run broke', n(s.gaps)],
        ['Times you came back', n(s.comebacks)],
        ['Longest gap', n(s.longestGap), s.longestGap === 1 ? 'day' : 'days'],
        ['Average gap', s.gaps ? (s.missed / s.gaps).toFixed(1) : '0', 'days']
      ]));

    /* ---------- 7. every break, by length ----------
       the same missed days as above, counted one break at a time, so the shape
       of the time away is visible instead of averaged into a single figure */
    var breaks = [], gStart = null, gLen = 0;
    log.forEach(function (d) {
      if (!d.on) { if (gStart === null) { gStart = d.date; gLen = 0; } gLen++; }
      else if (gStart !== null) { breaks.push({ from: gStart, len: gLen }); gStart = null; }
    });
    if (gStart !== null) breaks.push({ from: gStart, len: gLen });
    if (breaks.length) {
      var band = function (lo, hi) {
        return breaks.filter(function (b) { return b.len >= lo && (hi ? b.len <= hi : true); }).length;
      };
      var worst = breaks.reduce(function (a, b) { return b.len > a.len ? b : a; });
      H += sec('Every break, by length',
        'The ' + plural(s.missed, 'day', 'days') + ' you missed came in ' +
        nb(plural(breaks.length, 'break', 'breaks')) + '. This is how long each one lasted.',
        fig(n(worst.len), 'days away in the longest single break') +
        rows([
          ['One day off', n(band(1, 1))],
          ['Two days off', n(band(2, 2))],
          ['Three to five days', n(band(3, 5))],
          ['Six days or more', n(band(6))],
          ['The longest one started', full(worst.from)]
        ]));
    }

    /* ---------- 8. every day, in order ---------- */
    /* never fewer than seven columns, so a one-week record fills its row
       instead of trailing off two thirds of the way across */
    var cols = Math.min(16, Math.max(7, Math.round(Math.sqrt(log.length * 1.6))));
    H += sec('Every day since day one',
      'Each square is one day, oldest at the top left. Empty squares are days you missed, and they stay in the picture.',
      '<div class="v05-calwrap">' + K.calendarHTML(log, { cols: cols }) + '</div>' +
      '<div class="v05-key"><span><i class="on"></i>Showed up</span><span><i class="sup"></i>Opened it, no main move</span><span><i></i>Missed</span></div>');

    /* ---------- 9. this month ---------- */
    var tm = s.thisMonth, lm = s.lastMonth;
    var tmName = tm.date ? K.MONF[tm.date.getMonth()] : 'This month';
    var monthCopy = '<b>' + tmName + '</b> so far: ' + tm.on + ' of ' + tm.all + ' days. ';
    if (s.months.length > 1 && lm.date) {
      monthCopy += whole(lm)
        ? K.MONF[lm.date.getMonth()] + ' finished at ' + lm.on + ' of ' + lm.all + '.'
        : K.MONF[lm.date.getMonth()] + ' has ' + lm.all + ' days on the record and you showed up on ' + lm.on + '.';
    } else {
      monthCopy += 'This is your first month on the record.';
    }
    H += sec('This month', monthCopy, K.monthGrid(log));

    /* ---------- 10. month by month ----------
       one column is not a chart, so it waits until there are two months */
    if (s.months.length > 1) {
      var fullMonths = s.months.filter(whole);
      var bestM = fullMonths.length ? fullMonths.reduce(function (a, b) { return (b.on / b.all) > (a.on / a.all) ? b : a; }) : null;
      var moCopy = 'Each column is one month, and the number above it is the share of that month you showed up. The months at either end cover only the days that are on the record.';
      if (bestM) moCopy += ' Your strongest full month so far is <b>' + K.MONF[bestM.date.getMonth()] + '</b>, ' + bestM.on + ' of ' + bestM.all + ' days.';
      H += sec('Month by month', moCopy, K.monthChart(s));
    }

    /* ---------- 11. the week ----------
       the seven-bar read waits until every weekday has been seen at least three
       times, so a single Monday never gets announced as a hundred per cent.
       under that, the record only honestly supports the coarse split. */
    if (s.N >= 21) {
      var bd = s.bestDow, wd = s.worstDow;
      var bp = s.dowSeen[bd] ? Math.round(100 * s.byDow[bd] / s.dowSeen[bd]) : 0;
      var wp = s.dowSeen[wd] ? Math.round(100 * s.byDow[wd] / s.dowSeen[wd]) : 0;
      /* two weekdays can sit on exactly the same count, and calling one of them
         the best or the quietest on its own would be untrue */
      var tie = function (idx) {
        var c = 0;
        s.byDow.forEach(function (v, i) { if (s.dowSeen[i] && v === s.byDow[idx]) c++; });
        return c > 1 ? ', level with ' + (c === 2 ? 'one other day' : (c - 1) + ' other days') : '';
      };
      var dowCopy = 'Each bar is the share of that weekday you showed up. The tallest is <b>' + K.WDF[bd] + '</b>, ' +
        s.byDow[bd] + ' of the ' + s.dowSeen[bd] + ' on the record, ' + bp + '%' + tie(bd) + '.';
      if (wd !== bd) dowCopy += ' The shortest is <b>' + K.WDF[wd] + '</b>, ' + s.byDow[wd] + ' of ' + s.dowSeen[wd] + ', ' + wp + '%' + tie(wd) + '.';
      H += sec('How your week goes', dowCopy, K.dowChart(s));
    } else {
      var weOn = s.byDow[0] + s.byDow[6], weSeen = s.dowSeen[0] + s.dowSeen[6];
      var wkOn = s.total - weOn, wkSeen = s.N - weSeen;
      H += sec('Weekdays and weekends',
        'The record has ' + plural(wkSeen, 'weekday', 'weekdays') + ' and ' + plural(weSeen, 'weekend day', 'weekend days') +
        ' in it so far. The seven-bar read arrives once every weekday has been on the record three times.',
        '<div class="v05-two">' +
        cell(wkOn + '<i>/' + wkSeen + '</i>', 'weekdays you showed up') +
        cell(weOn + '<i>/' + weSeen + '</i>', 'weekend days you showed up') +
        '</div>' +
        rows([
          ['Weekdays', (wkSeen ? Math.round(100 * wkOn / wkSeen) : 0) + '%'],
          ['Weekend days', (weSeen ? Math.round(100 * weOn / weSeen) : 0) + '%']
        ]));
    }

    /* ---------- 12. time ---------- */
    var longest = 0, over45 = 0;
    log.forEach(function (d) { if (d.minutes > longest) longest = d.minutes; if (d.minutes >= 45) over45++; });
    var hpw = (s.minutes / 60 / Math.max(1, s.N / 7)).toFixed(1);
    H += sec('Time on it',
      nb(plural(s.hours, 'hour', 'hours')) + ' of work sit behind the bloom, spread across ' + plural(s.total, 'day', 'days') + '.',
      '<div class="v05-two">' +
      cell(n(s.hours) + '<i>h</i>', 'recorded in total') +
      cell(s.avgSession + '<i>m</i>', 'in an average session') +
      '</div>' +
      rows([
        ['Longest single session', n(longest), 'minutes'],
        ['Days of 45 minutes or more', n(over45)],
        ['Hours in an average week', hpw],
        ['Total minutes recorded', n(s.minutes)]
      ]));

    /* ---------- 13. around the work ---------- */
    var supCopy = 'Everything you did around the main move, counted across the whole record. ';
    supCopy += s.supDays > 0
      ? 'On ' + nb(plural(s.supDays, 'day', 'days')) + ' you opened Memento but never made the main move. Those days still count as missed.'
      : 'Every day with activity on it is a day you made the main move.';
    H += sec('Around the work', supCopy, K.supportRows(s));

    H += '<div class="cx__foot">Every number here is counted from the days themselves.<br>A missed day stays a missed day.</div>';
    H += '</div>';

    return STYLE + H;
  }
};

var STYLE = '<style>' + [
  /* stage: the flower runs to both edges of the phone */
  '.v05 .v05-stage{position:relative;margin:6px -20px 0;display:flex;align-items:center;justify-content:center;overflow:clip}',
  '.v05 .v05-stage .ck-bloom{max-width:none;flex:0 0 auto}',
  /* closest-side, so the last stop reaches zero alpha at the box edge and the
     veil can never draw a rectangle over the seeds */
  '.v05 .v05-veil{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;background:radial-gradient(circle closest-side at 50% 50%,rgba(4,4,5,.84) 0%,rgba(4,4,5,.74) 34%,rgba(4,4,5,.36) 58%,rgba(4,4,5,0) 77%)}',
  '.v05 .v05-read{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;pointer-events:none}',
  '.v05 .v05-read.v05-read--under{position:static;transform:none;margin:22px 0 26px}',
  '.v05 .v05-hn{font-size:78px}',
  '.v05 .v05-hu{font-size:14px;font-weight:500;color:var(--text-mid);margin-top:14px;letter-spacing:-.01em}',
  /* the one line the goal shape gets */
  '.v05 .v05-shape{text-align:center;margin-top:10px}',
  '.v05 .v05-shape b{display:block;font-size:27px;font-weight:750;letter-spacing:-.035em;line-height:1;font-variant-numeric:tabular-nums;color:var(--text-hi)}',
  '.v05 .v05-shape span{display:block;font-size:13px;color:var(--text-mid);margin-top:9px;line-height:1.45}',
  '.v05 .v05-lede{font-size:13px;line-height:1.6;color:var(--text-mid);text-align:center;margin:16px 6px 0}',
  '.v05 .v05-lede--alone{margin-top:26px}',
  /* sections: big header, one sentence, generous air */
  '.v05 .v05-s{margin-top:58px}',
  '.v05 .v05-h{margin:0;font-size:20px;font-weight:700;letter-spacing:-.03em;line-height:1.2;color:var(--text-hi)}',
  '.v05 .v05-p{margin:11px 0 0;font-size:13.5px;line-height:1.62;color:var(--text-mid)}',
  '.v05 .v05-p b{color:var(--text-hi);font-weight:650;font-variant-numeric:tabular-nums}',
  '.v05 .v05-p b.nb{white-space:nowrap}',
  '.v05 .v05-b{margin-top:22px}',
  /* the big figure that opens most sections */
  '.v05 .v05-fig{display:flex;align-items:baseline;gap:12px}',
  '.v05 .v05-fig>b{font-size:54px;font-weight:800;letter-spacing:-.05em;line-height:.9;font-variant-numeric:tabular-nums;color:var(--text-hi)}',
  '.v05 .v05-fig>b i{font-style:normal;font-size:26px;font-weight:700;letter-spacing:-.03em;color:var(--text-mid)}',
  '.v05 .v05-fig>span{flex:1;min-width:0;font-size:13px;line-height:1.45;color:var(--text-mid)}',
  '.v05 .v05-fig>span em{font-style:normal;font-weight:650}',
  '.v05 .v05-fig>span em.up{color:var(--accent)}',
  /* a decline is stated at full strength, never dimmed down */
  '.v05 .v05-fig>span em.down{color:var(--text-hi)}',
  '.v05 .v05-fig>span em.flat{color:var(--text-mid)}',
  /* two-up figures */
  '.v05 .v05-two{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px}',
  '.v05 .v05-cell{background:var(--fill-1);box-shadow:var(--inset);border-radius:14px;padding:16px 14px 15px;min-width:0}',
  '.v05 .v05-cell b{display:block;font-size:38px;font-weight:800;letter-spacing:-.05em;line-height:1;font-variant-numeric:tabular-nums}',
  '.v05 .v05-cell b i{font-style:normal;font-size:19px;font-weight:700;letter-spacing:-.02em;color:var(--text-mid);margin-left:1px}',
  '.v05 .v05-cell span{display:block;margin-top:10px;font-size:12.5px;line-height:1.4;color:var(--text-mid)}',
  /* the last seven days, up close */
  '.v05 .v05-w7{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}',
  '.v05 .v05-w7c{min-width:0;text-align:center}',
  '.v05 .v05-w7c span{display:block;font-size:11px;color:var(--text-mid);margin-bottom:8px}',
  '.v05 .v05-w7c i{display:block;height:48px;border-radius:10px;background:rgba(var(--ink),.055);box-shadow:var(--inset)}',
  '.v05 .v05-w7c i.on{background:rgba(var(--accent-rgb),.62)}',
  '.v05 .v05-w7c i.sup{background:rgba(var(--accent-rgb),.22)}',
  '.v05 .v05-w7c u{display:block;text-decoration:none;margin-top:8px;font-size:10.5px;line-height:1.2;color:var(--text-mid);font-variant-numeric:tabular-nums}',
  /* rolling rate */
  '.v05 .v05-spark{position:relative;margin:22px 0 0}',
  '.v05 .v05-spark::before{content:"";position:absolute;left:0;right:0;top:3px;height:1px;background:rgba(var(--ink),.13)}',
  '.v05 .v05-spark::after{content:"";position:absolute;left:0;right:0;bottom:3px;height:1px;background:rgba(var(--ink),.07)}',
  /* the end-of-line dot sits exactly on the right edge of the viewBox, so it
     needs to be allowed out of the box or it renders as a half circle */
  '.v05 .v05-spark .ck-spark{height:66px;position:relative;overflow:visible}',
  '.v05 .v05-spark .ck-spark__a{fill:none}',
  '.v05 .v05-spark .ck-spark__l{stroke-width:2.2}',
  '.v05 .v05-scale{display:flex;justify-content:space-between;gap:12px;margin-top:9px;font-size:11px;color:var(--text-lo)}',
  /* shown up against missed */
  '.v05 .v05-bar{height:12px;border-radius:6px;background:rgba(var(--ink),.075);box-shadow:var(--inset);overflow:hidden;margin-top:22px}',
  '.v05 .v05-bar u{display:block;height:100%;text-decoration:none;background:rgba(var(--accent-rgb),.62)}',
  '.v05 .v05-barl{display:flex;justify-content:space-between;gap:12px;margin:11px 0 6px;font-size:12.5px;color:var(--text-mid)}',
  '.v05 .v05-barl b{color:var(--text-hi);font-weight:700;font-variant-numeric:tabular-nums}',
  /* the goal card */
  '.v05 .v05-card{background:var(--fill-1);box-shadow:var(--inset);border-radius:16px;padding:18px 16px 6px}',
  '.v05 .v05-card .ck-rows{margin-top:16px}',
  /* calendar */
  '.v05 .v05-calwrap{margin-bottom:2px}',
  '.v05 .v05-key{display:flex;flex-wrap:wrap;gap:9px 18px;margin-top:16px;font-size:12px;color:var(--text-mid)}',
  '.v05 .v05-key span{display:inline-flex;align-items:center;gap:7px}',
  '.v05 .v05-key i{width:10px;height:10px;border-radius:3px;background:rgba(var(--ink),.055)}',
  '.v05 .v05-key i.on{background:rgba(var(--accent-rgb),.62)}',
  '.v05 .v05-key i.sup{background:rgba(var(--accent-rgb),.22)}',
  /* kit components, given room to breathe in a page this open */
  '.v05 .ck-rows{margin-top:18px}',
  '.v05 .ck-row b em{color:var(--text-mid)}',
  '.v05 .ck-mo__t{height:92px}',
  '.v05 .ck-mo__c b{font-size:12px;margin-top:7px}',
  '.v05 .ck-mo__c span{font-size:10.5px}',
  '.v05 .ck-dow{height:118px}',
  '.v05 .ck-dow__c span{font-size:11.5px}',
  '.v05 .ck-sup{gap:9px}',
  '.v05 .ck-sup__r{padding:13px 14px;border-radius:14px}',
  '.v05 .cx__foot{margin-top:52px;line-height:1.7}'
].join('') + '</style>';
})();
