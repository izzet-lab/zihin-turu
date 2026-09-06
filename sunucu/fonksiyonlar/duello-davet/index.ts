/**
 * duello-davet — Supabase Edge Function
 *
 * Kuyruğa girmeden maç kurmanın iki yolu:
 *   - **Rövanş:** biten bir maçtan yeni maç açar.
 *   - **Özel oda:** kod üretir; arkadaş kodu girip katılır.
 *
 * İkisi de aynı yerde çünkü aynı işi yapıyorlar: belli iki oyuncuyu
 * eşleştirmek. Ayrı dosyalara bölünseydi maç kurma kodu iki kez yazılırdı.
 *
 * YARIŞ NASIL ÖNLENİYOR
 * İki oyuncu aynı anda "rövanş" derse iki maç kurulurdu. Veritabanında
 * bir maçtan yalnızca bir rövanş açılmasına izin veren kısıt var;
 * ikinci ekleme reddediliyor ve reddedilen taraf var olan maça
 * katılıyor. (Eşleştirme kuyruğunda aynı yarışı simetri kırarak
 * çözmüştük — orada kısıt kurmak zordu, burada kolay.)
 *
 * Gelen istek (JSON):
 *   { eylem: 'revans', mac_id }
 *   { eylem: 'oda-kur', seviye }
 *   { eylem: 'oda-katil', kod }
 *   { eylem: 'oda-durum', kod }
 *   { eylem: 'terk', mac_id }
 *
 * Deploy: supabase functions deploy duello-davet --import-map ../import_map.json
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SEVIYE_LISTESI } from '@zihinturu/oyun-sayi';
import { dereceleriGuncelle, type Mac } from '../duello-ortak.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Kod alfabesi: karışabilen harf ve rakamlar (O/0, I/1) dışarıda. */
const KOD_HARFLERI = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function kodUret(): string {
  let kod = '';
  for (let i = 0; i < 5; i++) {
    kod += KOD_HARFLERI[Math.floor(Math.random() * KOD_HARFLERI.length)];
  }
  return kod;
}

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
      eylem: string;
      mac_id?: string;
      seviye?: string;
      kod?: string;
    };

    /* --------------------------------------------------------------- */
    /* Rövanş                                                           */
    /* --------------------------------------------------------------- */
    if (govde.eylem === 'revans') {
      if (!govde.mac_id) return hata('Maç kimliği gerekli.', 400);

      const { data: eski } = await supabase
        .from('duello_mac')
        .select('*')
        .eq('id', govde.mac_id)
        .maybeSingle();
      if (!eski) return hata('Maç bulunamadı.', 404);
      if (eski.oyuncu_a !== benId && eski.oyuncu_b !== benId) {
        return hata('Bu maçın tarafı değilsin.', 403);
      }
      if (eski.durum === 'basladi') return hata('Maç henüz bitmedi.', 409);

      // Rakip zaten rövanş açtıysa ona katıl.
      const { data: mevcutRevans } = await supabase
        .from('duello_mac')
        .select('*')
        .eq('revans_kaynak', govde.mac_id)
        .maybeSingle();
      if (mevcutRevans) return ok({ mac: macCevabi(mevcutRevans, benId) });

      // Rövanşta taraflar YER DEĞİŞTİRİR. Tek sebep adalet değil:
      // A tarafı, tam isabet eşitliğinde ilk bildirdiği için avantajlı
      // sayılabilir; sırayla oynanınca bu avantaj dengelenir.
      const yeni = await macKur(supabase, {
        seviye: eski.seviye,
        oyuncuA: eski.oyuncu_b ?? eski.oyuncu_a,
        oyuncuB: eski.oyuncu_b ? eski.oyuncu_a : null,
        botProfil: eski.bot_profil,
        botAd: eski.bot_ad,
        revansKaynak: govde.mac_id,
      });

      if (!yeni) {
        // Kısıt reddettiyse rakip aynı anda açmış demektir; onu döndür.
        const { data: yarisiKazanan } = await supabase
          .from('duello_mac')
          .select('*')
          .eq('revans_kaynak', govde.mac_id)
          .maybeSingle();
        if (yarisiKazanan) return ok({ mac: macCevabi(yarisiKazanan, benId) });
        return hata('Rövanş kurulamadı.', 500);
      }
      return ok({ mac: macCevabi(yeni, benId) });
    }

    /* --------------------------------------------------------------- */
    /* Özel oda — kur                                                   */
    /* --------------------------------------------------------------- */
    if (govde.eylem === 'oda-kur') {
      const seviye = govde.seviye ?? 'normal';
      if (!SEVIYE_LISTESI.some((s) => s.anahtar === seviye)) {
        return hata('Bilinmeyen seviye.', 400);
      }

      // Eskiyen odaları temizle; kod havuzu dolmasın.
      await supabase
        .from('duello_oda')
        .delete()
        .is('mac_id', null)
        .lt('olusturuldu', new Date(Date.now() - 30 * 60 * 1000).toISOString());

      // Kod çakışırsa birkaç kez dene.
      for (let deneme = 0; deneme < 5; deneme++) {
        const kod = kodUret();
        const { data, error } = await supabase
          .from('duello_oda')
          .insert({ kod, kuran: benId, seviye })
          .select('kod, seviye')
          .single();
        if (!error && data) return ok({ kod: data.kod, seviye: data.seviye });
      }
      return hata('Oda kurulamadı, tekrar dene.', 500);
    }

    /* --------------------------------------------------------------- */
    /* Özel oda — katıl                                                 */
    /* --------------------------------------------------------------- */
    if (govde.eylem === 'oda-katil') {
      const kod = (govde.kod ?? '').trim().toUpperCase();
      if (!/^[A-Z0-9]{5}$/.test(kod)) return hata('Kod 5 karakter olmalı.', 400);

      const { data: oda } = await supabase
        .from('duello_oda')
        .select('*')
        .eq('kod', kod)
        .maybeSingle();
      if (!oda) return hata('Böyle bir oda yok.', 404);

      // Maç zaten kurulduysa (ikinci kez katılma denemesi) onu döndür.
      if (oda.mac_id) {
        const { data: mac } = await supabase
          .from('duello_mac')
          .select('*')
          .eq('id', oda.mac_id)
          .maybeSingle();
        if (mac && (mac.oyuncu_a === benId || mac.oyuncu_b === benId)) {
          return ok({ mac: macCevabi(mac, benId) });
        }
        return hata('Bu oda dolu.', 409);
      }

      if (oda.kuran === benId) return hata('Kendi odana katılamazsın.', 409);

      const mac = await macKur(supabase, {
        seviye: oda.seviye,
        oyuncuA: oda.kuran,
        oyuncuB: benId,
        odaKodu: kod,
      });
      if (!mac) return hata('Maç kurulamadı.', 500);

      // Odayı maça bağla; kuran taraf bunu görüp maça girecek.
      await supabase.from('duello_oda').update({ mac_id: mac.id }).eq('kod', kod);
      return ok({ mac: macCevabi(mac, benId) });
    }

    /* --------------------------------------------------------------- */
    /* Özel oda — durum (kuran taraf bekler)                            */
    /* --------------------------------------------------------------- */
    if (govde.eylem === 'oda-durum') {
      const kod = (govde.kod ?? '').trim().toUpperCase();
      const { data: oda } = await supabase
        .from('duello_oda')
        .select('*')
        .eq('kod', kod)
        .maybeSingle();
      if (!oda) return hata('Böyle bir oda yok.', 404);
      if (oda.kuran !== benId) return hata('Bu oda senin değil.', 403);

      if (!oda.mac_id) return ok({ bekliyor: true, kod: oda.kod });

      const { data: mac } = await supabase
        .from('duello_mac')
        .select('*')
        .eq('id', oda.mac_id)
        .maybeSingle();
      if (!mac) return ok({ bekliyor: true, kod: oda.kod });
      return ok({ mac: macCevabi(mac, benId) });
    }

    /* --------------------------------------------------------------- */
    /* Maçı terk et                                                     */
    /* --------------------------------------------------------------- */
    if (govde.eylem === 'terk') {
      if (!govde.mac_id) return hata('Maç kimliği gerekli.', 400);

      const { data: mac } = await supabase
        .from('duello_mac')
        .select('*')
        .eq('id', govde.mac_id)
        .maybeSingle();
      if (!mac) return hata('Maç bulunamadı.', 404);

      const taraf = mac.oyuncu_a === benId ? 'a' : mac.oyuncu_b === benId ? 'b' : null;
      if (!taraf) return hata('Bu maçın tarafı değilsin.', 403);
      if (mac.durum !== 'basladi') return ok({ zatenBitti: true });

      // Terk eden kaybeder; maç düzgün sonlanır. Çekirdekteki
      // "ayrıldı" kuralının sunucu karşılığı.
      const kazanan = taraf === 'a' ? 'b' : 'a';
      const { data: bitirilen } = await supabase
        .from('duello_mac')
        .update({
          durum: 'terk',
          kazanan,
          terk_eden: taraf,
          bitti: new Date().toISOString(),
        })
        .eq('id', govde.mac_id)
        .eq('durum', 'basladi')
        .select('id');

      // Derece yalnızca maçı gerçekten sonlandıran istekte işlenir.
      if (bitirilen && (bitirilen as unknown[]).length > 0) {
        await dereceleriGuncelle(supabase, mac as Mac, kazanan);
      }
      return ok({ terk: true, kazanan });
    }

    return hata('Bilinmeyen eylem.', 400);
  } catch (e) {
    console.error('duello-davet hatası:', e);
    return hata('Sunucu hatası.', 500);
  }
});

