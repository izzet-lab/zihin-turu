/**
 * lig-genel.test.ts — Genel sıralamanın kuralları.
 *
 * Asıl hesap veritabanında (göç 016): puanı sunucu veriyor. Buradaki
 * değerler oyuncuya NE SÖYLEDİĞİMİZİ belirliyor — yardım sayfasındaki
 * ağırlık tablosu, tablo açıklaması, çifte tur çağrısındaki rakam.
 *
 * İkisi ayrışırsa oyuncuya söylenen hesapla tabloya yazılan hesap
 * farklı olur. Bu test TS tarafını kilitliyor; SQL tarafı değişirse
 * buradaki sayılar da değişmek zorunda.
 */

import { describe, it, expect } from 'vitest';
import {
  GENEL_SEVIYE_AGIRLIK,
  CIFTE_TUR_BONUS_ORANI,
  genelSeviyeAgirligi,
  genelGunlukPuan,
  ikinciTurKazanci,
} from '@tamisabet/cekirdek';
import { sayiTuru } from '@tamisabet/oyun-sayi';

describe('genel sıralama — seviye ağırlıkları', () => {
  it('göçteki değerlerle aynı', () => {
    // sunucu/gocler/016_genel_siralama.sql → lig_seviye_agirligi()
    expect(GENEL_SEVIYE_AGIRLIK).toEqual({
      cocuk: 0.6,
      normal: 1.0,
      zor: 1.4,
      usta: 1.8,
    });
  });

  it('her seviyenin bir ağırlığı var', () => {
    for (const s of sayiTuru.seviyeler) {
      expect(GENEL_SEVIYE_AGIRLIK[s.anahtar], s.anahtar).toBeTypeOf('number');
    }
  });

  it('zorluk arttıkça ağırlık artıyor', () => {
    const sirali = sayiTuru.seviyeler.map((s) => genelSeviyeAgirligi(s.anahtar));
    for (let i = 1; i < sirali.length; i++) {
      expect(sirali[i]!, `${i}. seviye`).toBeGreaterThan(sirali[i - 1]!);
    }
  });

  it('bilinmeyen seviye ağırlıksız — puan kaybolmuyor', () => {
    expect(genelSeviyeAgirligi('bilinmeyen-seviye')).toBe(1.0);
  });
});

describe('genel sıralama — çifte tur bonusu', () => {
  it('bonus oranı %25', () => {
    expect(CIFTE_TUR_BONUS_ORANI).toBe(0.25);
  });

  it('iki oyun da oynandıysa bonus veriliyor', () => {
    // Göçteki kabul testiyle aynı senaryo: Zor 150 (×1,4=210) +
    // Normal kelime 150 (×1=150) → bonus 90, toplam 450.
    const r = genelGunlukPuan(210, 150);
    expect(r.bonus).toBe(90);
    expect(r.toplam).toBe(450);
  });

  it('tek oyun oynandıysa bonus yok — ceza da yok', () => {
    expect(genelGunlukPuan(210, 0)).toEqual({
      sayiPuan: 210,
      kelimePuan: 0,
      bonus: 0,
      toplam: 210,
    });
    expect(genelGunlukPuan(0, 150).toplam).toBe(150);
  });

  it('hiç oynanmadıysa toplam sıfır', () => {
    expect(genelGunlukPuan(0, 0).toplam).toBe(0);
  });
});

describe('ikinci tur kazancı — oyuncuya gösterilen rakam', () => {
  it('eşit güçte ikinci tur toplamı 2,5 katına çıkarıyor', () => {
    // 200 puanı olan biri aynı güçte ikinci turu oynarsa:
    // 200 + 200 + %25 bonus = 500; kazanç 300.
    expect(ikinciTurKazanci(200)).toBe(300);
  });

  it('hiç puanı olmayana rakam verilmiyor', () => {
    expect(ikinciTurKazanci(0)).toBe(0);
  });

  it('kazanç her zaman mevcut puandan büyük — çağrı dürüst', () => {
    for (const p of [10, 57, 150, 210, 999]) {
      expect(ikinciTurKazanci(p), `${p} puan`).toBeGreaterThan(p);
    }
  });
});
