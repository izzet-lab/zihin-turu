/**
 * arena-ortak.ts — Arena fonksiyonlarının paylaştığı maç mantığı.
 *
 * `arena-ara`, `arena-durum` ve `arena-gonder` aynı işi yapmak zorunda:
 * botları oynat, süresi dolan turu kapat, puanları yaz, arena bittiyse
 * podyumu çıkar. Üç yerde ayrı yazılsaydı biri düzeltilip diğerleri
 * unutulurdu — düelloda da aynı sebeple ortak bir dosya var.
 *
 * Buradaki hiçbir kural yeniden tanımlanmıyor: akış çekirdekten
 * (`arenaIndirge`), bulmaca ve doğrulama oyun paketinden geliyor
 * (kural 1).
 */

import {
  ARENA_KOLTUK,
  ARENA_TUR_SAYISI,
  arenaBaslat,
  arenaIndirge,
  duelloTurTohumu,
  podyum,
  turSuresiDoldu,
  type ArenaDurum,
  type PodyumSatiri,
} from '@tamisabet/cekirdek';
import type { BotTanim, Cevap, Tur } from '@tamisabet/cekirdek';
import { oyunSec, turSuresi as oyunTurSuresi } from './oyunlar.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

/** Bekleyen arena bu süre dolunca botlarla tamamlanıp başlar. */
export const ARENA_BEKLEME_SN = 10;

export interface ArenaMac {
  id: string;
  /** Hangi oyun — sütun Faz 3'ten beri var, arena artık onu okuyor. */
  oyun?: string | null;
  seviye: string;
  tohum: number;
  durum: string;
  aktif_tur: number;
  tur_basladi: string | null;
  olusturuldu: string;
}

export interface ArenaKoltuk {
  mac_id: string;
  koltuk: number;
  oyuncu_id: string | null;
  bot_profil: string | null;
  bot_ad: string | null;
  puan: number;
  toplam_uzaklik: number;
  ayrildi: boolean;
}

/**
 * Bir turun bulmacasını maç tohumundan üretir. Tek kaynak burası.
 *
 * Hangi oyun olduğu maçın `oyun` sütununda; arena artık sayı turunu
 * TANIMIYOR, yalnızca `TurSaglayici` arayüzünü çağırıyor.
 */
export function turUret(mac: ArenaMac, turNo: number): Tur {
  const turTohumu = duelloTurTohumu(Number(mac.tohum), turNo);
  return oyunSec(mac.oyun).turUret(mac.seviye, turTohumu);
}

export function turSuresi(oyun: string | null | undefined, seviye: string): number {
  return oyunTurSuresi(oyun, seviye);
}

/**
 * Cevabı doğrular ve hedefe uzaklığı döndürür.
 * Geçersiz cevapta null — sunucu istemciye güvenmez (kural 2).
 *
 * `uzaklik`ın ANLAMINI arena bilmez: sayı turunda hedefe kalan fark,
 * kelime turunda en uzun kelimeye kalan harf. Arena yalnızca
 * "0 ise tam isabet" kuralını uygular.
 */
export function uzaklikHesapla(
  mac: ArenaMac,
  turNo: number,
  cevap: Cevap,
): number | null {
  const saglayici = oyunSec(mac.oyun);
  const tur = turUret(mac, turNo);
  const dogr = saglayici.dogrula(tur, cevap);
  return dogr.gecerli ? dogr.uzaklik : null;
}

