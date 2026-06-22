/* Memento module: welcome intro, tab bar, login, export/import, splash, parallax, beams
   Extracted from app.js lines 19702-22930. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   WELCOME INTRO CONTROLLER
   ============================================ */
function threePillarsSystemSVG() {
  return `<svg class="welcome-intro__pillar-system-svg" viewBox="0 0 260 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <filter id="pillarSystemGlow" x="-45%" y="-45%" width="190%" height="190%">
        <feGaussianBlur stdDeviation="4" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <linearGradient id="pillarSystemBase" x1="38" y1="122" x2="222" y2="122" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="rgba(var(--ink),0.18)"/>
        <stop offset="50%" stop-color="rgba(123,97,255,0.52)"/>
        <stop offset="100%" stop-color="rgba(var(--success-rgb),0.34)"/>
      </linearGradient>
    </defs>
    <path class="pillar-system__orbit" d="M45 95C62 39 98 23 130 28C168 33 197 58 214 98" fill="none" stroke="rgba(var(--ink),0.14)" stroke-width="1.2"/>
    <path class="pillar-system__base" d="M43 122H217" stroke="url(#pillarSystemBase)" stroke-width="3" stroke-linecap="round"/>
    <g class="pillar-system__node pillar-system__node--clarity" filter="url(#pillarSystemGlow)">
      <circle cx="76" cy="85" r="18" fill="rgba(123,97,255,0.08)" stroke="#7B61FF" stroke-width="1.2"/>
      <circle cx="76" cy="85" r="8" fill="none" stroke="#7B61FF" stroke-width="1.2" opacity="0.72"/>
      <circle cx="76" cy="85" r="2.8" fill="#7B61FF"/>
      <path d="M76 103V122" stroke="#7B61FF" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g class="pillar-system__node pillar-system__node--action" filter="url(#pillarSystemGlow)">
      <path d="M130 52L151 93H136V122H124V93H109L130 52Z" fill="rgba(var(--ink),0.10)" stroke="rgba(var(--ink),0.94)" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M124 110H136" stroke="rgba(var(--ink),0.7)" stroke-width="1.2" stroke-linecap="round"/>
    </g>
    <g class="pillar-system__node pillar-system__node--consistency" filter="url(#pillarSystemGlow)">
      <rect x="170" y="68" width="36" height="42" rx="6" fill="rgba(var(--success-rgb),0.08)" stroke="var(--success)" stroke-width="1.2"/>
      <path d="M170 80H206" stroke="var(--success)" stroke-width="1" opacity="0.55"/>
      <path d="M180 91L184 95L192 87" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M178 60V72M198 60V72" stroke="var(--success)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M188 110V122" stroke="var(--success)" stroke-width="4" stroke-linecap="round"/>
    </g>
    <circle class="pillar-system__spark pillar-system__spark--one" cx="45" cy="95" r="2" fill="rgba(var(--ink),0.72)"/>
    <circle class="pillar-system__spark pillar-system__spark--two" cx="214" cy="98" r="2" fill="rgba(var(--success-rgb),0.72)"/>
  </svg>`;
}

