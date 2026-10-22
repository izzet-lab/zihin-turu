import { test, expect, type Page } from '@playwright/test';

/*
  Giriş sistemi (göç 019): yönetim panelinden seçilir.
    sistem1 = e-posta + parola + Google
    sistem2 = yalnızca isim (varsayılan)

  Ayar `ayar` tablosundan okunuyor; burada o istek taklit ediliyor ki
  iki kip de gerçek sunucu olmadan sınansın. Hesap açma adımı (anonim
  oturum) gerçek sunucu istediği için burada yok — ekranın kendisi,
  yaş kapısı ve kipler arası geçiş sınanıyor.
*/

async function sistemTaklit(page: Page, sistem: 'sistem1' | 'sistem2') {
  await page.route('**/rest/v1/ayar*', (yol) => {
    const tekil = (yol.request().headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const satir = { deger: sistem };
    return yol.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(tekil ? satir : [satir]),
    });
  });
}

async function girisiAc(page: Page) {
  await page.goto('/?giris=1');
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();
}

test('sistem 2: isim ekranı açılır, kullanıcı adı isimden önerilir', async ({ page }) => {
  await sistemTaklit(page, 'sistem2');
  await girisiAc(page);

  await expect(page.locator('[data-alan="isimle-giris"]')).toBeVisible();
  // E-posta alanı bu kipte yok.
  await expect(page.locator('input[type="email"]')).toHaveCount(0);

  await page.locator('[data-alan="isim"]').fill('Nazım');
  await expect(page.locator('[data-alan="onerilen-ad"]')).toContainText('nazim');
});

test('sistem 2: yaş kapısı duruyor — 13 altı engellenir, 13–17 veli onayı ister', async ({ page }) => {
  await sistemTaklit(page, 'sistem2');
  await girisiAc(page);

  await page.locator('[data-alan="isim"]').fill('Nazım');
  const yil = new Date().getFullYear();

  await page.locator('[data-alan="dogum-yili"]').fill(String(yil - 15));
  await expect(page.getByText('Veli onayı:')).toBeVisible();

  await page.locator('[data-alan="dogum-yili"]').fill(String(yil - 10));
  await page.locator('[data-alan="kosullar"]').check();
  await page.locator('[data-alan="isimle-basla"]').click();
  await expect(page.getByText('Yaşın henüz yetmiyor')).toBeVisible();
});

test('sistem 2: koşullar onaylanmadan başlanmaz', async ({ page }) => {
  await sistemTaklit(page, 'sistem2');
  await girisiAc(page);

  await page.locator('[data-alan="isim"]').fill('Nazım');
  await page.locator('[data-alan="dogum-yili"]').fill('1990');
  await page.locator('[data-alan="isimle-basla"]').click();
  await expect(page.locator('[data-alan="giris-hata"]')).toContainText('koşulları');
});

test('sistem 2: "hesabın var mı?" e-posta ekranına geçer ve geri döner', async ({ page }) => {
  await sistemTaklit(page, 'sistem2');
  await girisiAc(page);

  await page.locator('[data-alan="eposta-ile-giris"]').click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await page.getByText('Hesabın yok mu? İsminle başla').click();
  await expect(page.locator('[data-alan="isimle-giris"]')).toBeVisible();
});

test('sistem 1: doğrudan e-posta ekranı açılır, isim ekranı yok', async ({ page }) => {
  await sistemTaklit(page, 'sistem1');
  await girisiAc(page);

  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('[data-alan="isimle-giris"]')).toHaveCount(0);
  await expect(page.getByText('Hesabın yok mu? İsminle başla')).toHaveCount(0);
});

test('/yonetim oturumsuz açılınca yönetici girişi ister', async ({ page }) => {
  await page.goto('/yonetim');
  await expect(page.locator('[data-alan="yonetim-giris"]')).toBeVisible();
  await expect(page.locator('[data-alan="yonetim-panel"]')).toHaveCount(0);
});
