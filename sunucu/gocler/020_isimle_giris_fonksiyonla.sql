-- 020 - İsimle giriş anonim oturumdan `isimle-giris` fonksiyonuna geçti (20 Ekim 2026)
--
-- NEDEN
-- Göç 019'da isimle giriş Supabase'in anonim oturumuna dayanıyordu.
-- Anonim oturum giriş servisinin ortam değişkeniyle açılıp kapanıyor ve
-- o ayar yönetim panelinden değiştirilemiyor. Artık hesabı
-- `isimle-giris` Edge Function'ı açıyor ve tek anahtar panel:
-- `ayar.giris_sistemi`.
--
-- İsimle açılmış hesabın işareti artık `is_anonymous` değil, iç adres
-- alanı: `<rastgele>@isim.tamisabet.tr`. Oyuncu profilini doğrulayınca
-- adres gerçek e-postasıyla değişir ve hesap kendiliğinden "doğrulanmış"
-- sayılır. Panelin iki fonksiyonu bu yüzden yeniden yazılıyor.
--
-- Tekrar çalıştırılabilir.

-- ---------------------------------------------------------------------------
-- 1. Kötüye kullanım sınırı için kayıt (yalnızca fonksiyon yazar/okur)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.isimle_giris_kaydi (
  id      bigserial PRIMARY KEY,
  -- Adresin SHA-256 özeti; düz adres saklanmıyor, bir günde siliniyor.
  ip_ozet text NOT NULL,
  zaman   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS isimle_giris_kaydi_ip_zaman ON public.isimle_giris_kaydi (ip_ozet, zaman);

ALTER TABLE public.isimle_giris_kaydi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.isimle_giris_kaydi FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. İsimle açılmış hesap mı? (tek tanım, panelin iki fonksiyonu kullanıyor)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.isimle_hesap_mi(eposta text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$ SELECT coalesce(eposta, '') LIKE '%@isim.tamisabet.tr' $$;

REVOKE EXECUTE ON FUNCTION public.isimle_hesap_mi(text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Panel fonksiyonları yeni işarete göre
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.yonetim_ozet()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  sonuc    jsonb;
  -- "Bugün" Türkiye saatiyle; sunucu saati UTC.
  gun_basi timestamptz := date_trunc('day', now() AT TIME ZONE 'Europe/Istanbul')
                          AT TIME ZONE 'Europe/Istanbul';
BEGIN
  IF NOT public.yonetici_mi() THEN
    RAISE EXCEPTION 'yetki yok' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'giris_sistemi', (SELECT deger #>> '{}' FROM public.ayar WHERE anahtar = 'giris_sistemi'),
    'oyuncu',        (SELECT count(*) FROM public.oyuncu),
    'isimle',        (SELECT count(*) FROM public.oyuncu o JOIN auth.users u ON u.id = o.id
                       WHERE public.isimle_hesap_mi(u.email)),
    'dogrulanmis',   (SELECT count(*) FROM public.oyuncu o JOIN auth.users u ON u.id = o.id
                       WHERE NOT public.isimle_hesap_mi(u.email)),
    'bugun_yeni',    (SELECT count(*) FROM public.oyuncu WHERE olusturuldu >= gun_basi),
    'bugun_tur',     (SELECT count(*) FROM public.tur_sonuc WHERE olusturuldu >= gun_basi),
    'toplam_tur',    (SELECT count(*) FROM public.tur_sonuc),
    'bugun_duello',  (SELECT count(*) FROM public.duello_mac WHERE basladi >= gun_basi)
  ) INTO sonuc;

  RETURN sonuc;
END;
$$;

CREATE OR REPLACE FUNCTION public.yonetim_oyuncular(adet int DEFAULT 50)
RETURNS TABLE (
  kullanici_adi text,
  gorunen_ad    text,
  olusturuldu   timestamptz,
  dogrulanmis   boolean,
  tur_sayisi    bigint,
  son_tur       timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.yonetici_mi() THEN
    RAISE EXCEPTION 'yetki yok' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT o.kullanici_adi, o.gorunen_ad, o.olusturuldu,
         NOT public.isimle_hesap_mi(u.email),
         (SELECT count(*) FROM public.tur_sonuc t WHERE t.oyuncu_id = o.id),
         (SELECT max(t.olusturuldu) FROM public.tur_sonuc t WHERE t.oyuncu_id = o.id)
  FROM public.oyuncu o
  LEFT JOIN auth.users u ON u.id = o.id
  ORDER BY o.olusturuldu DESC
  LIMIT least(greatest(adet, 1), 200);
END;
$$;

-- CREATE OR REPLACE yetkileri korur; yine de açıkça yazılıyor (bkz. 019).
REVOKE EXECUTE ON FUNCTION public.yonetim_ozet()         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.yonetim_oyuncular(int) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.yonetim_ozet()         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.yonetim_oyuncular(int) TO authenticated;