const WelcomeIntro = {
  el: null, pageWrap: null, navEl: null,
  currentPage: 0,
  totalPages: 6,

  tutorialPages: [
    {
      headline: 'So, what is Memento?',
      tagline: 'The Philosophy behind Memento',
      body: 'Memento is an interactive tool designed to help you get clear on what you actually want, take action toward it, and build the consistency to make it inevitable. Or as people call it "<strong>lock in</strong>"',
      btnLabel: 'Continue'
    },
    {
      headline: 'The Three Pillars',
      body: 'There are three main pillars that are non-negotiables when it comes to achieving anything worthwhile in this life.',
      dotsOnly: true,
      btnLabel: 'Continue'
    }
  ],

  steps: [
    {
      color: 'var(--color-clarity)',
      hex: '#7B61FF',
      label: 'Pillar 1',
      headline: 'Clarity',
      body: 'Know exactly what you want. Why you want it. And how you\u2019re going to get there. Everything starts with knowing the what, why, and how.',
      icon: 'goal'
    },
    {
      color: 'var(--color-action)',
      hex: '#FFFFFF',
      label: 'Pillar 2',
      headline: 'Action',
      body: 'A goal means nothing without execution. If you don\u2019t know what to do or how you\u2019re actually going to get it, you\u2019ll end up nowhere.',
      icon: 'action'
    },
    {
      color: 'var(--color-consistency)',
      hex: 'var(--success)',
      label: 'Pillar 3',
      headline: 'Consistency',
      body: 'Consistency is the glue that holds everything together. This is the hardest but also the most necessary part of the process. If you don\u2019t master consistency you might as well not start.',
      quote: 'Keep going until you remember why you started.',
      icon: 'consistency'
    }
  ],

  init() {
    this.el = document.getElementById('welcomeIntro');
    this.pageWrap = document.getElementById('welcomeIntroPageWrap');
    this.navEl = document.getElementById('welcomeIntroNav');
    // Enter advances onboarding wherever a forward button is showing. Inputs
    // keep their own behavior (name input advances itself; textarea = newline).
    if (!this._enterBound) {
      this._enterBound = true;
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        if (!this.el || !this.el.classList.contains('open')) return;
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const btn = this.navEl && (this.navEl.querySelector('#identityNext') || this.navEl.querySelector('#welcomeNext'));
        if (!btn) return;
        // never let Enter trigger "Skip the rest" (that finishes onboarding). Only advance.
        if (btn.dataset && btn.dataset.skip === '1') return;
        e.preventDefault(); btn.click();
      });
    }
  },

  open() {
    if (state.meta.welcomeSeen) {
      renderAll();
      TabBar.show();
      document.getElementById('ambientBg')?.classList.add('loaded');
      return;
    }
    this.currentPage = 0;
    this.el.classList.add('open');
    this.el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this._ensureProgressBar();
    this._ensureStage(); this._setStage([]);
    this._summaryStarted = false; this._summary = null; this._summaryFailed = false; this._onSummaryReady = null; this._helpStart = null; this._afterPhilosophy = null;
    // Straight into the conversation (name first). The philosophy is now
    // taught personally at the end via the AI summary stepper. v25: the
    // question phase is an Opal-style flowing typewriter conversation.
    this._runConversation();
  },

  // =========================================================================
  // v25 CONVERSATION ENGINE (the question phase, restyled).
  // A single persistent flowing column + bottom dock carries the name,
  // birthday, and the 6 identity questions. Older lines dim and rise; answers
  // appear in violet; chips/composer dock at the bottom. Mechanics + timings
  // ported from proto-clarity-chat-v2.html (Malik-approved). All storage,
  // validation, and the 13+ gate are unchanged; after the last question it
  // hands off to the EXISTING confetti/summary/paywall via _showIdentityStep.
  // =========================================================================
  _wcSkipToken: '__WC_SKIP__',

  _runConversation() {
    this._wcReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this._wcAns = {};
    this._setProgress(0.04);
    // mount the flowing column (page-wrap) + the dock (nav rail)
    this.pageWrap.style.alignItems = ''; this.pageWrap.style.justifyContent = ''; this.pageWrap.style.textAlign = '';
    this.navEl.style.justifyContent = ''; this.navEl.style.gap = '';
    this.pageWrap.innerHTML = '<div class="welcome-convo" id="wcConvo"></div>';
    this.navEl.innerHTML = '<div class="wc-dock" id="wcDock"></div>';
    this._wcConvoEl = document.getElementById('wcConvo');
    this._wcDockEl = document.getElementById('wcDock');
    // Swipe up to read the conversation history: while the user is scrolled away
    // from the newest line, clear the depth fade (.wc-reading) so every older
    // question/answer is fully readable; restore the soft fade when they return
    // to the bottom. Bound once to the page-wrap (the scroll container).
    if (!this._wcScrollBound) {
      this._wcScrollBound = true;
      this.pageWrap.addEventListener('scroll', () => {
        if (this._wcBusy) return; // pinned to bottom while the AI is typing
        const el = this.pageWrap;
        const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 28;
        el.classList.toggle('wc-reading', !atBottom);
      }, { passive: true });
    }
    this.pageWrap.classList.remove('wc-reading');
    this._wcBeatsArr = this._wcBuild();
    this._wcQTotal = this._wcBeatsArr.filter(b => b.input).length;
    this._wcIndex = 0;
    this._wcGen = (this._wcGen || 0) + 1;
    setTimeout(() => this._wcWalk(this._wcGen, false), 220);
  },

  // Build the ordered beats: opening line, name, birthday, then the existing
  // identity QUESTION steps (sourced from this.identitySteps so the questions,
  // options, and storage stay identical), with sparse voiced connective beats.
  _wcBuild() {
    const SEP = ' · ';
    const beats = [];
    beats.push({ lines: () => ['Hello 👋.'], pause: 1100 });
    // Opal-style framing right up front: set the expectation before any question.
    beats.push({ lines: () => ["First, a couple questions, then we'll start to build your Memento."], pause: 900 });
    beats.push({
      key: 'name',
      lines: () => ['What should I call you?'],
      input: { kind: 'text', placeholder: 'Your name', max: 30 },
      commit: (v) => { state.profile.name = String(v).trim(); persistNow(); return true; },
      display: (v) => String(v).trim()
    });
    beats.push({ lines: (n) => ['Welcome to Memento, ' + (n || 'you') + '.'], pause: 700 });
    // The look is chosen at the very END of onboarding (in _finishWithName), right
    // before the blank Memento is revealed, so the first card they ever see already
    // wears their style. (Moved here from a post-welcome beat.)
    // Birthday is the FIRST question (an easy, factual warm-up that also powers
    // Memento Mori), then a transition line escalates into the deeper diagnostic.
    const birthdayBeat = {
      key: 'birthday',
      lines: () => ['When were you born?', '(this is important for building your memento)'],
      input: { kind: 'date' },
      commit: (v) => {
        const age = (typeof ageFromBirthday === 'function') ? ageFromBirthday(v) : null;
        if (age == null) { this._wcSetErr('That date does not look right. Mind checking it?'); return false; }
        if (age < 13) { this._wcSetErr('Memento is for ages 13 and up. Come back when you are a bit older.'); return false; }
        state.profile.birthday = v;
        try { if (state.mori && !state.mori.birthYear) state.mori.birthYear = parseInt(String(v).slice(0, 4), 10); } catch (e) {}
        persistNow(); return true;
      },
      display: (v) => this._wcBdayDisplay(v)
    };
    beats.push(birthdayBeat);
    beats.push({ lines: () => ['Alright, now for more serious questions.'], pause: 900 });
    this.identitySteps.forEach((step) => {
      if (step.type !== 'choices' && step.type !== 'text') return; // stop before summaryStepper/paywall
      beats.push({
        key: step.key,
        skipIf: step.skipIf,   // conditional steps (e.g. distraction) check live answers at walk time
        lines: (n) => {
          let h = step.headline || '';
          if (h.indexOf('{name}') !== -1) h = n ? h.replace('{name}', n) : h.replace('Okay, {name}. ', '');
          return step.sub ? [h, step.sub] : [h];
        },
        input: step.type === 'choices'
          ? { kind: 'chips', options: step.options, multi: !!step.multi, exclusive: step.exclusive || [] }
          : { kind: 'text', placeholder: step.placeholder || '', optional: true },
        commit: (v) => {
          if (step.type === 'choices') state.profile[step.key] = Array.isArray(v) ? v.join(SEP) : String(v);
          else state.profile[step.key] = String(v || '').trim();
          persistNow(); return true;
        },
        display: (v) => step.type === 'choices'
          ? (Array.isArray(v) ? v.join(', ') : String(v))
          : String(v || '').trim()
      });
      // Reflections branch on what was just picked (in Malik's voice) so the
      // conversation feels custom, not one canned line everyone gets.
      if (step.key === 'runningToward') beats.push({ lines: () => { const t = this._wcReflect('runningToward'); return t ? [t] : []; } });
      if (step.key === 'clarityLevel') beats.push({ lines: () => { const t = this._wcReflect('clarityLevel'); return t ? [t] : []; } });
      if (step.key === 'actionKnow') beats.push({ lines: () => { const t = this._wcReflect('actionKnow'); return t ? [t] : []; } });
      if (step.key === 'actionProgress') beats.push({ lines: () => { const t = this._wcReflect('actionProgress'); return t ? [t] : []; } });
      if (step.key === 'clarityBlock') beats.push({ lines: () => { const t = this._wcReflect('clarityBlock'); return t ? [t] : []; } });
      if (step.key === 'clarityHistory') beats.push({ lines: () => { const t = this._wcReflect('clarityHistory'); return t ? [t] : []; } });
      if (step.key === 'runningFrom') beats.push({ lines: () => { const t = this._wcReflect('runningFrom'); return t ? [t] : []; } });
      if (step.key === 'distraction') beats.push({ lines: () => { const t = this._wcReflect('distraction'); return t ? [t] : []; } });
      if (step.key === 'letterToFutureSelf') beats.push({ lines: () => { const t = this._wcReflect('letterToFutureSelf'); return t ? [t] : []; } });
      if (step.key === 'costOfInaction') beats.push({ lines: () => { const t = this._wcReflect('costOfInaction'); return t ? [t] : []; } });
      if (step.key === 'momentumWin') beats.push({ lines: () => { const t = this._wcReflect('momentumWin'); return t ? [t] : []; } });
    });
    return beats;
  },

  // Branching reflections, written in Malik's voice (see MALIK_VOICE.md): warm,
  // plain, validate-then-redirect, no AI cadence, no em dashes. Keyed to the
  // chosen option so the line fits what they actually picked. `_multi` is used
  // when more than one option is selected; `_fallback` covers anything custom.
  _wcReflections: {
    runningToward: {
      'Work & money': "Money. Makes sense, it's the thing everyone chases.",
      'Health & fitness': "Health is the foundation of everything, without health nothing matters.",
      'Discipline & focus': "Discipline and focus are always good skills to learn.",
      'A skill or craft': "Building a real skill unlocks parts of your brain you didn't know were there.",
      'Creative work': "Creative work is one of the most fulfilling things to actually go after.",
      'Relationships': "If we're being honest, that's what most of this is for anyway.",
      'Mindset & Mental': "Mindset and the mental side. Get that right and a lot of the rest follows.",
      "I'm honestly not sure yet": "No worries! That's what we're here for.",
      // Count-tiered multi replies: 2 picks reads as focused, 3+ as ambitious.
      // _multi is the fallback if neither tier is defined.
      _multi2: "Nice! Let's help you narrow it down to the one that matters most.",
      _multi3: "Ambitious! We'll help you get to them all, one at a time.",
      _multi: "Good picks. We'll find the one that matters most as we go.",
      _fallback: "Good one. We'll build everything around that."
    },
    runningFrom: {
      'Procrastination': "Procrastination's beatable. Usually it's the task being unclear, not you being lazy.",
      'Phone & social media': "The phone thing is real for almost everyone right now. You're not weird for it.",
      "I don't know what to do": "Not knowing what to do is normal. That's kind of the whole point of this.",
      "Can't stay consistent": "Consistency is hard for everyone, even the greats. Usually it's just not long enough yet.",
      'Fear of failing': "Fear of failing is fair. But what does life look like if you do nothing instead?",
      'Not enough time': "Time is tight for everyone. We'll keep it to one small thing a day.",
      'Low motivation': "Motivation comes and goes. We build it so you don't have to rely on it.",
      'Self-doubt': "Self-doubt hits everyone. It gets quieter once you start stacking small wins.",
      _multi: "That's a lot to carry. None of those are permanent though.",
      _fallback: "Whatever it is, it's not permanent."
    },
    clarityLevel: {
      'Yes, I do and know exactly what it is': "Good! Knowing exactly what you want is the part most people never even reach.",
      'I have a rough idea': "A rough idea is a real start. Memento's whole first job is making it sharp.",
      "Not really... but I'm trying to figure it out": "That's honest, and normal. Finding the answer is literally step one here.",
      'No, I feel completely lost': "No worries, this is where everyone has to start. We'll help you find your one thing.",
      _fallback: "We'll get this clear. That's the first thing Memento does."
    },
    actionKnow: {
      "Yes, I know the actions to get there": "Knowing the actions is half of it. Doing them day after day is what we build here.",
      "Sort of, not sure it's right": "Not being sure is fine. We'll sharpen the steps so they actually feel right.",
      "No, I don't know the steps": "Not knowing the steps is normal. Finding them is exactly what we're here to do.",
      _fallback: "Either way, we'll get the steps clear so doing becomes the easy part."
    },
    actionProgress: {
      "Haven't really started": "Not starting yet is okay. The first small move is the hardest, and we make it tiny.",
      'Started, then stalled': "Stalling happens to everyone. It usually means the next step got too big, not that you failed.",
      'Slow but moving': "Slow but moving still counts. Slow and consistent beats fast and gone every time.",
      'Actually on a roll': "On a roll, love that. Now we just protect that momentum so it doesn't slip.",
      _fallback: "Wherever you're at is fine. We build from here, one small step at a time."
    },
    clarityBlock: {
      "Too many directions, I can't pick one": "Too many paths is its own kind of stuck. We narrow it to the one that matters most.",
      "Scared I'll pick the wrong thing": "There is no permanent wrong pick. You can always adjust, but you cannot steer a parked car.",
      "I've lost touch with what I care about": "That happens to a lot of people. We find the thread again, gently.",
      "I've never really stopped to figure it out": "Most people never do. Stopping to ask is already the first real step.",
      _fallback: "Whatever is blurring it, naming it is how we start to clear it."
    },
    clarityHistory: {
      'No, this is the first time': "Then you are in the right place to start. One honest step at a time.",
      'Tried, but it faded': "It faded because nothing held it in place. That is exactly what Memento is for.",
      'I keep starting over': "Starting over is not failing, it is missing the system that makes it stick. We build that.",
      "I think I'm close, just not there": "Close is good. We close the last gap so it finally lands.",
      _fallback: "Wherever you have gotten before, we build from here."
    },
    distraction: {
      'TikTok': "TikTok is built to keep you there. It's not weak of you, it's just very good at its job.",
      'Instagram / Reels': "Instagram and Reels are engineered to be endless. Almost everyone loses time to it.",
      'YouTube': "YouTube can eat a whole evening. The trick is using it on purpose, not by default.",
      'Porn': "That's a common one, no shame here. It's a habit like any other, and habits can shift.",
      'Gaming': "Gaming's fun, nothing wrong with it. We just want it to be your choice, not your autopilot.",
      'Friends / going out': "Friends matter, that's real. We just make sure they add to the life you want, not replace it.",
      'Something else': "Whatever it is, naming it is the win. You can't change a habit you won't look at.",
      _fallback: "Whatever's got a hold on you, it's beatable. We just have to see it clearly first."
    },
    letterToFutureSelf: {
      _fallback: "Thanks for sharing that. It helps Memento actually understand where you're coming from."
    },
    costOfInaction: {
      'Regret': "Regret is heavy, and it's the one thing you can still avoid from right here.",
      'Wasted potential': "Wasted potential stings the most because you know it was there. That's worth moving on.",
      'Watching everyone pass me': "Watching everyone pass you is rough. But you're not running their race, you're running yours.",
      'Letting people down': "Not wanting to let people down says a lot about you. That's a good reason to start now.",
      'Running out of time': "The time thing is real, and feeling it now is exactly why you start now.",
      "Becoming someone I don't want to be": "That's a real fear, and a good one. It means you still know who you'd rather be.",
      _multi: "That's the weight worth using. Not to scare you, to move you.",
      _fallback: "Hold onto that feeling. That's the fuel when motivation runs out."
    },
    momentumWin: {
      'The goal, actually reached': "That's the whole game. Memento keeps the goal in front of you so a year of small days adds up to it.",
      'Proof I can count on myself': "That proof is worth more than the goal itself. Every day you show up builds it.",
      "A life I'm proud of": "A life you're proud of gets built one ordinary day at a time. This is how you stack them.",
      'Becoming who I want to be': "You already know who that is. Memento just keeps you pointed at them, every day.",
      'Momentum that compounds': "Compounding is the cheat code. Stay consistent and a year from now it's barely recognizable.",
      'Real freedom and options': "Freedom is earned in reps. Keep stacking them and the options open up.",
      _multi3: "That's a lot to build toward. Keep showing up and a year from now it's not a wish, it's your life.",
      _multi2: "Both of those are on the table. Keep the momentum and a year from now they're just real.",
      _multi: "All of that is within reach. Momentum is how you get there.",
      _fallback: "Hold onto that. That's the pull that keeps you going when motivation dips."
    }
  },

  _wcReflect(key) {
    try {
      const SEP = ' · ';
      const raw = (state.profile && state.profile[key]) || '';
      // Skipped/blank answers (e.g. the conditional distraction step, or an
      // empty letter) get no reflection, never a fabricated "thanks for sharing".
      if (!String(raw).trim()) return '';
      const picks = String(raw).split(SEP).map(s => s.trim()).filter(Boolean);
      const m = (this._wcReflections && this._wcReflections[key]) || {};
      if (picks.length > 1) {
        // Count tiers: 3+ picks -> _multi3, exactly 2 -> _multi2, else _multi.
        if (picks.length >= 3 && m._multi3) return m._multi3;
        if (picks.length === 2 && m._multi2) return m._multi2;
        if (m._multi) return m._multi;
      }
      const first = picks[0] || '';
      return m[first] || m._fallback || '';
    } catch (e) { return ''; }
  },

  _wcBdayDisplay(v) {
    try { const d = new Date(v + 'T00:00:00'); if (isNaN(d)) return String(v); return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return String(v); }
  },

  // Walk beats from this._wcIndex. gen guards against a back/rewind starting a
  // fresh walk: any stale walk bails the moment this._wcGen changes.
  async _wcWalk(gen, instant) {
    const beats = this._wcBeatsArr;
    while (this._wcIndex < beats.length) {
      if (gen !== this._wcGen) return;
      const beat = beats[this._wcIndex];
      // Conditional beats (e.g. the holding-you-back / distraction follow-ups)
      // check the live answers at walk time; skip silently, marking the slot
      // handled so progress is right. CLEAR the skipped question's stored answer
      // too, so a stale value from an earlier path can't leak into its reflection
      // beat (the "on a roll" user was seeing the old runningFrom reflection).
      if (beat.skipIf && beat.skipIf(state.profile)) {
        if (beat.key && state.profile && state.profile[beat.key]) { state.profile[beat.key] = ''; try { persistNow(); } catch (e) {} }
        this._wcAns[this._wcIndex] = null; this._wcIndex++; continue;
      }
      const n = (state.profile && state.profile.name) ? state.profile.name : 'you';
      const lines = beat.lines ? beat.lines(n) : [];
      // Focused (Opal-style): when a new question begins, fade everything before
      // it into faint history, so the screen is dominated by the CURRENT question
      // + input rather than a tall stack. Swipe up brings the history back.
      if (lines.length) this._wcMarkHistory();
      for (const t of lines) { if (gen !== this._wcGen) return; await this._wcTypeLine(t, instant, gen); }
      if (gen !== this._wcGen) return;
      // Optional extra hold after a beat's lines (e.g. let "Welcome to Memento"
      // sit before the conversation begins). Skipped on instant rebuild / reduced motion.
      if (beat.pause && !instant && !this._wcReduced) { await new Promise(r => setTimeout(r, beat.pause)); if (gen !== this._wcGen) return; }
      // An action beat pauses the walk for an async side-flow (e.g. the appearance
      // picker after the welcome) and resumes when it resolves. Skipped on instant
      // rebuild (back/rewind) so it never re-fires.
      if (beat.action && !instant) { try { await beat.action(); } catch (e) {} if (gen !== this._wcGen) return; }
      if (beat.input) {
        instant = false;
        const ans = await this._wcAsk(beat);
        if (gen !== this._wcGen) return;
        if (ans !== this._wcSkipToken) { const disp = beat.display(ans); this._wcAns[this._wcIndex] = disp; this._wcAddUser(disp); }
        else { this._wcAns[this._wcIndex] = null; }
        const answered = Object.keys(this._wcAns).length;
        this._setProgress(0.04 + 0.9 * (answered / Math.max(1, this._wcQTotal)));
      }
      this._wcIndex++;
    }
    if (gen !== this._wcGen) return;
    this._wcHandoff();
  },

  _wcAsk(beat) {
    return new Promise((resolve) => { this._wcResolve = resolve; this._wcRenderInput(beat, resolve); });
  },

  _wcActiveInput(beat) { return beat && beat.input && !(beat.skipIf && beat.skipIf(state.profile)); },

  _wcCanBack() {
    const beats = this._wcBeatsArr || [];
    for (let i = 0; i < this._wcIndex; i++) { if (this._wcActiveInput(beats[i])) return true; }
    return false;
  },

  // Rewind to the previous QUESTION: cancel the current ask, clear its answer
  // and everything after it, instantly replay the earlier lines, resume live.
  _wcBack() {
    const beats = this._wcBeatsArr;
    let p = this._wcIndex - 1;
    while (p >= 0 && !this._wcActiveInput(beats[p])) p--;
    if (p < 0) return;
    for (let i = p; i < beats.length; i++) { delete this._wcAns[i]; }
    this._wcRebuild(p);
  },

  _wcRebuild(target) {
    this._wcGen = (this._wcGen || 0) + 1;
    this._wcResolve = null;
    const gen = this._wcGen;
    const beats = this._wcBeatsArr;
    const convo = this._wcConvoEl;
    // Smooth "back": the old path blanked the whole conversation and re-typed
    // every prior line one-by-one (FLIP + enter animation each), which read as a
    // choppy flash-rebuild. Instead, rebuild the prior history in ONE synchronous,
    // settled pass into a fragment and swap it in atomically (the browser never
    // paints a blank frame), fade it in gently, then walk the target question live.
    const n = (state.profile && state.profile.name) ? state.profile.name : 'you';
    const frag = document.createDocumentFragment();
    const addLine = (text, cls) => {
      const el = document.createElement('div');
      el.className = 'wc-line' + (cls ? ' ' + cls : '');
      el.textContent = text;
      frag.appendChild(el);
    };
    for (let i = 0; i < target; i++) {
      const beat = beats[i];
      const lines = beat.lines ? beat.lines(n) : [];
      lines.forEach((t) => addLine(t));
      if (beat.input && this._wcAns[i] != null) addLine(this._wcAns[i], 'user');
    }
    convo.style.transition = 'none';
    convo.style.opacity = '0';
    convo.innerHTML = '';
    convo.appendChild(frag);
    this._wcDockEl.innerHTML = '';
    this._wcMarkHistory();      // fade the restored history so the target owns the screen
    this._wcScrollBottom();
    requestAnimationFrame(() => {
      convo.style.transition = 'opacity 0.28s ease';
      convo.style.opacity = '1';
    });
    const answered = Object.keys(this._wcAns).length;
    this._setProgress(0.04 + 0.9 * (answered / Math.max(1, this._wcQTotal)));
    this._wcIndex = target;
    this._wcWalk(gen, false);
  },

  // Focused mode: fade every existing line into faint "history" (one soft level,
  // no blur) so a new question takes the screen. The current beat's lines are
  // added AFTER this and stay bright. Swipe up (.wc-reading) brings it all back.
  _wcMarkHistory() {
    if (!this._wcConvoEl) return;
    const lines = [...this._wcConvoEl.querySelectorAll('.wc-line')];
    const n = lines.length;
    lines.forEach((l, i) => {
      l.classList.add('wc-hist');
      l.style.filter = '';
      // The most recent history line is a faint hint; older lines fade out fully
      // so the stack never grows, however long the conversation gets.
      const fromNewest = (n - 1) - i;
      l.style.opacity = Math.max(0, 0.18 - fromNewest * 0.06).toFixed(3);
    });
  },

  _wcScrollBottom() {
    const pw = this.pageWrap;
    if (pw) pw.scrollTop = pw.scrollHeight;
  },

  // After the input dock mounts (chips / date / composer) it grows, which shrinks
  // the conversation scroller above it and would clip the newest question line.
  // Pin the convo to the bottom SYNCHRONOUSLY (same frame the dock mounted) so the
  // history settles in one motion. The old version deferred this to two rAFs,
  // which let the content shift up first and then visibly scroll back down (the
  // "moves up then comes back down" bounce). One late rAF stays as a safety net.
  _wcReseat() {
    this._wcScrollBottom();
    requestAnimationFrame(() => this._wcScrollBottom());
  },

  // While the AI is typing, the conversation is "busy": pin it to the newest
  // line and block the user from scrolling up (touch-action:none), so they can
  // never scroll off the text being typed and watch it freeze off-screen. When
  // it is the user's turn (input shown), busy clears and they can swipe up to
  // read history freely.
  _wcSetBusy(busy) {
    this._wcBusy = !!busy;
    const pw = this.pageWrap;
    if (!pw) return;
    pw.classList.toggle('wc-busy', !!busy);
    if (busy) { pw.classList.remove('wc-reading'); this._wcScrollBottom(); }
  },

  // FLIP: glide existing lines from their old positions to their new ones
  // instead of snapping when a fresh line (or the growing dock) shifts the stack.
  _wcFlipKids(kids, before) {
    const after = kids.map(k => k.getBoundingClientRect().top);
    kids.forEach((k, i) => {
      const dy = before[i] - after[i];
      if (Math.abs(dy) > 0.5) {
        k.style.transition = 'none';
        k.style.transform = 'translateY(' + dy + 'px)';
        requestAnimationFrame(() => { k.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s ease, opacity 0.55s ease, color 0.7s ease'; k.style.transform = ''; });
      }
    });
  },

  _wcWithFlip(mutate) {
    const kids = [...this._wcConvoEl.children];
    const before = kids.map(k => k.getBoundingClientRect().top);
    mutate();
    this._wcFlipKids(kids, before);
  },

  _wcTypeLine(text, instant, gen) {
    return new Promise(res => {
      this._wcSetBusy(true);
      const kids = [...this._wcConvoEl.children];
      const before = kids.map(k => k.getBoundingClientRect().top);
      const el = document.createElement('div');
      el.className = 'wc-line wc-line--enter';
      // Reserve the line's FINAL height up front so the stack shifts ONCE
      // (smoothly, via FLIP) instead of nudging on every typed character.
      el.textContent = text;
      this._wcConvoEl.appendChild(el);
      el.style.minHeight = el.offsetHeight + 'px';
      el.textContent = '';
      this._wcFlipKids(kids, before);
      this._wcScrollBottom();
      requestAnimationFrame(() => { this._wcScrollBottom(); el.classList.remove('wc-line--enter'); });
      if (instant || this._wcReduced) { el.textContent = text; setTimeout(res, instant ? 0 : 90); return; }
      let i = 0;
      const tick = () => {
        if (gen !== this._wcGen) { el.textContent = text; res(); return; }
        el.textContent = text.slice(0, i); i++;
        if (i <= text.length) setTimeout(tick, 20 + Math.random() * 16);
        else setTimeout(res, 680);
      };
      tick();
    });
  },

  _wcAddUser(text) {
    const kids = [...this._wcConvoEl.children];
    const before = kids.map(k => k.getBoundingClientRect().top);
    const el = document.createElement('div');
    el.className = 'wc-line user wc-line--enter';
    el.textContent = text;
    this._wcConvoEl.appendChild(el);
    this._wcFlipKids(kids, before);
    this._wcScrollBottom();
    requestAnimationFrame(() => { this._wcScrollBottom(); el.classList.remove('wc-line--enter'); });
  },

  _wcSetErr(msg) { const e = this._wcDockEl && this._wcDockEl.querySelector('.wc-err'); if (e) e.textContent = msg || ''; },

  _wcCommitAnswer(beat, val, isSkip) {
    const ok = beat.commit ? beat.commit(val) : true;
    if (ok === false) return; // validation failed; error already shown, stay put
    // The user just answered; the AI is about to type again, so pin to bottom.
    this._wcSetBusy(true);
    const resolve = this._wcResolve; this._wcResolve = null;
    // Clear the dock inside a FLIP so the conversation glides when the layout
    // shifts (e.g. a tall chip dock collapsing and the column re-centering on
    // mobile) instead of snapping.
    if (this._wcDockEl) { this._wcWithFlip(() => { this._wcDockEl.innerHTML = ''; }); }
    if (resolve) resolve(isSkip ? this._wcSkipToken : val);
  },

  _wcRenderInput(beat) {
    // The AI is done talking; it is the user's turn. Unlock scrolling so they
    // can swipe up to read history while they think about their answer.
    this._wcSetBusy(false);
    const spec = beat.input;
    const dock = this._wcDockEl;
    dock.innerHTML = '';
    const canBack = this._wcCanBack();
    const mkBack = () => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'wc-back'; b.innerHTML = '&larr;'; b.setAttribute('aria-label', 'Back to the previous question');
      b.addEventListener('click', () => this._wcBack());
      return b;
    };

    if (spec.kind === 'chips') {
      const selected = new Set();
      const wrap = document.createElement('div'); wrap.className = 'wc-chips'; wrap.setAttribute('role', 'group');
      spec.options.forEach(opt => {
        const c = document.createElement('button'); c.type = 'button'; c.className = 'wc-chip'; c.textContent = opt;
        c.addEventListener('click', () => {
          if (spec.multi) {
            const excl = spec.exclusive || [];
            const deselect = (val) => { selected.delete(val); wrap.querySelectorAll('.wc-chip').forEach(b => { if (b.textContent === val) b.classList.remove('is-selected'); }); };
            if (selected.has(opt)) { selected.delete(opt); c.classList.remove('is-selected'); }
            else {
              // Exclusive options stand alone: selecting one clears all others;
              // selecting a normal option clears any exclusive one.
              if (excl.indexOf(opt) !== -1) { [...selected].forEach(deselect); }
              else { excl.forEach(ex => { if (selected.has(ex)) deselect(ex); }); }
              selected.add(opt); c.classList.add('is-selected');
            }
          } else {
            selected.clear();
            wrap.querySelectorAll('.wc-chip').forEach(b => b.classList.remove('is-selected'));
            selected.add(opt); c.classList.add('is-selected');
          }
          cont.disabled = selected.size === 0;
        });
        wrap.appendChild(c);
      });
      const actions = document.createElement('div'); actions.className = 'wc-actions';
      if (canBack) actions.appendChild(mkBack());
      const cont = document.createElement('button'); cont.type = 'button'; cont.className = 'wc-continue'; cont.textContent = 'Continue'; cont.disabled = true;
      cont.addEventListener('click', () => {
        if (selected.size === 0) return;
        const val = spec.multi ? [...selected] : [...selected][0];
        this._wcCommitAnswer(beat, val, false);
      });
      actions.appendChild(cont);
      // Append directly (no convo FLIP): the dock growing only needs the history
      // to settle to the bottom, not glide. The FLIP fought the re-seat scroll and
      // produced the up-then-down bounce.
      dock.appendChild(wrap); dock.appendChild(actions);
      this._wcReseat();
      return;
    }

    if (spec.kind === 'date') {
      // Three glass Month / Day / Year pickers, not the generic native date box.
      const host = document.createElement('div'); host.className = 'wc-bday-host';
      const selWrap = document.createElement('div'); selWrap.className = 'wc-bday';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mkSel = (cls, ph, label) => {
        const s = document.createElement('select'); s.className = 'wc-sel ' + cls; s.required = true; s.setAttribute('aria-label', label);
        const o0 = document.createElement('option'); o0.value = ''; o0.textContent = ph; o0.disabled = true; o0.selected = true; s.appendChild(o0);
        return s;
      };
      const mSel = mkSel('wc-sel--m', 'Month', 'Birth month');
      months.forEach((m, idx) => { const o = document.createElement('option'); o.value = String(idx + 1).padStart(2, '0'); o.textContent = m; mSel.appendChild(o); });
      const dSel = mkSel('wc-sel--d', 'Day', 'Birth day');
      for (let d = 1; d <= 31; d++) { const o = document.createElement('option'); o.value = String(d).padStart(2, '0'); o.textContent = String(d); dSel.appendChild(o); }
      const ySel = mkSel('wc-sel--y', 'Year', 'Birth year');
      let nowY = 2026; try { nowY = new Date().getFullYear(); } catch (e) {}
      for (let y = nowY - 13; y >= nowY - 100; y--) { const o = document.createElement('option'); o.value = String(y); o.textContent = String(y); ySel.appendChild(o); }
      const ex = (state.profile && state.profile.birthday) || '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(ex)) { ySel.value = ex.slice(0, 4); mSel.value = ex.slice(5, 7); dSel.value = ex.slice(8, 10); }
      selWrap.appendChild(mSel); selWrap.appendChild(dSel); selWrap.appendChild(ySel);

      const err = document.createElement('div'); err.className = 'wc-err';
      const actions = document.createElement('div'); actions.className = 'wc-actions';
      if (canBack) actions.appendChild(mkBack());
      const cont = document.createElement('button'); cont.type = 'button'; cont.className = 'wc-continue'; cont.textContent = 'Continue';
      const ready = () => !!(mSel.value && dSel.value && ySel.value);
      cont.disabled = !ready();
      const refresh = () => { cont.disabled = !ready(); this._wcSetErr(''); };
      [mSel, dSel, ySel].forEach(s => s.addEventListener('change', refresh));
      cont.addEventListener('click', () => {
        if (!ready()) return;
        this._wcCommitAnswer(beat, ySel.value + '-' + mSel.value + '-' + dSel.value, false);
      });
      actions.appendChild(cont);
      host.appendChild(selWrap); host.appendChild(err); host.appendChild(actions);
      dock.appendChild(host);
      this._wcReseat();
      return;
    }

    // text composer (optional = skippable: send always enabled, empty just advances)
    const wrap = document.createElement('div'); wrap.className = 'wc-composer';
    if (canBack) wrap.appendChild(mkBack());
    const ta = document.createElement('textarea'); ta.rows = 1; ta.placeholder = spec.placeholder || 'Type...'; if (spec.max) ta.maxLength = spec.max;
    const send = document.createElement('button'); send.type = 'button'; send.className = 'wc-send'; send.innerHTML = '&uarr;';
    send.disabled = spec.optional ? false : true;
    const sync = () => { const has = ta.value.trim().length > 0; if (!spec.optional) send.disabled = !has; ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; };
    ta.addEventListener('input', sync);
    const submit = () => { const v = ta.value.trim(); if (!spec.optional && !v) return; this._wcCommitAnswer(beat, v, spec.optional && !v); };
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
    send.addEventListener('click', submit);
    wrap.appendChild(ta); wrap.appendChild(send);
    dock.appendChild(wrap);
    this._wcReseat();
    // preventScroll stops iOS's scroll-into-view jank (the screen briefly scrolling
    // down to a black top strip then snapping back) when the field auto-focuses.
    setTimeout(() => { try { ta.focus({ preventScroll: true }); } catch (e) { try { ta.focus(); } catch (e2) {} } }, 250);
  },

  // End of the conversation: fade the column out, then hand to the EXISTING
  // flow at the summary stepper (confetti -> AI summary -> paywall), unchanged.
  // The diagnostic result: which pillar is this person weakest in. Drives the
  // "Solution" page copy now, and seeds Clarity in Build 2.
  _computeWeakestPillar(p) {
    p = p || {};
    const lc = (k) => String(p[k] || '').toLowerCase();
    const toward = lc('runningToward'), clarity = lc('clarityLevel'), know = lc('actionKnow');
    // Clarity gap: they don't actually know what they want.
    if (clarity.indexOf('lost') !== -1 || clarity.indexOf('not really') !== -1 || toward.indexOf('not sure') !== -1) return 'clarity';
    // Action gap: they have a rough idea but don't know the steps.
    if (know.indexOf("don't know the steps") !== -1 || know.indexOf('sort of') !== -1 || clarity.indexOf('rough') !== -1) return 'action';
    // Otherwise it's follow-through.
    return 'consistency';
  },

  _wcHandoff() {
    try { state.profile.weakestPillar = this._computeWeakestPillar(state.profile); persistNow(); } catch (e) {}
    this._wcGen = (this._wcGen || 0) + 1; // freeze the engine
    if (this._wcDockEl) this._wcDockEl.innerHTML = '';
    const col = this.pageWrap.querySelector('.welcome-convo');
    if (col) { col.style.transition = 'opacity 0.4s ease, transform 0.4s ease'; requestAnimationFrame(() => { col.style.opacity = '0'; col.style.transform = 'translateY(-12px)'; }); }
    let sumIdx = this.identitySteps.findIndex(s => s.type === 'summaryStepper');
    if (sumIdx < 0) sumIdx = this.identitySteps.findIndex(s => s.type !== 'choices' && s.type !== 'text');
    setTimeout(() => this._showIdentityStep(sumIdx), 320);
  },

  // Onboarding progress bar removed (Malik): no thin bar at the very top.
  // Kept as a no-op so _setProgress / _hideProgressBar callers stay safe.
  _ensureProgressBar() { return; },
  _setProgress(frac) {
    this._ensureProgressBar();
    const bar = this.el && this.el.querySelector('.welcome-intro__progress');
    const fill = this.el && this.el.querySelector('.welcome-intro__progress-fill');
    if (bar) bar.classList.remove('is-hidden');
    if (fill) fill.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%';
  },
  _hideProgressBar() {
    const bar = this.el && this.el.querySelector('.welcome-intro__progress');
    if (bar) bar.classList.add('is-hidden');
  },
  // crossfading stage-light layers (purple/white/green/rainbow) behind content
  _ensureStage() {
    if (!this.el || this.el.querySelector('.welcome-intro__stage')) return;
    const stage = document.createElement('div');
    stage.className = 'welcome-intro__stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML =
      '<div class="welcome-intro__glow welcome-intro__glow--purple"></div>' +
      '<div class="welcome-intro__glow welcome-intro__glow--cyan"></div>' +
      '<div class="welcome-intro__glow welcome-intro__glow--green"></div>' +
      '<div class="welcome-intro__glow welcome-intro__glow--white"></div>' +
      '<div class="welcome-intro__glow welcome-intro__glow--rainbow"></div>' +
      '<div class="welcome-intro__scrim"></div>';
    this.el.insertBefore(stage, this.el.firstChild);
  },
  _setStage(set, scene) {
    this._ensureStage();
    const stage = this.el && this.el.querySelector('.welcome-intro__stage');
    if (!stage) return;
    stage.dataset.scene = scene || '';
    const activeSet = Array.isArray(set) ? set : [];
    ['purple', 'cyan', 'green', 'white', 'rainbow'].forEach(c => {
      const g = stage.querySelector('.welcome-intro__glow--' + c);
      if (g) g.classList.remove('is-active');
    });
    this._stageFadeId = (this._stageFadeId || 0) + 1;
    const fadeId = this._stageFadeId;
    requestAnimationFrame(() => {
      if (fadeId !== this._stageFadeId) return;
      activeSet.forEach(c => {
        const g = stage.querySelector('.welcome-intro__glow--' + c);
        if (g) g.classList.add('is-active');
      });
    });
  },

  getStepIcon(key, hexColor) {
    const icons = {
      goal: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="32" stroke="${hexColor}" stroke-width="1.2" opacity="0.2"/>
        <circle cx="40" cy="40" r="22" stroke="${hexColor}" stroke-width="1.2" opacity="0.4"/>
        <circle cx="40" cy="40" r="12" stroke="${hexColor}" stroke-width="1.5" opacity="0.7"/>
        <circle cx="40" cy="40" r="3.5" fill="${hexColor}"/>
      </svg>`,
      action: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="footGrad" x1="14" y1="72" x2="68" y2="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="${hexColor}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${hexColor}" stop-opacity="1"/>
          </linearGradient>
        </defs>
        <g transform="translate(18 70) rotate(40)">
          <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#footGrad)"/>
          <ellipse cx="-1" cy="5.5" rx="2.2" ry="2.6" fill="url(#footGrad)"/>
        </g>
        <g transform="translate(24 54) rotate(40)">
          <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#footGrad)"/>
          <ellipse cx="1" cy="5.5" rx="2.2" ry="2.6" fill="url(#footGrad)"/>
        </g>
        <g transform="translate(42 48) rotate(40)">
          <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#footGrad)"/>
          <ellipse cx="-1" cy="5.5" rx="2.2" ry="2.6" fill="url(#footGrad)"/>
        </g>
        <g transform="translate(48 32) rotate(40)">
          <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#footGrad)"/>
          <ellipse cx="1" cy="5.5" rx="2.2" ry="2.6" fill="url(#footGrad)"/>
        </g>
        <g transform="translate(66 26) rotate(40)">
          <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#footGrad)"/>
          <ellipse cx="-1" cy="5.5" rx="2.2" ry="2.6" fill="url(#footGrad)"/>
        </g>
        <g transform="translate(74 8) rotate(40)">
          <ellipse cx="0" cy="-2" rx="3" ry="5" fill="url(#footGrad)"/>
          <ellipse cx="1" cy="5.5" rx="2.2" ry="2.6" fill="url(#footGrad)"/>
        </g>
      </svg>`,
      consistency: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Calendar outline -->
        <rect x="14" y="18" width="52" height="48" rx="6" stroke="${hexColor}" stroke-width="1.5" opacity="0.4"/>
        <!-- Top bar -->
        <line x1="14" y1="30" x2="66" y2="30" stroke="${hexColor}" stroke-width="1" opacity="0.3"/>
        <!-- Hanging tabs -->
        <line x1="28" y1="14" x2="28" y2="22" stroke="${hexColor}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <line x1="52" y1="14" x2="52" y2="22" stroke="${hexColor}" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
        <!-- X marks (days completed) -->
        <path d="M22 36L28 42M28 36L22 42" stroke="${hexColor}" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
        <path d="M34 36L40 42M40 36L34 42" stroke="${hexColor}" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
        <path d="M46 36L52 42M52 36L46 42" stroke="${hexColor}" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
        <path d="M22 48L28 54M28 48L22 54" stroke="${hexColor}" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
        <path d="M34 48L40 54M40 48L34 54" stroke="${hexColor}" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
        <!-- Empty days (not yet done) -->
        <rect x="46" y="48" width="6" height="6" rx="1" stroke="${hexColor}" stroke-width="0.8" opacity="0.2"/>
        <rect x="56" y="36" width="6" height="6" rx="1" stroke="${hexColor}" stroke-width="0.8" opacity="0.2"/>
        <rect x="56" y="48" width="6" height="6" rx="1" stroke="${hexColor}" stroke-width="0.8" opacity="0.2"/>
      </svg>`
    };
    return icons[key] || '';
  },

  renderStepper(stepIndex) {
    let html = '<div class="welcome-intro__stepper">';
    for (let i = 0; i < 3; i++) {
      const isActive = i === stepIndex;
      const isDone = i < stepIndex;
      const dotClass = isActive ? 'welcome-intro__stepper-dot--active' :
                       isDone ? 'welcome-intro__stepper-dot--done' : '';
      html += '<div class="welcome-intro__stepper-step">';
      html += `<div class="welcome-intro__stepper-dot ${dotClass}"></div>`;
      if (i < 2) {
        const lineClass = isDone ? 'welcome-intro__stepper-line--done' : '';
        html += `<div class="welcome-intro__stepper-line ${lineClass}"></div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  },

  renderPage(index) {
    this.pageWrap.classList.remove('welcome-intro__page-wrap--bottom');
    this.pageWrap.classList.add('welcome-intro__page-wrap--step');
    this.pageWrap.style.alignItems = 'center';
    this.pageWrap.style.justifyContent = 'center';
    this.pageWrap.style.textAlign = 'center';
    this._hideProgressBar();
    // philosophy pages sit between the celebration and the help page on the bar
    const _ptotal = this.totalPages || (this.tutorialPages.length + this.steps.length + 1);
    // page-by-page stage lighting: black (what is Memento / Three Pillars) ->
    // purple (Clarity) -> white (Action) -> green (Consistency) -> all mixed (Equation)
    const _stageMap = {
      1: { lights: ['purple', 'white', 'green'], scene: 'equation' },
      2: { lights: ['purple'], scene: 'clarity' },
      3: { lights: ['white'], scene: 'action' },
      4: { lights: ['green'], scene: 'consistency' },
      5: { lights: ['purple', 'white', 'green'], scene: 'equation' }
    };
    const _stage = _stageMap[index] || { lights: [], scene: '' };
    this._setStage(_stage.lights, _stage.scene);

    // Tutorial pages (0-1), stepper pages (2-4), combined page (5)
    if (index < this.tutorialPages.length) {
      this.renderTutorialPage(index);
    } else if (index < this.tutorialPages.length + this.steps.length) {
      this.renderStepperPage(index - this.tutorialPages.length);
    } else {
      this.renderCombinedPage();
    }

    // Init hypercolor blob on page 0 (skip if hyperblob was already moved in from splash)
    if (index === 0) {
      setTimeout(() => {
        const wb = document.getElementById('welcomeBlob');
        if (wb && !wb.dataset.live) initMiniBlob('welcomeBlob', 80);
      }, 50);
    }
  },

  renderTutorialPage(index) {
    const page = this.tutorialPages[index];
    this.pageWrap.style.removeProperty('--stepper-color');

    let html = '<div class="welcome-intro__page-inner">';

    if (index === 0) {
      html += `<div class="welcome-intro__headline" style="white-space:nowrap;font-size:clamp(24px,6vw,30px);">${page.headline}</div>`;
      html += `<div class="welcome-intro__tagline">${page.tagline}</div>`;
      html += `<div class="welcome-intro__body" style="margin-top:20px">${page.body}</div>`;
    } else if (page.dotsOnly) {
      html += `<div class="welcome-intro__pillar-split" aria-hidden="true">
        <span class="welcome-intro__pillar-ground welcome-intro__pillar-ground--clarity"></span>
        <span class="welcome-intro__pillar-ground welcome-intro__pillar-ground--action"></span>
        <span class="welcome-intro__pillar-ground welcome-intro__pillar-ground--consistency"></span>
        <span class="welcome-intro__pillar-line welcome-intro__pillar-line--clarity"></span>
        <span class="welcome-intro__pillar-line welcome-intro__pillar-line--action"></span>
        <span class="welcome-intro__pillar-line welcome-intro__pillar-line--consistency"></span>
        <span class="welcome-intro__pillar-base"></span>
      </div>`;
      html += `<div class="welcome-intro__headline" style="font-size:clamp(24px,6vw,30px)">${page.headline}</div>`;
      html += `<div class="welcome-intro__body" style="margin-bottom:28px">${page.body}</div>`;
    } else {
      html += `<div class="welcome-intro__headline" style="font-size:clamp(24px,6vw,30px)">${page.headline}</div>`;
      html += `<div class="welcome-intro__body">${page.body}</div>`;
    }

    html += '</div>';
    this.pageWrap.innerHTML = html;

    this._renderNav(page.btnLabel, null, null, null);
  },

  renderStepperPage(stepIndex) {
    const step = this.steps[stepIndex];
    this.pageWrap.style.setProperty('--stepper-color', step.color);

    let html = '<div class="welcome-intro__page-inner">';

    // Stepper indicator
    // stepper removed

    // Icon with glow
    html += `<div class="welcome-intro__step-icon" style="--stepper-color:${step.color}">
      ${this.getStepIcon(step.icon, step.hex)}
    </div>`;

    // Step label
    html += `<div class="welcome-intro__step-label" style="--stepper-color:${step.color}">${step.label}</div>`;

    // Headline
    html += `<div class="welcome-intro__step-headline">${step.headline}</div>`;

    // Body
    html += `<div class="welcome-intro__step-body">${step.body}</div>`;

    // Optional quote
    if (step.quote) {
      html += `<div style="margin-top:24px;font-style:italic;font-size:0.8125rem;color:rgba(var(--ink),0.35);text-align:center">"${step.quote}"</div>`;
    }

    html += '</div>';
    this.pageWrap.innerHTML = html;

    this._renderNav('Continue', null, null, null);
  },

  renderCombinedPage() {
    this.pageWrap.style.removeProperty(`--stepper-color`);
    const xSep = `<span style="font-size:0.75rem;font-weight:500;color:rgba(var(--ink),0.35);flex-shrink:0">&#215;</span>`;
    const icons = this.steps.map(s =>
      `<div style="width:56px;height:56px;flex-shrink:0">${this.getStepIcon(s.icon, s.hex)}</div>`
    ).join(xSep);
    const html = `<div class="welcome-intro__page-inner">
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:32px">${icons}</div>
      <div class="welcome-intro__headline" style="font-size:clamp(24px,6vw,30px)">The Equation</div>
      <div class="welcome-intro__body" style="margin-top:16px">When you combine all three of these together, that is when progress stops being a maybe and becomes inevitable.<br><br><em>Clear goal x Focused Action x Consistency = results.<br><br>This is how anything great gets accomplished.</em></div>
    </div>`;
    this.pageWrap.innerHTML = html;
    this._renderNav(`Next`, null, null, null);
  },

  _renderNav(nextLabel, btnBg, btnGlow, btnColor, orbitColor) {
    const showBack = this.currentPage > 0;
    this.navEl.style.justifyContent = 'center';
    this.navEl.style.gap = showBack ? '10px' : '';

    let html = '';
    if (showBack) {
      html += '<button class="welcome-intro__back-btn" id="welcomeBack">←</button>';
    }
    html += `<button class="welcome-intro__btn welcome-intro__btn--step" id="welcomeNext" style="${showBack ? 'flex:1;width:auto;' : ''}">${nextLabel}</button>`;
    this.navEl.innerHTML = html;

    const btn = document.getElementById('welcomeNext');
    btn.style.setProperty('--btn-bg', btnBg);
    btn.style.setProperty('--btn-glow', btnGlow);
    if (btnColor) btn.style.setProperty('--btn-color', btnColor);
    if (orbitColor) {
      btn.classList.add('welcome-intro__btn--orbit');
      btn.style.setProperty('--orbit-color', orbitColor);
    }
    btn.addEventListener('click', () => this.next());

    if (showBack) {
      document.getElementById('welcomeBack').addEventListener('click', () => this.back());
    }
  },

  back() {
    if (this.currentPage > 0) {
      const inner = this.pageWrap.querySelector('.welcome-intro__page-inner');
      if (inner) inner.classList.add('exit');
      setTimeout(() => {
        this.currentPage--;
        this.renderPage(this.currentPage);
      }, 250);
    }
  },

  next() {
    if (this.currentPage < this.totalPages - 1) {
      const inner = this.pageWrap.querySelector('.welcome-intro__page-inner');
      if (inner) inner.classList.add('exit');
      setTimeout(() => {
        this.currentPage++;
        this.renderPage(this.currentPage);
      }, 250);
    } else {
      // End of the philosophy pages. Post-celebration this hands off to the
      // personalized help page; otherwise (legacy) the name input.
      if (this._afterPhilosophy) { const cb = this._afterPhilosophy; this._afterPhilosophy = null; cb(); }
      else this._showNameInput();
    }
  },

  _showNameInput() {
    const inner = this.pageWrap.querySelector('.welcome-intro__page-inner');
    if (inner) inner.classList.add('exit');

    setTimeout(() => {
      this.pageWrap.style.alignItems = 'center';
      this.pageWrap.style.textAlign = 'center';
      this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner" style="display:flex;flex-direction:column;align-items:center;width:100%;">
        <div style="font-size:1.5rem;font-weight:700;margin-bottom:8px;">Welcome to Memento.</div>
        <div style="font-size:1rem;color:var(--text-2);margin-bottom:32px;">What should we call you?</div>
        <input class="welcome-intro__name-input" id="welcomeNameInput" type="text" placeholder="Your name" maxlength="30" autocomplete="given-name" aria-label="Your name" autocapitalize="words" spellcheck="false" enterkeyhint="go">
        </div>`;
      this.navEl.style.justifyContent = 'center';
      this.navEl.innerHTML = `<button class="welcome-intro__btn welcome-intro__btn--step" id="welcomeNext" style="opacity:0.3;pointer-events:none;">Continue</button>`;

      this._setProgress(0.06);
      const nameInput = document.getElementById('welcomeNameInput');
      const btn = document.getElementById('welcomeNext');

      nameInput.addEventListener('input', () => {
        const hasName = nameInput.value.trim().length > 0;
        btn.style.opacity = hasName ? '1' : '0.3';
        btn.style.pointerEvents = hasName ? 'auto' : 'none';
      });

      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && nameInput.value.trim().length > 0) {
          e.preventDefault();
          this._beginIdentity(nameInput.value.trim());
        }
      });

      btn.addEventListener('click', () => {
        if (nameInput.value.trim().length > 0) {
          this._beginIdentity(nameInput.value.trim());
        }
      });

      setTimeout(() => nameInput.focus({ preventScroll: true }), 300);
    }, 250);
  },

  // Deep identity intake. Runs after the name screen and before entering the
  // app, so Memento feels personal and owned from minute one. Each answer is
  // optional (blank = skip) but the copy encourages a real answer. Stored on
  // state.profile and later injected (truncated) into every AI call.
  // Surface-level onboarding. Mostly tap-to-pick choices (low friction, no
  // typing off the jump) with one optional open box at the end. Stored as
  // readable strings on state.profile and fed to the AI via buildProfileContext.
  // A 3-pillar DIAGNOSTIC (Clarity gap -> Action gap -> Consistency gap), so each
  // answer figures out which part of Memento this person needs most. The result
  // (weakestPillar) tailors the "Solution" page and seeds Clarity (Build 2).
  identitySteps: [
    // ── CLARITY gap: do they even know what they want? ──────────────────────
    // Clarity leads (the real clarity-gap signal); the area question follows as
    // "what's it about", so the two no longer feel like the same question.
    { key: 'clarityLevel', type: 'choices', multi: false,
      headline: 'Do you have a goal or mission you want to achieve above everything else?',
      options: ['Yes, I do and know exactly what it is', 'I have a rough idea', "Not really... but I'm trying to figure it out", 'No, I feel completely lost'] },
    { key: 'runningToward', type: 'choices', multi: true,
      // Skip the "what part of your life" narrowing for someone who just said they
      // feel completely lost: asking them to pick an area presumes a direction they
      // do not have yet. They go straight to the clarity questions below. People who
      // have a goal, a rough idea, or are figuring it out still get this (it helps).
      skipIf: (p) => String((p && p.clarityLevel) || '').toLowerCase().indexOf('lost') !== -1,
      // "I'm honestly not sure yet" is exclusive: picking it clears the rest, and
      // picking anything else clears it (you can't be sure AND not sure).
      exclusive: ["I'm honestly not sure yet"],
      headline: 'What part of your life is this about?',
      sub: 'Tap whatever fits. You can pick more than one.',
      options: ['Work & money', 'Health & fitness', 'Discipline & focus', 'A skill or craft', 'Creative work', 'Relationships', 'Mindset & Mental', "I'm honestly not sure yet"] },
    // (birthday is inserted here, after the clarity gap)
    // ── ACTION gap: do they know the steps, and where are they? ─────────────
    // Action gap, only for people who actually have a direction (a goal or a rough
    // idea). Asking someone who just said they feel lost "do you know what to do to
    // get there?" makes no sense, so for them we branch to the clarity questions below.
    { key: 'actionKnow', type: 'choices', multi: false,
      headline: 'Do you know what to do to get there?',
      sub: 'The actual steps, not the dream.',
      options: ["Yes, I know the actions to get there", "Sort of, not sure it's right", "No, I don't know the steps"],
      skipIf: (p) => { const c = String((p && p.clarityLevel) || '').toLowerCase(); return c.indexOf('lost') !== -1 || c.indexOf('not really') !== -1; } },
    { key: 'actionProgress', type: 'choices', multi: false,
      headline: "How's it going so far?",
      sub: 'No judgment. Just where you actually are.',
      options: ["Haven't really started", 'Started, then stalled', 'Slow but moving', 'Actually on a roll'],
      skipIf: (p) => { const c = String((p && p.clarityLevel) || '').toLowerCase(); return c.indexOf('lost') !== -1 || c.indexOf('not really') !== -1; } },
    // Clarity branch: shown INSTEAD of the two action questions above when they have
    // no goal yet (lost / still figuring it out). There is no "there" for them, so we
    // ask what is in the way of naming it, and whether they have tried before.
    { key: 'clarityBlock', type: 'choices', multi: false,
      headline: "What do you think is making it hard to know what you want?",
      options: ["Too many directions, I can't pick one", "Scared I'll pick the wrong thing", "I've lost touch with what I care about", "I've never really stopped to figure it out"],
      skipIf: (p) => { const c = String((p && p.clarityLevel) || '').toLowerCase(); return !(c.indexOf('lost') !== -1 || c.indexOf('not really') !== -1); } },
    { key: 'clarityHistory', type: 'choices', multi: false,
      headline: 'Have you tried to figure this out before?',
      sub: 'No judgment. Just where you actually are.',
      options: ['No, this is the first time', 'Tried, but it faded', 'I keep starting over', "I think I'm close, just not there"],
      skipIf: (p) => { const c = String((p && p.clarityLevel) || '').toLowerCase(); return !(c.indexOf('lost') !== -1 || c.indexOf('not really') !== -1); } },
    // ── CONSISTENCY gap: what's holding them back, and what's the pull? ──────
    // Only asked of people who said they are NOT making progress (Haven't
    // started / Started then stalled). If they're already moving, nothing is
    // holding them back, so this and the distraction follow-up are skipped.
    { key: 'runningFrom', type: 'choices', multi: true,
      headline: 'What do you think is holding you back?',
      sub: 'Be honest, this is just for you.',
      options: ['Procrastination', 'Phone & social media', "I don't know what to do", "Can't stay consistent", 'Fear of failing', 'Not enough time', 'Low motivation', 'Self-doubt'],
      skipIf: (p) => { const ap = String((p && p.actionProgress) || ''); return ap === 'Slow but moving' || ap === 'Actually on a roll'; } },
    { key: 'distraction', type: 'choices', multi: false,
      headline: 'What pulls your attention the most?',
      sub: 'The honest answer, not the polite one.',
      options: ['TikTok', 'Instagram / Reels', 'YouTube', 'Porn', 'Gaming', 'Friends / going out', 'Something else'],
      // Only ask if the phone is what's pulling them back.
      skipIf: (p) => String((p && p.runningFrom) || '').indexOf('Phone & social media') === -1 },
    // ── WHY / weight: the fuel that carries them. Two framings of the same job,
    // chosen by where they actually are. People who are NOT moving yet get the
    // mori weight (the cost of staying still). People who ARE moving (slow but
    // moving / on a roll) get the upside instead, because an all-negative "if
    // nothing changes" question contradicts someone who just said they're on a
    // roll. Exactly one of these two runs (mirrors the runningFrom skip). ─────
    { key: 'costOfInaction', type: 'choices', multi: true,
      headline: 'If a year goes by and nothing changes, what does that feel like?',
      options: ['Regret', 'Wasted potential', 'Watching everyone pass me', 'Letting people down', 'Running out of time', "Becoming someone I don't want to be"],
      skipIf: (p) => { const ap = String((p && p.actionProgress) || ''); return ap === 'Slow but moving' || ap === 'Actually on a roll'; } },
    { key: 'momentumWin', type: 'choices', multi: true,
      headline: 'Keep this up for a year. What does that get you?',
      options: ['The goal, actually reached', 'Proof I can count on myself', "A life I'm proud of", 'Becoming who I want to be', 'Momentum that compounds', 'Real freedom and options'],
      skipIf: (p) => { const ap = String((p && p.actionProgress) || ''); return !(ap === 'Slow but moving' || ap === 'Actually on a roll'); } },
    { key: 'letterToFutureSelf', type: 'text',
      headline: 'Anything else Memento should know?',
      sub: 'Totally optional. A line about you, your situation, or what you want. Or just skip it.',
      placeholder: 'Type anything, or skip' },
    { type: 'summaryStepper' }
  ],

  _beginIdentity(name) {
    if (name) state.profile.name = name;
    persistNow();
    this._showBasics();
  },

  // Birthday moment. ONE focus per screen (the name screen handled the name;
  // this never asks for it again). Framed as the product thesis, not a form:
  // your time is finite, the birthday is how Memento shows you how much is
  // left. It powers Memento Mori from day one, lets the AI calibrate by age,
  // and enforces the soft 13+ gate (COPPA). Full name is NOT asked here (it is
  // optional and lives in Settings) so onboarding never asks the name twice.
  _showBasics() {
    const inner = this.pageWrap.querySelector('.welcome-intro__page-inner');
    if (inner) inner.classList.add('exit');
    const nm = (state.profile && state.profile.name) ? esc(state.profile.name) : 'there';
    setTimeout(() => {
      this.pageWrap.style.alignItems = 'center';
      this.pageWrap.style.textAlign = 'center';
      this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner" style="display:flex;flex-direction:column;align-items:center;width:100%;max-width:340px;">
        <div style="font-size:1.5rem;font-weight:700;margin-bottom:10px;">And when were you born, ${nm}?</div>
        <div style="font-size:0.95rem;color:var(--text-2);margin-bottom:30px;line-height:1.55;">(this is important for building your memento)</div>
        <input class="welcome-intro__name-input" id="basicsBirthday" type="date" autocomplete="bday" aria-label="Your birthday" style="color-scheme:dark;max-width:260px;">
        <div id="basicsErr" style="font-size:0.8rem;color:var(--color-distraction,#ff6b6b);margin-top:12px;min-height:1em;"></div>
      </div>`;
      this.navEl.style.justifyContent = 'center';
      this.navEl.innerHTML = `<button class="welcome-intro__btn welcome-intro__btn--step" id="basicsNext" style="opacity:0.3;pointer-events:none;">Continue</button>`;
      this._setProgress(0.12);

      const bday = document.getElementById('basicsBirthday');
      const err = document.getElementById('basicsErr');
      const btn = document.getElementById('basicsNext');
      if (bday) bday.value = (state.profile && state.profile.birthday) || '';
      const sync = () => {
        const ok = !!(bday && bday.value);
        btn.style.opacity = ok ? '1' : '0.3';
        btn.style.pointerEvents = ok ? 'auto' : 'none';
        if (err) err.textContent = '';
      };
      if (bday) bday.addEventListener('input', sync);
      sync();

      const submit = () => {
        if (!bday || !bday.value) return;
        const age = (typeof ageFromBirthday === 'function') ? ageFromBirthday(bday.value) : null;
        if (age == null) { if (err) err.textContent = 'That date does not look right. Mind checking it?'; return; }
        // Soft gate at 13 (COPPA). Under 13 cannot proceed.
        if (age < 13) { if (err) err.textContent = 'Memento is for ages 13 and up. Come back when you are a bit older.'; return; }
        state.profile.birthday = bday.value;
        // Wire the birthday straight into Memento Mori so the death calendar is
        // live from minute one (only set if the user has not set one already).
        try {
          if (state.mori && !state.mori.birthYear) state.mori.birthYear = parseInt(bday.value.slice(0, 4), 10);
        } catch (e) {}
        persistNow();
        this._showIdentityStep(0);
      };
      if (btn) btn.addEventListener('click', submit);
      if (bday) bday.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      setTimeout(() => { if (bday) bday.focus({ preventScroll: true }); }, 300);
    }, 250);
  },

  _showIdentityStep(i) {
    const steps = this.identitySteps;
    if (i >= steps.length) { this._finishWithName(); return; }
    if (i < 0) i = 0;
    const step = steps[i];
    const existing = (step.key && state.profile && state.profile[step.key]) || '';
    const inner = this.pageWrap.querySelector('.welcome-intro__page-inner');
    if (inner) inner.classList.add('exit');
    const name = (state.profile && state.profile.name) ? state.profile.name : '';
    let headline = step.headline || '';
    if (headline.indexOf('{name}') !== -1) {
      headline = name ? headline.replace('{name}', esc(name)) : headline.replace('Okay, {name}. ', '');
    }
    const SEP = ' · ';   // " · " separator for joined choice values
    const isQ = (s) => s && (s.type === 'choices' || s.type === 'text');
    const qTotal = steps.filter(isQ).length;
    const qNum = steps.slice(0, i + 1).filter(isQ).length;
    // Turn a joined choice string into a readable, mid-sentence list.
    const phrase = (val) => {
      const parts = String(val || '').split(SEP).map(s => s.trim()).filter(Boolean)
        .map(s => s.charAt(0).toLowerCase() + s.slice(1));
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0];
      return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
    };
    const goBack = () => { if (i === 0) { this._showBasics(); } else { this._showIdentityStep(i - 1); } };

    setTimeout(() => {
      this.pageWrap.style.alignItems = 'center';
      this.pageWrap.style.justifyContent = 'center';
      this.pageWrap.style.textAlign = 'left';
      this.navEl.style.justifyContent = 'center';
      this.navEl.style.gap = '10px';
      const navBack = `<button class="welcome-intro__back-btn" id="identityBack">←</button>`;
      const bindBack = () => { const b = document.getElementById('identityBack'); if (b) b.addEventListener('click', () => goBack()); };

      // ===== QUESTION STEPS (choices / text) =====
      if (step.type === 'choices' || step.type === 'text') {
        this._setProgress(0.18 + 0.72 * ((qNum - 1) / Math.max(1, qTotal - 1)));
        const stepHead =
          `<div class="welcome-intro__identity-headline">${headline}</div>` +
          `<div class="welcome-intro__identity-sub">${step.sub}</div>`;

        if (step.type === 'choices') {
          const selected = new Set(String(existing).split(SEP).map(s => s.trim()).filter(Boolean));
          const chipsHtml = step.options.map(opt =>
            `<button type="button" class="welcome-intro__chip${selected.has(opt) ? ' is-selected' : ''}" data-opt="${esc(opt)}">${esc(opt)}</button>`
          ).join('');
          this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner welcome-intro__identity">${stepHead}
            <div class="welcome-intro__chips" id="identityChips" role="group" aria-label="${esc(String(headline).replace(/<[^>]*>/g,''))}">${chipsHtml}</div></div>`;
          this.navEl.innerHTML = navBack + `<button class="welcome-intro__btn welcome-intro__btn--step" id="identityNext" style="flex:1;width:auto;">Continue</button>`;
          const nextBtn = document.getElementById('identityNext');
          const chipsEl = document.getElementById('identityChips');
          const save = () => { if (state.profile) state.profile[step.key] = [...selected].join(SEP); };
          // multiple choice is required: Continue is disabled until at least one pick
          const refreshNext = () => {
            const has = selected.size > 0;
            nextBtn.style.opacity = has ? '1' : '0.35';
            nextBtn.style.pointerEvents = has ? 'auto' : 'none';
            nextBtn.dataset.skip = has ? '' : '1';
          };
          refreshNext();
          chipsEl.querySelectorAll('.welcome-intro__chip').forEach(btn => {
            btn.addEventListener('click', () => {
              const opt = btn.dataset.opt;
              if (step.multi) {
                if (selected.has(opt)) { selected.delete(opt); btn.classList.remove('is-selected'); }
                else { selected.add(opt); btn.classList.add('is-selected'); }
              } else {
                selected.clear();
                chipsEl.querySelectorAll('.welcome-intro__chip').forEach(b => b.classList.remove('is-selected'));
                selected.add(opt); btn.classList.add('is-selected');
              }
              refreshNext();
            });
          });
          nextBtn.addEventListener('click', () => {
            if (selected.size === 0) return;   // required
            save(); persistNow();
            this._showIdentityStep(i + 1);
          });
        } else {
          const labelFor = (hasText) => hasText ? 'Continue' : 'Skip';
          this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner welcome-intro__identity">${stepHead}
            <textarea class="welcome-intro__identity-input" id="identityInput" aria-label="Anything else Memento should know" placeholder="${esc(step.placeholder || '')}" rows="4">${esc(existing)}</textarea></div>`;
          this.navEl.innerHTML = navBack + `<button class="welcome-intro__btn welcome-intro__btn--step" id="identityNext" style="flex:1;width:auto;">${labelFor(!!String(existing).trim())}</button>`;
          const ta = document.getElementById('identityInput');
          const nextBtn = document.getElementById('identityNext');
          nextBtn.dataset.skip = '';   // optional: skip or continue both just advance
          const save = () => { if (state.profile) state.profile[step.key] = ta.value.trim(); };
          ta.addEventListener('input', () => { nextBtn.textContent = labelFor(!!ta.value.trim()); });
          nextBtn.addEventListener('click', () => {
            save(); persistNow();
            this._setProgress(1);
            setTimeout(() => this._showIdentityStep(i + 1), 620);   // skip or continue both advance to the summary
          });
          setTimeout(() => ta.focus({ preventScroll: true }), 300);
        }
        bindBack();
        return;
      }

      // ===== MIRROR (reflect their own answers back: the first "you are seen" win) =====
      // A calm, serious beat before the celebration. Built entirely from the
      // answers they just gave, so it costs nothing and lands as "this gets me".
      if (step.type === 'mirror') {
        this._hideProgressBar();
        this.el.classList.remove('welcome-intro--blackout', 'welcome-intro--help');
        const p = state.profile || {};
        const rows = [];
        if (p.runningToward) rows.push(['You want to grow in', phrase(p.runningToward)]);
        if (p.story)         rows.push(['Right now, it feels like', phrase(p.story)]);
        if (p.whoFor)        rows.push(["You're doing this for", phrase(p.whoFor)]);
        if (p.runningFrom)   rows.push(['What keeps pulling you back is', phrase(p.runningFrom)]);
        if (p.commitment)    rows.push(["And you said you are", phrase(p.commitment)]);
        const STEP = 360;
        let d = 0;
        const eyebrow = `<div class="welcome-intro__mirror-eyebrow" style="--d:0ms">Before you begin</div>`;
        d = 260;
        const nm = (p.name || '').trim();
        const openLine = nm
          ? `<div class="welcome-intro__mirror-line welcome-intro__mirror-open" style="--d:${d}ms">You are <span class="welcome-intro__mirror-hl">${esc(nm)}</span>.</div>`
          : '';
        if (nm) d += STEP;
        const rowsHtml = rows.map(([label, val]) => {
          const line = `<div class="welcome-intro__mirror-line" style="--d:${d}ms"><span class="welcome-intro__mirror-label">${esc(label)}</span> <span class="welcome-intro__mirror-hl">${esc(val)}</span>.</div>`;
          d += STEP;
          return line;
        }).join('');
        const dividerDelay = d;
        d += 160;
        const closeMuted = `<div class="welcome-intro__mirror-line welcome-intro__mirror-muted" style="--d:${d}ms">Most people drift for years without ever naming a single one of these.</div>`;
        d += STEP;
        const closeHit = `<div class="welcome-intro__mirror-line welcome-intro__mirror-close" style="--d:${d}ms">You just did. That is where it begins.</div>`;
        this.pageWrap.style.alignItems = 'center';
        this.pageWrap.style.justifyContent = 'center';
        this.pageWrap.style.textAlign = 'left';
        this.navEl.style.justifyContent = 'center';
        this.navEl.style.gap = '10px';
        this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner welcome-intro__mirror">
          ${eyebrow}
          ${openLine}
          ${rowsHtml}
          <div class="welcome-intro__mirror-divider" style="--d:${dividerDelay}ms"></div>
          ${closeMuted}
          ${closeHit}
        </div>`;
        this.navEl.innerHTML = navBack + `<button class="welcome-intro__btn welcome-intro__btn--step" id="identityNext" style="flex:1;width:auto;">Continue</button>`;
        document.getElementById('identityNext').addEventListener('click', () => this._showIdentityStep(i + 1));
        bindBack();
        return;
      }

      // ===== SUMMARY STEPPER (first-win celebration, then AI summary) =====
      if (step.type === 'summaryStepper') {
        this._showFirstWin(i);
        return;
      }

      // ===== PAYWALL (placeholder, lifetime-anchored) =====
      if (step.type === 'paywall') {
        this._hideProgressBar();
        // lift the dark themes + stop the fireworks before the offer
        this.el.classList.remove('welcome-intro--blackout', 'welcome-intro--help');
        this._setStage(['purple', 'green', 'cyan']);
        this._confettiVer = (this._confettiVer || 0) + 1;
        const _cf = document.getElementById('welcomeConfetti'); if (_cf) _cf.remove();
        const _bc = document.getElementById('welcomeBeacon'); if (_bc) _bc.remove();
        if (this._fwClick) { document.removeEventListener('click', this._fwClick, true); this._fwClick = null; }
        // Paywall: bold Gen-Z look (Malik's pick). Real offer from SELL_IT_PACK.
        // Prices are placeholders: 99 / 199 / 3x39. Buy is non-functional (proceeds via _finishWithName).
        this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner welcome-intro__paywall">
          <h1 class="welcome-intro__pw-h1">
            <span class="welcome-intro__pw-stk">Build your</span>
            <span class="welcome-intro__pw-stk welcome-intro__pw-grad">Memento</span>
          </h1>
          <p class="welcome-intro__pw-sub">Memento turns what you want into one clear direction and the single next move to get there. <b>Every day you show up, it captures the proof, grows your streak, and keeps your story.</b> It compounds over time, so it becomes a place you come back to for years, not weeks.</p>
          <ul class="welcome-intro__pw-points">
            <li><span class="welcome-intro__pw-pnum">01</span><span class="welcome-intro__pw-ptxt">One goal, named. <span>And the version of you who reaches it.</span></span></li>
            <li><span class="welcome-intro__pw-pnum">02</span><span class="welcome-intro__pw-ptxt">The single highest-leverage move a day. <span>Open it, do it, close it.</span></span></li>
            <li><span class="welcome-intro__pw-pnum">03</span><span class="welcome-intro__pw-ptxt">Watch the gap close. <span>Streaks and proof you can actually see.</span></span></li>
            <li><span class="welcome-intro__pw-pnum">04</span><span class="welcome-intro__pw-ptxt">Yours and private. <span>On your device, no subscription, forever.</span></span></li>
          </ul>
          <div class="welcome-intro__pw-pricehead">
            <h2 class="welcome-intro__pw-priceh">Pick your way in</h2>
            <span class="welcome-intro__pw-pricenote">Own it once</span>
          </div>
          <div class="welcome-intro__plans" role="radiogroup" aria-label="Choose your plan">
            <button type="button" class="welcome-intro__plan welcome-intro__plan--hero is-picked" data-plan="lifetime" role="radio" aria-checked="true">
              <span class="welcome-intro__plan-flag">Most people pick this</span>
              <div class="welcome-intro__plan-toprow">
                <div>
                  <div class="welcome-intro__plan-label welcome-intro__plan-label--grad">The Lock-In System</div>
                  <div class="welcome-intro__plan-sub">Everything, yours forever. No subscription.</div>
                </div>
              </div>
              <div class="welcome-intro__plan-heroamt">
                <span class="welcome-intro__plan-hcur">$</span>
                <span class="welcome-intro__plan-hbig">99</span>
                <span class="welcome-intro__plan-hmeta">once</span>
              </div>
              <p class="welcome-intro__plan-hsub"><b>Cheaper than a year of any app it replaces.</b> Pay once, keep it for life, never see a renewal.</p>
            </button>
            <button type="button" class="welcome-intro__plan welcome-intro__plan--flat" data-plan="founder" role="radio" aria-checked="false">
              <div><div class="welcome-intro__plan-label">Founder's Edition</div><div class="welcome-intro__plan-sub">Founder access and every future update</div></div>
              <div class="welcome-intro__plan-amt"><span class="welcome-intro__plan-cur">$</span><span class="welcome-intro__plan-big">199</span><span class="welcome-intro__plan-per">once</span></div>
            </button>
            <button type="button" class="welcome-intro__plan welcome-intro__plan--flat" data-plan="plan" role="radio" aria-checked="false">
              <div><div class="welcome-intro__plan-label">Pay in 3</div><div class="welcome-intro__plan-sub">Same system, interest-free</div></div>
              <div class="welcome-intro__plan-amt"><span class="welcome-intro__plan-cur">3 x $</span><span class="welcome-intro__plan-big">39</span></div>
            </button>
          </div>
          <div class="welcome-intro__pw-reassure">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L4 5v6c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V5l-8-3z" stroke="var(--success-soft)" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="var(--success-soft)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span><b>The Still-Drifting Guarantee.</b> Do the work for 30 days. If you come out the other side still as lost as you started, email me and I refund every cent. You have 60 days to decide.</span>
          </div>
          <div class="welcome-intro__pw-founder">
            <span class="welcome-intro__pw-av">M</span>
            <p>I built this because I watched years almost slip past me on autopilot. I priced it once so it never becomes another bill you forget about. If it does not move you, take the refund.<span class="welcome-intro__pw-who">Malik, founder of Memento</span></p>
          </div>
          <div class="privacy-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L4 5v6c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V5l-8-3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
            <span>Your data lives on your device. No account, no tracking. The only thing that ever leaves is what you choose to send to the optional AI. You can export it any time.</span>
          </div>
          <button class="welcome-intro__skip-link" id="identityMaybe" type="button" aria-label="Skip for now and enter Memento">Maybe later</button>
        </div>`;
        this.navEl.innerHTML = navBack + `<button class="welcome-intro__btn welcome-intro__btn--step welcome-intro__btn--enter welcome-intro__btn--orbit" id="identityNext" style="flex:1;width:auto;--orbit-color:#9b7eff;">Enter Memento</button>`;
        // Placeholder: tapping a tier just highlights it. The button / Maybe later both
        // proceed into the app (no billing backend yet).
        this.pageWrap.querySelectorAll('.welcome-intro__plan').forEach(pl => {
          pl.addEventListener('click', () => {
            this.pageWrap.querySelectorAll('.welcome-intro__plan').forEach(x => { x.classList.remove('is-picked'); x.setAttribute('aria-checked', 'false'); });
            pl.classList.add('is-picked'); pl.setAttribute('aria-checked', 'true');
          });
        });
        document.getElementById('identityNext').addEventListener('click', () => this._finishWithName());
        const maybe = document.getElementById('identityMaybe');
        if (maybe) maybe.addEventListener('click', () => this._finishWithName());
        // Back from the paywall goes to the immediately-preceding "Solution" page,
        // not all the way back into the congrats celebration replay (summaryStepper
        // is step i-1, whose final screen is _showHelpPage(i-1)).
        const pwBack = document.getElementById('identityBack');
        if (pwBack) pwBack.addEventListener('click', () => this._showHelpPage(i - 1));
        return;
      }
    }, 250);
  },

  _phraseList(val) {
    const SEP = ' · ';
    const parts = String(val || '').split(SEP).map(s => s.trim()).filter(Boolean)
      .map(s => s.charAt(0).toLowerCase() + s.slice(1));
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  },

  _solutionWantLine(profile) {
    const toward = this._phraseList(profile && profile.runningToward);
    const clarity = String((profile && profile.clarityLevel) || '').toLowerCase();
    const reallyLost = clarity.indexOf('lost') !== -1 || clarity.indexOf('not really') !== -1;
    if (toward && toward.indexOf('not sure') === -1) {
      if (reallyLost) return 'You want to move on ' + toward + ', you just have not pinned down exactly what that looks like yet. That is the first thing we fix.';
      return 'You want real movement in ' + toward + ', and you are done letting it stay vague.';
    }
    return 'You are here because some part of you knows life can be sharper than this, you just have not named the thing yet.';
  },

  _solutionNeedLine(profile) {
    const pillar = (profile && profile.weakestPillar) || this._computeWeakestPillar(profile);
    if (pillar === 'clarity') return 'Looks like clarity is your first unlock: naming the one thing clearly enough that the next move stops feeling blurry.';
    if (pillar === 'action') return 'Looks like action is your first unlock: turning the goal into one clean next move, small enough to start today.';
    return 'Looks like consistency is your first unlock: a way back in on the days your energy is not there, so it actually compounds.';
  },

  // Deterministic, AI-free onboarding summary. Built locally from the user's
  // answers, so the universal first-run is instant, free, works offline, and can
  // never stall or fail on a network call. Same shape as before (this._summary
  // with the 7 keys) so the cards + solution page read it unchanged.
  generateSummary() {
    this._summaryFailed = false;
    try { this._summary = this._buildSummary(state.profile || {}); }
    catch (e) { this._summary = null; this._summaryFailed = true; }
  },

  // The copy engine: maps the diagnostic answers to short, personal, on-voice
  // lines. Pure, never throws, no em dashes. Returns { whatYouWant, clarity,
  // why, action, consistency, together, plus }.
  _buildSummary(p) {
    p = p || {};

    // ---------- internal helpers (no "this", never throw) ----------
    function s(v) { return (v == null ? '' : String(v)); }
    function low(v) { return s(v).toLowerCase(); }
    function has(v, frag) { return low(v).indexOf(frag) !== -1; }
    function parts(v) {
      return s(v).split('·').map(function (x) { return x.trim(); }).filter(Boolean);
    }
    function anyHas(v, frag) {
      var ps = parts(v);
      for (var i = 0; i < ps.length; i++) {
        if (low(ps[i]).indexOf(frag) !== -1) return true;
      }
      return false;
    }
    function lc1(str) {
      if (!str) return '';
      return str.charAt(0).toLowerCase() + str.slice(1);
    }
    // "a" / "a and b" / "a, b, and c".
    // If any item already contains " and ", fall back to pure comma
    // separation so we never stack "X and Y and Z" into a muddy run.
    function joinAnd(arr) {
      var a = (arr || []).filter(Boolean);
      if (a.length === 0) return '';
      if (a.length === 1) return a[0];
      var hasAnd = false;
      for (var j = 0; j < a.length; j++) { if (a[j].indexOf(' and ') !== -1) hasAnd = true; }
      if (hasAnd) return a.join(', ');
      if (a.length === 2) return a[0] + ' and ' + a[1];
      return a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1];
    }

    // ---------- raw fields ----------
    var clarityLevel = s(p.clarityLevel);
    var actionKnow = s(p.actionKnow);
    var actionProgress = s(p.actionProgress);
    var distraction = s(p.distraction).trim();
    var weakest = low(p.weakestPillar);

    // ---------- runningToward (map labels to clean prose) ----------
    var towardRaw = parts(p.runningToward);
    var towardUnsure = false;
    var towardClean = [];
    var towardMap = {
      'work & money': 'work and money',
      'health & fitness': 'your health',
      'discipline & focus': 'discipline and focus',
      'a skill or craft': 'a skill you care about',
      'creative work': 'your creative work',
      'relationships': 'your relationships',
      'confidence & mindset': 'your confidence',
      'purpose & direction': 'direction'
    };
    for (var i = 0; i < towardRaw.length; i++) {
      if (has(towardRaw[i], 'not sure')) { towardUnsure = true; continue; }
      var key = low(towardRaw[i]);
      towardClean.push(towardMap[key] || lc1(towardRaw[i]));
    }
    var towardPhrase = joinAnd(towardClean);

    // ---------- costOfInaction ----------
    var costRegret = anyHas(p.costOfInaction, 'regret');
    var costTime = anyHas(p.costOfInaction, 'running out') || anyHas(p.costOfInaction, 'out of time');
    var costPotential = anyHas(p.costOfInaction, 'potential');
    var costPass = anyHas(p.costOfInaction, 'pass');
    var costLetting = anyHas(p.costOfInaction, 'letting') || anyHas(p.costOfInaction, 'down');
    var costStuck = anyHas(p.costOfInaction, 'same place') || anyHas(p.costOfInaction, 'stuck');
    var hasCost = costRegret || costTime || costPotential || costPass || costLetting || costStuck;

    // ---------- momentumWin (the upside "why" for people already moving) ----------
    var winGoal = anyHas(p.momentumWin, 'goal') || anyHas(p.momentumWin, 'reached');
    var winSelf = anyHas(p.momentumWin, 'count on') || anyHas(p.momentumWin, 'myself');
    var winProud = anyHas(p.momentumWin, 'proud');
    var winBecome = anyHas(p.momentumWin, 'who i want');
    var winCompound = anyHas(p.momentumWin, 'compound') || anyHas(p.momentumWin, 'momentum');
    var winFreedom = anyHas(p.momentumWin, 'freedom') || anyHas(p.momentumWin, 'options');
    var hasWin = winGoal || winSelf || winProud || winBecome || winCompound || winFreedom;

    // ---------- runningFrom / distraction ----------
    var phone = anyHas(p.runningFrom, 'phone');
    var procrast = anyHas(p.runningFrom, 'procrast');
    var inconsistent = anyHas(p.runningFrom, 'consistent');
    var fromLost = anyHas(p.runningFrom, "know what to do");
    var fearFail = anyHas(p.runningFrom, 'fear');
    var noTime = anyHas(p.runningFrom, 'enough time') || anyHas(p.runningFrom, 'not enough time');
    var lowMot = anyHas(p.runningFrom, 'motivation');
    var selfDoubt = anyHas(p.runningFrom, 'doubt');

    var distrName = '';
    if (phone) {
      if (has(distraction, 'tiktok')) distrName = 'TikTok';
      else if (has(distraction, 'instagram') || has(distraction, 'reel')) distrName = 'Instagram';
      else if (has(distraction, 'youtube')) distrName = 'YouTube';
      else if (has(distraction, 'porn')) distrName = 'porn';
      else if (has(distraction, 'gaming')) distrName = 'gaming';
      else if (has(distraction, 'friend') || has(distraction, 'going out')) distrName = 'going out';
    }

    // ====================================================================
    // 1) whatYouWant  (Card title already says the name, so don't echo it)
    // ====================================================================
    var whatYouWant;
    if (towardUnsure && towardClean.length === 0) {
      whatYouWant = 'You came in honest, you are not sure what you are after yet. That is the thing we start with, and it is a fine place to start.';
    } else if (towardUnsure && towardPhrase) {
      whatYouWant = 'You want movement on ' + towardPhrase + ', even if the bigger picture is still fuzzy. We sharpen the rest from here.';
    } else if (towardPhrase) {
      whatYouWant = 'You want movement on ' + towardPhrase + ', and you are done letting it stay vague.';
    } else {
      whatYouWant = 'You came here to stop drifting and move on what actually matters to you.';
    }

    // ====================================================================
    // 2) clarity  (S1 stands alone, tie to clarityLevel)
    // ====================================================================
    var clarity;
    if (has(clarityLevel, 'know exactly')) {
      clarity = 'You already know your one thing, so Memento points every day at it instead of letting it slip. Clear on the target, you stop spending days on the wrong work.';
    } else if (has(clarityLevel, 'rough')) {
      clarity = 'You have a rough idea of where you are headed, and Memento sharpens it into one clear thing to aim at. A rough direction is a fine start, we make it specific enough to act on.';
    } else if (has(clarityLevel, 'not really') || has(clarityLevel, 'figuring')) {
      clarity = 'You are still figuring out the direction, so Memento helps you narrow it to the one thing worth your effort right now. Naming it is the first move, and that clarity is what everything else sits on.';
    } else if (has(clarityLevel, 'lost')) {
      clarity = 'Feeling lost is okay, honestly it is where almost everyone starts, and Memento helps you find the one thing worth chasing. That is step one here, and most people never get this far.';
    } else {
      clarity = 'Memento gets you clear on the one thing that matters most right now. Everything else gets quieter once that is named.';
    }

    // ====================================================================
    // 3) why  (lean HARD on costOfInaction, the mori weight)
    // ====================================================================
    var why;
    if (hasCost) {
      var costBits = [];
      if (costRegret) costBits.push('the regret of looking back on this');
      if (costTime) costBits.push('the time you do not get back');
      if (costPotential) costBits.push('the potential you leave on the table');
      if (costPass) costBits.push('watching everyone else move ahead of you');
      if (costStuck) costBits.push('a year from now in the same exact place');
      if (costLetting && !costPass) costBits.push('letting down the people counting on you');
      var costLine = joinAnd(costBits);
      var tail = costTime
        ? 'The clock is the one thing you do not get back. Not to scare you, to move you while it still counts.'
        : 'Not to scare you, to keep you moving when motivation runs out.';
      why = 'When it gets hard, you remember what staying here costs you, ' + costLine + '. ' + tail;
    } else if (hasWin) {
      var winBits = [];
      if (winGoal) winBits.push('the goal actually reached');
      if (winSelf) winBits.push('proof you can count on yourself');
      if (winProud) winBits.push('a life you are proud of');
      if (winBecome) winBits.push('becoming who you want to be');
      if (winCompound) winBits.push('momentum that compounds');
      if (winFreedom) winBits.push('the freedom it buys you');
      var winLine = joinAnd(winBits);
      why = 'You are already moving, so the why is the upside, ' + winLine + '. When it gets hard, that is the pull that keeps the momentum going.';
    } else {
      why = 'Memento keeps your reason in front of you, so on the hard days you remember why you started. The cost of staying the same is what carries you when motivation is gone.';
    }

    // ====================================================================
    // 4) action  (S1 stands alone, operator momentum, tie to actionKnow + progress)
    // ====================================================================
    var action;
    var followThrough = has(actionKnow, 'follow through') || has(actionKnow, 'follow-through') || has(actionKnow, "don't follow") || has(actionKnow, 'know the action');
    var actionUnsure = has(actionKnow, 'sort of') || has(actionKnow, 'not sure it');
    var noSteps = has(actionKnow, 'know the steps') || has(actionKnow, 'do not know the steps');
    var stalled = has(actionProgress, 'stalled') || has(actionProgress, 'started, then') || has(actionProgress, 'started then');
    var notStarted = has(actionProgress, 'haven') || has(actionProgress, 'not really started');
    var slow = has(actionProgress, 'slow');
    var roll = has(actionProgress, 'roll');

    if (followThrough) {
      action = 'Every day Memento hands you the single next move, so knowing what to do turns into doing it. You already know the steps, the gap is follow-through, and this closes it one day at a time.';
    } else if (actionUnsure) {
      action = 'Every day Memento gives you the one next move that matters, so you stop second-guessing whether you are working on the right thing. Less guessing, more ground covered.';
    } else if (noSteps) {
      action = 'Every day Memento hands you the single next step, so not knowing where to start stops being the thing that holds you up. You do not need the whole staircase, just the next step.';
    } else {
      action = 'Every day Memento gives you the single move that matters most, so you stop staring at a list guessing where to begin. One clear next step, every day.';
    }
    if (stalled) {
      action += ' You started and stalled once, and the next move is how you start again.';
    } else if (notStarted) {
      action += ' You have not really started yet, so the first move is small enough to actually take.';
    } else if (slow) {
      action += ' You are already moving slow, and the next move keeps it steady.';
    } else if (roll) {
      action += ' You are on a roll, and this keeps it going.';
    }

    // ====================================================================
    // 5) consistency  (S1 stands alone, name distraction, mori weight)
    // ====================================================================
    var consistency;
    var cS1, cS2;
    if (phone && distrName) {
      cS1 = 'The phone keeps winning, especially ' + distrName + ', and Memento builds the days you show up anyway.';
      cS2 = 'Every scroll feels free in the moment and costs you a day you wanted back. That is where it compounds, one day stacked on the last.';
    } else if (phone) {
      cS1 = 'The phone keeps winning right now, and Memento builds the days you show up anyway.';
      cS2 = 'Every scroll feels free in the moment and costs you a day you wanted back. That is where it compounds, one day stacked on the last.';
    } else if (procrast) {
      cS1 = 'Putting it off is the habit Memento breaks, by making showing up the easy default.';
      cS2 = 'A skipped day looks harmless, but stacked up, skipped days are how the years go missing. That is where it compounds, one day stacked on the last.';
    } else if (inconsistent) {
      cS1 = 'Staying consistent is the part that keeps slipping, so Memento makes the streak the thing you protect day to day.';
      cS2 = 'A skipped day looks harmless, but stacked up, skipped days are how the years go missing. That is where it compounds, one day stacked on the last.';
    } else if (lowMot) {
      cS1 = 'Motivation comes and goes, so Memento builds the days you show up even when you do not feel it.';
      cS2 = 'You cannot feel like it every day, and the streak carries you when the feeling does not. That is where it compounds, one day stacked on the last.';
    } else if (fearFail || selfDoubt) {
      cS1 = 'Fear keeps you from starting, so Memento makes showing up small and repeatable until it stops feeling scary.';
      cS2 = 'A skipped day looks harmless, but stacked up, skipped days are how the years go missing. That is where it compounds, one day stacked on the last.';
    } else if (noTime) {
      cS1 = 'Time feels tight, so Memento keeps the daily move small enough to actually fit.';
      cS2 = 'A skipped day looks harmless, but stacked up, skipped days are how the years go missing. That is where it compounds, one day stacked on the last.';
    } else if (fromLost) {
      cS1 = 'Not knowing what to do is what keeps stalling you, so Memento turns showing up into a streak you protect.';
      cS2 = 'A skipped day looks harmless, but stacked up, skipped days are how the years go missing. That is where it compounds, one day stacked on the last.';
    } else {
      cS1 = 'Memento builds the days you show up, even the ones you do not feel like it.';
      cS2 = 'A skipped day looks harmless, but stacked up, skipped days are how the years go missing. That is where it compounds, one day stacked on the last.';
    }
    consistency = cS1 + ' ' + cS2;

    // ====================================================================
    // 6) together  (ONE sentence, stands alone, weakestPillar shapes it)
    // ====================================================================
    var together;
    var aim = towardPhrase ? towardPhrase : (towardUnsure ? 'the thing you came here for' : 'what you want');
    if (weakest === 'clarity') {
      together = 'Once the one thing is clear, the next move and the daily streak turn ' + aim + ' from a wish into work that ships.';
    } else if (weakest === 'consistency') {
      together = 'When the what is sharp, the next move is obvious, and the days actually stack, ' + aim + ' goes from someday to underway.';
    } else if (weakest === 'action') {
      together = 'Clear on what, given the next move on how, held to it day after day, that is when ' + aim + ' stops being a plan and starts getting done.';
    } else {
      together = 'Clarity, the next move, and showing up daily working together is when ' + aim + ' actually gets done.';
    }

    // ====================================================================
    // 7) plus  (ONE line, mostly fixed)
    // ====================================================================
    var plus = 'Around all of it sit the quiet tools, reflections, deep-work sessions, streaks, and reminders of why you started, the things that make showing up easier.';

    return {
      whatYouWant: whatYouWant,
      clarity: clarity,
      why: why,
      action: action,
      consistency: consistency,
      together: together,
      plus: plus
    };
  },


  // The "first win" moment: fade to black, fire confetti, tell them that just
  // showing up honestly IS the first win (proof they want to change). Then it
  // flows into the personalized summary stepper.
  _showFirstWin(stepIndex) {
    if (!this._summaryStarted) { this._summaryStarted = true; try { this.generateSummary(); } catch (e) { this._summaryFailed = true; } }
    this._hideProgressBar();
    const nm = (state.profile && state.profile.name) ? state.profile.name : '';
    this.el.classList.add('welcome-intro--blackout');
    this._setStage([]);
    this.pageWrap.style.alignItems = 'center';
    this.pageWrap.style.justifyContent = 'center';
    this.pageWrap.style.textAlign = 'center';
    this.navEl.style.justifyContent = 'center';
    this.navEl.style.gap = '10px';
    this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner welcome-intro__firstwin">
      <div class="welcome-intro__firstwin-content">
        <div class="welcome-intro__firstwin-eyebrow">Congrats!</div>
        <div class="welcome-intro__firstwin-title">${nm ? 'You actually started and took the first step, ' + esc(nm) : 'You actually started and took the first step'}</div>
        <div class="welcome-intro__firstwin-body">Seriously. Most people scroll past apps like this and keep doing nothing. They spend their entire lives never even thinking about their life. You just sat down and answered honestly about your life. That is the step almost no one takes. Some part of you wants to do more, have more, be more. Never ever lose that flame. Most people lose it way too soon.</div>
        <div class="welcome-intro__firstwin-tap">(tap the screen)</div>
      </div>
    </div>`;
    // Confetti runs on mobile too: it is a bounded burst that self-terminates the
    // moment this screen is left (canvas.isConnected check in _fireConfetti), and
    // it uses fewer particles on mobile (lite mode). A brief celebration is fine;
    // only the forever-running background loops were the crash risk.
    let cv = document.getElementById('welcomeConfetti');
    if (!cv) { cv = document.createElement('canvas'); cv.id = 'welcomeConfetti'; cv.className = 'welcome-intro__confetti'; this.el.insertBefore(cv, this.pageWrap); }
    this._fireConfetti(cv);
    // easter egg: a firework wherever they tap on the celebration screen
    if (this._fwClick) document.removeEventListener('click', this._fwClick, true);
    this._fwClick = (e) => { if (this._confettiBurst) this._confettiBurst(e.clientX, e.clientY); };
    document.addEventListener('click', this._fwClick, true);
    this.navEl.innerHTML = `<button class="welcome-intro__btn welcome-intro__btn--step" id="identityNext" style="flex:1;width:auto;">Continue</button>`;
    document.getElementById('identityNext').addEventListener('click', () => {
      // lift the celebration theme, then show the "what Memento is" philosophy
      // pages, and only after those, the personalized "what it can do for you" page.
      if (this._fwClick) { document.removeEventListener('click', this._fwClick, true); this._fwClick = null; }
      this._confettiVer = (this._confettiVer || 0) + 1;
      const c = document.getElementById('welcomeConfetti'); if (c) c.remove();
      // Skip the legacy swipe-through pillar tutorial (renderPage). After the
      // modern conversation it read as "the old onboarding loading up again"
      // (Malik). Go straight from the Congrats celebration to the personalized
      // "how Memento helps you" page.
      this._showHelpPage(stepIndex);
    });
  },

  // Single "How Memento helps you" page: dark, glassy, blurred (no fireworks),
  // with an animated path stepper. Replaces the old multi-card click-through.
  _showHelpPage(stepIndex) {
    // swap the celebration theme for the dark glass theme; kill the fireworks
    this.el.classList.remove('welcome-intro--blackout');
    this.el.classList.add('welcome-intro--help');
    this._setStage(['purple', 'green', 'cyan'], 'help');   // dark cinematic mix, readable
    this._confettiVer = (this._confettiVer || 0) + 1;
    const oldcf = document.getElementById('welcomeConfetti'); if (oldcf) oldcf.remove();
    this._hideProgressBar();
    this.pageWrap.style.alignItems = 'center';
    this.pageWrap.style.justifyContent = 'flex-start';
    this.pageWrap.style.textAlign = 'left';
    this.navEl.style.justifyContent = 'center';
    this.navEl.style.gap = '10px';

    // top-left beacon glare that fades in like light descending onto the page
    if (!document.getElementById('welcomeBeacon')) {
      const beacon = document.createElement('div');
      beacon.id = 'welcomeBeacon'; beacon.className = 'welcome-intro__beacon'; beacon.setAttribute('aria-hidden', 'true');
      this.el.insertBefore(beacon, this.pageWrap);
    }

    // Summary is built locally and synchronously (no AI), so it is always ready
    // here. If _buildSummary ever threw, the templated fallbacks below cover it.
    if (!this._summary && !this._summaryFailed) this.generateSummary();
    this._onSummaryReady = null;

    const p = state.profile || {};
    const s = this._summary || {};
    const trimSentences = (text, max) => {
      const parts = String(text || '').match(/[^.!?]+[.!?]+/g) || [String(text || '')];
      return parts.slice(0, max).join(' ').trim();
    };
    const introText = trimSentences([this._solutionWantLine(p), this._solutionNeedLine(p)].filter(Boolean).join(' '), 2);
    // The four benefits as a swipeable stepper (clearer than a long list). Each
    // carries its own pillar accent; Clarity leads purple. Drive is the new fourth:
    // the Vivere + Mori engines (something to build toward + your finite time).
    const STEPS = [
      { name: 'Clarity', accent: 'rgba(150,116,255,1)', text: 'The one goal that matters most to you, above everything else. Memento keeps every day pointed at it.' },
      { name: 'Action', accent: 'rgba(232,194,74,1)', text: 'Your goal turned into the single highest-leverage move for today. Memento helps you focus on it and log it, so knowing turns into doing.' },
      { name: 'Consistency', accent: 'rgba(52,211,153,1)', text: 'A visible record of the days you showed up. Real evidence you can trust on the days you doubt yourself.' },
      { name: 'Drive', accent: 'rgba(244,138,120,1)', text: 'Two engines for your energy: something real to build toward, and the weight of your finite time. Remember to live, and remember it ends.' }
    ];
    const slidesHtml = STEPS.map((st, idx) =>
      `<div class="wi-stepper__slide"><div class="wi-stepper__card">
        <div class="wi-stepper__num" style="color:${st.accent}">0${idx + 1}</div>
        <div class="wi-stepper__name" style="color:${st.accent}">${esc(st.name)}</div>
        <div class="wi-stepper__text">${esc(st.text)}</div>
      </div></div>`).join('');
    const dotsHtml = STEPS.map((st, idx) =>
      `<button type="button" class="wi-stepper__dot${idx === 0 ? ' is-active' : ''}" data-step="${idx}" aria-label="${esc(st.name)}"></button>`).join('');

    this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner welcome-intro__help2">
      <h2 class="welcome-intro__help2-title">What we're going to build</h2>
      <p class="welcome-intro__help2-intro">${esc(introText)}</p>
      <div class="wi-stepper">
        <div class="wi-stepper__track" id="wiStepperTrack">${slidesHtml}</div>
        <div class="wi-stepper__dots">${dotsHtml}</div>
      </div>
    </div>`;
    this.navEl.innerHTML = `<button class="welcome-intro__back-btn" id="solutionBack">←</button><button class="welcome-intro__btn welcome-intro__btn--step" id="identityNext" style="flex:1;width:auto;">Continue</button>`;
    document.getElementById('solutionBack').addEventListener('click', () => {
      const inner = this.pageWrap.querySelector('.welcome-intro__page-inner');
      if (inner) inner.classList.add('exit');
      setTimeout(() => {
        this.el.classList.add('welcome-intro--blackout');
        this.el.classList.remove('welcome-intro--help');
        this.pageWrap.style.alignItems = 'center';
        this.pageWrap.style.justifyContent = 'center';
        this.pageWrap.style.textAlign = 'center';
        this.currentPage = this.totalPages - 1;
        this.renderPage(this.currentPage);
      }, 250);
    });
    document.getElementById('identityNext').addEventListener('click', () => {
      this.el.classList.remove('welcome-intro--help');
      this._showIdentityStep(stepIndex + 1);
    });
    // Swipeable stepper: native scroll-snap does the gesture; keep the dots in
    // sync with the swipe, and let a dot tap scroll to its step.
    try {
      const _track = document.getElementById('wiStepperTrack');
      const _dots = [].slice.call(this.pageWrap.querySelectorAll('.wi-stepper__dot'));
      if (_track && _dots.length) {
        const _sync = () => {
          const i = Math.round(_track.scrollLeft / Math.max(1, _track.clientWidth));
          _dots.forEach((d, di) => d.classList.toggle('is-active', di === i));
        };
        _track.addEventListener('scroll', () => { window.requestAnimationFrame(_sync); }, { passive: true });
        _dots.forEach((d, di) => d.addEventListener('click', () => {
          _track.scrollTo({ left: di * _track.clientWidth, behavior: 'smooth' });
        }));
      }
    } catch (e) {}
  },

  // Lightweight confetti / fireworks burst on a canvas. Self-terminates.
  _fireConfetti(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lite = document.body.classList.contains('lite') || document.documentElement.classList.contains('lowfx');
    const colors = ['#9b7eff', '#6d3df0', '#b144ff', '#ffd86b', '#ff5fa2', '#5fd0ff', '#7cffb2'];
    let parts = [];
    const burst = (ox, oy, count, big) => {
      if (parts.length > 260) parts = parts.filter(p => p.life <= p.max);
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = big ? (1.6 + Math.random() * 3.2) : (1 + Math.random() * 2);   // slow drift
        parts.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (big ? 1.4 : 0.8), g: 0.02 + Math.random() * 0.03, size: 4 + Math.random() * 5, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.18, color: colors[(Math.random() * colors.length) | 0], life: 0, max: 150 + Math.random() * 150, shape: Math.random() < 0.5 ? 'r' : 'c' });
      }
    };
    // expose a burst-at-point so taps can set off their own fireworks
    this._confettiBurst = (x, y) => burst(x, y, lite ? 16 : 30, true);
    const ver = (this._confettiVer = (this._confettiVer || 0) + 1);
    burst(W * 0.5, H * 0.42, lite ? 36 : 70, true);   // opening celebration burst
    // ambient fireworks that keep coming in slowly behind the summary
    const schedule = () => {
      if (this._confettiVer !== ver || !canvas.isConnected) return;
      burst(W * (0.18 + Math.random() * 0.64), H * (0.16 + Math.random() * 0.32), lite ? 10 : 20, false);
      setTimeout(schedule, 1500 + Math.random() * 1800);
    };
    setTimeout(schedule, lite ? 2200 : 1400);
    const tick = () => {
      if (this._confettiVer !== ver || !canvas.isConnected) { ctx.clearRect(0, 0, W, H); return; }
      // Perf: freeze the celebration while the tab is backgrounded (invisible),
      // keep one rAF alive so it resumes on return. No-op while visible.
      if (document.hidden) { requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        if (p.life > p.max) continue;
        p.life++;
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.992; p.rot += p.vr;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        if (p.shape === 'r') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size * 0.5, 0, 6.283); ctx.fill(); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);   // ambient: keep running while the theme is up
    };
    requestAnimationFrame(tick);
  },

  // The personalized summary stepper. Card 0 is instant (covers AI latency);
  // cards 1+ use the AI text, show a loading beat while pending, fall back to
  // templated copy if the AI failed.
  _showSummaryCard(stepIndex, cardIdx) {
    const p = state.profile || {};
    const nm = p.name ? p.name : '';
    const phrase = (v) => this._phraseList(v);
    if (cardIdx === 0 && !this._summaryStarted) { this._summaryStarted = true; try { this.generateSummary(); } catch (e) { this._summaryFailed = true; } }

    const whyFall = p.costOfInaction
      ? `When it gets hard, you remember the cost of staying here: ${phrase(p.costOfInaction)}. That is the fuel that keeps you going.`
      : p.momentumWin
        ? `You are already moving, so the why is the upside: ${phrase(p.momentumWin)}. That is the pull that keeps the momentum going.`
        : 'Memento keeps your reason in front of you, so you are not leaning on motivation that comes and goes.';
    const whatFall = p.runningToward
      ? `You said you want to improve ${phrase(p.runningToward)}.${p.runningFrom ? ' And that ' + phrase(p.runningFrom) + ' keeps getting in the way.' : ''} That is enough to start.`
      : 'You showed up. That is already more than most people manage.';
    const cards = [
      { eyebrow: 'WHAT YOU WANT', title: nm ? `Here's what we heard, ${esc(nm)}` : "Here's what we heard", aiKey: 'whatYouWant', instant: true, fallback: whatFall },
      { eyebrow: 'THE WHAT', title: 'Get clear on the one thing', aiKey: 'clarity', fallback: 'You get dead clear on the one thing that actually matters. Most people stay busy on the wrong stuff and call it progress.' },
      { eyebrow: 'THE WHY', title: 'Anchor your why', aiKey: 'why', fallback: whyFall },
      { eyebrow: 'THE HOW', title: 'Always know the next move', aiKey: 'action', fallback: 'Every day Memento hands you the single move that matters most. No more staring at a list guessing where to start.' },
      { eyebrow: 'THE CONSISTENCY', title: 'Keep showing up', aiKey: 'consistency', fallback: 'This is where it compounds. You show up, it stacks, and the thing you keep putting off slowly becomes inevitable.' },
      { eyebrow: 'AND MORE', title: 'The tools around you', aiKey: 'plus', fallback: 'Reflections, deep-work sessions, streaks, and reminders of why you started. Quiet tools that make showing up easier.' }
    ];
    cardIdx = Math.max(0, Math.min(cardIdx, cards.length - 1));
    this._sumCard = cardIdx;
    const card = cards[cardIdx];
    const isLast = cardIdx >= cards.length - 1;

    // Local summary is always populated, so cards use the personalized line;
    // the templated fallback is only a defensive net if _buildSummary threw.
    let body;
    if (this._summary && this._summary[card.aiKey]) body = esc(this._summary[card.aiKey]);
    else body = esc(card.fallback);

    this._onSummaryReady = null;
    this._hideProgressBar();

    const sparkle = '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="vpSumStar" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#efe9ff"/><stop offset="55%" stop-color="#9b7eff"/><stop offset="100%" stop-color="#6d3df0"/></radialGradient></defs><path d="M32 3 C34 22 42 30 61 32 C42 34 34 42 32 61 C30 42 22 34 3 32 C22 30 30 22 32 3 Z" fill="url(#vpSumStar)"/></svg>';

    this.pageWrap.style.alignItems = 'center';
    this.pageWrap.style.textAlign = 'left';
    this.navEl.style.justifyContent = 'center';
    this.navEl.style.gap = '10px';
    this.pageWrap.innerHTML = `<div class="welcome-intro__page-inner welcome-intro__sumcard">
      <div class="welcome-intro__sumstar">${sparkle}</div>
      <div class="welcome-intro__reflect-eyebrow">${card.eyebrow}</div>
      <div class="welcome-intro__sumcard-title">${card.title}</div>
      <div class="welcome-intro__sumcard-body">${body}</div>
    </div>`;
    const navBack = `<button class="welcome-intro__back-btn" id="identityBack">←</button>`;
    this.navEl.innerHTML = navBack + `<button class="welcome-intro__btn welcome-intro__btn--step" id="identityNext" style="flex:1;width:auto;">Continue</button>`;

    const fade = (fn) => { const inner = this.pageWrap.querySelector('.welcome-intro__page-inner'); if (inner) inner.classList.add('exit'); setTimeout(fn, 250); };
    document.getElementById('identityNext').addEventListener('click', () => {
      // Clarity is the free first win: onboarding ends straight at the dashboard
      // (Clarity CTA), no paywall here. (The paywall relocates to after the first
      // Clarity win in Build 2; its render code is kept below, just not reached.)
      if (isLast) this._finishWithName();
      else fade(() => this._showSummaryCard(stepIndex, cardIdx + 1));
    });
    const bb = document.getElementById('identityBack');
    if (bb) bb.addEventListener('click', () => {
      if (cardIdx > 0) fade(() => this._showSummaryCard(stepIndex, cardIdx - 1));
      else this._showIdentityStep(stepIndex - 1);
    });
  },

  _finishWithName(name) {
    // The look is picked here, as the final step of onboarding, right before the
    // blank Memento is revealed, so the very first card they see already wears it.
    // Apply runs live + persists inside the picker (applyPrefs), so when the reveal
    // mounts the dashboard it is already styled. NOT gated on appearanceChosen:
    // _finishWithName only runs when someone completes onboarding, so the style
    // page should show every time they finish (incl. re-onboarding), not just the
    // very first time. (The settings "change look" trigger is separate.)
    if (typeof AppearancePicker !== 'undefined' && AppearancePicker.open) {
      AppearancePicker.open(() => this._revealAfterOnboarding(name));
      return;
    }
    this._revealAfterOnboarding(name);
  },

  _revealAfterOnboarding(name) {
    // tear down the celebration / help themes + fireworks if still up
    if (this.el) { this.el.classList.remove('welcome-intro--blackout', 'welcome-intro--help'); this._setStage([]); }
    this._confettiVer = (this._confettiVer || 0) + 1;
    const _cf = document.getElementById('welcomeConfetti'); if (_cf) _cf.remove();
    const _bc = document.getElementById('welcomeBeacon'); if (_bc) _bc.remove();
    if (this._fwClick) { document.removeEventListener('click', this._fwClick, true); this._fwClick = null; }
    if (name) state.profile.name = name;
    state.meta.welcomeSeen = true;
    state.profile.onboarded = true;
    state.profile.onboardedAt = Date.now();
    persistNow();
    renderAll();

    // Show the app blurred behind a welcome overlay
    const app = document.getElementById('app');
    app.style.transition = 'none';
    app.style.opacity = '1';
    app.style.filter = 'blur(26px) brightness(0.25)';
    app.style.transform = 'scale(1.05)';
    void app.offsetHeight;

    // Fade out the welcome intro
    this.el.classList.remove('open');
    this.el.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Create welcome overlay
    const overlay = document.createElement('div');
    overlay.id = 'welcomeOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity 0.6s ease;';
    overlay.innerHTML = `
      <div style="font-size:1rem;color:rgba(var(--ink),0.4);font-weight:500;margin-bottom:8px;">Welcome to</div>
      <div style="font-size:3rem;font-weight:700;color:rgba(var(--ink),0.95);letter-spacing:-0.03em;">Memento</div>
    `;
    document.body.appendChild(overlay);

    // Fade in the welcome text
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // After 2.5s, fade out welcome and unblur the app
    setTimeout(() => {
      overlay.style.transition = 'opacity 0.8s ease';
      overlay.style.opacity = '0';
      app.style.transition = 'filter 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
      app.style.filter = '';
      app.style.transform = '';

      TabBar.show();
      document.getElementById('ambientBg')?.classList.add('loaded');
      // Dev: keep the persona switcher bar available on the dashboard even
      // outside ?demo= mode, so it survives Exit + re-onboarding.
      try { if (typeof DEMO_MODE !== 'undefined' && !DEMO_MODE) _injectDemoBar(null); } catch (e) {}

      setTimeout(() => {
        overlay.remove();
        app.style.transition = '';
        app.style.filter = '';
      }, 1200);
    }, 2500);
  }
};

