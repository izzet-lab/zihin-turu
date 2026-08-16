/**
 * SAYI TURU — TurSaglayici eklentisi.
 *
 * Platforma takılma noktası. Platform yalnızca bu arayüzü çağırır;
 * "hedef", "sayilar" gibi oyuna özgü ayrıntı burada, `Tur.veri`
 * içinde saklı kalır. Mantığın tamamı `mantik.ts` içindedir.
 */

import { gunlukTohum } from '@zihinturu/cekirdek';
import type { Tur, Cevap, Dogrulama, Puan, Cozum, Seviye, TurSaglayici } from '@zihinturu/cekirdek';
import {
  SEVIYELER,
  uretimYap,
  dogrulaZinciri,
  puanlaHesap,
  bicimle,
  type Adim,
  type SayiVeri,
} from './mantik';

export type {
  Adim,
  Islem,
  SayiVeri,
  CozSonuc,
  Uretim,
  JokerTip,
  JokerSonuc,
} from './mantik';
export {
  SEVIYELER,
  KUCUK,
  BUYUK,
  uygula,
  cozZinciri,
  uretimYap,
  dogrulaZinciri,
  puanlaHesap,
  jokerVer,
  jokerliPuan,
  JOKER_MALIYET,
  JOKER_HAK_SAYISI,
  antrenmanCarpani,
  ANTRENMAN_SURE_CARPANI,
  seviyeCarpani,
  ANTRENMAN_SEVIYE_CARPANI,
  antrenmanToplamCarpani,
  bicimle,
} from './mantik';

/**
 * Seviye üst verisi. Çekirdekteki `Seviye` "süre 0 yasak" der; tohum
 * kodundaki süresiz seviyeler (Çocuk, Usta) burada `antrenmanSuresiz`
 * ile işaretlenir, rekabet süresi olarak makul bir değer taşır.
 * (Puanlama süreyi parametreyle alır; bu alan yalnızca üst veridir,
 * oyun kuralını etkilemez.)
 */
export const SEVIYE_LISTESI: readonly Seviye[] = [
  { anahtar: 'cocuk', etiket: 'Isınma', altEtiket: '2 hane', sure: 60, antrenmanSuresiz: true },
  { anahtar: 'kolay', etiket: 'Kolay', altEtiket: '3 hane', sure: 90, antrenmanSuresiz: false },
  { anahtar: 'normal', etiket: 'Normal', altEtiket: '3 hane', sure: 45, antrenmanSuresiz: false },
  { anahtar: 'zor', etiket: 'Zor', altEtiket: '4 hane', sure: 90, antrenmanSuresiz: false },
  { anahtar: 'usta', etiket: 'Usta', altEtiket: '5 hane', sure: 120, antrenmanSuresiz: true },
];

export const sayiTuru: TurSaglayici = {
  ad: 'sayi',
  seviyeler: SEVIYE_LISTESI,

  turUret(seviye: string, tohum: number): Tur {
    const u = uretimYap(seviye, tohum);
    const veri: SayiVeri = { hedef: u.hedef, sayilar: u.sayilar };
    return { oyun: 'sayi', seviye, tohum, veri };
  },

  dogrula(tur: Tur, cevap: Cevap): Dogrulama {
    const veri = tur.veri as SayiVeri;
    const adimlar = cevap.icerik as Adim[];
    return dogrulaZinciri(veri.sayilar, adimlar, veri.hedef);
  },

  puanla(seviye: string, d: Dogrulama, kalanSaniye: number, toplamSaniye: number, ilkBulanMi: boolean): Puan {
    return puanlaHesap(seviye, d.uzaklik, kalanSaniye, toplamSaniye, ilkBulanMi);
  },

  cozumBul(tur: Tur, _sinirMs?: number): Cozum {
    // Tur tohumdan yeniden üretilir; saklanan çözüm buradan gelir.
    // (Üretim deterministik olduğu için sınır süresine gerek yok.)
    const u = uretimYap(tur.seviye, tur.tohum);
    return { uzaklik: u.cozum.fark, satirlar: u.cozum.adimlar.map(bicimle) };
  },
};

/** Günün turu: tarihten türeyen tohumla herkeste aynı bulmaca. */
export function gununTuru(seviye: string, gun?: string): Tur {
  return sayiTuru.turUret(seviye, gunlukTohum('sayi', seviye, gun));
}

/** Bilinen seviye anahtarları, kolaydan zora sıralı. */
export const SEVIYE_ANAHTARLARI = Object.keys(SEVIYELER);

/**
 * Bir seviyeden sonraki seviyenin anahtarı. Son seviyedeyse veya
 * anahtar bilinmiyorsa null döner. İlk kez oynayan öğrencinin
 * ilerleme kilidi bunu kullanır.
 */
export function sonrakiSeviyeAnahtari(seviye: string): string | null {
  const i = SEVIYE_ANAHTARLARI.indexOf(seviye);
  if (i < 0 || i >= SEVIYE_ANAHTARLARI.length - 1) return null;
  return SEVIYE_ANAHTARLARI[i + 1]!;
}

// Bot (sunucu tarafı): rakip yoksa maçı kuran eklenti.
export { botUret, botPlani, PROFILLER } from './bot';
export type { Bot, BotPlani, ProfilAd } from './bot';

export default sayiTuru;
