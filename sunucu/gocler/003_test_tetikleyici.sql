-- Faz 3C: Lig tetikleyici testi
-- Bu dosya ÇALIŞTIRILMAZ — test amaçlı referans.
-- Migration 003 uygulandıktan sonra, SQL editöründe el ile çalıştırılır.
--
-- Adım 1: Sahte tur_sonuc satırları yaz (service role ile)
-- Adım 2: lig_gunluk ve lig_donem tablolarını kontrol et
-- Adım 3: Temizle

-- ===================== TEST =====================

-- Gerçek bir oyuncu ID'si gerekiyor. Aşağıdaki sorgu ile bul:
-- SELECT id, kullanici_adi FROM oyuncu LIMIT 5;

-- Örnek: oyuncu_id = '<BURAYA_GERÇEK_ID>'

-- 1. Günün Turu — test puanı yaz
-- INSERT INTO tur_sonuc (oyuncu_id, oyun, mod, seviye, tarih, tohum, uzaklik, puan, sure_sn, kalan_sn, adim_sayisi, joker_sayisi)
-- VALUES ('<ID>', 'sayi', 'gunun', 'normal', CURRENT_DATE, 999999, 0, 150, 45, 30, 4, 0);

-- 2. Kontrol: lig_gunluk'ta satır var mı?
-- SELECT * FROM lig_gunluk WHERE tarih = CURRENT_DATE AND oyun = 'sayi';

-- 3. Kontrol: lig_donem'de haftalık/aylık satır var mı?
-- SELECT * FROM lig_donem WHERE oyun = 'sayi' ORDER BY guncellendi DESC LIMIT 5;

-- 4. Kontrol: oyuncu XP ve seri güncellendi mi?
-- SELECT id, kullanici_adi, xp, seri_gun, seri_son FROM oyuncu WHERE id = '<ID>';

-- 5. Antrenman turu yaz
-- INSERT INTO tur_sonuc (oyuncu_id, oyun, mod, seviye, tarih, tohum, uzaklik, puan, sure_sn, kalan_sn, adim_sayisi, joker_sayisi)
-- VALUES ('<ID>', 'sayi', 'antrenman', 'normal', CURRENT_DATE, 888888, 0, 12, 90, 45, 4, 0);

-- 6. Kontrol: lig_antrenman_hafta'da satır var mı?
-- SELECT * FROM lig_antrenman_hafta WHERE oyun = 'sayi' ORDER BY guncellendi DESC LIMIT 5;

-- 7. Kontrol: XP artmış mı?
-- SELECT id, kullanici_adi, xp FROM oyuncu WHERE id = '<ID>';

-- 8. Temizle (isteğe bağlı — test veritabanında gerekli değil)
-- DELETE FROM tur_sonuc WHERE tohum IN (999999, 888888);
