-- 006 - Faz 4: Duello
--
-- ÖNEMLİ: Bu dosya HENÜZ CANLIDA ÇALIŞTIRILMADI.
-- "Dosya repodadır" ≠ "Veritabanında çalıştırıldı".
-- Supabase SQL editöründe çalıştırıldıktan sonra bu satır güncellenmeli.
--
-- Dağıtım sırası (CLAUDE.md): önce bu göç, sonra Edge Function, en son push.

-- ---------------------------------------------------------------------------
-- 1. Oyuncunun düello derecesi (ELO)
--
-- Ayrı tablo, `oyuncu`ya sütun eklemek yerine: düello isteğe bağlı bir mod,
-- hiç düello oynamayanın satırı hiç oluşmasın. Ayrıca `oyuncu` tablosunda
-- sütun düzeyinde GRANT kilitleri var (005); dereceyi de aynı sıkılıkta
-- ama ayrı yönetmek daha temiz.
--
-- Derece YALNIZCA Edge Function (service role) tarafından yazılır.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duello_derece (
  oyuncu_id    uuid PRIMARY KEY REFERENCES oyuncu(id) ON DELETE CASCADE,
  elo          integer NOT NULL DEFAULT 1200,
  mac_sayisi   integer NOT NULL DEFAULT 0,
  galibiyet    integer NOT NULL DEFAULT 0,
  maglubiyet   integer NOT NULL DEFAULT 0,
  beraberlik   integer NOT NULL DEFAULT 0,
  guncellendi  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duello_derece_elo_makul CHECK (elo BETWEEN 0 AND 4000)
);

ALTER TABLE duello_derece ENABLE ROW LEVEL SECURITY;

-- Dereceler herkese açık: rakip profilinde ve sıralamada görünür.
DROP POLICY IF EXISTS duello_derece_oku ON duello_derece;
CREATE POLICY duello_derece_oku ON duello_derece FOR SELECT USING (true);

