/**
 * zorluk-olcum.ts — Her seviyede tur üretip zorluk metriklerini ölçer.
 *
 * Çalıştırma:
 *   npx tsx testler/zorluk-olcum.ts
 *
 * Beklenen: her ölçüt Isınma → Normal → Zor → Usta boyunca tek yönlü
 * artmalı (çözüm yoğunluğu azalmalı). Artmıyorsa zorluk sırası bozuk.
 */

import {
  SEVIYELER,
  uretimYap,
  uygula,
  BUYUK,
  type Adim,
} from '@zihinturu/oyun-sayi';

// Seviye başına tur sayısı — zor/usta'da arama pahalı, daha az tur yeterli
const TUR_SAYILARI: Record<string, number> = {
  cocuk: 2000,
  normal: 2000,
  zor: 500,
  usta: 200,
};

const ISLEMLER: readonly ('+' | '−' | '×' | '÷')[] = ['+', '−', '×', '÷'];

/* ------------------------------------------------------------------ */
/* Hızlı çözüm yoğunluğu ölçümü                                       */
/* Sabit sürede (50ms) kaç farklı tam isabet bulunabildiğini sayar.    */
/* ------------------------------------------------------------------ */

interface OlcumSonuc {
  cozumSayisi: number;
  enKisaAdim: number;
  dugumSayisi: number;
}

function hizliOlcum(sayilar: number[], hedef: number, sinirMs = 50): OlcumSonuc {
  const t0 = Date.now();
  let cozumSayisi = 0;
  let enKisaAdim = Infinity;
  let dugumSayisi = 0;
  const gorulen = new Set<string>();

  interface Dugum { d: number; derinlik: number; }

  function ara(liste: Dugum[]): void {
    if (Date.now() - t0 > sinirMs) return;
    dugumSayisi++;

    for (const it of liste) {
      if (it.d === hedef) {
        cozumSayisi++;
        if (it.derinlik < enKisaAdim) enKisaAdim = it.derinlik;
      }
    }

    if (liste.length < 2) return;

    const anahtar = liste.map((x) => x.d).sort((a, b) => a - b).join(',');
    if (gorulen.has(anahtar)) return;
    gorulen.add(anahtar);

    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length; j++) {
        if (Date.now() - t0 > sinirMs) return;
        const a = liste[i]!;
        const b = liste[j]!;
        const kalan = liste.filter((_, k) => k !== i && k !== j);
        const ust = a.d >= b.d ? a : b;
        const alt = a.d >= b.d ? b : a;
        for (const islem of ISLEMLER) {
          if (islem === '×' && alt.d === 1) continue;
          if (islem === '÷' && alt.d === 1) continue;
          const sonuc = uygula(ust.d, alt.d, islem);
          if (sonuc === null) continue;
          const yeniDerinlik = Math.max(ust.derinlik, alt.derinlik) + 1;
          ara(kalan.concat([{ d: sonuc, derinlik: yeniDerinlik }]));
        }
      }
    }
  }

  ara(sayilar.map((d) => ({ d, derinlik: 0 })));
  return { cozumSayisi, enKisaAdim, dugumSayisi };
}

/* ------------------------------------------------------------------ */
/* Metrik toplama                                                      */
/* ------------------------------------------------------------------ */

interface SeviyeMetrik {
  seviye: string;
  etiket: string;
  turSayisi: number;
  ortalamaCozumYogunlugu: number;
  ortalamaEnKisaAdim: number;
  ortalamaAramaMaliyeti: number;
  tekCozumOrani: number;
  bolmeOrani: number;
  buyukSayiOrani: number;
}

console.log(`\n🔬 Zorluk ölçümü başlıyor...\n`);

const sonuclar: SeviyeMetrik[] = [];

for (const [anahtar, config] of Object.entries(SEVIYELER)) {
  const turSayisi = TUR_SAYILARI[anahtar] ?? 500;
  const t0 = Date.now();
  let toplamCozumYogunlugu = 0;
  let toplamEnKisa = 0;
  let toplamAramaMaliyeti = 0;
  let tekCozum = 0;
  let bolmeVar = 0;
  let buyukVar = 0;

  process.stdout.write(`  ${config.etiket} (${anahtar}, ${turSayisi} tur): `);

  for (let i = 0; i < turSayisi; i++) {
    if (i > 0 && i % 100 === 0) process.stdout.write('.');

    const tohum = 1000000 + i;
    const uretim = uretimYap(anahtar, tohum);

    const olcum = hizliOlcum(uretim.sayilar, uretim.hedef, 50);

    toplamCozumYogunlugu += olcum.cozumSayisi;
    toplamEnKisa += olcum.enKisaAdim === Infinity ? (config.tas - 1) : olcum.enKisaAdim;
    toplamAramaMaliyeti += olcum.dugumSayisi;
    if (olcum.cozumSayisi <= 1) tekCozum++;
    if (uretim.cozum.adimlar.some((a: Adim) => a.islem === '÷')) bolmeVar++;
    if (uretim.sayilar.some((s: number) => BUYUK.includes(s))) buyukVar++;
  }

  const sure = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(` ${sure}s`);

  sonuclar.push({
    seviye: anahtar,
    etiket: config.etiket,
    turSayisi,
    ortalamaCozumYogunlugu: toplamCozumYogunlugu / turSayisi,
    ortalamaEnKisaAdim: toplamEnKisa / turSayisi,
    ortalamaAramaMaliyeti: toplamAramaMaliyeti / turSayisi,
    tekCozumOrani: (tekCozum / turSayisi) * 100,
    bolmeOrani: (bolmeVar / turSayisi) * 100,
    buyukSayiOrani: (buyukVar / turSayisi) * 100,
  });
}

