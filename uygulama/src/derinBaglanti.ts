/**
 * derinBaglanti.ts — Android'de giriş bağlantısını yakalama
 *
 * E-postadaki sihirli bağlantıya (veya Google girişine) tıklandığında
 * Android, uygulamayı `com.zihinturu.app://giris#access_token=…`
 * biçiminde bir adresle açar. Tarayıcıdaki gibi otomatik oturum
 * kurulmaz — token'ı adresten çıkarıp Supabase'e elle vermemiz gerekir.
 *
 * İki olası biçim vardır:
 *   1. Hash: #access_token=…&refresh_token=…   (implicit akış)
 *   2. Sorgu: ?code=…                          (PKCE akışı)
 */

import { App } from '@capacitor/app';
import { supabase } from './supabase';
import { nativeMi } from './platform';

/** Uygulama açılışında bir kez çağrılır. Web'de hiçbir şey yapmaz. */
export function derinBaglantiDinle(): void {
  if (!nativeMi()) return;

  App.addListener('appUrlOpen', async ({ url }) => {
    try {
      await oturumKur(url);
    } catch (e) {
      console.error('[derinBaglanti] Oturum kurulamadı:', e);
    }
  });
}

/** Gelen adresten oturum bilgisini çıkarıp Supabase'e verir. */
async function oturumKur(url: string): Promise<void> {
  // 1. PKCE akışı: ?code=…
  const sorgu = url.split('?')[1]?.split('#')[0];
  if (sorgu) {
    const kod = new URLSearchParams(sorgu).get('code');
    if (kod) {
      await supabase.auth.exchangeCodeForSession(kod);
      window.location.href = '/';
      return;
    }
  }

  // 2. Implicit akış: #access_token=…&refresh_token=…
  const parca = url.split('#')[1];
  if (parca) {
    const p = new URLSearchParams(parca);
    const erisim = p.get('access_token');
    const yenileme = p.get('refresh_token');
    if (erisim && yenileme) {
      await supabase.auth.setSession({
        access_token: erisim,
        refresh_token: yenileme,
      });
      window.location.href = '/';
    }
  }
}
