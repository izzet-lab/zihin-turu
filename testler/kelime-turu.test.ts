import { describe, it, expect } from 'vitest';
import {
  kelimeTuru,
  kelimeTuruKur,
  kumeSozluk,
  baslangicSozlugu,
  havuzUret,
  havuzdanYazilabilir,
  dogrulaKelime,
  enUzunKelime,
  turkceKucult,
  turkceBuyult,
  EN_KISA_KELIME,
  KELIME_SEVIYELERI,
  KELIME_SEVIYE_LISTESI,
  type KelimeVeri,
} from '@tamisabet/oyun-kelime';

/*
  KELİME TURU

  Faz 6'nın asıl sınavı: platform koduna dokunmadan yeni bir oyun
  takılabiliyor mu? Bu testler oyunun kurallarını koruyor; platformun
  hiç değişmediğini ise ayrı bir test ölçüyor (aşağıda).

  Sözlük henüz geçici. Testler bu yüzden kendi küçük sözlüklerini
  kuruyor: gerçek liste değiştiğinde kurallar değişmemeli.
*/

describe('Türkçe büyük/küçük harf', () => {
  it("'I' harfi Türkçe kurala göre 'ı' olur", () => {
    // toLowerCase() tek başına 'i' verirdi; sözlük araması bozulurdu.
    expect(turkceKucult('IŞIK')).toBe('ışık');
    expect(turkceBuyult('ılık')).toBe('ILIK');
  });

  it("'i' harfi büyürken 'İ' olur", () => {
    expect(turkceBuyult('iğne')).toBe('İĞNE');
  });

  it('sözlük araması büyük/küçük harf farkı gözetmez', () => {
    const s = kumeSozluk(['kalem']);
    expect(s.icerir('KALEM')).toBe(true);
    expect(s.icerir('Kalem')).toBe(true);
    expect(s.icerir(' kalem ')).toBe(true);
  });
});

describe('sözlük', () => {
  it('aynı kelime iki kez sayılmaz', () => {
    expect(kumeSozluk(['kalem', 'KALEM', 'kalem']).adet).toBe(1);
  });

  it('uzunluğa göre listeler sıralı — tohum her makinede aynı turu vermeli', () => {
    const s = kumeSozluk(['masa', 'kapı', 'elma']);
    expect([...s.uzunluktakiler(4)]).toEqual(['elma', 'kapı', 'masa']);
  });

  it('boş girdiler atlanır', () => {
    expect(kumeSozluk(['kalem', '', '   ']).adet).toBe(1);
  });
});

describe('harf havuzu', () => {
  it('aynı tohum aynı havuzu verir', () => {
    const a = havuzUret('normal', 12345, baslangicSozlugu);
    const b = havuzUret('normal', 12345, baslangicSozlugu);
    expect(a.harfler).toEqual(b.harfler);
    expect(a.enUzunUzunluk).toBe(b.enUzunUzunluk);
  });

  it('farklı tohum farklı havuz verir', () => {
    const a = havuzUret('normal', 1, baslangicSozlugu);
    const b = havuzUret('normal', 2, baslangicSozlugu);
    expect(a.harfler.join('')).not.toBe(b.harfler.join(''));
  });

  it('havuz seviyenin istediği harf sayısında', () => {
    for (const [anahtar, ayar] of Object.entries(KELIME_SEVIYELERI)) {
      const v = havuzUret(anahtar, 777, baslangicSozlugu);
      expect(v.harfler.length, anahtar).toBe(ayar.harf);
    }
  });

  it('HER havuzda en az bir kelime bulunur — oynanamaz tur üretilmez', () => {
    // Sayı turundaki "her tur tam çözümlü" güvencesinin karşılığı.
    for (const seviye of Object.keys(KELIME_SEVIYELERI)) {
      for (let tohum = 1; tohum <= 60; tohum++) {
        const v = havuzUret(seviye, tohum, baslangicSozlugu);
        const kelime = enUzunKelime(v.harfler, baslangicSozlugu);
        expect(kelime, `${seviye}/${tohum}`).not.toBeNull();
        expect(v.enUzunUzunluk).toBeGreaterThanOrEqual(EN_KISA_KELIME);
      }
    }
  });

  it('bildirilen en uzun uzunluk gerçekten bulunabiliyor', () => {
    for (let tohum = 1; tohum <= 30; tohum++) {
      const v = havuzUret('zor', tohum, baslangicSozlugu);
      const kelime = enUzunKelime(v.harfler, baslangicSozlugu)!;
      expect(kelime.length).toBe(v.enUzunUzunluk);
    }
  });
});

describe('havuzdan yazılabilirlik', () => {
  it('her harf havuzda olduğu KADAR kullanılabilir', () => {
    expect(havuzdanYazilabilir(['e', 'l', 'm', 'a'], 'elma')).toBe(true);
    // İki 'e' lazım ama havuzda bir tane var.
    expect(havuzdanYazilabilir(['e', 'l', 'm', 'a'], 'eleme')).toBe(false);
  });

  it('havuzda olmayan harf reddedilir', () => {
    expect(havuzdanYazilabilir(['k', 'a', 'l', 'e', 'm'], 'kalemz')).toBe(false);
  });
});

