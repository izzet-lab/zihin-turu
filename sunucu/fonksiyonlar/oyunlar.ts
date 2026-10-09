/**
 * oyunlar.ts — Sunucunun oyun kayıt defteri.
 *
 * NEDEN VAR
 * Düello ve arena sunucu kodu sayı turunun fonksiyonlarını DOĞRUDAN
 * çağırıyordu; kelime turu o yüzden bu modlara giremiyordu. Artık
 * maçın `oyun` sütununa bakılıp sağlayıcı buradan alınıyor ve yalnızca
 * `TurSaglayici` arayüzü çağrılıyor.
 *
 * KELİME SÖZLÜĞÜ TEMBEL YÜKLENİYOR
 * Sözlük yarım megabayt. Sayı turu düellosuna bakan bir istekte onu
 * kurmak boşa soğuk başlangıç maliyeti; sağlayıcı ilk istendiğinde
 * kuruluyor ve modül ömrü boyunca saklanıyor.
 */

import type { TurSaglayici } from '@tamisabet/cekirdek';
import { sayiTuru } from '@tamisabet/oyun-sayi';
import { kelimeTuruKur, tamSozlukKur } from '@tamisabet/oyun-kelime';
import { KELIME_METNI, YAYGIN_METNI, GOVDE_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';

let kelimeTuru: TurSaglayici | null = null;

function kelimeyiKur(): TurSaglayici {
  if (!kelimeTuru) {
    kelimeTuru = kelimeTuruKur(tamSozlukKur(KELIME_METNI, GOVDE_METNI), tamSozlukKur(YAYGIN_METNI));
  }
  return kelimeTuru;
}

/** Desteklenen oyun adları — maç kaydındaki `oyun` sütunu bunlardan biri. */
export const OYUN_ADLARI = ['sayi', 'kelime'] as const;
export type OyunAdi = (typeof OYUN_ADLARI)[number];

export function gecerliOyunMu(ad: string): ad is OyunAdi {
  return (OYUN_ADLARI as readonly string[]).includes(ad);
}

/**
 * Maçın oyununa karşılık gelen sağlayıcı.
 *
 * Bilinmeyen ad gelirse sayı turuna düşülüyor: eski kayıtlarda `oyun`
 * sütunu boş olabilir ve o maçların hepsi sayı turuydu.
 */
export function oyunSec(ad: string | null | undefined): TurSaglayici {
  return ad === 'kelime' ? kelimeyiKur() : sayiTuru;
}

/** Bir oyunun bir seviyesindeki tur süresi (saniye). */
export function turSuresi(oyun: string | null | undefined, seviye: string): number {
  return oyunSec(oyun).seviyeler.find((s) => s.anahtar === seviye)?.sure ?? 60;
}
