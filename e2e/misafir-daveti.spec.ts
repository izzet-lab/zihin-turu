import { test, expect } from '@playwright/test';
import { zinciriBulVeOyna } from './oyun-yardimcilari';

/*
  Misafire gösterilen "üye ol" daveti.

  Eski davet gri bir metin satırıydı ve soyut bir vaat söylüyordu.
  Yenisi kart ve içinde oyuncunun KENDİ sayısı geçiyor. Bu testler iki
  şeyi koruyor: davetin doğru anlarda çıkması ve bıktırmaması.
*/

const DENEYIMLI = {
  surum: 2,
  seri: { son: null, gun: 0, enUzun: 0 },
  tam: 0,
  gunluk: {},
  acikSeviyeler: ['cocuk', 'normal', 'zor', 'usta'],
};

async function tohumla(page: import('@playwright/test').Page) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('zihinturu.v2', JSON.stringify(t));
  }, DENEYIMLI);
}

async function yardimiGec(page: import('@playwright/test').Page) {
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();
}

test('antrenman: davet 3. turdan itibaren çıkar, "Şimdi değil" susturur', async ({ page }) => {
  await tohumla(page);
  await page.goto('/');
  await yardimiGec(page);

  await page.locator('[data-mod="antrenman"]').click();
  await page.locator('[data-seviye="cocuk"]').click();
  await page.locator('[data-sure="90"]').click();
  await page.locator('[data-alan="basla"]').click();

  const davet = page.locator('[data-alan="uyelik-daveti"]');

  // 1. ve 2. turda davet YOK — oyuncu daha oyunu tanımıyor.
  for (const tur of [1, 2]) {
    await zinciriBulVeOyna(page);
    await expect(page.locator('[data-alan="hukum"]')).toBeVisible({ timeout: 10_000 });
    await expect(davet, `tur ${tur}`).toHaveCount(0);
    await page.locator('[data-alan="yeni-tur"]').click();
  }

  // 3. turda çıkar ve oturum toplamını (kendi sayısını) söyler.
  await zinciriBulVeOyna(page);
  await expect(page.locator('[data-alan="hukum"]')).toBeVisible({ timeout: 10_000 });
  await expect(davet).toBeVisible();
  const oturumMetin = (await page.locator('[data-alan="oturum-ozet"]').textContent()) ?? '';
  const toplam = Number(oturumMetin.match(/Bu oturum:\s*(\d+)/)?.[1]);
  await expect(davet).toContainText(`${toplam} puanın kaydedilmedi`);

  // "Şimdi değil" — bu oturumda bir daha çıkmaz (5. tur olsa bile).
  await page.locator('[data-alan="davet-kapat"]').click();
  await expect(davet).toHaveCount(0);

  await page.locator('[data-alan="yeni-tur"]').click();
  await zinciriBulVeOyna(page);
  await expect(page.locator('[data-alan="hukum"]')).toBeVisible({ timeout: 10_000 });
  await page.locator('[data-alan="yeni-tur"]').click();
  await zinciriBulVeOyna(page); // 5. tur — normalde davetin çıkacağı tur
  await expect(page.locator('[data-alan="hukum"]')).toBeVisible({ timeout: 10_000 });
  await expect(davet).toHaveCount(0);
});

test('günün turu: misafire "lige işlemedi" daveti kendi puanıyla çıkar', async ({ page }) => {
  await tohumla(page);
  await page.goto('/');
  await yardimiGec(page);

  await page.locator('[data-mod="gunun"]').click();
  await page.locator('[data-alan="basla"]').click();
  await zinciriBulVeOyna(page);

  await expect(page.locator('[data-alan="hukum"]')).toBeVisible({ timeout: 10_000 });
  const davet = page.locator('[data-alan="uyelik-daveti"]');
  await expect(davet).toBeVisible();

  const puan = await page.locator('[data-alan="puan"]').getAttribute('data-deger');
  await expect(davet).toContainText(`${puan} puan aldın ama lige işlemedi`);
  await expect(davet.locator('[data-alan="davet-eylem"]')).toContainText('Giriş yap ve kaydet');

  // Turun kendisi, giriş yapılınca gönderilebilsin diye saklanmış olmalı.
  const bekleyen = await page.evaluate(() =>
    window.localStorage.getItem('zihinturu.bekleyen-tur'),
  );
  expect(bekleyen).toBeTruthy();
  const t = JSON.parse(bekleyen!);
  expect(t.mod).toBe('gunun');
  expect(typeof t.tohum).toBe('number');
  // Tur içeriği değil tohum saklanır (kural 3).
  expect(t).not.toHaveProperty('hedef');
});

test('kurulum: misafire serisinin kaydedilmediği söylenir', async ({ page }) => {
  await tohumla(page);
  await page.goto('/');
  await yardimiGec(page);
  await page.locator('[data-mod="gunun"]').click();
  await expect(page.locator('[data-alan="seri-misafir-notu"]')).toContainText(
    'kaydedilmiyor',
  );
});

test('lig: misafire "bu listede yoksun" daveti çıkar, kapatılınca susar', async ({ page }) => {
  await tohumla(page);
  await page.goto('/lig');

  const davet = page.locator('[data-alan="uyelik-daveti"]');
  await expect(davet).toBeVisible({ timeout: 10_000 });
  await expect(davet).toContainText('Sen bu listede yoksun');

  await page.locator('[data-alan="davet-kapat"]').click();
  await expect(davet).toHaveCount(0);

  // Sekme değiştirmek daveti geri getirmez — oturum boyunca susar.
  await page.locator('text=Haftalık').first().click();
  await expect(davet).toHaveCount(0);
});
