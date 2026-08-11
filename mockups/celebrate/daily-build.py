#!/usr/bin/env python3
"""Assembles the daily-reward gallery.

Each concept fragment in daily-frag/<key>.html carries ONE <style> block plus
exactly three .ph phones (day 1, week 1, month 1). This file owns the page
shell, the row layout, the state labels and the replay driver so no fragment
has to think about any of it.

Run: python3 daily-build.py
"""
import json, os, glob, html

HERE = os.path.dirname(os.path.abspath(__file__))
FRAG = os.path.join(HERE, 'daily-frag')
MANIFEST = os.path.join(HERE, 'daily-manifest.json')

STATE_LABEL = ['Day 1', 'Week 1', 'Month 1']

# The consistency bench: a live panel (its own phones, not the 20 static ones)
# that lets Malik drag total actions + recent consistency and see the humane
# answer, the number never shames, warmth carries momentum, misses are never
# drawn as accusations. Also shows the cautionary window that DOES expose gaps.
BENCH = """
<section class="bench" id="bench">
  <div class="bench__hd">
    <span class="bench__t">Test bench: consistency without shame</span>
  </div>
  <p class="bench__lede">Drag the sliders. The unit is <b>actions completed</b>, not calendar days, so a person who shows up three times a week is never told they missed four. The banked number only ever climbs. Recent momentum shows as <b>warmth</b>, cooling when you are away, warming when you return, so consistency has stakes without a streak that can break. The third phone is the one pattern to avoid: it draws your gaps back at you.</p>
  <div class="bench__ctl">
    <label><span>Total actions</span><input type="range" id="bTotal" min="1" max="300" value="30"><b id="bTotalOut">30</b></label>
    <label><span>Recent consistency</span><input type="range" id="bCons" min="5" max="100" value="60"><b id="bConsOut">60%</b></label>
    <label class="bench__seg"><span>Their cadence</span>
      <select id="bCad"><option value="daily">daily goal</option><option value="freq">3x a week</option><option value="maint">maintenance</option></select></label>
  </div>
  <div class="row">
    <div class="state"><p class="state__l">The count, immune to gaps</p>
      <div class="ph benchph" data-b="count"><div class="dst"></div><div class="hint">only knows your total</div></div></div>
    <div class="state state--now"><p class="state__l">The rhythm, warmth not streak</p>
      <div class="ph benchph" data-b="rhythm"><div class="dst"></div><div class="hint">momentum, never a miss count</div></div></div>
    <div class="state"><p class="state__l">The window, the pattern to avoid</p>
      <div class="ph benchph" data-b="window"><div class="dst"></div><div class="hint">this one shames, shown as a warning</div></div></div>
  </div>
</section>
"""

BENCH_CSS = """
.bench{margin:0 0 40px;padding:22px 22px 26px;border-radius:20px;
  background:rgba(63,217,78,.045);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
.bench__t{font-size:16px;font-weight:700;letter-spacing:-.015em}
.bench__lede{font-size:13px;color:rgba(235,238,248,.62);line-height:1.55;margin:8px 0 18px;max-width:80ch}
.bench__lede b{color:rgba(235,238,248,.96);font-weight:650}
.bench__ctl{display:flex;flex-wrap:wrap;gap:16px 30px;margin:0 0 22px;padding:14px 16px;
  border-radius:12px;background:rgba(0,0,0,.28)}
.bench__ctl label{display:flex;align-items:center;gap:11px;font-size:12.5px;color:rgba(235,238,248,.62)}
.bench__ctl label span{flex:0 0 auto}
.bench__ctl input[type=range]{width:190px;accent-color:var(--day)}
.bench__ctl b{font-size:12.5px;font-weight:700;color:rgba(235,238,248,.96);font-variant-numeric:tabular-nums;min-width:38px}
.bench__ctl select{background:rgba(235,238,248,.08);color:rgba(235,238,248,.96);border:0;border-radius:8px;
  padding:7px 9px;font:600 13px/1 var(--font)}
.benchph{cursor:default}
/* bench phone internals */
.benchph .bn{font-variant-numeric:tabular-nums;font-weight:700;letter-spacing:-.045em;line-height:.92;color:rgba(235,238,248,.96)}
.benchph .bn--hero{font-size:112px}
.benchph .bu{font-size:15px;color:rgba(235,238,248,.62);margin-top:14px}
.benchph .bcap{font-size:12.5px;color:rgba(235,238,248,.40);margin-top:9px}
.benchph .bwarm{position:absolute;left:50%;top:44%;width:300px;height:300px;transform:translate(-50%,-50%);
  border-radius:50%;pointer-events:none;filter:blur(2px)}
.benchph .brow{display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:250px;margin-top:22px}
.benchph .bdot{width:9px;height:9px;border-radius:50%}
.benchph .bgrid{display:grid;grid-template-columns:repeat(10,1fr);gap:7px;width:262px;margin-top:20px}
.benchph .bcell{width:100%;aspect-ratio:1;border-radius:4px}
.benchph .bline{font-size:15px;font-weight:600;color:var(--day);margin-top:18px;letter-spacing:-.01em}
.benchph .bmiss{font-size:13px;color:#ff6b6b;margin-top:14px}
"""

