const CACHE_NAME = 'fountain-v1';
// IMPORTANT: Every path must be exactly correct relative to sw.js
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './fountain.min.js',
  './icon-512.png' // Make sure this file actually exists in your repo!
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We use map to log which specific file fails
      return Promise.all(
        ASSETS.map(url => {
          return cache.add(url).catch(err => console.error('Failed to cache:', url, err));
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
