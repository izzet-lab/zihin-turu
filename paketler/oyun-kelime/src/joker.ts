/**
 * joker.ts — Kelime turunun jokerleri.
 *
 * NEDEN VAR
 * Sayı turunda takılan oyuncu joker kullanıp kurtulabiliyordu; kelime
 * turunda takılan boş elle çıkıyordu. Aynı platformda iki oyundan
 * birinin çıkış yolu olmaması, kelime turunu "daha zor" değil "daha
 * kötü" yapıyordu.
 *
 * TEMEL KURAL DEĞİŞMEDİ: joker cevabı vermez, yolu daraltır. En uzun
 * kelimenin tamamı tur bitmeden ASLA gösterilmez (kural 8); tur sonunda
 * sonuç ekranında zaten açılıyor.
 *
 * HAK VE BEDEL SAYI TURUYLA ORTAK. Tur başına 3 hak, her joker puanın
 * %20'sini çarpımsal olarak götürüyor, Günün Turu'nda cevabı büyük
 * ölçüde veren joker bir kez kullanılabiliyor. Kuralların kendisi
 * `@tamisabet/cekirdek` içindeki `joker.ts`'te; burada yalnızca bu
 * oyuna özgü olan "joker NE yapar" kısmı var.
 *
 * BİRDEN ÇOK EN UZUN KELİME
 * Havuzdan aynı uzunlukta birkaç kelime çıkabiliyor. İpucu hepsine
 * birden uymalı, yoksa joker oyuncuyu yanlış kelimeye yönlendirir ve
 * cezalandırır:
 *
 * - "İlk harfi aç" yalnızca en uzun kelimelerin HEPSİ aynı harfle
 *   başlıyorsa açılır; başlamıyorsa devre dışı ve sebebi yazılır.
 * - "Fazla harfi sil" yalnızca HİÇBİR en uzun kelimede geçmeyen bir
 *   harfi siler. Bir harf tek bir uzun kelimede bile geçiyorsa durur.
 */

import { EN_KISA_KELIME, harfSay } from './mantik.ts';
import { turkceKucult, type Sozluk } from './sozluk.ts';

/** Kelime turundaki joker türleri. */
export type KelimeJokerTip = 'uzunluk' | 'ilkHarf' | 'fazlaHarf' | 'sure';

/** Bilinen tür listesi — sunucu doğrulaması bunu kullanıyor. */
export const KELIME_JOKER_TURLERI: readonly KelimeJokerTip[] = [
  'uzunluk',
  'ilkHarf',
  'fazlaHarf',
  'sure',
];

/**
 * Günün Turu'nda en fazla bir kez kullanılabilen jokerler.
 * "İlk harfi aç", sayı turundaki "Bir adım aç"ın karşılığı: tekrar
 * tekrar kullanılırsa cevabı açmaya yaklaşır ve bu tur lige işler.
 */
export const KELIME_TEK_KULLANIMLIK_JOKERLER: readonly KelimeJokerTip[] = ['ilkHarf'];

/** Süre jokerinin eklediği saniye — sayı turuyla aynı. */
export const KELIME_SURE_JOKERI_SANIYE = 15;

export type KelimeJokerSonuc =
  | { tip: 'uzunluk'; uzunluk: number }
  | { tip: 'ilkHarf'; harf: string; havuzIndeksi: number }
  | { tip: 'fazlaHarf'; indeks: number; harf: string }
  | { tip: 'sure'; ekSaniye: number }
  | null;

/**
 * Havuzdan türetilebilen EN UZUN kelimelerin hepsi.
 *
 * `enUzunKelime` yalnızca birini döndürüyor; jokerler "hepsine uyan
 * ipucu" verebilmek için tamamını bilmek zorunda.
 *
 * `enCok` ile sınırlı: aynı uzunlukta onlarca kelime çıkabiliyor ve
 * hepsini taramak turu açarken telefonu dondurur. Sınıra takılırsa
 * elde olanlarla çalışılır — ipucu yine hepsine uyar, sadece daha
 * temkinli olur.
 */
export function enUzunKelimeler(
  havuz: readonly string[],
  sozluk: Sozluk,
  enCok = 24,
  sinirMs?: number,
): string[] {
  const baslangic = Date.now();

  const havuzSayim = new Map<string, number>();
  for (const h of havuz) {
    const k = turkceKucult(h);
    havuzSayim.set(k, (havuzSayim.get(k) ?? 0) + 1);
  }

  const yazilabilir = (kelime: string): boolean => {
    const gerek = harfSay(kelime);
    for (const [harf, adet] of gerek) {
      if ((havuzSayim.get(harf) ?? 0) < adet) return false;
    }
    return true;
  };

  let sayac = 0;
  for (let uzunluk = havuz.length; uzunluk >= EN_KISA_KELIME; uzunluk--) {
    const bulunan: string[] = [];
    for (const kelime of sozluk.uzunluktakiler(uzunluk)) {
      if (sinirMs != null && (sayac++ & 511) === 0 && Date.now() - baslangic > sinirMs) {
        // Süre doldu: bu uzunlukta bulduklarımızla yetiniyoruz.
        return bulunan;
      }
      if (yazilabilir(kelime)) {
        bulunan.push(kelime);
        if (bulunan.length >= enCok) return bulunan;
      }
    }
    // İlk dolu uzunluk EN UZUN uzunluktur; aşağıya inmeye gerek yok.
    if (bulunan.length > 0) return bulunan;
  }
  return [];
}

