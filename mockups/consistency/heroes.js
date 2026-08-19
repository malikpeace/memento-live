/* ============================================================
   Consistency hero lab — 17 candidate replacements for the bloom.
   One global slider scrubs day 0..365; the same seeded history
   grows as you drag, so scrubbing IS the growth. Kept from the
   first round: the aurora and the constellation. Fifteen new,
   spanning generative visuals, pure analytics, and the M mark.

   Question each answers: what shows growth + consistency over
   time, simply, and looks intentional from day one?

   Self-contained. Does not touch window.CVAR / the 12 layouts.
   ============================================================ */
(function () {
  var G = [63, 217, 78];
  function g(a) { return 'rgba(' + G[0] + ',' + G[1] + ',' + G[2] + ',' + a + ')'; }
  function ink(a) { return 'rgba(255,255,255,' + a + ')'; }
  var FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ONE master history of 365 days. record(N) = the first N of it, so the
     slider grows a single coherent record. Consistency improves over time
     (a spotty start that firms up) with two real gaps and a comeback. */
  var MASTER = (function () {
    var r = rng(4242), a = [];
    for (var i = 0; i < 366; i++) {
      var p = 0.58 + 0.34 * (i / 365);
      var on = r() < p;
      if (i >= 44 && i <= 46) on = false;
      if (i >= 130 && i <= 133) on = false;
      a.push(on);
    }
    return a;
  })();
  function record(N) {
    N = Math.max(0, Math.min(365, Math.round(N)));
    var act = MASTER.slice(0, N), total = 0;
    for (var i = 0; i < N; i++) if (act[i]) total++;
    var win = Math.min(30, N), lo = 0;
    for (var j = N - win; j < N; j++) if (act[j]) lo++;
    var streak = 0; for (var k = N - 1; k >= 0; k--) { if (act[k]) streak++; else break; }
    var longest = 0, run = 0; for (var m = 0; m < N; m++) { if (act[m]) { run++; if (run > longest) longest = run; } else run = 0; }
    return { N: N, act: act, total: total, rate: win ? lo / win : 0, streak: streak, longest: longest,
             maturity: Math.max(0, Math.min(1, Math.sqrt(total) / Math.sqrt(310))) };
  }

  function setup(c) {
    var dpr = window.devicePixelRatio || 1;
    var w = c.clientWidth || 300, h = c.clientHeight || 240;
    c.width = w * dpr; c.height = h * dpr;
    var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    x.textBaseline = 'alphabetic'; return [x, w, h];
  }
  var T = Math.PI * 2;
  function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
  // the bare notched M as a polyline through 5 points
  function mPoints(cx, cy, w, h) {
    var x0 = cx - w / 2, x1 = cx + w / 2, yt = cy - h / 2, yb = cy + h / 2, notch = cy + h * 0.12;
    return [[x0, yb], [x0, yt], [cx, notch], [x1, yt], [x1, yb]];
  }
  function strokeM(x, pts, lw, style) { x.lineJoin = 'miter'; x.lineCap = 'butt'; x.lineWidth = lw; x.strokeStyle = style; x.beginPath(); pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.stroke(); }

  /* ============ KEPT: 3. aurora, 5. constellation ============ */
  function aurora(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var bands = 1 + Math.floor(d.maturity * 5);
    x.globalCompositeOperation = 'lighter';
    for (var b = 0; b < bands; b++) {
      var yb = h * (0.32 + b * 0.11) + Math.sin(b) * 8, amp = 26 - b * 2, alpha = 0.16 + 0.12 * (1 - b / bands);
      var grd = x.createLinearGradient(0, yb - 60, 0, yb + 40);
      grd.addColorStop(0, g(0)); grd.addColorStop(0.55, g(alpha)); grd.addColorStop(1, g(0));
      x.fillStyle = grd; x.beginPath(); x.moveTo(0, yb + 40);
      for (var px = 0; px <= w; px += 8) x.lineTo(px, yb + Math.sin(px / 60 + b * 1.3) * amp + Math.sin(px / 22 + b) * 6);
      x.lineTo(w, yb + 40); x.closePath(); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    var r = rng(3); for (var i = 0; i < 40; i++) { x.fillStyle = ink(0.05 + r() * 0.12); x.beginPath(); x.arc(r() * w, r() * h * 0.5, r() * 0.9, 0, T); x.fill(); }
  }
  function constellation(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var n = Math.min(d.total, 140), pts = [], r = rng(9), spread = Math.min(w, h) * 0.44 / Math.sqrt(n + 6);
    for (var i = 0; i < n; i++) { var ang = i * 2.399963, rr = spread * Math.sqrt(i); pts.push([cx + rr * Math.cos(ang) + (r() - 0.5) * 10, cy + rr * Math.sin(ang) + (r() - 0.5) * 10]); }
    x.strokeStyle = g(0.22); x.lineWidth = 1;
    for (var a = 0; a < pts.length; a++) { var best = -1, bd = 1e9; for (var b = 0; b < a; b++) { var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = b; } } if (best >= 0 && bd < 8100) { x.beginPath(); x.moveTo(pts[a][0], pts[a][1]); x.lineTo(pts[best][0], pts[best][1]); x.stroke(); } }
    for (var p = 0; p < pts.length; p++) { var last = p === pts.length - 1; if (last) { var hg = x.createRadialGradient(pts[p][0], pts[p][1], 0, pts[p][0], pts[p][1], 14); hg.addColorStop(0, g(0.8)); hg.addColorStop(1, g(0)); x.fillStyle = hg; x.beginPath(); x.arc(pts[p][0], pts[p][1], 14, 0, T); x.fill(); } x.fillStyle = last ? '#eafff0' : g(0.5 + 0.4 * (p / pts.length)); x.beginPath(); x.arc(pts[p][0], pts[p][1], last ? 3.4 : 2, 0, T); x.fill(); }
    if (n === 0) { x.fillStyle = ink(0.3); x.font = '13px ' + FONT; x.textAlign = 'center'; x.fillText('day 0', cx, cy); }
  }

  /* ============ NEW ============ */

  /* 1. THE M FILLS — a battery of the mark; green rises with the record */
  function mFill(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var pts = mPoints(cx, cy, Math.min(w * 0.5, 150), Math.min(h * 0.62, 150)), lw = 20;
    strokeM(x, pts, lw, ink(0.08));
    var top = cy - Math.min(h * 0.62, 150) / 2, bot = cy + Math.min(h * 0.62, 150) / 2;
    var level = bot - (bot - top) * (0.05 + 0.95 * d.maturity);
    x.save(); x.beginPath(); x.rect(0, level, w, h); x.clip();
    var grd = x.createLinearGradient(0, level, 0, bot); grd.addColorStop(0, g(0.95)); grd.addColorStop(1, g(0.55));
    strokeM(x, pts, lw, '#3fd94e'); x.strokeStyle = grd; strokeM(x, pts, lw, grd); x.restore();
    var pct = Math.round(d.maturity * 100);
    x.fillStyle = ink(0.85); x.font = '600 13px ' + FONT; x.textAlign = 'center';
    x.fillText(d.total + ' days', cx, bot + 26);
  }

  /* 2. THE M LIGHTS — nodes along the mark switch on, one per day */
  function mLights(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var pts = mPoints(cx, cy, Math.min(w * 0.5, 150), Math.min(h * 0.6, 150));
    strokeM(x, pts, 3, ink(0.06));
    // walk the polyline, place ~72 nodes, light the first `total/365*72`
    var segs = [], totLen = 0;
    for (var i = 1; i < pts.length; i++) { var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], L = Math.hypot(dx, dy); segs.push([pts[i - 1], pts[i], L]); totLen += L; }
    var NODES = 72, litN = d.total > 0 ? Math.max(1, Math.round(NODES * (d.total / 365))) : 0;
    var acc = 0, placed = 0;
    for (var k = 0; k < NODES; k++) {
      var target = (k / (NODES - 1)) * totLen, run = 0, si = 0;
      while (si < segs.length && run + segs[si][2] < target) { run += segs[si][2]; si++; }
      if (si >= segs.length) si = segs.length - 1;
      var f = segs[si][2] ? (target - run) / segs[si][2] : 0;
      var nx = segs[si][0][0] + (segs[si][1][0] - segs[si][0][0]) * f, ny = segs[si][0][1] + (segs[si][1][1] - segs[si][0][1]) * f;
      var lit = k < litN;
      if (lit) { var hg = x.createRadialGradient(nx, ny, 0, nx, ny, 8); hg.addColorStop(0, g(0.7)); hg.addColorStop(1, g(0)); x.fillStyle = hg; x.beginPath(); x.arc(nx, ny, 8, 0, T); x.fill(); }
      x.fillStyle = lit ? '#daffe6' : ink(0.1); x.beginPath(); x.arc(nx, ny, lit ? 2.6 : 1.8, 0, T); x.fill();
    }
  }

  /* 3. THE TREE — a sprout that branches into a canopy */
  function tree(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var maxDepth = 2 + Math.round(d.maturity * 7), r = rng(11);
    x.lineCap = 'round';
    (function branch(px, py, ang, len, depth) {
      if (depth > maxDepth || len < 4) { if (d.total > 0) { x.fillStyle = g(0.5 + 0.4 * r()); x.beginPath(); x.arc(px, py, 2.2, 0, T); x.fill(); } return; }
      var ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
      x.strokeStyle = g(0.3 + 0.5 * (1 - depth / maxDepth)); x.lineWidth = Math.max(1, (maxDepth - depth) * 0.9);
      x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
      var spread = 0.42 + r() * 0.2;
      branch(ex, ey, ang - spread, len * 0.74, depth + 1);
      branch(ex, ey, ang + spread, len * 0.74, depth + 1);
      if (r() < 0.4) branch(ex, ey, ang + (r() - 0.5) * 0.3, len * 0.7, depth + 1);
    })(w / 2, h - 24, -Math.PI / 2, Math.min(h * 0.2, 44), 0);
  }

  /* 4. THE MOUNTAINS — elevation only climbs on days you show up */
  function mountains(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var sky = x.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, 'rgba(9,26,16,1)'); sky.addColorStop(1, 'rgba(3,8,5,1)');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    if (d.N === 0) return;
    var base = h - 20, elev = 2, pts = [[0, base]]; // a small starting foothill so day 1 is not black
    for (var i = 0; i < d.N; i++) { elev += d.act[i] ? 1 : -0.4; if (elev < 1) elev = 1; var px = (i / 365) * w, py = base - elev * (Math.min(h * 0.62, 150) / 60); pts.push([px, Math.max(24, py)]); }
    var last = pts[pts.length - 1];
    var grd = x.createLinearGradient(0, 24, 0, base); grd.addColorStop(0, g(0.4)); grd.addColorStop(1, 'rgba(16,80,40,0.9)');
    x.fillStyle = grd; x.beginPath(); x.moveTo(0, base); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(last[0], base); x.closePath(); x.fill();
    x.strokeStyle = g(0.7); x.lineWidth = 1.5; x.beginPath(); pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.stroke();
    var hg = x.createRadialGradient(last[0], last[1], 0, last[0], last[1], 12); hg.addColorStop(0, g(0.9)); hg.addColorStop(1, g(0)); x.fillStyle = hg; x.beginPath(); x.arc(last[0], last[1], 12, 0, T); x.fill();
  }

  /* 5. THE SPIRAL — a record of days winding outward from today's core */
  function spiral(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var maxR = Math.min(w, h) * 0.44, turns = 5;
    for (var i = 0; i < d.N; i++) {
      var t = i / 365, ang = t * turns * T, rr = maxR * Math.sqrt(t);
      var px = cx + rr * Math.cos(ang), py = cy + rr * Math.sin(ang);
      if (d.act[i]) { x.fillStyle = g(0.35 + 0.55 * t); x.beginPath(); x.arc(px, py, 1.6 + 1.2 * t, 0, T); x.fill(); }
      else { x.strokeStyle = ink(0.08); x.lineWidth = 1; x.beginPath(); x.arc(px, py, 1.4, 0, T); x.stroke(); }
    }
    var cg = x.createRadialGradient(cx, cy, 0, cx, cy, 12); cg.addColorStop(0, g(0.9)); cg.addColorStop(1, g(0)); x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, 12, 0, T); x.fill();
    x.fillStyle = '#daffe6'; x.beginPath(); x.arc(cx, cy, 3, 0, T); x.fill();
  }

  /* 6. THE SKYLINE — one tower per week, height = that week's consistency */
  function skyline(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], base = h - 22;
    var weeks = Math.ceil(d.N / 7), bw = Math.max(4, Math.min(20, (w - 30) / Math.max(1, weeks) - 3));
    var x0 = 15;
    for (var wk = 0; wk < weeks; wk++) {
      var on = 0, dd = 0; for (var i = wk * 7; i < Math.min(d.N, wk * 7 + 7); i++) { dd++; if (d.act[i]) on++; }
      var rate = dd ? on / dd : 0, bh = 12 + rate * (Math.min(h * 0.7, 180));
      var bx = x0 + wk * (bw + 3);
      if (bx > w - bw) break;
      var grd = x.createLinearGradient(0, base - bh, 0, base); grd.addColorStop(0, g(0.75)); grd.addColorStop(1, g(0.32));
      x.fillStyle = grd; roundRect(x, bx, base - bh, bw, bh, 2); x.fill();
      for (var wy = base - bh + 5; wy < base - 3; wy += 6) { x.fillStyle = ink(0.12); x.fillRect(bx + 2, wy, bw - 4, 1.6); }
    }
    x.strokeStyle = ink(0.1); x.lineWidth = 1; x.beginPath(); x.moveTo(0, base); x.lineTo(w, base); x.stroke();
  }

  /* 7. THE TERRAIN — the whole record as one profile: rolling consistency */
  function terrain(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], base = h - 16;
    x.fillStyle = 'rgba(255,255,255,0.02)'; x.fillRect(0, 0, w, h);
    if (d.N < 2) { x.fillStyle = ink(0.3); x.font = '13px ' + FONT; x.textAlign = 'center'; x.fillText('day ' + d.N, w / 2, h / 2); return; }
    var pts = [];
    for (var i = 0; i < d.N; i++) { var lo = 0, win = 0; for (var j = Math.max(0, i - 6); j <= i; j++) { win++; if (d.act[j]) lo++; } var rate = lo / win; pts.push([(i / 365) * w, base - rate * (h - 40)]); }
    var grd = x.createLinearGradient(0, 20, 0, base); grd.addColorStop(0, g(0.4)); grd.addColorStop(1, g(0.03));
    x.fillStyle = grd; x.beginPath(); x.moveTo(0, base); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(pts[pts.length - 1][0], base); x.closePath(); x.fill();
    x.strokeStyle = g(0.8); x.lineWidth = 1.8; x.beginPath(); pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.stroke();
  }

  /* 8. THE NUMBER — pure typography: the count, the delta, a sparkline */
  function bigNumber(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2;
    x.textAlign = 'center';
    x.fillStyle = '#f4fff7'; x.font = '800 ' + Math.min(w * 0.3, 84) + 'px ' + FONT;
    x.fillText(d.total, cx, h * 0.44);
    x.fillStyle = ink(0.62); x.font = '500 14px ' + FONT; x.fillText('days shown up', cx, h * 0.44 + 24);
    // this-month delta
    var thisM = 0, lastM = 0; for (var i = Math.max(0, d.N - 30); i < d.N; i++) if (d.act[i]) thisM++; for (var j = Math.max(0, d.N - 60); j < d.N - 30; j++) if (d.act[j]) lastM++;
    var dl = thisM - lastM;
    x.font = '600 13px ' + FONT; x.fillStyle = dl >= 0 ? g(0.95) : ink(0.6);
    x.fillText((dl >= 0 ? '+' : '') + dl + ' vs last month   ·   ' + Math.round(d.rate * 100) + '% lately', cx, h * 0.44 + 46);
    // sparkline last 40 days
    var n = Math.min(40, d.N), sx = w * 0.2, sw = w * 0.6, sy = h * 0.82, sh = 26;
    x.strokeStyle = g(0.55); x.lineWidth = 1.5; x.beginPath();
    for (var k = 0; k < n; k++) { var idx = d.N - n + k, lo = 0, win = 0; for (var m = Math.max(0, idx - 3); m <= idx; m++) { win++; if (d.act[m]) lo++; } var v = lo / win; var px = sx + (k / Math.max(1, n - 1)) * sw, py = sy - v * sh; k ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.stroke();
  }

  /* 9. THE DIALS — three analytical gauges */
  function dials(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var data = [['rate', d.rate, Math.round(d.rate * 100) + '%'], ['streak', Math.min(1, d.streak / 60), d.streak], ['total', d.maturity, d.total]];
    var gw = w / 3;
    data.forEach(function (dt, i) {
      var cx = gw * i + gw / 2, cy = h * 0.44, R = Math.min(gw, h) * 0.28;
      x.lineWidth = 8; x.strokeStyle = ink(0.08); x.beginPath(); x.arc(cx, cy, R, 0, T); x.stroke();
      x.strokeStyle = g(0.8); x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + T * Math.max(0.02, dt[1])); x.stroke();
      x.fillStyle = '#f4fff7'; x.textAlign = 'center'; x.font = '700 ' + Math.min(R * 0.72, 22) + 'px ' + FONT; x.fillText(dt[2], cx, cy + R * 0.28);
      x.fillStyle = ink(0.55); x.font = '500 11px ' + FONT; x.fillText(dt[0], cx, cy + R + 20);
    });
  }

  /* 10. THE FIELD — a bold contribution grid, one cell per day */
  function field(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var cols = 27, rows = 7, pad = 14, gap = 2.5;
    var cw = (w - pad * 2 - (cols - 1) * gap) / cols, ch = (h - pad * 2 - (rows - 1) * gap) / rows, cell = Math.min(cw, ch);
    var ox = (w - (cols * cell + (cols - 1) * gap)) / 2, oy = (h - (rows * cell + (rows - 1) * gap)) / 2;
    var shown = d.act.slice(Math.max(0, d.N - cols * rows));
    for (var i = 0; i < cols * rows; i++) {
      var col = Math.floor(i / rows), row = i % rows;
      var on = shown[i];
      x.fillStyle = i < shown.length ? (on ? g(0.9) : ink(0.05)) : ink(0.02);
      roundRect(x, ox + col * (cell + gap), oy + row * (cell + gap), cell, cell, 2); x.fill();
    }
  }

  /* 11. THE LIFE BAR — a single bar filling left to right, split by month */
  function lifeBar(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], m = 24, bh = 30, by = h / 2 - bh / 2, bw = w - m * 2;
    x.fillStyle = ink(0.05); roundRect(x, m, by, bw, bh, 8); x.fill();
    var months = Math.max(1, Math.ceil(d.N / 30));
    x.save(); roundRect(x, m, by, bw, bh, 8); x.clip();
    for (var mo = 0; mo < months; mo++) {
      var on = 0, dd = 0; for (var i = mo * 30; i < Math.min(d.N, mo * 30 + 30); i++) { dd++; if (d.act[i]) on++; }
      var rate = dd ? on / dd : 0;
      var seg = bw * (Math.min(d.N, mo * 30 + 30) / 365) - bw * (mo * 30 / 365);
      var sx = m + bw * (mo * 30 / 365);
      x.fillStyle = 'rgba(' + G[0] + ',' + G[1] + ',' + G[2] + ',' + (0.28 + 0.6 * rate) + ')';
      x.fillRect(sx, by, seg + 0.5, bh);
    }
    x.restore();
    var fillX = m + bw * (d.N / 365);
    x.fillStyle = '#eafff0'; x.fillRect(fillX - 1, by - 4, 2, bh + 8);
    x.fillStyle = ink(0.55); x.font = '500 12px ' + FONT; x.textAlign = 'left'; x.fillText('day 1', m, by + bh + 20);
    x.textAlign = 'right'; x.fillText('day 365', m + bw, by + bh + 20);
    x.textAlign = 'center'; x.fillStyle = ink(0.85); x.font = '600 13px ' + FONT; x.fillText(d.total + ' of ' + d.N + ' days kept', w / 2, by - 14);
  }

  /* 12. THE ODOMETER — a mechanical counter of total days */
  function odometer(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var str = String(d.total), digits = str.length < 3 ? ('000' + str).slice(-3) : str;
    var dw = Math.min(46, (w - 40) / digits.length), dh = dw * 1.4, gap = 6;
    var totalW = digits.length * dw + (digits.length - 1) * gap, sx = (w - totalW) / 2, sy = h / 2 - dh / 2;
    for (var i = 0; i < digits.length; i++) {
      var bx = sx + i * (dw + gap);
      var grd = x.createLinearGradient(0, sy, 0, sy + dh); grd.addColorStop(0, '#0d1a10'); grd.addColorStop(0.5, '#16311d'); grd.addColorStop(1, '#0d1a10');
      x.fillStyle = grd; roundRect(x, bx, sy, dw, dh, 6); x.fill();
      x.fillStyle = ink(0.06); x.fillRect(bx, sy + dh / 2 - 0.5, dw, 1);
      var lit = digits[i] !== '0' || i >= digits.length - String(d.total).length;
      x.fillStyle = lit ? '#eafff0' : ink(0.25); x.textAlign = 'center'; x.font = '800 ' + dh * 0.62 + 'px ' + FONT;
      x.fillText(digits[i], bx + dw / 2, sy + dh * 0.68);
    }
    x.fillStyle = ink(0.55); x.font = '500 13px ' + FONT; x.textAlign = 'center'; x.fillText('actions completed', w / 2, sy + dh + 26);
  }

  /* 13. THE HEARTBEAT — an EKG strip, a beat per day shown up */
  function heartbeat(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], mid = h / 2;
    var n = Math.min(d.N, 60), start = d.N - n, seg = w / Math.max(1, n);
    x.strokeStyle = g(0.85); x.lineWidth = 1.8; x.lineJoin = 'round'; x.beginPath(); x.moveTo(0, mid);
    for (var i = 0; i < n; i++) {
      var bx = i * seg, on = d.act[start + i];
      if (on) { x.lineTo(bx + seg * 0.3, mid); x.lineTo(bx + seg * 0.4, mid - 4); x.lineTo(bx + seg * 0.5, mid - h * 0.3); x.lineTo(bx + seg * 0.6, mid + h * 0.18); x.lineTo(bx + seg * 0.7, mid); x.lineTo(bx + seg, mid); }
      else { x.lineTo(bx + seg, mid); }
    }
    x.stroke();
    var lx = n * seg; // glowing leading point
    var hg = x.createRadialGradient(Math.min(lx, w), mid, 0, Math.min(lx, w), mid, 12); hg.addColorStop(0, g(0.9)); hg.addColorStop(1, g(0)); x.fillStyle = hg; x.beginPath(); x.arc(Math.min(lx, w) - 4, mid, 12, 0, T); x.fill();
  }

  /* 14. THE PERCENT — one big rate ring, a stat stack beside it */
  function percent(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w * 0.34, cy = h / 2, R = Math.min(w * 0.22, h * 0.34);
    x.lineWidth = 12; x.strokeStyle = ink(0.08); x.beginPath(); x.arc(cx, cy, R, 0, T); x.stroke();
    x.lineCap = 'round'; x.strokeStyle = g(0.85); x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + T * Math.max(0.02, d.rate)); x.stroke();
    x.fillStyle = '#f4fff7'; x.textAlign = 'center'; x.font = '800 ' + R * 0.6 + 'px ' + FONT; x.fillText(Math.round(d.rate * 100) + '%', cx, cy + R * 0.22);
    x.fillStyle = ink(0.5); x.font = '500 11px ' + FONT; x.fillText('lately', cx, cy + R + 18);
    var rows = [[d.total, 'days shown up'], [d.streak, 'day streak'], [d.longest, 'longest run']], rx = w * 0.62, ry = cy - 34;
    x.textAlign = 'left';
    rows.forEach(function (r, i) { x.fillStyle = '#f4fff7'; x.font = '700 24px ' + FONT; x.fillText(r[0], rx, ry + i * 40); x.fillStyle = ink(0.55); x.font = '500 12px ' + FONT; x.fillText(r[1], rx + 46, ry + i * 40 - 2); });
  }

  /* 15. THE STRATA — sediment; a band per week, colour by that week's rate */
  function strata(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], m = 22, base = h - m;
    var weeks = Math.ceil(d.N / 7), bandH = Math.min(9, (h - m * 2) / Math.max(1, weeks)), bw = w - m * 2;
    for (var wk = 0; wk < weeks; wk++) {
      var on = 0, dd = 0; for (var i = wk * 7; i < Math.min(d.N, wk * 7 + 7); i++) { dd++; if (d.act[i]) on++; }
      var rate = dd ? on / dd : 0, y = base - (wk + 1) * bandH;
      if (y < m) break;
      x.fillStyle = 'rgba(' + G[0] + ',' + G[1] + ',' + G[2] + ',' + (0.12 + 0.7 * rate) + ')';
      roundRect(x, m, y + 1, bw, bandH - 1.5, 2); x.fill();
    }
    x.strokeStyle = ink(0.08); x.lineWidth = 1; x.beginPath(); x.moveTo(m, base + 2); x.lineTo(w - m, base + 2); x.stroke();
  }

  /* ---- helpers for the M-themed set ---- */
  function sampleM(cx, cy, w, h, K) {
    var pts = mPoints(cx, cy, w, h), segs = [], tot = 0;
    for (var i = 1; i < pts.length; i++) { var L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], L]); tot += L; }
    var out = [];
    for (var k = 0; k < K; k++) {
      var target = K === 1 ? 0 : (k / (K - 1)) * tot, run = 0, si = 0;
      while (si < segs.length - 1 && run + segs[si][2] < target) { run += segs[si][2]; si++; }
      var f = segs[si][2] ? (target - run) / segs[si][2] : 0;
      out.push([segs[si][0][0] + (segs[si][1][0] - segs[si][0][0]) * f, segs[si][0][1] + (segs[si][1][1] - segs[si][0][1]) * f]);
    }
    return out;
  }
  function distToSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    var qx = ax + t * dx, qy = ay + t * dy; return Math.hypot(px - qx, py - qy);
  }

  /* 18. THE M CONSTELLATION — days are stars; the first ~26 trace the M, then a
        field grows around it. Subtle at a glance, a clear M by ~day 30. (Malik's) */
  function mConstel(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var Mw = Math.min(w * 0.5, 160), Mh = Math.min(h * 0.56, 150), SK = 26;
    var skel = sampleM(cx, cy, Mw, Mh, SK), r = rng(88), stars = [];
    for (var i = 0; i < d.total; i++) {
      if (i < SK) stars.push([skel[i][0] + (r() - 0.5) * 8, skel[i][1] + (r() - 0.5) * 8, 1]);
      else { var a = r() * T, rad = Math.max(Mw, Mh) * 0.5 + (i - SK) / Math.max(1, d.total - SK) * Math.min(w, h) * 0.5 * d.maturity + r() * 22; stars.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a) * 0.9, 0.3]); }
    }
    for (var aI = 1; aI < stars.length; aI++) { var best = -1, bd = 1e9; for (var b = 0; b < aI; b++) { var dx = stars[aI][0] - stars[b][0], dy = stars[aI][1] - stars[b][1], dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = b; } } if (best >= 0 && bd < 3600) { x.strokeStyle = g(0.09 + 0.14 * Math.min(stars[aI][2], stars[best][2])); x.lineWidth = 1; x.beginPath(); x.moveTo(stars[aI][0], stars[aI][1]); x.lineTo(stars[best][0], stars[best][1]); x.stroke(); } }
    for (var p = 0; p < stars.length; p++) { var stq = stars[p], last = p === stars.length - 1, br = stq[2]; if (last) { var hg = x.createRadialGradient(stq[0], stq[1], 0, stq[0], stq[1], 14); hg.addColorStop(0, g(0.85)); hg.addColorStop(1, g(0)); x.fillStyle = hg; x.beginPath(); x.arc(stq[0], stq[1], 14, 0, T); x.fill(); } x.fillStyle = last ? '#eafff0' : g(0.35 + 0.55 * br); x.beginPath(); x.arc(stq[0], stq[1], last ? 3.4 : 1.4 + 1.7 * br, 0, T); x.fill(); }
    if (d.total === 0) { x.fillStyle = ink(0.3); x.font = '13px ' + FONT; x.textAlign = 'center'; x.fillText('day 0', cx, cy); }
  }

  /* 19. THE M RANGE — two peaks and a central valley: the top of an M as a
        mountain range. It rises the longer you keep going. (Memento's mountain) */
  function mRange(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], base = h - 16;
    var sky = x.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, 'rgba(9,26,16,1)'); sky.addColorStop(1, 'rgba(3,8,5,1)'); x.fillStyle = sky; x.fillRect(0, 0, w, h);
    var ph = (0.22 + 0.72 * d.maturity) * Math.min(h * 0.72, 190);
    var xs = [0, w * 0.12, w * 0.32, w * 0.5, w * 0.68, w * 0.88, w];
    for (var layer = 2; layer >= 0; layer--) {
      var f = layer === 0 ? 1 : layer === 1 ? 0.72 : 0.5, hh = ph * f, off = layer * 14;
      var ys = [base, base - hh * 0.2, base - hh, base - hh * 0.42, base - hh, base - hh * 0.2, base];
      var grd = x.createLinearGradient(0, base - hh, 0, base);
      if (layer === 0) { grd.addColorStop(0, g(0.42)); grd.addColorStop(1, 'rgba(14,74,38,0.95)'); x.fillStyle = grd; }
      else x.fillStyle = 'rgba(' + (10 + layer * 4) + ',' + (54 - layer * 10) + ',' + (30 - layer * 6) + ',0.9)';
      x.beginPath(); x.moveTo(0, base + 4);
      for (var i = 0; i < xs.length; i++) x.lineTo(xs[i], ys[i] + off);
      x.lineTo(w, base + 4); x.closePath(); x.fill();
    }
  }

  /* 20. THE M, ONE LINE — a single glowing stroke draws the mark; complete by
        ~day 30, then it gains a halo. The tip is today. */
  function mOneLine(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var Mw = Math.min(w * 0.5, 150), Mh = Math.min(h * 0.58, 150), lw = 13;
    var pts = mPoints(cx, cy, Mw, Mh), segs = [], tot = 0;
    for (var i = 1; i < pts.length; i++) { var L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], L]); tot += L; }
    strokeM(x, pts, lw, ink(0.06));
    var frac = Math.min(1, d.total / 30), target = frac * tot, run = 0, tip = pts[0];
    var grd = x.createLinearGradient(cx - Mw / 2, 0, cx + Mw / 2, 0); grd.addColorStop(0, g(0.6)); grd.addColorStop(1, g(1));
    x.lineJoin = 'miter'; x.lineCap = 'round'; x.lineWidth = lw; x.strokeStyle = grd;
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (var s2 = 0; s2 < segs.length; s2++) { var seg = segs[s2]; if (run + seg[2] <= target) { x.lineTo(seg[1][0], seg[1][1]); tip = seg[1]; run += seg[2]; } else { var ff = seg[2] ? (target - run) / seg[2] : 0, mx = seg[0][0] + (seg[1][0] - seg[0][0]) * ff, my = seg[0][1] + (seg[1][1] - seg[0][1]) * ff; x.lineTo(mx, my); tip = [mx, my]; break; } }
    x.stroke();
    if (frac >= 1) { x.globalAlpha = 0.3 + 0.35 * d.maturity; strokeM(x, pts, lw + 8 * d.maturity, g(0.14)); x.globalAlpha = 1; }
    var hg = x.createRadialGradient(tip[0], tip[1], 0, tip[0], tip[1], lw * 1.5); hg.addColorStop(0, g(0.95)); hg.addColorStop(1, g(0)); x.fillStyle = hg; x.beginPath(); x.arc(tip[0], tip[1], lw * 1.5, 0, T); x.fill();
    x.fillStyle = '#eafff0'; x.beginPath(); x.arc(tip[0], tip[1], lw * 0.34, 0, T); x.fill();
  }

  /* 21. THE M MOSAIC — the mark tiled in day-cells, filling from the base. One
        tile lit per slice of the record; a missed stretch leaves it unfilled. */
  function mMosaic(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var Mw = Math.min(w * 0.54, 176), Mh = Math.min(h * 0.6, 160), lw = Mw * 0.2;
    var pts = mPoints(cx, cy, Mw, Mh), cell = Math.max(7, Mw / 17), cells = [];
    for (var gy = cy - Mh / 2 - cell; gy < cy + Mh / 2 + cell; gy += cell) for (var gx = cx - Mw / 2 - cell; gx < cx + Mw / 2 + cell; gx += cell) {
      var bestd = 1e9; for (var i = 1; i < pts.length; i++) { var ds = distToSeg(gx + cell / 2, gy + cell / 2, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); if (ds < bestd) bestd = ds; }
      if (bestd < lw / 2) cells.push([gx, gy]);
    }
    cells.sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; }); // bottom-up fill
    var lit = Math.round(cells.length * (d.total / 365));
    cells.forEach(function (cc, i) { x.fillStyle = i < lit ? g(0.4 + 0.5 * (i / Math.max(1, cells.length))) : ink(0.05); roundRect(x, cc[0] + 1, cc[1] + 1, cell - 2, cell - 2, 2); x.fill(); });
  }

  /* 22. THE M RADIANT — the mark shedding light; a beam for every day, more and
        longer as the record grows. Ties to Memento's god-ray beams. */
  function mBeams(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var Mw = Math.min(w * 0.44, 140), Mh = Math.min(h * 0.5, 140), skel = sampleM(cx, cy, Mw, Mh, 40);
    x.globalCompositeOperation = 'lighter';
    var nb = Math.min(d.total, 64), r = rng(55);
    for (var i = 0; i < nb; i++) { var p = skel[(r() * skel.length) | 0], ang = Math.atan2(p[1] - cy, p[0] - cx) + (r() - 0.5) * 0.7, len = 28 + r() * 74 * (0.5 + 0.5 * d.maturity); var ex = p[0] + Math.cos(ang) * len, ey = p[1] + Math.sin(ang) * len; var grd = x.createLinearGradient(p[0], p[1], ex, ey); grd.addColorStop(0, g(0.16)); grd.addColorStop(1, g(0)); x.strokeStyle = grd; x.lineWidth = 1.5; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(ex, ey); x.stroke(); }
    x.globalCompositeOperation = 'source-over';
    strokeM(x, mPoints(cx, cy, Mw, Mh), 8, g(0.85)); strokeM(x, mPoints(cx, cy, Mw, Mh), 3, '#eafff0');
  }

  /* 23. THE M CORE — the mark holds the centre from day one; your days orbit it
        in a widening field, missed days as faint rings. */
  function mCore(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var Mr = Math.min(w, h) * 0.14, spread = Math.min(w, h) * 0.42 / Math.sqrt(d.N + 8);
    for (var i = 0; i < d.N; i++) { var ang = i * 2.399963, rr = Mr * 1.35 + spread * Math.sqrt(i), px = cx + rr * Math.cos(ang), py = cy + rr * Math.sin(ang); if (d.act[i]) { x.fillStyle = g(0.3 + 0.5 * (i / Math.max(1, d.N))); x.beginPath(); x.arc(px, py, 1.5, 0, T); x.fill(); } else { x.strokeStyle = ink(0.08); x.lineWidth = 1; x.beginPath(); x.arc(px, py, 1.3, 0, T); x.stroke(); } }
    var cg = x.createRadialGradient(cx, cy, 0, cx, cy, Mr * 2.2); cg.addColorStop(0, g(0.28)); cg.addColorStop(1, g(0)); x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, Mr * 2.2, 0, T); x.fill();
    strokeM(x, mPoints(cx, cy, Mr * 1.5, Mr * 1.7), Mr * 0.3, '#eafff0');
  }

  /* 24. THE M CONTOURS — nested outlines of the mark, like a topographic map. A
        single line at day 1, a layered relief by 365. */
  function mContours(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var Mw = Math.min(w * 0.5, 150), Mh = Math.min(h * 0.56, 150), K = 2 + Math.round(d.maturity * 9);
    for (var j = K; j >= 0; j--) { var sc = 0.32 + 0.98 * (j / K), alpha = 0.12 + 0.5 * (1 - j / K); strokeM(x, mPoints(cx, cy, Mw * sc, Mh * sc), Math.max(1, 2.4 * (1 - j / K) + 1), g(alpha)); }
  }

  var HEROES = [
    { n: 'The aurora', why: 'Kept. Light curtains; one ribbon at day 1, a full sky at 365.', fn: aurora },
    { n: 'The constellation', why: 'Kept. Days wired to neighbours; two nodes read as intentional, 365 is a galaxy.', fn: constellation },
    { n: 'The M fills', why: 'The mark as a vessel. Green rises inside the M as the record grows. Brand + growth in one glance.', fn: mFill },
    { n: 'The M lights up', why: 'Nodes trace the M and switch on one per day. Day 1 is a single lit point on a faint mark; 365 is a glowing M.', fn: mLights },
    { n: 'The tree', why: 'A sprout at day 1, a full canopy by 365. Structure, not scatter, so growth is unmistakable.', fn: tree },
    { n: 'The mountains', why: 'Elevation only climbs on days you show up, dips slightly when you miss. The literal shape of showing up.', fn: mountains },
    { n: 'The spiral', why: 'A record of your days winding out from today at the core. One ring per season.', fn: spiral },
    { n: 'The skyline', why: 'One tower per week, height is that week\'s consistency. A city that grows as you do.', fn: skyline },
    { n: 'The terrain', why: 'The whole record as one profile: the rolling shape of your consistency, left to right, day 1 to today.', fn: terrain },
    { n: 'The number', why: 'No picture. The count, the month-over-month delta, the recent rate, one sparkline. Analytical and honest.', fn: bigNumber },
    { n: 'The dials', why: 'Three gauges: recent rate, current streak, all-time total. A dashboard read in one look.', fn: dials },
    { n: 'The field', why: 'A bold contribution grid, one cell per day. Universally understood; a wall of green is the reward.', fn: field },
    { n: 'The life bar', why: 'One bar, day 1 on the left to 365 on the right, each month shaded by how consistent it was. Time made linear.', fn: lifeBar },
    { n: 'The odometer', why: 'A mechanical counter of actions completed. It only ever ticks up. Tactile, kinetic, dead simple.', fn: odometer },
    { n: 'The heartbeat', why: 'An EKG strip: a beat for every day you showed up, a flatline for the days you did not. Proof you are alive to it.', fn: heartbeat },
    { n: 'The percent', why: 'One big rate ring and a stack of the numbers that matter. The most product-analytics of the set.', fn: percent },
    { n: 'The strata', why: 'Sediment. A band per week, colour by that week\'s rate, building upward like rock. Geological time.', fn: strata },
    { n: 'The M constellation', why: 'Your idea. Days are stars; the first ~26 trace the mark, so a clear M emerges by day 30, then a field grows around it. Subtle at a glance.', fn: mConstel },
    { n: 'The M range', why: 'Two peaks and a central valley: the top of an M drawn as a mountain range. It rises the longer you keep going. Memento\'s mountain.', fn: mRange },
    { n: 'The M, one line', why: 'A single glowing stroke draws the mark, complete by ~day 30, then it gains a halo. The tip is today.', fn: mOneLine },
    { n: 'The M mosaic', why: 'The mark tiled in day-cells, filling from the base. Honest: a thin record leaves the M unfinished.', fn: mMosaic },
    { n: 'The M radiant', why: 'The mark shedding light, a beam for every day, more and longer as it grows. Ties to the god-ray beams.', fn: mBeams },
    { n: 'The M core', why: 'The mark holds the centre from day one; your days orbit it in a widening field, missed days as faint rings.', fn: mCore },
    { n: 'The M contours', why: 'Nested outlines of the mark, like a topographic map. A single line at day 1, a layered relief by 365.', fn: mContours }
  ];

  // Malik kept only the heatmap; the other 23 visual heroes are cut.
  HEROES = HEROES.filter(function (h) { return h.n === 'The field'; });

  var wrap = document.getElementById('heroLab');
  if (!wrap) return;
  var st = document.createElement('style');
  st.textContent =
    '.hl-controls{position:sticky;top:0;z-index:20;background:rgba(6,7,10,0.92);backdrop-filter:blur(14px);padding:14px 2px 12px;margin:0 0 20px;border-bottom:1px solid var(--hairline)}' +
    '.hl-slrow{display:flex;align-items:center;gap:16px;flex-wrap:wrap}' +
    '.hl-slrow input[type=range]{flex:1;min-width:220px;accent-color:#3fd94e;height:4px}' +
    '.hl-day{font-size:15px;font-weight:750;color:var(--text-hi);min-width:96px;font-variant-numeric:tabular-nums}' +
    '.hl-meta{font-size:12px;color:var(--text-lo);min-width:150px;font-variant-numeric:tabular-nums}' +
    '.hl-chips{display:flex;gap:6px}' +
    '.hl-chips button{font:inherit;font-size:12px;font-weight:600;color:var(--text-mid);background:var(--surface-1,rgba(255,255,255,.04));border:0;border-radius:7px;padding:6px 11px;cursor:pointer}' +
    '.hl-chips button:hover{color:var(--text-hi)}' +
    '.hl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}' +
    '.hl-card{background:var(--surface-0,#040405);border-radius:16px;overflow:hidden;position:relative}' +
    '.hl-card canvas{display:block;width:100%;height:240px}' +
    '.hl-card__c{padding:12px 14px 14px}' +
    '.hl-card__n{font-size:15px;font-weight:700;color:var(--text-hi)}' +
    '.hl-card__w{font-size:12.5px;color:var(--text-mid);line-height:1.5;margin-top:3px}' +
    '.hl-card__i{position:absolute;top:10px;left:12px;font-size:11px;font-weight:700;color:var(--text-lo);font-variant-numeric:tabular-nums}' +
    '@media(max-width:720px){.hl-grid{grid-template-columns:1fr}}';
  document.head.appendChild(st);

  var controls = document.createElement('div'); controls.className = 'hl-controls';
  controls.innerHTML =
    '<div class="hl-slrow">' +
      '<span class="hl-day" id="hlDay">Day 120</span>' +
      '<input type="range" id="hlSlider" min="0" max="365" value="120">' +
      '<span class="hl-meta" id="hlMeta"></span>' +
      '<div class="hl-chips" id="hlChips">' +
        ['1', '7', '30', '90', '180', '365'].map(function (v) { return '<button data-d="' + v + '">Day ' + v + '</button>'; }).join('') +
      '</div>' +
    '</div>';
  wrap.appendChild(controls);
  var grid = document.createElement('div'); grid.className = 'hl-grid'; wrap.appendChild(grid);

  var cells = [];
  HEROES.forEach(function (H, i) {
    var card = document.createElement('div'); card.className = 'hl-card';
    var cv = document.createElement('canvas');
    card.appendChild(cv);
    var cap = document.createElement('div'); cap.className = 'hl-card__c';
    cap.innerHTML = '<div class="hl-card__n">' + (i + 1) + '. ' + H.n + '</div><div class="hl-card__w">' + H.why + '</div>';
    var idx = document.createElement('div'); idx.className = 'hl-card__i';
    card.appendChild(idx); card.appendChild(cap);
    grid.appendChild(card);
    cells.push({ cv: cv, fn: H.fn, idx: idx });
  });

  var DAY = 120, pending = false;
  function paint() {
    var d = record(DAY);
    document.getElementById('hlDay').textContent = 'Day ' + DAY;
    document.getElementById('hlMeta').textContent = d.total + ' shown up · ' + Math.round(d.rate * 100) + '% lately · streak ' + d.streak;
    cells.forEach(function (o) { try { o.fn(o.cv, d); o.idx.textContent = 'day ' + DAY; } catch (e) {} });
  }
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; paint(); }); }
  document.getElementById('hlSlider').addEventListener('input', function () { DAY = +this.value; schedule(); });
  document.getElementById('hlChips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; DAY = +b.getAttribute('data-d'); document.getElementById('hlSlider').value = DAY; schedule(); });
  paint();
  setInterval(paint, 1600); // repaint for the embedded pane that discards canvases when hidden
  window.addEventListener('resize', function () { clearTimeout(window.__hlR); window.__hlR = setTimeout(paint, 150); });
})();
