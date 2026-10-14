/**
 * kelime-anagram.test.ts — Aynı harflerden türeyen başka bir kelime de
 * tam puan almalı.
 *
 * Proje sahibinin sorusu (14 Ekim 2026): "icra" aynı zamanda "rica" ya
 * da "cari" olabiliyor. Turun en uzun kelimesi "cari" ise ve oyuncu
 * "icra" yazdıysa en yüksek puanı alması gerekir.
 *
 * Puan BELLİ BİR KELİMEYE değil, yazılan kelimenin UZUNLUĞUNA bakıyor;
 * bu test o davranışı kilitliyor. Gelecekte "oyuncu tam olarak en uzun
 * kelimeyi mi bildi" diye bir karşılaştırma eklenirse burası kırılır.
 */

import { describe, it, expect } from 'vitest';
import {
  dogrulaKelime,
  puanlaKelime,
  enUzunKelime,
  tamSozlukKur,
} from '@tamisabet/oyun-kelime';
import { KELIME_METNI, GOVDE_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';

// GERÇEK sözlük. `baslangicSozlugu` yalnızca birkaç yüz kelimelik
// yedek liste; oyunun oynadığı sözlük o değil.
const sozluk = tamSozlukKur(KELIME_METNI, GOVDE_METNI);

describe('aynı harflerden türeyen kelimeler', () => {
  const harfler = ['i', 'c', 'r', 'a', 'k', 'm', 'e'];
  const esDeger = ['icra', 'rica', 'cari'];

  it('üçü de sözlükte var ve havuzdan yazılabiliyor', () => {
    const enUzun = enUzunKelime(harfler, sozluk) ?? '';
    const veri = { harfler, enUzunUzunluk: enUzun.length };
    for (const k of esDeger) {
      const d = dogrulaKelime(veri, k, sozluk);
      expect(d.gecerli, `${k} geçersiz sayıldı: ${d.hata ?? ''}`).toBe(true);
    }
  });

  it('aynı uzunlukta oldukları için aynı puanı alıyorlar', () => {
    // Turun en uzunu dört harf olsaydı: üçü de tam isabet sayılır,
    // hangisinin yazıldığı puanı değiştirmez.
    const veri = { harfler, enUzunUzunluk: 4 };
    const puanlar = esDeger.map((k) => {
      const d = dogrulaKelime(veri, k, sozluk);
      return puanlaKelime(d, 60, 60, false).toplam;
    });
    expect(puanlar[0]).toBeGreaterThan(0);
    expect(new Set(puanlar).size, `puanlar ayrıştı: ${puanlar.join(', ')}`).toBe(1);
  });

  it('tam isabet sayılıyorlar — uzaklık sıfır', () => {
    const veri = { harfler, enUzunUzunluk: 4 };
    for (const k of esDeger) {
      expect(dogrulaKelime(veri, k, sozluk).uzaklik, k).toBe(0);
    }
  });
});
