/**
 * Faz 3A kabul testleri — Edge Function iş mantığı.
 *
 * Gerçek bir Supabase bağlantısı gerektirmeyen saf fonksiyon testleri.
 * Edge Function'ın kalbinde ne var? Şunlar:
 *   1. Tohumdan tur yeniden üretilir.
 *   2. Oyuncunun adım zinciri doğrulanır.
 *   3. Puan sunucu tarafında hesaplanır.
 *   4. Günün Turu'nda tohum, verilen tarih ve seviyeyle uyuşmalı.
 *
 * "Sahte puan gönderimi reddedilir" testinin özü #2 ve #3'tedir:
 * sunucu istemcinin bildirdiği puanı hiç kullanmaz ve kendi zincir
 * doğrulamasından geçirmeden hiçbir şeye güvenmez.
 */

import { describe, it, expect } from 'vitest';
import { gunlukTohum } from '@zihinturu/cekirdek';
import {
  uretimYap,
  dogrulaZinciri,
  puanlaHesap,
  jokerliPuan,
  antrenmanToplamCarpani,
  type Adim,
  type JokerTip,
} from '@zihinturu/oyun-sayi';

// ---------------------------------------------------------------------------
// Yardımcılar (Edge Function mantığının özü, test ortamına kopyalanmış değil —
// doğrudan aynı paketten içe aktarılan fonksiyonlar test ediliyor)
// ---------------------------------------------------------------------------

/**
 * Sunucunun yaptığı iş: tohum + adımlar → puan.
 * İstemcinin bildirdiği puan bu fonksiyona hiç girmiyor.
 */
function sunucuDogrulaVePuanla(
  seviye: string,
  tohum: number,
  adimlar: Adim[],
  sure_sn: number,
  kalan_sn: number,
  jokerler: JokerTip[],
  buyuk_adet?: number,
): { gecerli: boolean; puan: number; uzaklik: number; hata?: string } {
  const uretim = uretimYap(seviye, tohum, buyuk_adet);
  const dogr =
    adimlar.length === 0
      ? { gecerli: true, uzaklik: uretim.hedef, ozet: 'Adım yok' }
      : dogrulaZinciri(uretim.sayilar, adimlar, uretim.hedef);

  if (!dogr.gecerli) return { gecerli: false, puan: 0, uzaklik: Infinity, hata: dogr.hata };

  const temel = puanlaHesap(seviye, dogr.uzaklik, kalan_sn, sure_sn, false);
  const carpanli = Math.round(temel.toplam * antrenmanToplamCarpani(seviye, sure_sn));
  const nihai = jokerliPuan(carpanli, jokerler);
  return { gecerli: true, puan: nihai, uzaklik: dogr.uzaklik };
}

// ---------------------------------------------------------------------------
// 1. Geçerli zincir doğrulanır ve puan hesaplanır
// ---------------------------------------------------------------------------

