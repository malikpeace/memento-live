/* ============================================================
   L06, SHAPE-ADAPTIVE.
   Same bones for every goal, a different PATTERN lead and a different proof
   block. The lens: which part of the pattern matters depends on the kind of
   goal. This page never says where the goal stands or how far is left, that
   belongs to Clarity. Here it is only actions taken, days shown up, weeks
   kept, time given, the record.

     lead   : the one pattern number this shape actually earns
     proof  : a block built for this shape only (weeks / hold / months of
              days banked / months of time), carrying the one sentence that
              explains how this kind of goal is kept
     ledger : three quiet rows, never repeating the lead or the proof
     record : the heatmap, universal, never changes
     rhythm : which days you actually show up (gated on real data)

   One visual language on the page: a lead sentence, bars, quiet rows, the
   record. Nothing is drawn twice, and no block is drawn when it would only
   restate the number above it.
   ============================================================ */
(function () {
  var W = window; W.CLAY = W.CLAY || {};

  var CSS = '<style>' +
    '.L06{padding:calc(14px + env(safe-area-inset-top)) 20px calc(46px + env(safe-area-inset-bottom));' +
      'max-width:430px;margin:0 auto}' +
    '.L06 *{box-sizing:border-box}' +

    /* ---- the lead ---- */
    '.L06-say{font-size:16.5px;font-weight:500;color:var(--text-hi);line-height:1.35;' +
      'letter-spacing:-.01em;overflow-wrap:break-word}' +
    '.L06-num{display:flex;flex-wrap:wrap;align-items:baseline;gap:9px;margin:7px 0 6px;color:var(--text-hi);' +
      'font-size:76px;font-weight:700;line-height:.94;letter-spacing:-.05em;font-variant-numeric:tabular-nums}' +
    '.L06-num u{text-decoration:none;font-size:25px;font-weight:500;letter-spacing:-.02em;color:var(--text-mid)}' +

    /* ---- sections ---- */
    '.L06-sec{margin-top:30px}' +
    '.L06-h{font-size:14px;font-weight:650;letter-spacing:-.01em;margin:0 0 13px;color:var(--text-hi)}' +
    '.L06-note{margin-top:12px;font-size:13px;line-height:1.55;color:var(--text-mid);' +
      'overflow-wrap:break-word;font-variant-numeric:tabular-nums}' +
    '.L06-lede{margin-top:20px;font-size:13px;line-height:1.55;color:var(--text-mid);overflow-wrap:break-word}' +

    /* ---- ledger: a divided list, no box ---- */
    '.L06-led{margin-top:30px}' +
    '.L06-r{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:11px 0;' +
      'border-bottom:1px solid var(--hairline)}' +
    '.L06-r:last-child{border-bottom:0}' +
    '.L06-r span{font-size:13.5px;color:var(--text-mid);min-width:0;overflow-wrap:break-word}' +
    '.L06-r b{font-size:15px;font-weight:700;letter-spacing:-.01em;white-space:nowrap;' +
      'font-variant-numeric:tabular-nums}' +

    /* ---- proof: column rail (weeks, rhythm) ---- */
    '.L06-rail{position:relative;display:grid;gap:5px;height:76px}' +
    '.L06-rail em{display:flex;align-items:flex-end;justify-content:center;height:100%;font-style:normal;min-width:0}' +
    '.L06-rail em i{display:block;width:100%;max-width:38px;min-height:3px;border-radius:3px;background:rgba(var(--ink),.16)}' +
    '.L06-rail em.fill i{background:rgba(var(--accent-rgb),.60)}' +
    '.L06-tgt{position:absolute;left:0;right:0;height:1px;background:rgba(var(--ink),.30)}' +
    '.L06-axis{display:flex;justify-content:space-between;gap:12px;margin-top:9px;font-size:11.5px;' +
      'color:var(--text-lo);font-variant-numeric:tabular-nums}' +
    '.L06-wd{display:grid;gap:5px;margin-top:9px;font-size:11.5px;color:var(--text-lo);text-align:center}' +

    /* ---- proof: bars (hold, months of days, months of time) ---- */
    '.L06-bar{height:9px;border-radius:5px;background:rgba(var(--ink),.07);overflow:hidden}' +
    '.L06-bar i{display:block;height:100%;border-radius:5px;background:rgba(var(--accent-rgb),.62)}' +
    '.L06-bar i.dim{background:rgba(var(--ink),.26)}' +
    '.L06-ends{display:flex;justify-content:space-between;gap:14px;margin-top:9px;font-size:12.5px;' +
      'color:var(--text-mid);font-variant-numeric:tabular-nums}' +
    '.L06-ends span{min-width:0;overflow-wrap:break-word}' +
    '.L06-lead2{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 10px;margin-bottom:11px}' +
    '.L06-lead2 b{min-width:0;font-size:21px;font-weight:700;letter-spacing:-.025em;font-variant-numeric:tabular-nums}' +
    '.L06-lead2 b em{font-style:normal;font-size:13px;font-weight:500;color:var(--text-mid);' +
      'margin-left:7px;letter-spacing:0;overflow-wrap:break-word}' +
    '.L06-lead2 span{font-size:13px;font-weight:500;color:var(--text-mid);white-space:nowrap;' +
      'font-variant-numeric:tabular-nums}' +

    '.L06-rows{display:flex;flex-direction:column;gap:11px}' +
    '.L06-row{display:flex;align-items:center;gap:11px}' +
    '.L06-row span{flex:0 0 auto;width:52px;font-size:12.5px;color:var(--text-mid)}' +
    '.L06-row .L06-bar{flex:1;min-width:0}' +
    '.L06-row b{flex:0 0 auto;width:86px;text-align:right;font-size:13px;font-weight:700;' +
      'white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '</style>';

  /* ---------------- small pure helpers ---------------- */
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function nf(v) {
    v = Math.round(num(v));
    var str = String(Math.abs(v)), out = '', c = 0;
    for (var i = str.length - 1; i >= 0; i--) { out = str.charAt(i) + out; if (++c % 3 === 0 && i > 0) out = ',' + out; }
    return (v < 0 ? '-' : '') + out;
  }
  function pct(a, b) { b = num(b); return b > 0 ? Math.max(0, Math.min(100, Math.round(100 * num(a) / b))) : 0; }
  function plural(v, a, b) { return Math.round(num(v)) === 1 ? a : b; }
  function days(v) { v = Math.round(num(v)); return nf(v) + plural(v, ' day', ' days'); }
  function one(v) { v = num(v); return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, ''); }
  function dur(min) {
    min = Math.round(num(min));
    if (min < 60) return nf(min) + plural(min, ' minute', ' minutes');
    var h = min / 60, v = h < 10 ? Math.round(h * 10) / 10 : Math.round(h);
    return (v < 10 ? one(v) : nf(v)) + plural(v, ' hour', ' hours');
  }
  function row(l, v) { return '<div class="L06-r"><span>' + l + '</span><b>' + v + '</b></div>'; }
  function sec(h, body, note) {
    return '<div class="L06-sec"><div class="L06-h">' + h + '</div>' + body +
      (note ? '<div class="L06-note">' + note + '</div>' : '') + '</div>';
  }
  function bar(p, dim) { return '<div class="L06-bar"><i class="' + (dim ? 'dim' : '') + '" style="width:' + pct(p, 100) + '%"></i></div>'; }
  function brow(label, p, value, dim) {
    return '<div class="L06-row"><span>' + label + '</span>' + bar(p, dim) + '<b>' + value + '</b></div>';
  }

  W.CLAY['L06'] = {
    name: 'Shape-adaptive',
    note: 'The page adapts the PATTERN lead per goal shape, never the goal\'s state. A rate leads with sessions a week against the cadence it chose, a held line leads with the unbroken stretch, an event leads with days of work banked, an open goal leads with time given, and the two quantity shapes lead with days shown up. Where the goal stands and how far is left belong to Clarity and are gone from here. Every block is gated on having something to say, and when a chart would only redraw the lead it is replaced by one sentence.',
    render: function (ctx) {
      ctx = ctx || {};
      var K = ctx.K || W.CKit || {};
      var log = (ctx.log && ctx.log.length) ? ctx.log : [];
      var s = ctx.s || {};
      var shape = ctx.shape || 'open';
      var MON = K.MON || ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var WD = K.WD || ['S','M','T','W','T','F','S'];
      var WDF = K.WDF || ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

      var N = Math.max(1, Math.round(num(s.N)) || log.length || 1);
      var total = Math.max(0, Math.round(num(s.total)));
      var cadence = Math.max(1, Math.round(num(s.cadence)) || 4);
      var weeks = s.weeks || [];
      var minutes = Math.max(0, Math.round(num(s.minutes)));
      var avgSession = Math.max(0, Math.round(num(s.avgSession)));
      var cur = Math.max(0, Math.round(num(s.current)));

      /* rate over the last 30 days (or all of them, if the record is younger) */
      var w = Math.min(30, log.length), on30 = 0;
      for (var i = log.length - w; i < log.length; i++) if (log[i] && log[i].on) on30++;
      var rate30 = w > 0 ? Math.round(100 * on30 / w) : 0;
      var rateLabel = 'Last ' + w + plural(w, ' day', ' days');

      /* the last day the record was blank, so the hold can say when it started */
      var lastBreak = null;
      for (var j = log.length - 1; j >= 0; j--) { if (log[j] && !log[j].on) { lastBreak = log[j].date; break; } }
      function md(d) { return (d && d.getMonth) ? MON[d.getMonth()] + ' ' + d.getDate() : ''; }

      /* every stretch in the record, so the hold can compare against a real one */
      var runs = [], run = 0;
      log.forEach(function (d) { if (d && d.on) { run++; } else { if (run) runs.push(run); run = 0; } });
      if (run) runs.push(run);
      var endsOn = !!(log.length && log[log.length - 1] && log[log.length - 1].on);
      var prevRun = 0, upto = endsOn ? runs.length - 1 : runs.length;
      for (var q = 0; q < upto; q++) if (runs[q] > prevRun) prevRun = runs[q];

      /* which days of the week the record actually lands on */
      var byDow = [0,0,0,0,0,0,0], seenDow = [0,0,0,0,0,0,0];
      log.forEach(function (d) {
        if (!d || !d.date || typeof d.date.getDay !== 'function') return;
        var k = d.date.getDay(); seenDow[k]++; if (d.on) byDow[k]++;
      });

      /* the record grouped into months, so a shape can chart its own pattern */
      function months(valueOf) {
        var seen = {}, order = [];
        log.forEach(function (d) {
          if (!d || !d.date || typeof d.date.getMonth !== 'function') return;
          var k = d.date.getFullYear() + '-' + d.date.getMonth();
          if (!seen[k]) { seen[k] = { label: MON[d.date.getMonth()], v: 0 }; order.push(k); }
          seen[k].v += num(valueOf(d));
        });
        return order.slice(-6).map(function (k) { return seen[k]; });
      }

      /* ---------------- 1. THE LEAD (the shape decides the number) ---------------- */
      var lead;

      if (shape === 'frequency') {
        var lastWeek = weeks.length ? weeks[weeks.length - 1] : null;
        if (log.length < 7 || weeks.length < 2) {
          var onW = Math.max(0, Math.round(num(lastWeek ? lastWeek.on : total)));
          lead = onW >= cadence
            ? { pre: 'This week you have done', n: nf(onW), suf: '',
                post: plural(onW, 'session', 'sessions') + ', on a cadence of ' + nf(cadence) + ' a week.' }
            : { pre: 'This week you are at', n: nf(onW), suf: 'of ' + nf(cadence),
                post: 'sessions. The week is still open.' };
        } else {
          var wkSpan = Math.min(4, weeks.length);
          lead = {
            pre: 'You are averaging',
            n: one(s.last4Rate),
            suf: 'of ' + nf(cadence),
            post: 'sessions a week, over the last ' + wkSpan + ' weeks.'
          };
        }
      } else if (shape === 'maintenance') {
        lead = {
          pre: 'You have held this',
          n: nf(cur),
          suf: '',
          post: cur === 0 ? 'days. The next stretch starts today.'
            : cur === 1 ? 'day without a break.'
            : 'days in a row without a break.'
        };
      } else if (shape === 'milestone') {
        lead = {
          pre: 'You have banked',
          n: nf(total),
          suf: '',
          post: plural(total, 'day', 'days') + ' of work' + (N > 1 ? ' since you started.' : ' so far.')
        };
      } else if (shape === 'open') {
        var showMin = minutes < 60;
        var hrs = minutes / 60;
        lead = {
          pre: 'You have given this',
          n: showMin ? nf(minutes) : (hrs < 10 ? one(hrs) : nf(hrs)),
          suf: '',
          post: (showMin ? plural(minutes, 'minute', 'minutes')
                         : plural(hrs < 10 ? Math.round(hrs * 10) / 10 : Math.round(hrs), 'hour', 'hours')) +
                (N <= 1 || minutes === 0 ? ' so far.' : ' since you started.')
        };
      } else if (total === 0) {
        lead = { pre: 'You have', n: '0', suf: '', post: 'days on the record. Today is still open.' };
      } else if (N <= 1) {
        lead = { pre: 'You have shown up', n: nf(total), suf: '', post: plural(total, 'day', 'days') + ' so far.' };
      } else {
        lead = {
          pre: 'You have shown up',
          n: nf(total),
          suf: 'of ' + nf(N),
          post: plural(N, 'day', 'days') + ' since you started.'
        };
      }

      var hero =
        '<div class="L06-say">' + lead.pre + '</div>' +
        '<div class="L06-num">' + lead.n + (lead.suf ? '<u>' + lead.suf + '</u>' : '') + '</div>' +
        '<div class="L06-say">' + lead.post + '</div>';

      /* ---------------- 2. THE PROOF BLOCK (built for this shape only) ----------------
         Its note carries the one sentence that says how this kind of goal is kept.
         When the chart would only redraw the lead, the sentence stands alone. */
      var proof = '';

      if (shape === 'frequency') {
        var show = weeks.slice(-10);
        if (show.length < 2) {
          proof = '<div class="L06-lede">A blank day is not a miss here. The week is what counts, and your target is ' +
            nf(cadence) + ' sessions in it.</div>';
        } else {
          /* headroom above the target so the target line never sits on the rail's edge */
          var mx = cadence * 1.2;
          show.forEach(function (wk) { if (num(wk.on) > mx) mx = num(wk.on); });
          mx = Math.max(1, mx);
          var cols = show.map(function (wk) {
            var v = num(wk.on), h = Math.max(4, Math.round(100 * v / mx));
            return '<em class="' + (v >= cadence ? 'fill' : '') + '"><i style="height:' + h + '%"></i></em>';
          }).join('');
          var axis = md(show[0].start)
            ? '<div class="L06-axis"><span>' + md(show[0].start) + '</span><span>This week</span></div>'
            : '';
          proof = sec('Your weeks',
            '<div class="L06-rail" style="grid-template-columns:repeat(' + show.length + ',1fr)">' + cols +
              '<div class="L06-tgt" style="bottom:' + pct(cadence, mx) + '%"></div>' +
            '</div>' + axis,
            'A blank day is not a miss here. The week is what counts, and the line is your target of ' + nf(cadence) + '.');
        }

      } else if (shape === 'maintenance') {
        if (prevRun <= 0) {
          proof = '<div class="L06-lede">One blank day resets the line. Nothing has broken it yet.</div>';
        } else if (cur >= prevRun) {
          proof = sec('The hold',
            '<div class="L06-rows">' +
              brow('Now', 100, days(cur)) +
              brow('Before', pct(prevRun, cur), days(prevRun), true) +
            '</div>',
            'One blank day resets the line. This is the longest you have held it.');
        } else {
          proof = sec('The hold',
            '<div class="L06-rows">' +
              brow('Now', pct(cur, prevRun), days(cur)) +
              brow('Best', 100, days(prevRun), true) +
            '</div>',
            'One blank day resets the line.' +
            (lastBreak ? ' This stretch started the day after ' + md(lastBreak) + '.' : ''));
        }

      } else if (shape === 'milestone') {
        var mb = months(function (d) { return d.on ? 1 : 0; });
        if (mb.length < 2) {
          proof = '<div class="L06-lede">Work for this one banks up day by day. The count is the whole of it.</div>';
        } else {
          var mxb = 1; mb.forEach(function (b) { if (b.v > mxb) mxb = b.v; });
          proof = sec('Days banked by month',
            '<div class="L06-rows">' + mb.map(function (b) {
              return brow(b.label, pct(b.v, mxb), days(b.v));
            }).join('') + '</div>',
            'Work for this one banks up day by day. The count is the whole of it.');
        }

      } else if (shape === 'open') {
        var buckets = months(function (d) { return Math.max(0, num(d.minutes)); });
        if (buckets.length < 2) {
          proof = '<div class="L06-lede">This one has no set finish, so the time you give it is the measure.</div>';
        } else {
          var mxm = 1; buckets.forEach(function (b) { if (b.v > mxm) mxm = b.v; });
          proof = sec('The time you gave',
            '<div class="L06-rows">' + buckets.map(function (b) {
              return brow(b.label, pct(b.v, mxm), dur(b.v));
            }).join('') + '</div>',
            'This one has no set finish, so the time you give it is the measure.');
        }

      } else {
        var qb = months(function (d) { return d.on ? 1 : 0; });
        if (qb.length < 2) {
          proof = '<div class="L06-lede">The days are the part you control, so the days are what this page keeps.</div>';
        } else {
          var mxq = 1; qb.forEach(function (b) { if (b.v > mxq) mxq = b.v; });
          proof = sec('Days you showed up, by month',
            '<div class="L06-rows">' + qb.map(function (b) {
              return brow(b.label, pct(b.v, mxq), days(b.v));
            }).join('') + '</div>',
            'The days are the part you control, so the days are what this page keeps.');
        }
      }

      /* ---------------- 3. THE LEDGER (three quiet rows, never the lead again) ------
         Nothing here repeats the hero, and nothing here is already legible in the
         chart above it. */
      var L = [];
      /* a rate over fewer than seven days is not a rate, it is today */
      function rate() { if (w >= 7) L.push(row(rateLabel, rate30 + '%')); }
      /* a ratio needs a span to mean anything, and one run of everything is the lead again */
      function shown() { if (N >= 7) L.push(row('Days shown up', nf(total) + ' of ' + nf(N))); }
      function currentRun() { if (cur < N) L.push(row('Current run', days(cur))); }

      if (shape === 'frequency') {
        if (weeks.length >= 2) L.push(row('Weeks you hit ' + nf(cadence), nf(s.metWeeks) + ' of ' + nf(weeks.length)));
        L.push(row('Sessions in total', nf(total)));
        if (avgSession > 0) L.push(row('Typical session', nf(avgSession) + ' min'));
      } else if (shape === 'maintenance') {
        shown();
        rate();
        if (minutes > 0) L.push(row('Time given', dur(minutes)));
      } else if (shape === 'milestone') {
        rate();
        currentRun();
        if (minutes > 0) L.push(row('Time given', dur(minutes)));
      } else if (shape === 'open') {
        shown();
        rate();
        if (avgSession > 0) L.push(row('Typical session', nf(avgSession) + ' min'));
      } else {
        rate();
        currentRun();
        if (Math.round(num(s.best)) > cur) L.push(row('Best run', days(s.best)));
      }
      var ledger = L.length ? '<div class="L06-led">' + L.join('') + '</div>' : '';

      /* ---------------- 4. THE RECORD (universal, the honest anchor) ---------------- */
      var recNote = log.length < 7 ? '' : ({
        frequency: 'Every filled square is a session.',
        maintenance: 'A blank square is a break in the line, and it stays on the record.',
        milestone: 'Every filled square is a day of work banked.',
        open: 'Every filled square is a day you gave it time.'
      }[shape] || 'Every filled square is a day you showed up.');

      var record = (log.length && K.calendarHTML) ? sec('Your record', K.calendarHTML(log), recNote) : '';

      /* ---------------- 5. THE RHYTHM (gated on having enough record to mean it) ---- */
      var deep = '';
      if (log.length >= 21) {
        var rates = byDow.map(function (v, k) { return seenDow[k] ? v / seenDow[k] : 0; });
        var mxr = 0, bestI = -1;
        rates.forEach(function (r, k) { if (r > mxr) { mxr = r; bestI = k; } });
        if (mxr > 0) {
          var bars = rates.map(function (r) {
            return '<em class="fill"><i style="height:' + Math.max(4, Math.round(100 * r / mxr)) + '%"></i></em>';
          }).join('');
          deep += sec('Your rhythm',
            '<div class="L06-rail" style="grid-template-columns:repeat(7,1fr)">' + bars + '</div>' +
            '<div class="L06-wd" style="grid-template-columns:repeat(7,1fr)">' +
              WD.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>',
            bestI >= 0 ? 'You show up most on ' + WDF[bestI] + '.' : '');
        }
      }

      return CSS + '<div class="L06">' + hero + proof + ledger + record + deep + '</div>';
    }
  };
})();
