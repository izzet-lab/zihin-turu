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
      // Rakip hakkında dönen TEK şey bu (kural 8).
      rakipUzaklik: rakipSatir?.uzaklik ?? null,
      turAcik: durum ? durum.turAcik : false,
    });
  } catch (e) {
    console.error('duello-durum hatası:', e);
    return hata('Sunucu hatası.', 500);
  }
});

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
