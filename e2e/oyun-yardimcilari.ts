import type { Page } from '@playwright/test';

/**
 * e2e testleri arasında paylaşılan yardımcılar: bağımsız bir çözücü
 * (uygulama paketlerini içe aktarmadan) ve rafta taş tıklama.
 * Amaç: testin, uygulamanın kendi koduna güvenmeden "tam isabet"i
 * gerçekten arayüz üzerinden elde ettiğini kanıtlamak.
 */

export type Islem = '+' | '−' | '×' | '÷';
export interface Adim {
  a: number;
  b: number;
  islem: Islem;
  sonuc: number;
}

function uygula(a: number, b: number, op: Islem): number | null {
  if (op === '+') return a + b;
  if (op === '×') return a * b;
  if (op === '−') return a - b > 0 ? a - b : null;
  return b > 0 && a % b === 0 ? a / b : null;
}

/** Basit geriye arama: hedefe TAM ulaşan bir adım zinciri bulur. */
export function coz(sayilar: number[], hedef: number): Adim[] | null {
  let cevap: Adim[] | null = null;
  const t0 = Date.now();
  interface D {
    d: number;
    yol: Adim[];
  }
  function ara(liste: D[]): boolean {
    for (const it of liste) {
      if (it.d === hedef) {
        cevap = it.yol;
        return true;
      }
    }
    if (liste.length < 2 || Date.now() - t0 > 4000) return false;
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        const a = liste[i]!;
        const b = liste[j]!;
        const kalan = liste.filter((_, k) => k !== i && k !== j);
        const ust = a.d >= b.d ? a : b;
        const alt = a.d >= b.d ? b : a;
        for (const op of ['+', '−', '×', '÷'] as Islem[]) {
          const s = uygula(ust.d, alt.d, op);
          if (s === null) continue;
          const dugum: D = { d: s, yol: ust.yol.concat(alt.yol, [{ a: ust.d, b: alt.d, islem: op, sonuc: s }]) };
          if (ara(kalan.concat([dugum]))) return true;
        }
      }
    }
    return false;
  }
  ara(sayilar.map((s) => ({ d: s, yol: [] })));
  return cevap;
}

export async function tikTas(page: Page, deger: number, kacinPressed = false) {
  const hepsi = page.locator(`[data-alan="raf"] [data-tas="${deger}"]`);
  const n = await hepsi.count();
  for (let i = 0; i < n; i++) {
    const el = hepsi.nth(i);
    if (kacinPressed && (await el.getAttribute('aria-pressed')) === 'true') continue;
    await el.click();
    return;
  }
  await hepsi.first().click();
}

/** Rafı okuyup bir zincir bulur ve gerçekten arayüzden tıklayarak oynar. */
export async function zinciriBulVeOyna(page: Page): Promise<{ hedef: number; zincir: Adim[] }> {
  const hedef = Number(await page.locator('[data-alan="hedef"]').textContent());
  const degerler = await page
    .locator('[data-alan="raf"] [data-tas]')
    .evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-tas'))));
  const zincir = coz(degerler, hedef);
  if (!zincir) throw new Error('çözücü hedefe ulaşan bir zincir bulamadı');
  for (const ad of zincir) {
    await tikTas(page, ad.a);
    await page.locator(`[data-alan="islemler"] [data-islem="${ad.islem}"]`).click();
    await tikTas(page, ad.b, true);
  }
  return { hedef, zincir };
}
