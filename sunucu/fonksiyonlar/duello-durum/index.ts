/**
 * duello-durum — Supabase Edge Function
 *
 * Maçın güncel durumunu döndürür ve YOL BOYUNCA MAÇI İLERLETİR:
 * botun sırası geldiyse oynatır, süresi dolan turları kapatır, maç
 * bittiyse dereceleri günceller.
 *
 * NEDEN İLERLETME BURADA DA VAR
 * Turu yalnızca "cevap gönderme" ilerletseydi, iki oyuncunun da sessiz
 * kaldığı bir tur sonsuza kadar açık kalırdı — süre dolar ama kimse
 * kapatmaz. Oyuncu ekrandayken zaten bu uç düzenli çağrılıyor; maçın
 * gerçek zamanda olması gereken yere gelmesi için doğal yer burası.
 *
 * ÇÖZÜM SIZMAZ (kural 8)
 * Rakip hakkında dönen tek şey uzaklığı. Adımı, zinciri, kullandığı
 * taşlar asla gönderilmez.
 *
 * Gelen istek (JSON): { mac_id }
 * Deploy: supabase functions deploy duello-durum --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { macIlerlet, turSuresi, type Mac } from '../duello-ortak.ts';
import type { Taraf } from '@zihinturu/cekirdek';

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

    const { mac_id } = await req.json() as { mac_id: string };
    if (!mac_id || typeof mac_id !== 'string') return hata('Maç kimliği gerekli.', 400);

    const { data: mac } = await supabase
      .from('duello_mac')
      .select('*')
      .eq('id', mac_id)
      .maybeSingle();
    if (!mac) return hata('Maç bulunamadı.', 404);

    const benTarafim: Taraf | null =
      mac.oyuncu_a === benId ? 'a' : mac.oyuncu_b === benId ? 'b' : null;
    if (!benTarafim) return hata('Bu maçın tarafı değilsin.', 403);

    // Maç sürüyorsa olması gereken noktaya taşı.
    const durum = mac.durum === 'basladi'
      ? await macIlerlet(supabase, mac as Mac)
      : null;

    // Güncel maç satırını yeniden oku (ilerletme değiştirmiş olabilir).
    const { data: son } = await supabase
      .from('duello_mac')
      .select('*')
      .eq('id', mac_id)
      .single();

    const rakipTaraf: Taraf = benTarafim === 'a' ? 'b' : 'a';
    const { data: rakipSatir } = await supabase
      .from('duello_tur')
      .select('uzaklik')
      .eq('mac_id', mac_id)
      .eq('tur_no', son.aktif_tur)
      .eq('taraf', rakipTaraf)
      .maybeSingle();

    // --- Rakibin kimliği ve gücü ---
    // Oyuncu kiminle oynadığını bilmeli; "1240 puan · 8 galibiyet"
    // hem beklenti kuruyor hem kazanınca kazancı anlamlı kılıyor.
    const rakip = await rakipBilgisi(supabase, son, rakipTaraf);

    // --- Tur tur özet: YALNIZCA maç bittikten sonra ---
    // Maç sürerken geçmiş turların rakip uzaklıkları da gönderilseydi
    // sorun olmazdı (turlar kapalı), ama gereksiz veri göndermemek
    // sızıntı yüzeyini küçük tutuyor (kural 8).
    let turOzeti: unknown[] | null = null;
    if (son.durum !== 'basladi') {
      const { data: tumTurlar } = await supabase
        .from('duello_tur')
        .select('tur_no, taraf, uzaklik')
        .eq('mac_id', mac_id);
      turOzeti = [];
      for (let n = 1; n <= son.aktif_tur; n++) {
        const benimki = (tumTurlar ?? []).find(
          (t: { tur_no: number; taraf: string }) => t.tur_no === n && t.taraf === benTarafim,
        );
        const rakibinki = (tumTurlar ?? []).find(
          (t: { tur_no: number; taraf: string }) => t.tur_no === n && t.taraf === rakipTaraf,
        );
        const benimUzaklik = benimki?.uzaklik ?? null;
        const rakipUzaklik = rakibinki?.uzaklik ?? null;
        let kazanan: 'ben' | 'rakip' | 'berabere' = 'berabere';
        if (benimUzaklik != null || rakipUzaklik != null) {
          if (rakipUzaklik == null) kazanan = 'ben';
          else if (benimUzaklik == null) kazanan = 'rakip';
          else if (benimUzaklik < rakipUzaklik) kazanan = 'ben';
          else if (rakipUzaklik < benimUzaklik) kazanan = 'rakip';
        }
        turOzeti.push({ turNo: n, benimUzaklik, rakipUzaklik, kazanan });
      }
    }

    return ok({
      id: son.id,
      seviye: son.seviye,
      tohum: son.tohum,
      benTarafim,
      aktifTur: son.aktif_tur,
      turBasladi: son.tur_basladi,
      turSuresiSn: turSuresi(son.seviye),
      skorA: son.skor_a,
      skorB: son.skor_b,
      durum: son.durum,
      kazanan: son.kazanan,
      botMu: son.oyuncu_b === null,
      botAd: son.bot_ad,
      rakip,
      turOzeti,
      // Rakip hakkında dönen TEK şey bu (kural 8).
      rakipUzaklik: rakipSatir?.uzaklik ?? null,
      turAcik: durum ? durum.turAcik : false,
    });
  } catch (e) {
    console.error('duello-durum hatası:', e);
    return hata('Sunucu hatası.', 500);
  }
});

/**
 * Rakibin adı ve gücü.
 *
 * Gerçek oyuncu için derecesi ve galibiyet sayısı gerçek verilerdir.
 * BOT için galibiyet sayısı GÖNDERİLMEZ — bot hiç maç oynamadı,
 * uydurma bir sicil göstermek oyuncuyu kandırmak olurdu. Botun
 * "derecesi" ise uydurma değil: gücünün karşılığı olarak profilinden
 * türetiliyor, yani oyuncunun gördüğü sayı gerçekten karşısındakinin
 * ne kadar zorlu olduğunu söylüyor.
 */
async function rakipBilgisi(
  supabase: ReturnType<typeof createClient>,
  mac: Record<string, unknown>,
  rakipTaraf: Taraf,
) {
  const BOT_DERECE: Record<string, number> = {
    cirak: 900,
    acemi: 1050,
    orta: 1250,
    usta: 1500,
  };

  if (mac.oyuncu_b === null) {
    const profil = String(mac.bot_profil ?? 'orta');
    return {
      ad: (mac.bot_ad as string) ?? 'Rakip',
      elo: BOT_DERECE[profil] ?? 1200,
      galibiyet: null,
      botMu: true,
    };
  }

  const rakipId = rakipTaraf === 'a' ? mac.oyuncu_a : mac.oyuncu_b;
  const { data: oyuncu } = await supabase
    .from('oyuncu')
    .select('kullanici_adi')
    .eq('id', rakipId)
    .maybeSingle();
  const { data: derece } = await supabase
    .from('duello_derece')
    .select('elo, galibiyet')
    .eq('oyuncu_id', rakipId)
    .maybeSingle();

  return {
    ad: oyuncu?.kullanici_adi ?? 'Rakip',
    elo: derece?.elo ?? 1200,
    galibiyet: derece?.galibiyet ?? 0,
    botMu: false,
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
