/**
 * SAYI TURU — mantık
 *
 * `tohum-kod/ortak/oyun.js` içindeki çalışan ve test edilmiş mantığın
 * TypeScript'e taşınmış hâli: üretici, geriye arama çözücüsü, ileri
 * üretici, doğrulayıcı, puanlayıcı ve joker. Kurallar birebir korundu;
 * yalnızca tip eklendi ve tohumlu rastgelelik çekirdekten alındı
 * (tek kaynak: `rastgele`, `karistir` çekirdekte yaşar).
 */

import { rastgele, karistir } from '@zihinturu/cekirdek';
import type { Dogrulama, Puan } from '@zihinturu/cekirdek';

/* ------------------------------------------------------------------ */
/* Tipler                                                              */
/* ------------------------------------------------------------------ */

export type Islem = '+' | '−' | '×' | '÷';

/** Bir işlem adımı: a (islem) b = sonuc. */
export interface Adim {
  a: number;
  b: number;
  islem: Islem;
  sonuc: number;
}

/** Turun oyuncuya görünen verisi. `Tur.veri` bunu taşır. */
export interface SayiVeri {
  hedef: number;
  sayilar: number[];
}

/** Çözücünün döndürdüğü ham sonuç (adım zinciriyle birlikte). */
export interface CozSonuc {
  fark: number;
  deger: number | null;
  adimlar: Adim[];
}

/** İç üretim çıktısı: tur + saklanan çözüm. İstemciye çözüm gitmez. */
export interface Uretim {
  seviye: string;
  tohum: number;
  hedef: number;
  sayilar: number[];
  cozum: CozSonuc;
}

interface SeviyeConfig {
  etiket: string;
  hane: number;
  tas: number;
  alt: number;
  ust: number;
  tolerans: [number, number];
  buyukVar: boolean;
  ileri: boolean;
}

/** Zincir arama düğümü. */
interface Dugum {
  d: number;
  yol: Adim[];
}

/* ------------------------------------------------------------------ */
/* Sabitler                                                            */
/* ------------------------------------------------------------------ */

export const KUCUK: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
export const BUYUK: readonly number[] = [25, 50, 75, 100];

const ISLEMLER: readonly Islem[] = ['+', '−', '×', '÷'];

/**
 * Seviyeler. Sıra önemlidir: SEVIYE_ANAHTARLARI bu nesnenin anahtar
 * sırasından türer ve seviye açma zinciri (sonrakiSeviyeAnahtari) buna
 * dayanır.
 *
 * Hane aralıkları kasıtlı olarak örtüşmez — her seviyenin hedefi bir
 * öncekinin üst sınırının üstünde başlar. Örtüşme olsaydı "zor" turda
 * "normal"den kolay bir hedef çıkabilirdi.
 *
 * Not: 'kolay' seviyesi 'normal' ile birleştirildi (bkz. CHANGELOG).
 * Yeni 'normal' 5 taşla 3 haneli hedefleri kapsar.
 */
export const SEVIYELER: Record<string, SeviyeConfig> = {
  cocuk: { etiket: 'Isınma', hane: 2, tas: 4, alt: 10, ust: 99, tolerans: [2, 4], buyukVar: false, ileri: false },
  normal: { etiket: 'Normal', hane: 3, tas: 5, alt: 100, ust: 999, tolerans: [4, 10], buyukVar: true, ileri: false },
  zor: { etiket: 'Zor', hane: 4, tas: 6, alt: 1000, ust: 9999, tolerans: [15, 50], buyukVar: true, ileri: true },
  usta: { etiket: 'Usta', hane: 5, tas: 7, alt: 10000, ust: 99999, tolerans: [100, 500], buyukVar: true, ileri: true },
};

/* ------------------------------------------------------------------ */
/* İşlem kuralları (tek yer)                                           */
/* ------------------------------------------------------------------ */

export function uygula(a: number, b: number, islem: Islem): number | null {
  if (islem === '+') return a + b;
  if (islem === '×') return a * b;
  if (islem === '−') return a - b > 0 ? a - b : null; // negatif ve sıfır yasak
  if (islem === '÷') return b > 0 && a % b === 0 ? a / b : null; // kalansız bölme şart
  return null;
}

