/**
 * KisaSiralama.tsx — Ana ekranın alt kısmındaki ilk 10 listesi.
 *
 * NEDEN ANA EKRANDA
 * Sıralama ayrı bir sayfadaydı ve oyuncu oraya ancak menüden
 * gidebiliyordu; "kaçıncıyım" sorusu oyunu açan herkesin ilk sorusu
 * olduğu hâlde kimse görmüyordu. Burada ilk 10 duruyor, tamamı için
 * Sıralamalar'a bağlanıyor.
 *
 * NEDEN DÜELLO VE ARENA
 * Günlük/haftalık tablolar seviyeye göre bölünüyor; ana ekranda hangi
 * seviyeyi göstereceğimiz belirsiz olurdu. Düello derecesi ve arena
 * madalyası seviyeden bağımsız tek bir sicil — ana ekrana sığan
 * tablolar bunlar.
 */

import { useEffect, useState } from 'react';
import { arenaLig, duelloLig, type LigSatiri } from '../lig-sorgu';

type Sekme = 'duello' | 'arena';

interface Props {
  oyuncuId?: string;
  /** Sıralamalar sayfasına götürür. */
  onTumu: (sekme: Sekme) => void;
}

const GOSTERILEN = 10;

export default function KisaSiralama({ oyuncuId, onTumu }: Props) {
  const [sekme, setSekme] = useState<Sekme>('duello');
  const [satirlar, setSatirlar] = useState<LigSatiri[] | null>(null);

  useEffect(() => {
    let iptal = false;
    setSatirlar(null);
    const sorgu = sekme === 'duello' ? duelloLig(oyuncuId) : arenaLig(oyuncuId);
    sorgu
      .then((s) => {
        if (!iptal) setSatirlar(s.satirlar.slice(0, GOSTERILEN));
      })
      .catch(() => {
        if (!iptal) setSatirlar([]);
      });
    return () => {
      iptal = true;
    };
  }, [sekme, oyuncuId]);

  return (
    <div
      className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
      data-alan="kisa-siralama"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-300">İlk 10</span>
        <button
          onClick={() => onTumu(sekme)}
          className="zt-dokunma-satirici text-xs font-bold text-cyan-300 hover:underline"
          data-alan="kisa-siralama-tumu"
        >
          Tümü →
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2" role="tablist" aria-label="Sıralama türü">
        {(
          [
            { k: 'duello' as Sekme, ad: '⚔️ Düello' },
            { k: 'arena' as Sekme, ad: '⚡ Arena' },
          ]
        ).map((s) => (
          <button
            key={s.k}
            data-kisa-sekme={s.k}
            onClick={() => setSekme(s.k)}
            aria-pressed={sekme === s.k}
            className={`min-h-[40px] rounded-lg border text-xs font-bold transition ${
              sekme === s.k
                ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                : 'border-slate-800 bg-slate-900/40 text-slate-300'
            }`}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {satirlar === null ? (
        <p className="py-3 text-center text-xs text-slate-600">Yükleniyor…</p>
      ) : satirlar.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">
          {sekme === 'duello' ? 'Henüz düello oynanmamış — ilk sen ol.' : 'Henüz arena oynanmamış — ilk podyum senin olsun.'}
        </p>
      ) : (
        <ol className="space-y-1">
          {satirlar.map((s) => (
            <li
              key={`${s.sira}-${s.kullaniciAdi}`}
              data-alan="kisa-satir"
              data-ben={s.benimMi ? '1' : undefined}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                s.benimMi ? 'bg-cyan-300/10' : ''
              }`}
            >
              <span className="w-5 shrink-0 text-right tabular-nums text-slate-500">{s.sira}</span>
              <span
                className={`min-w-0 flex-1 truncate font-bold ${
                  s.benimMi ? 'text-cyan-200' : 'text-slate-300'
                }`}
              >
                {s.kullaniciAdi}
              </span>
              <span className="shrink-0 tabular-nums text-slate-400">
                {sekme === 'duello'
                  ? `${s.puan} derece`
                  : `🥇${s.altin ?? 0} 🥈${s.gumus ?? 0} 🥉${s.bronz ?? 0}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
