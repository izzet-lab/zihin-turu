import { useEffect, useState } from 'react';
import Logo from './bilesenler/Logo';

/**
 * Faz 0 — "Yakında" sayfası.
 *
 * Amacı üç şey: alan adının canlı olduğunu göstermek, marka kimliğini
 * kurmak, ve ilk meraklıları sosyal hesaplara yönlendirmek. Henüz
 * arka uç yok, bu yüzden e-posta toplamıyoruz — toplayıp saklayamayız.
 *
 * Faz 2'de bu sayfanın yerini oyunun kendisi alacak.
 */

const OYUNLAR = [
  { ad: 'Sayı Turu', aciklama: 'Altı rakam, dört işlem, bir hedef.', hazir: true },
  { ad: 'Kelime Turu', aciklama: 'Sekiz harf, en uzun kelime.', hazir: false },
];

export default function Yakinda() {
  const [gorunur, setGorunur] = useState(false);
  useEffect(() => {
    const z = setTimeout(() => setGorunur(true), 60);
    return () => clearTimeout(z);
  }, []);

  return (
    <main className="min-h-dvh zt-kagit zt-metin flex items-center justify-center px-6 py-16">
      <div
        className={`w-full max-w-md transition-all duration-700 ${
          gorunur ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <Logo boyut={64} className="zt-vurgu-metin mb-7" />

        <h1 className="text-4xl font-black tracking-tight zt-metin leading-none">
          Tam İsabet
        </h1>
        <p className="mt-3 text-base leading-relaxed zt-metin-soluk">
          Türkçe zihin oyunu. Tek başına, karşılıklı ya da arenada.
          Her gün herkese aynı bulmaca.
        </p>

        <div className="mt-9 space-y-2">
          {OYUNLAR.map((o) => (
            <div
              key={o.ad}
              className="flex items-center justify-between gap-4 rounded-xl border zt-cizgi zt-yuzey px-4 py-3.5"
            >
              <div>
                <div className="font-bold zt-metin">{o.ad}</div>
                <div className="text-sm zt-metin-soluk">{o.aciklama}</div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  o.hazir
                    ? 'zt-vurgu-yuzey zt-vurgu-metin'
                    : 'zt-ayirac zt-metin-soluk'
                }`}
              >
                {o.hazir ? 'Yakında' : 'Sırada'}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-9 text-sm zt-metin-soluk leading-relaxed">
          Üye olmadan da oynanacak. Reklam olmayacak.
        </p>

        <footer className="mt-14 border-t zt-cizgi pt-5 text-xs zt-metin-soluk">
          © {new Date().getFullYear()} Tam İsabet
        </footer>
      </div>
    </main>
  );
}
