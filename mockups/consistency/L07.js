/* ============================================================
   L07, WEEKLY CHAPTERS
   Lens: a day is noise, a week is signal. The page is one open
   chapter (this week, large), one honest comparison to the same
   point last week, then every finished week as a single row: 7
   cells and a count. A year reads as 52 chapters, not 365 pixels.
   ============================================================ */
(function () {
  var W = window;
  W.CLAY = W.CLAY || {};

  var WDM = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];            // Monday first, the week as people live it
  var WDF = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

  function keyOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function mid(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function add(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function monday(d) { var x = mid(d); return add(x, -((x.getDay() + 6) % 7)); }
  function dec1(v) {
    if (!isFinite(v)) return '0';
    var r = (Math.round(v * 10) / 10).toFixed(1);
    return r.replace(/\.0$/, '');
  }
  function plural(n, one, many) { return n === 1 ? one : many; }
  function word(n) { return WORD[n] || String(n); }

  /* Every week the record touches, oldest first. A slot is only ever one of
     four honest things: shown up, something around the work, missed, or no day
     there at all (not yet, or before the record began). */
  function buildWeeks(log) {
    var map = {}, i;
    for (i = 0; i < log.length; i++) map[log[i].key] = log[i];
    var todayKey = log[log.length - 1].key;
    var todayMid = mid(log[log.length - 1].date);
    var cur = monday(log[0].date), endMon = monday(log[log.length - 1].date);
    var weeks = [], guard = 0;

    while (cur.getTime() <= endMon.getTime() && guard++ < 400) {
      var slots = [], on = 0, rec = 0;
      for (var j = 0; j < 7; j++) {
        var d = add(cur, j), k = keyOf(d), e = map[k], st;
        if (e) {
          rec++;
          if (e.on) { on++; st = 'on'; }
          else st = (e.sup && Object.keys(e.sup).length) ? 'sup' : 'off';
        } else {
          st = d.getTime() > todayMid.getTime() ? 'fut' : 'pre';
        }
        slots.push({ st: st, today: k === todayKey });
      }
      weeks.push({ mon: cur, slots: slots, on: on, rec: rec });
      cur = add(cur, 7);
    }
    return weeks;
  }

  function heroCells(w) {
    return '<div class="L07-wk">' + w.slots.map(function (sl, i) {
      var t = sl.today ? ' today' : '';
      return '<div class="L07-wk__c' + t + '">' +
          '<div class="L07-wk__b ' + sl.st + t + '"></div><span>' + WDM[i] + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function chapterRow(w, label) {
    var cells = w.slots.map(function (sl) { return '<i class="' + sl.st + '"></i>'; }).join('');
    return '<div class="L07-ch__r">' +
        '<span class="L07-ch__l">' + label + '</span>' +
        '<span class="L07-ch__s">' + cells + '</span>' +
        '<span class="L07-ch__n">' + w.on + ' of ' + w.rec + '</span>' +
      '</div>';
  }

  var CSS = '<style>' +
    '.L07{padding:6px 20px 46px;font-family:var(--font);color:var(--text-hi)}' +
    '.L07 p{margin:0}' +
    /* the goal's own line, the one place goal shape speaks */
    '.L07 .L07-goal{font-size:13.5px;color:var(--text-mid);line-height:1.45;' +
      'font-variant-numeric:tabular-nums;overflow-wrap:break-word}' +
    /* the one hero */
    '.L07-num{display:flex;align-items:baseline;gap:10px;margin:12px 0 4px}' +
    '.L07-num b{font-size:76px;font-weight:800;line-height:.9;letter-spacing:-.05em;' +
      'font-variant-numeric:tabular-nums;color:var(--text-hi)}' +
    '.L07-num span{font-size:26px;font-weight:600;letter-spacing:-.02em;' +
      'font-variant-numeric:tabular-nums;color:var(--text-mid)}' +
    '.L07 .L07-cap{font-size:15.5px;font-weight:500;color:var(--text-hi);line-height:1.35;' +
      'letter-spacing:-.01em;overflow-wrap:break-word}' +
    /* the open week */
    '.L07-wk{display:flex;gap:6px;margin-top:20px}' +
    '.L07-wk__c{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:7px}' +
    '.L07-wk__b{width:100%;height:38px;border-radius:9px;background:rgba(var(--ink),.13)}' +
    '.L07-wk__b.sup{background:rgba(var(--accent-rgb),.20)}' +
    '.L07-wk__b.on{background:rgba(var(--accent-rgb),.62)}' +
    '.L07-wk__b.fut,.L07-wk__b.pre{background:rgba(var(--ink),.035)}' +
    '.L07-wk__b.today{box-shadow:inset 0 0 0 2px rgba(var(--accent-rgb),.34)}' +
    '.L07-wk__b.on.today{background:var(--accent);box-shadow:none}' +
    '.L07-wk__c span{font-size:11px;color:var(--text-lo);font-variant-numeric:tabular-nums}' +
    '.L07-wk__c.today span{color:var(--accent)}' +
    /* the quiet lines: same type, same colour, numbers carry the weight */
    '.L07 .L07-line{font-size:13.5px;color:var(--text-mid);line-height:1.5;' +
      'font-variant-numeric:tabular-nums;overflow-wrap:break-word}' +
    '.L07 .L07-cmp{margin-top:16px}' +
    '.L07 .L07-avg{margin-top:5px}' +
    '.L07-line b{color:var(--text-hi);font-weight:650}' +
    /* the finished chapters */
    '.L07-sec{margin-top:28px}' +
    '.L07-sec__h{font-size:14px;font-weight:700;margin:0 0 10px;letter-spacing:-.01em;color:var(--text-hi)}' +
    '.L07-ch__r,.L07-ch__hd{display:flex;align-items:center;gap:10px}' +
    '.L07-ch__r{padding:6px 0}' +
    '.L07-ch__hd{padding:0 0 5px}' +
    '.L07-ch__l{flex:0 0 56px;min-width:0;font-size:12px;color:var(--text-mid);' +
      'white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.L07-ch__s{flex:1;min-width:0;display:flex;gap:4px}' +
    '.L07-ch__s i{flex:1;min-width:0;height:16px;border-radius:5px;background:rgba(var(--ink),.13)}' +
    '.L07-ch__s i.sup{background:rgba(var(--accent-rgb),.20)}' +
    '.L07-ch__s i.on{background:rgba(var(--accent-rgb),.62)}' +
    '.L07-ch__s i.fut,.L07-ch__s i.pre{background:rgba(var(--ink),.035)}' +
    '.L07-ch__n{flex:0 0 46px;text-align:right;font-size:12px;color:var(--text-mid);' +
      'font-variant-numeric:tabular-nums}' +
    '.L07-ch__hd .L07-ch__s i{height:auto;background:transparent;border-radius:0;font-style:normal;' +
      'font-size:10px;color:var(--text-lo);text-align:center;line-height:1}' +
    '.L07 .L07-foot{margin-top:22px;font-size:12px;color:var(--text-mid);line-height:1.55}' +
  '</style>';

  W.CLAY['L07'] = {
    name: 'Weekly chapters',
    note: 'Weeks are the unit. One open week at the top with the number you are at, one honest comparison to the same point last week, then every finished week as a row of seven cells and a count. Day streaks appear nowhere: the record is read a week at a time, and the seven columns of the list stay aligned so the shape of a normal week shows itself.',
    render: function (ctx) {
      var log = ctx && ctx.log, s = ctx && ctx.s, sh = ctx && ctx.sh;
      if (!log || !log.length) return CSS + '<div class="L07"><p class="L07-line">No record yet.</p></div>';

      var weeks = buildWeeks(log);
      var cw = weeks[weeks.length - 1];
      var prev = weeks.length > 1 ? weeks[weeks.length - 2] : null;
      var total = s && typeof s.total === 'number' ? s.total : log.filter(function (d) { return d.on; }).length;

      /* ---- the goal's own line, the one place goal shape speaks ---- */
      var goal;
      if (sh && sh.lead && sh.sub) goal = sh.lead + ' ' + sh.sub + '.';
      else goal = total + ' ' + plural(total, 'day', 'days') + ' recorded.';

      /* ---- the open chapter: one hero, one plain sentence under it ---- */
      var done = cw.rec >= 7;
      var caption = plural(cw.on, 'Day', 'Days') +
        (done ? ' you showed up this week.' : ' you’ve shown up so far this week.');

      /* the one comparison worth making: last week at this exact point in the
         week, so a Wednesday is never judged against a finished Sunday. */
      var todayIdx = 0;
      for (var t = 0; t < 7; t++) if (cw.slots[t].today) todayIdx = t;

      var cmp;
      if (!prev) {
        cmp = 'This is the first week of your record.';
      } else if (weeks.length === 2 && prev.rec < 7) {
        // last week was the partial week the record began in, comparing to it would
        // flatter, and its count is already in the list below
        cmp = 'Nothing to compare yet, your record began part way through last week.';
      } else {
        var pOn = 0, pRec = 0, q, st;
        if (done) { pOn = prev.on; pRec = prev.rec; }
        else {
          for (q = 0; q <= todayIdx; q++) {
            st = prev.slots[q].st;
            if (st === 'on') { pOn++; pRec++; }
            else if (st === 'off' || st === 'sup') pRec++;
          }
        }
        if (!pRec) {
          cmp = 'Last week, <b>' + prev.on + ' of ' + prev.rec + '</b>.';
        } else {
          cmp = (done ? 'Last week, ' : 'Last week by ' + WDF[todayIdx] + ', ') +
            '<b>' + pOn + ' of ' + pRec + '</b>.';
          if (pRec === cw.rec) {
            var d = cw.on - pOn;
            cmp += d > 0 ? ' You’re ' + word(d) + ' ahead.'
                 : d < 0 ? ' You’re ' + word(-d) + ' behind.'
                 : ' The same.';
          }
        }
      }

      var hero =
        '<p class="L07-goal">' + goal + '</p>' +
        '<div class="L07-num"><b>' + cw.on + '</b><span>of ' + cw.rec + '</span></div>' +
        '<p class="L07-cap">' + caption + '</p>' +
        heroCells(cw) +
        '<p class="L07-line L07-cmp">' + cmp + '</p>';

      /* ---- the supporting facts, one quiet line, no second card language ----
         Under two finished weeks any average is a lie, so the line is absent and
         the list below carries the record on its own. */
      var full = weeks.filter(function (w, i) { return w.rec === 7 && i !== weeks.length - 1; });
      var support = '';
      if (full.length >= 2) {
        var last4 = full.slice(-4);
        var sum = last4.reduce(function (a, w) { return a + w.on; }, 0);
        var bw = full.reduce(function (a, w) { return w.on > a.on ? w : a; }, full[0]);
        var line;
        if (ctx && ctx.shape === 'frequency') {
          // a rate goal already states its days-a-week figure in the line above, so
          // the average is not printed twice with two slightly different values
          var cad = (s && s.cadence) || 4;
          var hit = full.filter(function (w) { return w.on >= cad; }).length;
          line = 'You hit ' + cad + ' days or more in <b>' + hit + ' of ' + full.length + '</b> finished weeks.';
        } else {
          var av = dec1(sum / last4.length);
          line = 'Your last ' + word(last4.length) + ' weeks average <b>' + av + ' ' +
            (av === '1' ? 'day' : 'days') + '</b>.';
        }
        if (bw.on > 0) line += ' Your best week so far is <b>' + bw.on + ' of 7</b>.';
        support = '<p class="L07-line L07-avg">' + line + '</p>';
      }

      /* ---- the finished chapters, newest first, columns kept aligned ---- */
      var past = weeks.slice(0, -1).reverse();
      var rows = past.map(function (w) {
        return chapterRow(w, MON[w.mon.getMonth()] + ' ' + w.mon.getDate());
      }).join('');
      var head = '<div class="L07-ch__hd"><span class="L07-ch__l"></span><span class="L07-ch__s">' +
        WDM.map(function (x) { return '<i>' + x + '</i>'; }).join('') +
        '</span><span class="L07-ch__n"></span></div>';

      var chapters =
        '<div class="L07-sec">' +
          '<h3 class="L07-sec__h">Every week so far</h3>' +
          (past.length
            ? '<div class="L07-ch">' + head + rows + '</div>'
            : '<p class="L07-line">Weeks land here as they finish.</p>') +
        '</div>';

      /* the legend only exists once there is something faint to explain */
      var hasSup = false;
      for (var z = 0; z < log.length; z++) {
        if (!log[z].on && log[z].sup && Object.keys(log[z].sup).length) { hasSup = true; break; }
      }
      var foot = hasSup
        ? '<p class="L07-foot">Bright is a day you showed up. Faint is a day you did something around the work.</p>'
        : '';

      return CSS + '<div class="L07">' + hero + support + chapters + foot + '</div>';
    }
  };
})();
