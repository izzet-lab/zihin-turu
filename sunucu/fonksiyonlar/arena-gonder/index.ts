/**
 * arena-gonder — Supabase Edge Function
 *
 * Arenada bir turun cevabını alır. Sunucu:
 *   1. Yarışçının koltuğunu doğrular.
 *   2. Turu tohumdan yeniden üretir (istemciden tur içeriği ALINMAZ).
 *   3. Zinciri sıfırdan doğrular, uzaklığı KENDİ hesaplar.
 *   4. Yalnızca daha iyi (küçük) uzaklık geçer.
 *   5. Arenayı olması gereken noktaya taşır.
 *
 * `terk` eylemi yarıştan çıkmak için: ayrılan koltuk podyumda en sonda
 * ve madalyasız kalır, ama yarış kalanlarla sürer — düellodan farkı bu.
 *
 * Gelen istek (JSON): { mac_id, tur_no, adimlar, kilit? } ya da
 *                     { mac_id, terk: true }
 *
 * Deploy: supabase functions deploy arena-gonder --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ARENA_TUR_SAYISI } from '@tamisabet/cekirdek';
import { arenayiIlerlet, uzaklikHesapla, type ArenaMac } from '../arena-ortak.ts';
import type { Adim } from '@tamisabet/oyun-sayi';

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

    const govde = await req.json() as {
      mac_id: string;
      tur_no?: number;
      adimlar?: Adim[];
      kilit?: boolean;
      terk?: boolean;
    };
    const { mac_id, tur_no, adimlar, kilit, terk } = govde;
    if (!mac_id) return hata('Arena kimliği gerekli.', 400);

    const { data: mac } = await supabase
      .from('arena_mac')
      .select('*')
      .eq('id', mac_id)
      .maybeSingle();
    if (!mac) return hata('Arena bulunamadı.', 404);

    const { data: koltuk } = await supabase
      .from('arena_koltuk')
      .select('koltuk, ayrildi')
      .eq('mac_id', mac_id)
      .eq('oyuncu_id', benId)
      .maybeSingle();
    if (!koltuk) return hata('Bu arenanın yarışçısı değilsin.', 403);

    /* --- Yarıştan çık --- */
    if (terk) {
      await supabase
        .from('arena_koltuk')
        .update({ ayrildi: true })
        .eq('mac_id', mac_id)
        .eq('koltuk', koltuk.koltuk);
      // Kalanlar yarışa devam eder; arena bitmez.
      return ok({ terk: true });
    }

    if (mac.durum !== 'basladi') return hata('Arena şu an oynanmıyor.', 409);
    if (koltuk.ayrildi) return hata('Yarıştan çıkmışsın.', 409);
    if (!Number.isInteger(tur_no) || tur_no! < 1 || tur_no! > ARENA_TUR_SAYISI) {
      return hata('Geçersiz tur numarası.', 400);
    }
    if (!Array.isArray(adimlar)) return hata('adimlar dizi olmalı.', 400);
    if (tur_no !== mac.aktif_tur) return hata('Bu tur şu an oynanmıyor.', 409);

    const uzaklik = uzaklikHesapla(mac as ArenaMac, tur_no!, adimlar);
    if (uzaklik == null) return hata('Geçersiz adım zinciri.', 400);

    const { data: mevcut } = await supabase
      .from('arena_tur')
      .select('uzaklik, kilitli')
      .eq('mac_id', mac_id)
      .eq('tur_no', tur_no)
      .eq('koltuk', koltuk.koltuk)
      .maybeSingle();

    const yeniUzaklik =
      mevcut?.uzaklik == null ? uzaklik : Math.min(mevcut.uzaklik, uzaklik);

    await supabase.from('arena_tur').upsert(
      {
        mac_id,
        tur_no,
        koltuk: koltuk.koltuk,
        uzaklik: yeniUzaklik,
        // Kilit yalnızca açılır, kapanmaz.
        kilitli: mevcut?.kilitli === true || kilit === true,
        bildirildi: new Date().toISOString(),
      },
      { onConflict: 'mac_id,tur_no,koltuk' },
    );

    const sonuc = await arenayiIlerlet(supabase, mac as ArenaMac);

    const { data: son } = await supabase
      .from('arena_mac')
      .select('aktif_tur, durum, tur_basladi')
      .eq('id', mac_id)
      .single();

    return ok({
      uzaklik: yeniUzaklik,
      aktifTur: son.aktif_tur,
      turBasladi: son.tur_basladi,
      durum: son.durum,
      turAcik: sonuc.durum.turAcik,
      podyum: sonuc.podyum,
    });
  } catch (e) {
    console.error('arena-gonder hatası:', e);
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
