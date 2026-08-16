import { useState } from 'react';
import type { Tur } from '@zihinturu/cekirdek';
import { sayiTuru, gununTuru, uretimYap } from '@zihinturu/oyun-sayi';
import Kurulum, { type BaslaAyar, type Mod } from './ekranlar/Kurulum';
import Oyun, { type OyunSonuc } from './ekranlar/Oyun';
import Sonuc from './ekranlar/Sonuc';
import Yardim from './ekranlar/Yardim';
import { bugun, gunlukKaydet, oku, yardimGoruldu, yardimGorulduIsaretle } from './depo';

type Ekran = 'kurulum' | 'oyun' | 'sonuc';

interface Oturum {
  mod: Mod;
  seviye: string;
  seviyeEtiket: string;
  sure: number;
  buyukAdet: number;
  tur: Tur;
  gun: string;
}

/** Rastgele 32 bit tohum (Antrenman için). */
function rastgeleTohum(): number {
  return (Math.random() * 4294967296) >>> 0;
}

/** Moda göre turu hazırlar. Günün Turu tarihten türer, Antrenman rastgele. */
function turHazirla(ayar: BaslaAyar, gun: string): Tur {
  if (ayar.mod === 'gunun') {
    return gununTuru(ayar.seviye, gun);
  }
  // Antrenman: büyük sayı ayarını onurlandırmak için doğrudan üretim.
  const u = uretimYap(ayar.seviye, rastgeleTohum(), ayar.buyukAdet);
  return { oyun: 'sayi', seviye: ayar.seviye, tohum: u.tohum, veri: { hedef: u.hedef, sayilar: u.sayilar } };
}

export default function Uygulama() {
  const [ekran, setEkran] = useState<Ekran>('kurulum');
  const [oturum, setOturum] = useState<Oturum | null>(null);
  const [sonSonuc, setSonSonuc] = useState<OyunSonuc | null>(null);
  const [seri, setSeri] = useState<number>(oku().seri.gun);
  // İlk açılışta tanıtımı bir kez göster; sonra "?" ile açılır.
  const [yardimAcik, setYardimAcik] = useState<boolean>(() => !yardimGoruldu());

  function yardimKapat() {
    setYardimAcik(false);
    yardimGorulduIsaretle();
  }

  function basla(ayar: BaslaAyar) {
    const gun = bugun();
    const tur = turHazirla(ayar, gun);
    setOturum({ ...ayar, tur, gun });
    setSonSonuc(null);
    setEkran('oyun');
  }

  function bitti(s: OyunSonuc) {
    if (!oturum) return;
    if (oturum.mod === 'gunun') {
      const il = gunlukKaydet(oturum.seviye, oturum.gun, { fark: s.fark, puan: s.puan });
      setSeri(il.seri.gun);
    }
    setSonSonuc(s);
    setEkran('sonuc');
  }

  function yeniden() {
    setEkran('kurulum');
  }

  let ekranBileseni;
  if (ekran === 'oyun' && oturum) {
    ekranBileseni = (
      <Oyun tur={oturum.tur} seviye={oturum.seviye} sure={oturum.sure} onBitti={bitti} onYardim={() => setYardimAcik(true)} />
    );
  } else if (ekran === 'sonuc' && oturum && sonSonuc) {
    ekranBileseni = (
      <Sonuc
        tur={oturum.tur}
        seviyeEtiket={oturum.seviyeEtiket}
        mod={oturum.mod}
        sure={oturum.sure}
        seri={seri}
        tarih={oturum.gun}
        sonuc={sonSonuc}
        onYeniden={yeniden}
      />
    );
  } else {
    ekranBileseni = <Kurulum seviyeler={sayiTuru.seviyeler} onBasla={basla} onYardim={() => setYardimAcik(true)} />;
  }

  return (
    <>
      {ekranBileseni}
      <Yardim acik={yardimAcik} kapat={yardimKapat} />
    </>
  );
}
