/**
 * İsimle giriş (sistem 2) — isimden kullanıcı adı üretimi. Saf, test edilebilir.
 *
 * Oyuncu "Nazım" yazar; görünen adı "Nazım", kullanıcı adı "nazim" olur.
 * Kullanıcı adı veritabanında benzersiz olduğu için "nazim" alınmışsa
 * sırayla "nazim2", "nazim3"… denenir. Oyuncuya ayrıca kullanıcı adı
 * sorulmaz — sistem 2'nin bütün amacı tek alanla başlamak.
 *
 * NEDEN ASCII'YE İNDİRİLİYOR
 * Kullanıcı adı profil adresinde (`/o/nazim`) ve paylaşımda geçiyor.
 * Türkçe karakterli adres her klavyede yazılamıyor; "nazım" ile "nazim"
 * iki ayrı oyuncu gibi görünürdü. Türkçe hâli görünen adda korunuyor.
 */

/** Kullanıcı adı sınırları — veritabanındaki CHECK kısıtıyla aynı. */
export const KULLANICI_ADI_EN_AZ = 3;
export const KULLANICI_ADI_EN_COK = 16;

/** Görünen adın sınırı — veritabanındaki CHECK kısıtıyla aynı. */
export const GORUNEN_AD_EN_COK = 32;

const TURKCE_ASCII: Record<string, string> = {
  ı: 'i', i: 'i', ğ: 'g', ü: 'u', ş: 's', ö: 'o', ç: 'c',
  â: 'a', î: 'i', û: 'u',
};

/**
 * Yazılan ismi görünen ada çevirir: baştaki/sondaki boşluk atılır,
 * aradaki boşluklar teke indirilir, uzunluk sınıra kırpılır.
 */
export function gorunenAdTemizle(isim: string): string {
  return isim.replace(/\s+/g, ' ').trim().slice(0, GORUNEN_AD_EN_COK).trim();
}

/**
 * İsmin kullanıcı adı kökü: Türkçe küçük harfe çevrilir, Türkçe
 * karakterler ASCII karşılığına iner, harf ve rakam dışındaki her şey
 * (boşluk dahil) atılır. "Nazım Demir" → "nazimdemir".
 */
export function kullaniciAdiKoku(isim: string): string {
  const kucuk = isim.toLocaleLowerCase('tr-TR');
  let cikti = '';
  for (const harf of kucuk) {
    const karsilik = TURKCE_ASCII[harf] ?? harf;
    // Birleşik aksan işaretleri (NFD sonrası) ve diğer her şey düşer.
    const sade = karsilik.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/^[a-z0-9]$/.test(sade)) cikti += sade;
  }
  return cikti;
}

/**
 * Denenecek kullanıcı adları, sırayla. İlki kökün kendisi (kök yeterince
 * uzunsa), sonrakiler sonuna sayı eklenmiş hâli. Sayı eklenirken kök
 * kırpılır ki toplam uzunluk sınırı aşmasın.
 *
 * Kök boşsa (isim yalnızca işaretten oluşuyorsa) boş liste döner —
 * arayüz bunu "geçerli bir isim yaz" diye karşılar.
 */
export function kullaniciAdiAdaylari(isim: string, adet = 20): string[] {
  const kok = kullaniciAdiKoku(isim);
  if (!kok) return [];

  const adaylar: string[] = [];
  if (kok.length >= KULLANICI_ADI_EN_AZ) adaylar.push(kok.slice(0, KULLANICI_ADI_EN_COK));

  // "Su" gibi iki harfli isimler: kök kısa, doğrudan sayıyla başlanır.
  let sayi = kok.length >= KULLANICI_ADI_EN_AZ ? 2 : 1;
  while (adaylar.length < adet) {
    const ek = String(sayi);
    const aday = kok.slice(0, KULLANICI_ADI_EN_COK - ek.length) + ek;
    if (aday.length >= KULLANICI_ADI_EN_AZ) adaylar.push(aday);
    sayi++;
  }
  return adaylar;
}

/**
 * Yazılan isim kabul edilebilir mi? Geçerliyse null, değilse
 * oyuncuya gösterilecek metin.
 */
export function isimDogrula(isim: string): string | null {
  const temiz = gorunenAdTemizle(isim);
  if (!temiz) return 'İsmini yaz.';
  if (kullaniciAdiKoku(temiz).length < 2) return 'En az iki harf yaz.';
  return null;
}

/**
 * İsimde küfür var mı? Kullanıcı adı süzgecinden farklı olarak KELİME
 * bazında bakar: kısa maddeler ("oç", "sik") yalnızca kelimenin
 * kendisiyse yakalanır, yoksa "Koç" ya da "Işıksu" gibi gerçek isimler
 * reddedilirdi. Uzun maddeler (dört harf ve üstü) kelime başında da
 * yakalanır ("orospuçocuğu").
 */
export function isimUygunsuzMu(isim: string, liste: readonly string[]): boolean {
  const kelimeler = isim.toLocaleLowerCase('tr-TR').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return kelimeler.some((k) =>
    liste.some((m) => k === m || (m.length >= 4 && k.startsWith(m))),
  );
}
