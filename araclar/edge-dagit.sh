#!/bin/bash
# edge-dagit.sh — Edge Function'ları kendi sunucumuzdaki Supabase'e dağıtır.
#
# NEDEN AYRI BİR BETİK
# Bulut Supabase'de `supabase functions deploy` import haritasını kendisi
# çözüyordu. Kendi sunucumuzdaki edge-runtime'da iki fark var:
#
#   1. Yönlendiricide import haritası desteği kapalı geliyor ve
#      açıldığında da uygulanmıyor (v1.71.2'de denendi).
#   2. Her fonksiyon KENDİ DİZİNİNE hapsediliyor; dizin dışındaki bir
#      dosyayı okuyamıyor. Paketleri ortak bir yere koymak
#      "Module not found" veriyor — dosya orada olsa bile.
#
# Bu yüzden her fonksiyon kendi içinde eksiksiz hale getiriliyor:
# paylaşılan paketler ve ortak modüller fonksiyon dizinine kopyalanıyor,
# `@tamisabet/*` adları göreceli yollara çevriliyor. Bulut dağıtımı da
# aslında bunu yapıyordu (yedekteki paket yapısı bunu gösteriyor).
#
# DEPO TEK KAYNAK OLMAYA DEVAM EDİYOR: burada üretilen kopya depodan
# türetiliyor, sunucuda elle düzenlenmiyor.
#
# Kullanım (sunucuda):
#   bash araclar/edge-dagit.sh
set -euo pipefail

DEPO="${DEPO:-/root/projeler/tamisabet}"
HEDEF="${HEDEF:-/data/coolify/services/lyx51xz2hr3nm3txkvnxpk3w/volumes/functions}"
KAPSAYICI="${KAPSAYICI:-supabase-edge-functions-lyx51xz2hr3nm3txkvnxpk3w}"

[ -d "$DEPO/sunucu/fonksiyonlar" ] || { echo "Depo bulunamadı: $DEPO"; exit 1; }
[ -d "$HEDEF" ] || { echo "Hedef bulunamadı: $HEDEF"; exit 1; }

echo "Depo:  $DEPO"
echo "Hedef: $HEDEF"
echo

cd "$DEPO"
# Depoyu çekmek BAŞARISIZ OLURSA DURUYORUZ.
#
# Burada eskiden `|| true` vardı: çekme düşse bile betik devam ediyordu.
# 20 Ekim 2026'da sunucudaki kopya, depoya gönderilmemiş yerel bir commit
# yüzünden ayrışmıştı; `--ff-only` düşüyor, hata yutuluyor ve fonksiyonlar
# sessizce ESKİ koddan dağıtılıyordu. Dağıtımın en kötü hali budur:
# "bitti" der, oysa hiçbir şey değişmemiştir.
#
# Ayrışma varsa sunucudaki kopya atılır (depo tek doğru kaynak):
#   git -C "$DEPO" fetch origin && git -C "$DEPO" reset --hard origin/main
git pull --ff-only
echo "Sürüm: $(git log --oneline -1)"
echo

for d in "$DEPO"/sunucu/fonksiyonlar/*/; do
  ad="$(basename "$d")"
  [ -f "$d/index.ts" ] || continue

  hf="$HEDEF/$ad"
  mkdir -p "$hf"

  # 1. Fonksiyonun kendi kodu
  cp "$d/index.ts" "$hf/index.ts"

  # 2. Ortak modüller (istemci.ts, oyunlar.ts, *-ortak.ts) — fonksiyonlar
  #    bunları '../' ile çağırıyor; kopyada aynı dizine düşüyorlar.
  cp "$DEPO"/sunucu/fonksiyonlar/*.ts "$hf/" 2>/dev/null || true

  # 3. Paylaşılan paketler
  rm -rf "${hf:?}/paketler"
  mkdir -p "$hf/paketler"
  cp -r "$DEPO/paketler/cekirdek" "$DEPO/paketler/oyun-sayi" \
        "$DEPO/paketler/oyun-kelime" "$hf/paketler/"

  # 4. Adları göreceli yollara çevir.
  #    SIRA ÖNEMLİ: 'oyun-kelime/sozluk-verisi', 'oyun-kelime'den ÖNCE
  #    eşleşmeli, yoksa daha kısa olan önce yakalar ve yol bozulur.
  python3 - "$hf" <<'PY'
import os, sys
hf = sys.argv[1]
ESLEME = [
    ("@tamisabet/oyun-kelime/sozluk-verisi", "./paketler/oyun-kelime/veri/kelimeler.ts"),
    ("@tamisabet/oyun-kelime",               "./paketler/oyun-kelime/src/index.ts"),
    ("@tamisabet/oyun-sayi",                 "./paketler/oyun-sayi/src/index.ts"),
    ("@tamisabet/cekirdek",                  "./paketler/cekirdek/src/index.ts"),
]
for kok, _, dosyalar in os.walk(hf):
    # Paket içindeki dosyalar birbirini paket adıyla çağırabiliyor;
    # onlarda yol bir seviye daha derinden hesaplanıyor.
    derinlik = os.path.relpath(kok, hf).count(os.sep) + (0 if os.path.relpath(kok, hf) == "." else 1)
    onek = "./" if derinlik == 0 else "../" * derinlik
    for d in dosyalar:
        if not d.endswith(".ts"):
            continue
        y = os.path.join(kok, d)
        s = open(y, encoding="utf-8").read()
        o = s
        for bare, yol in ESLEME:
            hedef_yol = onek + yol[2:] if onek != "./" else yol
            s = s.replace('"' + bare + '"', '"' + hedef_yol + '"')
            s = s.replace("'" + bare + "'", "'" + hedef_yol + "'")
        # Fonksiyon kodundaki '../ortak.ts' çağrıları artık aynı dizinde
        if os.path.relpath(kok, hf) == ".":
            for ortak in ("istemci.ts", "oyunlar.ts", "duello-ortak.ts", "arena-ortak.ts"):
                s = s.replace("'../" + ortak + "'", "'./" + ortak + "'")
                s = s.replace('"../' + ortak + '"', '"./' + ortak + '"')
        if s != o:
            open(y, "w", encoding="utf-8").write(s)
PY

  echo "  $ad"
done

echo
echo "Edge çalışma zamanı yeniden başlatılıyor…"
docker restart "$KAPSAYICI" >/dev/null
echo "Bitti."
