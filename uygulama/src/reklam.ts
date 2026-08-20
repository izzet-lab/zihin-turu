/**
 * reklam.ts — AdMob + UMP onay akışı.
 *
 * YASAL ÇERÇEVE
 * Asgari yaş: 13. 13–17 arası kullanıcılara kişiselleştirilmiş reklam
 * gösterilmez (yaştan bağımsız olarak onay akışı da sorulmaz).
 * 18+ kullanıcılara UMP SDK üzerinden onay sorulur; onay vermeyene
 * kişiselleştirilmemiş reklam gösterilir — reklam tamamen kalkmaz.
 *
 * ÖNCEKİ DURUM (19 Ağustos 2026 öncesi):
 * Hedef yaş 8+ idi; tagForChildDirectedTreatment ve tagForUnderAgeOfConsent
 * her zaman true'ydu, maxAdContentRating 'G' idi. Kişiselleştirilmiş reklam
 * tamamen kapalıydı.
 *
 * YENİ DURUM:
 * - tagForChildDirectedTreatment: KAPALI (COPPA 13 yaş altı içindi, artık
 *   13 altı kayıt olmuyor)
 * - tagForUnderAgeOfConsent: KAPALI (yerine gerçek UMP onay akışı var)
 * - maxAdContentRating: Teen (13+ hedef kitleye uygun)
 * - 18 altı kullanıcıya kişiselleştirilmiş reklam gösterilmez
 * - 18+ kullanıcıya UMP onay formu gösterilir
 *
 * ⚠️ BU DEĞİŞİKLİKLER AVUKAT ONAYINDAN SONRA YAYINLANMALIDIR.
 * Önceki yasal metinler 8 yaş ve kişiselleştirmesiz reklam varsayımıyla
 * yazılmıştı; yeni metinler henüz onaylanmadı.
 *
 * Reklam biçimleri: BANNER + ÖDÜLLÜ VİDEO (rewarded).
 * Banner: Kurulum, Sonuç, Lig, Profil ekranlarında. Oyun ekranında yok.
 * Ödüllü video: joker hakkı bitince ek joker, antrenman tekrarı, seri koruma.
 */

import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  MaxAdContentRating,
  type AdmobConsentInfo,
  AdmobConsentStatus,
  type AdMobRewardItem,
} from '@capacitor-community/admob';
import { nativeMi } from './platform';
import { resinDegilMi } from './depo';

/**
 * Reklam birimi kimlikleri.
 * Gerçek kimlikler AdMob konsolundan alınıp ortam değişkenine yazılır.
 * Tanımlı değilse Google'ın resmî TEST kimliği kullanılır — böylece
 * geliştirme sırasında yanlışlıkla gerçek reklam gösterilip hesap
 * askıya alınmaz.
 */
const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const TEST_REWARDED = 'ca-app-pub-3940256099942544/5224354917';
const BANNER_ID = (import.meta.env.VITE_ADMOB_BANNER_ID as string) || TEST_BANNER;
const REWARDED_ID = (import.meta.env.VITE_ADMOB_REWARDED_ID as string) || TEST_REWARDED;

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

/**
 * UMP onay durumu. `true` = kişiselleştirilmiş reklam gösterilebilir.
 * Varsayılan `false` — onay alınana kadar kişiselleştirilmemiş reklam gösterilir.
 */
let kisiselReklamOnay = false;

/**
 * AdMob'u başlatır ve UMP onay akışını yönetir.
 *
 * 18 altı kullanıcıya onay formu gösterilmez, doğrudan
 * kişiselleştirilmemiş reklam gösterilir.
 */
export async function reklamBaslat(): Promise<void> {
  if (!nativeMi() || baslatildi) return;
  try {
    await AdMob.initialize({
      initializeForTesting: import.meta.env.DEV,

      // COPPA etiketi artık kapalı — 13 altı kullanıcı kayıt olmuyor.
      tagForChildDirectedTreatment: false,

      // Gerçek onay akışı UMP ile yapılıyor; bu bayrak kapalı.
      tagForUnderAgeOfConsent: false,

      // 13+ hedef kitleye uygun
      maxAdContentRating: MaxAdContentRating.Teen,
    });
    baslatildi = true;

    // UMP onay akışı — yalnızca 18+ kullanıcılara
    if (!resinDegilMi()) {
      await umpOnayAkisi();
    }
    // 18 altı: kisiselReklamOnay = false kalır → npa: true
  } catch (e) {
    console.warn('[reklam] AdMob başlatılamadı:', e);
  }
}

/**
 * UMP (User Messaging Platform) onay akışı.
 *
 * Google'ın GDPR mesaj yapılandırmasını (AdMob konsolundan ayarlanır)
 * kullanarak kullanıcıya reklam kişiselleştirmesi onay formu gösterir.
 * Onay vermezse kişiselleştirilmemiş reklam gösterilir.
 */
