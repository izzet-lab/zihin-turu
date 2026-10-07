-- 011 - Arena sıralaması (madalya tablosu)
--
-- CANLIDA UYGULANDI (7 Ekim 2026): arena_derece
--
-- NEDEN ELO DEĞİL MADALYA
-- Düelloda ELO var çünkü iki kişilik bir maçın sonucu "kim daha iyi"
-- sorusunu doğrudan cevaplıyor. Arena beş kişilik bir yarış; oradaki
-- asıl ödül podyum. Bu yüzden arena tablosu bir madalya tablosu:
-- önce altın, sonra gümüş, sonra bronz, en son toplam puan.
--
-- BOTA KARŞI KAZANILAN PODYUM SAYILMAZ
-- Arena boş koltukları botla dolduruyor. Tek başına katılan oyuncu her
-- seferinde dört bota karşı yarışır ve madalya toplardı; tablo birkaç
-- günde anlamsızlaşırdı. Bu yüzden sonuç YALNIZCA en az iki gerçek
-- oyuncu varsa işleniyor — düellodaki "bota karşı derece değişmez"
-- kuralının arena karşılığı.

CREATE TABLE IF NOT EXISTS arena_derece (
  oyuncu_id    uuid PRIMARY KEY REFERENCES oyuncu(id) ON DELETE CASCADE,
  arena_sayisi integer NOT NULL DEFAULT 0,
  altin        integer NOT NULL DEFAULT 0,
  gumus        integer NOT NULL DEFAULT 0,
  bronz        integer NOT NULL DEFAULT 0,
  toplam_puan  integer NOT NULL DEFAULT 0,
  guncellendi  timestamptz NOT NULL DEFAULT now()
);

-- Sıralama sorgusu bu sırayla okur.
CREATE INDEX IF NOT EXISTS arena_derece_siralama
  ON arena_derece (altin DESC, gumus DESC, bronz DESC, toplam_puan DESC);

ALTER TABLE arena_derece ENABLE ROW LEVEL SECURITY;

-- Dereceler herkese açık: sıralama ekranında görünüyor.
DROP POLICY IF EXISTS arena_derece_oku ON arena_derece;
CREATE POLICY arena_derece_oku ON arena_derece FOR SELECT USING (true);

-- Yazma yok: yalnızca service role (Edge Function) yazar.
REVOKE INSERT, UPDATE, DELETE ON arena_derece FROM anon, authenticated;
