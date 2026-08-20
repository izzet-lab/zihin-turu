import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Ana from './Ana';
import { derinBaglantiDinle } from './derinBaglanti';
import { nativeMi } from './platform';
import { uzakAyarlariYukle } from './firebase';
import { tercihleriUygula } from './ekranlar/GizlilikAyarlari';
import { bildirimiPlanla, bildirimDinleyiciKur } from './bildirim';
import { oku } from './depo';
import { durumCubuguAyarla } from './durumCubugu';
import './stil.css';

// Android'de e-postadaki giriş bağlantısını yakala (web'de etkisiz).
derinBaglantiDinle();

// Durum çubuğunu ayarla: overlay kapalı, arka plan tema rengiyle eşleşir.
// Web'de sessizce hiçbir şey yapmaz.
durumCubuguAyarla();

// Kullanıcının gizlilik tercihlerini Firebase'e uygula. Bu, herhangi bir
// olay gönderilmeden ÖNCE olmalı — reddetmiş biri için hiçbir şey
// toplanmasın diye. Web'de ikisi de sessizce hiçbir şey yapmaz.
tercihleriUygula();
uzakAyarlariYukle();

// Yerel bildirim: dinleyiciyi kur ve bugünkü hatırlatmayı planla.
// Web'de her ikisi de sessizce hiçbir şey yapmaz.
bildirimDinleyiciKur();
const ilerleme = oku();
bildirimiPlanla(ilerleme.seri.gun);

const kok = document.getElementById('kok');
if (!kok) throw new Error('#kok bulunamadı');

createRoot(kok).render(
  <StrictMode>
    <Ana />
  </StrictMode>,
);

// PWA: servis çalışanını kaydet. Bulmacalar tohumdan üretildiği için
// uygulama kabuğu önbelleğe alınınca oyun çevrimdışı tam çalışır.
// Android paketinde dosyalar zaten cihazda; servis çalışanı gerekmez.
if (!nativeMi() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Servis çalışanı kaydedilemezse oyun yine çalışır, sadece çevrimdışı olmaz.
    });
  });
}
