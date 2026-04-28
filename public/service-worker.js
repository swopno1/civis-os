const CACHE_NAME = 'civisos-v1';
const UI_CACHE_NAME = 'civisos-ui-v1';
const ASSET_CACHE_NAME = 'civisos-assets-v1';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching Offline Shell');
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, UI_CACHE_NAME, ASSET_CACHE_NAME].includes(cacheName)) {
            console.log('[Service Worker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper to determine if a request is for a static asset
const isStaticAsset = (url) => {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.otf', '.ico'];
  return extensions.some(ext => url.endsWith(ext));
};

// Helper to determine if a request is for UI components (JS, CSS)
const isUIComponent = (url) => {
  const extensions = ['.js', '.css'];
  return extensions.some(ext => url.endsWith(ext)) || url.includes('/assets/');
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http/https requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Task 1.1 Implementation:
  // 1. Cache-First for static assets
  if (isStaticAsset(request.url)) {
    event.respondWith(
      caches.open(ASSET_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          return fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. Stale-While-Revalidate for UI components (JS, CSS)
  if (isUIComponent(request.url)) {
    event.respondWith(
      caches.open(UI_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Default strategy for everything else (Stale-While-Revalidate with offline fallback for navigation)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Only cache successful GET responses
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Navigation fallback
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return null;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
