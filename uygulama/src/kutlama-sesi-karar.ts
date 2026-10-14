/**
 * kutlama-sesi-karar.ts — Hangi kutlama sesi çalacak?
 *
 * İKİ KATMAN VAR, SEBEBİ ÖNEMLİ
 * Tam isabet sık olan bir an. Her seferinde uzun bir fanfar çalsaydı
 * ses birkaç turda yıpranır, oyuncu da en kolay çözüme giderdi: sesi
 * tamamen kapatmak. O yüzden:
 *
 *   Katman 1 — her tam isabette: kısa vuruş. Hafif, tekrar edecek.
 *   Katman 2 — yalnızca özel anlarda: uzun jingle + "Tam isabet!"
 *              seslendirmesi + logo animasyonu.
 *
 * KATMAN 2'Yİ NE HAK EDİYOR
 * Günün Turu tam isabeti (günde bir kez olur), düello galibiyeti,
 * arena birinciliği, Zor/Usta seviyesinde tam isabet, seri kilometre
 * taşı. Rutin Antrenman tam isabeti HAK ETMİYOR — gün içinde onlarca
 * kez olabiliyor.
 *
 * ASGARİ ARALIK
 * Üst üste iki özel an (arena birinciliği hemen ardından Zor seviyede
 * tam isabet gibi) bir dakika içinde gelirse ikincisi katman 1'e
 * düşer. Töreni seyrekleştiren şey onu tören yapıyor.
 *
 * KARAR BURADA, ÇALMA BAŞKA YERDE
 * Bu dosya saf: ses çalmaz, zaman okumaz, DOM'a dokunmaz. Testleri
 * bu yüzden mümkün.
 */

export type KutlamaOlayi =
  | 'tamIsabet'
  | 'duelloGalibiyeti'
  | 'arenaBirinciligi'
  | 'seriKilometre';

export interface SesBaglami {
  olay: KutlamaOlayi;
  /** Tek kişilik akışta 'gunun' ya da 'antrenman'; yarışlarda yok. */
  mod?: string;
  /** Seviye anahtarı: 'cocuk' | 'normal' | 'zor' | 'usta'. */
  seviye?: string;
}

/** Tam isabetin kendi başına töreni hak ettiği seviyeler. */
export const BUYUK_SEVIYELER: readonly string[] = ['zor', 'usta'];

/** İki tören arasındaki asgari süre. */
export const BUYUK_ARALIK_MS = 60_000;

/** Olayın niteliği töreni hak ediyor mu? (Aralık burada bakılmaz.) */
export function torenlikMi(b: SesBaglami): boolean {
  if (b.olay === 'duelloGalibiyeti') return true;
  if (b.olay === 'arenaBirinciligi') return true;
  if (b.olay === 'seriKilometre') return true;

  // Geriye tam isabet kalıyor: Günün Turu ya da zor seviyeler.
  if (b.mod === 'gunun') return true;
  return BUYUK_SEVIYELER.includes(b.seviye ?? '');
}

/**
 * Çalınacak katman.
 *
 * `sonBuyukMs` daha önce hiç tören olmadıysa `null`.
 * Dönen 1 ise kısa vuruş, 2 ise tören.
 */
export function sesKatmani(
  b: SesBaglami,
  sonBuyukMs: number | null,
  simdiMs: number,
): 1 | 2 {
  if (!torenlikMi(b)) return 1;
  if (sonBuyukMs !== null && simdiMs - sonBuyukMs < BUYUK_ARALIK_MS) return 1;
  return 2;
}
