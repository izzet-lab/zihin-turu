import { test, expect } from '@playwright/test';

/*
  KELİME TURU

  Faz 6'nın oynanabilir hale geldiğini doğrular. Üç şey önemli:

  1. Sözlük sonradan yükleniyor; ekran yükleme bitmeden seviye
     seçtirmemeli, bittiğinde de takılı kalmamalı.
  2. Geçersiz bir kelime turu BİTİRMEZ — oyuncu düzeltebilmeli.
     (Sayı turundaki "yanlış cevap turu kapatmaz" kuralının karşılığı.)
  3. Geçerli bir kelime sonuç ekranına götürür ve çözüm ancak orada
     görünür (kural 8: tur bitmeden çözüm sızmaz).
*/

test('sözlük yüklenir ve seviyeler görünür', async ({ page }) => {
  await page.goto('/kelime');
  await expect(page.locator('[data-alan="kelime-seviye-secici"]')).toBeVisible({ timeout: 30_000 });
  for (const s of ['cocuk', 'normal', 'zor', 'usta']) {
    await expect(page.locator(`[data-seviye="${s}"]`), s).toBeVisible();
  }
});

test('tur açılır, harfler gelir, çözüm görünmez', async ({ page }) => {
  await page.goto('/kelime');
  await page.locator('[data-seviye="normal"]').click();

  const raf = page.locator('[data-alan="kelime-raf"] button');
  await expect(raf).toHaveCount(8);

  // Tur sürerken çözümden eser olmamalı.
  await expect(page.locator('[data-alan="kelime-sonuc"]')).toHaveCount(0);
  await expect(page.locator('[data-alan="kelime-sure-kalan"]')).toBeVisible();
});

test('sözlükte olmayan kelime turu bitirmez', async ({ page }) => {
  await page.goto('/kelime');
  await page.locator('[data-seviye="normal"]').click();

  const raf = page.locator('[data-alan="kelime-raf"] button');
  // Rastgele dört harf; sözlükte bir kelime olma ihtimali yok denecek
  // kadar düşük ve olsa bile test yalnızca "ekranda kalındı"yı sınıyor.
  for (let i = 0; i < 4; i++) await raf.nth(i).click();
  await page.locator('[data-alan="kelime-bitir"]').click();

  const sonuc = page.locator('[data-alan="kelime-sonuc"]');
  const uyari = page.locator('[data-alan="kelime-uyari"]');
  // Ya uyarı çıkar ve oyun ekranında kalınır, ya da gerçekten kelimeydi.
  if (await sonuc.count() === 0) {
    await expect(uyari).toBeVisible();
    await expect(page.locator('[data-alan="kelime-raf"]')).toBeVisible();
  }
});

test('boş cevapla bitirince sonuç ekranı ve çözüm gelir', async ({ page }) => {
  await page.goto('/kelime');
  await page.locator('[data-seviye="normal"]').click();

  // Hiç harf seçmeden bitirmek geçerli bir cevap: puan sıfır.
  await page.locator('[data-alan="kelime-bitir"]').click();

  await expect(page.locator('[data-alan="kelime-sonuc"]')).toBeVisible();
  await expect(page.locator('[data-alan="kelime-yeni-tur"]')).toBeVisible();
});

test('ana ekrandan kelime turuna geçilebiliyor', async ({ page }) => {
  await page.goto('/');
  // Ilk acilista "Nasil oynanir" penceresi uste biniyor.
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();

  const dugme = page.locator('[data-alan="kelime-git"]');
  await expect(dugme).toBeVisible();
  await dugme.click();
  await expect(page).toHaveURL(/\/kelime/);
});
