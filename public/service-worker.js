const CACHE_NAME = 'pawsome-chat-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    // Add other static assets to cache, like your CSS and JavaScript bundles
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
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