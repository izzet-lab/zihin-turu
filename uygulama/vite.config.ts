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

      // Firebase yalnızca Android'de kullanılır. @capacitor-firebase/*
      // eklentilerinin web uygulamaları firebase/* paketlerini içe
      // aktarıyor; bunları boş bir modüle yönlendiriyoruz ki tarayıcı
      // paketine Firebase kütüphanesi girmesin (bkz. çerez politikası).
      'firebase/messaging': resolve(__dirname, 'src/firebase-web-bos.ts'),
      'firebase/analytics': resolve(__dirname, 'src/firebase-web-bos.ts'),
      'firebase/remote-config': resolve(__dirname, 'src/firebase-web-bos.ts'),
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
