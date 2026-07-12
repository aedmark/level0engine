// sw.js

const CACHE_NAME = '037';
const ASSETS = [
    './',
    './index.html',
    './main.js',
    './Environment.js',
    './PlayerController.js',
    './AcousticEngine.js',
    './ProceduralTextureFactory.js',
    './RenderEngine.js',
    './three.min.js',
    './manifest.json',
    './Anomaly.js'
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
        caches.match(e.request, { ignoreSearch: true }).then((res) => {
            if (res) return res;

            return fetch(e.request).catch((error) => {
                console.warn('Network request failed:', e.request.url);
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('Offline content missing', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});