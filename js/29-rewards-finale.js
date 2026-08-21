// ============================================================================
// THE GRAND FINALE (THE MERGE, rewards phase 3, 2026-08-20)
//
// ba-0. The top of the pyramid: it fires ONCE per goal, the day the goal
// itself is done, it outranks the milestone and the daily, and nothing else
// shows that day. Three beats: the M colouring in as their moves spiral into
// it, the flood with the fireworks and their own goal line, then the record
// (a turning sphere of their moves, the numbers, and a note). Silent, tap to
// advance, swipe the stats, Keep to close.
//
// PORT LAW. The screen and its applier are the graded mockups:
//   markup   -> mockups/celebrate/frag/ba-0.html (the <div class="st"> body)
//   styles   -> the same file's <style> block, now css/rewards-finale.css
//   applier  -> SPECS['ba-0'] in mockups/celebrate/_tweaks.js
//   shared   -> wallData / fitLine / singular / unitFor / buildSphere /
//               wirePager in _tweaks.js, confetti + the beat step in _kit.js
//
// WHAT CHANGED FROM THE GALLERY, and why (the provenance law, MERGE-README 3):
// the rig's ten sliders become ten reads of real state. Nothing is invented,
// nothing is interpolated, and a number the app does not record is DROPPED
// rather than filled in (this is why no screen here prints hours).
//   line     the Neutron Star, their own words, verbatim
//   shape    resolveRewardShape() (the AI's own taxonomy, 6 -> 4)
//   start /  goalProgress.baseline / .current / .unit
//   value
//   days     first logged day of this goal to today, inclusive
//   moves    the per-goal monotonic completed count (state.rewards.counts,
//            the same number the daily page shows) and js/27's own noun
//   streak   consistencyStats().longest, floored by state.streak.bestEver
//   active   the days they actually closed for this goal (the consistency %)
//
// WHO FIRES IT. The referee (js/26) and only the referee. This file never
// decides: armed() is a pure READ of RewardReferee.reachedNow/goalDone that
// says whether decide() would return the finale, and fire() calls decide()
// exactly once when it would. That order matters: calling decide() to find
// out would consume a milestone from the chooser's once-only ledger on every
// day that is not a finale day.
//
// THE RECEIPT COMES FIRST (R10 + the v1149 law). decide() writes
// state.goalDone[hash] inside itself, before returning; this file then
// enriches that receipt with the numbers and the line (MERGE-3 section 4: the
// finished goal's record does not vanish) and flushes, all before a single
// node is created. Fired = witnessed = never re-earned: R3 guards on the
// receipt EXISTING, so a relaunch mid-ceremony lands behind, never ahead, and
// every later completion that day is 'none' (R2).
// ============================================================================
(function () {
  'use strict';

  function S() { try { return (typeof state !== 'undefined') ? state : null; } catch (e) { return null; } }
  function G(name) { try { return window[name]; } catch (e) { return null; } }
  function persist() { try { var p = G('persistNow'); if (p) p(); } catch (e) {} }
  function reduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  function chooser() { try { return window.MilestoneChooser || null; } catch (e) { return null; } }

  // ---------------------------------------------------------------------------
  // HELPERS. Ported verbatim from _tweaks.js.
  // ---------------------------------------------------------------------------
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function esc(s) { var d = document.createElement('i'); d.textContent = s == null ? '' : s; return d.innerHTML; }
  function singular(w) {
    if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
    if (/(ses|xes|zes|ches|shes)$/.test(w)) return w.replace(/es$/, '');
    if (/s$/.test(w) && !/ss$/.test(w)) return w.replace(/s$/, '');
    return w;
  }
  function unitFor(n, unit) {
    unit = String(unit || '').trim();
    if (Math.abs(+n) === 1 && unit) {
      var parts = unit.split(' ');
      var i = unit.indexOf(' of ') > -1 ? 0 : parts.length - 1;
      parts[i] = singular(parts[i]);
      return parts.join(' ');
    }
    return unit;
  }
  function isMoney(unit) { return /^\$|dollar/i.test(String(unit || '').trim()); }
  function seeded(seed) { return function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }
  function Q(root, sel) { return root.querySelector(sel); }
  function put(root, sel, html) { var el = Q(root, sel); if (el) el.innerHTML = html; }

  // A day key ('YYYY-MM-DD') read as a LOCAL date: new Date(key) parses UTC and
  // lands a day early for anyone west of Greenwich (the js/27 trap).
  function dayDate(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!m) return new Date();
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function todayKey() {
    try {
      var f = G('actionDayKey');
      if (f) return f(new Date());
    } catch (e) {}
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayGap(a, b) {
    if (!a || !b) return 0;
    return Math.round((dayDate(b) - dayDate(a)) / 86400000);
  }

  /* the wall's shared arithmetic: every number derived from their own.
     Ported verbatim from _tweaks.js wallData(). */
  function wallData(v) {
    /* hours is NOT a field the app records (verified 2026-08-16), so no
       screen may print it. It is gone from every BIG ASS wall. */
    var C = chooser();
    var days = +v.days, moves = +v.moves, streak = +v.streak || 0;
    var weeks = Math.max(1, Math.round(days / 7));
    var perWeek = moves > 0 ? Math.round(moves / weeks * 10) / 10 : 0;
    var money = isMoney(v.unit);
    var mf = function (n) { return (money ? '$' : '') + fmt(n); };
    var marks = 0;
    try {
      if (v.shape === 'target' && +v.start !== +v.value) marks = C.milestones({ target: +v.value, baseline: +v.start }, +v.value < +v.start ? 'down' : 'up').length;
      else if (v.shape === 'count') marks = C.COUNT_LADDER.filter(function (c) { return c <= +v.value; }).length;
      else marks = Math.floor(days / 7) + Math.floor(days / 30);
    } catch (e) { marks = 0; }
    /* some goals are won with nothing logged at all (an exam passed, a deal
       closed). "0 sittings" is an embarrassing thing to print, so when there
       are no moves the screens fall back to DAYS, number and noun both. */
    var hasMoves = moves > 0;
    var count = hasMoves ? moves : days;
    var noun = hasMoves ? (v.moveWord || 'moves') : 'days';
    return { days: days, moves: moves, streak: streak, weeks: weeks,
      perWeek: hasMoves ? perWeek : 0, money: money, mf: mf, marks: marks,
      hasMoves: hasMoves, count: count, noun: noun, unitLabel: unitFor(count, noun),
      one: singular(noun) };
  }

  /* A goal is whatever they typed. "You lost 30 lbs" is 16 characters and
     "You paid off all $47,000 of your student loans" is 46; at a fixed size
     the long one grows off the phone. The hero line sizes itself to its own
     length and widens its measure, so any sentence lands. Ported from
     _tweaks.js fitLine(); the one change is `avail`, which was the mock
     phone's fixed inner width and is now the element's real one. */
  function fitLine(root, sel, base) {
    var el = Q(root, sel); if (!el) return;
    var n = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
    if (!n) return;
    /* a goal that CAN sit on one line does, even if that means coming down a
       few points; only a sentence too long to hold at a readable size wraps. */
    var avail = Math.max(240, (el.clientWidth || 316) - 22), one = avail / (n * 0.52);
    if (one >= base) {
      el.style.fontSize = base + 'px'; el.style.whiteSpace = 'nowrap'; el.style.maxWidth = 'none'; return;
    }
    if (one >= 26) {
      el.style.fontSize = one.toFixed(1) + 'px'; el.style.whiteSpace = 'nowrap'; el.style.maxWidth = 'none'; return;
    }
    el.style.whiteSpace = 'normal';
    var size = Math.max(17, base * Math.pow(18 / n, 0.5));
    el.style.fontSize = size.toFixed(1) + 'px';
    el.style.maxWidth = (n <= 34 ? 14 : 17) + 'ch';
    /* the one addition: the gallery's line filled its 390px phone, so a
       narrowed measure never had to be re-centred. Here it does, or the goal
       sits off to the left of its own screen. */
    el.style.marginLeft = 'auto'; el.style.marginRight = 'auto';
  }

  // ---------------------------------------------------------------------------
  // THE STATE READ. The ten sliders, as ten reads.
  // ---------------------------------------------------------------------------
  function liveStar() {
    var st = S();
    return (st && st.clarity && st.clarity.answers && st.clarity.answers.neutronStar) || '';
  }
  function liveHash() {
    var C = chooser();
    try { return C ? C.starHash(liveStar()) : ''; } catch (e) { return ''; }
  }
  function goalProgress() {
    try {
      var f = G('ensureGoalTarget');
      if (f) return f();
    } catch (e) {}
    var st = S();
    return (st && st.goalProgress) || null;
  }
  // The days they actually closed for this goal, ascending. Rest days are kept
  // in the log but they are not moves, so they are not counted (js/27's rule,
  // the same records feed both pages).
  function goalDayKeys(hash) {
    var st = S(), recs = (st && st.dayRecords) || {}, out = [];
    Object.keys(recs).forEach(function (k) {
      var r = recs[k];
      if (!r || r.off) return;
      if (hash && r.starHash && r.starHash !== hash) return;
      out.push(k);
    });
    return out.sort();
  }
  // NEVER FALLS: the same monotonic per-goal count the daily page renders, so
  // the two pages can never disagree. Read only, this one does not write.
  function goalCount(hash, logged) {
    var st = S();
    var prev = 0;
    try { prev = +(st && st.rewards && st.rewards.counts && st.rewards.counts[hash || 'nostar']) || 0; } catch (e) {}
    return Math.max(prev, logged);
  }
  // js/27's own noun, so the finale and the daily page speak the same word.
  function moveWordFor(n) {
    var shape = 'target';
    try { shape = (typeof resolveRewardShape === 'function') ? resolveRewardShape() : 'target'; } catch (e) {}
    if (shape === 'duration') return n === 1 ? 'day held' : 'days held';
    if (shape === 'count') return n === 1 ? 'session' : 'sessions';
    return n === 1 ? 'move' : 'moves';
  }
  function bestStreak() {
    var st = S(), longest = 0;
    try {
      var f = G('consistencyStats');
      if (f) longest = +f().longest || 0;
    } catch (e) {}
    try { longest = Math.max(longest, +(st && st.streak && st.streak.bestEver) || 0); } catch (e) {}
    return longest;
  }

  // The finale's data, all of it, from the log. One builder, no fallbacks that
  // invent: a field the app cannot answer comes back 0 and the screen drops it.
  function buildData() {
    var gp = goalProgress() || {};
    var hash = liveHash();
    var hist = Array.isArray(gp.history) ? gp.history : [];
    var dayKeys = goalDayKeys(hash);
    var today = todayKey();
    var first = (hist.length && hist[0].day) || dayKeys[0] || today;
    var moves = goalCount(hash, dayKeys.length);
    var shape = 'target';
    try { shape = (typeof resolveRewardShape === 'function') ? resolveRewardShape() : 'target'; } catch (e) {}
    var hasNums = gp.baseline !== null && gp.baseline !== undefined && isFinite(+gp.baseline)
      && gp.current !== null && gp.current !== undefined && isFinite(+gp.current);
    return {
      shape: shape,
      line: String(liveStar() || '').replace(/\s+/g, ' ').trim(),
      start: hasNums ? +gp.baseline : 0,
      value: hasNums ? +gp.current : 0,
      unit: String(gp.unit || '').trim(),
      // inclusive: the day they started and the day they finished both count
      days: Math.max(1, dayGap(first, today) + 1),
      moves: moves,
      moveWord: moveWordFor(moves),
      streak: bestStreak(),
      active: dayKeys.length,
      hash: hash, firstDay: first, today: today
    };
  }

  // ---------------------------------------------------------------------------
  // THE SCREEN. Markup ported verbatim from frag/ba-0.html. The gallery's
  // "swipe the stats, tap to replay" hint is dropped: in the app the last tap
  // keeps the moment, it never replays.
  // ---------------------------------------------------------------------------
  var M_PATH = 'M150 146 L256 252 L362 146 L362 366 L150 366 Z';
  var M_SVG = function (cls) {
    return '<svg class="' + cls + '" viewBox="0 0 512 512" aria-hidden="true"><path d="' + M_PATH + '"/></svg>';
  };

  var HTML =
    '<div class="b b1">' +
      '<div class="ba0-field" aria-hidden="true"></div>' +
      M_SVG('ba0-m0') +
      '<div class="ba0-guess">Guess what&hellip;</div>' +
      '<div class="ba0-tap">Tap.</div>' +
    '</div>' +

    '<div class="b b2" data-confetti>' +
      '<div class="ba0-flood"></div>' +
      '<canvas class="cel-confetti"></canvas>' +
      '<div class="ba0-fwrap"></div>' +
      '<div class="ba0-sh ba0-s1"></div>' +
      '<div class="ba0-sh ba0-s2"></div>' +
      M_SVG('ba0-m2') +
      '<div class="ba0-line"></div>' +
    '</div>' +

    '<div class="b b3">' +
      '<div class="ba0-stats">' +
        '<div class="ba0-pager">' +
          '<div class="ba0-track">' +
            '<div class="ba0-slide">' +
              '<div class="ba0-orbit">' +
                '<canvas class="ba0-cv" aria-hidden="true"></canvas>' +
                M_SVG('ba0-coreM') +
              '</div>' +
              '<div class="ba0-acount"></div>' +
            '</div>' +
            '<div class="ba0-slide">' +
              M_SVG('ba0-mcB') +
              '<div class="ba0-wall"></div>' +
            '</div>' +
            '<div class="ba0-slide ba0-note">' +
              M_SVG('ba0-noteM') +
              '<div class="ba0-note1">Almost no one sees a goal like this all the way through.</div>' +
              '<div class="ba0-note2">You said you would, and you followed it to the end. That is rare. Be proud of it, seriously.</div>' +
              '<div class="ba0-note3">Remember this one. These are the moments you look back on.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ba0-dots">' +
          '<span class="ba0-dot on"></span><span class="ba0-dot"></span><span class="ba0-dot"></span>' +
        '</div>' +
      '</div>' +
    '</div>';

  // ---------------------------------------------------------------------------
  // THE APPLIER. SPECS['ba-0'].apply from _tweaks.js, verbatim, reading the
  // real data instead of the rig's sliders.
  // ---------------------------------------------------------------------------
  function apply(root, v) {
    var w = wallData(v);
    /* the goal line, centred (the most important thing), one clean line */
    var lineText = (v.line || '').replace(/\s+/g, ' ').trim();
    put(root, '.ba0-line', esc(lineText) + (/[!?.]$/.test(lineText) ? '' : '!'));
    var ln = Q(root, '.ba0-line');
    if (ln) {
      var base = lineText.length > 22 ? 30 : lineText.length > 15 ? 35 : 40;
      ln.style.fontSize = base + 'px';
      // fitLine MEASURES, so it cannot run here: apply() draws into a page
      // that is not in the document yet and every box would read 0. It runs
      // once the page is mounted (fitNow, at the end of render).
      ln.setAttribute('data-base', base);
    }
    /* beat 1: MANY dots stream in from off the card and spiral into the M
       (Clarity's nsv2FieldSpiral motion), slower now so it feels special. */
    var mr = seeded(19), mot = '';
    for (var m = 0; m < 60; m++) {
      var ma = (mr() * 360).toFixed(0), mrad = (210 + mr() * 180).toFixed(0),
          ms = (1.6 + mr() * 2.6).toFixed(1), md = (3.0 + mr() * 1.6).toFixed(2), mdl = (mr() * 1.2).toFixed(2);
      mot += '<i style="--a:' + ma + 'deg;--r:' + mrad + 'px;--s:' + ms + 'px;--d:' + md + 's;--del:' + mdl + 's"></i>';
    }
    put(root, '.ba0-field', mot);
    /* THE SHOW (beat 2): a lot of fireworks that keep going off for ~9s.
       ~20 bursts staggered across the screen, framing the M and line (a top
       band and a bottom band, clear of the middle where the text is). No
       count text on this page. */
    var fwr = seeded(53), shows = '';
    var BURSTS = 20;
    for (var f = 0; f < BURSTS; f++) {
      var top = f % 2 === 0;                                  // alternate top / bottom band
      var fx = (10 + fwr() * 80).toFixed(1);
      var fy = top ? (10 + fwr() * 30).toFixed(1) : (68 + fwr() * 22).toFixed(1);
      var t = (fwr() * 8.5).toFixed(2);                       // when it goes off, 0..8.5s
      var reach = 44 + fwr() * 40, flash = (reach * 1.5).toFixed(0), np = 20;
      var body = '<i class="tr" style="--h:' + (90 + fwr() * 70).toFixed(0) + 'px;--lh:' + (150 + fwr() * 90).toFixed(0) + 'px"></i>' +
                 '<em class="fl" style="--fs:' + flash + 'px"></em>';
      for (var q = 0; q < np; q++) {
        var a = (q / np) * 6.2832 + fwr() * 0.22, rr = reach * (0.6 + fwr() * 0.55);
        body += '<i class="sp" style="--dx:' + (Math.cos(a) * rr).toFixed(0) + 'px;--dy:' + (Math.sin(a) * rr).toFixed(0) + 'px"></i>';
      }
      shows += '<div class="ba0-fw" style="left:' + fx + '%;top:' + fy + '%;--t:' + t + 's">' + body + '</div>';
    }
    var fwrap = Q(root, '.ba0-fwrap'); if (fwrap) fwrap.innerHTML = shows;
    /* stat view A: a slowly turning 3D sphere of their moves, one point each,
       drifting a little so it feels alive (Malik 2026-08-16) */
    buildSphere(root, Math.max(1, w.count));
    var totalLabel = (w.hasMoves ? 'total ' : '') + w.unitLabel;
    put(root, '.ba0-acount', '<b>' + fmt(w.count) + '</b><span>' + esc(totalLabel) + '</span>');
    /* stat view B: the numbers. The two that actually say "you CHANGED" lead
       (Malik 2026-08-16): the transformation (from -> to) and the consistency
       (days you showed up). The rest is volume. */
    var cells = [];
    var isT = (v.shape === 'target' && +v.start !== +v.value);
    var down = false, delta = 0;
    if (isT) {
      down = +v.value < +v.start; delta = Math.abs(+v.start - +v.value);
      var verb = down ? (w.money ? 'paid off' : 'down') : 'gained';
      var span = (w.money && down) ? (w.mf(delta) + ' paid off')
                                   : (w.mf(delta) + ' ' + esc(v.unit) + ' ' + verb);
      cells.push(['<b class="ba0-xform">' + w.mf(+v.start) + ' &rarr; ' + w.mf(+v.value) + '</b><span>' + span + '</span>', 'ba0-cell--hero']);
      cells.push(['<b>' + fmt(w.count) + '</b><span>' + esc(totalLabel) + '</span>', '']);
    } else {
      cells.push(['<b>' + fmt(w.count) + '</b><span>' + esc(totalLabel) + '</span>', 'ba0-cell--hero']);
    }
    /* consistency: what share of the days they actually showed up */
    var active = Math.max(0, Math.min(+v.active || 0, w.days));
    var pct = w.days > 0 ? Math.round(active / w.days * 100) : 0;
    cells.push(['<b>' + pct + '%</b><span>of ' + fmt(w.days) + ' days, showed up</span>', '']);
    if (w.hasMoves) cells.push(['<b>' + fmt(w.days) + '</b><span>' + plural(w.days, 'day', 'days') + ' start to finish</span>', '']);
    else cells.push(['<b>' + fmt(w.days) + '</b><span>days it took</span>', '']);
    if (w.streak > 0) cells.push(['<b>' + fmt(w.streak) + '</b><span>day best streak</span>', '']);
    /* pace: how fast they moved. For a target goal that is progress TOWARD it
       (per week); otherwise it is their volume per week. */
    if (isT && w.weeks > 0) {
      var pace = delta / w.weeks;
      var paceStr = w.money ? w.mf(Math.round(pace)) : fmt(Math.round(pace * 10) / 10);
      cells.push(['<b>' + paceStr + '</b><span>' + (w.money ? '' : esc(v.unit) + ' ') + 'a week' + (down ? ', toward it' : '') + '</span>', '']);
    } else if (w.perWeek > 0) {
      cells.push(['<b>' + fmt(w.perWeek) + '</b><span>' + esc(unitFor(2, w.noun)) + ' a week</span>', '']);
    }
    /* milestones cleared on the way (the chooser's real marks) */
    if (w.marks > 1) cells.push(['<b>' + fmt(w.marks) + '</b><span>milestones passed</span>', '']);
    put(root, '.ba0-wall', cells.map(function (c) { return '<div class="ba0-cell ' + c[1] + '">' + c[0] + '</div>'; }).join(''));
    return w;
  }

  // ---------------------------------------------------------------------------
  // SLIDE A's SPHERE. _tweaks.js buildSphere(), verbatim, except the loop dies
  // with the overlay instead of running one per gallery phone forever (the
  // hidden-animations law: nothing may hold a GPU layer after the moment).
  // ---------------------------------------------------------------------------
  function buildSphere(root, n) {
    var pts = [], off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5)), rnd = seeded(n * 31 + 7);
    for (var i = 0; i < n; i++) {
      var y = i * off - 1 + off / 2, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * inc;
      pts.push({ x: Math.cos(phi) * r, y: y, z: Math.sin(phi) * r,
        w: (i % 6 === 0), ph: rnd() * 6.2832, amp: 0.012 + rnd() * 0.03 });
    }
    root._sphere = pts;
    if (root._sphereLoop) return;
    root._sphereLoop = true;
    var ang = 0, tilt = 0, fr = 0, born = 0, wasOn = false;
    (function tick() {
      // dies with the page. The check waits for the mount, because apply()
      // builds this before the page is in the document.
      if (root._mounted && !root.isConnected) { root._sphereLoop = false; return; }
      requestAnimationFrame(tick);
      var b3 = root.querySelector('.b3.on');
      if (!b3) { wasOn = false; return; }
      /* the moves EXPLODE out of the M: each time beat 3 opens, restart the
         expansion so the dots fly from the centre (on the M) out to the sphere */
      if (!wasOn) { wasOn = true; born = fr; }
      var cv = root.querySelector('.ba0-cv'); if (!cv) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cw = cv.clientWidth || 280, chh = cv.clientHeight || 300;
      if (cv.width !== (cw * dpr | 0)) { cv.width = cw * dpr; cv.height = chh * dpr; }
      var ctx = cv.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, chh);
      ang += 0.006; tilt = Math.sin(fr * 0.004) * 0.35; fr++;
      var e = Math.min(1, (fr - born) / 48), exp = 1 - Math.pow(1 - e, 3);   // burst-out ease
      var cx = cw / 2, cy = chh / 2, R = (Math.min(cx, cy) - 10) * exp;
      var ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt);
      var P = root._sphere, L = P.length, big = L > 900 ? 0.55 : L > 380 ? 0.72 : 1;
      for (var k = 0; k < L; k++) {
        var p = P[k], rr = 1 + Math.sin(fr * 0.02 + p.ph) * p.amp;
        var x = p.x * rr, y = p.y * rr, z = p.z * rr;
        var x1 = x * ca - z * sa, z1 = x * sa + z * ca;          // spin around Y
        var y1 = y * ct - z1 * st, z2 = y * st + z1 * ct;        // gentle tilt
        var depth = (z2 + 1) / 2;                                 // 0 back .. 1 front
        var px = cx + x1 * R, py = cy + y1 * R;
        var sz = (0.7 + depth * 2.1) * big;
        ctx.globalAlpha = 0.25 + depth * 0.72;
        ctx.fillStyle = p.w ? '#ffffff' : 'rgba(11,14,18,0.9)';
        ctx.beginPath(); ctx.arc(px, py, Math.max(0.5, sz), 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    })();
  }

  // ---------------------------------------------------------------------------
  // THE SWIPE. _tweaks.js wirePager(), the graded gesture: the track follows
  // the finger 1:1 and always snaps to a WHOLE page, never rests between.
  // Two things came over from the app's own day pager (js/30, device-proven
  // in v1198), because the gallery never had to survive a thumb on glass:
  //   * a FLICK counts, at the moment of letting go, with the same stale
  //     reading guard (a finger that stopped moving has thrown nothing);
  //   * the release is heard on the WINDOW, so a gesture that leaves the
  //     pager cannot be left half way.
  // The distance threshold stays the mockup's 18%.
  // ---------------------------------------------------------------------------
  var SNAP_AT = 0.18;       // of a slide: past this, the page flips
  var FLICK_V = 0.65;       // px per ms, a throw rather than a drag
  var FLICK_MIN = 28;       // ...that still has to have travelled
  var STALE_MS = 90;        // a reading older than this is not a throw

  function wirePager(root) {
    if (root._pagerWired) return; root._pagerWired = true;
    var sx = 0, sy = 0, drag = false, dx = 0, base = 0, pw = 1, horiz = false;
    var vx = 0, lastX = 0, lastT = 0, id = null;
    function slideN() { var d = root.querySelectorAll('.ba0-dot').length; return d || 2; }
    function stepPct() { return 100 / slideN(); }
    function setDots() {
      [].forEach.call(root.querySelectorAll('.ba0-dot'), function (d, k) { d.classList.toggle('on', k === root._page); });
    }
    /* ALWAYS snap to a whole page: transform is page * -step, never a partial */
    function pageTo(i, anim) {
      var track = root.querySelector('.ba0-track'); if (!track) return;
      root._page = Math.max(0, Math.min(slideN() - 1, i));
      track.style.transition = (anim === false) ? 'none' : '';
      track.style.transform = 'translateX(' + (root._page * -stepPct()) + '%)';
      setDots();
    }
    root.addEventListener('pointerdown', function (e) {
      var pg = e.target.closest && e.target.closest('.ba0-pager');
      if (!pg) return;
      drag = true; horiz = false; dx = 0; vx = 0; id = e.pointerId;
      sx = e.clientX; sy = e.clientY; lastX = e.clientX; lastT = Date.now();
      pw = pg.getBoundingClientRect().width || 1;
      base = -(root._page || 0) * stepPct();
    });
    root.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== id) return;
      var mx = e.clientX - sx, my = e.clientY - sy;
      if (!horiz) {
        if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
        horiz = Math.abs(mx) > Math.abs(my);
        if (!horiz) { drag = false; return; }   // a vertical move: let the page scroll
      }
      var now = Date.now(), dt = now - lastT;
      if (dt > 0) vx = (e.clientX - lastX) / dt;
      lastX = e.clientX; lastT = now;
      dx = mx;
      var track = root.querySelector('.ba0-track'); if (!track) return;
      var pct = base + (mx / pw) * stepPct();
      pct = Math.max(-(slideN() - 1) * stepPct(), Math.min(0, pct));   // rubber-stop at the ends
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + pct + '%)';
      if (e.cancelable) e.preventDefault();
    });
    function end(e) {
      if (!drag || (e && e.pointerId !== id)) return;
      drag = false;
      if (!horiz) return;
      if (Date.now() - lastT > STALE_MS) vx = 0;
      /* snap to the NEAREST page: past ~18% of a slide flips, so does a flick;
         anything less springs back. It never rests between. */
      var cur = root._page || 0, target = cur;
      var flick = Math.abs(vx) >= FLICK_V && Math.abs(dx) >= FLICK_MIN;
      if (dx < -pw * SNAP_AT || (flick && vx < 0)) target = cur + 1;
      else if (dx > pw * SNAP_AT || (flick && vx > 0)) target = cur - 1;
      pageTo(target, true);
      if (Math.abs(dx) > 8) { root._pagerJustSwiped = true; setTimeout(function () { root._pagerJustSwiped = false; }, 350); }
      dx = 0;
    }
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    window.addEventListener('pointerup', end);          // a release off the pager still lands
    root._pagerRelease = end;
    root.addEventListener('click', function (e) {
      var d = e.target.closest && e.target.closest('.ba0-dot');
      if (d) {
        var dd = [].indexOf.call(root.querySelectorAll('.ba0-dot'), d);
        pageTo(dd, true); e.stopPropagation(); return;
      }
      if (root._pagerJustSwiped) { e.stopPropagation(); }
    }, true);
    root._page = 0;
  }

  // ---------------------------------------------------------------------------
  // THE CONFETTI. _kit.js confetti(), tinted to their Memento colour, at
  // ba-0's own data-cfscale 0.55 (small, falling BEHIND the show). Law 5: it
  // fires only where a beat carries data-confetti, which for this file is the
  // flood and nothing else. Self-kills; skipped under reduced motion.
  // ---------------------------------------------------------------------------
  function confetti(root, host) {
    if (reduced()) return;
    var cv = host.querySelector('.cel-confetti');
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'cel-confetti'; host.appendChild(cv); }
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var cfs = 0.55;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = root.clientWidth, H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rgb = getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim() || '43,212,212';
    var p = rgb.split(',').map(Number);
    function sh(f) { return 'rgb(' + p.map(function (ch) { return Math.round(Math.min(255, ch * f + (f > 1 ? (f - 1) * 140 : 0))); }).join(',') + ')'; }
    /* the flood is the accent itself, so the pieces are the DARK shades plus
       white: the ink reads on every accent, the same rule the flood uses. */
    var colors = [sh(.72), sh(.55), '#ffffff', sh(.86), 'rgba(11,14,18,.72)'];
    var parts = [], t0 = performance.now();
    function burst(ox, oy, count) {
      for (var i = 0; i < count; i++) {
        var ang = Math.random() * Math.PI * 2, sp = 1.6 + Math.random() * 3.2;
        parts.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4,
          g: .02 + Math.random() * .03, size: (4 + Math.random() * 5) * cfs, rot: Math.random() * 6.28,
          vr: (Math.random() - .5) * .18, color: colors[(Math.random() * colors.length) | 0],
          life: 0, max: 150 + Math.random() * 120, shape: Math.random() < .5 ? 'r' : 'c' });
      }
    }
    function rainDrop() {
      if (parts.length > 200) return;
      parts.push({ x: Math.random() * W, y: -12,
        vx: (Math.random() - .5) * .5, vy: .7 + Math.random() * .9,
        g: .004 + Math.random() * .006, size: (4 + Math.random() * 5) * cfs,
        rot: Math.random() * 6.28, vr: (Math.random() - .5) * .14,
        color: colors[(Math.random() * colors.length) | 0],
        life: 0, max: 900, sway: .2 + Math.random() * .5, sp: Math.random() * 6.28,
        shape: Math.random() < .5 ? 'r' : 'c' });
    }
    burst(W * .5, H * .42, 54);
    var ver = (root._cfVer = (root._cfVer || 0) + 1), _frame = 0;
    (function tick() {
      if (root._cfVer !== ver || !cv.isConnected) return;
      ctx.clearRect(0, 0, W, H);
      _frame++;
      var showering = performance.now() - t0 < 30000;
      if (showering && _frame % 13 === 0) rainDrop();
      if (_frame % 400 === 0) parts = parts.filter(function (q) { return q.life <= q.max && q.y < H + 30; });
      var alive = 0;
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i];
        if (q.life > q.max || q.y > H + 24) continue;
        alive++;
        q.life++; q.vy += q.g; q.x += q.vx; q.y += q.vy; q.vx *= .992; q.rot += q.vr;
        if (q.sway) q.x += Math.sin(q.life * .03 + q.sp) * q.sway;
        var a = q.life > q.max - 40 ? (q.max - q.life) / 40 : 1;
        ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = q.color;
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
        if (q.shape === 'r') ctx.fillRect(-q.size / 2, -q.size / 3, q.size, q.size * .66);
        else { ctx.beginPath(); ctx.arc(0, 0, q.size / 2, 0, 6.29); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (!alive && !showering) { ctx.clearRect(0, 0, W, H); return; }
      requestAnimationFrame(tick);
    })();
  }

  // ---------------------------------------------------------------------------
  // THE PAGE. Build on open, destroy on close.
  // ---------------------------------------------------------------------------
  var live = null;

  function destroy() {
    if (!live) return;
    var l = live;
    live = null;
    try { if (l.teardown) l.teardown(); } catch (e) {}
    try { if (l.root && l.root.parentNode) l.root.parentNode.removeChild(l.root); } catch (e) {}
  }

  /* THE HAND-OFF (MERGE-3 section 4). Keep closes the record and lands here:
     one primary action, the next star, and one quiet way out. The finished
     goal stays in state.goalDone either way, it never vanishes. */
  function handOff(root, done) {
    var next = document.createElement('div');
    next.className = 'gfw-next';
    next.innerHTML =
      M_SVG('gfw-next__m') +
      '<h2 class="gfw-next__h">Neutron Star Completed</h2>' +
      '<p class="gfw-next__p">Logged in your Memento. When you’re ready, make the next one and we can keep going.</p>' +
      '<button type="button" class="cn-cta" data-gf-new>Name the next goal</button>' +
      '<button type="button" class="cn-skip" data-gf-later>Not yet</button>';
    root.appendChild(next);
    root.classList.remove('is-done');
    next.addEventListener('click', function (e) { e.stopPropagation(); });
    next.querySelector('[data-gf-new]').addEventListener('click', function () {
      done();
      // Clarity owns the star flow, paywall gate included; nothing here
      // duplicates it.
      try { if (typeof _cpCreateNewStar === 'function') _cpCreateNewStar(); } catch (e) {}
    });
    next.querySelector('[data-gf-later]').addEventListener('click', function () { done(); });
  }

  /* The one render. `res` is the referee's own decide() result, so the receipt
     is already written and flushed by the time anything here draws. */
  function render(res, opts) {
    opts = opts || {};
    if (live) return false;
    var v = opts.data || buildData();

    var root = document.createElement('div');
    root.className = 'gfw';
    root.setAttribute('data-c', 'ba-0');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    var stage = document.createElement('div');
    stage.className = 'gfw-stage';
    stage.innerHTML = HTML;
    root.appendChild(stage);
    var keep = document.createElement('div');
    keep.className = 'keepbtn';
    keep.textContent = 'Keep';
    root.appendChild(keep);

    try { apply(root, v); } catch (e) {}
    wirePager(root);

    var beats = [].slice.call(stage.querySelectorAll('.b'));
    var idx = -1;
    function step() {
      if (idx >= 0 && beats[idx]) beats[idx].classList.remove('on');
      idx++;
      var b = beats[idx];
      if (!b) return;
      b.classList.add('on');
      if (b.hasAttribute('data-confetti')) confetti(root, b);
      if (idx === beats.length - 1) root.classList.add('is-done');
    }

    // Tap advances beats 1 and 2. On the last beat the tap belongs to the
    // pager, so only Keep closes: a tap-to-dismiss there would fight the
    // swipe and throw away the record mid-gesture.
    root.addEventListener('click', function (e) {
      if (root.querySelector('.gfw-next')) return;
      if (idx < beats.length - 1) { step(); return; }
      if (keep.contains(e.target)) handOff(root, dismiss);
    });

    function dismiss() {
      destroy();
      try { if (typeof opts.onDismiss === 'function') opts.onDismiss(); } catch (e) {}
      try { var ra = G('renderAll'); if (ra) ra(); } catch (e) {}
    }

    // Escape and a route change leave with it, like every other fullscreen
    // surface. The receipt is already written, so leaving early loses nothing
    // but the show.
    var escKey = function (e) { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', escKey);
    var pop = function () { dismiss(); };
    window.addEventListener('hashchange', pop);

    live = {
      root: root,
      teardown: function () {
        document.removeEventListener('keydown', escKey);
        window.removeEventListener('hashchange', pop);
        window.removeEventListener('resize', fitNow);
        try { window.removeEventListener('pointerup', root._pagerRelease); } catch (e) {}
      }
    };

    document.body.appendChild(root);
    root._mounted = true;
    // the goal line sizes itself now that it has a box to measure, and again
    // if the window changes shape under it (desktop, rotation)
    var fitNow = function () {
      var ln = Q(root, '.ba0-line');
      if (ln) fitLine(root, '.ba0-line', +ln.getAttribute('data-base') || 40);
    };
    fitNow();
    window.addEventListener('resize', fitNow);
    step();
    try {
      if (typeof Analytics !== 'undefined' && Analytics.track) {
        Analytics.track('ceremony_shown', { tier: 'finale', shape: v.shape, source: opts.source || '' });
      }
    } catch (e) {}
    return true;
  }

  // ---------------------------------------------------------------------------
  // THE TRIGGER. The referee decides; this asks it, once, and only when the
  // answer is already known to be the finale.
  // ---------------------------------------------------------------------------

  /* The context the referee reads. buildRewardCtx (js/26) takes userSaysDone
     from its options, and the DECLARATION IS PERSISTED (js/02's fulfilled
     hold writes gp.userSaysDone and nothing else, on purpose: goalDone is the
     referee's to write at ceremony time, R10). So the persisted flag is
     carried in here, which is what makes the declaration survive a relaunch. */
  function ctxFor(opts) {
    opts = opts || {};
    var gp = goalProgress() || {};
    var said = !!(opts.userSaysDone || gp.userSaysDone);
    var ctx = null;
    try { ctx = (typeof buildRewardCtx === 'function') ? buildRewardCtx({ prevValue: opts.prevValue, userSaysDone: said }) : null; } catch (e) { ctx = null; }
    return ctx;
  }

  /* THE FINISH LINE BELONGS TO THE FINALE. True from the moment the goal's own
     line is crossed until its receipt exists, whether or not the confirm has
     been answered yet. It is what keeps the crossing from being celebrated
     TWICE: the chooser calls the target itself a 'final' MARK, so without this
     a pulse to 100 would fire the milestone ceremony on its way past and the
     finale would fire minutes later when they tapped "I'm there". One
     crossing, one moment. A mark the finale swallows is still paid, inside
     decide() (R4), so nothing resurrects later.

     A PURE READ, and that is the point: decide() stamps the chooser's
     once-only ledger on its way past, so asking IT "is this a finale?" on an
     ordinary day would eat that day's milestone. */
  function owns(opts) {
    try {
      if (typeof RewardReferee === 'undefined') return false;
      var ctx = ctxFor(opts);
      if (!ctx) return false;
      var C = chooser();
      var hash = C ? C.starHash(ctx.star || '') : '';
      if (ctx.goalDone && ctx.goalDone[hash]) return false;      // R3: spent, life resumes
      return !!RewardReferee.reachedNow(ctx).reached;
    } catch (e) { return false; }
  }

  /* Would decide() return the finale RIGHT NOW: the line is crossed and either
     the shape may fire from the app's own ledger or they have declared it
     (R5). Pure read, same as owns(). */
  function armed(opts) {
    try {
      if (live) return false;
      if (!owns(opts)) return false;
      var ctx = ctxFor(opts);
      var r = RewardReferee.reachedNow(ctx);
      return !!(!r.needsConfirm || ctx.userSaysDone);             // R5
    } catch (e) { return false; }
  }

  /* The receipt keeps the record (MERGE-3 section 4). decide() writes the
     guard fields (day, shape, declaredBy); these are the numbers behind the
     ceremony, so the finished goal survives as history instead of a bare
     flag. Written BEFORE the render, flushed with it. */
  function enrichReceipt(res, v) {
    try {
      var st = S();
      if (!st || !st.goalDone || !res || !res.goalKey) return;
      var rec = st.goalDone[res.goalKey];
      if (!rec) return;
      var w = wallData(v);
      rec.line = v.line;
      rec.count = w.count;
      rec.noun = w.noun;
      rec.days = v.days;
      rec.active = v.active;
      rec.streak = v.streak;
      rec.weeks = w.weeks;
      rec.start = v.start;
      rec.value = v.value;
      rec.unit = v.unit;
      rec.money = w.money;
    } catch (e) {}
  }

  /* ONE decide, then the ceremony. Called by the two doors that can finish a
     goal: Clarity's fulfilled hold (rewardArrival, below) and a progress
     pulse that crosses the line with the declaration already standing. */
  function fire(opts) {
    opts = opts || {};
    try {
      if (!armed(opts)) return false;
      var ctx = ctxFor(opts);
      var res = RewardReferee.decide(ctx);          // R10: the receipt lands inside
      if (!res || res.tier !== 'finale') { persist(); return false; }
      var v = buildData();
      enrichReceipt(res, v);
      persist();                                    // persistence, then render
      return render(res, { data: v, source: opts.source || '', onDismiss: opts.onDismiss });
    } catch (e) { return false; }
  }

  /* THE CLARITY SEAM. js/02's fulfilled hold persists gp.userSaysDone and
     hands over here (clarityArrival -> window.rewardArrival). If the referee
     will not fire (a star with no number to cross, so nothing to confirm
     against), Clarity's own honest close still runs: reaching your own finish
     line inside a form must never be met with silence. */
  function arrival(o) {
    o = o || {};
    if (fire({ userSaysDone: true, source: o.source || 'clarity-fulfilled' })) return true;
    try {
      var st = S(), hash = liveHash();
      if (st && st.goalDone && st.goalDone[hash]) return false;   // already witnessed
    } catch (e) {}
    /* THE DECLARED PATH. They came through the manual door: two gates and a
       three second hold, saying the goal is finished. The number can lag the
       life (their last pulse said 88 and they are at 100), and the referee's
       target rule only reads the number, so without this the biggest moment
       in the product would be missed for anyone who did not update first.
       Nothing is bypassed: this is the referee's OWN rule for a goal only the
       person can call (shape 'event', spec section 3D), which is what the
       manual door is. Never reachable from a pulse, only from the hold. */
    if (declaredFire(o)) return true;
    try { if (typeof _cpArrivalInterim === 'function') _cpArrivalInterim(); } catch (e) {}
    return false;
  }

  function declaredFire(o) {
    try {
      if (live) return false;
      if (typeof RewardReferee === 'undefined') return false;
      var gp = goalProgress() || {};
      if (!gp.userSaysDone) return false;
      var ctx = ctxFor({ userSaysDone: true });
      if (!ctx) return false;
      var shape = ctx.shape;
      ctx.shape = 'event';                       // reached = they said so
      var res = RewardReferee.decide(ctx);
      if (!res || res.tier !== 'finale') { persist(); return false; }
      /* R4, by hand for this one path: decide() only pays the swallowed marks
         for the target shape, and the shape was just overridden. Pay them the
         same way it does, then throw the event away. */
      try {
        if (shape === 'target' && ctx.gp) {
          var C = chooser();
          if (C) C.evaluate({ gp: ctx.gp, star: ctx.star, ledger: ctx.ledger || {}, today: ctx.today, prevValue: ctx.prevValue });
        }
      } catch (e) {}
      var v = buildData();
      v.declared = true;
      enrichReceipt(res, v);
      try { S().goalDone[res.goalKey].shape = shape; } catch (e) {}   // the record keeps the real shape
      persist();
      return render(res, { data: v, source: (o && o.source) || 'clarity-fulfilled', onDismiss: o && o.onDismiss });
    } catch (e) { return false; }
  }

  /* THE PULSE PATH. js/03 asks armed() before it hands the pulse to the
     milestone page, so a crossing that is a FINALE never renders as a mark
     and a crossing that is not can never fire one. */
  function pulse(prevValue) {
    return fire({ prevValue: prevValue, source: 'pulse' });
  }

  window.GrandFinale = {
    armed: armed,
    owns: owns,
    fire: fire,
    pulse: pulse,
    show: function (res, opts) {
      opts = opts || {};
      var v = buildData();
      enrichReceipt(res, v);
      persist();
      opts.data = v;
      return render(res, opts);
    },
    dismiss: function () { if (live) destroy(); },
    isOpen: function () { return !!live; }
  };
  window.rewardArrival = arrival;
})();
