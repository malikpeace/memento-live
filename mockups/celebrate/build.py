#!/usr/bin/env python3
"""Assembles frag/*.html into browsable gallery pages.
Run:  python3 build.py            (after manifest.json exists)
The fragments are written by the workflow agents; this file owns the shell,
the accent switcher and the page structure so no agent has to."""
import json, os, glob, html, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FRAG = os.path.join(HERE, 'frag')

ACCENTS = [('cyan','#2bd4d4'),('green','#3fd94e'),('amber','#ffb73d'),
           ('rose','#ff6b9d'),('blue','#4f8cff'),('teal','#19c3a6')]

PAGES = [
  ('quantity-up',   'qu', 'Quantity up',   'A number rising. 100 paying users, $10k a month, or just "grow my audience" with no target at all. The hard case here is the goal with no number to divide, where a percentage does not exist and the win has to be the fact itself.'),
  ('quantity-down', 'qd', 'Quantity down', 'A number falling. Lose 20 lbs, pay off $8,000, screen time under an hour. The most emotionally loaded type in the set, so the voice stays matter of fact and never coaches at them.'),
  ('frequency',     'fr', 'Frequency',     'A rate of behaviour. Run 4x a week, write daily. Frequency is tolerant by definition, so a missed week is not a broken goal and none of these build streak-loss anxiety.'),
  ('maintenance',   'mt', 'Maintenance',   'A line held. Stay sober, keep under 180, a no-buy year. The design problem: celebrating a long run makes a future break hurt more, so days held are framed as deposits already banked, never as a tower that can fall.'),
  ('milestone',     'ms', 'Milestone',     'A binary event. Pass the bar, get the job, ship it. No partial credit, so these can be the boldest screens in the set. One of them celebrates the engine underneath before the event even lands.'),
  ('big-ass',       'ba', 'BIG ASS CELEBRATIONS', 'The grand finale, the top of the reward pyramid: what fires the day someone reaches their MASSIVE goal. Five full options to pick from, every one driven by the same sliders across all four goal shapes that can finish (target hit, count done, duration held, event done). The Memento itself takes part: sealed, remembering, or wearing the colour. Fires ONCE, outranks everything, and the day it fires nothing else shows.'),
  ('open',          'op', 'Open',          'PARKED for now (decided 2026-08-09): these have no honest trigger yet. They would fire only when the AI notices a real shift in their own reflections, a feature that does not exist. The screens stay as reference for that day. Cadence, per Malik 2026-08-10: the then-vs-now moment fires first at day 30 (not 90), and per Malik 2026-08-13 day rungs now come every 7 days (weekly rhythm, chooser.js), so nobody waits a year to see one.'),
  ('refinements',   'rf', 'The three you picked', 'The Gap, The Fall and The Record, rebuilt properly: three beats, tap to advance, the accent driven by their chosen Memento colour, a deposit line, and the M where it earns its place. (The Card Takes It was cut 2026-08-13; its instinct, the Memento owning the moment, lives in the BIG ASS CELEBRATIONS family now.)'),
]

# Malik's review verdicts (2026-08-10), rendered as a badge on every screen so
# a glance answers "did I approve this?". green = liked (his requested tweaks
# applied); yellow = changed since his review, ungraded, or lukewarm; red = he
# said no. Update when he re-grades.
VERDICTS = {
  # quantity up (2026-08-10 round two): 1 liked, passed posts now step taller;
  # 2-3 liked; 4 REMOVED at his ask (fragment deleted); 5 kept, he likes the
  # record board as long as the chooser only fires it on a real record (L8)
  'qu-1':'y','qu-2':'g','qu-3':'g','qu-5':'g',
  # quantity down: 1 rebuilt AGAIN as the horizontal slider he described;
  # 2 rebuilt around one concrete case (drinks/week) after "vague"; 3 he
  # likes a lot + his exact line added; 4 great; 5 good
  'qd-1':'y','qd-2':'y','qd-3':'g','qd-4':'g','qd-5':'g',
  # frequency: 3 now says "Total runs" per his note, otherwise approved
  'fr-1':'g','fr-2':'g','fr-3':'g','fr-4':'g','fr-5':'g',
  # maintenance: 3 approved IF hard days are really logged (open product
  # question); 5 deleted at his ask
  'mt-1':'g','mt-2':'g','mt-3':'g','mt-4':'g',
  # milestone: ms-4 (the fork) CUT 2026-08-14 ('feels mid, not a milestone');
  # the rest approved, ms-2/ms-3/ms-5 re-tuned to his 2026-08-14 notes
  'ms-1':'g','ms-2':'g','ms-3':'g','ms-5':'g',
  # open: 1 fine but must fire earlier than 90 days (chooser cadence);
  # 3 changed completely (one move + the count); 4 given receipts; 5 loved
  # but needs earlier rungs than a year
  # 2026-08-13 rig grades: op-1 good, op-2/5 good (relayout applied), op-3
  # REJECTED (cut from the rig), op-4 fine ('simple, probably rare')
  'op-1':'g','op-2':'g','op-3':'r','op-4':'g','op-5':'g',
  # rf-gap/rf-fall: approved 2026-08-13 after his fixes landed (gap: 'gone,
  # of the X.' + 'Y to go.'; fall: 'left of X' under the number, carry
  # sentence removed)
  'rf-gap':'g','rf-fall':'g','rf-rec':'g',  # rf-card CUT 2026-08-13 (folded into the grand finale)
  # BIG ASS CELEBRATIONS: built 2026-08-13 at his ask, ungraded, needs his eyes
  'ba-1':'y','ba-2':'y','ba-3':'y','ba-4':'y','ba-5':'y',
  # evolution: the whole family REMOVED at his ask 2026-08-13 (page deleted)
}
BADGE = {
  'g': '<span class="vd vd--g" title="Approved by Malik">&#128077;</span>',
  'y': '<span class="vd vd--y" title="Changed since review / ungraded — needs your eyes">!</span>',
  'r': '<span class="vd vd--r" title="Malik said no">&#10005;</span>',
}

