/* Memento module: INIT bootstrap (runs immediately) + auto-save + keyboard shortcuts
   Extracted from app.js lines 23524-25632. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   INIT
   ============================================ */
loadState();
migrateState();
applyPrefs(); // additive: stamp accent/motion/density prefs (no-op if unset)
checkDayChange();
applyDemoModeIfRequested(); // if ?demo=..., swap in demo data (DEMO_MODE blocks all writes)
applyPrefs(); // re-stamp against the now-active state (demo carries default prefs, so its accent never inherits a prior real user's choice)
try { scheduleReminder(); } catch (e) {} // arm the daily nudge if enabled + permitted
try { if (!DEMO_MODE && state.profile && state.profile.onboarded) _injectDemoBar(null); } catch (e) {} // dev: persona bar on the dashboard outside demo mode
// Derive the current streak from the activity history at boot for real users
// (demo already recalcs inside applyDemoModeIfRequested). checkDayChange only
// zeroes the count on a gap; this re-derives the true value so the dashboard,
// and the one-time backup nudge, see an accurate count on load. Idempotent.
if (!DEMO_MODE) { try { recalculateStreak(); } catch (_) {} }
// The Monday assessment: first open of a new week writes last week's letter
// into the Updates center (idempotent per week, no-op until there is history).
if (!DEMO_MODE) { try { if (typeof maybeGenerateWeeklyCard === 'function') maybeGenerateWeeklyCard(); } catch (_) {} }
// v23 unlock ladder: re-evaluate triggers on session open so a queued unlock
// (max one per day) fires now and materializes in the first grid paint.
if (!DEMO_MODE) { try { if (typeof evaluateUnlockLadder === 'function') evaluateUnlockLadder(); } catch (_) {} }
renderGrid();
renderAll();
// v24 state safety: if loadState had to recover (or could not), say so out
// loud once. A silent reset reads as "the app ate my data"; a notice reads
// as an app that protected it.
try {
  if (state.meta && state.meta.recoveredFromBackup && !state.meta.recoveryNoticeShown) {
    state.meta.recoveryNoticeShown = true; persistNow();
    setTimeout(() => { try { showComingSoonToast('Your data had a problem and was restored from the local backup.'); } catch (_) {} }, 1200);
  } else if (state.meta && state.meta.stateCorrupted && !state.meta.recoveryNoticeShown) {
    state.meta.recoveryNoticeShown = true; persistNow();
    setTimeout(() => { try { showComingSoonToast('Your saved data could not be read. A copy was kept; contact support to recover it.'); } catch (_) {} }, 1200);
  }
} catch (_) {}
// v24 error visibility: keep the last runtime error in localStorage so a
// "the app broke" report is debuggable, and surface a toast in dev only.
(function () {
  const record = (msg, src) => {
    try {
      localStorage.setItem('memento_last_error', JSON.stringify({ msg: String(msg).slice(0, 300), src: String(src || '').slice(0, 200), ts: new Date().toISOString() }));
    } catch (_) {}
    try {
      const dev = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || /[?&]dev=1/.test(location.search);
      // "Script error." with no source is the browser's opaque, non-actionable
      // mask for a cross-origin throw (a CDN dependency or a browser extension).
      // Still logged above; just do not toast it, since there is nothing to act on.
      const opaque = /^script error\.?$/i.test(String(msg).trim()) && String(src || '').split(':')[0] === '';
      if (dev && !opaque && typeof showComingSoonToast === 'function') showComingSoonToast('JS error: ' + String(msg).slice(0, 80));
    } catch (_) {}
  };
  window.addEventListener('error', (e) => record(e.message, (e.filename || '') + ':' + (e.lineno || '')));
  window.addEventListener('unhandledrejection', (e) => record((e.reason && (e.reason.message || e.reason)) || 'unhandled rejection', 'promise'));
})();
// Optional backend: pull the public counter + (if logged in) restore/sync. Async,
// fired after first paint so it never blocks boot; fails silently when offline.
try { Backend.boot(); } catch (_) {}
Sheet.init();
FullscreenClose.init();
ClarityExperience.init();
ActionExperience.init();
CreatorTools.init();
WelcomeIntro.init();
TabBar.init();
Sidebar.init();
DragDrop.init();
Splash.init();

// Escape from a full-screen tab panel (Profile / Memento) back to the
// dashboard modules. Sheets and full-screen flows keep their own Escape
// handling, and a focused input gets blurred first so you do not jump away
// mid-edit.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (typeof TabBar === 'undefined' || TabBar.activeTab === 'home') return;
  if (typeof Sheet !== 'undefined' && Sheet.isOpen) return;
  if (typeof ClarityExperience !== 'undefined' && ClarityExperience.isOpen) return;
  if (typeof ActionExperience !== 'undefined' && ActionExperience.isOpen) return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
    ae.blur();
    return;
  }
  e.preventDefault();
  try { TabBar.switchTo('home'); } catch (err) {}
});
// Returning users skip the splash so the preview/iframe lands straight on
// the last view. New users still get the full splash + onboarding sequence.
// If there's a restorable view (action / clarity summary), we bypass the
// splash animation entirely and jump straight to that view - no 1.5s of
// "Memento" flashing on every reload.
(function autoDismissSplashForReturningUsers() {
  try {
    const isReturning = state && state.meta && state.meta.welcomeSeen;
    // Restorable = ANY remembered place: the two experiences, an open module
    // sheet ('sheet:streak'), or a non-home tab ('tab:profile').
    const _lv = (typeof recallView === 'function') ? recallView() : (state && state.ui && state.ui.lastView);
    const hasRestorable = !!(_lv && (
      _lv === 'claritySummary' || _lv === 'action' ||
      (typeof _lv === 'string' && (_lv.indexOf('sheet:') === 0 || _lv.indexOf('tab:') === 0))
    ));

    if (!isReturning && !hasRestorable) return; // first-time visitor - show splash + onboarding

    // Returning user (with or without a saved view): hard-cut the splash so
    // there is NO flash of Memento branding on every reload. We still bring
    // up the dashboard and, if there's a saved view, jump straight to it.
    const splashEl = document.getElementById('splash');
    if (splashEl) {
      splashEl.style.transition = 'none';
      splashEl.classList.add('dismissed');
    }
    try { Splash.stopBeams && Splash.stopBeams(); } catch (_) {}
    if (!state.meta.onboarded) { state.meta.onboarded = true; persistNow(); }
    const app = document.getElementById('app');
    // Render the dashboard now (we need the .widget--action element in the
    // DOM for the zoom-from-card animation), but ONLY show it visually if
    // there's no saved view to restore. With a saved view, we keep the app
    // invisible behind the splash-dismissed layer so the user never sees the
    // dashboard flash before the module renders on top.
    if (app) { app.style.opacity = hasRestorable ? '0' : '1'; }
    try { if (typeof TabBar !== 'undefined') TabBar.show(); } catch (_) {}
    document.getElementById('ambientBg')?.classList.add('loaded');
    try { renderAll(); } catch (_) {}

    if (hasRestorable) {
      // Open the saved view on the next tick so dashboard layout settles
      // first (the zoom-from-card animation needs the source widget element).
      setTimeout(() => {
        try {
          const v = (typeof recallView === 'function') ? recallView() : (state.ui && state.ui.lastView);
          if (v === 'action') ActionExperience.open();
          else if (v === 'claritySummary') ClarityExperience.openSummary();
          else if (typeof v === 'string' && v.indexOf('sheet:') === 0) {
            const key = v.slice(6);
            if (WIDGET_DEFS[key] && SHEET_TEMPLATES[key]) Sheet.open(key);
            else rememberView(null);
            const app2 = document.getElementById('app'); if (app2) app2.style.opacity = '1';
          } else if (typeof v === 'string' && v.indexOf('tab:') === 0) {
            if (typeof TabBar !== 'undefined' && TabBar.switchTo) TabBar.switchTo(v.slice(4));
            const app2 = document.getElementById('app'); if (app2) app2.style.opacity = '1';
          }
        } catch (_) {}
      }, 50);
    }
  } catch (_) { /* never block the page if state is malformed */ }
})();

// Boot mask reveal. Wait one frame so the chosen view (dashboard / action /
// clarity summary) has had a chance to mount and paint, THEN fade the mask
// out. Restorable views (action / claritySummary) get a longer hold because
// their open() animation needs a tick to settle. Falls back to 80ms for the
// plain dashboard / splash case.
// HONEST_LOADING_GATE: leave false. The dashboard renders fully before reveal
// and the grid now fades in as one unit (no pop-in), so no gate is needed. If a
// real device ever shows lag, flip this to true: the boot mask then holds across
// two animation frames (ensuring layout/paint settled) before revealing, giving
// an honest "everything loaded, now show it" gate. One-line switch, no fake spinner.
const HONEST_LOADING_GATE = false;
(function revealBoot() {
  // Reveal exactly once, no matter which path gets there first.
  let revealed = false;
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    try { document.body.classList.add('boot-revealed'); } catch (_) {}
    // The day card's once-a-day "materialize" entrance is gated on boot-revealed +
    // visibility (see renderDayCard), so it never plays under the mask. Now that the
    // mask is lifting, re-render the card once so the entrance actually shows on a
    // home boot. No-op (and flag not burned) if the card is not the visible view.
    try {
      if (typeof renderDayCard === 'function') {
        requestAnimationFrame(() => { try { renderDayCard(); } catch (_) {} });
      }
    } catch (_) {}
  };
  try {
    const hasRestorable = !!((typeof recallView === 'function') ? recallView() : (state && state.ui && state.ui.lastView));
    // Minimum brand hold: the mark breathes for ~0.7s before the dissolve.
    // A sub-second intentional pause reads as premium; a 200ms flicker reads
    // as a glitch. (Restorable views already needed the longer settle.)
    const delay = hasRestorable ? 700 : 650;
    setTimeout(() => {
      if (HONEST_LOADING_GATE) {
        // Wait for two rAFs (layout + paint settled) before lifting the mask.
        requestAnimationFrame(() => requestAnimationFrame(reveal));
      } else {
        requestAnimationFrame(reveal);
      }
    }, delay);
  } catch (_) {
    reveal();
  }
  // CRITICAL fallback: requestAnimationFrame is fully PAUSED in background or
  // throttled tabs, which would leave the page stuck on the black boot mask
  // forever (the cause of "all I see is darkness" when the tab is not focused).
  // setTimeout still fires when throttled, so guarantee the reveal independent
  // of rAF. Also re-reveal on focus/visibility in case the tab was backgrounded
  // through the whole boot.
  setTimeout(reveal, 1400);
  setTimeout(reveal, 2500);
  try {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reveal(); });
    window.addEventListener('focus', reveal);
    window.addEventListener('pageshow', reveal);
  } catch (_) {}
})();

// Flush the latest state synchronously when the tab is being hidden or torn
// down, so the user's most recent action is never lost to a debounced save
// that never fired (e.g. they background the tab or close it right after
// marking something complete). persistNow() is synchronous and already
// no-ops under DEMO_MODE, so demo data can never overwrite real state here.
// Additive: these run alongside the existing debounced persistState().
(function persistOnHide() {
  const flush = () => { try { persistNow(); } catch (_) {} };
  // 'visibilitychange' -> hidden is the reliable signal on mobile (tab switch,
  // home button, app switch). 'pagehide' covers desktop tab/window close and
  // bfcache eviction. Both are passive; neither blocks teardown.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
})();

// Live day rollover. If the app stays open across midnight, or a backgrounded
// tab is resumed the next morning, "today" must move without waiting for the
// next tap: streak dots, heatmap, and the hero's done-today state all key off
// getTodayISO(). A cheap minute tick plus a visibility resume check both
// funnel through one guard, so the full re-render only fires when the date
// actually changed (at most once a day).
(function watchDayRollover() {
  let day = getTodayISO();
  const check = () => {
    const now = getTodayISO();
    if (now === day) return;
    day = now;
    try { renderAll(); } catch (_) {}
    try { if (typeof Sidebar !== 'undefined' && Sidebar.refresh) Sidebar.refresh(); } catch (_) {}
    try { if (!DEMO_MODE && typeof maybeGenerateWeeklyCard === 'function') maybeGenerateWeeklyCard(); } catch (_) {}
  };
  setInterval(check, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
})();

renderActionIconCanvases();
const _actionIconObserver = new MutationObserver(() => renderActionIconCanvases());
_actionIconObserver.observe(document.body, { childList: true, subtree: true });

// Init a WebGL blob on any canvas
function initMiniBlob(canvasId, size) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (typeof canvas.getContext !== 'function') return null; // hyperblob is an SVG now, skip
  const gl = canvas.getContext('webgl');
  if (!gl) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, BLOB_VSRC));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, BLOB_FSRC));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  let animId;
  function draw(t) {
    // Self-destruct if orphaned by a re-render, so old loops can't pile up and
    // clog the main thread.
    if (!canvas.isConnected) {
      const lost = gl.getExtension('WEBGL_lose_context');
      if (lost) lost.loseContext();
      return;
    }
    // Perf: skip GPU draws while the tab is backgrounded (blob is invisible),
    // keep one rAF alive so it resumes on return. No-op while visible.
    if (document.hidden) { animId = requestAnimationFrame(draw); return; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(draw);
  }
  animId = requestAnimationFrame(draw);
  return { stop: () => cancelAnimationFrame(animId) };
}

