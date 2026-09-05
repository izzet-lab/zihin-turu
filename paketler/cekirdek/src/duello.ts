/**
 * duello.ts — Düellonun beyni: eşleştirme, maç akışı ve sonuç.
 *
 * NEDEN ÇEKİRDEKTE VE NEDEN SAF
 * Maç akışı oyundan bağımsızdır: "5 tur oynanır, tam isabeti ilk bulan
 * turu kapatır, kimse bulamazsa en yakın kazanır" cümlesinde sayı da
 * harf de geçmez. Bu yüzden burada yaşar ve `hedef`, `rakam` gibi oyuna
 * özgü hiçbir kelime kullanmaz — yalnızca `Dogrulama.uzaklik`'ın
 * "0 ise tam isabet" kuralını uygular (kural 1).
 *
 * Saf olmasının pratik karşılığı: aynı akış hem tarayıcıda hem Edge
 * Function'da çalışır ve gerçek bir maç kurmadan, ağ olmadan, saat
 * beklemeden test edilebilir.
 *
 * ÇÖZÜM SIZMAZ (kural 8)
 * Bu modülde rakibin adımları, kullandığı taşlar ya da zinciri
 * TAŞINMAZ. Taşınabilen tek şey `uzaklik` — bir sayı. Tip düzeyinde de
 * böyle: olaylarda adım alanı yok ki yanlışlıkla eklenemesin.
 */

/* ------------------------------------------------------------------ */
/* Eşleştirme — ELO                                                    */
/* ------------------------------------------------------------------ */

/** Yeni oyuncunun başlangıç derecesi. */
export const BASLANGIC_ELO = 1200;

/** ELO K katsayısı: bir maçın dereceyi en fazla ne kadar oynatabileceği. */
export const ELO_K = 32;

/**
 * A oyuncusunun B'ye karşı kazanma beklentisi (0–1).
 * Standart ELO formülü.
 */
