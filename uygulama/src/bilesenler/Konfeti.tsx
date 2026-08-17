import { useMemo } from 'react';

/**
 * Tam isabet animasyonu — hafif, bağımlılıksız konfeti.
 * Yalnızca CSS animasyonu kullanır, canvas/kütüphane yok.
 */

const RENKLER = ['#7CEDFB', '#F59E0B', '#34D399', '#F472B6', '#A78BFA'];
const PARCA_SAYISI = 26;

interface Parca {
  sol: number;
  gecikme: number;
  sure: number;
  renk: string;
  boyut: number;
  don: number;
}

export default function Konfeti() {
  const parcalar = useMemo<Parca[]>(
    () =>
      Array.from({ length: PARCA_SAYISI }, () => ({
        sol: Math.random() * 100,
        gecikme: Math.random() * 0.25,
        sure: 0.9 + Math.random() * 0.6,
        renk: RENKLER[Math.floor(Math.random() * RENKLER.length)]!,
        boyut: 6 + Math.random() * 6,
        don: Math.random() * 360,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {parcalar.map((p, i) => (
        <span
          key={i}
          className="konfeti-parca"
          style={{
            left: `${p.sol}%`,
            width: p.boyut,
            height: p.boyut * 0.4,
            backgroundColor: p.renk,
            animationDelay: `${p.gecikme}s`,
            animationDuration: `${p.sure}s`,
            transform: `rotate(${p.don}deg)`,
          }}
        />
      ))}
    </div>
  );
}
