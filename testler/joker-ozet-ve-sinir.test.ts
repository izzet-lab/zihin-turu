import { describe, it, expect } from 'vitest';
import { JOKER_HAK_SAYISI, ODULLU_EK_JOKER, jokerUstSiniri } from '@zihinturu/oyun-sayi';
import { gonderimDogrula } from '@zihinturu/oyun-sayi';
import { jokerOzeti } from '../uygulama/src/kart';

/*
  İki ayrı ama aynı turda buluşan konu:

  1) Joker satırı okunurluğu — aynı joker dört kez kullanıldığında
     "Süre ekle, Süre ekle, Süre ekle, Süre ekle" yazıyordu.

  2) Joker üst sınırı — istemci ödüllü reklamla dördüncü hakkı
     veriyordu ama sunucu doğrulaması üçten fazlasını reddediyordu.
     Yani reklamı izleyip dört joker kullanan MEŞRU oyuncunun turu
     sunucuda reddediliyordu. Bu testler o iki tarafın ayrışmasını
     bir daha yakalar.
*/

describe('joker özeti', () => {
  it('tek kullanımda sayı yazılmaz', () => {
    expect(jokerOzeti(['sure'])).toBe('Süre ekle');
  });

  it('aynı joker tekrarlanınca sayıyla gösterilir', () => {
    expect(jokerOzeti(['sure', 'sure', 'sure', 'sure'])).toBe('Süre ekle ×4');
  });

  it('farklı jokerler ilk kullanım sırasıyla listelenir', () => {
    expect(jokerOzeti(['yanlis', 'sure', 'sure'])).toBe('Yanlışı sil, Süre ekle ×2');
  });

  it('joker yoksa satır hiç kurulmaz', () => {
    expect(jokerOzeti([])).toBeNull();
    expect(jokerOzeti(undefined)).toBeNull();
  });
});

describe('joker üst sınırı', () => {
  it('antrenmanda ödüllü reklamla bir ek hak vardır', () => {
    expect(jokerUstSiniri('antrenman')).toBe(JOKER_HAK_SAYISI + ODULLU_EK_JOKER);
  });

  it('günün turunda ek hak yoktur — lig adaleti', () => {
    expect(jokerUstSiniri('gunun')).toBe(JOKER_HAK_SAYISI);
  });

  const temel = (ek: Record<string, unknown>) => ({
    oyun: 'sayi',
    mod: 'antrenman',
    seviye: 'normal',
    tarih: '2026-09-05',
    tohum: 12345,
    adimSayisi: 3,
    sureSn: 60,
    kalanSn: 10,
    jokerler: [],
    simdiMs: Date.parse('2026-09-05T12:00:00Z'),
    ...ek,
  });

  it('antrenmanda dört joker KABUL edilir (reklam hakkı)', () => {
    expect(gonderimDogrula(temel({ jokerler: ['sure', 'sure', 'sure', 'sure'] }))).toBeNull();
  });

  it('antrenmanda beş joker reddedilir', () => {
    expect(gonderimDogrula(temel({ jokerler: ['sure', 'sure', 'sure', 'sure', 'sure'] }))).toBe(
      'Joker hakkı aşıldı.',
    );
  });

  it('günün turunda dört joker reddedilir', () => {
    expect(
      gonderimDogrula(temel({ mod: 'gunun', jokerler: ['adim', 'adim', 'adim', 'adim'] })),
    ).toBe('Joker hakkı aşıldı.');
  });
});
