/**
 * reklam.ts — AdMob.
 *
 * ÖNEMLİ — ÇOCUĞA YÖNELİK UYGULAMA
 * Zihin Turu 8 yaş ve üzeri hedefler. Bu, Google Play "Families"
 * politikası kapsamına girer. Sonuçları:
 *
 *   1. tagForChildDirectedTreatment = true  (COPPA/Play Families)
 *   2. tagForUnderAgeOfConsent      = true  (GDPR/KVKK, 16 yaş altı)
 *   3. maxAdContentRating           = 'G'   (yalnızca genel izleyici)
 *
 * Bu üçü birlikte KİŞİSELLEŞTİRİLMİŞ REKLAMI KAPATIR. Yalnızca
 * bağlamsal reklam gösterilir; oyuncunun davranışına göre profil
 * çıkarılmaz, reklam kimliği (AAID) kullanılmaz. Gelir normalin
 * altındadır — bu bilinçli bir tercihtir, teknik bir eksiklik değil.
 *
 * Bu ayarlar KALDIRILMAMALIDIR. Kaldırılırsa hem Play politikası ihlal
 * edilir hem de gizlilik metnindeki taahhüt yalan olur.
 *
 * Reklam biçimi: yalnızca BANNER. Geçiş (interstitial) ve ödüllü
 * reklam kullanılmaz — çocuk hedefli uygulamalarda oyunun akışını
 * kesen tam ekran reklamlar hem politika riski taşır hem de "emir
 * değil öneri" ilkesine aykırıdır.
 */

import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
} from '@capacitor-community/admob';
import { nativeMi } from './platform';

/**
 * Reklam birimi kimlikleri.
 * Gerçek kimlikler AdMob konsolundan alınıp ortam değişkenine yazılır.
 * Tanımlı değilse Google'ın resmî TEST kimliği kullanılır — böylece
 * geliştirme sırasında yanlışlıkla gerçek reklam gösterilip hesap
 * askıya alınmaz.
 */
const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const BANNER_ID = (import.meta.env.VITE_ADMOB_BANNER_ID as string) || TEST_BANNER;

let baslatildi = false;

/** AdMob'u çocuğa yönelik ayarlarla başlatır. */
export async function reklamBaslat(): Promise<void> {
  if (!nativeMi() || baslatildi) return;
  try {
    await AdMob.initialize({
      // Test cihazları: gerçek reklam yerine test reklamı görür.
      initializeForTesting: import.meta.env.DEV,

      // --- Çocuğa yönelik zorunlu ayarlar (bkz. dosya başı) ---
      // Bu üçü kişiselleştirilmiş reklamı kapatır. KALDIRILMAMALIDIR.
      tagForChildDirectedTreatment: true,
      tagForUnderAgeOfConsent: true,
      maxAdContentRating: MaxAdContentRating.General,
    });
    baslatildi = true;
  } catch (e) {
    console.warn('[reklam] AdMob başlatılamadı:', e);
  }
}

/**
 * Alt banner gösterir.
 *
 * Oyun ekranında ÇAĞRILMAZ — tur sırasında ekranın altında reklam
 * olması hem dikkat dağıtır hem de yanlışlıkla tıklamaya yol açar
 * (çocuk hedefli uygulamalarda bu ciddi bir politika riskidir).
 * Yalnızca Kurulum ve Sonuç ekranlarında gösterilir.
 */
export async function bannerGoster(): Promise<void> {
  if (!nativeMi()) return;
  await reklamBaslat();
  try {
    await AdMob.showBanner({
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: import.meta.env.DEV,
      // npa = non-personalized ads. initialize()'daki etiketlere ek
      // ikinci bir güvence: istek düzeyinde de kişiselleştirme kapalı.
      npa: true,
    });
  } catch (e) {
    console.warn('[reklam] Banner gösterilemedi:', e);
  }
}

/** Banner'ı gizler (oyun başlarken çağrılır). */
export async function bannerGizle(): Promise<void> {
  if (!nativeMi()) return;
  try {
    await AdMob.hideBanner();
  } catch {
    // Banner zaten yoksa sorun değil.
  }
}

/** Banner'ı tamamen kaldırır. */
export async function bannerKaldir(): Promise<void> {
  if (!nativeMi()) return;
  try {
    await AdMob.removeBanner();
  } catch {
    // Yoksa sorun değil.
  }
}
