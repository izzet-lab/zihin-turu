/**
 * bot.ts — Kelime turunun botu.
 *
 * NEDEN VAR
 * Düello ve arena bota ihtiyaç duyuyor; kelime turu bunu uygulamadan
 * o modlara giremiyordu. Arayüz `BotYetenegi` ile genişletildi
 * (bkz. cekirdek/index.ts), burası onun kelime karşılığı.
 *
 * BOT HİLE YAPMAZ
 * Sayı turundaki ilkenin aynısı: bot çözümü hazır almıyor. Kendi
 * aramasını yapıyor ve araması PROFİLİNE GÖRE SINIRLI — zayıf bot
 * sözlüğün yalnızca bir kısmına bakıyor, bu yüzden kısa kelimeler
 * buluyor. Güçlü bot daha çok bakıyor.
 *
 * TOHUMLU
 * Sunucu maç durumunu bellekte tutmuyor; her istekte yeniden kuruyor.
 * Botun planı da bu yeniden kurmanın parçası, bu yüzden her
 * hesaplandığında aynı çıkmak zorunda.
 */

import { rastgele } from '@tamisabet/cekirdek';
import { havuzdanYazilabilir, EN_KISA_KELIME, type KelimeVeri } from './mantik.ts';
import { turkceKucult, type Sozluk } from './sozluk.ts';

export type KelimeProfilAd = 'cirak' | 'acemi' | 'orta' | 'usta';

interface Profil {
  /** Sözlüğün ne kadarına bakıyor (0–1). Zayıf bot az bakar. */
  taramaOrani: number;
  /** En uzundan kaç harf kısasına razı. */
  hedefEksigi: number;
  minGecikme: number;
  maxGecikme: number;
}

/**
 * Profiller sayı turundakiyle aynı ruhta: zayıf bot yavaş ve kısa
 * bulur, güçlü bot hızlı ve uzun.
 */
export const KELIME_PROFILLERI: Record<KelimeProfilAd, Profil> = {
  cirak: { taramaOrani: 0.08, hedefEksigi: 3, minGecikme: 22, maxGecikme: 40 },
  acemi: { taramaOrani: 0.2, hedefEksigi: 2, minGecikme: 14, maxGecikme: 26 },
  orta: { taramaOrani: 0.45, hedefEksigi: 1, minGecikme: 9, maxGecikme: 18 },
  usta: { taramaOrani: 0.85, hedefEksigi: 0, minGecikme: 5, maxGecikme: 11 },
};

export const KELIME_PROFIL_SIRASI: readonly KelimeProfilAd[] = [
  'cirak',
  'acemi',
  'orta',
  'usta',
];

/**
 * Arenadaki bot koltuklarının güç sırası.
 * Sayı turundaki gerekçenin aynısı: arenada dört rakip var ve ilk tam
 * isabet turu kapatıyor; hepsi güçlü olursa tur oyuncu oynamadan
 * biter. En fazla biri güçlü.
 */
export const KELIME_ARENA_KADEMELERI: readonly KelimeProfilAd[] = [
  'cirak',
  'cirak',
  'acemi',
  'orta',
];

const ADLAR = [
  'Emine K.',
  'Murat Ş.',
  'Hasan T.',
  'Sena Ö.',
  'Mustafa Y.',
  'İbrahim K.',
  'Meryem A.',
  'Ömer K.',
];

/** Dereceden kademe seçer — sayı turundaki eşiklerle aynı. */
export function kelimeProfilSec(gucIpucu: number): KelimeProfilAd {
  if (gucIpucu < 1000) return 'acemi';
  if (gucIpucu < 1400) return 'orta';
  return 'usta';
}

/** Adlar tekrar etmez: aynı arenada üç "İbrahim K." yarışı sahte gösterir. */
export function kelimeBotlari(
  adet: number,
  gucIpucu: number,
  arenaMi: boolean,
): { ad: string; profil: KelimeProfilAd }[] {
  const havuz = [...ADLAR];
  const botlar: { ad: string; profil: KelimeProfilAd }[] = [];
  for (let i = 0; i < adet; i++) {
    const profil = arenaMi
      ? KELIME_ARENA_KADEMELERI[Math.min(i, KELIME_ARENA_KADEMELERI.length - 1)]!
      : kelimeProfilSec(gucIpucu);
    const j = Math.floor(Math.random() * havuz.length);
    botlar.push({ ad: havuz.splice(j, 1)[0] ?? 'Rakip', profil });
  }
  return botlar;
}

/**
 * Botun bu turda bulduğu kelime.
 *
 * Sözlüğü uzundan kısaya tarıyor ama profiline göre BİR KISMINA
 * bakıyor: tarama oranı, her uzunluktaki aday listesinin ne kadarının
 * gezileceğini belirliyor. Nereden başlayacağı tohumdan geliyor, yani
 * aynı bot aynı turda hep aynı kelimeyi buluyor ama farklı botlar
 * farklı yerlere bakıyor.
 */
export function kelimeBotCevabi(
  veri: KelimeVeri,
  profil: KelimeProfilAd,
  sozluk: Sozluk,
  tohum: number,
): string | null {
  const p = KELIME_PROFILLERI[profil];
  const zar = rastgele(tohum);
  const enDusuk = Math.max(EN_KISA_KELIME, veri.enUzunUzunluk - p.hedefEksigi);

  for (let u = veri.harfler.length; u >= enDusuk; u--) {
    const adaylar = sozluk.uzunluktakiler(u);
    if (adaylar.length === 0) continue;

    const bakilacak = Math.max(1, Math.floor(adaylar.length * p.taramaOrani));
    const baslangic = Math.floor(zar() * adaylar.length);
    for (let i = 0; i < bakilacak; i++) {
      const k = adaylar[(baslangic + i) % adaylar.length]!;
      if (havuzdanYazilabilir(veri.harfler, k)) return turkceKucult(k);
    }
  }
  return null;
}

/** Botun cevap verme anı (ms) — profilden ve tohumdan. */
export function kelimeBotGecikmesi(profil: KelimeProfilAd, tohum: number): number {
  const p = KELIME_PROFILLERI[profil];
  const zar = rastgele(tohum ^ 0x5bf0_3635);
  return Math.round((p.minGecikme + zar() * (p.maxGecikme - p.minGecikme)) * 1000);
}

/**
 * Arenada botun en erken cevap anı — tur süresinin yarısı.
 * Sayı turundaki gerekçenin aynısı: ilk tam isabet turu kapatıyor.
 */
export function kelimeGecikmeTabaniMs(turSuresiSn: number): number {
  return Math.round(turSuresiSn * 0.5 * 1000);
}
