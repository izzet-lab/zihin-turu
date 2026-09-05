import { test, expect } from '@playwright/test';
import { zinciriBulVeOyna } from './oyun-yardimcilari';

/*
  Antrenman akışı — sürtünmesiz tekrar oynama:
  1) Antrenman'da bir tur bitince birincil düğme "Yeni tur"dur ve
     kurulum ekranına UĞRAMADAN aynı ayarlarla (seviye, süre) yeni bir
     tur açar.
  2) "Ayarlar" ikincil düğmesi isteyeni kurulum ekranına götürür.
  3) Seçilen Antrenman ayarları kalıcıdır: sayfa yeniden açıldığında
     (uygulama kapatılıp açılmış gibi) son kullanılan seviye ve süre
     varsayılan gelir.

  Deneyimli oyuncu localStorage'ı ile başlar — bu testin konusu
  seviye kilidi değil, Antrenman akışının kendisi.
*/

async function deneyimliTohumla(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('zihinturu.v2')) return;
    window.localStorage.setItem(
      'zihinturu.v2',
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

test('antrenman: yeni tur kurulum ekranına uğramadan aynı ayarlarla devam eder', async ({ page }) => {
  await deneyimliTohumla(page);
  await page.goto('/');

  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();

  // Antrenman'ı Zor seviyede, 30 sn ile başlat. Toplam çarpan: seviye
  // (zor ×1.5) × süre (30sn ×2.5) = ×3.75.
  await page.locator('[data-mod="antrenman"]').click();
  await page.locator('[data-seviye="zor"]').click();
  await page.locator('[data-sure="30"]').click();
  await page.locator('[data-alan="basla"]').click();

  await expect(page.locator('[data-alan="hedef"]')).toBeVisible();
  await zinciriBulVeOyna(page);

  await expect(page.locator('[data-alan="hukum"]')).toBeVisible({ timeout: 10_000 });

  // Çarpan artık sayı olarak değil cümle olarak anlatılır. Zor seviye
  // (×1.5) ve 30 sn (×2.5) seçildiği için toplam çarpan 1'in üstünde:
  // övgü cümlesi ve kat sayısı görünür.
  const carpanCumle = page.locator('[data-alan="carpan-cumle"]');
  await expect(carpanCumle).toBeVisible();
  await expect(carpanCumle).toContainText('3.75 katına');

  // Tur puanı ekranda TEK yerde durur.
  // Gerçek değer data-deger'de durur (görünen sayı animasyonla sayıyor).
  const puan1 = Number(await page.locator('[data-alan="puan"]').getAttribute('data-deger'));
  expect(puan1).toBeGreaterThan(0);

  // İlk turda oturum satırı ve üyelik daveti gösterilmez — oturum
  // toplamı tur puanının aynısı olurdu, aynı sayı iki kez görünmesin.
  await expect(page.locator('[data-alan="oturum-ozet"]')).toHaveCount(0);
  await expect(page.locator('[data-alan="uyelik-notu"]')).toHaveCount(0);
  const toplam1 = puan1;

  // --- 1) "Yeni tur" — kurulum ekranı görünmeden doğrudan oyun ekranına döner ---
  await page.locator('[data-alan="yeni-tur"]').click();
  await expect(page.locator('[data-alan="hedef"]')).toBeVisible();
  // Kurulum'a özgü öğeler (seviye çipleri) bu ekranda YOK.
  await expect(page.locator('[data-alan="seviyeler"]')).toHaveCount(0);

  // Yeni tur da aynı ayarlarla mı geldi? Toplam süre yeniden 30 sn'den
  // başlamalı (joker eklemeden önceki taban değer).
  await expect(page.locator('[data-alan="sure-kalan"]')).toHaveAttribute('data-toplam-sure', '30');

  // Oyun ekranının üstünde önceki turun oturum toplamı ve "2. tur" görünür.
  const gostergeMetin = (await page.locator('[data-alan="oturum-gostergesi"]').textContent()) ?? '';
  expect(gostergeMetin).toContain('2. tur');
  expect(Number(gostergeMetin.match(/(\d+)\s*puan/)?.[1])).toBe(toplam1);

  // Bu turu da bitir.
  await zinciriBulVeOyna(page);
  await expect(page.locator('[data-alan="hukum"]')).toBeVisible({ timeout: 10_000 });

  // İkinci turdan itibaren oturum satırı görünür ve toplam birikir.
  const buTur2 = Number(await page.locator('[data-alan="puan"]').getAttribute('data-deger'));
  const ozet2 = page.locator('[data-alan="oturum-ozet"]');
  await expect(ozet2).toBeVisible();
  const ozet2Metin = (await ozet2.textContent()) ?? '';
  const toplam2 = Number(ozet2Metin.match(/Bu oturum:\s*(\d+)/)?.[1]);
  expect(toplam2).toBe(toplam1 + buTur2);
  expect(ozet2Metin).toContain('2. tur');

  // --- 2) "Seviye değiştir" — kurulum ekranına döner, MOD SIÇRAMAZ ---
  // Antrenman'dan gelindiği için Kurulum Antrenman sekmesiyle açılmalı
  // (Günün Turu'na sıçrarsa bu bir regresyon olur).
  await page.locator('[data-alan="ayarlar"]').click();
  const antrenmanSekmesi = page.locator('[data-mod="antrenman"]');
  await expect(antrenmanSekmesi).toHaveAttribute('aria-pressed', 'true');
  const zorCip = page.locator('[data-seviye="zor"]');
  await expect(zorCip).toHaveAttribute('aria-pressed', 'true');
  const sure30 = page.locator('[data-sure="30"]');
  await expect(sure30).toHaveAttribute('aria-pressed', 'true');

  // --- 3) Kalıcılık: sayfa yeniden açıldığında son ayar hâlâ geçerli ---
  await page.goto('/');
  const yardim2 = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim2.isVisible().catch(() => false)) await yardim2.click();
  await page.locator('[data-mod="antrenman"]').click();

  await expect(page.locator('[data-seviye="zor"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-sure="30"]')).toHaveAttribute('aria-pressed', 'true');

  // --- 4) Seviye değişince oturum puanı sıfırlanır ---
  await page.locator('[data-seviye="normal"]').click();
  await page.locator('[data-alan="basla"]').click();
  await expect(page.locator('[data-alan="hedef"]')).toBeVisible();
  // Yeni seviyede henüz hiç tur bitmedi; oturum göstergesi "1. tur" olmalı.
  const gostergeMetin2 = (await page.locator('[data-alan="oturum-gostergesi"]').textContent()) ?? '';
  expect(gostergeMetin2).toContain('1. tur');
  expect(gostergeMetin2).toMatch(/0\s*puan/);
});