async function macKur(
  supabase: ReturnType<typeof createClient>,
  g: {
    seviye: string;
    oyuncuA: string;
    oyuncuB: string | null;
    botProfil?: string | null;
    botAd?: string | null;
    revansKaynak?: string;
    odaKodu?: string;
  },
) {
  const tohum = Math.floor(Math.random() * 2 ** 31);
  const { data, error } = await supabase
    .from('duello_mac')
    .insert({
      oyun: 'sayi',
      seviye: g.seviye,
      tohum,
      oyuncu_a: g.oyuncuA,
      oyuncu_b: g.oyuncuB,
      bot_profil: g.oyuncuB ? null : (g.botProfil ?? 'orta'),
      bot_ad: g.oyuncuB ? null : (g.botAd ?? 'Rakip'),
      aktif_tur: 1,
      tur_basladi: new Date().toISOString(),
      revans_kaynak: g.revansKaynak ?? null,
      oda_kodu: g.odaKodu ?? null,
    })
    .select('*')
    .single();
  if (error) {
    console.error('maç kurulamadı:', error);
    return null;
  }
  return data;
}

/** Maçı istemciye anlatır; rakibin adımı burada yok (kural 8). */
function macCevabi(m: Record<string, unknown>, benId: string) {
  return {
    id: m.id,
    seviye: m.seviye,
    tohum: m.tohum,
    benTarafim: m.oyuncu_a === benId ? 'a' : 'b',
    aktifTur: m.aktif_tur,
    turBasladi: m.tur_basladi,
    skorA: m.skor_a,
    skorB: m.skor_b,
    durum: m.durum,
    botMu: m.oyuncu_b === null,
    botAd: m.bot_ad,
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
