import { describe, it, expect, beforeEach } from 'vitest';
import {
  davetGosterilsinMi,
  davetKapat,
  davetKapatildiMi,
  davetHafizasiniSifirla,
  ANTRENMAN_ILK_TUR,
} from '../uygulama/src/uyelik-daveti';
import {
  bekleyenTurYaz,
  bekleyenTurOku,
  bekleyenTurSil,
  type BekleyenTur,
} from '../uygulama/src/depo';

/*
  Misafire gösterilen "üye ol" davetinin ne zaman çıkacağı.

  Eski davet gri bir metin satırıydı ve "puanların kalıcı olur" gibi
  soyut bir vaat söylüyordu; hiç dönüşüm getirmiyordu. Yeni davet
  oyuncunun kendi sayısını taşıyan bir kart. Ama her turda çıkarsa
  bıktırır — bıktırmak hiç göstermemekten kötü. Bu testler o dengeyi
  koruyor.

  Node ortamında `window` yok; kapatma hafızası kendiliğinden belleğe
  düşer (sessionStorage erişilemediğinde olması gereken davranış).
*/

describe('davet ne zaman gösterilir', () => {
  beforeEach(() => davetHafizasiniSifirla());

  it('giriş yapmış kullanıcıya hiçbir yerde gösterilmez', () => {
    for (const yer of ['antrenman-sonuc', 'gunun-sonuc', 'lig', 'kurulum'] as const) {
      expect(
        davetGosterilsinMi({ yer, girisYapildiMi: true, turSayisi: 9, kapatildiMi: false }),
        yer,
      ).toBe(false);
    }
  });

  it('antrenmanda ilk iki turda çıkmaz', () => {
    for (const tur of [1, 2]) {
      expect(
        davetGosterilsinMi({
          yer: 'antrenman-sonuc',
          girisYapildiMi: false,
          turSayisi: tur,
          kapatildiMi: false,
        }),
        `tur ${tur}`,
      ).toBe(false);
    }
  });

  it('antrenmanda 3. turdan itibaren iki turda bir çıkar', () => {
    const cikanlar = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((tur) =>
      davetGosterilsinMi({
        yer: 'antrenman-sonuc',
        girisYapildiMi: false,
        turSayisi: tur,
        kapatildiMi: false,
      }),
    );
    expect(cikanlar).toEqual([3, 5, 7, 9]);
    expect(cikanlar[0]).toBe(ANTRENMAN_ILK_TUR);
  });

  it('günün turunda her seferinde çıkar — tek seferlik fırsat', () => {
    expect(
      davetGosterilsinMi({ yer: 'gunun-sonuc', girisYapildiMi: false, kapatildiMi: false }),
    ).toBe(true);
  });

  it('kapatılınca o oturumda bir daha çıkmaz', () => {
    expect(davetKapatildiMi('antrenman-sonuc')).toBe(false);
    davetKapat('antrenman-sonuc');
    expect(davetKapatildiMi('antrenman-sonuc')).toBe(true);
    expect(
      davetGosterilsinMi({
        yer: 'antrenman-sonuc',
        girisYapildiMi: false,
        turSayisi: 5,
        kapatildiMi: davetKapatildiMi('antrenman-sonuc'),
      }),
    ).toBe(false);
  });

  it('bir yerdeki kapatma diğer yerleri susturmaz', () => {
    davetKapat('lig');
    expect(davetKapatildiMi('lig')).toBe(true);
    expect(davetKapatildiMi('gunun-sonuc')).toBe(false);
  });
});

describe('misafirken oynanan tur girişten sonra gönderilebilsin', () => {
  const ornek: BekleyenTur = {
    oyun: 'sayi',
    mod: 'gunun',
    seviye: 'normal',
    tarih: '2026-09-05',
    tohum: 987654,
    adimlar: [{ a: 6, b: 7, islem: '×', sonuc: 42 }],
    sure_sn: 60,
    jokerler: [],
  };

  beforeEach(() => bekleyenTurSil());

  it('yazılan tur aynen geri okunur', () => {
    bekleyenTurYaz(ornek);
    expect(bekleyenTurOku()).toEqual(ornek);
  });

  it('hiç tur yoksa null döner', () => {
    expect(bekleyenTurOku()).toBeNull();
  });

  it('gönderildikten sonra silinir — iki kez gönderilmez', () => {
    bekleyenTurYaz(ornek);
    bekleyenTurSil();
    expect(bekleyenTurOku()).toBeNull();
  });

  it('tur içeriği değil tohum saklanır (kural 3)', () => {
    bekleyenTurYaz(ornek);
    const okunan = bekleyenTurOku()!;
    expect(okunan.tohum).toBe(ornek.tohum);
    expect(okunan).not.toHaveProperty('hedef');
    expect(okunan).not.toHaveProperty('sayilar');
  });
});
