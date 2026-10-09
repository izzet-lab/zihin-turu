import { test, expect } from '@playwright/test';

/*
  ÖDÜL TÖRENİ

  Kutlamanın hangi durumda çıkacağı birim testinde sınanıyor
  (`testler/kutlama-karar.test.ts`). Burada sınanan şey katmanın
  kendisi: çıkıyor mu, sırayla mı gösteriyor, dokununca geçiyor mu.

  Gerçek bir seviye atlaması için binlerce XP kazanmak gerekirdi; bu
  yüzden kutlama olayı sayfadan doğrudan yayınlanıyor. Katmanın
  dinlediği olay zaten bu — test, ürünün kendi yolunu kullanıyor.
*/

const OLAY = 'tamisabet:kutlama';

test('kutlama katmanı birden fazla ödülü sırayla gösterir', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  // İlk açılışta "Nasıl oynanır" penceresi çıkıyor; kapatılmazsa
  // dokunuşu o yakalar.
  await page.getByRole('button', { name: 'Kapat' }).first().click().catch(() => {});

  await page.evaluate((olay) => {
    window.dispatchEvent(
      new CustomEvent(olay, {
        detail: [
          { tur: 'seviye', seviye: 2, unvan: 'Hesapçı' },
          { tur: 'seri', gun: 14 },
        ],
      }),
    );
  }, OLAY);

  // Önce seviye atlama — en büyük an başta.
  const kutlama = page.locator('[data-alan="kutlama"]');
  await expect(kutlama).toHaveAttribute('data-kutlama-tur', 'seviye');
  await expect(kutlama).toContainText('Lv.2 Hesapçı');

  // Kendiliğinden sıradakine geçer; tıklamayla yarışmamak için
  // beklemek yeterli (dokunarak geçiş ayrı testte).
  await expect(kutlama).toHaveAttribute('data-kutlama-tur', 'seri', { timeout: 8000 });
  await expect(kutlama).toContainText('14 gün');
  await expect(kutlama).toHaveCount(0, { timeout: 8000 });
});

test('dokununca hemen geçilir — oyuncu bekletilmez', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  // İlk açılışta "Nasıl oynanır" penceresi çıkıyor; kapatılmazsa
  // dokunuşu o yakalar.
  await page.getByRole('button', { name: 'Kapat' }).first().click().catch(() => {});

  await page.evaluate((olay) => {
    window.dispatchEvent(new CustomEvent(olay, { detail: [{ tur: 'seri', gun: 200 }] }));
  }, OLAY);

  const kutlama = page.locator('[data-alan="kutlama"]');
  await expect(kutlama).toBeVisible();
  // Kendiliğinden kapanma süresi 3,2 saniye; dokunuş ondan çok önce.
  await kutlama.click({ timeout: 2000 });
  await expect(kutlama).toHaveCount(0, { timeout: 2000 });
});

test('rozet kutlaması rozetin adını ve nasıl kazanıldığını söyler', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  // İlk açılışta "Nasıl oynanır" penceresi çıkıyor; kapatılmazsa
  // dokunuşu o yakalar.
  await page.getByRole('button', { name: 'Kapat' }).first().click().catch(() => {});

  await page.evaluate((olay) => {
    window.dispatchEvent(
      new CustomEvent(olay, {
        detail: [
          {
            tur: 'rozet',
            rozet: {
              kod: 'tam_ilk',
              ad: 'İlk İsabet',
              simge: 'hedef',
              nasil: 'İlk tam isabetini yap',
              oyunGrubu: 'beceri',
            },
          },
        ],
      }),
    );
  }, OLAY);

  const kutlama = page.locator('[data-alan="kutlama"]');
  await expect(kutlama).toBeVisible();
  await expect(kutlama).toContainText('Yeni rozet');
  await expect(kutlama).toContainText('İlk İsabet');
  await expect(kutlama).toContainText('İlk tam isabetini yap');
});

test('kutlama kendiliğinden kapanır — oyuncuyu bekletmez', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  // İlk açılışta "Nasıl oynanır" penceresi çıkıyor; kapatılmazsa
  // dokunuşu o yakalar.
  await page.getByRole('button', { name: 'Kapat' }).first().click().catch(() => {});

  await page.evaluate((olay) => {
    window.dispatchEvent(
      new CustomEvent(olay, { detail: [{ tur: 'seri', gun: 50 }] }),
    );
  }, OLAY);

  await expect(page.locator('[data-alan="kutlama"]')).toBeVisible();
  await expect(page.locator('[data-alan="kutlama"]')).toHaveCount(0, { timeout: 8000 });
});
