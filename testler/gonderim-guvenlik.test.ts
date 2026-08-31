import { describe, it, expect } from 'vitest';
import { gonderimDogrula, TARIH_PAYI_GUN, type GonderimGirdi } from '@zihinturu/oyun-sayi';

/**
 * SUNUCU GİRDİ DENETİMİ — istemci düşmandır.
 *
 * Sunucu adım zincirini zaten yeniden hesaplıyor, ama hesabın
 * GİRDİLERİ de denetlenmeli:
 *
 *  - uydurma bir SÜRE, Antrenman çarpanını ×4'e kadar büyütür
 *  - geçmiş bir TARİH, lig geçmişini doldurur (30 gün geriye "mükemmel"
 *    turlar yazıp aylık ligi tepeden almak)
 *  - eksik bildirilen JOKER, bedelini kaçırır
 *
 * Bu testler saldırgan gönderimlerin reddedildiğini kanıtlıyor.
 */

const BUGUN_MS = Date.UTC(2026, 7, 30, 12, 0, 0); // 30 Ağustos 2026, öğlen
const GUN_MS = 86400000;

function tarihMetni(gunKaydirma: number): string {
  return new Date(BUGUN_MS + gunKaydirma * GUN_MS).toISOString().slice(0, 10);
}

function gecerli(over: Partial<GonderimGirdi> = {}): GonderimGirdi {
  return {
    oyun: 'sayi',
    mod: 'gunun',
    seviye: 'normal',
    tarih: tarihMetni(0),
    tohum: 12345,
    adimSayisi: 4,
    sureSn: 60,
    kalanSn: 30,
    jokerler: [],
    simdiMs: BUGUN_MS,
    ...over,
  };
}

describe('geçerli gönderim kabul edilir', () => {
  it('bugünün Günün Turu', () => {
    expect(gonderimDogrula(gecerli())).toBeNull();
  });

  it('saat farkı payı içinde (dün/yarın) kabul', () => {
    // Oyuncunun tarihi yerel saate göre; sunucu UTC. Gece oynayan
    // reddedilmemeli.
    expect(gonderimDogrula(gecerli({ tarih: tarihMetni(-TARIH_PAYI_GUN) }))).toBeNull();
    expect(gonderimDogrula(gecerli({ tarih: tarihMetni(TARIH_PAYI_GUN) }))).toBeNull();
  });

  it('antrenman: sunulan süreler', () => {
    for (const s of [15, 30, 60, 90]) {
      expect(gonderimDogrula(gecerli({ mod: 'antrenman', sureSn: s, kalanSn: 0 })), `sure ${s}`).toBeNull();
    }
  });

  it('antrenman: süresiz her seviyede kabul (çarpanı en düşük, istismar edilemez)', () => {
    for (const sv of ['cocuk', 'normal', 'zor', 'usta']) {
      expect(gonderimDogrula(gecerli({ mod: 'antrenman', seviye: sv, sureSn: 0, kalanSn: 0 })), sv).toBeNull();
    }
  });

  it('süre jokeri kalan süreyi uzatabilir', () => {
    // 60 sn tur + iki süre jokeri = 90 sn tavan
    expect(
      gonderimDogrula(gecerli({ mod: 'antrenman', sureSn: 60, kalanSn: 85, jokerler: ['sure', 'sure'] })),
    ).toBeNull();
  });
});

describe('LİG GEÇMİŞİ DOLDURMA engellenir', () => {
  it('geçmiş tarihli gönderim reddedilir', () => {
    // En tehlikelisi bu: 30 gün geriye mükemmel tur yazıp aylık ligi
    // tepeden almak.
    for (const gun of [-2, -7, -30, -365]) {
      expect(gonderimDogrula(gecerli({ tarih: tarihMetni(gun) })), `${gun} gün önce`).toBe(
        'Tarih bugüne ait değil.',
      );
    }
  });

  it('gelecek tarihli gönderim reddedilir', () => {
    for (const gun of [2, 10, 365]) {
      expect(gonderimDogrula(gecerli({ tarih: tarihMetni(gun) })), `${gun} gün sonra`).toBe(
        'Tarih bugüne ait değil.',
      );
    }
  });

  it('bozuk tarih biçimi reddedilir', () => {
    for (const t of ['', '2026-8-30', '30-08-2026', 'bugün', '2026-13-01', "2026-08-30'; drop table"]) {
      expect(gonderimDogrula(gecerli({ tarih: t })), t).not.toBeNull();
    }
  });
});

