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
const SIKLIK = process.argv[3];
if (!HAM || !SIKLIK) {
  console.error(
    'Kullanim: node araclar/kelime-listesi-uret.mjs <ham-sozluk> <siklik-listesi>',
  );
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
/*
 * BAGLI GOVDELER
 *
 * Bazi kokler unlu ile baslayan bir ek aldiginda sekil degistiriyor ve
 * ortaya sozlukte olmayan bir govde cikiyor:
 *
 *   burun + u  -> burnu   (son unlu duser)
 *   sehir + in -> sehrin
 *   hak   + i  -> hakki   (son unsuz ikilenir)
 *
 * Cekim tanima bu govdeleri sozlukte bulamadigi icin "burnu" ve
 * "hakki" reddediliyordu. Hangi kokun boyle davrandigi kurala
 * baglanamaz, SOZLUKTE YAZILI: Zemberek bunlari `LastVowelDrop` ve
 * `Doubling` olarak isaretliyor. Isaretli koklerin bagli govdeleri
 * burada uretilip ayri bir listeye yaziliyor.
 */
const bagliGovdeler = new Set();
const UNLULER = 'aeıioöuü';
let elenen = 0;

/** "burun" -> "burn", "sehir" -> "sehr": son unluyu atar. */
function sonUnluyuAt(k) {
  for (let i = k.length - 1; i >= 0; i--) {
    if (UNLULER.includes(k[i])) return k.slice(0, i) + k.slice(i + 1);
  }
  return null;
}

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

  if (/LastVowelDrop/.test(etiket)) {
    const g = sonUnluyuAt(k);
    if (g && g.length >= 2) bagliGovdeler.add(g);
  }
  if (/Doubling/.test(etiket)) {
    bagliGovdeler.add(k + k[k.length - 1]);
  }
}

/**
 * Oyunda hic gecmemesi istenen kokler: alkollu icecekler ve
 * icki cevresi.
 *
 * KABA_KOKLER'den FARKI: onlar yalnizca hedef olarak secilmiyordu,
 * cevap olarak kabul ediliyordu. Bunlar listeden tamamen cikiyor -
 * proje sahibinin karari. Oyun her yastan oyuncuya acik ve magaza
 * yas derecelendirmesi de bunu soyluyor.
 *
 * Es anlamlisi olan kelimeler BILEREK DISARIDA birakildi: "cin"
 * (cin/peri), "bar" (halk oyunu, basinc birimi), "rom" (Roman),
 * "sek" (sek su), "sise", "kadeh". Bunlari atmak dili fakirlestirir
 * ve asil amaci asar.
 *
 * Eslesme TAM kelime uzerinden; "sarapnel" gibi baska kelimeler
 * yanlislikla elenmez.
 */
const ICKI_KOKLERI = new Set([
  'alkol', 'alkollu', 'alkollü', 'alkolik', 'alkolizm',
  'bira', 'birahane', 'rakı', 'rakici', 'rakıcı',
  'şarap', 'şarapçı', 'şaraphane', 'şarapçılık',
  'votka', 'viski', 'konyak', 'likör', 'şampanya', 'tekila', 'vermut',
  'meyhane', 'meyhaneci', 'meyhanecilik',
  'içki', 'içkici', 'içkicilik',
  'sarhoş', 'sarhoşluk', 'ayyaş', 'ayyaşlık',
  'mey', 'bade', 'ispirto', 'kokteyl',
]);

/** Kok ya da duzenli cogulu icki listesinde mi? */
function ickiMi(k) {
  if (ICKI_KOKLERI.has(k)) return true;
  for (const ek of ['lar', 'ler']) {
    if (k.endsWith(ek) && ICKI_KOKLERI.has(k.slice(0, -ek.length))) return true;
  }
  return false;
}

// Icki kokleri hem taninan hem yaygin listeden cikariliyor.
for (const k of [...kokler]) {
  if (ickiMi(k)) kokler.delete(k);
}
for (const g of [...bagliGovdeler]) {
  if (ickiMi(g)) bagliGovdeler.delete(g);
}

const tumu = new Set(kokler);
for (const k of kokler) {
  const c = cogul(k);
  if (c && c.length <= 16) tumu.add(c);
}

const sirali = [...tumu].sort((a, b) => a.localeCompare(b, 'tr'));