// Splash blob - use shared initMiniBlob
(function() {
  const blob = initMiniBlob('hyperblob', 320);
  if (!blob) return;
  const splashEl = document.getElementById('splash');
  const observer = new MutationObserver(() => {
    if (splashEl.classList.contains('dismissed')) {
      blob.stop();
      observer.disconnect();
    }
  });
  observer.observe(splashEl, { attributes: true, attributeFilter: ['class'] });
})();

// Star blob initializer (circular version of hyperblob)
function initStarBlob(canvas, size = 240, variant) {
  // Guard against stacking loops: if this canvas was already initialised (e.g.
  // a re-render re-ran this on the same element), tear the old WebGL context +
  // animation loop down first. Otherwise each re-render adds another forever
  // loop and the page slowly grinds to a halt.
  if (canvas._destroyGL) { try { canvas._destroyGL(); } catch (_) {} }
  const gl = canvas.getContext('webgl');
  if (!gl) return;
  // Mobile / low-power: the star is a soft blurry blob, so rendering it at a
  // much lower internal resolution is invisible but FAR cheaper (shader cost
  // scales with pixel count). Also cap framerate and pause it on the dashboard
  // while a module is open, so the GPU is free for the thing being opened.
  const _lite = window.matchMedia('(max-width: 820px)').matches
             || window.matchMedia('(pointer: coarse)').matches;
  const dpr = _lite ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const _size = _lite ? Math.min(size, 420) : size;
  const _inDash = !!(canvas.closest && canvas.closest('.app'));
  const _minDelta = _lite ? 33 : 0;   // ~30fps cap on mobile
  let _last = 0;
  canvas.width = _size * dpr;
  canvas.height = _size * dpr;

  const vsrc = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;
  // CLASSIC = the original noise-marbled blob (UNTOUCHED; Malik's fallback: drop the
  // 'pulsar' argument at the call site in js/02 to go back to this look).
  const fsrcClassic = `
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
void main(){
  vec2 uv = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;
  uv.x *= u_res.x / u_res.y;
  float t = u_time * 0.15;
  float d = length(uv) - 0.42;
  float mask = 1.0 - smoothstep(-0.04, 0.05, d);
  float border = smoothstep(0.05, 0.0, abs(d + 0.01));
  vec3 borderCol = 0.55 + 0.35 * cos(t * 2.5 + uv.xyx * 3.0 + vec3(0.5, 1.5, 3.0));
  float n1 = snoise(uv * 1.8 + vec2(t * 0.7, t * 0.5));
  float n2 = snoise(uv * 2.5 + vec2(-t * 0.6, t * 0.8));
  float n3 = snoise(uv * 1.2 + vec2(t * 0.4, -t * 0.3));
  float n4 = snoise(uv * 3.0 + vec2(t * 0.9, t * 0.2));
  vec3 c1 = vec3(0.3, 0.5, 0.95);
  vec3 c2 = vec3(0.45, 0.6, 1.0);
  vec3 c3 = vec3(0.93, 0.95, 1.0);
  vec3 c4 = vec3(0.55, 0.78, 1.0);
  vec3 c5 = vec3(0.88, 0.92, 1.0);
  vec3 col = mix(c1, c2, smoothstep(-0.5, 0.5, n1));
  col = mix(col, c3, smoothstep(-0.3, 0.5, n2));
  col = mix(col, c4, smoothstep(-0.2, 0.6, n3) * 0.5);
  col = mix(col, c5, smoothstep(0.0, 0.7, n4) * 0.5);
  float spec = smoothstep(0.25, 0.0, length(uv - vec2(-0.08, 0.12)));
  col += vec3(1.0) * spec * 0.4;
  col *= 1.35;
  float innerShadow = smoothstep(0.0, 0.3, -d);
  col *= 0.8 + 0.2 * innerShadow;
  vec3 final = col * mask + borderCol * border * 0.35;
  float alpha = max(mask, border * 0.35);
  gl_FragColor = vec4(final, alpha);
}`;

  // PULSAR = the calm Magnetar Malik picked from proto-pulsar-styles.html (v505): the
  // same marbled plasma body language + flowing polar jets on a tilted axis, with a
  // slow quiet 2.8s breath (no shockwave, no glint, no hard beat). Renders with a
  // luminance alpha so the CSS halo behind the canvas still shows through.
  const fsrcPulsar = `
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
void main(){
  vec2 uv = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;
  uv.x *= u_res.x / u_res.y;
  // Zoomed OUT (v506): the canvas is much larger than the star so the jets have room to
  // run long and melt into black INSIDE the frame; the body keeps its visual size.
  uv *= 1.9;
  float T = u_time;
  float phase = fract(T / 2.8);
  float beat = pow(max(sin(3.14159 * phase), 0.0), 2.2);
  float r = length(uv);
  float n1 = snoise(uv * 2.2 + vec2(T * 0.12, T * 0.08));
  float n2 = snoise(uv * 4.0 - vec2(T * 0.10, T * 0.15));
  vec3 body = mix(vec3(0.25, 0.45, 0.95), vec3(0.55, 0.75, 1.0), smoothstep(-0.6, 0.6, n1));
  body = mix(body, vec3(0.95, 0.97, 1.0), smoothstep(-0.1, 0.7, n2) * 0.7);
  float mask = 1.0 - smoothstep(0.28, 0.32, r);
  float core = exp(-r * 7.0) * (1.35 + 0.18 * beat);
  float halo = exp(-r * 2.1) * 0.5 * (1.0 + 0.14 * beat);
  float tilt = -0.5;
  vec2 ax = vec2(sin(tilt), cos(tilt));
  float along = dot(uv, ax);
  float across = dot(uv, vec2(-ax.y, ax.x));
  float aa = abs(along);
  float flow = 0.75 + 0.45 * snoise(vec2(aa * 4.0 - T * 2.2, across * 14.0));
  float jw = 0.035 + 0.09 * aa;
  // The fade completes at aa 2.0, BEFORE the jets reach the canvas edge (they exit at
  // ~2.16 on the tilted axis), so they dissolve into the distance with no cutoff.
  float jet = exp(-pow(across / jw, 2.0) * 2.5) * smoothstep(2.0, 0.45, aa) * smoothstep(0.18, 0.42, aa) * flow;
  float ji = 0.78 + 0.22 * beat;
  vec3 col = body * mask * (1.0 + 0.07 * beat);
  col += vec3(1.0) * core;
  col += vec3(0.45, 0.65, 1.0) * halo;
  col += vec3(0.75, 0.88, 1.0) * jet * ji;
  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;

  const fsrc = (variant === 'pulsar') ? fsrcPulsar : fsrcClassic;

  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  let animId, running = false;
  function draw(t) {
    if (!running) return;
    // Self-destruct if this canvas was orphaned by a re-render (removed from the
    // page). Otherwise old loops keep running JS every frame forever and pile up,
    // clogging the main thread so taps stop registering. isConnected is a
    // reliable per-frame check that doesn't depend on observers firing.
    if (!canvas.isConnected) {
      running = false;
      const lost = gl.getExtension('WEBGL_lose_context');
      if (lost) lost.loseContext();
      return;
    }
    // Pause the dashboard's star while a full-screen module is open, and
    // fps-cap on mobile. Both keep a requestAnimationFrame alive so it resumes
    // instantly when conditions clear.
    if (window.__scrolling || (_inDash && window.__moduleOpen)) { animId = requestAnimationFrame(draw); return; }
    if (_minDelta && (t - _last) < _minDelta) { animId = requestAnimationFrame(draw); return; }
    _last = t;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(draw);
  }
  function startLoop() { if (!running) { running = true; animId = requestAnimationFrame(draw); } }
  function stopLoop() { running = false; cancelAnimationFrame(animId); }
  // Pause when offscreen, resume when visible
  const visObs = new IntersectionObserver(([e]) => { e.isIntersecting ? startLoop() : stopLoop(); }, { threshold: 0 });
  visObs.observe(canvas);
  // Stop entirely and free GPU memory when removed from DOM
  const mutObs = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      stopLoop();
      visObs.disconnect();
      mutObs.disconnect();
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  });
  mutObs.observe(canvas.parentElement || document.body, { childList: true, subtree: true });
  // Store cleanup function on canvas so callers can destroy manually
  canvas._destroyGL = () => {
    stopLoop();
    visObs.disconnect();
    mutObs.disconnect();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };
}

function initNsBlobBg(canvas) {
  if (!canvas) return;
  const gl = canvas.getContext('webgl');
  if (!gl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
  }
  resize();
  const vsrc = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;
  const fsrc = `
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
void main(){
  vec2 uv=(gl_FragCoord.xy/u_res)*2.0-1.0;
  float t=u_time*0.1;
  float n1=snoise(uv*1.2+vec2(t*0.5,t*0.3));
  float n2=snoise(uv*1.8+vec2(-t*0.4,t*0.6));
  float n3=snoise(uv*0.8+vec2(t*0.3,-t*0.2));
  float n4=snoise(uv*2.2+vec2(t*0.7,t*0.15));
  vec3 c1=vec3(0.05,0.02,0.18);
  vec3 c2=vec3(0.28,0.08,0.55);
  vec3 c3=vec3(0.08,0.18,0.62);
  vec3 c4=vec3(0.55,0.05,0.60);
  vec3 c5=vec3(0.0,0.38,0.55);
  vec3 col=mix(c1,c2,smoothstep(-0.5,0.5,n1));
  col=mix(col,c3,smoothstep(-0.3,0.6,n2)*0.7);
  col=mix(col,c4,smoothstep(-0.2,0.7,n3)*0.5);
  col=mix(col,c5,smoothstep(0.0,0.8,n4)*0.35);
  gl_FragColor=vec4(col,1.0);
}`;
  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  let animId, nsBgRunning = false;
  function draw(t) {
    if (!nsBgRunning) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(draw);
  }
  const visObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { nsBgRunning = true; animId = requestAnimationFrame(draw); }
    else { nsBgRunning = false; cancelAnimationFrame(animId); }
  }, { threshold: 0 });
  visObs.observe(canvas);
  const obs = new MutationObserver(() => {
    if (!document.contains(canvas)) {
      nsBgRunning = false; cancelAnimationFrame(animId);
      visObs.disconnect(); obs.disconnect();
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  canvas._destroyGL = () => {
    nsBgRunning = false; cancelAnimationFrame(animId);
    visObs.disconnect(); obs.disconnect();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };
}

function initNeutronStarCard(root, onBack) {
  const scope = root || document;
  const stage = scope.querySelector('#nsStarStage');
  if (stage) {
    return initNeutronStarStarView(scope);
  }
  return initNeutronStarCardLegacy(root, onBack);
}

function initNeutronStarStarView(scope) {
  const stage = scope.querySelector('#nsStarStage');
  const detail = scope.querySelector('#nsStarDetail');
  const scene = scope.querySelector('#nsScene');
  const canvas = scope.querySelector('#nsStarBlob');
  if (!stage || !scene) return;

  // Override ancestor constraints via inline styles (CSS parsing on this big
  // file is unreliable in that region, so we set them directly).
  const overrides = {
    maxWidth: 'none',
    padding: '0',
    margin: '0',
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderRadius: '0',
    backdropFilter: 'none',
    webkitBackdropFilter: 'none',
    boxShadow: 'none',
    overflow: 'hidden'
  };
  let p = scene.parentElement;
  while (p && p !== document.body) {
    if (p.classList && (p.classList.contains('clarity-exp__page-inner') || p.classList.contains('clarity-exp__page-wrap') || p.classList.contains('wiz__step'))) {
      p.classList.add('ns-star-host');
      Object.assign(p.style, overrides);
    }
    p = p.parentElement;
  }

  if (canvas) initStarBlob(canvas, 760, 'pulsar');

  // Hide the empty bottom nav so the scene fully covers the viewport.
  const navEl = document.querySelector('.clarity-exp__nav');
  if (navEl) {
    navEl.dataset._nsHidden = '1';
    navEl.style.display = 'none';
  }

  // Populate the starfield with many tiny twinkling stars at random positions.
  const starfield = scope.querySelector('#nsStarfield');
  if (starfield && !starfield.dataset.populated) {
    starfield.dataset.populated = '1';
    const STAR_COUNT = (window.matchMedia('(max-width: 820px)').matches
                     || window.matchMedia('(pointer: coarse)').matches) ? 60 : 160;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < STAR_COUNT; i++) {
      const s = document.createElement('div');
      // ~25% of stars drift slowly across the field; the rest just twinkle in place.
      const isDrifter = Math.random() < 0.25;
      const driftVariant = 1 + Math.floor(Math.random() * 4); // 1..4
      s.className = 'ns-star-scene__star' + (isDrifter ? ' ns-star-scene__star--drift' + driftVariant : '');
      const size = Math.random() < 0.18 ? 2 : 1; // small percentage are 2px
      const opacity = (0.35 + Math.random() * 0.6).toFixed(2);
      // Drifters take much longer (slow ambient movement); twinklers are quicker.
      const dur = isDrifter ? (16 + Math.random() * 20).toFixed(2) : (2.5 + Math.random() * 4.5).toFixed(2);
      const delay = (-Math.random() * (isDrifter ? 15 : 5)).toFixed(2);
      const tintRoll = Math.random();
      const tint = tintRoll < 0.1 ? 'rgba(200,210,255,1)' : tintRoll < 0.2 ? 'rgba(255,240,220,1)' : 'rgba(var(--ink),1)';
      s.style.cssText =
        `left:${(Math.random() * 100).toFixed(2)}%;` +
        `top:${(Math.random() * 100).toFixed(2)}%;` +
        `width:${size}px;height:${size}px;background:${tint};` +
        `opacity:${opacity};` +
        `animation-duration:${dur}s;animation-delay:${delay}s;`;
      frag.appendChild(s);
    }
    starfield.appendChild(frag);
  }

  let zoomed = false;
  function zoomIn() {
    if (zoomed) return;
    zoomed = true;
    scene.classList.add('ns-star-scene--zoomed');
  }
  function zoomOut() {
    if (!zoomed) return;
    zoomed = false;
    scene.classList.remove('ns-star-scene--zoomed');
  }
  stage.addEventListener('click', zoomIn);
  const hit = scope.querySelector('#nsStarHit');
  if (hit) hit.addEventListener('click', (e) => { e.stopPropagation(); zoomIn(); });

  // 3D parallax tilt on the glass card. Desktop only (real mouse + hover).
  // Skipped on touch devices and when prefers-reduced-motion is set.
  const card = scope.querySelector('.ns-star-detail__card');
  const detailWrap = scope.querySelector('#nsStarDetail');
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasMouse = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // The manifesto page (P4) is flat typography, not a floating card: no tilt.
  if (card && detailWrap && hasMouse && !reducedMotion && !card.classList.contains('ns-manifesto')) {
    detailWrap.style.perspective = '1100px';
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange = 'transform';
    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    let rafId = null;
    const MAX_TILT = 9; // degrees
    function onMove(e) {
      const w = window.innerWidth, h = window.innerHeight;
      const nx = (e.clientX / w) * 2 - 1; // -1 .. 1
      const ny = (e.clientY / h) * 2 - 1;
      targetY = nx * MAX_TILT;   // rotateY follows horizontal
      targetX = -ny * MAX_TILT;  // rotateX follows vertical (inverted)
      if (!rafId) rafId = requestAnimationFrame(tick);
    }
    function tick() {
      rafId = null;
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      card.style.transform = `rotateX(${curX.toFixed(2)}deg) rotateY(${curY.toFixed(2)}deg) translateZ(0)`;
      if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) {
        rafId = requestAnimationFrame(tick);
      }
    }
    // Scope the tilt listeners to the bounded card wrap (not window) so they die
    // with the node on the next innerHTML swap. Previously these were added to
    // window on every Clarity open and never removed, leaking listeners + retaining
    // detached cards across a session.
    detailWrap.addEventListener('mousemove', onMove);
    detailWrap.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; if (!rafId) rafId = requestAnimationFrame(tick); });
  }

  // Tab switching inside the glass card.
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

  // Per-section refresh: ask the AI to rephrase a single field while keeping
  // the meaning + user's voice. Updates DOM and persists to state.
  const refreshBtns = scope.querySelectorAll('.ns-summary__panel-refresh');
  refreshBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (btn.classList.contains('is-loading')) return;
      const field = btn.getAttribute('data-field');
      const label = btn.getAttribute('data-label');
      const panel = btn.closest('.ns-summary__panel');
      const bodyEl = panel && panel.querySelector('.ns-summary__panel-body');
      if (!bodyEl || !field) return;
      const original = state.clarity.answers[field] || bodyEl.textContent || '';
      // Pre-flight: confirm an API key is set, otherwise nothing will happen.
      if (typeof getAnthropicKey === 'function' && !getAnthropicKey()) {
        const prev = bodyEl.textContent;
        bodyEl.textContent = 'AI is unavailable right now. Check your connection and try again.';
        bodyEl.style.opacity = '0.6';
        setTimeout(() => { bodyEl.textContent = prev; bodyEl.style.opacity = ''; }, 2800);
        return;
      }
      btn.classList.add('is-loading');
      try {
        const answers = state.clarity.answers || {};
        // Pull the raw transcript so the AI can lift real phrases instead of
        // inventing generic-sounding ones.
        const convo = Array.isArray(answers.aiConversation) ? answers.aiConversation : [];
        const userLines = convo
          .filter(m => m && (m.role === 'user' || m.from === 'user'))
          .map(m => (m.content || m.text || '').trim())
          .filter(Boolean)
          .slice(-8)
          .join('\n- ');
        const ctx = [
          answers.neutronStar  ? `Goal: ${answers.neutronStar}` : '',
          answers.coreWhy      ? `Why: ${answers.coreWhy}` : '',
          answers.futureVision ? `Future: ${answers.futureVision}` : '',
          answers.antiVision   ? `Avoiding: ${answers.antiVision}` : '',
          answers.identityLine ? `Becoming: ${answers.identityLine}` : '',
          userLines ? `\nTheir actual words from the conversation (mirror this voice, lift real phrases):\n- ${userLines}` : ''
        ].filter(Boolean).join('\n');
        // Tell the AI exactly which other fields exist so it does not rephrase one
        // of them and accidentally collide.
        const otherFields = [
          { f: 'neutronStar',  label: 'Goal' },
          { f: 'coreWhy',      label: 'Why' },
          { f: 'futureVision', label: 'Future' },
          { f: 'antiVision',   label: 'Avoiding' },
          { f: 'identityLine', label: 'Becoming' }
        ].filter(x => x.f !== field && answers[x.f]).map(x => `- ${x.label} already says: "${answers[x.f]}"`).join('\n');
        const fieldPurpose = (field === 'neutronStar')
          ? 'the concrete action or outcome they are chasing (the WHAT)'
          : (field === 'coreWhy')
            ? 'the deeper reason behind the goal (the WHY) - the underlying belief, the fear, the cost of doing nothing. Must NOT restate the goal.'
            : (field === 'futureVision')
              ? 'the picture if it works - the specific result, not the goal repeated'
              : (field === 'antiVision')
                ? 'the picture if it fails - the default future if no action is taken'
                : 'the type of person this turns them into (a role, a character - not what they do, who they are)';
        const rules = (field === 'neutronStar')
          ? 'Punchy imperative sentence starting with a VERB. No "I want to / need to / hope to". Max 18 words. Single sentence.'
          : (field === 'identityLine')
            ? 'Declarative identity statement. NO pronouns. Do NOT start with "I am someone who". Start with a noun or role (e.g., "Builder of...", "The kind of...").'
            : (field === 'futureVision')
              ? 'Declarative sentence painting the real-world result. NO pronouns (no "You", "I", "Your", "My"). Start with a noun or concrete image. 1-2 short sentences.'
              : (field === 'antiVision')
                ? 'Declarative sentence naming what would happen if neglected. NO pronouns. Start with a noun or "-ing" verb.'
                : 'Declarative reason this matters. NO pronouns (no "I", "You", "My", "Your"). Do NOT start with "Because". 1-2 short sentences. Use their actual voice. No "proof that", "bigger than", "wake people up".';
        const sys = `You are rephrasing ONE section of someone's Neutron Star summary. Keep the meaning the same, just say it in a different way using their voice. Return ONLY the new sentence(s), no JSON, no quotes, no commentary.

${MALIK_VOICE_SPEC}

THIS FIELD'S PURPOSE: ${fieldPurpose}

CRITICAL - NO OVERLAP WITH OTHER FIELDS:
The other tabs on this card already say specific things. Your output must add something they do not already say. If your output is just a rewording of one of these, you failed.
${otherFields || '(no other fields filled yet)'}

ADDITIONAL RULE FOR THIS TASK: NEVER add new meaning the user did not say. You are rephrasing, not embellishing.

Rules for this field (${label}):
${rules}

Their full Neutron Star context (do not rewrite these, just use for context):
${ctx}

Current ${label}: ${original}

Rewrite it now. Different wording, same meaning, same voice. Return only the new sentence.`;
        const text = await callClaude(
          [{ role: 'user', content: 'Rephrase it.' }],
          sys,
          { maxTokens: 220, timeout: 20000 }
        );
        const clean = (text || '').trim().replace(/^["']|["']$/g, '');
        if (clean) {
          bodyEl.textContent = clean;
          state.clarity.answers[field] = clean;
          if (field === 'coreWhy') state.clarity.answers.whyItMatters = clean;
          if (typeof aiSynthesisResult === 'object' && aiSynthesisResult) aiSynthesisResult[field] = clean;
          if (typeof persistNow === 'function') persistNow();
        }
      } catch (err) {
        console.warn('Refresh failed:', err);
        const prev = bodyEl.textContent;
        bodyEl.textContent = (err && err.message) ? err.message : 'Could not rephrase. Try again.';
        bodyEl.style.opacity = '0.6';
        setTimeout(() => { bodyEl.textContent = prev; bodyEl.style.opacity = ''; }, 2800);
      } finally {
        btn.classList.remove('is-loading');
      }
    });
  });

  // ESC key:
  //   - if detail panel is open → un-zoom back to the star
  //   - if just viewing the star → exit back to modules
  const escHandler = (e) => {
    if (e.key !== 'Escape') return;
    // Only act when this NS scene is actually in the DOM. Otherwise let the
    // global ESC handler decide (so Action / Sheet ESC works too).
    if (!document.contains(scene)) return;
    if (zoomed) {
      e.preventDefault();
      e.stopPropagation();
      zoomOut();
    } else {
      e.preventDefault();
      e.stopPropagation();
      if (typeof exitToModules === 'function') {
        exitToModules('clarity');
      }
    }
  };
  document.addEventListener('keydown', escHandler);

  // Intercept the global X close button: when detail is open, the X un-zooms
  // back to the star instead of exiting to modules.
  const closeBtn = document.getElementById('fullscreenCloseGlobal');
  let interceptor = null;
  if (closeBtn) {
    interceptor = (e) => {
      if (zoomed) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        zoomOut();
      }
    };
    closeBtn.addEventListener('click', interceptor, true);
    closeBtn.addEventListener('pointerdown', interceptor, true);
    closeBtn.addEventListener('touchend', interceptor, true);
  }

  // Cleanup listeners when this scene leaves the DOM
  const obs = new MutationObserver(() => {
    if (!document.contains(scene)) {
      document.removeEventListener('keydown', escHandler);
      if (closeBtn && interceptor) {
        closeBtn.removeEventListener('click', interceptor, true);
        closeBtn.removeEventListener('pointerdown', interceptor, true);
        closeBtn.removeEventListener('touchend', interceptor, true);
      }
      // Restore the bottom nav we hid for the scene
      const n = document.querySelector('.clarity-exp__nav');
      if (n && n.dataset._nsHidden) {
        n.style.display = '';
        delete n.dataset._nsHidden;
      }
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

function initNeutronStarCardLegacy(root, onBack) {
  const scope = root || document;
  const wrap = scope.querySelector('#nsCardWrap');
  if (!wrap) return;
  const sheen = scope.querySelector('#nsSheen');
  const bottomPill = scope.querySelector('#nsBottomPill');
  let isFlipped = false;
  let baseY = 0;
  let tiltX = 0, tiltY = 0;
  let curX = 0, curY = 0;
  let rafId;
  let touchStartX = 0, touchStartY = 0;
  let lastMoveTime = 0;
  let lastFlipTime = 0;
  const driftStart = performance.now();

  function applyTransform() {
    wrap.style.transform = `perspective(1200px) rotateX(${curX}deg) rotateY(${curY}deg)`;
  }
  function tick() {
    const now = performance.now();
    const idle = (now - lastMoveTime) > 800;
    if (idle) {
      const t = (now - driftStart) / 1000;
      tiltY = Math.sin(t * 0.4) * 1.5;
      tiltX = Math.cos(t * 0.3) * 1.1;
    }
    curX += (tiltX - curX) * 0.1;
    curY += (tiltY - curY) * 0.1;
    applyTransform();
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  function onMove(clientX, clientY) {
    lastMoveTime = performance.now();
    const nx = (clientX / window.innerWidth) - 0.5;
    const ny = (clientY / window.innerHeight) - 0.5;
    tiltY = nx * 14;
    tiltX = -ny * 12;
  }

  const _docMoveHandler = e => onMove(e.clientX, e.clientY);
  document.addEventListener('mousemove', _docMoveHandler);

  wrap.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > dy) {
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });
  const front = scope.querySelector('#nsCardFront');
  const back = scope.querySelector('#nsCardBack');

  function doFlip() {
    const now = performance.now();
    if (now - lastFlipTime < 700) return;
    lastFlipTime = now;
    isFlipped = !isFlipped;
    cancelAnimationFrame(rafId);
    tiltX = 0; tiltY = 0; curX = 0; curY = 0;
    wrap.style.transition = `transform 0.28s ease-in`;
    wrap.style.transform = `perspective(1200px) rotateY(90deg)`;
    setTimeout(() => {
      if (front) front.style.display = isFlipped ? `none` : ``;
      if (back) back.style.display = isFlipped ? `flex` : `none`;
      wrap.style.transition = `transform 0.28s ease-out`;
      wrap.style.transform = `perspective(1200px) rotateY(0deg)`;
      setTimeout(() => {
        wrap.style.transition = ``;
        rafId = requestAnimationFrame(tick);
      }, 290);
    }, 280);
  }

  function isInActions(el) {
    return el && el.closest && el.closest('.ns-card__actions');
  }

  wrap.addEventListener('click', e => {
    if (isInActions(e.target)) return;
    doFlip();
  });
  wrap.addEventListener('touchend', e => {
    if (isInActions(e.target)) return;
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dx < 10 && dy < 10) doFlip();
  });

  const obs2 = new MutationObserver(() => {
    if (!document.contains(wrap)) {
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', _docMoveHandler);
      obs2.disconnect();
    }
  });
  obs2.observe(document.body, { childList: true, subtree: true });
}

// Register --angle BEFORE anything else, so orbit animations work.
window.__memAngleRegistered = 'attempting';
try {
  if (window.CSS && CSS.registerProperty) {
    CSS.registerProperty({ name: '--angle', syntax: '<angle>', inherits: true, initialValue: '0deg' });
    window.__memAngleRegistered = 'success';
  }
} catch (e) {
  window.__memAngleRegistered = 'error: ' + e.message;
}

Parallax.init();

// GPU pause flag - stops background animations when fullscreen overlays are open (saves mobile GPU)
var _bgAnimsPaused = false;

// Debounce helper to prevent updateNav spam during typing
var _navDebounceTimer = null;
function debouncedUpdateNav(experienceObj) {
  if (_navDebounceTimer) clearTimeout(_navDebounceTimer);
  _navDebounceTimer = setTimeout(() => {
    if (experienceObj && experienceObj.isOpen) experienceObj.updateNav();
  }, 150);
}

// Auto-grow textarea to fit content
var _autoGrowRAF = null;
function autoGrowTextarea(el) {
  if (!el || el.tagName !== 'TEXTAREA') return;
  if (_autoGrowRAF) cancelAnimationFrame(_autoGrowRAF);
  _autoGrowRAF = requestAnimationFrame(() => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
    _autoGrowRAF = null;
  });
}

// Pause orbit animation on text-wrap during typing to save mobile GPU
var _orbitResumeTimer = null;
function pauseOrbitDuringTyping(el) {
  if (!el) return;
  var wrap = el.closest('.wiz__text-wrap');
  if (!wrap) return;
  wrap.style.animationPlayState = 'paused';
  if (_orbitResumeTimer) clearTimeout(_orbitResumeTimer);
  _orbitResumeTimer = setTimeout(function() {
    wrap.style.animationPlayState = '';
  }, 600);
}

// Speech-to-text helper
var _speechRecognition = null;
function initSpeechToText(textarea, onInput) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const btn = document.createElement('button');
  btn.className = 'stt-mic-btn';
  btn.type = 'button';
  btn.title = 'Tap to dictate';
  btn.style.cssText = 'position:absolute;bottom:8px;right:10px;z-index:2;width:32px;height:32px;border-radius:50%;border:1px solid rgba(var(--ink),0.12);background:var(--kfill-06);color:rgba(var(--ink),0.45);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s ease;padding:0;';
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

  let listening = false;
  let recognition = null;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (listening && recognition) {
      recognition.stop();
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    const startVal = textarea.value;
    const needsSpace = startVal.length > 0 && !startVal.endsWith(' ') && !startVal.endsWith('\n');

    function setActive() {
      btn.style.background = 'rgba(220, 50, 50, 0.25)';
      btn.style.borderColor = 'rgba(220, 50, 50, 0.5)';
      btn.style.color = '#ff6b6b';
    }
    function setInactive() {
      btn.style.background = 'var(--kfill-06)';
      btn.style.borderColor = 'rgba(var(--ink),0.12)';
      btn.style.color = 'rgba(var(--ink),0.45)';
    }

    recognition.onstart = () => {
      listening = true;
      btn.classList.add('stt-active');
      setActive();
    };
    recognition.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      textarea.value = startVal + (needsSpace ? ' ' : '') + final + interim;
      if (onInput) onInput(textarea.value);
      if (typeof autoGrowTextarea === 'function') autoGrowTextarea(textarea);
    };
    recognition.onend = () => {
      listening = false;
      btn.classList.remove('stt-active');
      setInactive();
      recognition = null;
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      listening = false;
      btn.classList.remove('stt-active');
      setInactive();
      recognition = null;
    };
    recognition.start();
  });

  return btn;
}

// Background blob - same shader as hyperblob but fills the screen
// Skip init if canvas is hidden (display:none) to save a WebGL context
(function() {
  const canvas = document.getElementById('ambientBlobBg');
  if (!canvas) return;
  if (document.documentElement.classList.contains('lowfx')) return; // mobile: skip WebGL background
  if (getComputedStyle(canvas).display === 'none') return;
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const vsrc = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0,1);}`;
  const fsrc = `
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
void main(){
  vec2 uv = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;
  float t = u_time * 0.4;
  float n1 = snoise(uv * 1.2 + vec2(t * 0.5, t * 0.3));
  float n2 = snoise(uv * 1.8 + vec2(-t * 0.4, t * 0.6));
  float n3 = snoise(uv * 0.8 + vec2(t * 0.3, -t * 0.2));
  float n4 = snoise(uv * 2.2 + vec2(t * 0.7, t * 0.15));
  vec3 c1 = vec3(0.0, 0.0, 0.0);
  vec3 c2 = vec3(0.18, 0.0, 1.0);
  vec3 c3 = vec3(0.0, 0.08, 1.0);
  vec3 c4 = vec3(0.0, 0.9, 0.95);
  vec3 c5 = vec3(1.0, 0.0, 0.72);
  vec3 col = mix(c1, c2, smoothstep(-0.4, 0.4, n1));
  col = mix(col, c3, smoothstep(-0.2, 0.5, n2) * 0.95);
  col = mix(col, c4, smoothstep(-0.1, 0.6, n3) * 0.8);
  col = mix(col, c5, smoothstep(0.1, 0.7, n4) * 0.7);
  col = col * col * (3.0 - 2.0 * col);
  gl_FragColor = vec4(col, 1.0);
}`;

  function makeShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, vsrc));
  gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, fsrc));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');

  let ambBlobRunning = false, ambBlobId;
  function draw(t) {
    if (!ambBlobRunning) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uTime, t * 0.001);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ambBlobId = requestAnimationFrame(draw);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { ambBlobRunning = true; ambBlobId = requestAnimationFrame(draw); }
    else { ambBlobRunning = false; cancelAnimationFrame(ambBlobId); }
  }, { threshold: 0 }).observe(canvas);
})();

