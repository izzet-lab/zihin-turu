/**
 * HedefHalkasi.tsx — Markanın hedef halkaları, sesle birlikte açılır.
 *
 * NE YAPAR
 * Ekranın ortasından dışa doğru üç halka dalga hâlinde genişler ve
 * söner. 1,2 saniye sürer, sonra kaybolur.
 *
 * OYUN EKRANINI KAPATMAZ
 * Üstüne biner ama tıklamayı geçirir ve zemini yoktur — oyuncu
 * animasyon sürerken oynamaya devam edebilir. Kutlama katmanından
 * (`Kutlama.tsx`) farkı bu: orası ödül töreni, ekranı durdurur;
 * burası anlık bir alkış.
 *
 * MARKA MOTİFİ
 * Logodaki iç içe halkaların aynısı. Tekrar eden görsel fikir markayı
 * sağlamlaştırıyor; aynı motif hedef, kupa ve çerez ikonlarında da var.
 *
 * HAREKETİ AZALT
 * Açıkken halkalar genişlemez; yalnızca kısa bir parlama olur. Kutlama
 * yok olmaz, sadeleşir.
 */

import { useEffect, useState } from 'react';
import { HALKA_OLAYI } from '../kutlama-ani';

/** Animasyon süresi — sesle aynı uzunlukta kalsın diye sabit. */
const SURE_MS = 1200;

export default function HedefHalkasi() {
  const [sayac, setSayac] = useState(0);
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    const dinle = () => {
      // Sayaç `key` olarak kullanılıyor: üst üste gelen iki kutlamada
      // animasyon yeniden başlasın, yarıda kalmış hâliyle donmasın.
      setSayac((n) => n + 1);
      setGorunur(true);
    };
    window.addEventListener(HALKA_OLAYI, dinle);
    return () => window.removeEventListener(HALKA_OLAYI, dinle);
  }, []);

  useEffect(() => {
    if (!gorunur) return;
    const z = setTimeout(() => setGorunur(false), SURE_MS);
    return () => clearTimeout(z);
  }, [gorunur, sayac]);

  if (!gorunur) return null;

  return (
    <div
      key={sayac}
      className="zt-halka-alani pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
      aria-hidden="true"
      data-alan="hedef-halkasi"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="zt-halka absolute rounded-full border-2"
          style={{ ['--zt-sira' as string]: String(i) }}
        />
      ))}
    </div>
  );
}