describe('cevap doğrulama', () => {
  const sozluk = kumeSozluk(['kalem', 'araba', 'kale', 'mal']);
  const veri: KelimeVeri = { harfler: ['k', 'a', 'l', 'e', 'm'], enUzunUzunluk: 5 };

  it('en uzunu bulunca uzaklık sıfır', () => {
    const d = dogrulaKelime(veri, 'kalem', sozluk);
    expect(d.gecerli).toBe(true);
    expect(d.uzaklik).toBe(0);
  });

  it('kısa kelimede uzaklık eksik harf sayısı kadar', () => {
    expect(dogrulaKelime(veri, 'kale', sozluk).uzaklik).toBe(1);
    expect(dogrulaKelime(veri, 'mal', sozluk).uzaklik).toBe(2);
  });

  it('sözlükte olmayan kelime reddedilir', () => {
    const d = dogrulaKelime(veri, 'kelam', sozluk);
    expect(d.gecerli).toBe(false);
    expect(d.hata).toContain('sözlükte yok');
  });

  it('havuzda olmayan harfle yazılan kelime reddedilir', () => {
    // Havuzda r ve b yok; kelime sözlükte olsa da yazılamaz.
    const d = dogrulaKelime(veri, 'araba', sozluk);
    expect(d.gecerli).toBe(false);
    expect(d.hata).toContain('harflerle yazılamıyor');
  });

  it('çok kısa kelime reddedilir', () => {
    const d = dogrulaKelime(veri, 'al', sozluk);
    expect(d.gecerli).toBe(false);
    expect(d.hata).toContain(String(EN_KISA_KELIME));
  });

  it('hiç kelime yazılmazsa geçerli ama en uzak', () => {
    const d = dogrulaKelime(veri, '', sozluk);
    expect(d.gecerli).toBe(true);
    expect(d.uzaklik).toBe(5);
  });

  it('büyük harfle yazılan kelime kabul edilir', () => {
    expect(dogrulaKelime(veri, 'KALEM', sozluk).uzaklik).toBe(0);
  });
});

describe('puanlama — sayı turuyla aynı ölçek', () => {
  it('en uzunu bulan tam puan alır, hız primi eklenir', () => {
    const p = kelimeTuru.puanla('normal', { gecerli: true, uzaklik: 0 }, 30, 60, false);
    expect(p.taban).toBe(10);
    expect(p.hiz).toBeGreaterThan(0);
    expect(p.toplam).toBe(p.taban + p.hiz + p.ilk);
  });

  it('yaklaşan daha az alır, uzak kalan hiç alamaz', () => {
    const y = kelimeTuru.puanla('normal', { gecerli: true, uzaklik: 1 }, 0, 60, false);
    const o = kelimeTuru.puanla('normal', { gecerli: true, uzaklik: 2 }, 0, 60, false);
    const u = kelimeTuru.puanla('normal', { gecerli: true, uzaklik: 5 }, 0, 60, false);
    expect(y.toplam).toBeGreaterThan(o.toplam);
    expect(u.toplam).toBe(0);
  });

  it('hız primi yalnızca tam isabette var', () => {
    const p = kelimeTuru.puanla('normal', { gecerli: true, uzaklik: 1 }, 59, 60, false);
    expect(p.hiz).toBe(0);
  });

  it('ilk bulan primi puan alanlara verilir', () => {
    const alan = kelimeTuru.puanla('normal', { gecerli: true, uzaklik: 0 }, 0, 60, true);
    const alamayan = kelimeTuru.puanla('normal', { gecerli: true, uzaklik: 9 }, 0, 60, true);
    expect(alan.ilk).toBe(2);
    expect(alamayan.ilk).toBe(0);
  });
});

describe('TurSaglayici arayüzü', () => {
  it('arayüzün beş üyesini de uyguluyor', () => {
    expect(kelimeTuru.ad).toBe('kelime');
    expect(kelimeTuru.seviyeler).toEqual(KELIME_SEVIYE_LISTESI);
    expect(typeof kelimeTuru.turUret).toBe('function');
    expect(typeof kelimeTuru.dogrula).toBe('function');
    expect(typeof kelimeTuru.puanla).toBe('function');
    expect(typeof kelimeTuru.cozumBul).toBe('function');
  });

  it('tur üretimi deterministik', () => {
    const a = kelimeTuru.turUret('normal', 42);
    const b = kelimeTuru.turUret('normal', 42);
    expect(a).toEqual(b);
    expect(a.oyun).toBe('kelime');
    expect(a.tohum).toBe(42);
  });

  it('doğrulama arayüz biçiminde cevap verir', () => {
    const tur = kelimeTuru.turUret('normal', 99);
    const d = kelimeTuru.dogrula(tur, { icerik: 'zzzzz' });
    expect(d.gecerli).toBe(false);
    expect(typeof d.uzaklik).toBe('number');
  });

  it('çözüm tur bittikten sonra en uzun kelimeyi söyler', () => {
    const tur = kelimeTuru.turUret('zor', 7);
    const c = kelimeTuru.cozumBul(tur);
    expect(c.satirlar.length).toBeGreaterThan(0);
    const veri = tur.veri as KelimeVeri;
    expect(c.satirlar[0]).toContain(String(veri.enUzunUzunluk));
  });

  it('sözlük değişince oyun kuralları değişmez', () => {
    // Aynı kurallar, bambaşka bir sözlükle de çalışmalı.
    const ozel = kelimeTuruKur(kumeSozluk(['araba', 'ara', 'bara', 'raba']));
    const tur = ozel.turUret('cocuk', 5);
    expect((tur.veri as KelimeVeri).harfler.length).toBe(KELIME_SEVIYELERI.cocuk!.harf);
    expect(ozel.dogrula(tur, { icerik: 'kalem' }).gecerli).toBe(false);
  });
});

describe('bot sınırlı süreyle arar', () => {
  it('süre sınırı verilince aramayı keser', () => {
    const tur = kelimeTuru.turUret('usta', 3);
    // 0 ms: ilk denemede kesilmeli, hazır çözüm vermemeli.
    const c = kelimeTuru.cozumBul(tur, 0);
    expect(c.satirlar.length).toBeGreaterThan(0);
  });
});
