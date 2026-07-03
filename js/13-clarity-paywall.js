/* ───────────────────────────────────────────────────────────────────────────
   ClarityPaywall — the payment moment, shown the first time someone finishes
   Clarity and names their Neutron Star. The living Memento card blooms purple
   (clarity is the one pillar lit), their goal sits beneath it, and every other
   module is shown locked until they unlock Memento.

   This is the only hard paywall: Clarity is the free first win, Action +
   Consistency + everything else are paid. The "Unlock" button is a placeholder
   (no billing backend yet) and just flips state.entitlements.isPaid.
   ─────────────────────────────────────────────────────────────────────────── */

const ClarityPaywall = {
  _open: false,

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

  // The living Memento card markup, identical to renderDayCard's living theme,
  // built standalone so it does not depend on #dayCard being on screen.
  _cardHTML(name) {
    const blobs = '<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><i class="blob b4"></i><i class="blob b5"></i><i class="blob b6"></i>';
    const emblem = '<svg class="daycard-ns__emblem" viewBox="0 0 512 512" aria-hidden="true"><path d="M150 146 L256 252 L362 146 L362 366 L150 366 Z"/></svg>';
    const nm = this._esc((name || '').trim());
    const ns =
      '<div class="daycard-ns">' +
        '<span class="daycard-ns__liquid" aria-hidden="true">' + blobs + '</span>' +
        '<span class="daycard-ns__iri" aria-hidden="true"></span>' +
        '<span class="daycard-ns__sheen" aria-hidden="true"></span>' +
        '<span class="daycard-ns__burn" aria-hidden="true"></span>' +
        '<div class="daycard-ns__body">' + emblem + '</div>' +
        '<div class="daycard-ns__foot"><span class="daycard-ns__name">' + nm + '</span></div>' +
      '</div>';
    return '<div class="daycard-wrap daycard-theme-living">' +
        '<span class="daycard-wrap__aura" aria-hidden="true"></span>' +
        '<div class="daycard-living-stage">' +
          '<span class="daycard-bloom" aria-hidden="true">' + blobs + '</span>' +
          '<span class="daycard-floor" aria-hidden="true">' + blobs + '</span>' +
          ns +
        '</div>' +
      '</div>';
  },

  // Force the card to pure clarity (purple), regardless of action/consistency,
  // and push the glow harder than the dashboard default so this moment really
  // blooms (the dashboard tuning is deliberately restrained; this is the climax).
  _setPureClarity(wrap) {
    if (!wrap) return;
    wrap.style.setProperty('--clar', '1.000');
    wrap.style.setProperty('--act', '0.000');
    wrap.style.setProperty('--cons', '0.000');
    wrap.style.setProperty('--mix', '0.000');
    wrap.style.setProperty('--lit', '1.000');
    wrap.style.setProperty('--glow', '0.85');
    wrap.style.setProperty('--ring', '0.55');
    wrap.style.setProperty('--emit', '1.15');
    wrap.style.setProperty('--sat', '1.75');
  },

  _lockSvg: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',

  _modules: [
    { name: 'Action', sub: 'Your one move a day', wide: true,
      ico: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { name: 'Consistency', sub: 'Your streak',
      ico: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-2-1-4-1-7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' },
    { name: 'Memento Mori', sub: 'Your time, visualized',
      ico: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { name: 'Memento Vivere', sub: 'Your vision board',
      ico: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M4 15l4-4 3 3 3-4 6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { name: 'Notes', sub: 'Reflections & proof',
      ico: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.7"/><path d="M9 9h6M9 13h6M9 17h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>' }
  ],

  _modulesHTML() {
    return this._modules.map((m) =>
      '<div class="cpw__mod' + (m.wide ? ' cpw__mod--wide' : '') + '">' +
        '<span class="cpw__mod-ico">' + m.ico + '</span>' +
        '<span class="cpw__mod-txt"><span class="cpw__mod-name">' + this._esc(m.name) + '</span>' +
          '<span class="cpw__mod-sub">' + this._esc(m.sub) + '</span></span>' +
        '<span class="cpw__mod-lock">' + this._lockSvg + '</span>' +
      '</div>'
    ).join('');
  },

  show(opts) {
    try {
      if (this._open || document.getElementById('clarityPaywall')) return;
      this._open = true;
      opts = opts || {};
      try { if (typeof Analytics !== 'undefined') Analytics.track('paywall_shown'); } catch (e) {} // Funnel

      const prof = (state && state.profile) || {};
      const ans = (state && state.clarity && state.clarity.answers) || {};
      const star = opts.star || ans.neutronStar || 'The one thing that actually matters to you.';
      const name = prof.name || '';

      const shieldSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L4 5v6c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V5l-8-3z" stroke="rgba(108,198,255,0.9)" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="rgba(108,198,255,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      const ov = document.createElement('div');
      ov.id = 'clarityPaywall';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-label', 'Unlock Memento');
      ov.innerHTML =
        '<button type="button" class="cpw__close" id="cpwClose" aria-label="Close">&times;</button>' +
        '<div class="cpw__scroll">' +
          '<div class="cpw__hero">' +
            '<div class="cpw__eyebrow">You found it</div>' +
            '<div class="cpw__card">' + this._cardHTML(name) + '</div>' +
            '<div class="cpw__star-wrap">' +
              '<div class="cpw__star-cap">Your Neutron Star</div>' +
              '<div class="cpw__star">' + this._esc(star) + '</div>' +
            '</div>' +
          '</div>' +

          '<p class="cpw__bridge">Clarity is yours, and it is the foundation. <b>Everything else in Memento is built to turn it into a life you actually live.</b></p>' +

          '<div class="cpw__locked">' +
            '<div class="cpw__locked-head">' +
              '<span class="cpw__locked-title">Locked until you unlock</span>' +
              '<span class="cpw__locked-note">Built on your clarity</span>' +
            '</div>' +
            '<div class="cpw__grid">' + this._modulesHTML() + '</div>' +
          '</div>' +

          '<div class="cpw__offer">' +
            '<div class="cpw__offer-head">' +
              '<span class="cpw__offer-title">Unlock everything</span>' +
              '<span class="cpw__offer-note">Own it once</span>' +
            '</div>' +
            '<div class="cpw__plans" role="radiogroup" aria-label="Choose your plan">' +
              '<button type="button" class="cpw__plan cpw__plan--hero is-picked" data-plan="lifetime" role="radio" aria-checked="true">' +
                '<span class="cpw__plan-flag">Most people pick this</span>' +
                '<div class="cpw__plan-label">The Lock-In System</div>' +
                '<div class="cpw__plan-sub">Everything, yours forever. No subscription.</div>' +
                '<div class="cpw__plan-amt"><span class="cpw__plan-cur">$</span><span class="cpw__plan-big">99</span><span class="cpw__plan-meta">once</span></div>' +
                '<p class="cpw__plan-hsub"><b>Cheaper than a year of any app it replaces.</b> Pay once, keep it for life, never see a renewal.</p>' +
              '</button>' +
              '<button type="button" class="cpw__plan cpw__plan--flat" data-plan="founder" role="radio" aria-checked="false">' +
                '<div><div class="cpw__plan-label">Founder\'s Edition</div><div class="cpw__plan-sub">Founder access and every future update</div></div>' +
                '<div class="cpw__plan-right cpw__plan-amt"><span class="cpw__plan-cur">$</span><span class="cpw__plan-big">199</span></div>' +
              '</button>' +
              '<button type="button" class="cpw__plan cpw__plan--flat" data-plan="plan" role="radio" aria-checked="false">' +
                '<div><div class="cpw__plan-label">Pay in 3</div><div class="cpw__plan-sub">Same system, interest-free</div></div>' +
                '<div class="cpw__plan-right cpw__plan-amt"><span class="cpw__plan-cur">3 x $</span><span class="cpw__plan-big">39</span></div>' +
              '</button>' +
            '</div>' +
          '</div>' +

          '<div class="cpw__cta">' +
            '<button type="button" class="cpw__buy" id="cpwBuy">Unlock Memento</button>' +
            '<button type="button" class="cpw__skip" id="cpwSkip">Maybe later</button>' +
          '</div>' +

          '<div class="cpw__trust">' +
            '<div class="cpw__guarantee">' + shieldSvg +
              '<span><b>The Still-Drifting Guarantee.</b> Do the work for 30 days. If you come out the other side as lost as you started, email me and I refund every cent. You have 60 days to decide.</span>' +
            '</div>' +
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

      // pure-purple living card + calm drift
      const wrap = ov.querySelector('.daycard-wrap');
      this._setPureClarity(wrap);
      try { if (typeof startLivingWander === 'function') startLivingWander(wrap); } catch (e) {}

      // tier picker (visual only, no charge)
      ov.querySelectorAll('.cpw__plan').forEach((pl) => {
        pl.addEventListener('click', () => {
          ov.querySelectorAll('.cpw__plan').forEach((x) => { x.classList.remove('is-picked'); x.setAttribute('aria-checked', 'false'); });
          pl.classList.add('is-picked'); pl.setAttribute('aria-checked', 'true');
        });
      });

      const buy = ov.querySelector('#cpwBuy');
      if (buy) buy.addEventListener('click', () => this._unlock());
      const skip = ov.querySelector('#cpwSkip');
      if (skip) skip.addEventListener('click', () => this.hide());
      const closeX = ov.querySelector('#cpwClose');
      if (closeX) closeX.addEventListener('click', () => this.hide());

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
      const picked = document.querySelector('#clarityPaywall .cpw__plan.is-picked');
      state.entitlements.plan = picked ? (picked.getAttribute('data-plan') || 'lifetime') : 'lifetime';
      if (typeof persistNow === 'function') persistNow();
      try { if (typeof Analytics !== 'undefined') Analytics.track('paywall_unlock', { plan: state.entitlements.plan }); } catch (e) {} // Funnel
      try { window.MementoPush && MementoPush.sync(); } catch (e) {} // reminder context: now paid
    } catch (e) {}
    this.hide();
    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
    // The buyer's first minute (FIRST-WIN-PLAN P3): never drop a fresh buyer on
    // the dashboard to figure out "now what?". Go straight into Action, which
    // routes itself (intro -> intake -> plan) to their ONE move for today. The
    // beat matches the paywall's 360ms fade so the two never overlap.
    setTimeout(() => {
      try { if (typeof ActionExperience !== 'undefined') ActionExperience.open(); } catch (e) {}
    }, 460);
  },

  hide() {
    const ov = document.getElementById('clarityPaywall');
    this._open = false;
    if (!ov) return;
    try { if (typeof stopLivingWander === 'function') stopLivingWander(); } catch (e) {}
    ov.classList.remove('cpw--open');
    document.body.style.overflow = '';
    setTimeout(() => { try { ov.remove(); } catch (e) {} }, 360);
  }
};

// Dev / preview helper: open the paywall on demand with ?paywall=1 (and an
// optional demo star), without walking all of Clarity.
try {
  if (/[?&]paywall=1/.test(location.search)) {
    const m = location.search.match(/[?&]star=([^&]+)/);
    const star = m ? decodeURIComponent(m[1]) : '';
    window.addEventListener('load', () => { setTimeout(() => ClarityPaywall.show(star ? { star } : {}), 400); });
  }
} catch (e) {}
