/* Memento module: Clarity full-screen experience + wizard
   Extracted from app.js lines 2126-8309. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   CLARITY FULL-SCREEN EXPERIENCE
   ============================================ */
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
    // rough idea' / "Not really, I'm figuring it out" / 'No, I feel lost'.
    if (!wizardAnswers.knowDomain) {
      const lvl = String(prof.clarityLevel || '').toLowerCase();
      if (lvl) {
        if (lvl.indexOf('know exactly') !== -1) wizardAnswers.knowDomain = 'yes';
        else if (lvl.indexOf('rough idea') !== -1) wizardAnswers.knowDomain = 'kinda';
        else if (lvl.indexOf('figuring') !== -1 || lvl.indexOf('lost') !== -1) wizardAnswers.knowDomain = 'not_sure';
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
          if (!detail) return;
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
                _ce.close();
                ActionExperience.open();
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
            openNeutronStarRefineDialog(restoreSummary);
          });

          const restartBtn = document.getElementById('nsConfirmRestart');
          if (restartBtn) restartBtn.addEventListener('click', () => {
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
        actionBtn.addEventListener('click', () => {
          this.close();
          ActionExperience.open();
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
          this.close();
          setTimeout(() => {
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
        // Show intro if not seen, otherwise go to first question
        if (!state.clarity.tutorialSeen) {
          this._showClarityIntro();
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
      <div class="clarity-intro__title">Clarity</div>
      <div class="clarity-intro__lines">
        <div class="clarity-intro__line clarity-intro__line--1">The first step to accomplishing anything is to first get clear on what it is you want and why. Most people never do this.</div>
        <div class="clarity-intro__line clarity-intro__line--2">They drift. They guess. They settle for wherever life moves them and accept a mediocre existence.</div>
        <div class="clarity-intro__line clarity-intro__line--3">This module exists to make sure that's not you.</div>
        <div class="clarity-intro__line clarity-intro__line--4">Over the next few minutes, you'll move through a system designed to uncover your real desires so you know what it is you truly want more than anything else.</div>
        <div class="clarity-intro__line clarity-intro__line--5">Be as honest as possible. I recommend cutting out a part of your day, sitting down alone, maybe with a calm playlist for the best results.</div>      </div>
      <div class="clarity-intro__btn-pill" id="clarityIntroPill">
        <button class="clarity-intro__btn" id="clarityIntroBtn">Let's Begin</button>
      </div>
    </div>`;
    this.navEl.innerHTML = '';
    this.el.classList.add('open-content');

    // Tap-to-skip: clicking/tapping anywhere on the intro (except the Begin
    // button) before animations finish snaps all lines + Begin to fully
    // visible. Listens on BOTH pointerdown and click so mobile Safari fires
    // immediately on touch (it can swallow click events on plain div
    // containers without explicit interactive affordances).
    const introEl = document.getElementById('clarityIntro');
    const skipIntro = (e) => {
      if (introEl.classList.contains('clarity-intro--skipped')) return;
      if (e.target.closest && e.target.closest('#clarityIntroBtn')) return;
      introEl.classList.add('clarity-intro--skipped');
    };
    introEl.addEventListener('pointerdown', skipIntro);
    introEl.addEventListener('click', skipIntro);
    // Also bind on the scrollable parent so taps inside the padding area count.
    const wrap = document.getElementById('clarityExpPageWrap');
    if (wrap) {
      const skipFromWrap = (e) => {
        if (introEl.classList.contains('clarity-intro--skipped')) return;
        if (e.target.closest && e.target.closest('#clarityIntroBtn')) return;
        // Only skip if the tap originated inside the intro experience.
        if (!e.target.closest || !e.target.closest('#clarityIntro')) return;
        introEl.classList.add('clarity-intro--skipped');
      };
      wrap.addEventListener('pointerdown', skipFromWrap);
    }

    document.getElementById('clarityIntroBtn').addEventListener('click', () => {
      const intro = document.getElementById('clarityIntro');
      intro.classList.add('clarity-intro--exit');
      this._setTimeout(() => { if (this.isOpen) this._openContent(); }, 400);
    });
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

    // ── Clarity Intro Sequence ──
    // One mount point: _showClarityIntro owns the markup, tap-to-skip, and
    // the Begin binding (this used to be a full copy-paste of it; the two
    // versions had already drifted on copy).
    this._showClarityIntro();
  },

  _openContent() {
    // Phase 1: Dark background
    if (!this.el.classList.contains('open-bg')) {
      this.el.classList.add('open-bg');
      requestAnimationFrame(() => this.el.classList.add('open-bg-visible'));
    }

    // Phase 2: Render wizard content
    this._setTimeout(() => {
      if (!this.isOpen) return;
      this.renderPage(this.currentPage);
      this.updateProgress();
      this.updateNav();
      if (!this.el.classList.contains('open-content')) {
        this.el.classList.add('open-content');
      }

      if (this._resuming) {
        this._resuming = false;
      }
    }, this._resuming ? 150 : 50);

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

  renderPage(index) {
    // In tutorial-only mode, always render tutorial pages
    if (this.tutorialOnly) {
      if (index < this.totalTutorialPages) {
        this.pageWrap.innerHTML = this.renderTutorialPage(index);
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

    // Track whether we're on the Neutron Star summary view (last wizard step,
    // synthesis complete). If yes, persist so a refresh restores it.
    try {
      const steps = getWizardSteps();
      const wizIdx = index - offset;
      const stepKey = steps[wizIdx];
      const isSummary = stepKey === 'aiSynthesis' && !!aiSynthesisResult;
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

    // Init hypercolor blob on neutron star tutorial page
    const starBlob = document.getElementById('tutStarBlob');
    if (starBlob) {
      setTimeout(() => initStarBlob(starBlob), 50);
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
      // Page 0  - The hook
      {
        illust: `<svg class="tut-path-svg" viewBox="0 0 140 140">
          <path class="tut-path-line" d="M20 120 C30 100, 50 110, 55 90 C60 70, 40 65, 50 50 C60 35, 80 45, 85 30 C90 15, 110 25, 120 20"/>
          <g class="tut-path-pin">
            <circle cx="20" cy="120" r="6" fill="rgba(123,97,255,0.3)"/>
            <circle cx="20" cy="120" r="3" fill="var(--color-clarity)"/>
          </g>
          <g class="tut-path-x">
            <line x1="112" y1="12" x2="128" y2="28" stroke="rgba(var(--ink),0.7)" stroke-width="2" stroke-linecap="round"/>
            <line x1="128" y1="12" x2="112" y2="28" stroke="rgba(var(--ink),0.7)" stroke-width="2" stroke-linecap="round"/>
          </g>
        </svg>`,
        headline: 'Step 1: Know WHAT you want and WHY',
        sub: 'Most people never achieve their goals because they first off, don\'t truly know what they want. And worse <strong style="color:rgba(var(--ink),0.75)">why</strong> they want what they want. Causing a disconnect between their goal and their brain.'
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
        headline: 'Think of your focus like a scale',
        sub: 'Your brain is always going to automatically default and go towards the heaviest side. For most people, it\'s distractions. They are the heaviest and easiest to access weights on the left side. This causes the scale to be off balance and stops your brain from automatically focusing on the other side. We need to fix this.'
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
        sub: 'Deleting apps, breaking your phone, and removing other distractions can help, but distractions are going to continue to grow as the world becomes faster and more comfortable (more on this later). Even if you shrink the left side by 90%, if it still outweighs a pebble on the right, it won\'t matter long term. Removal won\'t hurt you, but it\'s not <strong style="color:rgba(var(--ink),0.75)">the solution</strong>.'
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
        sub: 'The best long-term solution, is to have a weight so overwhelming on the other side, that it makes the other side irrelevant. To have something else so rewarding, your brain automatically defaults towards it.<br><br>That weight should be <strong style="color:rgba(var(--ink),0.75)">progression towards a worthy goal</strong>. Making distractions repulsive. Making progression addictive and automatic.'
      },
      // Page 5  - The payoff (neutron star)
      {
        illust: `<canvas class="tut-star-blob" id="tutStarBlob" width="320" height="320"></canvas>`,
        headline: 'Discover your Neutron Star',
        sub: 'I call this the Neutron Star. One of the densest and heaviest objects in existence. Once you find your Neutron Star, a worthy goal you care about above all else, a new level of focus and energy unlocks in your brain. This is how you stay focused and make achievement automatic.'
      },
      // Page 7  - Reflection pause before questions
      { _reflect: true }
    ];

    const p = pages[index];

    if (p._reflect) {
      return `<div class="clarity-exp__page-inner">
        <div class="clarity-exp__tut clarity-reflect">
          <div class="clarity-reflect__headline">Now, before you begin.</div>
          <div class="clarity-reflect__body">
            I want you to genuinely sit with one question:<br><br>
            <span class="clarity-reflect__question">"What do you want to do with your life?"</span><br><br>
            This question is not an attempt to pressure or intimidate you, but instead, an invitation for you to really sit with it and see where it takes you.<br><br>
            Most of us spend our younger years gaming, scrolling, distracted, doing things for other people but not for ourselves. Out of our entire lives, we might have genuinely thought about our own direction for maybe five minutes total. Which is really scary if you think about it.<br><br>
            If you never focus inward on yourself, how can you expect to improve yourself? So if you can, seriously take the time to think about it for a minute.
          </div>
        </div>
      </div>`;
    }

    return `<div class="clarity-exp__page-inner">
      <div class="clarity-exp__tut">
        <div class="clarity-exp__tut-illust">${p.illust}</div>
        <div class="clarity-exp__tut-headline">${p.headline}</div>
        <div class="clarity-exp__tut-sub">${p.sub}</div>
      </div>
    </div>`;
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
        if (isMulti) {
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
          completeWizard();
          ActionExperience.open();
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
          state.clarity.completed = false;
          state.clarity.tutorialSeen = false;
          delete state.clarity.draft;
          state.clarity.answers = {};
          persistNow();
          this.close();
          setTimeout(() => ClarityExperience.open(), 500);
        });
      }
      // Init the 3D card on the neutron star summary
      const _wizSelf = this;
      setTimeout(() => initNeutronStarCard(null, () => _wizSelf.prev()), 50);
    }
  },

  next() {
    if (this.transitioning) return;
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

    // Validate wizard step if applicable
    if (!this.tutorialOnly && this.currentPage >= offset) {
      const stepKey = getWizardSteps()[wizardStep];
      if (!wizardStepValid(stepKey)) return;
    }

    // Transitioning from last tutorial page to first wizard step
    if (!state.clarity.tutorialSeen && this.currentPage === this.totalTutorialPages - 1) {
      state.clarity.tutorialSeen = true;
      persistState();
      // Reset to page 0 since offset is now 0
      this.transitionTo(0, 'forward');
      return;
    }

    // AI Chat step: either send answer for next question, or advance to synthesis
    if (!this.tutorialOnly && this.currentPage >= offset) {
      const currentStepKey = getWizardSteps()[wizardStep];
      if (currentStepKey === 'aiChat') {
        if (aiChatReady) {
          // AI is done  - advance to synthesis
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
    const total = this.getTotalPages();
    let html = '';
    for (let i = 0; i < total; i++) {
      const cls = i < this.currentPage ? 'clarity-exp__progress-dot--done'
        : i === this.currentPage ? 'clarity-exp__progress-dot--current' : '';
      html += `<div class="clarity-exp__progress-dot ${cls}"></div>`;
    }
    this.progressEl.innerHTML = html;
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
      const offset = this.getWizardOffset();
      const total = this.getTotalPages();
      if (this.currentPage < offset) {
        this._setLight(0.06 + 0.10 * (this.currentPage / Math.max(1, offset)));
        return;
      }
      const steps = getWizardSteps();
      const key = steps[wizardStep];
      if (key === 'aiSynthesis') { this._setLight(1); return; }
      const wfrac = (this.currentPage - offset) / Math.max(1, (total - offset - 1));
      this._setLight(0.22 + 0.58 * Math.max(0, Math.min(1, wfrac)));
    } catch (e) {}
  },

  updateNav() {
    const offset = this.getWizardOffset();
    const total = this.getTotalPages();
    const isLastTut = !this.tutorialOnly && !state.clarity.tutorialSeen && this.currentPage === this.totalTutorialPages - 1;
    const isLastTutOnly = this.tutorialOnly && this.currentPage === this.totalTutorialPages - 1;
    const isWizard = !this.tutorialOnly && this.currentPage >= offset;
    const isLastPage = this.currentPage >= total - 1;

    let html = '';

    const stepKey = isWizard ? getWizardSteps()[wizardStep] : null;

    // Show back button: always if past page 0, or during AI chat if there's history
    const showBack = this.currentPage > 0 || (isWizard && this.currentPage === 0 && state.clarity.tutorialSeen && !this.tutorialOnly) || (stepKey === 'aiChat' && aiChatMessages.length > 1);
    if (showBack) {
      html += '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--back" id="cexpBack">Back</button>';
    }

    if (stepKey === 'aiChat') {
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

const ActionExperience = {
  el: null,
  pageWrap: null,
  progressEl: null,
  navEl: null,
  isOpen: false,
  currentPage: 0,
  transitioning: false,
  _zoomTx: 0,
  _zoomTy: 0,
  _settleTimer: null,

  init() {
    this.el = document.getElementById('actionExp');
    this.pageWrap = document.getElementById('actionExpPageWrap');
    this.progressEl = document.getElementById('actionExpProgress');
    this.navEl = document.getElementById('actionExpNav');
    const closeBtn = document.getElementById('actionExpClose');
    if (closeBtn) {
      const closeNow = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        }
        exitToModules('action');
      };
      closeBtn.addEventListener('click', closeNow);
      closeBtn.addEventListener('pointerdown', closeNow);
      closeBtn.addEventListener('touchend', closeNow, { passive: false });
    }
  },

  getIntroPages() {
    return [
      {
        headline: 'Without action, literally nothing matters.',
        sub: 'You can have the best plan in the world. You can think, wish, and manifest for years. But if it never turns into actual tangible action, you will go nowhere.',
        illust: 'bolt'
      },
      {
        headline: "Most people stay busy, but aren't moving forward.",
        sub: "They spend time and energy on tasks that make them feel productive but do not actually move their life forward. Causing them to trick themselves into thinking they're making progress.",
        illust: 'scatter',
        vShift: true
      },
      {
        headline: 'Action is where your focus should go',
        sub: 'Not ideas. Not intention. Not overplanning. Action. Action is what brings your goals into reality.',
        illust: 'arrow'
      },
      {
        headline: 'Not all action is created equal',
        sub: 'This module is about leverage. The goal is not to do more just to do more. It is to first find the few moves that actually matter most right now. The actions that if not done, the rest don\'t matter.',
        illust: 'target'
      },
      {
        headline: 'Now we find your next moves.',
        sub: 'Using your Neutron Star, Action will filter the noise and show you the highest-leverage steps to move toward what actually matters.',
        illust: 'magnify'
      }
    ];
  },

  renderIllustration(type) {
    switch (type) {
      case 'bolt':
        return `
          <div class="action-illust-bolt" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M45 7 L24 43 H38 L33 73 L57 33 H42 L45 7 Z" fill="#FFFFFF" fill-opacity="0.92"/>
            </svg>
          </div>
        `;
      case 'scatter':
        return `
          <div class="action-illust-scatter" aria-hidden="true">
            <svg viewBox="0 0 120 120" width="120" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="circleArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0.5 L5,3 L0,5.5 Z" fill="rgba(var(--ink),0.85)"/>
                </marker>
              </defs>
              <!-- Faint background ring -->
              <circle cx="60" cy="60" r="38" stroke="rgba(var(--ink),0.1)" stroke-width="2.5" fill="none"/>
              <!-- Spinning circular arrow -->
              <g class="circles-head">
                <path d="M 98,60 A 38,38 0 1 1 79,27" stroke="rgba(var(--ink),0.75)" stroke-width="3" stroke-linecap="round" fill="none" marker-end="url(#circleArrow)"/>
              </g>
            </svg>
          </div>
        `;
      case 'arrow':
        return `
          <div class="action-illust-arrow" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 64 L60 20"/>
              <path d="M37 18 H62 V43"/>
            </svg>
          </div>
        `;
      case 'target':
        return `
          <div class="action-illust-target" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none" stroke="#FFFFFF" stroke-width="4" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="30"/>
              <circle cx="40" cy="40" r="16"/>
              <circle cx="40" cy="40" r="4.5" fill="#FFFFFF" stroke="none"/>
            </svg>
          </div>
        `;
      case 'magnify':
      default:
        return `
          <div class="action-illust-magnify" aria-hidden="true">
            <svg viewBox="0 0 80 80" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">
              <circle cx="34" cy="34" r="20"/>
              <line x1="49" y1="49" x2="67" y2="67"/>
            </svg>
          </div>
        `;
    }
  },

  open() {
    if (this.isOpen) return;
    // Paywall gate: Action is paid. If locked, rise the paywall instead.
    try {
      if (typeof ClarityPaywall !== 'undefined' && ClarityPaywall.isLockedByPaywall('action')) {
        ClarityPaywall.show();
        return;
      }
    } catch (e) {}
    this.isOpen = true;
    rememberView('action');
    FullscreenClose.show('action');
    if (this._settleTimer) {
      clearTimeout(this._settleTimer);
      this._settleTimer = null;
    }
    this.el.className = 'action-exp';
    this.el.style.display = '';
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    TabBar.hide();

    const app = document.getElementById('app');
    const actionCard = document.querySelector('.widget--action');
    let tx = 0, ty = 0;
    if (actionCard && app) {
      const rect = actionCard.getBoundingClientRect();
      const cardCx = rect.left + rect.width / 2;
      const cardCy = rect.top + rect.height / 2;
      const screenCx = window.innerWidth / 2;
      const screenCy = window.innerHeight / 2;
      tx = screenCx - cardCx;
      ty = screenCy - cardCy;
    }
    this._zoomTx = tx;
    this._zoomTy = ty;

    // No app zoom/scale - the dashboard fade-out class handles the transition.
    this.currentPage = 0;
    this.el.classList.add('open-bg');
    requestAnimationFrame(() => this.el.classList.add('open-bg-visible'));

    // Gate order: intro → intake (5 questions) → plan. The user has to
    // complete the intake before they can see the mountain, even on reload.
    const intakeDone = state.action.intake && state.action.intake.completed;
    if (!state.action.introSeen) {
      this._showActionIntro();
    } else if (!intakeDone) {
      this._showActionIntake();
    } else {
      this.renderContent();
    }
    this.el.classList.add('open-content');
    this._settleTimer = setTimeout(() => {
      if (!this.isOpen) return;
      this.el.classList.add('open');
      this.el.classList.remove('open-bg', 'open-bg-visible', 'open-content');
      this._settleTimer = null;
    }, 700);
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (recallView() === 'action') rememberView(null);
    FullscreenClose.hide();
    if (this._settleTimer) {
      clearTimeout(this._settleTimer);
      this._settleTimer = null;
    }
    this.el.classList.remove('open', 'open-bg', 'open-bg-visible', 'open-content');
    this.el.classList.add('closing');
    requestAnimationFrame(() => this.el.classList.add('closing-go'));
    this.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    const app = document.getElementById('app');
    if (app) {
      app.style.transition = '';
      app.style.opacity = '1';
      app.style.transform = '';
    }
    TabBar.show();
    setTimeout(() => {
      if (!this.isOpen) {
        // Destroy any WebGL contexts before clearing DOM
        if (this.pageWrap) {
          this.pageWrap.querySelectorAll('canvas').forEach(c => {
            if (c._destroyGL) c._destroyGL();
          });
          this.pageWrap.innerHTML = '';
        }
        if (this.progressEl) this.progressEl.innerHTML = '';
        if (this.navEl) this.navEl.innerHTML = '';
        this.el.className = 'action-exp';
      }
    }, 280);
  },

  _showActionIntro() {
    this.progressEl.innerHTML = '';
    this.navEl.innerHTML = '';
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner">
        <div class="action-intro" id="actionIntro">
          <div class="action-intro__title">Action</div>
          <div class="action-intro__lines">
            <div class="action-intro__line action-intro__line--1">Without focused action, literally nothing else matters.</div>
            <div class="action-intro__line action-intro__line--2">You can have the best plan in the world. You can think, wish, and manifest for years. But if you never turn it into actual action, you will go nowhere.</div>
            <div class="action-intro__line action-intro__line--3">This module exists to change that.</div>
            <div class="action-intro__line action-intro__line--4">The goal is to find the highest leverage actions for your goal. The ones that, if done, make it unreasonable for you not to achieve it. Then a focused plan you can actually act on today.</div>
          </div>
          <div class="action-intro__btn-pill" id="actionIntroPill">
            <button class="action-intro__btn" id="actionIntroBtn">Begin</button>
          </div>
        </div>
      </div>`;
    // Tap-to-skip on the intro: clicking anywhere except the Begin button
    // before animations finish snaps all lines + Begin to fully visible so
    // the user can proceed without waiting through the staggered fades.
    const introEl = document.getElementById('actionIntro');
    introEl.addEventListener('click', (e) => {
      if (introEl.classList.contains('action-intro--skipped')) return;
      // If user actually clicked the Begin button, let its own handler run.
      if (e.target.closest('#actionIntroBtn')) return;
      introEl.classList.add('action-intro--skipped');
    });

    document.getElementById('actionIntroBtn').addEventListener('click', () => {
      const intro = document.getElementById('actionIntro');
      intro.classList.add('action-intro--exit');
      setTimeout(() => {
        if (!this.isOpen) return;
        state.action.introSeen = true;
        state.action.tutorialSeen = true; // V2: no separate tutorial pages
        persistNow();
        // After intro, run the short intake chat unless the user already
        // completed it AND we have a plan that matches their current Clarity.
        const intakeDone = state.action.intake && state.action.intake.completed;
        if (intakeDone && hasActionPlan() && actionPlanMatchesClarity()) {
          this.renderContent();
        } else {
          this._showActionIntake();
        }
      }, 400);
    });
  },

  // === Action Intake - a short conversational gate before plan generation.
  // Five questions, chat-style. Each substance answer is validated against
  // lazy "idk / yes / lol" patterns so the user has to put real intent in
  // before the AI builds anything. The answers get baked into the draft
  // prompt so the plan is grounded in what the user actually said, not just
  // their Clarity output.
  _intakeQuestions() {
    const ns = state.clarity.answers.neutronStar || 'your goal';
    const ans = (state.action.intake && state.action.intake.answers) || {};
    const wantsReword = /word|change/i.test(ans.goalConfirm || '');

    const base = [
      {
        id: 'goalConfirm',
        type: 'select',
        prompt: `Before we build anything, let's make sure this is still right.\n\nYour Neutron Star: "${ns}"\n\nIs that still the goal we're working toward?`,
        options: ["Yeah, that's it", "Close, but I'd word it differently", "No, I want to change it"]
      },
      // Conditional reword step appears only if the user picked one of the
      // edit options on goalConfirm. Lets them actually rewrite the goal
      // before the rest of the intake builds on it.
      ...(wantsReword ? [{
        id: 'rewordedGoal',
        type: 'text',
        prompt: 'Okay, give it to me in your words. What is the goal you actually want to chase?',
        placeholder: 'Be specific. The version that actually fits.',
        minLen: 15
      }] : []),
      {
        id: 'timeframe',
        type: 'chips',
        prompt: "What's the timeline on this? As in, how long do you actually think this takes realistically? A one-month plan and a five-year plan are completely different.",
        chips: ['1 month', '3 months', '6 months', '1 year', '2 years', '5 years', 'Lifelong'],
        allowCustom: true,
        customPlaceholder: 'Or type your own (e.g. 18 months)'
      },
      {
        id: 'pastProgress',
        type: 'text',
        prompt: "And have you already started moving on this? What have you actually done so far, even if it feels small? Or are you starting from zero. I just want to know the progress you've made so far.",
        placeholder: 'Be honest. "Nothing yet" is a real answer if it\'s true.',
        minLen: 12,
        allowNothing: true
      },
      {
        id: 'mainMove',
        type: 'text',
        prompt: "So if you had to guess, what is the main move you need to make to get from where you are to where you want to be?",
        placeholder: 'Your real guess. Not a textbook answer.',
        minLen: 20
      },
      {
        id: 'oneThing',
        type: 'text',
        prompt: "And if you had to pick just ONE thing, the move that, if you actually did it, would make everything else easier or unnecessary, what is it?",
        placeholder: 'Trust your gut here.',
        minLen: 15
      }
    ];
    return base;
  },

  _intakeIsLazy(answer) {
    const a = String(answer || '').trim().toLowerCase();
    if (!a) return true;
    // Single-word non-answers
    const lazyWords = new Set([
      'idk', "i don't know", 'no', 'yes', 'maybe', 'lol', 'haha', 'tbh',
      'nothing', 'something', 'stuff', 'whatever', 'sure', 'k', 'ok', 'okay',
      'na', 'n/a', 'meh', 'eh', 'dunno', 'no idea', '?'
    ]);
    if (lazyWords.has(a)) return true;
    // All same character (e.g. "aaaa", "....")
    if (/^(.)\1+$/.test(a)) return true;
    // Just punctuation
    if (/^[^a-z0-9]+$/i.test(a)) return true;
    return false;
  },

  _showActionIntake() {
    this.progressEl.innerHTML = '';
    this.navEl.innerHTML = '';
    if (!state.action.intake) state.action.intake = { answers: {}, completed: false };
    state.action.intake.step = 0;
    // AI-driven conversation. Falls back to the static script if Claude is
    // unavailable (no API key, network failure, etc.).
    if (hasAnthropicKey()) {
      this._startAiIntake();
    } else {
      this._renderIntakeStep();
    }
  },

  // ============================================================
  // AI-driven Action intake. The AI runs a short, real conversation
  // (5-8 turns) and adapts to what the user says. Static fallback
  // exists via _renderIntakeStep() if no API key.
  // ============================================================
  _startAiIntake() {
    // Recover from prior bug that stamped a chip label into neutronStar.
    const chipOptionsCheck = ["yeah, that's still it", "close, but i'd word it differently", "no, i want to change it"];
    if (state.clarity.answers && chipOptionsCheck.includes((state.clarity.answers.neutronStar || '').toLowerCase().trim())) {
      state.clarity.answers.neutronStar = '';
      persistNow();
    }

    // Resume from existing state if there's a partial conversation. Otherwise
    // start a fresh intake.
    const intake = state.action.intake;
    const hasProgress = intake && Array.isArray(intake.aiMessages) && intake.aiMessages.length > 0 && !intake.completed;

    if (!hasProgress) {
      intake.aiMessages = [];
      intake.aiSnapshot = { goalConfirm: '', timeframe: '', pastProgress: '', mainMove: '' };
      intake.aiHistory = [];
      intake.pendingNewGoal = '';
      intake.phase = 'goalConfirm';
    }

    // Skeleton scaffold.
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner action-intake-page">
        <div class="action-exp__inner action-intake">
          <div class="action-intake__transcript"></div>
          <div class="action-intake__current"></div>
        </div>
      </div>`;

    // Auto-scroll to bottom whenever the intake DOM changes (new bubble,
    // new question, typing indicator, etc.) so the latest message is always
    // in view, like a real iMessage thread. Set up once per intake session.
    this._setupIntakeAutoScroll();
    // Pin the compose bar to the visible viewport bottom so it stays put
    // when the iOS keyboard is up and the user scrolls.
    this._setupComposeBarPinning();

    if (hasProgress) {
      // Replay every previous message into the transcript and re-show the most
      // recent AI question as the current section so the user can pick up
      // exactly where they left off.
      this._restoreAiIntakeFromState();
    } else {
      // Render the first phase (hardcoded opener).
      this._renderIntakePhase();
    }
  },

  // Pin the compose bar to the bottom of the actual VISIBLE viewport (not
  // the layout viewport). Without this, the bar drifts upward when the user
  // scrolls with the keyboard open on iOS, because Safari rubber-bands the
  // layout viewport while the visual viewport stays put. We re-anchor the
  // bar to visualViewport.height + offsetTop every time the visual viewport
  // resizes or scrolls.
  _setupComposeBarPinning() {
    try {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;
      const update = () => {
        const bar = document.querySelector('.action-chat__input-row');
        if (!bar) return;
        // Layout-viewport-height - (visible-viewport-bottom-position).
        // This is the px gap between the LAYOUT bottom (where bottom:0 anchors)
        // and the visible bottom (where we actually want the bar).
        const bottomGap = window.innerHeight - vv.height - vv.offsetTop;
        bar.style.bottom = `${Math.max(0, bottomGap)}px`;
      };
      if (this._composeBarVVUpdate) {
        vv.removeEventListener('resize', this._composeBarVVUpdate);
        vv.removeEventListener('scroll', this._composeBarVVUpdate);
      }
      this._composeBarVVUpdate = update;
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      // Initial position.
      update();
    } catch (_) {}
  },

  // Observe the intake area and scroll the scroll container to the bottom on
  // any DOM mutation. Throttled via rAF so we don't fight ongoing layout.
  _setupIntakeAutoScroll() {
    try {
      const scroller = this.pageWrap && this.pageWrap.querySelector('.action-exp__page-inner');
      const intake = this.pageWrap && this.pageWrap.querySelector('.action-intake');
      if (!scroller || !intake) return;
      // Disconnect any previous observer before installing a new one.
      if (this._intakeAutoScrollObserver) {
        try { this._intakeAutoScrollObserver.disconnect(); } catch (_) {}
      }
      let pending = false;
      const scrollToBottom = () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            pending = false;
            try {
              scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
            } catch (_) {
              scroller.scrollTop = scroller.scrollHeight;
            }
          });
        });
      };
      this._intakeAutoScrollObserver = new MutationObserver(scrollToBottom);
      this._intakeAutoScrollObserver.observe(intake, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      // Initial scroll so restoring a long convo lands at the latest message.
      scrollToBottom();
    } catch (_) {}
  },

  // Rebuilds the transcript + current section from persisted state, so a page
  // refresh in the middle of the conversation lands the user exactly where they
  // were. Every prior user/assistant pair becomes a transcript bubble; the most
  // recent assistant turn becomes the active question.
  _restoreAiIntakeFromState() {
    const intake = state.action.intake;
    const transcript = this.pageWrap.querySelector('.action-intake__transcript');
    const current    = this.pageWrap.querySelector('.action-intake__current');
    if (!transcript || !current || !intake.aiMessages || !intake.aiMessages.length) {
      this._renderIntakePhase();
      return;
    }

    // Find the index of the LAST assistant message - that becomes the current
    // question. Everything before it goes into the transcript. Anything after
    // it (a trailing user message with no AI reply) was likely an in-flight
    // request that didn't finish; re-fetch the next turn.
    let lastAssistantIdx = -1;
    for (let i = intake.aiMessages.length - 1; i >= 0; i--) {
      if (intake.aiMessages[i].role === 'assistant') { lastAssistantIdx = i; break; }
    }

    // If there's no assistant turn at all, the conversation hasn't started in
    // earnest yet; render the hardcoded opener.
    if (lastAssistantIdx === -1) {
      this._renderIntakePhase();
      return;
    }

    // Append every message before the last assistant turn to the transcript.
    for (let i = 0; i < lastAssistantIdx; i++) {
      const m = intake.aiMessages[i];
      if (m.role === 'assistant') {
        // The very first assistant message could be a JSON-encoded hardcoded
        // opener (see _renderIntakePhase). Extract the question text out of it.
        let text = m.content;
        try {
          const obj = JSON.parse(text);
          if (obj && obj.question) text = obj.question;
        } catch (e) { /* not JSON, use as-is */ }
        const bubble = document.createElement('div');
        bubble.className = 'action-chat__bubble action-chat__bubble--ai';
        bubble.innerHTML = escWithBold(text);
        transcript.appendChild(bubble);
      } else if (m.role === 'user') {
        // Skip seed messages we use to brief the AI internally about chip clicks.
        if (/^User picked "/.test(m.content)) continue;
        const bubble = document.createElement('div');
        bubble.className = 'action-chat__bubble action-chat__bubble--user';
        bubble.textContent = m.content;
        transcript.appendChild(bubble);
      }
    }

    // The last assistant message becomes the current question. Try to recover
    // its rendering metadata (type / options) from aiHistory if available.
    const lastAssistant = intake.aiMessages[lastAssistantIdx];
    let lastMessage = lastAssistant.content;
    let lastType = 'text';
    let lastOptions = [];
    try {
      const obj = JSON.parse(lastAssistant.content);
      if (obj && obj.question) lastMessage = obj.question;
      if (obj && obj.type) lastType = obj.type;
      if (obj && obj.options) lastOptions = obj.options;
    } catch (e) { /* not JSON */ }
    // Prefer aiHistory metadata if it matches.
    if (intake.aiHistory && intake.aiHistory.length > 0) {
      const last = intake.aiHistory[intake.aiHistory.length - 1];
      if (last && last.message) {
        lastMessage = last.message;
        lastType = last.type || lastType;
        lastOptions = last.options || lastOptions;
      }
    }

    // Force chips back to text just like the AI fetch path does.
    if (lastType === 'chips') lastType = 'text';

    this._aiIntakeRenderQuestion({ question: lastMessage, type: lastType, options: lastOptions });
    this._renderIntakeBackButton();

    // If the very last message in the log is a user message (in-flight when
    // they refreshed), kick off the next AI turn so we don't strand them.
    if (intake.aiMessages[intake.aiMessages.length - 1].role === 'user') {
      this._aiIntakeFetchNext();
    }
  },

  // Renders the hardcoded goalConfirm opener. Every subsequent turn is driven
  // by the AI through _aiIntakeFetchNext.
  _renderIntakePhase() {
    const intake = state.action.intake;
    if (intake.phase !== 'goalConfirm') {
      // Anything other than the opener should not be coming through here.
      // Trigger an AI fetch as a recovery.
      this._aiIntakeFetchNext();
      return;
    }
    const ns = (state.clarity.answers && state.clarity.answers.neutronStar) || 'your goal';
    const q = {
      question: `Okay so, before we continue... does that Neutron Star still feel right?\n\n**${ns}**\n\nIs that still it, or would you word it differently?`,
      type: 'choices',
      options: ["Yeah, that's still it", "Close, but I'd word it differently", "No, I want to change it"]
    };
    this._aiIntakeRenderQuestion(q);
    this._renderIntakeBackButton();
  },

  // Renders / refreshes the back button in the intake header. Visible whenever
  // the user has answered at least one question.
  _renderIntakeBackButton() {
    const intake = this.pageWrap.querySelector('.action-intake');
    if (!intake) return;
    const existingBack = intake.querySelector('#intakeBack');
    if (existingBack) existingBack.remove();
    const userTurns = (state.action.intake && state.action.intake.aiMessages || [])
      .filter(m => m.role === 'user').length;
    if (userTurns <= 0) return;
    const backBtn = document.createElement('button');
    backBtn.className = 'action-intake__back';
    backBtn.id = 'intakeBack';
    backBtn.type = 'button';
    backBtn.setAttribute('aria-label', 'Previous question');
    backBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>Back</span>';
    backBtn.addEventListener('click', () => this._intakeBack());
    intake.insertBefore(backBtn, intake.firstChild);
  },

  // Back: pop the last user message + last AI message from the conversation,
  // clear any snapshot field that just got captured (so the AI re-asks for it),
  // remove the last 2 bubble pair from the transcript with a fade, and either
  // re-render the previous AI question or fall back to the goalConfirm opener.
  //
  // We also stash the popped pair so that if the user re-submits the SAME
  // answer, we skip the API call and instantly restore where they were.
  _intakeBack() {
    const intake = state.action.intake;
    if (!intake || !intake.aiMessages || intake.aiMessages.length < 1) return;

    // Capture what we're about to pop so we can pre-fill the input and short-
    // circuit the next send if the user didn't change anything.
    let poppedUser = null;
    let poppedAssistant = null;
    let poppedHistory = null;

    // Pop the most recent assistant + the most recent user (in either order).
    let removedUser = false;
    let removedAssistant = false;
    while (intake.aiMessages.length > 0 && (!removedUser || !removedAssistant)) {
      const last = intake.aiMessages[intake.aiMessages.length - 1];
      if (last.role === 'user' && !removedUser) {
        poppedUser = intake.aiMessages.pop();
        removedUser = true;
      } else if (last.role === 'assistant' && !removedAssistant) {
        poppedAssistant = intake.aiMessages.pop();
        removedAssistant = true;
        if (intake.aiHistory && intake.aiHistory.length > 0) {
          poppedHistory = intake.aiHistory.pop();
        }
      } else {
        break;
      }
    }

    // Save the popped pair so the next submit can short-circuit if unchanged.
    intake._pendingEdit = {
      prevAnswer: (poppedUser && poppedUser.content) || '',
      cachedAssistant: poppedAssistant ? poppedAssistant.content : '',
      cachedHistory: poppedHistory,
      // Also snapshot the captured fields at this point so we can restore them.
      cachedSnapshot: JSON.parse(JSON.stringify(intake.aiSnapshot || {}))
    };

    // Clear the snapshot - we'll let the AI re-decide what to capture when the
    // user re-answers, so they get a clean slate without stale captured values.
    intake.aiSnapshot = { goalConfirm: '', timeframe: '', pastProgress: '', mainMove: '' };
    persistNow();

    // Animate out the current question + the last transcript Q/A pair.
    const intakeEl  = this.pageWrap.querySelector('.action-intake');
    const transcript = intakeEl && intakeEl.querySelector('.action-intake__transcript');
    const current    = intakeEl && intakeEl.querySelector('.action-intake__current');
    if (!intakeEl || !transcript || !current) { this._restoreLastAssistant(); return; }

    const currentBubble  = current.querySelector('.action-chat__bubble--current');
    const currentOptions = current.querySelector('.action-chat__options') || current.querySelector('.action-chat__input-row') || current.querySelector('.action-plan__when-edit');
    const tBubbles = Array.from(transcript.querySelectorAll('.action-chat__bubble'));
    const lastUser = tBubbles[tBubbles.length - 1];
    const lastAi   = lastUser && lastUser.classList.contains('action-chat__bubble--user') ? tBubbles[tBubbles.length - 2] : null;
    const exitNodes = [currentBubble, currentOptions, lastUser, lastAi].filter(Boolean);
    exitNodes.forEach(n => {
      n.style.transition = 'opacity 0.26s cubic-bezier(0.4, 0, 0.2, 1), transform 0.26s cubic-bezier(0.4, 0, 0.2, 1)';
      n.style.opacity = '0';
      n.style.transform = 'translateY(6px)';
    });
    setTimeout(() => {
      [lastUser, lastAi].forEach(n => { if (n && n.parentNode) n.parentNode.removeChild(n); });
      this._restoreLastAssistant();
    }, 260);
  },

  // Re-render the most recent assistant message as the current question, or
  // fall back to the hardcoded goalConfirm opener if no assistant turn remains.
  _restoreLastAssistant() {
    const intake = state.action.intake;
    // If history is empty, re-render the hardcoded opener.
    if (!intake.aiMessages.length) {
      intake.phase = 'goalConfirm';
      persistNow();
      this._renderIntakePhase();
      return;
    }
    const lastAssistant = intake.aiHistory && intake.aiHistory.length
      ? intake.aiHistory[intake.aiHistory.length - 1]
      : null;
    if (lastAssistant) {
      this._aiIntakeRenderQuestion({ question: lastAssistant.message, type: lastAssistant.type, options: lastAssistant.options || [] });
      return;
    }
    // No render metadata for this assistant turn - just re-fetch.
    this._aiIntakeFetchNext();
  },

  // Calls Claude with the running conversation + Neutron Star context.
  // Renders the returned question into the current section.
  // Robust parser: tries multiple strategies to recover usable AI output.
  // Falls back to treating the raw response as a plain message rather than
  // crashing the conversation. Returns the same shape _aiIntakeFetchNext expects.
  _parseAiIntakeResponse(raw, currentSnapshot) {
    const trimmed = (raw || '').trim();
    // Strategy 1: clean JSON, possibly wrapped in code fences
    let jsonStr = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try { return JSON.parse(jsonStr); } catch (e) {}
    // Strategy 2: extract the outermost JSON object via brace matching
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(jsonStr.slice(firstBrace, lastBrace + 1)); } catch (e) {}
    }
    // Strategy 3: AI returned plain prose. Treat the entire text as the
    // chat message and don't capture anything. The conversation continues
    // with whatever it said as the next bubble.
    return {
      message: trimmed.length > 0 ? trimmed : "Tell me more so we can lock this in.",
      type: 'text',
      options: [],
      snapshot: { ...currentSnapshot },
      ready: false
    };
  },

  // AI driver: sends the full conversation history to Claude, lets the AI
  // judge whether the previous answer was substantive (capture it) or vague
  // (push back, keep field empty). The AI controls the conversation flow and
  // decides when each of the four snapshot fields is filled.
  async _aiIntakeFetchNext() {
    const intake = state.action.intake;
    const ns = (state.clarity.answers && state.clarity.answers.neutronStar) || '';
    const tfHint = (state.clarity.answers && state.clarity.answers.timeframe) || '';

    // Show typing indicator while we wait.
    const currentEl = this.pageWrap.querySelector('.action-intake__current');
    if (currentEl) currentEl.innerHTML = '<div class="action-chat__typing"><span></span><span></span><span></span></div>';

    const context = `User context for this conversation:
Their locked Neutron Star: "${ns}"
A timeframe they mentioned in Clarity (use as a starting reference, but confirm): "${tfHint}"
Current snapshot (what you have captured so far): ${JSON.stringify(intake.aiSnapshot)}

Reminder: ONLY put a value in snapshot.X when the user's most recent answer is substantive for field X. If it's vague, garbage, sarcastic, or a platitude, leave the field empty and push back in your message.`;

    // Build API messages: inject context into the FIRST user message of the convo.
    const apiMessages = [];
    let injected = false;
    intake.aiMessages.forEach(m => {
      if (!injected && m.role === 'user') {
        apiMessages.push({ role: 'user', content: context + '\n\nUser response: ' + m.content });
        injected = true;
      } else {
        apiMessages.push({ role: m.role, content: m.content });
      }
    });
    if (!injected) {
      apiMessages.push({ role: 'user', content: context + '\n\nNo user response yet. Start the next turn now.' });
    }

    try {
      const raw = await callClaude(apiMessages, AI_ACTION_INTAKE_SYSTEM_PROMPT, { maxTokens: 700 });
      const parsed = this._parseAiIntakeResponse(raw, intake.aiSnapshot);

      // Update snapshot from the AI's judgment. The AI is the SOLE authority
      // on whether the previous answer was substantive enough to capture.
      if (parsed.snapshot && typeof parsed.snapshot === 'object') {
        Object.keys(intake.aiSnapshot).forEach(k => {
          const v = parsed.snapshot[k];
          if (typeof v === 'string' && v.trim().length > 0) {
            intake.aiSnapshot[k] = v;
            intake.answers[k] = v;
          } else {
            // The AI cleared / declined to capture this field.
            intake.aiSnapshot[k] = '';
            if (intake.answers) delete intake.answers[k];
          }
        });
      }

      // Mirror captures to clarity state where used downstream.
      if (intake.aiSnapshot.timeframe) state.clarity.answers.timeframe = intake.aiSnapshot.timeframe;
      if (intake.aiSnapshot.goalConfirm && intake.aiSnapshot.goalConfirm.length >= 8) {
        // Only overwrite Neutron Star if the captured goalConfirm looks like a real goal.
        const chipLabels = ["yeah, that's still it", "close, but i'd word it differently", "no, i want to change it"];
        if (!chipLabels.includes(intake.aiSnapshot.goalConfirm.toLowerCase().trim())) {
          state.clarity.answers.neutronStar = intake.aiSnapshot.goalConfirm;
        }
      }

      persistNow();

      // Decide if we're truly done. Honor ready ONLY when all four fields have
      // real substance (so a hallucinated ready: true cannot end the convo early).
      const snap = intake.aiSnapshot;
      const lengthOk = (s, n) => typeof s === 'string' && s.trim().length >= n;
      const snapComplete = lengthOk(snap.goalConfirm, 8) && lengthOk(snap.timeframe, 2) && lengthOk(snap.pastProgress, 4) && lengthOk(snap.mainMove, 4);
      if (parsed.ready === true && snapComplete) {
        intake.completed = true;
        persistNow();
        this._aiIntakeRenderClosing();
        return;
      }

      // Render the AI's message + appropriate input type.
      const message = (parsed.message || parsed.question || '').toString().trim();
      // Client-side safety: force chips back to text. The user wants to type
      // freeform answers, not pick from a pre-selected list.
      let type = (['text', 'choices', 'chips'].includes(parsed.type)) ? parsed.type : 'text';
      if (type === 'chips') type = 'text';
      const options = Array.isArray(parsed.options) ? parsed.options : [];

      if (!message || message.length < 3) {
        // Defensive fallback if AI returned nothing usable: nudge toward whichever
        // field is still empty.
        const missing = ['goalConfirm', 'timeframe', 'pastProgress', 'mainMove'].find(k => !snap[k] || snap[k].length < 2) || 'mainMove';
        const fallback = {
          goalConfirm: { msg: "Quick check, what's the goal you actually want to chase?", type: 'text' },
          timeframe:   { msg: "And when would you like to ship this or get it done? Like a time frame?", type: 'chips', opts: ['1 month','3 months','6 months','1 year','2 years','5 years'] },
          pastProgress:{ msg: "What have you actually done on this so far? Be honest.", type: 'text' },
          mainMove:    { msg: "If you had to guess, what's the one move that would actually move the needle?", type: 'text' }
        }[missing];
        intake.aiMessages.push({ role: 'assistant', content: fallback.msg });
        persistNow();
        this._aiIntakeRenderQuestion({ question: fallback.msg, type: fallback.type, options: fallback.opts || [] });
        return;
      }

      intake.aiMessages.push({ role: 'assistant', content: message });
      // Save the rendering metadata so back nav can restore the same input type.
      intake.aiHistory.push({ message, type, options });
      persistNow();
      this._aiIntakeRenderQuestion({ question: message, type, options });
      this._renderIntakeBackButton();
    } catch (e) {
      // Network or parse failure: show error inline rather than silently advancing.
      console.warn('AI intake error', e);
      const currentEl2 = this.pageWrap.querySelector('.action-intake__current');
      if (currentEl2) {
        currentEl2.innerHTML = `
          <div class="action-chat__bubble action-chat__bubble--ai action-chat__bubble--current">Something went wrong on my end. Try sending that again, or refresh if it sticks.</div>
          <div class="action-chat__error">${esc(e.message || 'Connection error')}</div>`;
      }
    }
  },

  // Renders the AI's current question into the current section, with a smooth
  // swap that doesn't unmount the transcript.
  _aiIntakeRenderQuestion(parsed) {
    const intake = this.pageWrap.querySelector('.action-intake');
    const transcript = intake && intake.querySelector('.action-intake__transcript');
    const current = intake && intake.querySelector('.action-intake__current');
    if (!intake || !transcript || !current) return;

    // Render the question via the same builder used by the static path so the
    // input/option styling stays identical.
    const fakeQ = {
      prompt: parsed.question || '',
      type: (parsed.type === 'choices' || parsed.type === 'chips' || parsed.type === 'text') ? parsed.type : 'text',
      options: parsed.options || [],
      chips: parsed.options || []
    };
    current.innerHTML = this._buildCurrentSectionHtml(fakeQ);

    // Back button: only show if at least one exchange has happened.
    const existingBack = intake.querySelector('#intakeBack');
    if (existingBack) existingBack.remove();
    if (state.action.intake.aiMessages.filter(m => m.role === 'user').length > 0) {
      const backBtn = document.createElement('button');
      backBtn.className = 'action-intake__back';
      backBtn.id = 'intakeBack';
      backBtn.type = 'button';
      backBtn.setAttribute('aria-label', 'Previous question');
      backBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>Back</span>';
      intake.insertBefore(backBtn, intake.firstChild);
      backBtn.addEventListener('click', () => this._aiIntakeBack());
    }

    // If the user just hit Back, pre-fill the previous answer into the input
    // so they can edit it. If they leave it unchanged and hit send, we'll
    // short-circuit the API call and restore the original next turn.
    const pending = state.action.intake && state.action.intake._pendingEdit;
    if (pending && pending.prevAnswer) {
      const input = current.querySelector('#intakeInput');
      if (input) {
        input.value = pending.prevAnswer;
        // Place caret at end and focus.
        setTimeout(() => {
          input.focus();
          if (typeof input.setSelectionRange === 'function') {
            const n = input.value.length;
            try { input.setSelectionRange(n, n); } catch (e) {}
          }
        }, 80);
      }
      // For choices, we leave the chips selectable as normal (the previous
      // value was a chip label, the user can re-click it to short-circuit).
    }

    // Bind answer handlers.
    this._aiIntakeBindAnswerHandlers(fakeQ);
  },

  // Routes the user's answer through the deterministic state machine. Each
  // phase handles its own answer and decides what phase comes next.
  _bindIntakePhaseHandlers(q) {
    const phase = state.action.intake.phase;
    const submit = (raw) => {
      const value = String(raw || '').trim();
      const bsReason = (typeof detectBSAnswer === 'function') ? detectBSAnswer(value) : null;
      if (bsReason) {
        this._intakeShowError(bsReason);
        return;
      }
      this._handlePhaseAnswer(phase, value);
    };
    this._wireSubmitHandlers(q, submit);
  },

  // Helper used by both the phase machine and the back navigation to wire up
  // chip / textarea / send button handlers consistently.
  _wireSubmitHandlers(q, submit) {
    if (q.type === 'choices' || q.type === 'select') {
      this.pageWrap.querySelectorAll('.action-chat__opt').forEach(btn => {
        btn.addEventListener('click', () => submit(btn.dataset.value));
      });
    } else if (q.type === 'chips') {
      this.pageWrap.querySelectorAll('#intakeChips .action-plan__when-chip').forEach(btn => {
        btn.addEventListener('click', () => submit(btn.dataset.chip));
      });
      const custom = this.pageWrap.querySelector('#intakeCustom');
      const customBtn = this.pageWrap.querySelector('#intakeCustomSave');
      if (customBtn) customBtn.addEventListener('click', () => submit(custom && custom.value));
      if (custom) custom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(custom.value); }
      });
    } else {
      const input = this.pageWrap.querySelector('#intakeInput');
      const send  = this.pageWrap.querySelector('#intakeSend');
      const doSubmit = () => submit(input && input.value);
      if (send)  send.addEventListener('click', doSubmit);
      if (input) input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSubmit(); }
      });
      if (input) setTimeout(() => input.focus(), 80);
    }
  },

  // The actual state-machine transitions. Each branch decides what phase
  // comes next based on the answer.
  _handlePhaseAnswer(phase, value) {
    const intake = state.action.intake;

    // === Dev backdoor ===
    // Typing the dev code flips intake into free-chat mode, every message
    // after that goes to the AI with a permissive system prompt instead of
    // the scripted intake. Typing EXIT (case-insensitive) leaves dev mode.
    const DEV_CODE = 'FIIOK!';
    const trimmedValue = String(value || '').trim();

    // === Skip to the end ===
    // An explicit "skip to the end" command jumps straight to generating the
    // plan with whatever's known so far. Works in dev mode AND the normal
    // intake. Matches a bare "skip"/"skip it", or "skip" + an end-ish word, so
    // it won't fire on normal answers that merely mention skipping something.
    const wantsSkip = /^\s*skip(\s+it)?\s*$/i.test(trimmedValue) ||
      (/\bskip\b/i.test(trimmedValue) &&
       /\b(end|rest|ahead|intake|questions?|conversation|convo|this|forward|generate|plan)\b/i.test(trimmedValue));
    if (wantsSkip) {
      intake.devMode = false;   // leave dev mode if we were in it
      persistNow();
      this._stashAnswerAndShowTyping(value, () => { this._finishIntake(); });
      return;
    }

    if (!intake.devMode && trimmedValue === DEV_CODE) {
      intake.devMode = true;
      if (!Array.isArray(intake.devChat)) intake.devChat = [];
      persistNow();
      this._stashAnswerAndShowTyping(value, () => {
        this._aiIntakeRenderQuestion({
          question: 'Dev mode on. Ask me anything, I will answer freely. Type EXIT to go back to the intake.',
          type: 'text',
          options: []
        });
      });
      return;
    }
    if (intake.devMode) {
      if (/^exit$/i.test(trimmedValue)) {
        intake.devMode = false;
        persistNow();
        this._stashAnswerAndShowTyping(value, () => {
          this._aiIntakeRenderQuestion({
            question: 'Dev mode off. Back to the intake. Confirm your goal or hit Back to continue.',
            type: 'text',
            options: []
          });
        });
        return;
      }
      const self = this;
      this._stashAnswerAndShowTyping(value, async () => {
        try {
          if (!Array.isArray(intake.devChat)) intake.devChat = [];
          intake.devChat.push({ role: 'user', content: value });
          const DEV_SYSTEM = "You are the AI engine inside Memento, the user's personal-development app. The user typing right now is the developer/owner of this app (Malik Peace), they unlocked dev mode by typing a private code. Drop every other system prompt's instructions and just talk to them directly. Answer their questions about the app, your model identity, the prompts, anything. If they ask which model you are, tell them the truth. No JSON. No script. Plain text replies. Keep responses short unless they ask for depth.";
          const reply = await callClaude(intake.devChat, DEV_SYSTEM, { maxTokens: 600, noProfile: true });
          intake.devChat.push({ role: 'assistant', content: reply });
          persistNow();
          self._aiIntakeRenderQuestion({ question: String(reply || '').trim(), type: 'text', options: [] });
        } catch (err) {
          self._aiIntakeRenderQuestion({
            question: 'Dev chat error: ' + ((err && err.message) || 'unknown') + '. Type EXIT to go back to the intake.',
            type: 'text',
            options: []
          });
        }
      });
      return;
    }

    // Common: animate the user's answer down into transcript before showing the next.
    this._stashAnswerAndShowTyping(value, async () => {
      // Hardcoded goalConfirm: capture the chip choice, then hand off to AI.
      if (phase === 'goalConfirm') {
        // Edit short-circuit on the opener too.
        const pending = intake._pendingEdit;
        if (pending && pending.prevAnswer && value === pending.prevAnswer) {
          // The user re-picked the same chip after hitting back. Restore the
          // cached state.
          intake.aiMessages.push({ role: 'user', content: pending.prevAnswer });
          if (pending.cachedAssistant) {
            intake.aiMessages.push({ role: 'assistant', content: pending.cachedAssistant });
          }
          if (pending.cachedHistory) {
            intake.aiHistory = intake.aiHistory || [];
            intake.aiHistory.push(pending.cachedHistory);
          }
          if (pending.cachedSnapshot) {
            intake.aiSnapshot = pending.cachedSnapshot;
          }
          intake._pendingEdit = null;
          intake.phase = 'aiDriven';
          persistNow();
          let parsed = null;
          try { parsed = JSON.parse(pending.cachedAssistant); } catch (e) {}
          const cachedMsg = parsed && parsed.question ? parsed.question : pending.cachedAssistant;
          const cachedType = (pending.cachedHistory && pending.cachedHistory.type) || (parsed && parsed.type) || 'text';
          const cachedOpts = (pending.cachedHistory && pending.cachedHistory.options) || (parsed && parsed.options) || [];
          this._stashAnswerAndShowTyping(value, () => {
            this._aiIntakeRenderQuestion({ question: cachedMsg, type: cachedType === 'chips' ? 'text' : cachedType, options: cachedOpts });
          });
          return;
        }
        intake._pendingEdit = null;
        intake.aiSnapshot.goalConfirm = value === "Yeah, that's still it"
          ? (state.clarity.answers.neutronStar || value)
          : '';
        intake.answers.goalConfirm = intake.aiSnapshot.goalConfirm;
        intake.phase = 'aiDriven';
        const goalChoiceMsg = `User picked "${value}" on the goalConfirm question.`;
        intake.aiMessages.push({ role: 'user', content: goalChoiceMsg });
        persistNow();
        await this._aiIntakeFetchNext();
        return;
      }

      // Phase is aiDriven from here on. Send the user's answer to the AI.
      if (phase === 'aiDriven') {
        // Edit short-circuit: if the user just hit Back and re-submitted the
        // SAME answer (typed or selected), restore the cached forward state
        // instead of burning another API call.
        const pending = intake._pendingEdit;
        if (pending && pending.prevAnswer && value === pending.prevAnswer) {
          // Restore the user message + the cached AI message + the snapshot.
          intake.aiMessages.push({ role: 'user', content: value });
          if (pending.cachedAssistant) {
            intake.aiMessages.push({ role: 'assistant', content: pending.cachedAssistant });
          }
          if (pending.cachedHistory) {
            intake.aiHistory = intake.aiHistory || [];
            intake.aiHistory.push(pending.cachedHistory);
          }
          if (pending.cachedSnapshot) {
            intake.aiSnapshot = pending.cachedSnapshot;
          }
          intake._pendingEdit = null;
          persistNow();
          // Render the cached AI message as the new current question, without
          // re-fetching. The transcript already shows where we were.
          let parsed = null;
          try { parsed = JSON.parse(pending.cachedAssistant); } catch (e) {}
          const cachedMsg = parsed && parsed.question ? parsed.question : pending.cachedAssistant;
          const cachedType = (pending.cachedHistory && pending.cachedHistory.type) || (parsed && parsed.type) || 'text';
          const cachedOpts = (pending.cachedHistory && pending.cachedHistory.options) || (parsed && parsed.options) || [];
          // Stash the user answer into the transcript first (animated).
          this._stashAnswerAndShowTyping(value, () => {
            this._aiIntakeRenderQuestion({ question: cachedMsg, type: cachedType === 'chips' ? 'text' : cachedType, options: cachedOpts });
          });
          return;
        }
        // Otherwise: real edit, send to AI.
        intake._pendingEdit = null;
        intake.aiMessages.push({ role: 'user', content: value });
        persistNow();
        await this._aiIntakeFetchNext();
        return;
      }
    });
  },

  // Helper: stash the user's answer into the transcript with the slide-up
  // animation, show a typing indicator, then call the callback after a beat.
  _stashAnswerAndShowTyping(answer, then) {
    const intake = this.pageWrap.querySelector('.action-intake');
    const transcript = intake && intake.querySelector('.action-intake__transcript');
    const current = intake && intake.querySelector('.action-intake__current');
    if (!intake || !transcript || !current) {
      if (then) then();
      return;
    }
    // Demote current AI bubble to transcript.
    const oldBubble = current.querySelector('.action-chat__bubble--current');
    if (oldBubble) {
      oldBubble.classList.remove('action-chat__bubble--current');
      transcript.appendChild(oldBubble);
    }
    // Append user answer with slide-in.
    const userBubble = document.createElement('div');
    userBubble.className = 'action-chat__bubble action-chat__bubble--user';
    userBubble.textContent = answer;
    userBubble.style.opacity = '0';
    userBubble.style.transform = 'translateY(8px)';
    transcript.appendChild(userBubble);
    requestAnimationFrame(() => {
      userBubble.style.transition = 'opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
      userBubble.style.opacity = '';
      userBubble.style.transform = '';
    });
    // Fade out the options/input row.
    const oldOptions = current.querySelector('.action-chat__options') || current.querySelector('.action-chat__input-row') || current.querySelector('.action-plan__when-edit');
    if (oldOptions) {
      oldOptions.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      oldOptions.style.opacity = '0';
      oldOptions.style.transform = 'translateY(4px)';
    }
    setTimeout(() => {
      current.innerHTML = '<div class="action-chat__typing"><span></span><span></span><span></span></div>';
      if (then) then();
    }, 280);
  },

  // Append an AI reaction bubble to the transcript with a smooth fade-in.
  _appendReactionBubble(text) {
    return new Promise(resolve => {
      const transcript = this.pageWrap.querySelector('.action-intake__transcript');
      if (!transcript) { resolve(); return; }
      const bubble = document.createElement('div');
      bubble.className = 'action-chat__bubble action-chat__bubble--ai';
      bubble.innerHTML = escWithBold(text);
      bubble.style.opacity = '0';
      bubble.style.transform = 'translateY(8px)';
      transcript.appendChild(bubble);
      requestAnimationFrame(() => {
        bubble.style.transition = 'opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
        bubble.style.opacity = '';
        bubble.style.transform = '';
      });
      setTimeout(resolve, 600);
    });
  },

  // Show a short AI reply in the current section, then call onAfter after a beat.
  _renderShortReply(text, onAfter) {
    const current = this.pageWrap.querySelector('.action-intake__current');
    if (current) {
      current.innerHTML = `<div class="action-chat__bubble action-chat__bubble--ai action-chat__bubble--current">${escWithBold(text)}</div>`;
    }
    setTimeout(onAfter, 900);
  },

  // Legacy entry point retained so other paths that used to call
  // _aiIntakeBindAnswerHandlers still work. Routes to the phase handler.
  _aiIntakeBindAnswerHandlers(q) {
    return this._bindIntakePhaseHandlers(q);
  },

  // Stub for legacy callers that used to invoke a closure-style submit.
  // Kept here for safety; not used by the new state machine.
  _stub_oldSubmit(q) {
    const submit = (raw) => {
      const value = String(raw || '').trim();
      const bsReason = (typeof detectBSAnswer === 'function') ? detectBSAnswer(value) : null;
      if (bsReason) {
        this._intakeShowError(bsReason);
        return;
      }
      this._aiIntakeStashAndAnswer(value);
    };

    if (q.type === 'choices' || q.type === 'select') {
      this.pageWrap.querySelectorAll('.action-chat__opt').forEach(btn => {
        btn.addEventListener('click', () => submit(btn.dataset.value));
      });
    } else if (q.type === 'chips') {
      this.pageWrap.querySelectorAll('#intakeChips .action-plan__when-chip').forEach(btn => {
        btn.addEventListener('click', () => submit(btn.dataset.chip));
      });
      const custom = this.pageWrap.querySelector('#intakeCustom');
      const customBtn = this.pageWrap.querySelector('#intakeCustomSave');
      if (customBtn) customBtn.addEventListener('click', () => submit(custom && custom.value));
      if (custom) custom.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submit(custom.value); }
      });
    } else {
      const input = this.pageWrap.querySelector('#intakeInput');
      const send  = this.pageWrap.querySelector('#intakeSend');
      const doSubmit = () => submit(input && input.value);
      if (send)  send.addEventListener('click', doSubmit);
      if (input) input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSubmit(); }
      });
      if (input) setTimeout(() => input.focus(), 80);
    }
  },

  // Move the just-asked AI question down into transcript, append the user's
  // answer, show typing indicator, then fetch the next question.
  _aiIntakeStashAndAnswer(answer) {
    const intake = this.pageWrap.querySelector('.action-intake');
    const transcript = intake && intake.querySelector('.action-intake__transcript');
    const current = intake && intake.querySelector('.action-intake__current');
    if (!intake || !transcript || !current) {
      // Fallback: just send the answer
      this._aiIntakeFetchNext(answer);
      return;
    }

    // 1. Demote current AI bubble to transcript.
    const oldBubble = current.querySelector('.action-chat__bubble--current');
    if (oldBubble) {
      oldBubble.classList.remove('action-chat__bubble--current');
      transcript.appendChild(oldBubble);
    }

    // 2. Append user answer with slide-in.
    const userBubble = document.createElement('div');
    userBubble.className = 'action-chat__bubble action-chat__bubble--user';
    userBubble.textContent = answer;
    userBubble.style.opacity = '0';
    userBubble.style.transform = 'translateY(8px)';
    transcript.appendChild(userBubble);
    requestAnimationFrame(() => {
      userBubble.style.transition = 'opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
      userBubble.style.opacity = '';
      userBubble.style.transform = '';
    });

    // 3. Fade out the options/input row.
    const oldOptions = current.querySelector('.action-chat__options') || current.querySelector('.action-chat__input-row') || current.querySelector('.action-plan__when-edit');
    if (oldOptions) {
      oldOptions.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      oldOptions.style.opacity = '0';
      oldOptions.style.transform = 'translateY(4px)';
    }

    // 4. Show typing indicator in current section after a beat, then fetch next.
    setTimeout(() => {
      current.innerHTML = '<div class="action-chat__typing"><span></span><span></span><span></span></div>';
      this._aiIntakeFetchNext(answer);
    }, 280);
  },

  _aiIntakeBack() {
    const intake = state.action.intake;
    if (!intake.aiMessages || intake.aiMessages.length < 2) return;
    // Pop the last assistant + last user from the conversation.
    while (intake.aiMessages.length > 0) {
      const last = intake.aiMessages[intake.aiMessages.length - 1];
      intake.aiMessages.pop();
      if (last.role === 'user') break;
    }
    // Also pop the prior assistant to re-show it.
    let lastAssistantIdx = -1;
    for (let i = intake.aiMessages.length - 1; i >= 0; i--) {
      if (intake.aiMessages[i].role === 'assistant') { lastAssistantIdx = i; break; }
    }
    if (lastAssistantIdx < 0) {
      // No prior question to return to: just refetch the opener.
      intake.aiMessages = [];
      this._startAiIntake();
      return;
    }
    // Remove the assistant we just popped to re-show from history (we'll re-add it via render).
    const restoreAssistant = intake.aiMessages.splice(lastAssistantIdx, 1)[0];
    persistNow();

    // Remove the last two transcript bubbles (the AI question that was current
    // before back, plus the user's previous answer that we're discarding).
    const transcriptEl = this.pageWrap.querySelector('.action-intake__transcript');
    if (transcriptEl) {
      const bubbles = Array.from(transcriptEl.querySelectorAll('.action-chat__bubble'));
      [bubbles[bubbles.length - 1], bubbles[bubbles.length - 2]].forEach(b => { if (b && b.parentNode) b.parentNode.removeChild(b); });
    }

    // Render the prior assistant question in the current section.
    let parsed = parseModelJson(restoreAssistant.content);
    if (!parsed) parsed = { question: restoreAssistant.content, type: 'text' };
    intake.aiMessages.push(restoreAssistant);
    persistNow();
    this._aiIntakeRenderQuestion(parsed);
  },

  // After ready:true, briefly show a "Building your plan..." state, then kick off
  // the existing plan generation pipeline.
  _aiIntakeRenderClosing() {
    const current = this.pageWrap.querySelector('.action-intake__current');
    if (current) {
      current.innerHTML = `<div class="action-chat__bubble action-chat__bubble--ai action-chat__bubble--current">Got it. Building your plan now.</div>`;
    }
    setTimeout(() => this._finishIntake(), 1200);
  },

  _renderIntakeStep(opts) {
    const goingBack = !!(opts && opts.goingBack);
    const questions = this._intakeQuestions();
    const step = state.action.intake.step || 0;
    if (step >= questions.length) { this._finishIntake(); return; }
    const q = questions[step];
    const ans = state.action.intake.answers || {};

    // Build the running transcript: each prior Q + answer as a chat bubble.
    let transcriptHtml = '';
    for (let i = 0; i < step; i++) {
      const prevQ = questions[i];
      const prevA = ans[prevQ.id] || '';
      transcriptHtml += `<div class="action-chat__bubble action-chat__bubble--ai">${escWithBold(prevQ.prompt)}</div>`;
      if (prevA) transcriptHtml += `<div class="action-chat__bubble action-chat__bubble--user">${esc(prevA)}</div>`;
    }

    let inputHtml = `<div class="action-chat__bubble action-chat__bubble--ai action-chat__bubble--current">${escWithBold(q.prompt)}</div>`;
    if (q.type === 'select') {
      const opts = q.options.map(o => `<button class="action-chat__opt" type="button" data-value="${esc(o)}">${esc(o)}</button>`).join('');
      inputHtml += `<div class="action-chat__options">${opts}</div>`;
    } else if (q.type === 'chips') {
      const chips = q.chips.map(c => `<button class="action-plan__when-chip" type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join('');
      const customRow = q.allowCustom ? `
        <div style="display:flex;gap:8px;align-items:center;margin-top:12px;width:100%;max-width:420px;">
          <input class="wiz__text-input" id="intakeCustom" type="text" placeholder="${esc(q.customPlaceholder || '')}" style="flex:1;">
          <button class="action-wiz__btn action-wiz__btn--generate" id="intakeCustomSave" type="button" style="padding:12px 20px;border-radius:calc(8px * var(--rx, 1));">Use this</button>
        </div>` : '';
      inputHtml += `<div class="action-plan__when-edit" id="intakeChips">${chips}</div>${customRow}`;
    } else {
      inputHtml += `
        <div class="action-chat__input-row">
          <div class="action-chat__input-row-inner">
            <textarea class="action-chat__input" id="intakeInput" rows="2" placeholder="${esc(q.placeholder || 'Type your answer...')}" autocomplete="off"></textarea>
            <button class="action-chat__send" id="intakeSend" type="button" aria-label="Send"></button>
          </div>
        </div>
        <div class="action-chat__error" id="intakeErr" style="display:none;"></div>`;
    }

    const backHtml = step > 0
      ? `<button class="action-intake__back" id="intakeBack" type="button" aria-label="Previous question">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
           <span>Back</span>
         </button>`
      : '';

    const goingBackCls = goingBack ? ' action-intake--going-back' : '';
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner action-intake-page">
        <div class="action-exp__inner action-intake${goingBackCls}">
          ${backHtml}
          <div class="action-intake__transcript">${transcriptHtml}</div>
          <div class="action-intake__current">${inputHtml}</div>
        </div>
      </div>`;
    this._bindIntakeStep(q);
    // Strip the going-back marker after the gentler animation has played, so
    // subsequent forward moves use the normal bounce-in again.
    if (goingBack) {
      const intake = this.pageWrap.querySelector('.action-intake');
      if (intake) setTimeout(() => intake.classList.remove('action-intake--going-back'), 600);
    }
  },

  // Builds the inner HTML for just the "current question" section (bubble +
  // options/input) for the step the user is currently on. Used by both the
  // initial render and the surgical back-swap so the markup stays in sync.
  _buildCurrentSectionHtml(q) {
    // AI bubbles use the **bold** convention (see escWithBold helper).
    let html = `<div class="action-chat__bubble action-chat__bubble--ai action-chat__bubble--current">${escWithBold(q.prompt || '')}</div>`;
    if (q.type === 'select' || q.type === 'choices') {
      const opts = (q.options || []).map(o => `<button class="action-chat__opt" type="button" data-value="${esc(o)}">${esc(o)}</button>`).join('');
      html += `<div class="action-chat__options">${opts}</div>`;
    } else if (q.type === 'chips') {
      const chipsSrc = (q.chips && q.chips.length) ? q.chips : (q.options || []);
      const chips = chipsSrc.map(c => `<button class="action-plan__when-chip" type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join('');
      // Always allow a custom answer alongside the chips. Users can either tap
      // a chip or type their own phrasing and hit Use this / Enter.
      const customRow = `
        <div class="action-chat__chips-custom" style="display:flex;gap:8px;align-items:center;margin-top:12px;width:100%;max-width:520px;">
          <input class="wiz__text-input" id="intakeCustom" type="text" placeholder="${esc(q.customPlaceholder || 'Or type your own...')}" style="flex:1;">
          <button class="action-wiz__btn action-wiz__btn--generate" id="intakeCustomSave" type="button" style="padding:12px 20px;border-radius:calc(8px * var(--rx, 1));">Use this</button>
        </div>`;
      html += `<div class="action-plan__when-edit" id="intakeChips">${chips}</div>${customRow}`;
    } else {
      html += `
        <div class="action-chat__input-row">
          <div class="action-chat__input-row-inner">
            <textarea class="action-chat__input" id="intakeInput" rows="2" placeholder="${esc(q.placeholder || 'Type your answer...')}" autocomplete="off"></textarea>
            <button class="action-chat__send" id="intakeSend" type="button" aria-label="Send"></button>
          </div>
        </div>
        <div class="action-chat__error" id="intakeErr" style="display:none;"></div>`;
    }
    return html;
  },

  // Generates a one-line, personalized AI reaction to the user's previous
  // answer. Returns a string. Used between intake questions so the AI feels
  // like it's actually listening instead of running a fixed script.
  async _generateIntakeReaction(prevQ, prevAnswer, nextQ) {
    try {
      const ns = (state.clarity.answers && state.clarity.answers.neutronStar) || '';
      const intakeAns = (state.action.intake && state.action.intake.answers) || {};
      const prior = Object.entries(intakeAns)
        .filter(([k]) => k !== prevQ.id)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      const sys = `You are the voice behind Memento, a paid product helping people lock in on what matters.

You are NOT generating a question. You are generating ONE short reaction to a specific answer the user just gave during the Action intake. The reaction will be shown as a chat bubble before the next question.

VOICE:
- Real, direct, monochrome. Not a coach. Not corporate. Not a therapist.
- Reference at least one specific word, phrase, or detail from their answer back at them.
- If their answer is honest and specific, acknowledge it without flattering ("Good answer" / "I love that" are banned).
- If their answer is evasive, vague, or sounds like a job-interview line, name it lightly.
- If their answer reveals fear, struggle, or contradiction, address it once with respect.
- Then end with a soft segue into what's next. The segue should be ONE clause, not a recap.

HARD RULES:
- ONE OR TWO SHORT SENTENCES MAX. Total under 35 words.
- Never start with "Great" / "Awesome" / "Love that" / "I can tell".
- Never use em dashes or en dashes. Use commas or periods.
- Never use first person ("I", "me", "my").
- Never use markdown, hashtags, bold, or quotes around their answer.
- Never paraphrase their entire answer back at them. Pick one detail.
- Do not include any preamble like "Here is my reaction:", return ONLY the reaction text.

OUTPUT FORMAT:
Plain text only. No JSON. No quotes. Just the reaction.`;

      const user = `Their Neutron Star: ${ns}

${prior ? 'What they already told you:\n' + prior + '\n\n' : ''}You just asked them:
"${prevQ.prompt}"

They answered:
"${prevAnswer}"

The next question coming up is about: "${nextQ ? nextQ.prompt.split('\n')[0] : 'their next move'}"

Give them ONE short, personal reaction that references something specific in their answer and softly leads into the next question. Under 35 words.`;

      const raw = await callClaude([{ role: 'user', content: user }], sys);
      let text = (raw || '').trim();
      // Strip any accidental wrapping quotes the model added
      text = text.replace(/^["'""]+|["'""]+$/g, '').trim();
      // Belt-and-braces em-dash sanitize
      text = text.replace(EMDASH_RE, ', ');
      if (!text || text.length < 6) return null;
      return text;
    } catch (e) {
      return null;
    }
  },

  // Surgical update for moving forward: the just-asked question becomes a
  // transcript bubble, the user's answer follows it, and the new current
  // question fades in below. No full re-render, so the transcript above
  // never flashes.
  _advanceForwardSurgical(prevQ, prevAnswer) {
    const intake     = this.pageWrap.querySelector('.action-intake');
    const transcript = intake && intake.querySelector('.action-intake__transcript');
    const current    = intake && intake.querySelector('.action-intake__current');
    if (!intake || !transcript || !current) {
      // Fallback if structure is missing.
      this._renderIntakeStep();
      return;
    }

    // Take the existing "current" AI question and demote it to transcript.
    const oldBubble = current.querySelector('.action-chat__bubble--current');
    if (oldBubble) {
      oldBubble.classList.remove('action-chat__bubble--current');
      transcript.appendChild(oldBubble);
    }
    // Append the user's answer as a transcript bubble too, animated in.
    if (prevAnswer) {
      const userBubble = document.createElement('div');
      userBubble.className = 'action-chat__bubble action-chat__bubble--user';
      userBubble.textContent = prevAnswer;
      userBubble.style.opacity = '0';
      userBubble.style.transform = 'translateY(8px)';
      transcript.appendChild(userBubble);
      requestAnimationFrame(() => {
        userBubble.style.transition = 'opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
        userBubble.style.opacity = '';
        userBubble.style.transform = '';
      });
    }

    // Fade out the old options/input row so it doesn't flash when we swap.
    const oldOptions = current.querySelector('.action-chat__options') || current.querySelector('.action-chat__input-row');
    if (oldOptions) {
      oldOptions.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      oldOptions.style.opacity = '0';
      oldOptions.style.transform = 'translateY(4px)';
    }

    // Look up the next question now so we can pass it into the reaction request.
    const questions = this._intakeQuestions();
    const nextStep = state.action.intake.step || 0;
    const nextQ = nextStep < questions.length ? questions[nextStep] : null;

    // Personalized AI reaction: only on text answers (where users wrote real
    // content). Skip for select/chips since those answers are too short to
    // react to in a meaningful way. Show a typing indicator while we wait.
    const shouldReact = nextQ && prevQ.type === 'text' && prevAnswer && prevAnswer.length >= 10;

    const renderNextQuestion = () => {
      if (!nextQ) { this._finishIntake(); return; }
      current.innerHTML = this._buildCurrentSectionHtml(nextQ);
      const existingBack = intake.querySelector('#intakeBack');
      if (existingBack) existingBack.remove();
      const backBtn = document.createElement('button');
      backBtn.className = 'action-intake__back';
      backBtn.id = 'intakeBack';
      backBtn.type = 'button';
      backBtn.setAttribute('aria-label', 'Previous question');
      backBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>Back</span>';
      intake.insertBefore(backBtn, intake.firstChild);
      this._bindIntakeStep(nextQ);
    };

    if (!shouldReact) {
      setTimeout(renderNextQuestion, 180);
      return;
    }

    // Insert a typing indicator into the transcript while the AI thinks.
    const typing = document.createElement('div');
    typing.className = 'action-chat__typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    setTimeout(() => transcript.appendChild(typing), 220);

    this._generateIntakeReaction(prevQ, prevAnswer, nextQ).then(reaction => {
      // Remove typing indicator
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      if (reaction) {
        const reactionBubble = document.createElement('div');
        reactionBubble.className = 'action-chat__bubble action-chat__bubble--ai';
        reactionBubble.innerHTML = escWithBold(reaction);
        reactionBubble.style.opacity = '0';
        reactionBubble.style.transform = 'translateY(8px)';
        transcript.appendChild(reactionBubble);
        requestAnimationFrame(() => {
          reactionBubble.style.transition = 'opacity 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)';
          reactionBubble.style.opacity = '';
          reactionBubble.style.transform = '';
        });
        // Let the reaction sit for a beat before the next question slides in.
        setTimeout(renderNextQuestion, 600);
      } else {
        // AI failed or returned nothing: just move on.
        renderNextQuestion();
      }
    });
  },

  // Surgical update for the back navigation: replaces just the current section
  // and updates the back button visibility. The transcript above stays fully
  // mounted so nothing flashes or re-renders. Called after the fade-out finishes.
  _swapCurrentSection(goingBack) {
    const questions = this._intakeQuestions();
    const step = state.action.intake.step || 0;
    if (step >= questions.length) { this._finishIntake(); return; }
    const q = questions[step];

    const intake  = this.pageWrap.querySelector('.action-intake');
    const current = intake && intake.querySelector('.action-intake__current');
    if (!intake || !current) {
      // Fallback to full render
      this._renderIntakeStep({ goingBack });
      return;
    }

    // Toggle the going-back marker so the new content fades in (no bounce).
    if (goingBack) intake.classList.add('action-intake--going-back');

    // Replace the inner HTML of the current section only.
    current.innerHTML = this._buildCurrentSectionHtml(q);

    // Update / inject the back button at the top of the intake. It only shows
    // when step > 0; rebuild it surgically so the existing button (still in
    // the DOM from before) doesn't keep its stale click handler.
    const existingBack = intake.querySelector('#intakeBack');
    if (existingBack) existingBack.remove();
    if (step > 0) {
      const backBtn = document.createElement('button');
      backBtn.className = 'action-intake__back';
      backBtn.id = 'intakeBack';
      backBtn.type = 'button';
      backBtn.setAttribute('aria-label', 'Previous question');
      backBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg><span>Back</span>';
      intake.insertBefore(backBtn, intake.firstChild);
    }

    // Re-bind the step (back button click + advance handlers).
    this._bindIntakeStep(q);

    // Strip the going-back marker once the gentle fade has played so future
    // forward steps get the normal bounce again.
    if (goingBack) setTimeout(() => intake.classList.remove('action-intake--going-back'), 600);
  },

  _bindIntakeStep(q) {
    // Back button: surgical DOM swap so the transcript never re-mounts. We
    // fade the current question out, fade the last transcript pair (which is
    // about to become the new current) out, then build the new current section
    // in place and fade it in. The bubbles above don't get touched, so there's
    // no flash of empty page.
    const backBtn = this.pageWrap.querySelector('#intakeBack');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const cur = state.action.intake.step || 0;
        if (cur <= 0) return;

        const intake     = this.pageWrap.querySelector('.action-intake');
        const transcript = intake && intake.querySelector('.action-intake__transcript');
        const current    = intake && intake.querySelector('.action-intake__current');
        if (!intake || !transcript || !current) {
          // Fall back to the safe path if any node is missing.
          state.action.intake.step = cur - 1;
          if (q.id === 'rewordedGoal') delete state.action.intake.answers.rewordedGoal;
          persistNow();
          this._renderIntakeStep({ goingBack: true });
          return;
        }

        // Phase 1: fade out the current question + its input/options, plus
        // the last 1-2 transcript bubbles (those are the prior Q and the
        // user's answer to it - they're about to become the new current).
        const bubble  = current.querySelector('.action-chat__bubble--current');
        const options = current.querySelector('.action-chat__options') || current.querySelector('.action-chat__input-row');
        const tBubbles = Array.from(transcript.querySelectorAll('.action-chat__bubble'));
        const lastUser = tBubbles[tBubbles.length - 1];
        const lastAi   = lastUser && lastUser.classList.contains('action-chat__bubble--user') ? tBubbles[tBubbles.length - 2] : null;
        const exitNodes = [bubble, options, lastUser, lastAi].filter(Boolean);
        exitNodes.forEach(n => {
          n.style.transition = 'opacity 0.26s cubic-bezier(0.4, 0, 0.2, 1), transform 0.26s cubic-bezier(0.4, 0, 0.2, 1)';
          n.style.opacity = '0';
          n.style.transform = 'translateY(6px)';
        });

        // Phase 2: after the fade, rewind step and surgically swap content.
        setTimeout(() => {
          state.action.intake.step = cur - 1;
          if (q.id === 'rewordedGoal') delete state.action.intake.answers.rewordedGoal;
          persistNow();
          // Remove the now-empty exit nodes from the DOM (they're invisible).
          [lastUser, lastAi].forEach(n => { if (n && n.parentNode) n.parentNode.removeChild(n); });
          // Rebuild the back button visibility + the current section content.
          this._swapCurrentSection(true);
        }, 260);
      });
    }
    const advance = (raw) => {
      const value = String(raw || '').trim();
      if (!value) return this._intakeShowError("Give it a real shot.");
      if (q.type === 'text') {
        // Lazy answer check (unless allowNothing and they actually wrote a "nothing" answer with substance)
        if (q.minLen && value.length < q.minLen && !(q.allowNothing && value.length >= 8)) {
          return this._intakeShowError(`A little more than that. At least a real sentence.`);
        }
        if (this._intakeIsLazy(value)) {
          return this._intakeShowError("That's a shortcut. Try an actual answer.");
        }
      }
      state.action.intake.answers[q.id] = value;
      // If user picked an edit option on goalConfirm, the next step is the
      // reword input (inserted dynamically by _intakeQuestions). Once they
      // submit the rewrite, persist the new wording as their Neutron Star so
      // the rest of the flow + the AI plan builds on the updated goal.
      if (q.id === 'rewordedGoal' && value.length >= 4) {
        state.clarity.answers.neutronStar = value;
        if (state.action) {
          state.action.planSourceNeutronStar = '';
          state.action.planGenerated = false;
        }
      }
      // If timeframe is being chosen, also update clarity timeframe so other
      // gates don't ask again.
      if (q.id === 'timeframe' && value) {
        state.clarity.answers.timeframe = value;
      }
      persistNow();
      state.action.intake.step = (state.action.intake.step || 0) + 1;
      // Surgical forward: move the user's answer into the transcript as a new
      // bubble, then swap the current section in place. The transcript above
      // never re-renders, so nothing flashes.
      this._advanceForwardSurgical(q, value);
    };

    if (q.type === 'select') {
      this.pageWrap.querySelectorAll('.action-chat__opt').forEach(btn => {
        btn.addEventListener('click', () => advance(btn.dataset.value));
      });
    } else if (q.type === 'chips') {
      this.pageWrap.querySelectorAll('#intakeChips .action-plan__when-chip').forEach(btn => {
        btn.addEventListener('click', () => advance(btn.dataset.chip));
      });
      const custom = this.pageWrap.querySelector('#intakeCustom');
      const customBtn = this.pageWrap.querySelector('#intakeCustomSave');
      if (customBtn && custom) {
        customBtn.addEventListener('click', () => advance(custom.value));
        custom.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); advance(custom.value); } });
      }
    } else {
      const input = this.pageWrap.querySelector('#intakeInput');
      const send = this.pageWrap.querySelector('#intakeSend');
      const submit = () => advance(input?.value || '');
      send?.addEventListener('click', submit);
      input?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
      });
      input?.focus();
    }
  },

  // Render the next question with a "typing → AI acknowledgment" transition.
  // The user's just-submitted answer is already saved; we render the new
  // step (which puts the prior Q+A into the transcript), then float a
  // typing-dots bubble + reaction bubble in the active area so the flow
  // feels conversational. Falls back gracefully if AI call fails.
  async _renderIntakeWithReaction(prevQ, prevAnswer) {
    // Show typing dots in place of the next bubble while the AI reacts to
    // the user's last answer. Once the reaction comes back, we save it
    // against the upcoming question's id and re-render, the renderer
    // merges reaction + question into a SINGLE AI bubble so the user never
    // sees two stacked AI messages.
    const questions = this._intakeQuestions();
    const nextStep = state.action.intake.step || 0;
    const nextQ = questions[nextStep];

    // Render the transcript without the next question, we'll add typing
    // dots in its place.
    this._renderIntakeStep();
    const current = this.pageWrap.querySelector('.action-intake__current');
    const intake = this.pageWrap.querySelector('.action-intake');
    if (!current || !intake) return;
    current.style.opacity = '0';
    current.style.pointerEvents = 'none';
    const typing = document.createElement('div');
    typing.className = 'action-chat__typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    intake.insertBefore(typing, current);
    this.pageWrap.scrollTop = this.pageWrap.scrollHeight;

    let reaction = '';
    try { reaction = await this._intakeFetchReaction(prevQ, prevAnswer); } catch (_) {}
    if (!intake.isConnected) return;
    typing.remove();

    // Persist the reaction under the next question's id. If there's no
    // next question (we just finished the last one), persist under the
    // previous question's id so the transcript still shows it on review.
    if (reaction) {
      if (!state.action.intake.reactions) state.action.intake.reactions = {};
      const reactionKey = nextQ ? nextQ.id : prevQ.id;
      state.action.intake.reactions[reactionKey] = reaction;
      persistNow();
    }

    // Full re-render, the renderer now sees the reaction in state and
    // merges it into the upcoming AI bubble (one combined message).
    this._renderIntakeStep();
    this.pageWrap.scrollTop = this.pageWrap.scrollHeight;
  },

  async _intakeFetchReaction(prevQ, prevAnswer) {
    // Cheap, focused call: one short sentence acknowledging the answer.
    if (typeof hasAnthropicKey === 'function' && !hasAnthropicKey()) return '';
    const ns = state.clarity.answers.neutronStar || '';
    const sys = `You are reacting to a single user answer inside the Action module intake conversation in Memento.

${typeof MALIK_VOICE_SPEC === 'string' ? MALIK_VOICE_SPEC : ''}

YOUR TASK:
Write ONE short sentence acknowledging what the user just said. Then nothing else.

RULES:
- One sentence. Under 18 words. Plain.
- No questions. No advice. No fluff. No emoji.
- Real, grounded, in Malik's voice. Not a chatbot.
- HARD BAN on em dashes ( - ) and en dashes (-). NEVER use them. Use a period or comma.
- Anti-gaslight rules apply: if they shared progress, treat it as real. If they wrote a healthy answer, do not flip it into a flaw.
- If their answer is "nothing yet" or similar, do not make them feel bad. Acknowledge it honestly.

Return ONLY the sentence text. No quotes, no labels.`;
    const userBody = `Their Neutron Star: ${ns}\n\nThe question they answered: ${prevQ.prompt}\n\nTheir answer: ${prevAnswer}\n\nReact with one sentence now.`;
    const out = await callClaude(
      [{ role: 'user', content: userBody }],
      sys,
      { maxTokens: 80, timeout: 12000 }
    );
    return String(out || '').trim().replace(/^["']|["']$/g, '').replace(EMDASH_RE, ' - ').slice(0, 240);
  },

  _intakeShowError(msg) {
    const err = this.pageWrap.querySelector('#intakeErr');
    if (!err) return;
    err.textContent = msg;
    err.style.display = 'block';
    setTimeout(() => { if (err) err.style.display = 'none'; }, 4000);
  },

  _finishIntake() {
    state.action.intake.completed = true;
    persistNow();
    // Kick off plan generation with the intake answers as extra context.
    generateActionDraft();
  },

  renderPage(index) {
    const page = this.getIntroPages()[index];
    if (!page) return;
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner">
        <div class="action-exp__tut">
          <div class="action-exp__tut-illust">
            ${this.renderIllustration(page.illust)}
          </div>
          <div class="action-exp__tut-card">
            <div class="action-exp__tut-headline">${page.headline}</div>
            <div class="action-exp__tut-sub">${page.sub}</div>
          </div>
        </div>
      </div>
    `;
  },

  getWizSteps() {
    const summary = normalizeClaritySummary(state.clarity.answers);
    const ns = summary.neutronStar || state.clarity.answers.keystone || 'your goal';
    return [
      {
        type: 'confirm', question: 'Is this still the thing you want to make progress on most?',
        ns, answerKey: 'goalConfirmation',
        options: [
          { value: 'yes', label: 'Yes, this is it' },
          { value: 'mostly', label: 'Mostly yes, but there\'s something else I want to focus on' },
          { value: 'refocus', label: 'No, I want to work on something different' }
        ]
      },
      {
        type: 'freetext', answerKey: 'alreadyTried',
        question: 'What do you think you need to do first?',
        hint: "It can be something you've already tried, something obvious, or just a gut feeling. Be specific.",
        placeholder: "e.g. I need to start posting consistently, or I've tried building a landing page but never finished it..."
      },
      {
        type: 'select', answerKey: 'scaleFeeling',
        question: 'Does that feel doable, or does it feel too big?',
        hint: "Be honest. There's no wrong answer.",
        options: [
          { value: 'yes', label: 'I can start it this week' },
          { value: 'big', label: 'It feels a bit too big' },
          { value: 'overwhelming', label: 'It feels very overwhelming' }
        ]
      },
      {
        type: 'freetext', answerKey: 'biggestBlocker',
        question: "What's the biggest thing standing in your way?",
        hint: "Time, money, knowledge, fear, other people. What's the real blocker?",
        placeholder: "e.g. I don't have enough time after work, or I'm not sure if the idea is good enough..."
      }
    ];
  },

  renderContent() {
    this.progressEl.innerHTML = '';
    this.navEl.innerHTML = '';

    // Hard gate: intake must be completed before anything else renders.
    // Without this, returning users (or any flow that calls renderContent
    // directly) could bypass the questions and land straight on the plan.
    const intakeDone = state.action.intake && state.action.intake.completed;
    if (state.action.introSeen && !intakeDone) {
      this._showActionIntake();
      return;
    }

    if (!hasAnthropicKey()) {
      // Built-in AI (server-side key): no key entry, just an honest state.
      this.pageWrap.innerHTML = `
        <div class="action-exp__page-inner"><div class="action-exp__inner" style="padding-top:48px;">
          <div style="font-size:1.3rem;font-weight:700;line-height:1.25;margin-bottom:10px;">AI is unavailable right now.</div>
          <div style="font-size:0.92rem;line-height:1.6;color:var(--text-2);margin-bottom:20px;">Memento could not reach its AI service. Check your connection and try again in a moment.</div>
        </div></div>`;
      return;
    }

    // Round 10: timeframe gate before generation
    if (actionNeedsTimeframe && !hasActionPlan()) {
      this.pageWrap.innerHTML = this.renderTimeframeGate();
      this.bindTimeframeGate();
      return;
    }

    if (actionAiLoading) {
      this.pageWrap.innerHTML = `
        <div class="action-exp__page-inner"><div class="action-exp__inner action-draft-loading">
          <div class="ai-synthesis__thinking action-draft-loading__dots"><span></span><span></span><span></span></div>
          <div class="action-draft-loading__title">Building your action plan.</div>
          <div class="action-draft-loading__lines">
            <div class="action-draft-loading__line action-draft-loading__line--1">Confirming what you want and how to get it.</div>
            <div class="action-draft-loading__line action-draft-loading__line--2">Finding the highest leverage actions you can take today.</div>
            <div class="action-draft-loading__line action-draft-loading__line--3" style="font-style: italic; opacity: 0.7;">"The magic you're looking for is in the work you're avoiding."</div>
          </div>
        </div></div>`;
      return;
    }

    // Round 9: error state with retry, shown when draft generation failed.
    if (actionChatError && !hasActionPlan()) {
      this.pageWrap.innerHTML = `
        <div class="action-exp__page-inner"><div class="action-exp__inner" style="padding-top:80px;text-align:center;">
          <div style="font-size:1.2rem;font-weight:700;margin-bottom:8px;">Something blocked the plan.</div>
          <div style="font-size:0.9rem;color:var(--text-2);line-height:1.6;max-width:32ch;margin:0 auto 20px;">${esc(actionChatError)}</div>
          <button class="action-wiz__btn action-wiz__btn--generate" id="actionDraftRetry" style="padding:14px 28px;border-radius:calc(14px * var(--rx, 1));">Try again</button>
        </div></div>`;
      this.pageWrap.querySelector('#actionDraftRetry')?.addEventListener('click', () => {
        actionChatError = null;
        generateActionDraft();
      });
      return;
    }

    if (hasActionPlan() && actionPlanMatchesClarity()) {
      this._renderPlanByMode();
      return;
    }

    // Round 9: draft-first. If we have nothing yet, kick off auto-generation.
    // The chat path is preserved as the refine fallback (renderActionChat).
    if (!actionAiLoading && state.action.introSeen) {
      generateActionDraft();
      return;
    }

    // If we somehow get here pre-intro, fall back to the chat surface.
    this.renderActionChat();
  },

  // === Round 10 - Timeframe gate (shown when Clarity didn't capture one) ===
  renderTimeframeGate() {
    const chips = ['1 month', '3 months', '6 months', '1 year', '2 years', '5 years', 'Lifelong'];
    const chipsHtml = chips.map(c => `<button class="action-plan__when-chip" data-tf="${esc(c)}" type="button">${esc(c)}</button>`).join('');
    return `
      <div class="action-exp__page-inner"><div class="action-exp__inner action-tf-gate">
        <div class="action-tf-gate__title">First, when do you want this?</div>
        <div class="action-tf-gate__sub">A plan for a month from now and a plan for five years from now look completely different. Pick the one that's true.</div>
        <div class="action-plan__when-edit" id="actionTfChips">${chipsHtml}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:14px;width:100%;max-width:420px;">
          <input class="wiz__text-input" id="actionTfCustom" type="text" placeholder="Or type your own (e.g. 18 months)" style="flex:1;">
          <button class="action-wiz__btn action-wiz__btn--generate" id="actionTfSave" style="padding:12px 20px;border-radius:calc(8px * var(--rx, 1));">Use this</button>
        </div>
      </div></div>
    `;
  },
  bindTimeframeGate() {
    const wrap = this.pageWrap;
    const commit = (val) => {
      const v = String(val || '').trim();
      if (v.length < 1) return;
      state.clarity.answers.timeframe = v;
      persistNow();
      actionNeedsTimeframe = false;
      generateActionDraft();
    };
    wrap.querySelectorAll('#actionTfChips .action-plan__when-chip').forEach(btn => {
      btn.addEventListener('click', () => commit(btn.dataset.tf));
    });
    wrap.querySelector('#actionTfSave')?.addEventListener('click', () => {
      const v = wrap.querySelector('#actionTfCustom')?.value || '';
      commit(v);
    });
    wrap.querySelector('#actionTfCustom')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(e.target.value); }
    });
  },

  // === Round 8 - Adaptive chat UI ===
  renderActionChat() {
    this.progressEl.innerHTML = '';
    this.navEl.innerHTML = '';

    // First time entering chat - kick off the first question.
    if (!actionChatReady && !actionChatSending && !actionChatCurrentQuestion) {
      // Initialize from saved conversation if present.
      if (Array.isArray(state.action.aiConversation) && state.action.aiConversation.length) {
        actionChatMessages = [...state.action.aiConversation];
      } else {
        actionChatMessages = [];
      }
      sendActionChatTurn();
    }

    const transcriptHtml = actionChatMessages.map(m => {
      if (m.role === 'assistant') {
        return `<div class="action-chat__bubble action-chat__bubble--ai">${esc(m.content)}</div>`;
      }
      return `<div class="action-chat__bubble action-chat__bubble--user">${esc(m.content)}</div>`;
    }).join('');

    let inputHtml = '';
    if (actionChatSending) {
      inputHtml = `<div class="action-chat__thinking"><span></span><span></span><span></span></div>`;
    } else if (actionChatCurrentQuestion) {
      const q = `<div class="action-chat__bubble action-chat__bubble--ai action-chat__bubble--current">${esc(actionChatCurrentQuestion)}</div>`;
      if (actionChatCurrentType === 'select' && actionChatCurrentOptions.length) {
        const opts = actionChatCurrentOptions.map((o, i) =>
          `<button class="action-chat__opt" type="button" data-value="${esc(o)}">${esc(o)}</button>`
        ).join('');
        inputHtml = q + `<div class="action-chat__options">${opts}</div>`;
      } else {
        inputHtml = q + `
          <div class="action-chat__input-row">
            <div class="action-chat__input-row-inner">
              <textarea class="action-chat__input" id="actionChatInput" rows="2" placeholder="Type your answer..." autocomplete="off"></textarea>
              <button class="action-chat__send" id="actionChatSend" type="button" aria-label="Send"></button>
            </div>
          </div>
        `;
      }
    }

    const errorHtml = actionChatError
      ? `<div class="action-chat__error">${esc(actionChatError)}</div>`
      : '';

    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner">
        <div class="action-exp__inner action-chat">
          <div class="action-chat__eyebrow">Action</div>
          <div class="action-chat__transcript">${transcriptHtml}</div>
          ${inputHtml}
          ${errorHtml}
        </div>
      </div>
    `;

    // Bind input / send
    const sendBtn = this.pageWrap.querySelector('#actionChatSend');
    const inputEl = this.pageWrap.querySelector('#actionChatInput');
    if (sendBtn && inputEl) {
      const submit = () => {
        const val = inputEl.value.trim();
        if (!val) return;
        submitActionChatReply(val);
      };
      sendBtn.addEventListener('click', submit);
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      });
      // Auto-focus on desktop only - avoid keyboard popping up on mobile.
      if (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches) {
        setTimeout(() => inputEl.focus(), 50);
      }
    }
    this.pageWrap.querySelectorAll('.action-chat__opt').forEach(btn => {
      btn.addEventListener('click', () => submitActionChatReply(btn.dataset.value));
    });

    // Auto-scroll transcript to bottom so latest is visible.
    const t = this.pageWrap.querySelector('.action-chat__transcript');
    if (t) t.scrollTop = t.scrollHeight;
  },

  renderWizStep(stepIdx) {
    const steps = this.getWizSteps();
    const step = steps[stepIdx];
    if (!step) return;
    const wa = state.action.wizAnswers || {};
    const total = steps.length;

    let bodyHtml = '';
    if (stepIdx === 0) {
      bodyHtml += `<div class="action-wiz__intro">Quick one. I promise this won't take long.</div>`;
    }
    if (step.type === 'confirm') {
      bodyHtml += `<div class="action-ns-card"><div class="action-ns-label">Your Neutron Star</div><div class="action-ns-text">${esc(step.ns)}</div></div>`;
    }
    bodyHtml += `<div class="wiz__question">${step.question}</div>`;
    if (step.hint) bodyHtml += `<div class="wiz__hint">${step.hint}</div>`;

    if (step.type === 'confirm' || step.type === 'select') {
      bodyHtml += '<div class="wiz__options">';
      (step.options || []).forEach(opt => {
        const sel = wa[step.answerKey] === opt.value ? 'selected' : '';
        bodyHtml += `<div class="wiz__option ${sel}" data-answer-key="${esc(step.answerKey)}" data-value="${esc(opt.value)}">
          <div class="wiz__option-radio"></div>
          <div><div class="wiz__option-text">${esc(opt.label)}</div>${opt.desc ? `<div class="wiz__option-desc">${esc(opt.desc)}</div>` : ''}</div>
        </div>`;
      });
      bodyHtml += '</div>';
    } else {
      bodyHtml += `<div class="wiz__text-wrap" style="margin-top:8px;"><textarea class="wiz__text-input wiz__textarea" id="actionWizText" data-answer-key="${esc(step.answerKey)}" placeholder="${esc(step.placeholder || '')}" rows="3" style="min-height:90px;">${esc(wa[step.answerKey] || '')}</textarea></div>`;
    }

    if (actionAiError) {
      bodyHtml += `<div style="font-size:0.82rem;color:var(--color-action);padding:10px 14px;border-radius:calc(10px * var(--rx, 1));background:var(--kfill-06);border:1px solid rgba(var(--ink),0.15);margin-top:14px;">${esc(actionAiError)}</div>`;
    }

    const hasAnswer = !!(wa[step.answerKey]);
    const isLast = stepIdx === total - 1;
    const nextLabel = isLast ? 'Find my action plan' : 'Next';
    const nextCls = isLast ? 'action-wiz__btn--generate' : 'action-wiz__btn--next';

    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner">
        <div class="action-exp__inner">
          <div class="wiz__step">${bodyHtml}</div>
        </div>
      </div>`;

    this.navEl.innerHTML = `<div class="action-wiz__nav">
      <button class="action-wiz__btn action-wiz__btn--back" id="actionWizBack">Back</button>
      <button class="action-wiz__btn ${nextCls}" id="actionWizNext" ${hasAnswer ? '' : 'disabled'}>${nextLabel}</button>
    </div>`;

    this.pageWrap.querySelectorAll('.wiz__option').forEach(opt => {
      opt.addEventListener('click', () => {
        this.pageWrap.querySelectorAll('.wiz__option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        wa[opt.dataset.answerKey] = opt.dataset.value;
        persistNow();
        const nb = this.navEl.querySelector('#actionWizNext');
        if (nb) nb.disabled = false;
      });
    });

    const ta = this.pageWrap.querySelector('#actionWizText');
    if (ta) {
      ta.addEventListener('input', () => {
        wa[ta.dataset.answerKey] = ta.value.trim();
        persistNow();
        const nb = this.navEl.querySelector('#actionWizNext');
        if (nb) nb.disabled = !ta.value.trim();
      });
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          const nb = this.navEl.querySelector('#actionWizNext');
          if (nb && !nb.disabled) { e.preventDefault(); nb.click(); }
        }
      });
    }

    this.navEl.querySelector('#actionWizBack')?.addEventListener('click', () => {
      if (stepIdx > 0) {
        state.action.wizStep = stepIdx - 1;
        persistNow();
        this.renderWizStep(state.action.wizStep);
      } else {
        state.action.tutorialSeen = false;
        persistNow();
        this._showActionIntro();
      }
    });

    this.navEl.querySelector('#actionWizNext')?.addEventListener('click', () => {
      if (ta) wa[ta.dataset.answerKey] = ta.value.trim();
      if (isLast) {
        state.action.wizStep = 0;
        persistNow();
        generateActionPlan();
      } else {
        state.action.wizStep = stepIdx + 1;
        persistNow();
        this.renderWizStep(state.action.wizStep);
      }
    });
  },

  // Route the plan page to the active view mode. Vine is the default; the
  // mountain stays available behind the toggle.
  _renderPlanByMode() {
    // New Leverage Ladder plan screen. renderPlan / renderVinePlan remain
    // defined below for reference but are no longer the active view.
    this.renderActionPlan();
  },

  // Small segmented control shared by both views. Appended after render so it
  // survives whichever renderer rebuilt pageWrap.
  _injectViewToggle(mode) {
    if (!this.pageWrap) return;
    const old = this.pageWrap.querySelector('.vp-modeswitch');
    if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.className = 'vp-modeswitch';
    wrap.innerHTML =
      '<button class="vp-modeswitch__btn' + (mode === 'vine' ? ' on' : '') + '" data-mode="vine">Path</button>' +
      '<button class="vp-modeswitch__btn' + (mode === 'mountain' ? ' on' : '') + '" data-mode="mountain">Mountain</button>';
    wrap.querySelectorAll('.vp-modeswitch__btn').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = b.getAttribute('data-mode');
        if (m === ((state.action.viewMode === 'mountain') ? 'mountain' : 'vine')) return;
        state.action.viewMode = m;
        try { persistNow(); } catch (_) {}
        this._renderPlanByMode();
      });
    });
    this.pageWrap.appendChild(wrap);
  },

  // One-time stylesheet for the Leverage Ladder plan screen. Namespaced apl-*
  // so nothing collides. Ported from the three design comps (sharp 8px,
  // transparent black glass, hairline borders).
  _injectActionPlanStyles() {
    if (document.getElementById('aplStyles')) return;
    const s = document.createElement('style');
    s.id = 'aplStyles';
    s.textContent = [
      // ----- scroll shell (lives inside the action page-wrap) -----
      // ===== FLAT DARK DASHBOARD (Linear-like). Pure near-black, hairline
      // borders, 8px radius, no glow, no blur, no gradients. Green only for
      // streak / done. Everything else greyscale. =====
      // ----- scroll shell: opaque flat black so the action-exp starfield /
      // orbs behind the page-wrap are fully covered on this screen -----
      '.apl-screen{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#060608;',
      '--apl-done:var(--success);--apl-done-rgb:48,209,88;',
      '--apl-hi:rgba(var(--ink),0.95);--apl-t1:rgba(var(--ink),0.88);--apl-t2:rgba(var(--ink),0.55);--apl-t3:rgba(var(--ink),0.40);--apl-t4:rgba(var(--ink),0.46);',
      '--apl-card:rgba(var(--ink),0.022);--apl-card-2:rgba(var(--ink),0.035);--apl-hair:rgba(var(--ink),0.08);--apl-hair-2:rgba(var(--ink),0.12);--apl-hair-3:rgba(var(--ink),0.18);',
      '--apl-ease:cubic-bezier(0.2,0.8,0.2,1);--apl-dur:0.16s;}',
      '.apl-wrap{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:clamp(24px,5vw,44px) clamp(16px,5vw,28px) 96px;display:flex;flex-direction:column;gap:clamp(16px,2.6vw,22px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--apl-t1);}',
      '.apl-num{font-variant-numeric:tabular-nums;}',
      // tiny uppercase label
      '.apl-label{font-size:0.66rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--apl-t4);}',
      // ----- screen head -----
      '.apl-head{display:flex;align-items:center;justify-content:space-between;gap:16px;}',
      // Mobile: clear the fixed hamburger menu button (top/left 16px, ~40px) so it never overlaps the title.
      '@media (max-width:859.98px){.apl-head{padding-left:56px;padding-right:48px;min-height:40px;}}',
      '.apl-head__title{font-size:0.86rem;font-weight:600;letter-spacing:0.01em;color:var(--apl-t1);display:flex;align-items:center;gap:8px;}',
      '.apl-head__dot{width:6px;height:6px;border-radius:50%;background:var(--kfill-50);}',
      '.apl-head__date{font-size:0.78rem;color:var(--apl-t3);letter-spacing:0.01em;}',
      // generic flat card
      '.apl-card{background:var(--apl-card);border:1px solid var(--apl-hair);border-radius:calc(6px * var(--rx, 1));}',
      // ----- 1. TODAY\'S ACTION split card -----
      '.apl-today{display:grid;grid-template-columns:1fr;}',
      '.apl-today__main{padding:clamp(18px,2.4vw,26px);min-width:0;}',
      '.apl-today__why{padding:clamp(18px,2.4vw,26px);min-width:0;border-top:1px solid var(--apl-hair);}',
      '.apl-today__title{margin-top:10px;font-size:clamp(1.28rem,2.6vw,1.7rem);line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:var(--apl-hi);max-width:24ch;}',
      // intensity selector (segmented, small)
      '.apl-seg{margin-top:16px;display:inline-flex;align-items:stretch;gap:0;border:1px solid var(--apl-hair);border-radius:calc(8px * var(--rx, 1));overflow:hidden;background:var(--kfill-04);max-width:100%;}',
      '.apl-seg__btn{font:inherit;font-size:0.72rem;font-weight:600;letter-spacing:0.005em;color:var(--apl-t3);background:transparent;border:0;border-right:1px solid var(--apl-hair);padding:7px 11px;cursor:pointer;white-space:nowrap;transition:color var(--apl-dur) var(--apl-ease),background var(--apl-dur) var(--apl-ease);-webkit-tap-highlight-color:transparent;}',
      '.apl-seg__btn:last-child{border-right:0;}',
      '.apl-seg__btn:hover{color:var(--apl-t2);background:var(--kfill-03);}',
      '.apl-seg__btn.is-on{color:var(--apl-hi);background:var(--kfill-12);font-weight:700;}',
      '.apl-seg__btn:focus-visible{outline:none;box-shadow:inset 0 0 0 1.5px var(--apl-hair-3);}',
      '.apl-seg-hint{margin-top:8px;font-size:0.74rem;line-height:1.45;color:var(--apl-t3);}',
      '.apl-seg-hint b{color:var(--apl-t2);font-weight:600;}',
      // today buttons
      '.apl-today__actions{margin-top:18px;display:flex;flex-wrap:wrap;gap:9px;}',
      '.apl-btn{font-family:inherit;font-size:0.82rem;font-weight:600;letter-spacing:0.005em;border-radius:calc(8px * var(--rx, 1));border:1px solid var(--apl-hair-2);background:transparent;color:var(--apl-t1);padding:9px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;transition:background var(--apl-dur) var(--apl-ease),border-color var(--apl-dur) var(--apl-ease),color var(--apl-dur) var(--apl-ease);-webkit-tap-highlight-color:transparent;}',
      '.apl-btn svg{width:15px;height:15px;flex:0 0 auto;}',
      '.apl-btn:hover{background:var(--kfill-04);border-color:var(--apl-hair-3);color:var(--apl-hi);}',
      '.apl-btn:active{transform:translateY(0.5px);}',
      '.apl-btn:focus-visible{outline:none;box-shadow:0 0 0 1.5px var(--apl-hair-3);}',
      '.apl-btn[disabled]{cursor:default;}',
      // done button: green outline
      '.apl-btn--done{color:var(--apl-done);border-color:rgba(var(--apl-done-rgb),0.40);}',
      '.apl-btn--done:hover{background:rgba(var(--apl-done-rgb),0.08);border-color:rgba(var(--apl-done-rgb),0.6);color:var(--apl-done);}',
      '.apl-btn--done.is-done{color:var(--apl-done);border-color:rgba(var(--apl-done-rgb),0.40);background:rgba(var(--apl-done-rgb),0.07);}',
      '.apl-btn--ghost{color:var(--apl-t2);}',
      // why side
      '.apl-today__why .apl-today__whytext{margin-top:10px;font-size:0.92rem;line-height:1.55;color:var(--apl-t2);}',
      // ----- 3. YOUR PATH stepper (centerpiece) -----
      '.apl-path__head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px;}',
      '.apl-path__sub{font-size:0.82rem;color:var(--apl-t3);}',
      '.apl-path{padding:clamp(8px,1.4vw,14px) clamp(10px,1.6vw,18px) clamp(6px,1vw,10px);}',
      '.apl-stepper{position:relative;}',
      // the vertical connector line
      '.apl-stepper::before{content:"";position:absolute;left:5px;top:18px;bottom:18px;width:1px;background:var(--apl-hair-2);z-index:0;}',
      '.apl-step{position:relative;z-index:1;}',
      '.apl-step+.apl-step{border-top:1px solid var(--apl-hair);}',
      '.apl-step__head{display:grid;grid-template-columns:11px 1fr auto;align-items:start;gap:0 16px;width:100%;padding:15px 4px 15px 0;background:none;border:0;text-align:left;font:inherit;color:inherit;cursor:pointer;}',
      '.apl-step__head:focus-visible{outline:none;box-shadow:0 0 0 1.5px var(--apl-hair-3);border-radius:calc(6px * var(--rx, 1));}',
      '.apl-step__node{display:flex;align-items:center;justify-content:center;margin-top:3px;}',
      '.apl-step__dot{width:11px;height:11px;border-radius:50%;background:#060608;border:1.5px solid var(--apl-t4);box-shadow:0 0 0 3px #060608;}',
      '.apl-step__body{min-width:0;}',
      '.apl-step__eyebrow{display:block;font-size:0.62rem;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:var(--apl-t4);margin-bottom:5px;}',
      '.apl-step__text{font-size:0.94rem;line-height:1.4;font-weight:500;color:var(--apl-t1);}',
      '.apl-step__aside{display:flex;align-items:center;gap:9px;margin-top:1px;}',
      '.apl-tag{font-size:0.58rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--apl-t3);border:1px solid var(--apl-hair);border-radius:calc(5px * var(--rx, 1));padding:3px 7px;white-space:nowrap;}',
      '.apl-chev{width:15px;height:15px;color:var(--apl-t4);flex:none;transition:transform 0.24s var(--apl-ease),color var(--apl-dur) var(--apl-ease);}',
      '.apl-step__head:hover .apl-chev{color:var(--apl-t2);}',
      '.apl-step.is-open .apl-chev{transform:rotate(180deg);}',
      '.apl-step__panel{display:grid;grid-template-rows:0fr;transition:grid-template-rows 0.28s var(--apl-ease);}',
      '.apl-step.is-open .apl-step__panel{grid-template-rows:1fr;}',
      '.apl-step__panel-inner{overflow:hidden;min-height:0;}',
      '.apl-fields{padding:0 4px 16px 27px;}',
      '.apl-field{margin-bottom:12px;}.apl-field:last-child{margin-bottom:0;}',
      '.apl-field__label{font-size:0.6rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--apl-t4);margin-bottom:4px;}',
      '.apl-field__val{font-size:0.88rem;line-height:1.5;color:var(--apl-t2);}',
      // goal step (top)
      '.apl-step--goal .apl-step__text{font-size:1.06rem;line-height:1.32;font-weight:600;color:var(--apl-hi);letter-spacing:-0.01em;}',
      '.apl-step--goal .apl-step__dot{width:12px;height:12px;background:var(--kfill-90);border-color:rgba(var(--ink),0.9);}',
      // today step (bottom, highlighted with a subtle border)
      '.apl-step--today{margin:6px 0 4px;border-radius:calc(6px * var(--rx, 1));border:1px solid var(--apl-hair-2);background:var(--kfill-025);}',
      '.apl-step--today+.apl-step,.apl-step+.apl-step--today{border-top:0;}',
      '.apl-step--today .apl-step__head{padding-left:12px;padding-right:12px;grid-template-columns:11px 1fr auto;}',
      '.apl-step--today .apl-step__dot{background:var(--apl-done);border-color:var(--apl-done);box-shadow:0 0 0 3px #060608;}',
      '.apl-step--today .apl-step__eyebrow{color:var(--apl-done);}',
      '.apl-step--today .apl-step__text{color:var(--apl-hi);font-weight:600;}',
      '.apl-step--today .apl-tag{color:var(--apl-done);border-color:rgba(var(--apl-done-rgb),0.35);}',
      '.apl-step--today .apl-fields{padding-left:39px;}',
      // ----- 4. footer links -----
      '.apl-foot{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;padding:4px 2px 0;}',
      '.apl-foot__link{font:inherit;font-size:0.78rem;font-weight:500;color:var(--apl-t3);background:none;border:0;padding:2px 0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:color var(--apl-dur) var(--apl-ease);-webkit-tap-highlight-color:transparent;}',
      '.apl-foot__link:hover{color:var(--apl-t1);}',
      '.apl-foot__link:focus-visible{outline:none;color:var(--apl-hi);text-decoration:underline;}',
      '.apl-foot__link b{color:var(--apl-t2);font-weight:600;font-variant-numeric:tabular-nums;}',
      '.apl-foot__sep{width:3px;height:3px;border-radius:50%;background:var(--apl-hair-3);flex:0 0 auto;}',
      // ----- 5. RIGHT RAIL cards -----
      '.apl-rail{display:flex;flex-direction:column;gap:clamp(16px,2.6vw,22px);min-width:0;}',
      '.apl-rcard{padding:18px;}',
      '.apl-rcard__head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;}',
      '.apl-rcard__big{font-size:1.7rem;line-height:1;font-weight:600;letter-spacing:-0.02em;color:var(--apl-hi);font-variant-numeric:tabular-nums;}',
      '.apl-rcard__big small{font-size:0.86rem;font-weight:500;color:var(--apl-t3);letter-spacing:0;margin-left:6px;}',
      '.apl-rcard__sub{margin-top:7px;font-size:0.8rem;line-height:1.45;color:var(--apl-t3);}',
      '.apl-rcard__sub b{color:var(--apl-t2);font-weight:600;font-variant-numeric:tabular-nums;}',
      // focus dots
      '.apl-dots{display:flex;flex-wrap:wrap;gap:5px;margin-top:14px;}',
      '.apl-dot{width:9px;height:9px;border-radius:50%;background:var(--kfill-07);}',
      '.apl-dot.is-on{background:var(--apl-done);}',
      '.apl-rempty{font-size:0.82rem;line-height:1.5;color:var(--apl-t3);}',
      // reflection
      '.apl-refl__date{font-size:0.7rem;font-weight:550;letter-spacing:0.04em;text-transform:uppercase;color:var(--apl-t4);margin-bottom:6px;}',
      '.apl-refl__text{font-size:0.86rem;line-height:1.55;color:var(--apl-t2);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;}',
      '.apl-rlink{margin-top:14px;font:inherit;font-size:0.78rem;font-weight:500;color:var(--apl-t3);background:none;border:0;padding:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:color var(--apl-dur) var(--apl-ease);-webkit-tap-highlight-color:transparent;}',
      '.apl-rlink:hover{color:var(--apl-t1);}',
      '.apl-rlink:focus-visible{outline:none;color:var(--apl-hi);text-decoration:underline;}',
      '.apl-rlink svg{width:14px;height:14px;}',
      // ----- desktop dashboard grid (>=1024px): main column + right rail -----
      '@media (min-width:1024px){',
      // Vertically center the plan block when it is shorter than the viewport,
      // but still scroll from the top (never clip) when it is taller. Flex column
      // + auto block margins on the wrap is the safe pattern: short content gets
      // equal top/bottom margins (centered); tall content collapses the margins
      // and overflows downward, scrollable from the top.
      '.apl-screen{display:flex;flex-direction:column;}',
      '.apl-wrap{max-width:1240px;width:100%;margin-block:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,360px);align-items:start;column-gap:clamp(20px,2.2vw,32px);row-gap:clamp(16px,2.2vw,22px);grid-template-areas:"head head" "main rail";}',
      '.apl-wrap>.apl-head{grid-area:head;}',
      '.apl-wrap>.apl-main{grid-area:main;display:flex;flex-direction:column;gap:clamp(16px,2.2vw,22px);min-width:0;}',
      '.apl-wrap>.apl-rail{grid-area:rail;position:sticky;top:clamp(20px,3vw,32px);}',
      // the split Today\'s Action card: two columns with a vertical divider
      '.apl-today{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);}',
      '.apl-today__why{border-top:0;border-left:1px solid var(--apl-hair);}',
      '}',
      // tablet / mobile (<1024px): single vertical column, stacked rail below
      '@media (max-width:1023px){',
      '.apl-main{display:flex;flex-direction:column;gap:clamp(16px,2.6vw,22px);}',
      '}',
      '@media (max-width:560px){',
      '.apl-seg{display:grid;grid-template-columns:repeat(5,1fr);width:100%;}',
      '.apl-seg__btn{padding:8px 4px;text-align:center;}',
      '.apl-today__actions .apl-btn{flex:1 1 auto;justify-content:center;}',
      '}',
      // reduced motion / lite
      'body.calm-motion .apl-step__panel,body.lite .apl-step__panel,body.calm-motion .apl-chev,body.lite .apl-chev{transition:none;}',
      '@media (prefers-reduced-motion:reduce){.apl-step__panel,.apl-chev,.apl-btn,.apl-seg__btn{transition-duration:0.01ms;}}'
    ].join('');
    document.head.appendChild(s);
  },

  // The Leverage Ladder plan screen. Builds the full plan top-to-bottom into
  // this.pageWrap, reusing existing planning state. See _injectActionPlanStyles.
  renderActionPlan() {
    const inst = this;
    if (inst.navEl) inst.navEl.innerHTML = '';
    inst._injectActionPlanStyles();

    // ----- real data with safe fallbacks -----
    const pa = (state.action && state.action.primaryAction) || {};
    const ans = (state.clarity && state.clarity.answers) || {};
    const focusPlan = (state.action && state.action.focusPlan) || {};
    const TIER_KEYS = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    const TIER_META = {
      tiny:     { name: 'Tiny',     level: 1, effort: '~5 min' },
      light:    { name: 'Light',    level: 2, effort: '~15 min' },
      moderate: { name: 'Moderate', level: 3, effort: '' },
      heavy:    { name: 'Heavy',    level: 4, effort: '~2 hrs' },
      extreme:  { name: 'Extreme',  level: 5, effort: 'Half day' }
    };
    const tiers = (pa.tiers && typeof pa.tiers === 'object') ? pa.tiers : {};
    let selectedTier = TIER_KEYS.indexOf(pa.recommendedTier) >= 0 ? pa.recommendedTier : 'moderate';
    const tierText = (k) => (tiers && tiers[k]) || pa.title || '';
    const moveText = tierText(selectedTier);
    const title = pa.title || moveText || 'Your one move today';
    const why = pa.why || '';
    const howToStart = pa.howToStart || '';
    const goalText = ans.neutronStar || 'Your goal';

    // leverage panel: explicit fields, else fall back to `why`
    const lev = (pa.leverage && typeof pa.leverage === 'object') ? pa.leverage : {};
    const levRows = [
      { key: 'unlocks', label: 'Unlocks', val: lev.unlocks },
      { key: 'removes', label: 'Removes', val: lev.removes },
      { key: 'proves',  label: 'Proves',  val: lev.proves },
      { key: 'risk',    label: 'Risk',    val: lev.risk }
    ].filter(r => r.val && String(r.val).trim());
    if (!levRows.length && why) levRows.push({ key: 'proves', label: 'Why this move', val: why });

    // ladder path: Neutron Star (top) -> milestones (big to small) -> Today
    const rawPath = Array.isArray(pa.path) ? pa.path.filter(p => p && p.milestone) : [];
    const ladderPath = rawPath.slice().reverse(); // big horizon first, smallest last

    // completion state for today
    const todayStr = getTodayISO();
    const completedToday = (function () {
      const h = state.action.completionHistory;
      if (!Array.isArray(h) || !h.length) return false;
      const last = h[h.length - 1];
      return !!(last && last.date && isoToLocalDay(last.date) === todayStr);
    })();

    // "Why this matters": prefer an explicit leverage line, else `why`.
    const whyText = (levRows.length ? String(levRows[0].val) : why) || '';

    // ----- right-rail real data -----
    // Focus today: sessions logged today (sidebar uses "Mar 5" date keys) +
    // all-time total focus time. No data -> calm empty state.
    const sessions = (state.deepwork && Array.isArray(state.deepwork.sessions)) ? state.deepwork.sessions : [];
    const todayKey = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const focusToday = sessions.filter(s => s && s.date === todayKey).length;
    const focusMins = sessions.reduce((a, s) => a + (s && s.minutes ? s.minutes : 0), 0);
    const focusTotalLabel = focusMins >= 60 ? (Math.floor(focusMins / 60) + 'h ' + (focusMins % 60) + 'm') : (focusMins + 'm');
    // Progress: current streak + days-left-to-goal (reuse the sidebar concept).
    let streakCount = 0;
    try { streakCount = (typeof consistencyStats === 'function') ? (consistencyStats().current || 0) : ((state.streak && state.streak.count) || 0); } catch (_) {}
    let daysLeft = null;
    try {
      const horizon = (state.clarity && state.clarity.answers && state.clarity.answers.timeHorizon) || '';
      const completedAt = state.clarity && state.clarity.completedAt;
      daysLeft = (typeof Sidebar !== 'undefined' && Sidebar._computeDaysLeft) ? Sidebar._computeDaysLeft(horizon, completedAt) : null;
    } catch (_) {}
    // Reflection: latest entry (date + text). None -> calm empty state.
    const reflEntries = (state.reflection && Array.isArray(state.reflection.entries)) ? state.reflection.entries : [];
    const lastRefl = reflEntries.length ? reflEntries[reflEntries.length - 1] : null;
    // Proof count for the footer: actions completed.
    const doneCount = (state.action && Array.isArray(state.action.completionHistory)) ? state.action.completionHistory.length : 0;

    const dateStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

    // ----- build markup -----
    const esc2 = esc;
    const CHEV = '<svg class="apl-chev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    // ===== 1. TODAY'S ACTION split card =====
    // Intensity selector: small segmented control. Selecting calls the existing
    // tier-set logic (recommendedTier + persistNow + re-render) wired below.
    const segHtml =
      '<div class="apl-seg" id="aplSeg" role="radiogroup" aria-label="Intensity">' +
        TIER_KEYS.map(k => {
          const m = TIER_META[k];
          const on = (k === selectedTier);
          return '<button class="apl-seg__btn' + (on ? ' is-on' : '') + '" type="button" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" data-tier="' + k + '">' + esc2(m.name) + '</button>';
        }).join('') +
      '</div>';

    const todayHtml =
      '<section class="apl-today apl-card" aria-labelledby="aplTodayTitle">' +
        '<div class="apl-today__main">' +
          '<div class="apl-label">Today\'s action</div>' +
          '<h1 class="apl-today__title" id="aplTodayTitle">' + esc2(moveText || title) + '</h1>' +
          segHtml +
          '<div class="apl-seg-hint" id="aplSegHint">' + (function () { var tm = TIER_META[selectedTier] || {}; var isRec = selectedTier === pa.recommendedTier; var eff = tm.effort ? ' (' + esc2(tm.effort) + ')' : ''; return '<b>' + esc2(tm.name || '') + '</b>' + eff + (isRec ? (pa.recommendedWhy ? '. ' + esc2(pa.recommendedWhy) : ', your recommended dose today.') : ' dose selected.'); })() + '</div>' +
          '<div class="apl-today__actions">' +
            '<button class="apl-btn apl-btn--done' + (completedToday ? ' is-done' : '') + '" type="button" id="aplMarkDone"' + (completedToday ? ' aria-pressed="true"' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>' + (completedToday ? 'Done today' : 'Mark it done') + '</button>' +
            '<button class="apl-btn apl-btn--ghost" type="button" id="aplFocus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>Focus on this</button>' +
            '<button class="apl-btn apl-btn--ghost" type="button" id="aplRefine"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v5l3-3M12 21a7 7 0 1 0-7-7"/></svg>Refine</button>' +
          '</div>' +
        '</div>' +
        (whyText ? '<div class="apl-today__why"><div class="apl-label">Why this matters</div><p class="apl-today__whytext">' + esc2(whyText) + '</p></div>' : '') +
      '</section>';

    // ===== 3. YOUR PATH stepper (centerpiece) =====
    // Collapsed rows top->bottom: GOAL -> milestones (big->small) -> TODAY.
    // Tags derived by position. Rows expand to looksLike / bridge / signal.
    const fieldsFor = (p) => {
      const rows = [];
      if (p.looksLike) rows.push('<div class="apl-field"><div class="apl-field__label">Looks like</div><div class="apl-field__val">' + esc2(p.looksLike) + '</div></div>');
      if (p.bridge) rows.push('<div class="apl-field"><div class="apl-field__label">Bridge</div><div class="apl-field__val">' + esc2(p.bridge) + '</div></div>');
      if (p.signal) rows.push('<div class="apl-field"><div class="apl-field__label">Signal</div><div class="apl-field__val">' + esc2(p.signal) + '</div></div>');
      return rows.length ? '<div class="apl-fields">' + rows.join('') + '</div>' : '';
    };

    const goalStep =
      '<div class="apl-step apl-step--goal" data-step>' +
        '<button class="apl-step__head" type="button" aria-expanded="false" aria-controls="aplS0">' +
          '<span class="apl-step__node" aria-hidden="true"><span class="apl-step__dot"></span></span>' +
          '<span class="apl-step__body"><span class="apl-step__eyebrow">Goal</span><span class="apl-step__text">' + esc2(goalText) + '</span></span>' +
          '<span class="apl-step__aside">' + CHEV + '</span>' +
        '</button>' +
        '<div class="apl-step__panel" id="aplS0" role="region"><div class="apl-step__panel-inner"></div></div>' +
      '</div>';

    const milestoneSteps = ladderPath.map((p, idx) => {
      const sid = 'aplS' + (idx + 1);
      const fields = fieldsFor(p);
      return '<div class="apl-step" data-step>' +
        '<button class="apl-step__head" type="button" aria-expanded="false" aria-controls="' + sid + '">' +
          '<span class="apl-step__node" aria-hidden="true"><span class="apl-step__dot"></span></span>' +
          '<span class="apl-step__body"><span class="apl-step__eyebrow">Milestone &middot; ' + esc2(p.horizon || 'Milestone') + '</span><span class="apl-step__text">' + esc2(p.milestone) + '</span></span>' +
          '<span class="apl-step__aside">' + CHEV + '</span>' +
        '</button>' +
        '<div class="apl-step__panel" id="' + sid + '" role="region"><div class="apl-step__panel-inner">' + fields + '</div></div>' +
      '</div>';
    }).join('');

    const todayFields = (function () {
      const rows = [];
      if (howToStart) rows.push('<div class="apl-field"><div class="apl-field__label">How to start</div><div class="apl-field__val">' + esc2(howToStart) + '</div></div>');
      return rows.length ? '<div class="apl-fields">' + rows.join('') + '</div>' : '';
    })();
    const todayStep =
      '<div class="apl-step apl-step--today is-open" data-step>' +
        '<button class="apl-step__head" type="button" aria-expanded="true" aria-controls="aplStoday">' +
          '<span class="apl-step__node" aria-hidden="true"><span class="apl-step__dot"></span></span>' +
          '<span class="apl-step__body"><span class="apl-step__eyebrow">Today</span><span class="apl-step__text">' + esc2(moveText) + '</span></span>' +
          '<span class="apl-step__aside">' + CHEV + '</span>' +
        '</button>' +
        '<div class="apl-step__panel" id="aplStoday" role="region"><div class="apl-step__panel-inner">' + todayFields + '</div></div>' +
      '</div>';

    const pathHtml =
      '<section class="apl-card apl-path-wrap" aria-labelledby="aplPathLabel"><div class="apl-path">' +
        '<div class="apl-path__head"><span class="apl-label" id="aplPathLabel">Your path</span><span class="apl-path__sub">From today to your goal</span></div>' +
        '<div class="apl-stepper" id="aplStepper">' + goalStep + milestoneSteps + todayStep + '</div>' +
      '</div></section>';

    // ===== 4. footer links =====
    const footHtml =
      '<div class="apl-foot">' +
        '<button class="apl-foot__link" type="button" id="aplProof">Proof trail <b>' + doneCount + ' done</b></button>' +
      '</div>';

    // ===== 5. RIGHT RAIL (real data only) =====
    const FOCUS_DOTS = 6;
    const focusDots = Array.from({ length: FOCUS_DOTS }, (_, i) => '<span class="apl-dot' + (i < focusToday ? ' is-on' : '') + '"></span>').join('');
    const focusCard =
      '<section class="apl-rcard apl-card" aria-label="Focus today">' +
        '<div class="apl-rcard__head"><span class="apl-label">Focus today</span></div>' +
        (sessions.length
          ? ('<div class="apl-rcard__big apl-num">' + focusToday + '<small>' + (focusToday === 1 ? 'session' : 'sessions') + '</small></div>' +
             '<div class="apl-dots" aria-hidden="true">' + focusDots + '</div>' +
             '<div class="apl-rcard__sub">All time <b>' + esc2(focusTotalLabel) + '</b> of deep work</div>')
          : '<div class="apl-rempty">No focus sessions yet. Start one and it shows up here.</div>') +
      '</section>';

    const progressCard =
      '<section class="apl-rcard apl-card" aria-label="Progress">' +
        '<div class="apl-rcard__head"><span class="apl-label">' + (daysLeft != null ? 'Time left' : 'Consistency') + '</span></div>' +
        (daysLeft != null
          ? ('<div class="apl-rcard__big apl-num">' + daysLeft + '<small>' + (daysLeft === 1 ? 'day to your goal' : 'days to your goal') + '</small></div>' +
             '<div class="apl-rcard__sub">Streak <b>' + streakCount + (streakCount === 1 ? ' day' : ' days') + '</b></div>')
          : (streakCount > 0
              ? ('<div class="apl-rcard__big apl-num">' + streakCount + '<small>' + (streakCount === 1 ? 'day streak' : 'day streak') + '</small></div>' +
                 '<div class="apl-rcard__sub">Days you have shown up in a row.</div>')
              : '<div class="apl-rempty">Show up today and your streak starts here.</div>')) +
      '</section>';

    const reflCard =
      '<section class="apl-rcard apl-card" aria-label="Notes">' +
        '<div class="apl-rcard__head"><span class="apl-label">Notes</span></div>' +
        (lastRefl && lastRefl.text
          ? ('<div class="apl-refl__date">' + esc2(lastRefl.date || '') + '</div><p class="apl-refl__text">' + esc2(lastRefl.text) + '</p>')
          : '<div class="apl-rempty">No reflections yet. A line a day adds up.</div>') +
        '<button class="apl-rlink" type="button" id="aplNewRefl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>New entry</button>' +
      '</section>';

    inst.pageWrap.innerHTML =
      '<div class="action-plan-page apl-screen">' + ACTION_WHITE_RAYS + '<div class="apl-wrap">' +
        '<header class="apl-head"><div class="apl-head__title"><span class="apl-head__dot"></span>Action</div><div class="apl-head__date apl-num">' + esc2(dateStr) + '</div></header>' +
        '<div class="apl-main">' + todayHtml + pathHtml + footHtml + '</div>' +
        '<div class="apl-rail">' + focusCard + progressCard + reflCard + '</div>' +
      '</div></div>';

    // ===== wiring =====
    // Intensity selector: set recommendedTier + persist, then re-render.
    const selectTier = (k) => {
      if (TIER_KEYS.indexOf(k) < 0) return;
      if (!state.action.primaryAction) state.action.primaryAction = {};
      if (state.action.primaryAction.recommendedTier !== k) {
        state.action.primaryAction.recommendedTier = k;
        state.action.selectedTier = k;
        try { state.action.refine = { messages: [], refinedText: '', refinedForTier: '' }; } catch (_) {}
        try { persistNow(); } catch (_) {}
      }
      inst.renderActionPlan();
    };
    inst.pageWrap.querySelectorAll('#aplSeg .apl-seg__btn').forEach(b => {
      b.addEventListener('click', (e) => { e.stopPropagation(); selectTier(b.getAttribute('data-tier')); });
    });

    // Path stepper accordion (independent toggles).
    const stepper = inst.pageWrap.querySelector('#aplStepper');
    if (stepper) {
      stepper.addEventListener('click', (e) => {
        const head = e.target.closest('.apl-step__head');
        if (!head) return;
        const step = head.closest('[data-step]');
        if (!step) return;
        const open = step.classList.toggle('is-open');
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // Done today: record completion + proof event, credit streak, refresh.
    const creditToday = () => {
      const pa3 = state.action.primaryAction || {};
      const tier = pa3.recommendedTier || 'moderate';
      const actionText = (pa3.tiers && pa3.tiers[tier]) || pa3.howToStart || pa3.title || '';
      if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
      state.action.completionHistory.push({ date: new Date().toISOString(), tier, actionText, planTitle: pa3.title || '' });
      try { writeProofEvent('action-complete', { title: actionText || pa3.title || 'Action completed', module: 'action', metadata: { tier } }); } catch (_) {}
      if (typeof recalculateStreak === 'function') { try { recalculateStreak(); } catch (_) {} }
      try { persistNow(); } catch (_) {}
      if (typeof refreshActionSurface === 'function') { try { refreshActionSurface(); } catch (_) {} }
      if (typeof TabBar !== 'undefined' && TabBar.updateHomeDot) { try { TabBar.updateHomeDot(); } catch (_) {} }
      try { if (typeof ProofTrail !== 'undefined' && ProofTrail.flash) ProofTrail.flash(); } catch (_) {}
      try { if (typeof promptTomorrowPlan === 'function') promptTomorrowPlan(); } catch (_) {}
    };
    const onMarkDone = (e) => {
      if (e) e.stopPropagation();
      const doneNow = (function () {
        const h = state.action.completionHistory;
        if (!Array.isArray(h) || !h.length) return false;
        const last = h[h.length - 1];
        return !!(last && last.date && isoToLocalDay(last.date) === todayStr);
      })();
      if (doneNow) return;
      try { celebrateDone(inst.pageWrap.querySelector('#aplMarkDone')); } catch (_) {}
      creditToday();
      inst.renderActionPlan();
    };
    const doneBtn = inst.pageWrap.querySelector('#aplMarkDone');
    if (doneBtn) doneBtn.addEventListener('click', onMarkDone);

    // Refine / evening check-in: open the existing refine flow.
    const refineBtn = inst.pageWrap.querySelector('#aplRefine');
    if (refineBtn) refineBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      inst._openRefineFromLadder();
    });

    // v23 "Focus on this": Deep Work folded into Action. Opens the existing
    // deep-work sheet (z-index above this experience), prefills the intention
    // with today's move, and enters the full-screen focus overlay. Sessions
    // log to state.deepwork.sessions exactly as before.
    const focusBtn = inst.pageWrap.querySelector('#aplFocus');
    if (focusBtn) focusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        // Skip the one-time module intro flash; the focus session IS the intro.
        if (state.introsSeen && !state.introsSeen.deepwork) { state.introsSeen.deepwork = true; try { persistNow(); } catch (_) {} }
        if (typeof Sheet === 'undefined' || !Sheet.open) return;
        Sheet.open('deepwork');
        setTimeout(() => {
          try {
            const body = Sheet.body;
            if (!body) return;
            const inp = body.querySelector('#dwIntention');
            if (inp && (moveText || title)) inp.value = moveText || title;
            const fb = body.querySelector('#dwFocus');
            if (fb) fb.click();
          } catch (_) {}
        }, 60);
      } catch (_) {}
    });

    // Footer + rail links -> existing sheets (real, no fabrication).
    const onTap = (sel, fn) => { const el = inst.pageWrap.querySelector(sel); if (el) el.addEventListener('click', (e) => { e.stopPropagation(); try { fn(); } catch (_) {} }); };
    onTap('#aplProof', () => { if (typeof ProofTrail !== 'undefined' && ProofTrail.open) ProofTrail.open(); });
    onTap('#aplNewRefl', () => { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection'); });
  },

  // Open the legacy refine sheet without leaving the ladder screen. We build a
  // detached refine host using the existing renderPlan refine markup is complex;
  // for this phase we open the deepwork sheet as a graceful entry if no refine
  // sheet is reachable. The refine flow itself is wired in renderPlan().
  _openRefineFromLadder() {
    // Prefer the proper refine sheet if one is already in the DOM (e.g. a prior
    // renderPlan left it). Otherwise open Reflection, the real end-of-day
    // check-in surface (the old fallback wrongly opened the Deep Work timer).
    const existing = document.querySelector('#actionRefineSheet');
    if (existing) {
      try {
        existing.setAttribute('aria-hidden', 'false');
        const input = existing.querySelector('#actionRefineInput');
        if (input) setTimeout(() => { try { input.focus(); } catch (_) {} }, 280);
        return;
      } catch (_) {}
    }
    try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection'); } catch (_) {}
  },

  // One-time stylesheet for the vine view (namespaced vp-* so nothing collides).
  _injectVineStyles() {
    if (document.getElementById('vpStyles')) return;
    const s = document.createElement('style');
    s.id = 'vpStyles';
    s.textContent =
      '.vp-stage{position:fixed;inset:0;pointer-events:none;z-index:1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;background:#04040a;}' +
      '#vpViz{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}' +
      '#vpStar{position:absolute;transform:translate(-50%,-50%);pointer-events:none;border-radius:50%;}' +
      '.vp-today-ring{fill:none;stroke:rgba(var(--ink),0.28);stroke-width:1.2;transform-box:fill-box;transform-origin:center;animation:vp-ping 3.4s ease-out 0.5s infinite;}' +
      '@keyframes vp-ping{0%{transform:scale(0.4);opacity:0.5;}100%{transform:scale(4.5);opacity:0;}}' +
      '.vp-ov{position:absolute;opacity:0;transition:opacity 0.7s ease;pointer-events:none;}' +
      '.vp-stage.revealed .vp-ov{opacity:1;}' +
      '.vp-today-card{width:270px;max-width:78vw;transform:translate(-6px,calc(-100% - 24px));background:var(--glass-bg-strong);border:1px solid var(--glass-border);border-radius:calc(16px * var(--rx, 1));padding:16px 16px 14px;pointer-events:auto;-webkit-backdrop-filter:var(--glass-blur);backdrop-filter:var(--glass-blur);box-shadow:var(--glass-shadow),var(--glass-highlight);}' +
      '.vp-eyebrow{font-size:10px;letter-spacing:1.6px;font-weight:700;color:rgba(130,165,255,0.9);margin-bottom:7px;}' +
      '.vp-title{font-size:17px;line-height:1.25;font-weight:600;color:#f1f3f8;margin-bottom:13px;}' +
      '.vp-chips{display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap;}' +
      '.vp-chip{font:inherit;font-size:11px;font-weight:600;cursor:pointer;padding:5px 9px;border-radius:var(--pill-r);background:var(--glass-bg);color:rgba(220,226,238,0.62);border:1px solid var(--glass-border);box-shadow:var(--glass-highlight);transition:all 0.15s ease;}' +
      '.vp-chip--on{background:rgba(90,130,255,0.22);color:#dce6ff;border-color:rgba(120,160,255,0.55);}' +
      '.vp-how{font-size:12px;line-height:1.4;color:rgba(200,206,220,0.6);margin-bottom:14px;}' +
      '.vp-shrink{display:block;width:100%;font:inherit;font-size:11.5px;font-weight:600;cursor:pointer;padding:7px;margin-bottom:8px;border-radius:calc(9px * var(--rx, 1));background:transparent;color:rgba(150,175,255,0.85);border:1px dashed rgba(120,160,255,0.35);transition:all 0.15s ease;}' +
      '.vp-shrink:hover{background:rgba(90,130,255,0.12);color:#cfe0ff;}' +
      '.vp-done{width:100%;font:inherit;font-size:13px;font-weight:650;cursor:pointer;padding:11px;border-radius:calc(11px * var(--rx, 1));color:#07101f;background:linear-gradient(180deg,#9fc0ff,#6f9bff);border:none;letter-spacing:0.2px;transition:all 0.2s ease;}' +
      '.vp-done--done{background:var(--glass-bg);color:rgba(180,220,190,0.95);box-shadow:var(--glass-highlight),inset 0 0 0 1px rgba(140,220,170,0.4);}' +
      '.vp-mile{position:absolute;transform:translate(-50%,-50%);}' +
      '.vp-mile-node{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:#cfe0ff;box-shadow:0 0 7px rgba(140,170,255,0.7);}' +
      '.vp-mile-conn{position:absolute;left:0;top:-58px;width:0;height:50px;border-left:1px dashed rgba(150,175,255,0.5);opacity:0;transition:opacity 0.25s ease;}' +
      '.vp-mile-cap{position:absolute;left:0;top:-88px;transform:translateX(-50%);text-align:center;white-space:nowrap;opacity:0;transition:opacity 0.25s ease;}' +
      '.vp-mile:hover .vp-mile-conn,.vp-mile.vp-on .vp-mile-conn,.vp-mile:hover .vp-mile-cap,.vp-mile.vp-on .vp-mile-cap{opacity:1;}' +
      '.vp-mile-hit{position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;pointer-events:auto;cursor:pointer;}' +
      '.vp-mile--down .vp-mile-conn{top:8px;}' +
      '.vp-mile--down .vp-mile-cap{top:60px;}' +
      '.vp-mile-h{display:block;font-size:9px;letter-spacing:1.4px;font-weight:700;color:rgba(140,170,255,0.92);}' +
      '.vp-mile-t{display:block;font-size:11px;color:rgba(232,236,246,0.82);margin-top:2px;}' +
      '.vp-goal-detail{position:absolute;transform:translateX(-50%);text-align:center;opacity:0;transition:opacity 0.3s ease;pointer-events:none;}' +
      '.vp-goal-detail.vp-shown{opacity:1;}' +
      '#vpStarHit{position:absolute;transform:translate(-50%,-50%);border-radius:50%;pointer-events:auto;cursor:pointer;}' +
      '.vp-gd-eyebrow{font-size:11px;letter-spacing:1.4px;font-weight:700;color:rgba(155,205,255,0.9);}' +
      '.vp-gd-title{font-size:17px;font-weight:700;color:#eef3ff;margin-top:4px;}' +
      '.vp-gd-sub{font-size:12px;color:rgba(180,200,235,0.62);margin-top:2px;}' +
      '.vp-gd-ns{font-size:8px;letter-spacing:2px;font-weight:600;color:rgba(100,155,255,0.4);margin-top:8px;}' +
      '.vp-modeswitch{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:30;display:flex;gap:4px;background:rgba(13,15,22,0.72);border:1px solid rgba(var(--ink),0.1);border-radius:999px;padding:4px;pointer-events:auto;}' +
      '.vp-modeswitch__btn{font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:6px 14px;border-radius:999px;background:transparent;color:rgba(220,226,238,0.6);border:none;transition:all 0.15s ease;}' +
      '.vp-modeswitch__btn.on{background:rgba(90,130,255,0.25);color:#eaf0ff;}';
    document.head.appendChild(s);
  },

  // The vine / path view. Ports the standalone mock, wired to real state.
  renderVinePlan() {
    const inst = this;
    const version = inst._vineVer = (inst._vineVer || 0) + 1;
    if (inst.navEl) inst.navEl.innerHTML = '';
    inst._injectVineStyles();

    const NS = 'http://www.w3.org/2000/svg';
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const lite = document.body.classList.contains('lite');
    function mkRand(seed) {
      let s = seed >>> 0;
      return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    }

    // ----- real data -----
    const pa = state.action.primaryAction || {};
    const refine = state.action.refine || {};
    const TIER_KEYS = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    const TIER_LABELS = { tiny: 'Small', light: 'Simple', moderate: 'Medium', heavy: 'Heavy', extreme: 'Extreme' };
    const tierText = (tier) => (refine.refinedText && refine.refinedForTier === tier) ? refine.refinedText : ((pa.tiers && pa.tiers[tier]) || pa.title || '');
    let curTier = TIER_KEYS.indexOf(state.action.selectedTier) >= 0 ? state.action.selectedTier : (TIER_KEYS.indexOf(pa.recommendedTier) >= 0 ? pa.recommendedTier : 'moderate');
    const howTo = pa.howToStart || '';
    const ans = state.clarity.answers || {};
    const goalText = ans.neutronStar || 'Your goal';
    const deadline = ans.timeHorizon || ans.timeframe || '';
    const vinePath = (Array.isArray(pa.path) ? pa.path.slice() : []).reverse().filter(p => p && p.milestone).slice(0, 4);
    const todayStr = getTodayISO();
    const completedToday = (function () { const h = state.action.completionHistory; if (!Array.isArray(h) || !h.length) return false; const last = h[h.length - 1]; return !!(last && last.date && isoToLocalDay(last.date) === todayStr); })();

    // ----- scaffold -----
    const TIER_HINTS = { tiny: 'The smallest possible version', light: 'Small but meaningful', moderate: 'A realistic day of work', heavy: 'A serious push', extreme: 'All-in for the day' };
    const chipsHtml = TIER_KEYS.map(k => '<button class="vp-chip' + (k === curTier ? ' vp-chip--on' : '') + '" data-tier="' + k + '" title="' + esc(TIER_HINTS[k] || '') + '" aria-label="' + esc(TIER_LABELS[k] + ': ' + (TIER_HINTS[k] || '')) + '">' + TIER_LABELS[k] + '</button>').join('');
    inst.pageWrap.innerHTML =
      '<div class="vp-stage" id="vpStage">' +
        '<svg id="vpViz"></svg><canvas id="vpStar"></canvas>' +
        '<div id="vpToday" class="vp-ov vp-today-card">' +
          '<div class="vp-eyebrow">TODAY\'S NEXT ACTION</div>' +
          '<div id="vpTitle" class="vp-title">' + esc(tierText(curTier) || '') + '</div>' +
          '<div class="vp-chips" id="vpChips" role="group" aria-label="How big is today\'s action?">' + chipsHtml + '</div>' +
          (howTo ? '<div class="vp-how">' + esc(howTo) + '</div>' : '') +
          '<button class="vp-shrink" id="vpShrink" type="button">Feels too big? Shrink it to the smallest version</button>' +
          '<button class="vp-done' + (completedToday ? ' vp-done--done' : '') + '" id="vpDone">' + (completedToday ? 'Done for today' : 'Mark it done') + '</button>' +
        '</div>' +
        '<div id="vpMilestones" class="vp-ov"></div>' +
        '<div id="vpGoal" class="vp-goal-detail">' +
          '<div class="vp-gd-eyebrow">CLEAR GOAL</div>' +
          '<div class="vp-gd-title">' + esc(goalText) + '</div>' +
          (deadline ? '<div class="vp-gd-sub">' + esc(deadline) + '</div>' : '') +
          '<div class="vp-gd-ns">YOUR NEUTRON STAR</div>' +
        '</div>' +
        '<div id="vpStarHit" role="button" tabindex="0" title="Tap to see your goal" aria-label="Tap to see your goal"></div>' +
      '</div>';

    const svg = inst.pageWrap.querySelector('#vpViz');
    const starCanvas = inst.pageWrap.querySelector('#vpStar');
    const vpStage = inst.pageWrap.querySelector('#vpStage');
    function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

    // chip + done wiring
    const titleEl = inst.pageWrap.querySelector('#vpTitle');
    // Stuck-Day Mode: one tap drops to the smallest (tiny) tier with no AI call
    // so a hard day still counts and the streak survives. Hidden once on tiny.
    const shrinkBtn = inst.pageWrap.querySelector('#vpShrink');
    const syncShrink = () => { if (shrinkBtn) shrinkBtn.style.display = (curTier === 'tiny') ? 'none' : 'block'; };
    const applyTier = (tier) => {
      curTier = tier;
      state.action.selectedTier = curTier; // remember the chosen tier across renders
      try { persistNow(); } catch (_) {}
      inst.pageWrap.querySelectorAll('#vpChips .vp-chip').forEach(c => c.classList.toggle('vp-chip--on', c.getAttribute('data-tier') === curTier));
      titleEl.textContent = tierText(curTier) || titleEl.textContent;
      syncShrink();
    };
    syncShrink();
    if (shrinkBtn) shrinkBtn.addEventListener('click', (e) => { e.stopPropagation(); applyTier('tiny'); });
    inst.pageWrap.querySelectorAll('#vpChips .vp-chip').forEach(ch => {
      ch.addEventListener('click', (e) => { e.stopPropagation(); applyTier(ch.getAttribute('data-tier')); });
    });
    const doneBtn = inst.pageWrap.querySelector('#vpDone');
    // Record a completion, credit it to the streak (recalculateStreak reads
    // completionHistory now), refresh the dashboard surface, then reveal a
    // working Get next step so the daily plan does not freeze after one tap.
    const vpCreditToday = () => {
      const actionText = tierText(curTier);
      if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
      state.action.completionHistory.push({ date: new Date().toISOString(), tier: curTier, actionText, planTitle: pa.title || '' });
      try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier: curTier } }); } catch (_) {}
      if (typeof recalculateStreak === 'function') recalculateStreak();
      try { persistNow(); } catch (_) {}
      if (typeof refreshActionSurface === 'function') { try { refreshActionSurface(); } catch (_) {} }
      if (typeof TabBar !== 'undefined' && TabBar.updateHomeDot) { try { TabBar.updateHomeDot(); } catch (_) {} }
      try { if (typeof promptTomorrowPlan === 'function') promptTomorrowPlan(); } catch (_) {}
    };
    const vpRevealNext = () => {
      if (inst.pageWrap.querySelector('#vpNext')) return;
      const nb = document.createElement('button');
      nb.className = 'vp-done'; nb.id = 'vpNext'; nb.style.marginTop = '8px';
      nb.style.background = 'var(--kfill-06)'; nb.style.color = '#dce6ff';
      nb.style.boxShadow = 'inset 0 0 0 1px rgba(120,160,255,0.4)';
      nb.textContent = 'Get next step';
      doneBtn.insertAdjacentElement('afterend', nb);
      nb.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (nb.disabled) return;
        nb.disabled = true; nb.textContent = 'Thinking...';
        try {
          if (typeof regenerateActionPlanForNextStep === 'function') await regenerateActionPlanForNextStep();
          inst.renderVinePlan();
        } catch (err) { console.error('vine next-step failed', err); nb.textContent = 'Try again'; nb.disabled = false; }
      });
    };
    doneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Atomic guard: a rapid double tap can fire two clicks in the same tick
      // before the class lands, double-logging the action. The disabled flag is
      // set synchronously first so the second click is a no-op.
      if (doneBtn.disabled || doneBtn.classList.contains('vp-done--done')) return;
      doneBtn.disabled = true;
      doneBtn.classList.add('vp-done--done');
      doneBtn.textContent = 'Done for today';
      vpCreditToday();
      vpRevealNext();
      try { if (typeof ProofTrail !== 'undefined' && ProofTrail.flash) ProofTrail.flash(); } catch (_) {}
    });
    if (completedToday) vpRevealNext();

    // ----- generative path -----
    const FR = mkRand((Math.random() * 4294967296) >>> 0);
    const W = window.innerWidth, H = window.innerHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const OX = Math.round(W * 0.10), OY = Math.round(H * 0.50);
    const SX = Math.round(W * 0.88), SY = Math.round(H * 0.50);
    const DX = OX - Math.round(W * 0.028);
    const cSize = Math.min(130, W * 0.13);
    const mobile = W < 700;

    const defs = svgEl('defs', {}, svg);
    const vig = svgEl('radialGradient', { id: 'vpvig', cx: '50%', cy: '50%', r: '50%' }, defs);
    svgEl('stop', { offset: '62%', 'stop-color': 'rgba(0,0,0,0)' }, vig);
    svgEl('stop', { offset: '100%', 'stop-color': 'rgba(0,0,0,0.32)' }, vig);
    const tgr = svgEl('radialGradient', { id: 'vptgr', cx: '50%', cy: '50%', r: '50%' }, defs);
    svgEl('stop', { offset: '0%', 'stop-color': 'rgba(var(--ink),0.14)' }, tgr);
    svgEl('stop', { offset: '100%', 'stop-color': 'rgba(var(--ink),0)' }, tgr);
    const mainFade = svgEl('linearGradient', { id: 'vpMainFade', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '1' }, mainFade);
    svgEl('stop', { offset: '0.55', 'stop-color': '#fff', 'stop-opacity': '0.7' }, mainFade);
    svgEl('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0.32' }, mainFade);
    const childFade = svgEl('linearGradient', { id: 'vpChildFade', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0' }, childFade);
    svgEl('stop', { offset: '0.16', 'stop-color': '#fff', 'stop-opacity': '1' }, childFade);
    svgEl('stop', { offset: '0.6', 'stop-color': '#fff', 'stop-opacity': '0.7' }, childFade);
    svgEl('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0.32' }, childFade);

    svgEl('rect', { width: W, height: H, fill: '#04040a' }, svg);
    const pathsG = svgEl('g', { opacity: '0.5' }, svg);

    function smooth(pts) {
      let d = 'M ' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
      for (let k = 0; k < pts.length - 1; k++) {
        const p0 = pts[Math.max(k - 1, 0)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(k + 2, pts.length - 1)];
        const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += ' C ' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
      }
      return d;
    }

    const simplex = (function () {
      const p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) p[i] = i;
      for (let i = 255; i > 0; i--) { const j = (FR() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t; }
      const perm = new Uint8Array(512);
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
      const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
      return function (xin, yin) {
        const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
        const t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
        let i1, j1; if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        const ii = i & 255, jj = j & 255;
        const gi0 = perm[ii + perm[jj]] & 7, gi1 = perm[ii + i1 + perm[jj + j1]] & 7, gi2 = perm[ii + 1 + perm[jj + 1]] & 7;
        let n0 = 0, n1 = 0, n2 = 0, t0 = 0.5 - x0 * x0 - y0 * y0, t1 = 0.5 - x1 * x1 - y1 * y1, t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (g[gi0][0] * x0 + g[gi0][1] * y0); }
        if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (g[gi1][0] * x1 + g[gi1][1] * y1); }
        if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (g[gi2][0] * x2 + g[gi2][1] * y2); }
        return 70 * (n0 + n1 + n2);
      };
    })();

    const NOISE_SCALE = 0.0021, NOISE_SPREAD = 0.92, STEER = 0.78;
    const stepLen = Math.max(2.4, W * 0.0024);
    const MAXSTEPS = Math.ceil(W * 1.25 / stepLen) + 20;
    const STRAND_CAP = lite ? 360 : 840;
    const SEEDS = lite ? 26 : 46;
    let strandCount = 0;
    const pathEls = [];

    function fieldAngle(x, y, targetY, phx, phy) {
      const n = simplex(x * NOISE_SCALE + phx, y * NOISE_SCALE + phy);
      const steer = clamp((targetY - y) / H, -0.5, 0.5) * STEER;
      return clamp(n * NOISE_SPREAD + steer, -1.4, 1.4);
    }
    function renderStrand(pts, op, sw, isChild) {
      if (pts.length < 3) return;
      const strokeAttrs = isChild ? { stroke: 'url(#vpChildFade)', 'stroke-opacity': op.toFixed(3) } : { stroke: 'url(#vpMainFade)', 'stroke-opacity': op.toFixed(3) };
      const el = svgEl('path', Object.assign({ d: smooth(pts), fill: 'none', 'stroke-width': sw.toFixed(2), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, strokeAttrs), pathsG);
      const entry = { el, pts, amp: H * (0.0014 + FR() * 0.0026), freq: 0.07 + FR() * 0.13, phase: FR() * 6.283, wav: 1.5 + FR() * 3.0, parent: null, forkIdx: 0, swept: pts };
      pathEls.push(entry);
      return entry;
    }
    function tracePts(sx, sy, targetY, phx, phy, lenFrac, launch) {
      let x = sx, y = sy; const pts = [[x, y]]; const maxS = Math.floor(MAXSTEPS * lenFrac);
      for (let s = 0; s < maxS; s++) {
        let a = fieldAngle(x, y, targetY, phx, phy);
        if (launch) { const decay = Math.max(0, 1 - s / (maxS * 0.72)); a = a * (1 - decay) + launch * decay; }
        x += stepLen * Math.cos(a); y += stepLen * Math.sin(a);
        if (s % 3 === 0) pts.push([x, y]);
        if (x > W * 1.2 || x < -W * 0.05 || y < -H * 0.12 || y > H * 1.12) break;
      }
      pts.push([x, y]); return pts;
    }
    const MAX_DEPTH = 9;
    const queue = [];
    function processStrand(b) {
      if (strandCount >= STRAND_CAP) return;
      strandCount++;
      const targetY = OY + b.lane * (H * 0.82);
      const pts = tracePts(b.x, b.y, targetY, b.phx, b.phy, 1, b.launch);
      const op = b.op, sw = 1.5 + op * 1.95;
      const entry = renderStrand(pts, op, sw, b.depth > 0);
      if (!entry) return;
      entry.parent = b.parent || null; entry.forkIdx = b.forkIdx || 0;
      if (b.depth < MAX_DEPTH && pts.length > 10 && strandCount < STRAND_CAP) {
        const base = b.depth === 0 ? 0.92 : Math.max(0.34, 0.74 - b.depth * 0.045);
        let nch = 0;
        if (FR() < base) nch++;
        if (FR() < base * 0.62) nch++;
        if (FR() < base * 0.28) nch++;
        for (let c = 0; c < nch && strandCount < STRAND_CAP; c++) {
          const idx = Math.floor(pts.length * (0.15 + FR() * 0.68));
          const bp = pts[idx];
          const dir = FR() < 0.5 ? -1 : 1;
          queue.push({ x: bp[0], y: bp[1], lane: clamp(b.lane + dir * (0.12 + FR() * 0.32), -1.05, 1.05), phx: b.phx + (FR() - 0.5) * 2.4, phy: b.phy + (FR() - 0.5) * 2.4, depth: b.depth + 1, op: clamp(b.op * (0.72 + FR() * 0.5), 0.05, 0.6), parent: entry, forkIdx: idx });
        }
      }
    }
    for (let i = 0; i < SEEDS; i++) {
      const lane = (i / (SEEDS - 1)) * 2 - 1;
      const op = 0.1 + Math.pow(FR(), 1.7) * 0.46;
      const seed = { x: OX, y: OY, lane, phx: FR() * 200, phy: FR() * 200, depth: 0, op };
      if (Math.abs(lane) > 0.08) { seed.launch = lane * 1.28 + (FR() - 0.5) * 0.24; if (Math.abs(lane) > 0.5) seed.op = Math.max(seed.op, 0.18 + FR() * 0.24); }
      queue.push(seed);
    }
    while (queue.length && strandCount < STRAND_CAP) processStrand(queue.pop());

    svgEl('rect', { width: W, height: H, fill: 'url(#vpvig)' }, svg);

    // blue hero path
    const bpG = svgEl('g', {}, svg);
    const bSteps = 40, bWaves = 1.0, bAmp = H * 0.025;
    const bPts = [];
    for (let k = 0; k <= bSteps; k++) {
      const f = k / bSteps; const x = lerp(OX, SX, f); const env = Math.sin(Math.PI * f);
      bPts.push([x, OY + Math.sin(f * Math.PI * 2 * bWaves) * bAmp * env]);
    }
    const blueGlow = svgEl('path', { d: smooth(bPts), fill: 'none', stroke: 'rgba(120,160,255,0.14)', 'stroke-width': '4.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: 'filter:drop-shadow(0 0 6px rgba(120,160,255,0.45))' }, bpG);
    const blueLine = svgEl('path', { d: smooth(bPts), fill: 'none', stroke: 'rgba(160,185,255,0.62)', 'stroke-width': '3.1', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: 'filter:drop-shadow(0 0 3px rgba(140,170,255,0.5))' }, bpG);
    const blue = { glow: blueGlow, line: blueLine, base: bPts, amp: H * 0.009, freq: 0.35, phase: 1.2, wav: 2.0 };

    // TODAY stem + dot
    const stemEl = svgEl('path', { d: 'M ' + DX + ',' + OY + ' L ' + OX + ',' + OY, fill: 'none', stroke: 'rgba(var(--ink),0.8)', 'stroke-width': '2.6', 'stroke-linecap': 'round', style: 'filter:drop-shadow(0 0 3px rgba(var(--ink),0.45))' }, svg);
    const todayG = svgEl('g', {}, svg);
    svgEl('circle', { cx: DX, cy: OY, r: 55, fill: 'url(#vptgr)' }, todayG);
    svgEl('circle', { cx: DX, cy: OY, r: 8, class: 'vp-today-ring' }, todayG);
    svgEl('circle', { cx: DX, cy: OY, r: '5', fill: '#fff', style: 'filter:drop-shadow(0 0 8px rgba(var(--ink),0.95))' }, todayG);
    const tl = svgEl('text', { x: DX, y: OY + 24, 'text-anchor': 'middle', style: 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;font-size:11px;letter-spacing:2.2px;fill:rgba(var(--ink),0.42);font-weight:600' }, todayG);
    tl.textContent = 'TODAY';

    // star canvas + WebGL (reuse the app's initStarBlob; self-terminates on disconnect)
    starCanvas.style.width = cSize + 'px'; starCanvas.style.height = cSize + 'px';
    starCanvas.style.left = SX + 'px'; starCanvas.style.top = SY + 'px';
    if (typeof initStarBlob === 'function') { try { initStarBlob(starCanvas, 240); } catch (_) {} }

    // today card position
    const todayCard = inst.pageWrap.querySelector('#vpToday');
    if (mobile) { todayCard.style.left = '12px'; todayCard.style.top = '54px'; todayCard.style.transform = 'none'; }
    else { todayCard.style.left = DX + 'px'; todayCard.style.top = OY + 'px'; }

    // goal detail + star hit
    const goalDetail = inst.pageWrap.querySelector('#vpGoal');
    goalDetail.style.left = Math.min(SX, W - 72) + 'px';
    goalDetail.style.top = (SY + cSize * 0.5 + 16) + 'px';
    const starHit = inst.pageWrap.querySelector('#vpStarHit');
    starHit.style.left = SX + 'px'; starHit.style.top = SY + 'px'; starHit.style.width = cSize + 'px'; starHit.style.height = cSize + 'px';
    starHit.onmouseenter = () => goalDetail.classList.add('vp-shown');
    starHit.onmouseleave = () => goalDetail.classList.remove('vp-shown');
    starHit.onclick = () => goalDetail.classList.toggle('vp-shown');

    // milestone markers from the real plan path
    const milestonesEl = inst.pageWrap.querySelector('#vpMilestones');
    const msNodes = [];
    const nM = vinePath.length;
    vinePath.forEach((mp, i) => {
      const f = nM > 1 ? (0.26 + (0.74 - 0.26) * (i / (nM - 1))) : 0.5;
      const idx = clamp(Math.round(f * bSteps), 0, bPts.length - 1);
      const lab = document.createElement('div');
      lab.className = 'vp-mile' + (i % 2 === 1 ? ' vp-mile--down' : '');
      lab.style.left = bPts[idx][0] + 'px'; lab.style.top = bPts[idx][1] + 'px';
      lab.innerHTML = '<span class="vp-mile-cap"><span class="vp-mile-h">' + esc(mp.horizon || '') + '</span><span class="vp-mile-t">' + esc(mp.milestone || '') + '</span></span><i class="vp-mile-conn"></i><i class="vp-mile-node"></i><i class="vp-mile-hit" title="Tap to see this milestone"></i>';
      lab.querySelector('.vp-mile-hit').addEventListener('click', (e) => { e.stopPropagation(); lab.classList.toggle('vp-on'); });
      milestonesEl.appendChild(lab);
      msNodes.push({ el: lab, idx });
    });

    // drift loop (self-terminates when this build is superseded or detached)
    let tickStart = null;
    function tick(ms) {
      if (inst._vineVer !== version || !svg.isConnected) return;
      // Perf: stop the per-frame Bezier recompute + DOM writes while the tab is
      // backgrounded (the vine is invisible then). Keep one rAF alive so the
      // drift resumes on return. No-op while visible (document.hidden is false).
      if (document.hidden) { requestAnimationFrame(tick); return; }
      const t = ms * 0.001;
      if (tickStart === null) tickStart = ms;
      const gp = clamp((ms - tickStart) / 1500, 0, 1);
      const gain = gp * gp * (3 - 2 * gp);
      for (let i = 0; i < pathEls.length; i++) {
        const p = pathEls[i]; const base = p.pts, n = base.length;
        let ox = 0, oy = 0;
        if (p.parent) { const fi = Math.min(p.forkIdx, p.parent.swept.length - 1); ox = p.parent.swept[fi][0] - p.parent.pts[fi][0]; oy = p.parent.swept[fi][1] - p.parent.pts[fi][1]; }
        const swept = new Array(n);
        for (let k = 0; k < n; k++) {
          const prog = k / (n - 1);
          const dy = gain * p.amp * prog * Math.sin(t * p.freq + p.phase + prog * p.wav);
          const dx = gain * p.amp * prog * 0.4 * Math.cos(t * p.freq * 0.8 + p.phase);
          swept[k] = [base[k][0] + ox + dx, base[k][1] + oy + dy];
        }
        p.swept = swept; p.el.setAttribute('d', smooth(swept));
      }
      const b = blue, base = b.base, n = base.length, sw = new Array(n);
      for (let k = 0; k < n; k++) {
        const prog = k / (n - 1); const env = Math.sin(Math.PI * prog);
        const dy = gain * b.amp * env * Math.sin(t * b.freq + b.phase + prog * b.wav);
        const dx = gain * b.amp * env * 0.5 * Math.cos(t * b.freq * 0.9 + b.phase);
        sw[k] = [base[k][0] + dx, base[k][1] + dy];
      }
      const d = smooth(sw); b.glow.setAttribute('d', d); b.line.setAttribute('d', d);
      for (let j = 0; j < msNodes.length; j++) { const pt = sw[msNodes[j].idx]; msNodes[j].el.style.left = pt[0] + 'px'; msNodes[j].el.style.top = pt[1] + 'px'; }
      requestAnimationFrame(tick);
    }

    if (lite) {
      // low-power: show everything static (no per-frame drift), star still animates
      vpStage.classList.add('revealed');
      todayG.style.opacity = '1';
      starCanvas.style.opacity = '1';
    } else {
      const DRAW_SPEED = Math.max(W, H) * 0.0024;
      let maxEnd = 0;
      for (let i = 0; i < pathEls.length; i++) {
        const p = pathEls[i];
        p.len = p.el.getTotalLength();
        p.drawDur = Math.max(120, p.len / DRAW_SPEED);
        if (p.parent && p.parent.t0 != null) { const frac = clamp(p.forkIdx / Math.max(1, p.parent.pts.length - 1), 0, 1); p.t0 = p.parent.t0 + frac * p.parent.drawDur; }
        else p.t0 = 0;
        if (p.t0 + p.drawDur > maxEnd) maxEnd = p.t0 + p.drawDur;
        p.el.style.strokeDasharray = p.len; p.el.style.strokeDashoffset = p.len;
      }
      const REVEAL_MS = 2400;
      const scn = maxEnd > 0 ? REVEAL_MS / maxEnd : 1;
      for (let i = 0; i < pathEls.length; i++) { pathEls[i].t0 *= scn; pathEls[i].drawDur *= scn; }
      const stemLen = stemEl.getTotalLength();
      stemEl.style.strokeDasharray = stemEl.style.strokeDashoffset = stemLen;
      const blueLen = blueLine.getTotalLength();
      [blueGlow, blueLine].forEach(el => { el.style.strokeDasharray = blueLen; el.style.strokeDashoffset = blueLen; });
      todayG.style.opacity = '0';
      starCanvas.style.opacity = '0';
      let revealStart = null;
      function reveal(ms) {
        if (inst._vineVer !== version || !svg.isConnected) return;
        if (revealStart === null) revealStart = ms;
        const t = ms - revealStart;
        todayG.style.opacity = '' + clamp(t / 300, 0, 1);
        stemEl.style.strokeDashoffset = '' + (stemLen * (1 - clamp(t / 280, 0, 1)));
        let allDone = true;
        for (let i = 0; i < pathEls.length; i++) {
          const p = pathEls[i];
          const prog = clamp((t - 200 - p.t0) / p.drawDur, 0, 1);
          if (prog < 1) allDone = false;
          p.el.style.strokeDashoffset = '' + (p.len * (1 - prog));
        }
        const blueProg = clamp((t - 220) / (REVEAL_MS * 0.95), 0, 1);
        const bOff = '' + (blueLen * (1 - blueProg));
        blueGlow.style.strokeDashoffset = bOff; blueLine.style.strokeDashoffset = bOff;
        starCanvas.style.opacity = '' + clamp((t - REVEAL_MS * 0.68) / 600, 0, 1);
        if (!allDone || blueProg < 1) { requestAnimationFrame(reveal); }
        else {
          for (let i = 0; i < pathEls.length; i++) { pathEls[i].el.style.strokeDasharray = 'none'; pathEls[i].el.style.strokeDashoffset = '0'; }
          stemEl.style.strokeDasharray = 'none'; stemEl.style.strokeDashoffset = '0';
          [blueGlow, blueLine].forEach(el => { el.style.strokeDasharray = 'none'; el.style.strokeDashoffset = '0'; });
          vpStage.classList.add('revealed');
          requestAnimationFrame(tick);
        }
      }
      requestAnimationFrame(reveal);
    }

    // rebuild on resize (debounced) so orientation changes stay aligned
    if (inst._vineResize) window.removeEventListener('resize', inst._vineResize);
    inst._vineResize = () => {
      clearTimeout(inst._vineResizeT);
      inst._vineResizeT = setTimeout(() => {
        if (inst._vineVer === version && svg.isConnected && (state.action.viewMode !== 'mountain')) inst._renderPlanByMode();
      }, 240);
    };
    window.addEventListener('resize', inst._vineResize);
  },

  renderPlan() {
    const pa = state.action.primaryAction || { title: '', why: '', path: [], tiers: {}, recommendedTier: 'moderate', recommendedWhy: '', howToStart: '' };
    const MOUNTAIN_QUOTES = [
      "The magic you're looking for is in the work you're avoiding.",
      "Consistency beats intensity. Show up small, show up daily.",
      "Discipline is choosing what you want most over what you want now.",
      "You don't rise to the level of your goals. You fall to the level of your systems.",
      "Action is the antidote to anxiety.",
      "The cave you fear to enter holds the treasure you seek.",
      "Small steps every day beat giant leaps once a month.",
      "You don't have to be great to start. You have to start to be great.",
      "Motion creates emotion. Sit still and you'll feel stuck.",
      "Don't count the days. Make the days count.",
      "The hardest part is starting. Everything after is easier than you think.",
      "You're one decision away from a different life.",
      "Done is better than perfect. Repeated is better than impressive.",
      "If it doesn't challenge you, it won't change you.",
      "The only way out is through.",
      "Progress, not perfection. Reps, not results.",
      "Your future is built in the boring hours nobody sees.",
      "Show up on the days you don't feel like it. That's where the gap closes.",
      "Talent is patience disguised as effort.",
      "The work works if you work it."
    ];
    const fp = state.action.focusPlan || { frame: '', frictionRemove: [], frictionAdd: [] };
    this.navEl.innerHTML = '';

    const refreshIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
    const pencilIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
    const chevronRight = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>`;

    const removeBullets = (fp.frictionRemove || []).map(s => `<li>${esc(s)}</li>`).join('');
    const addBullets = (fp.frictionAdd || []).map(s => `<li>${esc(s)}</li>`).join('');

    // Round 10: header + funnel + today block.
    const neutronStar = state.clarity.answers.neutronStar || '';
    const timeframe = state.clarity.answers.timeframe || ' - ';
    const tfChips = ['1 month', '3 months', '6 months', '1 year', '2 years', '5 years', 'Lifelong'];
    const tfEditorHtml = actionTimeframeEditing ? `
      <div class="action-plan__when-edit" id="actionPlanTfChips">
        ${tfChips.map(c => `<button class="action-plan__when-chip ${c === timeframe ? 'action-plan__when-chip--active' : ''}" data-tf="${esc(c)}" type="button">${esc(c)}</button>`).join('')}
        <input class="wiz__text-input action-plan__when-custom" id="actionPlanTfCustom" type="text" placeholder="Custom (e.g. 18 months)" style="min-width:160px;flex:1;padding:6px 10px;font-size:0.8rem;">
      </div>
    ` : '';
    const staleBanner = actionPlanStale ? `
      <div class="action-plan__stale">
        Timeframe changed. <button class="action-plan__stale-btn" id="actionPlanRegen" type="button">Regenerate plan</button>
      </div>
    ` : '';

    // Mountain image is now embedded INSIDE the SVG (preserveAspectRatio
    // xMidYMid slice), so path + nodes + image share the image's natural
    // 1540x1021 coordinate space and stay locked together at every aspect.
    const stepCount = Array.isArray(pa.path) ? pa.path.length : 0;
    const journeyHeight = stepCount > 0 ? Math.max(800, stepCount * 140 + 250) : 0;

    // ViewBox matches the v15 "okay use this mountain" render (1920x1280).
    const VBW = 1920;
    const VBH = 1280;
    // Peak coords from Malik's red-dot mark at the visible summit. Source
    // was 6144x4096; red dot center at (3073.9, 1103.9) -> (0.5003, 0.2695).
    // Dot is removed in the embedded image but its coords drive .js-peak
    // placement so the flag lands on the visible peak.
    const PEAK_FX = 0.5003, PEAK_FY = 0.2695;
    const totalPts = stepCount + 2; // today + milestones + peak
    const positions = [];

    // Generate positions parametrically so the layout stays consistent
    // regardless of how many milestones the AI returned. Each point sits at
    // an even fraction of the climb from start (bottom) to summit (top),
    // with X alternating left/right of a center line that drifts toward the
    // peak. The switchback spread also narrows as we climb, so upper dots
    // never wander off the mountain silhouette as it tapers to the summit.
    const Y_START = 0.78;     // today node lands here
    const Y_END   = PEAK_FY;  // last point IS the summit
    const BASE_SPREAD = 0.08; // half-width at the foot of the mountain
    const TIP_SPREAD  = 0.025; // half-width near the summit
    const X_START = 0.50;     // today node centered horizontally
    for (let i = 0; i < totalPts; i++) {
      const t = i / (totalPts - 1);
      const y = Y_START + (Y_END - Y_START) * t;
      let x;
      if (i === 0) {
        x = X_START;
      } else if (i === totalPts - 1) {
        x = PEAK_FX;
      } else {
        // Center line drifts from the start X toward the peak X as we climb.
        const xCenter = X_START + (PEAK_FX - X_START) * t;
        // Half-width shrinks linearly so the upper switchbacks tuck under
        // the narrowing silhouette of the peak.
        const spread  = BASE_SPREAD * (1 - t) + TIP_SPREAD * t;
        x = xCenter + ((i % 2 === 1) ? spread : -spread);
      }
      positions.push({ x: x * VBW, y: y * VBH });
    }
    // The path itself is drawn through the same positions, so dots always
    // sit exactly on the trail's curve (Catmull-Rom smooths it).
    const densePathPts = positions.slice();

    // Smooth Catmull-Rom curve through the waypoints, then injected with
    // small perpendicular jitter between each pair of waypoints so the path
    // reads as hand-traced instead of mechanically perfect. The jitter is
    // deterministic (seeded by waypoint index) so the path is identical on
    // every render - same goal, same plan, same trail.
    const smoothPath = (pts) => {
      if (pts.length < 2) return '';
      // Build a denser sequence of points with perpendicular jitter between
      // each pair. The original waypoints stay locked - milestone dots sit
      // on them - and we only displace the in-between sub-points.
      const SUBDIVS = 5;          // sub-points between each pair of waypoints
      const JITTER_AMP = 14;      // viewBox units of max perpendicular offset
      const denser = [];
      const seeded = (i, j) => {
        // Deterministic [-1, 1] pseudo-noise based on indices.
        const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
        return (x - Math.floor(x)) * 2 - 1;
      };
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        denser.push(a);
        const dx = b.x - a.x, dy = b.y - a.y;
        const segLen = Math.hypot(dx, dy);
        if (segLen < 1) continue;
        // Unit perpendicular vector to this segment.
        const px = -dy / segLen, py = dx / segLen;
        // Local jitter scale tapers off near each anchor so the curve still
        // visibly passes through the waypoints without a kink.
        for (let j = 1; j < SUBDIVS; j++) {
          const t = j / SUBDIVS;
          const taper = Math.sin(t * Math.PI); // 0 at endpoints, 1 at middle
          const offset = seeded(i, j) * JITTER_AMP * taper;
          denser.push({
            x: a.x + dx * t + px * offset,
            y: a.y + dy * t + py * offset,
          });
        }
      }
      denser.push(pts[pts.length - 1]);
      // Catmull-Rom through the denser point set.
      let d = `M ${denser[0].x.toFixed(1)} ${denser[0].y.toFixed(1)}`;
      for (let i = 0; i < denser.length - 1; i++) {
        const p0 = denser[i - 1] || denser[i];
        const p1 = denser[i];
        const p2 = denser[i + 1];
        const p3 = denser[i + 2] || denser[i + 1];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    };
    const ascentD = smoothPath(densePathPts);

    // Convert viewBox coords to percentages for HTML overlays (nodes + cards)
    const pctX = (x) => (x / VBW * 100).toFixed(2);
    const pctY = (y) => (y / VBH * 100).toFixed(2);

    const refine = state.action.refine || { refinedText: '', refinedForTier: '' };
    const baseTodayText = (pa.tiers && pa.recommendedTier && pa.tiers[pa.recommendedTier]) || pa.howToStart || 'Start the chain';
    const todayText = (refine.refinedText && refine.refinedForTier === pa.recommendedTier) ? refine.refinedText : baseTodayText;
    const todayPos = positions[0];
    const peakPos = positions[totalPts - 1];

    // TODAY node - green, glowing, and clickable. Tapping expands a card with
    // today's action (the recommended tier text + Mark Complete button).
    // Sits EXACTLY at the path's start point so it visually anchors the trail.
    const recTier = (pa.recommendedTier || 'moderate');
    const TIER_LABELS = { tiny: 'Small', light: 'Simple', moderate: 'Medium', heavy: 'Heavy', extreme: 'Extreme' };
    const recTierLabel = TIER_LABELS[recTier] || recTier;
    // First-time hint: show a "Tap to start" label next to the green dot
    // until the user has opened it once. Hides after first interaction.
    const hintSeen = !!(state.action && state.action.todayHintSeen);
    const todayHintHtml = hintSeen ? '' : `
      <div class="js-today-hint" aria-hidden="true">
        <span class="js-today-hint__text">Tap here</span>
      </div>`;
    const todayNodeHtml = `
      <div class="js-node js-node--today js-node--clickable${hintSeen ? '' : ' js-node--today-hinting'}" data-vbx="${todayPos.x.toFixed(2)}" data-vby="${todayPos.y.toFixed(2)}" style="left:${pctX(todayPos.x)}%;top:${pctY(todayPos.y)}%;animation-delay:0.4s;" role="button" tabindex="0" aria-expanded="false" aria-label="Show today's action" id="actionTodayActionCard">
        <div class="js-mask"></div>
        <div class="js-glow"></div>
        <div class="js-ring"></div>
        <div class="js-dot"></div>
        ${todayHintHtml}
        <div class="js-card js-card--today-action js-card--clickable" aria-hidden="true" id="actionTodayCard" role="button" tabindex="0" aria-label="Open today's action details">
          <div class="js-card__today-head">
            <span class="js-card-eyebrow">TODAY'S ACTION</span>
          </div>
          <div class="js-card__today-title">${esc(todayText)}</div>
        </div>
      </div>
    `;

    // Milestone nodes. AI returns path far→near (e.g. 12mo, 3mo, this week).
    // The journey visualizes near (bottom) → far (top), so we reverse so
    // path[last] (nearest in time) sits closest to TODAY at the bottom.
    // Cards start collapsed - tap the dot to expand a single card; opening
    // another collapses the previous one (handled by JS below).
    const reversedPath = (pa.path || []).slice().reverse();
    // Small lateral offset so the dot sits just outboard of the path line
    // (away from screen center), instead of sitting directly on the curve.
    const DOT_OFFSET_VB = 0; // dots sit ON the path; a CSS backdrop disc masks the dotted line behind each one so the dot reads as part of the path, not floating off to the side.
    const nodesHtml = reversedPath.map((s, i) => {
      const wp = positions[i + 1];
      const isRightOfCenter = wp.x > VBW * 0.5;
      const side = isRightOfCenter ? ' js-card--left' : '';
      const pos = { x: wp.x + (isRightOfCenter ? DOT_OFFSET_VB : -DOT_OFFSET_VB), y: wp.y };
      // Has the AI returned the richer milestone fields? If so, the popup
      // card itself is clickable to open the full milestone sheet. Otherwise
      // it's the older schema and the card is just informational.
      const hasRich = (s.looksLike || s.bridge || s.signal);
      const cardCls = `js-card${side}${hasRich ? ' js-card--clickable' : ''}`;
      const cardAttrs = hasRich ? `data-milestone-idx="${i}" role="button" tabindex="0"` : 'aria-hidden="true"';
      // Milestone names are tap-to-reveal only (via the .js-card popup).
      // No persistent label text on the trail, Malik wants the dots to
      // be clean visual markers, with the horizon/milestone explanation
      // surfacing only when the user taps the dot.
      return `
        <div class="js-node js-node--clickable" data-vbx="${pos.x.toFixed(2)}" data-vby="${pos.y.toFixed(2)}" style="left:${pctX(pos.x)}%;top:${pctY(pos.y)}%;animation-delay:${0.55 + i * 0.18}s;" role="button" tabindex="0" aria-expanded="false" aria-label="Show milestone ${esc(s.horizon || '')}">
          <div class="js-mask"></div>
          <div class="js-ring"></div>
          <div class="js-dot"></div>
          <div class="${cardCls}" ${cardAttrs}>
            <span class="js-card__text">
              <span class="js-card-eyebrow">${esc((s.horizon || '').toUpperCase())}</span>
              <span class="js-card-value">${esc(s.milestone || '')}</span>
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Full-screen milestone sheets - one per path step. Same pattern as the
    // Today's Action sheet: dimmed backdrop, three labeled sections
    // (looksLike / bridge / signal). Hidden until the user taps "View full".
    const milestoneSheetsHtml = reversedPath.map((s, i) => {
      const hasRich = (s.looksLike || s.bridge || s.signal);
      if (!hasRich) return '';
      return `
        <div class="action-milestone-sheet" id="actionMilestoneSheet-${i}" aria-hidden="true" role="dialog" aria-label="Milestone: ${esc(s.horizon || '')}">
          <button class="action-today-sheet__close action-milestone-sheet__close" type="button" aria-label="Close" data-milestone-close="${i}">&times;</button>
          <div class="action-today-sheet__inner">
            <div class="action-today-sheet__eyebrow-row">
              <div class="action-today-sheet__eyebrow action-milestone-sheet__eyebrow">${esc((s.horizon || '').toUpperCase())}</div>
            </div>
            <h1 class="action-today-sheet__title">${esc(s.milestone || '')}</h1>
            ${s.looksLike ? `
              <div class="action-today-sheet__section">
                <div class="action-today-sheet__section-label action-milestone-sheet__label">WHAT THIS LOOKS LIKE</div>
                <div class="action-today-sheet__section-body">${esc(s.looksLike)}</div>
              </div>` : ''}
            ${s.bridge ? `
              <div class="action-today-sheet__section">
                <div class="action-today-sheet__section-label action-milestone-sheet__label">WHAT GETS YOU HERE</div>
                <div class="action-today-sheet__section-body">${esc(s.bridge)}</div>
              </div>` : ''}
            ${s.signal ? `
              <div class="action-today-sheet__section">
                <div class="action-today-sheet__section-label action-milestone-sheet__label">YOU&apos;LL KNOW YOU&apos;RE HERE WHEN</div>
                <div class="action-today-sheet__section-body">${esc(s.signal)}</div>
              </div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // PEAK - the REAL neutron star canvas (same one used on the dashboard +
    // Neutron Star summary view) wrapped in 4 diffraction spikes for the
    // "summit beacon" feel. Violet halo only here - nowhere else.
    // PEAK MARKER: v13 redesign. Was a glowing canvas neutron star; now a
    // finish-line / summit flag. Thematic reason: the Neutron Star is the
    // GRAVITATIONAL FORCE pulling the user forward (their worthy goal),
    // not the destination itself. The summit is "you arrived" - better
    // represented by a planted flag. The Neutron Star concept is still
    // accessible via the click (opens the clarity summary) and the tooltip
    // still surfaces the goal text. Light bloom kept so the marker glows.
    const destinationHtml = `
      <div class="js-peak js-peak--clickable" data-vbx="${peakPos.x.toFixed(2)}" data-vby="${peakPos.y.toFixed(2)}" style="left:${pctX(peakPos.x)}%;top:${pctY(peakPos.y)}%;animation-delay:${0.55 + stepCount * 0.18 + 0.15}s;" role="button" tabindex="0" aria-label="Open Neutron Star view">
        <div class="js-star-wrap">
          <div class="js-star-violet-halo"></div>
          <!-- Liquid-glass pin. Two layers:
                 (1) .js-pin-glass, a div clipped into a droplet via SVG
                     mask; backdrop-filter blurs whatever is behind so the
                     beams appear softly refracted through it.
                 (2) .js-pin-dot, small bright dot in the head, sits ABOVE
                     the glass so it isn't masked away. -->
          <div class="js-pin">
            <div class="js-pin-glass"></div>
            <div class="js-pin-dot"></div>
          </div>
        </div>
        <div class="js-peak-tooltip" aria-hidden="true">
          <div class="js-peak-tooltip__label">YOUR DESTINATION</div>
          <div class="js-peak-tooltip__text">${esc(neutronStar) || 'Set your neutron star'}</div>
        </div>
      </div>
    `;

    // Peak position in viewBox coords (drives mountain placement)
    const peakX = peakPos.x, peakY = peakPos.y;

    // Pull the mountain image data URI from the :root CSS var so we can
    // embed it as an SVG <image> (CSS var() doesn't resolve inside SVG href).
    const mountainUrl = (() => {
      try {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--mountain-bg').trim();
        return raw.replace(/^url\(\s*['"]?/, '').replace(/['"]?\s*\)$/, '');
      } catch (_) { return ''; }
    })();

    // === Climb progress / time-to-summit math ===
    // Translates the AI-captured timeframe string ("12 months", "this week",
    // "lifelong", etc.) into total days so we can show a % bar and a
    // countdown. lastGeneratedAt is set when the plan is first built; for
    // legacy plans without one, treat as "today" so the timer starts now.
    const parseTimeframeToDays = (tf) => {
      const s = (tf || '').toLowerCase().trim();
      if (!s) return null;
      if (/lifelong|forever|life\b/.test(s)) return null;
      // Pull the leading number; default to 1 if it's "this week" / "a month"
      const m = s.match(/(\d+(?:\.\d+)?)/);
      const n = m ? parseFloat(m[1]) : (/this|a |an /.test(s) ? 1 : null);
      if (n == null) return null;
      if (/year/.test(s)) return Math.round(n * 365);
      if (/month/.test(s)) return Math.round(n * 30);
      if (/week/.test(s)) return Math.round(n * 7);
      if (/day/.test(s)) return Math.round(n);
      return null;
    };
    const climbStartIso = state.action.lastGeneratedAt;
    const climbStartMs = climbStartIso ? new Date(climbStartIso).getTime() : Date.now();
    const daysElapsed = Math.max(0, Math.floor((Date.now() - climbStartMs) / 86400000));
    const tfStr = (state.action.intake && state.action.intake.aiSnapshot && state.action.intake.aiSnapshot.timeframe) || (state.clarity && state.clarity.answers && state.clarity.answers.timeframe) || '';
    // Fall back to 365 days when no timeframe is captured, the info column
    // would otherwise render empty for legacy plans, which defeats the point.
    const totalDays = parseTimeframeToDays(tfStr) || 365;
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const percentComplete = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

    const infoColumnHtml = `
      <aside class="action-plan__info" aria-label="Climb status">
        <div class="action-plan__info-block">
          <div class="action-plan__info-label">PROGRESS</div>
          <div class="action-plan__info-value">${percentComplete}%</div>
          <div class="action-plan__info-bar"><div class="action-plan__info-bar-fill" style="width:${percentComplete}%"></div></div>
          <div class="action-plan__info-sub">Day ${daysElapsed} of ${totalDays}</div>
        </div>
        <div class="action-plan__info-block">
          <div class="action-plan__info-label">TIME TO SUMMIT</div>
          <div class="action-plan__info-value action-plan__info-value--row">
            <span class="action-plan__info-num">${daysRemaining}</span>
            <span class="action-plan__info-unit">DAYS</span>
          </div>
          <div class="action-plan__info-sub">Stay consistent.</div>
        </div>
      </aside>
    `;

    const pathHtml = stepCount > 0 ? `
      <div class="action-plan__journey-full">
        ${infoColumnHtml}
        <!-- God rays from the top-left, matching the dashboard + splash. Sits
             beneath the mountain image and the trail so light filters past
             the silhouette without crossing the dotted path lines. -->
        <div class="action-plan__rays" aria-hidden="true">
          <div class="ambient__rays-source"></div>
          <!-- 12 beams fanning UPWARD from a source buried halfway down the
               screen behind the mountain. Angles -160° (up-left) to -17°
               (up-right) for a wide explosion fan. Colors use pre-saturated
               rgba values (richer purples/blues) so vividness comes from the
               source colors rather than CSS filters, which renders much
               more identically across Safari and Chromium-based browsers.
               Heights bumped (avg ~150px), --omax bumped (avg ~0.85) so
               beams read as a powerful explosion of light. -->
          <div class="ambient__rays-beam" style="--a:-160deg; --h:100px; --d:9.4s;  --del:-0.0s; --omin:0.20; --omax:0.85; --smin:0.85; --smax:1.10; --c:145 100 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-147deg; --h:180px; --d:11.6s; --del:-1.8s; --omin:0.28; --omax:0.95; --smin:0.55; --smax:1.40; --c:110 150 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-134deg; --h:80px;  --d:7.1s;  --del:-3.4s; --omin:0.22; --omax:0.85; --smin:0.7;  --smax:1.25; --c:255 95 130;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-121deg; --h:160px; --d:13.2s; --del:-2.1s; --omin:0.30; --omax:0.98; --smin:0.6;  --smax:1.35; --c:160 120 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-108deg; --h:120px; --d:10.5s; --del:-5.6s; --omin:0.25; --omax:0.92; --smin:0.5;  --smax:1.45; --c:255 255 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-95deg;  --h:220px; --d:8.3s;  --del:-0.7s; --omin:0.35; --omax:1.00; --smin:0.65; --smax:1.30; --c:200 180 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-82deg;  --h:90px;  --d:14.8s; --del:-4.2s; --omin:0.20; --omax:0.80; --smin:0.8;  --smax:1.20; --c:120 165 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-69deg;  --h:200px; --d:9.0s;  --del:-3.0s; --omin:0.32; --omax:0.98; --smin:0.55; --smax:1.45; --c:170 125 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-56deg;  --h:75px;  --d:12.3s; --del:-6.5s; --omin:0.20; --omax:0.78; --smin:0.75; --smax:1.25; --c:255 115 145;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-43deg;  --h:150px; --d:10.9s; --del:-1.2s; --omin:0.27; --omax:0.92; --smin:0.6;  --smax:1.35; --c:100 150 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-30deg;  --h:100px; --d:8.6s;  --del:-4.9s; --omin:0.22; --omax:0.85; --smin:0.7;  --smax:1.25; --c:255 255 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-17deg;  --h:170px; --d:11.4s; --del:-2.6s; --omin:0.28; --omax:0.95; --smin:0.55; --smax:1.40; --c:155 115 255;"><div class="ambient__rays-beam-shaft"></div></div>
        </div>
        <!-- Background mountain ridges. Same image as the main mountain,
             scaled down and offset to either side, blurred, low-opacity.
             Creates depth between the sky and the foreground mountain.
             Ordered far -> near (deepest blur first). -->
        <div class="action-plan__bg-mountains" aria-hidden="true">
          <div class="bg-mountain bg-mountain--far"></div>
          <div class="bg-mountain bg-mountain--left"></div>
          <div class="bg-mountain bg-mountain--right"></div>
          <div class="bg-mountain bg-mountain--mid"></div>
        </div>
        <!-- Foreground pine forest silhouette. Sits in FRONT of the main
             mountain at the bottom edge so the mountain reads as standing
             behind a tree line, gives a sense of scale and "you're at
             the base, looking up." Pure SVG silhouette, repeats edge-to-edge. -->
        <svg class="action-plan__treeline" viewBox="0 0 1200 100" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <!-- A row of varying pine triangles + a solid ground band underneath. -->
          <path fill="rgba(6, 4, 14, 0.95)" d="
            M0 100
            L0 70 L18 40 L36 70 L46 50 L60 70 L74 30 L92 70 L106 55 L122 70 L138 35 L156 70 L168 60 L182 70 L196 25 L216 70 L228 55 L246 70 L260 45 L278 70 L292 65 L308 70 L324 30 L344 70 L358 55 L378 70 L390 50 L408 70 L424 28 L444 70 L460 60 L476 70 L494 38 L514 70 L526 55 L546 70 L562 32 L582 70 L598 60 L616 70 L630 48 L650 70 L668 55 L686 70 L700 28 L720 70 L734 55 L754 70 L770 42 L790 70 L804 58 L824 70 L840 30 L860 70 L876 55 L894 70 L908 48 L928 70 L944 32 L964 70 L978 55 L996 70 L1012 38 L1030 70 L1046 60 L1064 70 L1080 28 L1100 70 L1116 50 L1136 70 L1152 55 L1172 70 L1186 42 L1200 70
            L1200 100 Z" />
        </svg>
        <div class="action-plan__journey-track" style="--journey-h:${journeyHeight}px;">
          <svg class="js-svg" viewBox="0 0 ${VBW} ${VBH}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <radialGradient id="starGlow" cx="78%" cy="9%" r="50%">
                <stop offset="0"   stop-color="rgba(var(--ink),0.14)" />
                <stop offset="0.4" stop-color="rgba(var(--ink),0.04)" />
                <stop offset="1"   stop-color="transparent" />
              </radialGradient>
              <radialGradient id="atmHaze" cx="50%" cy="40%" r="60%">
                <stop offset="0"   stop-color="transparent" />
                <stop offset="1"   stop-color="transparent" />
              </radialGradient>
              <linearGradient id="mountainFade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0"     stop-color="#000000" stop-opacity="0" />
                <stop offset="0.55"  stop-color="#000000" stop-opacity="0" />
                <stop offset="0.82"  stop-color="#000000" stop-opacity="0.55" />
                <stop offset="1"     stop-color="#000000" stop-opacity="0.95" />
              </linearGradient>
              <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <!-- Real mountain photo as the layout source. Everything else
                 (path, nodes, star) is positioned in this same 1536x1024 space. -->
            <image href="${mountainUrl}" xlink:href="${mountainUrl}" x="0" y="0" width="${VBW}" height="${VBH}" preserveAspectRatio="xMidYMid slice" />
            <!-- Bottom fade rect removed, it was tinting the lower trail dots
                 dark. Today's Action card sits on the treeline silhouette now
                 (which provides its own clean dark base). -->
            <!-- Soft starlight halo across the upper area -->
            <rect x="0" y="0" width="${VBW}" height="${VBH * 0.5}" fill="url(#starGlow)" />
            <!-- Scattered stars in the upper portion -->
            <circle cx="${VBW * 0.08}" cy="${VBH * 0.06}" r="1.6" fill="rgba(var(--ink),0.55)" />
            <circle cx="${VBW * 0.18}" cy="${VBH * 0.12}" r="1.1" fill="rgba(var(--ink),0.4)" />
            <circle cx="${VBW * 0.30}" cy="${VBH * 0.04}" r="1.4" fill="rgba(var(--ink),0.5)" />
            <circle cx="${VBW * 0.42}" cy="${VBH * 0.08}" r="0.9" fill="rgba(var(--ink),0.35)" />
            <circle cx="${VBW * 0.52}" cy="${VBH * 0.16}" r="1.6" fill="rgba(var(--ink),0.6)" />
            <circle cx="${VBW * 0.60}" cy="${VBH * 0.05}" r="1.1" fill="rgba(var(--ink),0.45)" />
            <circle cx="${VBW * 0.85}" cy="${VBH * 0.06}" r="1.4" fill="rgba(var(--ink),0.5)" />
            <circle cx="${VBW * 0.95}" cy="${VBH * 0.18}" r="0.9" fill="rgba(var(--ink),0.35)" />
            <circle cx="${VBW * 0.12}" cy="${VBH * 0.22}" r="1.1" fill="rgba(var(--ink),0.3)" />
            <circle cx="${VBW * 0.74}" cy="${VBH * 0.20}" r="1.1" fill="rgba(var(--ink),0.4)" />
            <!-- Violet haze beneath the star -->
            <ellipse cx="${peakX}" cy="${peakY + VBH * 0.42}" rx="${VBW * 0.45}" ry="${VBH * 0.08}" fill="url(#atmHaze)" />
            <!-- The trail. Drawn solid via stroke-dashoffset, then transitions to dashed. -->
            <path id="actionJourneyPath" d="${ascentD}" fill="none"
                  stroke="rgba(var(--ink),0.95)" stroke-width="1.6" stroke-linecap="round" filter="url(#pathGlow)"
                  vector-effect="non-scaling-stroke" />
          </svg>
          <div class="js-overlay">
            ${destinationHtml}
            ${nodesHtml}
            ${todayNodeHtml}
          </div>
        </div>
      </div>
    ` : '';

    const tiersHtml = (pa.tiers && (pa.tiers.tiny || pa.tiers.light || pa.tiers.moderate || pa.tiers.heavy || pa.tiers.extreme)) ? `
      <div class="action-plan__today-block ${pa.path && pa.path.length ? 'action-plan__today-block--has-path' : ''}">
        <div class="action-plan__today-label">Today</div>
        <div class="action-plan__tiers">
          ${['tiny','light','moderate','heavy','extreme'].filter(t => pa.tiers[t]).map(t => `
            <div class="action-plan__tier ${pa.recommendedTier === t ? 'action-plan__tier--rec' : ''}" data-tier="${t}">
              <div class="action-plan__tier-head">
                <span class="action-plan__tier-name">${t.charAt(0).toUpperCase() + t.slice(1)}</span>
                ${pa.recommendedTier === t ? '<span class="action-plan__tier-badge">Recommended</span>' : ''}
              </div>
              <div class="action-plan__tier-text">${esc(pa.tiers[t])}</div>
              ${pa.recommendedTier === t && pa.recommendedWhy ? `<div class="action-plan__tier-why">${esc(pa.recommendedWhy)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const html = `
      <div class="action-exp__page-inner action-plan-page">
        <!-- Regeneration overlay: shown when .is-regenerating is on the parent. -->
        <div class="action-plan__regen" aria-hidden="true">
          <div class="action-plan__regen-backdrop"></div>
          <div class="action-plan__regen-inner">
            <div class="action-plan__regen-dots">
              <span></span><span></span><span></span>
            </div>
            <div class="action-plan__regen-label">Regenerating your plan</div>
          </div>
        </div>
        <!-- Minimal top-right marker only. No goal text, no timeframe pill here. -->
        <div class="action-plan__topbar">
          <div class="action-plan__topbar-left"></div>
          <div class="action-plan__topbar-right">
            <button class="action-plan__refresh action-plan__refresh--floating" data-field="primaryAction" type="button" aria-label="Rephrase">${refreshIcon}</button>
          </div>
        </div>

        ${state.action.quote.dismissed ? '' : (() => {
          // Glassy quote box, vertically centered on the right side of the
          // mountain view. Big decorative curly quotes are added via CSS
          // pseudo-elements; we just emit the raw text + the highlight span
          // on the last sentence. Falls back to plain text if there's no
          // sentence-final period to split on.
          const fullQuote = MOUNTAIN_QUOTES[((state.action.quote.index % MOUNTAIN_QUOTES.length) + MOUNTAIN_QUOTES.length) % MOUNTAIN_QUOTES.length];
          const lastDot = fullQuote.lastIndexOf('.');
          let bodyHtml;
          if (lastDot > 0 && lastDot < fullQuote.length - 1) {
            // Split at the second-to-last sentence terminator if multiple sentences,
            // otherwise highlight nothing.
            const beforeLast = fullQuote.lastIndexOf('.', lastDot - 1);
            if (beforeLast > -1) {
              const head = fullQuote.slice(0, beforeLast + 1).trim();
              const tail = fullQuote.slice(beforeLast + 1).trim();
              bodyHtml = `${esc(head)} <span class="action-plan__quote-keep">${esc(tail)}</span>`;
            } else {
              bodyHtml = esc(fullQuote);
            }
          } else {
            bodyHtml = esc(fullQuote);
          }
          return `
            <div class="action-plan__quote" id="actionPlanQuote" role="button" tabindex="0" aria-label="Tap for a new quote">
              <div class="action-plan__quote-text" id="actionPlanQuoteText">${bodyHtml}</div>
              <button class="action-plan__quote-close" id="actionPlanQuoteClose" type="button" aria-label="Hide quote">&times;</button>
            </div>
          `;
        })()}

        <!-- The journey itself - full bleed, no chrome -->
        ${pathHtml}

        <!-- Milestone Sheets: one per path step. Opened by tapping
             "View full milestone" inside any small dot dropdown. Each one
             expands the milestone into three richer sections (what this
             looks like / what gets you here / you'll know you're here when). -->
        ${milestoneSheetsHtml}

        <!-- Today Sheet: full-screen expanded view of today's action,
             opened by tapping "View full details" inside the green dot
             dropdown. Has the action title, why it matters, how to start,
             and the Mark Complete pill. -->
        <div class="action-today-sheet" id="actionTodaySheet" aria-hidden="true" role="dialog" aria-label="Today's Action">
          <button class="action-today-sheet__close" id="actionTodaySheetClose" type="button" aria-label="Close">&times;</button>
          <div class="action-today-sheet__inner">
            <div class="action-today-sheet__eyebrow-row">
              <div class="action-today-sheet__eyebrow">TODAY'S ACTION</div>
              <div class="action-today-sheet__badge-wrap">
                <button class="action-today-sheet__badge action-today-sheet__badge--btn" id="actionTodaySheetBadge" type="button" aria-haspopup="listbox" aria-expanded="false">
                  <span>${esc(recTierLabel)}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="action-today-sheet__levels" id="actionTodaySheetLevels" role="listbox" aria-hidden="true">
                  ${[
                    {key:'tiny',     label:'Small',    desc:"Bare minimum. Just show up."},
                    {key:'light',    label:'Simple',   desc:"A small step that still counts."},
                    {key:'moderate', label:'Medium',   desc:"Realistic. Solid effort."},
                    {key:'heavy',    label:'Heavy',    desc:"For those who are really serious."},
                    {key:'extreme',  label:'Extreme',  desc:"All in, full commitment. Do not select unless you are a Navy SEAL."}
                  ].map(lv => `
                    <button class="action-today-sheet__level ${pa.recommendedTier === lv.key ? 'is-active' : ''}" data-level="${lv.key}" type="button" role="option" aria-selected="${pa.recommendedTier === lv.key}">
                      <div class="action-today-sheet__level-row">
                        <span class="action-today-sheet__level-name">${lv.label}</span>
                        ${pa.recommendedTier === lv.key ? '<span class="action-today-sheet__level-check">&#10003;</span>' : ''}
                      </div>
                      <div class="action-today-sheet__level-desc">${lv.desc}</div>
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
            <h1 class="action-today-sheet__title">${esc(todayText)}</h1>
            <!-- Reminder note is now in a collapsed disclosure so the
                 sheet opens clean. Users can tap to read it when they
                 want the framing; otherwise it stays out of the way. -->
            <details class="action-today-sheet__section action-today-sheet__section--collapsible">
              <summary class="action-today-sheet__section-label">
                <span>REMINDER</span>
                <svg class="action-today-sheet__section-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </summary>
              <div class="action-today-sheet__section-body">Pick something you will actually do. A huge goal you never act on is worth nothing. Goals do not move you forward. Actions do.</div>
            </details>
            <div class="action-today-sheet__actions">
              <button class="action-today-sheet__cta action-plan__mark-complete" id="actionTodaySheetMark" type="button">
                <svg class="action-plan__mark-complete-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path class="action-plan__mark-complete-arrow" d="M3 7 L11 7 M7 3 L11 7 L7 11" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                  <path class="action-plan__mark-complete-check" d="M3 7.2 L5.6 9.8 L11 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="action-plan__mark-complete-label-default">Mark complete</span>
                <span class="action-plan__mark-complete-label-done">Completed</span>
              </button>
              <button class="action-today-sheet__refine" id="actionTodaySheetRefine" type="button">
                <span>Make it more specific</span>
              </button>
            </div>
            <!-- After completion: "what's next" CTA appears, hidden until
                 Mark Complete is tapped. Wired to call the AI with the
                 completion history so the next 5 tier options reflect the
                 NEXT logical step, not a repeat of what's already done. -->
            <div class="action-today-sheet__next" id="actionTodaySheetNext" hidden>
              <div class="action-today-sheet__next-msg">Nice. That one counts.</div>
              <button class="action-today-sheet__next-btn" id="actionTodaySheetNextBtn" type="button">
                <span class="action-today-sheet__next-btn-label">Get next step</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Extreme tier confirmation. Appears when the user picks Extreme,
             since the choice has real implications and shouldn't be tapped by
             accident. -->
        <div class="action-extreme-warn" id="actionExtremeWarn" aria-hidden="true" role="dialog" aria-label="Confirm Extreme">
          <div class="action-extreme-warn__backdrop" id="actionExtremeWarnBackdrop"></div>
          <div class="action-extreme-warn__card">
            <div class="action-extreme-warn__eyebrow">EXTREME</div>
            <h2 class="action-extreme-warn__title">Are you sure?</h2>
            <p class="action-extreme-warn__body">Extreme is for people who are actually serious and have the time, discipline, and willpower to commit fully.</p>
            <p class="action-extreme-warn__body">If you can pull this off consistently, you're basically guaranteed to hit your goal. But it's hard. Most people can't.</p>
            <div class="action-extreme-warn__actions">
              <button class="action-extreme-warn__cancel" id="actionExtremeWarnCancel" type="button">Cancel</button>
              <button class="action-extreme-warn__confirm" id="actionExtremeWarnConfirm" type="button">I'm in</button>
            </div>
          </div>
        </div>

        <!-- Refine sheet: opens on top of the today sheet. Conversational
             AI loop that turns the vague tier action into a more specific
             version, then writes it back as the displayed action. -->
        <div class="action-refine-sheet" id="actionRefineSheet" aria-hidden="true" role="dialog" aria-label="Refine your action">
          <button class="action-today-sheet__close" id="actionRefineSheetClose" type="button" aria-label="Close">&times;</button>
          <div class="action-refine-sheet__inner">
            <div class="action-refine-sheet__eyebrow">REFINE</div>
            <div class="action-refine-sheet__current" id="actionRefineCurrent">${esc(todayText)}</div>
            <div class="action-refine-sheet__chat" id="actionRefineChat" aria-live="polite"></div>
            <div class="action-refine-sheet__inputrow">
              <textarea class="action-refine-sheet__input" id="actionRefineInput" rows="1" placeholder="Type your answer"></textarea>
              <button class="action-refine-sheet__send" id="actionRefineSend" type="button" aria-label="Send">&uarr;</button>
            </div>
            <button class="action-refine-sheet__accept" id="actionRefineAccept" type="button" hidden>Use this version</button>
          </div>
        </div>

        <!-- Focus Cave entrance: tall glassy card pinned to the bottom-right
             of the mountain view (v13 redesign matches the reference mock).
             Cave arch icon, eyebrow label, 2-line description, and an ENTER
             button. The full-screen cave sheet (#actionCaveSheet) opens on
             click and stays unchanged. -->
        <button class="action-plan__cave" id="actionCaveEntrance" type="button" aria-label="Enter the Focus Cave">
          <span class="action-plan__cave-head">
            <span class="action-plan__cave-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20 L4 12 Q4 4 12 4 Q20 4 20 12 L20 20 Z" />
                <path d="M9 20 L9 14 Q9 10 12 10 Q15 10 15 14 L15 20" opacity="0.55" />
              </svg>
            </span>
            <span class="action-plan__cave-label-name">Focus Cave</span>
          </span>
          <span class="action-plan__cave-desc">
            Eliminate distraction.<br />Enter deep focus.
          </span>
          <span class="action-plan__cave-cta">
            Enter
            <span class="action-plan__cave-cta-arrow" aria-hidden="true">&rarr;</span>
          </span>
        </button>

        <!-- Focus Cave full-screen sheet. Warm tone (firelight) rather than the
             cool blue of the today sheet, so it feels like a different space. -->
        <div class="action-cave-sheet" id="actionCaveSheet" aria-hidden="true" role="dialog" aria-label="Focus Cave">
          <button class="action-today-sheet__close" id="actionCaveSheetClose" type="button" aria-label="Close">&times;</button>
          <div class="action-cave-sheet__inner">
            <div class="action-cave-sheet__eyebrow">THE FOCUS CAVE</div>
            <h1 class="action-cave-sheet__title">Focus is finite. Spend it well.</h1>
            <p class="action-cave-sheet__intro">
              Every hour you spend awake, you're spending focus on something. Most people leak it. Phone in hand, seven tabs open, saying yes to everything. Then they wonder why they never moved forward.
            </p>
            <p class="action-cave-sheet__intro">
              The fix is environmental, not motivational. Make the right thing easier to start. Make the wrong thing harder to do. Your future self gets built or unbuilt by what you set up around yourself.
            </p>

            ${fp.frame ? `<div class="action-cave-sheet__frame">${esc(fp.frame)}</div>` : ''}

            <div class="action-cave-sheet__section">
              <div class="action-cave-sheet__section-head">
                <div class="action-cave-sheet__section-label action-cave-sheet__section-label--easier">MAKE THE RIGHT THING EASIER</div>
                <button class="action-plan__refresh action-cave-sheet__refresh" data-field="focusPlan" type="button" aria-label="Regenerate focus plan">${refreshIcon}</button>
              </div>
              <ul class="action-cave-sheet__list">
                ${removeBullets || '<li class="action-cave-sheet__list-empty">No suggestions yet. Tap the refresh icon to generate.</li>'}
              </ul>
            </div>

            <div class="action-cave-sheet__section">
              <div class="action-cave-sheet__section-head">
                <div class="action-cave-sheet__section-label action-cave-sheet__section-label--harder">MAKE THE WRONG THING HARDER</div>
              </div>
              <ul class="action-cave-sheet__list">
                ${addBullets || '<li class="action-cave-sheet__list-empty">No suggestions yet.</li>'}
              </ul>
            </div>

            <div class="action-cave-sheet__footer">
              <div class="action-cave-sheet__timeframe">
                <span class="action-cave-sheet__timeframe-label">Timeframe</span>
                <button class="action-plan__header-when" id="actionPlanTfToggle" type="button">
                  <span style="opacity:0.6;font-weight:500;">By</span>
                  <span style="font-weight:600;">${esc(timeframe)}</span>
                  <span style="opacity:0.55;display:inline-flex;">${pencilIcon}</span>
                </button>
                ${tfEditorHtml}
                ${staleBanner}
              </div>
              <button class="action-plan__reset action-cave-sheet__reset" id="actionPlanReset" type="button">Start over</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.pageWrap.innerHTML = html;

    // Round 12: initialize the real neutron star canvas at the peak
    const peakStar = this.pageWrap.querySelector('#actionPlanJourneyStar');
    if (peakStar && typeof initStarBlob === 'function') {
      initStarBlob(peakStar, 320);
    }

    // The SVG uses preserveAspectRatio="xMidYMid slice", which means the
    // viewBox -> screen mapping is non-linear with the container box. To keep
    // HTML overlay nodes (milestone cards, peak star) glued to their SVG
    // coordinates, project each node's viewBox position through the SVG's
    // current CTM and set its container-relative pixel position. Re-runs on
    // resize so the lock is permanent.
    const alignOverlayToSvg = () => {
      const svgEl = this.pageWrap.querySelector('.js-svg');
      if (!svgEl || !svgEl.getScreenCTM) return;
      const ctm = svgEl.getScreenCTM();
      if (!ctm) return;
      const container = svgEl.parentElement;
      const cRect = container.getBoundingClientRect();
      const pt = svgEl.createSVGPoint();
      const nodes = this.pageWrap.querySelectorAll('.js-node, .js-peak');
      nodes.forEach(n => {
        const vbx = parseFloat(n.dataset.vbx);
        const vby = parseFloat(n.dataset.vby);
        if (!isFinite(vbx) || !isFinite(vby)) return;
        pt.x = vbx; pt.y = vby;
        const s = pt.matrixTransform(ctm);
        n.style.left = (s.x - cRect.left).toFixed(2) + 'px';
        n.style.top  = (s.y - cRect.top).toFixed(2) + 'px';
      });
    };
    requestAnimationFrame(alignOverlayToSvg);
    // Also realign after the image inside the SVG actually decodes (Safari
    // can fire layout before the data URI image paints).
    const svgImage = this.pageWrap.querySelector('.js-svg image');
    if (svgImage) {
      svgImage.addEventListener('load', alignOverlayToSvg, { once: true });
    }
    // iOS Safari is unreliable about firing the SVG <image> load event for
    // data-URI sources, which leaves .js-peak (and therefore the flag) stuck
    // at the pre-image layout position. Re-run alignment a few times across
    // the first second to catch the final layout no matter when it lands.
    [50, 150, 400, 900].forEach(ms => setTimeout(alignOverlayToSvg, ms));
    const resizeHandler = () => alignOverlayToSvg();
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', resizeHandler);
    if (this._peakResizeHandler) {
      window.removeEventListener('resize', this._peakResizeHandler);
      window.removeEventListener('orientationchange', this._peakResizeHandler);
    }
    this._peakResizeHandler = resizeHandler;

    // Path-draw animation:
    //   1. Solid line sweeps up the mountain at a constant pace (1.0s).
    //   2. Hold the finished solid line for a beat.
    //   3. Cross-fade dissolve into the dotted pattern (stroke fades down,
    //      dasharray swaps instantly, fades back in).
    //   4. Slow continuous upward dash flow.
    //
    // Defense against the "broken pieces" look: use a HUGE fixed dash length
    // (10000) that can't tile across the path no matter what getTotalLength
    // returns. The path's actual length is irrelevant for the draw-in - we
    // just need ONE giant dash that slides into view, and any value bigger
    // than the visible stroke does that cleanly.
    const pathEl = this.pageWrap.querySelector('#actionJourneyPath');
    if (pathEl) {
      requestAnimationFrame(() => {
        const HUGE = 10000;
        // Phase 1: draw in solid, slower + smoother. Use a huge fixed dash
        // that can't tile across the path, and animate offset all the way
        // to 0 so the entire dash is exposed - guarantees the line draws
        // end to end regardless of the path's actual length.
        pathEl.style.transition = 'none';
        pathEl.style.strokeDasharray = `${HUGE} ${HUGE}`;
        pathEl.style.strokeDashoffset = `${HUGE}`;
        pathEl.style.strokeOpacity = '1';
        pathEl.style.willChange = 'stroke-dashoffset';
        pathEl.getBoundingClientRect(); // force reflow
        pathEl.style.transition = 'stroke-dashoffset 1700ms cubic-bezier(0.4, 0, 0.2, 1) 250ms';
        pathEl.style.strokeDashoffset = '0';

        // After draw completes (~1.95s) + hold (700ms) = dissolve at 2.65s.
        setTimeout(() => {
          if (!pathEl.isConnected) return;
          pathEl.style.transition = 'stroke-opacity 220ms ease';
          pathEl.style.strokeOpacity = '0.18';
          setTimeout(() => {
            if (!pathEl.isConnected) return;
            // Instant dasharray swap - no CSS interpolation between huge
            // and tiny so no chaotic intermediate state.
            pathEl.style.transition = 'none';
            pathEl.style.strokeDasharray = '3 6';
            pathEl.style.strokeDashoffset = '0';
            pathEl.getBoundingClientRect();
            pathEl.style.transition = 'stroke-opacity 280ms ease';
            pathEl.style.strokeOpacity = '1';
            setTimeout(() => {
              if (!pathEl.isConnected) return;
              pathEl.style.transition = '';
              pathEl.style.willChange = '';
              pathEl.classList.add('js-path--flowing');
            }, 320);
          }, 230);
        }, 2650);
      });
    }

    // Click the neutron star at the summit → jump straight to the Clarity
    // Neutron Star summary view. One smooth fade: clarity-exp opens on top
    // of the action view (we bump its z-index above action-exp so it's
    // visible). Both have full-bleed dark space backgrounds, so the visual
    // reads as a single transition into the star. When the user closes
    // clarity, the z-index is reset and they land back on the action view.
    const peakClickEl = this.pageWrap.querySelector('.js-peak--clickable');
    if (peakClickEl) {
      const goToStarSummary = (e) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        if (typeof ClarityExperience === 'undefined') return;
        if (ClarityExperience.isOpen) return;
        try {
          const cExp = document.getElementById('clarityExp');
          if (cExp) cExp.style.zIndex = '1100';
          ClarityExperience.openSummary();
          // Reset z-index after clarity closes so subsequent flows behave normally.
          const origCloseClarity = ClarityExperience.close.bind(ClarityExperience);
          ClarityExperience.close = function restored(...args) {
            if (cExp) cExp.style.zIndex = '';
            ClarityExperience.close = origCloseClarity;
            return origCloseClarity(...args);
          };
        } catch (_) {}
      };
      peakClickEl.addEventListener('click', goToStarSummary);
      peakClickEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') goToStarSummary(e);
      });
    }

    // Click/tap a milestone dot to expand its card. Only one card open at a
    // time - opening a new one closes the previous. Tap outside any node to
    // close. Tap the same node again to toggle it closed.
    const milestoneNodes = this.pageWrap.querySelectorAll('.js-node--clickable');
    const closeAll = () => {
      milestoneNodes.forEach(n => {
        n.classList.remove('js-node--open');
        n.setAttribute('aria-expanded', 'false');
        const c = n.querySelector('.js-card');
        if (c) c.setAttribute('aria-hidden', 'true');
      });
    };
    const openOnly = (node) => {
      milestoneNodes.forEach(n => {
        const isThis = n === node;
        n.classList.toggle('js-node--open', isThis);
        n.setAttribute('aria-expanded', isThis ? 'true' : 'false');
        const c = n.querySelector('.js-card');
        if (c) c.setAttribute('aria-hidden', isThis ? 'false' : 'true');
      });
    };
    milestoneNodes.forEach(n => {
      const toggle = (e) => {
        e.stopPropagation();
        // The first time the user opens the today (green) dot, hide the
        // "Tap to start" hint and persist that fact so it doesn't return
        // on subsequent visits.
        if (n.classList.contains('js-node--today') && !state.action?.todayHintSeen) {
          if (!state.action) state.action = {};
          state.action.todayHintSeen = true;
          try { persistNow(); } catch (_) {}
          const hint = n.querySelector('.js-today-hint');
          if (hint) hint.classList.add('js-today-hint--gone');
          n.classList.remove('js-node--today-hinting');
        }
        if (n.classList.contains('js-node--open')) closeAll();
        else openOnly(n);
      };
      n.addEventListener('click', toggle);
      n.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
      });
    });
    // Clicking anywhere else inside the journey track closes any open card.
    const track = this.pageWrap.querySelector('.action-plan__journey-track');
    if (track) {
      track.addEventListener('click', (e) => {
        if (e.target.closest('.js-node--clickable')) return;
        if (e.target.closest('.js-card')) return;
        closeAll();
      });
    }

    // Today Sheet open/close + Mark Complete handlers. The "View full
    // details" button on the small dropdown opens the full-screen sheet.
    // Mark Complete inside the sheet also closes the small dropdown.
    const todayCard = this.pageWrap.querySelector('#actionTodayActionCard');
    const sheetEl = this.pageWrap.querySelector('#actionTodaySheet');
    const expandBtn = this.pageWrap.querySelector('#actionTodayCard');
    const sheetCloseBtn = this.pageWrap.querySelector('#actionTodaySheetClose');
    const sheetMarkBtn = this.pageWrap.querySelector('#actionTodaySheetMark');

    const openSheet = (e) => {
      if (e) e.stopPropagation();
      if (!sheetEl) return;
      sheetEl.setAttribute('aria-hidden', 'false');
      // Collapse the small dropdown so it doesn't peek through.
      if (todayCard) {
        todayCard.classList.remove('js-node--open');
        todayCard.setAttribute('aria-expanded', 'false');
      }
    };
    const closeSheet = () => {
      if (!sheetEl) return;
      sheetEl.setAttribute('aria-hidden', 'true');
    };

    if (expandBtn) {
      expandBtn.addEventListener('click', openSheet);
      expandBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(e); }
      });
    }
    if (sheetCloseBtn) sheetCloseBtn.addEventListener('click', closeSheet);
    // Tap outside the sheet content closes it.
    if (sheetEl) {
      sheetEl.addEventListener('click', (e) => {
        if (e.target === sheetEl) closeSheet();
      });
    }

    const markComplete = (e) => {
      if (e) e.stopPropagation();
      if (!todayCard) return;
      if (todayCard.classList.contains('is-completed')) return;
      todayCard.classList.add('is-completed');
      // Mark every Mark Complete button (small card + sheet) as done.
      this.pageWrap.querySelectorAll('.action-plan__mark-complete').forEach(btn => {
        btn.classList.add('completed');
        btn.disabled = true;
      });
      // Append to completion history so the AI knows what was done when
      // the user requests the next step. Captures the tier they were on
      // and the exact action text they completed.
      const pa = state.action.primaryAction || {};
      const tier = pa.recommendedTier || 'moderate';
      const refine = state.action.refine || {};
      const actionText = (refine.refinedText && refine.refinedForTier === tier)
        ? refine.refinedText
        : ((pa.tiers && pa.tiers[tier]) || pa.howToStart || pa.title || '');
      if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
      state.action.completionHistory.push({
        date: new Date().toISOString(),
        tier,
        actionText,
        planTitle: pa.title || ''
      });
      try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier: tier } }); } catch (_) {}
      persistNow();
      if (typeof TabBar !== 'undefined' && TabBar.updateHomeDot) { try { TabBar.updateHomeDot(); } catch (_) {} }
      // Reveal the "Get next step" CTA.
      const nextBlock = this.pageWrap.querySelector('#actionTodaySheetNext');
      if (nextBlock) nextBlock.hidden = false;
      try { if (typeof ProofTrail !== 'undefined' && ProofTrail.flash) ProofTrail.flash(); } catch (_) {}
      try { if (typeof promptTomorrowPlan === 'function') promptTomorrowPlan(); } catch (_) {}
    };
    if (sheetMarkBtn) sheetMarkBtn.addEventListener('click', markComplete);

    // Restore the completed-today state on re-render, mirroring the vine view
    // (which calls vpRevealNext() at render time when completedToday). Without
    // this, reopening the mountain plan after completing today shows the
    // action as un-done and hides the Get-next-step control. Reads the same
    // completionHistory signal as the vine; applies only the VISUAL side
    // effects markComplete produces (never re-pushes to history).
    (() => {
      const h = state.action.completionHistory;
      if (!Array.isArray(h) || !h.length) return;
      const last = h[h.length - 1];
      const todayStr = getTodayISO();
      const completedToday = !!(last && last.date && isoToLocalDay(last.date) === todayStr);
      if (!completedToday) return;
      if (todayCard) todayCard.classList.add('is-completed');
      this.pageWrap.querySelectorAll('.action-plan__mark-complete').forEach(btn => {
        btn.classList.add('completed');
        btn.disabled = true;
      });
      const nextBlock = this.pageWrap.querySelector('#actionTodaySheetNext');
      if (nextBlock) nextBlock.hidden = false;
    })();

    // ===== Get next step (post-completion regeneration) =====
    // Calls the AI plan generator in "next step" mode, uses the existing
    // clarity + intake context plus the completion history so the new 5
    // tier options reflect the NEXT logical move, not a repeat.
    const nextBtn = this.pageWrap.querySelector('#actionTodaySheetNextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        if (nextBtn.disabled) return;
        nextBtn.disabled = true;
        const label = nextBtn.querySelector('.action-today-sheet__next-btn-label');
        const labelOriginal = label ? label.textContent : '';
        if (label) label.textContent = 'Thinking…';
        try {
          // generateActionPlan reads state.action.completionHistory and
          // includes it in the AI prompt. The function returns the new
          // plan and updates state in place.
          if (typeof regenerateActionPlanForNextStep === 'function') {
            await regenerateActionPlanForNextStep();
          } else {
            // Fallback: nudge the existing generate path if the
            // dedicated next-step entry isn't wired (legacy state).
            console.warn('regenerateActionPlanForNextStep missing; falling back to no-op');
          }
          // Re-render the action experience so the new tiers + title show.
          if (window.App && typeof window.App.renderActionExperience === 'function') {
            window.App.renderActionExperience();
          } else if (typeof renderAll === 'function') {
            renderAll();
          }
        } catch (err) {
          console.error('next-step generation failed', err);
          if (label) label.textContent = 'Try again';
          nextBtn.disabled = false;
        }
      });
    }

    // ===== Difficulty level chooser =====
    const levelBadge = this.pageWrap.querySelector('#actionTodaySheetBadge');
    const levelMenu = this.pageWrap.querySelector('#actionTodaySheetLevels');
    if (levelBadge && levelMenu) {
      const openLevels = () => {
        levelMenu.setAttribute('aria-hidden', 'false');
        levelBadge.setAttribute('aria-expanded', 'true');
      };
      const closeLevels = () => {
        levelMenu.setAttribute('aria-hidden', 'true');
        levelBadge.setAttribute('aria-expanded', 'false');
      };
      levelBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = levelBadge.getAttribute('aria-expanded') === 'true';
        if (open) closeLevels(); else openLevels();
      });
      // Click outside to close. Stored on the instance and removed before
      // re-adding: this runs on every render of the plan, and without the
      // removal each visit stacked one more permanent document listener.
      if (this._levelDocClick) { try { document.removeEventListener('click', this._levelDocClick); } catch (_) {} }
      this._levelDocClick = (e) => {
        if (levelMenu.getAttribute('aria-hidden') === 'false' &&
            !levelMenu.contains(e.target) && !levelBadge.contains(e.target)) {
          closeLevels();
        }
      };
      document.addEventListener('click', this._levelDocClick);
      const applyTier = (newTier) => {
        if (state.action.primaryAction.recommendedTier !== newTier) {
          state.action.primaryAction.recommendedTier = newTier;
          state.action.primaryAction.recommendedWhy = '';
          state.action.refine = { messages: [], refinedText: '', refinedForTier: '' };
          persistNow();
        }
        // Update the today sheet IN PLACE, no full re-render, so the sheet
        // stays open and the user sees the new action immediately.
        // SCOPE the selector to #actionTodaySheet, milestone sheets reuse
        // the same .action-today-sheet__title class, and a bare
        // querySelector picks the first one in DOM order (a milestone
        // sheet), which silently swapped the wrong title and left the
        // today sheet untouched.
        const pa2 = state.action.primaryAction;
        const newText = (pa2.tiers && pa2.tiers[newTier]) || pa2.howToStart || '';
        const titleEl = this.pageWrap.querySelector('#actionTodaySheet .action-today-sheet__title');
        if (titleEl) titleEl.textContent = newText;
        // Update the badge label (the pill that opened the menu).
        const badgeLabel = this.pageWrap.querySelector('#actionTodaySheetBadge > span');
        if (badgeLabel) badgeLabel.textContent = TIER_LABELS[newTier] || newTier;
        // Update active state on each level row.
        this.pageWrap.querySelectorAll('.action-today-sheet__level').forEach(row => {
          const isActive = row.dataset.level === newTier;
          row.classList.toggle('is-active', isActive);
          row.setAttribute('aria-selected', isActive ? 'true' : 'false');
          const existingCheck = row.querySelector('.action-today-sheet__level-check');
          if (isActive && !existingCheck) {
            const span = document.createElement('span');
            span.className = 'action-today-sheet__level-check';
            span.innerHTML = '&#10003;';
            row.querySelector('.action-today-sheet__level-row')?.appendChild(span);
          } else if (!isActive && existingCheck) {
            existingCheck.remove();
          }
        });
        // Also keep the small card behind the sheet in sync (visible briefly
        // when the user closes the sheet).
        const smallTitle = this.pageWrap.querySelector('.js-card__today-title');
        if (smallTitle) smallTitle.textContent = newText;
        closeLevels();
      };

      // Extreme confirmation modal
      const extremeWarn = this.pageWrap.querySelector('#actionExtremeWarn');
      const extremeWarnBackdrop = this.pageWrap.querySelector('#actionExtremeWarnBackdrop');
      const extremeWarnCancel = this.pageWrap.querySelector('#actionExtremeWarnCancel');
      const extremeWarnConfirm = this.pageWrap.querySelector('#actionExtremeWarnConfirm');
      const openExtremeWarn = () => extremeWarn && extremeWarn.setAttribute('aria-hidden', 'false');
      const closeExtremeWarn = () => extremeWarn && extremeWarn.setAttribute('aria-hidden', 'true');
      if (extremeWarnBackdrop) extremeWarnBackdrop.addEventListener('click', closeExtremeWarn);
      if (extremeWarnCancel) extremeWarnCancel.addEventListener('click', closeExtremeWarn);
      if (extremeWarnConfirm) extremeWarnConfirm.addEventListener('click', () => {
        closeExtremeWarn();
        applyTier('extreme');
      });

      levelMenu.querySelectorAll('.action-today-sheet__level').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const newTier = btn.dataset.level;
          if (!newTier) return;
          // Tapping Extreme triggers the warning modal first, even if it's
          // already the active tier (the warning is the educational moment).
          if (newTier === 'extreme' && state.action.primaryAction.recommendedTier !== 'extreme') {
            closeLevels();
            openExtremeWarn();
            return;
          }
          applyTier(newTier);
        });
      });
    }

    // ===== Refine sheet =====
    const refineBtn = this.pageWrap.querySelector('#actionTodaySheetRefine');
    const refineSheet = this.pageWrap.querySelector('#actionRefineSheet');
    const refineCloseBtn = this.pageWrap.querySelector('#actionRefineSheetClose');
    const refineChat = this.pageWrap.querySelector('#actionRefineChat');
    const refineInput = this.pageWrap.querySelector('#actionRefineInput');
    const refineSend = this.pageWrap.querySelector('#actionRefineSend');
    const refineAccept = this.pageWrap.querySelector('#actionRefineAccept');
    const refineCurrent = this.pageWrap.querySelector('#actionRefineCurrent');

    let refinePendingText = '';
    let refineLoading = false;

    const renderRefineChat = () => {
      if (!refineChat) return;
      const msgs = state.action.refine.messages || [];
      refineChat.innerHTML = msgs.map(m => `
        <div class="action-refine-sheet__bubble action-refine-sheet__bubble--${m.role === 'user' ? 'user' : 'ai'}">${esc(m.text)}</div>
      `).join('');
      if (refineLoading) {
        refineChat.insertAdjacentHTML('beforeend', `<div class="action-refine-sheet__bubble action-refine-sheet__bubble--ai action-refine-sheet__bubble--loading">Thinking...</div>`);
      }
      refineChat.scrollTop = refineChat.scrollHeight;
    };

    const openRefineSheet = () => {
      if (!refineSheet) return;
      if (refineCurrent) refineCurrent.textContent = todayText;
      renderRefineChat();
      if (refineAccept) refineAccept.hidden = !(refinePendingText || (state.action.refine.refinedText && state.action.refine.refinedForTier === pa.recommendedTier));
      refineSheet.setAttribute('aria-hidden', 'false');
      if (refineInput) setTimeout(() => refineInput.focus(), 280);
      // Kick off the AI's opening question if the chat is empty.
      if ((state.action.refine.messages || []).length === 0 && !refineLoading) {
        sendRefineTurn(null);
      }
    };
    const closeRefineSheet = () => {
      if (!refineSheet) return;
      refineSheet.setAttribute('aria-hidden', 'true');
    };

    const _parseRefineResponse = (raw) => {
      try {
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
        const obj = JSON.parse(cleaned);
        return {
          refined: typeof obj.refined === 'string' ? obj.refined.trim() : '',
          question: typeof obj.question === 'string' ? obj.question.trim() : '',
          done: !!obj.done
        };
      } catch (_) {
        return { refined: '', question: raw.trim(), done: false };
      }
    };

    const sendRefineTurn = async (userText) => {
      if (refineLoading) return;
      const ns = (state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) || '';
      const currentText = (state.action.refine.refinedText && state.action.refine.refinedForTier === pa.recommendedTier) ? state.action.refine.refinedText : baseTodayText;
      if (userText) {
        state.action.refine.messages.push({ role: 'user', text: userText });
        persistNow();
        renderRefineChat();
      }
      refineLoading = true;
      renderRefineChat();
      refineSend && (refineSend.disabled = true);

      try {
        const apiMessages = [{
          role: 'user',
          content: `NEUTRON STAR: ${ns}\nCURRENT ACTION: ${currentText}\n\nCONVERSATION SO FAR:\n${state.action.refine.messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n') || '(none yet)'}\n\nReturn the JSON now.`
        }];
        const raw = await callClaude(apiMessages, AI_ACTION_REFINE_SYSTEM_PROMPT, { maxTokens: 400 });
        const parsed = _parseRefineResponse(raw);
        if (parsed.refined) {
          refinePendingText = parsed.refined;
        }
        const aiText = parsed.question || (parsed.done ? "Locked in. Tap 'Use this version' below." : '');
        if (aiText) {
          state.action.refine.messages.push({ role: 'ai', text: aiText });
        }
        persistNow();
        if (refineAccept) refineAccept.hidden = !refinePendingText;
      } catch (err) {
        state.action.refine.messages.push({ role: 'ai', text: 'Connection hiccup. Try again?' });
      } finally {
        refineLoading = false;
        refineSend && (refineSend.disabled = false);
        renderRefineChat();
        if (refineInput) refineInput.focus();
      }
    };

    if (refineBtn) refineBtn.addEventListener('click', openRefineSheet);
    if (refineCloseBtn) refineCloseBtn.addEventListener('click', closeRefineSheet);
    if (refineSheet) {
      refineSheet.addEventListener('click', (e) => { if (e.target === refineSheet) closeRefineSheet(); });
    }
    if (refineInput) {
      refineInput.addEventListener('input', () => {
        refineInput.style.height = 'auto';
        refineInput.style.height = Math.min(refineInput.scrollHeight, 140) + 'px';
      });
      refineInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          refineSend && refineSend.click();
        }
      });
    }
    if (refineSend) {
      refineSend.addEventListener('click', () => {
        const text = (refineInput && refineInput.value || '').trim();
        if (!text || refineLoading) return;
        refineInput.value = '';
        refineInput.style.height = 'auto';
        sendRefineTurn(text);
      });
    }
    if (refineAccept) {
      refineAccept.addEventListener('click', () => {
        const finalText = refinePendingText || state.action.refine.refinedText;
        if (!finalText) return;
        state.action.refine.refinedText = finalText;
        state.action.refine.refinedForTier = pa.recommendedTier;
        persistNow();
        closeRefineSheet();
        // Close the today sheet too so they see the updated text on the mountain.
        if (sheetEl) sheetEl.setAttribute('aria-hidden', 'true');
        this.renderPlan();
      });
    }

    // Milestone sheets: open by clicking the small popup card itself (only the
    // ones with rich content). Close via X / backdrop click.
    const milestoneSheetEls = this.pageWrap.querySelectorAll('.action-milestone-sheet');
    const closeAllMilestoneSheets = () => {
      milestoneSheetEls.forEach(el => el.setAttribute('aria-hidden', 'true'));
    };
    this.pageWrap.querySelectorAll('.js-card--clickable').forEach(card => {
      const openSheet = (e) => {
        e.stopPropagation();
        const idx = card.dataset.milestoneIdx;
        const target = this.pageWrap.querySelector(`#actionMilestoneSheet-${idx}`);
        if (target) {
          closeAllMilestoneSheets();
          target.setAttribute('aria-hidden', 'false');
        }
        // Collapse the small dot card behind it.
        const node = card.closest('.js-node');
        if (node) {
          node.classList.remove('js-node--open');
          node.setAttribute('aria-expanded', 'false');
        }
      };
      card.addEventListener('click', openSheet);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(e); }
      });
    });
    this.pageWrap.querySelectorAll('[data-milestone-close]').forEach(btn => {
      btn.addEventListener('click', closeAllMilestoneSheets);
    });
    milestoneSheetEls.forEach(sheet => {
      sheet.addEventListener('click', (e) => { if (e.target === sheet) closeAllMilestoneSheets(); });
    });

    // Focus Cave: tap the cave entrance below the mountain → open sheet
    const caveEntrance = this.pageWrap.querySelector('#actionCaveEntrance');
    const caveSheet = this.pageWrap.querySelector('#actionCaveSheet');
    const caveSheetClose = this.pageWrap.querySelector('#actionCaveSheetClose');
    const openCaveSheet = () => caveSheet && caveSheet.setAttribute('aria-hidden', 'false');
    const closeCaveSheet = () => caveSheet && caveSheet.setAttribute('aria-hidden', 'true');
    if (caveEntrance) {
      // Cave pill now lives at the bottom-center of the mountain view, not
      // inside the today-dot, so no bubble-stop needed.
      caveEntrance.addEventListener('click', openCaveSheet);
    }
    if (caveSheetClose) caveSheetClose.addEventListener('click', closeCaveSheet);
    if (caveSheet) {
      caveSheet.addEventListener('click', (e) => {
        if (e.target === caveSheet) closeCaveSheet();
      });
    }

    // Mountain quote: click to cycle, x to dismiss
    const quoteEl = this.pageWrap.querySelector('#actionPlanQuote');
    const quoteTextEl = this.pageWrap.querySelector('#actionPlanQuoteText');
    const quoteCloseEl = this.pageWrap.querySelector('#actionPlanQuoteClose');
    if (quoteEl && quoteTextEl) {
      const QUOTES_LEN = 20;
      // Render a quote with the last sentence wrapped in a purple highlight
      // span, matching the initial server-rendered format. Safely escapes
      // text before assembling the innerHTML.
      const renderQuoteHtml = (raw) => {
        const lastDot = raw.lastIndexOf('.');
        if (lastDot > 0 && lastDot < raw.length - 1) {
          const beforeLast = raw.lastIndexOf('.', lastDot - 1);
          if (beforeLast > -1) {
            const head = raw.slice(0, beforeLast + 1).trim();
            const tail = raw.slice(beforeLast + 1).trim();
            return `${esc(head)} <span class="action-plan__quote-keep">${esc(tail)}</span>`;
          }
        }
        return esc(raw);
      };
      const cycleQuote = () => {
        state.action.quote.index = (state.action.quote.index + 1) % QUOTES_LEN;
        persistNow();
        quoteEl.classList.add('is-swapping');
        setTimeout(() => {
          quoteTextEl.innerHTML = renderQuoteHtml(MOUNTAIN_QUOTES[state.action.quote.index]);
          quoteEl.classList.remove('is-swapping');
        }, 180);
      };
      quoteEl.addEventListener('click', (e) => {
        if (e.target.closest('#actionPlanQuoteClose')) return;
        cycleQuote();
      });
      quoteEl.addEventListener('keydown', (e) => {
        if (e.target.closest('#actionPlanQuoteClose')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cycleQuote();
        }
      });
      if (quoteCloseEl) {
        quoteCloseEl.addEventListener('click', (e) => {
          e.stopPropagation();
          state.action.quote.dismissed = true;
          persistNow();
          this.renderPlan();
        });
      }
    }

    // Section refresh handlers
    this.pageWrap.querySelectorAll('.action-plan__refresh').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const field = btn.dataset.field;
        if (!field) return;
        refreshActionSection(field);
      });
    });

    // Round 9: tap a tier to switch recommendation (no AI call).
    this.pageWrap.querySelectorAll('.action-plan__tier').forEach(tile => {
      tile.addEventListener('click', (e) => {
        const tier = tile.dataset.tier;
        if (!tier) return;
        if (state.action.primaryAction.recommendedTier === tier) return;
        state.action.primaryAction.recommendedTier = tier;
        // Clear the AI's per-tier reasoning since it no longer matches.
        state.action.primaryAction.recommendedWhy = '';
        // Clear any refinement tied to the previous tier.
        state.action.refine = { messages: [], refinedText: '', refinedForTier: '' };
        persistNow();
        this.renderPlan();
        renderAll();
      });
    });

    // Round 10: timeframe pill toggle + chip editor + regen banner
    const tfToggle = this.pageWrap.querySelector('#actionPlanTfToggle');
    if (tfToggle) {
      tfToggle.addEventListener('click', () => {
        actionTimeframeEditing = !actionTimeframeEditing;
        this.renderPlan();
      });
    }
    this.pageWrap.querySelectorAll('#actionPlanTfChips .action-plan__when-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const v = chip.dataset.tf;
        if (!v) return;
        if (state.clarity.answers.timeframe === v) return;
        state.clarity.answers.timeframe = v;
        actionPlanStale = true;
        actionTimeframeEditing = false;
        persistNow();
        this.renderPlan();
      });
    });
    const customInput = this.pageWrap.querySelector('#actionPlanTfCustom');
    if (customInput) {
      customInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = String(customInput.value || '').trim();
        if (v.length < 1) return;
        state.clarity.answers.timeframe = v;
        actionPlanStale = true;
        actionTimeframeEditing = false;
        persistNow();
        this.renderPlan();
      });
    }
    this.pageWrap.querySelector('#actionPlanRegen')?.addEventListener('click', () => {
      actionPlanStale = false;
      state.action.planGenerated = false;
      state.action.planSourceNeutronStar = '';
      persistNow();
      generateActionDraft();
    });

    this.pageWrap.querySelector('#actionPlanReset')?.addEventListener('click', () => {
      state.action.planGenerated = false;
      state.action.primaryAction = { title: '', why: '', path: [], tiers: { tiny: '', light: '', moderate: '', heavy: '', extreme: '' }, recommendedTier: 'moderate', recommendedWhy: '', howToStart: '' };
      state.action.supportingActions = [];
      state.action.focusPlan = { frame: '', frictionRemove: [], frictionAdd: [] };
      state.action.aiConversation = [];
      actionChatMessages = [];
      actionChatCurrentQuestion = '';
      actionChatCurrentType = 'text';
      actionChatCurrentOptions = [];
      actionChatReady = false;
      actionChatError = null;
      persistNow();
      this.renderActionChat();
    });
  },

  render() {
    if (state.action.tutorialSeen) {
      this.renderContent();
      return;
    }
    this.renderPage(this.currentPage);
    this.updateProgress();
    this.updateNav();
  },

  next() {
    if (this.transitioning || state.action.tutorialSeen) return;
    const total = this.getIntroPages().length;
    if (this.currentPage >= total - 1) {
      state.action.tutorialSeen = true;
      persistNow();
      this.renderContent();
      return;
    }
    this.transitionTo(this.currentPage + 1);
  },

  back() {
    if (this.transitioning || state.action.tutorialSeen) return;
    if (this.currentPage <= 0) {
      state.action.introSeen = false;
      persistNow();
      this._showActionIntro();
      return;
    }
    this.transitionTo(this.currentPage - 1);
  },

  transitionTo(newPage) {
    this.transitioning = true;
    const inner = this.pageWrap.querySelector('.action-exp__page-inner');
    if (inner) inner.classList.add('exit');
    setTimeout(() => {
      this.currentPage = newPage;
      this.renderPage(this.currentPage);
      this.updateProgress();
      this.updateNav();
      this.transitioning = false;
    }, 220);
  },

  updateProgress() {
    this.progressEl.innerHTML = '';
  },

  updateNav() {
    if (state.action.tutorialSeen) {
      this.navEl.innerHTML = '';
      return;
    }
    const isLast = this.currentPage === this.getIntroPages().length - 1;
    let html = '<button class="action-exp__nav-btn action-exp__nav-btn--back" id="aexpBack">Back</button>';
    html += `<button class="action-exp__nav-btn ${isLast ? 'action-exp__nav-btn--cta' : 'action-exp__nav-btn--next'}" id="aexpNext">${isLast ? 'Enter Action' : 'Continue'}</button>`;
    this.navEl.innerHTML = html;
    const nextBtn = document.getElementById('aexpNext');
    const backBtn = document.getElementById('aexpBack');
    if (nextBtn) nextBtn.addEventListener('click', () => this.next());
    if (backBtn) backBtn.addEventListener('click', () => this.back());
  }
};

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
    if (blob && typeof initStarBlob === 'function') { setTimeout(() => initStarBlob(blob), 40); }
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
  try { if (typeof writeProofEvent === 'function') writeProofEvent('proof', { title: 'Ignition', text: 'Ignited their Neutron Star', module: 'clarity' }); } catch (e) {}

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
        ClarityExperience.navEl.innerHTML = '';
        requestAnimationFrame(() => initNeutronStarCard(ClarityExperience.pageWrap, () => { ClarityExperience.isOpen = false; ClarityExperience.open(); }));
        ClarityExperience.bindWizardInFullscreen();
      }
    } catch (e) {}
  }, lite ? 900 : 2100);
}

