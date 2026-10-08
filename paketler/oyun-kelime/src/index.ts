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
  BotPlani as CekirdekBotPlani,
  BotTanim,
  Cevap,
  Cozum,
  Dogrulama,
  Puan,
  Seviye,
  Tur,
  TurSaglayici,
} from '@tamisabet/cekirdek';
import {
  dogrulaKelime,
  enUzunKelime,
  havuzUret,
  puanlaKelime,
  type KelimeVeri,
} from './mantik.ts';
import { baslangicSozlugu, turkceBuyult, type Sozluk } from './sozluk.ts';
import {
  kelimeBotCevabi,
  kelimeBotGecikmesi,
  kelimeBotlari,
  kelimeGecikmeTabaniMs,
  type KelimeProfilAd,
} from './bot.ts';

export * from './sozluk.ts';
export * from './mantik.ts';
export * from './gonderim.ts';
export * from './cekim.ts';
export * from './bot.ts';

export const KELIME_SEVIYE_LISTESI: readonly Seviye[] = [
  { anahtar: 'cocuk', etiket: 'Isınma', altEtiket: '7 harf', sure: 60, antrenmanSuresiz: true },
  { anahtar: 'normal', etiket: 'Normal', altEtiket: '8 harf', sure: 60, antrenmanSuresiz: false },
  { anahtar: 'zor', etiket: 'Zor', altEtiket: '9 harf', sure: 75, antrenmanSuresiz: false },
  { anahtar: 'usta', etiket: 'Usta', altEtiket: '10 harf', sure: 90, antrenmanSuresiz: true },
];

/**
 * Kelime turu sağlayıcısını kurar.
 *
 * İKİ SÖZLÜK
 * `sozluk` oyuncunun cevabını KABUL etmek için — geniş tutuluyor,
 * nadir bir kelime bilen ödüllendirilsin. `yaygin` ise HEDEF için:
 * havuzun çekirdek kelimesi ve "en uzun kelime" buradan seçiliyor.
 * Verilmezse ikisi aynı listedir.
 *
 * Neden ayrıldı: kök sözlüğü TDK tabanlı ve artık kullanılmayan
 * kelimelerle dolu. Hedef oradan seçilince oyuncu her turda
 * bilinmeyen bir kelimenin altında kalıyordu.
 */
export function kelimeTuruKur(sozluk: Sozluk, yaygin: Sozluk = sozluk): TurSaglayici {
  return {
    ad: 'kelime',
    seviyeler: KELIME_SEVIYE_LISTESI,

    turUret(seviye: string, tohum: number): Tur {
      return {
        oyun: 'kelime',
        seviye,
        tohum,
        veri: havuzUret(seviye, tohum, sozluk, yaygin),
      };
    },

    dogrula(tur: Tur, cevap: Cevap): Dogrulama {
      const veri = tur.veri as KelimeVeri;
      // Sonuç OLDUĞU GİBİ dönüyor. Önce alanlar tek tek kopyalanıyordu
      // ve puanlamanın ihtiyaç duyduğu `enUzunUzunluk` / `harfSayisi`
      // yolda düşüyordu; puan oranı hesaplanamadığı için tam isabet
      // dışındaki her cevap sıfır alıyordu.
      //
      // Platform bu fazladan alanları GÖRMEZ: `Dogrulama` arayüzünde
      // yoklar, yalnızca kelime paketi okuyor. Arayüz sözleşmesi
      // bozulmuyor.
      return dogrulaKelime(veri, String(cevap.icerik ?? ''), sozluk);
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
      // Çözüm de yaygın listeden: oyuncuya "en uzunu BİRSAM'dı" demek
      // öğretici değil, moral bozucu.
      const kelime = enUzunKelime(veri.harfler, yaygin, sinirMs);
      if (!kelime) {
        return { uzaklik: veri.enUzunUzunluk, satirlar: ['Kelime bulunamadı'] };
      }
      return {
        uzaklik: 0,
        satirlar: [`${turkceBuyult(kelime)} — ${kelime.length} harf`],
      };
    },

    /** Maç sonu özetinde turun tek satırlık tanımı. */
    turTanimi(tur: Tur): string {
      return (tur.veri as KelimeVeri).harfler.map(turkceBuyult).join(' ');
    },

    /**
     * Bot yeteneği — düello ve arena bunu çağırıyor.
     *
     * Bot çözümü hazır almıyor: sözlüğü kendisi tarıyor ve taraması
     * profiline göre sınırlı. Hedef listesi (`yaygin`) kullanılıyor;
     * bot da oyuncu gibi gündelik kelimeler buluyor.
     */
    bot: {
      botlar(adet: number, gucIpucu: number): BotTanim[] {
        return kelimeBotlari(adet, gucIpucu, adet > 1);
      },

      botPlani(tur: Tur, bot: BotTanim, tohum: number): CekirdekBotPlani {
        const veri = tur.veri as KelimeVeri;
        const kelime = kelimeBotCevabi(veri, bot.profil as KelimeProfilAd, yaygin, tohum);
        return {
          gecikmeMs: kelimeBotGecikmesi(bot.profil as KelimeProfilAd, tohum),
          cevap: kelime ? { icerik: kelime } : null,
        };
      },

      botGecikmeTabaniMs(turSuresiSn: number): number {
        return kelimeGecikmeTabaniMs(turSuresiSn);
      },
    },
  };
}

/**
 * Varsayılan kelime turu — GEÇİCİ başlangıç sözlüğüyle.
 * Gerçek sözlük belirlenince yalnızca buradaki kaynak değişecek.
 */
export const kelimeTuru: TurSaglayici = kelimeTuruKur(baslangicSozlugu);
