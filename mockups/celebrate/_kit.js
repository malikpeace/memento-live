/* Beat driver. Fragments never write sequencing. Beats auto-advance AND
   advance on tap; the last beat SITS until the user dismisses it (Malik:
   never auto-dismiss, and no hold gesture anywhere). */
(function(){
  var T = [1900, 2300];   // b1, b2 dwell; b3 persists

  function countUp(el){
    var p = (el.getAttribute('data-count')||'').split('|');
    var from = +p[0], to = +p[1];
    if (!isFinite(from) || !isFinite(to)) return;
    var dur = 1200, t0 = null;
    el.textContent = from;
    function step(t){
      if (t0===null) t0=t;
      var q = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-q,3);
      el.textContent = Math.round(from+(to-from)*e);
      if (q<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function play(ph){
    clearTimeout(ph._t);
    ph.classList.remove('done');
    var st = ph.querySelector('.st');
    var fresh = st.cloneNode(true);
    st.parentNode.replaceChild(fresh, st);     // hard reset every animation
    ph._beats = [].slice.call(fresh.querySelectorAll('.b'));
    ph._i = -1;
    step(ph);
  }

  function step(ph){
    clearTimeout(ph._t);
    if (ph._i >= 0 && ph._beats[ph._i]) ph._beats[ph._i].classList.remove('on');
    ph._i++;
    var b = ph._beats[ph._i];
    if (!b) { ph.classList.add('done'); return; }
    b.classList.add('on');
    [].forEach.call(b.querySelectorAll('[data-count]'), countUp);
    if (ph._i === ph._beats.length - 1) { ph.classList.add('done'); return; }
    ph._t = setTimeout(function(){ step(ph); }, T[ph._i] || 2000);
  }

  window.CEL = {
    init:function(){
      [].forEach.call(document.querySelectorAll('.ph'), function(ph){
        ph.addEventListener('click', function(){
          // tap advances; once finished, tap replays
          if (ph.classList.contains('done')) play(ph); else step(ph);
        });
        play(ph);
      });
      var sw = document.querySelector('.sw');
      if (sw) sw.addEventListener('click', function(e){
        var b = e.target.closest('button'); if (!b) return;
        document.body.setAttribute('data-accent', b.getAttribute('data-a'));
        [].forEach.call(sw.querySelectorAll('button'), function(x){ x.classList.toggle('on', x===b); });
      });
    },
    replayAll:function(){ [].forEach.call(document.querySelectorAll('.ph'), play); }
  };
})();
