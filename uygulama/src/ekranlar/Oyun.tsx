import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Tur } from '@zihinturu/cekirdek';
import {
  puanlaHesap,
  jokerVer,
  jokerliPuan,
  uretimYap,
  kullanilmayanTasIndeksleri,
  antrenmanToplamCarpani,
  GUNUN_TURU_CARPANI,
  JOKER_HAK_SAYISI,
  JOKER_MALIYET,
  type Islem,
  type SayiVeri,
  type JokerTip,
} from '@zihinturu/oyun-sayi';
import { baslat, ilerle, enYakinTas, enYakinFark, type Tas } from '../motor';
import { sesTasSec, sesBirlestir, sesHata, sesTamIsabet, sesJoker, sesGeriSayim } from '../ses';
import Konfeti from '../bilesenler/Konfeti';
import type { Mod } from './Kurulum';

export interface OyunSonuc {
  fark: number;
  puan: number;
  kalan: number;
  ulasilan: number | null;
  jokerler: JokerTip[];
  /** Antrenman'da uygulanan toplam çarpan (süre × seviye); Günün Turu'nda null. */
  carpan: number | null;
  /**
   * Oyuncunun yaptığı adım zinciri — sunucuya doğrulama için gönderilir.
   * Sunucu bu zinciri tohumdan yeniden üreteceği tura karşı doğrular ve
   * puanı kendisi hesaplar. İstemcinin bildirdiği `puan` yalnızca anlık
   * gösterim içindir.
   */
  adimlar: { a: number; b: number; islem: string; sonuc: number }[];
}

interface Props {
  tur: Tur;
  seviye: string;
  sure: number; // 0 = süresiz
  mod: Mod;
  /** Antrenman oturumu puan/tur göstergesi — yalnızca Antrenman'da dolu gelir. */
  oturumPuan: { toplamPuan: number; turSayisi: number } | null;
  onBitti: (s: OyunSonuc) => void;
  onYardim?: () => void;
}

const ISLEMLER: { op: Islem; ad: string }[] = [
  { op: '+', ad: 'topla' },
  { op: '−', ad: 'çıkar' },
  { op: '×', ad: 'çarp' },
  { op: '÷', ad: 'böl' },
];

const JOKER_META: { tip: JokerTip; ad: string; simge: string }[] = [
  { tip: 'adim', ad: 'Bir adım aç', simge: '💡' },
  { tip: 'yanlis', ad: 'Yanlışı sil', simge: '🧹' },
  { tip: 'sure', ad: 'Süre ekle', simge: '⏱' },
];

