/* Gallery chrome shared by every mockup page: section nav + pick marking.
   Picks live in localStorage so Malik can tap through on his phone, then copy
   the list in one go. Nothing here is part of the mockups themselves. */
(function () {
  var SEC = [
    { id: 'proof',    t: 'Proof trail',  f: 'proof-trail.html', r: 1 },
    { id: 'action',   t: 'Action',       f: 'action.html',      r: 1 },
    { id: 'evidence', t: 'Evidence',     f: 'evidence.html',    r: 1 },
    { id: 'page2',    t: 'Page two',     f: 'page-two.html',    r: 1 },
    { id: 'close',    t: 'Close the day',f: 'close-day.html',   r: 2 },
    { id: 'comeback', t: 'Comeback',     f: 'comeback.html',    r: 2 },
    { id: 'share',    t: 'Share',        f: 'share.html',       r: 2 },
    { id: 'reflect',  t: 'Reflect',      f: 'reflect.html',     r: 2 },
    { id: 'mori',     t: 'Mori',         f: 'mori.html',        r: 2 },
    { id: 'ambient',  t: 'Lock screen',  f: 'ambient.html',     r: 2 },
    { id: 'page2b',   t: 'Page two, more', f: 'page-two-2.html',r: 2 }
  ];
  var KEY = 'memento-mockup-picks';
  var here = (location.pathname.split('/').pop() || 'index.html');
  var sec = SEC.filter(function (s) { return s.f === here; })[0];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  var picks = load();

  /* ---- nav ---- */
  var nav = document.createElement('nav');
  nav.className = 'gnav';
  var inner = document.createElement('div');
  inner.className = 'gnav__in';
  var home = document.createElement('a');
  home.className = 'gnav__a gnav__a--home';
  home.href = 'index.html';
  home.textContent = 'All';
  inner.appendChild(home);
  SEC.forEach(function (s) {
    var a = document.createElement('a');
    a.className = 'gnav__a' + (sec && s.id === sec.id ? ' is-on' : '');
    a.href = s.f;
    a.textContent = s.t;
    inner.appendChild(a);
  });
  nav.appendChild(inner);
  document.body.insertBefore(nav, document.body.firstChild);

  /* ---- picks ---- */
  var bar = document.createElement('div');
  bar.className = 'gpick';
  bar.innerHTML = '<span class="gpick__n"></span><button class="gpick__b" type="button">Copy list</button><button class="gpick__b gpick__b--q" type="button">Clear</button>';
  document.body.appendChild(bar);
  var nEl = bar.querySelector('.gpick__n');

  function label(id) {
    var s = SEC.filter(function (x) { return x.id === id.split(':')[0]; })[0];
    return (s ? s.t : id.split(':')[0]) + ' ' + id.split(':')[1];
  }
  function paint() {
    bar.classList.toggle('is-on', picks.length > 0);
    nEl.textContent = picks.length + (picks.length === 1 ? ' picked' : ' picked');
    document.querySelectorAll('.item').forEach(function (it) {
      it.classList.toggle('is-picked', picks.indexOf(it.dataset.pid) > -1);
    });
  }

  if (sec) {
    document.querySelectorAll('.item').forEach(function (it) {
      var n = (it.querySelector('.item__n') || {}).textContent || '';
      it.dataset.pid = sec.id + ':' + n.trim();
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'item__pick';
      b.setAttribute('aria-label', 'Pick this one');
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      b.addEventListener('click', function () {
        var i = picks.indexOf(it.dataset.pid);
        if (i > -1) picks.splice(i, 1); else picks.push(it.dataset.pid);
        save(picks); paint();
      });
      (it.querySelector('.item__label') || it).appendChild(b);
    });
  }

  bar.querySelector('.gpick__b').addEventListener('click', function () {
    var txt = picks.map(label).join(', ');
    var ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    var b = this, old = b.textContent;
    b.textContent = 'Copied'; setTimeout(function () { b.textContent = old; }, 1400);
  });
  bar.querySelector('.gpick__b--q').addEventListener('click', function () {
    picks = []; save(picks); paint();
  });

  /* hub: show the running list */
  var hubOut = document.getElementById('hubPicks');
  if (hubOut) {
    if (picks.length) hubOut.textContent = picks.map(label).join(' · ');
    else hubOut.textContent = 'Tap the check on any mockup to mark it. Your picks collect here.';
  }
  paint();
})();
