/* L02, THE JOURNAL
   Consistency as a written record a human would want to reread.
   The page is paper, not tiles: no cards, no panels, no stat grid, no charts.
   An opening entry dated today, one number set inside a sentence, the honest
   calendar, then the record told as dated entries in the order they happened,
   ending on today. Every figure is derived from the log, printed in a sentence.
   Nothing is stated twice: if the lede already prints it, no later line repeats it. */
(function () {
  var W = window; W.CLAY = W.CLAY || {};

  W.CLAY['L02'] = {
    name: 'The journal',
    note: 'Consistency written as a logbook you would reread: prose led, dated, numbers set inside sentences, zero cards, tiles or charts. One hero (the days you showed up), then at most two supporting lines, the honest calendar, the dated events, and at most two closing sentences. The rule the page is built on is that no fact appears twice: the lifetime percentage is gone because the lede already prints the ratio, the start date is printed once, a perfect record is said in the lede instead of announced again, and a stretch is never dated twice when the comeback and the longest run are the same run. Misses appear only as closed, dated events, never as a running shame counter. Everything can vanish: on day one the page is one entry and one square.',

    render: function (ctx) {
      var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh || {}, shape = ctx.shape || 'open';
      var N = log.length;

      /* ---------------- small, safe helpers ---------------- */
      var MON = K.MON, MONF = K.MONF, WDF = K.WDF;
      function num(v) {
        if (typeof v !== 'number' || !isFinite(v)) return '0';
        return Math.round(v).toLocaleString('en-US');
      }
      function md(d) { return d ? MON[d.getMonth()] + ' ' + d.getDate() : ''; }
      function mdf(d) { return d ? MONF[d.getMonth()] + ' ' + d.getDate() : ''; }
      function wdf(d) { return d ? WDF[d.getDay()] : ''; }
      function dw(v) { return num(v) + (Math.round(v) === 1 ? ' day' : ' days'); }
      function pl(v, w) { return num(v) + ' ' + w + (Math.round(v) === 1 ? '' : 's'); }
      function one(v) {
        if (typeof v !== 'number' || !isFinite(v)) return '0';
        return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
      }
      function onIn(a) { var c = 0; for (var i = 0; i < a.length; i++) if (a[i] && a[i].on) c++; return c; }
      function daysIn(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

      var first = log[0].date, last = log[N - 1].date;
      var todayOn = !!log[N - 1].on;
      /* a record that crosses a new year has to say which year, or the entries
         read out of order: Aug 15 last year sitting above Aug 14 today */
      var multiYear = first.getFullYear() !== last.getFullYear();
      function yr(d) { return multiYear && d ? ', ' + d.getFullYear() : ''; }
      function mdy(d) { return md(d) + yr(d); }

      /* ---------------- runs and breaks, with their real dates ---------------- */
      var runs = [], gaps = [], cr = null, cg = null;
      log.forEach(function (d, i) {
        if (d.on) {
          cg = null;
          if (!cr) { cr = { n: 0, a: d.date, b: d.date, i: i }; runs.push(cr); }
          cr.n++; cr.b = d.date;
        } else {
          cr = null;
          if (!cg) { cg = { n: 0, a: d.date, b: d.date, i: i }; gaps.push(cg); }
          cg.n++; cg.b = d.date;
        }
      });
      var longRun = runs.slice().sort(function (x, y) { return (y.n - x.n) || (x.i - y.i); })[0] || null;
      /* a rate goal is not meant to be daily, so a normal weekend is not a break:
         for that shape the page only calls a gap quiet once it is a real absence */
      var gapMin = shape === 'frequency' ? 5 : 2;
      var openGaps = gaps.filter(function (g) { return g.i > 0 && g.n >= gapMin; });
      var longGap = openGaps.slice().sort(function (x, y) { return (y.n - x.n) || (x.i - y.i); })[0] || null;
      var back = null;
      if (longGap) {
        var bi = longGap.i + longGap.n;
        for (var r = 0; r < runs.length; r++) if (runs[r].i === bi) { back = runs[r]; break; }
      }
      var runEndsToday = !!(longRun && longRun.i + longRun.n >= N);
      var backIsLongest = !!(back && longRun && back === longRun);

      /* ---------------- the opening entry ---------------- */
      var perfect = s.total === N && N >= 2;
      /* a perfect record is said once, in the lede, and never announced again */
      var lede2 = N === 1
        ? 'day. The record starts today.'
        : perfect
          ? 'days since ' + mdf(first) + yr(first) + ', every one of them.'
          : 'of the ' + num(N) + ' days since ' + mdf(first) + yr(first) + '.';

      /* at most two supporting lines, and never a fact the lede already printed.
         the lifetime percentage is deliberately absent: "172 of 365" is the ratio,
         printing "47%" underneath it is the same sentence wearing a hat. */
      var S = (K.SHAPES && K.SHAPES[shape]) || {};
      var lines = [];

      if (shape === 'quantity_up' && S.at != null && S.target) {
        lines.push('The number is at <b>' + num(S.at) + ' of ' + num(S.target) + '</b>' + (S.unit ? ' ' + S.unit : '') + '.');
      } else if (shape === 'quantity_down' && S.from != null && S.at != null && S.target != null) {
        var u = S.unit ? ' ' + S.unit : '', togo = S.at - S.target;
        lines.push('The number is <b>' + num(S.from - S.at) + u + '</b> down from where it started' +
          (togo > 0 ? ', with <b>' + num(togo) + u + '</b> still to go.' : ', and it is where you were aiming.'));
      } else if (shape === 'frequency' && N >= 8) {
        /* "lately" needs more than one week behind it to mean anything */
        var cad = S.cadence || s.cadence || 4;
        var rate = isFinite(s.last4Rate) ? s.last4Rate : 0;
        var rateTxt = one(rate) + (Math.round(rate * 10) / 10 === 1 ? ' session' : ' sessions') + ' a week';
        lines.push('Lately that comes to <b>' + rateTxt + '</b>, against the ' + num(cad) + ' a week you set.');
      } else if (shape === 'maintenance' && !perfect) {
        /* a best that is one day past the current hold is not a second fact,
           it is the same number with a rounding error attached */
        lines.push(s.best > s.current + 1
          ? 'The line has held <b>' + dw(s.current) + '</b> straight. The longest you have held it is <b>' + dw(s.best) + '</b>.'
          : s.best <= s.current && N >= 7
            ? 'The line has held <b>' + dw(s.current) + '</b> straight, the longest it has gone.'
            : 'The line has held <b>' + dw(s.current) + '</b> straight.');
      } else if (shape === 'milestone') {
        lines.push(S.dueIn > 0
          ? 'Banked for ' + (S.unit || 'the day it counts') + ', <b>' + dw(S.dueIn) + '</b> out.'
          : 'Banked for ' + (S.unit || 'the day it counts') + '.');
      }

      /* the honest recent read, the one real sign of direction on the page. It only
         earns its place once there is a window BEFORE it to compare against, which
         is the whole point of the line: under that, it just reprints the lede. A
         rate goal is counted in weeks upstairs, so days here would be a second
         reading in the wrong unit, and a held line already said it held. */
      if (lines.length < 2 && N >= 60 && !perfect && shape !== 'frequency') {
        var w = 30, onW = onIn(log.slice(N - w)), dd = onW - onIn(log.slice(N - w * 2, N - w));
        if (!(shape === 'maintenance' && onW === w)) {
          lines.push('You marked <b>' + num(onW) + '</b> of the last ' + dw(w) +
            (dd > 0 ? ', <b>' + num(dd) + ' more</b> than the ' + w + ' before.'
              : dd < 0 ? ', <b>' + num(-dd) + ' fewer</b> than the ' + w + ' before.'
                : ', the same as the ' + w + ' before.'));
        }
      }

      var open =
        '<div class="L02-open">' +
          '<div class="L02-date">' + wdf(last) + ', ' + mdf(last) + '</div>' +
          '<p class="L02-lede">You have shown up</p>' +
          '<div class="L02-big">' + num(s.total) + '</div>' +
          '<p class="L02-lede">' + lede2 + '</p>' +
          lines.slice(0, 2).map(function (t) { return '<p class="L02-clause">' + t + '</p>'; }).join('') +
        '</div>';

      /* ---------------- the record itself ---------------- */
      /* the grid keeps a day-sized cell at every length: a short record reads as a
         short record, not as a row of oversized tiles filling the page */
      var cols = Math.max(7, Math.min(21, Math.round(Math.sqrt(N * 1.6))));
      /* the start date is printed in the lede, so the caption does not print it again */
      var cap = N === 1
        ? 'Your first square. Every day from here gets one.'
        : 'A square for every day. The misses stay in, so the record reads true.';
      var record =
        '<div class="L02-sec">' +
          '<h2 class="L02-h">Every day so far</h2>' +
          '<div class="L02-cal" style="max-width:' + (cols * 30) + 'px">' + K.calendarHTML(log, { cols: cols }) + '</div>' +
          '<p class="L02-cap">' + cap + '</p>' +
        '</div>';

      /* ---------------- the chronicle: what actually happened ---------------- */
      /* the maintenance sentence upstairs already prints the longest hold, so the
         chronicle dates it instead of printing the same number a second time */
      var runIsBest = shape === 'maintenance' && longRun && longRun.n === s.best && s.best > s.current;

      /* when the longest run opens the record, it belongs in the first line: two
         entries on the same date read as a stutter, not as a logbook */
      var runOpens = !!(longRun && longRun.i === 0 && longRun.n >= 4 && !runEndsToday);
      var startText;
      if (runOpens && runIsBest) startText = 'The record starts here, and holds unbroken through ' + mdy(longRun.b) + '.';
      else if (runOpens) startText = 'The record starts here, and runs <b>' + dw(longRun.n) + '</b> straight through ' + mdy(longRun.b) + '.';
      else startText = 'The record starts here.';
      var start = { d: first, t: startText };

      /* the middle of the record, in the order a reader would want it. Each group
         is atomic: a comeback line without its break above it reads as a non
         sequitur, which is exactly what the old flat cap produced at day 365. */
      var mid = [];
      /* stretches this page has already dated, so a later line cannot re-tell a
         span the reader was just told about */
      var told = runOpens ? [longRun] : [];

      /* the break, told as a closed event with a date, never as a running total */
      if (longGap) {
        var pair = [{ d: longGap.a, t: 'The page goes quiet for <b>' + dw(longGap.n) + '</b>.' }];
        if (back) {
          var backRuns = back.n > 2 && !(back.i + back.n >= N);
          pair.push({
            d: back.a,
            t: !backRuns ? 'You start again.'
              : backIsLongest
                ? 'You start again, and run <b>' + dw(back.n) + '</b> from here, the longest stretch on the record.'
                : 'You start again, and run <b>' + dw(back.n) + '</b> from here.'
          });
        }
        mid.push(pair);
      }

      /* the longest stretch, unless it is the one still running, the one that opens
         the record, or the one the comeback line just dated */
      if (longRun && longRun.n >= 3 && !runEndsToday && !runOpens && !backIsLongest) {
        told.push(longRun);
        mid.push([{
          d: longRun.a,
          t: runIsBest
            ? 'Your longest hold starts here, and runs through ' + mdy(longRun.b) + '.'
            : 'Your longest stretch, <b>' + dw(longRun.n) + '</b> without a miss, through ' + mdy(longRun.b) + '.'
        }]);
      }

      /* the strongest month, only counting months that were lived whole: a month
         the record only caught half of must never win on a fortnight of days */
      var allM = s.months || [];
      var full = allM.filter(function (m) { return m && m.date && m.all === daysIn(m.date); });
      if (full.length >= 2) {
        var bestM = full.slice().sort(function (x, y) { return (y.on / y.all) - (x.on / x.all); })[0];
        /* a perfect month sitting inside a stretch the page already dated is that
           stretch told twice, in smaller units */
        var inTold = bestM && told.some(function (rn) {
          return rn.a <= bestM.date && rn.b >= new Date(bestM.date.getFullYear(), bestM.date.getMonth() + 1, 0);
        });
        if (bestM && bestM.on > 0 && !inTold) {
          mid.push([{
            d: bestM.date, lab: MON[bestM.date.getMonth()],
            t: 'Your best month on the record, <b>' + num(bestM.on) + ' of ' + num(bestM.all) + '</b> days.'
          }]);
        }
      }

      /* three middle lines, hard. Start and today are never spent from that budget */
      var ents = [start], budget = 3;
      mid.forEach(function (g) { if (g.length <= budget) { ents = ents.concat(g); budget -= g.length; } });

      /* one date, one line: today owns the last line, and no earlier event may
         print a second entry on a date the page has already used */
      var seen = {};
      ents = ents.filter(function (e) {
        if (!e || !e.d) return false;
        if (N > 1 && +e.d === +last) return false;
        var k = +e.d; if (seen[k]) return false; seen[k] = 1; return true;
      });
      ents.sort(function (a, b) { return a.d - b.d; });

      /* today, always the last line on the page */
      var todayText;
      if (N === 1) todayText = '';
      else if (!todayOn) todayText = 'Today. Nothing marked yet.';
      else if (shape === 'maintenance') todayText = 'Today. The line holds.';
      /* the lede already said every day is marked: do not print the count again */
      else if (perfect && N >= 7) todayText = 'Today. Still unbroken.';
      else if (runEndsToday && s.current >= 3) todayText = 'Today. That makes <b>' + num(s.current) + ' in a row</b>, the longest you have gone.';
      else if (s.current > 1) todayText = 'Today. That makes <b>' + num(s.current) + ' in a row</b>.';
      else todayText = 'Today. Back on the record.';
      if (todayText) ents.push({ d: last, t: todayText, now: true });

      /* one lonely "the record starts here" is the hero said twice, so on the
         first days the chronicle simply is not there yet */
      var chronicle = ents.length < 2 ? '' :
        '<div class="L02-sec">' +
          '<h2 class="L02-h">What happened</h2>' +
          '<div class="L02-log">' + ents.map(function (e) {
            return '<div class="L02-e' + (e.now ? ' now' : '') + '">' +
              '<div class="L02-e__d">' + (e.lab || md(e.d)) +
                (multiYear ? '<i>' + e.d.getFullYear() + '</i>' : '') + '</div>' +
              '<div class="L02-e__t">' + e.t + '</div></div>';
          }).join('') + '</div>' +
        '</div>';

      /* ---------------- what the record says, in sentences ----------------
         two lines, hard cap, weight of work first. Anything the calendar or the
         chronicle already showed does not get a second telling here. */
      var says = [];
      /* a rate goal is judged by the week, not the day */
      if (shape === 'frequency' && s.weeks && s.weeks.length >= 3) {
        says.push('You hit the weekly rate in <b>' + num(s.metWeeks) + ' of ' + num(s.weeks.length) + '</b> weeks on the record.');
      }
      if (s.hours >= 1 && s.avgSession >= 1) {
        says.push('The time adds up to roughly <b>' + pl(s.hours, 'hour') + '</b>, in sittings averaging ' + pl(s.avgSession, 'minute') + '.');
      }
      if (s.comebacks >= 2 && shape !== 'frequency') {
        says.push('You have come back after a break <b>' + num(s.comebacks) + ' times</b>.');
      }
      var bd = s.bestDow, wd2 = s.worstDow;
      if (N >= 21 && s.dowSeen[bd] > 0 && s.dowSeen[wd2] > 0 && bd !== wd2 && s.byDow[bd] > s.byDow[wd2]) {
        says.push('You are strongest on ' + WDF[bd] + 's, <b>' + num(s.byDow[bd]) + ' of ' + num(s.dowSeen[bd]) +
          '</b>, and thinnest on ' + WDF[wd2] + 's, <b>' + num(s.byDow[wd2]) + ' of ' + num(s.dowSeen[wd2]) + '</b>.');
      }
      says = says.slice(0, 2);
      var reading = (N >= 14 && says.length)
        ? '<div class="L02-sec"><h2 class="L02-h">What the record says</h2><div class="L02-says">' +
            says.map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div></div>'
        : '';

      /* ---------------- styles ---------------- */
      var css = '<style>' +
        '.L02{padding:16px 20px calc(44px + env(safe-area-inset-bottom));max-width:430px;margin:0 auto;' +
          'overflow-wrap:break-word;font-variant-numeric:tabular-nums}' +
        '.L02-date{font-size:12.5px;font-weight:500;color:rgba(var(--ink),.66);letter-spacing:-.005em;margin-bottom:15px}' +
        '.L02-lede{font-size:19px;font-weight:450;line-height:1.3;letter-spacing:-.017em;color:var(--text-hi);margin:0}' +
        '.L02-big{font-size:78px;font-weight:800;line-height:.94;letter-spacing:-.05em;color:var(--text-hi);margin:5px 0 3px}' +
        '.L02-clause{font-size:15.5px;line-height:1.55;letter-spacing:-.006em;color:rgba(var(--ink),.93);margin:17px 0 0}' +
        '.L02-clause b{font-weight:700;color:var(--text-hi)}' +
        '.L02-sec{margin-top:32px}' +
        '.L02-h{font-size:16px;font-weight:650;letter-spacing:-.014em;color:var(--text-hi);margin:0 0 13px}' +
        '.L02-cal{width:100%}' +
        '.L02-cap{font-size:12.5px;line-height:1.6;color:rgba(var(--ink),.72);margin:13px 0 0}' +
        '.L02-log{margin-top:-2px}' +
        '.L02-e{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:baseline;padding:0 0 16px}' +
        '.L02-e:last-child{padding-bottom:0}' +
        '.L02-e__d{font-size:12.5px;font-weight:600;letter-spacing:-.01em;color:rgba(var(--ink),.62);white-space:nowrap}' +
        '.L02-e__d i{display:block;font-style:normal;font-size:10.5px;font-weight:500;color:rgba(var(--ink),.55);margin-top:2px}' +
        '.L02-e.now .L02-e__d{color:var(--accent)}' +
        '.L02-e.now .L02-e__d i{color:rgba(var(--accent-rgb),.66)}' +
        '.L02-e__t{font-size:15px;line-height:1.5;letter-spacing:-.006em;color:rgba(var(--ink),.93)}' +
        '.L02-e__t b{font-weight:700;color:var(--text-hi)}' +
        '.L02-says p{font-size:15px;line-height:1.6;letter-spacing:-.006em;color:rgba(var(--ink),.93);margin:0 0 13px}' +
        '.L02-says p:last-child{margin-bottom:0}' +
        '.L02-says b{font-weight:700;color:var(--text-hi)}' +
        '</style>';

      return css + '<div class="L02">' + open + record + chronicle + reading + '</div>';
    }
  };
})();
