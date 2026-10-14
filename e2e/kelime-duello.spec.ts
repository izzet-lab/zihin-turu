import { test, expect } from '@playwright/test';
import { girisYap, testHesabiVarMi, duelloyuTemizle, TEST_EPOSTALAR } from './duello-kimlik';
import { kutlamayiKapat } from './oyun-yardimcilari';

/*
  KELİME DÜELLOSU

  Faz 6'nın son parçası: kelime turu artık düelloya giriyor.

  Burada korunan şey, kelime maçının SAYI tahtasını açmaması. Düello
  ve arena sunucu kodu uzun süre sayı turunu doğrudan çağırıyordu;
  arayüz genişletildikten sonra maçın `oyun` alanı tahtayı seçiyor.

  Eşleştirme kuyruğu da oyuna göre ayrıldı (göç 014): sayı bekleyen
  bir oyuncuyla kelime bekleyen bir oyuncu eşleşirse biri yanlış
  oyunu oynar.
*/

test('kelime düellosu kelime tahtasını açar, sayı tahtasını değil', async ({ browser }) => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');
  // Kelime ekranı önce sözlüğü indiriyor; temizleme döngüsüyle birlikte
  // varsayılan 40 saniye yetmiyor.
  test.setTimeout(180_000);

  const baglam = await browser.newContext();
  await girisYap(baglam, TEST_EPOSTALAR[0]);
  const page = await baglam.newPage();

  // Önceki testten kalan maç varsa terk edilir; testler bağımsız olsun.
  // Seviye `cocuk`: test hesabının deposu boş, yalnızca o açık.
  await duelloyuTemizle(page, 'cocuk', 'kelime');
  // Rakip yoksa 8 saniyede bot devreye giriyor; maç mutlaka başlıyor.
  await page.locator('[data-alan="duello-rastgele"]').click();

  const raf = page.locator('[data-alan="kelime-raf"]');
  await expect(raf).toBeVisible({ timeout: 60_000 });

  // Harf rafı geldi; sayı tahtası YOK.
  await expect(page.locator('[data-alan="raf"]')).toHaveCount(0);
  await expect(page.locator('[data-alan="islemler"]')).toHaveCount(0);
  // Isınma seviyesi yedi harf verir (Normal 8, Zor 9, Usta 10).
  await expect(raf.locator('button')).toHaveCount(7);

  // Düello üst bilgisi ortak bileşenden geliyor.
  await expect(page.locator('[data-alan="duello-gostergesi"]')).toBeVisible();
  await expect(page.locator('[data-alan="rakip-durumu"]')).toBeVisible();

  await baglam.close();
});

test('sayı düellosu hâlâ sayı tahtasını açar', async ({ browser }) => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');
  test.setTimeout(180_000);

  const baglam = await browser.newContext();
  await girisYap(baglam, TEST_EPOSTALAR[1]);
  const page = await baglam.newPage();
  await duelloyuTemizle(page, 'cocuk', 'sayi');
  await page.locator('[data-alan="duello-rastgele"]').click();

  await expect(page.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-alan="kelime-raf"]')).toHaveCount(0);

  await baglam.close();
});

/*
  RÖVANŞ OYUNU KORUMALI

  Proje sahibi cihazda buldu (14 Ekim 2026): kelime turu düellosunda
  rövanşa basınca SAYI tahtası açılıyordu. Sebep sunucudaydı — yeni maç
  kurulurken oyun bilgisi taşınmıyor, maç satırına her zaman 'sayi'
  yazılıyordu. Aynı kusur özel odada da vardı.

  Bu test maçı bota karşı sonuna kadar oynayıp rövanş istiyor ve yeni
  maçta harf rafının geldiğini doğruluyor. Yavaş bir test: her turda
  botun taban gecikmesi (tur süresinin yarısı) bekleniyor. Yine de
  değer: bu hata canlıya çıktı.
*/
test('kelime düellosunda rövanş yine kelime turu açar', async ({ browser }) => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');
  test.setTimeout(420_000);

  const baglam = await browser.newContext();
  await girisYap(baglam, TEST_EPOSTALAR[0]);
  const page = await baglam.newPage();

  await duelloyuTemizle(page, 'cocuk', 'kelime');
  await page.locator('[data-alan="duello-rastgele"]').click();
  await expect(page.locator('[data-alan="kelime-raf"]')).toBeVisible({ timeout: 60_000 });

  // Maçı bitir. Kelime yazmadan "Bitir" demek geçerli bir cevap
  // (sıfır puan); amaç turları kapatmak, iyi oynamak değil.
  const sonuc = page.locator('[data-alan="duello-sonuc"]');
  for (let tur = 1; tur <= 5; tur++) {
    if (await sonuc.isVisible().catch(() => false)) break;
    const bitir = page.locator('[data-alan="kelime-bitir"]');
    await bitir.waitFor({ timeout: 90_000 }).catch(() => {});
    if (!(await bitir.isVisible().catch(() => false))) break;
    await bitir.click();
    // Tur, botun gecikmesi dolunca kapanıyor; sıradaki turun rafını
    // ya da maç sonucunu bekle.
    await page
      .waitForFunction(
        (t) =>
          !!document.querySelector('[data-alan="duello-sonuc"]') ||
          Number(
            document
              .querySelector('[data-alan="duello-gostergesi"]')
              ?.textContent?.match(/Tur (\d+)/)?.[1] ?? 0,
          ) > t,
        tur,
        { timeout: 120_000 },
      )
      .catch(() => {});
  }

  await expect(sonuc).toBeVisible({ timeout: 120_000 });
  await kutlamayiKapat(page);

  await page.locator('[data-alan="duello-revans"]').click();

  // ASIL İDDİA: rövanş maçı da kelime turu.
  await expect(page.locator('[data-alan="kelime-raf"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-alan="raf"]')).toHaveCount(0);
  await expect(page.locator('[data-alan="islemler"]')).toHaveCount(0);

  await baglam.close();
});
