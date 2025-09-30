// ارفع الإصدار
const CACHE_NAME = 'sleep-quran-v16';

const ASSETS = [
  '/', '/index.html',
  '/styles.css', '/app.js?v=14', '/manifest.json',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png',
  '/assets/icons/icon-192-maskable.png', '/assets/icons/icon-512-maskable.png',
  '/assets/icons/favicon.ico'
  // ملاحظة: لا نضع ملفات /audio/ هنا
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;

  // مرر كل الصوتيات مباشرةً للشبكة (للسماح بـ Range)
  const isAudio = req.destination === 'audio' || /\/audio\/.*\.mp3(\?.*)?$/.test(req.url);
  if (isAudio) { e.respondWith(fetch(req)); return; }

  // Cache First للأصول الساكنة
  if (ASSETS.some(p=>req.url.endsWith(p))) {
    e.respondWith(caches.match(req).then(r=> r || fetch(req)));
    return;
  }

  // Network First لباقي الملفات
  e.respondWith(
    fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(req, copy));
      return res;
    }).catch(()=> caches.match(req))
  );
});
