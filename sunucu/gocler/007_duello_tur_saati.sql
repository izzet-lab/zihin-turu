-- 007 - Duello: aktif tur ve tur saati
--
-- NEDEN GEREKLİ
-- 006'da maçın hangi turda olduğu ve turun ne zaman başladığı yoktu.
-- O bilgi olmadan "süre doldu" kararını yalnızca istemci verebilirdi —
-- yani oyuncu turu istediği kadar uzatabilir ya da rakibi lehine erken
-- kapatabilirdi (kural 2: istemciye güvenilmez).
--
-- Bu iki sütunla süre kararını sunucu veriyor: turun başlangıcı burada
-- yazılı, seviyenin süresi oyun paketinde. İkisi karşılaştırılır.
--
-- CANLIDA UYGULANDI (6 Eylül 2026): duello_tur_saati

ALTER TABLE duello_mac
  ADD COLUMN IF NOT EXISTS aktif_tur  smallint     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tur_basladi timestamptz NOT NULL DEFAULT now();

ALTER TABLE duello_mac
  DROP CONSTRAINT IF EXISTS duello_mac_aktif_tur;

ALTER TABLE duello_mac
  ADD CONSTRAINT duello_mac_aktif_tur CHECK (aktif_tur BETWEEN 1 AND 5);
