/**
 * durumCubugu.ts — Android durum çubuğu ayarları.
 *
 * ÖNEMLİ — neden burası tek başına yetmiyor:
 * Android 15'ten itibaren (targetSdk 35+) uygulama pencereyi baştan
 * sona kaplar. `setOverlaysWebView(false)` ve `setBackgroundColor`
 * artık yok sayılıyor; sistem "webview'ı durum çubuğunun altından
 * başlat" isteğini kabul etmiyor. Ekranın üstündeki beyaz şerit de
 * bundandı: durum çubuğunun arkasında uygulamanın kendi penceresi
 * duruyor ve o pencere açık temadan gelen beyaz renkteydi.
 *
 * Gerçek çözüm iki yerde:
 * 1. Android teması (res/values/styles.xml) — pencere arka planı
 *    #0A0E1A'ya sabitlendi; uygulama daha ilk karede doğru renkte açılır.
 * 2. CSS (stil.css) — `env(safe-area-inset-*)` ile boşluk bırakılır ve
 *    html/body zemini boyanır.
 *
 * Buradaki çağrılar tamamlayıcı: yazı/simge rengini açık yapar ve eski
 * Android sürümlerinde (14 ve altı) overlay/arka plan ayarını korur.
 */

import { nativeMi } from './platform';

export async function durumCubuguAyarla(): Promise<void> {
  if (!nativeMi()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');

    // Koyu arka plan üstünde açık renkli simgeler (saat, pil, sinyal).
    // Yeni ve eski Android sürümlerinin hepsinde geçerli olan tek ayar bu.
    await StatusBar.setStyle({ style: Style.Dark });

    // Aşağıdaki ikisi yalnızca Android 14 ve altında iş görür; yeni
    // sürümlerde sessizce yok sayılır. Hata verirlerse akış bozulmasın
    // diye ayrı ayrı sarmalanır.
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#0A0E1A' });
    } catch {
      // Yeni Android: bu ayarlar desteklenmiyor, tema hallediyor.
    }
  } catch {
    // Status bar eklentisi yoksa veya web'deyse sessizce devam et.
  }
}
