/**
 * KelimeTuru.tsx — Kelime turunun arayüzü.
 *
 * Üç durum tek ekranda: seviye seçimi → oyun → sonuç. Arena ve Düello
 * ekranlarıyla aynı kalıp.
 *
 * KURAL 1'E DİKKAT
 * Burada hiçbir oyun kuralı yok. Hangi kelime geçerli, kaç puan eder,
 * en uzunu hangisi — hepsini `@zihinturu/oyun-kelime` söylüyor. Bu
 * dosya yalnızca harfleri gösteriyor, dokunuşları topluyor ve cevabı
 * sağlayıcıya veriyor.
 *
 * SÖZLÜK NEDEN SONRADAN YÜKLENİYOR
 * Kelime listesi yarım megabayt. Sayı turunu oynayan birinin bunu
 * indirmesi gereksiz; liste yalnızca bu ekran açıldığında isteniyor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Tur, TurSaglayici } from '@zihinturu/cekirdek';
import {
  KELIME_SEVIYE_LISTESI,
  kelimeTuruKur,
  tamSozlukKur,
  turkceBuyult,
} from '@zihinturu/oyun-kelime';

type Asama = 'yukleniyor' | 'seviye' | 'oyun' | 'sonuc';

/** Rafa konan tek bir harf. Aynı harf havuzda birden çok kez olabilir,
 *  bu yüzden kimlik harfin kendisi değil sırası. */
interface Tas {
  id: number;
  harf: string;
}

interface Props {
  /** Başlangıç seviyesi; verilmezse oyuncu seçer. */
  baslangicSeviye?: string;
  onCik: () => void;
}