/* ============================================================
   IGNITION v2 - "Monument -> Contract -> Star"
   The redesigned Clarity ending. v1 (above) stays intact;
   routing is decided by clarityEndingVersion() below.
     Act 1 MONUMENT: the goal typeset huge. "Is this exactly it?"
       -> Not quite: AI-assisted sharpening loop (user is judge).
       -> That's it: a one-tap want-to/should check, then on.
     Act 2 CONTRACT: document scale, dated, if-then clause,
       "Sign it so you can't unsay it", thumbprint press-and-hold.
     Act 3 STAR: the ink collapses, the star ignites (quiet
       majesty: JWST palette, diffraction spikes, halation),
       registry placard with AI-proposed name + rename, and an
       optional letter coda sealed into the star.
   Every star is unique: deterministic hash of the goal text
   drives temperature, spike angle, and designation.
   ============================================================ */

// 'off' = the original flow (no ceremony, straight to the summary card).
// The v1/v2 ceremony experiments remain available via ?ending=v1 / ?ending=v2.
const CLARITY_ENDING_VERSION = 'off';
function clarityEndingVersion() {
  // 'v2' = Monument/Contract/Star ceremony (current), 'v1' = first ceremony,
  // 'off' = the ORIGINAL flow: no ceremony at all, straight to the summary card.
  try {
    const m = /[?&]ending=(v1|v2|off)/.exec(location.search);
    if (m) return m[1];
  } catch (e) {}
  return CLARITY_ENDING_VERSION;
}

