import { describe, it, expect } from 'vitest';
import {
  botProfilSec,
  botUret,
  PROFILLER,
  PROFIL_SIRASI,
  KORUMALI_DUELLO_SAYISI,
} from '@zihinturu/oyun-sayi';

/*
  BOTUN GÜCÜ

  Ölçülmüş bir sorun: Isınma seviyesinde ilk düellosunu oynayan oyuncu
  1-4 kaybediyordu. İlk düellosunu kaybeden oyuncu bir daha düello
  açmıyor. Bu testler yeni oyuncunun korunmasını ve kaybetmeye başlayan
  oyuncunun daha da zorlanmamasını koruyor.
*/

describe('yeni oyuncu koruması', () => {
  it('ilk üç düelloda her zaman en zayıf bot gelir', () => {
    for (let mac = 0; mac < KORUMALI_DUELLO_SAYISI; mac++) {
      for (const elo of [800, 1200, 1600, 2000]) {
        expect(
          botProfilSec({ macSayisi: mac, ustUsteKayip: 0, elo }),
          `mac ${mac}, elo ${elo}`,
        ).toBe('cirak');
      }
    }
  });

  it('en zayıf profil gerçekten en zayıf', () => {
    expect(PROFIL_SIRASI[0]).toBe('cirak');
    expect(PROFILLER.cirak.isabet).toBeLessThan(PROFILLER.acemi.isabet);
    expect(PROFILLER.cirak.aramaMs).toBeLessThan(PROFILLER.acemi.aramaMs);
    // Daha geç cevap verir: oyuncunun bulmaya vakti olur.
    expect(PROFILLER.cirak.minGecikme).toBeGreaterThan(PROFILLER.acemi.minGecikme);
    // Yaklaşık cevabı da uzaktır.
    expect(PROFILLER.cirak.yakinlik).toBeGreaterThan(PROFILLER.acemi.yakinlik);
  });

  it('profiller zayıftan güçlüye sıralı', () => {
    for (let i = 1; i < PROFIL_SIRASI.length; i++) {
      const onceki = PROFILLER[PROFIL_SIRASI[i - 1]!];
      const simdiki = PROFILLER[PROFIL_SIRASI[i]!];
      expect(simdiki.isabet, PROFIL_SIRASI[i]).toBeGreaterThan(onceki.isabet);
      expect(simdiki.aramaMs, PROFIL_SIRASI[i]).toBeGreaterThan(onceki.aramaMs);
    }
  });
});

describe('dördüncü maçtan sonra kademe', () => {
  it('derece yükseldikçe bot güçlenir', () => {
    const zayif = botProfilSec({ macSayisi: 10, ustUsteKayip: 0, elo: 900 });
    const orta = botProfilSec({ macSayisi: 10, ustUsteKayip: 0, elo: 1200 });
    const guclu = botProfilSec({ macSayisi: 10, ustUsteKayip: 0, elo: 1500 });
    expect(PROFIL_SIRASI.indexOf(zayif)).toBeLessThan(PROFIL_SIRASI.indexOf(orta));
    expect(PROFIL_SIRASI.indexOf(orta)).toBeLessThan(PROFIL_SIRASI.indexOf(guclu));
  });

  it('koruma bittiğinde artık en zayıf bot verilmez', () => {
    expect(botProfilSec({ macSayisi: KORUMALI_DUELLO_SAYISI, ustUsteKayip: 0, elo: 1200 })).not.toBe(
      'cirak',
    );
  });
});

describe('üst üste kayıp', () => {
  it('iki kayıptan sonra bot bir kademe zayıflar', () => {
    const normal = botProfilSec({ macSayisi: 10, ustUsteKayip: 0, elo: 1500 });
    const kayipli = botProfilSec({ macSayisi: 10, ustUsteKayip: 2, elo: 1500 });
    expect(PROFIL_SIRASI.indexOf(kayipli)).toBe(PROFIL_SIRASI.indexOf(normal) - 1);
  });

  it('tek kayıp kademeyi değiştirmez — kötü bir gün herkesin olur', () => {
    expect(botProfilSec({ macSayisi: 10, ustUsteKayip: 1, elo: 1500 })).toBe(
      botProfilSec({ macSayisi: 10, ustUsteKayip: 0, elo: 1500 }),
    );
  });

  it('en zayıf kademenin altına inilmez', () => {
    expect(botProfilSec({ macSayisi: 10, ustUsteKayip: 9, elo: 800 })).toBe('cirak');
  });
});

describe('bot üretimi', () => {
  it('istenen profille üretilebilir', () => {
    expect(botUret(1800, 'cirak').profil).toBe('cirak');
  });

  it('profil verilmezse dereceye göre seçilir (eski davranış korunur)', () => {
    expect(botUret(800).profil).toBe('acemi');
    expect(botUret(1500).profil).toBe('usta');
  });
});
