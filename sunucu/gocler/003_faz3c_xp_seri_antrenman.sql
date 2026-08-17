-- Faz 3C: XP/seviye, seri ödülleri, antrenman ligi
-- Bölge: Frankfurt (eu-central-1)
-- Önce test ortamında, sonra canlıda çalıştırılır.
--
-- ÖNEMLİ: Bu dosyayı Supabase SQL editöründe çalıştır.
-- "Dosya repodadır" ≠ "Veritabanında çalıştırıldı" (bkz. R4 dersi).

-- ---------------------------------------------------------------------------
-- 1. Oyuncu tablosuna XP ve seri alanları ekle
-- ---------------------------------------------------------------------------
ALTER TABLE oyuncu ADD COLUMN IF NOT EXISTS xp int NOT NULL DEFAULT 0;
ALTER TABLE oyuncu ADD COLUMN IF NOT EXISTS seri_gun int NOT NULL DEFAULT 0;
ALTER TABLE oyuncu ADD COLUMN IF NOT EXISTS seri_son date;
ALTER TABLE oyuncu ADD COLUMN IF NOT EXISTS seri_koruma_ay text; -- '2026-08' gibi; ayda bir hak

-- ---------------------------------------------------------------------------
-- 2. Antrenman haftalık lig tablosu
-- Günlük en iyi yerine haftalık toplam — "Çalışkanlık tablosu".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lig_antrenman_hafta (
  hafta_anahtar text NOT NULL,       -- '2026-W34' gibi
  oyun          text NOT NULL CHECK (oyun IN ('sayi', 'kelime')),
  seviye        text NOT NULL,
  oyuncu_id     uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  toplam_puan   int  NOT NULL DEFAULT 0,
  tur_sayisi    int  NOT NULL DEFAULT 0,
  guncellendi   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hafta_anahtar, oyun, seviye, oyuncu_id)
);

ALTER TABLE lig_antrenman_hafta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lig_antrenman_herkes_okur ON lig_antrenman_hafta;
CREATE POLICY lig_antrenman_herkes_okur ON lig_antrenman_hafta FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 3. Rozet tablosu
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rozet (
  id            bigserial PRIMARY KEY,
  oyuncu_id     uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  rozet_kodu    text NOT NULL,
  kazanildi     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (oyuncu_id, rozet_kodu)
);

ALTER TABLE rozet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rozet_herkes_okur ON rozet;
CREATE POLICY rozet_herkes_okur ON rozet FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 4. Tetikleyiciyi güncelle — antrenman desteği + XP + seri
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lig_guncelle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  eski_en_iyi   int;
  fark          int;
  hafta_anahtar text;
  ay_anahtar    text;
  onceki_seri   int;
  onceki_son    date;
  yeni_seri     int;
  xp_kazanc     int := 0;
  koruma_ay     text;
