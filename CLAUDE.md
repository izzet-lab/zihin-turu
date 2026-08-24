# CLAUDE.md

Deponun kökünde durur, her oturumda okunur.

> **Sürüm notu:** Bu dosya 20 Ağustos 2026'da yeniden yazıldı. Önceki
> sürümde "reklam yok" kuralı vardı; bu karar değişti ve projede artık
> AdMob var. Kural 5'e bak. Bu dosya ile projenin gerçek durumu
> arasında çelişki görürsen **çalışmayı durdur ve sor** — geçen sefer
> bunu doğru yaptın.

---

## Proje

Türkçe zihin oyunu platformu. İki oyun, tek altyapı:

- **Sayı Turu** — 6 rakam verilir, dört işlemle hedef sayıya ulaşılır
- **Kelime Turu** — 8 harf verilir, en uzun kelime türetilir *(Faz 6, henüz yok)*

Platform oyunu bilmez. Oyunlar `TurSaglayici` arayüzüyle takılır.

**Marka:** Zihin Turu · **Paket:** `com.zihinturu.app` ·
**Web:** zihin.artei.net · **Depo:** `izzet-lab/zihin-turu`

## Kiminle konuşuyorsun

Proje sahibi kod yazmıyor ve okumuyor. Bu şu demek:

- **Ne yaptığını Türkçe ve sade anlat.** Değişkenle değil davranışla:
  "artık süre bitince tur kapanıyor" gibi.
- **Kod parçası yapıştırma** — cümleyle açıkla.
- **Her değişiklikten sonra testleri çalıştır ve sonucu söyle.**
  Kırmızıysa ilerlemeden düzelt.
- Bir şey riskliyse ya da iki yol varsa **karar verip gerekçesini söyle.**
  Seçenek listesi sunup beklemek işi yavaşlatıyor.
- **Bu dosyayla çelişen bir durum görürsen sor.** Sessizce varsayımla
  devam etmek en pahalı hata.

---

## Değişmez kurallar

1. **Oyun mantığı tek yerde.** Kural, üretim, doğrulama ve puanlama
   yalnızca `paketler/oyun-*` içinde yaşar. Arayüzde veya Edge
   Function'da kural kopyası bulunursa bu bir hatadır.

2. **Doğrulama sunucuda.** İstemci "buldum" ya da "15 puan aldım"
   diyemez. Gönderilen zincir Edge Function'da sıfırdan yeniden
   hesaplanır, puanı sunucu verir.

3. **Tur içeriği saklanmaz, tohum saklanır.** Bulmaca `tohum → tur`
   ile yeniden üretilir. Günün turu, rövanş ve maç tekrarı bundan
   bedavaya gelir.

4. **Rekabet modlarında süre zorunlu.** Süresiz yalnızca Antrenman'da,
   ve Antrenman beceri ligine işlemez (kendi çalışkanlık tablosu var).

5. **Reklam var, ama kuralları katı.** *(Bu kural Ağustos 2026'da
   değişti — eskiden "reklam yok"tu.)*
   - **Banner:** Kurulum, Sonuç, Lig, Profil ekranlarında.
     **Oyun ekranında banner YOK** — oynarken dikkat dağıtıyor.
     Giriş ve yasal sayfalarda da yok.
   - **Ödüllü video:** joker yenileme, antrenman turunu tekrar oynama,
     seri koruma. Asla kendiliğinden başlamaz, kullanıcı düğmeye basar.
     **Reklam yüklenemezse ödül yine verilir.**
   - **Geçiş (interstitial) reklamı YOK.** Oyun akışını kırıyor.
   - **Günün Turu'nda joker reklamı YOK** — lig adaleti bozulur.
   - **İlk 3 tur tamamlanana kadar hiç banner yok.** Kaldırmaların çoğu
     ilk 24 saatte oluyor; değer görmeden maliyet gösterilmez.
     Sayaç kalıcı saklanır.

6. **Yaş ve reklam kişiselleştirmesi.**
   - Asgari yaş **13**. 13 altı kayıt olamaz, misafir oynayabilir.
   - **13–17 arası veli onayı zorunlu** (Türk hukuku 18 altını küçük
     sayıyor; 13 yalnızca AdMob eşiği).
   - **18 altına asla kişiselleştirilmiş reklam gösterilmez**
     (`npa: true`), onay formu da sorulmaz. Banner ve ödüllü video için
     ayrı ayrı doğrula — ikisi farklı çağrı yolu kullanıyor.
   - 18+ için UMP onay akışı. Onay **sonradan geri alınabilir** olmalı
     (yasal zorunluluk), gizlilik ayarlarından erişilir.