export function kazanmaBeklentisi(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/** Maç sonucu, A'nın gözünden. */
export type MacSonucu = 'kazandi' | 'kaybetti' | 'berabere';

/**
 * Sonuca göre yeni ELO değerleri.
 *
 * Toplam korunur: biri ne kazanırsa diğeri tam olarak onu kaybeder.
 * Böylece havuza puan basılmaz, sıralama zamanla şişmez.
 */
export function eloGuncelle(
  eloA: number,
  eloB: number,
  sonuc: MacSonucu,
): { a: number; b: number } {
  const puanA = sonuc === 'kazandi' ? 1 : sonuc === 'berabere' ? 0.5 : 0;
  const beklenti = kazanmaBeklentisi(eloA, eloB);
  const degisim = Math.round(ELO_K * (puanA - beklenti));
  return { a: eloA + degisim, b: eloB - degisim };
}

/** Kuyrukta beklerken eşleşme aralığının başlangıcı. */
export const ESLESME_BAZ_ARALIK = 100;

/** Her saniye aralığın ne kadar genişlediği. */
export const ESLESME_GENISLEME = 50;

/** Aralığın tavanı — sonsuza kadar genişlerse eşleşme anlamını yitirir. */
export const ESLESME_TAVAN = 600;

/**
 * Kuyrukta `bekleyenSn` saniyedir bekleyen oyuncu için kabul edilebilir
 * ELO farkı.
 *
 * Aralık zamanla genişler: başta yakın rakip aranır, oyuncu bekledikçe
 * ölçüt gevşer. Küçük oyuncu tabanında sabit dar aralık, kimseyi
 * kimseyle eşleştirememek demek.
 */
export function eslesmeAraligi(bekleyenSn: number): number {
  const bekleme = Math.max(0, bekleyenSn);
  return Math.min(ESLESME_TAVAN, ESLESME_BAZ_ARALIK + bekleme * ESLESME_GENISLEME);
}

/** İki oyuncu şu an eşleşebilir mi? Aralık, daha UZUN bekleyene göre alınır. */
export function eslesirMi(
  a: { elo: number; bekleyenSn: number },
  b: { elo: number; bekleyenSn: number },
): boolean {
  const aralik = eslesmeAraligi(Math.max(a.bekleyenSn, b.bekleyenSn));
  return Math.abs(a.elo - b.elo) <= aralik;
}

/**
 * Rakip beklenmeden bota düşülen süre.
 *
 * Sekiz saniye, "aradı ama bulamadı" hissi vermeye yetecek kadar uzun;
 * oyuncuyu boş ekranda bırakmayacak kadar kısa.
 */
export const BOTA_DUSME_SN = 8;

/** Kuyrukta bu kadar bekleyen oyuncuya bot verilir. */
export function botaDusulsunMu(bekleyenSn: number): boolean {
  return bekleyenSn >= BOTA_DUSME_SN;
}

/* ------------------------------------------------------------------ */
/* Maç akışı                                                           */
/* ------------------------------------------------------------------ */

/** Bir düelloda oynanan tur sayısı. */
export const DUELLO_TUR_SAYISI = 5;

/** Maçın iki tarafı. Kim olduğu burayı ilgilendirmez. */
export type Taraf = 'a' | 'b';

/** Bir turun ya da maçın sonucu. */
export type Kazanan = Taraf | 'berabere';

export interface DuelloDurum {
  /** Kaçıncı tur oynanıyor (1'den başlar). */
  tur: number;
  /** Kazanılan tur sayısı. */
  skor: Record<Taraf, number>;
  /** Tur hâlâ oynanıyor mu? */
  turAcik: boolean;
  /**
   * Tarafların hedefe UZAKLIĞI. Rakibe canlı yayınlanan tek bilgi budur;
   * null = henüz bir şey bildirmedi.
   */
  uzaklik: Record<Taraf, number | null>;
  /** Biten turun kazananı; tur açıkken null. */
  turKazanani: Kazanan | null;
  /** Maç bitti mi? */
  bitti: boolean;
  /** Maçın kazananı; maç sürerken null. */
  macKazanani: Kazanan | null;
  /** Maçı terk eden taraf (bağlantı geri gelmedi). */
  ayrilan: Taraf | null;
}

/**
 * Maç olayları.
 *
 * DİKKAT: hiçbir olayda adım, zincir ya da taş alanı YOK. Rakibe giden
 * tek bilgi uzaklıktır (kural 8). Tip böyle kurulduğu için ileride
 * yanlışlıkla eklenemez.
 */
export type DuelloOlay =
  /** Yeni tur açıldı. */
  | { t: 'turBasla' }
  /** Bir taraf hedefe yaklaştı; sunucu doğruladı. */
  | { t: 'uzaklik'; taraf: Taraf; uzaklik: number }
  /** Süre doldu, kimse tam isabet yapamadı. */
  | { t: 'sureDoldu' }
  /** Bağlantısı kopan taraf geri dönmedi; maç sonlanır. */
  | { t: 'ayrildi'; taraf: Taraf };

export function duelloBaslat(): DuelloDurum {
  return {
    tur: 1,
    skor: { a: 0, b: 0 },
    turAcik: true,
    uzaklik: { a: null, b: null },
    turKazanani: null,
    bitti: false,
    macKazanani: null,
    ayrilan: null,
  };
}

/** Hedefe daha yakın olan taraf; ikisi de bildirmediyse ya da eşitse berabere. */
function enYakin(uzaklik: Record<Taraf, number | null>): Kazanan {
  const a = uzaklik.a;
  const b = uzaklik.b;
  if (a == null && b == null) return 'berabere';
  if (a == null) return 'b';
  if (b == null) return 'a';
  if (a === b) return 'berabere';
  return a < b ? 'a' : 'b';
}

/** Skora göre maçın kazananı. */
export function macKazananiBul(skor: Record<Taraf, number>): Kazanan {
  if (skor.a === skor.b) return 'berabere';
  return skor.a > skor.b ? 'a' : 'b';
}

/** Turu kapatır, skoru işler ve gerekiyorsa maçı bitirir. */
function turuKapat(d: DuelloDurum, kazanan: Kazanan): DuelloDurum {
  const skor = { ...d.skor };
  if (kazanan !== 'berabere') skor[kazanan] += 1;

  const sonTurMu = d.tur >= DUELLO_TUR_SAYISI;
  return {
    ...d,
    skor,
    turAcik: false,
    turKazanani: kazanan,
    bitti: sonTurMu,
    macKazanani: sonTurMu ? macKazananiBul(skor) : null,
  };
}

/**
 * Maç durumunu bir olayla ilerletir. Saf: aynı girdi hep aynı çıktıyı verir.
 *
 * Kurallar:
 * - Tam isabet (uzaklık 0) turu ANINDA kapatır; ilk bulan turu alır.
 * - Süre dolarsa hedefe en yakın olan turu alır; eşitlikte berabere.
 * - Beşinci tur kapanınca maç biter; skoru yüksek olan kazanır.
 * - Bağlantısı kopup dönmeyen taraf maçı kaybeder.
 * - Kapanmış tura ya da bitmiş maça gelen olaylar durumu değiştirmez.
 */
export function duelloIndirge(d: DuelloDurum, olay: DuelloOlay): DuelloDurum {
  if (d.bitti) return d;

  if (olay.t === 'ayrildi') {
    const kalan: Taraf = olay.taraf === 'a' ? 'b' : 'a';
    return { ...d, turAcik: false, bitti: true, macKazanani: kalan, ayrilan: olay.taraf };
  }

  if (olay.t === 'turBasla') {
    // Yalnızca kapalı turdan sonra yeni tur açılır.
    if (d.turAcik) return d;
    return {
      ...d,
      tur: d.tur + 1,
      turAcik: true,
      uzaklik: { a: null, b: null },
      turKazanani: null,
    };
  }

  if (!d.turAcik) return d; // tur kapandıktan sonra gelen geç olaylar yok sayılır

  if (olay.t === 'uzaklik') {
    const oncekiUzaklik = d.uzaklik[olay.taraf];
    // Oyuncu hedeften uzaklaşabilir ama BİLDİRİLEN en iyi değer geriye
    // gitmez; yoksa rakibin gördüğü çubuk zıplar ve tur sonu kararı
    // oyuncunun son hamlesine bağlı kalırdı.
    const enIyi = oncekiUzaklik == null ? olay.uzaklik : Math.min(oncekiUzaklik, olay.uzaklik);
    const uzaklik = { ...d.uzaklik, [olay.taraf]: enIyi };

    // Tam isabet turu anında kapatır.
    if (enIyi === 0) return turuKapat({ ...d, uzaklik }, olay.taraf);
    return { ...d, uzaklik };
  }

  // olay.t === 'sureDoldu'
  return turuKapat(d, enYakin(d.uzaklik));
}
