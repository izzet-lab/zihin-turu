/**
 * sozluk.ts — Kelime turunun sözlük katmanı.
 *
 * NEDEN SÖZLÜK DIŞARIDAN VERİLİYOR
 * Oyunun kuralları (harf havuzu, doğrulama, puanlama) sözlüğün hangi
 * kaynaktan geldiğinden bağımsız. Sözlük kodun içine gömülseydi hem
 * paket şişerdi hem kaynağı değiştirmek kuralları değiştirmek anlamına
 * gelirdi. Burada yalnızca "bir kelime bu dilde var mı?" sorusunu
 * cevaplayan küçük bir arayüz var; listeyi kim verirse versin oyun aynı
 * çalışır.
 *
 * SÖZLÜK KAYNAĞI: ZEMBEREK (Apache License 2.0)
 * TDK sözlüğü telifli olduğu için kullanılamadı. Zemberek'in Türkçe
 * kök sözlüğü açık lisanslı ve ticari kullanıma uygun; tek şartı
 * kaynağı belirtmek. Lisans metni `veri/ZEMBEREK-LISANS.txt` içinde.
 *
 * Liste `araclar/kelime-listesi-uret.mjs` ile üretiliyor: özel adlar,
 * kısaltmalar, ünlemler ve çok kelimeli maddeler ayıklanıyor, düzenli
 * çoğullar ünlü uyumuna göre ekleniyor. Yaklaşık 50 bin kelime.
 */

/** Oyunun sözlükten istediği tek şey. */
export interface Sozluk {
  /** Kelime bu dilde var mı? Büyük/küçük harf farkı aranmaz. */
  icerir(kelime: string): boolean;
  /** Verilen uzunluktaki kelimeler — harf havuzu kurarken kullanılır. */
  uzunluktakiler(uzunluk: number): readonly string[];
  /** Sözlükteki toplam kelime sayısı. */
  readonly adet: number;
}

/**
 * Türkçe küçük harfe çevirir.
 *
 * `toLowerCase()` tek başına yanlış: 'I' harfi İngilizce kurallarına
 * göre 'i' olur, oysa Türkçe'de 'ı' olmalı. Sözlük araması bu yüzden
 * her zaman Türkçe yerelle yapılır.
 */
export function turkceKucult(s: string): string {
  return s.toLocaleLowerCase('tr');
}

/** Türkçe büyük harfe çevirir ('i' → 'İ'). */
export function turkceBuyult(s: string): string {
  return s.toLocaleUpperCase('tr');
}

/** Bellekteki bir kelime kümesinden sözlük kurar. */
export function kumeSozluk(kelimeler: Iterable<string>): Sozluk {
  const kume = new Set<string>();
  const uzunlugaGore = new Map<number, string[]>();

  for (const ham of kelimeler) {
    const k = turkceKucult(ham.trim());
    if (!k) continue;
    if (kume.has(k)) continue;
    kume.add(k);
    const liste = uzunlugaGore.get(k.length);
    if (liste) liste.push(k);
    else uzunlugaGore.set(k.length, [k]);
  }

  // Aynı tohumun her makinede aynı turu üretmesi için listelerin
  // SIRASI da sabit olmalı (kural 3'ün gereği: tohum → tur).
  for (const liste of uzunlugaGore.values()) liste.sort();

  return {
    adet: kume.size,
    icerir: (kelime: string) => kume.has(turkceKucult(kelime.trim())),
    uzunluktakiler: (uzunluk: number) => uzunlugaGore.get(uzunluk) ?? [],
  };
}

/**
 * Küçük yedek liste — sözlük yüklenemezse oyun yine de açılsın diye.
 *
 * Amacı oyunu çalıştırmak ve testleri beslemek; gerçek sözlüğün yerini
 * tutmaz. Uzunluk dağılımı bilerek geniş: harf havuzu kurulurken her
 * seviyede en az bir uzun kelime bulunabilmeli.
 */
export const BASLANGIC_KELIMELER: readonly string[] = [
  // 4 harf
  'adam', 'akıl', 'ayak', 'baba', 'balık', 'deniz', 'elma', 'kitap',
  'masa', 'kapı', 'okul', 'yıldız', 'çiçek', 'kalem', 'defter', 'bahçe',
  // 5 harf
  'kedi', 'köpek', 'tavuk', 'balon', 'kemer', 'sepet', 'çanta', 'perde',
  'halat', 'zemin', 'tarak', 'yemek', 'kağıt', 'resim', 'orman', 'bulut',
  'yağmur', 'rüzgar', 'toprak', 'çakıl',
  // 6 harf
  'kalemlik', 'bardak', 'sandık', 'kaplan', 'kelebek', 'merdiven',
  'pencere', 'duvar', 'anahtar', 'makine', 'telefon', 'bilgisayar',
  'defterler', 'kitaplık', 'çiçekçi', 'balıkçı', 'ekmekçi', 'sütçü',
  'demirci', 'terzi', 'marangoz', 'bahçıvan',
  // 7 harf
  'kitaplar', 'kalemler', 'masalar', 'yıldızlar', 'denizler', 'ormanlar',
  'bulutlar', 'çiçekler', 'kelebekler', 'pencereler', 'anahtarlar',
  'telefonlar', 'makineler', 'merdivenler', 'sandıklar', 'bardaklar',
  // 8+ harf
  'kelimeler', 'cümleler', 'paragraflar', 'sayfalar', 'defterler',
  'öğretmen', 'öğrenci', 'okulöncesi', 'matematik', 'bilgisayarlar',
  'kütüphane', 'laboratuvar', 'üniversite', 'akademisyen', 'araştırma',
  'geliştirme', 'yazılımcı', 'mühendislik', 'tasarımcı', 'çevirmen',
  'gazeteci', 'fotoğrafçı', 'müzisyen', 'ressamlar', 'heykeltıraş',
  'arkadaşlar', 'komşular', 'misafirler', 'kardeşler', 'akrabalar',
  'yolculuk', 'tatiller', 'denizkızı', 'gökyüzü', 'karanlık',
  'aydınlık', 'sessizlik', 'gürültü', 'kalabalık', 'yalnızlık',
];

/** Yedek sözlük — yalnızca tam liste yüklenemediğinde kullanılır. */
export const baslangicSozlugu: Sozluk = kumeSozluk(BASLANGIC_KELIMELER);

/**
 * Tam Türkçe sözlük — satır satır metinden kurulur.
 *
 * NEDEN AYRI MODULDEN GELİYOR
 * Liste yarım megabayt; sayı turunu oynayan birinin bunu indirmesi
 * gereksiz. Ayrı modülde durunca paketleyici onu ayrı bir parçaya
 * koyabiliyor ve yalnızca kelime turu açıldığında yükleniyor.
 */
export function tamSozlukKur(metin: string): Sozluk {
  return kumeSozluk(metin.split('\n'));
}
