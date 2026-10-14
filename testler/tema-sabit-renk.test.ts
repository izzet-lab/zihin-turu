/**
 * tema-sabit-renk.test.ts — Arayüzde sabit renk kalmasın (kural 11).
 *
 * NEDEN BU TEST VAR
 * Tema dönüşümü iki turda yapıldı ve her ikisinde de geride literal
 * Tailwind renkleri kaldı. İkinci turdan sonra bile kırk iki yerde
 * duruyorlardı; en görünür sonucu maç sonundaki çözüm satırlarıydı:
 * `text-amber-100` ile yazılıyorlardı ve gündüz temasında kâğıt
 * zeminin üstünde okunmuyorlardı (14 Ekim 2026).
 *
 * Sabit renk gözle aranarak bulunmuyor — ekranın yarısı doğru temada
 * olduğu için fark edilmiyor, yanlış kalan yarısı ise ancak o temaya
 * geçen oyuncunun başına geliyor. Bu yüzden testle tutuluyor.
 *
 * İZİN VERİLEN TEK İSTİSNA taş yüzeyi: fildişi zemin ve koyu rakam
 * `stil.css` içinde `[data-tas]` kuralında bilerek sabit, çünkü taş
 * bir arayüz öğesi değil fiziksel bir nesne. Bu test zaten yalnızca
 * TSX/TS dosyalarına bakıyor, stil dosyasına değil.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const KOK = join(process.cwd(), 'uygulama', 'src');

const PALET = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
  'fuchsia', 'pink', 'rose',
].join('|');

/** `text-cyan-400`, `bg-red-950/20`, `hover:border-amber-300` … */
const SABIT_RENK = new RegExp(
  `\\b(?:[a-z-]+:)?(?:text|bg|border|from|to|via|divide|ring|outline|placeholder|decoration|shadow|accent|caret|fill|stroke)-(?:${PALET})-[0-9]{2,3}\\b`,
  'g',
);

function dosyalar(dizin: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) cikti.push(...dosyalar(yol));
    else if (ad.endsWith('.tsx') || ad.endsWith('.ts')) cikti.push(yol);
  }
  return cikti;
}

describe('tema jetonları', () => {
  it('arayüz dosyalarında sabit Tailwind rengi yok', () => {
    const bulunanlar: string[] = [];

    for (const yol of dosyalar(KOK)) {
      const metin = readFileSync(yol, 'utf8');
      metin.split('\n').forEach((satir, i) => {
        for (const eslesme of satir.matchAll(SABIT_RENK)) {
          bulunanlar.push(`${yol.slice(KOK.length + 1)}:${i + 1} → ${eslesme[0]}`);
        }
      });
    }

    expect(bulunanlar, `Bu yerler tema değişince DEĞİŞMEZ:\n${bulunanlar.join('\n')}`).toEqual([]);
  });
});
