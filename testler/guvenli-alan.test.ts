import { describe, it, expect, afterEach } from 'vitest';
import { altGuvenliAlanPx } from '../uygulama/src/reklam';

/**
 * Alt banner, telefonun gezinme çubuğunun ÜSTÜNDE durmalı.
 *
 * Banner'ı native katman yerleştiriyor ve varsayılan olarak ekranın en
 * altına koyuyor — yani gezinme çubuğunun altına. İkisi çakışırsa:
 *
 *   1. Reklamın bir kısmı görünmez olur; gösterildi sayılır ama görülmez.
 *   2. Kullanıcı gezinme çubuğuna basarken reklama değer. AdMob bunu
 *      geçersiz tıklama sayar ve tekrarlanırsa hesap askıya alınır.
 *
 * `altGuvenliAlanPx` bu boşluğu ölçüyor; ölçtüğü değer banner'a kenar
 * boşluğu olarak veriliyor.
 *
 * Testler Node ortamında çalışıyor (projede jsdom yok, bkz. depo.test.ts).
 * `document` yerine ölçüm için gereken en küçük sahte nesne konuyor.
 */

interface SahteBelge {
  eklenenler: unknown[];
  kaldirilanlar: number;
}

/** Ölçüm için gereken en küçük `document` taklidi. */
function sahteBelgeKur(yukseklik: number): SahteBelge {
  const durum: SahteBelge = { eklenenler: [], kaldirilanlar: 0 };
  (globalThis as Record<string, unknown>).document = {
    createElement: () => ({
      style: { cssText: '' },
      getBoundingClientRect: () => ({ height: yukseklik }),
      remove: () => {
        durum.kaldirilanlar++;
        durum.eklenenler.pop();
      },
    }),
    body: {
      appendChild: (c: unknown) => {
        durum.eklenenler.push(c);
      },
    },
  };
  return durum;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).document;
});

describe('altGuvenliAlanPx', () => {
  it('document yoksa 0 döner (sunucu tarafı, çökmez)', () => {
    expect(altGuvenliAlanPx()).toBe(0);
  });

  it('güvenli alan yokken 0 döner', () => {
    sahteBelgeKur(0);
    expect(altGuvenliAlanPx()).toBe(0);
  });

  it('güvenli alan varsa yuvarlanmış yüksekliği döner', () => {
    sahteBelgeKur(33.6);
    expect(altGuvenliAlanPx()).toBe(34);
  });

  it('ölçtüğü öğeyi sayfada bırakmaz', () => {
    const durum = sahteBelgeKur(34);
    altGuvenliAlanPx();
    expect(durum.kaldirilanlar).toBe(1);
    expect(durum.eklenenler).toHaveLength(0);
  });

  it('geçersiz ölçümde 0 döner — banner yine gösterilir', () => {
    sahteBelgeKur(NaN);
    expect(altGuvenliAlanPx()).toBe(0);
  });

  it('negatif ölçümde 0 döner', () => {
    sahteBelgeKur(-5);
    expect(altGuvenliAlanPx()).toBe(0);
  });
});
