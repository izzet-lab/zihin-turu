-- 018 - Geçmiş kelime Günün Turu puanlarını ×10 ölçeğine taşı
--
-- NEDEN
-- Göç 016 ile genel sıralama geldi ve kelime turunun Günün Turu puanı
-- ×10 ölçeğine çıkarıldı (17 Ekim 2026). Düzeltme o günden SONRAKİ
-- turlar için geçerliydi; daha önce yazılmış satırlar ham ölçekte
-- kaldı. Sonuç: aynı tabloda 15 puanlık bir kelime turu ile 150
-- puanlık bir kelime turu yan yana duruyor ve genel sıralamada ekim
-- ayının kelime payı olması gerekenden on kat küçük görünüyordu.
--
-- SINIR NEREDE
-- Ölçek düzeltmesi 17 Ekim 2026'da canlıya alındı. O tarihten önce
-- yazılmış kelime Günün Turu satırları eski ölçekte; sonrakiler zaten
-- yeni ölçekte. Kesme noktası bu yüzden `olusturuldu < 2026-10-17`.
--
-- Göç yazıldığında etkilenen satırlar: tur_sonuc'ta 6, lig_gunluk'ta 6
-- (puanlar 5–15 aralığında). Düzeltmeden sonra yazılmış tek bir kelime
-- Günün Turu satırı yoktu, yani sınır belirsiz bir aralığın ortasından
-- geçmiyor.
--
-- NEDEN BU GÖÇ İKİ KEZ ÇALIŞTIRILAMAZ
-- Çarpma işlemi kendiliğinden tekrarlanabilir değil: ikinci çalışma
-- puanları yüz katına çıkarırdı. Kesme noktası SABİT bir tarih olduğu
-- için ikinci çalışmada aynı satırlar yeniden yakalanır. Bu yüzden
-- göç, daha önce uygulanıp uygulanmadığını kendi işaret tablosundan
-- denetliyor ve uygulanmışsa hiçbir şey yapmadan çıkıyor.
--
-- ANTRENMAN DOKUNULMUYOR
-- Ölçek yalnızca Günün Turu'na uygulanıyor; antrenman puanları ham
-- kalmaya devam ediyor. Antrenman puanları XP'ye gidiyor, dolayısıyla
-- bu göç XP'yi ve seri ödüllerini hiç etkilemiyor.

-- ---------------------------------------------------------------------------
-- 0. Bir kez çalışma güvencesi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uygulanan_veri_duzeltme (
  ad          text PRIMARY KEY,
  uygulandi   timestamptz NOT NULL DEFAULT now(),
  not_metni   text
);

DO $$
DECLARE
  v_tur_sonuc  int := 0;
  v_lig_gunluk int := 0;
  KESME CONSTANT timestamptz := '2026-10-17 00:00:00+00';
  KESME_TARIH CONSTANT date := '2026-10-17';
BEGIN
  IF EXISTS (SELECT 1 FROM uygulanan_veri_duzeltme WHERE ad = '018_kelime_olcek') THEN
    RAISE NOTICE 'Göç 018 zaten uygulanmış; atlanıyor.';
    RETURN;
  END IF;

  -- 1. Ham tur kayıtları.
  UPDATE tur_sonuc
     SET puan = puan * 10
   WHERE oyun = 'kelime'
     AND mod = 'gunun'
     AND olusturuldu < KESME;
  GET DIAGNOSTICS v_tur_sonuc = ROW_COUNT;

  -- 2. Günlük lig en iyileri.
  --
  -- Bu UPDATE, lig_gunluk üstündeki genel tetikleyiciyi satır satır
  -- çalıştırır ve genel tablolar kendiliğinden yeniden hesaplanır
  -- (bkz. göç 016, lig_gunluk_genel_guncelle).
  UPDATE lig_gunluk
     SET en_iyi_puan = en_iyi_puan * 10,
         guncellendi = now()
   WHERE oyun = 'kelime'
     AND tarih < KESME_TARIH;
  GET DIAGNOSTICS v_lig_gunluk = ROW_COUNT;

  -- 3. Dönem toplamları.
  --
  -- Çarpmak yerine günlük en iyilerden SIFIRDAN kuruluyor. Bir dönem
  -- hem eski hem yeni ölçekli gün içeriyorsa çarpmak yanlış sonuç
  -- verirdi; yeniden kurmak her durumda doğru.
  INSERT INTO lig_donem
    (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id, toplam_puan, gun_sayisi, guncellendi)
  SELECT 'hafta', to_char(tarih, 'IYYY"-W"IW'), oyun, seviye, oyuncu_id,
         SUM(en_iyi_puan), COUNT(*), now()
  FROM lig_gunluk
  WHERE oyun = 'kelime'
  GROUP BY to_char(tarih, 'IYYY"-W"IW'), oyun, seviye, oyuncu_id
  ON CONFLICT (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id) DO UPDATE SET
    toplam_puan = EXCLUDED.toplam_puan,
    gun_sayisi  = EXCLUDED.gun_sayisi,
    guncellendi = now();

  INSERT INTO lig_donem
    (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id, toplam_puan, gun_sayisi, guncellendi)
  SELECT 'ay', to_char(tarih, 'YYYY"-"MM'), oyun, seviye, oyuncu_id,
         SUM(en_iyi_puan), COUNT(*), now()
  FROM lig_gunluk
  WHERE oyun = 'kelime'
  GROUP BY to_char(tarih, 'YYYY"-"MM'), oyun, seviye, oyuncu_id
  ON CONFLICT (donem_tipi, donem_anahtar, oyun, seviye, oyuncu_id) DO UPDATE SET
    toplam_puan = EXCLUDED.toplam_puan,
    gun_sayisi  = EXCLUDED.gun_sayisi,
    guncellendi = now();

  -- 4. Genel tablolar — tetikleyici zaten çalıştı ama garanti olsun.
  --    Yeniden hesap idempotent: ikinci kez çalışması zararsız.
  DECLARE
    r RECORD;
  BEGIN
    FOR r IN SELECT DISTINCT tarih, oyuncu_id FROM lig_gunluk LOOP
      PERFORM lig_genel_yenile(r.tarih, r.oyuncu_id);
    END LOOP;
  END;

  INSERT INTO uygulanan_veri_duzeltme (ad, not_metni)
  VALUES ('018_kelime_olcek',
          format('tur_sonuc %s satir, lig_gunluk %s satir x10', v_tur_sonuc, v_lig_gunluk));

  RAISE NOTICE 'Göç 018: tur_sonuc %, lig_gunluk % satır ölçeklendi.', v_tur_sonuc, v_lig_gunluk;
END;
$$;
