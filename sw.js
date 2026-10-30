/* ============================================================
   IAR Archive — Service Worker (React + Vite Production Architecture)
   Strategy:
     - App shell navigations & mutable catalog metadata
       (/, /index.html, /books.json, /manifest.json)
       → Network First (always fresh when online, offline fallback)
     - Fingerprinted Vite bundles & static assets
       (/bundles/**, /covers/**, /icons/**, /assets/**, /favicon.ico)
       → Cache First (fast offline-ready delivery)
     - External services (Firebase Auth/Firestore, GitHub Raw PDFs, Google Fonts)
       → Network only (bypassed)
   Update flow:
     - Build step injects exact fingerprinted /bundles/* paths into PRECACHE_BUNDLES
     - Old iar-archive-* caches (including legacy v28/v32 Vanilla JS caches)
       are purged on activate
   ============================================================ */

const CACHE_VERSION = 'v35';
const CACHE_NAME = `iar-archive-${CACHE_VERSION}`;

const CORE_SHELL = [
  '/',
  '/index.html',
  '/books.json',
  '/manifest.json',
  '/favicon.ico',
  '/assets/logo.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-192x192.png',
  '/icons/maskable-512x512.png',
  '/icons/apple-touch-icon.png'
];

// Populated automatically in dist/sw.js during `npm run build` by iarRootAssetsPlugin
const PRECACHE_BUNDLES = /* __IAR_PRECACHE_BUNDLES__ */ [];

const APP_SHELL = [...CORE_SHELL, ...PRECACHE_BUNDLES];

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
  'huggingface.co',
  'xethub.hf.co',
  'hf.co'
];

const NETWORK_TIMEOUT_MS = 8000;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Failed to precache ${url}:`, err);
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Exact host matching for external services
  if (
    BYPASS_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith('.' + host)
    )
  ) {
    return;
  }

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Document navigations & mutable catalog/manifest → Network First
  if (request.mode === 'navigate' || isNetworkFirstPath(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Fingerprinted Vite bundles (/bundles/**) and static assets → Cache First
  event.respondWith(cacheFirst(request));
});

function isNetworkFirstPath(pathname) {
  if (pathname === '/' || pathname === '/index.html') return true;
  if (pathname.endsWith('/index.html')) return true;
  if (pathname.endsWith('/books.json')) return true;
  if (pathname.endsWith('/manifest.json')) return true;
  return false;
}

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
  } catch (_err) {
    if (request.mode === 'navigate') {
      const fallback =
        (await caches.match('/index.html')) || (await caches.match('/'));
      if (fallback) return fallback;
    }
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS)
    });

    if (response && response.status === 200 && response.type === 'basic') {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }

    return response;
  } catch (_err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === 'navigate') {
      const fallback =
        (await caches.match('/index.html')) || (await caches.match('/'));
      if (fallback) return fallback;
    }

    if (request.url.endsWith('/books.json')) {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
