#!/bin/bash
# surum-artir.sh — Play Store yayını öncesi versionCode'u artırır.
#
# Kullanım:
#   ./surum-artir.sh          # versionCode +1, versionName aynı kalır
#   ./surum-artir.sh 1.4.0    # versionCode +1, versionName güncellenir
#
# Sonra: git add version.properties && git commit -m "versionCode N"

DOSYA="$(dirname "$0")/version.properties"

if [ ! -f "$DOSYA" ]; then
  echo "VERSION_CODE=1" > "$DOSYA"
  echo "VERSION_NAME=1.0.0" >> "$DOSYA"
fi

MEVCUT=$(grep VERSION_CODE "$DOSYA" | cut -d= -f2)
YENI=$((MEVCUT + 1))

# versionCode artır
sed -i "s/VERSION_CODE=.*/VERSION_CODE=$YENI/" "$DOSYA"

# versionName güncelle (verilmişse)
if [ -n "$1" ]; then
  sed -i "s/VERSION_NAME=.*/VERSION_NAME=$1/" "$DOSYA"
fi

echo "✅ versionCode: $MEVCUT → $YENI"
grep VERSION_NAME "$DOSYA"
