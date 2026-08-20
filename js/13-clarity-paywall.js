/* ───────────────────────────────────────────────────────────────────────────
   ClarityPaywall — the payment moment, shown the first time someone finishes
   Clarity, names their Neutron Star, and walks the First 7 Days page.

   v792 layout (the Relic, Malik's pick from the paywall labs):
   big pure glass card with a cyan under-glow, "Build your Memento.", the
   features as glass chips, ONE visible plan (Founder's Lifetime, first 200
   only) with the other plans collapsed behind a disclosure, the CTA carrying
   its own fine print, the guarantee, and Maybe later as the ONLY exit.

   This is the only hard paywall: Clarity is the free first win, Action +
   Consistency + everything else are paid. Checkout is handled by the
   server-verified Polar billing bridge in js/22-billing.js.
   ─────────────────────────────────────────────────────────────────────────── */

const ClarityPaywall = {
  _open: false,

  // ONE place to change money (prices can move over time; the founder tier is
  // genuinely capped, after the first N buyers the price becomes the anchor).
  _PRICING: {
    anchor: 1000,     // lifetime price after the founder window
    founder: 500,     // founder's lifetime, pay once
    founderCap: 200,  // "first 200 people only"
    yearly: 300,
    monthly: 30
  },

  // Social proof ships HIDDEN until the numbers are real. The layout below is
  // ready; flip this once real users + real quotes exist. Fake proof NEVER
  // renders in production.
  _SHOW_PROOF: false,
  _PROOF: { count: 0, quote: '', who: '' },

  // ===========================================================================
  // DEV BYPASS - DELETE THIS WHOLE BLOCK BEFORE LAUNCH
  // ---------------------------------------------------------------------------
  // Malik, 2026-08-03: "a button that unlocks Memento and shows me exactly what
  // happens after someone buys." Deliberately NOT a visible button: the paywall
  // is the one screen where money happens, and a stray "admin access" control is
  // the worst possible thing to forget to remove.
  //
  // Trigger: five taps on the founder avatar (the little M) inside the paywall,
  // within half a second of each other. A customer cannot find that; he can do
  // it on the installed phone app, where there is no URL to edit.
  //
  // It touches NOTHING in js/22-billing.js. It only makes the UI gate answer
  // yes, the same way an official demo does, so the server still decides every
  // real paid request. And it EXPIRES ON ITS OWN, so a forgotten deletion
  // cannot ship: after the date below every line here is inert.
  //
  // To remove: delete this block, delete the _devUnlocked() line in isPaid(),
  // delete the _wireDevBypass(ov) call in show(). Three deletions, all marked.
  _DEV_BYPASS_UNTIL: '2026-09-30',
  _devUnlocked() {
    try {
      if (new Date().toISOString().slice(0, 10) > this._DEV_BYPASS_UNTIL) return false;
      return localStorage.getItem('memento_dev_unlock') === '1';
    } catch (e) { return false; }
  },
  _wireDevBypass(ov) {
    try {
      if (new Date().toISOString().slice(0, 10) > this._DEV_BYPASS_UNTIL) return;
      const tap = ov.querySelector('.cpw__founder-av');
      if (!tap) return;
      let n = 0, last = 0;
      tap.style.cursor = 'default';
      tap.addEventListener('click', () => {
        const now = Date.now();
        n = (now - last < 500) ? n + 1 : 1;
        last = now;
        if (n < 5) return;
        n = 0;
        try { localStorage.setItem('memento_dev_unlock', '1'); } catch (e) {}
        // The REAL post-purchase path, not an imitation of it: same ceremony,
        // same shove into Action, same everything a buyer gets.
        this._applyVerifiedUnlock({ plan: 'founder' });
      });
    } catch (e) {}
  },
  // ===== END DEV BYPASS ======================================================

  // Has the user paid / been granted everything?
  isPaid() {
    try {
      if (this._devUnlocked()) return true; // DEV BYPASS - delete before launch
      // Official demos may imitate the paid UI, but server-side billing still
      // decides whether any paid AI request is authorized.
      if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return true;
      return !!(window.PolarBilling
        && PolarBilling.hasVerifiedAccess
        && PolarBilling.hasVerifiedAccess());
    } catch (e) { return false; }
  },

  // Modules other than Clarity are locked once Clarity is done and they have not
  // paid. Before Clarity (brand new) nothing is "locked" by the paywall, the
  // normal pre-star dashboard handles that.
  isLockedByPaywall(key) {
    if (key === 'clarity') return false;
    if (this.isPaid()) return false;
    try { return !!(state.clarity && state.clarity.completed); } catch (e) { return false; }
  },

  _esc(str) {
    if (typeof esc === 'function') return esc(str);
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  },

  // The CTA's fine print per plan (lives inside the button, Opal-style).
  _fineFor(plan) {
    const P = this._PRICING;
    if (plan === 'yearly') return '$' + P.yearly + ' a year &middot; $' + (P.yearly / 365).toFixed(2) + ' a day';
    if (plan === 'monthly') return '$' + P.monthly + ' a month &middot; cancel anytime';
    return '$' + P.founder + ' once &middot; yours forever';
  },

  show(opts) {
    try {
      opts = opts || {};
      // Already unlocked (early buyer, restored purchase, second device): the
      // paywall never shows again. Dev previews pass { force: true }.
      if (this.isPaid() && !opts.force) return;
      if (this._open || document.getElementById('clarityPaywall')) return;
      this._open = true;
      // Clear any leftover card-evolution cinema state so it can't leak into the
      // paywall (body.evo2 scaled + boxed the screen when the cinema was
      // interrupted, Malik v674). Finish a live run, then strip the classes.
      try {
        if (typeof _cardEvolutionRunning !== 'undefined' && _cardEvolutionRunning && typeof _evoFinish === 'function') {
          _evoFinish(document.getElementById('dayCard'), null, {});
        }
      } catch (e) {}
      try {
        document.body.classList.remove('evo2', 'evo2-surge', 'evo2-orb', 'stage-cinema');
        window._evoStageOverride = null;
      } catch (e) {}
      try { if (typeof Analytics !== 'undefined') Analytics.track('paywall_shown'); } catch (e) {} // Funnel

      const P = this._PRICING;
      const shieldSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L4 5v6c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V5l-8-3z" stroke="rgba(108,198,255,0.9)" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="rgba(108,198,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const chip = (label) => '<span class="cpw__chip">' + label + '</span>';

      // Social proof slot: layout ready, hidden until the numbers are real.
      let proofHtml = '';
      if (this._SHOW_PROOF && this._PROOF.count > 0) {
        proofHtml =
          '<div class="cpw__proof">' +
            '<span class="cpw__proof-avs" aria-hidden="true"><i></i><i></i><i></i></span>' +
            '<span class="cpw__proof-count">' + this._PROOF.count + ' people building theirs</span>' +
            (this._PROOF.quote ? '<p class="cpw__proof-quote">&ldquo;' + this._esc(this._PROOF.quote) + '&rdquo;<span class="cpw__proof-who">' + this._esc(this._PROOF.who) + '</span></p>' : '') +
          '</div>';
      }

      const ov = document.createElement('div');
      ov.id = 'clarityPaywall';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-label', 'Unlock Memento');
      ov.innerHTML =
        '<div class="cpw__scroll">' +
          '<div class="cpw__hero cpw__hero--v3">' +
            '<div class="cpw__relic" aria-hidden="true">' +
              '<span class="cpw__relic-spill"></span>' +
              '<div class="cpw__relic-card">' +
                '<span class="cpw__relic-liquid">' +
                  '<span class="cpw__relic-blob b1"></span>' +
                  '<span class="cpw__relic-blob b2"></span>' +
                  '<span class="cpw__relic-blob b3"></span>' +
                  '<span class="cpw__relic-blob b4"></span>' +
                  '<span class="cpw__relic-blob b5"></span>' +
                '</span>' +
                '<svg class="cpw__relic-m" viewBox="0 0 512 512"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>' +
              '</div>' +
            '</div>' +
            '<h1 class="cpw__h1">Build your Memento.</h1>' +
            '<div class="cpw__chips">' +
              chip('Refined clarity') +
              chip('One move a day') +
              chip('Streaks') +
              chip('Memento Mori') +
              chip('Themes') +
              '<span class="cpw__chip cpw__chip--more">+ everything after</span>' +
            '</div>' +
            proofHtml +
          '</div>' +

          '<div class="cpw__offer3" role="radiogroup" aria-label="Choose your plan">' +
            '<button type="button" class="cpw__plan3 is-picked" data-plan="founder" role="radio" aria-checked="true">' +
              '<div class="cpw__plan3-top">' +
                '<span class="cpw__plan3-name">Founder&rsquo;s Lifetime</span>' +
                '<span class="cpw__plan-flag2">First ' + P.founderCap + ' only</span>' +
              '</div>' +
              '<div class="cpw__plan3-price">' +
                '<span class="cpw__plan3-was">$' + P.anchor + '</span>' +
                '<span class="cpw__plan3-now">$' + P.founder + '</span>' +
                '<span class="cpw__plan3-per">once, yours for life</span>' +
              '</div>' +
            '</button>' +
            '<button type="button" class="cpw__more" id="cpwMore" aria-expanded="false" aria-controls="cpwMorePlans">Other plans <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<div class="cpw__moreplans" id="cpwMorePlans" hidden>' +
              '<button type="button" class="cpw__plan cpw__plan--row" data-plan="yearly" role="radio" aria-checked="false">' +
                '<span class="cpw__radio" aria-hidden="true"></span>' +
                '<div class="cpw__plan-main"><div class="cpw__plan-label">Yearly</div><div class="cpw__plan-sub">$' + (P.yearly / 365).toFixed(2) + ' a day</div></div>' +
                '<div class="cpw__plan-amt"><span class="cpw__plan-cur">$</span><span class="cpw__plan-big">' + P.yearly + '</span><span class="cpw__plan-meta">/yr</span></div>' +
              '</button>' +
              '<button type="button" class="cpw__plan cpw__plan--row" data-plan="monthly" role="radio" aria-checked="false">' +
                '<span class="cpw__radio" aria-hidden="true"></span>' +
                '<div class="cpw__plan-main"><div class="cpw__plan-label">Monthly</div><div class="cpw__plan-sub">Cancel anytime</div></div>' +
                '<div class="cpw__plan-amt"><span class="cpw__plan-cur">$</span><span class="cpw__plan-big">' + P.monthly + '</span><span class="cpw__plan-meta">/mo</span></div>' +
              '</button>' +
            '</div>' +
          '</div>' +

          '<div class="cpw__cta">' +
            '<button type="button" class="cpw__buy cpw__buy--fine" id="cpwBuy">' +
              '<span class="cpw__buy-main">Unlock Memento</span>' +
              '<span class="cpw__buy-sub" id="cpwBuyFine">' + this._fineFor('founder') + '</span>' +
            '</button>' +
            '<div class="cpw__speed">Your first move is five minutes away.</div>' +
          '</div>' +
          '<div class="cpw__guarantee cpw__guarantee--v2">' + shieldSvg +
            '<span><b>The Locked-In Guarantee.</b> Try Memento for 30 days. If it is not for you, request a full refund in the app during your first 30 days. Complete your primary Action on all 30 days and that window stays open 7 more days. A full refund ends your paid access.</span>' +
          '</div>' +
          '<button type="button" class="cpw__skip" id="cpwSkip">Maybe later</button>' +

          '<div class="cpw__trust cpw__trust--v2">' +
            '<div class="cpw__founder">' +
              '<span class="cpw__founder-av">M</span>' +
              '<p>I built this because I watched years almost slip past me on autopilot. I priced it once so it never becomes another bill you forget about. If it does not move you, take the refund.' +
                '<span class="cpw__founder-who">Malik, founder of Memento</span></p>' +
            '</div>' +
            '<div class="cpw__legal">' +
              '<a href="legal/terms.html" target="_blank" rel="noopener">Terms</a>' +
              '<span aria-hidden="true">&middot;</span>' +
              '<a href="legal/privacy.html" target="_blank" rel="noopener">Privacy</a>' +
            '</div>' +
          '</div>' +
        '</div>';

      document.body.appendChild(ov);

      // Picking a plan re-writes the
      // fine print inside the CTA so the button always states the real deal.
      const fine = ov.querySelector('#cpwBuyFine');
      ov.querySelectorAll('[data-plan]').forEach((pl) => {
        pl.addEventListener('click', () => {
          ov.querySelectorAll('[data-plan]').forEach((x) => { x.classList.remove('is-picked'); x.setAttribute('aria-checked', 'false'); });
          pl.classList.add('is-picked'); pl.setAttribute('aria-checked', 'true');
          if (fine) fine.innerHTML = this._fineFor(pl.getAttribute('data-plan'));
        });
      });

      // "Other plans" disclosure (Opal-style): one price on screen, the rest
      // one tap away for the people who need a smaller yes.
      const more = ov.querySelector('#cpwMore');
      const morePlans = ov.querySelector('#cpwMorePlans');
      if (more && morePlans) more.addEventListener('click', () => {
        const open = morePlans.hasAttribute('hidden');
        if (open) morePlans.removeAttribute('hidden'); else morePlans.setAttribute('hidden', '');
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
        more.classList.toggle('is-open', open);
        if (!open) {
          // Collapsing returns the pick to the founder plan so the CTA never
          // quotes a price the screen no longer shows.
          const f = ov.querySelector('.cpw__plan3');
          if (f && !f.classList.contains('is-picked')) f.click();
        }
      });

      const buy = ov.querySelector('#cpwBuy');
      if (buy) buy.addEventListener('click', () => this._unlock());
      const skip = ov.querySelector('#cpwSkip');
      if (skip) skip.addEventListener('click', () => this.hide());
      this._wireDevBypass(ov); // DEV BYPASS - delete before launch

      document.body.style.overflow = 'hidden';
      void ov.offsetWidth;
      ov.classList.add('cpw--open');
    } catch (e) { this._open = false; }
  },

  // Checkout never grants access directly. The billing bridge sends the user
  // to Polar, then calls _applyVerifiedUnlock only after the server confirms
  // the purchase belongs to this signed-in account.
  _unlock() {
    const picked = document.querySelector('#clarityPaywall [data-plan].is-picked');
    const plan = picked ? (picked.getAttribute('data-plan') || 'founder') : 'founder';
    try {
      if (window.PolarBilling && PolarBilling.startCheckout) {
        PolarBilling.startCheckout(plan);
      }
    } catch (e) {}
  },

  _applyVerifiedUnlock(access) {
    // Whether this is the MOMENT of buying (the paywall is on screen) or just
    // an already-paid account arriving on a new device. Captured before
    // hide() flips it. Only the buying moment gets the ceremony and the
    // shove into Action; Malik signed in on his iPad (2026-08-01) and got
    // re-thanked for paying, which is wrong: a sign-in is not a purchase.
    const buyingMoment = !!this._open;
    try {
      const plan = access && access.plan ? access.plan : '';
      try { if (typeof Analytics !== 'undefined') Analytics.track('paywall_unlock', { plan }); } catch (e) {} // Funnel
      try { window.MementoPush && MementoPush.sync(); } catch (e) {} // reminder context: now paid
      // notifications phase C: payment ARMS the reminder pre-prompt. It does
      // not prompt here. js/20 shows Memento's own card at the first open of
      // the installed app (the only place iOS can deliver), and the OS prompt
      // fires only if they tap Turn on.
      try { window.MementoPush && MementoPush.armPostPayment && MementoPush.armPostPayment(); } catch (e) {}
    } catch (e) {}
    this.hide();
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    // If they unlocked from the You panel (early buy), re-render it so the
    // "Unlock Memento" row disappears immediately.
    try {
      const pp = document.getElementById('panelProfile');
      if (pp && !pp.classList.contains('hidden') && typeof TabBar !== 'undefined') TabBar.renderPanel('profile');
    } catch (e) {}
    // The buyer's first minute (FIRST-WIN-PLAN P3): never drop a fresh buyer on
    // the dashboard to figure out "now what?". Go straight into Action, which
    // routes itself (intro -> intake -> plan) to their ONE move for today. The
    // beat matches the paywall's 360ms fade so the two never overlap.
    // Early buyers who unlock BEFORE running Clarity stay where they are: the
    // pre-star home already points them at Clarity, and Action needs a star.
    let clarityDone = false;
    try { clarityDone = !!(state.clarity && state.clarity.completed); } catch (e) {}
    // v1026: the first thing their money buys is watching their own card come
    // alive under their thumb. The unlock ceremony plays once (its CTA routes
    // a Clarity finisher into Action, a pre-Clarity buyer back home toward the
    // star); the old direct ActionExperience.open() is the fallback if the
    // ceremony module is ever missing.
    if (!buyingMoment) return; // new-device sign-in: unlocked quietly, no re-celebration
    const alreadySeen = !!(state.meta && state.meta.unlockCeremonySeen);
    if (typeof UnlockCeremony !== 'undefined' && !alreadySeen) {
      setTimeout(() => {
        try { UnlockCeremony.show({ clarityDone }); } catch (e) {
          if (clarityDone) { try { ActionExperience.open(); } catch (e2) {} }
        }
      }, 460);
    } else if (clarityDone) setTimeout(() => {
      try { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); } catch (e) {}
    }, 460);
  },

  hide() {
    const ov = document.getElementById('clarityPaywall');
    this._open = false;
    // v1001: the paywall is a dismissible overlay, so whatever sits under it
    // MUST be a screen the user can actually land on. Several paths raise it
    // over an app that was deliberately faded to opacity 0 (boot restore is
    // the one Malik hit: the saved view was Action, Action's open() bounced
    // off this paywall, and nothing ever faded the app back in). Dismissing
    // then showed an empty screen. Runs before the !ov guard so it fires on
    // every dismissal path, and only when no real module is open, since those
    // own the fade themselves.
    try {
      const opened =
        (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) ||
        (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) ||
        !!document.querySelector('.sheet.open, #n7dRoot');
      if (!opened) {
        const app = document.getElementById('app');
        if (app && getComputedStyle(app).opacity !== '1') app.style.opacity = '1';
      }
    } catch (e) {}
    if (!ov) return;
    ov.classList.remove('cpw--open');
    document.body.style.overflow = '';
    setTimeout(() => { try { ov.remove(); } catch (e) {} }, 360);
  }
};

// Dev / preview helper: open the paywall on demand with ?paywall=1 (and an
// optional demo star), without walking all of Clarity. force so it shows even
// on a paid dev state.
try {
  if (/[?&]paywall=1/.test(location.search)) {
    window.addEventListener('load', () => { setTimeout(() => ClarityPaywall.show({ force: true }), 400); });
  }
} catch (e) {}
