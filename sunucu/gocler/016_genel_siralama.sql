-- 016 - Genel sıralama: iki oyunun toplamı
--
-- NEDEN
-- Sıralamalar oyun ve seviye başına ayrıydı. İyi bir sayı oyuncusu ile
-- iyi bir kelime oyuncusu hiçbir tabloda karşılaşmıyordu ve "iki alanda
-- birden iyi olmak" hiçbir şey kazandırmıyordu. Genel tablo bunu
-- ölçüyor: o günün sayı Günün Turu puanı + o günün kelime Günün Turu
-- puanı.
--
-- SEVİYE AĞIRLIĞI YALNIZCA BURADA
-- Genel tablo seviyeden bağımsız: Usta oynayan ile Isınma oynayan aynı
-- listede. Ağırlıksız bıraksak Isınma'da oynamak en kârlı strateji
-- olurdu. Seviye bazlı tablolar ağırlıksız kalmaya devam ediyor —
-- orada zaten herkes aynı seviyede.
--
--   Isınma (cocuk) x0.6   Normal x1.0   Zor x1.4   Usta x1.8
--
-- Bu ağırlıklar arayüzde de yazılı (`paketler/cekirdek/src/lig.ts`).
-- İkisi ayrışırsa oyuncuya söylenen hesapla tabloya yazılan hesap
-- farklı olur; `testler/lig-genel.test.ts` arayüz tarafını kilitliyor.
--
-- ÇİFTE TUR BONUSU
-- Aynı gün iki oyunu da tamamlayana o günün toplamına %25. Tek oyun
-- oynayan cezalandırılmıyor; ikisini birden oynayan ödüllendiriliyor.
--
-- NEDEN YENİDEN HESAPLANIYOR, ARTTIRILMIYOR
-- Mevcut lig tetikleyicisi dönem toplamını fark ekleyerek güncelliyor.
-- Bonus devreye girince bu yöntem kırılıyor: ikinci oyun oynandığında
-- yalnızca kendi puanı değil, önceki günün bonusu da değişiyor. Genel
-- satır bu yüzden her seferinde `lig_gunluk`'tan SIFIRDAN kuruluyor.
-- Hesap bir gün için en fazla birkaç satır okuyor ve kendi kendini
-- düzeltiyor: yanlış bir ara durum kalıcı olamıyor.

-- ---------------------------------------------------------------------------
-- 1. Günlük genel tablo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lig_genel_gunluk (
  tarih       date NOT NULL,
  oyuncu_id   uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  -- Ağırlık uygulanmış hâlleri; dağılım çubuğu bunları gösteriyor.
  sayi_puan   int  NOT NULL DEFAULT 0 CHECK (sayi_puan >= 0),
  kelime_puan int  NOT NULL DEFAULT 0 CHECK (kelime_puan >= 0),
  bonus       int  NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  toplam_puan int  NOT NULL DEFAULT 0 CHECK (toplam_puan >= 0),
  guncellendi timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tarih, oyuncu_id)
);

CREATE INDEX IF NOT EXISTS lig_genel_gunluk_siralama
  ON lig_genel_gunluk (tarih, toplam_puan DESC);

-- ---------------------------------------------------------------------------
-- 2. Dönem genel tablosu (haftalık ve aylık)
-- Mevcut mantıkla aynı: günlük genel puanların toplamı.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lig_genel_donem (
  donem_tipi    text NOT NULL CHECK (donem_tipi IN ('hafta', 'ay')),
  donem_anahtar text NOT NULL,
  oyuncu_id     uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  sayi_puan     int  NOT NULL DEFAULT 0 CHECK (sayi_puan >= 0),
  kelime_puan   int  NOT NULL DEFAULT 0 CHECK (kelime_puan >= 0),
  bonus         int  NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  toplam_puan   int  NOT NULL DEFAULT 0 CHECK (toplam_puan >= 0),
  gun_sayisi    int  NOT NULL DEFAULT 0 CHECK (gun_sayisi >= 0),
  guncellendi   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (donem_tipi, donem_anahtar, oyuncu_id)
);

