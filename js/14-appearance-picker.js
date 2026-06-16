/* ───────────────────────────────────────────────────────────────────────────
   AppearancePicker — the first-run "choose your look" moment.
   Shown once, right after the splash and before onboarding, so the very first
   thing someone does is pick the feel of their Memento. Four starting looks,
   each previewed in a little mockup; tapping one applies it live (so the screen
   behind retints too) and Continue locks it in. Fully reversible later in
   Settings. Gated by state.prefs.appearanceChosen.
   ─────────────────────────────────────────────────────────────────────────── */

const AppearancePicker = {
  _open: false,
  _onDone: null,
  _picked: 'dark',

  // Each look maps to the existing prefs that applyPrefs() already consumes, so
  // this rides the same pipeline as Settings (no new theming code).
  LOOKS: [
    {
      id: 'light', name: 'Light', tag: 'Clean and bright',
      prefs: { theme: 'light', flatBg: true, reduceMotion: false, uiGlass: 0, uiBlur: 1 }
    },
    {
      id: 'dark', name: 'Dark', tag: 'The signature',
      prefs: { theme: 'dark', flatBg: false, reduceMotion: false, uiGlass: 0, uiBlur: 1 }
    },
    {
      id: 'minimal', name: 'Minimal', tag: 'Flat and calm',
      prefs: { theme: 'dark', flatBg: true, reduceMotion: true, uiGlass: 0.5, uiBlur: 0 }
    },
    {
      id: 'movement', name: 'Movement', tag: 'Alive and glassy',
      prefs: { theme: 'dark', flatBg: false, reduceMotion: false, uiGlass: 0, uiBlur: 1.35 }
    }
  ],

  // A tiny mockup of each look: a mini screen with a card + a couple of rows,
  // styled by the look's own class so the difference reads at a glance.
  _previewHTML() {
    return '<div class="apk-prev__sky"></div>' +
      '<div class="apk-prev__card"><span class="apk-prev__mark"></span></div>' +
      '<div class="apk-prev__row apk-prev__row--a"></div>' +
      '<div class="apk-prev__row apk-prev__row--b"></div>';
  },

  open(onDone) {
    try {
      if (this._open || document.getElementById('appearancePicker')) return;
      this._open = true;
      this._onDone = (typeof onDone === 'function') ? onDone : null;
      this._picked = (state.prefs && state.prefs.theme === 'light') ? 'light' : 'dark';

      const cards = this.LOOKS.map((lk) =>
        '<button type="button" class="apk-card apk-prev apk-prev--' + lk.id + (lk.id === this._picked ? ' is-picked' : '') + '" data-look="' + lk.id + '" role="radio" aria-checked="' + (lk.id === this._picked) + '">' +
          '<div class="apk-prev__screen">' + this._previewHTML() + '</div>' +
          '<div class="apk-card__meta"><span class="apk-card__name">' + lk.name + '</span><span class="apk-card__tag">' + lk.tag + '</span></div>' +
          '<span class="apk-card__check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '</button>'
      ).join('');

      const ov = document.createElement('div');
      ov.id = 'appearancePicker';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      ov.setAttribute('aria-label', 'Choose your look');
      ov.innerHTML =
        '<div class="apk__scrim"></div>' +
        '<div class="apk__sheet">' +
          '<div class="apk__head">' +
            '<div class="apk__title">Make it yours</div>' +
            '<div class="apk__sub">Pick a starting look. You can change it anytime in Settings.</div>' +
          '</div>' +
          '<div class="apk__grid" role="radiogroup" aria-label="Looks">' + cards + '</div>' +
          '<button type="button" class="apk__go" id="apkContinue">Continue</button>' +
        '</div>';
      document.body.appendChild(ov);

      ov.querySelectorAll('.apk-card').forEach((c) => {
        c.addEventListener('click', () => this._select(c.getAttribute('data-look')));
      });
      const go = ov.querySelector('#apkContinue');
      if (go) go.addEventListener('click', () => this._confirm());

      void ov.offsetWidth;
      ov.classList.add('apk--open');
    } catch (e) { this._open = false; if (this._onDone) { const f = this._onDone; this._onDone = null; f(); } }
  },

  _applyLook(id) {
    const look = this.LOOKS.find((l) => l.id === id);
    if (!look) return;
    try {
      if (!state.prefs) state.prefs = {};
      Object.assign(state.prefs, look.prefs);
      if (typeof applyPrefs === 'function') applyPrefs();
    } catch (e) {}
  },

  _select(id) {
    this._picked = id;
    const ov = document.getElementById('appearancePicker');
    if (ov) ov.querySelectorAll('.apk-card').forEach((c) => {
      const on = c.getAttribute('data-look') === id;
      c.classList.toggle('is-picked', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    // Live preview: retint the whole app to the picked look as they browse.
    this._applyLook(id);
  },

  _confirm() {
    try {
      this._applyLook(this._picked);
      if (!state.prefs) state.prefs = {};
      state.prefs.appearanceChosen = true;
      if (typeof persistNow === 'function') persistNow();
    } catch (e) {}
    this._dismiss();
  },

  _dismiss() {
    const ov = document.getElementById('appearancePicker');
    this._open = false;
    const done = this._onDone; this._onDone = null;
    if (ov) {
      ov.classList.remove('apk--open');
      setTimeout(() => { try { ov.remove(); } catch (e) {} }, 320);
    }
    if (done) setTimeout(done, ov ? 240 : 0);
  }
};
