/* ============================================================
   L04. THE PROFESSIONAL.
   The lens: what would Linear or Stripe ship? One column, two
   alignment edges, one accent used only as data ink, a strict
   type ladder (72 / 22 / 16 / 13.5 / 12.5) and exactly two
   devices for the whole page: a ledger card and a grid of days.
   The card answers one question only: what does the pattern look like
   lately, next to what it looked like before. Where the goal stands is
   Clarity's question, and it is not asked here.
   Every section answers one question and stops. Anything that
   does not change what you do next is a quiet footnote.
   ============================================================ */
(function () {
  var W = window; W.CLAY = W.CLAY || {};

  var MON  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONF = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WDN  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; /* sunday first, matches the kit's day indices */
  var WDL  = ['M','T','W','T','F','S','S'];                                            /* monday first, the grid's row labels */
  var SUPUNIT = { deepwork: 'sessions', reflection: 'entries', checkin: 'mornings', vivere: 'visions' };
  /* the footnote says these out loud, so it needs a singular and a plural */
  var SUPPHRASE = {
    deepwork:   ['deep work session', 'deep work sessions'],
    reflection: ['reflection', 'reflections'],
    checkin:    ['morning check-in', 'morning check-ins'],
    vivere:     ['Vivere vision', 'Vivere visions']
  };

  /* ---------- tiny safe helpers (never emit NaN / undefined) ---------- */
  function fin(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : (d || 0); }
  function num(v) {
    var x = Math.round(fin(v, 0));
    return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function plur(v, w) { return num(v) + ' ' + w + (Math.round(fin(v, 0)) === 1 ? '' : 's'); }
  function dstr(v) { return plur(v, 'day'); }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function pc(a, b) { return Math.max(0, Math.min(100, Math.round(100 * fin(a, 0) / Math.max(1, fin(b, 1))))); }
  /* a unit agrees with the number that was actually printed, so never "1 sessions" */
  function unitFor(u, shown) {
    u = String(u || '');
    return String(shown) === '1' ? u.replace(/s$/, '') : u;
  }
  /* a date carries its year only when the year is not the one you are in */
  function short(d, ref) {
    if (!d || !d.getMonth) return '';
    var s = MON[d.getMonth()] + ' ' + d.getDate();
    if (ref && ref.getFullYear && d.getFullYear() !== ref.getFullYear()) s += ', ' + d.getFullYear();
    return s;
  }
  function long_(d, ref) {
    if (!d || !d.getMonth) return '';
    var s = MONF[d.getMonth()] + ' ' + d.getDate();
    if (ref && ref.getFullYear && d.getFullYear() !== ref.getFullYear()) s += ', ' + d.getFullYear();
    return s;
  }
  function one(v) { var x = fin(v, 0); return (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, ''); }
  function list(parts) {
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  /* ---------- the two devices ---------- */
  function row(label, value, sub) {
    return '<div class="L04-r"><div class="L04-rl"><b>' + label + '</b>' +
      (sub ? '<i>' + sub + '</i>' : '') + '</div><div class="L04-rv">' + value + '</div></div>';
  }
  function head(title) { return '<div class="L04-h">' + title + '</div>'; }

  /* The record: a true calendar grid. Weeks are columns, weekdays are rows,
     months are labelled along the top. A day with no record (before you began,
     or later this week) is a fainter tier than a day you missed, so the grid
     keeps its shape without ever inventing a miss. Two tiers of green would be
     a legend nobody asked for, so a day is filled or it is not. */
  function record(log) {
    var N = log.length;
    var off = (log[0].date.getDay() + 6) % 7;
    var cols = Math.ceil((off + N) / 7);
    var lead = 0;
    if (cols < 18) { lead = (18 - cols) * 7; cols = 18; }
    var gap = cols > 30 ? 2 : cols > 22 ? 3 : 4;
    var showDays = cols <= 31;
    var avail = 336 - (showDays ? 20 : 0);
    var cell = Math.floor((avail - (cols - 1) * gap) / cols);
    cell = Math.max(4, Math.min(15, cell));
    var gridW = cols * cell + (cols - 1) * gap;
    var trail = Math.max(0, cols * 7 - (lead + off + N));
    var rad = Math.max(2, Math.round(cell / 4));

    var cells = '';
    var i;
    for (i = 0; i < lead + off; i++) cells += '<b class="nil"></b>';
    for (i = 0; i < N; i++) {
      cells += '<b class="' + (log[i].on ? (i === N - 1 ? 'on today' : 'on') : 'off') + '"></b>';
    }
    for (i = 0; i < trail; i++) cells += '<b class="nil"></b>';

    /* month axis, thinned so labels can never collide */
    var minGap = Math.ceil(30 / (cell + gap)), lastCol = -99, lastMon = -1, marks = '';
    for (i = 0; i < N; i++) {
      var m = log[i].date.getMonth();
      if (m === lastMon) continue;
      lastMon = m;
      var c = Math.floor((lead + off + i) / 7);
      if (c - lastCol < minGap) continue;
      lastCol = c;
      var left = c * (cell + gap);
      var pos = (left > gridW - 26) ? 'right:0' : 'left:' + left + 'px';
      marks += '<i style="' + pos + '">' + MON[m] + '</i>';
    }

    var rows = '';
    if (showDays) {
      rows = '<div class="L04-wd" style="grid-template-rows:repeat(7,' + cell + 'px);gap:' + gap + 'px">' +
        WDL.map(function (w, r) { return '<span>' + (r === 0 || r === 2 || r === 4 ? w : '') + '</span>'; }).join('') +
        '</div>';
    }

    return '<div class="L04-rec">' + rows +
      '<div class="L04-recc">' +
        '<div class="L04-mx" style="width:' + gridW + 'px">' + marks + '</div>' +
        '<div class="L04-grid" style="grid-template-rows:repeat(7,' + cell + 'px);grid-auto-columns:' + cell +
          'px;gap:' + gap + 'px;--rad:' + rad + 'px">' + cells + '</div>' +
      '</div></div>';
  }

  /* One sentence where a seven-row bar chart used to be. It only speaks when a
     weekday has enough samples to mean anything and the spread is real. */
  function rhythmLine(s) {
    var byDow = (s && s.byDow) || [], seen = (s && s.dowSeen) || [];
    var hi = -1, lo = -1, hiR = -1, loR = 2, i, n, r;
    for (i = 0; i < 7; i++) {
      n = fin(seen[i], 0);
      if (n < 3) continue;
      r = fin(byDow[i], 0) / n;
      if (r > hiR) { hiR = r; hi = i; }
      if (r < loR) { loR = r; lo = i; }
    }
    if (hi < 0 || lo < 0 || hi === lo || hiR - loR < 0.15) return '';
    return ' You show up most on ' + WDN[hi] + 's, least on ' + WDN[lo] + 's.';
  }

  /* ---------- the one branch: the goal shape tunes the top of the card ----------
     Every shape returns the same three things, so the layout never changes shape:
     one value, one bar, one supporting line. None of them is a goal reading.
     Where you stand against a target is Clarity's job; this card only ever
     reports the pattern: what you did lately, and how that compares to you. */
  function pattern(s, lately) {
    var w = lately.w, on = lately.on, prev = lately.prevOn;
    var v = num(on) + ' of the last ' + dstr(w);
    if (lately.hasPrev) {
      var mx = Math.max(1, on, prev);
      var sub = on === prev ? 'the same as the ' + dstr(w) + ' before'
        : (on > prev ? 'up from ' : 'down from ') + num(prev) + ' in the ' + dstr(w) + ' before';
      return { kind: 'pattern', v: v, pct: pc(on, mx), sub: sub };
    }
    return { kind: 'pattern', v: v, pct: lately.rate, sub: 'that is ' + lately.rate + '% of the days you have had' };
  }

  function goal(K, shape, s, log, lately) {
    var S = (K && K.SHAPES && K.SHAPES[shape]) || {};
    var N = log.length, today = log[N - 1].date;

    if (shape === 'frequency') {
      var cad = Math.max(1, Math.round(fin(S.cadence, fin(s.cadence, 4))));
      var un = S.unit || 'sessions';
      /* under two weeks there is no weekly average worth printing, so say this week */
      if (N < 14) {
        var thisWk = (s.weeks && s.weeks[s.weeks.length - 1]) || { on: 0 };
        var wo = num(Math.max(0, fin(thisWk.on, 0)));
        return { v: wo + ' ' + unitFor(un, wo) + ' this week', pct: pc(Number(wo.replace(/,/g, '')), cad),
          sub: 'the plan is ' + cad + ' a week' };
      }
      var r4 = one(fin(s.last4Rate, 0)), wks = (s.weeks && s.weeks.length) || 1;
      return { v: r4 + ' ' + unitFor(un, r4) + ' a week', pct: pc(fin(s.last4Rate, 0) * 100, cad * 100),
        sub: 'the plan is ' + cad + ' a week, hit in ' + num(fin(s.metWeeks, 0)) + ' of ' + plur(wks, 'week') };
    }
    if (shape === 'maintenance') {
      var cur = Math.max(0, Math.min(N, fin(s.current, 0)));
      var bst = Math.max(cur, Math.max(0, fin(s.best, 0)));
      if (cur === 0) {
        return { v: 'nothing held right now', pct: 0,
          sub: bst > 0 ? 'your longest hold was ' + dstr(bst) : 'it starts the next day you show up' };
      }
      /* when the hold is not the longest one, the row below carries that number, so do not say it twice */
      return { v: dstr(cur) + ' held', pct: pc(cur, Math.max(1, bst)),
        sub: 'unbroken since ' + long_(log[N - cur].date, today) + (cur >= bst ? ', your longest yet' : '') };
    }
    /* every other shape reads the same, because the pattern does not care what
       you are chasing: what you did lately, next to what you did before it */
    return pattern(s, lately);
  }

  var STYLE = '<style>' +
    '.L04{padding:12px 20px 48px;font-family:var(--font);color:var(--text-hi);-webkit-font-smoothing:antialiased}' +
    '.L04 i{font-style:normal}' +

    /* hero */
    '.L04-big{font-size:72px;font-weight:800;line-height:.88;letter-spacing:-.05em;' +
      'font-variant-numeric:tabular-nums;color:var(--text-hi)}' +
    '.L04-lead{font-size:15.5px;font-weight:500;letter-spacing:-.012em;margin-top:11px;color:var(--text-hi)}' +
    '.L04-sub{font-size:12.5px;color:var(--text-mid);margin-top:4px;letter-spacing:-.005em;' +
      'font-variant-numeric:tabular-nums}' +

    /* the ledger card: fill and an inset highlight, never a border */
    '.L04-card{margin-top:20px;padding:16px;border-radius:14px;background:var(--fill-1);' +
      'box-shadow:var(--inset)}' +
    '.L04-gv{font-size:22px;font-weight:650;line-height:1.2;letter-spacing:-.024em;color:var(--text-hi);' +
      'font-variant-numeric:tabular-nums;overflow-wrap:anywhere}' +
    '.L04-bar{height:6px;border-radius:3px;background:rgba(var(--ink),.09);margin-top:12px;overflow:hidden}' +
    '.L04-bar i{display:block;height:100%;border-radius:3px;background:var(--accent)}' +
    '.L04-gs{font-size:12.5px;color:var(--text-mid);margin-top:9px;line-height:1.45;' +
      'font-variant-numeric:tabular-nums;overflow-wrap:anywhere}' +
    '.L04-rows{display:flex;flex-direction:column;gap:15px;margin-top:19px}' +
    '.L04-card>.L04-rows:first-child{margin-top:0}' +
    '.L04-r{display:flex;align-items:baseline;justify-content:space-between;gap:16px}' +
    '.L04-rl{min-width:0}' +
    '.L04-rl b{display:block;font-size:13.5px;font-weight:500;letter-spacing:-.008em;color:var(--text-hi);' +
      'overflow-wrap:anywhere}' +
    '.L04-rl i{display:block;font-size:12.5px;color:var(--text-mid);margin-top:3px;line-height:1.4;' +
      'font-variant-numeric:tabular-nums;overflow-wrap:anywhere}' +
    '.L04-rv{font-size:16px;font-weight:650;letter-spacing:-.022em;color:var(--text-hi);' +
      'font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;flex:0 0 auto}' +

    /* sections */
    '.L04-sec{margin-top:30px}' +
    '.L04-h{font-size:14.5px;font-weight:650;letter-spacing:-.014em;color:var(--text-hi);margin-bottom:13px}' +
    '.L04-cap{font-size:12.5px;color:var(--text-mid);line-height:1.5;margin-top:13px}' +
    /* the footnote: everything that surrounds the work, demoted to one quiet line */
    '.L04-note{font-size:12.5px;color:var(--text-mid);line-height:1.5;margin-top:26px;' +
      'font-variant-numeric:tabular-nums}' +

    /* the record */
    '.L04-rec{display:flex;gap:6px;align-items:flex-start;max-width:100%}' +
    '.L04-wd{display:grid;padding-top:19px;flex:0 0 auto}' +
    '.L04-wd span{font-size:10px;color:var(--text-mid);line-height:1;display:flex;align-items:center}' +
    '.L04-recc{min-width:0}' +
    '.L04-mx{position:relative;height:14px;margin-bottom:5px;max-width:100%}' +
    '.L04-mx i{position:absolute;top:0;font-size:10.5px;color:var(--text-mid);white-space:nowrap;line-height:1}' +
    '.L04-grid{display:grid;grid-auto-flow:column}' +
    '.L04-grid b{display:block;border-radius:var(--rad,3px);background:rgba(var(--ink),.085)}' +
    '.L04-grid b.nil{background:rgba(var(--ink),.032)}' +
    '.L04-grid b.on{background:rgba(var(--accent-rgb),.62)}' +
    '.L04-grid b.today{background:var(--accent)}' +
    '</style>';

  W.CLAY['L04'] = {
    name: 'The professional',
    note: 'Linear/Stripe discipline: one column, two alignment edges, two devices (a ledger card and the day grid), green used only as data ink and never a border. One hero number, one card that reports the pattern lately and how the run is going, one labelled record. Nothing here reads distance to a target, that is Clarity\'s job. The heatmap is a true weeks-as-columns calendar with a month axis and weekday rows, and it carries a fainter tier for days with no record so the grid never invents a miss. Every goal shape lands in the same three slots at the top of the card: one value, one bar, one line, and all three are made of the pattern (actions lately against actions before), never of a target. The support counts are a single quiet footnote, not a second dashboard.',
    render: function (ctx) {
      var K = (ctx && ctx.K) || {}, log = (ctx && ctx.log) || [], s = (ctx && ctx.s) || {},
          shape = (ctx && ctx.shape) || 'open';
      var N = log.length;
      if (!N || !log[0] || !log[0].date || !log[N - 1] || !log[N - 1].date) return '';
      var start = log[0].date, today = log[N - 1].date;

      /* lately, honestly windowed */
      var w = Math.min(30, N), on = 0, i;
      for (i = N - w; i < N; i++) if (log[i] && log[i].on) on++;
      var rate = pc(on, w);
      var hasPrev = N >= w * 2, prevOn = 0;
      if (hasPrev) { for (i = N - w * 2; i < N - w; i++) if (log[i] && log[i].on) prevOn++; }
      var prevRate = pc(prevOn, w);
      /* the window is already named by whatever this line sits under, so do not name it twice */
      var moved = hasPrev
        ? (rate === prevRate ? 'the same as before' : (rate > prevRate ? 'up from ' : 'down from ') + prevRate + '%')
        : '';
      var latelySub = moved || (num(on) + ' of ' + dstr(w));
      /* a recent-rate line only earns its place once it says something the hero does not */
      var windowed = w >= 7 && N >= w + 7;
      var lately = { w: w, rate: rate, sub: latelySub, windowed: windowed,
        on: on, prevOn: prevOn, hasPrev: hasPrev };

      /* where the best run sits in time */
      var runLen = 0, bestEnd = -1, best = 0;
      for (i = 0; i < N; i++) {
        if (log[i] && log[i].on) { runLen++; if (runLen > best) { best = runLen; bestEnd = i; } } else runLen = 0;
      }
      var cur = Math.max(0, Math.min(N, fin(s.current, 0)));

      /* ---------- hero: one number, and what it is ---------- */
      var total = Math.max(0, fin(s.total, 0));
      var noun = shape === 'frequency'
        ? (total === 1 ? 'session logged' : 'sessions logged')
        : (total === 1 ? 'day shown up' : 'days shown up');
      var since = N === 1 ? 'your first day' : 'of ' + dstr(N) + ' since ' + long_(start, today);
      var hero =
        '<div class="L04-big">' + num(total) + '</div>' +
        '<div class="L04-lead">' + noun + '</div>' +
        '<div class="L04-sub">' + since + '</div>';

      /* ---------- the card: the pattern lately, then how the run is going ---------- */
      var g = goal(K, shape, s, log, lately);
      var top = g
        ? '<div class="L04-gv">' + g.v + '</div>' +
          '<div class="L04-bar"><i style="width:' + Math.max(0, Math.min(100, fin(g.pct, 0))) + '%"></i></div>' +
          (g.sub ? '<div class="L04-gs">' + g.sub + '</div>' : '')
        : '';

      var rows = '';
      /* the recent rate, unless the bar above already is it */
      if (windowed && !(g && g.kind === 'pattern')) rows += row('Last ' + w + ' days', rate + '%', latelySub);
      /* the run, unless the bar above already is it, or the hero already said it */
      if (shape !== 'maintenance' && cur !== N) {
        rows += row('Current run', dstr(cur), cur > 0 ? 'going since ' + short(log[N - cur].date, today) : 'no run going right now');
      }
      /* the longest run only earns a line when it is not the one already above it */
      if (best > 0 && best !== cur) {
        rows += row(shape === 'maintenance' ? 'Longest hold' : 'Longest run', dstr(best), 'ended ' + short(log[bestEnd].date, today));
      }
      var card = (top || rows)
        ? '<div class="L04-card">' + top + (rows ? '<div class="L04-rows">' + rows + '</div>' : '') + '</div>'
        : '';

      /* ---------- the record ---------- */
      var capLine = N < 7
        ? 'Each square is a day. It fills in as you show up.'
        : 'Each square is a day. The filled ones are the days you showed up.' + (N >= 28 ? rhythmLine(s) : '');
      var rec = '<div class="L04-sec">' + head('The record') + record(log) +
        '<div class="L04-cap">' + capLine + '</div></div>';

      /* ---------- what surrounds the work: a footnote, never a second dashboard ---------- */
      var units = K.SUPUNIT || SUPUNIT;
      var parts = [];
      ['deepwork', 'reflection', 'checkin', 'vivere'].forEach(function (k) {
        var v = Math.max(0, Math.round(fin(s.sup && s.sup[k], 0)));
        if (v <= 0) return;
        var word = SUPPHRASE[k] ? SUPPHRASE[k][v === 1 ? 0 : 1] : unitFor(units[k] || SUPUNIT[k] || 'entries', num(v));
        parts.push(num(v) + ' ' + word);
      });
      var around = parts.length
        ? '<div class="L04-note">Around the work: ' + list(parts) + '.</div>'
        : '';

      return STYLE + '<div class="L04">' + hero + card + rec + around + '</div>';
    }
  };
})();