export default function Oyun({ tur, seviye, sure, mod, oturumPuan, onBitti, onYardim }: Props) {
  const veri = tur.veri as SayiVeri;
  const hedef = veri.hedef;

  // Çözüm yalnızca joker göstermek için burada, deterministik olarak
  // yeniden üretiliyor (tohumdan) — istemciye ayrıca "gönderilmiyor",
  // zaten istemcinin kendisinde hesaplanıyor. Joker, kuralı gereği
  // bilerek çözümün bir kısmını açar (bkz. oyun-sayi joker belgesi).
  const uretim = useMemo(() => uretimYap(tur.seviye, tur.tohum), [tur]);

  const [durum, gonder] = useReducer(ilerle, veri.sayilar, baslat);
  const [kalan, setKalan] = useState<number>(sure);
  const [toplamSure, setToplamSure] = useState<number>(sure); // joker ile uzayabilir
  const bittiRef = useRef(false);

  // --- Joker durumu ---
  const [jokerHakki, setJokerHakki] = useState<number>(JOKER_HAK_SAYISI);
  const [kullanilanJokerler, setKullanilanJokerler] = useState<JokerTip[]>([]);
  const [acikAdimlar, setAcikAdimlar] = useState<string[]>([]);

  const yakinTas = enYakinTas(durum, hedef);
  const yakinFark = enYakinFark(durum, hedef);
  const tamIsabet = yakinFark === 0;

  function tasTikla(id: number) {
    // Bir taş birleşimin ikinci ayağı olduğunda burada değil,
    // gecmis uzunluğu değiştiğinde ses çalınır (aşağıdaki efekt).
    // Yalnızca seçim/seçim kaldırma anında kısa bir tık duyulur.
    if (durum.secimA === null || durum.islem === null) sesTasSec();
    gonder({ t: 'tas', id });
  }

  function jokerKullan(tip: JokerTip) {
    if (jokerHakki <= 0 || bittiRef.current) return;
    if (tip === 'adim') {
      const sonuc = jokerVer(uretim, 'adim', { kullanilanAdim: acikAdimlar.length });
      if (!sonuc || sonuc.tip !== 'adim') return; // çözüm tükendi
      setAcikAdimlar((a) => [...a, sonuc.metin]);
    } else if (tip === 'yanlis') {
      const sonuc = jokerVer(uretim, 'yanlis', { disHaricTutulan: durum.silinenler });
      if (!sonuc || sonuc.tip !== 'yanlis') return; // silinecek yanlış taş kalmadı
      gonder({ t: 'tasSil', id: sonuc.indeks });
    } else if (tip === 'sure') {
      if (sure <= 0) return; // süresiz modda anlamsız
      setKalan((k) => k + 15);
      setToplamSure((t) => t + 15);
    }
    sesJoker();
    setJokerHakki((h) => h - 1);
    setKullanilanJokerler((j) => [...j, tip]);
  }

  // Bitiş: en yakın taşın zinciri cevaptır; puanı oyun-sayi hesaplar.
  function bitir() {
    if (bittiRef.current) return;
    bittiRef.current = true;
    const t: Tas = enYakinTas(durum, hedef);
    const fark = Math.abs(t.deger - hedef);
    // Tek kişilikte "ilk bulan" primi yok (rakip yok).
    const temel = puanlaHesap(seviye, fark, kalan, toplamSure, false);
    // Antrenman'da risk çarpanı (süre × seviye) seçilen SÜREYE göre
    // uygulanır (joker ile uzatılmış süreye göre değil — oyuncu riski
    // baştan üstlendi). Günün Turu'nda çarpan yok — puanlar kıyaslanabilir
    // kalmalı.
    const carpan = mod === 'antrenman' ? antrenmanToplamCarpani(seviye, sure) : GUNUN_TURU_CARPANI;
    const carpanli = mod === 'antrenman' ? Math.round(temel.toplam * carpan) : temel.toplam * carpan;
    const nihai = jokerliPuan(carpanli, kullanilanJokerler);
    onBitti({ fark, puan: nihai, kalan, ulasilan: t.deger, jokerler: kullanilanJokerler, carpan, adimlar: t.yol });
  }

  // Süre sayacı (yalnızca süreli modda)
  useEffect(() => {
    if (sure <= 0) return;
    const z = setInterval(() => {
      setKalan((k) => {
        if (k <= 1) {
          clearInterval(z);
          return 0;
        }
        return k - 1;
      });
    }, 1000);
    return () => clearInterval(z);
  }, [sure]);

  // Süre bitince tur kapanır
  useEffect(() => {
    if (sure > 0 && kalan === 0) bitir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalan, sure]);

  // Geri sayımın son 5 saniyesinde hafif bir tik; son saniyede daha
  // belirgin. Tam isabet olduysa ya da tur bittiyse çalınmaz.
  useEffect(() => {
    if (sure <= 0 || tamIsabet || bittiRef.current) return;
    if (kalan > 0 && kalan <= 5) sesGeriSayim(kalan === 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalan]);

  // Tam isabet olunca kısa bir gecikmeyle tur kapanır; ses ve konfeti
  // yalnızca bir kez, isabet anında tetiklenir.
  const [konfetiGoster, setKonfetiGoster] = useState(false);
  useEffect(() => {
    if (!tamIsabet) return;
    sesTamIsabet();
    setKonfetiGoster(true);
    const z = setTimeout(() => bitir(), 650);
    return () => clearTimeout(z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamIsabet]);

  // Hata mesajı kendiliğinden söner
  useEffect(() => {
    if (!durum.hata) return;
    sesHata();
    const z = setTimeout(() => gonder({ t: 'hataTemizle' }), 1400);
    return () => clearTimeout(z);
  }, [durum.hata]);

  // Başarılı bir birleştirme olduğunda (geçmiş uzadığında) kısa bir ton.
  const oncekiGecmisUzunluk = useRef(0);
  useEffect(() => {
    if (durum.gecmis.length > oncekiGecmisUzunluk.current) sesBirlestir();
    oncekiGecmisUzunluk.current = durum.gecmis.length;
  }, [durum.gecmis.length]);

  const sureYuzde = toplamSure > 0 ? Math.max(0, (kalan / toplamSure) * 100) : 100;

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-6">
      {konfetiGoster && <Konfeti />}
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          {mod === 'antrenman' && oturumPuan ? (
            <div className="text-xs font-bold text-slate-500" data-alan="oturum-gostergesi">
              Oturum: <span className="text-slate-300">{oturumPuan.toplamPuan} puan</span> ·{' '}
              {oturumPuan.turSayisi + 1}. tur
            </div>
          ) : (
            <span />
          )}
          <span className="min-h-[44px] min-w-[44px]" />
        </div>

        {/* Hedef + en yakın */}
        <div className="mt-1 flex items-end justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Hedef</div>
            <div className="text-5xl font-black leading-none text-white" data-alan="hedef">
              {hedef}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">En yakın</div>
            {durum.gecmis.length === 0 ? (
              <>
                <div data-alan="en-yakin" className="text-3xl font-black leading-none text-slate-600">—</div>
                <div className="text-[11px] text-slate-600">bir işlem yap</div>
              </>
            ) : (
              <>
                <div
                  data-alan="en-yakin"
                  className={`text-3xl font-black leading-none ${tamIsabet ? 'text-cyan-300' : 'text-slate-300'}`}
                >
                  {tamIsabet ? 'Tam!' : yakinTas.deger}
                </div>
                <div className="text-[11px] text-slate-500">
                  {tamIsabet ? 'hedefe ulaştın' : `${yakinFark} fark`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Süre çubuğu */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
              sureYuzde < 25 ? 'bg-amber-400' : 'bg-cyan-300'
            }`}
            style={{ width: `${sureYuzde}%` }}
            data-alan="sure-cubuk"
          />
        </div>
        <div className="mt-1 text-right text-[11px] text-slate-500" data-alan="sure-kalan" data-toplam-sure={toplamSure}>
          {toplamSure > 0 ? `${kalan} sn` : 'süresiz'}
        </div>

        {/* Taş rafı */}
        <div className="mt-5 grid grid-cols-4 gap-2.5" data-alan="raf">
          {durum.taslar.map((t) => {
            const secili = durum.secimA === t.id;
            const uretilmis = t.yol.length > 0;
            return (
              <button
                key={t.id}
                data-tas={t.deger}
                onClick={() => tasTikla(t.id)}
                aria-pressed={secili}
                className={`min-h-[64px] rounded-xl border text-2xl font-black transition active:scale-95 ${
                  secili
                    ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100 ring-2 ring-cyan-300/60'
                    : uretilmis
                      ? 'border-cyan-300/25 bg-slate-800/70 text-cyan-100'
                      : 'border-slate-700 bg-slate-800/50 text-slate-100'
                }`}
              >
                {t.deger}
              </button>
            );
          })}
        </div>

        {/* İşlem tuşları */}
        <div className="mt-3 grid grid-cols-4 gap-2.5" data-alan="islemler">
          {ISLEMLER.map((i) => (
            <button
              key={i.op}
              data-islem={i.op}
              aria-label={i.ad}
              onClick={() => gonder({ t: 'islem', op: i.op })}
              className={`min-h-[52px] rounded-xl border text-2xl font-black transition active:scale-95 ${
                durum.islem === i.op
                  ? 'border-cyan-300 bg-cyan-300/20 text-cyan-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-200'
              }`}
            >
              {i.op}
            </button>
          ))}
        </div>

        {/* Hata */}
        <div className="mt-2 h-5 text-center text-xs text-amber-400" role="status" data-alan="hata">
          {durum.hata ?? ''}
        </div>

        {/* Joker */}
        <div className="mt-1 rounded-xl border border-slate-800 bg-slate-900/30 p-3" data-alan="jokerler">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Joker</span>
            <span className="text-xs text-slate-400" data-alan="joker-hak">
              {jokerHakki} hak kaldı
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {JOKER_META.map((j) => {
              // Joker hakkı bittiyse genel nedenle devre dışı
              const hakYok = jokerHakki <= 0;
              // Tipe özel devre dışı kalma nedenleri
              const suresizMod = j.tip === 'sure' && sure <= 0;
              const adimBitti = j.tip === 'adim' && acikAdimlar.length >= uretim.cozum.adimlar.length;
              const yanlisYok = j.tip === 'yanlis' &&
                kullanilmayanTasIndeksleri(uretim).every((i) => durum.silinenler.includes(i));
              const devreDisi = hakYok || suresizMod || adimBitti || yanlisYok;

              // Devre dışı sebebini gösterecek kısa not
              let devreDisiNot: string | null = null;
              if (devreDisi && !hakYok) {
                if (yanlisYok) devreDisiNot = 'Tüm taşlar çözümde kullanılıyor';
                else if (adimBitti) devreDisiNot = 'Tüm adımlar açıldı';
                else if (suresizMod) devreDisiNot = 'Süresiz modda geçersiz';
              }

              return (
                <div key={j.tip} className="relative">
                  <button
                    data-joker={j.tip}
                    onClick={() => jokerKullan(j.tip)}
                    disabled={devreDisi}
                    title={devreDisiNot ?? undefined}
                    className="min-h-[52px] w-full rounded-lg border border-slate-700 bg-slate-900/60 px-1 text-[11px] font-bold text-slate-200 transition active:scale-95 disabled:opacity-30"
                  >
                    <div className="text-base leading-none">{j.simge}</div>
                    <div className="mt-1 leading-tight">{j.ad}</div>
                    <div className="text-slate-500">−{JOKER_MALIYET[j.tip]} puan</div>
                  </button>
                  {devreDisiNot && (
                    <div className="mt-0.5 text-center text-[9px] leading-tight text-slate-600">
                      {devreDisiNot}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {acikAdimlar.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-amber-200" data-alan="joker-ipucu">
              {acikAdimlar.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}
        </div>

        {/* İşlem geçmişi */}
        <div className="mt-1 min-h-[64px] rounded-xl border border-slate-800 bg-slate-900/30 p-3" data-alan="gecmis">
          {durum.gecmis.length === 0 ? (
            <div className="text-center text-xs text-slate-600">İki taş ve bir işlem seç.</div>
          ) : (
            <ul className="space-y-1 text-sm text-slate-300">
              {durum.gecmis.map((a, i) => (
                <li key={i} className="tabular-nums">
                  {a.a} {a.islem} {a.b} = <span className="font-bold text-slate-100">{a.sonuc}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alt eylemler */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <button
            onClick={() => gonder({ t: 'geriAl' })}
            disabled={durum.yigin.length === 0}
            className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-900/60 text-sm font-bold text-slate-200 disabled:opacity-40"
          >
            Geri al
          </button>
          <button
            onClick={() => gonder({ t: 'sifirla' })}
            className="min-h-[52px] rounded-xl border border-slate-700 bg-slate-900/60 text-sm font-bold text-slate-200"
          >
            Sıfırla
          </button>
          <button
            data-alan="bitir"
            onClick={bitir}
            className="min-h-[52px] rounded-xl bg-cyan-300 text-sm font-black text-slate-900 hover:bg-cyan-200"
          >
            Bitir
          </button>
        </div>
      </div>
    </main>
  );
}