// Comet border animation - drives --angle on all comet elements
// Only runs when dashboard or an experience with comet elements is visible
(function() {
  const start = performance.now();
  let lastFrame = 0;
  let cometRunning = false;
  function animateComet(time) {
    if (!cometRunning) return;
    // Don't repaint the glowing gradient borders while scrolling - it's one of
    // the things that tanks scroll FPS on mobile. Resume when scrolling stops.
    if (window.__scrolling) { requestAnimationFrame(animateComet); return; }
    if (time - lastFrame < 33) { requestAnimationFrame(animateComet); return; }
    lastFrame = time;
    const angle = ((time - start) / 5000 * 360) % 360;
    const val = angle.toFixed(1) + 'deg';
    const clarityWidget = document.querySelector('.widget--clarity:not(.clarity-done)');
    if (clarityWidget) clarityWidget.style.setProperty('--angle', val);
    const actionWidget = document.querySelector('.widget--action.action-unlocked');
    if (actionWidget) actionWidget.style.setProperty('--angle', val);
    document.querySelectorAll('.clarity-intro__btn-pill').forEach(el => el.style.setProperty('--angle', val));
    document.querySelectorAll('.clarity-find__orbit').forEach(el => el.style.setProperty('--angle', val));
    document.querySelectorAll('.wiz__text-wrap').forEach(el => el.style.setProperty('--angle', val));
    requestAnimationFrame(animateComet);
  }
  // Observe the app/dashboard visibility to start/stop
  const app = document.getElementById('app');
  if (app) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !cometRunning && !document.documentElement.classList.contains('lowfx')) { cometRunning = true; requestAnimationFrame(animateComet); }
      else if (!e.isIntersecting) { cometRunning = false; }
    }, { threshold: 0 }).observe(app);
  }
})();

