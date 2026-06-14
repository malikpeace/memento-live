/* Memento module: Vivere engine + vision-board canvas
   Extracted from app.js lines 12069-13255. Loaded as a classic <script> so
   all modules share one global lexical scope (no window pollution). Order matters:
   this file must load before js/11-init.js, which runs the bootstrap immediately. */
/* ============================================
   MEMENTO VIVERE  (engine + helpers)
   The counterweight to Mori. A daily aliveness system: one small "live today"
   invitation, a private Memory Jar, and a small Alive List. Calm and human, not
   gratitude-journal corny, not hustle. Writes proofEvents so it feeds Momentum
   and the Proof Trail exactly like the other modules.
   ============================================ */
const VIVERE_CATEGORIES = ['connection', 'beauty', 'play', 'awe', 'peace', 'body', 'meaning', 'novelty'];

/* ============================================
   VIVERE CANVAS: a freeform, dotted-grid vision board. Place note / image /
   link cards anywhere, drag to move, drag the corner dot to connect two cards,
   click a connecting line to cut it. Persists to state.vivere.canvas. Built
   with plain pointer events so it works on touch and mouse without a library.
   ============================================ */
// v22: Vivere holds multiple named BOARDS. Each board is its own infinite
// canvas {id,name,theme,cards,links,view{panX,panY,zoom},nextZ}. The legacy
// single `canvas` migrates into boards[0] on first access.
function _vivDefaultTheme() { return { bg: null, dotStyle: 'dot', dotDensity: 28, accent: null }; }
function _vivBoards() {
  if (!state.vivere) state.vivere = {};
  var v = state.vivere;
  if (!Array.isArray(v.boards)) v.boards = [];
  if (v.boards.length === 0) {
    var legacy = (v.canvas && typeof v.canvas === 'object') ? v.canvas : null;
    v.boards.push({
      id: 'bd_' + Date.now() + '_0',
      name: 'Vision board',
      theme: _vivDefaultTheme(),
      cards: (legacy && Array.isArray(legacy.cards)) ? legacy.cards : [],
      links: (legacy && Array.isArray(legacy.links)) ? legacy.links : [],
      view: (legacy && legacy.view && typeof legacy.view === 'object') ? legacy.view : { panX: 0, panY: 0, zoom: 1 },
      nextZ: (legacy && legacy.nextZ) ? legacy.nextZ : 1,
      createdAt: Date.now()
    });
    v.canvas = null; // migrated; boards is now the single source of truth
  }
  if (!v.activeBoardId || !v.boards.some(function (b) { return b && b.id === v.activeBoardId; })) v.activeBoardId = v.boards[0].id;
  return v.boards;
}
// The active board, normalized. All canvas operations run against this object.
function _vivCanvas() {
  var boards = _vivBoards();
  var b = null;
  for (var i = 0; i < boards.length; i++) { if (boards[i] && boards[i].id === state.vivere.activeBoardId) { b = boards[i]; break; } }
  if (!b) b = boards[0];
  if (!Array.isArray(b.cards)) b.cards = [];
  if (!Array.isArray(b.links)) b.links = [];
  if (!b.view || typeof b.view !== 'object') b.view = { panX: 0, panY: 0, zoom: 1 };
  if (typeof b.view.zoom !== 'number' || !(b.view.zoom > 0)) b.view.zoom = 1;
  if (typeof b.view.panX !== 'number') b.view.panX = 0;
  if (typeof b.view.panY !== 'number') b.view.panY = 0;
  if (!b.theme || typeof b.theme !== 'object') b.theme = _vivDefaultTheme();
  if (!b.nextZ) b.nextZ = b.cards.reduce(function (m, k) { return Math.max(m, k.z || 1); }, 1) + 1;
  // Patina migration: cards from before createdAt existed get the board's
  // birthday quietly, so age tooltips and On This Day never see a blank.
  for (var j = 0; j < b.cards.length; j++) { var k = b.cards[j]; if (k && !k.createdAt) k.createdAt = b.createdAt || Date.now(); }
  return b;
}
function _vivGenId(p) { return (p || 'vc') + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e4); }
// Normalize user-entered URLs: bare domains get https://, weird schemes get ''.
function _vivNormUrl(raw) {
  raw = String(raw || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) return 'https://' + raw;
  return '';
}
function _vivHostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
}
// Extract a YouTube video id (exactly 11 chars) from watch / shorts / embed /
// youtu.be URLs. Returns '' for anything else, so no unvalidated string ever
// reaches the poster or iframe URLs.
function _vivYouTubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else { const m = u.pathname.match(/^\/(shorts|embed|live)\/([^\/]+)/); if (m) id = m[2]; }
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  } catch (e) { return ''; }
}
// Card patina: "on this board 14 months" tooltip text from createdAt.
function _vivAgeLabel(ts) {
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days < 1) return 'on this board since today';
  if (days < 30) return 'on this board ' + days + (days === 1 ? ' day' : ' days');
  if (days < 365) { const m = Math.max(1, Math.round(days / 30)); return 'on this board ' + m + (m === 1 ? ' month' : ' months'); }
  const y = Math.floor(days / 365);
  return 'on this board ' + y + (y === 1 ? ' year' : ' years');
}
// True on the card's creation anniversary (same month+day, a past year).
function _vivIsAnniversary(ts) {
  if (!ts) return false;
  try {
    const d = new Date(ts), n = new Date();
    return d.getFullYear() < n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  } catch (e) { return false; }
}
// The three fixed quote-card templates. Fixed on purpose; consistency reads as premium.
const VIV_QSTYLES = ['light', 'italic-deep', 'mono'];
// Short, friendly date for the "Lived" stamp. "Jun 9" this year, "Jun 9 '25" otherwise.
function _vivFmtLived(ts) {
  try {
    const d = new Date(ts); if (isNaN(d)) return '';
    const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const now = new Date();
    return m + ' ' + d.getDate() + (d.getFullYear() !== now.getFullYear() ? " '" + String(d.getFullYear()).slice(2) : '');
  } catch (e) { return ''; }
}

/* ===== IndexedDB media store (v22) ==========================================
   Images (Vivere cards + reflection note imgs) live here, NOT inline in state,
   so localStorage stays tiny and a real vision board / notes corpus fits.
   Blobs are ~33% smaller than base64. State references an imageId; rendering
   hydrates async (placeholder, then objectURL). Falls back to inline dataURLs
   when IndexedDB is unavailable. ========================================== */
var IDB_OK = (typeof indexedDB !== 'undefined' && indexedDB !== null);
var _idbDB = null, _idbOpening = null;
var _idbUrlCache = new Map(); // imageId -> objectURL (revoked on delete/unmount)

function newImageId() { return 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }

function idbReady() {
  if (!IDB_OK) return Promise.resolve(null);
  if (_idbDB) return Promise.resolve(_idbDB);
  if (_idbOpening) return _idbOpening;
  _idbOpening = new Promise(function (resolve) {
    var req;
    try { req = indexedDB.open('memento_media', 1); }
    catch (e) { IDB_OK = false; resolve(null); return; }
    req.onupgradeneeded = function () {
      try {
        var db = req.result;
        if (!db.objectStoreNames.contains('images')) {
          var st = db.createObjectStore('images', { keyPath: 'id' });
          st.createIndex('byCreatedAt', 'createdAt', { unique: false });
        }
      } catch (e) {}
    };
    req.onsuccess = function () { _idbDB = req.result; resolve(_idbDB); };
    req.onerror = function () { IDB_OK = false; resolve(null); };
    req.onblocked = function () { resolve(null); };
  });
  return _idbOpening;
}

