-- Faz 3A: Kimlik ve güvenilir kayıt
-- Bölge: Frankfurt (eu-central-1)
-- Önce test ortamında, sonra canlıda çalıştırılır.
--
-- ÖNEMLİ: Bu dosyayı Supabase SQL editöründe çalıştır.
-- "Dosya repodadır" ≠ "Veritabanında çalıştırıldı" (bkz. R4 dersi).
-- Çalıştırdıktan sonra her tablonun varlığını kontrol et:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'oyuncu';

-- ---------------------------------------------------------------------------
-- 1. Oyuncu profili
-- auth.users'a bağlı; bir satır = bir hesap.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oyuncu (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kullanici_adi text UNIQUE NOT NULL,
  gorunen_ad    text,
  olusturuldu   timestamptz NOT NULL DEFAULT now(),
  son_gorulme   timestamptz
);

-- Büyük/küçük harf farkı olmaması için kullanıcı adı küçük harfe normalize
-- edilip saklanır. Indeks de buna göre kurulur.
CREATE UNIQUE INDEX IF NOT EXISTS oyuncu_kullanici_adi_lower
  ON oyuncu (lower(kullanici_adi));

-- ---------------------------------------------------------------------------
-- 2. Tur sonucu — YALNIZCA Edge Function service role ile yazar.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tur_sonuc (
  id            bigserial PRIMARY KEY,
  oyuncu_id     uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  oyun          text NOT NULL CHECK (oyun IN ('sayi', 'kelime')),
  mod           text NOT NULL CHECK (mod IN ('gunun', 'antrenman')),
  seviye        text NOT NULL,
  tarih         date NOT NULL,
  tohum         bigint NOT NULL,
  uzaklik       int NOT NULL CHECK (uzaklik >= 0),
  puan          int NOT NULL CHECK (puan >= 0),
  sure_sn       int NOT NULL CHECK (sure_sn >= 0),
  kalan_sn      int NOT NULL CHECK (kalan_sn >= 0),
  adim_sayisi   int NOT NULL CHECK (adim_sayisi >= 0),
  joker_sayisi  int NOT NULL CHECK (joker_sayisi >= 0),
  olusturuldu   timestamptz NOT NULL DEFAULT now(),
  -- Aynı tur iki kez yazılamaz
  UNIQUE (oyuncu_id, oyun, mod, tarih, tohum)
);

-- ---------------------------------------------------------------------------
-- 3. Devralınan geçmiş — üye olunca tarayıcıdan gelen veri.
-- Yalnızca kişisel istatistikleri taşır; lig puanı devralınmaz.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devralinan_gecmis (
  oyuncu_id  uuid PRIMARY KEY REFERENCES oyuncu(id) ON DELETE CASCADE,
  veri       jsonb NOT NULL,
  devralindi timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Ayar tablosu — dinamik yapılandırma (kod değişikliği gerekmeden).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ayar (
  anahtar text PRIMARY KEY,
  deger   jsonb NOT NULL
);

-- Başlangıç ayarları
INSERT INTO ayar (anahtar, deger) VALUES
  ('gunun_turu_sure_sn',  '{"cocuk":60,"kolay":90,"normal":45,"zor":90,"usta":120}'::jsonb),
  ('min_kullanici_adi_uzunluk', '3'::jsonb),
  ('max_kullanici_adi_uzunluk', '16'::jsonb)
ON CONFLICT (anahtar) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Satır düzeyi güvenlik (RLS)
-- Atlanırsa herkes herkesin verisini değiştirebilir — zorunlu adım.
-- ---------------------------------------------------------------------------

ALTER TABLE oyuncu          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tur_sonuc       ENABLE ROW LEVEL SECURITY;
ALTER TABLE devralinan_gecmis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ayar            ENABLE ROW LEVEL SECURITY;

-- oyuncu: herkes okur, yalnızca kendi satırını değiştirebilir
CREATE POLICY oyuncu_herkes_okur      ON oyuncu FOR SELECT USING (true);
CREATE POLICY oyuncu_sahip_gunceller  ON oyuncu FOR UPDATE USING (auth.uid() = id);
-- INSERT: yeni üye kendi satırını oluşturur (Edge Function da yapabilir)
CREATE POLICY oyuncu_sahip_ekler      ON oyuncu FOR INSERT WITH CHECK (auth.uid() = id);

-- tur_sonuc: herkes okur, HİÇBİR kullanıcı yazamaz
-- (yalnızca service role ile çalışan Edge Function yazar)
CREATE POLICY tur_sonuc_herkes_okur   ON tur_sonuc FOR SELECT USING (true);

-- devralinan_gecmis: yalnızca sahibi okur ve yazar
-- (INSERT/UPDATE yalnızca Edge Function üzerinden, ama sahip de okuyabilir)
CREATE POLICY gecmis_sahip_okur ON devralinan_gecmis FOR SELECT
  USING (auth.uid() = oyuncu_id);
CREATE POLICY gecmis_sahip_yazar ON devralinan_gecmis FOR INSERT
  WITH CHECK (auth.uid() = oyuncu_id);
CREATE POLICY gecmis_sahip_gunceller ON devralinan_gecmis FOR UPDATE
  USING (auth.uid() = oyuncu_id);

-- ayar: herkes okur, hiç kimse yazamaz
CREATE POLICY ayar_herkes_okur ON ayar FOR SELECT USING (true);
