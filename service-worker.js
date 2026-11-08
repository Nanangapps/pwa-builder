const CACHE_NAME = 'pwa-builder-v1';
const urlsToCache = [
'./',
'./index.html',
'./style.css',
'./app.js',
'./manifest.json',
'./icon.png'
];

self.addEventListener('install', event => {
event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => {
console.log('Mencache file aplikasi...');
return cache.addAll(urlsToCache);
})
);
});

self.addEventListener('activate', event => {
event.waitUntil(
caches.keys().then(cacheNames => {
return Promise.all(
cacheNames.map(cache => {
if (cache !== CACHE_NAME) {
console.log('Menghapus cache lama:', cache);
return caches.delete(cache);
}
})
);
})
);
});

self.addEventListener('fetch', event => {
event.respondWith(
caches.match(event.request)
.then(response => {
if (response) {
return response;
}
return fetch(event.request);
})
);
});