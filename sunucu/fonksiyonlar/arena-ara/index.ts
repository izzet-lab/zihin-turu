/**
 * arena-ara — Supabase Edge Function
 *
 * Oyuncu "arenaya katıl" dediğinde çağrılır.
 *
 * KUYRUK TABLOSU YOK: bekleyen arenanın kendisi kuyruk. İlk gelen
 * arenayı açıyor, sonrakiler ona katılıyor. Beş koltuk dolunca ya da
 * bekleme süresi geçince arena botlarla tamamlanıp başlıyor.
 *
 * Gelen istek (JSON):
 *   seviye          seviye anahtarı
 *   sadece_kontrol  true ise yalnızca "süren arenam var mı" diye sorar,
 *                   arenaya KATILMAZ (ekrana bakmak katılmak olmamalı)
 *
 * Deploy: supabase functions deploy arena-ara --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ARENA_KOLTUK } from '@tamisabet/cekirdek';
import { SEVIYE_LISTESI } from '@tamisabet/oyun-sayi';
import { ARENA_BEKLEME_SN, arenayiBaslat, type ArenaMac } from '../arena-ortak.ts';

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

    const { seviye, sadece_kontrol } = await req.json() as {
      seviye: string;
      sadece_kontrol?: boolean;
    };
    if (!SEVIYE_LISTESI.some((s) => s.anahtar === seviye)) {
      return hata('Bilinmeyen seviye.', 400);
    }

    // --- 1. Zaten bir arenada mıyım? ---
    // Sekmesini yenileyen oyuncu arenasına geri dönmeli.
    // Durum süzgeci gömülü tabloda değil BURADA uygulanıyor: gömülü
    // süzgeçlerin davranışına güvenip bitmiş bir arenayı "sürüyor" diye
    // döndürürsek oyuncu podyum ekranında kilitli kalır. Birkaç satır
    // okunup JavaScript'te elenmesi hem kesin hem ucuz.
    const { data: koltuklarim } = await supabase
      .from('arena_koltuk')
      .select('mac_id, koltuk, ayrildi, arena_mac!inner(id, durum)')
      .eq('oyuncu_id', benId)
      .limit(10);

    const surenKoltuk = (koltuklarim ?? []).find(
      (k: { ayrildi?: boolean; arena_mac?: { durum?: string } | { durum?: string }[] }) => {
        // Yarıştan ÇIKMIŞ koltuk "süren arena" sayılmaz; yoksa oyuncu
        // çıktığı arenaya geri yapışır ve yeni bir arenaya giremezdi.
        if (k.ayrildi) return false;
        const m = Array.isArray(k.arena_mac) ? k.arena_mac[0] : k.arena_mac;
        return m?.durum === 'bekliyor' || m?.durum === 'basladi';
      },
    );

    if (surenKoltuk) {
      return ok({ macId: surenKoltuk.mac_id, koltuk: surenKoltuk.koltuk });
    }
    if (sadece_kontrol) return ok({ arenaYok: true });

    // --- 2. Ölü bekleyenleri temizle ---
    await supabase
      .from('arena_mac')
      .delete()
      .eq('durum', 'bekliyor')
      .lt('olusturuldu', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // --- 3. Bekleyen bir arena var mı? ---
    const { data: bekleyenler } = await supabase
      .from('arena_mac')
      .select('*')
      .eq('durum', 'bekliyor')
      .eq('seviye', seviye)
      .order('olusturuldu', { ascending: true })
      .limit(5);

    for (const arena of (bekleyenler ?? []) as ArenaMac[]) {
      const { data: doluKoltuklar } = await supabase
        .from('arena_koltuk')
        .select('koltuk')
        .eq('mac_id', arena.id);
      const dolu = (doluKoltuklar ?? []).length;
      if (dolu >= ARENA_KOLTUK) continue;

      // Koltuğa otur. Aynı anda iki kişi aynı koltuğa oturmaya
      // çalışırsa birincil anahtar reddeder; sıradaki koltuk denenir.
      let oturdu = 0;
      for (let koltuk = 1; koltuk <= ARENA_KOLTUK && !oturdu; koltuk++) {
        const { error } = await supabase
          .from('arena_koltuk')
          .insert({ mac_id: arena.id, koltuk, oyuncu_id: benId });
        if (!error) oturdu = koltuk;
      }
      if (!oturdu) continue;

      // Koltuklar dolduysa ya da bekleme süresi geçtiyse hemen başlat.
      const bekleyenSn = (Date.now() - Date.parse(arena.olusturuldu)) / 1000;
      if (dolu + 1 >= ARENA_KOLTUK || bekleyenSn >= ARENA_BEKLEME_SN) {
        await arenayiBaslat(supabase, arena);
      }
      return ok({ macId: arena.id, koltuk: oturdu });
    }

    // --- 4. Yoksa yeni arena aç ---
    // Tohum sunucuda üretilir; istemciden gelseydi oyuncu kendine kolay
    // bulmaca seçerdi (kural 2).
    const tohum = Math.floor(Math.random() * 2 ** 31);
    const { data: yeni, error: yeniHata } = await supabase
      .from('arena_mac')
      .insert({ oyun: 'sayi', seviye, tohum, durum: 'bekliyor' })
      .select('*')
      .single();
    if (yeniHata || !yeni) return hata('Arena kurulamadı.', 500);

    await supabase
      .from('arena_koltuk')
      .insert({ mac_id: yeni.id, koltuk: 1, oyuncu_id: benId });

    return ok({ macId: yeni.id, koltuk: 1, yeniKuruldu: true });
  } catch (e) {
    console.error('arena-ara hatası:', e);
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
