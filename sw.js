/* ===== MLEBUMETU SERVICE WORKER v3 ===== */
// Increment version to force clear all old caches
const CACHE = 'mlebumetu-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  // Force activate immediately — don't wait for old SW to die
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    // Delete ALL old caches
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        console.log('[SW] Deleting cache:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      console.log('[SW] All old caches cleared');
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // NEVER intercept Firebase/Google API requests — let them go to network directly
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('google') ||
      url.hostname.includes('accounts')) {
    return; // Don't intercept — pass through to network
  }

  if (e.request.method !== 'GET') return;

  // Network first for HTML, cache first for assets
  if (url.pathname.endsWith('.html') || url.pathname === '/mlebumetu/' || url.pathname === '/mlebumetu') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        return cached || fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});
