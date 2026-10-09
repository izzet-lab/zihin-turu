/**
 * rozetler.ts — Rozet kataloğu.
 *
 * NEDEN VAR
 * Veritabanı 2026 Ağustos'tan beri rozet veriyordu ve Yardım ekranı
 * beş rozet vaat ediyordu; ama hiçbiri hiçbir ekranda görünmüyordu.
 * Oyuncu kazandığını görmüyorsa rozet yoktur.
 *
 * NEREDE DURUYOR
 * Rozet bir OYUN KURALI DEĞİL — platformun ilerleme kaydı, iki oyunda
 * da aynı. Bu yüzden oyun paketinde değil, uygulamada.
 *
 * Katalog kodları veritabanındaki `rozet.rozet_kodu` ile birebir aynı
 * olmak zorunda (bkz. göç 013). Kodu olmayan bir rozet gelirse sessizce
 * atlanır, uygulama kırılmaz.
 */

import type { IkonAdi } from './bilesenler/Ikon';

export interface RozetTanim {
  kod: string;
  ad: string;
  simge: IkonAdi;
  /**
   * Kademe — aynı ailenin kaçıncı basamağı.
   *
   * Rozetlerin hepsi kendi ikonuna sahip olsaydı on dört ayrı çizim
   * gerekirdi ve hiçbiri diğeriyle akraba görünmezdi. Burada aile
   * ikonla, basamak metalle anlatılıyor: aynı alev dört kez geçiyor
   * ama yüzüğü bronzdan altına yükseliyor.
   */
  kademe?: 'bronz' | 'gumus' | 'altin';
  /** Nasıl kazanılır — kilitliyken de gösteriliyor, hedef olsun diye. */
  nasil: string;
  oyunGrubu: 'seri' | 'beceri' | 'rekabet';
}

export const ROZETLER: readonly RozetTanim[] = [
  // --- Seri: alışkanlık ---
  { kod: 'seri_3', ad: 'Üç Gün', simge: 'seri', nasil: '3 gün üst üste oyna', oyunGrubu: 'seri' },
  { kod: 'seri_7', ad: 'Haftalık', simge: 'seri', kademe: 'bronz', nasil: '7 gün üst üste oyna', oyunGrubu: 'seri' },
  { kod: 'seri_30', ad: 'Aylık', simge: 'seri', kademe: 'gumus', nasil: '30 gün üst üste oyna', oyunGrubu: 'seri' },
  { kod: 'seri_100', ad: 'Yüz Gün', simge: 'seri', kademe: 'altin', nasil: '100 gün üst üste oyna', oyunGrubu: 'seri' },

  // --- Beceri ---
  { kod: 'tam_ilk', ad: 'İlk İsabet', simge: 'hedef', nasil: 'İlk tam isabetini yap', oyunGrubu: 'beceri' },
  { kod: 'tam_10', ad: 'On İsabet', simge: 'hedef', kademe: 'gumus', nasil: '10 tam isabet yap', oyunGrubu: 'beceri' },
  { kod: 'tam_100', ad: 'Yüz İsabet', simge: 'hedef', kademe: 'altin', nasil: '100 tam isabet yap', oyunGrubu: 'beceri' },
  { kod: 'kelime_ilk', ad: 'Kelimeci', simge: 'kelime', nasil: 'Kelime turunu oyna', oyunGrubu: 'beceri' },

  // --- Rekabet ---
  { kod: 'duello_ilk', ad: 'İlk Galibiyet', simge: 'duello', nasil: 'Bir düello kazan', oyunGrubu: 'rekabet' },
  { kod: 'duello_10', ad: 'On Galibiyet', simge: 'duello', kademe: 'gumus', nasil: '10 düello kazan', oyunGrubu: 'rekabet' },
  { kod: 'duello_50', ad: 'Elli Galibiyet', simge: 'tac', kademe: 'altin', nasil: '50 düello kazan', oyunGrubu: 'rekabet' },
  { kod: 'arena_podyum', ad: 'Podyum', simge: 'madalya', nasil: 'Arenada podyuma çık', oyunGrubu: 'rekabet' },
  { kod: 'arena_altin', ad: 'Altın', simge: 'kupa', kademe: 'altin', nasil: 'Bir arena kazan', oyunGrubu: 'rekabet' },
  { kod: 'arena_altin_10', ad: 'On Altın', simge: 'kupa', kademe: 'altin', nasil: '10 arena kazan', oyunGrubu: 'rekabet' },
];

export const ROZET_GRUP_ADI: Record<RozetTanim['oyunGrubu'], string> = {
  seri: 'Alışkanlık',
  beceri: 'Beceri',
  rekabet: 'Rekabet',
};

export function rozetBul(kod: string): RozetTanim | undefined {
  return ROZETLER.find((r) => r.kod === kod);
}
