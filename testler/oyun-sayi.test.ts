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
  jokerliPuan,
  JOKER_MALIYET,
  antrenmanCarpani,
  seviyeCarpani,
  antrenmanToplamCarpani,
  sonrakiSeviyeAnahtari,
  SEVIYE_ANAHTARLARI,
  SEVIYE_LISTESI,
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
    const j = jokerVer(u, 'adim', { kullanilanAdim: 0 });
    expect(j).not.toBeNull();
    expect(j && j.tip).toBe('adim');
  });

  it('adım joker metni sonraki adımı okunur biçimde verir', () => {
    const u = uretimYap('normal', 999);
    const j = jokerVer(u, 'adim', { kullanilanAdim: 0 });
    expect(j && j.tip === 'adim' && j.metin).toContain('=');
  });

  it('taş joker çözümde geçen, dışarıda tutulmayan bir taşı verir', () => {
    const u = uretimYap('normal', 999);
    const kullanilan = new Set<number>();
    u.cozum.adimlar.forEach((a) => {
      kullanilan.add(a.a);
      kullanilan.add(a.b);
    });
    const j1 = jokerVer(u, 'tas');
    expect(j1).not.toBeNull();
    expect(j1 && j1.tip === 'tas' && kullanilan.has(j1.tas)).toBe(true);
    if (j1 && j1.tip === 'tas') {
      const j2 = jokerVer(u, 'tas', { disHaricTutulan: [j1.tas] });
      // İkinci çağrı, ilkinden farklı bir taş vermeli (varsa) ya da null.
      if (j2) expect(j2.tip === 'tas' && j2.tas).not.toBe(j1.tas);
    }
  });

  it('süre joker 15 saniye ekler', () => {
    const u = uretimYap('normal', 999);
    const j = jokerVer(u, 'sure');
    expect(j).toEqual({ tip: 'sure', ekSaniye: 15 });
  });
});

describe('joker maliyeti ve nihai puan', () => {
  it('her joker türünün bir maliyeti var', () => {
    expect(JOKER_MALIYET.adim).toBe(3);
    expect(JOKER_MALIYET.tas).toBe(2);
    expect(JOKER_MALIYET.sure).toBe(2);
  });

  it('joker maliyeti temel puandan düşülür', () => {
    expect(jokerliPuan(10, ['adim'])).toBe(7);
    expect(jokerliPuan(10, ['adim', 'tas'])).toBe(5);
  });

  it('puan hiçbir zaman 0ın altına düşmez', () => {
    expect(jokerliPuan(2, ['adim', 'tas', 'sure'])).toBe(0);
    expect(jokerliPuan(0, ['adim'])).toBe(0);
  });

  it('joker kullanılmazsa puan değişmez', () => {
    expect(jokerliPuan(10, [])).toBe(10);
  });
});

describe('antrenman risk çarpanı', () => {
  it('kısa süre daha yüksek çarpan getirir', () => {
    expect(antrenmanCarpani(90)).toBe(1);
    expect(antrenmanCarpani(60)).toBe(1.5);
    expect(antrenmanCarpani(30)).toBe(2.5);
    expect(antrenmanCarpani(15)).toBe(4);
  });

  it('tanımsız/süresiz süre için çarpan 1', () => {
    expect(antrenmanCarpani(0)).toBe(1);
    expect(antrenmanCarpani(45)).toBe(1);
  });
});

describe('antrenman seviye çarpanı', () => {
  it('zor seviye daha yüksek çarpan getirir', () => {
    expect(seviyeCarpani('cocuk')).toBe(0.5);
    expect(seviyeCarpani('kolay')).toBe(0.8);
    expect(seviyeCarpani('normal')).toBe(1);
    expect(seviyeCarpani('zor')).toBe(1.5);
    expect(seviyeCarpani('usta')).toBe(2);
  });

  it('bilinmeyen seviye için çarpan 1', () => {
    expect(seviyeCarpani('yok')).toBe(1);
  });
});

describe('antrenman toplam çarpanı — süre × seviye', () => {
  it('Usta + 15sn = ×8 (örnekteki gibi)', () => {
    expect(antrenmanToplamCarpani('usta', 15)).toBe(8);
  });

  it('Normal + 90sn = ×1 (çarpansız temel durum)', () => {
    expect(antrenmanToplamCarpani('normal', 90)).toBe(1);
  });

  it('Isınma + 90sn = ×0.5 (en düşük risk, en düşük çarpan)', () => {
    expect(antrenmanToplamCarpani('cocuk', 90)).toBe(0.5);
  });

  it('Zor + 30sn = ×3.75', () => {
    expect(antrenmanToplamCarpani('zor', 30)).toBe(3.75);
  });
});

describe('seviye ilerlemesi', () => {
  it('Isınma seviyesinin adı doğru', () => {
    const isinma = SEVIYE_LISTESI.find((s) => s.anahtar === 'cocuk');
    expect(isinma?.etiket).toBe('Isınma');
  });

  it('sıradaki seviye kolaydan zora ilerler', () => {
    expect(sonrakiSeviyeAnahtari('cocuk')).toBe('kolay');
    expect(sonrakiSeviyeAnahtari('kolay')).toBe('normal');
    expect(sonrakiSeviyeAnahtari('normal')).toBe('zor');
    expect(sonrakiSeviyeAnahtari('zor')).toBe('usta');
  });

  it('son seviyeden sonrası yok', () => {
    expect(sonrakiSeviyeAnahtari('usta')).toBeNull();
  });

  it('bilinmeyen seviye için null döner', () => {
    expect(sonrakiSeviyeAnahtari('yok')).toBeNull();
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