function _dataURLtoBlob(dataURL) {
  try {
    var parts = String(dataURL).split(',');
    var meta = parts[0] || '';
    var isB64 = /;base64/i.test(meta);
    var mime = (meta.match(/data:([^;]+?)[;,]/) || [null, 'image/jpeg'])[1];
    var data = parts.slice(1).join(',');
    var bin = isB64 ? atob(data) : decodeURIComponent(data);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch (e) { return null; }
}

function idbPutImage(id, dataURL, w, h) {
  return idbReady().then(function (db) {
    if (!db) return null;
    var blob = _dataURLtoBlob(dataURL);
    if (!blob) return null;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction('images', 'readwrite');
        tx.objectStore('images').put({ id: id, blob: blob, w: w || 0, h: h || 0, type: blob.type, createdAt: Date.now() });
        tx.oncomplete = function () { resolve(id); };
        tx.onerror = function () { resolve(null); };
        tx.onabort = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  });
}

function idbGetBlobURL(id) {
  if (!id) return Promise.resolve(null);
  if (_idbUrlCache.has(id)) return Promise.resolve(_idbUrlCache.get(id));
  return idbReady().then(function (db) {
    if (!db) return null;
    return new Promise(function (resolve) {
      try {
        var rq = db.transaction('images', 'readonly').objectStore('images').get(id);
        rq.onsuccess = function () {
          var rec = rq.result;
          if (!rec || !rec.blob) { resolve(null); return; }
          var url = URL.createObjectURL(rec.blob);
          _idbUrlCache.set(id, url);
          resolve(url);
        };
        rq.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  });
}

function idbGetDataURL(id) {
  return idbReady().then(function (db) {
    if (!db) return null;
    return new Promise(function (resolve) {
      try {
        var rq = db.transaction('images', 'readonly').objectStore('images').get(id);
        rq.onsuccess = function () {
          var rec = rq.result;
          if (!rec || !rec.blob) { resolve(null); return; }
          var fr = new FileReader();
          fr.onload = function () { resolve(fr.result); };
          fr.onerror = function () { resolve(null); };
          fr.readAsDataURL(rec.blob);
        };
        rq.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  });
}

function idbRevoke(id) {
  if (_idbUrlCache.has(id)) {
    try { URL.revokeObjectURL(_idbUrlCache.get(id)); } catch (e) {}
    _idbUrlCache.delete(id);
  }
}

function idbDeleteImage(id) {
  idbRevoke(id);
  return idbReady().then(function (db) {
    if (!db) return;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction('images', 'readwrite');
        tx.objectStore('images').delete(id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  });
}

function idbListIds() {
  return idbReady().then(function (db) {
    if (!db) return [];
    return new Promise(function (resolve) {
      try {
        var rq = db.transaction('images', 'readonly').objectStore('images').getAllKeys();
        rq.onsuccess = function () { resolve(Array.prototype.slice.call(rq.result || [])); };
        rq.onerror = function () { resolve([]); };
      } catch (e) { resolve([]); }
    });
  });
}

// Store a dataURL, returning a Promise of the new imageId (or null on failure).
function idbStore(dataURL, w, h) {
  var id = newImageId();
  return idbPutImage(id, dataURL, w, h).then(function (ok) { return ok ? id : null; });
}

// Async hydrate: every <img data-img-id> placeholder gets its objectURL set.
// Guards detached nodes; marks hydrated so repeat passes are cheap.
function hydrateImageEls(root) {
  if (!root || !root.querySelectorAll) return;
  var els = root.querySelectorAll('img[data-img-id]:not([data-img-hydrated])');
  for (var i = 0; i < els.length; i++) (function (el) {
    var id = el.getAttribute('data-img-id');
    if (!id) return;
    el.setAttribute('data-img-hydrated', '1');
    el.classList.add('img-skeleton');
    idbGetBlobURL(id).then(function (url) {
      if (!el.isConnected) return;
      if (url) { el.src = url; el.classList.remove('img-skeleton'); el.classList.add('img-loaded'); }
      else { el.classList.remove('img-skeleton'); el.classList.add('img-missing'); }
    });
  })(els[i]);
}

// Downscale an uploaded image to a dataURL within a max edge, to respect the
// browser storage budget. Calls cb(dataURL, w, h) or cb(null) on failure.
function vivDownscaleImage(file, maxDim, cb) {
  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        let out; try { out = cv.toDataURL('image/jpeg', 0.82); } catch (err) { out = null; }
        cb(out, w, h);
      };
      img.onerror = () => cb(null);
      img.src = e.target.result;
    };
    reader.onerror = () => cb(null);
    reader.readAsDataURL(file);
  } catch (e) { cb(null); }
}

// Rough guard against the localStorage quota before storing a large image.
function vivStorageOk(extraBytes) {
  try {
    const cur = JSON.stringify(state).length;
    return (cur + (extraBytes || 0)) < 4500000;
  } catch (e) { return true; }
}

// Only reached on the inline (no-IndexedDB) fallback path; IDB has GB of room.
function _vivStorageWarn() {
  try { (typeof showToast === 'function') ? showToast('Storage is getting full. Remove a few images first.') : alert('Storage is getting full. Remove a few images first.'); }
  catch (e) { try { alert('Storage is getting full.'); } catch (_) {} }
}

const VivereCanvas = {
  _bound: false,
  _raf: 0,
  _pT: 0,
  _LINK_OFF: 50000,
  _ZMIN: 0.25,
  _ZMAX: 2.5,

  view(active) {
    const c = _vivCanvas();
    const empty = c.cards.length === 0;
    return '' +
      '<div class="vcanvas vcanvas--fs">' +
        '<div class="vcanvas__viewport" id="vcViewport" tabindex="-1">' +
          '<div class="vcanvas__grid" id="vcGrid"></div>' +
          '<div class="vcanvas__world" id="vcWorld">' +
            this._linksSvg(c) +
            c.cards.slice().sort((a, b) => ((a.type === 'frame') === (b.type === 'frame')) ? 0 : (a.type === 'frame' ? -1 : 1)).map(card => this._cardHtml(card)).join('') +
          '</div>' +
          (empty ? '<div class="vcanvas__empty"><div class="vcanvas__empty-t">Your vision board</div><div class="vcanvas__empty-s">Double tap to add a note. Drop images to build a collage. Drag the corner dot to connect cards. Scroll to zoom, drag empty space to pan.</div></div>' : '') +
        '</div>' +
        '<div class="vcanvas__vignette" aria-hidden="true"></div>' +
        '<div class="vcanvas__bar">' +
          this._boardSwitcherHtml() +
          '<span class="vcanvas__sep" aria-hidden="true"></span>' +
          renderVivereTabs('canvas') +
          '<span class="vcanvas__sep" aria-hidden="true"></span>' +
          '<button type="button" class="vcanvas__btn vcanvas__btn--add" data-vc-addmenu aria-haspopup="true">+ Add</button>' +
          '<button type="button" class="vcanvas__btn" data-vc-customize aria-label="Customize board">Style</button>' +
          '<input type="file" accept="image/*" id="vcFile" multiple style="display:none">' +
        '</div>' +
        '<div class="vcanvas__zoombar">' +
          '<button type="button" class="vcanvas__zbtn" data-vc-zoom="out" aria-label="Zoom out">&minus;</button>' +
          '<button type="button" class="vcanvas__zbtn" data-vc-zoom="fit" aria-label="Fit to view">Fit</button>' +
          '<button type="button" class="vcanvas__zbtn" data-vc-zoom="in" aria-label="Zoom in">+</button>' +
        '</div>' +
        '<div class="vcanvas__hintbar" aria-hidden="true">Drag cards. Corner dot connects. Paste a link or image. Scroll to zoom.</div>' +
      '</div>';
  },

  _boardSwitcherHtml() {
    const boards = _vivBoards();
    const active = _vivCanvas();
    // Cover thumbnail: the board's real card layout, miniaturized (a tiny
    // svg map of card rects). Reads as "that board" at a glance.
    const cover = (b) => {
      const cards = (b.cards || []).slice(0, 24);
      if (!cards.length) return '<svg class="vcanvas__bm-cover" viewBox="0 0 44 30" aria-hidden="true"></svg>';
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      cards.forEach(c => { minX = Math.min(minX, c.x || 0); minY = Math.min(minY, c.y || 0); maxX = Math.max(maxX, (c.x || 0) + (c.w || 200)); maxY = Math.max(maxY, (c.y || 0) + (c.h || 120)); });
      const sw = Math.max(1, maxX - minX), sh = Math.max(1, maxY - minY);
      const k = Math.min(40 / sw, 26 / sh);
      const rects = cards.map(c => {
        const rx = 2 + ((c.x || 0) - minX) * k, ry = 2 + ((c.y || 0) - minY) * k;
        const rw = Math.max(1.5, (c.w || 200) * k), rh = Math.max(1.5, (c.h || 120) * k);
        const fill = c.type === 'image' ? '0.55' : (c.lived ? '0.7' : '0.3');
        return '<rect x="' + rx.toFixed(1) + '" y="' + ry.toFixed(1) + '" width="' + rw.toFixed(1) + '" height="' + rh.toFixed(1) + '" rx="1" fill="rgba(var(--ink),' + fill + ')"/>';
      }).join('');
      return '<svg class="vcanvas__bm-cover" viewBox="0 0 44 30" aria-hidden="true">' + rects + '</svg>';
    };
    const items = boards.map(b => (
      '<button type="button" class="vcanvas__bm-item' + (b.id === active.id ? ' is-active' : '') + '" data-vc-board="' + esc(b.id) + '">' +
        cover(b) +
        '<span class="vcanvas__bm-name">' + esc(b.name || 'Board') + '</span>' +
        (boards.length > 1 ? '<span class="vcanvas__bm-x" data-vc-board-del="' + esc(b.id) + '" role="button" aria-label="Delete board">&times;</span>' : '') +
      '</button>'
    )).join('');
    return '<div class="vcanvas__board" id="vcBoardSwitch">' +
      '<button type="button" class="vcanvas__board-btn" data-vc-board-toggle><span class="vcanvas__board-name">' + esc(active.name || 'Board') + '</span><span class="vcanvas__board-car" aria-hidden="true">&#9662;</span></button>' +
      '<div class="vcanvas__board-menu">' + items +
        '<div class="vcanvas__bm-eyebrow">New board</div>' +
        '<button type="button" class="vcanvas__bm-item vcanvas__bm-item--new" data-vc-board-new>+ Blank</button>' +
        '<button type="button" class="vcanvas__bm-item vcanvas__bm-item--new" data-vc-board-new="vision">+ Vision board</button>' +
        '<button type="button" class="vcanvas__bm-item vcanvas__bm-item--new" data-vc-board-new="gratitude">+ Gratitude wall</button>' +
        '<button type="button" class="vcanvas__bm-item vcanvas__bm-item--new" data-vc-board-new="people">+ People wall</button>' +
        '<button type="button" class="vcanvas__bm-item" data-vc-board-rename>Rename this board</button>' +
        '<button type="button" class="vcanvas__bm-item" data-vc-board-export>Export as image</button>' +
      '</div>' +
    '</div>';
  },

  _cardCenter(card) { return { x: (card.x || 0) + (card.w || 200) / 2, y: (card.y || 0) + (card.h || 120) / 2 }; },

  _linkPath(a, b) {
    const O = this._LINK_OFF;
    const c1 = this._cardCenter(a), c2 = this._cardCenter(b);
    const dx = Math.abs(c2.x - c1.x) * 0.4;
    return 'M ' + (c1.x + O) + ' ' + (c1.y + O) + ' C ' + (c1.x + dx + O) + ' ' + (c1.y + O) + ', ' + (c2.x - dx + O) + ' ' + (c2.y + O) + ', ' + (c2.x + O) + ' ' + (c2.y + O);
  },

  _linksSvg(c) {
    const byId = {}; c.cards.forEach(k => { byId[k.id] = k; });
    let paths = '';
    c.links.forEach(l => {
      const a = byId[l.from], b = byId[l.to];
      if (!a || !b) return;
      const d = this._linkPath(a, b);
      paths += '<path class="vcanvas__link-hit" data-vc-cut="' + l.id + '" d="' + d + '"></path>';
      paths += '<path class="vcanvas__link" data-vc-line="' + l.id + '" d="' + d + '"></path>';
    });
    return '<svg class="vcanvas__links" id="vcLinks" width="100000" height="100000"><path class="vcanvas__link vcanvas__link--temp" id="vcTempLink" d=""></path>' + paths + '</svg>';
  },

  _cardHtml(card) {
    const x = card.x || 0, y = card.y || 0, z = card.z || 1, w = card.w || 200;
    let inner = '';
    if (card.type === 'image' && (card.imageId || card.dataURL)) {
      if (card.imageId) {
        inner = '<img class="vcard__img" data-img-id="' + esc(card.imageId) + '" alt="" draggable="false">';
      } else {
        inner = '<img class="vcard__img" src="' + esc(card.dataURL) + '" alt="" draggable="false">';
      }
      if (card.text) inner += '<div class="vcard__cap">' + esc(card.text) + '</div>';
    } else if (card.type === 'video' && /^[A-Za-z0-9_-]{11}$/.test(card.videoId || '')) {
      inner = '<div class="vcard__video" data-vc-video>' + this._videoInnerHtml(card, false) + '</div>' +
        '<div class="vcard__video-t">' + esc(card.title || 'YouTube') + '</div>';
    } else if (card.type === 'link') {
      const url = _vivNormUrl(card.url || '');
      const host = _vivHostOf(url);
      // Local app, no metadata scraping: favicon via the public s2 endpoint,
      // hidden on error so the tile gracefully falls back to title + domain.
      const fav = host
        ? '<img class="vcard__fav" src="https://www.google.com/s2/favicons?domain=' + esc(encodeURIComponent(host)) + '&amp;sz=64" alt="" draggable="false" loading="lazy" onerror="this.style.visibility=&#39;hidden&#39;">'
        : '';
      inner = '<a class="vcard__link" href="' + esc(url).replace(/"/g, '&quot;').replace(/'/g, '&#39;') + '" target="_blank" rel="noopener">' +
        '<span class="vcard__fav-tile" aria-hidden="true">' + fav + '</span>' +
        '<span class="vcard__link-body">' +
          '<span class="vcard__link-t">' + esc(card.title || host || 'Link') + '</span>' +
          '<span class="vcard__link-h">' + esc(host || url || 'link') + '</span>' +
        '</span></a>';
    } else if (card.type === 'quote') {
      inner = '<div class="vcard__quote">' +
        '<div class="vcard__quote-text" contenteditable="true" data-vc-qtext spellcheck="false" data-ph="A line worth keeping">' + esc(card.text || '') + '</div>' +
        '<div class="vcard__quote-attr" contenteditable="true" data-vc-qattr spellcheck="false" data-ph="who said it">' + esc(card.attribution || '') + '</div>' +
      '</div>';
    } else if (card.type === 'frame') {
      // Frame (Freeform section): a labeled region that sits BEHIND cards.
      inner = '<div class="vcard__frame-label" contenteditable="true" data-vc-note spellcheck="false" data-ph="Section">' + esc(card.text || '') + '</div>';
    } else if (card.type === 'display') {
      // Floating display text (Freeform pattern): big type, no card chrome.
      inner = '<div class="vcard__display" contenteditable="true" data-vc-note spellcheck="false" data-ph="Big words">' + esc(card.text || '') + '</div>';
    } else {
      inner = '<div class="vcard__note" contenteditable="true" data-vc-note spellcheck="false" data-ph="Write something worth keeping">' + esc(card.text || '') + '</div>';
    }
    const frame = card.frame && card.frame !== 'none' ? ' vcard--frame-' + card.frame : '';
    const noteColor = card.noteColor ? ' vcard--paper-' + card.noteColor : '';
    const lived = card.lived ? ' vcard--lived' : '';
    const cap = (card.type === 'image' && card.caption) ? '<div class="vcard__caption">' + esc(card.caption) + '</div>' : '';
    const label = card.label ? '<div class="vcard__label">' + esc(card.label) + '</div>' : '';
    const livedStamp = card.lived
      ? '<div class="vcard__lived-stamp" aria-hidden="true"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>Lived' + (card.livedAt ? ' &middot; ' + esc(_vivFmtLived(card.livedAt)) : '') + '</div>'
      : '';
    const livedTitle = card.lived ? 'Unmark as lived' : 'Mark as lived';
    // Patina: age tooltip + a soft gold ring on the card's creation anniversary.
    const anniv = _vivIsAnniversary(card.createdAt) ? ' vcard--anniv' : '';
    const age = _vivAgeLabel(card.createdAt);
    const qstyle = card.type === 'quote'
      ? ' data-qstyle="' + (VIV_QSTYLES.indexOf(card.qstyle) !== -1 ? card.qstyle : 'light') + '"'
      : '';
    const qbtn = card.type === 'quote'
      ? '<button type="button" class="vcard__qstyle" data-vc-qstyle aria-label="Change quote style" title="Change quote style">Aa</button>'
      : '';
    return '<div class="vcard vcard--' + (card.type || 'note') + frame + noteColor + lived + anniv + '" data-id="' + card.id + '"' + qstyle + (age ? ' title="' + esc(age) + '"' : '') + ' style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;z-index:' + z + '">' +
      '<button type="button" class="vcard__lived-btn" data-vc-lived aria-label="' + livedTitle + '" title="' + livedTitle + '">' +
        '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>' +
      '</button>' +
      '<button type="button" class="vcard__del" data-vc-del aria-label="Delete card">' +
        '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>' +
      qbtn + label + inner + cap + livedStamp +
      '<div class="vcard__handle" data-vc-handle aria-label="Drag to connect"></div>' +
    '</div>';
  },

  /* YouTube facade (lite-youtube pattern): poster + glass play button, zero
     YouTube JS until intent. The iframe exists only after a click, at most one
     per board, and reverts to the poster when zoom drops below 0.4 or the card
     leaves the viewport (cheap check piggybacked on applyTransform). */
  _liveVideoCardId: null,

  _videoInnerHtml(card, live) {
    const id = /^[A-Za-z0-9_-]{11}$/.test(card.videoId || '') ? card.videoId : '';
    if (!id) return '<div class="vcard__video-missing">Video unavailable</div>';
    if (live) {
      return '<iframe class="vcard__video-frame" src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1" title="' + esc(card.title || 'YouTube video') + '" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    }
    return '<img class="vcard__poster" src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" draggable="false" loading="lazy">' +
      '<button type="button" class="vcard__play" data-vc-play aria-label="Play video"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>';
  },

  playVideo(cardId) {
    if (this._liveVideoCardId && this._liveVideoCardId !== cardId) this.stopVideo(this._liveVideoCardId);
    const card = this._cardById(cardId);
    const el = this._world && this._world.querySelector('.vcard[data-id="' + cardId + '"] [data-vc-video]');
    if (!card || !el) return;
    el.innerHTML = this._videoInnerHtml(card, true);
    this._liveVideoCardId = cardId;
  },

  stopVideo(cardId) {
    const id = cardId || this._liveVideoCardId;
    if (!id) return;
    const card = this._cardById(id);
    const el = this._world && this._world.querySelector('.vcard[data-id="' + id + '"] [data-vc-video]');
    if (card && el) el.innerHTML = this._videoInnerHtml(card, false);
    if (this._liveVideoCardId === id) this._liveVideoCardId = null;
  },

  _checkLiveVideo() {
    if (!this._liveVideoCardId || !this._viewport) return;
    const v = _vivCanvas().view;
    if (v.zoom < 0.4) { this.stopVideo(); return; }
    const card = this._cardById(this._liveVideoCardId);
    if (!card) { this._liveVideoCardId = null; return; }
    const w = this._viewport.clientWidth, h = this._viewport.clientHeight;
    const sx = (card.x || 0) * v.zoom + v.panX, sy = (card.y || 0) * v.zoom + v.panY;
    const sw = (card.w || 200) * v.zoom, sh = (card.h || 200) * v.zoom;
    if (sx + sw < 0 || sy + sh < 0 || sx > w || sy > h) this.stopVideo();
  },

  _dotBase() { const c = _vivCanvas(); return (c.theme && c.theme.dotDensity) || 28; },

  applyTransform() {
    const c = _vivCanvas();
    const v = c.view;
    if (this._world) this._world.style.transform = 'translate(' + v.panX + 'px,' + v.panY + 'px) scale(' + v.zoom + ')';
    if (this._grid) {
      const base = this._dotBase() * v.zoom;
      this._grid.style.backgroundSize = base + 'px ' + base + 'px';
      const px = (((v.panX % base) + base) % base), py = (((v.panY % base) + base) % base);
      this._grid.style.backgroundPosition = px + 'px ' + py + 'px';
    }
    this._checkLiveVideo();
  },

  _scheduleTransform() {
    if (this._raf) return;
    const self = this;
    this._raf = requestAnimationFrame(() => { self._raf = 0; self.applyTransform(); });
  },

  screenToWorld(clientX, clientY) {
    const c = _vivCanvas(); const v = c.view;
    const r = this._viewport ? this._viewport.getBoundingClientRect() : { left: 0, top: 0 };
    return { x: (clientX - r.left - v.panX) / v.zoom, y: (clientY - r.top - v.panY) / v.zoom };
  },

  _evXY(e) { const t = (e.touches && e.touches[0]) || e; return { x: t.clientX, y: t.clientY }; },

  worldViewportCenter() {
    const vp = this._viewport;
    if (!vp) return { x: 0, y: 0 };
    const r = vp.getBoundingClientRect();
    return this.screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
  },

  setZoomAt(newZoom, clientX, clientY) {
    const c = _vivCanvas(); const v = c.view;
    if (!this._viewport) return;
    newZoom = Math.max(this._ZMIN, Math.min(this._ZMAX, newZoom));
    const r = this._viewport.getBoundingClientRect();
    const sx = clientX - r.left, sy = clientY - r.top;
    const wx = (sx - v.panX) / v.zoom, wy = (sy - v.panY) / v.zoom;
    v.zoom = newZoom;
    v.panX = sx - wx * v.zoom;
    v.panY = sy - wy * v.zoom;
    this.applyTransform();
    this._debouncedPersist();
  },

  zoomBy(factor) {
    const r = this._viewport ? this._viewport.getBoundingClientRect() : null; if (!r) return;
    const c = _vivCanvas();
    this.setZoomAt(c.view.zoom * factor, r.left + r.width / 2, r.top + r.height / 2);
  },

  fitView() {
    const c = _vivCanvas(); const vp = this._viewport; if (!vp) return;
    const r = vp.getBoundingClientRect();
    if (!c.cards.length) { c.view.zoom = 1; c.view.panX = r.width / 2; c.view.panY = r.height / 2; this.applyTransform(); this._debouncedPersist(); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    c.cards.forEach(k => { minX = Math.min(minX, k.x || 0); minY = Math.min(minY, k.y || 0); maxX = Math.max(maxX, (k.x || 0) + (k.w || 200)); maxY = Math.max(maxY, (k.y || 0) + (k.h || 140)); });
    const pad = 80;
    const bw = (maxX - minX) + pad * 2, bh = (maxY - minY) + pad * 2;
    const z = Math.max(this._ZMIN, Math.min(this._ZMAX, Math.min(r.width / bw, r.height / bh)));
    c.view.zoom = z;
    c.view.panX = r.width / 2 - ((minX + maxX) / 2) * z;
    c.view.panY = r.height / 2 - ((minY + maxY) / 2) * z;
    this.applyTransform();
    this._debouncedPersist();
  },

  _debouncedPersist() { const self = this; clearTimeout(this._pT); this._pT = setTimeout(() => self._persist(), 400); },

  // Pan the view so a card sits centered. animate=true tweens pan+zoom over
  // ~600ms; reduced motion (system or calm-motion) jumps instead. Used by the
  // On This Day overlay and Memory lane jumps. Retries until the viewport has
  // real dimensions (the sheet animates in).
  centerOnCard(cardId, animate) {
    const self = this;
    const c = _vivCanvas();
    const card = c.cards.find(k => k.id === cardId);
    if (!card) return;
    card.lastViewedAt = Date.now();
    const attempt = (tries) => {
      const vp = self._viewport;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      if (r.width < 50) { if (tries < 20) setTimeout(() => attempt(tries + 1), 60); return; }
      const v = c.view;
      const z = Math.max(0.7, Math.min(1, v.zoom));
      const cx = (card.x || 0) + (card.w || 200) / 2;
      const cy = (card.y || 0) + (card.h || 140) / 2;
      const tx = r.width / 2 - cx * z, ty = r.height / 2 - cy * z;
      const reduced = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || document.body.classList.contains('calm-motion');
      if (!animate || reduced) { v.zoom = z; v.panX = tx; v.panY = ty; self.applyTransform(); self._debouncedPersist(); self._pulseCard(cardId); return; }
      const sx = v.panX, sy = v.panY, sz = v.zoom, t0 = performance.now(), dur = 600;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur), k = ease(t);
        v.panX = sx + (tx - sx) * k; v.panY = sy + (ty - sy) * k; v.zoom = sz + (z - sz) * k;
        self.applyTransform();
        if (t < 1) requestAnimationFrame(step);
        else { self._debouncedPersist(); self._pulseCard(cardId); }
      };
      requestAnimationFrame(step);
    };
    attempt(0);
  },

  // One-shot gold highlight so the eye lands on the card we just panned to.
  _pulseCard(cardId) {
    try {
      const el = this._world && this._world.querySelector('.vcard[data-id="' + cardId + '"]');
      if (!el) return;
      el.classList.add('vcard--found');
      setTimeout(() => { try { el.classList.remove('vcard--found'); } catch (e) {} }, 1600);
    } catch (e) {}
  },

  // Paste intelligence: a single URL becomes a link card (YouTube becomes a
  // video card); anything else becomes a note. Called by the paste handler.
  addFromText(text) {
    text = String(text || '').trim();
    if (!text) return null;
    const single = !/\s/.test(text);
    const url = single ? _vivNormUrl(text) : '';
    const host = url ? _vivHostOf(url) : '';
    if (url && host && host.indexOf('.') !== -1) {
      const vid = _vivYouTubeId(url);
      if (vid) return this.addCard('video', { videoId: vid, url: url, title: '' });
      return this.addCard('link', { url: url, title: '' });
    }
    return this.addCard('note', { text: text.slice(0, 2000) });
  },

  mount(container) {
    const vp = container.querySelector('#vcViewport');
    if (!vp) return;
    this._container = container;
    this._viewport = vp;
    this._world = container.querySelector('#vcWorld');
    this._grid = container.querySelector('#vcGrid');
    const self = this;
    const c = _vivCanvas();
    if (!c.view._init) {
      c.view._init = true;
      // Retry until the viewport has real dimensions (the sheet animates in, so
      // the first frame can have zero width), then fit content / center origin.
      const doFit = () => {
        const r = vp.getBoundingClientRect();
        if (r.width < 50) { setTimeout(doFit, 60); return; }
        if (c.cards.length) self.fitView();
        else { c.view.panX = r.width / 2; c.view.panY = r.height / 2; self.applyTransform(); }
      };
      setTimeout(doFit, 50);
    }
    this._bind(container);
    this._applyTheme(container);
    this.applyTransform();
    hydrateImageEls(this._world);
    try { vivShowOnThisDay(); } catch (e) {}
    try { vivScheduleNudge(); } catch (e) {}
  },

  addCard(type, extra) {
    const c = _vivCanvas();
    const ctr = this.worldViewportCenter();
    const w = type === 'image' ? 240 : (type === 'link' ? 260 : (type === 'video' ? 300 : (type === 'quote' ? 270 : (type === 'display' ? 340 : (type === 'sticky' ? 185 : (type === 'frame' ? 460 : 220))))));
    const h = type === 'image' ? 200 : (type === 'link' ? 84 : (type === 'video' ? 210 : (type === 'quote' ? 170 : (type === 'display' ? 96 : (type === 'sticky' ? 185 : (type === 'frame' ? 320 : 130))))));
    const n = c.cards.length % 6;
    const card = Object.assign({ id: _vivGenId(type), type: type, x: Math.round(ctr.x - w / 2 + n * 18), y: Math.round(ctr.y - h / 2 + n * 18), w: w, h: h, z: c.nextZ++, text: '', title: '', url: '', dataURL: '', createdAt: Date.now() }, extra || {});
    c.cards.push(card);
    this._persist();
    this._rerender();
    return card;
  },

  removeCard(id) {
    const c = _vivCanvas();
    const card = c.cards.find(k => k.id === id);
    if (card && card.imageId) { try { idbDeleteImage(card.imageId); } catch (e) {} }
    c.cards = c.cards.filter(k => k.id !== id);
    c.links = c.links.filter(l => l.from !== id && l.to !== id);
    this._persist();
    this._rerender();
  },

  toggleLived(id) {
    const c = _vivCanvas();
    const card = c.cards.find(k => k.id === id);
    if (!card) return;
    if (card.lived) { card.lived = false; delete card.livedAt; }
    else { card.lived = true; card.livedAt = Date.now(); }
    this._persist();
    this._rerender();
  },

  addLink(from, to) {
    if (from === to) return;
    const c = _vivCanvas();
    if (c.links.some(l => (l.from === from && l.to === to) || (l.from === to && l.to === from))) return;
    c.links.push({ id: _vivGenId('lk'), from: from, to: to });
    this._persist();
    this._rerender();
  },

  removeLink(id) {
    const c = _vivCanvas();
    c.links = c.links.filter(l => l.id !== id);
    this._persist();
    this._rerender();
  },

  bringToFront(card) { const c = _vivCanvas(); card.z = c.nextZ++; },

  _persist() { try { persistNow(); } catch (e) {} },

  _rerender() {
    if (!this._container) return;
    const wrap = this._container.querySelector('.vcanvas');
    if (!wrap) return;
    this._liveVideoCardId = null; // posters come back on every rebuild
    wrap.outerHTML = this.view();
    this._viewport = this._container.querySelector('#vcViewport');
    this._world = this._container.querySelector('#vcWorld');
    this._grid = this._container.querySelector('#vcGrid');
    this._bind(this._container);
    this._applyTheme(this._container);
    this.applyTransform();
    hydrateImageEls(this._world);
  },

  _redrawLinks() {
    const c = _vivCanvas();
    const byId = {}; c.cards.forEach(k => { byId[k.id] = k; });
    c.links.forEach(l => {
      const a = byId[l.from], b = byId[l.to];
      if (!a || !b) return;
      const d = this._linkPath(a, b);
      const line = this._world && this._world.querySelector('[data-vc-line="' + l.id + '"]');
      const hit = this._world && this._world.querySelector('[data-vc-cut="' + l.id + '"]');
      if (line) line.setAttribute('d', d);
      if (hit) hit.setAttribute('d', d);
    });
  },

  _cardById(id) { return _vivCanvas().cards.find(k => k.id === id); },

  switchBoard(id) {
    const boards = _vivBoards();
    if (!boards.some(b => b.id === id)) return;
    state.vivere.activeBoardId = id;
    this._persist();
    this._rerender();
  },

  // Board templates (Freeform "scenes" pattern): a new board can start
  // seeded with a purpose instead of a blank void. Cards are ordinary
  // cards; delete any of them freely.
  BOARD_TEMPLATES: {
    vision: {
      name: 'Vision board',
      cards: [
        { type: 'display', text: 'The life I am building', x: 40, y: 30, w: 420, h: 96 },
        { type: 'note', text: 'Drop images of the places, rooms, and mornings you want.', x: 40, y: 160, w: 250, h: 110 },
        { type: 'quote', text: 'You said this mattered. Prove it slowly.', qstyle: 'light', x: 330, y: 170, w: 270, h: 150 },
        { type: 'sticky', text: 'One year from now:', noteColor: 'amber', x: 40, y: 310, w: 185, h: 185 }
      ]
    },
    gratitude: {
      name: 'Gratitude wall',
      cards: [
        { type: 'display', text: 'What I refuse to take for granted', x: 40, y: 30, w: 520, h: 96 },
        { type: 'sticky', text: 'A person:', noteColor: 'rose', x: 40, y: 160, w: 185, h: 185 },
        { type: 'sticky', text: 'A place:', noteColor: 'green', x: 250, y: 180, w: 185, h: 185 },
        { type: 'sticky', text: 'A habit that saved me:', noteColor: 'blue', x: 460, y: 160, w: 185, h: 185 }
      ]
    },
    people: {
      name: 'People wall',
      cards: [
        { type: 'display', text: 'The people I am doing this for', x: 40, y: 30, w: 480, h: 96 },
        { type: 'note', text: 'One card per person. A photo, what they gave you, what you owe them.', x: 40, y: 160, w: 280, h: 110 }
      ]
    }
  },
  async exportBoardImage() {
    try {
      const c = _vivCanvas();
      const cards = (c.cards || []).filter(k => k);
      if (!cards.length) { try { showComingSoonToast('Nothing on this board yet.'); } catch (e) {} return; }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      cards.forEach(k => { minX = Math.min(minX, k.x || 0); minY = Math.min(minY, k.y || 0); maxX = Math.max(maxX, (k.x || 0) + (k.w || 200)); maxY = Math.max(maxY, (k.y || 0) + (k.h || 120)); });
      const PAD = 60, FOOT = 70;
      const sw = maxX - minX + PAD * 2, sh = maxY - minY + PAD * 2 + FOOT;
      const scale = Math.min(1, 1600 / sw);
      const cv = document.createElement('canvas');
      cv.width = Math.round(sw * scale); cv.height = Math.round(sh * scale);
      const cx = cv.getContext('2d');
      cx.scale(scale, scale);
      cx.fillStyle = '#0b0c10';
      cx.fillRect(0, 0, sw, sh);
      const rr = (x, y, w2, h2, r2) => { cx.beginPath(); cx.moveTo(x + r2, y); cx.arcTo(x + w2, y, x + w2, y + h2, r2); cx.arcTo(x + w2, y + h2, x, y + h2, r2); cx.arcTo(x, y + h2, x, y, r2); cx.arcTo(x, y, x + w2, y, r2); cx.closePath(); };
      const ordered = cards.slice().sort((a, b) => ((a.type === 'frame') === (b.type === 'frame')) ? ((a.z || 0) - (b.z || 0)) : (a.type === 'frame' ? -1 : 1));
      for (const k of ordered) {
        const x = (k.x || 0) - minX + PAD, y = (k.y || 0) - minY + PAD, w2 = k.w || 200, h2 = k.h || 120;
        if (k.type === 'frame') {
          cx.strokeStyle = 'rgba(245,245,247,0.18)'; cx.setLineDash([6, 5]); rr(x, y, w2, h2, 12); cx.stroke(); cx.setLineDash([]);
          cx.fillStyle = 'rgba(245,245,247,0.5)'; cx.font = '700 13px -apple-system, system-ui, sans-serif';
          cx.fillText((k.text || 'Section').slice(0, 40).toUpperCase(), x + 12, y + 22);
          continue;
        }
        cx.fillStyle = 'rgba(255,255,255,0.05)'; rr(x, y, w2, h2, 10); cx.fill();
        cx.strokeStyle = 'rgba(255,255,255,0.10)'; rr(x, y, w2, h2, 10); cx.stroke();
        if (k.type === 'image' && (k.imageId || k.dataURL)) {
          try {
            let url = k.dataURL;
            if (k.imageId && typeof idbGetBlobURL === 'function') url = await idbGetBlobURL(k.imageId);
            if (url) {
              const img = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
              if (img) { cx.save(); rr(x, y, w2, h2, 10); cx.clip(); cx.drawImage(img, x, y, w2, h2); cx.restore(); }
            }
          } catch (e) {}
        } else {
          cx.fillStyle = 'rgba(245,245,247,0.88)';
          cx.font = (k.type === 'display' ? '750 22px' : '500 13px') + ' -apple-system, system-ui, sans-serif';
          const words = String(k.text || k.title || '').split(/\s+/).filter(Boolean);
          let line = '', ty = y + (k.type === 'display' ? 34 : 24);
          const maxW = w2 - 24;
          for (const wd of words) {
            if (cx.measureText(line + ' ' + wd).width > maxW) { cx.fillText(line, x + 12, ty); ty += (k.type === 'display' ? 26 : 17); line = wd; if (ty > y + h2 - 10) { line += '...'; break; } }
            else line = line ? line + ' ' + wd : wd;
          }
          if (ty <= y + h2 - 4) cx.fillText(line, x + 12, ty);
        }
      }
      cx.fillStyle = 'rgba(201,162,75,0.9)';
      cx.font = '600 16px -apple-system, system-ui, sans-serif';
      cx.fillText(c.name || 'Board', PAD, sh - 36);
      cx.fillStyle = 'rgba(245,245,247,0.35)';
      cx.font = '700 11px -apple-system, system-ui, sans-serif';
      cx.fillText('M E M E N T O', PAD, sh - 16);
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = (c.name || 'board').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      try { showComingSoonToast('Board exported.'); } catch (e) {}
    } catch (e) {}
  },

  addBoard(template) {
    const boards = _vivBoards();
    const tpl = template && this.BOARD_TEMPLATES[template];
    const b = { id: 'bd_' + Date.now() + '_' + Math.floor(Math.random() * 1e4), name: tpl ? tpl.name : ('Board ' + (boards.length + 1)), theme: _vivDefaultTheme(), cards: [], links: [], view: { panX: 0, panY: 0, zoom: 1 }, nextZ: 1, createdAt: Date.now() };
    if (tpl) {
      tpl.cards.forEach((c, i) => {
        b.cards.push(Object.assign({ id: 'vc_' + Date.now().toString(36) + '_' + i + Math.random().toString(36).slice(2, 5), z: ++b.nextZ, createdAt: Date.now() }, c));
      });
    }
    boards.push(b);
    state.vivere.activeBoardId = b.id;
    this._persist();
    this._rerender();
  },

  renameBoard(id) {
    const b = (_vivBoards().find(x => x.id === id)) || _vivCanvas();
    const name = prompt('Board name', b.name || 'Board');
    if (name && name.trim()) { b.name = name.trim().slice(0, 40); this._persist(); this._rerender(); }
  },

  deleteBoard(id) {
    const boards = _vivBoards();
    if (boards.length <= 1) return;
    const idx = boards.findIndex(x => x.id === id); if (idx < 0) return;
    const b = boards[idx];
    const wasActive = state.vivere.activeBoardId === id;
    // Instant, with a 6s undo. Image purging waits for the window to close.
    state.vivere.boards = boards.filter(x => x.id !== id);
    if (wasActive) state.vivere.activeBoardId = state.vivere.boards[0].id;
    this._persist();
    this._rerender();
    const self = this;
    const purge = () => { (b.cards || []).forEach(card => { if (card.imageId) { try { idbDeleteImage(card.imageId); } catch (e) {} } }); };
    if (typeof showUndoToast === 'function') {
      showUndoToast('Board "' + (b.name || 'Board') + '" deleted.', () => {
        try {
          const bs = _vivBoards();
          bs.splice(Math.min(idx, bs.length), 0, b);
          if (wasActive) state.vivere.activeBoardId = b.id;
          self._persist();
          self._rerender();
        } catch (e) {}
      }, purge);
    } else { purge(); }
  },

  vivBulkImport(files) {
    const self = this;
    const arr = Array.prototype.slice.call(files).filter(f => /^image\//.test(f.type)).slice(0, 60);
    if (!arr.length) return;
    let pending = arr.length;
    const items = [];
    arr.forEach(f => {
      vivDownscaleImage(f, 1280, (dataURL, w, h) => {
        const done = () => { pending--; if (pending <= 0) self._placeMasonry(items); };
        if (!dataURL) { done(); return; }
        if (IDB_OK) {
          idbStore(dataURL, w, h).then(id => {
            if (id) items.push({ imageId: id, natW: w || 1, natH: h || 1 });
            else if (vivStorageOk(dataURL.length)) items.push({ dataURL: dataURL, natW: w || 1, natH: h || 1 });
            done();
          });
        } else {
          if (vivStorageOk(dataURL.length)) items.push({ dataURL: dataURL, natW: w || 1, natH: h || 1 });
          done();
        }
      });
    });
  },

  _placeMasonry(items) {
    if (!items.length) return;
    const c = _vivCanvas();
    const colW = 220, gutter = 14;
    const vp = this._viewport;
    const z = c.view.zoom || 1;
    const r = vp ? vp.getBoundingClientRect() : { left: 0, top: 0, width: 1000 };
    const tl = this.screenToWorld(r.left + 30, r.top + 30);
    const ox = Math.round(tl.x), oy = Math.round(tl.y);
    const vw = vp ? vp.clientWidth : 1000;
    const cols = Math.max(2, Math.min(6, Math.floor((vw / z) / (colW + gutter)) || 2));
    const colH = new Array(cols).fill(0);
    items.forEach(it => {
      let ci = 0; for (let i = 1; i < cols; i++) if (colH[i] < colH[ci]) ci = i;
      const w = colW, h = Math.max(60, Math.round(colW * (it.natH / it.natW)));
      const x = ox + ci * (colW + gutter), y = oy + colH[ci];
      colH[ci] += h + gutter;
      const extra = it.imageId ? { imageId: it.imageId } : { dataURL: it.dataURL };
      c.cards.push(Object.assign({ id: _vivGenId('image'), type: 'image', x: x, y: y, w: w, h: h, z: c.nextZ++, text: '', title: '', url: '', dataURL: '' }, extra));
    });
    this._persist();
    this._rerender();
  },

  _applyTheme(container) {
    const c = _vivCanvas();
    const t = c.theme || {};
    const wrap = container.querySelector('.vcanvas');
    const grid = container.querySelector('#vcGrid');
    if (wrap) {
      wrap.style.setProperty('--vc-bg', t.bg || 'var(--surface-0)');
      wrap.style.setProperty('--vc-accent', t.accent || 'rgba(201,162,75,0.55)');
      if (t.dotColor) wrap.style.setProperty('--vc-dot', t.dotColor);
    }
    if (grid) {
      grid.classList.remove('vc-grid--lines', 'vc-grid--none');
      if (t.dotStyle === 'lines') grid.classList.add('vc-grid--lines');
      else if (t.dotStyle === 'none') grid.classList.add('vc-grid--none');
    }
  },

  openCustomize() {
    const self = this;
    const c = _vivCanvas();
    const t = c.theme || (c.theme = _vivDefaultTheme());
    const wrap = this._container && this._container.querySelector('.vcanvas');
    const existing = wrap && wrap.querySelector('#vcCustomize');
    if (existing) { existing.remove(); return; }
    if (!wrap) return;
    const bgs = [['Default', 'var(--surface-0)'], ['Charcoal', '#0e0e12'], ['Ink', '#0a0d14'], ['Warm', '#14100c'], ['Slate', '#101418']];
    const accents = ['rgba(201,162,75,0.7)', 'rgba(123,151,255,0.7)', 'rgba(120,200,160,0.7)', 'rgba(232,122,170,0.7)', 'rgba(225,225,225,0.6)'];
    const styles = [['Dots', 'dot'], ['Lines', 'lines'], ['None', 'none']];
    const pop = document.createElement('div');
    pop.id = 'vcCustomize';
    pop.className = 'vc-customize';
    pop.innerHTML =
      '<div class="vc-cz__row"><div class="vc-cz__lbl">Grid</div><div class="vc-cz__opts">' +
        styles.map(s => '<button type="button" class="vc-cz__chip' + ((t.dotStyle || 'dot') === s[1] ? ' is-on' : '') + '" data-cz-style="' + s[1] + '">' + s[0] + '</button>').join('') +
      '</div></div>' +
      '<div class="vc-cz__row"><div class="vc-cz__lbl">Background</div><div class="vc-cz__opts">' +
        bgs.map(b => '<button type="button" class="vc-cz__sw' + ((t.bg || 'var(--surface-0)') === b[1] ? ' is-on' : '') + '" style="background:' + b[1] + '" data-cz-bg="' + b[1] + '" title="' + b[0] + '" aria-label="' + b[0] + '"></button>').join('') +
      '</div></div>' +
      '<div class="vc-cz__row"><div class="vc-cz__lbl">Accent</div><div class="vc-cz__opts">' +
        accents.map(a => '<button type="button" class="vc-cz__sw' + ((t.accent || accents[0]) === a ? ' is-on' : '') + '" style="background:' + a + '" data-cz-accent="' + a + '" aria-label="Accent"></button>').join('') +
      '</div></div>';
    wrap.appendChild(pop);
    pop.querySelectorAll('[data-cz-style]').forEach(b => b.addEventListener('click', () => { t.dotStyle = b.getAttribute('data-cz-style'); self._persist(); self._rerender(); self.openCustomize(); }));
    pop.querySelectorAll('[data-cz-bg]').forEach(b => b.addEventListener('click', () => { t.bg = b.getAttribute('data-cz-bg'); self._persist(); self._applyTheme(self._container); self._rerender(); self.openCustomize(); }));
    pop.querySelectorAll('[data-cz-accent]').forEach(b => b.addEventListener('click', () => { t.accent = b.getAttribute('data-cz-accent'); self._persist(); self._applyTheme(self._container); self._rerender(); self.openCustomize(); }));
  },

  _bindPinch(vp) {
    const self = this;
    let startDist = 0, startZoom = 1;
    vp.addEventListener('touchstart', (e) => { if (e.touches && e.touches.length >= 2) self._pinching = true; }, { passive: true });
    vp.addEventListener('touchmove', (e) => {
      if (!e.touches || e.touches.length !== 2) return;
      e.preventDefault();
      self._pinching = true;
      const a = e.touches[0], b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mid = { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
      if (!startDist) { startDist = dist; startZoom = _vivCanvas().view.zoom; return; }
      self.setZoomAt(startZoom * (dist / startDist), mid.x, mid.y);
    }, { passive: false });
    vp.addEventListener('touchend', (e) => { if (!e.touches || e.touches.length < 2) { startDist = 0; self._pinching = false; } });
    vp.addEventListener('touchcancel', () => { startDist = 0; self._pinching = false; });
  },

  _bind(container) {
    const self = this;
    const vp = container.querySelector('#vcViewport');
    if (!vp) return;
    this._viewport = vp;
    this._world = container.querySelector('#vcWorld');
    this._grid = container.querySelector('#vcGrid');

    vp.addEventListener('pointerdown', (e) => {
      // Don't pan during a two-finger pinch (it would fight the zoom anchor).
      if (self._pinching || (e.pointerType === 'touch' && e.isPrimary === false)) return;
      if (e.target.closest('.vcard') || e.target.closest('.vcanvas__link-hit') || e.target.closest('.vcanvas__bar') || e.target.closest('.vcanvas__zoombar') || e.target.closest('.vc-customize') || e.target.closest('.viv-nudge') || e.target.closest('.viv-otd')) return;
      // Focus the viewport so Cmd+V lands on the canvas paste handler.
      try { vp.focus({ preventScroll: true }); } catch (err) {}
      const c = _vivCanvas();
      const startX = e.clientX, startY = e.clientY, sp = { x: c.view.panX, y: c.view.panY };
      let panned = false;
      vp.classList.add('is-panning');
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!panned && Math.abs(dx) + Math.abs(dy) < 4) return;
        panned = true;
        c.view.panX = sp.x + dx; c.view.panY = sp.y + dy;
        self._scheduleTransform();
      };
      const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); vp.classList.remove('is-panning'); if (panned) self._debouncedPersist(); };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });

    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const c = _vivCanvas();
      const factor = Math.exp(-e.deltaY * 0.0015);
      self.setZoomAt(c.view.zoom * factor, e.clientX, e.clientY);
    }, { passive: false });

    vp.addEventListener('dblclick', (e) => {
      if (e.target.closest('.vcard') || e.target.closest('.vcanvas__link-hit') || e.target.closest('.vcanvas__bar')) return;
      const p = self.screenToWorld(e.clientX, e.clientY);
      const card = self.addCard('note', { x: Math.round(p.x - 110), y: Math.round(p.y - 60) });
      setTimeout(() => { const el = container.querySelector('.vcard[data-id="' + card.id + '"] [data-vc-note]'); if (el) el.focus(); }, 30);
    });

    this._bindPinch(vp);

    // Paste-intelligent capture, scoped to the canvas viewport (not global).
    // Image clipboard data -> image card (IndexedDB pipeline); URL text ->
    // link card (or video card for YouTube); plain text -> note card.
    vp.addEventListener('paste', (e) => {
      if (e.target && (e.target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(e.target.tagName || ''))) return;
      const cd = e.clipboardData; if (!cd) return;
      const items = cd.items || [];
      for (let i = 0; i < items.length; i++) {
        if (items[i] && /^image\//.test(items[i].type)) {
          const f = items[i].getAsFile();
          if (!f) continue;
          e.preventDefault();
          vivDownscaleImage(f, 1280, (dataURL, w, h) => {
            if (!dataURL) return;
            const hh = Math.max(60, Math.round(240 * ((h || 1) / (w || 1))));
            if (IDB_OK) {
              idbStore(dataURL, w, h).then(id => {
                if (id) self.addCard('image', { imageId: id, w: 240, h: hh });
                else if (vivStorageOk(dataURL.length)) self.addCard('image', { dataURL: dataURL, w: 240, h: hh });
                else _vivStorageWarn();
              });
            } else if (vivStorageOk(dataURL.length)) self.addCard('image', { dataURL: dataURL, w: 240, h: hh });
            else _vivStorageWarn();
          });
          return;
        }
      }
      const text = (cd.getData('text/plain') || '').trim();
      if (!text) return;
      e.preventDefault();
      self.addFromText(text);
    });

    // View tabs live inside the canvas bar, which _rerender rebuilds, so the
    // sheet template's one-time binding is lost after the first card change.
    // Rebind here; the _vivBound guard keeps the two binders from stacking.
    container.querySelectorAll('[data-viv-tab]').forEach(t => {
      if (t._vivBound) return;
      t._vivBound = true;
      t.addEventListener('click', () => {
        if (!state.vivere) state.vivere = {};
        state.vivere.viewTab = t.getAttribute('data-viv-tab');
        try { persistNow(); } catch (e) {}
        try { SHEET_TEMPLATES.vivere._refresh(self._container); } catch (e) {}
      });
    });

    const bsw = container.querySelector('#vcBoardSwitch');
    if (bsw) {
      const toggle = bsw.querySelector('[data-vc-board-toggle]');
      if (toggle) toggle.addEventListener('click', (e) => { e.stopPropagation(); bsw.classList.toggle('is-open'); });
      bsw.querySelectorAll('[data-vc-board]').forEach(it => it.addEventListener('click', (e) => {
        if (e.target.closest('[data-vc-board-del]')) return;
        self.switchBoard(it.getAttribute('data-vc-board'));
      }));
      bsw.querySelectorAll('[data-vc-board-del]').forEach(x => x.addEventListener('click', (e) => { e.stopPropagation(); self.deleteBoard(x.getAttribute('data-vc-board-del')); }));
      bsw.querySelectorAll('[data-vc-board-new]').forEach(nb => nb.addEventListener('click', () => self.addBoard(nb.getAttribute('data-vc-board-new') || '')));
      const xb = bsw.querySelector('[data-vc-board-export]'); if (xb) xb.addEventListener('click', () => self.exportBoardImage());
      const rb = bsw.querySelector('[data-vc-board-rename]'); if (rb) rb.addEventListener('click', () => self.renameBoard(_vivCanvas().id));
      if (!this._boardOutsideBound) {
        this._boardOutsideBound = true;
        document.addEventListener('click', (ev) => { const sw = self._container && self._container.querySelector('#vcBoardSwitch'); if (sw && !sw.contains(ev.target)) sw.classList.remove('is-open'); });
      }
    }

    container.querySelectorAll('[data-vc-zoom]').forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      const k = b.getAttribute('data-vc-zoom');
      if (k === 'in') self.zoomBy(1.25); else if (k === 'out') self.zoomBy(0.8); else self.fitView();
    }));

    const cz = container.querySelector('[data-vc-customize]');
    if (cz) cz.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); self.openCustomize(); });

    // One add menu, two doors: the + Add button, and right-click (or
    // two-finger tap) anywhere on the canvas, which creates AT that spot.
    const ADD_ITEMS = [['note', 'Note'], ['display', 'Text'], ['sticky', 'Sticky'], ['frame', 'Frame'], ['image', 'Image'], ['link', 'Link'], ['quote', 'Quote']];
    const showAddMenu = (x, y, world) => {
      const old2 = document.getElementById('vcAddMenu'); if (old2) old2.remove();
      const m = document.createElement('div');
      m.id = 'vcAddMenu';
      m.className = 'vcanvas__board-menu vcanvas__addmenu';
      m.innerHTML = ADD_ITEMS.map(it => '<button type="button" class="vcanvas__bm-item" data-vc-addpick="' + it[0] + '">' + it[1] + '</button>').join('');
      document.body.appendChild(m);
      m.style.left = Math.min(x, window.innerWidth - 180) + 'px';
      m.style.top = Math.min(y, window.innerHeight - (ADD_ITEMS.length * 38 + 16)) + 'px';
      const close = () => { try { m.remove(); } catch (e2) {} document.removeEventListener('pointerdown', onOut, true); };
      const onOut = (e2) => { if (!m.contains(e2.target)) close(); };
      setTimeout(() => document.addEventListener('pointerdown', onOut, true), 0);
      m.querySelectorAll('[data-vc-addpick]').forEach(b => b.addEventListener('click', () => {
        const t = b.getAttribute('data-vc-addpick');
        close();
        self._spawnFromMenu(t, world);
      }));
    };
    self._spawnFromMenu = (t, world) => {
      const extra = {};
      if (world) {
        extra.x = Math.round(world.x);
        extra.y = Math.round(world.y);
      }
      if (t === 'image') { const f = container.querySelector('#vcFile'); if (f) f.click(); return; }
      if (t === 'link') {
        const url = prompt('Paste a link'); if (!url || !url.trim()) return;
        const norm = _vivNormUrl(url.trim());
        const vid = norm ? _vivYouTubeId(norm) : '';
        if (vid) { self.addCard('video', Object.assign({ videoId: vid, url: norm, title: '' }, extra)); return; }
        const title = prompt('Name it (optional)');
        self.addCard('link', Object.assign({ url: url.trim(), title: (title || '').trim().slice(0, 80) }, extra));
        return;
      }
      if (t === 'sticky') {
        const colors = ['amber', 'rose', 'blue', 'green'];
        extra.noteColor = colors[Math.floor(Math.random() * colors.length)];
      }
      if (t === 'quote') extra.qstyle = 'light';
      const card = self.addCard(t, extra);
      setTimeout(() => { const el = container.querySelector('.vcard[data-id="' + card.id + '"] [contenteditable]'); if (el) el.focus(); }, 30);
    };
    const addBtn = container.querySelector('[data-vc-addmenu]');
    if (addBtn) addBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const r2 = addBtn.getBoundingClientRect();
      showAddMenu(r2.left, r2.bottom + 6, null);
    });
    // Right-click empty canvas: the menu opens there and the new card lands
    // exactly where you clicked.
    vp.addEventListener('contextmenu', (e) => {
      if (e.target.closest && e.target.closest('.vcard')) return;
      e.preventDefault();
      const c = _vivCanvas();
      const r2 = vp.getBoundingClientRect();
      const world = {
        x: ((e.clientX - r2.left) - (c.view.panX || 0)) / (c.view.zoom || 1),
        y: ((e.clientY - r2.top) - (c.view.panY || 0)) / (c.view.zoom || 1)
      };
      showAddMenu(e.clientX, e.clientY, world);
    });
    container.querySelectorAll('[data-vc-add]').forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      const t = btn.getAttribute('data-vc-add');
      if (t === 'image') { const f = container.querySelector('#vcFile'); if (f) f.click(); return; }
      if (t === 'link') {
        const url = prompt('Paste a link'); if (!url || !url.trim()) return;
        const norm = _vivNormUrl(url.trim());
        const vid = norm ? _vivYouTubeId(norm) : '';
        if (vid) { self.addCard('video', { videoId: vid, url: norm, title: '' }); return; }
        const title = prompt('Name it (optional)');
        self.addCard('link', { url: url.trim(), title: (title || '').trim().slice(0, 80) });
        return;
      }
      if (t === 'display') {
        const dc = self.addCard('display');
        setTimeout(() => { const el = container.querySelector('.vcard[data-id="' + dc.id + '"] [data-vc-note]'); if (el) el.focus(); }, 30);
        return;
      }
      if (t === 'frame') {
        const fc = self.addCard('frame');
        setTimeout(() => { const el = container.querySelector('.vcard[data-id="' + fc.id + '"] [data-vc-note]'); if (el) el.focus(); }, 30);
        return;
      }
      if (t === 'sticky') {
        const colors = ['amber', 'rose', 'blue', 'green'];
        const sc = self.addCard('sticky', { noteColor: colors[Math.floor(Math.random() * colors.length)] });
        setTimeout(() => { const el = container.querySelector('.vcard[data-id="' + sc.id + '"] [data-vc-note]'); if (el) el.focus(); }, 30);
        return;
      }
      if (t === 'quote') {
        const qc = self.addCard('quote', { qstyle: 'light' });
        setTimeout(() => { const el = container.querySelector('.vcard[data-id="' + qc.id + '"] [data-vc-qtext]'); if (el) el.focus(); }, 30);
        return;
      }
      const card = self.addCard('note');
      setTimeout(() => { const el = container.querySelector('.vcard[data-id="' + card.id + '"] [data-vc-note]'); if (el) el.focus(); }, 30);
    }));

    const file = container.querySelector('#vcFile');
    if (file) file.addEventListener('change', () => {
      if (file.files && file.files.length) self.vivBulkImport(file.files);
      file.value = '';
    });

    vp.addEventListener('dragover', (e) => { e.preventDefault(); });
    vp.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) self.vivBulkImport(e.dataTransfer.files);
    });

    this._world.querySelectorAll('[data-vc-note]').forEach(el => {
      el.addEventListener('blur', () => {
        const cardEl = el.closest('.vcard'); if (!cardEl) return;
        const card = self._cardById(cardEl.getAttribute('data-id')); if (!card) return;
        card.text = el.textContent.trim();
        self._persist();
      });
    });

    // Quote cards: editable text + attribution, and a style button that cycles
    // the three fixed templates in place (no rerender, keeps editing focus).
    this._world.querySelectorAll('[data-vc-qtext]').forEach(el => {
      el.addEventListener('blur', () => {
        const cardEl = el.closest('.vcard'); if (!cardEl) return;
        const card = self._cardById(cardEl.getAttribute('data-id')); if (!card) return;
        card.text = el.textContent.trim();
        self._persist();
      });
    });
    this._world.querySelectorAll('[data-vc-qattr]').forEach(el => {
      el.addEventListener('blur', () => {
        const cardEl = el.closest('.vcard'); if (!cardEl) return;
        const card = self._cardById(cardEl.getAttribute('data-id')); if (!card) return;
        card.attribution = el.textContent.trim().slice(0, 80);
        self._persist();
      });
    });
    this._world.querySelectorAll('[data-vc-qstyle]').forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const cardEl = btn.closest('.vcard'); if (!cardEl) return;
      const card = self._cardById(cardEl.getAttribute('data-id')); if (!card) return;
      const i = VIV_QSTYLES.indexOf(card.qstyle);
      card.qstyle = VIV_QSTYLES[(i + 1) % VIV_QSTYLES.length];
      cardEl.setAttribute('data-qstyle', card.qstyle);
      self._persist();
    }));

    // Video facade: delegate play clicks so stopVideo's poster swap needs no rebind.
    this._world.addEventListener('click', (e) => {
      const p = e.target.closest && e.target.closest('[data-vc-play]');
      if (!p) return;
      e.preventDefault(); e.stopPropagation();
      const cardEl = p.closest('.vcard');
      if (cardEl) self.playVideo(cardEl.getAttribute('data-id'));
    });

    this._world.querySelectorAll('[data-vc-del]').forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const cardEl = btn.closest('.vcard'); if (cardEl) self.removeCard(cardEl.getAttribute('data-id'));
    }));

    this._world.querySelectorAll('[data-vc-lived]').forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const cardEl = btn.closest('.vcard'); if (cardEl) self.toggleLived(cardEl.getAttribute('data-id'));
    }));

    this._world.querySelectorAll('[data-vc-cut]').forEach(p => p.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      self.removeLink(p.getAttribute('data-vc-cut'));
    }));

    this._world.querySelectorAll('[data-vc-handle]').forEach(h => h.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const cardEl = h.closest('.vcard'); if (!cardEl) return;
      const fromId = cardEl.getAttribute('data-id');
      const from = self._cardById(fromId); if (!from) return;
      const ctr = self._cardCenter(from);
      const O = self._LINK_OFF;
      const temp = self._world.querySelector('#vcTempLink');
      const move = (ev) => {
        // Canvas can unmount mid-drag (user switches modules); bail cleanly.
        if (!self._world) { up(); return; }
        const xy = self._evXY(ev);
        const p = self.screenToWorld(xy.x, xy.y);
        if (temp) temp.setAttribute('d', 'M ' + (ctr.x + O) + ' ' + (ctr.y + O) + ' L ' + (p.x + O) + ' ' + (p.y + O));
        const over = document.elementFromPoint(xy.x, xy.y);
        self._world.querySelectorAll('.vcard--droptarget').forEach(cc => cc.classList.remove('vcard--droptarget'));
        const overCard = over && over.closest && over.closest('.vcard');
        if (overCard && overCard.getAttribute('data-id') !== fromId) overCard.classList.add('vcard--droptarget');
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        if (temp) temp.setAttribute('d', '');
        const tgt = self._world.querySelector('.vcard--droptarget');
        self._world.querySelectorAll('.vcard--droptarget').forEach(cc => cc.classList.remove('vcard--droptarget'));
        if (tgt) self.addLink(fromId, tgt.getAttribute('data-id'));
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    }));

    this._world.querySelectorAll('.vcard').forEach(cardEl => {
      cardEl.addEventListener('pointerdown', (e) => {
        if (e.target.closest('[data-vc-handle]') || e.target.closest('[data-vc-del]') || e.target.closest('.vcard__link') || e.target.closest('[data-vc-play]') || e.target.closest('[data-vc-qstyle]')) return;
        const id = cardEl.getAttribute('data-id');
        const card = self._cardById(id); if (!card) return;
        card.lastViewedAt = Date.now(); // patina: touching a card counts as seeing it
        const c = _vivCanvas();
        const startX = e.clientX, startY = e.clientY;
        const orig = { x: card.x || 0, y: card.y || 0 };
        let moved = false;
        self.bringToFront(card); cardEl.style.zIndex = card.z;
        const move = (ev) => {
          const xy = self._evXY(ev);
          const ddx = xy.x - startX, ddy = xy.y - startY;
          if (!moved && Math.abs(ddx) + Math.abs(ddy) < 5) return;
          if (!moved) { moved = true; cardEl.classList.add('vcard--dragging'); cardEl.querySelectorAll('[data-vc-note],[data-vc-qtext],[data-vc-qattr]').forEach(ed => { try { ed.blur(); } catch (err) {} }); }
          card.x = Math.round(orig.x + ddx / c.view.zoom);
          card.y = Math.round(orig.y + ddy / c.view.zoom);
          cardEl.style.left = card.x + 'px';
          cardEl.style.top = card.y + 'px';
          self._redrawLinks();
        };
        const up = () => {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          cardEl.classList.remove('vcard--dragging');
          if (moved) self._persist();
          else self._debouncedPersist(); // lastViewedAt still changed
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });
    });
  }
};