-- Yazma yok: yalnızca service role (Edge Function) yazar.
REVOKE INSERT, UPDATE, DELETE ON duello_derece FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Eşleştirme kuyruğu
--
-- Oyuncu "düello ara" deyince buraya bir satır yazar ve bekler. Eşleştirme
-- Edge Function tarafından yapılır; iki satır bulunup maça çevrilir.
--
-- Kuyrukta kalıntı satır kalmaması için `bitis` yok, `girdi` var:
-- eskimiş satırlar zamana bakılarak temizlenir (aşağıdaki fonksiyon).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duello_kuyruk (
  oyuncu_id  uuid PRIMARY KEY REFERENCES oyuncu(id) ON DELETE CASCADE,
  elo        integer NOT NULL,
  seviye     text NOT NULL,
  girdi      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS duello_kuyruk_arama ON duello_kuyruk (seviye, elo, girdi);

ALTER TABLE duello_kuyruk ENABLE ROW LEVEL SECURITY;

-- Oyuncu yalnızca KENDİ kuyruk satırını görür ve silebilir (vazgeçme).
-- Başkasının kuyrukta olduğunu görmek gerekmez; eşleştirmeyi sunucu yapar.
DROP POLICY IF EXISTS duello_kuyruk_kendi ON duello_kuyruk;
CREATE POLICY duello_kuyruk_kendi ON duello_kuyruk
  FOR SELECT USING (oyuncu_id = auth.uid());

DROP POLICY IF EXISTS duello_kuyruk_cik ON duello_kuyruk;
CREATE POLICY duello_kuyruk_cik ON duello_kuyruk
  FOR DELETE USING (oyuncu_id = auth.uid());

-- Kuyruğa GİRİŞ de Edge Function üzerinden olur: `elo` alanı istemciden
-- gelemez, yoksa oyuncu kendi derecesini uydurup zayıf rakip seçerdi.
REVOKE INSERT, UPDATE ON duello_kuyruk FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Maç
--
-- TUR İÇERİĞİ SAKLANMAZ, TOHUM SAKLANIR (kural 3).
-- Beş turun tamamı tek bir `tohum` + tur numarasından yeniden üretilir;
-- rövanş ve maç tekrarı bundan bedavaya gelir.
--
-- `durum` maçın nerede olduğunu söyler:
--   'basladi'  → oynanıyor
--   'bitti'    → normal sonlandı
--   'terk'     → bir taraf bağlantıyı kaybetti ve dönmedi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duello_mac (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oyun         text NOT NULL DEFAULT 'sayi',
  seviye       text NOT NULL,
  tohum        bigint NOT NULL,
  -- Taraf A ve B. B, bot ise NULL olur ve bot_profil dolar.
  oyuncu_a     uuid NOT NULL REFERENCES oyuncu(id) ON DELETE CASCADE,
  oyuncu_b     uuid REFERENCES oyuncu(id) ON DELETE CASCADE,
  bot_profil   text,
  bot_ad       text,
  skor_a       integer NOT NULL DEFAULT 0,
  skor_b       integer NOT NULL DEFAULT 0,
  durum        text NOT NULL DEFAULT 'basladi',
  kazanan      text,               -- 'a' | 'b' | 'berabere' | NULL (sürüyor)
  terk_eden    text,               -- 'a' | 'b' | NULL
  -- Rövanş zinciri: bu maç hangi maçın rövanşı?
  revans_kaynak uuid REFERENCES duello_mac(id) ON DELETE SET NULL,
  -- Özel oda kodu; kuyruktan değil davetle kurulan maçlarda dolu.
  oda_kodu     text,
  basladi      timestamptz NOT NULL DEFAULT now(),
  bitti        timestamptz,

  CONSTRAINT duello_mac_durum CHECK (durum IN ('basladi', 'bitti', 'terk')),
  CONSTRAINT duello_mac_kazanan CHECK (kazanan IS NULL OR kazanan IN ('a', 'b', 'berabere')),
  CONSTRAINT duello_mac_terk CHECK (terk_eden IS NULL OR terk_eden IN ('a', 'b')),
  -- Rakip ya gerçek oyuncudur ya bot; ikisi birden ya da hiçbiri olamaz.
  CONSTRAINT duello_mac_rakip CHECK (
    (oyuncu_b IS NOT NULL AND bot_profil IS NULL) OR
    (oyuncu_b IS NULL AND bot_profil IS NOT NULL)
  ),
  CONSTRAINT duello_mac_kendine_karsi CHECK (oyuncu_b IS NULL OR oyuncu_a <> oyuncu_b)
);

CREATE INDEX IF NOT EXISTS duello_mac_oyuncu_a ON duello_mac (oyuncu_a, basladi DESC);
CREATE INDEX IF NOT EXISTS duello_mac_oyuncu_b ON duello_mac (oyuncu_b, basladi DESC);
CREATE UNIQUE INDEX IF NOT EXISTS duello_mac_oda_kodu
  ON duello_mac (oda_kodu) WHERE oda_kodu IS NOT NULL AND durum = 'basladi';

ALTER TABLE duello_mac ENABLE ROW LEVEL SECURITY;

-- Maçı yalnızca tarafları görür. Herkese açık olsaydı rakibin maçı
-- dışarıdan izlenebilir, tohumdan tur üretilip çözüm hazırlanabilirdi.
DROP POLICY IF EXISTS duello_mac_taraflar ON duello_mac;
CREATE POLICY duello_mac_taraflar ON duello_mac
  FOR SELECT USING (oyuncu_a = auth.uid() OR oyuncu_b = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON duello_mac FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Maçın turları
--
-- Her tur için her tarafın SONUCU. Adımlar burada da saklanmaz — sunucu
-- zinciri doğrular, sonucu yazar, zinciri atar (kural 8: çözüm sızmaz;
-- kural 3: içerik değil tohum saklanır).
--
-- `uzaklik` rakibe canlı yayınlanan tek bilgidir.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duello_tur (
  mac_id     uuid NOT NULL REFERENCES duello_mac(id) ON DELETE CASCADE,
  tur_no     smallint NOT NULL,
  taraf      text NOT NULL,
  uzaklik    integer,             -- NULL = hiç bildirmedi
  kalan_sn   integer,
  bildirildi timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mac_id, tur_no, taraf),
  CONSTRAINT duello_tur_taraf CHECK (taraf IN ('a', 'b')),
  CONSTRAINT duello_tur_no CHECK (tur_no BETWEEN 1 AND 5),
  CONSTRAINT duello_tur_uzaklik CHECK (uzaklik IS NULL OR uzaklik >= 0)
);

ALTER TABLE duello_tur ENABLE ROW LEVEL SECURITY;

-- Turları yalnızca maçın tarafları görür.
DROP POLICY IF EXISTS duello_tur_taraflar ON duello_tur;
CREATE POLICY duello_tur_taraflar ON duello_tur
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM duello_mac m
      WHERE m.id = duello_tur.mac_id
        AND (m.oyuncu_a = auth.uid() OR m.oyuncu_b = auth.uid())
    )
  );

REVOKE INSERT, UPDATE, DELETE ON duello_tur FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Canlı yayın
--
-- Rakibin uzaklığı Realtime ile yayınlanır. Yalnızca bu iki tablo yayına
-- açılır; ikisi de RLS ile taraflarla sınırlı olduğu için dışarıdan
-- dinlenemez.
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE duello_mac;
ALTER PUBLICATION supabase_realtime ADD TABLE duello_tur;

-- ---------------------------------------------------------------------------
-- 6. Kuyruk temizliği
--
-- Sekmesini kapatan oyuncunun satırı kuyrukta kalırsa, bir daha hiç
-- gelmeyecek birini eşleştirmeye çalışırız. İki dakikadan eski satırlar
-- ölü sayılır.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION duello_kuyruk_temizle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  silinen integer;
BEGIN
  DELETE FROM duello_kuyruk WHERE girdi < now() - interval '2 minutes';
  GET DIAGNOSTICS silinen = ROW_COUNT;
  RETURN silinen;
END;
$$;

REVOKE EXECUTE ON FUNCTION duello_kuyruk_temizle() FROM anon, authenticated;
