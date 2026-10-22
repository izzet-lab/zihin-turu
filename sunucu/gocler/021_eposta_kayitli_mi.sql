-- 021 - `hesap-dogrula` için "bu e-posta başka hesapta mı?" sorusu (20 Ekim 2026)
--
-- Giriş servisi, alınmış bir adrese güncellemede yalnızca "Error
-- updating user" diyor; oyuncuya ne olduğunu söyleyemiyorduk. auth
-- şeması REST'e açık değil, bu yüzden soru bir fonksiyonla soruluyor.
--
-- YALNIZCA service_role çağırabilir: herkese açık olsaydı, adres adres
-- deneyerek kimin üye olduğu öğrenilebilirdi.

CREATE OR REPLACE FUNCTION public.eposta_kayitli_mi(eposta text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(eposta));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.eposta_kayitli_mi(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.eposta_kayitli_mi(text) TO service_role;
