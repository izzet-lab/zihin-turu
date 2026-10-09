/**
 * Parcaciklar.tsx — Oyun tahtasının arkasında süzülen soluk noktalar.
 *
 * NEDEN VAR
 * Oyun ekranı dururken tamamen hareketsizdi. Birkaç çok yavaş parçacık,
 * ekranın canlı olduğunu söyleyen en ucuz işaret.
 *
 * NEDEN AZ VE SÖNÜK
 * Bu bir dikkat oyunu; arka plan dikkat çekerse zarar verir. Altı
 * parçacık, yarım saydamlıktan da az, yirmi saniyeden uzun turlarla.
 * Yerleri ve hızları sabit — rastgele olsaydı her çizimde zıplardı.
 *
 * Konumlandırma `fixed`, tıklama geçirmiyor, ekran okuyucuya görünmez.
 * "Hareketi azalt" açıkken CSS tarafında hiç çizilmiyor.
 */

const PARCACIKLAR = [
  { sol: '12%', ust: '24%', boy: 90, sure: 26, gecikme: 0 },
  { sol: '78%', ust: '18%', boy: 60, sure: 34, gecikme: 6 },
  { sol: '34%', ust: '62%', boy: 120, sure: 30, gecikme: 12 },
  { sol: '88%', ust: '70%', boy: 70, sure: 38, gecikme: 3 },
  { sol: '6%', ust: '82%', boy: 100, sure: 32, gecikme: 18 },
  { sol: '58%', ust: '40%', boy: 50, sure: 28, gecikme: 9 },
];

export default function Parcaciklar() {
  return (
    <div className="zt-parcacik-alani" aria-hidden="true">
      {PARCACIKLAR.map((p, i) => (
        <span
          key={i}
          className="zt-parcacik"
          style={{
            left: p.sol,
            top: p.ust,
            width: p.boy,
            height: p.boy,
            animationDuration: `${p.sure}s`,
            animationDelay: `-${p.gecikme}s`,
          }}
        />
      ))}
    </div>
  );
}
