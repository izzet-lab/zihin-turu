#!/bin/bash
# veritabani-yedek.sh — Kendi sunucumuzdaki Supabase'in günlük yedeği.
#
# NEDEN VAR
# Veritabanı buluttan kendi sunucumuza taşındı (19 Ekim 2026). Bulut
# Supabase yedeklemeyi kendisi yapıyordu; artık yapmıyor. Yedek
# kurulmazsa tek bir disk arızası beş oyuncunun bütün geçmişini,
# ligini ve rozetlerini götürür.
#
# NE ALINIYOR
# `public` ve `auth` şemaları birlikte. auth alınmazsa kullanıcılar
# geri yüklemeden sonra parolalarıyla giremez — veri durur ama kimse
# erişemez.
#
# SAKLAMA
# Son 14 günlük yedek tutuluyor. 15 MB'lık bir veritabanında bu
# yaklaşık 50 MB yer demek; diskte 100 GB boş var.
#
# DİKKAT: Bu yedekler SUNUCUNUN KENDİSİNDE duruyor. Sunucu tamamen
# giderse yedek de gider. Düzenli olarak sunucu dışına kopyalanmalı —
# bu betik onu yapmıyor, o ayrı bir karar.
set -euo pipefail

KAPSAYICI="${KAPSAYICI:-supabase-db-lyx51xz2hr3nm3txkvnxpk3w}"
HEDEF="${HEDEF:-/root/yedek/tamisabet}"
GUN="${GUN:-14}"

mkdir -p "$HEDEF"
ad="$HEDEF/tamisabet-$(date +%Y%m%d-%H%M).sql.gz"

docker exec "$KAPSAYICI" pg_dump -U supabase_admin -d postgres \
  --schema=public --schema=auth --no-owner --no-privileges \
  | gzip > "$ad"

boyut=$(du -h "$ad" | cut -f1)

# Boş ya da bozuk yedek sessizce birikmesin: en az 10 KB bekleniyor.
if [ "$(stat -c%s "$ad")" -lt 10240 ]; then
  echo "UYARI: yedek beklenenden küçük ($boyut) — $ad"
  exit 1
fi

# Eskileri temizle
find "$HEDEF" -name 'tamisabet-*.sql.gz' -mtime +"$GUN" -delete

echo "$(date '+%Y-%m-%d %H:%M') yedek alındı: $ad ($boyut)"
