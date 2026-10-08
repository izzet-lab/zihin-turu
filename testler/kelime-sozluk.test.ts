import { describe, it, expect } from 'vitest';
import { KELIME_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';
import { kelimeTuruKur, tamSozlukKur, KELIME_SEVIYE_LISTESI } from '@tamisabet/oyun-kelime';

/*
  GERÇEK SÖZLÜK — Zemberek kök listesinden üretilmiş yaklaşık 50 bin
  kelime. Bu dosya listenin oyuna uygun olduğunu sınar: içinde olması
  gerekenler var mı, olmaması gerekenler ayıklanmış mı, ve her seviyede
  çözülebilir tur üretilebiliyor mu.
*/

const sozluk = tamSozlukKur(KELIME_METNI);
const kelime = kelimeTuruKur(sozluk);

describe('Türkçe sözlük', () => {
  it('yeterince büyük', () => {
    expect(sozluk.adet).toBeGreaterThan(40_000);
  });

  it('gündelik kelimeler içinde', () => {
    for (const k of ['kitap', 'deniz', 'elma', 'bilgisayar', 'öğretmen', 'yağmur']) {
      expect(sozluk.icerir(k), k).toBe(true);
    }
  });

  it('düzenli çoğullar da kabul ediliyor', () => {
    // Oyuncunun "kitaplar" yazıp reddedilmesi can sıkıcı olurdu.
    for (const k of ['kitaplar', 'denizler', 'elmalar', 'çiçekler']) {
      expect(sozluk.icerir(k), k).toBe(true);
    }
  });

  it('özel adlar, kısaltmalar ve ünlemler ayıklanmış', () => {
    for (const k of ['ankara', 'tbmm', 'aaah', 'ahmet']) {
      expect(sozluk.icerir(k), k).toBe(false);
    }
  });

  it('büyük/küçük harf farkı aranmaz', () => {
    expect(sozluk.icerir('KİTAP')).toBe(true);
    expect(sozluk.icerir('Deniz')).toBe(true);
  });
});

describe('gerçek sözlükle tur üretimi', () => {
  for (const seviye of KELIME_SEVIYE_LISTESI) {
    it(`${seviye.etiket} — 200 turun hepsi çözülebilir`, () => {
      for (let tohum = 1; tohum <= 200; tohum++) {
        const tur = kelime.turUret(seviye.anahtar, tohum);
        const cozum = kelime.cozumBul(tur);
        expect(cozum.uzaklik, `tohum ${tohum}`).toBe(0);
      }
    });
  }

  it('aynı tohum aynı turu verir', () => {
    const a = kelime.turUret('normal', 4242);
    const b = kelime.turUret('normal', 4242);
    expect(a.veri).toEqual(b.veri);
  });
});
