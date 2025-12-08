
const CACHE_NAME = 'morgenster-hospital-v3';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://i.ibb.co/TDT9QtC9/images.png',
  'https://cdn.tailwindcss.com'
];

// Install Event: Cache core assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper to determine if a URL is for an image or font
const isStaticAsset = (url) => {
  return url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$/i);
};

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. EXCLUDE: Firebase APIs (Firestore, Auth)
  // We rely on the Firebase JS SDK's internal IndexedDB persistence for data.
  // Intercepting these with the SW can break synchronization.
  if (url.origin.includes('firestore.googleapis.com') || 
      url.origin.includes('identitytoolkit.googleapis.com') ||
      url.origin.includes('securetoken.googleapis.com') ||
      url.href.includes('firebaseio.com')) {
    return; // Let the browser/SDK handle it
  }

  // 2. NAVIGATION (HTML): Network First, Fallback to Cache (App Shell)
  // This ensures we get the latest version if online, but load the shell if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid network response, cache a copy of index.html (if accessing root)
          // or just return the response.
          return response;
        })
        .catch(() => {
          // If offline, serve the cached index.html (the App Shell)
          // This allows React Router to take over client-side.
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 3. STATIC ASSETS (JS, CSS, Images): Cache First (Stale-While-Revalidate logic)
  // For a "Strong Offline" mode, we prioritize the cache for UI assets.
  if (isStaticAsset(url.pathname) || CORE_ASSETS.includes(url.href)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Return cached response immediately if available
        if (cachedResponse) {
          // Optional: Update cache in background (Stale-While-Revalidate)
          // For immutable hashed files (Vite), we could skip this, but it's safer to check.
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
               caches.open(CACHE_NAME).then((cache) => {
                   cache.put(event.request, networkResponse.clone());
               });
            }
          }).catch(() => { /* mute network errors in background */ });

          return cachedResponse;
        }

        // If not in cache, fetch from network and cache it
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});