BENCH_JS = r"""
(function(){
  var $=function(id){return document.getElementById(id)};
  function seeded(s){return function(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff}}
  function moods(c){ return c>=0.7?'Strong lately.':c>=0.38?'Finding your rhythm.':'Good to have you back.'; }
  function unit(total, cad){
    if(cad==='maint') return total===1?'day held':'days held';
    if(cad==='freq')  return total===1?'session':'sessions';
    return total===1?'move':'moves';
  }
  function warmRGBA(c, a){ // warm green when consistent, cools toward dim slate when not
    var g=Math.round(40+c*160); return 'rgba('+Math.round(20+c*40)+','+g+','+Math.round(30+c*30)+','+a+')';
  }
  function render(){
    var total=+$('bTotal').value, c=+$('bCons').value/100, cad=$('bCad').value;
    $('bTotalOut').textContent=total; $('bConsOut').textContent=Math.round(c*100)+'%';
    var u=unit(total,cad);
    // 1. THE COUNT: identical at every consistency. Only the total exists.
    document.querySelector('[data-b=count] .dst').innerHTML =
      '<div class="bn bn--hero">'+total+'</div><div class="bu">'+u+', banked</div>'+
      '<div class="bcap">the same screen at 20% or 100%</div>';
    // 2. THE RHYTHM: banked number + warmth from recent consistency + kind line.
    var warm=document.querySelector('[data-b=rhythm] .dst');
    var last=Math.min(14,total), rnd=seeded(Math.round(c*97)+total), dots='';
    for(var i=0;i<last;i++){ var on=rnd()<c;
      dots+='<span class="bdot" style="background:'+(on?'var(--day)':'rgba(235,238,248,.12)')+'"></span>'; }
    warm.innerHTML='<div class="bwarm" style="background:radial-gradient(circle,'+warmRGBA(c,.32)+',transparent 66%)"></div>'+
      '<div class="bn bn--hero" style="position:relative">'+total+'</div>'+
      '<div class="bu" style="position:relative">'+u+', banked</div>'+
      '<div class="brow">'+dots+'</div>'+
      '<div class="bline">'+moods(c)+'</div>';
    // 3. THE WINDOW: draws misses back at you. The anti-pattern.
    var win=document.querySelector('[data-b=window] .dst'), r2=seeded(Math.round(c*53)+7), cells='', miss=0;
    for(var j=0;j<30;j++){ var d=r2()<c; if(!d)miss++;
      cells+='<span class="bcell" style="background:'+(d?'rgba(63,217,78,.5)':'rgba(255,107,107,.14)')+'"></span>'; }
    win.innerHTML='<div class="bn" style="font-size:74px">'+total+'</div><div class="bu">the last 30 days</div>'+
      '<div class="bgrid">'+cells+'</div><div class="bmiss">'+miss+' days missed</div>';
  }
  ['bTotal','bCons','bCad'].forEach(function(id){ $(id).addEventListener('input',render); });
  render();
})();
"""