/* ------------------------------------------------------------------ */
/* Sonuç tablosu                                                       */
/* ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(105));
console.log('ZORLUK METRİKLERİ');
console.log('='.repeat(105));

const basliklar = [
  'Seviye'.padEnd(10),
  'N'.padStart(5),
  'Çöz.Yoğ.'.padStart(10),
  'Kısa Adım'.padStart(10),
  'Arama Mal.'.padStart(12),
  'Tek Çöz.%'.padStart(10),
  'Bölme %'.padStart(9),
  'Büyük %'.padStart(9),
];
console.log(basliklar.join(' | '));
console.log('-'.repeat(105));

for (const m of sonuclar) {
  const satir = [
    m.etiket.padEnd(10),
    String(m.turSayisi).padStart(5),
    m.ortalamaCozumYogunlugu.toFixed(1).padStart(10),
    m.ortalamaEnKisaAdim.toFixed(2).padStart(10),
    m.ortalamaAramaMaliyeti.toFixed(0).padStart(12),
    m.tekCozumOrani.toFixed(1).padStart(10),
    m.bolmeOrani.toFixed(1).padStart(9),
    m.buyukSayiOrani.toFixed(1).padStart(9),
  ];
  console.log(satir.join(' | '));
}

console.log('='.repeat(105));

/* ------------------------------------------------------------------ */
/* Monotonluk kontrolü                                                 */
/* ------------------------------------------------------------------ */

console.log('\nMonotonluk kontrolü:');

type OlcutAdi = keyof Omit<SeviyeMetrik, 'seviye' | 'etiket' | 'turSayisi'>;

const beklenen: Record<OlcutAdi, 'artmali' | 'azalmali'> = {
  ortalamaCozumYogunlugu: 'azalmali',
  ortalamaEnKisaAdim: 'artmali',
  ortalamaAramaMaliyeti: 'artmali',
  tekCozumOrani: 'artmali',
  bolmeOrani: 'artmali',
  buyukSayiOrani: 'artmali',
};

const etiketler: Record<OlcutAdi, string> = {
  ortalamaCozumYogunlugu: 'Çözüm yoğunluğu (azalmalı)',
  ortalamaEnKisaAdim: 'En kısa adım (artmalı)',
  ortalamaAramaMaliyeti: 'Arama maliyeti (artmalı)',
  tekCozumOrani: 'Tek çözüm oranı (artmalı)',
  bolmeOrani: 'Bölme oranı (artmalı)',
  buyukSayiOrani: 'Büyük sayı oranı (artmalı)',
};

let bozukVar = false;

for (const [olcut, yon] of Object.entries(beklenen) as [OlcutAdi, 'artmali' | 'azalmali'][]) {
  const degerler = sonuclar.map((s) => s[olcut]);
  let sorun = '';
  for (let i = 1; i < degerler.length; i++) {
    const onceki = degerler[i - 1]!;
    const simdiki = degerler[i]!;
    if (yon === 'artmali' && simdiki < onceki) {
      sorun = `${sonuclar[i-1]!.etiket}(${onceki.toFixed(1)}) > ${sonuclar[i]!.etiket}(${simdiki.toFixed(1)})`;
      break;
    }
    if (yon === 'azalmali' && simdiki > onceki) {
      sorun = `${sonuclar[i-1]!.etiket}(${onceki.toFixed(1)}) < ${sonuclar[i]!.etiket}(${simdiki.toFixed(1)})`;
      break;
    }
  }
  if (sorun) {
    bozukVar = true;
    console.log(`  ❌ ${etiketler[olcut]}  — ${sorun}`);
  } else {
    console.log(`  ✅ ${etiketler[olcut]}`);
  }
}

if (bozukVar) {
  console.log('\n⚠️  Bazı ölçütler monoton değil — zorluk sırası bozuk olabilir.\n');
  process.exit(1);
} else {
  console.log('\n✅ Tüm ölçütler monoton.\n');
}