/** Boş koltukları botla doldurur ve arenayı başlatır. */
export async function arenayiBaslat(db: Db, mac: ArenaMac): Promise<void> {
  const { data: koltuklar } = await db
    .from('arena_koltuk')
    .select('koltuk')
    .eq('mac_id', mac.id);

  const dolu = new Set((koltuklar ?? []).map((k: { koltuk: number }) => k.koltuk));
  const yeniler: Record<string, unknown>[] = [];

  const bosKoltuklar: number[] = [];
  for (let koltuk = 1; koltuk <= ARENA_KOLTUK; koltuk++) {
    if (!dolu.has(koltuk)) bosKoltuklar.push(koltuk);
  }

  // Botlar oyunun KENDİ bot yeteneğinden geliyor; arena kademeyi
  // bilmiyor. Güç ipucu olarak orta bir derece veriliyor, oyun bunu
  // kendi kademesine çeviriyor.
  const botlar: BotTanim[] = oyunSec(mac.oyun).bot?.botlar(bosKoltuklar.length, 1200) ?? [];
  bosKoltuklar.forEach((koltuk, i) => {
    const bot = botlar[i]!;
    yeniler.push({
      mac_id: mac.id,
      koltuk,
      oyuncu_id: null,
      bot_profil: bot.profil,
      bot_ad: bot.ad,
    });
  });

  if (yeniler.length > 0) await db.from('arena_koltuk').insert(yeniler);

  const simdi = new Date().toISOString();
  await db
    .from('arena_mac')
    .update({ durum: 'basladi', basladi: simdi, tur_basladi: simdi, aktif_tur: 1 })
    .eq('id', mac.id)
    .eq('durum', 'bekliyor');
}

/**
 * Botların sırası geldiyse hamlelerini yazar.
 *
 * Düellodaki ile aynı ilke: plan TOHUMLU, yani her istekte aynı çıkıyor.
 * Sunucu durumu bellekte tutmadığı için "bot oynadı mı?" sorusunun
 * cevabı her çağrıda aynı olmalı.
 *
 * Bot satırları KİLİTLİ yazılır: hamlesi tek seferlik, sonradan
 * iyileştirmiyor.
 */
async function botlariOynat(
  db: Db,
  mac: ArenaMac,
  koltuklar: ArenaKoltuk[],
  turNo: number,
  simdiMs: number,
): Promise<void> {
  const botlar = koltuklar.filter((k) => k.bot_profil && !k.ayrildi);
  if (botlar.length === 0 || !mac.tur_basladi) return;

  const saglayici = oyunSec(mac.oyun);
  // Bot yeteneği olmayan bir oyun arenaya zaten giremez; yine de
  // savunma: botsuz oyunda hiçbir şey yapılmıyor.
  if (!saglayici.bot) return;

  const { data: mevcut } = await db
    .from('arena_tur')
    .select('koltuk')
    .eq('mac_id', mac.id)
    .eq('tur_no', turNo);
  const yazilmis = new Set((mevcut ?? []).map((t: { koltuk: number }) => t.koltuk));

  const turBasladiMs = Date.parse(mac.tur_basladi);
  const satirlar: Record<string, unknown>[] = [];

  for (const bot of botlar) {
    if (yazilmis.has(bot.koltuk)) continue;

    // Her botun kendi tohumu: aynı turda beş bot aynı anda aynı cevabı
    // vermemeli, yoksa yarış yapay görünür.
    const botTohumu = (duelloTurTohumu(Number(mac.tohum), turNo) + bot.koltuk * 104729) >>> 0;
    const tur = turUret(mac, turNo);
    const plan = saglayici.bot!.botPlani(
      tur,
      { ad: bot.bot_ad ?? 'Rakip', profil: bot.bot_profil ?? '' },
      botTohumu,
    );

    // Arenada dört rakip var ve ilk tam isabet turu kapatıyor. Taban
    // olmadan tur, oyuncu ikinci işlemini yapmadan bitiyordu.
    const gecikme = Math.max(
      plan.gecikmeMs,
      saglayici.bot!.botGecikmeTabaniMs(turSuresi(mac.oyun, mac.seviye)),
    );
    if (simdiMs - turBasladiMs < gecikme) continue;
    if (!plan.cevap) continue;

    // Botun cevabı da doğrulanır; bot ayrıcalıklı değil.
    const uzaklik = uzaklikHesapla(mac, turNo, plan.cevap);
    if (uzaklik == null) continue;

    satirlar.push({
      mac_id: mac.id,
      tur_no: turNo,
      koltuk: bot.koltuk,
      uzaklik,
      kilitli: true,
      bildirildi: new Date(turBasladiMs + gecikme).toISOString(),
    });
  }

  if (satirlar.length > 0) {
    await db.from('arena_tur').upsert(satirlar, { onConflict: 'mac_id,tur_no,koltuk' });
  }
}

