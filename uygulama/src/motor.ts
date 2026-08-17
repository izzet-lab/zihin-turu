/**
 * Oyun motoru — saf, arayüzden bağımsız.
 *
 * Kural yok burada: işlem geçerliliği, çözüm, puanlama hep
 * `@zihinturu/oyun-sayi` içinde. Bu dosya yalnızca oyuncunun taş
 * birleştirme etkileşimini yönetir (seç, işlem, birleştir, geri al,
 * sıfırla) ve her adımı doğrulanabilir bir `Adim` zinciri olarak tutar.
 */

import { uygula, type Adim, type Islem } from '@zihinturu/oyun-sayi';

/** Raftaki bir taş. `yol` onu üreten adım zinciri (orijinal taşta boş). */
export interface Tas {
  id: number;
  deger: number;
  yol: Adim[];
}

interface Hamle {
  tuketilen: Tas[];
  uretilenId: number;
}

export interface OyunDurum {
  kaynak: number[];
  taslar: Tas[];
  secimA: number | null;
  islem: Islem | null;
  gecmis: Adim[];
  yigin: Hamle[];
  hata: string | null;
  sonrakiId: number;
  /**
   * "Yanlışı sil" jokeriyle kaldırılan orijinal taşların id'leri.
   * Sıfırlamada da silinmiş kalırlar — joker hakkı harcandı, geri
   * gelmeleri jokerin bedelini anlamsız kılardı.
   */
  silinenler: number[];
}

export type Eylem =
  | { t: 'tas'; id: number }
  | { t: 'islem'; op: Islem }
  | { t: 'geriAl' }
  | { t: 'sifirla' }
  | { t: 'tasSil'; id: number }
  | { t: 'hataTemizle' };

export function baslat(sayilar: number[], silinenler: number[] = []): OyunDurum {
  const silinenKume = new Set(silinenler);
  return {
    kaynak: sayilar.slice(),
    taslar: sayilar
      .map((deger, i) => ({ id: i, deger, yol: [] as Adim[] }))
      .filter((t) => !silinenKume.has(t.id)),
    secimA: null,
    islem: null,
    gecmis: [],
    yigin: [],
    hata: null,
    sonrakiId: sayilar.length,
    silinenler: silinenler.slice(),
  };
}

function tasBul(d: OyunDurum, id: number): Tas | undefined {
  return d.taslar.find((t) => t.id === id);
}

function birlestir(d: OyunDurum, aId: number, bId: number, op: Islem): OyunDurum {
  const A = tasBul(d, aId);
  const B = tasBul(d, bId);
  if (!A || !B) return d;
  // Çıkarma ve bölme büyükten küçüğe uygulanır; negatif/sıfır ve
  // kalanlı sonuç kuraldışıdır (kuralı oyun-sayi belirler).
  const ust = A.deger >= B.deger ? A : B;
  const alt = A.deger >= B.deger ? B : A;
  const sonuc = uygula(ust.deger, alt.deger, op);
  if (sonuc === null) {
    return { ...d, secimA: null, islem: null, hata: 'Bu işlem burada geçerli değil.' };
  }
  const adim: Adim = { a: ust.deger, b: alt.deger, islem: op, sonuc };
  const uretilen: Tas = { id: d.sonrakiId, deger: sonuc, yol: A.yol.concat(B.yol, [adim]) };
  return {
    ...d,
    taslar: d.taslar.filter((t) => t.id !== aId && t.id !== bId).concat([uretilen]),
    secimA: null,
    islem: null,
    gecmis: d.gecmis.concat([adim]),
    yigin: d.yigin.concat([{ tuketilen: [A, B], uretilenId: d.sonrakiId }]),
    hata: null,
    sonrakiId: d.sonrakiId + 1,
  };
}

export function ilerle(d: OyunDurum, e: Eylem): OyunDurum {
  switch (e.t) {
    case 'tas': {
      if (d.secimA === null) return { ...d, secimA: e.id, hata: null };
      if (e.id === d.secimA) return { ...d, secimA: null, islem: null, hata: null };
      if (d.islem === null) return { ...d, secimA: e.id, hata: null }; // seçimi taşı
      return birlestir(d, d.secimA, e.id, d.islem);
    }
    case 'islem': {
      if (d.secimA === null) return { ...d, hata: 'Önce bir taş seç.' };
      return { ...d, islem: e.op, hata: null };
    }
    case 'geriAl': {
      const h = d.yigin[d.yigin.length - 1];
      if (!h) return d;
      return {
        ...d,
        taslar: d.taslar.filter((t) => t.id !== h.uretilenId).concat(h.tuketilen),
        yigin: d.yigin.slice(0, -1),
        gecmis: d.gecmis.slice(0, -1),
        secimA: null,
        islem: null,
        hata: null,
      };
    }
    case 'sifirla':
      return baslat(d.kaynak, d.silinenler);
    case 'tasSil': {
      const t = tasBul(d, e.id);
      if (!t) return d;
      return {
        ...d,
        taslar: d.taslar.filter((x) => x.id !== e.id),
        silinenler: d.silinenler.concat([e.id]),
        secimA: d.secimA === e.id ? null : d.secimA,
        islem: d.secimA === e.id ? null : d.islem,
        hata: null,
      };
    }
    case 'hataTemizle':
      return { ...d, hata: null };
    default:
      return d;
  }
}

/** Hedefe en yakın taş (üretilmiş ya da orijinal). */
export function enYakinTas(d: OyunDurum, hedef: number): Tas {
  return d.taslar.reduce((iyi, t) =>
    Math.abs(t.deger - hedef) < Math.abs(iyi.deger - hedef) ? t : iyi,
  );
}

/** Hedefe kalan en küçük uzaklık. 0 = tam isabet var. */
export function enYakinFark(d: OyunDurum, hedef: number): number {
  return Math.abs(enYakinTas(d, hedef).deger - hedef);
}
