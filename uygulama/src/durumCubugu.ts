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
import { etkinTema } from './tema';

/** Kâğıdın rengi — durum çubuğu arkası da aynı olmalı. */
const KAGIT = { gunduz: '#E2E7EF', gece: '#1B212D' } as const;

/**
 * Durum çubuğunu temaya göre ayarlar.
 *
 * Tema değişince yeniden çağrılır: gündüz temada açık renkli saat
 * okunmuyordu, çubuk hep koyu varsayılıyordu.
 */
export async function durumCubuguAyarla(): Promise<void> {
  if (!nativeMi()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const tema = etkinTema();

    // Gündüz: koyu simgeler (Style.Light = açık zemin üstünde koyu yazı).
    // Gece: açık simgeler.
    await StatusBar.setStyle({ style: tema === 'gunduz' ? Style.Light : Style.Dark });

    // Aşağıdaki ikisi yalnızca Android 14 ve altında iş görür; yeni
    // sürümlerde sessizce yok sayılır. Hata verirlerse akış bozulmasın
    // diye ayrı ayrı sarmalanır.
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: KAGIT[tema] });
    } catch {
      // Yeni Android: bu ayarlar desteklenmiyor, tema hallediyor.
    }
  } catch {
    // Status bar eklentisi yoksa veya web'deyse sessizce devam et.
  }
}
