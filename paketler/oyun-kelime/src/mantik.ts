/**
 * mantik.ts — Kelime turunun kuralları.
 *
 * Harf havuzu üretimi, cevap doğrulama, puanlama ve en uzun kelimeyi
 * bulma. Hepsi saf: aynı tohum her makinede aynı havuzu verir (kural 3).
 *
 * Platform bu dosyayı tanımaz; yalnızca `TurSaglayici` üzerinden konuşur.
 */

import { rastgele, type Puan } from '@tamisabet/cekirdek';
import { turkceKucult, type Sozluk } from './sozluk.ts';
import { sozluktePayVar } from './cekim.ts';

/** Bir kelime turunun oyuncuya gösterilen verisi. */
export interface KelimeVeri {
  /** Karışık harfler. Her harf bir kez kullanılabilir. */
  harfler: string[];
  /** Bu havuzdan türetilebilen en uzun kelimenin uzunluğu. */
  enUzunUzunluk: number;
}

export interface KelimeSeviyeAyar {
  /** Havuzdaki harf sayısı. */
  harf: number;
  /**
   * Havuz kurulurken seçilen "çekirdek kelime"nin uzunluğu.
   * Havuzda en az bu uzunlukta bir kelime bulunacağının garantisi.
   */
  cekirdekUzunluk: number;
  sure: number;
}

/**
 * Seviyeler — sayı turuyla aynı dörtlü yapı.
 * Zorluk harf sayısıyla değil, BULUNMASI GEREKEN kelimenin uzunluğuyla
 * artıyor: havuz büyüdükçe seçenek de artar, asıl zorluk uzun kelimeyi
 * görebilmek.
 */
export const KELIME_SEVIYELERI: Record<string, KelimeSeviyeAyar> = {
  cocuk: { harf: 7, cekirdekUzunluk: 4, sure: 60 },
  normal: { harf: 8, cekirdekUzunluk: 5, sure: 60 },
  zor: { harf: 9, cekirdekUzunluk: 6, sure: 75 },
  usta: { harf: 10, cekirdekUzunluk: 7, sure: 90 },
};

/**
 * Türkçe harf sıklığı — havuzun dolgu harfleri buna göre seçilir.
 *
 * Eşit olasılıkla harf dağıtmak oynanamaz havuzlar üretiyor: Türkçe'de
 * 'a' ile 'ğ' aynı sıklıkta değil. Ağırlıklar kabaca Türkçe metinlerdeki
 * orana dayanıyor; amaç istatistiksel doğruluk değil, havuzun
 * oynanabilir olması.
 */
export const HARF_AGIRLIK: Record<string, number> = {
  a: 12, e: 9, i: 8, ı: 5, n: 7, r: 7, l: 6, k: 5, d: 5, t: 5,
  m: 4, s: 4, u: 3, y: 3, b: 3, o: 3, ü: 2, ş: 2, z: 2, c: 2,
  g: 1, ç: 1, h: 1, ö: 1, p: 1, v: 1, ğ: 1, f: 1, j: 1,
};

const AGIRLIKLI_HAVUZ: string[] = Object.entries(HARF_AGIRLIK).flatMap(
  ([harf, agirlik]) => Array.from({ length: agirlik }, () => harf),
);

/** Harfleri sayar: "kalem" → {k:1, a:1, l:1, e:1, m:1} */
export function harfSay(kelime: string): Map<string, number> {
  const sayac = new Map<string, number>();
  for (const h of turkceKucult(kelime)) {
    sayac.set(h, (sayac.get(h) ?? 0) + 1);
  }
  return sayac;
}

/** Kelime bu havuzdan yazılabilir mi? (Her harf havuzda olduğu kadar.) */
export function havuzdanYazilabilir(havuz: readonly string[], kelime: string): boolean {
  const kalan = new Map<string, number>();
  for (const h of havuz) {
    const k = turkceKucult(h);
    kalan.set(k, (kalan.get(k) ?? 0) + 1);
  }
  for (const [harf, adet] of harfSay(kelime)) {
    if ((kalan.get(harf) ?? 0) < adet) return false;
  }
  return true;
}

/**
 * Havuzdan türetilebilen en uzun kelimeyi bulur.
 *
 * Sözlüğü uzun kelimeden kısaya doğru tarar ve ilk uyanı döndürür.
 * `sinirMs` verilirse arama orada kesilir — bot sınırlı süreyle
 * düşünsün diye (kural: bot çözümü hazır almaz).
 */
