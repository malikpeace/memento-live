/* ============================================================================
   LEGACY ACTION (quarantined v1318, Malik). This is the OLD Action module,
   moved OUT of js/02-clarity-experience.js byte for byte, nothing edited.

   It is not reachable by any user: js/30 replaces ActionExperience.open with
   a redirect into the new flow, so every button, tile and menu that still
   names the old door opens the new one. Only ?dev=action-states reaches this
   code, and that dev browser exists to render these states.

   It sits here, alone, so its deletion can be proved not to touch Clarity.
   Loaded immediately after js/02 to preserve the exact definition order it
   had inside that file.
   ========================================================================= */

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

  // v855 (Malik's dim screen): the open choreography (open-bg -> rAF ->
  // open-content -> timer -> open) uses rAF and timers that iOS SUSPENDS when
  // the app backgrounds; returning mid-choreography stranded the surface
  // between states at partial opacity. This settles it: whenever we are open
  // but not fully 'open', snap to the stable end state. Called on every
  // resume and at the start of every content render.
  // v864: tracked timers (mirrors ClarityExperience), cleared on close so the
  // recap typewriter can't keep ticking into a closed module.
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

  // v879 (Malik: "whatever Clarity does, do THAT"): the intake input uses
  // the EXACT keyboard recipe Clarity/onboarding use, bindKeyboardSettle,
  // the v523-v527 on-device-tuned settle (let iOS shove, wait for quiet,
  // glide back in one compositor motion, caret hidden during the glide).
  // Its precondition, a HIGH field, holds since v878 (input bottom ~37%).
  // No KeyboardPin here; Clarity doesn't shrink its overlay and neither do we.
  _bindIntakeKeyboardKeep(field) {
    try {
      if (field && typeof bindKeyboardSettle === 'function') bindKeyboardSettle(this, field);
    } catch (e) {}
  },

  _settleOpenState() {
    try {
      if (!this.isOpen || !this.el) return;
      // v861: an open choreography is legitimately in flight for the first
      // ~2s (settle timer pending). Force-settling then killed every open
      // animation (the "instant pop"). Past that window, a pending timer
      // means iOS froze mid-open, so settle as before.
      if (Date.now() - (this._openedAt || 0) < 2000) return;
      if (!this.el.classList.contains('open')) {
        this.el.classList.add('open');
        this.el.classList.remove('open-bg', 'open-bg-visible', 'open-content');
        const app = document.getElementById('app');
        if (app) { app.style.transition = ''; }
      }
    } catch (e) {}
  },

  init() {
    this.el = document.getElementById('actionExp');
    this.pageWrap = document.getElementById('actionExpPageWrap');
    this.progressEl = document.getElementById('actionExpProgress');
    this.navEl = document.getElementById('actionExpNav');
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') setTimeout(() => this._settleOpenState(), 250);
    });
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

  // v1111: DELETED, the five-page Action tutorial deck ("Without action,
  // literally nothing matters", "Most people stay busy", "Action is where
  // your focus should go", "Not all action is created equal", "Now we find
  // your next moves") and its illustrations. The module's real explainer is
  // _showActionIntro below ("Clarity gave you the what. This is the how.").
  // The deck was unreachable by design but not by accident: any regeneration
  // calls refreshActionSurface -> ActionExperience.render(), which painted
  // this deck whenever an old tutorialSeen flag was still false. That is how
  // Malik hit it from "Not this action" inside a live module.


  open() {
    if (this.isOpen) return;
    // THE WALL (v1056, Malik): no Clarity, no Action. Ever. This is above the
    // paywall check on purpose: the paywall gates on PAYMENT, so a paid
    // account with no star sailed straight through it, and a stale saved
    // view ("action" in state.ui.lastView from dev poking) then reopened the
    // intake on every single boot, landing him on a verdict screen for a
    // star he never set. Action's whole premise is "a plan built from your
    // star"; without the star there is nothing to build from, so the door
    // simply is not there. Also scrub the saved view so the boot restore
    // stops retrying it forever.
    if (!(state.clarity && state.clarity.completed)) {
      try { rememberView(null); } catch (e) {}
      return;
    }
    // Paywall gate: Action is paid. This is the "Build my plan" moment the
    // evolved card hands off to. The FIRST time, future-pace through the First
    // 7 Days screen for EVERYONE (it is the trust timeline, not the sell), then
    // branch: already paid (early buyer) goes straight into Action with no
    // paywall ever shown; unpaid gets the ask (Malik v676 + v792 prepaid path).
    try {
      if (typeof ClarityPaywall !== 'undefined') {
        state.meta = state.meta || {};
        const clarityDone = !!(state.clarity && state.clarity.completed);
        if (clarityDone && typeof showNext7Days === 'function' && !state.meta.next7DaysSeen) {
          state.meta.next7DaysSeen = true;
          try { persistNow(); } catch (e) {}
          showNext7Days(() => {
            try {
              if (ClarityPaywall.isPaid()) ActionExperience.open();
              else if (ClarityPaywall.show) ClarityPaywall.show();
            } catch (e) {}
          });
          return;
        }
        if (ClarityPaywall.isLockedByPaywall('action')) { ClarityPaywall.show(); return; }
      }
    } catch (e) {}
    this.isOpen = true;
    this._openedAt = Date.now();
    this._recapTyped = false;
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
    this.el.classList.add('open-bg');
    requestAnimationFrame(() => this.el.classList.add('open-bg-visible'));

    // Gate order: intro → intake (5 questions) → plan. The user has to
    // complete the intake before they can see the mountain, even on reload.
    const intakeDone = state.action.intake && state.action.intake.completed;
    // v606 (Malik): arriving HOT from the ignition ceremony, no intro deck.
    // "A star is not a plan" was the promise; the next screen is the plan.
    const _hotIgnition = !!(state.clarity && state.clarity.completed && state.clarity.ignitedAt
      && (Date.now() - state.clarity.ignitedAt) < 30 * 60 * 1000);
    if (!state.action.introSeen && _hotIgnition && !intakeDone) {
      state.action.introSeen = true;
      state.action.tutorialSeen = true;
      try { persistNow(); } catch (e) {}
    }
    if (!state.action.introSeen) {
      this._showActionIntro();
    } else if (!intakeDone) {
      this._showActionIntake();
    } else {
      this.renderContent();
    }
    // v861: open-content must land AFTER a painted frame of the hidden
    // open-bg state, or the content transitions never run and the module
    // pops in instantly (the "cheap" open Malik flagged). Double rAF
    // guarantees one real paint in between.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this.isOpen) this.el.classList.add('open-content');
    }));
    this._settleTimer = setTimeout(() => {
      if (!this.isOpen) return;
      this.el.classList.add('open');
      this.el.classList.remove('open-bg', 'open-bg-visible', 'open-content');
      this._settleTimer = null;
    }, 950);
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._paintedPreview = null;
    this._clearTimers();
    try { delete this.el.dataset.heat; } catch (e) {}
    if (this._aheatResize) { try { window.removeEventListener('resize', this._aheatResize); } catch (e) {} this._aheatResize = null; }
    try { if (typeof KeyboardPin !== 'undefined') KeyboardPin.release(this.el); } catch (e) {}
    if (this._kbSettleCleanup) { try { this._kbSettleCleanup(); } catch (e) {} this._kbSettleCleanup = null; }
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
        // Home is front again: re-render the day card so a pending first-white
        // ceremony (deferred while this view covered it) plays where the user
        // can actually see it. No-op after the flag is set.
        try {
          if (state.meta && !state.meta.firstWhiteShown && typeof renderDayCard === 'function') renderDayCard();
        } catch (e) {}
      }
    }, 280);
  },

  _showActionIntro() {
    this.progressEl.innerHTML = '';
    this.navEl.innerHTML = '';
    // Night 3, unlock beat v1: the FIRST paid arrival gets a two-second
    // ignition, one word on black, before Action fades in. Decorative flag
    // set at start; a killed beat lands on the intro, never ahead of it.
    let _hasVerifiedActionAccess = false;
    try {
      _hasVerifiedActionAccess = (typeof ClarityPaywall !== 'undefined') && ClarityPaywall.isPaid();
    } catch (e) {}
    if (_hasVerifiedActionAccess && !(state.meta && state.meta.unlockBeatSeen)) {
      state.meta = state.meta || {};
      state.meta.unlockBeatSeen = true;
      try { persistNow(); } catch (e) {}
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        this.pageWrap.innerHTML = `
          <div class="action-exp__page-inner"><div class="action-exp__inner action-cine-reveal">
            <div class="action-ignite">Unlocked.</div>
          </div></div>`;
        try { if (typeof MementoSound !== 'undefined' && MementoSound.chime) MementoSound.chime(); } catch (e) {}
        this._setTimeout(() => { if (this.isOpen) this._showActionIntro(); }, 2100);
        return;
      }
    }
    // v842 (Malik): the Action intro speaks Clarity's exact language: same
    // classes (same stylesheet), the title pops in centered + blurry, focuses,
    // flies to its top-left spot, THEN the lines typewrite in char-by-char and
    // the Begin button reveals PINNED at the bottom. Tap anywhere skips.
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner">
        <div class="clarity-intro" id="actionIntro">
          <div class="clarity-intro__body">
            <div class="clarity-intro__title"><span class="clarity-intro__title-in" id="actionIntroTitle">Action</span></div>
            <div class="clarity-intro__lines">
              <div class="clarity-intro__line">Clarity gave you the what. This is the how.</div>
              <div class="clarity-intro__line">There are two kinds of action. Cheap action: busy, comfortable, feels productive, moves nothing. Most people live there.</div>
              <div class="clarity-intro__line">And high-leverage action: the few moves that actually change your position. Usually there is one that makes everything else easier or unnecessary.</div>
              <div class="clarity-intro__line">This module finds the highest-leverage action you can actually do. So there is zero excuse left: you will know exactly what to do, and it will be doable.</div>
            </div>
          </div>
          <div class="clarity-intro__foot" id="actionIntroFoot">
            <button class="clarity-intro__btn" id="actionIntroBtn">Begin</button>
          </div>
        </div>
      </div>`;

    const intro = document.getElementById('actionIntro');
    const lines = [...intro.querySelectorAll('.clarity-intro__line')];
    const foot = document.getElementById('actionIntroFoot');
    const title = document.getElementById('actionIntroTitle');
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

    // Reserve each line's wrapped height so the stack never jumps, then empty them.
    lines.forEach((l) => { l.dataset.full = l.textContent; l.style.minHeight = l.offsetHeight + 'px'; l.textContent = ''; });

    let done = false;
    const skipAll = () => {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      if (title) { title.style.transition = 'none'; title.style.transform = ''; title.style.filter = ''; title.style.opacity = '1'; }
      lines.forEach((l) => { l.textContent = l.dataset.full || ''; });
      if (foot) foot.classList.add('show');
    };

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
          if (i <= full.length) later(tick, 11 + Math.random() * 9);
          else later(() => typeLine(idx + 1), 900);
        };
        tick();
      };
      typeLine(0);
    };

    // Tap anywhere (except Begin) skips to the finished state, both events so
    // mobile Safari fires immediately on touch.
    const skipTap = (e) => {
      if (e.target.closest && e.target.closest('#actionIntroBtn')) return;
      skipAll();
    };
    intro.addEventListener('pointerdown', skipTap);
    intro.addEventListener('click', skipTap);

    if (reduced || !title) {
      if (title) title.style.opacity = '1';
      if (reduced) skipAll(); else typeAll();
    } else {
      // The Clarity title choreography, verbatim timings: centered + blurred,
      // fade in holding the blur, focus while growing, hold, fly to the spot.
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
      later(() => {
        if (done) return;
        title.style.transition = 'opacity 0.7s ease, transform 1.6s cubic-bezier(0.16,1,0.3,1)';
        title.style.opacity = '1';
        title.style.transform = `translate(${dx}px, ${dy}px) scale(1.28)`;
      }, 60);
      later(() => {
        if (done) return;
        title.style.transition = 'filter 1s ease, transform 1s cubic-bezier(0.16,1,0.3,1)';
        title.style.filter = 'blur(0px)';
        title.style.transform = `translate(${dx}px, ${dy}px) scale(1.5)`;
      }, 1150);
      later(() => {
        if (done) return;
        title.style.transition = 'transform 0.85s cubic-bezier(0.16,1,0.3,1)';
        title.style.transform = 'translate(0px, 0px) scale(1)';
      }, 4150);
      later(() => {
        if (done) return;
        title.style.transition = ''; title.style.transform = ''; title.style.filter = ''; title.style.transformOrigin = ''; title.style.willChange = '';
        typeAll();
      }, 5100);
    }

    document.getElementById('actionIntroBtn').addEventListener('click', () => {
      skipAll();
      intro.classList.add('clarity-intro--exit');
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
  // v830: the prefilled confirmations (goal + timeframe from Clarity), shown
  // above the conversation as quiet editable facts instead of gate questions.
  // Tapping one drops a plain request into the conversation; the AI handles
  // the change in one turn and the snapshot mirror updates this strip.
  // v843 (Malik): the intake opens as a BRIEF, not a bare strip. Their star
  // restated with its timeframe and committed time (all from Clarity, tappable
  // to change), then the leverage framing: most action is busywork, we are
  // hunting the one move that makes the rest easier or unnecessary.
  // v845 (Malik's flow, his words): after the intro, remind them of the
  // mission and CONFIRM it, then the doors. Beat 1: "You said your mission
  // is... right?" with one confirm button. Beat 2: the question-first doors
  // (his I5 pick): do you already know the move, know it / find it for me.
  _renderIntakeBrief() { /* replaced by the beat sequence (v845) */ },

  // ============================================================
  // v871: THE DETERMINISTIC INTAKE RENDERER (Malik's full-flush sweep).
  // The intake previously had three rendering systems fighting (hidden
  // transcript restore, incremental stack clones, direct beat renders),
  // which produced mis-ordered/duplicated screens on resume. Now ONE view
  // model is derived purely from persisted state and ONE renderer paints
  // it; open, resume, settle, back, and question-landed all route here.
  // ============================================================

  // Pure derivation: what should be on screen, from state alone.
  _deriveIntakeView() {
    const intake = state.action.intake || {};
    const ca = (state.clarity && state.clarity.answers) || {};
    const goal = (ca.neutronStar || '').trim();
    const msgs = (intake.aiMessages || []).filter(m => m && !/^User picked "/.test(m.content || ''));
    // Fold messages into question/answer exchanges.
    const pairs = [];
    msgs.forEach((m) => {
      if (m.role === 'assistant') {
        let t = m.content;
        try { const o = JSON.parse(t); if (o && o.question) t = o.question; } catch (e) {}
        pairs.push({ q: t, a: '' });
      } else if (pairs.length) {
        pairs[pairs.length - 1].a = m.content;
      }
    });
    const last = msgs[msgs.length - 1];
    let mode;
    if (!msgs.length) mode = (this._doorsLive || !goal) ? 'doors' : 'summary';
    else if (last.role === 'user') mode = 'thinking';
    else mode = 'question';
    // Past items: v876 (Malik): the recap NEVER enters the history, the
    // conversation's history starts at the doors question. The live exchange
    // stays out of the past.
    const past = [];
    const pastPairs = (mode === 'question') ? pairs.slice(0, -1) : pairs;
    pastPairs.forEach(p => past.push({ kind: 'qa', q: p.q, a: p.a }));
    // Current question metadata (aiHistory tail wins, matching the live path).
    let current = null;
    if (mode === 'question') {
      let q = pairs[pairs.length - 1].q, type = 'text', options = [], counter = '';
      const h = (intake.aiHistory || [])[(intake.aiHistory || []).length - 1];
      if (h && h.message) { q = h.message; type = h.type || 'text'; options = h.options || []; counter = h.counter || ''; }
      // Night 3: chips are real again (chips = options + a custom row). The
      // fixed-screen script chooses types deliberately, nothing to demote.
      current = { question: q, type, options, counter };
    }
    return { mode, past, current, goal };
  },

  // v1019 (Malik sent a screenshot of a lone dot stranded at the top of an
  // empty screen): the waiting state is a BEAT like every other one. Wrapping
  // it in the beat skeleton puts the dot exactly where the question line it is
  // replacing would sit, instead of pinned to the top of the page. One helper,
  // used by all three render sites, so they can never drift apart again.
  _thinkingBeatHtml() {
    return '<div class="intake-beat" data-beat="thinking">' +
      '<div class="intake-beat__body">' +
        '<div class="action-cine__thinking" aria-label="Thinking"><i></i></div>' +
      '</div>' +
    '</div>';
  },

  // The summary beat's inner HTML, shared by the live beat and the past stack.
  _summaryBeatHtml(withCta) {
    const ca = (state.clarity && state.clarity.answers) || {};
    const goal = (ca.neutronStar || '').trim();
    const tf = ((ca.timeHorizon || ca.timeframe || '') + '').trim();
    // Night 3 (Malik's locked render): a quick reminder, nothing more. The
    // star and its timeframe exactly as Clarity locked them, no edit option,
    // three seconds and through.
    const tfLine = tf ? (/^within\b/i.test(tf) ? tf.charAt(0).toUpperCase() + tf.slice(1) : 'Within ' + tf) : '';
    return '<div class="intake-beat is-typing" data-beat="summary">' +
      '<div class="intake-beat__body">' +
        '<div class="intake-beat__quiet intake-beat__quiet--reminder">Quick Reminder: Your Neutron Star</div>' +
        '<div class="intake-beat__nstar">' + esc(goal) + '</div>' +
        (tfLine ? '<div class="intake-beat__nstf">' + esc(tfLine) + '</div>' : '') +
      '</div>' +
      (withCta ? '<button type="button" class="intake-beat__cta" id="missionConfirmBtn">Continue</button>' : '') +
    '</div>';
  },

  // Paint the derived view. Idempotent: calling twice yields identical DOM.
  _renderIntakeFromState(opts) {
    opts = opts || {};
    const intakeEl = this.pageWrap && this.pageWrap.querySelector('.action-intake');
    const host = intakeEl && intakeEl.querySelector('.action-intake__current');
    if (!intakeEl || !host) return;
    const v = this._deriveIntakeView();

    // v884 (Malik): NO visible history. Each beat/question stands alone on a
    // clean page, exactly like Clarity; the stack read as a failed imitation
    // of onboarding and made the module feel disjointed. The derivation keeps
    // computing the conversation (state machine unchanged), it just never
    // paints the past.
    const past = intakeEl.querySelector('.action-intake__past');
    if (past) { past.innerHTML = ''; past.style.display = 'none'; past.classList.remove('has-items'); }

    try { this.navEl.innerHTML = ''; } catch (e) {}
    if (v.mode === 'summary') {
      host.innerHTML = this._summaryBeatHtml(true);
      this._cineActivate();
      const btn = host.querySelector('#missionConfirmBtn');
      if (btn) btn.addEventListener('click', () => {
        this._doorsLive = true;
        this._renderIntakeFromState();
      });
      this._typeRecapBeat(host);
    } else if (v.mode === 'doors') {
      this._renderDoorsBeat(host);
    } else if (v.mode === 'thinking') {
      host.innerHTML = this._thinkingBeatHtml();
      this._aiIntakeFetchNext();
    } else {
      // Current question: the existing question machinery (input building,
      // pendingEdit prefill, submit wiring, chrome) paints into the host.
      this._aiIntakeRenderQuestion(v.current);
      this._renderIntakeBackButton();
    }
    // v920: do NOT scroll to the bottom. That was here for the old transcript
    // stack, but v884 stopped painting the past, so every beat is now a single
    // short page and the scroll only dragged the question ABOVE its anchor
    // (measured -46px off Clarity's line). Each beat starts at the top, the
    // way every Clarity page does.
    try { const sc = this.pageWrap && this.pageWrap.querySelector('.action-exp__page-inner'); if (sc) sc.scrollTop = 0; } catch (e) {}
  },

  // Back-compat entry: everything that used to call the mission beat directly.
  _renderMissionConfirm() {
    this._settleOpenState();
    this._renderIntakeFromState();
  },

  // v864 (Malik): the recap types in like Clarity, no instant pop. Lines type
  // sequentially with formatting preserved; layout is reserved up front so
  // nothing shifts; the CTA fades in when typing ends; any tap skips. Types
  // once per open (resume re-renders show instantly).
  _typeRecapBeat(host) {
    const _beat = host && host.querySelector('.intake-beat');
    // Beats render with .is-typing so their CTA / doors are hidden from the
    // FIRST painted frame. Every exit from here must clear it, or the controls
    // stay invisible forever.
    const _reveal = () => { try { if (_beat) _beat.classList.remove('is-typing'); } catch (e) {} };
    try {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { _reveal(); return; }
      const beat = _beat;
      // The recap types once per open; the doors beat types on every arrival
      // (it is only reachable via Continue in-session).
      const isRecap = beat && beat.getAttribute('data-beat') === 'summary';
      if (isRecap && this._recapTyped) { _reveal(); return; }
      if (isRecap) this._recapTyped = true;
      const body = beat && beat.querySelector('.intake-beat__body');
      const ctas = beat ? Array.from(beat.querySelectorAll('.intake-beat__cta, .intake-beat__ghostline')) : [];
      const cta = ctas[0];
      if (!beat || !body || !cta) { _reveal(); return; }
      body.style.minHeight = body.offsetHeight + 'px';
      // (No inline hiding here any more: .is-typing already hid them in the
      // markup, before the first paint.)
      const stash = Array.from(body.children).map((el) => {
        const segs = Array.from(el.childNodes).map((n) =>
          n.nodeType === 3 ? { text: n.textContent, el: null } : { text: n.textContent, el: n.cloneNode(false) });
        return { el, html: el.innerHTML, segs, len: segs.reduce((a, s) => a + s.text.length, 0) };
      });
      stash.forEach((s) => { s.el.innerHTML = ''; });
      let done = false;
      const showCta = () => { _reveal(); };
      const finish = () => {
        if (done) return; done = true;
        stash.forEach((s) => { s.el.innerHTML = s.html; });
        showCta();
      };
      beat.addEventListener('click', () => finish());
      const typeLine = (li) => {
        if (done) return;
        if (li >= stash.length) { done = true; showCta(); return; }
        const s = stash[li]; let i = 0;
        const renderUpto = (n) => {
          s.el.textContent = '';
          let rem = n;
          for (const seg of s.segs) {
            if (rem <= 0) break;
            const take = Math.min(rem, seg.text.length);
            if (seg.el) { const c = seg.el.cloneNode(false); c.textContent = seg.text.slice(0, take); s.el.appendChild(c); }
            else s.el.appendChild(document.createTextNode(seg.text.slice(0, take)));
            rem -= take;
          }
        };
        const tick = () => {
          if (done) return;
          renderUpto(i); i++;
          try { if (typeof MementoSound !== 'undefined') MementoSound.tick(); } catch (e) {}
          if (i <= s.len) this._setTimeout(tick, 10 + Math.random() * 8);
          else { s.el.innerHTML = s.html; this._setTimeout(() => typeLine(li + 1), 420); }
        };
        tick();
      };
      typeLine(0);
    } catch (e) {}
  },

  // The doors beat, painted only by _renderIntakeFromState.
  _renderDoorsBeat(host) {
    const intake = state.action.intake;
    // Night 3 (Malik's locked render): the doors as real doors, each saying
    // what happens behind it. Both doors route into the scripted fixed-screen
    // engine; the AI never speaks between answers anymore.
    host.innerHTML =
      '<div class="intake-beat is-typing" data-beat="doors">' +
        '<div class="intake-beat__body">' +
          '<div class="intake-beat__ask">Do you know what you have to do to get there?</div>' +
          '<div class="intake-beat__sub">Not the busywork. The one action that makes everything else easier or unnecessary.</div>' +
        '</div>' +
        '<button type="button" class="door-card" id="doorKnow">' +
          '<span class="door-card__t">I know what to do</span>' +
          '<span class="door-card__s">Insert the actions you think are needed to achieve your goal and we will test to confirm it is true and make sure it is actually working.</span>' +
        '</button>' +
        '<button type="button" class="door-card" id="doorFind">' +
          '<span class="door-card__t">Find it for me</span>' +
          '<span class="door-card__s">We will find the highest leverage action forward for you.</span>' +
        '</button>' +
        // Malik: picking a door must NOT fire instantly. A mis-tap is one tap
        // away from the wrong branch, so the pick is a selection and Continue
        // commits it. (This CTA is also what lets _typeRecapBeat run at all:
        // it bails when a beat has no CTA, so before this the fork question
        // never actually typewrote.)
        '<button type="button" class="intake-beat__cta" id="doorGo" disabled>Continue</button>' +
      '</div>';
    this._cineActivate();
    // v876 (Malik): the doors open on a BLANK page and the question TYPES in
    // like onboarding; the CTAs fade in when the typing lands.
    this._typeRecapBeat(host);
    const k = host.querySelector('#doorKnow'), f = host.querySelector('#doorFind');
    const go = host.querySelector('#doorGo');
    let picked = '';
    const select = (btn, label) => {
      picked = label;
      [k, f].forEach(b => { if (b) b.classList.toggle('selected', b === btn); });
      if (go) go.disabled = false;
      try { if (typeof MementoSound !== 'undefined' && MementoSound.tick) MementoSound.tick(); } catch (_) {}
    };
    const commit = () => {
      if (!picked) return;
      try {
        if (!Array.isArray(intake.aiMessages)) intake.aiMessages = [];
        if (!Array.isArray(intake.aiHistory)) intake.aiHistory = [];
        const opener = 'Do you know what you have to do to get there?';
        intake.aiMessages.push({ role: 'assistant', content: opener });
        intake.aiHistory.push({ message: opener, type: 'choices', options: ['I know what to do', 'Find it for me'] });
        intake.aiMessages.push({ role: 'user', content: picked });
        persistNow();
        // The scripted engine decides the next screen for BOTH doors.
        this._aiIntakeFetchNext();
      } catch (_) {}
    };
    if (k) k.addEventListener('click', () => select(k, 'I know what to do'));
    if (f) f.addEventListener('click', () => select(f, 'Find it for me'));
    if (go) go.addEventListener('click', commit);
  },

  // Back-compat entry (older call sites).
  _renderDoors() {
    this._doorsLive = true;
    this._renderIntakeFromState();
  },

  _intakeQuestions() {
    const ns = state.clarity.answers.neutronStar || 'your goal';
    const ans = (state.action.intake && state.action.intake.answers) || {};
    const wantsReword = /word|change/i.test(ans.goalConfirm || '');

    // v830 (the intake flip): ONE question. Goal + timeframe come from
    // Clarity and are shown as editable confirmations, never asked.
    const base = [
      {
        id: 'pastProgress',
        type: 'text',
        prompt: "Have you already started moving on this? What have you actually done so far, even if it feels small? Or are you starting from zero.",
        placeholder: 'Be honest. "Nothing yet" is a real answer if it\'s true.',
        minLen: 12,
        allowNothing: true
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
      // v830 (Malik's approved intake flip): the goal and timeframe come from
      // Clarity, ALWAYS. They are shown as editable confirmations at the top
      // of the screen, never asked as gate questions. The conversation opens
      // at the one real question: what have you actually done so far.
      const _ns = (state.clarity.answers && state.clarity.answers.neutronStar) || '';
      if (_ns) {
        intake.answers = intake.answers || {};
        intake.aiSnapshot.goalConfirm = _ns;
        intake.answers.goalConfirm = _ns;
        const _tf = (state.clarity.answers.timeframe || state.clarity.answers.timeHorizon || '').trim();
        if (_tf) { intake.aiSnapshot.timeframe = _tf; intake.answers.timeframe = _tf; }
        intake.phase = 'aiDriven';
      }
    }

    // Skeleton scaffold.
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner action-intake-page action-intake-page--cine">
        <div class="action-exp__inner action-intake action-intake--cine">
          <div class="action-intake__brief" id="intakeBrief"></div>
          <div class="action-intake__transcript" style="display:none" aria-hidden="true"></div>
          <div class="action-intake__current"></div>
        </div>
      </div>`;
    this._renderIntakeBrief();

    // Auto-scroll to bottom whenever the intake DOM changes (new bubble,
    // new question, typing indicator, etc.) so the latest message is always
    // in view, like a real iMessage thread. Set up once per intake session.
    this._setupIntakeAutoScroll();
    // Pin the compose bar to the visible viewport bottom so it stays put
    // when the iOS keyboard is up and the user scrolls.
    this._setupComposeBarPinning();

    // v871: ONE routing path. The deterministic renderer derives summary /
    // doors / current-question / thinking straight from persisted state, so
    // fresh opens and resumes are the same code.
    this._doorsLive = false;
    this._renderIntakeFromState();
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
      // v920: the cine intake has NO transcript to follow (v884 stopped
      // painting the past), so following the bottom only does harm here: it
      // fires on the typewriter's own characterData mutations and smooth-
      // scrolls the page while the question is still typing, which dragged
      // the question ~96px above Clarity's line. Each beat is one short page
      // that must simply rest at the top.
      if (this.pageWrap.querySelector('.action-intake-page--cine')) {
        if (this._intakeAutoScrollObserver) {
          try { this._intakeAutoScrollObserver.disconnect(); } catch (_) {}
          this._intakeAutoScrollObserver = null;
        }
        scroller.scrollTop = 0;
        return;
      }
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

  // v871: resume mid-conversation. The deterministic renderer derives the
  // whole screen from state: past exchanges stacked blurred, the CURRENT
  // question live, and a trailing user message (in-flight when they left)
  // auto-continues via thinking mode. Same spot or one step behind, never
  // ahead, never mis-ordered.
  _restoreAiIntakeFromState() {
    this._renderIntakeFromState();
  },

  // Renders the hardcoded goalConfirm opener. Every subsequent turn is driven
  // by the AI through _aiIntakeFetchNext.
  _renderIntakePhase() {
    // v871: legacy entry; the deterministic renderer decides everything.
    this._renderIntakeFromState();
  },

  // Renders / refreshes the back button in the intake header. Visible whenever
  // the user has answered at least one question.
  _renderIntakeBackButton() {
    const intake = this.pageWrap.querySelector('.action-intake');
    if (!intake) return;
    const userTurns = (state.action.intake && state.action.intake.aiMessages || [])
      .filter(m => m.role === 'user').length;
    // v871: ONE back path (_aiIntakeBack); the legacy _intakeBack (transcript
    // bubble surgery) is dead for the beat flow.
    this._cineRenderChrome(userTurns > 0, () => this._aiIntakeBack());
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
      message: trimmed.length > 0 ? trimmed : "Tell me more. What does that actually look like?",
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
    // v871: single-flight. Restore, settle, doors, and retry can all decide a
    // fetch is needed; only one runs, the rest are no-ops.
    if (this._intakeFetching) return;
    this._intakeFetching = true;
    try { await this._aiIntakeFetchNextInner(intake); } finally { this._intakeFetching = false; }
  },

  async _aiIntakeFetchNextInner(intake) {
    // Night 3 (Malik's locked decision): the intake is FIXED SCREENS. The
    // conversation state (aiMessages / aiHistory / aiSnapshot) is unchanged so
    // resume, back-nav and the plan generator all keep working, but the next
    // question comes from a local script, never an AI call. The AI speaks
    // exactly twice in Action now: the narrowing (plan generation) and the
    // verdict. Screens per the locked intake renders:
    //   door 1: what is it (text)  ->  been doing it? (3 chips)  ->  done
    //   door 2: capacity still true? (chips, one follow-up if changed)
    //           ->  what have you tried? (chips w/ custom + nothing)  ->  done
    // "I don't know" typed inside door 1 slides quietly into door 2.
    if (!intake.aiSnapshot) intake.aiSnapshot = { goalConfirm: '', timeframe: '', pastProgress: '', mainMove: '' };
    if (!Array.isArray(intake.aiHistory)) intake.aiHistory = [];
    if (!intake.answers) intake.answers = {};
    const ca = state.clarity.answers || {};
    const snap = intake.aiSnapshot;

    // Prefill what Clarity already locked; never re-asked.
    if (!snap.goalConfirm && ca.neutronStar) snap.goalConfirm = ca.neutronStar;
    if (!snap.timeframe) snap.timeframe = String(ca.timeframe || ca.timeHorizon || '').trim();

    const userMsgs = intake.aiMessages
      .filter(m => m.role === 'user')
      .map(m => String(m.content || '').trim());
    const doorLabel = userMsgs[0] || '';
    const after = userMsgs.slice(1);
    const dontKnow = (t) => /^(i\s*)?(don'?t|dont|do not)\s*know\b|^idk\b|^no idea\b|^not sure\b/i.test(String(t || '').trim());
    const slid = !!intake._slidDoor2 || (after.length >= 1 && dontKnow(after[0]) && !intake._slidHandled);
    const door1 = /know/i.test(doorLabel) && !/find/i.test(doorLabel) && !slid;

    const push = (message, type, options, counter) => {
      // Dedupe: a double fetch (resume race, manual refresh) must never stack
      // the same question twice in the transcript.
      const last = intake.aiMessages[intake.aiMessages.length - 1];
      if (!(last && last.role === 'assistant' && last.content === message)) {
        intake.aiMessages.push({ role: 'assistant', content: message });
        intake.aiHistory.push({ message, type, options: options || [], counter: counter || '' });
        persistNow();
      }
      this._renderIntakeFromState();
    };
    const finish = () => {
      intake.completed = true;
      persistNow();
      this._aiIntakeRenderClosing();
    };

    // Door 2's capacity phrasing, from Clarity's committed daily time.
    const daily = parseInt(ca.dailyTime, 10) || 0;
    const phrase = !daily ? ''
      : daily >= 105 ? ('about ' + (Math.round(daily / 30) / 2) + ' hours a day')
      : daily >= 75 ? 'about an hour and a half a day'
      : daily >= 45 ? 'about an hour a day'
      : ('about ' + daily + ' minutes a day');
    // A time budget has five honest answers, so it is a chip ladder wherever
    // it is asked: as the follow-up when their committed number changed, and
    // (v1018, Malik) as the FIRST question when Clarity never captured one.
    // That fallback was a bare text box, the exact "write a paragraph" friction
    // he flagged. Chips lead, the free field stays for anything else.
    const TIME_CHIPS = ['15 minutes', '30 minutes', 'An hour', 'A few hours', 'Most of the day'];
    const capacityQ = phrase
      ? ('You said you can give this ' + phrase + '. Still true?')
      : 'How much time can you actually give this on a normal day?';
    const capacityType = phrase ? 'choices' : 'chips';
    const capacityOpts = phrase ? ['Still true', 'It changed'] : TIME_CHIPS;
    const triedQ = 'What have you already tried?';
    const NOTHING = 'Honestly, nothing yet';

    const D1_Q2 = 'Have you been doing it, and is the number moving?';
    const D1_OPTS = ['Doing it, and it is working', 'Doing it, but the number is not moving', 'Honestly not doing it'];

    try {
      if (door1) {
        if (after.length === 0) {
          push('What do you have to do? The most literal, tangible version.', 'text', [], '1 of 2');
          return;
        }
        if (after.length === 1) {
          snap.mainMove = after[0];
          intake.answers.mainMove = after[0];
          push(D1_Q2, 'choices', D1_OPTS, '2 of 2');
          return;
        }
        // Defensive: if a resume lands here with both answers already in the
        // transcript, capture the move too, never finish with it blank.
        if (!snap.mainMove) { snap.mainMove = after[0]; intake.answers.mainMove = after[0]; }
        snap.pastProgress = after[1];
        intake.answers.pastProgress = after[1];
        finish();
        return;
      }

      // Door 2 (including the quiet slide out of door 1).
      if (slid && !intake._slidDoor2) {
        intake._slidDoor2 = true;
        intake._slidHandled = true;
        snap.mainMove = '';
        if (intake.answers) delete intake.answers.mainMove;
        persistNow();
      }
      // Answers that belong to door 2's script (drop the door-1 "idk" turn).
      const d2 = intake._slidDoor2 && after.length && dontKnow(after[0]) ? after.slice(1) : after;
      const changed = d2[0] === 'It changed';
      // Key off whether Clarity gave us a committed number, NOT off the input
      // type: the fallback question became chips in v1018 and its answer is
      // still the capacity itself, sitting at index 0.
      const askedFresh = !phrase;
      const capNote = askedFresh
        ? (d2[0] || '')
        : (changed ? (d2[1] || '') : '');
      const triedIdx = askedFresh ? 1 : (changed ? 2 : 1);

      if (d2.length === 0) {
        push(capacityQ, capacityType, capacityOpts, '1 of 2');
        return;
      }
      if (changed && d2.length === 1) {
        push('What can you actually give it a day right now?', 'chips', TIME_CHIPS, '1 of 2');
        return;
      }
      if (d2.length === triedIdx) {
        push(triedQ, 'chips', [NOTHING], '2 of 2');
        return;
      }
      const tried = d2[triedIdx] || '';
      const triedTxt = tried === NOTHING ? 'Nothing tried yet, clean slate.' : tried;
      snap.pastProgress = (capNote && capNote !== 'Still true'
        ? 'capacity: ' + capNote + '. ' : '') + triedTxt;
      intake.answers.pastProgress = snap.pastProgress;
      finish();
    } catch (e) {
      console.warn('intake script error', e);
      // The script is local and deterministic; if it ever throws, repaint the
      // derived state rather than showing a retry wall.
      try { this._renderIntakeFromState(); } catch (_) {}
    }
  },

  // Renders the AI's current question into the current section, with a smooth
  // swap that doesn't unmount the transcript.
  _aiIntakeRenderQuestion(parsed) {
    this._intakeRetried = false; // a question landed = the line is healthy again
    this._settleOpenState();
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
    // v871: the past stack is built declaratively by _renderIntakeFromState;
    // this function only paints the CURRENT question.
    current.innerHTML = this._buildCurrentSectionHtml(fakeQ);
    // Night 3 (the jank fix from the locked render): a quiet "1 of 2" so the
    // end of the questions is always visible. Reserved space, top of the beat.
    if (parsed.counter) {
      const c = document.createElement('div');
      c.className = 'intake-count apl-num';
      c.textContent = parsed.counter;
      current.insertBefore(c, current.firstChild);
    }
    this._cineActivate();
    // v874 (Malik: typed text invisible under the keyboard): the settle-glide
    // recipe is WRONG for this surface, its precondition is a HIGH field and
    // this one sits low, so the glide scrolled the input back under the
    // keyboard while typing. Instead: keep the input visible by scrolling the
    // conversation (the inner scroller) whenever the keyboard overlaps it.
    try {
      const kbField = current.querySelector('#intakeInput');
      if (kbField) this._bindIntakeKeyboardKeep(kbField);
      // v920: the field rests at Clarity's height and grows with the answer up
      // to Clarity's cap, so long answers are never clipped. Reading the cap
      // off the computed style keeps CSS the single source of truth.
      if (kbField) {
        const cap = parseFloat(getComputedStyle(kbField).maxHeight) || 148;
        const grow = () => {
          kbField.style.height = 'auto';
          kbField.style.height = Math.min(kbField.scrollHeight, cap) + 'px';
        };
        kbField.addEventListener('input', grow);
        grow();
      }
    } catch (eKb) {}

    this._cineRenderChrome(
      state.action.intake.aiMessages.filter(m => m.role === 'user').length > 0,
      () => this._aiIntakeBack());

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
  // v627: DELEGATED wiring. Renders kept replacing innerHTML after per-element
  // listeners attached, orphaning them (dead Next button on device). One set of
  // listeners lives on the permanent containers (pageWrap + navEl) forever and
  // reads the CURRENT elements at event time, so no re-render can kill them.
  _wireSubmitHandlers(q, submit) {
    this._cineEnsureDelegation();
    this._cinePicked = '';
    this._cineQType = (q.type === 'choices' || q.type === 'select') ? 'choices' : (q.type === 'chips' ? 'chips' : 'text');
    this._cineSubmit = submit;
    if (this._cineQType === 'text') setTimeout(() => { const i = this.pageWrap.querySelector('#intakeInput'); if (i) i.focus(); }, 80);
  },

  _cineGo() {
    if (!this._cineSubmit) return;
    if (this._cineQType === 'choices') { if (this._cinePicked) this._cineSubmit(this._cinePicked); return; }
    // Chips screens (the Night 3 locator) carry BOTH a free field and escape
    // chips. A picked chip wins; otherwise the typed answer goes.
    if (this._cineQType === 'chips' && this._cinePicked) { this._cineSubmit(this._cinePicked); return; }
    const i = this.pageWrap.querySelector('#intakeInput') || this.pageWrap.querySelector('#intakeCustom');
    this._cineSubmit(i && i.value);
  },

  // One rule for every answer control: a tap SELECTS (and turns white), Next
  // commits. Nothing on the intake fires straight off a single tap.
  _cineSetReady(on) {
    const nb = this.navEl.querySelector('#intakeSend');
    if (nb) nb.disabled = !on;
  },

  _cineEnsureDelegation() {
    if (this._cineDelegated) return;
    this._cineDelegated = true;
    this.pageWrap.addEventListener('input', (e) => {
      if (!e.target) return;
      if (e.target.id !== 'intakeInput' && e.target.id !== 'intakeCustom') return;
      // Typing is an answer in its own right, so it clears any picked chip.
      if (e.target.id === 'intakeCustom' && (e.target.value || '').trim()) {
        this._cinePicked = '';
        this.pageWrap.querySelectorAll('#intakeChips .action-plan__when-chip')
          .forEach(b => b.classList.remove('selected'));
      }
      this._cineSetReady(!!(e.target.value || '').trim());
    });
    this.pageWrap.addEventListener('keydown', (e) => {
      if (!e.target) return;
      if (e.target.id === 'intakeInput' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._cineGo(); }
      if (e.target.id === 'intakeCustom' && e.key === 'Enter') { e.preventDefault(); this._cineGo(); }
    });
    this.pageWrap.addEventListener('click', (e) => {
      const opt = e.target.closest && e.target.closest('.action-chat__opt');
      if (opt) {
        this._cinePicked = opt.dataset.value;
        this.pageWrap.querySelectorAll('.action-chat__opt').forEach(b => b.classList.toggle('selected', b === opt));
        this._cineSetReady(true);
        return;
      }
      const chip = e.target.closest && e.target.closest('#intakeChips .action-plan__when-chip');
      if (chip) {
        // Picking the escape chip clears the free field: they are alternatives,
        // and Next must never send both.
        this._cinePicked = chip.dataset.chip;
        this.pageWrap.querySelectorAll('#intakeChips .action-plan__when-chip')
          .forEach(b => b.classList.toggle('selected', b === chip));
        const c = this.pageWrap.querySelector('#intakeCustom');
        if (c) c.value = '';
        this._cineSetReady(true);
        return;
      }
    });
    this.navEl.addEventListener('click', (e) => {
      const nb = e.target.closest && e.target.closest('#intakeSend');
      if (nb && !nb.disabled) this._cineGo();
    });
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

    const isLocalDeveloperRuntime = location.protocol === 'file:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!intake.devMode && isLocalDeveloperRuntime && trimmedValue === DEV_CODE) {
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
          const reply = await callClaude(intake.devChat, DEV_SYSTEM, { maxTokens: 600, noProfile: true, localOnly: true });
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
      // A missing/unknown phase falls through here too, otherwise a corrupt
      // resume swallows the answer silently and the intake wedges.
      if (phase === 'aiDriven' || !phase) {
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
      current.innerHTML = this._thinkingBeatHtml();
      try { this.navEl.innerHTML = ''; } catch (e) {}
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
      current.innerHTML = this._thinkingBeatHtml();
      try { this.navEl.innerHTML = ''; } catch (e) {}
      this._aiIntakeFetchNext(answer);
    }, 280);
  },

  // v871: THE one back path. Pop the current question AND its aiHistory
  // metadata (the old version left history unpopped, so later restores got
  // the wrong input type), stash the full pendingEdit shape (the unchanged-
  // answer short-circuit depends on cachedAssistant/cachedHistory/
  // cachedSnapshot), clear the snapshot so the AI re-decides on re-answer,
  // then re-derive the whole screen.
  _aiIntakeBack() {
    const intake = state.action.intake;
    if (!intake.aiMessages || intake.aiMessages.length < 2) return;
    let poppedAssistant = null, poppedHistory = null, poppedUser = null;
    while (intake.aiMessages.length && intake.aiMessages[intake.aiMessages.length - 1].role === 'assistant') {
      poppedAssistant = intake.aiMessages.pop();
      if (Array.isArray(intake.aiHistory) && intake.aiHistory.length) poppedHistory = intake.aiHistory.pop();
    }
    if (intake.aiMessages.length && intake.aiMessages[intake.aiMessages.length - 1].role === 'user') {
      poppedUser = intake.aiMessages.pop();
    }
    // Back past the first AI turn = land on the doors beat cleanly.
    const hasUserLeft = intake.aiMessages.some(m => m.role === 'user');
    if (!hasUserLeft) {
      intake.aiMessages = [];
      intake.aiHistory = [];
      intake._pendingEdit = null;
      persistNow();
      this._doorsLive = true;
      this._renderIntakeFromState();
      return;
    }
    intake._pendingEdit = {
      prevAnswer: (poppedUser && poppedUser.content) || '',
      cachedAssistant: poppedAssistant ? poppedAssistant.content : '',
      cachedHistory: poppedHistory,
      cachedSnapshot: JSON.parse(JSON.stringify(intake.aiSnapshot || {}))
    };
    intake.aiSnapshot = { goalConfirm: '', timeframe: '', pastProgress: '', mainMove: '' };
    persistNow();
    this._renderIntakeFromState();
  },

  // After ready:true, briefly show a "Building your plan..." state, then kick off
  // the existing plan generation pipeline.
  _aiIntakeRenderClosing() {
    // (Malik: the "Got it. Building your plan now." bubble is gone. The
    // narrowing screen that follows already says the app is working, so the
    // bubble was a redundant beat between the last answer and that screen.)
    this._finishIntake();
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

    const backHtml = '';
    this._cineRenderChrome(step > 0, () => this._intakeBack());

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
    // v615 (Malik): the intake speaks Clarity's language. One question at a
    // time, full screen, typed out; the answers fade up once the line lands.
    // The IDs/classes the submit handlers query are unchanged.
    let html = `<div class="wiz__question action-cine__q" data-cine-q>${escWithBold(q.prompt || '')}</div>`;
    let answers = '';
    if (q.type === 'select' || q.type === 'choices') {
      const opts = (q.options || []).map(o => `<button class="wiz__option action-chat__opt" type="button" data-value="${esc(o)}"><span class="wiz__option-label">${esc(o)}</span></button>`).join('');
      answers += `<div class="wiz__options">${opts}</div>`;
    } else if (q.type === 'chips') {
      const chipsSrc = (q.chips && q.chips.length) ? q.chips : (q.options || []);
      const chips = chipsSrc.map(c => `<button class="action-plan__when-chip" type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join('');
      // Which input leads depends on what the chips ARE.
      //   ONE chip  = an escape hatch off a question that wants prose (the
      //     "nothing tried yet" case). The free field leads, chip sits under.
      //   SEVERAL   = the chips are the actual answer set (a time budget has
      //     five honest answers). They lead, and the field becomes the
      //     "something else" row. Malik: a question like this should not be
      //     "just only a text box".
      // Either way they are alternatives: picking one clears the other, and
      // Next sends whichever is live.
      const choiceLed = chipsSrc.length > 1;
      const customRow = `
        <div class="action-chat__chips-custom" style="${choiceLed ? 'margin-top:12px' : 'margin-bottom:12px'};width:100%;">
          <textarea class="wiz__text-input action-cine__input" id="intakeCustom" rows="2" placeholder="${esc(q.customPlaceholder || (choiceLed ? 'Or say it in your own words...' : 'Type it plainly...'))}" autocomplete="off"></textarea>
        </div>`;
      const chipRow = `<div class="action-plan__when-edit" id="intakeChips">${chips}</div>`;
      answers += choiceLed ? `${chipRow}${customRow}` : `${customRow}${chipRow}`;
    } else {
      answers += `
        <textarea class="wiz__text-input action-cine__input" id="intakeInput" rows="2" placeholder="${esc(q.placeholder || 'Type your answer...')}" autocomplete="off"></textarea>
        <div class="action-chat__error" id="intakeErr" style="display:none;"></div>`;
    }
    html += `<div class="action-cine__answers">${answers}</div>`;
    return html;
  },


  // v626 (Malik): ONE chrome renderer for every intake render path. Bottom nav
  // only (back arrow when there is history + big Next), NO progress bar, and
  // never a floating top back pill.
  _cineRenderChrome(canGoBack, backFn) {
    try { this.progressEl.innerHTML = ''; } catch (e) {}
    this.navEl.innerHTML =
      (canGoBack ? '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--back" id="intakeBack" aria-label="Back"></button>' : '') +
      '<button class="clarity-exp__nav-btn clarity-exp__nav-btn--next" id="intakeSend" disabled>Next</button>';
    const backBtn = this.navEl.querySelector('#intakeBack');
    if (backBtn && backFn) backBtn.addEventListener('click', backFn);
  },
  // v615: type the question line out, then fade the answers up. Tap anywhere
  // on the question to fast-forward. Reduced motion renders instantly.
  _cineActivate() {
    const qEl = this.pageWrap.querySelector('[data-cine-q]');
    const ans = this.pageWrap.querySelector('.action-cine__answers');
    if (!qEl) { if (ans) ans.classList.add('is-on'); return; }
    const full = qEl.innerHTML;
    const plain = qEl.textContent || '';
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => {
      qEl.innerHTML = full;
      if (ans) ans.classList.add('is-on');
    };
    if (reduced || plain.length < 2) { finish(); return; }
    qEl.textContent = '';
    let i = 0, done = false;
    const step = Math.max(1, Math.round(plain.length / 110));   // whole line lands in ~1.6s
    const iv = setInterval(() => {
      if (done) return;
      i += step;
      try { if (typeof MementoSound !== 'undefined') MementoSound.tick(); } catch (e) {}
      if (i >= plain.length) { done = true; clearInterval(iv); finish(); return; }
      qEl.textContent = plain.slice(0, i);
    }, 15);
    qEl.addEventListener('click', () => { if (!done) { done = true; clearInterval(iv); finish(); } }, { once: true });
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

      const raw = await callClaude([{ role: 'user', content: user }], sys, { paidAction: true });
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
      this._cineActivate();
      this._cineRenderChrome(true, () => this._intakeBack());
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
    this._cineActivate();

    // Update / inject the back button at the top of the intake. It only shows
    // when step > 0; rebuild it surgically so the existing button (still in
    // the DOM from before) doesn't keep its stale click handler.
    this._cineRenderChrome(step > 0, () => this._intakeBack());

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
      { maxTokens: 80, timeout: 12000, paidAction: true }
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

  renderContent() {
    this.progressEl.innerHTML = '';
    this.navEl.innerHTML = '';
    // The narrowing runs on timers; any re-render kills them so it can never
    // keep striking lines inside a surface that no longer exists.
    if (this._narrowTimer) { clearTimeout(this._narrowTimer); this._narrowTimer = null; }
    if (this._narrowWatch) { clearTimeout(this._narrowWatch); this._narrowWatch = null; }

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

    // (v875: the Round 10 timeframe gate is DEAD, Malik killed it. Timeframe
    // is Clarity's question; a missing one never blocks the module.)
    if (actionAiLoading) {
      // v1020: the streamed verdict paints the moment its fields are complete
      // and clean, while the rest of the plan is still arriving. The painted-
      // preview identity guard stops repeat refreshes from restarting the
      // beat's typewriter, and lets a NEW preview (keep-my-version regen)
      // replace an old one.
      const _pv = (typeof actionStreamPreviewGet === 'function') ? actionStreamPreviewGet() : null;
      state.meta = state.meta || {};
      if (_pv && !state.meta.planRevealSeen) {
        if (this._paintedPreview !== _pv) this._renderVerdictBeat();
        return;
      }
      this._renderNarrowing();
      return;
    }

    // Generation failed. This is a screen a PAYING user actually reaches (the
    // proxy times out on long plans), so it gets the same beat composition as
    // every other surface and says what happened in human words. It used to be
    // a top-aligned block showing the raw "API error (504)" string.
    if (actionChatError && !hasActionPlan()) {
      const timedOut = /timed out|504|timeout/i.test(String(actionChatError));
      const line = timedOut
        ? 'The plan took too long to come back. Nothing you answered was lost.'
        : 'Something got in the way of building your plan. Nothing you answered was lost.';
      this._revealBeatShell(
        `<p class="action-verdict__move">That did not land.</p>
         <p class="action-verdict__receipt">${esc(line)}</p>`,
        'Try again',
        () => { actionChatError = null; generateActionDraft(); }
      );
      return;
    }

    // v1163 (Malik: "why does it take so long? why is this the thing that
    // comes up after selecting a small action?"). A plan whose source star no
    // longer matches used to fall THROUGH to auto-generation, so opening
    // Action (from the comeback picker, say) silently started a multi-minute
    // regeneration. Their plan is still their plan: show it. Rebuilding is a
    // deliberate act, never a side effect of opening a screen.
    if (hasActionPlan()) {
      // Night 3 (Malik's locked renders): the FIRST time the plan exists it
      // arrives as a SEQUENCE, not a flash: the verdict (their move judged on
      // their own numbers), the bridge (today -> this week -> the star), the
      // scale breath (the five sizes), then the first step, right now. The
      // flag is set only at the END so a relaunch mid-ceremony replays it
      // (resume never lands ahead).
      state.meta = state.meta || {};
      if (!state.meta.planRevealSeen) { this._renderVerdictBeat(); return; }
      this._renderPlanByMode();
      return;
    }

    // Round 9: draft-first. If we have nothing yet, kick off auto-generation.
    if (!actionAiLoading && state.action.introSeen) {
      generateActionDraft();
      return;
    }

    // If we somehow get here pre-intro, route back to the intro so the
    // normal intake flow takes over.
    this._showActionIntro();
  },

  // ---- Night 3: the reveal sequence (verdict -> bridge -> breath -> first
  // step). One beat per screen, typed in, CTA bottom-anchored, all on the
  // dark-cinema reveal surface (the .action-cine-reveal root rule).

  _revealBeatShell(bodyHtml, ctaLabel, onCta, ghostLabel, onGhost) {
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner"><div class="action-exp__inner action-cine-reveal action-verdict">
        <div class="intake-beat is-typing" data-beat="verdict">
          <div class="intake-beat__body">${bodyHtml}</div>
          <button type="button" class="intake-beat__cta action-verdict__cta">${esc(ctaLabel)}</button>
          ${ghostLabel ? `<button type="button" class="intake-beat__ghostline action-verdict__ghost">${esc(ghostLabel)}</button>` : ''}
        </div>
      </div></div>`;
    const beat = this.pageWrap.querySelector('.intake-beat');
    beat.querySelector('.action-verdict__cta').addEventListener('click', () => onCta && onCta());
    const g = beat.querySelector('.action-verdict__ghost');
    if (g && onGhost) g.addEventListener('click', () => onGhost());
    this._typeRecapBeat(this.pageWrap);
    return beat;
  },

  // Their tried list as separate strikeable rows (door 2's visible cut).
  _triedRows() {
    const snap = (state.action.intake && state.action.intake.aiSnapshot) || {};
    return String(snap.pastProgress || '')
      .replace(/^capacity:[^.]*\.\s*/i, '')
      .split(/,|;|\band\b|\./)
      .map(t => t.trim().replace(/^(i\s+|i've\s+|ive\s+)/i, ''))
      .filter(t => t.length > 6 && !/nothing tried yet|clean slate/i.test(t))
      .slice(0, 4);
  },

  _renderVerdictBeat() {
    // v1020: while the plan is still streaming, this beat reads the preview
    // (already cleaned by the same gates the pipeline runs); once the
    // validated plan is in state, state wins, always.
    const _pv = (typeof actionAiLoading !== 'undefined' && actionAiLoading
      && typeof actionStreamPreviewGet === 'function') ? actionStreamPreviewGet() : null;
    this._paintedPreview = _pv || null;
    const pa = _pv || state.action.primaryAction || {};
    const tier = pa.recommendedTier || 'moderate';
    const move = (pa.tiers && pa.tiers[tier]) || pa.title || '';
    const verdict = pa.verdict || null;
    const snap = (state.action.intake && state.action.intake.aiSnapshot) || {};
    const theirs = String(snap.mainMove || '').trim();
    const reason = String(pa.verdictReason || '').trim();
    // v1110 (Malik): this beat is a HAND-OFF, not a second copy of the move.
    // It used to end with "So the move is" + the move, and the very next
    // screen is the card showing that same move, so on the empty path (door 2,
    // nothing tried, no reason) the whole page was a caption, a repeat and a
    // button. It now ends by handing over, and only carries the things the
    // user would otherwise never learn: their own words, and why the app kept,
    // sharpened or replaced them. The move itself waits for the card.
    let body = '';
    if (theirs && verdict) {
      // Door 1: their move in their words, then the receipt for the verdict.
      body += `<p class="action-verdict__theirs${verdict === 'replaced' ? ' will-cut' : ''}">&ldquo;${esc(theirs)}&rdquo;</p>`;
      if (reason) body += `<p class="action-verdict__receipt">${esc(reason)}</p>`;
    } else {
      // Door 2: the visible cut when they listed tries (naming the cuts is
      // half the weight); nothing to strike means nothing to say.
      const rows = this._triedRows();
      if (rows.length) {
        body += `<p class="action-verdict__cap">You told Action you have tried</p>`;
        body += rows.map(r => `<p class="action-verdict__cutrow will-cut">${esc(r)}</p>`).join('');
      }
      if (reason) body += `<p class="action-verdict__receipt">${esc(reason)}</p>`;
    }
    body += `<p class="action-verdict__move">Here is your action plan.</p>`;
    const keepable = verdict === 'replaced' || verdict === 'upgraded';
    const beat = this._revealBeatShell(
      // v999 (Malik: the reveal pages 'feel very very cheap'). The bridge,
      // the scale breath and the first-step page are cut. The verdict is the
      // only one that IS the product: it judges what they said and cites
      // their own words. The other three were a page each for a caption, a
      // list they were about to swipe anyway, and a pep talk. Straight to the
      // plan now.
      body, 'Continue', () => this._finishReveal(),
      keepable ? 'Keep my version' : null,
      keepable ? () => this._keepMyVersion() : null
    );
    // The strikes land AFTER the words exist: rough delay keyed to how much
    // text the typewriter has to lay down first.
    const chars = beat.querySelector('.intake-beat__body').textContent.length;
    const base = Math.min(1200 + chars * 14, 6000);
    Array.from(beat.querySelectorAll('.will-cut')).forEach((el, i) => {
      this._setTimeout(() => el.classList.add('is-cut'), base + i * 420);
    });
  },

  _keepMyVersion() {
    // Decision 9 (Malik): on Replace and Upgrade they may keep their own
    // version. It is still mechanized, never obeyed raw: the plan regenerates
    // built AROUND their move.
    this._holdForPlanThen(() => { generateActionDraft({ keepTheirs: true }); });
  },

  // ---- UNREACHABLE as of v999 -----------------------------------------
  // The verdict now goes straight to _finishReveal, so these three never
  // run. Kept, not deleted: they are working beats Malik may want back, and
  // restoring one is a single line at the verdict's handoff above. Of the
  // three, _renderFirstStepNow is the one with a real job (do the move
  // before you leave); it was cut with the others because the whole run of
  // pages read cheap, not because that idea is wrong.
  _renderBridgeBeat() {
    // v1019: the ladder is written by a second call that starts as soon as
    // the move lands, so by the time someone reads the verdict and taps
    // Continue it is normally already here. If they are faster than the call,
    // hold this beat on the thinking dot rather than showing it with the
    // "this week" line missing. Bounded: it renders regardless after the wait.
    if (typeof actionLadderInFlight === 'function' && actionLadderInFlight()) {
      const pa0 = state.action.primaryAction || {};
      if (!Array.isArray(pa0.path) || !pa0.path.length) {
        this.pageWrap.innerHTML =
          '<div class="action-exp__page-inner"><div class="action-exp__inner action-cine-reveal action-verdict">' +
          this._thinkingBeatHtml() +
          '</div></div>';
        try { this.navEl.innerHTML = ''; } catch (e) {}
        actionLadderReady(7000).then(() => { if (this.isOpen) this._renderBridgeBeat(); });
        return;
      }
    }
    const pa = state.action.primaryAction || {};
    const tier = pa.recommendedTier || 'moderate';
    const move = (pa.tiers && pa.tiers[tier]) || pa.title || '';
    // The path runs far -> near; "this week" is the LAST step (or the one
    // whose horizon says week).
    const steps = Array.isArray(pa.path) ? pa.path : [];
    const weekStep = steps.find(s => /week/i.test(String(s && s.horizon))) || steps[steps.length - 1];
    const week = (weekStep && (weekStep.milestone || weekStep.looksLike)) || '';
    const star = (state.clarity.answers && state.clarity.answers.neutronStar) || '';
    let body = `<p class="action-verdict__cap">Today</p><p class="action-verdict__bridge-line">${esc(move)}</p>`;
    if (week) body += `<p class="action-verdict__cap">This week</p><p class="action-verdict__bridge-line">${esc(week)}</p>`;
    if (star) body += `<p class="action-verdict__cap">The star</p><p class="action-verdict__bridge-line action-verdict__bridge-line--star">${esc(star)}</p>`;
    this._revealBeatShell(body, 'Continue', () => this._renderScaleBreath());
  },

  _renderScaleBreath() {
    const pa = state.action.primaryAction || {};
    const KEYS = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    const rec = pa.recommendedTier || 'moderate';
    const rows = KEYS.map(k => {
      const t = pa.tiers && pa.tiers[k];
      if (!t) return '';
      const time = (pa.tierTime && pa.tierTime[k]) ? `<span class="action-verdict__scale-time apl-num">${esc(pa.tierTime[k])}</span>` : '';
      return `<div class="action-verdict__scale-row${k === rec ? ' is-rec' : ''}"><span class="action-verdict__scale-move">${esc(t)}</span>${time}</div>`;
    }).join('');
    const body =
      `<p class="action-verdict__receipt">Some days you will have an hour. Some days ten minutes. The move scales. The day still counts.</p>` +
      `<div class="action-verdict__scale">${rows}</div>`;
    this._revealBeatShell(body, 'Continue', () => this._renderFirstStepNow());
  },

  _renderFirstStepNow() {
    const pa = state.action.primaryAction || {};
    const how = String(pa.howToStart || '').trim();
    let body = `<p class="action-verdict__move">Do the first step. Right now.</p>`;
    if (how) body += `<p class="action-verdict__receipt">${esc(how)}</p>`;
    body += `<p class="action-verdict__mori">You do not get today back.</p>`;
    this._revealBeatShell(body, 'Start now', () => this._finishReveal(), 'I will start today', () => this._finishReveal());
  },

  // v1020: with the verdict streaming in ahead of the full plan, both of the
  // beat's buttons can be tapped while the rest is still arriving. Each holds
  // on the thinking dot until the generation settles (bounded), then proceeds.
  // Without this, "Lock it in" bounced BACK to the scramble screen and "Keep
  // my version" silently did nothing (the regen entry no-ops while loading).
  _holdForPlanThen(fn) {
    if (!(typeof actionAiLoading !== 'undefined' && actionAiLoading)) { fn(); return; }
    this.pageWrap.innerHTML =
      '<div class="action-exp__page-inner"><div class="action-exp__inner action-cine-reveal action-verdict">' +
      this._thinkingBeatHtml() +
      '</div></div>';
    try { this.navEl.innerHTML = ''; } catch (e) {}
    let waited = 0;
    const iv = setInterval(() => {
      if (!this.isOpen) { clearInterval(iv); return; }
      waited += 250;
      if (!actionAiLoading || waited >= 20000) { clearInterval(iv); fn(); }
    }, 250);
  },

  _finishReveal() {
    this._holdForPlanThen(() => {
      state.meta = state.meta || {};
      state.meta.planRevealSeen = true;
      try { persistNow(); } catch (e) {}
      this.renderContent();
    });
  },

  // The narrowing (Night 3, from the intake.html render, frame 07). While the
  // plan generates, candidate moves seeded from THEIR goal and THEIR answers
  // flash past and get struck one by one. Latency theater, but honest theater:
  // elimination is literally what the engine is doing. Both doors cross this.
  _narrowCandidates() {
    const ca = state.clarity.answers || {};
    const snap = (state.action.intake && state.action.intake.aiSnapshot) || {};
    const goal = String(ca.neutronStar || '').toLowerCase();
    const has = (re) => re.test(goal);
    // Family templates. Each entry: [test, moves]. First matching families
    // contribute; the generic tail always applies.
    const fams = [
      [/(user|customer|client|revenue|sale|paying|business|startup|product|app|saas|mrr)/, [
        'Run paid ads to the landing page',
        'Post a launch thread every week',
        'Redesign the onboarding first',
        'Cold email fifty prospects',
        'Talk to three users about why they signed up',
        'Ship the referral feature',
        'Start a build-in-public newsletter'
      ]],
      [/(follower|audience|subscriber|view|content|video|channel|tiktok|youtube|instagram|brand)/, [
        'Post three times a day for a month',
        'Study the top ten accounts in the niche',
        'Buy a better camera setup',
        'Remake the best old post with a new hook',
        'Collab with a bigger account',
        'Batch a week of content on Sunday'
      ]],
      [/(weight|fit|gym|muscle|run|marathon|health|body|lift)/, [
        'Find a new training program',
        'Meal prep every Sunday',
        'Hire a coach',
        'Track every meal for a week',
        'Book the same gym slot daily',
        'Cut the one worst food first'
      ]],
      [/(book|write|novel|album|song|music|art|portfolio|film)/, [
        'Outline the whole thing first',
        'Set a daily word count',
        'Study the craft for a month',
        'Show a rough draft to one person',
        'Finish one small piece end to end',
        'Block the same hour every morning'
      ]],
      [/(learn|skill|code|language|degree|exam|study|school|grade)/, [
        'Buy the best course',
        'Build one real project with it',
        'Find a study partner',
        'Do one hour before anything else',
        'Test yourself weekly',
        'Teach what you learned this week'
      ]],
      [/(money|save|debt|invest|income|job|career|promotion|raise)/, [
        'Cut the three biggest expenses',
        'Ask for the raise directly',
        'Apply to ten roles this week',
        'Start the side income small',
        'Track every dollar for a month',
        'Talk to someone two steps ahead'
      ]]
    ];
    let pool = [];
    fams.forEach(([re, moves]) => { if (has(re)) pool = pool.concat(moves); });
    if (!pool.length) pool = [
      'Plan the perfect roadmap first',
      'Wait until the timing is right',
      'Do one small piece of it today',
      'Tell one person the real goal',
      'Clear one hour and start ugly',
      'Copy what worked for someone else'
    ];
    // Their OWN words go in the pool, that is what sells it as real.
    const theirs = [];
    const mm = String(snap.mainMove || '').trim();
    if (mm) theirs.push(mm.length > 52 ? mm.slice(0, 49).replace(/\s+\S*$/, '') + '…' : mm);
    String(snap.pastProgress || '').split(/[.;]/).forEach(t => {
      t = t.replace(/^capacity:[^.]*$/i, '').trim();
      // Door 1's evidence chips echo into pastProgress; they are states, not
      // moves, and must never appear as candidates.
      if (/^doing it|^honestly not doing/i.test(t)) return;
      if (t && t.length > 8 && t.length <= 52 && !/nothing tried yet/i.test(t)) theirs.push(t);
    });
    // Deterministic shuffle (seeded by goal length) so replays don't reorder.
    const seedN = goal.length + pool.length;
    pool = pool.slice().sort((a, b) =>
      ((a.length * 7 + seedN) % 13) - ((b.length * 7 + seedN) % 13));
    const out = pool.slice(0, 6 - Math.min(theirs.length, 2));
    theirs.slice(0, 2).forEach((t, i) => out.splice(1 + i * 2, 0, t));
    return out.slice(0, 7);
  },

  // ---- The decode loader (v998, Malik's spec) -------------------------
  // Replaces BOTH old loading screens. The elimination-then-settle pair read
  // as two different pages appearing back to back ("why the hell are there
  // TWO loading pages?"), because the candidate list vanished and the layout
  // re-centred halfway through the wait.
  //
  // This is ONE surface for the whole wait: a block of characters churning
  // through letters, digits and symbols. When the plan lands the noise
  // decodes, left to right, into the actual move, so the wait ENDS on the
  // answer instead of cutting to another screen.
  _renderNarrowing() {
    // v1020: the scramble replaces whatever beat was up, so the painted-
    // preview marker is stale the moment this renders.
    this._paintedPreview = null;
    // Every entry invalidates the previous run's timers via the token, so a
    // re-render can never leave two loops racing on one surface.
    this._narrowToken = (this._narrowToken || 0) + 1;
    const token = this._narrowToken;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner"><div class="action-exp__inner action-draft-loading--cine action-scram">
        <p class="action-scram__line" aria-live="polite"><span class="action-scram__on"></span><span class="action-scram__off"></span></p>
        <p class="action-scram__foot">Testing every move against your answers.</p>
      </div></div>`;

    const onEl = this.pageWrap.querySelector('.action-scram__on');
    const offEl = this.pageWrap.querySelector('.action-scram__off');
    const footEl = this.pageWrap.querySelector('.action-scram__foot');
    if (!onEl || !offEl) return;

    const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&*+=/<>[]{}~^?!';
    const NOISE_LEN = 78;          // reads as a few lines of mess on a phone
    const rnd = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    // Word-shaped gaps so it reads as a scrambled SENTENCE, not a data dump.
    const gaps = new Set([6, 13, 21, 26, 34, 43, 49, 57, 62, 70]);
    const noise = (len) => {
      let out = '';
      for (let i = 0; i < len; i++) out += gaps.has(i) ? ' ' : rnd();
      return out;
    };

    // Reduced motion gets no churn at all, just the honest waiting line.
    if (reduced) {
      offEl.textContent = '';
      footEl.textContent = 'Testing every move against your answers. This can take a minute.';
      this._scramWatch(token, null);
      return;
    }

    let target = null;      // set once the plan lands
    let locked = 0;         // how many characters have decoded
    let elapsed = 0;
    const TICK = 50;
    const DECODE_MS = 1400;

    const frame = () => {
      if (!this.isOpen || this._narrowToken !== token || !onEl.isConnected) return;
      if (target == null) {
        // Still working: pure noise, plus an honest nudge once it drags.
        onEl.textContent = '';
        offEl.textContent = noise(NOISE_LEN);
        elapsed += TICK;
        if (elapsed === 6000) footEl.textContent = 'Testing every move against your answers. This can take a minute.';
        this._narrowTimer = setTimeout(frame, TICK);
        return;
      }
      // Decoding: the answer emerges from the left, the tail keeps churning.
      const pct = Math.min(1, locked / DECODE_MS);
      const cut = Math.round(pct * target.length);
      onEl.textContent = target.slice(0, cut);
      offEl.textContent = cut >= target.length ? '' : noise(target.length - cut).slice(0, target.length - cut);
      if (cut >= target.length) { this._onDecoded(token); return; }
      locked += TICK;
      this._narrowTimer = setTimeout(frame, TICK);
    };
    this._narrowTimer = setTimeout(frame, TICK);

    // Hand the decode its answer the moment generation finishes.
    this._scramWatch(token, (text) => {
      if (!text) return;                       // failed: the watcher repaints
      target = String(text).trim();
      locked = 0;
      footEl.classList.add('is-out');
    });
  },

  // The screen's only exit. refreshActionSurface routes through render(),
  // which only reaches renderContent() once tutorialSeen is set, so this
  // surface cannot rely on anything else to repaint it. Without this watcher
  // the loader could strand forever.
  _scramWatch(token, onPlan) {
    // v1163: a hard ceiling on the WAIT. Each request already times out at
    // 75s, but the retry chain (empty, parse, quality) can stack them into
    // minutes of a screen that just churns. Past this, we stop waiting, kill
    // the in-flight call and land on the honest try-again screen.
    const WAIT_CEILING_MS = 100000;
    const startedAt = Date.now();
    const watch = () => {
      if (!this.isOpen || this._narrowToken !== token) return;
      if (actionAiLoading && Date.now() - startedAt > WAIT_CEILING_MS) {
        try { if (aiAbortController) aiAbortController.abort(); } catch (e) {}
        try { actionAiLoading = false; } catch (e) {}
        if (!hasActionPlan()) actionChatError = 'The plan took too long to come back.';
        this.renderContent();
        return;
      }
      if (!actionAiLoading) {
        const pa = (state.action && state.action.primaryAction) || {};
        const move = pa.title || (pa.tiers && pa.tiers[pa.recommendedTier || 'moderate']) || '';
        // No move (generation failed) or no decode to run: repaint normally,
        // which lands on the plan or the honest error screen.
        if (!onPlan || !move) { this.renderContent(); return; }
        onPlan(move);
        return;
      }
      this._narrowWatch = setTimeout(watch, 400);
    };
    this._narrowWatch = setTimeout(watch, 400);
  },

  // The decode finished on the real move. Hold it for a beat so it registers
  // as an answer, then continue into the normal reveal.
  _onDecoded(token) {
    this._narrowTimer = setTimeout(() => {
      if (!this.isOpen || this._narrowToken !== token) return;
      this.renderContent();
    }, 900);
  },

  // (v875: renderTimeframeGate / bindTimeframeGate DELETED, Malik killed the
  // screen. Timeframe belongs to Clarity; the plan generates without one.)

  // Route the plan page to the active view mode. Vine is the default; the
  // mountain stays available behind the toggle.
  _renderPlanByMode() {
    // Night 3 (Malik's locked loop.html render): the daily loop replaces the
    // Leverage Ladder screen wholesale. renderActionPlan and the older
    // renderers stay defined below but are no longer routed to.
    this._renderDailyLoop();
  },

  // ---- Night 3: the daily loop ------------------------------------------
  // Day boundary is 4am LOCAL (Malik's call): a 1am session still belongs to
  // the evening before. Only the loop surfaces use this key; streak math in
  // js/06 keeps its midnight day until Malik migrates it deliberately.
  _loopDayKey(d) {
    const t = d instanceof Date ? d : new Date(d || Date.now());
    return isoToLocalDay(new Date(t.getTime() - 4 * 3600 * 1000).toISOString());
  },
  _loopState() {
    if (!state.action.loop) state.action.loop = { lastOpenDay: '', closedDays: {}, nextAction: '', chained: '' };
    return state.action.loop;
  },
  _loopCompletionsFor(dayKey) {
    const hist = Array.isArray(state.action.completionHistory) ? state.action.completionHistory : [];
    return hist.filter(h => h && h.date && this._loopDayKey(new Date(h.date)) === dayKey);
  },
  _loopKeptDays() {
    const hist = Array.isArray(state.action.completionHistory) ? state.action.completionHistory : [];
    const set = new Set();
    hist.forEach(h => { if (h && h.date) set.add(this._loopDayKey(new Date(h.date))); });
    return set;
  },
  // Day N counts days KEPT (Malik, decision 11): a missed day never advances
  // the number. The day being worked is always kept+1 until it is kept.
  _loopDayNumber() {
    const kept = this._loopKeptDays();
    const today = this._loopDayKey(new Date());
    return kept.has(today) ? kept.size : kept.size + 1;
  },
  _loopWeekday(offsetDays) {
    const d = new Date(Date.now() - 4 * 3600 * 1000 + (offsetDays || 0) * 86400 * 1000);
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  },

  /* ==================== THE DISTANCE (v1113) ====================
     Attendance is the streak's job. This is arrival: if the star names a
     number, the loop carries "62 / 100" and asks for a quiet pulse every few
     days, so the module can eventually say "you are there" instead of only
     "you showed up". A star with no number renders nothing and asks nothing. */
  _distChipHtml() {
    try {
      const gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : null;
      if (!gp || gp.target === null) return '';
      const t = Math.round(gp.target).toLocaleString();
      if (gp.current === null) {
        return `<button type="button" class="aloop-dist aloop-dist--empty" id="aloopDist">${t} ${esc(gp.unit)}<small>set your count</small></button>`;
      }
      const c = Math.round(gp.current).toLocaleString();
      const there = gp.current >= gp.target;
      return `<button type="button" class="aloop-dist${there ? ' aloop-dist--there' : ''}" id="aloopDist"><span class="aloop-dist__nums"><span class="apl-num">${c}</span><i>/</i><span class="apl-num">${t}</span></span><small>${there ? 'you are there' : esc(gp.unit)}</small></button>`;
    } catch (e) { return ''; }
  },

  // One small sheet: a number, Save, and a skip that costs nothing. The same
  // sheet serves the first ask ("where are you today?") and every pulse after.
  openGoalPulse(source) {
    try {
      const gp = (typeof ensureGoalTarget === 'function') ? ensureGoalTarget() : null;
      if (!gp || gp.target === null) return;
      if (document.getElementById('gpulse')) return;
      const day = this._loopDayKey(new Date());
      gp.askedDay = day; try { persistNow(); } catch (e) {}
      const first = gp.current === null;
      const ov = document.createElement('div');
      ov.id = 'gpulse'; ov.className = 'gpulse';
      ov.innerHTML = `
        <div class="gpulse__sheet" role="dialog" aria-label="progress pulse">
          <p class="gpulse__q">${first ? 'Where are you today?' : 'Quick pulse. Where is it now?'}</p>
          <p class="gpulse__u">${esc(gp.unit)} &middot; heading for ${Math.round(gp.target).toLocaleString()}${first ? ' &middot; 0 is a real answer' : ''}</p>
          <input class="gpulse__in apl-num" type="text" inputmode="decimal" autocomplete="off"
                 placeholder="${first ? '0' : (gp.current !== null ? Math.round(gp.current).toLocaleString() : '0')}" aria-label="current count">
          <div class="gpulse__row">
            <button type="button" class="gpulse__save">Save</button>
            <button type="button" class="gpulse__skip">${first ? 'Not now' : 'Skip'}</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('is-open'));
      const input = ov.querySelector('.gpulse__in');
      const close = () => { ov.classList.remove('is-open'); setTimeout(() => { try { ov.remove(); } catch (e) {} }, 220); };
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      ov.querySelector('.gpulse__skip').addEventListener('click', close);
      const save = () => {
        const raw = String(input.value || '').replace(/[,\s$]/g, '');
        if (raw === '') { close(); return; }
        const n = Number(raw);
        if (!isFinite(n) || n < 0) { input.value = ''; input.placeholder = 'a number'; return; }
        if (typeof goalProgressUpdate === 'function') goalProgressUpdate(n);
        close();
        // repaint the chip in place; a full re-render would fight the deck
        try {
          const chip = document.getElementById('aloopDist');
          if (chip && chip.parentNode) {
            const wrap = document.createElement('div');
            wrap.innerHTML = this._distChipHtml();
            const fresh = wrap.firstElementChild;
            if (fresh) {
              chip.replaceWith(fresh);
              fresh.addEventListener('click', (ev) => { ev.stopPropagation(); this.openGoalPulse('chip'); });
            }
          }
        } catch (e) {}
      };
      ov.querySelector('.gpulse__save').addEventListener('click', save);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      setTimeout(() => { try { input.focus(); } catch (e) {} }, 260);
    } catch (e) {}
  },

  // Due = never pulsed, or the last pulse is 3+ days old. Asked at most once
  // a day, only after a completion, never blocking anything.
  _maybeAskGoalPulse() {
    try {
      const gp = state.goalProgress;
      if (!gp || gp.target === null) return;
      const day = this._loopDayKey(new Date());
      if (gp.askedDay === day) return;
      let due = gp.current === null;
      if (!due && gp.updatedAt) {
        const age = Math.round((new Date(day) - new Date(gp.updatedAt)) / 86400000);
        due = age >= 3;
      }
      if (!due) return;
      this._setTimeout(() => { if (this.isOpen) this.openGoalPulse('after-complete'); }, 2600);
    } catch (e) {}
  },

  /* ==================== THE ADAPTIVE OPEN (v1113) ====================
     The profile has noticed patterns for weeks; now the loop ACTS on one.
     Deterministic and explainable, decided once per day at the morning
     boundary, and it only moves the OPENING tier: the user can always swipe
     away from it.
       re-entry: 2+ missed days in a row -> open one rung below the last
                 completed rung (floor tiny). Coming back small is how you
                 come back at all.
       groove:   last 3 completions all on one rung that is not the current
                 opening -> open there. The pattern IS the preference.
       growth:   last 3 completions all above the current opening -> open one
                 rung up. They already outgrew the default.
     The decision is written to state.action.tierAdapt so the AI profile can
     say it out loud and the UI can whisper it later. */
  _adaptOpeningTier() {
    try {
      const KEYS = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
      const led = (state.action && Array.isArray(state.action.ledger)) ? state.action.ledger : [];
      if (led.length < 3) return;
      const pa = state.action.primaryAction || {};
      const cur = KEYS.indexOf(state.action.selectedTier) >= 0 ? state.action.selectedTier
        : (KEYS.indexOf(pa.recommendedTier) >= 0 ? pa.recommendedTier : 'moderate');
      const curIdx = KEYS.indexOf(cur);
      const recent = led.slice(-7);
      let trailingMisses = 0;
      for (let i = recent.length - 1; i >= 0 && recent[i].outcome === 'missed'; i--) trailingMisses++;
      const doneRungs = led.filter(r => r.outcome === 'done').slice(-3).map(r => Number(r.offeredRung));
      let to = null, reason = '';
      if (trailingMisses >= 2) {
        const lastDone = led.filter(r => r.outcome === 'done').slice(-1)[0];
        const base = lastDone ? Number(lastDone.offeredRung) - 1 : 1;
        to = KEYS[Math.max(0, Math.min(4, base - 1))];
        reason = 're-entry';
      } else if (doneRungs.length === 3 && doneRungs[0] === doneRungs[1] && doneRungs[1] === doneRungs[2] && (doneRungs[0] - 1) !== curIdx) {
        to = KEYS[Math.max(0, Math.min(4, doneRungs[0] - 1))];
        reason = 'groove';
      } else if (doneRungs.length === 3 && doneRungs.every(r => (r - 1) > curIdx)) {
        to = KEYS[Math.min(4, curIdx + 1)];
        reason = 'growth';
      }
      if (!to || to === cur) return;
      state.action.selectedTier = to;
      state.action.tierAdapt = { day: this._loopDayKey(new Date()), from: cur, to: to, reason: reason };
      try { persistNow(); } catch (e) {}
    } catch (e) {}
  },

  _renderDailyLoop() {
    // Seal any days that closed since the last open (misses become facts).
    try { actionLedgerBackfill(); } catch (e) {}
    const loop = this._loopState();
    const today = this._loopDayKey(new Date());
    const kept = this._loopKeptDays();
    // The morning open: a NEW day with history behind it gets the number
    // rotation before anything else. Keyed to the day so a session that
    // crosses 4am gets tomorrow's rotation too.
    if (loop.lastOpenDay && loop.lastOpenDay !== today && kept.size > 0 && this._morningShownFor !== today) {
      this._renderMorningOpen();
      return;
    }
    if (loop.lastOpenDay !== today) {
      loop.lastOpenDay = today;
      // v1113: the day's opening tier adapts to the pattern before first paint.
      this._adaptOpeningTier();
      try { persistNow(); } catch (e) {}
    }
    // A chained "Do it now" action in flight outranks the summary: the card
    // must survive re-renders (tab switch, reopen) until it is completed.
    if (String(loop.chained || '').trim()) { this._renderLoopCard(); return; }
    const doneToday = this._loopCompletionsFor(today);
    if (doneToday.length > 0) { this._renderTodaySoFar(); return; }
    this._renderLoopCard();
  },

  _renderLoopCard() {
    const pa = state.action.primaryAction || {};
    const KEYS = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    let tier = KEYS.indexOf(state.action.selectedTier) >= 0 ? state.action.selectedTier
      : (KEYS.indexOf(pa.recommendedTier) >= 0 ? pa.recommendedTier : 'moderate');
    const loop = this._loopState();
    const chained = String(loop.chained || '').trim();
    const dayN = this._loopDayNumber();
    const doneTodayN = this._loopCompletionsFor(this._loopDayKey(new Date())).length;
    const chainLine = doneTodayN > 0
      ? 'Chained from what you just finished. Same day, same push.'
      : 'You locked this in last night. Today starts here.';
    // v1115: THE HEAT LOOP (p01, Malik-approved). ONE content-sized card.
    // Every tier's text lives in the DOM as .aheat-v/.aheat-vi spans and the
    // root's data-tier picks the visible one, so changing the level never
    // re-renders the screen (take the ELEMENT, not its text: flattening
    // showed every time value at once in the mockup rounds).
    const vBlock = (fn) => KEYS.map(k => `<span class="aheat-v aheat-v--${k}">${esc(String(fn(k) || ''))}</span>`).join('');
    const viBlock = (fn) => KEYS.map(k => `<span class="aheat-vi aheat-vi--${k}">${esc(String(fn(k) || ''))}</span>`).join('');
    const timeOf = (k) => String((pa.tierTime && pa.tierTime[k]) || '').replace(/utes?$/, '');
    const hasTime = KEYS.some(k => timeOf(k));
    const frontHtml = chained
      ? `<h2 class="aheat-move">${esc(chained)}</h2><p class="aheat-chainline">${chainLine}</p>`
      : `<h2 class="aheat-move">${vBlock(k => (pa.tiers && pa.tiers[k]) || pa.title)}</h2>` +
        (hasTime ? `<p class="aheat-time apl-num"><span class="aheat-tilde">~</span><span>${viBlock(timeOf)}</span></p>` : '');
    const bk = (label, inner) => inner ? `<div><span class="aheat-bk">${label}</span><span class="aheat-bv">${inner}</span></div>` : '';
    // "Built from" left the card front (Malik: it is just the star restated),
    // but the receipt is still the door to editing the plan's facts, so it
    // lives quietly at the end of the BACK.
    const backHtml = chained ? '' : `
              <div class="aheat-face aheat-back"><div class="aheat-cbody">
                ${pa.why ? `<p class="aheat-why">${esc(pa.why)}</p><hr class="aheat-brule">` : ''}
                ${bk('First step', pa.howToStart ? esc(pa.howToStart) : '')}
                ${bk('Done when', (pa.tierDone && KEYS.some(k => pa.tierDone[k])) ? viBlock(k => pa.tierDone && pa.tierDone[k]) : '')}
                ${bk('If stuck', pa.ifStuck ? esc(pa.ifStuck) : '')}
                <button type="button" class="aheat-builtfrom" id="aheatBuiltFrom">Built from</button>
              </div></div>`;
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner"><div class="aloop aheat${chained ? ' aheat--chained' : ''}" data-tier="${tier}">
        <div class="aheat-level" aria-hidden="true">
          <span class="aheat-level__k">Level</span>
          <span class="aheat-level__n apl-num" id="aheatLevelN">${KEYS.indexOf(tier) + 1}</span>
          <span class="aheat-level__t" id="aheatLevelT">${tier}</span>
        </div>
        <div class="aloop-top">
          <div class="aloop-day"><span class="aloop-day__k">Day</span><span class="aloop-day__n apl-num">${dayN}</span></div>
        </div>
        <div class="aloop-mid">
          <div class="aheat-stage">
            <div class="aheat-card" id="aheatCard">
              <div class="aheat-face aheat-front">
                <div class="aheat-cbody">${frontHtml}</div>
                <div class="aheat-mark" aria-hidden="true"><svg viewBox="140 136 232 240"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z" fill="currentColor"/></svg></div>
              </div>
              ${backHtml}
            </div>
          </div>
          <button type="button" class="aloop-notthis" id="aloopNotThis">Not this action</button>
          ${chained ? '' : `<div class="aheat-dial" id="aheatDial" aria-label="turn to set the level"><div class="aheat-dial__face"><div class="aheat-dial__knurl"></div></div><div class="aheat-dial__index"></div></div>`}
        </div>
        <div class="aloop-bot">
          <button type="button" class="aloop-hold" id="aloopHold"><i class="aloop-hold__fill" aria-hidden="true"></i><span>Hold to complete</span><small>press and hold</small></button>
          <button type="button" class="aloop-focus" id="aloopFocus"><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.2 1.6M9 2.5h6"/></svg>Focus${chained || !hasTime ? '' : `<span class="apl-num">${viBlock(timeOf)}</span>`}</button>
        </div>
      </div></div>`;
    const root = this.pageWrap.querySelector('.aloop');
    const expEl = this.el;
    if (expEl) expEl.dataset.heat = tier;
    const liveTier = () => (KEYS.indexOf(state.action.selectedTier) >= 0 ? state.action.selectedTier : tier);

    const card = root.querySelector('#aheatCard');
    const level = root.querySelector('.aheat-level');
    const numEl = root.querySelector('#aheatLevelN');
    const txtEl = root.querySelector('#aheatLevelT');
    // the flat colour behind the level screen and the number's size, per rung;
    // both interpolate from the FRACTIONAL level while turning.
    const HUES = [[20, 23, 29], [43, 111, 214], [31, 194, 117], [179, 45, 28], [242, 244, 247]];
    const SIZE = [20, 27, 34, 42, 52];

    // Measured heights: a minimal front in a box sized for the back reads as
    // an empty panel; a back clipped to the front's height reads as broken.
    // So measure both and let one transition carry the card between them.
    const sizeCard = () => {
      try {
        const fb = card.querySelector('.aheat-front .aheat-cbody');
        const bb = card.querySelector('.aheat-back .aheat-cbody');
        if (!fb) return;
        const pad = 44; // the faces' 22px padding, both ends
        const front = Math.max(120, fb.scrollHeight + pad + 8);
        root.style.setProperty('--afront', Math.round(front) + 'px');
        if (bb) {
          const mid = root.querySelector('.aloop-mid');
          const dialEl = root.querySelector('#aheatDial');
          const nt = root.querySelector('#aloopNotThis');
          const cap = mid ? mid.clientHeight
            - (dialEl ? dialEl.offsetHeight + 14 : 0)
            - (nt ? nt.offsetHeight + 16 : 0) : 0;
          let back = bb.scrollHeight + pad;
          if (cap > 160) back = Math.min(back, cap); // the back scrolls inside past this
          root.style.setProperty('--aback', Math.round(Math.max(back, front)) + 'px');
        }
      } catch (e) {}
    };
    sizeCard();
    requestAnimationFrame(sizeCard);
    if (this._aheatResize) { try { window.removeEventListener('resize', this._aheatResize); } catch (e) {} }
    this._aheatResize = sizeCard;
    window.addEventListener('resize', sizeCard);

    // Only the INTEGER rung is committed to the card; the level screen rides
    // the fraction. Committing re-measures because the move's length changes.
    const commit = (i) => {
      i = Math.max(0, Math.min(4, i));
      const k = KEYS[i];
      if (state.action.selectedTier === k && root.dataset.tier === k) return;
      state.action.selectedTier = k;
      try { persistNow(); } catch (e) {}
      root.dataset.tier = k;
      if (expEl) expEl.dataset.heat = k;
      sizeCard();
      try { if (typeof MementoSound !== 'undefined' && MementoSound.tick) MementoSound.tick(); } catch (e) {}
    };
    const lerp = (a, b, t) => a + (b - a) * t;
    const mix = (f) => {
      const lo = Math.max(0, Math.min(4, Math.floor(f)));
      const hi = Math.min(4, lo + 1);
      const t = Math.max(0, Math.min(1, f - lo));
      const c = [0, 1, 2].map(n => Math.round(lerp(HUES[lo][n], HUES[hi][n], t)));
      return { rgb: 'rgb(' + c.join(',') + ')', size: lerp(SIZE[lo], SIZE[hi], t),
               dark: (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) > 150 };
    };
    const paint = (f) => {
      const i = Math.max(0, Math.min(4, Math.round(f)));
      const m = mix(Math.max(0, Math.min(4, f)));
      if (level) {
        level.style.backgroundColor = m.rgb;
        level.style.setProperty('--ansize', m.size.toFixed(2));
        level.style.color = m.dark ? 'rgba(12,14,20,0.97)' : 'rgba(255,255,255,0.97)';
      }
      if (numEl) numEl.textContent = String(i + 1);
      if (txtEl) txtEl.textContent = KEYS[i];
      commit(i);
    };

    // THE DIAL: it looks like a wheel but reads a horizontal drag, because a
    // real rotary gesture is miserable with a thumb. 58px per level, rubber
    // band past the ends, snaps to the nearest detent on release.
    const dial = root.querySelector('#aheatDial');
    if (dial) {
      const knurl = dial.querySelector('.aheat-dial__knurl');
      const STEP = 58;
      let pid = null, x0 = 0, y0 = 0, startV = 2, val = 2, dir = 0;
      dial.addEventListener('pointerdown', (e) => {
        pid = e.pointerId; x0 = e.clientX; y0 = e.clientY;
        startV = val = KEYS.indexOf(liveTier()); dir = 0;
        try { dial.setPointerCapture(pid); } catch (err) {}
      });
      dial.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pid) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (!dir) {
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
          dir = Math.abs(dx) > Math.abs(dy) * 1.1 ? 1 : -1;
          if (dir === -1) { pid = null; return; }
          root.classList.add('is-turning');
        }
        let raw = startV + dx / STEP;
        if (raw < 0) raw = raw * 0.35;
        if (raw > 4) raw = 4 + (raw - 4) * 0.35;
        val = raw;
        if (knurl) knurl.style.transform = 'translate3d(' + (dx * 0.9 % 44) + 'px,0,0)';
        paint(val);
      });
      const release = (e) => {
        if (e.pointerId !== pid) return;
        try { dial.releasePointerCapture(pid); } catch (err) {}
        pid = null;
        if (dir === 1) { paint(Math.round(Math.max(0, Math.min(4, val)))); root.classList.remove('is-turning'); }
        dir = 0;
      };
      dial.addEventListener('pointerup', release);
      dial.addEventListener('pointercancel', release);
      paint(KEYS.indexOf(tier));
    }

    // Tap flips to the brief; a horizontal swipe on the card is the SECONDARY
    // way to change the level (the dial is primary). Chained cards do neither.
    if (!chained && card) {
      let sx = null, sy = null, moved = false;
      card.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; moved = false; });
      card.addEventListener('pointermove', (e) => {
        if (sx === null) return;
        if (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8) moved = true;
      });
      card.addEventListener('pointerup', (e) => {
        if (sx === null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        sx = null;
        if (e.target && e.target.closest && e.target.closest('.aheat-builtfrom')) return;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          const i = KEYS.indexOf(liveTier());
          commit(dx < 0 ? Math.min(4, i + 1) : Math.max(0, i - 1));
          return;
        }
        if (!moved) root.classList.toggle('is-flip');
      });
      card.addEventListener('pointercancel', () => { sx = null; });
    }

    // Hold to complete: a real press, not a tap. Fill runs ~900ms; letting go
    // early resets with no penalty.
    const hold = root.querySelector('#aloopHold');
    const fill = hold.querySelector('.aloop-hold__fill');
    let holdT = null;
    const cancel = () => {
      if (holdT) { clearTimeout(holdT); holdT = null; }
      fill.style.transition = 'transform 180ms ease-out';
      fill.style.transform = 'scaleX(0)';
    };
    hold.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      fill.style.transition = 'transform 900ms linear';
      fill.style.transform = 'scaleX(1)';
      holdT = setTimeout(() => { holdT = null; this._loopComplete(liveTier(), chained); }, 920);
    });
    hold.addEventListener('pointerup', cancel);
    hold.addEventListener('pointerleave', cancel);
    hold.addEventListener('pointercancel', cancel);

    // Focus preloads THIS tier's honest time (Malik, decision 12).
    root.querySelector('#aloopFocus').addEventListener('click', (e) => {
      e.stopPropagation();
      this._loopOpenFocus(pa, liveTier(), chained);
    });

    // The receipt (v1105): the facts this plan is built from, editable.
    const bfBtn = root.querySelector('#aheatBuiltFrom');
    if (bfBtn) bfBtn.addEventListener('click', (e) => { e.stopPropagation(); this.openReceipt(); });

    // The rare case where the action itself is wrong: quiet, two-step, honest.
    const notThis = root.querySelector('#aloopNotThis');
    notThis.addEventListener('click', () => {
      if (!notThis.dataset.armed) {
        notThis.dataset.armed = '1';
        notThis.textContent = 'Ask for a different action?';
        this._setTimeout(() => { try { notThis.dataset.armed = ''; notThis.textContent = 'Not this action'; } catch (e) {} }, 3200);
        return;
      }
      state.meta.planRevealSeen = true; // a swap is not a new ceremony
      try { persistNow(); } catch (e) {}
      generateActionDraft();
    });
  },

  _loopOpenFocus(pa, tier, chained) {
    try {
      if (state.introsSeen && !state.introsSeen.deepwork) { state.introsSeen.deepwork = true; try { persistNow(); } catch (e) {} }
      if (typeof Sheet === 'undefined' || !Sheet.open) return;
      window.__dwFromAction = true;
      Sheet.open('deepwork');
      try { rememberView('action'); } catch (e) {}
      const moveText = chained || (pa.tiers && pa.tiers[tier]) || pa.title || '';
      const mins = parseInt(String((pa.tierTime && pa.tierTime[tier]) || ''), 10) || 25;
      setTimeout(() => {
        try {
          const body = Sheet.body;
          if (!body) return;
          const inp = body.querySelector('#dwIntention');
          if (inp && moveText) inp.value = moveText;
          // Pick the closest preset at or above the tier's honest time.
          const presets = Array.from(body.querySelectorAll('.dw-preset[data-min]'))
            .map(b => ({ b, m: parseInt(b.getAttribute('data-min'), 10) || 0 }))
            .filter(p => p.m > 0).sort((a, b2) => a.m - b2.m);
          const pick = presets.find(p => p.m >= mins) || presets[presets.length - 1];
          if (pick) pick.b.click();
          const fb = body.querySelector('#dwFocus');
          if (fb) fb.click();
        } catch (e) {}
      }, 60);
    } catch (e) {}
  },

  _loopComplete(tier, chainedText) {
    try { if (this.el) delete this.el.dataset.heat; } catch (e) {}
    const pa = state.action.primaryAction || {};
    const actionText = chainedText || (pa.tiers && pa.tiers[tier]) || pa.title || '';
    if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
    const completion = createActionCompletionRecord(pa, tier, actionText);
    state.action.completionHistory.push(completion);
    const loop = this._loopState();
    if (chainedText) loop.chained = '';
    loop.nextAction = '';
    try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier, missionId: completion.missionId } }); } catch (e) {}
    if (typeof recalculateStreak === 'function') { try { recalculateStreak(); } catch (e) {} }
    try { persistNow(); } catch (e) {}
    try { if (typeof TabBar !== 'undefined' && TabBar.updateHomeDot) TabBar.updateHomeDot(); } catch (e) {}
    // The chain: one small fast call names the next action while the green
    // flood and the capture play. Fire and forget; empty on failure.
    try {
      if (typeof generateNextLoopAction === 'function') {
        generateNextLoopAction().then(t => {
          if (t) { this._loopState().nextAction = t; try { persistNow(); } catch (e) {} }
        }).catch(() => {});
      }
    } catch (e) {}
    // v886 doctrine: a completed DOOR rolls into the next move the same day.
    try {
      if (pa.shape === 'door' && typeof regenerateActionPlanForNextStep === 'function') {
        setTimeout(() => { try { regenerateActionPlanForNextStep(); } catch (e2) {} }, 2600);
      }
    } catch (e) {}
    this._renderGreenFlood(actionText, completion);
    // v1113: the pulse rides behind the completion moment, never in front.
    this._maybeAskGoalPulse();
  },

  _renderGreenFlood(actionText, completion) {
    const n = this._loopCompletionsFor(this._loopDayKey(new Date())).length;
    const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
    const line = 'That is ' + (words[n - 1] || n) + '.';
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner"><div class="aloop-green">
        <div class="aloop-green__flood" aria-hidden="true"></div>
        <div class="aloop-green__body">
          <p class="aloop-green__struck">${esc(actionText)}</p>
          <p class="aloop-green__line">${esc(line)}</p>
        </div>
      </div></div>`;
    // v1002: MementoSound's public API is play(name)/tick only; .done was an
    // authored SOUND (js/20-sound.js), not a method, so the old guarded call
    // silently no-oped and completing the day was silent.
    try { if (typeof MementoSound !== 'undefined' && MementoSound.play) MementoSound.play('done'); } catch (e) {}
    this._setTimeout(() => { if (this.isOpen) this._renderCapture(completion); }, 2100);
  },

  // One line about it, or skip: EQUAL weight (Malik's call). The line lands
  // on the completion record and becomes evidence later.
  _renderCapture(completion) {
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner"><div class="aloop-capture">
        <div class="aloop-capture__body">
          <p class="aloop-capture__q">One line about it. What happened?</p>
          <textarea class="aloop-capture__input" id="aloopNote" rows="2" maxlength="200" placeholder=""></textarea>
        </div>
        <div class="aloop-capture__row">
          <button type="button" class="aloop-capture__btn" id="aloopSkip">Skip</button>
          <button type="button" class="aloop-capture__btn" id="aloopSave">Save</button>
        </div>
      </div></div>`;
    const done = (save) => {
      if (save) {
        const v = String((this.pageWrap.querySelector('#aloopNote') || {}).value || '').trim();
        if (v && completion) { completion.note = v; try { persistNow(); } catch (e) {} }
      }
      this._renderTodaySoFar();
    };
    this.pageWrap.querySelector('#aloopSkip').addEventListener('click', () => done(false));
    this.pageWrap.querySelector('#aloopSave').addEventListener('click', () => done(true));
  },

  _renderTodaySoFar() {
    try { if (this.el) delete this.el.dataset.heat; } catch (e) {}
    const pa = state.action.primaryAction || {};
    const loop = this._loopState();
    const today = this._loopDayKey(new Date());
    const rows = this._loopCompletionsFor(today);
    const closed = !!(loop.closedDays && loop.closedDays[today]);
    const weekday = this._loopWeekday(0);
    const rowHtml = rows.map(r => {
      // The tier time is only true for the tier move itself; chained one-off
      // actions carry no honest time, so they show none.
      const isTierMove = !!(pa.tiers && pa.tiers[r.tier] && r.actionText === pa.tiers[r.tier]);
      const t = isTierMove ? ((pa.tierTime && pa.tierTime[r.tier]) || '') : '';
      return `<div class="aloop-rrow"><span class="aloop-rrow__tick">&#10003;</span><span class="aloop-rrow__t">${esc(r.actionText)}</span>${t ? `<span class="aloop-rrow__m apl-num">${esc(t)}</span>` : ''}</div>`;
    }).join('');
    const next = String(loop.nextAction || '').trim();
    const nextBlock = closed
      ? `<hr class="aloop-rule"><p class="aloop-card__cap">Day ${this._loopDayNumber()} kept. Locked for tomorrow${next ? ':' : '.'}</p>${next ? `<p class="aloop-next__t">${esc(next)}</p>` : ''}`
      : `<hr class="aloop-rule"><p class="aloop-card__cap">Your next action</p>
         <p class="aloop-next__t">${esc(next || (pa.tiers && pa.tiers[state.action.selectedTier || pa.recommendedTier || 'moderate']) || pa.title || '')}</p>
         <div class="aloop-pillrow">
           <button type="button" class="aloop-pill" id="aloopDoNow">Do it now</button>
           <button type="button" class="aloop-pill aloop-pill--go" id="aloopFinish">Finish today</button>
         </div>`;
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner"><div class="aloop aloop--sofar">
        <div class="aloop-dayname">${esc(weekday)}</div>
        <div class="aloop-mid">
          <div class="aloop-nextcard">${rowHtml}${nextBlock}</div>
        </div>
      </div></div>`;
    if (closed) return;
    this.pageWrap.querySelector('#aloopDoNow').addEventListener('click', () => {
      const loop2 = this._loopState();
      loop2.chained = next || '';
      try { persistNow(); } catch (e) {}
      this._renderLoopCard();
    });
    this.pageWrap.querySelector('#aloopFinish').addEventListener('click', () => {
      const loop2 = this._loopState();
      if (!loop2.closedDays) loop2.closedDays = {};
      loop2.closedDays[today] = true;
      try { persistNow(); } catch (e) {}
      try { exitToModules('action'); } catch (e) { this._renderTodaySoFar(); }
    });
  },

  // The morning open: yesterday's number holds, then the line rotates left
  // and today lands with what is next.
  _renderMorningOpen() {
    try { if (this.el) delete this.el.dataset.heat; } catch (e) {}
    this._morningShownFor = this._loopDayKey(new Date());
    const loop = this._loopState();
    const pa = state.action.primaryAction || {};
    const today = this._loopDayKey(new Date());
    const kept = this._loopKeptDays();
    const yNum = kept.size;               // days kept through yesterday
    const tNum = yNum + 1;                // the day being opened
    const yKey = loop.lastOpenDay;
    const yRows = this._loopCompletionsFor(yKey).map(r =>
      `<div class="aloop-rrow"><span class="aloop-rrow__tick">&#10003;</span><span class="aloop-rrow__t">${esc(r.actionText)}</span></div>`).join('');
    const KEYS = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];
    const tier = KEYS.indexOf(state.action.selectedTier) >= 0 ? state.action.selectedTier : (pa.recommendedTier || 'moderate');
    const cadence = (pa.tiers && pa.tiers[tier]) || pa.title || '';
    const next = String(loop.nextAction || '').trim();
    const tRows = [next, next === cadence ? '' : cadence].filter(Boolean).map(t =>
      `<div class="aloop-rrow"><span class="aloop-openbox" aria-hidden="true"></span><span class="aloop-rrow__t">${esc(t)}</span></div>`).join('');
    const beat = (a, b, c, label, rowsHtml, cta) => `
      <div class="aloop-morning__body">
        <div class="aloop-numrow">
          <span class="aloop-numside apl-num">${a}</span>
          <span class="aloop-numbig apl-num">${b}</span>
          <span class="aloop-numside apl-num">${c}</span>
        </div>
        <p class="aloop-numlab">${label}</p>
        <div class="aloop-morning__rows">${rowsHtml}</div>
      </div>
      ${cta ? '<div class="aloop-bot"><button type="button" class="aloop-hold aloop-start" id="aloopStart"><span>Start today</span></button></div>' : ''}`;
    this.pageWrap.innerHTML = `
      <div class="action-exp__page-inner"><div class="aloop aloop--morning">
        <div class="aloop-mid" id="aloopMorning">${beat(yNum - 1 > 0 ? yNum - 1 : '', yNum, tNum, 'Yesterday', yRows, false)}</div>
      </div></div>`;
    const host = this.pageWrap.querySelector('#aloopMorning');
    this._setTimeout(() => {
      if (!this.isOpen || !host.isConnected) return;
      host.classList.add('is-rotating');
      this._setTimeout(() => {
        if (!this.isOpen || !host.isConnected) return;
        host.classList.remove('is-rotating');
        host.innerHTML = beat(yNum, tNum, tNum + 1, 'Today', tRows, true);
        const btn = host.querySelector('#aloopStart');
        if (btn) btn.addEventListener('click', () => {
          loop.lastOpenDay = today;
          // The day opens ON the action locked last night; the cadence move
          // waits underneath it. Consumed here so it never goes stale.
          if (next) { loop.chained = next; loop.nextAction = ''; }
          try { persistNow(); } catch (e) {}
          this._renderDailyLoop();
        });
      }, 340);
    }, 2400);
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
      '@media (prefers-reduced-motion:reduce){.apl-step__panel,.apl-chev,.apl-btn,.apl-seg__btn{transition-duration:0.01ms;}}',
      // ===== A5 / A9 (v825, Malik's locked finals): one task, five bars, one
      // CTA. Dark cinema in both themes (like the 7-days surface). =====
      '.a5-screen{background:#060608;--a5-hi:rgba(var(--ink),0.96);--a5-mid:rgba(var(--ink),0.72);--a5-lo:rgba(var(--ink),0.5);}',
      'html.theme-light .a5-screen{background:#eef0f3;}',
      '.a5-wrap{position:relative;z-index:1;max-width:560px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;padding:calc(var(--safe-t) + 22px) 24px calc(var(--safe-b) + 26px);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;box-sizing:border-box;}',
      '.a5-top{width:100%;display:flex;justify-content:center;min-height:28px;align-items:center;}',
      '@media (max-width:859.98px){.a5-top{padding-right:44px;justify-content:flex-start;}}',
      '.a5-date{font-size:0.75rem;color:var(--a5-lo);}',
      '.a5-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;}',
      '.a5-mid .a5-task{margin-bottom:24px;}',
      '.a5-mid .a5-bars{margin-bottom:14px;}',
      '.a5-time{font-size:0.75rem;color:var(--a5-lo);margin-bottom:26px;}',
      '.a5-mid .a5-cta{margin-bottom:6px;}',
      '.a5-task{font-size:clamp(1.5rem,5.8vw,1.75rem);font-weight:700;letter-spacing:-0.025em;line-height:1.2;color:var(--a5-hi);margin:0;text-wrap:balance;max-width:22ch;}',
      '.a5-bars{display:flex;align-items:flex-end;gap:5px;height:22px;}',
      '.a5-bar{position:relative;display:flex;align-items:flex-end;border:none;background:transparent;padding:0 2px;cursor:pointer;height:22px;}',
      '.a5-bar::after{content:"";position:absolute;inset:-12px -4px;}',
      '.a5-bar i{display:block;width:6px;border-radius:2px;background:rgba(var(--ink),0.14);transition:background 0.15s ease;}',
      '.a5-bar i.on{background:var(--success);}',
      '.a5-foot{width:100%;display:flex;flex-direction:column;gap:14px;align-items:center;}',
      '.a5-cta{width:100%;height:48px;border:none;border-radius:calc(10px * var(--rx,1));background:var(--solid-bg);color:var(--solid-fg);font-family:inherit;font-size:0.90625rem;font-weight:700;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,0.4);transition:transform 0.15s ease;}',
      '.a5-cta:active{transform:scale(0.985);}',
      '.a5-focus{border:none;background:transparent;padding:6px 12px;font-family:inherit;font-size:0.8125rem;color:var(--a5-mid);cursor:pointer;}',
      '.a5-focus:active,.a5-focus:hover{color:var(--a5-hi);}',
      '.a5-stats{font-size:0.71875rem;color:var(--a5-lo);}',
      // ----- A9 done receipt (left-aligned, per the mock) -----
      '.a5-mid--left{align-items:flex-start;text-align:left;justify-content:center;}',
      '.a5-done-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;}',
      '.a5-done-dot{width:8px;height:8px;border-radius:50%;background:var(--success);}',
      '.a5-done-label{font-size:0.84375rem;font-weight:700;color:var(--success);}',
      '.a5-task--left{max-width:none;text-wrap:balance;font-size:clamp(1.4rem,5.4vw,1.5625rem);margin-bottom:26px;}',
      '.a5-bars-row{display:flex;align-items:center;gap:12px;margin-bottom:30px;}',
      '.a5-banked{font-size:0.71875rem;color:var(--success);}',
      '.a5-receipt{width:100%;display:flex;flex-direction:column;gap:10px;}',
      '.a5-rrow{display:flex;justify-content:space-between;align-items:baseline;gap:16px;font-size:0.8125rem;}',
      '.a5-rlabel{color:var(--a5-lo);}',
      '.a5-rval{font-weight:700;color:var(--a5-hi);text-align:right;}',
      '.a5-ghost{width:100%;height:44px;border:none;border-radius:calc(10px * var(--rx,1));background:rgba(var(--ink),0.07);color:var(--a5-hi);font-family:inherit;font-size:0.84375rem;font-weight:600;cursor:pointer;box-shadow:var(--glass-highlight);}',
      // v1105: the everyday foot is a quiet row: stats left, the receipt entry right.
      '.a5-foot--row{flex-direction:row;justify-content:space-between;align-items:center;gap:10px;}',
      '.a5-from{width:auto;height:auto;background:transparent;box-shadow:none;padding:6px 0;color:var(--a5-mid);font-weight:600;font-size:0.75rem;}',
      '.a5-from:active,.a5-from:hover{color:var(--a5-hi);}',
      '@media (prefers-reduced-motion:reduce){.a5-cta,.a5-bar i{transition-duration:0.01ms;}}',
      // v858: A5 follows the theme (Malik's call); the light bg is set above.
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
    // Prefer the user's saved pick (state.action.selectedTier) so a tier chosen
    // elsewhere (coach shrink, home hero) shows here too; fall back to the AI rec.
    let selectedTier = TIER_KEYS.indexOf(state.action && state.action.selectedTier) >= 0
      ? state.action.selectedTier
      : (TIER_KEYS.indexOf(pa.recommendedTier) >= 0 ? pa.recommendedTier : 'moderate');
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

    // Completion belongs to this exact mission, not merely to the calendar day.
    // A Door can generate a second move on the same day; the old receipt must not
    // make that new move look complete.
    const todayStr = getTodayISO();
    const todayCompletion = actionCompletionForDay(todayStr, pa);
    const completedToday = !!todayCompletion;

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

    // ----- build markup: A5 centered landing / A9 done receipt (v825) -----
    // Malik's locked finals (artifact 4b250d1e): one task, five difficulty
    // bars, one CTA, focus optional. No eyebrows, no why/path/notes cards.
    const esc2 = esc;
    const BAR_HEIGHTS = [8, 11, 14, 17, 20];
    const tierIdx = Math.max(0, TIER_KEYS.indexOf(selectedTier));
    const barsHtml = (fillAll) =>
      '<div class="a5-bars' + (fillAll ? ' a5-bars--banked' : '') + '" id="a5Bars" role="radiogroup" aria-label="Difficulty">' +
        TIER_KEYS.map((k, i) =>
          '<button type="button" class="a5-bar" role="radio" aria-checked="' + ((fillAll ? true : i <= tierIdx) ? 'true' : 'false') + '" aria-label="' + esc2(TIER_META[k].name) + '" data-tier="' + k + '">' +
            '<i style="height:' + BAR_HEIGHTS[i] + 'px"' + ((fillAll || i <= tierIdx) ? ' class="on"' : '') + '></i>' +
          '</button>'
        ).join('') +
      '</div>';

    // Next milestone = the nearest horizon on the plan path (path runs small
    // to big; the ladder reverses it for display).
    const nextMilestone = (rawPath.length ? (rawPath[0].milestone || '') : '') || goalText;

    let screenHtml;
    if (completedToday) {
      // A9: the receipt. The green Done mark carries the tense; the move text
      // stays verbatim (no fabricated past-tense rewriting of user words).
      const lastDone = todayCompletion || {};
      const doneText = lastDone.actionText || moveText || title;
      screenHtml =
        '<div class="a5-wrap a5-wrap--done">' +
          '<header class="a5-top"><span class="a5-date apl-num">' + esc2(dateStr) + '</span></header>' +
          '<div class="a5-mid a5-mid--left">' +
            '<div class="a5-done-row"><span class="a5-done-dot" aria-hidden="true"></span><span class="a5-done-label">Done</span></div>' +
            '<h1 class="a5-task a5-task--left">' + esc2(doneText) + '</h1>' +
            '<div class="a5-bars-row">' + barsHtml(true) + '<span class="a5-banked">banked</span></div>' +
            '<div class="a5-receipt">' +
              '<div class="a5-rrow"><span class="a5-rlabel">Shown up</span><span class="a5-rval apl-num">' + streakCount + (streakCount === 1 ? ' day' : ' days') + '</span></div>' +
              '<div class="a5-rrow"><span class="a5-rlabel">Proof</span><span class="a5-rval apl-num">#' + doneCount + '</span></div>' +
              '<div class="a5-rrow"><span class="a5-rlabel">Toward</span><span class="a5-rval">' + esc2(String(nextMilestone).slice(0, 60)) + '</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="a5-foot">' +
            '<button type="button" class="a5-ghost" id="a5CloseDay">Close the day &rarr;</button>' +
          '</div>' +
        '</div>';
    } else {
      screenHtml =
        '<div class="a5-wrap">' +
          '<header class="a5-top"><span class="a5-date apl-num">' + esc2(dateStr) + '</span></header>' +
          '<div class="a5-mid">' +
            '<h1 class="a5-task">' + esc2(moveText || title) + '</h1>' +
            barsHtml(false) +
            ((pa.tierTime && pa.tierTime[selectedTier]) ? '<div class="a5-time apl-num">~' + esc2(pa.tierTime[selectedTier]) + '</div>' : '') +
            '<button type="button" class="a5-cta" id="aplMarkDone">I did it</button>' +
            '<button type="button" class="a5-focus" id="aplFocus">Focus for 25 min</button>' +
          '</div>' +
          '<div class="a5-foot a5-foot--row">' +
            '<div class="a5-stats apl-num">day ' + streakCount + ' &middot; ' + doneCount + ' proofs</div>' +
            '<button type="button" class="a5-ghost a5-from" id="a5Receipt">What this is built from</button>' +
          '</div>' +
        '</div>';
    }

    inst.pageWrap.innerHTML =
      '<div class="action-plan-page apl-screen a5-screen">' + screenHtml + '</div>';

    // ===== wiring =====
    // Difficulty bars: tap sets the tier (existing tier-set logic + persist).
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
    inst.pageWrap.querySelectorAll('#a5Bars .a5-bar').forEach(b => {
      b.addEventListener('click', (e) => { e.stopPropagation(); if (!completedToday) selectTier(b.getAttribute('data-tier')); });
    });

    // The receipt: what the plan is built from (v1105).
    const receiptBtn = inst.pageWrap.querySelector('#a5Receipt');
    if (receiptBtn) receiptBtn.addEventListener('click', (e) => { e.stopPropagation(); inst.openReceipt(); });

    // Done today: record completion + proof event, credit streak, refresh.
    const creditToday = () => {
      const pa3 = state.action.primaryAction || {};
      // Log the tier the user actually did (selectedTier), matching creditTodayAction in js/08.
      const tier = TIER_KEYS.indexOf(state.action.selectedTier) >= 0
        ? state.action.selectedTier
        : (pa3.recommendedTier || 'moderate');
      const actionText = (pa3.tiers && pa3.tiers[tier]) || pa3.howToStart || pa3.title || '';
      if (!Array.isArray(state.action.completionHistory)) state.action.completionHistory = [];
      const completion = createActionCompletionRecord(pa3, tier, actionText);
      state.action.completionHistory.push(completion);
      // THE MERGE phase 0: shadow-mode referee observation.
      try { if (typeof rewardShadow === 'function') rewardShadow('js02-action-loop'); } catch (_) {}
      try { writeProofEvent('action-complete', { title: actionText || pa3.title || 'Action completed', module: 'action', metadata: { tier, missionId: completion.missionId } }); } catch (_) {}
      if (typeof recalculateStreak === 'function') { try { recalculateStreak(); } catch (_) {} }
      try { persistNow(); } catch (_) {}
      if (typeof refreshActionSurface === 'function') { try { refreshActionSurface(); } catch (_) {} }
      if (typeof TabBar !== 'undefined' && TabBar.updateHomeDot) { try { TabBar.updateHomeDot(); } catch (_) {} }
      try { if (typeof ProofTrail !== 'undefined' && ProofTrail.flash) ProofTrail.flash(); } catch (_) {}
      try { if (typeof promptTomorrowPlan === 'function') promptTomorrowPlan(); } catch (_) {}
    };
    const onMarkDone = (e) => {
      if (e) e.stopPropagation();
      const doneNow = !!actionCompletionForDay(todayStr, state.action.primaryAction);
      if (doneNow) return;
      try { celebrateDone(inst.pageWrap.querySelector('#aplMarkDone')); } catch (_) {}
      creditToday();
      // v886 (ACTION-PHILOSOPHY.md, move shapes): a completed DOOR rolls into
      // the next move THE SAME DAY, never coasting on a checkbox. Levers keep
      // the daily loop untouched. The next-step generation reads completion
      // history and replaces the plan; the A5 done-state shows until it lands.
      try {
        const pa = state.action.primaryAction || {};
        if (pa.shape === 'door' && typeof regenerateActionPlanForNextStep === 'function') {
          setTimeout(() => { try { regenerateActionPlanForNextStep(); } catch (e2) {} }, 2600);
        }
      } catch (eShape) {}
      inst.renderActionPlan();
    };
    const doneBtn = inst.pageWrap.querySelector('#aplMarkDone');
    if (doneBtn) doneBtn.addEventListener('click', onMarkDone);

    // A9 "Close the day": leave the module, land on Reflect.
    const closeDay = inst.pageWrap.querySelector('#a5CloseDay');
    if (closeDay) closeDay.addEventListener('click', (e) => {
      e.stopPropagation();
      try { exitToModules('action'); } catch (_) {}
      setTimeout(() => { try { if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo('reflect'); } catch (_) {} }, 80);
    });

    // Focus (optional, never the centerpiece): the existing Deep Work flow.
    // Prefills the intention with today's move and enters the focus overlay.
    const focusBtn = inst.pageWrap.querySelector('#aplFocus');
    if (focusBtn) focusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        // Skip the one-time module intro flash; the focus session IS the intro.
        if (state.introsSeen && !state.introsSeen.deepwork) { state.introsSeen.deepwork = true; try { persistNow(); } catch (_) {} }
        if (typeof Sheet === 'undefined' || !Sheet.open) return;
        window.__dwFromAction = true; // exit-focus returns to A5, not the sheet
        Sheet.open('deepwork');
        // The sheet is PLUMBING here; a relaunch mid-focus must resume into
        // Action, not the Deep Work sheet (the wrong-spot resume Malik hit).
        try { rememberView('action'); } catch (eRv) {}
        setTimeout(() => {
          try {
            const body = Sheet.body;
            if (!body) return;
            const inp = body.querySelector('#dwIntention');
            if (inp && (moveText || title)) inp.value = moveText || title;
            // "Focus for 25 min" means 25: pick the preset so the overlay
            // counts DOWN with the progress line instead of running open-ended.
            const preset = body.querySelector('.dw-preset[data-min="25"]');
            if (preset) preset.click();
            const fb = body.querySelector('#dwFocus');
            if (fb) fb.click();
          } catch (_) {}
        }, 60);
      } catch (_) {}
    });
  },

  // ══ THE RECEIPT (v1105, Malik's A2 pick from the logic-screen mockups) ══
  // "Here is what I have": the facts the plan is built from, spoken as
  // sentences, each editable fact underlined. A real screen he can reopen any
  // time from the plan view, not a loading state seen once. Editing a fact
  // marks the receipt dirty and offers ONE primary act: rebuild the plan.
  // The star itself is deliberately NOT edited here: refine-wording vs
  // change-my-star are Clarity's two loud doors (his architecture), so the
  // goal span routes there instead of quietly forking a third editor.
  _receiptFacts() {
    const a = (state.clarity && state.clarity.answers) || {};
    const intake = (state.action && state.action.intake && state.action.intake.answers) || {};
    const pa = (state.action && state.action.primaryAction) || {};
    const daily = parseInt(a.dailyTime, 10) || 0;
    const dailyPhrase = !daily ? ''
      : daily >= 105 ? ('about ' + (Math.round(daily / 30) / 2) + ' hours a day')
      : daily >= 75 ? 'about an hour and a half a day'
      : daily >= 45 ? 'about an hour a day'
      : ('about ' + daily + ' minutes a day');
    return {
      star: String(a.neutronStar || '').trim(),
      tf: String(a.timeframe || a.timeHorizon || '').trim(),
      dailyPhrase,
      prog: String(intake.pastProgress || '').replace(/^capacity:[^.]*\.\s*/i, '').trim(),
      move: String(pa.title || '').trim()
    };
  },
  _injectReceiptStyles() {
    if (document.getElementById('acrStyles')) return;
    const s = document.createElement('style');
    s.id = 'acrStyles';
    s.textContent = [
      // Own token set (mirrors the plan screens): ink-based, theme-faithful.
      '.acr{position:fixed;inset:0;z-index:2147483000;display:flex;background:#060608;--a5-hi:rgba(var(--ink),0.96);--a5-mid:rgba(var(--ink),0.72);--a5-lo:rgba(var(--ink),0.5);opacity:0;transition:opacity 0.26s ease;}',
      'html.theme-light .acr{background:#eef0f3;}',
      '.acr--open{opacity:1;}',
      '.acr__inner{position:relative;flex:1;display:flex;flex-direction:column;padding:max(56px,calc(var(--safe-t,0px) + 34px)) 26px calc(22px + var(--safe-b,0px));max-width:560px;margin:0 auto;width:100%;box-sizing:border-box;overflow-y:auto;}',
      '.acr__x{position:absolute;top:max(14px,var(--safe-t,0px));right:16px;width:40px;height:40px;border:none;background:transparent;color:var(--a5-lo);font-size:1.4rem;line-height:1;cursor:pointer;}',
      '.acr__h{font-size:clamp(1.4rem,5.6vw,1.6rem);font-weight:700;letter-spacing:-0.025em;color:var(--a5-hi);margin:0 0 4px;}',
      '.acr__sub{font-size:0.84375rem;color:var(--a5-mid);margin:0 0 8px;}',
      '.acr__body{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:24px;}',
      '.acr__body p{font-size:clamp(1.15rem,4.9vw,1.3rem);line-height:1.5;font-weight:500;letter-spacing:-0.015em;color:var(--a5-hi);margin:0 0 18px;}',
      '.acr-f{font-weight:650;color:var(--a5-hi);cursor:pointer;text-decoration:underline;text-decoration-color:rgba(58,217,245,0.7);text-decoration-thickness:2px;text-underline-offset:5px;}',
      '.acr-f--missing{color:var(--a5-mid);font-weight:550;}',
      '.acr__out{color:var(--a5-mid) !important;font-size:0.95rem !important;margin-top:6px !important;}',
      '.acr__move{font-weight:650;color:var(--a5-hi);}',
      '.acr__ed{margin:-6px 0 20px;}',
      '.acr__note{font-size:0.8125rem;color:var(--a5-mid);margin-bottom:10px;line-height:1.45;}',
      '.acr__chips{display:flex;flex-wrap:wrap;gap:8px;}',
      '.acr__chip{border:none;font-family:inherit;font-size:0.8125rem;font-weight:600;padding:9px 14px;border-radius:calc(9px * var(--rx,1));background:rgba(var(--ink),0.08);color:var(--a5-hi);cursor:pointer;box-shadow:var(--glass-highlight);}',
      '.acr__chip--go{background:var(--solid-bg);color:var(--solid-fg);margin-top:10px;}',
      '.acr__ta{width:100%;box-sizing:border-box;font-family:inherit;font-size:0.9375rem;line-height:1.5;color:var(--a5-hi);background:rgba(var(--ink),0.06);border:none;border-radius:calc(10px * var(--rx,1));padding:12px;resize:vertical;box-shadow:var(--glass-highlight);}',
      '.acr__foot{display:flex;flex-direction:column;gap:8px;}',
      '.acr__cta{width:100%;height:48px;border:none;border-radius:calc(10px * var(--rx,1));background:var(--solid-bg);color:var(--solid-fg);font-family:inherit;font-size:0.90625rem;font-weight:700;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,0.4);}',
      '.acr__done{width:100%;height:44px;border:none;border-radius:calc(10px * var(--rx,1));background:rgba(var(--ink),0.07);color:var(--a5-hi);font-family:inherit;font-size:0.84375rem;font-weight:600;cursor:pointer;box-shadow:var(--glass-highlight);}',
      '@media (prefers-reduced-motion:reduce){.acr{transition-duration:0.01ms;}}',
    ].join('');
    document.head.appendChild(s);
  },
  openReceipt() {
    this._injectReceiptStyles();
    const inst = this;
    document.querySelector('#actionReceiptSheet')?.remove();
    const f = this._receiptFacts();
    // The sentences supply their own punctuation; a fact that arrives with a
    // trailing period would double it ("it exists.." in testing).
    ['star', 'tf', 'prog', 'move'].forEach((k) => { f[k] = String(f[k] || '').replace(/[.\s]+$/, ''); });
    const b = (edit, text, missing) => '<b class="acr-f' + (missing ? ' acr-f--missing' : '') + '" data-edit="' + edit + '" role="button" tabindex="0">' + esc(text) + '</b>';
    const host = document.createElement('div');
    host.id = 'actionReceiptSheet';
    host.className = 'acr';
    host.innerHTML =
      '<div class="acr__inner">' +
        '<button type="button" class="acr__x" id="acrClose" aria-label="Close">&times;</button>' +
        '<h1 class="acr__h">Here is what I have.</h1>' +
        '<p class="acr__sub">Tap anything that is wrong.</p>' +
        '<div class="acr__body">' +
          '<p>You want ' + b('goal', f.star || 'your goal') +
            (f.tf ? ', within ' + b('tf', f.tf) + '.' : '. ' + b('tf', 'You have not picked a timeframe yet.', true)) + '</p>' +
          '<div class="acr__ed" data-for="tf" hidden></div>' +
          '<p>Most days you have ' + (f.dailyPhrase ? b('daily', f.dailyPhrase) : b('daily', 'not told me how much time you have', true)) + '.</p>' +
          '<div class="acr__ed" data-for="daily" hidden></div>' +
          '<p>So far: ' + (f.prog ? b('prog', f.prog) : b('prog', 'you have not told me where you are yet', true)) + '.</p>' +
          '<div class="acr__ed" data-for="prog" hidden></div>' +
          (f.move ? '<p class="acr__out">Out of all that came <span class="acr__move">' + esc(f.move) + '</span>.</p>' : '') +
        '</div>' +
        '<div class="acr__foot">' +
          '<button type="button" class="acr__cta" id="acrRebuild" hidden>Update my plan</button>' +
          '<button type="button" class="acr__done" id="acrDone">This is right</button>' +
        '</div>' +
      '</div>';
    // Fixed to the viewport and appended to body: the module's page wrap is a
    // sliding transform layer, and an absolutely-positioned child of a
    // translated layer lands wherever the slide is, not on the screen.
    (document.body).appendChild(host);
    requestAnimationFrame(() => host.classList.add('acr--open'));

    let dirty = false;
    const markDirty = () => {
      dirty = true;
      const cta = host.querySelector('#acrRebuild'); const done = host.querySelector('#acrDone');
      if (cta) cta.hidden = false;
      if (done) done.textContent = 'Keep the current plan';
    };
    const close = () => { host.classList.remove('acr--open'); setTimeout(() => host.remove(), 260); };
    const reopen = () => { const wasDirty = dirty; this.openReceipt(); if (wasDirty) { try { markAgain(); } catch (_) {} } };
    // Re-marking after a re-render: simplest is to re-render and re-apply.
    const markAgain = () => {
      const h2 = document.querySelector('#actionReceiptSheet');
      if (!h2) return;
      const cta = h2.querySelector('#acrRebuild'); const done = h2.querySelector('#acrDone');
      if (cta) cta.hidden = false;
      if (done) done.textContent = 'Keep the current plan';
    };

    const TIME_CHIPS = [['15 minutes', 15], ['30 minutes', 30], ['An hour', 60], ['A few hours', 180], ['Most of the day', 480]];
    const TF_CHIPS = ['3 months', '6 months', 'A year', 'Ongoing'];
    const chipRow = (items, onPick) => {
      const row = document.createElement('div');
      row.className = 'acr__chips';
      items.forEach((it) => {
        const label = Array.isArray(it) ? it[0] : it;
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'acr__chip'; btn.textContent = label;
        btn.addEventListener('click', () => onPick(it));
        row.appendChild(btn);
      });
      return row;
    };

    const editors = {
      goal() {
        // The star's own doors live in Clarity. Say so, offer the trip.
        const ed = host.querySelector('[data-for="tf"]');
        ed.hidden = false;
        ed.innerHTML = '<div class="acr__note">Your star lives in Clarity, with its two doors: refine the wording, or change it outright.</div>';
        const go = document.createElement('button');
        go.type = 'button'; go.className = 'acr__chip acr__chip--go'; go.textContent = 'Open Clarity';
        go.addEventListener('click', () => {
          close();
          try { inst.close(); } catch (_) {}
          setTimeout(() => { try { if (typeof ClarityExperience !== 'undefined') ClarityExperience.open(); } catch (_) {} }, 320);
        });
        ed.appendChild(go);
      },
      tf() {
        const ed = host.querySelector('[data-for="tf"]');
        ed.hidden = false; ed.innerHTML = '';
        ed.appendChild(chipRow(TF_CHIPS, (pick) => {
          state.clarity.answers.timeframe = pick;
          try { persistNow(); } catch (_) {}
          markDirty(); reopen();
        }));
      },
      daily() {
        const ed = host.querySelector('[data-for="daily"]');
        ed.hidden = false; ed.innerHTML = '';
        ed.appendChild(chipRow(TIME_CHIPS, (pick) => {
          state.clarity.answers.dailyTime = String(pick[1]);
          try { persistNow(); } catch (_) {}
          markDirty(); reopen();
        }));
      },
      prog() {
        const ed = host.querySelector('[data-for="prog"]');
        ed.hidden = false;
        ed.innerHTML = '<textarea class="acr__ta" rows="3" placeholder="Where are you, honestly? Numbers help.">' + esc(inst._receiptFacts().prog) + '</textarea>';
        const save = document.createElement('button');
        save.type = 'button'; save.className = 'acr__chip acr__chip--go'; save.textContent = 'Save';
        save.addEventListener('click', () => {
          const v = String(ed.querySelector('.acr__ta').value || '').trim();
          if (!v) return;
          state.action.intake = state.action.intake || {};
          state.action.intake.answers = state.action.intake.answers || {};
          state.action.intake.answers.pastProgress = v;
          try { persistNow(); } catch (_) {}
          markDirty(); reopen();
        });
        ed.appendChild(save);
      }
    };

    host.querySelectorAll('.acr-f').forEach((el) => {
      const open = () => { try { editors[el.getAttribute('data-edit')](); } catch (_) {} };
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
    host.querySelector('#acrClose').addEventListener('click', close);
    host.querySelector('#acrDone').addEventListener('click', close);
    host.querySelector('#acrRebuild').addEventListener('click', () => {
      close();
      // The real regeneration path: same engine, now with the edited facts.
      try { if (typeof generateActionDraft === 'function') generateActionDraft(); } catch (_) {}
    });
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
      '.vp-stage{position:fixed;inset:0;pointer-events:none;z-index:1;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;background:#04090a;}' +
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
      '.vp-done--done{background:var(--glass-bg);color:rgba(180,220,190,0.95);box-shadow:var(--glass-highlight),inset 0 0 0 1px rgba(140, 220, 147,0.4);}' +
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
    const completedToday = !!actionCompletionForDay(todayStr, pa);

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
      const completion = createActionCompletionRecord(pa, curTier, actionText);
      state.action.completionHistory.push(completion);
      try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier: curTier, missionId: completion.missionId } }); } catch (_) {}
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

    svgEl('rect', { width: W, height: H, fill: '#04090a' }, svg);
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
    if (typeof initStarBlob === 'function') { try { initStarBlob(starCanvas, 240, 'pulsar'); } catch (_) {} }

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
          <div class="js-peak-tooltip__text">${esc(neutronStar) || 'Set your Neutron Star'}</div>
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
          <div class="ambient__rays-beam" style="--a:-160deg; --h:100px; --d:9.4s;  --del:-0.0s; --omin:0.20; --omax:0.85; --smin:0.85; --smax:1.10; --c:100 232 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-147deg; --h:180px; --d:11.6s; --del:-1.8s; --omin:0.28; --omax:0.95; --smin:0.55; --smax:1.40; --c:110 150 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-134deg; --h:80px;  --d:7.1s;  --del:-3.4s; --omin:0.22; --omax:0.85; --smin:0.7;  --smax:1.25; --c:255 95 130;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-121deg; --h:160px; --d:13.2s; --del:-2.1s; --omin:0.30; --omax:0.98; --smin:0.6;  --smax:1.35; --c:120 235 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-108deg; --h:120px; --d:10.5s; --del:-5.6s; --omin:0.25; --omax:0.92; --smin:0.5;  --smax:1.45; --c:255 255 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-95deg;  --h:220px; --d:8.3s;  --del:-0.7s; --omin:0.35; --omax:1.00; --smin:0.65; --smax:1.30; --c:180 244 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-82deg;  --h:90px;  --d:14.8s; --del:-4.2s; --omin:0.20; --omax:0.80; --smin:0.8;  --smax:1.20; --c:120 165 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-69deg;  --h:200px; --d:9.0s;  --del:-3.0s; --omin:0.32; --omax:0.98; --smin:0.55; --smax:1.45; --c:125 235 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-56deg;  --h:75px;  --d:12.3s; --del:-6.5s; --omin:0.20; --omax:0.78; --smin:0.75; --smax:1.25; --c:255 115 145;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-43deg;  --h:150px; --d:10.9s; --del:-1.2s; --omin:0.27; --omax:0.92; --smin:0.6;  --smax:1.35; --c:100 150 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-30deg;  --h:100px; --d:8.6s;  --del:-4.9s; --omin:0.22; --omax:0.85; --smin:0.7;  --smax:1.25; --c:255 255 255;"><div class="ambient__rays-beam-shaft"></div></div>
          <div class="ambient__rays-beam" style="--a:-17deg;  --h:170px; --d:11.4s; --del:-2.6s; --omin:0.28; --omax:0.95; --smin:0.55; --smax:1.40; --c:115 234 255;"><div class="ambient__rays-beam-shaft"></div></div>
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
          <path fill="rgba(4, 12, 14, 0.95)" d="
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
      initStarBlob(peakStar, 320, 'pulsar');
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
      const completion = createActionCompletionRecord(pa, tier, actionText);
      state.action.completionHistory.push(completion);
      try { writeProofEvent('action-complete', { title: actionText || pa.title || 'Action completed', module: 'action', metadata: { tier: tier, missionId: completion.missionId } }); } catch (_) {}
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
      const todayStr = getTodayISO();
      const completedToday = !!actionCompletionForDay(todayStr, state.action.primaryAction);
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
        const raw = await callClaude(apiMessages, AI_ACTION_REFINE_SYSTEM_PROMPT, { maxTokens: 400, paidAction: true });
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
      generateActionDraft();
    });
  },

  // v1111: the tutorial pager (render/next/back/transitionTo/updateProgress/
  // updateNav) is gone with the deck it paged through. render() is called by
  // refreshActionSurface() on every regeneration, so it now goes where every
  // other entry point already goes: the module's real content.
  render() {
    this.renderContent();
  }
};
