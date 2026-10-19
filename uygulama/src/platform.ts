/**
 * platform.ts — Web mi, Android uygulaması mı?
 *
 * Capacitor içinde çalışırken `window.location.origin` değeri
 * `capacitor://localhost` olur. Supabase giriş bağlantısı oraya
 * yönlendirilirse e-postadaki link tarayıcıda açılır ve uygulamaya
 * geri dönemez. Bu yüzden native ortamda özel bir şema kullanılır:
 *
 *   com.tamisabet.app://giris
 *
 * Bu şema Android tarafında AndroidManifest.xml içindeki
 * intent-filter ile uygulamaya bağlanmıştır.
 */

import { Capacitor } from '@capacitor/core';

/** Uygulama Android/iOS paketinin içinde mi çalışıyor? */
export function nativeMi(): boolean {
  return Capacitor.isNativePlatform();
}

/** Giriş sonrası dönülecek adres — ortama göre değişir. */
export function girisDonusAdresi(): string {
  return nativeMi() ? 'com.tamisabet.app://giris' : window.location.origin;
}

/**
 * Güvenli alanı `<html>` üstüne işaretler.
 *
 * NEDEN GEREKLİ
 * Android WebView, `env(safe-area-inset-top)` değerini YALNIZCA ekran
 * çentiği için bildiriyor; durum çubuğunun yüksekliğini bildirmiyor.
 * Android 15'ten beri pencere baştan sona kapladığı için sonuç şu:
 * tarayıcı "üstte boşluk yok" diyor ama saatin arkasında uygulamanın
 * kendisi duruyor. Aşağı kaydırılan içerik saatin altına giriyordu
 * (14 Ekim 2026 ekran görüntüsü).
 *
 * İşaret konunca CSS, güvenli alanı en az bir durum çubuğu kadar
 * sayıyor. Fazladan ayrılan birkaç piksel görünmez — şerit zaten kâğıt
 * renginde; eksik ayrılan piksel ise okunmayan bir saat demek.
 */
export function guvenliAlaniIsaretle(): void {
  if (typeof document === 'undefined') return;
  if (nativeMi()) document.documentElement.setAttribute('data-native', '1');
}

/**
 * Oyuncuya gösterilecek profil adresi.
 *
 * NEDEN BURADA
 * Paket içinde `window.location.origin` değeri `capacitor://localhost`
 * oluyor; bunu oyuncuya göstermek anlamsız. Native ortamda sitenin
 * kendi alan adı yazılıyor, webde ise bulunulan adres — yani site
 * taşındığında burası kendiliğinden doğru kalıyor.
 */
export const SITE_ALAN_ADI = 'tamisabet.tr';

export function profilAdresi(kullaniciAdi: string): string {
  const taban =
    nativeMi() || typeof window === 'undefined' ? SITE_ALAN_ADI : window.location.host;
  return `${taban}/o/${kullaniciAdi}`;
}
