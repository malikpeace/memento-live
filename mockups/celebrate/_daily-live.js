/* THE LIVE DAILY REWARD (v2, the redo). Malik: the parametric rewrite went
   cheap, kill every blur, make each concept look crafted again, and let the
   sliders still drive them. Self-contained: styling lives in DL_CSS (no
   fragment reuse), geometry is generated with care, motion plays on load and
   on tap but never mid-drag, so dragging is instant and clean. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function seeded(s) { return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
  function unitWord(n, cad) {
    if (cad === 'maint') return n === 1 ? 'day held' : 'days held';
    if (cad === 'freq') return n === 1 ? 'session' : 'sessions';
    return n === 1 ? 'move' : 'moves';
  }
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

  /* 1. ODOMETER, digit wheels. Dim leading zeros, green significant digits. */
  R['n-odo'] = function (dst, x) {
    var digits = String(x.total).split('');
    while (digits.length < 3) digits.unshift('0');
    var lead = true, w = '';
    for (var i = 0; i < digits.length; i++) {
      var d = +digits[i];
      var liveDigit = !(lead && d === 0 && i < digits.length - 1);
      if (d !== 0) lead = false;
      w += '<div class="dlo-w"><div class="dlo-r ' + (liveDigit ? 'dlo-r--live' : 'dlo-r--dim') +
        '" style="transform:translateY(' + (-(d * 104)) + 'px)">' +
        '0123456789'.split('').map(function (c) { return '<span>' + c + '</span>'; }).join('') + '<span>0</span></div></div>';
    }
    var dt = back(0);
    dst.innerHTML =
      '<div class="dlo-date">' + WDF[dt.getDay()] + ', ' + MONF[dt.getMonth()] + ' ' + dt.getDate() + '</div>' +
      '<div class="dlo-drum">' + w + '</div>' +
      '<div class="dl-u" style="margin-top:22px">' + unitWord(x.total, x.cad) + '</div>';
  };

  /* 2. YESTERDAY BEHIND YOU, the number growing out of its own history. */
  R['n-ghost'] = function (dst, x) {
    var g = '', spec = [[16, .07], [21, .11], [27, .17], [35, .27], [46, .42]];
    for (var i = 0; i < 5; i++) {
      var v = x.total - (5 - i);
      if (v < 1) continue;
      g += '<div class="dlg-past" style="font-size:' + spec[i][0] + 'px;color:rgba(235,238,248,' + spec[i][1] + ')">' + v + '</div>';
    }
    dst.innerHTML =
      '<div class="dlg-col">' + g + '</div>' +
      '<div class="dlg-now"><span>' + x.total + '</span><i></i></div>' +
      '<div class="dl-u" style="margin-top:12px">' + unitWord(x.total, x.cad) + '</div>';
  };

  /* 3. THE FIELD, one seed per action in an organic phyllotaxis spiral. */
  R['a-field'] = function (dst, x) {
    var N = Math.min(x.total, 72), dots = '';
    var scale = 82 / (Math.sqrt(Math.max(1, N - 1)) || 1);
    for (var i = 0; i < N; i++) {
      var rr = scale * Math.sqrt(i), th = i * 2.399963;
      var cx = (rr * Math.cos(th)).toFixed(2), cy = (rr * Math.sin(th)).toFixed(2);
      var last = i === N - 1;
      dots += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (last ? 5 : 3.9) + '" fill="' +
        (last ? 'var(--day)' : 'rgba(235,238,248,.34)') + '"></circle>';
    }
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<svg class="dl-field" viewBox="-95 -95 190 190" width="200" height="200" aria-hidden="true">' + dots + '</svg>' +
      heroBlock(x.total, x.cad) + more;
  };

  /* 4. GROWTH RINGS, organic concentric rings, tree-ring language. Each ring
     is a slightly wobbled closed path so it never reads as a bullseye target. */
  R['a-rings'] = function (dst, x) {
    var N = Math.min(x.total, 46), rings = '', maxR = 110, step = maxR / (N + 0.5);
    var rnd = seeded(7);
    function ringPath(r, jitter) {
      var pts = [], SEG = 26;
      for (var k = 0; k <= SEG; k++) {
        var a = k / SEG * Math.PI * 2;
        var rr = r * (1 + (rnd() - 0.5) * jitter);
        pts.push([(rr * Math.cos(a)).toFixed(1), (rr * Math.sin(a)).toFixed(1)]);
      }
      var dd = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var k2 = 1; k2 < pts.length; k2++) dd += 'L' + pts[k2][0] + ' ' + pts[k2][1];
      return dd + 'Z';
    }
    for (var i = 1; i <= N; i++) {
      var r = i * step, last = i === N;
      var jit = 0.05 + (N - i) / N * 0.05;
      var alpha = 0.12 + (i / N) * 0.16;
      rings += '<path d="' + ringPath(r, jit) + '" fill="none" stroke="' +
        (last ? 'var(--day)' : 'rgba(235,238,248,' + alpha.toFixed(2) + ')') +
        '" stroke-width="' + (last ? 1.7 : 1.05) + '" stroke-linejoin="round"></path>';
    }
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<svg class="dl-rings" viewBox="-120 -120 240 240" width="230" height="230" aria-hidden="true">' +
      '<circle cx="0" cy="0" r="1.3" fill="rgba(235,238,248,.5)"></circle>' + rings + '</svg>' +
      heroBlock(x.total, x.cad) + more;
  };

  /* 5. ROLLING WINDOW, the last thirty days. Lit bounded by BOTH total and
     consistency, so day one never shows a full month. */
  R['t-month'] = function (dst, x) {
    var lit = Math.max(1, Math.min(x.total, 30, Math.round(30 * x.c)));
    var rnd = seeded(Math.round(x.c * 90) + x.total), cells = '';
    var idx = []; for (var i = 0; i < 29; i++) idx.push(i);
    var set = {}; for (i = 0; i < Math.min(lit - 1, 29); i++) set[idx.splice(Math.floor(rnd() * idx.length), 1)[0]] = 1;
    for (i = 0; i < 30; i++) cells += '<b class="' + (i === 29 ? 'dlw-t' : (set[i] ? 'dlw-f' : '')) + '"></b>';
    dst.innerHTML =
      '<div class="dlw-cap">the last thirty days</div>' +
      '<div class="dl-grid">' + cells + '</div>' +
      '<div class="dl-n" style="font-size:56px;margin-top:26px">' + x.total + '</div>' +
      '<div class="dl-u"><b>' + x.total + ' ' + unitWord(x.total, x.cad) + '</b> in all</div>';
  };

  /* 6. THE STAMP, a logbook. Today pressed in, the recent record beneath. */
  R['t-stamp'] = function (dst, x) {
    var dt = back(0), rows = '', shown = Math.min(x.total, 6), gap = x.cad === 'freq' ? 2 : 1;
    for (var i = 0; i < shown; i++) { var d = back(i * gap); rows += '<div class="dls-r">' + WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + '</div>'; }
    var more = x.total > shown ? '<div class="dls-more">' + (x.total - shown) + ' more before these</div>' : '';
    dst.innerHTML =
      '<div class="dls-stamp"><div class="dls-d">' + dt.getDate() + '</div>' +
      '<div class="dls-side"><div class="dls-wd">' + WDF[dt.getDay()] + '</div><div class="dls-my">' + MONF[dt.getMonth()] + ' ' + dt.getFullYear() + '</div></div></div>' +
      '<div class="dls-rule"></div>' +
      '<div class="dls-tally"><b>' + x.total + '</b> ' + unitWord(x.total, x.cad) + ' recorded</div>' +
      '<div class="dls-rec">' + rows + more + '</div>';
  };

  /* 7. PATH OF DAYS, ticks LAYERED into rows so the whole run is visible and
     grows into a block, never one flat capped line. Today the green tick. */
  R['t-path'] = function (dst, x) {
    var N = Math.min(x.total, 140), per = 20, rows = '';
    for (var i = 0; i < N; i++) {
      if (i % per === 0) rows += (i ? '</div>' : '') + '<div class="dlp-row">';
      rows += '<i class="' + (i === N - 1 ? 'dlp-now' : '') + '"></i>';
    }
    if (N) rows += '</div>';
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-path">' + rows + '</div>' + heroBlock(x.total, x.cad) + more;
  };

  /* 8. THE STAIRCASE, clean steps climbing left to right. Steps shrink as the
     count grows but stay crisp; today's step is green. */
  R['t-steps'] = function (dst, x) {
    var N = Math.min(x.total, 80), W = 240, H = 150;
    // steps stay a sensible size; they grow in COUNT, not size. A single step
    // is a small step at the foot, never a block filling the field.
    var sw = Math.min(15, W / N), sh = Math.min(11, H / N), steps = '';
    for (var i = 0; i < N; i++) {
      var last = i === N - 1;
      steps += '<i class="' + (last ? 'dlk-now' : '') + '" style="left:' + (i * sw).toFixed(2) + 'px;bottom:' + (i * sh).toFixed(2) +
        'px;width:' + (sw + 0.6).toFixed(2) + 'px;height:' + Math.max(3, sh + 0.6).toFixed(2) + 'px"></i>';
    }
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-steps" style="width:' + W + 'px;height:' + H + 'px">' + steps + '</div>' +
      heroBlock(x.total, x.cad) + more;
  };

  /* 9. THE THREAD, a single line that GROWS from a short first stroke to a long
     serpentine. Only the travelled thread is drawn, never the road ahead. */
  R['o-thread'] = function (dst, x) {
    var d = 'M20 24 L170 24 A14 14 0 0 1 170 52 L20 52 A14 14 0 0 0 20 80 L170 80 A14 14 0 0 1 170 108 L20 108 A14 14 0 0 0 20 136 L170 136 A14 14 0 0 1 170 164 L20 164';
    var full = 900, per = full / 30, drawn = Math.min(x.total * per, full);
    dst.innerHTML =
      '<div class="dlt-line">A single line, <b>' + x.total + ' ' + unitWord(x.total, x.cad) + '</b> long.</div>' +
      '<svg class="dl-thread" viewBox="0 8 190 172" width="250" height="226" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="var(--day)" stroke-width="3" stroke-linecap="round" ' +
      'stroke-dasharray="' + drawn.toFixed(0) + ' ' + (full * 2) + '"></path>' +
      '<circle cx="20" cy="24" r="3.2" fill="var(--day)"></circle></svg>' +
      '<div class="dl-more" style="color:var(--text-lo);margin-top:2px">' + pretty(back(0)) + '</div>';
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
