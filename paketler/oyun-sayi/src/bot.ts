/**
 * BOT
 *
 * Rakip bulunamazsa bot devreye girer, maç kurulamadan ölmez. Küçük
 * bir oyuncu tabanıyla açılışta hayatta kalmanın yolu.
 *
 * Bot "hile yapmasın" diye çözümü hazır ALMAZ; kendi çözücüsünü
 * sınırlı süreyle çalıştırır. Seviye düştükçe süre sınırı ve isabet
 * olasılığı düşer — böylece zayıf bot gerçekten zayıf.
 */

import { rastgele, type Tur } from '@zihinturu/cekirdek';
import { cozZinciri, type Adim, type SayiVeri } from './mantik.ts';

export type ProfilAd = 'cirak' | 'acemi' | 'orta' | 'usta';

interface Profil {
  isabet: number;
  minGecikme: number;
  maxGecikme: number;
  aramaMs: number;
  yakinlik: number;
}

/*
 * PROFİLLER — zayıftan güçlüye.
 *
 * `cirak` yeni eklendi. Sebebi ölçülmüş bir sorun: Isınma seviyesinde
 * ilk düellosunu oynayan oyuncu 1-4 kaybediyordu. İlk düellosunu
 * kaybeden oyuncu bir daha düello açmıyor — bu, jokerlerden önceki
 * "hiçbir şey yapamadan bitti" sorununun düello hâli.
 *
 * `cirak` bilerek çok zayıf: nadiren tam isabet yapar, geç cevap verir
 * ve yaklaşık cevabı da uzaktır. Amaç ilk maçın kazanılması.
 */
export const PROFILLER: Record<ProfilAd, Profil> = {
  cirak: { isabet: 0.10, minGecikme: 22, maxGecikme: 40, aramaMs: 12, yakinlik: 25 },
  acemi: { isabet: 0.35, minGecikme: 14, maxGecikme: 26, aramaMs: 40, yakinlik: 12 },
  orta: { isabet: 0.62, minGecikme: 9, maxGecikme: 18, aramaMs: 150, yakinlik: 6 },
  usta: { isabet: 0.88, minGecikme: 5, maxGecikme: 11, aramaMs: 600, yakinlik: 2 },
};

/** Zayıftan güçlüye sıra — kademe hesapları bu diziye bakar. */
export const PROFIL_SIRASI: readonly ProfilAd[] = ['cirak', 'acemi', 'orta', 'usta'];

/** Yeni oyuncunun korunduğu düello sayısı. */
export const KORUMALI_DUELLO_SAYISI = 3;

const ADLAR = ['Emine K.', 'Murat Ş.', 'Hasan T.', 'Sena Ö.', 'Mustafa Y.', 'İbrahim K.', 'Meryem A.', 'Ömer K.'];

export interface Bot {
  id: string;
  ad: string;
  bot: true;
  profil: ProfilAd;
}

/**
 * Oyuncuya hangi güçte bot verilmeli?
 *
 * Üç kural, sırayla:
 *
 * 1. **İlk üç düello korumalıdır.** Oyuncu ne kadar iyi olursa olsun
 *    en zayıf bot gelir. Yeni oyuncunun ilk maçı kazanması, oyunu
 *    bırakmamasından daha ucuz bir bedel.
 * 2. Sonrasında derecesine göre kademe seçilir.
 * 3. **Üst üste iki kayıptan sonra bir kademe düşülür.** Kaybetmeye
 *    başlayan oyuncuyu daha da zorlamak, oyundan koparmanın en hızlı yolu.
 *
 * Oyuncuya bunun hiçbiri söylenmez; sessizce ayarlanır.
 */
export function botProfilSec(g: {
  /** Oyuncunun bitirdiği düello sayısı. */
  macSayisi: number;
  /** Üst üste kaç maç kaybetti? */
  ustUsteKayip: number;
  elo: number;
}): ProfilAd {
  if (g.macSayisi < KORUMALI_DUELLO_SAYISI) return 'cirak';

  const temel: ProfilAd = g.elo < 1000 ? 'acemi' : g.elo < 1400 ? 'orta' : 'usta';
  let sira = PROFIL_SIRASI.indexOf(temel);
  if (g.ustUsteKayip >= 2) sira -= 1;
  return PROFIL_SIRASI[Math.max(0, Math.min(PROFIL_SIRASI.length - 1, sira))]!;
}

export function botUret(elo: number, profilAdi?: ProfilAd): Bot {
  const profil: ProfilAd =
    profilAdi ?? (elo < 1000 ? 'acemi' : elo < 1400 ? 'orta' : 'usta');
  return {
    id: 'bot:' + Math.random().toString(36).slice(2, 9),
    ad: ADLAR[Math.floor(Math.random() * ADLAR.length)]!,
    bot: true,
    profil,
  };
}

export interface BotPlani {
  gecikmeMs: number;
  /** null ise bot bu turu pas geçer. */
  adimlar: Adim[] | null;
}

/**
 * Botun bu tur ne yapacağına karar verir.
 *
 * `zar` verilmezse gerçek rastgelelik kullanılır. Düelloda TOHUMLU zar
 * verilir — sebebi aşağıda, `botPlaniTohumlu`.
 */
export function botPlani(bot: Bot, tur: Tur, zar: () => number = Math.random): BotPlani {
  const veri = tur.veri as SayiVeri;
  const p = PROFILLER[bot.profil];
  const gecikme = (p.minGecikme + zar() * (p.maxGecikme - p.minGecikme)) * 1000;

  // Bot kendi çözücüsünü kısıtlı süreyle çalıştırır.
  const bulunan = cozZinciri(veri.sayilar, veri.hedef, p.aramaMs);
  if (bulunan.fark !== 0) {
    // Tam bulamadıysa, yeterince yakınsa yaklaşık cevabı gönderir.
    return bulunan.adimlar.length && bulunan.fark <= p.yakinlik
      ? { gecikmeMs: gecikme, adimlar: bulunan.adimlar }
      : { gecikmeMs: gecikme, adimlar: null };
  }
  // Tam çözümü bulsa bile profil isabetine göre bazen kaçırır.
  if (zar() > p.isabet) {
    const kisa = bulunan.adimlar.slice(0, Math.max(1, bulunan.adimlar.length - 1));
    return { gecikmeMs: gecikme, adimlar: kisa }; // yarım kalmış zincir
  }
  return { gecikmeMs: gecikme, adimlar: bulunan.adimlar };
}

/**
 * Düellodaki botun planı — TOHUMLU, yani her hesaplandığında aynı.
 *
 * NEDEN DETERMİNİST OLMAK ZORUNDA
 * Sunucu maç durumunu bellekte tutmuyor; her istekte kayıtlardan
 * yeniden kuruyor. Botun hamlesi de bu yeniden kurmanın parçası: "bot
 * şu ana kadar oynadı mı?" sorusu her istekte yeniden soruluyor. Plan
 * gerçek rastgelelikle üretilseydi her istekte başka bir cevap çıkar,
 * bot bir turda hem oynamış hem oynamamış görünürdü.
 *
 * Tohumlu olunca bot, maçın tohumundan ve tur numarasından türeyen tek
 * bir plana sahip oluyor — kim ne zaman sorarsa sorsun aynı cevap.
 *
 * Bot yine çözümü HAZIR ALMIYOR: kendi çözücüsünü profiline göre
 * sınırlı süreyle çalıştırıyor (kural: bot hile yapmaz).
 */
export function botPlaniTohumlu(bot: Bot, tur: Tur, tohum: number): BotPlani {
  return botPlani(bot, tur, rastgele(tohum));
}
