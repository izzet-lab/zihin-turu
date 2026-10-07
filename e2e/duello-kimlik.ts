import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';

/**
 * duello-kimlik.ts — e2e testleri için test hesabıyla giriş.
 *
 * NEDEN PAROLAYLA
 * Uygulamanın gerçek giriş yolları e-posta bağlantısı ve Google; ikisi
 * de otomatik testte kullanılamaz (posta kutusu gerekir). Test
 * hesaplarına yalnızca test için parola tanımlandı ve oturum doğrudan
 * tarayıcı deposuna yazılıyor. Uygulama koduna test kapısı AÇILMADI —
 * giriş akışına dokunulmadı.
 *
 * KİMLİK BİLGİLERİ REPODA DEĞİL
 * `.env.test` dosyasından okunur ve o dosya `.gitignore`'da. Dosya
 * yoksa düello testleri atlanır (bkz. `testHesabiVarMi`).
 */

function envOku(dosya: string): Record<string, string> {
  const yol = path.resolve(process.cwd(), dosya);
  if (!fs.existsSync(yol)) return {};
  const cikti: Record<string, string> = {};
  for (const satir of fs.readFileSync(yol, 'utf8').split('\n')) {
    const temiz = satir.trim();
    if (!temiz || temiz.startsWith('#')) continue;
    const esit = temiz.indexOf('=');
    if (esit < 0) continue;
    cikti[temiz.slice(0, esit).trim()] = temiz.slice(esit + 1).trim();
  }
  return cikti;
}

const test = envOku('.env.test');
const uygulama = envOku('uygulama/.env');

const SUPABASE_URL = uygulama.VITE_SUPABASE_URL ?? '';
const ANON = uygulama.VITE_SUPABASE_ANON_KEY ?? '';

/** Test hesapları tanımlı mı? Değilse düello testleri atlanır. */
export function testHesabiVarMi(): boolean {
  return Boolean(
    test.DUELLO_TEST_EPOSTA_1 && test.DUELLO_TEST_EPOSTA_2 && test.DUELLO_TEST_PAROLA && SUPABASE_URL && ANON,
  );
}

export const TEST_EPOSTALAR = [test.DUELLO_TEST_EPOSTA_1, test.DUELLO_TEST_EPOSTA_2];

/** Supabase'in tarayıcıda oturumu sakladığı anahtar. */
function depoAnahtari(): string {
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

/*
 * OTURUM ÖNBELLEĞİ
 *
 * Her test her hesap için yeniden giriş yapıyordu. Düello testleri
 * çoğalınca kısa sürede onlarca giriş isteği gidiyor ve Supabase bir
 * noktada isteği düşürüyordu ("fetch failed") — ürün değil, test
 * altyapısı kaynaklı kırmızı. Oturum artık süreç boyunca bir kez
 * alınıp yeniden kullanılıyor.
 */
const oturumOnbellek = new Map<string, Record<string, unknown>>();

async function oturumAl(eposta: string): Promise<Record<string, unknown>> {
  const onbellekli = oturumOnbellek.get(eposta);
  if (onbellekli) return onbellekli;

  let sonHata = '';
  for (let deneme = 0; deneme < 3; deneme++) {
    try {
      const yanit = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: eposta, password: test.DUELLO_TEST_PAROLA }),
      });
      const oturum = await yanit.json();
      if (oturum?.access_token) {
        oturumOnbellek.set(eposta, oturum);
        return oturum;
      }
      sonHata = JSON.stringify(oturum).slice(0, 200);
    } catch (e) {
      sonHata = String(e);
    }
    await new Promise((r) => setTimeout(r, 1500 * (deneme + 1)));
  }
  throw new Error(`Test hesabıyla giriş başarısız: ${sonHata}`);
}

/** Test hesabıyla oturum açar ve oturumu tarayıcı deposuna yazar. */
export async function girisYap(baglam: BrowserContext, eposta: string): Promise<void> {
  const oturum = await oturumAl(eposta);

  const anahtar = depoAnahtari();
  await baglam.addInitScript(
    ([a, o]) => {
      window.localStorage.setItem(a as string, JSON.stringify(o));
    },
    [anahtar, oturum] as const,
  );
}

/**
 * Sayfayı düello ekranında TEMİZ bir başlangıca getirir.
 *
 * Önceki testten kalan süren bir maç varsa oyuncu doğrudan o maça
 * düşer (bu doğru davranış — kopan bağlantıdan dönüş böyle çalışıyor).
 * Testlerin birbirinden bağımsız olması için kalan maç terk edilir.
 */
export async function duelloyuTemizle(
  sayfa: import('@playwright/test').Page,
  seviye = 'cocuk',
): Promise<void> {
  // Önceki testten kalan durum ne olursa olsun seçim ekranına dönülür:
  // süren maç terk edilir, biten maç ekranı kapatılır, hata ekranı
  // yeniden denenir.
  //
  // Dışarıdan bakınca abartılı görünebilir ama gerek var: iki test
  // hesabı bütün düello testlerinde paylaşılıyor ve bir hesabın birden
  // fazla yarım maçı kalabiliyor. Seçim ekranına ulaşmak tek başına
  // yetmiyor; sayfa yeniden yüklendiğinde başka bir maç ortaya
  // çıkabiliyor. Bu yüzden temiz sayılmak için ÜST ÜSTE İKİ KEZ seçim
  // ekranı görülmesi isteniyor.
  let temizSayim = 0;

  for (let deneme = 0; deneme < 14; deneme++) {
    await sayfa.goto(`/duello?seviye=${seviye}`);
    await sayfa.waitForTimeout(1200);

    const gorunur = async (alan: string) =>
      sayfa.locator(`[data-alan="${alan}"]`).isVisible().catch(() => false);

    if (await gorunur('duello-rastgele')) {
      temizSayim += 1;
      if (temizSayim >= 2) return;
      continue;
    }
    temizSayim = 0;

    if (await gorunur('duello-terk')) {
      await sayfa.locator('[data-alan="duello-terk"]').click();
      await sayfa.locator('[data-alan="duello-terk-onay"]').click();
      await sayfa.waitForTimeout(1000);
      continue;
    }

    if (await gorunur('duello-yeni')) {
      await sayfa.locator('[data-alan="duello-yeni"]').click();
      await sayfa.waitForTimeout(1000);
      continue;
    }

    if (await gorunur('duello-tekrar-dene')) {
      await sayfa.locator('[data-alan="duello-tekrar-dene"]').click();
      await sayfa.waitForTimeout(1000);
      continue;
    }

    await sayfa.waitForTimeout(1500);
  }

  await sayfa.locator('[data-alan="duello-rastgele"]').waitFor({ timeout: 30_000 });
}
