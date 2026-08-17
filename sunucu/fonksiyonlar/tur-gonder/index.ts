/**
 * tur-gonder — Supabase Edge Function
 *
 * İstemci "şu taşları şöyle birleştirdim" diyor. Sunucu:
 *   1. Tohumdan turu yeniden üretiyor (deterministik).
 *   2. Adım zincirini sıfırdan doğruluyor.
 *   3. Puanı kendisi hesaplıyor — istemcinin bildirdiğine güvenilmiyor.
 *   4. tur_sonuc tablosuna yazıyor (yalnızca bu fonksiyon yazar; RLS).
 *   5. Aynı tur ikinci kez gönderilirse reddediyor (UNIQUE kısıtı).
 *
 * Gelen istek (JSON):
 *   oyun        'sayi'
 *   mod         'gunun' | 'antrenman'
 *   seviye      seviye anahtarı
 *   tarih       YYYY-MM-DD (Günün Turu'nda tohum kontrolü için)
 *   tohum       sayısal tohum
 *   adimlar     Adim[] (oyuncunun yaptığı adımlar)
 *   sure_sn     turun toplam süresi (saniye; 0 = süresiz)
 *   kalan_sn    süre bittiğinde kalan saniye
 *   jokerler    JokerTip[] (kullanılan jokerler)
 *   buyuk_adet  kaç "büyük" sayı seçildi (Antrenman'da önemli)
 *
 * Dönüş (JSON):
 *   puan        sunucunun hesapladığı puan
 *   uzaklik     hedefe uzaklık (0 = tam isabet)
 *
 * Deploy: supabase functions deploy tur-gonder --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { gunlukTohum } from '@zihinturu/cekirdek';
import {
  uretimYap,
  dogrulaZinciri,
  puanlaHesap,
  jokerliPuan,
  antrenmanToplamCarpani,
  SEVIYE_LISTESI,
  type JokerTip,
  type Adim,
} from '@zihinturu/oyun-sayi';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // CORS ön uçuş isteği
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // --- Kimlik doğrulama ---
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) return hata('Giriş yapılmamış.', 401);

    // Service role ile Supabase bağlantısı (yalnızca yazma için)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Kullanıcıyı doğrula (anon key, yalnızca JWT çözümü için)
    const anahtarli = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const { data: kullanici, error: kimlikHata } = await anahtarli.auth.getUser(jwt);
    if (kimlikHata || !kullanici.user) return hata('Geçersiz oturum.', 401);

    const oyuncuId = kullanici.user.id;

    // --- Gelen veriyi çözümle ---
    const body = await req.json() as {
      oyun: string;
      mod: string;
      seviye: string;
      tarih: string;
      tohum: number;
      adimlar: Adim[];
      sure_sn: number;
      kalan_sn: number;
      jokerler: JokerTip[];
      buyuk_adet?: number;
    };

    const { oyun, mod, seviye, tarih, tohum, adimlar, sure_sn, kalan_sn, jokerler, buyuk_adet } = body;

    // Temel alan kontrolü
    if (oyun !== 'sayi') return hata('Bilinmeyen oyun: ' + oyun, 400);
    if (!['gunun', 'antrenman'].includes(mod)) return hata('Geçersiz mod.', 400);
    if (!seviye || !tarih || tohum == null) return hata('Eksik alan.', 400);
    if (!Array.isArray(adimlar)) return hata('adimlar dizi olmalı.', 400);
    if (kalan_sn < 0 || kalan_sn > sure_sn + 30) return hata('Geçersiz süre.', 400);

    // --- Günün Turu'nda tohum kontrolü ---
    // Tarihten bağımsız bir tohum göndermek, dün veya gelecekteki turu
    // bugün göndermek anlamına gelirdi. Bunu reddediyoruz.
    if (mod === 'gunun') {
      const beklenen = gunlukTohum('sayi', seviye, tarih);
      if (tohum !== beklenen) return hata('Tohum bu güne ait değil.', 400);
    }

    // --- Turu yeniden üret (deterministik) ---
    const uretim = uretimYap(seviye, tohum, buyuk_adet);

    // --- Adım zincirini doğrula ---
    // Oyuncu hiç adım atmadıysa uzaklık = hedefe başlangıç uzaklığı (tüm taşlar)
    let dogr;
    if (adimlar.length === 0) {
      // Boş zincir: oyuncu hiç işlem yapmadı, puan 0.
      dogr = { gecerli: true, uzaklik: uretim.hedef, ozet: 'Adım yok' };
    } else {
      dogr = dogrulaZinciri(uretim.sayilar, adimlar, uretim.hedef);
    }

    if (!dogr.gecerli) return hata('Geçersiz adım zinciri: ' + dogr.hata, 400);

    // --- Puanı sunucu hesaplar ---
    const seviyeObj = SEVIYE_LISTESI.find((s) => s.anahtar === seviye);
    if (!seviyeObj) return hata('Bilinmeyen seviye.', 400);

    const temel = puanlaHesap(seviye, dogr.uzaklik, kalan_sn, sure_sn, false);

    // Antrenman: risk çarpanı uygulanır. Günün Turu: çarpan yok.
    const carpanli =
      mod === 'antrenman' ? Math.round(temel.toplam * antrenmanToplamCarpani(seviye, sure_sn)) : temel.toplam;

    const nihai = jokerliPuan(carpanli, Array.isArray(jokerler) ? jokerler : []);

    // --- Veritabanına yaz ---
    const { error: yazmaHata } = await supabase.from('tur_sonuc').insert({
      oyuncu_id: oyuncuId,
      oyun,
      mod,
      seviye,
      tarih,
      tohum,
      uzaklik: dogr.uzaklik,
      puan: nihai,
      sure_sn,
      kalan_sn,
      adim_sayisi: adimlar.length,
      joker_sayisi: Array.isArray(jokerler) ? jokerler.length : 0,
    });

    if (yazmaHata) {
      // UNIQUE kısıtı: aynı tur daha önce gönderilmiş.
      if (yazmaHata.code === '23505') return hata('Bu tur zaten gönderildi.', 409);
      console.error('Yazma hatası:', yazmaHata);
      return hata('Kayıt sırasında hata oluştu.', 500);
    }

    return ok({ puan: nihai, uzaklik: dogr.uzaklik });
  } catch (e) {
    console.error('Beklenmedik hata:', e);
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
