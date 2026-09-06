-- 008 - Duello: revans ve ozel oda
--
-- CANLIDA UYGULANDI (6 Eylül 2026): duello_revans_ve_oda

-- ---------------------------------------------------------------------------
-- 1. Rövanş: bir maçtan yalnızca BİR rövanş açılabilir
--
-- İki oyuncu da aynı anda "rövanş" derse iki ayrı maç kurulurdu — düello
-- eşleştirmesinde yaşadığımız yarışın aynısı (bkz. CHANGELOG, 6 Eylül).
-- Orada simetriyi kırarak çözdük; burada veritabanı kısıtı daha basit:
-- ikinci ekleme reddedilir, reddedilen taraf var olan maça katılır.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS duello_mac_revans_tek
  ON duello_mac (revans_kaynak)
  WHERE revans_kaynak IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Özel oda
--
-- Oda, maçın kendisi DEĞİL: maç ancak iki taraf belli olunca kurulur
-- (duello_mac kısıtı "ya gerçek rakip ya bot" diyor, boş bekleyen maç
-- olamaz). Oda, arkadaşın koda girmesini bekleyen ayrı bir kayıt.
--
-- Kod kısa ve okunur; telefonda sesli söylenebilmeli.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duello_oda (
  kod        text PRIMARY KEY,
  kuran      uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  seviye     text NOT NULL,
  -- Arkadaş katılınca kurulan maç; katılana kadar NULL.
  mac_id     uuid REFERENCES duello_mac(id) ON DELETE SET NULL,
  olusturuldu timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duello_oda_kod_bicim CHECK (kod ~ '^[A-Z0-9]{5}$')
);

CREATE INDEX IF NOT EXISTS duello_oda_kuran ON duello_oda (kuran, olusturuldu DESC);

ALTER TABLE duello_oda ENABLE ROW LEVEL SECURITY;

-- Odayı yalnızca kuran görebilir. Kodu bilen zaten Edge Function
-- üzerinden katılıyor; oda listesinin herkese açık olması, kod
-- denemesiyle yabancı odalara girmenin yolunu açardı.
DROP POLICY IF EXISTS duello_oda_kuran_okur ON duello_oda;
CREATE POLICY duello_oda_kuran_okur ON duello_oda
  FOR SELECT USING (kuran = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON duello_oda FROM anon, authenticated;

-- Bekleyen oda sonsuza kadar durmasın: yarım saatte bir ölür.
CREATE OR REPLACE FUNCTION duello_oda_temizle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  silinen integer;
BEGIN
  DELETE FROM duello_oda
  WHERE mac_id IS NULL AND olusturuldu < now() - interval '30 minutes';
  GET DIAGNOSTICS silinen = ROW_COUNT;
  RETURN silinen;
END;
$$;

-- Postgres yeni fonksiyona EXECUTE hakkını PUBLIC'e otomatik verir;
-- önce ondan alınmalı (006'da bu atlanmıştı, denetim yakalamıştı).
REVOKE EXECUTE ON FUNCTION duello_oda_temizle() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION duello_oda_temizle() FROM anon, authenticated;
