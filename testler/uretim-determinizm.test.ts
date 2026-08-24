import { describe, it, expect, afterEach } from 'vitest';
import { SEVIYELER, uretimYap } from '@zihinturu/oyun-sayi';

/**
 * Üretim, makine hızından BAĞIMSIZ olmalı.
 *
 * Neden bu test var: tur üretimi içindeki çözücü eskiden süreye göre
 * kesiliyordu (`Date.now`). Yavaş bir makinede arama zaman aşımına
 * uğrayıp adayı reddediyor, hızlı makinede kabul ediyordu. Sonuç: aynı
 * tohum farklı makinede FARKLI tur üretiyordu.
 *
 * Bu, projenin en pahalı hatası olurdu. İstemci ile Edge Function farklı
 * tur üretirse sunucu gönderilen HER turu reddeder — oyun tamamen durur.
 * Üstelik yerelde fark edilmez, çünkü iki taraf da aynı hızlı makinede
 * çalışır.
 *
 * Test, saati üretim sırasında ileri sararak "çok yavaş makine"yi taklit
 * ediyor. Üretim saate bakıyorsa sonuç değişir ve test kırmızı verir.
 */

const GERCEK_NOW = Date.now;

afterEach(() => {
  Date.now = GERCEK_NOW;
});

/** Her çağrıda saati bir saat ileri atan sahte saat. */
function saatiHizlandir(): void {
  let t = GERCEK_NOW();
  Date.now = () => {
    t += 3_600_000;
    return t;
  };
}

const SEVIYE_ADLARI = Object.keys(SEVIYELER);
const TOHUMLAR = [1, 7, 42, 1000, 123456, 999999];

describe('üretim determinizmi — makine hızından bağımsız', () => {
  it('saat ileri sarılsa da aynı tohum aynı turu üretir', () => {
    for (const seviye of SEVIYE_ADLARI) {
      for (const tohum of TOHUMLAR) {
        const normal = uretimYap(seviye, tohum);

        saatiHizlandir();
        const yavasMakine = uretimYap(seviye, tohum);
        Date.now = GERCEK_NOW;

        expect(yavasMakine.hedef, `${seviye}/${tohum} hedef`).toBe(normal.hedef);
        expect(yavasMakine.sayilar, `${seviye}/${tohum} sayılar`).toEqual(normal.sayilar);
        expect(
          yavasMakine.cozum.adimlar,
          `${seviye}/${tohum} çözüm`,
        ).toEqual(normal.cozum.adimlar);
      }
    }
  });

  it('yavaş makinede de üretilen tur tam çözümlü kalır', () => {
    saatiHizlandir();
    for (const seviye of SEVIYE_ADLARI) {
      for (const tohum of TOHUMLAR) {
        expect(uretimYap(seviye, tohum).cozum.fark, `${seviye}/${tohum}`).toBe(0);
      }
    }
  });
});

/**
 * Zorluk eşikleri seviye yükseldikçe SIKILAŞMALI.
 *
 * Gevşerse üst seviye alt seviyeden daha çok alternatif çözüm yoluna
 * izin verir, yani daha kolay olur. 24 Ağustos 2026'da tam bu olmuştu:
 * Zor'un eşiği 8, Normal'in 6'ydı; ölçümde Zor, Normal'den kolay
 * çıkıyordu. Ayrıntılı ölçüm `testler/zorluk-olcum.ts` içinde; bu test
 * yalnızca sıranın bozulmasını anında yakalar.
 */
describe('zorluk eşikleri', () => {
  it('çözüm yoğunluğu eşiği seviye yükseldikçe gevşemez', () => {
    const esikler = SEVIYE_ADLARI.map((a) => ({
      seviye: a,
      esik: SEVIYELER[a]!.yogunlukEsigi,
    })).filter((x) => x.esik > 0); // 0 = filtre yok (Isınma)

    for (let i = 1; i < esikler.length; i++) {
      const onceki = esikler[i - 1]!;
      const simdiki = esikler[i]!;
      expect(
        simdiki.esik,
        `${simdiki.seviye} eşiği ${onceki.seviye}'den gevşek olamaz`,
      ).toBeLessThanOrEqual(onceki.esik);
    }
  });

  it('taş sayısı seviye yükseldikçe azalmaz', () => {
    for (let i = 1; i < SEVIYE_ADLARI.length; i++) {
      const onceki = SEVIYELER[SEVIYE_ADLARI[i - 1]!]!;
      const simdiki = SEVIYELER[SEVIYE_ADLARI[i]!]!;
      expect(simdiki.tas).toBeGreaterThanOrEqual(onceki.tas);
    }
  });
});
