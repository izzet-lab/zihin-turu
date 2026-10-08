import { describe, it, expect } from 'vitest';
import { ROZETLER, ROZET_GRUP_ADI, rozetBul } from '../uygulama/src/rozetler';

/*
  ROZET KATALOĞU

  Katalog, veritabanındaki `rozet.rozet_kodu` değerleriyle birebir aynı
  olmak zorunda (göç 013). Kod uyuşmazsa oyuncu kazandığı rozeti
  göremez — Ağustos 2026'dan 9 Ekim'e kadar olan durum tam buydu:
  veritabanı rozet veriyordu, hiçbir ekran göstermiyordu.
*/

/** Göç 013'te verilen kodlar. Buradaki liste elle güncellenir. */
const VERITABANI_KODLARI = [
  'seri_3',
  'seri_7',
  'seri_30',
  'seri_100',
  'tam_ilk',
  'tam_10',
  'tam_100',
  'kelime_ilk',
  'duello_ilk',
  'duello_10',
  'duello_50',
  'arena_podyum',
  'arena_altin',
  'arena_altin_10',
];

describe('rozet kataloğu', () => {
  it('veritabanının verdiği her kodun bir karşılığı var', () => {
    for (const kod of VERITABANI_KODLARI) {
      expect(rozetBul(kod), kod).toBeDefined();
    }
  });

  it('katalogda veritabanının bilmediği rozet yok', () => {
    for (const r of ROZETLER) {
      expect(VERITABANI_KODLARI, r.kod).toContain(r.kod);
    }
  });

  it('kodlar benzersiz', () => {
    const kume = new Set(ROZETLER.map((r) => r.kod));
    expect(kume.size).toBe(ROZETLER.length);
  });

  it('her rozetin adı, simgesi ve nasıl kazanılacağı yazılı', () => {
    for (const r of ROZETLER) {
      expect(r.ad.length, r.kod).toBeGreaterThan(0);
      expect(r.simge.length, r.kod).toBeGreaterThan(0);
      expect(r.nasil.length, r.kod).toBeGreaterThan(5);
      expect(ROZET_GRUP_ADI[r.oyunGrubu], r.kod).toBeDefined();
    }
  });

  it('üç grubun da rozeti var', () => {
    for (const g of ['seri', 'beceri', 'rekabet'] as const) {
      expect(ROZETLER.filter((r) => r.oyunGrubu === g).length, g).toBeGreaterThan(0);
    }
  });
});
