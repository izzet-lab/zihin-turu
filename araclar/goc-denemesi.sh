#!/bin/bash
# goc-denemesi.sh — Göçlerin SIFIRDAN oynatılabildiğini doğrular.
#
# NEDEN VAR
# Göçler canlı veritabanına bir kez, sırayla uygulandı ve çalıştı. Ama
# "çalıştı" ile "sıfırdan çalışır" aynı şey değil: bir göç, kendinden
# SONRA yaratılan bir tabloya bakıyorsa var olan veritabanında sorun
# çıkarmaz, sıfırdan kurulumda düşer. 20 Ekim 2026'da tam bu bulundu —
# `010_arena.sql` içindeki `arena_mac` okuma ilkesi, `arena_koltuk`
# tablosundan önce tanımlanıyordu.
#
# Sıfırdan kurulum hayali bir durum değil: yedekten dönüş, yeni sunucu,
# ikinci bir ortam. O an göçler düşerse veritabanı yarım kalır.
#
# NASIL ÇALIŞIR
# Geçici bir veritabanı açar, Supabase'in göçlerden ÖNCE sağladığı asgari
# iskeleti kurar (auth şeması, auth.users, auth.uid(), üç rol ve
# `supabase_realtime` yayını), sonra göçleri sırayla uygular. Biri
# düşerse hatayı yazar. Sonunda geçici veritabanını siler.
#
# Canlı veriye DOKUNMAZ: ayrı bir veritabanında çalışır ve siler.
#
# Kullanım (sunucuda):
#   bash araclar/goc-denemesi.sh
set -euo pipefail

DEPO="${DEPO:-/root/projeler/tamisabet}"
KAPSAYICI="${KAPSAYICI:-supabase-db-lyx51xz2hr3nm3txkvnxpk3w}"
DENEME="${DENEME:-goc_denemesi}"

[ -d "$DEPO/sunucu/gocler" ] || { echo "Göç klasörü bulunamadı: $DEPO/sunucu/gocler"; exit 1; }

# Canlı veritabanının adıyla aynı olursa felaket olur; bile bile engelle.
if [ "$DENEME" = "postgres" ]; then
  echo "DENEME adı 'postgres' olamaz — canlı veritabanı o."
  exit 1
fi

calistir() { docker exec "$KAPSAYICI" psql -U supabase_admin -d "$1" "${@:2}"; }

echo "Depo:      $DEPO"
echo "Deneme db: $DENEME"
echo

calistir postgres -q -c "DROP DATABASE IF EXISTS $DENEME;" >/dev/null 2>&1 || true
calistir postgres -q -c "CREATE DATABASE $DENEME;"

# Supabase'in göçlerden önce hazır sunduğu parçalar. Bunlar bizim
# göçlerimizin sorumluluğunda değil; iskelet olmadan deneme anlamsız olur.
docker exec -i "$KAPSAYICI" psql -U supabase_admin -d "$DENEME" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid()  RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT NULL::text';
DO $i$ BEGIN CREATE ROLE anon;              EXCEPTION WHEN duplicate_object THEN NULL; END $i$;
DO $i$ BEGIN CREATE ROLE authenticated;     EXCEPTION WHEN duplicate_object THEN NULL; END $i$;
DO $i$ BEGIN CREATE ROLE service_role;      EXCEPTION WHEN duplicate_object THEN NULL; END $i$;
DO $i$ BEGIN CREATE PUBLICATION supabase_realtime; EXCEPTION WHEN duplicate_object THEN NULL; END $i$;
SQL

hata=0
for f in "$DEPO"/sunucu/gocler/*.sql; do
  ad="$(basename "$f")"
  if docker exec -i "$KAPSAYICI" psql -U supabase_admin -d "$DENEME" \
       -v ON_ERROR_STOP=1 -q < "$f" 2>/tmp/goc-hata.txt; then
    echo "  OK   $ad"
  else
    echo "  HATA $ad"
    grep -m2 '^ERROR' /tmp/goc-hata.txt | sed 's/^/        /'
    hata=1
  fi
done

adet=$(calistir "$DENEME" -At -c "select count(*) from pg_tables where schemaname='public';")
echo
echo "Oluşan tablo sayısı: $adet"

calistir postgres -q -c "DROP DATABASE IF EXISTS $DENEME;" >/dev/null

if [ "$hata" -eq 0 ]; then
  echo "SONUÇ: bütün göçler sıfırdan çalıştı."
else
  echo "SONUÇ: en az bir göç düştü — yukarıdaki hataya bak."
  exit 1
fi