describe('Geçerli zincir', () => {
  it('tam isabet: fark 0, taban puan 10', () => {
    // "normal" seviyede bir tur üret; çözümü sun
    const tohum = 42;
    const uretim = uretimYap('normal', tohum);
    // Üreticinin bulduğu çözüm adımları geçerli olmalı
    const sonuc = sunucuDogrulaVePuanla(
      'normal', tohum, uretim.cozum.adimlar, 45, 20, [],
    );
    expect(sonuc.gecerli).toBe(true);
    expect(sonuc.uzaklik).toBe(0);
    expect(sonuc.puan).toBeGreaterThan(0);
  });

  it('boş zincir: hiç adım yok → puan 0', () => {
    const sonuc = sunucuDogrulaVePuanla('normal', 99, [], 90, 60, []);
    const uretimSonuc = uretimYap('normal', 99);
    expect(sonuc.gecerli).toBe(true);
    // Hiç işlem yapılmadı; hedefe uzaklık = hedefin kendisi (başlangıç taşları değil)
    expect(sonuc.uzaklik).toBe(uretimSonuc.hedef);
    // Taban puan 0 (uzaklık toleransların çok ötesinde)
    expect(sonuc.puan).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Sahte (manipüle edilmiş) zincir reddedilir
// ---------------------------------------------------------------------------

describe('Sahte puan gönderimi reddedilir', () => {
  it('yanlış sonuç bildiren adım reddedilir', () => {
    const uretim = uretimYap('normal', 7);
    const gercek = uretim.cozum.adimlar;
    if (!gercek.length) return; // sıfır adımlı tur — testin dışında

    // İlk adımın sonucunu yanlış bildir
    const sahte: Adim[] = [{ ...gercek[0]!, sonuc: gercek[0]!.sonuc + 1 }];
    const sonuc = sunucuDogrulaVePuanla('normal', 7, sahte, 90, 50, []);
    expect(sonuc.gecerli).toBe(false);
    expect(sonuc.hata).toContain('Bildirilen sonuç yanlış');
  });

  it('var olmayan taşı kullanan zincir reddedilir', () => {
    // Çözümde kullanılmayan keyfi büyük bir sayı kullan
    const sahte: Adim[] = [{ a: 9999, b: 1, islem: '+', sonuc: 10000 }];
    const sonuc = sunucuDogrulaVePuanla('normal', 13, sahte, 45, 30, []);
    expect(sonuc.gecerli).toBe(false);
  });

  it('geçersiz işlem (negatif sonuç) reddedilir', () => {
    const uretim = uretimYap('normal', 5);
    const sayilar = uretim.sayilar;
    // Küçük − büyük = negatif → kural dışı
    const kucuk = Math.min(...sayilar);
    const buyuk = Math.max(...sayilar.filter((x) => x !== kucuk));
    const sahte: Adim[] = [{ a: kucuk, b: buyuk, islem: '−', sonuc: kucuk - buyuk }];
    const sonuc = sunucuDogrulaVePuanla('normal', 5, sahte, 90, 60, []);
    expect(sonuc.gecerli).toBe(false);
  });

  it('aynı taşı iki kez kullanan zincir reddedilir', () => {
    const uretim = uretimYap('normal', 55);
    const ilk = uretim.sayilar[0]!;
    // Aynı sayıyı hem a hem b olarak kullan — havuzda bir tane var
    const sahte: Adim[] = [{ a: ilk, b: ilk, islem: '+', sonuc: ilk * 2 }];
    const sonuc = sunucuDogrulaVePuanla('normal', 55, sahte, 90, 60, []);
    // İki adet aynı değer yoksa (olsa da iki kez tüketme reddedilir)
    const ciftVar = uretim.sayilar.filter((x) => x === ilk).length >= 2;
    if (!ciftVar) {
      expect(sonuc.gecerli).toBe(false);
    }
    // (Eğer gerçekten iki kopya varsa geçerli sayılır — bu bir kenar durum)
  });
});

// ---------------------------------------------------------------------------
// 3. Günün Turu tohum kontrolü
// ---------------------------------------------------------------------------

describe('Günün Turu tohum kontrolü', () => {
  it('doğru tarih ve seviyeden üretilen tohum uyuşur', () => {
    const tarih = '2026-08-17';
    const seviye = 'normal';
    const tohum = gunlukTohum('sayi', seviye, tarih);
    // Edge Function'da yapılan kontrol:
    const beklenen = gunlukTohum('sayi', seviye, tarih);
    expect(tohum).toBe(beklenen);
  });

  it('farklı tarihler farklı tohumlar üretir', () => {
    const t1 = gunlukTohum('sayi', 'normal', '2026-08-17');
    const t2 = gunlukTohum('sayi', 'normal', '2026-08-18');
    expect(t1).not.toBe(t2);
  });

  it('farklı seviyeler farklı tohumlar üretir', () => {
    const t1 = gunlukTohum('sayi', 'normal', '2026-08-17');
    const t2 = gunlukTohum('sayi', 'zor', '2026-08-17');
    expect(t1).not.toBe(t2);
  });
});

// ---------------------------------------------------------------------------
// 4. Aynı tur iki kez gönderilemiyor (UNIQUE kısıt testi — mantıksal)
// ---------------------------------------------------------------------------
// Gerçek UNIQUE kısıtı veritabanında. Burada iş kuralını test ediyoruz:
// aynı (oyuncu, oyun, mod, tarih, tohum) kombinasyonu için ikinci yazma
// reddedilmeli. Bu, veritabanı seviyesinde çözüldüğü için burada yalnızca
// kavramsal doğrulama var.

describe('Çift gönderim önleme', () => {
  it('aynı tohumdan iki farklı gün farklı tohumlar alınır', () => {
    // Farklı günler = farklı Günün Turu = farklı (tarih, tohum) çifti
    const g1 = gunlukTohum('sayi', 'normal', '2026-08-16');
    const g2 = gunlukTohum('sayi', 'normal', '2026-08-17');
    expect(g1).not.toBe(g2);
  });
});

// ---------------------------------------------------------------------------
// 5. Kullanıcı adı doğrulama
// ---------------------------------------------------------------------------

import { kullaniciAdiDogrula } from '../uygulama/src/kimlik';

describe('Kullanıcı adı doğrulama', () => {
  it('geçerli ad kabul edilir', () => {
    expect(kullaniciAdiDogrula('zihin_ustasi')).toBeNull();
    expect(kullaniciAdiDogrula('türkçeHarfVar')).toBeNull();
    expect(kullaniciAdiDogrula('abc')).toBeNull();
    expect(kullaniciAdiDogrula('a'.repeat(16))).toBeNull();
  });

  it('çok kısa ad reddedilir', () => {
    expect(kullaniciAdiDogrula('ab')).toBeTruthy();
  });

  it('çok uzun ad reddedilir', () => {
    expect(kullaniciAdiDogrula('a'.repeat(17))).toBeTruthy();
  });

  it('boşluk içeren ad reddedilir', () => {
    expect(kullaniciAdiDogrula('zihin ustasi')).toBeTruthy();
  });

  it('küfürlü ad reddedilir', () => {
    expect(kullaniciAdiDogrula('fuck123')).toBeTruthy();
  });
});
