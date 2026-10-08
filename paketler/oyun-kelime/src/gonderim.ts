/**
 * gonderim.ts — Kelime turu gönderiminin denetimi.
 *
 * NEDEN AYRI DOSYA
 * Sayı turundaki `gonderim.ts` ile aynı gerekçe: denetim oyunun
 * kuralıdır (hangi süre geçerli, kelime ne kadar uzun olabilir), bu
 * yüzden yeri Edge Function değil oyun paketi (kural 1). Burada
 * durunca test edilebiliyor.
 *
 * TEHDİT MODELİ
 * İstemci düşmandır. Sunucu kelimeyi zaten sıfırdan doğruluyor; burada
 * hesabın GİRDİLERİ denetleniyor: uydurma bir süre puanı şişirir,
 * geçmiş tarihli bir gönderim lig geçmişini doldurur, dev bir gövde
 * sunucuyu meşgul eder.
 */

import { KELIME_SEVIYELERI } from './mantik.ts';

export type KelimeGonderimHata = string | null;

/**
 * Tarih penceresi — sayı turuyla aynı gerekçe: oyuncunun tarihi yerel,
 * sunucunun UTC. Bir günlük pay bırakılıyor.
 */
export const TARIH_PAYI_GUN = 1;

/** `YYYY-MM-DD` metnini UTC gün numarasına çevirir; geçersizse null. */
export function gunNumarasi(tarih: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return null;
  const t = Date.parse(tarih + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 86400000);
}

/**
 * Bir cevabın olabilecek en uzun hâli: havuzdaki harf sayısı kadar.
 * Daha uzunu zaten doğrulamada elenir ama gövdeyi erkenden sınırlamak
 * sunucuyu boş yere çalıştırmamak için gerekiyor.
 */
export function enFazlaHarf(seviye: string): number {
  return KELIME_SEVIYELERI[seviye]?.harf ?? 10;
}

export interface KelimeGonderimGirdi {
  oyun: string;
  mod: string;
  seviye: string;
  tarih: string;
  tohum: unknown;
  kelime: unknown;
  sureSn: unknown;
  kalanSn: unknown;
  /** Sunucunun o anki zamanı (ms). Test edilebilirlik için dışarıdan. */
  simdiMs: number;
}

export function kelimeGonderimDogrula(g: KelimeGonderimGirdi): KelimeGonderimHata {
  if (g.oyun !== 'kelime') return 'Bilinmeyen oyun.';
  if (g.mod !== 'gunun' && g.mod !== 'antrenman') return 'Geçersiz mod.';

  const ayar = KELIME_SEVIYELERI[g.seviye];
  if (!ayar) return 'Bilinmeyen seviye.';

  if (typeof g.tohum !== 'number' || !Number.isFinite(g.tohum)) return 'Geçersiz tohum.';

  // --- Tarih ---
  const gun = gunNumarasi(g.tarih);
  if (gun === null) return 'Geçersiz tarih.';
  const bugun = Math.floor(g.simdiMs / 86400000);
  if (Math.abs(gun - bugun) > TARIH_PAYI_GUN) return 'Tarih bugüne ait değil.';

  // --- Kelime ---
  // Boş cevap geçerli: oyuncu bulamadan süreyi bitirmiş olabilir.
  if (typeof g.kelime !== 'string') return 'Geçersiz kelime.';
  if (g.kelime.length > enFazlaHarf(g.seviye)) {
    return 'Kelime bu seviyedeki harf sayısından uzun olamaz.';
  }

  // --- Süre ---
  const sure = g.sureSn;
  if (typeof sure !== 'number' || !Number.isFinite(sure) || sure < 0) return 'Geçersiz süre.';
  // Kelime turunda süre seviyeden geliyor; oyuncu seçmiyor. Yine de
  // birebir eşitlik aranmıyor: seviye süresi ileride değişirse
  // oynanmakta olan meşru turlar reddedilmesin.
  if (sure <= 0 || sure > 600) return 'Geçersiz süre.';

  // --- Kalan süre ---
  const kalan = g.kalanSn;
  if (typeof kalan !== 'number' || !Number.isFinite(kalan) || kalan < 0) {
    return 'Geçersiz kalan süre.';
  }
  if (kalan > sure) return 'Kalan süre toplam süreyi aşamaz.';

  return null;
}