7. **Gizlilik varsayılanları.** Firebase Analytics **varsayılan kapalı.**
   Crashlytics ve bildirimler gizlilik ayarlarından kapatılabilir.
   Kullanıcı kapattığında gerçekten kapanmalı.

8. **Çözüm sızmaz.** Tur bitmeden çözüm istemciye gönderilmez.
   Paylaşım kartında adımlar, işlem işaretleri ve ara sonuçlar yer almaz.

9. **Oyun avantajı satılmaz.** Abonelik reklamı kaldırır, kozmetik verir.
   Ödeyen oyuncu daha iyi puan alıyorsa lig biter.

10. **Mobil önce.** Her ekran önce 360px genişlikte doğru çalışır.
    Dokunma hedefleri en az 44px. Güvenli alan (`env(safe-area-inset-*)`)
    tek yerde çözülür, ekran başına boşluk eklenmez.

11. **Türkçe.** Kod içindeki isimler, yorumlar ve arayüz metinleri
    Türkçe. Değişken adlarında Türkçe karakter yok (`buyukSayi`,
    `büyükSayı` değil).

12. **Capacitor'da SPA yedeği yok.** `<a href>` ile tam sayfa geçişi
    Android'de 404 verir. Tüm gezinme router üzerinden.

13. **Yeşil takımdan başla.** Her işe başlamadan **önce** `npm test`,
    `npm run tip` ve `npm run e2e` çalıştır. Kırmızı varsa önce onu
    düzelt, sonra yeni işe başla. *(24 Ağustos 2026'da üç ayrı yerde
    eski kırmızı bulundu — bu kural o yüzden var. Kırmızı bir takımın
    üstüne çalışmak, yeni hatayı eskilerin arasında kaybetmek demek.)*

---

## Üç dağıtım katmanı — sıra önemli

Proje üç ayrı yerde yaşıyor ve bunlar bağımsız güncelleniyor.
**Sıra bozulursa canlı site hata verir.**

| # | Katman | Nasıl güncellenir |
|---|---|---|
| 1 | **Veritabanı** (tablolar, tetikleyiciler) | Supabase SQL editörü / migration |
| 2 | **Edge Functions** (puan doğrulama) | `npx supabase functions deploy` |
| 3 | **Web + Android** (arayüz) | `git push` → Cloudflare otomatik |

Yeni arayüz kodu olmayan sütunları arayacağı için **önce veritabanı,
sonra fonksiyon, en son push.**

**Oyun mantığı değiştiyse Edge Function'ı yeniden dağıtmak zorunludur.**
İstemci ve sunucu farklı tur üretirse her tur reddedilir.

---

## Mimari

```
paketler/cekirdek       TurSaglayici arayüzü, tohumlu rastgelelik
paketler/oyun-sayi      sayı turu: üretici, çözücü, doğrulayıcı, puanlayıcı, bot
paketler/oyun-kelime    kelime turu (Faz 6, henüz yok)
uygulama                React + Vite arayüz, PWA, Capacitor
sunucu/fonksiyonlar     Supabase Edge Functions
sunucu/gocler           SQL göçleri
testler                 birim, entegrasyon, e2e
```

### TurSaglayici arayüzü

```ts
interface TurSaglayici {
  ad: string;
  seviyeler: readonly Seviye[];
  turUret(seviye: string, tohum: number): Tur;
  dogrula(tur: Tur, cevap: Cevap): Dogrulama;
  puanla(seviye, d, kalanSn, toplamSn, ilkMi): Puan;
  cozumBul(tur: Tur, sinirMs?: number): Cozum;
}
```

Platform yalnızca bunu çağırır. Platform kodunda `hedef`, `rakam`,
`harf` gibi oyuna özgü kelimeler geçmemeli. `Dogrulama.uzaklik`
alanının **anlamını platform bilmez**, yalnızca "0 ise tam isabet"
kuralını uygular.

---

## Mevcut durum

**Seviyeler** (Kolay ve Normal birleştirildi, beşten dörde indi):

| Seviye | Hane | Taş | Aralık | Süre |
|---|---|---|---|---|
| Isınma | 2 | 4 | 10–99 | 60 sn |
| Normal | 3 | 5 | 100–999 | 60 sn |
| Zor | 4 | 6 | 1.000–9.999 | 75 sn |
| Usta | 5 | 7 | 10.000–99.999 | 90 sn |

**Puanlama:** Günün Turu puanı ×10 (tam isabet ~150). Antrenman'da
süre çarpanı (90/60/30/15 sn → ×1/1.5/2.5/4) ve seviye çarpanı
(Isınma ×0.5 … Usta ×2) çarpılır. Antrenman puanı XP'ye gider.

