/* ============================================================
   Consistency, the merged page. Malik's synthesis, locked 2026-08-14:
   Page one: the one number religion. Actions completed, massive,
     memorable, "that number never goes down." A snap page.
   Page two: the evidence room, the professional as the base.
     Bold count up top, the pattern card, a recent strip, the
     calendar with a Week / Month / Year toggle (L03's month at the
     center), further-than-before as one small graph, the month
     bars, then a pattern-only ledger. Maximalist depth, honest.
   Desktop >= 900px: no swipe, the number is a sticky left rail and
     the evidence room lays out as a two column grid.
   No goal distance anywhere. That is Clarity's room.
   ============================================================ */
(function () {
  var K = window.CKit;
  if (!K) return;

  var DAY = 168, SHAPE = 'quantity_up', SCALE = 'month';
  var SHAPES = [['quantity_up', 'Grow a number'], ['quantity_down', 'Bring it down'], ['frequency', 'A rate'],
    ['maintenance', 'A line held'], ['milestone', 'One event'], ['open', 'No number']];
  var DAYS = [1, 7, 30, 90, 168, 365];
  var WDS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function el(id) { return document.getElementById(id); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function onIn(log, from, to) { var c = 0; for (var i = Math.max(0, from); i < Math.min(log.length, to); i++) if (log[i].on) c++; return c; }
  function cls(d) { return d.on ? 'on' : (Object.keys(d.sup).length ? 'sup' : ''); }

  /* ---------- page one ---------- */
  function pageOne(s, log) {
    var n = s.total;
    var size = n < 100 ? 148 : n < 1000 ? 124 : 100;
    var never = n > 0 && s.missed > 0 ? '<div class="one__never">That number never goes down.</div>' : '';
    var word = SHAPE === 'maintenance' ? (n === 1 ? 'day the line has held' : 'days the line has held')
      : SHAPE === 'frequency' ? (n === 1 ? 'session toward the rate you keep' : 'sessions toward the rate you keep')
      : (n === 1 ? 'action completed toward your goal' : 'actions completed toward your goal');
    return '<div>' +
      '<div class="one__say">Since you started</div>' +
      '<div class="one__num" style="font-size:' + size + 'px">' + n.toLocaleString() + '</div>' +
      '<div class="one__sub">' + word + '.</div>' + never +
      '</div>' +
      '<div class="one__hint">The whole record' +
      '<svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M1 1l6 6 6-6"/></svg></div>';
  }

  /* ---------- calendar scales ---------- */
  function weekView(log) {
    var last7 = log.slice(-7);
    var pad = 7 - last7.length;
    var cells = '', labels = [];
    for (var p = 0; p < pad; p++) cells += '<div><b class="pad"></b><span></span></div>';
    last7.forEach(function (d, i) {
      var c = cls(d) + (i === last7.length - 1 ? ' today' : '');
      cells += '<div><b class="' + c + '"></b><span>' + WDS[d.date.getDay()] + '</span></div>';
    });
    var on = onIn(log, log.length - 7, log.length);
    var prev = log.length >= 14 ? onIn(log, log.length - 14, log.length - 7) : null;
    var line = plural(on, 'day') + ' this week' +
      (prev === null ? '.' : (on > prev ? ', one more than last week.' : on < prev ? ', ' + plural(prev, 'day') + ' the week before.' : ', level with last week.'));
    if (prev !== null && on > prev + 1) line = plural(on, 'day') + ' this week, up from ' + prev + ' the week before.';
    return '<div class="wk7">' + cells + '</div><div class="wk__line">' + line + '</div>';
  }

  function yearView(log) {
    // bucket the log by real calendar month, newest 12, oldest first
    var buckets = {}, order = [];
    log.forEach(function (d) {
      var k = d.date.getFullYear() + '-' + d.date.getMonth();
      if (!buckets[k]) { buckets[k] = { y: d.date.getFullYear(), m: d.date.getMonth(), days: [] }; order.push(k); }
      buckets[k].days.push(d);
    });
    var keep = order.slice(-12);
    return '<div class="yr">' + keep.map(function (k) {
      var B = buckets[k];
      var first = new Date(B.y, B.m, 1), startDow = first.getDay(), dim = new Date(B.y, B.m + 1, 0).getDate();
      var map = {}; B.days.forEach(function (d) { map[d.date.getDate()] = d; });
      var cells = '';
      for (var i = 0; i < startDow; i++) cells += '<b class="pad"></b>';
      for (var dd = 1; dd <= dim; dd++) {
        var e = map[dd];
        cells += '<b class="' + (e ? cls(e) : 'pad') + '"></b>';
      }
      var on = B.days.filter(function (d) { return d.on; }).length;
      return '<div class="yr__m"><span>' + K.MON[B.m] + '<b>' + on + '</b></span><div class="yr__g">' + cells + '</div></div>';
    }).join('') + '</div>';
  }

  /* ---------- small graph: further than before ---------- */
  function furtherGraph(log) {
    if (log.length < 14) return '';
    var pts = [], w = 320, h = 50;
    var span = Math.min(log.length, 90);
    for (var i = log.length - span; i < log.length; i++) {
      var lo = 0, win = 0;
      for (var j = Math.max(0, i - 13); j <= i; j++) { win++; if (log[j].on) lo++; }
      pts.push([(pts.length / (span - 1)) * w, h - (lo / win) * (h - 6) - 3]);
    }
    var poly = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var now = onIn(log, log.length - 30, log.length);
    var before = log.length >= 60 ? onIn(log, log.length - 60, log.length - 30) : null;
    var line = before === null ? plural(now, 'day') + ' in the last 30.'
      : now > before ? plural(now, 'day') + ' in the last 30, up from ' + before + ' in the 30 before.'
      : now < before ? plural(now, 'day') + ' in the last 30. The 30 before held ' + before + '.'
      : plural(now, 'day') + ' in the last 30, level with the 30 before.';
    return '<div class="sec"><div class="sec__h"><b>Further than before</b><i>14 day pace</i></div>' +
      '<div class="fg"><svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline points="' + poly + '"/></svg>' +
      '<div class="fg__l">' + line + '</div></div></div>';
  }

  /* ---------- month bars ---------- */
  function monthBars(s) {
    var ms = s.months.slice(-6);
    if (ms.length < 2) return '';
    var mx = Math.max.apply(null, ms.map(function (m) { return m.on; })) || 1;
    var count = s.months.length, start = count - ms.length;
    return '<div class="sec"><div class="sec__h"><b>By month</b><i>days shown up</i></div><div class="mb">' +
      ms.map(function (m, i) {
        var hpx = Math.max(6, Math.round(52 * m.on / mx));
        return '<div><b>' + m.on + '</b><u' + (m.on === mx ? ' class="top"' : '') + ' style="height:' + hpx + 'px"></u><span>' + K.MON[(start + i) % 12] + '</span></div>';
      }).join('') + '</div></div>';
  }

  /* ---------- pattern-only ledger ---------- */
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
    var keys = Object.keys(K.SUPNAME).filter(function (k) { return (s.sup[k] || 0) > 0; });
    keys.forEach(function (k) { rows.push([K.SUPNAME[k], s.sup[k] + ' ' + K.SUPUNIT[k]]); });
    rows.push(['The record starts', K.MON[log[0].date.getMonth()] + ' ' + log[0].date.getDate()]);
    if (rows.length < 3) return '';
    return '<div class="sec"><div class="sec__h"><b>The rest of the record</b></div><div class="led">' +
      rows.map(function (r) { return '<div class="led__r"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') +
      '</div></div>';
  }

  /* ---------- page two ---------- */
  function pageTwo(s, log) {
    var N = s.N;
    // hero
    var hero = '<div class="ev__hero"><div class="ev__say">You’ve shown up</div>' +
      '<div class="ev__num">' + s.total.toLocaleString() + '</div>' +
      '<div class="ev__since">of ' + plural(N, 'day') + ' since ' + K.MON[log[0].date.getMonth()] + ' ' + log[0].date.getDate() + '</div></div>';

    // the professional's pattern card
    var w30 = Math.min(30, N), now = onIn(log, N - w30, N);
    var before = N >= 60 ? onIn(log, N - 60, N - 30) : null;
    var v, lineTxt, fill, mark = '';
    if (SHAPE === 'frequency') {
      var wkOn = onIn(log, N - Math.min(7, N), N);
      v = plural(wkOn, 'session') + ' this week';
      lineTxt = 'on a cadence of ' + s.cadence + ' a week';
      fill = Math.min(100, Math.round(100 * wkOn / s.cadence));
      mark = '<i style="left:' + Math.min(99, Math.round(100 * s.cadence / 7)) + '%"></i>';
    } else if (SHAPE === 'maintenance') {
      v = plural(s.current, 'day') + ' held';
      lineTxt = s.best > s.current ? 'the longest hold so far is ' + s.best : 'the longest hold you have ever had';
      fill = s.best ? Math.min(100, Math.round(100 * s.current / s.best)) : 100;
    } else {
      v = now + ' of the last ' + w30 + ' days';
      lineTxt = before === null ? 'that is the whole record so far'
        : now > before ? 'up from ' + before + ' in the 30 before'
        : now < before ? 'the 30 before held ' + before
        : 'level with the 30 before';
      var mx = Math.max(now, before === null ? 0 : before, 1);
      fill = Math.round(100 * now / Math.max(mx, w30));
      if (before !== null) mark = '<i style="left:' + Math.round(100 * before / Math.max(mx, 30)) + '%"></i>';
    }
    var card = '<div class="sec"><div class="sec__h"><b>The pattern</b></div><div class="card">' +
      '<div class="card__v">' + v + '</div>' +
      '<div class="card__bar"><u style="width:' + fill + '%"></u>' + mark + '</div>' +
      '<div class="card__l">' + lineTxt + '</div></div></div>';

    // recent strip
    var stripDays = Math.min(30, N);
    var strip = '<div class="sec"><div class="sec__h"><b>Right now</b><i>last ' + plural(stripDays, 'day') + '</i></div>' +
      K.calendarHTML(log.slice(-stripDays), { cols: 15 }) + '</div>';

    // calendar with scale toggle
    var body = SCALE === 'week' ? weekView(log) : SCALE === 'year' ? yearView(log) : K.monthGrid(log);
    var cal = '<div class="sec"><div class="sec__h"><b>The calendar</b>' +
      '<span class="scale" id="scale">' +
      ['week', 'month', 'year'].map(function (sc) {
        return '<button type="button" data-sc="' + sc + '"' + (sc === SCALE ? ' class="on"' : '') + '>' +
          sc.charAt(0).toUpperCase() + sc.slice(1) + '</button>';
      }).join('') + '</span></div>' + body + '</div>';

    return hero +
      '<div class="ev__grid"><div class="ev__col">' + card + strip + cal + '</div>' +
      '<div class="ev__col">' + furtherGraph(log) + monthBars(s) + ledger(s, log) + '</div></div>';
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

  /* ---------- view mode: Desktop rail+grid vs Phone (framed on wide screens) ---------- */
  var VIEW = null; // null = auto by width; 'desk' | 'phone' once toggled
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
  el('viewChips').innerHTML =
    '<button data-v="desk">Desktop</button><button data-v="phone">Phone</button>';
  el('viewChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    VIEW = b.getAttribute('data-v');
    applyView();
  });
  window.addEventListener('resize', applyView);
  applyView();
  render();
})();
