-- 014 - Eşleştirme kuyruğuna oyun sütunu
--
-- CANLIDA UYGULANDI (9 Ekim 2026)
--
-- Kelime turu düelloya giriyor. Kuyrukta oyun bilgisi yoktu: sayı turu
-- bekleyen bir oyuncuyla kelime turu bekleyen bir oyuncu aynı seviyede
-- eşleşir ve biri yanlış oyunu oynardı.
--
-- Varsayılan 'sayi': kuyrukta şu an bekleyen satırların hepsi sayı
-- turuna ait.

ALTER TABLE duello_kuyruk
  ADD COLUMN IF NOT EXISTS oyun text NOT NULL DEFAULT 'sayi';

ALTER TABLE duello_kuyruk
  DROP CONSTRAINT IF EXISTS duello_kuyruk_oyun_check;
ALTER TABLE duello_kuyruk
  ADD CONSTRAINT duello_kuyruk_oyun_check CHECK (oyun IN ('sayi', 'kelime'));

-- Eşleştirme sorgusu oyun + seviye ile filtreliyor.
CREATE INDEX IF NOT EXISTS duello_kuyruk_oyun_seviye
  ON duello_kuyruk (oyun, seviye, girdi);