/* ============================================
   TAB BAR CONTROLLER
   ============================================ */
// =========================================================
// Desktop sidebar controller. Owns nav clicks, collapse state, profile
// click-through, live state blocks (today's action + streak), and
// relocation of the Cheat Code Bar from the dashboard into the sidebar at
// desktop widths. Mobile users never see any of this; the existing TabBar
// at the bottom of the screen drives navigation there.
// =========================================================
const Sidebar = {
  el: null,
  navItems: [],

  init() {
    this.el = document.getElementById('appSidebar');
    if (!this.el) return;
    document.body.classList.add('sidebar-active');

    // Drawer model on desktop: the sidebar rests collapsed (off-screen) and is
    // opened on demand via the persistent top-left menu button, so that button
    // stays a constant fixture. Mobile uses its own drawer and is never
    // collapsed here. Stay in sync if the window crosses the breakpoint.
    const _isDesktopWidth = () => { try { return !!(window.matchMedia && window.matchMedia('(min-width: 860px)').matches); } catch (_) { return true; } };
    if (_isDesktopWidth()) document.body.classList.add('sidebar-collapsed');
    window.addEventListener('resize', () => {
      if (document.body.classList.contains('menu-peek')) return;
      document.body.classList.toggle('sidebar-collapsed', _isDesktopWidth());
    });

    // The in-sidebar collapse arrow simply closes the open drawer.
    const collapseBtn = document.getElementById('sidebarCollapse');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        try { closePeek(); }
        catch (e) { document.body.classList.remove('menu-peek'); document.body.classList.add('sidebar-collapsed'); }
      });
    }
    // (The persistent top-left menu/reveal button is wired further down, after
    // the menu-peek overlay helpers are defined.)

    // Brand click returns to home tab.
    const brand = document.getElementById('sidebarBrand');
    if (brand) {
      brand.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof TabBar !== 'undefined') TabBar.switchTo('home');
        this.setActiveTab('home');
      });
    }

    // --- Mobile drawer: top-left header icon opens this sidebar as an overlay.
    // (On desktop the header is hidden, so this only affects phones/tablets.)
    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-menu-backdrop';
    document.body.appendChild(backdrop);
    // On mobile the sidebar is an off-screen drawer; when closed it must be
    // removed from the tab order / a11y tree (it was still focusable off-screen).
    // Desktop (where the sidebar is always visible) is never made inert.
    const _SB = document.getElementById('appSidebar');
    const _isDrawer = () => { try { return window.matchMedia('(max-width: 859px)').matches; } catch (e) { return false; } };
    const _syncDrawerA11y = (open) => { if (!_SB) return; const hide = _isDrawer() && !open; try { _SB.inert = hide; } catch (e) {} _SB.setAttribute('aria-hidden', hide ? 'true' : 'false'); };
    const openMenu  = () => { document.body.classList.add('mobile-menu-open'); _syncDrawerA11y(true); };
    const closeMenu = () => { document.body.classList.remove('mobile-menu-open'); _syncDrawerA11y(false); };
    _syncDrawerA11y(false);
    try { window.addEventListener('resize', () => _syncDrawerA11y(document.body.classList.contains('mobile-menu-open'))); } catch (e) {}
    // --- Persistent menu-peek: open the sidebar from ANY view (including the
    // full-screen Action experience) by floating it, plus a tap-away backdrop,
    // ABOVE the overlay. body.menu-peek raises the sidebar (z-index 1005) and
    // its backdrop (z-index 1004) above the overlay (~z-index 1001).
    const peekBackdrop = document.createElement('div');
    peekBackdrop.className = 'menu-peek-backdrop';
    document.body.appendChild(peekBackdrop);
    // Is a full-screen overlay currently on top? (Action / clarity / intro / sheet.)
    const _overlayOpen = () => {
      try { return !!document.querySelector('.action-exp.open, .clarity-exp.open, .welcome-intro.open, .sheet.open'); }
      catch (e) { return false; }
    };
    // Peeking must always show the FULL sidebar, never the collapsed icon-rail.
    // Remember the collapsed state, expand for the peek, and restore on close,
    // so menu-peek and sidebar-collapsed never apply at the same time.
    let _peekWasCollapsed = false;
    let _peekCloseTimer = null;
    const openPeek  = () => {
      // Cancel any in-flight close so re-opening mid-slide snaps back cleanly.
      if (_peekCloseTimer) { clearTimeout(_peekCloseTimer); _peekCloseTimer = null; }
      document.body.classList.remove('menu-peek-closing');
      _peekWasCollapsed = document.body.classList.contains('sidebar-collapsed');
      if (_peekWasCollapsed) document.body.classList.remove('sidebar-collapsed');
      document.body.classList.add('menu-peek');
      try { if (state.ui) { state.ui.menuPinned = true; persistNow(); } localStorage.setItem('memento_menu_pinned', '1'); } catch (e) {}
      if (_SB) { try { _SB.inert = false; } catch (e) {} _SB.setAttribute('aria-hidden', 'false'); }
    };
    const closePeek = () => {
      if (!document.body.classList.contains('menu-peek')) return;
      try { if (state.ui && state.ui.menuPinned) { state.ui.menuPinned = false; persistNow(); } localStorage.removeItem('memento_menu_pinned'); } catch (e) {}
      // Slide the sidebar back out while it stays elevated (menu-peek-closing),
      // then finalize the collapsed state once the transition completes. This
      // mirrors the open animation instead of popping away instantly.
      document.body.classList.add('menu-peek-closing');
      document.body.classList.remove('menu-peek');
      // Restore the collapsed state NOW so the app content slides back in
      // parallel with the sidebar's exit. It used to wait for the 380ms
      // timeout, leaving the content stranded after the bar was already gone.
      // menu-peek-closing's !important transform keeps the exit animation.
      if (_peekWasCollapsed) { document.body.classList.add('sidebar-collapsed'); _peekWasCollapsed = false; }
      if (_peekCloseTimer) clearTimeout(_peekCloseTimer);
      _peekCloseTimer = setTimeout(() => {
        document.body.classList.remove('menu-peek-closing');
        _syncDrawerA11y(document.body.classList.contains('mobile-menu-open'));
        _peekCloseTimer = null;
      }, 380);
    };

    // Refresh-survival: re-pin the menu if it was pinned when the page died.
    try {
      if (((state.ui && state.ui.menuPinned) || localStorage.getItem('memento_menu_pinned')) && _isDesktopWidth()) setTimeout(openPeek, 60);
    } catch (e) {}

    // The persistent top-left button (reuses #sidebarReveal). On the plain
    // dashboard (no overlay) it keeps the original un-collapse behavior; over an
    // overlay (or in mobile drawer mode) it opens the sidebar as a peek layer.
    const revealBtn = document.getElementById('sidebarReveal');
    if (revealBtn) {
      revealBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Drawer model: always open the menu as a drawer/peek, from any view
        // (dashboard included), so the button behaves identically everywhere.
        openPeek();
      });
    }

    // Mobile: tapping the top-left Memento brand lockup also opens the drawer
    // (it is the obvious thing to tap up there). Make it a real control.
    const brandLockup = document.querySelector('.dash-header__brand');
    if (brandLockup) {
      brandLockup.setAttribute('role', 'button');
      brandLockup.setAttribute('tabindex', '0');
      brandLockup.setAttribute('aria-label', 'Open menu');
      brandLockup.removeAttribute('aria-hidden');
      const openFromBrand = (e) => { if (!_isDrawer()) return; if (e) e.preventDefault(); openPeek(); };
      brandLockup.addEventListener('click', openFromBrand);
      brandLockup.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openFromBrand(e); });
    }

    // --- iOS-like drag-to-close for the mobile drawer ---------------------------
    // Grab the open drawer and slide it left with your finger; release past a
    // threshold (or with a quick flick) to close, otherwise it snaps back. The
    // menu-peek CSS sets transform with !important, so the live drag must also
    // set it !important to win, then clear it on release to hand control back.
    (function bindDrawerDragClose() {
      if (!_SB) return;
      let startX = 0, startY = 0, dx = 0, w = 320, t0 = 0;
      let active = false, decided = false, horizontal = false;
      const isOpenDrawer = () => _isDrawer() && document.body.classList.contains('menu-peek');
      const setX = (px) => {
        _SB.style.setProperty('transform', 'translateX(' + px + 'px)', 'important');
        if (peekBackdrop) peekBackdrop.style.opacity = String(Math.max(0, 1 + px / w));
      };
      const clearInline = () => {
        _SB.style.removeProperty('transform');
        _SB.style.removeProperty('transition');
        if (peekBackdrop) peekBackdrop.style.opacity = '';
      };
      _SB.addEventListener('touchstart', (e) => {
        if (!isOpenDrawer() || !e.touches || e.touches.length !== 1) return;
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY; dx = 0; t0 = e.timeStamp || 0;
        w = _SB.getBoundingClientRect().width || 320;
        active = true; decided = false; horizontal = false;
      }, { passive: true });
      _SB.addEventListener('touchmove', (e) => {
        if (!active) return;
        const t = e.touches[0];
        const mx = t.clientX - startX, my = t.clientY - startY;
        if (!decided) {
          if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
          // Vertical intent -> let the drawer scroll; bail out of the drag.
          if (Math.abs(my) > Math.abs(mx)) { active = false; return; }
          decided = true; horizontal = true;
          _SB.style.setProperty('transition', 'none', 'important');
        }
        dx = Math.min(0, mx); // leftward only
        setX(dx);
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      const onEnd = (e) => {
        if (!active) return;
        active = false;
        if (!horizontal) { clearInline(); return; }
        const dt = ((e && e.timeStamp) || 0) - t0;
        const vel = dt > 0 ? Math.abs(dx) / dt : 0; // px per ms
        clearInline(); // restore CSS-driven transform + transition
        if (Math.abs(dx) > w * 0.32 || vel > 0.5) closePeek();
        // else: clearing the inline transform snaps it back to translateX(0).
      };
      _SB.addEventListener('touchend', onEnd, { passive: true });
      _SB.addEventListener('touchcancel', onEnd, { passive: true });
    })();

    // On mobile the drawer is a real drawer: tapping the dimmed area outside it
    // closes it (desktop keeps the stationary peek, where outside taps do not
    // dismiss). The CSS enables pointer-events on the peek backdrop at <=859px.
    if (peekBackdrop) {
      peekBackdrop.addEventListener('click', () => { if (_isDrawer() && document.body.classList.contains('menu-peek')) closePeek(); });
    }

    // Keyboard shortcut: press T (or Option+T) to toggle the left menu sidebar
    // from any view. Guarded so it never fires while typing, and Cmd/Ctrl+T
    // (new browser tab) is left untouched.
    const _vInTextField = (el) => {
      if (!el) return false;
      const tag = (el.tagName || '').toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.code !== 'KeyT' && e.key !== 't' && e.key !== 'T') return;
      if (_vInTextField(document.activeElement)) return;
      e.preventDefault();
      if (document.body.classList.contains('menu-peek')) closePeek(); else openPeek();
    });

    // Profile photo on any circular element: paints the stored IndexedDB
    // image as a cover background, or falls back to the colored initial.
    // Shared by the sidebar chip and the Settings profile header.
    window.applyProfileAvatar = function (el, fallbackInitial) {
      if (!el) return;
      const id = state.profile && state.profile.avatarId;
      if (id && typeof idbGetBlobURL === 'function') {
        idbGetBlobURL(id).then((url) => {
          if (!el.isConnected) return;
          if (url) {
            el.style.backgroundImage = 'url("' + url + '")';
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.textContent = '';
          } else {
            el.style.backgroundImage = '';
            el.textContent = fallbackInitial || '';
          }
        }).catch(() => {});
        return;
      }
      el.style.backgroundImage = '';
      el.textContent = fallbackInitial || '';
    };

    // Spotlight: a centered command palette. Searches all content (reusing the
    // search index) plus runnable quick actions, with keyboard navigation.
    window.Spotlight = {
      _open: false, _sel: 0, _filtered: [],
      _ensureStyles() {
        if (document.getElementById('spotStyles')) return;
        const s = document.createElement('style'); s.id = 'spotStyles';
        s.textContent = '.spot-backdrop{position:fixed;inset:0;z-index:6000;display:flex;align-items:flex-start;justify-content:center;padding:13vh 16px 16px;background:rgba(4,5,9,0.45);opacity:0;-webkit-backdrop-filter:blur(calc(34px * var(--bx, 1))) saturate(112%);backdrop-filter:blur(calc(34px * var(--bx, 1))) saturate(112%);transition:opacity 0.2s var(--ease-out,cubic-bezier(0.16,1,0.3,1));}'
          + '.spot{width:100%;max-width:590px;background:var(--surface-1-solid);border:none;border-radius:calc(8px * var(--rx, 1));box-shadow:var(--glass-highlight),0 24px 90px rgba(0,0,0,0.45);overflow:hidden;transform:translateY(-10px) scale(0.985);transition:transform 0.22s var(--ease-out,cubic-bezier(0.16,1,0.3,1)),opacity 0.18s ease;opacity:0;display:flex;flex-direction:column;max-height:70vh;-webkit-backdrop-filter:blur(calc(60px * var(--bx, 1))) saturate(140%);backdrop-filter:blur(calc(60px * var(--bx, 1))) saturate(140%);}'
          + '.spot-backdrop.is-on{opacity:1;}'
          + '.spot-backdrop.is-on .spot{transform:none;opacity:1;}'
          + '.spot__bar{display:flex;align-items:center;gap:11px;padding:15px 16px;background:var(--kfill-03);}'
          + '.spot__bar svg{width:18px;height:18px;color:var(--text-mid);flex:none;}'
          + '.spot__input{flex:1;min-width:0;font:inherit;font-size:1.05rem;color:var(--text-hi);background:transparent;border:0;outline:none;}'
          + '.spot__input::placeholder{color:var(--text-3);}'
          + '.spot__list{overflow-y:auto;padding:0;-webkit-overflow-scrolling:touch;}'
          + '.spot__list:not(:empty){padding:8px;border-top:1px solid var(--hairline);}'
          + '.spot__group{font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-lo);padding:10px 8px 5px;}'
          + '.spot-item{display:flex;align-items:center;gap:11px;width:100%;text-align:left;border:0;background:transparent;border-radius:calc(8px * var(--rx, 1));padding:10px 11px;cursor:pointer;font:inherit;color:var(--text-hi);}'
          + '.spot-item--sel{background:rgba(var(--accent-rgb),0.16);box-shadow:none;}'
          + '.spot-item__tag{flex:none;width:18px;height:18px;display:flex;align-items:center;justify-content:center;color:var(--text-3);}'
          + '.spot-item__tag svg{width:15px;height:15px;}'
          + '.spot-item__body{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;}'
          + '.spot-item__title{font-size:0.9rem;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
          + '.spot-item__sub{font-size:0.72rem;color:var(--text-lo);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
          + '.spot-item__kbd{flex:none;font-size:0.6rem;color:var(--text-lo);}'
          + '.spot__empty{padding:22px 12px;color:var(--text-2);font-size:0.88rem;}'
          + 'body.calm-motion .spot-backdrop,body.calm-motion .spot{transition:none;}'
          + '@media (prefers-reduced-motion:reduce){.spot-backdrop,.spot{transition:none;}}';
        document.head.appendChild(s);
      },
      _icon(name) {
        const I = {
          go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
          cmd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
          search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
        };
        return I[name] || I.go;
      },
      _commands() {
        const cmd = (title, sub, run, alias) => ({ kind: 'cmd', group: 'Quick actions', title: title, sub: sub, run: run, alias: alias || '' });
        // Launch straight there: the destination opens immediately and the
        // palette fades out ON TOP of it, so the page behind never flashes.
        const openExp = (fn) => { try { fn(); } catch (_) {} this.close(); };
        // Locked modules stay out of the palette: the unlock ladder is the
        // product's pacing, and a palette must never leak ahead of it.
        const unlocked = (k) => { try { return typeof isModuleUnlocked !== 'function' || isModuleUnlocked(k); } catch (_) { return true; } };
        const out = [];
        const add = (gateKey, item) => { if (!gateKey || unlocked(gateKey)) out.push(item); };
        add('streak', cmd('Mark today complete', 'Consistency', () => { try { const t = getTodayISO(); if (!state.streak.history.includes(t)) { state.streak.history.push(t); recalculateStreak(); persistNow(); renderAll(); try { maybeShowMilestoneBanner(); } catch (_) {} } } catch (_) {} }));
        add('checkin', cmd('Check in', 'How did today go', () => openExp(() => Sheet.open('checkin'))));
        add('reflection', cmd('New note', 'Notes', () => { if (state.reflection) state.reflection.activeNoteId = null; openExp(() => Sheet.open('reflection')); }));
        add(null, cmd('Start a deep work block', 'Deep Work', () => openExp(() => Sheet.open('deepwork'))));
        add(null, cmd('Capture a thought', 'Saves to Notes', () => { this.close(); setTimeout(() => { try { if (typeof showQuickCapture === 'function') showQuickCapture(); } catch (_) {} }, 120); }));
        add(null, cmd('Open Updates', 'Grace days, records, your weekly card', () => openExp(() => Sheet.open('inbox'))));
        add(null, cmd('Open Clarity', 'Your goal', () => openExp(() => { if (typeof ClarityExperience !== 'undefined') ClarityExperience.open(); })));
        add('action', cmd('Open Action', 'Your plan', () => openExp(() => { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); })));
        add('streak', cmd('Open Consistency', 'Your streak', () => openExp(() => Sheet.open('streak'))));
        add(null, cmd('Open Memento Mori', 'Time left', () => openExp(() => Sheet.open('mori'))));
        add('vivere', cmd('Open Memento Vivere', 'Vision board', () => openExp(() => Sheet.open('vivere'))));
        add(null, cmd('Open Energy', 'Your fuel', () => openExp(() => Sheet.open('lifestats'))));
        add('action', cmd('Open Projects', 'Milestones toward the goal', () => openExp(() => Sheet.open('projects'))));
        add(null, cmd('Plan time blocks', 'Shape the day', () => openExp(() => Sheet.open('timeblocks'))));
        add(null, cmd('Open Settings', 'Profile, preferences, data', () => openExp(() => {
          if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo('profile');
        })));
        add(null, cmd((state.prefs && state.prefs.theme === 'light') ? 'Switch to dark mode' : 'Switch to light mode', 'Appearance', () => {
          try {
            const toLight = !(state.prefs && state.prefs.theme === 'light');
            if (typeof applyThemeChange === 'function') applyThemeChange(() => { state.prefs.theme = toLight ? 'light' : 'dark'; });
            else { state.prefs.theme = toLight ? 'light' : 'dark'; if (typeof applyPrefs === 'function') applyPrefs(); }
            persistNow();
          } catch (_) {}
          this.close();
        }));
        add(null, cmd('Download a backup', 'Your data, one file', () => { try { exportMementoData(); } catch (_) {} this.close(); }));
        if (window.CloudSync && CloudSync.syncNow) {
          add(null, cmd('Sync now', 'Cloud', () => { try { CloudSync.syncNow(); } catch (_) {} this.close(); }));
        }
        out.push(cmd('Contact Support', 'Message Malik directly', () => openExp(() => {
            // 'profile' is a TabBar panel, not a sheet; Sheet.open('profile')
            // opened an empty shell (verified in preview).
            if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo('profile');
            setTimeout(() => {
              try {
                const el = document.getElementById('supportSection');
                if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
              } catch (_) {}
            }, 120);
          })));
        return out;
      },
      _items() {
        let content = [];
        try { content = (SHEET_TEMPLATES.search._index() || []).map(it => Object.assign({ kind: 'go', group: (SHEET_TEMPLATES.search.TYPES[it.type] || {}).label || 'Result' }, it)); } catch (_) {}
        return this._commands().concat(content);
      },
      // Hidden synonyms per command title so natural words land ('set' ->
      // Settings, 'calendar' -> planner, 'death' -> Mori...). Searched, never shown.
      _ALIASES: {
        'mark today complete': 'done log day streak complete',
        'check in': 'checkin daily review evening how did today go',
        'new note': 'write journal entry compose reflection',
        'start a deep work block': 'focus timer session pomodoro concentrate flow',
        'capture a thought': 'quick capture idea jot scratch',
        'open updates': 'inbox notifications news weekly card',
        'open clarity': 'purpose mission direction neutron star why goal',
        'open action': 'today task plan path do next step',
        'open consistency': 'streak habits heatmap chain daily',
        'open memento mori': 'death weeks life countdown mortality time left',
        'open memento vivere': 'memories moodboard canvas photos jar alive board',
        'open energy': 'lifestats sleep stats health body fuel',
        'open projects': 'milestones goals roadmap',
        'plan time blocks': 'planner calendar schedule timebox agenda shape day',
        'open settings': 'set preferences profile account theme appearance options config',
        'switch to dark mode': 'theme appearance toggle night',
        'switch to light mode': 'theme appearance toggle day',
        'download a backup': 'export save data json file',
        'sync now': 'cloud upload refresh',
        'contact support': 'help feedback bug question email malik'
      },
      // Subsequence match: every query char appears in order ('sng' hits
      // 'settings'). Returns a looseness penalty, or -1 for no match.
      _fuzzy(hay, q) {
        let hi = 0, gaps = 0;
        for (let qi = 0; qi < q.length; qi++) {
          const found = hay.indexOf(q[qi], hi);
          if (found === -1) return -1;
          gaps += found - hi; hi = found + 1;
        }
        return gaps;
      },
      _filter(q) {
        const ql = (q || '').trim().toLowerCase();
        // Empty query = empty palette (Malik): results appear as you type.
        if (!ql) return [];
        const tokens = ql.split(/\s+/).filter(Boolean);
        const all = this._items();
        const scored = [];
        all.forEach(it => {
          const alias = (it.kind === 'cmd' && this._ALIASES[String(it.title).toLowerCase()]) || it.alias || '';
          const hay = (String(it.title) + ' ' + String(it.sub || '') + ' ' + String(it.group || '') + ' ' + alias).toLowerCase();
          // Every token must land somewhere: substring first (scored by how
          // early + whether it starts a word), fuzzy subsequence as fallback.
          let score = 0;
          for (const t of tokens) {
            const i = hay.indexOf(t);
            if (i !== -1) {
              const wordStart = i === 0 || hay[i - 1] === ' ';
              score += (wordStart ? 0 : 40) + Math.min(i, 30);
            } else {
              const g = this._fuzzy(hay, t);
              if (g === -1) return;
              score += 200 + Math.min(g, 200);
            }
          }
          scored.push({ it: it, score: (it.kind === 'cmd' ? 0 : 100) + score });
        });
        scored.sort((a, b) => a.score - b.score);
        return scored.slice(0, 40).map(s => s.it);
      },
      open() {
        if (this._open) return;
        // Easter egg: before Clarity is done there is nothing to search FOR.
        // Asking for search just makes the Start button glow, a wordless
        // "this first".
        try {
          if (!(state.clarity && state.clarity.completed)) {
            const btn = document.querySelector('.cc-primary[data-cc-action="clarity"]');
            if (btn) {
              btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
              btn.classList.remove('start-nudge');
              void btn.offsetWidth;
              btn.classList.add('start-nudge');
              btn.addEventListener('animationend', () => btn.classList.remove('start-nudge'), { once: true });
              return;
            }
          }
        } catch (_) {}
        this._ensureStyles();
        const bd = document.createElement('div'); bd.className = 'spot-backdrop'; bd.id = 'spotBackdrop';
        bd.innerHTML = '<div class="spot" role="dialog" aria-modal="true" aria-label="Spotlight search">'
          + '<div class="spot__bar">' + this._icon('search') + '<input id="spotInput" class="spot__input" type="text" placeholder="Search or run a command" autocomplete="off" autocapitalize="off" spellcheck="false"></div>'
          + '<div class="spot__list" id="spotList"></div>'
          + '</div>';
        document.body.appendChild(bd);
        this._open = true; this._sel = 0;
        // Remember what was focused so close() can restore it (modal a11y).
        try { this._restoreFocus = document.activeElement; } catch (_) { this._restoreFocus = null; }
        const input = bd.querySelector('#spotInput');
        this._renderList('');
        requestAnimationFrame(() => { bd.classList.add('is-on'); try { input.focus(); } catch (_) {} });
        input.addEventListener('input', () => { this._sel = 0; this._renderList(input.value); });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); this._move(1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); this._move(-1); }
          else if (e.key === 'Tab') { e.preventDefault(); this._move(e.shiftKey ? -1 : 1); }
          else if (e.key === 'Enter') { e.preventDefault(); this._run(this._filtered[this._sel]); }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); }
        });
        bd.addEventListener('click', (e) => {
          if (e.target === bd) { this.close(); return; }
          const item = e.target.closest('.spot-item'); if (item) this._run(this._filtered[parseInt(item.getAttribute('data-idx'), 10)]);
        });
      },
      _renderList(q) {
        const list = document.getElementById('spotList'); if (!list) return;
        const emptyQuery = !(q || '').trim();
        const items = this._filter(q); this._filtered = items;
        if (emptyQuery) { list.innerHTML = ''; return; }
        if (this._sel >= items.length) this._sel = Math.max(0, items.length - 1);
        if (!items.length) { list.innerHTML = '<div class="spot__empty">No matches. Try a different word.</div>'; return; }
        let h = '', lastGroup = null;
        items.forEach((it, idx) => {
          if (it.group !== lastGroup) { h += '<div class="spot__group">' + esc(it.group || '') + '</div>'; lastGroup = it.group; }
          h += '<button class="spot-item' + (idx === this._sel ? ' spot-item--sel' : '') + '" data-idx="' + idx + '">'
            + '<span class="spot-item__tag">' + this._icon(it.kind) + '</span>'
            + '<span class="spot-item__body"><span class="spot-item__title">' + esc(String(it.title).slice(0, 120)) + '</span>' + (it.sub ? '<span class="spot-item__sub">' + esc(String(it.sub).slice(0, 80)) + '</span>' : '') + '</span>'
            + '</button>';
        });
        list.innerHTML = h;
      },
      _move(d) {
        if (!this._filtered.length) return;
        this._sel = (this._sel + d + this._filtered.length) % this._filtered.length;
        const list = document.getElementById('spotList'); if (!list) return;
        list.querySelectorAll('.spot-item').forEach(el => el.classList.toggle('spot-item--sel', parseInt(el.getAttribute('data-idx'), 10) === this._sel));
        const sel = list.querySelector('.spot-item--sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
      },
      _run(it) {
        if (!it) return;
        this._navigating = true; // do not restore focus to the trigger; we are navigating away
        // Destination first, close second: the palette's own fade masks the
        // module's entrance instead of revealing the page underneath.
        try { if (it.kind === 'cmd') it.run(); else SHEET_TEMPLATES.search._go(it); } catch (_) {}
        this.close();
      },
      close() {
        const bd = document.getElementById('spotBackdrop'); if (!bd) { this._open = false; return; }
        bd.classList.remove('is-on');
        setTimeout(() => { try { bd.remove(); } catch (_) {} }, 230);
        this._open = false;
        // Restore focus to whatever opened Spotlight, unless we are navigating into a module.
        if (!this._navigating) { try { if (this._restoreFocus && this._restoreFocus.focus) this._restoreFocus.focus(); } catch (_) {} }
        this._restoreFocus = null; this._navigating = false;
      }
    };

    // Spotify "Now Playing" pill (PKCE OAuth, polls currently-playing). Self-
    // contained: hidden until a Client ID is set in Settings; no secrets stored.
    window.SpotifyNP = window.SpotifyNP || (function () {
      var POLL_MS = 20000, pollT = null;
      var SCOPES = 'user-read-currently-playing user-read-playback-state';
      function cfg() { try { return state.spotify || {}; } catch (e) { return {}; } }
      function redirectUri() { return location.origin + location.pathname; }
      function save() { try { persistNow(); } catch (e) {} }
      function rand(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a).map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join(''); }
      function b64url(buf) { return btoa(String.fromCharCode.apply(null, new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
      function challenge(v) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(b64url); }
      function connect() {
        var c = cfg(); if (!c.clientId) { try { Sheet.open('profile'); } catch (e) {} return; }
        var verifier = rand(32); sessionStorage.setItem('sp_verifier', verifier);
        challenge(verifier).then(function (ch) {
          location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
            client_id: c.clientId, response_type: 'code', redirect_uri: redirectUri(),
            code_challenge_method: 'S256', code_challenge: ch, scope: SCOPES
          });
        });
      }
      function storeTokens(d) {
        if (!state.spotify) state.spotify = {};
        var t = state.spotify.tokens || {};
        state.spotify.tokens = { access: d.access_token, refresh: d.refresh_token || t.refresh, expires: Date.now() + (d.expires_in || 3600) * 1000 };
        save();
      }
      function exchange(code) {
        var c = cfg(), verifier = sessionStorage.getItem('sp_verifier'); if (!verifier) return Promise.resolve();
        return fetch('https://accounts.spotify.com/api/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: c.clientId, grant_type: 'authorization_code', code: code, redirect_uri: redirectUri(), code_verifier: verifier })
        }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d) storeTokens(d); sessionStorage.removeItem('sp_verifier'); });
      }
      function refresh() {
        var c = cfg(), t = c.tokens; if (!t || !t.refresh) return Promise.resolve(false);
        return fetch('https://accounts.spotify.com/api/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: c.clientId, grant_type: 'refresh_token', refresh_token: t.refresh })
        }).then(function (r) { if (!r.ok) { if (r.status === 400) { state.spotify.tokens = null; save(); } return null; } return r.json(); }).then(function (d) { if (!d) return false; storeTokens(d); return true; });
      }
      function token() {
        var t = cfg().tokens; if (!t) return Promise.resolve(null);
        if (Date.now() > (t.expires || 0) - 60000) { return refresh().then(function (ok) { return ok ? (cfg().tokens || {}).access : null; }); }
        return Promise.resolve(t.access);
      }
      function poll() {
        token().then(function (ac) {
          if (!ac) { render(cfg().tokens ? { playing: false } : null); return; }
          fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: 'Bearer ' + ac } }).then(function (res) {
            if (res.status === 204 || res.status === 202) { render({ playing: false }); return null; }
            if (res.status === 401) { refresh(); return null; }
            if (!res.ok) { render({ playing: false }); return null; }
            return res.json();
          }).then(function (d) {
            if (!d || !d.item) return;
            render({ playing: d.is_playing, title: d.item.name, artist: (d.item.artists || []).map(function (a) { return a.name; }).join(', '), art: (d.item.album && d.item.album.images && d.item.album.images.length ? d.item.album.images[d.item.album.images.length - 1].url : '') });
          }).catch(function () {});
        });
      }
      function render(s) {
        var pill = document.getElementById('spotifyPill'); if (!pill) return;
        var c = cfg();
        if (!c.clientId) { pill.style.display = 'none'; return; }
        pill.style.display = 'inline-flex';
        var titleEl = document.getElementById('spotifyTitle'), artistEl = document.getElementById('spotifyArtist'), artEl = document.getElementById('spotifyArt');
        if (!c.tokens) { pill.classList.remove('is-playing'); if (titleEl) titleEl.textContent = 'Connect Spotify'; if (artistEl) artistEl.textContent = ''; return; }
        if (!s || s.playing === false || !s.title) { pill.classList.remove('is-playing'); if (titleEl) titleEl.textContent = (s && s.title) ? s.title : 'Not playing'; if (artistEl) artistEl.textContent = (s && s.artist) ? s.artist : ''; return; }
        pill.classList.add('is-playing');
        if (titleEl) titleEl.textContent = s.title;
        if (artistEl) artistEl.textContent = s.artist || '';
        if (s.art && artEl) artEl.innerHTML = '<img src="' + s.art + '" alt="">';
      }
      function startPolling() { if (pollT) clearInterval(pollT); poll(); pollT = setInterval(poll, POLL_MS); }
      function onPillClick() { var c = cfg(); if (!c.clientId) { try { Sheet.open('profile'); } catch (e) {} return; } if (!c.tokens) { connect(); return; } }
      function refreshUi() { var c = cfg(); render(c.tokens ? { playing: false } : null); if (c.clientId && c.tokens) startPolling(); else if (pollT) { clearInterval(pollT); pollT = null; } }
      function disconnect() { if (state.spotify) { state.spotify.tokens = null; save(); } if (pollT) { clearInterval(pollT); pollT = null; } refreshUi(); }
      function init() {
        var pill = document.getElementById('spotifyPill');
        if (pill && !pill._bound) { pill._bound = true; pill.addEventListener('click', onPillClick); }
        var done = Promise.resolve();
        try { var qs = new URLSearchParams(location.search); if (qs.get('code') && sessionStorage.getItem('sp_verifier')) { done = exchange(qs.get('code')).then(function () { history.replaceState({}, '', location.origin + location.pathname); }); } } catch (e) {}
        done.then(refreshUi);
      }
      return { init: init, connect: connect, disconnect: disconnect, refreshUi: refreshUi, redirectUri: redirectUri };
    })();

    // v19 Universal Capture: the FAB and the "c" shortcut both open the inbox.
    const fabBtn = document.getElementById('captureFab');
    if (fabBtn) fabBtn.addEventListener('click', (e) => { e.preventDefault(); if (_appBlocked()) return; try { if (typeof showQuickCapture === 'function') showQuickCapture(); } catch (_) {} });
    // Global search: header icon + Cmd/Ctrl+K + "/" all open Spotlight.
    const searchBtn = document.getElementById('hubSearch');
    if (searchBtn) searchBtn.addEventListener('click', (e) => { e.preventDefault(); if (_appBlocked()) return; try { window.Spotlight.open(); } catch (_) {} });
    try { window.SpotifyNP.init(); } catch (_) {}
    // True while the boot splash, login, or onboarding is still up, so global
    // shortcuts never open a sheet over a pre-app screen.
    const _appBlocked = () => {
      try {
        const sp = document.getElementById('splash'); if (sp && !sp.classList.contains('dismissed')) return true;
        const lg = document.getElementById('loginScreen'); if (lg && !lg.classList.contains('hidden')) return true;
        if (document.querySelector('.welcome-intro.open')) return true;
      } catch (_) {}
      return false;
    };
    document.addEventListener('keydown', (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        if (_appBlocked()) return;
        e.preventDefault();
        try { if (window.Spotlight) { if (window.Spotlight._open) window.Spotlight.close(); else window.Spotlight.open(); } } catch (_) {}
        return;
      }
      if (e.key === '/' && !meta) {
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
        if (document.body.classList.contains('menu-peek') || document.body.classList.contains('menu-peek-closing')) return;
        if (typeof Sheet !== 'undefined' && Sheet.isOpen) return;
        if (_appBlocked() || document.querySelector('.action-exp.open, .clarity-exp.open')) return;
        e.preventDefault();
        try { if (window.Spotlight) window.Spotlight.open(); } catch (_) {}
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'c' && e.key !== 'C') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      if (document.body.classList.contains('menu-peek') || document.body.classList.contains('menu-peek-closing')) return;
      if (typeof Sheet !== 'undefined' && Sheet.isOpen) return;
      if (_appBlocked() || document.querySelector('.action-exp.open, .clarity-exp.open')) return;
      e.preventDefault();
      try { if (typeof showQuickCapture === 'function') showQuickCapture(); } catch (_) {}
    });

    backdrop.addEventListener('click', closeMenu);
    // Additive, STATIONARY peek: the backdrop never blocks (pointer-events:
    // none in CSS) and outside clicks do NOT dismiss the menu. It stays put
    // until the user explicitly closes it (T, the collapse control, or a nav
    // item's own handler).
    // Close any open full-screen experience so a destination behind the peek is
    // actually visible. data-nav items reopen their own target experience via
    // the per-item handler, so only close for plain tab destinations / brand.
    const _closeOverlays = () => {
      try { if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) ActionExperience.close(); } catch (e) {}
      try { if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) ClarityExperience.close(); } catch (e) {}
      try { if (typeof Sheet !== 'undefined' && Sheet.isOpen) Sheet.close(); } catch (e) {}
    };
    // Tapping any nav item / clickable section closes the drawer/peek after acting.
    this.el.addEventListener('click', (e) => {
      const hit = e.target.closest('.sidebar__nav-item, .sidebar__section--clickable, #sidebarProfile, #sidebarBrand');
      if (hit) {
        const wasPeek = document.body.classList.contains('menu-peek');
        // Opening Settings leaves the desktop sidebar open (Malik): Settings opens
        // behind it, the sidebar stays. There are TWO ways in - the "Settings" nav
        // item (data-tab="profile") and the profile chip (#sidebarProfile) - so both
        // are exempted. The mobile drawer still closes (it is a full-screen overlay,
        // so keeping it would hide Settings) -> closeMenu always runs, closePeek is
        // skipped for Settings.
        const isSettings = hit.matches('#sidebarProfile') || (hit.dataset && hit.dataset.tab === 'profile');
        closeMenu();
        if (!isSettings) closePeek();
        // From a peek over a full-screen view, plain tab destinations (Dashboard,
        // Memento, Settings) and the brand must dismiss the overlay underneath.
        const isTabDest = hit.matches('#sidebarBrand') || (hit.dataset && hit.dataset.tab && !hit.dataset.nav);
        if (wasPeek && isTabDest) _closeOverlays();
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closePeek(); } });

    // Robust experience-close ESC (bound in this already-working IIFE). Guarantees
    // Escape backs out of ANY open full-screen experience or dialog by clicking
    // its own close control, even if the module's internal open-state flag has
    // desynced (e.g. a reload restored the view by class without calling open()).
    // Runs as a safety net: well-behaved modules close via their own handler and
    // stop propagation before this fires; this only catches the ones that slip.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      // Let the menu layer close first if it is open.
      if (document.body.classList.contains('menu-peek') || document.body.classList.contains('menu-peek-closing')) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
      const tryClose = (overlaySel, btnSel) => {
        if (!document.querySelector(overlaySel)) return false;
        const x = [...document.querySelectorAll(btnSel)].find(b => b && b.getClientRects().length > 0) || document.querySelector(btnSel);
        if (x) { e.preventDefault(); x.click(); return true; }
        return false;
      };
      // Action: pop an open inner sub-sheet first, else close the experience.
      if (document.querySelector('.action-exp.open')) {
        const sub = document.querySelector('#actionRefineSheet[aria-hidden="false"], #actionTodaySheet[aria-hidden="false"], #actionCaveSheet[aria-hidden="false"], .action-milestone-sheet[aria-hidden="false"]');
        if (sub) { e.preventDefault(); sub.setAttribute('aria-hidden', 'true'); return; }
      }
      if (tryClose('.action-exp.open', '.action-exp__close, .fullscreen-close-global')) return;
      // Clarity: pop the nested "What is a Neutron Star?" sheet first, else close.
      if (document.querySelector('.clarity-exp.open, .clarity-exp.open-bg, .clarity-exp.open-content')) {
        const nsEx = document.querySelector('#nsExplainSheet[aria-hidden="false"]');
        if (nsEx) { e.preventDefault(); nsEx.setAttribute('aria-hidden', 'true'); return; }
      }
      if (tryClose('.clarity-exp.open, .clarity-exp.open-bg, .clarity-exp.open-content', '.clarity-exp__close, .fullscreen-close-global')) return;
      if (tryClose('.sheet--exp.open, .sheet.open', '.sheet--exp.open .sheet__close, .sheet.open .sheet__close, .sheet__close')) return;
      // Any other standalone dialog / modal / sheet.
      const dlg = [...document.querySelectorAll('[role="dialog"][aria-hidden="false"], [class*="-sheet"][aria-hidden="false"], [class*="-dialog"][aria-hidden="false"], [class*="-modal"][aria-hidden="false"], .modal.open, [class*="-modal"].open, [class*="-overlay"].open')].filter(el => el.getClientRects().length > 0);
      if (dlg.length) {
        dlg.sort((a, b) => (parseInt(getComputedStyle(a).zIndex, 10) || 0) - (parseInt(getComputedStyle(b).zIndex, 10) || 0));
        const top = dlg[dlg.length - 1];
        const btn = top.querySelector('button[class*="close"], [aria-label*="close" i], button[class*="back"], [aria-label*="back" i], [data-close]');
        e.preventDefault();
        if (btn) btn.click(); else top.setAttribute('aria-hidden', 'true');
      }
    });

    // Profile chip opens the profile tab (integrated, no separate nav item).
    const profileBtn = document.getElementById('sidebarProfile');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        if (typeof TabBar !== 'undefined') TabBar.switchTo('profile');
      });
    }

    // Neutron Star block: opens the clarity summary overlay.
    // Keyboard activation for the role="button" sidebar sections (Enter/Space).
    const _kbd = (el, fn) => { if (!el) return; el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); };
    const nsBlock = document.getElementById('sidebarNsSection');
    if (nsBlock) {
      nsBlock.setAttribute('aria-label', 'Open your Neutron Star');
      const nsOpen = () => { if (typeof ClarityExperience !== 'undefined' && ClarityExperience.openSummary) ClarityExperience.openSummary(); };
      nsBlock.addEventListener('click', nsOpen);
      _kbd(nsBlock, nsOpen);
    }
    // Deep work block: ensure dashboard is mounted then open the deep work sheet.
    const dwBlock = document.getElementById('sidebarDeepworkSection');
    if (dwBlock) {
      dwBlock.setAttribute('aria-label', 'Open Deep Work');
      const dwOpen = () => { if (typeof TabBar !== 'undefined') TabBar.switchTo('home'); if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('deepwork'); };
      dwBlock.addEventListener('click', dwOpen);
      _kbd(dwBlock, dwOpen);
    }
    // Reflection nudge: same pattern, opens the reflection sheet.
    const reflectBtn = document.getElementById('sidebarReflectionCta');
    if (reflectBtn) {
      reflectBtn.addEventListener('click', () => {
        if (typeof TabBar !== 'undefined') TabBar.switchTo('home');
        if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('reflection');
      });
    }

    // Nav items: data-tab items switch the top-level view; data-nav items stay
    // on the dashboard and open the matching full-screen flow or sheet, so the
    // 8-item nav maps entirely onto existing launchers (no new pages).
    this.navItems = [...this.el.querySelectorAll('.sidebar__nav-item')];
    this.navItems.forEach(item => {
      // Guarantee a screen-reader name even when the label is visually collapsed.
      const _lbl = item.querySelector('.sidebar__nav-label');
      if (_lbl && !item.getAttribute('aria-label')) item.setAttribute('aria-label', _lbl.textContent.trim());
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        const nav = item.dataset.nav;
        if (nav) {
          if (typeof TabBar !== 'undefined') TabBar.switchTo('home');
          this.setActiveTab('home');
          this._closeMobileMenu && this._closeMobileMenu();
          // v19 utility surfaces are always available (not gated by Clarity) and
          // open directly as their sheet. They are the mobile-reachable entry for
          // search/scheduling since the header icons are desktop-only.
          if (nav === 'search' || nav === 'timeblocks' || nav === 'inbox' || nav === 'projects' || nav === 'people' || nav === 'yearbook') {
            try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open(nav); } catch (e) {}
            return;
          }
          // Honor the same unlock gate the grid enforces: a locked module opened
          // from the sidebar would otherwise bypass the Clarity-first funnel.
          // Route a locked tap to Clarity (which is what unlocks the rest).
          if (nav !== 'clarity' && typeof isModuleUnlocked === 'function' && !isModuleUnlocked(nav)) {
            try { if (typeof ClarityExperience !== 'undefined') ClarityExperience.open(); } catch (e) {}
            return;
          }
          try {
            if (nav === 'clarity') {
              if (typeof ClarityExperience !== 'undefined') {
                (state.clarity && state.clarity.completed && ClarityExperience.openSummary) ? ClarityExperience.openSummary() : ClarityExperience.open();
              }
            } else if (nav === 'action') {
              if (typeof ActionExperience !== 'undefined') ActionExperience.open();
            } else if (typeof Sheet !== 'undefined' && Sheet.open) {
              Sheet.open(nav);
            }
          } catch (e) {}
          return;
        }
        if (typeof TabBar !== 'undefined') TabBar.switchTo(tab);
        this.setActiveTab(tab);
      });
    });

    // Relocate the Cheat Code Bar from the dashboard into the sidebar. Done
    // by JS so all the existing CreatorTools click handlers stay attached.
    // This block is dev-only and will be removed before launch.
    this._relocateCreatorBox();

    // Initial sync of dynamic content (greeting, date, streak, today's action).
    this.refresh();
  },

  _relocateCreatorBox() {
    const box = document.getElementById('creatorBox');
    const slot = document.getElementById('sidebarCreatorSlot');
    if (!box || !slot) return;
    // Mark so the CSS scope kicks in.
    box.classList.add('creator-box--moved-to-sidebar');
    slot.appendChild(box);
  },

  setActiveTab(tab) {
    this.navItems.forEach(item => {
      item.classList.toggle('sidebar__nav-item--active', item.dataset.tab === tab);
    });
  },

  // Pull live data from state and update the sidebar. Called from renderAll
  // so streak / today's action stay in sync as the user interacts.
  refresh() {
    if (!this.el) return;
    try {
      // v25 prune (Malik): the profile chip is name + avatar only, pinned to
      // the sidebar's bottom; no greeting, no date.
      const nameEl = document.getElementById('sidebarName');
      const avatarEl = document.getElementById('sidebarAvatar');
      const userName = (state.profile && state.profile.name) || (state.meta && state.meta.userName) || 'Builder';
      if (nameEl) nameEl.textContent = userName;
      if (avatarEl) {
        if (typeof applyProfileAvatar === 'function') applyProfileAvatar(avatarEl, (userName[0] || 'M').toUpperCase());
        else avatarEl.textContent = (userName[0] || 'M').toUpperCase();
      }
      // Info sections are OPT-IN (Settings > Sidebar): they duplicate what the
      // dashboard already shows, so the default menu is pure navigation.
      const sb = (k) => { try { return !!((state.prefs && state.prefs.sidebarSections) || {})[k]; } catch (e) { return false; } };

      // Gate the secondary modules in the nav until Clarity is complete. A
      // brand-new user with nothing unlocked should only see Dashboard, Search,
      // Goal, and Settings; the rest (Schedule, Plan, Focus, Journal, Progress,
      // Memento, Vivere) appear once they set their Neutron Star. The dashboard
      // cards for these are already locked pre-clarity, so showing them in the
      // nav just led to empty/glitchy destinations.
      const clarityDone = !!(state.clarity && state.clarity.completed);
      ['timeblocks', 'action', 'deepwork', 'reflection', 'streak', 'vivere'].forEach(nav => {
        const el = this.el.querySelector('.sidebar__nav-item[data-nav="' + nav + '"]');
        if (el) el.style.display = clarityDone ? '' : 'none';
      });
      const mementoNav = this.el.querySelector('.sidebar__nav-item[data-tab="memento"]');
      if (mementoNav) mementoNav.style.display = clarityDone ? '' : 'none';

      // Today's action quick view.
      const todaySection = document.getElementById('sidebarTodaySection');
      const todayValue = document.getElementById('sidebarTodayValue');
      if (todaySection && todayValue) {
        const pa = state.action && state.action.primaryAction;
        const recTier = pa && pa.recommendedTier && pa.tiers ? pa.tiers[pa.recommendedTier] : '';
        const todayText = recTier || (pa && pa.title) || '';
        if (todayText && sb('action')) {
          todayValue.textContent = todayText;
          todaySection.style.display = '';
        } else {
          todaySection.style.display = 'none';
        }
      }

      // Streak.
      const streakSection = document.getElementById('sidebarStreakSection');
      const streakCount = document.getElementById('sidebarStreakCount');
      if (streakSection && streakCount) {
        const count = (state.streak && state.streak.count) || 0;
        if (count > 0 && sb('streak')) {
          streakCount.textContent = count;
          streakSection.style.display = '';
        } else {
          streakSection.style.display = 'none';
        }
      }

      // Neutron Star + anchor word. Hide entirely pre-clarity.
      const nsSection = document.getElementById('sidebarNsSection');
      const nsValue = document.getElementById('sidebarNsValue');
      const anchorEl = document.getElementById('sidebarAnchor');
      if (nsSection && nsValue) {
        const ns = state.clarity && state.clarity.answers && state.clarity.answers.neutronStar;
        if (ns && ns.trim() && sb('neutron')) {
          nsValue.textContent = ns;
          nsSection.style.display = '';
          if (anchorEl) {
            const anchor = state.clarity.answers.anchor;
            if (anchor && anchor.trim()) {
              anchorEl.textContent = anchor;
              anchorEl.style.display = '';
            } else {
              anchorEl.style.display = 'none';
            }
          }
        } else {
          nsSection.style.display = 'none';
        }
      }

      // Days remaining to the user's goal horizon. Parse freeform timeframe
      // text like "6 months" or "1 year" and count down from clarity completion.
      const daysSection = document.getElementById('sidebarDaysSection');
      const daysNum = document.getElementById('sidebarDaysNum');
      const daysUnit = document.getElementById('sidebarDaysUnit');
      if (daysSection && daysNum && daysUnit) {
        const horizon = state.clarity && state.clarity.answers && state.clarity.answers.timeHorizon;
        const completedAt = state.clarity && state.clarity.completedAt;
        const daysLeft = Sidebar._computeDaysLeft(horizon, completedAt);
        if (daysLeft != null && sb('timeleft')) {
          daysNum.textContent = daysLeft;
          daysUnit.textContent = daysLeft === 1 ? 'day to your goal' : 'days to your goal';
          daysSection.style.display = '';
        } else {
          daysSection.style.display = 'none';
        }
      }

      // Deep work sessions logged today. Click opens the deep work sheet.
      // NOTE: deepwork.sessions[].date is stored as "Mar 5" (no year), so we
      // format today the same way for comparison. Cross-year false-positive
      // is a latent bug noted in the plan; punted to a future cleanup.
      const dwSection = document.getElementById('sidebarDeepworkSection');
      const dwCount = document.getElementById('sidebarDeepworkCount');
      if (dwSection && dwCount) {
        const sessions = (state.deepwork && state.deepwork.sessions) || [];
        const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const todayCount = sessions.filter(s => s && s.date === todayStr).length;
        dwCount.textContent = todayCount;
        // Show only if clarity is at least started; pre-clarity, the deepwork
        // module is locked anyway so the count would be misleading.
        const showDw = sb('deepwork') && !!(state.clarity && state.clarity.completed);
        dwSection.style.display = showDw ? '' : 'none';
      }

      // Reflection nudge: only show if no reflection logged today.
      // Reflection entries use the full "Tue, Mar 5, 2026" date format.
      const reflectBtn = document.getElementById('sidebarReflectionCta');
      if (reflectBtn) {
        const entries = (state.reflection && state.reflection.entries) || [];
        const todayLong = new Date().toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
        const reflectedToday = entries.some(e => e && e.date === todayLong);
        const showReflect = !!(state.clarity && state.clarity.completed) && !reflectedToday;
        reflectBtn.style.display = showReflect ? '' : 'none';
      }

      // Quiet Home nudge (mirrors the mobile tab bar): tiny accent dot on the
      // Home nav item when a plan exists and today's action is not yet done.
      const homeNav = this.el.querySelector('.sidebar__nav-item[data-tab="home"]');
      if (homeNav) {
        const showDot = (typeof actionPendingToday === 'function') ? actionPendingToday() : false;
        if (homeNav.classList.contains('sidebar__nav-item--has-dot') !== showDot) {
          homeNav.classList.toggle('sidebar__nav-item--has-dot', showDot);
        }
      }
    } catch (_) {}
  },

  // Parse a freeform time-horizon string ("6 months", "1 year", "12 months",
  // "this year", "2 years") and compute days remaining from when clarity was
  // locked in. Returns null if the horizon is missing or unparseable.
  _computeDaysLeft(horizon, completedAt) {
    if (!horizon || typeof horizon !== 'string') return null;
    const h = horizon.trim().toLowerCase();
    if (!h) return null;
    const MS_PER_DAY = 86400000;
    const startMs = (typeof completedAt === 'number' && completedAt > 0) ? completedAt : Date.now();
    // Map common phrases to days.
    let totalDays = null;
    if (/^this\s+week/.test(h) || /^a?\s*week/.test(h)) totalDays = 7;
    else if (/^this\s+month/.test(h)) totalDays = 30;
    else if (/^this\s+year/.test(h)) totalDays = 365;
    else if (/^today/.test(h)) totalDays = 1;
    else if (/^lifelong/.test(h) || /^forever/.test(h)) return null;
    else {
      // Number + unit form, e.g. "6 months", "12 months", "1 year", "2 years".
      const m = h.match(/^(\d+)\s*(day|week|month|year)s?\b/);
      if (m) {
        const n = parseInt(m[1], 10);
        const unit = m[2];
        if (unit === 'day') totalDays = n;
        else if (unit === 'week') totalDays = n * 7;
        else if (unit === 'month') totalDays = n * 30;
        else if (unit === 'year') totalDays = n * 365;
      }
    }
    if (totalDays == null) return null;
    const targetMs = startMs + totalDays * MS_PER_DAY;
    const daysLeft = Math.ceil((targetMs - Date.now()) / MS_PER_DAY);
    return Math.max(0, daysLeft);
  },
};

