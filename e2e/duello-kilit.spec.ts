import { test, expect, type Page } from '@playwright/test';
import { girisYap, testHesabiVarMi, duelloyuTemizle, TEST_EPOSTALAR } from './duello-kimlik';

/*
  "BİTİR" ÇALIŞMIYOR SORUNU

  Tam isabet bulamayan oyuncu "Bitir"e bastığında hiçbir şey olmuyordu:
  tur süresi dolana kadar açık kalıyor, ekran değişmiyor, oyuncu oyunu
  bozuk sanıyordu.

  Kural değişmedi — yaklaşık cevap turu tek başına kapatmaz. Değişen:
  düğme ne yaptığını söylüyor ("Cevabı kilitle"), kilitleyen oyuncu
  bekleme ekranına geçiyor ve İKİ TARAF DA kilitlediğinde tur hemen
  kapanıyor.
*/

/** Rafta bir işlem yapar — hedefe ulaşmayan, sıradan bir hamle. */
async function tekHamleYap(sayfa: Page): Promise<void> {
  const taslar = sayfa.locator('[data-alan="raf"] [data-tas]');
  await taslar.first().waitFor({ timeout: 30_000 });
  await taslar.nth(0).click();
  await sayfa.locator('[data-alan="islemler"] [data-islem="+"]').click();
  await taslar.nth(1).click();
}

test.describe('cevabı kilitleme', () => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');

  test('iki taraf da kilitleyince tur hemen kapanır', async ({ browser }) => {
    test.setTimeout(180_000);

    const baglam1 = await browser.newContext();
    const baglam2 = await browser.newContext();
    await girisYap(baglam1, TEST_EPOSTALAR[0]!);
    await girisYap(baglam2, TEST_EPOSTALAR[1]!);
    const sayfa1 = await baglam1.newPage();
    const sayfa2 = await baglam2.newPage();

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

    // Düğme düelloda ne yaptığını söylüyor.
    await expect(sayfa1.locator('[data-alan="bitir"]')).toContainText('Cevabı kilitle');

    // Birinci oyuncu yaklaşık bir cevap verip kilitliyor.
    await tekHamleYap(sayfa1);
    await sayfa1.locator('[data-alan="bitir"]').click();

    // Ekran DEĞİŞMELİ: bekleme ekranı çıkar, tahta kalkar.
    await expect(sayfa1.locator('[data-alan="duello-kilit-bekleme"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(sayfa1.locator('[data-alan="raf"]')).toHaveCount(0);

    // Tur henüz kapanmadı: rakip hâlâ oynuyor.
    await expect(sayfa2.locator('[data-alan="duello-gostergesi"]')).toContainText('Tur 1/5');

    // İkinci oyuncu da kilitleyince tur kapanır ve İKİ TARAFTA da
    // ikinci tur açılır.
    await tekHamleYap(sayfa2);
    await sayfa2.locator('[data-alan="bitir"]').click();

    await expect(sayfa1.locator('[data-alan="duello-gostergesi"]')).toContainText('Tur 2/5', {
      timeout: 60_000,
    });
    await expect(sayfa2.locator('[data-alan="duello-gostergesi"]')).toContainText('Tur 2/5', {
      timeout: 60_000,
    });

    // Yeni turda tahta geri gelir — bekleme ekranı kalıcı değil.
    await expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible();

    await baglam1.close();
    await baglam2.close();
  });

  test('uzun sayılar taşın dışına taşmıyor', async ({ browser }) => {
    test.setTimeout(120_000);

    const baglam = await browser.newContext();
    await girisYap(baglam, TEST_EPOSTALAR[0]!);
    // Usta kilitli gelirse düello ekranı açık bir seviyeye düşer ve
    // uzun sayılar hiç görünmez; test anlamsızlaşır. Seviyeler açılıyor.
    await baglam.addInitScript(() => {
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
    const sayfa = await baglam.newPage();

    // Usta seviyesi beş haneli hedefler ve altı haneye kadar ara
    // sonuçlar üretiyor; taşma orada görülüyordu.
    await duelloyuTemizle(sayfa, 'usta');
    await sayfa.locator('[data-alan="duello-rastgele"]').click();
    await expect(sayfa.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });

    // Büyük bir ara sonuç üret: iki büyük taşı çarp.
    await tekHamleYap(sayfa);

    // Hiçbir taş kendi kutusundan taşmamalı.
    const tasmalar = await sayfa.locator('[data-alan="raf"] [data-tas]').evaluateAll((els) =>
      els
        .map((e) => ({
          metin: e.textContent?.trim() ?? '',
          tasiyor: e.scrollWidth > e.clientWidth + 1,
        }))
        .filter((t) => t.tasiyor),
    );
    expect(tasmalar, 'taşan taşlar').toEqual([]);

    // Hedef ve "en yakın" da satırdan taşmamalı.
    const hedefTasiyor = await sayfa
      .locator('[data-alan="hedef"]')
      .evaluate((e) => e.scrollWidth > e.clientWidth + 1);
    expect(hedefTasiyor).toBe(false);

    await baglam.close();
  });
});

test.describe('düello seviye seçimi', () => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');

  test('önce seviye, sonra rakip — kilitli seviye seçilemez', async ({ browser }) => {
    test.setTimeout(120_000);

    const baglam = await browser.newContext();
    await girisYap(baglam, TEST_EPOSTALAR[0]!);
    // Yeni oyuncu gibi: yalnızca Isınma açık.
    await baglam.addInitScript(() => {
      window.localStorage.setItem(
        'tamisabet.v2',
        JSON.stringify({
          surum: 2,
          seri: { son: null, gun: 0, enUzun: 0 },
          tam: 0,
          gunluk: {},
          acikSeviyeler: ['cocuk'],
        }),
      );
    });
    const sayfa = await baglam.newPage();

    await duelloyuTemizle(sayfa);

    // Seviye seçici "Rakip bul"dan ÖNCE geliyor.
    const seviyeler = sayfa.locator('[data-alan="duello-seviyeler"]');
    await expect(seviyeler).toBeVisible();
    await expect(seviyeler.locator('[data-seviye="cocuk"]')).toBeEnabled();
    await expect(seviyeler.locator('[data-seviye="usta"]')).toBeDisabled();

    await baglam.close();
  });

  test('adres satırından kilitli seviye zorlanamaz', async ({ browser }) => {
    test.setTimeout(120_000);

    const baglam = await browser.newContext();
    await girisYap(baglam, TEST_EPOSTALAR[0]!);
    await baglam.addInitScript(() => {
      window.localStorage.setItem(
        'tamisabet.v2',
        JSON.stringify({
          surum: 2,
          seri: { son: null, gun: 0, enUzun: 0 },
          tam: 0,
          gunluk: {},
          acikSeviyeler: ['cocuk'],
        }),
      );
    });
    const sayfa = await baglam.newPage();

    // Kilitli seviye adresten isteniyor; açık olana düşmeli.
    await duelloyuTemizle(sayfa, 'usta');
    const secili = sayfa.locator('[data-alan="duello-seviyeler"] [aria-pressed="true"]');
    await expect(secili).toContainText('Isınma');

    await baglam.close();
  });
});
