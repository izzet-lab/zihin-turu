import { useEffect, useMemo, useState } from 'react';
import type { Tur } from '@zihinturu/cekirdek';
import {
  sayiTuru,
  SEVIYELER,
  SEVIYE_LISTESI,
  ANTRENMAN_SURE_CARPANI,
  antrenmanCarpani,
  seviyeCarpani,
  nihaiPuanHesap,
  type SayiVeri,
  type JokerTip,
} from '@zihinturu/oyun-sayi';
import { kartMetni, kartDataUrl, jokerOzeti, type Kayit } from '../kart';
import { odulluReklamHazirla, odulluReklamGoster } from '../reklam';
import { nativeMi } from '../platform';
import type { Mod } from './Kurulum';
import type { OyunSonuc } from './Oyun';
import SayanSayi from '../bilesenler/SayanSayi';
import UyelikDaveti from '../bilesenler/UyelikDaveti';
import { davetGosterilsinMi, davetKapat, davetKapatildiMi } from '../uyelik-daveti';

/** Sayıyı kısa gösterir: 8 → "8", 3.75 → "3.75", 1.20 → "1.2". */
function sayiGoster(c: number): string {
  return String(Number(c.toFixed(2)));
}

/**
 * Sonucu insan diliyle söyler. Rakam ("3 fark") kimseye bir şey
 * anlatmıyordu; "yakın mı uzak mı" sorusunun cevabı seviyeye göre
 * değişir, o yüzden eşikler seviyenin kendi toleransından okunur
 * (kural 1: eşik burada yeniden tanımlanmaz).
 */
function hukumMetni(seviye: string, fark: number): string {
  if (fark === 0) return 'Tam isabet 🎯';
  const tolerans = SEVIYELER[seviye]?.tolerans;
  if (tolerans) {
    if (fark <= tolerans[0]!) return 'Çok yaklaştın';
    if (fark <= tolerans[1]!) return 'Yaklaştın';
  }
  return 'Bu sefer olmadı';
}

/**
 * Çarpanı sayı olarak göstermek ("×0.5") kimseye bir şey anlatmıyordu.
 * Bunun yerine tek cümle kurulur:
 *
 * - Çarpan 1'in üstündeyse övgü: "Kısa süre seçtin, puanın 2.5 katına
 *   çıktı."
 * - Değilse üst seviyeye davet: "Zor seviyede aynı sonuç 12 puan
 *   ederdi." Alternatif puan tahmin edilmez, aynı girdilerle oyun
 *   paketine yeniden hesaplatılır — çarpan tablosunun kopyası burada
 *   yaşamaz.
 */
function carpanCumlesi(g: {
  seviye: string;
  secilenSure: number;
  fark: number;
  kalan: number;
  toplamSure: number;
  jokerler: JokerTip[];
  puan: number;
  carpan: number;
}): string | null {
  if (g.puan <= 0) return null;

  const sCarpan = seviyeCarpani(g.seviye);
  const zCarpan = antrenmanCarpani(g.secilenSure);

  if (g.carpan > 1) {
    const kat = `puanın ${sayiGoster(g.carpan)} katına çıktı`;
    if (zCarpan > 1 && sCarpan > 1) {
      return `Zor bir seviyede kısa süre seçtin, ${kat}.`;
    }
    if (zCarpan > 1) return `Kısa süre seçtin, ${kat}.`;
    return `Üst seviyede oynadın, ${kat}.`;
  }

  // Aynı sonucun başka koşullarda kaç puan edeceğini oyun paketine sor.
  const yenidenHesapla = (seviye: string, secilenSure: number): number =>
    nihaiPuanHesap({
      seviye,
      fark: g.fark,
      kalanSaniye: g.kalan,
      toplamSaniye: g.toplamSure,
      mod: 'antrenman',
      secilenSure,
      kullanilanJokerler: g.jokerler,
    }).nihai;

  // Önce bir üst seviye.
  const sira = SEVIYE_LISTESI.findIndex((sv) => sv.anahtar === g.seviye);
  const ustSeviye = sira >= 0 ? SEVIYE_LISTESI[sira + 1] : undefined;
  if (ustSeviye) {
    const alt = yenidenHesapla(ustSeviye.anahtar, g.secilenSure);
    if (alt > g.puan) return `${ustSeviye.etiket} seviyede aynı sonuç ${alt} puan ederdi.`;
  }

  // Seviye yükseltilemiyorsa daha kısa süre öner.
  const sureler = Object.keys(ANTRENMAN_SURE_CARPANI)
    .map(Number)
    .sort((a, b) => b - a);
  const kisaSure = sureler.find((sn) => (g.secilenSure > 0 ? sn < g.secilenSure : true));
  if (kisaSure) {
    const alt = yenidenHesapla(g.seviye, kisaSure);
    if (alt > g.puan) return `${kisaSure} saniyede aynı sonuç ${alt} puan ederdi.`;
  }

  return null;
}

