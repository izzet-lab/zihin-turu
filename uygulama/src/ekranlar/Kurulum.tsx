import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Seviye } from '@zihinturu/cekirdek';
import { antrenmanCarpani } from '@zihinturu/oyun-sayi';
import { gunlukOynandiMiSunucu, ilerlemeOku, xpSeviyeHesapla, type OyuncuIlerleme } from '../kimlik';
import { oyuncuSayilariOku } from '../oyuncu-sayisi';
import {
  bugun,
  gunlukKilitli,
  serit,
  oku,
  kaliciMi,
  acikSeviyeler as depoAcikSeviyeler,
  sonAntrenmanAyariOku,
} from '../depo';

export type Mod = 'antrenman' | 'gunun';

export interface BaslaAyar {
  mod: Mod;
  seviye: string;
  seviyeEtiket: string;
  sure: number; // saniye; 0 = süresiz
  buyukAdet: number;
}

interface Props {
  seviyeler: readonly Seviye[];
  onBasla: (a: BaslaAyar) => void;
  onYardim: () => void;
  /** Hangi modla açılacağı. "Seviye değiştir" Antrenman'dan geldiğinde
   * modu Günün Turu'na sıçratmamak için kullanılır. Belirtilmezse
   * Günün Turu ile açılır — bilinçli varsayılan. */
  baslangicMod?: Mod;
  /** Giriş yapmış kullanıcı; null ise misafir. */
  kullanici?: { ad: string; id?: string } | null;
  /** Giriş ekranını açar. */
  onGirisAc?: () => void;
  /** Çıkış yapar. */
  onCikisYap?: () => void;
}

// Risk çarpanı yalnızca bu dört süre için tanımlı (bkz. oyun-sayi/antrenmanCarpani).
const SURE_SECENEK = [90, 60, 30, 15];

