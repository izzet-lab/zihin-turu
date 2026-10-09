import { test, expect, type Page } from '@playwright/test';
import { girisYap, testHesabiVarMi, TEST_EPOSTALAR } from './duello-kimlik';
import { kutlamayiKapat } from './oyun-yardimcilari';

/*
  ARENA — 5 kişilik eşzamanlı yarış.

  Gerçek bir arena beş kimlikli oyuncu ister; burada iki test hesabı
  kullanılıyor ve kalan koltuklar botla doluyor — zaten ürünün
  davranışı da bu.
*/

const DENEYIMLI = {
  surum: 2,
  seri: { son: null, gun: 0, enUzun: 0 },
  tam: 0,
  gunluk: {},
  acikSeviyeler: ['cocuk', 'normal', 'zor', 'usta'],
};

async function seviyeleriAc(baglam: import('@playwright/test').BrowserContext) {
  await baglam.addInitScript((t) => {
    window.localStorage.setItem('tamisabet.v2', JSON.stringify(t));
  }, DENEYIMLI);
}

/** Arenayı temiz bir başlangıca getirir: kalan yarış varsa çıkılır. */
async function arenayiTemizle(sayfa: Page, seviye = 'cocuk', oyun = 'sayi'): Promise<void> {
  for (let deneme = 0; deneme < 12; deneme++) {
    // `oyun` adres satırından düşerse ekran sayı turuna döner ve
    // kelime testi sayı arenası kurar.
    await sayfa.goto(`/arena?seviye=${seviye}&oyun=${oyun}`);
    await sayfa.waitForTimeout(1200);
    // Açık ödül töreni ekranı kaplıyor; önce o kapatılır.
    await kutlamayiKapat(sayfa);
    const gorunur = async (alan: string) =>
      sayfa.locator(`[data-alan="${alan}"]`).isVisible().catch(() => false);

    if (await gorunur('arena-katil')) return;

    for (const cikis of ['arena-bekleme-cik', 'arena-terk', 'arena-yeni', 'arena-tekrar-dene']) {
      if (await gorunur(cikis)) {
        await sayfa.locator(`[data-alan="${cikis}"]`).click();
        if (cikis === 'arena-terk') {
          await sayfa.locator('[data-alan="arena-terk-onay"]').click();
        }
        await sayfa.waitForTimeout(1000);
        break;
      }
    }
  }
  await sayfa.locator('[data-alan="arena-katil"]').waitFor({ timeout: 30_000 });
}

test.describe('arena', () => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');

  test('iki oyuncu katılır, boş koltuklar botla dolar, yarış başlar', async ({ browser }) => {
    test.setTimeout(240_000);

    const b1 = await browser.newContext();
    const b2 = await browser.newContext();
    await seviyeleriAc(b1);
    await seviyeleriAc(b2);
    await girisYap(b1, TEST_EPOSTALAR[0]!);
    await girisYap(b2, TEST_EPOSTALAR[1]!);
    const s1 = await b1.newPage();
    const s2 = await b2.newPage();

    await arenayiTemizle(s1);
    await arenayiTemizle(s2);

    // Önce seviye, sonra yarış — düellodaki sıranın aynısı.
    await expect(s1.locator('[data-alan="arena-seviyeler"]')).toBeVisible();

    await s1.locator('[data-alan="arena-katil"]').click();
    await expect(s1.locator('[data-alan="arena-bekleme"]')).toBeVisible({ timeout: 30_000 });

    await s2.locator('[data-alan="arena-katil"]').click();

    // Bekleme dolunca botlar koltukları doldurur ve tahta açılır.
    await expect(s1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });
    await expect(s2.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });

    // Beş yarışçı listede: iki oyuncu + üç bot.
    const yarisanlar = s1.locator('[data-alan="arena-yarisci"]');
    await expect(yarisanlar).toHaveCount(5);
    await expect(s1.locator('[data-alan="arena-yarisci"][data-ben="1"]')).toHaveCount(1);
    await expect(s1.locator('[data-alan="arena-gostergesi"]')).toContainText('Arena');

    await b1.close();
    await b2.close();
  });

  test('cevap kilitlenince bekleme ekranına geçilir', async ({ browser }) => {
    test.setTimeout(240_000);

    const b1 = await browser.newContext();
    await seviyeleriAc(b1);
    await girisYap(b1, TEST_EPOSTALAR[0]!);
    const s1 = await b1.newPage();

    await arenayiTemizle(s1);
    await s1.locator('[data-alan="arena-katil"]').click();

    // Tek başına katılınca bekleme dolunca dört botla başlar.
    await expect(s1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 });
    await expect(s1.locator('[data-alan="arena-yarisci"]')).toHaveCount(5);

    // Bir hamle yapıp cevabı kilitle.
    const taslar = s1.locator('[data-alan="raf"] [data-tas]');
    await taslar.nth(0).click();
    await s1.locator('[data-alan="islemler"] [data-islem="+"]').click();
    await taslar.nth(1).click();
    await s1.locator('[data-alan="bitir"]').click();

    await expect(s1.locator('[data-alan="arena-kilit-bekleme"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(s1.locator('[data-alan="raf"]')).toHaveCount(0);

    await b1.close();
  });

  test('misafir arenaya giremez', async ({ page }) => {
    await page.goto('/arena?seviye=normal');
    await expect(page.locator('[data-alan="arena-giris"]')).toBeVisible();
    await expect(page.locator('main')).toContainText('üye olman gerekiyor');
  });

  test('kurulumdaki arena düğmesi arenaya götürür', async ({ page }) => {
    await page.addInitScript((t) => {
      window.localStorage.setItem('tamisabet.v2', JSON.stringify(t));
    }, DENEYIMLI);
    await page.goto('/');
    const yardim = page.locator('[data-alan="yardim-anladim"]');
    if (await yardim.isVisible().catch(() => false)) await yardim.click();

    const dugme = page.locator('[data-mod="arena"]');
    await expect(dugme).toBeVisible();
    await expect(dugme).toContainText('Arena');
    await dugme.click();
    await expect(page).toHaveURL(/\/arena\?seviye=/);
  });
});

/*
  KELİME ARENASI

  Kelime turu artık arenaya da giriyor. Korunan şey aynı: kelime
  arenası SAYI tahtasını açmamalı. Arena durumu da maçın `oyun`
  alanını yayınlıyor, yoksa sekmesini yenileyen oyuncu yanlış tahtaya
  düşer.
*/
test('kelime arenası kelime tahtasını açar', async ({ browser }) => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');
  // Sözlük indirmesi ve bot bekleme süresi varsayılan sınıra sığmıyor.
  test.setTimeout(180_000);

  const baglam = await browser.newContext();
  await girisYap(baglam, TEST_EPOSTALAR[0]);
  const sayfa = await baglam.newPage();

  await arenayiTemizle(sayfa, 'cocuk', 'kelime');
  await sayfa.locator('[data-alan="arena-katil"]').click();

  const raf = sayfa.locator('[data-alan="kelime-raf"]');
  await expect(raf).toBeVisible({ timeout: 90_000 });

  // Sayı tahtası yok.
  await expect(sayfa.locator('[data-alan="raf"]')).toHaveCount(0);
  await expect(sayfa.locator('[data-alan="islemler"]')).toHaveCount(0);
  // Isınma seviyesi yedi harf verir.
  await expect(raf.locator('button')).toHaveCount(7);

  // Arena üst bilgisi ortak bileşenden geliyor: beş koltuk.
  await expect(sayfa.locator('[data-alan="arena-yarisci"]')).toHaveCount(5);

  await baglam.close();
});
