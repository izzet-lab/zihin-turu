-- 019 - Yönetim paneli ve isimle giriş (20 Ekim 2026)
--
-- NE GETİRİYOR
-- 1. `yonetici` tablosu: /yonetim panelini kimin açabileceği. Yetki
--    tarayıcıda değil burada denetleniyor; panelin her işi aşağıdaki
--    SECURITY DEFINER fonksiyonlardan geçiyor ve her biri önce
--    "çağıran yönetici mi?" diye bakıyor.
-- 2. `ayar.giris_sistemi`: giriş ekranının hangi kipte açılacağı.
--      sistem1 = e-posta + parola + Google (eski ekran)
--      sistem2 = yalnızca isim yazıp başlama (varsayılan)
--    Sistem 2'de hesap Supabase'in anonim oturumuyla açılıyor; oyuncu
--    sonradan profilinde e-posta + parola ekleyip hesabı kalıcı yapabiliyor.
-- 3. Panel için özet ve oyuncu listesi.
--
-- NEDEN PLPGSQL
-- Fonksiyonlar `auth.users.is_anonymous` sütununu okuyor. SQL dilindeki
-- fonksiyon gövdesi yaratılırken denetlenir; göç denemesinin asgari
-- auth iskeletinde bu sütun yok. PL/pgSQL gövdesi çalışırken çözülür.
--
-- Tekrar çalıştırılabilir: her adım IF NOT EXISTS / OR REPLACE /
-- ON CONFLICT ile yazıldı.

-- ---------------------------------------------------------------------------
-- 1. Yöneticiler
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.yonetici (
  kullanici_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  eklendi      timestamptz NOT NULL DEFAULT now()
);

-- RLS açık, ilke yok: tabloyu kimse doğrudan okuyamaz ya da yazamaz.
-- Yönetici eklemek yalnızca veritabanından (service role / psql).
ALTER TABLE public.yonetici ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.yonetici FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.yonetici_mi()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.yonetici WHERE kullanici_id = auth.uid());
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Giriş sistemi ayarı
-- ---------------------------------------------------------------------------
-- `ayar` herkese okunur (göç 001); istemci kipi buradan öğreniyor.
INSERT INTO public.ayar (anahtar, deger)
VALUES ('giris_sistemi', '"sistem2"'::jsonb)
ON CONFLICT (anahtar) DO NOTHING;

CREATE OR REPLACE FUNCTION public.yonetim_giris_sistemi_yaz(sistem text)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.yonetici_mi() THEN
    RAISE EXCEPTION 'yetki yok' USING ERRCODE = '42501';
  END IF;
  IF sistem NOT IN ('sistem1', 'sistem2') THEN
    RAISE EXCEPTION 'gecersiz sistem: %', sistem USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ayar (anahtar, deger)
  VALUES ('giris_sistemi', to_jsonb(sistem))
  ON CONFLICT (anahtar) DO UPDATE SET deger = EXCLUDED.deger;

  RETURN sistem;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Panel özeti ve oyuncu listesi
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
                       WHERE u.is_anonymous),
    'dogrulanmis',   (SELECT count(*) FROM public.oyuncu o JOIN auth.users u ON u.id = o.id
                       WHERE NOT u.is_anonymous),
    'bugun_yeni',    (SELECT count(*) FROM public.oyuncu
                       WHERE olusturuldu >= gun_basi),
    'bugun_tur',     (SELECT count(*) FROM public.tur_sonuc
                       WHERE olusturuldu >= gun_basi),
    'toplam_tur',    (SELECT count(*) FROM public.tur_sonuc),
    'bugun_duello',  (SELECT count(*) FROM public.duello_mac
                       WHERE basladi >= gun_basi)
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

  -- E-posta bilerek dönmüyor: panelde gerekmiyor, gerekmeyen kişisel
  -- veri ekrana çıkmasın (KVKK veri minimizasyonu).
  RETURN QUERY
  SELECT o.kullanici_adi, o.gorunen_ad, o.olusturuldu,
         NOT coalesce(u.is_anonymous, false),
         (SELECT count(*) FROM public.tur_sonuc t WHERE t.oyuncu_id = o.id),
         (SELECT max(t.olusturuldu) FROM public.tur_sonuc t WHERE t.oyuncu_id = o.id)
  FROM public.oyuncu o
  LEFT JOIN auth.users u ON u.id = o.id
  ORDER BY o.olusturuldu DESC
  LIMIT least(greatest(adet, 1), 200);
END;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler: Postgres yeni fonksiyona PUBLIC'e EXECUTE verir (bkz. göç 006).
-- Yalnızca giriş yapmış kullanıcı çağırabilsin; yönetici denetimi içeride.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.yonetici_mi()                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.yonetim_giris_sistemi_yaz(text)  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.yonetim_ozet()                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.yonetim_oyuncular(int)           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.yonetici_mi()                    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.yonetim_giris_sistemi_yaz(text)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.yonetim_ozet()                   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.yonetim_oyuncular(int)           TO authenticated;
