/**
 * duello-ortak.ts — Düello fonksiyonlarının paylaştığı maç mantığı.
 *
 * `duello-gonder` ve `duello-durum` aynı işi yapmak zorunda: maçı
 * kayıtlardan yeniden kur, botun sırası geldiyse oynat, süresi dolan
 * turları kapat, maç bittiyse dereceleri güncelle. İki yerde ayrı ayrı
 * yazılsaydı biri düzeltilip diğeri unutulurdu.
 *
 * Buradaki hiçbir kural yeniden tanımlanmıyor: akış çekirdekten
 * (`duelloTekrarOynat`), bulmaca ve doğrulama oyun paketinden geliyor
 * (kural 1).
 */

import {
  DUELLO_TUR_SAYISI,
  duelloTekrarOynat,
  duelloTurTohumu,
  eloGuncelle,
  turSuresiDoldu,
  type DuelloDurum,
  type Taraf,
  type TurKaydi,
} from '@zihinturu/cekirdek';
import {
  uretimYap,
  varsayilanBuyukAdet,
  dogrulaZinciri,
  turKur,
  botPlaniTohumlu,
  SEVIYE_LISTESI,
  type Adim,
  type ProfilAd,
} from '@zihinturu/oyun-sayi';

/** Supabase istemcisi; tip ayrıntısı burada önemli değil. */
// deno-lint-ignore no-explicit-any
type Db = any;

export interface Mac {
  id: string;
  seviye: string;
  tohum: number;
  oyuncu_a: string;
  oyuncu_b: string | null;
  bot_profil: string | null;
  bot_ad: string | null;
  aktif_tur: number;
  tur_basladi: string;
  durum: string;
  skor_a: number;
  skor_b: number;
  kazanan: string | null;
}

/** Bir turun bulmacasını maç tohumundan üretir. Tek kaynak burası. */
export function turUret(mac: Mac, turNo: number) {
  const turTohumu = duelloTurTohumu(Number(mac.tohum), turNo);
  return uretimYap(mac.seviye, turTohumu, varsayilanBuyukAdet(mac.seviye));
}

/** Seviyenin tur süresi (saniye). */
export function turSuresi(seviye: string): number {
  return SEVIYE_LISTESI.find((s) => s.anahtar === seviye)?.sure ?? 60;
}

/**
 * Adım zincirini doğrular ve hedefe uzaklığı döndürür.
 * Geçersiz zincirde null döner — sunucu istemciye güvenmez (kural 2).
 */
export function uzaklikHesapla(
  mac: Mac,
  turNo: number,
  adimlar: Adim[],
): number | null {
  const uretim = turUret(mac, turNo);
  if (adimlar.length === 0) return uretim.hedef; // hiç işlem yapılmadı
  const dogr = dogrulaZinciri(uretim.sayilar, adimlar, uretim.hedef);
  return dogr.gecerli ? dogr.uzaklik : null;
}

/**
 * Botun sırası geldiyse hamlesini kaydeder.
 *
 * Bot hamlesi SAKLANMIYOR, her seferinde tohumdan yeniden hesaplanıyor;
 * bu yüzden "bot oynadı mı?" sorusunun cevabı her istekte aynı çıkıyor.
 * Bot yine çözümü hazır almıyor: kendi çözücüsünü profiline göre
 * sınırlı süreyle çalıştırıyor.
 *
 * Bot her zaman B tarafıdır (maç kurulurken böyle kuruluyor).
 */
