// sw.js - Thermodynamic Cache

const CACHE_NAME = 'level0-v012';
const ASSETS = [
    './',
    './index.html',
    './main.js',
    './Environment.js',
    './PlayerController.js',
    './RenderEngine.js',
    './three.min.js',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        // ignoreSearch: true forces the cache to ignore Neocities cache-busting query strings
        caches.match(e.request, { ignoreSearch: true }).then((res) => {
            if (res) return res;

            return fetch(e.request).catch((error) => {
                console.warn('Network request failed:', e.request.url);

                // If the failed request was a navigation request (page load), force the cached index
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }

                // Always return a valid Response to prevent ERR_FAILED crashes
                return new Response('Offline content missing', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});