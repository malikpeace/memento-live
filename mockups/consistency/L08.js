/* L08. One number religion.
   ------------------------------------------------------------------
   The lens: ONE huge number owns the first screen. Not a hero plus a
   ledger, not a hero plus tiles. One number, framed by a sentence, with
   two whisper lines under it. Everything else, including the record and
   every stat, starts below the fold.

   WHICH NUMBER, AND WHY:
   Days you have shown up. It is the only number in the whole record that
   can never go down. A missed day costs you nothing you already own, so
   the number is honest without being a punishment, which is the exact
   problem with a streak (resets to zero) and with a rate (reads as a
   grade you can fail). It is true on day one (it says 1). It means the
   same thing for all six goal shapes, because every shape has days you
   showed up, while the goal's own units belong to Action, not here.
   Same number, every user, every day. That is the religion.

   THE PAGE SPEAKS THREE THINGS, IN THIS ORDER:
   a number, a record, a list. Nothing else gets to be a fourth thing.
   That rule is why the support activities are plain rows now instead of
   icon cards: cards were a second component language and a second place
   green appeared, for four facts that are one line each. Green now means
   exactly one thing on this page, you showed up, and it lives in the
   record and in today's dot.

   WHAT IS DELIBERATELY NOT HERE:
   No percentages, they read as a grade. No day-of-week chart and no
   month chart, two more chart languages turned the bottom half into a
   dashboard. No third recency window: the whisper owns recency, so the
   list does not repeat it. No closing manifesto, the record's own
   heading and its one legend line already say nothing is hidden.

   Broken locked calls are named in `note` below. */
