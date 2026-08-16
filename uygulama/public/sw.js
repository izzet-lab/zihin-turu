/*
  Servis çalışanı — çevrimdışı çalışma.

  Bulmacalar tohumdan üretildiği (sunucu gerekmez) için, uygulama
  kabuğu bir kez önbelleğe alınınca oyun tamamen çevrimdışı oynanır.

  Strateji:
  - Kurulumda sabit kabuk dosyaları (kök, ikonlar, manifest) önbelleğe alınır.
  - Gezinme istekleri: önce ağ, olmazsa önbellekteki köke düşer.
  - Diğer aynı-köken GET istekleri (JS/CSS/görsel): önbellek öncelikli,
    yoksa ağdan alınıp önbelleğe yazılır. Böylece ilk ziyaretten sonra
    her şey çevrimdışı erişilebilir olur.
*/

const SURUM = 'zt-v1';
const KABUK = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo.svg',
  '/ikon/ikon-192.png',
  '/ikon/ikon-512.png',
  '/ikon/ikon-maskable-512.png',
  '/ikon/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(SURUM)
      .then((c) => c.addAll(KABUK))
      .then(() => self.skipWaiting())
      .catch(() => {}),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const istek = e.request;
  if (istek.method !== 'GET') return;
  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) return;

  // Gezinme: önce ağ, olmazsa önbellekteki kök.
  if (istek.mode === 'navigate') {
    e.respondWith(
      fetch(istek).catch(() => caches.match('/index.html').then((c) => c || caches.match('/'))),
    );
    return;
  }

  // Diğerleri: önbellek öncelikli, arkada ağdan tazele.
  e.respondWith(
    caches.match(istek).then((onbellek) => {
      const agdan = fetch(istek)
        .then((yanit) => {
          if (yanit && yanit.status === 200 && yanit.type === 'basic') {
            const kopya = yanit.clone();
            caches.open(SURUM).then((c) => c.put(istek, kopya));
          }
          return yanit;
        })
        .catch(() => onbellek);
      return onbellek || agdan;
    }),
  );
});
