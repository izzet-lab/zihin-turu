/**
 * RozetSeridi.tsx — Kazanılan ve kazanılmayan rozetler.
 *
 * KİLİTLİLER DE GÖRÜNÜYOR
 * Yalnızca kazanılanları göstermek "bitmiş" bir liste verir; kilitliyi
 * de göstermek bir sonraki hedefi gösterir. Kilitli rozetin nasıl
 * kazanılacağı yazıyor — gizli hedef oyuncuyu değil tasarımcıyı
 * eğlendirir.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ROZETLER, ROZET_GRUP_ADI, type RozetTanim } from '../rozetler';
import Ikon from './Ikon';

/** Rozet kademesinin metal yüzüğü. */
export const METAL: Record<'bronz' | 'gumus' | 'altin', string> = {
  bronz: 'zt-metal-bronz',
  gumus: 'zt-metal-gumus',
  altin: 'zt-metal-altin',
};

interface Props {
  oyuncuId?: string;
}

function Rozet({ r, kazanildi }: { r: RozetTanim; kazanildi: boolean }) {
  return (
    <div
      data-rozet={r.kod}
      data-kazanildi={kazanildi ? '1' : undefined}
      title={r.nasil}
      className={`flex min-h-[72px] flex-col items-center justify-center rounded-lg border px-1 py-2 text-center ${
        kazanildi
          ? 'zt-vurgu-cizgi zt-vurgu-yuzey'
          : 'zt-cizgi zt-yuzey'
      }`}
    >
      {/* Aile ikonla, basamak metal yüzükle anlatılıyor. */}
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          kazanildi
            ? r.kademe
              ? METAL[r.kademe]
              : 'zt-vurgu-yuzey zt-vurgu-metin'
            : 'zt-yuzey-2 zt-metin-soluk'
        }`}
      >
        <Ikon ad={r.simge} boyut={18} />
      </span>
      <span
        className={`mt-1 text-[10px] font-bold leading-tight ${
          kazanildi ? 'zt-vurgu-metin' : 'zt-metin-soluk'
        }`}
      >
        {r.ad}
      </span>
    </div>
  );
}

export default function RozetSeridi({ oyuncuId }: Props) {
  const [kodlar, setKodlar] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!oyuncuId) {
      setKodlar(null);
      return;
    }
    let iptal = false;
    supabase
      .from('rozet')
      .select('rozet_kodu')
      .eq('oyuncu_id', oyuncuId)
      .then(({ data }) => {
        if (iptal) return;
        setKodlar(new Set((data ?? []).map((r: { rozet_kodu: string }) => r.rozet_kodu)));
      });
    return () => {
      iptal = true;
    };
  }, [oyuncuId]);

  if (!oyuncuId || kodlar === null) return null;

  const kazanilan = ROZETLER.filter((r) => kodlar.has(r.kod)).length;
  const gruplar: RozetTanim['oyunGrubu'][] = ['seri', 'beceri', 'rekabet'];

  return (
    <div
      className="mb-6 rounded-xl border zt-cizgi zt-yuzey p-4"
      data-alan="rozet-seridi"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold zt-metin">Rozetler</span>
        <span className="text-xs tabular-nums zt-metin-soluk">
          {kazanilan}/{ROZETLER.length}
        </span>
      </div>

      {gruplar.map((g) => (
        <div key={g} className="mb-3 last:mb-0">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest zt-metin-soluk">
            {ROZET_GRUP_ADI[g]}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ROZETLER.filter((r) => r.oyunGrubu === g).map((r) => (
              <Rozet key={r.kod} r={r} kazanildi={kodlar.has(r.kod)} />
            ))}
          </div>
        </div>
      ))}

      <p className="mt-2 text-[11px] zt-metin-soluk">
        Soluk rozetlerin üstüne gelince nasıl kazanılacağı yazıyor.
      </p>
    </div>
  );
}
