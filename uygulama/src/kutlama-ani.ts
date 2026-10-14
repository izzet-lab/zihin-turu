/**
 * kutlama-ani.ts — Tam isabet anını kutlar: ses + logo animasyonu.
 *
 * Kararı `kutlama-sesi-karar.ts` veriyor (saf ve test edilebilir),
 * sesi `ses-kutlama.ts` çalıyor, halkaları `HedefHalkasi` çiziyor.
 * Burası ikisini birleştiren ince katman.
 *
 * SON TÖRENİN ZAMANI BELLEKTE
 * Tarayıcı deposuna yazılmıyor. Asgari aralık bir oturum içindeki
 * RİTİM için var; uygulamayı kapatıp açan oyuncunun töreni hak
 * etmesini engellemek anlamsız olurdu.
 *
 * TİTREŞİM BURADA DEĞİL
 * Çift titreşim zaten tam isabet anında tetikleniyor (bkz. Oyun.tsx).
 * Buraya da konsaydı iki kez titrerdi.
 */

import { sesKatmani, type SesBaglami } from './kutlama-sesi-karar';
import { kisaKutlamaCal, torenCal } from './ses-kutlama';

/** Logo halkası animasyonunu tetikleyen olay. */
export const HALKA_OLAYI = 'tamisabet:halka';

let sonBuyukMs: number | null = null;

/**
 * Kutlamayı başlatır.
 *
 * Katman 1'de yalnızca kısa vuruş çalar. Katman 2'de uzun jingle,
 * seslendirme ve ekranın ortasında genişleyen hedef halkaları gelir.
 */
export function kutlamaAni(baglam: SesBaglami, simdiMs = Date.now()): 1 | 2 {
  const katman = sesKatmani(baglam, sonBuyukMs, simdiMs);

  if (katman === 1) {
    kisaKutlamaCal();
    return 1;
  }

  sonBuyukMs = simdiMs;
  torenCal();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HALKA_OLAYI));
  }
  return 2;
}

/** Yalnızca testler için: son tören zamanını sıfırlar. */
export function kutlamaAniniSifirla(): void {
  sonBuyukMs = null;
}
