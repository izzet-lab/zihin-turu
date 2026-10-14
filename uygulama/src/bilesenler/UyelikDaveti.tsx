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
          ? 'zt-vurgu-cizgi zt-vurgu-yuzey'
          : 'zt-cizgi zt-yuzey'
      }`}
    >
      <div className={`text-base font-black ${vurgulu ? 'zt-vurgu-metin' : 'zt-metin'}`}>
        {baslik}
      </div>
      <p className="mt-1 text-sm leading-snug zt-metin-soluk">{aciklama}</p>
      <div className={`mt-3 ${onKapat ? 'grid grid-cols-2 gap-2.5' : ''}`}>
        <button
          onClick={onEylem}
          data-alan="davet-eylem"
          className={`min-h-[48px] w-full rounded-xl text-sm font-black ${
            vurgulu
              ? 'zt-dugme '
              : 'border zt-cizgi zt-yuzey zt-metin'
          }`}
        >
          {eylemMetni}
        </button>
        {onKapat && (
          <button
            onClick={onKapat}
            data-alan="davet-kapat"
            className="min-h-[48px] w-full rounded-xl border zt-cizgi text-sm font-bold zt-metin-soluk"
          >
            Şimdi değil
          </button>
        )}
      </div>
    </div>
  );
}
