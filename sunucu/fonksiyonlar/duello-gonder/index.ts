/**
 * duello-gonder — Supabase Edge Function
 *
 * Düelloda bir turun cevabını alır. Sunucu:
 *   1. Maçı ve oyuncunun hangi taraf olduğunu doğrular.
 *   2. Turu tohumdan yeniden üretir (istemciden tur içeriği ALINMAZ).
 *   3. Adım zincirini sıfırdan doğrular ve uzaklığı KENDİ hesaplar.
 *   4. Sonucu yazar; aynı turda yalnızca daha iyi (küçük) uzaklık geçer.
 *   5. Maçın durumunu kayıtlardan sıfırdan kurar, gerekiyorsa turu
 *      kapatır, maç bittiyse ELO'yu günceller.
 *
 * NEDEN DURUM HER İSTEKTE SIFIRDAN KURULUR
 * İki oyuncunun istekleri hangi sırayla gelirse gelsin sonuç aynı
 * olmalı. Sunucu maç durumunu bellekte tutmuyor; kayıtlardan
 * `duelloTekrarOynat` ile yeniden hesaplıyor. Tek doğru kaynak orası.
 *
 * ÇÖZÜM SIZMAZ (kural 8)
 * Dönüşte rakibin adımları yok. Rakibe giden tek bilgi uzaklık; o da
 * duello_tur tablosuna yazıldığı için canlı yayınla gidiyor.
 *
 * Gelen istek (JSON):
 *   mac_id    maçın kimliği
 *   tur_no    kaçıncı tur (1-5)
 *   adimlar   oyuncunun yaptığı adımlar
 *
 * Dönüş (JSON):
 *   uzaklik, skorA, skorB, aktifTur, durum, kazanan
 *
 * Deploy: supabase functions deploy duello-gonder --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  DUELLO_TUR_SAYISI,
  duelloTekrarOynat,
  duelloTurTohumu,
  eloGuncelle,
  turSuresiDoldu,
  type TurKaydi,
  type Taraf,
} from '@zihinturu/cekirdek';
import {
  uretimYap,
  varsayilanBuyukAdet,
  dogrulaZinciri,
  SEVIYE_LISTESI,
  type Adim,
} from '@zihinturu/oyun-sayi';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return hata('Giriş yapılmamış.', 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const anahtarli = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const { data: kullanici, error: kimlikHata } = await anahtarli.auth.getUser(jwt);
    if (kimlikHata || !kullanici.user) return hata('Geçersiz oturum.', 401);
    const benId = kullanici.user.id;

    const body = await req.json() as {
      mac_id: string;
      tur_no: number;
      adimlar: Adim[];
    };
    const { mac_id, tur_no, adimlar } = body;

    if (!mac_id || typeof mac_id !== 'string') return hata('Maç kimliği gerekli.', 400);
    if (!Number.isInteger(tur_no) || tur_no < 1 || tur_no > DUELLO_TUR_SAYISI) {
      return hata('Geçersiz tur numarası.', 400);
    }
    if (!Array.isArray(adimlar)) return hata('adimlar dizi olmalı.', 400);

    // --- Maçı yükle ve tarafı belirle ---
    const { data: mac } = await supabase
      .from('duello_mac')
      .select('*')
      .eq('id', mac_id)
      .maybeSingle();
    if (!mac) return hata('Maç bulunamadı.', 404);
    if (mac.durum !== 'basladi') return hata('Maç zaten bitti.', 409);

    const taraf: Taraf | null =
      mac.oyuncu_a === benId ? 'a' : mac.oyuncu_b === benId ? 'b' : null;
    if (!taraf) return hata('Bu maçın tarafı değilsin.', 403);

    // Oyuncu ancak AKTİF turu gönderebilir. Geçmiş turu yeniden
    // göndermek skoru değiştirmeye çalışmak, ileri turu göndermek
    // sırayı atlamak olurdu.
    if (tur_no !== mac.aktif_tur) return hata('Bu tur şu an oynanmıyor.', 409);

    const seviyeObj = SEVIYE_LISTESI.find((s) => s.anahtar === mac.seviye);
    if (!seviyeObj) return hata('Bilinmeyen seviye.', 400);

    // --- Turu tohumdan yeniden üret ---
    // Üretim ayarı istemciden ALINMAZ: iki oyuncu aynı bulmacayı
    // görmeli, yoksa düello anlamsız olur.
    const turTohumu = duelloTurTohumu(Number(mac.tohum), tur_no);
    const uretim = uretimYap(mac.seviye, turTohumu, varsayilanBuyukAdet(mac.seviye));

    // --- Zinciri doğrula, uzaklığı sunucu hesapla ---
    let uzaklik: number;
    if (adimlar.length === 0) {
      uzaklik = uretim.hedef; // hiç işlem yapılmadı
    } else {
      const dogr = dogrulaZinciri(uretim.sayilar, adimlar, uretim.hedef);
      if (!dogr.gecerli) return hata('Geçersiz adım zinciri: ' + dogr.hata, 400);
      uzaklik = dogr.uzaklik;
    }

    // --- Sonucu yaz: yalnızca DAHA İYİ uzaklık geçer ---
    // Oyuncu hedeften uzaklaşabilir; bildirilen en iyi değer geriye
    // gitmemeli (çekirdekteki kuralın veritabanı karşılığı).
    const { data: mevcut } = await supabase
      .from('duello_tur')
      .select('uzaklik')
      .eq('mac_id', mac_id)
      .eq('tur_no', tur_no)
      .eq('taraf', taraf)
      .maybeSingle();

    const yeniUzaklik =
      mevcut?.uzaklik == null ? uzaklik : Math.min(mevcut.uzaklik, uzaklik);

    await supabase.from('duello_tur').upsert(
      {
        mac_id,
        tur_no,
        taraf,
        uzaklik: yeniUzaklik,
        bildirildi: new Date().toISOString(),
      },
      { onConflict: 'mac_id,tur_no,taraf' },
    );

    // --- Maçın durumunu kayıtlardan sıfırdan kur ---
    const { data: satirlar } = await supabase
      .from('duello_tur')
      .select('tur_no, taraf, uzaklik, bildirildi')
      .eq('mac_id', mac_id)
      .order('bildirildi', { ascending: true });

    const sureDolduMu = turSuresiDoldu(
      Date.parse(mac.tur_basladi),
      Date.now(),
      seviyeObj.sure,
    );

    const turlar: TurKaydi[] = [];
    for (let n = 1; n <= tur_no; n++) {
      const bildirimler = (satirlar ?? [])
        .filter((s) => s.tur_no === n && s.uzaklik != null)
        .map((s) => ({ taraf: s.taraf as Taraf, uzaklik: s.uzaklik as number }));
      // Geçmiş turlar kapanmış demektir; aktif tur yalnızca süresi
      // dolduysa kapanır (tam isabet zaten akışın kendisinde kapatıyor).
      turlar.push({ bildirimler, sureDoldu: n < tur_no ? true : sureDolduMu });
    }

    const durum = duelloTekrarOynat(turlar);

    // --- Maçı güncelle ---
    const guncelleme: Record<string, unknown> = {
      skor_a: durum.skor.a,
      skor_b: durum.skor.b,
    };

    if (durum.bitti) {
      guncelleme.durum = 'bitti';
      guncelleme.kazanan = durum.macKazanani;
      guncelleme.bitti = new Date().toISOString();
    } else if (!durum.turAcik) {
      // Tur kapandı, sıradaki tur açılıyor. Saat burada yeniden başlar.
      guncelleme.aktif_tur = Math.min(tur_no + 1, DUELLO_TUR_SAYISI);
      guncelleme.tur_basladi = new Date().toISOString();
    }

    await supabase.from('duello_mac').update(guncelleme).eq('id', mac_id);

    if (durum.bitti) {
      await dereceleriGuncelle(supabase, mac, durum.macKazanani);
    }

    return ok({
      uzaklik: yeniUzaklik,
      skorA: durum.skor.a,
      skorB: durum.skor.b,
      aktifTur: durum.bitti ? tur_no : (guncelleme.aktif_tur ?? tur_no),
      turAcik: durum.turAcik,
      turKazanani: durum.turKazanani,
      durum: durum.bitti ? 'bitti' : 'basladi',
      kazanan: durum.macKazanani,
    });
  } catch (e) {
    console.error('duello-gonder hatası:', e);
    return hata('Sunucu hatası.', 500);
  }
});

/**
 * Maç bitince dereceleri günceller.
 *
 * Bota karşı oynanan maç dereceyi DEĞİŞTİRMEZ: bot gerçek bir rakip
 * değil, kuyruk boşken oyuncuyu ekranda tutan bir dolgu. Bota karşı
 * derece kazanılabilseydi sıralamanın anlamı kalmazdı.
 */
async function dereceleriGuncelle(
  supabase: ReturnType<typeof createClient>,
  mac: Record<string, unknown>,
  kazanan: string | null,
) {
  const aId = mac.oyuncu_a as string;
  const bId = mac.oyuncu_b as string | null;
  if (!bId) return; // bot maçı

  const { data: dereceler } = await supabase
    .from('duello_derece')
    .select('oyuncu_id, elo, mac_sayisi, galibiyet, maglubiyet, beraberlik')
    .in('oyuncu_id', [aId, bId]);

  const bul = (id: string) =>
    (dereceler ?? []).find((d) => d.oyuncu_id === id) ?? {
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
    d: typeof a,
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

  await supabase.from('duello_derece').upsert([
    satir(a, yeni.a, kazanan === 'a', kazanan === 'b'),
    satir(b, yeni.b, kazanan === 'b', kazanan === 'a'),
  ]);
}

function ok(veri: unknown): Response {
  return new Response(JSON.stringify(veri), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
    status: 200,
  });
}

function hata(mesaj: string, durum: number): Response {
  return new Response(JSON.stringify({ hata: mesaj }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
    status: durum,
  });
}