// One-tap theme presets (Settings > Preferences > Themes). Each sets theme,
// accent, background, and the Feel sliders together; everything stays
// individually adjustable afterward. Accent keys must exist in ACCENT_CHOICES;
// bg is [type, value] for prefs.background.
const THEME_PRESETS = [
  { key: 'midnight', name: 'Midnight', theme: 'dark',  accent: 'default', bg: ['default', ''],        uiRadius: 1,   uiGlass: 0,   dot: 'background: radial-gradient(circle at 32% 30%, #2a2440 0%, #0a0a10 70%);' },
  { key: 'ember',    name: 'Ember',    theme: 'dark',  accent: 'orange',  bg: ['color', 'ember'],     uiRadius: 0.8, uiGlass: 0,   dot: 'background: radial-gradient(circle at 32% 70%, #5a2410 0%, #160605 75%);' },
  { key: 'forest',   name: 'Forest',   theme: 'dark',  accent: 'green',   bg: ['color', 'forest'],    uiRadius: 1,   uiGlass: 0,   dot: 'background: radial-gradient(circle at 32% 30%, #14402a 0%, #04110a 75%);' },
  { key: 'mono',     name: 'Mono',     theme: 'dark',  accent: 'mono',    bg: ['color', 'graphite'],  uiRadius: 0.6, uiGlass: 0.3, dot: 'background: linear-gradient(180deg, #2c2c30 0%, #0e0e10 100%);' },
  { key: 'paper',    name: 'Paper',    theme: 'light', accent: 'default', bg: ['minimal', ''],        uiRadius: 1.1, uiGlass: 0,   dot: 'background: linear-gradient(180deg, #f4f4f6 0%, #dadce2 100%);' }
];

