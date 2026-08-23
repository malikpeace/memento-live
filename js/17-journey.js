/* ===========================================================================
   17-journey.js — the Reflect tab (the evening close-the-day ritual).
   v1273: MementoPath + the standalone MementoStory overlay are DELETED
   (Malik: the Memento view covers that ground; their last doors died in
   v1272). The Reflect tab stays: Action's "Close the day" lands here, and
   its entries count as "something smaller" days in Consistency.
   =========================================================================== */

/* ============================================================
   TAB SURFACES (BOTTOM-BAR-PLAN.md, phase 1 stubs).
   renderPathTab / renderReflectTab are the bottom bar's Path and Reflect
   panels. Phase 1 ships quiet placeholders so the bar's routing is complete;
   phases 2 and 3 replace the bodies with the real road and the evening close.
   ============================================================ */
// step 9 (v1270): the in-progress close-the-day text survives a tab detour.
// renderReflectTab rebuilds its DOM on every activation, which silently ate
// the draft (the audit: phones invite exactly this detour mid-thought).
let _rfDraft = '';

function renderReflectTab() {
  try {
    const body = document.getElementById('reflectBody');
    if (!body) return;
    const E = (s) => { try { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s); } catch (e) { return ''; } };

    const todayISO = getTodayISO();
    const entries = (state.reflection && Array.isArray(state.reflection.entries)) ? state.reflection.entries : [];
    const todayEntry = entries.slice().reverse().find(en => en && en.iso === todayISO && en.closedDay);
    const done = (typeof actionDoneToday === 'function') ? actionDoneToday() : false;
    const dateLabel = (() => { try { return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }); } catch (e) { return ''; } })();

    // Templated prompt (zero AI, decision 4): names their actual day. Variant
    // rotates by date so it never feels like a stuck sign.
    const seed = parseInt(todayISO.replace(/-/g, ''), 10) || 0;
    const DONE_PROMPTS = [
      "What's worth remembering from today?",
      'What did today prove?',
      'What worked today that you should repeat?'
    ];
    const MISS_PROMPTS = [
      'What got in the way today?',
      'What made today heavy?',
      'What would make tomorrow easier?'
    ];
    const prompt = (done ? DONE_PROMPTS : MISS_PROMPTS)[seed % 3];

    // The story: every written day, newest first. Tonight (if sealed) leads.
    const past = entries.slice()
      .filter(en => en && String(en.text || '').trim() && !(en.iso === todayISO && en.closedDay))
      .sort((a, b) => String(b.iso || '').localeCompare(String(a.iso || '')));
    const dayCount = past.length + (todayEntry ? 1 : 0);
    const sealed = !!todayEntry;

    // Two faces, one natural scroll: the writing face fills the viewport, the
    // rail-timeline story lives one swipe below it (Malik: the timeline must be
    // BEHIND a swipe, not already on screen). Native scrolling IS the gesture.
    let h = '<div class="rf2' + (sealed ? ' rf2--sealed' : '') + '" id="rf2">';

    // ---- face 1: tonight (whisper writing) --------------------------------
    h += '<section class="rf2-write" id="rf2Write">';
    h += '<div class="rf2-date">' + E(dateLabel) + '</div>';
    if (sealed) {
      h += '<div class="rf2-q">' + E(prompt) + '</div>';
      h += '<div class="rf2-bigread">&ldquo;' + E(todayEntry.text || '') + '&rdquo;</div>';
      h += '<div class="rf2-floor"><span class="rf2-count">day closed</span><span class="rf2-sealedmark" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div>';
    } else {
      h += '<div class="rf2-q">' + E(prompt) + '</div>';
      h += '<textarea id="rfInput" class="rf2-input" rows="1" maxlength="500" placeholder="Write it here." aria-label="' + E(prompt) + '"></textarea>';
      h += '<div class="rf2-floor"><span class="rf2-count tabnum" id="rfCount">0 words</span><button type="button" id="rfSave" class="rf2-cta" disabled>Close the day</button></div>';
    }
    h += '<button type="button" class="rf2-hint" id="rfStoryOpen" aria-label="See your story">';
    h += '<span class="rf2-hint__bar" aria-hidden="true"></span>';
    h += '<span class="rf2-hint__label tabnum">your story' + (dayCount ? ' &middot; ' + dayCount + (dayCount === 1 ? ' day' : ' days') : '') + '</span>';
    h += '</button>';
    h += '</section>';

    // ---- face 2: the story (rail timeline) --------------------------------
    h += '<section class="rf2-story" id="rf2Story">';
    h += '<div class="rf2-story__head"><span class="rf2-story__title">Your story</span><span class="rf2-story__n tabnum">' + dayCount + (dayCount === 1 ? ' day' : ' days') + '</span></div>';
    if (dayCount) {
      h += '<div class="rf2-rail">';
      h += '<div class="rf2-rail__line" aria-hidden="true"></div>';
      h += '<div class="rf2-rail__col">';
      if (todayEntry) {
        h += '<div class="rf2-en rf2-en--tonight"><div class="rf2-en__date tabnum">Tonight</div><div class="rf2-en__text">' + E(String(todayEntry.text || '').slice(0, 220)) + '</div></div>';
      }
      past.slice(0, 30).forEach(en => {
        h += '<div class="rf2-en"><div class="rf2-en__date tabnum">' + E(en.date || en.iso || '') + '</div><div class="rf2-en__text">' + E(String(en.text).slice(0, 220)) + '</div></div>';
      });
      h += '</div></div>';
    } else {
      h += '<div class="rf2-empty">Your first line tonight starts it.</div>';
    }
    h += '<button type="button" id="rfWriteBack" class="rf2-back">' + (sealed ? 'tonight is sealed' : 'swipe down to write') + '</button>';
    h += '<button type="button" id="rfAllNotes" class="rf2-notes-link">All notes</button>';
    h += '</section>';
    h += '</div>';
    body.innerHTML = h;

    const panel = body.closest('.tab-panel');

    // --- bind: writing ---
    const input = document.getElementById('rfInput');
    const save = document.getElementById('rfSave');
    const count = document.getElementById('rfCount');
    // v877: the write box gets the KeyboardPin pan-preventer (same as the
    // Action intake) so tapping it never jumps the screen.
    try {
      if (typeof KeyboardPin !== 'undefined' && panel && getComputedStyle(panel).position === 'fixed') {
        KeyboardPin.auto(panel);
      }
    } catch (e) {}
    if (input && save) {
      const grow = () => { input.style.height = 'auto'; input.style.height = input.scrollHeight + 'px'; };
      input.addEventListener('input', () => {
        _rfDraft = input.value;
        save.disabled = !input.value.trim();
        if (count) {
          const n = input.value.trim() ? input.value.trim().split(/\s+/).length : 0;
          count.textContent = n + (n === 1 ? ' word' : ' words');
        }
        grow();
      });
      // the detour comes home: restore the draft the rebuild would have eaten
      if (_rfDraft && !input.value) {
        input.value = _rfDraft;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      grow();
      save.addEventListener('click', () => {
        const v = input.value.trim();
        if (!v || save.disabled) return;
        // the double-tap guard (the audit's finding 13): the first tap owns
        // the day; a second tap, double-fire, or re-entry writes nothing.
        save.disabled = true;
        try {
          if (!state.reflection) state.reflection = {};
          if (!Array.isArray(state.reflection.entries)) state.reflection.entries = [];
          const already = state.reflection.entries.some(e => e && e.iso === todayISO && e.closedDay);
          if (already) { _rfDraft = ''; renderReflectTab(); return; }
          state.reflection.entries.push({
            date: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            iso: todayISO,
            text: v,
            closedDay: true
          });
          try { writeProofEvent('reflection-save', { title: 'Closed the day', text: v.slice(0, 140), module: 'reflection', dedupeKey: 'close-' + todayISO }); } catch (e) {}
          persistNow();
        } catch (e) {}
        _rfDraft = '';
        renderReflectTab();
      });
    }

    // --- bind: faces (tap complements the natural swipe/scroll) ---
    const story = document.getElementById('rf2Story');
    const hint = document.getElementById('rfStoryOpen');
    if (hint && story && panel) hint.addEventListener('click', () => {
      const top = story.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
      panel.scrollTo({ top: top, behavior: 'smooth' });
    });
    const back = document.getElementById('rfWriteBack');
    if (back && panel) back.addEventListener('click', () => { panel.scrollTo({ top: 0, behavior: 'smooth' }); });
    const allNotes = document.getElementById('rfAllNotes');
    if (allNotes) allNotes.addEventListener('click', () => {
      try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection'); } catch (e) {}
    });
  } catch (e) {}
}
