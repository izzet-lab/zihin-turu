/**
 * Lig.tsx — Günlük, haftalık, aylık sıralamalar + Antrenman
 * Sekmeler: Günlük / Hafta / Ay / Antrenman
 * Seviye seçici: Isınma, Normal, Zor, Usta
 * İlk 100 + kendi sıra hep görünür
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import Ikon from '../bilesenler/Ikon';
import { useNavigate } from 'react-router-dom';
import { sayiTuru } from '@tamisabet/oyun-sayi';
import IstatistikKarti from '../bilesenler/IstatistikKarti';
import RozetSeridi from '../bilesenler/RozetSeridi';
import GenelDagilim from '../bilesenler/GenelDagilim';
import {
  haftalikAnahtar,
  aylikAnahtar,
  donemKalanSn,
  kalanSureMetin,
  gunlukLig,
  genelGunlukLig,
  genelDonemLig,
  genelBugunDagilim,
  donemLig,
  antrenmanLig,
  duelloLig,
  arenaLig,
  type LigSatiri,
  type KendiDurumu,
} from '../lig-sorgu';
import { ikinciTurKazanci } from '@tamisabet/cekirdek';
import { bugun } from '../depo';
import { xpSeviyeHesapla } from '../kimlik';
import { bannerGoster, bannerKaldir } from '../reklam';
import UyelikDaveti from '../bilesenler/UyelikDaveti';
import { davetGosterilsinMi, davetKapat, davetKapatildiMi } from '../uyelik-daveti';

type Sekme = 'genel' | 'gunluk' | 'haftalik' | 'aylik' | 'duello' | 'arena' | 'antrenman';

/**
 * Genel sekmesinin kendi dönem seçicisi var.
 *
 * Günlük/Haftalık/Aylık zaten ayrı sekmeler ama onlar OYUN BAŞINA
 * tablolar. Genel sekmesine de üç sekme daha eklemek sekme çubuğunu
 * on bire çıkarırdı; dönem seçimi sekmenin içinde duruyor.
 */
