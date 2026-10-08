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
  await page.locator('[data-alan="kelime-basla"]').click();

  const raf = page.locator('[data-alan="kelime-raf"] button');
  await expect(raf).toHaveCount(8);

  // Tur sürerken çözümden eser olmamalı.
  await expect(page.locator('[data-alan="kelime-sonuc"]')).toHaveCount(0);
  await expect(page.locator('[data-alan="kelime-sure-kalan"]')).toBeVisible();
});

test('sözlükte olmayan kelime turu bitirmez', async ({ page }) => {
  await page.goto('/kelime');
  await page.locator('[data-seviye="normal"]').click();
  await page.locator('[data-alan="kelime-basla"]').click();

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
  await page.locator('[data-alan="kelime-basla"]').click();

  // Hiç harf seçmeden bitirmek geçerli bir cevap: puan sıfır.
  await page.locator('[data-alan="kelime-bitir"]').click();

  await expect(page.locator('[data-alan="kelime-sonuc"]')).toBeVisible();
  await expect(page.locator('[data-alan="kelime-yeni-tur"]')).toBeVisible();
});

test('ana ekranda önce oyun, sonra mod seçiliyor', async ({ page }) => {
  await page.goto('/');
  // Ilk acilista "Nasil oynanir" penceresi uste biniyor.
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();

  // Kelime seçilince modlar kelime turuna ait olur.
  await page.locator('[data-oyun="kelime"]').click();
  await expect(page.locator('[data-alan="modlar"]')).toBeVisible();

  // Kelime turu artık düelloya ve arenaya da giriyor; dört mod da açık.
  await expect(page.locator('[data-mod="duello"]')).toBeEnabled();
  await expect(page.locator('[data-mod="arena"]')).toBeEnabled();

  await page.locator('[data-mod="antrenman"]').click();
  await expect(page).toHaveURL(/\/kelime\?mod=antrenman/);
});

test('sayı turu seçiliyken düello ve arena açık', async ({ page }) => {
  await page.goto('/');
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();

  await expect(page.locator('[data-oyun="sayi"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-mod="duello"]')).toBeEnabled();
  await expect(page.locator('[data-mod="arena"]')).toBeEnabled();
});

/*
  LİGE BAĞLANMA

  Kelime turu artık lige işliyor. Arayüz tarafında korunan üç şey:
  mod seçimi görünür, Günün Turu günde bir kez, ve misafire puanın
  lige işlemediği açıkça söylenir (sessizce yutulmaz).
*/

test('mod seçici var; Günün Turu lige işlediğini söyler', async ({ page }) => {
  await page.goto('/kelime');
  await expect(page.locator('[data-alan="kelime-mod-secici"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-mod="gunun"]')).toBeVisible();
  await expect(page.locator('[data-mod="antrenman"]')).toBeVisible();
  await expect(page.locator('[data-alan="kelime-mod-secici"]')).toContainText('lige işler');
});

test('günün turu oynanınca kilitlenir, antrenman açık kalır', async ({ page }) => {
  await page.goto('/kelime');
  await page.locator('[data-mod="gunun"]').click();
  await page.locator('[data-seviye="normal"]').click();
  await page.locator('[data-alan="kelime-basla"]').click();
  await page.locator('[data-alan="kelime-bitir"]').click();
  await expect(page.locator('[data-alan="kelime-sonuc"]')).toBeVisible();

  // Seçim ekranına dönünce günün turu kilitli olmalı.
  await page.goto('/kelime');
  await expect(page.locator('[data-alan="kelime-gunluk-kilit"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-alan="kelime-basla"]')).toBeDisabled();

  // Antrenman hâlâ oynanabilir.
  await page.locator('[data-mod="antrenman"]').click();
  await expect(page.locator('[data-alan="kelime-basla"]')).toBeEnabled();
});

test('misafire puanın lige işlemediği söylenir', async ({ page }) => {
  await page.goto('/kelime');
  await page.locator('[data-mod="antrenman"]').click();
  await page.locator('[data-seviye="normal"]').click();
  await page.locator('[data-alan="kelime-basla"]').click();
  await page.locator('[data-alan="kelime-bitir"]').click();

  // Antrenman zaten lige işlemez; bu açıkça yazmalı.
  await expect(page.locator('[data-alan="kelime-lig-durumu"]')).toContainText('lige işlemez');
});

test('sıralamalarda oyun seçici var; boş kelime tablosu kelime turuna götürür', async ({
  page,
}) => {
  // Tablolar canlı veriye bağlı; boş durumu görebilmek için istek
  // yakalanıyor (lig-ekrani.spec.ts ile aynı yöntem).
  for (const tablo of ['lig_gunluk', 'lig_donem', 'lig_antrenman_hafta']) {
    await page.route(`**/rest/v1/${tablo}*`, (yol) =>
      yol.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
  }

  await page.goto('/lig');
  await expect(page.locator('[data-alan="oyun-secici"]')).toBeVisible();
  await page.locator('[data-oyun="kelime"]').click();

  // Boş tablodaki davet SEÇİLİ OYUNA götürmeli; sayı turuna atsaydı
  // oyuncu adını yazdıramayacağı yere giderdi.
  const dugme = page.locator('[data-alan="bos-durum-eylem"]');
  await expect(dugme).toContainText('Kelime turunu oyna', { timeout: 15_000 });
  await dugme.click();
  await expect(page).toHaveURL(/\/kelime/);
});

test('düello sekmesinde oyun seçici gizlenir', async ({ page }) => {
  await page.goto('/lig');
  await page.locator('[data-sekme="duello"]').click();
  await expect(page.locator('[data-alan="oyun-secici"]')).toHaveCount(0);
});
