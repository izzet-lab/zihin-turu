import { test, expect } from '@playwright/test';
import { zinciriBulVeOyna } from './oyun-yardimcilari';
import { girisYap, testHesabiVarMi, TEST_EPOSTALAR } from './duello-kimlik';

/*
  TURUN SUNUCUYA İŞLENDİĞİ EKRANDA YAZIYOR

  NEDEN BU TEST VAR
  8 Ekim 2026'da ortaya çıktı ki 18 Ağustos'tan beri hiçbir ANTRENMAN
  turu veritabanına kaydedilmiyormuş. Lig tetikleyicisindeki bir
  değişken adı tablo sütun adıyla çakışıyordu ve ekleme geri
  alınıyordu. Yedi hafta kimse fark etmedi; çünkü gönderim "ateşle ve
  unut"tu ve hata hiçbir yerde görünmüyordu.

  Bu test iki şeyi birlikte koruyor:
  1. Sonuç ekranı turun işlenip işlenmediğini SÖYLÜYOR.
  2. Gerçek bir hesapla oynanan antrenman turu gerçekten işleniyor —
     yani tetikleyici çalışıyor. Aynı hata tekrarlarsa bu test kırmızı
     olur.
*/

async function deneyimliTohumla(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('tamisabet.v2')) return;
    window.localStorage.setItem(
      'tamisabet.v2',
      JSON.stringify({
        surum: 2,
        seri: { son: null, gun: 0, enUzun: 0 },
        tam: 0,
        gunluk: {},
        acikSeviyeler: ['cocuk', 'normal', 'zor', 'usta'],
      }),
    );
  });
}

async function yardimiKapat(page: import('@playwright/test').Page) {
  const y = page.locator('[data-alan="yardim-anladim"]');
  if (await y.isVisible().catch(() => false)) await y.click();
}

test('misafirin sonuç ekranında sunucu satırı yok — üyelik daveti zaten anlatıyor', async ({
  page,
}) => {
  await deneyimliTohumla(page);
  await page.goto('/');
  await yardimiKapat(page);
  await page.locator('[data-mod="antrenman"]').click();
  await page.locator('[data-alan="basla"]').click();
  await expect(page.locator('[data-alan="hedef"]')).toBeVisible();

  await zinciriBulVeOyna(page);
  await page.locator('[data-alan="bitir"]').click();
  await expect(page.locator('[data-alan="puan"]')).toBeVisible();

  await expect(page.locator('[data-alan="lig-durumu"]')).toHaveCount(0);
});

test('giriş yapmış oyuncunun antrenman turu çalışkanlık tablosuna işleniyor', async ({
  browser,
}) => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');

  const baglam = await browser.newContext();
  await girisYap(baglam, TEST_EPOSTALAR[0]);
  const page = await baglam.newPage();

  await deneyimliTohumla(page);
  await page.goto('/');
  await yardimiKapat(page);
  await page.locator('[data-mod="antrenman"]').click();
  await page.locator('[data-alan="basla"]').click();
  await expect(page.locator('[data-alan="hedef"]')).toBeVisible();

  await zinciriBulVeOyna(page);
  await page.locator('[data-alan="bitir"]').click();

  const durum = page.locator('[data-alan="lig-durumu"]');
  await expect(durum).toBeVisible();
  // Asıl iddia bu: sunucu turu KABUL etti. "Kaydedilemedi" görünürse
  // tetikleyici yine bozulmuş demektir.
  await expect(durum).toContainText('Çalışkanlık tablosuna işlendi', { timeout: 20_000 });

  await baglam.close();
});
