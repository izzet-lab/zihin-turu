import { test, expect, type Page } from '@playwright/test';

/*
  Faz 2 kabul testi — gerçek tarayıcıda, uçtan uca:
  1) Günün Turu'nu aç, çözümü ARAYÜZDEN oynayarak tam isabet yap
  2) sonuç ekranının açıldığını doğrula
  3) paylaşım kartının üretildiğini (metin + görsel) doğrula
  4) kart metninde "=" işareti, işlem işaretleri (× ÷ −) ve ARA SONUÇLAR
     bulunmadığını doğrula (çözüm sızmamalı — CLAUDE.md 6)
  5) sayfayı yenile, günlük turun kilitli olduğunu doğrula

  Test paketleri içe aktarmaz; rafı ekrandan okuyup bağımsız bir
  çözücüyle hedefe ulaşan bir zincir bulur ve onu gerçekten arayüzde
  tıklayarak oynar. "Tam isabet" böylece gerçekten arayüz üzerinden
  elde edilir, testte simüle edilmez.
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
  // İlk açılışta tanıtım kendiliğinden çıkar; kapat ve devam et.
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();
  // Varsayılan mod Günün Turu; yine de açıkça seç.
  await page.locator('[data-mod="gunun"]').click();
  await page.locator('[data-seviye="normal"]').click();
}

test('günün turu: tam isabet, sonuç ekranı, paylaşım kartı sızıntısız, yenileyince kilit', async ({ page }) => {
  await gununTurunuBasla(page);

  await expect(page.locator('[data-alan="basla"]')).toBeVisible();
  await page.locator('[data-alan="basla"]').click();

  // --- Oyun ekranı: rafı oku, bağımsız çözücüyle bir zincir bul ---
  const hedef = Number(await page.locator('[data-alan="hedef"]').textContent());
  expect(hedef).toBeGreaterThan(0);

  const degerler = await page
    .locator('[data-alan="raf"] [data-tas]')
    .evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-tas'))));

  const zincir = coz(degerler, hedef);
  expect(zincir, 'çözücü hedefe ulaşan bir zincir bulmalı').not.toBeNull();

  // --- Zinciri arayüzden GERÇEKTEN oyna (tıklayarak) ---
  for (const ad of zincir!) {
    await tikTas(page, ad.a);
    await page.locator(`[data-alan="islemler"] [data-islem="${ad.islem}"]`).click();
    await tikTas(page, ad.b, true);
  }

  // --- 1) Sonuç ekranı açıldı mı? ---
  const hukum = page.locator('[data-alan="hukum"]');
  await expect(hukum).toBeVisible({ timeout: 10_000 });
  await expect(hukum).toContainText('Tam isabet');
  // Sonuç ekranına özgü başka bir öğe de görünür olmalı (gerçekten o ekrandayız).
  await expect(page.locator('[data-alan="tahta"]')).toBeVisible();
  await expect(page.locator('[data-alan="puan"]')).toBeVisible();

  // --- 2) Paylaşım kartı üretildi mi? (metin + görsel) ---
  const payMetin = page.locator('[data-alan="pay-metin"]');
  await expect(payMetin).toBeVisible();
  await expect(payMetin).toContainText(String(hedef));
  const payGorsel = page.locator('[data-alan="pay-gorsel"]');
  await expect(payGorsel).toBeVisible();

  // --- 3) Kart metninde çözüm SIZMIYOR ---
  const metin = (await payMetin.textContent()) ?? '';
  // "=" işareti ve işlem işaretleri (× ÷ −) hiç geçmemeli.
  expect(metin).not.toContain('=');
  expect(metin).not.toMatch(/[×÷−]/);
  // Ara sonuçlar (hedef DIŞINDAKİ adım sonuçları) metinde geçmemeli.
  const araSonuclar = zincir!.map((a) => a.sonuc).filter((s) => s !== hedef);
  for (const s of araSonuclar) {
    // Kısa/yaygın sayılar (ör. tek haneli) yanlış pozitif verebileceği için
    // yalnızca üç haneli ve üstü, hedeften farklı ara sonuçları denetliyoruz.
    if (String(s).length >= 3) {
      expect(metin, `ara sonuç ${s} kartta görünmemeli`).not.toContain(String(s));
    }
  }

  // Görsel gerçekten 1080 kare bir PNG mi?
  const boyut = await payGorsel.evaluate((img) => {
    const i = img as HTMLImageElement;
    return { w: i.naturalWidth, h: i.naturalHeight, png: i.src.startsWith('data:image/png') };
  });
  expect(boyut).toEqual({ w: 1080, h: 1080, png: true });

  // --- 4) Sayfayı yenile → günlük kilit dursun ---
  await gununTurunuBasla(page);
  await expect(page.locator('[data-alan="kilit"]')).toBeVisible();
  await expect(page.locator('[data-alan="kilit"]')).toContainText('tamamlandı');
  await expect(page.locator('[data-alan="basla"]')).toHaveCount(0);
});
