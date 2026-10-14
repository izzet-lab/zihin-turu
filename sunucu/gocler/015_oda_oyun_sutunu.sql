-- 015 - Özel odaya oyun sütunu
--
-- Kelime turu düellosunda rövanşa basınca SAYI TURU açılıyordu
-- (14 Ekim 2026, proje sahibi cihazda buldu). Sebep: yeni maç
-- kurulurken oyun bilgisi taşınmıyordu, maç satırına her zaman 'sayi'
-- yazılıyordu.
--
-- Rövanş için veritabanı değişikliği gerekmiyordu — eski maçın `oyun`
-- alanı zaten duruyor, yalnızca okunmuyordu. Ama AYNI kusur özel odada
-- da vardı ve orada okunacak bir yer yoktu: `duello_oda` tablosu
-- seviyeyi saklıyor, oyunu saklamıyordu. Kelime turundan kurulan bir
-- oda, arkadaş katıldığında sayı turu maçı açıyordu.
--
-- Varsayılan 'sayi': şu an bekleyen odaların hepsi sayı turuna ait.
-- (Göç 014 kuyruk tablosuna aynı sütunu aynı sebeple eklemişti.)

ALTER TABLE duello_oda
  ADD COLUMN IF NOT EXISTS oyun text NOT NULL DEFAULT 'sayi';

ALTER TABLE duello_oda
  DROP CONSTRAINT IF EXISTS duello_oda_oyun_check;
ALTER TABLE duello_oda
  ADD CONSTRAINT duello_oda_oyun_check CHECK (oyun IN ('sayi', 'kelime'));
