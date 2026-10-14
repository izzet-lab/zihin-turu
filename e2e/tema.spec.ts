import { test, expect } from '@playwright/test';

/*
  GÖRÜNÜM SEÇİMİ

  Üç seçenek var: Gündüz, Gece, Sistem. Varsayılan "Sistem" — telefonun
  ayarını izler. Oyuncunun seçimi kalıcı saklanır; uygulamayı kapatıp
  açınca aynı temayla açılmalı.

  Tema `<html>` üstündeki `data-tema` özniteliğiyle taşınıyor.
  "Sistem" seçilince öznitelik SİLİNİYOR; karar tamamen CSS'e kalıyor
  ve telefon ayarı değişince uygulama kendiliğinden uyuyor.
*/

async function menuyuAc(sayfa: import('@playwright/test').Page) {
  await sayfa.getByRole('button', { name: 'Kapat' }).first().click().catch(() => {});
  await sayfa.locator('[data-alan="menu-ac"]').click();
  await expect(sayfa.locator('[data-alan="tema-secici"]')).toBeVisible();
}

test('varsayılan sistem ayarını izler', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  // Öznitelik yok demek: kararı medya sorgusu veriyor.
  await expect(page.locator('html')).not.toHaveAttribute('data-tema', /.*/);

  await menuyuAc(page);
  await expect(page.locator('[data-tema-secim="sistem"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('gündüz seçilir, sayfa yenilenince durur', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await menuyuAc(page);

  await page.locator('[data-tema-secim="gunduz"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'gunduz');

  // Kalıcı: yenileme sonrası da gündüz. Üstelik İLK BOYAMADAN önce
  // uygulanıyor; ekran bir an yanlış temada yanıp sönmemeli.
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'gunduz');
});

test('sisteme dönülünce öznitelik silinir', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await menuyuAc(page);

  await page.locator('[data-tema-secim="gece"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'gece');

  await page.locator('[data-tema-secim="sistem"]').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-tema', /.*/);
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-tema', /.*/);
});

test('taşlar iki temada da aynı fildişi renkte', async ({ page }) => {
  /*
   * Temanın ana fikri: kâğıt değişir, taş değişmez. Taş fiziksel bir
   * nesne; ışık değişince eşyanın rengi değil gölgesi değişir.
   *
   * Tur kurmak yerine sayfaya bir taş yüzeyi ekleniyor: sınanan şey
   * oyunun akışı değil, stil kuralının temadan bağımsız olması.
   */
  const tasOlc = async (tema: 'gunduz' | 'gece') => {
    await page.evaluate((t) => document.documentElement.setAttribute('data-tema', t), tema);
    return page.evaluate(() => {
      const d = document.createElement('button');
      d.setAttribute('data-tas', '7');
      document.body.appendChild(d);
      const s = getComputedStyle(d);
      const sonuc = { zemin: s.backgroundColor, yazi: s.color };
      d.remove();
      return sonuc;
    });
  };

  await page.goto('/');
  await page.waitForTimeout(400);

  const gunduz = await tasOlc('gunduz');
  const gece = await tasOlc('gece');

  expect(gunduz.zemin).toBe(gece.zemin);
  expect(gunduz.yazi).toBe(gece.yazi);

  // Kâğıt ise DEĞİŞMELİ — yoksa tema hiç çalışmıyor demektir.
  const kagit = async (tema: 'gunduz' | 'gece') => {
    await page.evaluate((t) => document.documentElement.setAttribute('data-tema', t), tema);
    return page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--kagit').trim(),
    );
  };
  expect(await kagit('gunduz')).not.toBe(await kagit('gece'));
});