export default function KelimeTuru({ baslangicSeviye, onCik }: Props) {
  const [asama, setAsama] = useState<Asama>('yukleniyor');
  const [saglayici, setSaglayici] = useState<TurSaglayici | null>(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(false);
  const [seviye, setSeviye] = useState(baslangicSeviye ?? 'normal');

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
  } | null>(null);

  const [oturum, setOturum] = useState({ turSayisi: 0, puan: 0 });

  const seviyeAyar = useMemo(
    () => KELIME_SEVIYE_LISTESI.find((s) => s.anahtar === seviye) ?? KELIME_SEVIYE_LISTESI[1]!,
    [seviye],
  );

  /* --------------------------------------------------------------- */
  /* Sözlüğü yükle                                                     */
  /* --------------------------------------------------------------- */

  useEffect(() => {
    let iptal = false;
    import('@zihinturu/oyun-kelime/sozluk-verisi')
      .then(({ KELIME_METNI }) => {
        if (iptal) return;
        setSaglayici(kelimeTuruKur(tamSozlukKur(KELIME_METNI)));
        setAsama('seviye');
      })
      .catch(() => {
        if (!iptal) setYuklemeHatasi(true);
      });
    return () => {
      iptal = true;
    };
  }, []);

  /* --------------------------------------------------------------- */
  /* Tur akışı                                                         */
  /* --------------------------------------------------------------- */

  const turBaslat = useCallback(
    (sv: string) => {
      if (!saglayici) return;
      // Tohum anlık: antrenman turu kimseyle paylaşılmıyor, tekrar
      // üretilmesi gerekmiyor.
      const tohum = Math.floor(Math.random() * 2 ** 31);
      const yeni = saglayici.turUret(sv, tohum);
      const harfler = (yeni.veri as { harfler: string[] }).harfler;
      setTur(yeni);
      setTaslar(harfler.map((h, i) => ({ id: i, harf: h })));
      setSecilenler([]);
      setUyari(null);
      setSonuc(null);
      const sure = KELIME_SEVIYE_LISTESI.find((s) => s.anahtar === sv)?.sure ?? 60;
      setKalan(sure);
      setAsama('oyun');
    },
    [saglayici],
  );

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
    const p = saglayici.puanla(seviye, d, kalan, toplamSure, false);
    const cozum = saglayici.cozumBul(tur);

    setSonuc({
      kelime,
      ozet: d.ozet ?? '',
      uzaklik: d.uzaklik ?? 0,
      puan: p.toplam,
      enUzun: cozum.satirlar[0] ?? '',
    });
    setOturum((o) => ({ turSayisi: o.turSayisi + 1, puan: o.puan + p.toplam }));
    setAsama('sonuc');
  }, [saglayici, tur, secilenler, taslar, seviye, seviyeAyar.sure, kalan]);

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
  /* Harf seçimi                                                       */
  /* --------------------------------------------------------------- */

  const harfTikla = (id: number) => {
    setUyari(null);
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
  /* Ekranlar                                                          */
  /* --------------------------------------------------------------- */

  if (yuklemeHatasi) {
    return (
      <Cerceve onCik={onCik}>
        <div className="mt-20 text-center">
          <div className="text-4xl">📕</div>
          <h1 className="mt-4 text-xl font-black text-white">Sözlük yüklenemedi</h1>
          <p className="mt-2 text-sm text-slate-400">
            Kelime turu sözlüğe ihtiyaç duyuyor. Bağlantını kontrol edip tekrar dene.
          </p>
          <button
            onClick={onCik}
            className="mt-6 min-h-[44px] rounded-xl bg-slate-800 px-6 font-bold text-slate-200"
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
          <div className="zt-nabiz text-4xl">📖</div>
          <p className="mt-4 text-sm font-bold text-slate-400">Sözlük hazırlanıyor…</p>
        </div>
      </Cerceve>
    );
  }

  if (asama === 'seviye') {
    return (
      <Cerceve onCik={onCik}>
        <h1 className="mt-2 text-2xl font-black text-white">Kelime Turu</h1>
        <p className="mt-1 text-sm text-slate-400">
          Verilen harflerden en uzun kelimeyi türet. Her harf bir kez kullanılır.
        </p>

        <div className="mt-6 space-y-2.5" data-alan="kelime-seviye-secici">
          {KELIME_SEVIYE_LISTESI.map((s) => (
            <button
              key={s.anahtar}
              data-seviye={s.anahtar}
              onClick={() => {
                setSeviye(s.anahtar);
                turBaslat(s.anahtar);
              }}
              className="flex min-h-[64px] w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-4 text-left transition active:scale-[0.99]"
            >
              <div>
                <div className="text-base font-black text-white">{s.etiket}</div>
                <div className="text-xs text-slate-400">{s.altEtiket}</div>
              </div>
              <div className="text-xs font-bold text-slate-500">{s.sure} sn</div>
            </button>
          ))}
        </div>
      </Cerceve>
    );
  }

  if (asama === 'sonuc' && sonuc) {
    const tamMi = sonuc.uzaklik === 0;
    // Çözüm oyuncunun kendi kelimesiyse göstermenin anlamı yok.
    const cozumFarkli =
      !!sonuc.enUzun &&
      !sonuc.enUzun.toLocaleLowerCase('tr').startsWith(sonuc.kelime.toLocaleLowerCase('tr') + ' ');
    return (
      <Cerceve onCik={onCik}>
        <div className="mt-6 text-center" data-alan="kelime-sonuc">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {sonuc.kelime ? 'Bulduğun kelime' : 'Kelime yazmadın'}
          </div>
          {sonuc.kelime && (
            <div className="zt-rakam mt-2 break-all text-4xl font-black leading-none text-cyan-200">
              {turkceBuyult(sonuc.kelime)}
            </div>
          )}
          <div className="mt-2 text-sm text-slate-400">
            {tamMi
              ? 'En uzun kelimeyi buldun 🎯'
              : sonuc.kelime
                ? `${sonuc.ozet} · en uzunu ${sonuc.uzaklik} harf daha uzundu`
                : 'Bu turdan puan çıkmadı'}
          </div>

          <div className="zt-sahne mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Puan</div>
            <div className="zt-rakam mt-1 text-5xl font-black leading-none text-cyan-300">
              +{sonuc.puan}
            </div>
          </div>

          {/* Çözüm tur bittikten SONRA gösteriliyor (kural 8).
              Oyuncu en uzunu bulduysa başlık değişiyor: "en uzun kelime"
              deyip başka bir kelime göstermek "demek ki bulamadım" gibi
              okunuyordu. Aynı uzunlukta birden çok çözüm olabilir. */}
          {cozumFarkli && (
          <div className="mt-5 text-left">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {tamMi ? 'Aynı uzunlukta bir başka çözüm' : 'Bu harflerden çıkan en uzun kelime'}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="elyazisi text-lg text-cyan-100">{sonuc.enUzun}</span>
            </div>
          </div>
          )}

          {oturum.turSayisi > 1 && (
            <div className="mt-5 text-sm text-slate-400" data-alan="kelime-oturum">
              Bu oturumda {oturum.turSayisi} turda {oturum.puan} puan topladın.
            </div>
          )}

          <button
            onClick={() => turBaslat(seviye)}
            className="mt-6 min-h-[52px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition active:scale-[0.99]"
            data-alan="kelime-yeni-tur"
          >
            Yeni tur
          </button>
          <button
            onClick={() => setAsama('seviye')}
            className="mt-3 min-h-[44px] w-full text-sm font-bold text-slate-500"
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
    <Cerceve onCik={onCik}>
      <div className="flex items-center justify-between pr-14">
        <div className="text-xs font-bold text-slate-400" data-alan="kelime-gostergesi">
          📖 Kelime Turu · {seviyeAyar.etiket}
        </div>
      </div>

      {/* Süre çubuğu */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            sureYuzde < 25 ? 'bg-amber-400' : 'bg-cyan-300'
          }`}
          style={{ width: `${sureYuzde}%` }}
          data-alan="kelime-sure-cubuk"
        />
      </div>
      <div className="mt-1 text-right text-[11px] text-slate-500" data-alan="kelime-sure-kalan">
        {kalan} sn
      </div>

      {/* Yazılan kelime — boşken ne yapılacağını söylüyor. */}
      <div
        className="zt-sahne mt-5 flex min-h-[84px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 px-4"
        data-alan="kelime-yazilan"
      >
        {yazilan ? (
          <span className="zt-rakam break-all text-center text-3xl font-black leading-none text-cyan-100">
            {turkceBuyult(yazilan)}
          </span>
        ) : (
          <span className="text-sm text-slate-600">Harflere dokunarak kelime kur</span>
        )}
      </div>

      {uyari && (
        <div className="mt-2 text-center text-xs font-bold text-amber-300" data-alan="kelime-uyari">
          {uyari}
        </div>
      )}

      {/* Harf rafı */}
      <div className="mt-6 grid grid-cols-4 gap-2.5" data-alan="kelime-raf">
        {taslar.map((t) => {
          const secili = secilenler.includes(t.id);
          return (
            <button
              key={t.id}
              data-harf={t.harf}
              aria-pressed={secili}
              onClick={() => harfTikla(t.id)}
              className={`min-h-[64px] rounded-xl border text-2xl font-black uppercase leading-none transition active:scale-95 ${
                secili
                  ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100 ring-2 ring-cyan-300/60'
                  : 'border-slate-700 bg-slate-800/50 text-slate-100'
              }`}
            >
              {turkceBuyult(t.harf)}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button
          onClick={sonHarfiSil}
          disabled={secilenler.length === 0}
          className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-800/50 font-bold text-slate-200 disabled:opacity-40"
          data-alan="kelime-sil"
        >
          ← Sil
        </button>
        <button
          onClick={temizle}
          disabled={secilenler.length === 0}
          className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-800/50 font-bold text-slate-200 disabled:opacity-40"
          data-alan="kelime-temizle"
        >
          Temizle
        </button>
      </div>

      <button
        onClick={bitir}
        className="mt-3 min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition active:scale-[0.99]"
        data-alan="kelime-bitir"
      >
        Bitir
      </button>
    </Cerceve>
  );
}

/** Ortak dış kabuk — arka plan, güvenli alan ve çıkış düğmesi. */
function Cerceve({ children, onCik }: { children: React.ReactNode; onCik: () => void }) {
  return (
    <main className="min-h-dvh bg-[#0A0E1A] px-5 pb-6 pt-16 text-slate-200">
      <div className="mx-auto w-full max-w-md">
        <button
          onClick={onCik}
          aria-label="Kelime turundan çık"
          className="absolute right-5 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-300"
          data-alan="kelime-cik"
        >
          ✕
        </button>
        {children}
      </div>
    </main>
  );
}
