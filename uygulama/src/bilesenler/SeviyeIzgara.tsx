/**
 * SeviyeIzgara.tsx — Zorluk seçimi.
 *
 * NEDEN AYRI BİLEŞEN
 * Aynı ızgara üç yerde gerekiyor: Günün Turu, Antrenman ve Kelime Turu.
 * Zorluk ana ekrandan kaldırılıp her modun kendi ekranına taşınınca
 * (8 Ekim 2026) kopyalanması kaçınılmaz hâle geldi; kopya yerine tek
 * bileşen.
 *
 * İki sütunlu ızgara: her düğme aynı boyda, ad üstte, ayrıntı altta.
 * Önce yan yana sarılan çiplerdi; çipler farklı genişlikte çıkıyor,
 * satır sonları düzensiz sarıyor ve ekran dağınık görünüyordu.
 */

import type { Seviye } from '@tamisabet/cekirdek';
import Ikon from './Ikon';

interface Props {
  seviyeler: readonly Seviye[];
  /** Açık (oynanabilir) seviye anahtarları. */
  acik: readonly string[];
  secili: string;
  onSec: (anahtar: string) => void;
  /** Oyuncu henüz tek seviye açmışsa yönlendirici not gösterilir. */
  ilkKezMi?: boolean;
  /** Kilitli bir seviyeye dokunulduğunda gösterilen açıklama. */
  kilitAciklama?: string | null;
  baslik?: string;
}

export default function SeviyeIzgara({
  seviyeler,
  acik,
  secili,
  onSec,
  ilkKezMi,
  kilitAciklama,
  baslik = 'Zorluk',
}: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold zt-metin">{baslik}</span>
        {ilkKezMi && <span className="text-[11px] zt-vurgu-metin">Isınma ile başlıyorsun</span>}
      </div>

      <div className="grid grid-cols-2 gap-2.5" data-alan="seviyeler">
        {seviyeler.map((s) => {
          const kilitliMi = !acik.includes(s.anahtar);
          const seciliMi = !kilitliMi && secili === s.anahtar;
          return (
            <button
              key={s.anahtar}
              data-seviye={s.anahtar}
              data-kilitli={kilitliMi ? 'true' : undefined}
              onClick={() => onSec(s.anahtar)}
              aria-pressed={seciliMi}
              aria-disabled={kilitliMi}
              className={`zt-secim relative min-h-[60px] rounded-xl border-2 px-3 py-2.5 text-left transition ${
                kilitliMi
                  ? 'cursor-not-allowed zt-cizgi zt-yuzey opacity-60'
                  : seciliMi
                    ? 'zt-secim-acik zt-vurgu-cizgi zt-dugme'
                    : 'zt-cizgi zt-yuzey-2'
              }`}
            >
              {seciliMi && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-2 text-[11px] font-black zt-metin/60"
                >
                  ✓
                </span>
              )}
              {/* pr-6: seçili rozetiyle çakışmasın. */}
              <span
                className={`block pr-6 font-black ${
                  kilitliMi ? 'zt-metin-soluk' : seciliMi ? 'zt-metin' : 'zt-metin'
                }`}
              >
                {kilitliMi && <Ikon ad="kilit" boyut={14} className="mr-1.5 -mt-0.5" />}
                {s.etiket}
              </span>
              <span
                className={`mt-0.5 block text-[11px] ${
                  kilitliMi ? 'zt-metin-soluk' : seciliMi ? 'zt-metin-soluk' : 'zt-metin-soluk'
                }`}
              >
                {s.altEtiket}
              </span>
            </button>
          );
        })}
      </div>

      {ilkKezMi && !kilitAciklama && (
        <p className="mt-2 text-[11px] zt-metin-soluk">
          Isınma'da tam isabet yaptığında bir sonraki seviye açılır.
        </p>
      )}
      {kilitAciklama && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] zt-odul-yazi">
          <Ikon ad="kilit" boyut={13} />
          {kilitAciklama}
        </p>
      )}
    </div>
  );
}
