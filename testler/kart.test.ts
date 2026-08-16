import { describe, it, expect } from 'vitest';
import { kartMetni, kartCiz, BOYUT, type Kayit } from '../uygulama/src/kart';
import { gununTuru, uretimYap, type SayiVeri } from '@zihinturu/oyun-sayi';

/**
 * Sahte 2B bağlam: kartCiz'in yazdığı tüm metinleri toplar. Amaç,
 * çözüm adımlarının (işlem işaretleri, "=" ve ara sonuçlar) karta
 * SIZMADIĞINI kanıtlamak (CLAUDE.md 6).
 */
function sahteBaglam() {
  const yazilar: string[] = [];
  const c = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect() {},
    beginPath() {},
    moveTo() {},
    arcTo() {},
    closePath() {},
    stroke() {},
    fill() {},
    fillText(m: unknown) {
      yazilar.push(String(m));
    },
    measureText(m: unknown) {
      return { width: String(m).length * 20 };
    },
  };
  return { c, yazilar };
}

const gun = '2026-08-16';
const tur = gununTuru('normal', gun);
const veri = tur.veri as SayiVeri;
const uretim = uretimYap('normal', tur.tohum);

const tamKayit: Kayit = {
  seviyeEtiket: 'Normal',
  hedef: veri.hedef,
  fark: 0,
  puan: 15,
  sure: 45,
  gunluk: true,
  tarih: gun,
  seri: 4,
};

describe('paylaşım kartı — metin', () => {
  it('hedef ve tam isabet yazıyor', () => {
    const m = kartMetni(tamKayit);
    expect(m).toContain(String(veri.hedef));
    expect(m).toMatch(/Tam isabet/);
  });

  it('metinde işlem işareti ve "=" YOK', () => {
    const m = kartMetni(tamKayit);
    expect(m).not.toMatch(/[×÷−=]/);
  });
});

describe('paylaşım kartı — görsel (sızıntı denetimi)', () => {
  const { c, yazilar } = sahteBaglam();
  kartCiz(c as unknown as CanvasRenderingContext2D, tamKayit);
  const hepsi = yazilar.join(' | ');

  it('kart 1080 kare', () => {
    expect(BOYUT).toBe(1080);
  });

  it('hedef karta çizildi', () => {
    expect(yazilar).toContain(String(veri.hedef));
  });

  it('kartta "=" işareti yok', () => {
    expect(hepsi).not.toContain('=');
  });

  it('kartta işlem işaretleri yok (× ÷ − +)', () => {
    expect(hepsi).not.toMatch(/[×÷−]/);
    // "+" adım zincirinde geçebilir; kartta hiç olmamalı
    expect(hepsi).not.toContain('+');
  });

  it('ara sonuçlar karta girmedi', () => {
    // Meşru alanlar (hedef, puan, süre, seri) sızıntı sayılmaz.
    const mesru = new Set([veri.hedef, tamKayit.puan, tamKayit.sure, tamKayit.seri]);
    const araSonuclar = uretim.cozum.adimlar
      .map((a) => a.sonuc)
      .filter((s) => s !== veri.hedef && !mesru.has(s));
    const sizan = araSonuclar.filter((s) => yazilar.includes(String(s)));
    expect(sizan).toEqual([]);
  });
});

describe('paylaşım kartı — joker kullanıldığında hâlâ sızıntısız', () => {
  const jokerliKayit: Kayit = { ...tamKayit, jokerler: ['adim', 'sure'] };

  it('metinde joker adı geçer ama işlem/ara sonuç geçmez', () => {
    const m = kartMetni(jokerliKayit);
    expect(m).toMatch(/Bir adım aç/);
    expect(m).toMatch(/Süre ekle/);
    expect(m).not.toMatch(/[×÷−=]/);
  });

  it('görselde joker adı geçer ama çözüm sızmaz', () => {
    const { c, yazilar } = sahteBaglam();
    kartCiz(c as unknown as CanvasRenderingContext2D, jokerliKayit);
    const hepsi = yazilar.join(' | ');
    expect(hepsi).toMatch(/Bir adım aç/);
    expect(hepsi).not.toContain('=');
    expect(hepsi).not.toMatch(/[×÷−]/);

    const mesru = new Set([veri.hedef, jokerliKayit.puan, jokerliKayit.sure, jokerliKayit.seri]);
    const araSonuclar = uretim.cozum.adimlar
      .map((a) => a.sonuc)
      .filter((s) => s !== veri.hedef && !mesru.has(s));
    const sizan = araSonuclar.filter((s) => yazilar.includes(String(s)));
    expect(sizan).toEqual([]);
  });
});