const TabBar = {
  el: null,
  tabs: [],
  activeTab: 'home',

  pill: null,

  init() {
    this.el = document.getElementById('tabBar');
    this.pill = document.getElementById('tabBarPill');
    if (!this.el) return;
    this.tabs = [...this.el.querySelectorAll('.tab-bar__tab')];
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTo(tab.dataset.tab));
    });
    // Position pill on initial active tab after layout
    requestAnimationFrame(() => this.movePill(false));
    this.updateHomeDot();
  },

  // Quiet Home nudge: a tiny accent dot on the Home tab when a plan exists and
  // today's action is not yet completed. Read-only of state. No dot when there
  // is no plan or once today is done. Called wherever the tab bar appears or
  // the day's completion can change.
  updateHomeDot() {
    if (!this.el) return;
    const tab = this.el.querySelector('.tab-bar__tab[data-tab="home"]');
    if (!tab) return;
    const show = (typeof actionPendingToday === 'function') ? actionPendingToday() : false;
    // Idempotent: only touch the class when the value actually changes, since
    // this can be called several times on one dashboard entry (show + switchTo).
    if (tab.classList.contains('tab-bar__tab--has-dot') !== show) {
      tab.classList.toggle('tab-bar__tab--has-dot', show);
    }
  },

  movePill(animate = true) {
    const active = this.el.querySelector('.tab-bar__tab--active');
    if (!active || !this.pill) return;
    const barRect = this.el.getBoundingClientRect();
    const tabRect = active.getBoundingClientRect();
    if (!animate) this.pill.style.transition = 'none';
    this.pill.style.left = (tabRect.left - barRect.left) + 'px';
    this.pill.style.width = tabRect.width + 'px';
    if (!animate) {
      void this.pill.offsetHeight; // force reflow
      this.pill.style.transition = '';
    }
  },

  show() {
    if (this.el) this.el.classList.remove('hidden');
    requestAnimationFrame(() => this.movePill(false));
    this.updateHomeDot();
  },

  hide() {
    if (this.el) this.el.classList.add('hidden');
  },

  switchTo(tabId) {
    // Search is an ACTION, not a destination: open Spotlight and leave the
    // active tab where it was (the pill never moves to search).
    if (tabId === 'search') {
      try { if (window.Spotlight && window.Spotlight.open) window.Spotlight.open(); } catch (e) {}
      return;
    }
    // Middle tab, MOBILE: acts as a Modules switcher (opens the MoreSpace sheet
    // listing every module) instead of the decorative trinity panel. The sheet
    // is an overlay, so the tab does not become active; Home stays underneath.
    // Desktop keeps the original behavior via the sidebar (sidebar-active).
    // Note: the bar is position:fixed, so offsetParent is always null; use
    // getClientRects (fixed-safe) to detect whether the bar is actually shown.
    const barVisible = (() => { try { const el = document.querySelector('.tab-bar'); return !!(el && el.getClientRects().length && getComputedStyle(el).display !== 'none'); } catch (e) { return false; } })();
    if (tabId === 'memento' && barVisible) {
      try { MoreSpace.open({ mode: 'switcher' }); } catch (e) {}
      return;
    }
    // Desktop guard: the trinity panel is only meaningful after the user has
    // done SOMETHING; before that, tapping it dumps them into an empty glyph.
    if (tabId === 'memento') {
      const hasAny = !!(
        state.clarity?.completed ||
        state.action?.planGenerated ||
        (state.streak?.history || []).length > 0 ||
        (state.streak?.count || 0) > 0
      );
      if (!hasAny) return; // do nothing
    }

    this.activeTab = tabId;
    // Refresh-survival: a non-home tab is a place worth restoring. Never
    // overwrite a module/experience view (they own lastView while open).
    try {
      if (!(typeof Sheet !== 'undefined' && Sheet.isOpen)) {
        const lv = (typeof recallView === 'function') ? recallView() : null;
        const ownedByExp = lv === 'action' || lv === 'claritySummary';
        if (!ownedByExp) rememberView((tabId && tabId !== 'home') ? ('tab:' + tabId) : null);
      }
    } catch (e) {}
    this.tabs.forEach(t => {
      t.classList.toggle('tab-bar__tab--active', t.dataset.tab === tabId);
    });
    this.movePill(true);
    this.updateHomeDot();
    // Mirror the active tab to the desktop sidebar (no-op on mobile).
    if (typeof Sidebar !== 'undefined' && Sidebar.setActiveTab) Sidebar.setActiveTab(tabId);

    const welcomeOverlay = document.getElementById('welcomeOverlay');
    if (welcomeOverlay) welcomeOverlay.remove();

    const app = document.getElementById('app');
    const panels = ['memento', 'profile'];

    if (tabId === 'home') {
      MementoVisual.destroy();
      app.style.display = '';
      panels.forEach(p => document.getElementById('panel' + p.charAt(0).toUpperCase() + p.slice(1)).classList.add('hidden'));
    } else {
      app.style.display = 'none';
      panels.forEach(p => {
        const panel = document.getElementById('panel' + p.charAt(0).toUpperCase() + p.slice(1));
        if (p === tabId) {
          panel.classList.remove('hidden');
          panel.style.display = '';
          this.renderPanel(p);
        } else {
          if (p === 'memento') MementoVisual.destroy();
          panel.classList.add('hidden');
        }
      });
    }
  },

  renderPanel(panelId) {
    const mementoInner = document.querySelector('#panelMemento .tab-panel__inner');
    if (mementoInner) mementoInner.classList.remove('tab-panel__inner--memento');
    switch (panelId) {
      case 'memento': this.renderMemento(); break;
      case 'profile': this.renderProfile(); break;
    }
  },

  renderMemento() {
    const body = document.getElementById('mementoBody');
    const panelInner = document.querySelector('#panelMemento .tab-panel__inner');
    if (panelInner) panelInner.classList.add('tab-panel__inner--memento');
    const summary = normalizeClaritySummary(state.clarity.answers);
    const _tp = (state.action && state.action.todayPlan) || {};
    const actionStarted = !!(
      (_tp.deepWork || '').trim() ||
      (_tp.proofTask || '').trim() ||
      (_tp.tinyUpgrade || '').trim() ||
      _tp.proofDone ||
      _tp.tinyDone ||
      _tp.deepWorkDone ||
      (state.action.sprint || []).some(s => s.done)
    );
    const consistencyStarted = (state.streak.history || []).length > 0 || (state.streak.count || 0) > 0;

    body.innerHTML = `
      <div class="memento-flow">
        <div class="memento-visual">
          <div class="memento-visual__glow"></div>
          <div class="memento-visual__icon-wrap">
            <!-- LEGACY hyperblob canvas (kept for restore): <canvas class="memento-visual__icon" id="mementoGlyph" width="84" height="84"></canvas> -->
            ${mementoMemorialSVG({ id: 'mementoGlyph', className: 'memento-visual__icon', size: 84 })}
          </div>
          <div class="memento-visual__beam memento-visual__beam--clarity ${state.clarity.completed ? 'is-on' : 'is-preview'}"></div>
          <div class="memento-visual__beam memento-visual__beam--action ${actionStarted ? 'is-on' : 'is-preview'}"></div>
          <div class="memento-visual__beam memento-visual__beam--consistency ${consistencyStarted ? 'is-on' : 'is-preview'}"></div>
          <div class="memento-visual__hover" id="mementoHoverCard">
            <div class="memento-visual__hover-label">Memento</div>
            <div class="memento-visual__hover-copy">${esc(summary.neutronStar || summary.heroWhy || summary.coreWhy || 'This is where Clarity, Action, and Consistency come together.')}</div>
          </div>
          <div class="memento-visual__caption">Clarity • Action • Consistency</div>
        </div>
      </div>
    `;
    setTimeout(() => MementoVisual.init(), 40);
  },

  // Glass-styled Preferences block (accent swatches + reduce-motion +
  // density). Reuses the profile panel's section/divider language. All values
  // read from state.prefs with safe fallbacks so a user with no prefs sees the
  // default (today's) selection highlighted.
  renderPreferencesSection() {
    const prefs = (state && state.prefs) || {};
    const accent = ACCENT_CHOICES.indexOf(prefs.accent) !== -1 ? prefs.accent : 'default';
    const reduceMotion = !!prefs.reduceMotion;
    const compact = prefs.density === 'compact';
    // [key, label, dot-color]. 'default' (Dynamic) dot shows the shared purple.
    const customHex = (prefs.accentCustom && /^#?[0-9a-fA-F]{3,6}$/.test(prefs.accentCustom))
      ? (prefs.accentCustom[0] === '#' ? prefs.accentCustom : '#' + prefs.accentCustom)
      : '#7b61ff';
    const swatches = [
      ['default', 'Dynamic', '#7b61ff'],
      ['cyan', 'Cyan', '#2bd4d4'],
      ['green', 'Green', '#34d97a'],
      ['amber', 'Amber', '#ffb73d'],
      ['rose', 'Rose', '#ff6b9d'],
      ['blue', 'Blue', '#4f8cff'],
      ['teal', 'Teal', '#19c3a6'],
      ['lime', 'Lime', '#a3e635'],
      ['orange', 'Orange', '#ff8a3d'],
      ['crimson', 'Crimson', '#ff4d6d'],
      ['magenta', 'Magenta', '#e84de8'],
      ['mono', 'Monochrome', '#cfcfcf'],
      ['custom', 'Custom', customHex]
    ];
    const swatchHtml = swatches.map(([key, label, col]) => {
      const sel = key === accent;
      return '<button type="button" class="pref-swatch' + (sel ? ' pref-swatch--active' : '') + '" data-accent="' + key + '" aria-pressed="' + sel + '" aria-label="' + label + ' accent" title="' + label + '">' +
        '<span class="pref-swatch__dot" style="background:' + col + ';box-shadow:0 0 0 1px rgba(var(--ink),0.18), 0 0 10px ' + col + '66;"></span>' +
        '<span class="pref-swatch__label">' + label + '</span>' +
      '</button>';
    }).join('');
    const toggleRow = (id, title, sub, on) =>
      '<div class="pref-row">' +
        '<div class="pref-row__text"><div class="pref-row__title">' + title + '</div><div class="pref-row__sub">' + sub + '</div></div>' +
        '<button type="button" id="' + id + '" class="pref-toggle' + (on ? ' pref-toggle--on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + title + '"><span class="pref-toggle__knob"></span></button>' +
      '</div>';
    // Feel sliders: corner radius + surface opacity (live-applied via applyPrefs).
    const uiRadius = (typeof prefs.uiRadius === 'number' && isFinite(prefs.uiRadius)) ? prefs.uiRadius : 1;
    const uiGlass = (typeof prefs.uiGlass === 'number' && isFinite(prefs.uiGlass)) ? prefs.uiGlass : 0;
    const uiBlur = (typeof prefs.uiBlur === 'number' && isFinite(prefs.uiBlur)) ? prefs.uiBlur : 1;
    const sliderRow = (id, title, hintLo, hintHi, min, max, step, val) =>
      '<div class="pref-slider-row">' +
        '<div class="pref-slider-row__head"><div class="pref-row__title">' + title + '</div></div>' +
        '<input type="range" id="' + id + '" class="pref-slider" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" aria-label="' + title + '" />' +
        '<div class="pref-slider-row__hints"><span>' + hintLo + '</span><span>' + hintHi + '</span></div>' +
      '</div>';
    // --- Themes: one-tap presets (theme + accent + background + feel) ---
    const bgPref = (prefs.background && typeof prefs.background === 'object') ? prefs.background : { type: 'default', value: '' };
    const bgDim = (typeof prefs.bgDim === 'number' && isFinite(prefs.bgDim)) ? Math.min(0.6, Math.max(0, prefs.bgDim)) : 0.2;
    const themeNow = prefs.theme === 'light' ? 'light' : 'dark';
    const presets = (typeof THEME_PRESETS !== 'undefined') ? THEME_PRESETS : [];
    const themesHtml = presets.map(t => {
      const on = themeNow === t.theme && accent === t.accent &&
        bgPref.type === t.bg[0] && (bgPref.value || '') === (t.bg[1] || '') &&
        uiRadius === t.uiRadius && uiGlass === t.uiGlass;
      return '<button type="button" class="pref-swatch' + (on ? ' pref-swatch--active' : '') + '" data-theme-preset="' + t.key + '" aria-pressed="' + on + '" title="' + t.name + '">' +
        '<span class="pref-swatch__dot" style="' + t.dot + '"></span>' +
        '<span class="pref-swatch__label">' + t.name + '</span>' +
      '</button>';
    }).join('');
    // --- Background: swatch grid (default / minimal / colors / images) ---
    const bgSwatch = (key, label, visual, on) =>
      '<button type="button" class="pref-swatch' + (on ? ' pref-swatch--active' : '') + '" data-bg="' + key + '" aria-pressed="' + on + '" aria-label="' + label + ' background" title="' + label + '">' +
        visual + '<span class="pref-swatch__label">' + label + '</span>' +
      '</button>';
    const dot = (style) => '<span class="pref-swatch__dot" style="' + style + '"></span>';
    const thumb = (style) => '<span class="pref-swatch__thumb" style="' + style + '"></span>';
    const bgColors = (typeof BG_COLOR_CHOICES !== 'undefined') ? BG_COLOR_CHOICES : [];
    const bgIsUpload = bgPref.type === 'image' && /^idb:/.test(bgPref.value || '');
    const bgIsLink = bgPref.type === 'image' && /^https:\/\//i.test(bgPref.value || '');
    const bgHtml =
      bgSwatch('default', 'Default', dot('background: radial-gradient(circle at 32% 30%, #2a2440 0%, #0a0a10 70%);'), bgPref.type === 'default') +
      bgSwatch('minimal', 'Minimal', dot('background: var(--bg-deep); box-shadow: inset 0 0 0 1px rgba(var(--ink),0.2);'), bgPref.type === 'minimal') +
      bgColors.map(c => bgSwatch('color:' + c.key, c.name, thumb('background: ' + c.css + ';'), bgPref.type === 'color' && bgPref.value === c.key)).join('') +
      bgSwatch('img:bg/mountain.jpg', 'Mountain', thumb('background-image: url(bg/mountain.jpg);'), bgPref.type === 'image' && bgPref.value === 'bg/mountain.jpg') +
      bgSwatch('img:bg/streaks.jpg', 'Streaks', thumb('background-image: url(bg/streaks.jpg);'), bgPref.type === 'image' && bgPref.value === 'bg/streaks.jpg') +
      bgSwatch('upload', bgIsUpload ? 'Your photo' : 'Upload', dot('background: var(--kfill-08); box-shadow: inset 0 0 0 1px rgba(var(--ink),0.2);'), bgIsUpload) +
      bgSwatch('link', 'From a link', dot('background: var(--kfill-08); box-shadow: inset 0 0 0 1px rgba(var(--ink),0.2);'), bgIsLink);
    const bgDimRow = (bgPref.type === 'color' || bgPref.type === 'image')
      ? sliderRow('prefBgDim', 'Background dim', 'Clear', 'Dark', 0, 0.6, 'any', bgDim)
      : '';
    const FIELD_BG = 'flex:1; min-width:0; box-sizing:border-box; font:inherit; font-size:0.85rem; color:var(--text-hi); background:var(--surface-1); border:1px solid transparent; border-radius:calc(8px * var(--rx, 1)); padding:9px 11px; outline:none;';
    const bgLinkRow =
      '<div id="prefBgLinkRow" style="display:none; margin-top:10px;">' +
        '<div style="display:flex; gap:8px;">' +
          '<input type="text" id="prefBgLinkInput" inputmode="url" placeholder="https://..." aria-label="Image address" style="' + FIELD_BG + '" />' +
          '<button type="button" id="prefBgLinkApply" class="sheet-btn" style="flex:0 0 auto; padding:9px 14px; background:var(--kfill-05); color:var(--text-hi); border:1px solid transparent;">Set</button>' +
        '</div>' +
        '<div style="font-size:0.6875rem; color:var(--text-3); margin-top:6px;">Paste an image address from a free site like Unsplash or Pexels.</div>' +
        '<div id="prefBgLinkMsg" style="font-size:0.6875rem; color:var(--text-3); margin-top:4px;"></div>' +
      '</div>';
    return '' +
      '<div style="padding: 20px 0;">' +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-2); margin-bottom: 12px;">Preferences</div>' +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin-bottom: 10px;">Appearance</div>' +
        toggleRow('prefLightMode', 'Light mode', 'Switch the whole app to a bright, premium off-white theme.', prefs.theme === 'light') +
        toggleRow('prefFlatBg', 'Minimal background', 'Hide the ambient orbs and glow for a flat, paper-like surface.', !!prefs.flatBg) +
        toggleRow('prefFlatUi', 'Flat surfaces', 'Remove the glass blur from cards, sheets, and bars for a flat, matte look.', !!prefs.flatUi) +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 18px 0 10px;">Themes</div>' +
        '<div class="pref-swatches" id="prefThemes">' + themesHtml + '</div>' +
        '<div style="font-size: 0.6875rem; color: var(--text-3); margin: 8px 0 0;">One tap sets the whole look. Everything below stays adjustable.</div>' +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 18px 0 10px;">Background</div>' +
        '<div class="pref-swatches" id="prefBackground">' + bgHtml + '</div>' +
        '<input type="file" id="prefBgUploadInput" accept="image/*" style="display:none;" />' +
        bgLinkRow +
        bgDimRow +
        '<div style="height:18px;"></div>' +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin-bottom: 10px;">Accent</div>' +
        '<div class="pref-swatches" id="prefAccent">' + swatchHtml + '</div>' +
        '<input type="color" id="prefAccentCustomInput" value="' + customHex + '" aria-label="Pick a custom accent color" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;" />' +
        '<div style="font-size: 0.6875rem; color: var(--text-3); margin: 8px 0 16px;">Retints shared highlights and focus rings. Each module keeps its own color. Pick Custom for any color you like.</div>' +
        toggleRow('prefReduceMotion', 'Reduce motion', 'Calms the orbiting ring, drifting glow, and ambient motion.', reduceMotion) +
        toggleRow('prefCardTilt', 'Memento tilt', 'The Memento leans toward your cursor as you move the mouse.', !!prefs.cardTilt) +
        toggleRow('prefCompact', 'Compact density', 'Tightens spacing so more fits on screen.', compact) +
        toggleRow('prefWeekMonday', 'Weeks start Monday', 'Aligns the heatmap and calendars to Monday columns.', (state.prefs && state.prefs.weekStart === 'mon')) +
        toggleRow('prefMorningRitual', 'Morning ritual', 'A 20-second start on the first open of each morning.', (state.prefs && state.prefs.morningRitual === 'on')) +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 18px 0 8px;">Sidebar</div>' +
        (function () {
          const sbp = (state.prefs && state.prefs.sidebarSections) || {};
          return toggleRow('prefSbNeutron', 'Neutron Star', 'Pin your goal in the menu.', !!sbp.neutron) +
            toggleRow('prefSbAction', "Today's action", 'Pin the day\u2019s one move.', !!sbp.action) +
            toggleRow('prefSbTimeleft', 'Time left', 'Days remaining to your goal.', !!sbp.timeleft) +
            toggleRow('prefSbStreak', 'Consistency', 'Your streak count.', !!sbp.streak) +
            toggleRow('prefSbDeepwork', 'Deep work today', 'Sessions logged today.', !!sbp.deepwork);
        })() +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 18px 0 8px;">Feel</div>' +
        sliderRow('prefUiRadius', 'Corner radius', 'Sharp', 'Round', 0, 1.4, 'any', uiRadius) +
        sliderRow('prefUiGlass', 'Surface opacity', 'Glass', 'Solid', -0.25, 1, 'any', uiGlass) +
        sliderRow('prefUiBlur', 'Blur', 'Crisp', 'Frosted', 0, 1.5, 'any', uiBlur) +
        // Live demo of the three sliders. Pure tokens (--rx / --bx / --wfill-*)
        // over its own colorful inner backdrop, so changes read instantly even
        // on a plain black app background.
        '<div class="feel-preview" aria-hidden="true">' +
          '<div class="feel-preview__bg"></div>' +
          '<div class="feel-preview__card">' +
            '<div class="feel-preview__text">The glass you are shaping.</div>' +
            '<div class="feel-preview__row">' +
              '<span class="feel-preview__btn">Continue</span>' +
              '<span class="feel-preview__chip">Today</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="feel-preview__caption">Live preview</div>' +
        '<div style="display:flex; justify-content:flex-end; margin: 10px 0 4px;">' +
          '<button type="button" id="prefFeelReset" class="pref-feel-reset">Reset feel</button>' +
        '</div>' +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 18px 0 8px;">Modules</div>' +
        toggleRow('prefUnlockAll', 'Unlock everything', 'Skip the gradual module unlocks and show every module now.', !!prefs.unlockAll) +
        '<div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 18px 0 8px;">Your anchor quote</div>' +
        '<input type="text" id="prefAnchorQuote" maxlength="160" placeholder="One line that pulls you forward..." value="' + esc(prefs.anchorQuote || '') + '" style="width:100%;box-sizing:border-box;font:inherit;font-size:0.9rem;color:var(--text-hi);background:var(--surface-1);border:1px solid transparent;border-radius:calc(8px * var(--rx, 1));padding:11px 13px;outline:none;" />' +
        '<div style="font-size: 0.6875rem; color: var(--text-3); margin-top: 8px;">Takes over the daily line on your dashboard. Leave blank to rotate the defaults.</div>' +
      '</div>';
  },

  // Re-render the Preferences block in place (active swatches, the conditional
  // dim slider, preset highlights) and rebind its controls.
  refreshPrefsSection() {
    const wrap = document.getElementById('prefsSection');
    if (!wrap) return;
    // Never yank the DOM out from under an active drag or text entry: the
    // pointer would keep driving a detached node and the gesture dies midway.
    // Defer the rebuild until the control releases, then run it once.
    const active = document.activeElement;
    if (active && wrap.contains(active) && active.matches('input[type="range"], input[type="color"], input[type="text"]')) {
      if (this._prefsRefreshQueued) return;
      this._prefsRefreshQueued = true;
      let fired = false;
      const done = () => {
        if (fired) return;
        fired = true;
        this._prefsRefreshQueued = false;
        this.refreshPrefsSection();
      };
      active.addEventListener('change', done, { once: true });
      active.addEventListener('blur', done, { once: true });
      return;
    }
    wrap.innerHTML = this.renderPreferencesSection();
    this.bindPreferences();
  },

  // Uploaded background photo: downscale, store in IndexedDB, set as the
  // custom background. Shared by the file input and the test/eval path.
  applyUploadedBackground(file) {
    if (!file || typeof vivDownscaleImage !== 'function' || typeof idbStore !== 'function') return;
    vivDownscaleImage(file, 1920, (dataURL, w, h) => {
      if (!dataURL) {
        try { if (typeof showToast === 'function') showToast('Could not read that image.'); } catch (e) {}
        return;
      }
      idbStore(dataURL, w, h).then((id) => {
        if (!id) {
          try { if (typeof showToast === 'function') showToast('Could not save that image.'); } catch (e) {}
          return;
        }
        state.prefs.background = { type: 'image', value: 'idb:' + id };
        persistNow();
        applyPrefs();
        this.refreshPrefsSection();
      });
    });
  },

  // Wires the Preferences controls. Each change writes state.prefs, persists,
  // and re-applies live via applyPrefs() so the user sees it instantly.
  bindPreferences() {
    if (!state.prefs) state.prefs = { accent: 'default', reduceMotion: false, density: 'comfortable' };
    const accentWrap = document.getElementById('prefAccent');
    if (accentWrap) {
      accentWrap.querySelectorAll('.pref-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-accent');
          if (ACCENT_CHOICES.indexOf(val) === -1) return;
          state.prefs.accent = val;
          persistNow();
          applyPrefs();
          accentWrap.querySelectorAll('.pref-swatch').forEach(b => {
            const on = b === btn;
            b.classList.toggle('pref-swatch--active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          // Re-render the command center so its inline accent text updates now
          // (rebind so its buttons keep working).
          try {
            const cc = document.getElementById('commandCenter');
            if (cc && typeof renderCommandCenter === 'function') {
              cc.innerHTML = renderCommandCenter();
              if (typeof bindCommandCenter === 'function') bindCommandCenter(cc);
            }
          } catch (e) {}
          // Custom: open the native color picker to choose any color.
          if (val === 'custom') {
            const ci = document.getElementById('prefAccentCustomInput');
            if (ci) ci.click();
          }
        });
      });
    }
    // Custom accent color picker: applies live as the user drags, commits on close.
    const customInput = document.getElementById('prefAccentCustomInput');
    if (customInput) {
      let ciT = null;
      const applyCustom = (commit) => {
        state.prefs.accentCustom = customInput.value;
        state.prefs.accent = 'custom';
        applyPrefs();
        if (accentWrap) {
          accentWrap.querySelectorAll('.pref-swatch').forEach(b => {
            const on = b.getAttribute('data-accent') === 'custom';
            b.classList.toggle('pref-swatch--active', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (on) {
              const dot = b.querySelector('.pref-swatch__dot');
              if (dot) { dot.style.background = customInput.value; dot.style.boxShadow = '0 0 0 1px rgba(var(--ink),0.18), 0 0 10px ' + customInput.value + '66'; }
            }
          });
        }
        if (commit) {
          persistNow();
          try {
            const cc = document.getElementById('commandCenter');
            if (cc && typeof renderCommandCenter === 'function') {
              cc.innerHTML = renderCommandCenter();
              if (typeof bindCommandCenter === 'function') bindCommandCenter(cc);
            }
          } catch (e) {}
        }
      };
      customInput.addEventListener('input', () => { clearTimeout(ciT); applyCustom(false); ciT = setTimeout(() => persistNow(), 250); });
      customInput.addEventListener('change', () => applyCustom(true));
    }
    const wireToggle = (id, apply) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => {
        const on = !el.classList.contains('pref-toggle--on');
        el.classList.toggle('pref-toggle--on', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
        apply(on);
        persistNow();
        applyPrefs();
      });
    };
    wireToggle('prefReduceMotion', (on) => { state.prefs.reduceMotion = on; });
    wireToggle('prefCardTilt', (on) => { state.prefs.cardTilt = on; try { if (typeof renderDayCard === 'function') renderDayCard(); } catch (e) {} });
    wireToggle('prefCompact', (on) => { state.prefs.density = on ? 'compact' : 'comfortable'; });
    wireToggle('prefWeekMonday', (on) => {
      state.prefs.weekStart = on ? 'mon' : 'sun';
      try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    });
    wireToggle('prefMorningRitual', (on) => { state.prefs.morningRitual = on ? 'on' : 'off'; });
    const wireSbSection = (id, key) => wireToggle(id, (on) => {
      if (!state.prefs.sidebarSections) state.prefs.sidebarSections = {};
      state.prefs.sidebarSections[key] = on;
      try { if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh(); } catch (e) {}
    });
    wireSbSection('prefSbNeutron', 'neutron');
    wireSbSection('prefSbAction', 'action');
    wireSbSection('prefSbTimeleft', 'timeleft');
    wireSbSection('prefSbStreak', 'streak');
    wireSbSection('prefSbDeepwork', 'deepwork');
    // Feel sliders: live-apply while dragging (input), persist on release (change).
    const wireSlider = (id, key, fallback) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        state.prefs[key] = isFinite(v) ? v : fallback;
        applyPrefs();
      });
      el.addEventListener('change', () => persistNow());
    };
    wireSlider('prefUiRadius', 'uiRadius', 1);
    wireSlider('prefUiGlass', 'uiGlass', 0);
    wireSlider('prefUiBlur', 'uiBlur', 1);
    const feelReset = document.getElementById('prefFeelReset');
    if (feelReset) feelReset.addEventListener('click', () => {
      state.prefs.uiRadius = 1;
      state.prefs.uiGlass = 0;
      state.prefs.uiBlur = 1;
      const r = document.getElementById('prefUiRadius');
      const g = document.getElementById('prefUiGlass');
      const bl = document.getElementById('prefUiBlur');
      if (r) r.value = '1';
      if (g) g.value = '0';
      if (bl) bl.value = '1';
      persistNow();
      applyPrefs();
    });
    // v23 unlock-ladder escape hatch: bypass the gradual unlocks entirely.
    wireToggle('prefUnlockAll', (on) => {
      state.prefs.unlockAll = on;
      if (on && state.ui) { state.ui.unlockQueue = []; state.ui.pendingReveal = ''; }
      try { if (typeof renderGrid === 'function') renderGrid(); if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    });
    // Light mode: wired manually so the switch runs through applyThemeChange()
    // for the buttery cross-fade instead of a hard snap.
    const lmEl = document.getElementById('prefLightMode');
    if (lmEl) lmEl.addEventListener('click', () => {
      const on = !lmEl.classList.contains('pref-toggle--on');
      lmEl.classList.toggle('pref-toggle--on', on);
      lmEl.setAttribute('aria-checked', on ? 'true' : 'false');
      applyThemeChange(() => { state.prefs.theme = on ? 'light' : 'dark'; });
      persistNow();
    });
    wireToggle('prefFlatBg', (on) => { state.prefs.flatBg = on; });
    wireToggle('prefFlatUi', (on) => { state.prefs.flatUi = on; });
    // Re-render the command center after accent-affecting changes (its inline
    // accent text is baked at render time), rebinding so buttons keep working.
    const refreshCommandCenter = () => {
      try {
        const cc = document.getElementById('commandCenter');
        if (cc && typeof renderCommandCenter === 'function') {
          cc.innerHTML = renderCommandCenter();
          if (typeof bindCommandCenter === 'function') bindCommandCenter(cc);
        }
      } catch (e) {}
    };
    // --- Themes: one-tap presets ---
    const themesWrap = document.getElementById('prefThemes');
    if (themesWrap) {
      themesWrap.querySelectorAll('[data-theme-preset]').forEach(btn => {
        btn.addEventListener('click', () => {
          const presets = (typeof THEME_PRESETS !== 'undefined') ? THEME_PRESETS : [];
          const t = presets.filter(x => x.key === btn.getAttribute('data-theme-preset'))[0];
          if (!t) return;
          applyThemeChange(() => {
            state.prefs.theme = t.theme;
            state.prefs.accent = t.accent;
            state.prefs.background = { type: t.bg[0], value: t.bg[1] || '' };
            state.prefs.uiRadius = t.uiRadius;
            state.prefs.uiGlass = t.uiGlass;
          });
          persistNow();
          refreshCommandCenter();
          this.refreshPrefsSection();
        });
      });
    }
    // --- Background: swatch grid + upload + link + dim ---
    const setBackground = (bg) => {
      state.prefs.background = bg;
      persistNow();
      applyPrefs();
      this.refreshPrefsSection();
    };
    const bgWrap = document.getElementById('prefBackground');
    if (bgWrap) {
      bgWrap.querySelectorAll('[data-bg]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-bg') || '';
          if (key === 'default') { setBackground({ type: 'default', value: '' }); return; }
          if (key === 'minimal') { setBackground({ type: 'minimal', value: '' }); return; }
          if (key.indexOf('color:') === 0) { setBackground({ type: 'color', value: key.slice(6) }); return; }
          if (key.indexOf('img:') === 0) { setBackground({ type: 'image', value: key.slice(4) }); return; }
          if (key === 'upload') {
            const fi = document.getElementById('prefBgUploadInput');
            if (fi) fi.click();
            return;
          }
          if (key === 'link') {
            const row = document.getElementById('prefBgLinkRow');
            if (row) row.style.display = (row.style.display === 'none') ? '' : 'none';
            const inp = document.getElementById('prefBgLinkInput');
            if (inp && row && row.style.display !== 'none') inp.focus();
          }
        });
      });
    }
    const bgUpload = document.getElementById('prefBgUploadInput');
    if (bgUpload) bgUpload.addEventListener('change', () => {
      const f = bgUpload.files && bgUpload.files[0];
      bgUpload.value = '';
      if (f) this.applyUploadedBackground(f);
    });
    const bgLinkInput = document.getElementById('prefBgLinkInput');
    const bgLinkApply = document.getElementById('prefBgLinkApply');
    const bgLinkMsg = document.getElementById('prefBgLinkMsg');
    const tryBgLink = () => {
      const url = ((bgLinkInput && bgLinkInput.value) || '').trim();
      if (!/^https:\/\//i.test(url)) {
        if (bgLinkMsg) bgLinkMsg.textContent = 'Use a full https image address.';
        return;
      }
      if (bgLinkMsg) bgLinkMsg.textContent = 'Checking the image...';
      const probe = new Image();
      probe.onload = () => setBackground({ type: 'image', value: url });
      probe.onerror = () => { if (bgLinkMsg) bgLinkMsg.textContent = 'That address did not load as an image. Copy the image itself, not the page.'; };
      probe.src = url;
    };
    if (bgLinkApply) bgLinkApply.addEventListener('click', tryBgLink);
    if (bgLinkInput) bgLinkInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tryBgLink(); } });
    const bgDimEl = document.getElementById('prefBgDim');
    if (bgDimEl) {
      bgDimEl.addEventListener('input', () => {
        const v = parseFloat(bgDimEl.value);
        state.prefs.bgDim = isFinite(v) ? Math.min(0.6, Math.max(0, v)) : 0.2;
        applyPrefs();
      });
      bgDimEl.addEventListener('change', () => persistNow());
    }
    // Anchor quote: save on input (light debounce) and refresh the Daily Memento
    // bar live so the user sees their words land.
    const aq = document.getElementById('prefAnchorQuote');
    if (aq) {
      let aqT = null;
      const saveAq = () => {
        state.prefs.anchorQuote = aq.value.trim().slice(0, 160);
        persistNow();
        try { if (typeof renderDailyMemento === 'function') renderDailyMemento(); } catch (e) {}
      };
      aq.addEventListener('input', () => { clearTimeout(aqT); aqT = setTimeout(saveAq, 300); });
      aq.addEventListener('blur', saveAq);
    }
  },

  // Support + contact: the closeness moat. One builder you can actually reach.
  renderSupportSection() {
    if (!state.support) state.support = { contacts: { discord: 'https://discord.gg/UNbPAUc3y4', email: 'mpeac3@gmail.com' }, feedbackQueue: [] };
    const sp = state.support; const c = sp.contacts || {};
    const discordUrl = c.discord || 'https://discord.gg/UNbPAUc3y4';
    const emailAddr = c.email || 'mpeac3@gmail.com';
    const SECLABEL = 'font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-2); margin-bottom: 12px;';
    const variant = (state.prefs && state.prefs.guaranteeVariant === 'b') ? 'b' : 'a';
    const guarantee = variant === 'b'
      ? 'The Unmissable Guarantee. If Memento has not helped you stop drifting within 30 days, email me and I will refund you in full. And I read every message myself.'
      : 'The Unmissable Promise. I read and reply to every message myself. If you are stuck or something is missing, I will personally help you get unstuck.';
    const changelog = [
      ['You asked for a way to reach me', 'Added this Support tab with a direct line and a Discord.'],
      ['You wanted notes that feel lived in', 'Folders, Recently Deleted, and a full notes app in Reflection.'],
      ['You wanted a real vision board', 'An infinite, zoomable Vivere canvas with multiple boards.'],
    ];
    const BTN = 'flex:1; text-decoration:none; text-align:center; display:inline-flex; align-items:center; justify-content:center; gap:7px;';
    return '' +
      '<div style="' + SECLABEL + '">Support and contact</div>' +
      '<div style="font-size:0.8125rem; color:var(--text-2); line-height:1.55; margin-bottom:14px;">Memento is built by one person, on purpose. You can reach me directly, and I actually answer.</div>' +
      '<div class="support-guarantee">' + esc(guarantee) + '</div>' +
      '<div style="display:flex; gap:8px; margin:14px 0;">' +
        '<a class="sheet-btn" style="' + BTN + ' background:rgba(88,101,242,0.16); color:#aab4ff; border:1px solid rgba(88,101,242,0.4);" href="' + esc(/^https?:\/\//i.test(discordUrl) ? discordUrl : '#').replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">Join the Discord</a>' +
        '<a class="sheet-btn" style="' + BTN + ' background:var(--kfill-05); color:var(--text-hi); border:1px solid transparent;" href="mailto:' + esc(emailAddr).replace(/"/g, '&quot;') + '">Email me</a>' +
      '</div>' +
      '<div style="' + SECLABEL + ' margin-top:18px;">Send an idea, a bug, or a note</div>' +
      '<div class="fb-kinds" id="fbKind">' +
        '<button type="button" class="fb-chip fb-chip--on" data-fb-kind="idea">Idea</button>' +
        '<button type="button" class="fb-chip" data-fb-kind="bug">Bug</button>' +
        '<button type="button" class="fb-chip" data-fb-kind="love">Love note</button>' +
      '</div>' +
      '<textarea id="fbText" class="wiz__text-input" rows="3" placeholder="What would make Memento better for you?" style="margin:8px 0; resize:vertical; min-height:70px;"></textarea>' +
      '<button class="sheet-btn" id="fbSend" style="background:rgba(191,90,242,0.14); color:var(--color-reflection); border:1px solid rgba(191,90,242,0.32);">Send to Malik</button>' +
      '<div id="fbMsg" style="font-size:0.6875rem; color:var(--text-3); margin-top:8px; text-align:center;"></div>' +
      '<button type="button" class="support-disclose" id="whyBuilt">Why I built this</button>' +
      '<div id="whyBuiltBody" class="support-story" style="display:none;">' +
        '<p>I watched years blur past on autopilot. Days I could not tell apart, a life I was not actually choosing. Memento is the tool I needed: something that keeps what I want in front of me and counts the days I actually show up.</p>' +
        '<p>I cannot outspend the big apps. But I can build the thing I would want, listen to the people who use it, and answer when you reach out. That is the whole bet.</p>' +
      '</div>' +
      '<div style="' + SECLABEL + ' margin-top:20px;">You asked, I shipped</div>' +
      '<ul class="support-changelog">' + changelog.map(function (it) { return '<li><strong>' + esc(it[0]) + '.</strong> ' + esc(it[1]) + '</li>'; }).join('') + '</ul>' +
      '<details class="support-edit"><summary>Edit contact links</summary>' +
        '<label>Discord invite<input type="text" id="spDiscord" value="' + esc(discordUrl) + '"></label>' +
        '<label>Contact email<input type="text" id="spEmail" value="' + esc(emailAddr) + '"></label>' +
        '<label class="support-edit__row">Guarantee wording' +
          '<select id="spGuarantee"><option value="a"' + (variant === 'a' ? ' selected' : '') + '>Relationship (no refund)</option><option value="b"' + (variant === 'b' ? ' selected' : '') + '>Money-back</option></select>' +
        '</label>' +
      '</details>' +
      this.renderSpotifySettings();
  },
  renderSpotifySettings() {
    const SECLABEL = 'font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-2); margin: 22px 0 12px;';
    const sp = (state.spotify || {});
    const connected = !!(sp.tokens);
    let redirect = '';
    try { redirect = (window.SpotifyNP && window.SpotifyNP.redirectUri) ? window.SpotifyNP.redirectUri() : (location.origin + location.pathname); } catch (e) { redirect = location.origin + location.pathname; }
    return '' +
      '<div style="' + SECLABEL + '">Spotify now playing</div>' +
      '<div style="font-size:0.8125rem; color:var(--text-2); line-height:1.55; margin-bottom:12px;">Show what you are listening to in a pill at the top right. Create a free app at developer.spotify.com, paste the Client ID below, and add the redirect URL to your app settings. No password or secret is ever stored.</div>' +
      '<details class="support-edit" open>' +
        '<summary>' + (connected ? 'Connected · manage' : 'Set up Spotify') + '</summary>' +
        '<label>Client ID<input type="text" id="spClientId" placeholder="Paste your Spotify Client ID" value="' + esc(sp.clientId || '') + '"></label>' +
        '<label>Redirect URL (add this to your Spotify app)<input type="text" id="spRedirect" readonly value="' + esc(redirect) + '" onclick="this.select()"></label>' +
        '<div style="display:flex; gap:8px; margin-top:10px;">' +
          (connected
            ? '<button type="button" class="sheet-btn" id="spDisconnect" style="flex:1; background:var(--kfill-05); color:var(--text-hi); border:1px solid transparent;">Disconnect</button>'
            : '<button type="button" class="sheet-btn" id="spConnect" style="flex:1; background:rgba(29,185,84,0.16); color:#1DB954; border:1px solid rgba(29,185,84,0.4);">Connect Spotify</button>') +
        '</div>' +
        '<div id="spMsg" style="font-size:0.6875rem; color:var(--text-3); margin-top:8px;">' + (connected ? 'Connected. The pill updates every 20 seconds.' : '') + '</div>' +
      '</details>';
  },
  bindSupportSection() {
    const root = document.getElementById('supportSection');
    if (!root) return;
    if (!state.support) state.support = { contacts: {}, feedbackQueue: [] };
    let kind = 'idea';
    root.querySelectorAll('[data-fb-kind]').forEach(b => b.addEventListener('click', () => {
      kind = b.getAttribute('data-fb-kind');
      root.querySelectorAll('[data-fb-kind]').forEach(x => x.classList.toggle('fb-chip--on', x === b));
    }));
    const send = root.querySelector('#fbSend');
    if (send) send.addEventListener('click', () => {
      const ta = root.querySelector('#fbText'); const msg = root.querySelector('#fbMsg');
      const text = (ta && ta.value || '').trim();
      if (!text) { if (msg) msg.textContent = 'Write a few words first.'; return; }
      submitFeedback(kind, text);
      if (ta) ta.value = '';
      if (msg) msg.textContent = 'Sent. Thank you, I read every one.';
    });
    const why = root.querySelector('#whyBuilt'); const body = root.querySelector('#whyBuiltBody');
    if (why && body) why.addEventListener('click', () => { const open = body.style.display !== 'none'; body.style.display = open ? 'none' : 'block'; why.classList.toggle('is-open', !open); });
    const d = root.querySelector('#spDiscord'), e = root.querySelector('#spEmail'), g = root.querySelector('#spGuarantee');
    const saveContacts = () => {
      if (!state.support.contacts) state.support.contacts = {};
      if (d) {
        // Force http(s) only: prepend https:// to a bare domain, drop any other
        // scheme (javascript:, data:, etc) so the contact link can never be an
        // XSS sink even after sync/import.
        let v = d.value.trim();
        if (v && !/^https?:\/\//i.test(v)) v = /^[a-z][a-z0-9+.-]*:/i.test(v) ? '' : 'https://' + v;
        state.support.contacts.discord = v;
      }
      if (e) state.support.contacts.email = e.value.trim();
      try { persistNow(); } catch (x) {}
    };
    if (d) d.addEventListener('blur', saveContacts);
    if (e) e.addEventListener('blur', saveContacts);
    if (g) g.addEventListener('change', () => { if (!state.prefs) state.prefs = {}; state.prefs.guaranteeVariant = g.value; try { persistNow(); } catch (x) {} const ss = document.getElementById('supportSection'); if (ss) { ss.innerHTML = this.renderSupportSection(); this.bindSupportSection(); } });
    // Spotify settings
    const cid = root.querySelector('#spClientId');
    const saveCid = () => { if (!state.spotify) state.spotify = { clientId: '', tokens: null }; state.spotify.clientId = (cid.value || '').trim(); try { persistNow(); } catch (x) {} try { window.SpotifyNP.refreshUi(); } catch (x) {} };
    if (cid) { cid.addEventListener('blur', saveCid); cid.addEventListener('change', saveCid); }
    const spc = root.querySelector('#spConnect');
    if (spc) spc.addEventListener('click', () => { saveCid(); const msg = root.querySelector('#spMsg'); if (!(state.spotify && state.spotify.clientId)) { if (msg) msg.textContent = 'Paste your Client ID first.'; return; } try { window.SpotifyNP.connect(); } catch (x) {} });
    const spd = root.querySelector('#spDisconnect');
    if (spd) spd.addEventListener('click', () => { try { window.SpotifyNP.disconnect(); } catch (x) {} const ss = document.getElementById('supportSection'); if (ss) { ss.innerHTML = this.renderSupportSection(); this.bindSupportSection(); } });
  },

  // Account card: optional cloud sync via CloudSync (js/12, Supabase magic
  // link, no passwords). Offline-safe; the app works fully without it.
  renderAccountSection() {
    const SECLABEL = 'font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-2); margin-bottom: 12px;';
    const cs = window.CloudSync;
    if (!cs || !cs.available()) {
      return '<div style="' + SECLABEL + '">Account</div>' +
        '<div style="font-size:0.8125rem;color:var(--text-2);line-height:1.45;">Sync is offline right now. Your data is safe on this device.</div>';
    }
    if (cs.isLoggedIn()) {
      const em = esc(cs.email() || 'your account');
      const when = cs.lastSyncedText();
      return '<div style="' + SECLABEL + '">Account</div>' +
        '<div style="font-size:0.8125rem;color:var(--text-2);line-height:1.45;margin-bottom:12px;">Signed in as <b style="color:var(--text-hi);">' + em + '</b>. Your Memento syncs across devices as you use it.</div>' +
        '<div style="display:flex;align-items:center;gap:7px;font-size:0.78rem;color:var(--text-3);margin-bottom:14px;"><span style="width:6px;height:6px;border-radius:50%;background:var(--color-consistency);flex:none;"></span>Synced' + (when ? ('&nbsp;&nbsp;&middot;&nbsp;&nbsp;' + esc(when)) : '') + '</div>' +
        '<div style="display:flex; gap:8px;">' +
          '<button class="sheet-btn" id="acctSyncNow" style="flex:1; background: var(--kfill-04); color: var(--text-1); border: 1px solid rgba(var(--ink),0.08);">Sync now</button>' +
          '<button class="sheet-btn" id="acctSignout" style="flex:1; background: var(--kfill-04); color: var(--text-2); border: 1px solid rgba(var(--ink),0.08);">Sign out</button>' +
        '</div>' +
        '<div style="font-size:0.6875rem; color: var(--text-3); margin-top:8px;">Signing out keeps everything on this device.</div>' +
        '<div id="acctMsg" style="font-size:0.6875rem; color: var(--text-3); margin-top:4px;"></div>';
    }
    return '<div style="' + SECLABEL + '">Account</div>' +
      '<div style="font-size:0.8125rem;color:var(--text-2);line-height:1.45;margin-bottom:12px;">Keep your data safe across devices.</div>' +
      '<button class="sheet-btn" id="acctOpenAuth" style="background: rgba(123,97,255,0.12); color: var(--color-clarity); border: 1px solid rgba(123,97,255,0.25);">Sign in</button>' +
      '<div style="font-size:0.6875rem; color: var(--text-3); margin-top:8px;">No password. We email you a link.</div>';
  },

  // Wires the account card buttons. Re-renders just the card on state change.
  bindAccountSection() {
    const cs = window.CloudSync;
    if (!cs || !cs.available()) return;
    const sec = document.getElementById('acctSection');
    const rerender = () => { if (sec) { sec.innerHTML = this.renderAccountSection(); this.bindAccountSection(); } };
    const setMsg = (t) => { const m = document.getElementById('acctMsg'); if (m) m.textContent = t; };
    const signout = document.getElementById('acctSignout');
    const syncNow = document.getElementById('acctSyncNow');
    if (signout || syncNow) {
      if (signout) signout.addEventListener('click', async () => { setMsg('Signing out...'); try { await cs.signOut(); } catch (_) {} rerender(); });
      if (syncNow) syncNow.addEventListener('click', async () => {
        setMsg('Syncing...');
        const ok = await cs.syncNow();
        if (ok) rerender(); else setMsg('Could not reach the cloud. It will retry on its own.');
      });
      return;
    }
    const openAuth = document.getElementById('acctOpenAuth');
    if (openAuth) openAuth.addEventListener('click', () => { try { cs.openDialog(); } catch (_) {} });
  },

  renderProfile() {
    const body = document.getElementById('profileBody');
    const FIELD = 'width:100%;box-sizing:border-box;font:inherit;font-size:0.9rem;color:var(--text-hi);background:var(--surface-1);border:1px solid transparent;border-radius:calc(8px * var(--rx, 1));padding:11px 13px;outline:none;';
    const FIELDTA = FIELD + 'resize:vertical;line-height:1.5;';
    const FIELDS = 'font:inherit;font-size:0.85rem;color:var(--text-hi);background:var(--surface-1);border:1px solid transparent;border-radius:calc(6px * var(--rx, 1));padding:6px 8px;outline:none;margin-left:6px;';
    const SECLABEL = 'font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-2); margin-bottom: 12px;';
    const FLABEL = 'font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 16px 0 6px;';
    const rem = (state.prefs && state.prefs.reminder) || {};
    body.innerHTML = `
      <div style="text-align:center; padding: 32px 0 24px;">
        <div id="profAvatar" style="width: 64px; height: 64px; border-radius: 50%; background-color: rgba(123,97,255,0.15); background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-size: 1.5rem; color: var(--color-clarity); border: 1px solid var(--hairline); overflow: hidden;">${esc((state.profile.name || 'U').charAt(0).toUpperCase())}</div>
        <div style="display:flex; gap:14px; justify-content:center; margin-bottom: 14px;">
          <button type="button" id="profAvatarPick" style="font:500 0.75rem/1 inherit; cursor:pointer; border:none; background:transparent; color:var(--text-2); padding:4px 2px;">${state.profile.avatarId ? 'Change photo' : 'Add photo'}</button>
          <button type="button" id="profAvatarRemove" style="font:500 0.75rem/1 inherit; cursor:pointer; border:none; background:transparent; color:var(--text-3); padding:4px 2px; ${state.profile.avatarId ? '' : 'display:none;'}">Remove</button>
        </div>
        <input type="file" id="profAvatarFile" accept="image/*" hidden>
        <div style="font-size: 1.25rem; font-weight: 700;">${esc(state.profile.name || 'User')}</div>
        <div style="font-size: 0.875rem; color: var(--text-2); margin-top: 4px;">${esc(state.profile.email || '')}</div>
      </div>
      <div id="prefsSection" class="prefs-card">${this.renderPreferencesSection()}</div>
      <div class="prefs-card" style="padding-top: 20px; padding-bottom: 22px;">
        <div style="${SECLABEL}">Identity</div>
        <div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-3); margin: 0 0 6px;">What to call you</div>
        <input type="text" id="profName" maxlength="40" value="${esc(state.profile.name || '')}" placeholder="Nickname" style="${FIELD}" />
        <div style="${FLABEL}">Full name</div>
        <input type="text" id="profFullName" maxlength="60" value="${esc(state.profile.fullName || '')}" placeholder="First and last" style="${FIELD}" />
        <div style="${FLABEL}">Birthday${(function () { const a = (typeof ageFromBirthday === 'function') ? ageFromBirthday(state.profile.birthday) : null; return a != null ? ' <span style="text-transform:none;letter-spacing:0;color:var(--text-lo);">(' + a + ' years old)</span>' : ''; })()}</div>
        <input type="date" id="profBirthday" value="${esc(state.profile.birthday || '')}" style="${FIELD}color-scheme:dark;" />
        <div style="${FLABEL}">What you are running toward</div>
        <input type="text" id="profRunningToward" maxlength="120" value="${esc(state.profile.runningToward || '')}" placeholder="The person or life you are building" style="${FIELD}" />
        <div style="${FLABEL}">Your story</div>
        <textarea id="profStory" maxlength="600" rows="3" placeholder="A few lines on where you are and where you want to be." style="${FIELDTA}">${esc(state.profile.story || '')}</textarea>
        <div style="${FLABEL}">Letter to your future self</div>
        <textarea id="profLetter" maxlength="800" rows="3" placeholder="Write to the you reading this a year from now." style="${FIELDTA}">${esc(state.profile.letterToFutureSelf || '')}</textarea>
        <div style="font-size: 0.6875rem; color: var(--text-3); margin-top: 8px;">Saved on this device. Used across Clarity and Reflection.</div>
      </div>
      <div class="sheet-divider"></div>
      <div style="padding: 20px 0;">
        <div style="${SECLABEL}">Your return cue</div>
        <div style="font-size: 0.6875rem; color: var(--text-3); margin: 0 0 10px;">A small habit to hook this to. Memento gives it back to you the first time you open it on a new day.</div>
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:0.9rem; color:var(--text-2);">When I</span>
          <input type="text" id="profReturnCue" maxlength="80" value="${esc(state.profile.returnCue || '')}" placeholder="finish my coffee" style="${FIELD}flex:1; min-width:140px; width:auto;" />
          <span style="font-size:0.9rem; color:var(--text-2);">, I open Memento.</span>
        </div>
      </div>
      <div class="sheet-divider"></div>
      <div style="padding: 20px 0;">
        <div style="${SECLABEL}">Dashboard layout</div>
        <div style="font-size: 0.6875rem; color: var(--text-3); margin: 0 0 12px;">Reorder your modules, hide what you do not use, resize them, and save named layouts.</div>
        <button class="sheet-btn" id="prefCustomizeLayout" style="background: var(--kfill-05); color: var(--text-hi); border: 1px solid var(--hairline);">Customize dashboard</button>
      </div>
      <div class="sheet-divider"></div>
      <div style="padding: 20px 0;">
        <div style="${SECLABEL}">Daily reminder</div>
        <div class="pref-row">
          <div class="pref-row__text"><div class="pref-row__title">Daily nudge</div><div class="pref-row__sub">A gentle reminder to show up. Browser notifications fire only while a Memento tab is open.</div></div>
          <button type="button" id="prefReminderOn" class="pref-toggle${rem.enabled ? ' pref-toggle--on' : ''}" role="switch" aria-checked="${rem.enabled ? 'true' : 'false'}" aria-label="Daily nudge"><span class="pref-toggle__knob"></span></button>
        </div>
        <div style="display:flex; gap:14px; align-items:center; margin-top:12px; flex-wrap:wrap;">
          <label style="font-size:0.75rem; color:var(--text-2);">Time<input type="time" id="prefReminderTime" value="${esc(rem.time || '09:00')}" style="${FIELDS}"></label>
          <label style="font-size:0.75rem; color:var(--text-2);">Quiet from<input type="time" id="prefQuietStart" value="${esc(rem.quietStart || '22:00')}" style="${FIELDS}"></label>
          <label style="font-size:0.75rem; color:var(--text-2);">to<input type="time" id="prefQuietEnd" value="${esc(rem.quietEnd || '07:00')}" style="${FIELDS}"></label>
        </div>
        <button class="sheet-btn" id="prefNotifyEnable" style="margin-top:14px; background: rgba(123,97,255,0.12); color: var(--color-clarity); border: 1px solid rgba(123,97,255,0.25);">Enable browser notifications</button>
        <div id="prefReminderMsg" style="font-size:0.6875rem; color: var(--text-3); margin-top:8px;"></div>
      </div>
      <div class="sheet-divider"></div>
      <div style="padding: 20px 0;" id="acctSection">${this.renderAccountSection()}</div>
      <div class="sheet-divider"></div>
      <div style="padding: 20px 0;" id="supportSection">${this.renderSupportSection()}</div>
      <div class="sheet-divider"></div>
      <div style="padding: 20px 0;">
        <div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-2); margin-bottom: 12px;">Your Data</div>
        <div style="font-size: 0.8125rem; color: var(--text-2); margin-bottom: 12px; line-height: 1.4;">Your Memento lives on this device only. Download a backup so a cleared browser or a new device never erases your history.</div>
        <div style="display:flex; gap:8px;">
          <button class="sheet-btn" id="exportData" style="flex:1; background: rgba(var(--success-rgb),0.12); color: var(--color-consistency); border: 1px solid rgba(var(--success-rgb),0.25);">Download backup</button>
          <button class="sheet-btn" id="importData" style="flex:1; background: var(--kfill-04); color: var(--text-1); border: 1px solid rgba(var(--ink),0.08);">Restore</button>
        </div>
        <input type="file" id="importFile" accept="application/json,.json" style="display:none;">
        <div id="dataMsg" style="font-size:0.6875rem; color: var(--text-3); margin-top:8px; text-align:center;"></div>
        ${(function(){
          var b = (typeof getPreSyncBackup === 'function') ? getPreSyncBackup() : null;
          if (!b) return '';
          var when = '';
          try { when = new Date(b.savedAt || b.ts || Date.now()).toLocaleDateString(); } catch (e) {}
          return '<div style="margin-top:12px; background: var(--kfill-04); border-radius: calc(12px * var(--rx,1)); padding: 12px 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);">' +
            '<div style="font-size:0.8rem; color: var(--text-1); line-height:1.45; margin-bottom:10px;">Auto-saved copy from ' + when + '. If something looks off, you can roll back to it.</div>' +
            '<button class="sheet-btn" id="restoreAutoBackup" style="background: var(--kfill-04); color: var(--text-1);">Restore this</button>' +
          '</div>';
        })()}
        <div class="privacy-note" style="margin-top:14px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L4 5v6c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V5l-8-3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
          <span>Your data lives on this device. No account, no tracking. The only thing that ever leaves is what you choose to send to the optional AI. Vision-board and journal images stay on this device only, never synced. Use the backup above to move it yourself.</span>
        </div>
      </div>
      <div class="sheet-divider"></div>
      <button class="sheet-btn" id="profileReset" style="background: var(--kfill-12); color: var(--color-action); border: 1px solid rgba(var(--ink),0.25); margin-top: 24px;">Reset Everything</button>
      <div style="font-size: 0.6875rem; color: var(--text-3); text-align: center; margin-top: 12px;">This will delete all your data and start fresh.</div>
      <div style="font-size: 0.6875rem; color: var(--text-3); text-align: center; margin-top: 28px; letter-spacing: 0.06em;">Memento ${(window.MEMENTO_VERSION || '')}</div>
    `;
    // Preferences bindings (accent / reduce motion / density)
    this.bindPreferences();
    // Optional account / sync card.
    try { this.bindAccountSection(); } catch (e) {}
    try { this.bindSupportSection(); } catch (e) {}
    // Identity field edits (debounced persist). Name also refreshes the
    // sidebar profile + the top hub greeting live.
    const bindProfileField = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      let t = null;
      const commit = () => {
        state.profile[key] = el.value;
        persistNow();
        if (key === 'name') { try { if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh(); if (typeof renderGreeting === 'function') renderGreeting(); } catch (e) {} }
      };
      el.addEventListener('input', () => { state.profile[key] = el.value; clearTimeout(t); t = setTimeout(commit, 300); });
      el.addEventListener('blur', commit);
    };
    bindProfileField('profName', 'name');
    bindProfileField('profFullName', 'fullName');
    // Birthday: save on change, keep Mori's birthYear in sync, refresh the
    // panel so the age label updates live.
    (function () {
      const bd = document.getElementById('profBirthday');
      if (!bd || bd._bound) return; bd._bound = true;
      bd.addEventListener('change', () => {
        const v = bd.value || '';
        if (v && typeof ageFromBirthday === 'function' && ageFromBirthday(v) == null) return;
        state.profile.birthday = v;
        try { if (v && state.mori) state.mori.birthYear = parseInt(v.slice(0, 4), 10); } catch (e) {}
        persistNow();
        try { renderAll(); } catch (e) {}
        try { TabBar.renderProfile(); } catch (e) {}
      });
    })();
    // Profile photo: downscaled to 512px, stored in IndexedDB next to the
    // Vivere images, referenced by state.profile.avatarId. Falls back to the
    // colored initial everywhere when unset.
    (() => {
      const circle = document.getElementById('profAvatar');
      const pick = document.getElementById('profAvatarPick');
      const fileIn = document.getElementById('profAvatarFile');
      const removeBtn = document.getElementById('profAvatarRemove');
      if (!circle || !pick || !fileIn) return;
      applyProfileAvatar(circle, (state.profile.name || 'U').charAt(0).toUpperCase());
      pick.addEventListener('click', () => fileIn.click());
      fileIn.addEventListener('change', () => {
        const f = fileIn.files && fileIn.files[0];
        fileIn.value = '';
        if (!f || typeof vivDownscaleImage !== 'function' || typeof idbStore !== 'function') return;
        vivDownscaleImage(f, 512, (dataURL, w, h) => {
          if (!dataURL) { try { showComingSoonToast('Could not read that image.'); } catch (e) {} return; }
          idbStore(dataURL, w, h).then((id) => {
            if (!id) { try { showComingSoonToast('Could not save that image.'); } catch (e) {} return; }
            const old = state.profile.avatarId;
            state.profile.avatarId = id;
            persistNow();
            if (old) { try { idbDeleteImage(old); } catch (e) {} }
            applyProfileAvatar(circle, (state.profile.name || 'U').charAt(0).toUpperCase());
            pick.textContent = 'Change photo';
            if (removeBtn) removeBtn.style.display = '';
            try { if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh(); } catch (e) {}
          });
        });
      });
      if (removeBtn) removeBtn.addEventListener('click', () => {
        const old = state.profile.avatarId;
        state.profile.avatarId = null;
        persistNow();
        if (old) { try { idbDeleteImage(old); } catch (e) {} }
        applyProfileAvatar(circle, (state.profile.name || 'U').charAt(0).toUpperCase());
        pick.textContent = 'Add photo';
        removeBtn.style.display = 'none';
        try { if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh(); } catch (e) {}
      });
    })();
    bindProfileField('profRunningToward', 'runningToward');
    bindProfileField('profStory', 'story');
    bindProfileField('profLetter', 'letterToFutureSelf');
    bindProfileField('profReturnCue', 'returnCue');
    // (v27: the "Home centerpiece" selector is retired - the command center always
    // leads with Today's mission; Consistency has its own tile, the goal lives in Clarity.)
    // v19 Custom Layouts: open the Customize Dashboard sheet from settings.
    const custLayoutBtn = document.getElementById('prefCustomizeLayout');
    if (custLayoutBtn) custLayoutBtn.addEventListener('click', () => { try { if (typeof Sheet !== 'undefined' && Sheet.open) Sheet.open('layout'); } catch (e) {} });
    // Daily reminder controls.
    if (!state.prefs.reminder) state.prefs.reminder = { enabled: false, time: '09:00', quietStart: '22:00', quietEnd: '07:00' };
    const remMsg = document.getElementById('prefReminderMsg');
    const remOn = document.getElementById('prefReminderOn');
    if (remOn) remOn.addEventListener('click', () => {
      const on = !remOn.classList.contains('pref-toggle--on');
      remOn.classList.toggle('pref-toggle--on', on);
      remOn.setAttribute('aria-checked', on ? 'true' : 'false');
      state.prefs.reminder.enabled = on;
      persistNow();
      if (on && ('Notification' in window) && Notification.permission !== 'granted' && remMsg) {
        remMsg.textContent = 'Tip: enable browser notifications below so the nudge can show.';
      }
      if (typeof scheduleReminder === 'function') scheduleReminder();
    });
    const bindReminderTime = (id, key) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => { state.prefs.reminder[key] = el.value; persistNow(); if (typeof scheduleReminder === 'function') scheduleReminder(); });
    };
    bindReminderTime('prefReminderTime', 'time');
    bindReminderTime('prefQuietStart', 'quietStart');
    bindReminderTime('prefQuietEnd', 'quietEnd');
    const notifyBtn = document.getElementById('prefNotifyEnable');
    if (notifyBtn) notifyBtn.addEventListener('click', () => {
      if (!('Notification' in window)) { if (remMsg) remMsg.textContent = 'This browser does not support notifications.'; return; }
      Notification.requestPermission().then(p => {
        if (remMsg) remMsg.textContent = p === 'granted' ? 'Notifications enabled.' : p === 'denied' ? 'Notifications are blocked in your browser settings.' : 'Permission dismissed.';
        if (p === 'granted' && typeof scheduleReminder === 'function') scheduleReminder();
      }).catch(() => {});
    });
    // Data export / import bindings
    const exportBtn = document.getElementById('exportData');
    const importBtn = document.getElementById('importData');
    const importFile = document.getElementById('importFile');
    const dataMsg = document.getElementById('dataMsg');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      const ok = exportMementoData();
      if (dataMsg) dataMsg.textContent = ok ? 'Backup downloaded.' : 'Could not export.';
    });
    if (importBtn && importFile) importBtn.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (dataMsg) dataMsg.textContent = 'Restoring...';
      importMementoData(f, (ok) => {
        if (dataMsg) dataMsg.textContent = ok ? 'Restored. Reloading...' : 'That file could not be read.';
        if (ok) setTimeout(() => location.reload(), 800);
      });
    });
    // Auto-backup (the pre-sync copy CloudSync keeps) one-tap restore.
    const restoreAuto = document.getElementById('restoreAutoBackup');
    if (restoreAuto) restoreAuto.addEventListener('click', () => {
      if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return;
      const b = (typeof getPreSyncBackup === 'function') ? getPreSyncBackup() : null;
      if (!b || !b.state) { if (dataMsg) dataMsg.textContent = 'No saved copy found.'; return; }
      if (!confirm('Restore the auto-saved copy? This replaces what is on this device now.')) return;
      if (dataMsg) dataMsg.textContent = 'Restoring...';
      restoreStateObject(b.state, (ok) => {
        if (dataMsg) dataMsg.textContent = ok ? 'Restored. Reloading...' : 'That copy could not be read.';
        if (ok) setTimeout(() => location.reload(), 800);
      });
    });
    // Reset binding
    document.getElementById('profileReset').addEventListener('click', () => {
      if (confirm('Reset everything? This cannot be undone.')) {
        // One optional, skippable question on the way out (no interview, no gate).
        // sendBeacon survives the wipe + reload so it actually reaches Malik.
        try {
          const reason = prompt('Optional: what made you want to leave? This goes straight to Malik. Leave blank to skip.');
          if (reason && reason.trim()) {
            const payload = JSON.stringify({ kind: 'leaving', text: reason.trim().slice(0, 2000), ts: Date.now() });
            let sent = false;
            try { if (navigator.sendBeacon) sent = navigator.sendBeacon('/api/feedback', new Blob([payload], { type: 'application/json' })); } catch (e) {}
            if (!sent) { try { fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }); } catch (e) {} }
          }
        } catch (e) {}
        // True clean slate: wipe ALL Memento data on this origin (state,
        // backend session token/name/email, saved API key). Clearing the whole
        // store guarantees nothing lingers to skip onboarding, and ending the
        // session means boot cannot re-pull or re-push old data. The reload then
        // lands on the splash + onboarding from the very beginning.
        // IS_RESETTING blocks the pagehide/visibilitychange flush from
        // re-persisting the in-memory state after the wipe (that was silently
        // restoring the old account and skipping onboarding).
        IS_RESETTING = true;
        try { localStorage.clear(); } catch (_) { try { localStorage.removeItem(APP_KEY); } catch (_) {} }
        // Reload to the CLEAN url (drop ?demo=... and any other query). A plain
        // reload keeps ?demo=founder, which re-seeds a fully-onboarded demo
        // persona and silently undoes the reset. pathname-only lands on the
        // real splash + onboarding from the very beginning.
        location.href = location.pathname;
      }
    });
  }
};