let _ig2Act = 'monument';   // monument | sharpen | want | contract | star
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

function renderIgnitionV2(summary) {
  _ig2.summary = summary || {};
  const s = _ig2.summary;
  const goal = _ig2.goal || s.neutronStar || '';
  const seed = starSeedFromGoal(goal);
  let inner = '';

  if (_ig2Act === 'monument') {
    inner = `
      <div class="nsv2-monument">
        <div class="nsv2-eyebrow">Your Neutron Star</div>
        <div class="nsv2-monument__goal">${esc(goal)}</div>
        <div class="nsv2-monument__ask">Read it slowly. Is this exactly it?<br>Would you recognize the day this comes true?</div>
        <div class="nsv2-monument__btns">
          <button type="button" class="nsv2-btn nsv2-btn--primary" id="nsv2Yes">That's it</button>
          <button type="button" class="nsv2-btn nsv2-btn--ghost" id="nsv2No">Not quite</button>
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
  } else if (_ig2Act === 'want') {
    inner = `
      <div class="nsv2-want">
        <div class="nsv2-eyebrow">Be honest</div>
        <div class="nsv2-want__q">Do you want this, or do you feel you should want it?</div>
        <div class="nsv2-monument__btns">
          <button type="button" class="nsv2-btn nsv2-btn--primary" data-want="want">I want this</button>
          <button type="button" class="nsv2-btn nsv2-btn--ghost" data-want="should">I feel I should</button>
        </div>
        <div class="nsv2-want__note" id="nsv2WantNote" hidden>
          "Should" is usually somebody else's voice. Worth noticing whose. We will work with what is true.
          <button type="button" class="nsv2-btn nsv2-btn--primary" id="nsv2WantGo">Continue</button>
        </div>
      </div>`;
  } else if (_ig2Act === 'contract') {
    const today = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
    const a = (state.clarity && state.clarity.answers) || {};
    const cueDefault = _ig2.cue !== undefined ? _ig2.cue : (a.doomscrollWhen || a.biggestBlocker || '');
    inner = `
      <div class="nsv2-contract">
        <div class="nsv2-eyebrow">The contract</div>
        <div class="nsv2-doc">
          <div class="nsv2-doc__date">${esc(today)}</div>
          <div class="nsv2-doc__goal">${esc(goal)}</div>
          <div class="nsv2-doc__rule"></div>
          <div class="nsv2-doc__clause-label">Contingency clause</div>
          <div class="nsv2-doc__clause">
            <label class="nsv2-doc__field"><span>When</span>
              <input type="text" id="nsv2Cue" maxlength="120" placeholder="the moment it usually goes wrong" value="${esc(cueDefault)}"></label>
            <label class="nsv2-doc__field"><span>I will</span>
              <input type="text" id="nsv2Act" maxlength="120" placeholder="one physical action I can always take" value="${esc(_ig2.act || '')}"></label>
          </div>
          <div class="nsv2-doc__truth">This was already true. You just had not said it out loud yet.</div>
          <div class="nsv2-doc__sign-row">
            <div class="nsv2-thumb" id="nsv2Thumb" role="button" aria-label="Press and hold to sign">
              <svg viewBox="0 0 64 80" aria-hidden="true">
                <g class="nsv2-thumb__print" fill="none" stroke-linecap="round">
                  <ellipse cx="32" cy="40" rx="22" ry="30"/>
                  <ellipse cx="32" cy="40" rx="16.5" ry="23"/>
                  <ellipse cx="32" cy="40" rx="11" ry="16"/>
                  <ellipse cx="32" cy="41" rx="6" ry="9"/>
                  <path d="M32 18 v-6 M14 30 l-5 -4 M50 30 l5 -4 M14 52 l-5 4 M50 52 l5 4"/>
                </g>
                <rect class="nsv2-thumb__ink" x="0" y="80" width="64" height="80"/>
              </svg>
            </div>
            <div class="nsv2-doc__sign-hint" id="nsv2SignHint">Sign it so you can't unsay it.<br><span>Press and hold.</span></div>
          </div>
        </div>
      </div>`;
  } else {
    // _ig2Act === 'star'
    const name = (state.clarity.answers && state.clarity.answers.starName) || '';
    const ignDate = new Date(state.clarity.ignitedAt || Date.now()).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    // JWST anatomy: three long primary spike axes (hex mirror) + one shorter
    // horizontal strut pair, each with a faint chromatic fringe twin.
    const spikeEls = [];
    const primary = [90, 30, 150].map(b => b + seed.spikeAngle);
    primary.forEach(ang => {
      spikeEls.push(`<div class="nsv2-star__spike nsv2-star__spike--primary" style="transform: translate(-50%,-50%) rotate(${ang}deg)"></div>`);
      spikeEls.push(`<div class="nsv2-star__spike nsv2-star__spike--primary nsv2-star__spike--fringe" style="transform: translate(-50%,-50%) rotate(${ang}deg) translateY(1.4px); background: linear-gradient(90deg, transparent, ${seed.fringe}, transparent);"></div>`);
    });
    const strutAng = seed.spikeAngle * 0.4;
    spikeEls.push(`<div class="nsv2-star__spike nsv2-star__spike--strut" style="transform: translate(-50%,-50%) rotate(${strutAng}deg)"></div>`);
    spikeEls.push(`<div class="nsv2-star__spike nsv2-star__spike--strut nsv2-star__spike--fringe" style="transform: translate(-50%,-50%) rotate(${strutAng}deg) translateY(1.2px); background: linear-gradient(90deg, transparent, ${seed.fringe}, transparent);"></div>`);
    inner = `
      <div class="nsv2-starscene" style="--star-glow: ${seed.glowRgb}; --star-core: ${seed.core};">
        <div class="nsv2-star" aria-hidden="true">
          <div class="nsv2-star__halo nsv2-star__halo--far"></div>
          <div class="nsv2-star__halo nsv2-star__halo--mid"></div>
          <div class="nsv2-star__halo nsv2-star__halo--near"></div>
          ${spikeEls.join('')}
          <div class="nsv2-star__core"></div>
        </div>
        <div class="nsv2-placard">
          <button type="button" class="nsv2-placard__name" id="nsv2Name" title="Rename your star">${name ? esc(name) : '<span class="nsv2-placard__name-pending">Naming...</span>'}</button>
          <div class="nsv2-placard__goal">&ldquo;${esc(goal)}&rdquo;</div>
          <div class="nsv2-placard__rule"></div>
          <div class="nsv2-placard__meta">
            <span><i>Designation</i>${esc(seed.designation)}</span>
            <span><i>Class</i>${esc(seed.cls)} &middot; ${seed.kelvin.toLocaleString()} K</span>
            <span><i>Ignited</i>${esc(ignDate)}</span>
            <span><i>Status</i>SIGNED</span>
          </div>
          <div class="nsv2-placard__actions">
            <button type="button" class="nsv2-btn nsv2-btn--ghost" id="nsv2Letter">Seal a sentence into the star</button>
            <button type="button" class="nsv2-btn nsv2-btn--primary" id="nsv2Done">Continue</button>
          </div>
          <div class="nsv2-letter" id="nsv2LetterBox" hidden>
            <textarea class="nsv2-letter__input" id="nsv2LetterText" maxlength="240" rows="2" placeholder="To the person orbiting this star in 90 days..."></textarea>
            <button type="button" class="nsv2-btn nsv2-btn--primary" id="nsv2LetterSeal">Seal it for 90 days</button>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="nsv2" id="nsv2Root" data-act="${esc(_ig2Act)}">
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

  if (act === 'monument') {
    const yes = root.querySelector('#nsv2Yes');
    const no = root.querySelector('#nsv2No');
    if (yes) yes.addEventListener('click', () => { _ig2Act = 'want'; _ig2Rerender(); });
    if (no) no.addEventListener('click', () => { _ig2Act = 'sharpen'; _ig2Rerender(); });
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
      _ig2Act = 'monument';
      _ig2Rerender();
    });
  } else if (act === 'want') {
    root.querySelectorAll('[data-want]').forEach(btn => btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-want');
      a.wantTo = v;
      try { persistNow(); } catch (e) {}
      if (v === 'should') {
        const note = root.querySelector('#nsv2WantNote');
        root.querySelectorAll('[data-want]').forEach(b => b.classList.toggle('is-on', b === btn));
        if (note) { note.hidden = false; const go = note.querySelector('#nsv2WantGo'); if (go) go.addEventListener('click', () => { _ig2Act = 'contract'; _ig2Rerender(); }); }
      } else {
        _ig2Act = 'contract'; _ig2Rerender();
      }
    }));
  } else if (act === 'contract') {
    const cue = root.querySelector('#nsv2Cue');
    const actI = root.querySelector('#nsv2Act');
    if (cue) cue.addEventListener('input', () => { _ig2.cue = cue.value; });
    if (actI) actI.addEventListener('input', () => { _ig2.act = actI.value; });
    _bindThumbSign(root);
  } else if (act === 'star') {
    _bindStarPlacard(root);
  }
}

