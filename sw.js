const CACHE_NAME = 'fountain-v1';

// Combined and corrected list
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './fountain2026.js', // Updated from .min.js
  './update.js',
  './board.js',
  './board.css',
  './icon-512.png',
  './welcome.fountain',
  './corkboard.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use map + Promise.all so one failure doesn't kill the whole worker
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.warn('Skipping missing file:', url));
        })
      );
    })
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
