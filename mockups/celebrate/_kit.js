/* Beat driver. Fragments never write sequencing. Beats auto-advance AND
   advance on tap; the last beat SITS until the user dismisses it (Malik:
   never auto-dismiss, and no hold gesture anywhere). */
(function(){
  /* Dwell per beat before auto-advance. Malik: the pauses went by too fast
     to look at, so these are review-friendly; a tap still advances instantly,
     and the shipped app can shorten them again. */
  var T = [3600, 4200];   // b1, b2 dwell; b3 persists

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
    /* cloneNode copies the LIVE class list, so a replay carried the finished
       beat's .on into the fresh stage and lit it underneath beat 1. Two beats
       on at once, stacked and unreadable. Clear the flag on every beat before
       the sequence starts. */
    ph._beats.forEach(function(b){ b.classList.remove('on'); });
    ph._i = -1;
    step(ph);
  }

  /* Accent confetti, the onboarding burst-and-shower mechanic tinted to the
     user's Memento colour (Malik: one system, shades of their colour + white).
     Fires only where a beat carries data-confetti, which the chooser reserves
     for day-ladder hits and FINAL milestones, so it stays rare. Self-kills in
     ~4.5s; skipped entirely under reduced motion. */
  function confetti(ph){
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = ph.querySelector('.cel-confetti');
    if (!cv) { cv = document.createElement('canvas'); cv.className='cel-confetti'; ph.appendChild(cv); }
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var dpr = Math.min(devicePixelRatio||1, 2), W = ph.clientWidth, H = ph.clientHeight;
    cv.width = W*dpr; cv.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    var rgb = getComputedStyle(ph.closest('body')||document.body).getPropertyValue('--accent-rgb').trim() || '43,212,212';
    var p = rgb.split(',').map(Number);
    function sh(f){ return 'rgb('+p.map(function(c){ return Math.round(Math.min(255, c*f + (f>1 ? (f-1)*140 : 0))); }).join(',')+')'; }
    var colors = [sh(1), sh(1.35), sh(.72), '#ffffff', sh(1.15)];
    var parts = [], t0 = performance.now();
    function burst(ox, oy, count){
      for (var i=0;i<count;i++){
        var ang = Math.random()*Math.PI*2, sp = 1.6+Math.random()*3.2;
        parts.push({ x:ox, y:oy, vx:Math.cos(ang)*sp, vy:Math.sin(ang)*sp-1.4,
          g:.02+Math.random()*.03, size:4+Math.random()*5, rot:Math.random()*6.28,
          vr:(Math.random()-.5)*.18, color:colors[(Math.random()*colors.length)|0],
          life:0, max:150+Math.random()*120, shape:Math.random()<.5?'r':'c' });
      }
    }
    burst(W*.5, H*.42, 54);
    var ver = (ph._cfVer = (ph._cfVer||0)+1);
    (function tick(){
      if (ph._cfVer !== ver || !cv.isConnected) return;
      ctx.clearRect(0,0,W,H);
      var live = 0, done = performance.now()-t0 > 4500;
      for (var i=0;i<parts.length;i++){ var q=parts[i];
        if (q.life>q.max || q.y>H+24) continue; live++;
        q.life++; q.vy+=q.g; q.x+=q.vx; q.y+=q.vy; q.vx*=.992; q.rot+=q.vr;
        var a = q.life>q.max-40 ? (q.max-q.life)/40 : 1;
        ctx.globalAlpha = Math.max(0,a); ctx.fillStyle = q.color;
        ctx.save(); ctx.translate(q.x,q.y); ctx.rotate(q.rot);
        if (q.shape==='r') ctx.fillRect(-q.size/2,-q.size/3,q.size,q.size*.66);
        else { ctx.beginPath(); ctx.arc(0,0,q.size/2,0,6.29); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (!live || done) { ctx.clearRect(0,0,W,H); return; }
      requestAnimationFrame(tick);
    })();
  }

  /* Every screen carries the M (Malik: a screenshot should promote Memento),
     injected here so it is impossible to double: phones whose art already
     contains the mark get nothing. Lives on .ph, outside the cloned stage. */
  function ensureMark(ph){
    if (ph.querySelector('path[d^="M150 146"]')) return;
    var s = document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 512 512'); s.setAttribute('class','mark--foot');
    s.setAttribute('aria-hidden','true');
    var path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M150 146 L256 252 L362 146 L362 366 L150 366 Z');
    s.appendChild(path); ph.appendChild(s);
  }

  function step(ph){
    clearTimeout(ph._t);
    if (ph._i >= 0 && ph._beats[ph._i]) ph._beats[ph._i].classList.remove('on');
    ph._i++;
    var b = ph._beats[ph._i];
    if (!b) { ph.classList.add('done'); return; }
    b.classList.add('on');
    [].forEach.call(b.querySelectorAll('[data-count]'), countUp);
    if (b.hasAttribute('data-confetti')) confetti(ph);
    if (ph._i === ph._beats.length - 1) { ph.classList.add('done'); return; }
    ph._t = setTimeout(function(){ step(ph); }, T[ph._i] || 2000);
  }

  window.CEL = {
    init:function(){
      [].forEach.call(document.querySelectorAll('.ph'), function(ph){
        ensureMark(ph);
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
