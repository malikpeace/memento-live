/* ============================================================
   Consistency, the merged page.
   Page one: the number, left aligned, and whether today is counted.
   Page two: the evidence room. At a glance, the calendar (Week as a
     readable day list, Month, Year as a full twelve months) with step
     arrows, a three track heat map, every week so far, months, ledger.

   THE CADENCE RULE. A day the goal never asked for is not a miss.
   Per real calendar week: target = the cadence (7 for daily shapes),
   shortfall = target - days kept, and only that many empty days read
   as missed. The rest are rest days. A two a week goal that hits two
   shows zero misses; a daily goal still marks every empty day. The
   week you are standing in is never marked missed, it is still open.

   No goal distance anywhere. That is Clarity's room.

   PORT CONTRACT (the logic, mockups/the-logic.html). Every generated
   action carries verb, size, and CADENCE. Cadence is how often the
   action exists at all: most are daily, a Check can be weekly. So in
   the real app, "asked" comes from the plan itself: a day counts as
   asked only if an action existed that day; rest = the plan asked
   nothing (the beekeeper's six quiet days are rest by design, never
   misses). annotate() takes the cadence for this reason; the port
   swaps the mock cadence for the plan's real per-action cadences and
   keeps every rule downstream unchanged.
   ============================================================ */
