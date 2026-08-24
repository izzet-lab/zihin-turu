/**
 * tasAnimasyon.ts — İki taşın birleşme anını canlandırır.
 *
 * NEDEN VAR
 * Bütün oyun tek bir jestin üstüne kurulu: iki taş birleşir, yeni bir
 * taş olur. Önceden o an hiç canlandırılmıyordu — iki taş kayboluyor,
 * yerine üçüncüsü beliriyordu. Oyun hissinin en çok kaybedildiği yer
 * burasıydı.
 *
 * NASIL
 * React'in taşları yeniden çizmesine karışmadan çalışır: birleşme
 * anında eski taşların GÖRÜNTÜ KOPYALARI sayfanın üstüne konur, yeni
 * taşın yerine doğru süzülüp söner, sonra silinir. Böylece animasyon
 * oyunun durumuna hiç dokunmaz; yarıda kesilirse oyun yine doğru
 * çalışır.
 *
 * PERFORMANS
 * Yalnızca `transform` ve `opacity` kullanılır. Bu ikisi telefonun
 * ekran işlemcisinde çalışır, sayfa yeniden hesaplanmaz. Alt segment
 * cihazlarda da akar.
 *
 * ERİŞİLEBİLİRLİK
 * Cihazda "hareketi azalt" açıksa animasyon hiç oynatılmaz.
 */

/** Bir taşın ekrandaki yeri. */
export interface TasYeri {
  sol: number;
  ust: number;
  genislik: number;
  yukseklik: number;
}

/** Birleşme animasyonunun girdisi. */
export interface BirlesmePlani {
  /** Kaybolan taşların yerleri (birleştirilen ikisi). */
  kaybolanlar: TasYeri[];
  /** Yeni taşın yeri. */
  yeni: TasYeri;
}

/** Kullanıcı hareket azaltma istemiş mi? */
export function hareketAzaltilsinMi(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Taş listesindeki değişimden birleşme olup olmadığını çıkarır.
 *
 * Birleşme, tam olarak iki taşın gidip bir taşın gelmesidir. Geri
 * alma, sıfırlama ve tur başlangıcı bu kalıba uymaz; onlarda animasyon
 * oynatılmaz. Bu ayrım burada saf biçimde durduğu için test edilebilir.
 */
export function birlesmeMi(
  onceki: readonly number[],
  simdiki: readonly number[],
): { birlesmeVar: boolean; gidenler: number[]; gelen: number | null } {
  const simdikiKume = new Set(simdiki);
  const oncekiKume = new Set(onceki);
  const gidenler = onceki.filter((id) => !simdikiKume.has(id));
  const gelenler = simdiki.filter((id) => !oncekiKume.has(id));

  const birlesmeVar = gidenler.length === 2 && gelenler.length === 1;
  return {
    birlesmeVar,
    gidenler,
    gelen: birlesmeVar ? gelenler[0]! : null,
  };
}

/** Bir öğenin sayfadaki yerini okur. */
export function yeriOku(el: Element): TasYeri {
  const r = el.getBoundingClientRect();
  return { sol: r.left, ust: r.top, genislik: r.width, yukseklik: r.height };
}

/** İki yer arasındaki kayma miktarı (merkezden merkeze). */
export function kayma(kaynak: TasYeri, hedef: TasYeri): { x: number; y: number } {
  const kaynakMerkezX = kaynak.sol + kaynak.genislik / 2;
  const kaynakMerkezY = kaynak.ust + kaynak.yukseklik / 2;
  const hedefMerkezX = hedef.sol + hedef.genislik / 2;
  const hedefMerkezY = hedef.ust + hedef.yukseklik / 2;
  return { x: hedefMerkezX - kaynakMerkezX, y: hedefMerkezY - kaynakMerkezY };
}

/** Animasyon süreleri (ms). Tek yerde dursun ki ritim tutarlı olsun. */
export const SURE = {
  /** Eski taşların yeni taşa süzülmesi. */
  suzulme: 260,
  /** Yeni taşın doğuşu. */
  dogus: 320,
} as const;

/**
 * Zaman aşımı payı (ms). Animasyon bu süre içinde bitmezse kopya yine
 * silinir. Sekme arka plana atıldığında animasyonlar durduğu için
 * gereklidir.
 */
export const GUVENLIK_PAYI = 400;

/**
 * Birleşmeyi oynatır. Animasyon bitince kopyalar silinir.
 *
 * @param kopyaKur Kaybolan taşın görüntü kopyasını üretir. Kopya
 *   sayfaya eklenmiş olarak dönmelidir.
 */
export function birlesmeyiOynat(
  plan: BirlesmePlani,
  kopyaKur: (yer: TasYeri) => HTMLElement,
  yeniTasEl: HTMLElement | null,
): void {
  if (hareketAzaltilsinMi()) return;

  for (const yer of plan.kaybolanlar) {
    const kopya = kopyaKur(yer);
    const { x, y } = kayma(yer, plan.yeni);

    /*
     * TEMİZLİK İKİ YOLDAN GARANTİ.
     *
     * Yalnızca `onfinish`'e güvenmek yetmiyor: kullanıcı birleşme
     * anında uygulamadan çıkarsa tarayıcı animasyonu ilerletmez,
     * bitiş olayı hiç gelmez ve kopya ekranda takılı kalır. Geri
     * dönen kullanıcı, dokunulamayan hayalet bir taş görür.
     *
     * Bu yüzden bir de zaman aşımı var. Hangisi önce gelirse kopyayı
     * siler; ikinci çağrı zararsızdır.
     */
    let temizlendi = false;
    const bitir = () => {
      if (temizlendi) return;
      temizlendi = true;
      clearTimeout(zamanAsimi);
      kopya.remove();
    };
    const zamanAsimi = setTimeout(bitir, SURE.suzulme + GUVENLIK_PAYI);

    try {
      const canlandirma = kopya.animate(
        [
          { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
          { transform: `translate3d(${x}px, ${y}px, 0) scale(0.55)`, opacity: 0 },
        ],
        { duration: SURE.suzulme, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
      );
      canlandirma.onfinish = bitir;
      canlandirma.oncancel = bitir;
    } catch {
      // Animasyon desteklenmiyorsa kopya ortada kalmasın.
      bitir();
    }
  }

  if (!yeniTasEl) return;
  try {
    yeniTasEl.animate(
      [
        { transform: 'scale(0.7)', opacity: 0.35, offset: 0 },
        { transform: 'scale(1.08)', opacity: 1, offset: 0.6 },
        { transform: 'scale(1)', opacity: 1, offset: 1 },
      ],
      { duration: SURE.dogus, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    );
  } catch {
    // Desteklenmiyorsa taş yine görünür, yalnızca animasyonsuz.
  }
}
