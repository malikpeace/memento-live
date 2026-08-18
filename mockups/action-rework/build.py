#!/usr/bin/env python3
"""Assemble mockups/action-rework/frag/*.html into gallery.html.
2026-08-18 cleanup (Malik): the costume loops, intensity mechanics and the
standalone pulse are RETIRED (git history keeps them). Six fragments remain:
the opening three side by side, the logic pair, the universal layout."""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
FRAG = ROOT / 'frag'
ORDER = ['ob', 'q', 'ld', 'lg', 'u']
# prefix -> section key (ob/q/ld share one row so Malik stops scrolling)
GROUP = {'ob': 'open', 'q': 'open', 'ld': 'open', 'lg': 'lg', 'u': 'u'}
SECTIONS = {
    'open': ('The opening', 'Onboarding, the refine step, and loading, side by side: the road from the wall of intent to the plan. The pulse lives inside the refine step (page 4), not as its own screen.'),
    'lg': ('The logic', 'What the loading lands on: the plan as reasoning, in their own words. The combined page is the candidate; the original stays for comparison until it dies.'),
    'u': ('THE UNIVERSAL LAYOUT', 'The one screen every goal lives in: the star act + up to two supports, the rail, the NO list, the hold, the close. The costume layouts and separate mechanics are retired.'),
}

REACH = {
    'ob-1': ('10/10', 'everyone, their first minute'),
    'q-2':  ('10/10', 'everyone, before every plan (the pulse is page 4)'),
    'ld-4': ('10/10', 'everyone, every plan build'),
    'lg-1': ('10/10', 'the original, kept for comparison'),
    'lg-5': ('10/10', 'THE COMBINED CANDIDATE: concise, then the math, then the questions'),
    'u-1':  ('10/10', 'the one layout, every bucket, every day'),
}

def key_of(p):
    m = re.match(r'([a-z]+)-(\d+)', p.stem)
    return (ORDER.index(m.group(1)) if m and m.group(1) in ORDER else 99,
            int(m.group(2)) if m else 0)

