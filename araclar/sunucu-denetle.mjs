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
import { mkdtempSync, readdirSync, existsSync } from 'node:fs';
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

const kok = process.cwd();
const gecici = mkdtempSync(join(tmpdir(), 'tamisabet-denetim-'));

/*
 * DOSYALAR BURADA SAYILIYOR, YILDIZLA DEGIL.
 *
 * Once klasor desenli bir yol (yildizli) deno'ya veriliyordu.
 * Gecici klasorde calismaya gecince deno mutlak yoldaki yildizi
 * cozemedi, "No matching files found" deyip HICBIR SEYI denetlemedi —
 * ve betik "temiz" diye yesil verdi. Hicbir sey denetlemeyen bir
 * denetim, denetim olmamasindan beterdir: guven veriyor.
 */
const fonksiyonKok = resolve(kok, 'sunucu/fonksiyonlar');
const dosyalar = readdirSync(fonksiyonKok, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(fonksiyonKok, d.name, 'index.ts'))
  .filter((y) => existsSync(y));

if (dosyalar.length === 0) {
  console.error('Denetlenecek Edge Function bulunamadi — yol yanlis olabilir.');
  process.exit(1);
}
console.log(`${dosyalar.length} Edge Function denetleniyor.`);

const sonuc = spawnSync(
  'npx',
  [
    '--yes',
    'deno',
    'check',
    '--node-modules-dir=auto',
    '--import-map',
    JSON.stringify(resolve(kok, 'sunucu/fonksiyonlar/import_map.json')),
    ...dosyalar.map((y) => JSON.stringify(y)),
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
  if (!/TS[0-9]+ \[ERROR\]/.test(satirlar[i])) continue;
  const yer = satirlar.slice(i, i + 6).find((s) => s.includes('sunucu/fonksiyonlar'));
  bulunan.push(`${satirlar[i].trim()}${yer ? `\n    ${yer.trim()}` : ''}`);
}

if (bulunan.length > 0) {
  console.error('Edge Function denetimi KIRMIZI:\n');
  for (const b of bulunan) console.error(` - ${b}`);
  process.exit(1);
}

console.log('Edge Function denetimi temiz.');
