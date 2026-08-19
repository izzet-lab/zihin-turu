/**
 * platform.ts — Web mi, Android uygulaması mı?
 *
 * Capacitor içinde çalışırken `window.location.origin` değeri
 * `capacitor://localhost` olur. Supabase giriş bağlantısı oraya
 * yönlendirilirse e-postadaki link tarayıcıda açılır ve uygulamaya
 * geri dönemez. Bu yüzden native ortamda özel bir şema kullanılır:
 *
 *   com.zihinturu.app://giris
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
  return nativeMi() ? 'com.zihinturu.app://giris' : window.location.origin;
}