SHELL_CSS = """
:root{
  --ink:235,238,248;
  --text-hi:rgba(var(--ink),.96); --text-mid:rgba(var(--ink),.62); --text-lo:rgba(var(--ink),.40);
  --hairline:rgba(var(--ink),.09);
  --day:#3fd94e; --day-rgb:63,217,78; --day-strong:#1f9e2a;
  --font:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
}
@font-face { font-family:'Geist'; src:url('../fonts/geist-400.otf') format('opentype'); font-weight:400; font-display:swap; }
@font-face { font-family:'Geist'; src:url('../fonts/geist-500.otf') format('opentype'); font-weight:500; font-display:swap; }
@font-face { font-family:'Geist'; src:url('../fonts/geist-700.otf') format('opentype'); font-weight:700; font-display:swap; }
*{box-sizing:border-box}
body{margin:0;background:#0a0b0d;color:var(--text-hi);font-family:var(--font);-webkit-font-smoothing:antialiased}

.bar{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  padding:11px 20px;background:rgba(10,11,13,.9);
  -webkit-backdrop-filter:blur(20px) saturate(1.4);backdrop-filter:blur(20px) saturate(1.4);
  border-bottom:1px solid var(--hairline)}
.bar a{color:var(--text-mid);text-decoration:none;font-size:13px;font-weight:600}
.bar__t{font-size:13px;font-weight:700;letter-spacing:-.01em}
.bar__n{font-size:12px;color:var(--text-lo)}
.bar__n b{color:var(--text-mid);font-weight:600}

.wrap{padding:24px 20px 100px;max-width:1400px;margin:0 auto}
h1{font-size:27px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
.lede{color:var(--text-mid);font-size:14.5px;line-height:1.6;margin:0 0 10px;max-width:78ch}
.lede b{color:var(--text-hi);font-weight:650}

.toc{display:flex;flex-wrap:wrap;gap:7px;margin:18px 0 34px}
.toc a{font-size:12px;font-weight:600;color:var(--text-mid);text-decoration:none;
  padding:7px 11px;border-radius:8px;background:rgba(var(--ink),.06)}

.concept{margin:0 0 46px;padding-top:26px;border-top:1px solid rgba(var(--ink),.10)}
.concept__hd{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px}
.concept__n{font-size:12px;color:var(--text-lo);font-variant-numeric:tabular-nums}
.concept__t{font-size:18px;font-weight:700;letter-spacing:-.015em}
.concept__replay{margin-left:auto;-webkit-appearance:none;appearance:none;border:0;cursor:pointer;
  font:650 12px/1 var(--font);color:var(--text-mid);background:rgba(var(--ink),.07);
  padding:8px 12px;border-radius:8px}
.concept__replay:active{background:rgba(var(--ink),.13)}
.concept__b{font-size:13px;color:var(--text-mid);line-height:1.55;margin:0 0 16px;max-width:74ch}

.row{display:flex;flex-wrap:wrap;gap:22px;align-items:flex-start}
.state{width:390px;max-width:100%}
.state__l{font-size:11.5px;font-weight:650;color:var(--text-lo);letter-spacing:.02em;margin:0 0 8px 2px}
.state--now .state__l{color:var(--day)}

/* the phone */
.ph{width:390px;height:760px;border-radius:44px;overflow:hidden;position:relative;background:#000;
  cursor:pointer;box-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.06)}
.dst{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:34px 30px;text-align:center}
.hint{position:absolute;left:0;right:0;bottom:13px;text-align:center;font-size:10px;
  letter-spacing:.04em;color:rgba(var(--ink),.16)}

@media (max-width:1320px){ .state,.ph{width:100%;max-width:390px} }
@media (prefers-reduced-motion:reduce){ *{animation:none!important;transition:none!important} }
"""

DRIVER = """
(function(){
  function play(ph){
    ph.classList.remove('on');
    void ph.offsetWidth;      // force reflow so a replay actually restarts
    ph.classList.add('on');
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-replay]');
    if (b) {
      var row = document.getElementById(b.getAttribute('data-replay'));
      if (row) [].forEach.call(row.querySelectorAll('.ph'), play);
      return;
    }
    var ph = e.target.closest('.ph');
    if (ph) play(ph);
  });
  // play everything once on load, staggered a touch so the page is not chaos
  var phones = [].slice.call(document.querySelectorAll('.ph'));
  phones.forEach(function(ph, i){ setTimeout(function(){ play(ph); }, 40 + i * 22); });
  window.__playAll = function(){ phones.forEach(play); };
})();
"""