/**
 * Tam isabet olmayan turlarda gösterilen kısa, çaba odaklı bir söz.
 * Baskı, kaygı veya başarısızlık dili yok — yalnızca devam etmeye
 * teşvik eder. Aynı turda hep aynı söz çıkmasın diye hedef+fark
 * bilgisinden deterministik bir indeks türetilir (her turda farklı
 * ama tur tekrar açıldığında sabit kalır).
 */
/**
 * Motivasyon mesajları bağlama göre seçilir:
 * (a) Hiç hamle yapmadan bitti → cesaretlendirme
 * (b) İşlem yaptı ama uzak kaldı → "yaklaşıyorsun" tarzı
 * (c) Süre bitti (kalan=0, süreli mod) → süreyle ilgili
 * Deterministik seçim: hedef+fark'tan indeks türetilir.
 */
const MESAJ_HIC_HAMLE = [
  'Bir sonrakinde bir hamle dene, joker de var.',
  'İki taşı birleştirmek yeterli — küçük başla.',
  'Hızlı bitti ama sorun yok; bir sonrakinde zaman var.',
  'Sadece bir işlem bile puan getirir, dene.',
];

const MESAJ_UZAK_KALDI = [
  'Fena değildi. Bir dahaki turda bu farkı kapatabilirsin.',
  'Her tur bir öncekinden biraz daha fazlasını öğretir.',
  'Yaklaştın. Zincirin bir adımı farklı işleseydi olurdu.',
  'Taşları farklı sırayla denemek genelde işe yarar.',
  'Küçük farklar da ilerlemedir.',
  'Bazı turlar zor çıkar. Bu, formunla ilgili bir şey söylemez.',
  'Bir sonraki turda aynı hedefi başka bir yoldan bulabilirsin.',
  'Denemek, beklemekten her zaman daha değerli.',
  'Fark küçüldükçe zincir kurmak kolaylaşıyor, alışkanlık meselesi.',
  'Bazı hedefler ilk denemede açılmaz, bu normal.',
  'Elindeki taşlarla iyi bir kombinasyon kurmuşsun, hedef biraz uzak kalmış.',
  'İstersen bir joker ile bir dahaki turu biraz kolaylaştırabilirsin.',
  'Sayılarla kurduğun her zincir bir sonrakine zemin hazırlıyor.',
  'Devam etmek, mükemmel bitirmekten daha önemli.',
];

const MESAJ_SURE_BITTI = [
  'Süre dar geldi ama elindeki zincir fena değildi.',
  'Bir dahakinde zamana karşı daha rahat olabilirsin.',
  'Süre baskısı zor; süresiz modda pratik yapmak işe yarar.',
  'Son saniyelerde aceleye gelmiş olabilir, bir dahakinde daha erken başla.',
  'Bu turdan sonra elin ısınmış olur, bir daha dene.',
];

