import { test, expect } from '@playwright/test';

/*
  Düellonun giriş yolu.

  Gerçek bir maç iki kimlikli oyuncu ve canlı bağlantı gerektiriyor; o
  test hesap altyapısı kurulunca yazılacak. Buradaki testler kimlik
  gerektirmeyen kısmı koruyor: düelloya nasıl girildiği ve misafirin
  doğru şekilde durdurulduğu.
*/

const DENEYIMLI = {
  surum: 2,
  seri: { son: null, gun: 0, enUzun: 0 },
  tam: 0,
  gunluk: {},
  acikSeviyeler: ['cocuk', 'normal', 'zor', 'usta'],
};

async function hazirla(page: import('@playwright/test').Page) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('tamisabet.v2', JSON.stringify(t));
  }, DENEYIMLI);
  await page.goto('/');
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();
}

test('ana ekrandaki düello kartı hatırlanan seviyeyle düelloya götürür', async ({ page }) => {
  await hazirla(page);

  // Zorluk ana ekrandan kalktı; her mod kendi ekranında seçiyor.
  // Düello kartı en son kullanılan seviyeyi taşır — oyuncu zorluğu
  // düellonun kendi ekranında da değiştirebiliyor.
  await page.locator('[data-mod="antrenman"]').click();
  await page.locator('[data-seviye="zor"]').click();
  await page.locator('[data-alan="geri"]').click();

  const dugme = page.locator('[data-mod="duello"]');
  await expect(dugme).toBeVisible();
  await expect(dugme).toContainText('Düello');
  await dugme.click();

  // Gezinme router üzerinden olmalı (kural 12: <a href> Android'de 404).
  await expect(page).toHaveURL(/\/duello\?seviye=zor/);
});

test('misafir düelloya giremez, üyeliğe yönlendirilir', async ({ page }) => {
  await hazirla(page);
  await page.goto('/duello?seviye=normal');

  await expect(page.locator('[data-alan="duello-giris"]')).toBeVisible();
  await expect(page.locator('main')).toContainText('üye olman gerekiyor');

  // Misafire rakip aranıyor ekranı hiç gösterilmez.
  await expect(page.locator('[data-alan="duello-ariyor"]')).toHaveCount(0);
});

test('düellodan vazgeçince ana sayfaya dönülür', async ({ page }) => {
  await hazirla(page);
  await page.goto('/duello?seviye=normal');
  await page.locator('[data-alan="duello-cik"]').click();
  await expect(page).toHaveURL(/\/$/);
  // Ana ekranın baskın eylemi Günün Turu kartı; "Başla" artık modun
  // kendi ekranında.
  await expect(page.locator('[data-mod="gunun"]')).toBeVisible();
});
