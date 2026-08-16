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
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
  },
  projects: [{ name: 'mobil', use: { ...devices['Pixel 5'] } }],
  webServer: {
    command: 'npm run insa && npm run onizle',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
