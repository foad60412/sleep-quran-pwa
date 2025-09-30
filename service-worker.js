// زد الرقم مع كل تحديث
const CACHE_NAME = 'sleep-quran-v12';

const ASSETS = [
  '/', '/index.html',
  '/styles.css', '/app.js?v=12', '/manifest.json',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png',
  '/assets/icons/icon-192-maskable.png', '/assets/icons/icon-512-maskable.png',
  '/assets/icons/favicon.ico',
  '/audio/Surah-Al-Mulk.small.mp3',
  '/audio/surah-Albaqarah.small.mp3',
  '/audio/surah-Alqrse.small.mp3'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  // استراتيجية: Cache First للأصول، وNetwork First لباقي الطلبات
  if(ASSETS.some(p=>req.url.endsWith(p))){
    e.respondWith(caches.match(req).then(r=> r || fetch(req)));
  }else{
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c=>c.put(req, copy));
        return res;
      }).catch(()=> caches.match(req))
    );
  }
});