async function umpOnayAkisi(): Promise<void> {
  try {
    const bilgi: AdmobConsentInfo = await AdMob.requestConsentInfo();

    if (bilgi.status === AdmobConsentStatus.REQUIRED && bilgi.isConsentFormAvailable) {
      const sonuc = await AdMob.showConsentForm();
      kisiselReklamOnay = sonuc.status === AdmobConsentStatus.OBTAINED;
    } else if (bilgi.status === AdmobConsentStatus.OBTAINED) {
      kisiselReklamOnay = true;
    }
    // NOT_REQUIRED veya UNKNOWN → kisiselReklamOnay = false kalır
  } catch (e) {
    console.warn('[reklam] UMP onay akışı hatası:', e);
    // Hata durumunda kişiselleştirilmemiş reklam gösterilir
  }
}

/**
 * UMP gizlilik seçenekleri formunu açar.
 * GizlilikAyarlari ekranından çağrılır — kullanıcı onayını sonradan
 * değiştirebilir (yasal zorunluluk).
 */
export async function reklamOnayFormunuGoster(): Promise<void> {
  if (!nativeMi() || !baslatildi) return;
  try {
    await AdMob.showPrivacyOptionsForm();
    // Onay durumunu güncelle
    const bilgi = await AdMob.requestConsentInfo();
    kisiselReklamOnay = bilgi.status === AdmobConsentStatus.OBTAINED;
  } catch (e) {
    console.warn('[reklam] Gizlilik formu açılamadı:', e);
  }
}

/** Kişiselleştirilmiş reklam onayı var mı? */
export function kisiselReklamOnayliMi(): boolean {
  return kisiselReklamOnay;
}

/**
 * Banner gösterir.
 *
 * `konum` neden önemli: banner, dokunma hedeflerinden UZAKTA durmalı.
 * Yanlışlıkla tıklama, AdMob tarafından geçersiz trafik sayılır ve
 * tekrarlanırsa hesap askıya alınır.
 *
 *   'alt'  — Kurulum, Sonuç, Lig, Profil. Bu ekranlarda altta düğme
 *            yığını yok; içerik kaydırılarak okunur.
 *   'ust'  — Oyun ekranı. Üst şerit yalnızca hedef sayı ve süre
 *            göstergesidir, hiç dokunma hedefi içermez. Alt kısımda
 *            ise "Bitir" düğmesi durur; en çok basılan yer orasıdır.
 */
export async function bannerGoster(konum: ReklamKonumu = 'alt'): Promise<void> {
  if (!nativeMi()) return;

  if (mevcutKonum === konum) return;
  if (mevcutKonum !== null) await bannerKaldir();

  await reklamBaslat();
  try {
    // 18 altı veya onay verilmemiş → kişiselleştirilmemiş reklam
    const npa = resinDegilMi() || !kisiselReklamOnay;

    await AdMob.showBanner({
      adId: BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: konum === 'ust' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: import.meta.env.DEV,
      npa,
    });
    mevcutKonum = konum;
    document.body.classList.add(konum === 'ust' ? SINIF_UST : SINIF_ALT);
  } catch (e) {
    console.warn('[reklam] Banner gösterilemedi:', e);
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

/* ── Ödüllü video reklam ── */

/**
 * Ödüllü video reklamı hazırlar (arka planda yükler).
 * Kullanıcı düğmeye basmadan reklam asla başlamaz.
 * Yükleme başarısızsa `showRewardVideoAd` zaten hata verir;
 * bu durumda ödül yine verilir (Play Store politikası).
 */
export async function odulluReklamHazirla(): Promise<boolean> {
  if (!nativeMi()) return false;
  await reklamBaslat();
  try {
    const npa = resinDegilMi() || !kisiselReklamOnay;
    await AdMob.prepareRewardVideoAd({
      adId: REWARDED_ID,
      isTesting: import.meta.env.DEV,
      npa,
    });
    return true;
  } catch (e) {
    console.warn('[reklam] Ödüllü reklam hazırlanamadı:', e);
    return false;
  }
}

/**
 * Ödüllü video reklamı gösterir.
 *
 * Kullanıcının düğmeye basmasıyla çağrılır — otomatik başlamaz.
 * Reklam yüklenemezse veya gösterilemezse ödül **yine verilir**
 * (reklam yok diye oyuncu cezalandırılmaz; Play Store politikası).
 *
 * @returns true = ödül kazanıldı (reklam başarılı veya başarısız)
 */
export async function odulluReklamGoster(): Promise<boolean> {
  if (!nativeMi()) return true; // Web'de reklam yok, ödülü ver

  try {
    const sonuc: AdMobRewardItem = await AdMob.showRewardVideoAd();
    console.log('[reklam] Ödül kazanıldı:', sonuc.type, sonuc.amount);
    return true;
  } catch (e) {
    console.warn('[reklam] Ödüllü reklam gösterilemedi:', e);
    // Reklam gösterilemese bile ödülü ver — kullanıcı cezalandırılmaz
    return true;
  }
}
