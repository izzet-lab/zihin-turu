-- 013 - Rozetler: kazanılıyor ama hiçbir yerde görünmüyordu
--
-- CANLIDA UYGULANDI (9 Ekim 2026)
--
-- BULGU
-- Yardım ekranı beş seri rozeti vaat ediyor ("🏅 Günlük", "🏅 Üç Gün",
-- "🏅 Haftalık"…). Veritabanı bunlardan yalnızca üçünü (seri_7,
-- seri_30, seri_100) veriyordu ve hiçbiri hiçbir ekranda
-- gösterilmiyordu. Oyuncu kazandığını görmüyorsa rozet yoktur.
--
-- BU GÖÇ NE YAPIYOR
-- 1. Eksik seri rozetini ekliyor (seri_3).
-- 2. Beceri rozetleri: ilk tam isabet, 10 ve 100 tam isabet.
-- 3. Kelime turunu ilk oynayana rozet.
-- 4. Düello ve arena rozetleri — derece tabloları güncellenince
--    veriliyor; o tablolara yalnızca Edge Function yazıyor, yani
--    rozet de istemcinin eline geçmiyor (kural 2).
--
-- NEDEN TETİKLEYİCİDE
-- Rozet "oyun kuralı" değil, platformun ilerleme kaydı. Oyun paketine
-- koymak kuralı yanlış yere taşırdı; istemciye koymak hile kapısı
-- açardı. Verinin yazıldığı yerde veriliyor.

-- ---------------------------------------------------------------------
-- 1) Seri + beceri + kelime rozetleri: lig_guncelle içine eklendi
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lig_guncelle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  eski_en_iyi   int;
  fark          int;
  v_hafta       text;
  v_ay          text;
  onceki_seri   int;
  onceki_son    date;
  yeni_seri     int;
  xp_kazanc     int := 0;
  koruma_ay     text;
  v_tam_sayisi  int;
BEGIN
  v_hafta := to_char(NEW.tarih, 'IYYY"-W"IW');
  v_ay    := to_char(NEW.tarih, 'YYYY"-"MM');

  -- ===================== ROZETLER (mod fark etmez) =====================

  -- Kelime turunu ilk kez oynadı.
  IF NEW.oyun = 'kelime' THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'kelime_ilk')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;

  -- Tam isabet rozetleri. Sayım yalnızca tam isabette yapılıyor;
  -- her turda sayım yapmak gereksiz yük olurdu.
  IF NEW.uzaklik = 0 THEN
    SELECT count(*) INTO v_tam_sayisi
    FROM tur_sonuc
    WHERE oyuncu_id = NEW.oyuncu_id AND uzaklik = 0;

    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'tam_ilk')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;

    IF v_tam_sayisi >= 10 THEN
      INSERT INTO rozet (oyuncu_id, rozet_kodu)
      VALUES (NEW.oyuncu_id, 'tam_10')
      ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
    END IF;

    IF v_tam_sayisi >= 100 THEN
      INSERT INTO rozet (oyuncu_id, rozet_kodu)
      VALUES (NEW.oyuncu_id, 'tam_100')
      ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
    END IF;
  END IF;

  -- ===================== ANTRENMAN =====================
  IF NEW.mod = 'antrenman' THEN
    INSERT INTO lig_antrenman_hafta
      (hafta_anahtar, oyun, seviye, oyuncu_id, toplam_puan, tur_sayisi, guncellendi)
    VALUES
      (v_hafta, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, 1, now())
    ON CONFLICT (hafta_anahtar, oyun, seviye, oyuncu_id)
    DO UPDATE SET
      toplam_puan = lig_antrenman_hafta.toplam_puan + NEW.puan,
      tur_sayisi  = lig_antrenman_hafta.tur_sayisi + 1,
      guncellendi = now();

    UPDATE oyuncu SET xp = xp + NEW.puan WHERE id = NEW.oyuncu_id;

    RETURN NEW;
  END IF;

  -- ===================== GÜNÜN TURU =====================

  SELECT en_iyi_puan INTO eski_en_iyi
  FROM lig_gunluk
  WHERE tarih     = NEW.tarih
    AND oyun      = NEW.oyun
    AND seviye    = NEW.seviye
    AND oyuncu_id = NEW.oyuncu_id;

  IF eski_en_iyi IS NOT NULL AND NEW.puan <= eski_en_iyi THEN
    RETURN NEW;
  END IF;

  fark := NEW.puan - COALESCE(eski_en_iyi, 0);

  INSERT INTO lig_gunluk (tarih, oyun, seviye, oyuncu_id, en_iyi_puan, guncellendi)
  VALUES (NEW.tarih, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, now())
  ON CONFLICT (tarih, oyun, seviye, oyuncu_id)
  DO UPDATE SET
    en_iyi_puan = EXCLUDED.en_iyi_puan,
    guncellendi = now();

  INSERT INTO lig_donem
    (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id, toplam_puan, gun_sayisi, guncellendi)
  VALUES
    ('hafta', v_hafta, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, 1, now())
  ON CONFLICT (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id)
  DO UPDATE SET
    toplam_puan = lig_donem.toplam_puan + fark,
    gun_sayisi  = CASE WHEN eski_en_iyi IS NULL
                       THEN lig_donem.gun_sayisi + 1
                       ELSE lig_donem.gun_sayisi END,
    guncellendi = now();

  INSERT INTO lig_donem
    (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id, toplam_puan, gun_sayisi, guncellendi)
  VALUES
    ('ay', v_ay, NEW.oyun, NEW.seviye, NEW.oyuncu_id, NEW.puan, 1, now())
  ON CONFLICT (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id)
  DO UPDATE SET
    toplam_puan = lig_donem.toplam_puan + fark,
    gun_sayisi  = CASE WHEN eski_en_iyi IS NULL
                       THEN lig_donem.gun_sayisi + 1
                       ELSE lig_donem.gun_sayisi END,
    guncellendi = now();

  -- ===================== SERİ + XP =====================

  SELECT seri_gun, seri_son, seri_koruma_ay
  INTO onceki_seri, onceki_son, koruma_ay
  FROM oyuncu WHERE id = NEW.oyuncu_id;

  xp_kazanc := 10;

  IF onceki_son IS NULL THEN
    yeni_seri := 1;
  ELSIF onceki_son = NEW.tarih THEN
    yeni_seri := onceki_seri;
    xp_kazanc := 0;
  ELSIF onceki_son = NEW.tarih - 1 THEN
    yeni_seri := onceki_seri + 1;
  ELSIF onceki_son = NEW.tarih - 2 AND (koruma_ay IS NULL OR koruma_ay != v_ay) THEN
    yeni_seri := onceki_seri + 1;
    UPDATE oyuncu SET seri_koruma_ay = v_ay WHERE id = NEW.oyuncu_id;
  ELSE
    yeni_seri := 1;
  END IF;

  -- Seri rozetleri. Eşiğe ULAŞILDIYSA veriliyor (eşit değil): araya
  -- seri koruma girince gün atlanabiliyor ve "= 7" koşulu rozeti
  -- sessizce kaçırıyordu.
  IF yeni_seri >= 3 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'seri_3')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF yeni_seri >= 7 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'seri_7')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF yeni_seri >= 30 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'seri_30')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF yeni_seri >= 100 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu)
    VALUES (NEW.oyuncu_id, 'seri_100')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;

  -- Seri ödülleri: eşiğe ilk ulaşıldığında XP.
  IF yeni_seri = 3 AND (onceki_seri < 3 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 25;
  END IF;
  IF yeni_seri = 7 AND (onceki_seri < 7 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 75;
  END IF;
  IF yeni_seri = 30 AND (onceki_seri < 30 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 300;
  END IF;
  IF yeni_seri = 100 AND (onceki_seri < 100 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 1000;
  END IF;

  UPDATE oyuncu
  SET xp       = xp + xp_kazanc,
      seri_gun = yeni_seri,
      seri_son = NEW.tarih
  WHERE id = NEW.oyuncu_id;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- 2) Düello rozetleri
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.duello_rozet_ver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.galibiyet >= 1 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu) VALUES (NEW.oyuncu_id, 'duello_ilk')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF NEW.galibiyet >= 10 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu) VALUES (NEW.oyuncu_id, 'duello_10')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF NEW.galibiyet >= 50 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu) VALUES (NEW.oyuncu_id, 'duello_50')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS duello_rozet ON duello_derece;
CREATE TRIGGER duello_rozet
AFTER INSERT OR UPDATE ON duello_derece
FOR EACH ROW EXECUTE FUNCTION duello_rozet_ver();

