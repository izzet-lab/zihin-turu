import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Ana from './Ana';
import './stil.css';

const kok = document.getElementById('kok');
if (!kok) throw new Error('#kok bulunamadı');

createRoot(kok).render(
  <StrictMode>
    <Ana />
  </StrictMode>,
);

// PWA: servis çalışanını kaydet. Bulmacalar tohumdan üretildiği için
// uygulama kabuğu önbelleğe alınınca oyun çevrimdışı tam çalışır.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Servis çalışanı kaydedilemezse oyun yine çalışır, sadece çevrimdışı olmaz.
    });
  });
}
