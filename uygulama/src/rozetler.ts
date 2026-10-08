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

export interface RozetTanim {
  kod: string;
  ad: string;
  simge: string;
  /** Nasıl kazanılır — kilitliyken de gösteriliyor, hedef olsun diye. */
  nasil: string;
  oyunGrubu: 'seri' | 'beceri' | 'rekabet';
}

export const ROZETLER: readonly RozetTanim[] = [
  // --- Seri: alışkanlık ---
  { kod: 'seri_3', ad: 'Üç Gün', simge: '🔥', nasil: '3 gün üst üste oyna', oyunGrubu: 'seri' },
  { kod: 'seri_7', ad: 'Haftalık', simge: '🗓️', nasil: '7 gün üst üste oyna', oyunGrubu: 'seri' },
  { kod: 'seri_30', ad: 'Aylık', simge: '📆', nasil: '30 gün üst üste oyna', oyunGrubu: 'seri' },
  { kod: 'seri_100', ad: 'Yüz Gün', simge: '💯', nasil: '100 gün üst üste oyna', oyunGrubu: 'seri' },

  // --- Beceri ---
  { kod: 'tam_ilk', ad: 'İlk İsabet', simge: '🎯', nasil: 'İlk tam isabetini yap', oyunGrubu: 'beceri' },
  { kod: 'tam_10', ad: 'On İsabet', simge: '🏹', nasil: '10 tam isabet yap', oyunGrubu: 'beceri' },
  { kod: 'tam_100', ad: 'Yüz İsabet', simge: '🧠', nasil: '100 tam isabet yap', oyunGrubu: 'beceri' },
  { kod: 'kelime_ilk', ad: 'Kelimeci', simge: '📖', nasil: 'Kelime turunu oyna', oyunGrubu: 'beceri' },

  // --- Rekabet ---
  { kod: 'duello_ilk', ad: 'İlk Galibiyet', simge: '⚔️', nasil: 'Bir düello kazan', oyunGrubu: 'rekabet' },
  { kod: 'duello_10', ad: 'On Galibiyet', simge: '🛡️', nasil: '10 düello kazan', oyunGrubu: 'rekabet' },
  { kod: 'duello_50', ad: 'Elli Galibiyet', simge: '👑', nasil: '50 düello kazan', oyunGrubu: 'rekabet' },
  { kod: 'arena_podyum', ad: 'Podyum', simge: '🏅', nasil: 'Arenada podyuma çık', oyunGrubu: 'rekabet' },
  { kod: 'arena_altin', ad: 'Altın', simge: '🥇', nasil: 'Bir arena kazan', oyunGrubu: 'rekabet' },
  { kod: 'arena_altin_10', ad: 'On Altın', simge: '🏆', nasil: '10 arena kazan', oyunGrubu: 'rekabet' },
];

export const ROZET_GRUP_ADI: Record<RozetTanim['oyunGrubu'], string> = {
  seri: 'Alışkanlık',
  beceri: 'Beceri',
  rekabet: 'Rekabet',
};

export function rozetBul(kod: string): RozetTanim | undefined {
  return ROZETLER.find((r) => r.kod === kod);
}
