import { test, expect } from '@playwright/test';
import { girisYap, testHesabiVarMi, TEST_EPOSTALAR } from './duello-kimlik';

/*
  SIRALAMALAR EKRANI

  İki şey korunuyor:

  1. Boş liste bir çıkmaz sokak değil, başlangıç noktası. Önce ekranın
     ortasında tek bir gri cümle vardı ve altı kapkaraydı; kullanıcı
     burayı ölü sanıp bir daha bakmıyordu. Artık her sekmenin kendi
     daveti ve o moda GÖTÜREN düğmesi var.

  2. Açıklama seçili sekmeye göre değişir. "Çalışkanlık tablosu" notu
     yalnızca Antrenman'da geçerli; Günlük sekmesindeyken görünmesi
     kullanıcıyı yanıltıyordu.
*/

const SEKMELER = ['gunluk', 'haftalik', 'aylik', 'duello', 'antrenman'] as const;

test('beş sekme var ve düello antrenmandan önce geliyor', async ({ page }) => {
  await page.goto('/lig');

  for (const s of SEKMELER) {
    await expect(page.locator(`[data-sekme="${s}"]`), s).toBeVisible();
  }

  // Sıra önemli: düello antrenmandan önce.
  const sira = await page
    .locator('[data-sekme]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-sekme')));
  expect(sira).toEqual([...SEKMELER]);
});

test('açıklama sekmeye göre değişir', async ({ page }) => {
  await page.goto('/lig');
  const aciklama = page.locator('[data-alan="sekme-aciklama"]');

  await page.locator('[data-sekme="gunluk"]').click();
  await expect(aciklama).not.toContainText('Çalışkanlık');

  await page.locator('[data-sekme="duello"]').click();
  await expect(aciklama).toContainText('Düello derecesi');

  // "Çalışkanlık tablosu" notu YALNIZCA antrenman sekmesinde.
  await page.locator('[data-sekme="antrenman"]').click();
  await expect(aciklama).toContainText('Çalışkanlık tablosu');
});

test('düello sekmesinde seviye seçici yok — derece seviyeden bağımsız', async ({ page }) => {
  await page.goto('/lig');
  await page.locator('[data-sekme="gunluk"]').click();
  await expect(page.locator('[data-alan="seviye-secici"]')).toBeVisible();

  await page.locator('[data-sekme="duello"]').click();
  await expect(page.locator('[data-alan="seviye-secici"]')).toHaveCount(0);
});

test('boş liste davete dönüşüyor ve düğme doğru moda götürüyor', async ({ page }) => {
  await page.goto('/lig');

  // Hiç oynanmamış bir seviye seç: boş durum çıkmalı.
  await page.locator('[data-sekme="gunluk"]').click();
  await page.locator('text=Usta').first().click();

  const bos = page.locator('[data-alan="bos-durum"]');
  await expect(bos).toBeVisible({ timeout: 15_000 });
  await expect(bos).toContainText('ilk sen ol');

  const dugme = page.locator('[data-alan="bos-durum-eylem"]');
  await expect(dugme).toContainText('Günün Turunu oyna');
  await dugme.click();

  // Kurulum ekranına, Günün Turu seçili olarak dönmeli.
  await expect(page.locator('[data-alan="basla"]')).toBeVisible();
  await expect(page.locator('[data-mod="gunun"]')).toHaveAttribute('aria-pressed', 'true');
});

test('antrenman boş durumu antrenman moduna götürüyor', async ({ page }) => {
  await page.goto('/lig');
  await page.locator('[data-sekme="antrenman"]').click();
  await page.locator('text=Usta').first().click();

  const dugme = page.locator('[data-alan="bos-durum-eylem"]');
  await expect(dugme).toBeVisible({ timeout: 15_000 });
  await expect(dugme).toContainText('Antrenman yap');
  await dugme.click();

  await expect(page.locator('[data-mod="antrenman"]')).toHaveAttribute('aria-pressed', 'true');
});

test.describe('giriş yapmış oyuncu', () => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');

  test('düello sıralamasında kendi satırın vurgulu', async ({ browser }) => {
    const baglam = await browser.newContext();
    await girisYap(baglam, TEST_EPOSTALAR[0]!);
    const sayfa = await baglam.newPage();

    await sayfa.goto('/lig');
    await sayfa.locator('[data-sekme="duello"]').click();

    const benim = sayfa.locator('[data-alan="lig-satir"][data-benim="1"]');
    await expect(benim).toHaveCount(1, { timeout: 15_000 });
    await expect(benim).toContainText('(sen)');

    // Satırda derece, galibiyet–mağlubiyet ve kazanma yüzdesi olmalı.
    await expect(benim).toContainText('kazanma');
    await expect(benim).toContainText('Lv.');

    await baglam.close();
  });
});