/* ============================================
   LOGIN
   ============================================ */
function initLogin() {
  const overlay = document.getElementById('loginScreen');
  if (state.meta.onboarded) {
    overlay.classList.add('hidden');
    return;
  }
  overlay.classList.remove('hidden');

  const nameInput = document.getElementById('loginName');
  const emailInput = document.getElementById('loginEmail');
  const startBtn = document.getElementById('loginStart');

  function validateForm() {
    const hasName = nameInput.value.trim().length > 0;
    const hasEmail = emailInput.value.trim().includes('@');
    if (hasName && hasEmail) {
      startBtn.classList.add('active');
    } else {
      startBtn.classList.remove('active');
    }
  }

  nameInput.addEventListener('input', validateForm);
  emailInput.addEventListener('input', validateForm);

  startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    if (!name || !email.includes('@')) return;
    state.profile.name = name;
    state.profile.email = email;
    state.meta.onboarded = true;
    persistNow();
    overlay.classList.add('hidden');
    WelcomeIntro.open();
  });
}

/* ============================================
   DATA EXPORT / IMPORT (local backup)
   ============================================ */
// Downloads the full state wrapped with a schema version + timestamp so a
// cleared browser or new device does not erase the user's history.
function exportMementoData() {
  if (DEMO_MODE) return false;
  try {
    const payload = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'memento-backup-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) { return false; }
}

// Restores from a backup file. Tolerates both the wrapped shape and a raw
// state object. Always deepMerges onto DEFAULT_STATE so a backup from an older
// schema restores gracefully instead of breaking on missing fields.
function importMementoData(file, onDone) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = (parsed && parsed.state && typeof parsed.state === 'object') ? parsed.state : parsed;
      restoreStateObject(incoming, onDone);
    } catch (e) { onDone && onDone(false); }
  };
  reader.onerror = () => onDone && onDone(false);
  reader.readAsText(file);
}

