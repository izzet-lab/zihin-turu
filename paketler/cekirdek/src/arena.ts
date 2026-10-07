/**
 * arena.ts — Arenanın beyni: 5 kişilik eşzamanlı yarış.
 *
 * Sıra yok, herkes aynı anda oynar. İlk tam isabet turu kapatır; kimse
 * bulamazsa süre sonunda sıralama hedefe uzaklığa göre yapılır.
 *
 * NEDEN DÜELLODAN AYRI BİR DOSYA
 * Düello iki taraflı ve "kazanan–kaybeden" mantığında; arena beş
 * oyunculu ve SIRALAMA mantığında. Düello akışını beş kişiye
 * genişletmek, iki taraflı sadeliğini bozardı. Ortak olan parçalar
 * (uzaklık yayını, tam isabetin turu kapatması) burada da aynı kuralla
 * yazılı ama kendi tipleriyle.
 *
 * ÇÖZÜM SIZMAZ (kural 8)
 * Düelloda olduğu gibi: taşınan tek bilgi `uzaklik`. Olay tiplerinde
 * adım, zincir ya da kelime alanı YOK; ileride yanlışlıkla eklenemesin
 * diye tip böyle kuruldu.
 */

/** Arenadaki koltuk sayısı. Eksik koltuklar botla dolar. */
export const ARENA_KOLTUK = 5;

/** Bir arenada oynanan tur sayısı. */
export const ARENA_TUR_SAYISI = 5;

/**
 * Tur sonunda sıraya göre dağıtılan puan.
 *
 * Yalnızca kazanana puan verilseydi 3. ile 5. arasında fark kalmazdı ve
 * ortalarda oynayan oyuncunun çabası görünmezdi. Azalan puan, "kaybettim
 * ama öne geçtim" hissini koruyor.
 */
export const TUR_SIRA_PUANI: readonly number[] = [5, 3, 2, 1, 0];

/** Oyuncu kimliği — gerçek oyuncu da bot da olabilir. */
export type Koltuk = string;

export interface ArenaDurum {
  /** Kaçıncı tur oynanıyor (1'den başlar). */
  tur: number;
  /** Koltuk → toplam puan. */
  puan: Record<Koltuk, number>;
  /** Koltuk → toplam uzaklık (beraberlik bozmak için). */
  toplamUzaklik: Record<Koltuk, number>;
  /** Tur hâlâ oynanıyor mu? */
  turAcik: boolean;
  /** Bu turda bildirilen uzaklıklar; null = henüz bildirmedi. */
  uzaklik: Record<Koltuk, number | null>;
  /** Biten turun kazananı; tur açıkken null. */
  turKazanani: Koltuk | null;
  /** Arenayı terk edenler — sonuçta en sona yazılırlar. */
  ayrilanlar: Koltuk[];
  bitti: boolean;
}

/**
 * Arena olayları.
 *
 * Hiçbirinde adım, zincir ya da kelime alanı YOK: yarışanlara giden tek
 * bilgi uzaklık (kural 8).
 */
export type ArenaOlay =
  | { t: 'turBasla' }
  | { t: 'uzaklik'; koltuk: Koltuk; uzaklik: number }
  | { t: 'sureDoldu' }
  | { t: 'ayrildi'; koltuk: Koltuk };

export function arenaBaslat(koltuklar: readonly Koltuk[]): ArenaDurum {
  const puan: Record<Koltuk, number> = {};
  const toplamUzaklik: Record<Koltuk, number> = {};
  const uzaklik: Record<Koltuk, number | null> = {};
  for (const k of koltuklar) {
    puan[k] = 0;
    toplamUzaklik[k] = 0;
    uzaklik[k] = null;
  }
  return {
    tur: 1,
    puan,
    toplamUzaklik,
    turAcik: true,
    uzaklik,
    turKazanani: null,
    ayrilanlar: [],
    bitti: false,
  };
}

/** Bir turun sıralaması: önce yaklaşan önde; bildirmeyen en sonda. */
export function turSiralamasi(
  uzaklik: Record<Koltuk, number | null>,
): Koltuk[] {
  return Object.keys(uzaklik).sort((a, b) => {
    const ua = uzaklik[a];
    const ub = uzaklik[b];
    if (ua == null && ub == null) return a.localeCompare(b);
    if (ua == null) return 1;
    if (ub == null) return -1;
    if (ua !== ub) return ua - ub;
    // Eşit uzaklıkta sıra kimliğe göre sabitlenir: aynı girdi her
    // makinede aynı sonucu vermeli.
    return a.localeCompare(b);
  });
}

/** Turu kapatır: sıraya göre puan dağıtır, gerekirse arenayı bitirir. */
function turuKapat(d: ArenaDurum): ArenaDurum {
  const sira = turSiralamasi(d.uzaklik);
  const puan = { ...d.puan };
  const toplamUzaklik = { ...d.toplamUzaklik };

  sira.forEach((koltuk, i) => {
    // Hiç bildirmeyen puan almaz; sıraya girse bile.
    const bildirdi = d.uzaklik[koltuk] != null;
    if (bildirdi) puan[koltuk] = (puan[koltuk] ?? 0) + (TUR_SIRA_PUANI[i] ?? 0);
    toplamUzaklik[koltuk] = (toplamUzaklik[koltuk] ?? 0) + (d.uzaklik[koltuk] ?? 0);
  });

  const kazanan = d.uzaklik[sira[0]!] != null ? sira[0]! : null;
  const sonTurMu = d.tur >= ARENA_TUR_SAYISI;

  return {
    ...d,
    puan,
    toplamUzaklik,
    turAcik: false,
    turKazanani: kazanan,
    bitti: sonTurMu,
  };
}

