/**
 * Lig.tsx — Günlük, haftalık, aylık sıralamalar + Antrenman
 * Sekmeler: Günlük / Hafta / Ay / Antrenman
 * Seviye seçici: Isınma, Normal, Zor, Usta
 * İlk 100 + kendi sıra hep görünür
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { sayiTuru } from '@tamisabet/oyun-sayi';
import IstatistikKarti from '../bilesenler/IstatistikKarti';
import RozetSeridi from '../bilesenler/RozetSeridi';
import {
  haftalikAnahtar,
  aylikAnahtar,
  donemKalanSn,
  kalanSureMetin,
  gunlukLig,
  donemLig,
  antrenmanLig,
  duelloLig,
  arenaLig,
  type LigSatiri,
  type KendiDurumu,
} from '../lig-sorgu';
import { bugun } from '../depo';
import { xpSeviyeHesapla } from '../kimlik';
import { bannerGoster, bannerKaldir } from '../reklam';
import UyelikDaveti from '../bilesenler/UyelikDaveti';
import { davetGosterilsinMi, davetKapat, davetKapatildiMi } from '../uyelik-daveti';

type Sekme = 'gunluk' | 'haftalik' | 'aylik' | 'duello' | 'arena' | 'antrenman';

interface Props {
  oyuncuId?: string; // null = misafir; kendi sırası gösterilmez
  /** Ana ekrandaki kısa sıralamadan gelen sekme. */
  baslangicSekme?: 'duello' | 'arena';
}

