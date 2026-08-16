import { useEffect, useReducer, useRef, useState } from 'react';
import type { Tur } from '@zihinturu/cekirdek';
import { puanlaHesap, type Islem, type SayiVeri } from '@zihinturu/oyun-sayi';
import { baslat, ilerle, enYakinTas, enYakinFark, type Tas } from '../motor';

export interface OyunSonuc {
  fark: number;
  puan: number;
  kalan: number;
  ulasilan: number | null;
}

interface Props {
  tur: Tur;
  seviye: string;
  sure: number; // 0 = süresiz
  onBitti: (s: OyunSonuc) => void;
  onYardim: () => void;
}

const ISLEMLER: { op: Islem; ad: string }[] = [
  { op: '+', ad: 'topla' },
  { op: '−', ad: 'çıkar' },
  { op: '×', ad: 'çarp' },
  { op: '÷', ad: 'böl' },
];

export default function Oyun({ tur, seviye, sure, onBitti, onYardim }: Props) {
  const veri = tur.veri as SayiVeri;
  const hedef = veri.hedef;

  const [durum, gonder] = useReducer(ilerle, veri.sayilar, baslat);
  const [kalan, setKalan] = useState<number>(sure);
  const bittiRef = useRef(false);

  const yakinTas = enYakinTas(durum, hedef);
  const yakinFark = enYakinFark(durum, hedef);
  const tamIsabet = yakinFark === 0;

  // Bitiş: en yakın taşın zinciri cevaptır; puanı oyun-sayi hesaplar.
  function bitir() {
    if (bittiRef.current) return;
    bittiRef.current = true;
    const t: Tas = enYakinTas(durum, hedef);
    const fark = Math.abs(t.deger - hedef);
    // Tek kişilikte "ilk bulan" primi yok (rakip yok).
    const puan = puanlaHesap(seviye, fark, kalan, sure, false);
    onBitti({ fark, puan: puan.toplam, kalan, ulasilan: t.deger });
  }

  // Süre sayacı (yalnızca süreli modda)
  useEffect(() => {
    if (sure <= 0) return;
    const z = setInterval(() => {
      setKalan((k) => {
        if (k <= 1) {
          clearInterval(z);
          return 0;
        }
        return k - 1;
      });
    }, 1000);
    return () => clearInterval(z);
  }, [sure]);

  // Süre bitince tur kapanır
  useEffect(() => {
    if (sure > 0 && kalan === 0) bitir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalan, sure]);

  // Tam isabet olunca kısa bir gecikmeyle tur kapanır
  useEffect(() => {
    if (!tamIsabet) return;
    const z = setTimeout(() => bitir(), 650);
    return () => clearTimeout(z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamIsabet]);

  // Hata mesajı kendiliğinden söner
  useEffect(() => {
    if (!durum.hata) return;
    const z = setTimeout(() => gonder({ t: 'hataTemizle' }), 1400);
    return () => clearTimeout(z);
  }, [durum.hata]);

  const sureYuzde = sure > 0 ? Math.max(0, (kalan / sure) * 100) : 100;

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div className="flex justify-end">
          <button
            onClick={onYardim}
            data-alan="yardim-ac"
            aria-label="Nasıl oynanır"
            className="min-h-[44px] min-w-[44px] rounded-full border border-slate-700 bg-slate-900/60 text-lg font-black text-cyan-200"
          >
            ?
          </button>
        </div>

        {/* Hedef + en yakın */}
        <div className="mt-1 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Hedef</div>
            <div className="text-5xl font-black leading-none text-white" data-alan="hedef">
              {hedef}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">En yakın</div>
            <div
              data-alan="en-yakin"
              className={`text-3xl font-black leading-none ${tamIsabet ? 'text-cyan-300' : 'text-slate-300'}`}
            >
              {tamIsabet ? 'Tam!' : yakinTas.deger}
            </div>
            <div className="text-[11px] text-slate-500">
              {tamIsabet ? 'hedefe ulaştın' : `${yakinFark} fark`}
            </div>
          </div>
        </div>

        {/* Süre çubuğu */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
              sureYuzde < 25 ? 'bg-amber-400' : 'bg-cyan-300'
            }`}
            style={{ width: `${sureYuzde}%` }}
            data-alan="sure-cubuk"
          />
        </div>
        <div className="mt-1 text-right text-[11px] text-slate-500">
          {sure > 0 ? `${kalan} sn` : 'süresiz'}
        </div>

        {/* Taş rafı */}
        <div className="mt-5 grid grid-cols-4 gap-2.5" data-alan="raf">
          {durum.taslar.map((t) => {
            const secili = durum.secimA === t.id;
            const uretilmis = t.yol.length > 0;
            return (
              <button
                key={t.id}
                data-tas={t.deger}
                onClick={() => gonder({ t: 'tas', id: t.id })}
                aria-pressed={secili}
                className={`min-h-[64px] rounded-xl border text-2xl font-black transition active:scale-95 ${
                  secili
                    ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100 ring-2 ring-cyan-300/60'
                    : uretilmis
                      ? 'border-cyan-300/25 bg-slate-800/70 text-cyan-100'
                      : 'border-slate-700 bg-slate-800/50 text-slate-100'
                }`}
              >
                {t.deger}
              </button>
            );
          })}
        </div>

        {/* İşlem tuşları */}
        <div className="mt-3 grid grid-cols-4 gap-2.5" data-alan="islemler">
          {ISLEMLER.map((i) => (
            <button
              key={i.op}
              data-islem={i.op}
              aria-label={i.ad}
              onClick={() => gonder({ t: 'islem', op: i.op })}
              className={`min-h-[52px] rounded-xl border text-2xl font-black transition active:scale-95 ${
                durum.islem === i.op
                  ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-200'
              }`}
            >
              {i.op}
            </button>
          ))}
        </div>

        {/* Hata */}
        <div className="mt-2 h-5 text-center text-xs text-amber-400" role="status" data-alan="hata">
          {durum.hata ?? ''}
        </div>

        {/* İşlem geçmişi */}
        <div className="mt-1 min-h-[64px] rounded-xl border border-slate-800 bg-slate-900/30 p-3" data-alan="gecmis">
          {durum.gecmis.length === 0 ? (
            <div className="text-center text-xs text-slate-600">İki taş ve bir işlem seç.</div>
          ) : (
            <ul className="space-y-1 text-sm text-slate-300">
              {durum.gecmis.map((a, i) => (
                <li key={i} className="tabular-nums">
                  {a.a} {a.islem} {a.b} = <span className="font-bold text-slate-100">{a.sonuc}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alt eylemler */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <button
            onClick={() => gonder({ t: 'geriAl' })}
            disabled={durum.yigin.length === 0}
            className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-900/60 text-sm font-bold text-slate-200 disabled:opacity-40"
          >
            Geri al
          </button>
          <button
            onClick={() => gonder({ t: 'sifirla' })}
            className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-900/60 text-sm font-bold text-slate-200"
          >
            Sıfırla
          </button>
          <button
            data-alan="bitir"
            onClick={bitir}
            className="min-h-[52px] rounded-xl bg-cyan-300 text-sm font-black text-slate-900 hover:bg-cyan-200"
          >
            Bitir
          </button>
        </div>
      </div>
    </main>
  );
}
