// ============================================================================
// 21-descent.js — THE DEEPER ROOM (MORI-VIVERE-DESCENT-PLAN.md, v836)
// Two paid, once-ever, full-screen cinema moments in the promised first week:
//   Mori  (day 3, the dip):   your life in weeks, the goal's sliver of it.
//   Vivere (day 5, it eases): the picture of it working, in their own words.
// Pure cinema (Malik: no gestures): auto-advancing beats, tap to advance,
// quiet "Not now" escape that refires on the next open. Each moment ends by
// weaving a permanent color into the Memento card: Mori = true black,
// Vivere = warm light. Zero AI calls; everything is computed from state.
// ============================================================================

const DeeperRoom = {
  _el: null,
  _beats: [],
  _beat: -1,
  _timer: null,
  _kind: null,
  _skippedThisSession: { mori: false, vivere: false },

  // ---- gating ---------------------------------------------------------------
  // Day 1 = the day of the first completed action. Fires on open (boot or
  // resume) only: never mid-flow, never over another surface.
  _dayNumber() {
    try {
      const h = state.action && state.action.completionHistory;
      if (!Array.isArray(h) || !h.length) return 0;
      const first = new Date(h[0].date);
      if (isNaN(first)) return 0;
      const a = new Date(first.getFullYear(), first.getMonth(), first.getDate());
      const n = new Date();
      const b = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      return Math.floor((b - a) / 86400000) + 1;
    } catch (e) { return 0; }
  },

  _surfaceClear() {
    try {
      if (typeof Sheet !== 'undefined' && Sheet.isOpen) return false;
      if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return false;
      if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return false;
      if (document.getElementById('n7dRoot')) return false;
      if (document.getElementById('clarityPaywall')) return false;
      const _wi = document.getElementById('welcomeIntro');
      if (_wi && _wi.classList.contains('open')) return false;
      if (document.body.classList.contains('evo2') || document.body.classList.contains('evo-pending')) return false;
      if (this._el) return false;
    } catch (e) {}
    return true;
  },

  maybeFire() {
    try {
      if (!state.profile || !state.profile.onboarded) return;
      if (typeof ClarityPaywall === 'undefined' || !ClarityPaywall.isPaid()) return;
      if (!state.action || !state.action.planGenerated) return;
      if (!this._surfaceClear()) return;
      state.meta = state.meta || {};
      const day = this._dayNumber();
      if (day >= 3 && !state.meta.moriMomentAt && !this._skippedThisSession.mori) {
        this.openMori();
        return;
      }
      // Vivere waits for Mori to be SEEN, at least a day later, and day >= 5.
      if (day >= 5 && state.meta.moriMomentAt && !state.meta.vivereMomentAt && !this._skippedThisSession.vivere) {
        const moriDay = new Date(state.meta.moriMomentAt);
        const since = Math.floor((Date.now() - moriDay.getTime()) / 86400000);
        if (since >= 1) this.openVivere();
      }
    } catch (e) {}
  },

  // ---- shared cinema shell --------------------------------------------------
  _open(kind, beats, onDone) {
    if (this._el) return;
    this._kind = kind;
    this._beats = beats;
    this._beat = -1;
    const reduced = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
    this._reduced = reduced;

    const el = document.createElement('div');
    el.className = 'dr dr--' + kind;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', kind === 'mori' ? 'Memento Mori' : 'Memento Vivere');
    el.innerHTML =
      '<button type="button" class="dr__skip" id="drSkip">Not now</button>' +
      '<div class="dr__stage" id="drStage"></div>' +
      '<div class="dr__hint" id="drHint">tap to continue</div>';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    this._el = el;

    el.querySelector('#drSkip').addEventListener('click', (e) => {
      e.stopPropagation();
      this._skippedThisSession[kind] = true;
      this._close(false);
    });
    // Tap anywhere advances (never skips the weave).
    el.addEventListener('click', () => this._advance());

    requestAnimationFrame(() => el.classList.add('dr--in'));
    this._onDone = onDone;
    setTimeout(() => this._advance(), reduced ? 60 : 700);
  },

  _advance() {
    if (!this._el) return;
    clearTimeout(this._timer);
    this._beat++;
    if (this._beat >= this._beats.length) { this._finish(); return; }
    const b = this._beats[this._beat];
    const stage = this._el.querySelector('#drStage');
    stage.classList.remove('dr__stage--shown');
    // Swap content on the next frame so the fade re-runs per beat.
    requestAnimationFrame(() => {
      stage.innerHTML = b.html;
      requestAnimationFrame(() => {
        stage.classList.add('dr__stage--shown');
        if (typeof b.run === 'function') { try { b.run(stage, this._reduced); } catch (e) {} }
      });
    });
    const hold = this._reduced ? Math.min(b.hold || 3200, 1600) : (b.hold || 5200);
    this._timer = setTimeout(() => this._advance(), hold);
  },

  _finish() {
    clearTimeout(this._timer);
    const el = this._el;
    if (!el) return;
    // Mark seen FIRST (witness flag), then weave on the real card.
    try {
      state.meta = state.meta || {};
      if (this._kind === 'mori') state.meta.moriMomentAt = Date.now();
      else state.meta.vivereMomentAt = Date.now();
      persistNow();
    } catch (e) {}
    const kind = this._kind;
    this._close(true);
    // The weave is witnessed on the REAL home card, right after the room fades.
    setTimeout(() => { try { this._weaveCard(kind); } catch (e) {} }, 380);
  },

  _close() {
    clearTimeout(this._timer);
    const el = this._el;
    if (!el) return;
    this._el = null;
    el.classList.remove('dr--in');
    document.body.style.overflow = '';
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 640);
  },

  // ---- the weave ------------------------------------------------------------
  // Adds (or reveals) the permanent card layer and plays its one-time bloom.
  // Layers live INSIDE .daycard-ns (already hard-clipped by the card's
  // clip-path + contain:paint), so the color can never escape the card.
  _weaveCard(kind) {
    try { if (typeof TabBar !== 'undefined' && TabBar.switchTo && TabBar.activeTab !== 'home') TabBar.switchTo('home'); } catch (e) {}
    setTimeout(() => {
      const ns = document.querySelector('#dayCard .daycard-ns');
      if (!ns) return;
      const cls = kind === 'mori' ? 'daycard-ns__mori' : 'daycard-ns__vivere';
      let layer = ns.querySelector('.' + cls);
      if (!layer) {
        layer = document.createElement('span');
        layer.className = cls;
        layer.setAttribute('aria-hidden', 'true');
        const body = ns.querySelector('.daycard-ns__body');
        ns.insertBefore(layer, body || null);
      }
      // One-time witnessed arrival: transition from transparent to woven.
      layer.classList.add('is-weaving');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          layer.classList.add('is-woven');
          setTimeout(() => { try { layer.classList.remove('is-weaving'); } catch (e) {} }, 3200);
        });
      });
    }, 260);
  },

  // ---- MORI (day 3) ---------------------------------------------------------
  openMori(opts) {
    opts = opts || {};
    if (this._el) return;
    const E = (s) => { try { return esc(s); } catch (e) { return String(s || ''); } };

    // Real numbers from what they already gave us.
    const bday = (() => {
      const raw = (state.profile && state.profile.birthday) || '';
      const d = raw ? new Date(raw) : null;
      if (d && !isNaN(d)) return d;
      const by = state.mori && state.mori.birthYear;
      return by ? new Date(by, 6, 1) : null;
    })();
    const life = (state.mori && state.mori.lifeExpectancy) || 80;
    const now = new Date();
    const daysLived = bday ? Math.max(1, Math.floor((now - bday) / 86400000)) : null;
    const weeksLived = daysLived ? Math.floor(daysLived / 7) : null;
    const totalWeeks = Math.round(life * 52.18);
    const weeksLeft = weeksLived != null ? Math.max(0, totalWeeks - weeksLived) : null;
    const goalWeeks = (() => {
      const tf = String((state.clarity && state.clarity.answers && (state.clarity.answers.timeframe || state.clarity.answers.timeHorizon)) || '');
      const n = parseFloat(tf) || 0;
      if (/year/i.test(tf)) return Math.round(n * 52) || 52;
      if (/month/i.test(tf)) return Math.round(n * 4.345) || 52;
      if (/week/i.test(tf)) return Math.round(n) || 52;
      return 52;
    })();
    const anti = String((state.clarity && state.clarity.answers && state.clarity.answers.antiVision) || '').trim();
    const fmtN = (n) => { try { return n.toLocaleString('en-US'); } catch (e) { return String(n); } };

    const beats = [];
    beats.push({ hold: 4200, html:
      '<div class="dr__big">Day 3.</div>' +
      '<div class="dr__sub">The dip. We told you it was coming.</div>' });
    if (daysLived != null) {
      beats.push({ hold: 5200, html:
        '<div class="dr__lead">You have been alive</div>' +
        '<div class="dr__big dr__num" id="drCount">0</div>' +
        '<div class="dr__lead">days.</div>',
        run: (stage, reduced) => {
          const el2 = stage.querySelector('#drCount');
          if (!el2) return;
          if (reduced) { el2.textContent = fmtN(daysLived); return; }
          const t0 = performance.now(); const DUR = 1900;
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / DUR);
            const eased = 1 - Math.pow(1 - p, 3);
            el2.textContent = fmtN(Math.round(daysLived * eased));
            if (p < 1 && el2.isConnected) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        } });
    }
    if (weeksLived != null) {
      beats.push({ hold: 7400, html:
        '<div class="dr__lead">Your life, in weeks.</div>' +
        '<canvas class="dr__grid" id="drGrid" aria-label="Your life in weeks"></canvas>' +
        '<div class="dr__quiet">The filled ones are spent.</div>',
        run: (stage, reduced) => this._drawWeeks(stage, weeksLived, totalWeeks, null, reduced) });
      beats.push({ hold: 7200, html:
        '<canvas class="dr__grid" id="drGrid" aria-label="Your goal inside the weeks you have left"></canvas>' +
        '<div class="dr__lead" style="margin-top:26px;">This goal asks for <b>' + fmtN(goalWeeks) + '</b> of the <b>' + fmtN(weeksLeft) + '</b> you have left.</div>',
        run: (stage, reduced) => this._drawWeeks(stage, weeksLived, totalWeeks, goalWeeks, reduced) });
    }
    if (anti) {
      beats.push({ hold: 6400, html:
        '<div class="dr__quiet">You wrote:</div>' +
        '<div class="dr__quote">&ldquo;' + E(anti.slice(0, 220)) + '&rdquo;</div>' });
    }
    beats.push({ hold: 4600, html:
      '<div class="dr__big">The rest are yours.</div>' +
      '<div class="dr__sub">Spend today on purpose.</div>' });
    beats.push({ hold: 3400, html:
      '<div class="dr__sub">The dark stays with your Memento now.</div>' });

    if (opts.force) { this._skippedThisSession.mori = false; }
    this._open('mori', beats);
  },

  // Life-in-weeks canvas. Lived weeks sweep to near-black; the goal window
  // (if given) lights in the consistency green right after the lived edge.
  _drawWeeks(stage, weeksLived, totalWeeks, goalWeeks, reduced) {
    const cv = stage.querySelector('#drGrid');
    if (!cv) return;
    const cols = 52;
    const rows = Math.ceil(totalWeeks / cols);
    const wCss = Math.min(stage.clientWidth || 320, 340);
    const cell = Math.max(3, Math.floor(wCss / cols) - 1);
    const gap = 1;
    const wPx = cols * (cell + gap);
    const hPx = rows * (cell + gap);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = wPx * dpr; cv.height = hPx * dpr;
    cv.style.width = wPx + 'px'; cv.style.height = hPx + 'px';
    const cx = cv.getContext('2d');
    cx.scale(dpr, dpr);
    const draw = (sweep) => {
      cx.clearRect(0, 0, wPx, hPx);
      for (let i = 0; i < totalWeeks; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const x = col * (cell + gap), y = row * (cell + gap);
        if (i < Math.min(weeksLived, sweep)) cx.fillStyle = 'rgba(3,4,5,0.96)';
        else if (goalWeeks && i >= weeksLived && i < weeksLived + goalWeeks) cx.fillStyle = 'rgba(63,217,78,0.75)';
        else cx.fillStyle = 'rgba(255,255,255,0.10)';
        cx.fillRect(x, y, cell, cell);
      }
      // A hairline ring around the lived edge cell, the "you are here".
      const col = weeksLived % cols, row = Math.floor(weeksLived / cols);
      cx.strokeStyle = 'rgba(255,255,255,0.85)';
      cx.lineWidth = 1;
      cx.strokeRect(col * (cell + gap) - 0.5, row * (cell + gap) - 0.5, cell + 1, cell + 1);
    };
    if (reduced) { draw(weeksLived); return; }
    const t0 = performance.now(); const DUR = 2100;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / DUR);
      draw(Math.round(weeksLived * (1 - Math.pow(1 - p, 2))));
      if (p < 1 && cv.isConnected) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  // ---- VIVERE (day 5) -------------------------------------------------------
  openVivere(opts) {
    opts = opts || {};
    if (this._el) return;
    const E = (s) => { try { return esc(s); } catch (e) { return String(s || ''); } };
    const vision = String((state.clarity && state.clarity.answers && state.clarity.answers.futureVision) || '').trim();
    const goal = String((state.clarity && state.clarity.answers && state.clarity.answers.neutronStar) || '').trim();

    const beats = [];
    beats.push({ hold: 4200, html:
      '<div class="dr__big">Day 5.</div>' +
      '<div class="dr__sub">It eases. This is the other side.</div>' });
    if (vision) {
      beats.push({ hold: 4200, html:
        '<div class="dr__lead">You said this is what it looks like when it works:</div>' });
      beats.push({ hold: 8200, html:
        '<div class="dr__quote dr__quote--warm" id="drVision"></div>',
        run: (stage, reduced) => {
          const host = stage.querySelector('#drVision');
          if (!host) return;
          const words = vision.slice(0, 260).split(/\s+/);
          host.innerHTML = words.map(w => '<span class="dr__w">' + E(w) + '</span>').join(' ');
          const spans = [...host.querySelectorAll('.dr__w')];
          if (reduced) { spans.forEach(s => s.classList.add('is-lit')); return; }
          spans.forEach((s, i) => setTimeout(() => { if (s.isConnected) s.classList.add('is-lit'); }, 320 + i * Math.min(140, 4200 / spans.length)));
        } });
    } else if (goal) {
      beats.push({ hold: 6600, html:
        '<div class="dr__lead">Picture the exact day this is true:</div>' +
        '<div class="dr__quote dr__quote--warm">&ldquo;' + E(goal.slice(0, 200)) + '&rdquo;</div>' });
    }
    beats.push({ hold: 4600, html:
      '<div class="dr__big dr__big--warm">Keep it lit.</div>' +
      '<div class="dr__sub">The light stays with your Memento now.</div>' });
    beats.push({ hold: 3400, html:
      '<div class="dr__quiet">When you have a picture of it, give it to your Vivere.</div>' });

    if (opts.force) { this._skippedThisSession.vivere = false; }
    this._open('vivere', beats);
  },

  // ---- boot + resume hooks --------------------------------------------------
  init() {
    // On boot: after the reveal settles.
    setTimeout(() => this.maybeFire(), 2600);
    // On resume after a real gap (same 5-minute bar as the tab-snap rule).
    let hiddenAt = 0;
    document.addEventListener('visibilitychange', () => {
      try {
        if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
        if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) setTimeout(() => this.maybeFire(), 1400);
      } catch (e) {}
    });
  }
};

try { window.DeeperRoom = DeeperRoom; } catch (e) {}
