import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      '@zihinturu/cekirdek': resolve(__dirname, '../paketler/cekirdek/src/index.ts'),
      '@zihinturu/oyun-sayi': resolve(__dirname, '../paketler/oyun-sayi/src/index.ts'),
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