// Shared restore core for both the file import and the auto-backup row. Tolerates an
// older schema (deepMerges onto DEFAULT_STATE then runs the migration chain) and
// guards against a non-Memento object wiping everything.
function restoreStateObject(incoming, onDone) {
  try {
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('bad state');
    const KNOWN = ['clarity', 'action', 'streak', 'meta', 'profile'];
    if (!KNOWN.some(k => k in incoming)) throw new Error('not a Memento backup');
    state = deepMerge(DEFAULT_STATE, incoming);
    try { migrateClarityHistory(); } catch (e) {}
    try { migrateState(); } catch (e) {}
    persistNow();
    onDone && onDone(true);
  } catch (e) { onDone && onDone(false); }
}

// The auto-backup CloudSync writes before adopting a cloud copy (js/12 BACKUP_KEY).
// Surfaced in Settings so a user can roll back without opening the console.
function getPreSyncBackup() {
  try {
    const raw = localStorage.getItem('memento_pre_sync_backup');
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.state || typeof obj.state !== 'object') return null;
    return obj;
  } catch (e) { return null; }
}

/* ============================================
   SPLASH CONTROLLER
   ============================================ */
const Splash = {
  el: null,
  card: null,
  canvas: null,
  ctx: null,
  animId: null,
  beams: [],

  init() {
    this.el = document.getElementById('splash');
    this.card = document.getElementById('splashCard');
    this.canvas = document.getElementById('splashCanvas');
    if (!this.el) return;
    // Always show splash on every open  - even for returning users
    this.el.classList.remove('dismissed', 'splash--exiting');
    this._dismissing = false;
    // ONLY the Get started button dismisses (tap-anywhere made the whole
    // screen a misfire surface). iOS Safari does not reliably fire 'click'
    // inside fixed full-screen layers, so bind touchend too; dismiss() is
    // guarded so firing on both events only runs once.
    const go = document.getElementById('splashGetStarted');
    if (go) {
      go.addEventListener('click', (e) => { e.preventDefault(); this.dismiss(); });
      go.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.dismiss(); }, { passive: false });
      // Cursor-following highlight: feed the pointer position to the CSS radial.
      go.addEventListener('pointermove', (e) => {
        const r = go.getBoundingClientRect();
        go.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        go.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    }
    this.initBeams();
  },

  initBeams() {
    // No comet on splash anymore
  },

  animate() {
  },

  stopBeams() {
    if (this._borderInterval) {
      clearInterval(this._borderInterval);
      this._borderInterval = null;
    }
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  },

  dismiss() {
    if (!this.el || this._dismissing || this.el.classList.contains('dismissed')) return;
    this._dismissing = true;

    const isReturning = state.meta.welcomeSeen;

    // If the user has a Neutron Star summary or Action view persisted, skip
    // the new-user welcome flow and go straight to the returning-user path so
    // restoreLastView fires.
    const hasRestorable = state.ui && state.ui.lastView && (state.ui.lastView === 'claritySummary' || state.ui.lastView === 'action');
    const treatAsReturning = isReturning || hasRestorable;

    if (!treatAsReturning) {
      // First time: slow fade out, then the welcome intro. The "choose your look"
      // picker now lives INSIDE the welcome, right after "Welcome to Memento", so
      // the rest of onboarding + the first blank Memento wear the chosen style.
      this.el.classList.add('splash--exiting');
      setTimeout(() => {
        WelcomeIntro.open();
      }, 1300);
      setTimeout(() => {
        this.el.classList.add('dismissed');
        this.stopBeams();
        if (!state.meta.onboarded) {
          state.meta.onboarded = true;
          persistNow();
        }
      }, 1800);
    } else {
      // Returning user: standard exit
      this.el.classList.add('splash--exiting');
      setTimeout(() => {
        this.el.classList.add('dismissed');
        this.stopBeams();
      }, 1220);
      setTimeout(() => {
        if (!state.meta.onboarded) {
          state.meta.onboarded = true;
          persistNow();
        }
        const app = document.getElementById('app');
        app.classList.add('app--entering');
        app.style.opacity = '1';
        TabBar.show();
        renderAll();
        setTimeout(() => app.classList.remove('app--entering'), 1200);
        document.getElementById('ambientBg')?.classList.add('loaded');
        // After the dashboard is up, restore the last view if there is one.
        setTimeout(() => restoreLastView(), 100);
        // Morning ritual: offered once the dashboard is settled, never over a
        // restored experience (the guard inside checks for open surfaces).
        setTimeout(() => { try { if (typeof maybeOfferMorningRitual === 'function') maybeOfferMorningRitual(); } catch (_) {} }, 1400);
      }, 1320);
    }
  }
};