async function botuOynat(db: Db, mac: Mac, turNo: number, simdiMs: number) {
  if (!mac.bot_profil) return;

  // Bot bu turda zaten oynadıysa tekrar oynatma.
  const { data: mevcut } = await db
    .from('duello_tur')
    .select('taraf')
    .eq('mac_id', mac.id)
    .eq('tur_no', turNo)
    .eq('taraf', 'b')
    .maybeSingle();
  if (mevcut) return;

  const turTohumu = duelloTurTohumu(Number(mac.tohum), turNo);
  const tur = turKur(mac.seviye, turTohumu);
  const bot = {
    id: 'bot',
    ad: mac.bot_ad ?? 'Rakip',
    bot: true as const,
    profil: (mac.bot_profil as ProfilAd) ?? 'orta',
  };
  const plan = botPlaniTohumlu(bot, tur, turTohumu);

  // Bot pas geçtiyse bir şey yazma; turu süre kapatır.
  if (!plan.adimlar || plan.adimlar.length === 0) return;

  // Botun zinciri de doğrulanır. Bot ayrıcalıklı değil: hatalı bir
  // zincir üretirse turu kaybeder.
  const uzaklik = uzaklikHesapla(mac, turNo, plan.adimlar as Adim[]);
  if (uzaklik == null) return;

  // Satır HEMEN yazılır ama `bildirildi` GELECEKTE: botun cevabı ancak o
  // an geldiğinde sayılır. Okuma tarafı ileri tarihli satırları yok
  // sayıyor.
  //
  // NEDEN BÖYLE
  // Önce plan her yoklamada yeniden hesaplanıyordu ve gecikme dolmadan
  // hiçbir şey yazılmıyordu. Yani iki saniyede bir çözücü baştan
  // çalışıyordu. Güçlü profillerde çözücü 600 ms'ye kadar CPU
  // harcıyor; Edge Function'ın istek başına CPU bütçesi bunu
  // kaldırmıyor ve fonksiyon zaman zaman öldürülüyordu — tarayıcıya
  // yanıt hiç dönmediği için ekranda İngilizce "Failed to fetch"
  // çıkıyordu. Artık çözücü tur başına BİR kez çalışıyor.
  await db.from('duello_tur').upsert(
    {
      mac_id: mac.id,
      tur_no: turNo,
      taraf: 'b',
      uzaklik,
      bildirildi: new Date(Date.parse(mac.tur_basladi) + plan.gecikmeMs).toISOString(),
    },
    { onConflict: 'mac_id,tur_no,taraf' },
  );
}

/**
 * Maçı olması gereken noktaya taşır ve güncel durumu döndürür.
 *
 * Sırayla: botun sırası geldiyse oynat → durumu kayıtlardan kur →
 * tur kapandıysa sonrakini aç → maç bittiyse dereceleri güncelle.
 *
 * Süresi dolmuş BİRDEN ÇOK tur olabilir (iki oyuncu da sekmeyi
 * kapatmışsa). Döngü bu yüzden var: maç, gerçek zamanda olması gereken
 * yere kadar ilerletilir.
 */
export async function macIlerlet(db: Db, mac: Mac): Promise<DuelloDurum> {
  let guncelMac = { ...mac };
  const sure = turSuresi(mac.seviye);

  for (let adim = 0; adim < DUELLO_TUR_SAYISI + 1; adim++) {
    const simdiMs = Date.now();
    await botuOynat(db, guncelMac, guncelMac.aktif_tur, simdiMs);

    const { data: tumSatirlar } = await db
      .from('duello_tur')
      .select('tur_no, taraf, uzaklik, bildirildi')
      .eq('mac_id', guncelMac.id)
      .order('bildirildi', { ascending: true });

    // Botun cevabı gecikmesi dolmadan görünmez — anında cevap veren bot
    // makine gibi hissettirir, oyuncu yenildiğini değil kandırıldığını
    // düşünür. Satır önceden yazılıyor, ama zamanı gelene kadar yok
    // sayılıyor.
    const satirlar = (tumSatirlar ?? []).filter(
      (s: { bildirildi: string }) => Date.parse(s.bildirildi) <= simdiMs,
    );

    const doldu = turSuresiDoldu(Date.parse(guncelMac.tur_basladi), simdiMs, sure);

    const turlar: TurKaydi[] = [];
    for (let n = 1; n <= guncelMac.aktif_tur; n++) {
      const bildirimler = (satirlar ?? [])
        .filter((s: { tur_no: number; uzaklik: number | null }) => s.tur_no === n && s.uzaklik != null)
        .map((s: { taraf: string; uzaklik: number }) => ({
          taraf: s.taraf as Taraf,
          uzaklik: s.uzaklik,
        }));
      turlar.push({
        bildirimler,
        // Geçmiş turlar kapanmıştır; aktif tur yalnızca süresi dolduysa.
        sureDoldu: n < guncelMac.aktif_tur ? true : doldu,
      });
    }

    const durum = duelloTekrarOynat(turlar);

    if (durum.bitti) {
      // Maçı YALNIZCA hâlâ süren bir maçsa bitir ve gerçekten
      // bitirdiysek dereceye dokun. İki istek aynı anda maçı bitirmeye
      // çalışırsa yalnızca biri satırı değiştirir; diğeri boş döner ve
      // derece iki kez yazılmaz.
      const { data: bitirilen } = await db
        .from('duello_mac')
        .update({
          skor_a: durum.skor.a,
          skor_b: durum.skor.b,
          durum: 'bitti',
          kazanan: durum.macKazanani,
          bitti: new Date().toISOString(),
        })
        .eq('id', guncelMac.id)
        .eq('durum', 'basladi')
        .select('id');

      if (bitirilen && (bitirilen as unknown[]).length > 0) {
        await dereceleriGuncelle(db, guncelMac, durum.macKazanani);
      }
      return durum;
    }

    if (durum.turAcik) {
      // Tur hâlâ sürüyor; skoru güncelleyip çık.
      await db
        .from('duello_mac')
        .update({ skor_a: durum.skor.a, skor_b: durum.skor.b })
        .eq('id', guncelMac.id);
      return durum;
    }

    // Tur kapandı, sıradakini aç.
    //
    // SAAT NEREDEN DEVAM EDER
    // Tur tam isabetle erken kapandıysa sıradaki tur ŞİMDİ başlar.
    // Ama tur SÜRESİ DOLDUĞU için kapandıysa, sıradaki tur o turun
    // bittiği anda başlamış sayılır — yani geçmişte. Aksi halde iki
    // oyuncu da bir süre ekrandan uzak kalınca maç her çağrıda ancak
    // bir tur ilerler ve kimse dönmezse hiç bitmezdi. Zaman çizgisi
    // gerçek zamandır, istek zamanı değil.
    const sonrakiTur = guncelMac.aktif_tur + 1;
    const oncekiBaslangicMs = Date.parse(guncelMac.tur_basladi);
    const simdiIso = new Date().toISOString();
    const yeniBaslangic = turSuresiDoldu(oncekiBaslangicMs, Date.now(), sure)
      ? new Date(oncekiBaslangicMs + sure * 1000).toISOString()
      : simdiIso;
    await db
      .from('duello_mac')
      .update({
        skor_a: durum.skor.a,
        skor_b: durum.skor.b,
        aktif_tur: sonrakiTur,
        tur_basladi: yeniBaslangic,
      })
      .eq('id', guncelMac.id);

    guncelMac = { ...guncelMac, aktif_tur: sonrakiTur, tur_basladi: yeniBaslangic };
  }

  // Buraya düşmemeli; düşerse maçı olduğu gibi bildir.
  return duelloTekrarOynat([]);
}

