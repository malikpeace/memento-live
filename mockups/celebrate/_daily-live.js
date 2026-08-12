/* THE LIVE DAILY REWARD (v3, "keep evolving"). Malik: after day 30 they stopped
   changing, make every one keep GROWING toward a big beautiful day-365 state,
   filling more of the screen as the number climbs. No blur. Motion on load/tap,
   never mid-drag. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function seeded(s) { return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
  function unitWord(n, cad) {
    if (cad === 'maint') return n === 1 ? 'day held' : 'days held';
    if (cad === 'freq') return n === 1 ? 'session' : 'sessions';
    return n === 1 ? 'move' : 'moves';
  }
  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONF = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var WDF = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function back(days) { return new Date(Date.now() - days * 86400000); }
  function pretty(d) { return MONF[d.getMonth()] + ' ' + d.getDate(); }
  function heroBlock(total, cad) {
    return '<div class="dl-n">' + total + '</div><div class="dl-u">' + unitWord(total, cad) + '</div>';
  }

  var R = {};

  /* 1. ODOMETER, the digits themselves GROW as the days climb, so at day 365
     the number nearly fills the screen and feels earned. */
  R['n-odo'] = function (dst, x) {
    var digits = String(x.total).split('');
    while (digits.length < 3) digits.unshift('0');
    var t = Math.min(x.total, 365) / 365;
    // fewer digits can afford a bigger wheel; scale by growth AND digit count
    var cap = digits.length <= 2 ? 150 : digits.length === 3 ? 128 : 96;
    var H = Math.round(lerp(86, cap, t));
    var F = Math.round(H * 0.82), Wd = Math.round(H * 0.60);
    var lead = true, w = '';
    for (var i = 0; i < digits.length; i++) {
      var d = +digits[i];
      var liveDigit = !(lead && d === 0 && i < digits.length - 1);
      if (d !== 0) lead = false;
      w += '<div class="dlo-w" style="width:' + Wd + 'px;height:' + H + 'px"><div class="dlo-r ' +
        (liveDigit ? 'dlo-r--live' : 'dlo-r--dim') + '" style="transform:translateY(' + (-(d * H)) + 'px)">' +
        '0123456789'.split('').map(function (c) { return '<span style="height:' + H + 'px;line-height:' + H + 'px;font-size:' + F + 'px">' + c + '</span>'; }).join('') +
        '<span style="height:' + H + 'px;line-height:' + H + 'px;font-size:' + F + 'px">0</span></div></div>';
    }
    var dt = back(0);
    dst.innerHTML =
      '<div class="dlo-date">' + WDF[dt.getDay()] + ', ' + MONF[dt.getMonth()] + ' ' + dt.getDate() + '</div>' +
      '<div class="dlo-drum" style="gap:' + Math.round(H * 0.05) + 'px">' + w + '</div>' +
      '<div class="dl-u" style="margin-top:' + Math.round(H * 0.2) + 'px">' + unitWord(x.total, x.cad) + '</div>';
  };

  /* 2. YESTERDAY BEHIND YOU, a whole tower of your past numbers climbing up the
     screen and beyond, shrinking as they recede. Day 45 = look back on ~45. */
  R['n-ghost'] = function (dst, x) {
    var M = Math.min(x.total, 40), col = '';
    for (var k = M - 1; k >= 1; k--) {
      var v = x.total - k;
      var size = Math.max(3.4, 40 * Math.pow(0.9, k));   // shrink faster so 30-40 fit up the tower
      var op = Math.max(.03, 0.5 * Math.pow(0.9, k));
      col += '<div class="dlg-past" style="font-size:' + size.toFixed(1) + 'px;color:rgba(235,238,248,' + op.toFixed(3) + ')">' + v + '</div>';
    }
    dst.innerHTML =
      '<div class="dlg-tower"><div class="dlg-stack">' + col + '</div>' +
      '<div class="dlg-now"><span>' + x.total + '</span><i></i></div>' +
      '<div class="dl-u" style="margin-top:10px">' + unitWord(x.total, x.cad) + '</div></div>';
  };

  /* 3. THE FIELD, a phyllotaxis that never stops filling, growing to a dense,
     beautiful bloom by day 365. Dots shrink as the seed count climbs. */
  R['a-field'] = function (dst, x) {
    var N = Math.min(x.total, 400), dots = '';
    var c = 10.0;                                  // wider spacing so early dots never overlap
    var dr = Math.max(1.6, Math.min(4.6, 46 / Math.sqrt(N + 2)));   // dots shrink as the bloom fills
    for (var i = 0; i < N; i++) {
      var rr = c * Math.sqrt(i), th = i * 2.399963;
      var cx = (rr * Math.cos(th)).toFixed(2), cy = (rr * Math.sin(th)).toFixed(2);
      var last = i === N - 1;
      dots += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (last ? dr + 1.2 : dr) + '" fill="' +
        (last ? 'var(--day)' : 'rgba(255,255,255,' + (0.30 + 0.20 * (i / N)).toFixed(2) + ')') + '"></circle>';
    }
    // a minimum frame keeps day 1-6 clean instead of zooming into an overlapping clump
    var span = Math.max(74, c * Math.sqrt(Math.max(1, N - 1)) + dr + 8);
    dst.innerHTML =
      '<svg class="dl-field" viewBox="' + (-span) + ' ' + (-span) + ' ' + (span * 2) + ' ' + (span * 2) + '" width="300" height="300" aria-hidden="true">' + dots + '</svg>' +
      heroBlock(x.total, x.cad);
  };

  /* 4. GROWTH RINGS, the disk keeps widening as the years stack, so every fine
     inner layer stays visible. Organic wobble, green outermost. */
  R['a-rings'] = function (dst, x) {
    var N = Math.min(x.total, 240), rings = '';
    // the disk keeps widening and, by the hundreds, bleeds past the top edge
    var outer = Math.min(210, 46 + Math.sqrt(x.total) * 10), step = outer / (N + 0.5);
    var rnd = seeded(7);
    // organic wobble from a couple of sine harmonics: it is periodic, so the
    // ring closes PERFECTLY at 2pi (no seam), and each ring gets its own phase
    // so the closing points never line up into a radial line.
    function ringPath(r) {
      var SEG = 44, dd = '';
      var a1 = 0.028 + rnd() * 0.03, f1 = 2 + (rnd() * 2 | 0), p1 = rnd() * 6.2832;
      var a2 = 0.018 + rnd() * 0.022, f2 = 4 + (rnd() * 3 | 0), p2 = rnd() * 6.2832;
      for (var k = 0; k <= SEG; k++) {
        var a = k / SEG * 6.2832;
        var rr = r * (1 + a1 * Math.sin(a * f1 + p1) + a2 * Math.sin(a * f2 + p2));
        dd += (k ? 'L' : 'M') + (rr * Math.cos(a)).toFixed(1) + ' ' + (rr * Math.sin(a)).toFixed(1);
      }
      return dd + 'Z';
    }
    for (var i = 1; i <= N; i++) {
      var r = i * step, last = i === N;
      var alpha = 0.10 + (i / N) * 0.18;
      rings += '<path d="' + ringPath(r) + '" fill="none" stroke="' +
        (last ? 'var(--day)' : 'rgba(235,238,248,' + alpha.toFixed(2) + ')') +
        '" stroke-width="' + (last ? 1.8 : 1) + '" stroke-linejoin="round"></path>';
    }
    var vb = outer + 8, render = Math.min(430, vb * 2);
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<svg class="dl-rings" viewBox="' + (-vb) + ' ' + (-vb) + ' ' + (vb * 2) + ' ' + (vb * 2) + '" width="' + render + '" height="' + render + '" aria-hidden="true">' +
      '<circle cx="0" cy="0" r="1.3" fill="rgba(235,238,248,.5)"></circle>' + rings + '</svg>' +
      heroBlock(x.total, x.cad) + more;
  };

  /* 5. THE CALENDAR, every day you have shown up as a cell, the field growing
     behind the number toward a whole year. No gaps drawn, each cell is earned. */
  R['t-month'] = function (dst, x) {
    var C = Math.min(x.total, 371);
    var cols = Math.max(7, Math.min(15, Math.round(Math.sqrt(C * 1.5))));
    var cellGap = C > 180 ? 4 : C > 90 ? 5 : 7;
    var cells = '';
    for (var i = 0; i < C; i++) cells += '<b class="' + (i === C - 1 ? 'dlc-t' : 'dlc-f') + '"></b>';
    // the calendar is the focal point, the number is the accent, said once,
    // sitting a little low and to the right, no backing plate.
    dst.innerHTML =
      '<div class="dl-cal" style="grid-template-columns:repeat(' + cols + ',1fr);gap:' + cellGap + 'px">' + cells +
      '<div class="dl-calnum"><b>' + x.total + '</b><i>' + unitWord(x.total, x.cad) + '</i></div></div>';
  };

  /* 6. THE STAMP, a logbook. Today pressed in, the recent record beneath. */
  R['t-stamp'] = function (dst, x) {
    var dt = back(0), rows = '', shown = Math.min(x.total, 7), gap = x.cad === 'freq' ? 2 : 1;
    for (var i = 0; i < shown; i++) { var d = back(i * gap); rows += '<div class="dls-r">' + WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + '</div>'; }
    var more = x.total > shown ? '<div class="dls-more">' + (x.total - shown) + ' more before these</div>' : '';
    dst.innerHTML =
      '<div class="dls-stamp"><div class="dls-d">' + dt.getDate() + '</div>' +
      '<div class="dls-side"><div class="dls-wd">' + WDF[dt.getDay()] + '</div><div class="dls-my">' + MONF[dt.getMonth()] + ' ' + dt.getFullYear() + '</div></div></div>' +
      '<div class="dls-rule"></div>' +
      '<div class="dls-tally"><b>' + x.total + '</b> ' + unitWord(x.total, x.cad) + ' recorded</div>' +
      '<div class="dls-rec">' + rows + more + '</div>';
  };

  /* 7. PATH OF DAYS, one tick per day, ALL of them, layered into rows that fill
     the phone. Day 303 shows 303 lines. Ticks shrink to keep the whole run in. */
  R['t-path'] = function (dst, x) {
    var N = Math.min(x.total, 365);
    var per = N <= 60 ? 20 : N <= 150 ? 30 : 40;
    var rows = Math.ceil(N / per);
    var tickH = rows <= 6 ? 16 : rows <= 10 ? 12 : 8;
    var tickW = per <= 20 ? 3 : per <= 30 ? 2.5 : 2;
    var out = '';
    for (var i = 0; i < N; i++) {
      if (i % per === 0) out += (i ? '</div>' : '') + '<div class="dlp-row">';
      out += '<i class="' + (i === N - 1 ? 'dlp-now' : '') + '" style="width:' + tickW + 'px;height:' + (i === N - 1 ? tickH + 6 : tickH) + 'px"></i>';
    }
    if (N) out += '</div>';
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-path" style="gap:' + (tickH > 12 ? 6 : 4) + 'px">' + out + '</div>' + heroBlock(x.total, x.cad) + more;
  };

  /* 8. THE STAIRCASE, a zigzag that climbs: up to the right for a run, then
     back to the left, stacking higher and higher the longer you go. */
  R['t-steps'] = function (dst, x) {
    var N = Math.min(x.total, 330), per = 30;
    var W = 250, sw = W / per;
    var H = 470;                                   // the whole climb never exceeds H
    var sh = Math.min(16, H / N);                  // capped so day 1 is a small step, not a bar
    var steps = '';
    for (var i = 0; i < N; i++) {
      var row = Math.floor(i / per), col = i % per;
      var x0 = (row % 2 === 0) ? col * sw : (per - 1 - col) * sw;   // zigzag: alternate direction each run
      var y = i * sh, last = i === N - 1;
      steps += '<i class="' + (last ? 'dlk-now' : '') + '" style="left:' + x0.toFixed(1) + 'px;bottom:' + y.toFixed(1) +
        'px;width:' + (sw + 0.6).toFixed(1) + 'px;height:' + Math.max(2.4, sh + 1).toFixed(1) + 'px"></i>';
    }
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-steps" style="width:' + W + 'px;height:' + H + 'px">' + steps + '</div>' +
      heroBlock(x.total, x.cad) + more;
  };

  /* 9. THE THREAD, one continuous line that keeps adding passes and getting
     longer the more days you hold, filling the phone by the hundreds. */
  R['o-thread'] = function (dst, x) {
    var N = Math.min(x.total, 300);
    var perRow = 20, rowsN = Math.max(1, Math.ceil(N / perRow));
    var top = 20, rowH = Math.max(12, Math.min(28, 320 / rowsN));
    var left = 20, right = 170, rad = Math.min(14, rowH / 2 - 1);
    // build the path to END exactly at day N (last row is partial), so the whole
    // line is your real days and splits cleanly into per-day marks.
    var d = 'M' + left + ' ' + top;
    for (var r = 0; r < rowsN; r++) {
      var y = top + r * rowH, ny = y + rowH;
      var daysInRow = Math.min(perRow, N - r * perRow), frac = daysInRow / perRow;
      var full = daysInRow === perRow, lastRow = r === rowsN - 1, goRight = r % 2 === 0;
      if (goRight) {
        d += ' L' + (left + frac * (right - left)).toFixed(1) + ' ' + y;
        if (!lastRow && full) d += ' A' + rad + ' ' + rad + ' 0 0 1 ' + right + ' ' + ny;
      } else {
        d += ' L' + (right - frac * (right - left)).toFixed(1) + ' ' + y;
        if (!lastRow && full) d += ' A' + rad + ' ' + rad + ' 0 0 0 ' + left + ' ' + ny;
      }
    }
    var vh = top + rowsN * rowH + 10;
    // indents: dash the whole travelled line into N per-day segments with a small
    // gap between each, so day 365 reads as one long line of 365 marks.
    var on = (1000 / N * 0.72).toFixed(2), off = (1000 / N * 0.28).toFixed(2);
    dst.innerHTML =
      '<div class="dlt-line"><b>' + x.total + '</b> total ' + unitWord(x.total, x.cad) + (x.cad === 'maint' ? '' : ' completed') + '</div>' +
      '<svg class="dl-thread" viewBox="0 8 190 ' + vh + '" width="280" height="' + Math.min(430, vh * 1.5) + '" preserveAspectRatio="xMidYMin meet" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="var(--day)" stroke-width="3" stroke-linecap="butt" pathLength="1000" ' +
      'stroke-dasharray="' + on + ' ' + off + '"></path>' +
      '<circle cx="' + left + '" cy="' + top + '" r="3.2" fill="var(--day)"></circle></svg>';
  };

  /* ---------- drive + motion ---------- */
  function renderAll(play) {
    var total = Math.max(1, +$('dlTotal').value), c = +$('dlCons').value / 100, cad = $('dlCad').value;
    $('dlTotalOut').textContent = total;
    $('dlConsOut').textContent = Math.round(c * 100) + '%';
    var x = { total: total, c: c, cad: cad };
    document.querySelectorAll('.ph[data-c]').forEach(function (ph) {
      var fn = R[ph.getAttribute('data-c')]; if (!fn) return;
      var dst = ph.querySelector('.dst');
      try { fn(dst, x); } catch (e) {}
      if (play) { ph.classList.remove('play'); void ph.offsetWidth; ph.classList.add('play'); }
    });
  }
  window.__dailyRenderAll = renderAll;
  ['dlTotal', 'dlCons', 'dlCad'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', function () { renderAll(false); }); });
  document.addEventListener('click', function (e) {
    var pre = e.target.closest('[data-preset]');
    if (pre) { var p = pre.getAttribute('data-preset').split(','); $('dlTotal').value = p[0]; $('dlCons').value = p[1]; renderAll(true); return; }
    var ph = e.target.closest('.ph[data-c]');
    if (ph) { ph.classList.remove('play'); void ph.offsetWidth; ph.classList.add('play'); }
  });
  if ($('dlTotal')) renderAll(true);
})();
