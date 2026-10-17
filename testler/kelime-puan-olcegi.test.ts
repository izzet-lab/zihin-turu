/**
 * kelime-puan-olcegi.test.ts — İki oyunun Günün Turu ölçeği eşit.
 *
 * NEDEN BU TEST VAR (17 Ekim 2026)
 * Sayı turunun Günün Turu puanı ×10 ile büyütülüyordu, kelime turunun
 * puanı ham yazılıyordu. Sayı turunda tam isabet ~150, kelime turunda
 * en uzun kelime ~15 ediyordu. Genel sıralama iki oyunun toplamını
 * alacağı için bu on kat fark kelime turunu görünmez yapardı: toplam
 * pratikte sayı turunun tablosu olurdu.
 *
 * Test iki şeyi birden tutuyor:
 *   1. İki çarpan AYNI sayı. Biri değişip diğeri unutulursa kırılır.
 *   2. İki oyunun MÜKEMMEL sonucu aynı aralıkta puan veriyor.
 *
 * Çarpan yalnızca Günün Turu'na uygulanıyor; düello, arena ve
 * antrenman ham puanla çalışmaya devam ediyor.
 */

import { describe, it, expect } from 'vitest';
import { GUNUN_TURU_CARPANI, puanlaHesap } from '@tamisabet/oyun-sayi';
import { KELIME_GUNUN_TURU_CARPANI, kelimeNihaiPuan, puanlaKelime } from '@tamisabet/oyun-kelime';

describe('Günün Turu puan ölçeği', () => {
  it('iki oyunun çarpanı aynı', () => {
    expect(KELIME_GUNUN_TURU_CARPANI).toBe(GUNUN_TURU_CARPANI);
  });

  it('mükemmel sonuç iki oyunda da aynı puanı veriyor', () => {
    // Sayı turu: tam isabet, sürenin tamamı kalmış.
    const sayi = puanlaHesap('normal', 0, 60, 60, false);
    const sayiNihai = sayi.toplam * GUNUN_TURU_CARPANI;

    // Kelime turu: en uzun kelime bulunmuş, sürenin tamamı kalmış.
    const kelime = puanlaKelime(
      { uzaklik: 0, enUzunUzunluk: 8, harfSayisi: 8 },
      60,
      60,
      false,
    );
    const kelimeNihai = kelimeNihaiPuan(kelime, 'gunun');

    expect(kelimeNihai).toBe(sayiNihai);
    // Ölçeğin kendisi de kayıt altında: ~150 bekleniyor.
    expect(kelimeNihai).toBe(150);
  });

  it('kısa kelime oranla düşüyor — ölçek büyüdü, mantık değişmedi', () => {
    const tam = kelimeNihaiPuan(
      puanlaKelime({ uzaklik: 0, enUzunUzunluk: 8, harfSayisi: 8 }, 60, 60, false),
      'gunun',
    );
    const yakin = kelimeNihaiPuan(
      puanlaKelime({ uzaklik: 1, enUzunUzunluk: 8, harfSayisi: 7 }, 60, 60, false),
      'gunun',
    );
    const uzak = kelimeNihaiPuan(
      puanlaKelime({ uzaklik: 4, enUzunUzunluk: 8, harfSayisi: 4 }, 60, 60, false),
      'gunun',
    );

    expect(tam).toBeGreaterThan(yakin);
    expect(yakin).toBeGreaterThan(uzak);
    expect(uzak).toBeGreaterThan(0);
  });

  it('çarpan yalnızca Günün Turu\'na uygulanıyor', () => {
    const temel = puanlaKelime({ uzaklik: 0, enUzunUzunluk: 8, harfSayisi: 8 }, 60, 60, false);
    for (const mod of ['antrenman', 'duello', 'arena'] as const) {
      expect(kelimeNihaiPuan(temel, mod), mod).toBe(temel.toplam);
    }
  });
});
