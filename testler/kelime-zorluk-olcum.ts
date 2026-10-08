/**
 * kelime-zorluk-olcum.ts — Kelime turunda her seviyenin zorluğunu ölçer.
 *
 * Çalıştırma:
 *   npx tsx testler/kelime-zorluk-olcum.ts
 *
 * NEDEN BU ÖLÇÜM VAR
 * Kelime turunun seviyeleri "kaç harf verildiği"ne göre kuruldu ama
 * zorluğun ölçüsü bu değil. Asıl soru şu: verilen harflerden kaç
 * geçerli kelime çıkıyor, en uzunu kaç harf, ve oyuncunun en uzunu
 * bulması gerçekçi mi? Sayı turunda aynı soruyu `zorluk-olcum.ts` ile
 * cevaplamıştık; bu onun kelime karşılığı.
 *
 * Her seviyede N tur üretilip şunlar sayılıyor:
 *   - havuzdan yazılabilen TOPLAM geçerli kelime sayısı
 *   - en uzun kelimenin uzunluğu
 *   - en uzun kelimeyi bulmanın ne kadar "tek yol" olduğu: o
 *     uzunlukta kaç ayrı kelime var (1 ise tek çözüm, oyuncu ya bulur
 *     ya bulamaz)
 *   - oyuncunun gerçekçi hedefi sayılan "bir harf eksiği" (uzaklık 1)
 *     için kaç seçenek var
 *
 * Ölçüm deterministik: tohumlar 1..N.
 */

