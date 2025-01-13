self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('cleaning-schedule-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                'icon-192x192.png',
                'icon-192x192.png'
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
