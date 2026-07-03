/* Memento service worker: offline support without staleness.
   Strategy: NETWORK-FIRST for every same-origin GET, falling back to cache.
   Online behavior is therefore identical to having no service worker at all
   (every load is fresh), and offline serves the last good copy. The classic
   "app mysteriously will not update" failure mode is impossible by
   construction: nothing is ever served from cache while the network works.
   The cache name carries a version (?v= on the registration URL) so a
   version bump discards old caches on activate. */

const VERSION = (() => {
  try { return new URL(self.location.href).searchParams.get('v') || 'dev'; } catch (e) { return 'dev'; }
})();
const CACHE = 'memento-' + VERSION;

const PRECACHE = [
  './',
  './index.html',
  './share.html',
  './manifest.json',
  './css/base.css', './css/dashboard.css', './css/sidebar.css', './css/misc.css',
  './css/notes.css', './css/vivere.css', './css/onboarding.css', './css/clarity.css', './css/action.css',
  './css/daycard-living.css',
  './js/01-state-foundation.js', './js/02-clarity-experience.js', './js/03-ai-integration.js',
  './js/04-templates-proof.js', './js/05-vivere.js', './js/06-consistency-mori.js',
  './js/07-sheet-templates.js', './js/08-cards-grid-share.js', './js/09-controllers.js',
  './js/10-demo-backend.js', './js/11-init.js', './js/12-cloud-sync.js',
  './fonts/fonts.css', './fonts/dmsans-0.woff2', './fonts/dmsans-1.woff2',
  './fonts/fraunces-2.woff2', './fonts/fraunces-3.woff2', './fonts/fraunces-4.woff2',
  './fonts/fraunces-5.woff2', './fonts/fraunces-6.woff2', './fonts/fraunces-7.woff2',
  './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {}) // a failed precache must never block install; runtime caching fills gaps
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.indexOf('memento-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return; // Supabase, AI, CDNs: untouched
  // cache:'no-cache' forces revalidation against the server (304s are cheap),
  // so the browser's heuristic HTTP cache can never serve a stale file from
  // under us on servers without cache headers. Navigations cannot be passed
  // through Request reconstruction, so they go by URL.
  const fresh = (req.mode === 'navigate')
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(req, { cache: 'no-cache' });
  event.respondWith(
    fresh
      .then((res) => {
        // Cache every good same-origin response so offline keeps working even
        // for files that were not in the precache list.
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      // ignoreSearch so the ?v= cache-busting query on css/js requests still
      // matches the UNVERSIONED precache keys (./css/base.css etc.) on a cold
      // offline start, before runtime caching has stored the versioned URLs.
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        // Navigations fall back to the cached shell.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }))
  );
});

/* Web Push (js/20-push.js subscribes; push-tick sends). Payload is JSON:
   { title, body, kind }. One tag per kind so a morning reminder never
   stacks under an evening one. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  const title = data.title || 'Memento';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: 'memento-' + (data.kind || 'reminder'),
    data: { kind: data.kind || '' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return clients.openWindow(self.registration.scope);
    })
  );
});
