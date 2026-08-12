/* ============================================================
   Consistency hero visuals — 10 candidate replacements for the bloom.
   The bloom is an ACCUMULATION: two dots read as empty, and it only
   earns its keep past ~day 100. Every visual here is built to be a
   complete, deliberate object at DAY 2 and majestic at DAY 400.

   Self-contained: owns its own section, data, and canvas rendering.
   Does not touch window.CVAR / the 12-layout gallery.
   ============================================================ */
(function () {
  var GREEN = [63, 217, 78];
  function g(a) { return 'rgba(' + GREEN[0] + ',' + GREEN[1] + ',' + GREEN[2] + ',' + a + ')'; }
  function ink(a) { return 'rgba(255,255,255,' + a + ')'; }

  /* seeded rng so a given day count always looks the same */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* a realistic active-day record of length N */
  function record(N) {
    var r = rng(12345), act = [], total = 0;
    for (var i = 0; i < N; i++) {
      var on = r() < 0.86;
      if (N >= 45 && i >= (N * 0.4 | 0) && i < (N * 0.4 | 0) + 3) on = false; // one real gap
      if (i >= N - 2) on = true; // currently on a run
      act.push(on); if (on) total++;
    }
    var win = Math.min(30, N), lo = 0;
    for (var j = N - win; j < N; j++) if (act[j]) lo++;
    return { N: N, act: act, total: total, rate: win ? lo / win : 0,
             maturity: Math.max(0, Math.min(1, Math.sqrt(total) / Math.sqrt(400))) };
  }

  /* dpr-correct canvas setup; returns [ctx,w,h] */
  function setup(c) {
    var dpr = window.devicePixelRatio || 1;
    var w = c.clientWidth || 240, h = c.clientHeight || 260;
    c.width = w * dpr; c.height = h * dpr;
    var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    return [x, w, h];
  }
  function TAU() { return Math.PI * 2; }

  /* ---------- 1. THE ORB — a bead of light that gains a granular skin ---------- */
  function orb(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var R = 26 + 62 * d.maturity;
    var glow = x.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.3);
    glow.addColorStop(0, g(0.32)); glow.addColorStop(0.5, g(0.08)); glow.addColorStop(1, g(0));
    x.fillStyle = glow; x.beginPath(); x.arc(cx, cy, R * 2.3, 0, TAU()); x.fill();
    var body = x.createRadialGradient(cx - R * 0.34, cy - R * 0.4, R * 0.1, cx, cy, R * 1.05);
    body.addColorStop(0, 'rgba(190,255,200,0.98)'); body.addColorStop(0.35, g(0.92));
    body.addColorStop(0.75, 'rgba(24,120,52,0.98)'); body.addColorStop(1, 'rgba(6,26,14,1)');
    x.fillStyle = body; x.beginPath(); x.arc(cx, cy, R, 0, TAU()); x.fill();
    var r = rng(7); // one grain per active day, seeded inside the sphere
    for (var i = 0; i < d.total; i++) {
      var a = r() * TAU(), rr = Math.sqrt(r()) * R * 0.92;
      var gx = cx + rr * Math.cos(a), gy = cy + rr * Math.sin(a);
      var depth = 1 - rr / R;
      x.fillStyle = ink(0.06 + 0.14 * depth);
      x.beginPath(); x.arc(gx, gy, 0.9 + 1.1 * depth, 0, TAU()); x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,0.5)'; // specular
    x.beginPath(); x.ellipse(cx - R * 0.34, cy - R * 0.42, R * 0.22, R * 0.12, -0.7, 0, TAU()); x.fill();
  }

  /* ---------- 2. THE TIDE — a vessel; level = how consistent lately, depth = total ---------- */
  function tide(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var m = 26, vw = w - m * 2, vh = h - m * 2, rx = m, ry = m, rad = 20;
    x.save(); x.beginPath(); rr(x, rx, ry, vw, vh, rad); x.clip();
    x.fillStyle = 'rgba(255,255,255,0.03)'; x.fillRect(rx, ry, vw, vh);
    var level = ry + vh * (1 - (0.32 + 0.6 * d.rate * (0.4 + 0.6 * d.maturity)));
    var grd = x.createLinearGradient(0, level, 0, ry + vh);
    grd.addColorStop(0, g(0.5)); grd.addColorStop(1, 'rgba(20,110,50,0.92)');
    x.fillStyle = grd; x.beginPath(); x.moveTo(rx, level);
    for (var px = 0; px <= vw; px += 6) {
      var yy = level + Math.sin(px / 26 + 0.6) * 4 + Math.sin(px / 11) * 2;
      x.lineTo(rx + px, yy);
    }
    x.lineTo(rx + vw, ry + vh); x.lineTo(rx, ry + vh); x.closePath(); x.fill();
    x.strokeStyle = ink(0.5); x.lineWidth = 1.6; x.beginPath();
    for (var p2 = 0; p2 <= vw; p2 += 6) { var y2 = level + Math.sin(p2 / 26 + 0.6) * 4 + Math.sin(p2 / 11) * 2; p2 === 0 ? x.moveTo(rx, y2) : x.lineTo(rx + p2, y2); }
    x.stroke(); x.restore();
    x.strokeStyle = ink(0.1); x.lineWidth = 1; x.beginPath(); rr(x, rx, ry, vw, vh, rad); x.stroke();
  }
  function rr(x, X, Y, W, H, r) { x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }

  /* ---------- 3. THE AURORA — light curtains; one ribbon at day 2, a full sky at 400 ---------- */
  function aurora(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var bands = 1 + Math.floor(d.maturity * 5); // 1..6
    x.globalCompositeOperation = 'lighter';
    for (var b = 0; b < bands; b++) {
      var yb = h * (0.34 + b * 0.11) + Math.sin(b) * 8;
      var amp = 26 - b * 2, alpha = 0.16 + 0.12 * (1 - b / bands);
      var grd = x.createLinearGradient(0, yb - 60, 0, yb + 40);
      grd.addColorStop(0, g(0)); grd.addColorStop(0.55, g(alpha)); grd.addColorStop(1, g(0));
      x.fillStyle = grd; x.beginPath(); x.moveTo(0, yb + 40);
      for (var px = 0; px <= w; px += 8) {
        var yy = yb + Math.sin(px / 60 + b * 1.3) * amp + Math.sin(px / 22 + b) * 6;
        x.lineTo(px, yy);
      }
      x.lineTo(w, yb + 40); x.closePath(); x.fill();
    }
    x.globalCompositeOperation = 'source-over';
    var r = rng(3); // faint stars, always present
    for (var i = 0; i < 40; i++) { x.fillStyle = ink(0.05 + r() * 0.12); x.beginPath(); x.arc(r() * w, r() * h * 0.5, r() * 0.9, 0, TAU()); x.fill(); }
  }

  /* ---------- 4. THE RING — an arc that grows in radius; inner rings mark the weeks ---------- */
  function ring(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var R = 40 + 52 * d.maturity, lw = 12 + 5 * d.maturity;
    x.lineWidth = lw; x.lineCap = 'round';
    x.strokeStyle = ink(0.07); x.beginPath(); x.arc(cx, cy, R, 0, TAU()); x.stroke();
    var weeks = Math.floor(d.total / 7); // faint inner tree-rings
    for (var k = 1; k <= Math.min(weeks, 7); k++) { x.lineWidth = 1; x.strokeStyle = g(0.08 + 0.02 * k); x.beginPath(); x.arc(cx, cy, R - lw - k * 5, 0, TAU()); x.stroke(); }
    var frac = 0.06 + 0.94 * d.rate, a0 = -Math.PI / 2, a1 = a0 + TAU() * frac;
    var grd = x.createLinearGradient(cx - R, cy, cx + R, cy);
    grd.addColorStop(0, g(0.55)); grd.addColorStop(1, g(1));
    x.lineWidth = lw; x.strokeStyle = grd; x.beginPath(); x.arc(cx, cy, R, a0, a1); x.stroke();
    var hx = cx + R * Math.cos(a1), hy = cy + R * Math.sin(a1); // glowing head
    var hg = x.createRadialGradient(hx, hy, 0, hx, hy, lw * 1.6);
    hg.addColorStop(0, g(0.9)); hg.addColorStop(1, g(0)); x.fillStyle = hg;
    x.beginPath(); x.arc(hx, hy, lw * 1.6, 0, TAU()); x.fill();
    x.fillStyle = '#eafff0'; x.beginPath(); x.arc(hx, hy, lw * 0.42, 0, TAU()); x.fill();
  }

  /* ---------- 5. THE CONSTELLATION — nodes wired to neighbours; a web that thickens ---------- */
  function constellation(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var n = Math.min(d.total, 120), pts = [], r = rng(9);
    var spread = Math.min(w, h) * 0.44 / Math.sqrt(n + 6);
    for (var i = 0; i < n; i++) {
      var ang = i * 2.399963, rr2 = spread * Math.sqrt(i);
      pts.push([cx + rr2 * Math.cos(ang) + (r() - 0.5) * 10, cy + rr2 * Math.sin(ang) + (r() - 0.5) * 10]);
    }
    x.strokeStyle = g(0.22); x.lineWidth = 1;
    for (var a = 0; a < pts.length; a++) { // link each to its nearest earlier node
      var best = -1, bd = 1e9;
      for (var b = 0; b < a; b++) { var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = b; } }
      if (best >= 0 && bd < 90 * 90) { x.beginPath(); x.moveTo(pts[a][0], pts[a][1]); x.lineTo(pts[best][0], pts[best][1]); x.stroke(); }
    }
    for (var p = 0; p < pts.length; p++) {
      var last = p === pts.length - 1;
      if (last) { var hg = x.createRadialGradient(pts[p][0], pts[p][1], 0, pts[p][0], pts[p][1], 14); hg.addColorStop(0, g(0.8)); hg.addColorStop(1, g(0)); x.fillStyle = hg; x.beginPath(); x.arc(pts[p][0], pts[p][1], 14, 0, TAU()); x.fill(); }
      x.fillStyle = last ? '#eafff0' : g(0.55 + 0.4 * (p / pts.length));
      x.beginPath(); x.arc(pts[p][0], pts[p][1], last ? 3.4 : 2, 0, TAU()); x.fill();
    }
  }

  /* ---------- 6. THE HORIZON — a scene: sun always up, hills stack over time ---------- */
  function horizon(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2];
    var sky = x.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, 'rgba(10,30,18,1)'); sky.addColorStop(0.6, 'rgba(6,16,11,1)'); sky.addColorStop(1, 'rgba(3,7,5,1)');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    var sunY = h * (0.52 - 0.22 * d.rate), sunX = w * 0.66;
    var sg = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
    sg.addColorStop(0, g(0.9)); sg.addColorStop(0.3, g(0.4)); sg.addColorStop(1, g(0));
    x.fillStyle = sg; x.beginPath(); x.arc(sunX, sunY, 60, 0, TAU()); x.fill();
    x.fillStyle = '#daffe6'; x.beginPath(); x.arc(sunX, sunY, 15, 0, TAU()); x.fill();
    var layers = 1 + Math.floor(d.maturity * 4); // 1..5 hill ranges
    for (var L = layers - 1; L >= 0; L--) {
      var baseY = h * (0.62 + L * 0.09), amp = 20 + L * 8, r = rng(100 + L);
      var shade = 0.10 + 0.16 * (1 - L / layers);
      x.fillStyle = 'rgba(' + (18 + L * 6) + ',' + (90 - L * 8) + ',' + (48 - L * 4) + ',' + (0.65 + shade) + ')';
      x.beginPath(); x.moveTo(0, h);
      for (var px = 0; px <= w; px += 10) { var yy = baseY + Math.sin(px / (70 - L * 8) + L) * amp + (r() - 0.5) * 6; x.lineTo(px, yy); }
      x.lineTo(w, h); x.closePath(); x.fill();
    }
  }

  /* ---------- 7. THE THREAD — a glowing cord; few gentle bends early, a tight braid late ---------- */
  function thread(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2;
    var m = 30, top = m, bot = h - m, span = bot - top;
    var twists = 1 + d.maturity * 7, amp = 30 + 26 * d.maturity;
    x.lineCap = 'round';
    for (var strand = 0; strand < 2; strand++) {
      var ph = strand * Math.PI;
      x.beginPath();
      for (var t = 0; t <= 1; t += 0.01) {
        var yy = bot - t * span;
        var xx = cx + Math.sin(t * twists * Math.PI + ph) * amp * (0.5 + 0.5 * t);
        t === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy);
      }
      x.strokeStyle = strand ? g(0.4) : g(0.7); x.lineWidth = strand ? 3 : 5; x.stroke();
    }
    var tipx = cx + Math.sin(1 * twists * Math.PI) * amp, tipy = top; // glowing tip = today
    var hg = x.createRadialGradient(tipx, tipy, 0, tipx, tipy, 18); hg.addColorStop(0, g(0.9)); hg.addColorStop(1, g(0));
    x.fillStyle = hg; x.beginPath(); x.arc(tipx, tipy, 18, 0, TAU()); x.fill();
    x.fillStyle = '#eafff0'; x.beginPath(); x.arc(tipx, tipy, 4, 0, TAU()); x.fill();
  }

  /* ---------- 8. THE CRYSTAL — a clean gem early, a faceted geode late ---------- */
  function crystal(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var R = 44 + 46 * d.maturity, sides = 6;
    var glow = x.createRadialGradient(cx, cy, 0, cx, cy, R * 1.8);
    glow.addColorStop(0, g(0.2)); glow.addColorStop(1, g(0)); x.fillStyle = glow;
    x.beginPath(); x.arc(cx, cy, R * 1.8, 0, TAU()); x.fill();
    var pts = [];
    for (var i = 0; i < sides; i++) { var a = -Math.PI / 2 + i / sides * TAU(); pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a) * 1.15]); }
    var gg = x.createLinearGradient(cx, cy - R, cx, cy + R);
    gg.addColorStop(0, g(0.5)); gg.addColorStop(1, 'rgba(16,90,42,0.85)');
    x.fillStyle = gg; x.beginPath(); pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.fill();
    var facets = 2 + Math.floor(d.maturity * 10); // internal refraction lines
    var r = rng(21); x.strokeStyle = g(0.3); x.lineWidth = 1;
    for (var f = 0; f < facets; f++) {
      var pa = pts[(r() * sides) | 0], pb = pts[(r() * sides) | 0];
      x.beginPath(); x.moveTo(pa[0], pa[1]); x.lineTo(cx + (r() - 0.5) * R * 0.4, cy + (r() - 0.5) * R * 0.4); x.lineTo(pb[0], pb[1]); x.stroke();
    }
    x.strokeStyle = ink(0.55); x.lineWidth = 1.5; x.beginPath(); pts.forEach(function (p, i) { i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }); x.closePath(); x.stroke();
  }

  /* ---------- 9. THE PULSE — a living sonar; a bright ring always breathes out ---------- */
  function pulse(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    var maxR = Math.min(w, h) * 0.44;
    var rings = 2 + Math.floor(d.maturity * 6);
    for (var i = rings; i >= 1; i--) {
      var rr2 = maxR * (i / rings);
      x.strokeStyle = g(0.06 + 0.12 * (1 - i / rings)); x.lineWidth = 1.5;
      x.beginPath(); x.arc(cx, cy, rr2, 0, TAU()); x.stroke();
    }
    var spikes = Math.max(12, Math.min(d.total, 90)), r = rng(5); // jagged activity ring
    x.strokeStyle = g(0.5); x.lineWidth = 2; x.beginPath();
    for (var k = 0; k <= spikes; k++) {
      var a = k / spikes * TAU(), amp = maxR * 0.5 + (r() * 0.5 + 0.3) * maxR * 0.34 * d.rate;
      var xx = cx + amp * Math.cos(a), yy = cy + amp * Math.sin(a);
      k ? x.lineTo(xx, yy) : x.moveTo(xx, yy);
    }
    x.closePath(); x.stroke();
    var cg = x.createRadialGradient(cx, cy, 0, cx, cy, 26); cg.addColorStop(0, g(0.95)); cg.addColorStop(1, g(0));
    x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, 26, 0, TAU()); x.fill();
    x.fillStyle = '#eafff0'; x.beginPath(); x.arc(cx, cy, 6, 0, TAU()); x.fill();
  }

  /* ---------- 10. THE NEBULA — a wisp with a bright core early, a rich cloud late ---------- */
  function nebula(c, d) {
    var s = setup(c), x = s[0], w = s[1], h = s[2], cx = w / 2, cy = h / 2;
    x.globalCompositeOperation = 'lighter';
    var puffs = 4 + Math.floor(d.maturity * 26), r = rng(33);
    var ext = 40 + 90 * d.maturity;
    for (var i = 0; i < puffs; i++) {
      var a = r() * TAU(), rr2 = Math.pow(r(), 0.6) * ext;
      var px = cx + rr2 * Math.cos(a), py = cy + rr2 * Math.sin(a) * 0.8;
      var rad = 20 + r() * 40;
      var gr = x.createRadialGradient(px, py, 0, px, py, rad);
      gr.addColorStop(0, g(0.05 + r() * 0.05)); gr.addColorStop(1, g(0));
      x.fillStyle = gr; x.beginPath(); x.arc(px, py, rad, 0, TAU()); x.fill();
    }
    var core = x.createRadialGradient(cx, cy, 0, cx, cy, 34); // today, always bright
    core.addColorStop(0, 'rgba(220,255,228,0.95)'); core.addColorStop(0.4, g(0.5)); core.addColorStop(1, g(0));
    x.fillStyle = core; x.beginPath(); x.arc(cx, cy, 34, 0, TAU()); x.fill();
    x.globalCompositeOperation = 'source-over';
    for (var st = 0; st < 26; st++) { x.fillStyle = ink(0.05 + r() * 0.1); x.beginPath(); x.arc(r() * w, r() * h, r() * 0.9, 0, TAU()); x.fill(); }
  }

  var HEROES = [
    { id: 'orb', name: 'The orb', fn: orb, why: 'A bead of light. Whole and glowing at day 2, a dense granular planet by 400. One grain per day sits under the skin.' },
    { id: 'tide', name: 'The tide', fn: tide, why: 'A vessel. The water level is how consistent you have been lately, the depth of colour is how long you have kept it.' },
    { id: 'aurora', name: 'The aurora', fn: aurora, why: 'Light curtains. One soft ribbon at day 2, a full sky by 400. Never sparse because it is light, not dots.' },
    { id: 'ring', name: 'The ring', fn: ring, why: 'An arc that widens as the record grows, filled by your recent rate, with faint inner rings marking the weeks.' },
    { id: 'constellation', name: 'The constellation', fn: constellation, why: 'Days wired to their neighbours. Two nodes and one line already read as intentional; 400 is a galaxy.' },
    { id: 'horizon', name: 'The horizon', fn: horizon, why: 'A scene. The sun is always up; ranges of hills stack behind each other the longer you keep going.' },
    { id: 'thread', name: 'The thread', fn: thread, why: 'A glowing cord that fills the frame at any age: a gentle bend at day 2, a tight braid by 400. The tip is today.' },
    { id: 'crystal', name: 'The crystal', fn: crystal, why: 'A clean gem early, a many-faceted geode late. It gains internal facets, not size alone.' },
    { id: 'pulse', name: 'The pulse', fn: pulse, why: 'A living sonar. A bright core and one ring breathe from the start; the jagged ring is your recent activity.' },
    { id: 'nebula', name: 'The nebula', fn: nebula, why: 'A wisp with a bright core at day 2, a rich cloud by 400. The core is always today.' }
  ];

  var STOPS = [2, 45, 400];
  var wrap = document.getElementById('heroLab');
  if (!wrap) return;

  // styles
  var st = document.createElement('style');
  st.textContent =
    '.hl-row{margin:0 0 30px}' +
    '.hl-row__h{display:flex;align-items:baseline;gap:12px;margin:0 0 4px}' +
    '.hl-row__n{font-size:16px;font-weight:700;color:var(--text-hi)}' +
    '.hl-row__i{font-size:12px;color:var(--text-lo)}' +
    '.hl-row__w{font-size:13px;color:var(--text-mid);line-height:1.5;max-width:760px;margin:0 0 12px}' +
    '.hl-trio{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}' +
    '.hl-cell{background:var(--surface-0,#040405);border-radius:16px;overflow:hidden;position:relative}' +
    '.hl-cell canvas{display:block;width:100%;height:230px}' +
    '.hl-cell__t{position:absolute;top:10px;left:12px;font-size:11px;font-weight:650;color:var(--text-mid);letter-spacing:.02em}' +
    '@media(max-width:720px){.hl-trio{grid-template-columns:1fr}}';
  document.head.appendChild(st);

  var canvases = [];
  HEROES.forEach(function (H, idx) {
    var row = document.createElement('div'); row.className = 'hl-row';
    row.innerHTML = '<div class="hl-row__h"><span class="hl-row__n">' + (idx + 1) + '. ' + H.name + '</span></div>' +
      '<p class="hl-row__w">' + H.why + '</p>' +
      '<div class="hl-trio"></div>';
    var trio = row.querySelector('.hl-trio');
    STOPS.forEach(function (day) {
      var cell = document.createElement('div'); cell.className = 'hl-cell';
      var cv = document.createElement('canvas');
      cell.innerHTML = '<div class="hl-cell__t">Day ' + day + '</div>';
      cell.appendChild(cv); trio.appendChild(cell);
      canvases.push({ cv: cv, fn: H.fn, day: day });
    });
    wrap.appendChild(row);
  });

  function paint() { canvases.forEach(function (o) { try { o.fn(o.cv, record(o.day)); } catch (e) {} }); }
  paint();
  // the embedded preview pane can discard canvas backing stores when hidden; repaint on a slow tick
  setInterval(paint, 1400);
  window.addEventListener('resize', function () { clearTimeout(window.__hlR); window.__hlR = setTimeout(paint, 150); });
})();