// Open a lightweight in-place editor for the Neutron Star + supporting why.
// Used by the Refine button on the Clarity summary so the user can tweak
// their goal text directly without being dragged back through the wizard.
// When saved, this also invalidates any existing Action plan so it
// regenerates on next visit against the updated goal.
function openNeutronStarRefineDialog(onClose) {
  if (document.getElementById('nsRefineDialog')) return; // already open
  const ns  = (state.clarity?.answers?.neutronStar || '').trim();
  const why = (state.clarity?.answers?.coreWhy || state.clarity?.answers?.whyItMatters || '').trim();
  const overlay = document.createElement('div');
  overlay.id = 'nsRefineDialog';
  overlay.className = 'ns-refine-overlay';
  overlay.innerHTML = `
    <div class="ns-refine-dialog" role="dialog" aria-label="Refine your Neutron Star">
      <button class="ns-refine-dialog__close" type="button" aria-label="Close">&times;</button>
      <div class="ns-refine-dialog__eyebrow">REFINE YOUR NEUTRON STAR</div>
      <div class="ns-refine-dialog__sub">Tweak the wording. The plan rebuilds against the new goal.</div>
      <label class="ns-refine-dialog__label" for="nsRefineGoal">Your Neutron Star</label>
      <textarea id="nsRefineGoal" class="ns-refine-dialog__input" rows="3" placeholder="What's the real goal?">${esc(ns)}</textarea>
      <label class="ns-refine-dialog__label" for="nsRefineWhy">Why it matters <span class="ns-refine-dialog__optional">(optional)</span></label>
      <textarea id="nsRefineWhy" class="ns-refine-dialog__input" rows="3" placeholder="The deeper reason this matters to you.">${esc(why)}</textarea>
      <div class="ns-refine-dialog__actions">
        <button class="ns-refine-dialog__cancel" type="button">Cancel</button>
        <button class="ns-refine-dialog__save" type="button">Save changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  const close = () => {
    overlay.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => { try { overlay.remove(); } catch (_) {} }, 280);
    if (typeof onClose === 'function') { try { onClose(); } catch (_) {} }
  };
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
  document.addEventListener('keydown', onKey);
  overlay.querySelector('.ns-refine-dialog__close').addEventListener('click', close);
  overlay.querySelector('.ns-refine-dialog__cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('.ns-refine-dialog__save').addEventListener('click', () => {
    const newNs  = (overlay.querySelector('#nsRefineGoal')?.value || '').trim();
    const newWhy = (overlay.querySelector('#nsRefineWhy')?.value || '').trim();
    if (newNs.length < 4) {
      // Was a silent return with no feedback. Briefly flag the field instead.
      const ta = overlay.querySelector('#nsRefineGoal');
      if (ta) { ta.style.boxShadow = '0 0 0 2px rgba(255,90,90,0.7)'; setTimeout(() => { ta.style.boxShadow = ''; }, 1200); }
      return;
    }
    state.clarity = state.clarity || { answers: {} };
    state.clarity.answers = state.clarity.answers || {};
    const prevWhy = state.clarity.answers.coreWhy || '';
    const goalChanged = (newNs !== ns);
    if (goalChanged) state.clarity.answers.neutronStar = newNs;
    if (newWhy) {
      state.clarity.answers.coreWhy = newWhy;
      state.clarity.answers.whyItMatters = newWhy;
    }
    // Record a Journey/drift snapshot when the goal or why actually changed, so
    // edits made through this dialog (the primary edit path) show up in the
    // drift timeline. The full-wizard finalize already snapshots; this did not.
    if (goalChanged || (newWhy && newWhy !== prevWhy)) {
      try { snapshotClarityRun(); } catch (_) {}
    }
    // Force the Action plan to regenerate against the new goal next time
    // the user opens the action module.
    if (state.action) {
      state.action.planSourceNeutronStar = '';
      state.action.planGenerated = false;
    }
    try { persistNow(); } catch (_) {}
    close();
    // Re-render the summary so the updated text shows immediately.
    try {
      if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen && ClarityExperience.renderSummary) {
        ClarityExperience.renderSummary();
      } else if (typeof renderAll === 'function') {
        renderAll();
      }
    } catch (_) {}
  });

  // Focus the first textarea on open
  setTimeout(() => overlay.querySelector('#nsRefineGoal')?.focus(), 220);
}

// Restore the persisted "last view" after splash dismisses. Only summary + action
// are restored - mid-wizard refreshes intentionally land on the dashboard so the
// user can bail out cleanly.
function restoreLastView() {
  try {
    const v = state.ui && state.ui.lastView;
    if (!v) return;
    const hasSummaryContent = state.clarity && (state.clarity.completed || (state.clarity.answers && state.clarity.answers.neutronStar));
    if (v === 'claritySummary' && hasSummaryContent) {
      ClarityExperience.openSummary();
    } else if (v === 'action') {
      ActionExperience.open();
    } else {
      state.ui.lastView = null;
      persistNow();
    }
  } catch (e) {}
}

/* ============================================
   PARALLAX CONTROLLER
   ============================================ */
const Parallax = {
  ticking: false,
  init() {
    // IntersectionObserver for widget reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.widget').forEach(w => {
      w.style.opacity = '0';
      w.style.transform = 'translateY(20px)';
      w.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      // Clear the inline reveal styles once the fade is done so the CSS
      // hover (transform: scale(1.02) with its own 0.15s transition) can
      // take over. Backstop timeout covers the case where the widget was
      // already in view at load time and no transitionend ever fires.
      const cleanup = () => {
        w.style.transition = '';
        w.style.transform = '';
        w.style.opacity = '';
      };
      w.addEventListener('transitionend', function once(e) {
        if (e.propertyName !== 'opacity') return;
        cleanup();
        w.removeEventListener('transitionend', once);
      });
      setTimeout(cleanup, 1200);
      observer.observe(w);
    });
  }
};

/* ============================================
   BACKGROUND BEAMS (converging to top-left)
   ============================================ */
const BgBeams = {
  canvas: null, ctx: null, animId: null, beams: [],

  init() {
    this.canvas = document.getElementById('bgCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Create beams  - mix of colored + white, all converge to top-left
    const colors = [
      { r: 123, g: 97, b: 255 },  // purple (clarity)
      { r: 56, g: 189, b: 248 },  // blue (flow)
      { r: 255, g: 59, b: 48 },   // red (action)
      { r: 191, g: 90, b: 242 },  // magenta (reflection)
      { r: 255, g: 159, b: 10 },  // orange (deepwork)
      { r: 180, g: 180, b: 220 }, // pale (neutral)
    ];

    this.beams = [];
    for (let c = 0; c < colors.length; c++) {
      const numStrands = 3;
      for (let s = 0; s < numStrands; s++) {
        this.beams.push({
          color: colors[c],
          phase1: Math.random() * Math.PI * 2,
          phase2: Math.random() * Math.PI * 2,
          speed1: 0.3 + Math.random() * 0.4,
          speed2: 0.2 + Math.random() * 0.3,
          freq1: 0.8 + Math.random() * 0.6,
          freq2: 0.5 + Math.random() * 0.5,
          amp1: 30 + Math.random() * 80,
          amp2: 20 + Math.random() * 50,
          yOffset: (Math.random() - 0.5) * 200,
          lineWidth: s === 0 ? (2 + Math.random() * 2) : (0.5 + Math.random() * 1.5),
          opacity: s === 0 ? (0.3 + Math.random() * 0.2) : (0.1 + Math.random() * 0.15),
          // Each beam originates from a different edge position
          originAngle: (c / colors.length) * Math.PI * 0.8 + Math.random() * 0.3,
        });
      }
    }

    this.animate(0);
  },

  animate(timestamp) {
    const t = timestamp * 0.001;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ctx = this.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    // Convergence point: top-left area
    const cx = w * 0.08;
    const cy = h * 0.06;

    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';

    const steps = 70;

    this.beams.forEach(beam => {
      const { r, g, b } = beam.color;
      const pts = new Float32Array((steps + 1) * 2);

      // Origin: spread around the right/bottom edges
      const angle = beam.originAngle;
      const dist = Math.max(w, h) * 1.3;
      const ox = cx + Math.cos(angle) * dist;
      const oy = cy + Math.sin(angle) * dist;

      for (let i = 0; i <= steps; i++) {
        // pct: 0 = far edge (origin), 1 = convergence point
        const pct = i / steps;
        // Flowing inward effect: phase shifts with time
        const flowOffset = t * beam.speed1 * 2;
        const chaos = (1 - pct) * (1 - pct);
        const wave1 = Math.sin(flowOffset + pct * beam.freq1 * 5 + beam.phase1) * beam.amp1;
        const wave2 = Math.cos(flowOffset * 0.7 + pct * beam.freq2 * 4 + beam.phase2) * beam.amp2;

        // Perpendicular offset for waves
        const dx = cx - ox;
        const dy = cy - oy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / len; // perpendicular normal
        const ny = dx / len;

        const baseX = ox + (cx - ox) * pct;
        const baseY = oy + (cy - oy) * pct;
        const offset = (wave1 + wave2) * chaos;

        pts[i * 2] = baseX + nx * offset;
        pts[i * 2 + 1] = baseY + ny * offset;
      }

      // Haze pass
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i <= steps; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      const hazeGrad = ctx.createLinearGradient(ox, oy, cx, cy);
      hazeGrad.addColorStop(0, `rgba(${r},${g},${b},${beam.opacity * 0.02})`);
      hazeGrad.addColorStop(0.5, `rgba(${r},${g},${b},${beam.opacity * 0.05})`);
      hazeGrad.addColorStop(0.9, `rgba(${r},${g},${b},${beam.opacity * 0.08})`);
      hazeGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.strokeStyle = hazeGrad;
      ctx.lineWidth = beam.lineWidth * 10;
      ctx.stroke();

      // Core pass
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i <= steps; i++) ctx.lineTo(pts[i * 2], pts[i * 2 + 1]);
      const coreGrad = ctx.createLinearGradient(ox, oy, cx, cy);
      coreGrad.addColorStop(0, `rgba(${r},${g},${b},${beam.opacity * 0.1})`);
      coreGrad.addColorStop(0.4, `rgba(${r},${g},${b},${beam.opacity * 0.4})`);
      coreGrad.addColorStop(0.85, `rgba(${r},${g},${b},${beam.opacity * 0.7})`);
      coreGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.strokeStyle = coreGrad;
      ctx.lineWidth = beam.lineWidth;
      ctx.stroke();
    });

    // Convergence glow at top-left
    ctx.globalCompositeOperation = 'source-over';
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    glowGrad.addColorStop(0, 'rgba(200,180,255,0.15)');
    glowGrad.addColorStop(0.3, 'rgba(160,140,220,0.06)');
    glowGrad.addColorStop(0.6, 'rgba(120,100,180,0.02)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 240, 240);

    this.animId = requestAnimationFrame((t) => this.animate(t));
  },

  stop() {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
  }
};

// Shared WebGL blob shader source
const BLOB_VSRC = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;
const BLOB_FSRC = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
  vec2 i1;i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0,i1.y,1.))+i.x+vec3(0,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m=m*m;m=m*m;
  vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}
float sdf_roundsquare(vec2 p, float r) {
  vec2 d = abs(p) - vec2(0.38);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
void main(){
  vec2 uv = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;
  uv.x *= u_res.x / u_res.y;
  float t = u_time * 0.15;
  float d = sdf_roundsquare(uv, 0.12);
  float mask = 1.0 - smoothstep(-0.01, 0.015, d);
  float border = smoothstep(0.02, 0.0, abs(d + 0.005));
  vec3 borderCol = 0.5 + 0.5 * cos(t * 3.0 + uv.xyx * 4.0 + vec3(0, 2, 4));
  float n1 = snoise(uv * 1.8 + vec2(t * 0.7, t * 0.5));
  float n2 = snoise(uv * 2.5 + vec2(-t * 0.6, t * 0.8));
  float n3 = snoise(uv * 1.2 + vec2(t * 0.4, -t * 0.3));
  float n4 = snoise(uv * 3.0 + vec2(t * 0.9, t * 0.2));
  vec3 c1 = vec3(0.25, 0.1, 0.55);
  vec3 c2 = vec3(0.15, 0.2, 0.7);
  vec3 c3 = vec3(0.85, 0.85, 0.95);
  vec3 c4 = vec3(0.1, 0.6, 0.65);
  vec3 c5 = vec3(0.6, 0.35, 0.7);
  vec3 col = mix(c1, c2, smoothstep(-0.5, 0.5, n1));
  col = mix(col, c3, smoothstep(-0.3, 0.6, n2));
  col = mix(col, c4, smoothstep(-0.2, 0.7, n3) * 0.6);
  col = mix(col, c5, smoothstep(0.0, 0.8, n4) * 0.4);
  float spec = smoothstep(0.3, 0.0, length(uv - vec2(-0.1, 0.15)));
  col += vec3(1.0) * spec * 0.25;
  float innerShadow = smoothstep(0.0, 0.35, -d);
  col *= 0.7 + 0.3 * innerShadow;
  vec3 final = col * mask;
  float alpha = mask;
  gl_FragColor = vec4(final, alpha);
}`;
