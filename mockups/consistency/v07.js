/* v07. SUMMARY, THEN EVERYTHING.
   One glanceable answer fills the first screen (bloom or calendar, the shape
   line, six numbers). A hard break, then the deep record: eleven labelled groups
   of real statistics. The hero swaps with a CSS-only segmented control so the
   page needs no script.
   Every number on this page is read off ctx.s or ctx.log. Where a window is
   shorter than its name (a record younger than 30 or 60 days), the page says so
   instead of padding the denominator. */
(function (W) {
  'use strict';
  var seq = 0;

  W.CVAR = W.CVAR || {};
  W.CVAR['v07'] = {
    name: 'Summary, then everything',
    note: 'The first screen answers the question on its own: bloom or calendar, the shape line, six numbers. A break, then eleven grouped sections of the full record for anyone who wants depth. Windows shorter than their label are named by their real length.',

    render: function (ctx) {
      var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh;
      seq++;
      var uid = 'v07u' + seq;

      /* ---------- small local helpers, no invented numbers ---------- */
      function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
      function fL(d) { return d ? K.MONF[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() : 'no day yet'; }
      function row(l, v) { return '<div class="ck-row"><span>' + l + '</span><b>' + v + '</b></div>'; }
      function rowEm(l, v, em) { return '<div class="ck-row"><span>' + l + '</span><b>' + v + '<em>' + em + '</em></b></div>'; }
      function key(v, l) { return '<div class="v07-key"><b>' + K.n(v) + '</b><span>' + l + '</span></div>'; }
      function dayw(n) { return n === 1 ? 'day' : 'days'; }
      function weekw(n) { return n === 1 ? 'week' : 'weeks'; }
      function onOf(a) { return a.filter(function (d) { return d.on; }).length; }

      var start = log.length ? log[0].date : null;
      var mNow = s.months[s.months.length - 1] || null;
      var mPrev = s.months.length > 1 ? s.months[s.months.length - 2] : null;
      var pNow = mNow ? pct(mNow.on, mNow.all) : 0;
      var pPrev = mPrev ? pct(mPrev.on, mPrev.all) : 0;
      var bestPct = pct(s.byDow[s.bestDow], s.dowSeen[s.bestDow]);
      var worstPct = pct(s.byDow[s.worstDow], s.dowSeen[s.worstDow]);
      var perWeekMin = s.N ? Math.round(s.minutes / (s.N / 7)) : 0;
      var supTotal = s.sup.deepwork + s.sup.reflection + s.sup.checkin + s.sup.vivere;
      var weeks = s.weeks.slice(-14);

      /* A partial week cannot be judged against a weekly rate, so every weekly
         claim on this page is made against the full weeks only. */
      var fullWeeks = s.weeks.filter(function (w) { return w.all === 7; });
      var metFull = fullWeeks.filter(function (w) { return w.on >= s.cadence; }).length;
      var fullAvg = fullWeeks.length
        ? (fullWeeks.reduce(function (a, w) { return a + w.on; }, 0) / fullWeeks.length).toFixed(1)
        : null;

      /* The real length of every window this page names, so no denominator is
         ever larger than the record that fills it. */
      var w30 = Math.min(30, s.N);
      var wPrev30 = Math.max(0, Math.min(30, s.N - 30));
      var wSpark = Math.min(60, s.N);
      var canCompare = w30 === 30 && wPrev30 === 30;

      /* ---------- scoped styles ---------- */
      var css = '<style>' +
        '.v07-hero{position:relative}' +
        '.v07-r{position:absolute;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;margin:0}' +
        '.v07-sb{font:inherit;font-size:12px;font-weight:600;color:var(--text-mid);border-radius:6px;' +
          'padding:6px 14px;cursor:pointer;user-select:none;-webkit-user-select:none;transition:color .16s ease,background .16s ease}' +
        '.v07-r--a:checked ~ .v07-segwrap .v07-sb--a,.v07-r--b:checked ~ .v07-segwrap .v07-sb--b{color:var(--text-hi);background:var(--fill-2)}' +
        '.v07-r--a:focus-visible ~ .v07-segwrap .v07-sb--a,.v07-r--b:focus-visible ~ .v07-segwrap .v07-sb--b{box-shadow:0 0 0 2px rgba(var(--accent-rgb),.55)}' +
        '.v07-stage{min-height:302px;display:flex;align-items:center;justify-content:center;margin-top:4px}' +
        '.v07-pane{width:100%;min-width:0}' +
        '.v07-pane--b{display:none}' +
        '.v07-r--b:checked ~ .v07-stage .v07-pane--a{display:none}' +
        '.v07-r--b:checked ~ .v07-stage .v07-pane--b{display:block}' +
        '.v07-lg{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:14px;font-size:11.5px;color:var(--text-mid)}' +
        '.v07-lg span{display:inline-flex;align-items:center;gap:6px}' +
        '.v07-lg i{display:block;width:9px;height:9px;border-radius:2.5px;flex:0 0 auto}' +
        '.v07-lg i.a{background:rgba(var(--accent-rgb),.62)}' +
        '.v07-lg i.b{background:rgba(var(--accent-rgb),.22)}' +
        '.v07-lg i.c{background:rgba(var(--ink),.10)}' +
        '.v07-lead{text-align:center;margin-top:18px}' +
        '.v07-keys{display:grid;grid-template-columns:repeat(3,1fr);background:var(--fill-1);box-shadow:var(--inset);' +
          'border-radius:14px;overflow:hidden;margin-top:16px}' +
        /* dividers only, drawn as insets so no cell carries a border box */
        '.v07-key{padding:13px 12px 13px;min-width:0}' +
        '.v07-key:not(:nth-child(3n+1)){box-shadow:inset 1px 0 0 var(--hairline)}' +
        '.v07-key:nth-child(n+4){box-shadow:inset 0 1px 0 var(--hairline)}' +
        '.v07-key:nth-child(n+4):not(:nth-child(3n+1)){box-shadow:inset 1px 0 0 var(--hairline),inset 0 1px 0 var(--hairline)}' +
        '.v07-key b{display:block;font-size:22px;font-weight:750;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}' +
        '.v07-key span{display:block;font-size:11.5px;color:var(--text-mid);line-height:1.35;margin-top:6px}' +
        '.v07-rule{height:1px;background:var(--hairline);margin:32px -20px 22px}' +
        '.v07-brk h3{font-size:19px;font-weight:700;letter-spacing:-.02em;margin:0}' +
        '.v07-brk p{font-size:13px;color:var(--text-mid);line-height:1.55;margin:7px 0 0}' +
        '.v07-say{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin-top:11px}' +
        '.v07 b.v07-up{color:var(--accent)}' +
        '.v07 b.v07-dn{color:var(--text-mid)}' +
        '.v07-wk{display:flex;gap:4px;align-items:flex-end}' +
        '.v07-wk__c{flex:1;min-width:0;text-align:center}' +
        '.v07-wk__t{height:64px;display:flex;align-items:flex-end}' +
        '.v07-wk__t i{display:block;width:100%;max-width:30px;margin:0 auto;border-radius:4px 4px 2px 2px;background:rgba(var(--ink),.13)}' +
        '.v07-wk__t i.met{background:rgba(var(--accent-rgb),.52)}' +
        '.v07-wk__c span{display:block;font-size:10.5px;color:var(--text-mid);margin-top:6px;font-variant-numeric:tabular-nums}' +
        /* keep columns honest when there are only a few of them */
        '.v07 .ck-mo__t i{max-width:34px;margin:0 auto}' +
        '</style>';

      /* ---------- the hero: bloom or calendar, CSS-only swap ---------- */
      var hero =
        '<div class="v07-hero">' +
          '<input class="v07-r v07-r--a" type="radio" name="' + uid + '" id="' + uid + 'a" aria-label="Bloom" checked>' +
          '<input class="v07-r v07-r--b" type="radio" name="' + uid + '" id="' + uid + 'b" aria-label="Calendar">' +
          '<div class="ck-segwrap v07-segwrap"><div class="ck-seg">' +
            '<label class="v07-sb v07-sb--a" for="' + uid + 'a">Bloom</label>' +
            '<label class="v07-sb v07-sb--b" for="' + uid + 'b">Calendar</label>' +
          '</div></div>' +
          '<div class="v07-stage">' +
            '<div class="v07-pane v07-pane--a"><div class="ck-bloomwrap">' +
              K.bloomSVG(s.total, { size: 300, animate: true }) +
            '</div></div>' +
            '<div class="v07-pane v07-pane--b">' +
              K.calendarHTML(log) +
              '<div class="v07-lg">' +
                '<span><i class="a"></i>shown up</span>' +
                '<span><i class="b"></i>checked in only</span>' +
                '<span><i class="c"></i>missed</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';

      /* Six numbers. The shape's own stat keeps its slot, and a standard cell
         that would repeat a figure already on the grid gives way to another true
         one. If the record has no distinct figure left (a young, unbroken record
         really is a page of sevens and zeros) the cell keeps its own number
         rather than showing something that is not the label above it. */
      var pool = [
        [s.r30, 'days shown up in the last ' + w30],
        [s.longestGap, 'longest gap, in days'],
        [s.comebacks, 'times you started again'],
        [s.gaps, 'separate gaps'],
        [metFull, 'full ' + weekw(metFull) + ' at ' + s.cadence + ' days or more'],
        [s.hours, 'hours in total'],
        [s.avgSession, 'minutes on an average day'],
        [s.supDays, 'days you only checked in']
      ];
      var used = [String(sh.ctx.v)];
      var five = [
        [s.total, 'days shown up'],
        [s.rate + '%', 'of all days'],
        [s.current, 'current run'],
        [s.best, 'best run'],
        [s.missed, 'days missed']
      ].map(function (k) {
        if (used.indexOf(String(k[0])) < 0) { used.push(String(k[0])); return k; }
        for (var i = 0; i < pool.length; i++) {
          if (used.indexOf(String(pool[i][0])) < 0) {
            var alt = pool.splice(i, 1)[0];
            used.push(String(alt[0]));
            return alt;
          }
        }
        used.push(String(k[0]));
        return k;
      });

      /* ---------- the summary: shape line + six numbers ---------- */
      var summary =
        '<div class="v07-lead">' +
          '<div class="ck-n ck-n--big">' + sh.lead + '</div>' +
          '<div class="ck-u">' + sh.sub + '</div>' +
        '</div>' +
        '<div class="ck-micro">Since ' + fL(start) + '. ' + K.n(s.N) + ' days on the record.</div>' +
        '<div class="v07-keys">' +
          five.map(function (k) { return key(k[0], k[1]); }).join('') +
          key(sh.ctx.v, sh.ctx.l) +
        '</div>';

      /* ---------- the break ---------- */
      var brk =
        '<div class="v07-rule"></div>' +
        '<div class="v07-brk">' +
          '<h3>The full record</h3>' +
          '<p>Everything below is the same log, counted every way it can be counted. Nothing here is estimated, no window is longer than the record behind it, and a missed day stays a missed day.</p>' +
        '</div>';

      /* ---------- 1. lately ---------- */
      var dl = s.delta30;
      var dCell = dl > 0 ? '<b class="v07-up">+' + dl + ' ' + dayw(dl) + '</b>'
                : dl < 0 ? '<b class="v07-dn">' + dl + ' ' + dayw(Math.abs(dl)) + '</b>'
                         : '<b class="v07-dn">even</b>';
      var latelySay = !canCompare
        ? 'There is not a full 30 days before these ones on the record yet, so there is nothing to compare this window with.'
        : dl > 0 ? 'You showed up on ' + dl + ' more ' + dayw(dl) + ' in the last 30 than in the 30 before them.'
        : dl < 0 ? 'You showed up on ' + Math.abs(dl) + ' fewer ' + dayw(Math.abs(dl)) + ' in the last 30 than in the 30 before them.'
                 : 'The last 30 days and the 30 before them came out the same.';
      var lastWk = Math.min(4, s.weeks.length);
      var sLately =
        '<h2>Lately</h2>' +
        K.sparkline(log, 60, 350, 44) +
        '<div class="v07-say">The rolling seven day rate across the last ' + wSpark + ' ' + dayw(wSpark) +
          '. Higher means more days marked in that window.</div>' +
        '<div class="ck-rows" style="margin-top:10px">' +
          rowEm('The last ' + w30 + ' ' + dayw(w30), s.r30, 'of ' + w30) +
          (canCompare ? rowEm('The 30 days before those', s.rPrev30, 'of 30') : '') +
          (canCompare ? '<div class="ck-row"><span>Change</span>' + dCell + '</div>' : '') +
          rowEm('The last ' + lastWk + ' ' + weekw(lastWk), s.last4Rate.toFixed(1), 'days a week') +
        '</div>' +
        '<div class="v07-say">' + latelySay + ' The week you are in is still open and counts only the days it has had.</div>';

      /* ---------- 2. runs and gaps ---------- */
      var inGap = log.length ? !log[log.length - 1].on : false;
      var avgGap = s.gaps ? (s.missed / s.gaps).toFixed(1) : '0';
      var sRuns =
        '<h2>Runs and gaps</h2>' +
        '<div class="ck-rows">' +
          rowEm('Run you are on now', s.current, dayw(s.current)) +
          rowEm('Longest run you have had', s.best, dayw(s.best)) +
          rowEm('Longest gap', s.longestGap, dayw(s.longestGap)) +
          rowEm('Average gap', avgGap, 'days') +
          row('Separate gaps', s.gaps) +
          row('Times you started again', s.comebacks) +
          rowEm('Days missed', s.missed, 'of ' + s.N) +
        '</div>' +
        '<div class="v07-say">' + (inGap ? 'You are in a gap right now. ' : '') +
          (s.missed === 0
            ? 'You have not missed a day since you started.'
            : 'The ' + s.missed + ' ' + dayw(s.missed) + ' you missed ' + (s.missed === 1 ? 'sits' : 'sit') +
              ' in the same record as the ' + s.total + ' you made.') + '</div>';

      /* ---------- 3. week by week ---------- */
      var wkBars = weeks.map(function (w) {
        var h = Math.max(5, 100 * Math.min(7, w.on) / 7);
        return '<div class="v07-wk__c"><div class="v07-wk__t">' +
          '<i class="' + (w.on >= s.cadence ? 'met' : '') + '" style="height:' + h.toFixed(0) + '%"></i>' +
          '</div><span>' + w.on + '</span></div>';
      }).join('');
      var sWeeks =
        '<h2>Week by week</h2>' +
        '<div class="v07-wk">' + wkBars + '</div>' +
        '<div class="v07-say">The last ' + weeks.length + ' ' + weekw(weeks.length) +
          ', Monday to Sunday. Full height is seven days. The solid bars are weeks that reached ' +
          s.cadence + ' days or more. The bar on the right is the week you are in, still open, and the one on the left may be part of a week too.</div>' +
        '<div class="ck-rows" style="margin-top:10px">' +
          row('Weeks the record touches', s.weeks.length) +
          rowEm('Full seven day weeks', fullWeeks.length, 'of ' + s.weeks.length) +
          (fullWeeks.length ? rowEm('Full weeks at ' + s.cadence + ' days or more', metFull, 'of ' + fullWeeks.length) : '') +
          (fullAvg !== null ? rowEm('Average across full weeks', fullAvg, 'days a week') : '') +
          rowEm('Across the whole record', s.perWeek.toFixed(1), 'days per seven') +
        '</div>';

      /* ---------- 4. rhythm ---------- */
      var dowSay = (s.bestDow !== s.worstDow && bestPct !== worstPct)
        ? 'You have shown up on ' + bestPct + '% of the ' + K.WDF[s.bestDow] + 's on the record and ' +
          worstPct + '% of the ' + K.WDF[s.worstDow] + 's. Each bar is the share of that weekday you showed up.'
        : 'Every weekday sits at the same rate so far, so there is no strong or weak day to read yet. Each bar is the share of that weekday you showed up.';
      var sDow =
        '<h2>Your rhythm</h2>' +
        K.dowChart(s) +
        '<div class="v07-say">' + dowSay + '</div>';

      /* ---------- 5. weekdays and weekends ---------- */
      var wdOn = 0, wdSeen = 0, weOn = 0, weSeen = 0;
      for (var di = 0; di < 7; di++) {
        if (di === 0 || di === 6) { weOn += s.byDow[di]; weSeen += s.dowSeen[di]; }
        else { wdOn += s.byDow[di]; wdSeen += s.dowSeen[di]; }
      }
      var wdPct = pct(wdOn, wdSeen), wePct = pct(weOn, weSeen);
      var wwSay = wdPct === wePct
        ? 'Weekdays and weekends come out at the same rate on this record.'
        : wdPct > wePct
          ? 'Weekends run ' + (wdPct - wePct) + ' points behind weekdays.'
          : 'Weekdays run ' + (wePct - wdPct) + ' points behind weekends.';
      var sWkEnd =
        '<h2>Weekdays and weekends</h2>' +
        '<div class="ck-rows">' +
          rowEm('Weekdays shown up', wdOn, 'of ' + wdSeen) +
          rowEm('Weekends shown up', weOn, 'of ' + weSeen) +
          row('Weekday rate', wdPct + '%') +
          row('Weekend rate', wePct + '%') +
        '</div>' +
        '<div class="v07-say">' + wwSay + '</div>';

      /* ---------- 6. month by month ---------- */
      var moSay = mPrev
        ? K.MONF[mNow.date.getMonth()] + ' is at ' + pNow + '% so far. ' +
          K.MONF[mPrev.date.getMonth()] + ' came out at ' + pPrev + '%. A month at either end of the record counts only the days the record covers.'
        : 'One month on the record so far. The column fills as the month runs.';
      var sMonths =
        '<h2>Month by month</h2>' +
        K.monthChart(s) +
        '<div class="v07-say">' + moSay + '</div>';

      /* ---------- 7. this month ---------- */
      var sMonth =
        '<h2>This month</h2>' +
        K.monthGrid(log) +
        '<div class="v07-say">' + s.thisMonth.on + ' of ' + s.thisMonth.all + ' ' + dayw(s.thisMonth.all) +
          ' on the record in ' + (mNow ? K.MONF[mNow.date.getMonth()] : 'this month') +
          '. Filled days are days you showed up. Half filled days are days you checked in without making the move. ' +
          'Plain days are days you missed. Blank days sit outside the record.</div>';

      /* ---------- 8. time on the work ---------- */
      var sTime =
        '<h2>Time on the work</h2>' +
        '<div class="ck-tiles ck-tiles--2">' +
          K.tile(s.hours, 'hours in total') +
          K.tile(s.avgSession, 'minutes on an average day') +
        '</div>' +
        '<div class="ck-rows" style="margin-top:10px">' +
          row('Minutes recorded', K.n(s.minutes)) +
          rowEm('In an average week', K.n(perWeekMin), 'minutes') +
          row('Days that carry time', s.total) +
        '</div>' +
        '<div class="v07-say">Time is only counted on days you marked, so this number never runs ahead of the record.</div>';

      /* ---------- 9. how long the days ran ---------- */
      var onMins = log.filter(function (d) { return d.on; })
        .map(function (d) { return d.minutes; })
        .sort(function (a, b) { return a - b; });
      var sMins = '';
      if (onMins.length) {
        var mMax = onMins[onMins.length - 1];
        var mMin = onMins[0];
        var mMed = onMins[Math.floor((onMins.length - 1) / 2)];
        var mHour = onMins.filter(function (v) { return v >= 60; }).length;
        var mShort = onMins.filter(function (v) { return v < 30; }).length;
        sMins =
          '<h2>How long the days ran</h2>' +
          '<div class="ck-rows">' +
            rowEm('Longest day', mMax, 'minutes') +
            rowEm('Middle day', mMed, 'minutes') +
            rowEm('Shortest day you still showed up', mMin, 'minutes') +
            rowEm('Days of an hour or more', mHour, 'of ' + s.total) +
            rowEm('Days under half an hour', mShort, 'of ' + s.total) +
          '</div>' +
          '<div class="v07-say">Half the days you marked ran ' + mMed + ' minutes or more. A short day counts the same as a long one everywhere else on this page.</div>';
      }

      /* ---------- 10. life around the work ---------- */
      var supSay = s.supDays > 0
        ? 'On ' + s.supDays + ' ' + dayw(s.supDays) + ' you checked in without making the main move. Those show in the calendar as the checked in only cells and they do not count as days shown up.'
        : 'Every support action landed on a day you also made the main move.';
      var sSup =
        '<h2>Life around the work</h2>' +
        K.supportRows(s) +
        '<div class="v07-say">' + K.n(supTotal) + ' support actions in total. ' + supSay + '</div>';

      /* ---------- 11. since day one ---------- */
      var half = Math.floor(s.N / 2);
      var h1 = log.slice(0, half), h2 = log.slice(half);
      var h1On = onOf(h1), h2On = onOf(h2);
      var h1P = pct(h1On, h1.length), h2P = pct(h2On, h2.length);
      var halfSay = h2P > h1P
        ? 'The second half of the record sits ' + (h2P - h1P) + ' points above the first.'
        : h2P < h1P
          ? 'The second half of the record sits ' + (h1P - h2P) + ' points below the first.'
          : 'Both halves of the record came out at the same rate.';
      var sAll =
        '<h2>Since day one</h2>' +
        '<div class="ck-rows">' +
          row('First day you showed up', fL(s.firstOn)) +
          row('Last day you showed up', fL(s.lastOn)) +
          rowEm('Days on the record', s.N, 'since ' + (start ? K.MON[start.getMonth()] + ' ' + start.getDate() : '')) +
          row('Days shown up', s.total) +
          row('Days missed', s.missed) +
          rowEm('Show rate', s.rate + '%', 'of all days') +
          rowEm('First ' + h1.length + ' ' + dayw(h1.length), h1On, h1P + '%') +
          rowEm('Last ' + h2.length + ' ' + dayw(h2.length), h2On, h2P + '%') +
        '</div>' +
        '<div class="v07-say">' + halfSay + '</div>';

      return '<div class="cx v07">' + css +
        '<div class="cx__top">' +
          '<div class="cx__title">Consistency</div>' +
          '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></div>' +
        '</div>' +
        hero + summary + brk +
        sLately + sRuns + sWeeks + sDow + sWkEnd + sMonths + sMonth + sTime + sMins + sSup + sAll +
        '<div class="cx__foot">A missed day is a missed day. Nothing on this page rounds one away.</div>' +
      '</div>';
    }
  };
})(window);