import {
  KELIME_SEVIYE_LISTESI,
  kelimeTuruKur,
  tamSozlukKur,
  havuzdanYazilabilir,
  puanlaKelime,
  EN_KISA_KELIME,
  type KelimeVeri,
} from '@tamisabet/oyun-kelime';
import { KELIME_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';

const TUR_SAYISI = Number(process.argv[2] ?? 300);

const sozluk = tamSozlukKur(KELIME_METNI);
const kelime = kelimeTuruKur(sozluk);

/** Sözlüğü uzunluk uzunluk gezip havuzdan yazılabilenleri sayar. */
function havuzIstatistigi(harfler: readonly string[]) {
  const uzunluklar: number[] = [];
  let toplam = 0;
  for (let u = harfler.length; u >= EN_KISA_KELIME; u--) {
    let sayi = 0;
    for (const k of sozluk.uzunluktakiler(u)) {
      if (havuzdanYazilabilir(harfler, k)) sayi++;
    }
    uzunluklar[u] = sayi;
    toplam += sayi;
  }
  let enUzun = 0;
  for (let u = harfler.length; u >= EN_KISA_KELIME; u--) {
    if ((uzunluklar[u] ?? 0) > 0) {
      enUzun = u;
      break;
    }
  }
  // Puanlama yalnızca en uzundan EN ÇOK İKİ harf kısa cevaplara puan
  // veriyor (10 / 7 / 5, sonrası 0). "Puanlı" sütunu bu pencereye
  // düşen kelime sayısı: oyuncunun sıfırdan kurtulma şansı.
  // "Puanlı" = gerçek puanlayıcıya göre sıfırdan büyük puan getiren
  // kelime sayısı. Eşik elle yazılmıyor; puanlama değişirse ölçüm de
  // kendiliğinden değişiyor (kural 1: kural tek yerde).
  let puanli = 0;
  for (let u = enUzun; u >= EN_KISA_KELIME; u--) {
    const p = puanlaKelime(
      { uzaklik: enUzun - u, enUzunUzunluk: enUzun, harfSayisi: u },
      0,
      60,
      false,
    );
    if (p.taban > 0) puanli += uzunluklar[u] ?? 0;
  }
  return {
    toplam,
    enUzun,
    enUzunAdet: uzunluklar[enUzun] ?? 0,
    birEksikAdet: uzunluklar[enUzun - 1] ?? 0,
    puanli,
  };
}

function ortalama(d: number[]): number {
  return d.reduce((a, b) => a + b, 0) / d.length;
}

function ortanca(d: number[]): number {
  const s = [...d].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

console.log(`Kelime turu zorluk ölçümü — seviye başına ${TUR_SAYISI} tur\n`);
console.log(
  'Seviye'.padEnd(9) +
    'Harf'.padStart(5) +
    'Çözülür%'.padStart(10) +
    'Kelime(ort)'.padStart(13) +
    'Kelime(ortanca)'.padStart(17) +
    'EnUzun(ort)'.padStart(13) +
    'TekÇözüm%'.padStart(11) +
    '1-eksik(ort)'.padStart(14) +
    'Puanlı(ort)'.padStart(13) +
    'Puanlı%'.padStart(9),
);
console.log('-'.repeat(114));

const ozet: Record<string, { enUzun: number; tekCozum: number; toplam: number }> = {};

for (const sv of KELIME_SEVIYE_LISTESI) {
  const toplamlar: number[] = [];
  const enUzunlar: number[] = [];
  const birEksikler: number[] = [];
  const puanlilar: number[] = [];
  let tekCozum = 0;
  let cozulur = 0;

  for (let tohum = 1; tohum <= TUR_SAYISI; tohum++) {
    const tur = kelime.turUret(sv.anahtar, tohum);
    const veri = tur.veri as KelimeVeri;
    const ist = havuzIstatistigi(veri.harfler);

    toplamlar.push(ist.toplam);
    enUzunlar.push(ist.enUzun);
    birEksikler.push(ist.birEksikAdet);
    puanlilar.push(ist.puanli);
    if (ist.enUzunAdet === 1) tekCozum++;
    if (ist.enUzun >= EN_KISA_KELIME) cozulur++;
  }

  const satir =
    sv.etiket.padEnd(9) +
    String(sv.altEtiket.replace(' harf', '')).padStart(5) +
    `${((cozulur / TUR_SAYISI) * 100).toFixed(0)}%`.padStart(10) +
    ortalama(toplamlar).toFixed(0).padStart(13) +
    String(ortanca(toplamlar)).padStart(17) +
    ortalama(enUzunlar).toFixed(2).padStart(13) +
    `${((tekCozum / TUR_SAYISI) * 100).toFixed(0)}%`.padStart(11) +
    ortalama(birEksikler).toFixed(1).padStart(14) +
    ortalama(puanlilar).toFixed(1).padStart(13) +
    `${((ortalama(puanlilar) / ortalama(toplamlar)) * 100).toFixed(0)}%`.padStart(9);
  console.log(satir);

  ozet[sv.anahtar] = {
    enUzun: ortalama(enUzunlar),
    tekCozum: (tekCozum / TUR_SAYISI) * 100,
    toplam: ortalama(toplamlar),
  };
}

console.log('\nSÜTUNLAR');
console.log('  Çözülür%        : en az bir geçerli kelime çıkan turların oranı');
console.log('  Kelime(ort)     : havuzdan yazılabilen geçerli kelime sayısı');
console.log('  EnUzun(ort)     : o turun en uzun kelimesinin harf sayısı');
console.log('  TekÇözüm%       : en uzun kelimenin TEK olduğu turlar — bulması ya hep ya hiç');
console.log('  1-eksik(ort)    : en uzundan bir harf kısa kaç ayrı kelime var');
console.log('  Puanlı(ort)     : puan getiren kelime sayısı (en uzun, -1, -2)');
console.log('  Puanlı%         : havuzdaki kelimelerin yüzde kaçı puan getiriyor');

const sirali = KELIME_SEVIYE_LISTESI.map((s) => ozet[s.anahtar]!.enUzun);
const artanMi = sirali.every((v, i) => i === 0 || v >= sirali[i - 1]!);
console.log(`\nEn uzun kelime seviyelerle birlikte artıyor mu: ${artanMi ? 'EVET' : 'HAYIR'}`);
