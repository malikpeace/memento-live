#!/usr/bin/env python3
"""Beauty-pass viewer: only the mx-* fragments this chat owns, one per screen block."""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).parent
FRAG = ROOT / 'frag'
KEYS = ['mx-1','mx-2','mx-5','mx-6','mx-7','mx-8','mx-9','mx-10','mx-11']
if len(sys.argv) > 1: KEYS = sys.argv[1:]
HEAD = open(ROOT/'build.py').read().split('HEAD = """',1)[1].split('"""',1)[0]
head = HEAD.split('<h1>')[0].replace('<div class="gal">','<div class="gal" style="padding:8px 20px 40px">')
head += ('<style>.cell{display:grid;grid-template-columns:300px 720px;gap:24px;align-items:start}'
         '.cell h3,.cell .cap,.cell .bk,.cell .reach{grid-column:1/-1}'
         '.cell .cap{max-width:1044px;min-height:0}.desk{margin-top:0}</style>')
out = [head]
out.append('<section class="grp" style="margin:0;padding:0;border:0"><div class="wall" style="gap:40px">')
for k in KEYS:
    p = FRAG / (k + '.html')
    if p.exists(): out.append(p.read_text())
out.append('</div></section></div></body></html>')
(ROOT/'mine.html').write_text('\n'.join(out))
print('mine.html:', ', '.join(KEYS))
