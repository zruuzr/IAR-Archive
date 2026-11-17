/* ============================================================
   IAR Archive — Service Worker (React + Vite Production Architecture)
   Strategy:
     - App shell navigations & mutable catalog metadata
       (/, /index.html, /books.json, /manifest.json)
       → Network First (always fresh when online, offline fallback)
     - Fingerprinted Vite bundles, static assets & PDF.js runtime assets
       (/bundles/**, /icons/**, /assets/**, /pdfjs/**, /favicon.ico)
       → Cache First (fast offline-ready delivery)
     - User-saved Offline PDFs (iar-offline-pdfs-v1)
       → Served directly from Offline PDF Cache when saved, else Network
     - Book covers (/covers/** & GitHub Raw covers) and Google Fonts
       → Stale-While-Revalidate in bounded runtime cache (iar-runtime-assets-v1)
     - Live telemetry & auth (Firebase Auth/Firestore)
       → Network only (bypassed)
   ============================================================ */

const CACHE_VERSION = 'v40';
const CACHE_NAME = `iar-archive-${CACHE_VERSION}`;
const OFFLINE_PDF_CACHE = 'iar-offline-pdfs-v1';
const RUNTIME_ASSETS_CACHE = 'iar-runtime-assets-v1';
const MAX_RUNTIME_ENTRIES = 160;

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
  'cdn.jsdelivr.net',
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
  const preservedCaches = new Set([
    CACHE_NAME,
    OFFLINE_PDF_CACHE,
    RUNTIME_ASSETS_CACHE
  ]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !preservedCaches.has(name))
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

  // Exact host matching for live telemetry / auth services
  if (
    BYPASS_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith('.' + host)
    )
  ) {
    return;
  }

  // 1. Check user-saved Offline PDFs (on GitHub Raw or local /pdf/)
  if (url.pathname.toLowerCase().endsWith('.pdf')) {
    event.respondWith(offlinePdfFirst(request));
    return;
  }

  // 2. Book covers (GitHub Raw or local /covers/) & Google Fonts → Stale-While-Revalidate
  if (
    isCoverRequest(url) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(runtimeAssetCache(request));
    return;
  }

  // Only handle same-origin requests beyond this point
  if (url.origin !== self.location.origin) return;

  // 3. Document navigations & mutable catalog/manifest → Network First
  if (request.mode === 'navigate' || isNetworkFirstPath(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 4. Fingerprinted Vite bundles (/bundles/**), /pdfjs/** worker/cmaps/fonts & static assets → Cache First
  event.respondWith(cacheFirst(request));
});

function isCoverRequest(url) {
  return (
    url.pathname.includes('/covers/') &&
    /\.(webp|jpg|jpeg|png|avif)$/i.test(url.pathname)
  );
}

function isNetworkFirstPath(pathname) {
  if (pathname === '/' || pathname === '/index.html') return true;
  if (pathname.endsWith('/index.html')) return true;
  if (pathname.endsWith('/books.json')) return true;
  if (pathname.endsWith('/manifest.json')) return true;
  return false;
}

async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const excess = keys.length - maxEntries;
      await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
    }
  } catch (_err) {
    // Ignore cache trim errors
  }
}

async function offlinePdfFirst(request) {
  try {
    const pdfCache = await caches.open(OFFLINE_PDF_CACHE);
    const cachedPdf = await pdfCache.match(request.url);
    if (cachedPdf) return cachedPdf;
  } catch (_err) {
    // Fallback to network
  }
  return fetch(request);
}

async function runtimeAssetCache(request) {
  const cache = await caches.open(RUNTIME_ASSETS_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && (response.status === 200 || response.type === 'opaque')) {
        const clone = response.clone();
        cache.put(request, clone).then(() => {
          void trimCache(RUNTIME_ASSETS_CACHE, MAX_RUNTIME_ENTRIES);
        });
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
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
    const share = new URL(request.url).pathname.match(/^\/b\/(\d+)\/?$/);
    if (request.mode === 'navigate' && share) {
      return Response.redirect(`/?book=${share[1]}`, 302);
    }

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
