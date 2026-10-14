import { describe, it, expect, beforeEach } from 'vitest';
import { kutlamaAni, kutlamaAniniSifirla } from '../uygulama/src/kutlama-ani';

/*
  TÖRENİN RİTMİ

  `kutlama-sesi-karar.ts` tek bir anın katmanını hesaplıyor; burada
  sınanan şey arka arkaya gelen anlarda son törenin HATIRLANMASI.
  Hatırlanmazsa asgari aralık hiç işlemez.
*/

describe('kutlama anı', () => {
  beforeEach(() => kutlamaAniniSifirla());

  it('ilk özel an tören, hemen ardından geleni kısa vuruş', () => {
    const t0 = 5_000_000;
    expect(kutlamaAni({ olay: 'duelloGalibiyeti' }, t0)).toBe(2);
    expect(kutlamaAni({ olay: 'arenaBirinciligi' }, t0 + 5_000)).toBe(1);
  });

  it('bir dakika sonra tören yeniden hak edilir', () => {
    const t0 = 5_000_000;
    expect(kutlamaAni({ olay: 'duelloGalibiyeti' }, t0)).toBe(2);
    expect(kutlamaAni({ olay: 'duelloGalibiyeti' }, t0 + 60_000)).toBe(2);
  });

  it('kısa vuruşlar aralığı tüketmez', () => {
    // Rutin antrenman isabetleri tören sayılmadığı için sayaca
    // dokunmamalı; dokunsaydı araya giren bir antrenman turu gerçek
    // töreni erteleyebilirdi.
    const t0 = 5_000_000;
    expect(kutlamaAni({ olay: 'tamIsabet', mod: 'antrenman', seviye: 'normal' }, t0)).toBe(1);
    expect(kutlamaAni({ olay: 'tamIsabet', mod: 'gunun', seviye: 'cocuk' }, t0 + 1_000)).toBe(2);
  });
});
