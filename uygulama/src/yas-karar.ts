/**
 * Yaş sınırı kararı (kural 6) — iki giriş ekranının ortak, saf kuralı.
 *
 * - 13 altı → hesap açılamaz, misafir oynar
 * - 13–17 → veli onayı beyanı zorunlu
 * - 18+ → doğrudan devam
 *
 * Tam tarih değil yıl soruluyor (veri minimizasyonu); yaş bu yüzden
 * yaklaşık, yıl farkı.
 */

export type YasDurumu =
  | { tur: 'bos' }
  | { tur: 'gecersiz' }
  | { tur: 'kucuk' }
  | { tur: 'veli'; yil: number }
  | { tur: 'yetiskin'; yil: number };

export function yasDurumu(dogumYili: string, buYil = new Date().getFullYear()): YasDurumu {
  if (!dogumYili.trim()) return { tur: 'bos' };
  const yil = parseInt(dogumYili, 10);
  if (isNaN(yil) || yil < 1930 || yil > buYil) return { tur: 'gecersiz' };
  const yas = buYil - yil;
  if (yas < 13) return { tur: 'kucuk' };
  if (yas < 18) return { tur: 'veli', yil };
  return { tur: 'yetiskin', yil };
}
