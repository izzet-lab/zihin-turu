/**
 * kelime-gonder — Supabase Edge Function
 *
 * İstemci "şu kelimeyi buldum" diyor. Sunucu:
 *   1. Tohumdan harf havuzunu yeniden üretiyor (deterministik).
 *   2. Kelimeyi sıfırdan doğruluyor: harflerden yazılabiliyor mu,
 *      sözlükte var mı.
 *   3. Puanı kendisi hesaplıyor — istemcinin bildirdiğine güvenilmiyor.
 *   4. tur_sonuc tablosuna yazıyor; lig tabloları tetikleyiciyle dolar.
 *   5. Aynı tur ikinci kez gönderilirse reddediyor (UNIQUE kısıtı).
 *
 * NEDEN AYRI FONKSİYON
 * `tur-gonder` baştan sona sayı turuna özgü: adım zinciri, jokerler,
 * büyük sayı adedi. Kelime turunun gönderdiği şey tek bir kelime.
 * İkisini tek fonksiyonda birleştirmek, canlıdaki sayı turunu kelime
 * turu uğruna riske atmak olurdu.
 *
 * SÖZLÜK BURADA DA AYNI DOSYADAN GELİYOR
 * İstemci ile sunucu farklı sözlük kullanırsa, istemcide kabul edilen
 * kelime sunucuda reddedilir. Tek kaynak: `veri/kelimeler.ts`.
 *
 * Deploy:
 *   npx supabase functions deploy kelime-gonder \
 *     --project-ref ruoyofzujzmhwvumquzu \
 *     --import-map sunucu/fonksiyonlar/import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { gunlukTohum } from '@tamisabet/cekirdek';
import {
  kelimeTuruKur,
  tamSozlukKur,
  kelimeGonderimDogrula,
} from '@tamisabet/oyun-kelime';
import { KELIME_METNI, YAYGIN_METNI, GOVDE_METNI } from '@tamisabet/oyun-kelime/sozluk-verisi';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sözlük modül düzeyinde bir kez kuruluyor: elli bin kelimelik kümeyi
// her istekte yeniden kurmak işlevi gereksiz yere yavaşlatırdı.
const kelimeTuru = kelimeTuruKur(tamSozlukKur(KELIME_METNI, GOVDE_METNI), tamSozlukKur(YAYGIN_METNI));

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

    const oyuncuId = kullanici.user.id;

    const body = await req.json() as {
      oyun: string;
      mod: string;
      seviye: string;
      tarih: string;
      tohum: number;
      kelime: string;
      sure_sn: number;
      kalan_sn: number;
    };

    const { oyun, mod, seviye, tarih, tohum, kelime, sure_sn, kalan_sn } = body;

    // Girdi denetimi oyun paketinde ve test ediliyor (kural 1).
    const denetim = kelimeGonderimDogrula({
      oyun,
      mod,
      seviye,
      tarih,
      tohum,
      kelime,
      sureSn: sure_sn,
      kalanSn: kalan_sn,
      simdiMs: Date.now(),
    });
    if (denetim) return hata(denetim, 400);

    // Günün Turu'nda tohum tarihten türemek ZORUNDA. Başka bir tohum
    // göndermek, kendine kolay bir bulmaca seçip lige puan yazdırmak
    // olurdu.
    if (mod === 'gunun') {
      const beklenen = gunlukTohum('kelime', seviye, tarih);
      if (tohum !== beklenen) return hata('Tohum bu güne ait değil.', 400);
    }

    // --- Turu yeniden üret ve cevabı doğrula ---
    const tur = kelimeTuru.turUret(seviye, tohum);
    const dogr = kelimeTuru.dogrula(tur, { icerik: kelime });
    if (!dogr.gecerli) return hata(dogr.hata ?? 'Kelime kabul edilmedi.', 400);

    // --- Puanı sunucu hesaplar ---
    const p = kelimeTuru.puanla(seviye, dogr, kalan_sn, sure_sn, false);

    const { error: yazmaHata } = await supabase.from('tur_sonuc').insert({
      oyuncu_id: oyuncuId,
      oyun: 'kelime',
      mod,
      seviye,
      tarih,
      tohum,
      uzaklik: dogr.uzaklik ?? 0,
      puan: p.toplam,
      sure_sn,
      kalan_sn,
      // Kelime turunda adım ve joker yok; sütunlar sayı turundan
      // kalma, sıfır yazılıyor.
      adim_sayisi: 0,
      joker_sayisi: 0,
    });

    if (yazmaHata) {
      if (yazmaHata.code === '23505') return hata('Bu tur zaten gönderildi.', 409);
      console.error('Yazma hatası:', yazmaHata);
      // Postgres hata KODU yanıta konuyor. Mesaj değil kod: kod hiçbir
      // kullanıcı verisi taşımıyor ama bir sorunun nedenini kazmadan
      // söylüyor. Kodsuz bir "sunucu hatası" yanıtı, canlıda tek
      // başına hiçbir şey anlatmıyordu.
      return hata(`Kayıt sırasında hata oluştu. (${yazmaHata.code ?? '?'})`, 500);
    }

    return ok({ puan: p.toplam, uzaklik: dogr.uzaklik ?? 0 });
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
