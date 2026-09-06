/**
 * duello-ara — Supabase Edge Function
 *
 * Oyuncu "düello ara" dediğinde çağrılır. Sunucu:
 *   1. Oyuncunun derecesini okur (yoksa oluşturur).
 *   2. Kuyruktaki ölü satırları temizler.
 *   3. Uygun rakip arar — ELO aralığı çekirdekteki kuralla belirlenir.
 *   4. Bulursa iki satırı kuyruktan alır ve maçı kurar.
 *   5. Bulamazsa oyuncuyu kuyruğa yazar; yeterince beklediyse bot verir.
 *
 * NEDEN EŞLEŞTİRME SUNUCUDA
 * Derece istemciden gelseydi oyuncu kendi derecesini düşük bildirip
 * hep zayıf rakiple eşleşirdi (kural 2). Kuyruk tablosuna yazma hakkı
 * da bu yüzden yalnızca bu fonksiyonda.
 *
 * Gelen istek (JSON):
 *   seviye   seviye anahtarı
 *
 * Dönüş (JSON):
 *   ya { mac: {...} }  — maç kuruldu, hemen başlanabilir
 *   ya { bekliyor: true, bekleyenSn } — kuyrukta, tekrar sorulmalı
 *
 * Deploy: supabase functions deploy duello-ara --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  BASLANGIC_ELO,
  botaDusulsunMu,
  eslesirMi,
} from '@zihinturu/cekirdek';
import { SEVIYE_LISTESI, botUret } from '@zihinturu/oyun-sayi';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Kuyrukta bu kadar eskiyen satır ölü sayılır (sekmesini kapatanlar). */
const KUYRUK_OMRU_MS = 2 * 60 * 1000;

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

    const { seviye, sadece_kontrol } = await req.json() as {
      seviye: string;
      /**
       * Yalnızca "süren maçım var mı?" diye sorar; kuyruğa YAZMAZ.
       *
       * Düello ekranı açılır açılmaz bunu soruyor: sekmesini yenileyen
       * oyuncu maçına geri dönebilsin diye. Bayrak olmasaydı ekrana
       * bakmak bile oyuncuyu kuyruğa sokardı.
       */
      sadece_kontrol?: boolean;
    };
    const seviyeObj = SEVIYE_LISTESI.find((s) => s.anahtar === seviye);
    if (!seviyeObj) return hata('Bilinmeyen seviye.', 400);

    const simdi = Date.now();

    // --- 1. Zaten süren bir maç var mı? ---
    // Sekmeyi yenileyen oyuncu maçına geri dönebilmeli (bağlantı kopması
    // toleransının ilk parçası): yeni maç kurmak yerine mevcut maç döner.
    const { data: surenMac } = await supabase
      .from('duello_mac')
      .select('*')
      .eq('durum', 'basladi')
      .or(`oyuncu_a.eq.${benId},oyuncu_b.eq.${benId}`)
      .order('basladi', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (surenMac) return ok({ mac: macCevabi(surenMac, benId) });
    if (sadece_kontrol) return ok({ macYok: true });

    // --- 2. Derece (yoksa oluştur) ---
    const { data: derece } = await supabase
      .from('duello_derece')
      .select('elo')
      .eq('oyuncu_id', benId)
      .maybeSingle();

    let benimElo = derece?.elo ?? BASLANGIC_ELO;
    if (!derece) {
      await supabase.from('duello_derece').insert({ oyuncu_id: benId, elo: BASLANGIC_ELO });
      benimElo = BASLANGIC_ELO;
    }

    // --- 3. Ölü kuyruk satırlarını temizle ---
    await supabase
      .from('duello_kuyruk')
      .delete()
      .lt('girdi', new Date(simdi - KUYRUK_OMRU_MS).toISOString());

    // --- 4. Kendi kuyruk satırım: ne zamandır bekliyorum? ---
    const { data: kendiSatir } = await supabase
      .from('duello_kuyruk')
      .select('girdi')
      .eq('oyuncu_id', benId)
      .maybeSingle();

    if (!kendiSatir) {
      await supabase.from('duello_kuyruk').upsert({
        oyuncu_id: benId,
        elo: benimElo,
        seviye,
      });
    }
    const benimGirdiMs = kendiSatir ? Date.parse(kendiSatir.girdi) : simdi;
    const benimBekleyenSn = Math.max(0, (simdi - benimGirdiMs) / 1000);

    // --- 5. Rakip ara ---
    // Aralık kuralı çekirdekte (eslesirMi): istemci de aynı kuralı
    // okuyabilsin ve iki taraf ayrışmasın diye.
    const { data: adaylar } = await supabase
      .from('duello_kuyruk')
      .select('oyuncu_id, elo, girdi')
      .eq('seviye', seviye)
      .neq('oyuncu_id', benId)
      .order('girdi', { ascending: true })
      .limit(50);

    for (const aday of adaylar ?? []) {
      const adayBekleyenSn = Math.max(0, (simdi - Date.parse(aday.girdi)) / 1000);
      const uyar = eslesirMi(
        { elo: benimElo, bekleyenSn: benimBekleyenSn },
        { elo: aday.elo, bekleyenSn: adayBekleyenSn },
      );
      if (!uyar) continue;

      // YARIŞ DURUMU — MAÇI KİM KURAR
      //
      // İki oyuncu aynı anda birbirini seçebilir. İlk yazımda her iki
      // taraf da rakibinin kuyruk satırını siliyor ve ikisi de başarılı
      // oluyordu (farklı satırları siliyorlar); sonuçta AYNI İKİLİ İÇİN
      // İKİ AYRI MAÇ kuruluyordu. Test bunu yakaladı: bir oyuncu bir
      // maçta oynarken diğeri ötekinde bekliyordu.
      //
      // Çözüm: maçı kimin kuracağı baştan belli olsun. Kimliği küçük
      // olan kurar; diğeri kurmaz, bir sonraki yoklamada "süren maç"
      // olarak aynı maça düşer. Simetri kırılınca yarış da kalmıyor.
      if (benId > aday.oyuncu_id) continue;

      // Rakip bu arada başka bir maça girmiş olabilir.
      const { data: rakibinMaci } = await supabase
        .from('duello_mac')
        .select('id')
        .eq('durum', 'basladi')
        .or(`oyuncu_a.eq.${aday.oyuncu_id},oyuncu_b.eq.${aday.oyuncu_id}`)
        .limit(1)
        .maybeSingle();
      if (rakibinMaci) continue;

      // Rakibi kuyruktan al; satır dönmezse başkası kaptı.
      const { data: kapilan } = await supabase
        .from('duello_kuyruk')
        .delete()
        .eq('oyuncu_id', aday.oyuncu_id)
        .select('oyuncu_id');
      if (!kapilan || kapilan.length === 0) continue;

      await supabase.from('duello_kuyruk').delete().eq('oyuncu_id', benId);

      const mac = await macKur(supabase, {
        seviye,
        oyuncuA: benId,
        oyuncuB: aday.oyuncu_id,
      });
      if (!mac) return hata('Maç kurulamadı.', 500);
      return ok({ mac: macCevabi(mac, benId) });
    }

    // --- 6. Rakip yok: yeterince beklediyse bot ---
    if (botaDusulsunMu(benimBekleyenSn)) {
      await supabase.from('duello_kuyruk').delete().eq('oyuncu_id', benId);
      const bot = botUret(benimElo);
      const mac = await macKur(supabase, {
        seviye,
        oyuncuA: benId,
        oyuncuB: null,
        botProfil: bot.profil,
        botAd: bot.ad,
      });
      if (!mac) return hata('Maç kurulamadı.', 500);
      return ok({ mac: macCevabi(mac, benId) });
    }

    return ok({ bekliyor: true, bekleyenSn: Math.round(benimBekleyenSn) });
  } catch (e) {
    console.error('duello-ara hatası:', e);
    return hata('Sunucu hatası.', 500);
  }
});

