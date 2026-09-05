#!/bin/bash
# paket-uret.sh — Play Store için imzalı AAB üretir.
#
# Kullanım (bayraklar birlikte verilebilir):
#   ./paket-uret.sh                 # web derle + senkronla + AAB üret
#   ./paket-uret.sh --sadece-gradle # yalnızca AAB üret (web zaten hazırsa)
#   ./paket-uret.sh --apk           # AAB yerine imzalı APK (cihazda denemek için)
#
# NEDEN BU BETİK VAR
# Gradle, Java 17 veya üstünü ister. Bu makinede sistem varsayılanı
# Java 8; doğrudan ./gradlew çağırınca "Gradle requires JVM 17" hatası
# veriyor. Aşağıdaki arama, uygun Java'yı kendisi bulur — herkesin
# makinesinde elle JAVA_HOME ayarlamasına gerek kalmasın diye.

set -e
cd "$(dirname "$0")"

SADECE_GRADLE=0
APK=0
for bayrak in "$@"; do
  case "$bayrak" in
    --sadece-gradle) SADECE_GRADLE=1 ;;
    --apk) APK=1 ;;
    *) echo "Bilinmeyen seçenek: $bayrak"; exit 1 ;;
  esac
done

# ── Java 17+ bul ──────────────────────────────────────────────────────
java_surumu() {
  "$1/bin/java" -version 2>&1 | head -1 | sed 's/.*version "\([0-9]*\).*/\1/'
}

JDK=""
# 1) Zaten ayarlıysa ve yeterliyse onu kullan.
if [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  [ "$(java_surumu "$JAVA_HOME")" -ge 17 ] 2>/dev/null && JDK="$JAVA_HOME"
fi
# 2) Android Studio'nun kendi JDK'sı (en yaygın kurulum).
if [ -z "$JDK" ]; then
  for aday in \
    "/c/Program Files/Android/Android Studio/jbr" \
    "$HOME/AppData/Local/Programs/Android Studio/jbr" \
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
    "/usr/lib/jvm/java-21-openjdk-amd64" \
    "/usr/lib/jvm/java-17-openjdk-amd64"
  do
    if [ -x "$aday/bin/java" ] && [ "$(java_surumu "$aday")" -ge 17 ] 2>/dev/null; then
      JDK="$aday"; break
    fi
  done
fi

if [ -z "$JDK" ]; then
  echo "❌ Java 17 veya üstü bulunamadı."
  echo "   Android Studio kuruluysa kendi JDK'sı kullanılabilir;"
  echo "   yoksa JAVA_HOME'u uygun bir JDK'ya ayarlayıp tekrar dene."
  exit 1
fi
export JAVA_HOME="$JDK"
echo "☕ Java: $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"

# ── Web arayüzünü derle ve Android'e senkronla ───────────────────────
if [ "$SADECE_GRADLE" -eq 0 ]; then
  echo "🌐 Web arayüzü derleniyor…"
  (cd ../.. && npm run insa)
  echo "🔄 Capacitor senkronu…"
  (cd .. && npx cap sync android)
fi

# ── Paketi üret ──────────────────────────────────────────────────────
if [ "$APK" -eq 1 ]; then
  echo "📦 İmzalı APK üretiliyor (R8 açık)…"
  ./gradlew assembleRelease
  CIKTI="app/build/outputs/apk/release/app-release.apk"
else
  echo "📦 İmzalı AAB üretiliyor (R8 açık)…"
  ./gradlew bundleRelease
  CIKTI="app/build/outputs/bundle/release/app-release.aab"
fi

SURUM=$(grep VERSION_CODE version.properties | cut -d= -f2)
ISIM=$(grep VERSION_NAME version.properties | cut -d= -f2)
echo ""
echo "✅ Hazır: $(pwd)/$CIKTI"
echo "   Sürüm: $ISIM (versionCode $SURUM)"
echo ""
echo "   R8 eşleme dosyası (çökme raporlarını çözmek için Play'e yüklenir):"
echo "   $(pwd)/app/build/outputs/mapping/release/mapping.txt"
