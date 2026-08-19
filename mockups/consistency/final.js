/* ============================================================
   Consistency, the definitive tap-in page (numbers first).
   Spec locked with Malik 2026-08-12:
     1. Hero: sentence voice framing ONE cumulative number (days shown up)
     2. Ledger of 3 improvable stats: rate last 30, current run, best run
     3. Heatmap under it (honest record; a miss is an empty cell, no shame number)
     4. Deep stats below (rhythm, months, support)
   Deep stats stay hidden until there is enough record to read them honestly,
   so day 1 is a short page and day 365 is a full one.
   Reuses _kit.js for the heatmap and the deep stat components.
   ============================================================ */
(function () {
  var K = window.CKit;
  var wrap = document.getElementById('finalLab');
  if (!K || !wrap) return;

  var st = document.createElement('style');
  st.textContent =
    '.cf-page{max-width:430px;margin:0 auto}' +
    '.cf-hero{padding:6px 0 14px}' +
    '.cf-say{font-size:17px;color:var(--text-hi);font-weight:500;line-height:1.3;letter-spacing:-.01em}' +
    '.cf-num{font-size:clamp(62px,21vw,84px);font-weight:700;color:var(--text-hi);line-height:.9;' +
      'letter-spacing:-.045em;font-variant-numeric:tabular-nums;margin:6px 0 4px}' +
    '.cf-ledger{border-top:1px solid var(--hairline)}' +
    '.cf-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 0;' +
      'border-bottom:1px solid var(--hairline)}' +
    '.cf-row:last-child{border-bottom:0}' +
    '.cf-row span{font-size:14px;color:var(--text-mid)}' +
    '.cf-row b{font-size:16px;font-weight:700;color:var(--text-hi);font-variant-numeric:tabular-nums;' +
      'letter-spacing:-.01em;white-space:nowrap}' +
    '.cf-row b em{font-style:normal;font-size:12px;font-weight:500;color:var(--text-lo);margin-left:8px}' +
    '.cf-sec{margin-top:30px}' +
    '.cf-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:12px}' +
    '.cf-h b{font-size:14px;font-weight:700;color:var(--text-hi);letter-spacing:-.01em}' +
    '.cf-h i{font-style:normal;font-size:12px;color:var(--text-lo);font-variant-numeric:tabular-nums}' +
    '.cf-key{display:flex;flex-wrap:wrap;gap:6px 15px;margin-top:12px}' +
    '.cf-key span{display:flex;align-items:center;gap:7px;font-size:11.5px;color:var(--text-mid)}' +
    '.cf-key u{text-decoration:none;width:9px;height:9px;border-radius:2.5px;display:block;flex:0 0 auto}' +
    /* keep the rhythm percentages inside their bars at every scale */
    '.cf-page .ck-dow__bar{min-height:19px}' +
    '.cf-page .ck-sup__t i{font-size:11px}';
  document.head.appendChild(st);

  function row(l, v, note) {
    return '<div class="cf-row"><span>' + l + '</span><b>' + v +
      (note ? '<em>' + note + '</em>' : '') + '</b></div>';
  }
  function dstr(v) { return v + (v === 1 ? ' day' : ' days'); }
  function onCount(list) {
    var c = 0;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].on) c++;
    return c;
  }
  function since(d) {
    var now = new Date();
    return 'since ' + K.MON[d.getMonth()] + ' ' + d.getDate() +
      (d.getFullYear() !== now.getFullYear() ? ' ' + d.getFullYear() : '');
  }
  /* columns are always a multiple of 7, so every column is the same weekday */
  function heatCols(N) { return N <= 63 ? 7 : N <= 182 ? 14 : 21; }

  /* the key only names states the record actually contains, so week one is not
     handed a vocabulary for days it has not had yet */
  var KEY = [
    ['on', 'rgba(var(--accent-rgb),.62)', 'you showed up'],
    ['sup', 'rgba(var(--accent-rgb),.22)', 'something smaller'],
    ['off', 'rgba(var(--ink),.055)', 'nothing that day']
  ];
  function legend(log) {
    var seen = {};
    log.forEach(function (d) {
      seen[d.on ? 'on' : (Object.keys(d.sup).length ? 'sup' : 'off')] = 1;
    });
    var items = KEY.filter(function (k) { return seen[k[0]]; });
    if (items.length < 2) return '';
    return '<div class="cf-key">' + items.map(function (k) {
      return '<span><u style="background:' + k[1] + '"></u>' + k[2] + '</span>';
    }).join('') + '</div>';
  }

  /* support rows, built here (not K.supportRows) so empty activities never
     print a row of zeros and the count is not printed twice per row */
  function support(s) {
    var keys = Object.keys(K.SUPNAME).filter(function (k) { return (s.sup[k] || 0) > 0; });
    if (!keys.length) return '';
    var rows = keys.map(function (k) {
      var v = s.sup[k];
      var pct = s.total ? Math.round(100 * Math.min(v, s.total) / s.total) : 0;
      return '<div class="ck-sup__r"><span class="ck-sup__i">' + K.ICON[k] + '</span>' +
        '<span class="ck-sup__t"><b>' + K.SUPNAME[k] + '</b><i>' + K.SUPUNIT[k] + '</i></span>' +
        '<span class="ck-sup__bar"><u style="width:' + pct + '%"></u></span>' +
        '<span class="ck-sup__n">' + v + '</span></div>';
    }).join('');
    return '<div class="cf-sec"><div class="cf-h"><b>What else you did</b></div>' +
      '<div class="ck-sup">' + rows + '</div></div>';
  }

  var DAY = 168;
  function render() {
    var N = Math.max(1, DAY);
    var log = K.buildLog(N, 'quantity_up');
    var s = K.stats(log, 'quantity_up', 4);

    // rate over the last 30 days, or over the whole record while it is younger
    var w = Math.min(30, N);
    var rate = Math.round(100 * onCount(log.slice(-w)) / w);
    var rateLabel = w < 30 ? 'Rate, last ' + dstr(w) : 'Rate, last 30 days';
    var rateNote = '';
    if (N >= 60) {
      var prev = Math.round(100 * onCount(log.slice(-60, -30)) / 30);
      rateNote = rate === prev ? 'level with the 30 before'
        : (rate > prev ? 'up from ' + prev + '%' : 'down from ' + prev + '%');
    }

    var hero =
      '<div class="cf-hero">' +
        '<div class="cf-say">You’ve shown up</div>' +
        '<div class="cf-num">' + s.total.toLocaleString() + '</div>' +
        '<div class="cf-say">of ' + s.N.toLocaleString() +
          (s.N === 1 ? ' day' : ' days') + ' since you started.</div>' +
      '</div>' +
      '<div class="cf-ledger">' +
        row(rateLabel, rate + '%', rateNote) +
        row('Current run', dstr(s.current)) +
        row('Best run ever', dstr(s.best),
            s.best > 0 && s.current === s.best ? 'the one you are on' : '') +
      '</div>';

    var record =
      '<div class="cf-sec">' +
        '<div class="cf-h"><b>Your record</b><i>' + since(log[0].date) + '</i></div>' +
        K.calendarHTML(log, { cols: heatCols(N) }) +
        legend(log) +
      '</div>';

    var deep = '';
    if (N >= 21) deep += '<div class="cf-sec"><div class="cf-h"><b>Your rhythm</b>' +
      '<i>% kept, by weekday</i></div>' + K.dowChart(s) + '</div>';
    if (s.months.length >= 3) deep += '<div class="cf-sec"><div class="cf-h"><b>By month</b>' +
      '<i>% kept</i></div>' + K.monthChart(s) + '</div>';
    deep += support(s);

    wrap.innerHTML = '<div class="cf-page">' + hero + record + deep + '</div>';
  }

  // day control, pinned to the top by final.html's fixed host
  var host = document.getElementById('finalControls') || wrap;
  var controls = document.createElement('div'); controls.className = 'nf-controls';
  controls.innerHTML = '<div class="nf-slrow"><span class="nf-day" id="cfDay">Day 168</span>' +
    '<input type="range" id="cfSlider" min="1" max="365" value="168" aria-label="Day">' +
    '<div class="nf-chips" id="cfChips">' +
    ['1', '7', '30', '90', '168', '365'].map(function (v) {
      return '<button type="button" data-d="' + v + '">' + v + '</button>';
    }).join('') + '</div></div>';
  host.appendChild(controls);
  // minimal control styling (mirrors numbers.js so this page stands alone)
  var st2 = document.createElement('style');
  st2.textContent =
    '.nf-controls{margin:0;padding:0}' +
    '.nf-slrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
    '.nf-slrow input[type=range]{flex:1;min-width:130px;accent-color:#3fd94e;height:4px}' +
    '.nf-day{font-size:15px;font-weight:700;color:var(--text-hi);min-width:74px;font-variant-numeric:tabular-nums}' +
    '.nf-chips{display:flex;gap:6px}' +
    '.nf-chips button{font:inherit;font-size:12px;font-weight:600;color:var(--text-mid);' +
      'background:rgba(255,255,255,.05);border:0;border-radius:7px;padding:6px 10px;cursor:pointer;' +
      'font-variant-numeric:tabular-nums;min-width:34px}' +
    '.nf-chips button.on{color:#08130a;background:var(--accent)}';
  document.head.appendChild(st2);

  var dayEl = document.getElementById('cfDay');
  var slider = document.getElementById('cfSlider');
  var chips = document.getElementById('cfChips');
  var queued = false;
  function paint() { queued = false; render(); }
  function setDay(v) {
    DAY = v;
    dayEl.textContent = 'Day ' + v;
    Array.prototype.forEach.call(chips.children, function (b) {
      b.classList.toggle('on', +b.getAttribute('data-d') === v);
    });
    if (queued) return;
    queued = true;
    // rAF alone stalls in throttled or background tabs (the old boot-mask
    // lesson), so a timeout backstop guarantees the paint lands regardless
    if (window.requestAnimationFrame) requestAnimationFrame(paint); else paint();
    setTimeout(function () { if (queued) paint(); }, 150);
  }
  slider.addEventListener('input', function () { setDay(+this.value); });
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var v = +b.getAttribute('data-d');
    slider.value = v;
    setDay(v);
  });
  setDay(DAY);
})();
