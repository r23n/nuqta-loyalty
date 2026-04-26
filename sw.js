/* ============================================================
   sw.js — Service Worker لـ نُقطة PWA
   ------------------------------------------------------------
   مسؤول عن:
   1. تخزين الملفات الأساسية (offline support)
   2. إدارة الكاش بذكاء (Cache First للـ static, Network First للـ API)
   3. تحديث المحتوى تلقائياً لما تتغيّر النسخة

   استراتيجية الكاش:
   - الملفات الثابتة (CSS, JS, fonts): Cache First
   - الـ HTML: Network First مع fallback للكاش
   - الـ API (Supabase): Network Only (لا نكاش بيانات المستخدم)
   ============================================================ */

// ⚠️ مهم: غيّر الإصدار لما تنشر تحديث كبير عشان يحدّث الكاش
const CACHE_VERSION = 'nuqta-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// الملفات الأساسية للـ offline (نحمّلها مع التثبيت)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ==========================================
// Install: تثبيت الـ SW وتحميل الملفات الأساسية
// ==========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install failed:', err))
  );
});

// ==========================================
// Activate: حذف الكاش القديم (لو غيّرنا VERSION)
// ==========================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!name.startsWith(CACHE_VERSION)) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================
// Fetch: تحديد استراتيجية كل request
// ==========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // فقط GET requests
  if (request.method !== 'GET') return;

  // 1. تجاهل Supabase API (لا نكاش بيانات المستخدم)
  if (url.hostname.includes('supabase.co')) {
    return; // المتصفّح يتعامل معه عادي
  }

  // 2. تجاهل QR API (لو تأخر، ما تكاش)
  if (url.hostname.includes('qrserver.com')) {
    return;
  }

  // 3. الـ HTML pages → Network First
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 4. الـ static assets (CSS, JS, fonts, images) → Cache First
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 5. باقي الطلبات (fonts من Google) → Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ==========================================
// استراتيجيات الكاش
// ==========================================

// Cache First: نحاول الكاش، إذا ما لقينا نروح للسيرفر
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503 });
  }
}

// Network First: نحاول السيرفر، إذا فشل نروح للكاش
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // فللخارجة، نرجع index.html (للـ SPA-like behavior)
    return caches.match('/index.html');
  }
}

// Stale While Revalidate: نرجع الكاش فوراً ونحدّثه في الخلفية
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ==========================================
// Push Notifications (مستقبلاً)
// ==========================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: data.url ? { url: data.url } : {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nuqta', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
