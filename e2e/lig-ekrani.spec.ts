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

const SEKMELER = ['gunluk', 'haftalik', 'aylik', 'duello', 'arena', 'antrenman'] as const;

test('altı sekme var; düello ve arena antrenmandan önce geliyor', async ({ page }) => {
  await page.goto('/lig');

  for (const s of SEKMELER) {
    await expect(page.locator(`[data-sekme="${s}"]`), s).toBeVisible();
  }

  // Sıra önemli: düello ve arena antrenmandan önce.
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

/**
 * Sıralama sorgularını boş döndürür.
 *
 * Testler önce "hiç oynanmamış bir seviye" seçiyordu; canlı veritabanı
 * dolduğu için o varsayım bozuldu ve test kırmızıya döndü. Boş durumun
 * kendisini sınamak istiyoruz, veritabanının o anki hâlini değil.
 */
async function bosListeTaklit(page: import('@playwright/test').Page) {
  for (const tablo of ['lig_gunluk', 'lig_donem', 'lig_antrenman_hafta', 'duello_derece', 'arena_derece']) {
    await page.route(`**/rest/v1/${tablo}*`, (yol) =>
      yol.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      }),
    );
  }
}

test('boş liste davete dönüşüyor ve düğme doğru moda götürüyor', async ({ page }) => {
  await bosListeTaklit(page);
  await page.goto('/lig');
  await page.locator('[data-sekme="gunluk"]').click();

  const bos = page.locator('[data-alan="bos-durum"]');
  await expect(bos).toBeVisible({ timeout: 15_000 });
  await expect(bos).toContainText('ilk sen ol');

  const dugme = page.locator('[data-alan="bos-durum-eylem"]');
  await expect(dugme).toContainText('Günün Turunu oyna');
  await dugme.click();

  // Günün Turu ekranına dönmeli. (Zorluk ana ekrandan kalktı; her mod
  // kendi ekranında seçiyor, bu yüzden "basla" düğmesi orada.)
  await expect(page.locator('[data-alan="basla"]')).toBeVisible();
  await expect(page.locator('[data-alan="seviyeler"]')).toBeVisible();
});

test('antrenman boş durumu antrenman moduna götürüyor', async ({ page }) => {
  await bosListeTaklit(page);
  await page.goto('/lig');
  await page.locator('[data-sekme="antrenman"]').click();

  const dugme = page.locator('[data-alan="bos-durum-eylem"]');
  await expect(dugme).toBeVisible({ timeout: 15_000 });
  await expect(dugme).toContainText('Antrenman yap');
  await dugme.click();

  // Antrenman ekranı: kendi seviye ve süre seçicisiyle açılır.
  await expect(page.locator('[data-alan="antrenman-ayar"]')).toBeVisible();
  await expect(page.locator('[data-alan="basla"]')).toBeVisible();
});

test('düello boş durumu düelloya götürüyor', async ({ page }) => {
  await bosListeTaklit(page);
  await page.goto('/lig');
  await page.locator('[data-sekme="duello"]').click();

  const bos = page.locator('[data-alan="bos-durum"]');
  await expect(bos).toBeVisible({ timeout: 15_000 });
  await expect(bos).toContainText('İlk maçı sen yap');

  await page.locator('[data-alan="bos-durum-eylem"]').click();
  await expect(page).toHaveURL(/\/duello/);
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

test('arena sekmesinde madalya tablosu ve seviye seçici yok', async ({ page }) => {
  await page.goto('/lig');
  await page.locator('[data-sekme="arena"]').click();

  await expect(page.locator('[data-alan="sekme-aciklama"]')).toContainText('Madalya tablosu');
  // Arena madalyası seviyeden bağımsız: seçici gizli.
  await expect(page.locator('[data-alan="seviye-secici"]')).toHaveCount(0);
});

test('arena boş durumu arenaya götürüyor', async ({ page }) => {
  await bosListeTaklit(page);
  await page.goto('/lig');
  await page.locator('[data-sekme="arena"]').click();

  const bos = page.locator('[data-alan="bos-durum"]');
  await expect(bos).toBeVisible({ timeout: 15_000 });
  await expect(bos).toContainText('İlk podyum senin olsun');

  await page.locator('[data-alan="bos-durum-eylem"]').click();
  await expect(page).toHaveURL(/\/arena/);
});
