/**
 * SayfaSablonu.tsx — Yasal metinler için standart tasarım.
 * Props: başlık, içerik (JSX), geri dönüş butonu.
 */

interface Props {
  baslik: string;
  alt?: string;
  cocuklar?: React.ReactNode;
  onGeri?: () => void;
}

export default function SayfaSablonu({ baslik, alt, cocuklar, onGeri }: Props) {
  return (
    <main className="min-h-dvh bg-[#0A0E1A] text-slate-200 px-5 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          {onGeri && (
            <button
              onClick={onGeri}
              className="text-xs font-bold text-cyan-300 hover:text-cyan-200 mb-4"
            >
              ← Geri
            </button>
          )}
          <h1 className="text-2xl font-black text-white">{baslik}</h1>
          {alt && <p className="text-sm text-slate-400 mt-2">{alt}</p>}
        </header>

        <div className="prose prose-invert max-w-none">
          {cocuklar}
        </div>
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
  @apply text-lg font-bold text-white mt-8 mb-4;
}
.prose h3 {
  @apply text-base font-bold text-slate-100 mt-6 mb-3;
}
.prose p {
  @apply text-slate-300 mb-4 leading-relaxed;
}
.prose ul, .prose ol {
  @apply text-slate-300 mb-4 pl-6;
}
.prose li {
  @apply mb-2;
}
.prose a {
  @apply text-cyan-300 hover:text-cyan-200 underline;
}
`;