function motivasyonSecimi(hedef: number, fark: number, adimSayisi: number, kalan: number, sure: number): string {
  // (a) Hiç hamle yapmadı
  if (adimSayisi === 0) {
    const indeks = (hedef * 7 + fark * 3) % MESAJ_HIC_HAMLE.length;
    return MESAJ_HIC_HAMLE[indeks]!;
  }
  // (c) Süre bitti (süreli modda, kalan=0)
  if (sure > 0 && kalan === 0) {
    const indeks = (hedef * 7 + fark * 13) % MESAJ_SURE_BITTI.length;
    return MESAJ_SURE_BITTI[indeks]!;
  }
  // (b) İşlem yaptı ama uzak kaldı
  const indeks = (hedef * 7 + fark * 13) % MESAJ_UZAK_KALDI.length;
  return MESAJ_UZAK_KALDI[indeks]!;
}

interface Props {
  tur: Tur;
  /** Seviye anahtarı (cocuk/normal/zor/usta) — çarpan cümlesi için gerekli. */
  seviye: string;
  seviyeEtiket: string;
  mod: Mod;
  sure: number;
  seri: number;
  tarih: string;
  sonuc: OyunSonuc;
  /** Antrenman oturumu toplamı — bu tur dahil. Yalnızca Antrenman'da dolu gelir. */
  oturumPuanSonrasi: { toplamPuan: number; turSayisi: number } | null;
  /** Bu turla birlikte açılan seviyenin etiketi, açılan yoksa null. */
  yeniAcilanSeviyeEtiket: string | null;
  /** Kullanıcı giriş yapmış mı? Üyelik notunun içeriğini belirler. */
  girisYapildiMi: boolean;
  /** Seri kırıldıysa koruma fırsatı bilgisi. */
  seriKorumaBilgi: { oncekiSeriGun: number; gun: string } | null;
  /** Seri koruması yapıldığında çağrılır (ödüllü reklam izlendikten sonra). */
  onSeriKoru: () => void;
  /** Günün Turu birincil düğmesi: kurulum ekranına (ana sayfaya) döner. */
  onAnaSayfa: () => void;
  /** Günün Turu ikincil bağlantısı: aynı seviyede hemen Antrenman'a geçer. */
  onAntrenmandaOyna: () => void;
  /** Antrenman birincil düğmesi: aynı ayarlarla (seviye/süre/büyük sayı) yeni tur. */
  onYeniTur: () => void;
  /** Antrenman ikincil düğmesi: kurulum ekranına döner, ayarlar değiştirilebilir. */
  onAyarlar: () => void;
  /** Üyelik notuna tıklanınca giriş ekranı açılır. */
  onGirisAc: () => void;
}

