/**
 * sayim.ts — Sayının hedefe doğru sayılması.
 *
 * NEDEN VAR
 * Tam isabet yapınca puan bir anda ekrana yazılıyordu. Oyunlarda
 * tatmini yaratan şey sonucun kendisi değil, sonuca VARIŞ. Sayının
 * yükselerek yerine oturması, aynı puanı daha çok hissettirir.
 *
 * Buradaki her şey saf: zamanla değeri hesaplar, DOM'a dokunmaz.
 * Böylece hem test edilebilir hem de tek kaynak olur.
 */

/**
 * Yumuşatma eğrisi (easeOutCubic).
 *
 * Hızlı başlar, sona doğru yavaşlar. Doğrusal sayma makine gibi
 * hissettirir; bu eğri "yerine oturuyor" hissi verir.
 *
 * @param t 0..1 arası ilerleme
 */
export function yumusat(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - k, 3);
}

/**
 * Belirli bir ilerlemedeki ara değer.
 *
 * Sonuç her zaman tam sayıdır — puan ondalıklı gösterilmez. İlerleme
 * 1'e ulaştığında kesinlikle hedef değer döner; yuvarlama yüzünden
 * "99" da kalınmaz.
 */
export function sayimDegeri(baslangic: number, bitis: number, ilerleme: number): number {
  if (ilerleme >= 1) return bitis;
  if (ilerleme <= 0) return baslangic;
  return Math.round(baslangic + (bitis - baslangic) * yumusat(ilerleme));
}

/** Sayma süresi sınırları (ms). */
export const SAYIM_EN_KISA = 400;
export const SAYIM_EN_UZUN = 900;

/**
 * Sayma süresi.
 *
 * Büyük sayı daha uzun sayılmalı — 150 puan ile 8 puan aynı sürede
 * sayılırsa büyük sayı gözle takip edilemez. Ama üst sınır şart:
 * oyuncuyu bekletmek ödülü ödül olmaktan çıkarır.
 */
export function sayimSuresi(deger: number): number {
  const buyukluk = Math.abs(deger);
  if (buyukluk === 0) return 0;
  const sure = SAYIM_EN_KISA + buyukluk * 3;
  return Math.min(SAYIM_EN_UZUN, Math.round(sure));
}
