const CACHE_VERSION = 'v3';
const CACHE_NAME = `cleaning-schedule-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/120-Cleaning-Schdule/',
                '/120-Cleaning-Schdule/index.html',
                '/120-Cleaning-Schdule/manifest.json',
                '/120-Cleaning-Schdule/icon-192x192.png',
                '/120-Cleaning-Schdule/icon-512x512.png'
            ]);
        })
    );
});

// Add this to clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
