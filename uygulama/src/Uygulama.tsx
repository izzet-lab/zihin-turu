import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Tur } from '@zihinturu/cekirdek';
import { sayiTuru, gununTuru, uretimYap, sonrakiSeviyeAnahtari } from '@zihinturu/oyun-sayi';
import Kurulum, { type BaslaAyar, type Mod } from './ekranlar/Kurulum';
import Oyun, { type OyunSonuc } from './ekranlar/Oyun';
import Sonuc from './ekranlar/Sonuc';
import Yardim from './ekranlar/Yardim';
import Giris from './ekranlar/Giris';
import KullaniciAdi from './ekranlar/KullaniciAdi';
import { sesKilidiKur } from './ses';
import { supabase } from './supabase';
import { profilOku, turGonder, type OyuncuProfil } from './kimlik';
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

type Ekran = 'kurulum' | 'oyun' | 'sonuc' | 'giris' | 'kullanici-adi';

interface Oturum {
  mod: Mod;
  seviye: string;
  seviyeEtiket: string;
  sure: number;
  buyukAdet: number;
  tur: Tur;
  gun: string;
}

/**
 * Antrenman oturumu puan sayacı — lig puanı değil, o anki oturumun
 * motivasyon göstergesi. Seviye değiştirildiğinde veya Günün Turu'na
 * geçildiğinde sıfırlanır; sayfa kapanınca zaten belleğe düştüğü için
 * kendiliğinden sıfırlanmış olur.
 */
interface OturumPuanDurumu {
  seviye: string;
  toplamPuan: number;
  turSayisi: number;
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
  const [oturumPuanDurumu, setOturumPuanDurumu] = useState<OturumPuanDurumu | null>(null);
  // Kurulum ekranı hangi modla açılacak: "Ana sayfaya dön" hep Günün
  // Turu'nu gösterir, Antrenman'daki "Seviye değiştir" ise Antrenman
  // sekmesinde kalmalı (bkz. ayarlaraDon).
  const [kurulumMod, setKurulumMod] = useState<Mod>('gunun');
  // İlk açılışta tanıtımı bir kez göster; sonra "?" ile açılır.
  const [yardimAcik, setYardimAcik] = useState<boolean>(() => !yardimGoruldu());

  // --- Kimlik durumu ---
  const [kullanici, setKullanici] = useState<User | null>(null);
  const [profil, setProfil] = useState<OyuncuProfil | null>(null);
  // Giriş ekranı, tur bitince veya "üye ol" notuna tıklanınca açılır.
  // Açılmadan önceki ekrana dönmek için önceki ekran saklanır.
  const [girisOncesiEkran, setGirisOncesiEkran] = useState<Ekran>('kurulum');

  // Ses bağlamının kilidini ilk dokunuşta aç (mobil autoplay kuralı).
  useEffect(() => {
    sesKilidiKur();
  }, []);

