/* L09. The receipt.
   Lens: consistency as accumulating proof of work. Time given is the hero,
   because time is the one number that never resets and never has to be
   defended. The page reads like a clean statement: a total at the top, ONE
   breakdown under it that adds up to that total exactly, what the time went
   into, then the full record.

   Deliberately NOT a receipt costume: no perforations, no monospace, no tear
   edge, no thank-you line. The receipt lives in the structure (label left,
   amount right, one rule above the total), not in props.

   ONE table grammar and ONE hairline on the whole page. The breakdown changes
   resolution with the record (days in the first week, weeks inside a single
   month, months once there is more than one) instead of stacking two tables
   that say the same thing at two zoom levels. Under the hero there is exactly
   one support line, never two, and the goal shape stays silent whenever it
   would only restate what is already on screen. Every number is read off
   ctx.log or ctx.s, and the rows still add up by hand. */
(function () {
  var W = window; W.CLAY = W.CLAY || {};
  W.CLAY['L09'] = {
    name: 'The receipt',
    note: 'Time invested is the hero and one breakdown under it literally adds up to it, so the page can be checked by hand. The breakdown changes resolution with the record: days in the first week, weeks inside one month, months after that. Streaks are gone on purpose, a run resets and hours never do. One table grammar, one hairline (the rule above the total), one support line under the hero, and the goal shape gets a quiet sentence only when it says something the hero does not.',
    render: function (ctx) {
      var K = ctx.K, log = ctx.log || [], s = ctx.s || {}, sh = ctx.sh, shape = ctx.shape;
      var MONF = (K && K.MONF) || ['January','February','March','April','May','June','July','August','September','October','November','December'];
      var WDF = (K && K.WDF) || ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

      /* Weights are 400 / 500 / 700 only: those are the three Geist faces the
         kit actually loads, and anything else gets faux-bolded by the engine.
         Colour is --text-hi / --text-mid / --hairline, nothing invented. The
         only accent on the page is the one the record itself carries. */
      var CSS = '<style>' +
        '.L09-wrap{padding:18px 22px calc(44px + env(safe-area-inset-bottom));' +
          'font-variant-numeric:tabular-nums}' +
        '.L09-lead{font-size:17px;font-weight:500;color:var(--text-mid);line-height:1.3;letter-spacing:-.01em}' +
        '.L09-big{display:block;font-weight:700;color:var(--text-hi);line-height:.86;letter-spacing:-.045em;' +
          'white-space:nowrap;margin:10px 0 9px}' +
        /* the unit rides the number, so the hero is never a bare unlabelled
           figure at a glance; it scales with it instead of being a fixed size */
        '.L09-big i{font-style:normal;font-size:.32em;font-weight:500;color:var(--text-mid);' +
          'letter-spacing:-.01em;margin-left:9px}' +
        '.L09-sub{font-size:17px;font-weight:500;color:var(--text-hi);line-height:1.34;letter-spacing:-.01em}' +
        '.L09-sub b{font-weight:700}' +
        '.L09-line{font-size:14px;font-weight:400;color:var(--text-mid);line-height:1.45;margin-top:12px}' +
        '.L09-sec{margin-top:32px}' +
        '.L09-h{font-size:14px;font-weight:700;color:var(--text-hi);letter-spacing:-.01em;margin:0 0 4px}' +
        /* no row rules: the columns and the tabular figures do the aligning, so
           the page never turns into a striped table */
        '.L09-r{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:baseline;padding:10px 0}' +
        '.L09-r--2{grid-template-columns:1fr auto}' +
        '.L09-r__l{font-size:14px;font-weight:400;color:var(--text-mid);' +
          'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.L09-r__m{font-size:13px;font-weight:400;color:var(--text-mid);text-align:right;white-space:nowrap}' +
        '.L09-r__v{font-size:15px;font-weight:700;color:var(--text-hi);letter-spacing:-.012em;' +
          'text-align:right;white-space:nowrap;min-width:64px}' +
        /* the single rule on the page, and it is the receipt's one real move */
        '.L09-r--tot{margin-top:5px;padding-top:14px;border-top:1px solid var(--hairline)}' +
        '.L09-r--tot .L09-r__l{color:var(--text-hi);font-weight:700}' +
        '.L09-r--tot .L09-r__v{font-size:17px}' +
        '.L09-r--none .L09-r__v{font-weight:500;color:var(--text-mid)}' +
        '.L09-cal{margin-top:12px}' +
        '.L09-note{font-size:12.5px;font-weight:400;color:var(--text-mid);line-height:1.55;margin-top:12px}' +
        '</style>';

      if (!log.length) {
        return CSS + '<div class="L09-wrap">' +
          '<div class="L09-lead">Nothing on the record yet.</div>' +
          '<div class="L09-sub" style="margin-top:9px">Your first session starts the count.</div></div>';
      }

      /* ---------- pure helpers, nothing invented ---------- */
      function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }
      function mn(d) { return num(d && (d.minutes != null ? d.minutes : d.min)); }
      function pad2(v) { v = Math.round(num(v)); return v < 10 ? '0' + v : String(v); }
      function hm(m) {
        m = Math.max(0, Math.round(num(m)));
        var h = Math.floor(m / 60), r = m % 60;
        return h > 0 ? h + 'h ' + pad2(r) + 'm' : r + 'm';
      }
      function pl(v, one, many) { return num(v) === 1 ? one : many; }
      function comma(v) { return Math.round(num(v)).toLocaleString(); }
      function esc(v) { return String(v == null ? '' : v).replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

      var N = log.length;
      var today = log[N - 1].date, todayY = today.getFullYear();
      var totalMins = 0, onDays = 0;
      log.forEach(function (d) { totalMins += mn(d); if (d.on) onDays++; });
      var typical = onDays ? Math.round(totalMins / onDays) : 0;

      /* ---------- the total, the one hero on the page ---------- */
      var H = Math.floor(totalMins / 60);
      var bigVal, bigUnit;
      if (H >= 2) { bigVal = comma(H); bigUnit = 'hours'; }
      else { bigVal = comma(totalMins); bigUnit = pl(totalMins, 'minute', 'minutes'); }
      var bigPx = bigVal.length <= 3 ? 74 : bigVal.length <= 5 ? 64 : bigVal.length <= 7 ? 52 : 42;

      var startD = log[0].date;
      var startStr = MONF[startD.getMonth()] + ' ' + startD.getDate() +
        (startD.getFullYear() !== todayY ? ', ' + startD.getFullYear() : '');
      var sinceLine = (N <= 1)
        ? 'That is day one.'
        : 'Across <b>' + comma(onDays) + '</b> ' + pl(onDays, 'day', 'days') + ' since ' + startStr + '.';

      /* ---------- exactly one support line ----------
         Two 14px lines a few pixels apart was the page's real confusion, so the
         goal sentence and the pace sentence compete for one slot. The goal wins
         when it has something to say, because that is the sign of progress the
         hero cannot give; otherwise the pace speaks.
         maintenance and open stay silent by design: they would only restate the
         record above, and maintenance would have to name a run, which this
         layout does not keep. */
      var goalLine = '';
      if (sh) {
        var gv = sh.ctx || {};
        if ((shape === 'quantity_up' || shape === 'quantity_down') && sh.lead && sh.sub) {
          goalLine = esc(sh.lead) + ' ' + esc(sh.sub) + '.';
        } else if (shape === 'milestone' && gv.v != null && gv.l) {
          goalLine = esc(gv.v) + ' ' + esc(gv.l) + '.';
        } else if (shape === 'frequency' && N >= 28 && sh.lead && sh.sub) {
          goalLine = esc(sh.lead) + ' ' + esc(sh.sub) + '.';
        }
      }
      /* The typical-day line is suppressed in the first week, where the
         breakdown below is already day by day: there it is not an insight, it
         is the hero divided by the rows underneath it. */
      var paceLine = '';
      if (N >= 14) paceLine = 'About ' + hm(totalMins / (N / 7)) + ' in an average week.';
      else if (N > 7 && onDays >= 2) paceLine = 'The days you show up average ' + hm(typical) + '.';
      var support = goalLine || paceLine;

      var hero =
        '<div class="L09-lead">You have put in</div>' +
        '<span class="L09-big" style="font-size:' + bigPx + 'px">' + bigVal + '<i>' + bigUnit + '</i></span>' +
        '<div class="L09-sub">' + sinceLine + '</div>' +
        (support ? '<div class="L09-line">' + support + '</div>' : '');

      /* ---------- one row component for the whole page ---------- */
      function rowHTML(l, m, v, cls) {
        var two = (m === '' || m == null);
        return '<div class="L09-r' + (two ? ' L09-r--2' : '') + (cls ? ' ' + cls : '') + '">' +
          '<span class="L09-r__l">' + l + '</span>' +
          (two ? '' : '<span class="L09-r__m">' + m + '</span>') +
          '<span class="L09-r__v">' + v + '</span></div>';
      }

      /* ---------- how it adds up: ONE table, resolution follows the record ----------
         Whatever is listed adds up to the total exactly, so it can be checked
         by hand. The first week is listed day by day (and then the heatmap is
         suppressed, because the day rows already are the record and say more).
         A single month goes to weeks, anything longer goes to months. Never two
         of them stacked, and never a single row that would only restate the
         hero. */
      var groups = [], gmap = {};
      log.forEach(function (d) {
        var y = d.date.getFullYear(), m = d.date.getMonth(), k = y + '-' + m;
        if (!gmap[k]) { gmap[k] = { y: y, m: m, mins: 0, on: 0 }; groups.push(gmap[k]); }
        gmap[k].mins += mn(d); if (d.on) gmap[k].on++;
      });
      function dayLabel(d) { return WDF[d.getDay()] + ', ' + MONF[d.getMonth()] + ' ' + d.getDate(); }
      function dayCount(v) { return comma(v) + ' ' + pl(v, 'day', 'days'); }

      var rows = [], countCol = false, dayMode = (N >= 2 && N <= 7);
      if (dayMode) {
        log.slice().reverse().forEach(function (d, i) {
          var m = mn(d);
          rows.push({
            l: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : dayLabel(d.date),
            m: '', v: hm(m), cls: m > 0 ? '' : 'L09-r--none'
          });
        });
      } else if (groups.length > 1) {
        countCol = true;
        var rev = groups.slice().reverse();
        /* four months fit, so never lump a single month into a vague bucket */
        var keep = rev.length <= 4 ? 4 : 3;
        rev.slice(0, keep).forEach(function (g, i) {
          rows.push({
            l: MONF[g.m] + (g.y !== todayY ? ' ' + g.y : '') + (i === 0 ? ' so far' : ''),
            m: dayCount(g.on), v: hm(g.mins)
          });
        });
        if (rev.length > keep) {
          var rm = 0, ro = 0;
          rev.slice(keep).forEach(function (g) { rm += g.mins; ro += g.on; });
          rows.push({ l: 'Everything before that', m: dayCount(ro), v: hm(rm) });
        }
      } else if (N > 7) {
        /* one calendar month, so weeks are the honest unit: still every minute,
           still adds up, and it keeps the same three columns as the months. */
        var wks = [], wk = null;
        log.forEach(function (d) {
          if (!wk || d.date.getDay() === 1) { wk = { mins: 0, on: 0, start: d.date }; wks.push(wk); }
          wk.mins += mn(d); if (d.on) wk.on++;
        });
        if (wks.length > 1) {
          countCol = true;
          wks.slice().reverse().forEach(function (w, i) {
            rows.push({
              l: i === 0 ? 'This week so far' : 'Week of ' + MONF[w.start.getMonth()] + ' ' + w.start.getDate(),
              m: dayCount(w.on), v: hm(w.mins), cls: w.mins > 0 ? '' : 'L09-r--none'
            });
          });
        }
      }

      var addsUp = '';
      if (rows.length) {
        /* the total mirrors the body's columns, so the amounts stay in one
           straight line all the way down to the rule */
        rows.push({
          l: 'Total', m: countCol ? dayCount(onDays) : '',
          v: hm(totalMins), cls: 'L09-r--tot'
        });
        addsUp = '<div class="L09-sec"><div class="L09-h">How it adds up</div>' +
          rows.map(function (r) { return rowHTML(r.l, r.m, r.v, r.cls); }).join('') + '</div>';
      }

      /* ---------- what the time went into: only what actually happened ----------
         A row of zeroes on day three reads like a scorecard you are failing,
         so an untouched module simply is not listed. */
      var SUP = [
        { k: 'deepwork', n: 'Deep work', u: 'sessions' },
        { k: 'reflection', n: 'Reflection', u: 'entries' },
        { k: 'checkin', n: 'Check-ins', u: 'mornings' },
        { k: 'vivere', n: 'Vivere', u: 'visits' }
      ];
      var supBody = '';
      SUP.forEach(function (r) {
        var v = num(s.sup && s.sup[r.k]);
        if (v <= 0) return;
        /* The unit sits in the middle column, exactly where the day counts sit
           in the table above, so the figures in both tables right-align to the
           same edge instead of going ragged behind their own units. It names
           the column, so it stays plural at any count. */
        supBody += rowHTML(r.n, r.u, comma(v));
      });
      var itemised = supBody
        ? '<div class="L09-sec"><div class="L09-h">What you did</div>' + supBody + '</div>'
        : '';

      /* ---------- the full record ----------
         Suppressed while the breakdown is already day by day, so the first week
         never shows the same seven days twice. The kit sizes its own columns;
         capping the width keeps a short record from drawing giant squares. */
      var record = '';
      if (N > 7) {
        var cols = Math.max(7, Math.min(21, Math.round(Math.sqrt(N * 1.6))));
        var gap = N > 180 ? 3 : N > 90 ? 4 : 6;
        var calMax = cols * 22 + (cols - 1) * gap;
        var cal = (K && K.calendarHTML) ? K.calendarHTML(log, { cols: cols }) : '';
        record =
          '<div class="L09-sec"><div class="L09-h">The record</div>' +
          '<div class="L09-cal" style="max-width:' + calMax + 'px">' + cal + '</div>' +
          '<div class="L09-note">Every day since you started. ' +
          'The filled squares are the days you put time in.</div></div>';
      }

      return CSS + '<div class="L09-wrap">' + hero + addsUp + itemised + record + '</div>';
    }
  };
})();
