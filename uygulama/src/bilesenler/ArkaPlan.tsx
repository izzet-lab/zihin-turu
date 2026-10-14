/**
 * ArkaPlan.tsx — Kareli kâğıt ve üstündeki soluk dev rakamlar.
 *
 * Kâğıdın kendisi CSS'te (`.zt-kagit`); burada kâğıdın üstüne elle
 * yazılmış gibi duran büyük rakamlar var. Sayı turunda rakam, kelime
 * turunda harf.
 *
 * HAREKETSİZ — BİLEREK
 * Daha önce burada yavaşça süzülen parçacıklar vardı. Kareli kâğıt
 * fikriyle birlikte kaldırıldı: defterin üstündeki yazı yüzmez.
 * Hareket oyunun kendisinde (taşlar, sayaç, kutlama); zemin
 * duruyor.
 *
 * YERLER SABİT
 * Rastgele olsaydı her çizimde zıplardı. Elle seçilmiş, dengeli
 * dağılmış bir düzen; ekranın ortasını boş bırakıyor ki oyun alanının
 * arkası en sakin yer olsun.
 */

interface Props {
  oyun?: 'sayi' | 'kelime';
  /**
   * Oyun ekranında opaklık %40'a iner. Süre işlerken arkada dikkat
   * çeken hiçbir şey olmamalı.
   */
  sessiz?: boolean;
}

/** Konum ve boyutlar yüzde cinsinden; ekran boyutundan bağımsız. */
const YERLER = [
  { sol: '-4%', ust: '2%', boy: 148 },
  { sol: '62%', ust: '-2%', boy: 112 },
  { sol: '78%', ust: '26%', boy: 92 },
  { sol: '-6%', ust: '38%', boy: 124 },
  { sol: '70%', ust: '58%', boy: 136 },
  { sol: '4%', ust: '72%', boy: 104 },
  { sol: '44%', ust: '86%', boy: 120 },
  { sol: '-2%', ust: '92%', boy: 88 },
];

const RAKAMLAR = ['7', '3', '9', '4', '8', '2', '6', '5'];
const HARFLER = ['A', 'K', 'E', 'M', 'R', 'İ', 'T', 'S'];

export default function ArkaPlan({ oyun = 'sayi', sessiz = false }: Props) {
  const isaretler = oyun === 'kelime' ? HARFLER : RAKAMLAR;

  return (
    <div
      className={`zt-arka-plan ${sessiz ? 'zt-arka-sessiz' : ''}`}
      aria-hidden="true"
      data-alan="arka-plan"
    >
      {YERLER.map((y, i) => (
        <span key={i} style={{ left: y.sol, top: y.ust, fontSize: y.boy }}>
          {isaretler[i % isaretler.length]}
        </span>
      ))}
    </div>
  );
}
