#!/usr/bin/env python3
"""Assemble mockups/action-rework/frag/*.html into gallery.html.
Order: ob, q, ld, lp, mx. Each fragment is a self-scoped <section>."""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
FRAG = ROOT / 'frag'
ORDER = ['ob', 'q', 'ld', 'pu', 'lp', 'mx']
TITLES = {
    'ob': ('Onboarding', 'The wall of intent, the one onboarding screen. No forms, just the goal made real.'),
    'q':  ('The refine step', 'What is already done + what they think it takes. One question at a time.'),
    'ld': ('Loading', 'The plan being produced. The wait as visible work, never a spinner, never an invented stage name.'),
    'pu': ('The pulse', 'Where are you now: the one screen where the goal number gets written. Clarity shows the standing, Consistency the trajectory; Action only hosts the pen.'),
    'lp': ('The daily loop', 'Thirteen layout architectures. Number slots any goal can fill.'),
    'mx': ('Intensity mechanics', 'Ways to scale today up or down, phone + desktop each. Three named sizes in front, freedom behind a quiet "more".'),
}

# REACH x FREQUENCY: Malik's ask. How many people see this screen, how often.
# 10 = literally everyone. Notes carry the nuance where stakes beat frequency.
REACH = {
    'ob-1': ('10/10', 'everyone, their first minute'),
    'q-2':  ('10/10', 'everyone, before every plan'),
    'ld-4': ('10/10', 'everyone, every plan build'),
    'pu-1': ('9/10',  'most goals, weekly or better'),
    'lp-1': ('9/10',  'money, audience, job hunt, project: the biggest buckets, daily'),
    'lp-9': ('8/10',  'weight is a giant bucket, daily ritual'),
    'lp-18':('8/10',  'quitting, daily, highest emotional stakes'),
    'lp-7': ('7/10',  'screen time, nightly'),
    'lp-12':('7/10',  'gym and posting rhythms, most days'),
    'lp-10':('7/10',  'school, projects, race blocks, daily'),
    'lp-6': ('6/10',  'weight and debt, the alternative book'),
    'lp-17':('6/10',  'screen time, the alternative ceiling'),
    'lp-15':('6/10',  'runs and study blocks'),
    'lp-22':('6/10',  'seen once per goal, but it is the best minute: stakes over frequency'),
    'lp-8': ('5/10',  'saving and unit milestones'),
    'lp-16':('4/10',  'maintenance, the rarest daily shape'),
    'lp-21':('3/10',  'open practice, rare by design'),
    'mx-8': ('9/10',  'the default intensity surface, every count goal'),
    'mx-1': ('8/10',  'the classic alternative, count goals'),
    'mx-2': ('6/10',  'session-length goals'),
    'mx-9': ('6/10',  'count goals, touch-first people'),
    'mx-5': ('5/10',  'count goals'),
    'mx-6': ('5/10',  'count goals'),
    'mx-7': ('5/10',  'count goals'),
    'mx-10':('4/10',  'desktop-first people'),
    'mx-11':('n/a',   'comparison variant only: dies once 3 vs 5 is settled'),
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
.gal{padding:26px 20px 140px;max-width:1780px;margin:0 auto}
.gal h1{font-size:26px;font-weight:700;letter-spacing:-.02em;margin:0 0 6px}
.gal>.sub{color:var(--text-mid);font-size:14px;margin:0 0 24px;max-width:78ch;line-height:1.55}
.grp{margin:44px 0 0;padding-top:26px;border-top:1px solid rgba(var(--ink),.16)}
.grp h2{font-size:19px;font-weight:700;margin:0 0 2px;letter-spacing:-.015em}
.grp>p{color:var(--text-mid);font-size:13px;margin:0 0 18px;max-width:76ch}
.wall{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
.cell{max-width:100%}
.cell h3{font-size:13px;font-weight:700;margin:0 0 2px}
.cell .cap{font-size:11.5px;color:var(--text-lo);margin:0 0 9px;max-width:300px;line-height:1.45;min-height:30px}
.cell:has(.desk) .cap{max-width:720px}
.ph{position:relative;width:300px;height:650px;border-radius:30px;overflow:hidden;background:#050608;
  box-shadow:0 24px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(var(--ink),.10)}
.desk{position:relative;width:720px;max-width:100%;height:420px;border-radius:14px;overflow:hidden;background:#050608;
  margin-top:16px;box-shadow:0 20px 50px rgba(0,0,0,.45), inset 0 0 0 1px rgba(var(--ink),.09)}
/* bucket labels + toggle (ACTION-BUCKETS.md): which of the seven big goals a screen serves */
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
.grid{position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(var(--ink),1) 1px,transparent 1px),
    linear-gradient(90deg,rgba(var(--ink),1) 1px,transparent 1px);
  background-size:26px 26px;opacity:.04}
</style></head><body><div class="gal">
<h1>Action rework: the survivors</h1>
<p class="sub">The graded set: the designs Malik kept, built out from mockup to something close to shippable.
Only the grid survived the teardown. Every intensity control now obeys the three-choice law, exactly three
proposed sizes in front, named and honestly priced, with full freedom behind a small quiet "more".
mx-11 is the deliberate counter-example: the same design carrying five.
<a href="map.html" style="color:rgba(235,238,248,.92);font-weight:600">Open the Action map: every bucket's path to its screens</a></p>
"""

def main():
    frags = sorted(FRAG.glob('*.html'), key=key_of)
    out = [HEAD]
    cur = None
    for f in frags:
        pre = re.match(r'([a-z]+)-', f.stem).group(1)
        if pre != cur:
            if cur is not None: out.append('</div></section>')
            t, d = TITLES.get(pre, (pre, ''))
            out.append(f'<section class="grp"><h2>{t}</h2><p>{d}</p><div class="wall">')
            cur = pre
        frag = f.read_text()
        # anchor: the fragment's data-k becomes a real id for deep links
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
