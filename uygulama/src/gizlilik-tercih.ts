/**
 * gizlilik-tercih.ts — Gizlilik tercihleri: saf okuma/yazma.
 *
 * NEDEN AYRI DOSYA
 * Bu değerler POLİTİKA, arayüz değil. Yasal metinler ve Play Store
 * Data safety formu bunları anlatıyor; kod onlarla çelişirse beyan
 * yanlış olur. Ekran bileşeninin içinde dururken test edilemiyordu
 * (Capacitor eklentileri Node'da yüklenmiyor).
 *
 * Aynı kalıp bildirim kararında da kullanıldı: karar saf, native
 * katman yalnızca uygular.
 */

export interface Tercihler {
  analytics: boolean;
  crashlytics: boolean;
}

export const GIZLILIK_ANAHTAR = 'zihinturu.gizlilik.v1';

/**
 * Varsayılan tercihler.
 *
 * ANALYTICS VARSAYILAN KAPALI (CLAUDE.md kural 7). Önceden açıktı;
 * kullanıcı hiçbir şey seçmeden davranışı ölçülüyordu. Gizlilik
 * duruşumuz bunun tersi: ölçüm ancak kullanıcı açarsa başlar.
 *
 * Crashlytics açık kalıyor — çökme raporu kişisel davranış ölçümü
 * değil, uygulamanın ayakta kalması için gereken teşhis. Kapatma yolu
 * yine tek dokunuş uzaklıkta.
 */
export const GIZLILIK_VARSAYILAN: Tercihler = { analytics: false, crashlytics: true };

export function tercihleriOku(): Tercihler {
  try {
    const ham = typeof localStorage === 'undefined' ? null : localStorage.getItem(GIZLILIK_ANAHTAR);
    if (!ham) return GIZLILIK_VARSAYILAN;
    return { ...GIZLILIK_VARSAYILAN, ...(JSON.parse(ham) as Partial<Tercihler>) };
  } catch {
    return GIZLILIK_VARSAYILAN;
  }
}

export function tercihleriYaz(t: Tercihler): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(GIZLILIK_ANAHTAR, JSON.stringify(t));
  } catch {
    // Depo yazılamıyorsa tercih oturumluk kalır; oyun etkilenmez.
  }
}
