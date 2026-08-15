/* L10. Today first.
   The lens: this is the page you open every day, so it opens where you are.
   Today answers itself at the top (did you show up, what did that do to the run,
   what did today hold), then the page radiates outward in one direction only:
   today, the pattern it joins, the last seven days, the last thirty, the whole
   record, your rhythm.
   This page never speaks for the goal. No target, no distance, no countdown:
   Consistency is the record of showing up, and the pattern beat reports the
   record's own shape (a cadence, a line held, or the work itself).
   One reading order. One number per beat, and no number is ever printed twice.
   That rule killed the top ledger (the run belongs to today's sentence, the
   seven day count to the week strip, the thirty day count to the trend line,
   the all time rate to the record) and it killed the "days shown up N of N"
   row, which was the hero number wearing a second label.
   One idiom per job, too: three visuals on the page and no more, each doing
   something the others cannot. Near term detail is the week strip, trend is the
   line, the lifetime is the record grid. The weekday bar chart was a fourth
   chart saying what one sentence already says, so it is gone.
   Every number is read off ctx.s or ctx.log, and every comparison hides itself
   until the record is long enough to make it true. */
(function () {
  var W = window; W.CLAY = W.CLAY || {};
  W.CLAY['L10'] = {
    name: 'Today first',
    note: 'Today-anchored: the page opens on today (showed up or still open, what that did to the run, what today held) and then radiates out to the pattern it joins, seven days, thirty days, the whole record and your rhythm. It never speaks for the goal: no target, no distance, no countdown. The pattern beat reports the record\'s own shape, a weekly cadence for a rate you keep, days held for a line you hold, and the work itself (hours on the record, the average day, the support around it) for everything else. Every beat owns exactly one number and nothing is said twice, so the top ledger is gone (the run lives in today\'s sentence, the seven day count under the week strip, the thirty day count under the trend line, the all time rate in the record) and the record no longer restates the hero. Three visuals, each with a distinct job: the week strip for near term detail, the line for trend, the grid for the lifetime. The weekday bar chart was cut because the rhythm sentence already says it, and the record beat waits for day seven so it never renders as a second week strip.',
    render: function (ctx) {
      var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh, shape = ctx.shape;
      var MON = K.MON, WD = K.WD, WDF = K.WDF;

      /* ---------- helpers, none of them invent a number ---------- */
      function pc(a, b) { return b ? Math.round(100 * a / b) : 0; }
      function num(v) { return (typeof v === 'number' && isFinite(v)) ? v.toLocaleString() : String(v == null ? '' : v); }
      function dstr(v) { return v + (v === 1 ? ' day' : ' days'); }
      function esc(t) {
        return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      /* a long record starts in another year, and "Aug 15" alone reads as a
         date three weeks from now instead of one a year back */
      function shortDate(d, ref) {
        if (!d) return '';
        var t = MON[d.getMonth()] + ' ' + d.getDate();
        return (ref && d.getFullYear() !== ref.getFullYear()) ? t + ', ' + d.getFullYear() : t;
      }
      function onIn(a, b) { var c = 0; for (var i = Math.max(0, a); i < Math.min(log.length, b); i++) if (log[i] && log[i].on) c++; return c; }
      /* "a, b and c", never a pile of pills */
      function list(a) {
        if (!a.length) return '';
        if (a.length === 1) return a[0];
        return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
      }

      var N = log.length;
      var last = log[N - 1] || { on: false, sup: {}, date: new Date(), minutes: 0 };
      var done = !!last.on;
      var mins = last.minutes || 0;

      /* the run. if today is still open the run is read through yesterday, and
         it is labelled that way rather than shown as a zero. */
      var runNow = s.current;
      if (!done) { runNow = 0; for (var i = N - 2; i >= 0 && log[i].on; i--) runNow++; }
      /* how long since the last day on the board, for the honest cold open */
      var sinceLast = 0;
      if (!done) { for (var j = N - 2; j >= 0; j--) { if (log[j].on) { sinceLast = (N - 1) - j; break; } } }

      var w7 = Math.min(7, N), on7 = onIn(N - w7, N);
      var w30 = Math.min(30, N), on30 = onIn(N - w30, N);
      var hasPrev30 = N >= 60;
      var d30 = on30 - (hasPrev30 ? onIn(N - 60, N - 30) : 0);

      /* ---------- styles ---------- */
      var css = '<style>' +
        /* body copy sits at .90 ink, not .80: dimmed body text is a standing
           complaint. only true captions drop to --text-mid. */
        /* tabular figures once, at the root, so every number on the page gets
           them: most of this page is numbers sitting inside sentences, and a
           per-rule opt-in kept missing the ones in the captions. */
        '.L10-wrap{max-width:430px;margin:0 auto;--l10-body:rgba(var(--ink),.90);' +
          'font-variant-numeric:tabular-nums}' +
        '.L10-today{padding:2px 0 4px}' +
        /* the state line is a label for the hero, not a peer of it, so it is
           smaller than the unit line beneath the number. one hero, then support. */
        '.L10-say{display:flex;align-items:center;gap:8px;font-size:14.5px;font-weight:500;' +
          'color:var(--l10-body);line-height:1.3}' +
        '.L10-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);' +
          'box-shadow:0 0 12px rgba(var(--accent-rgb),.55);flex:0 0 auto}' +
        '.L10-dot.open{background:rgba(var(--ink),.26);box-shadow:none}' +
        /* 700 is a real Geist face. 800+ is faux bold, and at 84px faux bold smears. */
        '.L10-num{font-size:84px;font-weight:700;color:var(--text-hi);line-height:.9;letter-spacing:-.045em;' +
          'font-variant-numeric:tabular-nums;margin:10px 0 3px}' +
        '.L10-unit{font-size:16.5px;font-weight:500;color:var(--l10-body);line-height:1.3}' +
        '.L10-line{font-size:14.5px;color:var(--l10-body);line-height:1.5}' +
        '.L10-line b{color:var(--text-hi);font-weight:700;font-variant-numeric:tabular-nums}' +
        '.L10-line--top{margin-top:14px}' +
        '.L10-line--tight{margin-top:6px}' +
        '.L10-sub{font-size:12.5px;color:var(--text-mid);line-height:1.5;margin-top:10px}' +
        '.L10-sub b{color:var(--l10-body);font-weight:700}' +
        '.L10-sec{margin-top:28px}' +
        /* .cx h2 (one class + one element) outranks a bare .L10-h and was adding
           26px of its own margin on top of .L10-sec, so the first section sat at
           48px and every other one at 54px. two classes plus the element wins,
           and every section gap on the page is now the same 28px. */
        '.L10-wrap h2.L10-h{font-size:14px;font-weight:700;color:var(--text-hi);' +
          'letter-spacing:-.01em;margin:0 0 11px}' +
        /* the record rows are the kit's own rows, not a private copy of them:
           one fewer design language on the page, and quieter than the beats above. */
        '.L10-sec .ck-rows{margin-top:14px}' +
        /* the pattern beat keeps a hero of its own, a third the size of today's,
           so the reading order down the page is never in doubt */
        '.L10-lead{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px}' +
        '.L10-lead b{font-size:27px;font-weight:700;color:var(--text-hi);letter-spacing:-.028em;' +
          'font-variant-numeric:tabular-nums;line-height:1.05}' +
        '.L10-lead span{font-size:15px;font-weight:500;color:var(--l10-body);line-height:1.35}' +
        '.L10-wk .ck-mg__g b.tdy{box-shadow:0 0 0 2px rgba(var(--accent-rgb),.34)}' +
        '.L10-wk .ck-mg__g b.off.tdy,.L10-wk .ck-mg__g b.sup.tdy{box-shadow:0 0 0 2px rgba(var(--ink),.22)}' +
        /* a held rate sits at the top of its range, and with nothing behind it a
           97% line reads as a hairline rule. the quiet fill gives it a range.
           fill plus inset, never a border. */
        '.L10-plot{background:rgba(var(--ink),.032);box-shadow:var(--inset);border-radius:11px;' +
          'padding:9px 11px;margin-top:14px}' +
        '</style>';

      /* ---------- today ---------- */
      /* what today held, as one sentence. the note promised a line, and a line is
         what this is: five chips wrap into three rows on a 390 phone and read as
         a pile of tags. */
      var held = [];
      if (mins > 0) held.push(num(mins) + ' minutes');
      var SUP = last.sup || {};
      if (SUP.deepwork) held.push(SUP.deepwork > 1 ? SUP.deepwork + ' deep work sessions' : 'deep work');
      if (SUP.reflection) held.push('a reflection');
      if (SUP.checkin) held.push('a check-in');
      if (SUP.vivere) held.push('a look at Vivere');
      var heldLine = held.length
        ? (done ? 'Today held ' + list(held) + '.' : 'So far today: ' + list(held) + '.')
        : '';

      /* the run, said once on the whole page. for a line you hold, the run IS the
         pattern, so it is handed down to the pattern beat instead of said here. */
      var runIsGoal = shape === 'maintenance';
      var addLine;
      if (done) {
        addLine = runIsGoal
          ? (runNow > 1 ? 'You held the line again today.' : 'Today starts the line.')
          : (runNow > 1 ? 'Today took your run to <b>' + dstr(runNow) + '</b>.' : 'Today starts a new run.');
      } else if (runNow > 0) {
        /* "through yesterday" is the pattern beat's job for a line you hold, and
           saying it in both places three lines apart reads as a stutter */
        addLine = runIsGoal
          ? 'The line is still unbroken.'
          : 'Your run sits at <b>' + dstr(runNow) + '</b>, through yesterday.';
      } else if (sinceLast > 0) {
        addLine = 'Your last day was <b>' + dstr(sinceLast) + '</b> ago.';
      } else {
        addLine = N === 1 ? 'Today would be your first.' : 'Nothing on the board yet.';
      }

      /* day one with nothing on it yet is a zero, and it stays a zero. the copy
         around it is what makes it read as a start instead of a failure. */
      var unitLine = done
        ? (s.total === 1 ? 'day on the board, today included.' : 'days on the board, today included.')
        : (s.total === 0 ? 'days on the board.' : (s.total === 1 ? 'day on the board so far.' : 'days on the board so far.'));

      var today =
        '<div class="L10-today">' +
          '<div class="L10-say"><i class="L10-dot' + (done ? '' : ' open') + '"></i>' +
            (done ? 'You showed up today.' : 'Today is still open.') + '</div>' +
          '<div class="L10-num">' + num(s.total) + '</div>' +
          '<div class="L10-unit">' + unitLine + '</div>' +
          '<div class="L10-line L10-line--top">' + addLine + '</div>' +
          (heldLine ? '<div class="L10-line L10-line--tight">' + heldLine + '</div>' : '') +
        '</div>';

      /* ---------- what the pattern holds. the only shape branching on the page. ----------
         this beat never speaks for the goal: no target, no distance, no
         countdown. it reads the record's own shape. a cadence keeps its weekly
         rate, a held line keeps its days held, and everything else reports the
         work itself, in the one number today's block does not already own. */
      var pattern = '', pHead = 'What the pattern holds';
      var pLead = '', pSub = '', pLine = '';
      if (shape === 'frequency') {
        pHead = 'Your cadence';
        /* this week so far, scored against the cadence, and said as "so far" so a
           partial week never prints a miss that has not happened yet */
        var WKS = s.weeks || [];
        var cad = s.cadence || 4;
        var cur = WKS.length ? WKS[WKS.length - 1] : null;
        if (cur) {
          var partial = cur.all === 7 ? '' : ' so far';
          if (cur.on > cad) {
            /* "6 of 4" is not a fraction, it is a typo the reader has to forgive */
            pLead = num(cur.on);
            pSub = (cur.on === 1 ? 'session this week' : 'sessions this week') + partial + ', on a rate of ' + num(cad);
          } else {
            pLead = num(cur.on) + ' of ' + num(cad);
            pSub = (cad === 1 ? 'session this week' : 'sessions this week') + partial;
          }
        }
        var fullW = 0, metFull = 0;
        for (var wI = 0; wI < WKS.length; wI++) {
          if (WKS[wI].all === 7) { fullW++; if (WKS[wI].on >= cad) metFull++; }
        }
        pLine = fullW ? 'You have hit that rate in <b>' + num(metFull) + ' of ' + num(fullW) + '</b> full weeks.' : '';
      } else if (shape === 'maintenance') {
        pHead = 'The line you hold';
        /* a broken line is not a zero with a label on it. when there is
           nothing being held, the beat drops its number and says so. */
        var hold = done ? s.current : runNow;
        if (hold > 0) {
          pLead = num(hold);
          pSub = (hold === 1 ? 'day held' : 'days held') + (done ? ', unbroken' : ', through yesterday');
          pLine = s.best > hold
            ? 'The longest you have held it is <b>' + dstr(s.best) + '</b>.'
            : 'This is the longest you have held it.';
        } else {
          pLine = s.best > 0
            ? 'The line is broken. The longest you held it was <b>' + dstr(s.best) + '</b>.'
            : 'The line starts the first day you show up.';
        }
      } else {
        /* pure effort: the time the record is actually made of, plus the support
           acts around it. no target is implied and none is printed. */
        pHead = 'What you have put in';
        var supT = s.sup || {}, supBits = [];
        if (supT.deepwork) supBits.push(num(supT.deepwork) + (supT.deepwork === 1 ? ' deep work session' : ' deep work sessions'));
        if (supT.reflection) supBits.push(num(supT.reflection) + (supT.reflection === 1 ? ' reflection' : ' reflections'));
        if (supT.checkin) supBits.push(num(supT.checkin) + (supT.checkin === 1 ? ' check-in' : ' check-ins'));
        if (supT.vivere) supBits.push(num(supT.vivere) + (supT.vivere === 1 ? ' look at Vivere' : ' looks at Vivere'));
        var hrs = s.hours || 0, mn = s.minutes || 0;
        if (hrs >= 1) { pLead = num(hrs); pSub = (hrs === 1 ? 'hour of work on the record' : 'hours of work on the record'); }
        else if (mn > 0) { pLead = num(mn); pSub = (mn === 1 ? 'minute of work on the record' : 'minutes of work on the record'); }
        if (pLead && s.avgSession > 0) {
          pLine = 'That is <b>' + num(s.avgSession) + '</b> minutes on an average day you showed up.';
        }
        if (supBits.length) {
          pLine += (pLine ? ' ' : '') + 'Around it: ' + list(supBits) + '.';
        }
      }
      if (pLead || pLine) {
        pattern =
          '<div class="L10-sec">' +
            '<h2 class="L10-h">' + pHead + '</h2>' +
            (pLead ? '<div class="L10-lead"><b>' + pLead + '</b><span>' + pSub + '</span></div>' : '') +
            (pLine ? '<div class="L10-line' + (pLead ? ' L10-line--top' : '') + '">' + pLine + '</div>' : '') +
          '</div>';
      }

      /* ---------- the last seven days ---------- */
      var heads = '', cells = '';
      for (var w = 0; w < 7; w++) {
        var idx = N - 7 + w;
        var d = idx >= 0 ? log[idx] : null;
        var dow = d ? d.date.getDay() : (((last.date.getDay() - (6 - w)) % 7) + 7) % 7;
        heads += '<i>' + WD[dow] + '</i>';
        if (!d) { cells += '<b class="pad"></b>'; continue; }
        var cls = d.on ? 'on' : (Object.keys(d.sup || {}).length ? 'sup' : 'off');
        if (idx === N - 1) cls += ' tdy';
        cells += '<b class="' + cls + '">' + d.date.getDate() + '</b>';
      }
      /* the heading owns the window, so the sentence does not repeat it. the
         legend is said once, here, because this is the only place on the page
         where the squares are explained at all. */
      var weekLine;
      if (N === 1) weekLine = done ? 'Day one, and you showed up.' : 'Day one, still open.';
      else if (N >= 7) weekLine = 'You showed up on <b>' + on7 + '</b> of them.';
      else weekLine = 'You showed up on <b>' + on7 + ' of ' + dstr(N) + '</b>.';
      if (N >= 2) weekLine += ' Today is ringed. Filled squares are days you showed up.';
      var week =
        '<div class="L10-sec">' +
          '<h2 class="L10-h">' + (N >= 7 ? 'The last seven days' : 'Your days so far') + '</h2>' +
          '<div class="ck-mg L10-wk"><div class="ck-mg__h">' + heads + '</div>' +
            '<div class="ck-mg__g">' + cells + '</div></div>' +
          '<div class="L10-sub">' + weekLine + '</div>' +
        '</div>';

      /* ---------- the last thirty days ----------
         only once thirty days is a real window standing apart from the whole
         record. before day 31 "lately" and "always" are the same sentence, and
         printing both is how a page starts repeating itself. */
      var lately = '';
      if (N >= 31) {
        var latelyLine = 'You showed up on <b>' + on30 + '</b> of them.';
        if (hasPrev30) {
          latelyLine += d30 === 0
            ? ' Level with the thirty before it.'
            : ' That is <b>' + dstr(Math.abs(d30)) + '</b> ' + (d30 > 0 ? 'more than' : 'fewer than') + ' the thirty before it.';
        }
        /* the plot draws the SAME thirty days the heading names. it used to draw
           sixty, so the caption had to argue with the heading above it, and
           between day 31 and day 59 it drew a third number again (N days). one
           window per beat, stated once. */
        var spark = K.sparkline(log, 30, 330, 46) || '';
        lately =
          '<div class="L10-sec">' +
            '<h2 class="L10-h">The last thirty days</h2>' +
            '<div class="L10-line">' + latelyLine + '</div>' +
            (spark ? '<div class="L10-plot">' + spark + '</div>' +
              '<div class="L10-sub">Your seven day rate across those thirty days.</div>' : '') +
          '</div>';
      }

      /* ---------- the whole record ----------
         it waits for day eight. up to day seven the week strip above IS the
         whole record, so this beat could only restate it: a rate that is the
         same seven squares as a percentage, next to the hero as a fraction,
         next to a start date six days old. */
      var record = '';
      if (N >= 8) {
        var rrows = '<div class="ck-row"><span>Rate since day one</span><b>' + s.rate + '%</b></div>';
        /* the best run is only news when it is not the run you are already on,
           and for a line you hold the pattern beat above already said it */
        if (!runIsGoal && s.best > runNow) rrows += '<div class="ck-row"><span>Best run</span><b>' + dstr(s.best) + '</b></div>';
        if (N >= 30 && s.comebacks > 0) rrows += '<div class="ck-row"><span>Times you came back</span><b>' + num(s.comebacks) + '</b></div>';
        rrows += '<div class="ck-row"><span>Started</span><b>' + shortDate(log[0] && log[0].date, last.date) + '</b></div>';
        /* the grid is deliberately small and dense, and it waits for a month.
           drawn at day 8 it is one short row at the same scale as the week strip
           above it, and the two read as the same component twice.
           the column count is then nudged off any width that would strand a
           near-empty last row: 365 days at 26 across leaves exactly one cell
           hanging under the block, and a single stray square reads as a
           rendering fault rather than as today. */
        var ideal = Math.max(12, Math.min(26, Math.round(Math.sqrt(N * 2.6))));
        var cols = ideal;
        for (var off = 0; off <= 14; off++) {
          var hi = ideal + off, lo = ideal - off, picked = 0;
          if (hi <= 26 && (N % hi === 0 || N % hi >= 5)) picked = hi;
          else if (lo >= 12 && (N % lo === 0 || N % lo >= 5)) picked = lo;
          if (picked) { cols = picked; break; }
        }
        record =
          '<div class="L10-sec">' +
            '<h2 class="L10-h">Your record</h2>' +
            (N >= 30 ? K.calendarHTML(log, { cols: cols }) : '') +
            '<div class="ck-rows">' + rrows + '</div>' +
          '</div>';
      }

      /* ---------- your rhythm, read from today outward ----------
         one sentence, no chart. seven bars said exactly what these two clauses
         say, in a fourth chart idiom, and the sentence is the half that is
         actually actionable on the day you are reading it. */
      var rhythm = '';
      if (N >= 21) {
        var td = last.date.getDay(), pcts = [], maxPct = -1;
        for (var q = 0; q < 7; q++) {
          var p = s.dowSeen[q] ? pc(s.byDow[q], s.dowSeen[q]) : -1;
          pcts.push(p); if (p > maxPct) maxPct = p;
        }
        /* with every weekday at zero there is no rhythm to report, and the beat
           says nothing rather than printing a wall of zeroes */
        if (maxPct > 0) {
          var tPct = pcts[td] < 0 ? 0 : pcts[td];
          var rl = 'Today is a ' + WDF[td] + ', and you show up on <b>' + tPct + '%</b> of your ' + WDF[td] + 's.';
          var bd = -1;
          for (var q2 = 0; q2 < 7; q2++) if (pcts[q2] === maxPct) { bd = q2; break; }
          if (tPct === maxPct) rl += ' That is your strongest day.';
          else if (bd >= 0) rl += ' Your strongest is ' + WDF[bd] + ', at <b>' + maxPct + '%</b>.';
          rhythm =
            '<div class="L10-sec">' +
              '<h2 class="L10-h">Your rhythm</h2>' +
              '<div class="L10-line">' + rl + '</div>' +
            '</div>';
        }
      }

      return css + '<div class="cx"><div class="L10-wrap">' +
        today + pattern + week + lately + record + rhythm +
        '</div></div>';
    }
  };
})();
