// ============================================================================
// THE DAILY REWARD (THE MERGE, rewards phase 1, 2026-08-20)
//
// The green page that lands when a day closes. It replaces the bare green
// flash: one flat green screen, one number, tap to dismiss, silent, no timer.
//
// PORT LAW. The eight renderers and every style value below are the graded
// mockup, carried over as they were written:
//   renderers -> mockups/celebrate/_daily-live.js (the R registry, v3)
//   styles    -> the LIVE_CSS string in mockups/celebrate/daily-build.py,
//                now css/rewards-daily.css
// The gallery's ninth renderer (a-rings) is not in daily-manifest.json, so it
// is not part of the eight and is not ported.
//
// WHAT CHANGED FROM THE GALLERY, and why (the provenance law, MERGE-README 3):
// the mockup walks dates backwards from today to fill the odometer header and
// the stamp's record. The app must never print a date nobody lived, so both
// read the REAL closed days out of state.dayRecords instead.
//
// THE COUNT is per-goal and never falls: closed, non-rest day records for the
// live star, held at a high-water mark under state.rewards.counts so an edited
// or pruned log cannot walk the number backwards.
//
// BUILD ON OPEN, DESTROY ON CLOSE (the record-must-not-outlive-its-view law).
// The overlay is created when it fires and removed on dismiss, which is also
// what stops the field's infinite spin from holding a GPU layer forever. Only
// the pane in view carries that animation at all.
//
// FIRED = WITNESSED. show() stamps state.rewards.dailySeen BEFORE it renders
// (the v1149 law) and refuses to render a day it already showed, so reopening
// a closed day, or relaunching, never replays it.
// ============================================================================
(function () {
  'use strict';

  // The eight, in gallery order (daily-manifest.json). Path of days is the
  // default and therefore first.
  var STYLES = ['t-path', 'n-odo', 'n-ghost', 't-month', 'o-thread', 't-steps', 'a-field', 't-stamp'];

  function S() { try { return (typeof state !== 'undefined') ? state : null; } catch (e) { return null; } }
  function G(name) { try { return window[name]; } catch (e) { return null; } }
  function persist() { try { var p = G('persistNow'); if (p) p(); } catch (e) {} }
  function reduced() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  // ---------------------------------------------------------------------------
  // THE RENDERERS. Ported verbatim from _daily-live.js; the only edits are the
  // two date reads called out at the top of this file.
  // ---------------------------------------------------------------------------
  function unitWord(n, cad) {
    if (cad === 'maint') return n === 1 ? 'day held' : 'days held';
    if (cad === 'freq') return n === 1 ? 'session' : 'sessions';
    return n === 1 ? 'move' : 'moves';
  }
  function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WDF = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function heroBlock(total, cad) {
    return '<div class="dl-n">' + total + '</div><div class="dl-u">' + unitWord(total, cad) + '</div>';
  }
  // A day key ('YYYY-MM-DD') read as a LOCAL date. new Date(key) parses it as
  // UTC and lands on the day before for anyone west of Greenwich.
  function dayDate(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!m) return new Date();
    return new Date(+m[1], +m[2] - 1, +m[3]);
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
    var dt = x.today;                                   // the real closed day
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
      '<div class="dlg-now"><span>' + x.total + '</span></div>' +
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
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<svg class="dl-field" viewBox="' + (-span) + ' ' + (-span) + ' ' + (span * 2) + ' ' + (span * 2) + '" width="300" height="300" aria-hidden="true">' + dots + '</svg>' +
      heroBlock(x.total, x.cad) + more;
  };

  /* 4. THE CALENDAR, every day you have shown up as a cell, the field growing
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

  /* 5. THE STAMP, a logbook. Today pressed in, the recent record beneath.
     THE DATES ARE REAL: x.dates is the closed-day log, newest first. */
  R['t-stamp'] = function (dst, x) {
    var dt = x.today, rows = '';
    var list = x.dates || [];
    var shown = Math.min(list.length, 7);
    for (var i = 0; i < shown; i++) {
      var d = dayDate(list[i]);
      rows += '<div class="dls-r">' + WD[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate() + '</div>';
    }
    var more = x.total > shown ? '<div class="dls-more">' + (x.total - shown) + ' more before these</div>' : '';
    dst.innerHTML =
      '<div class="dls-stamp"><div class="dls-d">' + dt.getDate() + '</div>' +
      '<div class="dls-side"><div class="dls-wd">' + WDF[dt.getDay()] + '</div><div class="dls-my">' + MONF[dt.getMonth()] + ' ' + dt.getFullYear() + '</div></div></div>' +
      '<div class="dls-rule"></div>' +
      '<div class="dls-tally"><b>' + x.total + '</b> ' + unitWord(x.total, x.cad) + ' recorded</div>' +
      '<div class="dls-rec">' + rows + more + '</div>';
  };

  /* 6. PATH OF DAYS, one tick per day, ALL of them, layered into rows that fill
     the phone. Day 303 shows 303 lines. Ticks shrink to keep the whole run in. */
  R['t-path'] = function (dst, x) {
    var N = Math.min(x.total, 365);
    // fewer per row + bigger ticks + bigger gaps when the count is low, so the path
    // feels big and spread even early; it only packs tighter as the run grows long.
    var per = N <= 20 ? 8 : N <= 50 ? 12 : N <= 120 ? 20 : N <= 240 ? 30 : 40;
    var rows = Math.ceil(N / per);
    var tickH = rows <= 2 ? 40 : rows <= 4 ? 28 : rows <= 7 ? 18 : rows <= 11 ? 12 : 9;
    var tickW = tickH >= 28 ? 6 : tickH >= 18 ? 4.5 : tickH >= 12 ? 3 : 2.4;
    var gapX = Math.round(tickW * 1.9), gapY = Math.round(tickH * 0.34) + 2;
    var out = '';
    for (var i = 0; i < N; i++) {
      if (i % per === 0) out += (i ? '</div>' : '') + '<div class="dlp-row" style="gap:' + gapX + 'px">';
      out += '<i class="' + (i === N - 1 ? 'dlp-now' : '') + '" style="width:' + tickW + 'px;height:' + (i === N - 1 ? tickH + 8 : tickH) + 'px"></i>';
    }
    if (N) out += '</div>';
    var more = x.total > N ? '<div class="dl-more">plus ' + (x.total - N) + ' more</div>' : '';
    dst.innerHTML =
      '<div class="dl-path" style="gap:' + gapY + 'px">' + out + '</div>' + heroBlock(x.total, x.cad) + more;
  };

  /* 7. THE STAIRCASE, one real step per day that accumulates. It climbs up to the
     right; when a flight reaches full width it turns and climbs back (switchback),
     stacking up the screen forever. Steps are a fixed chunky size and the whole
     climb scales down only as it outgrows the frame, so day 1 is a clean single
     step and day 365 is a tall switchback. Faint milestone lines (10, 50, 100 ...)
     mark how far you have come; today's step is lit. */
  R['t-steps'] = function (dst, x) {
    var N = Math.min(x.total, 365);
    var Wa = 206, Ha = 352;                        // frame the climb fills
    var F = Math.max(1, Math.min(11, Math.round(N / 28)));   // flights (folds) grow with the climb
    var per = Math.ceil(N / F);                    // steps per flight
    var tread = Math.min(28, Wa / per);            // fill the width; chunky (capped) when steps are few
    var riser = Math.min(26, Ha / N);              // fill the height; chunky (capped) when steps are few
    var Htot = N * riser, Wtot = per * tread;

    var y = Htot, px = 0, d = 'M0 ' + Htot.toFixed(1);   // ground at the bottom, climb up
    for (var i = 0; i < N; i++) {
      var goRight = (Math.floor(i / per) % 2 === 0);
      y -= riser;                                  // riser up
      d += ' L' + px.toFixed(1) + ' ' + y.toFixed(1);
      px += goRight ? tread : -tread;              // tread across (turns each flight)
      d += ' L' + px.toFixed(1) + ' ' + y.toFixed(1);
    }
    var sw = Math.max(1.9, Math.min(3.4, riser * 0.42));

    // milestone altitude lines + labels: how far you have come
    var marks = [10, 50, 100, 200, 300], lines = '', labels = '';
    marks.forEach(function (m) {
      if (m >= N) return;
      var ly = (Htot - m * riser).toFixed(1);
      lines += '<line x1="0" y1="' + ly + '" x2="' + Wtot.toFixed(1) + '" y2="' + ly +
        '" stroke="rgba(255,255,255,.16)" stroke-width="1"></line>';
      labels += '<text x="' + (Wtot + 7).toFixed(1) + '" y="' + (+ly + 3.6).toFixed(1) +
        '" fill="rgba(255,255,255,.5)" font-size="11" font-weight="600">' + m + '</text>';
    });
    var ground = '<line x1="0" y1="' + Htot.toFixed(1) + '" x2="' + Wtot.toFixed(1) + '" y2="' + Htot.toFixed(1) +
      '" stroke="rgba(255,255,255,.24)" stroke-width="1"></line>';

    var pad = 9, labelSpace = 34, vbW = Wtot + labelSpace + pad * 2, vbH = Htot + pad * 2;
    dst.innerHTML =
      '<svg class="dl-stair" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + vbW.toFixed(1) + ' ' + vbH.toFixed(1) + '" ' +
      'width="' + vbW.toFixed(1) + '" height="' + vbH.toFixed(1) + '" aria-hidden="true" ' +
      'style="display:block;margin:0 auto;overflow:visible">' +
      ground + lines +
      '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="' + sw.toFixed(2) +
      '" stroke-linejoin="miter" stroke-linecap="square"></path>' + labels +
      '<circle cx="' + px.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (sw + 1.8).toFixed(1) +
      '" fill="#fff" style="filter:drop-shadow(0 0 6px rgba(255,255,255,.85))"></circle>' +
      '</svg>' +
      heroBlock(x.total, x.cad);
  };

  /* 8. THE THREAD, one continuous line that keeps adding passes and getting
     longer the more days you hold, filling the phone by the hundreds. */
  R['o-thread'] = function (dst, x) {
    var N = Math.min(x.total, 300);
    var perRow = 7, rowsN = Math.max(1, Math.ceil(N / perRow));   // ~3x longer per-day segments -> a ~3x longer thread
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

  // ---------------------------------------------------------------------------
  // THE DATA. Everything the page prints comes from the closed-day records the
  // new Action close writes, for the goal that is live right now.
  // ---------------------------------------------------------------------------
  function liveStarHash() {
    try {
      var gs = G('goalStarHash');
      if (gs) return gs();
    } catch (e) {}
    try {
      var C = window.MilestoneChooser;
      var st = S();
      var star = (st && st.clarity && st.clarity.answers && st.clarity.answers.neutronStar) || '';
      return (C && star) ? C.starHash(star) : '';
    } catch (e) { return ''; }
  }

  // The per-goal count and the real dates behind it. Rest days are kept in the
  // log but they are not moves, so they are not counted and not listed.
  function goalDays(hash) {
    var st = S(), recs = (st && st.dayRecords) || {}, out = [];
    Object.keys(recs).forEach(function (k) {
      var r = recs[k];
      if (!r || r.off) return;
      if (hash && r.starHash && r.starHash !== hash) return;
      out.push(k);
    });
    out.sort();                 // 'YYYY-MM-DD' sorts chronologically as text
    out.reverse();              // newest first, which is what the stamp reads
    return out;
  }

  // NEVER FALLS. A pruned or edited log cannot walk the number backwards.
  function monotonic(hash, n) {
    var st = S();
    if (!st || !st.rewards) return n;
    if (!st.rewards.counts || typeof st.rewards.counts !== 'object') st.rewards.counts = {};
    var key = hash || 'nostar';
    var prev = +st.rewards.counts[key] || 0;
    var v = Math.max(prev, n);
    st.rewards.counts[key] = v;
    return v;
  }

  function cadence() {
    try {
      var shape = (typeof resolveRewardShape === 'function') ? resolveRewardShape() : 'target';
      if (shape === 'duration') return 'maint';
      if (shape === 'count') return 'freq';
      return 'daily';
    } catch (e) { return 'daily'; }
  }

  // The remembered style. js/01 seeds 'path'; the concept keys are what the
  // renderers are registered under, so the seed reads as the default.
  function styleIndex() {
    var st = S();
    var want = (st && st.rewards && st.rewards.dailyStyle) || 'path';
    if (want === 'path') want = 't-path';
    var i = STYLES.indexOf(want);
    return i < 0 ? 0 : i;
  }
  function rememberStyle(i) {
    var st = S();
    if (!st || !st.rewards) return;
    var key = STYLES[i] || STYLES[0];
    if (st.rewards.dailyStyle === key) return;
    st.rewards.dailyStyle = key;
    persist();
  }

  // WITNESSED. One stamp per goal-day, written before the page renders.
  function witnessKey(hash, day) { return (hash || 'nostar') + '|' + day; }
  function alreadyWitnessed(hash, day) {
    var st = S();
    var seen = st && st.rewards && st.rewards.dailySeen;
    return !!(seen && seen[witnessKey(hash, day)]);
  }
  function witness(hash, day) {
    var st = S();
    if (!st || !st.rewards) return;
    if (!st.rewards.dailySeen || typeof st.rewards.dailySeen !== 'object') st.rewards.dailySeen = {};
    var seen = st.rewards.dailySeen;
    seen[witnessKey(hash, day)] = Date.now();
    var keys = Object.keys(seen);
    if (keys.length > 40) {
      keys.sort(function (a, b) { return seen[a] - seen[b]; });
      keys.slice(0, keys.length - 40).forEach(function (k) { delete seen[k]; });
    }
    persist();
  }

  // ---------------------------------------------------------------------------
  // THE HOME WASH. Dismissing the page settles the day back underneath; the
  // home's own green wash belongs to the moment they actually land on the home,
  // so it is armed here and fires once, when the flow leaves the DOM.
  // ---------------------------------------------------------------------------
  var washPending = null;
  function fireWash() {
    if (!washPending) return;
    washPending = null;
    try { var w = G('showHomeCompletionWash'); if (w) w(); } catch (e) {}
  }
  function armHomeWash() {
    if (washPending) return;
    washPending = true;
    if (!document.querySelector('.afl')) { fireWash(); return; }
    var mo = new MutationObserver(function () {
      if (document.querySelector('.afl')) return;
      try { mo.disconnect(); } catch (e) {}
      clearTimeout(giveUp);
      fireWash();
    });
    mo.observe(document.body, { childList: true });
    // nothing outlives its view: if they stay in the flow, the wash is stale
    var giveUp = setTimeout(function () {
      try { mo.disconnect(); } catch (e) {}
      washPending = null;
    }, 300000);
  }

  // ---------------------------------------------------------------------------
  // THE PAGE. One flat green screen, eight panes, one gesture.
  // The pager is the finale's, ported from mockups/celebrate/_tweaks.js
  // (wirePager): the track follows the finger, an 18% throw flips the page, and
  // a snap always lands on a whole page, never between two.
  // ---------------------------------------------------------------------------
  var live = null;

  function destroy() {
    if (!live) return;
    var l = live;
    live = null;
    try { if (l.teardown) l.teardown(); } catch (e) {}
    try { if (l.root && l.root.parentNode) l.root.parentNode.removeChild(l.root); } catch (e) {}
  }

  function show(opts) {
    opts = opts || {};
    if (live) return false;                         // never two
    var st = S();
    if (!st) return false;

    var hash = opts.starHash || liveStarHash();
    var dates = goalDays(hash);
    var day = opts.day || dates[0];
    if (!day) return false;                         // no closed day, nothing true to show
    if (alreadyWitnessed(hash, day)) return false;  // fired = witnessed = never re-earned

    var total = monotonic(hash, dates.length);
    if (total < 1) return false;
    var x = { total: total, cad: opts.cad || cadence(), dates: dates, today: dayDate(day) };

    witness(hash, day);                             // the stamp lands BEFORE the render

    var root = document.createElement('div');
    root.className = 'drw';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', total + ' ' + unitWord(total, x.cad));
    var track = document.createElement('div');
    track.className = 'drw__track';
    root.appendChild(track);

    var panes = STYLES.map(function (key) {
      var pane = document.createElement('div');
      pane.className = 'drw-pane';
      pane.setAttribute('data-c', key);
      var dst = document.createElement('div');
      dst.className = 'drw-dst';
      pane.appendChild(dst);
      track.appendChild(pane);
      return pane;
    });

    var page = styleIndex();
    var drawn = {};
    // Panes render on demand (the neighbours ahead of the finger), so a 365-day
    // page paints one screen's worth of marks, not eight.
    function draw(i) {
      if (i < 0 || i >= panes.length || drawn[i]) return;
      var fn = R[STYLES[i]];
      if (!fn) return;
      try { fn(panes[i].firstChild, x); drawn[i] = true; } catch (e) {}
    }
    function drawAround(i) { draw(i); draw(i - 1); draw(i + 1); }

    function paintPage(anim) {
      track.style.transition = anim === false ? 'none' : '';
      track.style.transform = 'translateX(' + (page * -100) + '%)';
      panes.forEach(function (p, k) {
        if (k === page) p.setAttribute('data-live', '1');
        else p.removeAttribute('data-live');
      });
    }
    function play(i) {
      if (reduced()) return;
      var p = panes[i];
      if (!p) return;
      p.classList.remove('is-play');
      void p.offsetWidth;
      p.classList.add('is-play');
      setTimeout(function () { try { p.classList.remove('is-play'); } catch (e) {} }, 900);
    }

    drawAround(page);
    paintPage(false);

    // ---- the gesture ---------------------------------------------------------
    var sx = 0, sy = 0, drag = false, dx = 0, horiz = false, pw = 1, swiped = false;
    function onDown(e) {
      drag = true; horiz = false; dx = 0; swiped = false;
      sx = e.clientX; sy = e.clientY;
      pw = root.getBoundingClientRect().width || 1;
      try { root.setPointerCapture && root.setPointerCapture(e.pointerId); } catch (z) {}
    }
    function onMove(e) {
      if (!drag) return;
      var mx = e.clientX - sx, my = e.clientY - sy;
      if (!horiz) {
        if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
        horiz = Math.abs(mx) > Math.abs(my);
        if (!horiz) { drag = false; return; }
        drawAround(page + (mx < 0 ? 1 : -1));      // the pane they are heading for
      }
      dx = mx;
      var pct = (page * -100) + (mx / pw) * 100;
      pct = Math.max(-(panes.length - 1) * 100, Math.min(0, pct));   // stop at the ends
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + pct + '%)';
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      if (!drag) return;
      drag = false;
      if (!horiz) return;
      var from = page;
      if (dx < -pw * 0.18) page = Math.min(panes.length - 1, page + 1);
      else if (dx > pw * 0.18) page = Math.max(0, page - 1);
      draw(page);
      paintPage(true);
      if (page !== from) { rememberStyle(page); play(page); drawAround(page); }
      if (Math.abs(dx) > 8) { swiped = true; setTimeout(function () { swiped = false; }, 350); }
      dx = 0;
    }
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('click', function () {
      if (swiped) return;                           // a swipe is not a dismiss
      dismiss();
    });

    function dismiss() {
      destroy();
      armHomeWash();
      try { if (typeof opts.onDismiss === 'function') opts.onDismiss(); } catch (e) {}
    }

    // Escape and a route change leave with it, the same as every other
    // fullscreen surface in the app.
    var esc = function (ev) { if (ev.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', esc);
    var pop = function () { dismiss(); };
    window.addEventListener('hashchange', pop);

    live = {
      root: root,
      teardown: function () {
        document.removeEventListener('keydown', esc);
        window.removeEventListener('hashchange', pop);
      }
    };

    document.body.appendChild(root);
    play(page);
    return true;
  }

  window.DailyReward = {
    show: show,
    dismiss: function () { if (live) { destroy(); armHomeWash(); } },
    isOpen: function () { return !!live; },
    STYLES: STYLES,
    unitWord: unitWord
  };
})();