// Hide app behind splash so it fades in after splash dismiss. Skip when the
// returning-user auto-dismiss already made the app visible - otherwise this
// line overrides our instant-restore and the dashboard ends up blank.
(function() {
  const appEl = document.getElementById('app');
  const splashEl = document.getElementById('splash');
  if (!appEl) return;
  if (splashEl && splashEl.classList.contains('dismissed')) return;
  appEl.style.opacity = '0';
})();
// Don't show tab bar yet  - splash dismiss will handle it for returning users

// Ambient star field  - colored particles on near-black
(function() {
  const canvas = document.getElementById('ambientStars');
  if (!canvas) return;
  if (document.documentElement.classList.contains('lowfx')) return; // mobile: skip ambient star canvas
  // Hidden (display:none) -> skip entirely. Otherwise it allocates a full
  // viewport x DPR backing store (~10MB+ on phones) and runs a draw loop for a
  // canvas nobody can see, piling onto mobile memory pressure.
  if (getComputedStyle(canvas).display === 'none') return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const colors = [
    [123, 97, 255],   // purple (clarity)
    [255, 59, 48],    // red (action)
    [48, 209, 88],    // green (consistency)
    [56, 189, 248],   // blue (flow)
    [191, 90, 242],   // violet (reflection)
    [255, 159, 10],   // orange (deepwork)
  ];

  let stars = [];
  const COUNT = window.innerWidth < 600 ? 35 : 80;

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Regenerate stars on resize
    stars = [];
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < COUNT; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1 + Math.random() * 2.5,          // 2-6px diameter
        col: col,
        alpha: 0.06 + Math.random() * 0.14,   // 0.06-0.2
        driftX: (Math.random() - 0.5) * 0.08,  // very slow drift
        driftY: (Math.random() - 0.5) * 0.06,
        pulseSpeed: 0.3 + Math.random() * 0.7,  // subtle breathe
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(time) {
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    stars.forEach(s => {
      // Slow drift
      s.x += s.driftX;
      s.y += s.driftY;
      // Wrap around
      if (s.x < -10) s.x = w + 10;
      if (s.x > w + 10) s.x = -10;
      if (s.y < -10) s.y = h + 10;
      if (s.y > h + 10) s.y = -10;

      // Subtle pulse
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.001 * s.pulseSpeed + s.pulseOffset);
      const a = s.alpha * pulse;
      const [r, g, b] = s.col;

      // Soft glow
      const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
      grd.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grd.addColorStop(0.4, `rgba(${r},${g},${b},${a * 0.4})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(s.x - s.r * 3, s.y - s.r * 3, s.r * 6, s.r * 6);

      // Bright core dot
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${a * 1.5})`;
      ctx.fill();
    });

    if (starsRunning) requestAnimationFrame(draw);
  }
  let starsRunning = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { starsRunning = true; requestAnimationFrame(draw); }
    else { starsRunning = false; }
  }, { threshold: 0 }).observe(canvas);
})();