def frag(key):
    p = os.path.join(FRAG, key + '.html')
    if not os.path.exists(p): return None
    return open(p, encoding='utf-8').read()

def shell(title, body, back=True):
    sw = ''.join('<button data-a="%s" style="background:%s"%s></button>' % (n,c,' class="on"' if n=='cyan' else '') for n,c in ACCENTS)
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<link rel="stylesheet" href="_kit.css?v=tw7">
</head><body data-accent="cyan">
<div class="bar">
  {'<a href="index.html" style="color:var(--text-mid);text-decoration:none;font-size:13px;font-weight:600">&lsaquo; All</a>' if back else ''}
  <span class="bar__t">{html.escape(title)}</span>
  <span class="sw">{sw}</span>
  <span class="bar__n">their Memento colour drives every screen &middot; <b>tap a phone to advance or replay</b></span>
</div>
{body}
<script src="chooser.js?v=tw7"></script><script src="_kit.js?v=tw7"></script><script src="_tweaks.js?v=tw7"></script>
<script>CEL.init(); if (window.CEL_TWEAKS) CEL_TWEAKS.init();</script>
</body></html>"""

def main():
    mpath = os.path.join(HERE, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'jobs': []}
    by_prefix = {}
    for j in man.get('jobs', []):
        by_prefix.setdefault(j['job'], []).extend(j.get('concepts', []))
    # the evolution page merges two agents' output
    by_prefix.setdefault('ev', [])
    by_prefix['ev'] = by_prefix.get('ev', []) + by_prefix.get('ex', [])

    made = []
    for slug, pref, title, blurb in PAGES:
        cons = by_prefix.get(pref, [])
        if not cons:
            # fall back to whatever fragments exist on disk with this prefix
            keys = sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(FRAG, pref + '-*.html')))
            if pref == 'ev':
                keys += sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(FRAG, 'ex-*.html')))
            cons = [{'key': k, 'name': k, 'note': ''} for k in keys]
        items = []
        i = 0
        for c in cons:
            f = frag(c['key'])
            if not f: continue
            i += 1
            badge = BADGE.get(VERDICTS.get(c['key'], ''), '')
            items.append(
              '<div class="item"><p class="item__label"><span class="item__n">%d</span>'
              '<span class="item__name">%s</span>%s</p>%s<p class="item__note">%s</p></div>'
              % (i, html.escape(c.get('name') or c['key']), badge, f, c.get('note') or ''))
        if not items: continue
        body = ('<div class="gal"><h1>%s</h1><p class="gal__sub">%s</p><div class="grid">%s</div></div>'
                % (html.escape(title), blurb, ''.join(items)))
        open(os.path.join(HERE, slug + '.html'), 'w', encoding='utf-8').write(shell(title, body))
        made.append((slug, title, blurb, len(items)))

    total = sum(n for _,_,_,n in made)
    # the two special surfaces ride FIRST so Malik cannot miss them
    made.insert(0, ('daily', 'THE DAILY REWARD: you showed up', 'The everyday hit (fires when you complete your action): a full green confirmation screen that replaces the plain green flash. The count never falls. Eight directions for the reward seen EVERY day, the layer between the green flash and the rare milestone ceremony.', 6))
    made.insert(0, ('field-test', 'FIELD TEST: fuck with the values', 'YOUR sliders. Change start / goal / today / days / weeks and watch the road, the big count, the day ladder, the record grid, week chips and open receipts re-lay themselves through the REAL chooser logic, with a line saying when a ceremony fires vs stays silent.', 6))
    cards = ''.join(
      '<a class="item" style="text-decoration:none;display:block" href="%s.html">'
      '<div style="padding:20px;border-radius:16px;background:rgba(var(--ink),.05);'
      'box-shadow:inset 0 1px 0 rgba(var(--ink),.06)">'
      '<div style="font-size:17px;font-weight:700;letter-spacing:-.015em;color:var(--text-hi)">%s</div>'
      '<div style="font-size:12px;color:var(--accent);font-weight:650;margin-top:5px">%d screens</div>'
      '<div style="font-size:13px;color:var(--text-mid);line-height:1.5;margin-top:9px">%s</div>'
      '</div></a>' % (s, html.escape(t), n, b) for s, t, b, n in made)
    body = ('<div class="gal"><h1>Celebrations, every goal type</h1>'
            '<p class="gal__sub">%d screens. Memento sorts every goal into six types, and each type needs a different '
            'answer to "what did you just do". Every screen here obeys one contract: three beats (the fact, what it cost, '
            'the plain line that goes into your Memento), tap to advance, never auto-dismisses, and exactly one moment of '
            'colour driven by whichever Memento colour they picked. Use the swatches at the top of any page to see that '
            'working. Nothing here is in the app.</p><div class="grid">%s</div></div>' % (total, cards))
    open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(shell('Celebrations, every goal type', body, back=False))
    print('built %d pages, %d screens' % (len(made)+1, total))

main()