/**
 * Bir jokerin bu TURDA anlamlı olup olmadığı.
 *
 * Hak ve Günün Turu kısıtı çekirdekte denetleniyor; burada yalnızca
 * "bu turda bu jokerin verecek bir şeyi var mı?" sorusu cevaplanıyor.
 * Sebep metni dönüyor: sönük bir düğmenin neden sönük olduğunu
 * söylemeyen arayüz oyuncuya "bozuk" hissi veriyor.
 */
export function kelimeJokerDurumu(
  tip: KelimeJokerTip,
  uzunlar: readonly string[],
  havuz: readonly string[],
  silinenIndeksler: readonly number[],
  sureVar: boolean,
): { acik: true } | { acik: false; sebep: string } {
  if (uzunlar.length === 0) return { acik: false, sebep: 'Bu turda ipucu çıkmadı' };

  if (tip === 'sure') {
    return sureVar ? { acik: true } : { acik: false, sebep: 'Süresiz modda geçersiz' };
  }

  if (tip === 'ilkHarf') {
    const harfler = new Set(uzunlar.map((k) => turkceKucult(k)[0]));
    return harfler.size === 1
      ? { acik: true }
      : { acik: false, sebep: 'En uzun kelimeler farklı harfle başlıyor' };
  }

  if (tip === 'fazlaHarf') {
    return fazlaHarfIndeksi(uzunlar, havuz, silinenIndeksler) != null
      ? { acik: true }
      : { acik: false, sebep: 'Tüm harfler en uzun kelimede kullanılıyor' };
  }

  return { acik: true };
}

/**
 * Hiçbir en uzun kelimede GEREKMEYEN bir harfin raftaki indeksi.
 *
 * "Gerekmeyen" harf sayısıyla ölçülüyor, varlığıyla değil: havuzda iki
 * "a" varken en uzun kelimelerin hepsi tek "a" kullanıyorsa fazladan
 * olan "a" silinebilir. Harfin kendisini aramak bu kopyayı gözden
 * kaçırırdı.
 */
function fazlaHarfIndeksi(
  uzunlar: readonly string[],
  havuz: readonly string[],
  silinenIndeksler: readonly number[],
): number | null {
  // Her harf için, en uzun kelimelerin EN ÇOK kaç tanesini istediği.
  const enCokGerek = new Map<string, number>();
  for (const kelime of uzunlar) {
    for (const [harf, adet] of harfSay(kelime)) {
      enCokGerek.set(harf, Math.max(enCokGerek.get(harf) ?? 0, adet));
    }
  }

  // Raftaki harfleri sayarken silinmiş olanlar hesaba katılmıyor.
  const kalanlar = havuz
    .map((h, i) => ({ harf: turkceKucult(h), i }))
    .filter((x) => !silinenIndeksler.includes(x.i));

  const gorulen = new Map<string, number>();
  for (const { harf, i } of kalanlar) {
    const sira = (gorulen.get(harf) ?? 0) + 1;
    gorulen.set(harf, sira);
    // Bu kopya, en uzun kelimelerin istediğinden fazlaysa silinebilir.
    if (sira > (enCokGerek.get(harf) ?? 0)) return i;
  }
  return null;
}

/**
 * Jokeri uygular ve oyuncuya gösterilecek ipucunu döner.
 *
 * Kullanılamaz durumdaysa null döner — arayüz düğmeyi zaten söndürüyor,
 * bu ikinci kapı. Hiçbir dalda en uzun kelimenin tamamı dönmüyor.
 */
export function kelimeJokerVer(
  tip: KelimeJokerTip,
  uzunlar: readonly string[],
  havuz: readonly string[],
  silinenIndeksler: readonly number[],
  sureVar: boolean,
): KelimeJokerSonuc {
  const durum = kelimeJokerDurumu(tip, uzunlar, havuz, silinenIndeksler, sureVar);
  if (!durum.acik) return null;

  if (tip === 'sure') return { tip, ekSaniye: KELIME_SURE_JOKERI_SANIYE };

  if (tip === 'uzunluk') {
    // Yalnızca uzunluk. Hangi kelime olduğu söylenmiyor.
    return { tip, uzunluk: uzunlar[0]!.length };
  }

  if (tip === 'ilkHarf') {
    const harf = turkceKucult(uzunlar[0]!)[0]!;
    // Raftaki hangi taşın vurgulanacağı: o harfin ilk kopyası.
    const havuzIndeksi = havuz.findIndex(
      (h, i) => turkceKucult(h) === harf && !silinenIndeksler.includes(i),
    );
    return { tip, harf, havuzIndeksi };
  }

  const indeks = fazlaHarfIndeksi(uzunlar, havuz, silinenIndeksler);
  if (indeks == null) return null;
  return { tip, indeks, harf: turkceKucult(havuz[indeks]!) };
}
