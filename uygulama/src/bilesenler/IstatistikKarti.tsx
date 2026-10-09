/**
 * IstatistikKarti.tsx — Oyuncunun kendi sayıları.
 *
 * NEDEN VAR
 * Sıralamalar sayfası "kim önde" sorusunu cevaplıyordu; "ben ne
 * yaptım" sorusunu hiçbir yer cevaplamıyordu. Oyuncu kaç tur oynadığını,
 * kaç tam isabet yaptığını, düelloda kaçıncı olduğunu göremiyordu.
 *
 * Yalnızca üyede dolu: misafirin geçmişi sunucuda yok.
 */

import { useEffect, useState } from 'react';
import { oyuncuIstatistigi, type OyuncuIstatistik } from '../lig-sorgu';
import Ikon from './Ikon';

interface Props {
  oyuncuId?: string;
}

function Kutu({ ust, alt, vurgu }: { ust: string; alt: string; vurgu?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{ust}</div>
      <div
        className={`mt-0.5 text-lg font-black leading-none tabular-nums ${
          vurgu ? 'text-cyan-300' : 'text-slate-100'
        }`}
      >
        {alt}
      </div>
    </div>
  );
}

export default function IstatistikKarti({ oyuncuId }: Props) {
  const [ist, setIst] = useState<OyuncuIstatistik | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!oyuncuId) {
      setIst(null);
      return;
    }
    let iptal = false;
    setYukleniyor(true);
    oyuncuIstatistigi(oyuncuId)
      .then((s) => {
        if (!iptal) setIst(s);
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [oyuncuId]);

  if (!oyuncuId) return null;
  if (yukleniyor && !ist) {
    return (
      <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-600">
        İstatistiklerin yükleniyor…
      </div>
    );
  }
  if (!ist) return null;

  const isabetYuzde = ist.toplamTur > 0 ? Math.round((ist.tamIsabet / ist.toplamTur) * 100) : 0;
  const kazanmaYuzde =
    ist.duelloMac > 0 ? Math.round((ist.duelloGalibiyet / ist.duelloMac) * 100) : 0;

  return (
    <div
      className="mb-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
      data-alan="istatistik-karti"
    >
      <div className="mb-3 text-sm font-bold text-slate-300">Senin istatistiklerin</div>

      <div className="grid grid-cols-3 gap-2">
        <Kutu ust="Tur" alt={String(ist.toplamTur)} />
        <Kutu ust="Tam isabet" alt={String(ist.tamIsabet)} vurgu />
        <Kutu ust="İsabet" alt={`%${isabetYuzde}`} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Kutu ust="Sayı turu" alt={String(ist.sayiTur)} />
        <Kutu ust="Kelime turu" alt={String(ist.kelimeTur)} />
        <Kutu ust="En iyi puan" alt={String(ist.enIyiPuan)} />
      </div>

      {ist.duelloMac > 0 && (
        <>
          <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <Ikon ad="duello" boyut={14} className="mr-1.5 -mt-0.5" />
            Düello
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Kutu ust="Sıra" alt={ist.duelloSira ? `${ist.duelloSira}.` : '—'} vurgu />
            <Kutu ust="Derece" alt={String(ist.duelloElo)} />
            <Kutu ust="Galibiyet" alt={`${ist.duelloGalibiyet}–${ist.duelloMaglubiyet}`} />
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {ist.duelloMac} maç · %{kazanmaYuzde} kazanma
          </div>
        </>
      )}

      {ist.arenaSayisi > 0 && (
        <>
          <div className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <Ikon ad="arena" boyut={14} className="mr-1.5 -mt-0.5" />
            Arena
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Kutu ust="Sıra" alt={ist.arenaSira ? `${ist.arenaSira}.` : '—'} vurgu />
            <Kutu ust="Madalya" alt={`${ist.altin}·${ist.gumus}·${ist.bronz}`} />
            <Kutu ust="Arena" alt={String(ist.arenaSayisi)} />
          </div>
          {/* Madalya dökümü: emoji yerine metal noktalar. */}
          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
            {(
              [
                ['zt-metal-altin', ist.altin, 'altın'],
                ['zt-metal-gumus', ist.gumus, 'gümüş'],
                ['zt-metal-bronz', ist.bronz, 'bronz'],
              ] as const
            ).map(([sinif, adet, ad]) => (
              <span key={ad} className="flex items-center gap-1.5">
                <span className={`${sinif} h-3 w-3 rounded-full`} aria-hidden="true" />
                {adet} {ad}
              </span>
            ))}
          </div>
        </>
      )}

      {ist.duelloMac === 0 && ist.arenaSayisi === 0 && (
        <p className="mt-3 text-[11px] text-slate-500">
          Henüz düello ya da arena oynamadın; oynadığında dereceler burada görünecek.
        </p>
      )}
    </div>
  );
}