// ---------------------------------------------------------------------
// YAYGIN KELIMELER
//
// Kok sozlugu TDK tabanli: 'bikir', 'cunun', 'birsam' gibi artik
// kullanilmayan kelimeler de iceriyor. Oyuncuya 'bu havuzun en uzun
// kelimesi BIRSAM' demek, bulunmasi imkansiz bir hedef koymak demek.
//
// Zemberek'in kendi `first-10K` sikli k listesi (ayni depo, ayni lisans)
// gundelik kelimeleri ayiriyor. Bu alt liste SADECE hedef icin
// kullaniliyor: havuzun cekirdek kelimesi ve 'en uzun kelime' buradan
// seciliyor. Oyuncunun yazdigi kelime ise GENIS listeden kabul
// ediliyor - nadir bir kelime biliyorsa odullendirilsin.
const siklik = new Set(
  readFileSync(SIKLIK, 'utf8')
    .split(/\r?\n/)
    .map((x) => x.trim().toLocaleLowerCase('tr'))
    .filter(Boolean),
);

/**
 * Hedef olarak gosterilmemesi gereken kokler.
 *
 * Bu, betigin ELLE BAKILAN tek parcasi. Siklik listesi kaba sozleri de
 * iceriyor cunku gercekten sik kullaniliyorlar; ama oyun "bu havuzun en
 * uzun kelimesi BOKLAR" demez. Kelimeler yine de KABUL ediliyor - sadece
 * hedef ve cekirdek olarak secilmiyorlar.
 *
 * Liste kisa tutuldu: amac sansur degil, oyunun agzini toplamak.
 */
const KABA_KOKLER = new Set([
  'bok', 'sik', 'am', 'got', 'orospu', 'pic', 'yarak', 'kahpe', 'serefsiz',
  'gavat', 'ibne', 'tasak', 'zikir', 'sicmak', 'sicik', 'ospu',
]);

function kabaMi(k) {
  if (KABA_KOKLER.has(k)) return true;
  for (const ek of ['lar', 'ler']) {
    if (k.endsWith(ek) && KABA_KOKLER.has(k.slice(0, -ek.length))) return true;
  }
  return false;
}

function yayginMi(k) {
  if (kabaMi(k)) return false;
  if (siklik.has(k)) return true;
  // Cogul bicim: koku yayginsa cogulu da yaygin sayilir.
  for (const ek of ['lar', 'ler']) {
    if (k.endsWith(ek) && siklik.has(k.slice(0, -ek.length))) return true;
  }
  return false;
}

const yaygin = sirali.filter((k) => k.length >= 3 && yayginMi(k));

mkdirSync(dirname(CIKTI), { recursive: true });
const BT = String.fromCharCode(96);
const baslik = [
  '/**',
  ' * kelimeler.ts - URETILMIS DOSYA, ELLE DUZENLENMEZ.',
  ' *',
  ' * Kaynak: Zemberek-NLP (Apache License 2.0).',
  ' *   - master-dictionary.dict : taninan kelimeler',
  ' *   - first-10K              : yaygin kelimeler (hedef icin)',
  ' * Lisans metni: veri/ZEMBEREK-LISANS.txt',
  ' * Ureten betik: araclar/kelime-listesi-uret.mjs',
  ' *',
  ` * KELIME_METNI: ${sirali.length} kelime - oyuncunun cevabi buradan kabul edilir.`,
  ` * YAYGIN_METNI: ${yaygin.length} kelime - havuzun cekirdegi ve 'en uzun kelime'`,
  ' *   bu listeden secilir; hedef gunluk hayatta var olan bir kelime olsun.',
  ` * GOVDE_METNI: ${bagliGovdeler.size} bagli govde - tek baslarina kelime DEGIL.`,
  ' *   "burnu" ve "hakki" gibi bicimler taninsin diye cekim cozumlemesinde',
  ' *   govde olarak kabul edilirler (bkz. cekim.ts).',
  ' */',
  '',
  `export const KELIME_METNI = ${BT}`,
].join('\n');

const govde =
  baslik +
  sirali.join('\n') +
  '\n' + BT + ';\n\n' +
  `export const YAYGIN_METNI = ${BT}` +
  yaygin.join('\n') +
  '\n' + BT + ';\n\n' +
  `export const GOVDE_METNI = ${BT}` +
  [...bagliGovdeler].sort((a, b) => a.localeCompare(b, 'tr')).join('\n') +
  '\n' + BT + ';\n';
writeFileSync(CIKTI, govde, 'utf8');

const uzunluk = {};
for (const k of yaygin) uzunluk[k.length] = (uzunluk[k.length] ?? 0) + 1;

console.log(`Bagli govde: ${bagliGovdeler.size}`);
console.log(`Kok: ${kokler.size}  .  Cogullarla: ${sirali.length}  .  Elenen: ${elenen}`);
console.log(`Yaygin (hedef listesi): ${yaygin.length}`);
console.log('Yaygin uzunluk dagilimi:', Object.entries(uzunluk).sort((a, b) => a[0] - b[0]).map(([u, n]) => `${u}:${n}`).join(' '));
console.log(`Yazildi: ${CIKTI}`);
