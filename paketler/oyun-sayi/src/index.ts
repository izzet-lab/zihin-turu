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
  varsayilanBuyukAdet,
  cozZinciri,
  dogrulaZinciri,
  puanlaHesap,
  bicimle,
  type Adim,
  type SayiVeri,
  type Uretim,
} from './mantik.ts';

/**
 * Bir turdan onun üretimini (taşlar, hedef, çözüm) geri getirir.
 *
 * NEDEN AYRI BİR FONKSİYON
 * Çözüm ve joker, turu tohumdan yeniden üreterek buluyor. Yeniden
 * üretim parametreleri turla birebir aynı değilse ORTAYA BAŞKA BİR TUR
 * çıkar ve oyuncuya ekrandaki taşlarla ilgisi olmayan bir çözüm
 * gösterilir. Ağustos 2026'da tam bu oldu: `buyukAdet` turda
 * saklanmadığı için yeniden üretim varsayılanı kullandı.
 *
 * Bu fonksiyon iki katmanlı koruma sağlar:
 *
 *   1. Turun kendi `buyukAdet` değeriyle üretir (kök çözüm).
 *   2. Üretilen tur, turdaki taş ve hedefle BİREBİR AYNI MI diye
 *      denetler. Değilse yeniden üretime hiç güvenmez; ekrandaki
 *      gerçek tahtayı çözer.
 *
 * İkinci adım, bu sınıf hatanın bir daha kullanıcıya ulaşmasını
 * engelliyor: çözüm her zaman ekrandaki tura aittir.
 */
export function turdanUretim(tur: Tur): Uretim {
  const veri = tur.veri as SayiVeri;
  const ba = veri.buyukAdet ?? varsayilanBuyukAdet(tur.seviye);
  const u = uretimYap(tur.seviye, tur.tohum, ba);

  if (uyusuyorMu(u.sayilar, veri.sayilar) && u.hedef === veri.hedef) return u;

  // Yeniden üretim tutmadı — ekrandaki tahtayı çöz.
  const cozum = cozZinciri(veri.sayilar, veri.hedef, 0, 60000);
  return {
    seviye: tur.seviye,
    tohum: tur.tohum,
    hedef: veri.hedef,
    sayilar: veri.sayilar,
    cozum,
  };
}

/** İki taş listesi (sıradan bağımsız) aynı mı? */
function uyusuyorMu(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort((m, n) => m - n);
  const y = [...b].sort((m, n) => m - n);
  return x.every((d, i) => d === y[i]);
}

export type {
  YogunlukSonuc,
  Adim,
  Islem,
  SayiVeri,
  CozSonuc,
  Uretim,
  JokerTip,
  JokerSonuc,
  NihaiPuanGirdi,
  NihaiPuan,
} from './mantik.ts';
export {
  cozumYogunluguDetay,
  varsayilanBuyukAdet,
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
  nihaiPuanHesap,
  kullanilmayanTasIndeksleri,
  JOKER_MALIYET,
  JOKER_HAK_SAYISI,
  ODULLU_EK_JOKER,
  jokerUstSiniri,
  antrenmanCarpani,
  ANTRENMAN_SURE_CARPANI,
  seviyeCarpani,
  ANTRENMAN_SEVIYE_CARPANI,
  antrenmanToplamCarpani,
  GUNUN_TURU_CARPANI,
  bicimle,
} from './mantik.ts';

/**
 * Seviye üst verisi. Çekirdekteki `Seviye` "süre 0 yasak" der; tohum
 * kodundaki süresiz seviyeler (Çocuk, Usta) burada `antrenmanSuresiz`
 * ile işaretlenir, rekabet süresi olarak makul bir değer taşır.
 * (Puanlama süreyi parametreyle alır; bu alan yalnızca üst veridir,
 * oyun kuralını etkilemez.)
 */
export const SEVIYE_LISTESI: readonly Seviye[] = [
  { anahtar: 'cocuk', etiket: 'Isınma', altEtiket: '2 hane · 4 taş', sure: 60, antrenmanSuresiz: true },
  { anahtar: 'normal', etiket: 'Normal', altEtiket: '3 hane · 5 taş', sure: 60, antrenmanSuresiz: false },
  { anahtar: 'zor', etiket: 'Zor', altEtiket: '4 hane · 6 taş', sure: 75, antrenmanSuresiz: false },
  { anahtar: 'usta', etiket: 'Usta', altEtiket: '5 hane · 7 taş', sure: 90, antrenmanSuresiz: true },
];

export const sayiTuru: TurSaglayici = {
  ad: 'sayi',
  seviyeler: SEVIYE_LISTESI,

  turUret(seviye: string, tohum: number): Tur {
    // Platform arayüzü oyuna özgü ayar taşımaz (kural 1). Özel ayarla
    // tur kurmak için `turKur` kullanılır.
    return turKur(seviye, tohum);
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
    // Çözüm her zaman EKRANDAKİ tura ait olmalı; turdanUretim bunu
    // garanti ediyor (bkz. o fonksiyonun açıklaması).
    const u = turdanUretim(tur);
    return { uzaklik: u.cozum.fark, satirlar: u.cozum.adimlar.map(bicimle) };
  },
};

/**
 * Belirli bir üretim ayarıyla tur kurar.
 *
 * `buyukAdet` TURLA BİRLİKTE SAKLANIR. Saklanmazsa çözüm ve joker turu
 * tohumdan yeniden üretirken varsayılanı kullanır ve başka bir tur
 * çıkarır — oyuncuya ekrandaki taşlarla ilgisi olmayan bir çözüm
 * gösterilir (Ağustos 2026 hatası).
 *
 * Bu fonksiyon `TurSaglayici` arayüzünün dışında duruyor: `buyukAdet`
 * oyuna özgü bir kavram, platformun bilmesi gerekmiyor.
 */
export function turKur(seviye: string, tohum: number, buyukAdet?: number): Tur {
  const ba = buyukAdet ?? varsayilanBuyukAdet(seviye);
  const u = uretimYap(seviye, tohum, ba);
  const veri: SayiVeri = { hedef: u.hedef, sayilar: u.sayilar, buyukAdet: ba };
  return { oyun: 'sayi', seviye, tohum, veri };
}

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

/**
 * Seviye anahtarının kullanıcıya gösterilecek etiketi.
 * 'cocuk' → 'Isınma', 'normal' → 'Normal' …
 *
 * Ham anahtar hiçbir ekranda gösterilmemeli; 'cocuk' gibi iç adlar
 * kullanıcıya anlamsız gelir. Eski kayıtlardan gelen bilinmeyen bir
 * anahtar olursa etiket yerine anahtarın kendisi döner — boş bir
 * satır göstermektense ham değer daha az kafa karıştırıcıdır.
 */
export function seviyeEtiketi(anahtar: string): string {
  return SEVIYE_LISTESI.find((s) => s.anahtar === anahtar)?.etiket ?? anahtar;
}

// Bot (sunucu tarafı): rakip yoksa maçı kuran eklenti.
export { gonderimDogrula, gunNumarasi, enFazlaAdim, TARIH_PAYI_GUN, SURE_JOKERI_SANIYE } from './gonderim.ts';
export type { GonderimGirdi, GonderimHata } from './gonderim.ts';

export { botUret, botPlani,
  botPlaniTohumlu, botProfilSec, PROFILLER, PROFIL_SIRASI,
  KORUMALI_DUELLO_SAYISI } from './bot.ts';
export type { Bot, BotPlani, ProfilAd } from './bot.ts';

export default sayiTuru;
