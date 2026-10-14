/**
 * tema.ts — Gündüz / Gece / Sistem.
 *
 * NEDEN ÖZNİTELİK
 * Renkler CSS değişkenlerinde; tema `<html>` üstündeki
 * `data-tema` özniteliğiyle seçiliyor. Üç değer var:
 *
 *   yok           → sistem ayarı geçerli (medya sorgusu çalışır)
 *   "gunduz"      → oyuncu gündüzü seçti, sistem gece olsa bile
 *   "gece"        → oyuncu geceyi seçti, sistem gündüz olsa bile
 *
 * "Sistem" seçildiğinde öznitelik SİLİNİYOR; böylece karar tamamen
 * CSS'e kalıyor ve telefon ayarı değişince uygulama kendiliğinden
 * uyuyor — JavaScript'in dinlemesi gerekmiyor.
 *
 * İLK BOYAMA
 * Tercih `index.html` içindeki küçük bir betikle, React yüklenmeden
 * önce uygulanıyor. Olmasaydı ekran bir an yanlış temada yanıp sönerdi.
 */

export type TemaSecimi = 'sistem' | 'gunduz' | 'gece';

export const TEMA_ANAHTAR = 'tamisabet.tema.v1';

export function temaOku(): TemaSecimi {
  try {
    const t = localStorage.getItem(TEMA_ANAHTAR);
    return t === 'gunduz' || t === 'gece' ? t : 'sistem';
  } catch {
    return 'sistem';
  }
}

/** Seçimi uygular ve saklar. */
export function temaYaz(secim: TemaSecimi): void {
  try {
    if (secim === 'sistem') localStorage.removeItem(TEMA_ANAHTAR);
    else localStorage.setItem(TEMA_ANAHTAR, secim);
  } catch {
    // Depo yazılamıyorsa seçim oturumluk kalır.
  }
  temayiUygula(secim);
}

/** Seçimi `<html>` üstüne yazar. "Sistem" ise özniteliği siler. */
export function temayiUygula(secim: TemaSecimi): void {
  if (typeof document === 'undefined') return;
  const kok = document.documentElement;
  if (secim === 'sistem') kok.removeAttribute('data-tema');
  else kok.setAttribute('data-tema', secim);
}

/**
 * Şu an gerçekte hangi tema görünüyor?
 *
 * Durum çubuğunun rengini ayarlamak için gerekiyor: "sistem" seçiliyse
 * cevabı telefonun ayarı veriyor.
 */
export function etkinTema(): 'gunduz' | 'gece' {
  const secim = temaOku();
  if (secim !== 'sistem') return secim;
  if (typeof window === 'undefined' || !window.matchMedia) return 'gunduz';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'gece' : 'gunduz';
}
