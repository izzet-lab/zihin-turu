/**
 * zorluk-olcum.ts — Her seviyede tur üretip zorluk metriklerini ölçer.
 *
 * Çalıştırma:
 *   npx tsx testler/zorluk-olcum.ts
 *
 * ÖLÇÜM NEDEN BÖYLE
 *
 * Önceki sürüm süre sınırlı arama kullanıyordu (50ms gibi). İki sorunu
 * vardı: makineye göre değişiyordu ve taş sayısı arttıkça aynı sürede
 * daha az yol gezildiği için seviyeler karşılaştırılamıyordu. Şimdi
 * ölçüm, ÜRETİCİNİN KENDİ kullandığı `cozumYogunluguDetay`
 * fonksiyonunu çağırıyor: düğüm sınırlı, deterministik, tek kaynak.
 *
 * Rakam "toplam çözüm sayısı" DEĞİL, "eşit emekle bulunan çözüm
 * sayısı". Her seviye aynı düğüm bütçesini harcadığı için karşılaştırma
 * adil; "Kesildi %" sütunu yalnızca bütçenin nerede dolduğunu gösterir.
 *
 * Beklenen: zorluk Isınma → Normal → Zor → Usta boyunca tek yönlü
 * artmalı. Bozuksa betik kırmızı verir.
 */

import {
  SEVIYELER,
  uretimYap,
  cozumYogunluguDetay,
  BUYUK,
  type Adim,
} from '@zihinturu/oyun-sayi';

/**
 * Seviye başına tur sayısı. Taş sayısı arttıkça arama pahalılaşıyor;
 * üst seviyelerde daha az tur ölçülüyor. Ölçüm deterministik olduğu
 * için tur sayısı sonucun doğruluğunu değil yalnızca gürültüsünü
 * etkiler.
 */
const TUR_SAYILARI: Record<string, number> = {
  cocuk: 2000,
  normal: 2000,
  zor: 500,
  usta: 200,
};

/**
 * Ölçümde kullanılan düğüm sınırı. Üretim filtresinin kullandığı
 * sınırla AYNI olmalı — yoksa ölçüm, üreticinin gördüğünden başka bir
 * şeyi ölçer.
 */
const DUGUM_SINIRI = 50000;

interface SeviyeMetrik {
  seviye: string;
  etiket: string;
  turSayisi: number;
  cozumYogunlugu: number;
  aramaMaliyeti: number;
  tekCozumOrani: number;
  kesilmeOrani: number;
  bolmeOrani: number;
  buyukSayiOrani: number;
}

console.log('\n🔬 Zorluk ölçümü başlıyor...\n');

const sonuclar: SeviyeMetrik[] = [];

