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

/**
 * Banner webview'ın üstüne biner; altında kalan içerik görünmez olur.
 * Bu sınıflar body'ye eklenince o yönde banner kadar boşluk bırakılır
 * (kurallar stil.css içinde).
 */
const SINIF_ALT = 'reklam-alt';
const SINIF_UST = 'reklam-ust';

/** Banner'ın nerede duracağı. */
export type ReklamKonumu = 'alt' | 'ust';

/**
 * Şu an gösterilen konum. Konum değişince banner'ı yerinde taşımak
 * mümkün değil; önce kaldırıp yeniden göstermek gerekir.
 */
let mevcutKonum: ReklamKonumu | null = null;

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
 * Banner gösterir.
 *
 * `konum` neden önemli: banner, dokunma hedeflerinden UZAKTA durmalı.
 * Yanlışlıkla tıklama, AdMob tarafından geçersiz trafik sayılır ve
 * tekrarlanırsa hesap askıya alınır; ayrıca Play Families politikası
 * oyun akışını bozan yerleşimi yasaklar.
 *
 *   'alt'  — Kurulum, Sonuç, Lig, Profil. Bu ekranlarda altta düğme
 *            yığını yok; içerik kaydırılarak okunur.
 *   'ust'  — Oyun ekranı. Üst şerit yalnızca hedef sayı ve süre
 *            göstergesidir, hiç dokunma hedefi içermez. Alt kısımda
 *            ise "Bitir" düğmesi durur; en çok basılan yer orasıdır.
 */
export async function bannerGoster(konum: ReklamKonumu = 'alt'): Promise<void> {
  if (!nativeMi()) return;

  // Zaten aynı konumda gösteriliyorsa dokunma; her ekran geçişinde
  // reklamı yeniden yüklemek hem yanıp sönmeye hem gereksiz istek
  // sayısına yol açar.
  if (mevcutKonum === konum) return;

  // Konum değiştiyse önce kaldır: AdMob banner'ı yerinde taşıyamıyor.
  if (mevcutKonum !== null) await bannerKaldir();

  await reklamBaslat();
  try {
    await AdMob.showBanner({
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: konum === 'ust' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: import.meta.env.DEV,
      // npa = non-personalized ads. initialize()'daki etiketlere ek
      // ikinci bir güvence: istek düzeyinde de kişiselleştirme kapalı.
      npa: true,
    });
    mevcutKonum = konum;
    document.body.classList.add(konum === 'ust' ? SINIF_UST : SINIF_ALT);
  } catch (e) {
    console.warn('[reklam] Banner gösterilemedi:', e);
    // Reklam yüklenemediyse boşluk da bırakma.
    sinifTemizle();
    mevcutKonum = null;
  }
}

/** Banner'ı gizler (giriş formlarında çağrılır). */
export async function bannerGizle(): Promise<void> {
  if (!nativeMi()) return;
  sinifTemizle();
  mevcutKonum = null;
  try {
    await AdMob.hideBanner();
  } catch {
    // Banner zaten yoksa sorun değil.
  }
}

function sinifTemizle(): void {
  document.body.classList.remove(SINIF_ALT, SINIF_UST);
}

/** Banner'ı tamamen kaldırır. */
export async function bannerKaldir(): Promise<void> {
  if (!nativeMi()) return;
  sinifTemizle();
  mevcutKonum = null;
  try {
    await AdMob.removeBanner();
  } catch {
    // Yoksa sorun değil.
  }
}
