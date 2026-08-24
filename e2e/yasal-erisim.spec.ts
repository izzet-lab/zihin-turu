import { test, expect } from '@playwright/test';

/*
  Misafir de yasal metinlere ulaşabilmeli — bu bir tercih değil,
  zorunluluk.

  KVKK aydınlatma metninin erişilebilir olması yasal bir gereklilik;
  Play Store da uygulama içinde gizlilik politikasına ulaşılmasını
  şart koşuyor.

  Bu bağlantılar önceden Kurulum ve Sonuç ekranlarının alt bilgisinde
  duruyordu. Giriş yapan kullanıcı için profile taşındılar ve alt
  bilgiler kaldırıldı — ama MİSAFİRİN profili yok (profil sayfası bir
  kullanıcı adı ister). Erişim menüden sağlanıyor.

  Test tam da bunu koruyor: biri menüdeki "Gizlilik ve yasal" öğesini
  kaldırırsa, misafirin KVKK metnine hiçbir yolu kalmaz ve bu test
  kırmızı verir.
*/

test('misafir menüden yasal metinlere ve gizlilik ayarlarına ulaşır', async ({ page }) => {
  await page.goto('/');

  // İlk açılıştaki tanıtımı kapat.
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();

  // Menü her ekranda ve giriş yapmadan da açılır.
  await page.locator('[data-alan="menu-ac"]').click();
  const yasalAc = page.locator('[data-alan="yasal-ac"]');
  await expect(yasalAc).toBeVisible();
  await yasalAc.click();

  // Yasal indeks açıldı.
  await expect(page).toHaveURL(/\/yasal$/);
  const liste = page.locator('[data-alan="yasal-liste"]');
  await expect(liste).toBeVisible();

  // Dört yasal metin ve gizlilik ayarları burada.
  await expect(page.locator('[data-alan="yasal-gizlilik-ayarlari"]')).toBeVisible();
  await expect(page.locator('[data-alan="yasal-kvkk"]')).toBeVisible();
  await expect(page.locator('[data-alan="yasal-gizlilik"]')).toBeVisible();
  await expect(page.locator('[data-alan="yasal-cerez"]')).toBeVisible();
  await expect(page.locator('[data-alan="yasal-kullanim-kosullari"]')).toBeVisible();

  // "Hesabı sil" misafire GÖSTERİLMEZ — silinecek bir hesap yok.
  await expect(page.locator('[data-alan="yasal-hesap-sil"]')).toHaveCount(0);

  // KVKK metni gerçekten açılıyor mu?
  await page.locator('[data-alan="yasal-kvkk"]').click();
  await expect(page).toHaveURL(/\/yasal\/kvkk$/);
  await expect(page.locator('h1')).toContainText('KVKK');
});

test('yasal bağlantılar kurulum ekranının alt bilgisinde artık yok', async ({ page }) => {
  // Aynı bağlantılar hem alt bilgide hem profilde duruyordu; kopya
  // kaldırıldı. Geri gelirse iki ayrı yerde bakım gerekir ve biri
  // unutulur.
  await page.goto('/');
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();

  await expect(page.locator('footer')).toHaveCount(0);
});
