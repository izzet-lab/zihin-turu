import { test, expect, type Page } from '@playwright/test';
import { zinciriBulVeOyna } from './oyun-yardimcilari';

/*
  Faz 2 kabul testi — gerçek tarayıcıda, uçtan uca:
  1) Günün Turu'nu aç, çözümü ARAYÜZDEN oynayarak tam isabet yap
  2) sonuç ekranının açıldığını doğrula
  3) paylaşım kartının üretildiğini (metin + görsel) doğrula
  4) kart metninde "=" işareti, işlem işaretleri (× ÷ −) ve ARA SONUÇLAR
     bulunmadığını doğrula (çözüm sızmamalı — CLAUDE.md 6)
  5) sayfayı yenile, günlük turun kilitli olduğunu doğrula

  Çözüm bağımsız bir çözücüyle bulunur ve arayüzde gerçekten tıklanarak
  oynanır (bkz. oyun-yardimcilari.ts) — "tam isabet" testte simüle
  edilmez, gerçekten elde edilir.
*/

/**
 * Bu senaryo "deneyimli" bir oyuncuyu test eder (seviye seçimi kilitli
 * değil). İlk-kez-oynayan kısıtlaması ayrı bir testte (ilk-kez.spec.ts)
 * kontrol ediliyor. localStorage'a önceden geçmiş yazarak deneyimli
 * duruma geçiyoruz — depo.ts'in "hiç oynamamışsa yalnızca Isınma açık"
 * kuralını devre dışı bırakan gerçek koşulu taklit ediyor.
 *
 * `addInitScript` sayfa/bağlam boyunca kalıcıdır ve HER navigasyonda
 * yeniden çalışır — bu yüzden yalnızca anahtar hiç yoksa yazar. Aksi
 * hâlde "sayfayı yenile" adımında oynanmış ilerleme, ikinci kez
 * çalışan bu betik tarafından sıfırlanmış hâliyle ezilir.
 */
async function tohumla(page: Page) {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('zihinturu.v2')) return; // gerçek ilerleme varsa dokunma
    window.localStorage.setItem(
      'zihinturu.v2',
      JSON.stringify({
        surum: 2,
        seri: { son: null, gun: 0, enUzun: 0 },
        tam: 0,
        gunluk: {},
        acikSeviyeler: ['cocuk', 'kolay', 'normal', 'zor', 'usta'],
      }),
    );
  });
}

async function kurulumuAc(page: Page) {
  await page.goto('/');
  // İlk açılışta tanıtım kendiliğinden çıkar; kapat ve devam et.
  const yardim = page.locator('[data-alan="yardim-anladim"]');
  if (await yardim.isVisible().catch(() => false)) await yardim.click();
  // Varsayılan mod Günün Turu; yine de açıkça seç.
  await page.locator('[data-mod="gunun"]').click();
  await page.locator('[data-seviye="normal"]').click();
}

test('günün turu: tam isabet, sonuç ekranı, paylaşım kartı sızıntısız, yenileyince kilit', async ({ page }) => {
  await tohumla(page);
  await kurulumuAc(page);

  await expect(page.locator('[data-alan="basla"]')).toBeVisible();
  await page.locator('[data-alan="basla"]').click();

  // --- Oyun ekranı: rafı oku, çözümü arayüzden gerçekten oyna ---
  const { hedef, zincir } = await zinciriBulVeOyna(page);

  // --- 1) Sonuç ekranı açıldı mı? ---
  const hukum = page.locator('[data-alan="hukum"]');
  await expect(hukum).toBeVisible({ timeout: 10_000 });
  await expect(hukum).toContainText('Tam isabet');
  // Sonuç ekranına özgü başka bir öğe de görünür olmalı (gerçekten o ekrandayız).
  await expect(page.locator('[data-alan="tahta"]')).toBeVisible();
  await expect(page.locator('[data-alan="puan"]')).toBeVisible();

  // --- 2) Paylaşım kartı üretildi mi? (metin + görsel) ---
  const payMetin = page.locator('[data-alan="pay-metin"]');
  await expect(payMetin).toBeVisible();
  await expect(payMetin).toContainText(String(hedef));
  const payGorsel = page.locator('[data-alan="pay-gorsel"]');
  await expect(payGorsel).toBeVisible();

  // --- 3) Kart metninde çözüm SIZMIYOR ---
  const metin = (await payMetin.textContent()) ?? '';
  // "=" işareti ve işlem işaretleri (× ÷ −) hiç geçmemeli.
  expect(metin).not.toContain('=');
  expect(metin).not.toMatch(/[×÷−]/);
  // Ara sonuçlar (hedef DIŞINDAKİ adım sonuçları) metinde geçmemeli.
  const araSonuclar = zincir.map((a) => a.sonuc).filter((s) => s !== hedef);
  for (const s of araSonuclar) {
    // Kısa/yaygın sayılar (ör. tek haneli) yanlış pozitif verebileceği için
    // yalnızca üç haneli ve üstü, hedeften farklı ara sonuçları denetliyoruz.
    if (String(s).length >= 3) {
      expect(metin, `ara sonuç ${s} kartta görünmemeli`).not.toContain(String(s));
    }
  }

  // Görsel gerçekten 1080 kare bir PNG mi?
  const boyut = await payGorsel.evaluate((img) => {
    const i = img as HTMLImageElement;
    return { w: i.naturalWidth, h: i.naturalHeight, png: i.src.startsWith('data:image/png') };
  });
  expect(boyut).toEqual({ w: 1080, h: 1080, png: true });

  // --- 4) Sayfayı yenile → günlük kilit dursun ---
  await kurulumuAc(page);
  await expect(page.locator('[data-alan="kilit"]')).toBeVisible();
  await expect(page.locator('[data-alan="kilit"]')).toContainText('tamamlandı');
  await expect(page.locator('[data-alan="basla"]')).toHaveCount(0);
});