/* ------------------------------------------------------------------ */
/* Geriye arama (çözücü)                                               */
/* Küçük hedeflerde hem üretim hem "en iyi çözüm" için kullanılır.     */
/* ------------------------------------------------------------------ */

export function cozZinciri(sayilar: number[], hedef: number, sinirMs = 1500): CozSonuc {
  const t0 = Date.now();
  let enIyi: CozSonuc = { fark: Infinity, deger: null, adimlar: [] };
  const gorulen = new Set<string>();

  function ara(liste: Dugum[]): boolean {
    for (const it of liste) {
      const f = Math.abs(it.d - hedef);
      if (f < enIyi.fark) enIyi = { fark: f, deger: it.d, adimlar: it.yol };
      if (enIyi.fark === 0) return true;
    }
    if (liste.length < 2 || Date.now() - t0 > sinirMs) return false;
    const anahtar = liste.map((x) => x.d).sort((a, b) => a - b).join(',');
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);

    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const a = liste[i]!;
        const b = liste[j]!;
        const kalan = liste.filter((_, k) => k !== i && k !== j);
        const ust = a.d >= b.d ? a : b;
        const alt = a.d >= b.d ? b : a;
        for (const islem of ISLEMLER) {
          if (islem === '×' && alt.d === 1) continue; // işe yaramaz dal
          if (islem === '÷' && alt.d === 1) continue;
          const sonuc = uygula(ust.d, alt.d, islem);
          if (sonuc === null) continue;
          const dugum: Dugum = { d: sonuc, yol: ust.yol.concat(alt.yol, [{ a: ust.d, b: alt.d, islem, sonuc }]) };
          if (ara(kalan.concat([dugum]))) return true;
        }
      }
    }
    return false;
  }

  ara(sayilar.map((s) => ({ d: s, yol: [] as Adim[] })));
  return enIyi;
}

/* ------------------------------------------------------------------ */
/* İleri üretim                                                        */
/* 4-5 hanede geriye arama çok yavaşlıyor. Burada çözüm aranmıyor,     */
/* inşa ediliyor: geçerli bir zincir kurup sonucunu hedef ilan ediyor. */
/* Çözülebilirlik tanım gereği garanti.                                */
/* ------------------------------------------------------------------ */

interface IleriSonuc {
  hedef: number;
  adimlar: Adim[];
  sayilar: number[];
}

