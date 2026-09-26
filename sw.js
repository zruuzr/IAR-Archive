/* ============================================================
   IAR Archive — Service Worker
   Strategy:
     - App shell (/, /index.html, /app.js, /style.css, /books.json)
       → Network First (always fresh when online)
     - Static assets (/covers/**, /icons/**, /assets/**)
       → Cache First (immutable, rarely change)
     - Firebase / GitHub Raw / external → network only
   Update flow:
     - Page can post { type: 'SKIP_WAITING' } to force activation
     - Controller change triggers auto-reload (handled in index.html)
   ============================================================ */

const CACHE_VERSION = 'v27';
const CACHE_NAME = `iar-archive-${CACHE_VERSION}`;

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
  'hf.co',
];

const NETWORK_TIMEOUT_MS = 8000;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Exact host matching (prevents "evil-gstatic.com" from matching "gstatic.com")
  if (BYPASS_HOSTS.some((host) =>
    url.hostname === host || url.hostname.endsWith('.' + host)
  )) return;

  // Only handle same-origin requests from here on.
  if (url.origin !== self.location.origin) return;

  // App shell → Network First (always fresh content when online)
  if (isAppShell(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets → Cache First (immutable, rarely change)
  event.respondWith(cacheFirst(request));
});

function isAppShell(pathname) {
  if (pathname === '/' || pathname === '/index.html') return true;
  if (pathname.endsWith('/index.html')) return true;
  if (pathname.endsWith('/app.js')) return true;
  if (pathname.endsWith('/style.css')) return true;
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
  } catch (err) {
    // Only serve the app shell for navigation requests.
    // For CSS/JS/images, return a proper 503 instead of HTML.
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request, {
      signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
    });

    if (response && response.status === 200) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }

    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fall back to index.html for navigation requests when fully offline.
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }

    // For books.json, return a JSON error.
    if (request.url.endsWith('/books.json')) {
      return new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
