/**
 * KelimeTuru.tsx — Kelime turunun arayüzü.
 *
 * Üç durum tek ekranda: seviye seçimi → oyun → sonuç. Arena ve Düello
 * ekranlarıyla aynı kalıp.
 *
 * KURAL 1'E DİKKAT
 * Burada hiçbir oyun kuralı yok. Hangi kelime geçerli, kaç puan eder,
 * en uzunu hangisi — hepsini `@tamisabet/oyun-kelime` söylüyor. Bu
 * dosya yalnızca harfleri gösteriyor, dokunuşları topluyor ve cevabı
 * sağlayıcıya veriyor.
 *
 * SÖZLÜK NEDEN SONRADAN YÜKLENİYOR
 * Kelime listesi yarım megabayt. Sayı turunu oynayan birinin bunu
 * indirmesi gereksiz; liste yalnızca bu ekran açıldığında isteniyor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Tur, TurSaglayici } from '@tamisabet/cekirdek';
import type { Sozluk } from '@tamisabet/oyun-kelime';
import { gunlukTohum } from '@tamisabet/cekirdek';
import { kelimeGonder } from '../kimlik';
import { kutlamayiDenetle } from '../kutlama';
import { titret } from '../titresim';
import Ikon from '../bilesenler/Ikon';
import ArkaPlan from '../bilesenler/ArkaPlan';
import SayanSayi from '../bilesenler/SayanSayi';
import { bugun, kelimeGunlukOynandiMi, kelimeGunlukIsaretle } from '../depo';
import SeviyeIzgara from '../bilesenler/SeviyeIzgara';
import SeriVeXp from '../bilesenler/SeriVeXp';
import {
  KELIME_SEVIYE_LISTESI,
  kelimeNihaiPuan,
  kelimeTuruKur,
  tamSozlukKur,
  turkceBuyult,
  enUzunKelimeler,
  kelimeJokerVer,
  kelimeJokerDurumu,
  KELIME_TEK_KULLANIMLIK_JOKERLER,
  type KelimeJokerTip,
} from '@tamisabet/oyun-kelime';
import {
  JOKER_HAK_SAYISI,
  ODULLU_EK_JOKER,
  jokerKullanilabilirMi,
  jokerPuanCarpani,
} from '@tamisabet/cekirdek';
import { odulluReklamGoster } from '../reklam';
import type { IkonAdi } from '../bilesenler/Ikon';

type Asama = 'yukleniyor' | 'seviye' | 'oyun' | 'sonuc';

/**
 * Jokerlerin ekrandaki künyesi.
 *
 * İkonlar sayı turuyla BİLEREK aynı: "ampul" ipucu, "silgi" eleme,
 * "kronometre" süre. İki oyunda aynı işi yapan joker aynı simgeyle
 * görünmeli, yoksa oyuncu her oyunda baştan öğreniyor.
 */
const KELIME_JOKER_META: { tip: KelimeJokerTip; ad: string; simge: IkonAdi }[] = [
  { tip: 'uzunluk', ad: 'Uzunluğu göster', simge: 'etiket' },
  { tip: 'ilkHarf', ad: 'İlk harfi aç', simge: 'ampul' },
  { tip: 'fazlaHarf', ad: 'Fazla harfi sil', simge: 'silgi' },
  { tip: 'sure', ad: 'Süre ekle', simge: 'kronometre' },
];

/**
 * Gunun Turu lige isler, Antrenman islemez.
 * Sayi turundaki ayrimin aynisi (kural 4).
 */
type Mod = 'gunun' | 'antrenman';

/** Rafa konan tek bir harf. Aynı harf havuzda birden çok kez olabilir,
 * bu yüzden kimlik harfin kendisi değil sırası. */
interface Tas {
  id: number;
  harf: string;
}

interface Props {
  /** Başlangıç seviyesi; verilmezse oyuncu seçer. */
  baslangicSeviye?: string;
  /** Ana ekranda seçilen mod; verilmezse Günün Turu ile açılır. */
  baslangicMod?: Mod;
  /** Giriş yapmış kullanıcı; seri ve XP kartı için. */
  kullanici?: { ad: string; id?: string } | null;
  onGirisAc?: () => void;
  onCik: () => void;
}

