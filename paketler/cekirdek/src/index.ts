/**
 * ZİHİN TURU — ÇEKİRDEK
 *
 * Platform oyunu bilmez. Sayı turu da kelime turu da bu dosyadaki
 * arayüzü uygulayan birer eklentidir. Platform kodunda "hedef",
 * "rakam", "harf" gibi oyuna özgü kelimeler geçmemelidir.
 */

/** Bir seviyenin tanımı. Lig tabloları seviye başına ayrı tutulur. */
export interface Seviye {
  /** Kalıcı anahtar. Veritabanına bu yazılır, değiştirilmez. */
  anahtar: string;
  /** Kullanıcıya gösterilen ad. */
  etiket: string;
  /** Lig tablosunda başlık: "3 hane", "7 harf" gibi. */
  altEtiket: string;
  /** Rekabet modlarındaki tur süresi (saniye). 0 yasak. */
  sure: number;
  /** Bu seviyede antrenman süresiz oynanabilir mi? */
  antrenmanSuresiz: boolean;
}

/** Üretilmiş bir tur. `tohum` dışındaki her şey tohumdan türer. */
export interface Tur {
  oyun: string;
  seviye: string;
  tohum: number;
  /** Oyuncuya gösterilecek veri: sayılar+hedef ya da harfler. */
  veri: unknown;
}

/** Oyuncunun gönderdiği cevap. İçeriği oyuna göre değişir. */
export interface Cevap {
  icerik: unknown;
}

/** Sunucunun cevabı yeniden hesaplayıp verdiği karar. */
export interface Dogrulama {
  gecerli: boolean;
  /** Geçersizse sebep — kullanıcıya gösterilebilir olmalı. */
  hata?: string;
  /**
   * Hedefe ne kadar yaklaşıldığı. 0 = tam isabet.
   * Kelime turunda "en uzun kelimeye kaç harf kaldı".
   * Platform yalnızca bu sayıyı bilir, anlamını bilmez.
   */
  uzaklik: number;
  /** Sonuç ekranında gösterilecek kısa özet. */
  ozet?: string;
}

export interface Puan {
  taban: number;
  hiz: number;
  ilk: number;
  toplam: number;
}

/** Tur bitince açıklanan çözüm. Tur bitmeden istemciye GİTMEZ. */
export interface Cozum {
  uzaklik: number;
  /** Tahtaya satır satır yazılacak adımlar. */
  satirlar: string[];
}

/**
 * Bir oyunun platforma takılma noktası.
 * Beş üye. Fazlası platformun oyunu tanımaya başladığı anlamına gelir.
 */
export interface TurSaglayici {
  readonly ad: string;
  readonly seviyeler: readonly Seviye[];

  /** Aynı tohum her zaman aynı turu üretmeli. Test bunu doğrular. */
  turUret(seviye: string, tohum: number): Tur;

  /** SUNUCUDA çalışır. İstemcinin bildirdiğine asla güvenilmez. */
  dogrula(tur: Tur, cevap: Cevap): Dogrulama;

  puanla(
    seviye: string,
    d: Dogrulama,
    kalanSaniye: number,
    toplamSaniye: number,
    ilkBulanMi: boolean,
  ): Puan;

  /** Bot ve tur sonu açıklaması için. */
  cozumBul(tur: Tur, sinirMs?: number): Cozum;
}

/* ------------------------------------------------------------------ */
/* Tohumlu rastgelelik                                                 */
/* Math.random() kullanılamaz: Günün Turu'nda herkesin aynı bulmacayı  */
/* görmesi ve sunucunun aynı turu yeniden üretebilmesi gerekiyor.      */
/* ------------------------------------------------------------------ */

/** mulberry32 — 32 bit tohumdan deterministik akış. */
export function rastgele(tohum: number): () => number {
  let t = tohum >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Metinden tohum: "2026-08-16:sayi:normal" → sayı (FNV-1a). */
export function tohumla(metin: string): number {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function karistir<T>(dizi: readonly T[], r: () => number): T[] {
  const a = dizi.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const gecici = a[i]!;
    a[i] = a[j]!;
    a[j] = gecici;
  }
  return a;
}

/** Günün turu: tarih + oyun + seviye → herkeste aynı tohum. */
export function gunlukTohum(oyun: string, seviye: string, gun?: string): number {
  const tarih = gun ?? new Date().toISOString().slice(0, 10);
  return tohumla(`${tarih}:${oyun}:${seviye}`);
}

/* ------------------------------------------------------------------ */
/* Kayıt defteri                                                       */
/* ------------------------------------------------------------------ */

const kayitlar = new Map<string, TurSaglayici>();

export function oyunKaydet(saglayici: TurSaglayici): void {
  kayitlar.set(saglayici.ad, saglayici);
}

export function oyunAl(ad: string): TurSaglayici {
  const o = kayitlar.get(ad);
  if (!o) throw new Error(`Kayıtlı olmayan oyun: ${ad}`);
  return o;
}

export function oyunlar(): TurSaglayici[] {
  return [...kayitlar.values()];
}