for (const [anahtar, config] of Object.entries(SEVIYELER)) {
  const turSayisi = TUR_SAYILARI[anahtar] ?? 500;
  const t0 = Date.now();
  let toplamYogunluk = 0;
  let toplamDugum = 0;
  let tekCozum = 0;
  let kesilen = 0;
  let bolmeVar = 0;
  let buyukVar = 0;

  process.stdout.write(`  ${config.etiket} (${anahtar}, ${turSayisi} tur): `);

  for (let i = 0; i < turSayisi; i++) {
    if (i > 0 && i % 100 === 0) process.stdout.write('.');

    const uretim = uretimYap(anahtar, 1000000 + i);
    const olcum = cozumYogunluguDetay(uretim.sayilar, uretim.hedef, DUGUM_SINIRI);

    toplamYogunluk += olcum.sayac;
    toplamDugum += olcum.dugum;
    if (olcum.sayac <= 1) tekCozum++;
    if (olcum.kesildi) kesilen++;
    if (uretim.cozum.adimlar.some((a: Adim) => a.islem === '÷')) bolmeVar++;
    if (uretim.sayilar.some((s: number) => BUYUK.includes(s))) buyukVar++;
  }

  console.log(` ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  sonuclar.push({
    seviye: anahtar,
    etiket: config.etiket,
    turSayisi,
    cozumYogunlugu: toplamYogunluk / turSayisi,
    aramaMaliyeti: toplamDugum / turSayisi,
    tekCozumOrani: (tekCozum / turSayisi) * 100,
    kesilmeOrani: (kesilen / turSayisi) * 100,
    bolmeOrani: (bolmeVar / turSayisi) * 100,
    buyukSayiOrani: (buyukVar / turSayisi) * 100,
  });
}

/* ------------------------------------------------------------------ */
/* Sonuç tablosu                                                       */
/* ------------------------------------------------------------------ */

const CIZGI = '='.repeat(104);
console.log('\n' + CIZGI);
console.log('ZORLUK METRİKLERİ');
console.log(CIZGI);
console.log(
  [
    'Seviye'.padEnd(10),
    'N'.padStart(5),
    'Çöz.Yoğ.'.padStart(10),
    'Arama Mal.'.padStart(12),
    'Tek Çöz.%'.padStart(10),
    'Kesildi %'.padStart(10),
    'Bölme %'.padStart(9),
    'Büyük %'.padStart(9),
  ].join(' | '),
);
console.log('-'.repeat(104));

for (const m of sonuclar) {
  console.log(
    [
      m.etiket.padEnd(10),
      String(m.turSayisi).padStart(5),
      m.cozumYogunlugu.toFixed(1).padStart(10),
      m.aramaMaliyeti.toFixed(0).padStart(12),
      m.tekCozumOrani.toFixed(1).padStart(10),
      m.kesilmeOrani.toFixed(1).padStart(10),
      m.bolmeOrani.toFixed(1).padStart(9),
      m.buyukSayiOrani.toFixed(1).padStart(9),
    ].join(' | '),
  );
}
console.log(CIZGI);

/* ------------------------------------------------------------------ */
/* Monotonluk kontrolü                                                 */
/* ------------------------------------------------------------------ */

type OlcutAdi = 'cozumYogunlugu' | 'aramaMaliyeti' | 'tekCozumOrani' | 'buyukSayiOrani';

/**
 * Hangi ölçüt hangi yöne gitmeli.
 *
 * `bolmeOrani` burada YOK ve bu bilinçli: bölme oranı üretim yöntemine
 * bağlı (geriye arama ile ileri üretim farklı davranıyor), zorluğa
 * değil. Onu ölçüte çevirmek yanlış sinyal verir. Tabloda bilgi olarak
 * duruyor.
 *
 * `kesilmeOrani` de ölçüt değil ama KRİTİK: yüksekse çözüm yoğunluğu
 * rakamı güvenilmez demektir, ayrıca uyarılır.
 */
const BEKLENEN: Record<OlcutAdi, { yon: 'artmali' | 'azalmali'; etiket: string }> = {
  cozumYogunlugu: { yon: 'azalmali', etiket: 'Çözüm yoğunluğu (azalmalı)' },
  aramaMaliyeti: { yon: 'artmali', etiket: 'Arama maliyeti (artmalı)' },
  tekCozumOrani: { yon: 'artmali', etiket: 'Tek çözüm oranı (artmalı)' },
  buyukSayiOrani: { yon: 'artmali', etiket: 'Büyük sayı oranı (artmalı)' },
};




console.log('\nMonotonluk kontrolü:');

let bozukVar = false;

for (const [olcut, { yon, etiket }] of Object.entries(BEKLENEN) as [
  OlcutAdi,
  { yon: 'artmali' | 'azalmali'; etiket: string },
][]) {
  let sorun = '';
  for (let i = 1; i < sonuclar.length; i++) {
    const onceki = sonuclar[i - 1]!;
    const simdiki = sonuclar[i]!;
    const a = onceki[olcut];
    const b = simdiki[olcut];
    const bozuk = yon === 'artmali' ? b < a : b > a;
    if (bozuk) {
      sorun = `${onceki.etiket}(${a.toFixed(1)}) → ${simdiki.etiket}(${b.toFixed(1)})`;
      break;
    }
  }
  if (sorun) {
    bozukVar = true;
    console.log(`  ❌ ${etiket}  — ${sorun}`);
  } else {
    console.log(`  ✅ ${etiket}`);
  }
}

/*
 * Kesilme bir HATA değil, ölçümün doğası.
 *
 * Her seviye AYNI düğüm bütçesini harcıyor, yani rakam "eşit emekle kaç
 * çözüm bulunuyor" demek — karşılaştırma bu yüzden adil. Kesilme yalnızca
 * şunu söylüyor: bu rakam "toplam çözüm sayısı" değil.
 *
 * Kesilmenin gerçek maliyeti başka: yoğunluk sıfıra yaklaştıkça filtre
 * ayırt etme gücünü kaybeder. Ortalama yoğunluk eşiğin altına düşmüşse
 * o seviyede filtre neredeyse hiçbir turu reddetmiyordur. Bunu görünür
 * tutmak, "filtre koyduk, iş bitti" yanılgısını engelliyor.
 */
console.log('\nFiltrenin ayırt etme gücü:');
for (const m of sonuclar) {
  const esik = SEVIYELER[m.seviye]!.yogunlukEsigi;
  const kesilmeNotu = `kesilme %${m.kesilmeOrani.toFixed(0)}`;
  if (esik === 0) {
    console.log(`  ⚪ ${m.etiket}: filtre yok (${kesilmeNotu})`);
  } else if (m.cozumYogunlugu < esik) {
    console.log(
      `  ⚠️  ${m.etiket}: ortalama yoğunluk ${m.cozumYogunlugu.toFixed(1)} < eşik ${esik} — ` +
        `filtre burada az tur reddediyor, zorluğu asıl taş sayısı taşıyor (${kesilmeNotu})`,
    );
  } else {
    console.log(`  ✅ ${m.etiket}: yoğunluk ${m.cozumYogunlugu.toFixed(1)} ≥ eşik ${esik} (${kesilmeNotu})`);
  }
}

console.log(`\n(Bölme oranı bilgi amaçlı: ${sonuclar.map((s) => `${s.etiket} %${s.bolmeOrani.toFixed(0)}`).join(', ')})`);

if (bozukVar) {
  console.log('\n⚠️  Zorluk sırası bozuk.\n');
  process.exit(1);
}
console.log('\n✅ Zorluk sırası tutarlı: her ölçüt Isınma → Usta boyunca tek yönlü.\n');
