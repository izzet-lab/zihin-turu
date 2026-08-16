import { test, expect, type Page } from '@playwright/test';

/*
  Faz 2 kabul testi (senaryonun tamamı):
  1) Günün Turu'nu oyna, tam isabet yap
  2) paylaşım kartı üretilsin (metin + görsel), çözüm SIZMASIN
  3) sayfayı yenile, günlük kilit dursun

  Test paketleri içe aktarmaz; rafı ekrandan okuyup bağımsız bir
  çözücüyle hedefe ulaşan bir zincir bulur ve onu arayüzde oynar.
  Böylece "tam isabet" gerçekten arayüz üzerinden elde edilir.
*/

type Islem = '+' | '−' | '×' | '÷';
interface Adim {
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
function coz(sayilar: number[], hedef: number): Adim[] | null {
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

async function tikTas(page: Page, deger: number, kacinPressed = false) {
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

async function gununTurunuBasla(page: Page) {
  await page.goto('/');
  // Varsayılan mod Günün Turu; yine de açıkça seç.
  await page.locator('[data-mod="gunun"]').click();
  await page.locator('[data-seviye="normal"]').click();
}

test('günün turu: tam isabet, paylaşım kartı, yenileyince kilit', async ({ page }) => {
  await gununTurunuBasla(page);

  await expect(page.locator('[data-alan="basla"]')).toBeVisible();
  await page.locator('[data-alan="basla"]').click();

  // Oyun ekranı
  const hedef = Number(await page.locator('[data-alan="hedef"]').textContent());
  expect(hedef).toBeGreaterThan(0);

  const degerler = await page
    .locator('[data-alan="raf"] [data-tas]')
    .evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-tas'))));

  const zincir = coz(degerler, hedef);
  expect(zincir, 'çözücü hedefe ulaşan bir zincir bulmalı').not.toBeNull();

  for (const ad of zincir!) {
    await tikTas(page, ad.a);
    await page.locator(`[data-alan="islemler"] [data-islem="${ad.islem}"]`).click();
    await tikTas(page, ad.b, true);
  }

  // Sonuç ekranı — tam isabet
  await expect(page.locator('[data-alan="hukum"]')).toContainText('Tam isabet', { timeout: 10_000 });

  // Paylaşım kartı: metin + görsel
  const payMetin = page.locator('[data-alan="pay-metin"]');
  await expect(payMetin).toBeVisible();
  await expect(payMetin).toContainText(String(hedef));
  await expect(page.locator('[data-alan="pay-gorsel"]')).toBeVisible();

  // Çözüm sızıntısı olmamalı: metinde işlem işareti / "=" yok
  const metin = (await payMetin.textContent()) ?? '';
  expect(metin).not.toMatch(/[×÷−=]/);

  // Görsel gerçekten 1080 kare bir PNG mi?
  const boyut = await page.locator('[data-alan="pay-gorsel"]').evaluate((img) => {
    const i = img as HTMLImageElement;
    return { w: i.naturalWidth, h: i.naturalHeight, png: i.src.startsWith('data:image/png') };
  });
  expect(boyut).toEqual({ w: 1080, h: 1080, png: true });

  // Yenile → günlük kilit dursun
  await gununTurunuBasla(page);
  await expect(page.locator('[data-alan="kilit"]')).toBeVisible();
  await expect(page.locator('[data-alan="kilit"]')).toContainText('tamamlandı');
  await expect(page.locator('[data-alan="basla"]')).toHaveCount(0);
});