describe('ÇARPAN ŞİŞİRME engellenir', () => {
  it('antrenmanda listede olmayan süre reddedilir', () => {
    // 1 sn gönderip ×4 çarpanı kapmaya çalışmak
    for (const s of [1, 5, 14, 45, 61, 3600]) {
      expect(gonderimDogrula(gecerli({ mod: 'antrenman', sureSn: s, kalanSn: 0 })), `sure ${s}`).toBe(
        'Geçersiz süre.',
      );
    }
  });

  it('kalan süre toplam süreyi aşamaz', () => {
    // Kalan süre hız primini belirliyor; şişirilirse puan artar.
    expect(gonderimDogrula(gecerli({ sureSn: 60, kalanSn: 61 }))).toBe(
      'Kalan süre toplam süreyi aşamaz.',
    );
    expect(gonderimDogrula(gecerli({ sureSn: 60, kalanSn: 99999 }))).toBe(
      'Kalan süre toplam süreyi aşamaz.',
    );
  });

  it('negatif ve sayı olmayan değerler reddedilir', () => {
    expect(gonderimDogrula(gecerli({ kalanSn: -1 }))).not.toBeNull();
    expect(gonderimDogrula(gecerli({ sureSn: -60 }))).not.toBeNull();
    expect(gonderimDogrula(gecerli({ sureSn: 'altmış' }))).not.toBeNull();
    expect(gonderimDogrula(gecerli({ kalanSn: NaN }))).not.toBeNull();
    expect(gonderimDogrula(gecerli({ tohum: 'abc' }))).not.toBeNull();
    expect(gonderimDogrula(gecerli({ tohum: Infinity }))).not.toBeNull();
  });
});

describe('JOKER denetimi', () => {
  it('hak sayısından fazla joker reddedilir', () => {
    expect(gonderimDogrula(gecerli({ jokerler: ['adim', 'adim', 'adim', 'adim'] }))).toBe(
      'Joker hakkı aşıldı.',
    );
  });

  it('bilinmeyen joker türü reddedilir', () => {
    expect(gonderimDogrula(gecerli({ jokerler: ['hile'] }))).toBe('Bilinmeyen joker.');
    expect(gonderimDogrula(gecerli({ jokerler: [{ tip: 'adim' }] }))).toBe('Bilinmeyen joker.');
  });

  it('dizi olmayan joker alanı reddedilir', () => {
    expect(gonderimDogrula(gecerli({ jokerler: 'adim' }))).toBe('Geçersiz joker listesi.');
    expect(gonderimDogrula(gecerli({ jokerler: null }))).toBe('Geçersiz joker listesi.');
  });
});

describe('temel alanlar', () => {
  it('bilinmeyen oyun, mod ve seviye reddedilir', () => {
    expect(gonderimDogrula(gecerli({ oyun: 'kelime' }))).toBe('Bilinmeyen oyun.');
    expect(gonderimDogrula(gecerli({ mod: 'duello' }))).toBe('Geçersiz mod.');
    expect(gonderimDogrula(gecerli({ seviye: 'tanri' }))).toBe('Bilinmeyen seviye.');
    expect(gonderimDogrula(gecerli({ seviye: '' }))).toBe('Bilinmeyen seviye.');
  });

  it('mümkün olandan fazla adım reddedilir', () => {
    // Normal 5 taş → en çok 5 adım. Dev gövde sunucuyu da meşgul eder.
    expect(gonderimDogrula(gecerli({ seviye: 'normal', adimSayisi: 50 }))).toBe(
      'Adım sayısı bu seviyede mümkün değil.',
    );
    expect(gonderimDogrula(gecerli({ adimSayisi: -1 }))).not.toBeNull();
    expect(gonderimDogrula(gecerli({ adimSayisi: 1.5 }))).not.toBeNull();
  });

  it('adım atmamış oyuncu geçerli (puan 0 alır)', () => {
    expect(gonderimDogrula(gecerli({ adimSayisi: 0 }))).toBeNull();
  });
});
