/**
 * sunucu-denetle.mjs — Edge Function'larda "tanımsız isim" avı.
 *
 * NEDEN VAR
 * Ekim 2026'da `duello-ara` canlıda 500 verdi: yeni bir yardımcı
 * fonksiyon kullanılmış ama import satırı yazılmamıştı. `npm run tip`
 * bunu görmedi, çünkü tsconfig yalnızca paketleri ve arayüzü
 * denetliyor; `sunucu/` klasörü Deno'ya ait ve derleyicinin dışında.
 *
 * NEDEN TAM TİP DENETİMİ DEĞİL
 * Deno, Supabase kütüphanesinin bizim canlıda kullandığımızdan daha
 * yeni bir sürümünü çözüyor ve ondan onlarca sahte uyarı geliyor.
 * Burada yalnızca GERÇEK hata sınıfına bakılıyor: olmayan bir isme ya
 * da bulunamayan bir dosyaya atıf. Bu üç kod tam o demek.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/*
 * DENO KENDI node_modules'UNU AYRI BIR KLASORE KURSUN.
 *
 * `--node-modules-dir=auto` calistigi klasore `node_modules/.deno`
 * aciyor. Depo kokunde calistirildiginda npm'in kurdugu agaci
 * yeniden duzenliyor ve `npx cap sync` gibi araclar bozuluyor —
 * Capacitor eklenti yollari `.deno` icine isaret etmeye basladi ve
 * Android derlemesi dustu. Denetim artik gecici bir klasorde kosuyor;
 * dosyalar mutlak yolla veriliyor.
 */

const ONEMLI = ['TS2304', 'TS2552', 'TS2307'];

const kok = process.cwd();
const gecici = mkdtempSync(join(tmpdir(), 'tamisabet-denetim-'));

const sonuc = spawnSync(
  'npx',
  [
    '--yes',
    'deno',
    'check',
    '--node-modules-dir=auto',
    '--import-map',
    JSON.stringify(resolve(kok, 'sunucu/fonksiyonlar/import_map.json')),
    JSON.stringify(resolve(kok, 'sunucu/fonksiyonlar/*/index.ts')),
  ],
  { encoding: 'utf8', shell: true, cwd: gecici },
);

const cikti = `${sonuc.stdout ?? ''}${sonuc.stderr ?? ''}`.replace(
  // eslint-disable-next-line no-control-regex
  /\u001b\[[0-9;]*m/g,
  '',
);

const satirlar = cikti.split('\n');
const bulunan = [];
for (let i = 0; i < satirlar.length; i++) {
  const kod = ONEMLI.find((k) => satirlar[i].includes(k));
  if (!kod) continue;
  const yer = satirlar.slice(i, i + 6).find((s) => s.includes('sunucu/fonksiyonlar'));
  bulunan.push(`${satirlar[i].trim()}${yer ? `\n    ${yer.trim()}` : ''}`);
}

if (bulunan.length > 0) {
  console.error('Edge Function denetimi KIRMIZI:\n');
  for (const b of bulunan) console.error(` - ${b}`);
  process.exit(1);
}

console.log('Edge Function denetimi temiz: tanımsız isim veya bulunamayan dosya yok.');
