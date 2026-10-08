/**
 * tur-cevaplari.ts — Maç bitince "hangi tur neydi, doğrusu neymiş?"
 *
 * NEDEN SUNUCUDAN GELMİYOR
 * Turlar tohumdan yeniden üretiliyor; sunucunun özel olarak göndermesi
 * gereken bir şey yok (kural 3). Çözüm de burada bulunuyor.
 *
 * NEDEN MAÇ BİTMEDEN ÇAĞRILMIYOR
 * Kural 8: çözüm tur bitmeden görünmez. Bu kanca yalnızca sonuç ve
 * podyum ekranlarından çağrılıyor.
 *
 * NEDEN PARÇA PARÇA HESAPLANIYOR
 * Sayı turunun çözücüsü tur başına birkaç yüz milisaniye tutabiliyor.
 * Beş turu birden hesaplamak sonuç ekranını kilitliyordu; turlar
 * sırayla, ekran çizildikten sonra ekleniyor.
 */

import { useEffect, useState } from 'react';
import { duelloTurTohumu, type TurSaglayici } from '@tamisabet/cekirdek';

export interface TurCevabi {
  turNo: number;
  /** "Hedef 32" ya da "A B C D E F G" — cümleyi oyun kuruyor. */
  tanim: string;
  /** Çözüm satırları; sayı turunda zincir, kelimede tek kelime. */
  satirlar: string[];
}

export function useTurCevaplari(
  saglayici: TurSaglayici | null,
  seviye: string | undefined,
  tohum: number | string | undefined,
  turSayisi: number,
): TurCevabi[] {
  const [cevaplar, setCevaplar] = useState<TurCevabi[]>([]);

  useEffect(() => {
    setCevaplar([]);
    if (!saglayici || !seviye || tohum == null || turSayisi < 1) return;

    let iptal = false;
    let zaman: ReturnType<typeof setTimeout> | undefined;

    const hesapla = (turNo: number, birikim: TurCevabi[]) => {
      if (iptal || turNo > turSayisi) return;
      let yeni = birikim;
      try {
        const tur = saglayici.turUret(seviye, duelloTurTohumu(Number(tohum), turNo));
        const cozum = saglayici.cozumBul(tur, 400);
        yeni = [
          ...birikim,
          {
            turNo,
            tanim: saglayici.turTanimi?.(tur) ?? `${turNo}. tur`,
            satirlar: cozum.satirlar,
          },
        ];
        setCevaplar(yeni);
      } catch {
        // Bir turun çözümü bulunamazsa özet eksik kalır, ekran durmaz.
      }
      zaman = setTimeout(() => hesapla(turNo + 1, yeni), 0);
    };

    zaman = setTimeout(() => hesapla(1, []), 0);
    return () => {
      iptal = true;
      if (zaman) clearTimeout(zaman);
    };
  }, [saglayici, seviye, tohum, turSayisi]);

  return cevaplar;
}
