/**
 * abonelik.ts — Abonelik (subscription) iskelet yapısı.
 *
 * "Destekçi" katmanı: aylık ücretli, oyun avantajı VERMEZ.
 * Sağladıkları:
 *   - Reklamsız deneyim (banner + ödüllü video gizlenir)
 *   - Sınırsız joker hakkı (tur başı sınır kalkar)
 *   - Profilde "Destekçi" rozeti
 *
 * Oyun dengesi açısından kritik kural:
 *   Abone olan oyuncu, abone olmayandan DAHA YÜKSEK PUAN ALAMAZ.
 *   Joker kullanımı puandan düşürme (JOKER_MALIYET) yapmaya devam eder.
 *   Lig sıralaması abone/abone olmayan farkı gözetmez.
 *
 * DURUM: İskelet. Google Play Billing entegrasyonu henüz yapılmadı.
 * Yapılacaklar:
 *   1. @anthropic/capacitor-purchases veya
 *      @nicefyi/capacitor-native-purchases eklenmeli
 *   2. Google Play Console'da ürün tanımlanmalı
 *   3. Sunucu taraflı doğrulama (Edge Function) yazılmalı
 *   4. Supabase'de `abonelik` tablosu oluşturulmalı
 *
 * ⚠️ Bu dosya şu an yalnızca tip tanımları ve istemci taraflı
 * durum yönetimi içerir. Gerçek satın alma yapılmaz.
 */

/** Abonelik durumu. */
export type AbonelikDurumu = 'yok' | 'aktif' | 'suresi_doldu' | 'iptal_edildi';

/** Abonelik bilgisi. */
export interface AbonelikBilgi {
  durum: AbonelikDurumu;
  /** Abonelik bitiş tarihi (ISO string). Aktifse bu tarihte sona erer. */
  bitisTarihi: string | null;
  /** Google Play sipariş kimliği. */
  siparisId: string | null;
}

const BOS_ABONELIK: AbonelikBilgi = {
  durum: 'yok',
  bitisTarihi: null,
  siparisId: null,
};

/**
 * Abonelik durumunu döndürür.
 *
 * Şu an her zaman 'yok' döner — entegrasyon yapıldığında
 * sunucudan ve/veya Play Store'dan kontrol edilecek.
 */
export function abonelikDurumuOku(): AbonelikBilgi {
  // TODO: Google Play Billing entegrasyonu
  // 1. Play Store'dan güncel durumu kontrol et
  // 2. Sunucu taraflı doğrulama yap
  // 3. Sonucu cache'le
  return BOS_ABONELIK;
}

/** Kullanıcı aktif aboneye sahip mi? */
export function aboneAktifMi(): boolean {
  return abonelikDurumuOku().durum === 'aktif';
}

/**
 * Destekçi aboneliğinin sağladığı avantajlar.
 * Diğer dosyalar bu fonksiyonları kullanarak abonelik
 * durumuna göre davranış değiştirir.
 */

/** Reklam gösterilmeli mi? Aboneyse hayır. */
export function reklamGosterilsinMi(): boolean {
  return !aboneAktifMi();
}

/** Joker hakkı sınırsız mı? Aboneyse evet. */
export function jokerSinirsizMi(): boolean {
  return aboneAktifMi();
}

/** Profilde destekçi rozeti gösterilmeli mi? */
export function destekciRozetiGosterilsinMi(): boolean {
  return aboneAktifMi();
}

/**
 * Satın alma akışını başlatır.
 *
 * Şu an hiçbir şey yapmaz — entegrasyon yapıldığında
 * Google Play Billing Library üzerinden satın alma ekranı açılır.
 */
export async function abonelikSatinAl(): Promise<boolean> {
  // TODO: Google Play Billing entegrasyonu
  // 1. Ürün ID'si ile BillingClient.launchBillingFlow çağır
  // 2. Sonucu bekle
  // 3. Başarılıysa sunucu taraflı doğrulama yap
  // 4. Abonelik durumunu güncelle
  console.warn('[abonelik] Satın alma henüz aktif değil.');
  return false;
}

/**
 * Aboneliği iptal eder (Play Store yönetim sayfasına yönlendirir).
 */
export async function abonelikIptalEt(): Promise<void> {
  // TODO: Play Store abonelik yönetim sayfasına yönlendir
  console.warn('[abonelik] İptal henüz aktif değil.');
}
