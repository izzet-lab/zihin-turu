import { useEffect, useRef, useState } from 'react';
import { sayimDegeri, sayimSuresi } from '../sayim';
import { hareketAzaltilsinMi } from '../tasAnimasyon';

interface Props {
  /** Gösterilecek son değer. */
  deger: number;
  className?: string;
  /** Testlerin ve ekran okuyucuların baktığı alan adı. */
  'data-alan'?: string;
}

/**
 * Sıfırdan hedefe sayan sayı.
 *
 * ERİŞİLEBİLİRLİK VE TEST
 * Sayma yalnızca GÖRSEL bir süs. Gerçek değer her zaman `data-deger`
 * özniteliğinde ve `aria-label` içinde son hâliyle durur — ekran
 * okuyucu sayının zıplamasını okumaz, test de ara değeri yakalayıp
 * yanlış sonuç vermez.
 *
 * Cihazda "hareketi azalt" açıksa sayma hiç yapılmaz.
 */
export default function SayanSayi({ deger, className, 'data-alan': alan }: Props) {
  const [gosterilen, setGosterilen] = useState(() => (hareketAzaltilsinMi() ? deger : 0));
  const cerceveRef = useRef<number | null>(null);

  useEffect(() => {
    if (hareketAzaltilsinMi()) {
      setGosterilen(deger);
      return;
    }

    const sure = sayimSuresi(deger);
    if (sure === 0) {
      setGosterilen(deger);
      return;
    }

    const baslangic = performance.now();
    const adim = (simdi: number) => {
      const ilerleme = (simdi - baslangic) / sure;
      setGosterilen(sayimDegeri(0, deger, ilerleme));
      if (ilerleme < 1) cerceveRef.current = requestAnimationFrame(adim);
    };
    cerceveRef.current = requestAnimationFrame(adim);

    return () => {
      if (cerceveRef.current !== null) cancelAnimationFrame(cerceveRef.current);
      cerceveRef.current = null;
    };
  }, [deger]);

  return (
    <span className={className} data-alan={alan} data-deger={deger} aria-label={String(deger)}>
      {gosterilen}
    </span>
  );
}
