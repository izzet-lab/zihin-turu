/**
 * ZİHİN TURU — KELİME TURU
 *
 * 8 harf verilir, en uzun kelime türetilir.
 *
 * Bu paket platformu TANIMAZ; `TurSaglayici` arayüzünü uygular ve
 * platforma oradan takılır. Platform kodunda tek bir satır bile
 * değişmedi — Faz 6'nın asıl sınavı buydu (bkz. CLAUDE.md: "platform
 * kodunda hiçbir değişiklik yapma; gerekiyorsa arayüz eksiktir").
 */

import type {
  Cevap,
  Cozum,
  Dogrulama,
  Puan,
  Seviye,
  Tur,
  TurSaglayici,
} from '@zihinturu/cekirdek';
import {
  dogrulaKelime,
  enUzunKelime,
  havuzUret,
  puanlaKelime,
  type KelimeVeri,
} from './mantik.ts';
import { baslangicSozlugu, turkceBuyult, type Sozluk } from './sozluk.ts';

export * from './sozluk.ts';
export * from './mantik.ts';
export * from './gonderim.ts';

export const KELIME_SEVIYE_LISTESI: readonly Seviye[] = [
  { anahtar: 'cocuk', etiket: 'Isınma', altEtiket: '7 harf', sure: 60, antrenmanSuresiz: true },
  { anahtar: 'normal', etiket: 'Normal', altEtiket: '8 harf', sure: 60, antrenmanSuresiz: false },
  { anahtar: 'zor', etiket: 'Zor', altEtiket: '9 harf', sure: 75, antrenmanSuresiz: false },
  { anahtar: 'usta', etiket: 'Usta', altEtiket: '10 harf', sure: 90, antrenmanSuresiz: true },
];

/**
 * Kelime turu sağlayıcısını kurar.
 *
 * Sözlük dışarıdan veriliyor: yayına çıkacak liste bir lisans kararına
 * bağlı ve o karar oyunun kurallarını ilgilendirmiyor. Sözlük
 * değiştiğinde bu dosyada hiçbir şey değişmez.
 */
export function kelimeTuruKur(sozluk: Sozluk): TurSaglayici {
  return {
    ad: 'kelime',
    seviyeler: KELIME_SEVIYE_LISTESI,

    turUret(seviye: string, tohum: number): Tur {
      return {
        oyun: 'kelime',
        seviye,
        tohum,
        veri: havuzUret(seviye, tohum, sozluk),
      };
    },

    dogrula(tur: Tur, cevap: Cevap): Dogrulama {
      const veri = tur.veri as KelimeVeri;
      const sonuc = dogrulaKelime(veri, String(cevap.icerik ?? ''), sozluk);
      return {
        gecerli: sonuc.gecerli,
        hata: sonuc.hata,
        uzaklik: sonuc.uzaklik,
        ozet: sonuc.ozet,
      };
    },

    puanla(
      _seviye: string,
      d: Dogrulama,
      kalanSaniye: number,
      toplamSaniye: number,
      ilkBulanMi: boolean,
    ): Puan {
      return puanlaKelime(d, kalanSaniye, toplamSaniye, ilkBulanMi);
    },

    cozumBul(tur: Tur, sinirMs?: number): Cozum {
      const veri = tur.veri as KelimeVeri;
      const kelime = enUzunKelime(veri.harfler, sozluk, sinirMs);
      if (!kelime) {
        return { uzaklik: veri.enUzunUzunluk, satirlar: ['Kelime bulunamadı'] };
      }
      return {
        uzaklik: 0,
        satirlar: [`${turkceBuyult(kelime)} — ${kelime.length} harf`],
      };
    },
  };
}

/**
 * Varsayılan kelime turu — GEÇİCİ başlangıç sözlüğüyle.
 * Gerçek sözlük belirlenince yalnızca buradaki kaynak değişecek.
 */
export const kelimeTuru: TurSaglayici = kelimeTuruKur(baslangicSozlugu);
