/**
 * joker.ts — Bütün oyunların ortak joker kuralları.
 *
 * NEDEN ÇEKİRDEKTE
 * Joker "cevabı vermez, yolu daraltır" fikri oyuna özgü değil. Hak
 * sayısı, puan bedeli ve Günün Turu kısıtı her oyunda aynı olmalı;
 * yoksa sayı turunda pahalı, kelime turunda bedava bir hak çıkar ve
 * iki oyunun puanları kıyaslanamaz hale gelir (genel sıralama ikisini
 * topluyor). Oyuna özgü olan tek şey jokerin NE yaptığı; o kısım
 * `paketler/oyun-*` içinde kalır.
 *
 * BEDEL NEDEN ÇARPIMSAL, NEDEN SABİT PUAN DEĞİL
 * Eskiden her jokerin sabit bir puan bedeli vardı (3/2/2) ve temel
 * puandan düşülüyordu. Temel puan 0–15 aralığında olduğu için üç
 * joker, tam isabetin neredeyse tamamını siliyordu:
 *
 *   Günün Turu, tam isabet, 3 joker : (10 + 1 − 9) × 10 =  20 puan
 *   Günün Turu, jokersiz "yakın"    :            7  × 10 =  70 puan
 *
 * Yani jokerle tam isabet bulmak, jokersiz ıskalamaktan DAHA AZ puan
 * veriyordu. Teşvik tersine dönüyor: oyuncu takıldığında joker
 * kullanmak yerine turu çöpe atmayı seçiyor. 20 Ekim 2026'da proje
 * sahibi tam bu durumu bildirdi (Normal, 3 "Bir adım aç" → 20 puan).
 *
 * Yeni kural: her joker o turun puanını %20 düşürür ve kesintiler
 * çarpımsaldır. Bedel puanın büyüklüğüne göre ölçeklendiği için her
 * seviyede, her modda aynı oranda hissedilir:
 *
 *   1 joker ×0.8 · 2 joker ×0.64 · 3 joker ×0.512
 *
 * Aynı örnek yeni kuralla: tam isabet 150 × 0.512 ≈ 77 puan — hâlâ
 * jokersiz "yakın"ın (70) üstünde. Joker artık pahalı ama mantıklı.
 */

/** Her jokerin puana etkisi: o turun puanı bu katsayıyla çarpılır. */
export const JOKER_PUAN_ORANI = 0.8;

/**
 * Verilen sayıda joker kullanıldığında puanın çarpılacağı katsayı.
 * Çarpımsal: ikinci joker, birincisinden ARTA KALAN puanın %20'sini
 * götürür. Böylece puan hiçbir zaman sıfıra inmez, sadece erir.
 */
export function jokerPuanCarpani(jokerSayisi: number): number {
  const n = Math.max(0, Math.floor(jokerSayisi));
  return Math.pow(JOKER_PUAN_ORANI, n);
}

/** Tur başına toplam joker hakkı (tür fark etmeksizin). */
export const JOKER_HAK_SAYISI = 3;

/**
 * Ödüllü reklam izleyerek kazanılabilen EK joker hakkı — tur başına
 * en fazla bir kez.
 *
 * Yalnızca Antrenman'da geçerlidir. Günün Turu'nda joker reklamı
 * yoktur (lig adaleti: reklam izleyebilen oyuncu daha çok hak alamaz).
 */
export const ODULLU_EK_JOKER = 1;

/** Bir turda kullanılabilecek EN FAZLA joker sayısı. */
export function jokerUstSiniri(mod: 'gunun' | 'antrenman'): number {
  return mod === 'antrenman' ? JOKER_HAK_SAYISI + ODULLU_EK_JOKER : JOKER_HAK_SAYISI;
}

/**
 * Günün Turu'nda "cevabı büyük ölçüde veren" jokerlerin kullanım
 * sınırı.
 *
 * NEDEN VAR
 * Isınma seviyesinde çözüm üç adım. "Bir adım aç" jokerini üç kez
 * kullanmak cevabın tamamını açmak demek — ve Günün Turu lige işliyor.
 * Lig tablosunun tepesi, bulan değil joker hakkını harcayan oyuncuyla
 * dolardı. Antrenman'da sınır yok: orası lige işlemiyor ve öğrenmek
 * için jokeri serbest kullanmak doğru.
 *
 * Kelime turunda karşılığı "İlk harfi aç".
 */
export const GUNUN_TURU_TEK_KULLANIM = 1;

/**
 * Joker listesini tür bazında denetler.
 *
 * `tekKullanimlikTipler`, Günün Turu'nda en fazla bir kez
 * kullanılabilecek tür adlarıdır. Kural ihlali varsa oyuncunun
 * göreceği Türkçe metin döner, sorun yoksa null.
 *
 * Hem istemci hem Edge Function bunu çağırır: istemcinin "ben kurala
 * uydum" demesine güvenilmez (kural 2).
 */
export function jokerTipDenetimi(
  kullanilanJokerler: readonly string[],
  tekKullanimlikTipler: readonly string[],
  mod: 'gunun' | 'antrenman',
): string | null {
  if (mod !== 'gunun') return null;
  for (const tip of tekKullanimlikTipler) {
    const adet = kullanilanJokerler.filter((j) => j === tip).length;
    if (adet > GUNUN_TURU_TEK_KULLANIM) {
      return 'Günün Turu\'nda bu joker en fazla ' + GUNUN_TURU_TEK_KULLANIM + ' kez kullanılabilir.';
    }
  }
  return null;
}

/**
 * Bir jokerin ŞU AN kullanılabilir olup olmadığı.
 *
 * Arayüz düğmeyi buna göre söndürür; sunucu da aynı kuralı gönderimde
 * uygular. Sebep metni dönüyor çünkü sönük bir düğmenin neden sönük
 * olduğunu söylemeyen arayüz, oyuncuya "bozuk" hissi veriyor.
 */
export function jokerKullanilabilirMi(
  tip: string,
  kullanilanJokerler: readonly string[],
  tekKullanimlikTipler: readonly string[],
  mod: 'gunun' | 'antrenman',
): { acik: true } | { acik: false; sebep: string } {
  if (kullanilanJokerler.length >= jokerUstSiniri(mod)) {
    return { acik: false, sebep: 'Joker hakkın kalmadı.' };
  }
  if (mod === 'gunun' && tekKullanimlikTipler.includes(tip)) {
    const adet = kullanilanJokerler.filter((j) => j === tip).length;
    if (adet >= GUNUN_TURU_TEK_KULLANIM) {
      return { acik: false, sebep: 'Günün Turu\'nda bir kez kullanılabilir.' };
    }
  }
  return { acik: true };
}
