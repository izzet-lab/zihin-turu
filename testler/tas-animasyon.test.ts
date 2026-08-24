import { describe, it, expect } from 'vitest';
import { birlesmeMi, kayma, SURE, GUVENLIK_PAYI } from '../uygulama/src/tasAnimasyon';

/**
 * Birleşme animasyonunun kararı saf bir fonksiyonda duruyor; DOM'a
 * dokunmadan test edilebiliyor.
 *
 * Kritik ayrım: animasyon YALNIZCA gerçek birleşmede oynamalı. Geri
 * alma, sıfırlama ve tur başlangıcı da taş listesini değiştirir ama
 * bunlar birleşme değildir — oynatılırsa taşlar ekranda sebepsiz
 * uçuşur ve oyun bozuk görünür.
 */
describe('birlesmeMi', () => {
  it('iki taş gidip bir taş gelince birleşmedir', () => {
    const s = birlesmeMi([1, 2, 3, 4], [3, 4, 5]);
    expect(s.birlesmeVar).toBe(true);
    expect(s.gidenler.sort()).toEqual([1, 2]);
    expect(s.gelen).toBe(5);
  });

  it('geri alma birleşme değildir (bir gider, iki gelir)', () => {
    const s = birlesmeMi([3, 4, 5], [1, 2, 3, 4]);
    expect(s.birlesmeVar).toBe(false);
    expect(s.gelen).toBeNull();
  });

  it('sıfırlama birleşme değildir', () => {
    const s = birlesmeMi([5, 9], [1, 2, 3, 4]);
    expect(s.birlesmeVar).toBe(false);
  });

  it('tur başlangıcı birleşme değildir (boştan dolu)', () => {
    const s = birlesmeMi([], [1, 2, 3, 4]);
    expect(s.birlesmeVar).toBe(false);
  });

  it('hiçbir şey değişmediyse birleşme yoktur', () => {
    const s = birlesmeMi([1, 2, 3], [1, 2, 3]);
    expect(s.birlesmeVar).toBe(false);
    expect(s.gidenler).toEqual([]);
  });

  it('sıra değişmesi birleşme sayılmaz', () => {
    const s = birlesmeMi([1, 2, 3], [3, 1, 2]);
    expect(s.birlesmeVar).toBe(false);
  });
});

describe('kayma', () => {
  const kutu = (sol: number, ust: number) => ({ sol, ust, genislik: 60, yukseklik: 60 });

  it('merkezden merkeze mesafeyi verir', () => {
    expect(kayma(kutu(0, 0), kutu(100, 50))).toEqual({ x: 100, y: 50 });
  });

  it('geriye doğru kayma negatif olur', () => {
    expect(kayma(kutu(100, 100), kutu(40, 30))).toEqual({ x: -60, y: -70 });
  });

  it('aynı yerdeyse kayma sıfırdır', () => {
    expect(kayma(kutu(20, 20), kutu(20, 20))).toEqual({ x: 0, y: 0 });
  });

  it('farklı boyuttaki kutularda merkezler hesaba katılır', () => {
    const kaynak = { sol: 0, ust: 0, genislik: 100, yukseklik: 100 };
    const hedef = { sol: 0, ust: 0, genislik: 40, yukseklik: 40 };
    expect(kayma(kaynak, hedef)).toEqual({ x: -30, y: -30 });
  });
});

describe('süreler', () => {
  it('temizlik zaman aşımı animasyondan uzun olmalı', () => {
    // Kısa olursa kopya animasyon bitmeden silinir ve görüntü zıplar.
    expect(SURE.suzulme + GUVENLIK_PAYI).toBeGreaterThan(SURE.suzulme);
    expect(GUVENLIK_PAYI).toBeGreaterThanOrEqual(200);
  });

  it('animasyonlar oyunu bekletecek kadar uzun olmamalı', () => {
    // Yarım saniyeyi geçen bir birleşme, hızlı oynayanı yavaşlatır.
    expect(SURE.suzulme).toBeLessThanOrEqual(400);
    expect(SURE.dogus).toBeLessThanOrEqual(400);
  });
});
