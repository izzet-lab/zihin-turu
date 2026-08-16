import { useMemo, useState } from 'react';
import type { Seviye } from '@zihinturu/cekirdek';
import { bugun, gunlukKilitli, serit, oku, kaliciMi } from '../depo';

export type Mod = 'antrenman' | 'gunun';

export interface BaslaAyar {
  mod: Mod;
  seviye: string;
  seviyeEtiket: string;
  sure: number; // saniye; 0 = süresiz
  buyukAdet: number;
}

interface Props {
  seviyeler: readonly Seviye[];
  onBasla: (a: BaslaAyar) => void;
}

const SURE_SECENEK = [45, 60, 90, 0]; // 0 = süresiz (yalnızca Antrenman)

export default function Kurulum({ seviyeler, onBasla }: Props) {
  const [mod, setMod] = useState<Mod>('gunun');
  const [seviye, setSeviye] = useState<string>('normal');
  const [sure, setSure] = useState<number>(90);
  const [buyukAdet, setBuyukAdet] = useState<number>(2);

  const secili = seviyeler.find((s) => s.anahtar === seviye) ?? seviyeler[0]!;
  const gun = bugun();

  // Günün Turu için kilit, seri ve 28 günlük şerit
  const il = oku();
  const kilitli = mod === 'gunun' && gunlukKilitli(seviye, gun, il);
  const seritler = useMemo(() => serit(seviye, gun, 28, il), [seviye, gun, il]);
  const seri = il.seri.gun;

  function basla() {
    if (kilitli) return;
    // Günün Turu herkese aynı koşul: süre seviyeden gelir, büyük sayı sabittir.
    const etkinSure = mod === 'gunun' ? secili.sure : sure;
    const etkinBuyuk = mod === 'gunun' ? 2 : buyukAdet;
    onBasla({ mod, seviye, seviyeEtiket: secili.etiket, sure: etkinSure, buyukAdet: etkinBuyuk });
  }

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-9 w-9" />
          <div>
            <h1 className="text-2xl font-black leading-none text-white">Sayı Turu</h1>
            <p className="text-xs text-slate-500">Rakamlar, dört işlem, bir hedef.</p>
          </div>
        </header>

        {/* Mod seçimi */}
        <div className="mt-7">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Mod</div>
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Mod">
            {(
              [
                { k: 'gunun', ad: 'Günün Turu', not: 'Herkese aynı bulmaca' },
                { k: 'antrenman', ad: 'Antrenman', not: 'Serbest, sınırsız' },
              ] as const
            ).map((m) => (
              <button
                key={m.k}
                data-mod={m.k}
                onClick={() => setMod(m.k)}
                aria-pressed={mod === m.k}
                className={`min-h-[56px] rounded-xl border px-4 py-3 text-left transition ${
                  mod === m.k
                    ? 'border-cyan-300/50 bg-cyan-300/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-slate-100">{m.ad}</div>
                <div className="text-[11px] text-slate-500">{m.not}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seviye seçimi */}
        <div className="mt-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Seviye</div>
          <div className="flex flex-wrap gap-2" data-alan="seviyeler">
            {seviyeler.map((s) => (
              <button
                key={s.anahtar}
                data-seviye={s.anahtar}
                onClick={() => setSeviye(s.anahtar)}
                aria-pressed={seviye === s.anahtar}
                className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm transition ${
                  seviye === s.anahtar
                    ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="font-bold">{s.etiket}</span>
                <span className="ml-1.5 text-[11px] text-slate-500">{s.altEtiket}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Antrenman ayarları */}
        {mod === 'antrenman' && (
          <div className="mt-6 space-y-5" data-alan="antrenman-ayar">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Süre</div>
              <div className="flex flex-wrap gap-2">
                {SURE_SECENEK.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSure(s)}
                    aria-pressed={sure === s}
                    className={`min-h-[44px] rounded-lg border px-4 text-sm transition ${
                      sure === s
                        ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    {s === 0 ? 'Süresiz' : `${s} sn`}
                  </button>
                ))}
              </div>
            </div>

            {secili.anahtar !== 'cocuk' && secili.anahtar !== 'kolay' && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Büyük sayı (25/50/75/100)
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBuyukAdet(n)}
                      aria-pressed={buyukAdet === n}
                      className={`min-h-[44px] w-14 rounded-lg border text-sm transition ${
                        buyukAdet === n
                          ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                          : 'border-slate-800 bg-slate-900/40 text-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Günün Turu paneli: seri + şerit */}
        {mod === 'gunun' && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="seri">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Kesintisiz seri: <span className="font-bold text-cyan-300" data-alan="seri-gun">{seri}</span> gün
              </div>
              <div className="text-xs text-slate-500">Son 28 gün</div>
            </div>
            <div className="mt-3 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1" aria-hidden="true">
              {seritler.map((g) => (
                <span
                  key={g.tarih}
                  title={g.tarih}
                  className={`h-3.5 rounded-sm ${
                    g.durum === 'tam'
                      ? 'bg-cyan-300'
                      : g.durum === 'yakin'
                        ? 'bg-cyan-300/40'
                        : g.durum === 'uzak'
                          ? 'bg-slate-600'
                          : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Başlat / kilit */}
        <div className="mt-8">
          {kilitli ? (
            <div
              data-alan="kilit"
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-center text-sm text-slate-400"
            >
              Bugünün turu bu seviyede <span className="font-bold text-slate-200">tamamlandı</span>. Yarın yeni tur.
            </div>
          ) : (
            <button
              data-alan="basla"
              onClick={basla}
              className="min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition hover:bg-cyan-200 active:scale-[.99]"
            >
              {mod === 'gunun' ? 'Günün Turunu Oyna' : 'Başla'}
            </button>
          )}
        </div>

        {!kaliciMi() && (
          <p className="mt-4 text-center text-xs text-amber-400/80">
            Not: Bu tarayıcıda ilerleme kaydedilemiyor; sonuçların bu oturumla sınırlı kalabilir.
          </p>
        )}
      </div>
    </main>
  );
}
