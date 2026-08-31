import { describe, it, expect } from 'vitest';
import type { Tur } from '@zihinturu/cekirdek';
import {
  SEVIYELER,
  turKur,
  sayiTuru,
  turdanUretim,
  uretimYap,
  uygula,
  jokerVer,
  varsayilanBuyukAdet,
  type SayiVeri,
  type Adim,
} from '@zihinturu/oyun-sayi';

/**
 * ÇÖZÜM, EKRANDAKİ TURA AİT OLMALI.
 *
 * Ağustos 2026'da canlıya çıkan hata: tur `buyukAdet` ayarıyla
 * üretiliyordu ama bu ayar turda saklanmıyordu. Çözüm ve joker turu
 * tohumdan yeniden üretirken varsayılanı kullanıyor, dolayısıyla BAŞKA
 * BİR TUR üretiyordu. Oyuncu tahtada 2, 4, 10, 4, 5 görürken joker
 * "50÷25=2" diyordu.
 *
 * Hatanın fark edilmeden geçmesinin sebebi bu testin olmamasıydı:
 * zorluk ölçülüyordu ama çözümün tura ait olduğu hiç doğrulanmıyordu.
 *
 * KRİTİK: testler `buyukAdet`i DEĞİŞTİREREK çalışır. Yalnızca
 * varsayılanla çalışan bir test bu hatayı yakalayamazdı — hata tam da
 * varsayılandan sapıldığında ortaya çıkıyor.
 */

const SEVIYE_ADLARI = Object.keys(SEVIYELER);
const TUR_SAYISI = 500;

/** Bir turun kaç büyük sayı ile üretilebileceği (seviyeye göre). */
function denenecekBuyukAdetler(seviye: string): number[] {
  const S = SEVIYELER[seviye]!;
  if (!S.buyukVar) return [0];
  // 0 = hiç büyük sayı yok; hata tam burada ortaya çıkıyordu.
  return [0, 1, 2, 3];
}

/**
 * Adım zincirini tahtadaki taşlarla oynanabiliyor mu diye yürütür.
 * Her adımın iki girdisi ya raftaki bir taş ya da önceki bir adımın
 * sonucu olmalı; her taş bir kez kullanılır.
 */
function zincirTahtayaUyuyorMu(sayilar: readonly number[], adimlar: readonly Adim[]): boolean {
  const havuz = [...sayilar];
  const tuket = (d: number): boolean => {
    const i = havuz.indexOf(d);
    if (i < 0) return false;
    havuz.splice(i, 1);
    return true;
  };
  for (const ad of adimlar) {
    if (!tuket(ad.a)) return false;
    if (!tuket(ad.b)) return false;
    if (uygula(ad.a, ad.b, ad.islem) !== ad.sonuc) return false;
    havuz.push(ad.sonuc);
  }
  return true;
}

/**
 * Seviye başına 500 tur. `buyukAdet` turdan tura DEĞİŞİR — hata tam da
 * varsayılandan sapıldığında ortaya çıkıyordu, sabit bir değerle
 * çalışan test onu yakalayamazdı.
 *
 * Çözüm ve joker aynı geçişte denetleniyor: ikisi de aynı üretime
 * bakıyor, ayrı ayrı üretmek testi gereksiz yere pahalılaştırırdı.
 */
describe('çözüm ve joker, ekrandaki tura ait', () => {
  for (const seviye of SEVIYE_ADLARI) {
    const adetler = denenecekBuyukAdetler(seviye);

    it(
      `${seviye} — ${TUR_SAYISI} tur, değişen büyük sayı adedi`,
      () => {
        for (let i = 0; i < TUR_SAYISI; i++) {
          const ba = adetler[i % adetler.length]!;
          const nerede = `${seviye}/ba=${ba}/tohum=${500000 + i}`;

          const tur = turKur(seviye, 500000 + i, ba);
          const veri = tur.veri as SayiVeri;
          const u = turdanUretim(tur);

          // 1) Yeniden üretilen tur, turun kendisiyle aynı olmalı.
          expect([...u.sayilar].sort((a, b) => a - b), `${nerede} taşlar`).toEqual(
            [...veri.sayilar].sort((a, b) => a - b),
          );
          expect(u.hedef, `${nerede} hedef`).toBe(veri.hedef);

          // 2) Çözümdeki her adım tahtadaki taşlarla oynanabilmeli.
          expect(
            zincirTahtayaUyuyorMu(veri.sayilar, u.cozum.adimlar),
            `${nerede} çözüm tahtaya uymuyor`,
          ).toBe(true);

          // 3) Çözüm en az bir adım içermeli ve son satırı hedefe eşit olmalı.
          //
          // Sıfır adımlı çözüm, hedefin zaten tahtada olduğu anlamına
          // gelir — yani bulmaca başlamadan çözülmüştür. Üretim böyle
          // turları artık reddediyor.
          expect(
            u.cozum.adimlar.length,
            `${nerede} çözüm boş — hedef tahtada mı?`,
          ).toBeGreaterThan(0);

          const sonAdim = u.cozum.adimlar[u.cozum.adimlar.length - 1]!;
          expect(sonAdim.sonuc, `${nerede} son adım hedef değil`).toBe(veri.hedef);

          // 4) Joker, o turun çözümünün ilk adımını göstermeli.
          const joker = jokerVer(u, 'adim', { kullanilanAdim: 0 });
          expect(joker, `${nerede} joker boş`).not.toBeNull();
          const ilk = u.cozum.adimlar[0]!;
          expect(veri.sayilar, `${nerede} joker sayısı tahtada yok`).toContain(ilk.a);
          expect(veri.sayilar, `${nerede} joker sayısı tahtada yok`).toContain(ilk.b);
          expect(joker!.tip, `${nerede} joker tipi`).toBe('adim');
          const metin = (joker as { tip: 'adim'; metin: string }).metin;
          expect(metin).toContain(String(ilk.a));
          expect(metin).toContain(String(ilk.b));
        }
      },
      180_000,
    );
  }
});

