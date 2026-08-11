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
  %s
</div>
<script>%s</script>
</body></html>""" % (len(sections), SHELL_CSS, '\n'.join(styles), len(sections),
                     ''.join(toc), ''.join(sections), DRIVER)

    open(os.path.join(HERE, 'daily.html'), 'w', encoding='utf-8').write(page)
    print('built daily.html with %d concepts (%d phones)' % (len(sections), len(sections) * 3))


build()
