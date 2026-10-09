/**
 * kutlama-karar.ts — "Kutlanacak bir şey oldu mu?" kararı.
 *
 * NEDEN AYRI VE SAF
 * Oyunlar başarıyı KUTLAR, bildirmez. Ama neyin kutlanacağı bir
 * arayüz sorusu değil, bir kural sorusu: seviye atladı mı, rozet geldi
 * mi, seri bir eşiği geçti mi. Burada hiç DOM yok, hiç ağ yok — iki
 * fotoğraf veriliyor, kutlama listesi dönüyor. Böylece test edilebilir
 * ve ekran kodu yalnızca göstermekle uğraşıyor.
 *
 * AYNI ŞEY İKİ KEZ KUTLANMAZ
 * Seri eşikleri (3, 7, 30, 100) zaten birer rozet veriyor. Seriyi ayrı
 * bir kutlama olarak eklemek aynı anı iki kez göstermek olurdu; seri
 * kutlaması yalnızca ROZETİ OLMAYAN eşiklerde çıkıyor.
 */

import { xpSeviyeHesapla } from './kimlik';
import { rozetBul, type RozetTanim } from './rozetler';

/** Oyuncunun o andaki ilerleme fotoğrafı. */
export interface IlerlemeOzeti {
  xp: number;
  seriGun: number;
  /** Kazanılmış rozet kodları. */
  rozetler: string[];
}

export type Kutlama =
  | { tur: 'seviye'; seviye: number; unvan: string }
  | { tur: 'rozet'; rozet: RozetTanim }
  | { tur: 'seri'; gun: number };

/**
 * Rozeti olmayan ama kutlamaya değer seri eşikleri.
 *
 * 3, 7, 30 ve 100 rozet veriyor; aradaki bu basamaklar uzun seriyi
 * sürdüren oyuncuyu arada bir hatırlıyor.
 */
export const SERI_ESIKLERI = [14, 50, 200, 365];

export function kutlamalariBul(
  onceki: IlerlemeOzeti | null,
  simdiki: IlerlemeOzeti,
): Kutlama[] {
  // İlk fotoğraf: karşılaştıracak bir şey yok. Yeni giren oyuncuya
  // geçmişte kazandığı her şeyi arka arkaya kutlatmak saçma olurdu.
  if (!onceki) return [];

  const liste: Kutlama[] = [];

  // 1) Seviye atlama — en büyük an, en başa.
  const eski = xpSeviyeHesapla(onceki.xp).seviye;
  const yeni = xpSeviyeHesapla(simdiki.xp);
  if (yeni.seviye > eski) {
    liste.push({ tur: 'seviye', seviye: yeni.seviye, unvan: yeni.unvan });
  }

  // 2) Yeni rozetler — katalogda olmayan kod sessizce atlanır.
  const eskiRozet = new Set(onceki.rozetler);
  for (const kod of simdiki.rozetler) {
    if (eskiRozet.has(kod)) continue;
    const r = rozetBul(kod);
    if (r) liste.push({ tur: 'rozet', rozet: r });
  }

  // 3) Seri eşiği — yalnızca rozetin olmadığı basamaklarda.
  for (const esik of SERI_ESIKLERI) {
    if (onceki.seriGun < esik && simdiki.seriGun >= esik) {
      liste.push({ tur: 'seri', gun: esik });
    }
  }

  return liste;
}
