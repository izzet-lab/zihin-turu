/**
 * kelime-listesi-uret.mjs — Kelime turunun sözlüğünü üretir.
 *
 * KAYNAK
 * Zemberek (https://github.com/ahmetaa/zemberek-nlp) Türkçe kök
 * sözlüğü. Lisans: Apache License 2.0 — ticari kullanıma açık, tek
 * şartı kaynağı belirtmek. Lisans metni `paketler/oyun-kelime/veri/
 * ZEMBEREK-LISANS.txt` içinde duruyor.
 *
 * NEDEN BETİK, NEDEN ELLE DEĞİL
 * Ham sözlük dilbilim etiketleriyle geliyor ("badik [P:Adj]"); oyunun
 * istediği sade kelime listesi. Ayrıca özel adlar, kısaltmalar, çok
 * kelimeli maddeler ve noktalama oyuna girmemeli. Bu süzgeçler burada
 * tek yerde duruyor ki liste yenilenmek istendiğinde aynı kurallarla
 * yeniden üretilsin.
 *
 * ÇEKİMLİ BİÇİMLER
 * Zemberek'in kendisi bir biçimbilim kütüphanesi (Java); biz yalnızca
 * kök listesini alıyoruz. Oyuncunun "kitaplar" yazıp reddedilmesi can
 * sıkıcı olacağı için düzenli ÇOĞUL biçimi ünlü uyumuna göre burada
 * türetiliyor. Diğer çekimler (hâl ekleri, iyelik) türetilmiyor:
 * ünsüz yumuşaması ve istisnalar doğru yapılmadan üretilen liste
 * uydurma kelimelerle dolardı.
 *
 * Kullanım:
 *   node araclar/kelime-listesi-uret.mjs <ham-sozluk-dosyasi>
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HAM = process.argv[2];
if (!HAM) {
  console.error('Kullanım: node araclar/kelime-listesi-uret.mjs <ham-sozluk-dosyasi>');
  process.exit(1);
}

// Liste bir TypeScript modulu olarak yaziliyor: ayni dosya Vite'ta da,
// Deno'da da (Edge Function) ek bir yukleyici ayari olmadan okunuyor.
const CIKTI = resolve('paketler/oyun-kelime/veri/kelimeler.ts');

/** Türkçe alfabe — başka harf içeren madde oyuna girmez. */
const HARFLER = /^[abcçdefgğhıijklmnoöprsştuüvyz]+$/;

const KALIN = new Set(['a', 'ı', 'o', 'u']);

/** Kelimenin son ünlüsü kalınsa çoğul eki -lar, inceyse -ler. */
function cogul(kelime) {
  for (let i = kelime.length - 1; i >= 0; i--) {
    const h = kelime[i];
    if ('aeıioöuü'.includes(h)) return kelime + (KALIN.has(h) ? 'lar' : 'ler');
  }
  return null; // ünlüsüz madde — çoğul yapılmaz
}

const satirlar = readFileSync(HAM, 'utf8').split(/\r?\n/);
const kokler = new Set();
let elenen = 0;

for (const satir of satirlar) {
  const ham = satir.trim();
  if (!ham || ham.startsWith('#')) continue;

  // "badik [P:Adj]" → "badik"
  const kelime = ham.split('[')[0].trim();
  if (!kelime) continue;

  // Ünlemler ("aaah") ve ikilemeler ("abuk sabuk") sözlükte var ama
  // kelime oyununda aranmaz; havuzu kirletirler.
  const etiket = ham.slice(ham.indexOf('['));
  if (/P:(Interj|Dup|Punc)/.test(etiket)) { elenen++; continue; }

  // Çok kelimeli maddeler ("ön yargı") oyunda yazılamaz.
  if (/\s/.test(kelime)) { elenen++; continue; }

  // Özel adlar büyük harfle başlıyor; oyuna girmemeli.
  if (kelime[0] !== kelime[0].toLocaleLowerCase('tr')) { elenen++; continue; }

  const k = kelime.toLocaleLowerCase('tr');

  // Noktalama, kısaltma, yabancı harf, tire içerenler.
  if (!HARFLER.test(k)) { elenen++; continue; }

  // İKİ HARFLİ KÖKLER LİSTEDE KALIR.
  // Oyunda en kısa CEVAP üç harf (bkz. EN_KISA_KELIME) ama sözlük
  // cevapları değil KÖKLERİ tutuyor: "evde" ancak "ev" listedeyse
  // doğrulanabiliyor. Önce üç harf altı elenmişti ve "ev", "su", "el"
  // gibi gündelik köklerin bütün çekimleri reddediliyordu.
  if (k.length < 2 || k.length > 15) { elenen++; continue; }

  kokler.add(k);
}

const tumu = new Set(kokler);
for (const k of kokler) {
  const c = cogul(k);
  if (c && c.length <= 16) tumu.add(c);
}

const sirali = [...tumu].sort((a, b) => a.localeCompare(b, 'tr'));

mkdirSync(dirname(CIKTI), { recursive: true });
const BT = String.fromCharCode(96);
const baslik = [
  '/**',
  ' * kelimeler.ts - URETILMIS DOSYA, ELLE DUZENLENMEZ.',
  ' *',
  ' * Kaynak: Zemberek-NLP Turkce kok sozlugu (Apache License 2.0).',
  ' * Lisans metni: veri/ZEMBEREK-LISANS.txt',
  ' * Ureten betik: araclar/kelime-listesi-uret.mjs',
  ' *',
  ` * ${sirali.length} kelime (kokler + duzenli cogullar), satir satir.`,
  ' */',
  '',
  `export const KELIME_METNI = ${BT}`,
].join('\n');
writeFileSync(CIKTI, baslik + sirali.join('\n') + '\n' + BT + ';\n', 'utf8');

const uzunluk = {};
for (const k of sirali) uzunluk[k.length] = (uzunluk[k.length] ?? 0) + 1;

console.log(`Kök: ${kokler.size}  ·  Çoğullarla: ${sirali.length}  ·  Elenen: ${elenen}`);
console.log('Uzunluk dağılımı:', Object.entries(uzunluk).map(([u, n]) => `${u}:${n}`).join(' '));
console.log(`Yazıldı: ${CIKTI}`);
