/* THE TWEAK LAYER. Malik: "why can't you literally just add toggles and
   sliders inside the actual boxes?" This mounts controls under EVERY gallery
   phone and rewrites that exact screen's DOM live, using the same chooser
   logic the app will use. Edits persist through tap-to-replay because the
   kit clones the live (tweaked) stage. Screens with no numbers get no panel. */
(function () {
  'use strict';
  var C = window.MilestoneChooser;

  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function dur(min) {
    min = Math.round(min);
    var h = Math.floor(min / 60), m = min % 60;
    return h ? h + 'h ' + (m < 10 ? '0' : '') + m + 'm' : m + 'm';
  }
  function dateBack(days) {
    return new Date(Date.now() - days * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function dateAhead(days) {
    return new Date(Date.now() + days * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function esc(s) { var d = document.createElement('i'); d.textContent = s; return d.innerHTML; }
  /* "1 paying users" is a typo (Malik). Singularize the unit's head noun
     when n === 1: the last word normally, the first word for "X of Y"
     phrases (hours of screentime). users->user, dollars->dollar,
     glasses->glass, entries->entry, lbs->lb. */
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
  /* the grand finale's receipts, adapted to the goal's shape; only real,
     logged numbers ever appear (provenance law) */
  function baCost(v) {
    var rows = ['<b>' + fmt(+v.days) + '</b> ' + plural(+v.days, 'day', 'days') + '.'];
    if (+v.moves > 0) rows.push('<b>' + fmt(+v.moves) + '</b> ' + esc(unitFor(+v.moves, v.moveWord)) + '.');
    if (v.shape === 'target') rows.push(fmt(+v.start) + ' &rarr; <b>' + fmt(+v.value) + '</b>.');
    if (v.shape === 'count') rows.push('The target was <b>' + fmt(+v.value) + '</b>. You hit it.');
    return rows.join('<br>');
  }
  function seeded(seed) { return function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }

  function Q(ph, sel) { return ph.querySelector(sel); }
  function put(ph, sel, html) { var el = Q(ph, sel); if (el) el.innerHTML = html; }
  function cnt(ph, sel, to, from) {
    var el = Q(ph, sel); if (!el) return;
    el.setAttribute('data-count', (from == null ? 0 : from) + '|' + to);
    el.textContent = fmt(to);
  }
  /* Malik 2026-08-13: day rungs every 7 days; the big round marks
     (100/200/300/365, then every 100) fire BOLD on their exact day. */
  function ladderHit(n) {
    return n >= C.DAY_STEP ? n - (n % C.DAY_STEP) : null;
  }
  function boldHit(n) {
    var b = null;
    C.BOLD_DAYS.forEach(function (m) { if (n >= m) b = m; });
    if (n >= 465) b = 365 + Math.floor((n - 365) / 100) * 100;
    return b;
  }

  /* control kinds: r = range, n = number, t = text */
  var SPECS = {

    /* ================= QUANTITY UP ================= */
    'qu-1': {
      c: [
        { k: 'start', t: 'n', l: 'Start', v: 0 },
        { k: 'goal', t: 'n', l: 'Goal', v: 100 },
        { k: 'cur', t: 'r', l: 'Today', v: 60, min: 0, max: 100 },
        { k: 'days', t: 'r', l: 'Days in', v: 216, min: 1, max: 900 },
        { k: 'unit', t: 't', l: 'Unit', v: 'paying users' }
      ],
      apply: function (ph, v, ctl) {
        var start = Math.max(0, +v.start), goal = +v.goal, days = +v.days;
        if (goal <= start) goal = start + 1;
        ctl.cur.min = start; ctl.cur.max = goal;
        var cur = Math.min(Math.max(+v.cur, start), goal);
        var span = goal - start, frac = (cur - start) / span;
        var marks = C.milestones({ target: goal, baseline: start }, 'up');
        var passed = marks.filter(function (m) { return cur >= m; });
        var nowMark = passed.length ? passed[passed.length - 1] : null;
        cnt(ph, '.qu1-hero', cur);
        put(ph, '.b1 .sub', esc(unitFor(cur, v.unit)) + '.');
        /* the travelled baseline: progress reads at 3% or 93%, never a dead
           axis before the first fifth (his 17-of-100 catch). The posts sit
           at the CENTERS of equal flex cells, so the line must be mapped
           into that geometry, not drawn as a raw percentage: at 58 of 100 it
           ends just short of the 60 post (his 58-past-60 catch). */
        function xFor(vv) {
          var N = marks.length, cx = function (i) { return (i + 0.5) / N * 100; };
          if (vv <= start) return 0;
          if (vv <= marks[0]) return (vv - start) / (marks[0] - start) * cx(0);
          for (var i = 0; i < N - 1; i++) {
            if (vv <= marks[i + 1]) return cx(i) + (vv - marks[i]) / (marks[i + 1] - marks[i]) * (cx(i + 1) - cx(i));
          }
          return cx(N - 1);
        }
        var gone = Q(ph, '.qu1-gone'); if (gone) gone.style.width = xFor(cur).toFixed(1) + '%';
        var cells = '', labels = '';
        marks.forEach(function (m) {
          var isNow = m === nowMark, isPast = passed.indexOf(m) > -1 && !isNow;
          var hpx = '';
          if (isPast) {
            var k = passed.indexOf(m), n = Math.max(1, passed.length - 1);
            hpx = ' style="--ph:' + Math.round(16 + 6 * (n === 1 ? 0 : k / (n - 1))) + 'px"';
          }
          cells += '<div class="qu1-cell' + (isNow ? ' is-now' : isPast ? ' is-past' : '') + '"' + hpx + '><div class="qu1-p"></div></div>';
          var when = isNow ? 'today' : (passed.indexOf(m) > -1 ? dateBack(Math.round(days * (1 - (m - start) / span))) : '');
          labels += '<div class="qu1-lc' + (isNow ? ' is-now' : passed.indexOf(m) > -1 ? ' is-past' : '') + '"><div class="qu1-num">' + fmt(m) + '</div><div class="qu1-date">' + when + '</div></div>';
        });
        put(ph, '.qu1-marks', cells); put(ph, '.qu1-labels', labels);
        put(ph, '.qu1-sub', '');   /* the days-made-these line: cut, Malik 2026-08-13 */
        /* growth is REAL arithmetic on their own numbers: started at 1, at
           17 today, that is 17x, and it deserves saying (his 1700% point) */
        var mult = start > 0 ? cur / start : 0;
        put(ph, '.qu1-cap', fmt(goal - cur) + ' to go.'
          + (mult >= 2 ? ' ' + (mult >= 10 ? Math.round(mult) : (Math.round(mult * 10) / 10)) + '&times; where you started.' : ''));
        put(ph, '.b3 .deposit', nowMark === null
          ? (cur > start
            ? 'The first move is in: <b>' + fmt(cur - start) + '</b> already, from ' + fmt(start) + '. The first mark waits at ' + fmt(marks[0]) + '.'
            : 'Nothing moved yet. The first mark waits at <b>' + fmt(marks[0]) + '</b>.')
          : 'On this day, you passed <b>' + fmt(nowMark) + ' of ' + fmt(goal) + '</b> ' + esc(unitFor(goal, v.unit)) + '.');
      }
    },

    'qu-2': {
      c: [
        { k: 'now', t: 'n', l: 'This month $', v: 1000 },
        { k: 'best', t: 'n', l: 'Best before $', v: 840 },
        { k: 'months', t: 'r', l: 'Months in', v: 14, min: 2, max: 60 },
        { k: 'src', t: 't', l: 'From', v: 'writing' }
      ],
      apply: function (ph, v) {
        var now = Math.max(1, +v.now), best = Math.max(1, +v.best), m = Math.max(2, +v.months);
        function monthName(back) {
          var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - back);
          return d.toLocaleDateString('en-US', { month: 'long' });
        }
        /* the digit claim must be TRUE: it fires only when today's month has
           more digits than the best before it (his months=2 glitch also
           showed 4 invented history rows; rows now follow the months slider) */
        var crossed = String(Math.floor(now)).length > String(Math.floor(best)).length;
        var th = Math.pow(10, String(Math.floor(now)).length - 1);
        put(ph, '.qu2-hero', '$' + fmt(now));
        put(ph, '.b1 .sub', 'in one month, from ' + esc(v.src) + '.');
        var fr = [1, 0.73, 0.84, 0.42], rows = '';
        rows += '<div class="qu2-row is-new"><span class="qu2-m">' + monthName(0) + '</span><span class="qu2-v">$' + fmt(now) + '</span></div><div class="qu2-line"></div>';
        var past = Math.min(m - 1, 4);
        for (var i = 0; i < past; i++) {
          rows += '<div class="qu2-row"><span class="qu2-m">' + monthName(i + 1) + '</span><span class="qu2-v">$' + fmt(Math.round(best * fr[i])) + '</span></div>';
        }
        put(ph, '.qu2-ledger', rows);
        put(ph, '.qu2-sub', crossed
          ? '<b>' + m + ' months</b> to add a digit.'
          : '<b>' + m + ' months</b> of counting so far.');
        put(ph, '.qu2-cap', '$' + fmt(best) + ' was the best month before it.'
          + (m - 1 > past ? ' (' + (m - 1 - past) + ' earlier months off-screen.)' : ''));
        put(ph, '.b3 .deposit', crossed
          ? 'On this day, you had your first <b>$' + fmt(th) + '</b> month.'
          : (now > best
            ? 'On this day, your best month yet: <b>$' + fmt(now) + '</b>.'
            : 'The best month is still <b>$' + fmt(best) + '</b>. Nothing fires today.'));
      }
    },

    'qu-3': {
      c: [
        { k: 'amt', t: 'n', l: 'Reached $', v: 10000 },
        { k: 'used', t: 'r', l: 'Days it took', v: 281, min: 1, max: 900 },
        { k: 'left', t: 'r', l: 'Days ahead', v: 53, min: 0, max: 400 }
      ],
      apply: function (ph, v) {
        var used = +v.used, left = +v.left, total = used + left;
        put(ph, '.qu3-hero', '$' + fmt(+v.amt));
        put(ph, '.qu3-tag', fmt(left) + ' ' + plural(left, 'day', 'days'));
        var g = Q(ph, '.qu3-done'); if (g) g.style.width = (used / total * 100).toFixed(1) + '%';
        var e = Q(ph, '.qu3-early'); if (e) { e.style.left = (used / total * 100).toFixed(1) + '%'; e.style.width = (left / total * 100).toFixed(1) + '%'; }
        put(ph, '.qu3-ends', '<span>' + dateBack(used) + '</span><span>' + dateAhead(left) + '</span>');
        put(ph, '.qu3-sub', 'You said ' + dateAhead(left) + '. You got there today.');
        put(ph, '.b3 .deposit', 'On this day, you reached <b>$' + fmt(+v.amt) + '</b> a month, ' + fmt(left) + ' days before the date you set.');
      }
    },

    'qu-5': {
      c: [
        { k: 'now', t: 'n', l: 'This week', v: 1412 },
        { k: 'best', t: 'n', l: 'Old best', v: 906 },
        { k: 'stood', t: 'r', l: 'It stood (weeks)', v: 22, min: 1, max: 104 },
        { k: 'rows', t: 'r', l: 'Old records shown', v: 2, min: 1, max: 4 },
        { k: 'unit', t: 't', l: 'Unit', v: 'new followers' }
      ],
      apply: function (ph, v) {
        var now = +v.now, best = +v.best, stood = +v.stood, past = Math.max(1, Math.min(+v.rows, 4));
        var isRec = now > best;
        put(ph, '.qu5-hero', fmt(now));
        put(ph, '.b1 .sub', esc(unitFor(now, v.unit)) + ' this week.');
        /* the board GROWS with the records slider (his catch: the weeks
           control moved dates but the board never expanded), and this week
           only takes the top seat when it actually beat the best */
        var rows = '';
        if (isRec) rows += '<div class="qu5-row is-new"><span class="qu5-when">this week</span><span class="qu5-v">' + fmt(now) + '</span></div>';
        var val = best;
        for (var i = 0; i < past; i++) {
          rows += '<div class="qu5-row"><span class="qu5-when">' + dateBack(stood * 7 + i * 94) + '</span><span class="qu5-v">' + fmt(Math.round(val)) + '</span></div>';
          val *= 0.93;
        }
        if (!isRec) rows += '<div class="qu5-row"><span class="qu5-when">this week</span><span class="qu5-v">' + fmt(now) + '</span></div>';
        put(ph, '.qu5-board', rows);
        put(ph, '.qu5-sub', isRec ? 'Your best week yet.' : 'The record still stands.');
        put(ph, '.qu5-cap', isRec
          ? 'The one it beat stood ' + fmt(stood) + ' ' + plural(stood, 'week', 'weeks') + '.'
          : 'The best is still ' + fmt(best) + ', set ' + fmt(stood) + ' ' + plural(stood, 'week', 'weeks') + ' ago. Nothing fires today.');
        put(ph, '.b3 .deposit', isRec
          ? 'On this day, you set a record. <b>' + fmt(now) + '</b> ' + esc(unitFor(now, v.unit)) + ' in a week.'
          : 'The record to beat is <b>' + fmt(best) + '</b>. This screen waits for the week that takes it.');
      }
    },

    /* ================= QUANTITY DOWN ================= */
    'qd-1': {
      c: [
        { k: 'start', t: 'n', l: 'Start', v: 270 },
        { k: 'goal', t: 'n', l: 'Goal', v: 250 },
        { k: 'cur', t: 'r', l: 'Today', v: 262, min: 250, max: 270 },
        { k: 'days', t: 'r', l: 'Days in', v: 63, min: 1, max: 900 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' }
      ],
      apply: function (ph, v, ctl) {
        var start = +v.start, goal = +v.goal, days = +v.days;
        ctl.cur.min = Math.min(start, goal); ctl.cur.max = Math.max(start, goal);
        var cur = Math.max(Math.min(+v.cur, Math.max(start, goal)), Math.min(start, goal));
        if (start === goal) return;
        var marks = C.milestones({ target: goal, baseline: start }, 'down');
        var passed = marks.filter(function (m) { return cur <= m; });
        var nowMark = passed.length ? passed[passed.length - 1] : null;
        var span = Math.abs(goal - start), frac = Math.abs(cur - start) / span;
        cnt(ph, '.b1 .n', cur, start);
        put(ph, '.b1 .of', esc(unitFor(cur, v.unit)));
        var mid = '<div class="sl__track"></div><div class="sl__gone" style="width:' + (frac * 100).toFixed(1) + '%"></div>';
        marks.forEach(function (m) {
          if (m === goal || m === nowMark) return;
          var p = Math.abs(m - start) / span * 100;
          var lbl = (p > 11 && p < 89) ? '<small>' + fmt(m) + '</small>' : '';
          mid += '<div class="sl__t' + (passed.indexOf(m) > -1 ? ' is-past' : '') + '" style="left:' + p.toFixed(1) + '%">' + lbl + '</div>';
        });
        mid += '<div class="sl__now" style="left:' + (frac * 100).toFixed(1) + '%"><b>' + fmt(cur) + '</b></div>';
        put(ph, '.sl',
          '<div class="sl__endcol"><b>' + fmt(start) + '</b><span>started, ' + dateBack(days) + '</span></div>'
          + '<div class="sl__mid">' + mid + '</div>'
          + '<div class="sl__endcol"><b>' + fmt(goal) + '</b><span>the goal</span></div>');
        var subs = ph.querySelectorAll('.b2 .sub');
        if (subs[0]) subs[0].innerHTML = 'Started at ' + fmt(start) + ', ' + fmt(days) + ' days ago.';
        if (subs[1]) subs[1].innerHTML = fmt(goal) + ' is ' + fmt(Math.abs(cur - goal)) + ' away.';
        put(ph, '.b3 .deposit', cur === start
          ? 'Day one. The road runs ' + fmt(start) + ' to ' + fmt(goal) + '; the first mark is <b>' + fmt(marks[0]) + '</b>.'
          : 'On this day, the scale read <b>' + fmt(cur) + '</b>. Down ' + fmt(Math.abs(start - cur)) + ' from where you started.');
      }
    },

    'qd-2': {
      c: [
        { k: 'now', t: 'r', l: 'Now (min/day)', v: 101, min: 5, max: 600 },
        { k: 'first', t: 'r', l: 'First week (min/day)', v: 380, min: 10, max: 720 },
        { k: 'weeks', t: 'r', l: 'Weeks counting', v: 23, min: 2, max: 80 }
      ],
      apply: function (ph, v) {
        var now = +v.now, first = Math.max(+v.first, now + 5), w = +v.weeks;
        put(ph, '.b1 .n', dur(now));
        put(ph, '.b1 .sub', 'a day on your phone this week. Your lowest week since you started counting.');
        /* the book's row count follows the weeks slider: 3 weeks of counting
           cannot show 4 past records (his dynamic-audit rule) */
        var rows = '', steps = Math.max(1, Math.min(w - 1, 4));
        for (var i = 0; i < steps; i++) {
          var val = first - (first - now) * (i / steps) * 0.92;
          rows += '<div class="lgr"><span class="d">Week of ' + dateBack(Math.round((w - i * (w / (steps + 1))) * 7)) + '</span><span class="v">' + dur(val) + '</span></div>';
        }
        rows += '<div class="lgr lgr--now"><span class="d">this week</span><span class="v">' + dur(now) + '</span></div>';
        put(ph, '.log', rows);
        var subs = ph.querySelectorAll('.b2 .sub');
        if (subs[0]) subs[0].innerHTML = 'Every row here was a record when you set it.' + (w - 1 > steps ? ' (' + (w - 1 - steps) + ' earlier weeks off-screen.)' : '');
        put(ph, '.b3 .deposit', 'On this day, your week came in at <b>' + dur(now) + ' a day</b>. A new low.');
      }
    },

    'qd-3': {
      c: [
        { k: 'line', t: 'n', l: 'They said under', v: 200 },
        { k: 'cur', t: 'n', l: 'Today', v: 199 },
        { k: 'since', t: 't', l: 'Not since', v: '2019' },
        { k: 'days', t: 'r', l: 'Days tracked', v: 96, min: 1, max: 900 },
        { k: 'from', t: 'n', l: 'Started at', v: 214 }
      ],
      apply: function (ph, v) {
        var under = +v.cur < +v.line;
        cnt(ph, '.b1 .n', +v.cur, +v.from);
        cnt(ph, '.b2 .n', +v.cur, +v.from);
        var subs = ph.querySelectorAll('.b2 .sub');
        /* the claim only exists the morning it is TRUE; above the line the
           screen says so instead of congratulating early */
        if (subs[0]) subs[0].innerHTML = under
          ? 'You said you wanted to be under ' + fmt(+v.line) + '. This is the first morning it is true since <b>' + esc(v.since) + '</b>.'
          : 'You said you wanted to be under ' + fmt(+v.line) + '. Not yet: this screen only exists the morning it is true.';
        if (subs[1]) subs[1].innerHTML = fmt(+v.days) + ' days since the scale read ' + fmt(+v.from) + '.';
        put(ph, '.b3 .deposit', under
          ? 'On this day, you weighed <b>' + fmt(+v.cur) + '</b>. First time under ' + fmt(+v.line) + ' since ' + esc(v.since) + '.'
          : 'The line is ' + fmt(+v.line) + '. Today reads <b>' + fmt(+v.cur) + '</b>; the road screens carry this stretch.');
      }
    },

    'qd-4': {
      c: [
        { k: 'start', t: 'n', l: 'Started at $', v: 34000 },
        { k: 'cur', t: 'n', l: 'Left today $', v: 29900 },
        { k: 'pay', t: 'r', l: 'Payments', v: 14, min: 1, max: 200 },
        { k: 'mon', t: 'r', l: 'Months in', v: 7, min: 1, max: 60 }
      ],
      apply: function (ph, v) {
        var start = +v.start, cur = +v.cur, closed = Math.max(0, start - cur);
        var mag = Math.pow(10, Math.max(2, String(Math.max(1, cur)).length - 1));
        var th = Math.ceil((cur + 1) / mag) * mag;
        put(ph, '.b1 .n', fmt(cur));
        put(ph, '.b1 .sub', 'left on the loan.' + (th <= start ? ' Under ' + fmt(th) + ' for the first time.' : ''));
        put(ph, '.fall',
          '<i class="drop"></i>'
          + '<div class="frow"><div class="v v--was">$' + fmt(start) + '</div><div class="d">' + dateBack(+v.mon * 30) + '</div></div>'
          + '<div class="frow"><div class="v">$' + fmt(cur) + '</div><div class="d">today</div></div>');
        var subs = ph.querySelectorAll('.b2 .sub');
        if (subs[0]) subs[0].innerHTML = fmt(+v.pay) + ' ' + plural(+v.pay, 'payment', 'payments') + ' over ' + fmt(+v.mon) + ' ' + plural(+v.mon, 'month', 'months') + '.';
        if (subs[1]) subs[1].innerHTML = '$' + fmt(closed) + ' closed. $' + fmt(cur) + ' open.';
        put(ph, '.b3 .deposit', th <= start
          ? 'On this day, the balance went under <b>$' + fmt(th) + '</b>.'
          : 'On this day, the balance read <b>$' + fmt(cur) + '</b>. $' + fmt(closed) + ' of it is gone.');
      }
    },

    'qd-5': {
      c: [
        { k: 'now', t: 'r', l: 'Now (min/day)', v: 58, min: 5, max: 600 },
        { k: 'then', t: 'r', l: 'Then (min/day)', v: 188, min: 10, max: 720 },
        { k: 'weeks', t: 'r', l: 'Weeks between', v: 11, min: 1, max: 80 }
      ],
      apply: function (ph, v) {
        var now = +v.now, then = Math.max(+v.then, now + 1), w = +v.weeks;
        var ceilH = Math.ceil(now / 60);
        put(ph, '.ceil', '<i></i><span>' + ceilH + 'h</span>');
        put(ph, '.b1 .lead', '<span class="n n--hero">' + (now >= 60 ? Math.floor(now / 60) + 'h ' + (now % 60) : now) + '</span><span class="u">m</span>');
        var backH = Math.round((then - now) * 7 / 60);
        put(ph, '.b2 .lead', '<span class="n n--big" data-count="0|' + backH + '">' + backH + '</span><span class="u--sm">h</span>');
        var subs = ph.querySelectorAll('.b2 .sub');
        if (subs[1]) subs[1].innerHTML = dur(then) + ' a day, ' + w + ' ' + plural(w, 'week', 'weeks') + ' ago.';
        put(ph, '.b3 .deposit', 'On this day, your week averaged <b>' + dur(now) + '</b> a day.' + (now < ceilH * 60 && then >= ceilH * 60 ? ' First week under ' + ceilH + 'h.' : ''));
      }
    },

    /* ================= FREQUENCY ================= */
    'fr-1': {
      c: [
        { k: 'n', t: 'r', l: 'Done this week', v: 4, min: 0, max: 7 },
        { k: 'target', t: 'r', l: 'Target / week', v: 4, min: 1, max: 7 },
        { k: 'word', t: 't', l: 'Word', v: 'Runs' }
      ],
      apply: function (ph, v) {
        var n = +v.n, t = +v.target;
        cnt(ph, '.fr1-count .n', n);
        put(ph, '.fr1-count .fr1-of', 'of ' + t);
        put(ph, '.b1 .sub', esc(v.word) + ' this week.');
        /* no weekday letters (Malik 2026-08-13: simpler, universal) */
        var rnd = seeded(n * 31 + t), week = '';
        var lit = [], pool = [0, 1, 2, 3, 4, 5, 6];
        for (var i = 0; i < Math.min(n, 7); i++) lit.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
        for (var i = 0; i < 7; i++) {
          week += '<div class="fr1-day' + (lit.indexOf(i) > -1 ? ' is-run' : '') + (i === Math.max.apply(null, lit.concat([0])) && n ? ' is-close' : '') + '"><div class="fr1-col"></div></div>';
        }
        put(ph, '.fr1-week', week);
        put(ph, '.b3 .deposit', 'This week, you did <b>' + n + ' of ' + t + '</b>.');
      }
    },

    'fr-2': {
      c: [
        { k: 'w', t: 'r', l: 'Weeks at rate', v: 6, min: 1, max: 52 },
        { k: 'rate', t: 'r', l: 'Rate / week', v: 5, min: 1, max: 7 },
        { k: 'total', t: 'r', l: 'Total count', v: 31, min: 1, max: 500 },
        { k: 'word', t: 't', l: 'Word', v: 'mornings' }
      ],
      apply: function (ph, v) {
        var w = +v.w, rate = +v.rate, total = +v.total;
        cnt(ph, '.b1 .n', w);
        var shown = Math.min(w, 6), rows = '<div class="fr2-line"></div>', rnd = seeded(w * 7 + rate);
        for (var i = 0; i < shown; i++) {
          var hits = Math.min(7, rate + (rnd() < 0.35 ? 1 : 0)), cells = '';
          for (var j = 0; j < 7; j++) cells += '<i class="fr2-c' + (j < hits ? ' f' : '') + '"></i>';
          rows += '<div class="fr2-wk">' + cells + '</div>';
        }
        put(ph, '.fr2-run', rows);
        put(ph, '.b2 .fr2-sub', fmt(total) + ' ' + esc(unitFor(total, v.word)) + ' since ' + dateBack(w * 7) + '. Every week, ' + rate + ' or better.' + (w > shown ? ' (' + (w - shown) + ' earlier weeks off-screen, all counted.)' : ''));
        put(ph, '.b3 .deposit', fmt(w) + ' ' + plural(w, 'week', 'weeks') + ' at rate, <b>' + fmt(total) + ' ' + esc(unitFor(total, v.word)) + '</b>.');
      }
    },

    'fr-3': {
      c: [
        { k: 'n', t: 'r', l: 'Total', v: 50, min: 1, max: 1000 },
        { k: 'days', t: 'r', l: 'Days in', v: 101, min: 1, max: 900 },
        { k: 'word', t: 't', l: 'Word', v: 'runs' }
      ],
      apply: function (ph, v) {
        var n = +v.n, days = +v.days;
        put(ph, '.b1 .cap', 'Total ' + esc(v.word));
        cnt(ph, '.b1 .n', n);
        var shown = Math.min(n, 50), rows = '';
        for (var r = 0; r < Math.ceil(shown / 10); r++) {
          var row = '';
          for (var i = 0; i < Math.min(10, shown - r * 10); i++) {
            var idx = r * 10 + i;
            row += '<i class="fr3-d' + (idx === shown - 1 ? ' last' : '') + '"></i>';
          }
          rows += '<div class="fr3-row">' + row + '</div>';
        }
        put(ph, '.fr3-field', rows);
        put(ph, '.fr3-sub', fmt(n) + ' ' + esc(unitFor(n, v.word)) + ' in <b>' + fmt(days) + ' days</b>.' + (n > 50 ? ' The last 50 drawn.' : ''));
        put(ph, '.b2 .cap', 'Since ' + dateBack(days));
        put(ph, '.b3 .deposit', 'On this day, your <b>' + fmt(n) + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th') + ' ' + esc(singular(v.word)) + '</b>.');
      }
    },

    'fr-4': {
      c: [
        { k: 'w', t: 'r', l: 'Weeks running', v: 14, min: 1, max: 40 },
        { k: 'target', t: 'r', l: 'Target / week', v: 4, min: 1, max: 7 },
        { k: 'away', t: 'r', l: 'Weeks missed', v: 2, min: 0, max: 10 }
      ],
      apply: function (ph, v) {
        var w = +v.w, t = +v.target, awayN = Math.min(+v.away, w - 1);
        var shown = Math.min(w, 14), older = w - shown;
        var rnd = seeded(w * 13 + t + awayN), rows = '', met = 0, total = 0;
        var awaySet = {};
        var pool = []; for (var i = 0; i < shown - 1; i++) pool.push(i);
        for (var i = 0; i < Math.min(awayN, shown - 1); i++) awaySet[pool.splice(Math.floor(rnd() * pool.length), 1)[0]] = 1;
        for (var i = 0; i < shown; i++) {
          var away = !!awaySet[i];
          /* a week either met the rate or was away; the closing week always
             met (that is WHY the screen fired), so the deposit stays true */
          var hits = away ? Math.floor(rnd() * (t / 2)) : t;
          if (!away) met++;
          total += hits;
          var dots = ''; for (var j = 0; j < hits; j++) dots += '<i></i>';
          rows += '<div class="fr4-w' + (away ? ' away' : '') + (i === shown - 1 ? ' now' : '') + '"><span class="wl">' + dateBack((shown - i) * 7) + '</span><span class="wd">' + dots + '</span></div>';
        }
        cnt(ph, '.b1 .n', met);
        put(ph, '.b1 .fr4-sub', 'of the last ' + shown + ' weeks at your rate.');
        put(ph, '.fr4-wks', rows);
        put(ph, '.b2 .fr4-sub', awayN ? 'The ' + plural(awayN, 'week', 'weeks') + ' away ' + plural(awayN, 'is', 'are') + ' just quiet rows. Nothing to make up.' : 'No weeks away in this stretch.');
        put(ph, '.b2 .cap', fmt(total) + ' across ' + w + ' weeks' + (older > 0 ? ' (+ ' + older + ' earlier)' : ''));
        put(ph, '.b3 .deposit', 'This week, you did <b>' + t + ' of ' + t + '</b>. ' + met + ' of the last ' + shown + ' at rate.');
      }
    },

    'fr-5': {
      c: [
        { k: 'kept', t: 'r', l: 'Weeks kept', v: 9, min: 1, max: 30 },
        { k: 'left', t: 'r', l: 'Weeks to the day', v: 7, min: 0, max: 30 },
        { k: 'total', t: 'r', l: 'Total count', v: 27, min: 1, max: 500 },
        { k: 'word', t: 't', l: 'Word', v: 'swims' }
      ],
      apply: function (ph, v) {
        var kept = +v.kept, left = +v.left, total = +v.total;
        cnt(ph, '.b1 .n', kept);
        var cells = '';
        for (var i = 0; i < Math.min(kept, 20); i++) cells += '<i class="fr5-s kept"></i>';
        for (var i = 0; i < Math.min(left, 20); i++) cells += '<i class="fr5-s"></i>';
        cells += '<span class="fr5-end"></span>';
        put(ph, '.fr5-rail', cells);
        put(ph, '.fr5-legend', '<span>' + kept + ' ' + plural(kept, 'week', 'weeks') + ' kept</span><span>race day, ' + dateAhead(left * 7) + '</span>');
        put(ph, '.b2 .fr5-sub', fmt(total) + ' ' + esc(unitFor(total, v.word)) + '. ' + (left ? left + ' ' + plural(left, 'week', 'weeks') + ' between here and the start line.' : 'Race week.'));
        put(ph, '.b3 .deposit', 'This week you kept the rate. <b>' + kept + ' ' + plural(kept, 'week', 'weeks') + ' at rate.</b>');
        put(ph, '.b3 .cap', 'Race day, ' + dateAhead(left * 7));
      }
    },

    /* ================= MAINTENANCE ================= */
    'mt-1': {
      c: [
        { k: 'days', t: 'r', l: 'Days held', v: 100, min: 1, max: 1500 },
        { k: 'what', t: 't', l: 'The line', v: 'sober' }
      ],
      apply: function (ph, v) {
        var d = +v.days, hit = ladderHit(d);
        if (boldHit(d) === d) hit = d;   /* a bold day IS the rung: show it */
        cnt(ph, '.b1 .n', hit || d);
        put(ph, '.b1 .sub', plural(hit || d, 'day', 'days') + ' ' + esc(v.what));
        /* the field of days grows with the count: ~25 days per bar row,
           capped at 8 rows so day 1500 stays composed */
        var rows = Math.max(1, Math.min(8, Math.round((hit || d) / 25))), fh = '';
        for (var i = 0; i < rows; i++) fh += '<div class="mt1-row"></div>';
        put(ph, '.mt1-field', fh);
        put(ph, '.b2 .sub', 'You made the same call on ' + fmt(hit || d) + ' separate ' + plural(hit || d, 'day', 'days') + '.');
        put(ph, '.b2 .cap', dateBack(d) + ' to ' + dateBack(0));
        var bd = boldHit(d);
        put(ph, '.b3 .deposit', bd === d
          ? '<b>Day ' + fmt(d) + '.</b> One of the big ones. The line held.'
          : (hit
            ? '<b>Day ' + fmt(hit) + '!</b> The line held.'
            : '<b>Day ' + fmt(d) + '.</b> Banked. The first ceremony fires at day 7.'));
        put(ph, '.mt1-note', hit
          ? 'No end date on this one. The ' + fmt(hit) + ' days are in the record now, and nothing later takes them out.' + (hit !== d ? ' (Day ' + fmt(d) + ' itself is quiet; the last rung was ' + fmt(hit) + '.)' : '')
          : 'No end date on this one. Every day is in the record from day one; the weekly rhythm starts at day 7.');
      }
    },

    'mt-2': {
      c: [
        { k: 'total', t: 'r', l: 'Days promised', v: 365, min: 7, max: 730 },
        { k: 'held', t: 'r', l: 'Days held', v: 365, min: 1, max: 730 },
        { k: 'what', t: 't', l: 'The rule', v: 'Nothing bought outside food, rent and fuel.' }
      ],
      apply: function (ph, v, ctl) {
        var total = +v.total, held = Math.min(+v.held, total);
        ctl.held.max = total;
        var done = held >= total, pct = Math.round(held / total * 100);
        cnt(ph, '.b1 .n', held);
        var f = Q(ph, '.mt2-fill'); if (f) f.style.width = pct + '%';
        put(ph, '.mt2-dates', '<span>' + dateBack(held) + '</span><span>' + (done ? dateBack(0) : dateAhead(total - held)) + '</span>');
        put(ph, '.b2 .sub', Math.round(total / 30) + ' months. ' + esc(v.what));
        put(ph, '.mt2-line2', done ? 'You picked the end date yourself. It arrived with the rule intact.' : '<b>' + pct + '%</b> of the promise kept so far.');
        put(ph, '.b3 .deposit', done ? '<b>Day ' + fmt(total) + '!</b> The hold held. The goal is complete.' : '<b>Day ' + fmt(held) + '.</b> ' + pct + '% of the way to the date.');
        put(ph, '.mt2-note', done ? 'It closes here. There is nothing left to hold.' : 'The date is ' + dateAhead(total - held) + '.');
      }
    },

    'mt-3': {
      c: [
        { k: 'days', t: 'r', l: 'Days held', v: 30, min: 1, max: 365 },
        { k: 'hard', t: 'r', l: 'Hard days logged', v: 9, min: 0, max: 60 },
        { k: 'what', t: 't', l: 'Without', v: 'a drink' }
      ],
      apply: function (ph, v, ctl) {
        var d = +v.days, hard = Math.min(+v.hard, d);
        ctl.hard.max = Math.min(60, d);
        cnt(ph, '.b1 .n', d);
        put(ph, '.b1 .sub', 'days without ' + esc(v.what));
        var shown = Math.min(d, 30), rnd = seeded(d * 3 + hard), bars = '';
        var hardShown = Math.round(hard * (shown / d)), set = {}, pool = [];
        for (var i = 0; i < shown; i++) pool.push(i);
        for (var i = 0; i < Math.min(hardShown, shown); i++) set[pool.splice(Math.floor(rnd() * pool.length), 1)[0]] = 1;
        for (var i = 0; i < shown; i++) bars += '<span class="mt3-bar' + (set[i] ? ' mt3-h' : '') + '"></span>';
        put(ph, '.mt3-days', bars);
        put(ph, '.b2 .sub', hard ? fmt(hard) + ' of these days you logged as hard. You held on all ' + fmt(hard) + '.' : 'No day was logged hard. Every one counted anyway.');
        put(ph, '.b2 .cap', dateBack(d) + ' to ' + dateBack(0) + (d > shown ? ' (last ' + shown + ' drawn)' : ''));
        put(ph, '.b3 .deposit', '<b>Day ' + fmt(d) + '</b> without ' + esc(v.what) + '. The line held.');
        put(ph, '.mt3-note', hard ? 'The ' + fmt(hard) + ' hard ' + plural(hard, 'day is', 'days are') + ' spent and counted. They do not come back around.' : 'The quiet days count the same as the loud ones.');
      }
    },

    'mt-4': {
      c: [
        { k: 'what', t: 't', l: 'The line', v: 'left it in the kitchen' }
      ],
      apply: function (ph, v) {
        put(ph, '.b2 .sub', 'Seven nights, seven times you ' + esc(v.what) + '.');
        put(ph, '.b2 .cap', dateBack(7) + ' to ' + dateBack(0));
      }
    },

    /* ================= MILESTONE ================= */
    'ms-1': {
      c: [
        { k: 'event', t: 't', l: 'The event', v: 'You got the job!' },
        { k: 'n', t: 'r', l: 'Count', v: 47, min: 1, max: 900 },
        { k: 'word', t: 't', l: 'Count word', v: 'applications' },
        { k: 'days', t: 'r', l: 'Days of looking', v: 271, min: 1, max: 900 }
      ],
      apply: function (ph, v) {
        put(ph, '.ms1-word', esc(v.event));
        cnt(ph, '.ms1-num', +v.n);
        put(ph, '.b2 .sub', esc(unitFor(+v.n, v.word)) + ' since ' + dateBack(+v.days) + '.');
        put(ph, '.ms1-cost', '6 final rounds.<br>' + fmt(+v.days) + ' days of looking.');
        put(ph, '.b3 .deposit', 'On this day, <b>' + esc(v.event.charAt(0).toLowerCase() + v.event.slice(1)) + '</b>');
      }
    },

    'ms-2': {
      c: [
        { k: 'n', t: 'r', l: 'Hours logged', v: 300, min: 1, max: 2000 },
        { k: 'what', t: 't', l: 'Of what', v: 'studying for the boards' }
      ],
      apply: function (ph, v) {
        cnt(ph, '.b1 .n', +v.n);
        put(ph, '.b1 .sub', 'hours of ' + esc(v.what) + '.');
      }
    },

    'ms-3': {
      c: [
        { k: 'ahead', t: 'r', l: 'Days ahead', v: 9, min: 0, max: 400 },
        { k: 'days', t: 'r', l: 'Days of work', v: 246, min: 1, max: 900 },
        { k: 'what', t: 't', l: 'The thing', v: 'the manuscript' },
        { k: 'cost', t: 't', l: 'Cost line', v: '71,400 words' }
      ],
      apply: function (ph, v) {
        var a = +v.ahead;
        put(ph, '.ms3-calc',
          '<div class="ms3-row"><span>Your deadline</span><span class="ms3-v">' + dateAhead(a) + '</span></div>'
          + '<div class="ms3-row"><span>You finished</span><span class="ms3-v">' + dateBack(0) + '</span></div>'
          + '<div class="ms3-hr"></div>'
          + '<div class="ms3-row ms3-row--sum"><span>Days ahead</span><span class="ms3-sum">' + fmt(a) + '</span></div>');
        put(ph, '.ms3-cost', fmt(+v.days) + ' days of work. ' + esc(v.cost) + '.');
        put(ph, '.b3 .deposit', 'On this day, <b>you finished ' + esc(v.what) + '</b>, ' + fmt(a) + ' ' + plural(a, 'day', 'days') + ' before your deadline.');
      }
    },

    'ms-5': {
      c: [
        { k: 'time', t: 't', l: 'The minute', v: '4:12pm' },
        { k: 'days', t: 'r', l: 'Days since day one', v: 874, min: 1, max: 2000 },
        { k: 'hours', t: 'r', l: 'Hours logged', v: 1140, min: 0, max: 5000 }
      ],
      apply: function (ph, v) {
        put(ph, '.ms5-stamp', esc(v.time));
        cnt(ph, '.b2 .n', +v.days);
        put(ph, '.ms5-cost', fmt(+v.hours) + ' hours logged.<br>Your third sitting.');
        put(ph, '.b3 .deposit', 'On this day at <b>' + esc(v.time) + '</b>, <b>you passed the bar!</b>');
      }
    },

    /* ================= OPEN ================= */
    'op-1': {
      c: [{ k: 'days', t: 'r', l: 'Days apart', v: 90, min: 1, max: 500 }],
      apply: function (ph, v) {
        var d = +v.days;
        ph.querySelectorAll('.op1-when').forEach(function (el, i) {
          el.textContent = i < 2 ? dateBack(d) : dateBack(0);
        });
        put(ph, '.op1-span', fmt(d) + ' ' + plural(d, 'day', 'days') + ' later');
        put(ph, '.b3 .deposit', '<b>Day ' + fmt(d) + '.</b> Your first entry and today\'s are kept together.');
      }
    },

    'op-2': {
      c: [{ k: 'days', t: 'r', l: 'Days since', v: 180, min: 1, max: 1200 }],
      apply: function (ph, v) {
        var d = +v.days;
        cnt(ph, '.b1 .n', d);
        put(ph, '.b1 .sub', plural(d, 'day', 'days') + ' since you wrote&hellip;');
        put(ph, '.op2-lead', dateBack(d));   /* the date sits UNDER the words (Malik 2026-08-13) */
        put(ph, '.b3 .deposit', '<b>Day ' + fmt(d) + '.</b> ' + (d >= 60 ? Math.round(d / 30) + ' months' : fmt(d) + ' ' + plural(d, 'day', 'days')) + ' on the same sentence.');
      }
    },

    'op-4': {
      c: [
        { k: 'days', t: 'r', l: 'Days carried', v: 30, min: 1, max: 400 },
        { k: 'entries', t: 'r', l: 'Entries written', v: 22, min: 0, max: 500 }
      ],
      apply: function (ph, v) {
        var d = +v.days, e = +v.entries;
        put(ph, '.op4-time', 'Why you wrote it, <b>' + fmt(d) + ' ' + plural(d, 'day', 'days') + ' ago</b>');
        put(ph, '.op4-rc',
          '<div><b data-count="0|' + d + '">' + fmt(d) + '</b><span>' + plural(d, 'day carried', 'days carried') + '</span></div>'
          + '<div><b data-count="0|' + e + '">' + fmt(e) + '</b><span>' + plural(e, 'entry written', 'entries written') + '</span></div>');
        put(ph, '.b3 .deposit', '<b>Day ' + fmt(d) + '.</b> Still yours, in your own words.');
      }
    },

    'op-5': {
      c: [{ k: 'days', t: 'r', l: 'Days open', v: 365, min: 300, max: 2000 }],
      apply: function (ph, v) {
        var d = +v.days;
        put(ph, '.op5-when', 'Written ' + dateBack(d) + (d >= 700 ? '' : ', last year'));
        cnt(ph, '.b2 .n', d);
        put(ph, '.b3 .deposit', '<b>Day ' + fmt(d) + '.</b> Still open.');
      }
    },

    /* ================= THE FOUR PICKED ================= */
    'rf-gap': {
      c: [
        { k: 'goal', t: 'n', l: 'Goal', v: 100 },
        { k: 'cur', t: 'r', l: 'Today', v: 60, min: 1, max: 100 },
        { k: 'prev', t: 'r', l: 'Last mark', v: 40, min: 0, max: 100 },
        { k: 'daysLast', t: 'r', l: 'Days for the last leg', v: 26, min: 1, max: 400 },
        { k: 'unit', t: 't', l: 'Unit', v: 'paying users' }
      ],
      apply: function (ph, v, ctl) {
        var goal = Math.max(2, +v.goal), cur = Math.min(+v.cur, goal), prev = Math.min(+v.prev, cur);
        ctl.cur.max = goal; ctl.prev.max = goal;
        cnt(ph, '.b1 .n', cur, prev);
        put(ph, '.b1 .sub', esc(unitFor(cur, v.unit)));
        put(ph, '.gp__scale', '<span>0</span><span>' + fmt(goal) + '</span>');
        var f = Q(ph, '.gp__fill'); if (f) f.style.width = (cur / goal * 100).toFixed(1) + '%';
        var wm = Q(ph, '.gp__was'); if (wm) wm.style.left = (prev / goal * 100).toFixed(1) + '%';
        var nm = Q(ph, '.gp__now'); if (nm) nm.style.left = (cur / goal * 100).toFixed(1) + '%';
        put(ph, '.gp__row', '<span><b>' + fmt(cur) + '</b> closed</span><span><b>' + fmt(goal - cur) + '</b> to go</span>');
        put(ph, '.gp__cost', '<b>' + fmt(+v.daysLast) + ' days</b> closed the last ' + fmt(cur - prev) + '.');
        put(ph, '.b3 .deposit', 'On this day, you passed <b>' + fmt(cur) + ' ' + esc(unitFor(cur, v.unit)) + '</b>.');
        put(ph, '.gp__open', fmt(goal - cur) + ' to go.');
      }
    },

    'rf-fall': {
      c: [
        { k: 'startLeft', t: 'n', l: 'Left on day 1', v: 24 },
        { k: 'left', t: 'r', l: 'Left today', v: 12, min: 0, max: 24 },
        { k: 'days', t: 'r', l: 'Days in', v: 84, min: 1, max: 900 },
        { k: 'daysLast', t: 'r', l: 'Days for last leg', v: 26, min: 1, max: 400 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' }
      ],
      apply: function (ph, v, ctl) {
        var s = +v.startLeft, left = Math.min(+v.left, s), d = +v.days;
        ctl.left.max = s;
        cnt(ph, '.fl__n', left, Math.min(s, left + 4));
        put(ph, '.fl__sub', esc(unitFor(left, v.unit)) + ' to go');
        var steps = [s, Math.round(s - (s - left) / 3), Math.round(s - 2 * (s - left) / 3), left];
        var dsteps = [1, Math.round(d / 3), Math.round(2 * d / 3), d], rows = '';
        rows += '<div class="fl__hd"><span></span><span>' + esc(v.unit) + ' left</span></div>';
        for (var i = 0; i < 4; i++) {
          rows += '<div class="fl__row' + (i === 3 ? ' fl__row--now' : '') + '" style="--d:' + (60 + i * 120) + 'ms"><span class="fl__day">Day ' + fmt(dsteps[i]) + '</span><span class="fl__v">' + fmt(steps[i]) + '</span></div>';
        }
        put(ph, '.fl__led', rows);
        put(ph, '.fl__cost', 'The last ' + fmt(steps[2] - left) + ' took <b>' + fmt(+v.daysLast) + ' days</b>.');
        var half = left <= s / 2;
        put(ph, '.b3 .deposit', half
          ? 'On this day, you crossed halfway. <b>' + fmt(left) + ' ' + esc(unitFor(left, v.unit)) + ' left</b>.'
          : 'On this day, <b>' + fmt(left) + ' ' + esc(unitFor(left, v.unit)) + ' left</b>.');
      }
    },

    'rf-rec': {
      c: [
        { k: 'on', t: 'r', l: 'Days showed up', v: 50, min: 0, max: 84 },
        { k: 'weeks', t: 'r', l: 'Weeks shown', v: 12, min: 1, max: 12 },
        { k: 'word', t: 't', l: 'Word', v: 'runs' }
      ],
      apply: function (ph, v, ctl) {
        var weeks = +v.weeks, total = weeks * 7;
        ctl.on.max = total;
        var on = Math.min(+v.on, total);
        cnt(ph, '.b1 .n', on);
        put(ph, '.b1 .sub', esc(unitFor(on, v.word)));
        var rnd = seeded(on * 11 + weeks), idx = [];
        for (var i = 0; i < total; i++) idx.push(i);
        for (var i = total - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t2 = idx[i]; idx[i] = idx[j]; idx[j] = t2; }
        var set = {}; for (var i = 0; i < on; i++) set[idx[i]] = 1;
        if (on > 0) set[total - 1] = 1;
        var cells = '', d = 0;
        for (var i = 0; i < total; i++) {
          cells += '<i class="rc__d">' + (set[i] ? '<span class="rc__f' + (i === total - 1 ? ' rc__f--now' : '') + '" style="--d:' + (d++ * 18) + 'ms"></span>' : '') + '</i>';
        }
        put(ph, '.rc__grid', cells);
        var cost = Q(ph, '.rc__cost'); if (cost) cost.innerHTML = '<b>' + fmt(on) + '</b> of the last ' + fmt(total) + ' days.';
        put(ph, '.b3 .deposit', 'On this day, ' + esc(singular(v.word)) + ' number <b>' + fmt(on) + '</b>. The grid remembers every one.');
      }
    },

    /* ================= BIG ASS CELEBRATIONS (the grand finale) ================= */
    'ba-1': {
      c: [
        { k: 'shape', t: 's', l: 'Goal shape', v: 'target', o: [
          { v: 'target', l: 'target hit (weight, debt)' },
          { v: 'count', l: 'count done (100 sessions)' },
          { v: 'duration', l: 'duration held (no-buy year)' },
          { v: 'event', l: 'event done (passed the bar)' } ] },
        { k: 'line', t: 't', l: 'The goal, their words', v: 'Lost 30 lbs' },
        { k: 'start', t: 'n', l: 'Start number', v: 230 },
        { k: 'value', t: 'n', l: 'Final number', v: 200 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' },
        { k: 'days', t: 'r', l: 'Days it took', v: 126, min: 1, max: 900 },
        { k: 'moves', t: 'r', l: 'Moves logged', v: 215, min: 0, max: 2000 },
        { k: 'moveWord', t: 't', l: 'Move word', v: 'weigh-ins' }
      ],
      apply: function (ph, v) {
        put(ph, '.ba1-line', esc(v.line) + '.');
        put(ph, '.ba1-cost', baCost(v));
        put(ph, '.ba1-etch', esc(v.line) + '.');
      }
    },

    'ba-2': {
      c: [
        { k: 'shape', t: 's', l: 'Goal shape', v: 'target', o: [
          { v: 'target', l: 'target hit (weight, debt)' },
          { v: 'count', l: 'count done (100 sessions)' },
          { v: 'duration', l: 'duration held (no-buy year)' },
          { v: 'event', l: 'event done (passed the bar)' } ] },
        { k: 'line', t: 't', l: 'The goal, their words', v: 'Lost 30 lbs' },
        { k: 'start', t: 'n', l: 'Start number', v: 230 },
        { k: 'value', t: 'n', l: 'Final number', v: 200 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' },
        { k: 'days', t: 'r', l: 'Days it took', v: 126, min: 1, max: 900 },
        { k: 'moves', t: 'r', l: 'Moves logged', v: 215, min: 0, max: 2000 },
        { k: 'moveWord', t: 't', l: 'Move word', v: 'weigh-ins' }
      ],
      apply: function (ph, v) {
        put(ph, '.ba2-cost', baCost(v));
        put(ph, '.ba2-line', esc(v.line) + '.');
      }
    },

    'ba-3': {
      c: [
        { k: 'shape', t: 's', l: 'Goal shape', v: 'target', o: [
          { v: 'target', l: 'target hit (weight, debt)' },
          { v: 'count', l: 'count done (100 sessions)' },
          { v: 'duration', l: 'duration held (no-buy year)' },
          { v: 'event', l: 'event done (passed the bar)' } ] },
        { k: 'line', t: 't', l: 'The goal, their words', v: 'Lost 30 lbs' },
        { k: 'start', t: 'n', l: 'Start number', v: 230 },
        { k: 'value', t: 'n', l: 'Final number', v: 200 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' },
        { k: 'days', t: 'r', l: 'Days it took', v: 126, min: 1, max: 900 },
        { k: 'moves', t: 'r', l: 'Moves logged', v: 215, min: 0, max: 2000 },
        { k: 'moveWord', t: 't', l: 'Move word', v: 'weigh-ins' }
      ],
      apply: function (ph, v) {
        var sh = v.shape, unit;
        if (sh === 'target') { unit = esc(unitFor(+v.value, v.unit)) + '. The number you named.'; cnt(ph, '.ba3-hero', +v.value, +v.start); }
        else if (sh === 'count') { unit = esc(unitFor(+v.value, v.unit)) + '. Every one logged.'; cnt(ph, '.ba3-hero', +v.value, 0); }
        else if (sh === 'duration') { unit = plural(+v.days, 'day', 'days') + ' held, start to finish.'; cnt(ph, '.ba3-hero', +v.days, 0); }
        else { unit = plural(+v.days, 'day', 'days') + ' from the day you named it.'; cnt(ph, '.ba3-hero', +v.days, 0); }
        put(ph, '.ba3-unit', unit);
        put(ph, '.ba3-rows', baCost(v));
        put(ph, '.ba3-line', esc(v.line) + '.');
      }
    },

    'ba-4': {
      c: [
        { k: 'shape', t: 's', l: 'Goal shape', v: 'target', o: [
          { v: 'target', l: 'target hit (weight, debt)' },
          { v: 'count', l: 'count done (100 sessions)' },
          { v: 'duration', l: 'duration held (no-buy year)' },
          { v: 'event', l: 'event done (passed the bar)' } ] },
        { k: 'line', t: 't', l: 'The goal, their words', v: 'Lost 30 lbs' },
        { k: 'start', t: 'n', l: 'Start number', v: 230 },
        { k: 'value', t: 'n', l: 'Final number', v: 200 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' },
        { k: 'days', t: 'r', l: 'Days it took', v: 126, min: 1, max: 900 },
        { k: 'moves', t: 'r', l: 'Moves logged', v: 215, min: 0, max: 2000 },
        { k: 'moveWord', t: 't', l: 'Move word', v: 'weigh-ins' }
      ],
      apply: function (ph, v) {
        put(ph, '.ba4-word', esc(v.line) + '.');
        put(ph, '.ba4-cost', baCost(v));
      }
    },

    'ba-5': {
      c: [
        { k: 'shape', t: 's', l: 'Goal shape', v: 'target', o: [
          { v: 'target', l: 'target hit (weight, debt)' },
          { v: 'count', l: 'count done (100 sessions)' },
          { v: 'duration', l: 'duration held (no-buy year)' },
          { v: 'event', l: 'event done (passed the bar)' } ] },
        { k: 'line', t: 't', l: 'The goal, their words', v: 'Lost 30 lbs' },
        { k: 'start', t: 'n', l: 'Start number', v: 230 },
        { k: 'value', t: 'n', l: 'Final number', v: 200 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' },
        { k: 'days', t: 'r', l: 'Days it took', v: 126, min: 1, max: 900 },
        { k: 'moves', t: 'r', l: 'Moves logged', v: 215, min: 0, max: 2000 },
        { k: 'moveWord', t: 't', l: 'Move word', v: 'weigh-ins' }
      ],
      apply: function (ph, v) {
        var sh = v.shape, marks = 0, endsL, endsR;
        if (sh === 'target' && +v.start !== +v.value) {
          var dir = +v.value < +v.start ? 'down' : 'up';
          marks = C.milestones({ target: +v.value, baseline: +v.start }, dir).length;
          endsL = '<b>' + fmt(+v.start) + '</b> started'; endsR = '<b>' + fmt(+v.value) + '</b> today';
        } else if (sh === 'count') {
          marks = Math.floor(+v.value / C.COUNT_STEP);
          endsL = '<b>0</b> started'; endsR = '<b>' + fmt(+v.value) + '</b> done';
        } else {
          marks = Math.floor(+v.days / C.DAY_STEP);
          endsL = '<b>day 1</b>'; endsR = '<b>day ' + fmt(+v.days) + '</b>';
        }
        var shown = Math.min(marks, 12), mks = '';
        for (var i = 1; i <= shown; i++) {
          mks += '<i class="ba5-mk" style="left:' + (i / (shown + 1) * 100).toFixed(1) + '%;animation-delay:' + (0.4 + 1.9 * i / (shown + 1)).toFixed(2) + 's"></i>';
        }
        put(ph, '.ba5-marks', mks);
        put(ph, '.ba5-ends', '<span>' + endsL + '</span><span>' + endsR + '</span>');
        put(ph, '.ba5-cost', '<b>' + fmt(marks) + '</b> ' + plural(marks, 'mark', 'marks') + ' passed.<br>' + baCost(v));
        put(ph, '.ba5-line', esc(v.line) + '.');
      }
    }

  };


  /* ---------- FIRE / SILENT ----------
     The rig's honest line, merged onto every gallery screen (Malik
     2026-08-13): while you tweak, this says whether the ceremony would
     actually FIRE at this state or stay quiet, from the same chooser
     rules the app will use. */
  function roadFire(start, goal, cur, dir) {
    if (start === goal) return 'Start and goal are the same number; nothing to celebrate.';
    var marks = C.milestones({ target: goal, baseline: start }, dir);
    var passed = marks.filter(function (m) { return dir === 'down' ? cur <= m : cur >= m; });
    if (cur === goal) return '<b>The goal itself.</b> This fires as the FINAL, and the grand finale outranks it.';
    if (marks.indexOf(cur) > -1) return '<b>' + fmt(cur) + ' is a mark.</b> This ceremony fires today, once ever.';
    var next = null;
    for (var i = 0; i < marks.length; i++) if (dir === 'down' ? marks[i] < cur : marks[i] > cur) { next = marks[i]; break; }
    if (passed.length === 0 && cur !== start) return 'Off the baseline: the FIRST-MOVE moment fires once; the first mark waits at <b>' + fmt(marks[0]) + '</b>.';
    return 'Silent at ' + fmt(cur) + '. Next ceremony at <b>' + fmt(next === null ? goal : next) + '</b>.';
  }
  function dayFire(d) {
    var bd = boldHit(d), hit = ladderHit(d);
    if (bd === d) return '<b>Day ' + fmt(d) + ' is a BOLD rung.</b> The big round marks (100 / 200 / 300 / 365, then every 100) hit harder.';
    if (hit === d) return '<b>Day ' + fmt(d) + ' is a rung.</b> A quiet weekly step; fires once ever.';
    if (hit === null) return 'Before day 7 nothing fires; the first rung needs a week.';
    return 'Day ' + fmt(d) + ' is quiet. Last rung was ' + fmt(hit) + '; the weekly rhythm decides.';
  }
  var FIRES = {
    'qu-1': function (v) { return roadFire(+v.start, +v.goal, Math.min(Math.max(+v.cur, +v.start), +v.goal), 'up'); },
    'qd-1': function (v) { return roadFire(+v.start, +v.goal, Math.max(Math.min(+v.cur, +v.start), +v.goal), 'down'); },
    'qu-2': function (v) {
      var crossed = String(Math.floor(Math.max(1, +v.now))).length > String(Math.floor(Math.max(1, +v.best))).length;
      return crossed ? '<b>A new digit.</b> This fires today, the day the month first outgrew every month before it.'
                     : 'Silent: $' + fmt(+v.now) + ' has the same digits as the best before it. This screen waits.';
    },
    'qu-5': function (v) {
      var now = +v.now, best = +v.best, margin = Math.max(1, best * 0.02);
      return now >= best + margin ? '<b>A record.</b> Beats the old best by 2%+ ; fires at most once a week (L8).'
        : 'Silent: ' + fmt(now) + ' does not clear ' + fmt(best) + ' by the 2% margin. The record stands.';
    },
    'qd-2': function (v) {
      return '<b>A new low.</b> Fires only when the week IS the lowest yet (2% rule, decimal-safe), at most once a week.';
    },
    'qu-3': function (v) { return +v.left > 0 ? '<b>Fires on arrival:</b> the goal reached ' + fmt(+v.left) + ' days early. Once ever.' : '<b>Fires on arrival</b>, right on the date.'; },
    'qd-3': function (v) { return +v.cur < +v.line ? '<b>Fires this morning:</b> the first time under ' + fmt(+v.line) + '. Once ever.' : 'Silent: this screen only exists the morning the number is under ' + fmt(+v.line) + '.'; },
    'qd-4': function (v) { return roadFire(+v.start, 0, Math.max(0, +v.cur), 'down'); },
    'qd-5': function (v) { return '<b>A new low average.</b> Fires on records only (2% rule), never on an ordinary week.'; },
    'fr-1': function (v) { return +v.n >= +v.target ? '<b>The week met the rate</b> (' + v.n + ' of ' + v.target + '): fires when the week closes.' : 'Silent: ' + v.n + ' of ' + v.target + ' so far. An unmet week is never shown as a ceremony.'; },
    'fr-2': function (v) { var w = +v.w; return ladderHit(w) === w ? '<b>' + w + ' weeks is a rung</b> (every 7): fires as the run of weeks grows.' : 'Silent at ' + w + ' weeks; next rung at ' + (Math.floor(w / 7) + 1) * 7 + ' weeks.'; },
    'fr-3': function (v) { var n = +v.n; return n % C.COUNT_STEP === 0 ? '<b>' + fmt(n) + ' is a rung.</b> Unit totals fire every ' + C.COUNT_STEP + '.' : 'Silent at ' + fmt(n) + '. Next ceremony at <b>' + fmt((Math.floor(n / C.COUNT_STEP) + 1) * C.COUNT_STEP) + '</b>.'; },
    'fr-4': function (v) { return '<b>Fires when a week closes at rate.</b> Weeks away are quiet rows, never a funeral.'; },
    'fr-5': function (v) { return +v.left === 0 ? '<b>Race week.</b> The deadline arrives with the rate kept: this fires as a FINAL.' : 'Fires when a week closes at rate; ' + v.left + ' ' + (+v.left === 1 ? 'week' : 'weeks') + ' to the day.'; },
    'mt-1': function (v) { return dayFire(+v.days); },
    'mt-2': function (v) { return +v.held >= +v.total ? '<b>The promised date arrived with the rule intact.</b> Fires as a FINAL; the grand finale outranks it.' : dayFire(+v.held); },
    'mt-3': function (v) { return dayFire(+v.days); },
    'mt-4': function (v) { return '<b>Day 7 exactly.</b> The first-seven moment fires once, then the weekly rhythm takes over.'; },
    'ms-1': function (v) { return '<b>Fires when they mark it done.</b> A binary event has no partial credit.'; },
    'ms-2': function (v) { return '<b>Fires when they mark it done.</b> The engine numbers are whatever they actually logged.'; },
    'ms-3': function (v) { return '<b>Fires on arrival</b>, ' + fmt(+v.days) + ' days before the date they set.'; },
    'ms-5': function (v) { return '<b>Fires when they mark it done;</b> the minute is stamped from the actual tap.'; },
    'op-1': function (v) { var d = +v.days; return d < 28 ? 'Before day 28 there is no "then" worth holding up; silent.' : (ladderHit(d) === d ? '<b>Day ' + fmt(d) + ' is a rung:</b> the then-vs-now moment fires.' : 'Day ' + fmt(d) + ' is not a rung; the pair waits.'); },
    'op-2': function (v) { return dayFire(+v.days); },
    'op-4': function (v) { return dayFire(+v.days); },
    'op-5': function (v) { return dayFire(+v.days); },
    'rf-gap': function (v) { return roadFire(0, Math.max(2, +v.goal), Math.min(+v.cur, Math.max(2, +v.goal)), 'up'); },
    'rf-fall': function (v) { return roadFire(+v.startLeft, 0, Math.min(+v.left, +v.startLeft), 'down'); },
    'rf-rec': function (v) { return '<b>Fires on rungs of the count</b> (every ' + C.COUNT_STEP + '), drawn from real logged days only.' },
    'ba-1': baFire, 'ba-2': baFire, 'ba-3': baFire, 'ba-4': baFire, 'ba-5': baFire
  };
  function baFire() {
    return '<b>The top of the pyramid.</b> Fires ONCE, the day the goal itself is done; it outranks the milestone and the daily, and nothing else shows that day.';
  }

  /* ---------- DAY ONE ----------
     Malik: one tap shows what every screen looks like on day 1, the honest
     version, including screens that would refuse to fire that early. Each
     entry is a patch over the current values (functions see them, so day 1
     of a 270-start weight goal is 270, not a hardcoded number). */
  var DAY1 = {
    'qu-1': function (v) { return { cur: (+v.start || 0) + 1, days: 1 }; },
    'qu-2': function () { return { now: 12, best: 9, months: 2 }; },
    'qu-3': function () { return { used: 1, left: 179 }; },
    'qu-5': function () { return { now: 5, best: 4, stood: 1, rows: 1 }; },
    'qd-1': function (v) { return { cur: +v.start, days: 1 }; },
    'qd-2': function (v) { return { now: Math.max(5, +v.first - 10), weeks: 2 }; },
    'qd-3': function (v) { return { cur: +v.from, days: 1 }; },
    'qd-4': function (v) { return { cur: +v.start, pay: 1, mon: 1 }; },
    'qd-5': function (v) { return { now: Math.max(5, +v.then - 1), weeks: 1 }; },
    'fr-1': function () { return { n: 1 }; },
    'fr-2': function () { return { w: 1, total: 1 }; },
    'fr-3': function () { return { n: 1, days: 1 }; },
    'fr-4': function () { return { w: 1, away: 0 }; },
    'fr-5': function () { return { kept: 1, total: 1 }; },
    'mt-1': function () { return { days: 1 }; },
    'mt-2': function () { return { held: 1 }; },
    'mt-3': function () { return { days: 1, hard: 0 }; },
    'ms-1': function () { return { n: 1, days: 1 }; },
    'ms-2': function () { return { n: 1 }; },
    'ms-3': function () { return { days: 1 }; },
    'ms-5': function () { return { days: 1, hours: 1 }; },
    'op-1': function () { return { days: 1 }; },
    'op-2': function () { return { days: 1 }; },
    'op-4': function () { return { days: 1, entries: 1 }; },
    'op-5': function () { return { days: 365 }; },
    'rf-gap': function () { return { cur: 1, prev: 0, daysLast: 1 }; },
    'rf-fall': function (v) { return { left: +v.startLeft, days: 1, daysLast: 1 }; },
    'rf-rec': function () { return { on: 1, weeks: 1 }; }
  };

  /* ---------- mount ---------- */
  function mount(ph) {
    var key = ph.getAttribute('data-c'), spec = SPECS[key];
    if (!spec) return;
    var box = document.createElement('div');
    box.className = 'tw';
    box.innerHTML = '<div class="tw__t">FUCK WITH THIS SCREEN</div>';
    var vals = {}, ctls = {}, outs = {};
    spec.c.forEach(function (c) { vals[c.k] = c.v; });
    var fireEl = null;
    function applyNow() {
      try { spec.apply(ph, vals, ctls); } catch (e) { /* a bad value never breaks the page */ }
      if (fireEl && FIRES[key]) {
        try { fireEl.innerHTML = FIRES[key](vals) || ''; } catch (e) { fireEl.innerHTML = ''; }
      }
    }
    function setMany(patch) {
      for (var k in patch) {
        vals[k] = patch[k];
        if (ctls[k]) ctls[k].value = patch[k];
        if (outs[k]) outs[k].textContent = fmt(+patch[k]);
      }
      applyNow();
    }
    var d1 = DAY1[key];
    if (d1) {
      var btns = document.createElement('div');
      btns.className = 'tw__btns';
      var b1 = document.createElement('button'); b1.type = 'button'; b1.textContent = 'Day 1';
      b1.addEventListener('click', function () { setMany(d1(vals)); });
      var b2 = document.createElement('button'); b2.type = 'button'; b2.textContent = 'Reset';
      b2.addEventListener('click', function () {
        var patch = {};
        spec.c.forEach(function (c) { patch[c.k] = c.v; });
        setMany(patch);
      });
      btns.appendChild(b1); btns.appendChild(b2);
      box.appendChild(btns);
    }
    spec.c.forEach(function (c) {
      var lab = document.createElement('label');
      var name = document.createElement('span'); name.className = 'tl'; name.textContent = c.l;
      lab.appendChild(name);
      var inp;
      if (c.t === 's') {
        inp = document.createElement('select');
        (c.o || []).forEach(function (o) {
          var op = document.createElement('option');
          op.value = o.v; op.textContent = o.l; inp.appendChild(op);
        });
      } else {
        inp = document.createElement('input');
        if (c.t === 'r') { inp.type = 'range'; inp.min = c.min; inp.max = c.max; }
        else if (c.t === 'n') { inp.type = 'number'; }
        else { inp.type = 'text'; }
      }
      inp.value = c.v;
      var out = null;
      if (c.t === 'r') { out = document.createElement('b'); out.className = 'to'; out.textContent = fmt(c.v); outs[c.k] = out; }
      inp.addEventListener('input', function () {
        vals[c.k] = inp.value;
        if (out) out.textContent = fmt(+inp.value);
        applyNow();
      });
      ctls[c.k] = inp;
      lab.appendChild(inp); if (out) lab.appendChild(out);
      box.appendChild(lab);
    });
    if (FIRES[key]) { fireEl = document.createElement('div'); fireEl.className = 'tw__fire'; box.appendChild(fireEl); }
    ph.parentNode.insertBefore(box, ph.nextSibling);
    applyNow();
  }

  window.CEL_TWEAKS = {
    init: function () {
      if (!C) return;
      [].forEach.call(document.querySelectorAll('.ph[data-c]'), mount);
    }
  };
})();
