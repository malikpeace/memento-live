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
   ============================================================ */
(function () {
  var K = window.CKit;
  if (!K) return;

  var DAY = 168, SHAPE = 'quantity_up', SCALE = 'month';
  var MOFF = 0, WOFF = 0, YOFF = 0, YRMODE = 'cal';
  var SHAPES = [['quantity_up', 'Grow a number'], ['quantity_down', 'Bring it down'], ['frequency', 'A rate'],
    ['maintenance', 'A line held'], ['milestone', 'One event'], ['open', 'No number']];
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
  function entryOf(A, date) { return A.map[dkey(date)] || null; }

  /* the real Memento M, the exact logo path from the app boot mask and tab bar */
  function mMark(cls, size) {
    return '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="140 136 232 240" ' +
      'fill="currentColor" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>';
  }


  function arrows(id, canBack, canFwd) {
    return '<span class="nav" id="' + id + '">' +
      '<button type="button" data-step="-1"' + (canBack ? '' : ' disabled') + ' aria-label="Back">' +
      '<svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 1L1.5 5.5 6 10"/></svg></button>' +
      '<button type="button" data-step="1"' + (canFwd ? '' : ' disabled') + ' aria-label="Forward">' +
      '<svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 1l4.5 4.5L1 10"/></svg></button></span>';
  }

  /* ---------- page one ---------- */
  function pageOne(s, log) {
    var n = s.total;
    var size = n < 100 ? 132 : n < 1000 ? 112 : 92;
    var word = SHAPE === 'maintenance' ? (n === 1 ? 'day the line has held' : 'days the line has held')
      : SHAPE === 'frequency' ? (n === 1 ? 'session toward the rate you keep' : 'sessions toward the rate you keep')
      : (n === 1 ? 'action completed toward your goal' : 'actions completed toward your goal');
    var counted = log[log.length - 1].on;
    return '<div class="one__brand">' + mMark('m-mark', 26) + '</div>' +
      '<div><div class="one__num" style="font-size:' + size + 'px">' + n.toLocaleString() + '</div>' +
      '<div class="one__sub">' + word + '.</div>' +
      '<div class="one__today' + (counted ? '' : ' off') + '"><u></u>' +
      (counted ? 'Today is counted.' : 'Today is not counted yet.') + '</div></div>' +
      '<div class="one__hint">Scroll<svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 1l6 6 6-6"/></svg></div>';
  }

  /* ---------- consistency score: a rolling read that can improve, plus a
     heatmap of the window whose green deepens the more consistent you are.
     Cadence honest: rest days are not counted, so score = kept / (kept + missed) ---------- */
  function scoreBlock(s, log, A) {
    var win = Math.min(90, log.length), slice = log.slice(-win);
    var kept = 0, missed = 0;
    slice.forEach(function (d) { var st = stateOf(A, d.date); if (st === 'kept') kept++; else if (st === 'missed') missed++; });
    var denom = kept + missed, score = denom ? Math.round(100 * kept / denom) : 100;
    // green deepens with the score; on a white slab the kept cells carry a solid tone
    var a = (0.42 + 0.5 * (score / 100)).toFixed(2);
    var tone = 'rgba(47,178,66,' + a + ')';
    var cells = slice.map(function (d) {
      var st = stateOf(A, d.date);
      var bg = st === 'kept' ? tone : st === 'sup' ? 'rgba(47,178,66,.3)' : 'rgba(8,19,10,.08)';
      return '<b style="background:' + bg + '"></b>';
    }).join('');
    return '<div class="sec sec--score">' +
      '<div class="glance glance--score"><div class="score__m">' + mMark('', 22) + '</div>' +
      '<div class="score__lbl">Score</div>' +
      '<div class="score__n">' + score + '</div>' +
      '<div class="score__hm">' + cells + '</div></div></div>';
  }

  /* ---------- calendar: WEEK, a proper detailed view ---------- */
  function weekView(log, s, A) {
    var today = log[log.length - 1].date, start0 = log[0].date;
    var ws = addDays(startOfWeek(today), WOFF * 7);
    var canBack = ws > startOfWeek(start0), canFwd = WOFF < 0;
    var days = [], kept = 0, mins = 0, tracked = 0, deep = 0, notes = 0, checks = 0;
    for (var i = 0; i < 7; i++) {
      var d = addDays(ws, i), e = entryOf(A, d);
      var st = e ? e.st : (d > today ? 'ahead' : 'before');
      if (e) {
        tracked++;
        if (e.st === 'kept') { kept++; mins += e.d.min || 0; }
        if (e.d.sup.deepwork) deep++;
        if (e.d.sup.reflection) notes++;
        if (e.d.sup.checkin) checks++;
      }
      days.push({ d: d, e: e, st: st });
    }
    // the week at a glance: a row of seven cells, green number on the days kept
    var strip = days.map(function (x) {
      var cls = (x.st === 'ahead' || x.st === 'before') ? 'out' : x.st;
      return '<div class="wkc"><span>' + WDM[(x.d.getDay() + 6) % 7] + '</span>' +
        '<b class="' + cls + (sameDay(x.d, today) ? ' today' : '') + '">' + x.d.getDate() + '</b></div>';
    }).join('');
    // three stats: kept vs its target, hours, and how it sits against a usual week
    var target = SHAPE === 'frequency' ? A.target : 7;
    var met = SHAPE === 'frequency' ? kept >= target : null;
    var keptStat = '<div class="wkstat"><b class="' + (met ? 'met' : '') + '">' + kept + ' of ' + target + '</b><span>' +
      (SHAPE === 'frequency' ? (met ? 'rate kept' : 'sessions this week') : 'days kept') + '</span></div>';
    var hoursStat = '<div class="wkstat"><b>' + (mins ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm' : '0h') + '</b><span>on it this week</span></div>';
    var usual = s.N >= 14 ? Math.round(s.perWeek) : null;
    var cmp = usual === null ? 'the record is young' : kept > usual ? 'above your usual ' + usual : kept < usual ? 'below your usual ' + usual : 'your usual week';
    var usualStat = '<div class="wkstat"><b>' + (usual === null ? kept : (kept >= usual ? '↑' : kept === usual ? '=' : '↓')) + '</b><span>' + cmp + '</span></div>';
    // what filled the week
    var did = [];
    if (deep) did.push(deep + ' deep work');
    if (notes) did.push(notes + (notes === 1 ? ' note' : ' notes'));
    if (checks) did.push(checks + ' check in' + (checks === 1 ? '' : 's'));
    var didLine = did.length ? '<div class="wkdid">Also this week: ' + did.join(', ') + '.</div>' : '';
    var label = K.MON[ws.getMonth()] + ' ' + ws.getDate();
    return '<div class="mh"><b style="font-size:20px">Week of ' + label + '</b>' + arrows('navWeek', canBack, canFwd) + '</div>' +
      '<div class="wkstrip">' + strip + '</div>' +
      '<div class="wkstats">' + keptStat + hoursStat + usualStat + '</div>' + didLine;
  }

  /* ---------- month grid from the day map ---------- */
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
        : '<b class="' + (e ? st : 'ahead') + '"></b>';
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

  function legend(A, log) {
    var seen = {};
    log.forEach(function (d) { var s = stateOf(A, d.date); if (s) seen[s] = 1; });
    var chips = [];
    if (seen.kept) chips.push('<span><u class="a"></u>showed up</span>');
    if (seen.sup) chips.push('<span><u class="b"></u>something smaller</span>');
    if (seen.missed) chips.push('<span><u class="c"></u>missed</span>');
    if (seen.rest) chips.push('<span><u class="r"></u>rest, the goal did not ask</span>');
    return chips.length >= 2 ? '<div class="key">' + chips.join('') + '</div>' : '';
  }

  /* the month grid: kept days are a green number (no fills, no lines). Per week
     the count column shows kept, and for a rate goal it reads kept/target and
     turns green when the week hit the rate, a success you can spot at a glance. */
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
        wk += '<div class="d ' + st + (e && sameDay(d, today) ? ' today' : '') + '">' + d.getDate() + '</div>';
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
      arrows('navMonth', canBack, canFwd) + '</span></div>' +
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
      for (var i = 11; i >= 0; i--) months.push({ y: new Date(end.getFullYear(), end.getMonth() - i, 1).getFullYear(), m: new Date(end.getFullYear(), end.getMonth() - i, 1).getMonth() });
      titleTxt = K.MON[months[0].m] + ' ' + String(months[0].y).slice(2) + ' to ' + K.MON[end.getMonth()] + ' ' + String(end.getFullYear()).slice(2);
      canBack = new Date(months[0].y, months[0].m, 1) > new Date(start0.getFullYear(), start0.getMonth(), 1);
      canFwd = YOFF < 0;
    }
    var cells = months.map(function (M) {
      var g = gridFor(A, M.y, M.m, today, false);
      total += g.kept;
      return '<div class="mlog__m"><span>' + K.MON[M.m] + '<b>' + (g.days ? g.kept : '') + '</b></span>' +
        '<div class="mlog__g">' + g.html + '</div></div>';
    }).join('');
    return '<div class="mh"><b style="font-size:22px">' + titleTxt + '</b>' +
      '<span style="display:flex;align-items:center;gap:10px"><i><em>' + total + '</em> days</i>' +
      '<span class="yrsw" id="yrsw"><button type="button" data-y="cal"' + (YRMODE === 'cal' ? ' class="on"' : '') + '>Year</button>' +
      '<button type="button" data-y="roll"' + (YRMODE === 'roll' ? ' class="on"' : '') + '>Rolling</button></span>' +
      arrows('navYear', canBack, canFwd) + '</span></div>' +
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
        var cells = slice.map(function (d) { var h = D[1](d); if (h) n++; return '<b' + (h ? ' style="background:rgba(63,217,78,.6)"' : '') + '></b>'; }).join('');
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

  function ledger(s, log) {
    var rows = [];
    if (s.hours > 0) rows.push(['Hours on it', s.hours + 'h']);
    if (s.avgSession > 0 && s.total >= 7) rows.push(['An average day you showed up', s.avgSession + 'm']);
    if (s.comebacks > 0) rows.push(['Times you came back', s.comebacks]);
    if (s.months.length >= 2) {
      var bi = 0; s.months.forEach(function (m, i) { if (m.on > s.months[bi].on) bi = i; });
      rows.push(['Best month', K.MON[bi % 12] + ', ' + plural(s.months[bi].on, 'day')]);
    }
    if (SHAPE === 'frequency' && s.weeks >= 3) rows.push(['Weeks you hit the rate', s.metWeeks + ' of ' + s.weeks]);
    Object.keys(K.SUPNAME).forEach(function (k) { if ((s.sup[k] || 0) > 0) rows.push([K.SUPNAME[k], s.sup[k] + ' ' + K.SUPUNIT[k]]); });
    rows.push(['The record starts', K.MON[log[0].date.getMonth()] + ' ' + log[0].date.getDate()]);
    if (rows.length < 3) return '';
    return '<div class="sec"><div class="sec__h"><b>The rest of the record</b></div><div class="led">' +
      rows.map(function (r) { return '<div class="led__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div></div>';
  }

  /* ---------- page two ---------- */
  function pageTwo(s, log, A) {
    var hero = '<div class="ev__hero"><div class="ev__say">You’ve shown up</div>' +
      '<div class="ev__num">' + s.total.toLocaleString() + '</div>' +
      '<div class="ev__since">of ' + plural(s.N, 'day') + ' since ' + K.MON[log[0].date.getMonth()] + ' ' + log[0].date.getDate() + '</div></div>';
    var body = SCALE === 'week' ? weekView(log, s, A) : SCALE === 'year' ? yearView(log, A) : monthView(log, s, A);
    var cal = '<div class="sec"><div class="sec__h"><b>The calendar</b><span class="scale" id="scale">' +
      ['week', 'month', 'year'].map(function (sc) {
        return '<button type="button" data-sc="' + sc + '"' + (sc === SCALE ? ' class="on"' : '') + '>' + sc.charAt(0).toUpperCase() + sc.slice(1) + '</button>';
      }).join('') + '</span></div>' + body + '</div>';
    return hero + '<div class="ev__grid"><div class="ev__col">' + scoreBlock(s, log, A) + cal + '</div>' +
      '<div class="ev__col">' + tracks(log) + rhythm(s) + monthBars(s) + ledger(s, log) + '</div></div>';
  }

  /* ---------- render + wiring ---------- */
  function render() {
    var N = Math.max(1, DAY);
    var log = K.buildLog(N, SHAPE);
    var s = K.stats(log, SHAPE, 4);
    var A = annotate(log, SHAPE, s.cadence || 4);
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
  el('shapeChips').innerHTML = SHAPES.map(function (sp) { return '<button data-s="' + sp[0] + '"' + (sp[0] === SHAPE ? ' class="on"' : '') + '>' + sp[1] + '</button>'; }).join('');
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
    SHAPE = b.getAttribute('data-s'); MOFF = 0; WOFF = 0; YOFF = 0;
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
  el('fxChips').innerHTML = '<button data-fx="flat" class="on">Flat</button><button data-fx="glass">Glass</button>';
  el('fxChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    document.documentElement.classList.toggle('glass', b.getAttribute('data-fx') === 'glass');
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
  });
  el('viewChips').innerHTML = '<button data-v="desk">Desktop</button><button data-v="phone">Phone</button>';
  el('viewChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    VIEW = b.getAttribute('data-v'); applyView();
  });
  window.addEventListener('resize', applyView);
  applyView();
  render();
})();
