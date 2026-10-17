/**
 * lig.ts — Genel sıralamanın kuralları.
 *
 * NEDEN ÇEKİRDEKTE
 * Genel sıralama iki oyunun toplamı; tek bir oyuna ait değil. Kural 1
 * oyun mantığını `oyun-*` paketlerine kapatıyor, bu ise platformun
 * kendi kuralı: hangi oyunlar oynanırsa oynansın aynı işliyor.
 *
 * SQL İLE AYNI OLMAK ZORUNDA
 * Asıl hesap veritabanında (`sunucu/gocler/016_genel_siralama.sql`):
 * puanı sunucu veriyor (kural 2). Buradaki değerler oyuncuya NE
 * SÖYLEDİĞİMİZİ belirliyor — yardım sayfası, tablo açıklaması, çifte
 * tur çağrısı. İkisi ayrışırsa oyuncuya söylenen hesapla tabloya
 * yazılan hesap farklı olur; bu da puanı yanlış hesaplamaktan daha
 * kötü, çünkü güveni bozar.
 *
 * `testler/lig-genel.test.ts` bu dosyayı kilitliyor. Ağırlıklar
 * değişecekse ÖNCE göç yazılır, sonra burası.
 */

/** Seviye ağırlıkları — yalnızca genel sıralamada uygulanır. */
export const GENEL_SEVIYE_AGIRLIK: Record<string, number> = {
  cocuk: 0.6,
  normal: 1.0,
  zor: 1.4,
  usta: 1.8,
};

/** Bilinmeyen seviye ağırlıksız sayılır — puan kaybolmasın. */
export function genelSeviyeAgirligi(seviye: string): number {
  return GENEL_SEVIYE_AGIRLIK[seviye] ?? 1.0;
}

/**
 * Çifte tur bonusu oranı.
 *
 * Aynı gün iki oyunu da tamamlayana o günün toplamına eklenir. Tek
 * oyun oynayan cezalandırılmıyor; ikisini birden oynayan
 * ödüllendiriliyor.
 */
export const CIFTE_TUR_BONUS_ORANI = 0.25;

/** Bir günün genel puanı — tablodaki satırın aynısı. */
export function genelGunlukPuan(sayiPuan: number, kelimePuan: number): {
  sayiPuan: number;
  kelimePuan: number;
  bonus: number;
  toplam: number;
} {
  const bonus =
    sayiPuan > 0 && kelimePuan > 0
      ? Math.round((sayiPuan + kelimePuan) * CIFTE_TUR_BONUS_ORANI)
      : 0;
  return { sayiPuan, kelimePuan, bonus, toplam: sayiPuan + kelimePuan + bonus };
}

/**
 * Tek oyun oynayan oyuncuya gösterilecek kazanç tahmini.
 *
 * "Kelime turunu da oyna, puanın neredeyse iki katına çıkar" derken
 * sayı atmıyoruz: oyuncu aynı güçte bir tur daha oynasa toplamı kaç
 * katına çıkardı, onu söylüyoruz. Eşit puanlı ikinci tur toplamı
 * 2.5 katına çıkarıyor (1 + 1 + %25 bonus).
 */
export function ikinciTurKazanci(mevcutPuan: number): number {
  if (mevcutPuan <= 0) return 0;
  return genelGunlukPuan(mevcutPuan, mevcutPuan).toplam - mevcutPuan;
}