async function macKur(
  supabase: ReturnType<typeof createClient>,
  g: {
    seviye: string;
    oyuncuA: string;
    oyuncuB: string | null;
    botProfil?: string;
    botAd?: string;
  },
) {
  // Maçın tohumu sunucuda üretilir; istemciden gelseydi oyuncu kendine
  // kolay bulmaca seçerdi. Beş turun tamamı bu tek tohumdan türer.
  const tohum = Math.floor(Math.random() * 2 ** 31);
  const { data, error } = await supabase
    .from('duello_mac')
    .insert({
      oyun: 'sayi',
      seviye: g.seviye,
      tohum,
      oyuncu_a: g.oyuncuA,
      oyuncu_b: g.oyuncuB,
      bot_profil: g.botProfil ?? null,
      bot_ad: g.botAd ?? null,
      aktif_tur: 1,
      tur_basladi: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) {
    console.error('maç kurulamadı:', error);
    return null;
  }
  return data;
}

/**
 * Maçı istemciye anlatır.
 *
 * ÇÖZÜM SIZMAZ (kural 8): tohum gönderilir çünkü istemci turu ondan
 * üretiyor — ama rakibin adımları, zinciri ya da uzaklığı BURADA yok.
 * Uzaklık canlı yayınla, tur ilerledikçe gelir.
 */
function macCevabi(m: Record<string, unknown>, benId: string) {
  const benTarafim = m.oyuncu_a === benId ? 'a' : 'b';
  return {
    id: m.id,
    seviye: m.seviye,
    tohum: m.tohum,
    benTarafim,
    aktifTur: m.aktif_tur,
    turBasladi: m.tur_basladi,
    skorA: m.skor_a,
    skorB: m.skor_b,
    durum: m.durum,
    botMu: m.oyuncu_b === null,
    botAd: m.bot_ad,
    botProfil: m.bot_profil,
  };
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
