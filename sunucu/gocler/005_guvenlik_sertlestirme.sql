-- 005 - Guvenlik sertlestirmesi (31 Agustos 2026)
-- Canlida uygulandi: guvenlik_sertlestirme_oyuncu_ve_tetikleyici
-- Bulgular QA denetiminde cikti; ayrinti CHANGELOG.md'de.

-- 1) oyuncu tablosunda xp/seri sunucu (lig_guncelle) tarafindan yazilir
--    ama RLS kullanicinin kendi satirini guncellemesine izin veriyordu:
--    REST uzerinden xp = 999999 yazilabilirdi. RLS satir bazlidir,
--    sutun ayrimi GRANT ile yapilir.
REVOKE INSERT, UPDATE ON public.oyuncu FROM anon, authenticated;
GRANT INSERT (id, kullanici_adi, gorunen_ad) ON public.oyuncu TO authenticated;
-- kullanici_adi bilerek disarida: tasarim geregi bir kerelik secilir.
GRANT UPDATE (gorunen_ad) ON public.oyuncu TO authenticated;

-- 2) Ad bicim denetimi yalnizca tarayicidaydi; bu adlar lig tablosunda
--    ve herkese acik profillerde gorunuyor.
ALTER TABLE public.oyuncu
  ADD CONSTRAINT oyuncu_kullanici_adi_bicim
  CHECK (char_length(kullanici_adi) BETWEEN 3 AND 16
         AND kullanici_adi !~ '[[:space:][:cntrl:]]');

ALTER TABLE public.oyuncu
  ADD CONSTRAINT oyuncu_gorunen_ad_bicim
  CHECK (gorunen_ad IS NULL
         OR (char_length(gorunen_ad) BETWEEN 1 AND 32 AND gorunen_ad !~ '[[:cntrl:]]'));

-- 3) SECURITY DEFINER fonksiyonda search_path ayarli degildi
--    (yetki yukseltme yolu).
ALTER FUNCTION public.lig_guncelle() SET search_path = public, pg_temp;

-- 4) Tetikleyici fonksiyonu /rest/v1/rpc uzerinden cagrilabiliyordu.
--    Tetikleyici calisirken EXECUTE izni aranmaz; tetikleme guvende.
REVOKE EXECUTE ON FUNCTION public.lig_guncelle() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lig_guncelle() FROM anon;
REVOKE EXECUTE ON FUNCTION public.lig_guncelle() FROM authenticated;