  // Auth durumunu dinle — ilk yüklemede ve değişikliklerinde.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setKullanici(u);
      if (u) profilOku(u.id).then(setProfil);
    });

    const { data: dinleyici } = supabase.auth.onAuthStateChange((_event, oturum) => {
      const u = oturum?.user ?? null;
      setKullanici(u);

      if (u) {
        profilOku(u.id).then((p) => {
          setProfil(p);
          if (!p) {
            // İlk kez giriş — oyuncu satırı yok, kullanıcı adı seç.
            setEkran('kullanici-adi');
          } else {
            // Zaten kayıtlı — önceki ekrana dön.
            setEkran((mevcut) =>
              mevcut === 'giris' ? girisOncesiEkran : mevcut,
            );
          }
        });
      } else {
        setProfil(null);
      }
    });

    return () => dinleyici.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function yardimKapat() {
    setYardimAcik(false);
    yardimGorulduIsaretle();
  }

  function girisAc() {
    setGirisOncesiEkran(ekran as Ekran);
    setEkran('giris');
  }

  function girisAtla() {
    setEkran(girisOncesiEkran);
  }

  function basla(ayar: BaslaAyar) {
    // Antrenman ayarları hatırlanır: sonraki "Yeni tur" ve uygulama
    // kapatılıp açıldığında Kurulum ekranı bu ayarla açılır.
    if (ayar.mod === 'antrenman') {
      sonAntrenmanAyariYaz({ seviye: ayar.seviye, sure: ayar.sure, buyukAdet: ayar.buyukAdet });
      // Aynı seviyede devam ediliyorsa oturum sayacı korunur; seviye
      // değiştiyse (ya da ilk Antrenman turu ise) sıfırdan başlar.
      setOturumPuanDurumu((eski) =>
        eski && eski.seviye === ayar.seviye ? eski : { seviye: ayar.seviye, toplamPuan: 0, turSayisi: 0 },
      );
    } else {
      setOturumPuanDurumu(null);
    }
    const gun = bugun();
    const tur = turHazirla(ayar, gun);
    setOturum({ ...ayar, tur, gun });
    setSonSonuc(null);
    setYeniAcilanSeviye(null);
    setEkran('oyun');
  }

  async function bitti(s: OyunSonuc) {
    if (!oturum) return;

    if (oturum.mod === 'gunun') {
      const il = gunlukKaydet(oturum.gun, oturum.seviye, { fark: s.fark, puan: s.puan });
      setSeri(il.seri.gun);

      // Giriş yapıldıysa sunucuya gönder (sunucu doğrular, kaydeder)
      if (kullanici) {
        turGonder({
          oyun: oturum.tur.oyun,
          mod: oturum.mod,
          seviye: oturum.seviye,
          tarih: oturum.gun,
          tohum: oturum.tur.tohum,
          adimlar: s.adimlar,
          sure_sn: oturum.sure,
          kalan_sn: s.kalan,
          jokerler: s.jokerler,
        }).catch((e) => console.warn('[Uygulama] turGonder başarısız:', e));
      }
    } else {
      // Antrenman: istemci taraflı oturum sayacı (lig işlemiyor)
      const taban =
        oturumPuanDurumu && oturumPuanDurumu.seviye === oturum.seviye
          ? oturumPuanDurumu
          : { seviye: oturum.seviye, toplamPuan: 0, turSayisi: 0 };
      setOturumPuanDurumu({
        seviye: oturum.seviye,
        toplamPuan: taban.toplamPuan + s.puan,
        turSayisi: taban.turSayisi + 1,
      });
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

  /** Günün Turu'nun "Ana sayfaya dön"ü: kurulum hep Günün Turu sekmesiyle açılır. */
  function anaSayfaya() {
    setKurulumMod('gunun');
    setEkran('kurulum');
  }

  /**
   * Antrenman'ın "Seviye değiştir"i: kurulum, oturumun modunda (yani
   * Antrenman sekmesinde) açılır — mod sıçramamalı, oyuncu yalnızca
   * seviye/süre/büyük sayı ayarını değiştirmek istiyor.
   */
  function ayarlaraDon() {
    if (oturum) setKurulumMod(oturum.mod);
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

  if (ekran === 'giris') {
    ekranBileseni = <Giris onAtla={girisAtla} />;
  } else if (ekran === 'kullanici-adi' && kullanici) {
    ekranBileseni = (
      <KullaniciAdi
        oyuncuId={kullanici.id}
        onTamamlandi={() => {
          profilOku(kullanici.id).then(setProfil);
          setEkran(girisOncesiEkran === 'giris' ? 'kurulum' : girisOncesiEkran);
        }}
      />
    );
  } else if (ekran === 'oyun' && oturum) {
    ekranBileseni = (
      <Oyun
        tur={oturum.tur}
        seviye={oturum.seviye}
        sure={oturum.sure}
        mod={oturum.mod}
        oturumPuan={
          oturum.mod === 'antrenman' && oturumPuanDurumu && oturumPuanDurumu.seviye === oturum.seviye
            ? oturumPuanDurumu
            : null
        }
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
        oturumPuanSonrasi={
          oturum.mod === 'antrenman' && oturumPuanDurumu && oturumPuanDurumu.seviye === oturum.seviye
            ? oturumPuanDurumu
            : null
        }
        yeniAcilanSeviyeEtiket={
          yeniAcilanSeviye ? sayiTuru.seviyeler.find((sv) => sv.anahtar === yeniAcilanSeviye)?.etiket ?? null : null
        }
        girisYapildiMi={!!kullanici}
        onAnaSayfa={anaSayfaya}
        onAntrenmandaOyna={antrenmandaOyna}
        onYeniTur={yeniTur}
        onAyarlar={ayarlaraDon}
        onGirisAc={girisAc}
      />
    );
  } else {
    ekranBileseni = (
      <Kurulum
        seviyeler={sayiTuru.seviyeler}
        onBasla={basla}
        onYardim={() => setYardimAcik(true)}
        baslangicMod={kurulumMod}
        kullanici={kullanici ? { ad: profil?.kullaniciAdi ?? kullanici.email ?? 'Oyuncu' } : null}
        onGirisAc={girisAc}
        onCikisYap={async () => {
          await supabase.auth.signOut();
          setKullanici(null);
          setProfil(null);
        }}
      />
    );
  }

  return (
    <>
      {ekranBileseni}
      <Yardim acik={yardimAcik} kapat={yardimKapat} />
    </>
  );
}
