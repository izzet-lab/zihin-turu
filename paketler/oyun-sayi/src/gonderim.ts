/**
 * gonderim.ts — Sunucuya gelen tur gönderiminin denetimi.
 *
 * NEDEN AYRI DOSYA
 * Bu kurallar Edge Function'da satır arasına yazılıydı ve test
 * edilemiyordu. Denetim oyunun kuralıdır (hangi süre geçerli, kaç joker
 * kullanılabilir), dolayısıyla yeri `paketler/oyun-*` — kural 1.
 *
 * TEHDİT MODELİ
 * İstemci düşmandır. Gönderilen her alan uydurulmuş olabilir. Sunucu
 * zinciri zaten yeniden hesaplıyor; burada hesabın GİRDİLERİ denetleniyor:
 * uydurma bir süre çarpanı büyütür, uydurma bir tarih lig geçmişini
 * doldurur, eksik bildirilen joker bedeli kaçırır.
 */

import { SEVIYELER, ANTRENMAN_SURE_CARPANI, jokerUstSiniri, type JokerTip } from './mantik.ts';

/** Denetim sonucu: geçerliyse hata yok. */
export type GonderimHata = string | null;

/** Bilinen joker türleri. */
const JOKER_TURLERI: readonly string[] = ['adim', 'yanlis', 'sure'];

/** Süre jokerinin eklediği saniye — kalan süre üst sınırı bunu hesaba katar. */
export const SURE_JOKERI_SANIYE = 15;

/**
 * Bir adım zincirinin olabilecek en uzun hâli, taş sayısına göre.
 * Her adım iki taşı birleştirip bir taş bırakır; n taştan en çok n-1
 * adım çıkar. Joker "yanlışı sil" taş eksiltir, zinciri uzatmaz.
 * Sınır, dev bir gövdeyle sunucuyu meşgul etmeyi de engeller.
 */
export function enFazlaAdim(seviye: string): number {
  const S = SEVIYELER[seviye];
  return S ? S.tas : 8;
}

/**
 * Tarih penceresi.
 *
 * Oyuncunun tarihi YEREL saatine göre hesaplanıyor, sunucu ise UTC
 * çalışıyor. Türkiye'de gece 01:00'de yerel tarih, UTC tarihinden bir
 * gün ilerideedir. Bu yüzden bir günlük pay bırakılıyor.
 *
 * Pay olmadan gece oynayanların turu reddedilirdi; pay çok geniş olsa
 * geçmiş günler doldurulabilirdi.
 */
export const TARIH_PAYI_GUN = 1;

/** `YYYY-MM-DD` metnini UTC gün numarasına çevirir; geçersizse null. */
export function gunNumarasi(tarih: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return null;
  const t = Date.parse(tarih + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 86400000);
}

export interface GonderimGirdi {
  oyun: string;
  mod: string;
  seviye: string;
  tarih: string;
  tohum: unknown;
  adimSayisi: number;
  sureSn: unknown;
  kalanSn: unknown;
  jokerler: unknown;
  /** Sunucunun o anki zamanı (ms). Test edilebilirlik için dışarıdan. */
  simdiMs: number;
}

/**
 * Gönderimi denetler. Geçerliyse null, değilse kullanıcıya
 * gösterilebilir bir hata metni döner.
 */
export function gonderimDogrula(g: GonderimGirdi): GonderimHata {
  if (g.oyun !== 'sayi') return 'Bilinmeyen oyun.';
  if (g.mod !== 'gunun' && g.mod !== 'antrenman') return 'Geçersiz mod.';
  if (!SEVIYELER[g.seviye]) return 'Bilinmeyen seviye.';
  if (typeof g.tohum !== 'number' || !Number.isFinite(g.tohum)) return 'Geçersiz tohum.';

  // --- Tarih ---
  const gun = gunNumarasi(g.tarih);
  if (gun === null) return 'Geçersiz tarih.';
  const bugun = Math.floor(g.simdiMs / 86400000);
  if (Math.abs(gun - bugun) > TARIH_PAYI_GUN) {
    // Geçmiş tarihli gönderim lig geçmişini doldurmanın yoludur.
    return 'Tarih bugüne ait değil.';
  }

  // --- Süre ---
  const sure = g.sureSn;
  if (typeof sure !== 'number' || !Number.isFinite(sure) || sure < 0) return 'Geçersiz süre.';
  if (g.mod === 'gunun') {
    // Günün Turu'nda süre seviyeden gelir; oyuncu seçemez.
    // (Seviye süresi arayüz üst verisinde; burada makul bir tavan yeter.)
    if (sure <= 0 || sure > 600) return 'Geçersiz süre.';
  } else {
    // Antrenman: yalnızca sunulan süreler ya da süresiz (0).
    //
    // Süresiz her seviyede kabul ediliyor: çarpanı EN DÜŞÜK (×1), yani
    // süresiz bildirmek oyuncuya avantaj sağlamaz. Hangi seviyenin
    // süresiz oynanabildiği arayüz üst verisinde; burada tekrar
    // yazılsaydı iki liste ayrışabilirdi ve meşru bir gönderim
    // haksız yere reddedilirdi. Reddetmenin bedeli, izin vermenin
    // bedelinden büyük.
    const izinli = Object.keys(ANTRENMAN_SURE_CARPANI).map(Number);
    if (sure !== 0 && !izinli.includes(sure)) return 'Geçersiz süre.';
  }

  // --- Jokerler ---
  if (!Array.isArray(g.jokerler)) return 'Geçersiz joker listesi.';
  // Üst sınır moda göre değişir: Antrenman'da ödüllü reklamla bir ek
  // hak kazanılabilir, Günün Turu'nda kazanılamaz.
  if (g.jokerler.length > jokerUstSiniri(g.mod === 'gunun' ? 'gunun' : 'antrenman')) {
    return 'Joker hakkı aşıldı.';
  }
  for (const j of g.jokerler) {
    if (typeof j !== 'string' || !JOKER_TURLERI.includes(j)) return 'Bilinmeyen joker.';
  }
  const sureJokeri = (g.jokerler as JokerTip[]).filter((j) => j === 'sure').length;

  // --- Kalan süre ---
  const kalan = g.kalanSn;
  if (typeof kalan !== 'number' || !Number.isFinite(kalan) || kalan < 0) return 'Geçersiz kalan süre.';
  // Süre jokeri süreyi uzatır; tavan buna göre.
  const tavan = sure + sureJokeri * SURE_JOKERI_SANIYE;
  if (sure > 0 && kalan > tavan) return 'Kalan süre toplam süreyi aşamaz.';

  // --- Adım sayısı ---
  if (!Number.isInteger(g.adimSayisi) || g.adimSayisi < 0) return 'Geçersiz adım sayısı.';
  if (g.adimSayisi > enFazlaAdim(g.seviye)) return 'Adım sayısı bu seviyede mümkün değil.';

  return null;
}
