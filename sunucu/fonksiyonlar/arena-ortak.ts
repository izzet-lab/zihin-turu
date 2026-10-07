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
} from '@zihinturu/cekirdek';
import {
  uretimYap,
  varsayilanBuyukAdet,
  dogrulaZinciri,
  turKur,
  botPlaniTohumlu,
  botUret,
  SEVIYE_LISTESI,
  type Adim,
  type ProfilAd,
} from '@zihinturu/oyun-sayi';

// deno-lint-ignore no-explicit-any
type Db = any;

/** Bekleyen arena bu süre dolunca botlarla tamamlanıp başlar. */
export const ARENA_BEKLEME_SN = 10;

export interface ArenaMac {
  id: string;
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

/** Bir turun bulmacasını maç tohumundan üretir. Tek kaynak burası. */
export function turUret(mac: ArenaMac, turNo: number) {
  const turTohumu = duelloTurTohumu(Number(mac.tohum), turNo);
  return uretimYap(mac.seviye, turTohumu, varsayilanBuyukAdet(mac.seviye));
}

export function turSuresi(seviye: string): number {
  return SEVIYE_LISTESI.find((s) => s.anahtar === seviye)?.sure ?? 60;
}

/**
 * Adım zincirini doğrular ve hedefe uzaklığı döndürür.
 * Geçersiz zincirde null — sunucu istemciye güvenmez (kural 2).
 */
export function uzaklikHesapla(
  mac: ArenaMac,
  turNo: number,
  adimlar: Adim[],
): number | null {
  const uretim = turUret(mac, turNo);
  if (adimlar.length === 0) return uretim.hedef;
  const dogr = dogrulaZinciri(uretim.sayilar, adimlar, uretim.hedef);
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

  for (let koltuk = 1; koltuk <= ARENA_KOLTUK; koltuk++) {
    if (dolu.has(koltuk)) continue;
    // Bot gücü koltuk numarasından türetiliyor: arena karışık seviyede
    // bir yarış olmalı, beş aynı güçte bot sıkıcı olurdu.
    const bot = botUret(900 + koltuk * 150);
    yeniler.push({
      mac_id: mac.id,
      koltuk,
      oyuncu_id: null,
      bot_profil: bot.profil,
      bot_ad: bot.ad,
    });
  }

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
    const tur = turKur(mac.seviye, duelloTurTohumu(Number(mac.tohum), turNo));
    const plan = botPlaniTohumlu(
      {
        id: `bot${bot.koltuk}`,
        ad: bot.bot_ad ?? 'Rakip',
        bot: true as const,
        profil: (bot.bot_profil as ProfilAd) ?? 'orta',
      },
      tur,
      botTohumu,
    );

    if (simdiMs - turBasladiMs < plan.gecikmeMs) continue;
    if (!plan.adimlar || plan.adimlar.length === 0) continue;

    // Botun zinciri de doğrulanır; bot ayrıcalıklı değil.
    const uzaklik = uzaklikHesapla(mac, turNo, plan.adimlar as Adim[]);
    if (uzaklik == null) continue;

    satirlar.push({
      mac_id: mac.id,
      tur_no: turNo,
      koltuk: bot.koltuk,
      uzaklik,
      kilitli: true,
      bildirildi: new Date(turBasladiMs + plan.gecikmeMs).toISOString(),
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
  const sure = turSuresi(mac.seviye);

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
      await db
        .from('arena_mac')
        .update({ durum: 'bitti', bitti: new Date().toISOString() })
        .eq('id', guncel.id)
        .eq('durum', 'basladi');
      return { durum, koltuklar, podyum: podyum(durum) };
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
