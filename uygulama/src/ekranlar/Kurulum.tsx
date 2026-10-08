/**
 * Kurulum.tsx — Ana ekran.
 *
 * NEDEN YENİDEN KURULDU (8 Ekim 2026)
 * Ekran bir menüye dönüşmüştü: beş mod kartı, zorluk, süre, büyük sayı,
 * seri ve XP aynı sayfada alt alta. En kötüsü, "Zorluk" yalnızca Günün
 * Turu ile Antrenman'ı ilgilendirdiği hâlde Düello ve Arena kartlarının
 * ALTINDA duruyordu; oyuncu hangi ayarın neye ait olduğunu anlayamıyordu.
 *
 * Yeni yapı:
 *   1. Günün Turu — tek baskın kart. Günlük ritüel, ana eylem.
 *   2. 2×2 ızgara — Antrenman, Düello, Arena, Kelime Turu. Hepsi aynı
 *      görsel ağırlıkta ve TEK vurgu renginde. Üç ayrı renk (cyan, sarı,
 *      yeşil) kullanılmıyor: sarı bu uygulamada uyarı ve reklam rengi,
 *      mod kartında kullanmak o anlamı bozuyor.
 *   3. Seri şeridi ve XP kartı en altta.
 *
 * Zorluk ve süre ana ekrandan kalktı. Her mod kendi seviyesini KENDİ
 * ekranında seçiyor — Düello ve Arena zaten öyle yapıyordu; Günün Turu
 * ve Antrenman için burada iki alt ekran var.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Seviye } from '@tamisabet/cekirdek';
import { antrenmanCarpani } from '@tamisabet/oyun-sayi';
import {
  gunlukOynandiMiSunucu,
  ilerlemeOku,
  sunucudanGeriYukle,
  xpSeviyeHesapla,
  type OyuncuIlerleme,
} from '../kimlik';
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
import SeviyeIzgara from '../bilesenler/SeviyeIzgara';

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
  /** Hangi alt ekranla açılacağı. "Ayarlar" Antrenman sonucundan
   * geldiğinde oyuncuyu ana ekrana sıçratmamak için kullanılır. */
  baslangicMod?: Mod;
  /** Giriş yapmış kullanıcı; null ise misafir. */
  kullanici?: { ad: string; id?: string } | null;
  /** Giriş ekranını açar. */
  onGirisAc?: () => void;
  /** Düello ekranına geçer. */
  onDuello?: (seviye: string) => void;
  /** Arena ekranına geçer. */
  onArena?: (seviye: string) => void;
  /** Kelime turuna geçer. */
  onKelime?: () => void;
  /** Çıkış yapar. */
  onCikisYap?: () => void;
}

// Risk çarpanı yalnızca bu dört süre için tanımlı (bkz. oyun-sayi/antrenmanCarpani).
const SURE_SECENEK = [90, 60, 30, 15];

/** Hangi ekrandayız? Ana ekran bir menü değil; alt ekranlar ayrı. */
type Ekran = 'ana' | 'gunun' | 'antrenman';

