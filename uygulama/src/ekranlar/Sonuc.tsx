import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Tur } from '@zihinturu/cekirdek';
import { sayiTuru, type SayiVeri } from '@zihinturu/oyun-sayi';
import { kartMetni, kartDataUrl, JOKER_ETIKETLERI, type Kayit } from '../kart';
import type { Mod } from './Kurulum';
import type { OyunSonuc } from './Oyun';

/** Çarpanı kısa gösterir: 8 → "8", 3.75 → "3.75", 1.20 → "1.2". */
function carpanGoster(c: number): string {
  return String(Number(c.toFixed(2)));
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
  seviyeEtiket,
  mod,
  sure,
  seri,
  tarih,
  sonuc,
  oturumPuanSonrasi,
  yeniAcilanSeviyeEtiket,
  girisYapildiMi,
  onAnaSayfa,
  onAntrenmandaOyna,
  onYeniTur,
  onAyarlar,
  onGirisAc,
}: Props) {
  const veri = tur.veri as SayiVeri;
  const tam = sonuc.fark === 0;

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

        {/* Puan / durum */}
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {mod === 'gunun' ? 'Günün Turu' : 'Antrenman'} · {seviyeEtiket}
          </div>
          <div
            data-alan="hukum"
            className={`mt-2 text-4xl font-black ${tam ? 'text-cyan-300' : 'text-slate-200'}`}
          >
            {tam ? 'Tam isabet 🎯' : `${sonuc.fark} fark`}
          </div>
          <div className="mt-1 text-lg text-slate-400">
            <span className="font-black text-white" data-alan="puan">
              {sonuc.puan}
            </span>{' '}
            puan
          </div>
          {mod === 'antrenman' && sonuc.carpan != null && (
            <div className="mt-1 text-xs text-slate-500" data-alan="carpan-etiket">
              {seviyeEtiket} · {sure > 0 ? `${sure}sn` : 'süresiz'} · ×{carpanGoster(sonuc.carpan)}
            </div>
          )}
          {sonuc.jokerler.length > 0 && (
            <div className="mt-1 text-xs text-amber-300" data-alan="kullanilan-jokerler">
              Joker: {sonuc.jokerler.map((j) => JOKER_ETIKETLERI[j]).join(', ')}
            </div>
          )}
          {!tam && (
            <div className="mt-3 text-sm text-slate-400" data-alan="motivasyon">
              {motivasyonSecimi(veri.hedef, sonuc.fark, sonuc.adimlar.length, sonuc.kalan, sure)}
            </div>
          )}
        </div>

        {/* Oturum toplamı — Antrenman'ın "bir tane daha" motivasyon kartı.
            Sönük bir yan bilgi olarak kalmasın diye görsel olarak vurgulu:
            büyük, kalın sayı; hafif cyan çerçeve/dolgu. */}
        {mod === 'antrenman' && oturumPuanSonrasi && (
          <div
            data-alan="oturum-ozet"
            className="mt-5 rounded-2xl border border-cyan-300/40 bg-cyan-300/10 px-5 py-4 text-center"
          >
            <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-200/80">
              Oturum toplamı:
            </div>
            <div className="mt-1 text-4xl font-black tabular-nums text-cyan-100">
              {oturumPuanSonrasi.toplamPuan} <span className="text-lg font-bold text-cyan-200/70">puan</span>
            </div>
            <div className="mt-2 text-xs text-cyan-200/70">
              {oturumPuanSonrasi.turSayisi}. tur · Bu tur: {sonuc.puan} puan
            </div>
          </div>
        )}
        {mod === 'antrenman' && oturumPuanSonrasi && !girisYapildiMi && (
          <button
            onClick={onGirisAc}
            className="mt-2 w-full text-center text-[11px] text-slate-600 hover:text-cyan-400 transition-colors"
            data-alan="uyelik-notu"
          >
            Üye olursan puanların kalıcı olur ve lige işler →
          </button>
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

        {/* Misafir: "Bu turu lige işlemek için giriş yap" — ana eylem
            düğmesinden daha az baskın olmalı, dikkat çalmadan bilgi vermeli. */}
        {mod === 'gunun' && !girisYapildiMi && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2.5 text-center">
            <p className="text-xs text-slate-400">
              Giriş yaparsan puanın lige işler.{' '}
              <button
                onClick={onGirisAc}
                className="font-bold text-cyan-300 hover:underline"
              >
                Giriş yap →
              </button>
            </p>
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
            <button
              data-alan="ayarlar"
              onClick={onAyarlar}
              className="mt-3 min-h-[44px] w-full text-sm font-bold text-slate-400 hover:text-slate-200"
            >
              Seviye değiştir
            </button>
          </>
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
          </div>
        </footer>
      </div>
    </main>
  );
}