describe('güvenlik ağı — tur yeniden üretilemezse bile çözüm doğru', () => {
  it('bozuk buyukAdet ile bile çözüm ekrandaki tahtaya ait olur', () => {
    // Turun buyukAdet alanı KASITLI olarak yanlış: eski kayıtlar ya da
    // ileride eklenecek bir parametre yüzünden yeniden üretim tutmayabilir.
    // Bu durumda bile oyuncuya ekrandaki tahtanın çözümü gösterilmeli.
    const gercek = uretimYap('normal', 4242, 0);
    const bozukTur: Tur = {
      oyun: 'sayi',
      seviye: 'normal',
      tohum: 4242,
      veri: { hedef: gercek.hedef, sayilar: gercek.sayilar, buyukAdet: 3 } as SayiVeri,
    };

    const u = turdanUretim(bozukTur);
    expect([...u.sayilar].sort((a, b) => a - b)).toEqual([...gercek.sayilar].sort((a, b) => a - b));
    expect(u.hedef).toBe(gercek.hedef);
    expect(zincirTahtayaUyuyorMu(gercek.sayilar, u.cozum.adimlar)).toBe(true);
  });

  it('buyukAdet hiç yoksa seviyenin varsayılanına düşer', () => {
    const ba = varsayilanBuyukAdet('normal');
    const gercek = uretimYap('normal', 909, ba);
    const eskiTur: Tur = {
      oyun: 'sayi',
      seviye: 'normal',
      tohum: 909,
      veri: { hedef: gercek.hedef, sayilar: gercek.sayilar } as SayiVeri,
    };
    const u = turdanUretim(eskiTur);
    expect(u.hedef).toBe(gercek.hedef);
    expect(zincirTahtayaUyuyorMu(gercek.sayilar, u.cozum.adimlar)).toBe(true);
  });
});

describe('turUret — üretilen tur ayarını saklar', () => {
  it('buyukAdet turda saklanır', () => {
    const tur = turKur('normal', 12345, 0);
    expect((tur.veri as SayiVeri).buyukAdet).toBe(0);
  });

  it('saklanan ayarla çözüm tutarlı', () => {
    const tur = turKur('normal', 12345, 0);
    const veri = tur.veri as SayiVeri;
    const cozum = sayiTuru.cozumBul(tur);
    expect(cozum.uzaklik).toBe(0);
    // Çözüm satırlarında tahtada olmayan bir sayı geçmemeli.
    const u = turdanUretim(tur);
    expect(zincirTahtayaUyuyorMu(veri.sayilar, u.cozum.adimlar)).toBe(true);
  });
});


/**
 * HEDEF ASLA TAHTADA OLMAMALI.
 *
 * Isınma'da binde birkaç turda hedef sayı raftaki taşlardan biri
 * oluyordu (örnek: hedef 10, taşlar 2-9-10-5). Bulmaca başlamadan
 * çözülmüş oluyor; oyuncu hiçbir işlem yapmadan tam isabet alıyor ve
 * tur anında kapanıyordu. Isınma yeni oyuncunun gördüğü İLK seviye
 * olduğu için bu kötü bir ilk izlenimdi.
 *
 * Üretim artık böyle turları reddediyor. Bu test kuralı koruyor.
 */
describe('hedef tahtada olamaz', () => {
  for (const seviye of SEVIYE_ADLARI) {
    const adetler = denenecekBuyukAdetler(seviye);
    it(
      `${seviye} — hiçbir turda hedef raftaki taşlardan biri değil`,
      () => {
        for (let i = 0; i < TUR_SAYISI; i++) {
          const ba = adetler[i % adetler.length]!;
          const u = uretimYap(seviye, 900000 + i, ba);
          expect(
            u.sayilar.includes(u.hedef),
            `${seviye}/ba=${ba}/tohum=${900000 + i}: hedef ${u.hedef} tahtada [${u.sayilar}]`,
          ).toBe(false);
          expect(u.cozum.adimlar.length, 'çözüm en az bir adım olmalı').toBeGreaterThan(0);
        }
      },
      180_000,
    );
  }
});
