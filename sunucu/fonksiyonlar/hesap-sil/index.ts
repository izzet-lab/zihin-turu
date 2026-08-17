/**
 * hesap-sil — Kullanıcı hesabını ve tüm verisini siler.
 *
 * JWT'yi doğrular, talebi yapanın silmek istediği hesap sahibi olduğunu
 * kontrol eder ve ardından auth.users'dan siler. ON DELETE CASCADE sayesinde
 * bağlı tüm tablolar (oyuncu, tur_sonuc, lig_gunluk, lig_donem…) otomatik silinir.
 *
 * KVKK: Kişisel veri silme talebi bu uç nokta üzerinden karşılanır.
 * Saklama süresi politikası gereği en geç 30 gün içinde silinmesi gerekir;
 * bu fonksiyon anında siler.
 *
 * Deploy: supabase functions deploy hesap-sil
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ hata: 'Yalnızca POST desteklenir.' }, 405);
  }

  // JWT'yi Authorization başlığından al
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ hata: 'Kimlik doğrulaması gerekli.' }, 401);

  const token = authHeader.replace('Bearer ', '');

  // Kullanıcı kimliği doğrulama istemcisi (anon key — yalnızca JWT doğrulama için)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );

  // Yönetici istemcisi — kullanıcıyı silmek için service role gerekir
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // JWT'yi doğrula: kim olduğunu kontrol et
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return json({ hata: 'Geçersiz veya süresi dolmuş oturum.' }, 401);
  }

  // Kullanıcıyı sil (cascade: oyuncu, tur_sonuc, lig tablolar hepsi silinir)
  const { error: silmeHatasi } = await admin.auth.admin.deleteUser(user.id);
  if (silmeHatasi) {
    console.error('[hesap-sil] Silme başarısız:', silmeHatasi.message);
    return json({ hata: 'Hesap silinemedi. Lütfen tekrar deneyin.' }, 500);
  }

  console.log('[hesap-sil] Hesap silindi:', user.id);
  return json({ basarili: true });
});
