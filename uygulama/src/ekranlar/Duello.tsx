import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { duelloTurTohumu, DUELLO_TUR_SAYISI } from '@tamisabet/cekirdek';
import { turKur, sayiTuru, SEVIYE_LISTESI } from '@tamisabet/oyun-sayi';
import { acikSeviyeler } from '../depo';
import Oyun from './Oyun';
import {
  duelloAra,
  duelloDurumOku,
  duelloGonder,
  duelloRevans,
  duelloTerkEt,
  surenMaciSor,
  odaDurumu,
  odaKur,
  odayaKatil,
  rakibiDinle,
  type DuelloMac,
} from '../duello-istemci';

/**
 * Duello.tsx — 1v1 düello ekranı.
 *
 * Üç hâli var: rakip arıyor, oynuyor, bitti.
 *
 * NEDEN TAHTAYI YENİDEN YAZMADIK
 * Oyun ekranı düello kipini destekliyor (`duello` özelliği). Tahta, taş
 * animasyonları ve süre çubuğu aynı kod; ikinci bir kopya çıkarılsaydı
 * bir düzeltme birinde yapılıp diğerinde unutulurdu.
 *
 * KURAL 2 — SUNUCU SÖYLER
 * Skor, tur, kazanan ve rakibin uzaklığı hep sunucudan geliyor. Bu ekran
 * hiçbir şey hesaplamıyor; turun bulmacasını tohumdan üretiyor (sunucu
 * da aynı tohumdan aynı bulmacayı üretiyor, ikisi ayrışamaz).
 *
 * KURAL 8 — RAKİBİN ADIMI GELMEZ
 * Rakip hakkında bilinen tek şey hedefe uzaklığı.
 */

/** Durum sorgusu bu sıklıkla yenilenir; maçı ilerleten çağrı da budur. */
const YOKLAMA_MS = 2000;

interface Props {
  /** Kurulum'dan gelen başlangıç seviyesi; oyuncu burada değiştirebilir. */
  seviye: string;
  girisYapildiMi: boolean;
  onCik: () => void;
  onGirisAc: () => void;
}

