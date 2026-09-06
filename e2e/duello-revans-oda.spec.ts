import { test, expect } from '@playwright/test';
import { zinciriBulVeOyna } from './oyun-yardimcilari';
import { girisYap, testHesabiVarMi, duelloyuTemizle, TEST_EPOSTALAR } from './duello-kimlik';

/*
  Kuyruğa girmeden maç kurmanın iki yolu ve kopan bağlantıdan dönüş.

  Rövanş ve özel oda aynı işi yapıyor: belli iki oyuncuyu eşleştirmek.
  Bağlantı testi ise "kısa kopmada geri dönülebilsin" kuralının
  karşılığı — sekmeyi yenilemek maçı kaybettirmemeli.
*/

test.describe('rövanş, özel oda ve geri dönüş', () => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');

  test('özel oda: kod paylaşılır, arkadaş katılır, maç başlar', async ({ browser }) => {
    test.setTimeout(120_000);

    const baglam1 = await browser.newContext();
    const baglam2 = await browser.newContext();
    await girisYap(baglam1, TEST_EPOSTALAR[0]!);
    await girisYap(baglam2, TEST_EPOSTALAR[1]!);
    const sayfa1 = await baglam1.newPage();
    const sayfa2 = await baglam2.newPage();

    await duelloyuTemizle(sayfa1);
    await sayfa1.locator('[data-alan="oda-kur"]').click();

    const kodKutusu = sayfa1.locator('[data-alan="oda-kodu"]');
    await expect(kodKutusu).toBeVisible({ timeout: 30_000 });
    const kod = ((await kodKutusu.textContent()) ?? '').trim();
    expect(kod).toMatch(/^[A-Z0-9]{5}$/);

    // Arkadaş kodu girip katılıyor.
    await duelloyuTemizle(sayfa2);
    await sayfa2.locator('[data-alan="oda-kod-girdi"]').fill(kod);
    await sayfa2.locator('[data-alan="oda-katil"]').click();

    // İki tarafta da tahta açılmalı: oda kuran taraf beklemeden maça girer.
    await Promise.all([
      expect(sayfa2.locator('[data-alan="raf"]')).toBeVisible({ timeout: 30_000 }),
      expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 30_000 }),
    ]);

    await baglam1.close();
    await baglam2.close();
  });

  test('kopan bağlantı: sekme yenilenince maça geri dönülür', async ({ browser }) => {
    test.setTimeout(150_000);

    const baglam1 = await browser.newContext();
    const baglam2 = await browser.newContext();
    await girisYap(baglam1, TEST_EPOSTALAR[0]!);
    await girisYap(baglam2, TEST_EPOSTALAR[1]!);
    const sayfa1 = await baglam1.newPage();
    const sayfa2 = await baglam2.newPage();

    // Önceki testten kalan maç varsa terk edilir; testler bağımsız olsun.
    await duelloyuTemizle(sayfa1);
    await duelloyuTemizle(sayfa2);
    await Promise.all([
      sayfa1.locator('[data-alan="duello-rastgele"]').click(),
      sayfa2.locator('[data-alan="duello-rastgele"]').click(),
    ]);
    await Promise.all([
      expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
      expect(sayfa2.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
    ]);

    // Bağlantı koptu gibi: sekmeyi baştan yükle.
    await sayfa1.reload();

    // Rakip bulma ekranına DEĞİL, süren maça dönmeli.
    await expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });
    await expect(sayfa1.locator('[data-alan="duello-gostergesi"]')).toBeVisible();

    await baglam1.close();
    await baglam2.close();
  });

  test('rövanş: biten maçtan iki taraf da aynı yeni maça girer', async ({ browser }) => {
    test.setTimeout(240_000);

    const baglam1 = await browser.newContext();
    const baglam2 = await browser.newContext();
    await girisYap(baglam1, TEST_EPOSTALAR[0]!);
    await girisYap(baglam2, TEST_EPOSTALAR[1]!);
    const sayfa1 = await baglam1.newPage();
    const sayfa2 = await baglam2.newPage();

    // Önceki testten kalan maç varsa terk edilir; testler bağımsız olsun.
    await duelloyuTemizle(sayfa1);
    await duelloyuTemizle(sayfa2);
    await Promise.all([
      sayfa1.locator('[data-alan="duello-rastgele"]').click(),
      sayfa2.locator('[data-alan="duello-rastgele"]').click(),
    ]);
    await Promise.all([
      expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
      expect(sayfa2.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
    ]);

    // Maçı bitir: birinci oyuncu turları çözüyor.
    for (let tur = 1; tur <= 5; tur++) {
      const bitti = await sayfa1
        .locator('[data-alan="duello-sonuc"]')
        .isVisible()
        .catch(() => false);
      if (bitti) break;
      await sayfa1.locator('[data-alan="raf"]').waitFor({ timeout: 60_000 });
      await zinciriBulVeOyna(sayfa1);
      await sayfa1
        .waitForFunction(
          (t) =>
            !!document.querySelector('[data-alan="duello-sonuc"]') ||
            Number(
              document
                .querySelector('[data-alan="duello-gostergesi"]')
                ?.textContent?.match(/Tur (\d+)/)?.[1] ?? 0,
            ) > t,
          tur,
          { timeout: 90_000 },
        )
        .catch(() => {});
    }

    await expect(sayfa1.locator('[data-alan="duello-sonuc"]')).toBeVisible({ timeout: 120_000 });
    await expect(sayfa2.locator('[data-alan="duello-sonuc"]')).toBeVisible({ timeout: 120_000 });

    // İki taraf da rövanş diyor; aynı maça girmeliler.
    await sayfa1.locator('[data-alan="duello-revans"]').click();
    await expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });

    await sayfa2.locator('[data-alan="duello-revans"]').click();
    await expect(sayfa2.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });

    // Aynı maçta olduklarının kanıtı: iki tarafta da aynı hedef görünür.
    const hedef1 = await sayfa1.locator('[data-alan="hedef"]').textContent();
    const hedef2 = await sayfa2.locator('[data-alan="hedef"]').textContent();
    expect(hedef1).toBe(hedef2);

    await baglam1.close();
    await baglam2.close();
  });
});