function ileriUret(S: SeviyeConfig, buyukAdet: number, r: () => number, denemeSiniri = 4000): IleriSonuc | null {
  const buyuk = S.buyukVar ? Math.min(buyukAdet, S.tas) : 0;
  for (let t = 0; t < denemeSiniri; t++) {
    const sayilar = karistir(BUYUK, r)
      .slice(0, buyuk)
      .concat(karistir(KUCUK.concat(KUCUK), r).slice(0, S.tas - buyuk));
    let liste: Dugum[] = sayilar.map((d) => ({ d, yol: [] }));
    let tikandi = false;
    while (liste.length > 1) {
      const i = Math.floor(r() * liste.length);
      let j = Math.floor(r() * (liste.length - 1));
      if (j >= i) j++;
      const a = liste[i]!;
      const b = liste[j]!;
      const ust = a.d >= b.d ? a : b;
      const alt = a.d >= b.d ? b : a;
      // Hedefe ne kadar yol kaldıysa çarpma o kadar ağırlıklanır,
      // yoksa rastgele toplama zinciri on binlere hiç ulaşmaz.
      const enBuyuk = liste.reduce((m, x) => Math.max(m, x.d), 1);
      const carpAgirlik = S.ust / enBuyuk > 50 ? 6 : S.ust / enBuyuk > 8 ? 3 : 1;
      const adaylar: { islem: Islem; sonuc: number }[] = [];
      for (const islem of ISLEMLER) {
        if ((islem === '×' || islem === '÷') && alt.d === 1) continue;
        const sonuc = uygula(ust.d, alt.d, islem);
        if (sonuc === null) continue;
        const tekrar = islem === '×' ? carpAgirlik : 1;
        for (let w = 0; w < tekrar; w++) adaylar.push({ islem, sonuc });
      }
      if (!adaylar.length) {
        tikandi = true;
        break;
      }
      const s = adaylar[Math.floor(r() * adaylar.length)]!;
      const dugum: Dugum = {
        d: s.sonuc,
        yol: ust.yol.concat(alt.yol, [{ a: ust.d, b: alt.d, islem: s.islem, sonuc: s.sonuc }]),
      };
      liste = liste.filter((_, k) => k !== i && k !== j).concat([dugum]);
    }
    if (tikandi) continue;
    const deger = liste[0]!.d;
    if (deger >= S.alt && deger <= S.ust) return { hedef: deger, adimlar: liste[0]!.yol, sayilar };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Tur üretimi (tek iç giriş kapısı)                                   */
/* Aynı tohum aynı turu üretir: günün turu, rövanş, maç tekrarı buna   */
/* dayanır. Başarısızsa tohumu bir artırıp yeniden dener (pratikte     */
/* imkânsız ama turu oynanabilir bırakır).                             */
/* ------------------------------------------------------------------ */

export function uretimYap(seviyeAdi: string, tohum: number, buyukAdet?: number): Uretim {
  const S = SEVIYELER[seviyeAdi];
  if (!S) throw new Error('Bilinmeyen seviye: ' + seviyeAdi);
  const ba = buyukAdet ?? (S.buyukVar ? 2 : 0);
  const r = rastgele(tohum);

  if (S.ileri) {
    const u = ileriUret(S, ba, r);
    if (u)
      return {
        seviye: seviyeAdi,
        tohum,
        hedef: u.hedef,
        sayilar: u.sayilar,
        cozum: { fark: 0, deger: u.hedef, adimlar: u.adimlar },
      };
  } else {
    const buyuk = S.buyukVar ? Math.min(ba, S.tas) : 0;
    for (let t = 0; t < 80; t++) {
      const sayilar = karistir(BUYUK, r)
        .slice(0, buyuk)
        .concat(karistir(KUCUK.concat(KUCUK), r).slice(0, S.tas - buyuk));
      const hedef = S.alt + Math.floor(r() * (S.ust - S.alt + 1));
      const cozum = cozZinciri(sayilar, hedef, 300);
      if (cozum.fark === 0) return { seviye: seviyeAdi, tohum, hedef, sayilar, cozum };
    }
  }
  return uretimYap(seviyeAdi, (tohum + 1) >>> 0, ba);
}

/* ------------------------------------------------------------------ */
/* Doğrulama (SUNUCUDA ÇALIŞIR)                                        */
/* Adım zincirini baştan sona yeniden hesaplar; her taşın en fazla bir */
/* kez kullanıldığını burada denetler.                                 */
/* ------------------------------------------------------------------ */

export function dogrulaZinciri(sayilar: number[], adimlar: Adim[], hedef: number): Dogrulama {
  const havuz = sayilar.slice();
  const uret: number[] = []; // ara sonuç taşları
  const hata = (m: string): Dogrulama => ({ gecerli: false, hata: m, uzaklik: Infinity });

  if (!Array.isArray(adimlar) || !adimlar.length) return hata('Adım yok.');
  if (adimlar.length > sayilar.length - 1) return hata('Adım sayısı taş sayısını aşıyor.');

  function tuket(deger: number): boolean {
    let i = havuz.indexOf(deger);
    if (i >= 0) {
      havuz.splice(i, 1);
      return true;
    }
    i = uret.indexOf(deger);
    if (i >= 0) {
      uret.splice(i, 1);
      return true;
    }
    return false;
  }

  let son: number | null = null;
  for (const ad of adimlar) {
    if (!ISLEMLER.includes(ad.islem)) return hata('Geçersiz işlem: ' + ad.islem);
    if (!Number.isInteger(ad.a) || !Number.isInteger(ad.b)) return hata('Tam sayı değil.');
    if (!tuket(ad.a)) return hata(ad.a + ' kullanılabilir değil.');
    if (!tuket(ad.b)) return hata(ad.b + ' kullanılabilir değil.');
    const sonuc = uygula(ad.a, ad.b, ad.islem);
    if (sonuc === null) return hata(ad.a + ' ' + ad.islem + ' ' + ad.b + ' kuraldışı.');
    if (sonuc !== ad.sonuc) return hata('Bildirilen sonuç yanlış: ' + ad.sonuc + ' ≠ ' + sonuc);
    uret.push(sonuc);
    son = sonuc;
  }
  return { gecerli: true, uzaklik: Math.abs((son as number) - hedef), ozet: 'Ulaşılan: ' + son };
}

/* ------------------------------------------------------------------ */
/* Günün Turu puan çarpanı                                             */
/* 0-15 aralığı küçük hissettiriyor; ×10 ile tam isabet 150 oluyor.    */
/* Yalnızca Günün Turu'na uygulanır — antrenman puanları ayrı kalsın.  */
/* ------------------------------------------------------------------ */

export const GUNUN_TURU_CARPANI = 10;

/* ------------------------------------------------------------------ */
/* Puanlama                                                            */
/* 10/7/5 tablosu + hız primi. Hız primi yalnızca tam isabette verilir:*/
/* yaklaşık cevabı hızlı vermek ödüllendirilmez.                       */
/* ------------------------------------------------------------------ */

export function puanlaHesap(
  seviyeAdi: string,
  fark: number,
  kalanSaniye: number,
  toplamSaniye: number,
  ilkBuzzer: boolean,
): Puan {
  const S = SEVIYELER[seviyeAdi];
  if (!S) throw new Error('Bilinmeyen seviye: ' + seviyeAdi);
  let taban = 0;
  if (fark === 0) taban = 10;
  else if (fark <= S.tolerans[0]) taban = 7;
  else if (fark <= S.tolerans[1]) taban = 5;

  let hiz = 0;
  if (taban === 10 && toplamSaniye > 0) hiz = Math.round((5 * Math.max(0, kalanSaniye)) / toplamSaniye); // 0-5
  const ilk = taban > 0 && ilkBuzzer ? 2 : 0;
  return { taban, hiz, ilk, toplam: taban + hiz + ilk };
}

/* ------------------------------------------------------------------ */
/* Antrenman risk çarpanı                                              */
/* Oyuncu kısa süre seçerse daha çok puan kazanır — riski göze aldığı  */
/* için. Yalnızca Antrenman'da geçerlidir: Günün Turu'nda süre seviyeye*/
/* sabittir, yoksa puanlar kıyaslanamaz olur ve lig bozulur.           */
/* ------------------------------------------------------------------ */

export const ANTRENMAN_SURE_CARPANI: Record<number, number> = {
  90: 1,
  60: 1.5,
  30: 2.5,
  15: 4,
};

/** Verilen süre için risk çarpanı. Listede yoksa (süresiz dahil) 1. */
export function antrenmanCarpani(sure: number): number {
  return ANTRENMAN_SURE_CARPANI[sure] ?? 1;
}

/**
 * Seviye çarpanı: zor seviye daha çok puan getirir. Süre çarpanıyla
 * aynı gerekçeye dayanır — Antrenman'da yalnızca bunu göze alanlar
 * kazanır; Günün Turu'nda uygulanmaz.
 */
export const ANTRENMAN_SEVIYE_CARPANI: Record<string, number> = {
  cocuk: 0.5,
  normal: 1,
  zor: 1.5,
  usta: 2,
};

/** Verilen seviye için çarpan. Bilinmeyen seviye için 1. */
export function seviyeCarpani(seviye: string): number {
  return ANTRENMAN_SEVIYE_CARPANI[seviye] ?? 1;
}

/** Antrenman'da uygulanan toplam çarpan: süre çarpanı × seviye çarpanı. */
export function antrenmanToplamCarpani(seviye: string, sure: number): number {
  return antrenmanCarpani(sure) * seviyeCarpani(seviye);
}

/* ------------------------------------------------------------------ */
/* Joker                                                               */
/* Kelime oyununda joker "harf açar". Sayıda karşılığı çözümün bir     */
/* adımını açmaktır — cevabı vermez, yolu daraltır.                    */
/* ------------------------------------------------------------------ */

export type JokerTip = 'adim' | 'yanlis' | 'sure';

export type JokerSonuc =
  | { tip: 'adim'; metin: string; indeks: number }
  | { tip: 'yanlis'; indeks: number; tas: number }
  | { tip: 'sure'; ekSaniye: number }
  | null;

/** Her joker türünün puan maliyeti. */
export const JOKER_MALIYET: Record<JokerTip, number> = {
  adim: 3,
  yanlis: 2,
  sure: 2,
};

/** Tur başına toplam joker hakkı (tür fark etmeksizin). */
export const JOKER_HAK_SAYISI = 3;

/**
 * Çözümün hiçbir adımında kullanılmayan orijinal taşların indeksleri
 * (`uretim.sayilar` içindeki konum — aynı zamanda raftaki taşın
 * kimliğidir, bkz. `motor.ts` `baslat()`). Aynı değerden birden fazla
 * taş varsa (ör. iki adet 5) yalnızca gerçekten harcanmayan kopya
 * döner; öbürü çözümde kullanılıyorsa listeye girmez.
 *
 * "İleri üretim" kullanan seviyelerde (Zor, Usta) zincir tüm taşları
 * tek sonuca kadar birleştirdiği için bu liste normalde BOŞTUR —
 * "Yanlışı sil" jokerinin bu seviyelerde devre dışı kalmasının sebebi
 * budur.
 */
export function kullanilmayanTasIndeksleri(uretim: Uretim): number[] {
  const havuz = uretim.sayilar.map((deger, indeks) => ({ deger, indeks, kullanildi: false }));
  const uret: number[] = []; // ara sonuçlar

  function tuket(deger: number): boolean {
    const h = havuz.find((x) => !x.kullanildi && x.deger === deger);
    if (h) {
      h.kullanildi = true;
      return true;
    }
    const i = uret.indexOf(deger);
    if (i >= 0) {
      uret.splice(i, 1);
      return true;
    }
    return false;
  }

  for (const ad of uretim.cozum.adimlar) {
    tuket(ad.a);
    tuket(ad.b);
    uret.push(ad.sonuc);
  }

  return havuz.filter((h) => !h.kullanildi).map((h) => h.indeks);
}

export function jokerVer(
  uretim: Uretim,
  tip: JokerTip,
  secenek?: { kullanilanAdim?: number; disHaricTutulan?: number[] },
): JokerSonuc {
  if (tip === 'adim') {
    const i = secenek?.kullanilanAdim ?? 0;
    const ad = uretim.cozum.adimlar[i];
    return ad ? { tip, metin: bicimle(ad), indeks: i } : null;
  }
  if (tip === 'yanlis') {
    // Çözümde hiç kullanılmayan bir taşı bul — bu taşı silmek cevabı
    // vermez, yalnızca yolu daraltır (yanlış bir dalı eler).
    const haric = new Set(secenek?.disHaricTutulan ?? []);
    const aday = kullanilmayanTasIndeksleri(uretim).find((i) => !haric.has(i));
    if (aday === undefined) return null; // çözümde tüm taşlar kullanılıyor
    return { tip, indeks: aday, tas: uretim.sayilar[aday]! };
  }
  if (tip === 'sure') return { tip, ekSaniye: 15 };
  return null;
}

/**
 * Kullanılan jokerlerin toplam maliyetini temel puandan düşer.
 * Puan hiçbir zaman 0'ın altına düşmez.
 */
export function jokerliPuan(temelToplam: number, kullanilanJokerler: readonly JokerTip[]): number {
  const maliyet = kullanilanJokerler.reduce((t, j) => t + JOKER_MALIYET[j], 0);
  return Math.max(0, temelToplam - maliyet);
}

/** Bir adımı okunur metne çevirir: "6 × 7 = 42". */
export function bicimle(ad: Adim): string {
  return ad.a + ' ' + ad.islem + ' ' + ad.b + ' = ' + ad.sonuc;
}