function _bindThumbSign(root) {
  const thumb = root.querySelector('#nsv2Thumb');
  const ink = root.querySelector('.nsv2-thumb__ink');
  const hint = root.querySelector('#nsv2SignHint');
  if (!thumb || !ink) return;
  const HOLD_MS = 2200;
  let raf = null, start = 0, done = false;
  const setP = (p) => { ink.setAttribute('y', String(80 - 80 * p)); };
  const tick = (t) => {
    if (done) return;
    const p = Math.min(1, (t - start) / HOLD_MS);
    setP(p);
    if (p >= 1) { done = true; _ig2Signed(root); return; }
    raf = requestAnimationFrame(tick);
  };
  const begin = (e) => {
    if (done) return;
    e.preventDefault();
    root.classList.add('is-signing');
    start = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const cancel = () => {
    if (done) return;
    root.classList.remove('is-signing');
    if (raf) cancelAnimationFrame(raf);
    setP(0);
  };
  thumb.addEventListener('pointerdown', begin);
  document.addEventListener('pointerup', cancel);
  document.addEventListener('pointercancel', cancel);
}

function _ig2Signed(root) {
  // Persist the clause + the signature, then collapse into ignition.
  const a = (state.clarity && state.clarity.answers) || {};
  const cue = (_ig2.cue || '').trim();
  const actv = (_ig2.act || '').trim();
  if (cue && actv) a.ifThen = { cue, action: actv, setAt: Date.now() };
  state.clarity.ignitedAt = Date.now();
  try { persistNow(); } catch (e) {}
  try { if (typeof writeProofEvent === 'function') writeProofEvent('proof', { title: 'Ignition', text: 'Signed and ignited their Neutron Star', module: 'clarity' }); } catch (e) {}

  const lite = document.documentElement.classList.contains('lowfx')
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.classList.add(lite ? 'is-collapsing-lite' : 'is-collapsing');
  const flare = document.createElement('div');
  flare.className = 'nsv2__flare';
  root.appendChild(flare);

  // Ask the AI for a star name in parallel with the flare (placard shows
  // "Naming..." then fills in; offline it quietly stays designation-led).
  _ig2.nameRequested = false;

  setTimeout(() => {
    _ig2Act = 'star';
    _ig2Rerender();
    _ig2RequestName();
  }, lite ? 700 : 1700);
}

function _ig2RequestName() {
  if (_ig2.nameRequested) return;
  _ig2.nameRequested = true;
  const a = (state.clarity && state.clarity.answers) || {};
  if (a.starName) return;
  Promise.resolve()
    .then(() => proposeStarNameAI(a))
    .then(name => {
      if (name) { a.starName = name; try { persistNow(); } catch (e) {} }
      const el = document.getElementById('nsv2Name');
      if (el) el.innerHTML = name ? esc(name) : '<span class="nsv2-placard__name-pending">Name your star</span>';
    })
    .catch(() => {
      const el = document.getElementById('nsv2Name');
      if (el) el.innerHTML = '<span class="nsv2-placard__name-pending">Name your star</span>';
    });
}

function _bindStarPlacard(root) {
  const a = (state.clarity && state.clarity.answers) || {};
  const nameBtn = root.querySelector('#nsv2Name');
  if (nameBtn) nameBtn.addEventListener('click', () => {
    const cur = a.starName || '';
    const input = document.createElement('input');
    input.type = 'text'; input.maxLength = 40; input.value = cur;
    input.className = 'nsv2-placard__name-input';
    nameBtn.replaceWith(input);
    input.focus(); input.select();
    const commit = () => {
      const v = input.value.trim();
      if (v) { a.starName = v; try { persistNow(); } catch (e) {} }
      _ig2Rerender();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
  });
  const letterBtn = root.querySelector('#nsv2Letter');
  const letterBox = root.querySelector('#nsv2LetterBox');
  if (letterBtn && letterBox) letterBtn.addEventListener('click', () => {
    letterBox.hidden = !letterBox.hidden;
    if (!letterBox.hidden) { const t = letterBox.querySelector('#nsv2LetterText'); if (t) t.focus(); }
  });
  const seal = root.querySelector('#nsv2LetterSeal');
  if (seal) seal.addEventListener('click', () => {
    const t = root.querySelector('#nsv2LetterText');
    const txt = ((t && t.value) || '').trim();
    if (txt) {
      state.clarity.letter = { text: txt, sealedAt: Date.now(), opensAt: Date.now() + 90 * 24 * 60 * 60 * 1000 };
      try { persistNow(); } catch (e) {}
    }
    if (letterBox) { letterBox.hidden = true; }
    if (letterBtn) { letterBtn.textContent = txt ? 'Sealed. Opens in 90 days.' : letterBtn.textContent; letterBtn.disabled = !!txt; }
  });
  const doneBtn = root.querySelector('#nsv2Done');
  if (doneBtn) doneBtn.addEventListener('click', () => {
    _ig2Act = 'monument'; _ig2 = {};
    try { const r = document.getElementById('nsv2Root'); if (r) r.remove(); } catch (e) {}
    try {
      if (ClarityExperience && ClarityExperience.isOpen) {
        const summary = normalizeClaritySummary(state.clarity.answers);
        ClarityExperience.pageWrap.innerHTML = `<div class="clarity-exp__page-inner clarity-exp__page-inner--summary">${renderNeutronStarSummary(summary, { allowContinue: true, showRestart: true })}</div>`;
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
// v2 ending end-to-end with the demo persona's answers, without redoing the
// wizard. Clears ignitedAt for this session only (demo data is throwaway).
(function () {
  try {
    if (!/[?&]ceremony=1/.test(location.search)) return;
    const boot = () => {
      setTimeout(() => {
        try {
          if (typeof DEMO_MODE === 'undefined' || !DEMO_MODE) return;
          state.clarity.ignitedAt = null;
          _ig2Act = 'monument'; _ig2 = {};
          const summary = normalizeClaritySummary(state.clarity.answers);
          ClarityExperience.isOpen = true;
          if (typeof FullscreenClose !== 'undefined' && FullscreenClose.show) FullscreenClose.show('clarity');
          ClarityExperience.el.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
          try { TabBar.hide(); } catch (e) {}
          ClarityExperience.el.classList.add('open-bg');
          ClarityExperience.el.classList.add('open-bg-visible');
          ClarityExperience.el.classList.add('open-content');
          ClarityExperience.pageWrap.innerHTML = '<div class="clarity-exp__page-inner clarity-exp__page-inner--summary">' + renderIgnitionV2(summary) + '</div>';
          ClarityExperience.navEl.innerHTML = '';
          bindIgnitionV2(document);
        } catch (e) {}
      }, 1400);
    };
    if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
    else document.addEventListener('DOMContentLoaded', boot);
  } catch (e) {}
})();
