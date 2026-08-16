import { describe, it, expect } from 'vitest';
import { rastgele, tohumla, karistir, gunlukTohum } from '@zihinturu/cekirdek';

describe('tohumlu rastgelelik', () => {
  it('aynı tohum aynı akışı üretir', () => {
    const a = rastgele(12345);
    const b = rastgele(12345);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('farklı tohum farklı akış üretir', () => {
    expect(rastgele(1)()).not.toEqual(rastgele(2)());
  });

  it('üretilen sayılar 0 ile 1 arasında', () => {
    const r = rastgele(999);
    for (let i = 0; i < 500; i++) {
      const d = r();
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(1);
    }
  });

  it('metin tohumu kararlı', () => {
    expect(tohumla('2026-08-16:sayi:normal')).toBe(tohumla('2026-08-16:sayi:normal'));
    expect(tohumla('a')).not.toBe(tohumla('b'));
  });

  it('günün turu herkeste aynı, ertesi gün farklı', () => {
    expect(gunlukTohum('sayi', 'normal', '2026-08-16'))
      .toBe(gunlukTohum('sayi', 'normal', '2026-08-16'));
    expect(gunlukTohum('sayi', 'normal', '2026-08-16'))
      .not.toBe(gunlukTohum('sayi', 'normal', '2026-08-17'));
  });

  it('karıştırma tekrarlanabilir ve eleman kaybetmez', () => {
    const kaynak = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = karistir(kaynak, rastgele(42));
    const b = karistir(kaynak, rastgele(42));
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(kaynak);
    expect(kaynak).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
