import { describe, it, expect } from 'vitest';
import {
  enUzunKelimeler,
  kelimeJokerVer,
  kelimeJokerDurumu,
  kelimeNihaiPuan,
  kelimeGonderimDogrula,
  KELIME_JOKER_TURLERI,
  KELIME_TEK_KULLANIMLIK_JOKERLER,
  KELIME_SURE_JOKERI_SANIYE,
  tamSozlukKur,
} from '@tamisabet/oyun-kelime';
import { jokerPuanCarpani, JOKER_HAK_SAYISI } from '@tamisabet/cekirdek';

/**
 * KELİME TURU JOKERLERİ.
 *
 * Sayı turunda takılan oyuncu joker kullanıp kurtulabiliyordu; kelime
 * turunda takılan boş elle çıkıyordu. Aynı platformda bu, kelime
 * turunu "daha zor" değil "daha kötü" yapıyordu.
 *
 * Testin asıl koruduğu kural: JOKER CEVABI VERMEZ (kural 8). Hiçbir
 * joker en uzun kelimenin tamamını döndürmemeli.
 */

// Küçük, tahmin edilebilir bir sözlük: gerçek sözlük elli bin kelime
// ve testin ne doğruladığını okunmaz hale getiriyor.
const sozluk = tamSozlukKur(['kale', 'kale', 'elma', 'ekmek', 'kel', 'ela', 'mal'].join('\n'));

describe('en uzun kelimelerin hepsi bulunur', () => {
  it('aynı uzunluktaki kelimelerin tümünü döndürür', () => {
    // k,a,l,e,m havuzundan "kale" ve "elma" değil; "kale" çıkar.
    const uzunlar = enUzunKelimeler(['k', 'a', 'l', 'e'], sozluk);
    expect(uzunlar.length).toBeGreaterThan(0);
    const enUzun = uzunlar[0]!.length;
    // Hepsi AYNI uzunlukta olmalı — "en uzunlar" demek bu.
    for (const k of uzunlar) expect(k.length).toBe(enUzun);
  });

  it('hiç kelime çıkmayan havuzda boş döner', () => {
    expect(enUzunKelimeler(['z', 'x', 'q'], sozluk)).toEqual([]);
  });
});

describe('joker cevabı vermez', () => {
  const havuz = ['k', 'a', 'l', 'e', 'm'];
  const uzunlar = enUzunKelimeler(havuz, sozluk);

  it('uzunluk jokeri yalnızca SAYI verir, kelimeyi değil', () => {
    const j = kelimeJokerVer('uzunluk', uzunlar, havuz, [], true);
    expect(j).not.toBeNull();
    expect(j!.tip).toBe('uzunluk');
    const metin = JSON.stringify(j);
    for (const k of uzunlar) expect(metin).not.toContain(k);
  });

  it('ilk harf jokeri TEK harf verir', () => {
    const j = kelimeJokerVer('ilkHarf', uzunlar, havuz, [], true);
    if (j && j.tip === 'ilkHarf') {
      expect(j.harf.length).toBe(1);
      expect(j.harf).toBe(uzunlar[0]![0]);
    }
  });

  it('hiçbir joker en uzun kelimenin tamamını döndürmez', () => {
    for (const tip of KELIME_JOKER_TURLERI) {
      const j = kelimeJokerVer(tip, uzunlar, havuz, [], true);
      const metin = JSON.stringify(j ?? {});
      for (const k of uzunlar) {
        expect(metin, `${tip} jokeri "${k}" kelimesini sızdırdı`).not.toContain(k);
      }
    }
  });
});

describe('birden çok en uzun kelime varsa ipucu hepsine uymalı', () => {
  it('ilk harfler farklıysa "İlk harfi aç" kapalı', () => {
    // "kale" ve "elma" aynı uzunlukta ama farklı harfle başlıyor.
    const durum = kelimeJokerDurumu('ilkHarf', ['kale', 'elma'], ['k', 'a', 'l', 'e', 'm'], [], true);
    expect(durum.acik).toBe(false);
    if (!durum.acik) expect(durum.sebep).toContain('farklı harfle');
  });

  it('ilk harfler aynıysa açık', () => {
    const durum = kelimeJokerDurumu('ilkHarf', ['kale', 'kel'], ['k', 'a', 'l', 'e'], [], true);
    expect(durum.acik).toBe(true);
  });

  it('fazla harf, en uzun kelimelerin HİÇBİRİNDE gerekmeyen harf olmalı', () => {
    const havuz = ['k', 'a', 'l', 'e', 'z'];
    const j = kelimeJokerVer('fazlaHarf', ['kale'], havuz, [], true);
    expect(j).not.toBeNull();
    if (j && j.tip === 'fazlaHarf') {
      expect(j.harf).toBe('z');
      expect(havuz[j.indeks]).toBe('z');
    }
  });

  it('bütün harfler kullanılıyorsa "Fazla harfi sil" kapalı ve sebebi yazar', () => {
    const durum = kelimeJokerDurumu('fazlaHarf', ['kale'], ['k', 'a', 'l', 'e'], [], true);
    expect(durum.acik).toBe(false);
    if (!durum.acik) expect(durum.sebep).toContain('kullanılıyor');
  });

  it('fazladan KOPYA harf de silinebilir', () => {
    // Havuzda iki "a" var, en uzun kelime tek "a" istiyor.
    const havuz = ['k', 'a', 'l', 'e', 'a'];
    const j = kelimeJokerVer('fazlaHarf', ['kale'], havuz, [], true);
    expect(j).not.toBeNull();
    if (j && j.tip === 'fazlaHarf') expect(j.harf).toBe('a');
  });
});

