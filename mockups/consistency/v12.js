/* v12. THE WHOLE LIFE.
   The bloom is still the record, but the page refuses to treat the main move as
   the only thing that counted. Deep work, reflections, check-ins and Vivere each
   get a full section with their own counts, their own share of the record and
   their own small chart, built the same way so they can be read against each
   other. Everything below is derived from the log. Nothing is invented. */
(function (W) {
  'use strict';

  var KEYS = ['deepwork', 'reflection', 'checkin', 'vivere'];
  /* the names as they read mid sentence (Vivere keeps its capital, it is a name) */
  var LOW = { deepwork: 'deep work', reflection: 'reflections', checkin: 'check-ins', vivere: 'Vivere' };

  function pc(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function andList(a) {
    if (a.length < 2) return a[0] || '';
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }
  function dstr(K, d) { return d ? K.MONF[d.getMonth()] + ' ' + d.getDate() : ''; }
  function plural(n, one, many) { return n === 1 ? one : many; }

  /* weekly buckets across the whole log, oldest first, last bucket = this week */
  function buckets(log) {
    var out = [];
    for (var i = log.length; i > 0; i -= 7) out.unshift(log.slice(Math.max(0, i - 7), i));
    return out;
  }

  /* everything true about one support activity */
  function supStats(K, log, k) {
    var cnt = 0, daysAny = 0, daysMain = 0, daysAlone = 0, last = null,
        dow = [0, 0, 0, 0, 0, 0, 0], months = {}, order = [];
    log.forEach(function (d, i) {
      var v = d.sup[k] || 0;
      if (!v) return;
      cnt += v; daysAny++;
      if (d.on) daysMain++; else daysAlone++;
      dow[d.date.getDay()]++;
      last = i;
      var mk = d.date.getFullYear() + '-' + d.date.getMonth();
      if (!months[mk]) { months[mk] = { v: 0, label: K.MONF[d.date.getMonth()] }; order.push(mk); }
      months[mk].v += v;
    });
    var wv = buckets(log).map(function (b) {
      var t = 0; b.forEach(function (d) { t += d.sup[k] || 0; }); return t;
    });
    var run = 0, bestRun = 0;
    wv.forEach(function (v) { if (v) { run++; if (run > bestRun) bestRun = run; } else run = 0; });
    var bm = null;
    order.forEach(function (mk) { if (!bm || months[mk].v > months[bm].v) bm = mk; });
    /* a heaviest month means nothing until there are two months to weigh, and a
       top weekday means nothing when every weekday is tied. Both stay hidden
       until the record can actually support them. */
    var mx = Math.max.apply(null, dow);
    var ties = dow.filter(function (v) { return v === mx; }).length;
    return {
      cnt: cnt, daysAny: daysAny, daysMain: daysMain, daysAlone: daysAlone,
      since: last === null ? null : (log.length - 1 - last),
      wv: wv, bestRun: bestRun, weeksLive: wv.filter(function (v) { return v > 0; }).length,
      bestMonth: (bm && order.length > 1) ? months[bm] : null,
      topDow: (mx > 1 && ties === 1) ? dow.indexOf(mx) : -1, dow: dow
    };
  }

  /* the weekly bar strip, identical for all four so they compare honestly.
     One bucket is not a chart, so below two weeks it does not draw at all. */
  function wkbars(vals, n) {
    var v = vals.slice(-n), mx = Math.max.apply(null, v) || 1;
    if (v.length < 2) return '';
    return '<div class="v12-wk">' + v.map(function (x, i) {
      var h = x ? Math.max(9, Math.round(100 * x / mx)) : 4;
      return '<i class="' + (!x ? 'zero' : (i === v.length - 1 ? 'now' : '')) + '" style="height:' + h + '%"></i>';
    }).join('') + '</div>' +
      '<div class="v12-wkl"><span>' + v.length + ' ' + plural(v.length, 'week', 'weeks') + ' back</span><span>this week</span></div>';
  }

  /* two rolling lines: everything you logged, and the main move inside it */
  function dualSpark(log, days, w, h) {
    var win = log.slice(-days);
    function y(r) { return h - r * (h - 9) - 5; }
    function series(fn) {
      return win.map(function (d, i) {
        var sl = win.slice(Math.max(0, i - 6), i + 1);
        return [i / Math.max(1, win.length - 1) * w, y(sl.filter(fn).length / sl.length)];
      });
    }
    function path(p) { return 'M' + p.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L'); }
    var A = series(function (d) { return d.on || Object.keys(d.sup).length > 0; });
    var B = series(function (d) { return d.on; });
    if (A.length < 2) return '';
    var guides = [1, 0.5, 0].map(function (r) {
      return 'M0 ' + y(r).toFixed(1) + ' L' + w + ' ' + y(r).toFixed(1);
    }).join(' ');
    return '<div class="v12-spwrap"><svg class="v12-sp" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="v12-sp__g" d="' + guides + '"/>' +
      '<path class="v12-sp__any" d="' + path(A) + '"/>' +
      '<path class="v12-sp__main" d="' + path(B) + '"/>' +
      '<circle class="v12-sp__d" cx="' + B[B.length - 1][0].toFixed(1) + '" cy="' + B[B.length - 1][1].toFixed(1) + '" r="3"/></svg>' +
      '<u class="v12-sp__hi">100%</u><u class="v12-sp__lo">0%</u></div>';
  }

  /* the honest sentence under each support panel, chosen from the numbers */
  function supSay(K, k, t, s) {
    if (t.cnt === 0) return 'Nothing logged here across all ' + s.N + ' days. The record shows it empty because it is.';
    if (t.since !== null && t.since > 20) {
      return 'Nothing for ' + t.since + ' days. Before that it ran ' + t.weeksLive + ' ' +
        plural(t.weeksLive, 'week', 'weeks') + ' out of ' + t.wv.length + '.';
    }
    var share = pc(t.daysMain, s.total);
    var base = share >= 55
      ? 'This one travels with the main move. It happened on ' + share + '% of the days you showed up.'
      : share >= 25
        ? 'It happened on ' + share + '% of the days you showed up, so it is a habit but not an automatic one.'
        : 'It reached ' + share + '% of the days you showed up, so on most of them it did not happen at all.';
    if (t.daysAlone > 0) {
      base += ' On ' + t.daysAlone + ' ' + plural(t.daysAlone, 'day', 'days') +
        ' it was the only thing logged, with no main move behind it.';
    }
    return base;
  }

  function supSection(K, log, k, s) {
    var t = supStats(K, log, k);
    var rows = '';
    rows += '<div class="ck-row"><span>Share of the days you showed up</span><b>' + pc(t.daysMain, s.total) + '%<em>' + t.daysMain + ' of ' + s.total + '</em></b></div>';
    if (t.wv.length > 1) {
      rows += '<div class="ck-row"><span>Weeks it was alive</span><b>' + t.weeksLive + '<em>of ' + t.wv.length + '</em></b></div>';
      rows += '<div class="ck-row"><span>Longest run of weeks</span><b>' + t.bestRun + '<em>' + plural(t.bestRun, 'week', 'weeks') + ' unbroken</em></b></div>';
    }
    if (t.topDow >= 0) rows += '<div class="ck-row"><span>Lands most often on</span><b>' + K.WDF[t.topDow] + '<em>' + t.dow[t.topDow] + ' ' + plural(t.dow[t.topDow], 'time', 'times') + '</em></b></div>';
    if (t.bestMonth) rows += '<div class="ck-row"><span>Heaviest month</span><b>' + t.bestMonth.label + '<em>' + t.bestMonth.v + ' ' + K.SUPUNIT[k] + '</em></b></div>';
    rows += '<div class="ck-row"><span>Last one</span><b>' +
      (t.since === null ? 'never' : t.since === 0 ? 'today' : t.since === 1 ? 'yesterday' : t.since + ' days ago') + '</b></div>';

    return '<h2>' + K.SUPNAME[k] + '</h2>' +
      '<div class="ck-panel">' +
        '<div class="v12-sh"><span class="v12-sh__i">' + K.ICON[k] + '</span>' +
          '<b class="v12-sh__n">' + K.n(t.cnt) + '</b>' +
          '<span class="v12-sh__t"><b>' + K.SUPUNIT[k] + '</b><i>on ' + t.daysAny + ' ' + plural(t.daysAny, 'separate day', 'separate days') + '</i></span></div>' +
        wkbars(t.wv, 14) +
        '<div class="ck-rows v12-rows">' + rows + '</div>' +
        '<div class="v12-say">' + supSay(K, k, t, s) + '</div>' +
      '</div>';
  }

  W.CVAR = W.CVAR || {};
  W.CVAR['v12'] = {
    name: 'The whole life',
    note: 'The bloom stays the record, then deep work, reflections, check-ins and Vivere each get a full section built the same way, so the main move sits inside everything else you showed up for rather than above it.',
    render: function (ctx) {
      var K = ctx.K, log = ctx.log, s = ctx.s, sh = ctx.sh, shape = ctx.shape;

      /* ---- derived, whole-life numbers ---- */
      var supTotal = KEYS.reduce(function (a, k) { return a + (s.sup[k] || 0); }, 0);
      var acts = s.total + supTotal;
      var anyDays = log.filter(function (d) { return d.on || Object.keys(d.sup).length; }).length;

      var last30 = log.slice(-30), prev30 = log.slice(-60, -30);
      function actsIn(win) {
        return win.reduce(function (a, d) {
          return a + (d.on ? 1 : 0) + KEYS.reduce(function (b, k) { return b + (d.sup[k] || 0); }, 0);
        }, 0);
      }
      var a30 = actsIn(last30), aPrev30 = actsIn(prev30);

      /* how full an active day gets */
      var dist = [0, 0, 0, 0, 0], fullN = -1, fullDay = null;
      log.forEach(function (d) {
        if (!d.on) return;
        var n = Object.keys(d.sup).length;
        dist[n]++;
        if (n >= fullN) { fullN = n; fullDay = d; }
      });
      var distMax = Math.max.apply(null, dist) || 1;
      var stacked = dist[2] + dist[3] + dist[4];

      /* the days the main move did not happen */
      var missSup = { deepwork: 0, reflection: 0, checkin: 0, vivere: 0 };
      log.forEach(function (d) {
        if (d.on) return;
        KEYS.forEach(function (k) { if (d.sup[k]) missSup[k]++; });
      });
      var missList = andList(KEYS.filter(function (k) { return missSup[k] > 0; })
        .map(function (k) { return missSup[k] + ' ' + LOW[k]; }));

      /* when the best run ended, so the tile says something the others do not */
      var run = 0, bestEnd = -1;
      log.forEach(function (d, i) {
        if (d.on && s.best > 0) { run++; if (run >= s.best) bestEnd = i; } else run = 0;
      });
      var runStart = s.current ? log[log.length - s.current].date : null;
      var recordStart = log[0].date;

      /* the composition of the whole record */
      var comp = [{ k: 'main', name: 'The main move', v: s.total, a: '.80' }]
        .concat(KEYS.map(function (k, i) {
          return { k: k, name: K.SUPNAME[k], v: s.sup[k] || 0, a: ['.58', '.42', '.28', '.16'][i] };
        }));

      var bar = '<div class="v12-bar">' + comp.filter(function (c) { return c.v > 0; }).map(function (c) {
        return '<i style="flex:' + c.v + ';--a:' + c.a + '"></i>';
      }).join('') + '</div>';

      var legend = '<div class="v12-leg">' + comp.map(function (c) {
        return '<div class="v12-leg__r"><i style="--a:' + c.a + '"></i><span>' + c.name + '</span>' +
          '<b>' + K.n(c.v) + '</b><u>' + pc(c.v, acts) + '%</u></div>';
      }).join('') + '</div>';

      var distHTML = '<div class="v12-dist">' + dist.map(function (v, i) {
        return '<div class="v12-dist__c"><u>' + v + '</u>' +
          '<div class="v12-dist__t"><i class="' + (i >= 2 ? 'hi' : '') +
          '" style="height:' + Math.max(3, Math.round(100 * v / distMax)) + '%"></i></div>' +
          '<span>' + (i === 0 ? 'move only' : '+' + i) + '</span></div>';
      }).join('') + '</div>';

      var fullNames = fullDay && fullN > 0
        ? andList(KEYS.filter(function (k) { return fullDay.sup[k]; }).map(function (k) { return LOW[k]; }))
        : '';

      var ledger =
        '<div class="ck-row"><span>Days tracked</span><b>' + K.n(s.N) + '</b></div>' +
        '<div class="ck-row"><span>Days you did the main move</span><b>' + K.n(s.total) + '<em>' + s.rate + '%</em></b></div>' +
        '<div class="ck-row"><span>Days you logged anything at all</span><b>' + K.n(anyDays) + '<em>' + pc(anyDays, s.N) + '%</em></b></div>' +
        '<div class="ck-row"><span>Days with nothing</span><b>' + K.n(s.N - anyDays) + '</b></div>' +
        '<div class="ck-row"><span>Everything logged, all systems</span><b>' + K.n(acts) + '</b></div>' +
        '<div class="ck-row"><span>Support acts per day you logged something</span><b>' + (anyDays ? (supTotal / anyDays).toFixed(1) : '0') + '</b></div>' +
        '<div class="ck-row"><span>Time in the main move</span><b>' + K.n(s.hours) + 'h<em>' + s.avgSession + ' min a session</em></b></div>' +
        '<div class="ck-row"><span>Average main moves a week</span><b>' + s.perWeek.toFixed(1) + '</b></div>' +
        '<div class="ck-row"><span>Breaks in the main line</span><b>' + s.gaps + '<em>longest ' + s.longestGap + ' days</em></b></div>' +
        '<div class="ck-row"><span>Times you started again</span><b>' + s.comebacks + '</b></div>' +
        '<div class="ck-row"><span>Days with two or more systems</span><b>' + K.n(stacked) + '<em>' + pc(stacked, s.total) + '% of active days</em></b></div>' +
        '<div class="ck-row"><span>Record starts</span><b>' + dstr(K, recordStart) + '</b></div>' +
        (!s.firstOn || dstr(K, s.firstOn) === dstr(K, recordStart) ? ''
          : '<div class="ck-row"><span>First main move on it</span><b>' + dstr(K, s.firstOn) + '</b></div>');

      /* ---- the page ---- */
      var H = '';

      H += '<style>' +
        '.v12-lead{text-align:center;margin-top:4px}' +
        '.v12-lead .ck-u{margin-top:9px}' +
        '.v12-sec{font-size:13px;color:var(--text-mid);text-align:center;line-height:1.55;margin:12px 22px 0}' +
        '.v12-sec b{color:var(--text-hi);font-weight:650}' +
        '.v12-note{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin:-4px 2px 12px}' +
        '.v12-big{display:flex;align-items:baseline;gap:9px;margin:2px 0 10px}' +
        '.v12-big b{font-size:38px;font-weight:800;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}' +
        '.v12-big span{font-size:13px;color:var(--text-mid);line-height:1.35}' +
        '.v12-bar{display:flex;gap:3px;height:12px;margin:2px 0 14px}' +
        '.v12-bar i{border-radius:3px;background:rgba(var(--accent-rgb),var(--a));min-width:4px}' +
        '.v12-leg{display:flex;flex-direction:column}' +
        '.v12-leg__r{display:flex;align-items:center;gap:11px;padding:9px 2px;border-bottom:1px solid var(--hairline)}' +
        '.v12-leg__r:last-child{border-bottom:0}' +
        '.v12-leg__r i{width:9px;height:9px;border-radius:2.5px;flex:0 0 auto;background:rgba(var(--accent-rgb),var(--a))}' +
        '.v12-leg__r span{flex:1;min-width:0;font-size:13px;color:var(--text-mid)}' +
        '.v12-leg__r b{font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-.01em}' +
        '.v12-leg__r u{text-decoration:none;width:38px;text-align:right;font-size:12px;color:var(--text-mid);font-variant-numeric:tabular-nums}' +
        '.v12-sh{display:flex;align-items:center;gap:11px;margin-bottom:13px}' +
        '.v12-sh__i{width:32px;height:32px;border-radius:9px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;' +
          'background:rgba(var(--accent-rgb),.13);color:var(--accent)}' +
        '.v12-sh__i svg{width:17px;height:17px}' +
        '.v12-sh__n{font-size:28px;font-weight:780;letter-spacing:-.035em;line-height:1;font-variant-numeric:tabular-nums}' +
        '.v12-sh__t{flex:1;min-width:0}' +
        '.v12-sh__t b{display:block;font-size:13.5px;font-weight:650;letter-spacing:-.01em}' +
        '.v12-sh__t i{display:block;font-style:normal;font-size:12px;color:var(--text-mid);margin-top:2px;line-height:1.35}' +
        '.v12-wk{display:flex;align-items:flex-end;gap:3px;height:44px}' +
        '.v12-wk i{flex:1;border-radius:3px;background:rgba(var(--accent-rgb),.38);min-height:3px}' +
        '.v12-wk i.now{background:rgba(var(--accent-rgb),.76)}' +
        '.v12-wk i.zero{background:rgba(var(--ink),.09)}' +
        '.v12-wkl{display:flex;justify-content:space-between;font-size:10.5px;color:var(--text-lo);margin:7px 0 0}' +
        '.v12-rows{margin-top:7px}' +
        '.v12-rows .ck-row{padding:9px 0}' +
        '.v12-say{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin-top:12px}' +
        '.v12-spwrap{position:relative;padding-right:34px;margin-top:2px}' +
        '.v12-sp{width:100%;height:54px;display:block}' +
        '.v12-sp__g{fill:none;stroke:rgba(var(--ink),.07);stroke-width:1}' +
        '.v12-sp__any{fill:none;stroke:rgba(var(--ink),.36);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}' +
        '.v12-sp__main{fill:none;stroke:var(--accent);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
        '.v12-sp__d{fill:var(--accent)}' +
        '.v12-spwrap u{position:absolute;right:0;text-decoration:none;font-size:9.5px;color:var(--text-lo);font-variant-numeric:tabular-nums}' +
        '.v12-sp__hi{top:-2px}.v12-sp__lo{bottom:-2px}' +
        '.v12-key{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:11px;font-size:11.5px;color:var(--text-mid)}' +
        '.v12-key span{display:flex;align-items:center;gap:7px}' +
        '.v12-key i{width:10px;height:10px;border-radius:2.5px;display:block;flex:0 0 auto}' +
        '.v12-key u{text-decoration:none;width:14px;height:2px;border-radius:2px;display:block;flex:0 0 auto}' +
        '.v12-dist{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;height:104px}' +
        '.v12-dist__c{display:flex;flex-direction:column;align-items:center;height:100%}' +
        '.v12-dist__c u{text-decoration:none;font-size:11.5px;font-weight:700;color:var(--text-hi);' +
          'font-variant-numeric:tabular-nums;line-height:1;margin-bottom:5px}' +
        '.v12-dist__t{flex:1;width:100%;display:flex;align-items:flex-end}' +
        '.v12-dist__t i{width:100%;min-height:3px;border-radius:5px 5px 3px 3px;background:rgba(var(--accent-rgb),.26)}' +
        '.v12-dist__t i.hi{background:rgba(var(--accent-rgb),.6)}' +
        '.v12-dist__c span{font-size:10.5px;color:var(--text-lo);margin-top:7px}' +
        '.v12-split{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}' +
        '</style>';

      /* 1. header */
      H += '<div class="cx__top"><div class="cx__title">Consistency</div>' +
        '<div class="cx__x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6L6 18"/></svg></div></div>';

      /* 2. the bloom, one seed per day you showed up */
      H += '<div class="ck-bloomwrap">' + K.bloomSVG(s.total, { size: 326, animate: true }) + '</div>';
      H += '<div class="v12-lead"><div class="ck-n ck-n--hero">' + K.n(s.total) + '</div>' +
        '<div class="ck-u">' + plural(s.total, 'day you showed up', 'days you showed up') + '</div></div>';
      var dup = String(sh.lead) === String(s.total);
      H += '<div class="v12-sec">' +
        (dup ? (shape === 'open' ? '' : cap(sh.sub) + '. ') : (sh.lead + ' ' + sh.sub + '. ')) +
        'Across ' + s.N + ' days since ' + dstr(K, recordStart) + '.</div>';

      /* 3. the main line */
      var shown = [String(s.current), String(s.best), s.rate + '%'];
      var ctxTile = shown.indexOf(String(sh.ctx.v)) === -1
        ? K.tile(sh.ctx.v, sh.ctx.l)
        : K.tile(s.longestGap, 'longest gap', 'days missed in a row');

      H += '<h2>The main line</h2>';
      H += '<div class="ck-tiles">' +
        K.tile(s.current, 'current run', runStart ? 'since ' + dstr(K, runStart) : 'nothing running') +
        K.tile(s.best, 'best run', bestEnd < 0 ? 'nothing on the record yet'
          : bestEnd === log.length - 1 ? 'the one you are on' : 'ended ' + dstr(K, log[bestEnd].date)) +
        K.tile(s.rate + '%', 'of all days', s.total + ' of ' + s.N) + '</div>';
      H += '<div class="v12-split">' + ctxTile +
        K.tile(s.missed, plural(s.missed, 'day missed', 'days missed'), s.gaps + ' separate breaks') + '</div>';

      /* 4. the whole record, main move sitting inside it */
      H += '<h2>Everything you showed up for</h2>';
      H += '<div class="v12-note">The main move is one part of this record. Everything else you logged is counted the same way, so here is all of it in one place.</div>';
      H += '<div class="v12-big"><b>' + K.n(acts) + '</b><span>things logged across<br>' + s.N + ' days</span></div>';
      H += bar + legend;
      H += '<div class="v12-say">The main move is ' + pc(s.total, acts) + '% of what you logged. The other ' +
        pc(supTotal, acts) + '% is the work around it, and it is on the record too.</div>';

      /* 5. lately, both lines */
      H += '<h2>Lately</h2>';
      H += '<div class="v12-note">Two rolling seven day averages over the last ' + Math.min(60, log.length) +
        ' days. The accent line is the main move. The faint line is any day you logged something at all.</div>';
      H += dualSpark(log, 60, 330, 54);
      H += '<div class="v12-key"><span><u style="background:var(--accent)"></u>the main move</span>' +
        '<span><u style="background:rgba(var(--ink),.36)"></u>anything logged</span></div>';
      var w60 = log.slice(-60);
      var w60any = w60.filter(function (d) { return d.on || Object.keys(d.sup).length; }).length;
      var w60on = w60.filter(function (d) { return d.on; }).length;
      H += '<div class="v12-say">Across these ' + w60.length + ' days you logged something on ' + w60any +
        ' of them and did the main move on ' + w60on + '. ' + (w60any === w60on
          ? 'The two lines sit on top of each other because every day you logged anything was a day you did the main move.'
          : 'The gap between the lines is the ' + (w60any - w60on) + ' ' + plural(w60any - w60on, 'day', 'days') +
            ' you logged something without doing the main move.') + '</div>';
      var w30 = Math.min(30, log.length), hasPrev = log.length >= 60;
      H += '<div class="v12-split">' +
        K.tile(s.r30, 'main moves in ' + w30 + ' days',
          hasPrev ? 'was ' + s.rPrev30 + ' the 30 before ' + K.delta(s.delta30) : 'no earlier window to compare to yet') +
        K.tile(a30, 'things logged in ' + w30 + ' days',
          hasPrev ? 'was ' + aPrev30 + ' the 30 before ' + K.delta(a30 - aPrev30) : 'across every system') + '</div>';

      /* 6-9. each system on its own terms */
      KEYS.forEach(function (k) { H += supSection(K, log, k, s); });

      /* 10. how full a day gets */
      H += '<h2>How full a day gets</h2>';
      H += '<div class="v12-note">Your ' + s.total + ' ' + plural(s.total, 'active day', 'active days') +
        ', grouped by how many other systems you touched the same day.</div>';
      H += distHTML;
      H += '<div class="v12-say">' + dist[0] + ' ' + plural(dist[0], 'day was', 'days were') + ' the main move and nothing else. ' +
        stacked + ' ' + plural(stacked, 'day', 'days') + ' carried two or more systems at once' +
        (fullDay && fullN > 0 ? '. The fullest was ' + dstr(K, fullDay.date) + ', with the main move plus ' + fullNames : '') + '.</div>';

      /* 11. the days the move did not happen */
      H += '<h2>The days you missed the move</h2>';
      if (s.missed === 0) {
        H += '<div class="v12-say">There are none yet. All ' + s.N + ' days on the record carry the main move. ' +
          'The first one you miss will show up here and stay.</div>';
      } else {
        H += '<div class="ck-tiles ck-tiles--2">' +
          K.tile(s.missed, plural(s.missed, 'day missed', 'days missed'), pc(s.missed, s.N) + '% of the record') +
          K.tile(s.supDays, 'of those had something else', missList || 'nothing else logged') + '</div>';
        H += '<div class="v12-say">' + (s.supDays === 0
          ? 'On every one of those days nothing was logged at all, not the main move and not one thing around it.'
          : 'Those ' + s.supDays + ' days are still misses on the main line and the calendar keeps them that way. ' +
            'They are drawn in a third colour so you can see the difference between a quiet day and an empty one.') + '</div>';
      }

      /* 12. every day since day one */
      H += '<h2>Every day since day one</h2>';
      H += K.calendarHTML(log);
      H += '<div class="v12-key">' +
        '<span><i style="background:rgba(var(--accent-rgb),.62)"></i>main move</span>' +
        '<span><i style="background:rgba(var(--accent-rgb),.22)"></i>support only</span>' +
        '<span><i style="background:rgba(var(--ink),.055)"></i>nothing</span></div>';

      /* 13. this month */
      H += '<h2>' + K.MONF[log[log.length - 1].date.getMonth()] + '</h2>';
      H += K.monthGrid(log);
      H += '<div class="v12-say">' + s.thisMonth.on + ' of ' + s.thisMonth.all + ' days so far' +
        (s.months.length > 1
          ? ', against ' + s.lastMonth.on + ' of ' + s.lastMonth.all + ' the month before'
          : '. This is the only month the record covers, so there is nothing to compare it to yet') + '.</div>';

      /* 14. rhythm */
      var bestPc = pc(s.byDow[s.bestDow], s.dowSeen[s.bestDow]);
      var worstPc = pc(s.byDow[s.worstDow], s.dowSeen[s.worstDow]);
      H += '<h2>Your week</h2>';
      H += K.dowChart(s);
      H += '<div class="v12-say">' + (bestPc === worstPc
        ? 'Every weekday sits at ' + bestPc + '% so far. With ' + s.N + ' days on the record no day of the week is separating itself yet.'
        : K.WDF[s.bestDow] + ' is your strongest day at ' + bestPc + '%. ' +
          K.WDF[s.worstDow] + ' is the weakest at ' + worstPc + '%.') + '</div>';

      /* 15. month by month */
      if (s.months.length > 1) {
        H += '<h2>Month by month</h2>';
        H += K.monthChart(s);
      }

      /* 16. the full ledger */
      H += '<h2>Every number, in one place</h2>';
      H += '<div class="ck-rows">' + ledger + '</div>';

      H += '<div class="cx__foot">Every number here comes from days that actually happened.<br>A missed day stays a missed day.</div>';

      return '<div class="cx">' + H + '</div>';
    }
  };
})(window);