def build():
    man = json.load(open(MANIFEST, encoding='utf-8')) if os.path.exists(MANIFEST) else {'concepts': []}
    concepts = man.get('concepts', [])

    styles, sections, toc = [], [], []
    for i, c in enumerate(concepts, 1):
        path = os.path.join(FRAG, c['key'] + '.html')
        if not os.path.exists(path):
            continue
        raw = open(path, encoding='utf-8').read()
        # split the fragment's own style out so all styles ride in <head>
        if '<style>' in raw:
            pre, rest = raw.split('<style>', 1)
            css, body = rest.split('</style>', 1)
            styles.append(css.strip())
        else:
            body = raw
        # wrap each phone in a labelled state column, in document order.
        # splitting on the opening tag yields one chunk per phone, each chunk
        # already carrying its own closing </div>.
        rid = 'row-' + c['key']
        chunks = body.split('<div class="ph"')
        wrapped = []
        for idx, ch in enumerate(chunks[1:]):
            label = STATE_LABEL[idx] if idx < len(STATE_LABEL) else 'State %d' % (idx + 1)
            cls = 'state state--now' if idx == len(STATE_LABEL) - 1 else 'state'
            wrapped.append('<div class="%s"><p class="state__l">%s</p><div class="ph"%s</div>'
                           % (cls, label, ch))
        toc.append('<a href="#%s">%d. %s</a>' % (rid, i, html.escape(c['name'])))
        sections.append(
            '<section class="concept" id="%s">'
            '<div class="concept__hd"><span class="concept__n">%d</span>'
            '<span class="concept__t">%s</span>'
            '<button class="concept__replay" data-replay="%s" type="button">Replay all three</button></div>'
            '<p class="concept__b">%s</p>'
            '<div class="row">%s</div></section>'
            % (rid, i, html.escape(c['name']), rid, c.get('blurb', ''), ''.join(wrapped))
        )

    page = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The daily reward, %d directions</title>
<style>%s</style>
<style>%s</style>
<style>__BENCHCSS__</style>
</head><body>
<div class="bar">
  <a href="index.html">&lsaquo; All</a>
  <span class="bar__t">The daily reward</span>
  <span class="bar__n">green = consistency &middot; quiet, banked, seen every day &middot; <b>tap any phone to replay</b></span>
</div>
<div class="wrap">
  <h1>The daily reward, %d directions</h1>
  <p class="lede">The everyday hit, fired the moment someone completes their action. Not a milestone: <b>no confetti, no colour flood</b>, green rather than their Memento colour, quiet enough to see <b>every day for a year</b>. It celebrates the one thing every goal shares, <b>showing up</b>, so nothing here mentions weight, money, runs or any target. Days are <b>banked and never lost</b>, so a missed day costs nothing.</p>
  <p class="lede">Each concept is shown at <b>day 1, week 1 and month 1</b>, because those are the states that decide whether it works. Tap a phone to replay it, or replay a whole row.</p>
  <p class="lede" style="color:rgba(235,238,248,.40)">Honest note before you start: an adversarial pass found four families that overlap, so cut fast rather than grading twenty in isolation. <b style="color:rgba(235,238,248,.62)">4, 6, 16 and 18</b> (settles, stack, stack, deposit) all resolve to a number above a pile of lines, only the entry motion differs. <b style="color:rgba(235,238,248,.62)">3 and 8</b> are both one ring per day. <b style="color:rgba(235,238,248,.62)">13 and 14</b> are both a number plus a growing green light. <b style="color:rgba(235,238,248,.62)">5 and 11</b> are both a row of strokes on a baseline. The independent sweep rated <b style="color:rgba(235,238,248,.62)">1 the odometer</b>, <b style="color:rgba(235,238,248,.62)">17 the card</b> and <b style="color:rgba(235,238,248,.62)">10 the stamp</b> strongest, and flagged <b style="color:rgba(235,238,248,.62)">12 the staircase</b> and <b style="color:rgba(235,238,248,.62)">15 the pulse</b> as the ones that saturate soonest past a year.</p>
  <div class="toc">%s</div>
  __BENCH__
  %s
</div>
<script>%s</script>
<script>__BENCHJS__</script>
</body></html>""" % (len(sections), SHELL_CSS, '\n'.join(styles), len(sections),
                     ''.join(toc), ''.join(sections), DRIVER)

    page = (page.replace('__BENCHCSS__', BENCH_CSS)
                .replace('__BENCH__', BENCH)
                .replace('__BENCHJS__', BENCH_JS))

    open(os.path.join(HERE, 'daily.html'), 'w', encoding='utf-8').write(page)
    print('built daily.html with %d concepts (%d phones)' % (len(sections), len(sections) * 3))


build()
