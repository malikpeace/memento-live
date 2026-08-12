/* ============================================================
   Consistency — the definitive tap-in page (numbers-first).
   Spec locked with Malik 2026-08-12:
     1. Hero: sentence voice framing ONE cumulative number (days shown up)
     2. Ledger of 3 improvable/positive stats: rate last 30 · current run · best run
     3. Heatmap under it (honest record; a miss is an empty cell, no shame number)
     4. Deep stats below (rhythm, months, support)
   Reuses _kit.js for the heatmap + deep-stat components.
   ============================================================ */
(function () {
  var K = window.CKit;
  var wrap = document.getElementById('finalLab');
  if (!K || !wrap) return;

  var st = document.createElement('style');
  st.textContent =
    '.cf-page{max-width:430px;margin:0 auto}' +
    '.cf-hero{padding:6px 0 16px}' +
    '.cf-say{font-size:17px;color:var(--text-mid);font-weight:500;line-height:1.3}' +
    '.cf-num{font-size:84px;font-weight:840;color:#f4fff7;line-height:.9;letter-spacing:-.045em;font-variant-numeric:tabular-nums;margin:4px 0 2px}' +
    '.cf-say2{font-size:17px;color:var(--text-mid);font-weight:500;line-height:1.3}' +
    '.cf-ledger{border-top:1px solid var(--hairline);margin-top:8px}' +
    '.cf-row{display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-bottom:1px solid var(--hairline)}' +
    '.cf-row span{font-size:14px;color:var(--text-mid)}' +
    '.cf-row b{font-size:16px;font-weight:700;color:var(--text-hi);font-variant-numeric:tabular-nums;letter-spacing:-.01em}' +
    '.cf-sec{margin-top:28px}' +
    '.cf-h{font-size:14px;font-weight:700;color:var(--text-hi);margin-bottom:12px}' +
    '.cf-note{font-size:12px;color:var(--text-lo);margin-top:11px;line-height:1.5}';
  document.head.appendChild(st);

  function row(l, v) { return '<div class="cf-row"><span>' + l + '</span><b>' + v + '</b></div>'; }
  function dstr(v) { return v + (v === 1 ? ' day' : ' days'); }

  var DAY = 168;
  function render() {
    var N = Math.max(1, DAY);
    var log = K.buildLog(N, 'quantity_up');
    var s = K.stats(log, 'quantity_up', 4);
    var w = Math.min(30, N), on = 0;
    for (var i = log.length - w; i < log.length; i++) if (log[i] && log[i].on) on++;
    var rate30 = w ? Math.round(100 * on / w) : 0;

    var hero =
      '<div class="cf-hero">' +
        '<div class="cf-say">You’ve shown up</div>' +
        '<div class="cf-num">' + s.total.toLocaleString() + '</div>' +
        '<div class="cf-say2">of ' + s.N.toLocaleString() + (s.N === 1 ? ' day' : ' days') + ' since you started.</div>' +
      '</div>' +
      '<div class="cf-ledger">' +
        row('Rate, last 30 days', rate30 + '%') +
        row('Current run', dstr(s.current)) +
        row('Best run ever', dstr(s.best)) +
      '</div>';

    var record =
      '<div class="cf-sec"><div class="cf-h">Your record</div>' +
        K.calendarHTML(log) +
        '<div class="cf-note">Every filled square is a day you showed up. Empty ones are days you didn’t. Nothing here is hidden, and nothing is held against you.</div>' +
      '</div>';

    var deep =
      '<div class="cf-sec"><div class="cf-h">Your rhythm</div>' + K.dowChart(s) + '</div>' +
      '<div class="cf-sec"><div class="cf-h">By month</div>' + K.monthChart(s) + '</div>' +
      '<div class="cf-sec"><div class="cf-h">Around the work</div>' + K.supportRows(s) + '</div>';

    wrap.innerHTML = '<div class="cf-page">' + hero + record + deep + '</div>';
  }

  // day control, pinned to the top by final.html's fixed host
  var host = document.getElementById('finalControls') || wrap;
  var controls = document.createElement('div'); controls.className = 'nf-controls';
  controls.innerHTML = '<div class="nf-slrow"><span class="nf-day" id="cfDay">Day 168</span><input type="range" id="cfSlider" min="1" max="365" value="168"><div class="nf-chips" id="cfChips">' + ['1', '7', '30', '90', '168', '365'].map(function (v) { return '<button data-d="' + v + '">Day ' + v + '</button>'; }).join('') + '</div></div>';
  host.appendChild(controls);
  // minimal control styling (mirrors numbers.js so this page stands alone)
  var st2 = document.createElement('style');
  st2.textContent =
    '.nf-controls{margin:0;padding:0}' +
    '.nf-slrow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
    '.nf-slrow input[type=range]{flex:1;min-width:130px;accent-color:#3fd94e;height:4px}' +
    '.nf-day{font-size:15px;font-weight:750;color:var(--text-hi);min-width:92px;font-variant-numeric:tabular-nums}' +
    '.nf-chips{display:flex;gap:6px}.nf-chips button{font:inherit;font-size:12px;font-weight:600;color:var(--text-mid);background:rgba(255,255,255,.05);border:0;border-radius:7px;padding:6px 11px;cursor:pointer}';
  document.head.appendChild(st2);

  function setDay(v) { DAY = v; document.getElementById('cfDay').textContent = 'Day ' + v; render(); }
  document.getElementById('cfSlider').addEventListener('input', function () { setDay(+this.value); });
  document.getElementById('cfChips').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var v = +b.getAttribute('data-d'); document.getElementById('cfSlider').value = v; setDay(v); });
  render();
})();
