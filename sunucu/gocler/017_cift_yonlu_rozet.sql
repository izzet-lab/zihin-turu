-- 017 - "Çift Yönlü" rozeti
--
-- NEDEN
-- Genel sıralama "iki alanda birden iyi ol" diyor; rozet aynı şeyi
-- alışkanlık tarafından söylüyor. Yedi gün üst üste İKİ turu da
-- tamamlayana veriliyor.
--
-- NEDEN lig_genel_gunluk'tan OKUNUYOR
-- "O gün iki oyun da oynandı mı?" sorusunun cevabı zaten orada:
-- sayi_puan ve kelime_puan ikisi de sıfırdan büyükse o gün çifte tur
-- günü. Ayrı bir sayaç tutmak aynı bilgiyi ikinci kez saklamak olurdu
-- ve ikisi ayrışabilirdi.
--
-- EŞİĞE ULAŞMAK YETİYOR, EŞİT OLMAK DEĞİL
-- Mevcut seri rozetlerindeki kuralla aynı: yedi günün hepsi çifte tur
-- günüyse rozet veriliyor; daha uzun bir seride de duruyor.

-- lig_genel_yenile'ye rozet denetimi ekleniyor. Fonksiyonun gövdesi
-- 016 ile aynı; yalnızca sonuna rozet bloğu kondu.
CREATE OR REPLACE FUNCTION lig_genel_yenile(p_tarih date, p_oyuncu uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sayi        int;
  v_kelime      int;
  v_bonus       int;
  v_toplam      int;
  v_cifte_gun   int;
  hafta_anahtar text;
  ay_anahtar    text;
BEGIN
  SELECT COALESCE(MAX(ROUND(en_iyi_puan * lig_seviye_agirligi(seviye))), 0)
    INTO v_sayi
  FROM lig_gunluk
  WHERE tarih = p_tarih AND oyuncu_id = p_oyuncu AND oyun = 'sayi';

  SELECT COALESCE(MAX(ROUND(en_iyi_puan * lig_seviye_agirligi(seviye))), 0)
    INTO v_kelime
  FROM lig_gunluk
  WHERE tarih = p_tarih AND oyuncu_id = p_oyuncu AND oyun = 'kelime';

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

  -- ÇİFT YÖNLÜ ROZETİ
  -- Bugünü de kapsayan son yedi günün HEPSİ çifte tur günü mü?
  IF v_sayi > 0 AND v_kelime > 0 THEN
    SELECT COUNT(*) INTO v_cifte_gun
    FROM lig_genel_gunluk
    WHERE oyuncu_id = p_oyuncu
      AND sayi_puan > 0
      AND kelime_puan > 0
      AND tarih <= p_tarih
      AND tarih > p_tarih - 7;

    IF v_cifte_gun >= 7 THEN
      INSERT INTO rozet (oyuncu_id, rozet_kodu)
      VALUES (p_oyuncu, 'cift_yonlu')
      ON CONFLICT (oyuncu_id, rozet_kodu) DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- Geçmişi tara: rozeti bugüne kadar hak etmiş oyuncular da alsın.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT tarih, oyuncu_id FROM lig_genel_gunluk LOOP
    PERFORM lig_genel_yenile(r.tarih, r.oyuncu_id);
  END LOOP;
END;
$$;
