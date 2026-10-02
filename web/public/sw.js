// ============================================================
// cogi - Service worker
//
// Copy tu fina/public/sw.js. Hai viec, khong hon: nhan push, va cache vo app
// cho nhanh.
//
// --- Cache -------------------------------------------------
//
// /_next/static/*  cache-first vinh vien. Ten file co hash noi dung, nen
//                  ban build moi la ten file moi - khong bao gio cu.
// HTML             network-first. Cache-first o day la cach chac chan nhat
//                  de mot hom nao do nguoi dung nhin vao build tuan truoc
//                  ma khong hieu vi sao.
// API / Firestore  KHONG dung vao. Du lieu khong bao gio duoc phuc vu tu
//                  ban cu.
// ============================================================

const CACHE_VERSION = 'cogi-v1';

// --- Cache -------------------------------------------------

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_VERSION));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');
}

function isNeverCached(url) {
  return (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/__/')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (isNeverCached(url)) return;

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match('/'))),
    );
  }
});

// --- Push --------------------------------------------------
//
// Function gui data-only. Gui kem `notification` payload nua thi iOS hien
// HAI thong bao cho cung mot loi nhac.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const payload = data.data ?? data;

  event.waitUntil(
    // title mang ca noi dung: iOS da hien ten app o tren roi.
    self.registration.showNotification(payload.title || 'cogi', {
      body: payload.body || undefined,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag || 'cogi-reminder',
      data: { url: payload.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(target) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