export function enUzunKelime(
  havuz: readonly string[],
  sozluk: Sozluk,
  sinirMs?: number,
): string | null {
  const baslangic = Date.now();

  // Havuzun harf sayımı BİR KEZ kuruluyor. Her kelime için yeniden
  // kurmak elli bin kelimelik sözlükte turu yarım saniye yavaşlatıyordu;
  // telefonda bu, tur açılırken donma demek.
  const havuzSayim = new Map<string, number>();
  for (const h of havuz) {
    const k = turkceKucult(h);
    havuzSayim.set(k, (havuzSayim.get(k) ?? 0) + 1);
  }

  // Saat her kelimede değil, 512 kelimede bir okunuyor: `Date.now()`
  // aramanın kendisinden pahalıya geliyordu.
  let sayac = 0;

  // Alt sınır EN_KISA_KELIME: sözlükte iki harfli kökler de var (çekim
  // tanıma onlara ihtiyaç duyuyor) ama iki harfli bir kelime cevap
  // olarak kabul edilmiyor; "en uzun kelime" olarak gösterilmesi de
  // yanıltıcı olurdu.
  for (let uzunluk = havuz.length; uzunluk >= EN_KISA_KELIME; uzunluk--) {
    for (const kelime of sozluk.uzunluktakiler(uzunluk)) {
      if (sinirMs != null && (sayac++ & 511) === 0 && Date.now() - baslangic > sinirMs) {
        return null;
      }
      if (sayimdanYazilabilir(havuzSayim, kelime)) return kelime;
    }
  }
  return null;
}

/**
 * Hazır harf sayımına göre kontrol — ara bellek ayırmaz.
 *
 * Kullanılan harfleri sayımdan düşüp sonunda geri koyuyor; böylece
 * kelime başına yeni bir Map kurulmuyor.
 */
function sayimdanYazilabilir(sayim: Map<string, number>, kelime: string): boolean {
  let i = 0;
  let olur = true;
  for (; i < kelime.length; i++) {
    const h = kelime[i]!;
    const kalan = sayim.get(h) ?? 0;
    if (kalan === 0) { olur = false; break; }
    sayim.set(h, kalan - 1);
  }
  // Düşülenleri geri koy — sayım bir sonraki kelimede aynen gerekiyor.
  for (let j = 0; j < i; j++) {
    const h = kelime[j]!;
    sayim.set(h, (sayim.get(h) ?? 0) + 1);
  }
  return olur;
}

/** Diziyi tohumlu karıştırır (Fisher–Yates). */
function karistir<T>(dizi: T[], zar: () => number): T[] {
  const c = [...dizi];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(zar() * (i + 1));
    [c[i], c[j]] = [c[j]!, c[i]!];
  }
  return c;
}

/**
 * Harf havuzunu üretir.
 *
 * NEDEN ÖNCE BİR KELİME SEÇİLİYOR
 * Rastgele harf dağıtıp "umarım bir kelime çıkar" demek oynanamaz
 * turlar üretir. Önce sözlükten bir çekirdek kelime seçiliyor, onun
 * harfleri havuza konuyor, kalanı sıklığa göre dolduruluyor. Böylece
 * havuzda EN AZ bir uzun kelimenin bulunduğu garanti — sayı turundaki
 * "her tur tam çözümlü" güvencesinin kelime karşılığı.
 *
 * ÇEKİRDEK VE HEDEF YAYGIN SÖZLÜKTEN GELİR
 * Kök sözlüğü TDK tabanlı ve "bikir", "cünun", "birsam" gibi artık
 * kullanılmayan kelimeler içeriyor. Çekirdek oradan seçilince havuzun
 * "en uzun kelimesi" kimsenin bilmediği bir şey oluyor ve oyuncu her
 * turda hedefin altında kalıyordu. Çekirdek ve en uzun kelime artık
 * YAYGIN listeden seçiliyor; oyuncunun yazdığı kelime ise geniş
 * listeden kabul ediliyor (nadir bir kelime biliyorsa ödüllendirilir).
 */
export function havuzUret(
  seviye: string,
  tohum: number,
  sozluk: Sozluk,
  yaygin: Sozluk = sozluk,
): KelimeVeri {
  const ayar = KELIME_SEVIYELERI[seviye];
  if (!ayar) throw new Error('Bilinmeyen seviye: ' + seviye);

  const zar = rastgele(tohum);

  // Çekirdek kelime: istenen uzunlukta yoksa bir kısaya düşülür.
  let cekirdek: string | null = null;
  for (let u = ayar.cekirdekUzunluk; u >= 3 && !cekirdek; u--) {
    const adaylar = yaygin.uzunluktakiler(u);
    if (adaylar.length > 0) cekirdek = adaylar[Math.floor(zar() * adaylar.length)]!;
  }
  if (!cekirdek) throw new Error('Sözlük bu seviye için yetersiz.');

  const harfler = [...cekirdek];
  while (harfler.length < ayar.harf) {
    harfler.push(AGIRLIKLI_HAVUZ[Math.floor(zar() * AGIRLIKLI_HAVUZ.length)]!);
  }

  const karisik = karistir(harfler.slice(0, ayar.harf), zar);
  // Hedef de yaygın listeden: ulaşılabilir bir hedef.
  const enUzun = enUzunKelime(karisik, yaygin);

  return {
    harfler: karisik,
    enUzunUzunluk: enUzun ? enUzun.length : cekirdek.length,
  };
}

/* ------------------------------------------------------------------ */
/* Doğrulama                                                           */
/* ------------------------------------------------------------------ */

