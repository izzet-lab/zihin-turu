# Zihin Turu

Türkçe zihin oyunu platformu. İki oyun, tek altyapı:

- **Sayı Turu** — 6 rakam, dört işlem, bir hedef
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
