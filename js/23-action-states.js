/* DEV-ONLY Action state browser.
   Visit the app with ?dev=action for a panel that jumps to every screen the
   Action module can show: each intake beat, the decode loader, all verdict
   variants, every loop tier, the completion beats, the error screens, and a
   day simulator (day 1 / 47 / 150, gaps, rest rhythms). Built so Malik can
   SEE every state instead of discovering the ugly ones on-device.
   Fully gated: without ?dev=action this file returns immediately and ships
   completely inert. Not linked from anywhere in the product. */
(function () {
  if (window.__MEMENTO_DEV_AUTHORIZED__ !== true) return;
  function qp(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }
  if (qp('dev') !== 'action') return;

  var TIERS = {
    tiny: 'Message one past user',
    light: 'Message three potential users',
    moderate: 'Have one user call',
    heavy: 'Have three user calls',
    extreme: 'Talk to five users today'
  };
  var TK = ['tiny', 'light', 'moderate', 'heavy', 'extreme'];

  function ready() {
    return typeof ActionExperience !== 'undefined' && typeof state !== 'undefined' && state && state.action;
  }

  // Pin the overlay open so background renders can never yank a state away
  // mid-look. Unpinned when the panel closes.
  function pinOpen() {
    if (!ActionExperience.__asbClose) {
      ActionExperience.__asbClose = ActionExperience.close;
      ActionExperience.close = function () {};
    }
    // Entitlement is server-verified since the payment enforcement, so a dev
    // fixture cannot fake paid and every state bounced to the paywall. This
    // panel exists to LOOK at screens, so while it is open the gate reports
    // paid. Dev-gated file, restored on hide, never ships to a user path.
    try {
      if (typeof ClarityPaywall !== 'undefined' && !ClarityPaywall.__asbPaid) {
        ClarityPaywall.__asbPaid = ClarityPaywall.isPaid;
        ClarityPaywall.isPaid = function () { return true; };
        ClarityPaywall.__asbLocked = ClarityPaywall.isLockedByPaywall;
        ClarityPaywall.isLockedByPaywall = function () { return false; };
      }
      var ov = document.getElementById('clarityPaywall'); if (ov) ov.remove();
      // Belt with the stamp fix: while the panel is open, NO state may kick
      // off a real plan generation. In a dev context the call fails and the
      // renderContent retry has no backoff, so one stray trigger spins the
      // tab dead. Fixture states never need generation anyway.
      if (typeof generateActionDraft === 'function' && !window.__asbGen) {
        window.__asbGen = generateActionDraft;
        window.generateActionDraft = function () {
          try { actionAiLoading = false; } catch (e) {}
          return Promise.resolve(null);
        };
      }
    } catch (e) {}
  }
  function unpin() {
    if (ActionExperience.__asbClose) {
      ActionExperience.close = ActionExperience.__asbClose;
      ActionExperience.__asbClose = null;
    }
    try {
      if (typeof ClarityPaywall !== 'undefined' && ClarityPaywall.__asbPaid) {
        ClarityPaywall.isPaid = ClarityPaywall.__asbPaid; ClarityPaywall.__asbPaid = null;
        ClarityPaywall.isLockedByPaywall = ClarityPaywall.__asbLocked; ClarityPaywall.__asbLocked = null;
      }
      if (window.__asbGen) { window.generateActionDraft = window.__asbGen; window.__asbGen = null; }
    } catch (e) {}
  }

  // One believable plan fixture. Every state renders on top of this.
  function seedPlan(overrides) {
    state.isPaid = true;
    state.meta = state.meta || {};
    state.meta.next7DaysSeen = true;
    state.meta.unlockBeatSeen = true;
    state.meta.planRevealSeen = true;
    state.clarity = state.clarity || {};
    state.clarity.completed = true;
    state.clarity.answers = Object.assign(state.clarity.answers || {}, {
      neutronStar: 'Get my product to 100 paying users who would be genuinely upset if it disappeared',
      timeHorizon: '12 months', timeframe: '12 months'
    });
    state.action.introSeen = true;
    state.action.tutorialSeen = true;
    state.action.intake = { completed: true, phase: 'done', answers: {}, aiMessages: [], aiHistory: [] };
    state.action.planGenerated = true;
    state.action.primaryAction = Object.assign({
      missionId: 'asb_m1',
      title: 'Talk to three users about why they signed up',
      why: 'You are guessing until you hear it in their words. Three conversations beat a week of building.',
      shape: 'lever',
      recommendedTier: 'moderate',
      tiers: TIERS,
      tierTime: { tiny: '5 min', light: '20 min', moderate: '30 min', heavy: '90 min', extreme: '3 hrs' },
      tierDone: { tiny: 'One message sent.', light: 'Three messages sent.', moderate: 'One call done, notes written.', heavy: 'Three calls done.', extreme: 'Five conversations logged.' },
      howToStart: 'Send one message right now to the last person who signed up. Just ask what made them try it.',
      ifStuck: 'Send a voice note instead of asking for a call.',
      verdict: 'confirmed',
      verdictReason: 'You said you talk to users every day and ship every week, that IS the move, just needs a weekly count on it.',
      path: [
        { horizon: '12 months', milestone: '100 paying users who would riot if it vanished', looksLike: 'Renewals arrive without you chasing them.', bridge: 'Weekly user calls compounding into the roadmap.', signal: 'Ten unprompted messages about the product in one month.' },
        { horizon: '3 months', milestone: '25 paying users from direct conversations', looksLike: 'A call a day is normal now.', bridge: 'Five conversations a week, every week.', signal: '25 paid and each one talked to you first.' },
        { horizon: 'this week', milestone: 'Five user conversations logged', looksLike: 'Notes from five real people in the doc.', bridge: 'One call booked each morning before anything else.', signal: 'Five sets of notes, dated this week.' }
      ]
    }, overrides || {});
    // The plan must be stamped with the star it was built from, or
    // actionPlanMatchesClarity() reports stale and renderContent kicks off a
    // REAL generation (which fails in a dev context and retries in a tight
    // loop, freezing the tab; found the hard way).
    state.action.planSourceNeutronStar = state.clarity.answers.neutronStar;
    state.action.selectedTier = 'moderate';
    // Full loop reset every seed: a previous state's lastOpenDay/closedDays
    // leaking forward made later states render the wrong screen.
    state.action.loop = { lastOpenDay: '', closedDays: {}, nextAction: '', chained: '' };
  }

  // Kill everything a previous state left in flight: tracked module timers
  // (green flood schedules the capture screen 2.1s out) and the narrowing
  // loop. Without this, clicking state B mid-choreography of state A lets
  // A's timer repaint B's screen.
  function resetInFlight() {
    try { ActionExperience._clearTimers(); } catch (e) {}
    try {
      if (ActionExperience._narrowTimer) { clearTimeout(ActionExperience._narrowTimer); ActionExperience._narrowTimer = null; }
      if (ActionExperience._narrowWatch) { clearTimeout(ActionExperience._narrowWatch); ActionExperience._narrowWatch = null; }
      ActionExperience._narrowToken = (ActionExperience._narrowToken || 0) + 1;
    } catch (e) {}
  }

  // Seed N days of history with a keep-pattern, then reseal the ledger.
  // pattern: function(dayIndexFromStart) -> 'done' | 'missed' | tierKey
  function seedDays(n, pattern) {
    var hist = [];
    for (var d = n; d >= 1; d--) {
      var i = n - d;
      var p = pattern ? pattern(i) : 'moderate';
      if (p === 'missed') continue;
      var tier = (TK.indexOf(p) >= 0) ? p : 'moderate';
      hist.push({
        id: 'asb' + d, missionId: 'asb_m1', clarityGoal: 'g',
        date: new Date(Date.now() - d * 86400000).toISOString(),
        tier: tier, actionText: TIERS[tier], planTitle: state.action.primaryAction.title
      });
    }
    state.action.completionHistory = hist;
    state.action.ledger = [];
    try { actionLedgerBackfill(); } catch (e) {}
  }

  function openExp() {
    pinOpen();
    try { ActionExperience.open(); } catch (e) {}
    document.querySelectorAll('.n7d').forEach(function (n) { n.remove(); });
  }

  function intakeAt(phase, fn) {
    // Seed the star FIRST: the recap derivation falls back to the doors when
    // clarity has no neutronStar, which is exactly the fresh-page case (Malik
    // hit this live; my local tab had a star left over from other states).
    seedPlan();
    state.action.intake = { phase: 'summary', aiMessages: [], aiHistory: [], answers: {}, completed: false, aiSnapshot: { goalConfirm: '', timeframe: '', pastProgress: '', mainMove: '' } };
    state.action.introSeen = true;
    state.action.planGenerated = false;
    state.action.plan = null;
    // _doorsLive survives from a previous doors/capacity click and makes the
    // view derivation skip the recap beat entirely; _recapTyped would skip
    // the typewriter. Both are per-open flags, reset them per state.
    ActionExperience._doorsLive = false;
    ActionExperience._recapTyped = false;
    openExp();
    try { ActionExperience._startAiIntake(); ActionExperience._renderIntakeFromState(); } catch (e) {}
    if (fn) setTimeout(fn, 350);
  }

  // Walk to door 2's first question. dailyMinutes 0 = Clarity never captured a
  // number (the chip ladder); a number = the "still true?" confirm.
  function capacityState(dailyMinutes) {
    intakeAt('summary', function () {
      state.clarity.answers.dailyTime = dailyMinutes || '';
      var b = document.getElementById('missionConfirmBtn'); if (b) b.click();
      setTimeout(function () {
        var doors = document.querySelectorAll('.door-card');
        if (doors[1]) doors[1].click();
        setTimeout(function () { var go = document.getElementById('doorGo'); if (go) go.click(); }, 250);
      }, 350);
    });
  }

  var STATES = [
    ['INTAKE', [
      ['Star recap (Quick Reminder)', function () { intakeAt('summary'); }],
      ['The two doors', function () {
        intakeAt('summary', function () {
          var b = document.getElementById('missionConfirmBtn'); if (b) b.click();
        });
      }],
      // The capacity question has two faces, and which one you get depends on
      // whether Clarity captured a daily-time number. Both are browsable.
      ['Capacity: no number yet (chips)', function () { capacityState(0); }],
      ['Capacity: confirm their number', function () { capacityState(45); }],
      ['Door 1: name your own move', function () {
        intakeAt('summary', function () {
          var b = document.getElementById('missionConfirmBtn'); if (b) b.click();
          setTimeout(function () {
            var doors = document.querySelectorAll('.door-card');
            if (doors[0]) doors[0].click();
            setTimeout(function () { var go = document.getElementById('doorGo'); if (go) go.click(); }, 250);
          }, 350);
        });
      }],
      ['Thinking dots', function () {
        intakeAt('summary');
        // The intake host paints asynchronously (recap typewriter); poll for
        // it instead of firing once into a DOM that is not there yet.
        var tries = 0;
        (function put() {
          var host = document.querySelector('.action-intake__current');
          if (host) { host.innerHTML = ActionExperience._thinkingBeatHtml(); return; }
          if (tries++ < 12) setTimeout(put, 250);
        })();
      }]
    ]],
    ['LOADING', [
      ['Decode noise (working)', function () {
        seedPlan(); openExp();
        try { ActionExperience._renderNarrowing(); } catch (e) {}
        if (ActionExperience._narrowWatch) { clearTimeout(ActionExperience._narrowWatch); ActionExperience._narrowWatch = null; }
      }],
      ['Decode resolving into the move', function () {
        seedPlan(); openExp();
        var rc = ActionExperience.renderContent;
        ActionExperience.renderContent = function () {};
        try { ActionExperience._renderNarrowing(); } catch (e) {}
        setTimeout(function () { ActionExperience.renderContent = rc; }, 4000);
      }]
    ]],
    ['REVEAL', [
      ['Verdict: confirmed', function () {
        seedPlan(); state.meta.planRevealSeen = false; openExp();
        try { ActionExperience._renderVerdictBeat(); } catch (e) {}
      }],
      ['Verdict: replaced (Keep my version)', function () {
        seedPlan({ verdict: 'replaced', verdictReason: 'Two months of edits and the doc still has a title page and nothing else, the writing is not the bottleneck.' });
        state.meta.planRevealSeen = false; openExp();
        try { ActionExperience._renderVerdictBeat(); } catch (e) {}
      }],
      ['Verdict: upgraded', function () {
        seedPlan({ verdict: 'upgraded', verdictReason: 'Posting is right, posting WITH the signup link is the direct form of the same move.' });
        state.meta.planRevealSeen = false; openExp();
        try { ActionExperience._renderVerdictBeat(); } catch (e) {}
      }]
    ]],
    ['DAILY LOOP', [
      ['Loop: tiny', function () { seedPlan(); state.action.selectedTier = 'tiny'; seedDays(5); openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {} }],
      ['Loop: moderate', function () { seedPlan(); seedDays(5); openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {} }],
      ['Loop: extreme', function () { seedPlan(); state.action.selectedTier = 'extreme'; seedDays(5); openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {} }],
      ['Chained next action', function () {
        seedPlan(); seedDays(5);
        state.action.loop.chained = 'Send the recap doc to the two founders from today';
        openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {}
      }],
      ['Green flood (just completed)', function () {
        seedPlan(); seedDays(5); openExp();
        // Push today's completion first so the "That is one." count is real,
        // then play the flood exactly as _loopComplete would (it rolls into
        // the capture screen on its own timer, which is the true choreography).
        var completion = { id: 'asbToday', missionId: 'asb_m1', clarityGoal: 'g', date: new Date().toISOString(), tier: 'moderate', actionText: TIERS.moderate, planTitle: state.action.primaryAction.title };
        state.action.completionHistory.push(completion);
        try { ActionExperience._renderGreenFlood(TIERS.moderate, completion); } catch (e) {}
      }],
      ['Capture (one line about it)', function () {
        seedPlan(); seedDays(5); openExp();
        var c = { id: 'x', missionId: 'asb_m1', tier: 'moderate', actionText: TIERS.moderate, date: new Date().toISOString() };
        try { ActionExperience._renderCapture(c); } catch (e) {}
      }],
      ['Today so far (done state)', function () {
        seedPlan(); seedDays(5, function () { return 'moderate'; });
        state.action.completionHistory.push({ id: 'today', missionId: 'asb_m1', clarityGoal: 'g', date: new Date().toISOString(), tier: 'moderate', actionText: TIERS.moderate, planTitle: state.action.primaryAction.title });
        openExp(); try { ActionExperience._renderTodaySoFar(); } catch (e) { try { ActionExperience._renderDailyLoop(); } catch (e2) {} }
      }],
      ['Morning open (new day rotation)', function () {
        seedPlan(); seedDays(8);
        state.action.loop.lastOpenDay = actionDayKey(new Date(Date.now() - 86400000));
        ActionExperience._morningShownFor = null;
        openExp(); try { ActionExperience._renderMorningOpen(); } catch (e) { try { ActionExperience._renderDailyLoop(); } catch (e2) {} }
      }]
    ]],
    ['DAY SIMULATOR', [
      ['Day 1 (first ever)', function () { seedPlan(); seedDays(0); openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {} }],
      ['Day 7, all kept', function () { seedPlan(); seedDays(6); openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {} }],
      // Note: the Day number on the card counts days KEPT (Malik decision 11),
      // so a 47-day span at 75% shows Day 36. Labels describe the span.
      ['47 days in, 75% kept', function () { seedPlan(); seedDays(46, function (i) { return (i % 4 === 3) ? 'missed' : 'moderate'; }); openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {} }],
      ['150 days in, highs and lows', function () {
        seedPlan();
        seedDays(149, function (i) {
          if (i > 60 && i < 67) return 'missed';
          if (i % 5 === 4) return 'missed';
          return i < 50 ? 'moderate' : (i < 100 ? 'light' : 'heavy');
        });
        openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {}
      }],
      ['After a 6-day gap', function () {
        seedPlan(); seedDays(30, function (i) { return i >= 24 ? 'missed' : 'moderate'; });
        openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {}
      }],
      ['2-on-1-off rest rhythm', function () {
        seedPlan(); seedDays(21, function (i) { return (i % 3 === 2) ? 'missed' : 'heavy'; });
        openExp(); try { ActionExperience._renderDailyLoop(); } catch (e) {}
      }]
    ]],
    ['ERRORS', [
      ['Generation failed (human copy)', function () {
        seedPlan();
        state.action.planGenerated = false;
        state.action.primaryAction = null;
        actionAiLoading = false;
        actionChatError = 'The request timed out (504).';
        openExp(); try { ActionExperience.renderContent(); } catch (e) {}
      }],
      ['Not this action (quiet exit)', function () {
        seedPlan(); seedDays(5); openExp();
        try { ActionExperience._renderDailyLoop(); } catch (e) {}
        setTimeout(function () {
          var btn = document.querySelector('.aloop-reject, [data-aloop-reject], .aloop-not');
          if (!btn) {
            btn = Array.prototype.find.call(document.querySelectorAll('button, .aloop *'), function (el) { return /not this action/i.test(el.textContent || '') && el.children.length === 0; });
          }
          if (btn) btn.click();
        }, 600);
      }]
    ]]
  ];

  function buildPanel() {
    var css = 'position:fixed;top:0;right:0;bottom:0;width:228px;z-index:99999;overflow-y:auto;' +
      'background:rgba(10,11,14,0.97);color:#dfe4ee;font:12px/1.5 -apple-system,sans-serif;' +
      'padding:10px 10px calc(env(safe-area-inset-bottom,0px) + 24px);border-left:1px solid rgba(255,255,255,0.1);';
    var p = document.createElement('div');
    p.id = 'asbPanel';
    p.setAttribute('style', css);
    var head = document.createElement('div');
    head.setAttribute('style', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;');
    head.innerHTML = '<b style="font-size:12px;letter-spacing:0.04em;">ACTION STATES</b>';
    var x = document.createElement('button');
    x.textContent = 'hide';
    x.setAttribute('style', 'background:none;border:1px solid rgba(255,255,255,0.2);color:#dfe4ee;border-radius:6px;padding:2px 8px;font-size:11px;');
    // hide collapses the panel to LOOK at the state fullscreen; the pin must
    // survive that or the surface bounces to the paywall the moment you hide.
    // The whole page is a dev URL, so the pin lives as long as the tab does.
    x.onclick = function () { p.style.display = 'none'; tab.style.display = 'block'; };
    head.appendChild(x);
    p.appendChild(head);

    STATES.forEach(function (group) {
      var h = document.createElement('div');
      h.textContent = group[0];
      h.setAttribute('style', 'margin:10px 0 4px;font-size:10px;letter-spacing:0.08em;color:#8b93a7;');
      p.appendChild(h);
      group[1].forEach(function (item) {
        var b = document.createElement('button');
        b.textContent = item[0];
        b.setAttribute('style', 'display:block;width:100%;text-align:left;margin:3px 0;padding:7px 9px;' +
          'background:rgba(255,255,255,0.06);border:none;border-radius:8px;color:#dfe4ee;font-size:12px;cursor:pointer;');
        b.onclick = function () {
          resetInFlight();
          try { item[1](); } catch (e) { console.warn('[asb]', item[0], e); }
        };
        p.appendChild(b);
      });
    });

    var tab = document.createElement('button');
    tab.textContent = 'states';
    tab.setAttribute('style', 'position:fixed;right:8px;top:40%;z-index:99998;display:none;' +
      'background:rgba(10,11,14,0.95);color:#dfe4ee;border:1px solid rgba(255,255,255,0.15);' +
      'border-radius:8px;padding:8px 10px;font-size:12px;');
    tab.onclick = function () { p.style.display = 'block'; tab.style.display = 'none'; };
    document.body.appendChild(tab);
    document.body.appendChild(p);
  }

  var tries = 0;
  (function wait() {
    if (ready()) return buildPanel();
    if (tries++ < 100) setTimeout(wait, 200);
  })();
})();