export default function Kurulum({
  seviyeler,
  onBasla,
  baslangicMod,
  kullanici,
  onGirisAc,
  onDuello,
  onArena,
  onKelime,
}: Props) {
  const modunEkrani = (m?: Mod): Ekran =>
    m === 'antrenman' ? 'antrenman' : m === 'gunun' ? 'gunun' : 'ana';

  const [ekran, setEkran] = useState<Ekran>(() => modunEkrani(baslangicMod));

  // `baslangicMod` sonradan da değişebiliyor: sıralamalardaki boş durum
  // daveti ve bildirime dokunma, Kurulum zaten çizildikten SONRA modu
  // ayarlıyor. useState yalnızca ilk çizimde okur; bu efekt olmazsa
  // davet ana ekranda kalıyordu.
  useEffect(() => {
    setEkran(modunEkrani(baslangicMod));
    // modunEkrani saf; yalnızca mod değişince çalışması isteniyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baslangicMod]);
  const [kilitAciklama, setKilitAciklama] = useState<string | null>(null);

  // Marka değişikliğinden sonra yerel ilerleme boş gelebiliyor (yeni
  // alan adı = yeni tarayıcı deposu). Üyenin verisi sunucuda; giriş
  // yapılmışsa geri yükleniyor. Bir şey geri geldiyse ekran yenileniyor.
  const [geriYuklendi, setGeriYuklendi] = useState(0);

  // `geriYuklendi` bilerek bağımlılık: sunucudan veri geldiğinde depo
  // yeniden okunsun, ekran eski boş hâlinde kalmasın.
  const il = useMemo(() => oku(), [geriYuklendi]);
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
      sunucudanGeriYukle(kullanici.id).then((degisti) => {
        if (degisti) setGeriYuklendi((n) => n + 1);
      });
    } else {
      setSunucuKilitli(null);
      setIlerleme(null);
    }
  }, [kullanici?.id]);

  const [oyuncuSayilari, setOyuncuSayilari] = useState<{
    bugunOynayanlar: number | null;
    bugunTamIsabet: number | null;
  } | null>(null);

  useEffect(() => {
    oyuncuSayilariOku(bugun()).then(setOyuncuSayilari);
  }, []);

  // Antrenman ayarları hatırlanır: uygulama kapatılıp açılsa bile son
  // kullanılan seviye/süre/büyük sayı varsayılan gelir.
  const kayitliAyar = sonAntrenmanAyariOku();
  const kayitliGecerliMi = !!kayitliAyar && acik.includes(kayitliAyar.seviye);

  const [seviye, setSeviye] = useState<string>(() =>
    kayitliGecerliMi ? kayitliAyar!.seviye : acik.includes('normal') ? 'normal' : acik[acik.length - 1]!,
  );
  const [sure, setSure] = useState<number>(() => (kayitliGecerliMi ? kayitliAyar!.sure : 90));
  const [buyukAdet, setBuyukAdet] = useState<number>(() => (kayitliGecerliMi ? kayitliAyar!.buyukAdet : 2));

  const secili = seviyeler.find((s) => s.anahtar === seviye) ?? seviyeler[0]!;
  const gun = bugun();

  // Günün Turu kilidi: giriş yapmış kullanıcıda sunucudan, misafirde depodan.
  const kilitli = kullanici?.id ? sunucuKilitli === true : gunlukKilitli(gun, il);
  const seritler = useMemo(() => serit(gun, 28, il), [gun, il]);
  const seri = il.seri.gun;

  function seviyeSec(anahtar: string) {
    if (!acik.includes(anahtar)) {
      const idx = seviyeler.findIndex((s) => s.anahtar === anahtar);
      const onceki = idx > 0 ? seviyeler[idx - 1]!.etiket : 'önceki seviye';
      setKilitAciklama(`${onceki}'de tam isabet yap, ${seviyeler[idx]!.etiket} açılsın.`);
      return;
    }
    setKilitAciklama(null);
    setSeviye(anahtar);
  }

  function basla(mod: Mod) {
    if (mod === 'gunun' && kilitli) return;
    // Günün Turu herkese aynı koşul: süre seviyeden gelir, büyük sayı sabittir.
    const etkinSure = mod === 'gunun' ? secili.sure : sure;
    const etkinBuyuk = mod === 'gunun' ? 2 : buyukAdet;
    onBasla({ mod, seviye, seviyeEtiket: secili.etiket, sure: etkinSure, buyukAdet: etkinBuyuk });
  }

  /* ----------------------------------------------------------------- */
  /* Her ekranın altında duran ortak parçalar                           */
  /* ----------------------------------------------------------------- */

  const seriKarti = (
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="seri">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Kesintisiz seri:{' '}
          <span className="font-bold text-cyan-300" data-alan="seri-gun">
            {seri}
          </span>{' '}
          gün
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
      {/* Misafirin serisi ve XP'si yok — kayıp burada, sayacın yanında
          söylenir. Genel bir vaat değil, oyuncunun kendi serisi. */}
      {!kullanici && (
        <button
          onClick={() => onGirisAc?.()}
          data-alan="seri-misafir-notu"
          className="zt-dokunma-alani mt-3 block w-full text-left text-[11px] text-amber-300/80 hover:text-amber-200"
        >
          {seri > 0
            ? `${seri} günlük serin kaydedilmiyor — üye ol.`
            : 'Serin kaydedilmiyor — üye ol.'}
        </button>
      )}
    </div>
  );

  const xpKarti =
    kullanici?.id && ilerleme ? (
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="xp">
        {(() => {
          const sv = xpSeviyeHesapla(ilerleme.xp);
          return (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-300">
                  Lv.{sv.seviye} {sv.unvan}
                </span>
                <span className="text-xs text-slate-500">{ilerleme.xp} XP</span>
              </div>
              {sv.sonrakiXp && (
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-300 transition-all"
                    style={{ width: `${sv.ilerlemeYuzdesi}%` }}
                  />
                </div>
              )}
              {sv.sonrakiXp && (
                <div className="mt-1 text-[11px] text-slate-600">Sonraki seviye: {sv.sonrakiXp} XP</div>
              )}
              {ilerleme.seriGun > 0 && (
                <div className="mt-2 text-xs text-slate-400">🔥 {ilerleme.seriGun} gün seri</div>
              )}
            </>
          );
        })()}
      </div>
    ) : null;

  const kaliciUyarisi = !kaliciMi() ? (
    <p className="mt-4 text-center text-xs text-amber-400/80">
      Not: Bu tarayıcıda ilerleme kaydedilemiyor; sonuçların bu oturumla sınırlı kalabilir.
    </p>
  ) : null;

  /* ----------------------------------------------------------------- */
  /* Alt ekran: Günün Turu                                              */
  /* ----------------------------------------------------------------- */

  if (ekran === 'gunun') {
    return (
      <Kabuk>
        <GeriDugmesi
          onGeri={() => {
            setKilitAciklama(null);
            setEkran('ana');
          }}
        />
        <h1 className="text-2xl font-black leading-none text-white">Günün Turu</h1>
        <p className="mt-1 text-sm text-slate-400">
          Herkes bugün aynı bulmacayı oynuyor. Seviye başına günde bir hak.
        </p>

        {kilitli ? (
          <div
            data-alan="kilit"
            className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-center text-sm text-slate-400"
          >
            Bugünün turu <span className="font-bold text-slate-200">tamamlandı</span>. Yarın yeni tur.
          </div>
        ) : (
          <>
            <div className="mt-6">
              <SeviyeIzgara
                seviyeler={seviyeler}
                acik={acik}
                secili={seviye}
                onSec={seviyeSec}
                ilkKezMi={ilkKezMi}
                kilitAciklama={kilitAciklama}
              />
            </div>

            {!kullanici && (
              <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-center">
                <p className="text-xs text-slate-400">
                  Giriş yaparsan bugünkü turun lige işler.{' '}
                  <button
                    onClick={() => onGirisAc?.()}
                    className="zt-dokunma-satirici font-bold text-cyan-300 hover:underline"
                  >
                    Giriş yap →
                  </button>
                </p>
              </div>
            )}

            <button
              data-alan="basla"
              onClick={() => basla('gunun')}
              className="mt-8 min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition hover:bg-cyan-200 active:scale-[.99]"
            >
              Günün Turunu Oyna
            </button>
          </>
        )}

        {seriKarti}
        {xpKarti}
        {kaliciUyarisi}
      </Kabuk>
    );
  }

  /* ----------------------------------------------------------------- */
  /* Alt ekran: Antrenman                                               */
  /* ----------------------------------------------------------------- */

  if (ekran === 'antrenman') {
    return (
      <Kabuk>
        <GeriDugmesi
          onGeri={() => {
            setKilitAciklama(null);
            setEkran('ana');
          }}
        />
        <h1 className="text-2xl font-black leading-none text-white">Antrenman</h1>
        <p className="mt-1 text-sm text-slate-400">
          İstediğin kadar oyna. Beceri ligine işlemez, çalışkanlık tablosuna işler.
        </p>

        <div className="mt-6">
          <SeviyeIzgara
            seviyeler={seviyeler}
            acik={acik}
            secili={seviye}
            onSec={seviyeSec}
            ilkKezMi={ilkKezMi}
            kilitAciklama={kilitAciklama}
          />
        </div>

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

        <button
          data-alan="basla"
          onClick={() => basla('antrenman')}
          className="mt-8 min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 transition hover:bg-cyan-200 active:scale-[.99]"
        >
          Başla
        </button>

        {xpKarti}
        {kaliciUyarisi}
      </Kabuk>
    );
  }

  /* ----------------------------------------------------------------- */
  /* ANA EKRAN                                                          */
  /* ----------------------------------------------------------------- */

  // İkinci sıradaki dört mod. Hepsi aynı görsel ağırlıkta ve aynı
  // vurgu renginde: biri diğerinden "daha önemli" değil, seçim
  // oyuncunun o anki isteğine göre.
  const ikinciSira: { anahtar: string; ad: string; not: string; simge: string; git: () => void }[] = [
    {
      anahtar: 'antrenman',
      ad: 'Antrenman',
      not: 'İstediğin kadar oyna',
      simge: '♾️',
      git: () => setEkran('antrenman'),
    },
  ];
  if (onDuello) {
    ikinciSira.push({
      anahtar: 'duello',
      ad: 'Düello',
      not: 'Rakiple 5 tur',
      simge: '⚔️',
      git: () => onDuello(seviye),
    });
  }
  if (onArena) {
    ikinciSira.push({
      anahtar: 'arena',
      ad: 'Arena',
      not: '5 kişi aynı anda',
      simge: '⚡',
      git: () => onArena(seviye),
    });
  }
  if (onKelime) {
    ikinciSira.push({
      anahtar: 'kelime',
      ad: 'Kelime Turu',
      not: 'Harflerden en uzun kelime',
      simge: '📖',
      git: () => onKelime(),
    });
  }

  return (
    <Kabuk>
      {/* pr-12: sabit hamburger menü sağ üstte duruyor. */}
      <header className="relative flex items-center gap-3 pr-12">
        <img src="/ikon/ikon-192.png" alt="" className="h-9 w-9 rounded-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black leading-none text-white">Tam İsabet</h1>
          {/* Alt başlık platformu anlatır, tek bir oyunu değil: artık
              altında kelime oyunu da var. */}
          <p className="text-xs text-slate-500">Türkçe zihin oyunları — sayılar ve kelimeler.</p>
        </div>
      </header>

      {/* GÜNÜN TURU — tek baskın kart. Günlük ritüel, ana eylem. */}
      <button
        data-alan="gunun-git"
        onClick={() => setEkran('gunun')}
        className="zt-secim mt-7 w-full rounded-2xl border-2 border-cyan-300 bg-cyan-300/15 px-5 py-5 text-left transition hover:bg-cyan-300/20 active:scale-[.99]"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-3xl">
            📅
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-black leading-none text-cyan-100">Günün Turu</div>
            <div className="mt-1 text-xs text-cyan-200/70">
              {kilitli ? 'Bugünkü turunu oynadın' : 'Herkes bugün aynı bulmacayı oynuyor'}
            </div>
          </div>
          <span aria-hidden="true" className="text-cyan-300">
            →
          </span>
        </div>
      </button>

      {/* İKİNCİ SIRA — 2×2, hepsi eşit ağırlıkta ve tek vurgu renginde. */}
      <div className="mt-3 grid grid-cols-2 gap-2.5" data-alan="modlar">
        {ikinciSira.map((m) => (
          <button
            key={m.anahtar}
            data-mod={m.anahtar}
            onClick={m.git}
            className="zt-secim min-h-[92px] rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-3 text-left transition hover:border-slate-600 hover:bg-slate-800/80 active:scale-[.99]"
          >
            <div className="text-xl leading-none" aria-hidden="true">
              {m.simge}
            </div>
            <div className="mt-2 font-black leading-tight text-slate-100">{m.ad}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{m.not}</div>
          </button>
        ))}
      </div>

      {/* Gerçek oyuncu sayıları — eşik üstündeyse gösterilir */}
      {oyuncuSayilari && (oyuncuSayilari.bugunOynayanlar || oyuncuSayilari.bugunTamIsabet) && (
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
          {oyuncuSayilari.bugunOynayanlar && <span>Bugün {oyuncuSayilari.bugunOynayanlar} kişi oynadı</span>}
          {oyuncuSayilari.bugunTamIsabet && <span>🎯 {oyuncuSayilari.bugunTamIsabet} kişi tam bildi</span>}
        </div>
      )}

      {/* MARKA TAŞINMASI NOTU — yalnızca misafire, yalnızca ilerlemesi
          boşsa. Uygulamanın adı ve adresi değişince tarayıcı deposu
          yeni bir kaynak altında açıldı; eski seri okunamıyor. Bu bir
          hata değil, tarayıcının güvenlik kuralı — ama oyuncu serisinin
          neden sıfırlandığını bilmezse oyunun hata yaptığını sanar.
          Üyenin verisi sunucudan geri geliyor, misafirinki gelemiyor. */}
      {!kullanici && seri === 0 && Object.keys(il.gunluk).length === 0 && (
        <div
          data-alan="marka-tasima-notu"
          className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs leading-relaxed text-slate-400"
        >
          <strong className="text-slate-300">Serin sıfır mı görünüyor?</strong> Uygulamanın adı ve
          adresi yakında değişti; tarayıcı eski ilerlemeyi yeni adrese taşıyamıyor.{' '}
          <button
            onClick={() => onGirisAc?.()}
            className="zt-dokunma-satirici font-bold text-cyan-300 hover:underline"
          >
            Giriş yaparsan
          </button>{' '}
          serin ve seviyelerin sunucudan geri gelir. Misafir oynadıysan geri getirilemiyor.
        </div>
      )}

      {seriKarti}
      {xpKarti}
      {kaliciUyarisi}
    </Kabuk>
  );
}

/** Ortak dış kabuk — arka plan ve genişlik sınırı. */
function Kabuk({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#0A0E1A] px-5 py-8 text-slate-200">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </main>
  );
}

function GeriDugmesi({ onGeri }: { onGeri: () => void }) {
  return (
    <button
      onClick={onGeri}
      data-alan="geri"
      className="zt-dokunma-alani -ml-2 mb-3 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-bold text-cyan-300 hover:bg-slate-800/60"
    >
      ← Geri
    </button>
  );
}