/**
 * Arena durumunu bir olayla ilerletir. Saf: aynı girdi hep aynı çıktı.
 *
 * Kurallar:
 * - Tam isabet (uzaklık 0) turu ANINDA kapatır; ilk bulan turu alır.
 * - Süre dolarsa sıralama uzaklığa göre yapılır.
 * - Hiç bildirmeyen oyuncu o turdan puan almaz.
 * - Ayrılan oyuncu yarıştan çıkar; kalanlar yarışa devam eder. Düellodan
 *   farkı bu: beş kişilik yarışta bir kişinin ayrılması maçı bitirmez.
 * - Beşinci tur kapanınca arena biter.
 */
export function arenaIndirge(d: ArenaDurum, olay: ArenaOlay): ArenaDurum {
  if (d.bitti) return d;

  if (olay.t === 'ayrildi') {
    if (d.ayrilanlar.includes(olay.koltuk)) return d;
    const kalanUzaklik = { ...d.uzaklik };
    delete kalanUzaklik[olay.koltuk];
    const yeni = {
      ...d,
      uzaklik: kalanUzaklik,
      ayrilanlar: [...d.ayrilanlar, olay.koltuk],
    };
    // Herkes ayrıldıysa arena orada biter.
    if (Object.keys(kalanUzaklik).length === 0) {
      return { ...yeni, turAcik: false, bitti: true };
    }
    return yeni;
  }

  if (olay.t === 'turBasla') {
    if (d.turAcik) return d;
    const temiz: Record<Koltuk, number | null> = {};
    for (const k of Object.keys(d.uzaklik)) temiz[k] = null;
    return { ...d, tur: d.tur + 1, turAcik: true, uzaklik: temiz, turKazanani: null };
  }

  if (!d.turAcik) return d; // kapanmış tura gelen geç olaylar yok sayılır

  if (olay.t === 'uzaklik') {
    if (!(olay.koltuk in d.uzaklik)) return d; // ayrılmış ya da yabancı koltuk
    const onceki = d.uzaklik[olay.koltuk];
    // Bildirilen en iyi değer geriye gitmez (düellodaki kuralın aynısı).
    const enIyi = onceki == null ? olay.uzaklik : Math.min(onceki, olay.uzaklik);
    const uzaklik = { ...d.uzaklik, [olay.koltuk]: enIyi };
    if (enIyi === 0) return turuKapat({ ...d, uzaklik });
    return { ...d, uzaklik };
  }

  // olay.t === 'sureDoldu'
  return turuKapat(d);
}

/** Podyum satırı. */
export interface PodyumSatiri {
  koltuk: Koltuk;
  sira: number;
  puan: number;
  /** Madalya yalnızca ilk üçe. */
  madalya: 'altin' | 'gumus' | 'bronz' | null;
}

/**
 * Arenanın sonu: puana göre sıralama.
 *
 * Beraberlikte TOPLAM UZAKLIK küçük olan önde: aynı puanı toplayan iki
 * oyuncudan hedefe daha çok yaklaşan hak etmiş sayılır. O da eşitse sıra
 * kimliğe göre sabitlenir — aynı girdi her makinede aynı podyumu versin.
 *
 * Ayrılanlar her zaman en sonda: yarışı bitirmeyen podyuma çıkmaz.
 */
export function podyum(d: ArenaDurum): PodyumSatiri[] {
  const koltuklar = [
    ...Object.keys(d.puan).filter((k) => !d.ayrilanlar.includes(k)),
    ...d.ayrilanlar,
  ];

  const sirali = koltuklar.sort((a, b) => {
    const aAyrildi = d.ayrilanlar.includes(a);
    const bAyrildi = d.ayrilanlar.includes(b);
    if (aAyrildi !== bAyrildi) return aAyrildi ? 1 : -1;
    const pa = d.puan[a] ?? 0;
    const pb = d.puan[b] ?? 0;
    if (pa !== pb) return pb - pa;
    const ua = d.toplamUzaklik[a] ?? 0;
    const ub = d.toplamUzaklik[b] ?? 0;
    if (ua !== ub) return ua - ub;
    return a.localeCompare(b);
  });

  const madalyalar: ('altin' | 'gumus' | 'bronz')[] = ['altin', 'gumus', 'bronz'];
  return sirali.map((koltuk, i) => ({
    koltuk,
    sira: i + 1,
    puan: d.puan[koltuk] ?? 0,
    madalya: i < 3 && !d.ayrilanlar.includes(koltuk) ? madalyalar[i]! : null,
  }));
}

/** Arena için kaç bot gerekiyor? Eksik koltuklar botla dolar. */
export function gerekenBotSayisi(gercekOyuncu: number): number {
  return Math.max(0, ARENA_KOLTUK - gercekOyuncu);
}