(function () {
  var W = window;
  W.CLAY = W.CLAY || {};

  var SUPKEYS = ['deepwork', 'reflection', 'checkin', 'vivere'];
  /* the kit only carries plural units, and a record's first week is full of ones */
  var SUPONE = { deepwork: 'session', reflection: 'entry', checkin: 'morning', vivere: 'vision' };
  /* shapes that own a real second number. Anything else, including an
     unknown shape string, is treated as 'open' and gets no goal line,
     because the open line just restates the hero. */
  var GOALSHAPES = { milestone: 1, frequency: 1, maintenance: 1, quantity_up: 1, quantity_down: 1 };

  W.CLAY['L08'] = {
    name: 'One number religion',

    note: 'One number, days shown up, owns the entire first screen with only two whisper lines under it. Broke the locked call that the three-stat ledger sits with the hero (it moved below the fold with everything else), dropped percentages so no number reads as a grade, and dropped the rhythm and month charts so the page speaks one visual language: a number, a record, a list. Audit pass cut the support cards down to that same list, cut the scroll chevron and the closing manifesto, and stopped the list restating the hero on a young record.',

    render: function (ctx) {
      var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh, shape = ctx.shape;
      if (!log || !log.length || !s) {
        return '<div class="L08" style="padding:24px;font-family:var(--font);color:var(--text-mid)">' +
          '<p style="margin:0;font-size:15px">No record yet.</p></div>';
      }
      var N = s.N || log.length;
      var total = s.total || 0;

      /* ---------- helpers, nothing here invents a number ---------- */
      function n(v) { return K.n(v); }
      function dstr(v) { return n(v) + (v === 1 ? ' day' : ' days'); }
      function onIn(win) {
        var c = 0, st = Math.max(0, log.length - win);
        for (var i = st; i < log.length; i++) if (log[i].on) c++;
        return c;
      }

      var last = log[log.length - 1] || { on: false, sup: {} };
      var todayOn = !!last.on;
      var on30 = onIn(30);

      /* ---------- the number, sized so it always fills the width ----------
         342px of usable column at 390. The ladder is set off digit count, not
         string length, so the thousands comma never pushes it past the edge. */
      var numTxt = n(total);
      var len = String(numTxt).replace(/[^0-9]/g, '').length;
      var numPx = len <= 1 ? 172 : len === 2 ? 168 : len === 3 ? 148 : len === 4 ? 116 : 94;
      /* optical left edge. Tabular figures give every digit the same advance, so
         a leading 1 floats in the middle of its slot and the number visibly
         indents from the sentence above it. Days 1, 10 to 19 and 100 to 199 are
         most of a first year, so it gets its own pull instead of one average. */
      var numLead = String(numTxt).charAt(0) === '1' ? '-.125em' : '-.05em';

      /* ---------- the whisper ----------
         Line two carries the denominator on a young record and recency on an
         old one. Whatever it says, the list below never says it again. */
      var lately;
      if (N === 1) lately = 'This is day one.';
      else if (total === N) lately = 'Every day so far.';
      else if (N <= 30) lately = 'Out of <b>' + n(N) + '</b> days.';
      else lately = 'Lately, <b>' + n(on30) + '</b> of the last <b>30</b> days.';

      /* The consolation only shows once it is actually consoling something.
         On a clean record it is a platitude, and at zero it is a taunt. */
      var thesis = (total > 0 && s.missed > 0) ? 'That number never goes down.' : '';

      /* ---------- the goal shape, one quiet line, below the fold ----------
         'open' restates the hero number, so it gets no goal line at all rather
         than a duplicate, and neither does an unknown shape. Milestone speaks
         through its own number (days until it happens), not the shape's lead,
         which would be the hero again. Maintenance holds its line only while
         the held run differs from the hero: on a spotless record they are the
         same number, so the goal line stays out and 'Every day so far' in the
         whisper carries it. Frequency states the rate against the rate you
         set, because the kit's own '5.8 of 4' reads like a broken fraction. */
      var goal = null;
      if (sh && GOALSHAPES[shape]) {
        if (shape === 'milestone') goal = { lead: n(sh.ctx.v), sub: sh.ctx.l };
        else if (shape === 'frequency') {
          var cad = s.cadence || 4;
          var rate = (s.last4Rate || 0).toFixed(1).replace(/\.0$/, '');
          goal = N >= 28 ? { lead: rate, sub: 'sessions a week lately, against the ' + n(cad) + ' you set.' } : null;
        }
        else if (shape === 'maintenance') goal = s.current === total ? null : { lead: n(s.current), sub: sh.sub };
        else goal = { lead: sh.lead, sub: sh.sub };
      }

      /* ---------- the record: keep cells sane at every length ---------- */
      var kitCols = Math.max(7, Math.min(21, Math.round(Math.sqrt(N * 1.6))));
      var calCols = Math.max(kitCols, Math.min(14, N));
      var calGap = N > 180 ? 3 : N > 90 ? 4 : 6;
      var calMax = calCols * 24 + (calCols - 1) * calGap;

      /* One legend line, short clauses. A clean record shorter than a week has
         nothing to explain, so it gets no caption at all. */
      var calNote = '';
      if (s.missed > 0 && s.supDays > 0) calNote = 'Each square is a day. Filled, you showed up. Faint, something around it. Empty, you did not.';
      else if (s.missed > 0) calNote = 'Each square is a day. Filled, you showed up. Empty, you did not.';
      else if (N >= 7) calNote = 'Every square is a day you showed up.';

      /* ---------- the day you hold best, the one fact worth keeping from a
         rhythm chart. Only shown when a day genuinely wins. ---------- */
      var strongest = '';
      if (N >= 21 && s.byDow && s.dowSeen) {
        var rates = [];
        for (var d = 0; d < 7; d++) {
          var seen = s.dowSeen[d] || 0;
          rates.push({ i: d, r: seen ? (s.byDow[d] || 0) / seen : -1 });
        }
        rates.sort(function (a, b) { return b.r - a.r; });
        if (rates[0].r > 0 && rates[0].r > rates[1].r + 0.001) strongest = K.WDF[rates[0].i] + 's';
      }

      /* ---------- the list ----------
         Every row has to earn its line. A row that restates the hero, the
         whisper, or the goal line does not go in. */
      function row(l, v) {
        return '<div class="L08-row"><span>' + l + '</span><b>' + v + '</b></div>';
      }
      var rows = '';
      /* the honest denominator, only once the whisper stops carrying it */
      if (N > 30) rows += row('Days since you started', n(N));
      /* on a young record the current run IS the hero number, so it stays out.
         maintenance already states the held run in the goal line above. */
      if (shape !== 'maintenance' && s.current !== total) rows += row('Current run', dstr(s.current));
      if (s.best > s.current) rows += row('Longest run', dstr(s.best));
      if (s.comebacks > 0) rows += row('Times you came back', n(s.comebacks));
      if (strongest) rows += row('Your strongest day', strongest);
      if (s.hours > 0) rows += row('Time on it', n(s.hours) + (s.hours === 1 ? ' hour' : ' hours'));

      /* ---------- around the work: the same rows, one number each, zeroes out ---------- */
      var supRows = SUPKEYS.filter(function (k) { return (s.sup && s.sup[k] || 0) > 0; }).map(function (k) {
        var v = s.sup[k];
        return row(K.SUPNAME[k], n(v) + ' ' + (v === 1 ? SUPONE[k] : K.SUPUNIT[k]));
      }).join('');

      /* ================= styles ================= */
      var css = '<style>' +
        '.L08{padding:calc(8px + env(safe-area-inset-top)) 24px calc(44px + env(safe-area-inset-bottom));' +
          'font-family:var(--font);color:var(--text-hi);overflow-x:clip}' +
        '.L08 p{margin:0}' +
        /* the hero holds the first screen and lets the record peek under it,
           which is the scroll cue. Two auto margins split the free space
           evenly: the number lands optically centered, the whisper sits on the
           floor of the fold. Nothing here is a chevron. */
        '.L08-hero{display:flex;flex-direction:column;min-height:clamp(420px,72vh,600px);' +
          'min-height:clamp(420px,72svh,600px);padding-bottom:8px}' +
        '.L08-mid{margin-top:auto}' +
        '.L08-say{font-size:17px;font-weight:500;color:var(--text-mid);line-height:1.3;letter-spacing:-.01em}' +
        '.L08-num{display:block;font-weight:800;color:var(--text-hi);line-height:.82;letter-spacing:-.055em;' +
          'font-variant-numeric:tabular-nums;white-space:nowrap;margin:8px 0 6px}' +
        '.L08-thesis{font-size:15px;font-weight:500;color:var(--text-mid);line-height:1.4;margin-top:9px}' +
        '.L08-whisper{margin-top:auto;padding-top:30px;display:flex;flex-direction:column;gap:7px}' +
        '.L08-wl{display:flex;align-items:center;gap:9px;font-size:14.5px;font-weight:500;color:var(--text-mid);line-height:1.4}' +
        '.L08-wl b{color:var(--text-hi);font-weight:700;font-variant-numeric:tabular-nums}' +
        '.L08-dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto;background:rgba(var(--ink),.22)}' +
        '.L08-dot.on{background:var(--accent);box-shadow:0 0 0 4px rgba(var(--accent-rgb),.14)}' +
        '.L08-wl.pad{padding-left:16px}' +
        '.L08-h{font-size:14px;font-weight:650;color:var(--text-hi);letter-spacing:-.01em;margin:0 0 12px}' +
        '.L08-sec{margin-top:32px}' +
        '.L08-note{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin-top:14px}' +
        '.L08-goal{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}' +
        '.L08-goal b{font-size:26px;font-weight:700;letter-spacing:-.03em;color:var(--text-hi);' +
          'font-variant-numeric:tabular-nums;line-height:1}' +
        '.L08-goal span{font-size:14.5px;color:var(--text-mid);font-weight:500;line-height:1.3;' +
          'min-width:0;overflow-wrap:anywhere}' +
        '.L08-rows{display:flex;flex-direction:column}' +
        '.L08-row{display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:11px 0;' +
          'border-bottom:1px solid var(--hairline)}' +
        '.L08-row:last-child{border-bottom:0}' +
        '.L08-row span{font-size:14px;color:var(--text-mid);min-width:0;overflow-wrap:anywhere}' +
        '.L08-row b{font-size:15.5px;font-weight:700;color:var(--text-hi);letter-spacing:-.01em;' +
          'font-variant-numeric:tabular-nums;white-space:nowrap}' +
        '</style>';

      /* ================= the fold ================= */
      var hero =
        '<div class="L08-hero">' +
          '<div class="L08-mid">' +
            '<div class="L08-say">You have shown up</div>' +
            '<span class="L08-num" style="font-size:' + numPx + 'px;margin-left:' + numLead + '">' + numTxt + '</span>' +
            '<div class="L08-say">' + (total === 1 ? 'day so far.' : 'days so far.') + '</div>' +
            (thesis ? '<div class="L08-thesis">' + thesis + '</div>' : '') +
          '</div>' +
          '<div class="L08-whisper">' +
            '<div class="L08-wl"><i class="L08-dot' + (todayOn ? ' on' : '') + '"></i>' +
              (todayOn ? 'Today is counted.' : 'Today is still open.') + '</div>' +
            '<div class="L08-wl pad">' + lately + '</div>' +
          '</div>' +
        '</div>';

      /* ================= below the fold ================= */
      var record =
        '<div class="L08-sec">' +
          '<div class="L08-h">The whole record</div>' +
          '<div style="max-width:' + calMax + 'px">' + K.calendarHTML(log, { cols: calCols }) + '</div>' +
          (calNote ? '<p class="L08-note">' + calNote + '</p>' : '') +
        '</div>';

      var goalSec = goal ?
        '<div class="L08-sec">' +
          '<div class="L08-h">The goal</div>' +
          '<div class="L08-goal"><b>' + goal.lead + '</b><span>' + goal.sub + '</span></div>' +
        '</div>' : '';

      var ledger = rows ?
        '<div class="L08-sec">' +
          '<div class="L08-h">Your numbers</div>' +
          '<div class="L08-rows">' + rows + '</div>' +
        '</div>' : '';

      var support = supRows ?
        '<div class="L08-sec">' +
          '<div class="L08-h">Around the work</div>' +
          '<div class="L08-rows">' + supRows + '</div>' +
        '</div>' : '';

      return css + '<div class="L08">' + hero + record + goalSec + ledger + support + '</div>';
    }
  };
})();