(function () {
  var K = window.CKit;
  if (!K) return;

  // real goals, so you can see how the same module reads for different people.
  // The structure is universal by design; the shape tunes cadence + wording.
  var PERSONAS = [
    { label: 'Business', shape: 'quantity_up', cadence: 7, sub: 'actions completed toward your goal' },
    { label: 'Fitness', shape: 'frequency', cadence: 4, sub: 'workouts toward the rate you keep' },
    { label: 'Screen time', shape: 'maintenance', cadence: 7, sub: 'days you stayed under your limit' },
    { label: 'School', shape: 'frequency', cadence: 5, sub: 'study sessions toward the rate you keep' },
    { label: 'Sobriety', shape: 'maintenance', cadence: 7, sub: 'days the line has held' },
    { label: 'Weight loss', shape: 'quantity_down', cadence: 7, sub: 'days you moved the number' },
    { label: 'Rough patch', shape: 'quantity_up', cadence: 7, sub: 'actions completed toward your goal', rough: true }
  ];
  var PERSONA = PERSONAS[0];
  var DAY = 168, SHAPE = PERSONA.shape, SCALE = 'month';
  var MOFF = 0, WOFF = 0, YOFF = 0, YRMODE = 'cal', TODAYDONE = true;
  var DAYS = [1, 7, 30, 90, 168, 365];
  var WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var WDM = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  function el(id) { return document.getElementById(id); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function dkey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function sameDay(a, b) { return dkey(a) === dkey(b); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function startOfWeek(d) { return addDays(d, -d.getDay()); } // Sunday aligned

  /* ---- the cadence rule: label every day kept / sup / rest / missed ---- */
  function annotate(log, shape, cadence) {
    var target = shape === 'frequency' ? Math.max(1, cadence) : 7;
    var today = log[log.length - 1].date;
    var curWeek = startOfWeek(today).getTime();
    var byWeek = {};
    log.forEach(function (d) {
      var k = startOfWeek(d.date).getTime();
      (byWeek[k] = byWeek[k] || []).push(d);
    });
    var map = {};
    Object.keys(byWeek).forEach(function (k) {
      var days = byWeek[k];
      var kept = days.filter(function (d) { return d.on; });
      var plain = days.filter(function (d) { return !d.on && !Object.keys(d.sup).length; });
      var open = +k === curWeek;
      var short = open ? 0 : Math.min(plain.length, Math.max(0, target - kept.length));
      // the shortfall lands on the most recent empty days of that week
      var missSet = {};
      plain.slice(plain.length - short).forEach(function (d) { missSet[dkey(d.date)] = 1; });
      days.forEach(function (d) {
        var st = d.on ? 'kept' : (Object.keys(d.sup).length ? 'sup' : (missSet[dkey(d.date)] ? 'missed' : 'rest'));
        map[dkey(d.date)] = { d: d, st: st };
      });
    });
    return { map: map, target: target, weekStarts: Object.keys(byWeek).map(Number).sort(function (a, b) { return a - b; }) };
  }

  function stateOf(A, date) { var e = A.map[dkey(date)]; return e ? e.st : null; }
  // the score for any set of day-objects: kept full, other half, rest ignored
  function scoreDays(A, days) {
    var kept = 0, sup = 0, missed = 0;
    days.forEach(function (x) { var st = stateOf(A, x.date); if (st === 'kept') kept++; else if (st === 'sup') sup++; else if (st === 'missed') missed++; });
    var denom = kept + sup + missed;
    return denom ? Math.round(100 * (kept + 0.5 * sup) / denom) : 100;
  }
  function entryOf(A, date) { return A.map[dkey(date)] || null; }

  /* the real Memento M, the exact logo path from the app boot mask and tab bar */
  function mMark(cls, size) {
    return '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="140 136 232 240" ' +
      'fill="currentColor" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>';
  }


  function arrows(id, canBack, canFwd, offToday) {
    return (offToday ? '<button type="button" class="nav__today" data-today>Today</button>' : '') +
      '<span class="nav" id="' + id + '">' +
      '<button type="button" data-step="-1"' + (canBack ? '' : ' disabled') + ' aria-label="Back">' +
      '<svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 1L1.5 5.5 6 10"/></svg></button>' +
      '<button type="button" data-step="1"' + (canFwd ? '' : ' disabled') + ' aria-label="Forward">' +
      '<svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 1l4.5 4.5L1 10"/></svg></button></span>';
  }

  /* ---------- page one ---------- */
  // record milestones: days shown up. A forward pull that stays in Consistency's
  // lane (about the record growing, never the goal distance).
  var MILES = [7, 14, 30, 50, 75, 100, 150, 200, 250, 365, 500, 750, 1000];
  function nextMile(t) { for (var i = 0; i < MILES.length; i++) if (MILES[i] > t) return MILES[i]; return Math.ceil((t + 1) / 500) * 500; }
  function mileLabel(m) { return m === 7 ? 'your first week' : m === 14 ? 'two weeks' : m === 30 ? 'a month' : m === 365 ? 'a year' : m.toLocaleString() + ' days'; }
  // what the page reveals as the record grows, so day one is never an empty dashboard
  var REVEAL = { support: 7, score: 14 };
  function pageOne(s, log) {
    var n = s.total;
    var size = n < 100 ? 132 : n < 1000 ? 112 : 92;
    var word = PERSONA.sub;
    if (n === 1) word = word.replace(/^actions\b/, 'action');
    var counted = log[log.length - 1].on;
    var begin = s.N === 1 ? '<div class="one__begin">Day one. This is where the count starts.</div>' : '';
    var nm = nextMile(n), gap = nm - n;
    var mile = (gap > 0) ? '<div class="one__mile"><b>' + gap.toLocaleString() + '</b> more to ' + mileLabel(nm) + '</div>' : '';
    return '<div><div class="one__crown' + (counted ? ' lit' : '') + '">' + mMark('', 22) + '</div>' +
      '<div class="one__num" style="font-size:' + size + 'px">' + n.toLocaleString() + '</div>' +
      '<div class="one__sub">' + word + '.</div>' +
      '<div class="one__today' + (counted ? '' : ' off') + '"><u></u>' +
      (counted ? 'Today is counted.' : 'Today is not counted yet.') + '</div>' +
      begin + mile + '</div>' +
      '<div class="one__hint"><svg width="16" height="9" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 1l6 6 6-6"/></svg></div>';
  }

  /* ---------- consistency score: a rolling read that can improve, plus a
     heatmap of the window whose green deepens the more consistent you are.
     Cadence honest: rest days are not counted, so score = kept / (kept + missed) ---------- */
  // the score, broken into what the last 30 days are actually made of.
  function scoreViz(A, log) {
    var slice = log.slice(-Math.min(90, log.length)), kept = 0, sup = 0, missed = 0;
    slice.forEach(function (d) { var st = stateOf(A, d.date); if (st === 'kept') kept++; else if (st === 'sup') sup++; else if (st === 'missed') missed++; });
    function seg(n, c) { return n ? '<u class="' + c + '" style="flex:' + n + '"></u>' : ''; }
    function key(n, c, w) { return n ? '<span><b class="' + c + '"></b>' + n + ' ' + w + '</span>' : ''; }
    return '<div class="score__viz viz-mix"><div class="mix__bar">' + seg(kept, 'k') + seg(sup, 's') + seg(missed, 'm') + '</div>' +
      '<div class="mix__key">' + key(kept, 'k', 'kept') + key(sup, 's', 'smaller') + key(missed, 'm', 'missed') + '</div></div>';
  }
  function scoreBlock(s, log, A) {
    var win = Math.min(90, log.length), slice = log.slice(-win);
    var kept = 0, sup = 0, missed = 0;
    slice.forEach(function (d) { var st = stateOf(A, d.date); if (st === 'kept') kept++; else if (st === 'sup') sup++; else if (st === 'missed') missed++; });
    // doing something smaller is still progress: the score punishes nothing, not imperfection
    var score = scoreDays(A, slice);
    // which way the score moved over the past week (same window, ended 7 days back).
    // shown as a small exponent: up is accent, down is muted, never red, never shame.
    var delta = null;
    if (log.length >= win + 7) delta = score - scoreDays(A, log.slice(-(win + 7), -7));
    var deltaHTML = '';
    if (delta) {
      var up = delta > 0;
      deltaHTML = '<sup class="score__delta ' + (up ? 'up' : 'down') + '">' +
        (up ? '<svg viewBox="0 0 10 10"><path d="M5 1 L9 8 L1 8 Z"/></svg>'
            : '<svg viewBox="0 0 10 10"><path d="M5 9 L1 2 L9 2 Z"/></svg>') +
        Math.abs(delta) + '</sup>';
    }
    return '<div class="sec sec--score">' +
      '<div class="glance glance--score">' +
      '<div class="score__head"><div class="score__lbl">Score</div>' +
      '<div class="score__n">' + score + deltaHTML + '</div></div>' +
      scoreViz(A, log) +
      '<div class="score__note">Remember: the goal is to be better, not perfect.</div>' +
      '</div></div>';
  }

  /* ---------- calendar: WEEK, a proper detailed view ---------- */
  function weekView(log, s, A) {
    var today = log[log.length - 1].date, start0 = log[0].date;
    var ws = addDays(startOfWeek(today), WOFF * 7);
    var canBack = ws > startOfWeek(start0), canFwd = WOFF < 0;
    var days = [], kept = 0, deep = 0, notes = 0, checks = 0;
    for (var i = 0; i < 7; i++) {
      var d = addDays(ws, i), e = entryOf(A, d);
      var st = e ? e.st : (d > today ? 'ahead' : 'before');
      if (e) {
        if (e.st === 'kept') kept++;
        if (e.d.sup.deepwork) deep++;
        if (e.d.sup.reflection) notes++;
        if (e.d.sup.checkin) checks++;
      }
      days.push({ d: d, st: st });
    }
    // seven day cells, each filled by its state so the week reads at a glance
    var strip = days.map(function (x) {
      var isToday = sameDay(x.d, today);
      var cls = (x.st === 'ahead' || x.st === 'before') ? 'out' : x.st;
      // today can't be a 'miss' yet: if it isn't done, it is pending (a hollow ring)
      if (isToday && cls !== 'kept' && cls !== 'sup') cls = 'pending';
      return '<div class="wk7c ' + cls + (isToday ? ' today' : '') + '">' +
        '<span>' + WDM[(x.d.getDay() + 6) % 7] + '</span><b>' + x.d.getDate() + '</b></div>';
    }).join('');
    // the one number that matters this week, big; rate goals show the rate
    var target = SHAPE === 'frequency' ? A.target : 7;
    var met = kept >= target;
    var heroLbl = SHAPE === 'frequency' ? (met ? 'rate kept this week' : 'toward your rate this week') : 'days kept this week';
    // supporting line: what else filled the week + the usual-week baseline
    var extra = [];
    if (deep) extra.push(deep + ' deep work session' + (deep === 1 ? '' : 's'));
    if (notes) extra.push(notes + ' reflection' + (notes === 1 ? '' : 's'));
    if (checks) extra.push(checks + ' check-in' + (checks === 1 ? '' : 's'));
    var foot = extra.length ? '<div class="wkfoot">' + extra.join('. ') + '.</div>' : '';
    var label = K.MON[ws.getMonth()] + ' ' + ws.getDate();
    return '<div class="mh"><b style="font-size:20px">Week of ' + label + '</b>' + arrows('navWeek', canBack, canFwd, WOFF !== 0) + '</div>' +
      '<div class="wk7">' + strip + '</div>' +
      '<div class="wkhero"><b class="' + (met ? 'met' : '') + '">' + kept + ' of ' + target + '</b><span>' + heroLbl + '</span></div>' +
      legend(A, log) + foot;
  }
  function legend(A, log) {
    var seen = {};
    log.forEach(function (d) { var s = stateOf(A, d.date); if (s) seen[s] = 1; });
    var chips = [];
    if (seen.kept) chips.push('<span><u class="a"></u>Action</span>');
    if (seen.sup) chips.push('<span><u class="b"></u>Other</span>');
    if (seen.missed) chips.push('<span><u class="c"></u>Missed</span>');
    if (seen.rest) chips.push('<span><u class="r"></u>Rest</span>');
    return chips.length >= 2 ? '<div class="key">' + chips.join('') + '</div>' : '';
  }
  function gridFor(A, y, m, today, big) {
    var first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate(), sd = first.getDay();
    var cells = '', rowKept = 0, tracked = false, out = '', slot = 0, monthKept = 0, monthDays = 0;
    for (var i = 0; i < sd; i++) { cells += big ? '<div class="d pad"></div>' : '<b class="pad"></b>'; slot++; }
    for (var dd = 1; dd <= dim; dd++) {
      var date = new Date(y, m, dd), e = entryOf(A, date);
      var st = e ? e.st : (date > today ? 'ahead' : 'ahead');
      if (e) { tracked = true; monthDays++; if (e.st === 'kept') { rowKept++; monthKept++; } }
      cells += big
        ? '<div class="d ' + st + (e && sameDay(date, today) ? ' today' : '') + '" data-on="' + (e && e.st === 'kept' ? '1' : '0') + '">' + dd + '</div>'
        : '<b class="' + (e ? st : 'ahead') + (sameDay(date, today) ? ' today' : '') + '"></b>';
      slot++;
      if (big && slot % 7 === 0) { cells += '<div class="wc">' + (tracked ? rowKept : '') + '</div>'; out += cells; cells = ''; rowKept = 0; tracked = false; }
    }
    if (big) {
      if (slot % 7 !== 0) {
        while (slot % 7 !== 0) { cells += '<div class="d pad"></div>'; slot++; }
        cells += '<div class="wc">' + (tracked ? rowKept : '') + '</div>';
        out += cells;
      }
      return { html: out, kept: monthKept, days: monthDays };
    }
    return { html: cells, kept: monthKept, days: monthDays };
  }
  function monthGridBig(A, y, m, today) {
    var last = new Date(y, m + 1, 0), cursor = startOfWeek(new Date(y, m, 1));
    var rows = '', monthKept = 0, monthDays = 0;
    while (cursor <= last) {
      var wk = '', weekKept = 0, anyIn = false;
      for (var i = 0; i < 7; i++) {
        var d = addDays(cursor, i), e = A.map[dkey(d)];
        if (e && e.st === 'kept') weekKept++;
        var inMonth = d.getMonth() === m && d.getFullYear() === y;
        if (!inMonth) { wk += '<div class="d pad"></div>'; continue; }
        anyIn = true;
        if (e) { monthDays++; if (e.st === 'kept') monthKept++; }
        var st = e ? e.st : 'ahead';
        var isToday = e && sameDay(d, today);
        wk += '<div class="d ' + st + (isToday ? ' today ' + (st === 'kept' ? 'done' : 'pending') : '') + '"' +
          (e ? ' data-k="' + dkey(d) + '"' : '') + '>' + d.getDate() + '</div>';
      }
      var met = SHAPE === 'frequency' && weekKept >= A.target;
      var wc = !anyIn ? '' : (SHAPE === 'frequency' ? weekKept + '/' + A.target : String(weekKept));
      rows += wk + '<div class="wc' + (met ? ' met' : '') + '">' + wc + '</div>';
      cursor = addDays(cursor, 7);
    }
    return { rows: rows, kept: monthKept, days: monthDays };
  }

  /* ---------- calendar: MONTH ---------- */
  function monthView(log, s, A) {
    var today = log[log.length - 1].date, start0 = log[0].date;
    var base = new Date(today.getFullYear(), today.getMonth() + MOFF, 1);
    var canBack = base > new Date(start0.getFullYear(), start0.getMonth(), 1), canFwd = MOFF < 0;
    var g = monthGridBig(A, base.getFullYear(), base.getMonth(), today);
    var head = WD.map(function (w) { return '<div class="wd">' + w + '</div>'; }).join('') +
      '<div class="wd g">' + (SHAPE === 'frequency' ? 'rate' : 'days') + '</div>';
    var run = '<div class="runline">Your current run is <b>' + plural(s.current, 'day') + '</b>' +
      (s.best > s.current ? '. Your longest is <b>' + plural(s.best, 'day') + '</b>.' : ', the longest you have had.') + '</div>';
    return '<div class="mh"><b>' + K.MONF[base.getMonth()] + '</b>' +
      '<span style="display:flex;align-items:center;gap:12px"><i><em>' + g.kept + '</em> of ' + plural(g.days, 'day') + '</i>' +
      arrows('navMonth', canBack, canFwd, MOFF !== 0) + '</span></div>' +
      '<div class="cal">' + head + g.rows + '</div>' + legend(A, log) + run;
  }

  /* ---------- calendar: YEAR, all twelve months ---------- */
  function yearView(log, A) {
    var today = log[log.length - 1].date, start0 = log[0].date;
    var months = [], titleTxt, canBack, canFwd, total = 0;
    if (YRMODE === 'cal') {
      var y = today.getFullYear() + YOFF;
      for (var m = 0; m < 12; m++) months.push({ y: y, m: m });
      titleTxt = String(y);
      canBack = new Date(y, 0, 1) > new Date(start0.getFullYear(), 0, 1);
      canFwd = YOFF < 0;
    } else {
      var end = new Date(today.getFullYear(), today.getMonth() + YOFF * 12, 1);
      // start at the month they began (or 12 months back if the record is older),
      // so a young record reads from the top, not from an empty year of misses.
      var sm = new Date(start0.getFullYear(), start0.getMonth(), 1);
      var sinceStart = (end.getFullYear() - sm.getFullYear()) * 12 + (end.getMonth() - sm.getMonth());
      var span = Math.min(11, Math.max(0, sinceStart));
      for (var i = span; i >= 0; i--) { var dd = new Date(end.getFullYear(), end.getMonth() - i, 1); months.push({ y: dd.getFullYear(), m: dd.getMonth() }); }
      titleTxt = K.MON[months[0].m] + ' ' + String(months[0].y).slice(2) + ' to ' + K.MON[end.getMonth()] + ' ' + String(end.getFullYear()).slice(2);
      canBack = new Date(months[0].y, months[0].m, 1) > sm;
      canFwd = YOFF < 0;
    }
    var cells = months.map(function (M) {
      var g = gridFor(A, M.y, M.m, today, false);
      total += g.kept;
      return '<div class="mlog__m"><span>' + K.MON[M.m] + '<b>' + (g.days ? g.kept : '') + '</b></span>' +
        '<div class="mlog__g">' + g.html + '</div></div>';
    }).join('');
    return '<div class="mh mh--year"><b class="yrtitle">' + titleTxt + '</b>' +
      '<span class="yrctrl">' +
      '<span class="yrsw" id="yrsw"><button type="button" data-y="cal"' + (YRMODE === 'cal' ? ' class="on"' : '') + '>Year</button>' +
      '<button type="button" data-y="roll"' + (YRMODE === 'roll' ? ' class="on"' : '') + '>Rolling</button></span>' +
      ((canBack || canFwd) ? arrows('navYear', canBack, canFwd, YOFF !== 0) : '') + '</span></div>' +
      '<div class="yrgrid">' + cells + '</div>' + legend(A, log);
  }

  /* ---------- three track heat map ---------- */
  function tracks(log) {
    var span = Math.min(log.length, 84), slice = log.slice(-span);
    var defs = [['Actions', function (d) { return d.on; }],
      ['Deep work', function (d) { return !!d.sup.deepwork; }],
      ['Reflections', function (d) { return !!d.sup.reflection; }]];
    return '<div class="sec"><div class="sec__h"><b>The record</b><i>last ' + plural(span, 'day') + '</i></div><div class="trk">' +
      defs.map(function (D) {
        var n = 0;
        var cells = slice.map(function (d) { var h = D[1](d); if (h) n++; return '<b' + (h ? ' style="background:rgba(var(--acc-rgb),.6)"' : '') + '></b>'; }).join('');
        return '<div class="trk__r"><div class="trk__h"><span class="trk__l">' + D[0] + '</span><span class="trk__n">' + n + '</span></div>' +
          '<div class="trk__c" style="grid-template-columns:repeat(' + span + ',1fr)">' + cells + '</div></div>';
      }).join('') + '</div></div>';
  }

  /* ---------- weekday rhythm, the self knowledge stat from the layouts ---------- */
  function rhythm(s) {
    if (s.N < 21) return '';
    return '<div class="sec"><div class="sec__h"><b>Your rhythm</b><i>% kept, by weekday</i></div>' +
      K.dowChart(s) + '</div>';
  }


  function monthBars(s) {
    var ms = s.months.slice(-6);
    if (ms.length < 2) return '';
    var mx = Math.max.apply(null, ms.map(function (m) { return m.on; })) || 1;
    var start = s.months.length - ms.length;
    return '<div class="sec"><div class="sec__h"><b>By month</b><i>days shown up</i></div><div class="mb">' +
      ms.map(function (m, i) {
        return '<div><b>' + m.on + '</b><u' + (m.on === mx ? ' class="top"' : '') +
          ' style="height:' + Math.max(6, Math.round(52 * m.on / mx)) + 'px"></u><span>' + K.MON[(start + i) % 12] + '</span></div>';
      }).join('') + '</div></div>';
  }

  /* the record talking back: evidence for the day you want to quit */
  // the supporting work: deep work (sessions + time), reflections, check-ins.
  // deep-work time is derived here for the mock; real durations replace it on port.
  function support(s) {
    var rows = [], dw = s.sup.deepwork || 0, rf = s.sup.reflection || 0, ci = s.sup.checkin || 0;
    if (dw > 0) rows.push(['Deep work', dw + (dw === 1 ? ' session' : ' sessions') + ' \u00b7 ' + Math.max(1, Math.round(dw * 0.8)) + 'h']);
    if (rf > 0) rows.push(['Reflections', rf + (rf === 1 ? ' entry' : ' entries')]);
    if (ci > 0) rows.push(['Check-ins', ci + (ci === 1 ? ' morning' : ' mornings')]);
    if (!rows.length) return '';
    return '<div class="sec"><div class="sec__h"><b>Also showing up</b></div><div class="led">' +
      rows.map(function (r) { return '<div class="led__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div></div>';
  }
  function hardDays(s, log) {
    var lines = [];
    // a young record has no comeback story yet; lead with the foundation truth
    if (s.N >= 14) {
      if (s.comebacks > 0) lines.push('You have come back <b>' + plural(s.comebacks, 'time') +
        '</b>. Every gap in this record ended the same way: you returned.');
      if (s.best >= 3) lines.push('Your longest run is <b>' + plural(s.best, 'day') +
        '</b>. Nobody did that for you. That capacity does not expire.');
      if (s.hours > 0) lines.push('<b>' + plural(s.hours, 'hour') + '</b> of your life are already inside this goal. ' +
        'Every day you show up, that number grows. It never shrinks.');
    }
    if (!lines.length) lines.push('The record is young. Everything you add now is the ' +
      'foundation you will stand on during a harder week.');
    return '<div class="sec"><div class="sec__h"><b>For the hard days</b></div>' +
      '<div class="hard">' + lines.map(function (t) { return '<p>' + t + '</p>'; }).join('') +
      '<p class="hard__end">Keep going until you remember why you started.</p></div></div>';
  }

  /* ---------- page two ---------- */
  function pageTwo(s, log, A) {
    var pill = '<div class="sec sec--pill"><div class="heropill">You’ve shown up <b>' +
      s.total.toLocaleString() + '</b> of ' + plural(s.N, 'day') + ' since ' +
      K.MON[log[0].date.getMonth()] + '&nbsp;' + log[0].date.getDate() + '</div></div>';
    var body = SCALE === 'week' ? weekView(log, s, A) : SCALE === 'year' ? yearView(log, A) : monthView(log, s, A);
    var cal = '<div class="sec"><div class="sec__h"><b>History</b><span class="scale" id="scale">' +
      ['week', 'month', 'year'].map(function (sc) {
        return '<button type="button" data-sc="' + sc + '"' + (sc === SCALE ? ' class="on"' : '') + '>' + sc.charAt(0).toUpperCase() + sc.slice(1) + '</button>';
      }).join('') + '</span></div>' + body + '</div>';
    // score is full width; below it a two-column layout that works with glass
    // (CSS multicol drops backdrop-filter panels, so we place columns ourselves).
    // Mobile stacks in reading order: calendar, pill, record, by month, hard days.
    var scorePart = (s.N >= REVEAL.score) ? scoreBlock(s, log, A) : '';
    var side = pill + ((s.N >= REVEAL.support) ? support(s) : '') + hardDays(s, log);
    return scorePart +
      '<div class="evwrap">' +
        '<div class="evcol evcol--main">' + cal + '</div>' +
        '<div class="evcol evcol--side">' + side + '</div>' +
      '</div>';
  }

  /* ---------- the completion moment: today just joined the record ---------- */
  function countUp(el, from, to, ms) {
    if (!el || from >= to) { if (el) el.textContent = to.toLocaleString(); return; }
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / ms);
      var v = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function playCompletion() {
    var el = document.querySelector('.one__num');
    if (el) { var to = +el.textContent.replace(/[^0-9]/g, ''); countUp(el, to - 1, to, 550); }
    // the M in the corner gains its colour: that is the moment
    var m = document.querySelector('.one__crown');
    if (m) { m.classList.remove('litpop'); void m.offsetWidth; m.classList.add('litpop'); }
    var ring = document.querySelector('.cal .d.today');
    if (ring) { ring.classList.remove('justfilled'); void ring.offsetWidth; ring.classList.add('justfilled'); }
  }

  /* ---------- tap a day: a small receipt of what you did ---------- */
  var LASTA = null;
  function closeDaypop() { var p = document.querySelector('.daypop'); if (p) p.remove(); }
  function openDaypop(cell) {
    closeDaypop();
    if (!LASTA) return;
    var e = LASTA.map[cell.getAttribute('data-k')];
    if (!e) return;
    var d = e.d.date;
    var word = e.st === 'kept' ? 'Action completed' : e.st === 'sup' ? 'Something smaller'
      : e.st === 'missed' ? 'Missed' : 'Rest, nothing was asked';
    var items = [];
    if (e.st === 'kept' && e.d.min) items.push(Math.round(e.d.min) + 'm on it');
    if (e.d.sup.deepwork) items.push('Deep work');
    if (e.d.sup.reflection) items.push('Reflection');
    if (e.d.sup.checkin) items.push('Check-in');
    if (e.d.sup.vivere) items.push('Vivere');
    var pop = document.createElement('div');
    pop.className = 'daypop';
    pop.innerHTML = '<div class="daypop__d">' + K.MONF[d.getMonth()] + ' ' + d.getDate() + '</div>' +
      '<div class="daypop__s ' + e.st + '">' + word + '</div>' +
      (items.length ? '<ul>' + items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : '');
    document.body.appendChild(pop);
    var r = cell.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    var left = Math.max(10, Math.min(window.innerWidth - pr.width - 10, r.left + r.width / 2 - pr.width / 2));
    var top = r.top - pr.height - 10;
    if (top < 60) top = r.bottom + 10;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-today]')) { MOFF = 0; WOFF = 0; YOFF = 0; render(); return; }
    var cell = e.target.closest('.cal .d[data-k]');
    if (cell) { e.stopPropagation(); openDaypop(cell); return; }
    if (!e.target.closest('.daypop')) closeDaypop();
  });
  window.addEventListener('scroll', closeDaypop, true);

  /* ---------- render + wiring ---------- */
  function render() {
    var N = Math.max(1, DAY);
    var log = K.buildLog(N, SHAPE);
    // TODAYDONE drives the last day so the completion moment is replayable
    var lastDay = log[log.length - 1];
    if (TODAYDONE) { if (!lastDay.on) { lastDay.on = true; lastDay.min = lastDay.min || 30; } }
    else { lastDay.on = false; lastDay.sup = {}; lastDay.min = 0; }
    if (PERSONA.rough) {
      // ~40% consistency, off the rate for three weeks, a two day comeback underway
      log.forEach(function (d, i) {
        var fromEnd = log.length - i;
        if (fromEnd <= 2) { d.on = true; return; }
        if (fromEnd <= 21) { d.on = false; if (i % 4 !== 0) d.sup = {}; return; }
        if (d.on && i % 5 < 3) { d.on = false; if (i % 2 === 0) d.sup = {}; }
      });
    }
    var s = K.stats(log, SHAPE, PERSONA.cadence);
    var A = annotate(log, SHAPE, PERSONA.cadence);
    LASTA = A; closeDaypop();
    el('day').textContent = 'Day ' + N;
    el('pgOne').innerHTML = pageOne(s, log);
    el('ev').innerHTML = pageTwo(s, log, A);

    var sc = el('scale');
    if (sc) sc.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      SCALE = b.getAttribute('data-sc'); MOFF = 0; WOFF = 0; YOFF = 0; render();
    });
    [['navMonth', function (v) { MOFF += v; }], ['navWeek', function (v) { WOFF += v; }], ['navYear', function (v) { YOFF += v; }]]
      .forEach(function (pair) {
        var n = el(pair[0]);
        if (n) n.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b || b.disabled) return;
          pair[1](+b.getAttribute('data-step')); render();
        });
      });
    var ys = el('yrsw');
    if (ys) ys.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      YRMODE = b.getAttribute('data-y'); YOFF = 0; render();
    });
  }

  el('dayChips').innerHTML = DAYS.map(function (d) { return '<button data-d="' + d + '"' + (d === DAY ? ' class="on"' : '') + '>Day ' + d + '</button>'; }).join('');
  el('shapeChips').innerHTML = PERSONAS.map(function (p, i) { return '<button data-p="' + i + '"' + (p === PERSONA ? ' class="on"' : '') + '>' + p.label + '</button>'; }).join('');
  el('slider').addEventListener('input', function () {
    DAY = +this.value; MOFF = 0; WOFF = 0; YOFF = 0;
    [].forEach.call(document.querySelectorAll('#dayChips button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-d') === DAY); });
    render();
  });
  el('dayChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    DAY = +b.getAttribute('data-d'); el('slider').value = DAY; MOFF = 0; WOFF = 0; YOFF = 0;
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    render();
  });
  el('shapeChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    PERSONA = PERSONAS[+b.getAttribute('data-p')]; SHAPE = PERSONA.shape; MOFF = 0; WOFF = 0; YOFF = 0;
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    render();
  });

  var VIEW = null;
  function applyView() {
    var wide = window.innerWidth >= 900;
    var mode = VIEW || (wide ? 'desk' : 'phone');
    document.documentElement.classList.toggle('vm-desk', mode === 'desk' && wide);
    document.documentElement.classList.toggle('vm-framed', mode === 'phone' && wide);
    [].forEach.call(document.querySelectorAll('#viewChips button'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === mode); });
  }
  el('todayChips').innerHTML = '<button data-t="done" class="on">Today done</button><button data-t="pending">Not yet</button>';
  el('todayChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var wasDone = TODAYDONE;
    TODAYDONE = b.getAttribute('data-t') === 'done';
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    render();
    if (TODAYDONE && !wasDone) playCompletion();
  });
  el('modeChips').innerHTML = '<button data-m="dark" class="on">Dark</button><button data-m="light">Light</button>';
  el('modeChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    document.documentElement.classList.toggle('light', b.getAttribute('data-m') === 'light');
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
  });
  var ACCENTS = [['#3fd94e', '63,217,78'], ['#3ad9f5', '58,217,245'], ['#7b97ff', '123,151,255'], ['#e87aaa', '232,122,170']];
  el('accChips').innerHTML = ACCENTS.map(function (a, i) {
    return '<button class="accdot' + (i === 0 ? ' on' : '') + '" data-a="' + i + '" style="background:' + a[0] + '" aria-label="Accent"></button>';
  }).join('');
  el('accChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var a = ACCENTS[+b.getAttribute('data-a')];
    document.documentElement.style.setProperty('--acc', a[0]);
    document.documentElement.style.setProperty('--acc-rgb', a[1]);
    document.documentElement.style.setProperty('--accent', a[0]);
    document.documentElement.style.setProperty('--accent-rgb', a[1]);
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
  });
  document.documentElement.classList.add('glassplus');
  el('viewChips').innerHTML = '<button data-v="desk">Desktop</button><button data-v="phone">Phone</button>';
  el('viewChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    VIEW = b.getAttribute('data-v'); applyView();
  });
  // the lab bar is fixed and its height changes as chips wrap, so publish it
  var barEl = document.getElementById('bar');
  function measureBar() {
    document.documentElement.style.setProperty('--barh', Math.round(barEl.getBoundingClientRect().height) + 'px');
  }
  measureBar();
  if (window.ResizeObserver) new ResizeObserver(measureBar).observe(barEl);
  window.addEventListener('resize', function () { measureBar(); applyView(); });
  applyView();
  render();
})();