describe('süre jokeri', () => {
  it('süreli modda 15 saniye ekler', () => {
    const j = kelimeJokerVer('sure', ['kale'], ['k', 'a', 'l', 'e'], [], true);
    expect(j).toEqual({ tip: 'sure', ekSaniye: KELIME_SURE_JOKERI_SANIYE });
  });

  it('süresiz modda kapalı', () => {
    const durum = kelimeJokerDurumu('sure', ['kale'], ['k', 'a', 'l', 'e'], [], false);
    expect(durum.acik).toBe(false);
  });
});

describe('puan bedeli sayı turuyla aynı', () => {
  const temel = { taban: 10, hiz: 0, ilk: 0, toplam: 10 };

  it('her joker puanın %20sini götürür, çarpımsal', () => {
    expect(kelimeNihaiPuan(temel, 'gunun', 0)).toBe(100);
    expect(kelimeNihaiPuan(temel, 'gunun', 1)).toBe(Math.round(100 * jokerPuanCarpani(1)));
    expect(kelimeNihaiPuan(temel, 'gunun', 3)).toBe(Math.round(100 * jokerPuanCarpani(3)));
  });

  it('joker sayısı verilmezse puan değişmez — eski çağrılar kırılmaz', () => {
    expect(kelimeNihaiPuan(temel, 'gunun')).toBe(100);
  });

  it('hak sayısı kadar joker bile puanı sıfırlamaz', () => {
    expect(kelimeNihaiPuan(temel, 'gunun', JOKER_HAK_SAYISI)).toBeGreaterThan(0);
  });
});

describe('sunucu doğrulaması jokerleri denetler', () => {
  const temelGirdi = {
    oyun: 'kelime',
    mod: 'gunun',
    seviye: 'normal',
    tarih: new Date().toISOString().slice(0, 10),
    tohum: 12345,
    kelime: 'kale',
    sureSn: 60,
    kalanSn: 30,
    simdiMs: Date.now(),
  };

  it('joker gönderilmemesi geçerli — eski istemciler çalışmaya devam eder', () => {
    expect(kelimeGonderimDogrula(temelGirdi)).toBeNull();
  });

  it('bilinmeyen joker reddedilir', () => {
    const h = kelimeGonderimDogrula({ ...temelGirdi, jokerler: ['cevabiSoyle'] });
    expect(h).toBe('Bilinmeyen joker.');
  });

  it('hak sayısından fazlası reddedilir', () => {
    const cok = Array(JOKER_HAK_SAYISI + 2).fill('uzunluk');
    expect(kelimeGonderimDogrula({ ...temelGirdi, jokerler: cok })).toBe('Joker hakkı aşıldı.');
  });

  it("Günün Turu'nda 'İlk harfi aç' iki kez kullanılamaz", () => {
    const h = kelimeGonderimDogrula({ ...temelGirdi, jokerler: ['ilkHarf', 'ilkHarf'] });
    expect(h).not.toBeNull();
    expect(h).toContain('en fazla 1 kez');
  });

  it("Antrenman'da aynı joker tekrar kullanılabilir", () => {
    const h = kelimeGonderimDogrula({
      ...temelGirdi,
      mod: 'antrenman',
      jokerler: ['ilkHarf', 'ilkHarf'],
    });
    expect(h).toBeNull();
  });

  it('süre jokeri kalan süre tavanını yükseltir', () => {
    // Süre jokeri olmadan 70 > 60 reddedilmeli.
    expect(kelimeGonderimDogrula({ ...temelGirdi, kalanSn: 70 })).toBe(
      'Kalan süre toplam süreyi aşamaz.',
    );
    // Süre jokeriyle aynı değer kabul edilmeli.
    expect(
      kelimeGonderimDogrula({ ...temelGirdi, kalanSn: 70, jokerler: ['sure'] }),
    ).toBeNull();
  });
});

describe('tek kullanımlık joker listesi', () => {
  it('yalnızca cevabı açmaya yaklaşan joker kısıtlı', () => {
    expect(KELIME_TEK_KULLANIMLIK_JOKERLER).toEqual(['ilkHarf']);
  });
});
