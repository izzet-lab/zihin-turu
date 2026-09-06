import { test, expect, type Page } from '@playwright/test';
import { zinciriBulVeOyna } from './oyun-yardimcilari';
import { girisYap, testHesabiVarMi, TEST_EPOSTALAR } from './duello-kimlik';

/*
  GERÇEK DÜELLO — iki tarayıcı, iki hesap, tek maç.

  Buraya kadar düellonun sunucu mantığı veritabanı taklidiyle, arayüzü
  de kimliksiz kısmıyla doğrulanmıştı. Bu test ilk kez uçtan uca bir maç
  oynatıyor: eşleştirme, tur akışı, rakibin uzaklığının canlı gitmesi ve
  maçın bitmesi.

  Test hesapları `.env.test` dosyasından okunur; dosya yoksa test
  atlanır (kimlik bilgileri repoya girmiyor).
*/

test.describe('düello maçı', () => {
  test.skip(!testHesabiVarMi(), '.env.test yok — test hesapları tanımlı değil');

  test('iki oyuncu eşleşir, maç oynanır ve sonuç iki tarafta da aynı çıkar', async ({
    browser,
  }) => {
    // Beş tura kadar sürebilir; varsayılan süre yetmez.
    test.setTimeout(240_000);

    const baglam1 = await browser.newContext();
    const baglam2 = await browser.newContext();
    await girisYap(baglam1, TEST_EPOSTALAR[0]!);
    await girisYap(baglam2, TEST_EPOSTALAR[1]!);

    const sayfa1 = await baglam1.newPage();
    const sayfa2 = await baglam2.newPage();

    // İkisi de neredeyse aynı anda kuyruğa girmeli: sekiz saniye
    // içinde eşleşmezlerse birine bot atanır ve maç birbirleriyle olmaz.
    await Promise.all([
      sayfa1.goto('/duello?seviye=cocuk'),
      sayfa2.goto('/duello?seviye=cocuk'),
    ]);

    // Eşleşme: iki tarafta da tahta açılmalı.
    await Promise.all([
      expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
      expect(sayfa2.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
    ]);

    // Gerçekten birbirleriyle eşleştiler mi? Bota düşseydi rakip adı
    // bot adı olurdu; burada iki tarafta da "Rakip" yazar.
    await expect(sayfa1.locator('[data-alan="rakip-durumu"]')).toBeVisible();
    await expect(sayfa2.locator('[data-alan="rakip-durumu"]')).toBeVisible();

    // --- Birinci oyuncu turları çözüyor, ikincisi bekliyor ---
    // Tam isabet turu anında kapattığı için maç hızla ilerler.
    for (let tur = 1; tur <= 5; tur++) {
      const bittiMi = await sayfa1.locator('[data-alan="duello-sonuc"]').isVisible().catch(() => false);
      if (bittiMi) break;

      await sayfa1.locator('[data-alan="raf"]').waitFor({ timeout: 60_000 });
      await zinciriBulVeOyna(sayfa1);

      // Tur kapandı: ya yeni tur açıldı ya maç bitti.
      await turDegisimiBekle(sayfa1, tur);
    }

    // --- Sonuç iki tarafta da tutarlı olmalı ---
    await expect(sayfa1.locator('[data-alan="duello-sonuc"]')).toBeVisible({ timeout: 120_000 });
    await expect(sayfa2.locator('[data-alan="duello-sonuc"]')).toBeVisible({ timeout: 120_000 });

    const sonuc1 = (await sayfa1.locator('[data-alan="duello-sonuc"]').textContent()) ?? '';
    const sonuc2 = (await sayfa2.locator('[data-alan="duello-sonuc"]').textContent()) ?? '';

    // Turları çözen kazanır; diğeri kaybeder. İkisi birden kazanamaz.
    expect(sonuc1).toContain('Kazandın');
    expect(sonuc2).toContain('Kaybettin');

    // Skorlar birbirinin aynası olmalı.
    const skor1 = (await sayfa1.locator('[data-alan="duello-skor"]').textContent()) ?? '';
    const skor2 = (await sayfa2.locator('[data-alan="duello-skor"]').textContent()) ?? '';
    const [a1, b1] = skor1.split('—').map((n) => Number(n.trim()));
    const [a2, b2] = skor2.split('—').map((n) => Number(n.trim()));
    expect(a1).toBe(b2);
    expect(b1).toBe(a2);

    await baglam1.close();
    await baglam2.close();
  });

  test('rakibin yalnızca uzaklığı görünür — adımı asla gitmez (kural 8)', async ({ browser }) => {
    test.setTimeout(180_000);

    const baglam1 = await browser.newContext();
    const baglam2 = await browser.newContext();
    await girisYap(baglam1, TEST_EPOSTALAR[0]!);
    await girisYap(baglam2, TEST_EPOSTALAR[1]!);

    const sayfa1 = await baglam1.newPage();
    const sayfa2 = await baglam2.newPage();

    // Ağdan geçen her şeyi topla: rakibin adımları hiçbirinde olmamalı.
    const govdeler: string[] = [];
    sayfa2.on('response', async (yanit) => {
      const url = yanit.url();
      if (!url.includes('/duello-') && !url.includes('duello_tur')) return;
      try {
        govdeler.push(await yanit.text());
      } catch {
        /* gövdesi okunamayan yanıtlar önemsiz */
      }
    });

    await Promise.all([
      sayfa1.goto('/duello?seviye=cocuk'),
      sayfa2.goto('/duello?seviye=cocuk'),
    ]);

    await Promise.all([
      expect(sayfa1.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
      expect(sayfa2.locator('[data-alan="raf"]')).toBeVisible({ timeout: 60_000 }),
    ]);

    // Birinci oyuncu hamle yapıyor; ikincisi rakibinin ilerlediğini görmeli.
    await zinciriBulVeOyna(sayfa1);

    await expect(sayfa2.locator('[data-alan="rakip-uzaklik"]')).not.toContainText(
      'henüz bir şey yok',
      { timeout: 30_000 },
    );

    // İkinci oyuncunun ekranında rakibin zinciri hiçbir yerde geçmemeli.
    const ekran2 = (await sayfa2.locator('main').innerText()) ?? '';
    expect(ekran2).not.toMatch(/adimlar|zincir/i);

    // Ağdan gelen hiçbir gövdede adım listesi olmamalı.
    for (const govde of govdeler) {
      expect(govde, 'sunucu yanıtında adım listesi var').not.toMatch(/"adimlar"/);
    }

    await baglam1.close();
    await baglam2.close();
  });
});

/** Tur numarasının değişmesini ya da maçın bitmesini bekler. */
async function turDegisimiBekle(sayfa: Page, mevcutTur: number): Promise<void> {
  await sayfa
    .waitForFunction(
      (tur) => {
        const bitti = document.querySelector('[data-alan="duello-sonuc"]');
        if (bitti) return true;
        const gosterge = document.querySelector('[data-alan="duello-gostergesi"]');
        if (!gosterge) return false;
        const eslesme = gosterge.textContent?.match(/Tur (\d+)/);
        return eslesme ? Number(eslesme[1]) > tur : false;
      },
      mevcutTur,
      { timeout: 90_000 },
    )
    .catch(() => {
      /* süre dolabilir; dış döngü durumu yeniden okur */
    });
}
