/* ============================================================
   Consistency, the merged page.
   Page one: the number, left aligned, plus whether today is counted.
   Page two: the evidence room. At a glance (the recent pattern and
     the last 30 days in one block), the calendar with Week / Month /
     Year and an earlier months log, a three track heat map (actions,
     deep work, reflections), weekly chapters, months, the ledger.
   No goal distance anywhere. That is Clarity's room.
   ============================================================ */
(function () {
  var K = window.CKit;
  if (!K) return;

  var DAY = 168, SHAPE = 'quantity_up', SCALE = 'month';
  var SHAPES = [['quantity_up', 'Grow a number'], ['quantity_down', 'Bring it down'], ['frequency', 'A rate'],
    ['maintenance', 'A line held'], ['milestone', 'One event'], ['open', 'No number']];
  var DAYS = [1, 7, 30, 90, 168, 365];
  var WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function el(id) { return document.getElementById(id); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function onIn(log, from, to) { var c = 0; for (var i = Math.max(0, from); i < Math.min(log.length, to); i++) if (log[i].on) c++; return c; }
  function cls(d) { return d.on ? 'on' : (Object.keys(d.sup).length ? 'sup' : ''); }
  function mkey(d) { return d.getFullYear() + '-' + d.getMonth(); }

  /* group the log into real calendar months, oldest first */
  function byMonth(log) {
    var map = {}, order = [];
    log.forEach(function (d) {
      var k = mkey(d.date);
      if (!map[k]) { map[k] = { y: d.date.getFullYear(), m: d.date.getMonth(), days: [] }; order.push(k); }
      map[k].days.push(d);
    });
    return order.map(function (k) { return map[k]; });
  }

  /* ---------- page one ---------- */
  function pageOne(s, log) {
    var n = s.total;
    var size = n < 100 ? 132 : n < 1000 ? 112 : 92;
    var word = SHAPE === 'maintenance' ? (n === 1 ? 'day the line has held' : 'days the line has held')
      : SHAPE === 'frequency' ? (n === 1 ? 'session toward the rate you keep' : 'sessions toward the rate you keep')
      : (n === 1 ? 'action completed toward your goal' : 'actions completed toward your goal');
    var today = log[log.length - 1];
    var counted = today && today.on;
    return '<div>' +
      '<div class="one__num" style="font-size:' + size + 'px">' + n.toLocaleString() + '</div>' +
      '<div class="one__sub">' + word + '.</div>' +
      '<div class="one__today' + (counted ? '' : ' off') + '"><u></u>' +
      (counted ? 'Today is counted.' : 'Today is not counted yet.') + '</div>' +
      '</div>' +
      '<div class="one__hint">Scroll' +
      '<svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 1l6 6 6-6"/></svg></div>';
  }

  /* ---------- at a glance: the recent pattern and the last 30 days, one block ---------- */
  function glance(s, log) {
    var N = s.N, w30 = Math.min(30, N);
    var now = onIn(log, N - w30, N);
    var before = N >= 60 ? onIn(log, N - 60, N - 30) : null;
    var v, fill, mark = '';
    if (SHAPE === 'frequency') {
      var wkOn = onIn(log, N - Math.min(7, N), N);
      v = plural(wkOn, 'session') + ' this week';
      fill = Math.min(100, Math.round(100 * wkOn / s.cadence));
      mark = '<i style="left:' + Math.min(99, Math.round(100 * s.cadence / 7)) + '%"></i>';
    } else if (SHAPE === 'maintenance') {
      v = plural(s.current, 'day') + ' held';
      fill = s.best ? Math.min(100, Math.round(100 * s.current / s.best)) : 100;
    } else {
      v = now + ' of the last ' + w30 + ' days';
      var mx = Math.max(now, before === null ? 0 : before, 1);
      fill = Math.round(100 * now / Math.max(mx, w30));
      if (before !== null) mark = '<i style="left:' + Math.round(100 * before / Math.max(mx, 30)) + '%"></i>';
    }
    var strip = log.slice(-30).map(function (d, i, a) {
      return '<b class="' + cls(d) + (i === a.length - 1 ? ' today' : '') + '"></b>';
    }).join('');
    var cap = 'The last ' + plural(Math.min(30, N), 'day') +
      (before !== null ? ', with the 30 before marked on the bar.' : '.');
    return '<div class="sec"><div class="sec__h"><b>At a glance</b></div>' +
      '<div class="glance"><div class="glance__v">' + v + '</div>' +
      '<div class="glance__bar"><u style="width:' + fill + '%"></u>' + mark + '</div>' +
      '<div class="glance__strip">' + strip + '</div>' +
      '<div class="glance__cap">' + cap + '</div></div></div>';
  }

  /* ---------- calendar: week ---------- */
  function weekView(log) {
    var last7 = log.slice(-7), pad = 7 - last7.length, cells = '';
    for (var p = 0; p < pad; p++) cells += '<div><b class="pad"></b><span></span></div>';
    last7.forEach(function (d, i) {
      cells += '<div><b class="' + cls(d) + (i === last7.length - 1 ? ' today' : '') + '"></b>' +
        '<span>' + WD[d.date.getDay()] + '</span></div>';
    });
    var on = onIn(log, log.length - 7, log.length);
    var prev = log.length >= 14 ? onIn(log, log.length - 14, log.length - 7) : null;
    var line = '<b>' + plural(on, 'day') + '</b> this week' +
      (prev === null ? '.' : on > prev ? ', up from <b>' + prev + '</b> last week.'
        : on < prev ? '. Last week held <b>' + prev + '</b>.' : ', level with last week.');
    return '<div class="wk7">' + cells + '</div><div class="runline">' + line + '</div>';
  }

  /* ---------- calendar: month, the robust one ---------- */
  function monthView(log, s) {
    var months = byMonth(log), cur = months[months.length - 1];
    var first = new Date(cur.y, cur.m, 1), startDow = first.getDay();
    var dim = new Date(cur.y, cur.m + 1, 0).getDate();
    var map = {}; cur.days.forEach(function (d) { map[d.date.getDate()] = d; });
    var lastDay = cur.days[cur.days.length - 1].date.getDate();

    var head = WD.map(function (w) { return '<div class="wd">' + w + '</div>'; }).join('') +
      '<div class="wd g">days</div>';

    var cells = '', rowOn = 0, rowTracked = false, out = '';
    var slot = 0;
    for (var i = 0; i < startDow; i++) { cells += '<div class="d pad"></div>'; slot++; }
    for (var dd = 1; dd <= dim; dd++) {
      var e = map[dd];
      var k = !e ? 'pad' : e.on ? 'on' : (Object.keys(e.sup).length ? 'sup' : 'miss');
      var t = (e && dd === lastDay) ? ' today' : '';
      cells += '<div class="d ' + k + t + '">' + (e ? dd : (dd <= dim ? dd : '')) + '</div>';
      if (e) { rowTracked = true; if (e.on) rowOn++; }
      slot++;
      if (slot % 7 === 0) {
        cells += '<div class="wc">' + (rowTracked ? rowOn : '') + '</div>';
        out += cells; cells = ''; rowOn = 0; rowTracked = false;
      }
    }
    if (slot % 7 !== 0) {
      while (slot % 7 !== 0) { cells += '<div class="d pad"></div>'; slot++; }
      cells += '<div class="wc">' + (rowTracked ? rowOn : '') + '</div>';
      out += cells;
    }

    var monthOn = cur.days.filter(function (d) { return d.on; }).length;
    var header = '<div class="mh"><b>' + K.MONF[cur.m] + '</b>' +
      '<i><em>' + monthOn + '</em> of ' + plural(cur.days.length, 'day') + '</i></div>';

    var hasOn = false, hasSup = false, hasOff = false;
    log.forEach(function (d) {
      if (d.on) hasOn = true; else if (Object.keys(d.sup).length) hasSup = true; else hasOff = true;
    });
    var chips = [];
    if (hasOn) chips.push('<span><u class="a"></u>showed up</span>');
    if (hasSup) chips.push('<span><u class="b"></u>something smaller</span>');
    if (hasOff) chips.push('<span><u class="c"></u>missed</span>');
    var key = chips.length >= 2 ? '<div class="key">' + chips.join('') + '</div>' : '';

    var run = '<div class="runline">Your current run is <b>' + plural(s.current, 'day') + '</b>' +
      (s.best > s.current ? '. Your longest is <b>' + plural(s.best, 'day') + '</b>.' : ', the longest you have had.') + '</div>';

    // earlier months, a real log below the current one
    var earlier = '';
    var past = months.slice(0, -1).slice(-6).reverse();
    if (past.length) {
      earlier = '<div class="sec"><div class="sec__h"><b>Earlier months</b><i>days shown up</i></div>' +
        '<div class="mlog">' + past.map(function (M) {
          var f = new Date(M.y, M.m, 1).getDay(), d2 = new Date(M.y, M.m + 1, 0).getDate();
          var mm = {}; M.days.forEach(function (d) { mm[d.date.getDate()] = d; });
          var g = '';
          for (var j = 0; j < f; j++) g += '<b class="pad"></b>';
          for (var q = 1; q <= d2; q++) { var ee = mm[q]; g += '<b class="' + (ee ? cls(ee) : 'pad') + '"></b>'; }
          var mo = M.days.filter(function (d) { return d.on; }).length;
          return '<div class="mlog__m"><span>' + K.MON[M.m] + '<b>' + mo + '</b></span>' +
            '<div class="mlog__g">' + g + '</div></div>';
        }).join('') + '</div></div>';
    }

    return header + '<div class="cal">' + head + out + '</div>' + key + run + earlier;
  }

  /* ---------- calendar: year ---------- */
  function yearView(log) {
    var months = byMonth(log).slice(-12);
    return '<div class="mlog" style="grid-template-columns:repeat(3,1fr)">' + months.map(function (M) {
      var f = new Date(M.y, M.m, 1).getDay(), dim = new Date(M.y, M.m + 1, 0).getDate();
      var mm = {}; M.days.forEach(function (d) { mm[d.date.getDate()] = d; });
      var g = '';
      for (var j = 0; j < f; j++) g += '<b class="pad"></b>';
      for (var q = 1; q <= dim; q++) { var e = mm[q]; g += '<b class="' + (e ? cls(e) : 'pad') + '"></b>'; }
      var on = M.days.filter(function (d) { return d.on; }).length;
      return '<div class="mlog__m"><span>' + K.MON[M.m] + '<b>' + on + '</b></span>' +
        '<div class="mlog__g">' + g + '</div></div>';
    }).join('') + '</div>';
  }

  /* ---------- three track heat map ---------- */
  function tracks(log) {
    var span = Math.min(log.length, 84);
    var slice = log.slice(-span);
    var defs = [
      ['Actions', function (d) { return d.on; }],
      ['Deep work', function (d) { return !!d.sup.deepwork; }],
      ['Reflections', function (d) { return !!d.sup.reflection; }]
    ];
    var rows = defs.map(function (D) {
      var n = 0;
      var cells = slice.map(function (d) {
        var hit = D[1](d); if (hit) n++;
        return '<b' + (hit ? ' style="background:rgba(63,217,78,.6)"' : '') + '></b>';
      }).join('');
      return '<div class="trk__r">' +
        '<div class="trk__h"><span class="trk__l">' + D[0] + '</span><span class="trk__n">' + n + '</span></div>' +
        '<div class="trk__c" style="grid-template-columns:repeat(' + span + ',1fr)">' + cells + '</div>' +
        '</div>';
    }).join('');
    return '<div class="sec"><div class="sec__h"><b>The record</b><i>last ' + plural(span, 'day') + '</i></div>' +
      '<div class="trk">' + rows + '</div></div>';
  }

  /* ---------- weekly chapters ---------- */
  function chapters(log) {
    // build weeks ending today, newest first
    var weeks = [], i;
    for (i = log.length; i > 0; i -= 7) weeks.push(log.slice(Math.max(0, i - 7), i));
    weeks = weeks.slice(0, 10);
    if (weeks.length < 2) return '';
    var rows = weeks.map(function (wk, idx) {
      var on = wk.filter(function (d) { return d.on; }).length;
      var pad = 7 - wk.length, g = '';
      for (var p = 0; p < pad; p++) g += '<b class="pad"></b>';
      wk.forEach(function (d) { g += '<b class="' + cls(d) + '"></b>'; });
      var label = idx === 0 ? 'This week' : idx === 1 ? 'Last week' : idx + ' wks ago';
      return '<div class="chap__r"><div class="chap__w">' + label + '</div>' +
        '<div class="chap__g">' + g + '</div>' +
        '<div class="chap__n">' + on + ' of ' + wk.length + '</div></div>';
    }).join('');
    return '<div class="sec"><div class="sec__h"><b>Week by week</b><i>newest first</i></div>' +
      '<div class="chap">' + rows + '</div></div>';
  }

  /* ---------- month bars ---------- */
  function monthBars(s) {
    var ms = s.months.slice(-6);
    if (ms.length < 2) return '';
    var mx = Math.max.apply(null, ms.map(function (m) { return m.on; })) || 1;
    var start = s.months.length - ms.length;
    return '<div class="sec"><div class="sec__h"><b>By month</b><i>days shown up</i></div><div class="mb">' +
      ms.map(function (m, i) {
        var hpx = Math.max(6, Math.round(52 * m.on / mx));
        return '<div><b>' + m.on + '</b><u' + (m.on === mx ? ' class="top"' : '') +
          ' style="height:' + hpx + 'px"></u><span>' + K.MON[(start + i) % 12] + '</span></div>';
      }).join('') + '</div></div>';
  }

  /* ---------- ledger ---------- */
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
    Object.keys(K.SUPNAME).forEach(function (k) {
      if ((s.sup[k] || 0) > 0) rows.push([K.SUPNAME[k], s.sup[k] + ' ' + K.SUPUNIT[k]]);
    });
    rows.push(['The record starts', K.MON[log[0].date.getMonth()] + ' ' + log[0].date.getDate()]);
    if (rows.length < 3) return '';
    return '<div class="sec"><div class="sec__h"><b>The rest of the record</b></div><div class="led">' +
      rows.map(function (r) { return '<div class="led__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') +
      '</div></div>';
  }

  /* ---------- page two ---------- */
  function pageTwo(s, log) {
    var hero = '<div class="ev__hero"><div class="ev__say">You’ve shown up</div>' +
      '<div class="ev__num">' + s.total.toLocaleString() + '</div>' +
      '<div class="ev__since">of ' + plural(s.N, 'day') + ' since ' +
      K.MON[log[0].date.getMonth()] + ' ' + log[0].date.getDate() + '</div></div>';

    var body = SCALE === 'week' ? weekView(log) : SCALE === 'year' ? yearView(log) : monthView(log, s);
    var cal = '<div class="sec"><div class="sec__h"><b>The calendar</b>' +
      '<span class="scale" id="scale">' +
      ['week', 'month', 'year'].map(function (sc) {
        return '<button type="button" data-sc="' + sc + '"' + (sc === SCALE ? ' class="on"' : '') + '>' +
          sc.charAt(0).toUpperCase() + sc.slice(1) + '</button>';
      }).join('') + '</span></div>' + body + '</div>';

    return hero +
      '<div class="ev__grid">' +
        '<div class="ev__col">' + glance(s, log) + cal + '</div>' +
        '<div class="ev__col">' + tracks(log) + chapters(log) + monthBars(s) + ledger(s, log) + '</div>' +
      '</div>';
  }

  /* ---------- render + wiring ---------- */
  function render() {
    var N = Math.max(1, DAY);
    var log = K.buildLog(N, SHAPE);
    var s = K.stats(log, SHAPE, 4);
    el('day').textContent = 'Day ' + N;
    el('pgOne').innerHTML = pageOne(s, log);
    el('ev').innerHTML = pageTwo(s, log);
    var sc = el('scale');
    if (sc) sc.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      SCALE = b.getAttribute('data-sc'); render();
    });
  }

  el('dayChips').innerHTML = DAYS.map(function (d) {
    return '<button data-d="' + d + '"' + (d === DAY ? ' class="on"' : '') + '>Day ' + d + '</button>';
  }).join('');
  el('shapeChips').innerHTML = SHAPES.map(function (sp) {
    return '<button data-s="' + sp[0] + '"' + (sp[0] === SHAPE ? ' class="on"' : '') + '>' + sp[1] + '</button>';
  }).join('');
  el('slider').addEventListener('input', function () {
    DAY = +this.value;
    [].forEach.call(document.querySelectorAll('#dayChips button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-d') === DAY); });
    render();
  });
  el('dayChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    DAY = +b.getAttribute('data-d'); el('slider').value = DAY;
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    render();
  });
  el('shapeChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    SHAPE = b.getAttribute('data-s');
    [].forEach.call(this.querySelectorAll('button'), function (x) { x.classList.toggle('on', x === b); });
    render();
  });

  /* view mode: Desktop rail+grid vs Phone (framed on wide screens) */
  var VIEW = null;
  function applyView() {
    var wide = window.innerWidth >= 900;
    var mode = VIEW || (wide ? 'desk' : 'phone');
    var root = document.documentElement;
    root.classList.toggle('vm-desk', mode === 'desk' && wide);
    root.classList.toggle('vm-framed', mode === 'phone' && wide);
    [].forEach.call(document.querySelectorAll('#viewChips button'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-v') === mode);
    });
  }
  el('viewChips').innerHTML = '<button data-v="desk">Desktop</button><button data-v="phone">Phone</button>';
  el('viewChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    VIEW = b.getAttribute('data-v'); applyView();
  });
  window.addEventListener('resize', applyView);
  applyView();
  render();
})();
