/**
 * eklenti-yamalari.mjs — üçüncü taraf eklentilerdeki bilinen sorunları düzeltir.
 *
 * Bu yamalar node_modules içinde çalıştığı için `npm install` sonrası
 * kaybolur. Bu yüzden package.json'da postinstall olarak bağlıdır;
 * elle çalıştırmak gerekirse:
 *
 *     node araclar/eklenti-yamalari.mjs
 *
 * Her yama fikir olarak "idempotent"tir: zaten uygulanmışsa dokunmaz.
 * Eklenti sürümü güncellenip sorun yukarıda çözülürse yama sessizce
 * atlanır ve uyarı basar — böylece gereksiz yamayı fark edip
 * kaldırabiliriz.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const kok = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const YAMALAR = [
  {
    ad: 'admob-proguard',
    dosya: 'node_modules/@capacitor-community/admob/android/build.gradle',
    // Android Gradle Plugin 9, proguard-android.txt dosyasını artık
    // reddediyor: içindeki -dontoptimize R8'in optimizasyonlarını
    // engelliyor. Eklenti hâlâ eski dosyayı kullanıyor ve bu, tüm
    // derlemeyi değerlendirme aşamasında düşürüyor.
    ara: "getDefaultProguardFile('proguard-android.txt')",
    koy: "getDefaultProguardFile('proguard-android-optimize.txt')",
    neden: 'AGP 9 proguard-android.txt dosyasını reddediyor',
  },
];

let uygulanan = 0;
let atlanan = 0;

for (const y of YAMALAR) {
  const yol = resolve(kok, y.dosya);

  if (!existsSync(yol)) {
    console.warn(`[yama] ${y.ad}: dosya yok, atlandı (${y.dosya})`);
    atlanan++;
    continue;
  }

  const icerik = readFileSync(yol, 'utf8');

  if (icerik.includes(y.koy)) {
    // Zaten yamalı.
    atlanan++;
    continue;
  }

  if (!icerik.includes(y.ara)) {
    console.warn(
      `[yama] ${y.ad}: aranan metin bulunamadı. Eklenti güncellenmiş ` +
        `olabilir — yama artık gerekmiyorsa listeden çıkar.`,
    );
    atlanan++;
    continue;
  }

  writeFileSync(yol, icerik.split(y.ara).join(y.koy), 'utf8');
  console.log(`[yama] ${y.ad} uygulandı — ${y.neden}`);
  uygulanan++;
}

if (uygulanan === 0 && atlanan === YAMALAR.length) {
  console.log('[yama] Yapılacak bir şey yok; tüm yamalar zaten yerinde.');
}
