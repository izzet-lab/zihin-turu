import { describe, it, expect } from 'vitest';
import {
  ARENA_KOLTUK,
  ARENA_TUR_SAYISI,
  TUR_SIRA_PUANI,
  arenaBaslat,
  arenaIndirge,
  gerekenBotSayisi,
  podyum,
  turSiralamasi,
  type ArenaDurum,
  type ArenaOlay,
} from '@zihinturu/cekirdek';

/*
  ARENA — 5 kişilik eşzamanlı yarış.

  Sıra yok, herkes aynı anda oynar. İlk tam isabet turu kapatır; kimse
  bulamazsa sıralama hedefe uzaklığa göre yapılır. Beş tur sonunda
  podyum çıkar.

  Düellodan farkı sıralama mantığı: orada kazanan–kaybeden vardı,
  burada beş kişilik bir dizilim. Bu testler o farkı koruyor.
*/

const KOLTUKLAR = ['a1', 'b2', 'c3', 'd4', 'e5'];

function oynat(olaylar: ArenaOlay[], baslangic = arenaBaslat(KOLTUKLAR)): ArenaDurum {
  return olaylar.reduce(arenaIndirge, baslangic);
}

/** Bir turu verilen koltuğa tam isabetle kazandırır, sonrakini açar. */
function turKazandir(d: ArenaDurum, koltuk: string): ArenaDurum {
  const kapali = arenaIndirge(d, { t: 'uzaklik', koltuk, uzaklik: 0 });
  return kapali.bitti ? kapali : arenaIndirge(kapali, { t: 'turBasla' });
}

describe('koltuklar', () => {
  it('arena beş kişiliktir', () => {
    expect(ARENA_KOLTUK).toBe(5);
    expect(Object.keys(arenaBaslat(KOLTUKLAR).puan)).toHaveLength(5);
  });

  it('eksik koltuklar botla dolar', () => {
    expect(gerekenBotSayisi(5)).toBe(0);
    expect(gerekenBotSayisi(2)).toBe(3);
    expect(gerekenBotSayisi(0)).toBe(ARENA_KOLTUK);
  });

  it('beklenenden çok oyuncu gelirse bot istenmez', () => {
    expect(gerekenBotSayisi(9)).toBe(0);
  });
});

describe('tur akışı', () => {
  it('tam isabet turu ANINDA kapatır ve turu bulana yazar', () => {
    const d = oynat([{ t: 'uzaklik', koltuk: 'c3', uzaklik: 0 }]);
    expect(d.turAcik).toBe(false);
    expect(d.turKazanani).toBe('c3');
    expect(d.puan.c3).toBe(TUR_SIRA_PUANI[0]);
  });

  it('tam isabetten sonra gelen bildirimler turu değiştirmez', () => {
    const d = oynat([
      { t: 'uzaklik', koltuk: 'a1', uzaklik: 0 },
      { t: 'uzaklik', koltuk: 'b2', uzaklik: 0 },
    ]);
    expect(d.turKazanani).toBe('a1');
  });

  it('kimse bulamazsa süre sonunda en yakın kazanır', () => {
    const d = oynat([
      { t: 'uzaklik', koltuk: 'a1', uzaklik: 12 },
      { t: 'uzaklik', koltuk: 'b2', uzaklik: 3 },
      { t: 'uzaklik', koltuk: 'c3', uzaklik: 40 },
      { t: 'sureDoldu' },
    ]);
    expect(d.turKazanani).toBe('b2');
  });

  it('puan sıraya göre azalarak dağılır', () => {
    const d = oynat([
      { t: 'uzaklik', koltuk: 'a1', uzaklik: 1 },
      { t: 'uzaklik', koltuk: 'b2', uzaklik: 2 },
      { t: 'uzaklik', koltuk: 'c3', uzaklik: 3 },
      { t: 'uzaklik', koltuk: 'd4', uzaklik: 4 },
      { t: 'uzaklik', koltuk: 'e5', uzaklik: 5 },
      { t: 'sureDoldu' },
    ]);
    expect([d.puan.a1, d.puan.b2, d.puan.c3, d.puan.d4, d.puan.e5]).toEqual([
      ...TUR_SIRA_PUANI,
    ]);
  });

  it('hiç bildirmeyen oyuncu o turdan puan almaz', () => {
    const d = oynat([
      { t: 'uzaklik', koltuk: 'a1', uzaklik: 5 },
      { t: 'sureDoldu' },
    ]);
    expect(d.puan.a1).toBe(TUR_SIRA_PUANI[0]);
    expect(d.puan.b2).toBe(0);
    expect(d.puan.e5).toBe(0);
  });

  it('bildirilen uzaklık geriye gitmez', () => {
    const d = oynat([
      { t: 'uzaklik', koltuk: 'a1', uzaklik: 4 },
      { t: 'uzaklik', koltuk: 'a1', uzaklik: 30 },
    ]);
    expect(d.uzaklik.a1).toBe(4);
  });

  it('kapanmış tura gelen olay durumu değiştirmez', () => {
    const kapali = oynat([{ t: 'uzaklik', koltuk: 'a1', uzaklik: 0 }]);
    expect(arenaIndirge(kapali, { t: 'uzaklik', koltuk: 'b2', uzaklik: 0 })).toEqual(kapali);
  });

  it('tur açıkken yeni tur açılmaz', () => {
    const d = arenaBaslat(KOLTUKLAR);
    expect(arenaIndirge(d, { t: 'turBasla' })).toEqual(d);
  });
});

