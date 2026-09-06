import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { duelloTurTohumu, DUELLO_TUR_SAYISI } from '@zihinturu/cekirdek';
import { turKur, SEVIYE_LISTESI } from '@zihinturu/oyun-sayi';
import Oyun from './Oyun';
import {
  duelloAra,
  duelloDurumOku,
  duelloGonder,
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
  const macRef = useRef<DuelloMac | null>(null);
  macRef.current = mac;

  const seviyeEtiket =
    SEVIYE_LISTESI.find((s) => s.anahtar === seviye)?.etiket ?? seviye;

  /* --- Rakip arama --- */
  useEffect(() => {
    if (!girisYapildiMi || mac) return;
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
  }, [girisYapildiMi, seviye, mac]);

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
        .catch((e) => setHata((e as Error).message));
    },
    [],
  );

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
          onClick={() => {
            setMac(null);
            setRakipUzaklik(null);
          }}
          data-alan="duello-yeni"
          className="mt-6 min-h-[52px] w-full rounded-xl bg-cyan-300 text-base font-black text-slate-900 hover:bg-cyan-200"
        >
          Yeni düello
        </button>
        <GeriDugmesi onCik={onCik} />
      </Cerceve>
    );
  }

  if (!tur) return null;

  const benim = mac.benTarafim;
  const gecenSn = Math.max(0, (Date.now() - Date.parse(mac.turBasladi)) / 1000);
  const kalanSn = Math.max(1, Math.round((mac.turSuresiSn ?? 60) - gecenSn));

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
        rakipAd: mac.botMu ? (mac.botAd ?? 'Rakip') : 'Rakip',
        rakipUzaklik,
        onIlerleme: ilerlemeGonder,
      }}
      // Tur bitince (tam isabet ya da süre) son zincir gönderilir.
      // Puanı sunucu veriyor; buradaki `puan` alanı düelloda kullanılmaz.
      onBitti={(s) => ilerlemeGonder(s.adimlar)}
    />
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
