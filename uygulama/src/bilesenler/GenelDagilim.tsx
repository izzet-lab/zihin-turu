/**
 * GenelDagilim.tsx — Genel sıralama satırının iki parçalı çubuğu.
 *
 * NEDEN VAR
 * Genel tabloda tek başına toplam, kimin DENGELİ olduğunu söylemiyor.
 * 400 puan, 400'ü sayıdan gelen bir oyuncuda da, 200+200 bölünen bir
 * oyuncuda da aynı görünüyordu — oysa tablonun bütün amacı ikinciyi
 * değerli kılmak. Çubuk bunu bir bakışta gösteriyor.
 *
 * Bonus çubukta AYRI bir parça değil: bonus iki oyunun birlikte
 * oynanmasından doğuyor, kendi başına bir "pay"ı yok. Rakamla
 * yazılıyor, çünkü oyuncunun onu kazandığını bilmesi gerekiyor.
 */

interface Props {
  sayiPuan: number;
  kelimePuan: number;
  bonus?: number;
  /** Küçük satırlarda (profil kartı) daha ince çizilir. */
  ince?: boolean;
}

export default function GenelDagilim({ sayiPuan, kelimePuan, bonus = 0, ince }: Props) {
  const toplam = sayiPuan + kelimePuan;
  if (toplam <= 0) return null;

  const sayiYuzde = Math.round((sayiPuan / toplam) * 100);

  return (
    <div data-alan="genel-dagilim">
      <div
        className={`flex w-full overflow-hidden rounded-full zt-ayirac ${ince ? 'h-1.5' : 'h-2'}`}
        role="img"
        aria-label={`Sayı turu ${sayiPuan} puan, kelime turu ${kelimePuan} puan`}
      >
        {/* Sayı payı vurgu renginde, kelime payı ödül renginde: ikisi
            ekranın başka yerlerinde de aynı anlamı taşıyor. Sıfır olan
            parça hiç çizilmiyor, yoksa ince bir şerit "biraz var" gibi
            okunuyordu. */}
        {sayiPuan > 0 && (
          <span
            className="zt-dugme h-full"
            style={{ width: `${sayiYuzde}%` }}
            data-pay="sayi"
            aria-hidden="true"
          />
        )}
        {kelimePuan > 0 && (
          <span
            className="zt-odul-dolgu h-full flex-1"
            data-pay="kelime"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] tabular-nums zt-metin-soluk">
        <span>
          Sayı <span className="zt-metin font-bold">{sayiPuan}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Kelime <span className="zt-metin font-bold">{kelimePuan}</span>
        </span>
        {bonus > 0 && (
          <span className="zt-odul-yazi font-bold" data-alan="genel-bonus">
            +{bonus} çifte tur
          </span>
        )}
      </div>
    </div>
  );
}
