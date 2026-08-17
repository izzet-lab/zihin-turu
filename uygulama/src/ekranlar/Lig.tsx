/**
 * Lig.tsx — Günlük, haftalık, aylık sıralamalar
 * Sekmeler: Günlük / Hafta / Ay
 * Seviye seçici: Isınma, Kolay, Normal, Zor, Usta
 * İlk 100 + kendi sıra hep görünür
 */

import { useEffect, useState, useMemo } from 'react';
import { sayiTuru } from '@zihinturu/oyun-sayi';
import {
  haftalikAnahtar,
  aylikAnahtar,
  donemKalanSn,
  kalanSureMetin,
  gunlukLig,
  donemLig,
  type LigSatiri,
  type KendiDurumu,
} from '../lig-sorgu';
import { bugun } from '../depo';

type Sekme = 'gunluk' | 'haftalik' | 'aylik';

interface Props {
  oyuncuId?: string; // null = misafir; kendi sırası gösterilmez
}

export default function Lig({ oyuncuId }: Props) {
  const [sekme, setSekme] = useState<Sekme>('gunluk');
  const [seviye, setSeviye] = useState<string>('normal');
  const [satirlar, setSatirlar] = useState<LigSatiri[]>([]);
  const [kendi, setKendi] = useState<KendiDurumu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  const kalanSn = useMemo(() => donemKalanSn(sekme), [sekme]);
  const kalanMetin = kalanSureMetin(kalanSn);

  async function sorguYap() {
    setYukleniyor(true);
    try {
      const tarih = bugun();
      let result;

      if (sekme === 'gunluk') {
        result = await gunlukLig('sayi', seviye, tarih, oyuncuId);
      } else if (sekme === 'haftalik') {
        const anahtar = haftalikAnahtar();
        result = await donemLig('hafta', anahtar, 'sayi', seviye, oyuncuId);
      } else {
        const anahtar = aylikAnahtar();
        result = await donemLig('ay', anahtar, 'sayi', seviye, oyuncuId);
      }

      setSatirlar(result.satirlar);
      setKendi(result.kendi ?? null);
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => {
    sorguYap();
  }, [sekme, seviye, oyuncuId]);

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Başlık */}
        <header className="mb-8">
          <a href="/" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-300">
            ← Ana sayfa
          </a>
          <h1 className="text-2xl font-black text-white mb-1">Sıralamalar</h1>
          <p className="text-xs text-slate-500">
            {sekme === 'gunluk' && 'Bugünkü en iyi puanlar'}
            {sekme === 'haftalik' && 'Bu haftanın puanları'}
            {sekme === 'aylik' && 'Bu ayın puanları'}
          </p>
        </header>

        {/* Sekme seçimi */}
        <div className="mb-6 grid grid-cols-3 gap-2" role="tablist" aria-label="Dönem">
          {(
            [
              { k: 'gunluk', ad: 'Günlük' },
              { k: 'haftalik', ad: 'Haftalık' },
              { k: 'aylik', ad: 'Aylık' },
            ] as const
          ).map((s) => (
            <button
              key={s.k}
              onClick={() => setSekme(s.k)}
              aria-pressed={sekme === s.k}
              className={`min-h-[48px] rounded-lg border px-3 py-2 text-sm font-bold transition ${
                sekme === s.k
                  ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                  : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
              }`}
            >
              {s.ad}
            </button>
          ))}
        </div>

        {/* Seviye seçimi */}
        <div className="mb-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Seviye</div>
          <div className="flex flex-wrap gap-2">
            {seviyeler.map((s) => (
              <button
                key={s.anahtar}
                onClick={() => setSeviye(s.anahtar)}
                aria-pressed={seviye === s.anahtar}
                className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  seviye === s.anahtar
                    ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                }`}
              >
                {s.etiket}
              </button>
            ))}
          </div>
        </div>

        {/* Kalan süre */}
        <div className="mb-6 text-center text-xs text-slate-500">
          {sekme === 'gunluk' && `Sıralama saat başında güncellenir`}
          {sekme === 'haftalik' && `Hafta pazartesi başlar — ${kalanMetin} kaldı`}
          {sekme === 'aylik' && `Ay sonuna — ${kalanMetin} kaldı`}
        </div>

        {/* Yükleniyor */}
        {yukleniyor && (
          <div className="text-center text-slate-400 py-8">
            <div className="inline-block w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm">Sıralama yükleniyor...</p>
          </div>
        )}

        {/* Sıralama tablosu */}
        {!yukleniyor && satirlar.length > 0 && (
          <div className="space-y-3">
            {satirlar.map((s) => (
              <div
                key={`${s.sira}`}
                className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
              >
                <div className="w-8 text-center font-bold text-slate-500 text-sm">
                  {s.sira <= 3 ? ['🥇', '🥈', '🥉'][s.sira - 1]! : `${s.sira}`}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-200">{s.kullaniciAdi}</div>
                  {s.gunSayisi !== undefined && (
                    <div className="text-xs text-slate-500">{s.gunSayisi} gün oynadı</div>
                  )}
                </div>
                <div className="text-right font-bold text-cyan-300">{s.puan}</div>
              </div>
            ))}

            {/* Kendi sırası (misafir değilse ve ilk 100 içinde değilse) */}
            {oyuncuId && kendi && kendi.sira > satirlar.length && (
              <>
                <div className="text-center text-xs text-slate-600 py-2">⋮</div>
                <div className="flex items-center gap-3 rounded-lg border border-cyan-300/30 bg-cyan-300/5 px-4 py-3 ring-1 ring-cyan-300/20">
                  <div className="w-8 text-center font-bold text-cyan-300 text-sm">
                    {kendi.sira}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-cyan-200">Sen</div>
                  </div>
                  <div className="text-right font-bold text-cyan-300">{kendi.puan}</div>
                </div>
              </>
            )}

            {/* Misafir notu */}
            {!oyuncuId && (
              <p className="text-center text-xs text-slate-600 py-4">
                Sıralamaya girmek için giriş yap →
              </p>
            )}
          </div>
        )}

        {/* Boş */}
        {!yukleniyor && satirlar.length === 0 && (
          <div className="text-center text-slate-500 py-12">
            <p className="text-sm">Henüz kimse bu seviyede oynamadı.</p>
          </div>
        )}
      </div>
    </main>
  );
}

// Seviye listesi (Kurulum.tsx ile eşleşmelidir)
const seviyeler = sayiTuru.seviyeler.slice(0, 5); // Ilk 5 seviye (Isınma–Usta)
