/* ============================================================
   L01. CALM ZEN MINIMUM.
   The least a Consistency page can be while still being useful.

   Three questions a consistency page has to answer, and nothing else:
     1. How much have I actually done?        -> the hero
     2. Am I doing it lately, more or less?   -> one same-length comparison
     3. What does the record honestly look like? -> the heatmap
   Then one quiet last line for the rhythm underneath all of it.

   Nothing here says where the goal stands. Distance to the target belongs to
   Clarity; this page is the pattern of the person, not the state of the goal.

   ONE composition, repeated three times at three sizes:
     a quiet lead-in, a number, a quiet consequence.
   Every big number is a bare number; the words live beside it, never inside it.
   Zero cards, zero tiles, zero charts, zero section headings, zero borders.
   Hairlines and air do the structuring. Green appears only in the heatmap.

   Body copy is never dimmed (Malik's standing law): the sentences sit at .90
   ink and hierarchy comes from size and weight. Only the short lead-in
   fragments and the record key, which act as labels, sit quieter.
   Only 400/500/700 exist in Geist here, so no weight above 700 is declared.
   Tabular numerals on the whole page. Every number is read off the log, so the
   page can never disagree with its own heatmap.
   ============================================================ */
(function () {
  var W = window; W.CLAY = W.CLAY || {};

  var CSS =
    '<style>' +
    '.L01-p{--L01-body:rgba(var(--ink),.90);' +
      'padding:calc(30px + env(safe-area-inset-top)) 26px calc(46px + env(safe-area-inset-bottom));' +
      'max-width:100%;font-variant-numeric:tabular-nums;overflow-wrap:break-word}' +
    '.L01-lead{font-size:13.5px;font-weight:500;color:var(--text-mid);line-height:1.45}' +
    '.L01-num{font-size:92px;font-weight:700;color:var(--text-hi);line-height:.9;' +
      'letter-spacing:-.05em;margin:12px 0 8px}' +
    '.L01-tail{font-size:17px;font-weight:500;color:var(--L01-body);line-height:1.45}' +
    '.L01-div{height:1px;background:var(--hairline);margin:30px 0}' +
    '.L01-mid{display:flex;align-items:baseline;gap:9px;margin:10px 0 7px;flex-wrap:wrap;min-width:0}' +
    '.L01-mid b{font-size:38px;font-weight:700;color:var(--text-hi);line-height:1;letter-spacing:-.04em}' +
    '.L01-mid i{font-style:normal;font-size:16px;font-weight:500;color:var(--L01-body)}' +
    '.L01-sub{font-size:14.5px;font-weight:500;color:var(--L01-body);line-height:1.5}' +
    '.L01-cal{margin:15px 0 0}' +
    /* the kit key sits at .22, which on near-black is barely separable from an
       empty cell; the legend names this shade out loud, so it has to be visible */
    '.L01-cal .ck-cal b.sup{background:rgba(var(--accent-rgb),.30)}' +
    '.L01-cap{font-size:12.5px;font-weight:500;color:var(--text-mid);line-height:1.6;margin-top:13px}' +
    '.L01-sm{display:flex;align-items:baseline;gap:8px;margin:9px 0 6px;flex-wrap:wrap;min-width:0}' +
    '.L01-sm b{font-size:23px;font-weight:700;color:var(--text-hi);line-height:1.1;letter-spacing:-.03em}' +
    '.L01-sm i{font-style:normal;font-size:15px;font-weight:500;color:var(--L01-body)}' +
    '</style>';

  function fin(v) { return typeof v === 'number' && isFinite(v); }
  function num(v) { return fin(v) ? Math.round(v).toLocaleString() : '0'; }
  function dec(v) {
    if (!fin(v)) return '0';
    return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '');
  }
  function plural(v, w) { return v === 1 ? w : w + 's'; }
  function onIn(log, from, to) {
    var c = 0;
    for (var i = Math.max(0, from); i < to; i++) if (log[i] && log[i].on) c++;
    return c;
  }

  /* block: quiet lead-in, number, quiet consequence */
  function block(lead, midHTML, sub, cls) {
    return '<div class="L01-b">' +
      '<div class="L01-lead">' + lead + '</div>' +
      '<div class="' + cls + '">' + midHTML + '</div>' +
      (sub ? '<div class="L01-sub">' + sub + '</div>' : '') +
      '</div>';
  }

  /* longest run of consecutive on days, read off the log */
  function bestRun(log, C) {
    var best = 0, run = 0;
    for (var i = 0; i < C; i++) {
      if (log[i] && log[i].on) { run++; if (run > best) best = run; } else run = 0;
    }
    return best;
  }

  /* The only shape branching on the page: one closing line, and it is always a
     line about the pattern, never about the goal's remaining distance.
     Rules for every shape: the lead-in names what the line measures, <b> holds
     a bare number, <i> holds the words, and the line never repeats a number
     already printed further up the page. */
  function goalBlock(shape, s, K, N, log, C) {
    var lead = '', v = '', sub = '';

    if (shape === 'quantity_up' || shape === 'quantity_down' || shape === 'milestone') {
      /* The counting shapes get the same closing line: the rhythm underneath
         the work. A weekly rate is a decimal, so it can never collide with the
         whole day counts printed above it. */
      var qDays = Math.min(28, C);
      var qBest = bestRun(log, C);
      lead = 'The rhythm underneath it';
      if (qDays > 0 && qDays < 7) {
        v = '<b>' + num(qBest) + '</b><i>' + plural(qBest, 'day') + ' in a row at your longest</i>';
        sub = 'Your first week is still going.';
      } else if (qDays > 0) {
        var qRate = dec(onIn(log, C - qDays, C) / (qDays / 7));
        v = '<b>' + qRate + '</b><i>' + (qRate === '1' ? 'day' : 'days') + ' a week lately</i>';
        sub = (qDays >= 28 ? 'Averaged over your last four weeks. '
             : 'Averaged over the ' + num(qDays) + ' days you have so far. ')
             + 'Your longest run so far is ' + num(qBest) + ' ' + plural(qBest, 'day') + '.';
      } else {
        return '';
      }

    } else if (shape === 'frequency') {
      /* Never printed as "5.5 of 4", which reads like a bug: the rate you set is
         a plain sentence underneath, so beating it stays legible. Measured over
         the last 28 days rather than calendar weeks, so a half finished week
         cannot quietly drag the average down. Under a week there is nothing to
         average, and dividing three days by three sevenths of a week would
         promise a rate of seven, so the raw count is shown instead. */
      var cad = (fin(s.cadence) && s.cadence > 0) ? s.cadence : 4;
      var wDays = Math.min(28, C);
      lead = 'The rate you are keeping';
      if (wDays > 0 && wDays < 7) {
        var so = onIn(log, 0, C);
        v = '<b>' + num(so) + '</b><i>' + plural(so, 'session') + ' so far</i>';
        sub = 'Your first week is still going. You set ' + num(cad) + ' a week.';
      } else {
        var rate = wDays > 0 ? dec(onIn(log, C - wDays, C) / (wDays / 7)) : dec(s.last4Rate);
        v = '<b>' + rate + '</b><i>' + (rate === '1' ? 'session' : 'sessions') + ' a week</i>';
        sub = (wDays >= 28 ? 'Averaged over your last four weeks. '
             : 'Averaged over the ' + num(wDays) + ' days you have so far. ')
             + 'You set ' + num(cad) + ' a week.';
      }

    } else if (shape === 'maintenance') {
      /* read off the log so the held line and the heatmap agree */
      var cur = 0, best = 0, run = 0, i;
      if (C) {
        for (i = 0; i < C; i++) {
          if (log[i] && log[i].on) { run++; if (run > best) best = run; } else run = 0;
        }
        for (i = C - 1; i >= 0 && log[i] && log[i].on; i--) cur++;
      } else {
        cur = fin(s.current) ? s.current : 0;
        best = fin(s.best) ? s.best : 0;
      }
      lead = 'The line you are holding';
      v = '<b>' + num(cur) + '</b><i>' + (cur === 0 ? 'days held right now'
                                                    : plural(cur, 'day') + ' held, unbroken') + '</i>';
      sub = best > cur
        ? 'The longest you have held it is ' + num(best) + ' ' + plural(best, 'day') + '.'
        : cur === 0 ? 'Today can start it again.'
        : 'This is the longest you have held it.';

    } else {
      return ''; /* open goals have no second number, so the page ends earlier */
    }
    return '<div class="L01-div"></div>' + block(lead, v, sub, 'L01-sm');
  }

  W.CLAY['L01'] = {
    name: 'Calm zen minimum',
    note: 'Ruthless subtraction: three blocks in one repeated composition (quiet lead-in, bare number, quiet consequence), hairlines and air instead of cards, green only in the record. Nothing on the page says where the goal stands; distance belongs to Clarity. Cuts current run and best run from the top (streak numbers survive only where the goal literally is a held line), swaps the rate percentage for a plain 30 against 30 day count, and closes on the rhythm underneath the work: days a week lately, the line you are holding, or the rate you are keeping. The key under the record only explains the shades the record contains, and no number is ever printed twice.',
    render: function (ctx) {
      var K = ctx.K, log = ctx.log || [], s = ctx.s || {}, shape = ctx.shape || 'open';
      var i, d;

      /* Read the record straight off the log so the page can never disagree with
         its own heatmap; s is only the fallback when there is no log at all. */
      var on = 0, faint = 0, missed = 0;
      for (i = 0; i < log.length; i++) {
        d = log[i]; if (!d) continue;
        if (d.on) on++;
        else if (d.sup && Object.keys(d.sup).length) faint++;
        else missed++;
      }
      var C = log.length;
      var N = Math.max(1, C || (fin(s.N) ? s.N : 0) || 1);
      var total = C ? on : Math.max(0, Math.min(N, fin(s.total) ? s.total : 0));

      /* 1. the whole record, in a sentence */
      var heroTail;
      if (N === 1) heroTail = total ? 'Day one is on the record.' : 'Today is day one. It is still open.';
      else if (total >= N) heroTail = 'Every day since you started.';
      else heroTail = 'of the ' + num(N) + ' days since you started.';
      var hero =
        '<div class="L01-lead">You have shown up</div>' +
        '<div class="L01-num">' + num(total) + '</div>' +
        '<div class="L01-tail">' + heroTail + '</div>';

      /* 2. lately: the one comparison that shows a direction.
         The window is only offered when a full window of the same length sits
         behind it, so it is always the same length against the same length. */
      var win = N >= 60 ? 30 : (N >= 14 ? 7 : 0), lately = '';
      if (win && C >= win * 2) {
        var cur = onIn(log, C - win, C), prev = onIn(log, C - win * 2, C - win);
        var delta = cur - prev, sub;
        if (delta > 0) sub = num(delta) + ' more than the stretch before it.';
        else if (delta < 0) sub = num(-delta) + ' fewer than the stretch before it.';
        else sub = 'Level with the stretch before it.';
        lately = '<div class="L01-div"></div>' +
          block('In the last ' + win + ' days', '<b>' + num(cur) + '</b><i>on the record</i>', sub, 'L01-mid');
      }

      /* 3. the honest record.
         Columns are handed to the kit rather than recomputed twice, so the width
         cap and the grid can never drift apart. Short records get one complete
         row instead of an orphan cell in a seven-wide grid, and the cells are
         capped at 30px so week one reads as a deliberate strip rather than a row
         of fat buttons stretched across the screen. */
      var record = '';
      if (C > 0) {
        var cols = C <= 7 ? C : Math.max(7, Math.min(21, Math.round(Math.sqrt(C * 1.6))));
        var gap = C > 180 ? 3 : C > 90 ? 4 : 6;
        var want = cols * (C <= 7 ? 30 : 32) + (cols - 1) * gap;
        var capW = want < 338 ? 'max-width:' + want + 'px;' : '';

        /* A key only when there is something to tell apart: with one state on
           screen it explains a shade that is not there and repeats the hero. */
        var bits = [];
        if (on) bits.push('Bright is a day you showed up.');
        if (faint) bits.push('Faint is a day you did something smaller.');
        if (missed) bits.push('Empty is a day you missed.');
        var legend = bits.length > 1 ? bits.join(' ') : '';

        record = '<div class="L01-div"></div>' +
          '<div class="L01-lead">' + (C < 7 ? 'The record so far' : 'One square for every day so far') + '</div>' +
          '<div class="L01-cal" style="' + capW + '">' +
            (K && K.calendarHTML ? K.calendarHTML(log, { cols: cols }) : '') + '</div>' +
          (legend ? '<div class="L01-cap">' + legend + '</div>' : '');
      }

      /* 4. the rhythm underneath the record */
      var goal = goalBlock(shape, s, K, N, log, C);

      return CSS + '<div class="L01-p">' + hero + lately + record + goal + '</div>';
    }
  };
})();
