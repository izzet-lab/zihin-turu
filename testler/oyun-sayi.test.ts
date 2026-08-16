import { describe, it, expect } from 'vitest';
import type { Tur, Cevap } from '@zihinturu/cekirdek';
import {
  sayiTuru,
  gununTuru,
  uretimYap,
  dogrulaZinciri,
  puanlaHesap,
  cozZinciri,
  jokerVer,
  SEVIYE_ANAHTARLARI,
  botUret,
  botPlani,
  type Adim,
  type SayiVeri,
} from '@zihinturu/oyun-sayi';

/** Sayı turu için sahte bir tur kabuğu (hile senaryolarında elle kurmak için). */
function sahteTur(sayilar: number[], hedef: number): Tur {
  return { oyun: 'sayi', seviye: 'normal', tohum: 0, veri: { hedef, sayilar } as SayiVeri };
}
function cevap(adimlar: Adim[]): Cevap {
  return { icerik: adimlar };
}

describe('tohum ve tur üretimi', () => {
  it('aynı tohum aynı turu üretir', () => {
    const a = sayiTuru.turUret('normal', 12345);
    const b = sayiTuru.turUret('normal', 12345);
    const va = a.veri as SayiVeri;
    const vb = b.veri as SayiVeri;
    expect(va.hedef).toBe(vb.hedef);
    expect(va.sayilar).toEqual(vb.sayilar);
  });

  it('günün turu herkeste aynı, ertesi gün farklı', () => {
    const g1 = gununTuru('normal', '2026-08-16').veri as SayiVeri;
    const g2 = gununTuru('normal', '2026-08-16').veri as SayiVeri;
    const g3 = gununTuru('normal', '2026-08-17').veri as SayiVeri;
    expect(g1.hedef).toBe(g2.hedef);
    expect(g1.sayilar).toEqual(g2.sayilar);
    expect(g1.hedef !== g3.hedef || g1.sayilar.join() !== g3.sayilar.join()).toBe(true);
  });

  it('bilinmeyen seviye hata verir', () => {
    expect(() => sayiTuru.turUret('yok', 1)).toThrow();
  });
});

describe('beş seviyede 200 tur tam çözümlü', () => {
  // Faz 1'in ana kabul testi: her seviyede 200 tur üretilip hepsinin
  // tam çözümü olduğu doğrulanır.
  for (const seviye of SEVIYE_ANAHTARLARI) {
    it(`${seviye}: 200/200`, () => {
      let tam = 0;
      for (let i = 0; i < 200; i++) {
        const u = uretimYap(seviye, i * 7919);
        if (u.cozum.fark === 0) tam++;
      }
      expect(tam).toBe(200);
    });
  }
});

describe('doğrulama — geçerli çözüm', () => {
  it('üretilen turun kendi çözümü kabul edilir', () => {
    const u = uretimYap('normal', 999);
    const tur = sayiTuru.turUret('normal', 999);
    const d = sayiTuru.dogrula(tur, cevap(u.cozum.adimlar));
    expect(d.gecerli).toBe(true);
    expect(d.uzaklik).toBe(0);
  });
});

describe('doğrulama — hile senaryoları', () => {
  it('olmayan taş reddedilir', () => {
    const tur = sayiTuru.turUret('normal', 999);
    const d = sayiTuru.dogrula(tur, cevap([{ a: 9999, b: 1, islem: '+', sonuc: 10000 }]));
    expect(d.gecerli).toBe(false);
  });

  it('aynı sonucu iki kez kullanmak reddedilir', () => {
    const tur = sahteTur([5, 5, 3], 20);
    const d = sayiTuru.dogrula(
      tur,
      cevap([
        { a: 5, b: 5, islem: '+', sonuc: 10 },
        { a: 10, b: 10, islem: '+', sonuc: 20 },
      ]),
    );
    expect(d.gecerli).toBe(false);
  });

  it('yalan sonuç bildirimi reddedilir', () => {
    const tur = sahteTur([4, 2], 99);
    const d = sayiTuru.dogrula(tur, cevap([{ a: 4, b: 2, islem: '+', sonuc: 99 }]));
    expect(d.gecerli).toBe(false);
  });

  it('kalanlı bölme reddedilir', () => {
    const tur = sahteTur([7, 2], 3);
    const d = sayiTuru.dogrula(tur, cevap([{ a: 7, b: 2, islem: '÷', sonuc: 3.5 }]));
    expect(d.gecerli).toBe(false);
  });

  it('negatif ara sonuç reddedilir', () => {
    const tur = sahteTur([2, 7], -5);
    const d = sayiTuru.dogrula(tur, cevap([{ a: 2, b: 7, islem: '−', sonuc: -5 }]));
    expect(d.gecerli).toBe(false);
  });

  it('adım sayısı taş sayısını aşamaz', () => {
    const d = dogrulaZinciri([4, 2], [{ a: 4, b: 2, islem: '+', sonuc: 6 }, { a: 6, b: 1, islem: '+', sonuc: 7 }], 7);
    expect(d.gecerli).toBe(false);
  });
});

describe('puanlama', () => {
  it('tam isabet: taban 10 + hız + ilk buzzer primi', () => {
    const p = puanlaHesap('normal', 0, 40, 60, true);
    expect(p.taban).toBe(10);
    expect(p.hiz).toBeGreaterThan(0);
    expect(p.ilk).toBe(2);
    expect(p.toplam).toBe(p.taban + p.hiz + p.ilk);
  });

  it('yaklaşık cevaba hız primi verilmez', () => {
    const p = puanlaHesap('normal', 3, 40, 60, true);
    expect(p.taban).toBe(7);
    expect(p.hiz).toBe(0);
  });
});

describe('çözüm ve joker', () => {
  it('cozumBul tur bitince adım satırları verir', () => {
    const tur = sayiTuru.turUret('normal', 999);
    const c = sayiTuru.cozumBul(tur);
    expect(c.uzaklik).toBe(0);
    expect(c.satirlar.length).toBeGreaterThan(0);
    expect(c.satirlar.every((s) => s.includes('='))).toBe(true);
  });

  it('joker bir çözüm adımını açar', () => {
    const u = uretimYap('normal', 999);
    const j = jokerVer(u, 'adim', 0);
    expect(j).not.toBeNull();
    expect(j && j.tip).toBe('adim');
  });
});

describe('bot', () => {
  it('düşük elo acemi, yüksek elo usta profili', () => {
    expect(botUret(800).profil).toBe('acemi');
    expect(botUret(1500).profil).toBe('usta');
  });

  it('bot kendi çözücüsüyle bir plan üretir', () => {
    const tur = sayiTuru.turUret('normal', 12345);
    const plan = botPlani({ id: 'b', ad: 'Test', bot: true, profil: 'usta' }, tur);
    expect(plan.gecikmeMs).toBeGreaterThan(0);
    // plan.adimlar null olabilir (pas) ya da geçerli bir zincir olabilir.
    expect(plan.adimlar === null || Array.isArray(plan.adimlar)).toBe(true);
  });
});

describe('çözücü doğrudan', () => {
  it('cozZinciri bilinen bir hedefi bulur', () => {
    const c = cozZinciri([2, 3, 4], 24, 500);
    expect(c.fark).toBe(0);
    expect(c.deger).toBe(24);
  });
});
