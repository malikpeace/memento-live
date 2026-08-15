/* L03. CALENDAR FIRST.
   The month is the interface. A real, full-size calendar of the month you are
   living in leads the page, every week row carrying its own count, and the
   months behind it sit under it as real months, not as bars. Everything else on
   the page is a footnote to the days themselves.

   Lens call: the page does NOT open on a hero number. It opens on the actual
   calendar, because progress here is watching real weeks fill in. The numbers
   are still there, they are just read off the days instead of announced above
   them. Blank days stay blank, and no counter anywhere counts misses.

   Critic pass. What the calendar already shows with its own eyes is gone: the
   weekday bar chart, the "this week" row, the "most in a month" row and the
   percentage all left, so the whole page counts in one unit, days. This pass
   went further and cut the last three repeats:
     - the "last 30 days" row said the same thing as the month above it and the
       month-ago line below it, so it is gone,
     - the goal card no longer prints a percentage that is only the two numbers
       beside it divided,
     - a held vow no longer prints its own length twice (the run line steps
       aside for the goal card when the shape is maintenance).
   The two-row ledger became one plain sentence, which killed a heading and a
   table. The legend now only names states that actually occur, so day two does
   not carry a swatch for "missed". Day one reads as day one instead of "1 of 1
   day". The lifetime total sits quietly in the footer, the only place a total
   belongs on a page whose whole point is that the month, not a number, leads. */
