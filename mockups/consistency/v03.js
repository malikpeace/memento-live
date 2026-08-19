/* v03. Glass stack.
   Every stat family gets its own glass panel: real backdrop blur, one job per
   card, a quiet heading, stacked on near-black over a soft ambient so the blur
   has something true to sample. The bloom lives in the first card. */
(function (W) {
  'use strict';

  /* scoped styles: nothing here touches a .ck-* or .cx class globally */
  var STYLE = '<style>' + [
    /* The ambient the glass samples. It is one tiling field of soft washes, each
       one geometrically transparent before the tile's top and bottom edge, so it
       can never resolve into a straight line, and masked out at the very bottom
       so the page does not end on a band. Clipped to the screen, never wider. */
    '.cx.v03{position:relative;overflow-x:clip;background:transparent}',
    /* inset:0 resolves against the padding box, which is the full phone width, so
       the field reaches both screen edges with no horizontal overflow at all */
    '.v03-amb{position:absolute;inset:0;pointer-events:none;z-index:0;',
    '  background-image:',
    '    radial-gradient(175px 175px at 15% 190px,rgba(var(--accent-rgb),.11),rgba(var(--accent-rgb),0) 100%),',
    '    radial-gradient(190px 190px at 88% 470px,rgba(var(--ink),.13),rgba(var(--ink),0) 100%),',
    '    radial-gradient(135px 135px at 45% 762px,rgba(var(--accent-rgb),.045),rgba(var(--accent-rgb),0) 100%);',
    '  background-size:100% 900px;background-repeat:repeat;',
    '  -webkit-mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 200px),transparent 100%);',
    '  mask-image:linear-gradient(180deg,#000 0,#000 calc(100% - 200px),transparent 100%)}',
    '.v03-stack{position:relative;z-index:1;gap:12px}',
    '.v03-z{position:relative;z-index:1}',

    /* the glass itself: gradient fill, deep blur, inset highlight, no border */
    '.ck-panel.v03-p{padding:16px 15px 15px;border-radius:16px;',
    '  background:linear-gradient(180deg,rgba(var(--ink),.10),rgba(var(--ink),.05) 44%,rgba(var(--ink),.035));',
    '  -webkit-backdrop-filter:blur(34px) saturate(1.7);backdrop-filter:blur(34px) saturate(1.7);',
    '  box-shadow:inset 0 1px 0 rgba(var(--ink),.11),inset 0 -1px 0 rgba(0,0,0,.24),0 14px 38px rgba(0,0,0,.46)}',

    /* accent volume: this surface is mostly data, so every chart gets turned
       down until the green is an accent again instead of a wall */
    '.v03 .ck-cal b{background:rgba(var(--ink),.075)}',
    '.v03 .ck-cal b.on{background:rgba(var(--accent-rgb),.30)}',
    '.v03 .ck-cal b.sup{background:rgba(var(--accent-rgb),.13)}',
    '.v03 .ck-cal b.today{background:rgba(var(--accent-rgb),.92);box-shadow:0 0 0 2px rgba(var(--accent-rgb),.16)}',
    '.v03 .ck-mg__g b.on{background:rgba(var(--accent-rgb),.24);color:var(--text-hi)}',
    '.v03 .ck-mg__g b.sup{background:rgba(var(--accent-rgb),.12)}',
    '.v03 .ck-mg__g b.today{box-shadow:inset 0 0 0 1.5px rgba(var(--accent-rgb),.85)}',
    '.v03 .ck-mo__t i{max-width:26px;margin:0 auto;background:rgba(var(--accent-rgb),.22)}',
    '.v03 .ck-spark__a{fill:rgba(var(--accent-rgb),.07)}',
    '.v03 .ck-sup__bar u{background:rgba(var(--accent-rgb),.45)}',

    /* the rolling rate needs a frame to be read against: a ceiling line at every
       day, a floor at none, and the span named underneath */
    '.v03-spark{position:relative;padding:3px 0 0}',
    '.v03-spark::before,.v03-spark::after{content:"";position:absolute;left:0;right:0;height:1px}',
    '.v03-spark::before{top:0;background:rgba(var(--ink),.11)}',
    '.v03-spark::after{bottom:0;background:rgba(var(--ink),.07)}',
    '.v03-axis{display:flex;justify-content:space-between;margin-top:7px;font-size:10.5px;color:var(--text-lo)}',

    /* panel head: quiet, sentence case, one number on the right */
    '.v03-ph{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 5px}',
    '.v03-ph h3{margin:0;font-size:13.5px;font-weight:650;letter-spacing:-.01em;color:var(--text-hi)}',
    '.v03-ph i{font-style:normal;font-size:12px;font-weight:600;color:var(--text-mid);font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.v03-dek{margin:0 0 13px;font-size:12px;line-height:1.5;color:var(--text-mid)}',
    '.v03-d{margin:13px 0 0;font-size:12.5px;line-height:1.55;color:var(--text-mid)}',
    '.v03-d em{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text-hi)}',
    '.v03-d em.up{color:var(--accent)}',
    '.v03-mt{margin-top:11px}',

    /* hero card */
    '.v03-hero{margin-top:2px}',
    '.v03-hero .ck-bloomwrap{margin:0}',
    '.v03-lead{text-align:center;margin-top:10px}',
    '.v03-strip{display:grid;grid-template-columns:repeat(3,1fr);align-items:start;',
    '  margin-top:16px;padding-top:14px;box-shadow:inset 0 1px 0 var(--hairline)}',
    '.v03-strip div{text-align:center;padding:0 4px}',
    '.v03-strip div + div{box-shadow:inset 1px 0 0 var(--hairline)}',
    '.v03-strip b{display:block;font-size:19px;font-weight:750;letter-spacing:-.025em;font-variant-numeric:tabular-nums;line-height:1}',
    '.v03-strip span{display:block;margin-top:5px;font-size:11px;line-height:1.35;color:var(--text-mid)}',

    /* week bars */
    '.v03-cal{margin:0 auto}',
    '.v03-wk{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;height:104px;',
    '  max-width:calc(var(--n,8) * 40px);margin:0 auto}',
    '.v03-wk__c{display:flex;flex-direction:column;align-items:center;height:100%}',
    '.v03-wk__t{width:100%;max-width:26px;flex:1;min-height:0;display:flex;align-items:flex-end;',
    '  border-radius:7px;background:rgba(var(--ink),.05);box-shadow:var(--inset);overflow:hidden}',
    '.v03-wk__t i{width:100%;border-radius:6px 6px 0 0;background:rgba(var(--accent-rgb),.22)}',
    '.v03-wk__c.now .v03-wk__t i{background:rgba(var(--accent-rgb),.55)}',
    /* a week the record only partly covers is drawn on the same scale as a full
       one, so it must be marked rather than left to read as a weak week */
    '.v03-wk__c.part .v03-wk__t i{background:rgba(var(--accent-rgb),.13)}',
    '.v03-wk__c b{margin-top:7px;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text-mid)}',
    '.v03-wk__c.now b{color:var(--text-hi)}',
    '.v03-wk__c span{margin-top:2px;font-size:9.5px;color:var(--text-lo);white-space:nowrap}',

    /* weekday bars, same skeleton as the week bars so the track can never
       overflow its box and 100% of the track means 100% of that weekday */
    '.v03-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;height:112px}',
    '.v03-dow__c{display:flex;flex-direction:column;align-items:center;height:100%}',
    '.v03-dow__t{width:100%;max-width:30px;flex:1;min-height:0;display:flex;align-items:flex-end;',
    '  border-radius:7px;background:rgba(var(--ink),.05);box-shadow:var(--inset);overflow:hidden}',
    '.v03-dow__t i{width:100%;border-radius:6px 6px 0 0;background:rgba(var(--accent-rgb),.22)}',
    '.v03-dow__c.top .v03-dow__t i{background:rgba(var(--accent-rgb),.5)}',
    '.v03-dow__c b{margin-top:7px;font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--text-mid)}',
    '.v03-dow__c.top b{color:var(--text-hi)}',
    '.v03-dow__c span{margin-top:1px;font-size:9.5px;color:var(--text-lo)}',

    /* calendar legend */
    '.v03-leg{display:flex;flex-wrap:wrap;gap:7px 14px;margin-top:13px;font-size:11.5px;color:var(--text-mid)}',
    '.v03-leg span{display:inline-flex;align-items:center;gap:6px}',
    '.v03-leg i{width:9px;height:9px;border-radius:2.5px;background:rgba(var(--ink),.055)}',
    '.v03-leg i.on{background:rgba(var(--accent-rgb),.62)}',
    '.v03-leg i.sup{background:rgba(var(--accent-rgb),.22)}',

    /* the quiet closing note, same glass as the panels */
    '.v03 .ck-locked{align-items:flex-start;border-radius:14px;padding:13px 14px;',
    '  background:linear-gradient(180deg,rgba(var(--ink),.07),rgba(var(--ink),.035));',
    '  -webkit-backdrop-filter:blur(30px) saturate(1.5);backdrop-filter:blur(30px) saturate(1.5);',
    '  box-shadow:inset 0 1px 0 rgba(var(--ink),.09),0 10px 26px rgba(0,0,0,.34)}',
    '.v03-ic{width:15px;height:15px;flex:0 0 auto;margin-top:1px;color:var(--accent);opacity:.9}',
    '.v03 .cx__foot{margin-top:22px}'
  ].join('') + '</style>';

  W.CVAR = W.CVAR || {};
  W.CVAR['v03'] = {
    name: 'Glass stack',
    note: 'Each stat family is its own glass card with one job, stacked on near-black, the bloom in the first card.',
    render: function (ctx) {
      var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh, shape = ctx.shape;

      /* ---------- helpers ---------- */
      function pctOf(a, b) { return b ? Math.round(100 * a / b) : 0; }
      function one(n, a, b) { return n === 1 ? a : b; }
      function md(d) { return K.MON[d.getMonth()] + ' ' + d.getDate(); }
      function mdy(d) { return K.MON[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
      function d1(v) { return String(Math.round(v * 10) / 10); }
      function dim(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
      function ord(v) {
        var t = v % 100;
        if (t >= 11 && t <= 13) return v + 'th';
        return v + (['th', 'st', 'nd', 'rd'][v % 10] || 'th');
      }
      function panel(head, right, dek, body) {
        return '<section class="ck-panel v03-p">' +
          '<div class="v03-ph"><h3>' + head + '</h3>' + (right ? '<i>' + right + '</i>' : '') + '</div>' +
          (dek ? '<p class="v03-dek">' + dek + '</p>' : '') + body + '</section>';
      }
      function say(txt) { return '<p class="v03-d">' + txt + '</p>'; }
      function row(label, value, unit) {
        return '<div class="ck-row"><span>' + label + '</span><b>' + value +
          (unit ? '<em>' + unit + '</em>' : '') + '</b></div>';
      }
      function dot() {
        return '<svg class="v03-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" ' +
          'stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.6V8l2.3 1.8"/></svg>';
      }

      /* ---------- derived, all of it from the log ---------- */
      var day1 = log[0].date, dayN = log[log.length - 1].date;
      var win30 = Math.min(30, s.N), miss30 = win30 - s.r30;
      var supTotal = (s.sup.deepwork || 0) + (s.sup.reflection || 0) + (s.sup.checkin || 0) + (s.sup.vivere || 0);
      var weeksN = s.weeks.length;
      var minPerWeek = Math.round(s.minutes / Math.max(1, s.N / 7));
      var avgGap = s.gaps ? d1(s.missed / s.gaps) : '0';
      var maxMin = 0, maxDate = null;
      log.forEach(function (d) { if (d.minutes > maxMin) { maxMin = d.minutes; maxDate = d.date; } });

      /* the week buckets run Monday to Monday, so the first and the current one
         are usually short. A cadence can only be judged on a week that had all
         seven days available, so those are counted separately. */
      var fullWeeks = s.weeks.filter(function (w) { return w.all === 7; });
      var metFull = fullWeeks.filter(function (w) { return w.on >= s.cadence; }).length;

      /* the whole-life trend: the first half of the record against the second */
      var mid = Math.floor(s.N / 2);
      function slab(a) {
        var on = 0, min = 0;
        a.forEach(function (d) { if (d.on) { on++; min += d.minutes; } });
        return { n: a.length, on: on, min: min, pct: pctOf(on, a.length) };
      }
      var h1 = slab(log.slice(0, mid)), h2 = slab(log.slice(mid));
      var halfDelta = h2.pct - h1.pct;

      /* when the longest gap started, so the page can name it */
      var gRun = 0, gStart = null, lgStart = null, lgLen = 0;
      log.forEach(function (d) {
        if (d.on) { gRun = 0; return; }
        if (gRun === 0) gStart = d.date;
        gRun++;
        if (gRun > lgLen) { lgLen = gRun; lgStart = gStart; }
      });

      /* weekday standing by rate, so the sentence matches the drawn percentages */
      var bR = -1, bI = 0, wR = 2, wI = 0, seenAll = 0, i, r;
      for (i = 0; i < 7; i++) {
        if (!s.dowSeen[i]) continue;
        seenAll++;
        r = s.byDow[i] / s.dowSeen[i];
        if (r > bR) { bR = r; bI = i; }
        if (r < wR) { wR = r; wI = i; }
      }

      /* Month standing, judged only over months holding a real week, and only
         over the months the chart actually draws. The chart shows the last 12,
         so ranking over a longer record would name a month nobody can see, and
         two Augusts a year apart would read as one. */
      var charted = s.months.slice(-12);
      var solid = charted.filter(function (m) { return m.all >= 7; });
      if (!solid.length) solid = charted.slice();
      var bestM = null, worstM = null;
      solid.forEach(function (m) {
        if (!bestM || pctOf(m.on, m.all) > pctOf(bestM.on, bestM.all)) bestM = m;
        if (!worstM || pctOf(m.on, m.all) < pctOf(worstM.on, worstM.all)) worstM = m;
      });
      var tm = s.thisMonth, lm = s.lastMonth;
      var tmPct = pctOf(tm.on, tm.all), lmPct = pctOf(lm.on, lm.all);
      var hasLast = s.months.length >= 2 && lm.date;
      var daysLeft = dim(dayN) - dayN.getDate();

      /* ================= 1. the bloom ================= */
      var strip =
        '<div class="v03-strip">' +
          '<div><b>' + K.n(s.total) + '</b><span>days shown up</span></div>' +
          '<div><b>' + K.n(s.missed) + '</b><span>days missed</span></div>' +
          '<div><b>' + K.n(sh.ctx.v) + '</b><span>' + sh.ctx.l + '</span></div>' +
        '</div>';

      /* the bloom's frame has a floor, so a young record must render smaller or it
         sits as a handful of seeds inside a large empty square */
      var bSize = Math.max(200, Math.min(296, Math.round(296 * Math.sqrt(Math.min(1, s.total / 50)))));

      var pHero = panel('Since day one', s.N + ' days tracked', '',
        '<div class="v03-hero">' +
          '<div class="ck-bloomwrap">' + K.bloomSVG(s.total, { size: bSize, animate: true }) + '</div>' +
          '<div class="v03-lead"><div class="ck-n ck-n--big">' + sh.lead + '</div>' +
            '<div class="ck-u">' + sh.sub + '</div></div>' +
          '<p class="ck-micro">One seed for every day you showed up, laid down in the order you earned them. ' +
            'The bright one is today.</p>' +
        '</div>' + strip);

      /* ================= 2. the last 30 days ================= */
      var lately = say('You showed up ' + s.r30 + ' of the last ' + win30 + ' days and missed ' + miss30 + '.' +
        (s.N >= 60 ? ' In the 30 days before those you showed up ' + s.rPrev30 + ' of 30.' : ''));
      if (s.N >= 60) {
        lately += '<div class="ck-tiles ck-tiles--2 v03-mt">' +
          K.tile(s.r30, 'in the last 30 days', 'of ' + win30 + ' ' + K.delta(s.delta30)) +
          K.tile(s.rPrev30, 'the 30 days before', 'of 30') + '</div>';
        lately += say(s.delta30 > 0
          ? 'You are showing up more often now than you were a month ago.'
          : s.delta30 < 0
            ? 'You are showing up less often now than you were a month ago.'
            : 'The same count as the month before it.');
      }
      /* the drawn span must be the span in the heading, or the chart argues with
         the number sitting above it */
      var spark = '<div class="v03-spark">' + K.sparkline(log, win30, 320, 46) + '</div>' +
        '<div class="v03-axis"><span>' + win30 + ' days ago</span><span>today</span></div>';
      var p30 = panel('The last ' + win30 + ' days', s.r30 + ' of ' + win30,
        'A rolling seven day rate. The ceiling is every day, the floor is none.',
        spark + lately);

      /* ================= 3. week by week ================= */
      var wks = s.weeks.slice(-8), shortPast = 0;
      var wkBars = '<div class="v03-wk" style="--n:' + wks.length + '">' + wks.map(function (w, idx) {
        var h = Math.max(4, Math.round(100 * w.on / 7));
        var now = idx === wks.length - 1, part = w.all < 7 && !now;
        if (part) shortPast++;
        return '<div class="v03-wk__c' + (now ? ' now' : '') + (part ? ' part' : '') + '">' +
          '<div class="v03-wk__t"><i style="height:' + h + '%"></i></div>' +
          '<b>' + w.on + '</b><span>' + md(w.start) + '</span></div>';
      }).join('') + '</div>';
      var wkSay = 'Across the whole record you average ' + d1(s.perWeek) + ' days a week.' +
        (weeksN >= 5 ? ' Over the last four weeks, ' + d1(s.last4Rate) + '.' : '');
      if (shortPast) {
        wkSay += ' The faded bar is a week the record only partly covers, so it had fewer than seven days to fill.';
      }
      if (shape === 'frequency') {
        wkSay += ' You set ' + s.cadence + ' a week. Of the ' + fullWeeks.length + ' full ' +
          one(fullWeeks.length, 'week', 'weeks') + ' on record you hit it in ' + metFull + '.';
      }
      var pWeeks = panel('Week by week', 'last ' + wks.length + ' weeks',
        'Days you showed up in each week. Every bar is measured against seven. The last one is this week so far, still running.',
        wkBars + say(wkSay));

      /* ================= 4. runs and gaps ================= */
      var pRuns = panel('Runs and gaps', s.gaps + one(s.gaps, ' break', ' breaks'),
        'A run is consecutive days. A gap is everything that came between them.',
        '<div class="ck-tiles">' +
          K.tile(s.current, 'current run', one(s.current, 'day', 'days')) +
          K.tile(s.best, 'longest run', one(s.best, 'day', 'days')) +
          K.tile(s.longestGap, 'longest gap', one(s.longestGap, 'day', 'days')) +
        '</div>' +
        '<div class="ck-rows v03-mt">' +
          row('Times the run broke', s.gaps) +
          row('Times you started again', s.comebacks) +
          row('Average gap', s.gaps ? avgGap : 'none', s.gaps ? one(Number(avgGap), 'day', 'days') : '') +
        '</div>' +
        say(s.gaps === 0
          ? 'You have not missed a day yet. The record is ' + s.N + ' days long.'
          : 'The longest gap ran ' + s.longestGap + ' ' + one(s.longestGap, 'day', 'days') + ' from ' +
            md(lgStart) + '.' + (s.current > 0 ? ' You came back from it.' : '')));

      /* ================= 5. every day since day one ================= */
      var legend = '<div class="v03-leg">' +
        '<span><i class="on"></i>showed up</span>' +
        '<span><i class="sup"></i>logged something smaller</span>' +
        '<span><i class="off"></i>missed</span></div>';
      var calCols = Math.max(7, Math.min(21, Math.round(Math.sqrt(s.N * 1.6))));
      var calGap = s.N > 180 ? 3 : s.N > 90 ? 4 : 6;
      var calW = calCols * 26 + (calCols - 1) * calGap;
      var pCal = panel('Every day since day one', s.rate + '%',
        'One cell a day, oldest first. The empty cells are days you missed.',
        '<div class="v03-cal" style="max-width:' + calW + 'px">' +
          K.calendarHTML(log, { cols: calCols }) + '</div>' + legend +
        say('Since ' + mdy(day1) + ' you have shown up on ' + s.total + ' of ' + s.N +
          ' days and missed ' + s.missed + '.'));

      /* ================= 6. this month ================= */
      /* if the record itself starts inside this month, "so far" would read as the
         whole month to date, which is more days than were ever tracked */
      var startsHere = day1.getFullYear() === dayN.getFullYear() && day1.getMonth() === dayN.getMonth();
      var monthSay = K.MONF[dayN.getMonth()] + ': ' + tm.on + ' of ' + tm.all + ' days so far, ' + tmPct + '%.';
      if (startsHere) {
        monthSay += ' The record starts on the ' + ord(day1.getDate()) + ', so the days before it were never tracked.';
      }
      if (hasLast) {
        monthSay += ' ' + K.MONF[lm.date.getMonth()] + ' finished at ' + lm.on + ' of ' + lm.all + ', ' + lmPct + '%.';
      }
      var dnum = dayN.getDate();
      var mgrid = K.monthGrid(log);
      ['on', 'sup', 'off'].forEach(function (c) {
        mgrid = mgrid.replace('<b class="' + c + '">' + dnum + '</b>',
                              '<b class="' + c + ' today">' + dnum + '</b>');
      });
      var pMonth = panel('This month', tmPct + '%',
        'The month you are in, day by day. Today is ringed. It is still running.',
        mgrid + say(monthSay) +
        (hasLast ? say((tmPct === lmPct
            ? 'That is level with last month'
            : 'That is <em class="' + (tmPct > lmPct ? 'up' : 'down') + '">' +
              (tmPct > lmPct ? '+' : '') + (tmPct - lmPct) + '</em> points against last month') +
          (daysLeft > 0 ? ', with ' + daysLeft + ' ' + one(daysLeft, 'day', 'days') + ' left to add to it.'
                        : ', and the month is finished.')) : ''));

      /* ================= 7. month by month ================= */
      var pMonths = '';
      if (s.months.length >= 3) {
        /* the chart draws the months the record only clips too, so the page has
           to say which of them the ranking actually judged */
        var partCharted = charted.filter(function (m) { return m.all < dim(m.date); }).length;
        /* naming one month when five bars share the same height would read as a
           ranking the chart does not support, so ties get counted out loud */
        var bestP = pctOf(bestM.on, bestM.all), worstP = pctOf(worstM.on, worstM.all);
        function tiedAt(p) {
          return solid.filter(function (m) { return pctOf(m.on, m.all) === p; }).length - 1;
        }
        function level(t) {
          return t > 0 ? ', level with ' + t + ' other ' + one(t, 'month', 'months') : '';
        }
        var mSay = 'Strongest month drawn here, ' + K.MONF[bestM.date.getMonth()] + ' at ' +
          bestP + '%' + level(tiedAt(bestP)) + '. Weakest, ' + K.MONF[worstM.date.getMonth()] +
          ' at ' + worstP + '%' + level(tiedAt(worstP)) + '.';
        var caveats = [];
        if (solid.length < charted.length) {
          caveats.push('only the ' + solid.length + ' ' + one(solid.length, 'month', 'months') +
            ' with a full week or more on record ' + one(solid.length, 'is', 'are') + ' ranked');
        }
        if (partCharted) {
          caveats.push(partCharted + ' of the bars ' + one(partCharted, 'covers', 'cover') +
            ' part of a month, not all of it');
        }
        if (caveats.length) {
          var cv = caveats.join(', and ');
          mSay += ' ' + cv.charAt(0).toUpperCase() + cv.slice(1) + '.';
        }
        pMonths = panel('Month by month', charted.length + ' months',
          'The share of each month you showed up, oldest on the left.',
          K.monthChart(s) + say(mSay));
      }

      /* ================= 8. the first half against the second ================= */
      var pHalves = '';
      if (s.N >= 30) {
        pHalves = panel('The first half against the second',
          (halfDelta > 0 ? '+' : '') + halfDelta + ' points',
          'The whole record cut down the middle, the older half against the newer one.',
          '<div class="ck-tiles ck-tiles--2">' +
            K.tile(h1.pct + '%', 'first ' + h1.n + ' days', h1.on + ' of ' + h1.n + ' shown up') +
            K.tile(h2.pct + '%', 'last ' + h2.n + ' days', h2.on + ' of ' + h2.n + ' shown up') +
          '</div>' +
          '<div class="ck-rows v03-mt">' +
            row('Hours logged, first half', K.n(Math.round(h1.min / 60))) +
            row('Hours logged, second half', K.n(Math.round(h2.min / 60))) +
            row('Minutes a session, first half', h1.on ? Math.round(h1.min / h1.on) : 0, 'min') +
            row('Minutes a session, second half', h2.on ? Math.round(h2.min / h2.on) : 0, 'min') +
          '</div>' +
          say(halfDelta > 0
            ? 'The newer half of the record is <em class="up">' + halfDelta + '</em> points above the older half.'
            : halfDelta < 0
              ? 'The newer half of the record is <em>' + Math.abs(halfDelta) +
                '</em> points below the older half.'
              : 'Both halves of the record sit at the same rate.'));
      }

      /* ================= 9. your week ================= */
      var pDow;
      if (s.N >= 14 && seenAll >= 5) {
        /* drawn by rate, not by raw count: the kit's chart sizes its bars on the
           count while printing the rate on them, so the tallest bar and the
           sentence underneath can name two different days */
        var dowBars = '<div class="v03-dow">' + s.byDow.map(function (v, i) {
          var seen = s.dowSeen[i], pct = seen ? Math.round(100 * v / seen) : 0;
          return '<div class="v03-dow__c' + (seen && i === bI ? ' top' : '') + '">' +
            '<div class="v03-dow__t"><i style="height:' + Math.max(3, pct) + '%"></i></div>' +
            '<b>' + pct + '</b><span>' + K.WD[i] + '</span></div>';
        }).join('') + '</div>';
        pDow = panel('Your week', '',
          'The share of the times each weekday came around that you showed up on it.',
          dowBars +
          say('You show up most on ' + K.WDF[bI] + ' at ' + Math.round(bR * 100) + '%, and least on ' +
            K.WDF[wI] + ' at ' + Math.round(wR * 100) + '%.'));
      } else {
        pDow = panel('Your week', '', 'How often you show up on each weekday.',
          '<div class="ck-locked">' + dot() +
          '<span>Weekday patterns need two full weeks of record before they mean anything. You are ' +
          s.N + ' ' + one(s.N, 'day', 'days') + ' in.</span></div>');
      }

      /* ================= 10. time on the work ================= */
      var pTime = panel('Time on the work', s.hours + ' hours',
        'Minutes are counted only on the days you made the main move.',
        '<div class="ck-tiles ck-tiles--2">' +
          K.tile(s.hours, 'hours logged', K.n(s.minutes) + ' minutes') +
          K.tile(s.avgSession, 'minutes a session', 'across ' + s.total + ' days') +
        '</div>' +
        '<div class="ck-rows v03-mt">' +
          row('Longest single day', maxMin, 'min' + (maxDate ? ', ' + md(maxDate) : '')) +
          row('Average a week', K.n(minPerWeek), 'min') +
          row('Days with no minutes', K.n(s.missed)) +
        '</div>');

      /* ================= 11. everything else you logged ================= */
      var pSup = panel('Everything else you logged', K.n(supTotal) + ' in total',
        'The smaller things recorded alongside the main move.',
        K.supportRows(s) +
        (s.supDays > 0
          ? say('On ' + s.supDays + ' ' + one(s.supDays, 'day', 'days') + ' you logged something without ' +
              'making the main move. Those days stay counted as missed.')
          : say('Every one of these landed on a day you also made the main move.')));

      /* ================= 12. the full ledger ================= */
      var pLedger = panel('The full ledger', '', 'Every number on this page, in one list.',
        '<div class="ck-rows">' +
          row('Started', mdy(day1)) +
          row('Latest day on record', mdy(dayN)) +
          row('Days tracked', K.n(s.N)) +
          row('Days shown up', K.n(s.total), s.rate + '%') +
          row('Days missed', K.n(s.missed), (100 - s.rate) + '%') +
          row('Run right now', s.current, one(s.current, 'day', 'days')) +
          row('Longest run', s.best, one(s.best, 'day', 'days')) +
          row('Times the run broke', s.gaps) +
          row('Times you started again', s.comebacks) +
          row('Longest gap', s.longestGap, one(s.longestGap, 'day', 'days')) +
          row('Full weeks on record', fullWeeks.length) +
          row('Days a week, average', d1(s.perWeek)) +
          row('Hours logged', K.n(s.hours)) +
          row('Average session', s.avgSession, 'min') +
          row('Support actions logged', K.n(supTotal)) +
          row('First day you showed up', s.firstOn ? mdy(s.firstOn) : 'not yet') +
          row('Last day you showed up', s.lastOn ? mdy(s.lastOn) : 'not yet') +
        '</div>');

      /* ================= the closing note ================= */
      var closing = '<div class="ck-locked">' + dot() + '<span>' +
        (s.N < 365
          ? 'The year fills in at 365 days. You are ' + s.N + ' days in, with ' + (365 - s.N) + ' left to record.'
          : 'You have ' + K.n(s.N) + ' days on record. Every one of them is still here, kept or missed.') +
        '</span></div>';

      /* ================= assembly ================= */
      return '<div class="cx v03">' + STYLE +
        '<div class="v03-amb" aria-hidden="true"></div>' +
        '<div class="cx__top v03-z"><div class="cx__title">Consistency</div>' +
          '<div class="cx__x"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" ' +
          'stroke-linecap="round" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8"/></svg></div></div>' +
        '<div class="ck-stack v03-stack">' +
          pHero + p30 + pWeeks + pRuns + pCal + pMonth + pMonths + pHalves + pDow + pTime + pSup + pLedger + closing +
        '</div>' +
        '<div class="cx__foot v03-z">A missed day is a missed day. Nothing on this page is rounded up.</div>' +
      '</div>';
    }
  };
})(window);