export default function Lig({ oyuncuId, baslangicSekme }: Props) {
  const gecis = useNavigate();

  // Misafir daveti — kapatılırsa bu oturumda bir daha çıkmaz.
  const [davetGoster, setDavetGoster] = useState(() =>
    davetGosterilsinMi({
      yer: 'lig',
      girisYapildiMi: !!oyuncuId,
      kapatildiMi: davetKapatildiMi('lig'),
    }),
  );

  // Sıralama ekranı kaydırılarak okunuyor; altta düğme yığını yok,
  // banner için uygun bir yer. Sayfadan çıkınca kaldırılır.
  useEffect(() => {
    bannerGoster('alt');
    return () => {
      bannerKaldir();
    };
  }, []);

  const [sekme, setSekme] = useState<Sekme>(baslangicSekme ?? 'gunluk');
  const [seviye, setSeviye] = useState<string>('normal');
  const [satirlar, setSatirlar] = useState<LigSatiri[]>([]);
  /**
   * Hangi oyunun tablosu? Gunluk/Haftalik/Aylik/Antrenman sekmeleri iki
   * oyun icin de var; duello ve arena yalnizca sayi turunda.
   */
  const [oyun, setOyun] = useState<'sayi' | 'kelime'>('sayi');
  const [kendi, setKendi] = useState<KendiDurumu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Düellonun dönemi yok — derece birikerek gider; sayaç gösterilmez.
  const kalanSn = useMemo(
    () =>
      donemKalanSn(
        sekme === 'antrenman'
          ? 'haftalik'
          : // Düello ve arenanın dönemi yok (derece ve madalya birikerek
            // gider); sayaç gösterilmiyor, buradaki değer kullanılmıyor.
            sekme === 'duello' || sekme === 'arena'
            ? 'gunluk'
            : sekme,
      ),
    [sekme],
  );
  const kalanMetin = kalanSureMetin(kalanSn);
  /** Son 24 saat: aciliyet hissi bugün oynamayı tetikler. */
  const sonGun = kalanSn > 0 && kalanSn <= 24 * 3600;

  /*
   * SORGU YARIŞI
   *
   * Ekran açılırken oyuncu kimliği henüz bilinmiyor (oturum asenkron
   * çözülüyor), bu yüzden ilk sorgu kimliksiz gidiyor; kimlik gelince
   * ikinci sorgu atılıyor. İki yanıt yarışa girdiğinde eski yanıt
   * yenisini ezebiliyordu — sonuç: kendi satırın vurgulanmıyor,
   * sebepsiz yere.
   *
   * Her sorguya bir sıra numarası veriliyor; yalnızca EN SON sorgunun
   * yanıtı ekrana yazılıyor.
   */
  const sonSorguRef = useRef(0);

  async function sorguYap() {
    const sira = ++sonSorguRef.current;
    setYukleniyor(true);
    try {
      const tarih = bugun();
      let result;

      if (sekme === 'gunluk') {
        result = await gunlukLig(oyun, seviye, tarih, oyuncuId);
      } else if (sekme === 'haftalik') {
        result = await donemLig('hafta', haftalikAnahtar(), oyun, seviye, oyuncuId);
      } else if (sekme === 'aylik') {
        result = await donemLig('ay', aylikAnahtar(), oyun, seviye, oyuncuId);
      } else if (sekme === 'arena') {
        // Arena madalyası seviyeden bağımsız; tek bir tablo.
        result = await arenaLig(oyuncuId);
      } else if (sekme === 'duello') {
        // Düello derecesi seviyeden bağımsız; tek bir tablo.
        result = await duelloLig(oyuncuId);
      } else {
        result = await antrenmanLig(haftalikAnahtar(), oyun, seviye, oyuncuId);
      }

      // Bu yanıt geldiğinde daha yeni bir sorgu başlamışsa yok sayılır.
      if (sira !== sonSorguRef.current) return;
      setSatirlar(result.satirlar);
      setKendi(result.kendi ?? null);
    } finally {
      if (sira === sonSorguRef.current) setYukleniyor(false);
    }
  }

  useEffect(() => {
    sorguYap();
  }, [sekme, seviye, oyun, oyuncuId]);

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Başlık */}
        <header className="mb-8 pr-12">
          {/* Yalnızca "←" işareti soluk kaldığı için fark edilmiyordu;
              etiketli ve dokunma hedefi yeterli bir düğmeye çevrildi.
              Ayrıca <a href> tam sayfa yüklemesi yapıyordu — Capacitor'da
              SPA yedeği olmadığı için bu 404 riski taşıyor. */}
          <button
            onClick={() => gecis('/')}
            data-alan="geri"
            className="mb-3 -ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-bold text-cyan-300 hover:bg-slate-800/60 hover:text-cyan-200"
          >
            ← Geri
          </button>
          <h1 className="text-2xl font-black text-white mb-1">Sıralamalar</h1>
          {/* Açıklama seçili sekmeye göre değişir. Antrenman'ın
              "çalışkanlık tablosu" notu yalnızca o sekmede geçerli. */}
          <p className="text-xs text-slate-500" data-alan="sekme-aciklama">
            {sekme === 'gunluk' && 'Bugünün turunda alınan en iyi puanlar.'}
            {sekme === 'haftalik' && 'Bu haftanın günlük en iyilerinin toplamı.'}
            {sekme === 'aylik' && 'Bu ayın günlük en iyilerinin toplamı.'}
            {sekme === 'duello' &&
              'Düello derecesi. Yalnızca gerçek rakiplere karşı oynanan maçlar sayılır.'}
            {sekme === 'arena' &&
              'Madalya tablosu. Yalnızca en az iki gerçek yarışçının olduğu arenalar sayılır.'}
            {sekme === 'antrenman' &&
              'Çalışkanlık tablosu — ne kadar çalıştığını gösterir, ne kadar iyi olduğunu değil.'}
          </p>
        </header>

        {/* ÖNCE KENDİ SAYILARIN — "kim önde" tablolarından önce "ben ne
            yaptım". Misafirde boş döner, bir şey çizilmez. */}
        <IstatistikKarti oyuncuId={oyuncuId} />
        <RozetSeridi oyuncuId={oyuncuId} />

        {/* Sekme seçimi — 5 sekme.
            Üçlü ızgara: 360px'te beş sekme yan yana sığmıyor, "Haftalık"
            kesiliyordu. İki satıra bölünüyor (kural 10). */}
        <div className="mb-6 grid grid-cols-3 gap-2" role="tablist" aria-label="Sıralama türü">
          {(
            [
              { k: 'gunluk', ad: 'Günlük' },
              { k: 'haftalik', ad: 'Haftalık' },
              { k: 'aylik', ad: 'Aylık' },
              { k: 'duello', ad: '⚔️ Düello' },
              { k: 'arena', ad: '⚡ Arena' },
              { k: 'antrenman', ad: 'Antrenman' },
            ] as const
          ).map((s) => (
            <button
              key={s.k}
              data-sekme={s.k}
              onClick={() => {
                setSekme(s.k);
                // Duello ve arena yalnizca sayi turunda var; o sekmelere
                // gecince oyun secici gizleniyor, secim de sifirlaniyor
                // ki geri donuldugunde bos tablo gorunmesin.
                if (s.k === 'duello' || s.k === 'arena') setOyun('sayi');
              }}
              aria-pressed={sekme === s.k}
              className={`min-h-[48px] rounded-lg border px-2 py-2 text-sm font-bold transition ${
                sekme === s.k
                  ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                  : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
              }`}
            >
              {s.ad}
            </button>
          ))}
        </div>

        {/* OYUN SEÇİCİ — iki oyunun tabloları ayrı.
            Düello ve arena yalnızca sayı turunda olduğu için o
            sekmelerde gösterilmiyor. */}
        {sekme !== 'duello' && sekme !== 'arena' && (
          <div className="mb-6" data-alan="oyun-secici">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              Oyun
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { k: 'sayi', ad: 'Sayı Turu' },
                  { k: 'kelime', ad: '📖 Kelime Turu' },
                ] as const
              ).map((o) => (
                <button
                  key={o.k}
                  data-oyun={o.k}
                  onClick={() => setOyun(o.k)}
                  aria-pressed={oyun === o.k}
                  className={`min-h-[48px] rounded-lg border px-2 text-sm font-bold transition ${
                    oyun === o.k
                      ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                      : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {o.ad}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seviye seçimi — düelloda yok: derece seviyeden bağımsız. */}
        {sekme !== 'duello' && sekme !== 'arena' && (
        <div className="mb-6" data-alan="seviye-secici">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Seviye</div>
          <div className="flex flex-wrap gap-2">
            {seviyeler.map((s) => (
              <button
                key={s.anahtar}
                onClick={() => setSeviye(s.anahtar)}
                aria-pressed={seviye === s.anahtar}
                className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  seviye === s.anahtar
                    ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700'
                }`}
              >
                {s.etiket}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Kalan süre — son 24 saatte vurgulu. */}
        {sekme !== 'duello' && sekme !== 'arena' && (
          <div
            data-alan="kalan-sure"
            className={`mb-6 text-center text-xs ${
              sonGun && sekme !== 'gunluk'
                ? 'font-bold text-amber-300'
                : 'text-slate-500'
            }`}
          >
            {sekme === 'gunluk' && 'Sıralama saat başında güncellenir'}
            {sekme === 'haftalik' &&
              (sonGun ? `⏳ Son gün — ${kalanMetin} kaldı` : `Hafta pazartesi başlar — ${kalanMetin} kaldı`)}
            {sekme === 'aylik' &&
              (sonGun ? `⏳ Son gün — ${kalanMetin} kaldı` : `Ay sonuna — ${kalanMetin} kaldı`)}
            {sekme === 'antrenman' &&
              (sonGun ? `⏳ Son gün — ${kalanMetin} kaldı` : `Haftalık sıfırlanır — ${kalanMetin} kaldı`)}
          </div>
        )}

        {/* Yükleniyor */}
        {yukleniyor && (
          <div className="text-center text-slate-400 py-8">
            <div className="inline-block w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm">Sıralama yükleniyor...</p>
          </div>
        )}

        {/* Sıralama tablosu */}
        {!yukleniyor && satirlar.length > 0 && (
          <div className="space-y-3">
            {satirlar.map((s) => {
              const sv = xpSeviyeHesapla(s.xp ?? 0);
              return (
              <div
                key={`${s.sira}`}
                data-alan="lig-satir"
                data-benim={s.benimMi ? '1' : undefined}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  s.benimMi
                    ? 'border-cyan-300/50 bg-cyan-300/10 ring-1 ring-cyan-300/30'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                {/* İlk üçte madalya, sonrasında sıra numarası */}
                <div className="w-7 shrink-0 text-center text-sm font-bold text-slate-500">
                  {s.sira <= 3 ? ['🥇', '🥈', '🥉'][s.sira - 1]! : `${s.sira}`}
                </div>

                {/* Baş harf dairesi — rakip kartındakiyle aynı biçim */}
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    s.benimMi ? 'bg-cyan-300/25 text-cyan-100' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {s.kullaniciAdi.trim().charAt(0).toLocaleUpperCase('tr')}
                </span>

                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate font-bold ${s.benimMi ? 'text-cyan-100' : 'text-slate-200'}`}
                  >
                    {s.kullaniciAdi}
                    {s.benimMi && <span className="ml-1 text-xs text-cyan-300">(sen)</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-bold text-slate-400">
                      Lv.{sv.seviye} {sv.unvan}
                    </span>
                    {sekme === 'duello' && s.galibiyet !== undefined && (
                      <span>
                        {s.galibiyet}–{s.maglubiyet} · %{s.kazanmaYuzdesi} kazanma
                      </span>
                    )}
                    {sekme === 'arena' && s.altin !== undefined && (
                      <span className="tabular-nums">
                        🥇{s.altin} 🥈{s.gumus} 🥉{s.bronz} · {s.arenaSayisi} arena
                      </span>
                    )}
                    {sekme !== 'duello' && sekme !== 'arena' && s.gunSayisi !== undefined && (
                      <span>
                        {sekme === 'antrenman' ? `${s.gunSayisi} tur` : `${s.gunSayisi} gün oynadı`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-bold text-cyan-300">{s.puan}</div>
                  {sekme === 'duello' && (
                    <div className="text-[10px] text-slate-600">derece</div>
                  )}
                  {sekme === 'arena' && (
                    <div className="text-[10px] text-slate-600">puan</div>
                  )}
                </div>
              </div>
              );
            })}

            {/* Kendi sırası */}
            {oyuncuId && kendi && kendi.sira > satirlar.length && (
              <>
                <div className="text-center text-xs text-slate-600 py-2">⋮</div>
                <div className="flex items-center gap-3 rounded-lg border border-cyan-300/30 bg-cyan-300/5 px-4 py-3 ring-1 ring-cyan-300/20">
                  <div className="w-8 text-center font-bold text-cyan-300 text-sm">
                    {kendi.sira}
                  </div>
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-300/25 text-sm font-black text-cyan-100"
                  >
                    S
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-cyan-200">Sen</div>
                    <div className="text-[11px] text-slate-500">listenin dışındasın</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold text-cyan-300">{kendi.puan}</div>
                    {sekme === 'duello' && <div className="text-[10px] text-slate-600">derece</div>}
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {/* BOŞ DURUM — çıkmaz sokak değil, başlangıç noktası.
            Önce ekranın ortasında tek bir gri cümle vardı ve altı
            kapkaraydı; kullanıcı burayı ölü sanıp bir daha bakmıyordu.
            Artık her sekme kendi davetini ve o moda GÖTÜREN düğmesini
            gösteriyor. */}
        {!yukleniyor && satirlar.length === 0 && (
          <div
            className="rounded-2xl border border-slate-800 bg-slate-900/40 px-5 py-8 text-center"
            data-alan="bos-durum"
          >
            <div className="text-3xl" aria-hidden="true">
              {sekme === 'duello'
                ? '⚔️'
                : sekme === 'arena'
                  ? '🏆'
                  : sekme === 'antrenman'
                    ? '♾️'
                    : '🏁'}
            </div>
            <p className="mt-3 text-sm font-bold text-slate-200">
              {sekme === 'duello' && 'Henüz düello oynanmamış.'}
              {sekme === 'arena' && 'Henüz arena oynanmamış.'}
              {sekme === 'antrenman' && 'Bu hafta bu seviyede kimse antrenman yapmadı.'}
              {(sekme === 'gunluk' || sekme === 'haftalik' || sekme === 'aylik') &&
                'Bu seviyede ilk sen ol.'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {sekme === 'duello' && 'İlk maçı sen yap.'}
              {sekme === 'arena' && 'İlk podyum senin olsun.'}
              {sekme === 'antrenman' && 'İlk turu sen oyna, tablo seninle açılsın.'}
              {(sekme === 'gunluk' || sekme === 'haftalik' || sekme === 'aylik') &&
                'Bugünün turunu oyna, adın buraya yazılsın.'}
            </p>
            <button
              data-alan="bos-durum-eylem"
              onClick={() => {
                if (sekme === 'duello') gecis(`/duello?seviye=${seviye}`);
                else if (sekme === 'arena') gecis(`/arena?seviye=${seviye}`);
                // Boş tablodaki davet, SEÇİLİ OYUNA götürmeli. Kelime
                // sekmesindeyken sayı turuna atması, oyuncuyu adını
                // yazdıramayacağı yere göndermek olurdu.
                else if (oyun === 'kelime') gecis(`/kelime?seviye=${seviye}`);
                else if (sekme === 'antrenman') gecis('/?mod=antrenman');
                else gecis('/?mod=gunun');
              }}
              className="mt-5 min-h-[52px] w-full rounded-xl bg-cyan-300 text-sm font-black text-slate-900 hover:bg-cyan-200"
            >
              {sekme === 'duello' && 'Düello başlat'}
              {sekme === 'arena' && 'Arena başlat'}
              {sekme === 'antrenman' && (oyun === 'kelime' ? 'Kelime antrenmanı yap' : 'Antrenman yap')}
              {(sekme === 'gunluk' || sekme === 'haftalik' || sekme === 'aylik') &&
                (oyun === 'kelime' ? 'Kelime turunu oyna' : 'Günün Turunu oyna')}
            </button>
          </div>
        )}

        {/*
          Misafir daveti — listenin altında.

          Liste BOŞ olsa da gösterilir: misafirin bu listede olmaması,
          listenin dolu olup olmamasından bağımsız bir eksiklik. Önce
          yalnızca dolu listenin içine konmuştu ve yeni bir seviyede
          davet hiç görünmüyordu.
        */}
        {!oyuncuId && !yukleniyor && davetGoster && (
          <UyelikDaveti
            data-alan="uyelik-daveti"
            baslik="Sen bu listede yoksun"
            aciklama="Üye ol, günün turunu oyna, yerini al."
            eylemMetni="Üye ol"
            onEylem={() => gecis('/?giris=1')}
            onKapat={() => {
              davetKapat('lig');
              setDavetGoster(false);
            }}
          />
        )}
      </div>
    </main>
  );
}

// Seviye listesi (Kurulum.tsx ile eşleşmelidir)
// Seviye listesi tek kaynaktan. İki oyunun seviye ANAHTARLARI aynı
// (cocuk/normal/zor/usta) ve bu listede yalnızca etiket gösteriliyor
// ("Isınma", "Normal"…), oyuna özgü alt bilgi değil. Bu yüzden tek
// liste yetiyor.
const seviyeler = sayiTuru.seviyeler;