export interface ArenaSonuc {
  durum: ArenaDurum;
  koltuklar: ArenaKoltuk[];
  podyum: PodyumSatiri[] | null;
}

/**
 * Arenayı olması gereken noktaya taşır ve güncel durumu döndürür.
 *
 * Sırayla: botları oynat → durumu kayıtlardan kur → tur kapandıysa
 * sonrakini aç → arena bittiyse puanları ve podyumu yaz.
 *
 * Süresi dolmuş birden çok tur olabilir (herkes ekrandan uzaklaşmışsa);
 * döngü bu yüzden var.
 */
export async function arenayiIlerlet(db: Db, mac: ArenaMac): Promise<ArenaSonuc> {
  let guncel = { ...mac };
  const sure = turSuresi(mac.oyun, mac.seviye);

  const { data: koltukSatirlari } = await db
    .from('arena_koltuk')
    .select('*')
    .eq('mac_id', mac.id)
    .order('koltuk', { ascending: true });
  const koltuklar = (koltukSatirlari ?? []) as ArenaKoltuk[];

  for (let adim = 0; adim < ARENA_TUR_SAYISI + 1; adim++) {
    const simdiMs = Date.now();
    await botlariOynat(db, guncel, koltuklar, guncel.aktif_tur, simdiMs);

    const { data: tumSatirlar } = await db
      .from('arena_tur')
      .select('tur_no, koltuk, uzaklik, kilitli, bildirildi')
      .eq('mac_id', guncel.id)
      .order('bildirildi', { ascending: true });

    // Botun cevabı gecikmesi dolmadan görünmez; satır önceden yazılıyor
    // ama zamanı gelene kadar yok sayılıyor.
    const satirlar = (tumSatirlar ?? []).filter(
      (s: { bildirildi: string }) => Date.parse(s.bildirildi) <= simdiMs,
    );

    const doldu = guncel.tur_basladi
      ? turSuresiDoldu(Date.parse(guncel.tur_basladi), simdiMs, sure)
      : false;

    // Yarışta kalan herkes kilitlediyse tur beklemeden kapanır.
    const kalanlar = koltuklar.filter((k) => !k.ayrildi);
    const kilitliSayisi = satirlar.filter(
      (s: { tur_no: number; kilitli?: boolean }) =>
        s.tur_no === guncel.aktif_tur && s.kilitli === true,
    ).length;
    const herkesKilitledi = kalanlar.length > 0 && kilitliSayisi >= kalanlar.length;

    // Durumu kayıtlardan sıfırdan kur.
    let durum: ArenaDurum = arenaBaslat(kalanlar.map((k) => String(k.koltuk)));
    for (const ayrilan of koltuklar.filter((k) => k.ayrildi)) {
      durum = arenaIndirge(durum, { t: 'ayrildi', koltuk: String(ayrilan.koltuk) });
    }

    for (let n = 1; n <= guncel.aktif_tur; n++) {
      if (n > 1) durum = arenaIndirge(durum, { t: 'turBasla' });
      for (const s of satirlar.filter(
        (x: { tur_no: number; uzaklik: number | null }) => x.tur_no === n && x.uzaklik != null,
      )) {
        durum = arenaIndirge(durum, {
          t: 'uzaklik',
          koltuk: String(s.koltuk),
          uzaklik: s.uzaklik as number,
        });
      }
      const kapanmali = n < guncel.aktif_tur ? true : doldu || herkesKilitledi;
      if (kapanmali && durum.turAcik) durum = arenaIndirge(durum, { t: 'sureDoldu' });
    }

    // Puanları koltuk satırlarına yaz.
    for (const k of koltuklar) {
      const anahtar = String(k.koltuk);
      const yeniPuan = durum.puan[anahtar] ?? 0;
      const yeniUzaklik = durum.toplamUzaklik[anahtar] ?? 0;
      if (k.puan !== yeniPuan || k.toplam_uzaklik !== yeniUzaklik) {
        await db
          .from('arena_koltuk')
          .update({ puan: yeniPuan, toplam_uzaklik: yeniUzaklik })
          .eq('mac_id', guncel.id)
          .eq('koltuk', k.koltuk);
        k.puan = yeniPuan;
        k.toplam_uzaklik = yeniUzaklik;
      }
    }

    if (durum.bitti) {
      const sira = podyum(durum);
      // Arenayı YALNIZCA hâlâ süren bir arenaysa bitir. İki istek aynı
      // anda bitirmeye çalışırsa yalnızca biri satırı değiştirir;
      // madalyalar iki kez yazılmaz.
      const { data: bitirilen } = await db
        .from('arena_mac')
        .update({ durum: 'bitti', bitti: new Date().toISOString() })
        .eq('id', guncel.id)
        .eq('durum', 'basladi')
        .select('id');

      if (bitirilen && (bitirilen as unknown[]).length > 0) {
        await derecelereIsle(db, koltuklar, sira);
      }
      return { durum, koltuklar, podyum: sira };
    }

    if (durum.turAcik) return { durum, koltuklar, podyum: null };

    // Tur kapandı, sıradakini aç.
    //
    // Süre dolduğu için kapandıysa zaman çizgisi korunur (sıradaki tur
    // geçmişte başlamış sayılır); tam isabetle ya da kilitle erken
    // kapandıysa şimdi başlar. Düellodaki kararın aynısı.
    const oncekiMs = guncel.tur_basladi ? Date.parse(guncel.tur_basladi) : simdiMs;
    const yeniBaslangic =
      turSuresiDoldu(oncekiMs, simdiMs, sure) && !herkesKilitledi
        ? new Date(oncekiMs + sure * 1000).toISOString()
        : new Date().toISOString();

    const sonrakiTur = guncel.aktif_tur + 1;
    await db
      .from('arena_mac')
      .update({ aktif_tur: sonrakiTur, tur_basladi: yeniBaslangic })
      .eq('id', guncel.id);

    guncel = { ...guncel, aktif_tur: sonrakiTur, tur_basladi: yeniBaslangic };
  }

  return { durum: arenaBaslat([]), koltuklar, podyum: null };
}

