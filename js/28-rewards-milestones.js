// ============================================================================
// THE MILESTONE CEREMONIES (THE MERGE, rewards phase 2, 2026-08-20)
//
// The along-the-way moments. A mark on the road crossed, a record taken, a
// week of days banked: three beats, tap to advance, tap to keep, silent, no
// timers. The referee (js/26) decides that a milestone is owed; the chooser
// (js/25) decides WHICH one and stamps its ledger. This file only renders.
//
// PORT LAW. The screens and their applier logic are the graded mockups:
//   markup   -> mockups/celebrate/frag/<key>.html  (the <div class="ph"> body)
//   styles   -> the same files' <style> blocks, now css/rewards-milestones.css
//   appliers -> the SPECS entries in mockups/celebrate/_tweaks.js
//   driver   -> the beat/confetti/mark machinery in mockups/celebrate/_kit.js
//
// WHAT CHANGED FROM THE GALLERY, and why (the provenance law, MERGE-README 3).
// The gallery is a rig: its sliders back-calculate every date from today
// (dateBack/dateAhead) and interpolate the rows in between. The app must never
// print a date nobody lived or a number nobody logged, so every date and every
// history row here is read from real state instead:
//   * mark-crossing dates      state.rewards.ledger (the chooser stamps them)
//   * the numbers over time    state.goalProgress.history
//   * the days shown up        state.dayRecords
//   * the hard days            state.checkins (mood 1-2, the real check-in)
// Where a screen wanted something the app does not record, the clause is
// dropped rather than filled in. Each of those is marked PROVENANCE below.
//
// BUILD ON OPEN, DESTROY ON CLOSE (the record-must-not-outlive-its-view law).
// One overlay, created when it fires and removed on dismiss; the confetti
// canvas dies with it, so nothing holds a GPU layer after the moment.
//
// FIRED = WITNESSED. show() stamps state.rewards.msSeen BEFORE it renders
// (the v1149 law), and the chooser already wrote its once-only ledger inside
// decide(). A relaunch mid-ceremony lands behind, never ahead: the mark is
// paid, the ceremony simply does not replay.
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

  // ---------------------------------------------------------------------------
  // HELPERS. Ported verbatim from _tweaks.js, minus the two date fakers.
  // ---------------------------------------------------------------------------
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function dur(min) {
    min = Math.round(min);
    var h = Math.floor(min / 60), m = min % 60;
    return h ? h + 'h ' + (m < 10 ? '0' : '') + m + 'm' : m + 'm';
  }
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
  function isTimeUnit(unit) { return /\b(min|mins|minute|minutes|hour|hours|hr|hrs)\b/i.test(String(unit || '')); }
  function ordinal(n) {
    return n % 10 === 1 && n % 100 !== 11 ? 'st'
      : n % 10 === 2 && n % 100 !== 12 ? 'nd'
      : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  }
  function Q(root, sel) { return root.querySelector(sel); }
  function put(root, sel, html) { var el = Q(root, sel); if (el) el.innerHTML = html; }
  function cnt(root, sel, to, from) {
    var el = Q(root, sel); if (!el) return;
    el.setAttribute('data-count', (from == null ? 0 : from) + '|' + to);
    el.textContent = fmt(to);
  }

  // ---------------------------------------------------------------------------
  // REAL DATES. These replace the rig's dateBack/dateAhead everywhere.
  // A day key ('YYYY-MM-DD') read as a LOCAL date: new Date(key) parses UTC and
  // lands a day early for anyone west of Greenwich (the js/27 trap).
  // ---------------------------------------------------------------------------
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
  function shortDate(key) {
    return dayDate(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function longDate(key) {
    return dayDate(key).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
  function monthLabel(key) {
    return dayDate(key).toLocaleDateString('en-US', { month: 'long' });
  }
  function yearOf(key) { return String(dayDate(key).getFullYear()); }

  // ---------------------------------------------------------------------------
  // THE STATE READ. One context, built fresh per ceremony.
  // ---------------------------------------------------------------------------
  function liveStar() {
    var st = S();
    return (st && st.clarity && st.clarity.answers && st.clarity.answers.neutronStar) || '';
  }
  function liveHash() {
    try {
      var C = window.MilestoneChooser;
      return C ? C.starHash(liveStar()) : '';
    } catch (e) { return ''; }
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
  // in the log but they are not moves, so they are not counted here (js/27's
  // rule, the same records feed both pages).
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
  // The check-ins they logged as hard: mood 1 or 2 of 5, the real entry.
  function hardDayKeys(fromKey) {
    var st = S(), list = (st && Array.isArray(st.checkins)) ? st.checkins : [], out = [];
    list.forEach(function (c) {
      if (!c) return;
      var m = +c.mood;
      if (!(m >= 1 && m <= 2)) return;
      var k = String(c.iso || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) return;
      if (fromKey && k < fromKey) return;
      out.push(k);
    });
    return out.sort();
  }
  // The dates the chooser stamped for this goal's marks, value -> 'YYYY-MM-DD'.
  function markDates(hash) {
    var st = S(), led = (st && st.rewards && st.rewards.ledger) || {}, out = {};
    Object.keys(led).forEach(function (k) {
      var m = new RegExp('^' + hash + ':mark-(-?[0-9.]+)$').exec(k);
      if (m) out[m[1]] = led[k];
    });
    return out;
  }
  // The dates records were taken, ascending.
  function recordDates(hash) {
    var st = S(), led = (st && st.rewards && st.rewards.ledger) || {}, out = [];
    Object.keys(led).forEach(function (k) {
      if (k.indexOf(hash + ':record-') === 0) out.push(led[k]);
    });
    return out.sort();
  }
  // A custom sub-goal's own name, when they named one ("the 10K").
  function customName(gp, value) {
    try {
      var list = (gp && gp.customMarks) || [];
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m && typeof m === 'object' && +m.value === +value && m.name) return String(m.name);
      }
    } catch (e) {}
    return '';
  }

  function buildCtx() {
    var gp = goalProgress() || {};
    var hash = liveHash();
    var hist = Array.isArray(gp.history) ? gp.history : [];
    var days = goalDayKeys(hash);
    var first = (hist.length && hist[0].day) || days[0] || todayKey();
    return {
      gp: gp, hash: hash, hist: hist, dayKeys: days,
      unit: gp.unit || '', firstDay: first, today: todayKey(),
      marks: markDates(hash), records: recordDates(hash)
    };
  }

  // The record just taken is the hero, not a row on its own board. The chooser
  // stamps it before this renders, so its own fire date (the tail of the event
  // key it just wrote) comes out of the history rows.
  function recordsBefore(c, ev) {
    var self = '';
    var m = /:record-(\d{4}-\d{2}-\d{2})$/.exec((ev && ev.key) || '');
    if (m) self = m[1];
    return c.records.filter(function (d) { return d !== self; });
  }

  // ---------------------------------------------------------------------------
  // THE SCREENS. Markup ported verbatim from frag/<key>.html (the .st body).
  // The gallery's "Tap to replay" hint is dropped: in the app the last tap
  // keeps the moment, it does not replay it.
  // ---------------------------------------------------------------------------
  var HTML = {};

  HTML['qu-1'] =
    '<div class="b b1">' +
      '<div class="n qu1-hero" data-count="0|60">60</div>' +
      '<div class="sub">paying users.</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="n qu1-hero2" data-count="0|60">60</div>' +
      '<div class="sub qu1-sub2">paying users</div>' +
      '<div class="gp">' +
        '<div class="gp__scale"><span>0</span><span>100</span></div>' +
        '<div class="gp__rail">' +
          '<span class="gp__fill"></span><span class="gp__was"></span><span class="gp__now"></span>' +
        '</div>' +
        '<div class="gp__row"><span><b>60</b> closed</span><span><b>40</b> to go</span></div>' +
        '<div class="sub gp__cost"></div>' +
      '</div>' +
    '</div>' +
    '<div class="b b3"><div class="deposit"></div></div>';

  HTML['qu-2'] =
    '<div class="b b1">' +
      '<div class="n qu2-hero">$1,000</div>' +
      '<div class="sub"></div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="qu2-ledger"></div>' +
      '<div class="sub qu2-sub"></div>' +
      '<div class="cap qu2-cap"></div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"></div>' +
      '<svg class="mark--foot" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>' +
    '</div>';

  HTML['qu-5'] =
    '<div class="b b1">' +
      '<div class="n qu5-hero">1,412</div>' +
      '<div class="sub"></div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="qu5-board"></div>' +
      '<div class="sub qu5-sub"></div>' +
      '<div class="cap qu5-cap"></div>' +
    '</div>' +
    '<div class="b b3"><div class="deposit"></div></div>';

  HTML['qd-1'] =
    '<div class="b b1">' +
      '<div class="n qd1-hero" data-count="270|262">262</div>' +
      '<div class="sub">on the scale today.</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="n qd1-hero2" data-count="270|262">262</div>' +
      '<div class="sub qd1-sub2">lbs</div>' +
      '<div class="gp">' +
        '<div class="gp__scale"><span>270</span><span>250</span></div>' +
        '<div class="gp__rail">' +
          '<span class="gp__fill"></span><span class="gp__was"></span><span class="gp__now"></span>' +
        '</div>' +
        '<div class="gp__row"><span><b>8</b> down</span><span><b>12</b> to go</span></div>' +
        '<div class="sub gp__cost"></div>' +
      '</div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"></div>' +
      '<svg class="mark--foot" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>' +
    '</div>';

  HTML['qd-2'] =
    '<div class="b b1">' +
      '<div class="lead"><span class="n n--hero">1h 41m</span></div>' +
      '<div class="sub"></div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="log"></div>' +
      '<div class="sub"></div>' +
      '<div class="sub"></div>' +
    '</div>' +
    '<div class="b b3"><div class="deposit"></div></div>';

  HTML['qd-3'] =
    '<div class="b b1">' +
      '<div class="lead"><span class="n n--hero" data-count="214|199">199</span></div>' +
      '<div class="sub"></div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="n n--big" data-count="214|199">199</div>' +
      '<div class="sub"></div>' +
      '<div class="sub"></div>' +
    '</div>' +
    '<div class="b b3"><div class="deposit"></div></div>';

  HTML['fr-3'] =
    '<div class="b b1">' +
      '<div class="cap" style="margin:0 0 10px;">Total runs</div>' +
      '<div class="n n--hero" data-count="0|50">50</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="fr3-field"></div>' +
      '<div class="sub fr3-sub"></div>' +
      '<div class="cap"></div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"></div>' +
      '<div class="cap"></div>' +
      '<svg class="mark--foot" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>' +
    '</div>';

  HTML['mt-1'] =
    '<div class="b b1" data-confetti>' +
      '<div class="n n--hero" data-count="0|100">0</div>' +
      '<div class="sub">days</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="mt1-field"></div>' +
      '<div class="sub"></div>' +
      '<div class="cap"></div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"></div>' +
      '<div class="mt1-note"></div>' +
    '</div>';

  HTML['mt-2'] =
    '<div class="b b1" data-confetti>' +
      '<div class="n n--hero" data-count="0|365">0</div>' +
      '<div class="sub">days held</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="mt2-rail">' +
        '<span class="mt2-track"></span><span class="mt2-fill"></span>' +
        '<span class="mt2-start"></span><span class="mt2-end"></span>' +
      '</div>' +
      '<div class="mt2-dates"></div>' +
      '<div class="sub"></div>' +
      '<div class="mt2-line2"></div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"></div>' +
      '<div class="mt2-note"></div>' +
      '<svg class="mark--foot" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>' +
    '</div>';

  HTML['mt-3'] =
    '<div class="b b1">' +
      '<div class="n n--hero" data-count="0|30">0</div>' +
      '<div class="sub">days</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="mt3-days"></div>' +
      '<div class="sub"></div>' +
      '<div class="cap"></div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"></div>' +
      '<div class="mt3-note"></div>' +
    '</div>';

  HTML['mt-4'] =
    '<div class="b b1" data-confetti>' +
      '<div class="mt4-hero"><span class="mt4-glow"></span><div class="n n--hero" data-count="0|7">0</div></div>' +
      '<div class="sub">days</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="mt4-week">' +
        '<span></span><span></span><span></span><span></span><span></span><span></span><span></span>' +
      '</div>' +
      '<div class="sub"></div>' +
      '<div class="cap"></div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"><b>Day 7.</b> The line held.</div>' +
      '<div class="mt4-note">Seven days are in the record. The visible part comes later.</div>' +
    '</div>';

  HTML['rf-fall'] =
    '<div class="b b1">' +
      '<div class="fl">' +
        '<div class="n n--hero fl__n" data-count="16|12">16</div>' +
        '<div class="fl__shelf"><span class="fl__bloom"></span><span class="fl__lit"></span></div>' +
        '<div class="sub fl__sub">lbs to go</div>' +
      '</div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="fl"><div class="fl__led"></div><div class="sub fl__cost"></div></div>' +
    '</div>' +
    '<div class="b b3"><div class="deposit"></div></div>';

  HTML['rf-rec'] =
    '<div class="b b1">' +
      '<div class="n n--hero" data-count="0|50">0</div>' +
      '<div class="sub"></div>' +
    '</div>' +
    '<div class="b b2">' +
      '<div class="rc">' +
        '<div class="rc__grid"></div>' +
        '<div class="rc__cost"><div class="n n--big" data-count="0|84">0</div><div class="sub"></div></div>' +
        '<div class="rc__note"></div>' +
      '</div>' +
    '</div>' +
    '<div class="b b3">' +
      '<div class="deposit"></div>' +
      '<svg class="mark--foot" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>' +
    '</div>';

  // ---------------------------------------------------------------------------
  // THE APPLIERS. Ported from _tweaks.js SPECS[key].apply, values unchanged.
  // Each PROVENANCE note marks a line where the rig's invented data was swapped
  // for the real log; nothing else moved.
  // ---------------------------------------------------------------------------
  var APPLY = {};

  APPLY['qu-1'] = function (r, v) {
    var start = Math.max(0, +v.start), goal = +v.goal;
    if (goal <= start) goal = start + 1;
    var cur = Math.min(Math.max(+v.cur, start), goal);
    var span = goal - start, frac = (cur - start) / span;
    var money = isMoney(v.unit);
    var mf = function (n) { return (money ? '$' : '') + fmt(n); };
    var marks = v.marks || [];
    var passed = marks.filter(function (m) { return cur >= m; });
    var nowMark = passed.length ? passed[passed.length - 1] : null;
    if (money) { put(r, '.qu1-hero', mf(cur)); put(r, '.qu1-hero2', mf(cur)); }
    else { cnt(r, '.qu1-hero', cur); cnt(r, '.qu1-hero2', cur); }
    var unitWord = money ? (String(v.unit).replace(/^\$\s*/, '') || 'dollars') : v.unit;
    put(r, '.b1 .sub', esc(unitFor(cur, unitWord)) + '.');
    put(r, '.qu1-sub2', esc(unitFor(cur, unitWord)));
    put(r, '.gp__scale', '<span>' + mf(start) + '</span><span>' + mf(goal) + '</span>');
    var below = marks.filter(function (m) { return m < cur; });
    var wasV = below.length ? below[below.length - 1] : start;
    var f = Q(r, '.gp__fill');
    var wasF = Math.abs(wasV - start) / span;
    if (f) {
      f.style.width = (frac * 100).toFixed(1) + '%';
      f.style.setProperty('--gpFrom', frac > 0 ? Math.max(0, Math.min(1, wasF / frac)).toFixed(4) : '1');
    }
    var wm = Q(r, '.gp__was');
    if (wm) { wm.style.left = (wasF * 100).toFixed(1) + '%'; wm.style.display = wasV === start ? 'none' : ''; }
    var nm = Q(r, '.gp__now'); if (nm) nm.style.left = (frac * 100).toFixed(1) + '%';
    put(r, '.gp__row', '<span><b>' + mf(cur - start) + '</b> closed</span><span><b>' + mf(goal - cur) + '</b> to go</span>');
    // PROVENANCE: the rig divides the overall pace to guess the last leg. The
    // real leg is the days between the mark they last passed (its stamped fire
    // date) and today.
    var leg = cur - wasV;
    var cost = Q(r, '.gp__cost');
    if (cost) {
      if (leg > 0 && v.legDays > 0) {
        cost.style.display = '';
        cost.innerHTML = '<b>' + fmt(v.legDays) + ' ' + plural(v.legDays, 'day', 'days') + '</b> closed the last ' + mf(leg) + '.';
      } else cost.style.display = 'none';
    }
    // custom sub-goals carry THEIR name in the deposit when they named one
    var named = v.markName ? ' (' + esc(v.markName) + ')' : '';
    put(r, '.b3 .deposit', nowMark === null
      ? (cur > start
        ? 'The first move is in: <b>' + mf(cur - start) + '</b> already, from ' + mf(start) + '. The first mark waits at ' + mf(marks[0]) + '.'
        : 'Nothing moved yet. The first mark waits at <b>' + mf(marks[0]) + '</b>.')
      : 'On this day, you passed <b>' + mf(nowMark) + ' of ' + mf(goal) + '</b>' + (money ? '' : ' ' + esc(unitFor(goal, v.unit))) + named + '.');
  };

  APPLY['qd-1'] = function (r, v) {
    var start = +v.start, goal = +v.goal;
    if (start === goal) return;
    var cur = Math.max(Math.min(+v.cur, Math.max(start, goal)), Math.min(start, goal));
    var marks = v.marks || [];
    var span = Math.abs(goal - start), frac = Math.abs(cur - start) / span;
    var money = isMoney(v.unit);
    var mf = function (n) { return (money ? '$' : '') + fmt(n); };
    if (money) { put(r, '.qd1-hero', mf(cur)); put(r, '.qd1-hero2', mf(cur)); }
    else { cnt(r, '.qd1-hero', cur, start); cnt(r, '.qd1-hero2', cur, start); }
    put(r, '.qd1-sub2', esc(money ? (String(v.unit).replace(/^\$\s*/, '') || 'dollars') : v.unit));
    put(r, '.gp__scale', '<span>' + mf(start) + '</span><span>' + mf(goal) + '</span>');
    var before = marks.filter(function (m) { return m > cur; });
    var wasV = before.length ? before[before.length - 1] : start;
    var wasF = Math.abs(wasV - start) / span;
    var f = Q(r, '.gp__fill');
    if (f) {
      f.style.width = (frac * 100).toFixed(1) + '%';
      f.style.setProperty('--gpFrom', frac > 0 ? Math.max(0, Math.min(1, wasF / frac)).toFixed(4) : '1');
    }
    var wm = Q(r, '.gp__was');
    if (wm) { wm.style.left = (wasF * 100).toFixed(1) + '%'; wm.style.display = wasV === start ? 'none' : ''; }
    var nm = Q(r, '.gp__now'); if (nm) nm.style.left = (frac * 100).toFixed(1) + '%';
    var weighty = /lb|kg|pound|kilo/i.test(v.unit || '');
    var downWord = money ? 'paid off' : 'down';
    put(r, '.gp__row', '<span><b>' + mf(Math.abs(cur - start)) + '</b> ' + downWord + '</span><span><b>' + mf(Math.abs(cur - goal)) + '</b> to go</span>');
    // PROVENANCE: real leg, from the last mark's stamped fire date. See qu-1.
    var leg = Math.abs(cur - wasV);
    var cost = Q(r, '.gp__cost');
    if (cost) {
      if (leg > 0 && v.legDays > 0) {
        cost.style.display = '';
        cost.innerHTML = '<b>' + fmt(v.legDays) + ' ' + plural(v.legDays, 'day', 'days') + '</b> for the last ' + mf(leg) + '.';
      } else cost.style.display = 'none';
    }
    put(r, '.b1 .sub', weighty ? 'on the scale today.' : money ? 'still to pay off.' : esc(v.unit) + ' today.');
    var downBy = mf(Math.abs(start - cur));
    var named = v.markName ? ' (' + esc(v.markName) + ')' : '';
    put(r, '.b3 .deposit', cur === start
      ? 'Day one. The road runs ' + mf(start) + ' to ' + mf(goal) + '; the first mark is <b>' + mf(marks[0]) + '</b>.'
      : weighty
        ? 'On this day, the scale read <b>' + mf(cur) + '</b>' + named + '. Down ' + downBy + ' from where you started.'
        : money
          ? 'On this day, it stood at <b>' + mf(cur) + '</b>' + named + '. ' + downBy + ' paid off since you started.'
          : 'On this day, you were at <b>' + mf(cur) + '</b>' + named + '. Down ' + downBy + ' from where you started.');
  };

  APPLY['qu-2'] = function (r, v) {
    var now = Math.max(1, +v.now), best = Math.max(1, +v.best);
    var money = isMoney(v.unit);
    var mf = function (n) { return (money ? '$' : '') + fmt(n); };
    var crossed = String(Math.floor(now)).length > String(Math.floor(best)).length;
    var th = Math.pow(10, String(Math.floor(now)).length - 1);
    put(r, '.qu2-hero', mf(now));
    // PROVENANCE: the rig writes "in one month, from writing"; the app has no
    // source field, so the line is the unit they gave and nothing more.
    put(r, '.b1 .sub', esc(unitFor(now, money ? 'dollars' : v.unit)) + '.');
    // PROVENANCE: the rig invents four past months at fractions of the best.
    // These rows are the real pulses in state.goalProgress.history, newest
    // first, labelled with the day they were logged.
    var rows = '';
    var list = v.rows || [];
    for (var i = 0; i < list.length; i++) {
      var lab = esc(list[i].label);
      rows += '<div class="qu2-row' + (i === 0 ? ' is-new' : '') + '"><span class="qu2-m">' + lab +
        '</span><span class="qu2-v">' + mf(list[i].value) + '</span></div>' +
        (i === 0 ? '<div class="qu2-line"></div>' : '');
    }
    put(r, '.qu2-ledger', rows);
    put(r, '.qu2-sub', crossed
      ? '<b>' + fmt(v.spanDays) + ' ' + plural(v.spanDays, 'day', 'days') + '</b> to add a digit.'
      : '<b>' + fmt(v.spanDays) + ' ' + plural(v.spanDays, 'day', 'days') + '</b> of counting so far.');
    put(r, '.qu2-cap', mf(best) + ' was the best before it.' +
      (v.hidden > 0 ? ' (' + fmt(v.hidden) + ' earlier ' + plural(v.hidden, 'entry', 'entries') + ' off-screen.)' : ''));
    put(r, '.b3 .deposit', crossed
      ? 'On this day, you passed <b>' + mf(th) + '</b> for the first time.'
      : 'On this day, your best yet: <b>' + mf(now) + '</b>.');
  };

  APPLY['qu-5'] = function (r, v) {
    var now = +v.now, best = +v.best;
    put(r, '.qu5-hero', fmt(now));
    put(r, '.b1 .sub', esc(unitFor(now, v.unit)) + '. Your best yet.');
    // PROVENANCE: the board is the real record log (the chooser's stamped
    // record dates + the values they were set at), never a decayed guess.
    var rows = '<div class="qu5-row is-new"><span class="qu5-when">today</span><span class="qu5-v">' + fmt(now) + '</span></div>';
    (v.records || []).forEach(function (rec) {
      rows += '<div class="qu5-row"><span class="qu5-when">' + esc(rec.when) + '</span><span class="qu5-v">' + fmt(rec.value) + '</span></div>';
    });
    put(r, '.qu5-board', rows);
    put(r, '.qu5-sub', 'Your best yet.');
    put(r, '.qu5-cap', v.stoodDays > 0
      ? 'The one it beat stood ' + fmt(v.stoodDays) + ' ' + plural(v.stoodDays, 'day', 'days') + '.'
      : 'The last best was ' + fmt(best) + '.');
    // the fragment's own sentence, not the rig's ("record: 1,412. new
    // followers." breaks in half once the unit is a real word)
    put(r, '.b3 .deposit', 'On this day, you set a record. <b>' + fmt(now) + '</b> ' + esc(unitFor(now, v.unit)) + '.');
  };

  APPLY['qd-2'] = function (r, v) {
    // PROVENANCE: the rig always formats the number as a duration. Only a time
    // unit is a duration; every other goal prints its own number and unit.
    var timey = !!v.isTime;
    var show = function (n) { return timey ? dur(n) : fmt(n) + (v.unit ? ' ' + unitFor(n, v.unit) : ''); };
    var now = +v.now;
    put(r, '.b1 .n', show(now));
    put(r, '.b1 .sub', timey ? 'a day this week. Your lowest since you started counting.'
                             : 'Your lowest since you started counting.');
    // PROVENANCE: the rows are the real record log, with the day each was set.
    var rows = '';
    (v.rows || []).forEach(function (row) {
      rows += '<div class="lgr"><span class="d">' + esc(row.d) + '</span><span class="v">' + show(row.v) + '</span></div>';
    });
    rows += '<div class="lgr lgr--now"><span class="d">today</span><span class="v">' + show(now) + '</span></div>';
    put(r, '.log', rows);
    var subs = r.querySelectorAll('.b2 .sub');
    if (subs[0]) subs[0].innerHTML = 'A list of your records over time' + (v.hidden > 0 ? ' (' + fmt(v.hidden) + ' not shown)' : '') + '.';
    if (subs[1]) subs[1].innerHTML = 'You reached a new record! Now let\'s go get another one.';
    put(r, '.b3 .deposit', 'On this day, you came in at <b>' + show(now) + '</b>. A new record.');
  };

  APPLY['qd-3'] = function (r, v) {
    cnt(r, '.b1 .n', +v.cur, +v.from);
    cnt(r, '.b2 .n', +v.cur, +v.from);
    put(r, '.b1 .sub', esc(v.unit));
    var subs = r.querySelectorAll('.b2 .sub');
    // PROVENANCE: "since 2019" needs a real earlier reading under the line. The
    // app knows only what it logged, so the clause appears only when a logged
    // day under the line exists, and is dropped otherwise.
    if (subs[0]) subs[0].innerHTML = 'You said you wanted to be under ' + fmt(+v.line) + '.'
      + (v.since ? ' This is the first morning it is true since <b>' + esc(v.since) + '</b>.'
                 : ' Today it is true.');
    if (subs[1]) subs[1].innerHTML = fmt(+v.days) + ' ' + plural(+v.days, 'day', 'days') + ' since it read ' + fmt(+v.from) + '.';
    put(r, '.b3 .deposit', 'On this day, you were at <b>' + fmt(+v.cur) + '</b>. First time under ' + fmt(+v.line)
      + (v.since ? ' since ' + esc(v.since) : '') + '.');
  };

  APPLY['fr-3'] = function (r, v) {
    var n = +v.n, days = +v.days;
    put(r, '.b1 .cap', 'Total ' + esc(v.word));
    cnt(r, '.b1 .n', n);
    var fifties = Math.floor(n / 50), rem = n % 50;
    var lit = rem === 0 && n > 0 ? 50 : rem;
    var rows = '';
    for (var rw = 0; rw < 5; rw++) {
      var row = '';
      for (var i = 0; i < 10; i++) {
        var idx = rw * 10 + i;
        row += '<i class="fr3-d' + (idx < lit ? '' : ' fr3-off') + (idx === lit - 1 ? ' last' : '') + '"></i>';
      }
      rows += '<div class="fr3-row">' + row + '</div>';
    }
    var multLbl = fifties >= (rem === 0 ? 2 : 1) && n >= 50 ? '<div class="fr3-mult">' + fifties + '&times;</div>' : '';
    put(r, '.fr3-field', '<div class="fr3-box">' + rows + '</div>' + multLbl);
    put(r, '.fr3-sub', fmt(n) + ' ' + esc(unitFor(n, v.word)) + ' in <b>' + fmt(days) + ' ' + plural(days, 'day', 'days') + '</b>.' + (n > 50 ? ' Each full box is 50.' : ''));
    // PROVENANCE: the real first logged day, and today's real date.
    put(r, '.b2 .cap', 'Since ' + longDate(v.sinceDay));
    put(r, '.b3 .deposit', 'On this day, your <b>' + fmt(n) + ordinal(n) + ' ' + esc(singular(v.word)) + '</b>.');
    put(r, '.b3 .cap', longDate(v.today));
  };

  APPLY['mt-1'] = function (r, v) {
    var d = +v.days, hit = +v.milestone || d;
    cnt(r, '.b1 .n', hit);
    put(r, '.b1 .sub', plural(hit, 'day', 'days') + (v.what ? ' ' + esc(v.what) : ' held'));
    var rows = Math.max(1, Math.min(8, Math.round(hit / 25))), fh = '';
    for (var i = 0; i < rows; i++) fh += '<div class="mt1-row"></div>';
    put(r, '.mt1-field', fh);
    put(r, '.b2 .sub', 'You made the same call on ' + fmt(hit) + ' separate ' + plural(hit, 'day', 'days') + '.');
    // PROVENANCE: the real first held day to today, not today-minus-N.
    put(r, '.b2 .cap', shortDate(v.fromDay) + ' to ' + shortDate(v.today));
    put(r, '.b3 .deposit', v.bold
      ? '<b>Day ' + fmt(hit) + '.</b> One of the big ones. The line held.'
      : '<b>Day ' + fmt(hit) + '.</b> The line held.');
    put(r, '.mt1-note', 'No end date on this one. The ' + fmt(hit) + ' days are in the record now, and nothing later takes them out.'
      + (hit !== d ? ' (Day ' + fmt(d) + ' itself is quiet; the last rung was ' + fmt(hit) + '.)' : ''));
  };

  APPLY['mt-2'] = function (r, v) {
    var total = +v.total, held = Math.min(+v.held, total);
    var done = held >= total, pct = Math.round(held / total * 100);
    cnt(r, '.b1 .n', held);
    var f = Q(r, '.mt2-fill'); if (f) f.style.width = pct + '%';
    // PROVENANCE: the real start day and the real end date they picked.
    put(r, '.mt2-dates', '<span>' + shortDate(v.startDay) + '</span><span>' + shortDate(v.endDay) + '</span>');
    put(r, '.b2 .sub', Math.round(total / 30) + ' ' + plural(Math.round(total / 30), 'month', 'months') + '.' + (v.what ? ' ' + esc(v.what) : ''));
    put(r, '.mt2-line2', done ? 'You picked the end date yourself. It arrived with the rule intact.' : '<b>' + pct + '%</b> of the promise kept so far.');
    put(r, '.b3 .deposit', done
      ? '<b>Day ' + fmt(total) + '.</b> The hold held. The goal is complete.'
      : '<b>Day ' + fmt(held) + '.</b> ' + pct + '% of the way to the date.');
    put(r, '.mt2-note', done ? 'It closes here. There is nothing left to hold.' : 'The date is ' + longDate(v.endDay) + '.');
  };

  APPLY['mt-3'] = function (r, v) {
    var d = +v.days, dates = v.hardDates || [], hard = dates.length;
    cnt(r, '.b1 .n', d);
    put(r, '.b1 .sub', 'days' + (v.what ? ' without ' + esc(v.what) : ' held'));
    // PROVENANCE: every hard day is a real check-in they logged (mood 1-2),
    // printed on the date it actually was.
    var shown = Math.min(hard, 6), rowsH = '';
    for (var i = 0; i < shown; i++) rowsH += '<div class="mt3-hd">' + shortDate(dates[i]) + '</div>';
    if (hard > shown) rowsH += '<div class="mt3-hd mt3-hd--more">and ' + fmt(hard - shown) + ' more</div>';
    put(r, '.mt3-days', rowsH);
    put(r, '.b2 .sub', fmt(hard) + ' of these days you logged as hard. You held on all ' + fmt(hard) + '.');
    put(r, '.b2 .cap', shortDate(v.fromDay) + ' to ' + shortDate(v.today));
    put(r, '.b3 .deposit', '<b>Day ' + fmt(d) + '</b>' + (v.what ? ' without ' + esc(v.what) : '') + '. The line held.');
    put(r, '.mt3-note', 'The ' + fmt(hard) + ' hard ' + plural(hard, 'day is', 'days are') + ' spent and counted. They do not come back around.');
  };

  APPLY['mt-4'] = function (r, v) {
    // PROVENANCE: the rig names the thing they held ("left it in the kitchen").
    // Nothing in the app records that phrase yet, so the fallback borrows
    // mt-1's own graded line rather than inventing one.
    put(r, '.b2 .sub', v.what
      ? 'Seven days, seven times you ' + esc(v.what) + '.'
      : 'Seven days. You made the same call seven times.');
    // PROVENANCE: the real seven days, first to today.
    put(r, '.b2 .cap', shortDate(v.fromDay) + ' to ' + shortDate(v.today));
  };

  APPLY['rf-fall'] = function (r, v) {
    var left = +v.left;
    var money = isMoney(v.unit);
    var mf = function (n) { return (money ? '$' : '') + fmt(n); };
    cnt(r, '.fl__n', left, +v.prevLeft);
    put(r, '.fl__sub', esc(money ? 'left to pay' : unitFor(left, v.unit) + ' to go'));
    // PROVENANCE: the descent ledger is the real marks they crossed, each on
    // the day the chooser stamped it. No interpolated floors.
    var rows = '<div class="fl__hd"><span></span><span>' + esc(money ? 'left' : (v.unit || '') + ' left') + '</span></div>';
    var list = v.rows || [];
    for (var i = 0; i < list.length; i++) {
      rows += '<div class="fl__row' + (i === list.length - 1 ? ' fl__row--now' : '') + '" style="--d:' + (60 + i * 120) + 'ms">' +
        '<span class="fl__day">Day ' + fmt(list[i].day) + '</span><span class="fl__v">' + mf(list[i].value) + '</span></div>';
    }
    put(r, '.fl__led', rows);
    var cost = Q(r, '.fl__cost');
    if (cost) {
      if (v.lastLeg > 0 && v.legDays > 0) {
        cost.style.display = '';
        cost.innerHTML = 'The last ' + mf(v.lastLeg) + ' took <b>' + fmt(v.legDays) + ' ' + plural(v.legDays, 'day', 'days') + '</b>.';
      } else cost.style.display = 'none';
    }
    var half = left <= +v.startLeft / 2;
    put(r, '.b3 .deposit', half
      ? 'On this day, you crossed halfway. <b>' + mf(left) + (money ? '' : ' ' + esc(unitFor(left, v.unit))) + ' left</b>.'
      : 'On this day, <b>' + mf(left) + (money ? '' : ' ' + esc(unitFor(left, v.unit))) + ' left</b>.');
  };

  APPLY['rf-rec'] = function (r, v) {
    var on = +v.on, total = +v.total;
    cnt(r, '.b1 .n', on);
    put(r, '.b1 .sub', esc(unitFor(on, v.word)));
    // PROVENANCE: the grid is the real closed-day log over the window; the
    // empty squares are days that really were empty.
    var cells = '', d = 0, set = v.cells || [];
    for (var i = 0; i < total; i++) {
      var lastOne = i === total - 1;
      cells += '<i class="rc__d">' + (set[i]
        ? '<span class="rc__f' + (lastOne ? ' rc__f--now' : '') + '" style="--d:' + (lastOne ? 1080 : d++ * 18) + 'ms"></span>'
        : '') + '</i>';
    }
    put(r, '.rc__grid', cells);
    cnt(r, '.rc__cost .n', +v.days);
    put(r, '.rc__cost .sub', 'days since the first ' + esc(singular(v.word)));
    put(r, '.rc__note', '<b>' + fmt(on) + '</b> of the last ' + fmt(total) + ' days.');
    put(r, '.b3 .deposit', 'On this day, ' + esc(singular(v.word)) + ' number <b>' + fmt(v.count) + '</b>. The grid remembers every one.');
  };

  // ---------------------------------------------------------------------------
  // THE DATA. One builder per screen, reading the real log. Returns null when
  // the screen cannot be drawn honestly, and the router falls to the next row.
  // ---------------------------------------------------------------------------
  function moveWord(c) {
    // the goal's own unit is the honest noun; otherwise the daily page's word
    if (c.unit && !/^\$/.test(c.unit)) return c.unit;
    return 'moves';
  }

  function legDaysFor(c, wasValue) {
    var stamp = c.marks[String(wasValue)] || c.marks[String(Math.round(wasValue))];
    var from = stamp || c.firstDay;
    return Math.max(0, dayGap(from, c.today));
  }

  var DATA = {};

  DATA['qu-1'] = DATA['qd-1'] = function (c, ev) {
    var gp = c.gp;
    if (gp.target === null || gp.current === null || gp.baseline === null) return null;
    var C = window.MilestoneChooser;
    var dir = C.direction(gp, liveStar());
    var marks = C.milestones(gp, dir);
    var cur = gp.current;
    var below = dir === 'down'
      ? marks.filter(function (m) { return m > cur; })
      : marks.filter(function (m) { return m < cur; });
    var wasV = below.length ? below[below.length - 1] : gp.baseline;
    return {
      start: gp.baseline, goal: gp.target, cur: cur, unit: c.unit,
      marks: marks, legDays: legDaysFor(c, wasV),
      markName: customName(gp, ev && ev.milestone)
    };
  };

  DATA['qu-2'] = function (c, ev) {
    var pts = c.hist.slice();
    if (pts.length < 2) return null;
    var now = (ev && ev.milestone != null) ? ev.milestone : pts[pts.length - 1].value;
    var best = (ev && ev.prev != null) ? ev.prev : null;
    if (best === null) return null;
    // the digit claim must be TRUE (the rig's own rule, kept)
    if (String(Math.floor(now)).length <= String(Math.floor(best)).length) return null;
    var rows = [];
    for (var i = pts.length - 1; i >= 0 && rows.length < 5; i--) {
      rows.push({ label: rows.length === 0 ? monthLabel(pts[i].day) : shortDate(pts[i].day), value: pts[i].value });
    }
    return {
      now: now, best: best, unit: c.unit, rows: rows,
      hidden: Math.max(0, pts.length - rows.length),
      spanDays: Math.max(1, dayGap(pts[0].day, c.today))
    };
  };

  DATA['qu-5'] = function (c, ev) {
    if (!ev || ev.milestone == null || ev.prev == null) return null;
    // the board: the records already stamped, newest first, with their values
    var byDay = {};
    c.hist.forEach(function (p) { byDay[p.day] = p.value; });
    var past = recordsBefore(c, ev);
    var recs = past.slice().reverse().slice(0, 3).map(function (day) {
      return { when: shortDate(day), value: byDay[day] != null ? byDay[day] : ev.prev };
    });
    if (!recs.length) recs = [{ when: 'before this', value: ev.prev }];
    var lastRec = past.length ? past[past.length - 1] : c.firstDay;
    return {
      now: ev.milestone, best: ev.prev, unit: c.unit, records: recs,
      stoodDays: Math.max(0, dayGap(lastRec, c.today))
    };
  };

  DATA['qd-2'] = function (c, ev) {
    if (!ev || ev.milestone == null || ev.prev == null) return null;
    var byDay = {};
    c.hist.forEach(function (p) { byDay[p.day] = p.value; });
    var past = recordsBefore(c, ev);
    var rows = past.slice(-4).map(function (day) {
      return { d: shortDate(day), v: byDay[day] != null ? byDay[day] : ev.prev };
    });
    if (!rows.length) rows = [{ d: shortDate(c.firstDay), v: c.hist.length ? c.hist[0].value : ev.prev }];
    return {
      now: ev.milestone, unit: c.unit, isTime: isTimeUnit(c.unit),
      rows: rows, hidden: Math.max(0, past.length - rows.length)
    };
  };

  DATA['qd-3'] = function (c) {
    var gp = c.gp;
    if (gp.target === null || gp.current === null || gp.baseline === null) return null;
    // A real earlier reading under the line, if one was ever logged. "since
    // 2026" in 2026 says nothing, so the year only earns the clause when it
    // is an earlier year than this one.
    var since = '', thisYear = yearOf(c.today);
    for (var i = 0; i < c.hist.length - 1; i++) {
      if (c.hist[i].value < gp.target) {
        var y = yearOf(c.hist[i].day);
        if (y < thisYear) since = y;
        break;
      }
    }
    return {
      line: gp.target, cur: gp.current, from: gp.baseline, unit: c.unit,
      since: since, days: Math.max(1, dayGap(c.firstDay, c.today))
    };
  };

  DATA['fr-3'] = function (c, ev) {
    if (!ev || ev.milestone == null) return null;
    var since = c.dayKeys.length ? c.dayKeys[0] : c.firstDay;
    return {
      n: ev.milestone, word: moveWord(c), sinceDay: since, today: c.today,
      days: Math.max(1, dayGap(since, c.today))
    };
  };

  function maintenanceWindow(c, days) {
    // the real first held day: the earliest closed record, else the first pulse
    var from = c.dayKeys.length ? c.dayKeys[0] : c.firstDay;
    // never claim a window longer than the days actually credited
    var gap = dayGap(from, c.today);
    if (gap > days + 1 || gap <= 0) {
      var d = dayDate(c.today);
      d.setDate(d.getDate() - days);
      from = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    return from;
  }

  DATA['mt-1'] = function (c, ev) {
    var d = (ev && ev.days) || 0;
    if (d < 1) return null;
    return {
      days: d, milestone: (ev && ev.milestone) || d, bold: (ev && ev.intensity === 'bold'),
      what: '', fromDay: maintenanceWindow(c, d), today: c.today
    };
  };

  DATA['mt-2'] = function (c, ev) {
    // Only honest when they actually promised an end date. Nothing in Clarity
    // records one yet, so this screen stays dormant until that field exists.
    var total = (c.gp && +c.gp.daysTarget) || 0;
    var held = (ev && ev.days) || 0;
    if (!(total > 0) || held < 1) return null;
    var start = maintenanceWindow(c, held);
    var end = dayDate(start);
    end.setDate(end.getDate() + total);
    var endKey = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
    return { total: total, held: held, what: '', startDay: start, endDay: endKey };
  };

  DATA['mt-3'] = function (c, ev) {
    var d = (ev && ev.days) || 0;
    if (d < 1) return null;
    var from = maintenanceWindow(c, d);
    var hard = hardDayKeys(from);
    if (!hard.length) return null;              // no hard days logged, no screen
    return { days: d, hardDates: hard, what: '', fromDay: from, today: c.today };
  };

  DATA['mt-4'] = function (c, ev) {
    var d = (ev && ev.days) || 0;
    if (d < 7) return null;
    return { what: '', fromDay: maintenanceWindow(c, 7), today: c.today };
  };

  DATA['rf-fall'] = function (c, ev) {
    var gp = c.gp;
    if (gp.target === null || gp.current === null || gp.baseline === null) return null;
    var C = window.MilestoneChooser;
    if (C.direction(gp, liveStar()) !== 'down') return null;
    // every mark already stamped, in crossing order, as "Day N | left"
    var marks = C.milestones(gp, 'down');
    var rows = [];
    marks.forEach(function (m) {
      var day = c.marks[String(m)];
      if (!day) return;
      rows.push({ day: Math.max(1, dayGap(c.firstDay, day)), value: Math.abs(m - gp.target), on: day });
    });
    if (rows.length < 2) return null;           // a two-row ledger is not a descent
    rows.unshift({ day: 1, value: Math.abs(gp.baseline - gp.target), on: c.firstDay });
    rows = rows.slice(-4);
    var left = Math.abs(gp.current - gp.target);
    var prevRow = rows.length > 1 ? rows[rows.length - 2] : { value: Math.abs(gp.baseline - gp.target), on: c.firstDay };
    return {
      startLeft: Math.abs(gp.baseline - gp.target), left: left, prevLeft: prevRow.value,
      rows: rows, unit: c.unit,
      lastLeg: Math.max(0, prevRow.value - left),
      // the leg is measured from the PREVIOUS floor's own date, never from the
      // one stamped today (which is always zero days ago)
      legDays: Math.max(0, dayGap(prevRow.on, c.today))
    };
  };

  DATA['rf-rec'] = function (c, ev) {
    if (!c.dayKeys.length) return null;
    var weeks = 12, total = weeks * 7;
    var have = {};
    c.dayKeys.forEach(function (k) { have[k] = 1; });
    var cells = [], on = 0;
    var end = dayDate(c.today);
    for (var i = total - 1; i >= 0; i--) {
      var d = new Date(end.getTime());
      d.setDate(d.getDate() - i);
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var hit = !!have[k];
      cells.push(hit);
      if (hit) on++;
    }
    if (on < 2) return null;
    return {
      on: on, total: total, cells: cells, word: moveWord(c),
      count: (ev && ev.milestone) || on,
      days: Math.max(1, dayGap(c.dayKeys[0], c.today))
    };
  };

  // ---------------------------------------------------------------------------
  // THE ROUTER. One chooser event, one screen (MERGE-2's own table, as a plain
  // object rather than scattered ifs). Each row lists candidates in
  // specific-first order; the ambiguity rule says the more specific screen
  // wins ONCE and the general one stays for next time, so a candidate that has
  // already been seen for this goal steps aside.
  // ---------------------------------------------------------------------------
  function candidates(ev) {
    var fam = ev.family, kind = ev.kind;
    if (fam === 'mt') {
      if (ev.days === 7 || ev.milestone === 7) return ['mt-4', 'mt-1'];
      if (ev.intensity === 'bold' || ev.month) return ['mt-2', 'mt-1'];
      return ['mt-3', 'mt-1'];
    }
    if (fam === 'fr') return ['rf-rec', 'fr-3'];
    if (fam === 'qu') {
      if (kind === 'record') return ['qu-2', 'qu-5'];
      return ['qu-1'];
    }
    if (fam === 'qd') {
      if (kind === 'record') return ['qd-2'];
      if (kind === 'final') return ['qd-3', 'qd-1'];
      return ['rf-fall', 'qd-1'];
    }
    return [];
  }

  // A screen is "spent" once it has been seen for this goal, which is what
  // hands the next event to the general row.
  function seenKey(hash, screen) { return (hash || 'nostar') + '|' + screen; }
  function screenSeen(hash, screen) {
    var st = S();
    var m = st && st.rewards && st.rewards.msScreens;
    return !!(m && m[seenKey(hash, screen)]);
  }
  function markScreenSeen(hash, screen) {
    var st = S();
    if (!st || !st.rewards) return;
    if (!st.rewards.msScreens || typeof st.rewards.msScreens !== 'object') st.rewards.msScreens = {};
    st.rewards.msScreens[seenKey(hash, screen)] = todayKey();
  }

  function pickScreen(c, ev) {
    var list = candidates(ev), fallback = null;
    for (var i = 0; i < list.length; i++) {
      var key = list[i];
      if (!HTML[key] || !DATA[key]) continue;
      var v = null;
      try { v = DATA[key](c, ev); } catch (e) { v = null; }
      if (!v) continue;                                  // cannot be drawn honestly
      var specific = i < list.length - 1;
      if (specific && screenSeen(c.hash, key)) { if (!fallback) fallback = { key: key, v: v }; continue; }
      return { key: key, v: v };
    }
    return fallback;
  }

  // ---------------------------------------------------------------------------
  // THE BEAT DRIVER. Ported from _kit.js: countUp, the tap-advance step, the
  // accent confetti and the M that is never doubled. The gallery's replay is
  // gone (in the app the last tap keeps the moment).
  // ---------------------------------------------------------------------------
  function countUp(el) {
    var p = (el.getAttribute('data-count') || '').split('|');
    var from = +p[0], to = +p[1];
    if (!isFinite(from) || !isFinite(to)) return;
    if (reduced()) { el.textContent = fmt(to); return; }
    var duration = 1200, t0 = null;
    el.textContent = fmt(from);
    function frame(t) {
      if (t0 === null) t0 = t;
      var q = Math.min(1, (t - t0) / duration), e = 1 - Math.pow(1 - q, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (q < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* Accent confetti, the onboarding burst-and-shower mechanic tinted to their
     Memento colour. Fires only where a beat carries data-confetti, which the
     chooser reserves for day-ladder hits and FINAL milestones, so it stays
     rare. Self-kills; skipped entirely under reduced motion. */
  function confetti(root) {
    if (reduced()) return;
    var cv = root.querySelector('.cel-confetti');
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'cel-confetti'; root.appendChild(cv); }
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = root.clientWidth, H = root.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var rgb = getComputedStyle(document.body).getPropertyValue('--accent-rgb').trim() || '43,212,212';
    var p = rgb.split(',').map(Number);
    function sh(f) { return 'rgb(' + p.map(function (ch) { return Math.round(Math.min(255, ch * f + (f > 1 ? (f - 1) * 140 : 0))); }).join(',') + ')'; }
    // the white pieces flip to ink in light mode (white on white is nothing)
    var lite = document.documentElement.classList.contains('theme-light');
    var colors = [sh(1), sh(1.35), sh(.72), lite ? '#1a1d24' : '#ffffff', sh(1.15)];
    var parts = [], t0 = performance.now();
    function burst(ox, oy, count) {
      for (var i = 0; i < count; i++) {
        var ang = Math.random() * Math.PI * 2, sp = 1.6 + Math.random() * 3.2;
        parts.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.4,
          g: .02 + Math.random() * .03, size: 4 + Math.random() * 5, rot: Math.random() * 6.28,
          vr: (Math.random() - .5) * .18, color: colors[(Math.random() * colors.length) | 0],
          life: 0, max: 150 + Math.random() * 120, shape: Math.random() < .5 ? 'r' : 'c' });
      }
    }
    function rainDrop() {
      if (parts.length > 200) return;
      parts.push({ x: Math.random() * W, y: -12,
        vx: (Math.random() - .5) * .5, vy: .7 + Math.random() * .9,
        g: .004 + Math.random() * .006, size: 4 + Math.random() * 5,
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

  /* Every screen carries the M, injected here so it is impossible to double:
     screens whose art already contains the mark get nothing. */
  var M_PATH = 'M150 146 L256 252 L362 146 L362 366 L150 366 Z';
  function ensureMark(root) {
    if (root.querySelector('path[d^="M150 146"]')) return;
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 512 512');
    s.setAttribute('class', 'mark--foot');
    s.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', M_PATH);
    s.appendChild(path); root.appendChild(s);
  }

  // ---------------------------------------------------------------------------
  // THE PAGE.
  // ---------------------------------------------------------------------------
  var live = null;

  function destroy() {
    if (!live) return;
    var l = live;
    live = null;
    try { if (l.teardown) l.teardown(); } catch (e) {}
    try { if (l.root && l.root.parentNode) l.root.parentNode.removeChild(l.root); } catch (e) {}
  }

  // WITNESSED. One stamp per fired event key, written before the page renders.
  function alreadyWitnessed(key) {
    var st = S();
    var seen = st && st.rewards && st.rewards.msSeen;
    return !!(seen && seen[key]);
  }
  function witness(key) {
    var st = S();
    if (!st || !st.rewards) return;
    if (!st.rewards.msSeen || typeof st.rewards.msSeen !== 'object') st.rewards.msSeen = {};
    var seen = st.rewards.msSeen;
    seen[key] = Date.now();
    var keys = Object.keys(seen);
    if (keys.length > 40) {
      keys.sort(function (a, b) { return seen[a] - seen[b]; });
      keys.slice(0, keys.length - 40).forEach(function (k) { delete seen[k]; });
    }
  }

  function show(ev, opts) {
    opts = opts || {};
    if (live) return false;                            // never two
    if (!ev || !ev.key) return false;
    var st = S();
    if (!st) return false;
    if (alreadyWitnessed(ev.key)) return false;        // fired = witnessed = never re-earned

    var c = buildCtx();
    var picked = pickScreen(c, ev);
    if (!picked) return false;                         // nothing honest to draw

    // THE RECEIPTS LAND FIRST (the v1149 law). The chooser already wrote its
    // once-only ledger inside decide(); these two stamps close the loop, and
    // the whole lot is flushed before a single node is created.
    witness(ev.key);
    markScreenSeen(c.hash, picked.key);
    persist();

    var root = document.createElement('div');
    root.className = 'msw';
    root.setAttribute('data-c', picked.key);
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    var stage = document.createElement('div');
    stage.className = 'msw-stage';
    stage.innerHTML = HTML[picked.key];
    root.appendChild(stage);
    var keep = document.createElement('div');
    keep.className = 'keepbtn';
    keep.textContent = 'Keep';
    root.appendChild(keep);

    try { APPLY[picked.key](root, picked.v); } catch (e) {}

    // THE FLOOD (MERGE-2, locked): a BOLD day or a FINAL mark lands in their
    // colour with the dark M. Kit recipe, one rule, no new language.
    var loud = ev.intensity === 'bold' || ev.kind === 'final';
    if (loud) {
      var b1 = stage.querySelector('.b1');
      if (b1) {
        b1.classList.add('b--flood');
        b1.setAttribute('data-confetti', '');          // finals get confetti (law 5)
        var m = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        m.setAttribute('viewBox', '0 0 512 512');
        m.setAttribute('class', 'flood-m');
        m.setAttribute('aria-hidden', 'true');
        var mp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        mp.setAttribute('d', M_PATH);
        m.appendChild(mp);
        b1.insertBefore(m, b1.firstChild);
      }
    }
    ensureMark(root);

    var beats = [].slice.call(stage.querySelectorAll('.b'));
    var idx = -1;
    function step() {
      if (idx >= 0 && beats[idx]) beats[idx].classList.remove('on');
      idx++;
      var b = beats[idx];
      if (!b) return;
      b.classList.add('on');
      [].forEach.call(b.querySelectorAll('[data-count]'), countUp);
      if (b.hasAttribute('data-confetti')) confetti(root);
      if (idx === beats.length - 1) root.classList.add('is-done');
    }

    root.addEventListener('click', function () {
      if (idx >= beats.length - 1) dismiss();
      else step();
    });

    function dismiss() {
      destroy();
      try { if (typeof opts.onDismiss === 'function') opts.onDismiss(); } catch (e) {}
    }

    // Escape and a route change leave with it, like every other fullscreen
    // surface in the app.
    var escKey = function (e) { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', escKey);
    var pop = function () { dismiss(); };
    window.addEventListener('hashchange', pop);

    live = {
      root: root, screen: picked.key,
      teardown: function () {
        document.removeEventListener('keydown', escKey);
        window.removeEventListener('hashchange', pop);
      }
    };

    document.body.appendChild(root);
    step();
    try {
      if (typeof Analytics !== 'undefined' && Analytics.track) {
        Analytics.track('ceremony_shown', { tier: 'milestone', screen: picked.key, family: ev.family, kind: ev.kind });
      }
    } catch (e) {}
    return true;
  }

  // ---------------------------------------------------------------------------
  // THE PULSE PATH. A number they type can cross a mark with no action logged,
  // so the pulse gets the milestone tier too. It runs through the SAME referee
  // (js/26's rewardMoment); there is no second detector anywhere.
  //
  // The finale is left to phase 3: this path renders the 'milestone' tier and
  // nothing else. It cannot pre-empt a finale, because a pulse never carries
  // userSaysDone, so decide() has nothing to fire one with (R5) and writes no
  // receipt. Crossing the finish line by pulse still lands here as the
  // chooser's kind:'final' MARK, which is the screen this phase owns; the
  // finale ceremony above it arrives with phase 3.
  // ---------------------------------------------------------------------------
  function pulse(prevValue) {
    try {
      if (live) return false;
      var moment = G('rewardMoment');
      if (!moment) return false;
      var res = moment({ prevValue: prevValue });
      persist();                                       // the ledger lands before the render
      if (!res || res.tier !== 'milestone' || !res.event) return false;
      return show(res.event);
    } catch (e) { return false; }
  }

  window.MilestoneReward = {
    show: show,
    pulse: pulse,
    dismiss: function () { if (live) destroy(); },
    isOpen: function () { return !!live; },
    SCREENS: Object.keys(HTML)
  };
})();
