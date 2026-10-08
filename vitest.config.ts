import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@tamisabet/cekirdek': resolve(__dirname, 'paketler/cekirdek/src/index.ts'),
      '@tamisabet/oyun-sayi': resolve(__dirname, 'paketler/oyun-sayi/src/index.ts'),
      '@tamisabet/oyun-kelime/sozluk-verisi': resolve(__dirname, 'paketler/oyun-kelime/veri/kelimeler.ts'),
      '@tamisabet/oyun-kelime': resolve(__dirname, 'paketler/oyun-kelime/src/index.ts'),
    },
  },
  test: { environment: 'node', include: ['testler/**/*.test.ts'] },
});
