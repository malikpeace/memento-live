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


LIVE_CSS = """
/* the global control bar that drives every screen */
.dlbar{position:sticky;top:47px;z-index:55;display:flex;flex-wrap:wrap;align-items:center;gap:14px 26px;
  padding:13px 20px;background:rgba(10,11,13,.94);
  -webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-bottom:1px solid var(--hairline)}
.dlbar label{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--text-mid)}
.dlbar input[type=range]{width:180px;accent-color:var(--day)}
.dlbar b{font-size:12.5px;font-weight:700;color:var(--text-hi);font-variant-numeric:tabular-nums;min-width:36px}
.dlbar select{background:rgba(var(--ink),.08);color:var(--text-hi);border:0;border-radius:8px;padding:7px 9px;font:600 12.5px/1 var(--font)}
.dl-presets{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
.dl-presets button{-webkit-appearance:none;appearance:none;border:0;cursor:pointer;font:650 11.5px/1 var(--font);
  color:var(--text-mid);background:rgba(var(--ink),.07);padding:8px 11px;border-radius:8px}
.dl-presets button:active{background:rgba(var(--ink),.14)}

/* live phones sit two or three across */
.livegrid{display:flex;flex-wrap:wrap;gap:30px 26px}
.concept--live{width:390px;max-width:100%;margin:0;border-top:0;padding-top:0}
.concept--live .concept__hd{margin-bottom:10px}

/* shared bits the live renderers use */
.ph[data-c] .dl-warm{position:absolute;left:50%;top:44%;width:320px;height:320px;transform:translate(-50%,-50%);
  border-radius:50%;pointer-events:none;filter:blur(3px);z-index:0}
.ph[data-c] .dst > *{position:relative;z-index:1}
.dl-n{font-variant-numeric:tabular-nums;font-weight:750;letter-spacing:-.04em;font-size:58px;color:var(--text-hi);margin-top:26px;line-height:1}
.dl-u{font-size:14.5px;color:var(--text-mid);margin-top:11px}
.dl-more{font-size:12px;color:var(--text-lo);margin-top:9px}
.fld-dot--now{fill:var(--day)!important}
.tp-d--now{background:var(--day)!important}
.tk-s--now{background:var(--day)!important}

/* live phones render the SETTLED state; entrance fires only on tap (.on).
   force every fragment's opacity-0 base and per-item animation off while live. */
.ph.live .dst *{opacity:1!important;animation:none!important}
.ph.live .dl-warm{z-index:0!important}

@media (max-width:900px){ .concept--live{display:block;width:100%;margin-right:0} }
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
        # LIVE: one phone per concept, generated from the sliders by
        # _daily-live.js. The fragment's own <style> is still included (its
        # classes are reused), but the three static states are dropped.
        rid = 'row-' + c['key']
        toc.append('<a href="#%s">%d. %s</a>' % (rid, i, html.escape(c['name'])))
        sections.append(
            '<section class="concept concept--live" id="%s">'
            '<div class="concept__hd"><span class="concept__n">%d</span>'
            '<span class="concept__t">%s</span></div>'
            '<div class="ph live" data-c="%s"><div class="dst"></div>'
            '<div class="hint">tap to play the motion</div></div></section>'
            % (rid, i, html.escape(c['name']), c['key'])
        )

    page = """<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The daily reward, %d directions</title>
<style>%s</style>
<style>%s</style>
<style>__LIVECSS__</style>
</head><body>
<div class="bar">
  <a href="index.html">&lsaquo; All</a>
  <span class="bar__t">The daily reward</span>
  <span class="bar__n">green = consistency &middot; quiet, seen every day &middot; <b>drag the sliders, they drive every screen</b></span>
</div>
<div class="dlbar" id="dlbar">
  <label><span>Total actions</span><input type="range" id="dlTotal" min="1" max="365" value="30"><b id="dlTotalOut">30</b></label>
  <label><span>Recent consistency</span><input type="range" id="dlCons" min="5" max="100" value="70"><b id="dlConsOut">70%%</b></label>
  <label class="dl-seg"><span>Cadence</span><select id="dlCad"><option value="daily">daily goal (moves)</option><option value="freq">3x a week (sessions)</option><option value="maint">maintenance (days)</option></select></label>
  <span class="dl-presets"><button data-preset="1,100" type="button">Day 1</button><button data-preset="7,85" type="button">Week 1</button><button data-preset="30,70" type="button">Month 1</button><button data-preset="120,45" type="button">Inconsistent</button><button data-preset="300,90" type="button">Long haul</button></span>
</div>
<div class="wrap">
  <h1>The daily reward, %d directions</h1>
  <p class="lede">The everyday hit, fired the moment someone completes their action. Not a milestone: <b>no confetti, no colour flood</b>, green rather than their Memento colour, quiet enough to see <b>every day for a year</b>. It counts <b>actions completed</b>, not calendar days, so a person who shows up three times a week is never told they missed four.</p>
  <p class="lede">Everything below is <b>live</b>. The sliders at the top drive all %d screens at once, so you can see any of them at 1 action or 300, and at any consistency. Recent momentum shows as <b>warmth</b>, present when you are showing up, faint when you are away, never a miss count. Tap a phone to play its motion.</p>
  <div class="toc">%s</div>
  <div class="livegrid">%s</div>
</div>
<script>%s</script>
<script src="_daily-live.js?v=live1"></script>
</body></html>""" % (len(sections), SHELL_CSS, '\n'.join(styles), len(sections), len(sections),
                     ''.join(toc), ''.join(sections), DRIVER)

    page = page.replace('__LIVECSS__', LIVE_CSS)

    open(os.path.join(HERE, 'daily.html'), 'w', encoding='utf-8').write(page)
    print('built daily.html with %d live concepts' % len(sections))


build()