describe('sıralama', () => {
  it('yaklaşan önde, bildirmeyen en sonda', () => {
    const sira = turSiralamasi({ a1: 5, b2: null, c3: 1 });
    expect(sira).toEqual(['c3', 'a1', 'b2']);
  });

  it('eşit uzaklıkta sıra her makinede aynı', () => {
    const bir = turSiralamasi({ a1: 3, b2: 3, c3: 3 });
    const iki = turSiralamasi({ c3: 3, b2: 3, a1: 3 });
    expect(bir).toEqual(iki);
  });
});

describe('arena sonu', () => {
  it('beş tur sonunda biter', () => {
    let d = arenaBaslat(KOLTUKLAR);
    for (let i = 0; i < ARENA_TUR_SAYISI; i++) {
      expect(d.bitti, `tur ${i + 1}`).toBe(false);
      d = turKazandir(d, 'a1');
    }
    expect(d.bitti).toBe(true);
    expect(d.tur).toBe(ARENA_TUR_SAYISI);
  });

  it('podyum puana göre dizilir ve ilk üçe madalya verir', () => {
    let d = arenaBaslat(KOLTUKLAR);
    d = turKazandir(d, 'a1');
    d = turKazandir(d, 'a1');
    d = turKazandir(d, 'b2');
    d = turKazandir(d, 'b2');
    d = turKazandir(d, 'c3');

    const p = podyum(d);
    expect(p[0]!.koltuk).toBe('a1');
    expect(p[0]!.madalya).toBe('altin');
    expect(p[1]!.koltuk).toBe('b2');
    expect(p[1]!.madalya).toBe('gumus');
    expect(p[2]!.madalya).toBe('bronz');
    expect(p[3]!.madalya).toBeNull();
    expect(p).toHaveLength(5);
  });

  it('eşit puanda hedefe daha çok yaklaşan önde', () => {
    const d: ArenaDurum = {
      ...arenaBaslat(['x', 'y']),
      puan: { x: 6, y: 6 },
      toplamUzaklik: { x: 20, y: 4 },
      bitti: true,
    };
    expect(podyum(d)[0]!.koltuk).toBe('y');
  });

  it('podyum sırası her makinede aynı', () => {
    const d: ArenaDurum = {
      ...arenaBaslat(['x', 'y', 'z']),
      puan: { x: 3, y: 3, z: 3 },
      toplamUzaklik: { x: 5, y: 5, z: 5 },
      bitti: true,
    };
    expect(podyum(d).map((s) => s.koltuk)).toEqual(podyum(d).map((s) => s.koltuk));
  });
});

describe('ayrılma', () => {
  it('bir kişinin ayrılması yarışı bitirmez — düellodan farkı bu', () => {
    const d = oynat([{ t: 'ayrildi', koltuk: 'a1' }]);
    expect(d.bitti).toBe(false);
    expect(d.turAcik).toBe(true);
    expect(d.ayrilanlar).toEqual(['a1']);
  });

  it('ayrılan oyuncu artık bildirim yapamaz', () => {
    let d = oynat([{ t: 'ayrildi', koltuk: 'a1' }]);
    d = arenaIndirge(d, { t: 'uzaklik', koltuk: 'a1', uzaklik: 0 });
    expect(d.turAcik).toBe(true);
    expect(d.turKazanani).toBeNull();
  });

  it('ayrılan podyumda en sonda ve madalyasız', () => {
    let d = arenaBaslat(['x', 'y']);
    d = arenaIndirge(d, { t: 'uzaklik', koltuk: 'x', uzaklik: 9 });
    d = arenaIndirge(d, { t: 'sureDoldu' });
    d = arenaIndirge(d, { t: 'ayrildi', koltuk: 'x' });
    const p = podyum(d);
    expect(p[p.length - 1]!.koltuk).toBe('x');
    expect(p[p.length - 1]!.madalya).toBeNull();
  });

  it('herkes ayrılırsa arena biter', () => {
    let d = arenaBaslat(['x', 'y']);
    d = arenaIndirge(d, { t: 'ayrildi', koltuk: 'x' });
    d = arenaIndirge(d, { t: 'ayrildi', koltuk: 'y' });
    expect(d.bitti).toBe(true);
  });

  it('aynı kişi iki kez ayrılamaz', () => {
    let d = oynat([{ t: 'ayrildi', koltuk: 'a1' }]);
    d = arenaIndirge(d, { t: 'ayrildi', koltuk: 'a1' });
    expect(d.ayrilanlar).toEqual(['a1']);
  });
});

describe('çözüm sızmaz (kural 8)', () => {
  it('arena durumunda uzaklıktan başka oyun verisi taşınmaz', () => {
    const d = oynat([
      { t: 'uzaklik', koltuk: 'a1', uzaklik: 7 },
      { t: 'uzaklik', koltuk: 'b2', uzaklik: 2 },
    ]);
    expect(JSON.stringify(d)).not.toMatch(/adim|zincir|harf|kelime|hedef/i);
  });
});