export default function Kurulum({ seviyeler, onBasla, baslangicMod, kullanici, onGirisAc }: Props) {
  const [mod, setMod] = useState<Mod>(baslangicMod ?? 'gunun');
  const [kilitAciklama, setKilitAciklama] = useState<string | null>(null);

  const il = oku();
  const acik = depoAcikSeviyeler(il);
  const ilkKezMi = acik.length <= 1;

  // Sunucu taraflı kilit: giriş yapmış kullanıcının Günün Turu'nu
  // oynayıp oynamadığı sunucudan okunur (localStorage güvenilir değil).
  const [sunucuKilitli, setSunucuKilitli] = useState<boolean | null>(null);
  const [ilerleme, setIlerleme] = useState<OyuncuIlerleme | null>(null);

  useEffect(() => {
    if (kullanici?.id) {
      gunlukOynandiMiSunucu(bugun()).then(setSunucuKilitli);
      ilerlemeOku(kullanici.id).then(setIlerleme);
    } else {
      setSunucuKilitli(null);
      setIlerleme(null);
    }
  }, [kullanici?.id]);

  // Oyuncu sayıları (eşiğin altındayken null gelir)
  const [oyuncuSayilari, setOyuncuSayilari] = useState<{ bugunOynayanlar: number | null; bugunTamIsabet: number | null } | null>(null);

  useEffect(() => {
    oyuncuSayilariOku(bugun()).then(setOyuncuSayilari);
  }, []);

  // Antrenman ayarları hatırlanır: uygulama kapatılıp açılsa bile son
  // kullanılan seviye/süre/büyük sayı varsayılan gelir. Kayıtlı seviye
  // artık kilitliyse (olağan değil ama olabilir) göz ardı edilir.
  const kayitliAyar = sonAntrenmanAyariOku();
  const kayitliGecerliMi = !!kayitliAyar && acik.includes(kayitliAyar.seviye);

  // Varsayılan seçim: kayıtlı ayar varsa o, yoksa deneyimli oyuncu için
  // "normal" (açıksa), yeni oyuncu için tek açık seviye olan Isınma.
  const [seviye, setSeviye] = useState<string>(() =>
    kayitliGecerliMi ? kayitliAyar!.seviye : acik.includes('normal') ? 'normal' : acik[acik.length - 1]!,
  );
  const [sure, setSure] = useState<number>(() => (kayitliGecerliMi ? kayitliAyar!.sure : 90));
  const [buyukAdet, setBuyukAdet] = useState<number>(() => (kayitliGecerliMi ? kayitliAyar!.buyukAdet : 2));

  const secili = seviyeler.find((s) => s.anahtar === seviye) ?? seviyeler[0]!;
  const gun = bugun();

  // Günün Turu kilidi: giriş yapmış kullanıcıda sunucudan, misafirde localStorage'dan.
  const kilitli = mod === 'gunun' && (
    kullanici?.id
      ? sunucuKilitli === true  // sunucu cevabı gelene kadar kilitli değil
      : gunlukKilitli(gun, il)
  );
  const seritler = useMemo(() => serit(gun, 28, il), [gun, il]);
  const seri = il.seri.gun;

  function seviyeSec(anahtar: string) {
    if (!acik.includes(anahtar)) {
      // Kilitli seviyeye dokunulduğunda kısa açıklama göster.
      const idx = seviyeler.findIndex((s) => s.anahtar === anahtar);
      const onceki = idx > 0 ? seviyeler[idx - 1]!.etiket : 'önceki seviye';
      setKilitAciklama(`${onceki}'de tam isabet yap, ${seviyeler[idx]!.etiket} açılsın.`);
      return;
    }
    setKilitAciklama(null);
    setSeviye(anahtar);
  }

  function basla() {
    if (kilitli) return;
    // Günün Turu herkese aynı koşul: süre seviyeden gelir, büyük sayı sabittir.
    const etkinSure = mod === 'gunun' ? secili.sure : sure;
    const etkinBuyuk = mod === 'gunun' ? 2 : buyukAdet;
    onBasla({ mod, seviye, seviyeEtiket: secili.etiket, sure: etkinSure, buyukAdet: etkinBuyuk });
  }

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="relative flex items-center gap-3 pr-12">
          <img src="/logo.svg" alt="" className="h-9 w-9" />
          <div className="flex-1">
            <h1 className="text-2xl font-black leading-none text-white">Zihin Turu</h1>
            <p className="text-xs text-slate-500">Sayı Turu — rakamlar, dört işlem, bir hedef.</p>
          </div>
        </header>

        {/* Mod seçimi */}
        <div className="mt-7">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Mod</div>
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Mod">
            {(
              [
                { k: 'gunun', ad: 'Günün Turu', not: 'Herkese aynı bulmaca' },
                { k: 'antrenman', ad: 'Antrenman', not: 'Serbest, sınırsız' },
              ] as const
            ).map((m) => (
              <button
                key={m.k}
                data-mod={m.k}
                onClick={() => setMod(m.k)}
                aria-pressed={mod === m.k}
                className={`min-h-[56px] rounded-xl border px-4 py-3 text-left transition ${
                  mod === m.k
                    ? 'border-cyan-300/50 bg-cyan-300/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-slate-100">{m.ad}</div>
                <div className="text-[11px] text-slate-500">{m.not}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Seviye seçimi */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Seviye</span>
            {ilkKezMi && <span className="text-[11px] text-cyan-300">Isınma ile başlıyorsun</span>}
          </div>
          <div className="flex flex-wrap gap-2" data-alan="seviyeler">
            {seviyeler.map((s) => {
              const kilitliMi = !acik.includes(s.anahtar);
              return (
                <button
                  key={s.anahtar}
                  data-seviye={s.anahtar}
                  data-kilitli={kilitliMi ? 'true' : undefined}
                  onClick={() => seviyeSec(s.anahtar)}
                  disabled={kilitliMi}
                  aria-pressed={seviye === s.anahtar}
                  aria-disabled={kilitliMi}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm transition ${
                    kilitliMi
                      ? 'cursor-not-allowed border-slate-800 bg-slate-900/20 text-slate-600'
                      : seviye === s.anahtar
                        ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-bold">
                    {kilitliMi && '🔒 '}
                    {s.etiket}
                  </span>
                  <span className="ml-1.5 text-[11px] text-slate-500">{s.altEtiket}</span>
                </button>
              );
            })}
          </div>
          {ilkKezMi && !kilitAciklama && (
            <p className="mt-2 text-[11px] text-slate-500">
              Isınma'da tam isabet yaptığında bir sonraki seviye açılır.
            </p>
          )}
          {kilitAciklama && (
            <p className="mt-2 text-[11px] text-amber-300/80">
              🔒 {kilitAciklama}
            </p>
          )}
        </div>

        {/* Antrenman ayarları */}
        {mod === 'antrenman' && (
          <div className="mt-6 space-y-5" data-alan="antrenman-ayar">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                Süre <span className="normal-case text-slate-600">— kısa süre daha çok puan getirir</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SURE_SECENEK.map((s) => (
                  <button
                    key={s}
                    data-sure={s}
                    onClick={() => setSure(s)}
                    aria-pressed={sure === s}
                    className={`min-h-[44px] rounded-lg border px-3 text-sm transition ${
                      sure === s
                        ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <span className="font-bold">{s} sn</span>
                    <span className="ml-1.5 text-[11px] text-slate-500">×{antrenmanCarpani(s)}</span>
                  </button>
                ))}
                {secili.antrenmanSuresiz && (
                  <button
                    data-sure={0}
                    onClick={() => setSure(0)}
                    aria-pressed={sure === 0}
                    className={`min-h-[44px] rounded-lg border px-4 text-sm transition ${
                      sure === 0
                        ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                        : 'border-slate-800 bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    Süresiz
                  </button>
                )}
              </div>
            </div>

            {/* Büyük sayı yalnızca buyukVar=true seviyelerde seçilir;
                şu an bunun dışında kalan tek seviye Isınma. */}
            {secili.anahtar !== 'cocuk' && (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                  Büyük sayı (25/50/75/100)
                </div>
                <div className="flex gap-2">
                  {[0, 1, 2].map((n) => (
                    <button
                      key={n}
                      onClick={() => setBuyukAdet(n)}
                      aria-pressed={buyukAdet === n}
                      className={`min-h-[44px] w-14 rounded-lg border text-sm transition ${
                        buyukAdet === n
                          ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                          : 'border-slate-800 bg-slate-900/40 text-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Günün Turu paneli: seri + şerit (genel, tüm seviyeleri kapsar) */}
        {mod === 'gunun' && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="seri">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Kesintisiz seri: <span className="font-bold text-cyan-300" data-alan="seri-gun">{seri}</span> gün
              </div>
              <div className="text-xs text-slate-500">Son 28 gün</div>
            </div>
            <div className="mt-3 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1" aria-hidden="true">
              {seritler.map((g) => (
                <span
                  key={g.tarih}
                  title={g.tarih}
                  className={`h-3.5 rounded-sm ${
                    g.durum === 'tam'
                      ? 'bg-cyan-300'
                      : g.durum === 'yakin'
                        ? 'bg-cyan-300/40'
                        : g.durum === 'uzak'
                          ? 'bg-slate-600'
                          : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Gerçek oyuncu sayıları — eşik üstündeyse gösterilir */}
        {mod === 'gunun' && oyuncuSayilari && (oyuncuSayilari.bugunOynayanlar || oyuncuSayilari.bugunTamIsabet) && (
          <div className="mt-4 flex flex-wrap gap-3 justify-center text-xs text-slate-500">
            {oyuncuSayilari.bugunOynayanlar && (
              <span>Bugün {oyuncuSayilari.bugunOynayanlar} kişi oynadı</span>
            )}
            {oyuncuSayilari.bugunTamIsabet && (
              <span>🎯 {oyuncuSayilari.bugunTamIsabet} kişi tam bildi</span>
            )}
          </div>
        )}

        {/* XP seviyesi — giriş yapmış kullanıcılar için */}
        {kullanici?.id && ilerleme && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="xp">
            {(() => {
              const sv = xpSeviyeHesapla(ilerleme.xp);
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-300">
                      Lv.{sv.seviye} {sv.unvan}
                    </span>
                    <span className="text-xs text-slate-500">{ilerleme.xp} XP</span>
                  </div>
                  {sv.sonrakiXp && (
                    <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-300 transition-all"
                        style={{ width: `${sv.ilerlemeYuzdesi}%` }}
                      />
                    </div>
                  )}
                  {sv.sonrakiXp && (
                    <div className="mt-1 text-[11px] text-slate-600">
                      Sonraki seviye: {sv.sonrakiXp} XP
                    </div>
                  )}
                  {ilerleme.seriGun > 0 && (
                    <div className="mt-2 text-xs text-slate-400">
                      🔥 {ilerleme.seriGun} gün seri
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Misafir uyarısı — Günün Turu'nda giriş yapmamış kullanıcıya */}
        {mod === 'gunun' && !kullanici && !kilitli && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-center">
            <p className="text-xs text-slate-400">
              Giriş yaparsan bugünkü turun lige işler.{' '}
              <button
                onClick={() => onGirisAc?.()}
                className="font-bold text-cyan-300 hover:underline"
              >
                Giriş yap →
              </button>
            </p>
          </div>
        )}

        {/* Başlat / kilit */}
        <div className="mt-8">
          {kilitli ? (
            <div
              data-alan="kilit"
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-center text-sm text-slate-400"
            >
              Bugünün turu <span className="font-bold text-slate-200">tamamlandı</span>. Yarın yeni tur.
            </div>
          ) : (
            <button
              data-alan="basla"
              onClick={basla}
              className="min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition hover:bg-cyan-200 active:scale-[.99]"
            >
              {mod === 'gunun' ? 'Günün Turunu Oyna' : 'Başla'}
            </button>
          )}
        </div>

        {!kaliciMi() && (
          <p className="mt-4 text-center text-xs text-amber-400/80">
            Not: Bu tarayıcıda ilerleme kaydedilemiyor; sonuçların bu oturumla sınırlı kalabilir.
          </p>
        )}

        {/* Yasal metinler footer */}
        <footer className="mt-12 pt-8 border-t border-slate-800">
          <div className="text-center space-y-2">
            <div className="text-xs text-slate-600 space-x-3">
              <Link to="/yasal/kvkk" className="hover:text-cyan-300">KVKK</Link>
              <span>•</span>
              <Link to="/yasal/gizlilik" className="hover:text-cyan-300">Gizlilik</Link>
              <span>•</span>
              <Link to="/yasal/cerez" className="hover:text-cyan-300">Çerez</Link>
              <span>•</span>
              <Link to="/yasal/kullanim-kosullari" className="hover:text-cyan-300">Koşullar</Link>
            </div>
            {kullanici && (
              <div className="text-xs text-slate-700 pt-2">
                <Link to="/yasal/hesap-sil" className="hover:text-red-400">Hesabı sil</Link>
              </div>
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}