(function () {
  var W = window; W.CLAY = W.CLAY || {};

  W.CLAY['L03'] = {
    name: 'The month',
    note: 'The real calendar of the month you are in leads the whole page, each week row counting itself under a "days" header, with earlier months underneath as real months. Breaks the locked hero: there is no big number at the top, the month carries it. Everything the calendar already shows was cut, so the page counts in one unit, days, and never repeats itself: one heading for the archive, one for the goal, and a single line for the run.',

    render: function (ctx) {
      var K = ctx.K, log = ctx.log || [], s = ctx.s || {}, sh = ctx.sh, shape = ctx.shape || 'open';
      var MON = K.MON, MONF = K.MONF, WD = K.WD;

      var CSS =
        '<style>' +
        '.L03{padding:6px 20px 40px;max-width:430px;margin:0 auto}' +
        '.L03 .L03-mh{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:2px 0 16px}' +
        '.L03 .L03-mh b{font-size:26px;font-weight:750;letter-spacing:-.035em;color:var(--text-hi);line-height:1;min-width:0}' +
        '.L03 .L03-mh i{font-style:normal;font-size:13.5px;font-weight:500;color:var(--text-mid);' +
          'font-variant-numeric:tabular-nums;white-space:nowrap}' +
        '.L03 .L03-mh i em{font-style:normal;font-weight:750;color:var(--text-hi);font-size:17px;letter-spacing:-.02em}' +

        '.L03 .L03-cal{display:grid;grid-template-columns:repeat(7,1fr) 28px;gap:6px}' +
        '.L03 .L03-wd{font-size:10.5px;color:var(--text-lo);text-align:center;line-height:1;padding-bottom:3px}' +
        '.L03 .L03-wd--g{text-align:right}' +
        /* min-width/min-height 0 is load bearing: an aspect-ratio box in a 1fr
           track takes its automatic minimum from the transferred size and pushes
           the track wider than the phone */
        '.L03 .L03-d{aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;' +
          'font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em;' +
          'min-width:0;min-height:0;background:transparent;color:rgba(var(--ink),.25)}' +
        /* a missed day must be visible or the record flatters: in the small grids
           there is no number to carry the cell, so the fill has to do it alone */
        '.L03 .L03-d.off{background:rgba(var(--ink),.085);color:rgba(var(--ink),.42)}' +
        '.L03 .L03-d.sup{background:rgba(var(--accent-rgb),.17);color:rgba(var(--ink),.78)}' +
        '.L03 .L03-d.on{background:rgba(var(--accent-rgb),.62);color:#06140a;font-weight:700}' +
        '.L03 .L03-d.today{box-shadow:0 0 0 2px rgba(var(--accent-rgb),.42)}' +
        '.L03 .L03-g{display:flex;align-items:center;justify-content:flex-end;font-size:11.5px;font-weight:600;' +
          'color:rgba(var(--ink),.62);font-variant-numeric:tabular-nums;line-height:1}' +

        '.L03 .L03-leg{display:flex;gap:14px;flex-wrap:wrap;margin-top:14px;font-size:11.5px;color:var(--text-lo)}' +
        '.L03 .L03-leg span{display:inline-flex;align-items:center;gap:6px}' +
        '.L03 .L03-leg u{width:10px;height:10px;border-radius:3px;display:block;text-decoration:none}' +
        '.L03 .L03-leg u.a{background:rgba(var(--accent-rgb),.62)}' +
        '.L03 .L03-leg u.b{background:rgba(var(--accent-rgb),.17)}' +
        '.L03 .L03-leg u.c{background:rgba(var(--ink),.085)}' +

        '.L03 .L03-read{margin-top:16px;display:flex;flex-direction:column;gap:7px}' +
        '.L03 .L03-read p{margin:0;font-size:13.5px;color:var(--text-mid);line-height:1.5}' +
        '.L03 .L03-read b{color:var(--text-hi);font-weight:700;font-variant-numeric:tabular-nums}' +

        '.L03 .L03-sec{margin-top:26px}' +
        '.L03 .L03-h{font-size:14px;font-weight:700;color:var(--text-hi);letter-spacing:-.01em;margin:0 0 12px}' +

        '.L03 .L03-ms{display:grid;gap:15px 12px}' +
        '.L03 .L03-ms > div{min-width:0}' +
        '.L03 .L03-m__l{display:flex;align-items:baseline;justify-content:space-between;gap:4px;margin-bottom:6px}' +
        '.L03 .L03-m__l span{font-size:11px;color:var(--text-lo);white-space:nowrap;overflow:hidden;' +
          'text-overflow:ellipsis;min-width:0}' +
        '.L03 .L03-m__l b{font-size:12px;font-weight:700;color:var(--text-mid);font-variant-numeric:tabular-nums;' +
          'flex:0 0 auto}' +
        '.L03 .L03-m__g{display:grid;grid-template-columns:repeat(7,1fr);gap:1.5px}' +
        '.L03 .L03-m__g b{aspect-ratio:1;border-radius:2px;display:block;min-width:0;min-height:0;' +
          'background:rgba(var(--ink),.085)}' +
        '.L03 .L03-m__g b.L03-pad{background:transparent}' +
        '.L03 .L03-m__g b.L03-void{background:rgba(var(--ink),.02)}' +
        '.L03 .L03-m__g b.sup{background:rgba(var(--accent-rgb),.20)}' +
        '.L03 .L03-m__g b.on{background:rgba(var(--accent-rgb),.60)}' +
        '.L03 .L03-ms--wide{gap:18px 14px}' +
        '.L03 .L03-ms--wide .L03-m__g{gap:3px}' +
        '.L03 .L03-ms--wide .L03-m__g b{border-radius:4px}' +
        '.L03 .L03-ms--wide .L03-m__l span{font-size:12px}' +
        '.L03 .L03-ms--wide .L03-m__l b{font-size:13px}' +

        '.L03 .L03-goal{background:var(--fill-1);box-shadow:var(--inset);border-radius:14px;padding:14px 15px 13px}' +
        '.L03 .L03-goal p{margin:0;font-size:15px;font-weight:500;color:var(--text-mid);line-height:1.4;' +
          'overflow-wrap:anywhere}' +
        '.L03 .L03-goal p b{color:var(--text-hi);font-weight:750;font-size:20px;letter-spacing:-.02em;' +
          'font-variant-numeric:tabular-nums}' +
        '.L03 .L03-goal i{display:block;font-style:normal;margin-top:8px;font-size:12.5px;color:var(--text-lo);line-height:1.4}' +
        '.L03 .L03-goal i b{color:var(--text-mid);font-weight:700;font-variant-numeric:tabular-nums}' +

        '.L03 .L03-foot{margin-top:26px;font-size:11.5px;color:var(--text-lo);text-align:center;line-height:1.6;' +
          'font-variant-numeric:tabular-nums}' +
        '.L03 .L03-foot b{color:var(--text-mid);font-weight:700}' +
        '</style>';

      if (!log.length) return CSS + '<div class="L03"><div class="L03-foot">No days recorded yet.</div></div>';

      /* ---------------- helpers ---------------- */
      function esc(v) { return String(v == null ? '' : v); }
      function num(v) { var x = Number(v); return isFinite(x) ? x : 0; }
      function nf(v) { return num(v).toLocaleString(); }
      function dstr(v) { v = num(v); return nf(v) + (v === 1 ? ' day' : ' days'); }
      function ymd(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
      function key(y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
      function dim(y, m) { return new Date(y, m + 1, 0).getDate(); }
      function cls(e) {
        if (!e) return '';
        if (e.on) return 'on';
        return (e.sup && Object.keys(e.sup).length) ? 'sup' : 'off';
      }

      var N = Math.max(1, num(s.N) || log.length);
      var map = {};
      log.forEach(function (d) { map[d.key] = d; });

      var lastD = log[log.length - 1].date, firstD = log[0].date;
      var Y = lastD.getFullYear(), M = lastD.getMonth(), TD = lastD.getDate();
      var cur = num(s.current), best = num(s.best);

      /* ---------------- the month itself ---------------- */
      var startDow = new Date(Y, M, 1).getDay(), DIM = dim(Y, M);
      var cells = [], i, dd;
      for (i = 0; i < startDow; i++) cells.push(null);
      for (dd = 1; dd <= DIM; dd++) cells.push({ d: dd, e: map[key(Y, M, dd)] || null });
      while (cells.length % 7) cells.push(null);

      /* the week column earns a header so a bare number never floats unexplained */
      var head = WD.map(function (w) { return '<div class="L03-wd">' + w + '</div>'; }).join('') +
        '<div class="L03-wd L03-wd--g">days</div>';

      var rows = '';
      for (i = 0; i < cells.length; i += 7) {
        var wkRow = cells.slice(i, i + 7), rOn = 0, rTracked = 0;
        wkRow.forEach(function (c) {
          if (!c || !c.e) return;
          rTracked++; if (c.e.on) rOn++;
        });
        rows += wkRow.map(function (c) {
          if (!c) return '<div class="L03-d"></div>';
          var k = cls(c.e), t = (c.d === TD) ? ' today' : '';
          return '<div class="L03-d ' + k + t + '">' + c.d + '</div>';
        }).join('');
        rows += '<div class="L03-g">' + (rTracked ? rOn : '') + '</div>';
      }

      var monthOn = 0, monthAll = 0, totalOn = 0;
      log.forEach(function (d) {
        if (d.on) totalOn++;
        if (d.date.getFullYear() === Y && d.date.getMonth() === M) { monthAll++; if (d.on) monthOn++; }
      });

      /* on the very first day "1 of 1 day" is a sentence about nothing, so the
         month simply states what it has */
      var header =
        '<div class="L03-mh"><b>' + MONF[M] + '</b><i><em>' + nf(monthOn) + '</em> ' +
        (monthAll <= 1 ? (monthOn === 1 ? 'day' : 'days') : 'of ' + dstr(monthAll)) +
        '</i></div>';

      var calendar = '<div class="L03-cal">' + head + rows + '</div>';

      /* ---------------- the legend, only for states that exist ---------------- */
      var hasOn = false, hasSup = false, hasOff = false;
      log.forEach(function (d) {
        var k = cls(d);
        if (k === 'on') hasOn = true; else if (k === 'sup') hasSup = true; else hasOff = true;
      });
      var chips = [];
      if (hasOn) chips.push('<span><u class="a"></u>showed up</span>');
      if (hasSup) chips.push('<span><u class="b"></u>something smaller</span>');
      if (hasOff) chips.push('<span><u class="c"></u>missed</span>');
      /* one swatch explains nothing, it just decorates */
      var legend = chips.length >= 2 ? '<div class="L03-leg">' + chips.join('') + '</div>' : '';

      /* ---------------- the months behind this one ---------------- */
      var monthsBack = [];
      (s.months || []).forEach(function (m) {
        if (!m || !m.date) return;
        if (m.date.getFullYear() === Y && m.date.getMonth() === M) return;
        monthsBack.push(m);
      });
      monthsBack.reverse();

      /* ---------------- what the month means, at most two plain lines ---------------- */
      var say = [], said = false;

      /* a month ago today, only when the record actually reaches back that far */
      var pm = M === 0 ? 11 : M - 1, py = M === 0 ? Y - 1 : Y;
      var prevFirstYmd = py * 10000 + (pm + 1) * 100 + 1;
      if (ymd(firstD) <= prevFirstYmd) {
        var prevSoFar = 0;
        log.forEach(function (d) {
          if (d.date.getFullYear() === py && d.date.getMonth() === pm && d.date.getDate() <= TD && d.on) prevSoFar++;
        });
        say.push('A month ago today you were at <b>' + nf(prevSoFar) + '</b> ' +
          (prevSoFar === 1 ? 'day' : 'days') + '. ' +
          (prevSoFar === monthOn ? 'Exactly where you are now.' : 'You are at <b>' + nf(monthOn) + '</b> now.'));
        said = true;
      }

      /* one month behind is not a strip, it is a sentence: a lone half width
         grid of mostly untracked days reads as a broken fragment. If the line
         above already spoke about that month, nothing more needs saying */
      if (monthsBack.length === 1 && !said && num(monthsBack[0].on) > 0) {
        say.push('In ' + MONF[monthsBack[0].date.getMonth()] + ' you showed up <b>' +
          dstr(monthsBack[0].on) + '</b>.');
      }

      /* a held vow prints its length in the goal card below, and a run that is
         the entire record is already drawn whole in the calendar above, so the
         run line steps aside rather than say the same number twice */
      var runIsTheWholeMonth = cur >= log.length && monthAll >= log.length;
      if (shape !== 'maintenance' && !runIsTheWholeMonth) {
        if (cur >= 1) {
          say.push('Your current run is <b>' + dstr(cur) + '</b>.' +
            (best > cur ? ' Your longest is <b>' + dstr(best) + '</b>.' : ''));
        } else if (best >= 1) {
          say.push('Your longest run so far is <b>' + dstr(best) + '</b>.');
        }
      }

      var read = say.length ? '<div class="L03-read"><p>' + say.join('</p><p>') + '</p></div>' : '';

      /* ---------------- earlier months, as real months ---------------- */
      var earlier = '';
      if (monthsBack.length >= 2) {
        /* the strip only opens as many columns as it can actually fill */
        var mcols = Math.min(4, Math.max(2, monthsBack.length));
        earlier = '<div class="L03-sec"><div class="L03-h">Earlier months</div>' +
          '<div class="L03-ms' + (mcols <= 3 ? ' L03-ms--wide' : '') + '" style="grid-template-columns:repeat(' + mcols + ',1fr)">' +
          monthsBack.map(function (m) {
            var my = m.date.getFullYear(), mm = m.date.getMonth();
            var sd = new Date(my, mm, 1).getDay(), dm = dim(my, mm), g = '', j;
            for (j = 0; j < sd; j++) g += '<b class="L03-pad"></b>';
            for (j = 1; j <= dm; j++) {
              var e = map[key(my, mm, j)];
              g += '<b class="' + (e ? cls(e) : 'L03-void') + '"></b>';
            }
            var label = MON[mm] + (my !== Y ? ' ’' + String(my).slice(-2) : '');
            return '<div class="L03-m">' +
              '<div class="L03-m__l"><span>' + label + '</span><b>' + nf(m.on) + '</b></div>' +
              '<div class="L03-m__g">' + g + '</div></div>';
          }).join('') +
        '</div></div>';
      }

      /* ---------------- where the goal stands ---------------- */
      var lead = esc(sh && sh.lead), sub = esc(sh && sh.sub);
      /* the shape line is written for a record with some size to it, so a young
         record never gets told it has "1 days" or "1 sessions" */
      if (lead === '1') sub = sub.replace(/^days\b/, 'day').replace(/^sessions\b/, 'session');
      if (shape === 'frequency' && N < 28) sub = sub.replace(/,\s*last four weeks$/, ', so far');

      var ctxV = (sh && sh.ctx) ? esc(sh.ctx.v) : '', ctxL = (sh && sh.ctx) ? esc(sh.ctx.l) : '';
      /* two of the shared labels are written as fragments and land as broken
         sentences on their own line, so they get their verb back here */
      if (shape === 'maintenance') ctxL = 'is the longest stretch you have held';
      if (shape === 'quantity_down') ctxL = 'is where you are now';
      /* a second number that only repeats the first is worse than no second line:
         a percentage IS the two numbers beside it divided, a best run that equals
         the current run is the same run twice, and frequency has its own week
         line built on the sunday grid this calendar uses */
      var ctxSkip = String(ctxV) === String(lead) ||
        shape === 'quantity_up' ||
        shape === 'frequency' ||
        (shape === 'maintenance' && best <= cur);

      /* the weeks a frequency goal actually landed, counted on the same sunday
         weeks the calendar draws, so no two numbers on this page disagree */
      var freqLine = '';
      if (shape === 'frequency') {
        var wks = [], cw = null;
        log.forEach(function (d) {
          if (!cw || d.date.getDay() === 0) { cw = { on: 0 }; wks.push(cw); }
          if (d.on) cw.on++;
        });
        var cadence = num(s.cadence) || 4;
        var met = wks.filter(function (w) { return w.on >= cadence; }).length;
        if (wks.length >= 3) {
          freqLine = 'You hit all ' + nf(cadence) + ' in <b>' + nf(met) + '</b> of ' + nf(wks.length) + ' weeks.';
        }
      }

      var goal = '';
      /* an open goal has no number to stand anywhere, and the whole page is
         already the record, so the section simply does not appear */
      if (shape !== 'open' && lead && sub) {
        var note = freqLine ? '<i>' + freqLine + '</i>'
          : (ctxV && !ctxSkip ? '<i><b>' + ctxV + '</b> ' + ctxL + '.</i>' : '');
        goal = '<div class="L03-sec"><div class="L03-h">Where the goal stands</div>' +
          '<div class="L03-goal"><p><b>' + lead + '</b> ' + sub + '.</p>' + note + '</div></div>';
      }

      /* ---------------- the quiet total, the only one on the page ---------------- */
      var since = MONF[firstD.getMonth()] + ' ' + firstD.getDate() + ', ' + firstD.getFullYear();
      /* the total is only news once the record outgrows the month on screen, and
         a milestone card already banks it, so the rest of the time the footer
         says the one thing nothing else says: when this started */
      var totalIsNews = monthAll < log.length && shape !== 'milestone';
      var footTxt;
      if (ymd(firstD) === ymd(lastD)) footTxt = 'Day one.';
      else if (!totalIsNews) footTxt = 'Tracked since ' + since + '.';
      else footTxt = '<b>' + nf(totalOn) + '</b> ' + (totalOn === 1 ? 'day' : 'days') + ' recorded since ' + since + '.';
      var foot = '<div class="L03-foot">' + footTxt + '</div>';

      return CSS + '<div class="L03">' +
        header + calendar + legend + read +
        earlier + goal + foot +
      '</div>';
    }
  };
})();