**Lig:** Seviye başına ayrı tablo. Günlük tabloya o günün **en iyi**
maçı yazılır, toplamı değil. Haftalık ve aylık, günlük en iyilerin
toplamı. Antrenman ayrı "çalışkanlık" tablosunda, haftalık sıfırlanır.

**XP:** Lv.1 Çaylak (0), Lv.2 Hesapçı (500), Lv.3 Zihin İşçisi (2.000),
Lv.4 Rakam Ustası (5.000), Lv.5 Zihin Turu Ustası (12.000).
Seri ödülleri: her gün +10, 3 gün +25, 7 gün +75, 30 gün +300,
100 gün +1.000. **Puan oynamadan verilmez.** Ayda bir seri koruma hakkı.

**Tamamlanan:** Faz 0–3C (çekirdek, tek kişilik oyun, PWA, üyelik,
misafir geçişi, sunucu doğrulama, lig, XP, seri, gerçek oyuncu
sayaçları, yasal metinler, hesap silme), Capacitor Android paketi,
Firebase (Analytics/Crashlytics/Remote Config), AdMob banner,
yaş 13 + UMP onay akışı.

**Yığın:** TypeScript · React + Vite · Tailwind · Supabase (Frankfurt) ·
Cloudflare Pages · Capacitor · Vitest + Playwright

---

## Bekleyen işler

### ~~B komutu~~ — bitti (24 Ağustos 2026)
İlk oturum reklamsızlığı yapıldı, ödüllü videonun `npa` doğrulaması
tamam. Ayrıntı `CHANGELOG.md`'de.

### Şimdi — C — Günlük hatırlatma (yerel bildirim)
`@capacitor/local-notifications`. **FCM kullanma** — FCM sunucudan
tetiklenen bildirimler için, Faz 4 düellosunda gerekecek, silme.
Saat seçilebilir, varsayılan 20:00. O gün oynanmışsa bildirim iptal.
Bildirime dokununca Günün Turu açılır. Metin dönsün, seri varsa
seriyi hatırlatsın. **İzin ilk açılışta istenmesin** — ilk tur
bittikten sonra sonuç ekranında istensin.

### D — Zorluk dengesi
"Zor, Normal'den kolay geliyor" gözlemi var. Önce **ölç**:
`testler/zorluk-olcum.ts`, seviye başına 2.000 tur. Ölçütler: çözüm
yoğunluğu, en kısa çözüm uzunluğu, **çözücünün denediği düğüm sayısı**
(insan zorluğunun en iyi vekili), tek çözümlü tur oranı, bölme
gerektiren tur oranı. Her ölçüt Isınma → Usta boyunca tek yönlü
artmalı. Muhtemel sebep: Zor/Usta'da ileri üretim her zaman kolay bir
çözüm yolu bırakıyor — çözüm yoğunluğu eşiğin üstündeyse turu reddedip
yeniden üret. **Sonra Edge Function'ı yeniden dağıt.**

### E — Güvenli alan ve arayüz rötuşları
Durum çubuğu boşluğu (tek yerde), Yardım'da XP listesi aralığı,
seri rozet tutarlılığı, Geri al/Sıfırla ikonlarının ayrışması,
kilitli seviyeye dokununca açıklama, sonuç ekranında ana eylemin
en baskın öğe olması.

### F — Play Store paketi
AAB, versionCode otomatiği, R8 küçültme sonrası çalışma doğrulaması,
Data safety özeti. **Data safety formu artık reklam kimliği
toplandığını söylemeli** — yasal metinlerle birebir tutarlı olmalı.

### Faz 4 — Düello
Kapalı testin 14 günü işlerken yazılacak. Eşleştirme kuyruğu (ELO),
gerçek zamanlı tur akışı, **rakibin yalnızca uzaklığı yayınlanır**,
sunucu doğrulaması, rakip yoksa bot (çözümü hazır almaz), bağlantı
kopması, rövanş, özel oda. FCM burada devreye girer.

---

## Sık yapılan hatalar

- Oyun kuralını arayüze kopyalamak — tek kaynak bozulur
- İstemcinin bildirdiği puana güvenmek — hile kapısı
- Tur içeriğini veritabanına yazmak — tohum varken gereksiz
- Paylaşım kartına çözüm adımı koymak — oynamamışa cevabı verir
- Antrenmanı beceri ligine işlemek — tablo kirlenir
- Oyun ekranına banner koymak — oynarken dikkat dağıtır
- 18 altına kişiselleştirilmiş reklam göstermek — beyanla çelişir
- Oyun mantığını değiştirip Edge Function'ı dağıtmamak — her tur reddedilir
- Veritabanı göçünden önce push etmek — canlı site hata verir
- `<a href>` ile gezinmek — Android'de 404
- Kod parçası göstererek açıklama yapmak — proje sahibi kod okumuyor
