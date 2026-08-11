/* THE LIVE DAILY REWARD. Malik: put the sliders on ALL of them, drop "days"
   for moves/actions, kill "banked". Every concept is now generated from two
   controls, total actions and recent consistency, plus a cadence switch, and
   re-renders live as you drag. Reuses each concept's own CSS classes; only the
   markup is generated here. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function seeded(s) { return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
  function esc(t) { var d = document.createElement('i'); d.textContent = t; return d.innerHTML; }
  function unitWord(n, cad) {
    if (cad === 'maint') return n === 1 ? 'day held' : 'days held';
    if (cad === 'freq') return n === 1 ? 'session' : 'sessions';
    return n === 1 ? 'move' : 'moves';
  }
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONF = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var WDF = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  function dateBack(days) { var d = new Date(Date.now() - days * 86400000); return d; }
  /* consistency drives WARMTH: green and present when recent, cool and faint
     when away. Never a number, never a miss count. */
  function warmCss(c) {
    var a = (0.06 + c * 0.24).toFixed(2);
    return 'radial-gradient(circle, rgba(63,217,78,' + a + '), transparent 66%)';
  }

  /* ---------- the nine renderers. each returns inner HTML for .dst ---------- */
  var R = {};

  R['n-odo'] = function (dst, x) {
    var digits = String(x.total).split('');
    while (digits.length < 3) digits.unshift('0');
    var lead = true, w = '';
    for (var i = 0; i < digits.length; i++) {
      var d = +digits[i];
      var live = !(lead && d === 0 && i < digits.length - 1);
      if (d !== 0) lead = false;
      var rows = '';
      for (var s = 0; s <= 10; s++) rows += '<span>' + (s % 10) + '</span>';
      w += '<div class="od-w"><div class="od-r ' + (live ? 'od-r--live' : 'od-r--dim') +
        '" style="transform:translateY(' + (-(d * 106)) + 'px)">' + rows + '</div></div>';
    }
    var dt = dateBack(0);
    dst.innerHTML =
      '<div class="dl-warm" style="background:' + warmCss(x.c) + '"></div>' +
      '<div class="od-date">' + WDF[dt.getDay()] + ', ' + MONF[dt.getMonth()] + ' ' + dt.getDate() + '</div>' +
      '<div class="od-drum">' + w + '</div>' +
      '<div class="od-u">' + unitWord(x.total, x.cad) + '</div>';
  };

  R['n-ghost'] = function (dst, x) {
    var g = '', sizes = [[15, .07, 5], [19, .11, 6], [24, .17, 8], [31, .26, 10], [40, .42, 14]];
    for (var i = 0; i < 5; i++) {
      var v = x.total - (5 - i);
      if (v < 1) continue;
      g += '<div class="gh-past" style="font-size:' + sizes[i][0] + 'px;color:rgba(235,238,248,' + sizes[i][1] + ');margin-bottom:' + sizes[i][2] + 'px">' + v + '</div>';
    }
    dst.innerHTML =
      '<div class="dl-warm" style="background:' + warmCss(x.c) + '"></div>' +
      '<div class="gh-col">' + g + '</div>' +
      '<div class="gh-row"><span class="gh-new">' + x.total + '</span><i class="gh-dot"></i></div>' +
      '<div class="gh-cap">' + unitWord(x.total, x.cad) + '</div>';
  };

  R['a-field'] = function (dst, x) {
    var N = Math.min(x.total, 61), R0 = 88, dots = '';
    var maxR = Math.sqrt(Math.max(1, N - 1));
    var scale = (R0 - 8) / (maxR || 1);
    for (var i = 0; i < N; i++) {
      var rr = scale * Math.sqrt(i), th = i * 2.399963; // golden angle
      var cx = (rr * Math.cos(th)).toFixed(2), cy = (rr * Math.sin(th)).toFixed(2);
      var last = i === N - 1;
      dots += '<circle class="fld-dot' + (last ? ' fld-dot--now' : '') + '" cx="' + cx + '" cy="' + cy + '" r="4.4"></circle>';
    }
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-warm" style="background:' + warmCss(x.c) + '"></div>' +
      '<div class="fld-stage" style="width:180px;height:180px">' +
      '<svg class="fld-svg" width="180" height="180" viewBox="-90 -90 180 180" aria-hidden="true">' + dots + '</svg></div>' +
      '<div class="dl-n">' + x.total + '</div><div class="dl-u">' + unitWord(x.total, x.cad) + '</div>' + more;
  };

  R['a-rings'] = function (dst, x) {
    var N = Math.min(x.total, 44), rings = '', step = 118 / (N + 1);
    for (var i = 1; i <= N; i++) {
      var last = i === N;
      var rr = (i * step).toFixed(1);
      rings += '<circle cx="0" cy="0" r="' + rr + '" fill="none" stroke="' +
        (last ? 'var(--day)' : 'rgba(235,238,248,.20)') + '" stroke-width="' + (last ? 1.6 : 1.05) + '"></circle>';
    }
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-warm" style="background:' + warmCss(x.c) + '"></div>' +
      '<div class="rng-stage" style="width:250px;height:250px">' +
      '<svg class="rng-svg" width="250" height="250" viewBox="-125 -125 250 250" aria-hidden="true">' +
      '<circle cx="0" cy="0" r="1.2" fill="rgba(235,238,248,.5)"></circle>' + rings + '</svg></div>' +
      '<div class="dl-n">' + x.total + '</div><div class="dl-u">' + unitWord(x.total, x.cad) + '</div>' + more;
  };

  R['t-month'] = function (dst, x) {
    var rnd = seeded(Math.round(x.c * 90) + x.total), cells = '';
    var lit = Math.max(1, Math.min(x.total, 30, Math.round(30 * x.c)));
    var idx = []; for (var i = 0; i < 29; i++) idx.push(i);
    var set = {}; for (i = 0; i < Math.min(lit - 1, 29); i++) set[idx.splice(Math.floor(rnd() * idx.length), 1)[0]] = 1;
    for (i = 0; i < 30; i++) {
      var today = i === 29;
      cells += '<b class="tw-c' + (today ? ' tw-c--t' : (set[i] ? ' tw-c--f' : '')) + '"></b>';
    }
    dst.innerHTML =
      '<div class="tw-wrap"><div class="tw-cap">the last thirty days</div>' +
      '<div class="tw-grid">' + cells + '</div>' +
      '<div class="tw-n">' + x.total + '</div>' +
      '<div class="tw-u"><b>' + x.total + ' ' + unitWord(x.total, x.cad) + '</b> in all.</div>' +
      '<div class="tw-date">' + dl_pretty(dateBack(0)) + '</div></div>';
  };

  R['t-stamp'] = function (dst, x) {
    var dt = dateBack(0), rows = '', shown = Math.min(x.total, 6);
    for (var i = 0; i < shown; i++) { var d = dateBack(i * (x.cad === 'freq' ? 2 : 1)); rows += '<div class="ts-r">' + WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + '</div>'; }
    var more = x.total > shown ? '<div class="ts-more">' + (x.total - shown) + ' more before these</div>' : '';
    var uw = unitWord(x.total, x.cad);
    dst.innerHTML =
      '<div class="ts"><div class="ts-stamp"><div class="ts-d">' + dt.getDate() + '</div>' +
      '<div class="ts-side"><div class="ts-wd">' + WDF[dt.getDay()] + '</div><div class="ts-my">' + MONF[dt.getMonth()] + ' ' + dt.getFullYear() + '</div></div></div>' +
      '<div class="ts-rule"></div>' +
      '<div class="ts-tally"><b>' + x.total + '</b> ' + uw + ' recorded</div>' +
      '<div class="ts-rec">' + rows + more + '</div></div>' +
      '<svg class="ts-mark" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"></path></svg>';
  };

  R['t-path'] = function (dst, x) {
    var N = Math.min(x.total, 70), groups = '', per = 7;
    for (var i = 0; i < N; i++) {
      if (i % per === 0) groups += (i ? '</div>' : '') + '<div class="tp-g">';
      groups += '<i class="tp-d' + (i === N - 1 ? ' tp-d--now' : '') + '"></i>';
    }
    if (N) groups += '</div>';
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-warm" style="background:' + warmCss(x.c) + '"></div>' +
      '<div class="tp"><div class="tp-n">' + x.total + '</div>' +
      '<div class="tp-u">' + unitWord(x.total, x.cad) + ' on the path</div>' +
      '<div class="tp-band"><div class="tp-rail" style="--mw:2.5px;--mh:13px;--tw:3.5px;--th:21px;--gap:4px;--grp:10px">' + groups + '</div></div>' + more + '</div>';
  };

  R['t-steps'] = function (dst, x) {
    var N = Math.min(x.total, 120), W = 225, H = 150;
    var sw = W / N, sh = H / N, steps = '';
    for (var i = 0; i < N; i++) {
      var last = i === N - 1;
      steps += '<i class="tk-s' + (last ? ' tk-s--now' : '') + '" style="left:' + (i * sw).toFixed(2) + 'px;bottom:' + (i * sh).toFixed(2) +
        'px;width:' + (sw + 0.6).toFixed(2) + 'px;height:' + (sh + 0.6).toFixed(2) + 'px"></i>';
    }
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    var uw = x.total === 1 ? 'step' : 'steps';
    dst.innerHTML =
      '<div class="dl-warm" style="background:' + warmCss(x.c) + '"></div>' +
      '<div class="tk"><div class="tk-field" style="--tw:1.5px;--rw:1px;width:' + W + 'px;height:' + H + 'px">' + steps + '</div></div>' +
      '<div class="dl-n">' + x.total + '</div><div class="dl-u">' + uw + '</div>' + more;
  };

  R['o-thread'] = function (dst, x) {
    var full = 870, per = full / 30, drawn = Math.min(x.total * per, full);
    var d = 'M20 20 L170 20 A13 13 0 0 1 170 46 L20 46 A13 13 0 0 0 20 72 L170 72 A13 13 0 0 1 170 98 L20 98 A13 13 0 0 0 20 124 L170 124 A13 13 0 0 1 170 150 L20 150';
    var uw = unitWord(x.total, x.cad);
    dst.innerHTML =
      '<div class="dl-warm" style="background:' + warmCss(x.c) + '"></div>' +
      '<div class="otline">A single line, <b>' + x.total + ' ' + uw + '</b> long.</div>' +
      '<svg class="otsvg" viewBox="0 13 190 118" width="247" height="153" aria-hidden="true">' +
      '<path class="otold" d="' + d + '" stroke-dasharray="' + full + ' 9999"></path>' +
      '<path class="otnew" d="' + d + '" stroke-dasharray="' + drawn.toFixed(0) + ' 9999" stroke-dashoffset="0"></path>' +
      '<circle class="otnode" cx="20" cy="20" r="3"></circle></svg>' +
      '<div class="otcap">' + dl_pretty(dateBack(0)) + '</div>';
  };

  function dl_pretty(d) { return MONF[d.getMonth()] + ' ' + d.getDate(); }

  /* ---------- drive them all ---------- */
  function renderAll() {
    var total = Math.max(1, +$('dlTotal').value), c = +$('dlCons').value / 100, cad = $('dlCad').value;
    $('dlTotalOut').textContent = total;
    $('dlConsOut').textContent = Math.round(c * 100) + '%';
    var x = { total: total, c: c, cad: cad };
    document.querySelectorAll('.ph[data-c]').forEach(function (ph) {
      var key = ph.getAttribute('data-c'), fn = R[key];
      if (!fn) return;
      var dst = ph.querySelector('.dst');
      try { fn(dst, x); } catch (e) {}
    });
  }
  window.__dailyRenderAll = renderAll;
  ['dlTotal', 'dlCons', 'dlCad'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('input', renderAll); });
  // quick presets
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-preset]'); if (!b) return;
    var p = b.getAttribute('data-preset').split(',');
    $('dlTotal').value = p[0]; $('dlCons').value = p[1];
    renderAll();
  });
  if ($('dlTotal')) renderAll();
})();
