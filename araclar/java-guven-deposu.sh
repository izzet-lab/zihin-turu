#!/usr/bin/env bash
# java-guven-deposu.sh — Gradle'ın TLS güven deposunu yeniden kurar.
#
# NE SORUNU ÇÖZÜYOR
# Bu makinede Avast antivirüs, internet trafiğini kendi sertifikasıyla
# imzalayarak tarıyor. Windows o sertifikaya güveniyor (tarayıcı, npm
# ve git bu yüzden çalışıyor) ama Java kendi güven deposunu kullanıyor
# ve tanımıyor. Sonuç: Gradle hiçbir şey indiremiyor, Crashlytics
# eşleme dosyası yüklenemiyor —
#
#   PKIX path validation failed: Path does not chain with any of the
#   trust anchors
#
# NEDEN BİR DEFALIK ÇÖZÜM DEĞİL
# Avast kök sertifikasını zaman zaman YENİLİYOR. Ağustos 2026'da elle
# kurulan depo, Avast kökü değişince sessizce işe yaramaz hâle geldi
# ve eşleme dosyası iki aydır yüklenemiyordu. Hata mesajı aynı
# kaldığı için "çözülmüş bir sorun" sanıldı. Bu betik, kökü Windows
# deposundan HER SEFERİNDE yeniden okuyor.
#
# NE YAPIYOR
#   1. Windows güven deposundaki Avast kökünü dışa aktarır.
#   2. JDK'nın kendi cacerts dosyasının bir kopyasını alır.
#   3. Avast kökünü yalnızca o kopyaya ekler.
#   4. Gradle'ı o kopyaya yönlendiren ~/.gradle/gradle.properties
#      satırını yazar.
#
# Sistemin güven ayarlarına DOKUNMAZ. Avast kaldırılırsa betiği
# çalıştırmaya gerek kalmaz; mevcut depo yine geçerli sertifikaları
# içerir.
#
# Kullanım:  bash araclar/java-guven-deposu.sh

set -euo pipefail

DEPO="$HOME/.gradle/cacerts-avast"
PAROLA="changeit"

java_surumu() { "$1/bin/java" -version 2>&1 | head -1 | sed 's/.*version "\([0-9]*\).*/\1/'; }

JDK=""
if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
  [ "$(java_surumu "$JAVA_HOME")" -ge 17 ] 2>/dev/null && JDK="$JAVA_HOME"
fi
if [ -z "$JDK" ]; then
  for aday in \
    "/c/Program Files/Android/Android Studio/jbr" \
    "$HOME/AppData/Local/Programs/Android Studio/jbr"
  do
    if [ -x "$aday/bin/java" ] && [ "$(java_surumu "$aday")" -ge 17 ] 2>/dev/null; then
      JDK="$aday"; break
    fi
  done
fi
[ -n "$JDK" ] || { echo "❌ Java 17+ bulunamadı."; exit 1; }
echo "☕ JDK: $JDK"

# 1) Avast kökünü Windows deposundan al.
GECICI="$(mktemp -d)"
CER="$GECICI/avast-root.cer"
powershell.exe -NoProfile -Command "
  \$c = Get-ChildItem -Path Cert:\LocalMachine\Root |
        Where-Object { \$_.Subject -like '*Avast Web/Mail Shield Root*' } |
        Select-Object -First 1
  if (-not \$c) { exit 2 }
  [System.IO.File]::WriteAllBytes('$(cygpath -w "$CER")', \$c.RawData)
" || { echo "ℹ️  Avast kökü bulunamadı — TLS taraması kapalı olabilir, bir şey yapılmadı."; exit 0; }

PARMAK="$("$JDK/bin/keytool" -printcert -file "$CER" 2>/dev/null | grep 'SHA256:' | head -1 | sed 's/.*SHA256: //')"
echo "🔑 Avast kökü: $PARMAK"

# 2-3) JDK deposunun kopyası + Avast kökü.
cp "$JDK/lib/security/cacerts" "$DEPO.yeni"
"$JDK/bin/keytool" -importcert -noprompt -trustcacerts -alias avast-web-shield \
  -file "$CER" -keystore "$DEPO.yeni" -storepass "$PAROLA" >/dev/null
mv -f "$DEPO.yeni" "$DEPO"
echo "✅ Güven deposu yenilendi: $DEPO"

# 4) Gradle'ı bu depoya yönlendir.
AYAR="$HOME/.gradle/gradle.properties"
SATIR="org.gradle.jvmargs=-Xmx2048m -Djavax.net.ssl.trustStore=$(cygpath -m "$DEPO") -Djavax.net.ssl.trustStorePassword=$PAROLA"
touch "$AYAR"
if grep -q '^org.gradle.jvmargs=' "$AYAR"; then
  # Yol DÜZ BÖLÜ ile yazılır: .properties dosyasında ters bölü kaçış
  # karakteri sayılır ve yutulur.
  grep -v '^org.gradle.jvmargs=' "$AYAR" > "$AYAR.yeni"
  mv -f "$AYAR.yeni" "$AYAR"
fi
echo "$SATIR" >> "$AYAR"
echo "✅ Gradle ayarı yazıldı: $AYAR"

# Çalışan Gradle sunucuları eski ayarla açılmıştı; kapatılmazsa yeni
# depo kullanılmaz. Bu, düzeltmenin "işe yaramadı" sanılmasının bir
# başka sebebiydi.
(cd "$(dirname "$0")/../uygulama/android" && JAVA_HOME="$JDK" ./gradlew --stop >/dev/null 2>&1) || true
echo "✅ Gradle sunucuları durduruldu; sonraki derleme yeni depoyla açılacak."