function renderVivereTabs(active) {
  const tab = (k, label) => '<button type="button" class="viv-tab' + (k === active ? ' viv-tab--on' : '') + '" data-viv-tab="' + k + '">' + label + '</button>';
  return '<div class="viv-tabs">' + tab('canvas', 'Canvas') + tab('lane', 'Memory lane') + tab('practice', 'Practice') + '</div>';
}
function renderVivereCanvasView() {
  // Returned straight into the sheet body, which bind() makes full-bleed via the
  // viv-body-fs class so the canvas fills the entire screen edge to edge.
  return VivereCanvas.view(true);
}

/* ===== MEMORY LANE ==========================================================
   A chronological gold-on-dark ledger of every Lived-stamped card across all
   boards, newest first. The board's receipt of a life actually happening. */
function renderVivereLaneView() {
  const boards = _vivBoards();
  const items = [];
  boards.forEach(b => (b.cards || []).forEach(k => { if (k && k.lived && k.livedAt) items.push({ board: b, card: k }); }));
  items.sort((a, b) => (b.card.livedAt || 0) - (a.card.livedAt || 0));
  let html = '<div class="viv">' + renderVivereTabs('lane') + '<div class="viv-lane">';
  html += '<div class="viv-lane__eyebrow">' + (items.length ? items.length + ' lived' : 'Memory lane') + '</div>';
  if (!items.length) {
    html += '<div class="viv-lane__empty">Nothing stamped yet. The first card you mark as Lived starts the lane.</div>';
  } else {
    html += '<div class="viv-lane__list">';
    items.forEach(it => {
      const k = it.card;
      const d = new Date(k.livedAt);
      const date = isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      let body = '';
      if (k.type === 'image' && (k.imageId || k.dataURL)) {
        body = (k.imageId ? '<img class="viv-lane__thumb" data-img-id="' + esc(k.imageId) + '" alt="">' : '<img class="viv-lane__thumb" src="' + esc(k.dataURL) + '" alt="">') +
          ((k.caption || k.text) ? '<div class="viv-lane__text">' + esc(String(k.caption || k.text).slice(0, 140)) + '</div>' : '');
      } else if (k.type === 'video' && /^[A-Za-z0-9_-]{11}$/.test(k.videoId || '')) {
        body = '<img class="viv-lane__thumb" src="https://i.ytimg.com/vi/' + k.videoId + '/hqdefault.jpg" alt="">' +
          (k.title ? '<div class="viv-lane__text">' + esc(k.title) + '</div>' : '');
      } else if (k.type === 'link') {
        const url = _vivNormUrl(k.url || ''); const host = _vivHostOf(url);
        body = '<div class="viv-lane__text">' + esc(k.title || host || 'Link') + '</div>' +
          (host ? '<div class="viv-lane__sub">' + esc(host) + '</div>' : '');
      } else if (k.type === 'quote') {
        body = '<div class="viv-lane__text viv-lane__text--quote">&ldquo;' + esc(String(k.text || '').slice(0, 180)) + '&rdquo;</div>' +
          (k.attribution ? '<div class="viv-lane__sub">' + esc(k.attribution) + '</div>' : '');
      } else {
        body = '<div class="viv-lane__text">' + esc(String(k.text || '').slice(0, 180)) + '</div>';
      }
      html += '<div class="viv-lane__item">' +
        '<div class="viv-lane__rail"><span class="viv-lane__dot" aria-hidden="true"></span></div>' +
        '<div class="viv-lane__body">' +
          '<div class="viv-lane__date">' + esc(date) + '</div>' +
          '<div class="viv-lane__card">' + body + '</div>' +
          '<div class="viv-lane__meta">' + esc(it.board.name || 'Board') + ' &middot; <button type="button" class="viv-lane__go" data-lane-go="' + esc(it.board.id) + ':' + esc(k.id) + '">View on board</button></div>' +
        '</div></div>';
    });
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

/* ===== ON THIS DAY ==========================================================
   Once per day, on first canvas open: resurface one card. Lived anniversaries
   (same month+day, past year) win over created anniversaries, which win over
   one card untouched for 90+ days. One full-screen glass overlay, never empty,
   never twice a day (state.vivere.lastOnThisDayISO). */
function _vivOnThisDayPick() {
  const boards = _vivBoards();
  const now = new Date();
  let livedHit = null, createdHit = null, stale = null, staleTs = Infinity;
  const sameDayPastYear = (ts) => {
    const d = new Date(ts);
    return d.getFullYear() < now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
      ? now.getFullYear() - d.getFullYear() : 0;
  };
  boards.forEach(b => (b.cards || []).forEach(k => {
    if (!k) return;
    if (!livedHit && k.lived && k.livedAt) {
      const y = sameDayPastYear(k.livedAt);
      if (y) livedHit = { card: k, board: b, kind: 'lived', years: y };
    }
    if (!createdHit && k.createdAt) {
      const y2 = sameDayPastYear(k.createdAt);
      if (y2) createdHit = { card: k, board: b, kind: 'created', years: y2 };
    }
    const touched = Math.max(k.createdAt || 0, k.lastViewedAt || 0, k.livedAt || 0);
    if (touched > 0 && (Date.now() - touched) > 90 * 86400000 && touched < staleTs) { staleTs = touched; stale = { card: k, board: b, kind: 'stale', years: 0 }; }
  }));
  return livedHit || createdHit || stale;
}

// Static large preview of a card for the overlay (no buttons, no positioning).
function _vivOtdCardHtml(k) {
  if (k.type === 'image' && (k.imageId || k.dataURL)) {
    const img = k.imageId ? '<img class="viv-otd__img" data-img-id="' + esc(k.imageId) + '" alt="">' : '<img class="viv-otd__img" src="' + esc(k.dataURL) + '" alt="">';
    return img + ((k.caption || k.text) ? '<div class="viv-otd__cap">' + esc(k.caption || k.text) + '</div>' : '');
  }
  if (k.type === 'video' && /^[A-Za-z0-9_-]{11}$/.test(k.videoId || '')) {
    return '<img class="viv-otd__img" src="https://i.ytimg.com/vi/' + k.videoId + '/hqdefault.jpg" alt="">' + (k.title ? '<div class="viv-otd__cap">' + esc(k.title) + '</div>' : '');
  }
  if (k.type === 'link') {
    const url = _vivNormUrl(k.url || ''); const host = _vivHostOf(url);
    return '<div class="viv-otd__quote">' + esc(k.title || host || 'Link') + '</div>' + (host ? '<div class="viv-otd__cap">' + esc(host) + '</div>' : '');
  }
  if (k.type === 'quote') {
    return '<div class="viv-otd__quote">&ldquo;' + esc(k.text || '') + '&rdquo;</div>' + (k.attribution ? '<div class="viv-otd__cap">' + esc(k.attribution) + '</div>' : '');
  }
  return '<div class="viv-otd__quote">' + esc(k.text || '') + '</div>';
}

function vivShowOnThisDay() {
  if (!state.vivere) return;
  const today = getTodayISO();
  if (state.vivere.lastOnThisDayISO === today) return;
  const wrap = VivereCanvas._container && VivereCanvas._container.querySelector('.vcanvas');
  if (!wrap || wrap.querySelector('.viv-otd')) return;
  const pick = _vivOnThisDayPick();
  if (!pick) return; // nothing worth resurfacing; never show an empty state
  state.vivere.lastOnThisDayISO = today;
  try { persistNow(); } catch (e) {}
  const k = pick.card;
  let head;
  if (pick.kind === 'lived') head = pick.years === 1 ? 'Lived, one year ago today' : 'Lived, ' + pick.years + ' years ago today';
  else if (pick.kind === 'created') head = pick.years === 1 ? 'From this board, one year ago today' : 'From this board, ' + pick.years + ' years ago today';
  else head = 'Worth a look again';
  const ov = document.createElement('div');
  ov.className = 'viv-otd';
  ov.innerHTML =
    '<div class="viv-otd__panel" role="dialog" aria-label="On this day">' +
      '<div class="viv-otd__eyebrow">' + esc(head) + '</div>' +
      '<div class="viv-otd__card">' + _vivOtdCardHtml(k) + '</div>' +
      '<div class="viv-otd__meta">' + esc(pick.board.name || 'Board') + ((pick.kind !== 'lived' && k.lived && k.livedAt) ? ' &middot; lived ' + esc(_vivFmtLived(k.livedAt)) : '') + '</div>' +
      '<div class="viv-otd__actions">' +
        '<button type="button" class="viv-otd__go" data-otd-go>Take me there</button>' +
        '<button type="button" class="viv-otd__skip" data-otd-skip>Not now</button>' +
      '</div>' +
    '</div>';
  wrap.appendChild(ov);
  try { hydrateImageEls(ov); } catch (e) {}
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };
  const close = () => { try { ov.remove(); } catch (e) {} document.removeEventListener('keydown', onKey); };
  document.addEventListener('keydown', onKey);
  ov.addEventListener('click', (ev) => { if (ev.target === ov) close(); });
  const skip = ov.querySelector('[data-otd-skip]'); if (skip) skip.addEventListener('click', close);
  const go = ov.querySelector('[data-otd-go]');
  if (go) go.addEventListener('click', () => {
    close();
    if (pick.board.id !== state.vivere.activeBoardId) { state.vivere.activeBoardId = pick.board.id; VivereCanvas._rerender(); }
    VivereCanvas.centerOnCard(k.id, true);
  });
}

/* ===== ONE SMALL THING ======================================================
   A small docked prompt, bottom-left of the canvas, appearing only after 10
   quiet seconds on the board, at most once per day. Concrete, under 12 words,
   imperative, practical. No mystic vocabulary, no exclamation points, no
   streaks; skipping leaves no trace beyond the daily guard. */
const VIVERE_NUDGES = [
  'Text someone you have not seen this month.',
  'Step outside before your next task.',
  'Look up the price of one flight you keep mentioning.',
  'Drink a glass of water away from your desk.',
  'Write down one thing you noticed today.',
  'Put one song on and do nothing else.',
  'Stretch your back for two minutes.',
  'Send a photo to someone who was there.',
  'Plan one meal you will actually cook this week.',
  'Open a window and stand by it for a minute.',
  'Reply to the message you keep postponing.',
  'Walk one block with no destination.',
  'Book the appointment you keep delaying.',
  'Eat your next meal without a screen.',
  'Thank one person for something specific.',
  'Look at the sky for one full minute.',
  'Put your phone in another room for an hour.',
  'Read ten pages of anything on paper.',
  'Make tea and drink it while it is hot.',
  'Ask someone older one question about their life.',
  'Take the long way home once this week.',
  'Write tomorrow\'s first task on paper tonight.',
  'Stand up and roll your shoulders ten times.',
  'Price one ticket to a show near you.'
];

function vivScheduleNudge() {
  if (!state.vivere) return;
  if (state.vivere.lastNudgeISO === getTodayISO()) return;
  clearTimeout(VivereCanvas._nudgeT);
  VivereCanvas._nudgeT = setTimeout(() => { try { vivShowNudge(); } catch (e) {} }, 10000);
}

function vivShowNudge() {
  const wrap = VivereCanvas._container && VivereCanvas._container.querySelector('.vcanvas');
  if (!wrap || !wrap.isConnected) return;
  if (((state.vivere && state.vivere.viewTab) || 'canvas') !== 'canvas') return;
  if (state.vivere.lastNudgeISO === getTodayISO()) return;
  if (wrap.querySelector('.viv-nudge')) return;
  if (wrap.querySelector('.viv-otd')) { VivereCanvas._nudgeT = setTimeout(() => { try { vivShowNudge(); } catch (e) {} }, 8000); return; }
  const day = _vivDayNum(getTodayISO());
  const text = VIVERE_NUDGES[((day % VIVERE_NUDGES.length) + VIVERE_NUDGES.length) % VIVERE_NUDGES.length];
  state.vivere.lastNudgeISO = getTodayISO();
  try { persistNow(); } catch (e) {}
  const el = document.createElement('div');
  el.className = 'viv-nudge';
  const xBtn = '<button type="button" class="viv-nudge__x" data-nudge-x aria-label="Dismiss">&times;</button>';
  el.innerHTML = xBtn +
    '<div class="viv-nudge__eyebrow">One small thing</div>' +
    '<div class="viv-nudge__text">' + esc(text) + '</div>' +
    '<div class="viv-nudge__actions"><button type="button" class="viv-nudge__done" data-nudge-done>Done</button></div>';
  wrap.appendChild(el);
  const wireX = () => { const x = el.querySelector('[data-nudge-x]'); if (x) x.addEventListener('click', () => { try { el.remove(); } catch (e) {} }); };
  wireX();
  const done = el.querySelector('[data-nudge-done]');
  if (done) done.addEventListener('click', () => {
    try { writeProofEvent('proof', { title: 'Lived a little', text: text, module: 'vivere' }); } catch (e) {}
    // Offer "stamp it toward a card" only when there are cards to stamp.
    const candidates = [];
    _vivBoards().forEach(b => (b.cards || []).forEach(k => { if (k && !k.lived && (k.text || k.title)) candidates.push({ board: b, card: k }); }));
    if (!candidates.length) {
      el.innerHTML = '<div class="viv-nudge__text">Noted.</div>';
      setTimeout(() => { try { el.remove(); } catch (e) {} }, 1400);
      return;
    }
    const list = candidates.slice(0, 6).map(x =>
      '<button type="button" class="viv-nudge__pick" data-nudge-pick="' + esc(x.board.id) + ':' + esc(x.card.id) + '">' + esc(String(x.card.text || x.card.title).slice(0, 60)) + '</button>').join('');
    el.innerHTML = xBtn +
      '<div class="viv-nudge__eyebrow">Stamp it toward a card?</div>' +
      '<div class="viv-nudge__picks">' + list + '</div>' +
      '<div class="viv-nudge__actions"><button type="button" class="viv-nudge__skipb" data-nudge-skip>No need</button></div>';
    wireX();
    const skip = el.querySelector('[data-nudge-skip]');
    if (skip) skip.addEventListener('click', () => { try { el.remove(); } catch (e) {} });
    el.querySelectorAll('[data-nudge-pick]').forEach(b => b.addEventListener('click', () => {
      const parts = (b.getAttribute('data-nudge-pick') || '').split(':');
      const board = _vivBoards().find(x => x.id === parts[0]);
      const card = board && (board.cards || []).find(k => k && k.id === parts[1]);
      if (card) { card.lived = true; card.livedAt = Date.now(); try { persistNow(); } catch (e) {} }
      try { el.remove(); } catch (e) {}
      if (board && board.id === state.vivere.activeBoardId) VivereCanvas._rerender();
    }));
  });
}
const VIVERE_CAT_LABELS = {
  connection: 'Connection', beauty: 'Beauty', play: 'Play', awe: 'Awe',
  peace: 'Peace', body: 'Body', meaning: 'Meaning', novelty: 'Novelty'
};
// ~5 prompts per category. Small, doable, real. No toxic positivity, no hustle.
const VIVERE_PROMPTS = {
  connection: [
    'Text someone you miss.',
    'Call a person instead of typing to them.',
    'Tell someone a small thing you noticed about them.',
    'Ask someone how they are really doing, and listen.',
    'Sit with someone without your phone out.'
  ],
  beauty: [
    'Take a photo of one beautiful thing.',
    'Notice the light somewhere today.',
    'Find one song that gives you chills.',
    'Watch the sky change color for a minute.',
    'Keep one thing you saw that was beautiful.'
  ],
  play: [
    'Do something useless for fun.',
    'Play a game with no point.',
    'Make something with your hands, badly.',
    'Let yourself be silly for ten minutes.',
    'Do the thing you would do if no one was watching.'
  ],
  awe: [
    'Look up at the sky for a minute.',
    'Read one fact that makes the world feel huge.',
    'Stand somewhere with a long view.',
    'Watch something in nature move on its own.',
    'Think about how unlikely it is that you exist.'
  ],
  peace: [
    'Eat one meal without your phone.',
    'Sit still and do nothing for five minutes.',
    'Take ten slow breaths with your eyes closed.',
    'Leave one thing unfinished and let it be.',
    'Make somewhere you are a little quieter.'
  ],
  body: [
    'Go outside for ten minutes.',
    'Stretch until something loosens.',
    'Move in a way that feels good, not productive.',
    'Drink water and feel it.',
    'Walk with no destination.'
  ],
  meaning: [
    'Tell someone what you appreciate about them.',
    'Do one small thing for someone, quietly.',
    'Write down why today mattered, in one line.',
    'Help with something that is not yours to fix.',
    'Remember one reason you keep going.'
  ],
  novelty: [
    'Take a different route somewhere.',
    'Try one food you have never had.',
    'Say yes to something small and unplanned.',
    'Learn one tiny new thing on purpose.',
    'Do an ordinary thing in a new way.'
  ]
};
const VIVERE_MOODS = ['warm', 'calm', 'joy', 'grateful', 'moved', 'alive'];

// Stable day number (UTC) used to pick a deterministic prompt for the day, so the
// daily invitation does not change on every render or reload (no Math.random).
function _vivDayNum(iso) {
  try { const k = (iso || getTodayISO()); return Math.floor(Date.parse(k + 'T00:00:00Z') / 86400000); }
  catch (e) { return 0; }
}
function _vivId() { return 'viv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Deterministically choose the category + prompt for a given day. Rotates the
// category by day, and the prompt within it by day, so it is stable per date and
// spreads across categories over a week.
function vivPickForDay(iso) {
  const day = _vivDayNum(iso);
  const cat = VIVERE_CATEGORIES[((day % VIVERE_CATEGORIES.length) + VIVERE_CATEGORIES.length) % VIVERE_CATEGORIES.length];
  const pool = VIVERE_PROMPTS[cat] || [];
  const prompt = pool.length ? pool[((day % pool.length) + pool.length) % pool.length] : '';
  return { category: cat, prompt };
}

// Ensure state.vivere.today reflects the current day. If the date rolled over (or
// is empty), seed a fresh, deterministic practice and reset done/note/media.
// Never overwrites a practice the user already engaged with today. Returns today.
function vivEnsureToday() {
  try {
    if (!state.vivere) return null;
    const t = getTodayISO();
    const today = state.vivere.today || (state.vivere.today = { date: '', prompt: '', category: '', done: false, note: '', media: [] });
    if (today.date !== t) {
      const pick = vivPickForDay(t);
      today.date = t;
      today.category = pick.category;
      today.prompt = pick.prompt;
      today.done = false;
      today.note = '';
      today.media = [];
    } else if (!today.prompt) {
      const pick = vivPickForDay(t);
      today.category = today.category || pick.category;
      today.prompt = pick.prompt;
    }
    return today;
  } catch (e) { return state.vivere && state.vivere.today; }
}

// Let the user shuffle to a different category for today (and re-roll the prompt).
// Only allowed before it is marked done so a completed practice stays honest.
function vivShuffleToday(forceCategory) {
  try {
    const today = vivEnsureToday();
    if (!today || today.done) return today;
    let cat = forceCategory;
    if (!cat || VIVERE_CATEGORIES.indexOf(cat) === -1) {
      const cur = VIVERE_CATEGORIES.indexOf(today.category);
      cat = VIVERE_CATEGORIES[(cur + 1 + Math.floor(Math.random() * (VIVERE_CATEGORIES.length - 1))) % VIVERE_CATEGORIES.length];
    }
    const pool = VIVERE_PROMPTS[cat] || [];
    today.category = cat;
    today.prompt = pool.length ? pool[Math.floor(Math.random() * pool.length)] : today.prompt;
    persistNow();
    return today;
  } catch (e) { return state.vivere && state.vivere.today; }
}

// Mark today's practice done: bump the category count and write a proofEvent so
// Momentum / Proof Trail credit it like any other lived moment. Idempotent per
// day via the proofEvent dedupeKey.
function vivCompleteToday() {
  try {
    const today = vivEnsureToday();
    if (!today || today.done) return today;
    today.done = true;
    if (!state.vivere.categories) state.vivere.categories = {};
    const cat = today.category;
    if (cat) state.vivere.categories[cat] = (state.vivere.categories[cat] || 0) + 1;
    try {
      writeProofEvent('vivere', {
        title: 'Lived moment',
        text: today.prompt || '',
        module: 'vivere',
        tags: cat ? [cat] : [],
        dedupeKey: 'vivere-' + today.date,
        metadata: { category: cat, mood: '', people: '', mediaCount: 0 }
      });
    } catch (e) {}
    persistNow();
    return today;
  } catch (e) { return state.vivere && state.vivere.today; }
}

// Add a lived moment to the Memory Jar. text is required; the rest optional.
// Writes a proofEvent (separate from the daily completion so a directly-added
// memory still counts as showing up to your own life).
function vivAddMemory(fields) {
  try {
    fields = fields || {};
    const text = String(fields.text || '').trim();
    if (!text) return null;
    if (!Array.isArray(state.vivere.memories)) state.vivere.memories = [];
    const mem = {
      id: _vivId(),
      iso: getTodayISO(),
      text: text.slice(0, 400),
      category: VIVERE_CATEGORIES.indexOf(fields.category) !== -1 ? fields.category : '',
      mood: String(fields.mood || '').slice(0, 24),
      person: String(fields.person || '').slice(0, 80),
      place: String(fields.place || '').slice(0, 80),
      media: Array.isArray(fields.media) ? fields.media.slice(0, 1) : []
    };
    state.vivere.memories.push(mem);
    if (state.vivere.memories.length > 400) state.vivere.memories = state.vivere.memories.slice(-400);
    if (!fields.silent) {
      try {
        writeProofEvent('vivere', {
          title: 'Lived moment',
          text: mem.text,
          module: 'vivere',
          tags: mem.category ? [mem.category] : [],
          metadata: { category: mem.category, mood: mem.mood, people: mem.person, mediaCount: mem.media.length }
        });
      } catch (e) {}
    }
    persistNow();
    return mem;
  } catch (e) { return null; }
}
function vivRemoveMemory(id) {
  try {
    if (!id || !Array.isArray(state.vivere.memories)) return;
    state.vivere.memories = state.vivere.memories.filter(m => m && m.id !== id);
    persistNow();
  } catch (e) {}
}

// Alive List ops (the small, immediate bucket list).
const VIVERE_HORIZONS = ['week', 'month', 'season', 'life'];
const VIVERE_HORIZON_LABELS = { week: 'This week', month: 'This month', season: 'This season', life: 'Someday' };
function vivAddAlive(text, horizon) {
  try {
    text = String(text || '').trim();
    if (!text) return null;
    if (!Array.isArray(state.vivere.aliveList)) state.vivere.aliveList = [];
    const item = { id: _vivId(), text: text.slice(0, 160), horizon: VIVERE_HORIZONS.indexOf(horizon) !== -1 ? horizon : 'month', done: false };
    state.vivere.aliveList.push(item);
    if (state.vivere.aliveList.length > 200) state.vivere.aliveList = state.vivere.aliveList.slice(-200);
    persistNow();
    return item;
  } catch (e) { return null; }
}
function vivToggleAlive(id) {
  try {
    const it = (state.vivere.aliveList || []).find(x => x && x.id === id);
    if (!it) return;
    it.done = !it.done;
    // Completing something you actually wanted to do is real proof of a life
    // being lived, so it credits Momentum like the daily practice.
    if (it.done) {
      try { writeProofEvent('vivere', { title: 'Lived moment', text: it.text, module: 'vivere', tags: ['alivelist'], dedupeKey: 'viv-alive-' + it.id, metadata: { category: '', mood: '', people: '', mediaCount: 0, horizon: it.horizon } }); } catch (e) {}
    }
    persistNow();
  } catch (e) {}
}
function vivRemoveAlive(id) {
  try {
    if (!Array.isArray(state.vivere.aliveList)) return;
    state.vivere.aliveList = state.vivere.aliveList.filter(x => x && x.id !== id);
    persistNow();
  } catch (e) {}
}

// Resurface an old memory ("One month ago, this made life feel worth it.").
// Prefers ones aged ~30+ days, never repeats via resurfacedMemoryIds, and falls
// back to the oldest not-yet-surfaced. Returns { mem, label } or null.
function vivResurfaceMemory() {
  try {
    const mems = (state.vivere && Array.isArray(state.vivere.memories)) ? state.vivere.memories : [];
    if (!mems.length) return null;
    const seen = new Set(state.vivere.resurfacedMemoryIds || []);
    const today = _vivDayNum(getTodayISO());
    const unseen = mems.filter(m => m && m.id && !seen.has(m.id));
    if (!unseen.length) return null;
    const aged = unseen
      .map(m => ({ m, age: today - _vivDayNum(m.iso) }))
      .filter(x => x.age >= 14)
      .sort((a, b) => b.age - a.age);
    const pick = aged.length ? aged[0] : { m: unseen[0], age: today - _vivDayNum(unseen[0].iso) };
    const age = pick.age;
    let label;
    if (age >= 330) label = 'About a year ago, this made life feel worth it.';
    else if (age >= 55) label = Math.round(age / 30) + ' months ago, this made life feel worth it.';
    else if (age >= 25) label = 'One month ago, this made life feel worth it.';
    else if (age >= 12) label = Math.round(age / 7) + ' weeks ago, this made life feel worth it.';
    else label = 'Not long ago, this made life feel worth it.';
    return { mem: pick.m, label };
  } catch (e) { return null; }
}
function vivMarkResurfaced(id) {
  try {
    if (!id) return;
    if (!Array.isArray(state.vivere.resurfacedMemoryIds)) state.vivere.resurfacedMemoryIds = [];
    if (state.vivere.resurfacedMemoryIds.indexOf(id) === -1) {
      state.vivere.resurfacedMemoryIds.push(id);
      if (state.vivere.resurfacedMemoryIds.length > 400) state.vivere.resurfacedMemoryIds = state.vivere.resurfacedMemoryIds.slice(-400);
      persistNow();
    }
  } catch (e) {}
}

// Downscale + compress an uploaded image to a small JPEG data URL so the Memory
// Jar can hold a photo without blowing up localStorage. Caps the longest edge
// and quality; resolves to '' on any failure (text-first, photo optional).
function vivCompressImage(file, cb) {
  try {
    if (!file || !/^image\//.test(file.type)) { cb(''); return; }
    const reader = new FileReader();
    reader.onerror = () => cb('');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => cb('');
      img.onload = () => {
        try {
          const MAX = 720;
          let w = img.width, h = img.height;
          if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          else if (h >= w && h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          let url = '';
          try { url = cv.toDataURL('image/jpeg', 0.62); } catch (e) { url = ''; }
          // Hard size guard: if still very large, drop it rather than risk the quota.
          if (url && url.length > 240000) { try { url = cv.toDataURL('image/jpeg', 0.45); } catch (e) {} }
          cb(url && url.length <= 320000 ? url : '');
        } catch (e) { cb(''); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  } catch (e) { cb(''); }
}