export default function KelimeTuru({
  baslangicSeviye,
  baslangicMod,
  kullanici,
  onGirisAc,
  onCik,
}: Props) {
  const [asama, setAsama] = useState<Asama>('yukleniyor');
  const [saglayici, setSaglayici] = useState<TurSaglayici | null>(null);
  // HEDEF sözlüğü ayrıca tutuluyor: jokerler "en uzun kelime" için
  // buna bakıyor. Sağlayıcı sözlüğü dışarı vermiyor.
  const [hedefSozluk, setHedefSozluk] = useState<Sozluk | null>(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(false);
  /** Artırılınca sözlük yükleme etkisi baştan çalışır (Tekrar dene). */
  const [yuklemeDeneme, setYuklemeDeneme] = useState(0);
  const [seviye, setSeviye] = useState(baslangicSeviye ?? 'normal');
  const [mod, setMod] = useState<Mod>(baslangicMod ?? 'gunun');
  const [gunlukKilit, setGunlukKilit] = useState(() => kelimeGunlukOynandiMi());

  const [tur, setTur] = useState<Tur | null>(null);
  const [taslar, setTaslar] = useState<Tas[]>([]);
  const [secilenler, setSecilenler] = useState<number[]>([]);
  const [kalan, setKalan] = useState(0);
  const [uyari, setUyari] = useState<string | null>(null);

  const [sonuc, setSonuc] = useState<{
    kelime: string;
    ozet: string;
    uzaklik: number;
    puan: number;
    enUzun: string;
    /** Bu harflerden çıkan kelimeler, uzundan kısaya. İlki `enUzun`. */
    cikanlar: string[];
  } | null>(null);

  const [oturum, setOturum] = useState({ turSayisi: 0, puan: 0 });
  /** Sunucunun verdigi puan. null ise misafir ya da aga ulasilamadi. */
  const [sunucuPuan, setSunucuPuan] = useState<number | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  /* ---------------- Jokerler ---------------- */
  const [kullanilanJokerler, setKullanilanJokerler] = useState<KelimeJokerTip[]>([]);
  const [jokerHakki, setJokerHakki] = useState<number>(JOKER_HAK_SAYISI);
  const [silinenIndeksler, setSilinenIndeksler] = useState<number[]>([]);
  const [uzunlukIpucu, setUzunlukIpucu] = useState<number | null>(null);
  const [ilkHarfIpucu, setIlkHarfIpucu] = useState<{ harf: string; indeks: number } | null>(null);
  const [ekSure, setEkSure] = useState(0);
  const [reklamYukleniyor, setReklamYukleniyor] = useState(false);
  const [reklamKullanildi, setReklamKullanildi] = useState(false);

  const seviyeAyar = useMemo(
    () => KELIME_SEVIYE_LISTESI.find((s) => s.anahtar === seviye) ?? KELIME_SEVIYE_LISTESI[1]!,
    [seviye],
  );

  /* --------------------------------------------------------------- */
  /* Sözlüğü yükle */
  /* --------------------------------------------------------------- */

  /*
   * SÖZLÜK TEK DENEMEDE PES ETMİYOR
   *
   * Sözlük ayrı bir parça olarak indiriliyor ve epey büyük. Tek bir
   * başarısız indirme — zayıf bağlantı, uygulama açılırken aynı anda
   * giden başka istekler — ekranı kalıcı olarak "Sözlük yüklenemedi"
   * durumunda bırakıyordu. Oyuncunun elinde tek seçenek geri dönüp
   * tekrar girmekti; çoğu kişi bunu oyunun bozuk olduğu diye okur.
   *
   * Artık üç kez, arası açılarak deneniyor. Üçü de başarısız olursa
   * hata ekranında "Tekrar dene" düğmesi var — sayaç artınca bu etki
   * baştan çalışıyor.
   */
  useEffect(() => {
    let iptal = false;

    async function yukle() {
      for (let deneme = 0; deneme < 3; deneme++) {
        try {
          const { KELIME_METNI, YAYGIN_METNI, GOVDE_METNI } = await import(
            '@tamisabet/oyun-kelime/sozluk-verisi'
          );
          if (iptal) return;
          // İki liste: geniş olan cevabı KABUL eder, yaygın olan HEDEFİ
          // belirler (bkz. oyun-kelime/kelimeTuruKur).
          const yaygin = tamSozlukKur(YAYGIN_METNI);
          setSaglayici(kelimeTuruKur(tamSozlukKur(KELIME_METNI, GOVDE_METNI), yaygin));
          setHedefSozluk(yaygin);
          setYuklemeHatasi(false);
          setAsama('seviye');
          return;
        } catch {
          if (iptal) return;
          // Son denemeden sonra beklemenin anlamı yok.
          if (deneme < 2) await new Promise((b) => setTimeout(b, 400 * (deneme + 1)));
        }
      }
      if (!iptal) setYuklemeHatasi(true);
    }

    setYuklemeHatasi(false);
    setAsama('yukleniyor');
    void yukle();

    return () => {
      iptal = true;
    };
  }, [yuklemeDeneme]);

  /* --------------------------------------------------------------- */
  /* Tur akışı */
  /* --------------------------------------------------------------- */

  const turBaslat = useCallback(
    (sv: string, m: Mod) => {
      if (!saglayici) return;
      // Gunun Turu'nda tohum TARIHTEN tureyor: herkes ayni bulmacayi
      // oynuyor ve sunucu ayni tohumu bekliyor (kural 3). Antrenman
      // turu kimseyle paylasilmiyor, tohumu anlik.
      const tohum =
        m === 'gunun' ? gunlukTohum('kelime', sv, bugun()) : Math.floor(Math.random() * 2 ** 31);
      const yeni = saglayici.turUret(sv, tohum);
      const harfler = (yeni.veri as { harfler: string[] }).harfler;
      setTur(yeni);
      setTaslar(harfler.map((h, i) => ({ id: i, harf: h })));
      setSecilenler([]);
      setUyari(null);
      setSonuc(null);
      const sure = KELIME_SEVIYE_LISTESI.find((s) => s.anahtar === sv)?.sure ?? 60;
      setKalan(sure);
      setSunucuPuan(null);
      // Jokerler TUR BAŞINA; yeni turda hak ve ipuçları sıfırlanır.
      setKullanilanJokerler([]);
      setJokerHakki(JOKER_HAK_SAYISI);
      setSilinenIndeksler([]);
      setUzunlukIpucu(null);
      setIlkHarfIpucu(null);
      setEkSure(0);
      setReklamKullanildi(false);
      setMod(m);
      setAsama('oyun');
    },
    [saglayici],
  );

  /**
   * Bu turun EN UZUN kelimeleri.
   *
   * Jokerler "hepsine uyan ipucu" verebilmek için tamamını bilmek
   * zorunda. Hesap pahalı olduğu için tur başına bir kez yapılıyor ve
   * süre sınırı var: telefonda tur açılırken donma olmamalı.
   */
  const uzunKelimeler = useMemo(() => {
    if (!hedefSozluk || !tur) return [];
    const harfler = (tur.veri as { harfler: string[] }).harfler;
    return enUzunKelimeler(harfler, hedefSozluk, 24, 120);
  }, [hedefSozluk, tur]);

  const jokerKullan = useCallback(
    (tip: KelimeJokerTip) => {
      if (!tur) return;
      // KAZANILMIŞ hak bitmişse dur.
      //
      // Ortak kural üst SINIRI söylüyor; Antrenman'da bu sınır ödüllü
      // reklamla kazanılabilecek dördüncü hakkı da kapsıyor. Oyuncunun
      // o an elinde kaç hak olduğu ayrı bir şey: yalnızca ortak kurala
      // bakılırsa reklam izlemeden dördüncü joker kullanılabiliyordu ve
      // sayaç "−1 hak kaldı" yazıyordu.
      if (jokerHakki <= 0) return;
      const harfler = (tur.veri as { harfler: string[] }).harfler;
      // İki kapı daha: ortak kural (Günün Turu kısıtı) ve bu turda
      // jokerin verecek bir şeyi var mı.
      const ortak = jokerKullanilabilirMi(
        tip,
        kullanilanJokerler,
        KELIME_TEK_KULLANIMLIK_JOKERLER,
        mod === 'gunun' ? 'gunun' : 'antrenman',
      );
      if (!ortak.acik) return;
      const sonuc = kelimeJokerVer(tip, uzunKelimeler, harfler, silinenIndeksler, kalan > 0);
      if (!sonuc) return;

      if (sonuc.tip === 'uzunluk') setUzunlukIpucu(sonuc.uzunluk);
      else if (sonuc.tip === 'ilkHarf') {
        setIlkHarfIpucu({ harf: sonuc.harf, indeks: sonuc.havuzIndeksi });
      } else if (sonuc.tip === 'fazlaHarf') {
        setSilinenIndeksler((d) => [...d, sonuc.indeks]);
        // Silinen harf seçilmişse seçimden de düşsün, yoksa yazılan
        // kelimede olmayan bir harf kalırdı.
        setSecilenler((d) => d.filter((id) => id !== sonuc.indeks));
      } else {
        setKalan((k) => k + sonuc.ekSaniye);
        setEkSure((e) => e + sonuc.ekSaniye);
      }

      setKullanilanJokerler((d) => [...d, tip]);
      setJokerHakki((h) => h - 1);
      titret('hafif');
    },
    [tur, uzunKelimeler, silinenIndeksler, kullanilanJokerler, mod, kalan, jokerHakki],
  );

  /**
   * Ödüllü reklamla EK joker hakkı — yalnızca Antrenman.
   * Günün Turu'nda yok: reklam izleyebilen oyuncu lig tablosunda
   * daha çok hak alamaz (kural 5).
   */
  async function reklamIzleJokerKazan() {
    if (reklamYukleniyor || reklamKullanildi) return;
    setReklamYukleniyor(true);
    try {
      const kazandi = await odulluReklamGoster();
      if (kazandi) {
        setJokerHakki((h) => h + ODULLU_EK_JOKER);
        setReklamKullanildi(true);
      }
    } finally {
      setReklamYukleniyor(false);
    }
  }

  const bitir = useCallback(() => {
    if (!saglayici || !tur) return;
    const kelime = secilenler
      .map((id) => taslar.find((t) => t.id === id)?.harf ?? '')
      .join('');

    const d = saglayici.dogrula(tur, { icerik: kelime });
    if (!d.gecerli) {
      // Geçersiz cevap turu bitirmez; oyuncu düzeltebilsin.
      setUyari(d.hata ?? 'Bu cevap kabul edilmedi.');
      return;
    }

    const toplamSure = seviyeAyar.sure;
    const temelPuan = saglayici.puanla(seviye, d, kalan, toplamSure, false);
    // Günün Turu puanı ×10 ölçeğinde (bkz. kelimeNihaiPuan). Sunucu da
    // aynı fonksiyonu çağırıyor; ikisi ayrışırsa oyuncu ekranda başka
    // bir puan görüp ligde başkasını bulur.
    const puan = kelimeNihaiPuan(
      temelPuan,
      mod === 'gunun' ? 'gunun' : 'antrenman',
      kullanilanJokerler.length,
    );
    const cozum = saglayici.cozumBul(tur);

    setSonuc({
      kelime,
      ozet: d.ozet ?? '',
      uzaklik: d.uzaklik ?? 0,
      puan,
      enUzun: cozum.satirlar[0] ?? '',
      cikanlar: cozum.satirlar,
    });
    setOturum((o) => ({ turSayisi: o.turSayisi + 1, puan: o.puan + puan }));
    // En uzun kelime bulunduysa tam isabet: çift titreşim.
    titret((d.uzaklik ?? 0) === 0 ? 'basari' : 'orta');
    setAsama('sonuc');

    if (mod === 'gunun') {
      setGunlukKilit(true);
      kelimeGunlukIsaretle();
    }

    // SUNUCU DOGRULAMASI (kural 2)
    // Ekranda gosterilen puan yalnizca anlik geri bildirim; lige islenen
    // puani sunucu kendi hesabindan veriyor. Misafirde ve ag hatasinda
    // null doner, oyun yine de akar.
    setGonderiliyor(true);
    kelimeGonder({
      mod,
      seviye,
      tarih: bugun(),
      tohum: Number(tur.tohum),
      kelime,
      sure_sn: toplamSure,
      kalan_sn: kalan,
      jokerler: kullanilanJokerler,
    })
      .then((y) => {
        setSunucuPuan(y ? y.puan : null);
        void kutlamayiDenetle(kullanici?.id);
      })
      .finally(() => setGonderiliyor(false));
  }, [saglayici, tur, secilenler, taslar, seviye, seviyeAyar.sure, kalan, mod, kullanilanJokerler]);

  // Süre sayacı. `bitirRef` sayesinde sayaç her tuşta yeniden kurulmuyor.
  const bitirRef = useRef(bitir);
  bitirRef.current = bitir;

  useEffect(() => {
    if (asama !== 'oyun') return;
    const z = setInterval(() => {
      setKalan((k) => {
        if (k <= 1) {
          clearInterval(z);
          bitirRef.current();
          return 0;
        }
        return k - 1;
      });
    }, 1000);
    return () => clearInterval(z);
  }, [asama, tur]);

  /* --------------------------------------------------------------- */
  /* Harf seçimi */
  /* --------------------------------------------------------------- */

  const harfTikla = (id: number) => {
    setUyari(null);
    titret('hafif');
    setSecilenler((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const sonHarfiSil = () => {
    setUyari(null);
    setSecilenler((s) => s.slice(0, -1));
  };

  const temizle = () => {
    setUyari(null);
    setSecilenler([]);
  };

  const yazilan = secilenler
    .map((id) => taslar.find((t) => t.id === id)?.harf ?? '')
    .join('');

  /* --------------------------------------------------------------- */
  /* Ekranlar */
  /* --------------------------------------------------------------- */

  if (yuklemeHatasi) {
    return (
      <Cerceve onCik={onCik}>
        <div className="mt-20 text-center">
          <Ikon ad="kitap-kapali" boyut={44} className="zt-metin-soluk" />
          <h1 className="mt-4 text-xl font-black zt-metin">Sözlük yüklenemedi</h1>
          <p className="mt-2 text-sm zt-metin-soluk">
            Kelime turu sözlüğe ihtiyaç duyuyor. Bağlantını kontrol edip tekrar dene.
          </p>
          {/* Önce yalnızca "Geri dön" vardı: oyuncu ekrandan çıkıp
              yeniden girmeden tekrar deneyemiyordu. */}
          <button
            onClick={() => setYuklemeDeneme((d) => d + 1)}
            data-alan="sozluk-tekrar-dene"
            className="mt-6 min-h-[48px] w-full rounded-xl zt-dugme px-6 font-black zt-metin"
          >
            Tekrar dene
          </button>
          <button
            onClick={onCik}
            className="mt-3 min-h-[44px] rounded-xl zt-ayirac px-6 font-bold zt-metin"
          >
            Geri dön
          </button>
        </div>
      </Cerceve>
    );
  }

  if (asama === 'yukleniyor') {
    return (
      <Cerceve onCik={onCik}>
        <div className="mt-24 text-center" data-alan="kelime-yukleniyor">
          <Ikon ad="kelime" boyut={44} className="zt-nabiz zt-metin-soluk" />
          <p className="mt-4 text-sm font-bold zt-metin-soluk">Sözlük hazırlanıyor…</p>
        </div>
      </Cerceve>
    );
  }

  if (asama === 'seviye') {
    return (
      <Cerceve onCik={onCik}>
        <h1 className="text-2xl font-black leading-none zt-metin">Kelime Turu</h1>
        <p className="mt-1 text-sm zt-metin-soluk">
          Verilen harflerden en uzun kelimeyi türet. Her harf bir kez kullanılır.
        </p>

        {/* MOD — Günün Turu lige işler, Antrenman işlemez (kural 4).
            Alt yazılar ana ekrandaki dille aynı: "Herkese aynı
            bulmaca" / "İstediğin kadar oyna". İki ekranda iki ayrı
            cümle kullanmak aynı şeyi iki farklı şey gibi gösteriyordu. */}
        <div className="mt-5 grid grid-cols-2 gap-2.5" data-alan="kelime-mod-secici">
          {([
            {
              k: 'gunun' as Mod,
              ad: 'Günün Turu',
              alt: 'Herkese aynı bulmaca · lige işler',
              simge: 'gunun' as const,
            },
            {
              k: 'antrenman' as Mod,
              ad: 'Antrenman',
              alt: 'İstediğin kadar oyna',
              simge: 'antrenman' as const,
            },
          ]).map((m) => (
            <button
              key={m.k}
              data-mod={m.k}
              aria-pressed={mod === m.k}
              onClick={() => setMod(m.k)}
              className={`zt-secim min-h-[92px] rounded-xl border-2 px-3 py-3 text-left transition ${
                mod === m.k
                  ? 'zt-secim-acik zt-vurgu-cizgi zt-vurgu-yuzey'
                  : 'zt-cizgi zt-yuzey-2'
              }`}
            >
              <Ikon
                ad={m.simge}
                boyut={24}
                className={mod === m.k ? 'zt-vurgu-metin' : 'zt-metin-soluk'}
              />
              <span
                className={`mt-2 block font-black leading-tight ${
                  mod === m.k ? 'zt-vurgu-metin' : 'zt-metin'
                }`}
              >
                {m.ad}
              </span>
              <span
                className={`mt-0.5 block text-[11px] leading-snug ${
                  mod === m.k ? 'zt-vurgu-metin' : 'zt-metin-soluk'
                }`}
              >
                {m.alt}
              </span>
            </button>
          ))}
        </div>

        {mod === 'gunun' && gunlukKilit && (
          <div
            className="mt-3 rounded-xl border zt-cizgi zt-yuzey px-4 py-3 text-sm zt-metin-soluk"
            data-alan="kelime-gunluk-kilit"
          >
            Günün kelime turunu bugün oynadın. Yarın yeni harfler gelecek —
            o zamana kadar Antrenman'da istediğin kadar oynayabilirsin.
          </div>
        )}

        {/* Seviye ızgarası ana ekranla AYNI bileşen: iki ekranda iki
            farklı düzen, oyuncuya iki farklı uygulama gibi geliyordu.
            Kelime turunda seviye kilidi yok — hepsi açık. */}
        <div
          data-alan="kelime-seviye-secici"
          className={`mt-6 ${mod === 'gunun' && gunlukKilit ? 'pointer-events-none opacity-40' : ''}`}
        >
          <SeviyeIzgara
            seviyeler={KELIME_SEVIYE_LISTESI}
            acik={KELIME_SEVIYE_LISTESI.map((s) => s.anahtar)}
            secili={seviye}
            onSec={setSeviye}
          />
        </div>

        <button
          data-alan="kelime-basla"
          disabled={mod === 'gunun' && gunlukKilit}
          onClick={() => turBaslat(seviye, mod)}
          className="mt-8 min-h-[56px] w-full rounded-xl zt-dugme text-lg font-black zt-metin transition active:scale-[.99] disabled:opacity-40"
        >
          {mod === 'gunun' ? 'Günün Kelime Turunu Oyna' : 'Başla'}
        </button>

        <SeriVeXp kullanici={kullanici} onGirisAc={onGirisAc} />
      </Cerceve>
    );
  }

  if (asama === 'sonuc' && sonuc) {
    const tamMi = sonuc.uzaklik === 0;
    const benimKelime = sonuc.kelime.toLocaleLowerCase('tr');
    // Oyuncunun kendi kelimesi listede tekrar edilmiyor; onu zaten
    // ekranın üstünde görüyor.
    //
    // Çekimli biçimler sözlük listesinde yok ama kabul ediliyor
    // (bkz. oyun-kelime/cekim.ts); oyuncunun kelimesi listedeki en
    // uzundan DAHA uzun olabiliyor. Liste yine de doğru: "bu
    // harflerden çıkan kelimeler" diyor, "senden iyisi" demiyor.
    const digerCozumler = sonuc.cikanlar.filter(
      (s) => (s.split(' ')[0] ?? '').toLocaleLowerCase('tr') !== benimKelime,
    );
    return (
      <Cerceve onCik={onCik}>
        <div className="mt-6 text-center" data-alan="kelime-sonuc">
          <div className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">
            {sonuc.kelime ? 'Bulduğun kelime' : 'Kelime yazmadın'}
          </div>
          {sonuc.kelime && (
            <div className="zt-rakam mt-2 break-all text-4xl font-black leading-none zt-vurgu-metin">
              {turkceBuyult(sonuc.kelime)}
            </div>
          )}
          <div className="mt-2 text-sm zt-metin-soluk">
            {tamMi
              ? 'En uzun kelimeyi buldun'
              : sonuc.kelime
                ? `${sonuc.ozet} · en uzunu ${sonuc.uzaklik} harf daha uzundu`
                : 'Bu turdan puan çıkmadı'}
          </div>

          <div className="zt-sahne mt-6 rounded-2xl border zt-cizgi zt-yuzey p-5">
            <div className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">Puan</div>
            {/* Puan sayarak çıkar: sonuca VARIŞ tatmin ediyor. */}
            <div className="zt-rakam mt-1 text-5xl font-black leading-none zt-vurgu-metin">
              +<SayanSayi deger={sonuc.puan} />
            </div>
          </div>

          {/* Çözüm tur bittikten SONRA gösteriliyor (kural 8).
              Oyuncu en uzunu bulduysa başlık değişiyor: "en uzun kelime"
              deyip başka bir kelime göstermek "demek ki bulamadım" gibi
              okunuyordu. Aynı uzunlukta birden çok çözüm olabilir. */}
          {/* BU HARFLERDEN ÇIKAN KELİMELER
              Önce yalnızca en uzun kelime yazıyordu. Sayı turunda tur
              bitince bir çözüm zinciri gösteriliyor; buranın karşılığı
              oydu ve eksikti — oyuncu "başka ne çıkarmışım?" sorusunun
              cevabını göremiyordu.
              Oyuncunun kendi kelimesi listeden düşülüyor; onu zaten
              yukarıda görüyor. */}
          {digerCozumler.length > 0 && (
          <div className="mt-5 text-left" data-alan="kelime-cozumler">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest zt-metin-soluk">
              Bu harflerden çıkan kelimeler
            </div>
            <div className="rounded-xl border zt-cizgi zt-yuzey p-4">
              <ul className="elyazisi space-y-1 text-lg zt-cozum-yazi">
                {digerCozumler.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <p className="mt-2 text-[11px] zt-metin-soluk">
              Hepsi değil, en uzunlardan birkaçı.
            </p>
          </div>
          )}

          {/*
            JOKER DÖKÜMÜ.

            Kaç joker kullanıldığı ve puanın ne kadarının gittiği
            yazılmazsa oyuncu düşük puanı oyunun hatası sanıyor.
            Sayı turunun sonuç ekranında da aynı döküm var.
          */}
          {kullanilanJokerler.length > 0 && (
            <div className="mt-3 text-xs zt-odul-yazi" data-alan="kelime-joker-dokumu">
              {/* Yüzdeye Türkçe ek getirilmiyor: ek sayıya göre
                  değişiyor (%20'si, %36'sı, %49'u) ve tek bir kalıpla
                  doğru yazılamıyor. Ek istemeyen kuruluş seçildi. */}
              {kullanilanJokerler.length} joker · puan %
              {Math.round((1 - jokerPuanCarpani(kullanilanJokerler.length)) * 100)} düştü
            </div>
          )}

          {/* LIGE ISLEDI MI — puani sunucu veriyor (kural 2). */}
          <div className="mt-4 text-xs" data-alan="kelime-lig-durumu">
            {mod === 'antrenman' ? (
              <span className="zt-metin-soluk">Antrenman turu lige işlemez.</span>
            ) : gonderiliyor ? (
              <span className="zt-metin-soluk">Sunucuya gönderiliyor…</span>
            ) : sunucuPuan != null ? (
              <span className="zt-vurgu-metin">Lige işlendi · sunucu {sunucuPuan} puan verdi</span>
            ) : (
              <span className="zt-metin-soluk">
                Lige işlenmedi — puan için giriş yapmış olman gerekiyor.
              </span>
            )}
          </div>

          {oturum.turSayisi > 1 && (
            <div className="mt-5 text-sm zt-metin-soluk" data-alan="kelime-oturum">
              Bu oturumda {oturum.turSayisi} turda {oturum.puan} puan topladın.
            </div>
          )}

          <button
            onClick={() => turBaslat(seviye, 'antrenman')}
            className="mt-6 min-h-[52px] w-full rounded-xl zt-dugme text-lg font-black zt-metin transition active:scale-[0.99]"
            data-alan="kelime-yeni-tur"
          >
            {/* Gunun turu gunde bir kez; "yeni tur" antrenmana gecirir. */}
            {mod === 'gunun' ? 'Antrenmana devam et' : 'Yeni tur'}
          </button>
          <button
            onClick={() => setAsama('seviye')}
            className="mt-3 min-h-[44px] w-full text-sm font-bold zt-metin-soluk"
          >
            Seviye değiştir
          </button>
        </div>
      </Cerceve>
    );
  }

  /* Oyun ekranı */
  const sureYuzde = Math.max(0, (kalan / seviyeAyar.sure) * 100);

  return (
    <Cerceve onCik={onCik} sessizArka>
      <div className="flex items-center justify-between pr-14">
        <div className="text-xs font-bold zt-metin-soluk" data-alan="kelime-gostergesi">
          <Ikon ad="kelime" boyut={15} className="mr-1.5 -mt-0.5" />
          Kelime Turu · {seviyeAyar.etiket}
        </div>
      </div>

      {/* Süre çubuğu */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full zt-ayirac">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            sureYuzde < 25 ? 'zt-sure-az' : 'zt-dugme'
          }`}
          style={{ width: `${sureYuzde}%` }}
          data-alan="kelime-sure-cubuk"
        />
      </div>
      <div className="mt-1 text-right text-[11px] zt-metin-soluk" data-alan="kelime-sure-kalan">
        {kalan} sn
      </div>

      {/* Yazılan kelime — boşken ne yapılacağını söylüyor. */}
      <div
        className="zt-sahne mt-5 flex min-h-[84px] items-center justify-center rounded-2xl border zt-cizgi zt-yuzey px-4"
        data-alan="kelime-yazilan"
      >
        {yazilan ? (
          <span className="zt-rakam break-all text-center text-3xl font-black leading-none zt-vurgu-metin">
            {turkceBuyult(yazilan)}
          </span>
        ) : (
          <span className="text-sm zt-metin-soluk">Harflere dokunarak kelime kur</span>
        )}
      </div>

      {uyari && (
        <div className="mt-2 text-center text-xs font-bold zt-odul-yazi" data-alan="kelime-uyari">
          {uyari}
        </div>
      )}

      {/* Harf rafı */}
      <div className="mt-6 grid grid-cols-4 gap-2.5" data-alan="kelime-raf">
        {taslar.map((t, sira) => {
          // "Fazla harfi sil" jokeriyle kalkan harf raftan çıkar.
          if (silinenIndeksler.includes(t.id)) return null;
          // Kelimeye giren harf tükenmiştir: soluklaşıp geri çekilir.
          const secili = secilenler.includes(t.id);
          return (
            <button
              key={t.id}
              data-harf={t.harf}
              data-kullanilmis={secili ? '1' : undefined}
              aria-pressed={secili}
              onClick={() => harfTikla(t.id)}
              style={{ ['--zt-sira' as string]: String(sira) }}
              // Taşın yüzeyi ve harf rengi `[data-harf]` kuralında
              // sabit; buraya tema sınıfı yazılmaz (bkz. Oyun.tsx).
              className={`zt-dusen min-h-[64px] rounded-xl border text-2xl font-black uppercase leading-none ${
                secili
                  ? 'zt-vurgu-cizgi'
                  : ilkHarfIpucu?.indeks === t.id
                    // "İlk harfi aç" jokerinin vurguladığı taş.
                    ? 'zt-odul-cizgi'
                    : 'border-transparent'
              }`}
            >
              {turkceBuyult(t.harf)}
            </button>
          );
        })}
      </div>

      {/*
        JOKER PANELİ.

        Sayı turunda takılan oyuncu joker kullanıp kurtulabiliyordu;
        kelime turunda takılan boş elle çıkıyordu. Jokerler cevabı
        vermez, yolu daraltır (kural 8): en uzun kelimenin tamamı tur
        bitmeden asla gösterilmez.
      */}
      <div className="mt-5" data-alan="kelime-joker-paneli">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest zt-metin-soluk">
            Joker
          </span>
          <span className="text-xs zt-metin-soluk" data-alan="kelime-joker-hak">
            {jokerHakki} hak kaldı
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {KELIME_JOKER_META.map((j) => {
            const ortak = jokerKullanilabilirMi(
              j.tip,
              kullanilanJokerler,
              KELIME_TEK_KULLANIMLIK_JOKERLER,
              mod === 'gunun' ? 'gunun' : 'antrenman',
            );
            const turDurumu = kelimeJokerDurumu(
              j.tip,
              uzunKelimeler,
              (tur?.veri as { harfler: string[] } | undefined)?.harfler ?? [],
              silinenIndeksler,
              kalan > 0,
            );
            const devreDisi = jokerHakki <= 0 || !ortak.acik || !turDurumu.acik;
            // Hak bitmesi genel sebep; onu üstteki sayaç zaten
            // söylüyor. Düğmenin altına yalnızca TÜRE ÖZEL sebep
            // yazılıyor, yoksa dört düğmede aynı metin tekrar eder.
            const sebep = !ortak.acik
              ? (ortak.sebep.includes('hak') ? null : ortak.sebep)
              : !turDurumu.acik
                ? turDurumu.sebep
                : null;

            return (
              <button
                key={j.tip}
                data-joker={j.tip}
                onClick={() => jokerKullan(j.tip)}
                disabled={devreDisi}
                title={sebep ?? undefined}
                className="min-h-[52px] w-full rounded-lg border zt-cizgi zt-yuzey px-1 py-1.5 text-[11px] font-bold zt-metin transition active:scale-95 disabled:opacity-45"
              >
                <Ikon ad={j.simge} boyut={18} className="zt-vurgu-metin" />
                <div className="mt-1 leading-tight">{j.ad}</div>
                {sebep ? (
                  <div
                    className="zt-metin-soluk mt-0.5 text-[9px] leading-tight"
                    data-alan="kelime-joker-not"
                  >
                    {sebep}
                  </div>
                ) : (
                  <div className="zt-metin-soluk">puanın %20&apos;si</div>
                )}
              </button>
            );
          })}
        </div>

        {/* İpuçları. Hiçbiri kelimenin kendisini yazmıyor. */}
        {(uzunlukIpucu != null || ilkHarfIpucu || ekSure > 0) && (
          <ul className="mt-2 space-y-1 text-sm zt-odul-yazi" data-alan="kelime-joker-ipucu">
            {uzunlukIpucu != null && (
              <li>Bu harflerden {uzunlukIpucu} harfli kelime var.</li>
            )}
            {ilkHarfIpucu && (
              <li>En uzun kelime “{turkceBuyult(ilkHarfIpucu.harf)}” ile başlıyor.</li>
            )}
            {ekSure > 0 && <li>+{ekSure} saniye eklendi.</li>}
          </ul>
        )}

        {/* Ödüllü reklam: yalnızca Antrenman, tur başına bir kez. */}
        {mod !== 'gunun' && jokerHakki <= 0 && !reklamKullanildi && (
          <button
            onClick={reklamIzleJokerKazan}
            disabled={reklamYukleniyor}
            className="mt-2 w-full rounded-lg border zt-odul-yuzey px-3 py-2 text-xs font-bold zt-odul-yazi transition disabled:opacity-50"
            data-alan="kelime-reklam-joker"
          >
            <Ikon ad="video" boyut={14} className="mr-1.5 -mt-0.5" />
            {reklamYukleniyor ? 'Yükleniyor…' : 'Video izle, bir joker daha kazan'}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          onClick={sonHarfiSil}
          disabled={secilenler.length === 0}
          className="min-h-[52px] rounded-xl border zt-cizgi zt-yuzey-2 font-bold zt-metin disabled:opacity-40"
          data-alan="kelime-sil"
        >
          ← Sil
        </button>
        <button
          onClick={temizle}
          disabled={secilenler.length === 0}
          className="min-h-[52px] rounded-xl border zt-cizgi zt-yuzey-2 font-bold zt-metin disabled:opacity-40"
          data-alan="kelime-temizle"
        >
          Temizle
        </button>
      </div>

      <button
        onClick={bitir}
        className="mt-3 min-h-[56px] w-full rounded-xl zt-dugme text-lg font-black zt-metin transition active:scale-[0.99]"
        data-alan="kelime-bitir"
      >
        Bitir
      </button>
    </Cerceve>
  );
}

/**
 * Ortak dış kabuk.
 *
 * ÇIKIŞ DÜĞMESİ SAĞ ÜSTTEN SOL ÜSTE ALINDI.
 * Sağ üstte zaten sabit hamburger menü duruyor; yuvarlak "✕" onun
 * üstüne biniyordu ve iki düğme birbirini yiyordu. Çıkış artık
 * uygulamanın her yerindeki gibi sol üstte "← Geri".
 */
function Cerceve({
  children,
  onCik,
  sessizArka = false,
}: {
  children: React.ReactNode;
  onCik: () => void;
  /** Oyun sürerken arka plan susturulur: dikkat dağıtmamalı. */
  sessizArka?: boolean;
}) {
  return (
    <main className="zt-ekran zt-ust-bosluk zt-kagit zt-metin relative min-h-dvh px-5 pb-6">
      {/* Kelime turunda arka plan HARFLERLE. */}
      <ArkaPlan oyun="kelime" sessiz={sessizArka} />
      <div className="relative z-10 mx-auto w-full max-w-md">
        <button
          onClick={onCik}
          data-alan="kelime-cik"
          className="zt-dokunma-alani -ml-2 mb-3 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-bold zt-vurgu-metin"
        >
          ← Geri
        </button>
        {children}
      </div>
    </main>
  );
}
