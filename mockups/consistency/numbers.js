/* ============================================================
   Consistency — numbers-first heroes. 20 treatments, 5 each of:
   editorial stat sheet, dashboard tiles, headline sentence,
   scoreboard. The data is the hero. Real HTML type (crisp), the
   same seeded record, its own day slider (0..365).
   Numbers read from day one, which is the whole point.
   ============================================================ */
(function () {
  var G = '63,217,78';
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var MASTER = (function () { var r = rng(4242), a = []; for (var i = 0; i < 366; i++) { var p = 0.58 + 0.34 * (i / 365); var on = r() < p; if (i >= 44 && i <= 46) on = false; if (i >= 130 && i <= 133) on = false; a.push(on); } return a; })();

  function stats(N) {
    N = Math.max(0, Math.min(365, Math.round(N)));
    var act = MASTER.slice(0, N), total = 0; for (var i = 0; i < N; i++) if (act[i]) total++;
    var win = Math.min(30, N), lo = 0; for (var j = N - win; j < N; j++) if (act[j]) lo++;
    var streak = 0; for (var k = N - 1; k >= 0; k--) { if (act[k]) streak++; else break; }
    var longest = 0, run = 0; for (var m = 0; m < N; m++) { if (act[m]) { run++; if (run > longest) longest = run; } else run = 0; }
    var thisM = 0, lastM = 0; for (var a1 = Math.max(0, N - 30); a1 < N; a1++) if (act[a1]) thisM++; for (var a2 = Math.max(0, N - 60); a2 < N - 30; a2++) if (act[a2]) lastM++;
    var months = [], mi = 0; for (mi = 0; mi * 30 < N; mi++) { var on = 0, dd = 0; for (var mj = mi * 30; mj < Math.min(N, mi * 30 + 30); mj++) { dd++; if (act[mj]) on++; } months.push(dd ? on / dd : 0); }
    var wd = [0, 0, 0, 0, 0, 0, 0], wc = [0, 0, 0, 0, 0, 0, 0]; for (var w1 = 0; w1 < N; w1++) { var dw = w1 % 7; wc[dw]++; if (act[w1]) wd[dw]++; }
    var wdRate = wd.map(function (v, i2) { return wc[i2] ? v / wc[i2] : 0; });
    var gap = 0, longestGap = 0, comebacks = 0, prev = false; for (var g1 = 0; g1 < N; g1++) { if (act[g1]) { if (!prev && g1 > 0) comebacks++; gap = 0; } else { gap++; if (gap > longestGap) longestGap = gap; } prev = act[g1]; }
    var roll = []; for (var rs = Math.max(0, N - 30); rs < N; rs++) { var rl = 0, rw = 0; for (var rj = Math.max(0, rs - 6); rj <= rs; rj++) { rw++; if (act[rj]) rl++; } roll.push(rl / rw); }
    var d = new Date(2026, 7, 12); d.setDate(d.getDate() - N);
    return {
      N: N, total: total, missed: N - total, rate: win ? lo / win : 0, rateAll: N ? total / N : 0,
      streak: streak, longest: longest, thisM: thisM, lastM: lastM, delta: thisM - lastM,
      months: months, bestMonth: months.length ? Math.max.apply(null, months) : 0, wdRate: wdRate,
      longestGap: longestGap, comebacks: comebacks, roll: roll,
      deep: Math.round(total * 0.55), refl: Math.round(total * 0.4), chk: Math.round(total * 0.7),
      since: MON[d.getMonth()] + ' ' + d.getDate()
    };
  }

  function pct(v) { return Math.round(v * 100) + '%'; }
  function sgn(v) { return (v >= 0 ? '+' : '') + v; }
  function spark(vals, w, h) {
    if (!vals.length) vals = [0];
    var pts = vals.map(function (v, i) { return (vals.length === 1 ? 0 : (i / (vals.length - 1)) * w).toFixed(1) + ',' + (h - v * h).toFixed(1); }).join(' ');
    return '<svg class="nf-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline points="' + pts + '"/></svg>';
  }
  function bars(vals) { return '<div class="nf-bars">' + vals.map(function (v, i) { return '<i style="height:' + Math.max(6, v * 100) + '%"' + (v === Math.max.apply(null, vals) ? ' class="hi"' : '') + '></i>'; }).join('') + '</div>'; }
  function ledger(pairs) { return '<div class="nf-ledger">' + pairs.map(function (p) { return '<div class="nf-row"><span>' + p[0] + '</span><b>' + p[1] + '</b></div>'; }).join('') + '</div>'; }
  function tile(n, l, extra) { return '<div class="nf-tile"><b>' + n + '</b><span>' + l + '</span>' + (extra || '') + '</div>'; }

  var WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  var NUM = [
    /* ---------------- A. EDITORIAL STAT SHEET ---------------- */
    { fam: 'Stat sheet', name: 'A1 · The ledger', fn: function (s) {
      return '<div class="nf-hero"><div class="nf-num">' + s.total + '</div><div class="nf-subn">days shown up · since ' + s.since + '</div></div>' +
        ledger([['Current streak', s.streak], ['Longest run', s.longest], ['Rate, last 30 days', pct(s.rate)], ['Rate since day one', pct(s.rateAll)], ['This month vs last', sgn(s.delta)], ['Days missed', s.missed], ['Longest gap', s.longestGap + 'd'], ['Comebacks', s.comebacks]]);
    } },
    { fam: 'Stat sheet', name: 'A2 · Two columns', fn: function (s) {
      var pairs = [['Shown up', s.total], ['Missed', s.missed], ['Streak', s.streak], ['Best run', s.longest], ['Lately', pct(s.rate)], ['All time', pct(s.rateAll)], ['This month', s.thisM], ['Last month', s.lastM], ['Longest gap', s.longestGap + 'd'], ['Comebacks', s.comebacks]];
      var cells = pairs.map(function (p) { return '<div class="nf-c"><b>' + p[1] + '</b><span>' + p[0] + '</span></div>'; }).join('');
      return '<div class="nf-hero sm"><div class="nf-num">' + s.total + '<em>/' + s.N + '</em></div><div class="nf-subn">days kept, since ' + s.since + '</div></div><div class="nf-grid2">' + cells + '</div>';
    } },
    { fam: 'Stat sheet', name: 'A3 · Box score', fn: function (s) {
      function col(t, rows) { return '<div class="nf-col"><div class="nf-colh">' + t + '</div>' + rows.map(function (r) { return '<div class="nf-crow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>'; }
      return '<div class="nf-mast">The record<span>' + s.N + ' days · ' + pct(s.rateAll) + ' shown up</span></div>' +
        '<div class="nf-cols">' + col('Runs', [['Current', s.streak], ['Longest', s.longest], ['Comebacks', s.comebacks]]) + col('Recent', [['This mo', s.thisM], ['Last mo', s.lastM], ['Change', sgn(s.delta)]]) + '</div>' +
        col('Around the work', [['Deep work', s.deep], ['Reflections', s.refl], ['Check-ins', s.chk]]);
    } },
    { fam: 'Stat sheet', name: 'A4 · Annotated', fn: function (s) {
      return '<div class="nf-annot"><div class="nf-num xl">' + s.total + '</div>' +
        '<div class="nf-cal nf-cal--tr">' + pct(s.rate) + ' lately</div>' +
        '<div class="nf-cal nf-cal--bl">' + s.streak + '-day streak</div>' +
        '<div class="nf-cal nf-cal--br">best ' + s.longest + '</div></div>' +
        '<div class="nf-subn ctr">days shown up of ' + s.N + ' · since ' + s.since + '</div>' +
        ledger([['Missed', s.missed], ['Longest gap', s.longestGap + 'd'], ['This month vs last', sgn(s.delta)]]);
    } },
    { fam: 'Stat sheet', name: 'A5 · Statement', fn: function (s) {
      var rows = [['01', 'Days on the record', s.N], ['02', 'Days shown up', s.total], ['03', 'Days missed', s.missed], ['04', 'Show-up rate', pct(s.rateAll)], ['05', 'Current streak', s.streak], ['06', 'Longest run', s.longest], ['07', 'One miss every', (s.missed ? (s.N / s.missed).toFixed(1) : '—') + ' d']];
      return '<div class="nf-stmt-h">Consistency statement<span>as of ' + s.since + ' + ' + s.N + ' days</span></div>' +
        '<div class="nf-stmt">' + rows.map(function (r) { return '<div class="nf-srow"><i>' + r[0] + '</i><span>' + r[1] + '</span><b>' + r[2] + '</b></div>'; }).join('') + '</div>';
    } },

    /* ---------------- B. DASHBOARD TILES ---------------- */
    { fam: 'Dashboard', name: 'B1 · Four tiles', fn: function (s) {
      return '<div class="nf-tiles t2">' +
        tile(s.total, 'days shown up', spark(s.roll, 90, 26)) +
        tile(pct(s.rate), 'lately', spark(s.roll, 90, 26)) +
        tile(s.streak, 'day streak', bars(s.wdRate)) +
        tile(s.longest, 'best run', bars(s.months.slice(-6))) + '</div>';
    } },
    { fam: 'Dashboard', name: 'B2 · Bento', fn: function (s) {
      return '<div class="nf-bento">' +
        '<div class="nf-tile big"><b>' + s.total + '</b><span>days shown up of ' + s.N + '</span>' + spark(s.roll, 190, 34) + '</div>' +
        tile(pct(s.rate), 'lately') + tile(s.streak, 'streak') + tile(s.longest, 'best') + tile(s.missed, 'missed') + '</div>';
    } },
    { fam: 'Dashboard', name: 'B3 · Row + chart', fn: function (s) {
      return '<div class="nf-tiles t3">' + tile(s.total, 'shown up') + tile(pct(s.rate), 'lately') + tile(s.streak, 'streak') + '</div>' +
        '<div class="nf-tile wide"><span>Last 30 days</span>' + spark(s.roll, 260, 44) + '</div>';
    } },
    { fam: 'Dashboard', name: 'B4 · Deltas', fn: function (s) {
      function dt(n, l, delta) { return '<div class="nf-tile"><b>' + n + '</b><span>' + l + '</span><i class="nf-chip ' + (delta >= 0 ? 'up' : 'dn') + '">' + sgn(delta) + '</i></div>'; }
      return '<div class="nf-tiles t2">' + dt(s.thisM, 'this month', s.delta) + dt(pct(s.rate), 'rate', Math.round((s.rate - s.rateAll) * 100)) +
        tile(s.streak, 'streak') + tile(s.total, 'all time') + '</div>';
    } },
    { fam: 'Dashboard', name: 'B5 · Dense grid', fn: function (s) {
      var d = [[s.total, 'shown up'], [s.missed, 'missed'], [pct(s.rate), 'lately'], [s.streak, 'streak'], [s.longest, 'best'], [pct(s.rateAll), 'all time']];
      return '<div class="nf-tiles t3 dense">' + d.map(function (x) { return tile(x[0], x[1]); }).join('') + '</div>' + '<div class="nf-tile wide slim"><span>Rhythm · Mon to Sun</span>' + bars(s.wdRate) + '</div>';
    } },

    /* ---------------- C. HEADLINE SENTENCE ---------------- */
    { fam: 'Headline', name: 'C1 · One line', fn: function (s) {
      return '<div class="nf-head">You’ve shown up <b>' + s.total + '</b> of <b>' + s.N + '</b> days.</div><div class="nf-headsub"><b>' + pct(s.rate) + '</b> lately. Best run <b>' + s.longest + '</b>.</div>';
    } },
    { fam: 'Headline', name: 'C2 · Stacked', fn: function (s) {
      return '<div class="nf-stack"><div><b>' + s.total + '</b> days shown up</div><div><b>' + pct(s.rate) + '</b> lately</div><div><b>' + s.streak + '</b> day streak</div><div><b>' + s.longest + '</b> your best</div></div>';
    } },
    { fam: 'Headline', name: 'C3 · Paragraph', fn: function (s) {
      return '<div class="nf-para">Since ' + s.since + ' you’ve kept this <b>' + s.total + '</b> times, missed <b>' + s.missed + '</b>, and strung together as many as <b>' + s.longest + '</b> in a row. Right now you’re <b>' + s.streak + '</b> deep and showing up <b>' + pct(s.rate) + '</b> of the time.</div>';
    } },
    { fam: 'Headline', name: 'C4 · Fill-in', fn: function (s) {
      return '<div class="nf-fill"><p>Shown up <b>' + s.total + '</b> days.</p><p>On a <b>' + s.streak + '</b>-day run.</p><p>Missed <b>' + s.missed + '</b>.</p><p><b>' + pct(s.rate) + '</b> lately.</p></div>';
    } },
    { fam: 'Headline', name: 'C5 · Quiet', fn: function (s) {
      return '<div class="nf-quiet"><div class="nf-qbig">You have kept this<br><b>' + s.total + '</b> times.</div><div class="nf-qsub">' + s.streak + ' in a row right now. ' + pct(s.rate) + ' lately.</div></div>';
    } },

    /* ---------------- D. SCOREBOARD ---------------- */
    { fam: 'Scoreboard', name: 'D1 · Three across', fn: function (s) {
      return '<div class="nf-score s3"><div><b>' + s.total + '</b><span>shown up</span></div><div><b>' + pct(s.rate) + '</b><span>lately</span></div><div><b>' + s.longest + '</b><span>best run</span></div></div>';
    } },
    { fam: 'Scoreboard', name: 'D2 · Two stacked', fn: function (s) {
      return '<div class="nf-score s2v"><div><b>' + s.streak + '</b><span>day streak, right now</span></div><div><b>' + s.total + '</b><span>days shown up in all</span></div></div>';
    } },
    { fam: 'Scoreboard', name: 'D3 · Quad', fn: function (s) {
      return '<div class="nf-score s4"><div><b>' + s.total + '</b><span>shown up</span></div><div><b>' + s.streak + '</b><span>streak</span></div><div><b>' + s.longest + '</b><span>best</span></div><div><b>' + pct(s.rate) + '</b><span>lately</span></div></div>';
    } },
    { fam: 'Scoreboard', name: 'D4 · Dominant', fn: function (s) {
      return '<div class="nf-dom"><div class="nf-domnum">' + s.total + '</div><div class="nf-domlbl">days shown up</div><div class="nf-domside"><div><b>' + s.streak + '</b><span>streak</span></div><div><b>' + pct(s.rate) + '</b><span>lately</span></div></div></div>';
    } },
    { fam: 'Scoreboard', name: 'D5 · Strip', fn: function (s) {
      return '<div class="nf-strip"><div><b>' + s.total + '</b><span>days</span></div><i></i><div><b>' + s.streak + '</b><span>streak</span></div><i></i><div><b>' + s.longest + '</b><span>best</span></div><i></i><div><b>' + pct(s.rate) + '</b><span>lately</span></div></div>';
    } }
  ];

  var wrap = document.getElementById('numLab');
  if (!wrap) return;
  var st = document.createElement('style');
  st.textContent =
    '.nf-controls{position:sticky;top:0;z-index:20;background:rgba(6,7,10,.92);backdrop-filter:blur(14px);padding:14px 2px 12px;margin:0 0 20px;border-bottom:1px solid var(--hairline)}' +
    '.nf-slrow{display:flex;align-items:center;gap:16px;flex-wrap:wrap}' +
    '.nf-slrow input[type=range]{flex:1;min-width:220px;accent-color:#3fd94e;height:4px}' +
    '.nf-day{font-size:15px;font-weight:750;color:var(--text-hi);min-width:96px;font-variant-numeric:tabular-nums}' +
    '.nf-chips{display:flex;gap:6px}.nf-chips button{font:inherit;font-size:12px;font-weight:600;color:var(--text-mid);background:var(--surface-1,rgba(255,255,255,.04));border:0;border-radius:7px;padding:6px 11px;cursor:pointer}' +
    '.nf-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}@media(max-width:720px){.nf-grid{grid-template-columns:1fr}}' +
    '.nf-fam{grid-column:1/-1;font-size:13px;font-weight:700;color:var(--text-hi);margin:14px 0 -4px}' +
    '.nf-card{background:var(--surface-0,#040405);border-radius:16px;padding:22px 20px;min-height:300px;display:flex;flex-direction:column}' +
    '.nf-card__n{font-size:12px;color:var(--text-lo);margin-top:12px}' +
    '.nf-card__b{flex:1;display:flex;flex-direction:column;justify-content:center}' +
    /* numerals + type */
    '.nf-card b,.nf-num,.nf-tile b{font-variant-numeric:tabular-nums;letter-spacing:-.02em}' +
    '.nf-hero{margin-bottom:14px}.nf-hero.sm{margin-bottom:10px}' +
    '.nf-num{font-size:64px;font-weight:800;color:#f4fff7;line-height:.9;letter-spacing:-.04em}' +
    '.nf-num.xl{font-size:92px}.nf-num em{font-size:.42em;font-style:normal;color:var(--text-lo);font-weight:600;letter-spacing:-.02em}' +
    '.nf-subn{font-size:13px;color:var(--text-mid);margin-top:8px}.nf-subn.ctr{text-align:center}' +
    '.nf-ledger{border-top:1px solid var(--hairline)}' +
    '.nf-row{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--hairline)}' +
    '.nf-row span{font-size:13px;color:var(--text-mid)}.nf-row b{font-size:15px;font-weight:700;color:var(--text-hi)}' +
    '.nf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--hairline);border:1px solid var(--hairline);border-radius:10px;overflow:hidden}' +
    '.nf-c{background:var(--surface-0,#040405);padding:11px 13px}.nf-c b{display:block;font-size:20px;font-weight:750;color:#f4fff7}.nf-c span{font-size:11px;color:var(--text-lo)}' +
    '.nf-mast{font-size:20px;font-weight:800;color:#f4fff7;padding-bottom:10px;border-bottom:2px solid rgba(' + G + ',.5);margin-bottom:12px}.nf-mast span{display:block;font-size:12px;font-weight:500;color:var(--text-mid);margin-top:4px}' +
    '.nf-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px}' +
    '.nf-colh{font-size:12px;font-weight:700;color:var(--text-hi);margin-bottom:6px}.nf-crow{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--hairline)}.nf-crow span{font-size:12px;color:var(--text-mid)}.nf-crow b{font-size:13px;color:var(--text-hi)}' +
    '.nf-annot{position:relative;text-align:center;padding:14px 0 20px}.nf-cal{position:absolute;font-size:12px;font-weight:600;color:rgb(' + G + ')}.nf-cal--tr{top:6px;right:0}.nf-cal--bl{bottom:0;left:0;color:var(--text-mid)}.nf-cal--br{bottom:0;right:0;color:var(--text-mid)}' +
    '.nf-stmt-h{font-size:14px;font-weight:700;color:var(--text-hi);margin-bottom:10px}.nf-stmt-h span{display:block;font-size:11px;font-weight:500;color:var(--text-lo);margin-top:3px}' +
    '.nf-srow{display:grid;grid-template-columns:26px 1fr auto;gap:8px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--hairline)}.nf-srow i{font-style:normal;font-size:11px;color:var(--text-lo)}.nf-srow span{font-size:13px;color:var(--text-mid)}.nf-srow b{font-size:15px;font-weight:700;color:var(--text-hi)}' +
    /* tiles */
    '.nf-tiles{display:grid;gap:9px}.nf-tiles.t2{grid-template-columns:1fr 1fr}.nf-tiles.t3{grid-template-columns:1fr 1fr 1fr}.nf-tiles.dense .nf-tile{padding:11px}' +
    '.nf-tile{background:rgba(255,255,255,.035);border-radius:12px;padding:14px 15px;position:relative;overflow:hidden}' +
    '.nf-tile b{display:block;font-size:26px;font-weight:780;color:#f4fff7;line-height:1}.nf-tile span{font-size:11.5px;color:var(--text-lo);display:block;margin-top:3px}' +
    '.nf-tile.big b{font-size:44px}.nf-tile.wide{margin-top:9px}.nf-tile.wide.slim{padding:12px 15px}' +
    '.nf-bento{display:grid;grid-template-columns:1fr 1fr;gap:9px}.nf-bento .big{grid-column:1/-1}' +
    '.nf-chip{position:absolute;top:13px;right:13px;font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px}.nf-chip.up{color:#06140a;background:rgb(' + G + ')}.nf-chip.dn{color:var(--text-mid);background:rgba(255,255,255,.06)}' +
    '.nf-spark{display:block;width:100%;height:30px;margin-top:8px;overflow:visible}.nf-spark polyline{fill:none;stroke:rgb(' + G + ');stroke-width:2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}' +
    '.nf-bars{display:flex;align-items:flex-end;gap:3px;height:30px;margin-top:8px}.nf-bars i{flex:1;background:rgba(' + G + ',.32);border-radius:2px}.nf-bars i.hi{background:rgb(' + G + ')}' +
    /* headline */
    '.nf-head{font-size:30px;font-weight:730;color:var(--text-hi);line-height:1.18;letter-spacing:-.02em}.nf-head b{color:#f4fff7;font-weight:820}' +
    '.nf-headsub{font-size:18px;color:var(--text-mid);margin-top:14px;line-height:1.4}.nf-headsub b{color:rgb(' + G + ');font-weight:750}' +
    '.nf-stack div{font-size:22px;color:var(--text-mid);padding:7px 0;font-weight:500}.nf-stack b{font-size:38px;color:#f4fff7;font-weight:800;margin-right:8px;letter-spacing:-.03em}' +
    '.nf-para{font-size:19px;line-height:1.55;color:var(--text-mid);font-weight:500}.nf-para b{color:#f4fff7;font-weight:800;font-size:1.35em;letter-spacing:-.02em}' +
    '.nf-fill p{font-size:23px;color:var(--text-mid);margin:6px 0;font-weight:500}.nf-fill b{color:#f4fff7;font-weight:800;font-size:1.15em}' +
    '.nf-quiet{text-align:center}.nf-qbig{font-size:27px;font-weight:650;color:var(--text-hi);line-height:1.3}.nf-qbig b{font-size:58px;font-weight:820;color:#f4fff7;display:inline-block;margin-top:6px;letter-spacing:-.03em}.nf-qsub{font-size:14px;color:var(--text-lo);margin-top:16px}' +
    /* scoreboard */
    '.nf-score{display:grid;gap:10px;text-align:center}.nf-score.s3{grid-template-columns:repeat(3,1fr)}.nf-score.s4{grid-template-columns:repeat(2,1fr);gap:24px 10px}.nf-score.s2v{grid-template-columns:1fr;gap:26px}' +
    '.nf-score b{display:block;font-size:52px;font-weight:820;color:#f4fff7;line-height:.92;letter-spacing:-.03em}.nf-score.s2v b{font-size:72px}.nf-score span{font-size:12px;color:var(--text-lo);margin-top:6px;display:block}' +
    '.nf-dom{text-align:center}.nf-domnum{font-size:104px;font-weight:850;color:#f4fff7;line-height:.85;letter-spacing:-.05em}.nf-domlbl{font-size:14px;color:var(--text-mid);margin-top:8px}.nf-domside{display:flex;justify-content:center;gap:44px;margin-top:22px}.nf-domside b{display:block;font-size:30px;font-weight:800;color:rgb(' + G + ')}.nf-domside span{font-size:11px;color:var(--text-lo)}' +
    '.nf-strip{display:flex;align-items:center;justify-content:center;gap:14px}.nf-strip>div{text-align:center}.nf-strip b{display:block;font-size:34px;font-weight:820;color:#f4fff7;line-height:1;letter-spacing:-.03em}.nf-strip span{font-size:10.5px;color:var(--text-lo)}.nf-strip i{width:1px;height:34px;background:var(--hairline)}';
  document.head.appendChild(st);

  var controls = document.createElement('div'); controls.className = 'nf-controls';
  controls.innerHTML = '<div class="nf-slrow"><span class="nf-day" id="nfDay">Day 168</span><input type="range" id="nfSlider" min="0" max="365" value="168"><div class="nf-chips" id="nfChips">' + ['1', '7', '30', '90', '168', '365'].map(function (v) { return '<button data-d="' + v + '">Day ' + v + '</button>'; }).join('') + '</div></div>';
  wrap.appendChild(controls);
  var grid = document.createElement('div'); grid.className = 'nf-grid'; wrap.appendChild(grid);

  var cards = [];
  var lastFam = '';
  NUM.forEach(function (t) {
    if (t.fam !== lastFam) { var head = document.createElement('div'); head.className = 'nf-fam'; head.textContent = t.fam; grid.appendChild(head); lastFam = t.fam; }
    var card = document.createElement('div'); card.className = 'nf-card';
    var body = document.createElement('div'); body.className = 'nf-card__b';
    var cap = document.createElement('div'); cap.className = 'nf-card__n'; cap.textContent = t.name;
    card.appendChild(body); card.appendChild(cap); grid.appendChild(card);
    cards.push({ body: body, fn: t.fn });
  });

  var DAY = 168;
  function paint() {
    var s = stats(DAY);
    document.getElementById('nfDay').textContent = 'Day ' + DAY;
    cards.forEach(function (o) { try { o.body.innerHTML = o.fn(s); } catch (e) { o.body.textContent = 'err'; } });
  }
  document.getElementById('nfSlider').addEventListener('input', function () { DAY = +this.value; paint(); });
  document.getElementById('nfChips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; DAY = +b.getAttribute('data-d'); document.getElementById('nfSlider').value = DAY; paint(); });
  paint();
})();
