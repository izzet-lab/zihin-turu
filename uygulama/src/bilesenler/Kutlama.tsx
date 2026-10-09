/**
 * Kutlama.tsx — Başarıyı kutlayan tam ekran katman.
 *
 * NEDEN VAR
 * Seviye atlama, rozet ve uzun seri birer METİN SATIRIYDI. Oyunlar
 * başarıyı kutlar, bildirmez; kazanılan an görülmezse kazanılmamış
 * sayılır.
 *
 * NASIL DAVRANIR
 * - Birden fazla kutlama varsa sırayla gösterir (önce seviye, sonra
 *   rozetler, sonra seri).
 * - Dokununca ya da üç saniye sonra sıradakine geçer; oyuncuyu
 *   bekletmez.
 * - Kazanılan şey büyüyerek gelir, konfeti düşer, telefon titrer.
 *
 * NEREDE DURUYOR
 * Uygulamanın en üstünde bir kez. Turun hangi ekranda bittiği
 * (antrenman, kelime, düello, arena) önemli değil — kutlama olayını
 * dinliyor.
 */

import { useCallback, useEffect, useState } from 'react';
import Ikon from './Ikon';
import Konfeti from './Konfeti';
import { METAL } from './RozetSeridi';
import { kutlamaDinle } from '../kutlama';
import type { Kutlama as KutlamaTuru } from '../kutlama-karar';
import { titret } from '../titresim';
import { sesTamIsabet } from '../ses';

/** Gösterim süresi; oyuncu daha erken dokunursa hemen geçilir. */
const SURE_MS = 3200;

function icerik(k: KutlamaTuru) {
  if (k.tur === 'seviye') {
    return {
      ustBaslik: 'Seviye atladın',
      baslik: `Lv.${k.seviye} ${k.unvan}`,
      alt: 'Yeni unvanın profilinde görünüyor.',
      simge: 'tac' as const,
      halka: 'zt-metal-altin',
    };
  }
  if (k.tur === 'rozet') {
    return {
      ustBaslik: 'Yeni rozet',
      baslik: k.rozet.ad,
      alt: k.rozet.nasil,
      simge: k.rozet.simge,
      halka: k.rozet.kademe ? METAL[k.rozet.kademe] : 'zt-metal-altin',
    };
  }
  return {
    ustBaslik: 'Seri sürüyor',
    baslik: `${k.gun} gün`,
    alt: 'Her gün bir tur — alışkanlık böyle kuruluyor.',
    simge: 'seri' as const,
    halka: 'zt-metal-altin',
  };
}

export default function KutlamaKatmani() {
  const [kuyruk, setKuyruk] = useState<KutlamaTuru[]>([]);

  useEffect(() => kutlamaDinle((yeni) => setKuyruk((k) => [...k, ...yeni])), []);

  const simdiki = kuyruk[0] ?? null;

  const sonraki = useCallback(() => setKuyruk((k) => k.slice(1)), []);

  useEffect(() => {
    if (!simdiki) return;
    sesTamIsabet();
    titret('basari');
    const z = setTimeout(sonraki, SURE_MS);
    return () => clearTimeout(z);
  }, [simdiki, sonraki]);

  if (!simdiki) return null;

  const i = icerik(simdiki);

  return (
    // Dokununca geçilir: kutlama oyuncuyu bekletmemeli.
    <div
      // z-[60]: "Nasıl oynanır" penceresi ve menü z-50'de duruyor.
      // Aynı katmanda kalsaydı ilk turunu bitiren yeni oyuncunun
      // kutlaması yardım penceresinin ARKASINDA kalırdı.
      className="zt-kutlama fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0A0E1A]/[0.97] px-8 text-center"
      onClick={sonraki}
      role="status"
      aria-live="polite"
      data-alan="kutlama"
      data-kutlama-tur={simdiki.tur}
    >
      <Konfeti />

      <div
        className={`zt-kutlama-nisan flex h-28 w-28 items-center justify-center rounded-full ${i.halka}`}
      >
        <Ikon ad={i.simge} boyut={52} />
      </div>

      <div className="zt-kutlama-yazi mt-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {i.ustBaslik}
        </div>
        <div className="zt-rakam mt-1 text-3xl font-black text-white">{i.baslik}</div>
        <p className="mt-2 max-w-xs text-sm text-slate-400">{i.alt}</p>
      </div>

      <div className="mt-8 text-[11px] text-slate-600">Devam etmek için dokun</div>
    </div>
  );
}
