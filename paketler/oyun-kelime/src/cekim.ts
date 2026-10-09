/**
 * cekim.ts — Çekimli biçimleri tanır.
 *
 * SORUN
 * Sözlük Zemberek'in KÖK listesinden üretiliyor: "kitap" var, "kitabı"
 * yok. Oyuncu bildiği bir kelimeyi yazıp reddedildiğinde oyunu değil
 * kendini sorgular; bu, kelime oyununda en can sıkıcı an.
 *
 * NEDEN LİSTEYE EKLEMİYORUZ
 * Yirmi beş bin kökün bütün hâl ve iyelik biçimlerini üretmek listeyi
 * üç yüz binin üzerine çıkarır — paket birkaç megabayt büyür ve
 * telefona her gün inen şey bu olur. Oysa çekim bir KURAL; kuralı
 * uygulamak listeyi şişirmekten hem küçük hem doğru.
 *
 * NASIL ÇALIŞIYOR
 * Kelimenin sonundan tanınan bir ek soyulup kalan gövde sözlükte
 * aranıyor. Bulunamazsa bir ek daha soyuluyor (en çok üç kez):
 * "kitabında" → "kitabın" → "kitab" → ünsüz yumuşaması geri alınır →
 * "kitap". Üçünden biri sözlükte varsa kelime kabul edilir.
 *
 * KASITLI CÖMERTLİK
 * Bu yöntem bazen olmayan bir çekimi de kabul eder. Bilerek: bir
 * kelime oyununda fazladan kabul etmenin bedeli, haklı bir cevabı
 * reddetmenin bedelinden çok küçük.
 */

import { turkceKucult, type Sozluk } from './sozluk.ts';

/** Ünlüyle başlayan ek mi? Bağlı gövdeler yalnızca bunlardan önce gelir. */
const UNLULER = 'aeıioöuü';

/** En çok kaç ek soyulur. Üçten fazlası uydurma gövdeler üretmeye başlıyor. */
export const EN_FAZLA_EK = 3;

/** Soyulan gövde bundan kısaysa aramaya devam edilmez. */
const EN_KISA_GOVDE = 2;

/**
 * Tanınan ek yüzeyleri — uzundan kısaya.
 *
 * Yüzey biçimler yazılı: ünlü uyumunun bütün hâlleri ayrı satır. Eki
 * kurallarla üretmek yerine böyle listelemek, hangi biçimin tanındığını
 * okunur kılıyor.
 */
const EKLER: readonly string[] = [
  // --- iyelik: biz ve siz (en uzunlar başta) ---
  'ımız', 'imiz', 'umuz', 'ümüz',
  'ınız', 'iniz', 'unuz', 'ünüz',
  'mız', 'miz', 'muz', 'müz',
  'nız', 'niz', 'nuz', 'nüz',

  // --- hâl ekleri, tamponlu biçimler ve birleşimler ---
  'nın', 'nin', 'nun', 'nün',
  'ndan', 'nden',
  'ları', 'leri',
  'lar', 'ler',
  'dan', 'den', 'tan', 'ten',
  'da', 'de', 'ta', 'te',
  'sı', 'si', 'su', 'sü',
  'yı', 'yi', 'yu', 'yü',
  'ya', 'ye',
  'ın', 'in', 'un', 'ün',
  'na', 'ne', 'nı', 'ni', 'nu', 'nü',

  // --- ile: ayrı yazılabildiği gibi bitişik de yazılıyor ---
  'yla', 'yle', 'la', 'le',

  // --- iyelik: ben ve sen ---
  'ım', 'im', 'um', 'üm',
  'm',

  'ı', 'i', 'u', 'ü',
  'a', 'e',
  'n',
];

/**
 * Ünsüz yumuşamasını geri alır.
 *
 * "kitap" + "ı" → "kitabı"; gövdeyi soyduğumuzda elimizde "kitab"
 * kalıyor ve bu sözlükte yok. Son harfi sertleştirince "kitap" çıkıyor.
 * 'g' ayrı tutuluyor: "renk" → "rengi".
 */
const SERTLESME: Record<string, string> = {
  b: 'p',
  c: 'ç',
  d: 't',
  ğ: 'k',
  g: 'k',
};

/**
 * Bir gövdenin sözlükte aranacak bütün biçimleri.
 *
 * Yumuşamış biçim YALNIZCA ünlüyle başlayan bir ekten önce geçerli:
 * "kitabın" doğru, "kitablar" değil. Kontrol olmasaydı ikincisi de
 * kabul edilirdi.
 */
function govdeAdaylari(govde: string, ek: string): string[] {
  const adaylar = [govde];
  const son = govde[govde.length - 1];
  const sert = son ? SERTLESME[son] : undefined;
  const unluyleBasliyor = !!ek[0] && UNLULER.includes(ek[0]);
  if (sert && unluyleBasliyor) adaylar.push(govde.slice(0, -1) + sert);
  return adaylar;
}

/**
 * Kelime sözlükte var mı — çekimli biçimler de sayılır.
 *
 * Önce kelimenin kendisine bakılıyor; sözlükte düz hâliyle varsa iş
 * orada biter. Yoksa ekler sırayla soyuluyor.
 */
export function sozluktePayVar(ham: string, sozluk: Sozluk): boolean {
  const kelime = turkceKucult((ham ?? '').trim());
  if (!kelime) return false;
  if (sozluk.icerir(kelime)) return true;

  // Genişlikte arama: her adımda soyulabilecek bütün ekler denenir.
  let katman: string[] = [kelime];
  const gorulen = new Set<string>([kelime]);

  for (let adim = 0; adim < EN_FAZLA_EK; adim++) {
    const sonraki: string[] = [];

    for (const mevcut of katman) {
      for (const ek of EKLER) {
        if (!mevcut.endsWith(ek)) continue;
        const govde = mevcut.slice(0, mevcut.length - ek.length);
        if (govde.length < EN_KISA_GOVDE) continue;

        // Bağlı gövde de ünlüyle başlayan ekten önce geçerli:
        // "burnu" doğru, "burnlar" değil.
        if (ek[0] && UNLULER.includes(ek[0]) && sozluk.govdeMi(govde)) return true;

        for (const aday of govdeAdaylari(govde, ek)) {
          if (sozluk.icerir(aday)) return true;
          if (!gorulen.has(aday)) {
            gorulen.add(aday);
            sonraki.push(aday);
          }
        }
      }
    }

    if (sonraki.length === 0) break;
    katman = sonraki;
  }

  return false;
}
