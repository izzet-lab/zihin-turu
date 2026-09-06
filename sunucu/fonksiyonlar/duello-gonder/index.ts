/**
 * duello-gonder — Supabase Edge Function
 *
 * Düelloda bir turun cevabını alır. Sunucu:
 *   1. Maçı ve oyuncunun hangi taraf olduğunu doğrular.
 *   2. Turu tohumdan yeniden üretir (istemciden tur içeriği ALINMAZ).
 *   3. Adım zincirini sıfırdan doğrular ve uzaklığı KENDİ hesaplar.
 *   4. Sonucu yazar; aynı turda yalnızca daha iyi (küçük) uzaklık geçer.
 *   5. Maçı olması gereken noktaya taşır (`macIlerlet`): botun sırası
 *      geldiyse oynatır, tur kapandıysa sonrakini açar, maç bittiyse
 *      dereceleri günceller.
 *
 * İlerletme mantığı `duello-ortak.ts` içinde, çünkü `duello-durum` da
 * aynı işi yapıyor; iki yerde ayrı yazılsaydı biri düzeltilip diğeri
 * unutulurdu.
 *
 * ÇÖZÜM SIZMAZ (kural 8)
 * Dönüşte rakibin adımları yok. Rakibe giden tek bilgi uzaklık.
 *
 * Gelen istek (JSON): { mac_id, tur_no, adimlar }
 * Deploy: supabase functions deploy duello-gonder --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { DUELLO_TUR_SAYISI, type Taraf } from '@zihinturu/cekirdek';
import { macIlerlet, uzaklikHesapla, type Mac } from '../duello-ortak.ts';
import type { Adim } from '@zihinturu/oyun-sayi';

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

    // --- Zinciri doğrula, uzaklığı sunucu hesapla ---
    const uzaklik = uzaklikHesapla(mac as Mac, tur_no, adimlar);
    if (uzaklik == null) return hata('Geçersiz adım zinciri.', 400);

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

    // --- Maçı olması gereken noktaya taşı ---
    const durum = await macIlerlet(supabase, mac as Mac);

    const { data: son } = await supabase
      .from('duello_mac')
      .select('aktif_tur, durum, kazanan, skor_a, skor_b, tur_basladi')
      .eq('id', mac_id)
      .single();

    return ok({
      uzaklik: yeniUzaklik,
      skorA: durum.skor.a,
      skorB: durum.skor.b,
      aktifTur: son.aktif_tur,
      turBasladi: son.tur_basladi,
      turAcik: durum.turAcik,
      turKazanani: durum.turKazanani,
      durum: son.durum,
      kazanan: son.kazanan,
    });
  } catch (e) {
    console.error('duello-gonder hatası:', e);
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