// Action Experience starfield - monochrome twinkling stars across the
// action-exp background. Cinematic feel for the mountain/intake screens.
// Stars drift slowly, pulse in brightness, wrap at edges. Only runs while
// the action-exp is actually open (paused otherwise to save battery).
(function actionExpStars() {
  const canvas = document.getElementById('actionExpStars');
  if (!canvas) return;
  if (document.documentElement.classList.contains('lowfx')) return; // mobile: skip starfield animation
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  // Canvas cannot parse CSS custom properties (var(--ink)), so resolve the ink
  // triplet to real numbers once. Fallback to a light value for the star glow.
  const INK = ((getComputedStyle(document.documentElement).getPropertyValue('--ink') || '').trim()) || '236,238,243';
  let stars = [];
  let shootingStars = [];
  let lastShootingAt = 0;
  let running = false;
  let rafId = null;
  let lastFrameAt = 0;
  const TARGET_FPS = 30;          // half-speed render saves a ton of GPU work
  const FRAME_MS = 1000 / TARGET_FPS;

  // Pre-rendered offscreen canvases. Built once per resize, then we just
  // drawImage them onto the main canvas instead of re-creating gradients
  // every frame. This is the single biggest perf win.
  let nebulaCanvas = null;
  let starSprites = [];  // small set of pre-rendered star halos at a few sizes

  function buildNebulaCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w * dpr;
    c.height = h * dpr;
    const cx = c.getContext('2d');
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const blobs = [
      { x: w * 0.20, y: h * 0.15, r: Math.max(w, h) * 0.45, color: [130, 80, 215], alpha: 0.42 },
      { x: w * 0.78, y: h * 0.12, r: Math.max(w, h) * 0.42, color: [50, 110, 210], alpha: 0.38 },
      { x: w * 0.55, y: h * 0.05, r: Math.max(w, h) * 0.38, color: [200, 90, 165], alpha: 0.30 }
    ];
    blobs.forEach(b => {
      const grd = cx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      const [r, g, bl] = b.color;
      grd.addColorStop(0, `rgba(${r},${g},${bl},${b.alpha})`);
      grd.addColorStop(0.4, `rgba(${r},${g},${bl},${b.alpha * 0.5})`);
      grd.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      cx.fillStyle = grd;
      cx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    });
    return c;
  }

  function buildStarSprite(radius) {
    // A radial halo + bright core baked into a small offscreen canvas, used
    // for ALL stars at this size. Drawn via drawImage which is ~10x faster
    // than recreating a radial gradient + fillRect every frame.
    const size = Math.ceil(radius * 8);
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const cx = c.getContext('2d');
    const center = size / 2;
    const grd = cx.createRadialGradient(center, center, 0, center, center, radius * 4);
    grd.addColorStop(0, `rgba(${INK},0.7)`);
    grd.addColorStop(0.45, `rgba(${INK},0.22)`);
    grd.addColorStop(1, `rgba(${INK},0)`);
    cx.fillStyle = grd;
    cx.fillRect(0, 0, size, size);
    cx.beginPath();
    cx.arc(center, center, radius * 0.55, 0, Math.PI * 2);
    cx.fillStyle = `rgba(${INK},1)`;
    cx.fill();
    return c;
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Pre-render the nebula layer once. We translate it slightly per frame to
    // simulate drift without re-drawing the gradients.
    nebulaCanvas = buildNebulaCanvas(w, h);

    // Pre-render a small set of star sprites at different sizes.
    starSprites = [0.6, 1.0, 1.5, 2.2].map(buildStarSprite);

    // Conservative star count. Was up to 420, now capped at 200.
    const COUNT = Math.min(200, Math.max(90, Math.floor((w * h) / 9000)));
    stars = [];
    for (let i = 0; i < COUNT; i++) {
      const tier = Math.random();
      let spriteIdx, alpha, pulseSpeed, blink;
      if (tier < 0.70)      { spriteIdx = 0; alpha = 0.15 + Math.random() * 0.30; pulseSpeed = 0.3 + Math.random() * 0.5; blink = false; }
      else if (tier < 0.92) { spriteIdx = 1; alpha = 0.30 + Math.random() * 0.40; pulseSpeed = 0.5 + Math.random() * 1.0; blink = false; }
      else if (tier < 0.98) { spriteIdx = 2; alpha = 0.50 + Math.random() * 0.40; pulseSpeed = 0.7 + Math.random() * 1.3; blink = true; }
      else                  { spriteIdx = 3; alpha = 0.60 + Math.random() * 0.40; pulseSpeed = 0.8 + Math.random() * 1.5; blink = true; }
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        spriteIdx, alpha,
        driftX: (Math.random() - 0.5) * 0.04,
        driftY: (Math.random() - 0.5) * 0.03,
        pulseSpeed,
        pulseOffset: Math.random() * Math.PI * 2,
        blink,
        blinkCycle: 8000 + Math.random() * 8000,
        blinkOffset: Math.random() * 16000
      });
    }

    shootingStars = [];
  }

  function draw(time) {
    if (!running) return;
    // Cap framerate at TARGET_FPS, saves significant CPU/GPU work.
    if (time - lastFrameAt < FRAME_MS) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    lastFrameAt = time;

    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // --- Layer 1: nebulae (pre-rendered, drawn locked to the canvas edges
    //     so the drift doesn't reveal a black band on either side). ---
    if (nebulaCanvas) {
      ctx.drawImage(nebulaCanvas, 0, 0, w, h);
    }

    // --- Layer 2: stars (using pre-rendered sprites via drawImage) ---
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += s.driftX;
      s.y += s.driftY;
      if (s.x < -10) s.x = w + 10;
      if (s.x > w + 10) s.x = -10;
      if (s.y < -10) s.y = h + 10;
      if (s.y > h + 10) s.y = -10;
      let a;
      if (s.blink) {
        const t = ((time + s.blinkOffset) % s.blinkCycle) / s.blinkCycle;
        let life;
        if (t < 0.25) life = t / 0.25;
        else if (t < 0.55) life = 1;
        else if (t < 0.75) life = 1 - (t - 0.55) / 0.2;
        else life = 0;
        a = s.alpha * life;
      } else {
        a = s.alpha * (0.55 + 0.45 * Math.sin(time * 0.001 * s.pulseSpeed + s.pulseOffset));
      }
      if (a <= 0.02) continue;
      const sprite = starSprites[s.spriteIdx];
      if (!sprite) continue;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(sprite, s.x - sprite.width / 2, s.y - sprite.height / 2);
    }
    ctx.globalAlpha = 1;

    // --- Layer 3: shooting stars (cheap, occasional) ---
    if (time - lastShootingAt > (6000 + Math.random() * 6000)) {
      lastShootingAt = time;
      shootingStars.push({
        x: Math.random() * w * 0.8,
        y: Math.random() * h * 0.3,
        vx: 4 + Math.random() * 3,
        vy: 2 + Math.random() * 2,
        life: 1,
        decay: 0.012 + Math.random() * 0.008,
        len: 60 + Math.random() * 60
      });
    }
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const sh = shootingStars[i];
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life -= sh.decay;
      if (sh.life <= 0 || sh.x > w + sh.len || sh.y > h + sh.len) {
        shootingStars.splice(i, 1);
        continue;
      }
      const tailX = sh.x - sh.vx * sh.len * 0.12;
      const tailY = sh.y - sh.vy * sh.len * 0.12;
      const grd = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
      grd.addColorStop(0, `rgba(${INK},${0.9 * sh.life})`);
      grd.addColorStop(1, `rgba(${INK},0)`);
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }

    // --- Two-pass erase: first a soft fade for the sky→mountain transition,
    //     then a hard erase rect for everything below the fade end so NOTHING
    //     remains in the lower half of the canvas (no faint stars, no nebula
    //     residue). The two passes together guarantee a clean upper-sky glow
    //     with absolutely black space below. */
    ctx.globalCompositeOperation = 'destination-out';
    // Pass 1: soft fade y=10% → y=42% so the upper nebula softens out.
    const fadeGrad = ctx.createLinearGradient(0, h * 0.10, 0, h * 0.42);
    fadeGrad.addColorStop(0,   'rgba(0,0,0,0)');
    fadeGrad.addColorStop(0.5, 'rgba(0,0,0,0.55)');
    fadeGrad.addColorStop(1,   'rgba(0,0,0,1)');
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, h * 0.10, w, h * 0.32);
    // Pass 2: hard erase everything from y=42% to bottom. Guarantees
    // zero residual content in the mountain / lower area.
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, h * 0.42, w, h * 0.58);
    ctx.globalCompositeOperation = 'source-over';

    rafId = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);

  // Run only when the action-exp is open (saves battery + the canvas is
  // invisible behind opacity:0 anyway when the exp is closed).
  const exp = document.getElementById('actionExp');
  if (!exp) return;
  const start = () => {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(draw);
  };
  const stop = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  };
  const observer = new MutationObserver(() => {
    const open = exp.classList.contains('open') || exp.classList.contains('open-bg') || exp.classList.contains('open-content');
    if (open) start(); else stop();
  });
  observer.observe(exp, { attributes: true, attributeFilter: ['class'] });
  // Kick off immediately if the exp is already open at script-init time.
  if (exp.classList.contains('open') || exp.classList.contains('open-bg')) start();
})();

// Force background video play (Safari compatibility)
(function() {
  const vid = document.getElementById('bgVideo');
  if (!vid) return;
  // The video is display:none (never shown). A hidden autoplay+loop video still
  // decodes continuously on iOS and is a major memory hog -> tab-killing crashes
  // (the "reloads every ~15s" symptom). If it's hidden, tear it down and bail.
  if (getComputedStyle(vid).display === 'none') {
    try { vid.pause(); vid.removeAttribute('autoplay'); vid.querySelectorAll('source').forEach(s => s.remove()); vid.removeAttribute('src'); if (vid.load) vid.load(); } catch (e) {}
    return;
  }
  // Safari trusts the JS property more than the HTML attribute
  vid.muted = true;
  vid.playsInline = true;
  vid.setAttribute('playsinline', '');
  vid.setAttribute('webkit-playsinline', '');
  vid.defaultMuted = true;
  vid.volume = 0;

  function tryPlay() {
    const p = vid.play();
    if (p && p.catch) p.catch(function(){});
  }

  // Try immediately
  tryPlay();
  // Try when data is loaded
  vid.addEventListener('loadeddata', tryPlay);
  vid.addEventListener('canplay', tryPlay);
  // Try on first user interaction (iOS Safari fallback)
  ['click','touchstart','touchend','pointerdown'].forEach(function(evt) {
    document.addEventListener(evt, function handler() {
      tryPlay();
      document.removeEventListener(evt, handler);
    }, { once: true, passive: true });
  });
  // Re-play when returning to the app
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) tryPlay();
  });
})();

/* ============================================
   AUTO-SAVE DRAFT ON PAGE UNLOAD
   ============================================ */
window.addEventListener('beforeunload', () => {
  if (ClarityExperience.isOpen && !state.clarity.completed && state.clarity.tutorialSeen) {
    state.clarity.draft = {
      wizardStep,
      wizardAnswers: { ...wizardAnswers },
      aiChatMessages: [...aiChatMessages],
      aiCurrentQuestion,
      aiCurrentHint,
      aiCurrentType,
      aiCurrentOptions: [...aiCurrentOptions],
      aiCurrentRange,
      aiChatReady
    };
    persistNow();
  }
});

/* ============================================
   GLOBAL KEYBOARD SHORTCUTS
   ============================================ */
// Smart close for the Clarity experience: if the user is currently zoomed in
// to the Neutron Star summary card, zoom OUT to the star view instead of
// closing the whole experience. Otherwise close as normal.
function smartCloseClarity() {
  const scene = document.getElementById('nsScene');
  if (scene && scene.classList.contains('ns-star-scene--zoomed')) {
    scene.classList.remove('ns-star-scene--zoomed');
    return;
  }
  exitToModules('clarity');
}

function exitToModules(source = '') {
  if (typeof FullscreenClose !== 'undefined') FullscreenClose.hide();
  if (source === 'clarity' || (!source && ClarityExperience.isOpen)) {
    ClarityExperience.close();
  } else if (source === 'action' || (!source && ActionExperience.isOpen)) {
    ActionExperience.close();
  } else if (source === 'sheet' || (!source && Sheet.isOpen)) {
    Sheet.close();
  }

  const app = document.getElementById('app');
  if (app) {
    app.style.display = '';
    app.style.opacity = '1';
    app.style.transform = 'none';
    app.style.filter = 'none';
    app.style.transition = '';
  }
  document.body.style.overflow = '';
  if (typeof TabBar !== 'undefined') {
    if (TabBar.activeTab !== 'home') TabBar.switchTo('home');
    TabBar.show();
  }
}

