-- 012 - Antrenman turları kaydedilmiyordu (belirsiz sütun adı)
--
-- CANLIDA UYGULANDI (8 Ekim 2026)
--
-- BULGU
-- 18 Ağustos 2026'dan beri hiçbir antrenman turu veritabanına
-- işlenmiyordu. Günün Turu çalışıyordu, antrenman çalışmıyordu:
-- `tur_sonuc` satırı yazılmaya çalışılıyor, tetikleyici hata veriyor
-- ve ekleme geri alınıyordu. Oyuncuya "sunucu hatası" bile
-- görünmüyordu çünkü istemci sessizce devam ediyor. Sonuç:
-- çalışkanlık tablosu ve antrenman XP'si yaklaşık yedi haftadır
-- hiç güncellenmedi.
--
-- SEBEBİ
-- `lig_guncelle` içinde `hafta_anahtar` adında bir PL/pgSQL değişkeni
-- var ve `lig_antrenman_hafta` tablosunda AYNI ADDA bir sütun var.
-- `ON CONFLICT (hafta_anahtar, ...)` yazıldığında Postgres hangisinin
-- kastedildiğini bilemiyor ve 42702 (ambiguous_column) veriyor.
--
-- Günün Turu'nun etkilenmemesinin sebebi, oradaki ON CONFLICT
-- listelerinde (tarih / donem_anahtar) aynı adda bir değişken
-- olmaması.
--
-- ÇÖZÜM
-- Değişkenler `v_` önekiyle yeniden adlandırıldı. Fonksiyonun mantığı
-- aynı; yalnızca adlar değişti.

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
BEGIN
  v_hafta := to_char(NEW.tarih, 'IYYY"-W"IW');
  v_ay    := to_char(NEW.tarih, 'YYYY"-"MM');

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

    -- Antrenman XP: puan kadar XP kazanılır
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

  IF yeni_seri = 3 AND (onceki_seri < 3 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 25;
  END IF;
  IF yeni_seri = 7 AND (onceki_seri < 7 OR onceki_son != NEW.tarih) THEN
    xp_kazanc := xp_kazanc + 75;
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

  UPDATE oyuncu
  SET xp       = xp + xp_kazanc,
      seri_gun = yeni_seri,
      seri_son = NEW.tarih
  WHERE id = NEW.oyuncu_id;

  RETURN NEW;
END;
$function$;
