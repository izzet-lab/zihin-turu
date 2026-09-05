import { describe, it, expect } from 'vitest';
import {
  BASLANGIC_ELO,
  DUELLO_TUR_SAYISI,
  BOTA_DUSME_SN,
  ESLESME_TAVAN,
  botaDusulsunMu,
  duelloBaslat,
  duelloIndirge,
  eloGuncelle,
  eslesirMi,
  eslesmeAraligi,
  kazanmaBeklentisi,
  macKazananiBul,
  type DuelloDurum,
  type DuelloOlay,
} from '@zihinturu/cekirdek';

/*
  Düellonun beyni: eşleştirme ve maç akışı.

  Bu testler gerçek bir maç kurmadan, ağ olmadan ve saat beklemeden
  çalışır — akış saf olduğu için. Düellonun kuralları burada yazılı:
  tam isabeti ilk bulan turu kapatır, kimse bulamazsa en yakın kazanır,
  beş turun sonunda skoru yüksek olan maçı alır.
*/

/** Olay dizisini sırayla uygular. */
function oynat(olaylar: DuelloOlay[], baslangic = duelloBaslat()): DuelloDurum {
  return olaylar.reduce(duelloIndirge, baslangic);
}

/** Bir turu kazandırır ve sonraki turu açar. */
function turKazandir(d: DuelloDurum, taraf: 'a' | 'b'): DuelloDurum {
  const kapali = duelloIndirge(d, { t: 'uzaklik', taraf, uzaklik: 0 });
  return kapali.bitti ? kapali : duelloIndirge(kapali, { t: 'turBasla' });
}