// Global ESC handler (capture phase, runs BEFORE any other listener so
// nothing can intercept it). Closes any open module/experience.
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  // Deep Work full-screen focus: Escape should mirror "Exit focus" (keep the
  // session running), not fall through to the sheet-close path which would end
  // and log it.
  const _dwFocus = document.getElementById('dwFocusOverlay');
  if (_dwFocus) {
    e.preventDefault(); e.stopPropagation();
    const exitBtn = _dwFocus.querySelector('#dwFocusExit');
    if (exitBtn) exitBtn.click();
    return;
  }

  // Pop one layer at a time instead of nuking the whole module.
  // Action module layers, innermost first:
  //   refine sheet → today sheet → any milestone sheet → open dot popup → module
  if (ActionExperience && ActionExperience.isOpen) {
    const refineSheet = document.querySelector('#actionRefineSheet');
    if (refineSheet && refineSheet.getAttribute('aria-hidden') === 'false') {
      e.preventDefault(); e.stopPropagation();
      refineSheet.setAttribute('aria-hidden', 'true');
      return;
    }
    const todaySheet = document.querySelector('#actionTodaySheet');
    if (todaySheet && todaySheet.getAttribute('aria-hidden') === 'false') {
      e.preventDefault(); e.stopPropagation();
      todaySheet.setAttribute('aria-hidden', 'true');
      return;
    }
    const caveSheet = document.querySelector('#actionCaveSheet');
    if (caveSheet && caveSheet.getAttribute('aria-hidden') === 'false') {
      e.preventDefault(); e.stopPropagation();
      caveSheet.setAttribute('aria-hidden', 'true');
      return;
    }
    const openMilestone = document.querySelector('.action-milestone-sheet[aria-hidden="false"]');
    if (openMilestone) {
      e.preventDefault(); e.stopPropagation();
      document.querySelectorAll('.action-milestone-sheet').forEach(el => el.setAttribute('aria-hidden', 'true'));
      return;
    }
    const openNode = document.querySelector('.js-node.js-node--open');
    if (openNode) {
      e.preventDefault(); e.stopPropagation();
      document.querySelectorAll('.js-node.js-node--open').forEach(n => {
        n.classList.remove('js-node--open');
        n.setAttribute('aria-expanded', 'false');
      });
      return;
    }
    e.preventDefault(); e.stopPropagation();
    ActionExperience.close();
    return;
  }

  if (ClarityExperience && ClarityExperience.isOpen) {
    e.preventDefault();
    e.stopPropagation();
    // Pop the zoomed star page first (mirrors the X button in js/02 closeNow):
    // explain sheet, then zoom, and only then the whole clarity view.
    const nsExplain = document.getElementById('nsExplainSheet');
    if (nsExplain && nsExplain.getAttribute('aria-hidden') === 'false') {
      const x = document.getElementById('nsExplainClose');
      if (x) x.click(); else nsExplain.setAttribute('aria-hidden', 'true');
      return;
    }
    const nsScene = document.getElementById('nsScene');
    if (nsScene && nsScene.classList.contains('ns-star-scene--zoomed')) {
      nsScene.classList.remove('ns-star-scene--zoomed');
      return;
    }
    ClarityExperience.close();
    return;
  }
  // Notes layers pop innermost-first: focus mode, then full screen, and only
  // then does Escape fall through to closing the sheet itself.
  if (Sheet && Sheet.isOpen && document.body.classList.contains('notes-zen')) {
    e.preventDefault(); e.stopPropagation();
    const zx = document.getElementById('rZenExit');
    if (zx) { zx.click(); }
    else {
      try {
        document.body.classList.remove('notes-zen');
        const sh = document.querySelector('.rnotes'); if (sh) sh.classList.remove('rnotes--zen', 'is-mouse');
        if (typeof SHEET_TEMPLATES !== 'undefined' && SHEET_TEMPLATES.reflection) SHEET_TEMPLATES.reflection._zen = false;
      } catch (err) {}
    }
    return;
  }
  if (Sheet && Sheet.isOpen && document.body.classList.contains('notes-fs')) {
    e.preventDefault(); e.stopPropagation();
    const fb = document.getElementById('rFsBtn');
    if (fb) { fb.click(); }
    else {
      try {
        document.body.classList.remove('notes-fs');
        if (typeof SHEET_TEMPLATES !== 'undefined' && SHEET_TEMPLATES.reflection) SHEET_TEMPLATES.reflection._fs = false;
      } catch (err) {}
    }
    return;
  }
  if (Sheet && Sheet.isOpen) {
    e.preventDefault();
    e.stopPropagation();
    Sheet.close();
    return;
  }

  // Universal fallback: Escape must back out of SOMETHING no matter where the
  // user is. Two failure modes this covers:
  //  (1) Flag desync: reloading while inside a module restores its .open class
  //      on boot WITHOUT calling open(), so isOpen stays false and the guarded
  //      handlers above skip it. Detect by CLASS and resync the flag so the
  //      guarded close() actually runs.
  //  (2) Standalone dialogs/sheets/modals the specific handlers never knew about.
  try {
    // Click the experience's own visible close control. This is the SAME action
    // the user takes, so it works regardless of any internal open-state flag
    // that may have desynced (e.g. after a reload restored the view by class).
    const clickClose = (overlaySel, btnSel) => {
      if (!document.querySelector(overlaySel)) return false;
      const x = [...document.querySelectorAll(btnSel)].find(b => b && b.getClientRects().length > 0) ||
                document.querySelector(btnSel);
      if (x) { e.preventDefault(); e.stopPropagation(); x.click(); return true; }
      return false;
    };
    if (clickClose('.action-exp.open', '.action-exp__close, .fullscreen-close-global.visible, .fullscreen-close-global')) return;
    if (clickClose('.clarity-exp.open, .clarity-exp.open-bg, .clarity-exp.open-content', '.clarity-exp__close, .fullscreen-close-global.visible, .fullscreen-close-global')) return;
    if (clickClose('.sheet--exp.open, .sheet.open', '.sheet--exp.open .sheet__close, .sheet.open .sheet__close, .sheet__close')) return;
    const cand = [...document.querySelectorAll(
      '[role="dialog"][aria-hidden="false"], [class*="-sheet"][aria-hidden="false"],' +
      ' [class*="-dialog"][aria-hidden="false"], [class*="-modal"][aria-hidden="false"], .modal.open,' +
      ' [class*="-modal"].open, [class*="-overlay"].open, [class*="-sheet"].open, [class*="-dialog"].open'
    )].filter(el => el.getClientRects().length > 0);
    if (cand.length) {
      cand.sort((a, b) => (parseInt(getComputedStyle(a).zIndex, 10) || 0) - (parseInt(getComputedStyle(b).zIndex, 10) || 0));
      const top = cand[cand.length - 1];
      const btn = top.querySelector('button[class*="close"], [aria-label*="close" i], button[class*="back"], [aria-label*="back" i], [data-close]');
      e.preventDefault();
      e.stopPropagation();
      if (btn) btn.click(); else top.setAttribute('aria-hidden', 'true');
    }
  } catch (err) {}
}, true);

// Safety net: dismiss the splash when the GET STARTED button is tapped, bound
// at the document level so it works even if Splash.init() never ran (e.g. an
// earlier init threw on iOS). Scoped to the button only: tap-anywhere made
// the whole screen a misfire surface (Malik).
['pointerup', 'touchend', 'click'].forEach((ev) => {
  document.addEventListener(ev, (e) => {
    if (!e.target || !e.target.closest || !e.target.closest('#splashGetStarted')) return;
    const sp = document.getElementById('splash');
    if (sp && !sp.classList.contains('dismissed') && !sp.classList.contains('splash--exiting')) {
      // Splash is in this IIFE's scope (same as the keydown handler below).
      try { Splash.dismiss(); } catch (err) { sp.classList.add('dismissed'); }
    }
  }, true);
});

// Perf: pause every CSS animation while the tab/app is backgrounded. Browsers
// already throttle requestAnimationFrame when hidden; this covers the ~100
// always-running CSS keyframe animations too, so a backgrounded Memento stops
// burning the phone's GPU/battery.
(function () {
  const st = document.createElement('style');
  st.textContent = 'body.app-paused *, body.app-paused *::before, body.app-paused *::after{animation-play-state:paused!important;}';
  document.head.appendChild(st);
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('app-paused', document.hidden);
  });
})();

// Perf: "lite mode" for phones / touch / low-power devices. Drops the two
// effects that make weaker GPUs stutter the most: frosted-glass backdrop blur
// (re-blurs everything behind a panel every frame) and the animated ambient
// background layers. Panels keep their translucent tint, just without the live
// blur-behind. Desktop / mouse devices are completely unaffected.
(function () {
  const st = document.createElement('style');
  st.textContent = [
    'body.lite *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}',
    'body.lite .ambient__ns-bloom{animation:none!important;}',
    // Dashboard ambient orbs: 3 large blur(30px) radial layers animate
    // transform+scale (15-18s loops) which re-rasterizes the blur every frame
    // and keeps a will-change GPU layer alive. Freeze them in lite -> they
    // settle at their 0% keyframe (natural position, no scale) so the colourful
    // static wash is unchanged; drop will-change so the layer can be released.
    // Same pattern already used for splash/welcome/clarity orbs. Full mode
    // (desktop / mouse) keeps the live drift.
    'body.lite .ambient__orb{will-change:auto!important;}',
    // Splash: keep the colourful gradient but make the blurred blobs STATIC on
    // mobile. Animating a blur(22px) blob re-rasterises it every frame and was
    // dragging the splash to ~18fps on iPad.
    'body.lite .splash-blob{filter:blur(22px)!important;animation:none!important;}',
    'body.lite .splash__bg-gradient::before,body.lite .splash__bg-gradient::after{animation:none!important;}',
    // Welcome/onboarding screen: the 4 orbs ARE allowed to drift in lite (Malik
    // wants them moving). The animation is transform + opacity only (GPU-cheap,
    // compositor-only) and the blur is dropped to 18px in onboarding.css, so just
    // keep will-change off to limit layer memory; do NOT freeze the animation.
    'body.lite .welcome-intro__orb{will-change:auto!important;}',
    // Login screen: 4 big blur(34px) orbs (will-change:transform) drift on very
    // slow 36-42s loops. Freeze them static in lite (same fix as splash/welcome
    // orbs) and release the GPU layer. They settle to the base translucent glow;
    // the colourful wash behind the login card is unchanged, just static.
    'body.lite .login__orb{animation:none!important;will-change:auto!important;}',
    // Clarity-exp overlay: 4 big blur(32-34px) orbs were animating infinitely
    // -> freeze them static on low-power devices (blur rasterizes once instead
    // of every frame). Same fix already applied to splash/welcome/ns-star orbs.
    // Radius is kept; orbs settle at their 0% keyframe (their natural position),
    // so the look is unchanged, just static. Full/desktop mode is unaffected.
    'body.lite .clarity-exp__bg::before,body.lite .clarity-exp__bg::after,body.lite .clarity-exp__bg-orb3,body.lite .clarity-exp__bg-orb4{animation:none!important;}',
    // Keep the frosted blur on the chat compose bars even in lite mode. These
    // are small fixed bars at the bottom; the blur is cheap here and it's what
    // makes messages scrolling behind them look intentional (frosted) instead
    // of harshly clipping through like a window.
    'body.lite .action-chat__input-row,body.lite .ai-chat__input-row{backdrop-filter:blur(calc(18px * var(--bx, 1))) saturate(125%)!important;-webkit-backdrop-filter:blur(calc(18px * var(--bx, 1))) saturate(125%)!important;background:rgba(10,10,14,0.55)!important;}',
    // Without backdrop-blur, translucent overlays would let the dashboard show
    // through on mobile. Make the full-screen overlays opaque in lite mode.
    'body.lite .clarity-exp{background:#050308!important;}',
    'body.lite .ns-refine-overlay{background:rgba(4,6,12,0.96)!important;}',
    // CRITICAL neutron-star view fixes (was 1fps on mobile). Three things each
    // re-rasterized a blur/shadow EVERY frame:
    //  1) the canvas had stacked drop-shadows (up to 140px) recomputed from the
    //     live morphing canvas -> drop the filter entirely; the .ns-star-glow
    //     halo behind it still gives the glow. Also kill its scale-pulse.
    'body.lite .ns-star-blob{filter:brightness(1.18)!important;animation:none!important;}',
    //  2) the glow halo animated scale() on a blur(20px) layer -> make it static
    //     (the blur then rasterizes once instead of every frame).
    'body.lite .ns-star-glow{animation:none!important;}',
    //  3) the starfield was 60 dots each with will-change + box-shadow = 60 GPU
    //     layers -> flatten them (static, no per-dot layer/shadow).
    'body.lite .ns-star-scene__star{animation:none!important;will-change:auto!important;box-shadow:none!important;}',
    // Zoomed-in star: mix-blend-mode + animated scale on a gradient = extra
    // render pass every frame. Neutralise on mobile and lighten the big blur.
    'body.lite .ns-star-scene--zoomed::after{mix-blend-mode:normal!important;animation:none!important;}',
    'body.lite .ns-star-scene--zoomed .ns-star-stage{filter:blur(10px) brightness(0.95) saturate(2.4) contrast(1.05) hue-rotate(-6deg)!important;}',
    // Orbiting comet border: the `orbit` keyframe animates the registered
    // --angle property, which re-rasterizes a blurred conic-gradient + mask
    // EVERY frame. Freeze it on mobile (the comet stays as a static glowing
    // arc). NOTE: the clarity-INTRO button is intentionally excluded because
    // its animation is compound (fade-in + orbit) and `animation:none` would
    // also kill the opacity fade that reveals the button.
    'body.lite .widget--clarity::before,body.lite .widget--action.action-unlocked::before,body.lite .sheet-btn--action,body.lite .welcome-intro__btn--orbit{animation:none!important;}',
    // Dashboard neutron bloom: halo animates opacity on a blur(18px) radial
    // layer (inset:-360px) -> repaints a huge blurred surface each frame.
    // Ring = 3 infinite scale/opacity loops; rest state is opacity:0, so hide
    // them in lite (prevents a stray frozen ring) instead of leaving mid-pulse.
    'body.lite .dash-mission__neutron-halo{animation:none!important;will-change:auto!important;}',
    'body.lite .dash-mission__neutron-ring{animation:none!important;opacity:0!important;}',
    // Clarity experience: 4 large blur(32-34px) radial orbs animate scale ->
    // re-rasterize the blur each frame. Overlay is already opaque in lite, so
    // freezing the orbs keeps the same colourful static wash.
    'body.lite .clarity-exp__bg::before,body.lite .clarity-exp__bg::after,body.lite .clarity-exp__bg-orb3,body.lite .clarity-exp__bg-orb4{animation:none!important;}',
    // Action plan: 12 light beams (each 2200px wide) wobble via actPlanBeamWob.
    // Their per-beam selector (0,3,0) outranks the generic lite gate on
    // .ambient__rays-beam, so they kept animating; !important closes the gap.
    'body.lite .action-plan__rays .ambient__rays-beam{animation:none!important;}',
    // Journey path: stroke-dashoffset flow repaints the SVG every frame (not
    // GPU-accelerated in Safari); node glows scale a radial-gradient per node.
    'body.lite #actionJourneyPath.js-path--flowing{animation:none!important;}',
    'body.lite .js-glow{animation:none!important;}',
    // Zoomed star: nsStarBreathe scales a blur layer; lite already lightens the
    // filter but the scale still drives blur cost -> stop it too.
    'body.lite .ns-star-scene--zoomed .ns-star-stage{animation:none!important;}',
    // Text-shadow glow pulses (streak number, mori countdown) repaint per frame.
    'body.lite .streak-hero__num,body.lite .mori-countdown__value{animation:none!important;}'
  ].join('');
  document.head.appendChild(st);
  const isLite = () =>
       window.matchMedia('(max-width: 820px)').matches
    || window.matchMedia('(pointer: coarse)').matches
    || (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4);
  const apply = () => document.body.classList.toggle('lite', isLite());
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
})();

