/**
 * TurCevaplari.tsx — Maç sonunda tur tur "doğrusu neydi" listesi.
 *
 * Düello sonucunda ve arena podyumunda aynı kutu kullanılıyor: oyuncu
 * hangi turda ne sorulduğunu ve bulunabilecek en iyi cevabı görüyor.
 * Oyuncuların kendi cevapları burada YOK — rakibin ne yazdığı hiçbir
 * zaman dışarı çıkmıyor (kural 8).
 */

import type { TurCevabi } from '../tur-cevaplari';

export default function TurCevaplari({
  cevaplar,
  baslik = 'Turların cevapları',
}: {
  cevaplar: TurCevabi[];
  baslik?: string;
}) {
  if (cevaplar.length === 0) return null;

  return (
    <div className="mt-6 text-left" data-alan="tur-cevaplari">
      <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        {baslik}
      </div>
      <ul className="space-y-2">
        {cevaplar.map((c) => (
          <li
            key={c.turNo}
            className="zt-sahne flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5"
            data-alan="tur-cevabi"
          >
            <span
              aria-hidden="true"
              className="zt-rakam flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400"
            >
              {c.turNo}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold tracking-wide text-slate-300">{c.tanim}</div>
              <ul className="elyazisi mt-1 space-y-0.5 text-base text-amber-100/90">
                {c.satirlar.map((satir, i) => (
                  <li key={i}>{satir}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] text-slate-600">Tek yol değil.</p>
    </div>
  );
}
