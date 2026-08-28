/* Memento module: Clarity full-screen experience + wizard
   Extracted from app.js lines 2126-8309. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   CLARITY FULL-SCREEN EXPERIENCE
   ============================================ */
// The Action spine: one generated mission owns its own receipts. Plans are
// replaced when Doors advance, so a lazily-stamped id naturally stays with the
// old plan while the new plan receives a fresh id. Legacy receipts without an
// id still match when their saved plan title and action text belong to the
// current plan.
function ensureActionMissionId(primaryAction) {
  const pa = primaryAction || (state.action && state.action.primaryAction);
  if (!pa || typeof pa !== 'object') return '';
  const hasMission = !!(pa.title || pa.howToStart || (pa.tiers && Object.keys(pa.tiers).length));
  if (!hasMission) return '';
  if (!pa.missionId) {
    pa.missionId = 'mission_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  return pa.missionId;
}

function actionMissionTexts(primaryAction) {
  const pa = primaryAction || {};
  const texts = [];
  if (pa.title) texts.push(String(pa.title).trim());
  if (pa.howToStart) texts.push(String(pa.howToStart).trim());
  if (pa.tiers && typeof pa.tiers === 'object') {
    Object.keys(pa.tiers).forEach(k => { if (pa.tiers[k]) texts.push(String(pa.tiers[k]).trim()); });
  }
  return texts.filter(Boolean);
}

function actionCompletionMatchesMission(entry, primaryAction) {
  if (!entry) return false;
  // merge 3.1 (v1197): the NEW Action flow writes missionId 'plan_<starHash>'
  // with no legacy primaryAction behind it. A plan-flow record matches when
  // it belongs to the LIVE plan, so the home recognises a completed day.
  if (entry.missionId && String(entry.missionId).indexOf('plan_') === 0) {
    const ap = state.actionPlan;
    return !!(ap && ap.starHash && entry.missionId === 'plan_' + ap.starHash);
  }
  const pa = primaryAction || (state.action && state.action.primaryAction) || {};
  const missionId = ensureActionMissionId(pa);
  if (!missionId) return false;
  if (entry.missionId) return entry.missionId === missionId;
  // Backward compatibility for receipts saved before mission ids existed.
  const samePlan = !!(entry.planTitle && pa.title && String(entry.planTitle).trim() === String(pa.title).trim());
  const savedText = String(entry.actionText || '').trim();
  return samePlan && !!savedText && actionMissionTexts(pa).indexOf(savedText) >= 0;
}

function actionCompletionForDay(day, primaryAction) {
  // v1004: ONE day boundary. Every caller passes today; the loop and the
  // ledger key days at 4am (a 1am session belongs to the evening before),
  // while this function compared at midnight, so between 00:00 and 04:00 the
  // home card and the Action page disagreed about whether today was done.
  // Both sides now compare in 4am action-day space. The day param is kept for
  // signature stability and used only as a calendar-today check.
  const key = actionDayKey(new Date());
  const history = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry && entry.date && actionDayKey(new Date(entry.date)) === key && actionCompletionMatchesMission(entry, primaryAction)) return entry;
  }
  return null;
}

function createActionCompletionRecord(primaryAction, tier, actionText) {
  const pa = primaryAction || (state.action && state.action.primaryAction) || {};
  const record = {
    id: 'act_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    missionId: ensureActionMissionId(pa),
    clarityGoal: (state.action && state.action.planSourceNeutronStar) || (state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) || '',
    date: new Date().toISOString(),
    tier: tier || 'moderate',
    actionText: actionText || '',
    planTitle: pa.title || ''
  };
  setTimeout(function () {
    try {
      if (window.PolarBilling && PolarBilling.recordActionCompletion) {
        PolarBilling.recordActionCompletion(record);
      }
    } catch (e) {}
  }, 0);
  return record;
}

/* ---- The offering ledger (v1003, Action v2 Phase A) -----------------------
   One row per CLOSED day, misses included. This is the memory that lets the
   AI tell "working" from "grinding": completionHistory alone records only
   successes, so a 6-day gap was literally nothing. The ledger makes a miss a
   fact with a date.

   Design: ONE writer. Days seal on the first open after they end (4am
   boundary); today is never in the ledger, it is live in completionHistory.
   Four different code paths push completions, and deriving sealed rows from
   completionHistory afterwards means none of them can drift from the ledger.
   Rows for days with a completion carry the exact text that was credited
   (the truth after v1002); missed days carry the standing move as a best
   effort, marked source:'standing'. */
