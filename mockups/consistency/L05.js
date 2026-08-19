/* ============================================================
   L05, progress forward.
   One question on the page: am I further along than before?
   One number answers it, in one unit, three ways: the number,
   the verdict against your own past, and the shape it made
   getting here. Under it, this week against your usual week,
   the record gets one grid, and the all time total is a single
   footer line.
   Nothing here is a counter that can only get worse, and
   nothing here names a destination. Where you stand against a
   target is Clarity's job; this page is the pattern of you.
   ============================================================ */
(function () {
  var W = window; W.CLAY = W.CLAY || {};

  /* ---------- tiny pure helpers ---------- */
  function num(v) { return (typeof v === 'number' && isFinite(v)) ? v : 0; }
  function fmt(v) {
    v = num(v);
    var r = Math.round(v * 10) / 10;
    var p = String(r).split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }
  function pct(a, b) {
    a = num(a); b = num(b);
    if (b <= 0) return 0;
    var v = Math.round(100 * a / b);
    return Math.max(0, Math.min(100, isFinite(v) ? v : 0));
  }
  function plural(v, one, many) { return Math.abs(num(v)) === 1 ? one : many; }
  function countOn(log, from, len) {
    var c = 0;
    for (var i = Math.max(0, from); i < from + len && i < log.length; i++) if (log[i] && log[i].on) c++;
    return c;
  }
  /* the best this same window has ever been, so the page can say how close
     today is to your own ceiling without inventing a second unit. */
  function bestWindow(log, win, skipLast) {
    var N = log.length, sum = 0, best = 0, i;
    if (win <= 0) return 0;
    for (i = 0; i < N; i++) {
      if (log[i] && log[i].on) sum++;
      if (i >= win && log[i - win] && log[i - win].on) sum--;
      if (i >= win - 1 && !(skipLast && i === N - 1) && sum > best) best = sum;
    }
    return best;
  }

  var ARROW = {
    up: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.6V2.6"/><path d="M2.9 5.7L6 2.5l3.1 3.2"/></svg>',
    down: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.4v7"/><path d="M2.9 6.3L6 9.5l3.1-3.2"/></svg>',
    flat: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M2.6 6h6.8"/></svg>'
  };
  function chip(cls, icon, text) {
    return '<span class="L05-chip' + (cls ? ' ' + cls : '') + '">' + (icon || '') + text + '</span>';
  }

  var CSS = '<style>' +
    '.L05{padding:calc(16px + env(safe-area-inset-top)) 20px calc(46px + env(safe-area-inset-bottom));' +
      'max-width:430px;margin:0 auto;font-variant-numeric:tabular-nums;overflow-wrap:break-word}' +
    '.L05 *{box-sizing:border-box}' +
    /* hero */
    '.L05-lead{font-size:17px;font-weight:500;color:var(--text-hi);line-height:1.3;letter-spacing:-.01em}' +
    '.L05-num{font-size:80px;font-weight:800;line-height:.88;letter-spacing:-.05em;' +
      'color:var(--text-hi);margin:7px 0 5px}' +
    '.L05-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:15px}' +
    '.L05-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 12px 7px 10px;' +
      'border-radius:999px;font-size:12.5px;font-weight:600;letter-spacing:-.01em;min-width:0;' +
      'background:var(--fill-1);box-shadow:var(--inset);color:var(--text-mid)}' +
    '.L05-chip svg{width:12px;height:12px;flex:0 0 auto}' +
    '.L05-chip.plain{padding-left:12px}' +
    '.L05-chip.up{background:rgba(var(--accent-rgb),.14);color:var(--accent)}' +
    '.L05 .ck-spark{margin-top:19px}' +
    /* shared type */
    '.L05-note{font-size:12.5px;color:var(--text-mid);line-height:1.55;margin-top:10px}' +
    '.L05-h{font-size:14px;font-weight:650;letter-spacing:-.01em;margin:28px 0 11px;color:var(--text-hi)}' +
    '.L05-panel{background:var(--fill-1);box-shadow:var(--inset);border-radius:14px;padding:14px}' +
    /* this week against your usual */
    '.L05-goal__t{display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}' +
    '.L05-goal__t b{font-size:29px;font-weight:750;letter-spacing:-.03em;line-height:1;color:var(--text-hi)}' +
    '.L05-goal__t span{font-size:13.5px;color:var(--text-mid);line-height:1.35;min-width:0}' +
    '.L05-track{height:8px;border-radius:4px;background:rgba(var(--ink),.07);overflow:hidden;margin-top:14px}' +
    '.L05-track i{display:block;height:100%;border-radius:4px;background:rgba(var(--accent-rgb),.78)}' +
    '.L05-goal__f{display:flex;justify-content:space-between;align-items:baseline;gap:12px;' +
      'margin-top:14px;padding-top:13px;box-shadow:inset 0 1px 0 rgba(var(--ink),.08)}' +
    '.L05-goal__f span{font-size:13px;color:var(--text-mid);min-width:0}' +
    '.L05-goal__f b{font-size:15px;font-weight:700;color:var(--text-hi);flex:0 0 auto}' +
    /* the footer line */
    '.L05-foot{margin-top:28px;padding-top:15px;box-shadow:inset 0 1px 0 rgba(var(--ink),.08);' +
      'font-size:12.5px;color:var(--text-mid);line-height:1.6}' +
    '.L05-foot b{color:var(--text-hi);font-weight:650}' +
    '</style>';

  /* ---------- the hero number, plotted.
     Same window, same unit, so the last dot IS the big number. ---------- */
  function trend(log, win, span, w, h) {
    var N = log.length;
    var start = Math.max(N - span, win - 1);
    if (N - start < 2) return null;
    var pts = [], i;
    for (i = start; i < N; i++) {
      var c = countOn(log, i - win + 1, win);
      var r = win > 0 ? c / win : 0;
      var x = (i - start) / Math.max(1, N - 1 - start) * w;
      var y = h - 3 - r * (h - 6);
      pts.push([x, y]);
    }
    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    var area = d + ' L' + w.toFixed(1) + ' ' + h.toFixed(1) + ' L0 ' + h.toFixed(1) + ' Z';
    // the last dot IS the big number, so it never sits half outside the box
    var last = pts[pts.length - 1];
    var dx = Math.min(last[0], w - 3.5), dy = Math.min(Math.max(last[1], 3.5), h - 3.5);
    return '<svg class="ck-spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="ck-spark__a" d="' + area + '"/><path class="ck-spark__l" d="' + d + '"/>' +
      '<circle class="ck-spark__d" cx="' + dx.toFixed(1) + '" cy="' + dy.toFixed(1) + '" r="3"/></svg>';
  }

  /* ---------- this week, against your usual week.
     Same weight as the panel it replaces, but nothing in it names a
     destination: it is your own showing up measured against your own
     habit. Where you stand against a target belongs to Clarity. ---------- */
  function weekPanel(log, s, shape, N, win) {
    if (!win) return '';                       // under a fortnight there is no usual yet
    var here = countOn(log, N - 7, 7);
    // every complete week before this one, so "usual" is your own history
    var sum = 0, wks = 0, i;
    for (i = N - 14; i >= 0; i -= 7) { sum += countOn(log, i, 7); wks++; }
    if (!wks) return '';
    var usual = sum / wks;
    var d = here - usual;
    var line = Math.abs(d) < 0.5
      ? 'About your usual week.'
      : (d > 0 ? 'Above your usual week.' : 'Below your usual week.');

    // one quiet row, and only where the shape has a pattern fact of its own
    var cl = 'A usual week for you', cv = fmt(usual) + ' of 7';
    if (shape === 'frequency' && num(s.cadence) > 0) {
      cl = 'Sessions a week, last four weeks';
      cv = fmt(s.last4Rate);
    } else if (shape === 'maintenance') {
      cl = 'Days held right now';
      cv = fmt(s.current);
    }
    var dup = cv === fmt(here) + ' of 7';

    return '<div class="L05-h">This week</div>' +
      '<div class="L05-panel">' +
        '<div class="L05-goal__t"><b>' + fmt(here) + ' of 7</b><span>' + line + '</span></div>' +
        '<div class="L05-track"><i style="width:' + Math.max(2, pct(here, 7)) + '%"></i></div>' +
        (!dup ? '<div class="L05-goal__f"><span>' + cl + '</span><b>' + cv + '</b></div>' : '') +
      '</div>';
  }

  W.CLAY['L05'] = {
    name: 'Further than before',
    note: 'Progress forward: the hero is the last 30 days against the 30 before, so the headline number re-earns itself every day, and the line under it is that exact number plotted, last dot included. One chip says which way it moved; a second, quieter one appears only while there is still ceiling above you (your best 30 on record), and on a genuine new high a single chip says so instead. The goal panel is gone: distance to a target, percent of the way there, days until the date, that is Clarity telling you where you stand, not Consistency. In its place, same weight, this week measured against your own usual week, with a cadence or days held line where the shape has one. What is left is all pattern: the number, this week, the record, and one footer line for the all time total.',
    render: function (ctx) {
      var K = ctx.K, log = ctx.log || [], s = ctx.s || {}, sh = ctx.sh, shape = ctx.shape || 'open';
      var N = log.length;
      if (!N) return CSS + '<div class="L05"><div class="L05-lead">Nothing on the record yet. Your first day starts it.</div></div>';

      /* the comparison window: the biggest honest one the record can carry */
      var win = N >= 60 ? 30 : N >= 28 ? 14 : N >= 14 ? 7 : 0;
      var html = CSS + '<div class="L05">';

      /* ---------- hero: the number, the verdict, the shape of it ---------- */
      if (win) {
        var cur = countOn(log, N - win, win);
        var prev = countOn(log, N - 2 * win, win);
        var d = cur - prev;
        var peak = bestWindow(log, win, true);
        var chips;

        if (cur > 0 && cur > peak) {
          // a new high in this window beats every other thing the page could say
          chips = chip('up', ARROW.up, 'Your best ' + win + ' days yet');
        } else {
          chips = d > 0
            ? chip('up', ARROW.up, 'Up ' + d + plural(d, ' day', ' days') + ' from the ' + win + ' before')
            : d < 0
              ? chip('', ARROW.down, 'Down ' + (-d) + plural(d, ' day', ' days') + ' from the ' + win + ' before')
              : chip('', ARROW.flat, 'Even with the ' + win + ' before');
          // only when there is still ceiling above you. Windows overlap, so a tie
          // with your best is the ordinary case and saying so every day is noise.
          if (peak > cur) chips += chip('plain', '', 'Your best is ' + peak + ' of ' + win);
        }

        html +=
          '<div class="L05-lead">You showed up</div>' +
          '<div class="L05-num">' + fmt(cur) + '</div>' +
          '<div class="L05-lead">of the last ' + win + ' days.</div>' +
          '<div class="L05-chips">' + chips + '</div>';

        var t = trend(log, win, Math.min(N, 90), 350, 44);
        if (t) html += t + '<div class="L05-note">Each point is that number, on that day.</div>';
      } else {
        var tot = num(s.total);
        var need = 14 - N;
        var sub = N === 1
          ? (tot === 1 ? 'day. That’s the whole record so far.' : 'days. The record starts today.')
          : 'of your first ' + N + ' days.';
        html +=
          '<div class="L05-lead">You showed up</div>' +
          '<div class="L05-num">' + fmt(tot) + '</div>' +
          '<div class="L05-lead">' + sub + '</div>' +
          '<div class="L05-note">In ' + need + plural(need, ' day', ' days') +
            ' you’ll see this week against the one before it.</div>';
      }

      /* ---------- this week against your usual ---------- */
      html += weekPanel(log, s, shape, N, win);

      /* ---------- the record ---------- */
      if (N >= 7 && K && K.calendarHTML) {
        // a day should read as a square in a record, never as a tile. Hold the
        // cell near 20px at every length instead of letting a short record
        // blow up into seven fat blocks.
        var cols = N < 14 ? 7 : Math.max(14, Math.min(21, Math.round(Math.sqrt(N * 1.6))));
        var note = 'Every square is a day, oldest first.';
        if (num(s.comebacks) > 0) {
          note += ' You’ve started again after a break ' + fmt(s.comebacks) +
            plural(s.comebacks, ' time.', ' times.');
        }
        html += '<div class="L05-h">The whole record</div>' +
          '<div style="max-width:' + (cols * 26) + 'px">' + K.calendarHTML(log, { cols: cols }) + '</div>' +
          '<div class="L05-note">' + note + '</div>';
      }

      /* ---------- the all time line, demoted.
         Below the comparison window the hero is already this number. ---------- */
      if (win) {
        var first = log[0] && log[0].date, last = log[N - 1] && log[N - 1].date;
        var MONF = (K && K.MONF) || ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var since = '';
        if (first && typeof first.getMonth === 'function') {
          since = ' since ' + MONF[first.getMonth()] + ' ' + first.getDate();
          if (last && typeof last.getFullYear === 'function' && last.getFullYear() !== first.getFullYear()) {
            since += ', ' + first.getFullYear();
          }
        }
        html += '<div class="L05-foot">All time, <b>' + fmt(s.total) + '</b> of <b>' + fmt(N) + '</b> ' +
          plural(N, 'day', 'days') + since + '.</div>';
      }

      return html + '</div>';
    }
  };
})();
