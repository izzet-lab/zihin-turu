-- ============================================================
-- SAYI ARENA — VERİ MODELİ
-- SQLite ile başlanır, büyürse Postgres'e taşınır (sözdizimi uyumlu
-- tutuldu). Kritik karar: misafir oyuncu da kayıt üretir, sonradan
-- üye olduğunda geçmişi devralır. Kelime Tahmin'in "üyeliksiz başla"
-- akışı ancak böyle çalışır.
-- ============================================================

-- ---------- Kimlik ----------
CREATE TABLE oyuncu (
  id            TEXT PRIMARY KEY,             -- uuid
  kullanici_adi TEXT UNIQUE,                  -- NULL ise misafir
  gorunen_ad    TEXT NOT NULL,
  avatar_tohum  TEXT NOT NULL,                -- dicebear: dosya yüklemeye gerek yok
  eposta        TEXT UNIQUE,
  parola_hash   TEXT,
  misafir       INTEGER NOT NULL DEFAULT 1,
  elo           INTEGER NOT NULL DEFAULT 1200,
  xp            INTEGER NOT NULL DEFAULT 0,
  unvan         TEXT DEFAULT 'Çırak',
  olusturuldu   TEXT NOT NULL DEFAULT (datetime('now')),
  son_gorulme   TEXT
);
CREATE INDEX ix_oyuncu_elo ON oyuncu(elo DESC);

-- Misafir → üye devri: eski id yeni id'ye bağlanır, geçmiş kaybolmaz
CREATE TABLE oyuncu_birlestirme (
  eski_id TEXT NOT NULL,
  yeni_id TEXT NOT NULL REFERENCES oyuncu(id),
  tarih   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (eski_id)
);

-- ---------- Maç ----------
-- Tur içerikleri saklanmaz, TOHUM saklanır. ortak/oyun.js aynı tohumdan
-- aynı turu yeniden üretir → depolama küçük, maç tekrarı bedava.
CREATE TABLE mac (
  id           TEXT PRIMARY KEY,
  mod          TEXT NOT NULL,                 -- duello | arena | ozel | maraton | gunun
  seviye       TEXT NOT NULL,                 -- cocuk | kolay | normal | zor | usta
  tohum        INTEGER NOT NULL,
  tur_sayisi   INTEGER NOT NULL,
  baslangic    TEXT NOT NULL DEFAULT (datetime('now')),
  bitis        TEXT,
  durum        TEXT NOT NULL DEFAULT 'devam', -- devam | bitti | terk
  lige_isler   INTEGER NOT NULL DEFAULT 1     -- pratik/özel oda: 0
);

CREATE TABLE mac_oyuncu (
  mac_id      TEXT NOT NULL REFERENCES mac(id),
  oyuncu_id   TEXT NOT NULL,
  bot         INTEGER NOT NULL DEFAULT 0,
  bot_profil  TEXT,
  puan        INTEGER NOT NULL DEFAULT 0,
  elo_once    INTEGER,
  elo_sonra   INTEGER,
  sonuc       TEXT,                           -- galip | maglup | berabere | terk
  PRIMARY KEY (mac_id, oyuncu_id)
);
CREATE INDEX ix_mac_oyuncu ON mac_oyuncu(oyuncu_id);

CREATE TABLE tur (
  mac_id     TEXT NOT NULL REFERENCES mac(id),
  tur_no     INTEGER NOT NULL,
  hedef      INTEGER NOT NULL,
  kazanan_id TEXT,
  fark       INTEGER,
  puan_taban INTEGER DEFAULT 0,
  puan_hiz   INTEGER DEFAULT 0,
  puan_buzz  INTEGER DEFAULT 0,
  sure_ms    INTEGER,
  PRIMARY KEY (mac_id, tur_no)
);

-- Gönderilen her zincir: hile analizi ve "nasıl çözdü" tekrarı için
CREATE TABLE gonderim (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  mac_id     TEXT NOT NULL,
  tur_no     INTEGER NOT NULL,
  oyuncu_id  TEXT NOT NULL,
  adimlar    TEXT NOT NULL,                   -- JSON
  gecerli    INTEGER NOT NULL,
  hata       TEXT,
  ms         INTEGER,                         -- tur başından itibaren
  olusturuldu TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_gonderim_mac ON gonderim(mac_id, tur_no);

-- ---------- Lig ----------
-- Kural: günlük sıralamaya oyuncunun O GÜNKÜ EN İYİ maçı yazılır.
-- Toplam değil. Bu tek kural farm'lamayı öldürüyor, çünkü 50 maç
-- oynamak 1 iyi maç oynamaktan üstün olmuyor.
CREATE TABLE lig_gunluk (
  gun        TEXT NOT NULL,                   -- YYYY-MM-DD
  oyuncu_id  TEXT NOT NULL,
  en_iyi_puan INTEGER NOT NULL DEFAULT 0,
  en_iyi_mac TEXT,
  mac_sayisi INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gun, oyuncu_id)
);
CREATE INDEX ix_lig_gunluk ON lig_gunluk(gun, en_iyi_puan DESC);

CREATE TABLE lig_aylik (
  ay         TEXT NOT NULL,                   -- YYYY-MM
  oyuncu_id  TEXT NOT NULL,
  toplam     INTEGER NOT NULL DEFAULT 0,      -- günlük en iyilerin toplamı
  gun_sayisi INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ay, oyuncu_id)
);
CREATE INDEX ix_lig_aylik ON lig_aylik(ay, toplam DESC);

CREATE TABLE odul (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  oyuncu_id TEXT NOT NULL,
  tip       TEXT NOT NULL,                    -- kupa | madalya | rozet
  anahtar   TEXT NOT NULL,                    -- 'aylik_1', 'ilk_10_galibiyet' ...
  donem     TEXT,
  kazanildi TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (oyuncu_id, anahtar, donem)
);

-- ---------- Günün turu ----------
-- Bulmaca saklanmaz, tarihten türer. Sadece sonuçlar saklanır.
CREATE TABLE gunun_sonuc (
  gun         TEXT NOT NULL,
  seviye      TEXT NOT NULL,
  oyuncu_id   TEXT NOT NULL,
  fark        INTEGER NOT NULL,
  puan        INTEGER NOT NULL,
  sure_sn     INTEGER,
  paylasildi  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gun, seviye, oyuncu_id)
);

-- ---------- Maraton ----------
CREATE TABLE maraton_ilerleme (
  oyuncu_id TEXT NOT NULL,
  bolum     INTEGER NOT NULL,
  yildiz    INTEGER NOT NULL DEFAULT 0,       -- 0-3
  en_iyi_sn INTEGER,
  tamamlandi TEXT,
  PRIMARY KEY (oyuncu_id, bolum)
);

-- ---------- İşletme ----------
CREATE TABLE eslesme_cezasi (
  oyuncu_id TEXT PRIMARY KEY,
  bitis     TEXT NOT NULL,                    -- maçı sürekli terk edene kısa engel
  sebep     TEXT
);

CREATE TABLE ayar (
  anahtar TEXT PRIMARY KEY,
  deger   TEXT NOT NULL
);
-- Joker sayıları, tur süresi, bot bekleme süresi gibi değerler burada
-- tutulur ki dengeyi değiştirmek için yeni sürüm çıkmak gerekmesin.
INSERT INTO ayar (anahtar, deger) VALUES
  ('tur_saniye','60'), ('buzz_saniye','20'), ('tur_sayisi','5'),
  ('bot_bekleme_ms','8000'), ('joker_adim','1'), ('joker_tas','1'), ('joker_sure','1');