export interface KelimeDogrulama {
  gecerli: boolean;
  hata?: string;
  /** En uzun kelimeye kaç harf kaldı. 0 = en uzunu buldu. */
  uzaklik: number;
  ozet: string;
  /** Bu turun en uzun kelimesinin harf sayısı. Puanlama buna göre
   *  oranlanıyor (bkz. `puanlaKelime`). */
  enUzunUzunluk: number;
  /** Oyuncunun yazdığı kelimenin harf sayısı. */
  harfSayisi: number;
}

/** En kısa kabul edilen kelime. Daha kısası oyunu anlamsızlaştırıyor. */
export const EN_KISA_KELIME = 3;

/**
 * Oyuncunun yazdığı kelimeyi denetler.
 *
 * SUNUCUDA ÇALIŞIR (kural 2). İstemci "buldum" diyemez; kelime hem
 * havuzdan yazılabilir olmalı hem sözlükte bulunmalı.
 */
export function dogrulaKelime(
  veri: KelimeVeri,
  ham: string,
  sozluk: Sozluk,
): KelimeDogrulama {
  const kelime = turkceKucult((ham ?? '').trim());
  const uzak = (u: number) => Math.max(0, veri.enUzunUzunluk - u);

  const ek = { enUzunUzunluk: veri.enUzunUzunluk, harfSayisi: kelime.length };

  if (!kelime) {
    return { gecerli: true, uzaklik: uzak(0), ozet: 'Kelime yazılmadı', ...ek };
  }
  if (kelime.length < EN_KISA_KELIME) {
    return {
      gecerli: false,
      hata: `En az ${EN_KISA_KELIME} harfli bir kelime yaz.`,
      uzaklik: uzak(0),
      ozet: 'Çok kısa',
      ...ek,
    };
  }
  if (!havuzdanYazilabilir(veri.harfler, kelime)) {
    return {
      gecerli: false,
      hata: 'Bu kelime verilen harflerle yazılamıyor.',
      uzaklik: uzak(0),
      ozet: 'Harfler yetmiyor',
      ...ek,
    };
  }
  // Sözlük kök listesi; çekimli biçimler kuralla tanınıyor (bkz. cekim.ts).
  if (!sozluktePayVar(kelime, sozluk)) {
    return {
      gecerli: false,
      hata: 'Bu kelime sözlükte yok.',
      uzaklik: uzak(0),
      ozet: 'Sözlükte yok',
      ...ek,
    };
  }

  return {
    gecerli: true,
    uzaklik: uzak(kelime.length),
    ozet: `${kelime.length} harf`,
    ...ek,
  };
}

/* ------------------------------------------------------------------ */
/* Puanlama                                                            */
/* ------------------------------------------------------------------ */

/**
 * Puan — sayı turuyla AYNI ölçekte.
 *
 * İki oyun aynı lig yapısını kullanıyor; ölçekler ayrışsaydı seviye
 * başına tablolar kıyaslanamaz hâle gelirdi. Hız primi yalnızca tam
 * isabette var, tıpkı sayı turundaki gibi.
 *
 * NEDEN HARF FARKI DEĞİL DE ORAN (8 Ekim 2026)
 * Önce puan "en uzundan kaç harf kısa" sorusuna bakıyordu: 0 harf 10,
 * 1 harf 7, 2 harf 5, gerisi 0. Ölçüm bunun üst seviyelerde
 * çalışmadığını gösterdi:
 *
 *   Seviye  En uzun (ort)  Puan getiren kelimelerin oranı
 *   Isınma      4.85                 %87
 *   Normal      5.74                 %66
 *   Zor         6.50                 %43
 *   Usta        7.51                 %24
 *
 * Usta'da havuzdan yüz kelime çıkıyor ama dördünden üçü sıfır
 * getiriyordu: oyuncu gayet iyi bir kelime yazıp hiçbir şey
 * alamıyordu. İki harf sabit bir eşik; en uzun kelime uzadıkça aynı
 * iki harf giderek küçük bir hata oluyor.
 *
 * Artık ölçüt ORAN: yazdığın kelime, bulunabilecek en uzunun ne
 * kadarı? Böylece eşik seviyeyle birlikte kendiliğinden genişliyor ve
 * ayrı bir seviye tablosu tutmak gerekmiyor.
 */
export function puanlaKelime(
  d: { uzaklik: number; enUzunUzunluk?: number; harfSayisi?: number },
  kalanSaniye: number,
  toplamSaniye: number,
  ilkBulanMi: boolean,
): Puan {
  const enUzun = d.enUzunUzunluk ?? 0;
  const harf = d.harfSayisi ?? Math.max(0, enUzun - d.uzaklik);
  const oran = enUzun > 0 ? harf / enUzun : 0;

  let taban = 0;
  if (d.uzaklik === 0) taban = 10;
  else if (harf === 0) taban = 0;
  else if (oran >= 0.8) taban = 7;
  else if (oran >= 0.65) taban = 5;
  else if (oran >= 0.5) taban = 3;

  let hiz = 0;
  if (taban === 10 && toplamSaniye > 0) {
    hiz = Math.round((5 * Math.max(0, kalanSaniye)) / toplamSaniye);
  }
  const ilk = taban > 0 && ilkBulanMi ? 2 : 0;
  return { taban, hiz, ilk, toplam: taban + hiz + ilk };
}
