# Zihin Turu

Türkçe zihin oyunu platformu. İki oyun, tek altyapı:

- **Sayı Turu** — rakamlar, dört işlem, bir hedef
- **Kelime Turu** — 8 harf, en uzun kelime *(Faz 6)*

Tek başına, karşılıklı düello ya da arenada. Her gün herkese aynı
bulmaca. Üyeliksiz oynanır, reklam yoktur.

## Çalıştırma

```bash
npm install
npm run gelistir    # geliştirme sunucusu
npm test            # testler
npm run insa        # üretim derlemesi
npm run tip         # tip denetimi
```

## Seviyeler

| Seviye | Hane | Taş | Hedef aralığı | Süre |
|---|---|---|---|---|
| Isınma | 2 | 4 | 10–99 | 60 sn |
| Normal | 3 | 5 | 100–999 | 60 sn |
| Zor | 4 | 6 | 1.000–9.999 | 75 sn |
| Usta | 5 | 7 | 10.000–99.999 | 90 sn |

Seviye tanımları tek yerde durur: `paketler/oyun-sayi/src/mantik.ts`
içindeki `SEVIYELER`. Etiket ve süreler `src/index.ts` içindeki
`SEVIYE_LISTESI`'nden gelir. Değişiklik geçmişi için `CHANGELOG.md`.

## Yapı

```
paketler/cekirdek      TurSaglayici arayüzü, tohumlu rastgelelik
paketler/oyun-sayi     sayı turu eklentisi
uygulama               React + Vite arayüz
sunucu/gocler          veritabanı şeması
sunucu/fonksiyonlar    Supabase Edge Functions
testler                testler
```

Platform oyunu bilmez; oyunlar `TurSaglayici` arayüzüyle takılır.
Ayrıntı ve kurallar için `CLAUDE.md`.