function actionDayKey(d) {
  const t = d instanceof Date ? d : new Date(d || Date.now());
  return isoToLocalDay(new Date(t.getTime() - 4 * 3600 * 1000).toISOString());
}
function actionLedgerBackfill() {
  try {
    if (!state.action || !state.action.planGenerated) return;
    const pa = state.action.primaryAction || {};
    if (!pa.title && !(pa.tiers && pa.tiers.moderate)) return;
    if (!Array.isArray(state.action.ledger)) state.action.ledger = [];
    const ledger = state.action.ledger;
    const today = actionDayKey(new Date());
    const TK = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];

    // completions grouped by 4am day key
    const hist = Array.isArray(state.action.completionHistory) ? state.action.completionHistory : [];
    const doneBy = {};
    for (const h of hist) { if (h && h.date) doneBy[actionDayKey(new Date(h.date))] = h; }

    // Anchor: the day after the last sealed row, else the earliest completion.
    // A user with no completions yet has no history to seal; their first
    // sealed rows appear once day one has been kept or missed AFTER activity
    // exists, so a fresh plan never backfills phantom misses.
    let startKey = null;
    if (ledger.length) {
      const last = ledger[ledger.length - 1].day;
      const d = new Date(last + 'T12:00:00'); d.setDate(d.getDate() + 1);
      startKey = isoToLocalDay(d.toISOString());
    } else if (hist.length) {
      startKey = actionDayKey(new Date(hist[0].date));
    }
    if (!startKey || startKey >= today) return;

    const sealed = new Set(ledger.map(r => r.day));
    const cur = new Date(startKey + 'T12:00:00');
    let guard = 0;
    while (guard++ < 180) {
      const key = isoToLocalDay(cur.toISOString());
      if (key >= today) break;
      if (!sealed.has(key)) {
        const done = doneBy[key];
        const tier = done ? (done.tier || 'moderate')
          : (TK.indexOf(state.action.selectedTier) >= 0 ? state.action.selectedTier : (pa.recommendedTier || 'moderate'));
        // A credited text that matches no tier was a chained next action.
        const tierTexts = pa.tiers ? Object.values(pa.tiers).map(t => String(t || '').trim()) : [];
        const wasChained = !!(done && done.actionText && tierTexts.indexOf(String(done.actionText).trim()) < 0);
        ledger.push({
          day: key,
          missionId: (done && done.missionId) || pa.missionId || '',
          offered: done ? (done.actionText || '') : ((pa.tiers && pa.tiers[tier]) || pa.title || ''),
          offeredRung: TK.indexOf(tier) + 1 || 3,
          source: wasChained ? 'chained' : 'standing',
          outcome: done ? 'done' : 'missed',
          reason: '',
          note: (done && done.note) || '',
          ts: Date.now()
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    // Bound it: ~13 months of daily rows is plenty for any decision.
    if (ledger.length > 400) ledger.splice(0, ledger.length - 400);
    try { persistNow(); } catch (e) {}
  } catch (e) {}
}

const ClarityExperience = {
  el: null, pageWrap: null, navEl: null, progressEl: null,
  isOpen: false,
  currentPage: 0,
  totalTutorialPages: 7,
  transitioning: false,

  init() {
    this.el = document.getElementById('clarityExp');
    this.pageWrap = document.getElementById('clarityExpPageWrap');
    this.navEl = document.getElementById('clarityExpNav');
    this.progressEl = document.getElementById('clarityExpProgress');
    // v558 (Malik): the progress bar moves WITH the scrolling content instead of
    // sitting locked over it, sliding up + fading as the page scrolls (the top mask
    // on the page-wrap fades the content itself).
    this.pageWrap.addEventListener('scroll', () => {
      if (!this.progressEl) return;
      const st = this.pageWrap.scrollTop || 0;
      this.progressEl.style.transform = 'translateY(' + (-Math.min(st, 90)) + 'px)';
      this.progressEl.style.opacity = String(Math.max(0, 1 - st / 60));
    }, { passive: true });
    const closeBtn = document.getElementById('clarityExpClose');
    const closeNow = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      }
      // If the neutron star scene is zoomed in (summary card view), the X
      // should just zoom OUT to the star - don't yank the user all the way
      // back to the dashboard.
      const scene = document.getElementById('nsScene');
      if (scene && scene.classList.contains('ns-star-scene--zoomed')) {
        scene.classList.remove('ns-star-scene--zoomed');
        return;
      }
      exitToModules('clarity');
    };
    if (closeBtn) {
      closeBtn.addEventListener('click', closeNow);
      closeBtn.addEventListener('pointerdown', closeNow);
      closeBtn.addEventListener('mouseup', closeNow);
      closeBtn.addEventListener('touchend', closeNow, { passive: false });
    }
    if (this.el) {
      this.el.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('#clarityExpClose')) closeNow(e);
      }, true);
      this.el.addEventListener('pointerdown', (e) => {
        if (e.target && e.target.closest && e.target.closest('#clarityExpClose')) closeNow(e);
      }, true);
    }
  },

  getTotalPages() {
    if (this.tutorialOnly) return this.totalTutorialPages;
    const skipTut = state.clarity.tutorialSeen;
    const wizSteps = getWizardSteps();
    return (skipTut ? 0 : this.totalTutorialPages) + wizSteps.length;
  },

  getWizardOffset() {
    return state.clarity.tutorialSeen ? 0 : this.totalTutorialPages;
  },

  open() {
    if (this.isOpen) return;
    // Free users get ONE full Clarity run. Starting a brand-new discovery (the
    // costly AI part) when they already have a finished Neutron Star and have not
    // paid is what we gate, so it rises the paywall instead. Viewing/continuing an
    // existing star stays free (the dashboard routes a completed star to
    // openSummary; a saved draft resumes below). Paid users redo freely.
    try {
      if (state.clarity.completed && typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) {
        ClarityPaywall.show();
        return;
      }
    } catch (e) {}
    // Force clean slate before opening
    this._forceReset();
    this.isOpen = true;
    FullscreenClose.show('clarity');
    const skipTut = state.clarity.tutorialSeen;

    // Check for saved draft progress
    const draft = state.clarity.draft;
    if (draft && !state.clarity.completed) {
      // Show resume prompt instead of auto-resuming
      this._showResumePrompt(draft, skipTut);
      return;
    }

    this.currentPage = 0;
    wizardStep = 0;
    wizardAnswers = {};
    // Reset AI state
    aiChatMessages = [];
    try { clarityEscalated = false; } catch (e) {}
    aiChatReady = false;
    aiChatProgress = null;
    aiChatLoading = false;
    aiSynthesisResult = null;
    aiSynthesisLoading = false;
    aiChatError = null;
    if (aiAbortController) { aiAbortController.abort(); aiAbortController = null; }
    // Pre-fill from existing answers if redoing
    if (state.clarity.completed && state.clarity.answers) {
      const a = state.clarity.answers;
      if (a.domains && a.domains.length) wizardAnswers.domains = a.domains;
    }
    // Seed from onboarding so Clarity continues from what they already told us,
    // instead of a blank start. Their diagnostic answers also reach the AI via
    // buildProfileContext; this pre-selects the area as a reversible default.
    try { if (!state.clarity.completed) this._seedFromOnboarding(); } catch (e) {}
    try { if (typeof Analytics !== 'undefined') Analytics.track('clarity_start'); } catch (e) {} // Funnel
    this._cinematicOpen();
  },

  // Seed the Clarity wizard from the onboarding diagnostic so the user does not
  // re-define things they already told us. Every seed is reversible (it pre-fills
  // a default the user can change) and is applied ONLY where the matching wizard
  // field is still empty, so a real pick is never overridden. We map onboarding
  // answers to the CLOSEST existing wizardAnswers field and skip anything without
  // a clean match (e.g. costOfInaction has no fear/cost field in this wizard, so
  // it is left for the AI which already receives it via buildProfileContext).
  _seedFromOnboarding() {
    const prof = (state && state.profile) || {};

    // runningToward -> discoverDomain (which areas to focus on).
    if (!wizardAnswers.discoverDomain) {
      const toward = String(prof.runningToward || '').toLowerCase();
      if (toward && toward.indexOf('not sure') === -1) {
        const map = [
          ['health', 'fitness'], ['fitness', 'fitness'],
          ['work', 'money'], ['money', 'money'],
          ['creative', 'creative'],
          ['skill', 'education'], ['craft', 'education'],
          ['relationship', 'relationships'],
          ['confidence', 'mental'], ['mindset', 'mental'],
          ['purpose', 'spiritual'], ['direction', 'spiritual'],
          ['discipline', 'mental'], ['focus', 'mental']
        ];
        const picked = [];
        map.forEach(([needle, val]) => { if (toward.indexOf(needle) !== -1 && picked.indexOf(val) === -1) picked.push(val); });
        if (picked.length) wizardAnswers.discoverDomain = picked.slice(0, 2);
      }
    }

    // clarityLevel -> knowDomain (how clear they are on what they want). This is
    // the first wizard step and gates the branch, so seeding it continues the
    // flow instead of re-asking. Onboarding: 'Yes, I know exactly' / 'I have a
    // rough idea' / "Not really, I'm figuring it out" / 'No, I feel completely lost'.
    if (!wizardAnswers.knowDomain) {
      const lvl = String(prof.clarityLevel || '').toLowerCase();
      if (lvl) {
        if (lvl.indexOf('know exactly') !== -1) wizardAnswers.knowDomain = 'yes';
        else if (lvl.indexOf('rough idea') !== -1) wizardAnswers.knowDomain = 'kinda';
        else if (lvl.indexOf('figur') !== -1 || lvl.indexOf('not really') !== -1 || lvl.indexOf('lost') !== -1) wizardAnswers.knowDomain = 'not_sure';
      }
    }

    // runningFrom -> blocker (their biggest obstacle). Onboarding runningFrom is
    // a ' · '-joined multi pick; we take the first that maps cleanly to a BLOCKERS
    // option. This carries through to state.clarity.answers.biggestBlocker (used
    // by the Ignition anti-vision + cue), so it is worth pre-filling.
    if (!wizardAnswers.blocker) {
      const from = String(prof.runningFrom || '').toLowerCase();
      if (from) {
        const blockerMap = [
          ['procrastination', 'Procrastination & avoidance'],
          ['phone', 'Phone & social media addiction'],
          ['social media', 'Phone & social media addiction'],
          ["don't know what to do", 'No clear plan or direction'],
          ['low motivation', 'Energy & motivation crashes']
        ];
        const hit = blockerMap.find(([needle]) => from.indexOf(needle) !== -1);
        if (hit) wizardAnswers.blocker = hit[1];
      }
    }

    // distraction -> apps (which apps steal their time). Onboarding distraction is
    // a single pick; only the entries that match a TRIGGER_APPS option are seeded
    // (Porn / Gaming / Friends / Something else have no app equivalent, so skip).
    if (!(wizardAnswers.apps && wizardAnswers.apps.length)) {
      const dist = String(prof.distraction || '').toLowerCase();
      if (dist) {
        const appMap = [
          ['tiktok', 'TikTok'],
          ['instagram', 'Instagram'],
          ['reels', 'Instagram'],
          ['youtube', 'YouTube']
        ];
        const hit = appMap.find(([needle]) => dist.indexOf(needle) !== -1);
        if (hit) wizardAnswers.apps = [hit[1]];
      }
    }
  },

  // Tutorial-only mode: just the intro pages, no wizard
  tutorialOnly: false,

  openTutorialOnly() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.tutorialOnly = true;
    FullscreenClose.show('clarity');
    this.currentPage = 0;
    this._cinematicOpen();
  },

  openSummary() {
    if (this.isOpen) return;
    // v764 (Malik's resume law: never land AHEAD of where they were): synthesis
    // marks clarity.completed before the hold-to-collapse, so an app kill on the
    // ceremony left completed=true with no ignitedAt, and every summary entry
    // (boot restore, sidebar, star card) skipped the hold. Owed ceremony first.
    try {
      const ev = (typeof clarityEndingVersion === 'function') ? clarityEndingVersion() : 'v2';
      if (ev !== 'off' && state.clarity && state.clarity.completed && !state.clarity.ignitedAt
          && String((state.clarity.answers || {}).neutronStar || '').trim()) {
        this.isOpen = true;
        FullscreenClose.show('clarity');
        this.el.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        TabBar.hide();
        _ig2Act = 'reveal'; _ig2 = {};
        const sum = normalizeClaritySummary(state.clarity.answers);
        this.pageWrap.innerHTML = `<div class="clarity-exp__page-inner clarity-exp__page-inner--summary">${(typeof renderIgnitionV2 === 'function') ? renderIgnitionV2(sum) : renderNeutronStarSummary(sum)}</div>`;
        this.navEl.innerHTML = '';
        if (typeof bindIgnitionV2 === 'function') bindIgnitionV2(document);
        this.el.classList.add('open-bg');
        requestAnimationFrame(() => { this.el.classList.add('open-bg-visible'); this.el.classList.add('open-content'); });
        this._setTimeout(() => { if (this.isOpen) { this.el.classList.add('open'); this.el.classList.remove('open-bg', 'open-bg-visible', 'open-content'); } }, 700);
        return;
      }
    } catch (e) {}
    this.isOpen = true;
    // Persist this view so a refresh lands the user back here instead of the dashboard.
    rememberView('claritySummary');
    FullscreenClose.show('clarity');
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    TabBar.hide();

    // Render NS scene content SYNCHRONOUSLY so its opaque space background
    // covers the dashboard from frame 1 (no flash of translucent overlay).
    const summary = normalizeClaritySummary(state.clarity.answers);
    this.pageWrap.innerHTML = `<div class="clarity-exp__page-inner clarity-exp__page-inner--summary">${renderNeutronStarSummary(summary, { allowContinue: true, showRestart: true })}</div>`;
    // Three swipeable pages: the star, the summary, the notes (phase 1 of the
    // Clarity merge). Always lands page 1, the pager is rebuilt on every open.
    clarityUpgradeSummaryToPager(this.pageWrap);
    this.navEl.innerHTML = '';

    // Fade clarity-exp in (one smooth transition, no staggered classes)
    this.el.classList.add('open-bg');
    requestAnimationFrame(() => {
      this.el.classList.add('open-bg-visible');
      this.el.classList.add('open-content');
    });

    // Init the star + starfield immediately (next frame, not after 50ms)
    const _self = this;
    requestAnimationFrame(() => {
      if (_self.isOpen) initNeutronStarCard(_self.pageWrap, () => { _self.isOpen = false; ClarityExperience.open(); });
    });

    this._setTimeout(() => {
      if (!this.isOpen) return;

      // Bind buttons
      const _ce = this;
      const continueBtn = document.getElementById('summaryContinue');
      if (continueBtn) {
        const openRefinePrompt = () => {
          const detail = document.getElementById('nsStarDetail');
          if (!detail) {
            // Fallback (insufficient synthesis: no star card to refine).
            // "Continue Building" must not dead-end; reopen Clarity so they can
            // add more and re-synthesize (Malik).
            try { _ce.close(); } catch (e) {}
            setTimeout(() => { try { ClarityExperience.open(); } catch (e) {} }, 400);
            return;
          }
          // Save the original summary card so we can restore it on cancel/ESC.
          const savedHtml = detail.innerHTML;
          let confirmEscHandler = null;
          const restoreSummary = () => {
            detail.innerHTML = savedHtml;
            if (confirmEscHandler) {
              document.removeEventListener('keydown', confirmEscHandler, true);
              confirmEscHandler = null;
            }
            // Re-wire the restored summary card.
            const reContinue = document.getElementById('summaryContinue');
            if (reContinue) reContinue.addEventListener('click', openRefinePrompt);
            const reAction = document.getElementById('summaryAction');
            if (reAction) {
              reAction.addEventListener('click', () => {
                _addToMementoThenAction(() => _ce.close());
              });
            }
            const scope = document.getElementById('nsScene') || document;
            const tabBtns = scope.querySelectorAll('.ns-summary__tab');
            const panels = scope.querySelectorAll('.ns-summary__panel');
            tabBtns.forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const key = btn.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.toggle('is-active', b === btn));
                panels.forEach(p => p.classList.toggle('is-active', p.getAttribute('data-panel') === key));
              });
            });
          };
          detail.innerHTML = `
            <div class="ns-star-detail__confirm">
              <div class="ns-star-detail__confirm-headline">Want to continue where you left off?</div>
              <div class="ns-star-detail__confirm-body">Pick up the conversation and refine your Neutron Star, or start the questions over from scratch.</div>
              <div class="ns-star-detail__confirm-actions">
                <button class="ns-star-detail__refine" id="nsConfirmRefine">Refine</button>
                <button class="ns-star-detail__restart" id="nsConfirmRestart">Restart</button>
                <button class="ns-summary__refine-link" id="nsConfirmBack" type="button">Back to your Neutron Star</button>
              </div>
            </div>
          `;
          // Bind Back button + ESC to restore the summary card.
          const backBtn = document.getElementById('nsConfirmBack');
          if (backBtn) backBtn.addEventListener('click', restoreSummary);
          confirmEscHandler = (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            restoreSummary();
          };
          document.addEventListener('keydown', confirmEscHandler, true);

          const navigateToWizard = (targetIndex) => {
            const scene = document.querySelector('.ns-star-scene');
            if (scene) scene.classList.remove('ns-star-scene--zoomed');
            try {
              const offset = (typeof _ce.getWizardOffset === 'function') ? _ce.getWizardOffset() : 0;
              _ce.currentPage = offset + targetIndex;
              if (typeof wizardStep !== 'undefined') wizardStep = targetIndex;
              if (typeof _ce.renderPage === 'function') _ce.renderPage(_ce.currentPage);
              if (typeof _ce.updateProgress === 'function') _ce.updateProgress();
              if (typeof _ce.updateNav === 'function') _ce.updateNav();
            } catch (e) {}
          };

          const refineBtn = document.getElementById('nsConfirmRefine');
          if (refineBtn) refineBtn.addEventListener('click', () => {
            // Open a simple inline edit dialog instead of dragging the user
            // back through the whole wizard. Lets them refine their Neutron
            // Star wording + the supporting why directly, save, and return.
            _cpStampRefine();
            openNeutronStarRefineDialog(restoreSummary);
          });

          const restartBtn = document.getElementById('nsConfirmRestart');
          if (restartBtn) restartBtn.addEventListener('click', () => {
            // One free Clarity run, ever (FIRST-WIN-PLAN #1). A restart is a
            // brand-new AI discovery, so a free user gets the paywall instead of
            // a silent second run. Close the scene first (the paywall layers under
            // clarity-exp), same order as the canonical post-naming flow; the
            // star itself stays saved and untouched.
            try {
              if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) {
                if (confirmEscHandler) { document.removeEventListener('keydown', confirmEscHandler, true); confirmEscHandler = null; }
                _ce.close();
                ClarityPaywall.show();
                return;
              }
            } catch (e) {}
            // Detach the capturing ESC handler before leaving the confirm prompt;
            // restoreSummary is skipped on this path, so without this it would leak
            // and keep swallowing Escape globally (one more per Continue->Restart).
            if (confirmEscHandler) { document.removeEventListener('keydown', confirmEscHandler, true); confirmEscHandler = null; }
            state.clarity.completed = false;
            state.clarity.tutorialSeen = false;
            delete state.clarity.draft;
            state.clarity.answers = {};
            persistNow();
            navigateToWizard(0);
          });
        };
        continueBtn.addEventListener('click', openRefinePrompt);
      }

      const actionBtn = document.getElementById('summaryAction');
      if (actionBtn) {
        // "Add to your Memento" (Malik): close the summary, land on the home, play
        // the unlock cinema (watch the Memento come alive), then the save nudge.
        actionBtn.addEventListener('click', () => {
          _addToMementoThenAction(() => _ce.close());
        });
      }

      // "What's this?" explanation sheet: lets the user re-read what a
      // Neutron Star is and why clarity matters, without needing to redo
      // the whole onboarding flow.
      const explainBtn = document.getElementById('nsExplainBtn');
      const explainSheet = document.getElementById('nsExplainSheet');
      const explainClose = document.getElementById('nsExplainClose');
      if (explainBtn && explainSheet) {
        explainBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          explainSheet.setAttribute('aria-hidden', 'false');
        });
      }
      if (explainClose && explainSheet) {
        explainClose.addEventListener('click', (e) => {
          e.stopPropagation();
          explainSheet.setAttribute('aria-hidden', 'true');
        });
      }
      if (explainSheet) {
        // Tap the backdrop to close.
        explainSheet.addEventListener('click', (e) => {
          if (e.target === explainSheet) {
            explainSheet.setAttribute('aria-hidden', 'true');
          }
        });
      }

      const redoBtn = document.getElementById('summaryRedo');
      if (redoBtn) {
        redoBtn.addEventListener('click', () => {
          // ONE free Clarity run, ever (FIRST-WIN-PLAN #1). A redo is a
          // brand-new AI discovery, so a free user meets the paywall instead
          // of getting a silent second run. open()'s own gate cannot catch
          // this path: it tests state.clarity.completed, which this handler
          // wipes first. (The live hole named in the checklist's amendments.)
          try {
            if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) {
              this.close();
              ClarityPaywall.show();
              return;
            }
          } catch (e) {}
          this.close();
          setTimeout(() => {
            try { const gp = state.goalProgress; if (gp) gp.refineFrom = ''; } catch (e) {}
            state.clarity.completed = false;
            state.clarity.tutorialSeen = false;
            delete state.clarity.draft;
            state.clarity.answers = {};
            persistNow();
            ClarityExperience.open();
          }, 500);
        });
      }

      // Settle into stable state
      this._setTimeout(() => {
        if (!this.isOpen) return;
        this.el.classList.add('open');
        this.el.classList.remove('open-bg', 'open-bg-visible', 'open-content');
        app.style.transition = '';
        app.style.opacity = '';
      }, 800);
    }, 150);
  },

  _showResumePrompt(draft, skipTut) {
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    FullscreenClose.show('clarity');
    TabBar.hide();
    const app = document.getElementById('app');
    app.style.transition = 'opacity 0.4s ease';
    app.style.opacity = '0';

    // Show the clarity background
    this._setTimeout(() => {
      if (!this.isOpen) return;
      this.el.classList.add('open-bg');
      requestAnimationFrame(() => this.el.classList.add('open-bg-visible'));

      this.pageWrap.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;text-align:center;padding:40px 32px;gap:24px;">
        <div style="font-size:1.5rem;font-weight:700;color:rgba(var(--ink),0.9);">Want to continue where you left off?</div>
        <div style="display:flex;gap:12px;width:100%;max-width:320px;">
          <button id="resumeRestart" class="resume-btn resume-btn--restart">Start over</button>
          <button id="resumeContinue" class="resume-btn resume-btn--continue">Continue</button>
        </div>
      </div>`;
      this.navEl.innerHTML = '';
      this.el.classList.add('open-content');

      document.getElementById('resumeContinue').addEventListener('click', () => {
        // Restore draft state
        wizardStep = draft.wizardStep || 0;
        wizardAnswers = { ...(draft.wizardAnswers || {}) };
        aiChatMessages = [...(draft.aiChatMessages || [])];
        aiChatReady = draft.aiChatReady || false;
        aiChatProgress = (typeof draft.aiChatProgress === 'number') ? draft.aiChatProgress : null;
        aiChatLoading = false;
        aiSynthesisResult = null;
        aiSynthesisLoading = false;
        aiChatError = null;
        aiUserAnswer = '';
        if (aiAbortController) { aiAbortController.abort(); aiAbortController = null; }

        // Restore current AI question
        aiCurrentQuestion = draft.aiCurrentQuestion || '';
        aiCurrentHint = draft.aiCurrentHint || '';
        aiCurrentType = draft.aiCurrentType || 'text';
        aiCurrentOptions = Array.isArray(draft.aiCurrentOptions) ? [...draft.aiCurrentOptions] : [];
        aiCurrentRange = draft.aiCurrentRange || null;

        // If no current question saved but we have messages, use the last assistant message
        if (!aiCurrentQuestion && aiChatMessages.length > 0) {
          const lastAssistant = [...aiChatMessages].reverse().find(m => m.role === 'assistant');
          if (lastAssistant) {
            aiCurrentQuestion = lastAssistant.content;
            aiCurrentType = 'text';
          }
        }

        const offset = skipTut ? 0 : this.totalTutorialPages;
        this.currentPage = offset + wizardStep;
        this._resuming = true;
        this._openContent();
      });

      document.getElementById('resumeRestart').addEventListener('click', () => {
        // Clear draft and start fresh
        delete state.clarity.draft;
        persistNow();
        this.currentPage = 0;
        wizardStep = 0;
        wizardAnswers = {};
        aiChatMessages = [];
        aiChatReady = false;
        aiChatProgress = null;
        aiChatLoading = false;
        aiSynthesisResult = null;
        aiSynthesisLoading = false;
        aiChatError = null;
        aiCurrentQuestion = '';
        aiCurrentHint = '';
        aiCurrentType = 'text';
        aiCurrentOptions = [];
        aiCurrentRange = null;
        if (aiAbortController) { aiAbortController.abort(); aiAbortController = null; }
        // Hero first, then the "Clarity" intro (v556 flipped flow); or straight to
        // the wizard if the tutorial was already seen.
        if (!state.clarity.tutorialSeen) {
          this._introPending = true;
          this._setLight(0.06);
          this._openContent();
        } else {
          this._openContent();
        }
      });
    }, 150);
  },

  _showClarityIntro() {
    if (!this.el.classList.contains('open-bg')) {
      this.el.classList.add('open-bg');
      requestAnimationFrame(() => this.el.classList.add('open-bg-visible'));
    }
    this._setLight(0.06); // a whisper of light before the journey starts
    this.pageWrap.innerHTML = `<div class="clarity-intro" id="clarityIntro">
      <div class="clarity-intro__body">
        <div class="clarity-intro__title"><span class="clarity-intro__title-in">Clarity</span></div>
        <div class="clarity-intro__lines">
          <div class="clarity-intro__line clarity-intro__line--1">The first step to accomplishing anything is to first get clear on what it is you want and why.</div>
          <div class="clarity-intro__line">Most people never do this.</div>
          <div class="clarity-intro__line clarity-intro__line--2">They drift. They guess. They settle for wherever life moves them and accept a mediocre existence.</div>
          <div class="clarity-intro__line clarity-intro__line--3">This module exists to make sure that's not you.</div>
          <div class="clarity-intro__line clarity-intro__line--4">Over the next few minutes, you'll move through a system designed to uncover your real desires so you know what it is you truly want more than anything else.</div>
          <div class="clarity-intro__line clarity-intro__line--5">Be as honest as possible. I recommend cutting out a part of your day, sitting down alone, maybe with a calm playlist for the best results.</div>
        </div>
      </div>
      <div class="clarity-intro__foot" id="clarityIntroFoot">
        <button class="clarity-intro__btn" id="clarityIntroBtn">Continue</button>
      </div>
    </div>`;
    this.navEl.innerHTML = '';
    this.el.classList.add('open-content');

    // The lines type in one by one (typewriter, like onboarding). Tapping anywhere
    // (except the Begin button) snaps everything to fully typed + reveals the button.
    // Listen on BOTH pointerdown and click so mobile Safari fires immediately on touch.
    const introEl = document.getElementById('clarityIntro');
    const skipIntro = (e) => {
      if (e.target.closest && e.target.closest('#clarityIntroBtn')) return;
      if (this._claritySkipType) this._claritySkipType();
    };
    introEl.addEventListener('pointerdown', skipIntro);
    introEl.addEventListener('click', skipIntro);
    const wrap = document.getElementById('clarityExpPageWrap');
    if (wrap) {
      const skipFromWrap = (e) => {
        if (e.target.closest && e.target.closest('#clarityIntroBtn')) return;
        if (!e.target.closest || !e.target.closest('#clarityIntro')) return;
        if (this._claritySkipType) this._claritySkipType();
      };
      wrap.addEventListener('pointerdown', skipFromWrap);
    }

    document.getElementById('clarityIntroBtn').addEventListener('click', () => {
      const intro = document.getElementById('clarityIntro');
      intro.classList.add('clarity-intro--exit');
      // FLIPPED (v556): the intro plays AFTER the hero, so Begin drops into the
      // scale pages (page 1). The hero (page 0) was already seen.
      this._setTimeout(() => { if (this.isOpen) { this.currentPage = 1; this._openContent(); } }, 400);
    });

    this._runClarityIntro();
  },

  // The Clarity intro sequence: the word "Clarity" pops in centered + blurry, comes into
  // focus while growing, then flies up to its top-left spot, and only then do the lines
  // type in char-by-char (onboarding-style) and the bottom Begin button reveals. A tap
  // anywhere snaps everything to the finished state.
  _runClarityIntro() {
    const intro = document.getElementById('clarityIntro');
    if (!intro) return;
    const lines = [...intro.querySelectorAll('.clarity-intro__line')];
    const foot = document.getElementById('clarityIntroFoot');
    const title = intro.querySelector('.clarity-intro__title-in'); // the word itself, so it centres
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // Reserve each line's final wrapped height up front so the stack never jumps, then clear
    // them so they are empty (invisible) during the title intro.
    lines.forEach((l) => { l.dataset.full = l.textContent; l.style.minHeight = l.offsetHeight + 'px'; l.textContent = ''; });

    let done = false;
    this._claritySkipType = () => {
      if (done) return; done = true;
      if (title) { title.style.transition = 'none'; title.style.transform = ''; title.style.filter = ''; title.style.opacity = '1'; }
      lines.forEach((l) => { l.textContent = l.dataset.full || ''; });
      if (foot) foot.classList.add('show');
    };
    if (reduced) { if (title) title.style.opacity = '1'; this._claritySkipType(); return; }

    const typeAll = () => {
      if (done) return;
      const typeLine = (idx) => {
        if (done) return;
        if (idx >= lines.length) { done = true; if (foot) foot.classList.add('show'); return; }
        const el = lines[idx]; const full = el.dataset.full || ''; let i = 0;
        const tick = () => {
          if (done) return;
          el.textContent = full.slice(0, i); i++;
          try { if (typeof MementoSound !== 'undefined') MementoSound.tick(); } catch (e) {}
          if (i <= full.length) this._setTimeout(tick, 11 + Math.random() * 9);
          else this._setTimeout(() => typeLine(idx + 1), 900);
        };
        tick();
      };
      typeLine(0);
    };

    if (!title) { typeAll(); return; }
    // Measure the title's final (top-left) position, then offset it to screen centre + blur it.
    const r = title.getBoundingClientRect();
    const dx = (window.innerWidth / 2) - (r.left + r.width / 2);
    const dy = (window.innerHeight / 2) - (r.top + r.height / 2);
    title.style.willChange = 'transform, filter, opacity';
    title.style.transformOrigin = 'center center';
    title.style.transition = 'none';
    title.style.opacity = '0';
    title.style.filter = 'blur(16px)';
    title.style.transform = `translate(${dx}px, ${dy}px) scale(1.16)`;
    void title.offsetWidth;
    // Phase 1a: fade in but HOLD the blur for ~1s (it stays soft and out of focus).
    this._setTimeout(() => {
      if (done) return;
      title.style.transition = 'opacity 0.7s ease, transform 1.6s cubic-bezier(0.16,1,0.3,1)';
      title.style.opacity = '1';
      title.style.transform = `translate(${dx}px, ${dy}px) scale(1.28)`;
    }, 60);
    // Phase 1b: now come into focus while growing a little more.
    this._setTimeout(() => {
      if (done) return;
      title.style.transition = 'filter 1s ease, transform 1s cubic-bezier(0.16,1,0.3,1)';
      title.style.filter = 'blur(0px)';
      title.style.transform = `translate(${dx}px, ${dy}px) scale(1.5)`;
    }, 1150);
    // Phase 2: HOLD on the focused, centered word for ~2s, then fly up to the top-left spot.
    this._setTimeout(() => {
      if (done) return;
      title.style.transition = 'transform 0.85s cubic-bezier(0.16,1,0.3,1)';
      title.style.transform = 'translate(0px, 0px) scale(1)';
    }, 4150);
    // Phase 3: it has landed, clean up and start the text.
    this._setTimeout(() => {
      if (done) return;
      title.style.transition = ''; title.style.transform = ''; title.style.filter = ''; title.style.transformOrigin = ''; title.style.willChange = '';
      typeAll();
    }, 5100);
  },

  _cinematicOpen() {
    this._clearTimers();
    this.el.style.display = '';
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Phase 0: Zoom into the clarity widget
    TabBar.hide();
    const app = document.getElementById('app');
    const clarityCard = document.querySelector('.widget--clarity');

    // Calculate where to zoom toward - translate the card center to screen center, then scale up
    let tx = 0, ty = 0;
    if (clarityCard) {
      const rect = clarityCard.getBoundingClientRect();
      const cardCx = rect.left + rect.width / 2;
      const cardCy = rect.top + rect.height / 2;
      const screenCx = window.innerWidth / 2;
      const screenCy = window.innerHeight / 2;
      // Move so the card center is at screen center, then scale
      tx = screenCx - cardCx;
      ty = screenCy - cardCy;
    }

    // No zoom - dashboard fade-out class handles the transition.
    this._zoomTx = 0;
    this._zoomTy = 0;

    // If resuming or tutorial already seen  - skip intro, go straight to content
    if (this._resuming || state.clarity.tutorialSeen) {
      this._openContent();
      return;
    }

    // ── Fresh open ──
    // FLIPPED (v556, Malik): the module now OPENS on the hero ("How to achieve
    // literally anything", page 0); the "Clarity" cinematic intro plays AFTER it,
    // between the hero and the scale pages (gated in next() via _introPending).
    this._introPending = true;
    this._setLight(0.06);
    this._openContent(650);
  },

  _openContent(holdMs) {
    // Phase 1: Dark background
    if (!this.el.classList.contains('open-bg')) {
      this.el.classList.add('open-bg');
      requestAnimationFrame(() => this.el.classList.add('open-bg-visible'));
    }

    // Phase 2: Render wizard content (after the optional black hold on a fresh open).
    // A fresh first open shows the "Clarity" cinematic intro instead of a page; its
    // Begin button re-enters _openContent for the real page 0.
    this._setTimeout(() => {
      if (!this.isOpen) return;
      if (this._openWithIntro) {
        this._openWithIntro = false;
        this._showClarityIntro();
        return;
      }
      this.renderPage(this.currentPage);
      this.updateProgress();
      this.updateNav();
      if (!this.el.classList.contains('open-content')) {
        this.el.classList.add('open-content');
      }

      if (this._resuming) {
        this._resuming = false;
      }
    }, holdMs || (this._resuming ? 150 : 50));

    // Phase 3: Settle into stable state
    this._setTimeout(() => {
      if (!this.isOpen) return;
      this.el.classList.add('open');
      this.el.classList.remove('open-bg', 'open-bg-visible', 'open-content');
      const app = document.getElementById('app');
      app.style.transition = '';
      app.style.opacity = '';
      app.style.transform = '';
      this._transitioning = false;
    }, 1400);
  },

  // Cancel any pending animation timers
  _clearTimers() {
    if (this._timers) this._timers.forEach(t => clearTimeout(t));
    this._timers = [];
  },
  _setTimeout(fn, ms) {
    const t = setTimeout(fn, ms);
    if (!this._timers) this._timers = [];
    this._timers.push(t);
    return t;
  },

  close() {
    this._clearTimers();
    // Closing always clears the persisted view so we don't reopen on refresh.
    if (recallView() === 'claritySummary') rememberView(null);

    // Save progress if they started the wizard but didn't finish
    if (this.isOpen && !this.tutorialOnly && !state.clarity.completed && state.clarity.tutorialSeen && wizardStep > 0) {
      // Save the FULL chat state, mirroring the autosave in sendAiAnswer. The
      // old 3-field save here overwrote that richer draft on close, so resume
      // lost the current question's type/options/progress.
      state.clarity.draft = {
        wizardStep, wizardAnswers: { ...wizardAnswers },
        aiChatMessages: [...aiChatMessages],
        aiCurrentQuestion, aiCurrentHint, aiCurrentType,
        aiCurrentOptions: [...aiCurrentOptions], aiCurrentRange,
        aiChatReady, aiChatProgress
      };
      persistNow();
    }

    // Abort any in-flight AI requests
    if (aiAbortController) { aiAbortController.abort(); aiAbortController = null; }
    aiChatLoading = false;
    aiSynthesisLoading = false;
    aiCurrentQuestion = '';
    aiCurrentHint = '';
    aiUserAnswer = '';

    // Instant reset - no animations, no timeouts, no race conditions
    this._forceReset();
  },

  // Force everything back to a clean state - instant, no animations
  _forceReset() {
    this._clearTimers();
    this.isOpen = false;
    this.tutorialOnly = false;
    this._transitioning = false;
    this._resuming = false;
    this._openWithIntro = false;
    this._introPending = false;
    FullscreenClose.hide();

    // Hard hide the clarity overlay - display:none is un-ignorable
    this.el.style.display = 'none';
    this.el.className = 'clarity-exp';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.style.opacity = '0';
    this.el.style.pointerEvents = 'none';
    this.el.style.transform = 'none';
    if (this.pageWrap) {
      this.pageWrap.querySelectorAll('canvas').forEach(c => {
        if (c._destroyGL) c._destroyGL();
      });
      this.pageWrap.innerHTML = '';
    }
    if (this.navEl) this.navEl.innerHTML = '';
    if (this.progressEl) this.progressEl.innerHTML = '';
    // Force reflow then restore display
    void this.el.offsetHeight;
    this.el.style.display = '';
    this.el.style.opacity = '';
    this.el.style.pointerEvents = '';
    this.el.style.transform = '';

    // Reset app explicitly so early Escape during the zoom/open animation cannot leave it invisible
    const app = document.getElementById('app');
    if (app) {
      app.style.display = '';
      app.style.opacity = '1';
      app.style.transform = 'none';
      app.style.filter = 'none';
      app.style.transition = '';
    }

    // Restore page state
    document.body.style.overflow = '';
    if (typeof TabBar !== 'undefined' && TabBar.activeTab !== 'home') {
      TabBar.switchTo('home');
    }
    TabBar.show();
    renderGrid();
    renderAll();
  },

  // The beat between "Let's Find Yours" and the first question: ONE quiet title,
  // "Let's find Clarity.", then straight into "Okay let's start here...". The v496
  // fake-loading page (orb + "pulling up what you told me") was cut (Malik: looked
  // weird); the onboarding context needs no visible loading, the AI receives it at
  // request time via buildProfileContext.
  _showContextLoad(done) {
    try {
      this.navEl.innerHTML = '';
      this.pageWrap.innerHTML = '<div class="clarity-exp__page-inner"><div class="clarity-ctx">' +
        '<div class="clarity-ctx__word">Okay, Let\'s begin.</div>' +
        '</div></div>';
      this._syncNebula();
      const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this._setTimeout(done, reduced ? 450 : 2500);
    } catch (e) { done(); }
  },

  // "Now, before you begin." (Malik, v498): the headline TYPES centred on screen, glides
  // up to its resting spot, then the body lines come in one at a time. A tap fast-forwards
  // the current stage (finish typing -> land -> show everything). Nav hidden until done.
  _runReflectIntro() {
    const wrap = this.pageWrap.querySelector('.clarity-reflect');
    const headIn = wrap && wrap.querySelector('.clarity-reflect__headline-in');
    const lines = wrap ? [...wrap.querySelectorAll('.clarity-reflect__line')] : [];
    if (!wrap || !headIn || wrap.dataset.introRan) return;
    wrap.dataset.introRan = '1';
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduced) return;
    const nav = this.navEl;
    if (nav) { nav.style.transition = 'none'; nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; void nav.offsetWidth; nav.style.transition = 'opacity 0.45s ease'; }
    const showNav = () => { if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = ''; } };
    const full = headIn.textContent;
    // Chunk the body like the other teaching pages (v553), but the first two lines
    // (the setup + THE QUESTION) stay PINNED across chunks (v554: fading the question
    // out made "This question is not an attempt..." read broken, it lost its
    // antecedent). Only the supporting paragraphs rotate beneath it, in pairs.
    lines.forEach((l) => { l.__h = l.offsetHeight; l.style.opacity = '0'; l.style.transform = 'translateY(10px)'; });
    const pinned = lines.slice(0, 2);
    const rest = lines.slice(2);
    const chunks = []; for (let i = 0; i < rest.length; i += 2) chunks.push(rest.slice(i, i + 2));
    if (!chunks.length) chunks.push([]);
    if (chunks.length > 1) {
      const last = chunks[chunks.length - 1];
      if (last.length === 1 && (last[0].textContent || '').length < 60) { chunks.pop(); chunks[chunks.length - 1].push(last[0]); }
    }
    let chunkIdx = 0;
    this._chunkIdx = 0;
    this._chunkTotal = chunks.length;
    const body = wrap.querySelector('.clarity-reflect__body');
    if (body) {
      const GAP = 18;
      const pinnedH = pinned.reduce((a, l) => a + (l.__h || 0), 0) + GAP * pinned.length;
      body.style.minHeight = (pinnedH + Math.max(...chunks.map((c) => c.reduce((a, l) => a + (l.__h || 0), 0) + GAP * Math.max(0, c.length - 1)))) + 'px';
    }
    const layoutChunk = () => {
      lines.forEach((l) => { l.style.display = 'none'; });
      pinned.forEach((l) => { l.style.display = ''; });
      chunks[chunkIdx].forEach((l) => { l.style.display = ''; });
    };
    layoutChunk();
    // Centre the headline (same measure-then-transform trick as the hero).
    const r = headIn.getBoundingClientRect();
    const dx = (window.innerWidth / 2) - (r.left + r.width / 2);
    const dy = (window.innerHeight / 2) - (r.top + r.height / 2);
    headIn.style.display = 'inline-block';
    headIn.style.minWidth = r.width + 'px';
    headIn.style.minHeight = r.height + 'px';
    headIn.style.willChange = 'transform';
    headIn.style.transformOrigin = 'center center';
    headIn.style.transform = `translate(${dx}px, ${dy}px) scale(1.15)`;
    headIn.textContent = '';
    let done = false;   // everything revealed
    let landed = false; // headline back at its spot
    const land = () => {
      if (landed) return; landed = true;
      headIn.textContent = full;
      headIn.style.transition = 'none'; headIn.style.transform = '';
      headIn.style.transformOrigin = ''; headIn.style.willChange = '';
    };
    const revealAll = () => {
      if (done) return; done = true;
      land();
      layoutChunk();
      pinned.concat(chunks[chunkIdx]).forEach((l) => { l.style.transition = 'opacity 0.5s ease, transform 0.5s ease'; l.style.opacity = '1'; l.style.transform = ''; });
      showNav();
    };
    const revealLines = () => {
      // First pass reveals the pinned setup + question too; later chunks only the pair.
      const arr = chunkIdx === 0 ? pinned.concat(chunks[0]) : chunks[chunkIdx];
      arr.forEach((l, i) => {
        this._setTimeout(() => {
          if (done) return;
          l.style.transition = 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1)';
          l.style.opacity = '1'; l.style.transform = '';
          if (i === arr.length - 1) { done = true; showNav(); }
        }, i * 950);
      });
    };
    const seen = new Set([0]);
    this._chunkNext = () => {
      if (!done || chunkIdx >= chunks.length - 1) return false;
      done = false;
      if (nav) { nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; }
      const cur = chunks[chunkIdx];
      cur.forEach((l) => { l.style.transition = 'opacity 0.3s ease'; l.style.opacity = '0'; });
      this._setTimeout(() => {
        chunkIdx++;
        this._chunkIdx = chunkIdx;
        this.updateNav();
        chunks[chunkIdx].forEach((l) => { l.style.opacity = '0'; l.style.transform = 'translateY(10px)'; });
        layoutChunk();
        try { this.pageWrap.scrollTop = 0; } catch (e) {}
        this._fitPageScroll();
        if (seen.has(chunkIdx)) { revealAll(); return; }
        seen.add(chunkIdx);
        revealLines();
      }, 330);
      return true;
    };
    this._chunkPrev = () => {
      if (chunkIdx <= 0) return false;
      chunkIdx--;
      this._chunkIdx = chunkIdx;
      done = true;
      layoutChunk();
      pinned.concat(chunks[chunkIdx]).forEach((l) => { l.style.transition = 'none'; l.style.opacity = '1'; l.style.transform = ''; });
      showNav();
      this.updateNav();
      try { this.pageWrap.scrollTop = 0; } catch (e) {}
      this._fitPageScroll();
      return true;
    };
    let typed = false;
    const glideThenLines = () => {
      this._setTimeout(() => { if (done || landed) return; headIn.style.transition = 'transform 0.9s cubic-bezier(0.16,1,0.3,1)'; headIn.style.transform = 'translate(0px, 0px) scale(1)'; }, 500);
      this._setTimeout(() => { if (done) return; land(); revealLines(); }, 1500);
    };
    let hi = 0;
    const headTick = () => {
      if (done || landed) return;
      headIn.textContent = full.slice(0, hi); hi++;
      if (hi <= full.length) this._setTimeout(headTick, 26 + Math.random() * 14);
      else { typed = true; glideThenLines(); }
    };
    // Tap fast-forwards: mid-typing -> land + start the line reveal; after that -> show all.
    wrap.addEventListener('click', () => {
      if (done) return;
      if (!typed && !landed) { typed = true; land(); revealLines(); return; }
      revealAll();
    });
    this._setTimeout(headTick, 300);
  },

  // The scale page opens on a title screen (Malik, v498): "How Focus Works /
  // extremely simplified" centred on black; then every word except "Focus" fades out
  // and "Focus" FLIES into its spot inside "Think About Your Focus like a Scale",
  // where the page fades up and reading continues seamlessly. Tap skips to the page.
  _runFocusIntro() {
    const inner = this.pageWrap.querySelector('.clarity-exp__page-inner');
    const tut = inner && inner.querySelector('.clarity-exp__tut');
    const target = inner && inner.querySelector('.gs-focus-target');
    if (!inner || !tut || !target || inner.dataset.focusIntroRan) return;
    inner.dataset.focusIntroRan = '1';
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduced) return;
    tut.style.opacity = '0';
    const nav = this.navEl;
    if (nav) { nav.style.transition = 'none'; nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; void nav.offsetWidth; nav.style.transition = 'opacity 0.45s ease'; }
    const showNav = () => { if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = ''; } };
    const ov = document.createElement('div');
    ov.className = 'clarity-focus-ov';
    ov.innerHTML = '<div class="clarity-focus-ov__title"><span class="cfw">How</span> <span class="cfw cfw--focus">Focus</span> <span class="cfw">Works</span></div>' +
      '<div class="clarity-focus-ov__sub">(extremely simplified)</div>';
    this.el.appendChild(ov);
    const fly = ov.querySelector('.cfw--focus');
    const fade = [...ov.querySelectorAll('.cfw:not(.cfw--focus)'), ov.querySelector('.clarity-focus-ov__sub')].filter(Boolean);
    let finished = false;
    // The landing is a same-frame SWAP, not a crossfade (Malik, v552: the old fade-out/
    // fade-in double-exposed the word slightly off target). The real headline appears
    // instantly the moment the flying word vanishes; only the illustration + the rest of
    // the page fade in around it. The headline word stays hidden until the swap.
    const headline = tut.querySelector('.clarity-exp__tut-headline');
    const illust = tut.querySelector('.clarity-exp__tut-illust');
    const sub = tut.querySelector('.clarity-exp__tut-sub');
    const finish = (instant) => {
      if (finished) return; finished = true;
      // Pre-fade the parts around the headline so the tut container can appear instantly.
      [illust, sub].forEach((el) => { if (el) { el.style.opacity = '0'; } });
      tut.style.transition = 'none';
      tut.style.opacity = '1';
      if (fly) { fly.style.transition = 'none'; fly.style.opacity = '0'; }
      ov.style.transition = 'opacity 0.4s ease';
      ov.style.opacity = '0';
      this._setTimeout(() => { try { ov.remove(); } catch (e) {} }, 450);
      [illust, sub].forEach((el) => {
        if (!el) return;
        el.style.transition = instant ? 'none' : 'opacity 0.7s ease';
        void el.offsetWidth;
        el.style.opacity = '1';
      });
      // Hand off to the body typewriter if it's armed (v551); it shows the nav
      // itself once the last line lands.
      if (this._tutTypeStart) { const s = this._tutTypeStart; this._setTimeout(s, instant ? 0 : 500); }
      else showNav();
    };
    // Fade the other words + sub OUT smoothly. Pin each to opacity 1 first (killing the
    // fade-in animation reverts to base opacity 0), force a reflow, THEN transition to 0,
    // so it glides off instead of snapping (Malik: they used to just turn off).
    const clearOthers = () => {
      fade.forEach((el) => {
        el.style.animation = 'none';
        el.style.opacity = '1';
        void el.offsetWidth;
        el.style.transition = 'opacity 0.7s ease';
        el.style.opacity = '0';
      });
    };
    const flyFocus = () => {
      try {
        // Pin an explicit START transform and COMMIT it (reflow) before setting the target,
        // otherwise killing the fade-in animation + moving in the same frame snaps with no
        // 'from' state to interpolate = the jump Malik saw. Establish the origin + a concrete
        // identity transform first, force layout, THEN transition to the target so it glides.
        fly.style.animation = 'none';
        fly.style.opacity = '1';
        // Scale by FONT-SIZE ratio and align the box CENTERS (v553). The old height-ratio
        // scale compared line boxes with different line-heights (1.1 vs 1.2), so the word
        // landed ~9% oversized and off by a few px, which read as a snap at the swap.
        fly.style.transformOrigin = '50% 50%';
        fly.style.transition = 'none';
        fly.style.transform = 'translate(0px, 0px) scale(1)';
        void fly.offsetWidth; // commit the start position
        const fr = fly.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        const s = (parseFloat(getComputedStyle(target).fontSize) || 1) / (parseFloat(getComputedStyle(fly).fontSize) || 1);
        const dx = (tr.left + tr.width / 2) - (fr.left + fr.width / 2);
        const dy = (tr.top + tr.height / 2) - (fr.top + fr.height / 2);
        fly.style.transition = 'transform 1.35s cubic-bezier(0.45, 0, 0.15, 1)';
        fly.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
      } catch (e) {}
    };
    ov.addEventListener('click', () => finish(true));
    // Slower, more deliberate beats (Malik, v552: it still rushed). Title holds ~3.4s, the
    // other words fade out (0.7s), "Focus" glides into the headline (1.35s), lands, and the
    // swap in finish() puts the real headline in its place the same frame.
    this._setTimeout(() => { if (!finished) clearOthers(); }, 3400);
    this._setTimeout(() => { if (!finished) flyFocus(); }, 4400);
    this._setTimeout(() => finish(false), 5850);
  },

  // The Neutron Star page enters cinematically (Malik): the star fades in FIRST, big and
  // glowing (halo + tremble live in CSS), sits alone for a beat, then the headline and
  // body fade in under it. Reduced motion shows everything at once.
  _runStarIntro() {
    const tut = this.pageWrap.querySelector('.clarity-exp__tut');
    const stage = this.pageWrap.querySelector('.tut-star-stage');
    if (!tut || !stage || stage.dataset.introRan) return;
    stage.dataset.introRan = '1';
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (reduced) return;
    // The nav stays hidden while the star arrives (Malik, v557): the star gets the
    // screen to itself, buttons only fade in with the words.
    const nav = this.navEl;
    if (nav) { nav.style.transition = 'none'; nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; void nav.offsetWidth; nav.style.transition = 'opacity 0.45s ease'; }
    const showNav = () => { if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = ''; } };
    const illust = this.pageWrap.querySelector('.clarity-exp__tut-illust');
    const texts = [tut.querySelector('.clarity-exp__tut-headline'), tut.querySelector('.clarity-exp__tut-sub')].filter(Boolean);
    texts.forEach((el) => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; });
    if (illust) {
      illust.style.transition = 'none';
      illust.style.opacity = '0';
      illust.style.transform = 'scale(0.7)';
      void illust.offsetWidth; // commit the start state so the transition actually runs
      // Slower, heavier arrival (Malik, v557: it used to suddenly appear).
      illust.style.transition = 'opacity 2.4s ease-out, transform 3s cubic-bezier(0.16,1,0.3,1)';
      requestAnimationFrame(() => { illust.style.opacity = '1'; illust.style.transform = ''; });
    }
    // The star lands slowly and sits alone for a beat, then the words + nav arrive.
    this._setTimeout(() => {
      texts.forEach((el, i) => {
        el.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)';
        this._setTimeout(() => { el.style.opacity = '1'; el.style.transform = ''; }, i * 240);
      });
      this._setTimeout(showNav, 500);
    }, 3400);
    // Arrival tremble is full strength; once the page is settled the shake calms to a
    // quieter idle (Malik: powerful entrance, subtler at rest).
    this._setTimeout(() => { try { stage.classList.add('is-idle'); } catch (e) {} }, 4400);
  },

  // The "How to achieve anything" hero: the headline POPS IN sharp + fully visible, centred on
  // screen, holds, then rises to its top-left spot, and only then do the body lines type in.
  // No fade and no blur (that softer look is reserved for the Clarity title). A tap fills it.
  _runHeroIntro() {
    const hero = this.pageWrap && this.pageWrap.querySelector('.clarity-tut-hero');
    if (!hero || hero.dataset.introRan) return;
    hero.dataset.introRan = '1';
    const title = hero.querySelector('.clarity-tut-hero__title-in');
    const lines = [...hero.querySelectorAll('.clarity-tut-hero__line')];
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    // The Continue nav stays hidden until EVERY element is on screen (Malik: it used to
    // pop up over an empty page). Shown the moment the last line lands (or on tap-fill).
    const nav = this.navEl;
    if (nav) { nav.style.transition = 'none'; nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; void nav.offsetWidth; nav.style.transition = 'opacity 0.45s ease'; }
    const showNav = () => { if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = ''; } };
    // Capture each line's inline structure (text runs + bold spans WITH their attrs) so the
    // typewriter can reveal characters with their formatting already applied, then reserve the
    // height and clear it. Stashing segments (not just plain text) is what keeps the bold part
    // bold AS it types, instead of typing plain then snapping to bold at the end.
    lines.forEach((l) => {
      l.__segs = [...l.childNodes].map((node) => ({ el: node.nodeType === 1 ? node.cloneNode(false) : null, text: node.textContent || '' }));
      l.__len = l.__segs.reduce((a, s) => a + s.text.length, 0);
      l.dataset.full = l.innerHTML;
      l.__h = l.offsetHeight;
      l.style.minHeight = l.__h + 'px';
      l.textContent = '';
    });
    // Paragraphs show TWO at a time (Malik, v552: no scrolling on mobile). Continue steps
    // through the chunks on the spot (title stays, old pair fades out, next pair types in)
    // via this._chunkNext, which next() consults before page navigation.
    const CH = 2;
    const chunks = []; for (let i = 0; i < lines.length; i += CH) chunks.push(lines.slice(i, i + CH));
    // A short orphan sentence never gets its own chunk (Malik, v553: "We need to fix
    // this." alone on a step felt wrong); it rides with the previous pair.
    if (chunks.length > 1) {
      const last = chunks[chunks.length - 1];
      if (last.length === 1 && (last[0].dataset.full || '').length < 60) { chunks.pop(); chunks[chunks.length - 1].push(last[0]); }
    }
    let chunkIdx = 0;
    this._chunkIdx = 0;
    this._chunkTotal = chunks.length;
    const seen = new Set([0]);
    const layoutChunk = () => {
      lines.forEach((l) => { l.style.display = 'none'; });
      chunks[chunkIdx].forEach((l) => { l.style.display = ''; l.style.transition = ''; l.style.opacity = '1'; l.style.marginTop = ''; });
    };
    // Lock the lines container to the TALLEST chunk so the title/illustration never
    // shift when a shorter pair swaps in (v553: this was the jump Malik saw).
    const linesWrap = hero.querySelector('.clarity-tut-hero__lines');
    if (linesWrap) {
      const GAP = 18;
      const maxH = Math.max(...chunks.map((c) => c.reduce((a, l) => a + (l.__h || 0), 0) + GAP * (c.length - 1)));
      linesWrap.style.minHeight = maxH + 'px';
    }
    // Lay the first chunk out NOW, same tick as the render, so the first paint already
    // has the final geometry (laying it out at typing start made the title drop, v553).
    layoutChunk();
    let done = false;     // current chunk fully shown
    let typing = false;   // the typewriter has begun
    const landTitle = () => {
      if (!title) return;
      if (title.dataset.full) title.innerHTML = title.dataset.full; // snap any partial typing to full
      title.style.transition = 'none'; title.style.transform = ''; title.style.opacity = '1';
      title.style.transformOrigin = ''; title.style.willChange = '';
    };
    const typeLineEl = (el, onDone) => {
      const segs = el.__segs || []; const len = el.__len || 0; let i = 0;
      // Rebuild the line revealing the first n chars, keeping bold runs in their own (cloned)
      // element so the bold shows up already bold as it types.
      const renderUpto = (n) => {
        el.textContent = '';
        let rem = n;
        for (const s of segs) {
          if (rem <= 0) break;
          const take = Math.min(rem, s.text.length);
          const slice = s.text.slice(0, take);
          if (s.el) { const c = s.el.cloneNode(false); c.textContent = slice; el.appendChild(c); }
          else { el.appendChild(document.createTextNode(slice)); }
          rem -= take;
        }
      };
      const tick = () => {
        if (done) return;
        renderUpto(i); i++;
        try { if (typeof MementoSound !== 'undefined') MementoSound.tick(); } catch (e) {}
        if (i <= len) this._setTimeout(tick, 11 + Math.random() * 9);
        else { el.innerHTML = el.dataset.full || ''; onDone(); }
      };
      tick();
    };
    const typeChunk = () => {
      const arr = chunks[chunkIdx]; let i = 0;
      const step = () => {
        if (done) return;
        if (i >= arr.length) { done = true; showNav(); return; }
        typeLineEl(arr[i], () => { i++; this._setTimeout(step, 650); });
      };
      step();
    };
    const startTyping = () => { if (typing || done) return; typing = true; typeChunk(); };
    const fillChunk = () => { done = true; layoutChunk(); chunks[chunkIdx].forEach((l) => { l.innerHTML = l.dataset.full || ''; }); showNav(); };
    // Continue mid-hero: fade the current pair out, type the next pair in. Returns false
    // once the last chunk is showing so next() falls through to real page navigation.
    // Already-seen chunks re-fill instantly instead of retyping (back-and-forth, v553).
    this._chunkNext = () => {
      if (!done || chunkIdx >= chunks.length - 1) return false;
      done = false;
      if (nav) { nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; }
      const cur = chunks[chunkIdx];
      cur.forEach((l) => { l.style.transition = 'opacity 0.3s ease'; l.style.opacity = '0'; });
      this._setTimeout(() => {
        chunkIdx++;
        this._chunkIdx = chunkIdx;
        this.updateNav();
        try { this.pageWrap.scrollTop = 0; } catch (e) {}
        this._fitPageScroll();
        if (reduced || seen.has(chunkIdx)) { fillChunk(); return; }
        seen.add(chunkIdx);
        chunks[chunkIdx].forEach((l) => { l.textContent = ''; });
        layoutChunk();
        typeChunk();
      }, 330);
      return true;
    };
    // Back mid-hero: previous pair returns instantly filled (no retype).
    this._chunkPrev = () => {
      if (chunkIdx <= 0) return false;
      done = true;
      chunkIdx--;
      this._chunkIdx = chunkIdx;
      fillChunk();
      this.updateNav();
      try { this.pageWrap.scrollTop = 0; } catch (e) {}
      this._fitPageScroll();
      return true;
    };
    // A tap BEFORE typing starts snaps the title home and begins the typewriter immediately
    // (so an early tap can never make you miss it); a tap DURING typing fills the chunk.
    this._heroSkip = () => {
      if (done) return;
      if (!typing) { landTitle(); startTyping(); return; }
      fillChunk();
    };
    hero.addEventListener('click', () => { if (this._heroSkip) this._heroSkip(); });
    if (reduced) { if (title) title.style.opacity = '1'; typing = true; fillChunk(); return; }
    if (!title) { this._setTimeout(startTyping, 250); return; }
    // The title enters QUIETLY at its own spot (v499): the centred cinematic open now
    // belongs to the "Clarity" intro that precedes this page (Malik: two centred title
    // moments back to back stole from Clarity's). Fade + rise, a short breath, then the
    // body typewriter begins.
    title.style.opacity = '0';
    title.style.transform = 'translateY(12px)';
    title.style.transition = 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)';
    this._setTimeout(() => { if (done || typing) return; title.style.opacity = '1'; title.style.transform = ''; }, 250);
    this._setTimeout(() => { if (done || typing) return; landTitle(); startTyping(); }, 1200);
  },

  // Typewriter for the standard teaching pages (scale pages), same theme as the hero:
  // illustration + headline keep their CSS entrance, then the body paragraphs type in
  // one by one with bold runs already bold as they type. A tap fills everything. On the
  // "How Focus Works" page the overlay runs first and hands off via this._tutTypeStart.
  // The star page keeps its own cinematic (the star is the moment there). (Malik, v551)
  _runTutType() {
    const tut = this.pageWrap && this.pageWrap.querySelector('.clarity-exp__tut');
    const lines = tut ? [...tut.querySelectorAll('.tut-sub__line')] : [];
    if (!tut || !lines.length || tut.dataset.typeRan) return;
    tut.dataset.typeRan = '1';
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const nav = this.navEl;
    if (nav && !reduced) { nav.style.transition = 'none'; nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; void nav.offsetWidth; nav.style.transition = 'opacity 0.45s ease'; }
    const showNav = () => { if (nav) { nav.style.opacity = '1'; nav.style.pointerEvents = ''; } };
    // Stash each line's inline runs (text + bold spans) and reserve its height, then clear.
    lines.forEach((l) => {
      l.__segs = [...l.childNodes].map((node) => ({ el: node.nodeType === 1 ? node.cloneNode(false) : null, text: node.textContent || '' }));
      l.__len = l.__segs.reduce((a, s) => a + s.text.length, 0);
      l.dataset.full = l.innerHTML;
      l.__h = l.offsetHeight;
      l.style.minHeight = l.__h + 'px';
      l.textContent = '';
    });
    // Two paragraphs at a time (Malik, v552): illustration + headline persist, Continue
    // swaps in the next pair via this._chunkNext. Keeps every page scroll-free on mobile.
    const CH = 2;
    const chunks = []; for (let i = 0; i < lines.length; i += CH) chunks.push(lines.slice(i, i + CH));
    // Short orphan sentence rides with the previous pair (v553).
    if (chunks.length > 1) {
      const last = chunks[chunks.length - 1];
      if (last.length === 1 && (last[0].dataset.full || '').length < 60) { chunks.pop(); chunks[chunks.length - 1].push(last[0]); }
    }
    let chunkIdx = 0;
    this._chunkIdx = 0;
    this._chunkTotal = chunks.length;
    const seen = new Set([0]);
    const layoutChunk = () => {
      lines.forEach((l) => { l.style.display = 'none'; });
      chunks[chunkIdx].forEach((l) => { l.style.display = ''; l.style.transition = ''; l.style.opacity = '1'; });
    };
    // Lock the sub container to the TALLEST chunk so the illustration + headline never
    // shift when a shorter pair swaps in (v553).
    const subWrap = tut.querySelector('.clarity-exp__tut-sub');
    if (subWrap) {
      const GAP = 15;
      const maxH = Math.max(...chunks.map((c) => c.reduce((a, l) => a + (l.__h || 0), 0) + GAP * (c.length - 1)));
      subWrap.style.minHeight = maxH + 'px';
    }
    // First chunk laid out NOW (same tick as render) so the first paint is final geometry.
    layoutChunk();
    let done = false;
    let typing = false;
    const typeLineEl = (el, onDone) => {
      const segs = el.__segs || []; const len = el.__len || 0; let i = 0;
      const renderUpto = (n) => {
        el.textContent = '';
        let rem = n;
        for (const s of segs) {
          if (rem <= 0) break;
          const take = Math.min(rem, s.text.length);
          const slice = s.text.slice(0, take);
          if (s.el) { const c = s.el.cloneNode(false); c.textContent = slice; el.appendChild(c); }
          else { el.appendChild(document.createTextNode(slice)); }
          rem -= take;
        }
      };
      const tick = () => {
        if (done) return;
        renderUpto(i); i++;
        try { if (typeof MementoSound !== 'undefined') MementoSound.tick(); } catch (e) {}
        if (i <= len) this._setTimeout(tick, 11 + Math.random() * 9);
        else { el.innerHTML = el.dataset.full || ''; onDone(); }
      };
      tick();
    };
    const typeChunk = () => {
      const arr = chunks[chunkIdx]; let i = 0;
      const step = () => {
        if (done) return;
        if (i >= arr.length) { done = true; showNav(); return; }
        typeLineEl(arr[i], () => { i++; this._setTimeout(step, 650); });
      };
      step();
    };
    const fillChunk = () => { done = true; layoutChunk(); chunks[chunkIdx].forEach((l) => { l.innerHTML = l.dataset.full || ''; }); showNav(); };
    const startTyping = () => { if (typing || done) return; typing = true; typeChunk(); };
    this._chunkNext = () => {
      if (!done || chunkIdx >= chunks.length - 1) return false;
      done = false;
      if (nav) { nav.style.opacity = '0'; nav.style.pointerEvents = 'none'; }
      const cur = chunks[chunkIdx];
      cur.forEach((l) => { l.style.transition = 'opacity 0.3s ease'; l.style.opacity = '0'; });
      this._setTimeout(() => {
        chunkIdx++;
        this._chunkIdx = chunkIdx;
        this.updateNav();
        try { this.pageWrap.scrollTop = 0; } catch (e) {}
        this._fitPageScroll();
        if (reduced || seen.has(chunkIdx)) { fillChunk(); return; }
        seen.add(chunkIdx);
        chunks[chunkIdx].forEach((l) => { l.textContent = ''; });
        layoutChunk();
        typeChunk();
      }, 330);
      return true;
    };
    this._chunkPrev = () => {
      if (chunkIdx <= 0) return false;
      done = true;
      chunkIdx--;
      this._chunkIdx = chunkIdx;
      fillChunk();
      this.updateNav();
      try { this.pageWrap.scrollTop = 0; } catch (e) {}
      this._fitPageScroll();
      return true;
    };
    if (reduced) { this._tutTypeStart = null; typing = true; fillChunk(); return; }
    this._tutTypeStart = startTyping;
    tut.addEventListener('click', () => { if (!typing) startTyping(); else fillChunk(); });
    // No focus overlay pending: start once the illustration + headline have landed.
    if (!this.el.querySelector('.clarity-focus-ov')) this._setTimeout(startTyping, 900);
  },

  // The Neutron Star page shows its paragraphs ONE at a time with a fade (no typewriter,
  // the star owns that page's motion). Continue swaps paragraphs via _chunkNext, keeping
  // the page scroll-free on phones. (Malik, v552)
  _runStarChunks() {
    const tut = this.pageWrap && this.pageWrap.querySelector('.clarity-exp__tut');
    const lines = tut ? [...tut.querySelectorAll('.tut-sub__line')] : [];
    if (!tut || lines.length < 2 || tut.dataset.starChunksRan) return;
    tut.dataset.starChunksRan = '1';
    let idx = 0;
    this._chunkIdx = 0;
    this._chunkTotal = lines.length;
    lines.forEach((l, i) => { if (i > 0) l.style.display = 'none'; });
    // Lock the sub to the tallest paragraph so the star never shifts between them (v553).
    const subWrap = tut.querySelector('.clarity-exp__tut-sub');
    if (subWrap) subWrap.style.minHeight = Math.max(...lines.map((l) => l.offsetHeight || 0)) + 'px';
    // The star page NEVER scrolls (Malik, v559): scrolling shifted the pinned geometry
    // and iOS pauses the canvas animation mid-scroll. Runs after _fitPageScroll's own
    // 150ms pass so it can't be re-enabled.
    const lockScroll = () => this._setTimeout(() => { try { this.pageWrap.style.overflowY = 'hidden'; this.pageWrap.scrollTop = 0; } catch (e) {} }, 200);
    lockScroll();
    const show = (i, fadeIn) => {
      lines.forEach((l) => { l.style.display = 'none'; });
      const nx = lines[i];
      nx.style.display = '';
      if (fadeIn) {
        nx.style.opacity = '0'; nx.style.transition = 'opacity 0.5s ease';
        void nx.offsetWidth; nx.style.opacity = '1';
      } else { nx.style.transition = ''; nx.style.opacity = '1'; }
      try { this.pageWrap.scrollTop = 0; } catch (e) {}
      lockScroll();
    };
    this._chunkNext = () => {
      if (idx >= lines.length - 1) return false;
      const cur = lines[idx];
      cur.style.transition = 'opacity 0.3s ease'; cur.style.opacity = '0';
      this._setTimeout(() => {
        idx++;
        this._chunkIdx = idx;
        this.updateNav();
        show(idx, true);
      }, 320);
      return true;
    };
    this._chunkPrev = () => {
      if (idx <= 0) return false;
      idx--;
      this._chunkIdx = idx;
      this.updateNav();
      show(idx, false);
      return true;
    };
  },

  // Native feel (Malik): if the page's content FITS the screen, kill scrolling entirely so
  // idle swipes do nothing (no rubber-band). Pages that genuinely overflow keep scrolling.
  _fitPageScroll() {
    try {
      const pw = this.pageWrap;
      if (!pw) return;
      this._setTimeout(() => { try { pw.style.overflowY = (pw.scrollHeight > pw.clientHeight + 2) ? '' : 'hidden'; } catch (e) {} }, 150);
    } catch (e) {}
  },

  renderPage(index) {
    // In tutorial-only mode, always render tutorial pages
    if (this.tutorialOnly) {
      if (index < this.totalTutorialPages) {
        this.pageWrap.innerHTML = this.renderTutorialPage(index);
        // Intros run SYNCHRONOUSLY (same tick as the render) so they hide their page
        // content BEFORE the first paint. The old 30ms defer let the finished page
        // flash for a frame before the intro covered it (Malik saw it on-device).
        this._tutTypeStart = null;
        this._chunkNext = null;
        this._chunkPrev = null;
        this._chunkIdx = 0;
        this._chunkTotal = 0;
        if (this.pageWrap.querySelector('.clarity-tut-hero')) this._runHeroIntro();
        if (this.pageWrap.querySelector('.gs-focus-target')) this._runFocusIntro();
        if (this.pageWrap.querySelector('.clarity-reflect')) this._runReflectIntro();
        if (this.pageWrap.querySelector('.tut-sub__line') && !this.pageWrap.querySelector('.tut-star-stage')) this._runTutType();
        if (this.pageWrap.querySelector('.tut-star-stage')) this._runStarChunks();
        // Star page: same init + cinematic entrance as the wizard path (v557).
        const tutStarBlob = document.getElementById('tutStarBlob');
        if (tutStarBlob) {
          setTimeout(() => initStarBlob(tutStarBlob, 480, 'pulsar'), 50);
          this._runStarIntro();
        }
        this._fitPageScroll();
      }
      return;
    }
    const offset = this.getWizardOffset();
    let html = '';

    if (index < offset) {
      // Tutorial page
      html = this.renderTutorialPage(index);
    } else {
      // Wizard step
      const wizIdx = index - offset;
      wizardStep = wizIdx;
      html = '<div class="clarity-exp__page-inner">' + renderWizard() + '</div>';
    }

    this.pageWrap.innerHTML = html;
    // Synchronous (same tick as the render) so each intro hides its page content BEFORE
    // the first paint; the old 30ms defer flashed the finished page for a frame (Malik).
    this._tutTypeStart = null;
    this._chunkNext = null;
    this._chunkPrev = null;
    this._chunkIdx = 0;
    this._chunkTotal = 0;
    if (this.pageWrap.querySelector('.clarity-tut-hero')) this._runHeroIntro();
    if (this.pageWrap.querySelector('.gs-focus-target')) this._runFocusIntro();
    if (this.pageWrap.querySelector('.clarity-reflect')) this._runReflectIntro();
    if (this.pageWrap.querySelector('.tut-sub__line') && !this.pageWrap.querySelector('.tut-star-stage')) this._runTutType();
    if (this.pageWrap.querySelector('.tut-star-stage')) this._runStarChunks();
    this._fitPageScroll();

    // Track whether we're on the Neutron Star summary view (last wizard step,
    // synthesis complete). If yes, persist so a refresh restores it.
    try {
      const steps = getWizardSteps();
      const wizIdx = index - offset;
      const stepKey = steps[wizIdx];
      // v764 (Malik's resume law: land them where they were or BEHIND, never
      // ahead): the summary checkpoint only exists once the hold-to-collapse is
      // DONE (ignitedAt). Before that, renderAiSynthesis shows the ceremony, and
      // remembering 'claritySummary' here made an app kill + relaunch skip the
      // hold entirely.
      const isSummary = stepKey === 'aiSynthesis' && !!aiSynthesisResult && !!(state.clarity && state.clarity.ignitedAt);
      if (state.ui) {
        const desired = isSummary ? 'claritySummary' : null;
        // Don't clobber other view types (e.g., 'action').
        if (isSummary) {
          if (recallView() !== 'claritySummary') rememberView('claritySummary');
        } else if (recallView() === 'claritySummary') {
          rememberView(null);
        }
      }
    } catch (e) {}

    // Bind wizard events if on a wizard page
    if (index >= offset) {
      this.bindWizardInFullscreen();
    }

    // Init the star on the neutron star tutorial page + its cinematic entrance.
    // 'pulsar' = the calm Magnetar Malik picked (flowing polar jets + quiet breath);
    // to REVERT to the classic marbled blob, just drop the 'pulsar' argument.
    const starBlob = document.getElementById('tutStarBlob');
    if (starBlob) {
      setTimeout(() => initStarBlob(starBlob, 480, 'pulsar'), 50);
      this._runStarIntro();
    }

    // Init reflection page timer
    const timerBtns = this.pageWrap.querySelectorAll('.clarity-reflect__timer-btn');
    if (timerBtns.length) {
      let timerInterval = null;
      timerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (timerInterval) clearInterval(timerInterval);
          timerBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          let secs = parseInt(btn.dataset.mins) * 60;
          const countdownEl = document.getElementById('clarityReflectCountdown');
          const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
          countdownEl.textContent = fmt(secs);
          countdownEl.classList.remove('done');
          timerInterval = setInterval(() => {
            secs--;
            if (secs <= 0) {
              clearInterval(timerInterval);
              countdownEl.textContent = "Time's up - ready when you are.";
              countdownEl.classList.add('done');
              btn.classList.remove('active');
            } else {
              countdownEl.textContent = fmt(secs);
            }
          }, 1000);
        });
      });
    }
  },

  renderTutorialPage(index) {
    const pages = [
      // Page 0  - The hook: a bold promise that frames the whole module as THE method.
      // (Replaced the old "Step 1: Know what you want and why" page, which just repeated
      // the intro. That thesis is now the earned payoff at the end, via the Solution +
      // Neutron Star pages.)
      {
        _hero: true,
        heroTitle: 'How to achieve<br>literally anything',
        heroSub: "If you study the most successful people, either dead or alive, read hundreds of books, watch thousands of videos, and learn from every kind of person across every walk of life, you'll get a thousand different answers on: how to \"be successful\".<br><br>But the common denominator between every success story, no matter how big or niche, is that they took: <strong style=\"color:rgba(var(--ink),1)\">consistent, focused action, in one direction, over a long period of time.</strong><br><br>This isn't just a nice-to-have, but it's a requirement. Without that, you can't achieve much of anything.<br><br>The very first step, before you even start, is to find a mission you care about above all else. One you're willing to commit to and suffer for over an extended period of time.<br><br>Once you find a mission you can obsess over, where not achieving it would feel like a piece of your life is missing, that's when progress becomes automatic. Focus stops being a constant war, and moving toward it becomes inevitable.<br><br>This is the first step we're going to accomplish now."
      },
      // Page 1  - Scale intro (tilted left, distractions heavy)
      {
        illust: `<div class="gs">
          <div class="gs__fulcrum"></div>
          <div class="gs__beam gs__beam--tilt">
            <div class="gs__weight gs__weight--red" style="position:absolute;bottom:6px;left:-4px;"></div>
            <div class="gs__weight gs__weight--purple" style="position:absolute;bottom:6px;right:-2px;"></div>
          </div>
        </div>`,
        headline: 'Think About Your <span class="gs-focus-target">Focus</span> like a Scale',
        sub: "At all times, there's an invisible scale guiding your attention.<br><br>Your brain will always default to the heavier side automatically, unless actively fought (more on that in a second).<br><br>For most people, the heaviest side is distractions, typically instant gratification activities.<br><br>They're the heaviest and easiest weights to reach for, which throws the scale off balance, automatically draws your attention toward them, and makes it difficult for your brain to focus on the other side.<br><br>We need to fix this."
      },
      // Page 2  - Willpower doesn't work long term
      {
        illust: `<div class="gs">
          <div class="gs__fulcrum"></div>
          <div class="gs__beam gs__beam--push">
            <div class="gs__weight gs__weight--red" style="position:absolute;bottom:6px;left:-4px;"></div>
            <div class="gs__weight gs__weight--purple" style="position:absolute;bottom:6px;right:-2px;"></div>
            <div class="gs__hand" style="position:absolute;bottom:52px;right:10px;"></div>
          </div>
        </div>`,
        headline: 'Most solutions don\'t work long term',
        sub: 'Some people try to fix this by using sheer will power. But willpower is a limited resource. It\'s fine for quick bursts and getting started. But long term, if relied on, will only lead to burnout and quitting.'
      },
      // Page 3  - Digital minimalism (removing weight but still heavier)
      {
        illust: `<div class="gs">
          <div class="gs__fulcrum"></div>
          <div class="gs__beam gs__beam--shrink">
            <div class="gs__weight gs__weight--red-shrink" style="position:absolute;bottom:6px;left:-4px;"></div>
            <div class="gs__weight gs__weight--purple" style="position:absolute;bottom:6px;right:-2px;"></div>
          </div>
        </div>`,
        headline: '<span style="font-size:clamp(20px,5vw,26px)">Removing distractions alone isn\'t enough</span>',
        sub: 'Deleting apps, breaking your phone, and removing other distractions can help, but distractions are going to continue to grow as the world becomes faster and more comfortable (more on this later).<br><br>Even if you shrink the left side by 90%, if it still outweighs a pebble on the right, it won\'t matter long term.<br><br>Removal won\'t hurt you, but it\'s not <strong style="color:rgba(var(--ink),1)">the solution</strong>.'
      },
      // Page 4  - The ultimate goal: flip the scale
      {
        illust: `<div class="gs">
          <div class="gs__dot"></div>
          <div class="gs__fulcrum"></div>
          <div class="gs__beam gs__beam--flip">
            <div class="gs__weight gs__weight--red-dim" style="position:absolute;bottom:6px;left:-4px;"></div>
            <div class="gs__weight gs__weight--purple-big" style="position:absolute;bottom:6px;right:-2px;"></div>
          </div>
        </div>`,
        headline: 'The Solution: Break the Scale',
        sub: 'The best long-term solution, is to have a weight so overwhelming on the other side, that it makes the other side irrelevant.<br><br>Here\'s the thing about your brain: it only truly fights for <strong style="color:rgba(var(--ink),1)">needs</strong>. Wants weigh almost nothing. You don\'t NEED to get in shape, you want to. You don\'t NEED to chase that goal, you want to. And your brain knows it, so it defaults to the easy side every time.<br><br>But the moment a goal stops being a want and becomes a <strong style="color:rgba(var(--ink),1)">need</strong>, your brain stops fighting you and starts working for you. That\'s the weight we\'re after.'
      },
      // Page 5  - The payoff (neutron star)
      {
        illust: `<div class="tut-star-stage"><div class="tut-star-halo"></div><canvas class="tut-star-blob" id="tutStarBlob" width="320" height="320"></canvas></div>`,
        headline: 'Discover your Neutron Star',
        sub: 'I call this weight the Neutron Star. One of the densest and heaviest objects in existence, a single teaspoon of one weighs billions of tons.<br><br>Your Neutron Star is a goal so worthy, connected to a why so strong, that it becomes a need. Something you\'re willing to suffer for.<br><br>Once you find it, focus stops being a war. Your brain defaults to it automatically, and progression towards it is how you make achievement automatic.'
      },
      // Page 7  - Reflection pause before questions
      { _reflect: true }
    ];

    const p = pages[index];

    if (p._reflect) {
      // The headline is a span (like the hero's) so _runReflectIntro can type it centred
      // then glide it home; the body is split into line divs for the one-by-one reveal.
      return `<div class="clarity-exp__page-inner">
        <div class="clarity-exp__tut clarity-reflect">
          <div class="clarity-reflect__headline"><span class="clarity-reflect__headline-in">One last thing before we begin.</span></div>
          <div class="clarity-reflect__body">
            <div class="clarity-reflect__line">I want you to genuinely sit with one question:</div>
            <div class="clarity-reflect__line clarity-reflect__question">"What's the one mission or goal you want to dedicate yourself to?"</div>
            <div class="clarity-reflect__line">This question is not an attempt to pressure or intimidate you, but instead, an invitation for you to really sit with it and see where it takes you.</div>
            <div class="clarity-reflect__line">A good compass: what's the thing you can't stop thinking about? The thing that nags at the back of your mind, that every conversation somehow turns back to?</div>
            <div class="clarity-reflect__line">Most of us spend our younger years gaming, scrolling, distracted, doing things for other people but not for ourselves. Out of our entire lives, we might have genuinely thought about our own direction for maybe five minutes total. Which is really scary if you think about it.</div>
            <div class="clarity-reflect__line">If you never focus inward on yourself, how can you expect to improve yourself? So if you can, seriously take the time to think about it for a minute.</div>
          </div>
        </div>
      </div>`;
    }

    if (p._hero) {
      const heroLines = String(p.heroSub).split('<br><br>').map(s => `<div class="clarity-tut-hero__line">${s}</div>`).join('');
      return `<div class="clarity-exp__page-inner">
        <div class="clarity-exp__tut clarity-tut-hero">
          <div class="clarity-tut-hero__title"><span class="clarity-tut-hero__title-in">${p.heroTitle}</span></div>
          <div class="clarity-tut-hero__lines">${heroLines}</div>
        </div>
      </div>`;
    }

    // The sub splits into paragraph lines so the typewriter (_runTutType) can
    // type them one by one, same theme as the hero + intro (Malik, v551).
    const subLines = String(p.sub).split('<br><br>').map(s => `<div class="tut-sub__line">${s}</div>`).join('');
    return `<div class="clarity-exp__page-inner">
      <div class="clarity-exp__tut">
        <div class="clarity-exp__tut-illust">${p.illust}</div>
        <div class="clarity-exp__tut-headline">${p.headline}</div>
        <div class="clarity-exp__tut-sub">${subLines}</div>
      </div>
    </div>`;
  },

  // v523-v527 (Malik, on-device iteration): iOS overshoots its keyboard pan
  // even when the layout leaves the field fully visible above the keyboard,
  // so once the shove stops moving we settle the view back to rest. Lives in
  // bindKeyboardSettle (module scope, below the ClarityExperience object).
  // Precondition for using it on a new surface:
  // the field must sit HIGH (fixed ~30vh anchor) so zero-pan is a position
  // iOS accepts instead of re-panning.
  _bindWizSnapBack(container) {
    const field = container.querySelector('.wiz__composer .wiz__textarea');
    bindKeyboardSettle(this, field);
  },

  // Public hook so the AI questionnaire (js/03, the "My own answer" and
  // free-text fields) can reuse the same proven keyboard-settle recipe.
  // Precondition (same as _bindWizSnapBack): the field must already sit HIGH.
  settleFieldOnFocus(field) {
    bindKeyboardSettle(this, field);
  },
  clearFieldSettle() {
    if (this._kbSettleCleanup) { this._kbSettleCleanup(); this._kbSettleCleanup = null; }
  },

  bindWizardInFullscreen() {
    const container = this.pageWrap;
    const stepKey = getWizardSteps()[wizardStep];

    // Bind option clicks (no re-render  - just toggle classes)
    container.querySelectorAll('.wiz__option, .wiz__domain-tile').forEach(opt => {
      opt.addEventListener('click', () => {
        const key = opt.dataset.key || stepKey;
        const val = opt.dataset.value;
        if (!val) return;
        const isMulti = opt.querySelector('.wiz__option-check');
        // "Something else" / "I have no idea" are exclusive AND bypass the 2-pick max
        // gate (at max their clicks were silently swallowed, Malik v562): tapping one
        // replaces the whole selection; tapping it again clears it. The resync block
        // below repaints every tile.
        const isExclusiveDiscover = isMulti && key === 'discoverDomain' && (val === 'other' || val === 'no_idea');
        if (isExclusiveDiscover) {
          const cur = wizardAnswers[key] || [];
          wizardAnswers[key] = cur.includes(val) ? [] : [val];
          const clarityEl = document.getElementById('clarityExp');
          const warn = clarityEl ? clarityEl.querySelector('.wiz__limit-msg--warn') : null;
          if (warn) warn.remove();
        } else if (isMulti) {
          const arr = wizardAnswers[key] || [];
          const maxMap = { apps: 3, discoverDomain: 2 };
          const max = maxMap[key] || 99;
          const wasAtMax = arr.length >= max;
          if (arr.includes(val)) {
            // Deselect
            wizardAnswers[key] = arr.filter(v => v !== val);
            opt.classList.remove('selected');
            const check = opt.querySelector('.wiz__option-check, .wiz__domain-tile-check');
            if (check) check.textContent = '';
            // If was at max, unlock other options & remove warning
            if (wasAtMax) {
              container.querySelectorAll('[data-key="' + key + '"]').forEach(o => {
                o.classList.remove('wiz__option--locked');
              });
              const clarityEl = document.getElementById('clarityExp');
              const warn = clarityEl ? clarityEl.querySelector('.wiz__limit-msg--warn') : container.querySelector('.wiz__limit-msg--warn');
              if (warn) warn.remove();
            }
          } else if (arr.length < max) {
            // Select
            wizardAnswers[key] = [...arr, val];
            opt.classList.add('selected');
            const check = opt.querySelector('.wiz__option-check, .wiz__domain-tile-check');
            if (check) check.textContent = '\u2713';
            // If now at max, lock unselected options & show warning
            if (wizardAnswers[key].length >= max) {
              container.querySelectorAll('[data-key="' + key + '"]').forEach(o => {
                if (!o.classList.contains('selected')) o.classList.add('wiz__option--locked');
              });
              // Show floating toast warning
              const clarityEl = document.getElementById('clarityExp');
              if (clarityEl && !clarityEl.querySelector('.wiz__limit-msg--warn')) {
                const warn = document.createElement('div');
                warn.className = 'wiz__limit-msg wiz__limit-msg--warn';
                warn.textContent = key === 'discoverDomain'
                  ? 'Focus on one or two areas. Spreading across three won\u2019t let you build real momentum.'
                  : 'You can only pick ' + max + '. Deselect one to choose a different.';
                clarityEl.appendChild(warn);
                // Auto-dismiss after 3 seconds
                setTimeout(() => { if (warn.parentNode) warn.remove(); }, 3000);
              }
            }
          }
        } else {
          const prevVal = wizardAnswers[key];
          wizardAnswers[key] = val;
          // If this is domainDrilldown and "other" was toggled, re-render to show/hide text input
          if (key === 'domainDrilldown' && (val === 'other_custom' || prevVal === 'other_custom')) {
            this.renderPage(this.currentPage);
            this.bindWizardInFullscreen();
            this.updateNav();
            return;
          }
          container.querySelectorAll('.wiz__option[data-key="' + key + '"]').forEach(o => {
            o.classList.toggle('selected', o.dataset.value === val);
          });
        }
        // "Something else" and "I have no idea" are EXCLUSIVE (Malik, v562): picking
        // either clears every other selection, and picking a normal area clears them.
        // Then re-sync every tile's selected/check/locked state from the answer array.
        if (key === 'discoverDomain') {
          const arrNow = wizardAnswers[key] || [];
          if ((val === 'other' || val === 'no_idea') && arrNow.includes(val)) {
            wizardAnswers[key] = [val];
          } else if (arrNow.includes(val)) {
            wizardAnswers[key] = arrNow.filter(v => v !== 'other' && v !== 'no_idea');
          }
          const arr = wizardAnswers[key] || [];
          container.querySelectorAll('[data-key="discoverDomain"]').forEach(o => {
            const on = arr.includes(o.dataset.value);
            o.classList.toggle('selected', on);
            const chk = o.querySelector('.wiz__option-check, .wiz__domain-tile-check');
            if (chk) chk.textContent = on ? '✓' : '';
            o.classList.toggle('wiz__option--locked', !on && arr.length >= 2);
          });
        }
        // "Something else" on the discover grid: reveal its always-in-DOM text field
        // (clicks don't re-render the step, so a conditional render never appeared;
        // Malik's bug, v560). Focus it when just selected.
        if (key === 'discoverDomain') {
          const inp = container.querySelector('#discoverOtherInput');
          if (inp) {
            const show = (wizardAnswers.discoverDomain || []).includes('other');
            inp.style.display = show ? '' : 'none';
            // While "Something else" is SELECTED (not just while the keyboard is up,
            // v563: dismissing the keyboard used to snap the full grid back and hide
            // their answer), collapse everything but the selected tiles so the field
            // sits high above the iOS keyboard and stays reviewable before Next.
            // The settle hook absorbs the iOS focus shove. (v561)
            if (!inp._settleBound) {
              inp._settleBound = true;
              if (typeof this.settleFieldOnFocus === 'function') this.settleFieldOnFocus(inp);
              inp.addEventListener('focus', () => { try { this.pageWrap.scrollTop = 0; } catch (e) {} });
            }
            try { this.el.classList.toggle('has-discover-custom', show); if (show) this.pageWrap.scrollTop = 0; } catch (e) {}
            if (show && val === 'other') { try { inp.focus(); } catch (e) {} }
          }
        }
        this.updateNav();
      });
    });

    // Bind free text inputs
    container.querySelectorAll('.wiz__textarea, input.wiz__text-input').forEach(input => {
      if (input._wizBound) return;
      input._wizBound = true;
      const key = input.dataset.key || input.id?.replace('wizFreeText_', '');
      if (key) {
        input.addEventListener('input', () => {
          wizardAnswers[key] = input.value;
          autoGrowTextarea(input);
          pauseOrbitDuringTyping(input);
          debouncedUpdateNav(ClarityExperience);
        });
        // Enter advances (Shift+Enter = newline in textarea)
        if (input.tagName === 'TEXTAREA') {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              const nb = document.getElementById('cexpNext');
              if (nb && !nb.disabled) { e.preventDefault(); nb.click(); }
            }
          });
          // Add speech-to-text mic button for textareas
          const micBtn = initSpeechToText(input, (val) => {
            wizardAnswers[key] = val;
            debouncedUpdateNav(ClarityExperience);
          });
          if (micBtn) {
            const wrap = input.closest('.wiz__text-wrap');
            if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(micBtn); input.style.paddingRight = '48px'; }
          }
        } else {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              const nb = document.getElementById('cexpNext');
              if (nb && !nb.disabled) { e.preventDefault(); nb.click(); }
            }
          });
        }
      }
    });

    // Free-text pages (Duolingo geometry, v519): iOS pans exactly as far as
    // needed to put the focused field at its preferred spot above the
    // keyboard, so the fix is to give it NOTHING to do: field high on the
    // screen right under the question, and the page made non-scrollable so
    // there is no slack to fling. The root class drives that layout in CSS.
    if (this.el) this.el.classList.toggle('has-wiz-composer', !!container.querySelector('.wiz__composer'));
    // Keep the discover grid collapsed across re-renders while "Something else" is
    // selected; clear the class on every other step (v563).
    if (this.el) this.el.classList.toggle('has-discover-custom', !!(container.querySelector('#discoverOtherInput') && (wizardAnswers.discoverDomain || []).includes('other')));
    this._bindWizSnapBack(container);

    // Bind AI chat if on that step (the AI service is built in; there is no
    // key-entry state anymore).
    if (stepKey === 'aiChat' && hasAnthropicKey()) {
      bindAiChat(container);
    }

    // Bind AI synthesis retry + init orb
    if (stepKey === 'aiSynthesis') {
      // Ignition ceremony showing? Bind it and stop: the summary card is not
      // in the DOM yet (it renders after the hold-to-ignite completes).
      if (container.querySelector('#nsIgniteRoot')) {
        bindIgnitionSequence(container);
        return;
      }
      if (container.querySelector('#nsv2Root')) {
        bindIgnitionV2(container);
        return;
      }
      const retryBtn = container.querySelector('#aiSynthRetry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => triggerSynthesis());
      }
      const actionBtn = container.querySelector('#summaryAction');
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          _addToMementoThenAction(() => { try { completeWizard(); } catch (e) {} });
        });
      }
      const continueBtn2 = container.querySelector('#summaryContinue');
      if (continueBtn2) {
        continueBtn2.addEventListener('click', () => {
          this.prev();
        });
      }
      const redoBtn2 = container.querySelector('#summaryRedo');
      if (redoBtn2) {
        redoBtn2.addEventListener('click', () => {
          // Same gate, same reason as the summary's redo: a second discovery
          // run is the paid thing, and wiping `completed` first would walk
          // straight past open()'s check.
          try {
            if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) {
              this.close();
              ClarityPaywall.show();
              return;
            }
          } catch (e) {}
          try { const gp = state.goalProgress; if (gp) gp.refineFrom = ''; } catch (e) {}
          state.clarity.completed = false;
          state.clarity.tutorialSeen = false;
          delete state.clarity.draft;
          state.clarity.answers = {};
          persistNow();
          this.close();
          setTimeout(() => ClarityExperience.open(), 500);
        });
      }
      // Three swipeable pages: the star, the summary, the notes (phase 1 of
      // the Clarity merge). The wizard's own synthesis step lands here too.
      clarityUpgradeSummaryToPager(container);
      // Init the 3D card on the neutron star summary
      const _wizSelf = this;
      setTimeout(() => initNeutronStarCard(null, () => _wizSelf.prev()), 50);
    }
  },


  next() {
    if (this.transitioning) return;
    // Chunked teaching pages (v552): Continue steps through the paragraph pairs on the
    // current page first; only once the last pair is showing does it navigate.
    if (this._chunkNext) { try { if (this._chunkNext()) return; } catch (e) {} }
    // FLIPPED flow (v556): leaving the hero plays the "Clarity" cinematic intro once;
    // its Begin then drops into the scale pages (page 1).
    if (this._introPending && this.currentPage === 0) {
      this._introPending = false;
      this._showClarityIntro();
      return;
    }
    const offset = this.getWizardOffset();
    const total = this.getTotalPages();

    // Tutorial-only mode: close on last tutorial page
    if (this.tutorialOnly) {
      if (this.currentPage >= this.totalTutorialPages - 1) {
        this.close();
        return;
      }
      this.transitionTo(this.currentPage + 1, 'forward');
      return;
    }

    // (The "Clarity" cinematic intro now runs at OPEN, before page 0, so page 0's
    // Continue is plain navigation: hero -> scale. No one-time branch here anymore.)

    // Validate wizard step if applicable
    if (!this.tutorialOnly && this.currentPage >= offset) {
      const stepKey = getWizardSteps()[wizardStep];
      if (!wizardStepValid(stepKey)) return;
    }

    // Transitioning from last tutorial page to first wizard step.
    // "Let's Find Yours" first takes a visible beat to pull in their onboarding answers,
    // so the handoff feels continuous instead of dropping straight into a question (Malik).
    // The AI side already receives buildProfileContext(); this makes that loading FELT.
    if (!state.clarity.tutorialSeen && this.currentPage === this.totalTutorialPages - 1) {
      state.clarity.tutorialSeen = true;
      persistState();
      // Reset to page 0 since offset is now 0
      this._showContextLoad(() => { if (this.isOpen) this.transitionTo(0, 'forward'); });
      return;
    }

    // AI Chat step: either send answer for next question, or advance to synthesis
    if (!this.tutorialOnly && this.currentPage >= offset) {
      const currentStepKey = getWizardSteps()[wizardStep];
      if (currentStepKey === 'aiChat') {
        if (aiChatReady) {
          // AI is done - advance to synthesis. If a final answer is sitting in
          // the composer (the ready beat still shows one), it joins the
          // transcript so the star is forged from it too (v722).
          try {
            if ((aiUserAnswer || '').trim()) {
              aiChatMessages.push({ role: 'user', content: aiUserAnswer.trim() });
              aiUserAnswer = '';
            }
          } catch (e) {}
          this.transitionTo(this.currentPage + 1, 'forward');
          setTimeout(() => {
            if (!aiSynthesisResult && !aiSynthesisLoading) {
              triggerSynthesis();
            }
          }, 350);
        } else {
          // Send current answer, get next AI question
          sendAiAnswer();
        }
        return;
      }
    }

    // Check if this is the last page (complete wizard)
    if (this.currentPage >= total - 1) {
      completeWizard();
      return;
    }

    this.transitionTo(this.currentPage + 1, 'forward');
  },

  back() {
    if (this.transitioning) return;
    // Chunked teaching pages (v553): Back steps to the previous paragraph pair first.
    if (this._chunkPrev) { try { if (this._chunkPrev()) return; } catch (e) {} }

    // If in AI chat with history, go back one question
    const offset = this.getWizardOffset();
    const steps = getWizardSteps();
    const currentStepKey = steps[this.currentPage - offset];

    // Going back from synthesis: restore the last AI question state and re-enter aiChat live
    if (currentStepKey === 'aiSynthesis') {
      // Wipe the failed synthesis result/error so it doesn't auto-trigger again
      aiSynthesisResult = null;
      aiSynthesisLoading = false;
      aiChatError = null;
      if (aiAbortController) { aiAbortController.abort(); aiAbortController = null; }
      // Reopen the conversation: bring back the last assistant question + the user's answer to it
      const lastAssistant = [...aiChatMessages].reverse().find(m => m.role === 'assistant');
      if (lastAssistant) {
        aiCurrentQuestion = lastAssistant.content || '';
        aiCurrentHint = lastAssistant._hint || '';
        aiCurrentType = lastAssistant._type || 'text';
        aiCurrentOptions = Array.isArray(lastAssistant._options) ? [...lastAssistant._options] : [];
        aiCurrentRange = lastAssistant._range || null;
      }
      // Surface the user's previous answer so they can edit it
      const lastUser = [...aiChatMessages].reverse().find(m => m.role === 'user');
      aiUserAnswer = lastUser ? (lastUser._rawAnswer || lastUser.content || '') : '';
      aiChatReady = false;
      aiChatLoading = false;
      this.transitionTo(this.currentPage - 1, 'backward');
      return;
    }

    if (currentStepKey === 'aiChat' && aiChatMessages.length > 1) {
      // Go back one question, restoring previous answer

      // Cache the current question so we can restore it if they don't change their answer
      const currentQ = aiChatMessages[aiChatMessages.length - 1];
      const cachedForward = currentQ.role === 'assistant' ? {
        question: currentQ.content, hint: currentQ._hint || '', type: currentQ._type || 'text',
        options: currentQ._options || [], range: currentQ._range || null
      } : null;

      // Remove current assistant question
      aiChatMessages.pop();

      // The user's answer to the previous question should now be at the end
      let previousAnswer = '';
      if (aiChatMessages.length > 0 && aiChatMessages[aiChatMessages.length - 1].role === 'user') {
        const userMsg = aiChatMessages.pop();
        previousAnswer = userMsg._rawAnswer || userMsg.content || '';
      }

      // Now the last message is the previous assistant question
      const prevQuestion = [...aiChatMessages].reverse().find(m => m.role === 'assistant');
      if (prevQuestion) {
        aiCurrentQuestion = prevQuestion.content;
        aiCurrentHint = prevQuestion._hint || '';
        aiCurrentType = prevQuestion._type || 'text';
        aiCurrentOptions = Array.isArray(prevQuestion._options) ? [...prevQuestion._options] : [];
        aiCurrentRange = prevQuestion._range || null;
      }
      // Restore previous answer so selections/text are visible
      aiUserAnswer = previousAnswer;
      aiChatReady = false;
      aiChatLoading = false;
      // Cache forward question so if they don't change answer, we skip the API call
      _aiWentBack = true;
      if (cachedForward) {
        _aiCachedForward = { ...cachedForward, prevAnswer: previousAnswer };
      }
      this.renderPage(this.currentPage);
      this.bindWizardInFullscreen();
      this.updateNav();
      return;
    }

    // If on first AI question (only 1 message), go back to previous wizard step
    if (currentStepKey === 'aiChat' && aiChatMessages.length <= 1) {
      // Reset AI state completely
      aiChatMessages = [];
      aiCurrentQuestion = '';
      aiCurrentHint = '';
      aiCurrentType = 'text';
      aiCurrentOptions = [];
      aiCurrentRange = null;
      aiUserAnswer = '';
      aiChatReady = false;
      aiChatLoading = false;
      this.transitionTo(this.currentPage - 1, 'backward');
      return;
    }

    // If on first wizard step and tutorial already seen, re-enter tutorial
    if (this.currentPage === 0 && state.clarity.tutorialSeen && !this.tutorialOnly) {
      state.clarity.tutorialSeen = false;
      // Jump to last tutorial page
      this.transitionTo(this.totalTutorialPages - 1, 'backward');
      return;
    }
    if (this.currentPage <= 0) return;
    this.transitionTo(this.currentPage - 1, 'backward');
  },

  transitionTo(newPage, direction) {
    this.transitioning = true;
    const inner = this.pageWrap.querySelector('.clarity-exp__page-inner');
    if (inner) {
      inner.classList.add('exit');
    }
    setTimeout(() => {
      this.currentPage = newPage;
      // Sync wizard step
      const offset = this.getWizardOffset();
      if (newPage >= offset) {
        wizardStep = newPage - offset;
      }

      // If going backward to a step before aiChat, reset AI state
      // so the AI will re-ask based on updated answers
      if (direction === 'backward') {
        const steps = getWizardSteps();
        const currentStepKey = steps[wizardStep];
        if (currentStepKey !== 'aiChat' && currentStepKey !== 'aiSynthesis') {
          aiChatMessages = [];
          aiChatReady = false;
          aiChatLoading = false;
          aiCurrentQuestion = '';
          aiCurrentHint = '';
          aiCurrentType = 'text';
          aiCurrentOptions = [];
          aiCurrentRange = null;
          aiUserAnswer = '';
          aiSynthesisResult = null;
          aiChatError = null;
          if (aiAbortController) { aiAbortController.abort(); aiAbortController = null; }
        }
      }

      this.renderPage(newPage);
      this.updateProgress();
      this.updateNav();
      this.transitioning = false;
    }, 250);
  },

  updateProgress() {
    // ONE thin bar pinned at the very top of the screen, under the close
    // button (Malik, 2026-07-03). Questionnaire pages only: the manual wizard
    // steps ramp 0-12%, the AI discovery carries 12-100% (aiChatPct, js/03).
    // Tutorial and synthesis pages render nothing.
    let pct = -1;
    if (!this.tutorialOnly) {
      const offset = this.getWizardOffset();
      const steps = getWizardSteps();
      const wizIdx = this.currentPage - offset;
      const stepKey = steps[wizIdx];
      if (wizIdx >= 0 && stepKey && stepKey !== 'aiSynthesis') {
        if (stepKey === 'aiChat') {
          pct = 12 + Math.round(0.88 * aiChatPct());
        } else {
          const aiIdx = Math.max(1, steps.indexOf('aiChat'));
          pct = Math.round(((wizIdx + 1) / (aiIdx + 1)) * 12);
        }
        pct = Math.max(2, Math.min(100, pct));
      }
    }
    // v629 (Malik): the AI discovery shows the SAME thin bar as the manual
    // questions again. The forming star moved off the top slot and now lives
    // center-screen as the thinking indicator (renderAiChat in js/03).
    if (pct < 0) {
      this.progressEl.innerHTML = '';
    } else {
      const fill = this.progressEl.querySelector('.ai-progress__fill');
      if (fill) {
        fill.style.width = pct + '%'; // keep the node so the width TRANSITIONS
      } else {
        this.progressEl.innerHTML = '<div class="ai-progress__bar"><div class="ai-progress__fill" style="width:' + pct + '%"></div></div>';
      }
    }
    // New page = scroll back at 0: reset the scroll-follow transform (v558).
    this.progressEl.style.transform = '';
    this.progressEl.style.opacity = '';
    this._syncLight();
  },

  // The light that builds: maps where the user is in the journey to the
  // .crays layer's intensity. Tutorial pages stay a whisper (the idea is
  // still forming), the questionnaire ramps steadily (each answer lets more
  // light in), and the synthesis/star moment gets full sun. The CSS handles
  // the slow 1.4s ease between levels.
  _setLight(v) {
    try { this.el.style.setProperty('--clarity-light', String(Math.max(0, Math.min(1, v)))); } catch (e) {}
  },
  _syncLight() {
    try {
      // The Neutron Star page keeps the top-left beams OFF (Malik: no beams here);
      // the star itself carries the moment.
      if (this.pageWrap && this.pageWrap.querySelector('.tut-star-blob')) { this._setLight(0); this._syncNebula(); return; }
      const offset = this.getWizardOffset();
      const total = this.getTotalPages();
      if (this.currentPage < offset) {
        this._setLight(0.06 + 0.10 * (this.currentPage / Math.max(1, offset)));
        this._syncNebula();
        return;
      }
      const steps = getWizardSteps();
      const key = steps[wizardStep];
      if (key === 'aiSynthesis') { this._setLight(1); this._syncNebula(); return; }
      // v580 (Malik): the QUESTIONS run in darkness. The beams are BORN the
      // moment the WHAT is confirmed (the Act 1 lock-check yes), then brighten
      // through the descent with real progress. Light = clarity, earned.
      let confirmed = false;
      let pct = 0;
      try {
        confirmed = (typeof aiChatMessages !== 'undefined') && aiChatMessages.some(m => m && m.role === 'assistant' && (m._act || 0) >= 2);
        pct = (typeof aiChatPct === 'function') ? (aiChatPct() / 100) : 0;
      } catch (eA) {}
      if (!confirmed) { this._setLight(0.02); this._syncNebula(); return; }
      this._setLight(0.3 + 0.6 * Math.max(0, Math.min(1, pct)));
    } catch (e) {}
    this._syncNebula();
  },

  // v721 (Malik): the nebula yields wherever a star owns the screen, and stays
  // dark through the pre-question pause. OFF on the Neutron Star tutorial page,
  // the reflect page ("One last thing"), the "Okay, Let's begin." beat, and the
  // synthesis; fades back in (1.6s, css) when the questionnaire starts.
  _syncNebula() {
    try {
      let off = false;
      if (this.pageWrap && (
        this.pageWrap.querySelector('.tut-star-blob') ||
        this.pageWrap.querySelector('.clarity-reflect') ||
        this.pageWrap.querySelector('.clarity-ctx'))) off = true;
      if (!this.tutorialOnly && this.currentPage >= this.getWizardOffset()) {
        const key = getWizardSteps()[wizardStep];
        if (key === 'aiSynthesis') off = true;
      }
      this.el.classList.toggle('clarity-exp--noneb', off);
    } catch (e) {}
  },

  updateNav() {
    // v773 (Malik's video): a stray "Continue" nav flashed under the whiteout
    // as the star act swapped in, a re-render refilled the wizard nav while
    // the nsv2 ceremony owned the screen. The nav stays EMPTY whenever the
    // ceremony root exists, no matter who triggers a render.
    try { if (document.getElementById('nsv2Root')) { if (this.navEl) this.navEl.innerHTML = ''; return; } } catch (e) {}
    const offset = this.getWizardOffset();
    const total = this.getTotalPages();
    const isLastTut = !this.tutorialOnly && !state.clarity.tutorialSeen && this.currentPage === this.totalTutorialPages - 1;
    const isLastTutOnly = this.tutorialOnly && this.currentPage === this.totalTutorialPages - 1;
    const isWizard = !this.tutorialOnly && this.currentPage >= offset;
    const isLastPage = this.currentPage >= total - 1;

    let html = '';

    const stepKey = isWizard ? getWizardSteps()[wizardStep] : null;

    // While an AI loading curtain is up (thinking between questions, or synthesizing
    // the star) there is nothing to go back to yet, so hide Back entirely (Malik,
    // 2026-07-03) - it was a dead control floating on the loader.
    const isAiLoading = (stepKey === 'aiChat' && aiChatLoading) ||
      (stepKey === 'aiSynthesis' && !aiSynthesisResult && !aiChatError);

    // Show back button: always if past page 0, mid-chunk on any teaching page (v553),
    // or during AI chat if there's history
    const showBack = !isAiLoading && (this.currentPage > 0 || (this._chunkIdx | 0) > 0 || (isWizard && this.currentPage === 0 && state.clarity.tutorialSeen && !this.tutorialOnly) || (stepKey === 'aiChat' && aiChatMessages.length > 1));
    if (showBack) {
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--back" id="cexpBack" aria-label="Back"></button>';
    }

    // Mid-chunk on a teaching page (v553): always a plain Continue; the page's real
    // CTA (Done / Let's Find Yours) only appears on the final paragraph chunk.
    const midChunk = (this._chunkTotal | 0) > 1 && (this._chunkIdx | 0) < this._chunkTotal - 1;

    if (midChunk) {
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--next" id="cexpNext">Continue</button>';
    } else if (stepKey === 'aiChat') {
      if (aiChatReady) {
        // AI is done - auto-advance to synthesis (no Continue button needed)
        setTimeout(() => {
          if (ClarityExperience.isOpen) ClarityExperience.next();
        }, 300);
      } else if (!aiChatLoading && aiCurrentQuestion) {
        // Show Next button, disabled until textarea has content
        const hasAnswer = (aiUserAnswer || '').trim().length > 0;
        html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--next" id="cexpNext" ' + (hasAnswer ? '' : 'disabled') + '>Next</button>';
      }
      // If loading, show no button (spinner is showing)
    } else if (stepKey === 'aiSynthesis') {
      // On synthesis: show Continue only when result is ready
      if (aiSynthesisResult) {
        html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--next" id="cexpNext">Continue</button>';
      }
    } else if (isLastTutOnly) {
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--cta" id="cexpNext">Done</button>';
    } else if (isLastTut) {
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--find clarity-find__orbit" id="cexpNext">Let\'s Find Yours</button>';
    } else if (isLastPage) {
      const valid = wizardStepValid(stepKey);
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--next" id="cexpNext" ' + (valid ? '' : 'disabled') + '>Complete</button>';
    } else if (isWizard) {
      const valid = wizardStepValid(stepKey);
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--next" id="cexpNext" ' + (valid ? '' : 'disabled') + '>Next</button>';
    } else {
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--next" id="cexpNext">Continue</button>';
    }

    this.navEl.innerHTML = html;

    const nextBtn = document.getElementById('cexpNext');
    const backBtn = document.getElementById('cexpBack');
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());
    if (backBtn) backBtn.addEventListener('click', () => this.back());
  }
};

// The dashboard's EXACT god-ray streaks, cloned for the Action plan. Same beam
// params (angle/length/timing/flicker) as #ambientBg .ambient__rays, but with
// the --c color OMITTED, so each shaft falls back to its white default
// (rgb(var(--c, 255 255 255))). Injected into .apl-screen behind the content.
const ACTION_WHITE_RAYS =
  '<div class="ambient__rays apl-rays" aria-hidden="true">' +
  '<div class="ambient__rays-source"></div>' +
  '<div class="ambient__rays-beam" style="--a:3deg;  --h:35px;  --d:9.4s;  --del:-0.0s; --omin:0.04; --omax:0.32; --smin:0.85; --smax:1.05;"><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:9deg;  --h:90px;  --d:11.6s; --del:-1.8s; --omin:0.07; --omax:0.50; --smin:0.55; --smax:1.35;"><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:16deg; --h:24px;  --d:7.1s;  --del:-3.4s; --omin:0.05; --omax:0.30; --smin:0.7;  --smax:1.2; "><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:22deg; --h:75px;  --d:13.2s; --del:-2.1s; --omin:0.09; --omax:0.65; --smin:0.6;  --smax:1.3; "><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:29deg; --h:40px;  --d:10.5s; --del:-5.6s; --omin:0.05; --omax:0.34; --smin:0.5;  --smax:1.4; "><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:36deg; --h:110px; --d:8.3s;  --del:-0.7s; --omin:0.11; --omax:0.72; --smin:0.65; --smax:1.25;"><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:43deg; --h:28px;  --d:14.8s; --del:-4.2s; --omin:0.04; --omax:0.28; --smin:0.8;  --smax:1.15;"><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:50deg; --h:95px;  --d:9.0s;  --del:-3.0s; --omin:0.10; --omax:0.68; --smin:0.55; --smax:1.4; "><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:57deg; --h:22px;  --d:12.3s; --del:-6.5s; --omin:0.04; --omax:0.24; --smin:0.75; --smax:1.2; "><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:64deg; --h:65px;  --d:10.9s; --del:-1.2s; --omin:0.08; --omax:0.54; --smin:0.6;  --smax:1.3; "><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:72deg; --h:32px;  --d:8.6s;  --del:-4.9s; --omin:0.05; --omax:0.32; --smin:0.7;  --smax:1.2; "><div class="ambient__rays-beam-shaft"></div></div>' +
  '<div class="ambient__rays-beam" style="--a:80deg; --h:80px;  --d:11.4s; --del:-2.6s; --omin:0.09; --omax:0.58; --smin:0.55; --smax:1.35;"><div class="ambient__rays-beam-shaft"></div></div>' +
  '</div>';

// Keyboard settle, shared by the Clarity and Action wizards (v526/v527).
// iOS pans the page when a field focuses, computed before any JS can run,
// and it overshoots even when the field is already visible. Recipe: let it
// shove, wait a 35ms beat of quiet, then reset the scroll in ONE invisible
// jump while offsetting host.el with a transform so the view still appears
// where iOS left it, and let the COMPOSITOR ease that transform to 0
// (animating scrollTo from JS repaints on the busy main thread and renders
// as 3-4 chunky steps). Precondition: the field sits high (~30vh anchor) so
// zero-pan is a position iOS accepts instead of re-panning.
function bindKeyboardSettle(host, field) {
  if (host._kbSettleCleanup) { host._kbSettleCleanup(); host._kbSettleCleanup = null; }
  if (!field || !window.visualViewport) return;
  let timer = 0, animating = false;
  // v873: the resting pageWrap scroll is CAPTURED at focus, not assumed 0.
  // Clarity's fields live in unscrolled wraps (baseline 0, unchanged); the
  // Action intake scrolls (past stack above the input), so zeroing would
  // jump the user to the top of their history.
  let restPw = 0;
  const pan = () => Math.max(window.scrollY || document.documentElement.scrollTop || 0, window.visualViewport.offsetTop || 0);
  const glide = () => {
    if (animating || document.activeElement !== field) return;
    const P = pan();
    const pw = host.pageWrap;
    const pwPan = pw ? (pw.scrollTop - restPw) : 0;
    const total = P + pwPan;
    if (total < 2) return;
    const root = host.el;
    window.scrollTo(0, 0);
    if (pw && pwPan) pw.scrollTop = restPw;
    if (!root || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    animating = true;
    // iOS draws the native text caret at the field's UNTRANSFORMED position and
    // does not follow a CSS transform mid-animation, so during this settle glide
    // the caret visibly detaches and floats below the box before snapping back
    // (Malik, 2026-07-03). Hide it for the ~240ms glide (the field is empty /
    // placeholder at focus, so this is imperceptible) and restore it once the
    // transform is cleared and the box has landed.
    field.style.caretColor = 'transparent';
    root.style.transition = 'none';
    root.style.transform = 'translateY(' + (-total) + 'px)';
    void root.offsetHeight;
    root.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)';
    root.style.transform = 'translateY(0)';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      root.removeEventListener('transitionend', finish);
      root.style.transition = '';
      root.style.transform = '';
      field.style.caretColor = '';
      animating = false;
      if (document.activeElement === field && pan() > 1) queue();
    };
    root.addEventListener('transitionend', finish);
    setTimeout(finish, 320);
  };
  // Wait for iOS's shove to STOP MOVING before settling, so the ease-out
  // reads as one intentional motion, not a fight.
  const queue = () => {
    if (animating) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = 0; glide(); }, 35);
  };
  const onFocus = () => {
    restPw = host.pageWrap ? host.pageWrap.scrollTop : 0;
    window.visualViewport.addEventListener('resize', queue);
    window.visualViewport.addEventListener('scroll', queue);
    // The keyboard animates in over ~250-500ms; sweep a few times after.
    [80, 260, 450, 700].forEach(ms => setTimeout(queue, ms));
  };
  const onBlur = () => {
    window.visualViewport.removeEventListener('resize', queue);
    window.visualViewport.removeEventListener('scroll', queue);
    if (timer) { clearTimeout(timer); timer = 0; }
  };
  field.addEventListener('focus', onFocus);
  field.addEventListener('blur', onBlur);
  host._kbSettleCleanup = () => {
    onBlur();
    field.removeEventListener('focus', onFocus);
    field.removeEventListener('blur', onBlur);
  };
}

/* The OLD Action module (ActionExperience) moved to js/33-legacy-action.js
   in v1318, byte for byte, pending deletion. Clarity keeps this file. */

/* ============================================
   CLARITY WIZARD V5
   ============================================ */
const DISCOVERY_DOMAINS = [
  { value: 'career', label: 'Career & Work', desc: 'Professional growth, job performance' },
  { value: 'fitness', label: 'Fitness & Health', desc: 'Physical strength, nutrition, energy' },
  { value: 'creative', label: 'Creative & Passion', desc: 'Art, music, writing, side projects' },
  { value: 'money', label: 'Money & Business', desc: 'Income, investing, entrepreneurship' },
  { value: 'relationships', label: 'Relationships', desc: 'Family, friendships, social life' },
  { value: 'spiritual', label: 'Spiritual & Mindfulness', desc: 'Meditation, purpose, inner peace' },
  { value: 'education', label: 'Education & Learning', desc: 'Skills, courses, certifications' },
  { value: 'mental', label: 'Mental Health', desc: 'Therapy, habits, emotional resilience' }
];
const DOMAIN_DRILLDOWNS = {
  career: {
    question: 'Okay, so when you say career and work, what do you <b>actually</b> mean by that?',
    hint: 'Everyone\u2019s situation is different. What\u2019s yours?',
    options: [
      { value: 'climb', label: 'Climb higher in my current career' },
      { value: 'switch', label: 'Switch to a completely different field' },
      { value: 'first_job', label: 'Land my first real job or internship' },
      { value: 'freelance', label: 'Go freelance or become a consultant' },
      { value: 'leadership', label: 'Step into a leadership or management role' },
      { value: 'escape', label: 'Get out of a job I hate' }
    ]
  },
  fitness: {
    question: 'Okay, so fitness and health. What does that <b>actually</b> look like for you?',
    hint: 'Be specific about what you\u2019re trying to change.',
    options: [
      { value: 'lose_weight', label: 'Lose weight and get lean' },
      { value: 'build_muscle', label: 'Build muscle and get stronger' },
      { value: 'diet', label: 'Fix my diet and nutrition' },
      { value: 'habit', label: 'Build a consistent workout routine' },
      { value: 'train', label: 'Train for something specific (marathon, sport, etc.)' },
      { value: 'energy', label: 'Just have more energy and feel better' }
    ]
  },
  creative: {
    question: 'Okay, creative and passion. What does that <b>actually</b> mean for you?',
    hint: 'There\u2019s no wrong answer here.',
    options: [
      { value: 'start', label: 'Start creating something (art, music, writing)' },
      { value: 'hobby_real', label: 'Turn a hobby into something real' },
      { value: 'learn_skill', label: 'Learn a creative skill from scratch' },
      { value: 'share', label: 'Start sharing my work publicly' },
      { value: 'monetize', label: 'Make money from my creative work' },
      { value: 'rediscover', label: 'Reconnect with a passion I abandoned' }
    ]
  },
  money: {
    question: 'Okay, so when you say money and business, what do you <b>actually</b> mean by that?',
    hint: 'These are very different paths. Which one is pulling at you?',
    options: [
      { value: 'more_income', label: 'Just make more money at my current job' },
      { value: 'side_hustle', label: 'Start a side hustle or business' },
      { value: 'full_business', label: 'Build a real, full-time business' },
      { value: 'invest', label: 'Learn to invest and build wealth' },
      { value: 'debt', label: 'Get out of debt and fix my finances' },
      { value: 'income_goal', label: 'Hit a specific income number' }
    ]
  },
  relationships: {
    question: 'Okay, relationships. What part of that do you <b>actually</b> want to work on?',
    hint: 'Which one matters most right now?',
    options: [
      { value: 'romantic', label: 'Improve or find a romantic relationship' },
      { value: 'friendships', label: 'Build deeper, real friendships' },
      { value: 'family', label: 'Fix or improve a family situation' },
      { value: 'social', label: 'Get better at meeting new people' },
      { value: 'boundaries', label: 'Set boundaries with toxic people' },
      { value: 'loneliness', label: 'Stop feeling so alone' }
    ]
  },
  spiritual: {
    question: 'Okay, spiritual and mindfulness. What does that <b>actually</b> mean for you?',
    hint: 'This is personal. Go with what feels right.',
    options: [
      { value: 'peace', label: 'Find inner peace and reduce anxiety' },
      { value: 'meditation', label: 'Build a meditation or mindfulness practice' },
      { value: 'values', label: 'Figure out my beliefs and values' },
      { value: 'purpose', label: 'Connect with a sense of purpose' },
      { value: 'presence', label: 'Learn to be more present and less in my head' },
      { value: 'gratitude', label: 'Build a more grateful, positive mindset' }
    ]
  },
  education: {
    question: 'Okay, education and learning. What kind are we <b>actually</b> talking about?',
    hint: 'Learning for what purpose?',
    options: [
      { value: 'career_skill', label: 'Learn a skill to advance my career' },
      { value: 'school', label: 'Go back to school or get certified' },
      { value: 'passion_learn', label: 'Self-educate on something I\u2019m passionate about' },
      { value: 'technical', label: 'Master a technical skill (coding, design, etc.)' },
      { value: 'read', label: 'Read more and become better informed' },
      { value: 'language', label: 'Learn a new language' }
    ]
  },
  mental: {
    question: 'Okay, mental health. What does that <b>specifically</b> mean for you right now?',
    hint: 'No judgment here. Just honesty.',
    options: [
      { value: 'anxiety', label: 'Get a handle on anxiety or overthinking' },
      { value: 'depression', label: 'Work through depression or low motivation' },
      { value: 'bad_habit', label: 'Break a bad habit or addiction' },
      { value: 'resilience', label: 'Build emotional resilience' },
      { value: 'self_sabotage', label: 'Stop self-sabotaging' },
      { value: 'therapy', label: 'Start therapy or get professional help' }
    ]
  },
  other: {
    question: 'Okay, can you narrow it down a bit for me?',
    hint: 'What area of your life is this about?',
    options: [
      { value: 'lifestyle', label: 'Lifestyle and daily habits' },
      { value: 'identity', label: 'Figuring out who I am' },
      { value: 'legacy', label: 'Building something that lasts' },
      { value: 'freedom', label: 'More freedom and independence' },
      { value: 'impact', label: 'Making an impact on others' },
      { value: 'unclear', label: 'Honestly, I\u2019m still not sure' }
    ]
  }
};
const IDENTITY_SUGGESTIONS = [
  'I do the work, even when I don\'t feel like it.',
  'I build something meaningful every single day.',
  'I choose growth over comfort, always.',
  'I protect my time like it\'s running out, because it is.',
  'I don\'t need motivation. I need a mission.',
  'I turn resistance into fuel.'
];
const DAILY_TIMES = [
  { value: 15, label: '15 minutes', desc: 'Small but consistent' },
  { value: 30, label: '30 minutes', desc: 'A focused session' },
  { value: 60, label: '1 hour', desc: 'Solid commitment' },
  { value: 120, label: '2 hours', desc: 'Serious dedication' },
  { value: 240, label: '4 hours', desc: 'Half-day grind' },
  { value: 480, label: '8 hours', desc: 'Fully committed' }
];
const ENERGY_LEVELS = [
  { value: 'low', label: 'Low', desc: 'Tired or drained most days' },
  { value: 'medium', label: 'Medium', desc: 'Decent energy, inconsistent' },
  { value: 'high', label: 'High', desc: 'Ready to go hard' }
];
const BLOCKERS = [
  'Procrastination & avoidance', 'Phone & social media addiction',
  'Lack of accountability', 'No clear plan or direction',
  'Perfectionism, I never start', 'Energy & motivation crashes'
];
const DOOMSCROLL_TIMES = [
  'Morning, first thing when I wake', 'During work or study breaks',
  'After lunch energy dip', 'Evening wind-down',
  'Late night in bed', 'Whenever I\'m bored or stressed'
];
const TRIGGER_APPS = ['Instagram', 'TikTok', 'Twitter / X', 'YouTube', 'Reddit', 'Snapchat', 'Facebook', 'Other'];

let wizardStep = 0;
let wizardAnswers = {};


/* ============================================================
   IGNITION - the Clarity ending ceremony.
   Runs ONCE per goal (state.clarity.ignitedAt), between AI synthesis
   and the Neutron Star summary card. Sequence:
     replay (their own words) -> contrast (vision vs pull) ->
     if-then plan -> want-to check -> letter to future self ->
     press-and-hold ignition -> flare -> summary.
   Research basis: mental contrasting (WOOP), implementation
   intentions (Gollwitzer d=.65), future-self letters (Hershfield),
   one-sacred-moment celebration design (Duolingo lesson).
   All steps work offline (verbatim answers, no AI dependency).
   ============================================================ */

let _igniteStep = 0;
let _igniteData = {};

function renderIgnitionSequence(summary) {
  _igniteData.summary = summary;
  const s = summary || {};
  const a = (state.clarity && state.clarity.answers) || {};
  const steps = _igniteSteps();
  const step = steps[Math.max(0, Math.min(_igniteStep, steps.length - 1))];
  const total = steps.length;
  const dots = steps.map((st, i) =>
    `<span class="ns-ignite__dot${i === _igniteStep ? ' is-on' : ''}" aria-hidden="true"></span>`).join('');

  let body = '';
  if (step === 'replay') {
    body = `
      <div class="ns-ignite__eyebrow">You said</div>
      <div class="ns-ignite__big">${esc(s.futureVision || s.neutronStar || '')}</div>
      <div class="ns-ignite__sub">That is the life you described. Your own words.</div>
      <button type="button" class="ns-ignite__next" id="nsIgniteNext">Continue</button>`;
  } else if (step === 'contrast') {
    body = `
      <div class="ns-ignite__eyebrow">Two futures</div>
      <div class="ns-ignite__vs">
        <div class="ns-ignite__vs-block ns-ignite__vs-block--light">
          <div class="ns-ignite__vs-label">The life you want</div>
          <div class="ns-ignite__vs-text">${esc(s.futureVision || '')}</div>
        </div>
        <div class="ns-ignite__vs-divider" aria-hidden="true"></div>
        <div class="ns-ignite__vs-block ns-ignite__vs-block--dark">
          <div class="ns-ignite__vs-label">The pull you named</div>
          <div class="ns-ignite__vs-text">${esc(s.antiVision || a.biggestBlocker || '')}</div>
        </div>
      </div>
      <div class="ns-ignite__sub">Every day, one of these wins.</div>
      <button type="button" class="ns-ignite__next" id="nsIgniteNext">Continue</button>`;
  } else if (step === 'ifthen') {
    const cueDefault = _igniteData.cue !== undefined ? _igniteData.cue : (a.doomscrollWhen || a.biggestBlocker || '');
    const actDefault = _igniteData.act || '';
    body = `
      <div class="ns-ignite__eyebrow">Your move</div>
      <div class="ns-ignite__title">When the pull comes, what is your move?</div>
      <div class="ns-ignite__sub">One sentence. The single most effective tool in goal science.</div>
      <div class="ns-ignite__ifthen">
        <label class="ns-ignite__field"><span>If</span>
          <input type="text" id="nsIgniteCue" maxlength="120" placeholder="the moment it usually goes wrong" value="${esc(cueDefault)}"></label>
        <label class="ns-ignite__field"><span>then I will</span>
          <input type="text" id="nsIgniteAct" maxlength="120" placeholder="one physical action you can always do" value="${esc(actDefault)}"></label>
      </div>
      <button type="button" class="ns-ignite__next" id="nsIgniteNext">Lock it in</button>
      <button type="button" class="ns-ignite__skip" id="nsIgniteSkip">Skip for now</button>`;
  } else if (step === 'wantto') {
    body = `
      <div class="ns-ignite__eyebrow">Be honest</div>
      <div class="ns-ignite__title">Do you want this, or do you feel you should want it?</div>
      <div class="ns-ignite__choices">
        <button type="button" class="ns-ignite__choice" data-want="want">I want this</button>
        <button type="button" class="ns-ignite__choice" data-want="should">I feel I should</button>
      </div>
      <div class="ns-ignite__should-note" id="nsIgniteShouldNote" hidden>
        "Should" is usually somebody else's voice. Worth noticing whose. We will work with what is true.
        <button type="button" class="ns-ignite__next" id="nsIgniteNext" style="margin-top:18px;">Continue</button>
      </div>`;
  } else if (step === 'letter') {
    body = `
      <div class="ns-ignite__eyebrow">Before you light it</div>
      <div class="ns-ignite__title">One sentence to the person orbiting this star in 90 days.</div>
      <div class="ns-ignite__sub">It gets sealed inside the star. It opens in 90 days, when you and it meet again.</div>
      <textarea class="ns-ignite__letter" id="nsIgniteLetter" maxlength="240" rows="3" placeholder="Dear future me...">${esc(_igniteData.letter || '')}</textarea>
      <button type="button" class="ns-ignite__next" id="nsIgniteNext">Seal it</button>
      <button type="button" class="ns-ignite__skip" id="nsIgniteSkip">Skip for now</button>`;
  } else {
    // step === 'ignite'
    body = `
      <div class="ns-ignite__stage" id="nsIgniteStage">
        <div class="ns-star-glow"></div>
        <canvas class="ns-star-blob ns-ignite__blob" id="nsIgniteBlob" width="360" height="360" aria-hidden="true"></canvas>
        <svg class="ns-ignite__ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="ns-ignite__ring-track" cx="60" cy="60" r="54"/>
          <circle class="ns-ignite__ring-fill" id="nsIgniteRingFill" cx="60" cy="60" r="54"/>
        </svg>
      </div>
      <div class="ns-ignite__goal" id="nsIgniteGoal">${esc(s.neutronStar || '')}</div>
      <div class="ns-ignite__hold-hint" id="nsIgniteHint">Press and hold to ignite</div>`;
  }

  return `
    <div class="ns-star-scene ns-ignite" id="nsIgniteRoot" data-step="${esc(step)}">
      <div class="ns-star-scene__starfield" aria-hidden="true"></div>
      <div class="ns-ignite__inner">${body}</div>
      <div class="ns-ignite__dots">${dots}</div>
    </div>`;
}

function _igniteSteps() {
  return ['replay', 'contrast', 'ifthen', 'wantto', 'letter', 'ignite'];
}

function _igniteRerender() {
  const root = document.getElementById('nsIgniteRoot');
  if (!root || !root.parentNode) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = renderIgnitionSequence(_igniteData.summary);
  root.parentNode.replaceChild(wrap.firstElementChild, root);
  bindIgnitionSequence(document);
}

function bindIgnitionSequence(container) {
  const root = (container || document).querySelector ? (container || document).querySelector('#nsIgniteRoot') : document.getElementById('nsIgniteRoot');
  if (!root) return;
  const step = root.getAttribute('data-step');
  const a = (state.clarity && state.clarity.answers) || {};

  const advance = () => { _igniteStep++; _igniteRerender(); };

  const nextBtn = root.querySelector('#nsIgniteNext');
  const skipBtn = root.querySelector('#nsIgniteSkip');

  if (step === 'ifthen') {
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const cue = (root.querySelector('#nsIgniteCue') || {}).value || '';
      const act = (root.querySelector('#nsIgniteAct') || {}).value || '';
      _igniteData.cue = cue; _igniteData.act = act;
      if (cue.trim() && act.trim()) {
        a.ifThen = { cue: cue.trim(), action: act.trim(), setAt: Date.now() };
        try { persistNow(); } catch (e) {}
      }
      advance();
    });
    if (skipBtn) skipBtn.addEventListener('click', advance);
  } else if (step === 'wantto') {
    root.querySelectorAll('.ns-ignite__choice').forEach(btn => btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-want');
      a.wantTo = v;
      try { persistNow(); } catch (e) {}
      if (v === 'should') {
        root.querySelectorAll('.ns-ignite__choice').forEach(b => b.classList.toggle('is-on', b === btn));
        const note = root.querySelector('#nsIgniteShouldNote');
        if (note) { note.hidden = false; const n2 = note.querySelector('#nsIgniteNext'); if (n2) n2.addEventListener('click', advance); }
      } else {
        advance();
      }
    }));
  } else if (step === 'letter') {
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const txt = ((root.querySelector('#nsIgniteLetter') || {}).value || '').trim();
      _igniteData.letter = txt;
      if (txt) {
        state.clarity.letter = { text: txt, sealedAt: Date.now(), opensAt: Date.now() + 90 * 24 * 60 * 60 * 1000 };
        try { persistNow(); } catch (e) {}
      }
      advance();
    });
    if (skipBtn) skipBtn.addEventListener('click', advance);
  } else if (step === 'ignite') {
    const blob = root.querySelector('#nsIgniteBlob');
    if (blob && typeof initStarBlob === 'function') { setTimeout(() => initStarBlob(blob, 240, 'pulsar'), 40); }
    _bindHoldToIgnite(root);
  } else {
    // replay / contrast: simple continue
    if (nextBtn) nextBtn.addEventListener('click', advance);
  }
}

function _bindHoldToIgnite(root) {
  const stage = root.querySelector('#nsIgniteStage');
  const ringFill = root.querySelector('#nsIgniteRingFill');
  const goalEl = root.querySelector('#nsIgniteGoal');
  const hintEl = root.querySelector('#nsIgniteHint');
  if (!stage || !ringFill) return;
  const HOLD_MS = 2500;
  const CIRC = 2 * Math.PI * 54;
  ringFill.style.strokeDasharray = String(CIRC);
  ringFill.style.strokeDashoffset = String(CIRC);
  let raf = null, start = 0, done = false;

  const setProgress = (p) => {
    ringFill.style.strokeDashoffset = String(CIRC * (1 - p));
    if (goalEl) goalEl.style.transform = `scale(${1 - 0.35 * p})`;
    if (goalEl) goalEl.style.opacity = String(1 - 0.4 * p);
  };
  const tick = (t) => {
    if (done) return;
    const p = Math.min(1, (t - start) / HOLD_MS);
    setProgress(p);
    if (p >= 1) { done = true; _fireIgnition(root); return; }
    raf = requestAnimationFrame(tick);
  };
  const begin = (e) => {
    if (done) return;
    e.preventDefault();
    root.classList.add('is-holding');
    if (hintEl) hintEl.textContent = 'Hold...';
    start = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const cancel = () => {
    if (done) return;
    root.classList.remove('is-holding');
    if (raf) cancelAnimationFrame(raf);
    setProgress(0);
    if (hintEl) hintEl.textContent = 'Press and hold to ignite';
  };
  stage.addEventListener('pointerdown', begin);
  document.addEventListener('pointerup', cancel);
  document.addEventListener('pointercancel', cancel);
}

function _fireIgnition(root) {
  // The one sacred moment: plays exactly once per goal.
  state.clarity.ignitedAt = Date.now();
  try { persistNow(); } catch (e) {}
  try { if (typeof writeProofEvent === 'function') writeProofEvent('proof', { title: 'Ignition', text: 'Ignited their Neutron Star', module: 'clarity', silent: true }); } catch (e) {}

  const lite = document.documentElement.classList.contains('lowfx')
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add(lite ? 'is-igniting-lite' : 'is-igniting');

  const flare = document.createElement('div');
  flare.className = 'ns-ignite__flare';
  root.appendChild(flare);

  setTimeout(() => {
    _igniteStep = 0;
    _igniteData = {};
    // Land on the summary: re-render the current view in place.
    try {
      if (ClarityExperience && ClarityExperience.isOpen) {
        const summary = normalizeClaritySummary(state.clarity.answers);
        ClarityExperience.pageWrap.innerHTML = `<div class="clarity-exp__page-inner clarity-exp__page-inner--summary">${renderNeutronStarSummary(summary, { allowContinue: true, showRestart: true })}</div>`;
        clarityUpgradeSummaryToPager(ClarityExperience.pageWrap);
        ClarityExperience.navEl.innerHTML = '';
        requestAnimationFrame(() => initNeutronStarCard(ClarityExperience.pageWrap, () => { ClarityExperience.isOpen = false; ClarityExperience.open(); }));
        ClarityExperience.bindWizardInFullscreen();
      }
    } catch (e) {}
  }, lite ? 900 : 2100);
}

/* ============================================================
   IGNITION v2 - "Reveal -> Ignite -> Handoff"
   The Clarity ending (live default). v1 (above) stays intact;
   routing is decided by clarityEndingVersion() below.
     Beat 1 REVEAL: black screen, their distilled sentence appears
       alone, word by word. A quiet "Not quite" escape opens the
       AI-assisted sharpen editor. The confirm is a PRESS-AND-HOLD
       on a ring under the sentence, so nobody ignites by accident.
     Beat 2 IGNITE: the hold completes, the sentence collapses into
       a point of light, the star ignites (white/blue, diffraction
       spikes) with their sentence under it in Memento's own type.
     Beat 3 HANDOFF: "A star is not a plan." Primary solid CTA goes
       straight into Action; quiet "Done for now" to the summary.
   Style law: NOTHING here that isn't already Memento (no serif,
   no gold, no fake registry). White/blue star only; deterministic
   hash of the goal drives temperature + spike angle.
   ============================================================ */

// 'v2' = the Reveal/Ignite/Handoff ending (live default).
// ?ending=v1 / ?ending=off remain for review of the older flows.
const CLARITY_ENDING_VERSION = 'v2';
function clarityEndingVersion() {
  // 'v2' = Reveal/Ignite/Handoff ceremony (live), 'v1' = first ceremony,
  // 'off' = the ORIGINAL flow: no ceremony at all, straight to the summary card.
  try {
    const m = /[?&]ending=(v1|v2|off)/.exec(location.search);
    if (m) return m[1];
  } catch (e) {}
  return CLARITY_ENDING_VERSION;
}

let _ig2Act = 'reveal';     // reveal | sharpen | star
let _ig2 = {};              // scratch state for the run

// Deterministic star identity from the goal text. Same goal = same star.
function starSeedFromGoal(goal) {
  const txt = String(goal || 'unnamed');
  let h = 5381;
  for (let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) >>> 0;
  const t = (h % 1000) / 999; // 0..1 position on the temperature ramp
  // Neutron stars run hot: white through blue only (per Malik, no red/amber).
  const CLASSES = [
    { c: 'F', label: 'white',      core: '#ffffff', glow: '236, 240, 255', fringe: '#dfe6ff' },
    { c: 'A', label: 'blue-white', core: '#f6f9ff', glow: '208, 224, 255', fringe: '#aac4ff' },
    { c: 'B', label: 'ice-blue',   core: '#eff5ff', glow: '184, 208, 255', fringe: '#8fb4ff' },
    { c: 'O', label: 'deep-blue',  core: '#e9f1ff', glow: '162, 192, 255', fringe: '#7aa2ff' }
  ];
  const cls = CLASSES[Math.min(CLASSES.length - 1, Math.floor(t * CLASSES.length))];
  const greek = ['α', 'β', 'γ', 'δ', 'ε', 'ζ'][h % 6];
  return {
    hash: h,
    temp: t,
    cls: cls.c,
    clsLabel: cls.label,
    core: cls.core,
    glowRgb: cls.glow,
    fringe: cls.fringe,
    spikes: (h % 2) ? 6 : 4,
    spikeAngle: ((h % 17) - 8),                 // -8..8 degrees off axis
    designation: 'MV-' + (1000 + (h % 9000)) + '-' + greek,
    kelvin: Math.round(9000 + t * 21000)        // white ~9,000K .. deep blue ~30,000K
  };
}

// Malik's "Add to your Memento" flow (v637): the star summary CTA finalizes the
// summary, lands the user on the home, plays the card unlock cinema (they WATCH
// their Memento come alive), and only THEN fires the save nudge, leaving them on
// the home where the next-step card invites them to take their first action.
// ============================================================
// THE FIRST 7 DAYS (v647, Malik): a future-pacing screen that rides the peak
// right after the card evolution cinema and leads into the paywall. Honest
// about the day-3 dip (the retention hook). Personalized to their star.
// ============================================================
function _renderNext7Days() {
  const name = (state.profile && state.profile.name) ? String(state.profile.name).trim() : '';
  const greet = name ? (esc(name) + ", here's exactly what the next week looks like.") : "Here's exactly what the next week looks like.";
  // v778 (Malik's Ascent, grilled + locked): numeral lives IN the node, title +
  // one line beside it, no labels, no eyebrow, no goal echo. Day 3 is the dip
  // (white node, darker stretch), day 7 the green summit.
  const DAYS = [
    { t: 'You find out the HOW and start.', d: "You just found your Neutron Star. Now Memento turns it into the one real move that ACTUALLY moves you toward your goal, you can make today. You do it, and Memento documents it as your first piece of proof you can make progress.\n\nMost people only talk. By taking action, that already puts you ahead of 95% of people." },
    { t: 'Another Step Forward.', d: "You take the next action, and Memento logs it to continue compounding. You can SEE your memento evolving each time you take action. Showing you in real time that day one wasn't a fluke." },
    { t: 'This is where most quit.', d: "The initial burst of motivation drops. This is when, to your brain, quitting and getting distracted by your phone looks more interesting than making progress.\n\nThis is when Memento unlocks your sense of urgency, with both positive and negative reward. It reminds you of the cost of inaction, and of your limited time to exist and achieve your goals. And it reminds you of the progress you've already made, and the dreams and promises you made to yourself.\n\nPersonal note: This is the hardest part. But push past this and progression becomes easier. Not easy. But easier.", cls: 'n7d-day--dip' },
    { t: 'Break off the cobwebs.', d: "Your brain is VERY adaptable. Force it to lock in on one direction every day, and it stops fighting you and starts working with you.\n\nI call this breaking off the cobwebs.\n\nImagine your brain covered in rust and cobwebs. You need to put in a lot of effort, only in the beginning, to break off the cobwebs so the machine can run on its own.\n\nEvery day, Memento hands you the actions needed to keep turning the gears until the machine can run with minimal effort, so there's no excuse and no friction.\n\nThat's when momentum starts working FOR you, not against you." },
    { t: 'Momentum', d: "Your brain has stopped fighting you, and the actions feel far more effortless. Inside Memento, you'll see: your streak, the memento itself, your why, the days of proof all reflecting the momentum you built and more. All helping push you forward.\n\nYou've pushed through the hardest part. Memento's only job now is to keep the one move in front of you and keep showing you how far you've come. So KEEP GOING." },
    { t: 'Hooked.', d: "By now you've seen real progress toward your goal, and Memento has documented every piece of it. Watching your card evolve and your proof pile up releases real dopamine, and it will make you crave more. Progress starts to feel better than the distraction did.\n\nYou still put in effort at times, but Memento evolves with you, helping you push forward." },
    { t: 'The Climb.', d: "You've made it to the end of your first week.\n\nYou know what you want, and why. You know the ONE move that gets you there. Your brain is on your side. You're actually doing the thing, and it's all on Memento as it continues to grow with you.\n\nMemento keeps every piece in front of you: your goal, your action, your progress, your promises, the reminder that your time is finite, and the reminder of what to live for.\n\nYou're feeling one of the greatest feelings a human can feel: Progression Towards a Worthy Goal. The only thing left is to keep going, enjoy the climb, and get the most out of your existence.", cls: 'n7d-day--win' }
  ];
  // v786 (Malik): REVERSED. The week now descends: hero at the top, day 1
  // first, day 7 at the bottom where the finale waits. Natural scroll.
  // v779 (Malik): lab-faithful stops (small dot node + "DAY X" label + title +
  // line) and a TRUE color progression: each day's accent is interpolated from
  // Clarity cyan (day 1) to spring green (day 7); the dip stays white.
  const lerp = (a, b, k) => Math.round(a + (b - a) * k);
  const dayColor = (i) => {
    if (i === 2) return '242, 246, 247';                       // the dip: white
    const k = i / 6;
    return lerp(58, 63, k) + ', 217, ' + lerp(245, 78, k);      // cyan -> green
  };
  // v944 (Malik): descriptions can now run to multiple paragraphs (Day 3 grew a
  // real explanation + a personal note), so a blank-line-separated string
  // becomes separate <p>s. esc() first, so the copy is still fully escaped and
  // only the paragraph split adds markup.
  const descHtml = (d) => String(d).split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join('');
  // v953: content lives in .n7d-dc, and THAT is the snap + camera target (not the
  // whole .n7d-day, whose huge bottom padding pushed the content ~half a padding
  // above centre). The node/line stay on .n7d-day so they still sit beside the
  // title and the trail still spans the gap.
  const daysHtml = DAYS.map((o, i) =>
    `<div class="n7d-day ${o.cls || ''}" data-n7day="${i + 1}" style="--dc:${dayColor(i)}"><div class="n7d-node"></div><div class="n7d-dc"><div class="n7d-dlab">Day ${i + 1}${i === 2 ? ' · The Dip' : ''}</div><div class="n7d-title">${esc(o.t)}</div><div class="n7d-desc">${descHtml(o.d)}</div></div></div>`
  ).join('');
  return `<div class="n7d" id="n7dRoot" role="dialog" aria-label="Your first 7 days">
    <div class="n7d-dust" aria-hidden="true"></div>
    <div class="n7d-dust n7d-dust--tw" aria-hidden="true" style="transform: scale(-1, 1)"></div>
    <div class="n7d-breath" id="n7dBreathA" aria-hidden="true"></div>
    <div class="n7d-breath" id="n7dBreathB" aria-hidden="true"></div>
    <div class="n7d-summit" aria-hidden="true"></div>
    <div class="n7d-finale" aria-hidden="true"></div>
    <div class="n7d-topfade" aria-hidden="true"></div>
    <div class="n7d-scroll" id="n7dScroll">
      <div class="n7d-inner">
        <div class="n7d-hero">
          <h1 class="n7d-h1" id="n7dTitle" data-n7d-type="${esc(greet)}"></h1>
          <p class="n7d-sub" id="n7dSub">The first week is typically the hardest. We'll run through every step so you know what's coming, to make sure above all else: <b>you keep going.</b></p>
        </div>
        <div class="n7d-path">${daysHtml}<div class="n7d-day n7d-day--win n7d-day--final" data-n7day="final" style="--dc:63, 217, 78"><div class="n7d-node"></div><div class="n7d-dc"><div class="n7d-title">Start Now.</div><div class="n7d-desc"><p><em class="n7d-quote">The journey of 1000 miles begins with a single step. - Lao Tzu</em></p><p>You just took the first step; now you just need to keep going.</p><p>Are you ready?</p></div><div class="n7d-endcta"><button type="button" class="n7d-cta" id="n7dCta">I&rsquo;m Ready</button></div></div><div class="n7d-tail" aria-hidden="true"></div></div></div>
      </div>
    </div>
  </div>`;
}
// A small typewriter for the hero title: words kept whole (no mid-word wrap),
// characters revealed one at a time with the app's tick sound.
function _n7dType(el, text, speed, onDone) {
  try {
    const esc1 = (c) => c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c;
    const words = String(text).split(' ');
    el.innerHTML = words.map(w =>
      '<span class="n7d-w">' + w.split('').map(c => '<span class="n7d-ch">' + esc1(c) + '</span>').join('') + '</span>'
    ).join(' ');
    const spans = el.querySelectorAll('.n7d-ch');
    let i = 0, done = false;
    // v960: expose a finisher so an early tap can reveal the whole line at once
    // (a fast tapper should still SEE the first message, not get shot past it).
    const finish = () => {
      if (done) return; done = true;
      clearTimeout(el._n7dTimer);
      spans.forEach(s => s.classList.add('on'));
      i = spans.length;
      if (onDone) onDone();
    };
    el._n7dFinish = finish;
    const step = () => {
      if (i >= spans.length) { finish(); return; }
      spans[i].classList.add('on');
      try { if (typeof MementoSound !== 'undefined') MementoSound.tick(); } catch (e) {}
      i++;
      el._n7dTimer = setTimeout(step, speed);
    };
    step();
  } catch (e) { try { el.textContent = text; } catch (_) {} if (onDone) onDone(); }
}
function showNext7Days(onProceed) {
  try {
    if (document.getElementById('n7dRoot')) return;
    const host = document.createElement('div');
    host.innerHTML = _renderNext7Days();
    const root = host.firstElementChild;
    document.body.appendChild(root);
    document.body.style.overflow = 'hidden';
    const scroll = root.querySelector('#n7dScroll');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => root.classList.add('n7d--in'));

    const title = root.querySelector('#n7dTitle');
    const sub = root.querySelector('#n7dSub');
    const titleText = title ? (title.getAttribute('data-n7d-type') || '') : '';
    const days = Array.from(root.querySelectorAll('.n7d-day'));

    // Ignite on approach, whoever is driving. Day 7 lights the summit (aurora
    // + closing line + CTA ride the n7d--lit class with their own delays).
    // v782 (Malik): ONE day in focus. The current day is sharp; every other
    // ignited day blurs back, and the background CROSSFADES to the current
    // day's color (two stacked breath layers trading opacity, 1.8s).
    const breathA = root.querySelector('#n7dBreathA');
    const breathB = root.querySelector('#n7dBreathB');
    let breathFront = null, curDay = null;
    const setBreath = (color, alpha) => {
      if (!color || !breathA || !breathB) return;

      const back = (breathFront === breathA) ? breathB : breathA;
      back.style.setProperty('--n7bc', color);
      back.style.setProperty('--n7ba', alpha || '1');
      back.classList.add('on');
      if (breathFront) breathFront.classList.remove('on');
      breathFront = back;
    };
    const setCurrent = (el) => {
      if (!el || el === curDay) return;
      if (curDay) curDay.classList.remove('is-cur');
      curDay = el;
      el.classList.add('is-cur');
      root.classList.add('n7d--climb');
      // v957: the final stop blooms into the full Memento spectrum; every other
      // day rests on its single grounded hue.
      root.classList.toggle('n7d--fin', el.classList.contains('n7d-day--final'));
      // the dip's white breath runs PALE (v787): full-strength white read as a
      // giant gray ellipse with visible banding on OLED.
      setBreath(el.style.getPropertyValue('--dc') || '', el.classList.contains('n7d-day--dip') ? '0.4' : '1');
    };
    const ignite = (el) => {
      if (!el) return;
      if (!el.classList.contains('is-in')) {
        el.classList.add('is-in');
        try { if (typeof MementoSound !== 'undefined') MementoSound.tick(); } catch (e) {}
        if (el.classList.contains('n7d-day--win')) root.classList.add('n7d--lit');
      }
      setCurrent(el);
    };
    // Manual scrolling re-focuses whichever ignited day is nearest the center
    // (so scrolling back down the mountain refocuses + recolors correctly).
    // v955: track the focus on the next frame (was a 120ms setTimeout, which lagged
    // the colour/blur behind the finger and read as clunky). rAF keeps it glued.
    let focusTick = false;
    const refocus = () => {
      focusTick = false;
      const mid = scroll.scrollTop + scroll.clientHeight / 2;
      let best = null, bd = Infinity;
      for (const d of days) {
        if (!d.classList.contains('is-in')) continue;
        const c = absTop(dcOf(d)) + dcOf(d).offsetHeight / 2;
        const dist = Math.abs(c - mid);
        if (dist < bd) { bd = dist; best = d; }
      }
      // v783: nearest ignited day WINS outright (the old radius gate stranded
      // focus on the wrong day near the summit, day 7 was unreachable).
      if (best) setCurrent(best);
    };
    scroll.addEventListener('scroll', () => {
      if (focusTick) return; focusTick = true;
      requestAnimationFrame(refocus);
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach(e => { if (e.isIntersecting) { ignite(e.target); io.unobserve(e.target); } });
      }, { root: scroll, threshold: 0.6 });
      days.forEach(el => io.observe(el));
    } else {
      days.forEach(ignite);
    }

    // The camera: scrollTop tweens (rAF) up the mountain, ~2.5s a day. The
    // FIRST touch/wheel kills auto for good; taps advance one day in either mode.
    let autoOn = !reduce, tweenRaf = 0, seqTimer = 0, dayIdx = -1;
    if (autoOn) root.classList.add('n7d--auto');   // snap sleeps while the camera drives (v781)
    // Absolute position within the scroll DOCUMENT (offsetTop alone resolves
    // against .n7d-path, which skewed every centering computation, v783).
    const absTop = (el) => el.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
    // v953: center the CONTENT wrapper, not the padded day box, so the camera
    // rests with the text in the middle (matching the manual snap). Falls back
    // to the element itself for the hero, which has no wrapper.
    const dcOf = (el) => (el && el.querySelector) ? (el.querySelector('.n7d-dc') || el) : el;
    const centerOf = (el) => {
      const c = dcOf(el);
      const target = absTop(c) - (scroll.clientHeight / 2) + (c.offsetHeight / 2);
      return Math.max(0, Math.min(target, scroll.scrollHeight - scroll.clientHeight));
    };
    const easeInOutCubic = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // gentle leave + land (cinematic camera)
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3); // moves at once, glides into place (snap / tap)
    const tweenTo = (to, ms, ease) => {
      cancelAnimationFrame(tweenRaf);
      const from = scroll.scrollTop, d = to - from, t0 = performance.now();
      const fn = ease || easeInOutCubic;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        scroll.scrollTop = from + d * fn(p);
        if (p < 1) tweenRaf = requestAnimationFrame(step);
      };
      tweenRaf = requestAnimationFrame(step);
    };
    const goTo = (idx, ms) => {
      dayIdx = Math.max(0, Math.min(days.length - 1, idx));
      tweenTo(centerOf(days[dayIdx]), ms || 950);
    };
    const stopAuto = () => {
      if (!autoOn && !seqTimer && !tweenRaf) return;
      autoOn = false;
      clearTimeout(seqTimer); seqTimer = 0;
      cancelAnimationFrame(tweenRaf); tweenRaf = 0;
      root.classList.remove('n7d--auto');   // hand the wheel to the finger: snap wakes up
    };
    // v947 (Malik: "there's a lot more text now and people CAN NOT read that
    // fast"). The dwell used to be a flat 3600ms (4800 for the dip), tuned when
    // every day was a one-liner. The days now run 30-95 words, so the camera
    // was pulling away mid-sentence. Dwell now scales with the day's own word
    // count (~200 wpm, so ~300ms/word), so it self-adjusts if the copy changes
    // again. Floors keep short days from feeling rushed, the cap keeps the
    // longest from feeling frozen, and the camera-travel time is added on top
    // so the reading window starts only once the day has landed centered. A
    // real touch/scroll still hands the wheel to the finger (stopAuto).
    const dwellFor = (dayEl) => {
      const words = ((dayEl && dayEl.textContent) || '').trim().split(/\s+/).filter(Boolean).length;
      const dip = dayEl && dayEl.classList.contains('n7d-day--dip');
      const read = Math.max(dip ? 5200 : 3400, Math.min(words * 300, 12000));
      return 1350 + read;   // + the tween travel, so reading time starts on landing
    };
    const seq = () => {
      if (!autoOn) return;
      if (dayIdx >= days.length - 1) {
        // v950: the final stop IS the last day now (the terminal 'Start Now.'
        // node), and it has a 60vh spacer below it, so the bottom of the scroll
        // is empty room, NOT the resting place. goTo already centered the final
        // when we arrived; just rest here. (The old code tweened to the very
        // bottom, which now lands on the void below the CTA.)
        return;
      }
      goTo(dayIdx + 1, 1350);
      seqTimer = setTimeout(seq, dwellFor(days[dayIdx]));
    };
    // v960: the hero intro must be SEEN before a tap can advance. Until it's
    // fully revealed, the first tap finishes the intro (types the rest of the
    // headline + lands the sub) instead of shooting the reader to day 1.
    // Two staged reveals so a tapper reads both lines before leaving: tap 1 fills
    // the headline, tap 2 lands the sub, then taps advance. Untapped, each auto-
    // arrives on a timer so a patient reader sees them too.
    let titleShown = reduce, introDone = reduce, introStartTimer = 0, introSubTimer = 0;
    const beginClimb = (delay) => { clearTimeout(seqTimer); if (autoOn) seqTimer = setTimeout(seq, delay); };
    const showSub = () => {
      if (introDone) return;
      introDone = true;
      clearTimeout(introSubTimer);
      if (sub) sub.classList.add('on');
      beginClimb(3600);
    };
    const onTitleShown = () => {
      if (titleShown) return;
      titleShown = true;
      clearTimeout(introSubTimer);
      introSubTimer = setTimeout(showSub, 1000);   // sub auto-lands a beat later if untapped
    };
    const revealTitle = () => {
      clearTimeout(introStartTimer);
      if (title) {
        title.classList.add('on');
        if (title._n7dFinish) title._n7dFinish();   // reveals the rest, then onTitleShown
        else { title.textContent = titleText; onTitleShown(); }
      } else { onTitleShown(); }
    };
    // Manual takeover: real gestures only (never the programmatic tween).
    ['touchstart', 'wheel', 'keydown'].forEach(ev =>
      scroll.addEventListener(ev, stopAuto, { passive: true }));

    // v955 (Malik): the swipe should snap the INSTANT the finger lifts, with the
    // snap itself still gliding. iOS's CSS mandatory snap waits for all momentum
    // to bleed off before it even begins, which reads as a lag. So on touch we
    // turn CSS snap OFF (.n7d--touch) and snap ourselves on touchend: project the
    // flick a little, pick the nearest stop, and tween to it with an ease-out so
    // it leaves at once and settles. Writing scrollTop also kills iOS momentum,
    // so there's no drift-then-snap. Desktop keeps CSS snap (right with a wheel).
    const snapEls = [root.querySelector('.n7d-hero'), ...days].filter(Boolean);
    const nearestTo = (pos) => {
      const mid = pos + scroll.clientHeight / 2;
      let best = null, bd = Infinity;
      for (const el of snapEls) {
        const c = absTop(dcOf(el)) + dcOf(el).offsetHeight / 2;
        const dist = Math.abs(c - mid);
        if (dist < bd) { bd = dist; best = el; }
      }
      return best;
    };
    let tY = 0, tT = 0, vY = 0, tMoved = 0, swiped = false, swipeGuard = 0;
    scroll.addEventListener('touchstart', (e) => {
      root.classList.add('n7d--touch');   // CSS snap sleeps; JS owns the snap
      const t = e.touches[0]; tY = t.clientY; tT = performance.now(); vY = 0; tMoved = 0;
    }, { passive: true });
    scroll.addEventListener('touchmove', (e) => {
      const t = e.touches[0], now = performance.now(), dt = now - tT;
      if (dt > 0) vY = (tY - t.clientY) / dt;   // px/ms, + = content scrolling up
      tMoved += Math.abs(t.clientY - tY);
      tY = t.clientY; tT = now;
    }, { passive: true });
    scroll.addEventListener('touchend', () => {
      if (tMoved < 10) return;                   // a tap, not a swipe: let click run
      if (!introDone) { swiped = true; clearTimeout(swipeGuard); swipeGuard = setTimeout(() => { swiped = false; }, 360); if (!titleShown) revealTitle(); else showSub(); return; }
      swiped = true;
      clearTimeout(swipeGuard);
      swipeGuard = setTimeout(() => { swiped = false; }, 360);
      const projected = scroll.scrollTop + vY * 200;   // honour the flick a touch
      const el = nearestTo(projected);
      if (el) {
        const idx = days.indexOf(el);
        if (idx >= 0) { dayIdx = idx; ignite(el); }
        tweenTo(centerOf(el), 400, easeOutCubic);       // begins on release, glides in
      }
    }, { passive: true });

    // Tap = one day up. A swipe already snapped itself, so ignore its trailing click.
    scroll.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('#n7dCta')) return;
      if (swiped) return;
      // staged: tap 1 fills the headline, tap 2 lands the sub, then taps advance
      if (!titleShown) { revealTitle(); return; }
      if (!introDone) { showSub(); return; }
      clearTimeout(seqTimer); seqTimer = 0;
      const touch = root.classList.contains('n7d--touch');
      // Desktop CSS snap fights the tween; briefly mute it. Touch has snap off already.
      if (!autoOn && !touch) { root.classList.add('n7d--auto'); setTimeout(() => { if (!autoOn) root.classList.remove('n7d--auto'); }, 620); }
      // past day 7 the next stop is the FINALE; a tap there never yanks the
      // camera back up (v788).
      if (dayIdx >= days.length - 1) {
        const max = scroll.scrollHeight - scroll.clientHeight;
        if (scroll.scrollTop < max - 8) tweenTo(max, 560, easeOutCubic);
      } else {
        const nx = Math.min(days.length - 1, dayIdx + 1);
        dayIdx = nx;
        ignite(days[nx]);                        // text instantly sharp on tap
        tweenTo(centerOf(days[nx]), 520, easeOutCubic);
      }
      if (autoOn) seqTimer = setTimeout(seq, 3400);
    });

    // Hero: the title TYPES with the tick, the sub lands, then the climb begins.
    // onTitleShown (v961) marks the headline seen + schedules the sub; a tap can
    // fast-forward each stage (revealTitle, then showSub) without advancing.
    if (reduce) {
      if (title) title.textContent = titleText;
      if (sub) sub.classList.add('on');
      days.forEach(ignite);
    } else {
      introStartTimer = setTimeout(() => {
        if (!title) return;
        title.classList.add('on');
        _n7dType(title, titleText, 52, onTitleShown);
      }, 900);
    }

    const cta = root.querySelector('#n7dCta');
    if (cta) cta.addEventListener('click', () => {
      stopAuto();
      // v963: open the destination FIRST, underneath the still-opaque 7-day (the
      // paywall lives at z 2100, this overlay at 9500), so the home is never
      // uncovered between screens. Then fade THIS overlay out to reveal it.
      try { if (typeof onProceed === 'function') onProceed(); } catch (e) {}
      // Force the paywall fully opaque at once so the crossfade reveals it, not a
      // half-faded panel with the home showing through. Its own fade would still
      // be running behind the opaque 7-day and finish mid-reveal otherwise.
      let pw = null;
      try {
        pw = document.getElementById('clarityPaywall');
        if (pw) { pw.classList.add('cpw--open'); pw.style.transition = 'none'; pw.style.opacity = '1'; }
      } catch (e) {}
      root.classList.add('n7d--out');
      setTimeout(() => {
        try { root.remove(); } catch (e) {}
        document.body.style.overflow = 'hidden';   // the paywall owns the scroll lock now
        try { if (pw) { pw.style.transition = ''; pw.style.opacity = ''; } } catch (e) {}   // restore its own fade for close
      }, 420);
    });
  } catch (e) { try { if (typeof onProceed === 'function') onProceed(); } catch (_) {} }
}


// `finalize` is the per-entry close step (close / completeWizard).
function _addToMementoThenAction(finalize) {
  const proceedAfter = () => {
    // The cinema now LANDS on the live home and waits: the card has evolved, the
    // header, bar and next-step card fade back in, and the user taps "Build my
    // plan" when they are ready. That tap (ActionExperience.open on an unpaid
    // user) is what leads into the First 7 Days screen, then the paywall, so the
    // moment is theirs to advance, nothing auto-fires over the reveal (Malik v676).
    // Returning path only: the quiet save-your-Memento nudge.
    try {
      state.meta = state.meta || {};
      if (state.meta.next7DaysSeen && typeof maybeShowSaveWorkNudge === 'function') {
        maybeShowSaveWorkNudge(function () {});
      }
    } catch (e) {}
  };
  const runClose = () => {
    try { if (typeof finalize === 'function') finalize(); } catch (e) {}
    // Clear the inline fade on the persistent clarity-exp so a future open is
    // never stuck invisible (it is hidden by its own classes now anyway).
    try { const cx = document.querySelector('.clarity-exp'); if (cx) { cx.style.transition = ''; cx.style.opacity = ''; } } catch (e) {}
    // A beat after landing on the home, play the cinematic evolution, then the
    // save nudge chains to its completion.
    setTimeout(() => {
      try {
        if (typeof _maybeRunCardEvolution === 'function') _maybeRunCardEvolution(proceedAfter);
        else proceedAfter();
      } catch (e) { proceedAfter(); }
    }, 240);
  };
  // FADE the ceremony + clarity overlay out first, revealing the Home behind it,
  // THEN close and start the cinematic evolution (Malik). Both the nsv2 ceremony
  // (body-mounted) and the clarity-exp fade together so the dashboard shows through.
  const overlays = [document.getElementById('nsv2Root'), document.querySelector('.clarity-exp')].filter(Boolean);
  if (overlays.length) {
    overlays.forEach(el => { try { el.style.transition = 'opacity 0.55s ease'; el.style.opacity = '0'; } catch (e) {} });
    setTimeout(runClose, 580);
  } else {
    runClose();
  }
}

function renderIgnitionV2(summary) {
  _ig2.summary = summary || {};
  const s = _ig2.summary;
  const goal = _ig2.goal || s.neutronStar || '';
  const seed = starSeedFromGoal(goal);
  let inner = '';

  if (_ig2Act === 'reveal') {
    // The whole sentence fades in as ONE block (Malik: not word by word), ending
    // with a period so it reads as a full sentence. The touch point and the quiet
    // hint fade in only after it has landed. No "Not quite" escape: reaching this
    // beat IS the confirmation.
    // v718 (Malik): no goal text on this beat, the star page says it again a
    // second later. Just the touch point + hint, centered on the dark.
    const START = 700;
    // v723 (Malik): an accretion field around the touch point. Calm rain at
    // rest (matter drifting toward the core), and a SURGE while holding: more
    // motes, much faster, the whole field contracting with --holdp. Same
    // language as the thinking loader, turned up and made interactive.
    // Motes spawn OFF-SCREEN (vmax radii) and ride in; the surge layer fades
    // in over ~1.1s on press instead of popping (organic, v724).
    // v730 (Malik): EXPONENTIAL escalation. 3-4 motes at rest, then five
    // doubling waves (8/16/32/64/96 = ~220 motes) gated by --holdp thresholds,
    // while the hold's rAF ramps every animation's playbackRate. Sizes carry
    // their own glow; every 3rd mote orbit-falls.
    // v773 (Malik: the hold MUST be perfectly smooth): the ~220 DOM motes were
    // ~220 individually composited GPU layers, which is why the hold kept
    // reading as laggy on-device no matter how the bookkeeping was tuned. The
    // whole field now renders on ONE canvas (see _nsv2FieldEngine below) with
    // the exact same parameters, trajectories, sizes, glows, waves and ramp.
    inner = `
      <div class="nsv2-reveal">
        <canvas class="nsv2-collapse-canvas" id="nsv2FieldCv" aria-hidden="true"></canvas>
        <div class="nsv2-reveal__after" style="animation-delay:${START}ms">
          <div class="nsv2-hold" id="nsv2Hold" role="button" tabindex="0" aria-label="Press and hold to collapse">
            <span class="nsv2-hold__core" aria-hidden="true"></span>
          </div>
          <div class="nsv2-reveal__hint"><span>Press and hold to collapse.</span></div>
        </div>
      </div>`;
  } else if (_ig2Act === 'sharpen') {
    inner = `
      <div class="nsv2-sharpen">
        <div class="nsv2-eyebrow">Sharpen it</div>
        <div class="nsv2-sharpen__hint">Make it so exact that a stranger could judge whether it happened. A number helps. A date helps.</div>
        <textarea class="nsv2-sharpen__input" id="nsv2GoalEdit" maxlength="180" rows="3">${esc(_ig2.draftGoal !== undefined ? _ig2.draftGoal : goal)}</textarea>
        <div class="nsv2-sharpen__ai" id="nsv2AiRow">
          <button type="button" class="nsv2-btn nsv2-btn--ghost" id="nsv2AiSharpen">Help me sharpen it</button>
          <span class="nsv2-sharpen__ai-note" id="nsv2AiNote"></span>
        </div>
        <button type="button" class="nsv2-btn nsv2-btn--primary" id="nsv2SharpenDone">This is it now</button>
      </div>`;
  } else {
    // _ig2Act === 'star'
    // THE Neutron Star: the same pulsar shader the teaching page and manifesto
    // use (Malik killed the bespoke JWST spike star, v585). One star everywhere.
    inner = `
      <div class="nsv2-starscene">
        <canvas class="nsv2-star__blob" id="nsv2StarBlob" aria-hidden="true"></canvas>
        <div class="nsv2-after">
          <div class="nsv2-after__eyebrow">Your Neutron Star</div>
          <div class="nsv2-after__goal">${esc(/[.!?]$/.test(String(goal).trim()) ? String(goal).trim() : String(goal).trim() + '.').replace(/(\d[\d,.]*)/g, '<span class="ns-min__num">$1</span>')}</div>
          <div class="nsv2-after__divider" aria-hidden="true"></div>
          <button type="button" class="nsv2-cta" id="nsv2Action"><span>Add to your Memento</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg></button>
        </div>
      </div>`;
  }

  // THE signature top-left beams, the exact same asset as the home ambient
  // (same beam configs as index.html), not a bespoke cluster. Born by --holdp.
  const RAY_BEAMS = [
    [3, 35, 9.4, 0.0, 0.04, 0.32, 0.85, 1.05, '165 130 255'],
    [9, 90, 11.6, 1.8, 0.07, 0.50, 0.55, 1.35, '130 170 255'],
    [16, 24, 7.1, 3.4, 0.05, 0.30, 0.7, 1.2, '255 110 140'],
    [22, 75, 13.2, 2.1, 0.09, 0.65, 0.6, 1.3, '175 140 255'],
    [29, 40, 10.5, 5.6, 0.05, 0.34, 0.5, 1.4, '255 255 255'],
    [36, 110, 8.3, 0.7, 0.11, 0.72, 0.65, 1.25, '150 120 255'],
    [43, 28, 14.8, 4.2, 0.04, 0.28, 0.8, 1.15, '140 180 255'],
    [50, 95, 9.0, 3.0, 0.10, 0.68, 0.55, 1.4, '185 145 255'],
    [57, 22, 12.3, 6.5, 0.04, 0.24, 0.75, 1.2, '255 130 155'],
    [64, 65, 10.9, 1.2, 0.08, 0.54, 0.6, 1.3, '120 165 255'],
    [72, 32, 8.6, 4.9, 0.05, 0.32, 0.7, 1.2, '255 255 255'],
    [80, 80, 11.4, 2.6, 0.09, 0.58, 0.55, 1.35, '170 135 255']
  ];
  const raysHtml = '<div class="nsv2__rays ambient__rays" aria-hidden="true"><div class="ambient__rays-source"></div>' +
    RAY_BEAMS.map(b => `<div class="ambient__rays-beam" style="--a:${b[0]}deg; --h:${b[1]}px; --d:${b[2]}s; --del:-${b[3]}s; --omin:${b[4]}; --omax:${b[5]}; --smin:${b[6]}; --smax:${b[7]}; --c:${b[8]};"><div class="ambient__rays-beam-shaft"></div></div>`).join('') +
    '</div>';

  return `
    <div class="nsv2" id="nsv2Root" data-act="${esc(_ig2Act)}">
      ${raysHtml}
      <div class="nsv2__white" aria-hidden="true"></div>
      <div class="nsv2__dust" aria-hidden="true"></div>
      <div class="nsv2__vignette" aria-hidden="true"></div>
      <div class="nsv2__inner">${inner}</div>
      <div class="nsv2__grain" aria-hidden="true"></div>
    </div>`;
}

function _ig2Rerender() {
  const root = document.getElementById('nsv2Root');
  if (!root || !root.parentNode) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = renderIgnitionV2(_ig2.summary);
  root.parentNode.replaceChild(wrap.firstElementChild, root);
  bindIgnitionV2(document);
}

function bindIgnitionV2(container) {
  let root = (container.querySelector ? container.querySelector('#nsv2Root') : null) || document.getElementById('nsv2Root');
  if (!root) return;
  // Portal to <body>: ancestors inside the wizard page carry transforms, which
  // trap position:fixed and let the dashboard bleed in at the sides.
  if (root.parentNode !== document.body) document.body.appendChild(root);
  const act = root.getAttribute('data-act');
  const a = (state.clarity && state.clarity.answers) || {};

  if (act === 'reveal') {
    const no = root.querySelector('#nsv2No');
    if (no) no.addEventListener('click', () => { _ig2Act = 'sharpen'; _ig2Rerender(); });
    _bindHoldToIgnite(root);
  } else if (act === 'sharpen') {
    const input = root.querySelector('#nsv2GoalEdit');
    const aiBtn = root.querySelector('#nsv2AiSharpen');
    const note = root.querySelector('#nsv2AiNote');
    if (input) input.addEventListener('input', () => { _ig2.draftGoal = input.value; });
    if (aiBtn) aiBtn.addEventListener('click', async () => {
      aiBtn.disabled = true; if (note) note.textContent = 'Thinking...';
      try {
        const sharper = await sharpenGoalAI((input ? input.value : '') || _ig2.goal || _ig2.summary.neutronStar || '');
        if (sharper && input) { input.value = sharper; _ig2.draftGoal = sharper; if (note) note.textContent = 'A sharper cut. Edit it until it is yours.'; }
        else if (note) note.textContent = 'Could not reach the AI. Edit it by hand.';
      } catch (e) { if (note) note.textContent = 'Could not reach the AI. Edit it by hand.'; }
      aiBtn.disabled = false;
    });
    const done = root.querySelector('#nsv2SharpenDone');
    if (done) done.addEventListener('click', () => {
      const v = ((input && input.value) || '').trim();
      if (v) {
        _ig2.goal = v;
        a.neutronStar = v; a.keystone = v;
        if (_ig2.summary) _ig2.summary.neutronStar = v;
        try { persistNow(); } catch (e) {}
      }
      _ig2.draftGoal = undefined;
      _ig2Act = 'reveal';
      _ig2Rerender();
    });
  } else if (act === 'star') {
    const blob = root.querySelector('#nsv2StarBlob');
    if (blob && typeof initStarBlob === 'function') { setTimeout(() => { try { initStarBlob(blob, 720, 'pulsar'); } catch (e) {} }, 40); }
    _bindStarPlacard(root);
  }
}

// ── The collapse field, on ONE canvas (v773) ────────────────────────────────
// Exact port of the DOM field's parameters (v730-732): 4 idle motes + five
// doubling waves (8/16/32/64/96) gated by hold-progress thresholds, straight
// falls eased by cubic-bezier(0.45,0,0.75,0.4), every 3rd mote orbit-falling
// through the v728 velocity-matched two-segment spiral, sizes 4-12px with
// mass-scaled durations and s*2.2 glows, the whole field contracting with the
// hold and the speed ramping 1x -> 3.8x. One composited layer instead of ~220.
function _nsv2FieldEngine(root) {
  const cv = root.querySelector('#nsv2FieldCv');
  const holdEl = root.querySelector('#nsv2Hold');
  if (!cv || !holdEl) return null;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, cx = 0, cy = 0, vmax = 0;
  const size = () => {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    vmax = Math.max(W, H) / 100;
    try { const r = holdEl.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; } catch (e) { cx = W / 2; cy = H / 2; }
  };
  size();
  window.addEventListener('resize', size);
  // cubic-bezier evaluator (x -> t -> y), Newton + bisection fallback
  const bez = (x1, y1, x2, y2) => {
    const cxb = 3 * x1, bxb = 3 * (x2 - x1) - cxb, axb = 1 - cxb - bxb;
    const cyb = 3 * y1, byb = 3 * (y2 - y1) - cyb, ayb = 1 - cyb - byb;
    const sx = (t) => ((axb * t + bxb) * t + cxb) * t;
    const dx = (t) => (3 * axb * t + 2 * bxb) * t + cxb;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 5; i++) { const e = sx(t) - x; const d = dx(t); if (Math.abs(e) < 1e-4 || d < 1e-6) break; t -= e / d; }
      if (t < 0) t = 0; if (t > 1) t = 1;
      return ((ayb * t + byb) * t + cyb) * t;
    };
  };
  const easeFall = bez(0.45, 0, 0.75, 0.4);
  const easeS1 = bez(0.4, 0, 0.7, 0.5);
  const easeS2 = bez(0.3, 0.5, 0.75, 0.5);
  // motes: same generator math as the DOM mkMote
  const SZ = [4, 5, 6.5, 8, 10, 12];
  const mass = (px, base) => (base * (0.85 + (px / 12) * 0.33));
  const motes = [];
  const mk = (i, base, seedA, seedStep, wave) => {
    const px = SZ[(i * seedStep + seedA) % 6];
    const d = mass(px, base + (i % 5) * 0.22);
    const del = (i % 9) * 0.31;
    motes.push({
      a: ((i * 137 + seedA * 41) % 360) * Math.PI / 180,
      d: d, s: px, r: 52 + (i % 6) * 7,
      orb: i % 3 === 2, wave: wave,
      phase: (del / d) % 1
    });
  };
  for (let i = 0; i < 4; i++) mk(i, 5.4, 0, 5, -1);
  [[8, 2.4], [16, 2.0], [32, 1.7], [64, 1.4], [96, 1.15]].forEach((wv, w) => {
    for (let i = 0; i < wv[0]; i++) mk(i, wv[1], w + 1, 7, w);
  });
  const WAVE_T = [0.02, 0.18, 0.36, 0.54, 0.72];
  // pre-rendered sprites (core + glow) per size, at 2x headroom for the glow
  const sprites = {};
  const sprite = (px) => {
    let sp = sprites[px];
    if (sp) return sp;
    const glow = px * 2.2;
    const rad = px / 2 + glow;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(rad * 2 * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    // the box-shadow glow: a soft radial halo
    let gr = g.createRadialGradient(rad, rad, px * 0.2, rad, rad, rad);
    gr.addColorStop(0, 'rgba(150,220,245,0.65)');
    gr.addColorStop(0.45, 'rgba(150,220,245,0.28)');
    gr.addColorStop(1, 'rgba(150,220,245,0)');
    g.fillStyle = gr; g.fillRect(0, 0, rad * 2, rad * 2);
    // the mote body
    gr = g.createRadialGradient(rad - px * 0.08, rad - px * 0.1, px * 0.08, rad, rad, px / 2);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.55, 'rgba(214,236,252,0.95)');
    gr.addColorStop(1, 'rgba(170,225,248,0.85)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(rad, rad, px / 2, 0, Math.PI * 2); g.fill();
    sp = { c: c, rad: rad };
    sprites[px] = sp;
    return sp;
  };
  const eng = { p: 0, holding: false, stopped: false, fade: 1 };
  let last = performance.now(), raf = 0;
  const SHAKE = [[0, 0], [2.6, -1.8], [-2.2, 1.4], [1.8, 2.2]];
  const frame = (now) => {
    if (eng.stopped && eng.fade <= 0) { try { ctx.clearRect(0, 0, cv.width, cv.height); } catch (e) {} return; }
    if (!cv.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (eng.stopped) eng.fade = Math.max(0, eng.fade - dt * 4);
    const p = eng.p;
    const rate = 1 + p * 2.8;
    const fieldScale = 1 - p * 0.5;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // pressure shake (mirrors nsv2CollapseShake, 0.3s cycle, amplitude * p)
    let ox = 0, oy = 0;
    if (eng.holding && p > 0) {
      const sh = SHAKE[Math.floor((now / 75) % 4)];
      ox = sh[0] * p; oy = sh[1] * p;
    }
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      let wa = 1;
      if (m.wave >= 0) {
        if (!eng.holding && p <= 0) continue;              // waves sleep until the hold
        wa = Math.max(0, Math.min(1, (p - WAVE_T[m.wave]) * 6));
        if (wa <= 0) continue;
      }
      m.phase += (dt / m.d) * rate;
      if (m.phase >= 1) m.phase -= 1;
      const ph = m.phase;
      let ang, rr, sc, op;
      if (m.orb) {
        if (ph < 0.5) {
          const t = easeS1(ph / 0.5);
          ang = m.a + (140 * Math.PI / 180) * t;
          rr = m.r * (1 - 0.58 * t);
          sc = 1 - 0.15 * t;
        } else {
          const t = easeS2((ph - 0.5) / 0.5);
          ang = m.a + (140 + 160 * t) * Math.PI / 180;
          rr = m.r * 0.42 * (1 - t) + (3 / vmax) * t;
          sc = 0.85 - 0.65 * t;
        }
        op = ph < 0.1 ? ph / 0.1 * 0.95 : ph < 0.5 ? 0.95 - (ph - 0.1) / 0.4 * 0.05 : ph < 0.93 ? 0.9 - (ph - 0.5) / 0.43 * 0.05 : 0.85 * (1 - (ph - 0.93) / 0.07);
      } else {
        const e = easeFall(ph);
        ang = m.a;
        rr = m.r * (1 - e) + (3 / vmax) * e;
        sc = 1 - 0.8 * e;
        op = ph < 0.12 ? ph / 0.12 * 0.95 : ph < 0.93 ? 0.95 - (ph - 0.12) / 0.81 * 0.05 : 0.9 * (1 - (ph - 0.93) / 0.07);
      }
      const dist = rr * vmax * fieldScale;
      const x = cx + Math.cos(ang) * dist + ox;
      const y = cy + Math.sin(ang) * dist + oy;
      const sp = sprite(m.s);
      const half = sp.rad * sc * fieldScale;
      if (x + half < 0 || x - half > W || y + half < 0 || y - half > H) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, op * wa)) * eng.fade;
      ctx.drawImage(sp.c, x - half, y - half, half * 2, half * 2);
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  eng.stop = () => { eng.stopped = true; };
  eng.destroy = () => { eng.stopped = true; eng.fade = 0; try { cancelAnimationFrame(raf); } catch (e) {} try { window.removeEventListener('resize', size); } catch (e) {} };
  return eng;
}

// Press-and-hold on the ring under the sentence. Filling the ring is the
// confirmation: release early and it resets, so nobody ignites by accident.
function _bindHoldToIgnite(root) {
  const hold = root.querySelector('#nsv2Hold');
  if (!hold) return;
  const HOLD_MS = 5000;
  let raf = null, start = 0, done = false;
  // v773: the mote field lives on one canvas; the engine reads p directly
  // (its speed ramp 1x -> 3.8x and wave gates run inside its own rAF).
  const eng = _nsv2FieldEngine(root);
  let lastQ = -1;
  const setP = (p) => {
    // No progress ring anymore (Malik): the touch point itself grows + glows
    // with --holdp, and the beams brighten and the sentence shakes harder.
    // v765 (Malik: hold got laggy): --holdp drives var()-based box-shadows,
    // shake keyframes and the beams' brightness FILTER, each write re-rasters
    // them. Quantize to 2% steps: ~50 restyles over the 5s hold instead of
    // ~300 per-frame ones. The canvas field is independent and continuous.
    const q = p <= 0 ? 0 : Math.round(p * 50) / 50;
    if (q !== lastQ) { lastQ = q; root.style.setProperty('--holdp', String(q)); }
    if (eng) { eng.p = p; eng.holding = p > 0; }
  };
  const tick = (t) => {
    if (done) return;
    const p = Math.min(1, (t - start) / HOLD_MS);
    setP(p);
    if (p >= 1) { done = true; root.classList.remove('is-holding'); if (eng) eng.stop(); _ig2Signed(root); return; }
    raf = requestAnimationFrame(tick);
  };
  const begin = (e) => {
    if (done) return;
    e.preventDefault();
    // Belt-and-braces (v763): make sure the mount entrance animation is fully
    // released before the surge starts, so nothing holds the full-screen root
    // as a composited opacity group while ~220 motes are flying.
    try { root.style.animation = 'none'; } catch (err) {}
    root.classList.add('is-holding');
    start = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const cancel = () => {
    if (done) return;
    root.classList.remove('is-holding');
    if (raf) cancelAnimationFrame(raf);
    setP(0);
  };
  hold.addEventListener('pointerdown', begin);
  document.addEventListener('pointerup', cancel);
  document.addEventListener('pointercancel', cancel);
  // Keyboard path: holding Space or Enter fills the same ring.
  hold.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat && !done) { e.preventDefault(); begin(e); }
  });
  hold.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') cancel();
  });
}

function _ig2Signed(root) {
  // The hold completed: persist the ignition, then collapse into the star.
  state.clarity.ignitedAt = Date.now();
  try { persistNow(); } catch (e) {}
  try { if (typeof writeProofEvent === 'function') writeProofEvent('proof', { title: 'Ignition', text: 'Signed and ignited their Neutron Star', module: 'clarity', silent: true }); } catch (e) {}

  const lite = document.documentElement.classList.contains('lowfx')
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add(lite ? 'is-collapsing-lite' : 'is-collapsing');
  // v587: the flash fills the WHOLE screen solid white, the star act swaps in
  // behind it, then the white fades and the star slowly zooms out. The flare
  // lives on <body> so the act re-render cannot kill it mid-fade.
  const flare = document.createElement('div');
  flare.className = 'nsv2__flare' + (lite ? '' : ' nsv2__flare--v2');
  document.body.appendChild(flare);
  // Remove strictly AFTER the fade animation ends (v592: it was being yanked
  // out at 3.5s mid-fade, which read as the white vanishing instantly).
  setTimeout(() => { try { flare.remove(); } catch (e) {} }, lite ? 900 : 5400);

  setTimeout(() => {
    _ig2Act = 'star';
    _ig2Rerender();
  }, lite ? 700 : 800);
}

function _bindStarPlacard(root) {
  // Primary handoff: the star leads straight into the first move.
  const actionBtn = root.querySelector('#nsv2Action');
  if (actionBtn) actionBtn.addEventListener('click', () => {
    // THE MESSAGE BEAT (phase 4). The star animation is done and Continue is
    // the seam, so the invite intercepts HERE, before the handoff, and both
    // of its answers fall straight back into the handoff below. Optional,
    // never a gate, and removable by flipping CP_MESSAGE_BEAT to false.
    _cpMessageBeat(() => {
      _ig2Act = 'reveal'; _ig2 = {};
      // "Add to your Memento" (Malik): FADE the ceremony back to the home, then play
      // the card unlock cinema. _addToMementoThenAction fades the overlay out first;
      // the nsv2 root is removed inside finalize (after the fade), not before it.
      _addToMementoThenAction(() => {
        try { const r = document.getElementById('nsv2Root'); if (r) r.remove(); } catch (e) {}
        try { completeWizard(); } catch (e) {}
        try { if (ClarityExperience && ClarityExperience.isOpen) ClarityExperience.close(); } catch (e) {}
      });
    });
  });
  const doneBtn = root.querySelector('#nsv2Done');
  if (doneBtn) doneBtn.addEventListener('click', () => {
    _ig2Act = 'reveal'; _ig2 = {};
    try { const r = document.getElementById('nsv2Root'); if (r) r.remove(); } catch (e) {}
    try {
      if (ClarityExperience && ClarityExperience.isOpen) {
        const summary = normalizeClaritySummary(state.clarity.answers);
        ClarityExperience.pageWrap.innerHTML = `<div class="clarity-exp__page-inner clarity-exp__page-inner--summary">${renderNeutronStarSummary(summary, { allowContinue: true, showRestart: true })}</div>`;
        clarityUpgradeSummaryToPager(ClarityExperience.pageWrap);
        ClarityExperience.navEl.innerHTML = '';
        requestAnimationFrame(() => initNeutronStarCard(ClarityExperience.pageWrap, () => { ClarityExperience.isOpen = false; ClarityExperience.open(); }));
        ClarityExperience.bindWizardInFullscreen();
      }
    } catch (e) {}
  });
}

// Closing the clarity experience must also clean up a body-mounted ceremony
// overlay (the v2 ignition portals itself to <body>).
(function () {
  try {
    const _origClose = ClarityExperience.close.bind(ClarityExperience);
    ClarityExperience.close = function () {
      try { const r = document.getElementById('nsv2Root'); if (r) r.remove(); } catch (e) {}
      return _origClose.apply(this, arguments);
    };
  } catch (e) {}
})();

// DEV PREVIEW (demo mode only): open the app with ?ceremony=1 to watch the
// VERY end of the questionnaire with the demo persona's answers, without
// redoing the wizard: the "Synthesizing your Neutron Star..." curtain, the cut
// into the reveal, and the star. Clears ignitedAt for this session only
// (demo data is throwaway). A floating scrubber (bottom of screen) jumps
// freely between S (synthesis), 1 (reveal) and 2 (star) both ways, so the
// whole ending can be reviewed. The hold-to-ignite on 1 works live and cuts
// to the star for real. Inert without ?ceremony=1.
(function () {
  try {
    // The synth/reveal/star jump functions are ALWAYS defined and exposed on
    // window.DevCeremony so the ?dev=evo cheat bar can fly to the end of Clarity
    // too. Only the ?ceremony=1 auto-scrubber boots on its own.
    const CEREMONY_SCRUB = /[?&]ceremony=1/.test(location.search);

    // The reviewable stages. 'synth' replays the REAL end-of-questionnaire
    // moment: the aurora "Synthesizing your Neutron Star..." curtain that plays
    // after the last answer, which then cuts into the ceremony exactly like the
    // live flow (renderAiSynthesis -> renderIgnitionV2 when the result lands).
    const STAGES = ['synth', 'reveal', 'star'];
    let devSummary = null;
    let devSynthTimer = null;

    // bindIgnitionV2 re-mounts #nsv2Root onto <body>, so stage changes must
    // clear that body-mounted root or the old act stays visible on top.
    const clearCeremonyRoot = () => {
      const r = document.getElementById('nsv2Root');
      if (r) r.remove();
    };

    const showCeremony = (act) => {
      if (devSynthTimer) { clearTimeout(devSynthTimer); devSynthTimer = null; }
      clearCeremonyRoot();
      _ig2Act = act;
      ClarityExperience.pageWrap.innerHTML = '<div class="clarity-exp__page-inner clarity-exp__page-inner--summary">' + renderIgnitionV2(devSummary) + '</div>';
      ClarityExperience.navEl.innerHTML = '';
      bindIgnitionV2(document);
    };

    const showSynth = () => {
      if (devSynthTimer) { clearTimeout(devSynthTimer); devSynthTimer = null; }
      clearCeremonyRoot();
      _ig2Act = 'synth';
      // Same markup the real aiSynthesis step shows while Opus is working.
      ClarityExperience.pageWrap.innerHTML = '<div class="clarity-exp__page-inner">' +
        '<div class="ai-thinking ai-thinking--quiet"><span class="quiet-line">One moment.</span></div></div>';
      ClarityExperience.navEl.innerHTML = '';
      // Dev pacing: shrink a moment, then run the same pixel-fall the real
      // flow uses (finishCondenseThen) so the beat previews true to life.
      devSynthTimer = setTimeout(() => {
        const go = () => showCeremony('reveal');
        if (typeof finishCondenseThen === 'function') finishCondenseThen(go); else go();
      }, 2600);
    };

    // Filler goal (Malik) so the ceremony/summary previews look real even when
    // there is no synthesized star yet. Used ONLY for the cheat-bar preview;
    // never written to state.
    const FILLER_ANSWERS = {
      neutronStar: 'Grow Memento to 1,000 paying users who would miss it if it disappeared',
      coreWhy: 'Too many people stay busy for years without ever moving, and most apps feed the distraction instead of cutting it.',
      antiVision: 'Another well-designed app people download, admire for a day, and forget by the weekend.',
      futureVision: 'A product people open every morning because it points them straight at the one move that matters that day.',
      identityLine: 'The builder who made real focus feel inevitable instead of impossible.',
      timeHorizon: '12 months',
      anchor: 'Purpose',
      intensity: 'High'
    };
    // Shared API for the cheat bar: build a demo summary lazily, open the
    // fullscreen Clarity shell, and jump straight to any ending beat.
    const ensureSummary = () => {
      if (!devSummary) {
        try {
          const ans = state.clarity.answers || {};
          const hasStar = String(ans.neutronStar || '').trim().length > 0;
          // v1185 (Malik): the dev jump should land on a goal the tracking can
          // actually demo, so a numberless star gets the numeric filler too.
          let numeric = false;
          try {
            const t = (typeof extractGoalTarget === 'function') ? extractGoalTarget(String(ans.neutronStar || '')) : null;
            numeric = !!(t && t.target !== null && t.target !== undefined);
          } catch (e) {}
          // v881 (Malik): cheat jumps must leave REAL-flow state behind. With
          // no real star, the filler becomes the state's star, exactly as if
          // the user had synthesized it, so the home/gates read post-Clarity.
          if (!hasStar || !numeric) state.clarity.answers = Object.assign({}, ans, FILLER_ANSWERS);
          devSummary = normalizeClaritySummary(state.clarity.answers);
        } catch (e) {}
      }
      return devSummary;
    };
    const openShell = () => {
      try {
        _ig2 = {};
        ensureSummary();
        // Prime the gates so the cheat bar can REPLAY the full flow, including the
        // card-evolution cinema on "Add to your Memento" (which is once-per-lifetime
        // for real users, so it never fires twice without this reset). Dev-only:
        // DevCeremony is cheat-bar gated. Restart Clarity/Everything to undo.
        state.meta = state.meta || {};
        state.meta.cardEvolutionSeen = false;
        state.clarity.completed = true;
        state.clarity.completedAt = state.clarity.completedAt || Date.now();
        state.clarity.ignitedAt = Date.now();
        try { persistNow(); } catch (ePersist) {}
        ClarityExperience.isOpen = true;
        if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show('clarity');
        ClarityExperience.el.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        try { TabBar.hide(); } catch (e) {}
        ClarityExperience.el.classList.add('open-bg');
        ClarityExperience.el.classList.add('open-bg-visible');
        ClarityExperience.el.classList.add('open-content');
      } catch (e) {}
    };
    window.DevCeremony = {
      open: openShell,
      synth: () => { openShell(); showSynth(); },
      reveal: () => { openShell(); showCeremony('reveal'); },
      star: () => { openShell(); showCeremony('star'); },
      summary: () => {
        // openShell marks the experience open, which trips openSummary's
        // already-open guard into a silent no-op. Prime the state via the
        // shell, then hand the actual open to openSummary itself.
        openShell();
        ClarityExperience.isOpen = false;
        try { ClarityExperience.openSummary(); } catch (e) {}
      }
    };

    // Free back/forth scrubber over the synth beat + five ceremony acts.
    const mountCeremonyScrubber = () => {
      const ACTS = STAGES;
      const old = document.getElementById('nsv2DevScrub');
      if (old) old.remove();
      const bar = document.createElement('div');
      bar.id = 'nsv2DevScrub';
      bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:2147483000;display:flex;align-items:center;gap:6px;padding:8px 10px;border-radius:14px;background:rgba(10,10,14,0.86);-webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 12px 34px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08);font:600 12px -apple-system,system-ui,sans-serif;color:#fff;';
      const mk = (label, onClick, extra) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = label;
        b.style.cssText = 'appearance:none;border:0;cursor:pointer;font:inherit;color:#fff;background:rgba(255,255,255,0.08);border-radius:9px;padding:7px 10px;transition:background 0.15s ease;' + (extra || '');
        b.addEventListener('click', (e) => { e.preventDefault(); onClick(); });
        return b;
      };
      const go = (idx) => {
        const stage = ACTS[Math.max(0, Math.min(ACTS.length - 1, idx))];
        if (stage === 'synth') showSynth();
        else showCeremony(stage);
        paint();
      };
      const prev = mk('◀', () => go(ACTS.indexOf(_ig2Act) - 1), 'font-size:11px;');
      const next = mk('▶', () => go(ACTS.indexOf(_ig2Act) + 1), 'font-size:11px;');
      const chipsWrap = document.createElement('div');
      chipsWrap.style.cssText = 'display:flex;gap:4px;';
      const chips = ACTS.map((s, i) => mk(s === 'synth' ? 'S' : String(i), () => go(i), 'padding:7px 9px;min-width:26px;'));
      chips.forEach(c => chipsWrap.appendChild(c));
      const label = document.createElement('span');
      label.style.cssText = 'min-width:88px;text-align:center;opacity:0.82;letter-spacing:0.02em;text-transform:capitalize;';
      function paint() {
        const cur = Math.max(0, ACTS.indexOf(_ig2Act));
        label.textContent = (cur === 0 ? 'S' : cur) + '/' + (ACTS.length - 1) + '  ' + (ACTS[cur] === 'synth' ? 'synthesis' : ACTS[cur]);
        chips.forEach((c, i) => {
          c.style.background = i === cur ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.08)';
          c.style.color = i === cur ? '#000' : '#fff';
        });
      }
      bar.appendChild(prev); bar.appendChild(chipsWrap); bar.appendChild(next); bar.appendChild(label);
      document.body.appendChild(bar);
      paint();
      // Keep the readout honest if a real in-ceremony button advances the act.
      // A change-detecting poll (NOT a MutationObserver): paint() mutates the DOM,
      // so a subtree observer would fire on its own writes and loop forever.
      let lastAct = _ig2Act;
      setInterval(() => { if (_ig2Act !== lastAct) { lastAct = _ig2Act; paint(); } }, 250);
    };

    const boot = () => {
      setTimeout(() => {
        try {
          if (typeof DEMO_MODE === 'undefined' || !DEMO_MODE) return;
          state.clarity.ignitedAt = null;
          _ig2 = {};
          devSummary = normalizeClaritySummary(state.clarity.answers);
          ClarityExperience.isOpen = true;
          if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show('clarity');
          ClarityExperience.el.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
          try { TabBar.hide(); } catch (e) {}
          ClarityExperience.el.classList.add('open-bg');
          ClarityExperience.el.classList.add('open-bg-visible');
          ClarityExperience.el.classList.add('open-content');
          // Start at the synth beat: the loading curtain the user actually sees
          // after their last answer, then the cut into the ceremony.
          showSynth();
          mountCeremonyScrubber();
        } catch (e) {}
      }, 1400);
    };
    if (CEREMONY_SCRUB) {
      if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
      else document.addEventListener('DOMContentLoaded', boot);
    }
  } catch (e) {}
})();

/* ============================================================
   CLARITY PAGER, phase 1 of the Clarity merge.
   (plan: CLARITY-MERGE-CHECKLIST.md, mock: mockups/clarity-home/clarity-pages.html)

   The post-run Clarity surface becomes three swipeable pages with dots:
     1. the Neutron Star (the shipped scene, moved into the pager untouched)
     2. the summary: standing, why, anti-vision, Tweak
     3. your notes: the stack, Add at the top
   Resume law (v764): re-entering Clarity always lands page 1. The pager is
   built fresh on every open, so scrollLeft starts at 0 every time.

   Pages 2 and 3 are their OWN sibling sections. They are never nested inside
   .ns-star-scene: base.css re-pins --ink to white on that element so the star
   stays a space scene in both themes, and inheriting that would make the
   locked light mode white on white. Styling lives in css/clarity.css.

   Phase 1 is layout only. Update progress, Neutron Star Fulfilled, Tweak and
   Add are rendered and tappable but their flows are phases 3 and 4; every
   handler here is a logging no-op.
   ============================================================ */

const CP_ICON_PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const CP_ICON_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

function _cpNum(n) {
  const v = Number(n);
  if (!isFinite(v)) return '';
  try { return v.toLocaleString('en-US', { maximumFractionDigits: 2 }); } catch (e) { return String(v); }
}

function _cpDayToDate(day) {
  const t = Date.parse(String(day || '') + 'T00:00:00');
  return isFinite(t) ? new Date(t) : null;
}

function _cpLongDate(d) {
  if (!d) return '';
  try { return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; }
}

// the "as of" stamp. Plain words, no invented precision.
function _cpAsOf(day) {
  const d = _cpDayToDate(day);
  if (!d) return '';
  const n = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (n <= 0) return 'as of today';
  if (n === 1) return 'as of yesterday';
  if (n < 7) return 'as of ' + n + ' days ago';
  if (n < 14) return 'as of last week';
  if (n < 60) return 'as of ' + Math.round(n / 7) + ' weeks ago';
  const m = Math.round(n / 30);
  return 'as of ' + m + ' month' + (m === 1 ? '' : 's') + ' ago';
}

/* The 6-type to 3-face table (checklist audit amendment, 2026-08-19).
   ccGoalShape() in js/08 is the single resolver; nothing here re-classifies.
     quantity_up    -> number
     quantity_down  -> number, direction-aware
     milestone      -> dated wall when a deadline exists, else why-led
     maintenance    -> why-led
     frequency      -> why-led
     open           -> why-led
   Never a fake number: a number face with no parsed target falls back to
   why-led rather than inventing one. */
function _cpFace() {
  let shape = null, gp = null;
  try { shape = (typeof ccGoalShape === 'function') ? ccGoalShape() : null; } catch (e) { shape = null; }
  try { gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : (state.goalProgress || null); } catch (e) { gp = state.goalProgress || null; }
  let face = 'why';
  if (shape) {
    if (shape.type === 'quantity_up' || shape.type === 'quantity_down') face = 'number';
    else if (shape.type === 'milestone' && shape.deadline) face = 'dated';
  }
  if (face === 'number' && !(gp && gp.target !== null && gp.target !== undefined && isFinite(Number(gp.target)))) face = 'why';
  if (face === 'dated' && !(shape && shape.deadline)) face = 'why';
  return { face: face, shape: shape || {}, gp: gp || {} };
}

function _cpWhyBlock(why) {
  if (!why) return '';
  return '<div class="cp-div"></div><div class="cp-lab">Why this matters</div>' +
    '<div class="cp-why">' + esc(why) + '</div>';
}

// The standing block. One of three faces, never a fourth.
function _cpStanding(f, why) {
  const gp = f.gp, shape = f.shape;

  if (f.face === 'number') {
    const unit = String(gp.unit || shape.unit || '').trim();
    const cur = Number(gp.current);
    const hasCur = gp.current !== null && gp.current !== undefined && isFinite(cur);
    let html = '<div class="cp-lab">Where you stand</div>';
    if (hasCur) {
      /* v1191 (Malik): the number IS the button. The "Update progress" chip is
         gone, so the whole standing block (number, unit, stamp) is one generous
         tap target that opens the update screen. No new chrome: the press-scale
         idiom every other Clarity control uses is the whole affordance. */
      const asOf = _cpAsOf(gp.updatedAt);
      html += '<div class="cp-numtap" id="cpUpdate" role="button" tabindex="0" ' +
          'aria-label="Update progress">' +
        '<div class="cp-num"><span class="cp-num__v">' + _cpNum(cur) + '</span>' +
        (unit ? '<span class="cp-num__unit">' + esc(unit) + '</span>' : '') + '</div>' +
        (asOf ? '<div class="cp-asof">' + esc(asOf) + '</div>' : '') +
      '</div>';
      const base = (gp.baseline !== null && gp.baseline !== undefined && isFinite(Number(gp.baseline))) ? Number(gp.baseline) : null;
      const tgt = Number(gp.target);
      if (base !== null && isFinite(tgt)) {
        // pct = (current - baseline) / (target - baseline), clamped 0..1.
        // Direction-safe by construction: on a down-goal both halves are
        // negative, so the ratio still reads as progress toward the target.
        let pct = (tgt === base) ? 1 : (cur - base) / (tgt - base);
        if (!isFinite(pct)) pct = 0;
        pct = Math.max(0, Math.min(1, pct));
        html += '<div class="cp-prog"><div class="cp-track">' +
          '<span class="cp-track__fill" style="width:' + (pct * 100).toFixed(2) + '%"></span></div>' +
          '<div class="cp-pts"><span>' + _cpNum(base) + '</span><span>' + _cpNum(tgt) + '</span></div></div>';
        const down = tgt < base;
        const left = Math.max(0, down ? (cur - tgt) : (tgt - cur));
        /* v1226 (Malik): the line at the end of the road should say they got
           there. "0 to go" is the arithmetic, not the moment. The number still
           animates into place first (_cpCountTo drives .cp-rem__v), so the
           reached line only replaces it once the count has landed on zero. */
        html += (left === 0)
          ? '<div class="cp-rem cp-rem--done" data-cp-down="' + (down ? '1' : '0') + '">' +
              '<span class="cp-rem__v">Reached</span></div>'
          : '<div class="cp-rem" data-cp-down="' + (down ? '1' : '0') + '">' +
              '<span class="cp-rem__v">' + ((down ? '-' : '+') + _cpNum(left)) + '</span>' +
              '<s>to go</s></div>';
      }
    } else {
      /* v1219 (Malik, on-device): plain text failed as a door, he could not
         find the update screen. The empty state gets a real button. */
      html += '<div class="cp-none">No number logged yet.</div>' +
        '<button type="button" class="cp-logfirst" id="cpUpdate">Log your number</button>';
    }
    /* Adjudicated (Fable, 2026-08-19): the "Neutron Star Fulfilled" lock chip
       lives on the UPDATE SCREEN only (checklist Completion section + the
       canonical mock's page 2, which shows no chip). Renders in Phase 4. */
    return html + _cpWhyBlock(why);
  }

  if (f.face === 'dated') {
    // The wall. It moves itself, so there is no update button here.
    const ms = shape.deadline.getTime() - Date.now();
    const days = Math.max(0, Math.ceil(ms / 86400000));
    const label = String(shape.deadlineText || '').trim();
    const sub = 'to ' + (label ? label + ', ' : '') + _cpLongDate(shape.deadline);
    return '<div class="cp-lab">Where you stand</div>' +
      '<div class="cp-num">' + _cpNum(days) +
      '<span class="cp-num__unit">' + (days === 1 ? 'day' : 'days') + '</span></div>' +
      '<div class="cp-asof">' + esc(sub) + '</div>' +
      _cpWhyBlock(why);
  }

  // why-led: no standing block at all, the why leads the page in large type.
  // v1187 (Malik): a numberless goal is NOT nudged into getting one here;
  // post-hoc number-forcing was built (v1185) and killed on sight ("feels
  // very wrong and off"). The number question belongs INSIDE the Clarity
  // conversation; if Clarity did not produce one, this page tracks nothing.
  return why ? '<div class="cp-why cp-why--hero">' + esc(why) + '</div>' : '';
}

function _cpNebula() {
  return '<div class="cp-neb" aria-hidden="true">' +
    '<div class="clarity-exp__neb1"></div><div class="clarity-exp__neb2"></div></div>';
}

function _clarityPageSummary() {
  let sum = {};
  try {
    const ans = (state.clarity && state.clarity.answers) || {};
    sum = (typeof normalizeClaritySummary === 'function') ? normalizeClaritySummary(ans) : {};
  } catch (e) { sum = {}; }
  const why = String(sum.coreWhy || '').trim();
  const anti = String(sum.antiVision || '').trim();
  const f = _cpFace();
  return _cpNebula() +
    '<div class="cp-stage cp-stage--top cp-stage--center">' +
      _cpStanding(f, why) +
      (anti ? '<div class="cp-div"></div><div class="cp-lab">If nothing changes</div>' +
        '<div class="cp-anti">' + esc(anti) + '</div>' : '') +
      '<div class="cp-spacer"></div>' +
      '<button type="button" class="cp-tweak" id="cpTweak">Tweak your Neutron Star</button>' +
    '</div>';
}

/* Which reflection gets the quiet "You wrote this N weeks ago" line: the
   redesign's returnability hook. Deterministic (no Math.random, the resume
   law's build constraint): among notes at least 3 weeks old, rotate by ISO
   week so the surfaced one changes weekly, never twice the same render. */
function _cnResurfacePick(ordered) {
  try {
    const now = Date.now();
    const olds = ordered.filter(function (n) {
      const d = _cpDayToDate(n.day);
      return d && (now - d.getTime()) >= 21 * 86400000;
    });
    if (!olds.length) return null;
    const week = Math.floor(now / (7 * 86400000));
    return olds[week % olds.length];
  } catch (e) { return null; }
}
function _cnWeeksAgo(day) {
  try {
    const d = _cpDayToDate(day);
    const w = Math.max(1, Math.round((Date.now() - d.getTime()) / (7 * 86400000)));
    return w === 1 ? 'You wrote this a week ago' : 'You wrote this ' + w + ' weeks ago';
  } catch (e) { return ''; }
}

function _clarityPageNotes() {
  // The stack is never empty for a completed-Clarity user: the seed writes
  // entry #1 from their own why the first time this page is drawn.
  try { clarityNotesSeedIfEmpty(); } catch (e) {}
  const ordered = clarityNotesLive();

  // The quiet list (mockups/clarity-home/notes-lab.html, ported): date, then
  // the words, three lines each, hairline under. No tags, no cards. The one
  // colored control is the + floating bottom-right, clear of the close X.
  const head = '<div class="cp-refhead"><h2 class="cp-reftitle">Reflections</h2></div>';

  let body;
  if (!ordered.length) {
    body = '<div class="cp-empty">No reflections yet. Leave something here for the version of you who forgets why this mattered.</div>' +
      '<div class="cp-ghost" aria-hidden="true"><div class="cp-note">' +
        '<div class="cp-note__sig" style="margin:0 0 8px">someday soon</div>' +
        '<div class="cp-note__txt">The kind of thing you might write: "Remember, you chose this because..."</div>' +
        '</div></div>' +
      '<div class="cp-ghosttag">Only you ever see these.</div>';
  } else {
    const surf = _cnResurfacePick(ordered);
    body = ordered.map(function (n) {
      const sig = _cpLongDate(_cpDayToDate(n.day));
      return '<div class="cp-note" data-cn-id="' + esc(String(n.id || '')) + '" role="button" tabindex="0">' +
        (surf && surf.id === n.id ? '<div class="cp-resurf">' + esc(_cnWeeksAgo(n.day)) + '</div>' : '') +
        (sig ? '<div class="cp-note__date">' + esc(sig) + '</div>' : '') +
        '<div class="cp-note__txt cp-note__txt--clamp">' + _cnPreviewAny(n.text) + '</div>' +
        '</div>';
    }).join('');
  }

  return _cpNebula() +
    '<div class="cp-stage cp-stage--top">' + head + body + '<div class="cp-spacer"></div>' +
    '<button type="button" class="cp-fab" id="cpAddNote" aria-label="New reflection">+</button></div>';
}

// Grow the rail in once per page-show. A class swap, not a fill mode, so the
// end state is the resting state and no GPU layer is held (the v768 law).
function _cpReplayRail(page) {
  try {
    const fill = page.querySelector('.cp-track__fill');
    if (!fill) return;
    fill.classList.remove('is-grow');
    void fill.offsetWidth;
    fill.classList.add('is-grow');
  } catch (e) {}
}

function _bindClarityPager(pager) {
  const scroll = pager.querySelector('.clarity-pager__scroll');
  const pages = Array.prototype.slice.call(pager.querySelectorAll('.clarity-pager__page'));
  const dots = Array.prototype.slice.call(pager.querySelectorAll('.clarity-pager__dots i'));
  if (!scroll || !pages.length) return;

  // Resume law: always land page 1, never a deeper page.
  try { scroll.scrollLeft = 0; } catch (e) {}

  let pending = 0;
  const sync = function () {
    pending = 0;
    const w = scroll.clientWidth || 1;
    const pos = scroll.scrollLeft / w;
    const idx = Math.max(0, Math.min(pages.length - 1, Math.round(pos)));
    pages.forEach(function (p, i) {
      p.classList.toggle('is-visible', Math.abs(pos - i) < 0.999);
      const wasActive = p.classList.contains('is-active');
      const now = (i === idx);
      p.classList.toggle('is-active', now);
      p.setAttribute('aria-hidden', now ? 'false' : 'true');
      if (now && !wasActive) _cpReplayRail(p);
    });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i === idx); });
  };
  const queue = function () { if (!pending) pending = requestAnimationFrame(sync); };

  scroll.addEventListener('scroll', queue, { passive: true });
  try {
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(queue);
      ro.observe(scroll);
    }
  } catch (e) {}
  requestAnimationFrame(sync);

  // Page 2's two doors (phase 4). Rebound after every repaint of the page.
  _cpBindSummaryPage(pager);

  // Page 3 is live from phase 2/3 on: the + opens the writer, tapping a
  // reflection opens the reader (where edit and delete live). Rebound after
  // every repaint.
  _cnBindNotesPage(pager);
}

/* Everything page 3 does. Called on first bind and again after every repaint,
   so it must be safe to run twice on the same DOM (it is: fresh markup, and
   the listeners die with the nodes they were bound to). */
function _cnBindNotesPage(pager) {
  if (!pager) return;
  const add = pager.querySelector('#cpAddNote');
  if (add) add.addEventListener('click', function () {
    ClarityNoteWriter.open({ onDone: function () { _cnRepaintNotesPage(); } });
  });
  Array.prototype.slice.call(pager.querySelectorAll('.cp-note[data-cn-id]')).forEach(function (el) {
    const id = el.getAttribute('data-cn-id');
    if (!id) return;
    const openIt = function () { ClarityNoteReader.open(id); };
    el.addEventListener('click', openIt);
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openIt(); } });
  });
}

/* Repaint the notes stack in place after a save or a delete. Page 3 only, so a
   swipe position and the star scene are both untouched. */
function _cnRepaintNotesPage() {
  try {
    const pager = document.getElementById('clarityPager');
    if (!pager) return;
    const page = pager.querySelector('.clarity-pager__page--notes');
    if (!page) return;
    page.innerHTML = _clarityPageNotes();
    _cnBindNotesPage(pager);
  } catch (e) {}
}

/* The mock's dlgWrap/dlg pattern, ported. */
function _cnConfirmDelete(id, onDone) {
  const wrap = document.createElement('div');
  wrap.className = 'cn-dlgwrap';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML =
    '<div class="cn-dlg">' +
      '<h4>Delete this reflection?</h4>' +
      '<p>You wrote this. Once it is gone, it does not come back.</p>' +
      '<button type="button" class="cn-dlgbtn cn-dlgbtn--danger" data-cn-yes>Delete</button>' +
      '<button type="button" class="cn-dlgbtn cn-dlgbtn--quiet" data-cn-no>Cancel</button>' +
    '</div>';
  const shut = function () { try { wrap.remove(); } catch (e) {} };
  wrap.addEventListener('click', function (e) { if (e.target === wrap) shut(); });
  wrap.querySelector('[data-cn-no]').addEventListener('click', shut);
  wrap.querySelector('[data-cn-yes]').addEventListener('click', function () {
    clarityNotesDelete(id);
    shut();
    _cnRepaintNotesPage();
    try { if (typeof onDone === 'function') onDone(); } catch (e) {}
  });
  document.body.appendChild(wrap);
  requestAnimationFrame(function () { wrap.classList.add('is-on'); });
}

/* Wrap an already-rendered Neutron Star summary into the three-page pager.
   Called right after every place that paints the summary; a DOM upgrade
   rather than four copies of the markup, so page 1 keeps rendering through
   the shipped renderNeutronStarSummary path exactly as it does today. */
function clarityUpgradeSummaryToPager(root) {
  try {
    const host = root || document;
    if (!host || !host.querySelector) return;
    const scene = host.querySelector('#nsScene');
    if (!scene) return;
    if (scene.closest && scene.closest('.clarity-pager')) return;
    const parent = scene.parentNode;
    if (!parent) return;

    const pager = document.createElement('div');
    pager.className = 'clarity-pager';
    pager.id = 'clarityPager';
    pager.innerHTML =
      '<div class="clarity-pager__scroll">' +
        '<section class="clarity-pager__page clarity-pager__page--star is-active is-visible" data-cp="0" aria-label="Your Neutron Star"></section>' +
        '<section class="clarity-pager__page clarity-pager__page--sum" data-cp="1" aria-label="Summary">' + _clarityPageSummary() + '</section>' +
        '<section class="clarity-pager__page clarity-pager__page--notes" data-cp="2" aria-label="Your notes">' + _clarityPageNotes() + '</section>' +
      '</div>' +
      '<div class="clarity-pager__dots" aria-hidden="true"><i class="is-on"></i><i></i><i></i></div>';

    parent.insertBefore(pager, scene);
    pager.querySelector('.clarity-pager__page--star').appendChild(scene);
    _bindClarityPager(pager);
  } catch (e) {}
}

/* ============================================================
   CLARITY NOTES, phases 2 and 3 of the Clarity merge.
   (plan: CLARITY-MERGE-CHECKLIST.md + its 2026-08-19 audit amendments,
    mock: mockups/clarity-home/notes-flow.html, ported verbatim)

   ONE store, two windows. The store is state.clarityNotes (js/01, SHARED).
   Window A is Clarity page 3, where notes are written, read and deleted.
   Window B is the Memento card's record (js/08), where the latest note
   glances read-only and taps back through to page 3.

   The laws this block obeys:
   - 100% the user's words. No AI writing, no AI polishing, no AI chips.
   - Edit: NEVER. Delete: long press plus a confirm. Past-you is an artifact.
   - A note counts as showing up, so saving one writes a reflection-save
     through the js/04 chokepoint, dedupeKey 'clarnote-<id>'. The chokepoint
     is the ONLY writer (the audit amendment); deriveProofEvents backfills
     what already existed, once, and never again.
   - Delete tombstones the id. A tombstoned id never re-enters entries on any
     device (js/12 owns that merge).
   ============================================================ */

const CN_TAGS = ['A reminder', 'A promise', 'The why', 'A fear', 'A win'];
const CN_JOGS = ['Who are you doing this for?', 'What will it feel like?', 'What do you refuse to become?'];
const CN_TAG_DEFAULT = 'A note';
const CN_TAG_FOUNDING = 'The message you started with';
const CN_MAX = 1200;

function _cnUuid() {
  try { if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID(); } catch (e) {}
  return 'cn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// The app's own day boundary (4am), so a note written at 1am belongs to the
// night it was written, exactly like an action does.
function _cnDay(ts) {
  try {
    const d = new Date(Number(ts) || Date.now());
    if (typeof actionDayKey === 'function') return actionDayKey(d);
    return d.toISOString().slice(0, 10);
  } catch (e) { return new Date().toISOString().slice(0, 10); }
}

function _cnStarHash() {
  try { return String((state.goalProgress && state.goalProgress.starHash) || ''); } catch (e) { return ''; }
}

function clarityNotesStore() {
  if (!state.clarityNotes || typeof state.clarityNotes !== 'object' || Array.isArray(state.clarityNotes)) {
    state.clarityNotes = { entries: [], tombstones: [] };
  }
  const s = state.clarityNotes;
  if (!Array.isArray(s.entries)) s.entries = [];
  if (!Array.isArray(s.tombstones)) s.tombstones = [];
  return s;
}

// Stack order: the founding message pinned on top, then newest first.
function clarityNotesLive() {
  const s = clarityNotesStore();
  const live = s.entries.filter(n => n && n.id && s.tombstones.indexOf(n.id) === -1 && String(n.text || '').trim());
  const founding = live.filter(n => n.founding);
  const rest = live.filter(n => !n.founding)
    .sort((a, b) => String(b.day || '').localeCompare(String(a.day || '')));
  return founding.concat(rest);
}

/* Newest by day, whatever its place in the stack. With a single note that is
   the founding one, which is what the card is supposed to show on day one.
   Notes written the same day tie on `day`, so entries order (append-only)
   breaks the tie and the one they just wrote wins. */
function clarityNotesLatest() {
  const s = clarityNotesStore();
  const live = clarityNotesLive();
  if (!live.length) return null;
  const at = (n) => s.entries.indexOf(n);
  return live.slice().sort(function (a, b) {
    const d = String(b.day || '').localeCompare(String(a.day || ''));
    return d !== 0 ? d : (at(b) - at(a));
  })[0];
}

function clarityNoteTag(n) {
  if (!n) return CN_TAG_DEFAULT;
  const t = String(n.tag || '').trim();
  if (t) return t;
  return n.founding ? CN_TAG_FOUNDING : CN_TAG_DEFAULT;
}

/* The ONE proof write. Notes surface in Consistency's evidence as
   reflection-save, the same type the Notes module uses, keyed by the note's
   own id so a repaint, a re-sync or the backfill can never double-count.
   state.reflection lives in a different store with its own 'refl-' keys, so
   there is no collision between the two. */
function _cnWriteProof(entry, quiet) {
  try {
    if (!entry || !entry.id || typeof writeProofEvent !== 'function') return;
    const ts = Date.parse(String(entry.day || '') + 'T12:00:00');
    writeProofEvent('reflection-save', {
      title: 'Notes',
      text: String(entry.text || '').slice(0, 140),
      module: 'reflection',
      iso: entry.day || undefined,
      ts: quiet && isFinite(ts) ? ts : Date.now(),
      silent: !!quiet,
      dedupeKey: 'clarnote-' + entry.id
    });
  } catch (e) {}
}

/* Save. Returns the entry, or null when there is nothing to save. */
function clarityNotesSave(text, tag, opts) {
  const t = String(text || '').trim();
  if (!t) return null;
  const s = clarityNotesStore();
  const o = opts || {};
  const hasFounding = s.entries.some(n => n && n.founding && s.tombstones.indexOf(n.id) === -1);
  const founding = !!o.founding && !hasFounding;
  const entry = {
    id: _cnUuid(),
    text: t.slice(0, CN_MAX),
    tag: String(tag || '').trim().slice(0, 40) || (founding ? CN_TAG_FOUNDING : CN_TAG_DEFAULT),
    day: _cnDay(o.ts),
    starHash: _cnStarHash(),
    founding: founding
  };
  s.entries.push(entry);
  try { persistNow(); } catch (e) {}
  _cnWriteProof(entry, false);
  return entry;
}

/* Edit. The redesign's rule: reflections are editable, the founding message
   is frozen (the origin stays true). Editing stamps editedDay, shown as a
   quiet "Edited on" line in the reader, and never writes a second proof
   event: the day they showed up was the day they wrote it. */
function clarityNotesEdit(id, text) {
  const t = String(text || '').trim();
  if (!id || !t) return null;
  const s = clarityNotesStore();
  const n = s.entries.find(function (e2) { return e2 && e2.id === id; });
  if (!n || n.founding) return null;
  n.text = t.slice(0, CN_MAX);
  n.editedDay = _cnDay();
  try { persistNow(); } catch (e) {}
  return n;
}

/* Delete. Tombstone first, then drop the entry, so a crash between the two
   still leaves the note dead rather than resurrected. The proof event stays:
   deleting the words does not undo the day they showed up. */
function clarityNotesDelete(id) {
  if (!id) return false;
  const s = clarityNotesStore();
  if (s.tombstones.indexOf(id) === -1) s.tombstones.push(id);
  const i = s.entries.findIndex(n => n && n.id === id);
  if (i !== -1) s.entries.splice(i, 1);
  try { persistNow(); } catch (e) {}
  return true;
}

/* The seed. A user who finished Clarity always has something in the stack,
   even if they skipped the message beat: entry #1 is their own why, in their
   own words, dated the day they finished. It writes no proof event, because
   they did not write it that day, Clarity did. */
function clarityNotesSeedIfEmpty() {
  try {
    if (!(state.clarity && state.clarity.completed)) return false;
    const s = clarityNotesStore();
    const live = s.entries.filter(n => n && n.id && s.tombstones.indexOf(n.id) === -1);
    if (live.length) return false;
    let why = '';
    try {
      const sum = (typeof normalizeClaritySummary === 'function')
        ? normalizeClaritySummary((state.clarity && state.clarity.answers) || {}) : {};
      why = String(sum.coreWhy || '').trim();
    } catch (e) { why = ''; }
    if (!why) return false;
    s.entries.push({
      id: _cnUuid(),
      text: why.slice(0, CN_MAX),
      tag: CN_TAG_FOUNDING,
      day: _cnDay(state.clarity.completedAt || Date.now()),
      starHash: _cnStarHash(),
      founding: true
    });
    try { persistNow(); } catch (e) {}
    return true;
  } catch (e) { return false; }
}

/* ONE-TIME migrations, called from migrateState() in js/01 so they run at boot
   whether or not Clarity is ever opened. Each half carries its own meta flag
   and is safe to call on every boot forever.

   1. THE WALL (Malik, 2026-08-19). The Memento card used to carry its own
      editable notes wall (state.wall). Its entries move here with their text
      and their dates intact, oldest first, and the oldest becomes the founding
      message ONLY if nothing is founding yet. state.wall itself is left alone;
      the card simply stops rendering and stops writing it. The old private
      Mori note fed that wall too, so it is pulled in here as well when it
      never made the trip.
   2. THE PROOF BACKFILL. Every note that existed before the chokepoint wiring
      gets its reflection-save, once, silently (no ambient dim, no unlock
      ladder churn) and dated to the note's own day rather than to boot. */
function clarityNotesMigrateV1() {
  const s = clarityNotesStore();
  if (!state.meta || typeof state.meta !== 'object') state.meta = {};
  let dirty = false;

  if (!state.meta.clarityNotesWallV1) {
    try {
      const rows = [];
      (Array.isArray(state.wall) ? state.wall : []).forEach(function (w) {
        if (w && String(w.text || '').trim()) rows.push({ text: String(w.text).trim(), at: Number(w.at) || 0 });
      });
      // the old private note, if it never became a wall note
      try {
        const priv = String((state.mori && state.mori.futureSelfNote) || '').trim();
        if (priv && !state.meta.noteMigratedToWall) {
          rows.push({ text: priv, at: Number((state.mori && state.mori.futureSelfNoteAt) || 0) || 0 });
          state.meta.noteMigratedToWall = true;
        }
      } catch (e) {}
      rows.sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
      // Belt and braces on top of the flag. state.meta only crosses devices on
      // the side that happens to be newer, so a second phone could arrive with
      // the flag still false and its own copy of the old wall. Skipping a row
      // whose exact text is already in the store makes the migration idempotent
      // by content, not just by flag, and no note can ever be duplicated.
      const seen = {};
      s.entries.forEach(function (n) { if (n && n.text) seen[String(n.text).trim()] = 1; });
      rows.forEach(function (r) {
        if (seen[r.text]) return;
        seen[r.text] = 1;
        s.entries.push({
          id: _cnUuid(),
          text: r.text.slice(0, CN_MAX),
          tag: '',
          day: _cnDay(r.at || Date.now()),
          starHash: _cnStarHash(),
          founding: false
        });
        dirty = true;
      });
      // oldest becomes founding, but only when nothing else already is
      const live = s.entries.filter(n => n && n.id && s.tombstones.indexOf(n.id) === -1);
      if (live.length && !live.some(n => n.founding)) {
        live.sort(function (a, b) { return String(a.day || '').localeCompare(String(b.day || '')); });
        live[0].founding = true;
        live[0].tag = CN_TAG_FOUNDING;
        dirty = true;
      }
    } catch (e) {}
    state.meta.clarityNotesWallV1 = true;
    dirty = true;
  }

  if (!state.meta.clarityNotesProofV1) {
    try {
      s.entries.forEach(function (n) {
        if (!n || !n.id || s.tombstones.indexOf(n.id) !== -1) return;
        if (!String(n.text || '').trim()) return;
        _cnWriteProof(n, true);
      });
    } catch (e) {}
    state.meta.clarityNotesProofV1 = true;
    dirty = true;
  }

  if (dirty) { try { persistNow(); } catch (e) {} }
}

/* Open Clarity and land on page 3. This is the RESUME CARVE-OUT: an
   intentional tap (the card's "Read all") may deep link to a page, while a
   relaunch or a restore still lands page 1. The pager is built inside
   openSummary, so the scroll is retried for a few frames until it exists. */
function clarityOpenNotesPage() {
  try {
    if (typeof ClarityExperience === 'undefined') return;
    if (!ClarityExperience.isOpen) ClarityExperience.openSummary();
    const go = function (tries) {
      const pager = document.getElementById('clarityPager');
      const scroll = pager && pager.querySelector('.clarity-pager__scroll');
      if (!scroll || !scroll.clientWidth) {
        if (tries > 0) setTimeout(function () { go(tries - 1); }, 90);
        return;
      }
      scroll.scrollLeft = scroll.clientWidth * 2;
    };
    go(14);
  } catch (e) {}
}

/* ============================================================
   THE WRITER (phase 3). Full screen, two steps: write, then tag.

   THE KEYBOARD IS THE RISK, so nothing here is invented. The field sits HIGH
   (its box ends around a third of the way down the screen) and focus runs
   through bindKeyboardSettle, the on-device-tuned v523-v527 recipe Clarity
   and Action already use. KeyboardPin stays inert: this overlay never
   measures or resizes itself against the keyboard.

   Because the settle resets the pan to zero, everything the user needs while
   typing has to be laid out high by construction. That is why the jog chips
   sit directly under the field instead of being pinned to the bottom of the
   screen: same reading order as the mock, above the keyboard by geometry
   rather than by measurement.
   ============================================================ */
/* ---- light markdown for reflections (phase 2b). Bold/italic via markers,
   checklists via "- [ ] / - [x]". Escape first, then decorate: the note text
   is stored as plain markdown, rendered only on display. ---- */
/* Allowlist sanitizer: keep only b/strong/i/em/u/br/div/span and the checklist
   structure (.cn-cke[data-done] > .cn-ck__box + .cn-cke__t). Everything else is
   unwrapped to its text. Runs on save AND on display, so nothing unsafe stores
   or renders. */
function _cnSanitize(html) {
  var wrap = document.createElement('div');
  wrap.innerHTML = String(html == null ? '' : html);
  var TAG = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, DIV: 1, SPAN: 1 };
  (function walk(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 1) {
        if (!TAG[n.tagName]) { node.replaceChild(document.createTextNode(n.textContent), n); return; }
        Array.prototype.slice.call(n.attributes).forEach(function (a) {
          var keep = (a.name === 'class' && /^(cn-cke|cn-ck__box|cn-cke__t)$/.test(a.value)) ||
                     (a.name === 'data-done' && /^[01]$/.test(a.value)) ||
                     (a.name === 'contenteditable' && a.value === 'false');
          if (!keep) n.removeAttribute(a.name);
        });
        walk(n);
      } else if (n.nodeType !== 3) { node.removeChild(n); }
    });
  })(wrap);
  return wrap.innerHTML;
}
/* stored -> editable HTML for the writer. HTML passes through sanitized; older
   plain/markdown notes convert (markdown bold/italic, one line per line). */
function _cnEditable(text) {
  var t = String(text || '');
  if (/<(b|strong|i|em|u|div|br|span)\b/i.test(t)) return _cnSanitize(t);
  return _cnRenderMd(t);
}
/* stored -> display HTML for the reader (same as editable, always sanitized). */
function _cnDisplay(text) {
  var t = String(text || '');
  if (/<(b|strong|i|em|u|div|br|span)\b/i.test(t)) return _cnSanitize(t);
  return _cnRenderMd(t);
}

function _cnInline(str) {
  var e = esc(String(str == null ? '' : str));
  e = e.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  e = e.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
  return e;
}
function _cnRenderMd(text) {
  return String(text || '').split('\n').map(function (ln, i) {
    var m = ln.match(/^\s*- \[( |x|X)\]\s?(.*)$/);
    if (m) {
      var done = m[1].toLowerCase() === 'x';
      return '<div class="cn-ck' + (done ? ' cn-ck--done' : '') + '" data-ck="' + i + '">' +
        '<span class="cn-ck__box">' + (done ? '\u2713' : '') + '</span>' +
        '<span class="cn-ck__t">' + _cnInline(m[2]) + '</span></div>';
    }
    return '<div class="cn-mdln">' + (ln.trim() ? _cnInline(ln) : '<br>') + '</div>';
  }).join('');
}
/* the list preview: one flowing clamped block, checkbox lines become glyphs. */
function _cnPreview(text) {
  var t = String(text || '').replace(/^\s*- \[ \]\s?/gm, '\u2610 ').replace(/^\s*- \[[xX]\]\s?/gm, '\u2611 ');
  return _cnInline(t.replace(/\n+/g, '  '));
}
/* list preview for either storage format (html or markdown/plain). */
function _cnPreviewAny(text) {
  var t = String(text || '');
  if (/<(b|strong|i|em|u|div|br|span)\b/i.test(t)) {
    var d = document.createElement('div'); d.innerHTML = _cnSanitize(t);
    Array.prototype.slice.call(d.querySelectorAll('.cn-cke')).forEach(function (c) {
      var done = c.getAttribute('data-done') === '1';
      c.insertBefore(document.createTextNode(done ? '\u2611 ' : '\u2610 '), c.firstChild);
      var box = c.querySelector('.cn-ck__box'); if (box) box.remove();
    });
    return esc(d.textContent.replace(/\u200b/g, '').replace(/\s+/g, ' ').trim());
  }
  return _cnPreview(t);
}
/* toggle a checkbox line in place. Not an "edit": ticking a box is not
   rewriting the reflection, so no editedDay stamp. Allowed on any note. */
function clarityNotesToggleCheck(id, lineIndex) {
  var s = clarityNotesStore();
  var n = s.entries.find(function (e2) { return e2 && e2.id === id; });
  if (!n) return false;
  var lines = String(n.text || '').split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return false;
  lines[lineIndex] = lines[lineIndex].replace(/^(\s*- \[)( |x|X)(\])/, function (_, a, c, b) { return a + (c.toLowerCase() === 'x' ? ' ' : 'x') + b; });
  n.text = lines.join('\n');
  try { persistNow(); } catch (e) {}
  return true;
}

const ClarityNoteWriter = {
  el: null,
  pageWrap: null,       // read by bindKeyboardSettle; the writer never scrolls
  isOpen: false,
  _text: '',
  _tag: '',
  _opts: null,

  open(opts) {
    if (this.isOpen) return;
    this._opts = opts || {};
    this._text = String(this._opts.prefill || '');
    this._tag = '';
    this._tmr = { state: 'idle', mins: 10, remain: 600, tick: 0 };
    this.isOpen = true;
    const el = document.createElement('div');
    el.className = 'cn-writer';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', this._opts.editId ? 'Edit reflection' : 'New reflection');
    this.el = el;
    document.body.appendChild(el);
    this._renderWrite();
    requestAnimationFrame(function () { el.classList.add('is-on'); });
  },

  close(saved) {
    if (!this.isOpen) return;
    this.isOpen = false;
    try { if (this._tmr && this._tmr.tick) { clearInterval(this._tmr.tick); this._tmr.tick = 0; } } catch (e) {}
    try { if (this._fmtCleanup) { this._fmtCleanup(); this._fmtCleanup = null; } } catch (e) {}
    try { if (this._kbSettleCleanup) { this._kbSettleCleanup(); this._kbSettleCleanup = null; } } catch (e) {}
    const el = this.el;
    this.el = null;
    const opts = this._opts || {};
    this._opts = null;
    if (el) {
      el.classList.remove('is-on');
      setTimeout(function () { try { el.remove(); } catch (e) {} }, 220);
    }
    try { if (typeof opts.onDone === 'function') opts.onDone(saved || null); } catch (e) {}
  },

  // step 1: a clean page and a cursor
  _renderWrite() {
    const self = this;
    const el = this.el;
    if (!el) return;
    el.innerHTML =
      '<div class="cn-step cn-step--write">' +
        '<div class="cn-bar">' +
          '<div class="cn-bar__left">' +
            '<button type="button" class="cn-bar__x" data-cn-cancel>Cancel</button>' +
            '<button type="button" class="cn-bar__hist" data-cn-undo aria-label="Undo"><svg viewBox="0 0 24 24"><path d="M9 7L4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 5 5v1"/></svg></button>' +
            '<button type="button" class="cn-bar__hist" data-cn-redo aria-label="Redo"><svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5"/><path d="M20 12H9a5 5 0 0 0-5 5v1"/></svg></button>' +
          '</div>' +
          '<div class="cn-tmrmount" data-cn-tmr></div>' +
          '<button type="button" class="cn-bar__done" data-cn-finish disabled>Finish</button>' +
        '</div>' +
        '<div class="cn-body">' +
          '<div class="cn-field" data-cn-field contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-ph="Write it in your own words."></div>' +
        '</div>' +
      '</div>';

    const field = el.querySelector('[data-cn-field]');
    const done = el.querySelector('[data-cn-finish]');
    // Load prior content. Stored notes may be HTML (formatted) or plain/markdown
    // (older). _cnEditable turns either into editable HTML for the field.
    field.innerHTML = _cnEditable(this._text);
    const sync = function () {
      done.disabled = !field.textContent.trim();
    };
    field.addEventListener('input', sync);
    sync();

    el.querySelector('[data-cn-cancel]').addEventListener('click', function () { self.close(null); });
    // Finish just saves. Store the sanitized HTML so bold/italic/checklists
    // survive. Edit mode updates the existing entry (editedDay stamped inside).
    done.addEventListener('click', function () {
      if (!field.textContent.trim()) return;
      var html = _cnSanitize(field.innerHTML);
      try { field.blur(); } catch (e) {}
      const o = self._opts || {};
      const saved = o.editId
        ? clarityNotesEdit(o.editId, html)
        : clarityNotesSave(html, CN_TAG_DEFAULT, o);
      self.close(saved);
    });
    // toggling a checklist box while writing (contenteditable=false boxes)
    field.addEventListener('click', function (ev) {
      var box = ev.target.closest && ev.target.closest('.cn-ck__box');
      if (box) { var cke = box.closest('.cn-cke'); if (cke) { cke.setAttribute('data-done', cke.getAttribute('data-done') === '1' ? '0' : '1'); } return; }
      // tapping empty space in the field snaps the caret to the end, so you
      // never land a cursor in dead space you never typed into.
      var sel = window.getSelection();
      if (sel && sel.rangeCount && sel.getRangeAt(0).collapsed && sel.getRangeAt(0).startContainer === field) {
        var end = document.createRange(); end.selectNodeContents(field); end.collapse(false);
        sel.removeAllRanges(); sel.addRange(end);
      }
    });
    // undo / redo, on the contenteditable history. preventDefault to hold focus.
    var histBtn = function (attr, cmd) {
      var b = el.querySelector('[' + attr + ']');
      if (!b) return;
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
      b.addEventListener('click', function () {
        field.focus();
        try { document.execCommand(cmd, false, null); } catch (e) {}
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };
    histBtn('data-cn-undo', 'undo');
    histBtn('data-cn-redo', 'redo');

    // the quiet timer (phase 2a). Self-contained: it never touches the field,
    // and every control preventDefaults its press so the keyboard never drops.
    this._paintTimer();

    // select-to-format (phase 2b): a B / i / checklist popover that shows only
    // while text is selected. Every button preventDefaults so focus and the
    // keyboard stay put; the field is a plain textarea, markers are markdown.
    this._bindFormat(el, field);

    // the proven recipe, verbatim, on a field that already sits high
    try { if (typeof bindKeyboardSettle === 'function') bindKeyboardSettle(this, field); } catch (e) {}
    setTimeout(function () { try { field.focus(); } catch (e) {} }, 90);
  },

  // ---- select-to-format (contenteditable, live bold/italic + checklist) ----
  _bindFormat: function (el, field) {
    var self = this;
    var pop = document.createElement('div');
    pop.className = 'cn-fmt';
    pop.hidden = true;
    pop.innerHTML =
      '<button type="button" class="cn-fmt__b" data-fmt="b"><b>B</b></button>' +
      '<button type="button" class="cn-fmt__i" data-fmt="i"><i>i</i></button>' +
      '<button type="button" class="cn-fmt__c" data-fmt="check">\u2713</button>';
    el.appendChild(pop);
    this._fmtPop = pop;
    var hide = function () { pop.hidden = true; };

    var inField = function (node) { return node && field.contains(node.nodeType === 3 ? node.parentNode : node); };
    var place = function () {
      var sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !String(sel.toString()).trim()) { hide(); return; }
      var rng = sel.getRangeAt(0);
      if (!inField(rng.commonAncestorContainer)) { hide(); return; }
      var r = rng.getBoundingClientRect();
      if (!r || (!r.width && !r.height)) { hide(); return; }
      var host = el.getBoundingClientRect();
      var top = r.top - host.top - 46;
      if (top < 6) top = r.bottom - host.top + 8;
      var left = r.left - host.left + r.width / 2;
      pop.style.top = Math.max(6, top) + 'px';
      pop.style.left = Math.min(Math.max(54, left), host.width - 54) + 'px';
      pop.hidden = false;
    };

    // EPHEMERAL: exists only during a live non-collapsed selection, gone the
    // instant anything else happens. selectionchange fires constantly, so hide
    // is the default and show is the gated exception.
    var suppress = false;
    var maybe = function () { if (!self.isOpen || suppress) { hide(); return; } place(); };
    var killNow = function () { suppress = true; hide(); setTimeout(function () { suppress = false; }, 350); };
    var onSel = function () { maybe(); };
    document.addEventListener('selectionchange', onSel);
    field.addEventListener('scroll', hide, { passive: true });
    field.addEventListener('blur', function () { hide(); });
    field.addEventListener('pointerdown', killNow);
    field.addEventListener('keydown', killNow);
    field.addEventListener('input', hide);
    this._fmtCleanup = function () { document.removeEventListener('selectionchange', onSel); };
    this._bindSwipeDismiss(el, field);

    var run = function (cmd) {
      field.focus();
      try { document.execCommand(cmd, false, null); } catch (e) {}
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    var checklist = function () {
      field.focus();
      try {
        document.execCommand('insertHTML', false,
          '<div class="cn-cke" data-done="0"><span class="cn-ck__box" contenteditable="false"></span><span class="cn-cke__t">\u200b</span></div>');
      } catch (e) {}
      field.dispatchEvent(new Event('input', { bubbles: true }));
      hide();
    };
    Array.prototype.slice.call(pop.querySelectorAll('[data-fmt]')).forEach(function (b) {
      b.addEventListener('pointerdown', function (ev) { ev.preventDefault(); });
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-fmt');
        if (k === 'b') run('bold');
        else if (k === 'i') run('italic');
        else checklist();
      });
    });
  },

  // swipe down anywhere in the writer to dismiss the keyboard, like a native
  // iOS text view. Only a clear vertical-down drag with no active selection.
  _bindSwipeDismiss: function (el, field) {
    var sy = 0, sx = 0, on = false;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { on = false; return; }
      var t = e.target;
      if (t.closest && t.closest('button, .cn-tmrdrop, .cn-fmt, .cn-tmrpick')) { on = false; return; }
      sy = e.touches[0].clientY; sx = e.touches[0].clientX; on = true;
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (!on || e.touches.length !== 1) return;
      var dy = e.touches[0].clientY - sy, dx = Math.abs(e.touches[0].clientX - sx);
      var collapsed = true;
      try { collapsed = window.getSelection().isCollapsed; } catch (er) {}
      if (dy > 64 && dx < 46 && collapsed && document.activeElement === field) {
        on = false;
        try { field.blur(); } catch (er) {}
      }
    }, { passive: true });
    el.addEventListener('touchend', function () { on = false; }, { passive: true });
  },

  // ---- the quiet timer: a whisper. slider to set, pause/resume/stop, a
  //      gentle in-app end. No notification, no backgrounding, never near
  //      the field's focus. ----
  _fmtClock: function (sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  },
  _paintTimer: function () {
    var self = this;
    var el = this.el; if (!el) return;
    var mount = el.querySelector('[data-cn-tmr]'); if (!mount) return;
    var t = this._tmr;
    var html;
    if (t.state === 'idle' || t.state === 'setting') {
      html = '<button type="button" class="cn-tmr" data-tmr="open">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
        '<span>Timer</span></button>';
      if (t.state === 'setting') {
        var opts = [1, 2, 3, 5, 10, 15, 20, 25, 30, 45, 60];
        html += '<div class="cn-tmrdrop">' +
          '<div class="cn-tmrpick" data-tmr="pickwrap"><div class="cn-tmrpick__row">' +
            '<span class="cn-tmrpick__pad"></span>' +
            opts.map(function (m) { return '<button type="button" class="cn-tmrpick__v' + (m === t.mins ? ' sel' : '') + '" data-min="' + m + '" data-tmr="pick">' + m + '</button>'; }).join('') +
            '<span class="cn-tmrpick__pad"></span>' +
          '</div></div>' +
          '<div class="cn-tmrcap">minutes</div>' +
          '<button type="button" class="cn-tmrgo" data-tmr="start">Start</button>' +
          '<button type="button" class="cn-tmroff" data-tmr="off">No timer</button>' +
          '</div>';
      }
    } else {
      var live = t.state === 'paused'
        ? '<span data-tmr="resume" aria-label="Resume"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M8 6v12l10-6z"/></svg></span>' +
          '<span data-tmr="stop" aria-label="Stop"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg></span>'
        : '<span data-tmr="pause" aria-label="Pause"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="7" y="6" width="3.4" height="12" rx="1"/><rect x="13.6" y="6" width="3.4" height="12" rx="1"/></svg></span>' +
          '<span data-tmr="stop" aria-label="Stop"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="7" y="7" width="10" height="10" rx="1.5"/></svg></span>';
      html = '<div class="cn-tmr cn-tmr--live' + (t.state === 'ended' ? ' cn-tmr--ended' : '') + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
        '<span data-tmr="noop">' + (t.state === 'ended' ? 'Time' : this._fmtClock(t.remain)) + '</span>' +
        '<span class="cn-tmr__ic">' + live + '</span></div>';
    }
    mount.innerHTML = html;
    // every control preventDefaults the press so the field keeps focus
    Array.prototype.slice.call(mount.querySelectorAll('[data-tmr]')).forEach(function (n) {
      var kind = n.getAttribute('data-tmr');
      if (kind === 'pickwrap') { self._bindPicker(n, mount); return; }
      // picker values scroll + tap; everything else preventDefaults to hold focus
      if (kind === 'pick') {
        n.addEventListener('click', function () {
          // select directly (deterministic) AND center it
          var wrap2 = n.closest('.cn-tmrpick');
          Array.prototype.slice.call(wrap2.querySelectorAll('[data-min]')).forEach(function (v) { v.classList.toggle('sel', v === n); });
          self._tmr.mins = parseInt(n.getAttribute('data-min'), 10) || 10;
          var lbl = mount.querySelector('.cn-tmrval'); if (lbl) lbl.textContent = self._tmr.mins;
          n.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
          try { var f = self.el && self.el.querySelector('[data-cn-field]'); if (f) f.focus(); } catch (e) {}
        });
        return;
      }
      n.addEventListener('pointerdown', function (e) { e.preventDefault(); });
      n.addEventListener('click', function () { self._tmrAction(kind); });
    });
  },
  _bindPicker: function (wrap, mount) {
    var self = this, t = this._tmr;
    var row = wrap.querySelector('.cn-tmrpick__row');
    var vals = Array.prototype.slice.call(wrap.querySelectorAll('[data-min]'));
    var lbl = mount.querySelector('.cn-tmrval');
    var pick = function () {
      var wr = row.getBoundingClientRect(); var cx = wr.left + wr.width / 2;
      var best = null, bd = 1e9;
      vals.forEach(function (v) { var r = v.getBoundingClientRect(); var d = Math.abs(r.left + r.width / 2 - cx); if (d < bd) { bd = d; best = v; } });
      if (best) {
        vals.forEach(function (v) { v.classList.toggle('sel', v === best); });
        t.mins = parseInt(best.getAttribute('data-min'), 10) || 10;
        if (lbl) lbl.textContent = t.mins;
      }
    };
    row.addEventListener('scroll', pick, { passive: true });
    // center the current value deterministically (compute scrollLeft, do not
    // trust scrollIntoView timing while the dropdown is still laying out)
    var center = function () {
      var cur = wrap.querySelector('[data-min="' + t.mins + '"]');
      if (!cur) return;
      var rr = row.getBoundingClientRect();
      var cr = cur.getBoundingClientRect();
      row.scrollLeft += (cr.left + cr.width / 2) - (rr.left + rr.width / 2);
      pick();
    };
    requestAnimationFrame(function () { requestAnimationFrame(center); });
  },
  _tmrAction: function (a) {
    var self = this, t = this._tmr;
    if (a === 'noop') return;
    if (a === 'open') { t.state = 'setting'; }
    else if (a === 'off') { t.state = 'idle'; }
    else if (a === 'start') { t.remain = t.mins * 60; t.state = 'running'; this._tmrRun(); }
    else if (a === 'pause') { t.state = 'paused'; }
    else if (a === 'resume') { t.state = 'running'; this._tmrRun(); }
    else if (a === 'stop') { if (t.tick) { clearInterval(t.tick); t.tick = 0; } t.state = 'idle'; }
    this._paintTimer();
    // keep the writer field focused through any timer tap
    try { var f = this.el && this.el.querySelector('[data-cn-field]'); if (f) f.focus(); } catch (e) {}
  },
  _tmrRun: function () {
    var self = this, t = this._tmr;
    if (t.tick) { clearInterval(t.tick); t.tick = 0; }
    t.tick = setInterval(function () {
      if (t.state !== 'running') return;
      t.remain = Math.max(0, t.remain - 1);
      var el = self.el; if (!el) return;
      var span = el.querySelector('[data-cn-tmr] .cn-tmr__ic');
      var num = el.querySelector('[data-cn-tmr] [data-tmr="noop"]');
      if (num) num.textContent = self._fmtClock(t.remain);
      if (t.remain === 0) {
        clearInterval(t.tick); t.tick = 0;
        t.state = 'ended';
        self._paintTimer();
        // gentle: the whisper dims to "Time", no alarm. Clears back to idle
        // after a breath so the writer stays clean.
        setTimeout(function () { if (self._tmr && self._tmr.state === 'ended') { self._tmr.state = 'idle'; self._paintTimer(); } }, 6000);
      }
    }, 1000);
  }
};

/* THE READER (mockups/clarity-home/notes-lab.html, "Open"). Tap a
   reflection on the list and it opens alone, full screen: read it, edit it
   (never the founding one), or delete it. Same mount pattern as the writer,
   no keyboard involved, so no settle binding. */
const ClarityNoteReader = {
  el: null,
  isOpen: false,
  _id: null,

  open(id) {
    if (this.isOpen) return;
    const n = clarityNotesLive().find(function (e2) { return e2 && e2.id === id; });
    if (!n) return;
    this._id = id;
    this.isOpen = true;
    const el = document.createElement('div');
    el.className = 'cn-reader';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Reflection');
    this.el = el;
    document.body.appendChild(el);
    this._render();
    // rAF with a timeout net: a throttled/hidden tab must never leave the
    // reader translucent over the list.
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    setTimeout(function () { el.classList.add('is-on'); }, 60);
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._id = null;
    const el = this.el;
    this.el = null;
    if (el) {
      el.classList.remove('is-on');
      setTimeout(function () { try { el.remove(); } catch (e) {} }, 220);
    }
  },

  _render() {
    const self = this;
    const el = this.el;
    if (!el) return;
    const n = clarityNotesLive().find(function (e2) { return e2 && e2.id === self._id; });
    if (!n) { this.close(); return; }
    const written = _cpLongDate(_cpDayToDate(n.day));
    const edited = n.editedDay ? _cpLongDate(_cpDayToDate(n.editedDay)) : '';
    el.innerHTML =
      '<div class="cnr">' +
        '<div class="cnr__bar">' +
          '<button type="button" class="cnr__back" data-cnr-back>&#8592; Reflections</button>' +
          '<div class="cnr__acts">' +
            (n.founding ? '' : '<button type="button" class="cnr__edit" data-cnr-edit>Edit</button>') +
            '<button type="button" class="cnr__del" data-cnr-del>Delete</button>' +
          '</div>' +
        '</div>' +
        '<div class="cnr__body">' +
          '<div class="cnr__txt" data-cnr-txt>' + _cnDisplay(n.text) + '</div>' +
          '<div class="cnr__date">Written <b>' + esc(written) + '</b>' + (n.founding ? '. First reflection' : '') + '</div>' +
          (edited ? '<div class="cnr__edited">Edited on ' + esc(edited) + '</div>' : '') +
        '</div>' +
      '</div>';
    el.querySelector('[data-cnr-back]').addEventListener('click', function () { self.close(); });
    const ed = el.querySelector('[data-cnr-edit]');
    if (ed) ed.addEventListener('click', function () {
      ClarityNoteWriter.open({
        editId: n.id,
        prefill: String(n.text || ''),
        onDone: function (saved) {
          _cnRepaintNotesPage();
          if (saved) self._render(); // re-read the fresh text + edited line
        }
      });
    });
    el.querySelector('[data-cnr-del]').addEventListener('click', function () {
      _cnConfirmDelete(n.id, function () { self.close(); });
    });
    // tappable checkboxes: markdown boxes (data-ck line index) OR html boxes
    Array.prototype.slice.call(el.querySelectorAll('[data-ck]')).forEach(function (ck) {
      ck.addEventListener('click', function () {
        clarityNotesToggleCheck(n.id, parseInt(ck.getAttribute('data-ck'), 10));
        _cnRepaintNotesPage(); self._render();
      });
    });
    var txt = el.querySelector('[data-cnr-txt]');
    if (txt) Array.prototype.slice.call(txt.querySelectorAll('.cn-cke .cn-ck__box')).forEach(function (box, i) {
      box.addEventListener('click', function () {
        var cke = box.closest('.cn-cke'); if (!cke) return;
        cke.setAttribute('data-done', cke.getAttribute('data-done') === '1' ? '0' : '1');
        var store = clarityNotesStore();
        var note = store.entries.find(function (e2) { return e2 && e2.id === n.id; });
        if (note) { note.text = _cnSanitize(txt.innerHTML); try { persistNow(); } catch (e) {} _cnRepaintNotesPage(); }
      });
    });
  }
};

/* ============================================================
   CLARITY PHASE 4 (CLARITY-MERGE-CHECKLIST.md + its 2026-08-19 audit
   amendments). Mock: mockups/clarity-home/clarity-pages.html, ported.

   Four things live here:
   1. THE UPDATE SCREEN. Full screen, content dead-centered, the big
      prefilled number. Saving animates the rail old -> new and re-counts
      the remaining delta: the payoff IS the update.
   2. THE COMPLETION DOOR, both halves. The automatic half is a CONSUMER of
      the one detector (goalProgressMoment() in js/03, fed by the rewards
      foundation hook); nothing here re-derives a crossing. The manual half
      is the "Neutron Star Fulfilled" chip, on the update screen only.
   3. THE TWEAK FLOWS. Refine (same foundation, keeps the climb) and
      Completely change (three gates: the choice, a 3s hold, the last
      check), landing on the paywall-gated create path. The word is
      CREATE, never "forge", anywhere.
   4. THE MESSAGE BEAT, at the post-ignition seam (#nsv2Action).

   Ceremonies are NOT this module's: the rewards phases own every one of
   them (THE MERGE resolution B). Clarity's job ends at the declaration and
   hands over through clarityArrival().
   ============================================================ */

const CP_HOLD_MS = 3000;
const CP_RING_LEN = 245.04;         // 2 * PI * 39, the mock's ring exactly
const CP_MESSAGE_BEAT = true;       // the one flag: false removes the beat

/* ---- the shell every full-screen phase-4 surface shares ---------------- */
function _cpFsOpen(o) {
  o = o || {};
  const el = document.createElement('div');
  el.className = 'cp-fs' + (o.cls ? ' ' + o.cls : '');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (o.label) el.setAttribute('aria-label', o.label);
  el.innerHTML = _cpNebula() +
    '<div class="cp-fsstage">' +
      '<div class="cp-fsspace"></div>' +
      '<div class="cp-fscontent">' + (o.content || '') + '</div>' +
      '<div class="cp-fsspace"></div>' +
      '<div class="cp-fsfoot">' + (o.foot || '') + '</div>' +
    '</div>';
  document.body.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('is-on'); });
  // A hardware keyboard needs the same escape the quiet line gives a thumb.
  if (typeof o.onEsc === 'function') {
    el._cpEsc = function (e) {
      if (e.key !== 'Escape') return;
      e.preventDefault(); e.stopPropagation();
      o.onEsc();
    };
    document.addEventListener('keydown', el._cpEsc, true);
  }
  return el;
}

function _cpFsClose(el, after) {
  if (!el) { if (typeof after === 'function') after(); return; }
  try { if (el._cpEsc) { document.removeEventListener('keydown', el._cpEsc, true); el._cpEsc = null; } } catch (e) {}
  el.classList.remove('is-on');
  setTimeout(function () {
    try { el.remove(); } catch (e) {}
    if (typeof after === 'function') after();
  }, 220);
}

/* ---- the "?" explainer, collapsed until they ask ---------------------- */
function _cpWhyHtml(body) {
  return '<button type="button" class="cp-whybtn" aria-label="Why this matters">?</button>' +
    '<div class="cp-whybody"><div class="cp-fswarn">' + esc(body) + '</div></div>';
}

function _cpBindWhy(scope) {
  const btn = scope.querySelector('.cp-whybtn');
  const body = scope.querySelector('.cp-whybody');
  if (!btn || !body) return;
  btn.addEventListener('click', function () {
    const open = body.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

/* ---- hold to confirm, both destructive doors --------------------------
   A hairline ring closes clockwise around the dot over 3 seconds; releasing
   early unwinds it. iOS wants to raise its own callout on the same gesture,
   so the callout is off in CSS and contextmenu is cancelled here. */
function _cpHoldHtml() {
  return '<button type="button" class="cp-hold" aria-label="Press and hold for 3 seconds to confirm">' +
      '<svg viewBox="0 0 86 86" aria-hidden="true">' +
        '<circle class="cp-hold__track" cx="43" cy="43" r="39"></circle>' +
        '<circle class="cp-hold__draw" cx="43" cy="43" r="39"></circle>' +
      '</svg><span class="cp-hold__dot"></span></button>' +
    '<div class="cp-holdhint">Press and hold for 3 seconds</div>';
}

function _cpBindHold(scope, onDone) {
  const el = scope.querySelector('.cp-hold');
  if (!el) return;
  const draw = el.querySelector('.cp-hold__draw');
  let timer = 0, t0 = 0, running = false, done = false;

  /* The mock's 30ms interval, kept on purpose: this ring measures TIME, not
     motion, and a rAF loop stalls wherever frames stop (a backgrounded tab,
     a throttled webview). The clock has to keep the promise the copy makes. */
  const tick = function () {
    if (!running) return;
    const p = Math.min((Date.now() - t0) / CP_HOLD_MS, 1);
    if (draw) draw.style.strokeDashoffset = (CP_RING_LEN * (1 - p)).toFixed(2);
    if (p >= 1) {
      clearInterval(timer); timer = 0;
      running = false; done = true;
      el.classList.remove('is-holding');
      el.classList.add('is-done');
      try { feel('tap'); } catch (e) {}
      try { onDone(); } catch (e) {}
    }
  };
  const start = function (e) {
    if (done || running) return;
    if (e && e.pointerType === 'mouse' && e.button !== 0) return;
    if (e && e.preventDefault) e.preventDefault();
    running = true; t0 = Date.now();
    el.classList.add('is-holding');
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 30);
  };
  const end = function () {
    if (!running) return;
    running = false;
    if (timer) { clearInterval(timer); timer = 0; }
    el.classList.remove('is-holding');
    if (draw) {
      draw.style.transition = 'stroke-dashoffset 0.3s ease-out';
      draw.style.strokeDashoffset = CP_RING_LEN;
      setTimeout(function () { try { draw.style.transition = ''; } catch (e) {} }, 320);
    }
  };
  el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  el.addEventListener('pointerdown', start);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    el.addEventListener(ev, end);
  });
}

/* ---- hold to save, the pill half of the same gesture -------------------
   v1191 (Malik): a progress write is deliberate. A stray tap can log a wrong
   number and burn a milestone's once-ever ceremony, so Save is a 2 second
   hold. Same clock and same event handling as _cpBindHold above (30ms
   interval, contextmenu killed, no pointer capture); the visual language is
   the Action CTA's, the light travels the pill and the label inverts exactly
   where the light has reached. Releasing early takes the light straight back.
   Enter on a hardware keyboard still saves instantly: that path is already
   deliberate, and a key-repeat hold is not an affordance. */
const CP_SAVE_HOLD_MS = 2000;

function _cpSaveHtml(label) {
  return '<button type="button" class="cn-cta cp-save" id="cpUpdSave" ' +
      'aria-label="' + esc(label) + ', press and hold for 2 seconds">' +
      // paint order matters: the resting label, then the light over it, then
      // the inverted label the light carries.
      '<span class="cp-save__lab">' + esc(label) + '</span>' +
      '<span class="cp-save__fill" aria-hidden="true"></span>' +
      '<span class="cp-save__inv" aria-hidden="true"><span>' + esc(label) + '</span></span>' +
    '</button>' +
    '<div class="cp-savehint">Hold to save.</div>';
}

function _cpBindSaveHold(btn, onDone) {
  if (!btn) return function () {};
  const fill = btn.querySelector('.cp-save__fill');
  const inv = btn.querySelector('.cp-save__inv');
  let timer = 0, t0 = 0, running = false, done = false;

  /* The light is driven by the SAME 30ms clock as the ring, not by a CSS
     transition: this measures TIME, and the clock has to keep the promise the
     hint makes wherever frames stop. Only the unwind is a transition. */
  const paint = function (p) {
    if (fill) fill.style.width = (p * 100).toFixed(2) + '%';
    if (inv) inv.style.width = (p * 100).toFixed(2) + '%';
  };
  const stop = function () {
    running = false;
    if (timer) { clearInterval(timer); timer = 0; }
    btn.classList.remove('is-holding');
  };
  const tick = function () {
    if (!running) return;
    const p = Math.min((Date.now() - t0) / CP_SAVE_HOLD_MS, 1);
    paint(p);
    if (p < 1) return;
    stop();
    done = true;
    btn.classList.add('is-done');
    paint(1);
    try { feel('tap'); } catch (e) {}
    try { onDone(); } catch (e) {}
  };
  const start = function (e) {
    if (done || running || btn.disabled) return;
    if (e && e.pointerType === 'mouse' && e.button !== 0) return;
    if (e && e.preventDefault) e.preventDefault();
    running = true; t0 = Date.now();
    // the inverted label is laid out at the button's full width, then revealed
    // by the light: the two labels sit in exactly the same place.
    const span = inv && inv.firstElementChild;
    if (span) span.style.width = btn.offsetWidth + 'px';
    btn.classList.add('is-holding');
    paint(0);
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 30);
  };
  // letting go early takes the light straight back, on the transition the
  // resting state carries.
  const end = function () { if (!running) return; stop(); paint(0); };

  btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    btn.addEventListener(ev, end);
  });
  btn.addEventListener('blur', end);
  /* The keyboard path saves on Enter, the same instant path the field itself
     has. Reaching this button by tab and pressing Enter is already a
     deliberate act, and a key-repeat "hold" is not an affordance. A pointer
     tap never produces this event, so the gesture stays a hold on a phone. */
  btn.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || done || btn.disabled) return;
    e.preventDefault();
    stop(); done = true;
    btn.classList.add('is-done');
    paint(1);
    try { onDone(); } catch (e2) {}
  });
  return end;
}

/* ---- the number field's own formatting -------------------------------- */
function _cpMaskNumber(raw) {
  let s = String(raw == null ? '' : raw).replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  const parts = s.split('.');
  let int = parts[0].replace(/^0+(?=\d)/, '');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? grouped + '.' + parts[1] : grouped;
}

/* Group as they type without the caret jumping to the end: count the value
   characters before the caret, then land after the same count. */
function _cpBindNumberField(input, sizer) {
  const resize = function () {
    if (!sizer) return;
    sizer.textContent = input.value || '0';
    input.style.width = (sizer.offsetWidth + 3) + 'px';
  };
  input.addEventListener('input', function () {
    const before = input.value;
    let pos = input.selectionStart;
    if (pos === null || pos === undefined) pos = before.length;
    const kept = before.slice(0, pos).replace(/[^0-9.]/g, '').length;
    const out = _cpMaskNumber(before);
    input.value = out;
    let i = 0, seen = 0;
    while (i < out.length && seen < kept) {
      if (out.charCodeAt(i) !== 44) seen++;   // 44 = comma
      i++;
    }
    try { input.setSelectionRange(i, i); } catch (e) {}
    resize();
  });
  resize();
  return resize;
}

/* ---- page 2's two doors ------------------------------------------------ */
function _cpBindSummaryPage(pager) {
  if (!pager) return;
  const upd = pager.querySelector('#cpUpdate');
  if (upd) {
    upd.addEventListener('click', function () { clarityOpenUpdate({ source: 'page2' }); });
    // The standing block is a div wearing role="button", so it has to answer
    // the keyboard itself the way a real button would.
    upd.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
      e.preventDefault();
      clarityOpenUpdate({ source: 'page2' });
    });
  }
  const twk = pager.querySelector('#cpTweak');
  if (twk) twk.addEventListener('click', function () { clarityOpenTweak(); });
}

/* Repaint page 2 in place after a save, and walk the rail from where it was
   to where it is now. A repaint alone would snap; the whole point of the
   screen is watching the thing move. */
function _cpRepaintSummaryPage(o) {
  o = o || {};
  try {
    const pager = document.getElementById('clarityPager');
    if (!pager) return;
    const page = pager.querySelector('.clarity-pager__page--sum');
    if (!page) return;

    const oldFill = page.querySelector('.cp-track__fill');
    const fromW = oldFill ? oldFill.style.width : '';
    const oldNum = page.querySelector('.cp-num__v');
    const fromNum = oldNum ? oldNum.textContent : '';
    const oldRem = page.querySelector('.cp-rem__v');
    const fromRem = oldRem ? oldRem.textContent : '';

    page.innerHTML = _clarityPageSummary();
    _cpBindSummaryPage(pager);

    const still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!o.animate || still) return;

    const fill = page.querySelector('.cp-track__fill');
    if (fill && fromW) {
      const toW = fill.style.width;
      fill.classList.remove('is-grow');
      fill.style.width = fromW;
      void fill.offsetWidth;
      fill.classList.add('is-moving');
      requestAnimationFrame(function () { fill.style.width = toW; });
      setTimeout(function () { try { fill.classList.remove('is-moving'); } catch (e) {} }, 950);
    }
    _cpCountTo(page.querySelector('.cp-num__v'), fromNum);
    _cpCountTo(page.querySelector('.cp-rem__v'), fromRem);
  } catch (e) {}
}

/* Count one number element from an old rendered string to the one it is
   already showing. Sign and grouping come from the two strings themselves,
   so nothing here has to know the goal's direction. */
function _cpCountTo(el, fromText) {
  if (!el || !fromText) return;
  const toText = el.textContent;
  // A word is not a number to count to. Without this, "Reached" strips to an
  // empty string, parses as 0, and the counter overwrites the word with "0".
  if (!/\d/.test(String(toText))) return;
  const parse = function (s) { return Number(String(s).replace(/[^0-9.\-]/g, '')); };
  const from = parse(fromText), to = parse(toText);
  if (!isFinite(from) || !isFinite(to) || from === to) return;
  const sign = /^[+-]/.test(toText) ? toText[0] : '';
  // t0 comes from the FIRST FRAME's own clock, never performance.now(): the
  // two are not guaranteed to share an origin, and a negative delta sends an
  // eased curve past both ends (a count that ran to millions in the probe).
  const dur = 850;
  let t0 = 0;
  const step = function (now) {
    const t = (typeof now === 'number' && isFinite(now)) ? now : performance.now();
    if (!t0) t0 = t;
    const p = Math.max(0, Math.min((t - t0) / dur, 1));
    const eased = 1 - Math.pow(1 - p, 3);
    const v = from + (to - from) * eased;
    el.textContent = p >= 1 ? toText : sign + _cpNum(Math.abs(Math.round(v)));
    if (p < 1) requestAnimationFrame(step);
  };
  el.textContent = sign + _cpNum(Math.abs(Math.round(from)));
  requestAnimationFrame(step);
}

/* ============================================================
   1. THE UPDATE SCREEN
   Number goals only: a dated wall moves itself and a why-led page has no
   number to move. Reachable from page 2 and, per the RESUME CARVE-OUT,
   directly from an intentional deep link (the weekly progress ask, the
   once-per-staleness in-app ask). A relaunch still lands page 1.
   ============================================================ */
function clarityOpenUpdate(opts) {
  opts = opts || {};
  if (document.querySelector('.cp-fs--upd')) return null;
  const f = _cpFace();
  if (f.face !== 'number') return null;
  const gp = f.gp;
  const unit = String(gp.unit || f.shape.unit || '').trim();
  const hasCur = gp.current !== null && gp.current !== undefined && isFinite(Number(gp.current));
  const cur = hasCur ? Number(gp.current) : null;
  const start = hasCur ? cur : ((gp.baseline !== null && isFinite(Number(gp.baseline))) ? Number(gp.baseline) : 0);
  const asOf = hasCur ? _cpAsOf(gp.updatedAt) : '';
  const fulfilled = !!gp.fulfilledAt;

  const content =
    '<div class="cp-lab">Update progress</div>' +
    '<h2 class="cp-fsq">Where are you now?</h2>' +
    // v1191 (Malik): the box holds ONLY the number. The unit sits under it as
    // its own quiet line, so the entry reads as one figure, not a packed slab.
    '<div class="cp-fsnum">' +
      '<input class="cp-fsnum__in" type="text" inputmode="decimal" autocomplete="off" ' +
        'autocorrect="off" spellcheck="false" aria-label="Where you are now" ' +
        'value="' + esc(_cpMaskNumber(String(start))) + '">' +
      '<span class="cp-fsnum__sizer" aria-hidden="true"></span>' +
    '</div>' +
    (unit ? '<div class="cp-fsunit">' + esc(unit) + '</div>' : '') +
    (hasCur ? '<div class="cp-fswas">was ' + esc(_cpNum(cur)) + (asOf ? ', ' + esc(asOf) : '') + '</div>' : '');

  /* THE MANUAL COMPLETION DOOR. On this screen only, and once it has been
     used it stays as the record of it rather than offering itself again.
     v1191 (Malik): it moved out from under the number entry to below the
     Save/Cancel cluster, separated, so it never crowds the thing being typed. */
  const foot =
    _cpSaveHtml('Save') +
    '<button type="button" class="cn-skip" id="cpUpdCancel">Cancel</button>' +
    '<button type="button" class="cp-lock cp-lock--fs" id="cpFulfil"' + (fulfilled ? ' disabled' : '') + '>' +
      CP_ICON_LOCK + 'Neutron Star Fulfilled?</button>';

  let el = null;
  // the settle recipe's host contract: it transforms host.el and never
  // touches a pageWrap this overlay does not have.
  const kbHost = { el: null, pageWrap: null };
  const shut = function (after) {
    try { if (kbHost._kbSettleCleanup) { kbHost._kbSettleCleanup(); kbHost._kbSettleCleanup = null; } } catch (e) {}
    _cpFsClose(el, after);
  };
  el = _cpFsOpen({
    cls: 'cp-fs--upd', label: 'Update progress',
    content: content, foot: foot,
    onEsc: function () { shut(); }
  });
  kbHost.el = el;

  const input = el.querySelector('.cp-fsnum__in');
  const sizer = el.querySelector('.cp-fsnum__sizer');
  _cpBindNumberField(input, sizer);

  // Typing re-anchors the screen to the top so the field, Save and Cancel
  // all stay clear of the keyboard by geometry (the writer's own law: never
  // measure the keyboard). The field is not focused on open, so the screen
  // they land on is the composed one the mock shows.
  input.addEventListener('focus', function () {
    el.classList.add('is-typing');
    try { input.setSelectionRange(0, input.value.length); } catch (e) {}
  });
  input.addEventListener('blur', function () { el.classList.remove('is-typing'); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  try { if (typeof bindKeyboardSettle === 'function') bindKeyboardSettle(kbHost, input); } catch (e) {}

  const save = function () {
    const raw = String(input.value || '').replace(/[^0-9.]/g, '');
    if (raw === '') { shut(); return; }
    const n = Number(raw);
    if (!isFinite(n) || n < 0) { input.value = ''; return; }
    const ok = (typeof goalProgressUpdate === 'function') ? goalProgressUpdate(n) : false;
    // THE DETECTOR, consumed. js/03's hook already decided whether this
    // crossed the line, direction and throttle included; this only reacts.
    const moment = (ok && typeof goalProgressMoment === 'function') ? goalProgressMoment() : null;
    shut(function () {
      _cpRepaintSummaryPage({ animate: true });
      if (moment && moment.ask) {
        try {
          const g = state.goalProgress;
          if (g) { g.askedDay = moment.day; persistNow(); }
        } catch (e) {}
        _cpOpenFulfilConfirm({ auto: true });
      }
    });
  };

  /* Blur re-centers the screen, so a button that let the field blur first
     would slide out from under the thumb between touch and tap. Holding
     focus through the press keeps every target exactly where it was aimed. */
  const hold = function (node) {
    if (node) node.addEventListener('pointerdown', function (e) { e.preventDefault(); });
  };
  const saveBtn = el.querySelector('#cpUpdSave');
  const cancelBtn = el.querySelector('#cpUpdCancel');
  const lock = el.querySelector('#cpFulfil');
  hold(cancelBtn); if (!fulfilled) hold(lock);
  // Save is the 2 second hold, so it never fires on a bare tap. Its own
  // pointerdown handler already holds focus for it.
  _cpBindSaveHold(saveBtn, save);
  cancelBtn.addEventListener('click', function () { shut(); });
  if (lock && !fulfilled) lock.addEventListener('click', function () {
    shut(function () { _cpOpenFulfilConfirm({}); });
  });
  return el;
}

/* ============================================================
   2. THE COMPLETION DOORS
   ============================================================ */

/* The confirm behind both doors: the chip, and the automatic crossing. Two
   gates deep by the time it shows, and the third is the 3 second hold. */
function _cpOpenFulfilConfirm(o) {
  o = o || {};
  if (document.querySelector('.cp-fs--fulfil')) return null;
  let el = null;
  el = _cpFsOpen({
    cls: 'cp-fs--fulfil', label: 'Neutron Star Fulfilled',
    content:
      '<div class="cp-lab">Neutron Star Fulfilled</div>' +
      '<h2 class="cp-fsq">You did it??</h2>' +
      _cpWhyHtml('Fulfilling your Neutron Star means your big goal is completed and we can close this chapter. ' +
        'The star, actions and progress are sealed into your history. After, Memento will walk you toward your next ' +
        'star to continue building. This cannot be tapped by accident, and it should never be tapped lightly.'),
    foot: _cpHoldHtml() + '<button type="button" class="cn-skip" id="cpFulfilNo">Not yet</button>',
    onEsc: function () { _cpFsClose(el); }
  });
  _cpBindWhy(el);
  _cpBindHold(el, function () {
    /* The declaration is theirs and it persists HERE, before anything
       renders (v1149 law). It writes NO finale receipt: state.goalDone is
       the referee's to write at ceremony time (R10), and burning it now
       would kill that ceremony forever for this goal (R3). gp.userSaysDone
       is exactly the input the referee waits on. */
    try {
      const gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : state.goalProgress;
      if (gp) {
        gp.userSaysDone = true;
        gp.fulfilledAt = Date.now();
        persistNow();
      }
    } catch (e) {}
    setTimeout(function () {
      _cpFsClose(el, function () { clarityArrival('fulfilled'); });
    }, 620);
  });
  el.querySelector('#cpFulfilNo').addEventListener('click', function () { _cpFsClose(el); });
  return el;
}

/* THE ARRIVAL SEAM. Every ceremony belongs to the rewards phases (THE MERGE
   resolution B); Clarity's job ends the moment the person has declared it.
   When the arrival ceremony lands it registers window.rewardArrival and
   this hands straight over, one line, nothing else changes. Until then the
   interim below closes the beat honestly, because reaching your own finish
   line inside a form must never be met with silence. */
function clarityArrival(source) {
  try {
    if (typeof window.rewardArrival === 'function') { window.rewardArrival({ source: source }); return; }
  } catch (e) {}
  _cpArrivalInterim();
}

function _cpArrivalInterim() {
  let el = null;
  el = _cpFsOpen({
    cls: 'cp-fs--arrive', label: 'Neutron Star Fulfilled',
    content:
      '<div class="cp-lab">Neutron Star Fulfilled</div>' +
      '<h2 class="cp-fsq">You did it.</h2>' +
      '<div class="cp-fswarn">Marked complete. Your star, your notes and everything you logged stay in your history.</div>',
    foot: '<button type="button" class="cn-cta" id="cpArriveDone">Done</button>',
    onEsc: function () { _cpFsClose(el); }
  });
  el.querySelector('#cpArriveDone').addEventListener('click', function () {
    _cpFsClose(el, function () { _cpRepaintSummaryPage({}); });
  });
  return el;
}

/* ============================================================
   3. THE TWEAK FLOWS
   ============================================================ */

/* Refine keeps the climb: the words change, the number and the unit
   re-parse, and everything they logged survives (the checklist amendment).
   The stamp is read once by ensureGoalTarget in js/03. */
function _cpStampRefine() {
  try {
    const gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : state.goalProgress;
    if (gp) { gp.refineFrom = gp.starHash || ''; persistNow(); }
  } catch (e) {}
}

function clarityOpenTweak() {
  if (document.querySelector('.cp-fs--tweak')) return null;
  let el = null;
  el = _cpFsOpen({
    cls: 'cp-fs--tweak', label: 'Tweak your Neutron Star',
    content:
      '<div class="cp-lab">Tweak your Neutron Star</div>' +
      '<h2 class="cp-fsq">What do you want to do with it?</h2>' +
      '<div class="cp-fsopts">' +
        '<button type="button" class="cp-fsopt" id="cpTwkRefine">Refine your Neutron Star</button>' +
        '<button type="button" class="cp-fsopt cp-fsopt--danger" id="cpTwkChange">Completely change it</button>' +
      '</div>' +
      '<div class="cp-fswarn">Completely changing your Neutron Star changes your entire Memento. It is the ' +
        'foundation everything else is built on: your plan, your pages, and your card all rebuild around the new ' +
        'goal. Your notes and history stay.</div>',
    foot: '<button type="button" class="cn-skip" id="cpTwkCancel">Cancel</button>',
    onEsc: function () { _cpFsClose(el); }
  });

  el.querySelector('#cpTwkRefine').addEventListener('click', function () {
    _cpStampRefine();
    _cpFsClose(el, function () {
      try {
        openNeutronStarRefineDialog(function () { _cpRepaintSummaryPage({}); });
      } catch (e) {}
    });
  });
  el.querySelector('#cpTwkChange').addEventListener('click', function () {
    _cpFsClose(el, function () { _cpOpenChangeConfirm(); });
  });
  el.querySelector('#cpTwkCancel').addEventListener('click', function () { _cpFsClose(el); });
  return el;
}

/* Gate two of three. The escape hatch points back at Refine for anyone who
   only meant to adjust the wording, the date or the number. */
function _cpOpenChangeConfirm() {
  if (document.querySelector('.cp-fs--change')) return null;
  let el = null;
  el = _cpFsOpen({
    cls: 'cp-fs--change', label: 'Completely change it',
    content:
      '<div class="cp-lab">Completely change it</div>' +
      '<h2 class="cp-fsq">Create a new Neutron Star?</h2>' +
      _cpWhyHtml("This means you haven't completed your current star and it's either not what you want, or " +
        'completely wrong. Your current star, plan, and pages will be rebuilt around a new goal from scratch. ' +
        'Your notes and history stay, but everything else starts over. If you only want to reword the goal, move ' +
        'the date, or adjust the number, go back and choose Refine instead. This can\'t be undone.'),
    foot: _cpHoldHtml() + '<button type="button" class="cn-skip" id="cpChangeBack">Go back</button>',
    onEsc: function () { _cpFsClose(el); }
  });
  _cpBindWhy(el);
  _cpBindHold(el, function () {
    setTimeout(function () { _cpOpenLastCheck(el); }, 620);
  });
  el.querySelector('#cpChangeBack').addEventListener('click', function () { _cpFsClose(el); });
  return el;
}

/* Gate three of three: the mock's dlgWrap/dlg, on the SHIPPED .cn-dlg
   primitives. Nothing this big happens by momentum. */
function _cpOpenLastCheck(host) {
  const wrap = document.createElement('div');
  wrap.className = 'cn-dlgwrap';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML =
    '<div class="cn-dlg">' +
      '<h4>Last check.</h4>' +
      '<p>Your Memento rebuilds around a new goal. There is no undo.</p>' +
      '<button type="button" class="cn-dlgbtn cn-dlgbtn--danger" data-cp-yes>Create a new star</button>' +
      '<button type="button" class="cn-dlgbtn cn-dlgbtn--quiet" data-cp-no>Cancel</button>' +
    '</div>';
  if (host) host.classList.add('is-dimmed');
  const shut = function () {
    try { wrap.remove(); } catch (e) {}
    if (host) host.classList.remove('is-dimmed');
  };
  wrap.addEventListener('click', function (e) { if (e.target === wrap) shut(); });
  wrap.querySelector('[data-cp-no]').addEventListener('click', shut);
  wrap.querySelector('[data-cp-yes]').addEventListener('click', function () {
    shut();
    _cpFsClose(host, function () { _cpCreateNewStar(); });
  });
  document.body.appendChild(wrap);
  requestAnimationFrame(function () { wrap.classList.add('is-on'); });
}

/* The create path, gated exactly like nsConfirmRestart: a brand-new AI run
   is the paid thing, so a free user meets the paywall instead of a silent
   second run. Notes survive on purpose, they belong to the person and not
   to the star. */
function _cpCreateNewStar() {
  try {
    if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.isPaid()) {
      try { ClarityExperience.close(); } catch (e) {}
      ClarityPaywall.show();
      return;
    }
  } catch (e) {}
  try {
    // a new climb, so the refine stamp must not survive into it
    const gp = state.goalProgress;
    if (gp) gp.refineFrom = '';
    state.clarity.completed = false;
    state.clarity.tutorialSeen = false;
    delete state.clarity.draft;
    state.clarity.answers = {};
    persistNow();
  } catch (e) {}
  try { ClarityExperience.close(); } catch (e) {}
  setTimeout(function () { try { ClarityExperience.open(); } catch (e) {} }, 500);
}

/* ============================================================
   4. THE MESSAGE BEAT
   The star animation has finished and Continue is the seam. Optional,
   never a gate: both answers land in the same handoff. Removable by
   flipping CP_MESSAGE_BEAT to false, nothing else to unpick.
   ============================================================ */
function _cpMessageBeat(next) {
  const go = function () { try { next(); } catch (e) {} };
  try {
    if (!CP_MESSAGE_BEAT) { go(); return; }
    if (!state.meta || typeof state.meta !== 'object') state.meta = {};
    if (state.meta.clarityMsgBeatSeen) { go(); return; }
    // a re-run by someone who already has notes gets no invite
    if (clarityNotesLive().length) { state.meta.clarityMsgBeatSeen = true; persistNow(); go(); return; }
    state.meta.clarityMsgBeatSeen = true;
    persistNow();
  } catch (e) { go(); return; }

  let el = null;
  el = _cpFsOpen({
    cls: 'cp-fs--invite', label: 'A message for future you',
    content:
      '<div class="cp-invite__star" aria-hidden="true"></div>' +
      '<h2 class="cp-fsq">Before we continue.</h2>' +
      '<p class="cp-invite__p">Leave a message for future you. As you start and keep making progress toward your ' +
        'goals, it\'s very easy to forget why you started. But you started for a reason. I highly recommend writing ' +
        'a personal note to remind yourself that you have a dream, so when your future self inevitably hits a lower ' +
        'point, they can stay in the fight.</p>',
    foot:
      '<button type="button" class="cn-cta" id="cpInviteWrite">Write a message</button>' +
      '<button type="button" class="cn-skip" id="cpInviteSkip">Maybe later</button>'
  });

  el.querySelector('#cpInviteWrite').addEventListener('click', function () {
    // The writer sits above the invite. Cancelling it returns here rather
    // than skipping the beat for them.
    ClarityNoteWriter.open({
      founding: true,
      onDone: function (saved) {
        if (!saved) return;
        _cpFsClose(el, go);
      }
    });
  });
  el.querySelector('#cpInviteSkip').addEventListener('click', function () {
    // Seeded from their own why instead, so the stack is never empty. If
    // Clarity has not been stamped completed yet, page 3's own seed does it
    // the first time they open the stack.
    try { clarityNotesSeedIfEmpty(); } catch (e) {}
    _cpFsClose(el, go);
  });
}