export default function Duello({
  seviye: baslangicSeviyesi,
  girisYapildiMi,
  onCik,
  onGirisAc,
}: Props) {
  /*
   * SEVİYE DÜELLONUN KENDİ SEÇİMİ
   *
   * Önce Kurulum ekranında seçili olan seviye sessizce kullanılıyordu.
   * Ama düello düğmesi seviye seçicinin ÜSTÜNDE duruyor; oyuncu daha
   * seviyeyi seçmeden düelloya giriyor ve hangi seviyede oynadığını
   * bilmiyordu. Artık önce seviye, sonra rakip — sıralama da ekranda
   * böyle.
   */
  const acikSeviyeListesi = useMemo(() => acikSeviyeler(), []);
  const [seviye, setSeviye] = useState(() =>
    // Adres satırından kilitli bir seviye gelebilir; düello, tek kişilik
    // ilerlemeyi atlamanın yolu olmamalı. Kilitliyse açık olan en üst
    // seviyeye düşülür.
    acikSeviyeListesi.includes(baslangicSeviyesi)
      ? baslangicSeviyesi
      : (acikSeviyeListesi[acikSeviyeListesi.length - 1] ?? 'cocuk'),
  );
  const [mac, setMac] = useState<DuelloMac | null>(null);
  const [bekleyenSn, setBekleyenSn] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [rakipUzaklik, setRakipUzaklik] = useState<number | null>(null);
  /**
   * Oyuncunun cevabını kilitlediği tur numarası.
   *
   * Yaklaşık cevap turu tek başına kapatmaz; tur ya iki taraf da
   * kilitleyince ya da süre dolunca biter. Kilitledikten sonra tahtaya
   * bakmanın anlamı kalmadığı için bekleme ekranına geçiliyor — önce
   * ekran hiç değişmiyordu ve oyuncu "Bitir çalışmıyor" sanıyordu.
   */
  const [kilitliTur, setKilitliTur] = useState<number | null>(null);
  /** Kilitlenen cevabın hedefe uzaklığı — sunucunun hesapladığı değer. */
  const [kilitliUzaklik, setKilitliUzaklik] = useState<number | null>(null);
  /** Kilidin ait olduğu maç. Maç değişince kilit düşer (aşağıdaki etki). */
  const [kilitliMac, setKilitliMac] = useState<string | null>(null);
  /**
   * Oyuncunun kendi adım zinciri.
   *
   * Bekleme ekranında gösteriliyor: "1090 fark" tek başına soğuk bir
   * sayı; oyuncu neyi nasıl kurduğunu görünce hem bekleme boş geçmiyor
   * hem nerede saptığını anlıyor.
   *
   * Yalnızca KENDİ adımları. Rakibinki ne burada var ne sunucudan
   * geliyor (kural 8).
   */
  const [kilitliAdimlar, setKilitliAdimlar] = useState<
    { a: number; b: number; islem: string; sonuc: number }[]
  >([]);
  // Özel oda: kod kurulunca burada durur, arkadaş katılana kadar beklenir.
  const [odaKodu, setOdaKodu] = useState<string | null>(null);
  const [katilKodu, setKatilKodu] = useState('');
  // Kuyruğa girmeden önce oyuncu ne yapmak istediğini seçer.
  const [kip, setKip] = useState<'secim' | 'rastgele' | 'oda'>('secim');
  const macRef = useRef<DuelloMac | null>(null);
  macRef.current = mac;

  const seviyeEtiket =
    SEVIYE_LISTESI.find((s) => s.anahtar === seviye)?.etiket ?? seviye;

  /* --- Açılışta: süren maçım var mı? --- */
  //
  // Sekmesini yenileyen ya da uygulamayı kapatıp açan oyuncu maçına geri
  // dönmeli ("kısa kopmada geri dönülebilsin"). Bu çağrı kuyruğa
  // yazmıyor; yoksa düello ekranına bakmak bile oyuncuyu sıraya sokardı.
  const [acilisKontrolu, setAcilisKontrolu] = useState(false);
  useEffect(() => {
    if (!girisYapildiMi || acilisKontrolu) return;
    let durduruldu = false;
    surenMaciSor(seviye)
      .then((sonuc) => {
        if (durduruldu) return;
        if (sonuc.mac) setMac(sonuc.mac);
        setAcilisKontrolu(true);
      })
      .catch(() => {
        if (!durduruldu) setAcilisKontrolu(true);
      });
    return () => {
      durduruldu = true;
    };
  }, [girisYapildiMi, seviye, acilisKontrolu]);

  /* --- Rakip arama --- */
  useEffect(() => {
    if (!girisYapildiMi || mac || kip !== 'rastgele') return;
    let durduruldu = false;

    async function ara() {
      try {
        const sonuc = await duelloAra(seviye);
        if (durduruldu) return;
        if (sonuc.mac) {
          setMac(sonuc.mac);
          setRakipUzaklik(null);
        } else {
          setBekleyenSn(sonuc.bekleyenSn ?? 0);
        }
      } catch (e) {
        if (!durduruldu) setHata((e as Error).message);
      }
    }

    ara();
    const z = setInterval(ara, YOKLAMA_MS);
    return () => {
      durduruldu = true;
      clearInterval(z);
    };
  }, [girisYapildiMi, seviye, mac, kip]);

  /* --- Özel oda: arkadaş katıldı mı? --- */
  useEffect(() => {
    if (!odaKodu || mac) return;
    let durduruldu = false;

    async function sor() {
      try {
        const sonuc = await odaDurumu(odaKodu!);
        if (durduruldu) return;
        if (sonuc.mac) {
          setMac(sonuc.mac);
          setOdaKodu(null);
        }
      } catch (e) {
        if (!durduruldu) setHata((e as Error).message);
      }
    }

    const z = setInterval(sor, YOKLAMA_MS);
    return () => {
      durduruldu = true;
      clearInterval(z);
    };
  }, [odaKodu, mac]);

  /* --- Maç sürerken durumu yokla (bu çağrı maçı da ilerletiyor) --- */
  useEffect(() => {
    if (!mac || mac.durum !== 'basladi') return;
    let durduruldu = false;

    async function yokla() {
      const m = macRef.current;
      if (!m) return;
      try {
        const son = await duelloDurumOku(m.id);
        if (durduruldu) return;
        // Tur değiştiyse rakibin göstergesi sıfırlanır.
        if (son.aktifTur !== m.aktifTur) setRakipUzaklik(null);
        setMac(son);
        if (son.rakipUzaklik != null && son.aktifTur === m.aktifTur) {
          setRakipUzaklik(son.rakipUzaklik);
        }
      } catch (e) {
        if (!durduruldu) setHata((e as Error).message);
      }
    }

    // Beklemeden bir kez sor: maç yeni kurulduğunda rakibin adı ve
    // derecesi hemen görünsün. Yalnızca aralığa bırakılsaydı ilk iki
    // saniye rakip kartı eksik duruyordu.
    yokla();

    const z = setInterval(yokla, YOKLAMA_MS);
    return () => {
      durduruldu = true;
      clearInterval(z);
    };
  }, [mac?.id, mac?.durum, mac?.aktifTur]);

  /* --- Maç bitti: özeti bir kez daha iste --- */
  //
  // Maçı bitiren şey çoğu zaman oyuncunun kendi gönderimi oluyor ve o
  // yanıtta tur özeti yok. Durum yoklaması da maç bitince duruyor;
  // sonuç ekranı özetsiz kalıyordu. Bittiğini görür görmez bir kez daha
  // soruyoruz.
  useEffect(() => {
    if (!mac || mac.durum === 'basladi' || mac.turOzeti) return;
    let durduruldu = false;
    duelloDurumOku(mac.id)
      .then((son) => {
        if (!durduruldu) setMac(son);
      })
      .catch(() => {
        /* özet gelmezse sonuç ekranı yine çalışır, sadece liste olmaz */
      });
    return () => {
      durduruldu = true;
    };
  }, [mac?.id, mac?.durum, mac?.turOzeti]);

  /* --- Rakibin uzaklığını canlı dinle --- */
  useEffect(() => {
    if (!mac || mac.durum !== 'basladi') return;
    const rakipTaraf = mac.benTarafim === 'a' ? 'b' : 'a';
    const kapat = rakibiDinle(mac.id, rakipTaraf, (uzaklik, turNo) => {
      // Geçmiş tura ait bildirim göstergeye yazılmaz.
      if (turNo === macRef.current?.aktifTur) setRakipUzaklik(uzaklik);
    });
    return kapat;
  }, [mac?.id, mac?.durum]);

  /* --- Turun bulmacası: sunucuyla aynı tohumdan --- */
  const tur = useMemo(() => {
    if (!mac) return null;
    return turKur(mac.seviye, duelloTurTohumu(Number(mac.tohum), mac.aktifTur));
  }, [mac?.tohum, mac?.aktifTur, mac?.seviye]);

  /**
   * Bu turun bir çözümü.
   *
   * SUNUCUDAN GELMİYOR — tohumdan burada üretiliyor; zaten tahtayı da
   * aynı tohumdan kuruyoruz. Yalnızca cevabını KİLİTLEYEN oyuncuya
   * gösteriliyor: o oyuncu bu turda artık bir şey değiştiremez, ama
   * beklerken doğru yolu görmesi oyunu öğretiyor.
   */
  const turCozumu = useMemo(() => {
    if (!tur || kilitliTur !== mac?.aktifTur) return null;
    try {
      return sayiTuru.cozumBul(tur, 400);
    } catch {
      return null;
    }
  }, [tur, kilitliTur, mac?.aktifTur]);

  /* --- Oyuncunun ilerlemesini sunucuya bildir --- */
  const ilerlemeGonder = useCallback(
    (adimlar: { a: number; b: number; islem: string; sonuc: number }[], kilit = false) => {
      const m = macRef.current;
      if (!m || m.durum !== 'basladi') return;
      if (kilit) {
        setKilitliTur(m.aktifTur);
        setKilitliMac(m.id);
        setKilitliAdimlar(adimlar);
      }
      duelloGonder(m.id, m.aktifTur, adimlar, kilit)
        .then((sonuc) => {
          setKilitliUzaklik(sonuc.uzaklik);
          setMac((onceki) =>
            onceki
              ? {
                  ...onceki,
                  skorA: sonuc.skorA,
                  skorB: sonuc.skorB,
                  aktifTur: sonuc.aktifTur,
                  turBasladi: sonuc.turBasladi,
                  durum: sonuc.durum,
                  kazanan: sonuc.kazanan,
                }
              : onceki,
          );
          if (sonuc.aktifTur !== m.aktifTur) setRakipUzaklik(null);
        })
        .catch((e) => {
          // İyi huylu çakışmalar hata ekranına düşürmez: tur bu arada
          // kapanmış ya da maç bitmiş olabilir (rakip tam isabet yaptı).
          // Bu bir arıza değil, oyunun normal akışı; bir sonraki durum
          // yoklaması ekranı zaten güncelleyecek.
          const mesaj = (e as Error).message;
          if (mesaj.includes('oynanmıyor') || mesaj.includes('bitti')) return;
          setHata(mesaj);
        });
    },
    [],
  );

  /* --- Sonuç ekranı için türetilenler ---
      DİKKAT: Bu kancalar koşullu dönüşlerden ÖNCE durmak zorunda.
      Önce sonuç ekranının yanına konmuşlardı; orası erken dönüşlerin
      ardında olduğu için React "önceki render'dan fazla kanca" diyip
      ekranı komple çökertiyordu — düello ekranı bomboş açılıyordu.
      Kancalar her render'da aynı sırayla çalışmalı. */
  //
  // Hedefler sunucudan GELMİYOR: her turun bulmacası maçın tohumundan
  // yeniden üretiliyor (kural 3). Sunucudan yalnızca uzaklıklar geliyor.
  const turOzetSatirlari = useMemo(() => {
    if (!mac?.turOzeti) return [];
    return mac.turOzeti.map((t) => {
      const turBulmaca = turKur(mac.seviye, duelloTurTohumu(Number(mac.tohum), t.turNo));
      const veri = turBulmaca.veri as { hedef: number };
      const anlat = (u: number | null) =>
        u == null ? 'oynamadı' : u === 0 ? 'tam isabet' : `${u} fark`;
      return {
        turNo: t.turNo,
        hedef: veri.hedef,
        benimMetin: `Sen: ${anlat(t.benimUzaklik)}`,
        rakipMetin: `Rakip: ${anlat(t.rakipUzaklik)}`,
        kazanan: t.kazanan,
      };
    });
  }, [mac?.turOzeti, mac?.tohum, mac?.seviye]);

  /**
   * Kaybeden oyuncuya en çok yaklaştığı anı hatırlatan cümle.
   * Tam isabet yapıp da turu kaptırdığı bir tur varsa onu, yoksa en
   * küçük farkı seçer.
   */
  const enYakinAn = useMemo(() => {
    const adaylar = (mac?.turOzeti ?? []).filter(
      (t) => t.benimUzaklik != null && t.kazanan !== 'ben',
    );
    if (adaylar.length === 0) return null;
    const enIyi = adaylar.reduce((a, b) =>
      (a.benimUzaklik ?? Infinity) <= (b.benimUzaklik ?? Infinity) ? a : b,
    );
    if (enIyi.benimUzaklik === 0) {
      return `${enIyi.turNo}. turda sen de tam isabet yaptın, rakip bir adım öndeydi.`;
    }
    return `${enIyi.turNo}. turda ${enIyi.benimUzaklik} fark kalmıştı.`;
  }, [mac?.turOzeti]);


  /* --- Rövanş ve oda eylemleri --- */
  const revansIste = useCallback(async () => {
    const m = macRef.current;
    if (!m) return;
    try {
      const sonuc = await duelloRevans(m.id);
      setRakipUzaklik(null);
      setMac(sonuc.mac);
    } catch (e) {
      setHata((e as Error).message);
    }
  }, []);

  const odaAc = useCallback(async () => {
    try {
      const sonuc = await odaKur(seviye);
      setOdaKodu(sonuc.kod);
    } catch (e) {
      setHata((e as Error).message);
    }
  }, [seviye]);

  const odayaGir = useCallback(async () => {
    try {
      const sonuc = await odayaKatil(katilKodu);
      setRakipUzaklik(null);
      setMac(sonuc.mac);
    } catch (e) {
      setHata((e as Error).message);
    }
  }, [katilKodu]);

  /**
   * Maçtan çık.
   *
   * Terk eden kaybeder — bu bilerek böyle: çıkmak, kaybetmek üzere olan
   * maçtan bedelsiz kurtulmanın yolu olmamalı. Onay soruluyor.
   */
  const [cikisSoruluyor, setCikisSoruluyor] = useState(false);
  const maciTerkEt = useCallback(async () => {
    const m = macRef.current;
    if (!m) return;
    try {
      await duelloTerkEt(m.id);
    } catch {
      /* maç bu arada zaten bitmiş olabilir; sorun değil */
    }
    setCikisSoruluyor(false);
    setRakipUzaklik(null);
    setMac(null);
    setKip('secim');
  }, []);

  /* --- Ekranlar --- */

  if (!girisYapildiMi) {
    return (
      <Cerceve baslik="Düello">
        <p className="text-sm text-slate-400">
          Düello için üye olman gerekiyor — rakiplerin ve derecen hesabına bağlı.
        </p>
        <button
          onClick={onGirisAc}
          data-alan="duello-giris"
          className="mt-5 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Üye ol / giriş yap
        </button>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  if (hata) {
    return (
      <Cerceve baslik="Bir şey ters gitti">
        <p className="text-sm text-amber-300" data-alan="duello-hata">
          {hata}
        </p>
        <button
          onClick={() => {
            // Hatayı temizle ve bulunduğun yerden devam et; süren maç
            // varsa açılış kontrolü onu geri getirir.
            setHata(null);
            setAcilisKontrolu(false);
          }}
          data-alan="duello-tekrar-dene"
          className="mt-5 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Tekrar dene
        </button>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  // Özel oda kuruldu, arkadaş bekleniyor.
  if (!mac && odaKodu) {
    return (
      <Cerceve baslik="Arkadaşın bekleniyor">
        <p className="text-sm text-slate-400">Bu kodu arkadaşına ver:</p>
        <div
          className="zt-rakam mt-3 rounded-xl border border-cyan-300/40 bg-cyan-300/10 py-4 text-4xl font-black tracking-[0.3em] text-cyan-200"
          data-alan="oda-kodu"
        >
          {odaKodu}
        </div>
        <p className="mt-3 text-xs text-slate-600">
          Arkadaşın kodu girer girmez maç başlar. {seviyeEtiket} seviyesi.
        </p>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  // Ne tür düello? Kuyruğa girmeden önce sorulur.
  if (!mac && kip === 'secim' && acilisKontrolu) {
    return (
      <Cerceve baslik="Düello">
        {/* ÖNCE SEVİYE, SONRA RAKİP.
            Kilitli seviyeler burada da kilitli: düello, tek kişilik
            ilerlemeyi atlamanın yolu olmamalı. */}
        <div className="text-left">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            Seviye
          </div>
          <div className="grid grid-cols-2 gap-2.5" data-alan="duello-seviyeler">
            {SEVIYE_LISTESI.map((sv) => {
              const kilitli = !acikSeviyeListesi.includes(sv.anahtar);
              const secili = seviye === sv.anahtar;
              return (
                <button
                  key={sv.anahtar}
                  data-seviye={sv.anahtar}
                  disabled={kilitli}
                  onClick={() => setSeviye(sv.anahtar)}
                  aria-pressed={secili}
                  className={`min-h-[56px] rounded-xl border-2 px-3 py-2 text-left transition ${
                    kilitli
                      ? 'border-slate-800 bg-slate-900/40 text-slate-600'
                      : secili
                        ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                        : 'border-slate-700 bg-slate-800/50 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="block text-sm font-black">
                    {kilitli && '🔒 '}
                    {sv.etiket}
                  </span>
                  <span className="block text-[11px] opacity-70">{sv.altEtiket}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => setKip('rastgele')}
          data-alan="duello-rastgele"
          className="mt-5 min-h-[56px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Rakip bul
        </button>
        <p className="mt-2 text-xs text-slate-600">
          {seviyeEtiket} seviyesinde, derecene yakın bir rakip aranır.
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-sm font-bold text-slate-300">Arkadaşınla oyna</div>
          <button
            onClick={odaAc}
            data-alan="oda-kur"
            className="mt-3 min-h-[48px] w-full rounded-xl border border-slate-700 text-sm font-bold text-slate-200 hover:bg-slate-800/60"
          >
            Oda kur, kodu paylaş
          </button>
          <div className="mt-3 flex gap-2">
            <input
              value={katilKodu}
              onChange={(e) => setKatilKodu(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="KOD"
              data-alan="oda-kod-girdi"
              className="zt-rakam min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-center text-lg font-black tracking-[0.2em] text-slate-100 placeholder:text-slate-600"
            />
            <button
              onClick={odayaGir}
              disabled={katilKodu.length !== 5}
              data-alan="oda-katil"
              className="min-h-[48px] shrink-0 rounded-xl border border-slate-700 px-4 text-sm font-bold text-slate-200 disabled:opacity-40"
            >
              Katıl
            </button>
          </div>
        </div>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  if (!mac) {
    return (
      <Cerceve baslik="Rakip aranıyor">
        <p className="text-sm text-slate-400" data-alan="duello-ariyor">
          {seviyeEtiket} seviyesinde rakip aranıyor… {bekleyenSn > 0 && `${bekleyenSn} sn`}
        </p>
        <p className="mt-2 text-xs text-slate-600">
          Sekiz saniyede rakip bulunmazsa bir rakip atanır, beklemezsin.
        </p>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  if (mac.durum !== 'basladi') {
    const benim = mac.benTarafim;
    const kazandim = mac.kazanan === benim;
    const berabere = mac.kazanan === 'berabere';
    return (
      <Cerceve baslik="Düello bitti">
        <div
          className={`text-4xl font-black ${
            berabere ? 'text-slate-200' : kazandim ? 'text-cyan-300' : 'text-slate-300'
          }`}
          data-alan="duello-sonuc"
        >
          {berabere ? 'Berabere' : kazandim ? 'Kazandın 🏆' : 'Kaybettin'}
        </div>
        <div className="mt-2 text-lg text-slate-400" data-alan="duello-skor">
          {benim === 'a' ? mac.skorA : mac.skorB} — {benim === 'a' ? mac.skorB : mac.skorA}
        </div>
        {/* Kaybedince "Kaybettin" tek başına soğuk duruyor. Oyuncunun
            en çok yaklaştığı anı hatırlatmak, maçı "hiç şansım yoktu"
            değil "az kalmıştı" diye hatırlatıyor. */}
        {!kazandim && enYakinAn && (
          <p className="mt-2 text-sm text-slate-400" data-alan="duello-teselli">
            {enYakinAn}
          </p>
        )}

        {mac.botMu && (
          <p className="mt-3 text-xs text-slate-600">
            Bu maç bir rakip atanarak oynandı; derecen değişmedi.
          </p>
        )}

        {/* TUR TUR ÖZET
            Hem "nerede kaybettim" sorusunu cevaplıyor hem sonuç ekranının
            boşluğunu dolduruyor. Hedefler tohumdan yeniden üretiliyor;
            sunucudan yalnızca uzaklıklar geliyor. */}
        {turOzetSatirlari.length > 0 && (
          <div className="mt-6 text-left" data-alan="duello-tur-ozeti">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              Turlar
            </div>
            {/* Her tur bir kart: solda turu kimin aldığını söyleyen
                madeni para, sağda iki tarafın sonucu. Düz liste
                "tablo" gibi duruyordu; bu bir maç özeti. */}
            <ul className="space-y-2">
              {turOzetSatirlari.map((t) => (
                <li
                  key={t.turNo}
                  className={`zt-sahne flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    t.kazanan === 'ben'
                      ? 'border-cyan-300/30 bg-cyan-300/5'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`zt-rakam flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      t.kazanan === 'ben'
                        ? 'bg-cyan-300 text-slate-900'
                        : t.kazanan === 'rakip'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t.turNo}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-slate-300">
                        Hedef <span className="zt-rakam">{t.hedef}</span>
                      </span>
                      <span
                        className={`shrink-0 text-[11px] font-bold ${
                          t.kazanan === 'ben'
                            ? 'text-cyan-300'
                            : t.kazanan === 'rakip'
                              ? 'text-slate-500'
                              : 'text-slate-600'
                        }`}
                      >
                        {t.kazanan === 'ben'
                          ? 'sen aldın'
                          : t.kazanan === 'rakip'
                            ? 'rakip aldı'
                            : 'berabere'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {t.benimMetin} · {t.rakipMetin}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={revansIste}
          data-alan="duello-revans"
          className="mt-6 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Rövanş
        </button>
        <p className="mt-1 text-[11px] text-slate-600">
          Aynı rakiple yeniden — bu kez taraflar yer değiştirir.
        </p>
        <button
          onClick={() => {
            setMac(null);
            setRakipUzaklik(null);
            setKip('secim');
          }}
          data-alan="duello-yeni"
          className="mt-3 min-h-[48px] w-full rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800/60"
        >
          Başka rakip
        </button>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  if (!tur) return null;

  const benim = mac.benTarafim;
  const gecenSn = Math.max(0, (Date.now() - Date.parse(mac.turBasladi)) / 1000);
  const kalanSn = Math.max(1, Math.round((mac.turSuresiSn ?? 60) - gecenSn));

  if (cikisSoruluyor) {
    return (
      <Cerceve baslik="Maçtan çıkılsın mı?">
        <p className="text-sm text-slate-400">
          Çıkarsan maçı kaybedersin ve derecen buna göre değişir.
        </p>
        <button
          onClick={maciTerkEt}
          data-alan="duello-terk-onay"
          className="mt-5 min-h-[52px] w-full rounded-xl border border-amber-400/40 text-base font-bold text-amber-300 hover:bg-amber-400/10"
        >
          Evet, çık
        </button>
        <button
          onClick={() => setCikisSoruluyor(false)}
          data-alan="duello-terk-vazgec"
          className="mt-3 min-h-[48px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Maça dön
        </button>
      </Cerceve>
    );
  }

  // CEVAP KİLİTLENDİ — turun kapanması bekleniyor.
  //
  // Tur, iki taraf da kilitleyince ya da süre dolunca biter. Bota karşı
  // oynanıyorsa bot zaten kilitli yazıldığı için kapanma genelde anında
  // olur. Önce bu ekran yoktu: "Bitir"e basan oyuncu değişmeyen tahtaya
  // bakıp oyunu bozuk sanıyordu.
  // Kilit hem maça hem tura bağlı. Yalnızca tura bakılsaydı, rövanşta
  // ya da yeni bir maçta aynı numaralı turda bekleme ekranı yeniden
  // açılır ve oyuncu hiç oynamadan kilitlenmiş görünürdü.
  if (kilitliMac === mac.id && kilitliTur === mac.aktifTur) {
    const hedef = (tur?.veri as { hedef: number } | undefined)?.hedef ?? 0;
    // Çubuk uzunluğu için ortak bir ölçek: iki taraf aynı cetvelle
    // çizilsin ki bakışta karşılaştırılabilsin.
    const olcek = Math.max(hedef, kilitliUzaklik ?? 0, rakipUzaklik ?? 0, 1);
    const yuzde = (u: number | null) =>
      u == null ? 0 : Math.max(4, Math.round((1 - u / olcek) * 100));

    return (
      <Cerceve baslik={`Tur ${mac.aktifTur}/${DUELLO_TUR_SAYISI}`}>
        {/* SAHNE — kilitlenen cevabın kendisi, oyunun diliyle:
            büyük rakam, hedefin altında. Önce bu ekran düz metin
            satırlarından oluşuyordu ve bildirim ekranı gibi duruyordu. */}
        <div
          className="zt-sahne rounded-2xl border border-cyan-300/30 bg-cyan-300/5 px-5 py-6"
          data-alan="duello-kilit-bekleme"
        >
          <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-300/70">
            Cevabın kilitlendi
          </div>
          <div className="zt-rakam mt-1 text-5xl font-black leading-none text-cyan-200">
            {kilitliUzaklik === 0 ? 'TAM' : (kilitliUzaklik ?? '—')}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {kilitliUzaklik === 0
              ? 'hedefi tam tutturdun 🎯'
              : kilitliAdimlar.length === 0
                ? // Hiç işlem yapılmadığında uzaklık hedefin kendisine
                  // eşit çıkıyor; "665 fark · hedef 665" yanıltıcıydı.
                  'hiç işlem yapmadın'
                : `fark · hedef ${hedef}`}
          </div>

          <div className="zt-nabiz mt-4 text-xs font-bold text-slate-400">
            Rakip oynuyor…
          </div>
        </div>

        {/* İKİ YARIŞÇI, İKİ ÇUBUK — kim hedefe yakın, bakışta görünsün. */}
        <div className="mt-4 space-y-3 text-left">
          {[
            { ad: 'Sen', uzaklik: kilitliUzaklik, benim: true },
            {
              ad: mac.rakip?.ad ?? (mac.botMu ? (mac.botAd ?? 'Rakip') : 'Rakip'),
              uzaklik: rakipUzaklik,
              benim: false,
            },
          ].map((y) => (
            <div key={y.ad}>
              <div className="flex items-baseline justify-between text-xs">
                <span className={y.benim ? 'font-bold text-cyan-200' : 'text-slate-400'}>
                  {y.ad}
                </span>
                <span
                  className="font-bold text-slate-300"
                  data-alan={y.benim ? 'kilit-benim' : 'kilit-rakip'}
                >
                  {y.uzaklik == null
                    ? 'henüz bir şey yok'
                    : y.uzaklik === 0
                      ? 'tam isabet 🎯'
                      : `${y.uzaklik} fark`}
                </span>
              </div>
              <div className="zt-cubuk mt-1 h-2 w-full">
                <div
                  className={`zt-cubuk-dolgu ${
                    y.uzaklik === 0 ? 'zt-tam' : y.benim ? '' : 'zt-rakip'
                  }`}
                  style={{ width: `${yuzde(y.uzaklik)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* SENİN YOLUN — tahtaya el yazısıyla, sonuç ekranındaki gibi. */}
        {kilitliAdimlar.length > 0 && (
          <div className="mt-5 text-left" data-alan="kilit-zincir">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Senin yolun
            </div>
            <div className="zt-sahne rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <ul className="elyazisi space-y-1.5 text-lg text-cyan-100">
                {kilitliAdimlar.map((ad, i) => (
                  <li key={i} className="tahta-satir" style={{ animationDelay: `${i * 180}ms` }}>
                    {ad.a} {ad.islem} {ad.b} = {ad.sonuc}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* BU TURUN BİR ÇÖZÜMÜ
            Cevabını kilitleyen oyuncu artık bu turda bir şey
            değiştiremez; beklerken doğru yolu görmek oyunu öğretiyor.
            Çözüm sunucudan GELMİYOR — tohumdan burada üretiliyor. */}
        {turCozumu && turCozumu.satirlar.length > 0 && (
          <div className="mt-4 text-left" data-alan="kilit-cozum">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Bu turun bir çözümü
            </div>
            <div className="zt-sahne rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
              <ul className="elyazisi space-y-1.5 text-lg text-amber-100">
                {turCozumu.satirlar.map((satir, i) => (
                  <li key={i} className="tahta-satir" style={{ animationDelay: `${i * 180}ms` }}>
                    {satir}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-600">Tek yol değil.</p>
          </div>
        )}

        {/* Tur saati — çubukla, rakamla değil. */}
        <div className="mt-5">
          <div className="zt-cubuk h-2 w-full">
            <div
              className="zt-cubuk-dolgu"
              style={{
                width: `${Math.max(0, Math.min(100, Math.round((kalanSn / (mac.turSuresiSn ?? 60)) * 100)))}%`,
              }}
            />
          </div>
          <div
            className="mt-1 flex items-center justify-between text-[11px] text-slate-500"
            data-alan="kilit-sayac"
          >
            <span>
              Skor {benim === 'a' ? mac.skorA : mac.skorB} — {benim === 'a' ? mac.skorB : mac.skorA}
            </span>
            <span>{kalanSn > 0 ? `${kalanSn} sn` : 'tur kapanıyor…'}</span>
          </div>
        </div>

        <button
          onClick={() => setCikisSoruluyor(true)}
          data-alan="duello-terk"
          className="zt-dokunma-alani mt-6 w-full text-xs font-bold text-slate-600 hover:text-slate-400"
        >
          Maçtan çık
        </button>
      </Cerceve>
    );
  }

  return (
    <Oyun
      // Tur değişince tahta sıfırdan kurulur.
      key={`${mac.id}-${mac.aktifTur}`}
      tur={tur}
      seviye={mac.seviye}
      sure={kalanSn}
      mod="antrenman"
      oturumPuan={null}
      duello={{
        turNo: mac.aktifTur,
        toplamTur: DUELLO_TUR_SAYISI,
        skorBen: benim === 'a' ? mac.skorA : mac.skorB,
        skorRakip: benim === 'a' ? mac.skorB : mac.skorA,
        rakipAd: mac.rakip?.ad ?? (mac.botMu ? (mac.botAd ?? 'Rakip') : 'Rakip'),
        rakipElo: mac.rakip?.elo ?? null,
        rakipGalibiyet: mac.rakip?.galibiyet ?? null,
        rakipUzaklik,
        onIlerleme: ilerlemeGonder,
        onCik: () => setCikisSoruluyor(true),
      }}
      // Tur bitince (tam isabet ya da süre) son zincir gönderilir.
      // Puanı sunucu veriyor; buradaki `puan` alanı düelloda kullanılmaz.
      // Düelloda "Bitir" turu kapatmaz, cevabı KİLİTLER.
      onBitti={(s) => ilerlemeGonder(s.adimlar, true)}
    />
  );
}

function Cerceve({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    // İçerik dikeyde ortalanır: bekleme ve sonuç ekranlarında az
    // içerik vardı ve ekranın altı kapkara kalıyordu.
    <main className="flex min-h-dvh flex-col justify-center bg-[#0A0E1A] px-5 pb-6 pt-16 text-slate-200">
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="text-2xl font-black text-white">{baslik}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </main>
  );
}

function GeriDugmesi({ onCik }: { onCik: () => void }) {
  return (
    <button
      onClick={onCik}
      data-alan="duello-cik"
      className="mt-3 min-h-[44px] w-full text-sm font-bold text-slate-400 hover:text-slate-200"
    >
      Vazgeç
    </button>
  );
}