HEAD = """<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Action rework: the survivors</title>
<style>
@font-face { font-family:'Geist'; src:url('../fonts/geist-400.otf') format('opentype'); font-weight:400; font-display:swap; }
@font-face { font-family:'Geist'; src:url('../fonts/geist-500.otf') format('opentype'); font-weight:500; font-display:swap; }
@font-face { font-family:'Geist'; src:url('../fonts/geist-700.otf') format('opentype'); font-weight:700; font-display:swap; }
:root{--ink:235,238,248;--text-hi:rgba(var(--ink),.96);--text-mid:rgba(var(--ink),.78);--text-lo:rgba(var(--ink),.45);
--font:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:#0a0b0d;color:var(--text-hi);font-family:var(--font);-webkit-font-smoothing:antialiased}
.gal{padding:26px 34px 140px;max-width:1780px;margin:0 auto}
.gal h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
.gal>.sub{color:var(--text-mid);font-size:14px;margin:0 0 24px;max-width:78ch;line-height:1.55}
.grp{margin:44px 0 0;padding-top:26px;border-top:1px solid rgba(var(--ink),.16)}
.grp h2{font-size:19px;font-weight:700;margin:0 0 2px;letter-spacing:-.015em}
.grp>p{color:var(--text-mid);font-size:13px;margin:0 0 18px;max-width:76ch}
.wall{display:flex;flex-wrap:wrap;gap:46px 44px;align-items:flex-start}
.cell{max-width:100%}
.cell h3{font-size:13px;font-weight:700;margin:0 0 2px}
.cell .cap{font-size:11.5px;color:var(--text-lo);margin:0 0 9px;max-width:300px;line-height:1.45;min-height:30px}
/* THE PHONE. .ph IS the screen (300x650, the iPhone 390x844 ratio at 77%).
   The device shell is drawn OUTSIDE it with box-shadow rings: bezel, polished
   edge, drop shadow. Island + home indicator are the screen's own overlays,
   doubling as a safe-area check. */
.ph{position:relative;width:300px;height:650px;border-radius:44px;overflow:hidden;background:#050608;
  box-shadow:
    0 0 0 11px #0b0c0e,
    0 0 0 12.5px rgba(var(--ink),.20),
    0 0 0 13.5px rgba(0,0,0,.9),
    0 26px 64px rgba(0,0,0,.62)}
.ph::before{content:'';position:absolute;z-index:90;top:9px;left:50%;transform:translateX(-50%);
  width:70px;height:21px;border-radius:999px;background:#000;pointer-events:none;
  box-shadow:inset 0 0 0 .5px rgba(var(--ink),.06)}
.ph::after{content:'';position:absolute;z-index:90;bottom:7px;left:50%;transform:translateX(-50%);
  width:104px;height:4px;border-radius:999px;background:rgba(var(--ink),.32);pointer-events:none}
/* DESKTOP VIEW (Malik, 2026-08-18): the same fragments in a desktop window.
   The app is mobile-first with a centered column on desktop, so the toggle
   widens the frame and pins every screen layer to a centered 390px column,
   which is exactly what the real app does at 1440. */
body.vw-desk .ph{width:880px;height:560px;border-radius:16px}
body.vw-desk .ph::before,body.vw-desk .ph::after{display:none}
body.vw-desk .ph>:not(.grid){left:50%!important;right:auto!important;width:390px!important;
  transform:translateX(-50%)}
/* bucket labels + toggle */
.reach{display:inline-flex;align-items:baseline;gap:7px;margin:0 0 4px}
.reach b{font-size:12px;font-weight:700;color:#0b0c10;background:rgba(235,238,248,.92);
  border-radius:7px;padding:3px 8px;font-variant-numeric:tabular-nums}
.reach span{font-size:10.5px;color:rgba(var(--ink),.55);font-weight:500}
.bk{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 9px;align-items:center}
.bk i{font-style:normal;font-size:10.5px;font-weight:700;color:rgba(var(--ink),.9);
  background:rgba(var(--ink),.08);border-radius:7px;padding:4px 9px;
  box-shadow:inset 0 1px 0 rgba(var(--ink),.07)}
.bk button{-webkit-appearance:none;appearance:none;border:0;cursor:pointer;font-family:var(--font);
  font-size:10.5px;font-weight:700;color:rgba(var(--ink),.55);background:rgba(var(--ink),.05);
  border-radius:7px;padding:4px 9px;box-shadow:inset 0 1px 0 rgba(var(--ink),.05)}
.bk button.on{color:#0b0c10;background:rgba(235,238,248,.92)}
/* THE ROOM: Points, Malik's pick (2026-08-16). Dots where the grid's lines
   would have crossed: the workbench without the cage. Two sparse offset
   subsets breathe on uneven cycles. */
.grid{position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(var(--ink),.16) 1.4px,transparent 1.4px);
  background-size:26px 26px;background-position:12px 12px;
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 1.4px,transparent 1.4px);
  mask-image:linear-gradient(90deg,transparent 0,#000 1.4px,transparent 1.4px);
  -webkit-mask-size:26px 26px;mask-size:26px 26px;
  -webkit-mask-position:12px 12px;mask-position:12px 12px;
  opacity:1}
.grid::before,.grid::after{content:'';position:absolute;inset:0;
  background-image:inherit;background-size:78px 78px;
  -webkit-mask-image:inherit;mask-image:inherit;
  -webkit-mask-size:78px 78px;mask-size:78px 78px}
.grid::before{background-position:38px 64px;-webkit-mask-position:38px 64px;mask-position:38px 64px;
  animation:rmBreatheA 9s ease-in-out infinite alternate}
.grid::after{background-position:64px 12px;-webkit-mask-position:64px 12px;mask-position:64px 12px;
  animation:rmBreatheB 13s ease-in-out -5s infinite alternate}
@keyframes rmBreatheA{from{opacity:0}to{opacity:.9}}
@keyframes rmBreatheB{from{opacity:.85}to{opacity:0}}
@media (prefers-reduced-motion:reduce){.grid::before,.grid::after{animation:none;opacity:.4}}
body.rm-graph .grid{background-image:
    linear-gradient(rgba(var(--ink),.09) 1px,transparent 1px),
    linear-gradient(90deg,rgba(var(--ink),.09) 1px,transparent 1px);
  background-size:26px 26px;background-position:12px 12px;
  -webkit-mask-image:none;mask-image:none}
body.rm-graph .grid::before,body.rm-graph .grid::after,
body.rm-black .grid::before,body.rm-black .grid::after{display:none}
body.rm-black .grid{display:none}
.rm-tg{position:fixed;top:14px;right:18px;z-index:200;display:flex;align-items:center;gap:6px;
  padding:6px 8px;border-radius:11px;background:rgba(16,18,22,.92);
  -webkit-backdrop-filter:blur(20px) saturate(1.3);backdrop-filter:blur(20px) saturate(1.3);
  box-shadow:inset 0 1px 0 rgba(var(--ink),.08), 0 12px 30px rgba(0,0,0,.4)}
.rm-tg i{font-style:normal;font-size:10.5px;font-weight:700;color:rgba(var(--ink),.9);padding:0 3px}
.rm-tg button{-webkit-appearance:none;appearance:none;border:0;cursor:pointer;font-family:var(--font);
  font-size:10.5px;font-weight:700;color:rgba(var(--ink),.55);background:rgba(var(--ink),.05);
  border-radius:7px;padding:4px 9px;box-shadow:inset 0 1px 0 rgba(var(--ink),.05)}
.rm-tg button.on{color:#0b0c10;background:rgba(235,238,248,.92)}
.rm-tg em{width:1px;height:16px;background:rgba(var(--ink),.16);margin:0 3px}
</style></head><body>
<div class="rm-tg">
  <i>Room</i><button data-rm="dots" class="on">Dots</button><button
    data-rm="graph">Graph</button><button data-rm="black">Black</button>
  <em></em>
  <i>View</i><button data-vw="phone" class="on">Phone</button><button data-vw="desk">Desktop</button>
</div>
<script>(function(){
  var tg=document.currentScript.previousElementSibling;
  function setRm(m){
    document.body.classList.remove('rm-graph','rm-black');
    if(m!=='dots')document.body.classList.add('rm-'+m);
    tg.querySelectorAll('button[data-rm]').forEach(function(b){b.classList.toggle('on',b.dataset.rm===m)});
    try{localStorage.setItem('ar-room',m)}catch(e){}
  }
  function setVw(v){
    document.body.classList.toggle('vw-desk',v==='desk');
    tg.querySelectorAll('button[data-vw]').forEach(function(b){b.classList.toggle('on',b.dataset.vw===v)});
    try{localStorage.setItem('ar-view',v)}catch(e){}
  }
  tg.addEventListener('click',function(e){
    var b=e.target.closest('button');if(!b)return;
    if(b.dataset.rm)setRm(b.dataset.rm);
    if(b.dataset.vw)setVw(b.dataset.vw);
  });
  var rm='dots',vw='phone';
  try{rm=localStorage.getItem('ar-room')||'dots';vw=localStorage.getItem('ar-view')||'phone'}catch(e){}
  setRm(rm);setVw(vw);
})();</script>
<div class="gal">
<h1>Action rework: the survivors</h1>
<p class="sub">The settled set, six screens: the opening three, the logic pair, and the universal layout.
The room is Points (toggle top right, with the desktop view).
<a href="map.html" style="color:rgba(235,238,248,.92);font-weight:600">The Action map</a>
&nbsp;&middot;&nbsp;
<a href="bg.html" style="color:rgba(235,238,248,.92);font-weight:600">The room: eleven backgrounds</a></p>
"""

def main():
    frags = sorted(FRAG.glob('*.html'), key=key_of)
    out = [HEAD]
    cur = None
    for f in frags:
        pre = re.match(r'([a-z]+)-', f.stem).group(1)
        sec = GROUP.get(pre, pre)
        if sec != cur:
            if cur is not None: out.append('</div></section>')
            t, d = SECTIONS.get(sec, (sec, ''))
            out.append(f'<section class="grp"><h2>{t}</h2><p>{d}</p><div class="wall">')
            cur = sec
        frag = f.read_text()
        frag = frag.replace('<section class="cell" data-k="' + f.stem + '"',
                            '<section class="cell" id="' + f.stem + '" data-k="' + f.stem + '"', 1)
        r = REACH.get(f.stem)
        if r:
            badge = '<p class="reach"><b>' + r[0] + '</b><span>' + r[1] + '</span></p>'
            i = frag.find('</h3>')
            if i != -1:
                frag = frag[:i+5] + badge + frag[i+5:]
        out.append(frag)
    if cur is not None: out.append('</div></section>')
    out.append('</div></body></html>')
    (ROOT / 'gallery.html').write_text('\n'.join(out))
    print(f'gallery.html assembled from {len(frags)} fragments')

if __name__ == '__main__':
    main()
