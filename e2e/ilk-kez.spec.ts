import { test, expect } from '@playwright/test';
import { zinciriBulVeOyna } from './oyun-yardimcilari';

/*
  Yeni oyuncu akışı — gerçek tarayıcıda, uçtan uca:
  1) İlk kez giren oyuncu seviye SEÇMEZ; yalnızca Isınma açık ve
     seçili gelir, diğer seviyeler kilitli görünür.
  2) Isınma'da tam isabet yapınca bir sonraki seviye (Kolay) açılır
     ve sonuç ekranında bildirilir.
  3) Kurulum ekranına dönüldüğünde Kolay artık seçilebilir.

  Fresh bir tarayıcı bağlamıyla çalışır (localStorage önceden
  doldurulmaz) — bu, "hiç oynamamış" durumun kendisidir.
*/

test('ilk kez giren oyuncu Isınma ile başlar, tam isabet yapınca Kolay açılır', async ({ page }) => {
  await page.goto('/');

  // İlk açılışta tanıtım kendiliğinden çıkar; kapat ve devam et.
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();

  // --- 1) Seviye seçimi kilitli, yalnızca Isınma açık ---
  await expect(page.locator('text=Isınma ile başlıyorsun')).toBeVisible();

  const isinmaCip = page.locator('[data-seviye="cocuk"]');
  await expect(isinmaCip).toBeEnabled();
  await expect(isinmaCip).toHaveAttribute('aria-pressed', 'true');

  const kolayCip = page.locator('[data-seviye="normal"]');
  await expect(kolayCip).toBeDisabled();
  await expect(kolayCip).toHaveAttribute('data-kilitli', 'true');
  const ustaCip = page.locator('[data-seviye="usta"]');
  await expect(ustaCip).toBeDisabled();

  // --- 2) Antrenman'da Isınma'yı oyna, tam isabet yap ---
  await page.locator('[data-mod="antrenman"]').click();
  await page.locator('[data-alan="basla"]').click();

  await zinciriBulVeOyna(page);

  const hukum = page.locator('[data-alan="hukum"]');
  await expect(hukum).toBeVisible({ timeout: 10_000 });
  await expect(hukum).toContainText('Tam isabet');

  // --- 3) Yeni seviye açıldı bildirimi ---
  const yeniSeviye = page.locator('[data-alan="yeni-seviye"]');
  await expect(yeniSeviye).toBeVisible();
  await expect(yeniSeviye).toContainText('Kolay');

  // --- 4) Kurulum ekranına dön: Kolay artık seçilebilir ---
  // Antrenman'da birincil düğme artık "Yeni tur" (aynı ayarlarla devam
  // eder); Kurulum'a dönmek için ikincil "Ayarlar" düğmesi kullanılır.
  await page.locator('[data-alan="ayarlar"]').click();

  const kolayCip2 = page.locator('[data-seviye="normal"]');
  await expect(kolayCip2).toBeEnabled();
  await expect(kolayCip2).not.toHaveAttribute('data-kilitli', 'true');
  await kolayCip2.click();
  await expect(kolayCip2).toHaveAttribute('aria-pressed', 'true');

  // Artık deneyimli sayılır; "ilk kez" mesajı bir daha çıkmaz.
  await expect(page.locator('text=Isınma ile başlıyorsun')).toHaveCount(0);
});
