/* ============================================================
   IAR Archive — Service Worker
   Strategy:
     - Static assets (HTML/CSS/JS/icons/covers) → Cache First
     - books.json → Network First
     - Firebase / GitHub Raw / external → skip (network only)
   Update flow:
     - Page can post { type: 'SKIP_WAITING' } to force activation
     - Controller change triggers auto-reload (handled in index.html)
   ============================================================ */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `iar-archive-${CACHE_VERSION}`;

/* Files pre-cached on install.
   Keep this list small. Do NOT include PDFs. */
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/books.json',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png',
  '/icons/apple-touch-icon.png',
];

/* Domains that must always go to the network.
   Caching them would break live data or is impossible. */
const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firebaseapp.com',
  'firebaseio.com',
  'gstatic.com',
  'raw.githubusercontent.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'mozilla.github.io',
];

/* ---------- Message: allow page to force-activate a new SW ---------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ---------- Install: pre-cache app shell ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to cache ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ---------- Activate: remove old caches ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- Fetch: route requests ---------- */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Bypass external hosts and Firebase
  if (BYPASS_HOSTS.some((host) => url.hostname.includes(host))) return;

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // books.json → Network First
  if (url.pathname.endsWith('/books.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else → Cache First
  event.respondWith(cacheFirst(request));
});

/* ---------- Strategies ---------- */

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (err) {
    // Fallback to offline page or home
    const fallback = await caches.match('/index.html');
    if (fallback) return fallback;
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
