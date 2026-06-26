/* ===========================================================================
   17-journey.js  -  Two views that make the goal feel real over time:

   THE PATH (MementoPath): the climb from today's action up to your goal. Reads
   state.action.primaryAction.path (the AI-built horizon/milestone ladder) + the
   Neutron Star. Shows today as where you stand and the goal as the summit, so
   the daily move stops being a floating checkbox.

   YOUR STORY (MementoStory): every proof you have stacked, a scrollable timeline
   of state.proofEvents (actions, records, reflections, deep work, vivere). The
   receipts you can look back on when you doubt yourself.

   Both are self-contained overlays, client-side, zero AI cost. Additive.
   =========================================================================== */
(function () {
  'use strict';

  function esc2(s) {
    try { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); }
    catch (e) { return String(s == null ? '' : s); }
  }

  // ---- shared full-screen overlay ------------------------------------------
  function buildOverlay(id, titleText, sub) {
    var el = document.getElementById(id);
    if (el) { var h = el.querySelector('.jrny-head__title'); if (h) h.textContent = titleText; return el; }
    el = document.createElement('div');
    el.id = id; el.className = 'jrny-overlay'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="jrny-sheet" role="dialog" aria-label="' + esc2(titleText) + '">' +
        '<header class="jrny-head">' +
          '<span class="jrny-head__title">' + esc2(titleText) + '</span>' +
          '<button class="jrny-close" aria-label="Close">&#10005;</button>' +
        '</header>' +
        '<div class="jrny-body" id="' + id + 'Body"></div>' +
      '</div>';
    document.body.appendChild(el);
    el.querySelector('.jrny-close').addEventListener('click', function () { closeOverlay(el); });
    el.addEventListener('click', function (e) { if (e.target === el) closeOverlay(el); });
    return el;
  }
  function openOverlay(el) { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; var b = el.querySelector('.jrny-body'); if (b) b.scrollTop = 0; }
  function closeOverlay(el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  // rank a horizon by how far out it is, so the spine always runs furthest
  // (near the summit) down to "this week" (near today), whatever order the data
  // came in.
  function horizonRank(h) {
    h = String(h || '').toLowerCase();
    var mm = h.match(/\d+/); var n = mm ? parseInt(mm[0], 10) : 1;
    if (h.indexOf('today') !== -1 || h.indexOf('now') !== -1) return 0;
    if (h.indexOf('week') !== -1) return 1 + n * 0.1;
    if (h.indexOf('month') !== -1) return 10 + n;
    if (h.indexOf('quarter') !== -1) return 30 + n;
    if (h.indexOf('year') !== -1) return 100 + n;
    return 50;
  }

  function goalText() {
    try {
      var ns = state.clarity && state.clarity.answers && state.clarity.answers.neutronStar;
      if (!ns) return '';
      return typeof ns === 'string' ? ns : (ns.title || ns.statement || ns.goal || ns.oneThing || '');
    } catch (e) { return ''; }
  }

  // =========================================================================
  // THE PATH
  // =========================================================================
  var MementoPath = {
    open: function () {
      var el = buildOverlay('pathOverlay', 'Your path');
      var body = document.getElementById('pathOverlayBody');
      var pa = (state.action && state.action.primaryAction) || {};
      var path = Array.isArray(pa.path) ? pa.path : [];
      var goal = goalText();
      var cs = (typeof consistencyStats === 'function') ? consistencyStats() : { current: 0, total: 0 };

      var html = '<div class="path-intro">The climb from today, up to the one thing you are actually after. Every day you show up is one step.</div>';
      html += '<div class="path-summit"><div class="path-summit__eyebrow">The summit</div><div class="path-summit__goal">' + esc2(goal || 'Your one goal') + '</div></div>';
      html += '<div class="path-spine">';
      if (!path.length) {
        html += '<div class="path-node"><span class="path-node__dot"></span><div class="path-node__c"><div class="path-node__title">Your milestones appear here once your plan is built.</div></div></div>';
      } else {
        // sort furthest-first so the top sits under the summit and "this week"
        // lands just above today, regardless of how the data was ordered
        path.slice().sort(function (a, b) { return horizonRank(b.horizon) - horizonRank(a.horizon); }).forEach(function (m) {
          html += '<div class="path-node"><span class="path-node__dot"></span><div class="path-node__c">' +
            '<div class="path-node__horizon">' + esc2(m.horizon || '') + '</div>' +
            '<div class="path-node__title">' + esc2(m.milestone || '') + '</div>' +
            (m.bridge ? '<div class="path-node__bridge">' + esc2(m.bridge) + '</div>' : '') +
            '</div></div>';
        });
      }
      // today = where you stand right now (the glowing current step)
      html += '<div class="path-node path-node--now"><span class="path-node__dot"></span><div class="path-node__c">' +
        '<div class="path-node__horizon">You are here, today</div>' +
        '<div class="path-node__title">' + esc2(pa.title || 'Your daily move') + '</div>' +
        '<div class="path-node__bridge">' + (cs.total || 0) + ' day' + ((cs.total || 0) === 1 ? '' : 's') + ' in. This is where the climb actually happens, one move at a time.</div>' +
        '</div></div>';
      html += '</div>';
      body.innerHTML = html;
      openOverlay(el);
    }
  };

  // =========================================================================
  // YOUR STORY
  // =========================================================================
  var MOD_META = {
    action: { c: 'rgba(232,194,74,1)', label: 'Action' },
    streak: { c: 'rgba(52,211,153,1)', label: 'Consistency' },
    consistency: { c: 'rgba(52,211,153,1)', label: 'Consistency' },
    reflection: { c: 'rgba(125,200,255,1)', label: 'Reflection' },
    deepwork: { c: 'rgba(150,116,255,1)', label: 'Deep work' },
    vivere: { c: 'rgba(244,138,120,1)', label: 'Vivere' },
    mori: { c: 'rgba(206,192,255,1)', label: 'Mori' },
    clarity: { c: 'rgba(150,116,255,1)', label: 'Clarity' },
    '': { c: 'rgba(150,116,255,1)', label: 'Memento' }
  };
  function modMeta(m) { return MOD_META[m] || MOD_META['']; }
  function fmtDate(iso) {
    try { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return String(iso || ''); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch (e) { return String(iso || ''); }
  }
  function fmtMonth(iso) {
    try { var d = new Date(String(iso).slice(0, 10) + 'T00:00:00'); if (isNaN(d)) return ''; return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }

  var MementoStory = {
    open: function () {
      var el = buildOverlay('storyOverlay', 'Your story');
      var body = document.getElementById('storyOverlayBody');
      var evs = (Array.isArray(state.proofEvents) ? state.proofEvents.slice() : []);
      // skip purely-internal record writes from the visible story
      evs = evs.filter(function (e) { return e && e.type !== 'new-record'; });
      evs.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      var cs = (typeof consistencyStats === 'function') ? consistencyStats() : { current: 0, total: 0, longest: 0 };

      var html = '<div class="story-stats">' +
        '<div class="story-stat"><div class="story-stat__n">' + (cs.total || 0) + '</div><div class="story-stat__l">days shown up</div></div>' +
        '<div class="story-stat"><div class="story-stat__n">' + evs.length + '</div><div class="story-stat__l">moments logged</div></div>' +
        '<div class="story-stat"><div class="story-stat__n">' + (cs.longest || cs.current || 0) + '</div><div class="story-stat__l">best streak</div></div>' +
        '</div>';

      if (!evs.length) {
        html += '<div class="story-empty">Your story starts the first day you show up. Do today\'s move and the receipts begin stacking, right here.</div>';
      } else {
        html += '<div class="story-timeline">';
        var lastMonth = '';
        evs.forEach(function (e) {
          var mo = fmtMonth(e.iso);
          if (mo && mo !== lastMonth) { html += '<div class="story-month">' + esc2(mo) + '</div>'; lastMonth = mo; }
          var m = modMeta(e.module);
          var title = e.title || m.label || 'A moment';
          html += '<div class="story-item"><div class="story-item__rail"><span class="story-item__dot" style="background:' + m.c + '"></span></div>' +
            '<div class="story-item__c">' +
              '<div class="story-item__top"><span class="story-item__date">' + esc2(fmtDate(e.iso)) + '</span><span class="story-item__mod" style="color:' + m.c + '">' + esc2(m.label) + '</span></div>' +
              '<div class="story-item__title">' + esc2(title) + '</div>' +
              (e.text ? '<div class="story-item__text">' + esc2(e.text) + '</div>' : '') +
            '</div></div>';
        });
        html += '</div>';
      }
      body.innerHTML = html;
      openOverlay(el);
    }
  };

  window.MementoPath = MementoPath;
  window.MementoStory = MementoStory;
})();