BEGIN
  -- ISO hafta anahtarı
  hafta_anahtar := to_char(NEW.tarih, 'IYYY"-W"IW');
  ay_anahtar := to_char(NEW.tarih, 'YYYY"-"MM');

  -- ===================== ANTRENMAN =====================
  IF NEW.mod = 'antrenman' THEN
    -- Antrenman: haftalık toplama ekle (günlük en iyi yok)
    INSERT INTO lig_antrenman_hafta
      (hafta_anahtar, oyun, seviye, oyuncu_id, toplam_puan, tur_sayisi, guncellendi)
    VALUES
      (hafta_anahtar, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, 1, now())
    ON CONFLICT (hafta_anahtar, oyun, seviye, oyuncu_id)
    DO UPDATE SET
      toplam_puan = lig_antrenman_hafta.toplam_puan + NEW.puan,
      tur_sayisi  = lig_antrenman_hafta.tur_sayisi + 1,
      guncellendi = now();

    -- Antrenman XP: puan kadar XP kazanılır
    UPDATE oyuncu SET xp = xp + NEW.puan WHERE id = NEW.oyuncu_id;

    RETURN NEW;
  END IF;

  -- ===================== GÜNÜN TURU =====================

  -- Oyuncunun bu gün bu seviyedeki mevcut en iyisini bul
  SELECT en_iyi_puan INTO eski_en_iyi
  FROM lig_gunluk
  WHERE tarih     = NEW.tarih
    AND oyun      = NEW.oyun
    AND seviye    = NEW.seviye
    AND oyuncu_id = NEW.oyuncu_id;

  -- Yeni puan eskiyi geçmiyorsa lig değişmez; dur
  IF eski_en_iyi IS NOT NULL AND NEW.puan <= eski_en_iyi THEN
    RETURN NEW;
  END IF;

  fark := NEW.puan - COALESCE(eski_en_iyi, 0);

  -- Günlük en iyiyi upsert et
  INSERT INTO lig_gunluk (tarih, oyun, seviye, oyuncu_id, en_iyi_puan, guncellendi)
  VALUES (NEW.tarih, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, now())
  ON CONFLICT (tarih, oyun, seviye, oyuncu_id)
  DO UPDATE SET
    en_iyi_puan = EXCLUDED.en_iyi_puan,
    guncellendi = now();

  -- Haftalık dönem
  INSERT INTO lig_donem
    (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id, toplam_puan, gun_sayisi, guncellendi)
  VALUES
    ('hafta', hafta_anahtar, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, 1, now())
  ON CONFLICT (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id)
  DO UPDATE SET
    toplam_puan = lig_donem.toplam_puan + fark,
    gun_sayisi  = CASE WHEN eski_en_iyi IS NULL
                       THEN lig_donem.gun_sayisi + 1
                       ELSE lig_donem.gun_sayisi END,
    guncellendi = now();

  -- Aylık dönem
  INSERT INTO lig_donem
    (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id, toplam_puan, gun_sayisi, guncellendi)
  VALUES
    ('ay', ay_anahtar, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, 1, now())
  ON CONFLICT (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id)
  DO UPDATE SET
    toplam_puan = lig_donem.toplam_puan + fark,
    gun_sayisi  = CASE WHEN eski_en_iyi IS NULL
                       THEN lig_donem.gun_sayisi + 1
                       ELSE lig_donem.gun_sayisi END,
    guncellendi = now();

  -- ===================== SERİ + XP =====================

  -- Seri hesapla
  SELECT seri_gun, seri_son, seri_koruma_ay
  INTO onceki_seri, onceki_son, koruma_ay
  FROM oyuncu WHERE id = NEW.oyuncu_id;

  -- Başlangıç XP: Günün turunu tamamlama = +10 XP
  xp_kazanc := 10;

  IF onceki_son IS NULL THEN
    -- İlk kez oynuyor
    yeni_seri := 1;
  ELSIF onceki_son = NEW.tarih THEN
    -- Bugün zaten oynamış (ikinci gönderim); seriyi değiştirme
    yeni_seri := onceki_seri;
    xp_kazanc := 0; -- bugün zaten verildi
  ELSIF onceki_son = NEW.tarih - 1 THEN
    -- Dün oynamış, seri uzar
    yeni_seri := onceki_seri + 1;
  ELSIF onceki_son = NEW.tarih - 2 AND (koruma_ay IS NULL OR koruma_ay != ay_anahtar) THEN
    -- Bir gün kaçırmış ama seri koruma hakkı var (bu ay kullanılmadı)
    yeni_seri := onceki_seri + 1;
    -- Koruma hakkını bu ay için kullan
    UPDATE oyuncu SET seri_koruma_ay = ay_anahtar WHERE id = NEW.oyuncu_id;
  ELSE
    -- Seri kırıldı
    yeni_seri := 1;
  END IF;

  -- Seri ödülleri: milestone XP
  IF yeni_seri = 3 AND (onceki_seri < 3 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 25;
  END IF;
  IF yeni_seri = 7 AND (onceki_seri < 7 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 75;
    -- Haftalık rozeti
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'seri_7')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF yeni_seri = 30 AND (onceki_seri < 30 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 300;
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'seri_30')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF yeni_seri = 100 AND (onceki_seri < 100 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 1000;
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'seri_100')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;

  -- Oyuncu satırını güncelle: XP + seri
  UPDATE oyuncu
  SET xp       = xp + xp_kazanc,
      seri_gun = yeni_seri,
      seri_son = NEW.tarih
  WHERE id = NEW.oyuncu_id;

  RETURN NEW;
END;
$$;

-- Tetikleyiciyi yeniden bağla (fonksiyon güncellendi)
DROP TRIGGER IF EXISTS tur_sonuc_lig_guncelle ON tur_sonuc;
CREATE TRIGGER tur_sonuc_lig_guncelle
  AFTER INSERT ON tur_sonuc
  FOR EACH ROW EXECUTE FUNCTION lig_guncelle();

-- ---------------------------------------------------------------------------
-- Doğrulama sorguları (çalıştırdıktan sonra kontrol et):
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'oyuncu' AND column_name IN ('xp','seri_gun','seri_son','seri_koruma_ay');
--   -- 4 satır dönmeli
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN ('lig_antrenman_hafta','rozet');
--   -- 2 satır dönmeli
-- ---------------------------------------------------------------------------
