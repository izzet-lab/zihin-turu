/**
 * isimle-giris — Sistem 2: yalnızca isimle hesap açar ve oturum döner.
 *
 * NEDEN SUPABASE'İN ANONİM OTURUMU DEĞİL
 * Anonim oturum giriş servisinin ortam değişkeniyle açılıp kapanıyor;
 * o ayar sunucuda, panelden değiştirilemiyor. Bu fonksiyon hesabı
 * kendisi açtığı için tek anahtar yönetim panelindeki
 * `ayar.giris_sistemi`: sistem1 seçiliyse burada da reddediliyor,
 * yani seçim yalnızca ekranı değil sunucuyu da bağlıyor.
 *
 * HESAP NASIL AÇILIYOR
 * Oyuncunun e-postası yok; hesaba iç bir adres verilir
 * (`<rastgele>@isim.tamisabet.tr`, oraya hiçbir zaman posta gitmez)
 * ve rastgele bir parola. Parola oyuncuya verilmez, burada oturum
 * açmak için bir kez kullanılır ve unutulur — oyuncu oturumla devam
 * eder. Hesap bu yüzden cihaza bağlı; profildeki "Profilini doğrula"
 * gerçek e-posta + parola koyunca kalıcı olur. İç adresin alanı,
 * hesabın henüz doğrulanmadığının işareti (istemci ve panel ona bakıyor).
 *
 * Kullanıcı adı ve profil satırı burada açılmıyor: istemci, oturum
 * gelince ismi üst veriden okuyup kendi satırını açıyor (göç 005'teki
 * yetkiyle), "nazim" alınmışsa "nazim2" deniyor.
 *
 * KÖTÜYE KULLANIM SINIRI
 * Aynı adresten saatte en çok SAATLIK_SINIR hesap. Adres düz
 * saklanmıyor, özeti saklanıyor ve bir gün sonra siliniyor (KVKK).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

/** İsimle açılmış hesabın iç adres alanı. İstemcideki kimlik.ts ile aynı. */
const ISIM_ALANI = 'isim.tamisabet.tr';

const SAATLIK_SINIR = 10;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

/** Rastgele, oyuncunun hiç görmeyeceği parola. */
function rastgeleParola(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

async function ozet(metin: string): Promise<string> {
  const veri = new TextEncoder().encode(metin);
  const h = await crypto.subtle.digest('SHA-256', veri);
  return Array.from(new Uint8Array(h), (x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ hata: 'Yalnızca POST desteklenir.' }, 405);

  const govde = await req.json().catch(() => ({})) as { isim?: unknown };
  const isim = typeof govde.isim === 'string' ? govde.isim.replace(/\s+/g, ' ').trim() : '';
  // Biçim kuralının tamamı istemcide (isim-karar.ts); burada yalnızca
  // veritabanının da reddedeceği sınırlar: boş olmasın, 32'yi aşmasın.
  if (!isim || isim.length > 32 || /[\p{Cc}]/u.test(isim)) {
    return json({ hata: 'Geçerli bir isim yaz.' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Panelde isimle giriş seçili mi?
  const { data: ayar } = await admin.from('ayar').select('deger').eq('anahtar', 'giris_sistemi').maybeSingle();
  const sistem = ayar?.deger ?? 'sistem2';
  if (sistem !== 'sistem2') {
    return json({ hata: 'İsimle giriş şu an kapalı. E-postayla giriş yapabilirsin.' }, 403);
  }

  // 2. Kötüye kullanım sınırı
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]!.trim() || 'bilinmiyor';
  const ipOzet = await ozet(ip);
  const birSaatOnce = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from('isimle_giris_kaydi')
    .select('*', { count: 'exact', head: true })
    .eq('ip_ozet', ipOzet)
    .gte('zaman', birSaatOnce);
  if ((count ?? 0) >= SAATLIK_SINIR) {
    return json({ hata: 'Çok fazla deneme oldu, biraz sonra tekrar dene.' }, 429);
  }
  await admin.from('isimle_giris_kaydi').insert({ ip_ozet: ipOzet });
  await admin.from('isimle_giris_kaydi').delete().lt('zaman', new Date(Date.now() - 86_400_000).toISOString());

  // 3. Hesabı aç
  const eposta = `${crypto.randomUUID()}@${ISIM_ALANI}`;
  const parola = rastgeleParola();
  const { error: acmaHatasi } = await admin.auth.admin.createUser({
    email: eposta,
    password: parola,
    email_confirm: true,
    user_metadata: { isim },
  });
  if (acmaHatasi) {
    console.error('[isimle-giris] Hesap açılamadı:', acmaHatasi.message);
    return json({ hata: 'Hesap açılamadı, tekrar dene.' }, 500);
  }

  // 4. Oturumu aç ve dön
  const genel = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: giris, error: girisHatasi } = await genel.auth.signInWithPassword({ email: eposta, password: parola });
  if (girisHatasi || !giris.session) {
    console.error('[isimle-giris] Oturum açılamadı:', girisHatasi?.message);
    return json({ hata: 'Oturum açılamadı, tekrar dene.' }, 500);
  }

  return json({
    access_token: giris.session.access_token,
    refresh_token: giris.session.refresh_token,
  });
});
