import { useState } from 'react';
import type { Tur } from '@zihinturu/cekirdek';
import { sayiTuru, gununTuru, uretimYap, sonrakiSeviyeAnahtari } from '@zihinturu/oyun-sayi';
import Kurulum, { type BaslaAyar, type Mod } from './ekranlar/Kurulum';
import Oyun, { type OyunSonuc } from './ekranlar/Oyun';
import Sonuc from './ekranlar/Sonuc';
import Yardim from './ekranlar/Yardim';
import {
  bugun,
  gunlukKaydet,
  oku,
  yardimGoruldu,
  yardimGorulduIsaretle,
  acikSeviyeler,
  seviyeAc,
  sonAntrenmanAyariOku,
  sonAntrenmanAyariYaz,
} from './depo';

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
  const [yeniAcilanSeviye, setYeniAcilanSeviye] = useState<string | null>(null);
  // İlk açılışta tanıtımı bir kez göster; sonra "?" ile açılır.
  const [yardimAcik, setYardimAcik] = useState<boolean>(() => !yardimGoruldu());

  function yardimKapat() {
    setYardimAcik(false);
    yardimGorulduIsaretle();
  }

  function basla(ayar: BaslaAyar) {
    // Antrenman ayarları hatırlanır: sonraki "Yeni tur" ve uygulama
    // kapatılıp açıldığında Kurulum ekranı bu ayarla açılır.
    if (ayar.mod === 'antrenman') {
      sonAntrenmanAyariYaz({ seviye: ayar.seviye, sure: ayar.sure, buyukAdet: ayar.buyukAdet });
    }
    const gun = bugun();
    const tur = turHazirla(ayar, gun);
    setOturum({ ...ayar, tur, gun });
    setSonSonuc(null);
    setYeniAcilanSeviye(null);
    setEkran('oyun');
  }

  function bitti(s: OyunSonuc) {
    if (!oturum) return;

    if (oturum.mod === 'gunun') {
      const il = gunlukKaydet(oturum.gun, oturum.seviye, { fark: s.fark, puan: s.puan });
      setSeri(il.seri.gun);
    }

    // İlk kez oynayan öğrenci: tam isabet yaparsa bir üst seviye açılır.
    // Yalnızca o an oynanan seviye, o öğrencinin en yüksek açık seviyesiyse
    // tetiklenir — geriye dönük (kilitli olmayan) bir seviyede tekrar tam
    // isabet yapmak yeni bir şey açmaz.
    if (s.fark === 0) {
      const acik = acikSeviyeler();
      const enYuksekAcik = acik[acik.length - 1];
      if (oturum.seviye === enYuksekAcik) {
        const sonraki = sonrakiSeviyeAnahtari(oturum.seviye);
        if (sonraki && !acik.includes(sonraki)) {
          seviyeAc(sonraki);
          setYeniAcilanSeviye(sonraki);
        }
      }
    }

    setSonSonuc(s);
    setEkran('sonuc');
  }

  /** Ana sayfaya dön / Ayarlar: her ikisi de kurulum ekranına götürür. */
  function kuruluma() {
    setEkran('kurulum');
  }

  /**
   * Antrenman'da "Yeni tur": kurulum ekranına hiç uğramadan, az önceki
   * oturumla AYNI ayarlarla (seviye, süre, büyük sayı adedi) doğrudan
   * yeni bir tur başlatır. Sürtünmesiz tekrar oynama — antrenmanın amacı.
   */
  function yeniTur() {
    if (!oturum) return;
    basla({
      mod: oturum.mod,
      seviye: oturum.seviye,
      seviyeEtiket: oturum.seviyeEtiket,
      sure: oturum.sure,
      buyukAdet: oturum.buyukAdet,
    });
  }

  /**
   * Günün Turu bitince "Antrenmanda oyna": günde tek hak olduğu için
   * Günün Turu'na dönülemez, ama oyun bitmiş hissi vermemek için aynı
   * seviyede, son kullanılan Antrenman ayarlarıyla hemen bir tur açılır.
   */
  function antrenmandaOyna() {
    if (!oturum) return;
    const kayitli = sonAntrenmanAyariOku();
    basla({
      mod: 'antrenman',
      seviye: oturum.seviye,
      seviyeEtiket: oturum.seviyeEtiket,
      sure: kayitli?.sure ?? 90,
      buyukAdet: kayitli?.buyukAdet ?? 2,
    });
  }

  let ekranBileseni;
  if (ekran === 'oyun' && oturum) {
    ekranBileseni = (
      <Oyun
        tur={oturum.tur}
        seviye={oturum.seviye}
        sure={oturum.sure}
        mod={oturum.mod}
        onBitti={bitti}
        onYardim={() => setYardimAcik(true)}
      />
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
        yeniAcilanSeviyeEtiket={
          yeniAcilanSeviye ? sayiTuru.seviyeler.find((sv) => sv.anahtar === yeniAcilanSeviye)?.etiket ?? null : null
        }
        onAnaSayfa={kuruluma}
        onAntrenmandaOyna={antrenmandaOyna}
        onYeniTur={yeniTur}
        onAyarlar={kuruluma}
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