/**
 * Maç bitince dereceleri günceller.
 *
 * Bota karşı oynanan maç dereceyi DEĞİŞTİRMEZ: bot gerçek bir rakip
 * değil, kuyruk boşken oyuncuyu ekranda tutan bir dolgu. Bota karşı
 * derece kazanılabilseydi sıralamanın anlamı kalmazdı.
 */
export async function dereceleriGuncelle(db: Db, mac: Mac, kazanan: string | null) {
  const aId = mac.oyuncu_a;
  const bId = mac.oyuncu_b;
  if (!bId) return; // bot maçı

  const { data: dereceler } = await db
    .from('duello_derece')
    .select('oyuncu_id, elo, mac_sayisi, galibiyet, maglubiyet, beraberlik')
    .in('oyuncu_id', [aId, bId]);

  const bul = (id: string) =>
    (dereceler ?? []).find((d: { oyuncu_id: string }) => d.oyuncu_id === id) ?? {
      oyuncu_id: id,
      elo: 1200,
      mac_sayisi: 0,
      galibiyet: 0,
      maglubiyet: 0,
      beraberlik: 0,
    };

  const a = bul(aId);
  const b = bul(bId);
  const sonuc = kazanan === 'a' ? 'kazandi' : kazanan === 'b' ? 'kaybetti' : 'berabere';
  const yeni = eloGuncelle(a.elo, b.elo, sonuc);

  const satir = (
    d: { oyuncu_id: string; mac_sayisi: number; galibiyet: number; maglubiyet: number; beraberlik: number },
    elo: number,
    kazandiMi: boolean,
    kaybettiMi: boolean,
  ) => ({
    oyuncu_id: d.oyuncu_id,
    elo,
    mac_sayisi: d.mac_sayisi + 1,
    galibiyet: d.galibiyet + (kazandiMi ? 1 : 0),
    maglubiyet: d.maglubiyet + (kaybettiMi ? 1 : 0),
    beraberlik: d.beraberlik + (!kazandiMi && !kaybettiMi ? 1 : 0),
    guncellendi: new Date().toISOString(),
  });

  await db.from('duello_derece').upsert([
    satir(a, yeni.a, kazanan === 'a', kazanan === 'b'),
    satir(b, yeni.b, kazanan === 'b', kazanan === 'a'),
  ]);
}
