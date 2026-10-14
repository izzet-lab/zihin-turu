#!/usr/bin/env bash
# ses-uret.sh — Kutlama seslerini yayına hazır hâle getirir.
#
# NEDEN BETİK
# Ham dosyalar `varliklar/ses-kaynak/` içinde duruyor ve YAYINLANMIYOR;
# `uygulama/public/ses/` içindeki sürümler bu betikle üretiliyor. Elle
# dönüştürülseydi "hangi ayarla üretilmişti" sorusunun cevabı kaybolur,
# bir sonraki ses eklendiğinde boyut bütçesi sessizce aşılırdı.
#
# BÜTÇE
# Toplam 60 KB. Ham MP3'ler tek başına 71 KB tutuyordu; üstelik tarayıcı
# yedeği için OGG de gerekiyor. Sıkıştırma şart, süslemek için değil.
#
# AYARLAR VE GEREKÇESİ
#   mono        : kaynaklar zaten tek kanal
#   32 kHz      : 1 saniyelik bir jingle için fazlasıyla yeterli; 44.1'in
#                 üstündeki tiz bilgisi telefon hoparlöründe zaten yok
#   MP3 56 kbps : Safari ve eski Android için güvenli taban
#   OGG q1      : Chrome ve Firefox bunu tercih eder, aynı kalitede daha
#                 küçük
#
# İKİ BİÇİM NEDEN
# OGG her yerde çalmıyor (Safari), MP3 her yerde çalıyor ama daha
# büyük. `<audio>` değil Web Audio kullandığımız için seçimi kod
# yapıyor: tarayıcı hangisini destekliyorsa o indiriliyor — ikisi
# birden inmiyor.
#
# Kullanım:  bash araclar/ses-uret.sh

set -euo pipefail

KAYNAK="varliklar/ses-kaynak"
HEDEF="uygulama/public/ses"

# Yayınlanan sesler. A-arpej-fanfar bilerek DIŞARIDA: brief iki jingle
# istiyor, üçüncüsü kullanılmıyor ve bütçeden yiyor.
DOSYALAR=("C-tek-vurus" "B-ok-ve-hedef" "tam-isabet")

command -v ffmpeg >/dev/null || { echo "❌ ffmpeg bulunamadı."; exit 1; }

mkdir -p "$HEDEF"
toplam=0

for ad in "${DOSYALAR[@]}"; do
  giris="$KAYNAK/$ad.mp3"
  [ -f "$giris" ] || { echo "❌ Kaynak yok: $giris"; exit 1; }

  ffmpeg -y -loglevel error -i "$giris" -ac 1 -ar 32000 -b:a 56k "$HEDEF/$ad.mp3"
  ffmpeg -y -loglevel error -i "$giris" -ac 1 -ar 32000 -c:a libvorbis -q:a 1 "$HEDEF/$ad.ogg"

  for uzanti in mp3 ogg; do
    boyut=$(stat -c%s "$HEDEF/$ad.$uzanti")
    toplam=$((toplam + boyut))
    printf "  %-22s %6d bayt\n" "$ad.$uzanti" "$boyut"
  done
done

echo "────────────────────────────────"
printf "  TOPLAM                %6d bayt (%d KB)\n" "$toplam" "$((toplam / 1024))"

if [ "$toplam" -gt 61440 ]; then
  echo "❌ 60 KB bütçesi aşıldı."
  exit 1
fi
echo "✅ Bütçe içinde."
