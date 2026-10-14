import { test, expect } from '@playwright/test';

/*
  TAM İSABET TÖRENİNİN HALKALARI

  Sesi otomatik testte doğrulayamıyoruz: tarayıcı ses bağlamını ancak
  gerçek bir kullanıcı dokunuşuyla açıyor ve başsız tarayıcıda ses
  çıkışı yok. Burada görüntü tarafı sınanıyor — halkalar çıkıyor mu,
  ekranı kapatıyor mu, kendiliğinden kayboluyor mu.

  Ses kararının kendisi birim testinde:
  `testler/kutlama-sesi-karar.test.ts`.
*/

const OLAY = 'tamisabet:halka';

test('halkalar çıkar, oyunu engellemez ve kendiliğinden kaybolur', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Kapat' }).first().click().catch(() => {});

  const halka = page.locator('[data-alan="hedef-halkasi"]');
  await expect(halka).toHaveCount(0);

  await page.evaluate((olay) => window.dispatchEvent(new CustomEvent(olay)), OLAY);
  await expect(halka).toBeVisible();

  // ÜSTÜNE BİNER, KAPATMAZ: tıklama katmandan geçiyor olmalı. Altındaki
  // oyun seçici hâlâ tıklanabilir — kutlama sırasında oyun donmamalı.
  await page.locator('[data-oyun="kelime"]').click({ timeout: 2000 });
  await expect(page.locator('[data-oyun="kelime"]')).toHaveAttribute('aria-pressed', 'true');

  // 1,2 saniyelik tören; sonra iz bırakmadan gider.
  await expect(halka).toHaveCount(0, { timeout: 4000 });
});
