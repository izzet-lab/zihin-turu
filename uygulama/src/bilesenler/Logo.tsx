/**
 * Logo.tsx — Markanın hedef halkaları, çizim olarak.
 *
 * NEDEN PNG DEĞİL
 * Başlıkta `ikon-192.png` duruyordu: cyan halkalı, koyu zemin için
 * çizilmiş bir resim. Açık temada o cyan kâğıdın üstünde okunmuyor ve
 * bir resmin rengi değiştirilemiyor.
 *
 * Artık çizim: rengini `currentColor` üzerinden alıyor, yani
 * bulunduğu yerin —ve dolayısıyla temanın— rengiyle çiziliyor. Koyu
 * temada açık, açık temada koyu.
 *
 * Aynı motif ikon takımında da geçiyor (hedef, kupa, çerez); tekrar
 * eden görsel fikir markayı sağlamlaştırıyor.
 */

export default function Logo({ boyut = 36, className = '' }: { boyut?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={boyut}
      height={boyut}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Tam İsabet"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="24" cy="24" r="20" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="12.5" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="5" fill="currentColor" stroke="none" />
    </svg>
  );
}
