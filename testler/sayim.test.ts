import { describe, it, expect } from 'vitest';
import {
  yumusat,
  sayimDegeri,
  sayimSuresi,
  SAYIM_EN_KISA,
  SAYIM_EN_UZUN,
} from '../uygulama/src/sayim';

/**
 * Puanın sıfırdan hedefe sayılması. Buradaki mantık saf olduğu için
 * DOM'suz test edilebiliyor.
 *
 * En kritik davranış: sayma BİTTİĞİNDE gerçek puan görünmeli. Yuvarlama
 * yüzünden 149'da kalan bir sayaç, oyuncuya yanlış puan göstermiş olur.
 */
describe('yumusat', () => {
  it('uçlarda sabittir', () => {
    expect(yumusat(0)).toBe(0);
    expect(yumusat(1)).toBe(1);
  });

  it('sınır dışı değerleri kırpar', () => {
    expect(yumusat(-3)).toBe(0);
    expect(yumusat(7)).toBe(1);
  });

  it('hızlı başlar, sona doğru yavaşlar', () => {
    // İlk yarıda alınan yol, ikinci yarıdakinden fazla olmalı.
    const ilkYari = yumusat(0.5) - yumusat(0);
    const ikinciYari = yumusat(1) - yumusat(0.5);
    expect(ilkYari).toBeGreaterThan(ikinciYari);
  });

  it('sürekli artar', () => {
    let onceki = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const d = yumusat(t);
      expect(d).toBeGreaterThanOrEqual(onceki);
      onceki = d;
    }
  });
});

describe('sayimDegeri', () => {
  it('ilerleme bittiğinde tam olarak hedefi verir', () => {
    expect(sayimDegeri(0, 150, 1)).toBe(150);
    expect(sayimDegeri(0, 150, 1.5)).toBe(150);
  });

  it('başlangıçta başlangıç değerini verir', () => {
    expect(sayimDegeri(0, 150, 0)).toBe(0);
    expect(sayimDegeri(0, 150, -1)).toBe(0);
  });

  it('her zaman tam sayı döner', () => {
    for (let t = 0; t <= 1; t += 0.07) {
      expect(Number.isInteger(sayimDegeri(0, 137, t))).toBe(true);
    }
  });

  it('ara değerler aralığın dışına çıkmaz', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const d = sayimDegeri(0, 150, t);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(150);
    }
  });

  it('sıfır puanda da doğru çalışır', () => {
    expect(sayimDegeri(0, 0, 0.5)).toBe(0);
    expect(sayimDegeri(0, 0, 1)).toBe(0);
  });
});

describe('sayimSuresi', () => {
  it('sıfır puan sayılmaz', () => {
    expect(sayimSuresi(0)).toBe(0);
  });

  it('büyük sayı daha uzun sayılır', () => {
    expect(sayimSuresi(150)).toBeGreaterThan(sayimSuresi(8));
  });

  it('üst sınırı aşmaz — oyuncu bekletilmez', () => {
    expect(sayimSuresi(100000)).toBeLessThanOrEqual(SAYIM_EN_UZUN);
  });

  it('alt sınırın altına inmez — sayma göze çarpsın', () => {
    expect(sayimSuresi(1)).toBeGreaterThanOrEqual(SAYIM_EN_KISA);
  });
});
