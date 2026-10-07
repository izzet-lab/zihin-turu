/**
 * arena-durum — Supabase Edge Function
 *
 * Arenanın güncel durumunu döndürür ve YOL BOYUNCA İLERLETİR: bekleme
 * süresi dolduysa botlarla başlatır, botların sırası geldiyse oynatır,
 * süresi dolan turları kapatır, arena bittiyse podyumu çıkarır.
 *
 * İlerletmenin burada da olmasının sebebi düellodakiyle aynı: turu
 * yalnızca "cevap gönderme" ilerletseydi, herkesin sustuğu bir tur
 * sonsuza kadar açık kalırdı.
 *
 * ÇÖZÜM SIZMAZ (kural 8): yarışanlar hakkında dönen tek şey uzaklık.
 *
 * Gelen istek (JSON): { mac_id }
 * Deploy: supabase functions deploy arena-durum --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ARENA_TUR_SAYISI } from '@zihinturu/cekirdek';
import {
  ARENA_BEKLEME_SN,
  arenayiBaslat,
  arenayiIlerlet,
  turSuresi,
  type ArenaMac,
} from '../arena-ortak.ts';

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
    if (!mac_id) return hata('Arena kimliği gerekli.', 400);

    const { data: mac } = await supabase
      .from('arena_mac')
      .select('*')
      .eq('id', mac_id)
      .maybeSingle();
    if (!mac) return hata('Arena bulunamadı.', 404);

    const { data: benimKoltuk } = await supabase
      .from('arena_koltuk')
      .select('koltuk')
      .eq('mac_id', mac_id)
      .eq('oyuncu_id', benId)
      .maybeSingle();
    if (!benimKoltuk) return hata('Bu arenanın yarışçısı değilsin.', 403);

    // Bekleme süresi dolduysa botlarla başlat.
    if (mac.durum === 'bekliyor') {
      const bekleyenSn = (Date.now() - Date.parse(mac.olusturuldu)) / 1000;
      if (bekleyenSn >= ARENA_BEKLEME_SN) {
        await arenayiBaslat(supabase, mac as ArenaMac);
      }
    }

    const { data: guncelMac } = await supabase
      .from('arena_mac')
      .select('*')
      .eq('id', mac_id)
      .single();

    const sonuc =
      guncelMac.durum === 'basladi'
        ? await arenayiIlerlet(supabase, guncelMac as ArenaMac)
        : null;

    const { data: son } = await supabase
      .from('arena_mac')
      .select('*')
      .eq('id', mac_id)
      .single();

    const { data: koltuklar } = await supabase
      .from('arena_koltuk')
      .select('koltuk, oyuncu_id, bot_ad, puan, ayrildi, oyuncu:oyuncu_id(kullanici_adi)')
      .eq('mac_id', mac_id)
      .order('koltuk', { ascending: true });

    // Bu turda kimin ne kadar yaklaştığı — yarışanlara giden TEK bilgi.
    const { data: turSatirlari } = await supabase
      .from('arena_tur')
      .select('koltuk, uzaklik, bildirildi')
      .eq('mac_id', mac_id)
      .eq('tur_no', son.aktif_tur);

    const simdiMs = Date.now();
    const uzakliklar: Record<number, number | null> = {};
    for (const k of koltuklar ?? []) uzakliklar[k.koltuk] = null;
    for (const t of turSatirlari ?? []) {
      // Botun cevabı zamanı gelmeden görünmez.
      if (Date.parse(t.bildirildi) <= simdiMs) uzakliklar[t.koltuk] = t.uzaklik;
    }

    return ok({
      id: son.id,
      seviye: son.seviye,
      tohum: son.tohum,
      durum: son.durum,
      benimKoltuk: benimKoltuk.koltuk,
      aktifTur: son.aktif_tur,
      toplamTur: ARENA_TUR_SAYISI,
      turBasladi: son.tur_basladi,
      turSuresiSn: turSuresi(son.seviye),
      olusturuldu: son.olusturuldu,
      beklemeSn: ARENA_BEKLEME_SN,
      yarisanlar: (koltuklar ?? []).map((k: {
        koltuk: number;
        oyuncu_id: string | null;
        bot_ad: string | null;
        puan: number;
        ayrildi: boolean;
        oyuncu: { kullanici_adi: string } | null;
      }) => ({
        koltuk: k.koltuk,
        ad: k.oyuncu?.kullanici_adi ?? k.bot_ad ?? 'Yarışçı',
        botMu: k.oyuncu_id === null,
        benMiyim: k.koltuk === benimKoltuk.koltuk,
        puan: k.puan,
        ayrildi: k.ayrildi,
        uzaklik: uzakliklar[k.koltuk] ?? null,
      })),
      podyum: sonuc?.podyum ?? null,
      turAcik: sonuc?.durum.turAcik ?? false,
    });
  } catch (e) {
    console.error('arena-durum hatası:', e);
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
