import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@zihinturu/cekirdek': resolve(__dirname, 'paketler/cekirdek/src/index.ts'),
      '@zihinturu/oyun-sayi': resolve(__dirname, 'paketler/oyun-sayi/src/index.ts'),
    },
  },
  test: { environment: 'node', include: ['testler/**/*.test.ts'] },
});
