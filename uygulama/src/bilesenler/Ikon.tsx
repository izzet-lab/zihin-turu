/**
 * Ikon.tsx — Uygulamanın tek ikon takımı.
 *
 * NEDEN EMOJİ DEĞİL
 * 🎯 ⚔️ ⚡ 📖 her telefonda başka çiziliyor: Samsung'da başka, Pixel'de
 * başka, tarayıcıda başka. Boyutu, kalınlığı ve rengi kontrol
 * edilemiyor; bazıları renkli, bazıları düz. "Özel görselimiz yok"
 * demenin en hızlı yolu ve markanın parçası olmuyorlar.
 *
 * TEK STİL
 * Hepsi 24×24 kutuda, yalnızca çizgi (dolgu yok), 1.75 kalınlık, yuvarlak
 * uç ve köşe. Renk `currentColor` — ikon bulunduğu metnin rengini alır,
 * böylece renk sistemi (marka cyan'ı, ödül altını, kayıp kırmızısı)
 * ikonlara da kendiliğinden işler.
 *
 * MARKA MOTİFİ
 * Logonun iç içe halkaları birkaç ikonda tekrar ediyor: hedef, arena
 * ve kupa. Tekrar eden bir görsel fikir markayı sağlamlaştırır.
 *
 * ERİŞİLEBİLİRLİK
 * Varsayılan `aria-hidden`: ikon genelde yanındaki yazının süsü. Tek
 * başına anlam taşıyorsa `etiket` verilir, o zaman ekran okuyucuya
 * okunur.
 */

export type IkonAdi =
  | 'hedef'
  | 'sayi'
  | 'kelime'
  | 'kitap-kapali'
  | 'gunun'
  | 'antrenman'
  | 'duello'
  | 'arena'
  | 'seri'
  | 'kilit'
  | 'ampul'
  | 'silgi'
  | 'kronometre'
  | 'video'
  | 'ana-sayfa'
  | 'siralama'
  | 'profil'
  | 'ses-acik'
  | 'ses-kapali'
  | 'soru'
  | 'kalkan'
  | 'kamera'
  | 'kupa'
  | 'bayrak'
  | 'yildiz'
  | 'zarf'
  | 'pasta'
  | 'etiket'
  | 'cop'
  | 'belge'
  | 'ayar'
  | 'cerez'
  | 'liste'
  | 'uyari'
  | 'tac'
  | 'madalya'
  | 'titresim';

