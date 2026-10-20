/**
 * hesap-dogrula — İsimle açılmış hesaba gerçek e-posta + parola bağlar.
 *
 * NEDEN İSTEMCİDEN DEĞİL
 * İstemci `updateUser({ email })` dediğinde giriş servisi e-posta
 * değişikliğini onay postasına bağlıyor ("güvenli e-posta değişikliği").
 * Kendi sunucumuzda posta servisi yok; değişiklik sonsuza kadar "onay
 * bekliyor"da kalıyordu (20 Ekim 2026'da canlıda denenip görüldü).
 * Burada service role ile adres doğrudan ve onaylı yazılıyor.
 *
 * Yalnızca İSİMLE AÇILMIŞ hesap için: gerçek e-postası olan bir hesabın
 * adresini bu yoldan değiştirmek, onay postasını atlatmak olurdu.
 * İşaret iç adres alanı (`@isim.tamisabet.tr`, bkz. isimle-giris).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

const ISIM_ALANI = 'isim.tamisabet.tr';
const PAROLA_EN_AZ = 8;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ hata: 'Yalnızca POST desteklenir.' }, 405);

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return json({ hata: 'Kimlik doğrulaması gerekli.' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: kimlikHata } = await admin.auth.getUser(jwt);
  if (kimlikHata || !user) return json({ hata: 'Geçersiz veya süresi dolmuş oturum.' }, 401);
  if (!user.email?.endsWith('@' + ISIM_ALANI)) {
    return json({ hata: 'Bu hesap zaten doğrulanmış.' }, 409);
  }

  const govde = await req.json().catch(() => ({})) as { eposta?: unknown; parola?: unknown };
  const eposta = typeof govde.eposta === 'string' ? govde.eposta.trim().toLowerCase() : '';
  const parola = typeof govde.parola === 'string' ? govde.parola : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta) || eposta.endsWith('@' + ISIM_ALANI)) {
    return json({ hata: 'Geçerli bir e-posta adresi gir.' }, 400);
  }
  if (parola.length < PAROLA_EN_AZ) {
    return json({ hata: `Parola en az ${PAROLA_EN_AZ} karakter olmalı.` }, 400);
  }

  // Giriş servisi alınmış adreste yalnızca genel bir hata veriyor; önce sor (göç 021).
  const { data: kayitli } = await admin.rpc('eposta_kayitli_mi', { eposta });
  if (kayitli === true) return json({ hata: 'Bu e-posta başka bir hesapta kayıtlı.' }, 409);

  // Parola değişince giriş servisi eski oturumları kapatıyor; istemci
  // ardından yeni e-posta + parolayla kendisi yeniden giriyor.
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: eposta,
    password: parola,
    email_confirm: true,
  });
  if (error) {
    if (/already|exists|registered/i.test(error.message) || error.code === 'email_exists') {
      return json({ hata: 'Bu e-posta başka bir hesapta kayıtlı.' }, 409);
    }
    console.error('[hesap-dogrula] Güncellenemedi:', error.message);
    return json({ hata: 'Kaydedilemedi, tekrar dene.' }, 500);
  }

  return json({ basarili: true });
});
