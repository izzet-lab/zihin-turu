/**
 * SayfaSablonu.tsx — Yasal metinler için standart tasarım.
 * Props: başlık, içerik (JSX), geri dönüş butonu.
 *
 * Sayfanın altında tüm yasal metinlere bağlantı veren bir gezinme
 * bloğu bulunur; okuyan kişi birinden diğerine geçebilsin diye.
 */

import { Link, useLocation } from 'react-router-dom';

/** Tüm yasal sayfalar — alt gezinme bu listeden üretilir. */
const YASAL_SAYFALAR = [
  { yol: '/yasal/kvkk', ad: 'KVKK Aydınlatma Metni' },
  { yol: '/yasal/gizlilik', ad: 'Gizlilik Politikası' },
  { yol: '/yasal/cerez', ad: 'Çerez Politikası' },
  { yol: '/yasal/kullanim-kosullari', ad: 'Kullanım Koşulları' },
];

interface Props {
  baslik: string;
  alt?: string;
  cocuklar?: React.ReactNode;
  onGeri?: () => void;
}

export default function SayfaSablonu({ baslik, alt, cocuklar, onGeri }: Props) {
  const konum = useLocation();

  return (
    <main className="zt-kagit zt-metin zt-ust-bosluk min-h-dvh px-5 pb-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          {onGeri && (
            <button
              onClick={onGeri}
              className="text-xs font-bold zt-vurgu-metin mb-4"
            >
              ← Geri
            </button>
          )}
          <h1 className="text-2xl font-black zt-metin">{baslik}</h1>
          {alt && <p className="text-sm zt-metin-soluk mt-2">{alt}</p>}
        </header>

        <div className="prose prose-invert max-w-none">
          {cocuklar}
        </div>

        {/* Diğer yasal metinlere geçiş */}
        <nav className="mt-12 border-t zt-cizgi pt-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest zt-metin-soluk">
            Diğer yasal metinler
          </p>
          <ul className="space-y-2">
            {YASAL_SAYFALAR.filter((s) => s.yol !== konum.pathname).map((s) => (
              <li key={s.yol}>
                <Link
                  to={s.yol}
                  className="text-sm zt-vurgu-metin hover:underline"
                >
                  {s.ad}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}

// Prose (markdown-style) sınıfları için başlık/yazı stilleri
export const ProseStilleri = `
.prose-invert {
  --tw-prose-body: rgb(226, 232, 240);
  --tw-prose-headings: rgb(255, 255, 255);
  --tw-prose-links: rgb(34, 211, 238);
  --tw-prose-bold: rgb(255, 255, 255);
  --tw-prose-hr: rgb(30, 41, 59);
}
.prose h2 {
  @apply text-lg font-bold zt-metin mt-8 mb-4;
}
.prose h3 {
  @apply text-base font-bold zt-metin mt-6 mb-3;
}
.prose p {
  @apply zt-metin mb-4 leading-relaxed;
}
.prose ul, .prose ol {
  @apply zt-metin mb-4 pl-6;
}
.prose li {
  @apply mb-2;
}
.prose a {
  @apply zt-vurgu-metin underline;
}
`;