describe('ELO', () => {
  it('eşit oyuncuların kazanma beklentisi yarı yarıyadır', () => {
    expect(kazanmaBeklentisi(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it('güçlü oyuncunun beklentisi daha yüksektir', () => {
    expect(kazanmaBeklentisi(1600, 1200)).toBeGreaterThan(0.9);
    expect(kazanmaBeklentisi(1200, 1600)).toBeLessThan(0.1);
  });

  it('biri ne kazanırsa diğeri onu kaybeder — havuza puan basılmaz', () => {
    for (const [a, b] of [
      [1200, 1200],
      [1500, 1100],
      [900, 1800],
    ]) {
      for (const sonuc of ['kazandi', 'kaybetti', 'berabere'] as const) {
        const y = eloGuncelle(a!, b!, sonuc);
        expect(y.a + y.b, `${a}/${b}/${sonuc}`).toBe(a! + b!);
      }
    }
  });

  it('zayıf oyuncu güçlüyü yenince çok kazanır, tersi az', () => {
    const surpriz = eloGuncelle(1000, 1600, 'kazandi').a - 1000;
    const beklenen = eloGuncelle(1600, 1000, 'kazandi').a - 1600;
    expect(surpriz).toBeGreaterThan(beklenen);
    expect(beklenen).toBeGreaterThanOrEqual(0);
  });

  it('eşitler berabere kalınca derece değişmez', () => {
    expect(eloGuncelle(BASLANGIC_ELO, BASLANGIC_ELO, 'berabere')).toEqual({
      a: BASLANGIC_ELO,
      b: BASLANGIC_ELO,
    });
  });
});

describe('eşleştirme kuyruğu', () => {
  it('aralık bekledikçe genişler ama tavanı aşmaz', () => {
    expect(eslesmeAraligi(0)).toBeLessThan(eslesmeAraligi(3));
    expect(eslesmeAraligi(3)).toBeLessThan(eslesmeAraligi(6));
    expect(eslesmeAraligi(9999)).toBe(ESLESME_TAVAN);
  });

  it('başta yalnızca yakın dereceler eşleşir', () => {
    expect(eslesirMi({ elo: 1200, bekleyenSn: 0 }, { elo: 1250, bekleyenSn: 0 })).toBe(true);
    expect(eslesirMi({ elo: 1200, bekleyenSn: 0 }, { elo: 1600, bekleyenSn: 0 })).toBe(false);
  });

  it('uzun bekleyen için ölçüt gevşer', () => {
    const uzak = { elo: 1600, bekleyenSn: 0 };
    expect(eslesirMi({ elo: 1200, bekleyenSn: 0 }, uzak)).toBe(false);
    expect(eslesirMi({ elo: 1200, bekleyenSn: 10 }, uzak)).toBe(true);
  });

  it('sekiz saniyede bota düşülür', () => {
    expect(botaDusulsunMu(BOTA_DUSME_SN - 1)).toBe(false);
    expect(botaDusulsunMu(BOTA_DUSME_SN)).toBe(true);
  });
});

describe('tur akışı', () => {
  it('tam isabet turu ANINDA kapatır ve turu bulana yazar', () => {
    const d = oynat([{ t: 'uzaklik', taraf: 'b', uzaklik: 0 }]);
    expect(d.turAcik).toBe(false);
    expect(d.turKazanani).toBe('b');
    expect(d.skor).toEqual({ a: 0, b: 1 });
  });

  it('tam isabetten sonra rakibin tam isabeti turu değiştirmez', () => {
    const d = oynat([
      { t: 'uzaklik', taraf: 'a', uzaklik: 0 },
      { t: 'uzaklik', taraf: 'b', uzaklik: 0 },
    ]);
    expect(d.turKazanani).toBe('a');
    expect(d.skor).toEqual({ a: 1, b: 0 });
  });

  it('kimse bulamazsa süre sonunda en yakın kazanır', () => {
    const d = oynat([
      { t: 'uzaklik', taraf: 'a', uzaklik: 12 },
      { t: 'uzaklik', taraf: 'b', uzaklik: 3 },
      { t: 'sureDoldu' },
    ]);
    expect(d.turKazanani).toBe('b');
  });

  it('uzaklıklar eşitse tur berabere biter, kimseye puan yazılmaz', () => {
    const d = oynat([
      { t: 'uzaklik', taraf: 'a', uzaklik: 5 },
      { t: 'uzaklik', taraf: 'b', uzaklik: 5 },
      { t: 'sureDoldu' },
    ]);
    expect(d.turKazanani).toBe('berabere');
    expect(d.skor).toEqual({ a: 0, b: 0 });
  });

  it('hiç kimse bir şey bildirmediyse tur berabere biter', () => {
    expect(oynat([{ t: 'sureDoldu' }]).turKazanani).toBe('berabere');
  });

  it('tek taraf bildirdiyse o kazanır', () => {
    const d = oynat([{ t: 'uzaklik', taraf: 'a', uzaklik: 40 }, { t: 'sureDoldu' }]);
    expect(d.turKazanani).toBe('a');
  });

  it('bildirilen uzaklık geriye gitmez — oyuncu uzaklaşsa da en iyisi kalır', () => {
    const d = oynat([
      { t: 'uzaklik', taraf: 'a', uzaklik: 4 },
      { t: 'uzaklik', taraf: 'a', uzaklik: 30 },
      { t: 'uzaklik', taraf: 'b', uzaklik: 10 },
      { t: 'sureDoldu' },
    ]);
    expect(d.uzaklik.a).toBe(4);
    expect(d.turKazanani).toBe('a');
  });

  it('tur kapandıktan sonra gelen geç olaylar durumu değiştirmez', () => {
    const kapali = oynat([{ t: 'uzaklik', taraf: 'a', uzaklik: 0 }]);
    const sonra = duelloIndirge(kapali, { t: 'uzaklik', taraf: 'b', uzaklik: 0 });
    expect(sonra).toEqual(kapali);
  });
});

describe('maç akışı', () => {
  it('beş tur oynanır ve sonunda maç biter', () => {
    let d = duelloBaslat();
    for (let i = 0; i < DUELLO_TUR_SAYISI; i++) {
      expect(d.bitti, `tur ${i + 1} öncesi`).toBe(false);
      d = turKazandir(d, 'a');
    }
    expect(d.bitti).toBe(true);
    expect(d.tur).toBe(DUELLO_TUR_SAYISI);
    expect(d.skor.a).toBe(DUELLO_TUR_SAYISI);
    expect(d.macKazanani).toBe('a');
  });

  it('skoru yüksek olan maçı kazanır', () => {
    let d = duelloBaslat();
    d = turKazandir(d, 'a');
    d = turKazandir(d, 'b');
    d = turKazandir(d, 'a');
    d = turKazandir(d, 'b');
    d = turKazandir(d, 'b');
    expect(d.bitti).toBe(true);
    expect(d.skor).toEqual({ a: 2, b: 3 });
    expect(d.macKazanani).toBe('b');
  });

  it('beraber biten turlar maçı berabere bırakabilir', () => {
    expect(macKazananiBul({ a: 2, b: 2 })).toBe('berabere');
  });

  it('maç bittikten sonra hiçbir olay durumu değiştirmez', () => {
    let d = duelloBaslat();
    for (let i = 0; i < DUELLO_TUR_SAYISI; i++) d = turKazandir(d, 'a');
    for (const olay of [
      { t: 'turBasla' },
      { t: 'uzaklik', taraf: 'b', uzaklik: 0 },
      { t: 'sureDoldu' },
      { t: 'ayrildi', taraf: 'a' },
    ] as DuelloOlay[]) {
      expect(duelloIndirge(d, olay)).toEqual(d);
    }
  });

  it('tur açıkken yeni tur açılmaz', () => {
    const d = duelloBaslat();
    expect(duelloIndirge(d, { t: 'turBasla' })).toEqual(d);
  });
});

describe('bağlantı kopması', () => {
  it('dönmeyen taraf maçı kaybeder, maç düzgün sonlanır', () => {
    const d = oynat([{ t: 'ayrildi', taraf: 'a' }]);
    expect(d.bitti).toBe(true);
    expect(d.macKazanani).toBe('b');
    expect(d.ayrilan).toBe('a');
    expect(d.turAcik).toBe(false);
  });

  it('maç ortasında ayrılmak da maçı bitirir', () => {
    let d = duelloBaslat();
    d = turKazandir(d, 'a');
    d = turKazandir(d, 'a');
    d = duelloIndirge(d, { t: 'ayrildi', taraf: 'a' });
    expect(d.bitti).toBe(true);
    expect(d.macKazanani).toBe('b'); // skor önde olsa da terk eden kaybeder
  });
});

describe('çözüm sızmaz (kural 8)', () => {
  it('maç durumunda uzaklıktan başka oyun verisi taşınmaz', () => {
    const d = oynat([
      { t: 'uzaklik', taraf: 'a', uzaklik: 7 },
      { t: 'uzaklik', taraf: 'b', uzaklik: 2 },
    ]);
    const alanlar = Object.keys(d).sort();
    expect(alanlar).toEqual(
      ['ayrilan', 'bitti', 'macKazanani', 'skor', 'tur', 'turAcik', 'turKazanani', 'uzaklik'].sort(),
    );
    // Uzaklık düz sayıdır; adım, zincir ya da taş taşımaz.
    expect(typeof d.uzaklik.a).toBe('number');
    expect(JSON.stringify(d)).not.toMatch(/adim|zincir|tas|hedef/i);
  });
});