/** Her ikonun gövdesi; ortak sarmalayıcı aşağıda. */
const CIZIMLER: Record<IkonAdi, JSX.Element> = {
  // Marka motifi: iç içe halkalar.
  hedef: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  // Sayı turu: dört işlem, dört köşede.
  sayi: (
    <>
      <path d="M4.2 6.5h3.6M6 4.7v3.6" />
      <path d="M16.2 6.5h3.6" />
      <path d="M4.8 15.3l2.6 2.6M7.4 15.3l-2.6 2.6" />
      <path d="M16.2 16.6h3.6M18 14.3v0.1M18 18.9v0.1" />
    </>
  ),
  kelime: (
    <>
      <path d="M12 6.4C10.4 5.2 8.4 4.7 5.5 4.8v12.4c2.9-.1 4.9.4 6.5 1.6 1.6-1.2 3.6-1.7 6.5-1.6V4.8c-2.9-.1-4.9.4-6.5 1.6Z" />
      <path d="M12 6.4v12.4" />
    </>
  ),
  'kitap-kapali': (
    <>
      <path d="M6.5 4.5h11a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
      <path d="M4.5 16.5h14" />
    </>
  ),
  gunun: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <circle cx="12" cy="14.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  antrenman: (
    <path d="M8.2 9.3c-2 0-3.4 1.2-3.4 2.7s1.4 2.7 3.4 2.7c2.6 0 4.2-5.4 7.6-5.4 2 0 3.4 1.2 3.4 2.7s-1.4 2.7-3.4 2.7c-3.4 0-5-5.4-7.6-5.4Z" />
  ),
  /*
   * Düello: karşı karşıya iki taraf ve aradaki çizgi.
   *
   * Önce çapraz iki kılıç denendi; 14 pikselde ince namlular birbirine
   * giriyor ve makasa benziyordu. İki ok ucu ile orta çizgi aynı şeyi
   * söylüyor ve en küçük boyutta bile okunuyor.
   */
  duello: (
    <>
      <path d="M9.2 7 5 12l4.2 5" />
      <path d="M14.8 7 19 12l-4.2 5" />
      <path d="M12 4v3.4M12 10.3v3.4M12 16.6V20" />
    </>
  ),
  arena: <path d="M13.5 3.5 6 13h4.8l-.3 7.5L18 11h-4.8l.3-7.5Z" />,
  seri: (
    <>
      <path d="M12 3.5c3.2 3 4.8 5.4 4.8 7.6 0 1-.3 1.9-.9 2.6.9.6 1.4 1.6 1.4 2.8 0 2.2-2.1 4-4.8 4s-4.8-1.8-4.8-4c0-2.6 1.5-4.3 1.5-6.4 0 0 1.4 1 1.9 2.4.6-2.2.6-5.3.9-9Z" />
    </>
  ),
  kilit: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.3 10.5V8a3.7 3.7 0 0 1 7.4 0v2.5" />
    </>
  ),
  ampul: (
    <>
      <path d="M9 16.5a6 6 0 1 1 6 0v1.5H9v-1.5Z" />
      <path d="M9.8 20.5h4.4" />
    </>
  ),
  silgi: (
    <>
      <path d="M8.8 19.5 4.6 15.3a1.6 1.6 0 0 1 0-2.3l8-8a1.6 1.6 0 0 1 2.3 0l4.4 4.4a1.6 1.6 0 0 1 0 2.3l-7.3 7.3a1.6 1.6 0 0 1-1.1.5H8.8Z" />
      <path d="M9.5 19.5h10M9.6 8.4l6 6" />
    </>
  ),
  kronometre: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.8v3.7l2.4 2.1M9.5 3h5M18.3 7.2l1.5-1.5" />
    </>
  ),
  video: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M10.5 9.8 15 12l-4.5 2.2V9.8Z" />
    </>
  ),
  'ana-sayfa': (
    <>
      <path d="M4.5 10.5 12 4.2l7.5 6.3v8.2a1.3 1.3 0 0 1-1.3 1.3H5.8a1.3 1.3 0 0 1-1.3-1.3v-8.2Z" />
      <path d="M9.8 20v-6h4.4v6" />
    </>
  ),
  siralama: (
    <>
      <path d="M4.5 19.5h15" />
      <rect x="6" y="11" width="3.4" height="6" rx="1" />
      <rect x="10.3" y="6.5" width="3.4" height="10.5" rx="1" />
      <rect x="14.6" y="13.5" width="3.4" height="3.5" rx="1" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.6-3.7 3.6-5.8 7.2-5.8s6.6 2.1 7.2 5.8" />
    </>
  ),
  'ses-acik': (
    <>
      <path d="M4.5 9.5h3l4-3.2v11.4l-4-3.2h-3v-5Z" />
      <path d="M15 9.2a4 4 0 0 1 0 5.6M17.6 6.8a7.5 7.5 0 0 1 0 10.4" />
    </>
  ),
  'ses-kapali': (
    <>
      <path d="M4.5 9.5h3l4-3.2v11.4l-4-3.2h-3v-5Z" />
      <path d="m15.2 9.8 4.3 4.4M19.5 9.8l-4.3 4.4" />
    </>
  ),
  soru: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.2 2.4c-.6.2-.9.7-.9 1.3v.6" />
      <circle cx="11.9" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  kalkan: (
    <>
      <path d="M12 3.6 5 6.2v5.3c0 4 2.8 7.3 7 8.9 4.2-1.6 7-4.9 7-8.9V6.2L12 3.6Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>
  ),
  kamera: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="16.8" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  kupa: (
    <>
      <path d="M7 4.5h10v5a5 5 0 0 1-10 0v-5Z" />
      <path d="M7 6.4H4.6v1.3A3.2 3.2 0 0 0 7 10.8M17 6.4h2.4v1.3a3.2 3.2 0 0 1-2.4 3.1" />
      <path d="M12 14.5v3.2M8.8 19.8h6.4" />
    </>
  ),
  bayrak: (
    <>
      <path d="M6 20.5V4.2" />
      <path d="M6 5h11.5l-2.2 3.6L17.5 12H6" />
    </>
  ),
  yildiz: (
    <path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.8Z" />
  ),
  zarf: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.2 7.6 7.8 5.6 7.8-5.6" />
    </>
  ),
  pasta: (
    <>
      <path d="M4.5 19.5v-5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v5" />
      <path d="M3.8 19.5h16.4M8.5 12.5V9.5M12 12.5V9M15.5 12.5V9.5" />
      <path d="M8.5 7.4c0-.9 1-1.3 1-2.4-1 .6-1.6 1.3-1.6 2.1M12 6.9c0-.9 1-1.4 1-2.5-1 .6-1.6 1.4-1.6 2.2M15.5 7.4c0-.9 1-1.3 1-2.4-1 .6-1.6 1.3-1.6 2.1" />
    </>
  ),
  etiket: (
    <>
      <path d="M11.3 3.8H19a1.2 1.2 0 0 1 1.2 1.2v7.7a2 2 0 0 1-.6 1.4l-6.4 6.4a1.4 1.4 0 0 1-2 0l-7-7a1.4 1.4 0 0 1 0-2l6.4-6.4a2 2 0 0 1 1.4-.6Z" />
      <circle cx="16" cy="8" r="1.4" />
    </>
  ),
  cop: (
    <>
      <path d="M4.8 6.8h14.4M9.5 6.8V4.6h5v2.2" />
      <path d="M6.6 6.8l.9 12.1a1.3 1.3 0 0 0 1.3 1.2h6.4a1.3 1.3 0 0 0 1.3-1.2l.9-12.1" />
      <path d="M10.4 10.4v6M13.6 10.4v6" />
    </>
  ),
  belge: (
    <>
      <path d="M6 3.8h7.5L19 9.3v10.9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1Z" />
      <path d="M13.2 4v5.2H19M8.2 13.2h7.6M8.2 16.6h5.6" />
    </>
  ),
  ayar: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.6v2.1M12 18.3v2.1M4.6 12H6.7M17.3 12h2.1M6.8 6.8l1.5 1.5M15.7 15.7l1.5 1.5M17.2 6.8l-1.5 1.5M8.3 15.7l-1.5 1.5" />
    </>
  ),
  cerez: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9.5" cy="9.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.6" cy="14.8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="15.4" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  liste: (
    <>
      <rect x="5" y="4.8" width="14" height="15.2" rx="2" />
      <path d="M9 3.6h6v2.6H9z" />
      <path d="M8.6 11h6.8M8.6 15h4.6" />
    </>
  ),
  // Titreşen telefon: iki yanında dalga.
  titresim: (
    <>
      <rect x="8.5" y="3.5" width="7" height="17" rx="2" />
      <path d="M11 6.6h2" />
      <path d="M5.2 9.4a5.6 5.6 0 0 0 0 5.2M2.8 7.6a9 9 0 0 0 0 8.8" />
      <path d="M18.8 9.4a5.6 5.6 0 0 1 0 5.2M21.2 7.6a9 9 0 0 1 0 8.8" />
    </>
  ),
  tac: (
    <>
      <path d="M4 17.5 5.2 7.4l4.3 3.6L12 5.2l2.5 5.8 4.3-3.6L20 17.5H4Z" />
      <path d="M5.2 20.3h13.6" />
    </>
  ),
  madalya: (
    <>
      <path d="M8.5 3.5 10.8 9M15.5 3.5 13.2 9" />
      <circle cx="12" cy="14.8" r="5.6" />
      <circle cx="12" cy="14.8" r="2.1" />
    </>
  ),
  uyari: (
    <>
      <path d="M12 4.3 2.9 19.7h18.2L12 4.3Z" />
      <path d="M12 10v4.1" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
};

interface Props {
  ad: IkonAdi;
  /** Kenar uzunluğu (piksel). Metnin yanında 16–20, kart başlığında 24–28. */
  boyut?: number;
  className?: string;
  /** Tek başına anlam taşıyorsa verilir; verilmezse ekran okuyucu atlar. */
  etiket?: string;
}

export default function Ikon({ ad, boyut = 20, className = '', etiket }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={boyut}
      height={boyut}
      className={`inline-block shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={etiket ? 'img' : undefined}
      aria-label={etiket}
      aria-hidden={etiket ? undefined : true}
    >
      {CIZIMLER[ad]}
    </svg>
  );
}
