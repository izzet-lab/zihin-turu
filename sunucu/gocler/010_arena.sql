-- 010 - Faz 5: Arena (5 kişilik eşzamanlı yarış)
--
-- CANLIDA UYGULANDI (7 Ekim 2026): arena_semasi
--
-- Dağıtım sırası (CLAUDE.md): önce bu göç, sonra Edge Function, en son push.

-- ---------------------------------------------------------------------------
-- 1. Arena maçı
--
-- KUYRUK TABLOSU YOK — BEKLEYEN ARENANIN KENDİSİ KUYRUK.
-- Düelloda ayrı bir kuyruk tablosu var çünkü iki kişi eşleşene kadar
-- ortada maç yok. Arenada ise ilk gelen arenayı "bekliyor" durumunda
-- açıyor, sonrakiler ona katılıyor. Ayrı bir kuyruk tutmak aynı bilgiyi
-- iki yerde saklamak olurdu.
--
-- durum: 'bekliyor' → oyuncu bekleniyor
--        'basladi'  → yarış sürüyor
--        'bitti'    → podyum hazır
--
-- TUR İÇERİĞİ SAKLANMAZ, TOHUM SAKLANIR (kural 3).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS arena_mac (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oyun        text NOT NULL DEFAULT 'sayi',
  seviye      text NOT NULL,
  tohum       bigint NOT NULL,
  durum       text NOT NULL DEFAULT 'bekliyor',
  aktif_tur   smallint NOT NULL DEFAULT 1,
  tur_basladi timestamptz,
  olusturuldu timestamptz NOT NULL DEFAULT now(),
  basladi     timestamptz,
  bitti       timestamptz,
  CONSTRAINT arena_mac_durum CHECK (durum IN ('bekliyor', 'basladi', 'bitti')),
  CONSTRAINT arena_mac_aktif_tur CHECK (aktif_tur BETWEEN 1 AND 5)
);

-- Bekleyen arena aranırken kullanılır.
CREATE INDEX IF NOT EXISTS arena_mac_bekleyen
  ON arena_mac (seviye, olusturuldu) WHERE durum = 'bekliyor';

ALTER TABLE arena_mac ENABLE ROW LEVEL SECURITY;

-- Maçı yalnızca koltuğu olanlar görür. Herkese açık olsaydı tohumdan
-- tur üretilip çözüm önceden hazırlanabilirdi.
DROP POLICY IF EXISTS arena_mac_katilanlar ON arena_mac;
CREATE POLICY arena_mac_katilanlar ON arena_mac
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arena_koltuk k
      WHERE k.mac_id = arena_mac.id AND k.oyuncu_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON arena_mac FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Koltuklar
--
-- Beş koltuk. Boş kalanlar bot ile dolar: `oyuncu_id` NULL ise
-- `bot_profil` dolu olmak zorunda (kısıt bunu zorluyor).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS arena_koltuk (
  mac_id         uuid NOT NULL REFERENCES arena_mac(id) ON DELETE CASCADE,
  koltuk         smallint NOT NULL,
  oyuncu_id      uuid REFERENCES oyuncu(id) ON DELETE CASCADE,
  bot_profil     text,
  bot_ad         text,
  puan           integer NOT NULL DEFAULT 0,
  toplam_uzaklik integer NOT NULL DEFAULT 0,
  ayrildi        boolean NOT NULL DEFAULT false,
  PRIMARY KEY (mac_id, koltuk),
  CONSTRAINT arena_koltuk_no CHECK (koltuk BETWEEN 1 AND 5),
  CONSTRAINT arena_koltuk_sahip CHECK (
    (oyuncu_id IS NOT NULL AND bot_profil IS NULL) OR
    (oyuncu_id IS NULL AND bot_profil IS NOT NULL)
  )
);

-- Bir oyuncu aynı arenada iki koltukta oturamaz.
CREATE UNIQUE INDEX IF NOT EXISTS arena_koltuk_tek_oyuncu
  ON arena_koltuk (mac_id, oyuncu_id) WHERE oyuncu_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS arena_koltuk_oyuncu
  ON arena_koltuk (oyuncu_id) WHERE oyuncu_id IS NOT NULL;

ALTER TABLE arena_koltuk ENABLE ROW LEVEL SECURITY;

-- Koltukları yalnızca aynı arenadakiler görür.
DROP POLICY IF EXISTS arena_koltuk_katilanlar ON arena_koltuk;
CREATE POLICY arena_koltuk_katilanlar ON arena_koltuk
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arena_koltuk k2
      WHERE k2.mac_id = arena_koltuk.mac_id AND k2.oyuncu_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON arena_koltuk FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Turlar
--
-- Her tur için her koltuğun SONUCU. Adımlar burada da saklanmaz: sunucu
-- zinciri doğrular, uzaklığı yazar, zinciri atar (kural 8).
--
-- `uzaklik` yarışanlara canlı yayınlanan tek bilgi.
-- `kilitli` düellodaki ile aynı: herkes cevabını kilitlediyse tur
-- süresini beklemeden kapanır.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS arena_tur (
  mac_id     uuid NOT NULL REFERENCES arena_mac(id) ON DELETE CASCADE,
  tur_no     smallint NOT NULL,
  koltuk     smallint NOT NULL,
  uzaklik    integer,
  kilitli    boolean NOT NULL DEFAULT false,
  bildirildi timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mac_id, tur_no, koltuk),
  CONSTRAINT arena_tur_no CHECK (tur_no BETWEEN 1 AND 5),
  CONSTRAINT arena_tur_koltuk CHECK (koltuk BETWEEN 1 AND 5),
  CONSTRAINT arena_tur_uzaklik CHECK (uzaklik IS NULL OR uzaklik >= 0)
);

ALTER TABLE arena_tur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS arena_tur_katilanlar ON arena_tur;
CREATE POLICY arena_tur_katilanlar ON arena_tur
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arena_koltuk k
      WHERE k.mac_id = arena_tur.mac_id AND k.oyuncu_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON arena_tur FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Canlı yayın
--
-- Yarışanların birbirinin uzaklığını anlık görmesi için. İki tablo da
-- RLS ile katılanlarla sınırlı; dışarıdan dinlenemez.
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE arena_mac;
ALTER PUBLICATION supabase_realtime ADD TABLE arena_tur;

-- ---------------------------------------------------------------------------
-- 5. Ölü bekleyen arenaları temizle
--
-- Sekmesini kapatan tek kişinin açtığı arena sonsuza kadar beklemesin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION arena_bekleyenleri_temizle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  silinen integer;
BEGIN
  DELETE FROM arena_mac
  WHERE durum = 'bekliyor' AND olusturuldu < now() - interval '10 minutes';
  GET DIAGNOSTICS silinen = ROW_COUNT;
  RETURN silinen;
END;
$$;

-- Postgres yeni fonksiyona EXECUTE hakkını PUBLIC'e otomatik verir;
-- önce ondan alınmalı (006'da atlanmıştı, denetim yakalamıştı).
REVOKE EXECUTE ON FUNCTION arena_bekleyenleri_temizle() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION arena_bekleyenleri_temizle() FROM anon, authenticated;