type GenelDonem = 'gunluk' | 'haftalik' | 'aylik';

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

  const [sekme, setSekme] = useState<Sekme>(baslangicSekme ?? 'genel');

  // Sekmeler tek satırda yatay kayıyor; seçili olan ekran dışındaysa
  // görünür alana getiriliyor. Yoksa sağdaki sekmeyi seçtikten sonra
  // hangisinin seçili olduğu görünmüyordu.
  const sekmeSeridi = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const kap = sekmeSeridi.current;
    if (!kap) return;
    const secili = kap.querySelector<HTMLElement>(`[data-sekme="${sekme}"]`);
    secili?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [sekme]);
  const [genelDonem, setGenelDonem] = useState<GenelDonem>('gunluk');
  /** Oyuncunun bugünkü genel dağılımı — çifte tur çağrısı için. */
  const [bugunDagilim, setBugunDagilim] = useState<{ sayiPuan: number; kelimePuan: number } | null>(null);
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
          : // Genelin dönemi kendi seçicisinden geliyor.
            sekme === 'genel'
            ? genelDonem
            : // Düello ve arenanın dönemi yok (derece ve madalya birikerek
              // gider); sayaç gösterilmiyor, buradaki değer kullanılmıyor.
              sekme === 'duello' || sekme === 'arena'
              ? 'gunluk'
              : sekme,
      ),
    [sekme, genelDonem],
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

      if (sekme === 'genel') {
        // Hesap veritabanında: seviye ağırlığı ve çifte tur bonusu
        // tabloya yazılmış halde geliyor (kural 2).
        result =
          genelDonem === 'gunluk'
            ? await genelGunlukLig(tarih, oyuncuId)
            : await genelDonemLig(
                genelDonem === 'haftalik' ? 'hafta' : 'ay',
                genelDonem === 'haftalik' ? haftalikAnahtar() : aylikAnahtar(),
                oyuncuId,
              );
      } else if (sekme === 'gunluk') {
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
  }, [sekme, seviye, oyun, oyuncuId, genelDonem]);

  /*
   * ÇİFTE TUR ÇAĞRISI İÇİN BUGÜNKÜ DAĞILIM
   *
   * Tablodaki kendi satırına bakmak yetmiyor: oyuncu ilk 100'e
   * girmemiş olabilir, hiç oynamamış da olabilir. Çağrının her iki
   * durumda da çıkması gerekiyor, bu yüzden dağılım ayrı okunuyor.
   */
  useEffect(() => {
    if (!oyuncuId || sekme !== 'genel') {
      setBugunDagilim(null);
      return;
    }
    let iptal = false;
    genelBugunDagilim(oyuncuId, bugun()).then((d) => {
      if (!iptal) setBugunDagilim({ sayiPuan: d.sayiPuan, kelimePuan: d.kelimePuan });
    });
    return () => {
      iptal = true;
    };
  }, [oyuncuId, sekme, genelDonem]);

  return (
    <main className="zt-ekran min-h-dvh zt-kagit zt-metin px-5 py-8">
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
            className="mb-3 -ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-bold zt-vurgu-metin"
          >
            ← Geri
          </button>
          <h1 className="text-2xl font-black zt-metin mb-1">Sıralamalar</h1>
          {/* Açıklama seçili sekmeye göre değişir. Antrenman'ın
              "çalışkanlık tablosu" notu yalnızca o sekmede geçerli. */}
          <p className="text-xs zt-metin-soluk" data-alan="sekme-aciklama">
            {sekme === 'genel' &&
              'İki oyunun toplamı. Seviye ağırlıklı, çifte turda %25 bonus.'}
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

          {/*
            HANGİ TABLOYA BAKIYORUM?
            Oyun ve seviye seçicileri aşağıda ayrı ayrı duruyordu;
            listeye bakarken hangi oyunun tablosu olduğu görünmüyordu.
            Başlığın hemen altında tek satırlık bir künye var artık.
          */}
          <p className="zt-etiket zt-vurgu-metin mt-2 text-[11px]" data-alan="tablo-kunyesi">
            {sekme === 'genel'
              ? 'Sayı + Kelime · tüm seviyeler'
              : sekme === 'duello' || sekme === 'arena'
                ? 'Sayı ve Kelime birlikte'
                : `${oyun === 'kelime' ? 'Kelime Turu' : 'Sayı Turu'} · ${
                    seviyeler.find((s) => s.anahtar === seviye)?.etiket ?? seviye
                  }`}
          </p>
        </header>

        {/* ÖNCE KENDİ SAYILARIN — "kim önde" tablolarından önce "ben ne
            yaptım". Misafirde boş döner, bir şey çizilmez. */}
        <IstatistikKarti oyuncuId={oyuncuId} />
        <RozetSeridi oyuncuId={oyuncuId} />

        {/*
          SEKMELER TEK SATIR, YATAY KAYAR.

          Önce üçlü ızgaraydı. Sekme sayısı yediye çıkınca 3+3+1
          diziliyor ve "Antrenman" tek başına bir satırda kalıyordu —
          hem çirkin hem de son sekme kazara bir başlık gibi duruyordu.
          Izgarayı büyütmek 360px'te sekmeleri kesiyor (kural 10).

          Tek satır + yatay kaydırma ikisini de çözüyor: sekme sayısı
          ileride değişse bile düzen bozulmuyor. Seçili sekme
          `scrollIntoView` ile görünür alana kaydırılıyor, yoksa
          sağdaki sekmeler seçiliyken ekran dışında kalıyordu.
        */}
        <div
          ref={sekmeSeridi}
          className="zt-sekme-serit mb-6 flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Sıralama türü"
        >
          {(
            [
              // GENEL BAŞTA: platformun ana sıralaması bu.
              { k: 'genel', ad: 'Genel', simge: 'kupa' },
              { k: 'gunluk', ad: 'Günlük' },
              { k: 'haftalik', ad: 'Haftalık' },
              { k: 'aylik', ad: 'Aylık' },
              { k: 'duello', ad: 'Düello', simge: 'duello' },
              // Arena istenen sekme sırasında yazmıyordu; silmek yerine
              // yerinde bırakıldı — çalışan bir tabloyu sessizce
              // kaldırmak istenmiş olamaz.
              { k: 'arena', ad: 'Arena', simge: 'arena' },
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
              className={`min-h-[48px] shrink-0 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-bold transition ${
                sekme === s.k
                  ? 'zt-vurgu-cizgi zt-vurgu-yuzey zt-vurgu-metin'
                  : 'zt-cizgi zt-yuzey zt-metin'
              }`}
            >
              {'simge' in s && <Ikon ad={s.simge} boyut={14} className="mr-1.5 -mt-0.5" />}
              {s.ad}
            </button>
          ))}
        </div>

        {/* OYUN SEÇİCİ — iki oyunun tabloları ayrı.
            Düello ve arena yalnızca sayı turunda olduğu için o
            sekmelerde gösterilmiyor. */}
        {/*
          DÜELLO VE ARENA İKİ OYUNU BİRLİKTE SAYIYOR.
          Derece ve madalya tabloları oyuna göre ayrılmıyor: aynı
          oyuncunun kelime maçı da sayı maçı da aynı dereceye işliyor.
          Önceden burada hiçbir şey yazmıyordu ve oyuncu hangi oyunun
          tablosuna baktığını bilmiyordu.
        */}
        {/* GENEL — kendi dönem seçicisi.
            Sekme çubuğunda Günlük/Haftalık/Aylık zaten var ama onlar
            oyun başına tablolar; genelin dönemi burada seçiliyor. */}
        {sekme === 'genel' && (
          <div className="mb-6" data-alan="genel-donem-secici">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest zt-metin-soluk">
              Dönem
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { k: 'gunluk', ad: 'Bugün' },
                  { k: 'haftalik', ad: 'Bu hafta' },
                  { k: 'aylik', ad: 'Bu ay' },
                ] as const
              ).map((d) => (
                <button
                  key={d.k}
                  data-genel-donem={d.k}
                  onClick={() => setGenelDonem(d.k)}
                  aria-pressed={genelDonem === d.k}
                  className={`min-h-[44px] rounded-lg border px-2 text-sm font-bold transition ${
                    genelDonem === d.k
                      ? 'zt-vurgu-cizgi zt-vurgu-yuzey zt-vurgu-metin'
                      : 'zt-cizgi zt-yuzey zt-metin'
                  }`}
                >
                  {d.ad}
                </button>
              ))}
            </div>
            <p
              className="zt-yuzey zt-cizgi zt-metin-soluk mt-3 rounded-xl border px-4 py-3 text-xs"
              data-alan="genel-tablo-notu"
            >
              Bu tablo <strong className="zt-metin">iki oyunun toplamını</strong> sayar. Seviye
              ağırlıklı: Isınma ×0,6 · Normal ×1 · Zor ×1,4 · Usta ×1,8. Aynı gün iki turu da
              bitirene toplamın <strong className="zt-metin">%25'i bonus</strong>. Antrenman bu
              tabloya işlemez.
            </p>
          </div>
        )}

        {(sekme === 'duello' || sekme === 'arena') && (
          <p
            className="zt-yuzey zt-cizgi zt-metin-soluk mb-6 rounded-xl border px-4 py-3 text-xs"
            data-alan="ortak-tablo-notu"
          >
            Bu tablo <strong className="zt-metin">iki oyunu birlikte</strong> sayar: sayı turu
            düellosu da kelime turu düellosu da aynı dereceye işler.
          </p>
        )}

        {sekme !== 'duello' && sekme !== 'arena' && sekme !== 'genel' && (
          <div className="mb-6" data-alan="oyun-secici">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest zt-metin-soluk">
              Oyun
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { k: 'sayi', ad: 'Sayı Turu' },
                  { k: 'kelime', ad: 'Kelime Turu', simge: 'kelime' },
                ] as const
              ).map((o) => (
                <button
                  key={o.k}
                  data-oyun={o.k}
                  onClick={() => setOyun(o.k)}
                  aria-pressed={oyun === o.k}
                  className={`min-h-[48px] rounded-lg border px-2 text-sm font-bold transition ${
                    oyun === o.k
                      ? 'zt-vurgu-cizgi zt-vurgu-yuzey zt-vurgu-metin'
                      : 'zt-cizgi zt-yuzey zt-metin'
                  }`}
                >
                  {'simge' in o && <Ikon ad={o.simge} boyut={15} className="mr-1.5 -mt-0.5" />}
                  {o.ad}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seviye seçimi — düelloda yok: derece seviyeden bağımsız. */}
        {sekme !== 'duello' && sekme !== 'arena' && sekme !== 'genel' && (
        <div className="mb-6" data-alan="seviye-secici">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest zt-metin-soluk">Seviye</div>
          <div className="flex flex-wrap gap-2">
            {seviyeler.map((s) => (
              <button
                key={s.anahtar}
                onClick={() => setSeviye(s.anahtar)}
                aria-pressed={seviye === s.anahtar}
                className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                  seviye === s.anahtar
                    ? 'zt-vurgu-cizgi zt-vurgu-yuzey zt-vurgu-metin'
                    : 'zt-cizgi zt-yuzey zt-metin'
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
                ? 'font-bold zt-odul-yazi'
                : 'zt-metin-soluk'
            }`}
          >
            {/*
              ESKİDEN "saat başında güncellenir" yazıyordu — DOĞRU DEĞİLDİ.
              Tetikleyici tabloyu tur yazıldığı anda güncelliyor; saatlik
              bir önbellek hiç olmadı. Yanlış bilgi, puanını hemen
              göremeyen oyuncuya "bekle" dedirtiyordu; oysa görmüyorsa
              gerçekten bir sorun vardı.
            */}
            {sekme === 'gunluk' && 'Günün en iyi turun sayılır — puanın anında işlenir'}
            {sekme === 'haftalik' &&
              (sonGun ? `Son gün — ${kalanMetin} kaldı` : `Hafta pazartesi başlar — ${kalanMetin} kaldı`)}
            {sekme === 'aylik' &&
              (sonGun ? `Son gün — ${kalanMetin} kaldı` : `Ay sonuna — ${kalanMetin} kaldı`)}
            {sekme === 'antrenman' &&
              (sonGun ? `Son gün — ${kalanMetin} kaldı` : `Haftalık sıfırlanır — ${kalanMetin} kaldı`)}
          </div>
        )}

        {/* Yükleniyor */}
        {yukleniyor && (
          <div className="text-center zt-metin-soluk py-8">
            <div className="inline-block w-4 h-4 border-2 zt-vurgu-cizgi border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm">Sıralama yükleniyor...</p>
          </div>
        )}

        {/* Sıralama tablosu */}
        {!yukleniyor && satirlar.length > 0 && (
          <div className="space-y-3">
            {satirlar.map((s, satirSira) => {
              const sv = xpSeviyeHesapla(s.xp ?? 0);
              return (
              <div
                key={`${s.sira}`}
                data-alan="lig-satir"
                data-benim={s.benimMi ? '1' : undefined}
                // Satırlar sırayla belirir; ilk on satırdan sonra
                // gecikme büyümüyor, yoksa liste yavaş doluyor.
                style={{ ['--zt-sira' as string]: String(Math.min(satirSira, 10)) }}
                className={`zt-satir-gir flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  s.benimMi
                    ? 'zt-vurgu-cizgi zt-vurgu-yuzey zt-vurgu-halka'
                    : 'zt-cizgi zt-yuzey'
                }`}
              >
                {/* İlk üçte madalya, sonrasında sıra numarası */}
                {/* İlk üç gerçek metal tonunda madeni para; emoji her
                    telefonda başka çiziliyordu ve markanın parçası
                    olmuyordu. */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    s.sira <= 3
                      ? ['zt-metal-altin', 'zt-metal-gumus', 'zt-metal-bronz'][s.sira - 1]!
                      : 'text-sm font-bold zt-metin-soluk'
                  }`}
                >
                  {s.sira}
                </div>

                {/* Baş harf dairesi — rakip kartındakiyle aynı biçim */}
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    s.benimMi ? 'zt-vurgu-yuzey zt-vurgu-metin' : 'zt-ayirac zt-metin'
                  }`}
                >
                  {s.kullaniciAdi.trim().charAt(0).toLocaleUpperCase('tr')}
                </span>

                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate font-bold ${s.benimMi ? 'zt-vurgu-metin' : 'zt-metin'}`}
                  >
                    {s.kullaniciAdi}
                    {s.benimMi && <span className="ml-1 text-xs zt-vurgu-metin">(sen)</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] zt-metin-soluk">
                    <span className="rounded zt-ayirac px-1.5 py-0.5 font-bold zt-metin-soluk">
                      Lv.{sv.seviye} {sv.unvan}
                    </span>
                    {sekme === 'duello' && s.galibiyet !== undefined && (
                      <span>
                        {s.galibiyet}–{s.maglubiyet} · %{s.kazanmaYuzdesi} kazanma
                      </span>
                    )}
                    {sekme === 'arena' && s.altin !== undefined && (
                      <span className="flex items-center gap-2 tabular-nums">
                        {(
                          [
                            ['zt-metal-altin', s.altin],
                            ['zt-metal-gumus', s.gumus],
                            ['zt-metal-bronz', s.bronz],
                          ] as const
                        ).map(([sinif, adet]) => (
                          <span key={sinif} className="flex items-center gap-1">
                            <span className={`${sinif} h-2.5 w-2.5 rounded-full`} aria-hidden="true" />
                            {adet}
                          </span>
                        ))}
                        <span>· {s.arenaSayisi} arena</span>
                      </span>
                    )}
                    {sekme !== 'duello' && sekme !== 'arena' && s.gunSayisi !== undefined && (
                      <span>
                        {sekme === 'antrenman' ? `${s.gunSayisi} tur` : `${s.gunSayisi} gün oynadı`}
                      </span>
                    )}
                  </div>

                  {/* DAĞILIM — toplam tek başına kimin dengeli olduğunu
                      söylemiyor; bu tablonun bütün amacı o. */}
                  {sekme === 'genel' && s.sayiPuan !== undefined && (
                    <div className="mt-2">
                      <GenelDagilim
                        sayiPuan={s.sayiPuan}
                        kelimePuan={s.kelimePuan ?? 0}
                        bonus={s.bonus}
                      />
                    </div>
                  )}

                  {/* TEK OYUN OYNAYANA ÇAĞRI — yalnızca kendi satırında.
                      Başkasının satırında çıkması anlamsız olurdu. */}
                  {sekme === 'genel' && s.benimMi && genelDonem === 'gunluk' && (
                    <TekOyunCagrisi
                      sayiPuan={s.sayiPuan ?? 0}
                      kelimePuan={s.kelimePuan ?? 0}
                      gecis={gecis}
                    />
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-bold zt-vurgu-metin">{s.puan}</div>
                  {sekme === 'duello' && (
                    <div className="text-[10px] zt-metin-soluk">derece</div>
                  )}
                  {sekme === 'arena' && (
                    <div className="text-[10px] zt-metin-soluk">puan</div>
                  )}
                </div>
              </div>
              );
            })}

            {/* Kendi sırası */}
            {oyuncuId && kendi && kendi.sira > satirlar.length && (
              <>
                <div className="text-center text-xs zt-metin-soluk py-2">⋮</div>
                <div className="flex items-center gap-3 rounded-lg border zt-vurgu-cizgi zt-vurgu-yuzey px-4 py-3 zt-vurgu-halka">
                  <div className="w-8 text-center font-bold zt-vurgu-metin text-sm">
                    {kendi.sira}
                  </div>
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full zt-vurgu-yuzey text-sm font-black zt-vurgu-metin"
                  >
                    S
                  </span>
                  <div className="flex-1">
                    <div className="font-bold zt-vurgu-metin">Sen</div>
                    <div className="text-[11px] zt-metin-soluk">listenin dışındasın</div>
                    {/* İlk 100'ün dışındaki oyuncu da dağılımını ve
                        çağrıyı görmeli; satırı listede olmadığı için
                        dağılım ayrı okunuyor. */}
                    {sekme === 'genel' && bugunDagilim && genelDonem === 'gunluk' && (
                      <>
                        <div className="mt-2">
                          <GenelDagilim
                            sayiPuan={bugunDagilim.sayiPuan}
                            kelimePuan={bugunDagilim.kelimePuan}
                          />
                        </div>
                        <TekOyunCagrisi
                          sayiPuan={bugunDagilim.sayiPuan}
                          kelimePuan={bugunDagilim.kelimePuan}
                          gecis={gecis}
                        />
                      </>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold zt-vurgu-metin">{kendi.puan}</div>
                    {sekme === 'duello' && <div className="text-[10px] zt-metin-soluk">derece</div>}
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
            className="rounded-2xl border zt-cizgi zt-yuzey px-5 py-8 text-center"
            data-alan="bos-durum"
          >
            <Ikon
              ad={
                sekme === 'duello'
                  ? 'duello'
                  : sekme === 'arena'
                    ? 'kupa'
                    : sekme === 'antrenman'
                      ? 'antrenman'
                      : 'bayrak'
              }
              boyut={34}
              className="zt-metin-soluk"
            />
            <p className="mt-3 text-sm font-bold zt-metin">
              {sekme === 'duello' && 'Henüz düello oynanmamış.'}
              {sekme === 'arena' && 'Henüz arena oynanmamış.'}
              {sekme === 'antrenman' && 'Bu hafta bu seviyede kimse antrenman yapmadı.'}
              {sekme === 'genel' && 'Genel sıralama bu dönemde boş.'}
              {(sekme === 'gunluk' || sekme === 'haftalik' || sekme === 'aylik') &&
                'Bu seviyede ilk sen ol.'}
            </p>
            <p className="mt-1 text-xs zt-metin-soluk">
              {sekme === 'duello' && 'İlk maçı sen yap.'}
              {sekme === 'arena' && 'İlk podyum senin olsun.'}
              {sekme === 'antrenman' && 'İlk turu sen oyna, tablo seninle açılsın.'}
              {sekme === 'genel' && 'İki turu da oyna; toplamın bonusla birlikte buraya yazılsın.'}
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
                // Genel tabloda oyun seçici yok; Günün Turu'na gider.
                else if (sekme === 'genel') gecis('/?mod=gunun');
                else if (oyun === 'kelime') gecis(`/kelime?seviye=${seviye}`);
                else if (sekme === 'antrenman') gecis('/?mod=antrenman');
                else gecis('/?mod=gunun');
              }}
              className="mt-5 min-h-[52px] w-full rounded-xl zt-dugme text-sm font-black zt-metin "
            >
              {sekme === 'duello' && 'Düello başlat'}
              {sekme === 'arena' && 'Arena başlat'}
              {sekme === 'antrenman' && (oyun === 'kelime' ? 'Kelime antrenmanı yap' : 'Antrenman yap')}
              {sekme === 'genel' && 'Günün Turunu oyna'}
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

/**
 * TekOyunCagrisi — genel tabloda bir oyunu hiç oynamayana çağrı.
 *
 * NEDEN RAKAMLA
 * "Kelime turunu da oyna" demek bir şey anlatmıyor. Kaç puan
 * kazanacağını söylemek anlatıyor: eşit güçte ikinci bir tur toplamı
 * 2,5 katına çıkarıyor (kendi puanı + aynısı + %25 bonus). Hesap
 * `cekirdek/lig.ts` içinde, tablonun kendisiyle aynı kuraldan
 * besleniyor.
 *
 * Her iki yön de geçerli: kelime oynayıp sayı oynamayana da çıkıyor.
 */
function TekOyunCagrisi({
  sayiPuan,
  kelimePuan,
  gecis,
}: {
  sayiPuan: number;
  kelimePuan: number;
  gecis: (yol: string) => void;
}) {
  const eksik: 'sayi' | 'kelime' | null =
    sayiPuan > 0 && kelimePuan === 0 ? 'kelime' : kelimePuan > 0 && sayiPuan === 0 ? 'sayi' : null;
  if (!eksik) return null;

  const mevcut = eksik === 'kelime' ? sayiPuan : kelimePuan;
  const kazanc = ikinciTurKazanci(mevcut);

  return (
    <button
      onClick={() => gecis(eksik === 'kelime' ? '/kelime?mod=gunun' : '/?mod=gunun')}
      data-alan="tek-oyun-cagrisi"
      data-eksik={eksik}
      className="zt-odul-yuzey mt-2 flex min-h-[44px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-[11px] zt-odul-yazi"
    >
      <Ikon ad={eksik === 'kelime' ? 'kelime' : 'sayi'} boyut={15} className="shrink-0" />
      <span>
        <strong>{eksik === 'kelime' ? 'Kelime' : 'Sayı'} turunu da oyna</strong> — bugünkü genel
        puanın <strong>+{kazanc}</strong> artabilir.
      </span>
    </button>
  );
}
