/**
 * oyun-saglayici.ts — İstemci tarafı oyun kayıt defteri.
 *
 * Düello ve arena ekranları maçın oyununa göre tahta kuruyor; hangi
 * sağlayıcıyı kullanacaklarını buradan öğreniyorlar.
 *
 * SÖZLÜK TEMBEL YÜKLENİYOR
 * Kelime listesi yarım megabayt ve ayrı bir parçada duruyor. Sayı turu
 * düellosu oynayan birinin onu indirmesi gereksiz; yalnızca kelime
 * maçına girildiğinde isteniyor.
 */

import { useEffect, useState } from 'react';
import type { TurSaglayici } from '@tamisabet/cekirdek';
import { sayiTuru } from '@tamisabet/oyun-sayi';

export type OyunAdi = 'sayi' | 'kelime';

export function oyunAdiCevir(ad: string | null | undefined): OyunAdi {
  return ad === 'kelime' ? 'kelime' : 'sayi';
}

let kelimeSaglayici: TurSaglayici | null = null;
let kelimeYukleme: Promise<TurSaglayici> | null = null;

/** Kelime sağlayıcısını bir kez kurar; ikinci çağrı aynı nesneyi alır. */
export function kelimeyiYukle(): Promise<TurSaglayici> {
  if (kelimeSaglayici) return Promise.resolve(kelimeSaglayici);
  if (!kelimeYukleme) {
    kelimeYukleme = Promise.all([
      import('@tamisabet/oyun-kelime'),
      import('@tamisabet/oyun-kelime/sozluk-verisi'),
    ]).then(([paket, veri]) => {
      kelimeSaglayici = paket.kelimeTuruKur(
        paket.tamSozlukKur(veri.KELIME_METNI),
        paket.tamSozlukKur(veri.YAYGIN_METNI),
      );
      return kelimeSaglayici;
    });
  }
  return kelimeYukleme;
}

/**
 * Oyunun sağlayıcısı. Sayı turu hemen hazır; kelime turu sözlüğü
 * indirilene kadar `null` döner ve ekran "hazırlanıyor" gösterir.
 */
export function oyunSaglayicisi(oyun: OyunAdi): TurSaglayici | null {
  if (oyun === 'sayi') return sayiTuru;
  if (!kelimeSaglayici) void kelimeyiYukle();
  return kelimeSaglayici;
}

/**
 * React tarafı: sağlayıcı hazır olunca ekranı yeniden çizer.
 *
 * DİKKAT — SAĞLAYICI İLE OYUN HER ZAMAN AYNI OLMALI
 * Sağlayıcı durumda tutulup oyun değiştiğinde bir render boyunca eski
 * oyunun sağlayıcısı dönüyordu. Düello ekranı adres satırında kelime
 * yazarken sunucudan sayı maçı gelince tam bu oldu: tahta sayı turu
 * açıldı, tur ise kelime turuydu ve ekran çöktü. Artık istenen oyunun
 * sağlayıcısı değilse `null` dönüyor; ekran bir an "hazırlanıyor"
 * gösterir, yanlış tahta kurmaz.
 */
export function useOyunSaglayici(oyun: OyunAdi): TurSaglayici | null {
  const [hazir, setHazir] = useState(() => Boolean(kelimeSaglayici));

  useEffect(() => {
    if (oyun !== 'kelime' || kelimeSaglayici) return;
    let iptal = false;
    kelimeyiYukle().then(() => {
      if (!iptal) setHazir(true);
    });
    return () => {
      iptal = true;
    };
  }, [oyun]);

  if (oyun === 'sayi') return sayiTuru;
  return hazir ? kelimeSaglayici : null;
}
