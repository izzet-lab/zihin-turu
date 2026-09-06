import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { duelloTurTohumu, DUELLO_TUR_SAYISI } from '@zihinturu/cekirdek';
import { turKur, SEVIYE_LISTESI } from '@zihinturu/oyun-sayi';
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
  seviye: string;
  girisYapildiMi: boolean;
  onCik: () => void;
  onGirisAc: () => void;
}

export default function Duello({ seviye, girisYapildiMi, onCik, onGirisAc }: Props) {
  const [mac, setMac] = useState<DuelloMac | null>(null);
  const [bekleyenSn, setBekleyenSn] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const [rakipUzaklik, setRakipUzaklik] = useState<number | null>(null);
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

    const z = setInterval(yokla, YOKLAMA_MS);
    return () => {
      durduruldu = true;
      clearInterval(z);
    };
  }, [mac?.id, mac?.durum, mac?.aktifTur]);

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

  /* --- Oyuncunun ilerlemesini sunucuya bildir --- */
  const ilerlemeGonder = useCallback(
    (adimlar: { a: number; b: number; islem: string; sonuc: number }[]) => {
      const m = macRef.current;
      if (!m || m.durum !== 'basladi') return;
      duelloGonder(m.id, m.aktifTur, adimlar)
        .then((sonuc) => {
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
      <Cerceve baslik="Düello">
        <p className="text-sm text-amber-300" data-alan="duello-hata">
          {hata}
        </p>
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
        <button
          onClick={() => setKip('rastgele')}
          data-alan="duello-rastgele"
          className="min-h-[56px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
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
        {mac.botMu && (
          <p className="mt-3 text-xs text-slate-600">
            Bu maç bir rakip atanarak oynandı; derecen değişmedi.
          </p>
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

  return (
    <>
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
        rakipAd: mac.botMu ? (mac.botAd ?? 'Rakip') : 'Rakip',
        rakipUzaklik,
        onIlerleme: ilerlemeGonder,
      }}
      // Tur bitince (tam isabet ya da süre) son zincir gönderilir.
      // Puanı sunucu veriyor; buradaki `puan` alanı düelloda kullanılmaz.
      onBitti={(s) => ilerlemeGonder(s.adimlar)}
    />
    {/* Maçtan çıkış — oyun ekranının altında, dikkat çekmeden. */}
    <div className="mx-auto -mt-2 w-full max-w-md px-5 pb-6">
      <button
        onClick={() => setCikisSoruluyor(true)}
        data-alan="duello-terk"
        className="min-h-[44px] w-full text-xs font-bold text-slate-600 hover:text-slate-400"
      >
        Maçtan çık
      </button>
    </div>
    </>
  );
}

function Cerceve({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#0A0E1A] px-5 pb-6 pt-16 text-slate-200">
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
