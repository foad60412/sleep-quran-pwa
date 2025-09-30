// اسم جديد للكاش لمسح أي نسخ قديمة
const CACHE_NAME = 'sleep-quran-v8';

// الملفات التي نحفظها في الكاش
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-192-maskable.png',
  '/assets/icons/icon-512-maskable.png',
  // ملفات الصوت (أضف كل الملفات الموجودة لديك في audio/)
  '/audio/Surah-Al-Mulk.small.mp3',
  '/audio/surah-Albaqarah.small.mp3',
  '/audio/surah-Alqrse.small.mp3'
];

// تثبيت: تنظيف الكاشات القديمة وتخزين الجديدة
self.addEventListener('install', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() =>
      caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    )
  );
  self.skipWaiting();
});

// تفعيل: حذف أي كاش قديم غير مطابق
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// جلب الملفات: نحاول من الكاش أولاً، ثم الشبكة إذا ما لقي
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