-- ---------------------------------------------------------------------
-- 3) Arena rozetleri
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.arena_rozet_ver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.altin + NEW.gumus + NEW.bronz >= 1 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu) VALUES (NEW.oyuncu_id, 'arena_podyum')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF NEW.altin >= 1 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu) VALUES (NEW.oyuncu_id, 'arena_altin')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  IF NEW.altin >= 10 THEN
    INSERT INTO rozet (oyuncu_id, rozet_kodu) VALUES (NEW.oyuncu_id, 'arena_altin_10')
    ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS arena_rozet ON arena_derece;
CREATE TRIGGER arena_rozet
AFTER INSERT OR UPDATE ON arena_derece
FOR EACH ROW EXECUTE FUNCTION arena_rozet_ver();

-- Rozetler herkese açık: profil sayfasında görünüyorlar.
ALTER TABLE rozet ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rozet_oku ON rozet;
CREATE POLICY rozet_oku ON rozet FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON rozet FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) Geriye dönük doldurma
-- ---------------------------------------------------------------------
--
-- Tetikleyiciler yalnızca yeni kayıtlarda çalışır; bugüne kadar hak
-- edilmiş rozetler bir kez buradan veriliyor.
--
-- DİKKAT: `tur_sonuc` üzerinde sahte UPDATE YAPILMIYOR. O tablo
-- `lig_guncelle` tetikleyicisini çalıştırır ve XP ikinci kez yazılırdı.
-- Düello ve arena derece tablolarında böyle bir tehlike yok; oradaki
-- no-op UPDATE rozet mantığını tek yerde tutuyor.

INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT DISTINCT oyuncu_id, 'kelime_ilk' FROM tur_sonuc WHERE oyun = 'kelime'
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;

INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT oyuncu_id, 'tam_ilk' FROM tur_sonuc WHERE uzaklik = 0 GROUP BY oyuncu_id
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;

INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT oyuncu_id, 'tam_10' FROM tur_sonuc WHERE uzaklik = 0
GROUP BY oyuncu_id HAVING count(*) >= 10
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;

INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT oyuncu_id, 'tam_100' FROM tur_sonuc WHERE uzaklik = 0
GROUP BY oyuncu_id HAVING count(*) >= 100
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;

INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT id, 'seri_3' FROM oyuncu WHERE seri_gun >= 3
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT id, 'seri_7' FROM oyuncu WHERE seri_gun >= 7
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT id, 'seri_30' FROM oyuncu WHERE seri_gun >= 30
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
INSERT INTO rozet (oyuncu_id, rozet_kodu)
SELECT id, 'seri_100' FROM oyuncu WHERE seri_gun >= 100
ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;

UPDATE duello_derece SET oyuncu_id = oyuncu_id;
UPDATE arena_derece SET oyuncu_id = oyuncu_id;
