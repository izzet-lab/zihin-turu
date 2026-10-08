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

const ONEMLI = ['TS2304', 'TS2552', 'TS2307'];

const sonuc = spawnSync(
  'npx',
  [
    '--yes',
    'deno',
    'check',
    '--node-modules-dir=auto',
    '--import-map',
    'sunucu/fonksiyonlar/import_map.json',
    'sunucu/fonksiyonlar/*/index.ts',
  ],
  { encoding: 'utf8', shell: true },
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
