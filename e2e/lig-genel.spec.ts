import { test, expect } from '@playwright/test';

/*
  GENEL SIRALAMA EKRANI

  Platformun ana tablosu: iki oyunun toplamı. Burada korunan şeyler:

  1. Ekran GENEL sekmesiyle açılıyor.
  2. Genel tabloda oyun ve seviye seçici YOK — tablo zaten iki oyunu
     ve bütün seviyeleri birlikte sayıyor. Seçici görünseydi oyuncu
     filtrelediğini sanırdı.
  3. Satırda dağılım görünüyor: toplam tek başına kimin dengeli
     olduğunu söylemiyor, tablonun bütün amacı o.
  4. Bir oyunu hiç oynamayana çağrı çıkıyor ve o oyuna götürüyor.

  Tablolar canlı veriye bağlı; satırlar istek yakalanarak kuruluyor
  (lig-ekrani.spec.ts ile aynı yöntem).
*/

/** Genel tabloya iki satır koyar: biri dengeli, biri tek yönlü. */
async function genelTabloyuKur(page: import('@playwright/test').Page) {
  await page.route('**/rest/v1/lig_genel_gunluk*', (yol) =>
    yol.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          oyuncu_id: 'a1',
          sayi_puan: 210,
          kelime_puan: 150,
          bonus: 90,
          toplam_puan: 450,
          oyuncu: { kullanici_adi: 'dengeli', xp: 600 },
        },
        {
          oyuncu_id: 'b2',
          sayi_puan: 300,
          kelime_puan: 0,
          bonus: 0,
          toplam_puan: 300,
          oyuncu: { kullanici_adi: 'tek_yonlu', xp: 100 },
        },
      ]),
    }),
  );
}

test('sıralamalar genel sekmesiyle açılıyor', async ({ page }) => {
  await page.goto('/lig');
  await expect(page.locator('[data-sekme="genel"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-alan="sekme-aciklama"]')).toContainText('İki oyunun toplamı');
});

test('genel tabloda oyun ve seviye seçici yok', async ({ page }) => {
  await page.goto('/lig');

  // Genel: seçici yok, dönem seçici var.
  await expect(page.locator('[data-alan="oyun-secici"]')).toHaveCount(0);
  await expect(page.locator('[data-alan="seviye-secici"]')).toHaveCount(0);
  await expect(page.locator('[data-alan="genel-donem-secici"]')).toBeVisible();

  // Günlük sekmesine geçince ikisi de geri geliyor.
  await page.locator('[data-sekme="gunluk"]').click();
  await expect(page.locator('[data-alan="oyun-secici"]')).toBeVisible();
  await expect(page.locator('[data-alan="seviye-secici"]')).toBeVisible();
  await expect(page.locator('[data-alan="genel-donem-secici"]')).toHaveCount(0);
});

test('künye ve açıklama genel tabloyu anlatıyor', async ({ page }) => {
  await page.goto('/lig');
  await expect(page.locator('[data-alan="tablo-kunyesi"]')).toContainText('Sayı + Kelime');
  // Ağırlıklar ve bonus oyuncuya yazıyla söyleniyor.
  const not = page.locator('[data-alan="genel-tablo-notu"]');
  await expect(not).toContainText('×0,6');
  await expect(not).toContainText('×1,8');
  await expect(not).toContainText('%25');
});

test('satırda dağılım ve çifte tur bonusu görünüyor', async ({ page }) => {
  await genelTabloyuKur(page);
  await page.goto('/lig');

  const satirlar = page.locator('[data-alan="lig-satir"]');
  await expect(satirlar.first()).toBeVisible({ timeout: 15_000 });

  const dengeli = satirlar.first();
  await expect(dengeli).toContainText('450');
  // Dağılım rakamla da yazıyor; çubuk tek başına sayı vermiyor.
  await expect(dengeli.locator('[data-alan="genel-dagilim"]')).toContainText('Sayı');
  await expect(dengeli.locator('[data-alan="genel-dagilim"]')).toContainText('150');
  await expect(dengeli.locator('[data-alan="genel-bonus"]')).toContainText('90');

  // Çubuğun iki parçası da çizilmiş.
  await expect(dengeli.locator('[data-pay="sayi"]')).toBeVisible();
  await expect(dengeli.locator('[data-pay="kelime"]')).toBeVisible();
});

test('tek oyun oynayanın satırında kelime payı çizilmiyor', async ({ page }) => {
  await genelTabloyuKur(page);
  await page.goto('/lig');

  const tekYonlu = page.locator('[data-alan="lig-satir"]').nth(1);
  await expect(tekYonlu).toBeVisible({ timeout: 15_000 });
  await expect(tekYonlu.locator('[data-pay="sayi"]')).toBeVisible();
  // Sıfır olan parça hiç çizilmiyor; ince bir şerit "biraz var" diye
  // okunuyordu.
  await expect(tekYonlu.locator('[data-pay="kelime"]')).toHaveCount(0);
  await expect(tekYonlu.locator('[data-alan="genel-bonus"]')).toHaveCount(0);
});

test('genel tablo boşken davet Günün Turuna götürüyor', async ({ page }) => {
  await page.route('**/rest/v1/lig_genel_gunluk*', (yol) =>
    yol.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.goto('/lig');

  const dugme = page.locator('[data-alan="bos-durum-eylem"]');
  await expect(dugme).toContainText('Günün Turunu oyna', { timeout: 15_000 });
  await dugme.click();
  await expect(page).toHaveURL(/mod=gunun/);
});

test('dönem seçimi haftalık ve aylık tabloya geçiyor', async ({ page }) => {
  let istenenTip = '';
  await page.route('**/rest/v1/lig_genel_donem*', (yol) => {
    // PostgREST süzgeci `donem_tipi=eq.hafta` biçiminde gönderiyor;
    // karşılaştırma ham değerle değil, içerdiğiyle yapılıyor.
    istenenTip = new URL(yol.request().url()).searchParams.get('donem_tipi') ?? '';
    return yol.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.goto('/lig');

  await page.locator('[data-genel-donem="haftalik"]').click();
  await expect.poll(() => istenenTip, { timeout: 15_000 }).toContain('hafta');

  await page.locator('[data-genel-donem="aylik"]').click();
  await expect.poll(() => istenenTip, { timeout: 15_000 }).toContain('ay');
});
