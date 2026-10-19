#!/bin/bash
# yedek-disari.sh — Yedekleri sunucu DIŞINA kopyalar.
#
# NEDEN AYRI BİR BETİK
# `veritabani-yedek.sh` günlük yedeği alıyor ama yedek sunucunun kendi
# diskinde duruyor. Sunucu tamamen giderse (disk arızası, sağlayıcı
# sorunu, yanlışlıkla silme) veritabanı da yedeği de birlikte gider.
# Yedeğin anlamı başka bir yerde durmasıdır.
#
# HEDEF
# `rclone` üzerinden; hangi sağlayıcı olduğu betiği ilgilendirmiyor.
# Hedef `UZAK` değişkeniyle veriliyor (ör. "r2:tamisabet-yedek").
# Kurulumu bir kez `rclone config` ile yapılır; kimlik bilgileri
# sunucuda kalır, depoya girmez.
#
# NEDEN SENKRON DEĞİL KOPYALA
# `sync` uzaktaki fazlalıkları siler. Yereldeki yedekler 14 gün sonra
# temizlendiği için `sync` uzaktaki eski yedekleri de silerdi — oysa
# uzak kopyanın daha uzun durması işin bütün amacı. `copy` yalnızca
# ekler.
set -euo pipefail

KAYNAK="${KAYNAK:-/root/yedek/tamisabet}"
UZAK="${UZAK:-}"

if [ -z "$UZAK" ]; then
  echo "UZAK tanımlı değil. Örnek: UZAK=r2:tamisabet-yedek bash $0"
  exit 2
fi

if ! command -v rclone >/dev/null; then
  echo "rclone kurulu değil."
  exit 2
fi

if [ ! -d "$KAYNAK" ] || [ -z "$(ls -A "$KAYNAK" 2>/dev/null)" ]; then
  echo "UYARI: kaynak boş ya da yok: $KAYNAK"
  exit 1
fi

rclone copy "$KAYNAK" "$UZAK" \
  --include 'tamisabet-*.sql.gz' \
  --transfers 2 \
  --retries 3 \
  --stats-one-line

# Kopyalandığını DOĞRULA — "başarılı" demek yetmez, uzakta kaç dosya
# olduğu sayılıyor. Sessizce boş kalan bir yedek, yedek değildir.
adet=$(rclone lsf "$UZAK" --include 'tamisabet-*.sql.gz' 2>/dev/null | wc -l)
echo "$(date '+%Y-%m-%d %H:%M') uzakta $adet yedek dosyası var ($UZAK)"

if [ "$adet" -eq 0 ]; then
  echo "HATA: uzakta hiç dosya yok — kopyalama gerçekte olmamış."
  exit 1
fi
