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
import { gunlukTohum } from '@tamisabet/cekirdek';
import { kelimeGonder } from '../kimlik';
import { bugun, kelimeGunlukOynandiMi, kelimeGunlukIsaretle } from '../depo';
import SeviyeIzgara from '../bilesenler/SeviyeIzgara';
import SeriVeXp from '../bilesenler/SeriVeXp';
import {
  KELIME_SEVIYE_LISTESI,
  kelimeTuruKur,
  tamSozlukKur,
  turkceBuyult,
} from '@tamisabet/oyun-kelime';

type Asama = 'yukleniyor' | 'seviye' | 'oyun' | 'sonuc';

/**
 * Gunun Turu lige isler, Antrenman islemez.
 * Sayi turundaki ayrimin aynisi (kural 4).
 */
type Mod = 'gunun' | 'antrenman';

/** Rafa konan tek bir harf. Aynı harf havuzda birden çok kez olabilir,
 *  bu yüzden kimlik harfin kendisi değil sırası. */
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
  const [yuklemeHatasi, setYuklemeHatasi] = useState(false);
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
  } | null>(null);

  const [oturum, setOturum] = useState({ turSayisi: 0, puan: 0 });
  /** Sunucunun verdigi puan. null ise misafir ya da aga ulasilamadi. */
  const [sunucuPuan, setSunucuPuan] = useState<number | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const seviyeAyar = useMemo(
    () => KELIME_SEVIYE_LISTESI.find((s) => s.anahtar === seviye) ?? KELIME_SEVIYE_LISTESI[1]!,
    [seviye],
  );

  /* --------------------------------------------------------------- */
  /* Sözlüğü yükle                                                     */
  /* --------------------------------------------------------------- */

  useEffect(() => {
    let iptal = false;
    import('@tamisabet/oyun-kelime/sozluk-verisi')
      .then(({ KELIME_METNI, YAYGIN_METNI }) => {
        if (iptal) return;
        // İki liste: geniş olan cevabı KABUL eder, yaygın olan HEDEFİ
        // belirler (bkz. oyun-kelime/kelimeTuruKur).
        setSaglayici(kelimeTuruKur(tamSozlukKur(KELIME_METNI), tamSozlukKur(YAYGIN_METNI)));
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
      setMod(m);
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
    })
      .then((y) => setSunucuPuan(y ? y.puan : null))
      .finally(() => setGonderiliyor(false));
  }, [saglayici, tur, secilenler, taslar, seviye, seviyeAyar.sure, kalan, mod]);

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
        <h1 className="text-2xl font-black leading-none text-white">Kelime Turu</h1>
        <p className="mt-1 text-sm text-slate-400">
          Verilen harflerden en uzun kelimeyi türet. Her harf bir kez kullanılır.
        </p>

        {/* MOD — Günün Turu lige işler, Antrenman işlemez (kural 4).
            Alt yazılar ana ekrandaki dille aynı: "Herkese aynı
            bulmaca" / "İstediğin kadar oyna". İki ekranda iki ayrı
            cümle kullanmak aynı şeyi iki farklı şey gibi gösteriyordu. */}
        <div className="mt-5 grid grid-cols-2 gap-2.5" data-alan="kelime-mod-secici">
          {([
            { k: 'gunun' as Mod, ad: 'Günün Turu', alt: 'Herkese aynı bulmaca · lige işler', simge: '📅' },
            { k: 'antrenman' as Mod, ad: 'Antrenman', alt: 'İstediğin kadar oyna', simge: '♾️' },
          ]).map((m) => (
            <button
              key={m.k}
              data-mod={m.k}
              aria-pressed={mod === m.k}
              onClick={() => setMod(m.k)}
              className={`zt-secim min-h-[92px] rounded-xl border-2 px-3 py-3 text-left transition ${
                mod === m.k
                  ? 'zt-secim-acik border-cyan-300 bg-cyan-300/15'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <span className="block text-xl leading-none" aria-hidden="true">
                {m.simge}
              </span>
              <span
                className={`mt-2 block font-black leading-tight ${
                  mod === m.k ? 'text-cyan-100' : 'text-slate-100'
                }`}
              >
                {m.ad}
              </span>
              <span
                className={`mt-0.5 block text-[11px] leading-snug ${
                  mod === m.k ? 'text-cyan-200/70' : 'text-slate-400'
                }`}
              >
                {m.alt}
              </span>
            </button>
          ))}
        </div>

        {mod === 'gunun' && gunlukKilit && (
          <div
            className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-400"
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
          className="mt-8 min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition hover:bg-cyan-200 active:scale-[.99] disabled:opacity-40"
        >
          {mod === 'gunun' ? 'Günün Kelime Turunu Oyna' : 'Başla'}
        </button>

        <SeriVeXp kullanici={kullanici} onGirisAc={onGirisAc} />
      </Cerceve>
    );
  }

  if (asama === 'sonuc' && sonuc) {
    const tamMi = sonuc.uzaklik === 0;
    // Çözüm oyuncunun kendi kelimesiyse göstermenin anlamı yok.
    const cozumKelimesi = sonuc.enUzun.split(' ')[0]?.toLocaleLowerCase('tr') ?? '';
    const benimKelime = sonuc.kelime.toLocaleLowerCase('tr');
    // Çekimli biçimler sözlük listesinde yok ama kabul ediliyor
    // (bkz. oyun-kelime/cekim.ts); oyuncunun kelimesi listedeki en
    // uzundan DAHA uzun olabiliyor. Böyle bir durumda "en uzun kelime"
    // diye daha kısa bir şey göstermek saçma olurdu.
    const cozumFarkli =
      !!cozumKelimesi &&
      cozumKelimesi !== benimKelime &&
      cozumKelimesi.length >= benimKelime.length;
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

          {/* LIGE ISLEDI MI — puani sunucu veriyor (kural 2). */}
          <div className="mt-4 text-xs" data-alan="kelime-lig-durumu">
            {mod === 'antrenman' ? (
              <span className="text-slate-500">Antrenman turu lige işlemez.</span>
            ) : gonderiliyor ? (
              <span className="text-slate-500">Sunucuya gönderiliyor…</span>
            ) : sunucuPuan != null ? (
              <span className="text-cyan-300">Lige işlendi · sunucu {sunucuPuan} puan verdi</span>
            ) : (
              <span className="text-slate-500">
                Lige işlenmedi — puan için giriş yapmış olman gerekiyor.
              </span>
            )}
          </div>

          {oturum.turSayisi > 1 && (
            <div className="mt-5 text-sm text-slate-400" data-alan="kelime-oturum">
              Bu oturumda {oturum.turSayisi} turda {oturum.puan} puan topladın.
            </div>
          )}

          <button
            onClick={() => turBaslat(seviye, 'antrenman')}
            className="mt-6 min-h-[52px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition active:scale-[0.99]"
            data-alan="kelime-yeni-tur"
          >
            {/* Gunun turu gunde bir kez; "yeni tur" antrenmana gecirir. */}
            {mod === 'gunun' ? 'Antrenmana devam et' : 'Yeni tur'}
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

/**
 * Ortak dış kabuk.
 *
 * ÇIKIŞ DÜĞMESİ SAĞ ÜSTTEN SOL ÜSTE ALINDI.
 * Sağ üstte zaten sabit hamburger menü duruyor; yuvarlak "✕" onun
 * üstüne biniyordu ve iki düğme birbirini yiyordu. Çıkış artık
 * uygulamanın her yerindeki gibi sol üstte "← Geri".
 */
function Cerceve({ children, onCik }: { children: React.ReactNode; onCik: () => void }) {
  return (
    <main className="min-h-dvh bg-[#0A0E1A] px-5 pb-6 pt-8 text-slate-200">
      <div className="mx-auto w-full max-w-md">
        <button
          onClick={onCik}
          data-alan="kelime-cik"
          className="zt-dokunma-alani -ml-2 mb-3 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-bold text-cyan-300 hover:bg-slate-800/60"
        >
          ← Geri
        </button>
        {children}
      </div>
    </main>
  );
}
