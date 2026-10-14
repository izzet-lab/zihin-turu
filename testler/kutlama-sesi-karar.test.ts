import { describe, it, expect } from 'vitest';
import {
  sesKatmani,
  torenlikMi,
  BUYUK_ARALIK_MS,
  type SesBaglami,
} from '../uygulama/src/kutlama-sesi-karar';

/*
  KUTLAMA SESİ KARARI

  Tek katman yapılsaydı ses yıpranır ve oyuncu sesi tamamen kapatırdı.
  Bu testler iki şeyi koruyor: tören hak edilmeden çalmıyor, ve
  hak edildiğinde arka arkaya çalmıyor.
*/

const t0 = 1_000_000;

describe('hangi an töreni hak ediyor', () => {
  it('Günün Turu tam isabeti hak ediyor', () => {
    expect(torenlikMi({ olay: 'tamIsabet', mod: 'gunun', seviye: 'cocuk' })).toBe(true);
  });

  it('Zor ve Usta seviyede tam isabet hak ediyor', () => {
    for (const seviye of ['zor', 'usta']) {
      expect(torenlikMi({ olay: 'tamIsabet', mod: 'antrenman', seviye }), seviye).toBe(true);
    }
  });

  it('rutin antrenman tam isabeti HAK ETMİYOR', () => {
    // Asıl mesele bu: gün içinde onlarca kez olabiliyor.
    for (const seviye of ['cocuk', 'normal']) {
      expect(torenlikMi({ olay: 'tamIsabet', mod: 'antrenman', seviye }), seviye).toBe(false);
    }
  });

  it('düello galibiyeti, arena birinciliği ve seri kilometre taşı hak ediyor', () => {
    const olaylar: SesBaglami['olay'][] = [
      'duelloGalibiyeti',
      'arenaBirinciligi',
      'seriKilometre',
    ];
    for (const olay of olaylar) {
      expect(torenlikMi({ olay }), olay).toBe(true);
    }
  });
});

describe('katman seçimi', () => {
  it('hak etmeyen an her zaman kısa vuruş', () => {
    const b: SesBaglami = { olay: 'tamIsabet', mod: 'antrenman', seviye: 'normal' };
    expect(sesKatmani(b, null, t0)).toBe(1);
  });

  it('ilk tören çalar — daha önce hiç çalmamışsa', () => {
    expect(sesKatmani({ olay: 'duelloGalibiyeti' }, null, t0)).toBe(2);
  });

  it('bir dakika dolmadan ikinci tören çalmaz', () => {
    const b: SesBaglami = { olay: 'arenaBirinciligi' };
    expect(sesKatmani(b, t0, t0 + BUYUK_ARALIK_MS - 1)).toBe(1);
  });

  it('bir dakika dolunca tören yeniden çalar', () => {
    const b: SesBaglami = { olay: 'arenaBirinciligi' };
    expect(sesKatmani(b, t0, t0 + BUYUK_ARALIK_MS)).toBe(2);
  });

  it('aralık dolmadığında sessiz kalınmaz — kısa vuruşa düşülür', () => {
    // Kazanılan an hiçbir ses vermezse oyuncu "çalışmadı" sanır.
    expect(sesKatmani({ olay: 'seriKilometre' }, t0, t0 + 1000)).toBe(1);
  });
});