/**
 * Arena sonucunu madalya tablosuna işler.
 *
 * BOTA KARŞI KAZANILAN PODYUM SAYILMAZ.
 * Arena boş koltukları botla dolduruyor; tek başına katılan oyuncu her
 * seferinde dört bota karşı yarışıp madalya toplardı ve tablo birkaç
 * günde anlamsızlaşırdı. Sonuç yalnızca EN AZ İKİ gerçek oyuncu varsa
 * işleniyor — düellodaki "bota karşı derece değişmez" kuralının arena
 * karşılığı.
 *
 * Yarıştan çıkanlar da işlenir: puanları ve arena sayıları yazılır ama
 * podyumda zaten en sonda oldukları için madalya almazlar.
 */
async function derecelereIsle(
  db: Db,
  koltuklar: ArenaKoltuk[],
  sira: PodyumSatiri[],
): Promise<void> {
  const gercekler = koltuklar.filter((k) => k.oyuncu_id);
  if (gercekler.length < 2) return;

  const kimlikler = gercekler.map((k) => k.oyuncu_id as string);
  const { data: mevcutlar } = await db
    .from('arena_derece')
    .select('oyuncu_id, arena_sayisi, altin, gumus, bronz, toplam_puan')
    .in('oyuncu_id', kimlikler);

  const satirlar = gercekler.map((k) => {
    const once = (mevcutlar ?? []).find(
      (d: { oyuncu_id: string }) => d.oyuncu_id === k.oyuncu_id,
    ) ?? { arena_sayisi: 0, altin: 0, gumus: 0, bronz: 0, toplam_puan: 0 };

    const benimSira = sira.find((p) => Number(p.koltuk) === k.koltuk);
    const madalya = benimSira?.madalya ?? null;

    return {
      oyuncu_id: k.oyuncu_id,
      arena_sayisi: once.arena_sayisi + 1,
      altin: once.altin + (madalya === 'altin' ? 1 : 0),
      gumus: once.gumus + (madalya === 'gumus' ? 1 : 0),
      bronz: once.bronz + (madalya === 'bronz' ? 1 : 0),
      toplam_puan: once.toplam_puan + k.puan,
      guncellendi: new Date().toISOString(),
    };
  });

  await db.from('arena_derece').upsert(satirlar, { onConflict: 'oyuncu_id' });
}