// Scroll performance: while the user is actively scrolling, pause the heavy
// continuous effects (WebGL star, gradient borders, dashboard animations). On
// mobile, re-rasterising those every frame WHILE scrolling is what drops FPS to
// single digits. Pausing them lets the page scroll at 60fps; they snap back the
// instant scrolling stops (invisible during a fast scroll).
(function () {
  const st = document.createElement('style');
  st.textContent = 'body.is-scrolling .app *,body.is-scrolling .app *::before,body.is-scrolling .app *::after{animation-play-state:paused!important;}';
  (document.head || document.documentElement).appendChild(st);
  let t = 0;
  const onScroll = () => {
    if (!window.__scrolling) {
      window.__scrolling = true;
      document.body.classList.add('is-scrolling');
    }
    clearTimeout(t);
    t = setTimeout(() => {
      window.__scrolling = false;
      document.body.classList.remove('is-scrolling');
    }, 130);
  };
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  document.addEventListener('touchmove', onScroll, { passive: true });
})();

// Mobile navigation gestures (touch devices only):
//  - Swipe left->right to go BACK: if a note is open full-screen it returns to
//    the notes library; otherwise it closes the topmost full-screen overlay.
//  - Swipe left->right starting from the very left edge of the dashboard opens
//    the menu (the on-screen hamburger is hidden on mobile).
(function () {
  var TOUCH = false;
  try {
    TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      || ('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0)
      || /[?&]gest=1/.test(location.search); // test hook to force-enable on desktop
  } catch (e) {}
  if (!TOUCH) return;
  var sx = 0, sy = 0, st = 0, tracking = false, overlayAtStart = false, menuAtStart = false, startEl = null;
  function overlayOpen() {
    try { return !!document.querySelector('.sheet.open, .action-exp.open, .clarity-exp.open, .welcome-intro.open'); } catch (e) { return false; }
  }
  // Don't hijack swipes over things that use horizontal drag themselves.
  function blocked(el) {
    return !!(el && el.closest && el.closest('.vcanvas__viewport, canvas, input[type="range"], .rtoolbar, .menu-peek, .sidebar, [data-no-swipe]'));
  }
  document.addEventListener('touchstart', function (e) {
    if (!e.touches || e.touches.length !== 1) { tracking = false; return; }
    var t = e.touches[0];
    sx = t.clientX; sy = t.clientY; st = Date.now(); startEl = e.target; tracking = true; overlayAtStart = overlayOpen();
    menuAtStart = document.body.classList.contains('menu-peek');
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!tracking) { return; } tracking = false;
    var t = e.changedTouches && e.changedTouches[0]; if (!t) return;
    var dx = t.clientX - sx, dy = t.clientY - sy, dt = Date.now() - st;
    // Menu open: a leftward (right->left) swipe closes it. Checked first, and it
    // is allowed even over the sidebar itself.
    if (menuAtStart && document.body.classList.contains('menu-peek')) {
      if (dt < 700 && dx < -55 && Math.abs(dy) < Math.abs(dx) * 0.7) {
        var bd = document.querySelector('.menu-peek-backdrop'); if (bd) bd.click();
      }
      return;
    }
    // (v230) The modules now live on PAGE 2 of the native scroll-snap home, so the
    // old left-swipe-opens-the-Modules-sheet shortcut is retired (opening the sheet
    // would steal the live widget grid off page 2). Swipe down on page 1 stays a
    // native scroll to the modules.
    // Require a quick, clearly-horizontal, rightward swipe.
    if (dt > 700 || dx < 70 || Math.abs(dy) > Math.abs(dx) * 0.55) return;
    if (blocked(startEl)) return;
    if (overlayAtStart) {
      if (sx > window.innerWidth * 0.6) return; // only the left ~60% triggers back
      // Nested back: a full-screen note returns to its library first; otherwise
      // close the whole overlay via the existing Escape path.
      var inNoteBack = document.querySelector('.rnotes--mobedit #rMobBack');
      if (inNoteBack) { try { inNoteBack.click(); } catch (x) {} }
      else { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); } catch (x) {} }
    } else if (sx < 30) {
      // Dashboard: a left-edge swipe opens the menu (hamburger hidden on mobile).
      var mb = document.getElementById('sidebarReveal') || document.querySelector('.sidebar-reveal');
      if (mb) { try { mb.click(); } catch (x) {} }
    }
  }, { passive: true });
})();

// Minimal home (v161): wire the Modules affordance (a tap-target twin of the
// swipe) and log one app_open per day for the Activation Point readout (local).
(function () {
  try { if (window.Analytics) Analytics.track('app_open'); } catch (e) {}
  try {
    var hint = document.getElementById('homeModulesHint');
    if (hint) hint.addEventListener('click', function () {
      try { if (typeof MoreSpace !== 'undefined' && MoreSpace.open) MoreSpace.open({ mode: 'switcher' }); } catch (e) {}
    });
  } catch (e) {}
})();

// DISABLED in v230: the home is now a native scroll-snap pager (card+Today = page
// 1, the modules dashboard = page 2). The old swipe-up-to-open-a-sheet would
// preventDefault the touchmove and block the native scroll, and would steal the
// widget grid off page 2 into a sheet. Kept for reference; returns immediately.
(function () {
  return;
  /* eslint-disable no-unreachable */
  var TOUCH = false;
  try {
    TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      || ('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0)
      || /[?&]gest=1/.test(location.search);
  } catch (e) {}
  if (!TOUCH) return;

  function homeReady() {
    try {
      if (window.innerWidth > 859) return false;                 // mobile home only
      if (!document.body.classList.contains('ns-bloom')) return false; // post-Clarity
      if (document.body.classList.contains('menu-peek')) return false;
      if (document.getElementById('moreSpace')) return false;     // already open
      if (document.querySelector('.sheet.open, .action-exp.open, .clarity-exp.open, .welcome-intro.open, #mementoFull, #appearancePicker')) return false;
      var dash = document.querySelector('.app.dash-v2');
      return !!(dash && dash.offsetParent !== null);
    } catch (e) { return false; }
  }
  function blocked(el) {
    return !!(el && el.closest && el.closest(
      '#dayCard, .daycard-ns, button, a, input, textarea, select, [role="button"], ' +
      '.tab-bar, .sidebar, .vcanvas__viewport, canvas, [data-no-swipe]'));
  }
  // An up-drag should scroll the page first if there is more below; only steal it
  // for the modules once the home is scrolled to (or near) its bottom.
  function atScrollBottom(el) {
    try {
      var n = el;
      while (n && n.nodeType === 1 && n !== document.body && n !== document.documentElement) {
        var cs = getComputedStyle(n);
        if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 4) {
          return n.scrollTop + n.clientHeight >= n.scrollHeight - 6;
        }
        n = n.parentNode;
      }
      var doc = document.scrollingElement || document.documentElement;
      return (doc.scrollTop + window.innerHeight) >= doc.scrollHeight - 6;
    } catch (e) { return true; }
  }

  var sx = 0, sy = 0, armed = false, engaged = false, pull = 0, lastY = 0, lastT = 0, vel = 0;

  document.addEventListener('touchstart', function (e) {
    armed = false; engaged = false; pull = 0; vel = 0;
    if (!e.touches || e.touches.length !== 1) return;
    if (!homeReady()) return;
    var t = e.touches[0];
    if (blocked(e.target)) return;
    if (t.clientY < window.innerHeight * 0.46) return;   // lower area only (below the card)
    // The minimal home is a single page that may overflow the viewport by a little
    // (the taller card). Treat a small overflow as non-scrolling so the gesture is
    // always live; only genuinely long content must be scrolled to its bottom first.
    var doc = document.scrollingElement || document.documentElement;
    var docOver = doc ? (doc.scrollHeight - window.innerHeight) : 0;
    if (!atScrollBottom(e.target) && docOver > 150) return;
    sx = t.clientX; sy = t.clientY; lastY = sy; lastT = (e.timeStamp || 0);
    armed = true;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!armed || !e.touches || e.touches.length !== 1) return;
    var t = e.touches[0];
    var dy = t.clientY - sy, dx = t.clientX - sx;
    if (!engaged) {
      if (dy > 4) { armed = false; return; }                       // went down -> let it scroll
      if (Math.abs(dy) < 10) return;                               // wait for a clear move
      if (Math.abs(dx) > Math.abs(dy) * 0.7) { armed = false; return; } // too horizontal
      engaged = true;
      try { MoreSpace.open({ mode: 'switcher', startDragged: true }); }
      catch (x) { engaged = false; armed = false; return; }
    }
    pull = Math.max(0, sy - t.clientY);
    var now = (e.timeStamp || 0);
    if (now > lastT) { vel = (lastY - t.clientY) / (now - lastT); lastY = t.clientY; lastT = now; }
    try { MoreSpace.dragMove(pull); } catch (x) {}
    if (e.cancelable) e.preventDefault();
  }, { passive: false });

  function endDrag() {
    if (!engaged) { armed = false; return; }
    engaged = false; armed = false;
    try { MoreSpace.dragEnd(pull, vel); } catch (x) {}
    pull = 0; vel = 0;
  }
  document.addEventListener('touchend', endDrag, { passive: true });
  document.addEventListener('touchcancel', endDrag, { passive: true });
})();

// Diagnostic HUD (debug only): open the app with ?perf=1 in the URL to show a
// live metrics readout in the top-right corner. Tells us whether a slowdown is
// a leak (a number climbs), the GPU/phone (FPS drops, others flat), or neither.
(function () {
  // Legacy perf HUD, superseded by the ?perf=1 diagnostic overlay at the top of
  // the script. Kept dormant to avoid a duplicate readout.
  return;
  // eslint-disable-next-line no-unreachable
  try {
    var glMade = 0;
    var origGet = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') glMade++;
      return origGet.apply(this, arguments);
    };
    var rafCalls = 0;
    var origRaf = (window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); }).bind(window);
    window.requestAnimationFrame = function (cb) { rafCalls++; return origRaf(cb); };
    var hud = document.createElement('div');
    hud.id = '__perfHud';
    hud.style.cssText =
      'position:fixed;top:90px;left:8px;z-index:2147483647;' +
      'background:#000;color:#3f6;font:13px/1.5 ui-monospace,monospace;padding:10px 12px;' +
      'border-radius:calc(10px * var(--rx, 1));pointer-events:none;white-space:pre;border:2px solid #3f6;box-shadow:0 6px 24px rgba(0,0,0,0.6);';
    hud.textContent = 'PERF\nstarting...';
    var pin = function () { var root = document.documentElement; if (root && hud.parentNode !== root) root.appendChild(hud); };
    pin();
    var lastSec = performance.now(), lastNodes = 0, peakNodes = 0;
    setInterval(function () {
      pin();
      var now = performance.now();
      var dt = (now - lastSec) / 1000; lastSec = now;
      var fps = dt > 0 ? Math.round(rafCalls / dt) : 0;
      var nodes = document.getElementsByTagName('*').length;
      if (nodes > peakNodes) peakNodes = nodes;
      var delta = nodes - lastNodes; lastNodes = nodes;
      hud.textContent =
        'PERF (crash hunt)\n' +
        'anim loops/s: ' + fps + '\n' +
        'canvases: ' + document.querySelectorAll('canvas').length + '\n' +
        'GL ctx made: ' + glMade + '\n' +
        'DOM nodes: ' + nodes + ' (' + (delta >= 0 ? '+' : '') + delta + '/s)\n' +
        'DOM peak: ' + peakNodes + '\n' +
        'heap MB: ' + (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 'n/a');
      rafCalls = 0;
    }, 1000);
  } catch (e) {
    try {
      var err = document.createElement('div');
      err.style.cssText = 'position:fixed;top:90px;left:8px;z-index:2147483647;background:#900;color:#fff;font:12px ui-monospace,monospace;padding:8px;border-radius:calc(8px * var(--rx, 1));white-space:pre;max-width:90vw;';
      err.textContent = 'PERF HUD error:\n' + (e && e.message ? e.message : e);
      (document.documentElement || document.body).appendChild(err);
    } catch (e2) {}
  }
})();

