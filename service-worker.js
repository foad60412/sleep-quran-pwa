const CACHE_NAME = 'sleep-quran-v9';
const ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png',
  '/assets/icons/icon-192-maskable.png', '/assets/icons/icon-512-maskable.png',
  '/assets/icons/favicon.ico',
  '/audio/Surah-Al-Mulk.small.mp3',
  '/audio/surah-Albaqarah.small.mp3',
  '/audio/surah-Alqrse.small.mp3'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(res=>res || fetch(e.request)));
});
