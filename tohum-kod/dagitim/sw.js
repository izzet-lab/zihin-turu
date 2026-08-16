'use strict';
/* ============================================================
   SERVİS ÇALIŞANI
   Oyunun tamamı istemci tarafında çalışıyor — bulmacalar tohumdan
   üretiliyor, sunucuya soru sorulmuyor. Yani kabuk bir kez
   önbelleğe alınırsa oyun ÇEVRİMDIŞI da tam çalışır. Metroda,
   uçakta, kapsama dışında oynanabilir olması küçük bir oyun için
   ciddi bir avantaj.
   ============================================================ */

const SURUM = 'sayi-turu-v1';
const KABUK = [
  './',
  './index.html',
  './manifest.json',
  './ikon/ikon-192.png',
  './ikon/ikon-512.png',
  './ikon/ikon-maskable-512.png'
];

self.addEventListener('install', o=>{
  o.waitUntil(
    caches.open(SURUM)
      .then(k=>k.addAll(KABUK).catch(()=>{}))   // tek dosya eksikse kurulum çökmesin
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', o=>{
  o.waitUntil(
    caches.keys()
      .then(adlar=>Promise.all(adlar.filter(a=>a !== SURUM).map(a=>caches.delete(a))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', o=>{
  const istek = o.request;
  if (istek.method !== 'GET') return;

  const url = new URL(istek.url);

  // Yazı tipleri: önce önbellek, arkada tazele
  if (url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')){
    o.respondWith(
      caches.open(SURUM).then(k=>
        k.match(istek).then(bulunan=>{
          const ag = fetch(istek).then(y=>{ if (y.ok) k.put(istek, y.clone()); return y; }).catch(()=>bulunan);
          return bulunan || ag;
        })
      )
    );
    return;
  }

  // Kendi dosyalarımız: ağ önce, kopamazsa önbellek (çevrimdışı oynanır)
  o.respondWith(
    fetch(istek)
      .then(y=>{
        if (y.ok && url.origin === self.location.origin)
          caches.open(SURUM).then(k=>k.put(istek, y.clone()));
        return y;
      })
      .catch(()=>caches.match(istek).then(b=>b || caches.match('./')))
  );
});
