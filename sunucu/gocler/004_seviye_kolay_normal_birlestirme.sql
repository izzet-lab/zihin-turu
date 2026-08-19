-- Seviye birleştirmesi: 'kolay' -> 'normal'
-- Bölge: Frankfurt (eu-central-1)
--
-- 'kolay' ve 'normal' seviyeleri tek bir 'normal' seviyesinde birleştirildi.
-- Bu göç, mevcut kayıtlardaki 'kolay' değerini 'normal'e taşır.
--
-- DİKKAT: seviye sütunu üç lig tablosunda BİRİNCİL ANAHTARIN PARÇASIDIR.
-- Aynı oyuncunun aynı gün/hafta hem 'kolay' hem 'normal' kaydı varsa düz
-- bir UPDATE birincil anahtar çakışmasıyla patlar. Bu yüzden her tabloda
-- önce birleştirme (toplama/en iyi alma), sonra eski satırların silinmesi
-- yapılır.
--
-- Birleştirme kuralları:
--   lig_gunluk           -> en_iyi_puan: iki kaydın BÜYÜĞÜ (günün en iyisi)
--   lig_donem            -> toplam_puan ve gun_sayisi: TOPLAM
--   lig_antrenman_hafta  -> toplam_puan ve tur_sayisi: TOPLAM
--   tur_sonuc            -> seviye sütununda basit yeniden etiketleme
--
-- Çalıştırmadan önce yedek alınmalıdır (bkz. canlı güncelleme kuralları).

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Göç öncesi durum (kayda geçsin diye)
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM tur_sonuc WHERE seviye = 'kolay';
  RAISE NOTICE 'tur_sonuc kolay satiri: %', n;
  SELECT count(*) INTO n FROM lig_gunluk WHERE seviye = 'kolay';
  RAISE NOTICE 'lig_gunluk kolay satiri: %', n;
  SELECT count(*) INTO n FROM lig_donem WHERE seviye = 'kolay';
  RAISE NOTICE 'lig_donem kolay satiri: %', n;
  SELECT count(*) INTO n FROM lig_antrenman_hafta WHERE seviye = 'kolay';
  RAISE NOTICE 'lig_antrenman_hafta kolay satiri: %', n;
END $$;

-- ---------------------------------------------------------------------------
-- 1. tur_sonuc — ham tur geçmişi
-- Benzersizlik kısıtı (oyuncu_id, oyun, mod, tarih, tohum) seviyeyi
-- içermediği ve tohum değerleri seviyeye göre zaten farklı olduğu için
-- çakışma oluşmaz; düz güncelleme yeterlidir.
-- ---------------------------------------------------------------------------
UPDATE tur_sonuc SET seviye = 'normal' WHERE seviye = 'kolay';

-- ---------------------------------------------------------------------------
-- 2. lig_gunluk — günün en iyisi
-- Çakışan kayıtlarda en yüksek puan kazanır.
-- ---------------------------------------------------------------------------
UPDATE lig_gunluk h
SET en_iyi_puan = GREATEST(h.en_iyi_puan, k.en_iyi_puan),
    guncellendi = now()
FROM lig_gunluk k
WHERE k.seviye = 'kolay'
  AND h.seviye = 'normal'
  AND h.tarih = k.tarih
  AND h.oyun = k.oyun
  AND h.oyuncu_id = k.oyuncu_id;

-- Karşılığı olmayan 'kolay' satırları doğrudan 'normal' olur.
UPDATE lig_gunluk k
SET seviye = 'normal'
WHERE k.seviye = 'kolay'
  AND NOT EXISTS (
    SELECT 1 FROM lig_gunluk h
    WHERE h.seviye = 'normal' AND h.tarih = k.tarih
      AND h.oyun = k.oyun AND h.oyuncu_id = k.oyuncu_id
  );

-- Birleştirilmiş olanlar artık gereksiz.
DELETE FROM lig_gunluk WHERE seviye = 'kolay';

-- ---------------------------------------------------------------------------
-- 3. lig_donem — haftalık ve aylık toplamlar
-- ---------------------------------------------------------------------------
UPDATE lig_donem h
SET toplam_puan = h.toplam_puan + k.toplam_puan,
    gun_sayisi  = h.gun_sayisi + k.gun_sayisi,
    guncellendi = now()
FROM lig_donem k
WHERE k.seviye = 'kolay'
  AND h.seviye = 'normal'
  AND h.donem_tipi = k.donem_tipi
  AND h.donem_anahtar = k.donem_anahtar
  AND h.oyun = k.oyun
  AND h.oyuncu_id = k.oyuncu_id;

UPDATE lig_donem k
SET seviye = 'normal'
WHERE k.seviye = 'kolay'
  AND NOT EXISTS (
    SELECT 1 FROM lig_donem h
    WHERE h.seviye = 'normal' AND h.donem_tipi = k.donem_tipi
      AND h.donem_anahtar = k.donem_anahtar
      AND h.oyun = k.oyun AND h.oyuncu_id = k.oyuncu_id
  );

DELETE FROM lig_donem WHERE seviye = 'kolay';

-- ---------------------------------------------------------------------------
-- 4. lig_antrenman_hafta — haftalık antrenman toplamları
-- ---------------------------------------------------------------------------
UPDATE lig_antrenman_hafta h
SET toplam_puan = h.toplam_puan + k.toplam_puan,
    tur_sayisi  = h.tur_sayisi + k.tur_sayisi,
    guncellendi = now()
FROM lig_antrenman_hafta k
WHERE k.seviye = 'kolay'
  AND h.seviye = 'normal'
  AND h.hafta_anahtar = k.hafta_anahtar
  AND h.oyun = k.oyun
  AND h.oyuncu_id = k.oyuncu_id;

UPDATE lig_antrenman_hafta k
SET seviye = 'normal'
WHERE k.seviye = 'kolay'
  AND NOT EXISTS (
    SELECT 1 FROM lig_antrenman_hafta h
    WHERE h.seviye = 'normal' AND h.hafta_anahtar = k.hafta_anahtar
      AND h.oyun = k.oyun AND h.oyuncu_id = k.oyuncu_id
  );

DELETE FROM lig_antrenman_hafta WHERE seviye = 'kolay';

-- ---------------------------------------------------------------------------
-- 5. Günün Turu süre ayarı — 'kolay' anahtarı çıkarılır, süreler güncellenir
-- (SEVIYE_LISTESI ile aynı olmalı)
-- ---------------------------------------------------------------------------
UPDATE ayar
SET deger = '{"cocuk":60,"normal":60,"zor":75,"usta":90}'::jsonb
WHERE anahtar = 'gunun_turu_sure_sn';

COMMIT;

-- ---------------------------------------------------------------------------
-- Doğrulama (çalıştırdıktan sonra kontrol et):
--
--   SELECT 'tur_sonuc' t, seviye, count(*) FROM tur_sonuc GROUP BY seviye
--   UNION ALL SELECT 'lig_gunluk', seviye, count(*) FROM lig_gunluk GROUP BY seviye
--   UNION ALL SELECT 'lig_donem', seviye, count(*) FROM lig_donem GROUP BY seviye
--   UNION ALL SELECT 'lig_antrenman_hafta', seviye, count(*)
--     FROM lig_antrenman_hafta GROUP BY seviye;
--   -- Hiçbir satırda 'kolay' kalmamalı.
-- ---------------------------------------------------------------------------
