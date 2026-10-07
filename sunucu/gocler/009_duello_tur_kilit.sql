-- 009 - Duello: turu erken kapatan "kilit"
--
-- NEDEN GEREKLİ
-- Tam isabet bulamayan oyuncu "Bitir"e bastığında hiçbir şey olmuyordu:
-- tur, süresi dolana kadar açık kalıyordu. Oyuncu ekrana bakıp bekliyor,
-- "çalışmıyor" sanıyordu.
--
-- Kural değişmiyor: tam isabet turu ANINDA kapatır, yaklaşık cevap
-- kapatmaz. Ama İKİ TARAF DA cevabını kilitlediyse beklenecek kimse
-- kalmaz; tur orada biter ve en yakın olan kazanır.
--
-- Bot her zaman kilitli yazılır: botun hamlesi tek seferliktir, sonradan
-- iyileştirmez.
--
-- CANLIDA UYGULANDI (7 Ekim 2026): duello_tur_kilit

ALTER TABLE duello_tur
  ADD COLUMN IF NOT EXISTS kilitli boolean NOT NULL DEFAULT false;
