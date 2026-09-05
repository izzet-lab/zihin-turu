/**
 * uyelik-daveti.ts — Misafire "üye ol" davetinin NE ZAMAN çıkacağı.
 *
 * Karar mantığı burada saf tutulur; ekranlar yalnızca sonucu uygular.
 * Böylece "üçüncü turdan itibaren, iki turda bir, kapatılınca bir daha
 * yok" gibi kuralları kod okumadan test edip doğrulayabiliyoruz.
 *
 * TASARIM İLKESİ — SOYUT VAAT DEĞİL, SOMUT KAYIP
 * "Üye olursan puanların kalıcı olur" hiçbir şey anlatmıyordu. O anda
 * ekranda gerçek bir kayıp var: oyuncu 11 puan kazandı ve hiçbiri
 * kaydedilmiyor. Bu yüzden davet metinleri her zaman oyuncunun KENDİ
 * sayısını taşır.
 *
 * BIKTIRMAMAK
 * Her turda çıkan davet, hiç çıkmayan davetten kötüdür. Antrenman'da
 * seyrekleştirilir ve "Şimdi değil" denince o oturumda susar.
 */

/** Davetin gösterilebileceği yerler. */
export type DavetYeri = 'antrenman-sonuc' | 'gunun-sonuc' | 'lig' | 'kurulum';

/** Antrenman'da davetin ilk çıkacağı tur. */
export const ANTRENMAN_ILK_TUR = 3;

/** Antrenman'da davetin çıkma aralığı (iki turda bir). */
export const ANTRENMAN_ARALIK = 2;

export interface DavetDurumu {
  yer: DavetYeri;
  girisYapildiMi: boolean;
  /** Bu oturumda kaçıncı tur — yalnızca 'antrenman-sonuc' için. */
  turSayisi?: number;
  /** Oyuncu bu yerdeki daveti bu oturumda kapattı mı? */
  kapatildiMi: boolean;
}

/**
 * Davet gösterilsin mi?
 *
 * - Giriş yapılmışsa hiçbir yerde gösterilmez.
 * - Kapatılmışsa o oturumda bir daha gösterilmez.
 * - Antrenman: 3. turdan itibaren ve iki turda bir (3, 5, 7 …).
 *   İlk iki turda hiç çıkmaz; oyuncu daha oyunu tanımıyor.
 * - Günün Turu: HER SEFERİNDE. Günde tek hak olduğu için bu tek
 *   seferlik bir fırsat; seyrekleştirmek fırsatı büsbütün kaçırmak olur.
 * - Lig ve Kurulum: kapatılmadıysa her zaman.
 */
export function davetGosterilsinMi(d: DavetDurumu): boolean {
  if (d.girisYapildiMi) return false;
  if (d.kapatildiMi) return false;

  if (d.yer === 'antrenman-sonuc') {
    const tur = d.turSayisi ?? 0;
    if (tur < ANTRENMAN_ILK_TUR) return false;
    return (tur - ANTRENMAN_ILK_TUR) % ANTRENMAN_ARALIK === 0;
  }

  return true;
}

/* ------------------------------------------------------------------ */
/* Kapatma hafızası — oturum boyunca                                   */
/* ------------------------------------------------------------------ */

/*
 * "Şimdi değil" denince davet o OTURUM boyunca susar; uygulama yeniden
 * açıldığında yeniden sorulabilir. sessionStorage tam olarak bu ömre
 * sahip. Erişilemediği ortamlarda (gizli sekme, izin kapalı) bellek
 * yedeğine düşülür — depo.ts ile aynı yaklaşım.
 */
const ONEK = 'zihinturu.davet-kapatildi.';
const bellek = new Set<string>();
let bellegeDustu = false;

export function davetKapatildiMi(yer: DavetYeri): boolean {
  if (bellegeDustu) return bellek.has(yer);
  try {
    return window.sessionStorage.getItem(ONEK + yer) === '1';
  } catch {
    bellegeDustu = true;
    return bellek.has(yer);
  }
}

export function davetKapat(yer: DavetYeri): void {
  if (!bellegeDustu) {
    try {
      window.sessionStorage.setItem(ONEK + yer, '1');
      return;
    } catch {
      bellegeDustu = true;
    }
  }
  bellek.add(yer);
}

/** Yalnızca testler için: kapatma hafızasını temizler. */
export function davetHafizasiniSifirla(): void {
  bellek.clear();
  bellegeDustu = false;
  try {
    for (const yer of ['antrenman-sonuc', 'gunun-sonuc', 'lig', 'kurulum']) {
      window.sessionStorage.removeItem(ONEK + yer);
    }
  } catch {
    /* sessionStorage yok — bellek zaten temizlendi */
  }
}