CREATE INDEX IF NOT EXISTS lig_genel_donem_siralama
  ON lig_genel_donem (donem_tipi, donem_anahtar, toplam_puan DESC);

-- ---------------------------------------------------------------------------
-- 3. Seviye ağırlığı
-- Bilinmeyen seviye 1.0 sayılıyor: yeni bir seviye eklenip bu
-- fonksiyon unutulursa puan kaybolmasın, yalnızca ağırlıksız kalsın.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lig_seviye_agirligi(p_seviye text)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_seviye
           WHEN 'cocuk'  THEN 0.6
           WHEN 'normal' THEN 1.0
           WHEN 'zor'    THEN 1.4
           WHEN 'usta'   THEN 1.8
           ELSE 1.0
         END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Bir oyuncunun bir gününü sıfırdan hesapla
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lig_genel_yenile(p_tarih date, p_oyuncu uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sayi        int;
  v_kelime      int;
  v_bonus       int;
  v_toplam      int;
  hafta_anahtar text;
  ay_anahtar    text;
BEGIN
  -- Oyun başına O GÜNÜN EN İYİSİ, ağırlık uygulanmış hâliyle.
  --
  -- Günün Turu günde bir hak ama seviye kilidi istemcide; aynı gün
  -- birden çok seviyede satır oluşursa en iyisi sayılıyor. Böylece
  -- tablo her durumda tanımlı kalıyor.
  SELECT COALESCE(MAX(ROUND(en_iyi_puan * lig_seviye_agirligi(seviye))), 0)
    INTO v_sayi
  FROM lig_gunluk
  WHERE tarih = p_tarih AND oyuncu_id = p_oyuncu AND oyun = 'sayi';

  SELECT COALESCE(MAX(ROUND(en_iyi_puan * lig_seviye_agirligi(seviye))), 0)
    INTO v_kelime
  FROM lig_gunluk
  WHERE tarih = p_tarih AND oyuncu_id = p_oyuncu AND oyun = 'kelime';

  -- Çifte tur bonusu: iki oyun da oynanmışsa toplamın %25'i.
  IF v_sayi > 0 AND v_kelime > 0 THEN
    v_bonus := ROUND((v_sayi + v_kelime) * 0.25);
  ELSE
    v_bonus := 0;
  END IF;

  v_toplam := v_sayi + v_kelime + v_bonus;

  IF v_toplam = 0 THEN
    DELETE FROM lig_genel_gunluk WHERE tarih = p_tarih AND oyuncu_id = p_oyuncu;
  ELSE
    INSERT INTO lig_genel_gunluk
      (tarih, oyuncu_id, sayi_puan, kelime_puan, bonus, toplam_puan, guncellendi)
    VALUES (p_tarih, p_oyuncu, v_sayi, v_kelime, v_bonus, v_toplam, now())
    ON CONFLICT (tarih, oyuncu_id) DO UPDATE SET
      sayi_puan   = EXCLUDED.sayi_puan,
      kelime_puan = EXCLUDED.kelime_puan,
      bonus       = EXCLUDED.bonus,
      toplam_puan = EXCLUDED.toplam_puan,
      guncellendi = now();
  END IF;

  hafta_anahtar := to_char(p_tarih, 'IYYY"-W"IW');
  ay_anahtar    := to_char(p_tarih, 'YYYY"-"MM');

  -- Dönem satırları da sıfırdan: günlük genel satırların toplamı.
  -- En fazla otuz bir satır okunuyor, karşılığında drift riski sıfır.
  INSERT INTO lig_genel_donem
    (donem_tipi, donem_anahtar, oyuncu_id,
     sayi_puan, kelime_puan, bonus, toplam_puan, gun_sayisi, guncellendi)
  SELECT 'hafta', hafta_anahtar, p_oyuncu,
         COALESCE(SUM(sayi_puan), 0), COALESCE(SUM(kelime_puan), 0),
         COALESCE(SUM(bonus), 0), COALESCE(SUM(toplam_puan), 0),
         COUNT(*), now()
  FROM lig_genel_gunluk
  WHERE oyuncu_id = p_oyuncu AND to_char(tarih, 'IYYY"-W"IW') = hafta_anahtar
  ON CONFLICT (donem_tipi, donem_anahtar, oyuncu_id) DO UPDATE SET
    sayi_puan   = EXCLUDED.sayi_puan,
    kelime_puan = EXCLUDED.kelime_puan,
    bonus       = EXCLUDED.bonus,
    toplam_puan = EXCLUDED.toplam_puan,
    gun_sayisi  = EXCLUDED.gun_sayisi,
    guncellendi = now();

  INSERT INTO lig_genel_donem
    (donem_tipi, donem_anahtar, oyuncu_id,
     sayi_puan, kelime_puan, bonus, toplam_puan, gun_sayisi, guncellendi)
  SELECT 'ay', ay_anahtar, p_oyuncu,
         COALESCE(SUM(sayi_puan), 0), COALESCE(SUM(kelime_puan), 0),
         COALESCE(SUM(bonus), 0), COALESCE(SUM(toplam_puan), 0),
         COUNT(*), now()
  FROM lig_genel_gunluk
  WHERE oyuncu_id = p_oyuncu AND to_char(tarih, 'YYYY"-"MM') = ay_anahtar
  ON CONFLICT (donem_tipi, donem_anahtar, oyuncu_id) DO UPDATE SET
    sayi_puan   = EXCLUDED.sayi_puan,
    kelime_puan = EXCLUDED.kelime_puan,
    bonus       = EXCLUDED.bonus,
    toplam_puan = EXCLUDED.toplam_puan,
    gun_sayisi  = EXCLUDED.gun_sayisi,
    guncellendi = now();
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Tetikleyici: lig_gunluk değişince genel satırı yenile
--
-- tur_sonuc'a değil lig_gunluk'a bağlı. Sebebi sıra: mevcut lig
-- tetikleyicisi de tur_sonuc'a bağlı ve iki tetikleyicinin hangisinin
-- önce çalışacağı ada göre belirleniyor. Genel satır lig_gunluk'tan
-- okuduğu için o satır yazılmadan hesaplanamaz. lig_gunluk'a bağlamak
-- sırayı tartışmasız yapıyor.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lig_genel_tetik()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM lig_genel_yenile(NEW.tarih, NEW.oyuncu_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lig_gunluk_genel_guncelle ON lig_gunluk;
CREATE TRIGGER lig_gunluk_genel_guncelle
  AFTER INSERT OR UPDATE ON lig_gunluk
  FOR EACH ROW EXECUTE FUNCTION lig_genel_tetik();

-- ---------------------------------------------------------------------------
-- 6. Satır düzeyi güvenlik
-- Lig verisi herkese açık okunur; yalnızca tetikleyici yazar.
-- ---------------------------------------------------------------------------
ALTER TABLE lig_genel_gunluk ENABLE ROW LEVEL SECURITY;
ALTER TABLE lig_genel_donem  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lig_genel_gunluk_herkes_okur ON lig_genel_gunluk;
CREATE POLICY lig_genel_gunluk_herkes_okur ON lig_genel_gunluk FOR SELECT USING (true);

DROP POLICY IF EXISTS lig_genel_donem_herkes_okur ON lig_genel_donem;
CREATE POLICY lig_genel_donem_herkes_okur ON lig_genel_donem FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 7. Geçmiş veriyi doldur
-- Tablo bugün kuruluyor ama lig_gunluk'ta geçmiş var; genel tablo boş
-- açılırsa eski oyuncular sıralamada yokmuş gibi görünür.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT tarih, oyuncu_id FROM lig_gunluk LOOP
    PERFORM lig_genel_yenile(r.tarih, r.oyuncu_id);
  END LOOP;
END;
$$;
