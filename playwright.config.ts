import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright — gerçek tarayıcıda uçtan uca test.
 *
 * Mobil öncelikli olduğumuz için test bir telefon profiliyle koşar.
 * Sunucu: önce üretim derlemesi alınır, sonra `vite preview` ile
 * servis edilir (servis çalışanı ve manifest ancak derlemede gerçekçi).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 40_000,
  fullyParallel: false,
  // Testler kendi içinde bağımsız bir çözücü çalıştırıyor (CPU ağır).
  // Paralel worker'lar aynı anda birden fazla çözücüyü koşturunca
  // makinede kaynak yarışı oluşup 40 sn'lik test zaman aşımına takılıyordu
  // (fonksiyonel bir hata değildi — testler tek tek her zaman geçiyordu).
  // Küçük bir paket için ardışık koşum daha güvenilir.
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
  },
  projects: [{ name: 'mobil', use: { ...devices['Pixel 5'] } }],
  webServer: {
    command: 'npm run insa && npm run onizle',
    url: 'http://localhost:4173',
    /*
     * ÇALIŞAN SUNUCU YENİDEN KULLANILMAZ.
     *
     * Önceden kullanılıyordu ve sessiz bir tuzaktı: ekran görüntüsü
     * ya da elle deneme için açık bırakılmış ESKİ derlemeli bir
     * sunucu varsa, bütün takım o eski koda karşı koşuyor ve yeşil
     * veriyordu. Bir oturumda birkaç koşu tam bu yüzden anlamsız
     * çıktı.
     *
     * Artık Playwright kendi sunucusunu kuruyor; 4173 doluysa
     * gürültülü biçimde hata veriyor. Sessizce yanlış sonuç vermekten
     * iyidir.
     */
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
