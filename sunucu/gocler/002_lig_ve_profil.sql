-- Faz 3B: Lig tabloları ve tetikleyici
-- Bölge: Frankfurt (eu-central-1)
-- Önce test ortamında, sonra canlıda çalıştırılır.
--
-- ÖNEMLİ: Bu dosyayı Supabase SQL editöründe çalıştır.
-- "Dosya repodadır" ≠ "Veritabanında çalıştırıldı" (bkz. R4 dersi).
-- Çalıştırdıktan sonra kontrol et:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN ('lig_gunluk','lig_donem');

-- ---------------------------------------------------------------------------
-- 1. Günlük lig tablosu
-- Her oyuncu, her gün, her seviye için EN İYİ tek maç saklanır.
-- Toplamı değil en iyiyi saklamak: çok oynayanı değil iyi oynayanı ödüllendirir.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lig_gunluk (
  tarih       date NOT NULL,
  oyun        text NOT NULL CHECK (oyun IN ('sayi', 'kelime')),
  seviye      text NOT NULL,
  oyuncu_id   uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  en_iyi_puan int  NOT NULL CHECK (en_iyi_puan >= 0),
  guncellendi timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tarih, oyun, seviye, oyuncu_id)
);

-- ---------------------------------------------------------------------------
-- 2. Dönem lig tablosu (haftalık ve aylık)
-- Haftalık: ISO hafta (Pazartesi başlar) — '2026-W34' gibi
-- Aylık: '2026-08' gibi
-- toplam_puan = o dönemdeki günlük EN İYİ maçların toplamı
-- gun_sayisi  = o dönemde kaç farklı gün oynandı
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lig_donem (
  donem_tipi    text NOT NULL CHECK (donem_tipi IN ('hafta', 'ay')),
  donem_anahtar text NOT NULL,       -- '2026-W34' veya '2026-08'
  oyun          text NOT NULL CHECK (oyun IN ('sayi', 'kelime')),
  seviye        text NOT NULL,
  oyuncu_id     uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  toplam_puan   int  NOT NULL CHECK (toplam_puan >= 0),
  gun_sayisi    int  NOT NULL CHECK (gun_sayisi >= 0),
  guncellendi   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id)
);

-- ---------------------------------------------------------------------------
-- 3. Tetikleyici: tur_sonuc'a yazılınca lig tablolarını güncelle
-- Yalnızca Günün Turu (mod = 'gunun') lige işler.
-- Antrenman puanları lig tablosuna girmez.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lig_guncelle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  eski_en_iyi   int;
  fark          int;
  hafta_anahtar text;
  ay_anahtar    text;
BEGIN
  -- Yalnızca Günün Turu
  IF NEW.mod != 'gunun' THEN
    RETURN NEW;
  END IF;

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

  -- Dönem toplamına eklenecek artış
  fark := NEW.puan - COALESCE(eski_en_iyi, 0);

  -- ISO hafta anahtarı: '2026-W34' gibi (iki haneli hafta numarası)
  hafta_anahtar := to_char(NEW.tarih, 'IYYY"-W"IW');
  -- Ay anahtarı: '2026-08' gibi
  ay_anahtar := to_char(NEW.tarih, 'YYYY"-"MM');

  -- Günlük en iyiyi upsert et (yeni satır veya güncelle)
  INSERT INTO lig_gunluk (tarih, oyun, seviye, oyuncu_id, en_iyi_puan, guncellendi)
  VALUES (NEW.tarih, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, now())
  ON CONFLICT (tarih, oyun, seviye, oyuncu_id)
  DO UPDATE SET
    en_iyi_puan = EXCLUDED.en_iyi_puan,
    guncellendi = now();

  -- Haftalık dönem: toplamı artır; ilk kez oynanıyorsa gün sayısını da artır
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

  RETURN NEW;
END;
$$;

-- Tetikleyiciyi tur_sonuc'a bağla
DROP TRIGGER IF EXISTS tur_sonuc_lig_guncelle ON tur_sonuc;
CREATE TRIGGER tur_sonuc_lig_guncelle
  AFTER INSERT ON tur_sonuc
  FOR EACH ROW EXECUTE FUNCTION lig_guncelle();

-- ---------------------------------------------------------------------------
-- 4. Satır düzeyi güvenlik (RLS)
-- Lig verileri herkese açık okunabilir; yalnızca tetikleyici yazar.
-- ---------------------------------------------------------------------------
ALTER TABLE lig_gunluk ENABLE ROW LEVEL SECURITY;
ALTER TABLE lig_donem  ENABLE ROW LEVEL SECURITY;

-- Herkes okur, hiç kimse doğrudan yazamaz (tetikleyici service role ile yazar)
DROP POLICY IF EXISTS lig_gunluk_herkes_okur ON lig_gunluk;
CREATE POLICY lig_gunluk_herkes_okur ON lig_gunluk FOR SELECT USING (true);

DROP POLICY IF EXISTS lig_donem_herkes_okur ON lig_donem;
CREATE POLICY lig_donem_herkes_okur ON lig_donem FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Doğrulama sorgusu: çalıştırdıktan sonra bu sorgu iki satır döndürmeli.
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN ('lig_gunluk','lig_donem');
-- ---------------------------------------------------------------------------
