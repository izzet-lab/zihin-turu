/**
 * determinizm.test.ts — Aynı tohumun aynı turu ürettiğini doğrular.
 *
 * İstemci ve sunucu aynı paketi (oyun-sayi) kullandığı için bu test
 * paketin kendi içindeki determinizmi doğrular: aynı (seviye, tohum)
 * ikilisi her çağrıda birebir aynı hedef, sayılar ve çözüm üretmeli.
 *
 * Çalıştırma:
 *   npx tsx testler/determinizm.test.ts
 */

import { describe, it, expect } from 'vitest';
import { SEVIYELER, uretimYap, type Uretim } from '@zihinturu/oyun-sayi';

const TEKRAR = 5;       // her turu kaç kez üretip karşılaştıracağız
const TUR_SAYISI = 200;  // seviye başına kaç farklı tohum

let basarili = 0;
let toplam = 0;
let hatalar: string[] = [];

function karsilastir(a: Uretim, b: Uretim, etiket: string): void {
  toplam++;
  if (a.hedef !== b.hedef) {
    hatalar.push(`${etiket}: hedef farklı (${a.hedef} ≠ ${b.hedef})`);
    return;
  }
  if (JSON.stringify(a.sayilar) !== JSON.stringify(b.sayilar)) {
    hatalar.push(`${etiket}: sayılar farklı`);
    return;
  }
  if (JSON.stringify(a.cozum.adimlar) !== JSON.stringify(b.cozum.adimlar)) {
    hatalar.push(`${etiket}: çözüm adımları farklı`);
    return;
  }
  basarili++;
}

console.log('🔒 Determinizm testi başlıyor...\n');

for (const [anahtar, config] of Object.entries(SEVIYELER)) {
  const n = anahtar === 'usta' ? Math.min(TUR_SAYISI, 50) : TUR_SAYISI;
  process.stdout.write(`  ${config.etiket} (${n} tur × ${TEKRAR} tekrar): `);

  for (let i = 0; i < n; i++) {
    const tohum = 500000 + i;
    const referans = uretimYap(anahtar, tohum);
    for (let t = 1; t < TEKRAR; t++) {
      const tekrar = uretimYap(anahtar, tohum);
      karsilastir(referans, tekrar, `${anahtar} tohum=${tohum} tekrar=${t}`);
    }
  }

  console.log('✓');
}

console.log(`\nSonuç: ${basarili}/${toplam} karşılaştırma başarılı.`);

if (hatalar.length > 0) {
  console.log(`\n❌ ${hatalar.length} hata:`);
  for (const h of hatalar.slice(0, 10)) console.log(`  - ${h}`);
} else {
  console.log('✅ Tüm tohumlar deterministik.\n');
}

/*
 * Karşılaştırmalar yukarıda modül yüklenirken yapılıyor (dosya aynı
 * zamanda `npx tsx testler/determinizm.test.ts` ile tek başına da
 * çalıştırılabiliyor). Buradaki test, toplanan sonucu vitest'e bildirir
 * — yoksa vitest "bu dosyada test yok" diyerek kırmızı veriyordu.
 */
describe('tohum determinizmi', () => {
  it('aynı tohum her çağrıda birebir aynı turu üretir', () => {
    expect(hatalar).toEqual([]);
    expect(basarili).toBe(toplam);
    expect(toplam).toBeGreaterThan(0);
  });
});
