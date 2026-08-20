/**
 * durumCubugu.ts — Android durum çubuğu ayarları.
 *
 * `@capacitor/status-bar` kullanarak:
 * - Overlay kapatılır (webview durum çubuğunun altına girmez)
 * - Arka plan rengi tema rengiyle (#0A0E1A) eşlenir
 * - Yazı rengi açık yapılır (koyu arka plan üstünde beyaz saat/pil)
 *
 * Web'de import edilen sınıf yoktur; tüm çağrılar sessizce atlanır.
 */

import { nativeMi } from './platform';

export async function durumCubuguAyarla(): Promise<void> {
  if (!nativeMi()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');

    // Webview'ın durum çubuğunun altına uzanmasını kapat.
    // Böylece safe-area-inset-top'a gerek kalmaz — sistem otomatik
    // olarak webview'ı durum çubuğunun altından başlatır.
    await StatusBar.setOverlaysWebView({ overlay: false });

    // Arka plan rengini tema rengiyle eşitle.
    await StatusBar.setBackgroundColor({ color: '#0A0E1A' });

    // Koyu arka plan üstünde açık renkli simgeler (saat, pil, sinyal).
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    // Status bar eklentisi yoksa veya web'deyse sessizce devam et.
  }
}
