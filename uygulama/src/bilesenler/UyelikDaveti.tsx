import type { ReactNode } from 'react';

/**
 * UyelikDaveti — misafire gösterilen "üye ol" kartı.
 *
 * NEDEN KART, NEDEN AÇILIR PENCERE DEĞİL
 * Açılır pencere oyun akışını keser ve kapatmak için el hareketi
 * gerektirir; oyuncu okumadan kapatır. Kart akışın içinde durur,
 * kaydırılıp geçilebilir, istenirse kapatılır.
 *
 * Başlık her zaman oyuncunun KENDİ sayısını taşır — "puanların kalıcı
 * olur" gibi soyut bir vaat değil, o an ekranda duran somut kayıp.
 */

interface Props {
  /** Kalın başlık — somut kaybı söyler. Örn: "11 puanın kaydedilmedi". */
  baslik: string;
  /** Bir cümlelik açıklama. */
  aciklama: ReactNode;
  /** Birincil düğme metni. */
  eylemMetni: string;
  onEylem: () => void;
  /** Verilirse ikincil "Şimdi değil" düğmesi çıkar. */
  onKapat?: () => void;
  /** Vurgulu görünüm — Günün Turu gibi tek seferlik fırsatlar için. */
  vurgulu?: boolean;
  'data-alan'?: string;
}

export default function UyelikDaveti({
  baslik,
  aciklama,
  eylemMetni,
  onEylem,
  onKapat,
  vurgulu = false,
  'data-alan': alan,
}: Props) {
  return (
    <div
      data-alan={alan}
      className={`mt-6 rounded-2xl border px-5 py-4 ${
        vurgulu
          ? 'border-cyan-300/50 bg-cyan-300/10'
          : 'border-slate-700 bg-slate-900/60'
      }`}
    >
      <div className={`text-base font-black ${vurgulu ? 'text-cyan-200' : 'text-slate-100'}`}>
        {baslik}
      </div>
      <p className="mt-1 text-sm leading-snug text-slate-400">{aciklama}</p>
      <div className={`mt-3 ${onKapat ? 'grid grid-cols-2 gap-2.5' : ''}`}>
        <button
          onClick={onEylem}
          data-alan="davet-eylem"
          className={`min-h-[48px] w-full rounded-xl text-sm font-black ${
            vurgulu
              ? 'bg-cyan-300 text-slate-900 hover:bg-cyan-200'
              : 'bg-slate-200 text-slate-900 hover:bg-white'
          }`}
        >
          {eylemMetni}
        </button>
        {onKapat && (
          <button
            onClick={onKapat}
            data-alan="davet-kapat"
            className="min-h-[48px] w-full rounded-xl border border-slate-700 text-sm font-bold text-slate-400 hover:text-slate-200"
          >
            Şimdi değil
          </button>
        )}
      </div>
    </div>
  );
}
