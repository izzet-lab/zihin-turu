import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Ana from './Ana';
import { derinBaglantiDinle } from './derinBaglanti';
import { nativeMi } from './platform';
import './stil.css';

// Android'de e-postadaki giriş bağlantısını yakala (web'de etkisiz).
derinBaglantiDinle();

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
