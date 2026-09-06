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

/** Test hesabıyla oturum açar ve oturumu tarayıcı deposuna yazar. */
export async function girisYap(baglam: BrowserContext, eposta: string): Promise<void> {
  const yanit = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: eposta, password: test.DUELLO_TEST_PAROLA }),
  });
  const oturum = await yanit.json();
  if (!oturum.access_token) {
    throw new Error(`Test hesabıyla giriş başarısız: ${JSON.stringify(oturum).slice(0, 200)}`);
  }

  const anahtar = depoAnahtari();
  await baglam.addInitScript(
    ([a, o]) => {
      window.localStorage.setItem(a as string, JSON.stringify(o));
    },
    [anahtar, oturum] as const,
  );
}