export default function Sonuc({
  tur,
  seviye,
  seviyeEtiket,
  mod,
  sure,
  seri,
  tarih,
  sonuc,
  oturumPuanSonrasi,
  yeniAcilanSeviyeEtiket,
  girisYapildiMi,
  seriKorumaBilgi,
  onSeriKoru,
  onAnaSayfa,
  onAntrenmandaOyna,
  onYeniTur,
  onAyarlar,
  onGirisAc,
}: Props) {
  const veri = tur.veri as SayiVeri;
  const tam = sonuc.fark === 0;

  // Ödüllü reklam: antrenman modunda "reklam izle, tekrar oyna"
  const [reklamYukleniyor, setReklamYukleniyor] = useState(false);
  const [seriKorumaYukleniyor, setSeriKorumaYukleniyor] = useState(false);
  const [seriKorumaTamamlandi, setSeriKorumaTamamlandi] = useState(false);
  const reklamGosterilebilir = mod === 'antrenman' && nativeMi();
  const seriKorumaGosterilebilir = seriKorumaBilgi != null && nativeMi() && !seriKorumaTamamlandi;

  // Sonuç ekranı açıldığında ödüllü reklamı arka planda hazırla
  useEffect(() => {
    if (reklamGosterilebilir || seriKorumaGosterilebilir) odulluReklamHazirla();
  }, [reklamGosterilebilir, seriKorumaGosterilebilir]);

  async function reklamIzleTekrarOyna() {
    setReklamYukleniyor(true);
    try {
      await odulluReklamGoster();
      // Reklam başarılı veya başarısız — her durumda tekrar oyna
      onYeniTur();
    } finally {
      setReklamYukleniyor(false);
    }
  }

  async function reklamIzleSeriKoru() {
    setSeriKorumaYukleniyor(true);
    try {
      await odulluReklamGoster();
      onSeriKoru();
      setSeriKorumaTamamlandi(true);
    } finally {
      setSeriKorumaYukleniyor(false);
    }
  }

  // --- Misafir daveti ---
  // Karar mantığı uyelik-daveti.ts içinde; burada yalnızca uygulanır.
  // `kapatmaSayaci` state'i, "Şimdi değil" dendiğinde bileşenin yeniden
  // çizilmesini sağlar (kapatma hafızası React state'i değil).
  const [kapatmaSayaci, setKapatmaSayaci] = useState(0);
  function davetiKapat(yer: 'antrenman-sonuc' | 'gunun-sonuc') {
    davetKapat(yer);
    setKapatmaSayaci((n) => n + 1);
  }

  const antrenmanDaveti =
    mod === 'antrenman' &&
    davetGosterilsinMi({
      yer: 'antrenman-sonuc',
      girisYapildiMi,
      turSayisi: oturumPuanSonrasi?.turSayisi ?? 0,
      kapatildiMi: davetKapatildiMi('antrenman-sonuc'),
    });

  const gununDaveti =
    mod === 'gunun' &&
    davetGosterilsinMi({
      yer: 'gunun-sonuc',
      girisYapildiMi,
      kapatildiMi: davetKapatildiMi('gunun-sonuc'),
    });
  void kapatmaSayaci; // yeniden çizim tetikleyicisi

  // Oturum satırı 2. turdan itibaren görünür (ilk turda tur puanıyla aynı).
  const oturumGoster =
    mod === 'antrenman' && oturumPuanSonrasi != null && oturumPuanSonrasi.turSayisi > 1;

  const carpanNotu =
    mod === 'antrenman' && sonuc.carpan != null
      ? carpanCumlesi({
          seviye,
          secilenSure: sure,
          fark: sonuc.fark,
          kalan: sonuc.kalan,
          toplamSure: sonuc.toplamSure,
          jokerler: sonuc.jokerler,
          puan: sonuc.puan,
          carpan: sonuc.carpan,
        })
      : null;

  // Çözüm ancak tur bittikten SONRA açılır (CLAUDE.md 6).
  const cozum = useMemo(() => sayiTuru.cozumBul(tur), [tur]);

  const kayit: Kayit = {
    seviyeEtiket,
    hedef: veri.hedef,
    fark: sonuc.fark,
    puan: sonuc.puan,
    sure,
    gunluk: mod === 'gunun',
    tarih,
    seri,
    jokerler: sonuc.jokerler,
  };

  const metin = useMemo(() => kartMetni(kayit), [kayit]);
  const gorselUrl = useMemo(() => (mod === 'gunun' ? kartDataUrl(kayit) : null), [mod, kayit]);
  const [kopyalandi, setKopyalandi] = useState(false);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1600);
    } catch {
      setKopyalandi(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
      <div className="mx-auto w-full max-w-md">
        {/* Yeni seviye açıldı */}
        {yeniAcilanSeviyeEtiket && (
          <div
            data-alan="yeni-seviye"
            className="mb-5 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-3 text-center text-sm font-bold text-cyan-200"
          >
            🎉 {yeniAcilanSeviyeEtiket} açıldı!
          </div>
        )}

        {/* 1) Sonuç — insan diliyle. Rakam ("3 fark") başlıkta değil,
            altında küçük gri açıklamada durur. */}
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {mod === 'gunun' ? 'Günün Turu' : 'Antrenman'} · {seviyeEtiket}
          </div>
          <div
            data-alan="hukum"
            className={`mt-2 text-4xl font-black ${tam ? 'text-cyan-300' : 'text-slate-200'}`}
          >
            {hukumMetni(seviye, sonuc.fark)}
          </div>
          {!tam && (
            <div className="mt-1 text-sm text-slate-500" data-alan="fark-notu">
              hedefe {sonuc.fark} kaldı
            </div>
          )}
          {!tam && (
            <div className="mt-3 text-sm text-slate-400" data-alan="motivasyon">
              {motivasyonSecimi(veri.hedef, sonuc.fark, sonuc.adimlar.length, sonuc.kalan, sure)}
            </div>
          )}

          {/* 2) Puan — TEK YER. Tur puanı ekranda başka hiçbir yerde
              tekrar edilmez. */}
          <div className="mt-6 text-5xl font-black text-white">
            +
            <SayanSayi deger={sonuc.puan} className="zt-rakam font-black text-white" data-alan="puan" />{' '}
            <span className="text-2xl text-slate-400">puan</span>
          </div>

          {/* 3) Çarpan, sayı olarak değil cümle olarak. */}
          {mod === 'antrenman' && sonuc.carpan != null && carpanNotu && (
            <div className="mt-2 text-sm text-slate-400" data-alan="carpan-cumle">
              {carpanNotu}
            </div>
          )}

          {sonuc.jokerler.length > 0 && (
            <div className="mt-2 text-xs text-amber-300" data-alan="kullanilan-jokerler">
              Joker: {jokerOzeti(sonuc.jokerler)}
            </div>
          )}
        </div>

        {/* Seri koruma — ödüllü reklam izleyerek kırılan seriyi geri yükle */}
        {seriKorumaGosterilebilir && (
          <div
            data-alan="seri-koruma"
            className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center"
          >
            <div className="text-sm text-amber-200">
              🔥 {seriKorumaBilgi!.oncekiSeriGun} günlük serin kırıldı!
            </div>
            <button
              onClick={reklamIzleSeriKoru}
              disabled={seriKorumaYukleniyor}
              className="mt-2 min-h-[40px] w-full rounded-lg bg-amber-400/20 text-sm font-bold text-amber-300 hover:bg-amber-400/30 disabled:opacity-50"
            >
              {seriKorumaYukleniyor ? 'Yükleniyor…' : '🎬 Reklam izle, serini koru'}
            </button>
          </div>
        )}
        {seriKorumaTamamlandi && (
          <div
            data-alan="seri-koruma-basarili"
            className="mt-5 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-center text-sm text-green-300"
          >
            ✅ Serin korundu! {seri} gün devam ediyor.
          </div>
        )}

        {/* 4) Oturum toplamı — kart değil, tek satır. İlk turda hiç
            gösterilmez: o an oturum toplamı tur puanının aynısı olur ve
            aynı sayıyı ikinci kez göstermek ekranı kalabalıklaştırır. */}
        {oturumGoster && (
          <div className="mt-5 text-center text-sm text-cyan-200/80" data-alan="oturum-ozet">
            Bu oturum: <span className="font-bold tabular-nums">{oturumPuanSonrasi!.toplamPuan} puan</span> ·{' '}
            {oturumPuanSonrasi!.turSayisi}. tur
          </div>
        )}
        {/* 5) Üyelik daveti — gri bir metin satırı yerine kart, ve
            içinde oyuncunun kendi sayısı. Her turda değil: 3. turdan
            itibaren iki turda bir, "Şimdi değil" denince o oturumda hiç. */}
        {antrenmanDaveti && oturumPuanSonrasi && (
          <UyelikDaveti
            data-alan="uyelik-daveti"
            baslik={`${oturumPuanSonrasi.toplamPuan} puanın kaydedilmedi`}
            aciklama="Üye ol, oturum puanların XP'ye işlesin ve sıralamalarda yerini al."
            eylemMetni="Üye ol"
            onEylem={onGirisAc}
            onKapat={() => davetiKapat('antrenman-sonuc')}
          />
        )}

        {/* Günün Turu daveti — dönüşüm için EN KRİTİK yer.
            Misafir günün turunu oynadığında lige hiç yazılmıyor ve
            bunu bilmiyordu. Günde tek hak olduğu için bu tek seferlik
            bir fırsat: seyrekleştirilmez, vurgulu gösterilir.

            KONUM: puanın hemen altında, çözümden ve paylaşım kartından
            ÖNCE. Önce sayfanın en altındaydı — paylaşım kartı uzun
            olduğu için oyuncuların çoğu oraya hiç ulaşmıyordu. */}
        {gununDaveti && (
          <UyelikDaveti
            data-alan="uyelik-daveti"
            vurgulu
            baslik={`${sonuc.puan} puan aldın ama lige işlemedi`}
            aciklama="Bugünkü turun sıralamaya girsin mi? Giriş yaptığında bu tur sunucuya gönderilir."
            eylemMetni="Giriş yap ve kaydet"
            onEylem={onGirisAc}
            onKapat={() => davetiKapat('gunun-sonuc')}
          />
        )}

        {/* Çözümün tahtaya el yazısıyla yazılması */}
        <div className="mt-7">
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Çözüm</div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-alan="tahta">
            <ul className="elyazisi space-y-1.5 text-xl text-cyan-100">
              {cozum.satirlar.map((s, i) => (
                <li
                  key={i}
                  className="tahta-satir"
                  style={{ animationDelay: `${i * 260}ms` }}
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">Bu bulmacanın bir çözümü. Tek yol değil.</p>
        </div>

        {/* Paylaşım kartı — yalnızca Günün Turu */}
        {mod === 'gunun' && (
          <div className="mt-7" data-alan="paylasim">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Paylaş</div>
            <pre
              data-alan="pay-metin"
              className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300"
            >
              {metin}
            </pre>

            {gorselUrl && (
              <img
                src={gorselUrl}
                alt="Paylaşım kartı önizlemesi"
                data-alan="pay-gorsel"
                className="mt-3 w-full rounded-xl border border-slate-800"
              />
            )}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                onClick={kopyala}
                className="min-h-[48px] rounded-xl border border-slate-700 bg-slate-900/60 text-sm font-bold text-slate-200"
              >
                {kopyalandi ? 'Kopyalandı ✓' : 'Metni kopyala'}
              </button>
              {gorselUrl && (
                <a
                  href={gorselUrl}
                  download={`sayi-turu-${tarih}.png`}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 text-sm font-bold text-slate-200"
                >
                  Görseli indir
                </a>
              )}
            </div>
          </div>
        )}


        {mod === 'gunun' ? (
          <>
            <button
              data-alan="yeniden"
              onClick={onAnaSayfa}
              className="mt-8 min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 hover:bg-cyan-200"
            >
              Ana sayfaya dön
            </button>
            <button
              data-alan="antrenmanda-oyna"
              onClick={onAntrenmandaOyna}
              className="mt-3 min-h-[44px] w-full text-sm font-bold text-cyan-300 hover:underline"
            >
              Antrenmanda oyna
            </button>
          </>
        ) : (
          <>
            <button
              data-alan="yeni-tur"
              onClick={onYeniTur}
              className="mt-8 min-h-[56px] w-full rounded-xl bg-cyan-300 text-lg font-black text-slate-900 hover:bg-cyan-200"
            >
              Yeni tur
            </button>
            {reklamGosterilebilir && (
              <button
                data-alan="reklam-tekrar"
                onClick={reklamIzleTekrarOyna}
                disabled={reklamYukleniyor}
                className="mt-3 min-h-[44px] w-full rounded-xl border border-slate-800 text-sm font-medium text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                {reklamYukleniyor ? 'Yükleniyor…' : 'Reklam izle, tekrar oyna'}
              </button>
            )}
            <button
              data-alan="ayarlar"
              onClick={onAyarlar}
              className="mt-3 min-h-[44px] w-full text-sm font-bold text-slate-400 hover:text-slate-200"
            >
              Seviye değiştir
            </button>
          </>
        )}

        {/*
          Yasal bağlantılar buradan KALDIRILDI. Aynı bağlantılar hem bu
          alt bilgide hem profil sayfasında duruyordu. Artık tek yol var:
          giriş yapan kullanıcı profilinden, misafir menüdeki "Gizlilik
          ve yasal" öğesinden ulaşır (/yasal).
        */}
      </div>
    </main>
  );
}