// Freeze the page whenever a full-screen module / dialog is open, so the open
// thing behaves like a locked game screen: you can't drag the page around to
// reveal empty space behind it. Scrolling INSIDE the module (chat lists, the
// text box, etc.) still works.
(function () {
  const OPEN_SEL = [
    '.clarity-exp.open-bg', '.clarity-exp.open',
    '.action-exp.open-bg', '.action-exp.open',
    '.sheet.open',
    '.ns-refine-overlay.is-open',
    '#welcomeIntro.open',
    '.splash:not(.dismissed)'
  ].join(',');

  const st = document.createElement('style');
  st.textContent = 'body.scroll-locked{overflow:hidden!important;}';
  document.head.appendChild(st);

  let locked = false;
  const refresh = () => {
    const open = !!document.querySelector(OPEN_SEL);
    if (open === locked) return;
    locked = open;
    document.body.classList.toggle('scroll-locked', open);
    // Signal WebGL loops to pause the dashboard's star while a module is open,
    // freeing the GPU so the opening module renders fast.
    window.__moduleOpen = open;
  };
  // React whenever an overlay's open/close class changes anywhere in the tree.
  new MutationObserver(refresh).observe(document.documentElement, {
    attributes: true, attributeFilter: ['class'], subtree: true
  });
  document.addEventListener('focusin', refresh);
  document.addEventListener('focusout', () => setTimeout(refresh, 60));
  refresh();

  // Block the page itself from being dragged while a module is open, but allow
  // real scrolling inside the regions that are meant to scroll. Uses a cheap
  // closest() selector match (NOT getComputedStyle, which forces a style
  // recalc on every touchmove and lags dragging).
  const SCROLLABLE = 'textarea,input,.clarity-exp__page-wrap,.sheet__body,' +
    '.ns-summary__panel-body,.ns-star-detail,.action-exp__scroll,.action-refine-sheet__chat,[data-scrollable]';
  document.addEventListener('touchmove', (e) => {
    if (!locked) return;
    if (e.target.closest && e.target.closest(SCROLLABLE)) return; // allow inner scroll
    if (e.cancelable) e.preventDefault();                          // freeze the page
  }, { passive: false });
})();

document.addEventListener('keydown', (e) => {
  // Don't intercept if user is typing in an input/textarea
  const tag = document.activeElement?.tagName;
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

  if (e.key === 'Escape') {
    // Already handled in the capture-phase listener above. Kept here as a
    // safety net but should be a no-op since the experience is already closed.
    if (ClarityExperience.isOpen) {
      e.preventDefault();
      e.stopPropagation();
      exitToModules('clarity');
      return;
    } else if (ActionExperience.isOpen) {
      e.preventDefault();
      e.stopPropagation();
      exitToModules('action');
      return;
    } else if (Sheet.isOpen) {
      e.preventDefault();
      e.stopPropagation();
      exitToModules('sheet');
      return;
    }
  }

  if (e.key === 'Enter') {
    // Don't hijack Enter when typing in a text field (unless it's a single-line input)
    if (tag === 'TEXTAREA') return;

    // Splash screen  - tap to continue (but never while typing in the cloud
    // sign-in dialog, which handles its own Enter)
    const splashEl = document.getElementById('splash');
    if (splashEl && !splashEl.classList.contains('dismissed') &&
        !(e.target && e.target.closest && e.target.closest('[data-cloud-keep]'))) {
      Splash.dismiss();
      e.preventDefault();
      return;
    }

    // Login form  - submit on Enter
    const loginEl = document.getElementById('loginScreen');
    if (loginEl && !loginEl.classList.contains('hidden')) {
      const btn = document.getElementById('loginStart');
      if (btn) btn.click();
      e.preventDefault();
      return;
    }

    // Welcome intro stepper  - advance
    const welcomeEl = document.getElementById('welcomeIntro');
    if (welcomeEl && welcomeEl.classList.contains('open')) {
      const btn = document.getElementById('welcomeNext');
      if (btn) btn.click();
      e.preventDefault();
      return;
    }

    // Clarity experience  - click the next/continue button
    if (ClarityExperience.isOpen) {
      const nextBtn = document.getElementById('cexpNext');
      if (nextBtn && !nextBtn.disabled) {
        nextBtn.click();
        e.preventDefault();
        return;
      }
    }
  }
});

// Offline: register the service worker. It is network-first for everything,
// so online behavior is byte-identical to having no worker (always fresh) and
// offline serves the last good copy. Skipped for file:// (the single-file
// bundle) and unsupported browsers. The version query rotates the cache name
// whenever MEMENTO_VERSION bumps, discarding old caches on activate.
(function registerSW() {
  try {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    window.addEventListener('load', () => {
      try {
        const v = (window.MEMENTO_VERSION || 'v24');
        navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(v)).catch(() => {});
      } catch (e) {}
    });
  } catch (e) {}
})();

// Onboarding keyboard: PIN the welcome-intro to the visual viewport while an
// input is focused, so iOS has no reason to scroll/pan the page to reveal the
// field (that pan was the "jump up"). We size the fixed layer to exactly the
// visible area (height = visualViewport.height, top = visualViewport.offsetTop);
// its centered content then simply tracks the shrinking visible area as the
// keyboard slides in — a smooth follow, not a jolt. On blur it reverts to the
// full 100lvh. The glow is baked into the layer's own background (see CSS), so
// resizing it never flashes. preventScroll on the auto-focus handles the rest.
(function welcomeComposerPin() {
  try {
    // DISABLED (Malik, on-device iOS 26.5 / iPhone 14 Pro Max, 2026-07-01): pinning the
    // nav rail fixed and tracking bottom = innerHeight - vv.height - vv.offsetTop put the
    // name fields + Continue at the TOP of the screen over the status bar, clearly worse.
    // That is now SIX failed keyboard interventions (see the ios-keyboard-viewport-pin
    // memory for the full list). iOS handles the keyboard natively until someone tests
    // ON-DEVICE while iterating; do not re-enable from the preview alone.
    return;
    // eslint-disable-next-line no-unreachable
    if (/[?&]kbfix=0/.test(location.search)) return;
    const vv = window.visualViewport;
    if (!vv) return;
    let pinned = null;
    const gap = () => Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    const update = () => { if (pinned) pinned.style.bottom = gap() + 'px'; };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    const unpin = () => {
      if (!pinned) return;
      const wi = document.querySelector('.welcome-intro');
      if (wi) wi.style.paddingBottom = '';
      pinned.classList.remove('wc-nav--pinned');
      pinned.style.bottom = '';
      pinned = null;
    };
    const pin = (nav, wi) => {
      if (pinned === nav) { update(); return; }
      unpin();
      pinned = nav;
      // reserve the rail's slot so the conversation column does not shift down
      wi.style.paddingBottom = nav.offsetHeight + 'px';
      nav.classList.add('wc-nav--pinned');
      update();
    };
    document.addEventListener('focusin', (e) => {
      const t = e.target;
      if (!t || (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA')) return;
      const wi = document.querySelector('.welcome-intro.open');
      if (!wi || !wi.contains(t)) return;
      // scope to the conversation dock only (composer / name fields); chip and
      // date beats keep their normal in-flow rail.
      const nav = t.closest('.welcome-intro__nav');
      if (!nav || !nav.querySelector('.wc-dock')) return;
      pin(nav, wi);
    }, true);
    document.addEventListener('focusout', () => {
      // small delay so first-name -> last-name refocus keeps the pin (no flicker)
      setTimeout(() => {
        const a = document.activeElement;
        if (!a || (a.tagName !== 'INPUT' && a.tagName !== 'TEXTAREA') || !a.closest('.wc-nav--pinned')) unpin();
      }, 60);
    }, true);
  } catch (e) {}
})();

// Cosmetic keyboard compensation (Malik's idea, 2026-07-01): we do NOT fight the iOS pan
// (see the six failed attempts above). While a conversation text field is focused, the
// message column eases DOWN (--wc-kbshift in CSS) so the pushed-up screen reads composed
// instead of cramped at the top; removed on blur. The INPUT itself is deliberately NOT
// shifted (moving it down just makes iOS pan further, cancelling the shift). Pure class
// toggle + CSS transform, no viewport math, so it cannot misplace anything. ?kbfix=0 off.
(function welcomeKeyboardShift() {
  try {
    // DISABLED (Malik, on-device, 2026-07-01): both variants looked bad with the real
    // keyboard (content-only shift split the layout; all-elements shift still read wrong
    // after iOS's own pan). Keyboard behavior stays fully native. Deferred to a live
    // on-device iteration session; see the ios-keyboard-viewport-pin memory.
    return;
    // eslint-disable-next-line no-unreachable
    if (/[?&]kbfix=0/.test(location.search)) return;
    const isField = (t) => !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'));
    document.addEventListener('focusin', (e) => {
      const t = e.target;
      if (!isField(t)) return;
      const wi = document.querySelector('.welcome-intro.open');
      if (!wi || !wi.contains(t)) return;
      if (!t.closest('.wc-dock')) return; // conversation composer / name fields only
      wi.classList.add('wc-kbshift');
    }, true);
    document.addEventListener('focusout', () => {
      // grace so hopping first-name -> last-name keeps the shift (no bounce)
      setTimeout(() => {
        const a = document.activeElement;
        if (isField(a) && a.closest('.wc-dock')) return;
        const wi = document.querySelector('.welcome-intro');
        if (wi) wi.classList.remove('wc-kbshift');
      }, 60);
    }, true);
  } catch (e) {}
})();

// ?kbd=1 — hidden on-screen readout of the live viewport numbers, so the exact
// iOS keyboard behavior can be SEEN on-device (screenshot) instead of inferred.
(function welcomeKeyboardDebug() {
  try {
    if (!/[?&]kbd=1/.test(location.search)) return;
    const vv = window.visualViewport;
    const dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;top:64px;left:8px;z-index:2147483647;background:rgba(0,0,0,0.82);color:#0f0;font:12px ui-monospace,monospace;padding:8px 10px;border-radius:8px;white-space:pre;pointer-events:none;';
    document.body.appendChild(dbg);
    const upd = () => {
      const wi = document.querySelector('.welcome-intro.open');
      dbg.textContent =
        'innerH ' + window.innerHeight +
        '\nvv.height ' + (vv ? Math.round(vv.height) : '-') +
        '\nvv.offsetTop ' + (vv ? Math.round(vv.offsetTop) : '-') +
        '\nscrollY ' + Math.round(window.scrollY || 0) +
        '\nwi.top ' + (wi ? getComputedStyle(wi).top : '-') +
        '\nwi.height ' + (wi ? getComputedStyle(wi).height : '-');
    };
    if (vv) { vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd); }
    window.addEventListener('scroll', upd, true);
    setInterval(upd, 150); upd();
  } catch (e) {}
})();

// ---------------------------------------------------------------------------
// Pull-down-to-search (Spotlight-style). The Search tab was removed in favour of
// this: at the very top of the home, dragging down opens the command palette.
// overscroll-behavior is already 'none', so this never fights a browser
// pull-to-refresh. A one-time, fixed, transient hint teaches it without touching
// the (locked) home layout.
// ---------------------------------------------------------------------------
(function pullToSearch() {
  try {
    var startY = 0, tracking = false, fired = false;
    function topY() { return window.scrollY || document.documentElement.scrollTop || 0; }
    function blocked() {
      try {
        if (typeof state !== 'undefined' && state.meta && state.meta.welcomeSeen !== true) return true; // still onboarding
        if (typeof TabBar !== 'undefined' && TabBar.activeTab && TabBar.activeTab !== 'home') return true;
        if (document.querySelector('.sheet.open, .coach-sheet, #spotInput, .clarity-exp.open, .pwa-install, .save-memento')) return true;
        var sp = document.querySelector('.splash'); if (sp && getComputedStyle(sp).display !== 'none' && !sp.classList.contains('dismissed')) return true;
        return false;
      } catch (e) { return false; }
    }
    document.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches.length) { tracking = false; return; }
      if (topY() > 6 || blocked()) { tracking = false; return; }
      startY = e.touches[0].clientY; tracking = true; fired = false;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!tracking || fired || !e.touches || !e.touches.length) return;
      if (topY() > 6) { tracking = false; return; }
      if (e.touches[0].clientY - startY > 86) {
        fired = true; tracking = false;
        try { if (window.Spotlight && window.Spotlight.open) window.Spotlight.open(); } catch (_) {}
        try { localStorage.setItem('memento_pullsearch_seen', '1'); } catch (_) {}
      }
    }, { passive: true });
    document.addEventListener('touchend', function () { tracking = false; }, { passive: true });

    function maybeHint() {
      try {
        if (localStorage.getItem('memento_pullsearch_seen')) return;
        if (!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return; // touch devices only
        if (topY() > 6 || blocked()) return;
        if (document.getElementById('pullSearchHint')) return;
        var h = document.createElement('div');
        h.id = 'pullSearchHint'; h.className = 'pull-search-hint';
        h.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>Pull down to search';
        document.body.appendChild(h);
        requestAnimationFrame(function () { h.classList.add('is-on'); });
        setTimeout(function () { try { h.classList.remove('is-on'); setTimeout(function () { try { h.remove(); } catch (_) {} }, 450); } catch (_) {} }, 4200);
        try { localStorage.setItem('memento_pullsearch_seen', '1'); } catch (_) {}
      } catch (e) {}
    }
    setTimeout(maybeHint, 2800);
  } catch (e) {}
})();
