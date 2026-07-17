/* ───────────────────────────────────────────────────────────────────────────
   ClarityPaywall — the payment moment, shown the first time someone finishes
   Clarity, names their Neutron Star, and walks the First 7 Days page.

   v792 layout (the Relic, Malik's pick from the paywall labs):
   big pure glass card with a cyan under-glow, "Build your Memento.", the
   features as glass chips, ONE visible plan (Founder's Lifetime, first 250
   only) with the other plans collapsed behind a disclosure, the CTA carrying
   its own fine print, the guarantee, and Maybe later as the ONLY exit.

   This is the only hard paywall: Clarity is the free first win, Action +
   Consistency + everything else are paid. The "Unlock" button is a placeholder
   (no billing backend yet) and just flips state.entitlements.isPaid.
   ─────────────────────────────────────────────────────────────────────────── */

const ClarityPaywall = {
  _open: false,

  // ONE place to change money (prices can move over time; the founder tier is
  // genuinely capped, after the first N buyers the price becomes the anchor).
  _PRICING: {
    anchor: 400,      // lifetime price after the founder window
    founder: 250,     // founder's lifetime, pay once
    founderCap: 250,  // "first 250 people only"
    yearly: 200,
    monthly: 25
  },

  // Social proof ships HIDDEN until the numbers are real. The layout below is
  // ready; flip this once real users + real quotes exist. Fake proof NEVER
  // renders in production.
  _SHOW_PROOF: false,
  _PROOF: { count: 0, quote: '', who: '' },

  // Has the user paid / been granted everything?
  isPaid() {
    try { return !!(state.entitlements && state.entitlements.isPaid); } catch (e) { return false; }
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
              '<span class="cpw__relic-glow"></span>' +
              '<div class="cpw__relic-card">' +
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
            '<span><b>The Locked-In Guarantee.</b> Show up for 30 days. If your life isn\'t measurably moving, email me and I refund every cent, and you keep the app. Drifting stays free.</span>' +
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

      // Plan picker (visual only, no charge). Picking a plan re-writes the
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

      document.body.style.overflow = 'hidden';
      void ov.offsetWidth;
      ov.classList.add('cpw--open');
    } catch (e) { this._open = false; }
  },

  // Placeholder unlock: no billing backend yet. Flip the flag, persist, and
  // reveal the now-unlocked app behind the screen.
  _unlock() {
    try {
      if (!state.entitlements) state.entitlements = { isPaid: false, paidAt: null, plan: '' };
      state.entitlements.isPaid = true;
      state.entitlements.paidAt = Date.now();
      const picked = document.querySelector('#clarityPaywall [data-plan].is-picked');
      state.entitlements.plan = picked ? (picked.getAttribute('data-plan') || 'founder') : 'founder';
      if (typeof persistNow === 'function') persistNow();
      try { if (typeof Analytics !== 'undefined') Analytics.track('paywall_unlock', { plan: state.entitlements.plan }); } catch (e) {} // Funnel
      try { window.MementoPush && MementoPush.sync(); } catch (e) {} // reminder context: now paid
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
    if (clarityDone) setTimeout(() => {
      try { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); } catch (e) {}
    }, 460);
  },

  hide() {
    const ov = document.getElementById('clarityPaywall');
    this._open = false;
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
