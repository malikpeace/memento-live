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
  function durLong(min) {
    min = Math.round(min);
    var h = Math.floor(min / 60), m = min % 60, out = [];
    if (h) out.push(h + ' ' + (h === 1 ? 'hour' : 'hours'));
    if (m || !h) out.push(m + ' ' + (m === 1 ? 'minute' : 'minutes'));
    return out.join(' ');
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
  /* dollar goals show the $ (Malik 2026-08-14) */
  function isMoney(unit) { return /^\$|dollar/i.test(String(unit || '').trim()); }
  /* FIX 1 (Malik 2026-08-14): a goal is whatever they typed. "You lost 30
     lbs!" is 16 characters, "You paid off all $47,000 of your student loans!"
     is 46, and at a fixed 42px the long one grew 357px tall and fell off the
     phone. The hero line now sizes itself to its own length and widens its
     measure, so any sentence lands. */
  function fitLine(ph, sel, base) {
    var el = Q(ph, sel); if (!el) return;
    var n = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
    if (!n) return;
    /* Malik 2026-08-15: "You lost 30 lbs!" was breaking across two lines for
       no reason. A goal that CAN sit on one line does, even if that means
       coming down a few points; only a sentence too long to hold at a
       readable size is allowed to wrap. */
    var avail = 316, one = avail / (n * 0.52);
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
  }
  /* Malik 2026-08-15: a wall of 1,780 moves used to animate a few hundred and
     then dump the rest in at once, because the per-item delay was capped. The
     delay is DERIVED from the count now, so every item still arrives in turn
     and the whole sweep finishes inside one fixed window, however many there
     are. */
  function sweep(ph, sel, n, windowSec) {
    var el = Q(ph, sel); if (!el) return;
    el.style.setProperty('--step', (Math.max(0.0004, (windowSec || 1.5) / Math.max(1, n))).toFixed(4));
  }
  /* FIX 3: a wall must fit the phone it is drawn on. Shrink the scale until
     the content stops overflowing its own box, so 500 moves never spill off
     the screen and nothing is silently clipped. Returns true if it fits. */
  function fitWall(ph, sel, prop, start, min, step) {
    var el = Q(ph, sel); if (!el) return true;
    var v = start, guard = 0;
    el.style.setProperty(prop, v);
    while (el.scrollHeight > el.clientHeight + 2 && v > min && guard++ < 60) {
      v = Math.round((v - step) * 100) / 100;
      el.style.setProperty(prop, v);
    }
    return el.scrollHeight <= el.clientHeight + 2;
  }
  function visibleCount(ph, wallSel, itemSel) {
    var w = Q(ph, wallSel); if (!w) return 0;
    var wr = w.getBoundingClientRect(), n = 0;
    [].forEach.call(w.querySelectorAll(itemSel), function (it) {
      if (it.getBoundingClientRect().bottom <= wr.bottom + 1) n++;
    });
    return n;
  }
  /* the wall's shared arithmetic: every number derived from their own */
  function wallData(v) {
    /* hours is NOT a field the app records (verified 2026-08-16), so no
       screen may print it. It is gone from every BIG ASS wall. */
    var days = +v.days, moves = +v.moves, streak = +v.streak || 0;
    var weeks = Math.max(1, Math.round(days / 7));
    var perWeek = moves > 0 ? Math.round(moves / weeks * 10) / 10 : 0;
    var money = isMoney(v.unit);
    var mf = function (n) { return (money ? '$' : '') + fmt(n); };
    var marks = 0;
    if (v.shape === 'target' && +v.start !== +v.value) marks = C.milestones({ target: +v.value, baseline: +v.start }, +v.value < +v.start ? 'down' : 'up').length;
    else if (v.shape === 'count') marks = C.COUNT_LADDER.filter(function (c) { return c <= +v.value; }).length;
    else marks = Math.floor(days / 7) + Math.floor(days / 30);
    /* FIX 2: some goals are won with nothing logged at all (an exam passed,
       a deal closed). "0 sittings" is an embarrassing thing to print, and
       printing the move word 874 times when they logged zero of them is a
       lie. When there are no moves the screens fall back to DAYS, in both
       the number and the noun. */
    var hasMoves = moves > 0;
    var count = hasMoves ? moves : days;
    var noun = hasMoves ? (v.moveWord || 'moves') : 'days';
    return { days: days, moves: moves, streak: streak, weeks: weeks,
      perWeek: hasMoves ? perWeek : 0, money: money, mf: mf, marks: marks,
      hasMoves: hasMoves, count: count, noun: noun, unitLabel: unitFor(count, noun),
      one: singular(noun) };
  }
  function seeded(seed) { return function () { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }; }

  function Q(ph, sel) { return ph.querySelector(sel); }
  function put(ph, sel, html) { var el = Q(ph, sel); if (el) el.innerHTML = html; }

  /* The swipe pager for ba-0's stat views. The kit clones the stage on every
     replay, so listeners live on the STABLE .ph via delegation and read the
     current track/dots fresh each time. A real horizontal swipe must not also
     trip the kit's tap-to-replay: since the click target is a descendant of
     .ph, a capture-phase blocker on .ph runs BEFORE the kit's bubble click
     and stops it whenever a swipe just happened. */
  function wirePager(ph) {
    if (ph._pagerWired) return; ph._pagerWired = true;
    var sx = 0, sy = 0, drag = false, dx = 0, base = 0, pw = 1, horiz = false;
    function slideN() { var d = ph.querySelectorAll('.ba0-dot').length; return d || 2; }
    function stepPct() { return 100 / slideN(); }
    function setDots() {
      [].forEach.call(ph.querySelectorAll('.ba0-dot'), function (d, k) { d.classList.toggle('on', k === ph._page); });
    }
    /* ALWAYS snap to a whole page: transform is page * -step, never a partial */
    function pageTo(i, anim) {
      var track = ph.querySelector('.ba0-track'); if (!track) return;
      ph._page = Math.max(0, Math.min(slideN() - 1, i));
      track.style.transition = (anim === false) ? 'none' : '';
      track.style.transform = 'translateX(' + (ph._page * -stepPct()) + '%)';
      setDots();
    }
    ph.addEventListener('pointerdown', function (e) {
      var pg = e.target.closest && e.target.closest('.ba0-pager');
      if (!pg) return;
      drag = true; horiz = false; dx = 0; sx = e.clientX; sy = e.clientY;
      pw = pg.getBoundingClientRect().width || 1;
      base = -(ph._page || 0) * stepPct();
      try { pg.setPointerCapture && pg.setPointerCapture(e.pointerId); } catch (_) {}
    });
    ph.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var mx = e.clientX - sx, my = e.clientY - sy;
      if (!horiz) {
        if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
        horiz = Math.abs(mx) > Math.abs(my);
        if (!horiz) { drag = false; return; }   // a vertical move: let the page scroll
      }
      dx = mx;
      var track = ph.querySelector('.ba0-track'); if (!track) return;
      var pct = base + (mx / pw) * stepPct();
      pct = Math.max(-(slideN() - 1) * stepPct(), Math.min(0, pct));   // rubber-stop at the ends
      track.style.transition = 'none';
      track.style.transform = 'translateX(' + pct + '%)';
      if (e.cancelable) e.preventDefault();
    });
    function end() {
      if (!drag) return; drag = false;
      if (!horiz) return;
      /* snap to the NEAREST page: past ~18% of a slide flips, else spring back */
      var cur = ph._page || 0, target = cur;
      if (dx < -pw * 0.18) target = cur + 1;
      else if (dx > pw * 0.18) target = cur - 1;
      pageTo(target, true);
      if (Math.abs(dx) > 8) { ph._pagerJustSwiped = true; setTimeout(function () { ph._pagerJustSwiped = false; }, 350); }
      dx = 0;
    }
    ph.addEventListener('pointerup', end);
    ph.addEventListener('pointercancel', end);
    ph.addEventListener('click', function (e) {
      var d = e.target.closest && e.target.closest('.ba0-dot');
      if (d) { var dd = [].indexOf.call(ph.querySelectorAll('.ba0-dot'), d); pageTo(dd, true); ph._pagerJustSwiped = true; setTimeout(function () { ph._pagerJustSwiped = false; }, 50); e.stopPropagation(); return; }
      if (ph._pagerJustSwiped) { e.stopPropagation(); return; }
      /* a replay tap: normalise the pager back to slide 0 before the kit
         clones the stage, so the next run starts on the first view */
      if (ph.classList.contains('done')) { pageTo(0, false); }
    }, true);
  }

  /* ba-0 slide A: a 3D sphere of their moves, one point each, turning slowly
     with a little per-point drift so it feels alive. Canvas, so 2,000 points
     stay at 60fps; one loop per phone, drawing only while beat 3 is on. */
  function buildSphere(ph, n) {
    var pts = [], off = 2 / n, inc = Math.PI * (3 - Math.sqrt(5)), rnd = seeded(n * 31 + 7);
    for (var i = 0; i < n; i++) {
      var y = i * off - 1 + off / 2, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * inc;
      pts.push({ x: Math.cos(phi) * r, y: y, z: Math.sin(phi) * r,
        w: (i % 6 === 0), ph: rnd() * 6.2832, amp: 0.012 + rnd() * 0.03 });
    }
    ph._sphere = pts;
    if (ph._sphereLoop) return;
    ph._sphereLoop = true;
    var ang = 0, tilt = 0, fr = 0, born = 0, wasOn = false;
    (function tick() {
      requestAnimationFrame(tick);
      var b3 = ph.querySelector('.b3.on');
      if (!b3) { wasOn = false; return; }
      /* the moves EXPLODE out of the M: each time beat 3 opens, restart the
         expansion so the dots fly from the centre (on the M) out to the sphere */
      if (!wasOn) { wasOn = true; born = fr; }
      var cv = ph.querySelector('.ba0-cv'); if (!cv) return;
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
      var P = ph._sphere, L = P.length, big = L > 900 ? 0.55 : L > 380 ? 0.72 : 1;
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
        var money = isMoney(v.unit);
        var mf = function (n) { return (money ? '$' : '') + fmt(n); };
        var marks = C.milestones({ target: goal, baseline: start }, 'up');
        var passed = marks.filter(function (m) { return cur >= m; });
        var nowMark = passed.length ? passed[passed.length - 1] : null;
        /* the big number rides WITH the road (Malik 2026-08-14), in both beats */
        if (money) { put(ph, '.qu1-hero', mf(cur)); put(ph, '.qu1-hero2', mf(cur)); }
        else { cnt(ph, '.qu1-hero', cur); cnt(ph, '.qu1-hero2', cur); }
        put(ph, '.b1 .sub', esc(unitFor(cur, money ? v.unit.replace(/^\$\s*/, '') || 'dollars' : v.unit)) + '.');
        put(ph, '.qu1-sub2', esc(unitFor(cur, money ? v.unit.replace(/^\$\s*/, '') || 'dollars' : v.unit)));
        /* THE AXIS (Malik 2026-08-16): pure DISTANCE. ~10 sharp ticks spread
           evenly along the span, each one's height grown by its VALUE (the
           left of the road reads small, the right reads tall), a baseline
           with weight, the accent line for today (no "today" text), and
           labels only at the quarters, in a font sized to fit the numbers. */
        var rail = Q(ph, '.qu1-rail');
        if (rail) {
          var frac100 = frac * 100;
          var html = '<div class="qu1-base"></div><div class="qu1-gone" style="width:' + frac100.toFixed(1) + '%"></div>';
          var TICKS = 10, di = 0;
          for (var ti = 0; ti <= TICKS; ti++) {
            var p = ti / TICKS * 100;
            if (Math.abs(p - frac100) < 4) continue;           // the accent line owns this spot
            var hh = Math.round(6 + (ti / TICKS) * 19);        // value-proportional height
            html += '<div class="qu1-t' + (p < frac100 ? ' is-past' : '') + '" style="left:' + p.toFixed(1) +
                    '%;height:' + hh + 'px;--d:' + (di++ * 0.05).toFixed(2) + 's"></div>';
          }
          html += '<div class="qu1-t is-now" style="left:' + frac100.toFixed(1) + '%;height:' +
                  Math.round(10 + frac * 19 + 6) + 'px;--d:' + (di * 0.05).toFixed(2) + 's"></div>';
          rail.innerHTML = html;
        }
        /* labels: the quarters only (start / 25 / 50 / 75 / goal), dates under
           the ones already passed, today's own number bold at its line; any
           quarter within 9% of today steps aside (the collision law). */
        var lwrap = Q(ph, '.qu1-labels');
        if (lwrap) {
          var lfs = String(mf(goal)).length >= 7 ? 10 : String(mf(goal)).length >= 5 ? 11 : 13;
          lwrap.style.setProperty('--lfs', lfs + 'px');
          var lab = '';
          [0, 0.25, 0.5, 0.75, 1].forEach(function (q) {
            var p = q * 100, valQ = Math.round(start + span * q);
            if (Math.abs(p - frac * 100) < 9) return;          // today's number wins the spot
            var isPastQ = frac >= q && q > 0;
            var when = isPastQ ? dateBack(Math.round(days * (1 - q / Math.max(frac, 0.0001)))) : '';
            var edge = q === 0 ? ' qu1-l--a' : q === 1 ? ' qu1-l--z' : '';
            lab += '<div class="qu1-l' + edge + (isPastQ ? ' is-past' : '') + '" style="left:' + p + '%">' +
                   '<div class="qu1-num">' + mf(valQ) + '</div>' +
                   (when ? '<div class="qu1-date">' + when + '</div>' : '') + '</div>';
          });
          lab += '<div class="qu1-l is-now" style="left:' + (frac * 100).toFixed(1) + '%"><div class="qu1-num">' + mf(cur) + '</div></div>';
          lwrap.innerHTML = lab;
        }
        var mult = start > 0 ? cur / start : 0;
        put(ph, '.qu1-cap', mf(goal - cur) + ' to go.'
          + (mult >= 2 ? ' ' + (mult >= 10 ? Math.round(mult) : (Math.round(mult * 10) / 10)) + '&times; where you started.' : ''));
        put(ph, '.b3 .deposit', nowMark === null
          ? (cur > start
            ? 'The first move is in: <b>' + mf(cur - start) + '</b> already, from ' + mf(start) + '. The first mark waits at ' + mf(marks[0]) + '.'
            : 'Nothing moved yet. The first mark waits at <b>' + mf(marks[0]) + '</b>.')
          : 'On this day, you passed <b>' + mf(nowMark) + ' of ' + mf(goal) + '</b>' + (money ? '' : ' ' + esc(unitFor(goal, v.unit))) + '.');
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
        put(ph, '.b1 .sub', esc(unitFor(now, v.unit)) + '. Your best week yet.');
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
          ? 'On this day, you set a record: <b>' + fmt(now) + '</b>. ' + esc(unitFor(now, v.unit)) + '.'
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
        /* THE AXIS (Malik 2026-08-16, same law as qu-1): ~10 sharp ticks by
           pure DISTANCE, heights growing with the road travelled, numbers
           only at the quarters, never within 9% of today's own number. */
        var TICKS = 10;
        for (var ti = 1; ti < TICKS; ti++) {
          var p = ti / TICKS * 100;
          if (Math.abs(p - frac * 100) < 4) continue;           // the accent post owns this spot
          var q4 = ti / TICKS;                                   // fraction of the road
          var showLbl = (ti === 2 || ti === 5 || ti === 8) && Math.abs(p - frac * 100) > 9;
          var valQ = Math.round(start + (goal - start) * q4);
          var lbl = showLbl ? '<small>' + fmt(valQ) + '</small>' : '';
          mid += '<div class="sl__t' + (p < frac * 100 ? ' is-past' : '') + '" style="left:' + p.toFixed(1) +
                 '%;--th:' + Math.round(7 + q4 * 11) + 'px">' + lbl + '</div>';
        }
        mid += '<div class="sl__now" style="left:' + (frac * 100).toFixed(1) + '%"><b>' + fmt(cur) + '</b></div>';
        /* big numbers shrink the type so nothing ever collides */
        var digits = String(fmt(Math.max(Math.abs(start), Math.abs(goal)))).length;
        var sl = Q(ph, '.sl');
        if (sl) {
          sl.style.setProperty('--lfs', (digits >= 6 ? 9.5 : 11) + 'px');
          sl.style.setProperty('--nfs', (digits >= 6 ? 14 : 19) + 'px');
          sl.style.setProperty('--efs', (digits >= 6 ? 12.5 : 15) + 'px');
        }
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
        /* his 2026-08-16 copy: name the record plainly, point forward */
        if (subs[0]) subs[0].innerHTML = 'A list of your records over time' + (w - 1 > steps ? ' (' + (w - 1 - steps) + ' not shown)' : '') + '.';
        if (subs[1]) subs[1].innerHTML = 'You reached a new record! Now let\'s go get another one.';
        put(ph, '.b3 .deposit', 'On this day, your week came in at <b>' + dur(now) + ' a day</b>. A new record.');
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
        if (subs[1]) subs[1].innerHTML = '$' + fmt(closed) + ' closed. $' + fmt(cur) + ' to go.';
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
        if (subs[1]) subs[1].innerHTML = 'You were at ' + durLong(then) + ', ' + w + ' ' + plural(w, 'week', 'weeks') + ' ago.';
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
        /* the field is a 50-box: full fifties become a multiplier (150 runs =
           the box lit whole with a 3x beside it; 125 = 2x and half the box
           lit), Malik 2026-08-14 */
        var fifties = Math.floor(n / 50), rem = n % 50;
        var lit = rem === 0 && n > 0 ? 50 : rem;
        var rows = '';
        for (var r = 0; r < 5; r++) {
          var row = '';
          for (var i = 0; i < 10; i++) {
            var idx = r * 10 + i;
            row += '<i class="fr3-d' + (idx < lit ? '' : ' fr3-off') + (idx === lit - 1 ? ' last' : '') + '"></i>';
          }
          rows += '<div class="fr3-row">' + row + '</div>';
        }
        var multLbl = fifties >= (rem === 0 ? 2 : 1) && n >= 50 ? '<div class="fr3-mult">' + (rem === 0 ? fifties : fifties) + '&times;</div>' : '';
        put(ph, '.fr3-field', '<div class="fr3-box">' + rows + '</div>' + multLbl);
        put(ph, '.fr3-sub', fmt(n) + ' ' + esc(unitFor(n, v.word)) + ' in <b>' + fmt(days) + ' days</b>.' + (n > 50 ? ' Each full box is 50.' : ''));
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
        put(ph, '.b2 .fr4-sub', '');
        put(ph, '.b2 .cap', fmt(total) + ' across ' + w + ' weeks' + (older > 0 ? ' (+ ' + older + ' earlier)' : ''));
        put(ph, '.b3 .deposit', 'This week, you did <b>' + t + ' of ' + t + '</b>.');
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
        put(ph, '.b3 .deposit', done ? '<b>Day ' + fmt(total) + '!</b> The hold held. The goal is complete.' : (held === Math.round(total / 2) ? '<b>Halfway.</b> Day ' + fmt(held) + ' of ' + fmt(total) + '.' : '<b>Day ' + fmt(held) + '.</b> ' + pct + '% of the way to the date.'));
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
        /* every hard day shows (Malik 2026-08-14: 22 hard means you SEE 22),
           written as the dates they actually were */
        var rnd = seeded(d * 3 + hard), offs = [], pool = [];
        for (var i = 0; i < d; i++) pool.push(i);
        for (var i = 0; i < hard; i++) offs.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
        offs.sort(function (a, b) { return a - b; });
        var shown = Math.min(hard, 6), rowsH = '';
        for (var i = 0; i < shown; i++) rowsH += '<div class="mt3-hd">' + dateBack(d - offs[i]) + '</div>';
        if (hard > shown) rowsH += '<div class="mt3-hd mt3-hd--more">and ' + fmt(hard - shown) + ' more</div>';
        put(ph, '.mt3-days', rowsH);
        put(ph, '.b2 .sub', hard ? fmt(hard) + ' of these days you logged as hard. You held on all ' + fmt(hard) + '.' : 'No day was logged hard. Every one counted anyway.');
        put(ph, '.b2 .cap', dateBack(d) + ' to ' + dateBack(0));
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
        { k: 'sess', t: 'r', l: 'Sessions', v: 118, min: 1, max: 1000 },
        { k: 'len', t: 'r', l: 'Minutes each (avg)', v: 152, min: 5, max: 300 },
        { k: 'what', t: 't', l: 'Of what', v: 'studying for the boards' },
        { k: 'since', t: 'r', l: 'Days since the first', v: 220, min: 1, max: 900 },
        { k: 'out', t: 'r', l: 'Days to the event', v: 41, min: 0, max: 400 }
      ],
      apply: function (ph, v) {
        var sess = +v.sess, len = +v.len, hours = Math.round(sess * len / 60);
        cnt(ph, '.b1 .n', hours);
        put(ph, '.b1 .sub', 'hours of ' + esc(v.what) + '.');
        var ticks = Math.min(sess, 120), rail = '';
        for (var i = 0; i < ticks; i++) rail += '<i class="ms2-t' + (i === ticks - 1 ? ' ms2-t--now' : '') + '"></i>';
        put(ph, '.ms2-rail', rail);
        var railSubs = ph.querySelectorAll('.b2 .sub');
        if (railSubs[0]) railSubs[0].innerHTML = fmt(sess) + ' ' + plural(sess, 'session', 'sessions') + ' since ' + dateBack(+v.since) + '. About ' + durLong(len) + ' each.' + (sess > ticks ? ' (Last ' + ticks + ' drawn.)' : '');
        put(ph, '.ms2-ahead', +v.out === 0 ? 'The event is here.' : 'The event is ' + fmt(+v.out) + ' ' + plural(+v.out, 'day', 'days') + ' out.');
        put(ph, '.b3 .deposit', 'On this day, you crossed <b>' + fmt(hours) + ' hours</b> of ' + esc(v.what) + '.');
        put(ph, '.ms2-open', +v.out === 0 ? 'Today is the day it was for.' : 'The event is still ahead.');
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
        var a = +v.ahead, onTime = a === 0;
        put(ph, '.ms3-calc',
          '<div class="ms3-row"><span>Your deadline</span><span class="ms3-v">' + dateAhead(a) + '</span></div>'
          + '<div class="ms3-row"><span>You finished</span><span class="ms3-v">' + dateBack(0) + '</span></div>'
          + '<div class="ms3-hr"></div>'
          + (onTime
            ? '<div class="ms3-row ms3-row--sum"><span></span><span class="ms3-sum">Right on time!</span></div>'
            : '<div class="ms3-row ms3-row--sum"><span>Days ahead</span><span class="ms3-sum">' + fmt(a) + '</span></div>'));
        put(ph, '.ms3-cost', fmt(+v.days) + ' days of work. ' + esc(v.cost) + '.');
        put(ph, '.b3 .deposit', onTime ? 'On this day, <b>you finished ' + esc(v.what) + '</b>. Right on time!' : 'On this day, <b>you finished ' + esc(v.what) + '</b>, ' + fmt(a) + ' ' + plural(a, 'day', 'days') + ' before your deadline.');
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
        /* the hours made visible: one bar per ~50 hours (Malik 2026-08-14) */
        var bars = Math.max(1, Math.min(40, Math.round(+v.hours / 50))), viz = '';
        for (var i = 0; i < bars; i++) viz += '<i></i>';
        put(ph, '.ms5-viz', viz);
        put(ph, '.ms5-cost', fmt(+v.hours) + ' hours logged. Each bar is 50.<br>Your third sitting.');
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

    /* ================= BIG ASS CELEBRATIONS. Nine grand finales; the
       colour lands and STAYS (his 2026-08-14 call), and the walls show
       EVERY move, never a sample. ================================== */

    /* ba-0 "The Grand Finale", Malik's own fusion (2026-08-16): the
       Detonation open + the Crown's rings + the Fireworks climax, then a
       SWIPE between two stat views (the dots and the numbers). */
    'ba-0': {
      c: [
        { k: 'shape', t: 's', l: 'Goal shape', v: 'target', o: [
          { v: 'target', l: 'target hit (weight, debt)' },
          { v: 'count', l: 'count done (100 sessions)' },
          { v: 'duration', l: 'duration held (no-buy year)' },
          { v: 'event', l: 'event done (passed the bar)' } ] },
        { k: 'line', t: 't', l: 'The goal, their words', v: 'You lost 30 lbs' },
        { k: 'start', t: 'n', l: 'Start number', v: 230 },
        { k: 'value', t: 'n', l: 'Final number', v: 200 },
        { k: 'unit', t: 't', l: 'Unit', v: 'lbs' },
        { k: 'days', t: 'r', l: 'Days it took', v: 126, min: 1, max: 900 },
        { k: 'moves', t: 'r', l: 'Moves logged', v: 215, min: 0, max: 2000 },
        { k: 'moveWord', t: 't', l: 'Move word', v: 'weigh-ins' },
        { k: 'streak', t: 'r', l: 'Best streak (days)', v: 41, min: 0, max: 365 },
        { k: 'active', t: 'r', l: 'Days shown up', v: 104, min: 0, max: 900 }
      ],
      apply: function (ph, v) {
        var w = wallData(v);
        /* the goal line, centred (the most important thing), one clean line */
        var lineText = (v.line || '').replace(/\s+/g, ' ').trim();
        put(ph, '.ba0-line', esc(lineText) + (/[!?.]$/.test(lineText) ? '' : '!'));
        var ln = Q(ph, '.ba0-line');
        if (ln) ln.style.fontSize = (lineText.length > 22 ? 30 : lineText.length > 15 ? 35 : 40) + 'px';
        /* beat 1: MANY dots stream in from off the card and spiral into the M
           (Clarity's nsv2FieldSpiral motion), slower now so it feels special. */
        var mr = seeded(19), mot = '';
        for (var m = 0; m < 60; m++) {
          var ma = (mr() * 360).toFixed(0), mrad = (210 + mr() * 180).toFixed(0),
              ms = (1.6 + mr() * 2.6).toFixed(1), md = (3.0 + mr() * 1.6).toFixed(2), mdl = (mr() * 1.2).toFixed(2);
          mot += '<i style="--a:' + ma + 'deg;--r:' + mrad + 'px;--s:' + ms + 'px;--d:' + md + 's;--del:' + mdl + 's"></i>';
        }
        put(ph, '.ba0-field', mot);
        /* THE SHOW (beat 2): a lot of fireworks that keep going off for ~9s.
           ~20 bursts staggered across the screen, framing the M and line (a
           top band and a bottom band, clear of the middle where the text is).
           No count text on this page. */
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
        var fwrap = Q(ph, '.ba0-fwrap'); if (fwrap) fwrap.innerHTML = shows;
        /* stat view A: a slowly turning 3D sphere of their moves, one point
           each, drifting a little so it feels alive (Malik 2026-08-16) */
        buildSphere(ph, Math.max(1, w.count));
        var totalLabel = (w.hasMoves ? 'total ' : '') + w.unitLabel;
        put(ph, '.ba0-acount', '<b>' + fmt(w.count) + '</b><span>' + esc(totalLabel) + '</span>');
        /* stat view B: the numbers. The two that actually say "you CHANGED"
           lead (Malik 2026-08-16): the transformation (from -> to) and the
           consistency (days you showed up). The rest is volume. */
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
        /* pace: how fast they moved. For a target goal that is progress TOWARD
           it (per week); otherwise it is their volume per week. */
        if (isT && w.weeks > 0) {
          var pace = delta / w.weeks;
          var paceStr = w.money ? w.mf(Math.round(pace)) : fmt(Math.round(pace * 10) / 10);
          cells.push(['<b>' + paceStr + '</b><span>' + (w.money ? '' : esc(v.unit) + ' ') + 'a week' + (down ? ', toward it' : '') + '</span>', '']);
        } else if (w.perWeek > 0) {
          cells.push(['<b>' + fmt(w.perWeek) + '</b><span>' + esc(unitFor(2, w.noun)) + ' a week</span>', '']);
        }
        /* milestones cleared on the way (the chooser's real marks) */
        if (w.marks > 1) cells.push(['<b>' + fmt(w.marks) + '</b><span>milestones passed</span>', '']);
        put(ph, '.ba0-wall', cells.map(function (c) { return '<div class="ba0-cell ' + c[1] + '">' + c[0] + '</div>'; }).join(''));
        /* wire the swipe pager (once) */
        wirePager(ph);
      }
    },

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
    if (d % C.MONTH_STEP === 0 && d > 0) return '<b>Day ' + fmt(d) + ' is a month mark</b> (' + (d / 30) + ' ' + (d === 30 ? 'month' : 'months') + '): a step up from the weekly rhythm.';
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
    'fr-2': function (v) { return '<b>Week ' + v.w + ' at your rate.</b> Fires as each week closes at rate (Malik 2026-08-14: every week, not every 7).'; },
    'fr-3': function (v) { var n = +v.n; return C.countHit(n) === n ? '<b>' + fmt(n) + ' is a rung of the count ladder.</b> Fires today.' : 'Silent at ' + fmt(n) + '. Next ceremony at <b>' + fmt(C.countNext(n)) + '</b> (the ladder: 1, 5, 7, 10, 15, 20, 25, 30, 40, 50 ... every 50 past 300).'; },
    'fr-4': function (v) { return '<b>Fires when a week closes at rate.</b> Weeks away are quiet rows, never a funeral.'; },
    'fr-5': function (v) { return +v.left === 0 ? '<b>Race week.</b> The deadline arrives with the rate kept: this fires as a FINAL.' : 'Fires when a week closes at rate; ' + v.left + ' ' + (+v.left === 1 ? 'week' : 'weeks') + ' to the day.'; },
    'mt-1': function (v) { return dayFire(+v.days); },
    'mt-2': function (v) { if (+v.held >= +v.total) return '<b>The promised date arrived with the rule intact.</b> Fires as a FINAL; the grand finale outranks it.'; if (+v.held === Math.round(+v.total / 2)) return '<b>Halfway.</b> The 50% mark of the promise fires (Malik 2026-08-14).'; return dayFire(+v.held); },
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
    'rf-rec': function (v) { return '<b>Fires on rungs of the count ladder</b>, drawn from real logged days only.' },
    'ba-0': baFire
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
